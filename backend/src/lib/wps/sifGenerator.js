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
 * Format a Date to HHMM (4 digits, standard WPS format)
 */
function formatTimeHHMM(d) {
  const date = new Date(d || Date.now());
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}${minutes}`;
}

/**
 * Format a Date to MMYYYY (6 digits, standard WPS salary month)
 */
function formatSalaryMonth(d) {
  const date = new Date(d);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${month}${year}`;
}

/**
 * Generates UAE WPS SIF (Salary Information File) for a specific Company Visa Pay Run
 *
 * Requirements (Spec Section 9 & Appendix A.9):
 * - Pay run must be Locked or Paid (T30)
 * - SCR header line with Employer ID, Routing Code, Timestamp, Salary Month, Total Records, Total Salaries, AED
 * - EDR employee line with Person ID, Bank Routing Code, IBAN, Period Dates, Days, Fixed, Variable, Days On Leave
 * - Strict integrity: For each EDR, fixed + variable = net.
 * - Strict integrity: SCR Total Salaries = sum of (fixed + variable) of all EDRs = sum of all payslip nets (T26).
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
  const creationTime = formatTimeHHMM(new Date()); // HHMM (Field 5)
  const salaryMonth = formatSalaryMonth(payRun.period_month); // MMYYYY (Field 6)

  // Employer ID: 13-digit MOL establishment ID (Field 2)
  const employerId = (companyVisa.mol_establishment_id || '0000000000000')
    .replace(/\D/g, '')
    .padEnd(13, '0')
    .slice(0, 13);

  // Visa Bank Routing Code: 9 digits (Field 3)
  const visaRoutingCode = (companyVisa.bank_routing_code || '000000000')
    .replace(/\D/g, '')
    .padEnd(9, '0')
    .slice(0, 9);

  let totalSalaries = new Decimal(0);
  const edrLines = [];

  for (const ps of payslips) {
    const emp = ps.employee;
    const bank = emp?.bank_accounts?.find((b) => b.is_primary && b.is_active) || emp?.bank_accounts?.[0];

    // 14-digit MOHRE Person ID / Labour Card Number (Field 2)
    const rawPersonId = emp?.mohre_person_id || emp?.labour_card_no || emp?.emirates_id || emp?.employee_code || '';
    const personId = rawPersonId.replace(/\D/g, '').padEnd(14, '0').slice(0, 14);

    // 9-digit Bank / Agent Routing Code (Field 3)
    const bankRoutingCode = (bank?.routing_code || visaRoutingCode || '000000000')
      .replace(/\D/g, '')
      .padEnd(9, '0')
      .slice(0, 9);

    // UAE IBAN (Field 4)
    const iban = (bank?.iban || '').toUpperCase().trim();
    if (!iban) {
      const err = new Error(`Employee ${emp?.name || ps.employee_id} is missing an IBAN. Cannot generate SIF.`);
      err.status = 400;
      err.code = 'MISSING_IBAN';
      throw err;
    }

    // Period Start Date (Field 5) and End Date (Field 6)
    const startDate = formatDate(ps.period_from);
    const endDate = formatDate(ps.period_to);

    // Days in Period (Field 7)
    const pFrom = new Date(ps.period_from);
    const pTo = new Date(ps.period_to);
    const daysInPeriod = Math.max(1, Math.round((pTo - pFrom) / (1000 * 60 * 60 * 24)) + 1);

    // Variable Earnings: Overtime and other variable pay
    let variableEarnings = new Decimal(0);
    if (ps.lines && ps.lines.length > 0) {
      for (const line of ps.lines) {
        const amt = new Decimal(line.amount || 0);
        if (line.code.startsWith('OT_') || line.code === 'BONUS' || line.code === 'COMMISSION') {
          variableEarnings = variableEarnings.plus(amt);
        }
      }
    }

    // The amount transferred must strictly equal the payslip net:
    // Fixed + Variable = Net (deductions are netted prior to transfer)
    const net = new Decimal(ps.net || 0);
    const variable = Decimal.min(variableEarnings, net);
    const fixed = net.minus(variable);

    // Days on leave (Field 10)
    let daysOnLeave = 0;
    if (emp?.attendance_days && Array.isArray(emp.attendance_days)) {
      daysOnLeave = emp.attendance_days.filter((a) => ['Leave', 'UnpaidLeave'].includes(a.day_type)).length;
    } else if (emp?.leave_requests && Array.isArray(emp.leave_requests)) {
      daysOnLeave = emp.leave_requests
        .filter((l) => l.status === 'Approved')
        .reduce((sum, l) => sum + Number(l.days || 0), 0);
    }

    totalSalaries = totalSalaries.plus(net);

    /**
     * EDR Record Layout:
     * 1: Record Type ('EDR')
     * 2: Employee Person ID / Labour Card Number (14 digits)
     * 3: Agent / Bank Routing Code (9 digits)
     * 4: Employee IBAN (23 characters)
     * 5: Pay Start Date (YYYY-MM-DD)
     * 6: Pay End Date (YYYY-MM-DD)
     * 7: Days in Period (e.g. 30 or 31)
     * 8: Fixed Income (Net minus Variable)
     * 9: Variable Income (Overtime, etc.)
     * 10: Days on Leave (Leave days count in period)
     */
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
      daysOnLeave,
    ].join(',');

    edrLines.push({
      edr,
      employeeId: emp?.id,
      name: emp?.name,
      iban,
      net: net.toFixed(2),
      fixed: fixed.toFixed(2),
      variable: variable.toFixed(2),
      daysOnLeave,
    });
  }

  const scrTotalStr = totalSalaries.toFixed(2);
  const totalRecords = edrLines.length;
  const employerRef = `NEXTAL-PR-${payRun.id.slice(0, 8)}`;

  /**
   * SCR Header Layout:
   * 1: Record Type ('SCR')
   * 2: Employer MOL Establishment ID (13 digits)
   * 3: Bank / Agent Routing Code (9 digits)
   * 4: File Creation Date (YYYY-MM-DD)
   * 5: File Creation Time (HHMM, 4 digits without colon)
   * 6: Salary Month (MMYYYY, 6 digits)
   * 7: Total Records (Number of EDR lines)
   * 8: Total Salaries (Sum of Fixed + Variable = Sum of Net)
   * 9: Currency ('AED')
   * 10: Employer Reference
   */
  const scr = [
    'SCR',
    employerId,
    visaRoutingCode,
    creationDate,
    creationTime,
    salaryMonth,
    totalRecords,
    scrTotalStr,
    'AED',
    employerRef,
  ].join(',');

  const fullContent = [scr, ...edrLines.map((l) => l.edr)].join('\r\n') + '\r\n';
  const filename = `SIF_${employerId}_${salaryMonth}.SIF`;

  return {
    content: fullContent,
    filename,
    scr,
    edrLines,
    totalSalaries: scrTotalStr,
    totalRecords,
    currency: 'AED',
    employerId,
    salaryMonth,
  };
}

export default {
  generateWpsSif,
};
