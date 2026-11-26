import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { safeFileUpload as upload, bulkChunkUpload, validateChunkTotalSize } from '../middleware/fileUpload.js';
import meController from '../controllers/meController.js';

const router = Router();
router.use(authenticate);

// 1. My Home Bento Overview
router.get('/home', meController.getMyHome);

// 2. My Profile (view-only with masked sensitive fields)
router.get('/profile', meController.getMyProfile);

// 3. My Attendance (Month calendar & missing punch)
router.get('/attendance', meController.getMyAttendance);

// 4. My Leave Balance & accrual history
router.get('/leave', meController.getMyLeave);

// 5. My Requests (Combined requests list, submit, cancel)
router.get('/requests', meController.getMyRequests);
router.post('/requests', meController.submitMyRequest);
router.post('/requests/:type/:id/cancel', meController.cancelMyRequest);
router.delete('/requests/:type/:id', meController.cancelMyRequest);

// 6. My Payslips (Only Paid pay runs, details, PDF stream)
router.get('/payslips', meController.getMyPayslips);
router.get('/payslips/:id', meController.getMyPayslipById);
router.get('/payslips/:id/pdf', meController.getMyPayslipPdf);

// 7. My Documents (View, upload renewed, and download)
router.get('/documents', meController.getMyDocuments);
router.post('/documents', upload.single('file'), meController.uploadMyDocument);
router.post('/documents/bulk-upload', bulkChunkUpload.array('files', 5), validateChunkTotalSize, meController.bulkUploadMyDocuments);
router.get('/documents/:id/download', meController.downloadMyDocument);

// 8. My Rejected Requests (Self-service personal rejection trail)
router.get('/rejections', meController.getMyRejections);

export default router;
