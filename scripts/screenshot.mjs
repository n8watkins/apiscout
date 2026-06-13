#!/usr/bin/env node
// Capture a real README hero screenshot of the running app, and rasterize the
// app icon SVG. Run against a live server: `npm run start` then `npm run shot`.
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ROOT = path.join(import.meta.dirname, "..");
const BASE = process.env.BASE_URL || "http://localhost:7690";

const browser = await chromium.launch();

// --- Rasterize the app icon from inline SVG ---
{
  const svg = fs.readFileSync(path.join(ROOT, "scripts", "icon.svg"), "utf8");
  const page = await browser.newPage({ viewport: { width: 256, height: 256 } });
  await page.setContent(
    `<body style="margin:0">${svg}</body>`,
    { waitUntil: "networkidle" }
  );
  const el = await page.$("svg");
  await el.screenshot({ path: path.join(ROOT, "app", "icon.png"), omitBackground: true });
  await page.close();
  console.log("wrote app/icon.png");
}

// --- README hero shot (desktop) ---
{
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1200);
  fs.mkdirSync(path.join(ROOT, "assets"), { recursive: true });
  await page.screenshot({ path: path.join(ROOT, "assets", "hero.png") });
  console.log("wrote assets/hero.png");

  // --- Playground shot: expand a known no-auth+CORS card and run it ---
  try {
    // Apply the hero "No-auth + CORS" filter so the demo card is a directly
    // callable JSON API, then narrow to a clean example.
    await page.getByRole("button", { name: /No-auth \+ CORS/ }).first().click();
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const input = document.querySelector('input[aria-label="Search APIs"]');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        ).set;
        setter.call(input, "cat fact");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    await page.waitForTimeout(600);
    const tryBtn = page.getByRole("button", { name: /Try it/ }).first();
    await tryBtn.click();
    await page.waitForTimeout(500);
    const send = page.getByRole("button", { name: /Send request/ }).first();
    await send.click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(ROOT, "assets", "playground.png") });
    console.log("wrote assets/playground.png");
  } catch (e) {
    console.warn("playground shot skipped:", e.message);
  }
  await page.close();
}

await browser.close();
console.log("done");
