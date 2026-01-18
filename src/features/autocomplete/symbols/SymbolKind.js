/**
 * @fileoverview Symbol kind enumeration for autocomplete system
 * @module features/autocomplete/symbols/SymbolKind
 */

(function(CodeEditor) {
  'use strict';

  // ============================================
  // SymbolKind Enumeration
  // ============================================

  /**
   * Enumeration of symbol kinds
   * @readonly
   * @enum {string}
   */
  var SymbolKind = {
    /**
     * Variable declared with var, let, or const
     */
    VARIABLE: 'variable',

    /**
     * Function declaration or expression
     */
    FUNCTION: 'function',

    /**
     * Class declaration
     */
    CLASS: 'class',

    /**
     * Method in a class or object
     */
    METHOD: 'method',

    /**
     * Property in a class or object
     */
    PROPERTY: 'property',

    /**
     * Function or method parameter
     */
    PARAMETER: 'parameter',

    /**
     * Import binding (import { x } from ...)
     */
    IMPORT: 'import',

    /**
     * Export binding (export { x })
     */
    EXPORT: 'export',

    /**
     * Enum declaration (TypeScript-like)
     */
    ENUM: 'enum',

    /**
     * Enum member
     */
    ENUM_MEMBER: 'enum_member',

    /**
     * Interface (TypeScript-like, from JSDoc)
     */
    INTERFACE: 'interface',

    /**
     * Type alias (TypeScript-like, from JSDoc)
     */
    TYPE_ALIAS: 'type_alias',

    /**
     * Constant value (const)
     */
    CONSTANT: 'constant',

    /**
     * Getter accessor
     */
     GETTER: 'getter',

    /**
     * Setter accessor
     */
    SETTER: 'setter',

    /**
     * Constructor function
     */
    CONSTRUCTOR: 'constructor',

    /**
     * Module or namespace
     */
    MODULE: 'module',

    /**
     * Label in labeled statement
     */
    LABEL: 'label',

    /**
     * Built-in global (console, document, window)
     */
    BUILTIN: 'builtin',

    /**
     * Unknown or unresolved symbol
     */
    UNKNOWN: 'unknown'
  };

  // ============================================
  // Helper Functions
  // ============================================

  /**
   * Check if a symbol kind is a callable (function, method, constructor)
   * @param {string} kind - Symbol kind
   * @returns {boolean}
   */
  SymbolKind.isCallable = function(kind) {
    return kind === SymbolKind.FUNCTION ||
           kind === SymbolKind.METHOD ||
           kind === SymbolKind.CONSTRUCTOR;
  };

  /**
   * Check if a symbol kind is a type definition
   * @param {string} kind - Symbol kind
   * @returns {boolean}
   */
  SymbolKind.isTypeDefinition = function(kind) {
    return kind === SymbolKind.CLASS ||
           kind === SymbolKind.INTERFACE ||
           kind === SymbolKind.TYPE_ALIAS ||
           kind === SymbolKind.ENUM;
  };

  /**
   * Check if a symbol kind can have members
   * @param {string} kind - Symbol kind
   * @returns {boolean}
   */
  SymbolKind.canHaveMembers = function(kind) {
    return kind === SymbolKind.CLASS ||
           kind === SymbolKind.INTERFACE ||
           kind === SymbolKind.ENUM ||
           kind === SymbolKind.MODULE;
  };

  /**
   * Check if a symbol kind is a value (can be assigned)
   * @param {string} kind - Symbol kind
   * @returns {boolean}
   */
  SymbolKind.isValue = function(kind) {
    return kind === SymbolKind.VARIABLE ||
           kind === SymbolKind.CONSTANT ||
           kind === SymbolKind.PARAMETER ||
           kind === SymbolKind.PROPERTY ||
           kind === SymbolKind.FUNCTION ||
           kind === SymbolKind.METHOD ||
           kind === SymbolKind.GETTER ||
           kind === SymbolKind.ENUM_MEMBER;
  };

  /**
   * Get completion item kind for UI display
   * @param {string} kind - Symbol kind
   * @returns {string} - Completion item kind for UI
   */
  SymbolKind.toCompletionKind = function(kind) {
    switch (kind) {
      case SymbolKind.VARIABLE:
      case SymbolKind.PARAMETER:
        return 'variable';

      case SymbolKind.CONSTANT:
        return 'constant';

      case SymbolKind.FUNCTION:
        return 'function';

      case SymbolKind.METHOD:
      case SymbolKind.CONSTRUCTOR:
        return 'method';

      case SymbolKind.CLASS:
        return 'class';

      case SymbolKind.INTERFACE:
        return 'interface';

      case SymbolKind.PROPERTY:
      case SymbolKind.GETTER:
      case SymbolKind.SETTER:
        return 'property';

      case SymbolKind.ENUM:
        return 'enum';

      case SymbolKind.ENUM_MEMBER:
        return 'enumMember';

      case SymbolKind.MODULE:
        return 'module';

      case SymbolKind.BUILTIN:
        return 'builtin';

      default:
        return 'text';
    }
  };

  // ============================================
  // Freeze the object after adding all methods
  // ============================================

  Object.freeze(SymbolKind);

  // ============================================
  // Export
  // ============================================

  CodeEditor.SymbolKind = SymbolKind;

})(window.CodeEditor = window.CodeEditor || {});
