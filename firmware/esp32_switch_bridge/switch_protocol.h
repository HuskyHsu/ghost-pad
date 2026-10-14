#ifndef SWITCH_PROTOCOL_H
#define SWITCH_PROTOCOL_H

#include <stdint.h>
#include <stdbool.h>

// Packet Framing Constants
#define PROTOCOL_HEADER_0     0xAA
#define PROTOCOL_HEADER_1     0x55
#define PROTOCOL_PACKET_SIZE  10
#define STICK_NEUTRAL_VAL     128
#define HEARTBEAT_TIMEOUT_MS  200

// Byte 2: Button Low Bitmask
#define BTN_Y                 (1 << 0)
#define BTN_B                 (1 << 1)
#define BTN_A                 (1 << 2)
#define BTN_X                 (1 << 3)
#define BTN_L                 (1 << 4)
#define BTN_R                 (1 << 5)
#define BTN_ZL                (1 << 6)
#define BTN_ZR                (1 << 7)

// Byte 3: Button High Bitmask
#define BTN_MINUS             (1 << 0)
#define BTN_PLUS              (1 << 1)
#define BTN_HOME              (1 << 2)
#define BTN_CAPTURE           (1 << 3)
#define BTN_L_CLICK           (1 << 4)
#define BTN_R_CLICK           (1 << 5)

// Byte 4: D-Pad 8-way Hat Switch
enum DPadState {
    DPAD_UP         = 0,
    DPAD_UP_RIGHT   = 1,
    DPAD_RIGHT      = 2,
    DPAD_DOWN_RIGHT = 3,
    DPAD_DOWN       = 4,
    DPAD_DOWN_LEFT  = 5,
    DPAD_LEFT       = 6,
    DPAD_UP_LEFT    = 7,
    DPAD_CENTER     = 8
};

// Internal Controller State Structure
struct ControllerData {
    uint8_t btn_lo;
    uint8_t btn_hi;
    uint8_t dpad;
    uint8_t left_x;
    uint8_t left_y;
    uint8_t right_x;
    uint8_t right_y;
};

// Checksum Calculation: XOR of bytes 2..8
static inline uint8_t calculate_checksum(const uint8_t *raw_pkt) {
    return (raw_pkt[2] ^ raw_pkt[3] ^ raw_pkt[4] ^ 
            raw_pkt[5] ^ raw_pkt[6] ^ raw_pkt[7] ^ raw_pkt[8]);
}

// Reset Controller state to Neutral / Safe
static inline void reset_controller_data(struct ControllerData *ctrl) {
    ctrl->btn_lo = 0;
    ctrl->btn_hi = 0;
    ctrl->dpad = DPAD_CENTER;
    ctrl->left_x = STICK_NEUTRAL_VAL;
    ctrl->left_y = STICK_NEUTRAL_VAL;
    ctrl->right_x = STICK_NEUTRAL_VAL;
    ctrl->right_y = STICK_NEUTRAL_VAL;
}

#endif // SWITCH_PROTOCOL_H
