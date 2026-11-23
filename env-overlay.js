// Environmental sensitivity overlay and candidate blocks.
// Ministry of Environmental Protection terms (23 Nov 2026): attribution, independence notice, preliminary-screening framing,
// retrieval date labelled as such, Ministry data kept distinct from SPFI analysis.
// Grid proximity: OpenStreetMap (ODbL) distance bands only; no infrastructure layer (Electricity Authority guidance).
const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const LEVELS = { 1: ['#f2f0f7', 'Very low', 'נמוכה מאוד'], 2: ['#dadaeb', 'Low', 'נמוכה'], 3: ['#bcbddc', 'Moderate', 'בינונית'], 4: ['#9e9ac8', 'Considerable', 'ניכרת'], 5: ['#756bb1', 'High', 'גבוהה'], 6: ['#54278f', 'Very high', 'גבוהה מאוד'] };
const MOEP = ['Source: Israel Ministry of Environmental Protection (המשרד להגנת הסביבה). Geographic data reproduced for research and informational purposes.', 'מקור: המשרד להגנת הסביבה. הנתונים הגאוגרפיים מוצגים למטרות מחקר ומידע.'];
const INDEP = ['SPFI is an independent research initiative. It is not affiliated with or endorsed by the Ministry, and it does not replace statutory planning procedures or site-specific environmental assessments.', 'SPFI היא יוזמת מחקר עצמאית. היא אינה קשורה למשרד ואינה מאושרת על ידו, ואינה מחליפה הליכי תכנון סטטוטוריים או הערכה סביבתית פרטנית.'];
export const envAttribution = lang => `<a href="https://www.gov.il/he/departments/ministry_of_environmental_protection/govil-landing-page" target="_blank" rel="noopener noreferrer">${lang === 'he' ? 'המשרד להגנת הסביבה' : 'Israel Ministry of Environmental Protection'}</a>`;

let cache = null;
export function loadEnvironment() {
  cache ??= fetch('data/environment.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(err => { cache = null; throw err; });
  return cache;
}

/** Sensitivity units coloured by level, landscape divisions as outlines; non-interactive, under the record layer. */
export function drawEnvironment(map, data) {
  if (!map.getPane('environment')) { map.createPane('environment').style.zIndex = 340; map.getPane('environment').style.pointerEvents = 'none'; }
  const renderer = L.canvas({ pane: 'environment' });
  return L.geoJSON(data, {
    pane: 'environment', renderer, interactive: false,
    style: f => f.properties.kind === 'sensitivity'
      ? { stroke: false, fillColor: (LEVELS[f.properties.level] || ['#cccccc'])[0], fillOpacity: .45 }
      : { color: '#3f3f46', weight: 1.4, dashArray: '2 4', fill: false },
  }).addTo(map);
}

export function envToggleHTML(on, lang, data) {
  const he = lang === 'he', i = he ? 1 : 0, t = (en, h) => he ? h : en;
  const got = data?.retrievedAt ? String(data.retrievedAt).slice(0, 10) : null;
  const svc = data?.serviceLastEditAt?.sensitivity ? String(data.serviceLastEditAt.sensitivity).slice(0, 10) : null;
  const legend = on ? `<ul class="constraint-legend">${Object.entries(LEVELS).map(([n, [c, en, h]]) => `<li><span class="swatch" style="border-color:${c};background:${c}" aria-hidden="true"></span>${n} — ${e(he ? h : en)}</li>`).join('')}<li><span class="swatch dashed" style="border-color:#3f3f46;background:transparent" aria-hidden="true"></span>${t('Landscape division boundary', 'גבול חטיבת נוף')}</li></ul>
  <p class="source-note">${e(MOEP[i])} ${t('Open-space sensitivity units (1 = very low, 6 = very high) and landscape divisions.', 'יחידות רגישות של שטחים פתוחים (1 = נמוכה מאוד, 6 = גבוהה מאוד) וחטיבות נוף.')} ${got ? t(`Retrieved ${got} (retrieval date, not the date of the environmental assessment)`, `נשלף ב־${got} (תאריך השליפה, לא תאריך ההערכה הסביבתית)`) : ''}${svc ? t(`; service last updated ${svc}.`, `; השירות עודכן לאחרונה ב־${svc}.`) : '.'} ${t('Boundaries simplified to about 10 m. Shown as a preliminary screening indicator, not an official environmental assessment or regulatory determination.', 'הגבולות מפושטים לכ-10 מ׳. מוצג כמדד סינון ראשוני, לא כהערכה סביבתית רשמית או כקביעה רגולטורית.')} ${e(INDEP[i])}</p>` : '';
  return `<div class="constraint-toggle env-toggle"><label><input type="checkbox" id="show-environment"${on ? ' checked' : ''}> ${t('Show environmental sensitivity (Ministry of Environmental Protection)', 'הצגת רגישות סביבתית (המשרד להגנת הסביבה)')}</label>${legend}</div>`;
}


export const BANDS = { lt1km: ['under 1 km', 'פחות מ-1 ק״מ'], '1to3km': ['1–3 km', '1–3 ק״מ'], '3to10km': ['3–10 km', '3–10 ק״מ'], gt10km: ['over 10 km', 'מעל 10 ק״מ'], lt5km: ['under 5 km', 'פחות מ-5 ק״מ'], '5to15km': ['5–15 km', '5–15 ק״מ'], gt15km: ['over 15 km', 'מעל 15 ק״מ'] };
