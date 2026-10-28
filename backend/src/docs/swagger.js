export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Nextal HR & Payroll Platform API',
    version: '1.0.0',
    description: 'Enterprise UAE Multi-Company HR, Biometrics, WPS SIF Payroll & Compliance API complying with UAE Federal Decree-Law No. 33/2021.',
    contact: {
      name: 'Nextal Technologies Support',
      email: 'support@nextal.ae'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local development server'
    }
  ],
  paths: {
    '/api/v1/health': {
      get: {
        summary: 'Health check endpoint',
        description: 'Returns the operational health, database connectivity status, and service uptime.',
        tags: ['System'],
        responses: {
          200: {
            description: 'API is healthy and operational',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    service: { type: 'string', example: 'Nextal HR & Payroll API' },
                    version: { type: 'string', example: '1.0.0' },
                    database: { type: 'string', example: 'connected' },
                    tables_count: { type: 'integer', example: 43 },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/v1/audit/logs': {
      get: {
        summary: 'List audit trail entries',
        description: 'Returns immutable audit logs filtered by company context.',
        tags: ['Audit'],
        parameters: [
          {
            name: 'X-Company-Id',
            in: 'header',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Company tenant identifier'
          },
          {
            name: 'table_name',
            in: 'query',
            required: false,
            schema: { type: 'string' }
          },
          {
            name: 'record_id',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          200: {
            description: 'List of audit entries',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    count: { type: 'integer' },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          action: { type: 'string' },
                          table_name: { type: 'string' },
                          record_id: { type: 'string' },
                          created_at: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
