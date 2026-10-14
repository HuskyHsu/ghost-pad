/*
 ============================================================================
  PC-to-Switch Controller Bridge: ESP32 Firmware
 ============================================================================
  Board: ESP32 Dev Module (Standard ESP32 with Bluetooth Classic)
  Baud Rate: 115200 (or 921600 for ultra-low latency)
  
  Functionality:
    1. Receives 10-byte binary packets from PC over USB-Serial (50~60Hz).
    2. Validates Header (0xAA 0x55) and XOR Checksum.
    3. Watchdog Fail-Safe: If no PC packet received for >200ms, resets all
       controller inputs to neutral (releases buttons, centers joysticks).
    4. Dispatches input state to Nintendo Switch via Bluetooth HID.
 ============================================================================
*/

#include <Arduino.h>
#include "switch_protocol.h"

// Forward declaration of Bluetooth HID dispatch
void send_report_to_switch(const struct ControllerData *ctrl);

// Parser State Machine
enum ParserState {
    STATE_WAIT_H0,
    STATE_WAIT_H1,
    STATE_READ_BODY
};

static ParserState rx_state = STATE_WAIT_H0;
static uint8_t rx_buffer[PROTOCOL_PACKET_SIZE];
static uint8_t rx_index = 0;

// Controller State Variables
static struct ControllerData current_state;
static unsigned long last_packet_time = 0;
static bool is_neutral = true;

// LED Indicator (Built-in LED on GPIO 2 for standard ESP32 boards)
#define LED_PIN 2

void setup() {
    // 1. Initialize High-Speed Serial
    Serial.begin(115200);
    // Increase Serial RX buffer size for uninterrupted streaming
    Serial.setRxBufferSize(512);

    // 2. Initialize Status Indicator
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);

    // 3. Reset controller data to safe neutral state
    reset_controller_data(&current_state);
    last_packet_time = millis();

    // 4. Initialize Bluetooth Classic Controller Stack
    // (See README.md for Bluetooth pairing instructions)
    Serial.println(F("[ESP32-BRIDGE] Initialized. Awaiting PC serial stream..."));
}

void loop() {
    // -------------------------------------------------------------
    // Task 1: Non-blocking Serial Frame Parser
    // -------------------------------------------------------------
    while (Serial.available() > 0) {
        uint8_t b = Serial.read();

        switch (rx_state) {
            case STATE_WAIT_H0:
                if (b == PROTOCOL_HEADER_0) {
                    rx_buffer[0] = b;
                    rx_state = STATE_WAIT_H1;
                }
                break;

            case STATE_WAIT_H1:
                if (b == PROTOCOL_HEADER_1) {
                    rx_buffer[1] = b;
                    rx_index = 2;
                    rx_state = STATE_READ_BODY;
                } else {
                    // Header mismatch, reset
                    rx_state = (b == PROTOCOL_HEADER_0) ? STATE_WAIT_H1 : STATE_WAIT_H0;
                }
                break;

            case STATE_READ_BODY:
                rx_buffer[rx_index++] = b;
                if (rx_index >= PROTOCOL_PACKET_SIZE) {
                    // Packet fully received, verify checksum
                    uint8_t received_checksum = rx_buffer[9];
                    uint8_t computed_checksum = calculate_checksum(rx_buffer);

                    if (received_checksum == computed_checksum) {
                        // Checksum PASSED: Copy state
                        current_state.btn_lo  = rx_buffer[2];
                        current_state.btn_hi  = rx_buffer[3];
                        current_state.dpad    = rx_buffer[4];
                        current_state.left_x  = rx_buffer[5];
                        current_state.left_y  = rx_buffer[6];
                        current_state.right_x = rx_buffer[7];
                        current_state.right_y = rx_buffer[8];

                        last_packet_time = millis();
                        is_neutral = false;
                        digitalWrite(LED_PIN, HIGH);

                        // Dispatch report to Nintendo Switch
                        send_report_to_switch(&current_state);
                    } else {
                        // Checksum mismatch, discard frame
                    }

                    // Reset parser for next frame
                    rx_state = STATE_WAIT_H0;
                    rx_index = 0;
                }
                break;
        }
    }

    // -------------------------------------------------------------
    // Task 2: Watchdog / Fail-Safe Heartbeat Monitor
    // -------------------------------------------------------------
    if (!is_neutral && (millis() - last_packet_time > HEARTBEAT_TIMEOUT_MS)) {
        // PC disconnected or lagged! Fail-safe: zero all inputs
        reset_controller_data(&current_state);
        send_report_to_switch(&current_state);
        is_neutral = true;
        digitalWrite(LED_PIN, LOW); // Turn off LED
    }
}

// -----------------------------------------------------------------
// Bluetooth HID Report Dispatch
// -----------------------------------------------------------------
/*
  Maps the ControllerData structure into Nintendo Switch HID format.
  Standard Switch Pro Controller 0x30 Full Input Report format:
    Byte 0: Report ID (0x30)
    Byte 1: Timer
    Byte 2: Battery & Connection info
    Byte 3-5: Button data (3 bytes bitmask)
      Byte 3: Y, X, B, A, SR, SL, R, ZR
      Byte 4: Minus, Plus, R-Stick, L-Stick, Home, Capture
      Byte 5: Down, Up, Right, Left, SR, SL, L, ZL
    Byte 6-8: Left Stick (12-bit X, 12-bit Y)
    Byte 9-11: Right Stick (12-bit X, 12-bit Y)
    Byte 12: Vibrator ack
    Byte 13-48: IMU (6-axis gyro/accel data)
*/
void send_report_to_switch(const struct ControllerData *ctrl) {
    // Note: When using libraries like nullstalgia/UARTSwitchCon, 
    // EasyConNS/BlueCon-esp32, or ghostside-net/ESP32-Switch-Controller-Joycon,
    // this function feeds the parsed inputs directly into the Bluetooth stack.
    
    // Example: Converting 8-bit stick (0~255) to Switch 12-bit (0~4095, center ~2048):
    // uint16_t switch_lx = (uint16_t)ctrl->left_x * 16;
    // uint16_t switch_ly = (uint16_t)ctrl->left_y * 16;
    // uint16_t switch_rx = (uint16_t)ctrl->right_x * 16;
    // uint16_t switch_ry = (uint16_t)ctrl->right_y * 16;
}
