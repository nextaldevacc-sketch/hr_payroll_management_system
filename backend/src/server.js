import 'dotenv/config';
import { validateEnvironment } from './lib/envValidation.js';
import app from './app.js';

validateEnvironment();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Nextal HR & Payroll API listening on port ${PORT}`);
  console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
  console.log(`Health check available at http://localhost:${PORT}/api/v1/health`);
});

export default app;
