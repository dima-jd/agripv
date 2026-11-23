// Planning constraints overlay: Planning Administration (מינהל התכנון), TAMA 1 (approved) and TAMA 1/26 (in process).
// Drawn under any map layer when switched on. Display only: not an official determination; Mavat is authoritative.
const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const CONSTRAINT_KINDS = {
  reserve_park: { color: '#15803d', fill: .28, label: ['Nature reserve or national park', 'שמורת טבע או גן לאומי'] },
  forest: { color: '#65a30d', fill: .22, label: ['Forest (TAMA 1)', 'יער (תמ״א 1)'] },
  coastal_complex: { color: '#0e7490', fill: .22, label: ['Coastal complex', 'מכלול חוף'] },
  urban_coastal_park: { color: '#0891b2', fill: .22, label: ['Urban coastal park', 'פארק חוף עירוני'] },
  landscape_complex: { color: '#9a3412', fill: .14, label: ['Landscape complex (TAMA 35)', 'מכלול נוף (תמ״א 35)'] },
  coastal_fabric: { color: '#0369a1', fill: .05, dash: true, label: ['Coastal fabric (TAMA 35): excluded in three zones', 'מרקם חופי (תמ״א 35): מוחרג בשלושה אזורים'] },
  high_landscape_sensitivity: { color: '#7c2d12', fill: .05, dash: true, label: ['High landscape-environmental sensitivity (TAMA 35)', 'רגישות נופית-סביבתית גבוהה (תמ״א 35)'] },
  flood: { color: '#2563eb', fill: .16, label: ['Flood area', 'שטח הצפה'] },
  coast_line: { color: '#0284c7', line: true, label: ['Coastal environment line (300 m)', 'קו סביבה חופית (300 מ׳)'] },
  proposed_reserve_park: { color: '#15803d', fill: .06, dash: true, label: ['Proposed reserve or park (in process)', 'שמורה או גן מוצעים (בהליך)'] },
  proposed_protected: { color: '#15803d', fill: .06, dash: true, label: ['Proposed protected area (in process)', 'שטח מוגן מוצע (בהליך)'] },
  proposed_forest: { color: '#65a30d', fill: .06, dash: true, label: ['Proposed forest (in process)', 'יער מוצע (בהליך)'] },
  proposed_corridor: { color: '#a16207', fill: .05, dash: true, label: ['Proposed ecological corridor (in process)', 'מסדרון אקולוגי מוצע (בהליך)'] },
  proposed_bottleneck: { color: '#c2410c', fill: .08, dash: true, label: ['Proposed ecological bottleneck (in process)', 'צוואר בקבוק אקולוגי מוצע (בהליך)'] },
};
export const kindLabel = (kind, lang) => (CONSTRAINT_KINDS[kind]?.label || [kind, kind])[lang === 'he' ? 1 : 0];

let cache = null;
export function loadConstraints() {
  cache ??= fetch('data/constraints.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(err => { cache = null; throw err; });
  return cache;
}

/** Non-interactive overlay in its own pane, under the record layer. */
export function drawConstraints(map, data) {
  if (!map.getPane('constraints')) { map.createPane('constraints').style.zIndex = 350; map.getPane('constraints').style.pointerEvents = 'none'; }
  const renderer = L.canvas({ pane: 'constraints' });
  return L.geoJSON(data, {
    pane: 'constraints', renderer, interactive: false,
    style: f => { const k = CONSTRAINT_KINDS[f.properties.kind] || { color: '#555', fill: .1 }; return { color: k.color, weight: k.line ? 2 : 1.2, dashArray: k.dash || k.line ? '5 4' : null, fillColor: k.color, fillOpacity: k.line ? 0 : k.fill }; },
  }).addTo(map);
}

export function constraintsToggleHTML(on, lang, data) {
  const he = lang === 'he', t = (en, h) => he ? h : en;
  const when = data?.retrievedAt ? String(data.retrievedAt).slice(0, 10) : null;
  const legend = on ? `<ul class="constraint-legend">${Object.values(CONSTRAINT_KINDS).map(k => `<li><span class="swatch${k.dash || k.line ? ' dashed' : ''}" style="border-color:${k.color};background:${k.line ? 'transparent' : k.color + (k.dash ? '22' : '55')}" aria-hidden="true"></span>${e(k.label[he ? 1 : 0])}</li>`).join('')}</ul>
  <p class="source-note">${t(`Source: Israel Planning Administration (מינהל התכנון), national outline plans TAMA 1 and TAMA 35 (approved) and TAMA 1/26 (in process)${when ? `; retrieved ${when}` : ''}. Solid areas are where TAMA 1/24 (s. 3.5.1) does not allow agrivoltaics; fields there are excluded. Boundaries simplified to about 10 m for display. Dashed areas are proposals still in the planning process. SPFI's overlap checks are research, not an official determination. For exact boundaries and legally binding information, use <a href="https://mavat.iplan.gov.il" target="_blank" rel="noopener noreferrer">Mavat</a>.`,
    `מקור: מינהל התכנון, תוכניות המתאר הארציות תמ״א 1 ותמ״א 35 (מאושרות) ותמ״א 1/26 (בהליך)${when ? `; נשלפו ב־${when}` : ''}. שטחים מלאים הם שטחים שבהם תמ״א 1/24 (סעיף 3.5.1) אינה מתירה אגרו-וולטאיקה; חלקות בהם מוחרגות. הגבולות מפושטים לכ-10 מ׳ לתצוגה. שטחים מקווקווים הם הצעות שעדיין בהליך תכנון. בדיקות החפיפה של SPFI הן מחקר ולא קביעה רשמית. לגבולות מדויקים ולמידע מחייב יש לפנות ל<a href="https://mavat.iplan.gov.il" target="_blank" rel="noopener noreferrer">מבא״ת</a>.`)}</p>` : '';
  return `<div class="constraint-toggle"><label><input type="checkbox" id="show-constraints"${on ? ' checked' : ''}> ${t('Show planning constraints (TAMA 1/24 exclusions and flags)', 'הצגת מגבלות תכנוניות (החרגות וסימונים לפי תמ״א 1/24)')}</label>${legend}</div>`;
}



