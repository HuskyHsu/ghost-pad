export interface ControllerState {
  a: boolean;
  b: boolean;
  x: boolean;
  y: boolean;
  l: boolean;
  r: boolean;
  zl: boolean;
  zr: boolean;
  minus: boolean;
  plus: boolean;
  home: boolean;
  capture: boolean;
  l_stick_click: boolean;
  r_stick_click: boolean;
  dpad: number; // 0: Up, 1: UR, 2: R, 3: DR, 4: D, 5: DL, 6: L, 7: UL, 8: Center
  left_stick_x: number; // 0~255 (128 center)
  left_stick_y: number; // 0~255 (128 center)
  right_stick_x: number; // 0~255 (128 center)
  right_stick_y: number; // 0~255 (128 center)
}

export interface GamepadInfo {
  id: number;
  name: string;
  is_connected: boolean;
  is_active: boolean;
}

export const DEFAULT_CONTROLLER_STATE: ControllerState = {
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
  dpad: 8,
  left_stick_x: 128,
  left_stick_y: 128,
  right_stick_x: 128,
  right_stick_y: 128,
};

export interface UsbPortInfo {
  vid: number;
  pid: number;
  manufacturer?: string;
  product?: string;
}

export interface SerialPortDetail {
  port_name: string;
  description: string;
  usb_info?: UsbPortInfo;
}

export interface SerialStatus {
  is_connected: boolean;
  port_name?: string;
  baudrate: number;
  packets_sent: number;
  tx_fps: number;
  switch_pairing_state: "disconnected" | "pairing" | "connected" | string;
}


