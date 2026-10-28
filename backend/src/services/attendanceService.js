import crypto from 'crypto';
import ExcelJS from 'exceljs';
import Decimal from 'decimal.js';
import prisma from '../prisma/client.js';
import auditService from './auditService.js';
import {
  toDubaiDateString,
  getDubaiDayBounds,
  toDubaiTimeString,
  timeStringToMinutes,
  isOvernightShift,
  calculateWorkedHours,
  splitOvertimeHours,
} from '@nextal/shared';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function sanitizeUuid(val) {
  return typeof val === 'string' && UUID_REGEX.test(val) ? val : null;
}

class AttendanceService {
  /**
   * 1. Biometric Import (CSV or Excel)
   * NFR-8: Supports up to 10,000 rows in < 30 s
   */
  async importBiometricFile({ companyId, fileBuffer, mimeType, periodFrom, periodTo, userId }) {
    if (!fileBuffer || fileBuffer.length === 0) {
      const err = new Error('No file content provided for biometric import');
      err.status = 400;
      err.code = 'EMPTY_FILE';
      throw err;
    }

    // 1. Compute SHA-256 file hash and reject duplicate file re-import
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const existingImport = await prisma.$base().biometric_imports.findFirst({
      where: { company_id: companyId, file_hash: fileHash },
    });

    if (existingImport) {
      const err = new Error('Duplicate import rejected: This biometric file has already been imported');
      err.status = 400;
      err.code = 'DUPLICATE_IMPORT_FILE';
      throw err;
    }

    // 2. Load device mappings for this company
    const deviceMappings = await prisma.$base().device_mappings.findMany({
      where: { company_id: companyId },
    });
    const deviceToEmployeeMap = new Map();
    deviceMappings.forEach((m) => {
      deviceToEmployeeMap.set(String(m.device_code).trim().toLowerCase(), m.employee_id);
    });

    // Also support mapping directly by employee_code if provided in file
    const employees = await prisma.$base().employees.findMany({
      where: { company_id: companyId },
      select: { id: true, employee_code: true },
    });
    employees.forEach((e) => {
      deviceToEmployeeMap.set(String(e.employee_code).trim().toLowerCase(), e.id);
    });

    // 3. Parse rows (CSV or Excel)
    const rawRows = [];
    const isExcel = mimeType?.includes('spreadsheet') ||
                    mimeType?.includes('excel') ||
                    mimeType?.includes('vnd.ms-excel') ||
                    (fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4B); // PK header

    if (isExcel) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer);
      const worksheet = workbook.worksheets[0];
      if (worksheet) {
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Skip header
          const values = row.values;
          // values is 1-indexed in exceljs
          rawRows.push({
            rowNumber,
            code: values[1] ? String(values[1]).trim() : '',
            time: values[2],
            direction: values[3] ? String(values[3]).trim().toUpperCase() : 'IN',
          });
        });
      }
    } else {
      // Parse CSV (comma, tab, or semicolon separated)
      const text = fileBuffer.toString('utf8');
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      lines.forEach((line, index) => {
        if (index === 0 && (line.toLowerCase().includes('device') || line.toLowerCase().includes('code'))) {
          return; // Skip header
        }
        const delimiter = line.includes('\t') ? '\t' : (line.includes(';') ? ';' : ',');
        const parts = line.split(delimiter).map((s) => s.replace(/^["']|["']$/g, '').trim());
        if (parts.length >= 2) {
          rawRows.push({
            rowNumber: index + 1,
            code: parts[0],
            time: parts[1],
            direction: parts[2] ? parts[2].toUpperCase() : 'IN',
          });
        }
      });
    }

    // 4. Validate rows and categorize
    const rowsTotal = rawRows.length;
    let rowsDuplicate = 0;
    let rowsUnmapped = 0;
    const errors = [];
    const validPunches = [];
    const punchDedupeSet = new Set();

    // Query existing punches in period for this company to prevent DB duplicate key errors
    const fromDate = periodFrom ? new Date(periodFrom) : new Date(Date.now() - 60 * 24 * 3600 * 1000);
    const toDate = periodTo ? new Date(periodTo) : new Date(Date.now() + 5 * 24 * 3600 * 1000);

    const existingPunches = await prisma.$base().punches.findMany({
      where: {
        company_id: companyId,
        punched_at: { gte: fromDate, lte: toDate },
      },
      select: { employee_id: true, punched_at: true },
    });

    existingPunches.forEach((p) => {
      punchDedupeSet.add(`${p.employee_id}_${p.punched_at.getTime()}`);
    });

    for (const r of rawRows) {
      if (!r.code) {
        errors.push({ row: r.rowNumber, error: 'Missing device code or employee code' });
        continue;
      }

      const employeeId = deviceToEmployeeMap.get(r.code.toLowerCase());
      if (!employeeId) {
        rowsUnmapped++;
        errors.push({ row: r.rowNumber, error: `Unknown device code: '${r.code}'` });
        continue;
      }

      let parsedDate = null;
      if (r.time instanceof Date) {
        parsedDate = r.time;
      } else {
        parsedDate = new Date(r.time);
      }

      if (!parsedDate || isNaN(parsedDate.getTime())) {
        errors.push({ row: r.rowNumber, error: `Invalid timestamp: '${r.time}'` });
        continue;
      }

      const dedupeKey = `${employeeId}_${parsedDate.getTime()}`;
      if (punchDedupeSet.has(dedupeKey)) {
        rowsDuplicate++;
        continue; // Drop duplicate punch
      }

      punchDedupeSet.add(dedupeKey);
      validPunches.push({
        company_id: companyId,
        employee_id: employeeId,
        punched_at: parsedDate,
        direction: r.direction.startsWith('OUT') ? 'OUT' : 'IN',
      });
    }

    // 5. Create biometric_imports record
    let validImporterId = sanitizeUuid(userId);
    if (!validImporterId) {
      const defaultUser = await prisma.$base().users.findFirst({
        where: { company_id: companyId },
        select: { id: true },
      });
      validImporterId = defaultUser?.id;
    }

    const importRecord = await prisma.$base().biometric_imports.create({
      data: {
        company_id: companyId,
        file_hash: fileHash,
        period_from: fromDate,
        period_to: toDate,
        rows_total: rowsTotal,
        rows_imported: validPunches.length,
        rows_duplicate: rowsDuplicate,
        rows_unmapped: rowsUnmapped,
        imported_by: validImporterId,
      },
    });

    // 6. Fast batch insert punches in chunks of 1000
    if (validPunches.length > 0) {
      const punchesWithImportId = validPunches.map((p) => ({ ...p, import_id: importRecord.id }));
      const chunkSize = 1000;
      for (let i = 0; i < punchesWithImportId.length; i += chunkSize) {
        const chunk = punchesWithImportId.slice(i, i + chunkSize);
        await prisma.$base().punches.createMany({
          data: chunk,
          skipDuplicates: true,
        });
      }
    }

    // 7. Auto-build attendance days for the affected period
    await this.buildAttendanceDays({
      companyId,
      startDate: fromDate,
      endDate: toDate,
    }).catch((err) => console.error('Background attendance rebuild error:', err));

    return {
      import_id: importRecord.id,
      rows_total: rowsTotal,
      rows_imported: validPunches.length,
      rows_duplicate: rowsDuplicate,
      rows_unmapped: rowsUnmapped,
      errors,
    };
  }

  /**
   * 2. Build attendance_days from shifts, policies, punches, holidays & leave
   */
  async buildAttendanceDays({ companyId, startDate, endDate, employeeId = null }) {
    const fromDubai = toDubaiDateString(startDate);
    const toDubai = toDubaiDateString(endDate);

    const empFilter = { company_id: companyId };
    if (employeeId) empFilter.id = employeeId;

    const employees = await prisma.$base().employees.findMany({
      where: empFilter,
      include: {
        contracts: {
          include: {
            shift: true,
            attendance_policy: {
              include: { penalty_steps: true },
            },
          },
          orderBy: { effective_date: 'desc' },
        },
      },
    });

    // Load public holidays in range
    const publicHolidays = await prisma.$base().public_holidays.findMany({
      where: {
        company_id: companyId,
        holiday_date: {
          gte: new Date(fromDubai),
          lte: new Date(toDubai),
        },
      },
    });

    // Load approved leave requests in range
    const approvedLeaves = await prisma.$base().leave_requests.findMany({
      where: {
        company_id: companyId,
        status: 'Approved',
        date_from: { lte: new Date(toDubai) },
        date_to: { gte: new Date(fromDubai) },
      },
      include: { leave_type: true },
    });

    // Generate list of dates between fromDubai and toDubai
    const dateList = [];
    const curDate = new Date(fromDubai + 'T00:00:00Z');
    const endDateUtc = new Date(toDubai + 'T00:00:00Z');
    while (curDate <= endDateUtc) {
      dateList.push(curDate.toISOString().slice(0, 10));
      curDate.setUTCDate(curDate.getUTCDate() + 1);
    }

    let generatedCount = 0;

    for (const emp of employees) {
      if (!emp.contracts || emp.contracts.length === 0) continue;

      for (const dateStr of dateList) {
        const { startUtc, endUtc } = getDubaiDayBounds(dateStr);
        const dayDate = new Date(dateStr);

        // Find active contract on this date
        const activeContract = emp.contracts.find((c) => new Date(c.effective_date) <= dayDate) || emp.contracts[0];
        const shift = activeContract.shift;
        const policy = activeContract.attendance_policy;
        if (!shift) continue;

        // Check if existing attendance day is already HR-confirmed (do not overwrite confirmed history)
        const existingDay = await prisma.$base().attendance_days.findUnique({
          where: {
            employee_id_work_date: {
              employee_id: emp.id,
              work_date: dayDate,
            },
          },
        });

        if (existingDay && existingDay.review_status === 'HrConfirmed') {
          continue; // Immutable once confirmed by HR
        }

        // Determine if shift is overnight
        const isOvernight = isOvernightShift(shift.start_time, shift.end_time);
        let punchWindowStart = startUtc;
        let punchWindowEnd = endUtc;

        if (isOvernight) {
          // Window covers from start time on day to next day end time
          punchWindowEnd = new Date(endUtc.getTime() + 12 * 3600 * 1000);
        }

        // Fetch punches for this employee in the shift window
        const punches = await prisma.$base().punches.findMany({
          where: {
            employee_id: emp.id,
            punched_at: { gte: punchWindowStart, lte: punchWindowEnd },
          },
          orderBy: { punched_at: 'asc' },
        });

        // 1. Check Public Holiday
        const holiday = publicHolidays.find((h) => {
          const hStr = toDubaiDateString(h.holiday_date);
          const branchMatch = !h.branch_id || h.branch_id === emp.branch_id;
          return hStr === dateStr && branchMatch;
        });

        // 2. Check Weekly Off
        const dubaiDayOfWeek = new Date(dayDate.getTime() + 4 * 3600000).getUTCDay(); // 0 = Sun, 6 = Sat
        const isWeeklyOff = shift.weekly_off_days ? shift.weekly_off_days.includes(dubaiDayOfWeek) : false;

        // 3. Check Approved Leave
        const leave = approvedLeaves.find((l) => {
          if (l.employee_id !== emp.id) return false;
          const fromStr = toDubaiDateString(l.date_from);
          const toStr = toDubaiDateString(l.date_to);
          return dateStr >= fromStr && dateStr <= toStr;
        });

        let dayType = 'WorkDay';
        let publicHolidayId = null;
        let leaveRequestId = null;
        let payBand = null;
        const exceptionCodes = [];

        if (holiday) {
          dayType = 'PublicHoliday';
          publicHolidayId = holiday.id;
        } else if (leave) {
          dayType = 'Leave';
          leaveRequestId = leave.id;
          payBand = leave.leave_type?.is_paid ? 'Full' : 'None';
        } else if (isWeeklyOff) {
          dayType = 'WeeklyOff';
        }

        let checkIn = null;
        let checkOut = null;
        let workedHours = new Decimal(0);
        let breakDeducted = new Decimal(0);
        let netHours = new Decimal(0);
        let lateMinutes = 0;
        let earlyOutMinutes = 0;
        let latePenaltyDays = new Decimal(0);

        if (punches.length > 0) {
          checkIn = punches[0].punched_at;
          if (punches.length > 1) {
            checkOut = punches[punches.length - 1].punched_at;
          }

          // Work on Rest Day or Public Holiday
          if (dayType === 'WeeklyOff') {
            dayType = 'RestDayWork';
            exceptionCodes.push('REST_DAY_WORK');
          } else if (dayType === 'PublicHoliday') {
            dayType = 'HolidayWork';
            exceptionCodes.push('HOLIDAY_WORK');
          }

          if (checkIn && checkOut) {
            const calculated = calculateWorkedHours(checkIn, checkOut, shift.break_minutes || 60);
            workedHours = new Decimal(calculated.workedHours);
            breakDeducted = new Decimal(calculated.breakDeducted);
            netHours = new Decimal(calculated.netHours);

            // Calculate Late Minutes (Dubai local time comparison)
            const inTimeStr = toDubaiTimeString(checkIn);
            const inMin = timeStringToMinutes(inTimeStr);
            const shiftStartMin = timeStringToMinutes(shift.start_time);
            const graceMin = shift.grace_minutes || policy?.late_grace_minutes || 15;

            // Punch exactly at the grace limit is NOT late
            if (inMin > (shiftStartMin + graceMin)) {
              lateMinutes = inMin - shiftStartMin;
              exceptionCodes.push('LATE');
            }

            // Calculate Early Out Minutes
            const outTimeStr = toDubaiTimeString(checkOut);
            const outMin = timeStringToMinutes(outTimeStr);
            const shiftEndMin = timeStringToMinutes(shift.end_time);
            const earlyGraceMin = policy?.early_out_grace_minutes || 15;

            if (outMin < (shiftEndMin - earlyGraceMin) && !isOvernight) {
              earlyOutMinutes = shiftEndMin - outMin;
              exceptionCodes.push('EARLY_OUT');
            }

            // Apply penalty steps from policy if late
            if (lateMinutes > 0 && policy?.penalty_steps) {
              const lateSteps = policy.penalty_steps
                .filter((s) => s.applies_to === 'Late')
                .sort((a, b) => a.occurrence_from - b.occurrence_from);

              if (lateSteps.length > 0) {
                // Find occurrence count this month
                const monthStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), 1);
                const priorLates = await prisma.$base().attendance_days.count({
                  where: {
                    employee_id: emp.id,
                    work_date: { gte: monthStart, lt: dayDate },
                    late_minutes: { gt: 0 },
                  },
                });
                const occurrenceNo = priorLates + 1;
                const matchedStep = lateSteps.reverse().find((s) => occurrenceNo >= s.occurrence_from) || lateSteps[0];
                if (matchedStep && matchedStep.penalty_type === 'DeductionDays') {
                  latePenaltyDays = new Decimal(matchedStep.penalty_value);
                }
              }
            }
          } else {
            // Only 1 punch: check-in without check-out
            exceptionCodes.push('MISSING_PUNCH');
          }
        } else {
          // Zero punches
          if (dayType === 'WorkDay') {
            exceptionCodes.push('ABSENT');
          }
          // Note: PublicHoliday is NEVER counted as absence!
        }

        // Upsert attendance_days
        const attendanceDay = await prisma.$base().attendance_days.upsert({
          where: {
            employee_id_work_date: {
              employee_id: emp.id,
              work_date: dayDate,
            },
          },
          create: {
            company_id: companyId,
            employee_id: emp.id,
            work_date: dayDate,
            shift_id: shift.id,
            check_in: checkIn,
            check_out: checkOut,
            worked_hours: workedHours,
            break_deducted: breakDeducted,
            net_hours: netHours,
            late_minutes: lateMinutes,
            early_out_minutes: earlyOutMinutes,
            late_penalty_days: latePenaltyDays,
            day_type: dayType,
            public_holiday_id: publicHolidayId,
            leave_request_id: leaveRequestId,
            pay_band: payBand,
            exception_codes: exceptionCodes,
            review_status: 'Open',
          },
          update: {
            shift_id: shift.id,
            check_in: checkIn,
            check_out: checkOut,
            worked_hours: workedHours,
            break_deducted: breakDeducted,
            net_hours: netHours,
            late_minutes: lateMinutes,
            early_out_minutes: earlyOutMinutes,
            late_penalty_days: latePenaltyDays,
            day_type: dayType,
            public_holiday_id: publicHolidayId,
            leave_request_id: leaveRequestId,
            pay_band: payBand,
            exception_codes: exceptionCodes,
          },
        });

        // 3. Overtime detection: hours above shift and above policy's minimum minutes
        if (checkIn && checkOut && (policy?.ot_eligible ?? true)) {
          const shiftDuration = (timeStringToMinutes(shift.end_time) - timeStringToMinutes(shift.start_time) - (shift.break_minutes || 60)) / 60;
          const excessHours = netHours.toNumber() - shiftDuration;
          const minOtHours = (policy?.ot_min_minutes || 30) / 60;

          if (excessHours >= minOtHours) {
            // Split night hours
            const split = splitOvertimeHours(checkOut, new Date(dayDate.toISOString().slice(0, 10) + 'T' + shift.end_time + 'Z'), policy?.night_start, policy?.night_end);
            const hourlyRate = activeContract.basic.toNumber() / 30 / 8;

            if (split.nightHours > 0) {
              await prisma.$base().overtime_requests.upsert({
                where: { id: `${attendanceDay.id}_night` },
                create: {
                  id: `${attendanceDay.id}_night`,
                  company_id: companyId,
                  employee_id: emp.id,
                  attendance_day_id: attendanceDay.id,
                  work_date: dayDate,
                  hours: new Decimal(split.nightHours),
                  ot_type: 'OT_NIGHT',
                  rate: new Decimal((hourlyRate * 1.5).toFixed(4)),
                  source: 'Attendance',
                  status: 'Pending',
                },
                update: {
                  hours: new Decimal(split.nightHours),
                  rate: new Decimal((hourlyRate * 1.5).toFixed(4)),
                },
              }).catch(() => {});
            }

            if (split.normalHours > 0) {
              await prisma.$base().overtime_requests.upsert({
                where: { id: `${attendanceDay.id}_normal` },
                create: {
                  id: `${attendanceDay.id}_normal`,
                  company_id: companyId,
                  employee_id: emp.id,
                  attendance_day_id: attendanceDay.id,
                  work_date: dayDate,
                  hours: new Decimal(split.normalHours),
                  ot_type: 'OT_NORMAL',
                  rate: new Decimal((hourlyRate * 1.25).toFixed(4)),
                  source: 'Attendance',
                  status: 'Pending',
                },
                update: {
                  hours: new Decimal(split.normalHours),
                  rate: new Decimal((hourlyRate * 1.25).toFixed(4)),
                },
              }).catch(() => {});
            }
          }
        }

        generatedCount++;
      }
    }

    return { generated_days: generatedCount };
  }

  /**
   * 3. Daily Attendance Grid (employees x days)
   */
  async getAttendanceGrid({ companyId, month, departmentId, branchId, search }) {
    const monthKey = month || toDubaiDateString(new Date()).slice(0, 7);
    const [y, m] = monthKey.split('-').map(Number);
    const startOfMonth = new Date(Date.UTC(y, m - 1, 1));
    const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59));

    const whereEmp = { company_id: companyId, status: { in: ['Active', 'New Joined'] } };
    if (departmentId) whereEmp.department_id = departmentId;
    if (branchId) whereEmp.branch_id = branchId;
    if (search) {
      whereEmp.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { employee_code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const employees = await prisma.$base().employees.findMany({
      where: whereEmp,
      select: {
        id: true,
        employee_code: true,
        name: true,
        arabic_name: true,
        branch: { select: { id: true, name: true } },
        contracts: {
          take: 1,
          orderBy: { effective_date: 'desc' },
          select: {
            department: { select: { id: true, name: true } },
            shift: { select: { id: true, name: true, start_time: true, end_time: true } },
          },
        },
      },
      orderBy: { employee_code: 'asc' },
    });

    const attendanceDays = await prisma.$base().attendance_days.findMany({
      where: {
        company_id: companyId,
        work_date: { gte: startOfMonth, lte: endOfMonth },
        employee_id: { in: employees.map((e) => e.id) },
      },
      include: {
        shift: { select: { name: true, start_time: true, end_time: true } },
        leave_request: { select: { leave_type: { select: { name: true, code: true } } } },
        public_holiday: { select: { name: true } },
      },
    });

    const grid = employees.map((emp) => {
      const empDays = attendanceDays.filter((d) => d.employee_id === emp.id);
      return {
        employee: {
          id: emp.id,
          employee_code: emp.employee_code,
          name: emp.name,
          arabic_name: emp.arabic_name,
          department: emp.contracts[0]?.department?.name || 'Unassigned',
          shift: emp.contracts[0]?.shift?.name || 'Standard',
        },
        days: empDays.map((d) => ({
          id: d.id,
          date: toDubaiDateString(d.work_date),
          day_type: d.day_type,
          check_in: d.check_in,
          check_out: d.check_out,
          worked_hours: d.worked_hours,
          net_hours: d.net_hours,
          late_minutes: d.late_minutes,
          early_out_minutes: d.early_out_minutes,
          exception_codes: d.exception_codes,
          review_status: d.review_status,
          pay_band: d.pay_band,
          leave_name: d.leave_request?.leave_type?.name,
          holiday_name: d.public_holiday?.name,
        })),
        summary: {
          present_days: empDays.filter((d) => ['WorkDay', 'RestDayWork', 'HolidayWork'].includes(d.day_type) && d.check_in).length,
          absent_days: empDays.filter((d) => d.day_type === 'WorkDay' && d.exception_codes.includes('ABSENT')).length,
          late_days: empDays.filter((d) => d.late_minutes > 0).length,
          leave_days: empDays.filter((d) => d.day_type === 'Leave').length,
          missing_punches: empDays.filter((d) => d.exception_codes.includes('MISSING_PUNCH')).length,
          total_hours: empDays.reduce((acc, d) => acc + Number(d.net_hours || 0), 0).toFixed(2),
        },
      };
    });

    return { month: monthKey, grid };
  }

  /**
   * 4. Manual Cell Edit with Audit Reason
   */
  async editAttendanceDay({ companyId, id, data, userId }) {
    if (!data.edit_reason) {
      const err = new Error('Mandatory audit reason required to edit attendance cell');
      err.status = 400;
      err.code = 'REASON_REQUIRED';
      throw err;
    }

    const day = await prisma.$base().attendance_days.findFirst({
      where: { id, company_id: companyId },
    });
    if (!day) {
      const err = new Error('Attendance day not found');
      err.status = 404;
      throw err;
    }

    if (day.review_status === 'HrConfirmed') {
      const err = new Error('Cannot edit HR-confirmed attendance day');
      err.status = 400;
      err.code = 'ALREADY_HR_CONFIRMED';
      throw err;
    }

    const updated = await prisma.$base().attendance_days.update({
      where: { id },
      data: {
        check_in: data.check_in ? new Date(data.check_in) : day.check_in,
        check_out: data.check_out ? new Date(data.check_out) : day.check_out,
        day_type: data.day_type || day.day_type,
        edit_reason: data.edit_reason,
        exception_codes: data.exception_codes !== undefined ? data.exception_codes : day.exception_codes,
      },
    });

    await auditService.record({
      companyId,
      userId,
      action: 'UPDATE',
      tableName: 'attendance_days',
      recordId: id,
      oldValues: { check_in: day.check_in, check_out: day.check_out, day_type: day.day_type },
      newValues: { check_in: updated.check_in, check_out: updated.check_out, day_type: updated.day_type, reason: data.edit_reason },
    });

    return updated;
  }

  /**
   * 5. Missing Punch Queue
   */
  async getMissingPunchQueue({ companyId, month }) {
    const monthKey = month || toDubaiDateString(new Date()).slice(0, 7);
    const [y, m] = monthKey.split('-').map(Number);
    const startOfMonth = new Date(Date.UTC(y, m - 1, 1));
    const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59));

    return prisma.$base().attendance_days.findMany({
      where: {
        company_id: companyId,
        work_date: { gte: startOfMonth, lte: endOfMonth },
        exception_codes: { has: 'MISSING_PUNCH' },
      },
      include: {
        employee: { select: { id: true, name: true, employee_code: true } },
        shift: { select: { name: true, start_time: true, end_time: true } },
      },
      orderBy: { work_date: 'asc' },
    });
  }

  /**
   * 6. Resolve Missing Punch
   */
  async resolveMissingPunch({ companyId, id, checkIn, checkOut, reason, userId }) {
    if (!reason) {
      const err = new Error('A mandatory reason is required to resolve a missing punch');
      err.status = 400;
      err.code = 'REASON_REQUIRED';
      throw err;
    }

    const day = await prisma.$base().attendance_days.findFirst({
      where: { id, company_id: companyId },
      include: { shift: true },
    });
    if (!day) {
      const err = new Error('Attendance day not found');
      err.status = 404;
      throw err;
    }

    const newCheckIn = checkIn ? new Date(checkIn) : day.check_in;
    const newCheckOut = checkOut ? new Date(checkOut) : day.check_out;

    if (!newCheckIn || !newCheckOut) {
      const err = new Error('Both check-in and check-out must be populated to resolve missing punch');
      err.status = 400;
      err.code = 'INCOMPLETE_PUNCHES';
      throw err;
    }

    const calculated = calculateWorkedHours(newCheckIn, newCheckOut, day.shift?.break_minutes || 60);
    const filteredExceptions = day.exception_codes.filter((c) => c !== 'MISSING_PUNCH');

    const updated = await prisma.$base().attendance_days.update({
      where: { id },
      data: {
        check_in: newCheckIn,
        check_out: newCheckOut,
        worked_hours: new Decimal(calculated.workedHours),
        break_deducted: new Decimal(calculated.breakDeducted),
        net_hours: new Decimal(calculated.netHours),
        exception_codes: filteredExceptions,
        edit_reason: reason,
      },
    });

    await auditService.record({
      companyId,
      userId,
      action: 'UPDATE',
      tableName: 'attendance_days',
      recordId: id,
      oldValues: { check_in: day.check_in, check_out: day.check_out, exceptions: day.exception_codes },
      newValues: { check_in: newCheckIn, check_out: newCheckOut, exceptions: filteredExceptions, reason },
    });

    return updated;
  }

  /**
   * 7. Monthly Attendance Review: Manager Confirmation
   */
  async confirmManager({ companyId, departmentId, month, userId }) {
    const monthKey = month || toDubaiDateString(new Date()).slice(0, 7);
    const [y, m] = monthKey.split('-').map(Number);
    const startOfMonth = new Date(Date.UTC(y, m - 1, 1));
    const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59));

    // Get employees in department
    const empWhere = { company_id: companyId };
    if (departmentId) {
      empWhere.contracts = { some: { department_id: departmentId } };
    }
    const empIds = (await prisma.$base().employees.findMany({ where: empWhere, select: { id: true } })).map((e) => e.id);

    const result = await prisma.$base().attendance_days.updateMany({
      where: {
        company_id: companyId,
        employee_id: { in: empIds },
        work_date: { gte: startOfMonth, lte: endOfMonth },
        review_status: 'Open',
      },
      data: {
        review_status: 'ManagerConfirmed',
        manager_confirmed_by: sanitizeUuid(userId),
        manager_confirmed_at: new Date(),
      },
    });

    return { confirmed_count: result.count, status: 'ManagerConfirmed' };
  }

  /**
   * 8. Monthly Attendance Review: HR Confirmation (Ready for Payroll)
   */
  async confirmHR({ companyId, month, userId }) {
    const monthKey = month || toDubaiDateString(new Date()).slice(0, 7);
    const [y, m] = monthKey.split('-').map(Number);
    const startOfMonth = new Date(Date.UTC(y, m - 1, 1));
    const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59));

    const result = await prisma.$base().attendance_days.updateMany({
      where: {
        company_id: companyId,
        work_date: { gte: startOfMonth, lte: endOfMonth },
        review_status: 'ManagerConfirmed',
      },
      data: {
        review_status: 'HrConfirmed',
        hr_confirmed_by: sanitizeUuid(userId),
        hr_confirmed_at: new Date(),
      },
    });

    return { confirmed_count: result.count, status: 'HrConfirmed' };
  }
}

export default new AttendanceService();
