/**
 * @fileoverview HTML grammar definition for Monarch-style tokenizer
 * @module tokenizer/grammars/html
 *
 * Based on Monaco Editor's HTML Monarch tokenizer pattern.
 * Supports DOCTYPE, tags, attributes, comments, and entities.
 * Embedded script/style content treated as plain text (delegated in future).
 */

// ============================================
// Token Types
// ============================================

export const HTMLTokenType = Object.freeze({
  // Document
  METATAG: 'metatag',
  METATAG_CONTENT: 'metatag.content',

  // Tags
  TAG: 'tag',
  TAG_DELIMITER: 'delimiter.tag',

  // Attributes
  ATTRIBUTE_NAME: 'attribute.name',
  ATTRIBUTE_VALUE: 'attribute.value',

  // Content
  COMMENT: 'comment',
  TEXT: 'plain',

  // Strings (for attribute values)
  STRING: 'string',

  // Entities
  ENTITY: 'string.escape',

  // Delimiters
  DELIMITER: 'delimiter',

  // Standard
  WHITESPACE: 'whitespace',
  PLAIN: 'plain',
});

// ============================================
// Void Elements (Self-closing, no end tag)
// ============================================

const VOID_ELEMENTS = [
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'keygen',
  'link',
  'menuitem',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
];

// ============================================
// Grammar Definition
// ============================================

export const HTMLGrammar = {
  name: 'html',

  // ----------------------------------------
  // Reference Lists
  // ----------------------------------------

  voidElements: VOID_ELEMENTS,

  // Entity pattern for @ reference
  entityPattern: /&(?:#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/,

  // ----------------------------------------
  // Tokenizer Rules (State Machine)
  // ----------------------------------------

  tokenizer: {
    // ----------------
    // Root State - Main entry point
    // ----------------
    root: [
      // Whitespace
      [/[ \t\r\n]+/, HTMLTokenType.WHITESPACE],

      // DOCTYPE declaration
      [/<!DOCTYPE/i, HTMLTokenType.METATAG, '@doctype'],

      // Comment start
      [/<!--/, HTMLTokenType.COMMENT, '@comment'],

      // CDATA section (for XHTML compatibility)
      [/<!\[CDATA\[/i, HTMLTokenType.COMMENT, '@cdata'],

      // Closing tag
      [/<\//, HTMLTokenType.TAG_DELIMITER, '@closeTag'],

      // Opening tag (including self-closing like <br/>)
      [/</, HTMLTokenType.TAG_DELIMITER, '@openTag'],

      // Entity references (named, decimal, hex)
      [/@entityPattern/, HTMLTokenType.ENTITY],

      // Standalone & not part of entity
      [/&/, HTMLTokenType.TEXT],

      // Plain text content
      [/[^<&]+/, HTMLTokenType.TEXT],
    ],

    // ----------------
    // DOCTYPE State
    // ----------------
    doctype: [
      // DOCTYPE content
      [/[^>]+/, HTMLTokenType.METATAG_CONTENT],

      // End of DOCTYPE
      [/>/, HTMLTokenType.METATAG, '@pop'],
    ],

    // ----------------
    // Comment State (<!-- ... -->)
    // ----------------
    comment: [
      // Comment end
      [/-->/, HTMLTokenType.COMMENT, '@pop'],

      // Comment content (non-greedy, avoid matching -->)
      [/[^-]+/, HTMLTokenType.COMMENT],

      // Single dash (not part of -->)
      [/-(?!->)/, HTMLTokenType.COMMENT],

      // Fallback for edge cases
      [/./, HTMLTokenType.COMMENT],
    ],

    // ----------------
    // CDATA State (<![CDATA[ ... ]]>)
    // ----------------
    cdata: [
      // CDATA end
      [/\]\]>/, HTMLTokenType.COMMENT, '@pop'],

      // CDATA content
      [/[^\]]+/, HTMLTokenType.COMMENT],

      // Single ] (not part of ]]>)
      [/\](?!\]>)/, HTMLTokenType.COMMENT],

      // Fallback
      [/./, HTMLTokenType.COMMENT],
    ],

    // ----------------
    // Opening Tag State (after <)
    // ----------------
    openTag: [
      // Tag name - transition to tag body for attributes
      [/[a-zA-Z][a-zA-Z0-9\-]*/, HTMLTokenType.TAG, '@tagBody'],

      // Invalid: no valid tag name, pop back
      [/./, HTMLTokenType.TEXT, '@pop'],
    ],

    // ----------------
    // Closing Tag State (after </)
    // ----------------
    closeTag: [
      // Tag name
      [/[a-zA-Z][a-zA-Z0-9\-]*/, HTMLTokenType.TAG],

      // Whitespace before >
      [/[ \t\r\n]+/, HTMLTokenType.WHITESPACE],

      // End of closing tag
      [/>/, HTMLTokenType.TAG_DELIMITER, '@pop'],

      // Invalid character, recover
      [/./, HTMLTokenType.TEXT, '@pop'],
    ],

    // ----------------
    // Tag Body State (attributes)
    // ----------------
    tagBody: [
      // Whitespace between attributes
      [/[ \t\r\n]+/, HTMLTokenType.WHITESPACE],

      // Self-closing end />
      [/\/>/, HTMLTokenType.TAG_DELIMITER, '@pop'],

      // Normal tag end >
      [/>/, HTMLTokenType.TAG_DELIMITER, '@pop'],

      // Attribute name (including data-*, aria-*, etc.)
      [/[a-zA-Z_:][a-zA-Z0-9_:\.\-]*/, HTMLTokenType.ATTRIBUTE_NAME, '@afterAttributeName'],

      // Invalid character in tag, recover
      [/./, HTMLTokenType.TEXT],
    ],

    // ----------------
    // After Attribute Name (expecting = or next attribute or >)
    // ----------------
    afterAttributeName: [
      // Whitespace
      [/[ \t\r\n]+/, HTMLTokenType.WHITESPACE],

      // Equals sign - go to attribute value
      [/=/, HTMLTokenType.DELIMITER, '@attributeValue'],

      // No value (boolean attribute like "disabled") - back to tag body
      // Lookahead for end of tag or another attribute
      [/(?=\/>)/, '', '@pop'],
      [/(?=>)/, '', '@pop'],
      [/(?=[a-zA-Z_:])/, '', '@pop'],

      // Anything else, recover
      [/./, '', '@pop'],
    ],

    // ----------------
    // Attribute Value State (after =)
    // ----------------
    attributeValue: [
      // Whitespace before value
      [/[ \t\r\n]+/, HTMLTokenType.WHITESPACE],

      // Double-quoted value
      [/"/, HTMLTokenType.STRING, '@doubleQuoteValue'],

      // Single-quoted value
      [/'/, HTMLTokenType.STRING, '@singleQuoteValue'],

      // Unquoted value (no spaces, no quotes, no special chars)
      [/[^\s"'=<>`]+/, HTMLTokenType.ATTRIBUTE_VALUE, '@pop'],

      // No value found, recover by popping
      [/(?=\/>|>|[a-zA-Z_:])/, '', '@pop'],

      // Fallback
      [/./, '', '@pop'],
    ],

    // ----------------
    // Double-Quoted Attribute Value
    // ----------------
    doubleQuoteValue: [
      // Entity inside attribute
      [/@entityPattern/, HTMLTokenType.ENTITY],

      // Value content
      [/[^"&]+/, HTMLTokenType.STRING],

      // Standalone &
      [/&/, HTMLTokenType.STRING],

      // End quote - pop twice (back through attributeValue and afterAttributeName)
      [/"/, HTMLTokenType.STRING, '@pop @pop'],
    ],

    // ----------------
    // Single-Quoted Attribute Value
    // ----------------
    singleQuoteValue: [
      // Entity inside attribute
      [/@entityPattern/, HTMLTokenType.ENTITY],

      // Value content
      [/[^'&]+/, HTMLTokenType.STRING],

      // Standalone &
      [/&/, HTMLTokenType.STRING],

      // End quote - pop twice
      [/'/, HTMLTokenType.STRING, '@pop @pop'],
    ],
  },
};

// ============================================
// Exports
// ============================================

export { VOID_ELEMENTS };
