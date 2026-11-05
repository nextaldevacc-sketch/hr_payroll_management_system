import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const i18nDir = path.resolve(__dirname, '../src/i18n');

describe('Arabic I18n & RTL UI Translations Integrity', () => {
  const enData = JSON.parse(fs.readFileSync(path.join(i18nDir, 'en.json'), 'utf8'));
  const arData = JSON.parse(fs.readFileSync(path.join(i18nDir, 'ar.json'), 'utf8'));

  function getLeafKeys(obj, prefix = '') {
    const keys = [];
    for (const [k, v] of Object.entries(obj)) {
      const full = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        keys.push(...getLeafKeys(v, full));
      } else {
        keys.push({ key: full, val: String(v) });
      }
    }
    return keys;
  }

  it('every English key exists in Arabic dictionary with non-empty translation', () => {
    const enLeaves = getLeafKeys(enData);
    const missingKeys = [];

    for (const { key } of enLeaves) {
      const parts = key.split('.');
      let cur = arData;
      let missing = false;
      for (const p of parts) {
        if (!cur || cur[p] === undefined || cur[p] === null || cur[p] === '') {
          missing = true;
          break;
        }
        cur = cur[p];
      }
      if (missing) {
        missingKeys.push(key);
      }
    }

    assert.equal(
      missingKeys.length,
      0,
      `Missing or empty Arabic translations for keys: ${missingKeys.slice(0, 10).join(', ')} (total: ${missingKeys.length})`
    );
  });

  it('no Arabic translation contains unescaped English placeholders or untranslated parentheticals', () => {
    const arLeaves = getLeafKeys(arData);
    const prohibitedSubstrings = [
      '(Entities)',
      '(Actions)',
      '(Create)',
      '(Update)',
      '(Validate)',
      '(Lock)',
      '(Pay)',
      '(Actor)',
      'Users & Roles (5.1)',
      'undefined',
      'MISSING_KEY',
    ];

    const violations = [];
    for (const { key, val } of arLeaves) {
      for (const bad of prohibitedSubstrings) {
        if (val.includes(bad)) {
          violations.push({ key, val, bad });
        }
      }
    }

    assert.equal(
      violations.length,
      0,
      `Arabic translations contain prohibited English parentheticals: ${JSON.stringify(violations)}`
    );
  });

  it('frontend codebase contains 0 occurrences of untranslated English parentheticals in Arabic options', () => {
    const srcDir = path.resolve(__dirname, '../src');
    const filesToScan = [];

    function walk(dir) {
      for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, f.name);
        if (f.isDirectory() && f.name !== 'node_modules' && f.name !== '.next') {
          walk(full);
        } else if (f.isFile() && (f.name.endsWith('.jsx') || f.name.endsWith('.js'))) {
          filesToScan.push(full);
        }
      }
    }
    walk(srcDir);

    const pattern = /isAr\s*\?\s*['"][^'"]*\((?:Entities|Actions|Create|Update|Validate|Lock|Pay|Actor)\)/i;
    const matched = [];

    for (const file of filesToScan) {
      const content = fs.readFileSync(file, 'utf8');
      if (pattern.test(content)) {
        matched.push(path.relative(srcDir, file));
      }
    }

    assert.equal(
      matched.length,
      0,
      `Found untranslated English parentheticals in Arabic conditional code in: ${matched.join(', ')}`
    );
  });

  it('supports t() token interpolation, plurals (_one / _other), and fallbacks', async () => {
    const { translate } = await import('../src/i18n/translator.js');

    const mockTranslations = {
      en: {
        greeting: 'Hello, {{name}}!',
        items_one: '{{count}} item found',
        items_other: '{{count}} items found',
        onlyEn: 'English only {{info}}',
      },
      ar: {
        greeting: 'مرحباً، {{name}}!',
        items_one: 'تم العثور على عنصر واحد',
        items_other: 'تم العثور على {{count}} عناصر',
      },
    };

    // 1. Interpolation
    const enGreeting = translate(mockTranslations, 'en', 'greeting', { name: 'Ahmed' });
    assert.equal(enGreeting, 'Hello, Ahmed!');

    const arGreeting = translate(mockTranslations, 'ar', 'greeting', { name: 'أحمد' });
    assert.equal(arGreeting, 'مرحباً، أحمد!');

    // 2. Plural selection (one vs other)
    const enOne = translate(mockTranslations, 'en', 'items', { count: 1 });
    assert.equal(enOne, '1 item found');

    const enOther = translate(mockTranslations, 'en', 'items', { count: 5 });
    assert.equal(enOther, '5 items found');

    const arOne = translate(mockTranslations, 'ar', 'items', { count: 1 });
    assert.equal(arOne, 'تم العثور على عنصر واحد');

    const arOther = translate(mockTranslations, 'ar', 'items', { count: 7 });
    assert.equal(arOther, 'تم العثور على 7 عناصر');

    // 3. Fallback to English when Arabic key missing
    const arFallback = translate(mockTranslations, 'ar', 'onlyEn', { info: 'detail' });
    assert.equal(arFallback, 'English only detail');

    // 4. Fallback to key when both missing
    const missing = translate(mockTranslations, 'ar', 'missing.key', { test: 123 });
    assert.equal(missing, 'missing.key');
  });
});

