import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Step 3: Branded Rotating Entry Loader and Route Progress Bar', () => {
  it('1. RouteProgressBar exists, has progressbar role, and uses smooth top gradient', () => {
    const filePath = path.join(rootDir, 'src/components/common/RouteProgressBar.jsx');
    assert.ok(fs.existsSync(filePath), 'RouteProgressBar.jsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.ok(content.includes('role="progressbar"'), 'Must define role="progressbar"');
    assert.ok(content.includes('h-[2.5px]') || content.includes('h-[3px]'), 'Must have 2.5px-3px height');
    assert.ok(content.includes('fixed top-0'), 'Must be fixed at top');
    assert.ok(content.includes('usePathname'), 'Must hook into Next.js router path changes');
  });

  it('2. BrandedEntryLoader exists, uses 300ms timer, supports reduced motion and aria accessibility', () => {
    const filePath = path.join(rootDir, 'src/components/common/BrandedEntryLoader.jsx');
    assert.ok(fs.existsSync(filePath), 'BrandedEntryLoader.jsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.ok(content.includes('role="status"'), 'Must define role="status"');
    assert.ok(content.includes('aria-busy="true"'), 'Must define aria-busy="true"');
    assert.ok(content.includes('300'), 'Must implement 300ms delay threshold before flashing');
    assert.ok(content.includes('motion-reduce:animate-none'), 'Must disable rotation on prefers-reduced-motion');
    assert.ok(content.includes('NEXTAL'), 'Must display NEXTAL branding');
  });

  it('3. Providers.jsx mounts RouteProgressBar and BrandedEntryLoader', () => {
    const providersPath = path.join(rootDir, 'src/context/Providers.jsx');
    const content = fs.readFileSync(providersPath, 'utf8');

    assert.ok(content.includes('RouteProgressBar'), 'Must import and mount RouteProgressBar');
    assert.ok(content.includes('BrandedEntryLoader'), 'Must import and mount BrandedEntryLoader');
  });
});
