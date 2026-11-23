// Planning constraints overlay: Planning Administration (מינהל התכנון), TAMA 1 (approved) and TAMA 1/26 (in process).
// Drawn under any map layer when switched on. Display only: not an official determination; Mavat is authoritative.
const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const CONSTRAINT_KINDS = {
  reserve_park: { color: '#15803d', fill: .28, label: ['Nature reserve or national park', 'שמורת טבע או גן לאומי'] },
  forest: { color: '#65a30d', fill: .16, label: ['Forest (TAMA 1)', 'יער (תמ״א 1)'] },
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
  <p class="source-note">${t(`Source: Israel Planning Administration (מינהל התכנון), national outline plans TAMA 1 (approved) and TAMA 1/26 (in process)${when ? `; retrieved ${when}` : ''}. Boundaries simplified to about 10 m for display. Dashed areas are proposals still in the planning process. SPFI's overlap checks are research, not an official determination. For exact boundaries and legally binding information, use <a href="https://mavat.iplan.gov.il" target="_blank" rel="noopener noreferrer">Mavat</a>.`,
    `מקור: מינהל התכנון, תוכניות המתאר הארציות תמ״א 1 (מאושרת) ותמ״א 1/26 (בהליך)${when ? `; נשלפו ב־${when}` : ''}. הגבולות מפושטים לכ-10 מ׳ לתצוגה. שטחים מקווקווים הם הצעות שעדיין בהליך תכנון. בדיקות החפיפה של SPFI הן מחקר ולא קביעה רשמית. לגבולות מדויקים ולמידע מחייב יש לפנות ל<a href="https://mavat.iplan.gov.il" target="_blank" rel="noopener noreferrer">מבא״ת</a>.`)}</p>` : '';
  return `<div class="constraint-toggle"><label><input type="checkbox" id="show-constraints"${on ? ' checked' : ''}> ${t('Show planning constraints (reserves, parks, forests, flood areas)', 'הצגת מגבלות תכנוניות (שמורות, גנים, יערות, שטחי הצפה)')}</label>${legend}</div>`;
}

/** Candidate detail: solar resource for the field's area (PVGIS). Not part of the score. */
export function candidateSolarHTML(raw, lang) {
  const s = raw?.solarResource, he = lang === 'he', t = (en, h) => he ? h : en;
  const body = s ? `<p>${t('Annual PV output, reference system', 'תפוקה סולארית שנתית, מערכת ייחוס')}: <strong>${Number(s.pvoutKwhPerKwpYear).toLocaleString(lang)} ${t('kWh per kWp', 'קוט״ש לקילוואט שיא')}</strong> · ${t('optimal tilt', 'זווית אופטימלית')} ${e(s.optimalTiltDeg)}°</p>`
    : `<p>${t('Unknown: no value for this area.', 'לא ידוע: אין ערך לאזור זה.')}</p>`;
  return `<h3>${t('Solar resource (area)', 'משאב סולארי (אזור)')}</h3>${body}<p class="method-note">${t(`For a 1 kWp fixed system at the optimal angle with 14% losses, averaged over about 5 km (${e(s?.radiationDb || 'PVGIS-SARAH3')}, ${e(s?.years || '2005–2023')}). It describes the area's sunshine, not the yield of an agrivoltaic design, and it is not part of the screening score. `, `למערכת קבועה של 1 קילוואט שיא בזווית האופטימלית עם 14% הפסדים, בממוצע על פני כ-5 ק״מ (${e(s?.radiationDb || 'PVGIS-SARAH3')}, ${e(s?.years || '2005–2023')}). הנתון מתאר את הקרינה באזור, לא תפוקה של מערכת אגרו-וולטאית, ואינו חלק מציון הסינון. `)}${t('Data and calculations based on PVGIS – © European Union, Joint Research Centre.', 'הנתונים והחישובים מבוססים על PVGIS – © האיחוד האירופי, המרכז המשותף למחקר (JRC).')}</p>`;
}

/** Candidate detail: the field's constraint flags from the screening. */
export function candidateConstraintsHTML(raw, lang) {
  const c = raw?.constraints, he = lang === 'he', t = (en, h) => he ? h : en;
  if (!c) return '';
  const items = (c.hits || []).map(h => `<li>${e(kindLabel(h.kind, lang))}${h.name ? ' · ' + e(h.name) : ''}${h.shareOfParcel != null ? ` · ${(h.shareOfParcel * 100).toFixed(1)}% ${t('of the field', 'מהחלקה')}` : ''}${h.level === 'edge_contact' ? ` (${t('edge contact', 'נגיעה בשוליים')})` : ''}${h.status === 'proposed' ? ` — ${t('proposal in process, not approved', 'הצעה בהליך, לא מאושרת')}` : ''}</li>`).join('');
  return `<h3>${t('Planning constraints', 'מגבלות תכנוניות')}</h3>${items ? `<ul class="constraint-hits">${items}</ul>` : `<p>${t('None found in TAMA 1 or TAMA 1/26.', 'לא נמצאו בתמ״א 1 או בתמ״א 1/26.')}</p>`}<p class="method-note">${t('SPFI overlap check against Planning Administration layers (מינהל התכנון), checked ', 'בדיקת חפיפה של SPFI מול שכבות מינהל התכנון, נבדק ב־')}${e(String(c.checkedAt || '').slice(0, 10) || t('date unknown', 'תאריך לא ידוע'))}. ${t('Fields inside a nature reserve or national park are already excluded from the candidate list. Flags are for checking, not a ruling; for binding information use Mavat.', 'חלקות בתוך שמורת טבע או גן לאומי כבר הוצאו מרשימת המועמדות. הסימונים נועדו לבדיקה ואינם הכרעה; למידע מחייב יש לפנות למבא״ת.')}</p>`;
}
