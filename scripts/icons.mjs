// GDark's toolbar/store icon: a big "M" in the whatfont-ext palette, drawn the
// same way as that project's G (bare glyph, no tile, fills a 100×100 box). Renders with the Playwright install from ../vhs-label-maker
// (this repo has no dependencies); pass another path as PLAYWRIGHT if needed.
//   node scripts/icons.mjs            write icons/icon.svg + icons/icon-<size>.png
//   node scripts/icons.mjs --sheet    contact sheet of variants → scripts/sheet.png
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const f = (n) => +n.toFixed(2);

export const BLUE = '#4C8DFF', PALE = '#84C5FF', CORAL = '#FF6B4A';
const SIZES = [16, 32, 48, 64, 96, 128];

// Flat-topped geometric M, filled: legs are rectangles x=l..l+w and the mirror,
// the vee is a chevron of perpendicular thickness w whose top edges start at
// the legs' inner top corners and meet at (50, v). Everything spans t..b.
export function mark({ w = 16, l = 6, t = 6, b = 94, v = 40, vee = BLUE, legs = BLUE, moon = null } = {}) {
  const li = l + w, ri = 100 - li, r = 100 - l;
  const th = Math.atan2(v - t, 50 - li);          // diagonal angle from horizontal
  const d = w / Math.cos(th);                      // vertical offset for thickness w
  const vb = f(v + d), yi = f(t + d);
  const parts = [];
  const poly = (pts, c) => `<path d="M${pts.map((p) => p.join(' ')).join(' L')} Z" fill="${c}"/>`;
  if (vee === legs) {
    parts.push(poly([[l, b], [l, t], [li, t], [50, v], [ri, t], [r, t], [r, b], [ri, b], [ri, yi], [50, vb], [li, yi], [li, b]], legs));
  } else {
    parts.push(poly([[l, b], [l, t], [li, t], [li, b]], legs), poly([[ri, b], [ri, t], [r, t], [r, b]], legs));
    parts.push(poly([[li, t], [50, v], [ri, t], [ri, yi], [50, vb], [li, yi]], vee));
  }
  if (moon) {
    // Coral disc; with `bite` > 0 a smaller circle is cut from its upper-right
    // to make a crescent. bite = offset of the cutter's centre as a fraction of R.
    const { cx, cy, R, bite = 0, br = 0.8 } = moon;
    if (!bite) parts.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="${CORAL}"/>`);
    else {
      const [bx, by, rr] = [cx + R * bite, cy - R * bite, R * br];
      const a = Math.atan2(by - cy, bx - cx), dd = Math.hypot(bx - cx, by - cy);
      const ang = Math.acos((R * R + dd * dd - rr * rr) / (2 * R * dd));
      const p = (t) => [f(cx + R * Math.cos(t)), f(cy + R * Math.sin(t))];
      const [p0, p1] = [p(a - ang), p(a + ang)];
      parts.push(`<path d="M${p0[0]} ${p0[1]} A${R} ${R} 0 1 0 ${p1[0]} ${p1[1]} A${f(rr)} ${f(rr)} 0 0 1 ${p0[0]} ${p0[1]} Z" fill="${CORAL}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n  ${parts.join('\n  ')}\n</svg>\n`;
}

// Envelope M: the original gdark mark's proportions (a 68×48 centreline with
// round joins and caps, vertex 54% of the way down) scaled to fill the box
// edge to edge, with stroke w. No tile, no accent — just the letter.
export function envelope({ w = 14, pad = 4 } = {}) {
  const l = pad + w / 2, r = 100 - l;
  const W = r - l, H = (W * 48) / 68;
  const t = (100 - H) / 2, b = t + H, v = t + 0.54 * H;
  const d = `M${f(l)} ${f(b)} V${f(t)} L50 ${f(v)} L${f(r)} ${f(t)} V${f(b)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n  <path d="${d}" fill="none" stroke="${BLUE}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>\n</svg>\n`;
}

// Colour cut of the envelope M, pieced together like the G: two legs with
// round ends; a left diagonal drawn over the left leg, round-capped at the
// leg's top (like the G's handle over its ring); a right diagonal mirrored
// over the right leg. The diagonals are mitred quadrilaterals meeting on a
// vertical seam at the vertex. Each piece takes a colour or a fade — legs
// top→bottom, diagonals cap→vertex — as a string or an array of stops.
export const VIOLET = '#A66BFF';
export function envelopeColor({ w = 16, pad = 4, id = 'c', legs = [PALE, BLUE], left = CORAL, right = PALE, legsStop = 0.6 } = {}) {
  const l = pad + w / 2, r = 100 - l;
  const W = r - l, H = (W * 48) / 68;
  const t = (100 - H) / 2, b = t + H, v = t + 0.54 * H;
  const pt = (x, y) => `${f(x)} ${f(y)}`;
  const diag = (P) => {
    const dx = 50 - P[0], dy = v - P[1], len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    const h = (w / 2) / (Math.abs(dx) / len);
    const nx = uy, ny = -ux, sgn = ny < 0 ? 1 : -1;
    const top = [P[0] + sgn * nx * w / 2, P[1] + sgn * ny * w / 2];
    const bot = [P[0] - sgn * nx * w / 2, P[1] - sgn * ny * w / 2];
    return `M${pt(...top)} L${pt(50, v - h)} L${pt(50, v + h)} L${pt(...bot)} Z`;
  };
  // fill for a piece: a solid colour, or a user-space gradient from A to B
  const defs = [];
  const fill = (spec, name, A, B, lastStop = 1) => {
    if (typeof spec === 'string') return spec;
    const gid = `${id}-${name}`;
    const stops = spec.map((c, i) => `<stop offset="${f(spec.length === 1 ? 0 : (i / (spec.length - 1)) * lastStop)}" stop-color="${c}"/>`).join('');
    defs.push(`<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${f(A[0])}" y1="${f(A[1])}" x2="${f(B[0])}" y2="${f(B[1])}">${stops}</linearGradient>`);
    return `url(#${gid})`;
  };
  const legFill = fill(legs, 'legs', [0, t], [0, b], legsStop);
  const leftFill = fill(left, 'left', [l, t], [50, v]);
  const rightFill = fill(right, 'right', [r, t], [50, v]);
  const leg = (x) => `<path d="M${pt(x, t)} V${f(b)}" fill="none" stroke="${legFill}" stroke-width="${w}" stroke-linecap="round"/>`;
  const cap = (x, c) => `<circle cx="${f(x)}" cy="${f(t)}" r="${w / 2}" fill="${c}"/>`;
  const body = [
    leg(l), leg(r),
    `<path d="${diag([r, t])}" fill="${rightFill}"/>`, cap(r, rightFill),
    `<path d="${diag([l, t])}" fill="${leftFill}"/>`, cap(l, leftFill),
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n  ` +
    (defs.length ? `<defs>${defs.join('')}</defs>\n  ` : '') + body.join('\n  ') + '\n</svg>\n';
}

export const VARIANTS = {
  'coral-pale':        (id) => envelopeColor({ id }),
  'coral-fade-blue':   (id) => envelopeColor({ id, left: [CORAL, BLUE], right: [PALE, BLUE] }),
  'coral-fade-pale':   (id) => envelopeColor({ id, left: [CORAL, PALE], right: PALE }),
  'coral-fade-only':   (id) => envelopeColor({ id, left: [CORAL, BLUE], right: PALE }),
  'sunset':            (id) => envelopeColor({ id, left: [CORAL, VIOLET, BLUE], right: [PALE, BLUE] }),
  'coral-both':        (id) => envelopeColor({ id, left: [CORAL, BLUE], right: [CORAL, BLUE] }),
  'coral-tip':         (id) => envelopeColor({ id, left: [CORAL, CORAL, BLUE], right: [PALE, BLUE] }),
  'all-blue-fade':     (id) => envelopeColor({ id, left: [PALE, BLUE], right: [PALE, BLUE] }),
  'coral-legs':        (id) => envelopeColor({ id, legs: [CORAL, BLUE], legsStop: 0.7, left: [CORAL, BLUE], right: [PALE, BLUE] }),
  'envelope-16':       () => envelope({ w: 16 }),
};
export const CHOSEN = 'coral-legs';

const pw = process.env.PLAYWRIGHT || path.resolve(root, '../vhs-label-maker/node_modules/playwright');
const { chromium } = createRequire(import.meta.url)(pw);
const at = (s, px) => s.replace('<svg ', `<svg width="${px}" height="${px}" `);

if (process.argv.includes('--sheet')) {
  const DARK = '#202124', LIGHT = '#F2F2F2', GMAIL = '#1c1c21';
  const tb = (s, bg) => `<div style="background:${bg};border-radius:6px;display:flex;gap:14px;align-items:center;padding:0 14px;height:48px">${at(s, 32)}${at(s, 24)}${at(s, 16)}</div>`;
  const ref = fs.readFileSync(path.resolve(root, '../whatfont-ext/icons/src/color.svg'), 'utf8');
  const row = (name, s) => `<div class="row"><div class="lbl">${name}</div>
    <div style="background:#fff;border:1px solid #ddd;border-radius:8px;width:128px;height:128px;display:grid;place-items:center">${at(s, 112)}</div>
    ${tb(s, DARK)}${tb(s, LIGHT)}${tb(s, GMAIL)}
    <div style="background:${DARK};border-radius:6px;display:flex;gap:10px;align-items:center;padding:0 12px;height:48px">${at(ref, 24)}${at(s, 24)}</div></div>`;
  const rows = Object.entries(VARIANTS).map(([k, fn]) => row(k, fn(k))).join('');
  const html = `<body style="margin:0;background:#fff;font:13px/1.3 -apple-system,Helvetica,sans-serif;color:#222"><style>
    .sheet{padding:24px;display:inline-block}.row{display:flex;align-items:center;gap:14px;margin-bottom:12px}.lbl{width:110px;font-weight:600}</style>
    <div class="sheet">${rows}</div></body>`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1700 }, deviceScaleFactor: 2 });
  await page.setContent(html);
  const out = path.join(root, 'scripts/sheet.png');
  await page.locator('.sheet').screenshot({ path: out });
  await browser.close();
  console.log('wrote', out);
} else {
  const svg = VARIANTS[CHOSEN]('m');
  fs.writeFileSync(path.join(root, 'icons/icon.svg'), svg);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 300, height: 300 } });
  for (const s of SIZES) {
    await page.setContent(`<body style="margin:0;background:transparent"><div id="b" style="width:${s}px;height:${s}px">${at(svg, s)}</div></body>`);
    await page.locator('#b').screenshot({ path: path.join(root, 'icons', `icon-${s}.png`), omitBackground: true });
  }
  await browser.close();
  console.log(`wrote icons/icon.svg + ${SIZES.length} PNGs (${CHOSEN})`);
}
