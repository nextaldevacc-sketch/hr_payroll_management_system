import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const jsonPath = path.resolve(rootDir, 'docs/diagrams/nextal-system-workflow.json');
const htmlPath = path.resolve(rootDir, 'docs/diagrams/nextal-system-workflow.html');

const spec = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nextal HR & Payroll Enterprise System — Architecture & Workflow</title>
  <style>
    :root {
      --bg: #070a13;
      --surface: #0f172a;
      --surface-card: #141e33;
      --surface-hover: #1e293b;
      --border: #1e293b;
      --border-accent: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --primary: #38bdf8;
      --primary-glow: rgba(56, 189, 248, 0.25);
      --gold: #fbbf24;
      --gold-glow: rgba(251, 191, 36, 0.25);
      --emerald: #34d399;
      --rose: #f87171;
      --purple: #c084fc;
      --indigo: #818cf8;
      --blue: #60a5fa;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 24px;
      min-height: 100vh;
    }

    /* Top Header */
    header {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px 28px;
      margin-bottom: 24px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      position: relative;
      overflow: hidden;
    }

    header::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, #38bdf8, #fbbf24, #34d399, #a855f7);
    }

    .header-top {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 12px;
    }

    h1 {
      font-size: 1.65rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 9999px;
      background: rgba(56, 189, 248, 0.12);
      color: var(--primary);
      border: 1px solid rgba(56, 189, 248, 0.3);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .badge-gold {
      background: rgba(251, 191, 36, 0.12);
      color: var(--gold);
      border-color: rgba(251, 191, 36, 0.3);
    }

    p.subtitle {
      font-size: 0.9rem;
      color: var(--text-muted);
      max-width: 1100px;
      line-height: 1.6;
    }

    /* Stats Toolbar */
    .stats-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      margin-top: 18px;
      padding-top: 18px;
      border-top: 1px solid var(--border);
    }

    .stat-card {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px 14px;
    }

    .stat-card .num {
      font-size: 1.3rem;
      font-weight: 800;
      color: #fff;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }

    .stat-card .label {
      font-size: 0.72rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    /* Interactive Filter Bar */
    .controls-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 14px 18px;
      margin-bottom: 24px;
    }

    .phase-filters {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }

    .filter-btn {
      background: var(--surface-card);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .filter-btn:hover {
      color: #fff;
      border-color: var(--primary);
      background: var(--surface-hover);
    }

    .filter-btn.active {
      background: var(--primary);
      color: #04101e;
      border-color: var(--primary);
      box-shadow: 0 0 15px var(--primary-glow);
    }

    .search-box {
      position: relative;
      min-width: 280px;
    }

    .search-input {
      width: 100%;
      background: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 12px 8px 34px;
      font-size: 0.82rem;
      color: #fff;
      outline: none;
      transition: border-color 0.2s;
    }

    .search-input:focus {
      border-color: var(--primary);
    }

    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.85rem;
      color: var(--text-dim);
    }

    /* Main Path Banner */
    .path-banner {
      background: linear-gradient(90deg, rgba(251, 191, 36, 0.08), rgba(56, 189, 248, 0.08));
      border: 1px solid rgba(251, 191, 36, 0.25);
      border-radius: 12px;
      padding: 12px 18px;
      margin-bottom: 24px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .path-banner-text {
      font-size: 0.82rem;
      color: #e2e8f0;
    }

    .path-banner-text strong {
      color: var(--gold);
    }

    /* Swimlanes Layout */
    .workflow-container {
      display: flex;
      flex-direction: column;
      gap: 18px;
      margin-bottom: 32px;
    }

    .swimlane {
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid var(--border);
      border-radius: 12px;
      display: grid;
      grid-template-columns: 260px 1fr;
      overflow: hidden;
      transition: border-color 0.2s;
    }

    .swimlane:hover {
      border-color: var(--border-accent);
    }

    .swimlane-header {
      background: rgba(15, 23, 42, 0.95);
      border-right: 1px solid var(--border);
      padding: 20px 18px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .swimlane-header h2 {
      font-size: 0.92rem;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .swimlane-header span {
      font-size: 0.74rem;
      color: var(--text-muted);
      line-height: 1.4;
    }

    .swimlane-content {
      padding: 16px 20px;
      display: flex;
      align-items: stretch;
      gap: 16px;
      overflow-x: auto;
    }

    /* Node Cards */
    .node-card {
      flex: 0 0 290px;
      background: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }

    .node-card:hover {
      border-color: var(--primary);
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5), 0 0 15px var(--primary-glow);
    }

    .node-card.selected {
      border-color: var(--gold) !important;
      box-shadow: 0 0 25px var(--gold-glow) !important;
      background: #17243c;
    }

    .node-card.upstream-connected {
      border-color: var(--blue) !important;
      box-shadow: 0 0 15px rgba(96, 165, 250, 0.4) !important;
    }

    .node-card.downstream-connected {
      border-color: var(--emerald) !important;
      box-shadow: 0 0 15px rgba(52, 211, 153, 0.4) !important;
    }

    .node-card.dimmed {
      opacity: 0.25;
      filter: grayscale(0.6);
    }

    .node-card.main-path-card::before {
      content: 'CRITICAL PATH';
      position: absolute;
      top: -9px;
      right: 14px;
      font-size: 0.6rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      background: var(--gold);
      color: #0b0f19;
      padding: 1px 6px;
      border-radius: 4px;
    }

    .node-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .node-type {
      font-size: 0.65rem;
      text-transform: uppercase;
      font-weight: 800;
      letter-spacing: 0.05em;
      padding: 2px 7px;
      border-radius: 5px;
    }

    .type-client { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }
    .type-security { background: rgba(248, 113, 113, 0.15); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.3); }
    .type-middleware { background: rgba(192, 132, 252, 0.15); color: #c084fc; border: 1px solid rgba(192, 132, 252, 0.3); }
    .type-process { background: rgba(96, 165, 250, 0.15); color: #60a5fa; border: 1px solid rgba(96, 165, 250, 0.3); }
    .type-decision { background: rgba(251, 191, 36, 0.15); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.3); }
    .type-engine { background: rgba(52, 211, 153, 0.15); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.3); }
    .type-milestone { background: rgba(244, 114, 182, 0.15); color: #f472b6; border: 1px solid rgba(244, 114, 182, 0.3); }
    .type-storage { background: rgba(129, 140, 248, 0.15); color: #818cf8; border: 1px solid rgba(129, 140, 248, 0.3); }

    .node-col-badge {
      font-size: 0.68rem;
      font-family: monospace;
      color: var(--text-dim);
    }

    .node-card h4 {
      font-size: 0.88rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 6px;
      line-height: 1.35;
    }

    .node-card p {
      font-size: 0.74rem;
      color: var(--text-muted);
      line-height: 1.45;
      margin-bottom: 12px;
    }

    .node-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 0.7rem;
      color: var(--text-dim);
    }

    .flow-counts {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .count-pill {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 1px 6px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.04);
      font-family: monospace;
    }

    .count-pill.in { color: var(--blue); }
    .count-pill.out { color: var(--emerald); }

    /* Node Inspector Drawer */
    .inspector-overlay {
      position: fixed;
      inset: 0;
      background: rgba(4, 7, 15, 0.75);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: none;
      justify-content: flex-end;
    }

    .inspector-panel {
      width: 480px;
      max-width: 90vw;
      background: #0f172a;
      border-left: 1px solid var(--border-accent);
      height: 100%;
      padding: 28px;
      overflow-y: auto;
      box-shadow: -10px 0 40px rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      animation: slideIn 0.25s ease-out;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .inspector-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }

    .inspector-close {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-muted);
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      transition: all 0.2s;
    }

    .inspector-close:hover {
      color: #fff;
      border-color: var(--rose);
      background: rgba(248, 113, 113, 0.1);
    }

    .inspector-section {
      margin-bottom: 22px;
    }

    .inspector-section h5 {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-dim);
      margin-bottom: 8px;
      font-weight: 700;
    }

    .inspector-flow-item {
      background: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 8px;
      font-size: 0.78rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .inspector-flow-item:hover {
      border-color: var(--primary);
      background: var(--surface-hover);
    }

    .inspector-flow-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
      font-weight: 600;
      color: #fff;
    }

    .inspector-flow-label {
      font-family: monospace;
      font-size: 0.72rem;
      color: var(--primary);
    }

    /* Cards Section */
    .cards-section {
      margin-top: 32px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(480px, 1fr));
      gap: 18px;
      margin-bottom: 32px;
    }

    .compliance-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 22px 24px;
      position: relative;
    }

    .compliance-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; width: 4px; height: 100%;
      border-radius: 12px 0 0 12px;
    }

    .card-compliance::before { background: var(--gold); }
    .card-triggers::before { background: var(--emerald); }

    .compliance-card h3 {
      font-size: 1.05rem;
      color: #fff;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .compliance-card ul {
      list-style-type: none;
      padding: 0;
    }

    .compliance-card li {
      font-size: 0.82rem;
      color: #cbd5e1;
      margin-bottom: 10px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      line-height: 1.5;
    }

    .compliance-card li::before {
      content: '✓';
      color: var(--primary);
      font-weight: 800;
      font-size: 0.85rem;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .card-compliance li::before { color: var(--gold); }
    .card-triggers li::before { color: var(--emerald); }

    /* Data Flows & Edges Explorer */
    .edges-summary {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 24px;
      margin-bottom: 32px;
    }

    .edges-summary-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 18px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--border);
    }

    .edges-summary-header h3 {
      font-size: 1.1rem;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .edge-type-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .edge-type-pill {
      font-size: 0.7rem;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--surface-card);
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.2s;
    }

    .edge-type-pill:hover, .edge-type-pill.active {
      color: #fff;
      border-color: var(--primary);
      background: var(--surface-hover);
    }

    .edge-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 12px;
    }

    .edge-item {
      background: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 0.78rem;
      transition: all 0.2s;
      cursor: pointer;
    }

    .edge-item:hover {
      border-color: var(--primary);
      transform: translateY(-1px);
      background: var(--surface-hover);
    }

    .edge-item .flow {
      font-weight: 700;
      color: #e2e8f0;
      margin-bottom: 5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .edge-item .flow .arrow {
      color: var(--gold);
    }

    .edge-item .label {
      color: var(--primary);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.73rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .edge-type-tag {
      font-size: 0.65rem;
      padding: 1px 5px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-muted);
      text-transform: uppercase;
      font-family: sans-serif;
    }

    /* Print and Media queries */
    @media (max-width: 1024px) {
      .swimlane { grid-template-columns: 1fr; }
      .swimlane-header { border-right: none; border-bottom: 1px solid var(--border); }
    }
  </style>
</head>
<body>

  <!-- Top Header -->
  <header>
    <div class="header-top">
      <h1>
        <span>Nextal HR & Payroll Architecture Workflow</span>
        <span class="badge">Archify v2 System Map</span>
        <span class="badge badge-gold">UAE Decree 33/2021 Compliant</span>
      </h1>
      <div style="font-size: 0.75rem; color: var(--text-dim); font-family: monospace;">
        Status: Production Verification Ready (Part 4A)
      </div>
    </div>
    <p class="subtitle">
      Interactive end-to-end operational architecture mapping: Client UI, Express API Gateway, Tenant Scoping (AsyncLocalStorage), HR Onboarding Dual-Control, Biometric Ingestion & Overtime, 17 Statutory Salary Rules, WPS SIF Dispatch, and PostgreSQL Invariant Triggers.
    </p>

    <!-- Stats Toolbar -->
    <div class="stats-bar">
      <div class="stat-card">
        <div class="num" id="statLanes">7</div>
        <div class="label">System Swimlanes</div>
      </div>
      <div class="stat-card">
        <div class="num" id="statNodes">20</div>
        <div class="label">Operational Nodes</div>
      </div>
      <div class="stat-card">
        <div class="num" id="statEdges">22</div>
        <div class="label">Data Flows / APIs</div>
      </div>
      <div class="stat-card">
        <div class="num" id="statPhases">5</div>
        <div class="label">Lifecycle Phases</div>
      </div>
      <div class="stat-card">
        <div class="num" style="color: var(--gold);">100%</div>
        <div class="label">Dual-Control Audit</div>
      </div>
    </div>
  </header>

  <!-- Interactive Controls Bar -->
  <div class="controls-bar">
    <div class="phase-filters" id="phaseFilters">
      <button class="filter-btn active" data-phase="all">All Phases</button>
      <!-- Phase buttons dynamically inserted here -->
    </div>
    <div class="search-box">
      <span class="search-icon">🔍</span>
      <input type="text" id="searchInput" class="search-input" placeholder="Search nodes, endpoints, rules (e.g. WPS, IBAN)...">
    </div>
  </div>

  <!-- Critical Path Highlight Bar -->
  <div class="path-banner">
    <div class="path-banner-text">
      <strong>⚡ End-to-End Critical Path:</strong>
      <span style="color: var(--text-muted); font-size: 0.78rem; margin-left: 6px;">
        Login ➔ JWT Gateway ➔ Tenant Isolation ➔ Onboarding Wizard ➔ Dual Verification ➔ Contract & Bank ➔ Activation ➔ Biometrics ➔ Overtime ➔ Payroll Ready ➔ 17 Rules Calc ➔ Variance Audit ➔ Locked Trigger ➔ WPS SIF ➔ Payslip Disbursed
      </span>
    </div>
    <button class="filter-btn" id="btnToggleMainPath" style="background: rgba(251, 191, 36, 0.15); border-color: var(--gold); color: var(--gold);">
      Highlight Critical Path
    </button>
  </div>

  <!-- Swimlanes Container -->
  <div class="workflow-container" id="workflowContainer"></div>

  <!-- Compliance & Triggers Cards -->
  <div class="cards-section" id="cardsContainer"></div>

  <!-- Data Flows & Edges Explorer -->
  <div class="edges-summary">
    <div class="edges-summary-header">
      <h3>
        <span>Data Flows, Protocols & Invariants (<span id="edgeCount" style="color: var(--primary);">22</span>)</span>
      </h3>
      <div class="edge-type-filters" id="edgeTypeFilters">
        <button class="edge-type-pill active" data-type="all">All</button>
        <button class="edge-type-pill" data-type="http">HTTP / REST</button>
        <button class="edge-type-pill" data-type="database">Database / Trigger</button>
        <button class="edge-type-pill" data-type="workflow">Workflow</button>
        <button class="edge-type-pill" data-type="security">Security / Guard</button>
      </div>
    </div>
    <div class="edge-grid" id="edgesGrid"></div>
  </div>

  <!-- Inspector Side Drawer -->
  <div class="inspector-overlay" id="inspectorOverlay">
    <div class="inspector-panel" id="inspectorPanel">
      <div class="inspector-header">
        <div>
          <span class="node-type" id="inspectType">PROCESS</span>
          <h3 id="inspectTitle" style="color: #fff; font-size: 1.15rem; margin-top: 6px;">Node Title</h3>
          <span id="inspectLane" style="color: var(--text-muted); font-size: 0.75rem;">Lane Name</span>
        </div>
        <button class="inspector-close" id="btnInspectorClose">&times;</button>
      </div>

      <div class="inspector-section">
        <h5>Detailed Specification</h5>
        <p id="inspectDescription" style="font-size: 0.85rem; color: #cbd5e1; line-height: 1.6;"></p>
      </div>

      <div class="inspector-section">
        <h5>Incoming Connections (<span id="inspectInCount" style="color: var(--blue);">0</span>)</h5>
        <div id="inspectInFlows"></div>
      </div>

      <div class="inspector-section">
        <h5>Outgoing Connections (<span id="inspectOutCount" style="color: var(--emerald);">0</span>)</h5>
        <div id="inspectOutFlows"></div>
      </div>
    </div>
  </div>

  <!-- Embedded Specification for 100% Offline / file:// Protocol Compatibility -->
  <script>
    // Embedded spec object guarantees instant offline execution under file:/// protocol without CORS issues
    window.NEXTAL_SPEC = ${JSON.stringify(spec, null, 2)};
  </script>

  <!-- Interactive Diagram Engine -->
  <script>
    (function initDiagram() {
      // Load spec from window or fallback to fetch
      function getSpec() {
        if (window.NEXTAL_SPEC) {
          return Promise.resolve(window.NEXTAL_SPEC);
        }
        return fetch('nextal-system-workflow.json').then(r => r.json());
      }

      getSpec().then(spec => {
        let activePhaseFilter = 'all';
        let isMainPathHighlighted = false;
        let selectedNodeId = null;
        let activeEdgeType = 'all';

        // Index nodes & edges
        const nodeMap = new Map();
        spec.nodes.forEach(n => nodeMap.set(n.id, n));

        const incomingEdges = new Map();
        const outgoingEdges = new Map();
        spec.nodes.forEach(n => {
          incomingEdges.set(n.id, []);
          outgoingEdges.set(n.id, []);
        });

        spec.edges.forEach(e => {
          if (outgoingEdges.has(e.from)) outgoingEdges.get(e.from).push(e);
          if (incomingEdges.has(e.to)) incomingEdges.get(e.to).push(e);
        });

        // 1. Populate Stats
        document.getElementById('statLanes').textContent = spec.lanes.length;
        document.getElementById('statNodes').textContent = spec.nodes.length;
        document.getElementById('statEdges').textContent = spec.edges.length;
        document.getElementById('statPhases').textContent = spec.phases.length;

        // 2. Render Phase Filter Buttons
        const phaseFiltersContainer = document.getElementById('phaseFilters');
        spec.phases.forEach(p => {
          const btn = document.createElement('button');
          btn.className = 'filter-btn';
          btn.dataset.phase = p.id;
          btn.textContent = p.label;
          phaseFiltersContainer.appendChild(btn);
        });

        // 3. Render Swimlanes and Nodes
        const nodesByLane = {};
        spec.lanes.forEach(l => nodesByLane[l.id] = []);
        spec.nodes.forEach(n => {
          if (nodesByLane[n.lane]) nodesByLane[n.lane].push(n);
        });

        const workflowContainer = document.getElementById('workflowContainer');
        workflowContainer.innerHTML = '';

        spec.lanes.forEach(lane => {
          const laneNodes = nodesByLane[lane.id] || [];
          if (laneNodes.length === 0) return;

          const laneEl = document.createElement('div');
          laneEl.className = 'swimlane';
          laneEl.dataset.laneId = lane.id;

          const header = document.createElement('div');
          header.className = 'swimlane-header';
          header.innerHTML = \`
            <h2>\${lane.label}</h2>
            <span>\${lane.description}</span>
          \`;
          laneEl.appendChild(header);

          const content = document.createElement('div');
          content.className = 'swimlane-content';

          laneNodes.sort((a, b) => a.col - b.col).forEach(node => {
            const inCount = (incomingEdges.get(node.id) || []).length;
            const outCount = (outgoingEdges.get(node.id) || []).length;
            const isMain = spec.mainPath && spec.mainPath.includes(node.id);

            const card = document.createElement('div');
            card.className = \`node-card \${isMain ? 'main-path-card' : ''}\`;
            card.dataset.nodeId = node.id;
            card.dataset.type = node.type;
            card.dataset.lane = node.lane;

            card.innerHTML = \`
              <div>
                <div class="node-header">
                  <span class="node-type type-\${node.type}">\${node.type}</span>
                  <span class="node-col-badge">Col \${node.col}</span>
                </div>
                <h4>\${node.label}</h4>
                <p>\${node.description}</p>
              </div>
              <div class="node-footer">
                <div class="flow-counts">
                  <span class="count-pill in" title="Incoming Flows">⬇ \${inCount} in</span>
                  <span class="count-pill out" title="Outgoing Flows">⬆ \${outCount} out</span>
                </div>
                <span style="font-size: 0.65rem; color: var(--primary);">Inspect ➔</span>
              </div>
            \`;

            card.addEventListener('click', () => openInspector(node));
            content.appendChild(card);
          });

          laneEl.appendChild(content);
          workflowContainer.appendChild(laneEl);
        });

        // 4. Render Compliance & Trigger Cards
        const cardsContainer = document.getElementById('cardsContainer');
        cardsContainer.innerHTML = '';
        (spec.cards || []).forEach(card => {
          const cardDiv = document.createElement('div');
          cardDiv.className = \`compliance-card \${card.id === 'card-compliance' ? 'card-compliance' : 'card-triggers'}\`;
          cardDiv.innerHTML = \`
            <h3>\${card.id === 'card-compliance' ? '⚖️' : '🛡️'} \${card.title}</h3>
            <ul>\${card.points.map(pt => \`<li>\${pt}</li>\`).join('')}</ul>
          \`;
          cardsContainer.appendChild(cardDiv);
        });

        // 5. Render Edges Grid
        renderEdges();

        function renderEdges() {
          const edgesGrid = document.getElementById('edgesGrid');
          edgesGrid.innerHTML = '';
          const filteredEdges = spec.edges.filter(e => {
            if (activeEdgeType === 'all') return true;
            return e.type === activeEdgeType;
          });

          document.getElementById('edgeCount').textContent = filteredEdges.length;

          filteredEdges.forEach(edge => {
            const fromNode = nodeMap.get(edge.from);
            const toNode = nodeMap.get(edge.to);

            const item = document.createElement('div');
            item.className = 'edge-item';
            item.innerHTML = \`
              <div class="flow">
                <span>\${fromNode ? fromNode.label : edge.from}</span>
                <span class="arrow">➔</span>
                <span>\${toNode ? toNode.label : edge.to}</span>
              </div>
              <div class="label">
                <span>\${edge.label}</span>
                <span class="edge-type-tag">\${edge.type}</span>
              </div>
            \`;

            item.addEventListener('click', () => {
              if (fromNode) openInspector(fromNode);
            });

            edgesGrid.appendChild(item);
          });
        }

        // 6. Interactive Highlights & Node Inspector
        function openInspector(node) {
          selectedNodeId = node.id;
          highlightConnected(node.id);

          const overlay = document.getElementById('inspectorOverlay');
          document.getElementById('inspectType').textContent = node.type;
          document.getElementById('inspectType').className = \`node-type type-\${node.type}\`;
          document.getElementById('inspectTitle').textContent = node.label;
          const laneObj = spec.lanes.find(l => l.id === node.lane);
          document.getElementById('inspectLane').textContent = laneObj ? laneObj.label : node.lane;
          document.getElementById('inspectDescription').textContent = node.description;

          // Ingoing flows
          const inFlows = incomingEdges.get(node.id) || [];
          document.getElementById('inspectInCount').textContent = inFlows.length;
          const inContainer = document.getElementById('inspectInFlows');
          inContainer.innerHTML = inFlows.length === 0 ? '<p style="font-size:0.75rem; color: var(--text-dim);">No incoming flows (Entry Point)</p>' : '';
          inFlows.forEach(e => {
            const src = nodeMap.get(e.from);
            const div = document.createElement('div');
            div.className = 'inspector-flow-item';
            div.innerHTML = \`
              <div class="inspector-flow-header">
                <span>From: \${src ? src.label : e.from}</span>
                <span class="edge-type-tag">\${e.type}</span>
              </div>
              <div class="inspector-flow-label">\${e.label}</div>
            \`;
            div.addEventListener('click', () => {
              if (src) openInspector(src);
            });
            inContainer.appendChild(div);
          });

          // Outgoing flows
          const outFlows = outgoingEdges.get(node.id) || [];
          document.getElementById('inspectOutCount').textContent = outFlows.length;
          const outContainer = document.getElementById('inspectOutFlows');
          outContainer.innerHTML = outFlows.length === 0 ? '<p style="font-size:0.75rem; color: var(--text-dim);">No outgoing flows (Terminal Sink)</p>' : '';
          outFlows.forEach(e => {
            const dest = nodeMap.get(e.to);
            const div = document.createElement('div');
            div.className = 'inspector-flow-item';
            div.innerHTML = \`
              <div class="inspector-flow-header">
                <span>To: \${dest ? dest.label : e.to}</span>
                <span class="edge-type-tag">\${e.type}</span>
              </div>
              <div class="inspector-flow-label">\${e.label}</div>
            \`;
            div.addEventListener('click', () => {
              if (dest) openInspector(dest);
            });
            outContainer.appendChild(div);
          });

          overlay.style.display = 'flex';
        }

        function highlightConnected(targetId) {
          const upstreamIds = new Set((incomingEdges.get(targetId) || []).map(e => e.from));
          const downstreamIds = new Set((outgoingEdges.get(targetId) || []).map(e => e.to));

          document.querySelectorAll('.node-card').forEach(card => {
            const nid = card.dataset.nodeId;
            card.classList.remove('selected', 'upstream-connected', 'downstream-connected', 'dimmed');

            if (nid === targetId) {
              card.classList.add('selected');
            } else if (upstreamIds.has(nid)) {
              card.classList.add('upstream-connected');
            } else if (downstreamIds.has(nid)) {
              card.classList.add('downstream-connected');
            } else {
              card.classList.add('dimmed');
            }
          });
        }

        function clearHighlights() {
          selectedNodeId = null;
          document.querySelectorAll('.node-card').forEach(card => {
            card.classList.remove('selected', 'upstream-connected', 'downstream-connected', 'dimmed');
          });
        }

        // Close Inspector
        document.getElementById('btnInspectorClose').addEventListener('click', () => {
          document.getElementById('inspectorOverlay').style.display = 'none';
          clearHighlights();
        });

        document.getElementById('inspectorOverlay').addEventListener('click', (e) => {
          if (e.target.id === 'inspectorOverlay') {
            document.getElementById('inspectorOverlay').style.display = 'none';
            clearHighlights();
          }
        });

        // 7. Phase Filters Event Listeners
        document.querySelectorAll('.filter-btn[data-phase]').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn[data-phase]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activePhaseFilter = btn.dataset.phase;
            applyFilter();
          });
        });

        // Toggle Main Path
        const btnMainPath = document.getElementById('btnToggleMainPath');
        btnMainPath.addEventListener('click', () => {
          isMainPathHighlighted = !isMainPathHighlighted;
          btnMainPath.style.background = isMainPathHighlighted ? 'var(--gold)' : 'rgba(251, 191, 36, 0.15)';
          btnMainPath.style.color = isMainPathHighlighted ? '#0b0f19' : 'var(--gold)';
          btnMainPath.textContent = isMainPathHighlighted ? 'Showing Critical Path' : 'Highlight Critical Path';

          document.querySelectorAll('.node-card').forEach(card => {
            const isMain = spec.mainPath && spec.mainPath.includes(card.dataset.nodeId);
            if (isMainPathHighlighted) {
              if (isMain) {
                card.classList.remove('dimmed');
                card.style.borderColor = 'var(--gold)';
              } else {
                card.classList.add('dimmed');
                card.style.borderColor = '';
              }
            } else {
              card.classList.remove('dimmed');
              card.style.borderColor = '';
            }
          });
        });

        // Search Input Filter
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', () => {
          applyFilter();
        });

        function applyFilter() {
          const query = searchInput.value.toLowerCase().trim();
          document.querySelectorAll('.node-card').forEach(card => {
            const node = nodeMap.get(card.dataset.nodeId);
            if (!node) return;

            let matchesPhase = true;
            if (activePhaseFilter !== 'all') {
              // Check if node is associated with this phase
              // Phases map col ranges:
              // phase-ingress: col 0-2
              // phase-onboarding: col 3-6
              // phase-timekeeping: col 7-10
              // phase-payroll-exec: col 11-15
              // phase-settlement: col 16-19
              const col = node.col;
              if (activePhaseFilter === 'phase-ingress' && (col < 0 || col > 2)) matchesPhase = false;
              if (activePhaseFilter === 'phase-onboarding' && (col < 3 || col > 6)) matchesPhase = false;
              if (activePhaseFilter === 'phase-timekeeping' && (col < 7 || col > 10)) matchesPhase = false;
              if (activePhaseFilter === 'phase-payroll-exec' && (col < 11 || col > 15)) matchesPhase = false;
              if (activePhaseFilter === 'phase-settlement' && (col < 16 || col > 19)) matchesPhase = false;
            }

            let matchesSearch = true;
            if (query) {
              const inDesc = node.description.toLowerCase().includes(query);
              const inLabel = node.label.toLowerCase().includes(query);
              const inType = node.type.toLowerCase().includes(query);
              const inEdges = (incomingEdges.get(node.id) || []).some(e => e.label.toLowerCase().includes(query)) ||
                              (outgoingEdges.get(node.id) || []).some(e => e.label.toLowerCase().includes(query));
              matchesSearch = inDesc || inLabel || inType || inEdges;
            }

            if (matchesPhase && matchesSearch) {
              card.style.display = 'flex';
              card.classList.remove('dimmed');
            } else {
              card.style.display = 'none';
            }
          });
        }

        // Edge Type Filters
        document.querySelectorAll('.edge-type-pill').forEach(pill => {
          pill.addEventListener('click', () => {
            document.querySelectorAll('.edge-type-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeEdgeType = pill.dataset.type;
            renderEdges();
          });
        });
      }).catch(err => {
        document.body.innerHTML = \`
          <div style="padding: 40px; color: #f87171; background: #1e1b2e; border: 1px solid #7f1d1d; border-radius: 12px; margin: 20px auto; max-width: 600px;">
            <h3>Failed to Initialize Workflow Visualization</h3>
            <p style="margin-top: 10px; font-family: monospace; font-size: 0.85rem;">\${err.message}</p>
          </div>
        \`;
      });
    })();
  </script>
</body>
</html>
`;

fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('Successfully generated self-contained Nextal system workflow visualization at:', htmlPath);

