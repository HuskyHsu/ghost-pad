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

use crate::error::AppError;
use crate::gamepad::GamepadManager;
use crate::protocol::ControllerState;

/// Serializes all operations that open a serial port for handshake (probe / connect),
/// preventing concurrent exclusive opens from spuriously failing verification.
static PORT_OPEN_LOCK: Mutex<()> = Mutex::new(());

/// Delays (ms) before each handshake attempt. Covers ESP32 auto-reset boot time
/// triggered by DTR/RTS toggling when the port is opened.
const HANDSHAKE_RETRY_DELAYS_MS: [u64; 4] = [0, 250, 450, 700];

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

/// A serial port kept open between sessions.
///
/// Opening a serial port on macOS asserts DTR/RTS, which resets the ESP32 (and drops its
/// Bluetooth link to the Switch). A verified port is therefore kept open and reused for
/// probing and for stopping/starting the virtual gamepad; it is only released when another
/// port is selected or the app exits.
struct HeldPort {
    name: String,
    port: Box<dyn SerialPort>,
}

/// PRO-UART0 firmware acknowledges every input packet with 0x90 while linked to the Switch.
const LINK_ACK_BYTE: u8 = 0x90;
/// The Switch link is considered down if no 0x90 ack was seen for this long.
const LINK_TIMEOUT: Duration = Duration::from_millis(1500);
/// While unlinked, pulse L+R this often so a Switch on "Change Grip/Order" registers us.
const PAIR_PULSE_INTERVAL: Duration = Duration::from_secs(3);
const PAIR_PULSE_LENGTH: Duration = Duration::from_millis(250);

pub struct SerialManager {
    pub status: Arc<RwLock<SerialStatus>>,
    is_running: Arc<AtomicBool>,
    worker_handle: Mutex<Option<JoinHandle<()>>>,
    command_tx: Arc<Mutex<Option<Sender<SpecialCommand>>>>,
    held_port: Arc<Mutex<Option<HeldPort>>>,
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
            held_port: Arc::new(Mutex::new(None)),
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
            .filter(|p| {
                let name = &p.port_name;
                // Filter out macOS virtual Bluetooth incoming ports
                if name.contains("Bluetooth") || name.contains("Incoming") {
                    return false;
                }
                // On macOS: prefer /dev/cu.* and filter out duplicate /dev/tty.* to prevent blocking
                if name.starts_with("/dev/tty.") && (name.contains("usb") || name.contains("wch") || name.contains("serial")) {
                    return false;
                }
                true
            })
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

    /// Take the held port if it is the requested one (reusing it does NOT reset the ESP32),
    /// otherwise release whatever is held and open `port_name`. Returns `(port, reused)`.
    fn acquire_port(
        &self,
        port_name: &str,
        baudrate: u32,
    ) -> Result<(Box<dyn SerialPort>, bool), String> {
        let held = self.held_port.lock().unwrap_or_else(|e| e.into_inner()).take();
        if let Some(mut h) = held {
            if h.name == port_name && h.port.set_baud_rate(baudrate).is_ok() {
                let _ = h.port.set_timeout(Duration::from_millis(200));
                let _ = h.port.clear(ClearBuffer::All);
                return Ok((h.port, true));
            }
            // Another port was selected (or the handle went stale): drop it and open fresh.
        }

        let mut port = serialport::new(port_name, baudrate)
            .timeout(Duration::from_millis(200))
            .open()
            .map_err(|e| {
                AppError::SerialOpenFailed {
                    port: port_name.to_string(),
                    reason: e.to_string(),
                }
                .to_json_string()
            })?;

        // Release DTR/RTS so ESP32 auto-reset circuits leave EN high, then let it stabilize
        let _ = port.write_data_terminal_ready(false);
        let _ = port.write_request_to_send(false);
        thread::sleep(Duration::from_millis(150));
        let _ = port.clear(ClearBuffer::All);
        Ok((port, false))
    }

    fn hold_port(&self, name: &str, port: Box<dyn SerialPort>) {
        *self.held_port.lock().unwrap_or_else(|e| e.into_inner()) = Some(HeldPort {
            name: name.to_string(),
            port,
        });
    }

    /// Start the 60Hz background transmission loop.
    ///
    /// The serial port is kept open across stop/start (see [`HeldPort`]) so the ESP32 is not
    /// reset, which would drop its Bluetooth link. The Switch link state is derived from the
    /// 0x90 acks the firmware returns, never assumed.
    pub fn connect(
        &self,
        port_name: &str,
        baudrate: u32,
        gamepad_mgr: Arc<GamepadManager>,
        app_handle: AppHandle,
    ) -> Result<(), String> {
        // Disconnect any existing session first (hands its port back to `held_port`)
        let _ = self.disconnect();

        let _open_guard = PORT_OPEN_LOCK.lock().unwrap_or_else(|e| e.into_inner());

        let (mut port, reused) = self.acquire_port(port_name, baudrate)?;
        if reused {
            println!("[Serial Info] Reusing open port {} (ESP32 not reset, handshake already passed)", port_name);
        } else {
            // Mandatory 3-step handshake with ESP32 (0xFF, 0x33, 0xCC).
            // Only genuine PRO-UART0 (UARTSwitchCon) firmware is allowed to start streaming.
            // On failure the port is dropped so the next attempt reopens it from scratch.
            if let Err(e) = Self::handshake_with_retry(&mut *port) {
                eprintln!("[Serial Error] Firmware handshake failed, rejecting virtual gamepad start: {}", e);
                return Err(AppError::FirmwareVerifyFailed {
                    baudrate,
                    reason: e,
                }
                .to_json_string());
            }
            println!("[Serial Info] ESP32 PRO-UART0 protocol handshake successful!");
        }

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
        let held_clone = self.held_port.clone();
        let port_name_string = port_name.to_string();

        let (cmd_tx, cmd_rx) = channel::<SpecialCommand>();
        *self.command_tx.lock().unwrap() = Some(cmd_tx);

        let handle = thread::Builder::new()
            .name("serial-tx-thread".into())
            .spawn(move || {
                let interval = Duration::from_millis(16); // ~60Hz
                let mut packets_this_second: u32 = 0;
                let mut last_fps_time = Instant::now();
                let mut ack_buf = [0u8; 64];
                let mut io_failed = false;

                // Acks are drained with bytes_to_read(); a long read timeout would otherwise
                // stall the 60Hz loop whenever the Switch link is down and nothing comes back.
                let _ = port.set_timeout(Duration::from_millis(1));

                let emit_status = |status: &Arc<RwLock<SerialStatus>>| {
                    let current_stat = status.read().unwrap().clone();
                    let _ = app_handle.emit("serial-status-changed", &current_stat);
                };

                // Switch link tracking (0x90 acks) + auto L+R pairing pulses while unlinked
                let mut last_ack: Option<Instant> = None;
                let mut link_up = false;
                let mut pulse_next = Instant::now() + Duration::from_millis(1500);
                let mut pulse_until: Option<Instant> = None;

                // Burst helper for special commands
                let burst = |port: &mut Box<dyn SerialPort>, state: &ControllerState, frames: u32| {
                    let payload = state.pack_uart_switchcon();
                    for _ in 0..frames {
                        let _ = port.write_all(&payload);
                        let _ = port.flush();
                        thread::sleep(Duration::from_millis(16));
                    }
                };

                while is_running_clone.load(Ordering::Relaxed) {
                    let loop_start = Instant::now();

                    // Check for special command injection
                    if let Ok(cmd) = cmd_rx.try_recv() {
                        let neutral = ControllerState::default();
                        match cmd {
                            SpecialCommand::PairLR => {
                                let mut s = ControllerState::default();
                                s.l = true;
                                s.r = true;
                                burst(&mut port, &s, 15); // L+R for ~250ms
                                burst(&mut port, &neutral, 3);
                            }
                            SpecialCommand::WakeReconnect => {
                                let mut s = ControllerState::default();
                                s.home = true;
                                burst(&mut port, &s, 10); // Home for ~160ms (wakes a sleeping console)
                                burst(&mut port, &neutral, 3);
                            }
                            SpecialCommand::EmergencyNeutral => {
                                let payload = neutral.pack_uart_switchcon();
                                for _ in 0..5 {
                                    let _ = port.write_all(&payload);
                                    let _ = port.flush();
                                    thread::sleep(Duration::from_millis(10));
                                }
                            }
                            SpecialCommand::ClearBonds => {
                                let _ = port.write_all(&[0xEE, 0xEE, 0xEE]);
                                let _ = port.flush();
                            }
                        }
                    }

                    // Read current merged controller state (acts as continuous 60Hz keep-alive)
                    let mut state = gamepad_mgr.get_current_state();

                    // While the Switch link is down, pulse L+R periodically so a Switch sitting
                    // on "Change Grip/Order" registers the controller. Never sent while linked.
                    let now = Instant::now();
                    if !link_up {
                        if now >= pulse_next {
                            pulse_until = Some(now + PAIR_PULSE_LENGTH);
                            pulse_next = now + PAIR_PULSE_INTERVAL;
                        }
                        if pulse_until.map_or(false, |u| now < u) {
                            state.l = true;
                            state.r = true;
                        }
                    }

                    let payload = state.pack_uart_switchcon();

                    if let Err(e) = port.write_all(&payload) {
                        eprintln!("[Serial Error] 發送封包失敗: {}", e);
                        io_failed = true;
                        break;
                    }
                    let _ = port.flush();

                    packets_this_second += 1;
                    {
                        let mut s = status_arc.write().unwrap();
                        s.packets_sent += 1;
                    }

                    // Non-blocking drain of incoming acks (0x90 = linked to the Switch)
                    if let Ok(pending) = port.bytes_to_read() {
                        if pending > 0 {
                            let want = (pending as usize).min(ack_buf.len());
                            if let Ok(count) = port.read(&mut ack_buf[..want]) {
                                if ack_buf[..count].contains(&LINK_ACK_BYTE) {
                                    last_ack = Some(Instant::now());
                                }
                            }
                        }
                    }

                    let link_now = last_ack.map_or(false, |t| t.elapsed() < LINK_TIMEOUT);
                    if link_now != link_up {
                        link_up = link_now;
                        if link_up {
                            pulse_until = None;
                        } else {
                            pulse_next = Instant::now() + PAIR_PULSE_INTERVAL;
                        }
                        {
                            let mut s = status_arc.write().unwrap();
                            s.switch_pairing_state =
                                if link_up { "connected" } else { "pairing" }.to_string();
                        }
                        emit_status(&status_arc);
                    }

                    // Update FPS every second
                    if last_fps_time.elapsed() >= Duration::from_secs(1) {
                        {
                            let mut s = status_arc.write().unwrap();
                            s.tx_fps = packets_this_second;
                        }
                        emit_status(&status_arc);

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

                // Keep the port open (hand it back) so stopping the service does not reset the
                // ESP32 / drop its Switch link. A failed port is dropped instead.
                if !io_failed {
                    let _ = port.set_timeout(Duration::from_millis(200));
                    *held_clone.lock().unwrap_or_else(|e| e.into_inner()) = Some(HeldPort {
                        name: port_name_string.clone(),
                        port,
                    });
                }

                {
                    let mut s = status_arc.write().unwrap();
                    s.is_connected = false;
                    s.port_name = None;
                    s.tx_fps = 0;
                    s.switch_pairing_state = "disconnected".to_string();
                }
                emit_status(&status_arc);
                println!("[Serial] Streaming stopped on {} (port kept open)", port_name_string);
            })
            .map_err(|e| AppError::ThreadSpawnFailed { reason: e.to_string() }.to_json_string())?;

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
                _ => {
                    return Err(AppError::UnknownSerialCommand {
                        command: cmd.to_string(),
                    }
                    .to_json_string())
                }
            };
            tx.send(special).map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err(AppError::SerialNotOpen.to_json_string())
        }
    }

    /// Handshake with UARTSwitchCon firmware (0xFF -> 0x33 -> 0xCC)
    /// Strictly verifies ACK bytes returned by genuine PRO-UART0.bin firmware.
    pub fn perform_handshake(port: &mut dyn SerialPort) -> Result<(), String> {
        let mut buf = [0u8; 1];

        // 1. Send 9x 0xFF -> Guarantees a resync trigger even if ESP32 is already waiting for 9-byte frames
        port.write_all(&[0xFF; 9])
            .map_err(|e| format!("發送 0xFF 失敗: {}", e))?;
        let _ = port.flush();
        port.read_exact(&mut buf)
            .map_err(|e| format!("交握超時 (未回應 0xFF，韌體可能不符): {}", e))?;
        if buf[0] != 0xFF && buf[0] != 0x90 {
            return Err(format!("交握回應錯誤：預期 0xFF 或 0x90，實際收到 0x{:02X}", buf[0]));
        }

        // 2. Send 0x33 -> Expect 0xCC
        port.write_all(&[0x33])
            .map_err(|e| format!("發送 0x33 失敗: {}", e))?;
        let _ = port.flush();
        port.read_exact(&mut buf)
            .map_err(|e| format!("交握超時 (未回應 0xCC): {}", e))?;
        if buf[0] != 0xCC {
            return Err(format!("交握回應錯誤：預期 0xCC，實際收到 0x{:02X}", buf[0]));
        }

        // 3. Send 0xCC -> Expect 0x33
        port.write_all(&[0xCC])
            .map_err(|e| format!("發送 0xCC 失敗: {}", e))?;
        let _ = port.flush();
        port.read_exact(&mut buf)
            .map_err(|e| format!("交握超時 (未回應 0x33): {}", e))?;
        if buf[0] != 0x33 {
            return Err(format!("交握回應錯誤：預期 0x33，實際收到 0x{:02X}", buf[0]));
        }

        Ok(())
    }

    /// Run the handshake several times to tolerate ESP32 reboot / boot-log noise after port open.
    fn handshake_with_retry(port: &mut dyn SerialPort) -> Result<(), String> {
        let mut last_err = String::from("未執行交握");
        for delay in HANDSHAKE_RETRY_DELAYS_MS {
            if delay > 0 {
                thread::sleep(Duration::from_millis(delay));
            }
            let _ = port.clear(ClearBuffer::All);
            match Self::perform_handshake(port) {
                Ok(()) => return Ok(()),
                Err(e) => last_err = e,
            }
        }
        Err(last_err)
    }

    /// Probe whether a specific serial port is running genuine PRO-UART0 (UARTSwitchCon) firmware.
    ///
    /// A port that passes is kept open and reused by `connect`, so probing followed by starting
    /// the virtual gamepad resets the ESP32 at most once (when the port is first opened).
    pub fn probe_firmware(&self, port_name: &str, baudrate: u32) -> Result<bool, String> {
        let _open_guard = PORT_OPEN_LOCK.lock().unwrap_or_else(|e| e.into_inner());

        let (mut port, _reused) = self.acquire_port(port_name, baudrate)?;
        match Self::handshake_with_retry(&mut *port) {
            Ok(()) => {
                self.hold_port(port_name, port);
                Ok(true)
            }
            Err(_) => Ok(false),
        }
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
