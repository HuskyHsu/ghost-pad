use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "code", content = "params")]
pub enum AppError {
    #[serde(rename = "SERIAL_OPEN_FAILED")]
    SerialOpenFailed { port: String, reason: String },

    #[serde(rename = "FIRMWARE_VERIFY_FAILED")]
    FirmwareVerifyFailed { baudrate: u32, reason: String },

    #[serde(rename = "SERIAL_NOT_OPEN")]
    SerialNotOpen,

    #[serde(rename = "UNKNOWN_SERIAL_COMMAND")]
    UnknownSerialCommand { command: String },

    #[serde(rename = "TASK_EXECUTION_FAILED")]
    TaskExecutionFailed { reason: String },

    #[serde(rename = "THREAD_SPAWN_FAILED")]
    ThreadSpawnFailed { reason: String },

    #[serde(rename = "INTERNAL_ERROR")]
    InternalError { message: String },
}

impl AppError {
    pub fn to_json_string(&self) -> String {
        serde_json::to_string(self).unwrap_or_else(|_| self.to_string())
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::SerialOpenFailed { port, reason } => {
                write!(f, "Failed to open serial port {}: {}", port, reason)
            }
            AppError::FirmwareVerifyFailed { baudrate, reason } => {
                write!(f, "Firmware verification failed ({} baud): {}", baudrate, reason)
            }
            AppError::SerialNotOpen => write!(f, "Serial port is not open"),
            AppError::UnknownSerialCommand { command } => write!(f, "Unknown command: {}", command),
            AppError::TaskExecutionFailed { reason } => write!(f, "Task execution failed: {}", reason),
            AppError::ThreadSpawnFailed { reason } => write!(f, "Thread spawn failed: {}", reason),
            AppError::InternalError { message } => write!(f, "Internal error: {}", message),
        }
    }
}

impl std::error::Error for AppError {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_error_serialization() {
        let err = AppError::SerialOpenFailed {
            port: "COM3".into(),
            reason: "Access denied".into(),
        };
        let json = err.to_json_string();
        assert!(json.contains("\"code\":\"SERIAL_OPEN_FAILED\""));
        assert!(json.contains("\"port\":\"COM3\""));
        assert!(json.contains("\"reason\":\"Access denied\""));
    }
}
