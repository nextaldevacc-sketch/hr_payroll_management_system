import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../..');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().optional().default('postgresql://nextal:nextal_secret_2026@localhost:5432/nextal_db?schema=public'),
  JWT_SECRET: z.string().default('nextal_jwt_secret_dev_key_2026'),
  JWT_EXPIRY: z.string().default('24h'),
  CORS_ORIGIN: z.string().optional(),
  STORAGE_DIR: z.string().default(path.join(backendRoot, 'storage')),
  DEFAULT_TIMEZONE: z.string().default('Asia/Dubai'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment configuration:', parsedEnv.error.format());
  throw new Error('Environment configuration validation failed');
}

export const config = {
  ...parsedEnv.data,
  isProduction: parsedEnv.data.NODE_ENV === 'production',
  isDevelopment: parsedEnv.data.NODE_ENV === 'development',
  isTest: parsedEnv.data.NODE_ENV === 'test',
  constants: {
    APP_NAME: 'Nextal HR & Payroll Platform',
    API_VERSION: 'v1',
    TIMEZONE: 'Asia/Dubai',
    PENSION: {
      MIN_SALARY: 3000,
      MAX_SALARY: 70000,
      LEGACY_CUTOFF_DATE: '2023-10-02',
      DEFAULT_EE_RATE_NEW: 0.11,
      DEFAULT_EE_RATE_LEGACY: 0.05,
      DEFAULT_ER_RATE_NEW: 0.15,
      DEFAULT_ER_RATE_LEGACY: 0.15,
      GOV_SHARE_THRESHOLD: 20000,
      GOV_SHARE_RATE: 0.025,
    },
    ATTENDANCE: {
      NIGHT_WINDOW_START: '22:00:00',
      NIGHT_WINDOW_END: '04:00:00',
      DEFAULT_GRACE_MINUTES: 15,
    },
    LEAVE: {
      STATUTORY_ANNUAL_DAYS: 30,
      WAITING_PERIOD_MONTHS: 6,
      MONTHLY_ACCRUAL_AFTER_WAIT: 2,
      CARRY_OVER_MAX_DEFAULT: 15,
      SICK_FULL_PAY_DAYS: 15,
      SICK_HALF_PAY_DAYS: 30,
      SICK_UNPAID_DAYS: 45,
      MATERNITY_FULL_PAY_DAYS: 45,
      MATERNITY_HALF_PAY_DAYS: 15,
    },
  },
};

export default config;
