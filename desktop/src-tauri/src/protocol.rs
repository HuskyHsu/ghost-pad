//! PC-to-Switch Controller Bridge: Protocol Definition
//! Implements binary packing for both UARTSwitchCon (9-byte CRC8) and Custom Bridge (10-byte XOR).

use serde::{Deserialize, Serialize};

pub const HEADER_BYTE_0: u8 = 0xAA;
pub const HEADER_BYTE_1: u8 = 0x55;
pub const PACKET_SIZE_10: usize = 10;
pub const PACKET_SIZE_9: usize = 9;
pub const NEUTRAL_STICK: u8 = 128;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum DPadDirection {
    Up = 0,
    UpRight = 1,
    Right = 2,
    DownRight = 3,
    Down = 4,
    DownLeft = 5,
    Left = 6,
    UpLeft = 7,
    Center = 8,
}

impl Serialize for DPadDirection {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_u8(*self as u8)
    }
}

impl<'de> Deserialize<'de> for DPadDirection {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let val = serde_json::Value::deserialize(deserializer)?;
        match val {
            serde_json::Value::Number(n) => {
                let num = n.as_u64().unwrap_or(8) as u8;
                match num {
                    0 => Ok(DPadDirection::Up),
                    1 => Ok(DPadDirection::UpRight),
                    2 => Ok(DPadDirection::Right),
                    3 => Ok(DPadDirection::DownRight),
                    4 => Ok(DPadDirection::Down),
                    5 => Ok(DPadDirection::DownLeft),
                    6 => Ok(DPadDirection::Left),
                    7 => Ok(DPadDirection::UpLeft),
                    _ => Ok(DPadDirection::Center),
                }
            }
            serde_json::Value::String(s) => match s.to_lowercase().as_str() {
                "up" => Ok(DPadDirection::Up),
                "upright" => Ok(DPadDirection::UpRight),
                "right" => Ok(DPadDirection::Right),
                "downright" => Ok(DPadDirection::DownRight),
                "down" => Ok(DPadDirection::Down),
                "downleft" => Ok(DPadDirection::DownLeft),
                "left" => Ok(DPadDirection::Left),
                "upleft" => Ok(DPadDirection::UpLeft),
                _ => Ok(DPadDirection::Center),
            },
            _ => Ok(DPadDirection::Center),
        }
    }
}

impl Default for DPadDirection {
    fn default() -> Self {
        DPadDirection::Center
    }
}

/// Standardized Controller Input State
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ControllerState {
    // Action Buttons
    pub a: bool,
    pub b: bool,
    pub x: bool,
    pub y: bool,
    pub l: bool,
    pub r: bool,
    pub zl: bool,
    pub zr: bool,

    // System Buttons
    pub minus: bool,
    pub plus: bool,
    pub home: bool,
    pub capture: bool,
    pub l_stick_click: bool,
    pub r_stick_click: bool,

    // Directional inputs
    pub dpad: DPadDirection,
    pub left_stick_x: u8,
    pub left_stick_y: u8,
    pub right_stick_x: u8,
    pub right_stick_y: u8,
}

impl Default for ControllerState {
    fn default() -> Self {
        Self {
            a: false,
            b: false,
            x: false,
            y: false,
            l: false,
            r: false,
            zl: false,
            zr: false,
            minus: false,
            plus: false,
            home: false,
            capture: false,
            l_stick_click: false,
            r_stick_click: false,
            dpad: DPadDirection::Center,
            left_stick_x: NEUTRAL_STICK,
            left_stick_y: NEUTRAL_STICK,
            right_stick_x: NEUTRAL_STICK,
            right_stick_y: NEUTRAL_STICK,
        }
    }
}

impl ControllerState {
    /// Bitmask for low buttons (Byte 1 / btn_lo)
    pub fn btn_lo(&self) -> u8 {
        let mut mask = 0u8;
        if self.y { mask |= 1 << 0; }
        if self.b { mask |= 1 << 1; }
        if self.a { mask |= 1 << 2; }
        if self.x { mask |= 1 << 3; }
        if self.l { mask |= 1 << 4; }
        if self.r { mask |= 1 << 5; }
        if self.zl { mask |= 1 << 6; }
        if self.zr { mask |= 1 << 7; }
        mask
    }

    /// Bitmask for high buttons (Byte 0 / btn_hi)
    pub fn btn_hi(&self) -> u8 {
        let mut mask = 0u8;
        if self.minus { mask |= 1 << 0; }
        if self.plus { mask |= 1 << 1; }
        if self.home { mask |= 1 << 2; }
        if self.capture { mask |= 1 << 3; }
        if self.l_stick_click { mask |= 1 << 4; }
        if self.r_stick_click { mask |= 1 << 5; }
        mask
    }

    /// Standard CRC-8 (polynomial 0x07, init 0x00)
    pub fn calculate_crc8(data: &[u8]) -> u8 {
        let mut crc: u8 = 0x00;
        for &byte in data {
            crc ^= byte;
            for _ in 0..8 {
                if (crc & 0x80) != 0 {
                    crc = (crc << 1) ^ 0x07;
                } else {
                    crc <<= 1;
                }
            }
        }
        crc
    }

    /// Pack into UARTSwitchCon 9-byte format (matching PRO-UART0.bin firmware)
    pub fn pack_uart_switchcon(&self) -> [u8; 9] {
        let btn_hi = self.btn_hi();
        let btn_lo = self.btn_lo();
        let dpad_val = self.dpad as u8;
        let lx = self.left_stick_x;
        // Invert Y so 255 (Up) in app maps to 0 (Up) on Switch
        let ly = 255u8.saturating_sub(self.left_stick_y);
        let rx = self.right_stick_x;
        let ry = 255u8.saturating_sub(self.right_stick_y);

        let mut payload = [btn_hi, btn_lo, dpad_val, lx, ly, rx, ry, 0x00, 0x00];
        let crc = Self::calculate_crc8(&payload[..8]);
        payload[8] = crc;
        payload
    }

    /// Pack into 10-byte XOR format (matching esp32_switch_bridge.ino)
    pub fn pack_10byte(&self) -> [u8; 10] {
        let btn_lo = self.btn_lo();
        let btn_hi = self.btn_hi();
        let dpad_val = self.dpad as u8;
        let lx = self.left_stick_x;
        let ly = self.left_stick_y;
        let rx = self.right_stick_x;
        let ry = self.right_stick_y;

        let checksum = btn_lo ^ btn_hi ^ dpad_val ^ lx ^ ly ^ rx ^ ry;

        [
            HEADER_BYTE_0,
            HEADER_BYTE_1,
            btn_lo,
            btn_hi,
            dpad_val,
            lx,
            ly,
            rx,
            ry,
            checksum,
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_neutral_state() {
        let state = ControllerState::default();
        let packed_9 = state.pack_uart_switchcon();
        assert_eq!(packed_9.len(), 9);
        assert_eq!(packed_9[0], 0); // btn_hi
        assert_eq!(packed_9[1], 0); // btn_lo
        assert_eq!(packed_9[2], 8); // dpad center
        assert_eq!(packed_9[3], 128); // lx
        assert_eq!(packed_9[4], 127); // ly inverted (255 - 128 = 127)
    }

    #[test]
    fn test_crc8_standard() {
        // Standard check: "123456789" => 0xF4
        let check = ControllerState::calculate_crc8(b"123456789");
        assert_eq!(check, 0xF4);
    }
}
