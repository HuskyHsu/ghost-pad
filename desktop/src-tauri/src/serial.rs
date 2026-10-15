//! Serial port communication and firmware management for ESP32 Switch Bridge
//! Maintains a 60Hz heartbeat transmission loop, automatic handshake, and fail-safe stop logic.

use std::io::{Read, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{channel, Sender};
use std::sync::{Arc, Mutex, RwLock};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use serialport::{ClearBuffer, SerialPort, SerialPortType};
use tauri::{AppHandle, Emitter};

use crate::gamepad::GamepadManager;
use crate::protocol::ControllerState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SerialPortDetail {
    pub port_name: String,
    pub description: String,
    pub usb_info: Option<UsbPortInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsbPortInfo {
    pub vid: u16,
    pub pid: u16,
    pub manufacturer: Option<String>,
    pub product: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SerialStatus {
    pub is_connected: bool,
    pub port_name: Option<String>,
    pub baudrate: u32,
    pub packets_sent: u64,
    pub tx_fps: u32,
    pub switch_pairing_state: String, // "disconnected" | "pairing" | "connected"
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum SpecialCommand {
    PairLR,
    WakeReconnect,
    EmergencyNeutral,
    ClearBonds,
}

pub struct SerialManager {
    pub status: Arc<RwLock<SerialStatus>>,
    is_running: Arc<AtomicBool>,
    worker_handle: Mutex<Option<JoinHandle<()>>>,
    command_tx: Arc<Mutex<Option<Sender<SpecialCommand>>>>,
}

impl Default for SerialManager {
    fn default() -> Self {
        Self::new()
    }
}

impl SerialManager {
    pub fn new() -> Self {
        Self {
            status: Arc::new(RwLock::new(SerialStatus {
                is_connected: false,
                port_name: None,
                baudrate: 19200,
                packets_sent: 0,
                tx_fps: 0,
                switch_pairing_state: "disconnected".to_string(),
            })),
            is_running: Arc::new(AtomicBool::new(false)),
            worker_handle: Mutex::new(None),
            command_tx: Arc::new(Mutex::new(None)),
        }
    }

    /// List all currently available serial ports on the system
    pub fn list_ports() -> Vec<SerialPortDetail> {
        let ports = match serialport::available_ports() {
            Ok(p) => p,
            Err(_) => return Vec::new(),
        };

        ports
            .into_iter()
            .map(|p| {
                let (description, usb_info) = match p.port_type {
                    SerialPortType::UsbPort(usb) => {
                        let desc = format!(
                            "USB Device ({:04X}:{:04X}) {}",
                            usb.vid,
                            usb.pid,
                            usb.product.as_deref().unwrap_or("")
                        );
                        (
                            desc,
                            Some(UsbPortInfo {
                                vid: usb.vid,
                                pid: usb.pid,
                                manufacturer: usb.manufacturer,
                                product: usb.product,
                            }),
                        )
                    }
                    SerialPortType::PciPort => ("PCI Serial Port".to_string(), None),
                    SerialPortType::BluetoothPort => ("Bluetooth Serial Port".to_string(), None),
                    SerialPortType::Unknown => ("Unknown Device".to_string(), None),
                };

                SerialPortDetail {
                    port_name: p.port_name,
                    description,
                    usb_info,
                }
            })
            .collect()
    }

    /// Get a cloned snapshot of current connection status
    pub fn get_status(&self) -> SerialStatus {
        self.status.read().unwrap().clone()
    }

    /// Open serial port and start 60Hz background transmission loop
    pub fn connect(
        &self,
        port_name: &str,
        baudrate: u32,
        gamepad_mgr: Arc<GamepadManager>,
        app_handle: AppHandle,
    ) -> Result<(), String> {
        // Disconnect any existing session first
        let _ = self.disconnect();

        let mut port = serialport::new(port_name, baudrate)
            .timeout(Duration::from_millis(200))
            .open()
            .map_err(|e| format!("無法開啟序列埠 {}: {}", port_name, e))?;

        // Give DTR/RTS time to stabilize
        thread::sleep(Duration::from_millis(150));
        let _ = port.clear(ClearBuffer::All);

        // Perform 3-step handshake with ESP32 (0xFF, 0x33, 0xCC)
        let _ = Self::perform_handshake(&mut *port);

        {
            let mut s = self.status.write().unwrap();
            s.is_connected = true;
            s.port_name = Some(port_name.to_string());
            s.baudrate = baudrate;
            s.packets_sent = 0;
            s.tx_fps = 0;
            s.switch_pairing_state = "pairing".to_string();
        }

        self.is_running.store(true, Ordering::SeqCst);
        let is_running_clone = self.is_running.clone();
        let status_arc = self.status.clone();
        let port_name_string = port_name.to_string();

        let (cmd_tx, cmd_rx) = channel::<SpecialCommand>();
        *self.command_tx.lock().unwrap() = Some(cmd_tx);

        let handle = thread::Builder::new()
            .name("serial-tx-thread".into())
            .spawn(move || {
                let interval = Duration::from_millis(16); // ~60Hz
                let mut packets_this_second: u32 = 0;
                let mut last_fps_time = Instant::now();
                let mut ack_buf = [0u8; 32];

                while is_running_clone.load(Ordering::Relaxed) {
                    let loop_start = Instant::now();

                    // Check for special command injection
                    if let Ok(cmd) = cmd_rx.try_recv() {
                        match cmd {
                            SpecialCommand::PairLR => {
                                let mut pair_state = ControllerState::default();
                                pair_state.l = true;
                                pair_state.r = true;
                                let pair_payload = pair_state.pack_uart_switchcon();
                                // Burst L+R for 250ms (15 frames)
                                for _ in 0..15 {
                                    let _ = port.write_all(&pair_payload);
                                    let _ = port.flush();
                                    thread::sleep(Duration::from_millis(16));
                                }
                                let neutral = ControllerState::default().pack_uart_switchcon();
                                for _ in 0..3 {
                                    let _ = port.write_all(&neutral);
                                    let _ = port.flush();
                                    thread::sleep(Duration::from_millis(16));
                                }
                                {
                                    let mut s = status_arc.write().unwrap();
                                    s.switch_pairing_state = "connected".to_string();
                                }
                                let current_stat = status_arc.read().unwrap().clone();
                                let _ = app_handle.emit("serial-status-changed", &current_stat);
                            }
                            SpecialCommand::WakeReconnect => {
                                let mut wake_state = ControllerState::default();
                                wake_state.a = true;
                                let wake_payload = wake_state.pack_uart_switchcon();
                                // Burst A button for 160ms (10 frames)
                                for _ in 0..10 {
                                    let _ = port.write_all(&wake_payload);
                                    let _ = port.flush();
                                    thread::sleep(Duration::from_millis(16));
                                }
                                let neutral = ControllerState::default().pack_uart_switchcon();
                                for _ in 0..3 {
                                    let _ = port.write_all(&neutral);
                                    let _ = port.flush();
                                    thread::sleep(Duration::from_millis(16));
                                }
                                {
                                    let mut s = status_arc.write().unwrap();
                                    s.switch_pairing_state = "connected".to_string();
                                }
                                let current_stat = status_arc.read().unwrap().clone();
                                let _ = app_handle.emit("serial-status-changed", &current_stat);
                            }
                            SpecialCommand::EmergencyNeutral => {
                                let neutral = ControllerState::default().pack_uart_switchcon();
                                for _ in 0..5 {
                                    let _ = port.write_all(&neutral);
                                    let _ = port.flush();
                                    thread::sleep(Duration::from_millis(10));
                                }
                            }
                            SpecialCommand::ClearBonds => {
                                let _ = port.write_all(&[0xEE, 0xEE, 0xEE]);
                                let _ = port.flush();
                                {
                                    let mut s = status_arc.write().unwrap();
                                    s.switch_pairing_state = "pairing".to_string();
                                }
                                let current_stat = status_arc.read().unwrap().clone();
                                let _ = app_handle.emit("serial-status-changed", &current_stat);
                            }
                        }
                    }

                    // Read current merged controller state (acts as continuous 60Hz keep-alive)
                    let state = gamepad_mgr.get_current_state();
                    let payload = state.pack_uart_switchcon();

                    if let Err(e) = port.write_all(&payload) {
                        eprintln!("[Serial Error] 發送封包失敗: {}", e);
                        break;
                    }
                    let _ = port.flush();

                    packets_this_second += 1;
                    {
                        let mut s = status_arc.write().unwrap();
                        s.packets_sent += 1;
                    }

                    // Non-blocking drain of incoming ACK bytes (e.g. 0x90)
                    if let Ok(count) = port.read(&mut ack_buf) {
                        if count > 0 {
                            // Can be used for round-trip latency tracking if needed
                        }
                    }

                    // Update FPS every second
                    if last_fps_time.elapsed() >= Duration::from_secs(1) {
                        {
                            let mut s = status_arc.write().unwrap();
                            s.tx_fps = packets_this_second;
                        }
                        let current_stat = status_arc.read().unwrap().clone();
                        let _ = app_handle.emit("serial-status-changed", &current_stat);

                        packets_this_second = 0;
                        last_fps_time = Instant::now();
                    }

                    let elapsed = loop_start.elapsed();
                    if elapsed < interval {
                        thread::sleep(interval - elapsed);
                    }
                }

                // Clean-up & Safe emergency stop: send 3 neutral bursts
                let neutral = ControllerState::default().pack_uart_switchcon();
                for _ in 0..3 {
                    let _ = port.write_all(&neutral);
                    let _ = port.flush();
                    thread::sleep(Duration::from_millis(10));
                }

                {
                    let mut s = status_arc.write().unwrap();
                    s.is_connected = false;
                    s.port_name = None;
                    s.tx_fps = 0;
                    s.switch_pairing_state = "disconnected".to_string();
                }
                let current_stat = status_arc.read().unwrap().clone();
                let _ = app_handle.emit("serial-status-changed", &current_stat);
                println!("[Serial] 序列埠 {} 已安全中立釋放並關閉", port_name_string);
            })
            .map_err(|e| format!("無法啟動序列發送線程: {}", e))?;

        *self.worker_handle.lock().unwrap() = Some(handle);
        Ok(())
    }

    /// Disconnect serial and send safe neutral packets
    pub fn disconnect(&self) -> Result<(), String> {
        self.is_running.store(false, Ordering::SeqCst);

        // Clear command channel
        *self.command_tx.lock().unwrap() = None;

        let mut handle_lock = self.worker_handle.lock().unwrap();
        if let Some(handle) = handle_lock.take() {
            let _ = handle.join();
        }

        {
            let mut s = self.status.write().unwrap();
            s.is_connected = false;
            s.port_name = None;
            s.tx_fps = 0;
            s.switch_pairing_state = "disconnected".to_string();
        }

        Ok(())
    }

    /// Send special quick action command (e.g. "pair_lr", "wake_reconnect", "emergency_neutral")
    pub fn send_special_command(&self, cmd: &str) -> Result<(), String> {
        let tx_opt = self.command_tx.lock().unwrap();
        if let Some(tx) = tx_opt.as_ref() {
            let special = match cmd.to_lowercase().as_str() {
                "pair_lr" | "pair" => SpecialCommand::PairLR,
                "wake_reconnect" | "reconnect" | "wake" => SpecialCommand::WakeReconnect,
                "emergency_neutral" | "neutral" => SpecialCommand::EmergencyNeutral,
                "clear_bonds" | "reset_bonds" => SpecialCommand::ClearBonds,
                _ => return Err(format!("未知的指令: {}", cmd)),
            };
            tx.send(special).map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("序列通訊未開啟，請先點擊「開啟虛擬手把」".to_string())
        }
    }

    /// Handshake with UARTSwitchCon firmware (0xFF -> 0x33 -> 0xCC)
    fn perform_handshake(port: &mut dyn SerialPort) -> bool {
        let mut buf = [0u8; 1];
        // 1. Send 0xFF
        let _ = port.write_all(&[0xFF]);
        let _ = port.flush();
        let _ = port.read(&mut buf);

        // 2. Send 0x33
        let _ = port.write_all(&[0x33]);
        let _ = port.flush();
        let _ = port.read(&mut buf);

        // 3. Send 0xCC
        let _ = port.write_all(&[0xCC]);
        let _ = port.flush();
        let _ = port.read(&mut buf);

        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_serial_manager_init() {
        let manager = SerialManager::new();
        let status = manager.get_status();
        assert!(!status.is_connected);
        assert_eq!(status.baudrate, 19200);
        assert_eq!(status.packets_sent, 0);
        assert_eq!(status.tx_fps, 0);
        assert_eq!(status.switch_pairing_state, "disconnected");
    }

    #[test]
    fn test_special_command_disconnected() {
        let manager = SerialManager::new();
        let res = manager.send_special_command("pair_lr");
        assert!(res.is_err());
    }

    #[test]
    fn test_list_ports_call() {
        // Should not panic on any platform
        let ports = SerialManager::list_ports();
        println!("Available ports found: {}", ports.len());
    }
}
