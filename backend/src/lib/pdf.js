import puppeteer from 'puppeteer';

/**
 * Format a Date to readable string
 */
function formatDate(d) {
  if (!d) return '-';
  const date = new Date(d);
  return date.toISOString().slice(0, 10);
}

/**
 * Formats a number to 2 decimal places with thousands comma
 */
function formatMoney(amount) {
  const num = Number(amount || 0);
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Generates an executive bilingual (English + Arabic) Payslip PDF using Puppeteer
 */
export async function generatePayslipPdf({ payslip, company, employee, contract }) {
  const empCode = employee?.employee_code || '-';
  const empName = employee?.name || 'Employee';
  const empNameAr = employee?.arabic_name || employee?.name_ar || '';
  const companyName = company?.name || 'Nextal Corporation';
  const companyNameAr = company?.name_ar || companyName;
  const tradeLicense = company?.trade_license_no || '-';

  const periodFrom = formatDate(payslip.period_from);
  const periodTo = formatDate(payslip.period_to);
  const paidDays = Number(payslip.paid_days || 30).toFixed(1);
  const workedDays = Number(payslip.worked_days || 30).toFixed(1);

  const primaryBank = employee?.bank_accounts?.find((b) => b.is_primary && b.is_active) || employee?.bank_accounts?.[0];
  const maskedIban = primaryBank?.iban ? `AE** **** **** ${primaryBank.iban.slice(-4)}` : '-';
  const bankName = primaryBank?.bank_name || '-';

  // Categorize lines into Earnings and Deductions
  const earnings = [];
  const deductions = [];
  let employerContributions = [];

  if (payslip.lines && payslip.lines.length > 0) {
    for (const line of payslip.lines) {
      const amt = Number(line.amount || 0);
      const isContrib = line.code === 'GPSSA_ER' || line.category === 'CompanyContribution';
      const isDeduction = ['ABS', 'LATE', 'SICK_HALF', 'SICK_NONE', 'LOAN', 'ADV', 'GPSSA_EE'].includes(line.code) || line.category === 'Deduction';

      if (isContrib) {
        employerContributions.push({ code: line.code, name: line.name, amount: formatMoney(amt) });
      } else if (isDeduction) {
        if (amt > 0) deductions.push({ code: line.code, name: line.name, amount: formatMoney(amt) });
      } else {
        if (amt > 0 && line.code !== 'GROSS' && line.code !== 'NET') {
          earnings.push({ code: line.code, name: line.name, amount: formatMoney(amt) });
        }
      }
    }
  }

  // Fallback defaults if lines are empty
  if (earnings.length === 0) {
    earnings.push({ code: 'BASIC', name: 'Basic Salary / الراتب الأساسي', amount: formatMoney(payslip.basic || 0) });
    const allow = Number(payslip.gross || 0) - Number(payslip.basic || 0);
    if (allow > 0) {
      earnings.push({ code: 'ALLOW', name: 'Fixed Allowances / البدلات', amount: formatMoney(allow) });
    }
  }

  const grossTotal = formatMoney(payslip.gross || 0);
  const deductionsTotal = formatMoney(payslip.total_deductions || 0);
  const netTotal = formatMoney(payslip.net || 0);

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Payslip - ${empCode}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 15mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
        }
        body {
          color: #1e293b;
          background: #ffffff;
          font-size: 11px;
          line-height: 1.4;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 12px;
          margin-bottom: 15px;
        }
        .company-title {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.3px;
        }
        .company-sub {
          font-size: 11px;
          color: #64748b;
          margin-top: 2px;
        }
        .slip-badge {
          text-align: right;
        }
        .slip-badge h2 {
          font-size: 15px;
          font-weight: 700;
          color: #2563eb;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .slip-badge p {
          font-size: 10px;
          color: #64748b;
          margin-top: 2px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px 14px;
          margin-bottom: 16px;
        }
        .info-item {
          display: flex;
          flex-direction: column;
        }
        .info-label {
          font-size: 9px;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 600;
          letter-spacing: 0.3px;
        }
        .info-value {
          font-size: 11px;
          font-weight: 600;
          color: #0f172a;
          margin-top: 1px;
        }
        .tables-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 16px;
        }
        .table-box {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          overflow: hidden;
        }
        .table-header {
          background: #0f172a;
          color: #ffffff;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 600;
          display: flex;
          justify-content: space-between;
        }
        .table-header.deductions {
          background: #475569;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        td {
          padding: 6px 10px;
          border-bottom: 1px solid #f1f5f9;
        }
        tr:last-child td {
          border-bottom: none;
        }
        .text-right {
          text-align: right;
        }
        .subtotal-row {
          background: #f8fafc;
          font-weight: 700;
          border-top: 1px solid #cbd5e1;
        }
        .net-summary-box {
          background: #f0fdf4;
          border: 1.5px solid #22c55e;
          border-radius: 6px;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .net-label {
          font-size: 12px;
          font-weight: 700;
          color: #166534;
          text-transform: uppercase;
        }
        .net-amount {
          font-size: 20px;
          font-weight: 800;
          color: #15803d;
          letter-spacing: -0.5px;
        }
        .signatures {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px dashed #cbd5e1;
        }
        .sig-block {
          text-align: center;
        }
        .sig-line {
          border-top: 1px solid #94a3b8;
          margin-bottom: 4px;
        }
        .sig-title {
          font-size: 9px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 600;
        }
        .watermark {
          position: fixed;
          bottom: 10px;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 8px;
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="company-title">${companyName} / ${companyNameAr}</div>
          <div class="company-sub">Trade License: ${tradeLicense} &bull; United Arab Emirates</div>
        </div>
        <div class="slip-badge">
          <h2>Salary Slip / قسيمة الراتب</h2>
          <p>Period: ${periodFrom} to ${periodTo}</p>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Employee Code / الرقم</span>
          <span class="info-value">${empCode}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Employee Name / الاسم</span>
          <span class="info-value">${empName}${empNameAr && empNameAr !== empName ? ` / ${empNameAr}` : ''}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Designation / المسمى</span>
          <span class="info-value">${contract?.job?.title || employee?.designation || 'Staff'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Department / القسم</span>
          <span class="info-value">${contract?.department?.name || employee?.department?.name || 'General'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Bank Name / البنك</span>
          <span class="info-value">${bankName}</span>
        </div>
        <div class="info-item">
          <span class="info-label">IBAN / الحساب المصرفي</span>
          <span class="info-value">${maskedIban}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Paid / Worked Days</span>
          <span class="info-value">${paidDays} / ${workedDays}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Currency / العملة</span>
          <span class="info-value">AED (Dirhams)</span>
        </div>
      </div>

      <div class="tables-container">
        <!-- Earnings Table -->
        <div class="table-box">
          <div class="table-header">
            <span>EARNINGS / الاستحقاقات</span>
            <span>AED</span>
          </div>
          <table>
            <tbody>
              ${earnings
                .map(
                  (e) => `
                <tr>
                  <td>${e.name}</td>
                  <td class="text-right">${e.amount}</td>
                </tr>
              `
                )
                .join('')}
              <tr class="subtotal-row">
                <td>Total Gross Salary / إجمالي الراتب</td>
                <td class="text-right">${grossTotal}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Deductions Table -->
        <div class="table-box">
          <div class="table-header deductions">
            <span>DEDUCTIONS / الاستقطاعات</span>
            <span>AED</span>
          </div>
          <table>
            <tbody>
              ${
                deductions.length > 0
                  ? deductions
                      .map(
                        (d) => `
                    <tr>
                      <td>${d.name}</td>
                      <td class="text-right">${d.amount}</td>
                    </tr>
                  `
                      )
                      .join('')
                  : `
                    <tr>
                      <td colspan="2" style="color: #94a3b8; text-align: center; padding: 16px;">No deductions applied / لا توجد استقطاعات</td>
                    </tr>
                  `
              }
              <tr class="subtotal-row">
                <td>Total Deductions / إجمالي الاستقطاعات</td>
                <td class="text-right">${deductionsTotal}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="net-summary-box">
        <div>
          <div class="net-label">Net Payable Salary / صافي الراتب المستحق</div>
          <div style="font-size: 10px; color: #166534; margin-top: 2px;">Remitted via UAE Wages Protection System (WPS)</div>
        </div>
        <div class="net-amount">AED ${netTotal}</div>
      </div>

      ${
        employerContributions.length > 0
          ? `
        <div style="font-size: 10px; color: #64748b; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px; margin-bottom: 15px;">
          <strong>Employer Statutory Contributions:</strong> ${employerContributions.map((c) => `${c.name}: AED ${c.amount}`).join(' | ')}
        </div>
      `
          : ''
      }

      <div class="signatures">
        <div class="sig-block">
          <div class="sig-line"></div>
          <div class="sig-title">Prepared by (Payroll)</div>
        </div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <div class="sig-title">Verified by (Finance)</div>
        </div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <div class="sig-title">Employee Signature</div>
        </div>
      </div>

      <div class="watermark">
        System-generated electronically by Nextal HR &bull; Document Reference: ${payslip.id} &bull; Generated on ${formatDate(new Date())}
      </div>
    </body>
    </html>
  `;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '12mm', right: '12mm' },
    });
    return Buffer.from(pdfBuffer);
  } catch (err) {
    // If puppeteer execution environment lacks display or chrome binary, return pristine HTML payload buffer
    console.warn('[PDF Generator] Puppeteer error, falling back to clean formatted buffer:', err.message);
    return Buffer.from(html, 'utf-8');
  } finally {
    if (browser) await browser.close();
  }
}

export async function generateVarianceReportPdf({ payRun, company, companyVisa, payslips = [] }) {
  const companyName = company?.name || 'Nextal Corporation';
  const companyNameAr = company?.name_ar || companyName;
  const visaName = companyVisa?.name || 'Main Visa';
  const periodStr = typeof payRun.period_month === 'string'
    ? payRun.period_month.slice(0, 7)
    : `${payRun.period_month.getUTCFullYear()}-${String(payRun.period_month.getUTCMonth() + 1).padStart(2, '0')}`;

  const threshold = company?.variance_threshold_pct || 5.0;

  // Compute variance metrics
  let totalCurrentNet = 0;
  let totalPrevNet = 0;
  let varianceCount = 0;

  const rows = payslips.map((ps) => {
    const cur = Number(ps.net || 0);
    const prev = Number(ps.previous_net || cur);
    const diff = cur - prev;
    const pct = ps.variance_pct !== null && ps.variance_pct !== undefined ? Number(ps.variance_pct) : (prev > 0 ? (diff / prev) * 100 : 0);
    const hasVariance = Math.abs(pct) >= threshold;
    if (hasVariance) varianceCount++;
    totalCurrentNet += cur;
    totalPrevNet += prev;

    return {
      code: ps.employee?.employee_code || '-',
      name: ps.employee?.name || 'Employee',
      prev: formatMoney(prev),
      cur: formatMoney(cur),
      diff: formatMoney(diff),
      diffRaw: diff,
      pct: pct.toFixed(2),
      pctRaw: pct,
      reason: ps.variance_reason || (hasVariance ? 'Pending explanation' : 'Within normal threshold'),
      hasVariance,
    };
  });

  const netDiff = totalCurrentNet - totalPrevNet;
  const netDiffPct = totalPrevNet > 0 ? (netDiff / totalPrevNet) * 100 : 0;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4 landscape; margin: 12mm 15mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 10px; color: #1e293b; margin: 0; padding: 0; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 2px solid #0f172a; margin-bottom: 14px; }
        .title { font-size: 18px; font-weight: bold; color: #0f172a; }
        .subtitle { font-size: 11px; color: #64748b; margin-top: 2px; }
        .meta-box { text-align: right; font-size: 10px; color: #475569; }
        .kpi-row { display: flex; gap: 12px; margin-bottom: 16px; }
        .kpi-card { flex: 1; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; background: #f8fafc; }
        .kpi-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 600; }
        .kpi-value { font-size: 14px; font-weight: bold; color: #0f172a; margin-top: 3px; }
        table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
        th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-weight: 600; color: #334155; border-bottom: 1.5px solid #cbd5e1; }
        td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; }
        tr:nth-child(even) td { background: #fafafa; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 8.5px; }
        .badge-red { background: #fee2e2; color: #991b1b; }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-neutral { background: #f1f5f9; color: #64748b; }
        .signatures { display: flex; justify-content: space-between; margin-top: 24px; padding-top: 16px; }
        .sig-box { width: 28%; text-align: center; }
        .sig-line { border-top: 1px solid #94a3b8; margin-bottom: 4px; }
        .footer { font-size: 8px; color: #94a3b8; text-align: center; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="title">${companyName} &bull; Payroll Variance Analysis Report</div>
          <div class="subtitle">تقرير تحليل الفروقات في مسير الرواتب &bull; Period: ${periodStr} &bull; Visa: ${visaName}</div>
        </div>
        <div class="meta-box">
          <div><strong>Run Status:</strong> ${payRun.status}</div>
          <div><strong>Variance Threshold:</strong> &plusmn;${threshold}%</div>
          <div><strong>Generated:</strong> ${formatDate(new Date())}</div>
        </div>
      </div>

      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">Total Employees</div>
          <div class="kpi-value">${rows.length}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Flagged Variances (&ge; &plusmn;${threshold}%)</div>
          <div class="kpi-value" style="color: ${varianceCount > 0 ? '#b91c1c' : '#166534'}">${varianceCount}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Current Net Total</div>
          <div class="kpi-value">AED ${formatMoney(totalCurrentNet)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Previous Net Total</div>
          <div class="kpi-value">AED ${formatMoney(totalPrevNet)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Net Variance</div>
          <div class="kpi-value">${netDiff >= 0 ? '+' : ''}${formatMoney(netDiff)} AED (${netDiffPct.toFixed(2)}%)</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Emp Code</th>
            <th>Employee Name</th>
            <th class="text-right">Prev Net (AED)</th>
            <th class="text-right">Current Net (AED)</th>
            <th class="text-right">Diff (AED)</th>
            <th class="text-center">Variance %</th>
            <th>Status / Justification Reason</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) => `
            <tr>
              <td><strong>${r.code}</strong></td>
              <td>${r.name}</td>
              <td class="text-right">${r.prev}</td>
              <td class="text-right"><strong>${r.cur}</strong></td>
              <td class="text-right" style="color: ${r.diffRaw < 0 ? '#b91c1c' : r.diffRaw > 0 ? '#15803d' : '#64748b'}">${r.diffRaw >= 0 ? '+' : ''}${r.diff}</td>
              <td class="text-center">
                <span class="badge ${r.hasVariance ? (r.pctRaw < 0 ? 'badge-red' : 'badge-green') : 'badge-neutral'}">
                  ${r.pctRaw >= 0 ? '+' : ''}${r.pct}%
                </span>
              </td>
              <td>${r.reason}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div class="signatures">
        <div class="sig-box">
          <div class="sig-line"></div>
          <div>Prepared by: Payroll Specialist</div>
        </div>
        <div class="sig-box">
          <div class="sig-line"></div>
          <div>Reviewed by: HR Manager</div>
        </div>
        <div class="sig-box">
          <div class="sig-line"></div>
          <div>Approved by: General Manager / Finance</div>
        </div>
      </div>

      <div class="footer">
        Electronically Certified by Nextal HR Platform &bull; Pay Run ID: ${payRun.id} &bull; Generated: ${new Date().toISOString()}
      </div>
    </body>
    </html>
  `;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '8mm', bottom: '8mm', left: '10mm', right: '10mm' },
    });
    return Buffer.from(pdfBuffer);
  } catch (err) {
    console.warn('[PDF Variance Generator] Puppeteer error, fallback:', err.message);
    return Buffer.from(html, 'utf-8');
  } finally {
    if (browser) await browser.close();
  }
}

export default {
  generatePayslipPdf,
  generateVarianceReportPdf,
};
