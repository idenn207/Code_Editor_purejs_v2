/**
 * @fileoverview Type kind enumeration for the type system
 * @module features/autocomplete/types/TypeKind
 */

(function(CodeEditor) {
  'use strict';

  // ============================================
  // Type Kind Enumeration
  // ============================================

  /**
   * Enum representing different kinds of types in the type system
   * @enum {string}
   */
  var TypeKind = Object.freeze({
    // Primitive types
    STRING: 'string',
    NUMBER: 'number',
    BOOLEAN: 'boolean',
    NULL: 'null',
    UNDEFINED: 'undefined',
    SYMBOL: 'symbol',
    BIGINT: 'bigint',

    // Structural types
    OBJECT: 'object',
    ARRAY: 'array',
    FUNCTION: 'function',
    CLASS: 'class',

    // Instance type (result of `new Class()`)
    INSTANCE: 'instance',

    // Compound types
    UNION: 'union',
    INTERSECTION: 'intersection',
    TUPLE: 'tuple',

    // Special types
    ANY: 'any',
    VOID: 'void',
    NEVER: 'never',
    UNKNOWN: 'unknown',

    // Generic type variable (T, U, K, V, etc.)
    TYPE_VARIABLE: 'type_variable',

    // Collection types
    MAP: 'map',
    SET: 'set',
    WEAKMAP: 'weakmap',
    WEAKSET: 'weakset',

    // Iterator type
    ITERATOR: 'iterator'
  });

  // ============================================
  // Export
  // ============================================

  CodeEditor.TypeKind = TypeKind;

})(window.CodeEditor = window.CodeEditor || {});
