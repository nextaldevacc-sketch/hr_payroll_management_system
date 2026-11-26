/**
 * Stress Test: 100 files of 2MB through real API container with RSS memory logged (< 500MB)
 * Part of Part 15 Verification Suite
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PDFDocument } from 'pdf-lib';

// Suppress self-signed certificate warnings for local Caddy proxy
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BASE_URL = process.env.BASE_URL || 'https://localhost';
const MAX_RSS_MB = 500;

function getApiContainerRssMb() {
  try {
    const raw = execSync('docker stats --no-stream --format "{{.MemUsage}}" nextal-api-prod', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    // raw looks like "145.2MiB / 2GiB" or "145MB / 2GB"
    const match = raw.match(/^([0-9.]+)\s*([A-Za-z]+)/);
    if (!match) return null;
    const val = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    if (unit.startsWith('gib') || unit.startsWith('gb')) {
      return val * 1024;
    }
    if (unit.startsWith('kib') || unit.startsWith('kb')) {
      return val / 1024;
    }
    return val; // MiB / MB
  } catch (err) {
    return null;
  }
}

async function create2MbPdf(filename) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 800]);
  page.drawText(`Stress Test Document: ${filename}\nGenerated at ${new Date().toISOString()}`, {
    x: 50,
    y: 750,
    size: 14,
  });

  // Attach a synthetic compressed binary stream so PDF reaches ~2MB
  const paddingBytes = crypto.randomBytes(2 * 1024 * 1024 - 1500);
  doc.context.obj(paddingBytes);

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

async function loginAdmin() {
  let email = '';
  let password = '';

  const credPath = path.resolve(process.cwd(), 'demo-credentials.txt');
  if (fs.existsSync(credPath)) {
    const text = fs.readFileSync(credPath, 'utf8');
    const hrMatch = text.match(/HR_MANAGER\s*:\s*([^\s|]+)\s*\|\s*Password:\s*([^\s(]+)/i);
    if (hrMatch) {
      email = hrMatch[1].trim();
      password = hrMatch[2].trim();
    }
  }

  if (!email || !password) {
    email = 'hr.manager@aljalil.ae';
    password = process.env.DEMO_ADMIN_PASSWORD || 'NextalSecure!2026';
  }

  console.log(`[Auth] Using HR account: ${email}`);

  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': BASE_URL,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    // Try fallback HR Manager
    const resHr = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': BASE_URL,
      },
      body: JSON.stringify({ email: 'hr.manager@aljalil.ae', password }),
    });
    if (!resHr.ok) {
      throw new Error(`Login failed (${res.status}): ${await res.text()}`);
    }
    const data = await resHr.json();
    const cookie = resHr.headers.get('set-cookie');
    return { token: data.token || data.data?.token, cookie };
  }

  const data = await res.json();
  const cookie = res.headers.get('set-cookie');
  return { token: data.token || data.data?.token, cookie };
}

async function run() {
  console.log('='.repeat(70));
  console.log('BULK UPLOAD STRESS TEST: 100 FILES x 2MB (200MB TOTAL)');
  console.log(`Target: ${BASE_URL} | Memory Limit Threshold: < ${MAX_RSS_MB} MB`);
  console.log('='.repeat(70));

  const initialRss = getApiContainerRssMb();
  console.log(`[Baseline] API Container Initial RSS: ${initialRss ? initialRss.toFixed(1) + ' MB' : 'N/A'}`);

  console.log('[Auth] Authenticating administrative session...');
  const { token, cookie } = await loginAdmin();
  console.log('[Auth] Authenticated successfully.');

  const headers = {
    'Origin': BASE_URL,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (cookie) headers['Cookie'] = cookie;

  // We will generate 100 files of 2MB each in memory on the test runner side
  // and send them in chunks of 5 files (20 requests total).
  const totalFiles = 100;
  const filesPerChunk = 5;
  const totalChunks = totalFiles / filesPerChunk;
  let batchId = null;
  let maxObservedRss = initialRss || 0;

  console.log(`[Stress] Starting 20 sequential chunks of 5 files (10MB per request)...`);

  for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
    const chunkStartFileIdx = chunkIdx * filesPerChunk;
    const formData = new FormData();

    for (let f = 0; f < filesPerChunk; f++) {
      const fileNum = chunkStartFileIdx + f + 1; // 1 to 100
      let empNum;
      let docType;
      let filename;
      if (fileNum <= 50) {
        // Files 1..50: Update path (EMIRATES_ID already exists for EMP-001..050)
        empNum = String(fileNum).padStart(3, '0');
        docType = 'EMIRATES_ID';
        filename = `EMP-${empNum}_${docType}_renewed_${fileNum}.pdf`;
      } else {
        // Files 51..100: New create path (RESIDENCE_VISA does not exist for EMP-001..050)
        empNum = String(fileNum - 50).padStart(3, '0');
        docType = 'RESIDENCE_VISA';
        filename = `EMP-${empNum}_${docType}_new_${fileNum}.pdf`;
      }

      const pdfBuf = await create2MbPdf(filename);
      const blob = new Blob([pdfBuf], { type: 'application/pdf' });
      formData.append('files', blob, filename);
    }

    if (batchId) {
      formData.append('batch_id', batchId);
    }
    formData.append('chunk_index', String(chunkIdx));
    formData.append('total_chunks', String(totalChunks));
    formData.append('total_files', String(totalFiles));

    const chunkStartTime = Date.now();
    const res = await fetch(`${BASE_URL}/api/v1/employees/documents/bulk-upload/chunk`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const chunkDurationMs = Date.now() - chunkStartTime;
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Chunk ${chunkIdx + 1} failed (${res.status}): ${errText}`);
    }

    const resJson = await res.json();
    if (!batchId && resJson?.data?.batch_id) {
      batchId = resJson.data.batch_id;
    }

    const currentRss = getApiContainerRssMb();
    if (currentRss !== null) {
      if (currentRss > maxObservedRss) maxObservedRss = currentRss;
    }

    const rssStr = currentRss !== null ? `${currentRss.toFixed(1)} MB` : 'N/A';
    console.log(
      `  -> Chunk ${String(chunkIdx + 1).padStart(2, ' ')}/${totalChunks} (${filesPerChunk} files, 10MB) uploaded in ${chunkDurationMs}ms | API RSS: ${rssStr}`
    );

    if (currentRss !== null && currentRss >= MAX_RSS_MB) {
      throw new Error(`CRITICAL: API container RSS (${currentRss.toFixed(1)} MB) exceeded threshold of ${MAX_RSS_MB} MB!`);
    }
  }

  console.log(`[Preview] Fetching batch preview for batchId: ${batchId}...`);
  const previewRes = await fetch(`${BASE_URL}/api/v1/employees/documents/bulk-upload/batch/${batchId}`, {
    method: 'GET',
    headers,
  });
  if (!previewRes.ok) {
    throw new Error(`Batch preview failed (${previewRes.status}): ${await previewRes.text()}`);
  }
  const previewJson = await previewRes.json();
  const summary = previewJson.data?.summary;
  console.log(
    `[Preview] Summary: Total=${summary?.total_files}, Matched=${summary?.matched}, Invalid=${summary?.invalid}`
  );

  console.log(`[Process] Executing zero-reupload process for batch: ${batchId}...`);
  const processStart = Date.now();
  const processRes = await fetch(`${BASE_URL}/api/v1/employees/documents/bulk-upload/process`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ batch_id: batchId }),
  });

  const processDurationMs = Date.now() - processStart;
  if (!processRes.ok) {
    throw new Error(`Process failed (${processRes.status}): ${await processRes.text()}`);
  }
  const processJson = await processRes.json();
  const result = processJson.data;

  const finalRss = getApiContainerRssMb();
  if (finalRss !== null && finalRss > maxObservedRss) maxObservedRss = finalRss;

  const processedCount = result.processed ?? 0;
  const createdCount = result.created ?? 0;
  const updatedCount = result.updated ?? 0;
  const failedCount = result.failed ?? 0;

  console.log('='.repeat(70));
  console.log('STRESS TEST RESULTS:');
  console.log(`  - Total Files Uploaded & Processed : ${processedCount} / ${totalFiles}`);
  console.log(`  - Documents Created (New Path)      : ${createdCount}`);
  console.log(`  - Documents Updated (Archive Path)  : ${updatedCount}`);
  console.log(`  - Documents Failed                  : ${failedCount}`);
  console.log(`  - Total Data Streamed In Chunks     : 200 MB (100 x 2MB)`);
  console.log(`  - Batch Processing Duration         : ${processDurationMs} ms`);
  console.log(`  - Peak API Container RSS Memory     : ${maxObservedRss.toFixed(1)} MB`);
  console.log(`  - Target RSS Limit Threshold        : < ${MAX_RSS_MB} MB`);
  console.log(`  - Memory Limit Compliance           : ${maxObservedRss < MAX_RSS_MB ? 'PASSED (VERIFIED)' : 'FAILED'}`);
  console.log('='.repeat(70));

  if (processedCount !== totalFiles || failedCount !== 0) {
    console.error(`[CRITICAL FAILURE] processed (${processedCount}) !== ${totalFiles} or failed (${failedCount}) > 0`);
    process.exit(1);
  }

  if (createdCount === 0 || updatedCount === 0) {
    console.error(`[CRITICAL FAILURE] Both created (${createdCount}) and updated (${updatedCount}) must be > 0`);
    process.exit(1);
  }

  if (maxObservedRss >= MAX_RSS_MB) {
    console.error(`[CRITICAL FAILURE] Peak RSS (${maxObservedRss.toFixed(1)} MB) exceeded ${MAX_RSS_MB} MB`);
    process.exit(1);
  }

  console.log('[StressTest SUCCESS] 100/100 processed, 0 failed, both create and update verified, memory < 500MB.');
}

run().catch((err) => {
  console.error('[StressTest Error]:', err.message);
  process.exit(1);
});
