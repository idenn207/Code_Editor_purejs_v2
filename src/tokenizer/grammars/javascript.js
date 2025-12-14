/**
 * @fileoverview JavaScript grammar definition for Monarch-style tokenizer
 */

(function(CodeEditor) {
  'use strict';

  CodeEditor.Grammars = CodeEditor.Grammars || {};

  // ============================================
  // Token Types
  // ============================================

  var TokenType = Object.freeze({
    KEYWORD: 'keyword',                    // Blue keywords (declaration/modifier)
    KEYWORD_CONTROL: 'keyword.control',    // Purple keywords (control flow)
    KEYWORD_LITERAL: 'keyword.literal',
    STRING: 'string',
    STRING_TEMPLATE: 'string.template',
    STRING_ESCAPE: 'string.escape',
    STRING_INVALID: 'string.invalid',
    NUMBER: 'number',
    NUMBER_FLOAT: 'number.float',
    NUMBER_HEX: 'number.hex',
    COMMENT: 'comment',
    OPERATOR: 'operator',
    DELIMITER: 'delimiter',
    DELIMITER_BRACKET: 'delimiter.bracket',
    IDENTIFIER: 'identifier',
    FUNCTION: 'function',
    CLASS: 'class',
    WHITESPACE: 'whitespace',
    PLAIN: 'plain',
  });

  // ============================================
  // Grammar Definition
  // ============================================

  var JavaScriptGrammar = {
    name: 'javascript',

    // ----------------------------------------
    // Keyword Lists
    // ----------------------------------------

    // Blue keywords - declarations, modifiers, operators
    keywords: [
      'class',
      'const',
      'delete',
      'extends',
      'function',
      'in',
      'instanceof',
      'let',
      'new',
      'static',
      'super',
      'this',
      'typeof',
      'var',
      'void',
      'async',
      'implements',
      'interface',
      'package',
      'private',
      'protected',
      'public',
      'enum',
      'get',
      'set',
      'of',
    ],

    // Purple keywords - control flow
    controlKeywords: [
      'break',
      'case',
      'catch',
      'continue',
      'debugger',
      'default',
      'do',
      'else',
      'export',
      'finally',
      'for',
      'if',
      'import',
      'return',
      'switch',
      'throw',
      'try',
      'while',
      'with',
      'yield',
      'await',
    ],

    typeKeywords: ['true', 'false', 'null', 'undefined', 'NaN', 'Infinity'],

    operators: [
      '<=',
      '>=',
      '==',
      '!=',
      '===',
      '!==',
      '=>',
      '+',
      '-',
      '**',
      '*',
      '/',
      '%',
      '++',
      '--',
      '<<',
      '>>',
      '>>>',
      '&',
      '|',
      '^',
      '!',
      '~',
      '&&',
      '||',
      '??',
      '?',
      ':',
      '=',
      '+=',
      '-=',
      '*=',
      '/=',
      '%=',
      '**=',
      '<<=',
      '>>=',
      '>>>=',
      '&=',
      '|=',
      '^=',
      '&&=',
      '||=',
      '??=',
      '?.',
      '...',
    ],

    // ----------------------------------------
    // Regular Expression Patterns
    // ----------------------------------------

    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4}|u\{[0-9A-Fa-f]+\})/,
    digits: /\d+(_+\d+)*/,
    octaldigits: /[0-7]+(_+[0-7]+)*/,
    binarydigits: /[0-1]+(_+[0-1]+)*/,
    hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,

    // ----------------------------------------
    // Tokenizer Rules (State Machine)
    // ----------------------------------------

    tokenizer: {
      // ----------------
      // Root State
      // ----------------
      root: [
        // Whitespace
        [/[ \t\r\n]+/, TokenType.WHITESPACE],

        // Comments
        [/\/\/.*$/, TokenType.COMMENT],
        [/\/\*/, TokenType.COMMENT, '@comment'],

        // JSDoc
        [/\/\*\*(?!\/)/, TokenType.COMMENT, '@jsdoc'],

        // Regular expression (simplified detection)
        [/\/(?=([^\\\/]|\\.)+\/[gimsuy]*)/, TokenType.STRING, '@regexp'],

        // Numbers
        [/0[xX]@hexdigits/, TokenType.NUMBER_HEX],
        [/0[oO]@octaldigits/, TokenType.NUMBER],
        [/0[bB]@binarydigits/, TokenType.NUMBER],
        [/@digits[eE][\-+]?@digits/, TokenType.NUMBER_FLOAT],
        [/@digits\.@digits([eE][\-+]?@digits)?/, TokenType.NUMBER_FLOAT],
        [/@digits/, TokenType.NUMBER],

        // Strings
        [/"([^"\\]|\\.)*$/, TokenType.STRING_INVALID], // non-terminated
        [/'([^'\\]|\\.)*$/, TokenType.STRING_INVALID], // non-terminated
        [/"/, TokenType.STRING, '@string_double'],
        [/'/, TokenType.STRING, '@string_single'],
        [/`/, TokenType.STRING_TEMPLATE, '@string_template'],

        // Identifiers and keywords
        [
          /[a-zA-Z_$][\w$]*/,
          {
            cases: {
              '@keywords': TokenType.KEYWORD,
              '@controlKeywords': TokenType.KEYWORD_CONTROL,
              '@typeKeywords': TokenType.KEYWORD_LITERAL,
              '@default': TokenType.IDENTIFIER,
            },
          },
        ],

        // Operators
        [
          /@symbols/,
          {
            cases: {
              '@operators': TokenType.OPERATOR,
              '@default': TokenType.PLAIN,
            },
          },
        ],

        // Delimiters
        [/[{}()\[\]]/, TokenType.DELIMITER_BRACKET],
        [/[<>](?!@symbols)/, TokenType.DELIMITER_BRACKET],
        [/[;,.]/, TokenType.DELIMITER],

        // Arrow function (additional highlight)
        [/=>/, TokenType.OPERATOR],
      ],

      // ----------------
      // Multi-line Comment State
      // ----------------
      comment: [
        [/[^\/*]+/, TokenType.COMMENT],
        [/\*\//, TokenType.COMMENT, '@pop'],
        [/[\/*]/, TokenType.COMMENT],
      ],

      // ----------------
      // JSDoc Comment State
      // ----------------
      jsdoc: [
        [/[^\/*]+/, TokenType.COMMENT],
        [/\*\//, TokenType.COMMENT, '@pop'],
        [/[\/*]/, TokenType.COMMENT],
        [/@\w+/, TokenType.KEYWORD], // JSDoc tags
      ],

      // ----------------
      // Double-quoted String State
      // ----------------
      string_double: [
        [/[^\\"]+/, TokenType.STRING],
        [/@escapes/, TokenType.STRING_ESCAPE],
        [/\\./, TokenType.STRING_INVALID],
        [/"/, TokenType.STRING, '@pop'],
      ],

      // ----------------
      // Single-quoted String State
      // ----------------
      string_single: [
        [/[^\\']+/, TokenType.STRING],
        [/@escapes/, TokenType.STRING_ESCAPE],
        [/\\./, TokenType.STRING_INVALID],
        [/'/, TokenType.STRING, '@pop'],
      ],

      // ----------------
      // Template String State
      // ----------------
      string_template: [
        [/\$\{/, TokenType.DELIMITER_BRACKET, '@template_expression'],
        [/[^`\\$]+/, TokenType.STRING_TEMPLATE],
        [/@escapes/, TokenType.STRING_ESCAPE],
        [/\\./, TokenType.STRING_INVALID],
        [/`/, TokenType.STRING_TEMPLATE, '@pop'],
      ],

      // ----------------
      // Template Expression State (${...})
      // ----------------
      template_expression: [[/\}/, TokenType.DELIMITER_BRACKET, '@pop'], { include: '@root' }],

      // ----------------
      // RegExp State (simplified)
      // ----------------
      regexp: [
        [/[^\\\/\[]+/, TokenType.STRING],
        [/\\./, TokenType.STRING_ESCAPE],
        [/\[/, TokenType.STRING, '@regexp_class'],
        [/\/[gimsuy]*/, TokenType.STRING, '@pop'],
      ],

      regexp_class: [
        [/[^\]\\]+/, TokenType.STRING],
        [/\\./, TokenType.STRING_ESCAPE],
        [/\]/, TokenType.STRING, '@pop'],
      ],
    },
  };

  // ============================================
  // Helper: Detect function calls for highlighting
  // ============================================

  /**
   * Post-process tokens to identify function calls
   * @param {Array} tokens - Array of tokens
   * @returns {Array} - Tokens with function calls identified
   */
  function identifyFunctionCalls(tokens) {
    var result = [];

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];

      // Check if identifier is followed by (
      if (token.type === TokenType.IDENTIFIER) {
        // Look ahead for opening parenthesis
        var j = i + 1;
        while (j < tokens.length && tokens[j].type === TokenType.WHITESPACE) {
          j++;
        }

        if (j < tokens.length && tokens[j].type === TokenType.DELIMITER_BRACKET && tokens[j].value === '(') {
          result.push({ type: TokenType.FUNCTION, value: token.value, start: token.start, end: token.end });
          continue;
        }

        // Check for class-like naming (PascalCase)
        if (/^[A-Z][a-zA-Z0-9]*$/.test(token.value)) {
          result.push({ type: TokenType.CLASS, value: token.value, start: token.start, end: token.end });
          continue;
        }
      }

      result.push(token);
    }

    return result;
  }

  // ============================================
  // Export to Namespace
  // ============================================

  CodeEditor.Grammars.JavaScript = JavaScriptGrammar;
  CodeEditor.Grammars.JavaScriptTokenType = TokenType;
  CodeEditor.Grammars.identifyFunctionCalls = identifyFunctionCalls;

  // Also export TokenType at top level for backward compatibility
  CodeEditor.TokenType = TokenType;

})(window.CodeEditor = window.CodeEditor || {});
