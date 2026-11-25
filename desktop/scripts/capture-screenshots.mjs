#!/usr/bin/env node
/**
 * Automated multi-locale README screenshot generator for Ghost-Pad.
 *
 * Captures 9 screenshots (en / ja / zh-TW × dashboard / macro-studio / hardware)
 * at 1280×820 directly into docs/assets/screenshots/<lang>/<page>.png.
 *
 * Usage:
 *   npm run screenshots
 *   npm run screenshots -- --lang=zh-TW
 *   npm run screenshots -- --port=14299
 */

import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DESKTOP_DIR = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(DESKTOP_DIR, "..");
const OUTPUT_ROOT = path.join(REPO_ROOT, "docs", "assets", "screenshots");

const ALL_LOCALES = ["en", "ja", "zh-TW"];
const PAGES = [
  { name: "dashboard", query: "tab=dashboard" },
  { name: "macro-studio", query: "tab=macro&macroView=edit" },
  { name: "hardware", query: "tab=hardware" },
];

const WIDTH = 1280;
const HEIGHT = 820;

// Parse optional CLI flags (--lang=zh-TW, --port=14299)
const args = process.argv.slice(2);
const langArg = args.find((a) => a.startsWith("--lang="))?.split("=")[1];
const portArg = Number(args.find((a) => a.startsWith("--port="))?.split("=")[1] || 14299);
const locales = langArg ? langArg.split(",").filter((l) => ALL_LOCALES.includes(l)) : ALL_LOCALES;

if (locales.length === 0) {
  console.error(`Invalid --lang value. Supported: ${ALL_LOCALES.join(", ")}`);
  process.exit(1);
}

function findChromeBinary() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  for (const bin of candidates) {
    if (fs.existsSync(bin)) return bin;
  }
  return null;
}

async function waitForServer(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for Vite dev server at ${url}`);
}

async function main() {
  const chromeBin = findChromeBinary();
  if (!chromeBin) {
    console.error(
      "Could not find Chrome/Chromium binary. Install Google Chrome or set CHROME_PATH=/path/to/chrome."
    );
    process.exit(1);
  }

  const baseUrl = `http://127.0.0.1:${portArg}`;
  console.log(`[screenshots] Starting Vite dev server on ${baseUrl}...`);

  const vite = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["vite", "--host", "127.0.0.1", "--port", String(portArg), "--strictPort"],
    {
      cwd: DESKTOP_DIR,
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  let viteStderr = "";
  vite.stderr.on("data", (chunk) => {
    viteStderr += chunk.toString();
  });

  const cleanup = () => {
    if (!vite.killed) {
      vite.kill("SIGTERM");
    }
  };
  process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(143);
  });

  try {
    await waitForServer(baseUrl);
    console.log(`[screenshots] Vite ready. Capturing ${locales.length * PAGES.length} screenshots (${WIDTH}x${HEIGHT})...`);

    for (const lang of locales) {
      const langDir = path.join(OUTPUT_ROOT, lang);
      fs.mkdirSync(langDir, { recursive: true });

      for (const page of PAGES) {
        const url = `${baseUrl}/?demo=true&lang=${encodeURIComponent(lang)}&${page.query}`;
        const outFile = path.join(langDir, `${page.name}.png`);

        execFileSync(
          chromeBin,
          [
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--hide-scrollbars",
            `--window-size=${WIDTH},${HEIGHT}`,
            "--force-device-scale-factor=1",
            "--virtual-time-budget=2500",
            `--screenshot=${outFile}`,
            url,
          ],
          { stdio: "pipe" }
        );

        const relPath = path.relative(REPO_ROOT, outFile);
        console.log(`  ✓ ${relPath}`);
      }
    }

    console.log("[screenshots] Done! All screenshots updated.");
  } catch (err) {
    console.error("[screenshots] Failed:", err instanceof Error ? err.message : err);
    if (viteStderr.trim()) {
      console.error("[vite stderr]\n" + viteStderr.trim());
    }
    process.exitCode = 1;
  } finally {
    cleanup();
  }
}

main();
