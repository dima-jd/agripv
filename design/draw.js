// SVG drawings for the concept designs: plan view on the real field outline, and a dimensioned cross-section.
// Concept drawings for research, not for construction.
import { MODULE } from './layout.js';

const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const f1 = n => (Math.round(n * 10) / 10).toString();

/** Plan view. local: { rings } in metres; L: layout result. */
export function planSVG(local, L, t) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of local.rings) for (const [x, y] of p[0]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const pad = Math.max(x1 - x0, y1 - y0) * 0.08 + 20;
  const W = x1 - x0 + 2 * pad, H = y1 - y0 + 2 * pad;
  const P = ([x, y]) => `${f1(x - x0 + pad)},${f1(y1 - y + pad)}`; // north up
  const path = rings => rings.map(r => 'M' + r.map(P).join('L') + 'Z').join('');
  const field = local.rings.map(p => `<path d="${path(p)}" class="d-field" fill-rule="evenodd"/>`).join('');
  const rows = L.variant === 'C' // vertical rows are thinner than a pixel at plan scale: draw them as lines
    ? L.rows.map(r => `<path d="M${r.line.map(P).join('L')}" class="d-row-line"/>`).join('')
    : L.rows.map(r => `<path d="M${r.poly.map(P).join('L')}Z" class="d-row"/>`).join('');
  const plot = L.controlPlot ? `<path d="M${L.controlPlot.poly.map(P).join('L')}Z" class="d-plot"/>` : '';
  const padRect = L.pad ? `<path d="M${L.pad.poly.map(P).join('L')}Z" class="d-pad"/>` : '';
  // scale bar: a round length about a fifth of the width
  const nice = [10, 20, 25, 50, 100, 200, 250, 500, 1000].find(n => n >= (x1 - x0) / 6) ?? 1000;
  const sb = `<g class="d-scale" transform="translate(${f1(pad)},${f1(H - pad / 2)})"><rect width="${nice / 2}" height="4"/><rect x="${nice / 2}" width="${nice / 2}" height="4" class="alt"/><text x="0" y="-4">0</text><text x="${nice}" y="-4" text-anchor="end">${nice}${t(' m', ' מ׳')}</text></g>`;
  const s = Math.max(W, H) / 40;
  const north = `<g class="d-north" transform="translate(${f1(W - pad / 1.6)},${f1(pad / 1.2)})"><path d="M0,${-s * 1.4}L${s * 0.6},${s * 0.6}L0,${s * 0.2}L${-s * 0.6},${s * 0.6}Z"/><text y="${s * 1.9}" text-anchor="middle">N</text></g>`;
  // pitch dimension between two neighbouring rows near the middle
  let dim = '';
  const a = L.rows[Math.floor(L.rows.length / 2)], b = a && L.rows.find(r => Math.abs(r.w - a.w - L.pitch) < 0.01);
  if (a && b) {
    const cu = (Math.max(a.u0, b.u0) + Math.min(a.u1, b.u1)) / 2, pa = L.frameToLocal([cu, a.w]), pb = L.frameToLocal([cu, b.w]);
    const [tx, ty] = P(pb).split(',');
    dim = `<g class="d-dim"><path d="M${P(pa)}L${P(pb)}"/><text x="${tx}" y="${ty}" dx="4" dy="-4">${e(t('pitch', 'מרווח'))} ${f1(L.pitch)}${t(' m', ' מ׳')}</text></g>`;
  }
  return `<svg class="d-plan" viewBox="0 0 ${f1(W)} ${f1(H)}" role="img" aria-label="${e(t('Plan view of the concept layout on the field', 'מבט על של פריסת הקונספט על החלקה'))}" preserveAspectRatio="xMidYMid meet" style="--s:${f1(Math.max(W, H) / 600)}">${field}${rows}${plot}${padRect}${dim}${north}${sb}</svg>`;
}

/** Cross-section with dimensions, two rows wide. */
export function sectionSVG(v, L, t) {
  const sec = L.section, pitch = L.pitch;
  const W = pitch * 2 + 22, top = Math.max(sec.top, 5) + 2.2;
  const sx = 600 / W, sy = sx;                   // true scale both ways
  const X = m => f1((m + 10) * sx), Y = m => f1((top - m) * sy);
  const ground = `<path class="s-ground" d="M0,${Y(0)}H${f1(W * sx)}"/>`;
  let rows = '';
  for (let i = 0; i < 2; i++) {
    const cx = i * pitch + pitch / 2 - 2;
    if (v.key === 'A') {
      const slope = v.modulesUp * MODULE.long, dx = sec.depth / 2, x0 = cx - dx, x1 = cx + dx;
      rows += `<path class="s-post" d="M${X(x0 + 0.3)},${Y(0)}V${Y(sec.lowerEdge)}M${X(x1 - 0.3)},${Y(0)}V${Y(sec.top)}"/><path class="s-panel" d="M${X(x0)},${Y(sec.lowerEdge)}L${X(x1)},${Y(sec.top)}"/>`;
    } else if (v.key === 'B') {
      const half = MODULE.long / 2, a = v.maxRotation * Math.PI / 180;
      rows += `<path class="s-post" d="M${X(cx)},${Y(0)}V${Y(sec.axis)}"/><path class="s-panel" d="M${X(cx - half)},${Y(sec.axis)}L${X(cx + half)},${Y(sec.axis)}"/><path class="s-ghost" d="M${X(cx - half * Math.cos(a))},${Y(sec.axis - half * Math.sin(a))}L${X(cx + half * Math.cos(a))},${Y(sec.axis + half * Math.sin(a))}"/><circle class="s-axis" cx="${X(cx)}" cy="${Y(sec.axis)}" r="3"/>`;
    } else {
      rows += `<path class="s-post" d="M${X(cx)},${Y(0)}V${Y(sec.top)}"/><path class="s-panel" d="M${X(cx)},${Y(sec.lowerEdge)}V${Y(sec.top)}"/>`;
    }
  }
  // machinery: a tractor outline (about 2.5 m wide, 3 m high) under A, between rows for B and C
  const tx = v.key === 'A' ? pitch / 2 - 2 - 1.25 : pitch - 2 - 1.25;
  const tractor = `<g class="s-tractor"><rect x="${X(tx)}" y="${Y(3)}" width="${f1(2.5 * sx)}" height="${f1(2.2 * sy)}" rx="3"/><circle cx="${X(tx + 0.6)}" cy="${Y(0.7)}" r="${f1(0.7 * sx)}"/><circle cx="${X(tx + 1.9)}" cy="${Y(0.5)}" r="${f1(0.5 * sx)}"/></g>`;
  // dimensions
  const c0 = pitch / 2 - 2, c1 = c0 + pitch;
  const vdim = (x, h0, h1, label, side = 1) => `<g class="s-dim"><path d="M${X(x)},${Y(h0)}V${Y(h1)}M${X(x - 0.25)},${Y(h0)}H${X(x + 0.25)}M${X(x - 0.25)},${Y(h1)}H${X(x + 0.25)}"/><text x="${X(x)}" y="${Y((h0 + h1) / 2)}" dx="${side * 6}" text-anchor="${side > 0 ? 'start' : 'end'}">${e(label)}</text></g>`;
  const hdim = `<g class="s-dim"><path d="M${X(c0)},${Y(top - 1)}H${X(c1)}M${X(c0)},${Y(top - 1.25)}V${Y(top - 0.75)}M${X(c1)},${Y(top - 1.25)}V${Y(top - 0.75)}"/><text x="${X((c0 + c1) / 2)}" y="${Y(top - 1)}" dy="-5" text-anchor="middle">${e(t('row pitch', 'מרווח שורות'))} ${f1(pitch)}${t(' m', ' מ׳')}</text></g>`;
  const half = v.key === 'A' ? sec.depth / 2 : v.key === 'B' ? MODULE.long / 2 : 0;
  const dims = hdim
    + (v.key === 'B' ? vdim(c0 - half - 0.8, 0, sec.axis, `${t('axis', 'ציר')} ${f1(sec.axis)}${t(' m', ' מ׳')}`, -1) : vdim(c0 - half - 0.8, 0, sec.lowerEdge, `${t('lower edge', 'קצה תחתון')} ${f1(sec.lowerEdge)}${t(' m', ' מ׳')}`, -1))
    + vdim(c1 + half + 0.8, 0, sec.top, `${t('top', 'עליון')} ${f1(sec.top)}${t(' m', ' מ׳')}`);
  const H = (top + 0.6) * sy;
  return `<svg class="d-section" viewBox="0 0 ${f1(W * sx)} ${f1(H)}" role="img" aria-label="${e(t('Cross-section with heights and row pitch', 'חתך עם גבהים ומרווח שורות'))}">${ground}${tractor}${rows}${dims}</svg>`;
}
