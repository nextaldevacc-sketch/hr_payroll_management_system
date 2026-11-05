import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger.js';
import { companyContextMiddleware } from './middleware/companyContext.js';
import { errorHandler } from './middleware/errorHandler.js';
import prisma from './lib/prisma.js';
import auditService from './services/auditService.js';

// Route modules
import authRoutes from './routes/auth.js';
import platformRoutes from './routes/platform.js';
import usersRoutes from './routes/users.js';
import approvalsRoutes from './routes/approvals.js';
import employeesRoutes from './routes/employees.js';
import payrollRoutes from './routes/payroll.js';
import settingsRoutes from './routes/settings.js';
import attendanceRoutes from './routes/attendance.js';
import overtimeRoutes from './routes/overtime.js';
import leaveRoutes from './routes/leave.js';
import meRoutes from './routes/me.js';
import notificationsRoutes from './routes/notifications.js';
import dashboardRoutes from './routes/dashboard.js';
import separationsRoutes from './routes/separations.js';
import separationTasksRoutes from './routes/separationTasks.js';
import settlementsRoutes from './routes/settlements.js';
import complianceRoutes from './routes/compliance.js';
import reportsRoutes from './routes/reports.js';
import auditRoutes from './routes/audit.js';
import jobsRoutes from './routes/jobs.js';

const app = express();

// 1. Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows Swagger UI to load its assets
  })
);

// 2. CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      if (process.env.CORS_ORIGIN && origin === process.env.CORS_ORIGIN) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Company-Id', 'X-Platform-Admin', 'Cookie'],
  })
);

// 3. Cookie parser
app.use(cookieParser());

// 4. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX ? Number(process.env.RATE_LIMIT_MAX) : (process.env.NODE_ENV === 'test' ? 10000 : 500),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});
app.use(limiter);

// 5. JSON body parser
app.use(express.json({ limit: '10mb' }));

// 6. Company context middleware
app.use(companyContextMiddleware);

// 7. Swagger API Documentation at /api/docs
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Nextal HR & Payroll API Documentation',
  })
);

// 8. Health Check at /api/v1/health and /health
app.get(['/health', '/api/v1/health'], async (req, res, next) => {
  try {
    // Ping PostgreSQL through raw query
    await prisma.$base().$queryRaw`SELECT 1`;

    const tableCountResult = await prisma.$base().$queryRaw`
      SELECT COUNT(*)::int as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name != '_prisma_migrations';
    `;
    const tableCount = tableCountResult[0]?.count || 0;

    res.json({
      status: 'ok',
      service: 'Nextal HR & Payroll API',
      version: '1.0.0',
      database: 'connected',
      tables_count: tableCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      service: 'Nextal HR & Payroll API',
      version: '1.0.0',
      database: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// 9. API Modules
app.use('/api/v1/auth', authRoutes);
if (process.env.FEATURE_PLATFORM_ADMIN === 'true') {
  app.use('/api/v1/platform', platformRoutes);
} else {
  app.use('/api/v1/platform', (req, res) => {
    res.status(404).json({
      status: 'error',
      code: 'NOT_FOUND',
      message: 'Platform administration is disabled in this release (Phase 2)',
    });
  });
}
app.use('/api/v1/company', usersRoutes);
app.use('/api/v1', usersRoutes);
app.use('/api/v1/approvals', approvalsRoutes);
app.use('/api/v1/employees', employeesRoutes);
app.use('/api/v1/payroll', payrollRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/overtime', overtimeRoutes);
app.use('/api/v1/leave', leaveRoutes);
app.use('/api/v1/me', meRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/separations', separationsRoutes);
app.use('/api/v1/separation-tasks', separationTasksRoutes);
app.use('/api/v1/settlements', settlementsRoutes);
app.use('/api/v1/compliance', complianceRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/jobs', jobsRoutes);

// 11. Centralized Error Handler
app.use(errorHandler);

export default app;
