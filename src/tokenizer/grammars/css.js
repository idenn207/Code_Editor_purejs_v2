/**
 * @fileoverview CSS grammar definition for Monarch-style tokenizer
 * @module tokenizer/grammars/css
 *
 * Based on Monaco Editor's CSS Monarch tokenizer pattern.
 * Supports selectors, properties, values, at-rules, and comments.
 */

// ============================================
// Token Types
// ============================================

export const CSSTokenType = Object.freeze({
  // Selectors
  SELECTOR_TAG: 'tag',
  SELECTOR_CLASS: 'attribute.name',
  SELECTOR_ID: 'attribute.name',
  SELECTOR_PSEUDO: 'keyword',
  SELECTOR_ATTRIBUTE: 'attribute.name',

  // At-rules
  AT_RULE: 'keyword',

  // Properties and Values
  PROPERTY: 'attribute.name',
  VALUE: 'attribute.value',
  VALUE_NUMBER: 'number',
  VALUE_UNIT: 'number',
  VALUE_HEX: 'number.hex',

  // Functions
  FUNCTION: 'function',

  // Strings
  STRING: 'string',

  // Comments
  COMMENT: 'comment',

  // Operators and Delimiters
  OPERATOR: 'operator',
  DELIMITER: 'delimiter',
  DELIMITER_BRACKET: 'delimiter.bracket',

  // Important
  IMPORTANT: 'keyword',

  // Standard
  WHITESPACE: 'whitespace',
  PLAIN: 'plain',
});

// ============================================
// CSS At-Rules
// ============================================

const AT_RULES = [
  'charset',
  'font-face',
  'import',
  'keyframes',
  'layer',
  'media',
  'namespace',
  'page',
  'property',
  'scope',
  'starting-style',
  'supports',
  'container',
  'counter-style',
  'font-feature-values',
  'font-palette-values',
];

// ============================================
// CSS Units
// ============================================

const CSS_UNITS = [
  // Absolute lengths
  'px', 'cm', 'mm', 'in', 'pt', 'pc',
  // Relative lengths
  'em', 'rem', 'ex', 'ch', 'vw', 'vh', 'vmin', 'vmax',
  'lh', 'rlh', 'cap', 'ic',
  // Container query units
  'cqw', 'cqh', 'cqi', 'cqb', 'cqmin', 'cqmax',
  // Angle
  'deg', 'rad', 'grad', 'turn',
  // Time
  's', 'ms',
  // Frequency
  'Hz', 'kHz',
  // Resolution
  'dpi', 'dpcm', 'dppx',
  // Flex
  'fr',
  // Percentage
  '%',
];

// ============================================
// Grammar Definition
// ============================================

export const CSSGrammar = {
  name: 'css',

  // ----------------------------------------
  // Reference Lists
  // ----------------------------------------

  atRules: AT_RULES,
  units: CSS_UNITS,

  // Identifier pattern for @ reference
  identPattern: /[a-zA-Z_][\w-]*/,

  // ----------------------------------------
  // Tokenizer Rules (State Machine)
  // ----------------------------------------

  tokenizer: {
    // ----------------
    // Root State - Selectors and At-Rules
    // ----------------
    root: [
      // Whitespace
      [/[ \t\r\n]+/, CSSTokenType.WHITESPACE],

      // Comments
      [/\/\*/, CSSTokenType.COMMENT, '@comment'],

      // At-rules (e.g., @media, @keyframes)
      [/@[\w-]+/, CSSTokenType.AT_RULE, '@atRule'],

      // Class selector
      [/\.[a-zA-Z_][\w-]*/, CSSTokenType.SELECTOR_CLASS],

      // ID selector
      [/#[a-zA-Z_][\w-]*/, CSSTokenType.SELECTOR_ID],

      // Pseudo-element (::before, ::after)
      [/::[\w-]+/, CSSTokenType.SELECTOR_PSEUDO],

      // Pseudo-class (:hover, :nth-child)
      [/:[\w-]+/, CSSTokenType.SELECTOR_PSEUDO],

      // Attribute selector start
      [/\[/, CSSTokenType.DELIMITER_BRACKET, '@attributeSelector'],

      // Tag/Element selector
      [/[a-zA-Z_][\w-]*/, CSSTokenType.SELECTOR_TAG],

      // Universal selector
      [/\*/, CSSTokenType.SELECTOR_TAG],

      // Combinators and separators
      [/[>+~]/, CSSTokenType.OPERATOR],
      [/,/, CSSTokenType.DELIMITER],

      // Declaration block start
      [/\{/, CSSTokenType.DELIMITER_BRACKET, '@block'],

      // Fallback
      [/./, CSSTokenType.PLAIN],
    ],

    // ----------------
    // Comment State (/* ... */)
    // ----------------
    comment: [
      [/[^*]+/, CSSTokenType.COMMENT],
      [/\*\//, CSSTokenType.COMMENT, '@pop'],
      [/\*/, CSSTokenType.COMMENT],
    ],

    // ----------------
    // At-Rule State (after @keyword)
    // ----------------
    atRule: [
      // Whitespace
      [/[ \t\r\n]+/, CSSTokenType.WHITESPACE],

      // Comments inside at-rule
      [/\/\*/, CSSTokenType.COMMENT, '@comment'],

      // Keyframes name
      [/[a-zA-Z_][\w-]*/, CSSTokenType.VALUE],

      // Media query features
      [/\(/, CSSTokenType.DELIMITER_BRACKET, '@mediaFeature'],

      // At-rule block (e.g., @media { })
      [/\{/, CSSTokenType.DELIMITER_BRACKET, '@atRuleBlock'],

      // At-rule statement end (e.g., @import "file.css";)
      [/;/, CSSTokenType.DELIMITER, '@pop'],

      // String in at-rule (e.g., @import "url")
      [/"/, CSSTokenType.STRING, '@doubleString'],
      [/'/, CSSTokenType.STRING, '@singleString'],

      // URL function
      [/url\s*\(/, CSSTokenType.FUNCTION, '@urlValue'],

      // Operators
      [/[,:]/, CSSTokenType.DELIMITER],
      [/and|or|not|only/, CSSTokenType.AT_RULE],

      // Fallback
      [/./, CSSTokenType.PLAIN],
    ],

    // ----------------
    // Media Feature State (inside parentheses)
    // ----------------
    mediaFeature: [
      [/[ \t\r\n]+/, CSSTokenType.WHITESPACE],

      // Feature name
      [/[a-zA-Z_][\w-]*/, CSSTokenType.PROPERTY],

      // Colon
      [/:/, CSSTokenType.DELIMITER],

      // Number with unit
      [/\d+(\.\d+)?/, CSSTokenType.VALUE_NUMBER],
      [/(px|em|rem|vh|vw|%)/, CSSTokenType.VALUE_UNIT],

      // Close parenthesis
      [/\)/, CSSTokenType.DELIMITER_BRACKET, '@pop'],

      // Fallback
      [/./, CSSTokenType.VALUE],
    ],

    // ----------------
    // At-Rule Block State (nested rules)
    // ----------------
    atRuleBlock: [
      // Whitespace
      [/[ \t\r\n]+/, CSSTokenType.WHITESPACE],

      // Comments
      [/\/\*/, CSSTokenType.COMMENT, '@comment'],

      // Nested at-rule
      [/@[\w-]+/, CSSTokenType.AT_RULE, '@atRule'],

      // Class selector
      [/\.[a-zA-Z_][\w-]*/, CSSTokenType.SELECTOR_CLASS],

      // ID selector
      [/#[a-zA-Z_][\w-]*/, CSSTokenType.SELECTOR_ID],

      // Pseudo selectors
      [/::[\w-]+/, CSSTokenType.SELECTOR_PSEUDO],
      [/:[\w-]+/, CSSTokenType.SELECTOR_PSEUDO],

      // Attribute selector
      [/\[/, CSSTokenType.DELIMITER_BRACKET, '@attributeSelector'],

      // Tag selector
      [/[a-zA-Z_][\w-]*/, CSSTokenType.SELECTOR_TAG],

      // Universal selector
      [/\*/, CSSTokenType.SELECTOR_TAG],

      // Combinators
      [/[>+~]/, CSSTokenType.OPERATOR],
      [/,/, CSSTokenType.DELIMITER],

      // Nested block
      [/\{/, CSSTokenType.DELIMITER_BRACKET, '@block'],

      // End at-rule block
      [/\}/, CSSTokenType.DELIMITER_BRACKET, '@pop @pop'],

      // Fallback
      [/./, CSSTokenType.PLAIN],
    ],

    // ----------------
    // Attribute Selector State ([attr="value"])
    // ----------------
    attributeSelector: [
      [/[ \t\r\n]+/, CSSTokenType.WHITESPACE],

      // Attribute name
      [/[a-zA-Z_][\w-]*/, CSSTokenType.SELECTOR_ATTRIBUTE],

      // Operators (=, ~=, |=, ^=, $=, *=)
      [/[~|^$*]?=/, CSSTokenType.OPERATOR],

      // Quoted value
      [/"/, CSSTokenType.STRING, '@doubleString'],
      [/'/, CSSTokenType.STRING, '@singleString'],

      // Case sensitivity flag
      [/[iIsS](?=\])/, CSSTokenType.VALUE],

      // Close bracket
      [/\]/, CSSTokenType.DELIMITER_BRACKET, '@pop'],

      // Fallback
      [/./, CSSTokenType.VALUE],
    ],

    // ----------------
    // Declaration Block State ({ property: value; })
    // ----------------
    block: [
      // Whitespace
      [/[ \t\r\n]+/, CSSTokenType.WHITESPACE],

      // Comments
      [/\/\*/, CSSTokenType.COMMENT, '@comment'],

      // CSS custom property (--variable-name)
      [/--[a-zA-Z_][\w-]*/, CSSTokenType.PROPERTY],

      // Property name (vendor prefixes supported)
      [/-?[a-zA-Z_][\w-]*/, CSSTokenType.PROPERTY, '@afterProperty'],

      // End block
      [/\}/, CSSTokenType.DELIMITER_BRACKET, '@pop'],

      // Fallback
      [/./, CSSTokenType.PLAIN],
    ],

    // ----------------
    // After Property State (expecting : or invalid)
    // ----------------
    afterProperty: [
      [/[ \t\r\n]+/, CSSTokenType.WHITESPACE],

      // Colon - go to value
      [/:/, CSSTokenType.DELIMITER, '@value'],

      // Missing colon - recover
      [/(?=[;\}])/, '', '@pop'],

      // Fallback
      [/./, '', '@pop'],
    ],

    // ----------------
    // Property Value State
    // ----------------
    value: [
      // Whitespace
      [/[ \t\r\n]+/, CSSTokenType.WHITESPACE],

      // Comments
      [/\/\*/, CSSTokenType.COMMENT, '@comment'],

      // !important
      [/!important\b/i, CSSTokenType.IMPORTANT],

      // Hex color (#fff, #ffffff, #ffffffff)
      [/#[0-9a-fA-F]{3,8}\b/, CSSTokenType.VALUE_HEX],

      // Number with unit
      [/[-+]?(\d+\.?\d*|\.\d+)(px|em|rem|%|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc|deg|rad|grad|turn|s|ms|Hz|kHz|dpi|dpcm|dppx|fr|lh|rlh|cap|ic|cqw|cqh|cqi|cqb|cqmin|cqmax)?/, CSSTokenType.VALUE_NUMBER],

      // Function call (rgb(), var(), calc(), etc.)
      [/[a-zA-Z_][\w-]*\s*\(/, CSSTokenType.FUNCTION, '@functionArgs'],

      // URL function
      [/url\s*\(/, CSSTokenType.FUNCTION, '@urlValue'],

      // Quoted strings
      [/"/, CSSTokenType.STRING, '@doubleString'],
      [/'/, CSSTokenType.STRING, '@singleString'],

      // Keywords/identifiers (inherit, auto, none, etc.)
      [/[a-zA-Z_][\w-]*/, CSSTokenType.VALUE],

      // Comma separator
      [/,/, CSSTokenType.DELIMITER],

      // Operators in values (e.g., calc expressions)
      [/[+\-*/]/, CSSTokenType.OPERATOR],

      // Semicolon - end value, pop twice (value and afterProperty)
      [/;/, CSSTokenType.DELIMITER, '@pop @pop'],

      // End block without semicolon - pop twice
      [/(?=\})/, '', '@pop @pop'],

      // Fallback
      [/./, CSSTokenType.VALUE],
    ],

    // ----------------
    // Function Arguments State
    // ----------------
    functionArgs: [
      // Whitespace
      [/[ \t\r\n]+/, CSSTokenType.WHITESPACE],

      // Nested function
      [/[a-zA-Z_][\w-]*\s*\(/, CSSTokenType.FUNCTION, '@functionArgs'],

      // CSS variable reference
      [/--[a-zA-Z_][\w-]*/, CSSTokenType.PROPERTY],

      // Number with unit
      [/[-+]?(\d+\.?\d*|\.\d+)(px|em|rem|%|vh|vw|vmin|vmax|deg|rad|s|ms)?/, CSSTokenType.VALUE_NUMBER],

      // Hex color
      [/#[0-9a-fA-F]{3,8}\b/, CSSTokenType.VALUE_HEX],

      // Quoted strings
      [/"/, CSSTokenType.STRING, '@doubleString'],
      [/'/, CSSTokenType.STRING, '@singleString'],

      // Keywords/identifiers
      [/[a-zA-Z_][\w-]*/, CSSTokenType.VALUE],

      // Comma
      [/,/, CSSTokenType.DELIMITER],

      // Operators
      [/[+\-*/]/, CSSTokenType.OPERATOR],

      // Close parenthesis
      [/\)/, CSSTokenType.FUNCTION, '@pop'],

      // Fallback
      [/./, CSSTokenType.VALUE],
    ],

    // ----------------
    // URL Value State (url(...))
    // ----------------
    urlValue: [
      // Whitespace
      [/[ \t\r\n]+/, CSSTokenType.WHITESPACE],

      // Quoted URL
      [/"/, CSSTokenType.STRING, '@doubleString'],
      [/'/, CSSTokenType.STRING, '@singleString'],

      // Unquoted URL content
      [/[^)'"]+/, CSSTokenType.STRING],

      // Close parenthesis
      [/\)/, CSSTokenType.FUNCTION, '@pop'],
    ],

    // ----------------
    // Double-Quoted String State
    // ----------------
    doubleString: [
      // Escape sequences
      [/\\(?:[0-9a-fA-F]{1,6}\s?|.)/, CSSTokenType.STRING],

      // String content
      [/[^\\"]+/, CSSTokenType.STRING],

      // End quote
      [/"/, CSSTokenType.STRING, '@pop'],
    ],

    // ----------------
    // Single-Quoted String State
    // ----------------
    singleString: [
      // Escape sequences
      [/\\(?:[0-9a-fA-F]{1,6}\s?|.)/, CSSTokenType.STRING],

      // String content
      [/[^\\']+/, CSSTokenType.STRING],

      // End quote
      [/'/, CSSTokenType.STRING, '@pop'],
    ],
  },
};

// ============================================
// Exports
// ============================================

export { AT_RULES, CSS_UNITS };
