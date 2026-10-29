import ExcelJS from 'exceljs';
import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

/**
 * Generates an executive Excel Payroll Register for a Pay Run
 */
export async function generatePayrollRegisterExcel({ payRun, company, companyVisa, payslips = [] }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Nextal HR Platform';
  workbook.lastModifiedBy = 'Nextal Payroll Engine';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Payroll Register', {
    views: [{ showGridLines: true }],
  });

  // Company Header
  sheet.mergeCells('A1:U1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `${company.name} - Payroll Register`;
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 32;

  // Metadata Subheader
  sheet.mergeCells('A2:U2');
  const subCell = sheet.getCell('A2');
  const periodStr = typeof payRun.period_month === 'string'
    ? payRun.period_month.slice(0, 7)
    : `${payRun.period_month.getUTCFullYear()}-${String(payRun.period_month.getUTCMonth() + 1).padStart(2, '0')}`;
  subCell.value = `Period: ${periodStr} | Visa: ${companyVisa?.name || '-'} | Status: ${payRun.status} | Currency: AED`;
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(2).height = 20;

  // Column Headers
  const headers = [
    'Emp Code',
    'Employee Name',
    'Department',
    'Designation',
    'Basic (AED)',
    'Housing (AED)',
    'Transport (AED)',
    'Other (AED)',
    'Gross Salary (AED)',
    'Normal OT (AED)',
    'Night OT (AED)',
    'Holiday OT (AED)',
    'Absence (AED)',
    'Late Penalty (AED)',
    'Sick Deduction (AED)',
    'Loan Recovery (AED)',
    'Advance Recovery (AED)',
    'GPSSA Pension EE (AED)',
    'Total Deductions (AED)',
    'Net Pay to WPS (AED)',
    'IBAN',
  ];

  const headerRow = sheet.addRow(headers);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
    };
  });

  // Populate Data Rows
  let startDataRow = 4;
  let currentRow = startDataRow;

  for (const ps of payslips) {
    const emp = ps.employee;
    const linesMap = {};
    if (ps.lines) {
      for (const l of ps.lines) {
        linesMap[l.code] = Number(l.amount || 0);
      }
    }

    const basic = Number(ps.basic || linesMap['BASIC'] || 0);
    const hra = linesMap['HRA'] || 0;
    const tra = linesMap['TRA'] || 0;
    const oth = linesMap['OTH'] || 0;
    const gross = Number(ps.gross || basic + hra + tra + oth);

    const otNorm = linesMap['OT_NORMAL'] || 0;
    const otNight = linesMap['OT_NIGHT'] || 0;
    const otRest = linesMap['OT_REST'] || 0;

    const abs = linesMap['ABS'] || 0;
    const late = linesMap['LATE'] || 0;
    const sick = (linesMap['SICK_HALF'] || 0) + (linesMap['SICK_NONE'] || 0);
    const loan = linesMap['LOAN'] || 0;
    const adv = linesMap['ADV'] || 0;
    const gpssa = linesMap['GPSSA_EE'] || 0;
    const totalDeductions = Number(ps.total_deductions || 0);
    const net = Number(ps.net || 0);

    const bank = emp?.bank_accounts?.find((b) => b.is_primary && b.is_active) || emp?.bank_accounts?.[0];
    const iban = bank?.iban ? `AE** **** **** ${bank.iban.slice(-4)}` : '-';

    const row = sheet.addRow([
      emp?.employee_code || '-',
      emp?.name || '-',
      emp?.department?.name || ps.contract?.department?.name || 'General',
      ps.contract?.job?.title || 'Staff',
      basic,
      hra,
      tra,
      oth,
      gross,
      otNorm,
      otNight,
      otRest,
      abs,
      late,
      sick,
      loan,
      adv,
      gpssa,
      totalDeductions,
      net,
      iban,
    ]);

    row.height = 20;

    // Format currency columns
    for (let c = 5; c <= 20; c++) {
      const cell = row.getCell(c);
      cell.numFmt = '#,##0.00';
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    }

    currentRow++;
  }

  // Summary Row with Excel formulas
  const lastDataRow = currentRow - 1;
  const summaryRow = sheet.addRow([
    'TOTAL',
    `Total Records: ${payslips.length}`,
    '',
    '',
    { formula: `SUM(E${startDataRow}:E${lastDataRow})` },
    { formula: `SUM(F${startDataRow}:F${lastDataRow})` },
    { formula: `SUM(G${startDataRow}:G${lastDataRow})` },
    { formula: `SUM(H${startDataRow}:H${lastDataRow})` },
    { formula: `SUM(I${startDataRow}:I${lastDataRow})` },
    { formula: `SUM(J${startDataRow}:J${lastDataRow})` },
    { formula: `SUM(K${startDataRow}:K${lastDataRow})` },
    { formula: `SUM(L${startDataRow}:L${lastDataRow})` },
    { formula: `SUM(M${startDataRow}:M${lastDataRow})` },
    { formula: `SUM(N${startDataRow}:N${lastDataRow})` },
    { formula: `SUM(O${startDataRow}:O${lastDataRow})` },
    { formula: `SUM(P${startDataRow}:P${lastDataRow})` },
    { formula: `SUM(Q${startDataRow}:Q${lastDataRow})` },
    { formula: `SUM(R${startDataRow}:R${lastDataRow})` },
    { formula: `SUM(S${startDataRow}:S${lastDataRow})` },
    { formula: `SUM(T${startDataRow}:T${lastDataRow})` },
    '',
  ]);

  summaryRow.height = 24;
  summaryRow.eachCell((cell, colNumber) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0F172A' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
    };
    if (colNumber >= 5 && colNumber <= 20) {
      cell.numFmt = '#,##0.00';
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    }
  });

  // Auto-fit column widths
  sheet.columns.forEach((col, idx) => {
    col.width = idx === 1 ? 26 : idx >= 4 && idx <= 19 ? 16 : 14;
  });

  return await workbook.xlsx.writeBuffer();
}

/**
 * Generates an Excel Variance Review Report comparing payslips against the previous period
 */
export async function generateVarianceReportExcel({ payRun, company, variances = [], thresholdPct = 10.0 }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Nextal HR Platform';
  const sheet = workbook.addWorksheet('Payroll Variance Report');

  // Title
  sheet.mergeCells('A1:I1');
  const title = sheet.getCell('A1');
  title.value = `${company.name} - Payroll Variance Report (Threshold: ±${thresholdPct}%)`;
  title.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  title.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 30;

  // Header row
  const headers = [
    'Emp Code',
    'Employee Name',
    'Department',
    'Previous Net (AED)',
    'Current Net (AED)',
    'Net Variance (AED)',
    'Variance %',
    'Flagged Exceeding Threshold',
    'Explanation / Justification',
  ];

  const hRow = sheet.addRow(headers);
  hRow.height = 24;
  hRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  for (const v of variances) {
    const isExceeded = Math.abs(Number(v.variance_pct || 0)) > Number(thresholdPct);
    const row = sheet.addRow([
      v.employee?.employee_code || '-',
      v.employee?.name || '-',
      v.contract?.department?.name || v.employee?.department?.name || '-',
      Number(v.previous_net || 0),
      Number(v.net || 0),
      Number(v.variance_amount || Number(v.net || 0) - Number(v.previous_net || 0)),
      `${Number(v.variance_pct || 0).toFixed(2)}%`,
      isExceeded ? 'YES - FLAG' : 'No',
      v.variance_reason || (isExceeded ? 'Pending HR justification' : '-'),
    ]);

    row.height = 20;

    // Currency formatting
    row.getCell(4).numFmt = '#,##0.00';
    row.getCell(5).numFmt = '#,##0.00';
    row.getCell(6).numFmt = '#,##0.00';

    if (isExceeded) {
      row.getCell(8).font = { bold: true, color: { argb: 'FFDC2626' } };
      row.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    }
  }

  sheet.columns.forEach((col, idx) => {
    col.width = idx === 1 ? 26 : idx === 8 ? 32 : 18;
  });

  return await workbook.xlsx.writeBuffer();
}

export default {
  generatePayrollRegisterExcel,
  generateVarianceReportExcel,
};
