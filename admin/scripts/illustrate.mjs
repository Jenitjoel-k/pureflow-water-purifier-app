// Renders a clean, shaded catalog illustration for every product (no AI
// service or account needed) to admin/public/products/<id>.jpg.
//   node scripts/illustrate.mjs            (skips existing files)
//   node scripts/illustrate.mjs --force    (overwrite)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { catalog } from './catalog.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'products');
fs.mkdirSync(outDir, { recursive: true });
const force = process.argv.includes('--force');

// ------------------------------------------------------------ helpers
const hex = (h) => h.replace('#', '').match(/../g).map((x) => parseInt(x, 16));
const toHex = (rgb) => '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));
const light = (c, t = 0.35) => mix(c, '#ffffff', t);
const dark = (c, t = 0.3) => mix(c, '#000000', t);

let gid = 0;
let defs = [];
// Cylinder-style shading. dir 'x' = vertical object (shade left→right).
function cyl(base, dir = 'x') {
  const id = `g${gid++}`;
  const [x2, y2] = dir === 'x' ? [1, 0] : [0, 1];
  defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">
    <stop offset="0" stop-color="${dark(base, 0.28)}"/><stop offset="0.28" stop-color="${light(base, 0.45)}"/>
    <stop offset="0.55" stop-color="${base}"/><stop offset="1" stop-color="${dark(base, 0.35)}"/></linearGradient>`);
  return `url(#${id})`;
}
// Soft vertical gradient for flat fronts (top lighter).
function face(base, t = 0.12) {
  const id = `g${gid++}`;
  defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${light(base, t + 0.1)}"/><stop offset="1" stop-color="${dark(base, t)}"/></linearGradient>`);
  return `url(#${id})`;
}
function glass(base) {
  const id = `g${gid++}`;
  defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light(base, 0.25)}" stop-opacity="0.95"/><stop offset="0.5" stop-color="${base}" stop-opacity="0.85"/><stop offset="1" stop-color="${dark(base, 0.25)}" stop-opacity="0.95"/></linearGradient>`);
  return `url(#${id})`;
}
const CHROME = '#C9D1D9';
const STEEL = '#B8C0C8';

const shadow = (cx, w, y = 708) => `<ellipse cx="${cx}" cy="${y}" rx="${w / 2}" ry="${Math.max(10, w / 14)}" fill="url(#floor)"/>`;
const gloss = (x, y, w, h, r = 20) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#fff" opacity="0.18"/>`;

// ------------------------------------------------------------ parts
function tap(x, y, color = CHROME, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <rect x="-14" y="-6" width="28" height="22" rx="6" fill="${cyl(color)}"/>
    <path d="M0 14 v18 q0 20 -22 20 h-6" fill="none" stroke="${cyl(color)}" stroke-width="12" stroke-linecap="round"/>
    <rect x="-8" y="-20" width="16" height="16" rx="4" fill="${dark(color, 0.1)}"/></g>`;
}
function pushTap(x, y, color) {
  return `<g><rect x="${x - 16}" y="${y}" width="32" height="26" rx="8" fill="${cyl(color)}"/><rect x="${x - 6}" y="${y + 24}" width="12" height="16" rx="4" fill="${dark(color, 0.25)}"/></g>`;
}
function bottle(cx, bottomY, w = 170, h = 230, color = '#4FA3E0') {
  const x = cx - w / 2;
  const y = bottomY - h;
  return `<g>
    <path d="M${x + 14} ${bottomY} h${w - 28} q14 0 14 -14 v${-(h - 70)} q0 -26 -40 -40 h-${w - 52} q-40 14 -40 40 v${h - 70} q0 14 14 14z" fill="${glass(color)}"/>
    <rect x="${cx - 24}" y="${y - 6}" width="48" height="36" rx="6" fill="${glass(dark(color, 0.1))}"/>
    ${[0.35, 0.6].map((t) => `<rect x="${x + 6}" y="${bottomY - h * t}" width="${w - 12}" height="8" rx="4" fill="${dark(color, 0.15)}" opacity="0.5"/>`).join('')}
    <rect x="${x + 22}" y="${y + 50}" width="18" height="${h - 80}" rx="9" fill="#fff" opacity="0.35"/></g>`;
}
function vCylinder(cx, top, w, h, color, cap = null) {
  const x = cx - w / 2;
  return `<g><rect x="${x}" y="${top}" width="${w}" height="${h}" rx="${w * 0.12}" fill="${cyl(color)}"/>
    <ellipse cx="${cx}" cy="${top + 4}" rx="${w / 2 - 2}" ry="${w * 0.1}" fill="${light(color, 0.3)}"/>
    ${cap ? `<rect x="${x - 4}" y="${top - 8}" width="${w + 8}" height="${h * 0.12}" rx="10" fill="${cyl(cap)}"/><rect x="${x - 4}" y="${top + h - h * 0.1}" width="${w + 8}" height="${h * 0.12}" rx="10" fill="${cyl(cap)}"/>` : ''}</g>`;
}
function hCylinder(left, cy, w, h, color, opts = {}) {
  const { ends = null, label = null, fittings = false } = opts;
  const y = cy - h / 2;
  return `<g>
    ${fittings ? `<rect x="${left - 46}" y="${cy - 12}" width="50" height="24" rx="6" fill="${cyl('#F1F5F9', 'y')}"/><rect x="${left + w - 4}" y="${cy - 12}" width="50" height="24" rx="6" fill="${cyl('#F1F5F9', 'y')}"/>` : ''}
    <rect x="${left}" y="${y}" width="${w}" height="${h}" rx="${h * 0.22}" fill="${cyl(color, 'y')}"/>
    ${ends ? `<rect x="${left - 6}" y="${y - 4}" width="${w * 0.13}" height="${h + 8}" rx="12" fill="${cyl(ends, 'y')}"/><rect x="${left + w - w * 0.13 + 6}" y="${y - 4}" width="${w * 0.13}" height="${h + 8}" rx="12" fill="${cyl(ends, 'y')}"/>` : ''}
    ${label ? `<rect x="${left + w * 0.3}" y="${y}" width="${w * 0.4}" height="${h}" fill="${cyl(label, 'y')}"/><rect x="${left + w * 0.36}" y="${cy - 6}" width="${w * 0.28}" height="5" rx="2" fill="#fff" opacity="0.8"/><rect x="${left + w * 0.36}" y="${cy + 6}" width="${w * 0.18}" height="5" rx="2" fill="#fff" opacity="0.6"/>` : ''}
  </g>`;
}

// ------------------------------------------------------------ products
function wallPurifier({ body = '#F8FAFC', panel = '#0E7490', display = '#38BDF8', w = 300, h = 470, copper = false, big = false, tank = false, steelTank = false }) {
  const x = 400 - w / 2;
  const y = 640 - h;
  const panelFill = copper ? cyl('#B87333') : glass(panel);
  return `${shadow(400, w * 1.1)}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="44" fill="${face(body)}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="44" fill="none" stroke="${dark(body, 0.12)}" stroke-width="2"/>
    <rect x="${x + 26}" y="${y + 30}" width="${w - 52}" height="${h * 0.62}" rx="28" fill="${panelFill}"/>
    ${gloss(x + 34, y + 38, (w - 68) * 0.45, h * 0.6, 24)}
    <rect x="${400 - (big ? 80 : 56)}" y="${y + 60}" width="${big ? 160 : 112}" height="${big ? 110 : 56}" rx="12" fill="#0B1220"/>
    <text x="400" y="${y + (big ? 112 : 96)}" font-family="Segoe UI, Arial" font-weight="700" font-size="${big ? 34 : 26}" fill="${display}" text-anchor="middle">${big ? 'TDS 42' : '45'}</text>
    ${big ? `<text x="400" y="${y + 150}" font-family="Segoe UI, Arial" font-size="16" fill="${light(display, 0.2)}" text-anchor="middle">ppm · Wi-Fi ●</text>` : ''}
    ${[0, 1, 2].map((i) => `<circle cx="${400 - 40 + i * 40}" cy="${y + (big ? 200 : 150)}" r="8" fill="${i === 0 ? display : light(panel, 0.5)}" opacity="0.9"/>`).join('')}
    ${tank ? `<rect x="${x + 40}" y="${y + h * 0.42}" width="${w - 80}" height="${h * 0.18}" rx="14" fill="${steelTank ? cyl(STEEL) : glass('#7DD3FC')}" opacity="0.9"/>` : ''}
    <rect x="${x + 30}" y="${y + h - 60}" width="${w - 60}" height="26" rx="13" fill="${dark(body, 0.1)}"/>
    ${tap(400, y + h * 0.72 + 4)}`;
}

function floorUnit({ body = '#F1F5F9', taps = ['#DC2626', '#2563EB'], bottleOn = true, w = 230, h = 470, accent = '#0E7490', steel = false, door = true }) {
  const x = 400 - w / 2;
  const bodyTop = bottleOn ? 700 - h : 700 - h - 40;
  const fill = steel ? cyl(STEEL) : face(body);
  return `${shadow(400, w * 1.25)}
    ${bottleOn ? bottle(400, bodyTop + 6, w * 0.78, 220) : ''}
    <rect x="${x}" y="${bodyTop}" width="${w}" height="${700 - bodyTop - 8}" rx="24" fill="${fill}"/>
    <rect x="${x + 18}" y="${bodyTop + 30}" width="${w - 36}" height="120" rx="16" fill="${steel ? dark(STEEL, 0.15) : dark(body, 0.06)}"/>
    ${taps.map((c, i) => pushTap(400 - ((taps.length - 1) * 50) / 2 + i * 50, bodyTop + 72, c)).join('')}
    <rect x="${x + 30}" y="${bodyTop + 170}" width="${w - 60}" height="18" rx="9" fill="${dark(body, 0.2)}"/>
    ${door ? `<rect x="${x + 18}" y="${bodyTop + 215}" width="${w - 36}" height="${700 - bodyTop - 250}" rx="14" fill="none" stroke="${dark(body, 0.12)}" stroke-width="3"/><rect x="${x + w - 44}" y="${bodyTop + 260}" width="8" height="60" rx="4" fill="${dark(body, 0.2)}"/>` : ''}
    <circle cx="400" cy="${bodyTop + 16}" r="5" fill="${accent}"/>`;
}

function gravity({ top = '#7DD3FC', bottom = '#38BDF8', lid = '#F8FAFC', w = 260, copperLid = false }) {
  const x = 400 - w / 2;
  return `${shadow(400, w * 1.2)}
    <rect x="${x}" y="420" width="${w}" height="260" rx="34" fill="${glass(bottom)}"/>
    <rect x="${x + 14}" y="470" width="${w - 28}" height="200" rx="26" fill="${light(bottom, 0.25)}" opacity="0.6"/>
    <rect x="${x - 6}" y="400" width="${w + 12}" height="34" rx="16" fill="${face('#F8FAFC')}"/>
    <rect x="${x + 10}" y="170" width="${w - 20}" height="232" rx="30" fill="${glass(top)}"/>
    <rect x="${400 - 22}" y="230" width="44" height="150" rx="20" fill="#F8FAFC" opacity="0.85"/>
    <rect x="${x - 2}" y="140" width="${w + 4}" height="44" rx="22" fill="${copperLid ? cyl('#B87333', 'y') : face(lid)}"/>
    <rect x="${400 - 30}" y="122" width="60" height="24" rx="12" fill="${copperLid ? dark('#B87333', 0.15) : dark(lid, 0.12)}"/>
    ${gloss(x + 24, 190, 26, 190, 13)}${gloss(x + 20, 440, 26, 220, 13)}
    ${tap(x + w - 10, 600, '#E2E8F0', 0.9)}`;
}

function underSink() {
  return `${shadow(400, 560)}
    <rect x="150" y="300" width="380" height="22" rx="8" fill="${cyl('#94A3B8', 'y')}"/>
    ${[0, 1, 2].map((i) => `${vCylinder(200 + i * 110, 322, 84, 260, '#E2E8F0')}<rect x="${163 + i * 110}" y="318" width="74" height="40" rx="10" fill="${face('#F8FAFC')}"/>`).join('')}
    <rect x="300" y="440" width="190" height="34" rx="16" fill="${cyl('#F8FAFC', 'y')}"/>
    ${vCylinder(600, 360, 120, 320, '#F1F5F9')}
    <rect x="585" y="340" width="30" height="26" rx="6" fill="#2563EB"/>
    <path d="M640 140 v-20 q0 -40 -50 -40 q-48 0 -48 50 v30" fill="none" stroke="${cyl(CHROME)}" stroke-width="16" stroke-linecap="round"/>
    <rect x="620" y="140" width="40" height="150" rx="14" fill="${cyl(CHROME)}"/>
    <path d="M640 290 q0 30 -40 40 h-60" fill="none" stroke="#CBD5E1" stroke-width="6"/>`;
}

function commercialCabinet({ taps = 2 }) {
  return `${shadow(400, 420)}
    <rect x="220" y="170" width="360" height="520" rx="22" fill="${cyl(STEEL)}"/>
    <rect x="250" y="200" width="300" height="140" rx="12" fill="${dark(STEEL, 0.08)}"/>
    <circle cx="320" cy="270" r="40" fill="#F8FAFC" stroke="#475569" stroke-width="6"/>
    <path d="M320 270 l22 -18" stroke="#DC2626" stroke-width="5" stroke-linecap="round"/>
    <rect x="390" y="240" width="130" height="60" rx="8" fill="#0B1220"/><text x="455" y="281" font-family="Segoe UI, Arial" font-size="26" font-weight="700" fill="#22D3EE" text-anchor="middle">25 LPH</text>
    ${Array.from({ length: taps }, (_, i) => pushTap(400 - ((taps - 1) * 90) / 2 + i * 90, 380, '#E2E8F0')).join('')}
    <rect x="250" y="470" width="300" height="190" rx="10" fill="none" stroke="${dark(STEEL, 0.2)}" stroke-width="3"/>
    ${[0, 1, 2, 3, 4].map((i) => `<rect x="270" y="${490 + i * 30}" width="260" height="8" rx="4" fill="${dark(STEEL, 0.15)}"/>`).join('')}`;
}

function industrialPlant() {
  return `${shadow(400, 640)}
    <rect x="110" y="250" width="580" height="16" rx="6" fill="${cyl('#64748B', 'y')}"/>
    <rect x="110" y="660" width="580" height="18" rx="6" fill="${cyl('#64748B', 'y')}"/>
    ${[120, 670].map((x) => `<rect x="${x}" y="250" width="14" height="428" fill="${cyl('#64748B')}"/>`).join('')}
    ${[0, 1].map((i) => `${vCylinder(220 + i * 120, 300, 96, 350, '#1D4ED8')}<rect x="${220 + i * 120 - 14}" y="282" width="28" height="22" rx="6" fill="#0F172A"/>`).join('')}
    ${[0, 1].map((i) => hCylinder(440, 330 + i * 90, 220, 60, '#F1F5F9', { ends: '#94A3B8' })).join('')}
    <rect x="460" y="520" width="200" height="120" rx="10" fill="${face('#E2E8F0')}"/>
    <rect x="480" y="540" width="90" height="40" rx="6" fill="#0B1220"/><circle cx="610" cy="560" r="14" fill="#16A34A"/><circle cx="610" cy="605" r="14" fill="#DC2626"/>
    <circle cx="525" cy="612" r="18" fill="#F8FAFC" stroke="#475569" stroke-width="4"/>`;
}

function wholeHouse() {
  return `${shadow(400, 560)}
    <rect x="130" y="190" width="540" height="40" rx="10" fill="${cyl('#94A3B8', 'y')}"/>
    ${[0, 1, 2].map((i) => `<rect x="${170 + i * 170}" y="225" width="120" height="44" rx="12" fill="${face('#1E40AF')}"/>${vCylinder(230 + i * 170, 262, 116, 420, '#2563EB')}<rect x="${178 + i * 170}" y="300" width="104" height="18" rx="8" fill="${dark('#2563EB', 0.25)}"/>`).join('')}
    <rect x="90" y="196" width="50" height="28" rx="6" fill="${cyl(CHROME, 'y')}"/><rect x="660" y="196" width="50" height="28" rx="6" fill="${cyl(CHROME, 'y')}"/>`;
}

function steelCooler({ taps = 2, w = 420, h = 420 }) {
  const x = 400 - w / 2;
  const y = 690 - h;
  return `${shadow(400, w * 1.15)}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${cyl(STEEL)}"/>
    <rect x="${x - 6}" y="${y - 12}" width="${w + 12}" height="28" rx="10" fill="${cyl('#CBD5E1', 'y')}"/>
    <rect x="${x + 20}" y="${y + 40}" width="${w - 40}" height="110" rx="10" fill="${dark(STEEL, 0.1)}"/>
    ${Array.from({ length: taps }, (_, i) => pushTap(x + w / (taps + 1) * (i + 1), y + 160, '#E5E7EB')).join('')}
    <rect x="${x + 30}" y="${y + 230}" width="${w - 60}" height="22" rx="8" fill="${dark(STEEL, 0.25)}"/>
    ${[0, 1, 2, 3].map((i) => `<rect x="${x + 40}" y="${y + 280 + i * 28}" width="${w - 80}" height="8" rx="4" fill="${dark(STEEL, 0.15)}"/>`).join('')}`;
}

function canPump({ electric = false }) {
  return `${shadow(400, 300)}
    ${bottle(400, 690, 260, 380, '#60A5FA')}
    ${electric
    ? `<rect x="350" y="250" width="100" height="70" rx="22" fill="${face('#F8FAFC')}"/><circle cx="400" cy="275" r="12" fill="#0E7490"/><rect x="430" y="262" width="110" height="18" rx="9" fill="${cyl(CHROME, 'y')}"/><path d="M536 271 q24 0 24 24" fill="none" stroke="${cyl(CHROME)}" stroke-width="16" stroke-linecap="round"/>`
    : `<rect x="360" y="232" width="80" height="90" rx="14" fill="${face('#2563EB')}"/><ellipse cx="400" cy="226" rx="70" ry="22" fill="${face('#3B82F6')}"/><rect x="430" y="262" width="100" height="18" rx="9" fill="${cyl('#2563EB', 'y')}"/><path d="M526 271 q24 0 24 26" fill="none" stroke="#2563EB" stroke-width="16" stroke-linecap="round"/>`}`;
}

function crock() {
  return `${shadow(400, 360)}
    <rect x="260" y="560" width="280" height="30" rx="8" fill="${cyl('#92400E', 'y')}"/>
    <rect x="280" y="586" width="22" height="110" fill="${cyl('#92400E')}"/><rect x="498" y="586" width="22" height="110" fill="${cyl('#92400E')}"/>
    <path d="M300 560 q-40 -150 10 -300 h180 q50 150 10 300z" fill="${cyl('#F8FAFC')}"/>
    <rect x="310" y="230" width="180" height="40" rx="18" fill="${face('#F1F5F9')}"/><circle cx="400" cy="222" r="16" fill="#E2E8F0"/>
    ${[[350, 360], [450, 380], [400, 450], [340, 480], [460, 490]].map(([cx, cy]) => `<g fill="#1D4ED8" opacity="0.85">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="${cx + Math.cos(a * Math.PI / 180) * 12}" cy="${cy + Math.sin(a * Math.PI / 180) * 12}" rx="9" ry="6" transform="rotate(${a} ${cx + Math.cos(a * Math.PI / 180) * 12} ${cy + Math.sin(a * Math.PI / 180) * 12})"/>`).join('')}<circle cx="${cx}" cy="${cy}" r="5" fill="#F59E0B"/></g>`).join('')}
    ${tap(330, 500, '#C08A2D', 0.9)}`;
}

function motorPump({ motor = '#1F2937', head = '#F8FAFC', len = 280, dia = 150 }) {
  const left = 400 - len / 2 - 40;
  return `${shadow(400, len + 160)}
    ${hCylinder(left, 520, len, dia, motor)}
    ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${left + 30 + i * (len - 60) / 6}" y="${520 - dia / 2 - 4}" width="10" height="${dia + 8}" rx="4" fill="${dark(motor, 0.2)}"/>`).join('')}
    <ellipse cx="${left + len}" cy="520" rx="40" ry="${dia / 2 + 10}" fill="${cyl(head, 'y')}"/>
    <rect x="${left + len}" y="${520 - dia / 2 - 10}" width="70" height="${dia + 20}" rx="28" fill="${cyl(head, 'y')}"/>
    <rect x="${left + len + 66}" y="480" width="44" height="24" rx="6" fill="${cyl('#F1F5F9', 'y')}"/>
    <rect x="${left + len + 66}" y="536" width="44" height="24" rx="6" fill="${cyl('#F1F5F9', 'y')}"/>
    <rect x="${left + 40}" y="${520 + dia / 2}" width="${len - 80}" height="30" rx="6" fill="${dark(motor, 0.25)}"/>`;
}

function pressureBooster() {
  return `${shadow(400, 520)}
    ${vCylinder(250, 280, 140, 330, '#2563EB')}
    ${motorPump({ motor: '#1D4ED8', head: STEEL, len: 220, dia: 140 }).replace(/<ellipse cx="400" cy="708"[^>]*\/>/, '')}
    <circle cx="250" cy="250" r="44" fill="#F8FAFC" stroke="#334155" stroke-width="8"/><path d="M250 250 l24 -20" stroke="#DC2626" stroke-width="5" stroke-linecap="round"/>
    <rect x="240" y="292" width="20" height="16" fill="#334155"/>`;
}

function submersible() {
  return `${shadow(400, 260)}
    <g transform="rotate(-10 400 420)">
      ${vCylinder(400, 120, 110, 560, STEEL)}
      ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="345" y="${150 + i * 26}" width="110" height="6" fill="${dark(STEEL, 0.2)}"/>`).join('')}
      <rect x="345" y="370" width="110" height="40" fill="${cyl('#334155')}"/>
      <rect x="388" y="90" width="24" height="40" rx="6" fill="${cyl('#475569')}"/>
    </g>`;
}

function monoblock() {
  return `${shadow(400, 560)}
    ${motorPump({ motor: '#1D4ED8', head: '#1E3A8A', len: 300, dia: 180 }).replace(/<ellipse cx="400" cy="708"[^>]*\/>/, '')}
    <circle cx="560" cy="430" r="60" fill="${cyl('#1E3A8A')}"/><rect x="540" y="330" width="40" height="70" rx="8" fill="${cyl('#475569')}"/>
    <rect x="220" y="390" width="70" height="40" rx="8" fill="#0F172A"/>`;
}

function multistage() {
  return `${shadow(400, 320)}
    <rect x="290" y="640" width="220" height="40" rx="10" fill="${cyl('#475569', 'y')}"/>
    ${vCylinder(400, 360, 150, 290, STEEL)}
    ${[0, 1, 2, 3, 4].map((i) => `<rect x="325" y="${390 + i * 50}" width="150" height="8" fill="${dark(STEEL, 0.2)}"/>`).join('')}
    <rect x="310" y="330" width="180" height="34" rx="8" fill="${cyl('#64748B', 'y')}"/>
    ${vCylinder(400, 110, 170, 230, '#1D4ED8')}
    <rect x="215" y="600" width="80" height="40" rx="8" fill="${cyl(STEEL, 'y')}"/><rect x="505" y="600" width="80" height="40" rx="8" fill="${cyl(STEEL, 'y')}"/>`;
}

function dosing() {
  return `${shadow(400, 380)}
    <rect x="260" y="330" width="280" height="300" rx="26" fill="${face('#E5E7EB')}"/>
    <rect x="290" y="360" width="150" height="70" rx="10" fill="#0B1220"/><text x="365" y="405" font-family="Segoe UI, Arial" font-size="26" font-weight="700" fill="#4ADE80" text-anchor="middle">6.0 L/h</text>
    <circle cx="490" cy="400" r="30" fill="${cyl('#334155')}"/><rect x="487" y="374" width="6" height="22" rx="3" fill="#F8FAFC"/>
    <circle cx="400" cy="530" r="70" fill="${cyl('#6B7280')}"/><circle cx="400" cy="530" r="34" fill="${cyl('#E5E7EB')}"/>
    <path d="M330 530 q-100 0 -110 -170" fill="none" stroke="#CBD5E1" stroke-width="12" opacity="0.9"/>
    <path d="M470 530 q120 10 120 -170" fill="none" stroke="#CBD5E1" stroke-width="12" opacity="0.9"/>`;
}

function solarPump() {
  return `${shadow(400, 440)}
    ${hCylinder(230, 520, 260, 130, '#111827')}
    <rect x="300" y="420" width="120" height="40" rx="10" fill="${face('#374151')}"/><circle cx="330" cy="440" r="8" fill="#F59E0B"/>
    <rect x="480" y="450" width="110" height="140" rx="30" fill="${cyl(STEEL, 'y')}"/>
    <rect x="585" y="470" width="50" height="26" rx="6" fill="${cyl('#F1F5F9', 'y')}"/>
    <path d="M300 420 q-40 -120 -150 -110" fill="none" stroke="#DC2626" stroke-width="7"/><path d="M320 420 q-30 -100 -170 -80" fill="none" stroke="#111827" stroke-width="7"/>`;
}

function membrane({ wrap = '#3B82F6', ring = '#2563EB', len = 470 }) {
  return `${shadow(400, len)}
    ${hCylinder(400 - len / 2, 460, len, 150, '#F8FAFC', { ends: '#E2E8F0' })}
    ${[0.2, 0.4, 0.6, 0.8].map((t) => `<rect x="${400 - len / 2 + len * t}" y="385" width="10" height="150" fill="${wrap}" opacity="${wrap === '#3B82F6' ? 0.25 : 0.7}"/>`).join('')}
    <rect x="${400 + len / 2 - 70}" y="380" width="22" height="160" rx="8" fill="${ring}"/>
    <rect x="${400 - len / 2 - 40}" y="448" width="44" height="24" rx="6" fill="${cyl('#CBD5E1', 'y')}"/>`;
}

function cartridgePack(n = 5, color = '#F8FAFC', ends = '#E2E8F0') {
  const w = 96;
  const gap = 18;
  const total = n * w + (n - 1) * gap;
  return `${shadow(400, total + 40)}
    ${Array.from({ length: n }, (_, i) => vCylinder(400 - total / 2 + w / 2 + i * (w + gap), 260 + (i % 2) * 20, w, 400 - (i % 2) * 20, color, ends)).join('')}`;
}

function inlineCapsule({ body = '#F8FAFC', label = '#0EA5E9' }) {
  return `${shadow(400, 520)} ${hCylinder(190, 450, 420, 120, body, { ends: '#E2E8F0', label, fittings: true })}`;
}

function serviceKit() {
  return `${shadow(400, 600)}
    ${vCylinder(190, 230, 100, 400, '#F8FAFC', '#E2E8F0')}
    ${vCylinder(320, 230, 100, 400, '#1F2937', '#F1F5F9')}
    ${hCylinder(430, 330, 230, 70, '#F8FAFC', { ends: '#E2E8F0', label: '#0EA5E9' })}
    ${hCylinder(430, 450, 230, 70, '#F8FAFC', { ends: '#E2E8F0', label: '#22C55E' })}
    ${hCylinder(430, 570, 230, 70, '#F8FAFC', { ends: '#E2E8F0', label: '#7DD3FC' })}`;
}

function smps() {
  return `${shadow(400, 420)}
    <rect x="230" y="380" width="300" height="160" rx="22" fill="${face('#1F2937')}"/>
    <rect x="260" y="410" width="120" height="16" rx="8" fill="#374151"/><circle cx="490" cy="420" r="8" fill="#22C55E"/>
    ${[0, 1, 2, 3].map((i) => `<rect x="260" y="${450 + i * 18}" width="230" height="6" rx="3" fill="#374151"/>`).join('')}
    <path d="M530 470 q120 0 110 120 q-10 80 -150 70" fill="none" stroke="#111827" stroke-width="12" stroke-linecap="round"/>
    <rect x="460" y="645" width="50" height="28" rx="8" fill="${cyl('#111827', 'y')}"/>
    <path d="M230 470 q-80 0 -80 -90" fill="none" stroke="#111827" stroke-width="12" stroke-linecap="round"/>`;
}

function solenoid() {
  return `${shadow(400, 420)}
    ${hCylinder(230, 540, 340, 90, '#F8FAFC', { fittings: true })}
    <rect x="330" y="330" width="140" height="170" rx="24" fill="${face('#111827')}"/>
    <rect x="345" y="350" width="110" height="20" rx="8" fill="#374151"/>
    <path d="M400 330 q0 -60 80 -70" fill="none" stroke="#DC2626" stroke-width="7"/><path d="M410 330 q0 -50 80 -50" fill="none" stroke="#111827" stroke-width="7"/>`;
}

function floatValve() {
  return `${shadow(400, 440)}
    <rect x="200" y="420" width="140" height="90" rx="20" fill="${face('#F8FAFC')}"/>
    <rect x="150" y="452" width="56" height="26" rx="6" fill="${cyl('#F1F5F9', 'y')}"/>
    <rect x="330" y="455" width="230" height="16" rx="8" fill="${cyl('#E2E8F0', 'y')}"/>
    <circle cx="590" cy="463" r="70" fill="${cyl('#F8FAFC')}"/>${gloss(560, 420, 26, 40, 13)}`;
}

function uvLamp() {
  return `${shadow(400, 600)}
    <rect x="120" y="360" width="520" height="56" rx="28" fill="${glass('#E0F2FE')}"/>
    <rect x="140" y="378" width="480" height="20" rx="10" fill="#A5F3FC" opacity="0.8"/>
    <rect x="610" y="352" width="70" height="72" rx="14" fill="${face('#F8FAFC')}"/>
    <rect x="220" y="510" width="260" height="110" rx="16" fill="${face('#E5E7EB')}"/>
    <circle cx="440" cy="540" r="8" fill="#22C55E"/>
    <path d="M680 388 q60 0 50 120 q-10 60 -250 60" fill="none" stroke="#111827" stroke-width="8"/>`;
}

function faucet() {
  return `${shadow(400, 260)}
    <rect x="320" y="640" width="160" height="40" rx="14" fill="${cyl(CHROME, 'y')}"/>
    <rect x="370" y="250" width="60" height="400" rx="22" fill="${cyl(CHROME)}"/>
    <path d="M400 260 q0 -150 140 -150 q120 0 120 130 v70" fill="none" stroke="${cyl(CHROME, 'y')}" stroke-width="40" stroke-linecap="round"/>
    <rect x="300" y="470" width="80" height="26" rx="10" fill="${cyl(CHROME, 'y')}"/>`;
}

function pressureTank() {
  return `${shadow(400, 320)}
    <rect x="270" y="210" width="260" height="470" rx="120" fill="${cyl('#F8FAFC')}"/>
    <rect x="270" y="420" width="260" height="10" fill="#E2E8F0"/>
    <rect x="370" y="160" width="60" height="60" rx="10" fill="${cyl('#2563EB')}"/>
    <rect x="430" y="176" width="60" height="26" rx="6" fill="${cyl('#F1F5F9', 'y')}"/>
    ${gloss(300, 250, 34, 380, 17)}`;
}

function tdsMeter() {
  return `${shadow(400, 220)}
    <g transform="rotate(-18 400 420)">
      <rect x="330" y="140" width="140" height="520" rx="50" fill="${face('#F8FAFC')}"/>
      <rect x="330" y="140" width="140" height="70" rx="30" fill="${face('#0E7490')}"/>
      <rect x="352" y="260" width="96" height="70" rx="8" fill="#BEF264"/>
      <text x="400" y="308" font-family="Consolas, monospace" font-size="34" font-weight="700" fill="#1A2E05" text-anchor="middle">142</text>
      <circle cx="375" cy="380" r="16" fill="#0E7490"/><circle cx="425" cy="380" r="16" fill="#CBD5E1"/>
      <rect x="370" y="640" width="60" height="60" rx="12" fill="${cyl('#94A3B8')}"/>
    </g>`;
}

function pipeKit() {
  return `${shadow(400, 560)}
    ${[0, 1, 2, 3, 4].map((i) => `<ellipse cx="320" cy="${470 - i * 6}" rx="${170 - i * 6}" ry="${120 - i * 4}" fill="none" stroke="${i % 2 ? '#E2E8F0' : '#F8FAFC'}" stroke-width="18"/>`).join('')}
    <ellipse cx="320" cy="470" rx="170" ry="120" fill="none" stroke="#CBD5E1" stroke-width="2"/>
    ${[[560, 380], [620, 470], [560, 560], [650, 610]].map(([x, y], i) => `<g transform="rotate(${i * 35} ${x} ${y})"><rect x="${x - 40}" y="${y - 14}" width="80" height="28" rx="8" fill="${cyl('#F8FAFC', 'y')}"/>${i % 2 ? `<rect x="${x - 14}" y="${y - 50}" width="28" height="40" rx="8" fill="${cyl('#F8FAFC')}"/>` : ''}</g>`).join('')}`;
}

function filterHousing() {
  return `${shadow(400, 340)}
    <rect x="290" y="170" width="220" height="60" rx="14" fill="${face('#F8FAFC')}"/>
    <rect x="230" y="186" width="66" height="28" rx="6" fill="${cyl('#E2E8F0', 'y')}"/><rect x="504" y="186" width="66" height="28" rx="6" fill="${cyl('#E2E8F0', 'y')}"/>
    <rect x="305" y="228" width="190" height="430" rx="30" fill="${glass('#E0F2FE')}"/>
    ${vCylinder(400, 260, 110, 370, '#F8FAFC')}
    <path d="M560 640 l120 -240 a40 40 0 1 1 30 20 l-110 230z" fill="${face('#2563EB')}"/>`;
}

function flowRestrictor() {
  return `${shadow(400, 520)} ${hCylinder(230, 450, 340, 70, '#F8FAFC', { fittings: true, label: '#F97316' })}
    <path d="M190 450 q-80 0 -80 -100" fill="none" stroke="#E2E8F0" stroke-width="14"/><path d="M610 450 q80 0 80 -100" fill="none" stroke="#E2E8F0" stroke-width="14"/>`;
}

const ART = {
  'pur-elite-ro-uv-uf': () => wallPurifier({ body: '#F8FAFC', panel: '#111827', display: '#38BDF8' }),
  'pur-aqua-max-ro-copper': () => wallPurifier({ body: '#F8FAFC', copper: true, display: '#FBBF24' }),
  'pur-nova-ro-alkaline': () => wallPurifier({ body: '#1F2937', panel: '#0B1220', display: '#22D3EE' }),
  'pur-classic-ro-7l': () => wallPurifier({ body: '#F8FAFC', panel: '#7DD3FC', display: '#0EA5E9', tank: true }),
  'pur-smart-iot-ro': () => wallPurifier({ body: '#6B7280', panel: '#374151', display: '#4ADE80', big: true, tank: true, steelTank: true }),
  'pur-uv-only-gravity': () => wallPurifier({ body: '#F8FAFC', panel: '#BAE6FD', display: '#2563EB', w: 250, h: 360 }),
  'pur-gravity-classic-23l': () => gravity({}),
  'pur-under-sink-ro': () => underSink(),
  'pur-countertop-mini': () => wallPurifier({ body: '#F8FAFC', panel: '#E0F2FE', display: '#0284C7', w: 340, h: 330 }),
  'pur-commercial-25lph': () => commercialCabinet({ taps: 2 }),
  'pur-industrial-100lph': () => industrialPlant(),
  'pur-hot-cold-ro': () => floorUnit({ body: '#F1F5F9', bottleOn: false, taps: ['#DC2626', '#2563EB'], door: true }),
  'pur-copper-gravity': () => gravity({ top: '#BAE6FD', bottom: '#93C5FD', copperLid: true }),
  'pur-whole-house': () => wholeHouse(),
  'dis-hot-cold-floor': () => floorUnit({ body: '#F8FAFC', taps: ['#DC2626', '#2563EB', '#94A3B8'] }),
  'dis-tabletop-hot-normal': () => floorUnit({ body: '#F8FAFC', taps: ['#DC2626', '#2563EB'], h: 290, w: 220, door: false }),
  'dis-bottom-load': () => floorUnit({ body: '#1F2937', bottleOn: false, taps: ['#DC2626', '#2563EB', '#94A3B8'], accent: '#38BDF8' }),
  'dis-steel-cooler-80l': () => steelCooler({ taps: 2, w: 380, h: 400 }),
  'dis-steel-cooler-150l': () => steelCooler({ taps: 4, w: 520, h: 440 }),
  'dis-manual-pump': () => canPump({ electric: false }),
  'dis-electric-bottle-pump': () => canPump({ electric: true }),
  'dis-ceramic-crock': () => crock(),
  'pmp-ro-booster-100': () => motorPump({ motor: '#111827', head: '#F8FAFC' }),
  'pmp-ro-booster-75': () => motorPump({ motor: '#4B5563', head: '#3B82F6', len: 240, dia: 130 }),
  'pmp-pressure-booster-home': () => pressureBooster(),
  'pmp-submersible-1hp': () => submersible(),
  'pmp-monoblock-1hp': () => monoblock(),
  'pmp-hp-commercial-ro': () => multistage(),
  'pmp-solar-dc': () => solarPump(),
  'pmp-dosing': () => dosing(),
  'flt-ro-membrane-80': () => membrane({}),
  'flt-ro-membrane-100': () => membrane({ wrap: '#2563EB', ring: '#1D4ED8', len: 520 }),
  'flt-sediment-10': () => cartridgePack(5),
  'flt-carbon-block': () => cartridgePack(1, '#1F2937', '#F1F5F9'),
  'flt-inline-post-carbon': () => inlineCapsule({ label: '#111827' }),
  'flt-inline-sediment': () => inlineCapsule({ label: '#94A3B8' }),
  'flt-uf-membrane': () => inlineCapsule({ label: '#0EA5E9' }),
  'flt-mineral-cartridge': () => inlineCapsule({ label: '#7DD3FC' }),
  'flt-alkaline-cartridge': () => inlineCapsule({ label: '#22C55E' }),
  'flt-copper-cartridge': () => inlineCapsule({ body: '#B87333', label: '#7C2D12' }),
  'flt-iron-removal-20': () => cartridgePack(1, '#2563EB', '#1E3A8A'),
  'flt-service-kit': () => serviceKit(),
  'spr-smps-24v': () => smps(),
  'spr-solenoid-valve': () => solenoid(),
  'spr-float-valve': () => floatValve(),
  'spr-uv-lamp-11w': () => uvLamp(),
  'spr-ro-faucet-ss': () => faucet(),
  'spr-pressure-tank-11l': () => pressureTank(),
  'spr-tds-meter': () => tdsMeter(),
  'spr-pipe-fittings-kit': () => pipeKit(),
  'spr-filter-housing-10': () => filterHousing(),
  'spr-flow-restrictor': () => flowRestrictor(),
};

function render(id) {
  gid = 0;
  defs = [];
  const body = ART[id]();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs>
    <radialGradient id="bg" cx="0.5" cy="0.42" r="0.75"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#EEF3F7"/></radialGradient>
    <radialGradient id="floor"><stop offset="0" stop-color="#0F172A" stop-opacity="0.22"/><stop offset="1" stop-color="#0F172A" stop-opacity="0"/></radialGradient>
    ${defs.join('\n')}
  </defs>
  ${body}
</svg>`;
}

let made = 0;
for (const p of catalog) {
  if (!ART[p.id]) {
    console.log(`  no art for ${p.id}`);
    continue;
  }
  const file = path.join(outDir, `${p.id}.jpg`);
  if (fs.existsSync(file) && !force) continue;
  // Crop to the drawing, then centre it at ~78% of a white square for consistent framing.
  const art = await sharp(Buffer.from(render(p.id))).trim().png().toBuffer();
  const fitted = await sharp(art).resize(624, 624, { fit: 'inside' }).toBuffer();
  await sharp({ create: { width: 800, height: 800, channels: 3, background: '#ffffff' } })
    .composite([{ input: fitted, gravity: 'center' }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(file);
  made++;
}
console.log(`Rendered ${made} illustration(s) → ${outDir}`);
