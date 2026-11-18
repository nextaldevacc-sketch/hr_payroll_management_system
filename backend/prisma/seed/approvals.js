/**
 * Seed Module: Approvals & Rejections
 * Seeds pending approval requests for all operational roles and sample rejection audit logs
 */
export async function seedApprovals(prisma, { company1, demoUsersMap, seededEmployees, flowsMap1 }) {
  console.log('Seeding pending approval requests and rejection logs for Company 1...');

  // 1. Pending Request for HR_MANAGER: Verification of new employee
  const empVerif = seededEmployees[10];
  await prisma.approval_requests.create({
    data: {
      company_id: company1.id,
      flow_id: flowsMap1.verifFlow1.id,
      request_type: 'EMPLOYEE_VERIFICATION',
      record_id: empVerif.id,
      requested_by: demoUsersMap['hr.officer@gulftech.ae'].id,
      status: 'Pending',
      current_step: 1,
      payload: {
        employee_id: empVerif.id,
        employee_name: empVerif.name,
        title: `Verification of onboarding profile for ${empVerif.name}`,
      },
    },
  });

  // 2. Pending Request for HR_OFFICER: Leave Request step 2
  const empLeave = seededEmployees[4];
  const annualLeaveType = await prisma.leave_types.findFirst({
    where: { company_id: company1.id, code: 'ANNUAL' },
  });

  const leaveReq = await prisma.leave_requests.create({
    data: {
      company_id: company1.id,
      employee_id: empLeave.id,
      leave_type_id: annualLeaveType.id,
      date_from: new Date('2026-11-20'),
      date_to: new Date('2026-11-25'),
      days: 5.00,
      reason: 'Family trip to Abu Dhabi',
      status: 'Pending',
    },
  });

  await prisma.approval_requests.create({
    data: {
      company_id: company1.id,
      flow_id: flowsMap1.leaveFlow1.id,
      request_type: 'LEAVE',
      record_id: leaveReq.id,
      requested_by: demoUsersMap['employee@gulftech.ae'].id,
      status: 'Pending',
      current_step: 2, // Step 2 is HR_OFFICER
      payload: {
        employee_id: empLeave.id,
        employee_name: empLeave.name,
        title: `Annual Leave Request (5 Days) - ${empLeave.name}`,
      },
    },
  });

  // 3. Pending Request for GM: Flagged Leave Request step 3
  const empGm = seededEmployees[5];
  const leaveReqGm = await prisma.leave_requests.create({
    data: {
      company_id: company1.id,
      employee_id: empGm.id,
      leave_type_id: annualLeaveType.id,
      date_from: new Date('2026-12-01'),
      date_to: new Date('2026-12-15'),
      days: 14.00,
      reason: 'Extended pilgrimage leave',
      status: 'Pending',
    },
  });

  await prisma.approval_requests.create({
    data: {
      company_id: company1.id,
      flow_id: flowsMap1.leaveFlow1.id,
      request_type: 'LEAVE',
      record_id: leaveReqGm.id,
      requested_by: demoUsersMap['employee@gulftech.ae'].id,
      status: 'Pending',
      current_step: 3, // Step 3 is GM
      payload: {
        employee_id: empGm.id,
        employee_name: empGm.name,
        title: `Pilgrimage Leave (14 Days) - ${empGm.name}`,
      },
    },
  });

  // 4. Pending Request for COMPANY_ADMIN: Policy Governance / Executive Approval
  await prisma.approval_requests.create({
    data: {
      company_id: company1.id,
      flow_id: flowsMap1.adminGovFlow.id,
      request_type: 'POLICY_OVERRIDE',
      record_id: seededEmployees[6].id,
      requested_by: demoUsersMap['hr.mgr@gulftech.ae'].id,
      status: 'Pending',
      current_step: 1, // Step 1 is COMPANY_ADMIN
      payload: {
        employee_id: seededEmployees[6].id,
        employee_name: seededEmployees[6].name,
        title: `Executive Policy Override: Remote Work for ${seededEmployees[6].name}`,
      },
    },
  });

  // 5. Seed sample rejections in approval_rejections table
  await prisma.approval_rejections.createMany({
    data: [
      {
        company_id: company1.id,
        request_type: 'LEAVE',
        record_id: seededEmployees[7].id,
        record_title: `Annual Leave Request - ${seededEmployees[7].name}`,
        requester_id: demoUsersMap['employee@gulftech.ae'].id,
        rejected_by_id: demoUsersMap['hr.mgr@gulftech.ae'].id,
        step_no: 2,
        reason: 'Requested leave dates overlap with mandatory ISO audit period.',
        rejection_type: 'REJECT',
        rejection_date: new Date('2026-10-15'),
      },
      {
        company_id: company1.id,
        request_type: 'OVERTIME',
        record_id: seededEmployees[8].id,
        record_title: `Weekend Overtime 8h - ${seededEmployees[8].name}`,
        requester_id: demoUsersMap['employee@gulftech.ae'].id,
        rejected_by_id: demoUsersMap['dept.mgr@gulftech.ae'].id,
        step_no: 1,
        reason: 'Overtime budget quota for the logistics department has been reached.',
        rejection_type: 'REJECT',
        rejection_date: new Date('2026-10-18'),
      },
      {
        company_id: company1.id,
        request_type: 'EMPLOYEE_VERIFICATION',
        record_id: seededEmployees[9].id,
        record_title: `Onboarding Profile - ${seededEmployees[9].name}`,
        requester_id: demoUsersMap['hr.officer@gulftech.ae'].id,
        rejected_by_id: demoUsersMap['hr.mgr@gulftech.ae'].id,
        step_no: 1,
        reason: 'Emirates ID document copy is partially blurred and illegible.',
        rejection_type: 'SEND_BACK',
        rejection_date: new Date('2026-10-22'),
      },
    ],
  });

  console.log('Seeded 4 pending approval requests and 3 rejection audit records.');
}

export default seedApprovals;
