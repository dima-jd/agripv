// Candidate field panel: the facts first, details folded, every source credited once at the end.
// Information blocks (solar, terrain, sensitivity, grid, planning flags) are not part of the ranking.
import { safeURL, districtLabels } from './map-data.js';
import { kindLabel } from './constraints-overlay.js';
import { LEVELS, BANDS } from './env-overlay.js';
import { VARIANTS, toLocal, layout } from './design/layout.js';
import { recommend, fitLabel } from './design/recommend.js';
const SHADE = { tolerant: ['Tolerates moderate shade', 'עמיד לצל מתון'], moderate: ['Some yield loss under shade', 'אובדן יבול מסוים בצל'], sensitive: ['Shade-sensitive', 'רגיש לצל'], unknown: ['Not enough evidence', 'אין די ראיות'] };
const GROUPS = { maize: ['maize', 'תירס'], grain_legumes: ['grain legumes', 'קטניות'], forages: ['forage', 'מספוא'], leafy_vegetables: ['leafy vegetables', 'ירקות עלים'], fruiting_vegetables: ['fruiting vegetables', 'ירקות פרי'], berries: ['berries', 'פירות יער'], cereals: ['cereals', 'דגנים'], tubers_roots: ['tubers and roots', 'פקעות ושורשים'], fruits: ['fruit trees', 'עצי פרי'] };
const CITE = { laub2022: 'Laub et al. 2022', schweiger2023: 'Schweiger et al. 2023', pataczek2023: 'Pataczek et al. 2023', fraunhofer2017: 'Fraunhofer ISE 2017' };

const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FACTORS = { shape: ['Field shape', 'צורת החלקה'], area: ['Field area', 'שטח החלקה'], record_recency: ['Ministry record recency', 'עדכניות הרשומה במשרד'], attribute_completeness: ['Data completeness', 'שלמות הנתונים'], planning_clearance: ['No overlap with AGRO plans', 'אין חפיפה לתוכניות AGRO'] };
const BAND = { high: ['High', 'גבוהה'], medium: ['Medium', 'בינונית'], early: ['Early', 'ראשונית'] };

/** Readable date in the page language; year-precision dates show the year only. Unknown stays unknown. */
export function fmtDay(value, lang, precision) {
  if (!value) return null;
  const s = String(value).slice(0, 10);
  if (precision === 'year') return s.slice(0, 4);
  const d = new Date(s + 'T12:00:00Z');
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

const link = (url, text) => { const href = safeURL(url); return href ? `<a href="${e(href)}" target="_blank" rel="noopener noreferrer">${e(text)} ↗</a>` : e(text); };

export function candidatePanelHTML(r, lang) {
  const he = lang === 'he', i = he ? 1 : 0, t = (en, h) => he ? h : en, raw = r.raw || {};
  const num = (v, d = 0) => Number(v).toLocaleString(lang, { maximumFractionDigits: d });
  const unknown = t('Unknown', 'לא ידוע');
  const crop = he ? raw.crop : (raw.cropNameEn || raw.crop);
  const district = (r.districtKeys || []).map(k => districtLabels[k]?.[i] || k)[0] || r.district;
  const s = raw.solarResource, tr = raw.terrain, en = raw.environment, g = raw.gridProximity;
  const hits = raw.constraints?.hits || [], flags = hits.filter(h => h.level === 'overlap' || h.check === 'failed');
  const cs = raw.cropShade, rec = recommend(raw.category, cs);
  let ind = null; try { if (r.geometry) { const Lp = layout(toLocal(r.geometry), VARIANTS[rec.primary]); const y = raw.designYield?.[rec.primary]; ind = { k: rec.primary, mwp: Lp.figures.kWp / 1000, gwh: y ? Lp.figures.kWp * y / 1e6 : null }; } } catch { ind = null; }

  // ---- header and at-a-glance facts
  const title = raw.screeningRank ? t(`Screening rank #${num(raw.screeningRank)}`, `דירוג סינון: מקום ${num(raw.screeningRank)}`) : t('Candidate field', 'חלקה מועמדת');
  const sub = [crop, raw.areaDunam != null ? `${num(raw.areaDunam, 1)} ${t('dunam', 'דונם')}` : null, [r.locality, district].filter(Boolean).join(', ')].filter(Boolean).map(e).join(' · ');
  const fact = (label, value, note) => `<div class="fact"><dt>${e(label)}</dt><dd>${value}${note ? `<span>${e(note)}</span>` : ''}</dd></div>`;
  const facts = [
    fact(t('Screening priority', 'עדיפות סינון'), BAND[raw.screeningPriority] ? e(BAND[raw.screeningPriority][i]) : unknown, raw.screeningScore != null ? `${t('score', 'ציון')} ${num(raw.screeningScore, 1)}/100` : null),
    fact(t('Planning flags', 'סימוני תכנון'), flags.length ? e(num(flags.length)) : e(t('None', 'אין')), flags.length ? t('see below', 'פירוט בהמשך') : null),
    fact(t('Solar resource', 'משאב סולארי'), s ? `${e(num(s.pvoutKwhPerKwpYear))}` : unknown, s ? t('kWh per kWp per year', 'קוט״ש לקילוואט שיא בשנה') : null),
    fact(t('Mean slope', 'שיפוע ממוצע'), tr ? `${e(tr.slopeMeanDeg)}°` : unknown, tr ? `${t('elevation', 'גובה')} ${num(tr.elevationMeanM)} ${t('m', 'מ׳')}` : null),
    fact(t('Environmental sensitivity', 'רגישות סביבתית'), en?.sensitivityLevel ? `${e(en.sensitivityLevel)} — ${e(LEVELS[en.sensitivityLevel]?.[he ? 2 : 1])}` : unknown, en ? t('Ministry level, 1–6', 'רמת המשרד, 1–6') : null),
    fact(t('Mapped HV line', 'קו מתח עליון ממופה'), g ? e(BANDS[g.hvLineBand]?.[i]) : unknown, g ? `${t('substation', 'תחנת משנה')} ${BANDS[g.substationBand]?.[i] ?? ''}` : null),
    fact(t('Crop and shade', 'גידול וצל'), cs ? e((SHADE[cs.class] || SHADE.unknown)[i]) : unknown, cs?.group ? `${(GROUPS[cs.group] || [cs.group, cs.group])[i]}${cs.tallTrees ? ' · ' + t('tall trees', 'עצים גבוהים') : ''}` : null),
    fact(t('Indicative design', 'תכנון אינדיקטיבי'), ind ? `${e(ind.k)}. ${num(ind.mwp, 1)} MWp` : unknown, ind ? `${e(VARIANTS[ind.k].name[i])}${ind.gwh ? ' · ~' + num(ind.gwh, 1) + ' GWh/' + t('yr', 'שנה') : ''}` : null),
  ].join('');

  // ---- folded sections
  const sec = (heading, summary, body, open = false) => `<details class="sec"${open ? ' open' : ''}><summary><h3>${e(heading)}</h3><span class="sec-sum">${summary}</span></summary><div class="sec-body">${body}</div></details>`;
  const factors = Array.isArray(raw.screeningFactors) && raw.screeningFactors.length
    ? `<table class="factors"><caption class="sr-only">${t('Score by factor', 'ציון לפי גורם')}</caption><tbody>${raw.screeningFactors.map(f => `<tr><th scope="row">${e((FACTORS[f.code] || [f.code, f.code])[i])}</th><td>${e(f.points)} / ${e(f.maxPoints)}</td></tr>`).join('')}</tbody></table>` : '';
  const recDate = fmtDay(raw.sourceRecordDate || raw.sourceUpdatedAt, lang, raw.sourceRecordDatePrecision);
  const sections = [
    sec(t('Why this rank', 'מה קובע את הדירוג'), raw.screeningScore != null ? `${num(raw.screeningScore, 1)}/100` : '', `${factors}<p class="note">${t('The score ranks fields by how complete and recent the evidence is. It is not a feasibility assessment.', 'הציון מדרג חלקות לפי שלמות הראיות ועדכניותן. הוא אינו בדיקת היתכנות.')}</p>`),
    sec(t('Ministry of Agriculture record', 'הרשומה במשרד החקלאות'), e(crop || unknown),
      `<dl class="kv"><dt>${t('Crop', 'גידול')}</dt><dd>${e(crop || unknown)}</dd><dt>${t('Area', 'שטח')}</dt><dd>${raw.areaDunam != null ? `${e(num(raw.areaDunam, 1))} ${t('dunam', 'דונם')}` : unknown}</dd><dt>${t('Record updated', 'עדכון הרשומה')}</dt><dd>${e(recDate || unknown)}${raw.sourceRecordDatePrecision === 'year' ? ` (${t('year only', 'שנה בלבד')})` : ''}</dd></dl><p class="note">${t('Values as recorded by the Ministry. The update date is when the record changed, not a field visit.', 'הערכים כפי שנרשמו במשרד. תאריך העדכון הוא מועד שינוי הרשומה, לא ביקור בשטח.')}</p>${link(r.url, t('View source dataset', 'למערך נתוני המקור'))}`),
    sec(t('Planning constraints', 'מגבלות תכנוניות'), flags.length ? e(num(flags.length)) : e(t('None', 'אין')),
      `${hits.length ? `<ul class="hits">${hits.map(h => `<li>${e(kindLabel(h.kind, lang))}${h.name ? ' · ' + e(h.name) : ''}${h.shareOfParcel != null ? ` · ${(h.shareOfParcel * 100).toFixed(1)}%` : ''}${h.level === 'edge_contact' ? ` (${t('edge contact', 'נגיעה בשוליים')})` : ''}${h.level === 'crosses' ? ` (${t('crosses the field; the stream bed is excluded, its extent is to check', 'חוצה את החלקה; אפיק הנחל מוחרג, יש לבדוק את התחום')})` : ''}${h.status === 'proposed' ? ` — ${t('proposal in process', 'הצעה בהליך')}` : ''}</li>`).join('')}</ul>` : `<p>${t('None found in TAMA 1 or TAMA 1/26.', 'לא נמצאו בתמ״א 1 או בתמ״א 1/26.')}</p>`}<p class="note">${t('Fields in areas where TAMA 1/24 (s. 3.5.1) does not allow agrivoltaics are already excluded: reserves and parks, forests, coastal and landscape complexes, the coastal environment. Other overlaps are flags to check, not a ruling.', 'חלקות בשטחים שבהם תמ״א 1/24 (סעיף 3.5.1) אינה מתירה אגרו-וולטאיקה כבר הוחרגו: שמורות וגנים, יערות, מכלולי חוף ונוף, הסביבה החופית. חפיפות אחרות הן סימונים לבדיקה, לא הכרעה.')}${raw.constraints?.checkedAt ? ` ${t('Checked', 'נבדק')} ${e(fmtDay(raw.constraints.checkedAt, lang))}.` : ''}</p>`),
    sec(t('Crop compatibility', 'התאמת הגידול'), cs ? e((SHADE[cs.class] || SHADE.unknown)[i]) : unknown,
      `<p>${t('Fit of each concept variant for this crop:', 'התאמת כל חלופת קונספט לגידול זה:')}</p><ul class="hits">${['A', 'B', 'C', 'D', 'E'].map(k => `<li><strong>${k}. ${e(VARIANTS[k].name[i])}</strong>: ${e(fitLabel(rec.fits[k].fit, lang))}${k === rec.primary ? ' · ' + t('recommended', 'מומלץ') : ''}. ${e(rec.fits[k].why[i])}</li>`).join('')}</ul>${cs?.tallTrees ? `<p>${t('Mature trees of this crop can be taller than a 4.5 m structure: check pruning height.', 'עצים בוגרים מגידול זה עלולים להיות גבוהים ממבנה של 4.5 מ׳: יש לבדוק את גובה הגיזום.')}</p>` : ''}<p class="note">${t('Shade classes summarise published evidence, mostly from temperate climates and shade-cloth trials; they are not a yield prediction for this field.', 'סיווגי הצל מסכמים ראיות שפורסמו, בעיקר מאקלים ממוזג ומניסויי רשתות הצללה; אין הם תחזית יבול לחלקה זו.')}${cs?.sources?.length ? ' ' + t('Sources', 'מקורות') + ': ' + e(cs.sources.map(x => CITE[x] || x).join('; ')) + '.' : ''}</p>`),
    sec(t('Solar resource', 'משאב סולארי'), s ? `${e(num(s.pvoutKwhPerKwpYear))} ${t('kWh/kWp', 'קוט״ש לקילוואט שיא')}` : unknown,
      s ? `<p>${t('Annual output of a 1 kWp reference system at the optimal fixed tilt', 'תפוקה שנתית של מערכת ייחוס של 1 קילוואט שיא בזווית קבועה אופטימלית')} (${e(s.optimalTiltDeg)}°), ${t('averaged over about 5 km', 'בממוצע על פני כ-5 ק״מ')}.</p><p class="note">${t('Describes the area’s sunshine, not the yield of an agrivoltaic design.', 'מתאר את הקרינה באזור, לא את התפוקה של מערכת אגרו-וולטאית.')}</p>` : `<p>${unknown}</p>`),
    sec(t('Terrain', 'טופוגרפיה'), tr ? `${e(tr.slopeMeanDeg)}°` : unknown,
      tr ? `<dl class="kv"><dt>${t('Mean slope', 'שיפוע ממוצע')}</dt><dd>${e(tr.slopeMeanDeg)}°</dd><dt>${t('Steepest 10% of the field', '10% התלולים ביותר')}</dt><dd>${e(tr.slopeP90Deg)}°</dd><dt>${t('Steeper than 10%', 'תלול מ-10%')}</dt><dd>${Math.round(tr.shareOver10Pct * 100)}%</dd><dt>${t('North-facing', 'פונה צפונה')}</dt><dd>${Math.round(tr.northFacingShare * 100)}%</dd><dt>${t('Elevation', 'גובה')}</dt><dd>${e(num(tr.elevationMeanM))} ${t('m', 'מ׳')}</dd></dl><p class="note">${t('Steep or north-facing ground usually makes mounting harder and output lower.', 'קרקע תלולה או פונה צפונה מקשה בדרך כלל על ההתקנה ומפחיתה תפוקה.')}</p>` : `<p>${unknown}</p>`),
    sec(t('Environmental sensitivity', 'רגישות סביבתית'), en?.sensitivityLevel ? `${e(en.sensitivityLevel)} — ${e(LEVELS[en.sensitivityLevel]?.[he ? 2 : 1])}` : unknown,
      en ? `<dl class="kv"><dt>${t('Unit covering most of the field', 'היחידה שמכסה את רוב החלקה')}</dt><dd>${e(en.sensitivityUnit || unknown)}</dd>${en.maxLevelInField && en.maxLevelInField !== en.sensitivityLevel ? `<dt>${t('Highest level touching the field', 'הרמה הגבוהה שנוגעת בחלקה')}</dt><dd>${e(en.maxLevelInField)} — ${e(LEVELS[en.maxLevelInField]?.[he ? 2 : 1])}</dd>` : ''}${en.landscapeDivision ? `<dt>${t('Landscape division', 'חטיבת נוף')}</dt><dd>${en.landscapeDivisionLink ? link(en.landscapeDivisionLink, en.landscapeDivision) : e(en.landscapeDivision)}</dd>` : ''}</dl><p class="note">${t('The level is the Ministry’s, unchanged. A preliminary screening indicator, not an environmental assessment.', 'הרמה היא של המשרד, ללא שינוי. מדד סינון ראשוני, לא הערכה סביבתית.')}</p>` : `<p>${t('Unknown: outside the Ministry units.', 'לא ידוע: מחוץ ליחידות המשרד.')}</p>`),
    sec(t('Grid proximity', 'קרבה לרשת'), g ? e(BANDS[g.hvLineBand]?.[i]) : unknown,
      g ? `<dl class="kv"><dt>${t('Mapped HV line (≥110 kV)', 'קו מתח עליון ממופה (≥110 ק״ו)')}</dt><dd>${e(BANDS[g.hvLineBand]?.[i])}</dd><dt>${t('Mapped substation (≥110 kV)', 'תחנת משנה ממופה (≥110 ק״ו)')}</dt><dd>${e(BANDS[g.substationBand]?.[i])}</dd></dl><p class="note">${t('Distance to mapped infrastructure only. It says nothing about available capacity and is not a connection offer, reservation or approval; feasibility is decided with the network operator.', 'מרחק לתשתית ממופה בלבד. אין בו מידע על קיבולת פנויה, והוא אינו הצעת חיבור, שריון או אישור; ההיתכנות נקבעת מול מפעיל הרשת.')}</p>` : `<p>${unknown}</p>`),
  ].join('');

  // ---- sources and notices, once
  const credits = [
    t('Field record: Israel Ministry of Agriculture and Food Security, “Agricultural parcels for analysis”.', 'רשומת החלקה: משרד החקלאות וביטחון המזון, “Agricultural parcels for analysis”.'),
    t('Planning constraints: Israel Planning Administration (מינהל התכנון), TAMA 1, TAMA 35 and TAMA 1/26, applied per TAMA 1/24; for binding information use Mavat.', 'מגבלות תכנוניות: מינהל התכנון, תמ״א 1, תמ״א 35 ותמ״א 1/26, לפי תמ״א 1/24; למידע מחייב יש לפנות למבא״ת.'),
    'Data and calculations based on PVGIS – © European Union, Joint Research Centre.',
    'Produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved. The organisations in charge of the Copernicus programme by law or by delegation do not incur any liability for any use of the Copernicus WorldDEM-30.',
    t('Source: Israel Ministry of Environmental Protection (המשרד להגנת הסביבה). Geographic data reproduced for research and informational purposes.', 'מקור: המשרד להגנת הסביבה. הנתונים הגאוגרפיים מוצגים למטרות מחקר ומידע.'),
    t('Grid distances: © OpenStreetMap contributors (ODbL).', 'מרחקי רשת: © OpenStreetMap contributors (ODbL).'),
  ];
  const notice = t('Preliminary research by SPFI, an independent research initiative. Not an official agricultural, agrivoltaic or environmental assessment, and not affiliated with or endorsed by any of the bodies above. It does not replace statutory planning procedures, site-specific assessments or the network operator’s procedures. Suitability, ownership consent, permits and grid connection have not been established.', 'מחקר ראשוני של SPFI, יוזמת מחקר עצמאית. אינו הערכה חקלאית, אגרו-וולטאית או סביבתית רשמית, ואינו קשור לאף אחד מהגופים שלמעלה או מאושר על ידם. אינו מחליף הליכי תכנון סטטוטוריים, הערכה פרטנית לאתר או הליכי מפעיל הרשת. לא נקבעו התאמה, הסכמת בעלים, היתרים או חיבור לרשת.');

  return `<span class="tag">${t('Candidate field', 'חלקה מועמדת')}</span><h2 id="detail-title">${e(title)}</h2><p class="detail-sub">${sub}</p>
  <dl class="glance">${facts}</dl>
  <p class="glance-note">${t('A screening result, not an approved or feasible project. Only the priority comes from the ranking; the other facts are information.', 'תוצאת סינון, לא פרויקט מאושר או בר-ביצוע. רק העדיפות נובעת מהדירוג; שאר הנתונים הם מידע.')}</p>
  <p class="design-link"><a href="./design/?id=${encodeURIComponent(r.id)}&lang=${lang}">${t('Concept designs: three agrivoltaic layouts for this field', 'תכנוני קונספט: שלוש פריסות אגרו-וולטאיות לחלקה זו')} ↗</a></p>
  ${sections}
  <section class="credits" aria-labelledby="credits-title"><h3 id="credits-title">${t('Sources and notices', 'מקורות והבהרות')}</h3><ul>${credits.map(c => `<li>${e(c)}</li>`).join('')}</ul><p>${e(notice)}</p></section>`;
}
