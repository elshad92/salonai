/**
 * Playwright screencast for Product Hunt demo.
 * Usage: node scripts/record-demo.mjs
 * Output: public/product-hunt-demo.webm (and .mp4 if ffmpeg is installed)
 */

import { chromium, _electron as electron } from "@playwright/test";
import { spawnSync, execSync } from "child_process";
import { renameSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const OUTPUT_WEBM = path.join(PUBLIC_DIR, "product-hunt-demo.webm");
const OUTPUT_MP4 = path.join(PUBLIC_DIR, "product-hunt-demo.mp4");
const SITE = "https://salonai-app.netlify.app";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function smoothScroll(page, targets) {
  for (const y of targets) {
    await page.evaluate((scrollY) => window.scrollTo({ top: scrollY, behavior: "smooth" }), y);
    await sleep(1800);
  }
}

console.log("Starting SalonAI demo recording…");
// Try system Edge first (avoids VC++ runtime issues with Playwright's bundled Chromium on some Windows setups)
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await chromium.launch({
  headless: false,
  executablePath: EDGE_PATH,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: PUBLIC_DIR, size: { width: 1280, height: 720 } },
});

const page = await context.newPage();

// ── 1. Landing page ──────────────────────────────────────────────────
console.log("→ Landing page…");
await page.goto(SITE, { waitUntil: "networkidle", timeout: 30000 });
await sleep(2500);

// Hero → AI Agents → Comparison → Pricing → CTA
await smoothScroll(page, [0, 480, 960, 1500, 2100, 2700, 3300]);

// Scroll back to top
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
await sleep(1200);

// ── 2. Chat widget ───────────────────────────────────────────────────
console.log("→ Opening ChatWidget…");
const chatBtn = page.locator('button[aria-label="Open AI Receptionist chat"]');
await chatBtn.waitFor({ timeout: 8000 });
await chatBtn.click();
await sleep(1500);

console.log("→ Typing booking request…");
const msgInput = page.locator('input[placeholder="Type a message..."]');
await msgInput.waitFor({ timeout: 5000 });
await msgInput.type("I want a haircut on Saturday at 3pm", { delay: 70 });
await sleep(700);
await page.locator('form button[type="submit"]').click();
await sleep(6000); // wait for Gemini AI response

// ── 3. Login page ────────────────────────────────────────────────────
console.log("→ Login page…");
try {
  await page.locator('button[aria-label="Close chat"]').click({ timeout: 2000 });
} catch { /* widget may already be closed */ }
await sleep(500);
await page.goto(SITE + "/login", { waitUntil: "networkidle", timeout: 15000 });
await sleep(2500);

// ── 4. Demo salon (public booking page) ──────────────────────────────
console.log("→ Demo salon page…");
try {
  await page.goto(SITE + "/s/demo", { waitUntil: "networkidle", timeout: 15000 });
} catch {
  // /s/demo slug may not exist — just show whatever the page renders
  await sleep(1000);
}
await sleep(3500);

// ── Finalize ─────────────────────────────────────────────────────────
const video = page.video();
await context.close();
await browser.close();

const recordedPath = await video.path();
console.log("Raw recording:", recordedPath);

if (existsSync(OUTPUT_WEBM)) {
  const ts = Date.now();
  renameSync(OUTPUT_WEBM, OUTPUT_WEBM.replace(".webm", `_${ts}.webm`));
}
renameSync(recordedPath, OUTPUT_WEBM);
console.log("✅ Saved:", OUTPUT_WEBM);

// ── Optional MP4 via ffmpeg ───────────────────────────────────────────
const ff = spawnSync("ffmpeg", [
  "-i", OUTPUT_WEBM,
  "-c:v", "libx264",
  "-crf", "23",
  "-preset", "fast",
  "-movflags", "+faststart",
  "-y", OUTPUT_MP4,
], { stdio: "inherit" });

if (ff.status === 0) {
  console.log("✅ MP4 saved:", OUTPUT_MP4);
} else {
  console.log("ℹ️  ffmpeg not found — only .webm available. Install ffmpeg to get .mp4.");
}
