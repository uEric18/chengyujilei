const fs = require('fs');
const html = fs.readFileSync('记成语.html', 'utf8');

// Extract the compact dict
const match = html.match(/const IDIOM_DICT_COMPACT=(\[\[[\s\S]*?\]\]);/);
if (!match) { console.log('Could not find compact dict'); process.exit(1); }

const dictData = match[1];
fs.writeFileSync('dict.json', dictData, 'utf8');
console.log('Dict extracted: ' + (Buffer.byteLength(dictData, 'utf8') / 1024).toFixed(0) + 'KB');

// Replace inline dict with lazy loader
const newLoader = "let IDIOM_DICT_COMPACT=null;function loadCompactDict(){return IDIOM_DICT_COMPACT?Promise.resolve(IDIOM_DICT_COMPACT):fetch('dict.json').then(r=>r.json()).then(d=>{IDIOM_DICT_COMPACT=d;return d});}";

const updated = html.replace(
  /const IDIOM_DICT_COMPACT=\[\[[\s\S]*?\]\];/,
  newLoader
);

// Update searchIdiom - use async dict loading
const oldSearchPattern = /function searchIdiom\(word\) \{[\s\S]*?renderDictResult\(notFound\);[\s\S]*?return notFound;[\s\S]*?\}/;
const newSearch = `async function searchIdiom(word) {
  var cache = loadDictCache();

  // 1. 精品词典
  if (IDIOM_DICT[word]) {
    var parts = IDIOM_DICT[word];
    var pinyin = parts[0], meaning = parts[1], source = parts[2], example = parts[3], synonyms = parts[4], antonyms = parts[5];
    var result = {
      word: word, pinyin: pinyin, meaning: meaning, source: source, example: example, found: true,
      synonyms: synonyms ? synonyms.split(';').filter(Boolean) : [],
      antonyms: antonyms ? antonyms.split(';').filter(Boolean) : [],
    };
    cache[word] = result;
    saveDictCache(cache);
    renderDictResult(result);
    return result;
  }

  // 2. 在线缓存
  if (cache[word]) { renderDictResult(cache[word]); return cache[word]; }

  // 3. 扩展词典（按需加载）
  var dict = await loadCompactDict();
  var compactEntry = dict.find(function(e) { return e[0] === word; });
  if (compactEntry) {
    var w = compactEntry[0], pinyin = compactEntry[1], meaning = compactEntry[2], source = compactEntry[3], example = compactEntry[4];
    var result = { word: w, pinyin: pinyin, meaning: meaning, source: source, example: example, found: true, synonyms: [], antonyms: [] };
    cache[word] = result;
    saveDictCache(cache);
    renderDictResult(result);
    return result;
  }

  // 都没有
  var notFound = { word: word, found: false };
  renderDictResult(notFound);
  return notFound;
}`;

const updated2 = updated.replace(oldSearchPattern, newSearch);

const sizeKB = (Buffer.byteLength(updated2, 'utf8') / 1024).toFixed(0);
fs.writeFileSync('记成语.html', updated2, 'utf8');
console.log('Updated HTML: ' + sizeKB + 'KB');
console.log('Done');
