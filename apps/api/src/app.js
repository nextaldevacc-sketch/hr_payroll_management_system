import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger.js';
import { companyContextMiddleware } from './middleware/companyContext.js';
import { errorHandler } from './middleware/errorHandler.js';
import prisma from './prisma/client.js';
import auditService from './services/auditService.js';

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
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Company-Id', 'X-Platform-Admin'],
  })
);

// 3. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 10000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});
app.use(limiter);

// 4. JSON body parser
app.use(express.json({ limit: '10mb' }));

// 5. Company context middleware
app.use(companyContextMiddleware);

// 6. Swagger API Documentation at /api/docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Nextal HR & Payroll API Documentation',
}));

// 7. Health Check at /api/v1/health
app.get('/api/v1/health', async (req, res, next) => {
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

// 8. Sample Company-Scoped API routes to demonstrate isolation & audit logging
app.get('/api/v1/audit/logs', async (req, res, next) => {
  try {
    if (!req.companyId && !req.isPlatformAdmin) {
      return res.status(400).json({
        status: 'error',
        message: 'X-Company-Id header or company context required',
      });
    }

    const { table_name, record_id, limit, offset } = req.query;
    const history = await auditService.getHistory({
      companyId: req.companyId,
      tableName: table_name,
      recordId: record_id,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    res.json({
      status: 'success',
      count: history.length,
      data: history,
    });
  } catch (err) {
    next(err);
  }
});

// 9. Centralized Error Handler
app.use(errorHandler);

export default app;
