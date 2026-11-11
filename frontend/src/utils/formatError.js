/**
 * Error Message Mapping & Sanitization Utility (Spec Section A6)
 * Maps backend error codes to user-friendly translated messages.
 * Strips raw internal stack traces, Prisma codes, and database errors.
 */

export const ERROR_CODE_TRANSLATIONS = {
  // Authentication & Session
  INVALID_CREDENTIALS: {
    en: 'Invalid email address or password. Please verify and try again.',
    ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التحقق والمحاولة مجدداً.',
  },
  ACCOUNT_LOCKED: {
    en: 'Account is temporarily locked due to multiple failed login attempts. Please try again later.',
    ar: 'تم قفل الحساب مؤقتاً بسبب عدة محاولات دخول فاشلة. يرجى المحاولة لاحقاً.',
  },
  ACCOUNT_DISABLED: {
    en: 'Your user account has been disabled. Please contact your company administrator.',
    ar: 'تم تعطيل حساب المستخدم الخاص بك. يرجى التواصل مع مسؤول الشركة.',
  },
  TOKEN_EXPIRED: {
    en: 'Your session has expired. Please log in again to continue.',
    ar: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً للمتابعة.',
  },
  MUST_CHANGE_PASSWORD: {
    en: 'You must set a new secure password before continuing.',
    ar: 'يجب تعيين كلمة مرور جديدة آمنة قبل المتابعة.',
  },
  UNAUTHORIZED: {
    en: 'Authentication required. Please log in to continue.',
    ar: 'تسجيل الدخول مطلوب للمتابعة.',
  },
  FORBIDDEN: {
    en: 'Access denied: You do not have permission to perform this action.',
    ar: 'تم رفض الوصول: ليس لديك الصلاحية لتنفيذ هذا الإجراء.',
  },

  // Segregation of Duties & Approvals
  SELF_APPROVAL_FORBIDDEN: {
    en: 'Dual-control policy: You cannot approve your own request.',
    ar: 'سياسة الرقابة الثنائية: لا يمكنك اعتماد طلبك الخاص.',
  },
  SELF_VERIFICATION_FORBIDDEN: {
    en: 'Dual-control policy: You cannot verify your own uploaded document or record.',
    ar: 'سياسة الرقابة الثنائية: لا يمكنك التحقق من مستندك أو سجلك المرفوع.',
  },
  SEGREGATION_OF_DUTIES: {
    en: 'Segregation of duties violation: The same user cannot perform sequential control stages.',
    ar: 'مخالفة فصل المهام: لا يمكن للمستخدم نفسه تنفيذ مراحل الرقابة المتتالية.',
  },

  // Visa & Branch Invariants
  BRANCH_VISA_MISMATCH: {
    en: 'Statutory mismatch: The selected branch does not belong to the selected visa entity.',
    ar: 'تعارض قانوني: الفرع المحدد لا ينتمي إلى كيان التأشيرة المحدد.',
  },
  BRANCH_HAS_EMPLOYEES: {
    en: 'Cannot change visa entity for a branch with active assigned employees.',
    ar: 'لا يمكن تغيير كيان التأشيرة لفرع مرتبط بموظفين نشطين.',
  },
  VISA_TRANSFER_NOT_SUPPORTED: {
    en: 'Cross-visa transfer is blocked for employees with historical payroll runs.',
    ar: 'نقل التأشيرة بين الكيانات محظور للموظفين الذين لديهم سجل رواتب تاريخي.',
  },
  MOL_ID_DUPLICATE: {
    en: 'The MOHRE Establishment ID is already registered for another visa entity.',
    ar: 'رقم منشأة وزارة الموارد البشرية والتوطين مسجل بالفعل لكيان تأشيرة آخر.',
  },

  // Attendance & Biometrics
  DUPLICATE_IMPORT_FILE: {
    en: 'This punch log file has already been imported (matching SHA-256 hash). 0 duplicate rows added.',
    ar: 'تم استيراد ملف سجل البصمات هذا مسبقاً (مطابقة البصمة الرقمية). تمت إضافة 0 سجلات مكررة.',
  },
  MISSING_PUNCH_REASON_REQUIRED: {
    en: 'A mandatory justification reason (min 5 characters) is required for compliance audit logs.',
    ar: 'سبب التعديل إلزامي للامتثال وسجل التدقيق (5 أحرف على الأقل).',
  },

  // Payroll & WPS
  PAY_RUN_EXISTS: {
    en: 'A regular pay run already exists for this visa entity and period.',
    ar: 'توجد مسيرة رواتب منتظمة بالفعل لكيان التأشيرة والفترة المحددة.',
  },
  PAY_RUN_NOT_LOCKED: {
    en: 'Pay run must be approved and locked by the General Manager before WPS SIF export.',
    ar: 'يجب اعتماد مسيرة الرواتب وقفلها من قبل المدير العام قبل تصدير ملف حماية الأجور (SIF).',
  },
  PERIOD_LOCKED: {
    en: 'This period is locked or finalized. Changes cannot be applied to locked periods.',
    ar: 'هذه الفترة مقفلة أو نهائية. لا يمكن تطبيق التعديلات على الفترات المقفلة.',
  },
  BANK_ACCOUNT_MISSING: {
    en: 'Active employee bank account and verified UAE IBAN are required before this action.',
    ar: 'الحساب المصرفي ورقم الآيبان الإماراتي المتحقق منه إلزاميان قبل هذا الإجراء.',
  },
  INVALID_IBAN: {
    en: 'Invalid UAE IBAN format or failed ISO 7064 mod-97 verification checksum.',
    ar: 'صيغة رقم الآيبان الإماراتي غير صالحة أو فشل التحقق الرياضي (ISO 7064).',
  },
  FORBIDDEN_SALARY_ACCESS: {
    en: 'Access denied: Salary, payroll, and banking details are strictly restricted to authorized roles.',
    ar: 'تم رفض الوصول: تفاصيل الرواتب والحسابات المصرفية مقيدة حصراً للأدوار المخولة.',
  },

  // Leave & Accruals
  INSUFFICIENT_LEAVE_BALANCE: {
    en: 'Insufficient leave balance for the requested duration.',
    ar: 'رصيد الإجازات غير كافٍ للمدة المطلوبة.',
  },
  LEAVE_OVERLAP: {
    en: 'Leave request dates overlap with an existing approved or pending leave application.',
    ar: 'تواريخ طلب الإجازة تتداخل مع طلب إجازة معتمد أو قيد المراجعة.',
  },
  ATTACHMENT_REQUIRED: {
    en: 'A medical certificate or official attachment is mandatory for this leave type.',
    ar: 'الشهادة الطبية أو المرفق الرسمي إلزامي لهذا النوع من الإجازات.',
  },

  // Offboarding & Settlements
  OPEN_CLEARANCE_ITEMS: {
    en: 'Final settlement cannot be validated while departmental clearance items remain open.',
    ar: 'لا يمكن اعتماد تصفية المستحقات وما زالت هناك بنود براءة ذمة مفتوحة.',
  },
  SETTLEMENT_ALREADY_PAID: {
    en: 'Final settlement is already paid and finalized against modifications.',
    ar: 'تم صرف مستحقات نهاية الخدمة بالفعل والملف مقفل ضد أي تعديل.',
  },
};

/**
 * Format any error into a safe, localized message.
 * Never leaks raw DB errors or internal Prisma statements to users.
 */
export function formatErrorMessage(err, language = 'en') {
  if (!err) return '';
  const isAr = language === 'ar';

  // 1. If error contains a recognized code
  const code = err.code || err.errorCode || (typeof err.message === 'string' && err.message.match(/^[A-Z0-9_]{4,40}$/)?.[0]);
  if (code && ERROR_CODE_TRANSLATIONS[code]) {
    return isAr ? ERROR_CODE_TRANSLATIONS[code].ar : ERROR_CODE_TRANSLATIONS[code].en;
  }

  // 2. Extract message text
  let rawMsg = typeof err === 'string' ? err : err.message || err.error || 'An unexpected error occurred.';

  // 3. Catch known raw text occurrences and map them
  for (const [codeKey, trans] of Object.entries(ERROR_CODE_TRANSLATIONS)) {
    if (rawMsg.includes(codeKey)) {
      return isAr ? trans.ar : trans.en;
    }
  }

  // 4. Sanitize Prisma / DB error leaks
  if (/prisma|database|relation|foreign key|constraint|column|syntax error/i.test(rawMsg)) {
    return isAr
      ? 'حدث خطأ في معالجة البيانات بالنظام. يرجى المحاولة لاحقاً.'
      : 'A system data validation error occurred. Please verify your inputs and try again.';
  }

  return rawMsg;
}
