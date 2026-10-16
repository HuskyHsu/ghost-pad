//! Gamepad input polling and mapping using gilrs
//! Supports 8BitDo Micro (D-mode & S-mode), Joy-Cons, and standard HID controllers.

use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex, RwLock,
};
use std::time::Duration;

use gilrs::{Axis, Button, Event, EventType, Gilrs};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

use crate::protocol::{ControllerState, DPadDirection, NEUTRAL_STICK};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GamepadInfo {
    pub id: usize,
    pub name: String,
    pub is_connected: bool,
    pub is_active: bool,
}

pub struct GamepadManager {
    pub state: Arc<RwLock<ControllerState>>,
    pub physical_state: Arc<RwLock<ControllerState>>,
    pub virtual_state: Arc<RwLock<ControllerState>>,
    pub virtual_dpad: Arc<RwLock<(bool, bool, bool, bool)>>, // (up, down, left, right)
    pub active_gamepad_id: Arc<Mutex<Option<usize>>>,
    pub is_muted: Arc<AtomicBool>,
    pub gamepads: Arc<RwLock<Vec<GamepadInfo>>>,
}

impl Default for GamepadManager {
    fn default() -> Self {
        Self::new()
    }
}

fn compute_dpad_direction(up: bool, down: bool, left: bool, right: bool) -> DPadDirection {
    match (up, down, left, right) {
        (true, false, false, false) => DPadDirection::Up,
        (true, false, false, true) => DPadDirection::UpRight,
        (false, false, false, true) => DPadDirection::Right,
        (false, true, false, true) => DPadDirection::DownRight,
        (false, true, false, false) => DPadDirection::Down,
        (false, true, true, false) => DPadDirection::DownLeft,
        (false, false, true, false) => DPadDirection::Left,
        (true, false, true, false) => DPadDirection::UpLeft,
        _ => DPadDirection::Center,
    }
}

impl GamepadManager {
    pub fn new() -> Self {
        Self {
            state: Arc::new(RwLock::new(ControllerState::default())),
            physical_state: Arc::new(RwLock::new(ControllerState::default())),
            virtual_state: Arc::new(RwLock::new(ControllerState::default())),
            virtual_dpad: Arc::new(RwLock::new((false, false, false, false))),
            active_gamepad_id: Arc::new(Mutex::new(None)),
            is_muted: Arc::new(AtomicBool::new(false)),
            gamepads: Arc::new(RwLock::new(Vec::new())),
        }
    }

    /// Merges physical gamepad inputs with virtual (keyboard/mouse) inputs
    pub fn merge(p: &ControllerState, v: &ControllerState) -> ControllerState {
        ControllerState {
            a: p.a || v.a,
            b: p.b || v.b,
            x: p.x || v.x,
            y: p.y || v.y,
            l: p.l || v.l,
            r: p.r || v.r,
            zl: p.zl || v.zl,
            zr: p.zr || v.zr,
            minus: p.minus || v.minus,
            plus: p.plus || v.plus,
            home: p.home || v.home,
            capture: p.capture || v.capture,
            l_stick_click: p.l_stick_click || v.l_stick_click,
            r_stick_click: p.r_stick_click || v.r_stick_click,
            dpad: if v.dpad != DPadDirection::Center {
                v.dpad
            } else {
                p.dpad
            },
            left_stick_x: if v.left_stick_x != NEUTRAL_STICK {
                v.left_stick_x
            } else {
                p.left_stick_x
            },
            left_stick_y: if v.left_stick_y != NEUTRAL_STICK {
                v.left_stick_y
            } else {
                p.left_stick_y
            },
            right_stick_x: if v.right_stick_x != NEUTRAL_STICK {
                v.right_stick_x
            } else {
                p.right_stick_x
            },
            right_stick_y: if v.right_stick_y != NEUTRAL_STICK {
                v.right_stick_y
            } else {
                p.right_stick_y
            },
        }
    }

    /// Set a virtual button state (from keyboard or on-screen mouse click)
    pub fn set_virtual_button(&self, button: &str, pressed: bool) {
        {
            let mut v = self.virtual_state.write().unwrap();
            match button.to_lowercase().as_str() {
                "a" => v.a = pressed,
                "b" => v.b = pressed,
                "x" => v.x = pressed,
                "y" => v.y = pressed,
                "l" => v.l = pressed,
                "r" => v.r = pressed,
                "zl" => v.zl = pressed,
                "zr" => v.zr = pressed,
                "minus" => v.minus = pressed,
                "plus" => v.plus = pressed,
                "home" => v.home = pressed,
                "capture" => v.capture = pressed,
                "l_stick_click" | "l3" => v.l_stick_click = pressed,
                "r_stick_click" | "r3" => v.r_stick_click = pressed,
                "dpad_up" | "up" => {
                    let mut dpad = self.virtual_dpad.write().unwrap();
                    dpad.0 = pressed;
                    v.dpad = compute_dpad_direction(dpad.0, dpad.1, dpad.2, dpad.3);
                }
                "dpad_down" | "down" => {
                    let mut dpad = self.virtual_dpad.write().unwrap();
                    dpad.1 = pressed;
                    v.dpad = compute_dpad_direction(dpad.0, dpad.1, dpad.2, dpad.3);
                }
                "dpad_left" | "left" => {
                    let mut dpad = self.virtual_dpad.write().unwrap();
                    dpad.2 = pressed;
                    v.dpad = compute_dpad_direction(dpad.0, dpad.1, dpad.2, dpad.3);
                }
                "dpad_right" | "right" => {
                    let mut dpad = self.virtual_dpad.write().unwrap();
                    dpad.3 = pressed;
                    v.dpad = compute_dpad_direction(dpad.0, dpad.1, dpad.2, dpad.3);
                }
                _ => {}
            }
        }
        self.recompute_merged_state();
    }

    /// Set a virtual dpad direction (0..8)
    pub fn set_virtual_dpad(&self, direction: u8) {
        {
            let mut v = self.virtual_state.write().unwrap();
            v.dpad = match direction {
                0 => DPadDirection::Up,
                1 => DPadDirection::UpRight,
                2 => DPadDirection::Right,
                3 => DPadDirection::DownRight,
                4 => DPadDirection::Down,
                5 => DPadDirection::DownLeft,
                6 => DPadDirection::Left,
                7 => DPadDirection::UpLeft,
                _ => DPadDirection::Center,
            };
        }
        self.recompute_merged_state();
    }

    /// Set a virtual analog stick position (0..255)
    pub fn set_virtual_stick(&self, stick: &str, x: u8, y: u8) {
        {
            let mut v = self.virtual_state.write().unwrap();
            match stick.to_lowercase().as_str() {
                "left" | "l" => {
                    v.left_stick_x = x;
                    v.left_stick_y = y;
                }
                "right" | "r" => {
                    v.right_stick_x = x;
                    v.right_stick_y = y;
                }
                _ => {}
            }
        }
        self.recompute_merged_state();
    }

    /// Reset all virtual inputs
    pub fn reset_virtual_state(&self) {
        {
            let mut v = self.virtual_state.write().unwrap();
            *v = ControllerState::default();
        }
        {
            let mut d = self.virtual_dpad.write().unwrap();
            *d = (false, false, false, false);
        }
        self.recompute_merged_state();
    }

    /// Recompute merged state from physical + virtual
    pub fn recompute_merged_state(&self) {
        let p = self.physical_state.read().unwrap();
        let v = self.virtual_state.read().unwrap();
        let merged = Self::merge(&p, &v);
        *self.state.write().unwrap() = merged;
    }

    /// Get a cloned snapshot of current merged controller state
    pub fn get_current_state(&self) -> ControllerState {
        self.state.read().unwrap().clone()
    }

    /// Set mute status (blocks output if true)
    pub fn set_mute(&self, muted: bool) {
        self.is_muted.store(muted, Ordering::Relaxed);
        self.recompute_merged_state();
    }


    /// Convert float axis (-1.0 .. 1.0) with deadzone to 0 .. 255 (128 = center)
    pub fn axis_to_u8(val: f32, deadzone: f32) -> u8 {
        if val.abs() < deadzone {
            NEUTRAL_STICK
        } else {
            let clamped = val.clamp(-1.0, 1.0);
            let mapped = ((clamped + 1.0) * 127.5).round();
            mapped.clamp(0.0, 255.0) as u8
        }
    }

    /// Compute DPad state from 4 boolean directions
    pub fn compute_dpad(up: bool, down: bool, left: bool, right: bool) -> DPadDirection {
        match (up, down, left, right) {
            (true, false, false, false) => DPadDirection::Up,
            (true, false, false, true) => DPadDirection::UpRight,
            (false, false, false, true) => DPadDirection::Right,
            (false, true, false, true) => DPadDirection::DownRight,
            (false, true, false, false) => DPadDirection::Down,
            (false, true, true, false) => DPadDirection::DownLeft,
            (false, false, true, false) => DPadDirection::Left,
            (true, false, true, false) => DPadDirection::UpLeft,
            _ => DPadDirection::Center,
        }
    }

    /// Helper to refresh cached gamepad list
    fn sync_gamepad_list(
        gilrs: &Gilrs,
        gamepads_arc: &Arc<RwLock<Vec<GamepadInfo>>>,
        active_id_arc: &Arc<Mutex<Option<usize>>>,
    ) {
        let mut active = active_id_arc.lock().unwrap();

        let list: Vec<GamepadInfo> = gilrs
            .gamepads()
            .map(|(id, g)| {
                let numeric_id: usize = id.into();
                GamepadInfo {
                    id: numeric_id,
                    name: g.name().to_string(),
                    is_connected: g.is_connected(),
                    is_active: *active == Some(numeric_id),
                }
            })
            .collect();

        // If active is None, OR active points to a disconnected device:
        // Automatically switch to the first currently connected device!
        let active_is_connected = active.map_or(false, |act_id| {
            list.iter().any(|g| g.id == act_id && g.is_connected)
        });

        if !active_is_connected {
            *active = list.iter().find(|g| g.is_connected).map(|g| g.id);
            if let Some(new_id) = *active {
                println!("[GamepadManager] Auto-selected active gamepad ID: {}", new_id);
            }
        }

        // Re-tag is_active with the final active id
        let active_val = *active;
        let final_list: Vec<GamepadInfo> = list
            .into_iter()
            .map(|mut g| {
                g.is_active = active_val == Some(g.id);
                g
            })
            .collect();

        *gamepads_arc.write().unwrap() = final_list;
    }

    /// Start the background polling thread with Tauri AppHandle for event dispatching
    pub fn start_polling(
        state_arc: Arc<RwLock<ControllerState>>,
        physical_state_arc: Arc<RwLock<ControllerState>>,
        virtual_state_arc: Arc<RwLock<ControllerState>>,
        active_id_arc: Arc<Mutex<Option<usize>>>,
        _muted_arc: Arc<AtomicBool>,
        gamepads_arc: Arc<RwLock<Vec<GamepadInfo>>>,
        app_handle: AppHandle,
    ) {
        std::thread::Builder::new()
            .name("gamepad-polling".to_string())
            .spawn(move || {
                let mut gilrs = match Gilrs::new() {
                    Ok(g) => g,
                    Err(e) => {
                        eprintln!("[GamepadManager] Failed to init gilrs: {}", e);
                        return;
                    }
                };

                // Track D-Pad states per gamepad
                let mut dpad_up = false;
                let mut dpad_down = false;
                let mut dpad_left = false;
                let mut dpad_right = false;

                let mut last_emit_state = ControllerState::default();

                // Initial sync
                Self::sync_gamepad_list(&gilrs, &gamepads_arc, &active_id_arc);

                loop {
                    let mut connection_changed = false;
                    let mut physical_input_changed = false;

                    // Process all pending OS gamepad events
                    while let Some(Event { id, event, .. }) = gilrs.next_event() {
                        let current_id: usize = id.into();

                        match event {
                            EventType::Connected => {
                                println!("[GamepadManager] Connected: {} (ID: {})", gilrs.gamepad(id).name(), current_id);
                                connection_changed = true;
                            }
                            EventType::Disconnected => {
                                println!("[GamepadManager] Disconnected ID: {}", current_id);
                                connection_changed = true;
                            }
                            EventType::ButtonPressed(btn, _) => {
                                println!("[GamepadManager] ButtonPressed: {:?} from ID: {}", btn, current_id);
                            }
                            EventType::ButtonReleased(btn, _) => {
                                println!("[GamepadManager] ButtonReleased: {:?} from ID: {}", btn, current_id);
                            }
                            _ => {}
                        }

                        // Check if event belongs to active gamepad
                        let is_target = {
                            let mut active = active_id_arc.lock().unwrap();
                            // If no active gamepad or active is pointing to something else,
                            // accept input from any single connected device!
                            if active.is_none() {
                                *active = Some(current_id);
                            }
                            *active == Some(current_id)
                        };

                        if !is_target {
                            continue;
                        }

                        {
                            let mut s = physical_state_arc.write().unwrap();

                            match event {
                                EventType::ButtonPressed(btn, _) => {
                                    physical_input_changed = true;
                                    match btn {
                                        Button::East => s.a = true,
                                        Button::South => s.b = true,
                                        Button::North => s.x = true,
                                        Button::West => s.y = true,
                                        Button::LeftTrigger => s.l = true,
                                        Button::RightTrigger => s.r = true,
                                        Button::LeftTrigger2 => s.zl = true,
                                        Button::RightTrigger2 => s.zr = true,
                                        Button::Select => s.minus = true,
                                        Button::Start => s.plus = true,
                                        Button::Mode => s.home = true,
                                        Button::LeftThumb => s.l_stick_click = true,
                                        Button::RightThumb => s.r_stick_click = true,
                                        Button::DPadUp => {
                                            dpad_up = true;
                                            s.dpad = Self::compute_dpad(dpad_up, dpad_down, dpad_left, dpad_right);
                                        }
                                        Button::DPadDown => {
                                            dpad_down = true;
                                            s.dpad = Self::compute_dpad(dpad_up, dpad_down, dpad_left, dpad_right);
                                        }
                                        Button::DPadLeft => {
                                            dpad_left = true;
                                            s.dpad = Self::compute_dpad(dpad_up, dpad_down, dpad_left, dpad_right);
                                        }
                                        Button::DPadRight => {
                                            dpad_right = true;
                                            s.dpad = Self::compute_dpad(dpad_up, dpad_down, dpad_left, dpad_right);
                                        }
                                        _ => {}
                                    }
                                }
                                EventType::ButtonReleased(btn, _) => {
                                    physical_input_changed = true;
                                    match btn {
                                        Button::East => s.a = false,
                                        Button::South => s.b = false,
                                        Button::North => s.x = false,
                                        Button::West => s.y = false,
                                        Button::LeftTrigger => s.l = false,
                                        Button::RightTrigger => s.r = false,
                                        Button::LeftTrigger2 => s.zl = false,
                                        Button::RightTrigger2 => s.zr = false,
                                        Button::Select => s.minus = false,
                                        Button::Start => s.plus = false,
                                        Button::Mode => s.home = false,
                                        Button::LeftThumb => s.l_stick_click = false,
                                        Button::RightThumb => s.r_stick_click = false,
                                        Button::DPadUp => {
                                            dpad_up = false;
                                            s.dpad = Self::compute_dpad(dpad_up, dpad_down, dpad_left, dpad_right);
                                        }
                                        Button::DPadDown => {
                                            dpad_down = false;
                                            s.dpad = Self::compute_dpad(dpad_up, dpad_down, dpad_left, dpad_right);
                                        }
                                        Button::DPadLeft => {
                                            dpad_left = false;
                                            s.dpad = Self::compute_dpad(dpad_up, dpad_down, dpad_left, dpad_right);
                                        }
                                        Button::DPadRight => {
                                            dpad_right = false;
                                            s.dpad = Self::compute_dpad(dpad_up, dpad_down, dpad_left, dpad_right);
                                        }
                                        _ => {}
                                    }
                                }
                                EventType::AxisChanged(axis, val, _) => {
                                    physical_input_changed = true;
                                    match axis {
                                        Axis::LeftStickX => s.left_stick_x = Self::axis_to_u8(val, 0.1),
                                        Axis::LeftStickY => s.left_stick_y = Self::axis_to_u8(val, 0.1),
                                        Axis::RightStickX => s.right_stick_x = Self::axis_to_u8(val, 0.1),
                                        Axis::RightStickY => s.right_stick_y = Self::axis_to_u8(val, 0.1),
                                        _ => {}
                                    }
                                }
                                _ => {}
                            }
                        }
                    }

                    if physical_input_changed {
                        let p = physical_state_arc.read().unwrap();
                        let v = virtual_state_arc.read().unwrap();
                        let merged = Self::merge(&p, &v);
                        *state_arc.write().unwrap() = merged;
                    }

                    if connection_changed {
                        Self::sync_gamepad_list(&gilrs, &gamepads_arc, &active_id_arc);
                        let current_list = gamepads_arc.read().unwrap().clone();
                        let _ = app_handle.emit("gamepad-connection-changed", current_list);
                    }

                    // Read current state snapshot and emit if changed
                    let current = state_arc.read().unwrap().clone();
                    if current != last_emit_state {
                        let _ = app_handle.emit("gamepad-state", &current);
                        last_emit_state = current;
                    }

                    // Poll rate: ~100Hz (10ms)
                    std::thread::sleep(Duration::from_millis(10));
                }
            })
            .expect("Failed to spawn gamepad polling thread");
    }

    /// List all currently known gamepads from cached state
    pub fn list_gamepads(&self) -> Vec<GamepadInfo> {
        let active_id = *self.active_gamepad_id.lock().unwrap();
        let mut list = self.gamepads.read().unwrap().clone();
        for g in &mut list {
            g.is_active = active_id == Some(g.id);
        }
        list
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_axis_to_u8() {
        assert_eq!(GamepadManager::axis_to_u8(0.0, 0.1), NEUTRAL_STICK);
        assert_eq!(GamepadManager::axis_to_u8(0.05, 0.1), NEUTRAL_STICK);
        assert_eq!(GamepadManager::axis_to_u8(-0.05, 0.1), NEUTRAL_STICK);
        assert_eq!(GamepadManager::axis_to_u8(1.0, 0.1), 255);
        assert_eq!(GamepadManager::axis_to_u8(-1.0, 0.1), 0);
        // 0.5 clamped to 127.5 * 1.5 = 191.25 -> 191
        assert_eq!(GamepadManager::axis_to_u8(0.5, 0.1), 191);
    }

    #[test]
    fn test_compute_dpad() {
        assert_eq!(GamepadManager::compute_dpad(true, false, false, false), DPadDirection::Up);
        assert_eq!(GamepadManager::compute_dpad(true, false, false, true), DPadDirection::UpRight);
        assert_eq!(GamepadManager::compute_dpad(false, false, false, true), DPadDirection::Right);
        assert_eq!(GamepadManager::compute_dpad(false, true, false, true), DPadDirection::DownRight);
        assert_eq!(GamepadManager::compute_dpad(false, true, false, false), DPadDirection::Down);
        assert_eq!(GamepadManager::compute_dpad(false, true, true, false), DPadDirection::DownLeft);
        assert_eq!(GamepadManager::compute_dpad(false, false, true, false), DPadDirection::Left);
        assert_eq!(GamepadManager::compute_dpad(true, false, true, false), DPadDirection::UpLeft);
        // Opposing directions resolve to Center
        assert_eq!(GamepadManager::compute_dpad(true, true, false, false), DPadDirection::Center);
        assert_eq!(GamepadManager::compute_dpad(false, false, true, true), DPadDirection::Center);
    }

    #[test]
    fn test_merge_inputs() {
        let mut physical = ControllerState::default();
        let mut virtual_input = ControllerState::default();

        physical.a = true;
        virtual_input.b = true;
        virtual_input.dpad = DPadDirection::Up;
        virtual_input.left_stick_x = 255;

        let merged = GamepadManager::merge(&physical, &virtual_input);
        assert!(merged.a);
        assert!(merged.b);
        assert!(!merged.x);
        assert_eq!(merged.dpad, DPadDirection::Up);
        assert_eq!(merged.left_stick_x, 255);
        assert_eq!(merged.left_stick_y, NEUTRAL_STICK);
    }

    #[test]
    fn test_virtual_controls_and_mute() {
        let manager = GamepadManager::new();
        manager.set_virtual_button("a", true);
        manager.set_virtual_stick("left", 200, 100);

        let s1 = manager.get_current_state();
        assert!(s1.a);
        assert_eq!(s1.left_stick_x, 200);
        assert_eq!(s1.left_stick_y, 100);

        // Verify input state is preserved and merged
        let s_active = manager.get_current_state();
        assert!(s_active.a);
        assert_eq!(s_active.left_stick_x, 200);
    }

    #[test]
    fn test_axis_extremes_and_clamping() {
        // Values > 1.0 clamped to 255
        assert_eq!(GamepadManager::axis_to_u8(1.5, 0.1), 255);
        assert_eq!(GamepadManager::axis_to_u8(10.0, 0.1), 255);

        // Values < -1.0 clamped to 0
        assert_eq!(GamepadManager::axis_to_u8(-1.5, 0.1), 0);
        assert_eq!(GamepadManager::axis_to_u8(-10.0, 0.1), 0);

        // Deadzone exact boundary check
        assert_eq!(GamepadManager::axis_to_u8(0.099, 0.1), NEUTRAL_STICK);
        assert_eq!(GamepadManager::axis_to_u8(-0.099, 0.1), NEUTRAL_STICK);
    }

    #[test]
    fn test_compute_dpad_conflicting_inputs() {
        // Opposing vertical directions cancel to Center
        assert_eq!(GamepadManager::compute_dpad(true, true, false, false), DPadDirection::Center);
        // Opposing horizontal directions cancel to Center
        assert_eq!(GamepadManager::compute_dpad(false, false, true, true), DPadDirection::Center);

        // Ambiguous 3-way inputs cancel to Center
        assert_eq!(GamepadManager::compute_dpad(true, true, true, false), DPadDirection::Center);
        assert_eq!(GamepadManager::compute_dpad(true, true, false, true), DPadDirection::Center);
        assert_eq!(GamepadManager::compute_dpad(true, false, true, true), DPadDirection::Center);
        assert_eq!(GamepadManager::compute_dpad(false, true, true, true), DPadDirection::Center);

        // All 4 pressed cancel each other out completely
        assert_eq!(GamepadManager::compute_dpad(true, true, true, true), DPadDirection::Center);
    }

    #[test]
    fn test_merge_all_buttons_and_sticks() {
        let mut physical = ControllerState::default();
        let mut virtual_input = ControllerState::default();

        // Physical buttons
        physical.x = true;
        physical.l = true;
        physical.minus = true;
        physical.home = true;
        physical.l_stick_click = true;

        // Virtual buttons
        virtual_input.y = true;
        virtual_input.r = true;
        virtual_input.plus = true;
        virtual_input.capture = true;
        virtual_input.r_stick_click = true;

        // Sticks: physical non-neutral, virtual non-neutral
        physical.left_stick_x = 50;
        virtual_input.right_stick_y = 220;

        let merged = GamepadManager::merge(&physical, &virtual_input);

        // All pressed buttons from both sources are true
        assert!(merged.x);
        assert!(merged.l);
        assert!(merged.minus);
        assert!(merged.home);
        assert!(merged.l_stick_click);
        assert!(merged.y);
        assert!(merged.r);
        assert!(merged.plus);
        assert!(merged.capture);
        assert!(merged.r_stick_click);

        // Non-pressed buttons remain false
        assert!(!merged.a);
        assert!(!merged.b);
        assert!(!merged.zl);
        assert!(!merged.zr);

        // Sticks merge
        assert_eq!(merged.left_stick_x, 50);
        assert_eq!(merged.right_stick_y, 220);
    }
}


