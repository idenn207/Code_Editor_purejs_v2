/**
 * @fileoverview Simple tokenizer for JavaScript expression parsing
 * @module features/autocomplete/parser/SimpleTokenizer
 */

(function(CodeEditor) {
  'use strict';

  // ============================================
  // Token Types
  // ============================================

  /**
   * Token type enumeration
   * @enum {string}
   */
  var TokenType = Object.freeze({
    // Literals
    STRING: 'string',
    NUMBER: 'number',
    BOOLEAN: 'boolean',
    NULL: 'null',
    UNDEFINED: 'undefined',
    REGEX: 'regex',
    TEMPLATE: 'template',

    // Identifiers and keywords
    IDENTIFIER: 'identifier',
    KEYWORD: 'keyword',
    THIS: 'this',

    // Operators
    DOT: 'dot',
    OPTIONAL_CHAIN: 'optionalChain',
    COMMA: 'comma',
    COLON: 'colon',
    SEMICOLON: 'semicolon',
    QUESTION: 'question',
    ARROW: 'arrow',
    SPREAD: 'spread',

    // Assignment
    ASSIGN: 'assign',
    PLUS_ASSIGN: 'plusAssign',
    MINUS_ASSIGN: 'minusAssign',

    // Arithmetic
    PLUS: 'plus',
    MINUS: 'minus',
    STAR: 'star',
    SLASH: 'slash',
    PERCENT: 'percent',
    POWER: 'power',

    // Comparison
    EQ: 'eq',
    NEQ: 'neq',
    STRICT_EQ: 'strictEq',
    STRICT_NEQ: 'strictNeq',
    LT: 'lt',
    GT: 'gt',
    LTE: 'lte',
    GTE: 'gte',

    // Logical
    AND: 'and',
    OR: 'or',
    NOT: 'not',
    NULLISH: 'nullish',

    // Brackets
    LPAREN: 'lparen',
    RPAREN: 'rparen',
    LBRACKET: 'lbracket',
    RBRACKET: 'rbracket',
    LBRACE: 'lbrace',
    RBRACE: 'rbrace',

    // Special
    NEW: 'new',
    TYPEOF: 'typeof',
    INSTANCEOF: 'instanceof',
    IN: 'in',
    OF: 'of',

    // Class/Function keywords
    CLASS: 'class',
    EXTENDS: 'extends',
    STATIC: 'static',
    GET: 'get',
    SET: 'set',
    ASYNC: 'async',
    FUNCTION: 'function',
    RETURN: 'return',
    CONSTRUCTOR: 'constructor',

    // Variable declarations
    VAR: 'var',
    LET: 'let',
    CONST: 'const',

    // Misc
    EOF: 'eof',
    UNKNOWN: 'unknown'
  });

  /**
   * JavaScript keywords
   * @type {Set<string>}
   */
  var KEYWORDS = new Set([
    'break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete',
    'do', 'else', 'finally', 'for', 'function', 'if', 'in', 'instanceof',
    'new', 'return', 'switch', 'this', 'throw', 'try', 'typeof', 'var',
    'void', 'while', 'with', 'class', 'const', 'enum', 'export', 'extends',
    'import', 'super', 'implements', 'interface', 'let', 'package', 'private',
    'protected', 'public', 'static', 'yield', 'async', 'await', 'of', 'get', 'set'
  ]);

  // ============================================
  // Token Class
  // ============================================

  /**
   * Represents a token
   * @class
   * @param {string} type - Token type
   * @param {string} value - Token value
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function Token(type, value, start, end) {
    this.type = type;
    this.value = value;
    this.start = start;
    this.end = end;
  }

  // ============================================
  // SimpleTokenizer Class
  // ============================================

  /**
   * Simple tokenizer for JavaScript expressions
   * @class
   * @param {string} source - Source code to tokenize
   */
  function SimpleTokenizer(source) {
    /**
     * Source code
     * @type {string}
     */
    this._source = source || '';

    /**
     * Current position
     * @type {number}
     */
    this._pos = 0;

    /**
     * Peeked token (for lookahead)
     * @type {Token|null}
     */
    this._peeked = null;
  }

  // ----------------------------------------
  // Main Interface
  // ----------------------------------------

  /**
   * Get the next token
   * @returns {Token}
   */
  SimpleTokenizer.prototype.next = function() {
    if (this._peeked) {
      var token = this._peeked;
      this._peeked = null;
      return token;
    }

    return this._readToken();
  };

  /**
   * Peek at the next token without consuming it
   * @returns {Token}
   */
  SimpleTokenizer.prototype.peek = function() {
    if (!this._peeked) {
      this._peeked = this._readToken();
    }
    return this._peeked;
  };

  /**
   * Check if next token matches a type
   * @param {string} type - Token type to check
   * @returns {boolean}
   */
  SimpleTokenizer.prototype.check = function(type) {
    return this.peek().type === type;
  };

  /**
   * Check if next token matches any of the given types
   * @param {string[]} types - Token types to check
   * @returns {boolean}
   */
  SimpleTokenizer.prototype.checkAny = function(types) {
    var nextType = this.peek().type;
    for (var i = 0; i < types.length; i++) {
      if (nextType === types[i]) return true;
    }
    return false;
  };

  /**
   * Consume token if it matches the expected type
   * @param {string} type - Expected token type
   * @returns {Token|null}
   */
  SimpleTokenizer.prototype.match = function(type) {
    if (this.check(type)) {
      return this.next();
    }
    return null;
  };

  /**
   * Consume and return token, throw if doesn't match
   * @param {string} type - Expected token type
   * @param {string} [message] - Error message
   * @returns {Token}
   */
  SimpleTokenizer.prototype.expect = function(type, message) {
    var token = this.next();
    if (token.type !== type) {
      throw new Error(message || 'Expected ' + type + ', got ' + token.type);
    }
    return token;
  };

  /**
   * Check if at end of input
   * @returns {boolean}
   */
  SimpleTokenizer.prototype.isEOF = function() {
    return this.peek().type === TokenType.EOF;
  };

  /**
   * Get current position
   * @returns {number}
   */
  SimpleTokenizer.prototype.getPosition = function() {
    return this._pos;
  };

  /**
   * Reset tokenizer to a position
   * @param {number} pos - Position to reset to
   */
  SimpleTokenizer.prototype.reset = function(pos) {
    this._pos = pos;
    this._peeked = null;
  };

  // ----------------------------------------
  // Internal Tokenization
  // ----------------------------------------

  /**
   * Read the next token
   * @returns {Token}
   * @private
   */
  SimpleTokenizer.prototype._readToken = function() {
    this._skipWhitespaceAndComments();

    if (this._pos >= this._source.length) {
      return new Token(TokenType.EOF, '', this._pos, this._pos);
    }

    var start = this._pos;
    var ch = this._source[this._pos];

    // String literals
    if (ch === '"' || ch === "'") {
      return this._readString(ch);
    }

    // Template literals
    if (ch === '`') {
      return this._readTemplateLiteral();
    }

    // Numbers
    if (this._isDigit(ch) || (ch === '.' && this._isDigit(this._source[this._pos + 1]))) {
      return this._readNumber();
    }

    // Identifiers and keywords
    if (this._isIdentifierStart(ch)) {
      return this._readIdentifier();
    }

    // Operators and punctuation
    return this._readOperator();
  };

  /**
   * Skip whitespace and comments
   * @private
   */
  SimpleTokenizer.prototype._skipWhitespaceAndComments = function() {
    while (this._pos < this._source.length) {
      var ch = this._source[this._pos];

      // Whitespace
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        this._pos++;
        continue;
      }

      // Single-line comment
      if (ch === '/' && this._source[this._pos + 1] === '/') {
        this._pos += 2;
        while (this._pos < this._source.length && this._source[this._pos] !== '\n') {
          this._pos++;
        }
        continue;
      }

      // Multi-line comment
      if (ch === '/' && this._source[this._pos + 1] === '*') {
        this._pos += 2;
        while (this._pos < this._source.length) {
          if (this._source[this._pos] === '*' && this._source[this._pos + 1] === '/') {
            this._pos += 2;
            break;
          }
          this._pos++;
        }
        continue;
      }

      break;
    }
  };

  /**
   * Read a string literal
   * @param {string} quote - Quote character
   * @returns {Token}
   * @private
   */
  SimpleTokenizer.prototype._readString = function(quote) {
    var start = this._pos;
    this._pos++; // Skip opening quote
    var value = '';

    while (this._pos < this._source.length) {
      var ch = this._source[this._pos];

      if (ch === quote) {
        this._pos++;
        return new Token(TokenType.STRING, value, start, this._pos);
      }

      if (ch === '\\' && this._pos + 1 < this._source.length) {
        this._pos++;
        var escaped = this._source[this._pos];
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case '\'': value += '\''; break;
          case '"': value += '"'; break;
          default: value += escaped;
        }
        this._pos++;
        continue;
      }

      if (ch === '\n') {
        // Unterminated string
        break;
      }

      value += ch;
      this._pos++;
    }

    return new Token(TokenType.STRING, value, start, this._pos);
  };

  /**
   * Read a template literal
   * @returns {Token}
   * @private
   */
  SimpleTokenizer.prototype._readTemplateLiteral = function() {
    var start = this._pos;
    this._pos++; // Skip opening backtick
    var value = '';

    while (this._pos < this._source.length) {
      var ch = this._source[this._pos];

      if (ch === '`') {
        this._pos++;
        return new Token(TokenType.TEMPLATE, value, start, this._pos);
      }

      if (ch === '\\' && this._pos + 1 < this._source.length) {
        this._pos++;
        value += this._source[this._pos];
        this._pos++;
        continue;
      }

      // Skip template expressions ${...}
      if (ch === '$' && this._source[this._pos + 1] === '{') {
        var depth = 1;
        this._pos += 2;
        value += '${';
        while (this._pos < this._source.length && depth > 0) {
          var c = this._source[this._pos];
          if (c === '{') depth++;
          else if (c === '}') depth--;
          value += c;
          this._pos++;
        }
        continue;
      }

      value += ch;
      this._pos++;
    }

    return new Token(TokenType.TEMPLATE, value, start, this._pos);
  };

  /**
   * Read a number literal
   * @returns {Token}
   * @private
   */
  SimpleTokenizer.prototype._readNumber = function() {
    var start = this._pos;
    var value = '';

    // Handle hex, octal, binary
    if (this._source[this._pos] === '0' && this._pos + 1 < this._source.length) {
      var next = this._source[this._pos + 1].toLowerCase();
      if (next === 'x' || next === 'o' || next === 'b') {
        value += this._source[this._pos] + this._source[this._pos + 1];
        this._pos += 2;
        while (this._pos < this._source.length && this._isHexDigit(this._source[this._pos])) {
          value += this._source[this._pos];
          this._pos++;
        }
        return new Token(TokenType.NUMBER, value, start, this._pos);
      }
    }

    // Regular number
    while (this._pos < this._source.length && this._isDigit(this._source[this._pos])) {
      value += this._source[this._pos];
      this._pos++;
    }

    // Decimal part
    if (this._pos < this._source.length && this._source[this._pos] === '.') {
      value += '.';
      this._pos++;
      while (this._pos < this._source.length && this._isDigit(this._source[this._pos])) {
        value += this._source[this._pos];
        this._pos++;
      }
    }

    // Exponent
    if (this._pos < this._source.length && (this._source[this._pos] === 'e' || this._source[this._pos] === 'E')) {
      value += this._source[this._pos];
      this._pos++;
      if (this._pos < this._source.length && (this._source[this._pos] === '+' || this._source[this._pos] === '-')) {
        value += this._source[this._pos];
        this._pos++;
      }
      while (this._pos < this._source.length && this._isDigit(this._source[this._pos])) {
        value += this._source[this._pos];
        this._pos++;
      }
    }

    // BigInt suffix
    if (this._pos < this._source.length && this._source[this._pos] === 'n') {
      value += 'n';
      this._pos++;
    }

    return new Token(TokenType.NUMBER, value, start, this._pos);
  };

  /**
   * Read an identifier or keyword
   * @returns {Token}
   * @private
   */
  SimpleTokenizer.prototype._readIdentifier = function() {
    var start = this._pos;
    var value = '';

    while (this._pos < this._source.length && this._isIdentifierPart(this._source[this._pos])) {
      value += this._source[this._pos];
      this._pos++;
    }

    // Check for special keywords
    switch (value) {
      case 'true':
      case 'false':
        return new Token(TokenType.BOOLEAN, value, start, this._pos);
      case 'null':
        return new Token(TokenType.NULL, value, start, this._pos);
      case 'undefined':
        return new Token(TokenType.UNDEFINED, value, start, this._pos);
      case 'this':
        return new Token(TokenType.THIS, value, start, this._pos);
      case 'new':
        return new Token(TokenType.NEW, value, start, this._pos);
      case 'typeof':
        return new Token(TokenType.TYPEOF, value, start, this._pos);
      case 'instanceof':
        return new Token(TokenType.INSTANCEOF, value, start, this._pos);
      case 'in':
        return new Token(TokenType.IN, value, start, this._pos);
      case 'of':
        return new Token(TokenType.OF, value, start, this._pos);
      case 'class':
        return new Token(TokenType.CLASS, value, start, this._pos);
      case 'extends':
        return new Token(TokenType.EXTENDS, value, start, this._pos);
      case 'static':
        return new Token(TokenType.STATIC, value, start, this._pos);
      case 'get':
        return new Token(TokenType.GET, value, start, this._pos);
      case 'set':
        return new Token(TokenType.SET, value, start, this._pos);
      case 'async':
        return new Token(TokenType.ASYNC, value, start, this._pos);
      case 'function':
        return new Token(TokenType.FUNCTION, value, start, this._pos);
      case 'return':
        return new Token(TokenType.RETURN, value, start, this._pos);
      case 'constructor':
        return new Token(TokenType.CONSTRUCTOR, value, start, this._pos);
      case 'var':
        return new Token(TokenType.VAR, value, start, this._pos);
      case 'let':
        return new Token(TokenType.LET, value, start, this._pos);
      case 'const':
        return new Token(TokenType.CONST, value, start, this._pos);
    }

    // Check if it's a keyword
    if (KEYWORDS.has(value)) {
      return new Token(TokenType.KEYWORD, value, start, this._pos);
    }

    return new Token(TokenType.IDENTIFIER, value, start, this._pos);
  };

  /**
   * Read an operator or punctuation
   * @returns {Token}
   * @private
   */
  SimpleTokenizer.prototype._readOperator = function() {
    var start = this._pos;
    var ch = this._source[this._pos];
    var next = this._source[this._pos + 1];
    var third = this._source[this._pos + 2];

    // Three-character operators
    if (ch === '.' && next === '.' && third === '.') {
      this._pos += 3;
      return new Token(TokenType.SPREAD, '...', start, this._pos);
    }
    if (ch === '=' && next === '=' && third === '=') {
      this._pos += 3;
      return new Token(TokenType.STRICT_EQ, '===', start, this._pos);
    }
    if (ch === '!' && next === '=' && third === '=') {
      this._pos += 3;
      return new Token(TokenType.STRICT_NEQ, '!==', start, this._pos);
    }
    if (ch === '*' && next === '*' && third === '=') {
      this._pos += 3;
      return new Token(TokenType.ASSIGN, '**=', start, this._pos);
    }
    if (ch === '?' && next === '?' && third === '=') {
      this._pos += 3;
      return new Token(TokenType.ASSIGN, '??=', start, this._pos);
    }

    // Two-character operators
    if (ch === '?' && next === '.') {
      this._pos += 2;
      return new Token(TokenType.OPTIONAL_CHAIN, '?.', start, this._pos);
    }
    if (ch === '?' && next === '?') {
      this._pos += 2;
      return new Token(TokenType.NULLISH, '??', start, this._pos);
    }
    if (ch === '=' && next === '>') {
      this._pos += 2;
      return new Token(TokenType.ARROW, '=>', start, this._pos);
    }
    if (ch === '=' && next === '=') {
      this._pos += 2;
      return new Token(TokenType.EQ, '==', start, this._pos);
    }
    if (ch === '!' && next === '=') {
      this._pos += 2;
      return new Token(TokenType.NEQ, '!=', start, this._pos);
    }
    if (ch === '<' && next === '=') {
      this._pos += 2;
      return new Token(TokenType.LTE, '<=', start, this._pos);
    }
    if (ch === '>' && next === '=') {
      this._pos += 2;
      return new Token(TokenType.GTE, '>=', start, this._pos);
    }
    if (ch === '&' && next === '&') {
      this._pos += 2;
      return new Token(TokenType.AND, '&&', start, this._pos);
    }
    if (ch === '|' && next === '|') {
      this._pos += 2;
      return new Token(TokenType.OR, '||', start, this._pos);
    }
    if (ch === '+' && next === '=') {
      this._pos += 2;
      return new Token(TokenType.PLUS_ASSIGN, '+=', start, this._pos);
    }
    if (ch === '-' && next === '=') {
      this._pos += 2;
      return new Token(TokenType.MINUS_ASSIGN, '-=', start, this._pos);
    }
    if (ch === '*' && next === '*') {
      this._pos += 2;
      return new Token(TokenType.POWER, '**', start, this._pos);
    }
    if (ch === '+' && next === '+') {
      this._pos += 2;
      return new Token(TokenType.PLUS, '++', start, this._pos);
    }
    if (ch === '-' && next === '-') {
      this._pos += 2;
      return new Token(TokenType.MINUS, '--', start, this._pos);
    }

    // Single-character operators
    this._pos++;
    switch (ch) {
      case '.': return new Token(TokenType.DOT, '.', start, this._pos);
      case ',': return new Token(TokenType.COMMA, ',', start, this._pos);
      case ':': return new Token(TokenType.COLON, ':', start, this._pos);
      case ';': return new Token(TokenType.SEMICOLON, ';', start, this._pos);
      case '?': return new Token(TokenType.QUESTION, '?', start, this._pos);
      case '(': return new Token(TokenType.LPAREN, '(', start, this._pos);
      case ')': return new Token(TokenType.RPAREN, ')', start, this._pos);
      case '[': return new Token(TokenType.LBRACKET, '[', start, this._pos);
      case ']': return new Token(TokenType.RBRACKET, ']', start, this._pos);
      case '{': return new Token(TokenType.LBRACE, '{', start, this._pos);
      case '}': return new Token(TokenType.RBRACE, '}', start, this._pos);
      case '=': return new Token(TokenType.ASSIGN, '=', start, this._pos);
      case '+': return new Token(TokenType.PLUS, '+', start, this._pos);
      case '-': return new Token(TokenType.MINUS, '-', start, this._pos);
      case '*': return new Token(TokenType.STAR, '*', start, this._pos);
      case '/': return new Token(TokenType.SLASH, '/', start, this._pos);
      case '%': return new Token(TokenType.PERCENT, '%', start, this._pos);
      case '<': return new Token(TokenType.LT, '<', start, this._pos);
      case '>': return new Token(TokenType.GT, '>', start, this._pos);
      case '!': return new Token(TokenType.NOT, '!', start, this._pos);
    }

    return new Token(TokenType.UNKNOWN, ch, start, this._pos);
  };

  // ----------------------------------------
  // Character Helpers
  // ----------------------------------------

  /**
   * Check if character is a digit
   * @param {string} ch - Character
   * @returns {boolean}
   * @private
   */
  SimpleTokenizer.prototype._isDigit = function(ch) {
    return ch >= '0' && ch <= '9';
  };

  /**
   * Check if character is a hex digit
   * @param {string} ch - Character
   * @returns {boolean}
   * @private
   */
  SimpleTokenizer.prototype._isHexDigit = function(ch) {
    return (ch >= '0' && ch <= '9') ||
           (ch >= 'a' && ch <= 'f') ||
           (ch >= 'A' && ch <= 'F');
  };

  /**
   * Check if character can start an identifier
   * @param {string} ch - Character
   * @returns {boolean}
   * @private
   */
  SimpleTokenizer.prototype._isIdentifierStart = function(ch) {
    return (ch >= 'a' && ch <= 'z') ||
           (ch >= 'A' && ch <= 'Z') ||
           ch === '_' || ch === '$';
  };

  /**
   * Check if character can be part of an identifier
   * @param {string} ch - Character
   * @returns {boolean}
   * @private
   */
  SimpleTokenizer.prototype._isIdentifierPart = function(ch) {
    return this._isIdentifierStart(ch) || this._isDigit(ch);
  };

  // ============================================
  // Static Tokenization
  // ============================================

  /**
   * Tokenize source into array of tokens
   * @param {string} source - Source code
   * @returns {Token[]}
   */
  SimpleTokenizer.tokenize = function(source) {
    var tokenizer = new SimpleTokenizer(source);
    var tokens = [];

    while (!tokenizer.isEOF()) {
      tokens.push(tokenizer.next());
    }

    tokens.push(tokenizer.next()); // EOF token
    return tokens;
  };

  // ============================================
  // Export
  // ============================================

  CodeEditor.SimpleTokenizer = SimpleTokenizer;
  CodeEditor.TokenType = TokenType;
  CodeEditor.Token = Token;

})(window.CodeEditor = window.CodeEditor || {});
