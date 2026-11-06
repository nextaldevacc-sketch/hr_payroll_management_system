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

  contract_type: {
    Limited: { en: 'Limited (UAE Law)', ar: 'محدد المدة (قانون العمل)' },
    Unlimited: { en: 'Unlimited', ar: 'غير محدد المدة' },
    Permanent: { en: 'Permanent', ar: 'دائم' },
    Temporary: { en: 'Temporary', ar: 'مؤقت' },
    PartTime: { en: 'Part-Time', ar: 'دوام جزئي' },
  },

  scope_type: {
    Company: { en: 'Company-Wide', ar: 'الشركة بالكامل' },
    CompanyVisa: { en: 'Company Visa', ar: 'تأشيرة المنشأة' },
    Branch: { en: 'Branch', ar: 'الفرع' },
    Department: { en: 'Department', ar: 'القسم' },
    Self: { en: 'Self (Employee Only)', ar: 'ذاتي (الموظف فقط)' },
  },

  audit_action: {
    CREATE: { en: 'Create Record', ar: 'إنشاء سجل' },
    Create: { en: 'Create Record', ar: 'إنشاء سجل' },
    UPDATE: { en: 'Update Record', ar: 'تحديث سجل' },
    Update: { en: 'Update Record', ar: 'تحديث سجل' },
    DELETE: { en: 'Delete Record', ar: 'حذف سجل' },
    Delete: { en: 'Delete Record', ar: 'حذف سجل' },
    LOGIN: { en: 'User Login', ar: 'تسجيل دخول' },
    USER_LOGIN: { en: 'User Login', ar: 'تسجيل دخول مستخدم' },
    LOGOUT: { en: 'User Logout', ar: 'تسجيل خروج' },
    USER_LOGOUT: { en: 'User Logout', ar: 'تسجيل خروج مستخدم' },
    DOCUMENT_VIEW: { en: 'Document View', ar: 'عرض مستند' },
    DOCUMENT_UPLOAD: { en: 'Document Upload', ar: 'رفع مستند' },
    DOCUMENT_DELETE: { en: 'Document Delete', ar: 'حذف مستند' },
    DOCUMENT_RENEW: { en: 'Document Renew', ar: 'تجديد مستند' },
    RenewDocument: { en: 'Renew Document', ar: 'تجديد وثيقة' },
    VerifyDocument: { en: 'Verify Document', ar: 'تدقيق وثيقة' },
    UploadDocument: { en: 'Upload Document', ar: 'رفع وثيقة' },
    DownloadDocument: { en: 'Download Document', ar: 'تنزيل وثيقة' },
    PAYROLL_CALCULATE: { en: 'Calculate Payroll', ar: 'حساب مسير الرواتب' },
    CALCULATE_PAY_RUN: { en: 'Calculate Pay Run', ar: 'احتساب مسير الرواتب' },
    PAYROLL_VALIDATE: { en: 'Validate Payroll', ar: 'تدقيق مسير الرواتب' },
    VALIDATE_PAY_RUN: { en: 'Validate Pay Run', ar: 'تدقيق مسير الرواتب' },
    PAYROLL_LOCK: { en: 'Lock Payroll', ar: 'إقفال مسير الرواتب' },
    LOCK_PAY_RUN: { en: 'Lock Pay Run', ar: 'إقفال مسير الرواتب' },
    PAYROLL_APPROVE: { en: 'Approve Payroll', ar: 'اعتماد مسير الرواتب' },
    PAYROLL_PAY: { en: 'Disburse Payroll', ar: 'صرف الرواتب' },
    PAY_PAY_RUN: { en: 'Disburse Pay Run', ar: 'صرف مسير الرواتب' },
    CREATE_PAY_RUN: { en: 'Create Pay Run', ar: 'إنشاء مسير رواتب' },
    UPDATE_VARIANCE_REASON: { en: 'Update Variance Reason', ar: 'تحديث سبب الفروقات' },
    UPDATE_VARIANCE_REAS: { en: 'Update Variance Reason', ar: 'تحديث سبب الفروقات' },
    PAYSLIP_PDF_DOWNLOAD: { en: 'Download Payslip PDF', ar: 'تنزيل قسيمة الراتب PDF' },
    PAYROLL_EXPORT_SIF: { en: 'Export SIF File', ar: 'تصدير ملف حماية الأجور (SIF)' },
    PAYROLL_EXPORT_JOURNAL: { en: 'Export Journal', ar: 'تصدير قيود اليومية' },
    EMPLOYEE_CREATE: { en: 'Create Employee', ar: 'إنشاء ملف موظف' },
    EMPLOYEE_UPDATE: { en: 'Update Employee', ar: 'تعديل ملف موظف' },
    EMPLOYEE_VERIFY: { en: 'Verify Employee', ar: 'تدقيق ملف موظف' },
    EMPLOYEE_ACTIVATE: { en: 'Activate Employee', ar: 'تفعيل ملف موظف' },
    EMPLOYEE_STATUS_CHANGE: { en: 'Change Employee Status', ar: 'تغيير حالة الموظف' },
    EMPLOYEE_TERMINATE: { en: 'Terminate Employee', ar: 'إنهاء خدمات موظف' },
    StatusChange: { en: 'Status Change', ar: 'تغيير الحالة' },
    Verify: { en: 'Verify Employee', ar: 'تدقيق بيانات موظف' },
    SendBack: { en: 'Send Back for Review', ar: 'إعادة للمراجعة' },
    Activate: { en: 'Activate Employee', ar: 'تفعيل ملف موظف' },
    Approve: { en: 'Approve', ar: 'اعتماد' },
    LEAVE_REQUEST: { en: 'Submit Leave Request', ar: 'تقديم طلب إجازة' },
    LEAVE_APPROVE: { en: 'Approve Leave', ar: 'الموافقة على الإجازة' },
    LEAVE_REJECT: { en: 'Reject Leave', ar: 'رفض الإجازة' },
    OVERTIME_REQUEST: { en: 'Submit Overtime Request', ar: 'تقديم طلب عمل إضافي' },
    OVERTIME_APPROVE: { en: 'Approve Overtime', ar: 'اعتماد عمل إضافي' },
    BRANCH_CREATE: { en: 'Create Branch', ar: 'إنشاء فرع' },
    BRANCH_UPDATE: { en: 'Update Branch', ar: 'تعديل فرع' },
    BRANCH_DELETE: { en: 'Delete Branch', ar: 'حذف فرع' },
    BRANCH_CHANGE: { en: 'Branch Change', ar: 'تغيير الفرع' },
    EMPLOYEE_BRANCH_CHANGE: { en: 'Branch Change Request', ar: 'طلب تغيير الفرع' },
    VISA_CREATE: { en: 'Create Visa', ar: 'إنشاء تأشيرة منشأة' },
    VISA_UPDATE: { en: 'Update Visa', ar: 'تعديل تأشيرة منشأة' },
    VISA_DELETE: { en: 'Delete Visa', ar: 'حذف تأشيرة منشأة' },
    COMPANY_UPDATE: { en: 'Update Company', ar: 'تعديل بيانات الشركة' },
    CREATE_COMPANY: { en: 'Create Company', ar: 'إنشاء شركة' },
    CONTRACT_CREATE: { en: 'Create Contract', ar: 'إنشاء عقد عمل' },
    CreateContract: { en: 'Create Contract', ar: 'إنشاء عقد عمل' },
    ApproveContract: { en: 'Approve Contract', ar: 'اعتماد عقد عمل' },
    RejectContract: { en: 'Reject Contract', ar: 'رفض عقد عمل' },
    SETTINGS_UPDATE: { en: 'Update Settings', ar: 'تعديل الإعدادات' },
    ADJUSTMENT_CREATE: { en: 'Create Salary Adjustment', ar: 'إنشاء تسوية / سلفة راتب' },
    ADJUSTMENT_APPROVE: { en: 'Approve Salary Adjustment', ar: 'اعتماد تسوية / سلفة راتب' },
    ADJUSTMENT_REJECT: { en: 'Reject Salary Adjustment', ar: 'رفض تسوية / سلفة راتب' },
    CREATE_SEPARATION: { en: 'Create Separation', ar: 'إنشاء طلب إنهاء خدمة' },
    UPDATE_CLEARANCE_ITEM: { en: 'Update Clearance Item', ar: 'تحديث بند براءة الذمة' },
    UPDATE_SEP_TASK: { en: 'Update Separation Task', ar: 'تحديث مهمة إنهاء الخدمة' },
    DEACTIVATE_OFFBOARDED_EMPLOYEE: { en: 'Deactivate Offboarded Employee', ar: 'إلغاء تفعيل موظف منهية خدماته' },
    PREPARE_FINAL_SETTLEMENT: { en: 'Prepare Final Settlement', ar: 'إعداد التسوية النهائية' },
    VALIDATE_FINAL_SETTLEMENT: { en: 'Validate Final Settlement', ar: 'تدقيق التسوية النهائية' },
    APPROVE_FINAL_SETTLEMENT: { en: 'Approve Final Settlement', ar: 'اعتماد التسوية النهائية' },
    PAY_FINAL_SETTLEMENT: { en: 'Pay Final Settlement', ar: 'صرف التسوية النهائية' },
    INVITE_USER: { en: 'Invite User', ar: 'دعوة مستخدم' },
    UPDATE_ROLES: { en: 'Update User Roles', ar: 'تحديث أدوار المستخدم' },
    BULK_CREATE_LOGINS: { en: 'Bulk Create Logins', ar: 'إنشاء حسابات دخول مجمعة' },
    UNLOCK_USER: { en: 'Unlock User', ar: 'إلغاء قفل المستخدم' },
    SET_PASSWORD_INVITE: { en: 'Set Password from Invite', ar: 'تعيين كلمة المرور من الدعوة' },
    RESET_PASSWORD: { en: 'Reset Password', ar: 'إعادة تعيين كلمة المرور' },
    GRANT_SUPPORT_ACCESS: { en: 'Grant Support Access', ar: 'منح صلاحية الدعم الفني' },
    REVOKE_SUPPORT_ACCESS: { en: 'Revoke Support Access', ar: 'إلغاء صلاحية الدعم الفني' },
    SUBMIT: { en: 'Submit for Approval', ar: 'إرسال للاعتماد' },
    SUBMIT_APPROVAL: { en: 'Submit Approval Request', ar: 'إرسال طلب اعتماد' },
    REOPEN: { en: 'Reopen Attendance Day', ar: 'إعادة فتح يوم الحضور' },
    RUN_JOB: { en: 'Execute Scheduled Job', ar: 'تشغيل مهمة مجدولة' },
  },

  settlement_status: {
    Draft: { en: 'Draft', ar: 'مسودة' },
    Prepared: { en: 'Prepared', ar: 'مُعَد' },
    Approved: { en: 'Approved', ar: 'معتمد' },
    Paid: { en: 'Paid', ar: 'تم الصرف' },
    'Not Prepared': { en: 'Not Prepared', ar: 'غير مُعَد' },
  },

  separation_status: {
    Pending: { en: 'Pending', ar: 'قيد الانتظار' },
    Approved: { en: 'Approved', ar: 'معتمد' },
    Rejected: { en: 'Rejected', ar: 'مرفوض' },
    Completed: { en: 'Completed', ar: 'مكتمل' },
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
 * Shared Month-Year Formatter using Intl.DateTimeFormat
 * e.g., 'Aug 2026' -> 'أغسطس 2026' or 'August 2026'
 */
export function formatMonthYear(dateInput, lang = 'en') {
  if (!dateInput) return '---';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-AE', {
    month: 'long',
    year: 'numeric',
  }).format(d);
}

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
  const strVal = String(value).trim();

  // 1. Direct category lookup
  if (category && ENUMS[category]) {
    const item = ENUMS[category][strVal];
    if (item) {
      return isAr ? (item.ar || item.en) : item.en;
    }
    // Case-insensitive lookup in category
    const catEntry = Object.entries(ENUMS[category]).find(
      ([k]) => k.toLowerCase() === strVal.toLowerCase()
    );
    if (catEntry) {
      return isAr ? (catEntry[1].ar || catEntry[1].en) : catEntry[1].en;
    }
  }

  // 2. Global search across all categories if category is omitted or value not found
  for (const cat of Object.values(ENUMS)) {
    if (cat[strVal]) {
      return isAr ? (cat[strVal].ar || cat[strVal].en) : cat[strVal].en;
    }
    const match = Object.entries(cat).find(
      ([k]) => k.toLowerCase() === strVal.toLowerCase()
    );
    if (match) {
      return isAr ? (match[1].ar || match[1].en) : match[1].en;
    }
  }

  // 3. Fallback to raw value
  return strVal;
}

export function getVisaNameAr(name) {
  if (!name) return '';
  const str = String(name);
  if (str.includes('Visa 01') || str.includes('Mainland') || str.includes('MOHRE')) {
    return 'تأشيرة 01 (وزارة الموارد البشرية دبي)';
  }
  if (str.includes('Visa 02') || str.includes('DIFC')) {
    return 'تأشيرة 02 (مركز دبي المالي العالمي)';
  }
  return str;
}

export default getEnumLabel;

