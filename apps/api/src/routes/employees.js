import { Router } from 'express';
import prisma from '../prisma/client.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { salaryMaskMiddleware } from '../middleware/salaryMask.js';
import { serializeEmployee, hasSalaryAccess } from '../services/serializers.js';

const router = Router();

router.use(authenticate);

/**
 * GET /api/v1/employees
 * List company employees. Protected by Section 5.3 permissions matrix.
 * Masks salary & bank fields if user lacks salary access.
 */
router.get(
  '/',
  requirePermission('employees', 'view'),
  salaryMaskMiddleware,
  async (req, res, next) => {
    try {
      const companyId = req.companyId;
      const where = { company_id: companyId };
      const canSeeSalary = hasSalaryAccess(req.user);

      // If user is a Department Manager, scope to their department(s)
      const isDeptManager = req.user.roles?.includes('DEPT_MANAGER') && !req.user.roles.includes('COMPANY_ADMIN');
      if (isDeptManager) {
        const managedDepts = await prisma.$base().departments.findMany({
          where: {
            company_id: companyId,
            manager_id: req.user.employeeId,
          },
          select: { id: true },
        });

        if (managedDepts.length > 0) {
          where.contracts = {
            some: {
              department_id: { in: managedDepts.map((d) => d.id) },
              status: 'Approved',
            },
          };
        }
      }

      // Contracts query: if non-salary role, do NOT select salary columns
      const contractsSelect = canSeeSalary
        ? {
            id: true,
            contract_type: true,
            basic: true,
            housing: true,
            transport: true,
            other_allowances: true,
            gross: true,
            department: { select: { id: true, name: true } },
            job: { select: { id: true, title: true } },
          }
        : {
            id: true,
            contract_type: true,
            department: { select: { id: true, name: true } },
            job: { select: { id: true, title: true } },
          };

      const employees = await prisma.$base().employees.findMany({
        where,
        include: {
          company_visa: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true, emirate: true } },
          manager: { select: { id: true, name: true, employee_code: true } },
          contracts: {
            where: { status: 'Approved' },
            take: 1,
            select: contractsSelect,
          },
          // For non-salary roles, omit bank_accounts entirely
          ...(canSeeSalary
            ? {
                bank_accounts: {
                  select: {
                    id: true,
                    bank_name: true,
                    routing_code: true,
                    iban: true,
                    salary_split_pct: true,
                    is_primary: true,
                  },
                },
              }
            : {}),
        },
        orderBy: { employee_code: 'asc' },
      });

      const serialized = employees.map((emp) => serializeEmployee(emp, req.user));

      res.json({
        status: 'success',
        count: serialized.length,
        data: serialized,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/employees/:id
 * Retrieve employee profile details.
 */
router.get(
  '/:id',
  requirePermission('employees', 'view'),
  salaryMaskMiddleware,
  async (req, res, next) => {
    try {
      const companyId = req.companyId;
      const canSeeSalary = hasSalaryAccess(req.user);

      const contractsInclude = canSeeSalary
        ? {
            include: {
              department: true,
              job: true,
            },
            take: 1,
          }
        : {
            select: {
              id: true,
              contract_type: true,
              start_date: true,
              end_date: true,
              probation_end: true,
              notice_days_employee: true,
              notice_days_employer: true,
              status: true,
              department: { select: { id: true, name: true } },
              job: { select: { id: true, title: true } },
            },
            take: 1,
          };

      const employee = await prisma.$base().employees.findUnique({
        where: { id: req.params.id },
        include: {
          company_visa: true,
          branch: true,
          manager: { select: { id: true, name: true, employee_code: true } },
          contracts: contractsInclude,
          ...(canSeeSalary
            ? {
                bank_accounts: true,
              }
            : {}),
          documents: true,
        },
      });

      if (!employee || employee.company_id !== companyId) {
        return res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Employee not found',
        });
      }

      const serialized = serializeEmployee(employee, req.user);

      res.json({
        status: 'success',
        data: serialized,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
