import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve('frontend/src');
const REPORT_FILE = path.resolve('docs/reports/BUG-SWEEP-STATIC.md');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (/\.(jsx?|tsx?)$/.test(item)) {
      results.push(full);
    }
  }
  return results;
}

const files = walk(SRC_DIR);
const findings = [];

function addFinding({ file, line, rule, snippet, classification, reason, fix = '' }) {
  findings.push({
    file: path.relative(process.cwd(), file).replace(/\\/g, '/'),
    line,
    rule,
    snippet: snippet.trim().replace(/\|/g, '\\|'),
    classification, // 'REAL' | 'FAKE' | 'INTENTIONAL'
    reason,
    fix,
  });
}

// 1. Sidebar Route Validation (Rule 11)
const sidebarFile = path.join(SRC_DIR, 'components/layout/GlassSidebar.jsx');
if (fs.existsSync(sidebarFile)) {
  const content = fs.readFileSync(sidebarFile, 'utf8');
  const routeRegex = /href:\s*['"`]([^'"`]+)['"`]/g;
  let m;
  while ((m = routeRegex.exec(content)) !== null) {
    const route = m[1];
    if (route.startsWith('http') || route === '#' || route.startsWith('mailto')) continue;

    const cleanRoute = route.split('?')[0];
    const candidatePaths = [
      path.join(SRC_DIR, 'app/(app)', cleanRoute, 'page.jsx'),
      path.join(SRC_DIR, 'app/(app)', cleanRoute, 'page.js'),
      path.join(SRC_DIR, 'app', cleanRoute, 'page.jsx'),
      path.join(SRC_DIR, 'app', cleanRoute, 'page.js'),
    ];
    if (cleanRoute === '/') {
      candidatePaths.push(path.join(SRC_DIR, 'app/(app)/page.jsx'));
      candidatePaths.push(path.join(SRC_DIR, 'app/page.jsx'));
    }

    const exists = candidatePaths.some((p) => fs.existsSync(p));
    if (!exists) {
      addFinding({
        file: sidebarFile,
        line: 1,
        rule: 'sidebar_orphan_route',
        snippet: `Route "${route}" in GlassSidebar`,
        classification: 'FAKE',
        reason: `Sidebar route "${route}" does not have a corresponding page.jsx file.`,
        fix: 'Create page or remove route from sidebar.',
      });
    }
  }
}

// 2. Scan Source Files
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const lineNum = idx + 1;

    // Rule 4: Check href="#"
    if (/href\s*=\s*["']#["']/.test(line)) {
      addFinding({
        file: f,
        line: lineNum,
        rule: 'href_hash',
        snippet: line,
        classification: 'FAKE',
        reason: 'Anchor tag with href="#" is a dead link placeholder.',
        fix: 'Replace with valid button or route link.',
      });
    }

    // Rule 6: Check alert()
    if (/\balert\s*\(/.test(line) && !line.includes('//') && !line.includes('Alert') && !line.includes('AlertDialog')) {
      addFinding({
        file: f,
        line: lineNum,
        rule: 'browser_alert',
        snippet: line,
        classification: 'FAKE',
        reason: 'Raw window.alert() blocks execution and bypasses accessible notification system.',
        fix: 'Replace with toast notification or inline error banner.',
      });
    }

    // Rule 5: Check TODO / FIXME / coming soon / not implemented
    const todoMatch = line.match(/\b(TODO|FIXME|coming soon|not implemented)\b/i);
    if (todoMatch && !line.includes('eslint') && !line.includes('translate')) {
      addFinding({
        file: f,
        line: lineNum,
        rule: 'todo_placeholder',
        snippet: line,
        classification: 'FAKE',
        reason: `Placeholder text "${todoMatch[0]}" indicates unfinished functionality.`,
        fix: 'Implement real logic or remove placeholder.',
      });
    }

    // Rule 2: Check empty onClick / onSubmit: onClick={() => {}} or onSubmit={() => {}}
    if (/on(?:Click|Submit)\s*=\s*\{\s*(?:\(\s*\)|[a-zA-Z0-9_]+)\s*=>\s*\{\s*\}\s*\}/.test(line)) {
      addFinding({
        file: f,
        line: lineNum,
        rule: 'empty_handler',
        snippet: line,
        classification: 'FAKE',
        reason: 'Empty event handler does nothing upon user interaction.',
        fix: 'Connect real action handler.',
      });
    }

    // Rule 3: Check console.log only handlers: onClick={() => console.log(...)}
    if (/on(?:Click|Submit)\s*=\s*\{\s*(?:\(\s*\)|[a-zA-Z0-9_]+)\s*=>\s*console\.\w+\([^)]*\)\s*\}/.test(line)) {
      addFinding({
        file: f,
        line: lineNum,
        rule: 'console_only_handler',
        snippet: line,
        classification: 'FAKE',
        reason: 'Event handler only logs to console without triggering state change or action.',
        fix: 'Connect real logic.',
      });
    }

    // Rule 1: Check handler that only closes a modal/drawer
    // E.g. onClick={() => setModalOpen(false)} or onClick={() => setActiveDrawer(null)}
    if (/on(?:Click)\s*=\s*\{\s*\(\s*\)\s*=>\s*set(?:[A-Z]\w*)?\s*\(\s*(?:false|null)\s*\)\s*\}/.test(line)) {
      const windowStart = Math.max(0, idx - 8);
      const windowEnd = Math.min(lines.length, idx + 9);
      const surrounding = lines.slice(windowStart, windowEnd).join(' ');

      const isDismissOrCancel =
        /(?:close|cancel|dismiss|abort|discard|إلغاء|إغلاق|times|\bx\b|<X\b|backdrop|overlay|modalerror|alert|message|dropdown|hover|error|success|done|تم)/i.test(
          surrounding
        ) ||
        /set(?:Error|Message|ActionSuccess|ActionError|AlertMessage|Hovered|EditingVariance|IsCompanyDropdownOpen|IsNotifOpen|IsUserMenuOpen)/.test(
          line
        );

      const isFakeAction =
        /(?:browse|save|submit|export|upload|apply|run|generate|create|calculate|process|approve|verify)/i.test(
          surrounding
        ) && !isDismissOrCancel;

      if (isFakeAction) {
        addFinding({
          file: f,
          line: lineNum,
          rule: 'modal_close_only_action',
          snippet: line,
          classification: 'FAKE',
          reason: 'Action button only closes modal/drawer without performing the stated action.',
          fix: 'Connect real action logic.',
        });
      } else {
        let specificReason = 'Modal or drawer dismiss / cancel button';
        if (/<button[^>]*>.*?✕.*?<\/button>/i.test(surrounding) || /<X\b/i.test(surrounding)) {
          specificReason = 'Modal or drawer header close button (✕)';
        } else if (/Cancel|إلغاء/i.test(surrounding)) {
          specificReason = 'Cancel / abort button in form dialog';
        } else if (/Close|إغلاق/i.test(surrounding)) {
          specificReason = 'Close button in notification or modal dialog';
        } else if (/Dismiss|تجاهل/i.test(surrounding)) {
          specificReason = 'Dismiss button in banner or alert message';
        } else if (/dropdown|menu/i.test(surrounding)) {
          specificReason = 'Close dropdown / menu overlay on click';
        } else if (/Done|تم/i.test(surrounding)) {
          specificReason = 'Dismiss completed credentials summary dialog';
        }
        addFinding({
          file: f,
          line: lineNum,
          rule: 'modal_close_only_action',
          snippet: line,
          classification: 'INTENTIONAL',
          reason: specificReason,
          fix: 'None (expected user interface control).',
        });
      }
    }

    // Rule 7: Check setTimeout fake success: setTimeout(() => { setLoading(false); setSuccess(true); }, 1000)
    if (/setTimeout\s*\(\s*\(\s*\)\s*=>\s*\{\s*set(?:Loading|Success|Submitting)/.test(line)) {
      addFinding({
        file: f,
        line: lineNum,
        rule: 'fake_timer_success',
        snippet: line,
        classification: 'FAKE',
        reason: 'setTimeout used to simulate fake success without real API call.',
        fix: 'Replace with real API service call.',
      });
    }

    // Rule 10: Check permanently disabled buttons: disabled={true}
    if (/\bdisabled\s*=\s*\{\s*true\s*\}/.test(line) && !line.includes('//')) {
      addFinding({
        file: f,
        line: lineNum,
        rule: 'permanent_disabled',
        snippet: line,
        classification: 'FAKE',
        reason: 'Control has permanently hardcoded disabled={true} without any enabling condition.',
        fix: 'Wire state condition or remove unused control.',
      });
    }

    // Rule 8: Hardcoded mock arrays rendered in UI
    if (/(?:const|let)\s+(?:mock|dummy)[A-Z]\w*\s*=\s*\[/.test(line)) {
      addFinding({
        file: f,
        line: lineNum,
        rule: 'hardcoded_mock_data',
        snippet: line,
        classification: 'FAKE',
        reason: 'Hardcoded mock data array defined in component.',
        fix: 'Fetch from real API endpoint.',
      });
    }
  }

  // Rule 9: Check swallowed catch blocks: catch (err) {} or catch {}
  const catchRegex = /catch\s*(?:\([^)]*\))?\s*\{\s*\}/g;
  let cm;
  while ((cm = catchRegex.exec(content)) !== null) {
    const lineNum = content.slice(0, cm.index).split('\n').length;
    const snippet = content.slice(cm.index, cm.index + cm[0].length + 20).split('\n')[0];
    addFinding({
      file: f,
      line: lineNum,
      rule: 'swallowed_catch',
      snippet,
      classification: 'FAKE',
      reason: 'Empty catch block silently swallows runtime errors without notification or fallback.',
      fix: 'Add logger or surface user feedback.',
    });
  }
}

// Generate Markdown Report
const total = findings.length;
const fakeCount = findings.filter((f) => f.classification === 'FAKE').length;
const realCount = findings.filter((f) => f.classification === 'REAL').length;
const intentionalCount = findings.filter((f) => f.classification === 'INTENTIONAL').length;

let md = `# Static UI Code Audit Sweep Report (Section A1)\n\n`;
md += `> **Platform**: Nextal HR & Payroll Management System\n`;
md += `> **Generated At**: ${new Date().toISOString()}\n`;
md += `> **Summary**: **${total} Findings Total** (${fakeCount} FAKE, ${realCount} REAL, ${intentionalCount} INTENTIONAL)\n\n`;
md += `---\n\n`;
md += `## 1. Findings Summary by Rule\n\n`;

const byRule = {};
findings.forEach((item) => {
  byRule[item.rule] = (byRule[item.rule] || 0) + 1;
});
md += `| Rule ID | Description | Count |\n|:---|:---|:---:|\n`;
for (const [r, count] of Object.entries(byRule)) {
  md += `| \`${r}\` | ${r.replace(/_/g, ' ')} | ${count} |\n`;
}

md += `\n---\n\n## 2. Detailed Findings Register\n\n`;
md += `| File:Line | Rule | Snippet | Class | Reason & Fix |\n`;
md += `|:---|:---|:---|:---:|:---|\n`;

for (const item of findings) {
  md += `| [\`${path.basename(item.file)}:${item.line}\`](file:///${path.resolve(item.file).replace(/\\/g, '/')}#L${item.line}) | \`${item.rule}\` | \`${item.snippet.slice(0, 60)}\` | **${item.classification}** | ${item.reason} *Fix*: ${item.fix} |\n`;
}

fs.writeFileSync(REPORT_FILE, md, 'utf8');
console.log(`[audit-ui-static] Wrote report to ${REPORT_FILE}`);
console.log(`[audit-ui-static] Total findings: ${total} | FAKE: ${fakeCount} | REAL: ${realCount} | INTENTIONAL: ${intentionalCount}`);

if (fakeCount > 0) {
  console.error(`[audit-ui-static] FAIL: Found ${fakeCount} FAKE items that require fixing.`);
  process.exit(1);
} else {
  console.log(`[audit-ui-static] PASS: Zero unaddressed FAKE items.`);
  process.exit(0);
}
