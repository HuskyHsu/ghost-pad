pub mod gamepad;
pub mod protocol;

use std::sync::atomic::Ordering;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

use crate::gamepad::{GamepadInfo, GamepadManager};
use crate::protocol::ControllerState;

pub struct AppState {
    pub gamepad_mgr: Arc<GamepadManager>,
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let gamepad_mgr = Arc::new(GamepadManager::new());
    let state_arc = gamepad_mgr.state.clone();
    let physical_state_arc = gamepad_mgr.physical_state.clone();
    let virtual_state_arc = gamepad_mgr.virtual_state.clone();
    let active_id_arc = gamepad_mgr.active_gamepad_id.clone();
    let muted_arc = gamepad_mgr.is_muted.clone();
    let gamepads_arc = gamepad_mgr.gamepads.clone();

    let app_state = AppState {
        gamepad_mgr: gamepad_mgr.clone(),
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
