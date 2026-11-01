#!/usr/bin/env bash
set -e

# Build script for ESP32 Auto-Reconnect Firmware using Docker
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Building ESP32 Firmware via Docker..."

docker run --rm -v "${DIR}:/workspace" -w /workspace/uartswitchcon ubuntu:20.04 bash -c '
  apt-get update && apt-get install -y gcc git wget make libncurses-dev flex bison gperf python2.7 python-serial
  ln -sf /usr/bin/python2.7 /usr/bin/python
  wget -q https://dl.espressif.com/dl/xtensa-esp32-elf-linux64-1.22.0-80-g6c4433a-5.2.0.tar.gz
  tar -xzf xtensa-esp32-elf-linux64-1.22.0-80-g6c4433a-5.2.0.tar.gz
  export PATH="/workspace/uartswitchcon/xtensa-esp32-elf/bin:$PATH"
  git clone --depth 1 --recursive https://github.com/nullstalgia/esp-idf.git /esp-idf
  export IDF_PATH=/esp-idf
  make -j$(nproc)
  cp build/OpenSwitchPad.bin /workspace/PRO-UART0.bin
  rm -rf xtensa-esp32-elf*
  echo "Build successful! Replaced /workspace/PRO-UART0.bin"
'
