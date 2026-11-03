/**
 * Zod validation middleware
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} [source='body']
 */
export function validate(schema, source = 'body') {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync(req[source]);
      req[source] = parsed;
      next();
    } catch (error) {
      if (error.errors) {
        const count = error.errors.length;
        return res.status(400).json({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: `Please fix ${count} field${count > 1 ? 's' : ''}`,
          errors: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
}

export function validateBody(schema) {
  return validate(schema, 'body');
}
