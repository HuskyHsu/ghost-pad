import { describe, it, expect } from "vitest";
import { DEFAULT_CONTROLLER_STATE, isEsp32Chip, SerialPortDetail } from "../types";

describe("DEFAULT_CONTROLLER_STATE", () => {
  it("initializes analog sticks to neutral 128", () => {
    expect(DEFAULT_CONTROLLER_STATE.left_stick_x).toBe(128);
    expect(DEFAULT_CONTROLLER_STATE.left_stick_y).toBe(128);
    expect(DEFAULT_CONTROLLER_STATE.right_stick_x).toBe(128);
    expect(DEFAULT_CONTROLLER_STATE.right_stick_y).toBe(128);
  });

  it("initializes D-pad to center (8)", () => {
    expect(DEFAULT_CONTROLLER_STATE.dpad).toBe(8);
  });

  it("initializes all digital action and shoulder buttons to false", () => {
    expect(DEFAULT_CONTROLLER_STATE.a).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.b).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.x).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.y).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.l).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.r).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.zl).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.zr).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.minus).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.plus).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.home).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.capture).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.l_stick_click).toBe(false);
    expect(DEFAULT_CONTROLLER_STATE.r_stick_click).toBe(false);
  });
});

describe("isEsp32Chip", () => {
  it("identifies CH340 / WCH serial chips", () => {
    const port: SerialPortDetail = {
      port_name: "/dev/cu.usbserial-110",
      description: "USB Serial CH340",
      usb_info: { vid: 0x1a86, pid: 0x7523 },
    };
    expect(isEsp32Chip(port)).toBe(true);
  });

  it("identifies Silicon Labs CP210x serial chips", () => {
    const port: SerialPortDetail = {
      port_name: "/dev/cu.usbserial-0001",
      description: "CP2102 USB to UART",
      usb_info: { vid: 0x10c4, pid: 0xea60 },
    };
    expect(isEsp32Chip(port)).toBe(true);
  });

  it("identifies Espressif native USB chips", () => {
    const port: SerialPortDetail = {
      port_name: "/dev/cu.usbmodem1101",
      description: "Espressif USB JTAG/serial",
      usb_info: { vid: 0x303a, pid: 0x1001 },
    };
    expect(isEsp32Chip(port)).toBe(true);
  });

  it("identifies FTDI serial chips", () => {
    const port: SerialPortDetail = {
      port_name: "/dev/cu.usbserial-FT1234",
      description: "FT232R USB UART",
      usb_info: { vid: 0x0403, pid: 0x6001 },
    };
    expect(isEsp32Chip(port)).toBe(true);
  });

  it("identifies devices matching keyword patterns in port_name even without usb_info", () => {
    expect(isEsp32Chip({ port_name: "/dev/ttyUSB0", description: "" })).toBe(true);
    expect(isEsp32Chip({ port_name: "/dev/cu.wchusbserial1410", description: "" })).toBe(true);
    expect(isEsp32Chip({ port_name: "COM3", description: "CH340 Serial Port" })).toBe(true);
    expect(isEsp32Chip({ port_name: "/dev/cu.usbserial-1420", description: "" })).toBe(true);
  });

  it("returns false for undefined, null-like, or non-matching devices", () => {
    expect(isEsp32Chip(undefined)).toBe(false);
    const generic: SerialPortDetail = {
      port_name: "/dev/cu.Bluetooth-Incoming-Port",
      description: "Bluetooth Port",
    };
    expect(isEsp32Chip(generic)).toBe(false);

    const standardSerial: SerialPortDetail = {
      port_name: "COM1",
      description: "Communications Port",
    };
    expect(isEsp32Chip(standardSerial)).toBe(false);
  });
});

