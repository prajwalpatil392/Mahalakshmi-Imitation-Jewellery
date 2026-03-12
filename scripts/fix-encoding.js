#!/usr/bin/env node
// Fix UTF-8 mojibake: file was saved with UTF-8 bytes interpreted as Windows-1252
const fs = require('fs');
const path = require('path');

// Mojibake fix: [hex bytes of bad string when file read as utf8, replacement]
// Common pattern: UTF-8 emoji bytes F0 9F xx xx -> misinterpreted as 4 Latin-1 chars
const FIXES = [
  // Rupee, em dash, times, middot, arrow
  [Buffer.from([0xE2, 0x80, 0xB9]), '\u20B9'],  // â‚¹ -> ₹
  [Buffer.from([0xE2, 0x80, 0x94]), '\u2014'],  // â€" -> —
  [Buffer.from([0xC3, 0x97]), '\u00D7'],        // Ã— -> ×
  [Buffer.from([0xC2, 0xB7]), '\u00B7'],        // Â· -> ·
  [Buffer.from([0xE2, 0x86, 0x92]), '\u2192'],  // â†' -> →
  [Buffer.from([0xE2, 0x9C, 0x95]), '\u2715'],  // âœ• -> ✕
  [Buffer.from([0xE2, 0x98, 0xB0]), '\u2630'],  // â˜° -> ☰
  [Buffer.from([0xE2, 0x9A, 0xA0]), '\u26A0'],  // âš  -> ⚠
  [Buffer.from([0xE2, 0x9C, 0x93]), '\u2713'],  // âœ" -> ✓
  [Buffer.from([0xE2, 0x9C, 0x97]), '\u2717'],  // âœ— -> ✗
  [Buffer.from([0xE2, 0x88, 0x92]), '\u2212'],  // âˆ' -> −
  [Buffer.from([0xE2, 0x9C, 0x89]), '\u2709'],  // âœ‰ -> ✉ (part of ✉️)
  // Emoji mojibake: F0 9F xx xx read as CP1252 -> 4 chars, then UTF-8 encoded
  // Pattern: C3 B0 C5 B8 (ðŸ) + 2 bytes for 3rd and 4th char
  [Buffer.from([0xC3, 0xB0, 0xC5, 0xB8, 0xE2, 0x80, 0x9A, 0xC2, 0xBF]), '\uD83D\uDCBF'],  // 💿
  [Buffer.from([0xC3, 0xB0, 0xC5, 0xB8, 0xE2, 0x80, 0x98, 0xE2, 0x80, 0x98]), '\uD83D\uDC51'],  // 👑
  [Buffer.from([0xC3, 0xB0, 0xC5, 0xB8, 0xE2, 0x80, 0x99, 0xE2, 0x80, 0xBA]), '\uD83D\uDC99'],  // 💛
  [Buffer.from([0xC3, 0xB0, 0xC5, 0xB8, 0xE2, 0x80, 0x99, 0xE2, 0x80, 0x9A]), '\uD83D\uDC8D'],  // 💍
  [Buffer.from([0xC3, 0xB0, 0xC5, 0xB8, 0xC2, 0xAE, 0xC2, 0xB8]), '\uD83D\uDCAE'],  // 💮 (®)
  [Buffer.from([0xC3, 0xB0, 0xC5, 0xB8, 0xE2, 0x93, 0xAA]), '\uD83D\uDCEB'],  // 📋
  [Buffer.from([0xC3, 0xB0, 0xC5, 0xB8, 0xE2, 0x80, 0xA6]), '\uD83D\uDCC5'],  // 📅 (…)
  [Buffer.from([0xC3, 0xB0, 0xC5, 0xB8, 0xE2, 0x80, 0xB0]), '\uD83D\uDCB0'],  // 💰
  [Buffer.from([0xC3, 0xB0, 0xC5, 0xB8, 0xE2, 0x94, 0x84]), '\uD83D\uDD04'],  // 🔄
  [Buffer.from([0xC3, 0xB0, 0xC5, 0xB8, 0xE2, 0x97, 0x91]), '\uD83D\uDDD1'],  // 🗑
  [Buffer.from([0xC3, 0xB0, 0xC5, 0xB8, 0xE2, 0x91, 0xA5]), '\uD83D\uDC65'],  // 👥
  [Buffer.from([0xC3, 0xB0, 0xC5, 0xB8, 0xE2, 0x93, 0x9E]), '\uD83D\uDCDE'],  // 📞
  [Buffer.from([0xC3, 0xB0, 0xC5, 0xB8, 0xE2, 0x93, 0x8B]), '\uD83D\uDCEB'],  // 📦
  [Buffer.from([0xC3, 0xB0, 0xC5, 0xB8, 0xE2, 0x92, 0x8E]), '\uD83D\uDC8E'],  // 💎
  [Buffer.from([0xC3, 0xB0, 0xC5, 0xB8, 0xE2, 0x94, 0x94]), '\uD83D\uDD14'],  // 🔔
  [Buffer.from([0xE2, 0x94, 0x80]), '-'],  // â"€ box drawing -> -
];

function fixFile(filePath) {
  let buf = fs.readFileSync(filePath);
  let content = buf.toString('utf8');
  let changed = false;

  for (const [badBuf, good] of FIXES) {
    const badStr = badBuf.toString('utf8');
    if (content.includes(badStr)) {
      content = content.split(badStr).join(good);
      changed = true;
    }
  }
  // Replace comment line decorators (repeated â"€)
  content = content.replace(/\u2014\u2014[^\n]*/g, (m) => {
    if (m.length > 10 && m.match(/^[\u2014\-]+$/)) return '// ' + '-'.repeat(40);
    return m;
  });
  content = content.replace(/\/\/ [\u2014\-]{20,}/g, '// ' + '-'.repeat(40));

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed:', filePath);
  }
}

const files = [
  'public/js/mahalakshmi-admin.js',
  'public/js/mahalakshmi-client.core.js',
  'public/js/mahalakshmi-client.js',
  'public/js/buy.js',
  'public/js/rental.js',
  'public/mahalakshmi-admin.html',
  'public/mahalakshmi-client.html',
  'public/buy.html',
  'public/rental.html',
].map((f) => path.join(__dirname, '..', f));

files.forEach((p) => {
  if (fs.existsSync(p)) fixFile(p);
});

console.log('Encoding fix complete.');
