const fs = require('fs');
const data = JSON.parse(fs.readFileSync('idiom_raw.json', 'utf8'));

// Filter 4-char, dedupe
const seen = new Set();
const fourChar = [];
for (const d of data) {
  if (d.word && d.word.length === 4 && !seen.has(d.word)) {
    seen.add(d.word);
    fourChar.push(d);
  }
}
console.log('Total 4-char unique:', fourChar.length);

// Shuffle randomly for even pinyin distribution
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
shuffle(fourChar);

// Take 12000 after shuffle
// Take all 4-char idioms - no filtering
const selected = fourChar;
console.log('Selected:', selected.length);

function clean(s) {
  if (!s) return '';
  s = s.replace(/★[^。！？]*/g, '');
  s = s.replace(/^无$/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length > 200) s = s.slice(0, 200) + '…';
  return s;
}

const compact = selected.map(d => [
  d.word,
  d.pinyin.replace(/\s+/g, ' ').trim(),
  clean(d.explanation),
  clean(d.derivation),
  clean(d.example)
]);

// Verify
const testWords = ['心驰神往', '十全十美', '一心一意', '三心二意', '天长地久', '心旷神怡', '千钧一发'];
for (const w of testWords) {
  const found = compact.find(e => e[0] === w);
  console.log(w + ':', found ? '✓' : '✗');
}

// Pure JSON (no JS wrapper) for fetch().then(r => r.json())
const json = JSON.stringify(compact);
fs.writeFileSync('dict.json', json, 'utf8');
const sizeKB = (Buffer.byteLength(json, 'utf8') / 1024).toFixed(0);
console.log('Entries:', compact.length, 'Size:', sizeKB + 'KB');
