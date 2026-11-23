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
    f.D = { fit: tall ? 'possible' : 'good', why: ['Poles on a grid between the trees; tables track the sun, so shade moves across the canopy.', 'עמודים ברשת בין העצים; השולחנות עוקבים אחר השמש, והצל נע על פני הצמרת.'] };
    f.E = { fit: 'poor', why: ['A greenhouse replaces the orchard; not a dual use of this land.', 'חממה מחליפה את המטע; אין זה שימוש כפול בקרקע זו.'] };
    f.C = { fit: 'poor', why: ['Vertical rows need open lanes between them, which an orchard does not have.', 'שורות אנכיות דורשות מעברים פתוחים ביניהן, ובמטע אין כאלה.'] };
    return { primary: 'B', fits: f };
  }
  if (cls === 'sensitive') {
    f.C = { fit: 'good', why: ['Vertical rows cover about 3% of the ground, so this shade-sensitive crop keeps most of its light.', 'שורות אנכיות מכסות כ-3% מהקרקע, כך שגידול רגיש לצל זה שומר על רוב האור.'] };
    f.A = { fit: 'poor', why: ['About 30% panel cover; published evidence shows strong yield losses for this crop group even at low shade.', 'כיסוי של כ-30%; הראיות שפורסמו מראות אובדן יבול חזק לקבוצת גידולים זו גם בצל נמוך.'] };
    f.D = { fit: 'poor', why: ['Up to 30% cover over a shade-sensitive crop, although the shade moves.', 'עד 30% כיסוי מעל גידול רגיש לצל, אף שהצל נע.'] };
    f.E = { fit: 'poor', why: ['Shade-sensitive crops under a partly shaded greenhouse roof.', 'גידולים רגישים לצל תחת גג חממה מוצל חלקית.'] };
    f.B = { fit: 'poor', why: ['Built for orchards; about 30% cover over a shade-sensitive field crop.', 'מיועד למטעים; כיסוי של כ-30% מעל גידול שדה רגיש לצל.'] };
    return { primary: 'C', fits: f };
  }
  if (cls === 'moderate') {
    f.A = { fit: 'good', why: ['Up to 30% cover. Trials report losses around 18–19% for cereals and potatoes under such systems; more energy per dunam.', 'עד 30% כיסוי. ניסויים מדווחים על אובדן של כ-18–19% בדגנים ובתפוחי אדמה תחת מערכות כאלה; יותר אנרגיה לדונם.'] };
    f.C = { fit: 'good', why: ['About 3% cover: less shade on the crop, less energy per dunam.', 'כ-3% כיסוי: פחות צל על הגידול, פחות אנרגיה לדונם.'] };
    f.D = { fit: 'possible', why: ['Shade moves with the trackers; poles on a grid leave lanes for machinery.', 'הצל נע עם העוקבים; העמודים ברשת משאירים מעברים למיכון.'] };
    f.E = { fit: 'poor', why: ['Cereals and tubers are not greenhouse crops.', 'דגנים ופקעות אינם גידולי חממה.'] };
    f.B = { fit: 'possible', why: ['Works over field crops (lower edge 3.5 m), but it is designed for orchards.', 'מתאים גם מעל גידולי שדה (קצה תחתון 3.5 מ׳), אך מיועד למטעים.'] };
    return { primary: 'A', fits: f };
  }
  f.A = { fit: 'good', why: cls === 'tolerant' ? ['This crop group tolerates moderate shade; up to 30% cover with machinery underneath.', 'קבוצת גידולים זו עמידה לצל מתון; עד 30% כיסוי ומיכון מתחת.'] : ['Up to 30% cover with machinery underneath; shade tolerance of this crop is not established.', 'עד 30% כיסוי ומיכון מתחת; עמידות הגידול לצל אינה ידועה.'] };
  f.C = { fit: 'good', why: ['About 3% cover with wide machinery lanes.', 'כ-3% כיסוי עם מעברים רחבים למיכון.'] };
  f.B = { fit: 'possible', why: ['Works over field crops, but it is designed for orchards.', 'מתאים גם מעל גידולי שדה, אך מיועד למטעים.'] };
  f.D = { fit: 'possible', why: ['Shade moves with the trackers; poles on a grid leave lanes for machinery.', 'הצל נע עם העוקבים; העמודים ברשת משאירים מעברים למיכון.'] };
  const veg = ['leafy_vegetables', 'fruiting_vegetables', 'berries'].includes(shade?.group) || /פרחים/.test(category || '');
  f.E = { fit: veg ? 'possible' : 'poor', why: veg ? ['Vegetables, berries and flowers are grown in greenhouses; this turns open land into covered cultivation (TAMA 1 PV chapter, s. 5.1.5).', 'ירקות, פירות יער ופרחים גדלים בחממות; זה הופך שטח פתוח לגידול מכוסה (פרק המתקנים הפוטו-וולטאיים בתמ״א 1, סעיף 5.1.5).'] : ['Not a typical greenhouse crop.', 'אינו גידול חממה טיפוסי.'] };
  return { primary: 'A', fits: f };
}
