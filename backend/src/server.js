import 'dotenv/config';
import { validateEnvironment } from './lib/envValidation.js';
import { enforceStartupValidation } from './config/validateEnv.js';
import { startScheduler } from './jobs/scheduler.js';
import app from './app.js';

validateEnvironment();
enforceStartupValidation();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Nextal HR & Payroll API listening on port ${PORT}`);
  console.log(`Swagger documentation available at http://localhost:${PORT}/api/docs`);
  console.log(`Health check available at http://localhost:${PORT}/api/v1/health`);

  // Start background jobs scheduler (if ENABLE_JOBS !== 'false')
  startScheduler();
});

export default app;
