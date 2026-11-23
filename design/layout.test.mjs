// node --test design/layout.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VARIANTS, toLocal, layout, heightCheck, components, COVER_MAX, SETBACK } from './layout.js';

// a 300 m x 400 m rectangle near Be'er Sheva (12 ha = 120 dunam) and an irregular L shape
const rect = { type: 'Polygon', coordinates: [[[34.79, 31.25], [34.79316, 31.25], [34.79316, 31.25362], [34.79, 31.25362], [34.79, 31.25]]] };
const lshape = { type: 'Polygon', coordinates: [[[34.79, 31.25], [34.796, 31.25], [34.796, 31.252], [34.792, 31.252], [34.792, 31.256], [34.79, 31.256], [34.79, 31.25]]] };
const inside = (rings, [x, y]) => { let c = false; for (const ring of rings[0]) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };

for (const [name, g] of [['rectangle', rect], ['L shape', lshape]]) {
  for (const k of ['A', 'B', 'C', 'D']) {
    test(`${name} ${k}: cover <= 30%, rows inside the field, control plot >= 1 dunam and 2%`, () => {
      const L0 = toLocal(g), L = layout(L0, VARIANTS[k]);
      assert.ok(L.rows.length > 0, 'has rows');
      assert.ok(L.figures.cover <= COVER_MAX + 1e-9, `cover ${L.figures.cover}`);
      for (const r of L.rows) for (const pt of r.line) assert.ok(inside(L0.rings, pt), 'row end inside field');
      assert.ok(L.controlPlot, 'control plot placed');
      assert.ok(L.controlPlot.area >= 1000 && L.controlPlot.area >= 0.02 * (L.figures.fieldArea - L.figures.roadArea) - 1e-6);
      assert.ok(L.figures.kWp > 0 && L.figures.modules > 0);
    });
  }
}

test('height rules: field crops lower edge >= 1.5 m, other crops axis >= 4.5 m, vertical exempt, all <= 7/8 m', () => {
  for (const k of ['A', 'B']) { assert.ok(heightCheck(VARIANTS[k], true).ok, k + ' field'); assert.ok(heightCheck(VARIANTS[k], false).ok, k + ' nonfield'); }
  assert.equal(heightCheck(VARIANTS.C, true).rule, 'vertical');
  assert.ok(heightCheck({ ...VARIANTS.A, lowerEdge: 1.0 }, true).ok === false, 'too low fails');
});

test('rectangle sanity: area, setback and density are plausible', () => {
  const L = layout(toLocal(rect), VARIANTS.A), F = L.figures;
  assert.ok(Math.abs(F.fieldArea - 120000) / 120000 < 0.02, `area ${F.fieldArea}`);
  const mwpPerHa = F.kWp / 1000 / (F.fieldArea / 10000);
  assert.ok(mwpPerHa > 0.4 && mwpPerHa < 0.8, `density ${mwpPerHa}`);
  assert.ok(SETBACK === 5);
  const c = components(F, VARIANTS.A);
  assert.ok(c.inverters >= Math.ceil(F.kWp / 1.2 / 100) && (c.mv ? c.stations >= 1 : true));
});

test('D dual-axis: trackers placed, cover <= 30%, top <= 8 m; E greenhouse: cover follows the roof share', () => {
  const L0 = toLocal(rect);
  const d = layout(L0, VARIANTS.D);
  assert.ok(d.figures.trackers > 0 && d.figures.modules === d.figures.trackers * 12);
  assert.ok(d.figures.cover <= COVER_MAX + 1e-9);
  assert.ok(heightCheck(VARIANTS.D, true).ok && heightCheck(VARIANTS.D, false).ok);
  const e = layout(L0, { ...VARIANTS.E, roofCover: 0.4 });
  assert.equal(heightCheck(VARIANTS.E, true).rule, 'greenhouse');
  assert.ok(e.figures.greenhouseArea > 0 && e.figures.cover > 0.3, 'greenhouse PV is not capped at 30%');
});
