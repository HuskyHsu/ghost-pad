const zlib = require("node:zlib");

// Polyfill for Node.js versions without built-in Zstandard decompression (added in v22.15+ / v23.8+)
// Needed by undici >= 8.12.1 in jsdom when running on older Node versions.
if (!zlib.createZstdDecompress) {
  zlib.createZstdDecompress = function () {
    const { PassThrough } = require("node:stream");
    return new PassThrough();
  };
}

if (!zlib.constants) {
  zlib.constants = {};
}

if (zlib.constants.ZSTD_d_windowLogMax === undefined) {
  zlib.constants.ZSTD_d_windowLogMax = 0;
}
