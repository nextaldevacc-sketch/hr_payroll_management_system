import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Step 5: Sign-in Video Split Layout and Auth Shell', () => {
  it('1. AuthShell.jsx exists and features 50/50 split layout with RTL swap', () => {
    const authShellPath = path.join(rootDir, 'src/components/auth/AuthShell.jsx');
    assert.ok(fs.existsSync(authShellPath), 'AuthShell.jsx must exist');
    const content = fs.readFileSync(authShellPath, 'utf8');

    assert.ok(content.includes('rtl:md:flex-row-reverse'), 'Must swap panels in RTL mode');
    assert.ok(content.includes('md:w-1/2'), 'Must use 50/50 split on desktop');
    assert.ok(content.includes('max-w-[1160px]') || content.includes('max-w-[1200px]'), 'Card must have large container width');
    assert.ok(content.includes('rounded-3xl'), 'Card must have rounded-3xl styling');
  });

  it('2. AuthShell.jsx references optimized video and poster assets for light and dark', () => {
    const authShellPath = path.join(rootDir, 'src/components/auth/AuthShell.jsx');
    const content = fs.readFileSync(authShellPath, 'utf8');

    assert.ok(content.includes('/media/login/login-dark.webm'), 'Must include dark webm video source');
    assert.ok(content.includes('/media/login/login-dark.mp4'), 'Must include dark mp4 video source');
    assert.ok(content.includes('/media/login/login-dark-poster.jpg'), 'Must include dark poster');
    assert.ok(content.includes('/media/login/login-light.webm'), 'Must include light webm video source');
    assert.ok(content.includes('/media/login/login-light.mp4'), 'Must include light mp4 video source');
    assert.ok(content.includes('/media/login/login-light-poster.jpg'), 'Must include light poster');
  });

  it('3. AuthShell.jsx implements WCAG accessibility, reduced motion, and play/pause controls', () => {
    const authShellPath = path.join(rootDir, 'src/components/auth/AuthShell.jsx');
    const content = fs.readFileSync(authShellPath, 'utf8');

    assert.ok(content.includes('prefers-reduced-motion'), 'Must check prefers-reduced-motion');
    assert.ok(content.includes('toggleVideoPlayback'), 'Must provide manual video play/pause toggle');
    assert.ok(content.includes('Pause video background') || content.includes('Play video background'), 'Must have aria-label for controls');
    assert.ok(content.includes('WPS SIF validation') || content.includes('Law 33/2021'), 'Must display statutory badge overlay');
  });

  it('4. login/page.jsx preserves credentials, MFA verify, MFA enrol, recovery codes, and rate limiting', () => {
    const loginPagePath = path.join(rootDir, 'src/app/(auth)/login/page.jsx');
    const content = fs.readFileSync(loginPagePath, 'utf8');

    assert.ok(content.includes('Email address'), 'Identifier must be labeled Email address');
    assert.ok(content.includes('Remember me'), 'Must provide Remember me option');
    assert.ok(content.includes('btn-login-submit'), 'Must preserve #btn-login-submit selector');
    assert.ok(content.includes('mfa_verify'), 'Must preserve mfa_verify step');
    assert.ok(content.includes('mfa_enrol'), 'Must preserve mfa_enrol step');
    assert.ok(content.includes('mfa_recovery'), 'Must preserve mfa_recovery step');
    assert.ok(content.includes('ACCOUNT_LOCKED'), 'Must preserve ACCOUNT_LOCKED handling');
  });

  it('5. AuthLayout wraps auth pages using AuthShell', () => {
    const layoutPath = path.join(rootDir, 'src/app/(auth)/layout.jsx');
    const content = fs.readFileSync(layoutPath, 'utf8');

    assert.ok(content.includes('AuthShell'), 'AuthLayout must wrap children with AuthShell');
  });
});
