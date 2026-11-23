// Floating PV screening overlay: water bodies from OpenStreetMap (ODbL), assessed against TAMA 1 s. 5.2.6.
// The data file is a derived database of OSM and is offered under ODbL. Rules from the Planning Administration's
// consolidated TAMA 1 text; an indicative scenario, not a feasibility assessment or an approval.
const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n = (v, d = 1) => Number(v).toLocaleString(undefined, { maximumFractionDigits: d });

export const TYPES = {
  reservoir: ['#1d6fb8', 'Water reservoir', 'מאגר מים'],
  effluent: ['#7a5c2e', 'Effluent reservoir', 'מאגר קולחין'],
  fishpond: ['#0f8a7e', 'Fish pond', 'בריכת דגים'],
  basin: ['#8a8f98', 'Basin (type to check)', 'אגן (יש לבדוק סוג)'],
  pond: ['#8a8f98', 'Pond (may be natural)', 'בריכה (ייתכן שטבעית)'],
  other: ['#8a8f98', 'Other water body', 'גוף מים אחר'],
};
const APPROVALS = {
  engineer_stability: ['an engineer’s approval of embankment stability and safety', 'אישור מהנדס ליציבות המאגר ולבטיחות'],
  health: ['the Ministry of Health', 'משרד הבריאות'],
  water_authority: ['the Water Authority', 'רשות המים'],
  agriculture: ['the Ministry of Agriculture', 'משרד החקלאות'],
};

let cache = null;
export function loadWater() {
  cache ??= fetch('data/water.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(err => { cache = null; throw err; });
  return cache;
}

export function waterPopup(p, lang) {
  const he = lang === 'he', i = he ? 1 : 0, t = (en, h) => he ? h : en;
  const ty = TYPES[p.type] || TYPES.other, r = p.rule || {}, pot = p.potential || {};
  const name = (he ? p.name : (p.nameEn || p.name)) || t('Unnamed water body', 'גוף מים ללא שם');
  const status = r.status === 'eligible'
    ? t('Type allowed under TAMA 1 s. 5.2.6, subject to approvals', 'סוג שמותר לפי תמ״א 1 סעיף 5.2.6, בכפוף לאישורים')
    : t('Check the type first: s. 5.2.6 covers lawfully built artificial reservoirs and active fish ponds only', 'יש לבדוק תחילה את הסוג: סעיף 5.2.6 חל רק על מאגרים מלאכותיים שהוקמו כדין ועל בריכות דגים פעילות');
  const flags = [
    r.annexB10Sensitive ? t('Probably listed in Annex B\'10 (ecologically sensitive reservoirs): embankments first, and consultation with the Nature and Parks Authority (s. 5.2.6.2). Matched by location, to be confirmed.', 'כנראה ברשימת נספח ב\'10 (מאגרים בעלי רגישות אקולוגית): קודם הדפנות, והיוועצות עם רט״ג (סעיף 5.2.6.2). ההתאמה לפי מיקום, טעונה אימות.') : '',
    r.inLandscapeComplex ? t('Inside a TAMA 35 landscape complex: allowed only on the water or along the embankments (s. 5.2.6.3).', 'בתוך מכלול נוף (תמ״א 35): מותר רק על פני המים או בצמוד לדפנות (סעיף 5.2.6.3).') : '',
  ].filter(Boolean);
  const appr = (r.approvals || []).map(a => e((APPROVALS[a] || [a, a])[i])).join(', ');
  return `<div class="water-pop"><strong>${e(name)}</strong><br><span class="badge" style="background:${ty[0]};color:#fff">${e(ty[i + 1])}</span> ${e(n(p.areaHa))} ${t('ha', 'הקטר')}
  <p>${e(status)}${appr ? `. ${t('Needs', 'נדרש')}: ${appr}.` : ''}</p>${flags.map(f => `<p class="flag">${e(f)}</p>`).join('')}
  <p><strong>${t('Indicative scenario', 'תרחיש אינדיקטיבי')}</strong>: ${t('PV over 30% of the water', 'PV על 30% מפני המים')} (${e(n(pot.coveredHa))} ${t('ha', 'הקטר')}) ≈ ${e(n(pot.mwp))} MWp${pot.gwh != null ? `, ~${e(n(pot.gwh))} ${t('GWh/yr', 'GWh/שנה')} (PVGIS, ${e(pot.tilt)}°)` : `, ${t('output unknown', 'תפוקה לא ידועה')}`}. ${t('The real extent is set by the approving bodies.', 'ההיקף בפועל נקבע על ידי הגופים המאשרים.')}</p>
  <p class="source-note">${t('Outline and type: © OpenStreetMap contributors (ODbL); community data, may be incomplete. Not a feasibility assessment.', 'גבול וסוג: © תורמי OpenStreetMap (ODbL); נתוני קהילה, ייתכן שאינם שלמים. אינו בדיקת היתכנות.')}</p></div>`;
}

/** Water bodies coloured by type, clickable, above the environment pane. */
export function drawWater(map, data, lang) {
  if (!map.getPane('water')) { map.createPane('water').style.zIndex = 360; }
  return L.geoJSON(data, {
    pane: 'water',
    style: f => { const c = (TYPES[f.properties.type] || TYPES.other)[0]; return { color: c, weight: 1.5, fillColor: c, fillOpacity: f.properties.rule?.status === 'eligible' ? .55 : .25, dashArray: f.properties.rule?.status === 'eligible' ? null : '3 3' }; },
    onEachFeature: (f, l) => l.bindPopup(() => waterPopup(f.properties, lang), { maxWidth: 300 }),
  }).addTo(map);
}

export const waterAttribution = () => '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors (ODbL)</a>';

export function waterToggleHTML(on, lang, data) {
  const he = lang === 'he', t = (en, h) => he ? h : en;
  const got = data?.retrievedAt ? String(data.retrievedAt).slice(0, 10) : null;
  const sum = data?.features ? data.features.filter(f => f.properties.rule?.status === 'eligible') : null;
  const legend = on ? `<ul class="constraint-legend">${['reservoir', 'effluent', 'fishpond', 'pond'].map(k => `<li><span class="swatch${k === 'pond' ? ' dashed' : ''}" style="border-color:${TYPES[k][0]};background:${k === 'pond' ? 'transparent' : TYPES[k][0]}" aria-hidden="true"></span>${e(he ? TYPES[k][2] : TYPES[k][1])}${k === 'pond' ? t(' / basin: type to check', ' / אגן: יש לבדוק סוג') : ''}</li>`).join('')}</ul>
  <p class="source-note">${t('Floating PV screening: water bodies of 1 ha or more. TAMA 1 s. 5.2.6 allows PV on the embankments, floating or covering the water, on lawfully built artificial water and effluent reservoirs and on active fish ponds, subject to an engineer’s stability approval and the Ministry of Health and Water Authority (reservoirs) or the Ministry of Agriculture (fish ponds).', 'סינון PV צף: גופי מים של 10 דונם (הקטר) ומעלה. תמ״א 1 סעיף 5.2.6 מתירה PV על הדפנות, צף או מקרה את פני המים, במאגרי מים וקולחין מלאכותיים שהוקמו כדין ובבריכות דגים פעילות, בכפוף לאישור מהנדס ליציבות ולאישור משרד הבריאות ורשות המים (מאגרים) או משרד החקלאות (בריכות דגים).')} ${sum ? t(`${sum.length} water bodies of an allowed type; the indicative scenario (PV on 30% of the water) totals about ${n(sum.reduce((s, f) => s + (f.properties.potential?.mwp || 0), 0), 0)} MWp.`, `${sum.length} גופי מים מסוג מותר; התרחיש האינדיקטיבי (PV על 30% מפני המים) מסתכם בכ-${n(sum.reduce((s, f) => s + (f.properties.potential?.mwp || 0), 0), 0)} MWp.`) : ''} ${t('Outlines and types: © OpenStreetMap contributors, offered under the ODbL; fish ponds are under-mapped.', 'גבולות וסוגים: © תורמי OpenStreetMap, מוצעים לפי ODbL; בריכות דגים ממופות באופן חלקי.')} ${got ? t(`Retrieved ${got}.`, `נשלף ב־${got}.`) : ''} ${t('Research screening, not a feasibility assessment.', 'סינון מחקרי, לא בדיקת היתכנות.')}</p>` : '';
  return `<div class="constraint-toggle water-toggle"><label><input type="checkbox" id="show-water"${on ? ' checked' : ''}> ${t('Show water bodies for floating PV', 'הצגת גופי מים ל-PV צף')}</label>${legend}</div>`;
}
