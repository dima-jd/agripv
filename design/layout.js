// Concept layout engine for agrivoltaic design variants. Pure geometry: no DOM, testable in Node.
// Concept for research, not for construction. Rules from TAMA 1/24 (approved 15.2.26):
//   panel cover <= 30% of the cultivated area (s. 3.6.2.1; cover = horizontal projection, trackers at their flattest);
//   field crops: lowest panel edge >= 1.5 m (s. 3.6.1.2); other crops: mounting axis >= 4.5 m (s. 3.6.1.1);
//   vertical systems exempt from both (s. 3.6.1.3); height <= 7 m, trackers may move to 8 m (s. 4.3.6.4);
//   control plot >= 2% of the cultivated area and >= 1 dunam (s. 3.2.5).
// Cultivated area excludes operational structures, perimeter roads and the control plot (explanatory notes).

export const MODULE = { long: 2.382, short: 1.134, wp: 600 }; // generic ~600 Wp bifacial class, metres
export const SETBACK = 5;        // perimeter access strip, m
export const PAD = { w: 12, d: 6 }; // equipment pad (inverters, transformer, monitoring), m
export const COVER_MAX = 0.30;

const rad = d => d * Math.PI / 180;

/** Variant definitions (defaults; parameters can be varied on the page within the plan's limits). */
export const VARIANTS = {
  A: {
    key: 'A', rows: 'EW', name: ['Elevated fixed tilt', 'מבנה מוגבה בהטיה קבועה'],
    tilt: 25, modulesUp: 2, orientation: 'portrait', lowerEdge: 4.5, postSpacing: 6.8,
    describe: ['South-facing tables, two modules high, raised so machinery works underneath.', 'שולחנות פאנלים הפונים דרומה, שני פאנלים לגובה, מוגבהים כך שמיכון חקלאי עובד מתחתם.'],
  },
  B: {
    key: 'B', rows: 'NS', name: ['Single-axis tracker, high', 'עוקב חד-צירי גבוה'],
    axisHeight: 4.5, maxRotation: 55, orientation: 'portrait', postSpacing: 7.0,
    describe: ['One module wide, turning east to west on a north–south axis 4.5 m above ground, above orchard or crop rows.', 'פאנל אחד ברוחב, מסתובב ממזרח למערב על ציר צפון–דרום בגובה 4.5 מ׳, מעל שורות מטע או גידול.'],
  },
  C: {
    key: 'C', rows: 'NS', name: ['Vertical bifacial rows', 'שורות אנכיות דו-פניות'],
    lowerEdge: 0.8, modulesUp: 2, orientation: 'landscape', footprint: 0.3, pitch: 10, postSpacing: 4.8,
    describe: ['Vertical two-sided modules in north–south rows, facing east and west, with wide machinery lanes between rows.', 'פאנלים דו-פניים אנכיים בשורות צפון–דרום, הפונים למזרח ולמערב, עם מעברים רחבים למיכון בין השורות.'],
  },
};

/** Cross-section geometry of a variant (metres). depth = horizontal projection used for cover. */
export function sectionOf(v) {
  if (v.key === 'A') {
    const slope = v.modulesUp * MODULE.long, depth = slope * Math.cos(rad(v.tilt)), rise = slope * Math.sin(rad(v.tilt));
    return { depth, lowerEdge: v.lowerEdge, top: v.lowerEdge + rise, axis: v.lowerEdge + rise / 2, modulesPerMetre: v.modulesUp / MODULE.short };
  }
  if (v.key === 'B') {
    const w = MODULE.long, half = w / 2;
    return { depth: w, lowerEdge: v.axisHeight - half * Math.sin(rad(v.maxRotation)), top: v.axisHeight + half * Math.sin(rad(v.maxRotation)), axis: v.axisHeight, modulesPerMetre: 1 / MODULE.short };
  }
  const h = v.modulesUp * MODULE.short;
  return { depth: v.footprint, lowerEdge: v.lowerEdge, top: v.lowerEdge + h, axis: null, modulesPerMetre: v.modulesUp / MODULE.long };
}

/** Which height rule applies, and whether the variant meets it. */
export function heightCheck(v, fieldCrop) {
  const s = sectionOf(v);
  if (v.key === 'C') return { rule: 'vertical', ok: s.top <= 7, note: 's. 3.6.1.3' };
  if (fieldCrop) return { rule: 'field', ok: s.lowerEdge >= 1.5 && s.top <= (v.key === 'B' ? 8 : 7), value: s.lowerEdge, note: 's. 3.6.1.2' };
  return { rule: 'nonfield', ok: s.axis >= 4.5 && s.top <= (v.key === 'B' ? 8 : 7), value: s.axis, note: 's. 3.6.1.1' };
}

// ---- geometry helpers (local metres) ----
export function toLocal(geometry) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  let sx = 0, sy = 0, n = 0;
  for (const p of polys) for (const [x, y] of p[0]) { sx += x; sy += y; n++; }
  const lon0 = sx / n, lat0 = sy / n, kx = 111320 * Math.cos(rad(lat0)), ky = 110540;
  const rings = polys.map(p => p.map(r => r.map(([x, y]) => [(x - lon0) * kx, (y - lat0) * ky])));
  return { rings, lon0, lat0, toLonLat: ([x, y]) => [lon0 + x / kx, lat0 + y / ky] };
}
const ringArea = r => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return Math.abs(a) / 2; };
export const polysArea = polys => polys.reduce((s, p) => s + ringArea(p[0]) - p.slice(1).reduce((h, r) => h + ringArea(r), 0), 0);
export const polysPerimeter = polys => polys.reduce((s, p) => s + p[0].reduce((m, pt, i, r) => i ? m + Math.hypot(pt[0] - r[i - 1][0], pt[1] - r[i - 1][1]) : 0, 0), 0);

/** Interior intervals of the line y = c (in frame coords) across all rings (even-odd). */
function intervalsAt(polys, c) {
  const xs = [];
  for (const p of polys) for (const r of p) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [x1, y1] = r[j], [x2, y2] = r[i];
    if ((y1 > c) !== (y2 > c)) xs.push(x1 + (c - y1) * (x2 - x1) / (y2 - y1));
  }
  xs.sort((a, b) => a - b);
  const out = []; for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i], xs[i + 1]]);
  return out;
}
const intersect = (A, B) => { const out = []; for (const [a0, a1] of A) for (const [b0, b1] of B) { const s = Math.max(a0, b0), e = Math.min(a1, b1); if (e > s) out.push([s, e]); } return out; };
const subtract = (A, [c0, c1]) => A.flatMap(([a0, a1]) => (c1 <= a0 || c0 >= a1) ? [[a0, a1]] : [[a0, Math.min(a1, c0)], [Math.max(a0, c1), a1]].filter(([s, e]) => e - s > 0));
const pointIn = (polys, [x, y]) => intervalsAt(polys, y).some(([a, b]) => x >= a && x <= b);

/** Lay out a variant on a field (local-metre rings). Returns rows, reserved areas and figures. */
export function layout(local, variant, opts = {}) {
  const v = { ...variant, ...opts };
  const sec = sectionOf(v);
  const ns = v.rows === 'NS';
  // frame: u along rows, w across rows. EW rows: u = x, w = y. NS rows: u = y, w = -x.
  const fwd = ([x, y]) => ns ? [y, -x] : [x, y], back = ([u, w]) => ns ? [-w, u] : [u, w];
  const F = local.rings.map(p => p.map(r => r.map(fwd)));
  const fieldArea = polysArea(local.rings), perimeter = polysPerimeter(local.rings);
  let w0 = Infinity, w1 = -Infinity, u0 = Infinity, u1 = -Infinity;
  for (const p of F) for (const [u, w] of p[0]) { w0 = Math.min(w0, w); w1 = Math.max(w1, w); u0 = Math.min(u0, u); u1 = Math.max(u1, u); }

  // usable area = field minus the perimeter strip (approx.); reserved: control plot and equipment pad
  const roadArea = Math.min(fieldArea, perimeter * SETBACK);
  const control = Math.max(1000, 0.02 * (fieldArea - roadArea));
  const side = Math.sqrt(control);
  const free = (cu, cw, du, dw) => { // rectangle centred (cu,cw), half-sizes du,dw, inside with clearance
    const m = SETBACK; const pts = [[cu - du - m, cw - dw - m], [cu + du + m, cw - dw - m], [cu - du - m, cw + dw + m], [cu + du + m, cw + dw + m], [cu, cw]];
    return pts.every(pt => pointIn(F, pt));
  };
  const place = (du, dw, avoid) => {
    const step = Math.max(5, Math.min(du, dw));
    for (let cw = w0 + dw + SETBACK; cw <= w1 - dw - SETBACK; cw += step)
      for (let cu = u0 + du + SETBACK; cu <= u1 - du - SETBACK; cu += step) {
        if (avoid && Math.abs(cu - avoid.cu) < du + avoid.du + 2 && Math.abs(cw - avoid.cw) < dw + avoid.dw + 2) continue;
        if (free(cu, cw, du, dw)) return { cu, cw, du, dw };
      }
    return null;
  };
  const plot = place(side / 2, side / 2, null);
  const pad = place(PAD.w / 2, PAD.d / 2, plot);
  const cultivated = fieldArea - roadArea - (plot ? control : 0) - (pad ? PAD.w * PAD.d : 0);

  // pitch: from the variant (C) or from the cover cap (A, B), never above 30% of the cultivated area
  let pitch = v.pitch ?? Math.ceil((sec.depth / (v.cover ?? COVER_MAX)) * 10) / 10;
  const build = () => {
    const rows = []; const h = sec.depth / 2;
    for (let w = w0 + SETBACK + h; w <= w1 - SETBACK - h; w += pitch) {
      let iv = intersect(intersect(intervalsAt(F, w - h - SETBACK), intervalsAt(F, w)), intervalsAt(F, w + h + SETBACK));
      iv = iv.map(([a, b]) => [a + SETBACK, b - SETBACK]).filter(([a, b]) => b - a > 0);
      for (const r of [plot, pad]) if (r && Math.abs(w - r.cw) < r.dw + h + 2) iv = subtract(iv, [r.cu - r.du - 2, r.cu + r.du + 2]);
      for (const [a, b] of iv) if (b - a >= 15) rows.push({ w, u0: a, u1: b, length: b - a });
    }
    return rows;
  };
  let rows = build();
  let cover = rows.reduce((s, r) => s + r.length * sec.depth, 0) / cultivated;
  for (let guard = 0; cover > COVER_MAX && guard < 50; guard++) { pitch = Math.round((pitch + 0.2) * 10) / 10; rows = build(); cover = rows.reduce((s, r) => s + r.length * sec.depth, 0) / cultivated; }

  const rowLength = rows.reduce((s, r) => s + r.length, 0);
  const modules = Math.floor(rows.reduce((s, r) => s + Math.floor(r.length * sec.modulesPerMetre), 0));
  const kWp = modules * MODULE.wp / 1000;
  const posts = rows.reduce((s, r) => s + Math.ceil(r.length / v.postSpacing) + 1, 0);
  const rect = (cu, cw, du, dw) => [[cu - du, cw - dw], [cu + du, cw - dw], [cu + du, cw + dw], [cu - du, cw + dw], [cu - du, cw - dw]].map(back);
  return {
    variant: v.key, section: sec, pitch, rowsDir: v.rows,
    frameToLocal: back,
    rows: rows.map(r => ({ w: r.w, u0: r.u0, u1: r.u1, length: r.length, line: [back([r.u0, r.w]), back([r.u1, r.w])], poly: rect((r.u0 + r.u1) / 2, r.w, r.length / 2, sec.depth / 2) })),
    controlPlot: plot ? { area: control, poly: rect(plot.cu, plot.cw, plot.du, plot.dw) } : null,
    pad: pad ? { area: PAD.w * PAD.d, poly: rect(pad.cu, pad.cw, pad.du, pad.dw) } : null,
    figures: { fieldArea, roadArea, cultivated, underPanels: rowLength * sec.depth, cover, rowCount: rows.length, rowLength, modules, kWp, posts },
  };
}

/** Generic balance of system and connection notes (indicative, not a specification). */
export function components(fig, v) {
  const acKw = fig.kWp / 1.2;                       // DC/AC ratio 1.2
  const inverters = Math.max(1, Math.ceil(acKw / 100)); // ~100 kW string inverter class
  const mv = acKw > 400;
  const mva = mv ? acKw / 1000 * 1.1 : null;
  return { acKw, inverters, mv, transformerMva: mva ? Math.round(mva * 10) / 10 : null, stations: mva ? Math.max(1, Math.ceil(mva / 3.2)) : 0, structure: v.key };
}
