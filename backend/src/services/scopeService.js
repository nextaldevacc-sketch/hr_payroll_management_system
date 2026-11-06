/**
 * Data Scoping Service (Spec 5.3 & Appendix A.3.8)
 *
 * Enforces role-based data boundaries across:
 * - Company (all data in company)
 * - CompanyVisa (only employees & records under specific company_visa_id)
 * - Branch (only employees & records under specific branch_id; pay runs are read-only)
 * - Department (only employees & records under specific department_id)
 *
 * Any Company-scoped role -> all: true.
 * Records outside scope throw 404 NOT_FOUND (never reveal record existence).
 * Top-bar company_visa_id is applied ON TOP of scope.
 * Requesting a visa outside assigned scope throws 400 INVALID_VISA.
 */

export class ScopeService {
  /**
   * Resolves viewer's data access scope based on their role assignments.
   * Returns:
   *   { all: true }
   * or:
   *   { all: false, visaIds: string[], branchIds: string[], departmentIds: string[] }
   */
  resolveDataScope(viewer) {
    if (!viewer) {
      return { all: false, visaIds: [], branchIds: [], departmentIds: [] };
    }

    if (viewer.isPlatformAdmin || viewer.roles?.includes('PLATFORM_ADMIN')) {
      return { all: true };
    }

    const rawScopes =
      viewer.scopes ||
      (viewer.user_roles
        ? viewer.user_roles.map((ur) => ({
            role: ur.role?.code || ur.role,
            scope_type: ur.scope_type,
            scope_id: ur.scope_id,
          }))
        : []);

    // Spec 5.3: Compute scope ONLY from data-access roles (everything except EMPLOYEE).
    // EMPLOYEE role gives self-service access only, never org scope.
    const dataScopes = rawScopes.filter((s) => {
      const roleCode = s.role?.code || s.role;
      return roleCode !== 'EMPLOYEE';
    });

    if (dataScopes.length === 0) {
      return { all: false, visaIds: [], branchIds: [], departmentIds: [] };
    }

    // Integrity check: if any data-access role has null/undefined scope_type, throw 500 error
    for (const s of dataScopes) {
      if (!s.scope_type) {
        const roleName = s.role?.code || s.role || 'Unknown';
        const err = new Error(`Integrity error: data-access role '${roleName}' has null scope_type`);
        err.status = 500;
        err.code = 'INVALID_SCOPE_CONFIGURATION';
        throw err;
      }
    }

    // Only non-EMPLOYEE roles with explicit scope_type === 'Company' get company-wide access
    const hasCompanyScope = dataScopes.some((s) => s.scope_type === 'Company');
    if (hasCompanyScope) {
      return { all: true };
    }

    const visaIds = [
      ...new Set(
        dataScopes
          .filter((s) => s.scope_type === 'CompanyVisa' && s.scope_id)
          .map((s) => s.scope_id)
      ),
    ];

    const branchIds = [
      ...new Set(
        dataScopes
          .filter((s) => s.scope_type === 'Branch' && s.scope_id)
          .map((s) => s.scope_id)
      ),
    ];

    const departmentIds = [
      ...new Set(
        dataScopes
          .filter((s) => s.scope_type === 'Department' && s.scope_id)
          .map((s) => s.scope_id)
      ),
    ];

    return {
      all: false,
      visaIds,
      branchIds,
      departmentIds,
    };
  }

  /**
   * Validates requested visaId against viewer's resolved scope.
   * If scope restricts visas and requested visa is not allowed -> throws 400 INVALID_VISA.
   */
  validateVisaScope(scope, requestedVisaId) {
    if (!requestedVisaId || requestedVisaId === 'all') return;
    if (scope.all) return;

    if (scope.visaIds && scope.visaIds.length > 0) {
      if (!scope.visaIds.includes(requestedVisaId)) {
        const err = new Error('Requested company visa is outside your assigned scope');
        err.status = 400;
        err.code = 'INVALID_VISA';
        throw err;
      }
    }
  }

  /**
   * Builds Prisma `where` clause for employees matching scope and optional top-bar visa filter.
   */
  buildEmployeeWhere(scope, requestedVisaId = null) {
    this.validateVisaScope(scope, requestedVisaId);

    if (scope.all) {
      if (requestedVisaId && requestedVisaId !== 'all') {
        return { company_visa_id: requestedVisaId };
      }
      return {};
    }

    const andConditions = [];

    if (requestedVisaId && requestedVisaId !== 'all') {
      andConditions.push({ company_visa_id: requestedVisaId });
    }

    const orClauses = [];

    if (scope.visaIds && scope.visaIds.length > 0) {
      orClauses.push({ company_visa_id: { in: scope.visaIds } });
    }

    if (scope.branchIds && scope.branchIds.length > 0) {
      orClauses.push({ branch_id: { in: scope.branchIds } });
    }

    if (scope.departmentIds && scope.departmentIds.length > 0) {
      orClauses.push({
        contracts: {
          some: {
            department_id: { in: scope.departmentIds },
          },
        },
      });
    }

    if (orClauses.length > 0) {
      if (orClauses.length === 1) {
        andConditions.push(orClauses[0]);
      } else {
        andConditions.push({ OR: orClauses });
      }
    }

    if (andConditions.length === 0) {
      return { id: '00000000-0000-0000-0000-000000000000' };
    }

    if (andConditions.length === 1) {
      return andConditions[0];
    }

    return { AND: andConditions };
  }

  /**
   * Checks if an employee record matches the viewer's scope.
   * Throws 404 NOT_FOUND if out of scope (to avoid revealing record existence).
   */
  assertEmployeeInScope(employee, scope) {
    if (scope.all) return;
    if (!employee) {
      const err = new Error('Employee not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    let inScope = false;

    if (scope.visaIds && scope.visaIds.length > 0) {
      if (scope.visaIds.includes(employee.company_visa_id)) {
        inScope = true;
      }
    }

    if (scope.branchIds && scope.branchIds.length > 0) {
      if (scope.branchIds.includes(employee.branch_id)) {
        inScope = true;
      }
    }

    if (scope.departmentIds && scope.departmentIds.length > 0) {
      const depts = (employee.contracts || []).map(
        (c) => c.department_id || c.department?.id
      );
      if (depts.some((d) => scope.departmentIds.includes(d))) {
        inScope = true;
      }
    }

    if (!inScope) {
      const err = new Error('Employee not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
  }
}

export const scopeService = new ScopeService();
export const resolveDataScope = (viewer) => scopeService.resolveDataScope(viewer);
export default scopeService;

