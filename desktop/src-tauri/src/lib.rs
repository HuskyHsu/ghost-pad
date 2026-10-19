pub mod error;
pub mod gamepad;
pub mod protocol;
pub mod serial;

use std::sync::atomic::Ordering;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

use crate::error::AppError;
use crate::gamepad::{GamepadInfo, GamepadManager};
use crate::protocol::ControllerState;
use crate::serial::{SerialManager, SerialPortDetail, SerialStatus};

pub struct AppState {
    pub gamepad_mgr: Arc<GamepadManager>,
    pub serial_mgr: Arc<SerialManager>,
}

#[tauri::command]
fn get_gamepads(state: State<AppState>) -> Vec<GamepadInfo> {
    state.gamepad_mgr.list_gamepads()
}

#[tauri::command]
fn set_active_gamepad(id: Option<usize>, state: State<AppState>) -> Result<(), String> {
    let mut active = state.gamepad_mgr.active_gamepad_id.lock().map_err(|e| e.to_string())?;
    *active = id;
    Ok(())
}

#[tauri::command]
fn set_gamepad_muted(muted: bool, state: State<AppState>) -> Result<(), String> {
    state.gamepad_mgr.is_muted.store(muted, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
fn get_controller_state(state: State<AppState>) -> ControllerState {
    state.gamepad_mgr.state.read().unwrap().clone()
}

#[tauri::command]
fn send_virtual_button(button: String, pressed: bool, state: State<AppState>, app: AppHandle) -> Result<(), String> {
    state.gamepad_mgr.set_virtual_button(&button, pressed);
    let current = state.gamepad_mgr.state.read().unwrap().clone();
    let _ = app.emit("gamepad-state", &current);
    Ok(())
}

#[tauri::command]
fn send_virtual_dpad(direction: u8, state: State<AppState>, app: AppHandle) -> Result<(), String> {
    state.gamepad_mgr.set_virtual_dpad(direction);
    let current = state.gamepad_mgr.state.read().unwrap().clone();
    let _ = app.emit("gamepad-state", &current);
    Ok(())
}

#[tauri::command]
fn send_virtual_stick(stick: String, x: u8, y: u8, state: State<AppState>, app: AppHandle) -> Result<(), String> {
    state.gamepad_mgr.set_virtual_stick(&stick, x, y);
    let current = state.gamepad_mgr.state.read().unwrap().clone();
    let _ = app.emit("gamepad-state", &current);
    Ok(())
}

#[tauri::command]
fn reset_virtual_inputs(state: State<AppState>, app: AppHandle) -> Result<(), String> {
    state.gamepad_mgr.reset_virtual_state();
    let current = state.gamepad_mgr.state.read().unwrap().clone();
    let _ = app.emit("gamepad-state", &current);
    Ok(())
}

#[tauri::command]
fn get_serial_ports() -> Vec<SerialPortDetail> {
    SerialManager::list_ports()
}

#[tauri::command]
async fn connect_serial(
    port_name: String,
    baudrate: u32,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<(), String> {
    let serial_mgr = state.serial_mgr.clone();
    let gamepad_mgr = state.gamepad_mgr.clone();
    tauri::async_runtime::spawn_blocking(move || {
        serial_mgr.connect(&port_name, baudrate, gamepad_mgr, app)
    })
    .await
    .map_err(|e| AppError::TaskExecutionFailed { reason: e.to_string() }.to_json_string())?
}

#[tauri::command]
fn disconnect_serial(state: State<AppState>) -> Result<(), String> {
    state.serial_mgr.disconnect()
}

#[tauri::command]
fn get_serial_status(state: State<AppState>) -> SerialStatus {
    state.serial_mgr.get_status()
}

#[tauri::command]
fn send_serial_command(command: String, state: State<AppState>) -> Result<(), String> {
    state.serial_mgr.send_special_command(&command)
}

#[tauri::command]
async fn probe_firmware(
    port_name: String,
    baudrate: u32,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    // Port already streaming: it passed the mandatory handshake when connecting.
    let status = state.serial_mgr.get_status();
    if status.is_connected && status.port_name.as_deref() == Some(port_name.as_str()) {
        return Ok(true);
    }
    tauri::async_runtime::spawn_blocking(move || SerialManager::probe_firmware(&port_name, baudrate))
        .await
        .map_err(|e| AppError::TaskExecutionFailed { reason: e.to_string() }.to_json_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let gamepad_mgr = Arc::new(GamepadManager::new());
    let serial_mgr = Arc::new(SerialManager::new());

    let state_arc = gamepad_mgr.state.clone();
    let physical_state_arc = gamepad_mgr.physical_state.clone();
    let virtual_state_arc = gamepad_mgr.virtual_state.clone();
    let active_id_arc = gamepad_mgr.active_gamepad_id.clone();
    let muted_arc = gamepad_mgr.is_muted.clone();
    let gamepads_arc = gamepad_mgr.gamepads.clone();

    let app_state = AppState {
        gamepad_mgr: gamepad_mgr.clone(),
        serial_mgr: serial_mgr.clone(),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(app_state)
        .setup(move |app| {
            // Start background gamepad polling thread
            GamepadManager::start_polling(
                state_arc,
                physical_state_arc,
                virtual_state_arc,
                active_id_arc,
                muted_arc,
                gamepads_arc,
                app.handle().clone(),
            );
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_gamepads,
            set_active_gamepad,
            set_gamepad_muted,
            get_controller_state,
            send_virtual_button,
            send_virtual_dpad,
            send_virtual_stick,
            reset_virtual_inputs,
            get_serial_ports,
            connect_serial,
            disconnect_serial,
            get_serial_status,
            send_serial_command,
            probe_firmware,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

