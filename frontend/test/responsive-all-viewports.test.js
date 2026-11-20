import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Step 6: Full Responsiveness and 11-Viewport Coverage', () => {
  it('1. scripts/audit-mobile.mjs defines all 11 required viewports and outputs to docs/reports/ui', () => {
    const auditScriptPath = path.resolve(rootDir, '../scripts/audit-mobile.mjs');
    assert.ok(fs.existsSync(auditScriptPath), 'scripts/audit-mobile.mjs must exist');
    const content = fs.readFileSync(auditScriptPath, 'utf8');

    const expectedViewports = [
      '360x800',
      '390x844',
      '412x915',
      '768x1024',
      '1024x768',
      '820x1180',
      '1280x720',
      '1366x768',
      '1440x900',
      '1920x1080',
      '844x390',
    ];

    for (const vp of expectedViewports) {
      assert.ok(content.includes(vp), `Viewport ${vp} must be configured in audit-mobile.mjs`);
    }

    assert.ok(content.includes('docs/reports/ui'), 'Screenshots must output to docs/reports/ui');
  });

  it('2. AuthShell.jsx adapts for small screens (collapses video, full width form, responsive height)', () => {
    const authShellPath = path.join(rootDir, 'src/components/auth/AuthShell.jsx');
    const content = fs.readFileSync(authShellPath, 'utf8');

    assert.ok(content.includes('hidden md:flex'), 'Left panel must collapse/hide on screens < 768px');
    assert.ok(content.includes('min-h-0'), 'Must allow min-h-0 on compact mobile viewports');
    assert.ok(content.includes('px-4') || content.includes('px-5'), 'Mobile padding must be compact (16-20px)');
  });

  it('3. Modal.jsx and Drawer.jsx support responsive bottom-sheet styling on mobile', () => {
    const modalPath = path.join(rootDir, 'src/components/primitives/Modal.jsx');
    const modalContent = fs.readFileSync(modalPath, 'utf8');

    assert.ok(modalContent.includes('items-end sm:items-center'), 'Modal must adapt to bottom sheet on mobile');
    assert.ok(modalContent.includes('rounded-t-3xl'), 'Modal must use rounded-t-3xl for bottom sheet styling');
    assert.ok(modalContent.includes('max-h-[90dvh]'), 'Modal must use dvh units for mobile viewport height');
  });
});
