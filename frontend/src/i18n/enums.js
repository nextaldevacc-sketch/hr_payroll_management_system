/**
 * Central Translation Catalog for Enumerations and Domain Labels (EN & AR)
 * Follow-up 4 Section E compliance
 */

export const ENUMS = {
  employee_status: {
    Active: { en: 'Active', ar: 'نشط' },
    'Pre-Joined': { en: 'Pre-Joined', ar: 'قبل الالتحاق' },
    'New Joined': { en: 'New Joined', ar: 'معين جديد' },
    Probation: { en: 'Probation', ar: 'تحت التجربة' },
    Notice: { en: 'Notice', ar: 'فترة الإنذار' },
    Separated: { en: 'Separated', ar: 'منتهية خدماته' },
    Suspended: { en: 'Suspended', ar: 'موقوف' },
    Archived: { en: 'Archived', ar: 'مؤرشف' },
    Terminated: { en: 'Terminated', ar: 'تم إنهاء الخدمة' },
    Resigned: { en: 'Resigned', ar: 'مستقيل' },
  },

  user_status: {
    Active: { en: 'Active', ar: 'نشط' },
    Invited: { en: 'Invited', ar: 'مدعو' },
    Disabled: { en: 'Disabled', ar: 'معطل' },
    Suspended: { en: 'Suspended', ar: 'موقوف' },
  },

  document_status: {
    Valid: { en: 'Valid', ar: 'ساري' },
    Expired: { en: 'Expired', ar: 'منتهي' },
    'Expiring Soon': { en: 'Expiring Soon', ar: 'ينتهي قريباً' },
    'Missing Data': { en: 'Missing Data', ar: 'بيانات ناقصة' },
    Pending: { en: 'Pending', ar: 'قيد المراجعة' },
    Rejected: { en: 'Rejected', ar: 'مرفوض' },
    Approved: { en: 'Approved', ar: 'معتمد' },
    Verified: { en: 'Verified', ar: 'معتمد' },
  },

  document_type: {
    EMIRATES_ID: { en: 'Emirates ID', ar: 'بطاقة الهوية الإماراتية' },
    LABOUR_CARD: { en: 'Labour Card (MOHRE)', ar: 'بطاقة العمل (MOHRE)' },
    PASSPORT: { en: 'Passport', ar: 'جواز السفر' },
    VISA: { en: 'Residence Visa', ar: 'تأشيرة الإقامة' },
    OFFER_LETTER: { en: 'Offer Letter', ar: 'خطاب العرض' },
    EMPLOYMENT_CONTRACT: { en: 'Employment Contract', ar: 'عقد العمل' },
    MOHRE_CONTRACT: { en: 'MOHRE Contract', ar: 'عقد العمل الموثق' },
    INSURANCE_CARD: { en: 'Insurance Card', ar: 'بطاقة التأمين الصحي' },
    ACADEMIC_CERTIFICATE: { en: 'Academic Certificate', ar: 'الشهادة العلمية' },
    DRIVING_LICENSE: { en: 'Driving License', ar: 'رخصة القيادة' },
    SALARY_CERTIFICATE: { en: 'Salary Certificate', ar: 'شهادة الراتب' },
    OTHER: { en: 'Other Document', ar: 'وثيقة أخرى' },
  },

  separation_reason: {
    Resignation: { en: 'Resignation', ar: 'استقالة' },
    Termination: { en: 'Termination', ar: 'إنهاء خدمة' },
    Retirement: { en: 'Retirement', ar: 'تقاعد' },
    'Probation Failed': { en: 'Probation Failed', ar: 'عدم اجتياز فترة التجربة' },
    'End of Contract': { en: 'End of Contract', ar: 'انتهاء العقد' },
    Redundancy: { en: 'Redundancy', ar: 'فائض عن الحاجة' },
    'Mutual Consent': { en: 'Mutual Consent', ar: 'اتفاق متبادل' },
    Death: { en: 'Death', ar: 'وفاة' },
  },

  clearance_status: {
    'All Cleared': { en: 'All Cleared', ar: 'تمت براءة الذمة بالكامل' },
    Pending: { en: 'Pending', ar: 'معلق' },
    'In Progress': { en: 'In Progress', ar: 'قيد الإجراء' },
    Completed: { en: 'Completed', ar: 'مكتمل' },
    Rejected: { en: 'Rejected', ar: 'مرفوض' },
  },

  pay_run_status: {
    Draft: { en: 'Draft', ar: 'مسودة' },
    Calculated: { en: 'Calculated', ar: 'تم الحساب' },
    Validated: { en: 'Validated', ar: 'مدقق' },
    Approved: { en: 'Approved', ar: 'معتمد' },
    Locked: { en: 'Locked', ar: 'مقفل' },
    Paid: { en: 'Paid', ar: 'تم الصرف' },
  },

  pay_run_type: {
    Regular: { en: 'Regular', ar: 'دوري اعتيادي' },
    Correction: { en: 'Correction', ar: 'تصحيحي' },
    'Off-Cycle': { en: 'Off-Cycle', ar: 'خارج الدورة' },
    'Final Settlement': { en: 'Final Settlement', ar: 'تسوية نهائية' },
  },

  leave_type: {
    'Annual Leave': { en: 'Annual Leave', ar: 'إجازة سنوية' },
    'Sick Leave (Full Pay)': { en: 'Sick Leave (Full Pay)', ar: 'إجازة مرضية (مدفوعة بالكامل)' },
    'Sick Leave (Half Pay)': { en: 'Sick Leave (Half Pay)', ar: 'إجازة مرضية (نصف أجر)' },
    'Sick Leave (Unpaid)': { en: 'Sick Leave (Unpaid)', ar: 'إجازة مرضية (بدون أجر)' },
    'Maternity Leave': { en: 'Maternity Leave', ar: 'إجازة أمومة' },
    'Paternity Leave': { en: 'Paternity Leave', ar: 'إجازة أبوة' },
    'Bereavement Leave': { en: 'Bereavement Leave', ar: 'إجازة عزاء' },
    'Study / Exam Leave': { en: 'Study / Exam Leave', ar: 'إجازة دراسية وامتحانات' },
    'Unpaid Leave': { en: 'Unpaid Leave', ar: 'إجازة غير مدفوعة الأجر' },
    'Hajj Leave': { en: 'Hajj Leave', ar: 'إجازة الحج' },
    'National Service': { en: 'National Service', ar: 'الخدمة الوطنية' },
  },

  role_name: {
    COMPANY_ADMIN: { en: 'Company Administrator', ar: 'مسؤول الشركة' },
    HR_MANAGER: { en: 'HR Manager', ar: 'مدير الموارد البشرية' },
    HR_OFFICER: { en: 'HR Officer', ar: 'مسؤول الموارد البشرية' },
    PAYROLL_OFFICER: { en: 'Payroll Officer', ar: 'مسؤول الرواتب' },
    DEPT_MANAGER: { en: 'Department Manager', ar: 'مدير قسم' },
    GM: { en: 'General Manager', ar: 'المدير العام' },
    FINANCE: { en: 'Finance / Accounts', ar: 'المالية والحسابات' },
    EMPLOYEE: { en: 'Employee', ar: 'موظف' },
    'Company Administrator': { en: 'Company Administrator', ar: 'مسؤول الشركة' },
    'HR Manager': { en: 'HR Manager', ar: 'مدير الموارد البشرية' },
    'HR Officer': { en: 'HR Officer', ar: 'مسؤول الموارد البشرية' },
    'Payroll Officer': { en: 'Payroll Officer', ar: 'مسؤول الرواتب' },
    'Department Manager': { en: 'Department Manager', ar: 'مدير قسم' },
    'General Manager': { en: 'General Manager', ar: 'المدير العام' },
    'Finance / Accounts': { en: 'Finance / Accounts', ar: 'المالية والحسابات' },
    Employee: { en: 'Employee', ar: 'موظف' },
    'Line Manager': { en: 'Line Manager', ar: 'المدير المباشر' },
  },

  permission_level: {
    'Full Access': { en: 'Full Access', ar: 'صلاحية كاملة' },
    'View Only': { en: 'View Only', ar: 'عرض فقط' },
    'Read & Write': { en: 'Read & Write', ar: 'قراءة وكتابة' },
    'Accounts Only': { en: 'Accounts Only', ar: 'حسابات فقط' },
    'Rules Editable': { en: 'Rules Editable', ar: 'تعديل القواعد' },
    'Restricted to HR Manager': { en: 'Restricted to HR Manager', ar: 'مقتصر على مدير الموارد البشرية' },
    'HR & Admin': { en: 'HR & Admin', ar: 'الموارد البشرية والإدارة' },
  },

  scope_type: {
    Company: { en: 'Company-Wide', ar: 'الشركة بالكامل' },
    CompanyVisa: { en: 'Company Visa', ar: 'تأشيرة المنشأة' },
    Branch: { en: 'Branch', ar: 'الفرع' },
    Department: { en: 'Department', ar: 'القسم' },
  },

  audit_action: {
    DOCUMENT_VIEW: { en: 'Document View', ar: 'عرض مستند' },
    DOCUMENT_UPLOAD: { en: 'Document Upload', ar: 'رفع مستند' },
    DOCUMENT_DELETE: { en: 'Document Delete', ar: 'حذف مستند' },
    DOCUMENT_RENEW: { en: 'Document Renew', ar: 'تجديد مستند' },
    PAYROLL_CALCULATE: { en: 'Calculate Payroll', ar: 'حساب مسير الرواتب' },
    PAYROLL_VALIDATE: { en: 'Validate Payroll', ar: 'تدقيق مسير الرواتب' },
    PAYROLL_LOCK: { en: 'Lock Payroll', ar: 'إقفال مسير الرواتب' },
    PAYROLL_APPROVE: { en: 'Approve Payroll', ar: 'اعتماد مسير الرواتب' },
    PAYROLL_PAY: { en: 'Disburse Payroll', ar: 'صرف الرواتب' },
    PAYROLL_EXPORT_SIF: { en: 'Export SIF File', ar: 'تصدير ملف حماية الأجور (SIF)' },
    PAYROLL_EXPORT_JOURNAL: { en: 'Export Journal', ar: 'تصدير قيود اليومية' },
    EMPLOYEE_CREATE: { en: 'Create Employee', ar: 'إنشاء ملف موظف' },
    EMPLOYEE_UPDATE: { en: 'Update Employee', ar: 'تعديل ملف موظف' },
    EMPLOYEE_VERIFY: { en: 'Verify Employee', ar: 'تدقيق ملف موظف' },
    EMPLOYEE_ACTIVATE: { en: 'Activate Employee', ar: 'تفعيل ملف موظف' },
    EMPLOYEE_STATUS_CHANGE: { en: 'Change Employee Status', ar: 'تغيير حالة الموظف' },
    EMPLOYEE_TERMINATE: { en: 'Terminate Employee', ar: 'إنهاء خدمات موظف' },
    LEAVE_REQUEST: { en: 'Submit Leave Request', ar: 'تقديم طلب إجازة' },
    LEAVE_APPROVE: { en: 'Approve Leave', ar: 'الموافقة على الإجازة' },
    LEAVE_REJECT: { en: 'Reject Leave', ar: 'رفض الإجازة' },
    OVERTIME_REQUEST: { en: 'Submit Overtime Request', ar: 'تقديم طلب عمل إضافي' },
    OVERTIME_APPROVE: { en: 'Approve Overtime', ar: 'اعتماد عمل إضافي' },
    USER_LOGIN: { en: 'User Login', ar: 'تسجيل دخول مستخدم' },
    USER_LOGOUT: { en: 'User Logout', ar: 'تسجيل خروج مستخدم' },
    BRANCH_CREATE: { en: 'Create Branch', ar: 'إنشاء فرع' },
    BRANCH_UPDATE: { en: 'Update Branch', ar: 'تعديل فرع' },
    BRANCH_DELETE: { en: 'Delete Branch', ar: 'حذف فرع' },
    VISA_CREATE: { en: 'Create Visa', ar: 'إنشاء تأشيرة منشأة' },
    VISA_UPDATE: { en: 'Update Visa', ar: 'تعديل تأشيرة منشأة' },
    VISA_DELETE: { en: 'Delete Visa', ar: 'حذف تأشيرة منشأة' },
    COMPANY_UPDATE: { en: 'Update Company', ar: 'تعديل بيانات الشركة' },
    CONTRACT_CREATE: { en: 'Create Contract', ar: 'إنشاء عقد عمل' },
    SETTINGS_UPDATE: { en: 'Update Settings', ar: 'تعديل الإعدادات' },
  },

  report_export: {
    'CSV Journal (Balanced)': { en: 'CSV Journal (Balanced)', ar: 'دفتر اليومية للقيود المتوازنة (CSV)' },
    'Payroll Register': { en: 'Payroll Register', ar: 'سجل الرواتب التفصيلي' },
    'WPS SIF File': { en: 'WPS SIF File', ar: 'ملف نظام حماية الأجور (SIF)' },
    'Variance Report': { en: 'Variance Report', ar: 'تقرير الفروقات والتسويات' },
    'EOSB Summary': { en: 'EOSB Summary', ar: 'ملخص مكافأة نهاية الخدمة' },
    Visa: { en: 'Visa', ar: 'التأشيرة' },
    'Company Visa': { en: 'Company Visa', ar: 'تأشيرة المنشأة' },
    Branch: { en: 'Branch', ar: 'الفرع' },
  },

  adjustment_type: {
    Loan: { en: 'Loan', ar: 'قرض' },
    Advance: { en: 'Salary Advance', ar: 'سلفة راتب' },
    Bonus: { en: 'Bonus', ar: 'مكافأة' },
    Allowance: { en: 'Allowance', ar: 'بدل إضافي' },
    Deduction: { en: 'Deduction', ar: 'خصم' },
    Expense: { en: 'Expense Claim', ar: 'مطالبة مصاريف' },
  },

  visa_names: {
    'Visa 01 (MOHRE Dubai)': { en: 'Visa 01 (MOHRE Dubai)', ar: 'تأشيرة 01 (تسهيل دبي)' },
    'Visa 02 (DIFC Freezone)': { en: 'Visa 02 (DIFC Freezone)', ar: 'تأشيرة 02 (مركز دبي المالي العالمي)' },
  },
};

/**
 * Translate an enumeration or status value
 * @param {string|null} category - e.g. 'employee_status', 'document_type', or null for auto-search
 * @param {string} value - The raw code or English label
 * @param {string} lang - 'en' | 'ar'
 * @returns {string} Translated label or fallback
 */
export function getEnumLabel(category, value, lang = 'en') {
  if (!value) return '';
  const isAr = lang === 'ar';

  // 1. Direct category lookup
  if (category && ENUMS[category]) {
    const item = ENUMS[category][value];
    if (item) {
      return isAr ? (item.ar || item.en) : item.en;
    }
  }

  // 2. Global search across all categories if category is omitted or value not found
  for (const cat of Object.values(ENUMS)) {
    if (cat[value]) {
      return isAr ? (cat[value].ar || cat[value].en) : cat[value].en;
    }
  }

  // 3. Fallback to raw value
  return String(value);
}

export default getEnumLabel;

