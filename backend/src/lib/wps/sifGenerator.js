import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

/**
 * Format a Date to YYYY-MM-DD
 */
function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a Date to HH:MM
 */
function formatTime(d) {
  const date = new Date(d || Date.now());
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Generates UAE WPS SIF (Salary Information File) for a specific Company Visa Pay Run
 *
 * Requirements:
 * - Pay run must be Locked or Paid (T30)
 * - SCR header line with Employer ID, Routing Code, Timestamp, Salary Month, Total Salaries, Total Records, AED
 * - EDR employee line with Person ID, Bank Routing Code, IBAN, Period Dates, Days, Fixed, Variable, Deductions
 * - Exact mathematical integrity: SCR TotalSalaries strictly equals sum of EDR nets (T26)
 */
export function generateWpsSif({ payRun, company, companyVisa, payslips = [] }) {
  if (!['Locked', 'Paid'].includes(payRun.status)) {
    const err = new Error(
      `Cannot generate WPS SIF for pay run in '${payRun.status}' status. SIF file can only be generated from a Locked or Paid pay run.`
    );
    err.status = 400;
    err.code = 'SIF_REQUIRES_LOCKED_RUN';
    throw err;
  }

  const creationDate = formatDate(new Date());
  const creationTime = formatTime(new Date());

  const periodMonthStr = typeof payRun.period_month === 'string'
    ? payRun.period_month.slice(0, 7)
    : `${payRun.period_month.getUTCFullYear()}-${String(payRun.period_month.getUTCMonth() + 1).padStart(2, '0')}`;

  const employerId = (companyVisa.mol_establishment_id || '0000000000000').replace(/\D/g, '').padEnd(13, '0').slice(0, 13);
  const visaRoutingCode = (companyVisa.bank_routing_code || '000000000').replace(/\D/g, '').padEnd(9, '0').slice(0, 9);

  let totalSalaries = new Decimal(0);
  const edrLines = [];

  for (const ps of payslips) {
    const emp = ps.employee;
    const bank = emp?.bank_accounts?.find((b) => b.is_primary && b.is_active) || emp?.bank_accounts?.[0];
    
    // 14-digit MOHRE Person ID / Labour Card Number
    const rawPersonId = emp?.mohre_person_id || emp?.labour_card_no || emp?.emirates_id || emp?.employee_code || '';
    const personId = rawPersonId.replace(/\D/g, '').padEnd(14, '0').slice(0, 14);

    const bankRoutingCode = (bank?.routing_code || visaRoutingCode || '000000000').replace(/\D/g, '').padEnd(9, '0').slice(0, 9);
    const iban = (bank?.iban || '').toUpperCase().trim();

    if (!iban) {
      const err = new Error(`Employee ${emp?.name || ps.employee_id} is missing an IBAN. Cannot generate SIF.`);
      err.status = 400;
      err.code = 'MISSING_IBAN';
      throw err;
    }

    const startDate = formatDate(ps.period_from);
    const endDate = formatDate(ps.period_to);

    // Days in period (e.g. 30 or 31)
    const pFrom = new Date(ps.period_from);
    const pTo = new Date(ps.period_to);
    const daysInPeriod = Math.max(1, Math.round((pTo - pFrom) / (1000 * 60 * 60 * 24)) + 1);

    // Breakdown earnings & deductions from payslip lines
    let fixed = new Decimal(0);
    let variable = new Decimal(0);
    let deductions = new Decimal(0);

    if (ps.lines && ps.lines.length > 0) {
      for (const line of ps.lines) {
        const amt = new Decimal(line.amount || 0);
        if (['BASIC', 'HRA', 'TRA', 'OTH'].includes(line.code)) {
          fixed = fixed.plus(amt);
        } else if (line.code.startsWith('OT_') || line.code === 'BONUS' || line.code === 'COMMISSION') {
          variable = variable.plus(amt);
        } else if (['ABS', 'LATE', 'SICK_HALF', 'SICK_NONE', 'LOAN', 'ADV', 'GPSSA_EE'].includes(line.code)) {
          deductions = deductions.plus(amt);
        }
      }
    } else {
      // Fallback from payslip fields
      fixed = new Decimal(ps.gross || 0);
      deductions = new Decimal(ps.total_deductions || 0);
    }

    const net = new Decimal(ps.net || 0);
    totalSalaries = totalSalaries.plus(net);

    const edr = [
      'EDR',
      personId,
      bankRoutingCode,
      iban,
      startDate,
      endDate,
      daysInPeriod,
      fixed.toFixed(2),
      variable.toFixed(2),
      deductions.toFixed(2),
    ].join(',');

    edrLines.push({
      edr,
      employeeId: emp?.id,
      name: emp?.name,
      iban,
      net: net.toFixed(2),
      fixed: fixed.toFixed(2),
      variable: variable.toFixed(2),
      deductions: deductions.toFixed(2),
    });
  }

  const scrTotalStr = totalSalaries.toFixed(2);
  const totalRecords = edrLines.length;
  const employerRef = `NEXTAL-PR-${payRun.id.slice(0, 8)}`;

  const scr = [
    'SCR',
    employerId,
    visaRoutingCode,
    creationDate,
    creationTime,
    periodMonthStr,
    scrTotalStr,
    totalRecords,
    'AED',
    employerRef,
  ].join(',');

  const fullContent = [scr, ...edrLines.map((l) => l.edr)].join('\r\n') + '\r\n';
  const filename = `SIF_${employerId}_${periodMonthStr.replace('-', '')}.SIF`;

  return {
    content: fullContent,
    filename,
    scr,
    edrLines,
    totalSalaries: scrTotalStr,
    totalRecords,
    currency: 'AED',
    employerId,
  };
}

export default {
  generateWpsSif,
};
