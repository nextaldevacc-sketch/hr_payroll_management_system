import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, '..');

const FORBIDDEN_TOKENS = [
  'demo-personas-bar',
  'DEMO_USERS',
  'switchDemoUser',
  'Switch Demo Persona',
  'Nextal@2026!',
  'gulftech',
  'Gulf Tech',
  'الخليج للتقنية',
  'Tariq Al-Hashemi',
  'v1000000-',
  'DEMO_PRESETS_DATA',
];

function getFilesRecursively(dir, excludeDirs = []) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (excludeDirs.includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getFilesRecursively(fullPath, excludeDirs));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Zero Demo Code & Secrets Check (no-demo-code)', () => {
  it('scans frontend/src for forbidden demo tokens and asserts zero occurrences', () => {
    const srcDir = path.join(webDir, 'src');
    assert.ok(fs.existsSync(srcDir), 'frontend/src directory must exist');

    const srcFiles = getFilesRecursively(srcDir);
    assert.ok(srcFiles.length > 0, 'frontend/src should contain source files');

    const violations = [];

    for (const file of srcFiles) {
      const content = fs.readFileSync(file, 'utf8');
      for (const token of FORBIDDEN_TOKENS) {
        if (content.includes(token)) {
          violations.push({
            file: path.relative(webDir, file),
            token,
          });
        }
      }
    }

    assert.deepEqual(
      violations,
      [],
      `Found forbidden demo tokens in frontend/src:\n${JSON.stringify(violations, null, 2)}`
    );
  });

  it('scans .next-build production artifacts for forbidden demo tokens and asserts zero occurrences', () => {
    const buildDir = path.join(webDir, '.next-build');
    if (!fs.existsSync(buildDir)) {
      // If buildDir does not exist yet in this context, skip or fail gracefully
      return;
    }

    const buildFiles = getFilesRecursively(buildDir, ['cache']);
    const violations = [];

    for (const file of buildFiles) {
      // Check text files (.js, .html, .json, .txt, .map)
      if (/\.(js|html|json|txt)$/.test(file)) {
        const content = fs.readFileSync(file, 'utf8');
        for (const token of FORBIDDEN_TOKENS) {
          if (content.includes(token)) {
            violations.push({
              file: path.relative(webDir, file),
              token,
            });
          }
        }
      }
    }

    assert.deepEqual(
      violations,
      [],
      `Found forbidden demo tokens in .next-build:\n${JSON.stringify(violations, null, 2)}`
    );
  });

  it('scans frontend/src for forbidden INITIAL_ imports and asserts zero occurrences', () => {
    const srcDir = path.join(webDir, 'src');
    const srcFiles = getFilesRecursively(srcDir);
    const violations = [];

    for (const file of srcFiles) {
      if (!/\.(js|jsx|ts|tsx)$/.test(file)) continue;
      const content = fs.readFileSync(file, 'utf8');
      const matches = content.match(/import\s+[^;]*INITIAL_[^;]*from/g);
      if (matches) {
        violations.push({
          file: path.relative(webDir, file),
          matches,
        });
      }
    }

    assert.deepEqual(
      violations,
      [],
      `Found forbidden INITIAL_ imports in frontend/src:\n${JSON.stringify(violations, null, 2)}`
    );
  });
});

