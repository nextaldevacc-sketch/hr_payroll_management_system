import { Router } from 'express';
import { safeFileUpload as upload } from '../middleware/fileUpload.js';
import { authenticate } from '../middleware/auth.js';
import attendanceController from '../controllers/attendanceController.js';

const router = Router();
router.use(authenticate);

function authorizeAttendance(allowedRoles = []) {
  return (req, res, next) => {
    const roles = req.user.roles || [];
    if (roles.includes('COMPANY_ADMIN')) return next();
    const hasRole = roles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'Permission Denied: Insufficient permissions for attendance operations',
      });
    }
    next();
  };
}

// 1. Daily Grid
router.get(
  '/grid',
  authorizeAttendance(['HR_MANAGER', 'HR_OFFICER', 'DEPT_MANAGER', 'COMPANY_ADMIN']),
  attendanceController.getAttendanceGrid
);

// 2. Biometric Import
router.post(
  '/import',
  authorizeAttendance(['HR_MANAGER', 'HR_OFFICER', 'COMPANY_ADMIN']),
  upload.single('file'),
  attendanceController.importBiometric
);

// 3. Cell Edit
router.put(
  '/days/:id',
  authorizeAttendance(['HR_MANAGER', 'COMPANY_ADMIN']),
  attendanceController.editAttendanceDay
);

// 4. Missing Punch Queue
router.get(
  '/missing-punch',
  authorizeAttendance(['HR_MANAGER', 'HR_OFFICER', 'COMPANY_ADMIN']),
  attendanceController.getMissingPunchQueue
);

router.post(
  '/days/:id/resolve-missing-punch',
  authorizeAttendance(['HR_MANAGER', 'HR_OFFICER', 'COMPANY_ADMIN']),
  attendanceController.resolveMissingPunch
);

// 5. Attendance Review Sign-Off
router.post(
  '/review/manager-confirm',
  authorizeAttendance(['DEPT_MANAGER', 'HR_MANAGER', 'COMPANY_ADMIN']),
  attendanceController.confirmManager
);

router.post(
  '/review/hr-confirm',
  authorizeAttendance(['HR_MANAGER', 'HR_OFFICER', 'COMPANY_ADMIN']),
  attendanceController.confirmHR
);

// 6. Attendance Correction: Re-open Day (HR Manager only, mandatory reason, before cut-off / pay run locked)
router.post(
  '/days/:id/reopen',
  authorizeAttendance(['HR_MANAGER', 'COMPANY_ADMIN']),
  attendanceController.reopenAttendanceDay
);

export default router;
