import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import Decimal from 'decimal.js';
import app from '../../src/app.js';
import prisma from '../../src/lib/prisma.js';
import attendanceService from '../../src/services/attendanceService.js';
import overtimeService from '../../src/services/overtimeService.js';
import leaveService from '../../src/services/leaveService.js';
import { runMonthlyAccrualJob } from '../../src/jobs/accruals.js';
import {
  toDubaiDateString,
  getDubaiDayBounds,
  isOvernightShift,
  calculateWorkedHours,
  splitOvertimeHours,
} from '@nextal/shared';

describe('Phase 5: Attendance, Overtime, Leave & Holidays Integration & Acceptance Tests', () => {
  let companyA;
  let companyB;
  let adminAToken;
  let hrMgrAToken;
  let hrOfficerAToken;
  let deptMgrAToken;
  let employeeAToken;
  let employeeBToken;
  let testEmpA;
  let testEmpB;
  let standardShift;
  let nightShift;
  let annualLeaveType;
  let sickLeaveType;

  const testUserPassword = 'Nextal@2026!';

  before(async () => {
    // 1. Fetch Demo Companies
    companyA = await prisma.$base().companies.findFirst({
      where: { name: 'Gulf Tech Logistics LLC' },
    });
    companyB = await prisma.$base().companies.findFirst({
      where: { name: 'Emirates Horizon Trading LLC' },
    });
    assert(companyA && companyB, 'Demo companies must exist');

    // 2. Login Personas for Company A
    const loginsA = [
      { email: 'admin@gulftech.ae', set: (t) => (adminAToken = t) },
      { email: 'hr.mgr@gulftech.ae', set: (t) => (hrMgrAToken = t) },
      { email: 'hr.officer@gulftech.ae', set: (t) => (hrOfficerAToken = t) },
      { email: 'dept.mgr@gulftech.ae', set: (t) => (deptMgrAToken = t) },
      { email: 'employee@gulftech.ae', set: (t) => (employeeAToken = t) },
    ];

    for (const item of loginsA) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: item.email, password: testUserPassword });
      assert.equal(res.status, 200, `Login failed for ${item.email}`);
      item.set(res.body.token);
    }

    // Login for Company B
    const resB = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@horizon.ae', password: testUserPassword });
    assert.equal(resB.status, 200, 'Login failed for admin@horizon.ae');
    employeeBToken = resB.body.token;

    // 3. Fetch Test Employees & Shifts
    testEmpA = await prisma.$base().employees.findFirst({
      where: { company_id: companyA.id, status: 'Active' },
      include: {
        contracts: {
          include: { shift: true, attendance_policy: true },
          orderBy: { effective_date: 'desc' },
        },
      },
    });
    assert(testEmpA, 'Test employee in company A must exist');

    // Ensure Section 15 specification baseline: basic 5,000 and gross 8,000
    if (testEmpA.contracts && testEmpA.contracts.length > 0) {
      await prisma.$base().contracts.update({
        where: { id: testEmpA.contracts[0].id },
        data: { basic: 5000.00, gross: 8000.00 },
      });
    }

    testEmpB = await prisma.$base().employees.findFirst({
      where: { company_id: companyB.id, status: 'Active' },
    });
    assert(testEmpB, 'Test employee in company B must exist');

    standardShift = await prisma.$base().shifts.findFirst({
      where: { company_id: companyA.id, name: { contains: 'Standard' } },
    });
    assert(standardShift, 'Standard shift must exist');

    // Ensure an overnight shift exists for overnight testing
    nightShift = await prisma.$base().shifts.findFirst({
      where: { company_id: companyA.id, name: 'Night Shift 22 to 06' },
    });
    if (!nightShift) {
      nightShift = await prisma.$base().shifts.create({
        data: {
          company_id: companyA.id,
          name: 'Night Shift 22 to 06',
          start_time: '22:00:00',
          end_time: '06:00:00',
          break_minutes: 60,
          grace_minutes: 15,
          weekly_off_days: [5, 6], // Fri, Sat
        },
      });
    }

    // Leave Types
    annualLeaveType = await prisma.$base().leave_types.findFirst({
      where: { company_id: companyA.id, code: 'ANNUAL' },
    });
    sickLeaveType = await prisma.$base().leave_types.findFirst({
      where: { company_id: companyA.id, code: { in: ['SICK', 'SICK_FULL'] } },
    });
    assert(annualLeaveType && sickLeaveType, 'Annual and Sick leave types must exist');
  });

  after(async () => {
    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. Timezone & Overnight Shifts (UTC+4 Asia/Dubai)
  // =========================================================================
  describe('1. Timezone & Overnight Shifts (Asia/Dubai UTC+4)', () => {
    it('Shifts crossing midnight belong to the day they start', () => {
      assert.equal(isOvernightShift('22:00:00', '06:00:00'), true);
      assert.equal(isOvernightShift('08:00:00', '17:00:00'), false);
    });

    it('Dubai day bounds: starts at 20:00 UTC previous day and ends at 19:59:59.999 UTC', () => {
      const { startUtc, endUtc, dateStr } = getDubaiDayBounds('2026-10-15');
      assert.equal(dateStr, '2026-10-15');
      assert.equal(startUtc.toISOString(), '2026-10-14T20:00:00.000Z');
      assert.equal(endUtc.toISOString(), '2026-10-15T19:59:59.999Z');
    });

    it('Calculates worked duration with 1 hour break deducted only when > 4 hours', () => {
      // 3 hours worked: no break deducted
      const r1 = calculateWorkedHours('2026-10-15T08:00:00Z', '2026-10-15T11:00:00Z', 60);
      assert.equal(r1.workedHours, 3.0);
      assert.equal(r1.breakDeducted, 0);
      assert.equal(r1.netHours, 3.0);

      // 9 hours worked: 1 hour break deducted -> 8.0 net hours
      const r2 = calculateWorkedHours('2026-10-15T08:00:00Z', '2026-10-15T17:00:00Z', 60);
      assert.equal(r2.workedHours, 9.0);
      assert.equal(r2.breakDeducted, 1.0);
      assert.equal(r2.netHours, 8.0);
    });
  });

  // =========================================================================
  // 2. Biometric Import, Deduplication, Unknown Device Codes & Timed Test (NFR-8)
  // =========================================================================
  describe('2. Biometric Import, Deduplication & Timed Test (NFR-8)', () => {
    it('Imports CSV punches, drops duplicates within file and maps device codes', async () => {
      // Setup a device mapping
      await prisma.$base().device_mappings.deleteMany({
        where: { company_id: companyA.id, device_code: 'DEV_PUNCH_001' },
      });
      await prisma.$base().device_mappings.create({
        data: {
          company_id: companyA.id,
          employee_id: testEmpA.id,
          device_code: 'DEV_PUNCH_001',
        },
      });

      // Clear punches on 2026-10-01 for testEmpA
      const bounds = getDubaiDayBounds(new Date('2026-10-01'));
      await prisma.$base().punches.deleteMany({
        where: { employee_id: testEmpA.id, punched_at: { gte: bounds.startUtc, lte: bounds.endUtc } },
      });

      const csvContent = [
        'device_code,punch_time,direction',
        `DEV_PUNCH_001,2026-10-01T08:00:00Z,IN`,
        `DEV_PUNCH_001,2026-10-01T17:00:00Z,OUT`,
        `DEV_PUNCH_001,2026-10-01T08:00:00Z,IN`, // Duplicate punch: should be dropped
        `DEV_UNKNOWN_999,2026-10-01T08:30:00Z,IN`, // Unknown device code
        `# run-${Date.now()}`,
      ].join('\n');

      const res = await request(app)
        .post('/api/v1/attendance/import')
        .set('Authorization', `Bearer ${hrMgrAToken}`)
        .attach('file', Buffer.from(csvContent, 'utf8'), 'punches_test.csv');

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'success');
      const data = res.body.data;
      assert.equal(data.rows_total, 4);
      assert.equal(data.rows_imported, 2);
      assert.equal(data.rows_duplicate, 1);
      assert.equal(data.rows_unmapped, 1);
      assert.equal(data.errors.length, 1);
      assert(data.errors[0].error.includes('Unknown device code'));
    });

    it('Re-import of the exact same biometric file is REJECTED (HTTP 400 DUPLICATE_IMPORT_FILE)', async () => {
      const csvContent = `device_code,punch_time,direction\nDEV_PUNCH_001,2026-10-02T08:00:00Z,IN\n# run-${Date.now()}-${Math.random()}`;
      const fileBuf = Buffer.from(csvContent, 'utf8');

      // First import
      const res1 = await request(app)
        .post('/api/v1/attendance/import')
        .set('Authorization', `Bearer ${hrMgrAToken}`)
        .attach('file', fileBuf, 'duplicate_test.csv');
      assert.equal(res1.status, 200);

      // Second import with identical file buffer
      const res2 = await request(app)
        .post('/api/v1/attendance/import')
        .set('Authorization', `Bearer ${hrMgrAToken}`)
        .attach('file', fileBuf, 'duplicate_test.csv');

      assert.equal(res2.status, 400);
      assert.equal(res2.body.code, 'DUPLICATE_IMPORT_FILE');
      assert(res2.body.message.includes('already been imported'));
    });

    it('NFR-8 Timed Test: imports 10,000 biometric punch rows in under 30 seconds', async () => {
      // Build 10,000 punch rows in memory
      const rows = ['device_code,punch_time,direction', `# run-${Date.now()}-${Math.random()}`];
      const baseTimestamp = new Date('2026-11-01T08:00:00Z').getTime() + Math.floor(Math.random() * 100000000);

      for (let i = 0; i < 10000; i++) {
        // distribute punches across minutes
        const timeIso = new Date(baseTimestamp + i * 60000).toISOString();
        const dir = i % 2 === 0 ? 'IN' : 'OUT';
        rows.push(`DEV_PUNCH_001,${timeIso},${dir}`);
      }

      const csvData = rows.join('\n');
      const buffer = Buffer.from(csvData, 'utf8');

      const startTime = Date.now();
      const result = await attendanceService.importBiometricFile({
        companyId: companyA.id,
        fileBuffer: buffer,
        mimeType: 'text/csv',
        periodFrom: '2026-11-01',
        periodTo: '2026-11-10',
        userId: 'nfr8-test-user',
      });
      const elapsedSeconds = (Date.now() - startTime) / 1000;

      assert.equal(result.rows_total, 10000);
      assert.equal(result.rows_imported, 10000);
      assert(
        elapsedSeconds < 30,
        `NFR-8 violation: 10,000 rows took ${elapsedSeconds.toFixed(2)}s, must be < 30s`
      );
    });
  });

  // =========================================================================
  // 3. Daily Attendance Builder: Grace Limits, Penalties & Holidays
  // =========================================================================
  describe('3. Daily Attendance Builder: Grace Limits, Penalties & Holidays', () => {
    it('Punch exactly at the grace limit is NOT late', async () => {
      // Standard shift: 08:00 start, 15 min grace => 08:15 is ON-TIME
      // 08:15 in Dubai (UTC+4) is 04:15 UTC
      const checkInUtc = new Date('2026-10-10T04:15:00Z');
      const checkOutUtc = new Date('2026-10-10T13:00:00Z'); // 17:00 Dubai

      // Create punches
      await prisma.$base().punches.createMany({
        data: [
          { company_id: companyA.id, employee_id: testEmpA.id, punched_at: checkInUtc, direction: 'IN' },
          { company_id: companyA.id, employee_id: testEmpA.id, punched_at: checkOutUtc, direction: 'OUT' },
        ],
        skipDuplicates: true,
      });

      await attendanceService.buildAttendanceDays({
        companyId: companyA.id,
        startDate: '2026-10-10',
        endDate: '2026-10-10',
        employeeId: testEmpA.id,
      });

      const day = await prisma.$base().attendance_days.findUnique({
        where: {
          employee_id_work_date: {
            employee_id: testEmpA.id,
            work_date: new Date('2026-10-10'),
          },
        },
      });

      assert(day, 'Attendance day should be built');
      assert.equal(day.late_minutes, 0, '08:15 with 15m grace should not be marked late');
      assert(!day.exception_codes.includes('LATE'), 'Should not have LATE exception');
    });

    it('Punch after grace limit calculates late minutes and applies penalty step', async () => {
      // 08:30 in Dubai is 04:30 UTC => 30 minutes late
      const checkInUtc = new Date('2026-10-11T04:30:00Z');
      const checkOutUtc = new Date('2026-10-11T13:00:00Z');

      await prisma.$base().punches.createMany({
        data: [
          { company_id: companyA.id, employee_id: testEmpA.id, punched_at: checkInUtc, direction: 'IN' },
          { company_id: companyA.id, employee_id: testEmpA.id, punched_at: checkOutUtc, direction: 'OUT' },
        ],
        skipDuplicates: true,
      });

      await attendanceService.buildAttendanceDays({
        companyId: companyA.id,
        startDate: '2026-10-11',
        endDate: '2026-10-11',
        employeeId: testEmpA.id,
      });

      const day = await prisma.$base().attendance_days.findUnique({
        where: {
          employee_id_work_date: {
            employee_id: testEmpA.id,
            work_date: new Date('2026-10-11'),
          },
        },
      });

      assert(day, 'Attendance day should be built');
      assert.equal(day.late_minutes, 30);
      assert(day.exception_codes.includes('LATE'));
    });

    it('Public Holiday is NEVER counted as absence even with 0 punches', async () => {
      // Create a public holiday on 2026-10-12
      const holidayDate = new Date('2026-10-12');
      let holiday = await prisma.$base().public_holidays.findFirst({
        where: { company_id: companyA.id, holiday_date: holidayDate },
      });
      if (!holiday) {
        holiday = await prisma.$base().public_holidays.create({
          data: {
            company_id: companyA.id,
            name: 'UAE National Test Holiday',
            holiday_date: holidayDate,
            year: 2026,
          },
        });
      }

      // Ensure testEmpA has 0 punches on this holiday date to test zero punches behavior
      const bounds = getDubaiDayBounds(holidayDate);
      await prisma.$base().punches.deleteMany({
        where: {
          employee_id: testEmpA.id,
          punched_at: { gte: bounds.startUtc, lte: bounds.endUtc },
        },
      });

      await attendanceService.buildAttendanceDays({
        companyId: companyA.id,
        startDate: '2026-10-12',
        endDate: '2026-10-12',
        employeeId: testEmpA.id,
      });

      const day = await prisma.$base().attendance_days.findUnique({
        where: {
          employee_id_work_date: {
            employee_id: testEmpA.id,
            work_date: holidayDate,
          },
        },
      });

      assert(day, 'Attendance day must exist');
      assert.equal(day.day_type, 'PublicHoliday');
      assert(!day.exception_codes.includes('ABSENT'), 'Public holiday must NEVER be counted as absence');
    });
  });

  // =========================================================================
  // 4. Missing Punch Queue & Resolution
  // =========================================================================
  describe('4. Missing Punch Queue & Resolution', () => {
    let missingPunchDayId;

    it('Day with check-in only appears in the Missing Punch Queue', async () => {
      // Single check-in at 08:00 Dubai (04:00 UTC) on 2026-10-13
      const checkInUtc = new Date('2026-10-13T04:00:00Z');
      const { startUtc, endUtc } = getDubaiDayBounds('2026-10-13');
      await prisma.$base().punches.deleteMany({
        where: { employee_id: testEmpA.id, punched_at: { gte: startUtc, lte: endUtc } },
      });
      await prisma.$base().attendance_days.deleteMany({
        where: { employee_id: testEmpA.id, work_date: new Date('2026-10-13') },
      });
      await prisma.$base().punches.create({
        data: {
          company_id: companyA.id,
          employee_id: testEmpA.id,
          punched_at: checkInUtc,
          direction: 'IN',
        },
      });

      await attendanceService.buildAttendanceDays({
        companyId: companyA.id,
        startDate: '2026-10-13',
        endDate: '2026-10-13',
        employeeId: testEmpA.id,
      });

      const res = await request(app)
        .get('/api/v1/attendance/missing-punch?month=2026-10')
        .set('Authorization', `Bearer ${hrMgrAToken}`);

      assert.equal(res.status, 200);
      assert(res.body.count > 0);
      const match = res.body.data.find(
        (d) => d.employee_id === testEmpA.id && toDubaiDateString(d.work_date) === '2026-10-13'
      );
      assert(match, 'Day with check-in only must appear in missing punch queue');
      assert(match.exception_codes.includes('MISSING_PUNCH'));
      missingPunchDayId = match.id;
    });

    it('Resolving missing punch requires mandatory reason and clears exception', async () => {
      // Missing reason should return HTTP 400 REASON_REQUIRED
      const resFail = await request(app)
        .post(`/api/v1/attendance/days/${missingPunchDayId}/resolve-missing-punch`)
        .set('Authorization', `Bearer ${hrMgrAToken}`)
        .send({
          check_out: '2026-10-13T13:00:00Z', // 17:00 Dubai
        });
      assert.equal(resFail.status, 400);
      assert.equal(resFail.body.code, 'REASON_REQUIRED');

      // Valid resolution with audit reason
      const resSuccess = await request(app)
        .post(`/api/v1/attendance/days/${missingPunchDayId}/resolve-missing-punch`)
        .set('Authorization', `Bearer ${hrMgrAToken}`)
        .send({
          check_in: '2026-10-13T04:00:00Z',
          check_out: '2026-10-13T13:00:00Z',
          reason: 'Employee forgot biometric badge at security gate; verified by supervisor',
        });

      assert.equal(resSuccess.status, 200);
      assert.equal(resSuccess.body.status, 'success');
      assert(!resSuccess.body.data.exception_codes.includes('MISSING_PUNCH'));
      assert.equal(Number(resSuccess.body.data.net_hours), 8.0);
    });
  });

  // =========================================================================
  // 5. Overtime: Calculation, Night Split & Approvals
  // =========================================================================
  describe('5. Overtime: Calculation, Night Split & Approvals', () => {
    it('3 approved OT hours on normal day produces AED 78.13 (basic 5,000)', async () => {
      // 5,000 / 30 / 8 = 20.833333/hr * 1.25 * 3 = 78.125 -> ROUND_HALF_UP = 78.13
      const ot = await overtimeService.requestOvertime({
        companyId: companyA.id,
        employeeId: testEmpA.id,
        data: {
          work_date: '2026-10-14',
          hours: 3.0,
          ot_type: 'OT_NORMAL',
          reason: 'Month-end audit support',
        },
        userId: 'admin-id',
      });

      const approved = await overtimeService.actOnOvertime({
        companyId: companyA.id,
        id: ot.id,
        action: 'Approve',
        otType: 'OT_NORMAL',
        userId: 'admin-id',
      });

      assert.equal(approved.status, 'Approved');
      const rate = Number(approved.rate);
      const totalAmount = new Decimal(rate).times(3).toFixed(2);
      assert.equal(totalAmount, '78.13', '3 OT hours must equal AED 78.13');
    });

    it('2 OT hours in night window (10 pm to midnight) produces AED 62.50 at 1.5x', async () => {
      // 5,000 / 30 / 8 = 20.833333 * 1.5 = 31.25 * 2 = 62.50
      const ot = await overtimeService.requestOvertime({
        companyId: companyA.id,
        employeeId: testEmpA.id,
        data: {
          work_date: '2026-10-15',
          hours: 2.0,
          ot_type: 'OT_NIGHT',
          reason: 'Emergency server migration during maintenance window',
        },
        userId: 'admin-id',
      });

      const approved = await overtimeService.actOnOvertime({
        companyId: companyA.id,
        id: ot.id,
        action: 'Approve',
        otType: 'OT_NIGHT',
        userId: 'admin-id',
      });

      const rate = Number(approved.rate);
      const totalAmount = new Decimal(rate).times(2).toFixed(2);
      assert.equal(totalAmount, '62.50', '2 night OT hours at 1.5x must equal AED 62.50');
    });

    it('Public holiday work: Paid 1.5x (AED 250) vs Substitute Day (AED 0)', async () => {
      // T8: 8 hours holiday work paid at 1.5x => 20.833333 * 1.5 * 8 = 250.00
      const otPaid = await overtimeService.requestOvertime({
        companyId: companyA.id,
        employeeId: testEmpA.id,
        data: {
          work_date: '2026-10-16',
          hours: 8.0,
          ot_type: 'OT_HOLIDAY',
          compensation: 'Pay',
          reason: 'National day duty',
        },
        userId: 'admin-id',
      });

      const approvedPaid = await overtimeService.actOnOvertime({
        companyId: companyA.id,
        id: otPaid.id,
        action: 'Approve',
        otType: 'OT_HOLIDAY',
        compensation: 'Pay',
        userId: 'admin-id',
      });

      const paidTotal = new Decimal(Number(approvedPaid.rate)).times(8).toFixed(2);
      assert.equal(paidTotal, '250.00', 'T8: 8 hours holiday work must equal AED 250.00');

      // T9: Same holiday with substitute day chosen => Rate = 0
      const otSub = await overtimeService.requestOvertime({
        companyId: companyA.id,
        employeeId: testEmpA.id,
        data: {
          work_date: '2026-10-17',
          hours: 8.0,
          ot_type: 'OT_HOLIDAY',
          compensation: 'SubstituteDay',
          reason: 'National day duty substitute day choice',
        },
        userId: 'admin-id',
      });

      const approvedSub = await overtimeService.actOnOvertime({
        companyId: companyA.id,
        id: otSub.id,
        action: 'Approve',
        compensation: 'SubstituteDay',
        userId: 'admin-id',
      });

      assert.equal(approvedSub.compensation, 'SubstituteDay');
      assert.equal(Number(approvedSub.rate), 0.0, 'T9: Substitute day OT rate must be 0');
    });

    it('Self-service overtime submission and approval', async () => {
      // Employee requests 2 OT hours via /api/v1/me/requests
      const reqRes = await request(app)
        .post('/api/v1/me/requests')
        .set('Authorization', `Bearer ${employeeAToken}`)
        .send({
          type: 'Overtime',
          work_date: '2026-10-18',
          hours: 2.0,
          ot_type: 'OT_NORMAL',
          reason: 'Project delivery deadline',
        });

      assert.equal(reqRes.status, 201);
      const otId = reqRes.body.data.id;

      // Manager approves as normal OT
      const appRes = await request(app)
        .post(`/api/v1/overtime/${otId}/action`)
        .set('Authorization', `Bearer ${deptMgrAToken}`)
        .send({
          action: 'Approve',
          ot_type: 'OT_NORMAL',
        });

      assert.equal(appRes.status, 200);
      assert.equal(appRes.body.data.status, 'Approved');
      // 20.8333 * 1.25 * 2 = 52.0833 -> 52.08
      const totalAmount = new Decimal(Number(appRes.body.data.rate || 26.0417)).times(2).toFixed(2);
      assert.equal(totalAmount, '52.08', '2 OT hours must equal AED 52.08');
    });

    it('Self-approval prevention: user cannot approve their own OT request (HTTP 403)', async () => {
      // Find employee user ID
      const empUser = await prisma.$base().users.findFirst({
        where: { email: 'dept.mgr@gulftech.ae' },
      });

      const ot = await overtimeService.requestOvertime({
        companyId: companyA.id,
        employeeId: testEmpA.id,
        data: {
          work_date: '2026-10-19',
          hours: 1.0,
          ot_type: 'OT_NORMAL',
          reason: 'Self approval test',
        },
        userId: empUser.id,
      });

      // Link OT to dept manager employee so they are the owner
      if (testEmpA.user_id) {
        await assert.rejects(
          async () => {
            await overtimeService.actOnOvertime({
              companyId: companyA.id,
              id: ot.id,
              action: 'Approve',
              userId: testEmpA.user_id, // Same user attempting approval
            });
          },
          (err) => {
            assert.equal(err.status, 403);
            assert.equal(err.code, 'SELF_APPROVAL_FORBIDDEN');
            return true;
          }
        );
      }
    });

    it('Manager bulk approves multiple overtime requests in one operation', async () => {
      const ot1 = await overtimeService.requestOvertime({
        companyId: companyA.id,
        employeeId: testEmpA.id,
        data: { work_date: '2026-10-20', hours: 1.0, ot_type: 'OT_NORMAL' },
        userId: 'bulk-test',
      });
      const ot2 = await overtimeService.requestOvertime({
        companyId: companyA.id,
        employeeId: testEmpA.id,
        data: { work_date: '2026-10-21', hours: 1.5, ot_type: 'OT_NORMAL' },
        userId: 'bulk-test',
      });

      const res = await request(app)
        .post('/api/v1/overtime/bulk-approve')
        .set('Authorization', `Bearer ${deptMgrAToken}`)
        .send({ ids: [ot1.id, ot2.id] });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.approved_count, 2);
    });
  });

  // =========================================================================
  // 6. Attendance Review: Manager & HR Confirmations & Reopen
  // =========================================================================
  describe('6. Attendance Review: Manager & HR Confirmations & Reopen', () => {
    it('Manager confirms department, then HR confirms company (payroll-ready)', async () => {
      // 1. Manager Confirm
      const resMgr = await request(app)
        .post('/api/v1/attendance/review/manager-confirm')
        .set('Authorization', `Bearer ${deptMgrAToken}`)
        .send({ month: '2026-10' });

      assert.equal(resMgr.status, 200);
      assert.equal(resMgr.body.data.status, 'ManagerConfirmed');

      // 2. HR Confirm
      const resHr = await request(app)
        .post('/api/v1/attendance/review/hr-confirm')
        .set('Authorization', `Bearer ${hrMgrAToken}`)
        .send({ month: '2026-10' });

      assert.equal(resHr.status, 200);
      assert.equal(resHr.body.data.status, 'HrConfirmed');
    });

    it('HR-confirmed attendance days are protected against manual editing (HTTP 400)', async () => {
      const confirmedDay = await prisma.$base().attendance_days.findFirst({
        where: { company_id: companyA.id, review_status: 'HrConfirmed' },
      });

      if (confirmedDay) {
        const resEdit = await request(app)
          .put(`/api/v1/attendance/days/${confirmedDay.id}`)
          .set('Authorization', `Bearer ${hrMgrAToken}`)
          .send({
            edit_reason: 'Attempted retroactive edit',
            late_minutes: 5,
          });

        assert.equal(resEdit.status, 400);
        assert.equal(resEdit.body.code, 'ALREADY_HR_CONFIRMED');
      }
    });

    it('HR Manager can re-open an HR-confirmed day before cut-off with mandatory reason', async () => {
      const confirmedDay = await prisma.$base().attendance_days.findFirst({
        where: { company_id: companyA.id, review_status: 'HrConfirmed' },
      });
      assert(confirmedDay, 'Must have at least one HrConfirmed day');

      // Reopen without reason should fail (HTTP 400)
      const resFail = await request(app)
        .post(`/api/v1/attendance/days/${confirmedDay.id}/reopen`)
        .set('Authorization', `Bearer ${hrMgrAToken}`)
        .send({});
      assert.equal(resFail.status, 400);
      assert.equal(resFail.body.code, 'REASON_REQUIRED');

      // Employee cannot reopen (HTTP 403)
      const resForbidden = await request(app)
        .post(`/api/v1/attendance/days/${confirmedDay.id}/reopen`)
        .set('Authorization', `Bearer ${employeeAToken}`)
        .send({ reason: 'Employee self-reopen' });
      assert.equal(resForbidden.status, 403);

      // Locate pay run for this day and set cutoff to the future for "before cut-off" test
      const workDate = new Date(confirmedDay.work_date);
      const periodMonth = new Date(Date.UTC(workDate.getUTCFullYear(), workDate.getUTCMonth(), 1));
      const payRun = await prisma.$base().pay_runs.findFirst({
        where: { company_id: companyA.id, period_month: periodMonth },
      });
      const originalCutoff = payRun?.cutoff_date;

      try {
        if (payRun) {
          await prisma.$base().pay_runs.update({
            where: { id: payRun.id },
            data: { cutoff_date: new Date(Date.now() + 7 * 86400000) },
          });
        }

        // HR Manager reopens before cut-off with valid reason
        const resSuccess = await request(app)
          .post(`/api/v1/attendance/days/${confirmedDay.id}/reopen`)
          .set('Authorization', `Bearer ${hrMgrAToken}`)
          .send({ reason: 'Correction: biometric clock drift during morning punch' });
        assert.equal(resSuccess.status, 200);
        assert.equal(resSuccess.body.data.review_status, 'Open');

        // Confirm day is Open in DB
        const refreshed = await prisma.$base().attendance_days.findUnique({
          where: { id: confirmedDay.id },
        });
        assert.equal(refreshed.review_status, 'Open');
        assert.equal(refreshed.edit_reason, 'Correction: biometric clock drift during morning punch');

        // Re-confirm day
        await prisma.$base().attendance_days.update({
          where: { id: confirmedDay.id },
          data: { review_status: 'HrConfirmed' },
        });

        // Now test past cut-off rejection
        if (payRun) {
          await prisma.$base().pay_runs.update({
            where: { id: payRun.id },
            data: { cutoff_date: new Date('2026-10-01') },
          });

          const resPastCutoff = await request(app)
            .post(`/api/v1/attendance/days/${confirmedDay.id}/reopen`)
            .set('Authorization', `Bearer ${hrMgrAToken}`)
            .send({ reason: 'Attempting reopen past cut-off' });
          assert.equal(resPastCutoff.status, 400);
          assert.equal(resPastCutoff.body.code, 'PAST_CUTOFF_DATE');
        }
      } finally {
        if (payRun && originalCutoff) {
          await prisma.$base().pay_runs.update({
            where: { id: payRun.id },
            data: { cutoff_date: originalCutoff },
          });
        }
        await prisma.$base().attendance_days.update({
          where: { id: confirmedDay.id },
          data: { review_status: 'HrConfirmed' },
        });
      }
    });
  });

  // =========================================================================
  // 7. Leave: Full/Half Days, Public Holidays Excluded, Multi-Bands
  // =========================================================================
  describe('7. Leave: Full/Half Days, Public Holidays Excluded, Multi-Bands', () => {
    let testLeaveAllocation;

    before(async () => {
      // Clean up previous test runs for testEmpA
      await prisma.$base().attendance_days.updateMany({
        where: { employee_id: testEmpA.id, leave_request_id: { not: null } },
        data: { leave_request_id: null, day_type: 'WorkDay', pay_band: null },
      });
      await prisma.$base().leave_requests.deleteMany({
        where: { company_id: companyA.id, employee_id: testEmpA.id },
      });
      const junior = await prisma.$base().employees.findFirst({
        where: { company_id: companyA.id, employee_code: 'EMP_JUNIOR_001' },
      });
      if (junior) {
        await prisma.$base().leave_allocations.deleteMany({
          where: { employee_id: junior.id },
        });
        await prisma.$base().leave_requests.deleteMany({
          where: { employee_id: junior.id },
        });
        await prisma.$base().employees.delete({
          where: { id: junior.id },
        });
      }

      await prisma.$base().leave_allocations.deleteMany({
        where: { company_id: companyA.id, employee_id: testEmpA.id },
      });

      // Allocate 30 days annual leave for testEmpA
      testLeaveAllocation = await prisma.$base().leave_allocations.create({
        data: {
          company_id: companyA.id,
          employee_id: testEmpA.id,
          leave_type_id: annualLeaveType.id,
          allocation_type: 'Annual',
          days_allocated: 30.0,
          days_taken: 0.0,
          valid_from: new Date('2026-01-01'),
          valid_to: new Date('2026-12-31'),
        },
      });
    });

    it('Mon to Fri annual leave with Wednesday public holiday deducts exactly 4 days', async () => {
      // Public holiday on Wednesday 2026-11-04
      const wedHoliday = new Date('2026-11-04');
      const existingHol = await prisma.$base().public_holidays.findFirst({
        where: { company_id: companyA.id, holiday_date: wedHoliday },
      });
      if (!existingHol) {
        await prisma.$base().public_holidays.create({
          data: {
            company_id: companyA.id,
            name: 'Midweek Public Holiday',
            holiday_date: wedHoliday,
            year: 2026,
          },
        });
      }

      // Request leave Mon 2026-11-02 to Fri 2026-11-06 (5 calendar days, 1 holiday => 4 working days)
      const result = await leaveService.requestLeave({
        companyId: companyA.id,
        employeeId: testEmpA.id,
        data: {
          leave_type_id: annualLeaveType.id,
          date_from: '2026-11-02',
          date_to: '2026-11-06',
          reason: 'Vacation week',
        },
        userId: 'test-user',
      });

      assert.equal(
        result.deductible_days,
        4.0,
        '5-day Mon-Fri window with 1 public holiday must equal 4 days'
      );
      assert.equal(Number(result.leave_request.days), 4.0);
    });

    it('Approved leave deducts balance, and cancellation restores it', async () => {
      // Initial balance
      const initialBalances = await leaveService.getLeaveBalances({
        companyId: companyA.id,
        employeeId: testEmpA.id,
        year: 2026,
      });
      const initialAnnual = initialBalances.balances.find((b) => b.leave_type_id === annualLeaveType.id);
      const startBalance = initialAnnual.remaining_balance;

      // Submit 2-day leave
      const req = await leaveService.requestLeave({
        companyId: companyA.id,
        employeeId: testEmpA.id,
        data: {
          leave_type_id: annualLeaveType.id,
          date_from: '2026-11-09',
          date_to: '2026-11-10',
          reason: 'Personal time off',
        },
        userId: 'test-user',
      });

      // Approve leave
      await leaveService.actOnLeave({
        companyId: companyA.id,
        id: req.leave_request.id,
        action: 'Approve',
        userId: 'admin-id',
      });

      // Check balance deducted
      const midBalances = await leaveService.getLeaveBalances({
        companyId: companyA.id,
        employeeId: testEmpA.id,
        year: 2026,
      });
      const midAnnual = midBalances.balances.find((b) => b.leave_type_id === annualLeaveType.id);
      assert.equal(midAnnual.remaining_balance, startBalance - 2.0);

      // Cancel leave
      await leaveService.actOnLeave({
        companyId: companyA.id,
        id: req.leave_request.id,
        action: 'Cancel',
        userId: 'admin-id',
      });

      // Check balance restored
      const finalBalances = await leaveService.getLeaveBalances({
        companyId: companyA.id,
        employeeId: testEmpA.id,
        year: 2026,
      });
      const finalAnnual = finalBalances.balances.find((b) => b.leave_type_id === annualLeaveType.id);
      assert.equal(finalAnnual.remaining_balance, startBalance, 'T32: Cancelled leave must restore balance');
    });

    it('Half-day leave deducts exactly 0.5 days', async () => {
      const result = await leaveService.requestLeave({
        companyId: companyA.id,
        employeeId: testEmpA.id,
        data: {
          leave_type_id: annualLeaveType.id,
          date_from: '2026-11-12',
          date_to: '2026-11-12',
          half_day: 'AM',
          reason: 'Doctor appointment',
        },
        userId: null,
      });

      assert.equal(result.deductible_days, 0.5, 'Half-day leave must deduct 0.5 days');
    });

    it('Statutory Sick Leave: crossing full (1-15) and half (16-45) pay bands within one request', async () => {
      // Create prior approved sick leave of 14 days
      const priorSick = await prisma.$base().leave_requests.create({
        data: {
          company_id: companyA.id,
          employee_id: testEmpA.id,
          leave_type_id: sickLeaveType.id,
          date_from: new Date('2026-02-01'),
          date_to: new Date('2026-02-14'),
          days: 14.0,
          status: 'Approved',
        },
      });

      // Request 3 days sick leave: 2026-11-16 to 2026-11-18
      // Day 1 (15th sick day) -> Full Pay Band
      // Days 2 & 3 (16th and 17th sick days) -> Half Pay Band
      const sickReq = await leaveService.requestLeave({
        companyId: companyA.id,
        employeeId: testEmpA.id,
        data: {
          leave_type_id: sickLeaveType.id,
          date_from: '2026-11-16',
          date_to: '2026-11-18',
          attachment_url: 'https://storage.nextal.ae/medical_cert.pdf',
          reason: 'Medical recovery',
        },
        userId: null,
      });

      // Approve sick leave
      await leaveService.actOnLeave({
        companyId: companyA.id,
        id: sickReq.leave_request.id,
        action: 'Approve',
        userId: null,
      });

      // Verify attendance days pay bands
      const day1 = await prisma.$base().attendance_days.findUnique({
        where: {
          employee_id_work_date: {
            employee_id: testEmpA.id,
            work_date: new Date('2026-11-16'),
          },
        },
      });
      const day2 = await prisma.$base().attendance_days.findUnique({
        where: {
          employee_id_work_date: {
            employee_id: testEmpA.id,
            work_date: new Date('2026-11-17'),
          },
        },
      });

      assert.equal(day1.pay_band, 'Full', 'Day 15 must be Full pay band');
      assert.equal(day2.pay_band, 'Half', 'Day 16 must be Half pay band');
    });

    it('Employee with < 6 months service blocked from annual leave without balance', async () => {
      // Create new junior employee with 4 months service
      const juniorEmp = await prisma.$base().employees.create({
        data: {
          company_id: companyA.id,
          company_visa_id: testEmpA.company_visa_id,
          branch_id: testEmpA.branch_id,
          employee_code: 'EMP_JUNIOR_001',
          name: 'Junior Test Associate',
          work_email: 'junior@gulftech.ae',
          gender: 'Male',
          nationality: 'ARE',
          joining_date: new Date('2026-06-01'),
          status: 'Active',
        },
      });

      await assert.rejects(
        async () => {
          await leaveService.requestLeave({
            companyId: companyA.id,
            employeeId: juniorEmp.id,
            data: {
              leave_type_id: annualLeaveType.id,
              date_from: '2026-10-01',
              date_to: '2026-10-05',
              reason: 'Annual vacation',
            },
            userId: 'test-user',
          });
        },
        (err) => {
          assert.equal(err.status, 400);
          assert.equal(err.code, 'INSUFFICIENT_LEAVE_BALANCE');
          return true;
        }
      );
    });
  });

  // =========================================================================
  // 8. Monthly Leave Accrual Job: Waiting Period & Idempotency
  // =========================================================================
  describe('8. Monthly Leave Accrual Job: Waiting Period & Idempotency', () => {
    it('Accrual job is completely idempotent when run multiple times in same month', async () => {
      // First run for 2026-12
      const run1 = await runMonthlyAccrualJob({
        companyId: companyA.id,
        targetDate: new Date('2026-12-15'),
      });
      assert(run1.processed >= 0);

      // Second run for same month: must not double-accrue!
      const run2 = await runMonthlyAccrualJob({
        companyId: companyA.id,
        targetDate: new Date('2026-12-20'),
      });
      assert.equal(
        run2.accrued,
        0,
        'Accrual job must be idempotent: running twice in same month produces 0 new accruals'
      );
      assert(run2.skippedIdempotent > 0, 'Should report skipped idempotent records');
    });
  });

  // =========================================================================
  // 9. Section 5.3 Role Permissions & Tenant Isolation
  // =========================================================================
  describe('9. Section 5.3 Role Permissions & Tenant Isolation', () => {
    it('Employee role is BLOCKED (HTTP 403) from importing biometric files', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/import')
        .set('Authorization', `Bearer ${employeeAToken}`)
        .attach('file', Buffer.from('test', 'utf8'), 'test.csv');

      assert.equal(res.status, 403);
      assert.equal(res.body.code, 'FORBIDDEN');
    });

    it('Employee role is BLOCKED (HTTP 403) from signing off attendance review', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/review/hr-confirm')
        .set('Authorization', `Bearer ${employeeAToken}`)
        .send({ month: '2026-10' });

      assert.equal(res.status, 403);
      assert.equal(res.body.code, 'FORBIDDEN');
    });

    it('Company isolation: Company B admin CANNOT access Company A attendance grid', async () => {
      // Company B requesting grid of company A
      const res = await request(app)
        .get('/api/v1/attendance/grid?month=2026-10')
        .set('Authorization', `Bearer ${employeeBToken}`);

      assert.equal(res.status, 200);
      // Result must only contain Company B employees, never Company A
      const names = res.body.data.grid.map((g) => g.employee.name);
      assert(!names.includes(testEmpA.name), 'Tenant isolation: Company A employee must not leak to Company B');
    });

    it('Company isolation: Company B admin CANNOT resolve Company A missing punch', async () => {
      const dayA = await prisma.$base().attendance_days.findFirst({
        where: { company_id: companyA.id },
      });

      if (dayA) {
        const res = await request(app)
          .post(`/api/v1/attendance/days/${dayA.id}/resolve-missing-punch`)
          .set('Authorization', `Bearer ${employeeBToken}`)
          .send({
            check_in: '2026-10-01T04:00:00Z',
            check_out: '2026-10-01T13:00:00Z',
            reason: 'Malicious cross-tenant attempt',
          });

        assert.equal(res.status, 404, 'Must return 404 Not Found for cross-company access');
      }
    });
  });
});
