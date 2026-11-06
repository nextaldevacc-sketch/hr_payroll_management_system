import { PrismaClient, Prisma } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

export const companyStorage = new AsyncLocalStorage();

export const COMPANY_OWNED_MODELS = [
  'company_visas',
  'branches',
  'departments',
  'jobs',
  'users',
  'user_roles',
  'support_access_grants',
  'approval_flows',
  'approval_flow_steps',
  'approval_requests',
  'approval_actions',
  'audit_logs',
  'employees',
  'contracts',
  'employee_documents',
  'bank_accounts',
  'shifts',
  'attendance_policies',
  'penalty_steps',
  'device_mappings',
  'biometric_imports',
  'punches',
  'attendance_days',
  'attendance_requests',
  'overtime_requests',
  'public_holidays',
  'leave_types',
  'accrual_plans',
  'leave_allocations',
  'leave_requests',
  'salary_structures',
  'salary_rules',
  'pay_runs',
  'pay_run_issues',
  'payslips',
  'payslip_lines',
  'salary_adjustments',
  'separations',
  'clearance_items',
  'final_settlements',
  'separation_tasks',
];

export function isCompanyOwned(model) {
  return COMPANY_OWNED_MODELS.includes(model);
}

export function getActiveDbUrl() {
  if (process.env.NODE_ENV === 'test' && process.env.DATABASE_URL_TEST) {
    return process.env.DATABASE_URL_TEST;
  }
  return process.env.DATABASE_URL_OVERRIDE || process.env.DATABASE_URL;
}

const defaultActiveUrl = getActiveDbUrl();
export const rawPrisma = new PrismaClient(
  defaultActiveUrl ? { datasources: { db: { url: defaultActiveUrl } } } : undefined
);

/**
 * Creates a company-isolated Prisma Client instance
 */
export function createScopedPrismaClient(explicitCompanyId = null, options = {}) {
  const baseClient = rawPrisma;

  return baseClient.$extends({
    name: 'companyIsolation',
    client: {
      $scoped(companyId, opts = {}) {
        return createScopedPrismaClient(companyId, opts);
      },
      $base() {
        return baseClient;
      }
    },
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!isCompanyOwned(model)) {
            return query(args);
          }

          const store = companyStorage.getStore() || {};
          const companyId = explicitCompanyId || store.companyId;
          const isPlatformAdmin = options.bypassForPlatformAdmin || store.isPlatformAdmin;

          if (isPlatformAdmin) {
            return query(args);
          }

          if (!companyId) {
            throw new Error(`Company context is required for company-owned table: ${model}`);
          }

          args = args || {};

          // Read operations: inject company_id
          if (['findFirst', 'findMany', 'count', 'aggregate', 'groupBy'].includes(operation)) {
            args.where = {
              AND: [
                args.where || {},
                { company_id: companyId }
              ]
            };
            return query(args);
          }

          // findUnique: convert to findFirst with company_id scope
          if (operation === 'findUnique') {
            return baseClient[model].findFirst({
              ...args,
              where: {
                AND: [
                  args.where || {},
                  { company_id: companyId }
                ]
              }
            });
          }

          // Create: inject company_id into data
          if (operation === 'create') {
            args.data = {
              ...args.data,
              company_id: companyId
            };
            return query(args);
          }

          if (operation === 'createMany') {
            if (Array.isArray(args.data)) {
              args.data = args.data.map((item) => ({
                ...item,
                company_id: companyId
              }));
            }
            return query(args);
          }

          // Update & Delete: enforce company ownership verification
          if (['update', 'delete'].includes(operation)) {
            const existing = await baseClient[model].findFirst({
              where: {
                AND: [
                  args.where || {},
                  { company_id: companyId }
                ]
              }
            });

            if (!existing) {
              const error = new Error(`Record to ${operation} does not exist or belongs to another company.`);
              error.code = 'P2025';
              throw error;
            }

            args.where = {
              ...args.where,
              id: existing.id
            };
            return query(args);
          }

          if (['updateMany', 'deleteMany'].includes(operation)) {
            args.where = {
              AND: [
                args.where || {},
                { company_id: companyId }
              ]
            };
            return query(args);
          }

          return query(args);
        }
      }
    }
  });
}

// Default export uses AsyncLocalStorage context
export const prisma = createScopedPrismaClient();
export default prisma;
