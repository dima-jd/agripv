// Adjustable concept settings, kept within TAMA 1/24 limits (and the layout's own 30% cover guard).
import { MODULE, COVER_MAX } from './layout.js';

const rad = d => d * Math.PI / 180;
const r1 = x => Math.round(x * 10) / 10;

/** Controls for variant v (current values merged), with limits that depend on the crop type and other settings. */
export function controls(v, fieldCrop) {
  if (v.key === 'A') {
    const slope = v.modulesUp * MODULE.long, rise = slope * Math.sin(rad(v.tilt)), depth = slope * Math.cos(rad(v.tilt));
    const minEdge = fieldCrop ? 1.5 : r1(Math.max(0.5, 4.5 - rise / 2));       // s. 3.6.1.2 / 3.6.1.1 (axis at mid-table)
    const maxEdge = r1(7 - rise);                                               // s. 4.3.6.4: up to 7 m
    return [
      { key: 'tilt', label: ['Tilt', 'הטיה'], unit: '°', min: 10, max: 35, step: 5, value: v.tilt },
      { key: 'lowerEdge', label: ['Lowest panel edge', 'קצה פאנל תחתון'], unit: 'm', min: minEdge, max: maxEdge, step: 0.1, value: Math.min(Math.max(v.lowerEdge, minEdge), maxEdge) },
      { key: 'pitch', label: ['Row pitch', 'מרווח שורות'], unit: 'm', min: Math.ceil(depth / COVER_MAX * 10) / 10, max: 30, step: 0.1, value: v.pitch ?? Math.ceil(depth / COVER_MAX * 10) / 10 },
    ];
  }
  if (v.key === 'B') {
    const lift = MODULE.long / 2 * Math.sin(rad(v.maxRotation));
    const minAxis = fieldCrop ? r1(1.5 + lift) : 4.5;                           // edge >= 1.5 m at full rotation, or axis >= 4.5 m
    const maxAxis = r1(8 - lift);                                               // tracker may move up to 8 m
    return [
      { key: 'axisHeight', label: ['Axis height', 'גובה ציר'], unit: 'm', min: minAxis, max: maxAxis, step: 0.1, value: Math.min(Math.max(v.axisHeight, minAxis), maxAxis) },
      { key: 'pitch', label: ['Row pitch', 'מרווח שורות'], unit: 'm', min: Math.ceil(MODULE.long / COVER_MAX * 10) / 10, max: 20, step: 0.1, value: v.pitch ?? Math.ceil(MODULE.long / COVER_MAX * 10) / 10 },
    ];
  }
  if (v.key === 'D') {
    const drop = v.tableModulesHigh * MODULE.long / 2 * Math.sin(rad(v.maxTilt)), area = v.tableModulesWide * MODULE.short * v.tableModulesHigh * MODULE.long;
    const minHub = fieldCrop ? r1(1.5 + drop) : 4.5, maxHub = r1(8 - drop);
    return [
      { key: 'hubHeight', label: ['Hub height', 'גובה ציר'], unit: 'm', min: minHub, max: maxHub, step: 0.1, value: Math.min(Math.max(v.hubHeight, minHub), maxHub) },
      { key: 'pitch', label: ['Row spacing', 'מרווח שורות'], unit: 'm', min: Math.ceil(area / (COVER_MAX * v.along) * 10) / 10, max: 24, step: 0.5, value: v.pitch },
    ];
  }
  if (v.key === 'E') return [
    { key: 'roofCover', label: ['PV share of the roof', 'שיעור הפאנלים בגג'], unit: '%', min: 0.1, max: 0.5, step: 0.05, value: v.roofCover },
  ];
  return [
    { key: 'lowerEdge', label: ['Lowest panel edge', 'קצה פאנל תחתון'], unit: 'm', min: 0.5, max: 1.5, step: 0.1, value: v.lowerEdge },
    { key: 'pitch', label: ['Row pitch (machinery lane)', 'מרווח שורות (מעבר מיכון)'], unit: 'm', min: 6, max: 20, step: 0.5, value: v.pitch },
  ];
}

/** Clamp custom values into the current limits (a tilt change can move the height limits). */
export function clampSettings(v, fieldCrop) {
  const out = { ...v };
  for (let pass = 0; pass < 2; pass++) for (const c of controls(out, fieldCrop)) out[c.key] = Math.min(Math.max(Number(out[c.key] ?? c.value), c.min), c.max);
  return out;
}

/** Yield for variant A at any tilt from the PVGIS tilt series (linear interpolation); others unchanged. */
export function yieldFor(v, designYield) {
  if (!designYield) return null;
  if (v.key === 'E') return yieldFor({ key: 'A', tilt: v.roofSlope }, designYield);
  if (v.key !== 'A') return designYield[v.key] ?? null;
  const pts = Object.entries(designYield.tilts ?? {}).map(([t, y]) => [Number(t), y]).sort((a, b) => a[0] - b[0]);
  if (pts.length < 2) return v.tilt === 25 ? designYield.A ?? null : null;
  const t = v.tilt; if (t <= pts[0][0]) return pts[0][1]; if (t >= pts.at(-1)[0]) return pts.at(-1)[1];
  for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [t0, y0] = pts[i - 1], [t1, y1] = pts[i]; return Math.round(y0 + (y1 - y0) * (t - t0) / (t1 - t0)); }
  return null;
}

export const PARAM = { tilt: 't', lowerEdge: 'h', axisHeight: 'ax', hubHeight: 'hub', pitch: 'p', roofCover: 'rc' };
