import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const frMapPath = path.resolve(rootDir, 'docs/reports/fr-map.json');
const workflowReportPath = path.resolve(rootDir, 'docs/reports/workflow-verification.md');
const outputPath = path.resolve(rootDir, 'docs/reports/FR-TRACEABILITY.md');

// 1. Collect all test files in backend/test and frontend
function getFilesRecursively(dir, extensions = ['.js', '.mjs', '.jsx', '.ts', '.tsx']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === '.next' || file === '.git') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath, extensions));
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

const backendTestFiles = getFilesRecursively(path.resolve(rootDir, 'backend/test'));
const frontendTestFiles = getFilesRecursively(path.resolve(rootDir, 'frontend'));
const allTestFiles = [...backendTestFiles, ...frontendTestFiles];

// Cache test file contents for fast exact-string searching
const testFileContents = new Map();
for (const tf of allTestFiles) {
  testFileContents.set(tf, fs.readFileSync(tf, 'utf8'));
}

function findTestTitleInFiles(title) {
  for (const [tf, content] of testFileContents.entries()) {
    if (content.includes(title)) {
      return path.relative(rootDir, tf).replace(/\\/g, '/');
    }
  }
  return null;
}

// 2. Parse workflow verification results from docs/reports/workflow-verification.md
const workflowStepStatus = new Map();
if (fs.existsSync(workflowReportPath)) {
  const mdContent = fs.readFileSync(workflowReportPath, 'utf8');
  const lines = mdContent.split('\n');
  for (const line of lines) {
    // Format: | **7.1** | 6 | `COMPANY_ADMIN` | ... | **PASS** | ...
    const match = line.match(/^\|\s*\*\*([A-Za-z0-9._-]+)\*\*\s*\|\s*(\d+)\s*\|.*?\|\s*\*\*(PASS|FAIL)\*\*\s*\|/);
    if (match) {
      const wf = match[1];
      const stepNo = match[2];
      const status = match[3];
      workflowStepStatus.set(`${wf}.${stepNo}`, status);
    }
  }
}

// 3. Load fr-map.json
if (!fs.existsSync(frMapPath)) {
  console.error(`[traceability] FATAL: fr-map.json not found at ${frMapPath}`);
  process.exit(1);
}

const frMap = JSON.parse(fs.readFileSync(frMapPath, 'utf8'));
const keys = Object.keys(frMap);
console.log(`[traceability] Loaded ${keys.length} requirements from fr-map.json`);

let passCount = 0;
let deferredCount = 0;
let missingCount = 0;
const errors = [];
const rows = [];

for (const reqId of keys) {
  const req = frMap[reqId];
  const { title, domain, deferred, deferredReason, files = [], tests = [], workflowSteps = [] } = req;

  if (deferred) {
    deferredCount++;
    rows.push({
      id: reqId,
      domain: domain || 'General',
      title: title || '',
      files: files.join(', ') || 'Phase 2 Architecture',
      evidence: deferredReason || 'DEFERRED (Phase 2)',
      status: 'DEFERRED',
    });
    continue;
  }

  // A. Check files existence
  if (!files || files.length === 0) {
    errors.push(`Requirement ${reqId} has no implementation files specified.`);
  }
  for (const f of files) {
    const fullP = path.resolve(rootDir, f);
    if (!fs.existsSync(fullP)) {
      errors.push(`Requirement ${reqId} cites non-existent file: ${f}`);
    }
  }

  // B. Check test titles existence
  const matchedTests = [];
  for (const t of tests) {
    const foundIn = findTestTitleInFiles(t);
    if (!foundIn) {
      errors.push(`Requirement ${reqId} cites test title not found in test suite: "${t}"`);
    } else {
      matchedTests.push(`${foundIn} ("${t}")`);
    }
  }

  // C. Check workflow steps PASS status
  const matchedWorkflowSteps = [];
  for (const s of workflowSteps) {
    const stepKey = typeof s === 'string' ? s : `${s.wf}.${s.no || s.step}`;
    const status = workflowStepStatus.get(stepKey);
    if (!status) {
      errors.push(`Requirement ${reqId} cites workflow step not found in workflow-verification.md: ${stepKey}`);
    } else if (status !== 'PASS') {
      errors.push(`Requirement ${reqId} cites workflow step that is ${status} (not PASS): ${stepKey}`);
    } else {
      matchedWorkflowSteps.push(`Workflow ${stepKey} (PASS)`);
    }
  }

  // D. Check at least one evidence exists
  const hasEvidence = matchedTests.length > 0 || matchedWorkflowSteps.length > 0;
  if (!hasEvidence) {
    missingCount++;
    errors.push(`Requirement ${reqId} has zero test or workflow evidence.`);
    rows.push({
      id: reqId,
      domain: domain || 'General',
      title: title || '',
      files: files.join(', '),
      evidence: 'NO EVIDENCE FOUND',
      status: 'MISSING',
    });
  } else {
    passCount++;
    const allEvidence = [...matchedTests, ...matchedWorkflowSteps].join('<br>');
    rows.push({
      id: reqId,
      domain: domain || 'General',
      title: title || '',
      files: files.join(', '),
      evidence: allEvidence,
      status: 'PASS',
    });
  }
}

// 4. Report verification errors if any
if (errors.length > 0) {
  console.error(`\n[traceability] VALIDATION FAILED WITH ${errors.length} ERROR(S):`);
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  console.error(`\nSummary: ${passCount} PASS / ${deferredCount} DEFERRED / ${missingCount + errors.length} MISSING/FAIL (${keys.length} total)\n`);
  process.exit(1);
}

// 5. Generate Markdown report
let md = `# Requirement Traceability Matrix (Spec Section 13, 14 & Part 4C)\n\n`;
md += `> **Specification Reference**: docs/spec.md (Sections 10, 13, 14, 15)  \n`;
md += `> **Generated At**: ${new Date().toISOString()}  \n`;
md += `> **Generator**: \`scripts/generate-traceability.js\` (Evidence-Checked)  \n`;
md += `> **Total Requirements Audited**: **${keys.length}**  \n`;
md += `> **Summary**: **${passCount} PASS** / **${deferredCount} DEFERRED** / **${missingCount} MISSING**  \n\n`;
md += `---\n\n`;

md += `## 1. Traceability Summary\n\n`;
md += `| Category | Total | Passed | Deferred | Missing / Failed |\n`;
md += `|:---|:---:|:---:|:---:|:---:|\n`;
md += `| **All Requirements** | **${keys.length}** | **${passCount}** | **${deferredCount}** | **${missingCount}** |\n\n`;
md += `---\n\n`;

md += `## 2. Evidence-Checked Traceability Matrix\n\n`;
md += `| ID | Domain | Requirement Description | Implementation Files | Verified Evidence (Test / Step) | Status |\n`;
md += `|:---|:---|:------------------------|:---------------------|:---------------------------------|:------:|\n`;

for (const r of rows) {
  const badge = r.status === 'PASS' ? '**PASS**' : r.status === 'DEFERRED' ? '*DEFERRED*' : '**FAIL**';
  md += `| **${r.id}** | ${r.domain} | ${r.title} | \`${r.files}\` | ${r.evidence} | ${badge} |\n`;
}

fs.writeFileSync(outputPath, md, 'utf8');
console.log(`[traceability] Successfully generated ${outputPath}`);
console.log(`Summary: ${passCount} PASS / ${deferredCount} DEFERRED / ${missingCount} MISSING (${keys.length} total)`);
