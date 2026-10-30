import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outPath = path.resolve('docs/reports/acceptance-raw.txt');
try {
  const output = execSync('node --env-file=.env --test test/acceptance/acceptance.test.js', {
    cwd: path.resolve('backend'),
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  fs.writeFileSync(outPath, output, 'utf8');
  console.log(`Saved raw acceptance output to ${outPath} (status: success, ${output.length} chars)`);
} catch (err) {
  // If exit code is non-zero (or todo/TAP output)
  const output = (err.stdout || '') + '\n' + (err.stderr || '');
  fs.writeFileSync(outPath, output, 'utf8');
  console.log(`Saved raw acceptance output to ${outPath} (${output.length} chars)`);
}

