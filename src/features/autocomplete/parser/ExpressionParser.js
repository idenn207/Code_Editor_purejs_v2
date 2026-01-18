/**
 * @fileoverview Expression parser for JavaScript code analysis
 * @module features/autocomplete/parser/ExpressionParser
 */

(function(CodeEditor) {
  'use strict';

  var TokenType = CodeEditor.TokenType;
  var NodeType = CodeEditor.NodeType;
  var SimpleTokenizer = CodeEditor.SimpleTokenizer;

  // Node constructors
  var StringLiteral = CodeEditor.StringLiteral;
  var NumberLiteral = CodeEditor.NumberLiteral;
  var BooleanLiteral = CodeEditor.BooleanLiteral;
  var NullLiteral = CodeEditor.NullLiteral;
  var UndefinedLiteral = CodeEditor.UndefinedLiteral;
  var TemplateLiteral = CodeEditor.TemplateLiteral;
  var ArrayLiteral = CodeEditor.ArrayLiteral;
  var ObjectLiteral = CodeEditor.ObjectLiteral;
  var Property = CodeEditor.Property;
  var Identifier = CodeEditor.Identifier;
  var ThisExpression = CodeEditor.ThisExpression;
  var MemberExpression = CodeEditor.MemberExpression;
  var CallExpression = CodeEditor.CallExpression;
  var NewExpression = CodeEditor.NewExpression;
  var BinaryExpression = CodeEditor.BinaryExpression;
  var UnaryExpression = CodeEditor.UnaryExpression;
  var ConditionalExpression = CodeEditor.ConditionalExpression;
  var AssignmentExpression = CodeEditor.AssignmentExpression;
  var Parameter = CodeEditor.Parameter;
  var ArrowFunction = CodeEditor.ArrowFunction;
  var FunctionExpression = CodeEditor.FunctionExpression;
  var FunctionDeclaration = CodeEditor.FunctionDeclaration;
  var ClassExpression = CodeEditor.ClassExpression;
  var ClassDeclaration = CodeEditor.ClassDeclaration;
  var ClassBody = CodeEditor.ClassBody;
  var MethodDefinition = CodeEditor.MethodDefinition;
  var PropertyDefinition = CodeEditor.PropertyDefinition;
  var VariableDeclaration = CodeEditor.VariableDeclaration;
  var VariableDeclarator = CodeEditor.VariableDeclarator;
  var ReturnStatement = CodeEditor.ReturnStatement;
  var BlockStatement = CodeEditor.BlockStatement;
  var ExpressionStatement = CodeEditor.ExpressionStatement;
  var SpreadElement = CodeEditor.SpreadElement;
  var Program = CodeEditor.Program;

  // ============================================
  // ExpressionParser Class
  // ============================================

  /**
   * Parser for JavaScript expressions and basic statements
   * @class
   * @param {string} source - Source code to parse
   */
  function ExpressionParser(source) {
    /**
     * Tokenizer instance
     * @type {SimpleTokenizer}
     */
    this._tokenizer = new SimpleTokenizer(source);

    /**
     * Source code
     * @type {string}
     */
    this._source = source;
  }

  // ----------------------------------------
  // Public API
  // ----------------------------------------

  /**
   * Parse the source as a full program
   * @returns {Program}
   */
  ExpressionParser.prototype.parseProgram = function() {
    var start = this._tokenizer.getPosition();
    var body = [];

    while (!this._tokenizer.isEOF()) {
      var stmt = this._parseStatement();
      if (stmt) {
        body.push(stmt);
      }
    }

    return new Program(body, start, this._tokenizer.getPosition());
  };

  /**
   * Parse a single expression
   * @returns {Node}
   */
  ExpressionParser.prototype.parseExpression = function() {
    return this._parseAssignment();
  };

  /**
   * Parse expression (internal use)
   * @returns {Node}
   * @private
   */
  ExpressionParser.prototype._parseExpression = function() {
    return this._parseAssignment();
  };

  /**
   * Parse a single statement
   * @returns {Node}
   */
  ExpressionParser.prototype.parseStatement = function() {
    return this._parseStatement();
  };

  // ----------------------------------------
  // Statement Parsing
  // ----------------------------------------

  /**
   * Parse a statement
   * @returns {Node}
   * @private
   */
  ExpressionParser.prototype._parseStatement = function() {
    var token = this._tokenizer.peek();

    switch (token.type) {
      case TokenType.VAR:
      case TokenType.LET:
      case TokenType.CONST:
        return this._parseVariableDeclaration();

      case TokenType.FUNCTION:
        return this._parseFunctionDeclaration();

      case TokenType.ASYNC:
        return this._parseAsyncFunction();

      case TokenType.CLASS:
        return this._parseClassDeclaration();

      case TokenType.RETURN:
        return this._parseReturnStatement();

      case TokenType.LBRACE:
        return this._parseBlockStatement();

      case TokenType.SEMICOLON:
        this._tokenizer.next();
        return null;

      default:
        return this._parseExpressionStatement();
    }
  };

  /**
   * Parse variable declaration
   * @returns {VariableDeclaration}
   * @private
   */
  ExpressionParser.prototype._parseVariableDeclaration = function() {
    var start = this._tokenizer.peek().start;
    var kindToken = this._tokenizer.next();
    var kind = kindToken.value;
    var declarations = [];

    do {
      var declStart = this._tokenizer.peek().start;
      var id = this._parseIdentifier();

      var init = null;
      if (this._tokenizer.match(TokenType.ASSIGN)) {
        init = this._parseAssignment();
      }

      declarations.push(new VariableDeclarator(id, init, declStart, this._tokenizer.getPosition()));
    } while (this._tokenizer.match(TokenType.COMMA));

    this._tokenizer.match(TokenType.SEMICOLON);

    return new VariableDeclaration(kind, declarations, start, this._tokenizer.getPosition());
  };

  /**
   * Parse return statement
   * @returns {ReturnStatement}
   * @private
   */
  ExpressionParser.prototype._parseReturnStatement = function() {
    var start = this._tokenizer.next().start; // consume 'return'

    var argument = null;
    if (!this._tokenizer.check(TokenType.SEMICOLON) &&
        !this._tokenizer.check(TokenType.RBRACE) &&
        !this._tokenizer.isEOF()) {
      argument = this._parseExpression();
    }

    this._tokenizer.match(TokenType.SEMICOLON);

    return new ReturnStatement(argument, start, this._tokenizer.getPosition());
  };

  /**
   * Parse block statement
   * @returns {BlockStatement}
   * @private
   */
  ExpressionParser.prototype._parseBlockStatement = function() {
    var start = this._tokenizer.next().start; // consume '{'
    var body = [];

    while (!this._tokenizer.check(TokenType.RBRACE) && !this._tokenizer.isEOF()) {
      var stmt = this._parseStatement();
      if (stmt) {
        body.push(stmt);
      }
    }

    this._tokenizer.match(TokenType.RBRACE);

    return new BlockStatement(body, start, this._tokenizer.getPosition());
  };

  /**
   * Parse expression statement
   * @returns {ExpressionStatement}
   * @private
   */
  ExpressionParser.prototype._parseExpressionStatement = function() {
    var start = this._tokenizer.peek().start;
    var expr = this._parseExpression();

    this._tokenizer.match(TokenType.SEMICOLON);

    return new ExpressionStatement(expr, start, this._tokenizer.getPosition());
  };

  // ----------------------------------------
  // Expression Parsing
  // ----------------------------------------

  /**
   * Parse assignment expression
   * @returns {Node}
   * @private
   */
  ExpressionParser.prototype._parseAssignment = function() {
    var start = this._tokenizer.peek().start;
    var left = this._parseConditional();

    if (this._tokenizer.checkAny([TokenType.ASSIGN, TokenType.PLUS_ASSIGN, TokenType.MINUS_ASSIGN])) {
      var op = this._tokenizer.next().value;
      var right = this._parseAssignment();
      return new AssignmentExpression(op, left, right, start, this._tokenizer.getPosition());
    }

    return left;
  };

  /**
   * Parse conditional (ternary) expression
   * @returns {Node}
   * @private
   */
  ExpressionParser.prototype._parseConditional = function() {
    var start = this._tokenizer.peek().start;
    var test = this._parseLogicalOr();

    if (this._tokenizer.match(TokenType.QUESTION)) {
      var consequent = this._parseAssignment();
      this._tokenizer.expect(TokenType.COLON);
      var alternate = this._parseAssignment();
      return new ConditionalExpression(test, consequent, alternate, start, this._tokenizer.getPosition());
    }

    return test;
  };

  /**
   * Parse logical OR expression
   * @returns {Node}
   * @private
   */
  ExpressionParser.prototype._parseLogicalOr = function() {
    var start = this._tokenizer.peek().start;
    var left = this._parseLogicalAnd();

    while (this._tokenizer.checkAny([TokenType.OR, TokenType.NULLISH])) {
      var op = this._tokenizer.next().value;
      var right = this._parseLogicalAnd();
      left = new BinaryExpression(op, left, right, start, this._tokenizer.getPosition());
    }

    return left;
  };

  /**
   * Parse logical AND expression
   * @returns {Node}
   * @private
   */
  ExpressionParser.prototype._parseLogicalAnd = function() {
    var start = this._tokenizer.peek().start;
    var left = this._parseEquality();

    while (this._tokenizer.match(TokenType.AND)) {
      var right = this._parseEquality();
      left = new BinaryExpression('&&', left, right, start, this._tokenizer.getPosition());
    }

    return left;
  };

  /**
   * Parse equality expression
   * @returns {Node}
   * @private
   */
  ExpressionParser.prototype._parseEquality = function() {
    var start = this._tokenizer.peek().start;
    var left = this._parseComparison();

    while (this._tokenizer.checkAny([TokenType.EQ, TokenType.NEQ, TokenType.STRICT_EQ, TokenType.STRICT_NEQ])) {
      var op = this._tokenizer.next().value;
      var right = this._parseComparison();
      left = new BinaryExpression(op, left, right, start, this._tokenizer.getPosition());
    }

    return left;
  };

  /**
   * Parse comparison expression
   * @returns {Node}
   * @private
   */
  ExpressionParser.prototype._parseComparison = function() {
    var start = this._tokenizer.peek().start;
    var left = this._parseAdditive();

    while (this._tokenizer.checkAny([TokenType.LT, TokenType.GT, TokenType.LTE, TokenType.GTE, TokenType.INSTANCEOF, TokenType.IN])) {
      var op = this._tokenizer.next().value;
      var right = this._parseAdditive();
      left = new BinaryExpression(op, left, right, start, this._tokenizer.getPosition());
    }

    return left;
  };

  /**
   * Parse additive expression
   * @returns {Node}
   * @private
   */
  ExpressionParser.prototype._parseAdditive = function() {
    var start = this._tokenizer.peek().start;
    var left = this._parseMultiplicative();

    while (this._tokenizer.checkAny([TokenType.PLUS, TokenType.MINUS])) {
      var op = this._tokenizer.next().value;
      var right = this._parseMultiplicative();
      left = new BinaryExpression(op, left, right, start, this._tokenizer.getPosition());
    }

    return left;
  };

  /**
   * Parse multiplicative expression
   * @returns {Node}
   * @private
   */
  ExpressionParser.prototype._parseMultiplicative = function() {
    var start = this._tokenizer.peek().start;
    var left = this._parseUnary();

    while (this._tokenizer.checkAny([TokenType.STAR, TokenType.SLASH, TokenType.PERCENT])) {
      var op = this._tokenizer.next().value;
      var right = this._parseUnary();
      left = new BinaryExpression(op, left, right, start, this._tokenizer.getPosition());
    }

    return left;
  };

  /**
   * Parse unary expression
   * @returns {Node}
   * @private
   */
  ExpressionParser.prototype._parseUnary = function() {
    if (this._tokenizer.checkAny([TokenType.NOT, TokenType.MINUS, TokenType.PLUS, TokenType.TYPEOF])) {
      var start = this._tokenizer.peek().start;
      var op = this._tokenizer.next().value;
      var argument = this._parseUnary();
      return new UnaryExpression(op, argument, true, start, this._tokenizer.getPosition());
    }

    if (this._tokenizer.check(TokenType.NEW)) {
      return this._parseNewExpression();
    }

    return this._parseCallMember();
  };

  /**
   * Parse new expression
   * @returns {NewExpression}
   * @private
   */
  ExpressionParser.prototype._parseNewExpression = function() {
    var start = this._tokenizer.next().start; // consume 'new'
    var callee = this._parseCallMember();
    var args = [];

    // Arguments are parsed as part of call expression if present
    if (callee.type === NodeType.CALL_EXPRESSION) {
      return new NewExpression(callee.callee, callee.arguments, start, this._tokenizer.getPosition());
    }

    return new NewExpression(callee, args, start, this._tokenizer.getPosition());
  };

  /**
   * Parse call/member expression
   * @returns {Node}
   * @private
   */
  ExpressionParser.prototype._parseCallMember = function() {
    var member = this._parseMember();
    return this._parseCallSuffix(member);
  };

  /**
   * Parse call suffix (arguments)
   * @param {Node} callee - Function to call
   * @returns {Node}
   * @private
   */
  ExpressionParser.prototype._parseCallSuffix = function(callee) {
    if (this._tokenizer.check(TokenType.LPAREN)) {
      var start = callee.start;
      this._tokenizer.next(); // consume '('
      var args = this._parseArguments();
      this._tokenizer.expect(TokenType.RPAREN);

      var call = new CallExpression(callee, args, false, start, this._tokenizer.getPosition());

      // Check for chained member/call
      if (this._tokenizer.checkAny([TokenType.DOT, TokenType.OPTIONAL_CHAIN, TokenType.LBRACKET, TokenType.LPAREN])) {
        return this._parseCallMemberSuffix(call);
      }

      return call;
    }

    return callee;
  };

  /**
   * Parse chained member/call suffixes
   * @param {Node} object - Base object
   * @returns {Node}
   * @private
   */
  ExpressionParser.prototype._parseCallMemberSuffix = function(object) {
    while (true) {
      if (this._tokenizer.checkAny([TokenType.DOT, TokenType.OPTIONAL_CHAIN])) {
        var optional = this._tokenizer.peek().type === TokenType.OPTIONAL_CHAIN;
        this._tokenizer.next();

        var property = this._parseIdentifier();
        object = new MemberExpression(object, property, false, optional, object.start, this._tokenizer.getPosition());
      } else if (this._tokenizer.check(TokenType.LBRACKET)) {
        this._tokenizer.next();
        var prop = this._parseExpression();
        this._tokenizer.expect(TokenType.RBRACKET);
        object = new MemberExpression(object, prop, true, false, object.start, this._tokenizer.getPosition());
      } else if (this._tokenizer.check(TokenType.LPAREN)) {
        this._tokenizer.next();
        var args = this._parseArguments();
        this._tokenizer.expect(TokenType.RPAREN);
        object = new CallExpression(object, args, false, object.start, this._tokenizer.getPosition());
      } else {
        break;
      }
    }

    return object;
  };

  /**
   * Parse member expression
   * @returns {Node}
   * @private
   */
  ExpressionParser.prototype._parseMember = function() {
    var object = this._parsePrimary();

    while (this._tokenizer.checkAny([TokenType.DOT, TokenType.OPTIONAL_CHAIN, TokenType.LBRACKET])) {
      if (this._tokenizer.checkAny([TokenType.DOT, TokenType.OPTIONAL_CHAIN])) {
        var optional = this._tokenizer.peek().type === TokenType.OPTIONAL_CHAIN;
        this._tokenizer.next();

        var property = this._parseIdentifier();
        object = new MemberExpression(object, property, false, optional, object.start, this._tokenizer.getPosition());
      } else if (this._tokenizer.check(TokenType.LBRACKET)) {
        this._tokenizer.next();
        var prop = this._parseExpression();
        this._tokenizer.expect(TokenType.RBRACKET);
        object = new MemberExpression(object, prop, true, false, object.start, this._tokenizer.getPosition());
      }
    }

    return object;
  };

  /**
   * Parse primary expression
   * @returns {Node}
   * @private
   */
  ExpressionParser.prototype._parsePrimary = function() {
    var token = this._tokenizer.peek();

    switch (token.type) {
      case TokenType.STRING:
        this._tokenizer.next();
        return new StringLiteral(token.value, token.start, token.end);

      case TokenType.NUMBER:
        this._tokenizer.next();
        return new NumberLiteral(parseFloat(token.value), token.value, token.start, token.end);

      case TokenType.BOOLEAN:
        this._tokenizer.next();
        return new BooleanLiteral(token.value === 'true', token.start, token.end);

      case TokenType.NULL:
        this._tokenizer.next();
        return new NullLiteral(token.start, token.end);

      case TokenType.UNDEFINED:
        this._tokenizer.next();
        return new UndefinedLiteral(token.start, token.end);

      case TokenType.TEMPLATE:
        this._tokenizer.next();
        return new TemplateLiteral(token.value, [], token.start, token.end);

      case TokenType.THIS:
        this._tokenizer.next();
        return new ThisExpression(token.start, token.end);

      case TokenType.IDENTIFIER:
        return this._parseIdentifierOrArrow();

      case TokenType.LBRACKET:
        return this._parseArrayLiteral();

      case TokenType.LBRACE:
        return this._parseObjectLiteral();

      case TokenType.LPAREN:
        return this._parseParenthesizedOrArrow();

      case TokenType.FUNCTION:
        return this._parseFunctionExpression();

      case TokenType.CLASS:
        return this._parseClassExpression();

      case TokenType.ASYNC:
        return this._parseAsyncFunction();

      default:
        // Return an identifier for unknown tokens to be more forgiving
        if (token.type === TokenType.EOF) {
          return new Identifier('', token.start, token.end);
        }
        this._tokenizer.next();
        return new Identifier(token.value, token.start, token.end);
    }
  };

  /**
   * Parse identifier or arrow function
   * @returns {Node}
   * @private
   */
  ExpressionParser.prototype._parseIdentifierOrArrow = function() {
    var start = this._tokenizer.peek().start;
    var id = this._parseIdentifier();

    // Check for arrow function: x => ...
    if (this._tokenizer.check(TokenType.ARROW)) {
      this._tokenizer.next();
      var param = new Parameter(id.name, null, false, id.start, id.end);
      var body = this._parseArrowBody();
      var isExpression = body.type !== NodeType.BLOCK_STATEMENT;
      return new ArrowFunction([param], body, isExpression, false, start, this._tokenizer.getPosition());
    }

    return id;
  };

  /**
   * Parse parenthesized expression or arrow function
   * @returns {Node}
   * @private
   */
  ExpressionParser.prototype._parseParenthesizedOrArrow = function() {
    var start = this._tokenizer.peek().start;
    this._tokenizer.next(); // consume '('

    // Empty parens -> arrow function
    if (this._tokenizer.check(TokenType.RPAREN)) {
      this._tokenizer.next();
      if (this._tokenizer.check(TokenType.ARROW)) {
        this._tokenizer.next();
        var body = this._parseArrowBody();
        var isExpression = body.type !== NodeType.BLOCK_STATEMENT;
        return new ArrowFunction([], body, isExpression, false, start, this._tokenizer.getPosition());
      }
      // Empty parentheses not followed by arrow - return as empty identifier
      return new Identifier('', start, this._tokenizer.getPosition());
    }

    // Try to parse as parameters for arrow function
    var params = this._tryParseArrowParams();

    if (params !== null && this._tokenizer.check(TokenType.ARROW)) {
      this._tokenizer.next();
      var body = this._parseArrowBody();
      var isExpression = body.type !== NodeType.BLOCK_STATEMENT;
      return new ArrowFunction(params, body, isExpression, false, start, this._tokenizer.getPosition());
    }

    // Not an arrow function - parse as parenthesized expression
    this._tokenizer.reset(start + 1); // Reset to after '('
    var expr = this._parseExpression();
    this._tokenizer.expect(TokenType.RPAREN);

    // Check if followed by arrow (single param case)
    if (this._tokenizer.check(TokenType.ARROW)) {
      this._tokenizer.next();
      var param = this._expressionToParam(expr);
      var body = this._parseArrowBody();
      var isExpression = body.type !== NodeType.BLOCK_STATEMENT;
      return new ArrowFunction([param], body, isExpression, false, start, this._tokenizer.getPosition());
    }

    return expr;
  };

  /**
   * Try to parse arrow function parameters
   * @returns {Parameter[]|null}
   * @private
   */
  ExpressionParser.prototype._tryParseArrowParams = function() {
    var params = [];
    var startPos = this._tokenizer.getPosition();

    try {
      // Check for rest parameter first
      if (this._tokenizer.check(TokenType.SPREAD)) {
        this._tokenizer.next();
        var restId = this._parseIdentifier();
        params.push(new Parameter(restId.name, null, true, restId.start, restId.end));

        if (!this._tokenizer.check(TokenType.RPAREN)) {
          this._tokenizer.reset(startPos);
          return null;
        }
        this._tokenizer.next(); // consume ')'
        return params;
      }

      do {
        if (this._tokenizer.check(TokenType.SPREAD)) {
          this._tokenizer.next();
          var restId = this._parseIdentifier();
          params.push(new Parameter(restId.name, null, true, restId.start, restId.end));
          break;
        }

        if (!this._tokenizer.check(TokenType.IDENTIFIER)) {
          this._tokenizer.reset(startPos);
          return null;
        }

        var id = this._parseIdentifier();
        var defaultValue = null;

        if (this._tokenizer.match(TokenType.ASSIGN)) {
          defaultValue = this._parseAssignment();
        }

        params.push(new Parameter(id.name, defaultValue, false, id.start, this._tokenizer.getPosition()));
      } while (this._tokenizer.match(TokenType.COMMA));

      if (!this._tokenizer.check(TokenType.RPAREN)) {
        this._tokenizer.reset(startPos);
        return null;
      }

      this._tokenizer.next(); // consume ')'
      return params;
    } catch (e) {
      this._tokenizer.reset(startPos);
      return null;
    }
  };

  /**
   * Convert expression to parameter
   * @param {Node} expr - Expression to convert
   * @returns {Parameter}
   * @private
   */
  ExpressionParser.prototype._expressionToParam = function(expr) {
    if (expr.type === NodeType.IDENTIFIER) {
      return new Parameter(expr.name, null, false, expr.start, expr.end);
    }
    if (expr.type === NodeType.ASSIGNMENT_EXPRESSION && expr.left.type === NodeType.IDENTIFIER) {
      return new Parameter(expr.left.name, expr.right, false, expr.start, expr.end);
    }
    return new Parameter('', null, false, expr.start, expr.end);
  };

  /**
   * Parse arrow function body
   * @returns {Node}
   * @private
   */
  ExpressionParser.prototype._parseArrowBody = function() {
    if (this._tokenizer.check(TokenType.LBRACE)) {
      return this._parseBlockStatement();
    }
    return this._parseAssignment();
  };

  /**
   * Parse array literal
   * @returns {ArrayLiteral}
   * @private
   */
  ExpressionParser.prototype._parseArrayLiteral = function() {
    var start = this._tokenizer.next().start; // consume '['
    var elements = [];

    while (!this._tokenizer.check(TokenType.RBRACKET) && !this._tokenizer.isEOF()) {
      if (this._tokenizer.check(TokenType.COMMA)) {
        elements.push(null); // Hole in array
        this._tokenizer.next();
        continue;
      }

      if (this._tokenizer.check(TokenType.SPREAD)) {
        var spreadStart = this._tokenizer.next().start;
        var arg = this._parseAssignment();
        elements.push(new SpreadElement(arg, spreadStart, this._tokenizer.getPosition()));
      } else {
        elements.push(this._parseAssignment());
      }

      if (!this._tokenizer.check(TokenType.RBRACKET)) {
        this._tokenizer.match(TokenType.COMMA);
      }
    }

    this._tokenizer.expect(TokenType.RBRACKET);

    return new ArrayLiteral(elements, start, this._tokenizer.getPosition());
  };

  /**
   * Parse object literal
   * @returns {ObjectLiteral}
   * @private
   */
  ExpressionParser.prototype._parseObjectLiteral = function() {
    var start = this._tokenizer.next().start; // consume '{'
    var properties = [];

    while (!this._tokenizer.check(TokenType.RBRACE) && !this._tokenizer.isEOF()) {
      properties.push(this._parseObjectProperty());

      if (!this._tokenizer.check(TokenType.RBRACE)) {
        this._tokenizer.match(TokenType.COMMA);
      }
    }

    this._tokenizer.expect(TokenType.RBRACE);

    return new ObjectLiteral(properties, start, this._tokenizer.getPosition());
  };

  /**
   * Parse object property
   * @returns {Property}
   * @private
   */
  ExpressionParser.prototype._parseObjectProperty = function() {
    var start = this._tokenizer.peek().start;
    var computed = false;
    var shorthand = false;
    var kind = 'init';
    var key;
    var value;

    // Spread property
    if (this._tokenizer.check(TokenType.SPREAD)) {
      this._tokenizer.next();
      var arg = this._parseAssignment();
      return new Property(null, new SpreadElement(arg, start, this._tokenizer.getPosition()), false, false, 'init', start, this._tokenizer.getPosition());
    }

    // Getter/Setter
    if (this._tokenizer.checkAny([TokenType.GET, TokenType.SET])) {
      var kindToken = this._tokenizer.next();
      if (!this._tokenizer.checkAny([TokenType.COLON, TokenType.COMMA, TokenType.RBRACE, TokenType.LPAREN])) {
        kind = kindToken.value;
        key = this._parsePropertyKey();
        value = this._parseMethodValue();
        return new Property(key.key, value, key.computed, false, kind, start, this._tokenizer.getPosition());
      }
      // 'get' or 'set' is actually the property name
      key = new Identifier(kindToken.value, kindToken.start, kindToken.end);
    } else {
      key = this._parsePropertyKey();
    }

    // Method shorthand
    if (this._tokenizer.check(TokenType.LPAREN)) {
      value = this._parseMethodValue();
      return new Property(key.key || key, value, key.computed || false, false, 'init', start, this._tokenizer.getPosition());
    }

    // Regular property
    if (this._tokenizer.match(TokenType.COLON)) {
      value = this._parseAssignment();
    } else {
      // Shorthand property
      shorthand = true;
      value = key.key || key;
    }

    return new Property(key.key || key, value, key.computed || false, shorthand, 'init', start, this._tokenizer.getPosition());
  };

  /**
   * Parse property key
   * @returns {{key: Node, computed: boolean}|Node}
   * @private
   */
  ExpressionParser.prototype._parsePropertyKey = function() {
    if (this._tokenizer.check(TokenType.LBRACKET)) {
      this._tokenizer.next();
      var key = this._parseAssignment();
      this._tokenizer.expect(TokenType.RBRACKET);
      return { key: key, computed: true };
    }

    if (this._tokenizer.check(TokenType.STRING)) {
      var token = this._tokenizer.next();
      return new StringLiteral(token.value, token.start, token.end);
    }

    if (this._tokenizer.check(TokenType.NUMBER)) {
      var token = this._tokenizer.next();
      return new NumberLiteral(parseFloat(token.value), token.value, token.start, token.end);
    }

    return this._parseIdentifier();
  };

  /**
   * Parse method value (function without 'function' keyword)
   * @returns {FunctionExpression}
   * @private
   */
  ExpressionParser.prototype._parseMethodValue = function() {
    var start = this._tokenizer.peek().start;
    var async = false;
    var generator = false;

    this._tokenizer.expect(TokenType.LPAREN);
    var params = this._parseParameters();
    this._tokenizer.expect(TokenType.RPAREN);

    var body = this._parseBlockStatement();

    return new FunctionExpression(null, params, body, async, generator, start, this._tokenizer.getPosition());
  };

  /**
   * Parse function expression
   * @returns {FunctionExpression}
   * @private
   */
  ExpressionParser.prototype._parseFunctionExpression = function() {
    var start = this._tokenizer.next().start; // consume 'function'
    var generator = false;

    if (this._tokenizer.check(TokenType.STAR)) {
      generator = true;
      this._tokenizer.next();
    }

    var id = null;
    if (this._tokenizer.check(TokenType.IDENTIFIER)) {
      id = this._parseIdentifier();
    }

    this._tokenizer.expect(TokenType.LPAREN);
    var params = this._parseParameters();
    this._tokenizer.expect(TokenType.RPAREN);

    var body = this._parseBlockStatement();

    return new FunctionExpression(id, params, body, false, generator, start, this._tokenizer.getPosition());
  };

  /**
   * Parse function declaration
   * @returns {FunctionDeclaration}
   * @private
   */
  ExpressionParser.prototype._parseFunctionDeclaration = function() {
    var start = this._tokenizer.next().start; // consume 'function'
    var generator = false;

    if (this._tokenizer.check(TokenType.STAR)) {
      generator = true;
      this._tokenizer.next();
    }

    var id = this._parseIdentifier();

    this._tokenizer.expect(TokenType.LPAREN);
    var params = this._parseParameters();
    this._tokenizer.expect(TokenType.RPAREN);

    var body = this._parseBlockStatement();

    return new FunctionDeclaration(id, params, body, false, generator, start, this._tokenizer.getPosition());
  };

  /**
   * Parse async function
   * @returns {Node}
   * @private
   */
  ExpressionParser.prototype._parseAsyncFunction = function() {
    var start = this._tokenizer.next().start; // consume 'async'

    if (this._tokenizer.check(TokenType.FUNCTION)) {
      this._tokenizer.next();

      var generator = false;
      var id = null;

      if (this._tokenizer.check(TokenType.IDENTIFIER)) {
        id = this._parseIdentifier();
      }

      this._tokenizer.expect(TokenType.LPAREN);
      var params = this._parseParameters();
      this._tokenizer.expect(TokenType.RPAREN);

      var body = this._parseBlockStatement();

      if (id) {
        var func = new FunctionDeclaration(id, params, body, true, generator, start, this._tokenizer.getPosition());
        return func;
      }
      return new FunctionExpression(null, params, body, true, generator, start, this._tokenizer.getPosition());
    }

    // Async arrow function
    if (this._tokenizer.check(TokenType.LPAREN)) {
      this._tokenizer.next();
      var params = this._parseParameters();
      this._tokenizer.expect(TokenType.RPAREN);
      this._tokenizer.expect(TokenType.ARROW);
      var body = this._parseArrowBody();
      var isExpression = body.type !== NodeType.BLOCK_STATEMENT;
      return new ArrowFunction(params, body, isExpression, true, start, this._tokenizer.getPosition());
    }

    // Async arrow with single param
    if (this._tokenizer.check(TokenType.IDENTIFIER)) {
      var id = this._parseIdentifier();
      if (this._tokenizer.check(TokenType.ARROW)) {
        this._tokenizer.next();
        var param = new Parameter(id.name, null, false, id.start, id.end);
        var body = this._parseArrowBody();
        var isExpression = body.type !== NodeType.BLOCK_STATEMENT;
        return new ArrowFunction([param], body, isExpression, true, start, this._tokenizer.getPosition());
      }
      return id;
    }

    return new Identifier('async', start, this._tokenizer.getPosition());
  };

  /**
   * Parse function parameters
   * @returns {Parameter[]}
   * @private
   */
  ExpressionParser.prototype._parseParameters = function() {
    var params = [];

    while (!this._tokenizer.check(TokenType.RPAREN) && !this._tokenizer.isEOF()) {
      if (this._tokenizer.check(TokenType.SPREAD)) {
        this._tokenizer.next();
        var restId = this._parseIdentifier();
        params.push(new Parameter(restId.name, null, true, restId.start, restId.end));
        break;
      }

      var paramStart = this._tokenizer.peek().start;
      var id = this._parseIdentifier();
      var defaultValue = null;

      if (this._tokenizer.match(TokenType.ASSIGN)) {
        defaultValue = this._parseAssignment();
      }

      params.push(new Parameter(id.name, defaultValue, false, paramStart, this._tokenizer.getPosition()));

      if (!this._tokenizer.check(TokenType.RPAREN)) {
        this._tokenizer.match(TokenType.COMMA);
      }
    }

    return params;
  };

  /**
   * Parse call arguments
   * @returns {Node[]}
   * @private
   */
  ExpressionParser.prototype._parseArguments = function() {
    var args = [];

    while (!this._tokenizer.check(TokenType.RPAREN) && !this._tokenizer.isEOF()) {
      if (this._tokenizer.check(TokenType.SPREAD)) {
        var spreadStart = this._tokenizer.next().start;
        var arg = this._parseAssignment();
        args.push(new SpreadElement(arg, spreadStart, this._tokenizer.getPosition()));
      } else {
        args.push(this._parseAssignment());
      }

      if (!this._tokenizer.check(TokenType.RPAREN)) {
        this._tokenizer.match(TokenType.COMMA);
      }
    }

    return args;
  };

  // ----------------------------------------
  // Class Parsing
  // ----------------------------------------

  /**
   * Parse class expression
   * @returns {ClassExpression}
   * @private
   */
  ExpressionParser.prototype._parseClassExpression = function() {
    var start = this._tokenizer.next().start; // consume 'class'

    var id = null;
    if (this._tokenizer.check(TokenType.IDENTIFIER)) {
      id = this._parseIdentifier();
    }

    var superClass = null;
    if (this._tokenizer.match(TokenType.EXTENDS)) {
      superClass = this._parseCallMember();
    }

    var body = this._parseClassBody();

    return new ClassExpression(id, superClass, body, start, this._tokenizer.getPosition());
  };

  /**
   * Parse class declaration
   * @returns {ClassDeclaration}
   * @private
   */
  ExpressionParser.prototype._parseClassDeclaration = function() {
    var start = this._tokenizer.next().start; // consume 'class'

    var id = this._parseIdentifier();

    var superClass = null;
    if (this._tokenizer.match(TokenType.EXTENDS)) {
      superClass = this._parseCallMember();
    }

    var body = this._parseClassBody();

    return new ClassDeclaration(id, superClass, body, start, this._tokenizer.getPosition());
  };

  /**
   * Parse class body
   * @returns {ClassBody}
   * @private
   */
  ExpressionParser.prototype._parseClassBody = function() {
    var start = this._tokenizer.expect(TokenType.LBRACE).start;
    var body = [];

    while (!this._tokenizer.check(TokenType.RBRACE) && !this._tokenizer.isEOF()) {
      var member = this._parseClassMember();
      if (member) {
        body.push(member);
      }
    }

    this._tokenizer.expect(TokenType.RBRACE);

    return new ClassBody(body, start, this._tokenizer.getPosition());
  };

  /**
   * Parse class member
   * @returns {Node}
   * @private
   */
  ExpressionParser.prototype._parseClassMember = function() {
    var start = this._tokenizer.peek().start;
    var isStatic = false;
    var kind = 'method';

    // Skip semicolons
    if (this._tokenizer.match(TokenType.SEMICOLON)) {
      return null;
    }

    // Static modifier
    if (this._tokenizer.check(TokenType.STATIC)) {
      var staticToken = this._tokenizer.next();
      // Check if 'static' is followed by a property name or method
      if (!this._tokenizer.checkAny([TokenType.LPAREN, TokenType.ASSIGN, TokenType.SEMICOLON])) {
        isStatic = true;
      } else {
        // 'static' is the member name
        return this._parseClassMemberWithKey(new Identifier('static', staticToken.start, staticToken.end), start, false);
      }
    }

    // Getter/Setter
    if (this._tokenizer.checkAny([TokenType.GET, TokenType.SET])) {
      var kindToken = this._tokenizer.next();
      if (!this._tokenizer.checkAny([TokenType.LPAREN, TokenType.ASSIGN, TokenType.SEMICOLON])) {
        kind = kindToken.value;
        var key = this._parseClassMemberKey();
        return this._parseClassMemberWithKey(key, start, isStatic, kind);
      }
      // 'get' or 'set' is the member name
      return this._parseClassMemberWithKey(new Identifier(kindToken.value, kindToken.start, kindToken.end), start, isStatic);
    }

    // Async method
    if (this._tokenizer.check(TokenType.ASYNC)) {
      this._tokenizer.next();
      // TODO: Handle async methods properly
    }

    // Generator method
    var isGenerator = false;
    if (this._tokenizer.check(TokenType.STAR)) {
      this._tokenizer.next();
      isGenerator = true;
    }

    var key = this._parseClassMemberKey();
    return this._parseClassMemberWithKey(key, start, isStatic, kind, isGenerator);
  };

  /**
   * Parse class member key
   * @returns {Node}
   * @private
   */
  ExpressionParser.prototype._parseClassMemberKey = function() {
    if (this._tokenizer.check(TokenType.LBRACKET)) {
      this._tokenizer.next();
      var key = this._parseAssignment();
      this._tokenizer.expect(TokenType.RBRACKET);
      return { key: key, computed: true };
    }

    if (this._tokenizer.check(TokenType.STRING)) {
      var token = this._tokenizer.next();
      return new StringLiteral(token.value, token.start, token.end);
    }

    if (this._tokenizer.check(TokenType.NUMBER)) {
      var token = this._tokenizer.next();
      return new NumberLiteral(parseFloat(token.value), token.value, token.start, token.end);
    }

    return this._parseIdentifier();
  };

  /**
   * Parse class member with known key
   * @param {Node} key - Member key
   * @param {number} start - Start position
   * @param {boolean} isStatic - Is static member
   * @param {string} kind - Member kind
   * @param {boolean} isGenerator - Is generator method
   * @returns {Node}
   * @private
   */
  ExpressionParser.prototype._parseClassMemberWithKey = function(key, start, isStatic, kind, isGenerator) {
    kind = kind || 'method';
    var computed = key.computed || false;
    var keyNode = key.key || key;

    // Check for constructor
    if (keyNode.type === NodeType.IDENTIFIER && keyNode.name === 'constructor' && !isStatic) {
      kind = 'constructor';
    }

    // Method
    if (this._tokenizer.check(TokenType.LPAREN)) {
      this._tokenizer.next();
      var params = this._parseParameters();
      this._tokenizer.expect(TokenType.RPAREN);
      var body = this._parseBlockStatement();
      var value = new FunctionExpression(null, params, body, false, isGenerator || false, start, this._tokenizer.getPosition());
      return new MethodDefinition(keyNode, value, kind, computed, isStatic, start, this._tokenizer.getPosition());
    }

    // Property with initializer
    var initValue = null;
    if (this._tokenizer.match(TokenType.ASSIGN)) {
      initValue = this._parseAssignment();
    }

    this._tokenizer.match(TokenType.SEMICOLON);

    return new PropertyDefinition(keyNode, initValue, computed, isStatic, start, this._tokenizer.getPosition());
  };

  /**
   * Parse identifier
   * @returns {Identifier}
   * @private
   */
  ExpressionParser.prototype._parseIdentifier = function() {
    var token = this._tokenizer.peek();

    // Accept identifier or keyword as identifier
    if (token.type === TokenType.IDENTIFIER ||
        token.type === TokenType.KEYWORD ||
        token.type === TokenType.GET ||
        token.type === TokenType.SET ||
        token.type === TokenType.ASYNC ||
        token.type === TokenType.STATIC ||
        token.type === TokenType.CONSTRUCTOR) {
      this._tokenizer.next();
      return new Identifier(token.value, token.start, token.end);
    }

    // More lenient - accept any token value
    this._tokenizer.next();
    return new Identifier(token.value || '', token.start, token.end);
  };

  // ============================================
  // Static Methods
  // ============================================

  /**
   * Parse source code into AST
   * @param {string} source - Source code
   * @returns {Program}
   */
  ExpressionParser.parse = function(source) {
    var parser = new ExpressionParser(source);
    return parser.parseProgram();
  };

  /**
   * Parse a single expression
   * @param {string} source - Expression source
   * @returns {Node}
   */
  ExpressionParser.parseExpression = function(source) {
    var parser = new ExpressionParser(source);
    return parser.parseExpression();
  };

  // ============================================
  // Export
  // ============================================

  CodeEditor.ExpressionParser = ExpressionParser;

})(window.CodeEditor = window.CodeEditor || {});
