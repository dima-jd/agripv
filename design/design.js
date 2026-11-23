// Concept design page: three agrivoltaic variants for one candidate field.
// URL: design/?id=agripv-parcel-<ID>&v=A|B|C&lang=en|he. Concept for research, not for construction.
import { VARIANTS, MODULE, SETBACK, PAD, COVER_MAX, toLocal, layout, sectionOf, heightCheck, components } from './layout.js';
import { planSVG, sectionSVG } from './draw.js';

const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const params = new URLSearchParams(location.search);
let lang = params.get('lang') === 'he' ? 'he' : 'en';
let variantKey = ['A', 'B', 'C'].includes(params.get('v')) ? params.get('v') : null;
const id = params.get('id') || '';
const t = (en, he) => lang === 'he' ? he : en;
const m = () => t(' m', ' מ׳');
const num = (v, d = 0) => Number(v).toLocaleString(lang === 'he' ? 'he-IL' : 'en-GB', { maximumFractionDigits: d, minimumFractionDigits: d });
const LANES = { BANDS: { lt1km: ['under 1 km', 'פחות מ-1 ק״מ'], '1to3km': ['1–3 km', '1–3 ק״מ'], '3to10km': ['3–10 km', '3–10 ק״מ'], gt10km: ['over 10 km', 'מעל 10 ק״מ'], lt5km: ['under 5 km', 'פחות מ-5 ק״מ'], '5to15km': ['5–15 km', '5–15 ק״מ'], gt15km: ['over 15 km', 'מעל 15 ק״מ'] } };

let field = null, local = null;

async function load() {
  const r = await fetch('../data/candidates.json');
  if (!r.ok) throw new Error('data');
  const d = await r.json();
  field = d.features.find(f => f.properties.candidateId === id);
  if (field) local = toLocal(field.geometry);
}

const isFieldCrop = p => /גד"ש|גידולי שדה/.test(p.category || '');
const suits = (k, fieldCrop) => fieldCrop ? (k === 'A' || k === 'C') : (k === 'B' || k === 'A');

function sync() {
  const u = new URL(location.href);
  u.searchParams.set('lang', lang); if (variantKey) u.searchParams.set('v', variantKey);
  history.replaceState(null, '', u.href);
}

function render() {
  document.documentElement.lang = lang; document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  const back = document.getElementById('back-map');
  back.href = `../?lang=${lang}&layer=candidates${id ? '&record=' + encodeURIComponent(id) : ''}`;
  back.textContent = t('← Back to map', '→ חזרה למפה');
  document.getElementById('brand').href = `../?lang=${lang}`;
  const lt = document.getElementById('lang-toggle'); lt.textContent = lang === 'he' ? 'English' : 'עברית'; lt.onclick = () => { lang = lang === 'he' ? 'en' : 'he'; sync(); render(); };
  const main = document.getElementById('design-main');
  if (!field) {
    document.title = t('Concept designs — AgriPV Israel', 'תכנוני קונספט — AgriPV ישראל');
    main.innerHTML = `<h1>${t('Field not found', 'החלקה לא נמצאה')}</h1><p>${t('Concept designs exist for the 500 published candidate fields. Open a candidate field on the map and choose “Concept designs”.', 'תכנוני קונספט קיימים ל-500 החלקות המועמדות שפורסמו. פתחו חלקה מועמדת במפה ובחרו "תכנוני קונספט".')}</p>`;
    return;
  }
  const p = field.properties, fieldCrop = isFieldCrop(p);
  variantKey ??= fieldCrop ? 'A' : 'B';
  const v = VARIANTS[variantKey];
  const L = layout(local, v);
  const F = L.figures, sec = sectionOf(v), hc = heightCheck(v, fieldCrop), comp = components(F, v);
  const yieldK = p.designYield?.[variantKey] ?? null;
  const mwh = yieldK ? F.kWp * yieldK / 1000 : null;
  const crop = lang === 'he' ? p.crop : (p.cropNameEn || p.crop);
  document.title = t(`Concept designs · screening rank #${p.screeningRank} — AgriPV Israel`, `תכנוני קונספט · מקום ${p.screeningRank} בדירוג — AgriPV ישראל`);

  const all = ['A', 'B', 'C'].map(k => { const Lk = layout(local, VARIANTS[k]), sk = sectionOf(VARIANTS[k]), yk = p.designYield?.[k] ?? null; return { k, L: Lk, s: sk, mwh: yk ? Lk.figures.kWp * yk / 1000 : null }; });
  const compare = `<div class="compare-wrap"><table class="compare"><caption>${t('All three variants on this field', 'שלוש החלופות בחלקה זו')}</caption><thead><tr><th scope="col">${t('Variant', 'חלופה')}</th><th scope="col">${t('Capacity', 'הספק')}</th><th scope="col">${t('Output per year', 'תפוקה שנתית')}</th><th scope="col">${t('Panel cover', 'כיסוי')}</th><th scope="col">${t('Heights', 'גבהים')}</th><th scope="col">${t('Crop fit', 'התאמה לגידול')}</th></tr></thead><tbody>${all.map(a => `<tr${a.k === variantKey ? ' class="cur"' : ''}><th scope="row">${a.k}. ${e(VARIANTS[a.k].name[lang === 'he' ? 1 : 0])}</th><td>${num(a.L.figures.kWp / 1000, 1)} MWp</td><td>${a.mwh ? num(a.mwh / 1000, 1) + ' GWh' : t('unknown', 'לא ידוע')}</td><td>${num(a.L.figures.cover * 100, 1)}%</td><td>${num(a.s.lowerEdge, 1)}–${num(a.s.top, 1)}${m()}</td><td>${suits(a.k, fieldCrop) ? t('suits', 'מתאים') : '—'}</td></tr>`).join('')}</tbody></table></div>`;
  const tabs = ['A', 'B', 'C'].map(k => `<button type="button" role="tab" class="v-tab${k === variantKey ? ' active' : ''}" aria-selected="${k === variantKey}" data-v="${k}"><span class="v-key">${k}</span><span class="v-name">${e(VARIANTS[k].name[lang === 'he' ? 1 : 0])}</span>${suits(k, fieldCrop) ? `<span class="v-fit">${t('suits this crop', 'מתאים לגידול')}</span>` : ''}</button>`).join('');
  const fig = (label, value, note) => `<div class="fact"><dt>${e(label)}</dt><dd>${value}${note ? `<span>${e(note)}</span>` : ''}</dd></div>`;
  const facts = [
    fig(t('Capacity', 'הספק'), `${num(F.kWp / 1000, 1)} MWp`, `${num(F.modules)} ${t('modules', 'פאנלים')} · ~${MODULE.wp} Wp`),
    fig(t('Expected output', 'תפוקה צפויה'), mwh ? `${num(mwh / 1000, 1)} GWh/${t('yr', 'שנה')}` : t('unknown', 'לא ידוע'), yieldK ? `${num(yieldK)} kWh/kWp · PVGIS` : null),
    fig(t('Panel cover', 'כיסוי פאנלים'), `${num(F.cover * 100, 1)}%`, t(`of the cultivated area (limit ${COVER_MAX * 100}%)`, `מהשטח המעובד (מגבלה ${COVER_MAX * 100}%)`)),
    fig(t('Rows and pitch', 'שורות ומרווח'), `${num(F.rowCount)} × ${num(L.pitch, 1)}${m()}`, `${num(F.rowLength / 1000, 2)} km ${t('of rows', 'שורות')}`),
    fig(t('Heights', 'גבהים'), `${num(sec.lowerEdge, 1)}–${num(sec.top, 1)}${m()}`, v.key === 'B' ? `${t('axis', 'ציר')} ${num(sec.axis, 1)}${m()} · ±${v.maxRotation}°` : v.key === 'A' ? `${t('tilt', 'הטיה')} ${v.tilt}°` : t('vertical', 'אנכי')),
    fig(t('Land kept in farming', 'שטח שנשאר בעיבוד'), `${num((1 - F.underPanels / F.fieldArea) * 100, 0)}%`, t('of the field is not under panels', 'מהחלקה אינו מתחת לפאנלים')),
  ].join('');

  const ruleText = hc.rule === 'vertical' ? t('Vertical systems are exempt from the minimum-height rules (TAMA 1/24 s. 3.6.1.3).', 'מתקנים אנכיים פטורים מכללי הגובה המינימלי (תמ״א 1/24 סעיף 3.6.1.3).')
    : hc.rule === 'field' ? t(`Field crops: the lowest panel edge must be at least 1.5 m (TAMA 1/24 s. 3.6.1.2). Here: ${num(hc.value, 1)} m.`, `גידולי שדה: קצה הפאנל התחתון בגובה 1.5 מ׳ לפחות (תמ״א 1/24 סעיף 3.6.1.2). כאן: ${num(hc.value, 1)} מ׳.`)
      : t(`Orchards and other crops: the mounting axis must be at least 4.5 m (TAMA 1/24 s. 3.6.1.1). Here: ${num(hc.value, 1)} m.`, `מטעים וגידולים אחרים: ציר המתקן בגובה 4.5 מ׳ לפחות (תמ״א 1/24 סעיף 3.6.1.1). כאן: ${num(hc.value, 1)} מ׳.`);

  const g = p.gridProximity;
  const conn = comp.acKw <= 300 ? t('likely low voltage', 'ככל הנראה מתח נמוך') : comp.acKw <= 15000 ? t('likely medium voltage (distribution, 22/33 kV)', 'ככל הנראה מתח גבוה (חלוקה, 22/33 ק״ו)') : t('likely high voltage (transmission)', 'ככל הנראה מתח עליון (הולכה)');
  const structure = { A: t('Steel portal frames carrying two-module-high tables; posts about every 6.8 m along each row', 'מסגרות פלדה הנושאות שולחנות בגובה שני פאנלים; עמודים כל כ-6.8 מ׳ לאורך כל שורה'), B: t('Single-axis trackers with a slew drive per row; posts about every 7 m', 'עוקבים חד-ציריים עם מנוע סיבוב לכל שורה; עמודים כל כ-7 מ׳'), C: t('Vertical frames holding two landscape modules; posts about every 4.8 m', 'מסגרות אנכיות הנושאות שני פאנלים לרוחב; עמודים כל כ-4.8 מ׳') }[variantKey];

  main.innerHTML = `
  <p class="concept-flag" role="note"><strong>${t('Concept for research, not for construction.', 'קונספט למחקר, לא לביצוע.')}</strong> ${t('Generic layout from the field outline and the national AgriPV plan’s rules. A real design needs a licensed engineer, a site survey, the landowner and the network operator.', 'פריסה כללית לפי גבול החלקה וכללי התוכנית הארצית לאגרו-וולטאיקה. תכנון אמיתי דורש מהנדס מוסמך, סקר אתר, את בעל הקרקע ואת מפעיל הרשת.')}</p>
  <h1>${t('Concept designs', 'תכנוני קונספט')}</h1>
  <p class="design-sub">${t(`Screening rank #${p.screeningRank}`, `מקום ${p.screeningRank} בדירוג הסינון`)} · ${e(crop)} · ${num(p.areaDunam, 1)} ${t('dunam', 'דונם')} · ${e(p.locality || '')}</p>
  ${compare}
  <div class="v-tabs" role="tablist" aria-label="${t('Design variant', 'חלופת תכנון')}">${tabs}</div>
  <section class="v-panel" role="tabpanel" aria-labelledby="v-title">
    <h2 id="v-title">${variantKey}. ${e(v.name[lang === 'he' ? 1 : 0])}</h2>
    <p class="v-desc">${e(v.describe[lang === 'he' ? 1 : 0])}</p>
    <div class="drawings">
      <figure class="drawing plan"><figcaption>${t('Plan view on the field', 'מבט על החלקה')}</figcaption>${planSVG(local, L, t)}
        <ul class="d-legend"><li><span class="sw row"></span>${t('Panel rows', 'שורות פאנלים')}</li><li><span class="sw plot"></span>${t('Control plot (no panels)', 'חלקת ביקורת (ללא פאנלים)')}</li><li><span class="sw pad"></span>${t('Equipment pad', 'משטח ציוד')}</li><li><span class="sw edge"></span>${t(`${SETBACK} m access strip inside the boundary`, `רצועת גישה של ${SETBACK} מ׳ לאורך הגבול`)}</li></ul></figure>
      <div class="side"><figure class="drawing section"><figcaption>${t('Cross-section, to scale', 'חתך, בקנה מידה')}</figcaption>${sectionSVG(v, L, t)}<p class="d-note">${e(ruleText)}</p></figure>
      <dl class="glance">${facts}</dl></div>
    </div>
    <div class="cols">
      <section><h3>${t('Components (generic)', 'רכיבים (כללי)')}</h3><ul class="kvlist">
        <li><strong>${num(F.modules)}</strong> ${t(`bifacial modules, ~${MODULE.wp} Wp class, ${MODULE.long} × ${MODULE.short} m`, `פאנלים דו-פניים, בסדר גודל של ${MODULE.wp} וואט, ${MODULE.long} × ${MODULE.short} מ׳`)}</li>
        <li><strong>${num(F.posts)}</strong> ${t('posts', 'עמודים')} · ${e(structure)}</li>
        <li><strong>${num(comp.inverters)}</strong> ${t(`string inverters, ~100 kW class (about ${num(comp.acKw / 1000, 1)} MW AC at a DC/AC ratio of 1.2)`, `ממירי מחרוזות בסדר גודל של 100 קילוואט (כ-${num(comp.acKw / 1000, 1)} מגה-וואט AC ביחס DC/AC של 1.2)`)}</li>
        ${comp.mv ? `<li><strong>${num(comp.stations)}</strong> ${t(`medium-voltage transformer stations (about ${num(comp.transformerMva, 1)} MVA in total)`, `תחנות שנאים במתח גבוה (כ-${num(comp.transformerMva, 1)} MVA בסך הכל)`)}</li>` : ''}
        <li>${t('DC and AC cabling, monitoring and the equipment pad; no perimeter fence (TAMA 1/24 s. 3.1.3 allows fencing only around operational structures)', 'כבלי DC ו-AC, ניטור ומשטח ציוד; ללא גדר היקפית (תמ״א 1/24 סעיף 3.1.3 מתיר גידור רק סביב מבנים תפעוליים)')}</li>
      </ul></section>
      <section><h3>${t('Grid connection (indicative)', 'חיבור לרשת (אינדיקטיבי)')}</h3><ul class="kvlist">
        <li>${t('System size', 'גודל המערכת')}: <strong>${num(comp.acKw / 1000, 1)} MW AC</strong> · ${e(conn)}</li>
        <li>${t('Mapped HV line (≥110 kV)', 'קו מתח עליון ממופה (≥110 ק״ו)')}: <strong>${g ? e(LANES.BANDS[g.hvLineBand]?.[lang === 'he' ? 1 : 0]) : t('unknown', 'לא ידוע')}</strong> · ${t('substation', 'תחנת משנה')}: <strong>${g ? e(LANES.BANDS[g.substationBand]?.[lang === 'he' ? 1 : 0]) : t('unknown', 'לא ידוע')}</strong></li>
      </ul><p class="d-note">${t('Distances to mapped infrastructure only (OpenStreetMap). This says nothing about available capacity and is not a connection offer, reservation or approval; the voltage level and point of connection are set by the network operator.', 'מרחקים לתשתית ממופה בלבד (OpenStreetMap). אין בכך מידע על קיבולת פנויה, ואין זו הצעת חיבור, שריון או אישור; מתח החיבור ונקודת החיבור נקבעים על ידי מפעיל הרשת.')}</p></section>
    </div>
    <details class="assumptions"><summary>${t('Assumptions and limits', 'הנחות ומגבלות')}</summary><ul>
      <li>${t('Layout: rows clipped to the field outline with a', 'פריסה: שורות בתוך גבול החלקה, עם')} ${SETBACK} ${t('m access strip; a control plot of 2% of the cultivated area (at least 1 dunam, TAMA 1/24 s. 3.2.5) and a', 'מ׳ רצועת גישה; חלקת ביקורת של 2% מהשטח המעובד (לפחות דונם, תמ״א 1/24 סעיף 3.2.5) ו')} ${PAD.w} × ${PAD.d} ${t('m equipment pad are kept free of panels.', 'מ׳ משטח ציוד ללא פאנלים.')}</li>
      <li>${t('Panel cover is the panels’ horizontal projection (trackers at their flattest) over the cultivated area, which excludes the access strip, the control plot and the pad.', 'כיסוי הפאנלים הוא ההיטל האופקי של הפאנלים (עוקבים במצבם המאוזן ביותר) ביחס לשטח המעובד, ללא רצועת הגישה, חלקת הביקורת ומשטח הציוד.')}</li>
      <li>${t('Output: PVGIS-SARAH3 for this ~5 km area, 14% system loss. B is PVGIS’s ideal tracker (no rotation limit or row shading), an upper estimate. C combines east- and west-facing vertical yield with a bifacial gain of 0.75. Row-to-row shading is not modelled.', 'תפוקה: PVGIS-SARAH3 לאזור של כ-5 ק״מ, 14% הפסדי מערכת. חלופה B היא עוקב אידיאלי של PVGIS (ללא מגבלת סיבוב והצללה בין שורות), הערכה עליונה. חלופה C משלבת תפוקה אנכית מזרחית ומערבית עם רווח דו-פני של 0.75. הצללה בין שורות אינה ממודלת.')}</li>
      <li>${t('Crop fit is from the Ministry record (field crops vs orchards), not from shade-tolerance data. Terrain, soil, drainage, land rights, permits and grid capacity are not assessed.', 'ההתאמה לגידול לפי רשומת משרד החקלאות (גידולי שדה מול מטעים), לא לפי נתוני עמידות לצל. טופוגרפיה, קרקע, ניקוז, זכויות בקרקע, היתרים וקיבולת רשת לא נבדקו.')}</li>
    </ul></details>
    <p class="actions"><button type="button" id="print">${t('Print this concept sheet', 'הדפסת גיליון הקונספט')}</button> <a href="../?lang=${lang}&layer=candidates&record=${encodeURIComponent(id)}">${t('Field details on the map', 'פרטי החלקה במפה')}</a></p>
    <p class="credits">${t('Field outline: Israel Ministry of Agriculture and Food Security. Rules: Israel Planning Administration (מינהל התכנון), TAMA 1/24; for binding information use Mavat. Data and calculations based on PVGIS – © European Union, Joint Research Centre. Grid distances © OpenStreetMap contributors (ODbL). Preliminary research by SPFI, an independent research initiative, not affiliated with or endorsed by any of these bodies.', 'גבול החלקה: משרד החקלאות וביטחון המזון. כללים: מינהל התכנון, תמ״א 1/24; למידע מחייב יש לפנות למבא״ת. הנתונים והחישובים מבוססים על PVGIS – © האיחוד האירופי, המרכז המשותף למחקר. מרחקי רשת © OpenStreetMap contributors (ODbL). מחקר ראשוני של SPFI, יוזמת מחקר עצמאית שאינה קשורה לגופים אלה ואינה מאושרת על ידם.')}</p>
  </section>`;
  main.querySelectorAll('.v-tab').forEach(b => b.onclick = () => { variantKey = b.dataset.v; sync(); render(); main.querySelector('.v-tab.active')?.focus(); });
  main.querySelector('#print').onclick = () => window.print();
}

try { await load(); } catch { document.getElementById('design-main').innerHTML = '<p>Data could not be loaded. / לא ניתן לטעון את הנתונים.</p>'; }
sync(); render();
