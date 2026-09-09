// Chrome Web Store promo tiles: store/promo-small.png (440×280) and
// store/promo-marquee.png (1400×560), 24-bit PNG without alpha as the store
// requires. Rendered from inline HTML with the project's icon SVG.
//   node store/make-tiles.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = process.env.PLAYWRIGHT || path.resolve(root, '../vhs-label-maker/node_modules/playwright');
const { chromium } = createRequire(import.meta.url)(pw);

const ICON = 'icons/icon.svg';
const BG = '#202124', INK = '#ffffff', MUTED = '#a3a3a8', ACCENT = '#FF6B4A';
const TITLE = 'GDark';
const SUBTITLE = 'Dark mode for Gmail & Chat';
const TAGLINE = 'Darken the white areas of Gmail';

const icon = fs.readFileSync(path.join(root, ICON), 'utf8');
const TILES = [
  { name: 'promo-small', w: 440, h: 280 },
  { name: 'promo-marquee', w: 1400, h: 560 },
];

function html({ w, h }) {
  const s = h / 280; // everything scales off the small tile
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden}
    body{display:flex;align-items:center;justify-content:center;gap:${Math.round(w > 1000 ? 34 * s : 24 * s)}px;padding:0 ${Math.round(w > 1000 ? 38 * s : 26 * s)}px;box-sizing:border-box;
      background:${BG};color:${INK};font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
    .icon{flex:none;width:${Math.round(w > 1000 ? 150 * s : 124 * s)}px;height:${Math.round(w > 1000 ? 150 * s : 124 * s)}px}
    .icon svg{width:100%;height:100%;display:block}
    .text{display:flex;flex-direction:column;gap:${Math.round(6 * s)}px;min-width:0}
    h1{margin:0;font-size:${Math.round(44 * s)}px;line-height:1.05;font-weight:700;letter-spacing:-.02em}
    h2{margin:0;font-size:${Math.round(w > 1000 ? 22 * s : 20 * s)}px;line-height:1.2;font-weight:600;color:${INK};white-space:nowrap}
    h2 .accent{color:${ACCENT}}
    p{margin:${Math.round(4 * s)}px 0 0;font-size:${Math.round(w > 1000 ? 15 * s : 14 * s)}px;line-height:1.35;color:${MUTED};white-space:nowrap}
  </style></head><body>
    <div class="icon">${icon}</div>
    <div class="text"><h1>${TITLE}</h1><h2>${SUBTITLE}</h2><p>${TAGLINE}</p></div>
  </body></html>`;
}

const browser = await chromium.launch();
for (const t of TILES) {
  const page = await browser.newPage({ viewport: { width: t.w, height: t.h }, deviceScaleFactor: 1 });
  await page.setContent(html(t));
  await page.waitForTimeout(200);
  const tmp = path.join(root, 'store', `_${t.name}.png`);
  const out = path.join(root, 'store', `${t.name}.png`);
  await page.screenshot({ path: tmp });
  execFileSync('magick', [tmp, '-alpha', 'off', '-depth', '8', 'PNG24:' + out]);
  fs.rmSync(tmp);
  await page.close();
  console.log('wrote', out);
}
await browser.close();
