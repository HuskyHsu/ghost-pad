#!/usr/bin/env bash
set -e

# Build script for ESP32 Auto-Reconnect Firmware using Docker
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Building ESP32 Firmware via Docker..."

docker run --rm -v "${DIR}:/workspace" -w /workspace/uartswitchcon ubuntu:20.04 bash -c '
  set -e
  apt-get update && apt-get install -y gcc git wget make libncurses-dev flex bison gperf python2.7 python-serial python3 python3-pip
  ln -sf /usr/bin/python2.7 /usr/bin/python
  python3 -m pip install -U esptool

  if [ ! -d "xtensa-esp32-elf" ]; then
    wget -q https://dl.espressif.com/dl/xtensa-esp32-elf-linux64-1.22.0-80-g6c4433a-5.2.0.tar.gz
    tar -xzf xtensa-esp32-elf-linux64-1.22.0-80-g6c4433a-5.2.0.tar.gz
  fi
  export PATH="/workspace/uartswitchcon/xtensa-esp32-elf/bin:$PATH"

  if [ ! -d "/esp-idf" ]; then
    git clone --depth 1 --recursive https://github.com/nullstalgia/esp-idf.git /esp-idf
  fi
  export IDF_PATH=/esp-idf

  make -j$(nproc)

  echo "Merging bootloader, partition table, and app into single 0x0 binary..."
  python3 -m esptool --chip esp32 merge_bin \
    -o /workspace/PRO-UART0-RECONNECT.bin \
    --flash_mode dio \
    --flash_freq 40m \
    --flash_size 4MB \
    0x1000 build/bootloader/bootloader.bin \
    0x10000 build/partitions_singleapp.bin \
    0x20000 build/OpenSwitchPad.bin

  cp /workspace/PRO-UART0-RECONNECT.bin /workspace/PRO-UART0.bin
  rm -rf xtensa-esp32-elf*
  echo "Build successful! Generated /workspace/PRO-UART0-RECONNECT.bin and safely updated /workspace/PRO-UART0.bin (Merged at 0x0)"
'
