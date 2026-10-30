import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(__dirname, '../..');

describe('Demo Persona Bar Production Build Protection', () => {
  it('production build artifacts strictly exclude the demo persona bar', () => {
    const nextBuildDir = path.join(webDir, '.next-build');
    assert.ok(
      fs.existsSync(nextBuildDir),
      '.next-build directory must exist from production build'
    );

    // Recursively scan all files in .next-build except webpack cache
    function scanDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'cache') {
            scanDir(fullPath);
          }
        } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.html'))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          assert.equal(
            content.includes('demo-personas-bar'),
            false,
            `Emitted production bundle ${entry.name} must not contain 'demo-personas-bar'`
          );
        }
      }
    }

    scanDir(nextBuildDir);
  });

  it('GET /login production HTML response does not include the demo persona bar', async () => {
    const testPort = 3150;
    const nextBin = path.resolve(rootDir, 'node_modules/next/dist/bin/next');
    const serverProcess = spawn(process.execPath, [nextBin, 'start', '-p', String(testPort)], {
      cwd: webDir,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        NEXT_DIST_DIR: '.next-build',
        NEXT_PUBLIC_DEMO_MODE: 'false',
      },
    });

    const cleanup = () => {
      if (serverProcess.pid) {
        try {
          if (process.platform === 'win32') {
            execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { stdio: 'ignore' });
          } else {
            serverProcess.kill('SIGKILL');
          }
        } catch (e) {
          // Ignore
        }
      }
    };

    try {
      // Poll until server is ready (up to 15 seconds)
      let ready = false;
      const startTime = Date.now();
      while (Date.now() - startTime < 15000) {
        try {
          await new Promise((resolve, reject) => {
            const req = http.get(`http://127.0.0.1:${testPort}/login`, (res) => {
              res.resume();
              if (res.statusCode === 200) {
                ready = true;
                resolve();
              } else {
                resolve();
              }
            });
            req.on('error', reject);
            req.setTimeout(1000, () => {
              req.destroy();
              reject(new Error('timeout'));
            });
          });
          if (ready) break;
        } catch (e) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      assert.ok(ready, 'Next.js production server failed to start within timeout');

      // Fetch the login page HTML
      const html = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${testPort}/login`, (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => resolve(body));
        }).on('error', reject);
      });

      // Verify that no persona bar or demo user switcher appears
      assert.equal(
        html.includes('id="demo-personas-bar"'),
        false,
        'Production login HTML must not contain demo-personas-bar'
      );
      assert.equal(
        html.includes('Demo Personas (Section 5.2)'),
        false,
        'Production login HTML must not contain Demo Personas header'
      );
      assert.equal(
        html.includes('Pass: Nextal@2026!'),
        false,
        'Production login HTML must not leak demo account password'
      );
    } finally {
      cleanup();
    }
  });
});
