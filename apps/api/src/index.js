import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Nextal HR & Payroll API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Nextal HR & Payroll API running on port ${PORT}`);
  });
}

export default app;
