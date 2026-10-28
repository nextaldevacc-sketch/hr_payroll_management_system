import { toDecimal, roundToCurrency } from '@nextal/shared';

/**
 * Single source of truth for Phase 0 UAE HR & Payroll Platform
 * Computed rigorously with money.js helpers and Decimal precision.
 */

// Core employee contract aggregates
const gross = toDecimal(336000.00);
const overtime = toDecimal(8420.50);
const absence = toDecimal(3180.00);
const loans = toDecimal(4500.00);
const latePenalties = toDecimal(450.00);
const otherDeductions = toDecimal(800.00);

// Gross + OT − Absence − Loans − Late − Other = Net
const netToWps = gross
  .plus(overtime)
  .minus(absence)
  .minus(loans)
  .minus(latePenalties)
  .minus(otherDeductions);

const previousMonthNet = toDecimal(321240.50);
const diffAmount = netToWps.minus(previousMonthNet);
const diffPercentNum = diffAmount.dividedBy(previousMonthNet).times(100).toNumber();
const diffPercent = `+${diffPercentNum.toFixed(1)}%`;

export const mockDashboardData = {
  livePayroll: {
    monthYear: 'October 2026',
    entityName: 'Gulf Tech Logistics LLC',
    visaBadge: 'Visa 01 · Oct 2026',
    cutoffDays: 4,
    employeesIncluded: 42,
    currentStep: 'Calculated',
    steps: ['Draft', 'Calculated', 'Validated', 'Locked', 'Paid'],
    nextStep: {
      owner: 'HR Manager',
      action: 'Validate run',
      message: '2 blocking errors must be cleared before lock',
      tab: 'validation'
    },
    figures: {
      gross: gross.toNumber(),
      overtime: overtime.toNumber(),
      absence: absence.toNumber(),
      loans: loans.toNumber(),
      latePenalties: latePenalties.toNumber(),
      otherDeductions: otherDeductions.toNumber(),
      netToWps: netToWps.toNumber(),
    },
    visas: [
      { id: 'visa-01', name: 'Visa 01 (MOHRE Dubai)', count: 28, net: 224150.00 },
      { id: 'visa-02', name: 'Visa 02 (DIFC Freezone)', count: 14, net: 111340.50 },
    ],
    sparkline: [
      { month: 'May', net: 304200.00 },
      { month: 'Jun', net: 309800.00 },
      { month: 'Jul', net: 314500.00 },
      { month: 'Aug', net: 316900.00 },
      { month: 'Sep', net: 321240.50 },
      { month: 'Oct', net: netToWps.toNumber(), isCurrent: true },
    ]
  },

  headcount: {
    total: 42,
    joiners: 3,
    leavers: 1,
    netChange: '+2 net this month',
    nationalityMix: {
      uaeNationals: 4,
      expats: 38,
      gpssaEligible: 4,
      uaePercent: 9.5,
      expatPercent: 90.5
    }
  },

  pendingApprovals: {
    total: 12,
    items: [
      { type: 'Leave Requests', count: 4, code: 'leave' },
      { type: 'Overtime Hours', count: 6, code: 'ot' },
      { type: 'Salary Adjustments', count: 1, code: 'adj' },
      { type: 'Final Settlements', count: 1, code: 'settlement' },
    ],
    oldestItems: [
      {
        id: 'appr-1',
        type: 'Annual Leave',
        employee: 'Tariq Mahmood',
        employeeAr: 'طارق محمود',
        avatar: 'TM',
        age: '3 days ago',
        isOwn: false
      },
      {
        id: 'appr-2',
        type: 'Overtime (4 hrs)',
        employee: 'Rajesh Kumar',
        employeeAr: 'راجيش كومار',
        avatar: 'RK',
        age: '2 days ago',
        isOwn: false
      }
    ]
  },

  wpsReadiness: {
    ready: 40,
    total: 42,
    percentage: 95.2,
    checks: [
      { key: 'iban', label: 'IBAN account present', missing: 1, status: 'warning' },
      { key: 'routing', label: 'Bank routing code present', missing: 1, status: 'warning' },
      { key: 'personId', label: 'Labour Card / Person ID present', missing: 0, status: 'success' },
    ]
  },

  expiringDocs: {
    total: 10,
    breakdown: [
      { label: 'Expired', count: 1, severity: 'danger', percent: 10, color: '#E5484D' },
      { label: '≤ 30 days', count: 2, severity: 'danger', percent: 20, color: '#F76B15' },
      { label: '≤ 60 days', count: 4, severity: 'warning', percent: 40, color: '#E6A60E' },
      { label: '≤ 90 days', count: 3, severity: 'info', percent: 30, color: '#4BB8FA' },
    ],
    items: [
      { employee: 'Zayed Al-Ameri', employeeAr: 'زايد العامري', doc: 'Emirates ID', daysLeft: -2, owner: 'HR Officer' },
      { employee: 'Rajesh Kumar', employeeAr: 'راجيش كومار', doc: 'MOHRE Labour Card', daysLeft: 14, owner: 'HR Manager' },
    ],
  },

  exceptions: [
    {
      id: 'ex-1',
      title: 'Missing Biometric Punches',
      subtitle: 'Single punch in / out recorded',
      count: 7,
      severity: 'warning',
      action: 'Open punch queue',
    },
    {
      id: 'ex-2',
      title: 'Unapproved Overtime Hours',
      subtitle: 'Biometric extra hours awaiting manager confirmation',
      count: 5,
      severity: 'warning',
      action: 'Review OT queue',
    },
    {
      id: 'ex-3',
      title: 'Validation Errors (WPS / IBAN)',
      subtitle: 'Missing IBAN or invalid routing code on contract',
      count: 2,
      severity: 'danger',
      action: 'Fix bank records',
    },
  ],

  attendanceToday: {
    total: 42,
    present: 36,
    late: 3,
    absent: 2,
    onLeave: 1,
    presentPercent: 85.7,
    latePercent: 7.1,
    absentPercent: 4.8,
    leavePercent: 2.4,
    miniTrend: [
      { day: 'Mon', dayAr: 'إثن', present: 35, late: 4, absent: 2, isToday: false },
      { day: 'Tue', dayAr: 'ثلا', present: 37, late: 2, absent: 2, isToday: false },
      { day: 'Wed', dayAr: 'أرب', present: 36, late: 3, absent: 2, isToday: false },
      { day: 'Thu', dayAr: 'خمي', present: 38, late: 1, absent: 2, isToday: false },
      { day: 'Fri', dayAr: 'جمع', present: 36, late: 3, absent: 2, isToday: false },
      { day: 'Sat', dayAr: 'سبت', present: 12, late: 0, absent: 0, isToday: false },
      { day: 'Sun', dayAr: 'أحد', present: 36, late: 3, absent: 2, isToday: true },
    ]
  },

  overtimeMonth: {
    totalHours: 196,
    totalAmount: 8420.50,
    pendingRequests: 5,
    pendingHours: 14,
    types: [
      { name: 'Normal ×1.25', hours: 110, amount: 4200.00, percent: 50 },
      { name: 'Night ×1.5', hours: 42, amount: 2016.00, percent: 24 },
      { name: 'Rest day ×1.5', hours: 20, amount: 1008.00, percent: 12 },
      { name: 'Holiday ×1.5', hours: 24, amount: 1196.50, percent: 14 },
    ]
  },

  payrollTrend: {
    months: [
      { month: 'May', monthAr: 'مايو', gross: 310000, net: 304200 },
      { month: 'Jun', monthAr: 'يونيو', gross: 315000, net: 309800 },
      { month: 'Jul', monthAr: 'يوليو', gross: 320000, net: 314500 },
      { month: 'Aug', monthAr: 'أغسطس', gross: 322000, net: 316900 },
      { month: 'Sep', monthAr: 'سبتمبر', gross: 328000, net: 321240.50 },
      { month: 'Oct', monthAr: 'أكتوبر', gross: 336000, net: 335490.50, isCurrent: true },
    ],
    thresholdMin: 300000,
    thresholdMax: 350000
  },

  departmentHeadcount: [
    { name: 'Operations', count: 16, percentage: 38.1, opacity: 1.0 },
    { name: 'Engineering', count: 10, percentage: 23.8, opacity: 0.80 },
    { name: 'Sales & Mktg', count: 7, percentage: 16.7, opacity: 0.62 },
    { name: 'Logistics & Fleet', count: 5, percentage: 11.9, opacity: 0.46 },
    { name: 'Finance & Admin', count: 4, percentage: 9.5, opacity: 0.32 },
  ],

  financeLiabilities: {
    gratuity: {
      totalAccrued: 482650.00,
      monthDelta: 14200.00,
      deltaPercent: '+3.0%',
      isPositive: true
    },
    leaveLiability: {
      totalAccrued: 128400.00,
      monthDelta: 2850.00,
      deltaPercent: '+2.3%',
      isPositive: true
    }
  },

  weekAhead: [
    {
      date: '26 Oct',
      day: 'Mon',
      dayAr: 'الإثنين',
      isWeekend: false,
      items: [
        { label: 'Sara Al-Ali · Sick leave return', type: 'leave' }
      ]
    },
    {
      date: '27 Oct',
      day: 'Tue',
      dayAr: 'الثلاثاء',
      isWeekend: false,
      items: [
        { label: 'Ahmed Mansoor · Annual leave return', type: 'leave' }
      ]
    },
    {
      date: '28 Oct',
      day: 'Wed',
      dayAr: 'الأربعاء',
      isWeekend: false,
      items: [
        { label: 'Maya Lin · Limited contract renewal', type: 'contract' }
      ]
    },
    {
      date: '29 Oct',
      day: 'Thu',
      dayAr: 'الخميس',
      isWeekend: false,
      items: [
        { label: 'Cut-off day · Punch freeze at 18:00', type: 'cutoff' }
      ]
    },
    {
      date: '30 Oct',
      day: 'Fri',
      dayAr: 'الجمعة',
      isWeekend: false,
      items: [
        { label: 'Tariq Mahmood · Probation ending', type: 'probation' }
      ]
    },
    {
      date: '31 Oct',
      day: 'Sat',
      dayAr: 'السبت',
      isWeekend: true,
      items: [
        { label: 'Weekly off', type: 'off' }
      ]
    },
    {
      date: '01 Nov',
      day: 'Sun',
      dayAr: 'الأحد',
      isWeekend: true,
      items: [
        { label: 'Weekly off', type: 'off' }
      ]
    }
  ],

  quickActions: [
    { id: 'import', label: 'Import punches', labelAr: 'استيراد البصمات', icon: 'Upload', role: 'hr' },
    { id: 'new-emp', label: 'New employee', labelAr: 'إضافة موظف', icon: 'UserPlus', role: 'hr' },
    { id: 'leave', label: 'Apply leave for employee', labelAr: 'تقديم إجازة لموظف', icon: 'CalendarPlus', role: 'hr' },
    { id: 'salary-adj', label: 'Add salary adjustment', labelAr: 'إضافة تسوية راتب', icon: 'FilePlus2', role: 'payroll' },
    { id: 'holiday', label: 'Add public holiday', labelAr: 'إضافة عطلة رسمية', icon: 'Palmtree', role: 'hr' },
    { id: 'payrun', label: 'Open current pay run', labelAr: 'فتح مسير الرواتب', icon: 'PlayCircle', role: 'payroll' },
  ],

  recentActivity: [
    {
      id: 'act-1',
      actor: 'Fatima Al-Nuaimi',
      role: 'HR Manager',
      action: 'Approved Overtime (3 hrs)',
      target: 'Ahmed Mansoor',
      timestamp: '12m ago',
      avatar: 'FN'
    },
    {
      id: 'act-2',
      actor: 'System (Biometric Import)',
      role: 'Automated Job',
      action: 'Imported 126 fingerprint punches',
      target: 'Device #01 (Dubai HQ)',
      timestamp: '34m ago',
      avatar: 'SY'
    },
    {
      id: 'act-3',
      actor: 'Zayed Al-Ameri',
      role: 'Employee',
      action: 'Uploaded renewed Emirates ID document',
      target: 'Document #DOC-4481',
      timestamp: '1h ago',
      avatar: 'ZA'
    },
    {
      id: 'act-4',
      actor: 'Mansoor Al-Falasi',
      role: 'Payroll Officer',
      action: 'Calculated Pay Run for October 2026',
      target: 'Pay Run #PR-2026-10-01',
      timestamp: '2h ago',
      avatar: 'MF'
    },
    {
      id: 'act-5',
      actor: 'Tariq Mahmood',
      role: 'Employee',
      action: 'Submitted Annual Leave request (5 days)',
      target: 'Approval Step: Dept Manager',
      timestamp: '4h ago',
      avatar: 'TM'
    },
  ],

  variance: {
    currentMonthNet: netToWps.toNumber(),
    previousMonthNet: previousMonthNet.toNumber(),
    diffAmount: diffAmount.toNumber(),
    diffPercent: diffPercent,
    isPositive: true,
    topChanges: [
      { employee: 'Elena Rostova', employeeAr: 'إيلينا روستوفا', diff: '+8,500.00', reason: 'New hire', reasonAr: 'تعيين جديد', warning: false },
      { employee: 'Ahmed Mansoor', employeeAr: 'أحمد منصور', diff: '+2,120.00', reason: 'Approved OT', reasonAr: 'إضافي معتمد', warning: false },
      { employee: 'Zayed Al-Ameri', employeeAr: 'زايد العامري', diff: '-1,450.00', reason: 'Unpaid leave', reasonAr: 'إجازة بدون راتب', warning: false },
    ]
  },
};
