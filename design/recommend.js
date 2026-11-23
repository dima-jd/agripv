// Which design variants suit a field, from its crop type (Ministry category) and crop shade class
// (spfi-lab config/crop-shade.json). Indicative: evidence is mostly from temperate climates and shade-cloth trials.
export const isFieldCrop = category => /גד"ש|גידולי שדה/.test(category || '');

const R = {
  good: ['Suits', 'מתאים'], possible: ['Possible', 'אפשרי'], poor: ['Not recommended', 'לא מומלץ'],
};
export const fitLabel = (fit, lang) => R[fit][lang === 'he' ? 1 : 0];

/** Returns { primary, fits: { A|B|C: { fit, why:[en,he] } } } */
export function recommend(category, shade) {
  const field = isFieldCrop(category), cls = shade?.class ?? 'unknown', tall = !!shade?.tallTrees;
  const f = {};
  if (!field) {
    f.B = { fit: 'good', why: tall ? ['High tracker above the tree rows; mature trees of this crop can exceed 4.5 m, so check pruning height.', 'עוקב גבוה מעל שורות העצים; עצים בוגרים מגידול זה עלולים לעבור 4.5 מ׳, יש לבדוק את גובה הגיזום.'] : ['High tracker above the tree rows, with light moving across the canopy during the day.', 'עוקב גבוה מעל שורות העצים, והאור נע על פני הצמרת במהלך היום.'] };
    f.A = { fit: tall ? 'possible' : 'good', why: ['Fixed tables above the trees; shade is static, so it falls on the same trees all day.', 'שולחנות קבועים מעל העצים; הצל קבוע ונופל על אותם עצים כל היום.'] };
    f.C = { fit: 'poor', why: ['Vertical rows need open lanes between them, which an orchard does not have.', 'שורות אנכיות דורשות מעברים פתוחים ביניהן, ובמטע אין כאלה.'] };
    return { primary: 'B', fits: f };
  }
  if (cls === 'sensitive') {
    f.C = { fit: 'good', why: ['Vertical rows cover about 3% of the ground, so this shade-sensitive crop keeps most of its light.', 'שורות אנכיות מכסות כ-3% מהקרקע, כך שגידול רגיש לצל זה שומר על רוב האור.'] };
    f.A = { fit: 'poor', why: ['About 30% panel cover; published evidence shows strong yield losses for this crop group even at low shade.', 'כיסוי של כ-30%; הראיות שפורסמו מראות אובדן יבול חזק לקבוצת גידולים זו גם בצל נמוך.'] };
    f.B = { fit: 'poor', why: ['Built for orchards; about 30% cover over a shade-sensitive field crop.', 'מיועד למטעים; כיסוי של כ-30% מעל גידול שדה רגיש לצל.'] };
    return { primary: 'C', fits: f };
  }
  if (cls === 'moderate') {
    f.A = { fit: 'good', why: ['Up to 30% cover. Trials report losses around 18–19% for cereals and potatoes under such systems; more energy per dunam.', 'עד 30% כיסוי. ניסויים מדווחים על אובדן של כ-18–19% בדגנים ובתפוחי אדמה תחת מערכות כאלה; יותר אנרגיה לדונם.'] };
    f.C = { fit: 'good', why: ['About 3% cover: less shade on the crop, less energy per dunam.', 'כ-3% כיסוי: פחות צל על הגידול, פחות אנרגיה לדונם.'] };
    f.B = { fit: 'possible', why: ['Works over field crops (lower edge 3.5 m), but it is designed for orchards.', 'מתאים גם מעל גידולי שדה (קצה תחתון 3.5 מ׳), אך מיועד למטעים.'] };
    return { primary: 'A', fits: f };
  }
  f.A = { fit: 'good', why: cls === 'tolerant' ? ['This crop group tolerates moderate shade; up to 30% cover with machinery underneath.', 'קבוצת גידולים זו עמידה לצל מתון; עד 30% כיסוי ומיכון מתחת.'] : ['Up to 30% cover with machinery underneath; shade tolerance of this crop is not established.', 'עד 30% כיסוי ומיכון מתחת; עמידות הגידול לצל אינה ידועה.'] };
  f.C = { fit: 'good', why: ['About 3% cover with wide machinery lanes.', 'כ-3% כיסוי עם מעברים רחבים למיכון.'] };
  f.B = { fit: 'possible', why: ['Works over field crops, but it is designed for orchards.', 'מתאים גם מעל גידולי שדה, אך מיועד למטעים.'] };
  return { primary: 'A', fits: f };
}
