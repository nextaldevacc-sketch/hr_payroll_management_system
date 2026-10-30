/**
 * Seed Module: Attendance & Overtime
 */
export async function seedAttendance(prisma, {
  company1,
  seededEmployees,
  shift1,
  demoUsersMap,
  leaveTypesMap1,
}) {
  console.log('Seeding September & October 2026 biometric punches and attendance records...');
  const userHR1 = demoUsersMap['hr.mgr@gulftech.ae'];

  // =========================================================================
  // September 2026 Attendance, OT and Leave (Real inputs for September)
  // 39 active employees (October joiners 40, 41, 42 not joined yet)
  // =========================================================================
  const septBioImport = await prisma.biometric_imports.create({
    data: {
      company_id: company1.id,
      period_from: new Date('2026-09-01'),
      period_to: new Date('2026-09-30'),
      rows_total: 39 * 22 * 2,
      rows_imported: 39 * 22 * 2,
      rows_duplicate: 0,
      rows_unmapped: 0,
      imported_by: userHR1.id,
    },
  });

  const septPunchesBatch = [];
  const septAttendanceBatch = [];

  for (let d = 1; d <= 30; d++) {
    const workDate = new Date(`2026-09-${String(d).padStart(2, '0')}`);
    const dayOfWeek = workDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday & Saturday

    if (isWeekend) continue;

    for (let e = 0; e < 39; e++) {
      const emp = seededEmployees[e];

      // One employee on unpaid leave in September: employee index 6 (Kareem Abdelaziz) from Sep 14 to Sep 18 (5 days)
      if (e === 6 && d >= 14 && d <= 18) {
        septAttendanceBatch.push({
          company_id: company1.id,
          employee_id: emp.id,
          work_date: workDate,
          shift_id: shift1.id,
          check_in: null,
          check_out: null,
          worked_hours: 0.00,
          break_deducted: 0.00,
          net_hours: 0.00,
          late_minutes: 0,
          early_out_minutes: 0,
          day_type: 'UnpaidLeave',
          review_status: 'HRConfirmed',
        });
        continue;
      }

      // Normal working day
      const inTime = new Date(workDate);
      inTime.setHours(8, 0, 0);
      const outTime = new Date(workDate);
      outTime.setHours(17, 0, 0);

      septPunchesBatch.push({
        company_id: company1.id,
        import_id: septBioImport.id,
        employee_id: emp.id,
        punched_at: inTime,
        direction: 'In',
      });
      septPunchesBatch.push({
        company_id: company1.id,
        import_id: septBioImport.id,
        employee_id: emp.id,
        punched_at: outTime,
        direction: 'Out',
      });

      septAttendanceBatch.push({
        company_id: company1.id,
        employee_id: emp.id,
        work_date: workDate,
        shift_id: shift1.id,
        check_in: inTime,
        check_out: outTime,
        worked_hours: 9.00,
        break_deducted: 1.00,
        net_hours: 8.00,
        late_minutes: 0,
        early_out_minutes: 0,
        day_type: 'WorkDay',
        review_status: 'HRConfirmed',
      });
    }
  }

  for (let i = 0; i < septPunchesBatch.length; i += 500) {
    await prisma.punches.createMany({ data: septPunchesBatch.slice(i, i + 500) });
  }
  for (let i = 0; i < septAttendanceBatch.length; i += 500) {
    await prisma.attendance_days.createMany({ data: septAttendanceBatch.slice(i, i + 500) });
  }

  // September Overtime Requests (different from October)
  await prisma.overtime_requests.create({
    data: {
      company_id: company1.id,
      employee_id: seededEmployees[0].id,
      work_date: new Date('2026-09-10'),
      hours: 15.00,
      source: 'Attendance',
      ot_type: 'Normal',
      rate: 1.2500,
      compensation: 'Pay',
      status: 'Approved',
    },
  });

  await prisma.overtime_requests.create({
    data: {
      company_id: company1.id,
      employee_id: seededEmployees[1].id,
      work_date: new Date('2026-09-16'),
      hours: 10.00,
      source: 'Attendance',
      ot_type: 'Night',
      rate: 1.5000,
      compensation: 'Pay',
      status: 'Approved',
    },
  });

  // September Unpaid Leave Request for Employee 7 (index 6)
  await prisma.leave_requests.create({
    data: {
      company_id: company1.id,
      employee_id: seededEmployees[6].id,
      leave_type_id: leaveTypesMap1['UNPAID'].id,
      date_from: new Date('2026-09-14'),
      date_to: new Date('2026-09-18'),
      days: 5.00,
      reason: 'Personal family emergency (unpaid leave)',
      status: 'Approved',
    },
  });

  // =========================================================================
  // October 2026 Attendance, OT and Leave
  // UAE Working Days: Sun-Thu (Weekend: Fri-Sat)
  // Working days in Oct 2026: Oct 1(Thu), 4-8(Sun-Thu), 11-15(Sun-Thu), 18-22(Sun-Thu), 25-29(Sun-Thu) = 21 working days
  // =========================================================================
  const octWorkingDays = [
    1,
    4, 5, 6, 7, 8,
    11, 12, 13, 14, 15,
    18, 19, 20, 21, 22,
    25, 26, 27, 28, 29,
  ]; // Exactly 21 UAE working days

  const regularEmployees = seededEmployees.slice(0, 39); // 39 regular employees (not Oct joiners 40, 41, 42)
  const totalExpectedPunches = (regularEmployees.length * octWorkingDays.length - 2) * 2; // Emp 8 & 9 absent on Oct 22

  const bioImport = await prisma.biometric_imports.create({
    data: {
      company_id: company1.id,
      period_from: new Date('2026-10-01'),
      period_to: new Date('2026-10-31'),
      rows_total: totalExpectedPunches,
      rows_imported: totalExpectedPunches,
      rows_duplicate: 0,
      rows_unmapped: 0,
      imported_by: userHR1.id,
    },
  });

  const punchesBatch = [];
  const attendanceBatch = [];

  for (const d of octWorkingDays) {
    const workDate = new Date(`2026-10-${String(d).padStart(2, '0')}`);

    for (let e = 0; e < regularEmployees.length; e++) {
      const emp = regularEmployees[e];

      // Emp 8 and Emp 9 on Oct 22: Unapproved Absences (HR Confirmed)
      if ((e === 8 || e === 9) && d === 22) {
        attendanceBatch.push({
          company_id: company1.id,
          employee_id: emp.id,
          work_date: workDate,
          shift_id: shift1.id,
          check_in: null,
          check_out: null,
          worked_hours: 0.00,
          break_deducted: 0.00,
          net_hours: 0.00,
          late_minutes: 0,
          early_out_minutes: 0,
          day_type: 'Absence',
          review_status: 'HRConfirmed',
        });
        continue;
      }

      // Normal working day (08:00 to 17:00)
      const inTime = new Date(workDate);
      inTime.setHours(8, 0, 0);
      const outTime = new Date(workDate);
      outTime.setHours(17, 0, 0);

      punchesBatch.push({
        company_id: company1.id,
        import_id: bioImport.id,
        employee_id: emp.id,
        punched_at: inTime,
        direction: 'In',
      });

      punchesBatch.push({
        company_id: company1.id,
        import_id: bioImport.id,
        employee_id: emp.id,
        punched_at: outTime,
        direction: 'Out',
      });

      attendanceBatch.push({
        company_id: company1.id,
        employee_id: emp.id,
        work_date: workDate,
        shift_id: shift1.id,
        check_in: inTime,
        check_out: outTime,
        worked_hours: 9.00,
        break_deducted: 1.00,
        net_hours: 8.00,
        late_minutes: 0,
        early_out_minutes: 0,
        day_type: 'WorkDay',
        review_status: 'HRConfirmed',
      });
    }
  }

  // Insert batches
  for (let i = 0; i < punchesBatch.length; i += 500) {
    await prisma.punches.createMany({ data: punchesBatch.slice(i, i + 500) });
  }
  for (let i = 0; i < attendanceBatch.length; i += 500) {
    await prisma.attendance_days.createMany({ data: attendanceBatch.slice(i, i + 500) });
  }

  // Overtime Requests (Matching 196 hours)
  console.log('Seeding overtime requests...');
  await prisma.overtime_requests.create({
    data: {
      company_id: company1.id,
      employee_id: seededEmployees[0].id,
      work_date: new Date('2026-10-12'),
      hours: 110.00,
      source: 'Attendance',
      ot_type: 'Normal',
      rate: 1.2500,
      compensation: 'Pay',
      status: 'Approved',
    },
  });

  await prisma.overtime_requests.create({
    data: {
      company_id: company1.id,
      employee_id: seededEmployees[1].id,
      work_date: new Date('2026-10-14'),
      hours: 42.00,
      source: 'Attendance',
      ot_type: 'Night',
      rate: 1.5000,
      compensation: 'Pay',
      status: 'Approved',
    },
  });

  await prisma.overtime_requests.create({
    data: {
      company_id: company1.id,
      employee_id: seededEmployees[2].id,
      work_date: new Date('2026-10-18'),
      hours: 20.00,
      source: 'Attendance',
      ot_type: 'RestDay',
      rate: 1.5000,
      compensation: 'Pay',
      status: 'Approved',
    },
  });

  await prisma.overtime_requests.create({
    data: {
      company_id: company1.id,
      employee_id: seededEmployees[3].id,
      work_date: new Date('2026-10-20'),
      hours: 24.00,
      source: 'Attendance',
      ot_type: 'Holiday',
      rate: 1.5000,
      compensation: 'Pay',
      status: 'Approved',
    },
  });

  // Sample Leave Requests
  console.log('Seeding sample leave requests...');
  await prisma.leave_requests.create({
    data: {
      company_id: company1.id,
      employee_id: seededEmployees[4].id,
      leave_type_id: leaveTypesMap1['ANNUAL'].id,
      date_from: new Date('2026-10-26'),
      date_to: new Date('2026-10-30'),
      days: 5.00,
      reason: 'Annual family leave',
      status: 'Approved',
    },
  });

  await prisma.leave_requests.create({
    data: {
      company_id: company1.id,
      employee_id: seededEmployees[8].id,
      leave_type_id: leaveTypesMap1['SICK_FULL'].id,
      date_from: new Date('2026-10-22'),
      date_to: new Date('2026-10-23'),
      days: 2.00,
      reason: 'Seasonal flu',
      status: 'Approved',
    },
  });

  return {
    bioImport,
  };
}

export default seedAttendance;
