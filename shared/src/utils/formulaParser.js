import Decimal from 'decimal.js';

// Ensure 28 digits precision and HALF_UP financial rounding
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

/**
 * Standard Whitelist of Context Variables (Section 8.1 & 9.1)
 */
export const STANDARD_WHITELIST_VARIABLES = new Set([
  'contract.basic',
  'contract.hra',
  'contract.tra',
  'contract.oth',
  'paid_days',
  'month_days',
  'ot_hours_normal',
  'ot_hours_night',
  'ot_hours_rest',
  'absent_days',
  'late_units',
  'sick_half_days',
  'sick_none_days',
  'loan_instalment',
  'adv_instalment',
  'gpssa_salary',
  'GROSS',

  // Permitted ergonomic aliases matching spec Section 8.1 & 8.4 formulas
  'basic',
  'hra',
  'tra',
  'oth',
  'gross',
  'ot_hours',
  'ot_night_hours',
  'ot_rest_hours',
  'sick_unpaid_days',
  'loan_installment',
  'advance_amount',
  'contribution_salary',
  'policy_late_deduction',

  // Pension rate variables (from Settings / Statutory Pension rules)
  'gpssa_ee_rate',
  'gpssa_er_rate',
  'gpssa_gov_share_rate',
  'gpssa_gov_share',
  'gpssa_total_er_rate',
  'adpf_ee_rate',
  'adpf_er_rate',
  'adpf_gov_share_rate',
  'adpf_gov_share'
]);

/**
 * Normalizes symbols like Unicode minus (U+2212), times (U+00D7), and divide (U+00F7)
 */
export function normalizeFormula(expr) {
  if (!expr || typeof expr !== 'string') return '';
  return expr
    .replace(/\u2212/g, '-') // Unicode minus
    .replace(/×|\u00D7/g, '*') // Unicode times
    .replace(/÷|\u00F7/g, '/') // Unicode division
    .trim();
}

/**
 * Token Types
 */
const TOKEN_TYPES = {
  NUMBER: 'NUMBER',
  IDENTIFIER: 'IDENTIFIER',
  OPERATOR: 'OPERATOR',
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  COMMA: 'COMMA',
  PERCENT: 'PERCENT'
};

/**
 * Strictly tokenizes a mathematical expression without eval or new Function
 */
export function tokenize(expression) {
  const normalized = normalizeFormula(expression);
  const tokens = [];
  let i = 0;

  // Forbidden substrings that indicate malicious code or prototype pollution
  const FORBIDDEN_WORDS = [
    'eval', 'function', 'class', 'process', 'require', 'import',
    'constructor', '__proto__', 'prototype', 'global', 'window',
    'document', 'settimeout', 'setinterval', 'fetch', 'module', 'exports'
  ];

  while (i < normalized.length) {
    const ch = normalized[i];

    // Skip whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Number literals (e.g. 123, 45.67, .5)
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(normalized[i + 1] || ''))) {
      let numStr = '';
      let hasDot = false;
      while (i < normalized.length && (/[0-9]/.test(normalized[i]) || normalized[i] === '.')) {
        if (normalized[i] === '.') {
          if (hasDot) break;
          hasDot = true;
        }
        numStr += normalized[i];
        i++;
      }
      tokens.push({ type: TOKEN_TYPES.NUMBER, value: numStr });
      continue;
    }

    // Identifiers (variables, property access like contract.basic, and functions like min/max/round)
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < normalized.length && /[a-zA-Z0-9_\.]/.test(normalized[i])) {
        ident += normalized[i];
        i++;
      }

      const lower = ident.toLowerCase();
      const parts = lower.split('.');
      if (parts.some((p) => FORBIDDEN_WORDS.includes(p))) {
        throw new Error(`Security Violation: Keyword '${ident}' is strictly forbidden in formula`);
      }

      tokens.push({ type: TOKEN_TYPES.IDENTIFIER, value: ident });
      continue;
    }

    // Parentheses
    if (ch === '(') {
      tokens.push({ type: TOKEN_TYPES.LPAREN, value: '(' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: TOKEN_TYPES.RPAREN, value: ')' });
      i++;
      continue;
    }

    // Comma for multi-arg functions e.g. min(a, b)
    if (ch === ',') {
      tokens.push({ type: TOKEN_TYPES.COMMA, value: ',' });
      i++;
      continue;
    }

    // Percentage symbol
    if (ch === '%') {
      tokens.push({ type: TOKEN_TYPES.PERCENT, value: '%' });
      i++;
      continue;
    }

    // Operators: +, -, *, /
    if (['+', '-', '*', '/'].includes(ch)) {
      tokens.push({ type: TOKEN_TYPES.OPERATOR, value: ch });
      i++;
      continue;
    }

    // Any other character is invalid
    throw new Error(`Syntax Error: Unexpected character '${ch}' at position ${i}`);
  }

  return tokens;
}

/**
 * Recursive Descent Parser
 * Grammar:
 * Expr    -> Term (( '+' | '-' ) Term)*
 * Term    -> Factor (( '*' | '/' ) Factor)*
 * Factor  -> Primary ('%')?
 * Primary -> ( '+' | '-' ) Primary
 *          | NUMBER
 *          | FunctionCall
 *          | IDENTIFIER
 *          | '(' Expr ')'
 */
export class FormulaParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() {
    return this.tokens[this.pos];
  }

  consume(expectedType, expectedValue) {
    const token = this.peek();
    if (!token) {
      throw new Error(`Unexpected end of expression, expected ${expectedValue || expectedType}`);
    }
    if (expectedType && token.type !== expectedType) {
      throw new Error(`Expected token type ${expectedType} but got ${token.type} ('${token.value}')`);
    }
    if (expectedValue && token.value !== expectedValue) {
      throw new Error(`Expected '${expectedValue}' but got '${token.value}'`);
    }
    this.pos++;
    return token;
  }

  parse() {
    if (!this.tokens || this.tokens.length === 0) {
      return { type: 'Literal', value: new Decimal(0) };
    }
    const node = this.expr();
    if (this.pos < this.tokens.length) {
      const extra = this.peek();
      throw new Error(`Unexpected token '${extra.value}' after complete expression`);
    }
    return node;
  }

  expr() {
    let left = this.term();
    while (this.peek() && this.peek().type === TOKEN_TYPES.OPERATOR && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.consume().value;
      const right = this.term();
      left = { type: 'Binary', op, left, right };
    }
    return left;
  }

  term() {
    let left = this.factor();
    while (this.peek() && this.peek().type === TOKEN_TYPES.OPERATOR && (this.peek().value === '*' || this.peek().value === '/')) {
      const op = this.consume().value;
      const right = this.factor();
      left = { type: 'Binary', op, left, right };
    }
    return left;
  }

  factor() {
    let node = this.primary();
    if (this.peek() && this.peek().type === TOKEN_TYPES.PERCENT) {
      this.consume(TOKEN_TYPES.PERCENT);
      node = { type: 'Percent', value: node };
    }
    return node;
  }

  primary() {
    const token = this.peek();
    if (!token) {
      throw new Error('Unexpected end of formula');
    }

    // Unary plus or minus
    if (token.type === TOKEN_TYPES.OPERATOR && (token.value === '+' || token.value === '-')) {
      const op = this.consume().value;
      const operand = this.primary();
      return { type: 'Unary', op, operand };
    }

    // Number literal
    if (token.type === TOKEN_TYPES.NUMBER) {
      this.consume(TOKEN_TYPES.NUMBER);
      return { type: 'Literal', value: new Decimal(token.value) };
    }

    // Function call or Identifier
    if (token.type === TOKEN_TYPES.IDENTIFIER) {
      const ident = this.consume(TOKEN_TYPES.IDENTIFIER).value;

      // Check if it's a known function: min, max, round
      const fnName = ident.toLowerCase();
      if (['min', 'max', 'round'].includes(fnName) && this.peek() && this.peek().type === TOKEN_TYPES.LPAREN) {
        this.consume(TOKEN_TYPES.LPAREN);
        const args = [];
        if (this.peek() && this.peek().type !== TOKEN_TYPES.RPAREN) {
          args.push(this.expr());
          while (this.peek() && this.peek().type === TOKEN_TYPES.COMMA) {
            this.consume(TOKEN_TYPES.COMMA);
            args.push(this.expr());
          }
        }
        this.consume(TOKEN_TYPES.RPAREN);
        return { type: 'FunctionCall', name: fnName, args };
      }

      // Otherwise it is a variable reference
      return { type: 'Variable', name: ident };
    }

    // Parenthesized sub-expression
    if (token.type === TOKEN_TYPES.LPAREN) {
      this.consume(TOKEN_TYPES.LPAREN);
      const subExpr = this.expr();
      this.consume(TOKEN_TYPES.RPAREN);
      return subExpr;
    }

    throw new Error(`Unexpected token '${token.value}'`);
  }
}

/**
 * Extracts all variable names used in an AST
 */
export function extractVariables(node, vars = new Set()) {
  if (!node) return vars;
  if (node.type === 'Variable') {
    vars.add(node.name);
  } else if (node.type === 'Binary') {
    extractVariables(node.left, vars);
    extractVariables(node.right, vars);
  } else if (node.type === 'Unary') {
    extractVariables(node.operand, vars);
  } else if (node.type === 'Percent') {
    extractVariables(node.value, vars);
  } else if (node.type === 'FunctionCall') {
    for (const arg of node.args) {
      extractVariables(arg, vars);
    }
  }
  return vars;
}

/**
 * Validates a formula against whitelist and sequence constraints (Rule A)
 * @param {string} formula
 * @param {Object} options
 * @param {string[]} options.earlierRuleCodes - Codes of rules that precede this rule in sequence
 * @param {string} options.currentRuleCode - Code of the rule being validated
 * @param {string[]} options.laterRuleCodes - Codes of rules that appear after this rule
 * @returns {{ valid: boolean, error?: string, variablesUsed?: string[] }}
 */
export function validateFormula(formula, options = {}) {
  const {
    earlierRuleCodes = [],
    currentRuleCode = '',
    laterRuleCodes = []
  } = options;

  try {
    const tokens = tokenize(formula);
    const parser = new FormulaParser(tokens);
    const ast = parser.parse();
    const variablesUsed = Array.from(extractVariables(ast));

    // Construct full set of permissible variables for this rule
    const allowed = new Set([
      ...STANDARD_WHITELIST_VARIABLES,
      ...earlierRuleCodes.map((c) => c.toUpperCase()),
      ...earlierRuleCodes.map((c) => c.toLowerCase()),
      ...earlierRuleCodes
    ]);

    const laterSet = new Set([
      ...laterRuleCodes.map((c) => c.toUpperCase()),
      ...laterRuleCodes.map((c) => c.toLowerCase()),
      ...laterRuleCodes
    ]);

    for (const v of variablesUsed) {
      // Check for self-reference (direct recursion)
      if (currentRuleCode && v.toUpperCase() === currentRuleCode.toUpperCase()) {
        return {
          valid: false,
          error: `Circular reference: Rule '${currentRuleCode}' cannot reference itself in its own formula`
        };
      }

      // Check for forward reference to later rules
      if (laterSet.has(v) || laterSet.has(v.toUpperCase())) {
        return {
          valid: false,
          error: `Forward reference error: Rule '${currentRuleCode}' cannot reference later rule '${v}' in sequence`
        };
      }

      // Check whitelist
      if (!allowed.has(v) && !allowed.has(v.toUpperCase()) && !allowed.has(v.toLowerCase())) {
        return {
          valid: false,
          error: `Unknown variable '${v}' in formula. Allowed variables: ${Array.from(allowed).slice(0, 15).join(', ')}...`
        };
      }
    }

    return { valid: true, variablesUsed };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * Check circular dependencies across an entire rule structure
 * @param {Array<{ code: string, formula?: string, sequence: number }>} rules
 */
export function validateRuleStructureDependencies(rules = []) {
  const sorted = [...rules].sort((a, b) => a.sequence - b.sequence);
  const ruleMap = new Map();
  sorted.forEach((r) => ruleMap.set(r.code.toUpperCase(), r));

  for (let i = 0; i < sorted.length; i++) {
    const rule = sorted[i];
    if (!rule.formula) continue;

    const earlierCodes = sorted.slice(0, i).map((r) => r.code);
    const laterCodes = sorted.slice(i + 1).map((r) => r.code);

    const validation = validateFormula(rule.formula, {
      currentRuleCode: rule.code,
      earlierRuleCodes: earlierCodes,
      laterRuleCodes: laterCodes
    });

    if (!validation.valid) {
      return {
        valid: false,
        ruleCode: rule.code,
        error: validation.error
      };
    }
  }

  return { valid: true };
}

/**
 * Safely evaluates an AST given a context of Decimal/numeric values
 * All arithmetic is performed in Decimal.js
 */
export function evaluateAst(node, context = {}) {
  if (!node) return new Decimal(0);

  switch (node.type) {
    case 'Literal':
      return node.value;

    case 'Variable': {
      const varName = node.name;
      // Resolve dotted properties, e.g. contract.basic
      let val = undefined;
      if (varName.includes('.')) {
        const parts = varName.split('.');
        let curr = context;
        for (const p of parts) {
          curr = curr ? curr[p] : undefined;
        }
        val = curr;
      } else {
        val = context[varName] !== undefined
          ? context[varName]
          : context[varName.toLowerCase()] !== undefined
          ? context[varName.toLowerCase()]
          : context[varName.toUpperCase()];
      }

      if (val === undefined || val === null) {
        // Fallback for missing optional inputs
        return new Decimal(0);
      }
      return val instanceof Decimal ? val : new Decimal(val);
    }

    case 'Binary': {
      const left = evaluateAst(node.left, context);
      const right = evaluateAst(node.right, context);

      switch (node.op) {
        case '+':
          return left.plus(right);
        case '-':
          return left.minus(right);
        case '*':
          return left.times(right);
        case '/':
          if (right.isZero()) {
            return new Decimal(0); // Avoid NaN / infinity on division by 0
          }
          return left.dividedBy(right);
        default:
          throw new Error(`Unsupported binary operator '${node.op}'`);
      }
    }

    case 'Unary': {
      const val = evaluateAst(node.operand, context);
      if (node.op === '-') return val.negated();
      return val;
    }

    case 'Percent': {
      const val = evaluateAst(node.value, context);
      return val.dividedBy(100);
    }

    case 'FunctionCall': {
      const evaluatedArgs = node.args.map((a) => evaluateAst(a, context));
      if (node.name === 'min') {
        if (evaluatedArgs.length === 0) return new Decimal(0);
        return Decimal.min(...evaluatedArgs);
      }
      if (node.name === 'max') {
        if (evaluatedArgs.length === 0) return new Decimal(0);
        return Decimal.max(...evaluatedArgs);
      }
      if (node.name === 'round') {
        const val = evaluatedArgs[0] || new Decimal(0);
        const decimals = evaluatedArgs[1] ? evaluatedArgs[1].toNumber() : 2;
        return val.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP);
      }
      throw new Error(`Unsupported function '${node.name}'`);
    }

    default:
      throw new Error(`Unknown AST node type '${node.type}'`);
  }
}

/**
 * Safely evaluates a formula expression string against a data context
 */
export function evaluateFormula(formula, context = {}) {
  const tokens = tokenize(formula);
  const parser = new FormulaParser(tokens);
  const ast = parser.parse();
  return evaluateAst(ast, context);
}
