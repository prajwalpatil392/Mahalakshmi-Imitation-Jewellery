const fs = require('fs');
const p = 'public/js/mahalakshmi-admin.js';
let c = fs.readFileSync(p, 'utf8');
// Em dash mojibake: â€" (U+E2 U+20AC U+201D) -> —
c = c.split('\u00E2\u20AC\u201D').join('\u2014');
// Emoji mojibake - 4-char F0 178 xx xx patterns
const emojiFixes = [
  ['\u00F0\u0178\u201C\u00BF', '\uD83D\uDCBF'],   // 💿
  ['\u00F0\u0178\u2018\u201A', '\uD83D\uDC8D'],   // 💍
  ['\u00F0\u0178\u201D\u00AE', '\uD83D\uDC8E'],   // 💎
  ['\u00F0\u0178\u201C\u00AD', '\uD83D\uDCEB'],   // 📋 (clipboard)
  ['\u00F0\u0178\u2019\u00AC', '\uD83D\uDCAC'],   // 💬 (speech)
  ['\u00F0\u0178\u201C\u2026', '\uD83D\uDCC5'],   // 📅 (calendar)
];
for (const [bad, good] of emojiFixes) {
  c = c.split(bad).join(good);
}
// Fix comment lines - â"€ (U+E2 U+201D U+20AC) mojibake for box drawing
const commentMojibake = '\u00E2\u201D\u20AC';
while (c.includes(commentMojibake)) {
  c = c.split(commentMojibake).join('-');
}
fs.writeFileSync(p, c, 'utf8');
console.log('Done');
