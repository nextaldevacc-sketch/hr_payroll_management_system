import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Step 1: Shared Skeleton Loading Primitives', () => {
  it('1. All 9 skeleton primitives are created and exported', async () => {
    const skeletonIndex = path.join(rootDir, 'src/components/ui/skeleton/index.js');
    assert.ok(fs.existsSync(skeletonIndex), 'skeleton/index.js must exist');
    const content = fs.readFileSync(skeletonIndex, 'utf8');

    const expectedExports = [
      'Skeleton',
      'SkeletonText',
      'SkeletonAvatar',
      'SkeletonStatCard',
      'SkeletonCard',
      'SkeletonTable',
      'SkeletonForm',
      'SkeletonChart',
      'SkeletonPage',
    ];

    for (const exp of expectedExports) {
      assert.ok(content.includes(exp), `Export ${exp} must be present in skeleton/index.js`);
      const file = path.join(rootDir, `src/components/ui/skeleton/${exp}.jsx`);
      assert.ok(fs.existsSync(file), `Component file ${exp}.jsx must exist`);
    }
  });

  it('2. globals.css defines pure-CSS shimmer animation, dark mode, RTL, and reduced motion', () => {
    const cssPath = path.join(rootDir, 'src/styles/globals.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // CSS Shimmer Keyframes
    assert.ok(css.includes('@keyframes skeleton-shimmer-ltr'), 'Must define LTR shimmer keyframes');
    assert.ok(css.includes('@keyframes skeleton-shimmer-rtl'), 'Must define RTL shimmer keyframes');

    // Base shimmer class & dark theme override
    assert.ok(css.includes('.skeleton-shimmer'), 'Must define .skeleton-shimmer base class');
    assert.ok(css.includes('[data-theme="dark"] .skeleton-shimmer'), 'Must support [data-theme="dark"]');

    // RTL direction flip
    assert.ok(
      css.includes('[dir="rtl"] .skeleton-shimmer::after') || css.includes('html[dir="rtl"] .skeleton-shimmer::after'),
      'Must flip shimmer direction for RTL'
    );

    // prefers-reduced-motion check
    assert.ok(css.includes('prefers-reduced-motion: reduce'), 'Must respect prefers-reduced-motion');
    assert.ok(css.includes('animation: none !important'), 'Must disable animation on reduced-motion');
  });

  it('3. Accessibility and accessibility tags (aria-busy, aria-live, sr-only)', () => {
    const baseSkeleton = path.join(rootDir, 'src/components/ui/skeleton/Skeleton.jsx');
    const code = fs.readFileSync(baseSkeleton, 'utf8');

    assert.ok(code.includes('aria-busy="true"'), 'Must have aria-busy="true"');
    assert.ok(code.includes('aria-live="polite"'), 'Must have aria-live="polite"');
    assert.ok(code.includes('sr-only'), 'Must include visually hidden label for screen readers');
  });

  it('4. Arabic and English dictionaries have loading string', () => {
    const en = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/i18n/en.json'), 'utf8'));
    const ar = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/i18n/ar.json'), 'utf8'));

    assert.ok(en.common?.loading, 'en.json must have common.loading');
    assert.ok(ar.common?.loading, 'ar.json must have common.loading');
    assert.strictEqual(en.common.loading, 'Loading...');
    assert.strictEqual(ar.common.loading, 'جارٍ التحميل...');
  });
});
