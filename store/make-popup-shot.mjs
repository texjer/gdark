// Renders the popup (popup.html with chrome.storage stubbed) at 2× and
// composes store/screenshot-2-modes.png (1280×800) with a caption under it.
// Uses the Playwright install from ../vhs-label-maker like scripts/icons.mjs.
//   node store/make-popup-shot.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = process.env.PLAYWRIGHT || path.resolve(root, '../vhs-label-maker/node_modules/playwright');
const { chromium } = createRequire(import.meta.url)(pw);

const out = path.join(root, 'store', 'screenshot-2-modes.png');
const popupPng = path.join(root, 'store', '_popup.png');

// Dark selected by hand at 3 pm while the 9 pm–6 am schedule is on, so the
// override note shows — that's the feature the caption talks about.
const stored = {
  dark: true, auto: 'schedule', start: '21:00', end: '06:00',
  override: { value: true, base: false, at: Date.parse('2026-09-05T14:55:00') },
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 500 }, deviceScaleFactor: 1.8, colorScheme: 'dark' });
await page.clock.setFixedTime(new Date('2026-09-05T15:00:00'));
await page.addInitScript((stored) => {
  Object.defineProperty(globalThis, 'chrome', {
    value: { storage: { sync: { get: (_k, cb) => cb({ ...stored }), set() {}, remove() {} } } },
    configurable: true,
  });
}, stored);
await page.goto('file://' + path.join(root, 'popup.html'));
await page.waitForFunction(() => document.getElementById('note')?.textContent.includes('resumes'));
await page.locator('body').screenshot({ path: popupPng });
await browser.close();

execFileSync('magick', [
  popupPng, '-bordercolor', '#3c3f43', '-border', '1', '-write', 'mpr:popup', '+delete',
  '-size', '1280x800', 'xc:#121216',
  'mpr:popup', '-gravity', 'north', '-geometry', '+0+44', '-composite',
  '-font', 'Helvetica', '-pointsize', '30', '-fill', '#e3e3e8', '-gravity', 'north',
  '-annotate', '+0+700', 'Light or dark in one click. A schedule or your system theme can drive it.',
  '-font', 'Helvetica', '-pointsize', '20', '-fill', '#a2a2ac',
  '-annotate', '+0+746', 'Flip it by hand any time — the schedule takes back over at its next change.',
  '-alpha', 'off', '-depth', '8', 'PNG24:' + out, // the Chrome store wants 24-bit PNG, no alpha
]);
fs.rmSync(popupPng);
console.log('wrote', out);
