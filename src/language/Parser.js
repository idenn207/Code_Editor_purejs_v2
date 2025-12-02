/**
 * @fileoverview Recursive descent parser for JavaScript
 * @module language/Parser
 */

import { TokenType } from '../tokenizer/Tokenizer.js';
import { AST, NodeType } from './ASTNodes.js';

// ============================================
// Parser Error
// ============================================

export class ParseError extends Error {
  constructor(message, token, expected) {
    super(message);
    this.name = 'ParseError';
    this.token = token;
    this.expected = expected;
  }
}

// ============================================
// Parser Class
// ============================================

/**
 * Recursive descent parser for JavaScript.
 * Generates AST from tokens.
 */
export class Parser {
  // ----------------------------------------
  // Instance Properties
  // ----------------------------------------
  _tokens = [];
  _pos = 0;
  _errors = [];

  // ----------------------------------------
  // Public Methods
  // ----------------------------------------

  /**
   * Parse tokens into AST
   * @param {Array} tokens - Token array from tokenizer
   * @returns {{ ast: ASTNode, errors: Array }}
   */
  parse(tokens) {
    // Filter out whitespace and comments
    this._tokens = tokens.filter((t) => t.type !== TokenType.WHITESPACE && t.type !== TokenType.COMMENT && t.type !== 'whitespace' && t.type !== 'comment');
    this._pos = 0;
    this._errors = [];

    const body = [];

    while (!this._isAtEnd()) {
      try {
        const stmt = this._parseStatement();
        if (stmt) body.push(stmt);
      } catch (e) {
        if (e instanceof ParseError) {
          this._errors.push(e);
          this._synchronize();
        } else {
          throw e;
        }
      }
    }

    return {
      ast: AST.program(body),
      errors: this._errors,
    };
  }

  // ----------------------------------------
  // Statement Parsing
  // ----------------------------------------

  _parseStatement() {
    // Skip empty statements
    if (this._match('delimiter', ';')) {
      return AST.emptyStatement();
    }

    if (this._checkKeyword()) {
      const keyword = this._peek().value;

      switch (keyword) {
        case 'const':
        case 'let':
        case 'var':
          return this._parseVariableDeclaration();

        case 'function':
          return this._parseFunctionDeclaration();

        case 'class':
          return this._parseClassDeclaration();

        case 'if':
          return this._parseIfStatement();

        case 'for':
          return this._parseForStatement();

        case 'while':
          return this._parseWhileStatement();

        case 'do':
          return this._parseDoWhileStatement();

        case 'return':
          return this._parseReturnStatement();

        case 'throw':
          return this._parseThrowStatement();

        case 'try':
          return this._parseTryStatement();

        case 'switch':
          return this._parseSwitchStatement();

        case 'break':
          this._advance();
          this._match('delimiter', ';');
          return AST.breakStatement();

        case 'continue':
          this._advance();
          this._match('delimiter', ';');
          return AST.continueStatement();

        case 'import':
          return this._parseImportDeclaration();

        case 'export':
          return this._parseExportDeclaration();
      }
    }

    // Block statement
    if (this._check('delimiter.bracket', '{')) {
      return this._parseBlockStatement();
    }

    // Expression statement
    return this._parseExpressionStatement();
  }

  _parseVariableDeclaration() {
    const kind = this._advance().value; // const, let, var
    const declarations = [];

    do {
      const id = this._parseBindingPattern();
      let init = null;

      if (this._match('operator', '=')) {
        init = this._parseAssignment();
      }

      declarations.push(AST.variableDeclarator(id, init));
    } while (this._match('delimiter', ','));

    this._match('delimiter', ';');

    return AST.variableDeclaration(kind, declarations);
  }

  _parseFunctionDeclaration() {
    this._expect('keyword', 'function');

    const async = false; // TODO: handle async
    const generator = this._match('operator', '*');

    const id = this._parseIdentifier();
    const params = this._parseParameters();
    const body = this._parseBlockStatement();

    const node = AST.functionDeclaration(id, params, body);
    node.async = async;
    node.generator = generator;
    return node;
  }

  _parseClassDeclaration() {
    this._expect('keyword', 'class');

    const id = this._parseIdentifier();

    let superClass = null;
    if (this._matchKeyword('extends')) {
      superClass = this._parseExpression();
    }

    const body = this._parseClassBody();

    return AST.classDeclaration(id, superClass, body);
  }

  _parseClassBody() {
    this._expect('delimiter.bracket', '{');

    const body = [];

    while (!this._check('delimiter.bracket', '}') && !this._isAtEnd()) {
      // Skip semicolons
      if (this._match('delimiter', ';')) continue;

      let isStatic = false;
      if (this._checkKeyword('static')) {
        isStatic = true;
        this._advance();
      }

      let kind = 'method';
      if (this._checkKeyword('get')) {
        kind = 'get';
        this._advance();
      } else if (this._checkKeyword('set')) {
        kind = 'set';
        this._advance();
      }

      const key = this._parsePropertyName();

      // Check for field declaration (property = value; or property;)
      if (this._check('operator', '=') || this._check('delimiter', ';') || this._check('delimiter.bracket', '}')) {
        let value = null;
        if (this._match('operator', '=')) {
          value = this._parseAssignment();
        }
        this._match('delimiter', ';'); // Optional semicolon

        // Create a PropertyDefinition node (class field)
        body.push(AST.propertyDefinition(key, value, false, isStatic));
        continue;
      }

      // Check for constructor
      if (key.type === NodeType.IDENTIFIER && key.name === 'constructor') {
        kind = 'constructor';
      }

      const params = this._parseParameters();
      const methodBody = this._parseBlockStatement();

      const value = AST.functionExpression(null, params, methodBody);
      body.push(AST.methodDefinition(key, value, kind, false, isStatic));
    }

    this._expect('delimiter.bracket', '}');

    return AST.classBody(body);
  }

  _parseIfStatement() {
    this._expect('keyword', 'if');
    this._expect('delimiter.bracket', '(');

    const test = this._parseExpression();

    this._expect('delimiter.bracket', ')');

    const consequent = this._parseStatement();

    let alternate = null;
    if (this._matchKeyword('else')) {
      alternate = this._parseStatement();
    }

    return AST.ifStatement(test, consequent, alternate);
  }

  _parseForStatement() {
    this._expect('keyword', 'for');
    this._expect('delimiter.bracket', '(');

    // Check for for-in or for-of
    let init = null;

    if (!this._check('delimiter', ';')) {
      if (this._checkKeyword('const') || this._checkKeyword('let') || this._checkKeyword('var')) {
        const kind = this._advance().value;
        const id = this._parseBindingPattern();

        if (this._matchKeyword('in')) {
          const right = this._parseExpression();
          this._expect('delimiter.bracket', ')');
          const body = this._parseStatement();
          return AST.forInStatement(AST.variableDeclaration(kind, [AST.variableDeclarator(id, null)]), right, body);
        }

        if (this._matchKeyword('of')) {
          const right = this._parseExpression();
          this._expect('delimiter.bracket', ')');
          const body = this._parseStatement();
          return AST.forOfStatement(AST.variableDeclaration(kind, [AST.variableDeclarator(id, null)]), right, body);
        }

        // Regular for loop with declaration
        let initVal = null;
        if (this._match('operator', '=')) {
          initVal = this._parseAssignment();
        }
        init = AST.variableDeclaration(kind, [AST.variableDeclarator(id, initVal)]);
      } else {
        init = this._parseExpression();
      }
    }

    this._expect('delimiter', ';');

    const test = this._check('delimiter', ';') ? null : this._parseExpression();
    this._expect('delimiter', ';');

    const update = this._check('delimiter.bracket', ')') ? null : this._parseExpression();
    this._expect('delimiter.bracket', ')');

    const body = this._parseStatement();

    return AST.forStatement(init, test, update, body);
  }

  _parseWhileStatement() {
    this._expect('keyword', 'while');
    this._expect('delimiter.bracket', '(');

    const test = this._parseExpression();

    this._expect('delimiter.bracket', ')');

    const body = this._parseStatement();

    return AST.whileStatement(test, body);
  }

  _parseDoWhileStatement() {
    this._expect('keyword', 'do');

    const body = this._parseStatement();

    this._expect('keyword', 'while');
    this._expect('delimiter.bracket', '(');

    const test = this._parseExpression();

    this._expect('delimiter.bracket', ')');
    this._match('delimiter', ';');

    return AST.doWhileStatement(body, test);
  }

  _parseReturnStatement() {
    this._expect('keyword', 'return');

    let argument = null;
    if (!this._check('delimiter', ';') && !this._check('delimiter.bracket', '}')) {
      argument = this._parseExpression();
    }

    this._match('delimiter', ';');

    return AST.returnStatement(argument);
  }

  _parseThrowStatement() {
    this._expect('keyword', 'throw');
    const argument = this._parseExpression();
    this._match('delimiter', ';');

    return AST.throwStatement(argument);
  }

  _parseTryStatement() {
    this._expect('keyword', 'try');

    const block = this._parseBlockStatement();

    let handler = null;
    if (this._matchKeyword('catch')) {
      let param = null;
      if (this._match('delimiter.bracket', '(')) {
        param = this._parseIdentifier();
        this._expect('delimiter.bracket', ')');
      }
      const catchBody = this._parseBlockStatement();
      handler = AST.catchClause(param, catchBody);
    }

    let finalizer = null;
    if (this._matchKeyword('finally')) {
      finalizer = this._parseBlockStatement();
    }

    return AST.tryStatement(block, handler, finalizer);
  }

  _parseSwitchStatement() {
    this._expect('keyword', 'switch');
    this._expect('delimiter.bracket', '(');

    const discriminant = this._parseExpression();

    this._expect('delimiter.bracket', ')');
    this._expect('delimiter.bracket', '{');

    const cases = [];

    while (!this._check('delimiter.bracket', '}') && !this._isAtEnd()) {
      let test = null;

      if (this._matchKeyword('case')) {
        test = this._parseExpression();
      } else {
        this._expect('keyword', 'default');
      }

      this._expect('operator', ':');

      const consequent = [];
      while (!this._checkKeyword('case') && !this._checkKeyword('default') && !this._check('delimiter.bracket', '}')) {
        consequent.push(this._parseStatement());
      }

      cases.push(AST.switchCase(test, consequent));
    }

    this._expect('delimiter.bracket', '}');

    return AST.switchStatement(discriminant, cases);
  }

  _parseImportDeclaration() {
    this._expect('keyword', 'import');
    // Simplified: just skip to semicolon for now
    while (!this._check('delimiter', ';') && !this._isAtEnd()) {
      this._advance();
    }
    this._match('delimiter', ';');
    return AST.emptyStatement(); // Placeholder
  }

  _parseExportDeclaration() {
    this._expect('keyword', 'export');

    if (this._matchKeyword('default')) {
      const declaration = this._parseExpression();
      this._match('delimiter', ';');
      return AST.expressionStatement(declaration); // Simplified
    }

    return this._parseStatement();
  }

  _parseBlockStatement() {
    this._expect('delimiter.bracket', '{');

    const body = [];

    while (!this._check('delimiter.bracket', '}') && !this._isAtEnd()) {
      const stmt = this._parseStatement();
      if (stmt) body.push(stmt);
    }

    this._expect('delimiter.bracket', '}');

    return AST.blockStatement(body);
  }

  _parseExpressionStatement() {
    const expression = this._parseExpression();
    this._match('delimiter', ';');
    return AST.expressionStatement(expression);
  }

  // ----------------------------------------
  // Expression Parsing (Precedence Climbing)
  // ----------------------------------------

  _parseExpression() {
    return this._parseSequence();
  }

  _parseSequence() {
    let expr = this._parseAssignment();

    while (this._match('delimiter', ',')) {
      const right = this._parseAssignment();
      expr = { type: NodeType.SEQUENCE_EXPRESSION, expressions: [expr, right] };
    }

    return expr;
  }

  _parseAssignment() {
    const left = this._parseConditional();

    // Check for arrow function with single parameter (no parentheses)
    // e.g., n => n * 2
    if (left.type === NodeType.IDENTIFIER && this._match('operator', '=>')) {
      let body;
      let expression = true;

      if (this._check('delimiter.bracket', '{')) {
        body = this._parseBlockStatement();
        expression = false;
      } else {
        body = this._parseAssignment();
      }

      return AST.arrowFunctionExpression([left], body, expression);
    }

    if (this._matchAny('operator', ['=', '+=', '-=', '*=', '/=', '%=', '**=', '<<=', '>>=', '>>>=', '&=', '|=', '^=', '&&=', '||=', '??='])) {
      const operator = this._previous().value;
      const right = this._parseAssignment();
      return AST.assignmentExpression(operator, left, right);
    }

    return left;
  }

  _parseConditional() {
    let expr = this._parseNullishCoalescing();

    if (this._match('operator', '?')) {
      const consequent = this._parseAssignment();
      this._expect('operator', ':');
      const alternate = this._parseAssignment();
      return AST.conditionalExpression(expr, consequent, alternate);
    }

    return expr;
  }

  _parseNullishCoalescing() {
    let left = this._parseLogicalOr();

    while (this._match('operator', '??')) {
      const right = this._parseLogicalOr();
      left = AST.logicalExpression('??', left, right);
    }

    return left;
  }

  _parseLogicalOr() {
    let left = this._parseLogicalAnd();

    while (this._match('operator', '||')) {
      const right = this._parseLogicalAnd();
      left = AST.logicalExpression('||', left, right);
    }

    return left;
  }

  _parseLogicalAnd() {
    let left = this._parseBitwiseOr();

    while (this._match('operator', '&&')) {
      const right = this._parseBitwiseOr();
      left = AST.logicalExpression('&&', left, right);
    }

    return left;
  }

  _parseBitwiseOr() {
    let left = this._parseBitwiseXor();

    while (this._match('operator', '|') && !this._check('operator', '|')) {
      const right = this._parseBitwiseXor();
      left = AST.binaryExpression('|', left, right);
    }

    return left;
  }

  _parseBitwiseXor() {
    let left = this._parseBitwiseAnd();

    while (this._match('operator', '^')) {
      const right = this._parseBitwiseAnd();
      left = AST.binaryExpression('^', left, right);
    }

    return left;
  }

  _parseBitwiseAnd() {
    let left = this._parseEquality();

    while (this._match('operator', '&') && !this._check('operator', '&')) {
      const right = this._parseEquality();
      left = AST.binaryExpression('&', left, right);
    }

    return left;
  }

  _parseEquality() {
    let left = this._parseRelational();

    while (this._matchAny('operator', ['==', '!=', '===', '!=='])) {
      const operator = this._previous().value;
      const right = this._parseRelational();
      left = AST.binaryExpression(operator, left, right);
    }

    return left;
  }

  _parseRelational() {
    let left = this._parseShift();

    while (this._matchAny('operator', ['<', '>', '<=', '>=']) || this._matchKeyword('instanceof') || this._matchKeyword('in')) {
      const operator = this._previous().value;
      const right = this._parseShift();
      left = AST.binaryExpression(operator, left, right);
    }

    return left;
  }

  _parseShift() {
    let left = this._parseAdditive();

    while (this._matchAny('operator', ['<<', '>>', '>>>'])) {
      const operator = this._previous().value;
      const right = this._parseAdditive();
      left = AST.binaryExpression(operator, left, right);
    }

    return left;
  }

  _parseAdditive() {
    let left = this._parseMultiplicative();

    while (this._matchAny('operator', ['+', '-'])) {
      const operator = this._previous().value;
      const right = this._parseMultiplicative();
      left = AST.binaryExpression(operator, left, right);
    }

    return left;
  }

  _parseMultiplicative() {
    let left = this._parseExponential();

    while (this._matchAny('operator', ['*', '/', '%'])) {
      const operator = this._previous().value;
      const right = this._parseExponential();
      left = AST.binaryExpression(operator, left, right);
    }

    return left;
  }

  _parseExponential() {
    let left = this._parseUnary();

    if (this._match('operator', '**')) {
      const right = this._parseExponential(); // Right associative
      left = AST.binaryExpression('**', left, right);
    }

    return left;
  }

  _parseUnary() {
    if (this._matchAny('operator', ['!', '~', '+', '-']) || this._matchKeyword('typeof') || this._matchKeyword('void') || this._matchKeyword('delete')) {
      const operator = this._previous().value;
      const argument = this._parseUnary();
      return AST.unaryExpression(operator, argument, true);
    }

    if (this._matchAny('operator', ['++', '--'])) {
      const operator = this._previous().value;
      const argument = this._parseUnary();
      return AST.updateExpression(operator, argument, true);
    }

    return this._parsePostfix();
  }

  _parsePostfix() {
    let expr = this._parseCall();

    if (this._matchAny('operator', ['++', '--'])) {
      const operator = this._previous().value;
      return AST.updateExpression(operator, expr, false);
    }

    return expr;
  }

  _parseCall() {
    let expr = this._parsePrimary();

    while (true) {
      if (this._match('delimiter.bracket', '(')) {
        expr = this._finishCall(expr);
      } else if (this._match('delimiter', '.')) {
        const property = this._parseIdentifier();
        expr = AST.memberExpression(expr, property, false);
      } else if (this._match('operator', '?.')) {
        if (this._match('delimiter.bracket', '(')) {
          expr = this._finishCall(expr);
          expr.optional = true;
        } else {
          const property = this._parseIdentifier();
          expr = AST.memberExpression(expr, property, false, true);
        }
      } else if (this._match('delimiter.bracket', '[')) {
        const property = this._parseExpression();
        this._expect('delimiter.bracket', ']');
        expr = AST.memberExpression(expr, property, true);
      } else {
        break;
      }
    }

    return expr;
  }

  _finishCall(callee) {
    const args = [];

    if (!this._check('delimiter.bracket', ')')) {
      do {
        if (this._match('operator', '...')) {
          args.push({ type: NodeType.SPREAD_ELEMENT, argument: this._parseAssignment() });
        } else {
          args.push(this._parseAssignment());
        }
      } while (this._match('delimiter', ','));
    }

    this._expect('delimiter.bracket', ')');

    return AST.callExpression(callee, args);
  }

  _parsePrimary() {
    // this
    if (this._matchKeyword('this')) {
      return AST.thisExpression();
    }

    // new
    if (this._matchKeyword('new')) {
      // Parse member expression (identifier with member accesses, but no calls)
      let callee = this._parsePrimary();

      // Handle member access (. and []) but not function calls
      while (this._check('delimiter', '.') || this._check('delimiter.bracket', '[')) {
        if (this._match('delimiter', '.')) {
          const property = this._parseIdentifier();
          callee = AST.memberExpression(callee, property, false);
        } else if (this._match('delimiter.bracket', '[')) {
          const property = this._parseExpression();
          this._expect('delimiter.bracket', ']');
          callee = AST.memberExpression(callee, property, true);
        }
      }

      // Now parse arguments
      let args = [];
      if (this._match('delimiter.bracket', '(')) {
        if (!this._check('delimiter.bracket', ')')) {
          do {
            args.push(this._parseAssignment());
          } while (this._match('delimiter', ','));
        }
        this._expect('delimiter.bracket', ')');
      }
      return AST.newExpression(callee, args);
    }

    // Literals
    if (this._checkType('number') || this._checkType('number.float') || this._checkType('number.hex')) {
      const token = this._advance();
      return AST.literal(Number(token.value), token.value);
    }

    if (this._checkType('string')) {
      return this._parseString();
    }

    if (this._checkType('string.template')) {
      return this._parseTemplateLiteral();
    }

    if (this._checkType('keyword.literal')) {
      const token = this._advance();
      const value =
        token.value === 'true'
          ? true
          : token.value === 'false'
          ? false
          : token.value === 'null'
          ? null
          : token.value === 'undefined'
          ? undefined
          : token.value === 'NaN'
          ? NaN
          : token.value === 'Infinity'
          ? Infinity
          : null;
      return AST.literal(value, token.value);
    }

    // Object literal
    if (this._match('delimiter.bracket', '{')) {
      return this._parseObjectExpression();
    }

    // Array literal
    if (this._match('delimiter.bracket', '[')) {
      return this._parseArrayExpression();
    }

    // Arrow function or parenthesized expression
    if (this._match('delimiter.bracket', '(')) {
      // Look for arrow function
      const startPos = this._pos;

      try {
        const params = [];
        if (!this._check('delimiter.bracket', ')')) {
          do {
            if (this._match('operator', '...')) {
              params.push({ type: NodeType.REST_ELEMENT, argument: this._parseIdentifier() });
            } else {
              params.push(this._parseBindingPattern());
            }
          } while (this._match('delimiter', ','));
        }
        this._expect('delimiter.bracket', ')');

        if (this._match('operator', '=>')) {
          let body;
          let expression = true;

          if (this._check('delimiter.bracket', '{')) {
            body = this._parseBlockStatement();
            expression = false;
          } else {
            body = this._parseAssignment();
          }

          return AST.arrowFunctionExpression(params, body, expression);
        }

        // Not an arrow function - backtrack
        this._pos = startPos;
      } catch (e) {
        // Parse error - backtrack
        this._pos = startPos;
      }

      // Regular parenthesized expression
      this._match('delimiter.bracket', '('); // Re-consume
      const expr = this._parseExpression();
      this._expect('delimiter.bracket', ')');
      return expr;
    }

    // Function expression
    if (this._matchKeyword('function')) {
      let id = null;
      if (this._checkType('identifier')) {
        id = this._parseIdentifier();
      }
      const params = this._parseParameters();
      const body = this._parseBlockStatement();
      return AST.functionExpression(id, params, body);
    }

    // Identifier
    if (this._checkType('identifier') || this._checkType('function') || this._checkType('class')) {
      return this._parseIdentifier();
    }

    throw new ParseError(`Unexpected token: ${this._peek()?.value}`, this._peek(), 'expression');
  }

  _parseObjectExpression() {
    const properties = [];

    while (!this._check('delimiter.bracket', '}') && !this._isAtEnd()) {
      // Spread
      if (this._match('operator', '...')) {
        properties.push({
          type: NodeType.SPREAD_ELEMENT,
          argument: this._parseAssignment(),
        });
      } else {
        // Regular property
        const key = this._parsePropertyName();

        let value;
        let method = false;
        let shorthand = false;

        if (this._match('delimiter.bracket', '(')) {
          // Method shorthand
          const params = [];
          if (!this._check('delimiter.bracket', ')')) {
            do {
              params.push(this._parseBindingPattern());
            } while (this._match('delimiter', ','));
          }
          this._expect('delimiter.bracket', ')');
          const body = this._parseBlockStatement();
          value = AST.functionExpression(null, params, body);
          method = true;
        } else if (this._match('operator', ':')) {
          value = this._parseAssignment();
        } else {
          // Shorthand property
          value = key;
          shorthand = true;
        }

        properties.push(AST.property(key, value, 'init', method, shorthand, false));
      }

      if (!this._check('delimiter.bracket', '}')) {
        this._expect('delimiter', ',');
      }
    }

    this._expect('delimiter.bracket', '}');

    return AST.objectExpression(properties);
  }

  _parseArrayExpression() {
    const elements = [];

    while (!this._check('delimiter.bracket', ']') && !this._isAtEnd()) {
      if (this._check('delimiter', ',')) {
        elements.push(null); // Sparse array
      } else if (this._match('operator', '...')) {
        elements.push({
          type: NodeType.SPREAD_ELEMENT,
          argument: this._parseAssignment(),
        });
      } else {
        elements.push(this._parseAssignment());
      }

      if (!this._check('delimiter.bracket', ']')) {
        this._expect('delimiter', ',');
      }
    }

    this._expect('delimiter.bracket', ']');

    return AST.arrayExpression(elements);
  }

  // ----------------------------------------
  // Helper Parsers
  // ----------------------------------------

  _parseIdentifier() {
    const token = this._advance();
    if (token.type !== TokenType.IDENTIFIER && token.type !== TokenType.FUNCTION && token.type !== TokenType.CLASS) {
      throw new ParseError(`Expected identifier, got ${token.type}`, token, 'identifier');
    }
    return AST.identifier(token.value);
  }

  _parsePropertyName() {
    // Can be identifier, string, or number
    if (this._checkType('identifier') || this._checkType('function') || this._checkType('class')) {
      return this._parseIdentifier();
    }

    if (this._checkType('string')) {
      const token = this._advance();
      return AST.literal(token.value.slice(1, -1), token.value);
    }

    if (this._checkType('number')) {
      const token = this._advance();
      return AST.literal(Number(token.value), token.value);
    }

    // Computed property [expr]
    if (this._match('delimiter.bracket', '[')) {
      const expr = this._parseExpression();
      this._expect('delimiter.bracket', ']');
      return expr;
    }

    // Also accept keywords as property names
    if (this._checkKeyword()) {
      const token = this._advance();
      return AST.identifier(token.value);
    }

    throw new ParseError(`Expected property name, got ${this._peek()?.type}`, this._peek(), 'property name');
  }

  _parseBindingPattern() {
    // Object destructuring
    if (this._check('delimiter.bracket', '{')) {
      this._advance();
      const properties = [];

      while (!this._check('delimiter.bracket', '}') && !this._isAtEnd()) {
        const key = this._parsePropertyName();
        let value = key;

        if (this._match('operator', ':')) {
          value = this._parseBindingPattern();
        }

        let defaultValue = null;
        if (this._match('operator', '=')) {
          defaultValue = this._parseAssignment();
          value = { type: NodeType.ASSIGNMENT_PATTERN, left: value, right: defaultValue };
        }

        properties.push(AST.property(key, value, 'init', false, key === value, false));

        if (!this._check('delimiter.bracket', '}')) {
          this._expect('delimiter', ',');
        }
      }

      this._expect('delimiter.bracket', '}');
      return { type: NodeType.OBJECT_PATTERN, properties };
    }

    // Array destructuring
    if (this._check('delimiter.bracket', '[')) {
      this._advance();
      const elements = [];

      while (!this._check('delimiter.bracket', ']') && !this._isAtEnd()) {
        if (this._check('delimiter', ',')) {
          elements.push(null);
        } else if (this._match('operator', '...')) {
          elements.push({ type: NodeType.REST_ELEMENT, argument: this._parseIdentifier() });
        } else {
          let element = this._parseBindingPattern();

          if (this._match('operator', '=')) {
            const defaultValue = this._parseAssignment();
            element = { type: NodeType.ASSIGNMENT_PATTERN, left: element, right: defaultValue };
          }

          elements.push(element);
        }

        if (!this._check('delimiter.bracket', ']')) {
          this._expect('delimiter', ',');
        }
      }

      this._expect('delimiter.bracket', ']');
      return { type: NodeType.ARRAY_PATTERN, elements };
    }

    // Simple identifier
    return this._parseIdentifier();
  }

  _parseParameters() {
    this._expect('delimiter.bracket', '(');
    const params = [];

    if (!this._check('delimiter.bracket', ')')) {
      do {
        if (this._match('operator', '...')) {
          params.push({ type: NodeType.REST_ELEMENT, argument: this._parseIdentifier() });
          break;
        }

        let param = this._parseBindingPattern();

        if (this._match('operator', '=')) {
          const defaultValue = this._parseAssignment();
          param = { type: NodeType.ASSIGNMENT_PATTERN, left: param, right: defaultValue };
        }

        params.push(param);
      } while (this._match('delimiter', ','));
    }

    this._expect('delimiter.bracket', ')');
    return params;
  }

  _parseString() {
    // Expect opening quote
    const startToken = this._advance();
    const quoteChar = startToken.value;

    if (quoteChar !== '"' && quoteChar !== "'") {
      throw new ParseError('Expected opening quote for string', startToken, 'string');
    }

    let combinedValue = '';

    // Collect all string parts until closing quote
    while (!this._isAtEnd()) {
      const token = this._peek();

      if (token.type === 'string' && token.value === quoteChar) {
        // Closing quote - we're done
        this._advance();
        break;
      } else if (token.type === 'string' || token.type === 'string.escape' || token.type === 'string.invalid') {
        // String content, escape sequence, or invalid escape
        combinedValue += token.value;
        this._advance();
      } else {
        // Unexpected token - break
        break;
      }
    }

    return AST.literal(combinedValue, quoteChar + combinedValue + quoteChar);
  }

  _parseTemplateLiteral() {
    // Expect opening backtick
    const startToken = this._advance();
    if (startToken.value !== '`') {
      throw new ParseError('Expected opening backtick for template literal', startToken, '`');
    }

    let combinedValue = '';
    let depth = 0;

    // Collect all template parts until closing backtick
    while (!this._isAtEnd()) {
      const token = this._peek();

      if (token.type === 'delimiter.bracket' && token.value === '${') {
        depth++;
        this._advance();
        // Skip through the embedded expression
        while (!this._isAtEnd() && depth > 0) {
          const t = this._advance();
          if (t.type === 'delimiter.bracket' && t.value === '}') {
            depth--;
          } else if (t.type === 'delimiter.bracket' && t.value === '${') {
            depth++;
          }
        }
      } else if (token.type === 'string.template') {
        const value = token.value;
        this._advance();

        if (value === '`') {
          // Closing backtick - we're done
          break;
        } else {
          // Template string part
          combinedValue += value;
        }
      } else {
        // Unexpected token - break
        break;
      }
    }

    // For now, return a simple literal
    // TODO: Build proper TemplateLiteral AST node with quasis and expressions
    return AST.literal(combinedValue, '`' + combinedValue + '`');
  }

  // ----------------------------------------
  // Token Utilities
  // ----------------------------------------

  _peek() {
    return this._tokens[this._pos];
  }

  _previous() {
    return this._tokens[this._pos - 1];
  }

  _isAtEnd() {
    return this._pos >= this._tokens.length;
  }

  _advance() {
    if (!this._isAtEnd()) this._pos++;
    return this._previous();
  }

  _check(type, value) {
    if (this._isAtEnd()) return false;
    const token = this._peek();
    if (token.type !== type) return false;
    if (value !== undefined && token.value !== value) return false;
    return true;
  }

  _checkType(type) {
    if (this._isAtEnd()) return false;
    return this._peek().type === type;
  }

  _checkKeyword(keyword) {
    if (this._isAtEnd()) return false;
    const token = this._peek();
    const isKeyword = token.type === 'keyword' || token.type === TokenType.KEYWORD;
    if (keyword) {
      return isKeyword && token.value === keyword;
    }
    return isKeyword;
  }

  _match(type, value) {
    if (this._check(type, value)) {
      this._advance();
      return true;
    }
    return false;
  }

  _matchKeyword(keyword) {
    if (this._checkKeyword(keyword)) {
      this._advance();
      return true;
    }
    return false;
  }

  _matchAny(type, values) {
    for (const value of values) {
      if (this._match(type, value)) return true;
    }
    return false;
  }

  _expect(type, value) {
    if (this._check(type, value)) {
      return this._advance();
    }
    throw new ParseError(`Expected ${type}${value ? ` '${value}'` : ''}, got ${this._peek()?.type} '${this._peek()?.value}'`, this._peek(), value || type);
  }

  _synchronize() {
    this._advance();

    while (!this._isAtEnd()) {
      // End of statement
      if (this._previous().type === 'delimiter' && this._previous().value === ';') {
        return;
      }

      // Statement keywords
      if (this._checkKeyword()) {
        const kw = this._peek().value;
        if (['const', 'let', 'var', 'function', 'class', 'if', 'for', 'while', 'return', 'try'].includes(kw)) {
          return;
        }
      }

      this._advance();
    }
  }
}
