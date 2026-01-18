/**
 * @fileoverview Symbol class representing a named entity in the code
 * @module features/autocomplete/symbols/Symbol
 */

(function(CodeEditor) {
  'use strict';

  var SymbolKind = CodeEditor.SymbolKind;
  var Type = CodeEditor.Type;

  // ============================================
  // Symbol Class
  // ============================================

  /**
   * Represents a symbol (variable, function, class, etc.) in the code
   * @class
   * @param {string} name - Symbol name
   * @param {string} kind - Symbol kind (from SymbolKind)
   * @param {Type} [type] - Symbol type
   * @param {Object} [options] - Additional options
   */
  function Symbol(name, kind, type, options) {
    options = options || {};

    /**
     * Symbol name
     * @type {string}
     */
    this.name = name;

    /**
     * Symbol kind (from SymbolKind enum)
     * @type {string}
     */
    this.kind = kind || SymbolKind.UNKNOWN;

    /**
     * Symbol type
     * @type {Type}
     */
    this.type = type || Type.ANY;

    /**
     * Location where symbol is defined
     * @type {{ start: number, end: number, line: number, column: number }|null}
     */
    this.location = options.location || null;

    /**
     * Documentation string (from comments/JSDoc)
     * @type {string|null}
     */
    this.documentation = options.documentation || null;

    /**
     * Whether this symbol is exported
     * @type {boolean}
     */
    this.isExported = options.isExported || false;

    /**
     * Whether this symbol is a default export
     * @type {boolean}
     */
    this.isDefaultExport = options.isDefaultExport || false;

    /**
     * Whether this symbol is read-only (const)
     * @type {boolean}
     */
    this.isReadOnly = options.isReadOnly || false;

    /**
     * Declaration kind (var, let, const for variables)
     * @type {string|null}
     */
    this.declarationKind = options.declarationKind || null;

    /**
     * For class members: whether this is static
     * @type {boolean}
     */
    this.isStatic = options.isStatic || false;

    /**
     * For class members: visibility (public, private, protected)
     * @type {string}
     */
    this.visibility = options.visibility || 'public';

    /**
     * Child symbols (for classes, modules, etc.)
     * @type {Map<string, Symbol>}
     */
    this.members = new Map();

    /**
     * Reference count (how many times this symbol is used)
     * @type {number}
     */
    this.references = 0;

    /**
     * Parent symbol (for nested symbols)
     * @type {Symbol|null}
     */
    this.parent = null;
  }

  // ----------------------------------------
  // Member Management
  // ----------------------------------------

  /**
   * Add a member symbol
   * @param {Symbol} member - Member symbol to add
   * @returns {Symbol} - this for chaining
   */
  Symbol.prototype.addMember = function(member) {
    member.parent = this;
    this.members.set(member.name, member);
    return this;
  };

  /**
   * Get a member symbol by name
   * @param {string} name - Member name
   * @returns {Symbol|null}
   */
  Symbol.prototype.getMember = function(name) {
    return this.members.get(name) || null;
  };

  /**
   * Check if a member exists
   * @param {string} name - Member name
   * @returns {boolean}
   */
  Symbol.prototype.hasMember = function(name) {
    return this.members.has(name);
  };

  /**
   * Get all member names
   * @returns {string[]}
   */
  Symbol.prototype.getMemberNames = function() {
    return Array.from(this.members.keys());
  };

  /**
   * Get all members
   * @returns {Symbol[]}
   */
  Symbol.prototype.getAllMembers = function() {
    return Array.from(this.members.values());
  };

  /**
   * Remove a member
   * @param {string} name - Member name
   * @returns {boolean} - true if member existed
   */
  Symbol.prototype.removeMember = function(name) {
    var member = this.members.get(name);
    if (member) {
      member.parent = null;
      return this.members.delete(name);
    }
    return false;
  };

  // ----------------------------------------
  // Symbol Properties
  // ----------------------------------------

  /**
   * Check if this symbol is callable (function, method, constructor)
   * @returns {boolean}
   */
  Symbol.prototype.isCallable = function() {
    return SymbolKind.isCallable(this.kind);
  };

  /**
   * Check if this symbol is a type definition
   * @returns {boolean}
   */
  Symbol.prototype.isTypeDefinition = function() {
    return SymbolKind.isTypeDefinition(this.kind);
  };

  /**
   * Check if this symbol can have members
   * @returns {boolean}
   */
  Symbol.prototype.canHaveMembers = function() {
    return SymbolKind.canHaveMembers(this.kind);
  };

  /**
   * Check if this symbol is a value
   * @returns {boolean}
   */
  Symbol.prototype.isValue = function() {
    return SymbolKind.isValue(this.kind);
  };

  /**
   * Get the fully qualified name (including parent names)
   * @returns {string}
   */
  Symbol.prototype.getFullName = function() {
    var parts = [this.name];
    var current = this.parent;

    while (current) {
      parts.unshift(current.name);
      current = current.parent;
    }

    return parts.join('.');
  };

  /**
   * Increment reference count
   */
  Symbol.prototype.addReference = function() {
    this.references++;
  };

  /**
   * Get completion item kind for UI
   * @returns {string}
   */
  Symbol.prototype.getCompletionKind = function() {
    return SymbolKind.toCompletionKind(this.kind);
  };

  // ----------------------------------------
  // Type Utilities
  // ----------------------------------------

  /**
   * Get the type string for display
   * @returns {string}
   */
  Symbol.prototype.getTypeString = function() {
    return this.type ? this.type.toString() : 'any';
  };

  /**
   * Get signature string for functions/methods
   * @returns {string}
   */
  Symbol.prototype.getSignature = function() {
    if (!this.isCallable()) {
      return this.name + ': ' + this.getTypeString();
    }

    // For functions, show the full signature
    return this.name + this.getTypeString();
  };

  // ----------------------------------------
  // Utilities
  // ----------------------------------------

  /**
   * String representation
   * @returns {string}
   */
  Symbol.prototype.toString = function() {
    var parts = [this.kind, this.name];

    if (this.type && this.type !== Type.ANY) {
      parts.push(': ' + this.type.toString());
    }

    return parts.join(' ');
  };

  /**
   * Clone this symbol (shallow clone)
   * @returns {Symbol}
   */
  Symbol.prototype.clone = function() {
    var cloned = new Symbol(this.name, this.kind, this.type, {
      location: this.location,
      documentation: this.documentation,
      isExported: this.isExported,
      isDefaultExport: this.isDefaultExport,
      isReadOnly: this.isReadOnly,
      declarationKind: this.declarationKind,
      isStatic: this.isStatic,
      visibility: this.visibility
    });

    // Clone members
    for (var entry of this.members) {
      cloned.addMember(entry[1].clone());
    }

    return cloned;
  };

  /**
   * Convert to completion item format
   * @returns {Object}
   */
  Symbol.prototype.toCompletionItem = function() {
    return {
      label: this.name,
      kind: this.getCompletionKind(),
      detail: this.getTypeString(),
      documentation: this.documentation,
      insertText: this.name,
      isStatic: this.isStatic,
      isReadOnly: this.isReadOnly
    };
  };

  // ============================================
  // Factory Functions
  // ============================================

  /**
   * Create a variable symbol
   * @param {string} name - Variable name
   * @param {Type} type - Variable type
   * @param {string} [declarationKind] - var, let, or const
   * @returns {Symbol}
   */
  Symbol.createVariable = function(name, type, declarationKind) {
    var kind = declarationKind === 'const' ? SymbolKind.CONSTANT : SymbolKind.VARIABLE;
    return new Symbol(name, kind, type, {
      declarationKind: declarationKind,
      isReadOnly: declarationKind === 'const'
    });
  };

  /**
   * Create a function symbol
   * @param {string} name - Function name
   * @param {Type} type - Function type
   * @returns {Symbol}
   */
  Symbol.createFunction = function(name, type) {
    return new Symbol(name, SymbolKind.FUNCTION, type);
  };

  /**
   * Create a class symbol
   * @param {string} name - Class name
   * @param {Type} type - Class type
   * @returns {Symbol}
   */
  Symbol.createClass = function(name, type) {
    return new Symbol(name, SymbolKind.CLASS, type);
  };

  /**
   * Create a parameter symbol
   * @param {string} name - Parameter name
   * @param {Type} type - Parameter type
   * @returns {Symbol}
   */
  Symbol.createParameter = function(name, type) {
    return new Symbol(name, SymbolKind.PARAMETER, type);
  };

  /**
   * Create a property symbol
   * @param {string} name - Property name
   * @param {Type} type - Property type
   * @param {Object} [options] - Additional options
   * @returns {Symbol}
   */
  Symbol.createProperty = function(name, type, options) {
    return new Symbol(name, SymbolKind.PROPERTY, type, options);
  };

  /**
   * Create a method symbol
   * @param {string} name - Method name
   * @param {Type} type - Method type (FunctionType)
   * @param {Object} [options] - Additional options
   * @returns {Symbol}
   */
  Symbol.createMethod = function(name, type, options) {
    return new Symbol(name, SymbolKind.METHOD, type, options);
  };

  /**
   * Create a builtin symbol
   * @param {string} name - Builtin name
   * @param {Type} type - Builtin type
   * @returns {Symbol}
   */
  Symbol.createBuiltin = function(name, type) {
    return new Symbol(name, SymbolKind.BUILTIN, type);
  };

  // ============================================
  // Export
  // ============================================

  CodeEditor.Symbol = Symbol;

})(window.CodeEditor = window.CodeEditor || {});
