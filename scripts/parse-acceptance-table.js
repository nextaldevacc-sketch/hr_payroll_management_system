import fs from 'node:fs';
import path from 'node:path';

function run() {
  const rawPath = path.resolve('docs/reports/acceptance-raw.txt');
  const outPath = path.resolve('docs/reports/acceptance-table.md');

  if (!fs.existsSync(rawPath)) {
    throw new Error(`Raw acceptance output not found at ${rawPath}`);
  }

  let buf = fs.readFileSync(rawPath);
  let content;
  if ((buf[0] === 0xff && buf[1] === 0xfe) || buf.includes(0x00)) {
    content = buf.toString('utf16le');
  } else {
    content = buf.toString('utf8');
  }
  // Also strip any BOM if present
  content = content.replace(/^\uFEFF/, '');
  const lines = content.split('\n');

  const rows = [];
  // Regex to match TAP test result lines:
  // e.g. ok 1 - T1: Given Platform admin creates Company B -> Expected Company B starts with UAE defaults; its admin is invited
  // or   ok 21 - T21: Given Gratuity, basic 5,000, 3 years 6 months -> Expected AED 12,082.19 # TODO Phase 8
  const testRegex = /^(ok|not ok)\s+(\d+)\s+-\s+(T\d+):\s+Given\s+(.+?)\s+->\s+Expected\s+(.+?)(?:\s+#\s+TODO\s*(.*))?$/;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(testRegex);
    if (match) {
      const [_, result, numStr, id, given, expected, todoText] = match;
      let status = 'PASS';
      if (todoText) {
        status = `TODO (${todoText.trim()})`;
      } else if (result === 'not ok') {
        status = 'FAIL';
      }

      rows.push({
        id,
        num: parseInt(numStr, 10),
        given: given.trim(),
        expected: expected.trim(),
        status,
      });
    }
  }

  rows.sort((a, b) => a.num - b.num);

  const mdLines = [
    '# Spec Section 15 Acceptance Test Results (T1–T37)',
    '',
    `*Generated automatically from \`docs/reports/acceptance-raw.txt\` on ${new Date().toISOString()}*`,
    '',
    '| ID | Given | Expected | Status |',
    '| :--- | :--- | :--- | :--- |',
  ];

  for (const r of rows) {
    mdLines.push(`| **${r.id}** | ${r.given.replace(/\|/g, '\\|')} | ${r.expected.replace(/\|/g, '\\|')} | **${r.status}** |`);
  }

  const passCount = rows.filter((r) => r.status === 'PASS').length;
  const todoCount = rows.filter((r) => r.status.startsWith('TODO')).length;
  const failCount = rows.filter((r) => r.status === 'FAIL').length;

  mdLines.push('');
  mdLines.push('## Summary');
  mdLines.push(`- **Total Tests**: ${rows.length}`);
  mdLines.push(`- **Passed**: ${passCount}`);
  mdLines.push(`- **Todo**: ${todoCount} (${rows.filter((r) => r.status.startsWith('TODO')).map((r) => r.id).join(', ')})`);
  mdLines.push(`- **Failed**: ${failCount}`);

  fs.writeFileSync(outPath, mdLines.join('\n'), 'utf8');
  console.log(`Generated ${outPath} with ${rows.length} test cases (Passed: ${passCount}, Todo: ${todoCount}, Fail: ${failCount})`);
}

run();

