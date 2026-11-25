import 'dotenv/config';
import { validateEnvironment } from './lib/envValidation.js';
import { enforceStartupValidation } from './config/validateEnv.js';
import { startScheduler, stopScheduler } from './jobs/scheduler.js';
import { rawPrisma } from './lib/prisma.js';
import app from './app.js';

validateEnvironment();
enforceStartupValidation();

const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';
const docsEnabled = !isProd || process.env.ENABLE_API_DOCS === 'true';

const server = app.listen(PORT, () => {
  console.log(`Nextal HR & Payroll API listening on port ${PORT}`);
  if (docsEnabled) {
    console.log(`Swagger documentation available at http://localhost:${PORT}/api/docs`);
  }
  console.log(`Health check available at http://localhost:${PORT}/api/v1/health`);

  // Start background jobs scheduler (if ENABLE_JOBS !== 'false')
  startScheduler();
});

let isShuttingDown = false;
async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);

  // 1. Stop scheduler so no new background jobs trigger
  try {
    stopScheduler();
    console.log('[Server] Background job scheduler stopped.');
  } catch (err) {
    console.warn('[Server] Error stopping scheduler:', err.message);
  }

  // 2. Stop accepting new connections and drain in-flight requests
  server.close(async () => {
    console.log('[Server] HTTP server closed.');
    try {
      await rawPrisma.$disconnect();
      console.log('[Server] Database connections closed.');
      process.exit(0);
    } catch (err) {
      console.error('[Server] Error during database disconnect:', err.message);
      process.exit(1);
    }
  });

  // Force close after 10s if hanging
  setTimeout(() => {
    console.error('[Server] Graceful shutdown timed out after 10 seconds. Forcing exit.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
