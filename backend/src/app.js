import express from 'express';
import crypto from 'node:crypto';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger.js';
import { companyContextMiddleware } from './middleware/companyContext.js';
import { csrfProtection } from './middleware/csrfProtection.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRateLimitMiddleware } from './lib/rateLimiter.js';
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
const isProd = process.env.NODE_ENV === 'production';

// B2: Reverse Proxy Configuration for rate limits & secure cookies
const trustProxyEnv = process.env.TRUST_PROXY;
if (trustProxyEnv === 'true') {
  app.set('trust proxy', true);
} else if (trustProxyEnv === 'false') {
  app.set('trust proxy', false);
} else if (trustProxyEnv && !Number.isNaN(Number(trustProxyEnv))) {
  app.set('trust proxy', Number(trustProxyEnv));
} else if (trustProxyEnv) {
  app.set('trust proxy', trustProxyEnv);
} else {
  app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
}

// Request ID & Structured JSON Logging (SEC-STEP5)
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  const startTime = Date.now();

  res.on('finish', () => {
    if (isProd || process.env.ENABLE_JSON_LOGS === 'true') {
      const duration_ms = Date.now() - startTime;
      const logEntry = {
        requestId: req.id,
        method: req.method,
        path: req.originalUrl || req.url,
        status: res.statusCode,
        duration_ms,
        userId: req.user?.id || null,
        companyId: req.companyId || req.user?.company_id || null,
      };
      console.log(JSON.stringify(logEntry));
    }
  });

  next();
});

// 1. Security Headers via Helmet (strict CSP in production with no unsafe-eval)
app.use(
  helmet({
    contentSecurityPolicy: isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'blob:'],
            fontSrc: ["'self'"],
            connectSrc: ["'self'"],
            frameAncestors: ["'none'"],
          },
        }
      : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 2. CORS (exact origin enforcement in production)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      if (!isProd && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      const allowed = process.env.ALLOWED_ORIGIN || process.env.CORS_ORIGIN;
      if (allowed && origin === allowed) {
        return callback(null, true);
      }
      if (!isProd) {
        return callback(null, true);
      }
      return callback(new Error('Origin not permitted by CORS policy'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Company-Id', 'Cookie'],
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

// 4b. Strict Authentication Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.AUTH_RATE_LIMIT_MAX
    ? Number(process.env.AUTH_RATE_LIMIT_MAX)
    : (process.env.NODE_ENV === 'test' ? 1000 : 15),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

// 5. JSON body parser (100kb limit; multipart file uploads handled via 25MB multer)
app.use(express.json({ limit: process.env.BODY_LIMIT || '100kb' }));

// 5b. CSRF & Origin Protection
app.use(csrfProtection);

// 6. Company context middleware
app.use(companyContextMiddleware);

// 7. Swagger API Documentation at /api/docs (disabled in production unless ENABLE_API_DOCS=true)
if (!isProd || process.env.ENABLE_API_DOCS === 'true') {
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'Nextal HR & Payroll API Documentation',
    })
  );
} else {
  app.use('/api/docs', (req, res) => {
    res.status(404).json({ status: 'error', code: 'NOT_FOUND', message: 'API documentation is disabled in production.' });
  });
}

// 8. Health Check at /api/v1/health, /health, /healthz, /api/v1/healthz
app.get(['/health', '/healthz', '/api/v1/health', '/api/v1/healthz'], async (req, res, next) => {
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
      uptime: process.uptime(),
      database: 'connected',
      tables_count: tableCount,
      diagnostics: {
        client_ip: req.ip,
        forwarded_for: req.headers['x-forwarded-for'] || null,
        trust_proxy: req.app.get('trust proxy'),
        max_upload_size_mb: 25,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      service: 'Nextal HR & Payroll API',
      version: '1.0.0',
      uptime: process.uptime(),
      database: 'disconnected',
      error: isProd ? 'Database connectivity degraded' : err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// 8b. Readiness Check at /ready, /readyz, /api/v1/ready, /api/v1/readyz
app.get(['/ready', '/readyz', '/api/v1/ready', '/api/v1/readyz'], async (req, res) => {
  try {
    // 1. Verify database connectivity
    await prisma.$base().$queryRaw`SELECT 1`;

    // 2. Memory threshold check (< 1024MB heap on 3.8GB RAM VPS)
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);

    if (heapUsedMB > 1024) {
      return res.status(503).json({
        status: 'degraded',
        reason: 'High memory pressure (>1GB heap)',
        memory: { heapUsedMB, heapTotalMB, rssMB },
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      status: 'ready',
      service: 'Nextal HR & Payroll API',
      version: '1.0.0',
      uptime: process.uptime(),
      database: 'connected',
      memory: { heapUsedMB, heapTotalMB, rssMB },
      diagnostics: {
        client_ip: req.ip,
        forwarded_for: req.headers['x-forwarded-for'] || null,
        trust_proxy: req.app.get('trust proxy'),
        max_upload_size_mb: 25,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'not_ready',
      service: 'Nextal HR & Payroll API',
      version: '1.0.0',
      uptime: process.uptime(),
      database: 'disconnected',
      error: isProd ? 'Database connectivity degraded' : err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// 9. API Modules
app.use('/api/v1/auth', (req, res, next) => {
  if (req.path === '/me' || req.path === '/logout' || req.path === '/logout-all' || req.path === '/mfa/status') {
    return next();
  }
  return authRateLimitMiddleware(req, res, next);
}, authRoutes);
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
