import ExcelJS from 'exceljs';
import crypto from 'node:crypto';
import prisma from '../lib/prisma.js';
import authService from './authService.js';
import auditService from './auditService.js';
import { validateUaeIban } from '../../prisma/seed/employees.js';
import { assertPasswordCompliant } from '@nextal/shared';

// Forbidden formula injection prefixes
const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

// Prompt 6 Step 3 exact fields & labels:
// first_name, last_name, email, phone, gender, date_of_birth, nationality (ISO-2), emirates_id, passport_number, passport_expiry,
// visa_sponsor_company, branch, department, job_title, joining_date, employment_type, contract_type, basic_salary,
// housing_allowance, transport_allowance, other_allowances, bank_name, iban.
export const IMPORT_COLUMNS = [
  { key: 'first_name', labelEn: 'First Name', labelAr: 'الاسم الأول', required: true, example: 'Tariq' },
  { key: 'last_name', labelEn: 'Last Name', labelAr: 'اسم العائلة', required: true, example: 'Mansoor' },
  { key: 'email', labelEn: 'Work Email', labelAr: 'البريد الإلكتروني للعمل', required: true, example: 'tariq.mansoor@example.com' },
  { key: 'phone', labelEn: 'Phone Number', labelAr: 'رقم الهاتف', required: false, example: '+971501234567' },
  { key: 'gender', labelEn: 'Gender (Male/Female)', labelAr: 'الجنس', required: false, example: 'Male' },
  { key: 'date_of_birth', labelEn: 'Date of Birth (YYYY-MM-DD)', labelAr: 'تاريخ الميلاد', required: false, example: '1990-05-15' },
  { key: 'nationality', labelEn: 'Nationality (ISO-2 e.g. AE, IN)', labelAr: 'الجنسية', required: true, example: 'AE' },
  { key: 'emirates_id', labelEn: 'Emirates ID (784-YYYY-NNNNNNN-C)', labelAr: 'رقم الهوية الإماراتية', required: true, example: '784-1990-1234567-1' },
  { key: 'passport_number', labelEn: 'Passport Number', labelAr: 'رقم جواز السفر', required: false, example: 'A12345678' },
  { key: 'passport_expiry', labelEn: 'Passport Expiry (YYYY-MM-DD)', labelAr: 'تاريخ انتهاء الجواز', required: false, example: '2028-05-20' },
  { key: 'visa_sponsor_company', labelEn: 'Visa Sponsor Company', labelAr: 'الشركة الراعية للتأشيرة', required: false, example: 'Visa 01 (MOHRE Dubai)' },
  { key: 'branch', labelEn: 'Branch', labelAr: 'اسم الفرع', required: true, example: 'Dubai Main Branch' },
  { key: 'department', labelEn: 'Department', labelAr: 'اسم القسم', required: true, example: 'Operations' },
  { key: 'job_title', labelEn: 'Job Title', labelAr: 'المسمى الوظيفي', required: false, example: 'Operations Specialist' },
  { key: 'joining_date', labelEn: 'Joining Date (YYYY-MM-DD)', labelAr: 'تاريخ الالتحاق', required: true, example: '2024-01-15' },
  { key: 'employment_type', labelEn: 'Employment Type', labelAr: 'نوع التوظيف', required: false, example: 'Full-time' },
  { key: 'contract_type', labelEn: 'Contract Type (Limited/Unlimited)', labelAr: 'نوع العقد', required: false, example: 'Limited' },
  { key: 'basic_salary', labelEn: 'Basic Salary (AED)', labelAr: 'الراتب الأساسي', required: true, example: '6000' },
  { key: 'housing_allowance', labelEn: 'Housing Allowance (AED)', labelAr: 'بدل السكن', required: false, example: '2500' },
  { key: 'transport_allowance', labelEn: 'Transport Allowance (AED)', labelAr: 'بدل النقل', required: false, example: '1000' },
  { key: 'other_allowances', labelEn: 'Other Allowances (AED)', labelAr: 'بدلات أخرى', required: false, example: '500' },
  { key: 'bank_name', labelEn: 'Bank Name', labelAr: 'اسم البنك', required: false, example: 'Emirates NBD' },
  { key: 'iban', labelEn: 'UAE IBAN (AE + 21 digits)', labelAr: 'رقم الآيبان', required: false, example: 'AE070331000000000123456' },
];

// Header mapping dictionary for maximum compatibility
const HEADER_KEY_MAP = {
  first_name: 'first_name',
  firstname: 'first_name',
  'first name': 'first_name',
  'الاسم الأول': 'first_name',

  last_name: 'last_name',
  lastname: 'last_name',
  'last name': 'last_name',
  'اسم العائلة': 'last_name',

  name: 'name',
  'full name': 'name',
  'full name (english)': 'name',
  'الاسم الكامل بالإنجليزية': 'name',
  arabic_name: 'arabic_name',
  'الاسم الكامل بالعربية': 'arabic_name',

  email: 'email',
  work_email: 'email',
  'work email': 'email',
  'البريد الإلكتروني للعمل': 'email',

  phone: 'phone',
  mobile: 'phone',
  'phone number': 'phone',
  'mobile number': 'phone',
  'رقم الهاتف': 'phone',

  gender: 'gender',
  'gender (male/female)': 'gender',
  'الجنس': 'gender',

  date_of_birth: 'date_of_birth',
  birth_date: 'date_of_birth',
  'date of birth': 'date_of_birth',
  'date of birth (yyyy-mm-dd)': 'date_of_birth',
  'تاريخ الميلاد': 'date_of_birth',

  nationality: 'nationality',
  'nationality (iso-2)': 'nationality',
  'nationality (iso-2 e.g. ae, in)': 'nationality',
  'nationality (3-letter)': 'nationality',
  'الجنسية': 'nationality',

  emirates_id: 'emirates_id',
  'emirates id': 'emirates_id',
  'emirates id (784-yyyy-nnnnnnn-c)': 'emirates_id',
  'رقم الهوية الإماراتية': 'emirates_id',

  emirates_id_expiry: 'emirates_id_expiry',
  'emirates id expiry': 'emirates_id_expiry',
  'emirates id expiry (yyyy-mm-dd)': 'emirates_id_expiry',
  'تاريخ انتهاء الهوية': 'emirates_id_expiry',

  passport_number: 'passport_number',
  'passport number': 'passport_number',
  'رقم جواز السفر': 'passport_number',

  passport_expiry: 'passport_expiry',
  'passport expiry': 'passport_expiry',
  'passport expiry (yyyy-mm-dd)': 'passport_expiry',
  'تاريخ انتهاء الجواز': 'passport_expiry',

  visa_sponsor_company: 'visa_sponsor_company',
  visa_name: 'visa_sponsor_company',
  visa: 'visa_sponsor_company',
  'visa sponsor company': 'visa_sponsor_company',
  'visa / establishment name': 'visa_sponsor_company',
  'اسم التأشيرة أو المنشأة': 'visa_sponsor_company',
  'الشركة الراعية للتأشيرة': 'visa_sponsor_company',

  branch: 'branch',
  branch_name: 'branch',
  'branch name': 'branch',
  'اسم الفرع': 'branch',
  'الفرع': 'branch',

  department: 'department',
  department_name: 'department',
  'department name': 'department',
  'اسم القسم': 'department',
  'القسم': 'department',

  job_title: 'job_title',
  'job title': 'job_title',
  'المسمى الوظيفي': 'job_title',

  shift_name: 'shift_name',
  shift: 'shift_name',
  'shift name': 'shift_name',
  'اسم الوردية': 'shift_name',

  joining_date: 'joining_date',
  'joining date': 'joining_date',
  'joining date (yyyy-mm-dd)': 'joining_date',
  'تاريخ الالتحاق': 'joining_date',

  employment_type: 'employment_type',
  'employment type': 'employment_type',
  'نوع التوظيف': 'employment_type',

  contract_type: 'contract_type',
  'contract type': 'contract_type',
  'contract type (limited/unlimited)': 'contract_type',
  'نوع العقد': 'contract_type',

  basic_salary: 'basic_salary',
  'basic salary': 'basic_salary',
  'basic salary (aed)': 'basic_salary',
  'الراتب الأساسي': 'basic_salary',

  housing_allowance: 'housing_allowance',
  'housing allowance': 'housing_allowance',
  'housing allowance (aed)': 'housing_allowance',
  'بدل السكن': 'housing_allowance',

  transport_allowance: 'transport_allowance',
  'transport allowance': 'transport_allowance',
  'transport allowance (aed)': 'transport_allowance',
  'بدل النقل': 'transport_allowance',

  other_allowances: 'other_allowances',
  'other allowances': 'other_allowances',
  'other allowances (aed)': 'other_allowances',
  'بدلات أخرى': 'other_allowances',

  bank_name: 'bank_name',
  'bank name': 'bank_name',
  'اسم البنك': 'bank_name',

  iban: 'iban',
  'uae iban': 'iban',
  'uae iban (ae + 21 digits)': 'iban',
  'رقم الآيبان': 'iban',

  routing_code: 'routing_code',
  'routing code': 'routing_code',
  'bank routing code': 'routing_code',
  'رمز توجيه البنك': 'routing_code',

  employee_code: 'employee_code',
  'employee code': 'employee_code',
  'رمز الموظف': 'employee_code',
};

function normalizeHeaderKey(header) {
  if (!header) return '';
  const clean = String(header).trim().toLowerCase();
  return HEADER_KEY_MAP[clean] || clean.replace(/[^a-z0-9_]/g, '_');
}

export class EmployeeImportService {
  constructor(client = prisma) {
    this.prisma = client;
  }

  /**
   * Sanitize text against spreadsheet formula injection attacks
   */
  checkFormulaInjection(val, field = '') {
    if (val === null || val === undefined) return false;
    const str = String(val).trim();
    if (str.length === 0) return false;
    // Allow legitimate international phone numbers starting with '+' followed by digits
    if ((field === 'phone' || field === 'mobile') && /^\+\d[\d\s-]*$/.test(str)) {
      return false;
    }
    const firstChar = str.charAt(0);
    return FORMULA_PREFIXES.includes(firstChar);
  }

  /**
   * Format Date to YYYY-MM-DD string
   */
  formatDateValue(val) {
    if (!val) return null;
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return null;
      return val.toISOString().slice(0, 10);
    }
    const str = String(val).trim();
    const match = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (match) {
      const y = match[1];
      const m = match[2].padStart(2, '0');
      const d = match[3].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return str;
  }

  /**
   * Generate Downloadable Import Template (CSV or XLSX)
   */
  async generateTemplate({ companyId, format = 'xlsx' } = {}) {
    const [visas, branches, departments, shifts] = await Promise.all([
      this.prisma.$base().company_visas.findMany({ where: { company_id: companyId }, select: { name: true } }),
      this.prisma.$base().branches.findMany({ where: { company_id: companyId }, select: { name: true } }),
      this.prisma.$base().departments.findMany({ where: { company_id: companyId }, select: { name: true } }),
      this.prisma.$base().shifts.findMany({ where: { company_id: companyId }, select: { name: true } }),
    ]);

    if (format === 'csv') {
      const headerRow1 = IMPORT_COLUMNS.map((c) => `"${c.labelEn}"`).join(',');
      const headerRow2 = IMPORT_COLUMNS.map((c) => `"${c.labelAr}"`).join(',');
      const sampleRow = IMPORT_COLUMNS.map((c) => `"${c.example || ''}"`).join(',');
      return {
        filename: 'employee-import-template.csv',
        contentType: 'text/csv; charset=utf-8',
        buffer: Buffer.from(`\uFEFF${headerRow1}\n${headerRow2}\n${sampleRow}\n`, 'utf8'),
      };
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Nextal HR & Payroll UAE';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Employee Import', {
      views: [{ state: 'frozen', ySplit: 2 }],
    });

    const row1 = sheet.addRow(IMPORT_COLUMNS.map((c) => c.labelEn));
    row1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    row1.alignment = { vertical: 'middle', horizontal: 'center' };
    row1.height = 24;

    const row2 = sheet.addRow(IMPORT_COLUMNS.map((c) => c.labelAr));
    row2.font = { bold: true, color: { argb: 'FF334155' } };
    row2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    row2.alignment = { vertical: 'middle', horizontal: 'center' };
    row2.height = 20;

    const sampleRow = sheet.addRow(IMPORT_COLUMNS.map((c) => c.example));
    sampleRow.alignment = { vertical: 'middle' };

    IMPORT_COLUMNS.forEach((col, idx) => {
      const worksheetCol = sheet.getColumn(idx + 1);
      worksheetCol.width = Math.max(col.labelEn.length, col.example.length, 18);
    });

    const refSheet = workbook.addWorksheet('Reference Data');
    refSheet.state = 'hidden';

    const visaNames = visas.map((v) => v.name);
    const deptNames = departments.map((d) => d.name);
    const branchNames = branches.map((b) => b.name);
    const shiftNames = shifts.map((s) => s.name);

    refSheet.getColumn(1).values = ['Visas', ...visaNames];
    refSheet.getColumn(2).values = ['Departments', ...deptNames];
    refSheet.getColumn(3).values = ['Branches', ...branchNames];
    refSheet.getColumn(4).values = ['Shifts', ...shiftNames];
    refSheet.getColumn(5).values = ['Genders', 'Male', 'Female'];
    refSheet.getColumn(6).values = ['ContractTypes', 'Limited', 'Unlimited'];
    refSheet.getColumn(7).values = ['EmploymentTypes', 'Full-time', 'Part-time', 'Contract'];

    for (let r = 3; r <= 1000; r++) {
      sheet.getCell(`E${r}`).dataValidation = { type: 'list', formulae: ['"Male,Female"'] }; // gender
      sheet.getCell(`Q${r}`).dataValidation = { type: 'list', formulae: ['"Limited,Unlimited"'] }; // contract_type
      sheet.getCell(`P${r}`).dataValidation = { type: 'list', formulae: ['"Full-time,Part-time,Contract"'] }; // employment_type

      if (visaNames.length > 0) {
        sheet.getCell(`K${r}`).dataValidation = {
          type: 'list',
          formulae: [`'Reference Data'!$A$2:$A$${visaNames.length + 1}`],
        };
      }
      if (branchNames.length > 0) {
        sheet.getCell(`L${r}`).dataValidation = {
          type: 'list',
          formulae: [`'Reference Data'!$C$2:$C$${branchNames.length + 1}`],
        };
      }
      if (deptNames.length > 0) {
        sheet.getCell(`M${r}`).dataValidation = {
          type: 'list',
          formulae: [`'Reference Data'!$B$2:$B$${deptNames.length + 1}`],
        };
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      filename: 'employee-import-template.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from(buffer),
    };
  }

  /**
   * Parse Uploaded Buffer (CSV or XLSX) into array of row objects
   */
  async parseBuffer(buffer, filename = '') {
    const isCsv = filename.toLowerCase().endsWith('.csv') || (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf);
    const rows = [];

    if (isCsv) {
      let text = buffer.toString('utf8');
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) return rows;

      const parseCsvLine = (line) => {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              cur += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
          } else {
            cur += char;
          }
        }
        result.push(cur.trim());
        return result;
      };

      const rawHeaders = parseCsvLine(lines[0]);
      const headerKeys = rawHeaders.map((h) => normalizeHeaderKey(h.replace(/^["']|["']$/g, '')));

      let startIdx = 1;
      if (lines.length > 2 && (lines[1].includes('الاسم') || lines[1].includes('رمز') || lines[1].includes('تاريخ'))) {
        startIdx = 2;
      }

      for (let i = startIdx; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]);
        if (values.every((v) => !v)) continue;
        const rowObj = { _rowNumber: i + 1 };
        headerKeys.forEach((k, idx) => {
          rowObj[k] = values[idx] !== undefined ? values[idx].replace(/^["']|["']$/g, '').trim() : '';
        });
        rows.push(rowObj);
      }
    } else {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet(1);
      if (!sheet) return rows;

      let headerKeys = [];
      sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const values = row.values.slice(1);
        if (rowNumber === 1) {
          headerKeys = values.map((val) => normalizeHeaderKey(val));
          return;
        }

        if (rowNumber === 2) {
          const rowText = values.map((v) => String(v || '')).join(' ');
          if (rowText.includes('الاسم') || rowText.includes('رمز') || rowText.includes('تاريخ')) {
            return;
          }
        }

        const rowObj = { _rowNumber: rowNumber };
        headerKeys.forEach((key, idx) => {
          let cellVal = values[idx];
          if (cellVal && typeof cellVal === 'object' && cellVal.result !== undefined) {
            cellVal = cellVal.result;
          }
          if (cellVal instanceof Date) {
            cellVal = cellVal.toISOString().slice(0, 10);
          }
          rowObj[key] = cellVal !== undefined && cellVal !== null ? String(cellVal).trim() : '';
        });

        const hasData = Object.keys(rowObj).some((k) => k !== '_rowNumber' && rowObj[k] !== '');
        if (hasData) rows.push(rowObj);
      });
    }

    return rows;
  }

  /**
   * Validate Rows and return comprehensive error log
   */
  async validateRows(rawRows, companyId) {
    const errors = [];
    const validRows = [];

    // Max 1000 rows safeguard
    if (rawRows.length > 1000) {
      throw new Error(`File contains ${rawRows.length} rows. Maximum allowed is 1000 rows per import.`);
    }

    const [visas, branches, departments, shifts, salaryStructures, attendancePolicies, existingEmployees, existingUsers, existingBanks] = await Promise.all([
      this.prisma.$base().company_visas.findMany({ where: { company_id: companyId } }),
      this.prisma.$base().branches.findMany({ where: { company_id: companyId } }),
      this.prisma.$base().departments.findMany({ where: { company_id: companyId } }),
      this.prisma.$base().shifts.findMany({ where: { company_id: companyId } }),
      this.prisma.$base().salary_structures.findMany({ where: { company_id: companyId } }),
      this.prisma.$base().attendance_policies.findMany({ where: { company_id: companyId } }),
      this.prisma.$base().employees.findMany({
        where: { company_id: companyId },
        select: { employee_code: true, work_email: true },
      }),
      this.prisma.$base().users.findMany({
        where: { company_id: companyId },
        select: { email: true },
      }),
      this.prisma.$base().bank_accounts.findMany({
        where: { company_id: companyId },
        select: { iban: true },
      }),
    ]);

    const existingEmpCodes = new Set(existingEmployees.map((e) => e.employee_code.toLowerCase()));
    const existingEmails = new Set(existingEmployees.map((e) => (e.work_email || '').toLowerCase()));
    existingUsers.forEach((u) => existingEmails.add((u.email || '').toLowerCase()));
    const existingIbans = new Set(existingBanks.map((b) => b.iban.replace(/\s+/g, '').toUpperCase()));

    const fileCodes = new Set();
    const fileEmails = new Set();
    const fileIbans = new Set();
    const fileEmiratesIds = new Set();

    const visaMap = new Map();
    visas.forEach((v) => {
      visaMap.set(v.id.toLowerCase(), v);
      visaMap.set(v.name.toLowerCase(), v);
    });

    const branchMap = new Map();
    branches.forEach((b) => {
      branchMap.set(b.id.toLowerCase(), b);
      branchMap.set(b.name.toLowerCase(), b);
    });

    const deptMap = new Map();
    departments.forEach((d) => {
      deptMap.set(d.id.toLowerCase(), d);
      deptMap.set(d.name.toLowerCase(), d);
    });

    const shiftMap = new Map();
    shifts.forEach((s) => {
      shiftMap.set(s.id.toLowerCase(), s);
      shiftMap.set(s.name.toLowerCase(), s);
    });

    const defaultStructure = salaryStructures[0] || null;
    const defaultVisa = visas[0] || null;
    const defaultShift = shifts[0] || null;
    const defaultAttendancePolicy = attendancePolicies[0] || null;

    for (const row of rawRows) {
      const rowNum = row._rowNumber || 'Unknown';
      let rowValid = true;

      const addError = (field, message, value = '') => {
        rowValid = false;
        errors.push({ row: rowNum, field, message, value });
      };

      // 1. Formula / Macro Injection Prevention
      for (const [k, v] of Object.entries(row)) {
        if (k === '_rowNumber') continue;
        if (this.checkFormulaInjection(v, k)) {
          addError(k, `Formula injection forbidden: cell starts with '=', '+', '-', or '@'`, v);
        }
      }

      // Normalize names
      const firstName = (row.first_name || '').trim();
      const lastName = (row.last_name || '').trim();
      let fullName = (row.name || '').trim();
      if (!fullName && firstName && lastName) {
        fullName = `${firstName} ${lastName}`;
      } else if (!fullName && firstName) {
        fullName = firstName;
      }

      // Mandatory: first_name, last_name (or full name)
      if (!firstName && !fullName) {
        addError('first_name', 'First name is mandatory', row.first_name);
      }
      if (!lastName && (!fullName || !fullName.includes(' '))) {
        addError('last_name', 'Last name is mandatory', row.last_name);
      }

      // Mandatory: email
      const email = (row.email || row.work_email || '').trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        addError('email', 'A valid work email is mandatory', row.email || row.work_email);
      } else {
        if (fileEmails.has(email)) {
          addError('email', `Duplicate email '${email}' within uploaded file`, email);
        } else if (existingEmails.has(email)) {
          addError('email', `Employee with email '${email}' already exists in company`, email);
        } else {
          fileEmails.add(email);
        }
      }

      // Optional employee code
      const empCode = (row.employee_code || '').trim();
      if (empCode) {
        const cleanCode = empCode.toLowerCase();
        if (fileCodes.has(cleanCode)) {
          addError('employee_code', `Duplicate employee code '${empCode}' within uploaded file`, empCode);
        } else if (existingEmpCodes.has(cleanCode)) {
          addError('employee_code', `Employee code '${empCode}' already exists in company`, empCode);
        } else {
          fileCodes.add(cleanCode);
        }
      }

      // Mandatory: nationality (ISO-2 e.g. AE, IN or ISO-3)
      const nationality = (row.nationality || '').trim().toUpperCase();
      if (!nationality || nationality.length < 2) {
        addError('nationality', 'Nationality is mandatory (e.g. ISO-2 code like AE, IN, GB)', row.nationality);
      }

      // Gender (defaults to Male if omitted)
      const rawGender = (row.gender || 'Male').trim().toLowerCase();
      const gender = rawGender === 'female' ? 'Female' : 'Male';

      // Mandatory: joining_date
      const joiningDateStr = this.formatDateValue(row.joining_date);
      if (!joiningDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(joiningDateStr)) {
        addError('joining_date', 'Joining date is mandatory in YYYY-MM-DD format', row.joining_date);
      }

      // Date of birth (optional)
      const dobStr = this.formatDateValue(row.date_of_birth || row.birth_date);
      if ((row.date_of_birth || row.birth_date) && (!dobStr || !/^\d{4}-\d{2}-\d{2}$/.test(dobStr))) {
        addError('date_of_birth', 'Date of birth must be in YYYY-MM-DD format', row.date_of_birth);
      }

      // Mandatory: emirates_id (784-YYYY-NNNNNNN-C)
      const cleanEid = (row.emirates_id || '').trim();
      if (!cleanEid) {
        addError('emirates_id', 'Emirates ID is mandatory (format: 784-YYYY-NNNNNNN-C)', row.emirates_id);
      } else if (!/^784-\d{4}-\d{7}-\d$/.test(cleanEid)) {
        addError('emirates_id', `Emirates ID must match UAE 15-digit format '784-YYYY-NNNNNNN-C'`, row.emirates_id);
      } else if (fileEmiratesIds.has(cleanEid)) {
        addError('emirates_id', `Duplicate Emirates ID '${cleanEid}' within file`, cleanEid);
      } else {
        fileEmiratesIds.add(cleanEid);
      }

      const eidExpiryStr = this.formatDateValue(row.emirates_id_expiry);
      if (row.emirates_id_expiry && (!eidExpiryStr || !/^\d{4}-\d{2}-\d{2}$/.test(eidExpiryStr))) {
        addError('emirates_id_expiry', 'Emirates ID expiry must be in YYYY-MM-DD format', row.emirates_id_expiry);
      }

      const passExpiryStr = this.formatDateValue(row.passport_expiry);
      if (row.passport_expiry && (!passExpiryStr || !/^\d{4}-\d{2}-\d{2}$/.test(passExpiryStr))) {
        addError('passport_expiry', 'Passport expiry must be in YYYY-MM-DD format', row.passport_expiry);
      }

      // Mandatory: branch
      const branchKey = (row.branch || row.branch_name || '').toLowerCase();
      const branchObj = branchMap.get(branchKey);
      if (!branchObj) {
        addError('branch', `Branch '${row.branch || row.branch_name}' does not exist in this company`, row.branch || row.branch_name);
      }

      // Mandatory: department
      const deptKey = (row.department || row.department_name || '').toLowerCase();
      const deptObj = deptMap.get(deptKey);
      if (!deptObj) {
        addError('department', `Department '${row.department || row.department_name}' does not exist in this company`, row.department || row.department_name);
      }

      // Visa sponsor company (optional, defaults to company's first visa)
      const visaKey = (row.visa_sponsor_company || row.visa_name || '').toLowerCase();
      const visaObj = (visaKey ? visaMap.get(visaKey) : null) || defaultVisa;
      if (!visaObj) {
        addError('visa_sponsor_company', `No valid visa sponsor found for company`, row.visa_sponsor_company);
      }

      // Shift (optional, defaults to first company shift)
      const shiftKey = (row.shift_name || row.shift || '').toLowerCase();
      const shiftObj = (shiftKey ? shiftMap.get(shiftKey) : null) || defaultShift;

      // Mandatory: basic_salary (positive number)
      const basic = parseFloat(row.basic_salary);
      if (isNaN(basic) || basic <= 0) {
        addError('basic_salary', 'Basic salary is mandatory and must be a positive number', row.basic_salary);
      }

      const housing = parseFloat(row.housing_allowance || 0);
      const transport = parseFloat(row.transport_allowance || 0);
      const other = parseFloat(row.other_allowances || 0);

      if (isNaN(housing) || housing < 0) {
        addError('housing_allowance', 'Housing allowance must be a non-negative number', row.housing_allowance);
      }
      if (isNaN(transport) || transport < 0) {
        addError('transport_allowance', 'Transport allowance must be a non-negative number', row.transport_allowance);
      }
      if (isNaN(other) || other < 0) {
        addError('other_allowances', 'Other allowances must be a non-negative number', row.other_allowances);
      }

      // Optional: bank_name, iban
      const cleanIban = (row.iban || '').replace(/\s+/g, '').toUpperCase();
      if (cleanIban) {
        if (!validateUaeIban(cleanIban)) {
          addError('iban', `Invalid UAE IBAN (failed ISO 7064 Mod-97 check)`, row.iban);
        } else if (fileIbans.has(cleanIban)) {
          addError('iban', `Duplicate IBAN '${cleanIban}' within file`, cleanIban);
        } else if (existingIbans.has(cleanIban)) {
          addError('iban', `IBAN '${cleanIban}' already exists in company`, cleanIban);
        } else {
          fileIbans.add(cleanIban);
        }

        if (!row.bank_name || !row.bank_name.trim()) {
          addError('bank_name', 'Bank name is required when IBAN is provided', row.bank_name);
        }
      }

      // Residency type based on nationality
      const isUae = nationality === 'AE' || nationality === 'ARE';
      const residencyType = row.residency_type || (isUae ? 'UAENational' : 'Expat');

      if (rowValid) {
        validRows.push({
          rowNumber: rowNum,
          employee_code: empCode,
          name: fullName,
          arabic_name: (row.arabic_name || '').trim(),
          work_email: email,
          nationality,
          residency_type: residencyType,
          gender,
          joining_date: new Date(joiningDateStr),
          birth_date: dobStr ? new Date(dobStr) : null,
          contract_type: (row.contract_type || 'Limited').trim(),
          employment_type: (row.employment_type || 'Full-time').trim(),
          visa: visaObj,
          branch: branchObj,
          department: deptObj,
          shift: shiftObj,
          job_title: (row.job_title || 'Specialist').trim(),
          salaryStructure: defaultStructure,
          attendancePolicy: defaultAttendancePolicy,
          basic,
          housing,
          transport,
          other,
          gross: basic + housing + transport + other,
          emirates_id: cleanEid,
          emirates_id_expiry: eidExpiryStr ? new Date(eidExpiryStr) : null,
          passport_number: (row.passport_number || '').trim(),
          passport_expiry: passExpiryStr ? new Date(passExpiryStr) : null,
          bank_name: (row.bank_name || '').trim(),
          iban: cleanIban,
          routing_code: (row.routing_code || (cleanIban ? cleanIban.slice(4, 7) : '') || 'ENBD001').trim(),
          mobile: (row.phone || row.mobile || '').trim(),
          create_login: (row.create_login || 'YES').trim().toUpperCase() !== 'NO',
        });
      }
    }

    return {
      totalRows: rawRows.length,
      validRowsCount: validRows.length,
      invalidRowsCount: errors.length > 0 ? rawRows.length - validRows.length : 0,
      errors,
      validRows,
    };
  }

  /**
   * Main Import Runner: Dry-Run or Full Transaction Execution
   */
  async processImport({ buffer, filename = '', companyId, dryRun = true, user = {} } = {}) {
    if (!companyId) throw new Error('Company ID context is required');

    const rawRows = await this.parseBuffer(buffer, filename);
    if (!rawRows || rawRows.length === 0) {
      return {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        errors: [{ row: 0, field: 'file', message: 'The uploaded file contains no data rows.' }],
      };
    }

    const validation = await this.validateRows(rawRows, companyId);

    // If dry run requested OR if there are validation errors, return summary without modifying database
    if (dryRun || validation.errors.length > 0) {
      return {
        dryRun: true,
        totalRows: validation.totalRows,
        validRows: validation.validRowsCount,
        invalidRows: validation.totalRows - validation.validRowsCount,
        errors: validation.errors,
      };
    }

    // DRY RUN = FALSE: Execute all-or-nothing in a single atomic transaction
    const [employeeRole, defaultAttendancePolicy, defaultStructure, defaultShift] = await Promise.all([
      this.prisma.$base().roles.findUnique({ where: { code: 'EMPLOYEE' } }),
      this.prisma.$base().attendance_policies.findFirst({ where: { company_id: companyId } }),
      this.prisma.$base().salary_structures.findFirst({ where: { company_id: companyId } }),
      this.prisma.$base().shifts.findFirst({ where: { company_id: companyId } }),
    ]);
    if (!employeeRole) {
      throw new Error('System role "EMPLOYEE" not found. Please run "npm run seed:system".');
    }

    const createdIds = [];
    const credentials = [];

    await this.prisma.$base().$transaction(async (tx) => {
      const existingCount = await tx.employees.count({ where: { company_id: companyId } });
      let seq = existingCount + 1;

      for (const item of validation.validRows) {
        // Resolve or create Job record in department
        let job = await tx.jobs.findFirst({
          where: { company_id: companyId, department_id: item.department.id, title: item.job_title },
        });
        if (!job) {
          job = await tx.jobs.create({
            data: {
              company_id: companyId,
              department_id: item.department.id,
              title: item.job_title,
              title_ar: item.job_title,
            },
          });
        }

        const empCode = item.employee_code || `EMP-${String(seq++).padStart(3, '0')}`;

        // 1. Create Employee Record
        const emp = await tx.employees.create({
          data: {
            company_id: companyId,
            employee_code: empCode,
            name: item.name,
            arabic_name: item.arabic_name || null,
            work_email: item.work_email,
            nationality: item.nationality,
            residency_type: item.residency_type,
            gender: item.gender,
            joining_date: item.joining_date,
            birth_date: item.birth_date,
            company_visa_id: item.visa.id,
            branch_id: item.branch.id,
            mobile: item.mobile || null,
            status: 'Active',
          },
        });
        createdIds.push(emp.id);

        // 2. Create Contract Version 1 (Approved)
        await tx.contracts.create({
          data: {
            company_id: companyId,
            employee_id: emp.id,
            version_no: 1,
            effective_date: item.joining_date,
            contract_type: item.contract_type,
            start_date: item.joining_date,
            job_id: job.id,
            department_id: item.department.id,
            shift_id: item.shift?.id || defaultShift?.id,
            attendance_policy_id: item.attendancePolicy?.id || defaultAttendancePolicy?.id,
            structure_id: item.salaryStructure?.id || defaultStructure?.id,
            basic: item.basic,
            housing: item.housing,
            transport: item.transport,
            other_allowances: item.other,
            gross: item.gross,
            status: 'Approved',
          },
        });

        // 3. Create Bank Account if provided
        if (item.iban) {
          await tx.bank_accounts.create({
            data: {
              company_id: companyId,
              employee_id: emp.id,
              bank_name: item.bank_name,
              iban: item.iban,
              routing_code: item.routing_code,
              salary_split_pct: 100.0,
              is_primary: true,
              is_active: true,
            },
          });
        }

        // 4. Create Employee Documents (Emirates ID / Passport)
        if (item.emirates_id) {
          await tx.employee_documents.create({
            data: {
              company_id: companyId,
              employee_id: emp.id,
              doc_type: 'EMIRATES_ID',
              doc_number: item.emirates_id,
              expiry_date: item.emirates_id_expiry,
              file_url: '/storage/documents/import_placeholder.pdf',
              status: item.emirates_id_expiry && item.emirates_id_expiry < new Date() ? 'Expired' : 'Valid',
              verification_status: 'Verified',
            },
          });
        }

        if (item.passport_number) {
          await tx.employee_documents.create({
            data: {
              company_id: companyId,
              employee_id: emp.id,
              doc_type: 'PASSPORT',
              doc_number: item.passport_number,
              expiry_date: item.passport_expiry,
              file_url: '/storage/documents/import_placeholder.pdf',
              status: item.passport_expiry && item.passport_expiry < new Date() ? 'Expired' : 'Valid',
              verification_status: 'Verified',
            },
          });
        }

        // 5. Create Employee User Login if requested
        if (item.create_login) {
          const tempPassword = 'Tmp!' + crypto.randomBytes(4).toString('hex') + 'A9!';
          assertPasswordCompliant(tempPassword, { email: item.work_email });
          const passwordHash = await authService.hashPassword(tempPassword);

          const empUser = await tx.users.create({
            data: {
              company_id: companyId,
              email: item.work_email,
              password_hash: passwordHash,
              status: 'Active',
              must_change_password: true,
              employee_id: emp.id,
            },
          });

          await tx.user_roles.create({
            data: {
              company_id: companyId,
              user_id: empUser.id,
              role_id: employeeRole.id,
              scope_type: 'Company',
            },
          });

          credentials.push({
            employee_code: empCode,
            name: item.name,
            email: item.work_email,
            tempPassword,
          });
        }
      }

      // 6. Emit audit log EMPLOYEE_BULK_IMPORT
      await tx.audit_logs.create({
        data: {
          company_id: companyId,
          user_id: user?.id && /^[0-9a-f-]{36}$/i.test(user.id) ? user.id : null,
          action: 'EMPLOYEE_BULK_IMPORT',
          table_name: 'employees',
          record_id: createdIds[0] || 'bulk',
          new_values: {
            importedCount: createdIds.length,
            createdEmployeeIds: createdIds,
            filename,
          },
        },
      });
    });

    return {
      dryRun: false,
      success: true,
      importedCount: createdIds.length,
      createdEmployeeIds: createdIds,
      credentials,
    };
  }
}

export default new EmployeeImportService();
