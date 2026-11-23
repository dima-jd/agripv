import {intersects} from './map-data.js';

// One colour table drives the map shapes, the result swatches and the legend.
// Projects are coloured by reported stage, planning records by construction watch
// (SPFI analysis), candidate fields by screening priority.
const PALETTE = {
  projects: {
    operating: ['#1a7f45', 'Operating', 'פעיל'],
    construction: ['#d9822b', 'Under construction', 'בבנייה'],
    permitting: ['#7b4fc9', 'Permits & procurement', 'היתרים ורכש'],
    planning: ['#2f6fd0', 'In planning', 'בתכנון'],
    research: ['#0f8b8d', 'Research pilot', 'פיילוט מחקר'],
    other: ['#6b7280', 'Other or not established', 'אחר או לא נקבע'],
  },
  plans: {
    observed_physical: ['#1a7f45', 'Physical evidence (reviewed)', 'ראיה פיזית (נבדקה)'],
    preconstruction_signal: ['#7b4fc9', 'Pre-construction signs', 'סימני טרום-הקמה'],
    field_verification_priority: ['#d9822b', 'To verify in the field', 'לאימות בשטח'],
    not_in_watch: ['#8d969c', 'Earlier-stage plan', 'תוכנית בשלב מוקדם'],
  },
  pvplans: {
    approved: ['#c2410c', 'Approved', 'מאושרת'],
    deposit: ['#f59e0b', 'Deposit published', 'פרסום הפקדה'],
    threshold: ['#fcd34d', 'Threshold check', 'עמידה בתנאי סף'],
  },
  storage: {
    approved: ['#0e7490', 'Approved', 'מאושרת'],
    deposit: ['#06b6d4', 'Deposit published', 'פרסום הפקדה'],
    threshold: ['#a5f3fc', 'Threshold check', 'עמידה בתנאי סף'],
  },
  candidates: {
    high: ['#1a7f45', 'High screening priority', 'עדיפות סינון גבוהה'],
    medium: ['#5fb36f', 'Medium', 'בינונית'],
    early: ['#a9d18e', 'Early', 'ראשונית'],
  },
  industrial: { all: ['#7954a1', 'Industrial rooftop potential (authority area)', 'פוטנציאל גגות תעשייה (אזור רשות)'] },
  public: { all: ['#087c8e', 'Public-space potential', 'פוטנציאל בשטח ציבורי'] },
};

/** Construction-watch labels, shared with the results list. [en, he] */
export const cwLabels = Object.fromEntries(Object.entries(PALETTE.plans).map(([k, [, en, he]]) => [k, [en, he]]));

function keyFor(r, cwOf) {
  if (r.layer === 'projects') return PALETTE.projects[r.stageKey] ? r.stageKey : 'other';
  if (r.layer === 'plans') return cwOf?.(r) || 'not_in_watch';
  if (r.layer === 'candidates') return r.raw?.screeningPriority || 'early';
  if (r.layer === 'pvplans' || r.layer === 'storage') return ({ 'מאושרת': 'approved', 'פרסום הפקדה בעיתונות': 'deposit', 'עמידה בתנאי סף': 'threshold' })[r.stage] || 'threshold';
  return 'all';
}

export function colorFor(r, cwOf) {
  const table = PALETTE[r.layer] || {};
  return (table[keyFor(r, cwOf)] || Object.values(table)[0] || ['#555'])[0];
}

export function legendHTML(layer, lang) {
  const items = Object.values(PALETTE[layer] || {});
  if (!items.length) return '';
  const title = { projects: ['Colour = reported stage', 'צבע = השלב המדווח'], plans: ['Colour = construction watch (SPFI analysis)', 'צבע = מעקב הקמה (ניתוח של SPFI)'], candidates: ['Colour = screening priority', 'צבע = עדיפות סינון'], pvplans: ['Colour = official planning status', 'צבע = סטטוס תכנוני רשמי'], storage: ['Colour = official planning status', 'צבע = סטטוס תכנוני רשמי'] }[layer];
  const i = lang === 'he' ? 1 : 0;
  return `${title ? `<p class="legend-title">${title[i]}</p>` : ''}<ul>${items.map(([c, en, he]) => `<li><span class="swatch" style="background:${c}" aria-hidden="true"></span>${i ? he : en}</li>`).join('')}</ul>`;
}

export function drawRecords(map, rows, onSelect, lang, cwOf) {
  const group = L.featureGroup().addTo(map), bounds = map.getBounds();
  const viewport = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
  const large = rows.length > 1200, overview = large && map.getZoom() < 11;
  let failed = 0;
  if (overview) {
    const cells = new Map(), size = map.getZoom() < 8 ? .3 : .08;
    for (const r of rows) {
      if (!r.extent) continue;
      const x = (r.extent[0] + r.extent[2]) / 2, y = (r.extent[1] + r.extent[3]) / 2, key = Math.floor(x / size) + ',' + Math.floor(y / size);
      const cell = cells.get(key) || { x: 0, y: 0, count: 0, extent: [180, 90, -180, -90] };
      cell.x += x; cell.y += y; cell.count++;
      cell.extent = [Math.min(cell.extent[0], r.extent[0]), Math.min(cell.extent[1], r.extent[1]), Math.max(cell.extent[2], r.extent[2]), Math.max(cell.extent[3], r.extent[3])];
      cells.set(key, cell);
    }
    const label = n => n + ' ' + (lang === 'he' ? 'רשומות — הגדלה לפרטים' : 'records — zoom for detail');
    for (const cell of cells.values()) {
      L.marker([cell.y / cell.count, cell.x / cell.count], { title: label(cell.count), keyboard: true, icon: L.divIcon({ className: 'potential-cluster', html: '<span>' + cell.count + '</span>', iconSize: [38, 38], iconAnchor: [19, 19] }) })
        .bindTooltip(label(cell.count))
        .on('click', () => map.fitBounds([[cell.extent[1], cell.extent[0]], [cell.extent[3], cell.extent[2]]], { maxZoom: 14 }))
        .addTo(group);
    }
  } else {
    for (const r of rows) {
      if (!r.geometryValid || large && !intersects(r.extent, viewport)) continue;
      const color = colorFor(r, cwOf);
      try {
        L.geoJSON(r.geometry, {
          style: { color, weight: 2, fillOpacity: .25 },
          pointToLayer: (f, ll) => L.circleMarker(ll, { radius: 8, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 }),
        }).on('click', () => onSelect(r.id)).addTo(group);
      } catch { failed++; }
    }
  }
  return { group, failed, overview };
}
