/**
 * @fileoverview Simple tokenizer for syntax highlighting
 * @module tokenizer/Tokenizer
 */

// ============================================
// Token Types
// ============================================

export const TokenType = Object.freeze({
  KEYWORD: 'keyword',
  STRING: 'string',
  NUMBER: 'number',
  COMMENT: 'comment',
  OPERATOR: 'operator',
  PUNCTUATION: 'punctuation',
  IDENTIFIER: 'identifier',
  WHITESPACE: 'whitespace',
  FUNCTION: 'function',
  CLASS: 'class',
  PROPERTY: 'property',
  PLAIN: 'plain',
});

// ============================================
// Language Definitions
// ============================================

const JAVASCRIPT_KEYWORDS = new Set([
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'let',
  'new',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
  'async',
  'await',
  'true',
  'false',
  'null',
  'undefined',
  'NaN',
  'Infinity',
]);

const OPERATORS = new Set(['+', '-', '*', '/', '%', '=', '!', '<', '>', '&', '|', '^', '~', '?', ':']);

const PUNCTUATION = new Set(['(', ')', '{', '}', '[', ']', ',', '.', ';']);

// ============================================
// Class Definition
// ============================================

/**
 * Simple tokenizer for JavaScript syntax highlighting.
 */
export class Tokenizer {
  // ----------------------------------------
  // Instance Properties
  // ----------------------------------------
  _language = 'javascript';

  // ----------------------------------------
  // Constructor
  // ----------------------------------------

  constructor(language = 'javascript') {
    this._language = language;
  }

  // ----------------------------------------
  // Public Methods
  // ----------------------------------------

  /**
   * Tokenize a single line of code
   * @param {string} line
   * @returns {Array<{ type: string, value: string }>}
   */
  tokenizeLine(line) {
    if (this._language === 'javascript') {
      return this._tokenizeJavaScript(line);
    }

    // Fallback: plain text
    return [{ type: TokenType.PLAIN, value: line }];
  }

  /**
   * Tokenize entire document
   * @param {string} text
   * @returns {Array<Array<{ type: string, value: string }>>}
   */
  tokenize(text) {
    const lines = text.split('\n');
    return lines.map((line) => this.tokenizeLine(line));
  }

  // ----------------------------------------
  // JavaScript Tokenizer
  // ----------------------------------------

  _tokenizeJavaScript(line) {
    const tokens = [];
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      // Whitespace
      if (/\s/.test(char)) {
        const start = i;
        while (i < line.length && /\s/.test(line[i])) i++;
        tokens.push({ type: TokenType.WHITESPACE, value: line.slice(start, i) });
        continue;
      }

      // Single-line comment
      if (char === '/' && line[i + 1] === '/') {
        tokens.push({ type: TokenType.COMMENT, value: line.slice(i) });
        break;
      }

      // Multi-line comment start (simplified - doesn't handle spanning lines)
      if (char === '/' && line[i + 1] === '*') {
        const endIndex = line.indexOf('*/', i + 2);
        if (endIndex !== -1) {
          tokens.push({ type: TokenType.COMMENT, value: line.slice(i, endIndex + 2) });
          i = endIndex + 2;
        } else {
          tokens.push({ type: TokenType.COMMENT, value: line.slice(i) });
          break;
        }
        continue;
      }

      // String (double quotes)
      if (char === '"') {
        const stringToken = this._parseString(line, i, '"');
        tokens.push(stringToken);
        i += stringToken.value.length;
        continue;
      }

      // String (single quotes)
      if (char === "'") {
        const stringToken = this._parseString(line, i, "'");
        tokens.push(stringToken);
        i += stringToken.value.length;
        continue;
      }

      // Template string
      if (char === '`') {
        const stringToken = this._parseString(line, i, '`');
        tokens.push(stringToken);
        i += stringToken.value.length;
        continue;
      }

      // Number
      if (/\d/.test(char) || (char === '.' && /\d/.test(line[i + 1]))) {
        const start = i;
        while (i < line.length && /[\d.xXa-fA-FeE_]/.test(line[i])) i++;
        tokens.push({ type: TokenType.NUMBER, value: line.slice(start, i) });
        continue;
      }

      // Operator
      if (OPERATORS.has(char)) {
        const start = i;
        while (i < line.length && OPERATORS.has(line[i])) i++;
        tokens.push({ type: TokenType.OPERATOR, value: line.slice(start, i) });
        continue;
      }

      // Punctuation
      if (PUNCTUATION.has(char)) {
        tokens.push({ type: TokenType.PUNCTUATION, value: char });
        i++;
        continue;
      }

      // Identifier or keyword
      if (/[a-zA-Z_$]/.test(char)) {
        const start = i;
        while (i < line.length && /[a-zA-Z0-9_$]/.test(line[i])) i++;
        const word = line.slice(start, i);

        // Check if it's followed by ( for function detection
        const nextNonSpace = line.slice(i).match(/^\s*(.)/)?.[1];

        if (JAVASCRIPT_KEYWORDS.has(word)) {
          tokens.push({ type: TokenType.KEYWORD, value: word });
        } else if (nextNonSpace === '(') {
          tokens.push({ type: TokenType.FUNCTION, value: word });
        } else if (word[0] === word[0].toUpperCase() && /[a-z]/.test(word)) {
          tokens.push({ type: TokenType.CLASS, value: word });
        } else {
          tokens.push({ type: TokenType.IDENTIFIER, value: word });
        }
        continue;
      }

      // Unknown character - treat as plain
      tokens.push({ type: TokenType.PLAIN, value: char });
      i++;
    }

    return tokens;
  }

  /**
   * Parse a string literal
   */
  _parseString(line, start, quote) {
    let i = start + 1;

    while (i < line.length) {
      const char = line[i];

      if (char === '\\') {
        i += 2; // Skip escaped character
        continue;
      }

      if (char === quote) {
        i++;
        break;
      }

      i++;
    }

    return {
      type: TokenType.STRING,
      value: line.slice(start, i),
    };
  }
}
