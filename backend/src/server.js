import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Nextal HR & Payroll API listening on port ${PORT}`);
    console.log(`Swagger documentation available at http://localhost:${PORT}/api/docs`);
    console.log(`Health check available at http://localhost:${PORT}/api/v1/health`);
  });
}

export default app;
