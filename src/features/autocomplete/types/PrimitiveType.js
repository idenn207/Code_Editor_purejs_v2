/**
 * @fileoverview Primitive type class for string, number, boolean, etc.
 * @module features/autocomplete/types/PrimitiveType
 */

(function(CodeEditor) {
  'use strict';

  var TypeKind = CodeEditor.TypeKind;
  var Type = CodeEditor.Type;

  // ============================================
  // PrimitiveType Class
  // ============================================

  /**
   * Represents primitive types: string, number, boolean, null, undefined, symbol, bigint
   * @class
   * @extends Type
   * @param {string} kind - The primitive type kind
   */
  function PrimitiveType(kind) {
    Type.call(this, kind);

    // Members will be populated by BuiltinTypes
    this._members = new Map();
  }

  // Inherit from Type
  PrimitiveType.prototype = Object.create(Type.prototype);
  PrimitiveType.prototype.constructor = PrimitiveType;

  // ----------------------------------------
  // Member Access
  // ----------------------------------------

  /**
   * Get a member (property/method) type by name
   * Primitive types get their members from built-in prototypes
   * @param {string} name - Member name
   * @returns {Type|null}
   */
  PrimitiveType.prototype.getMember = function(name) {
    return this._members.get(name) || null;
  };

  /**
   * Get all member names
   * @returns {string[]}
   */
  PrimitiveType.prototype.getMemberNames = function() {
    return Array.from(this._members.keys());
  };

  /**
   * Set a member type (used during initialization)
   * @param {string} name - Member name
   * @param {Type} type - Member type
   */
  PrimitiveType.prototype.setMember = function(name, type) {
    this._members.set(name, type);
  };

  /**
   * Set multiple members at once
   * @param {Object} members - Object mapping names to types
   */
  PrimitiveType.prototype.setMembers = function(members) {
    var self = this;
    Object.keys(members).forEach(function(name) {
      self._members.set(name, members[name]);
    });
  };

  // ----------------------------------------
  // Type Comparison
  // ----------------------------------------

  /**
   * Check if this type equals another type
   * @param {Type} other
   * @returns {boolean}
   */
  PrimitiveType.prototype.equals = function(other) {
    if (!other) return false;
    return this.kind === other.kind;
  };

  /**
   * Check if this type is assignable to another type
   * @param {Type} target
   * @returns {boolean}
   */
  PrimitiveType.prototype.isAssignableTo = function(target) {
    if (!target) return false;

    // Any accepts everything
    if (target.kind === TypeKind.ANY) return true;

    // Same type
    if (this.kind === target.kind) return true;

    // null and undefined are assignable to each other in some modes
    if (this.kind === TypeKind.NULL && target.kind === TypeKind.UNDEFINED) return true;
    if (this.kind === TypeKind.UNDEFINED && target.kind === TypeKind.NULL) return true;

    return false;
  };

  // ----------------------------------------
  // Type Utilities
  // ----------------------------------------

  /**
   * String representation
   * @returns {string}
   */
  PrimitiveType.prototype.toString = function() {
    return this.kind;
  };

  /**
   * Clone this type - returns the singleton for primitive types
   * @returns {PrimitiveType}
   */
  PrimitiveType.prototype.clone = function() {
    return PrimitiveType.fromKind(this.kind) || this;
  };

  // ============================================
  // Singleton Instances
  // ============================================

  /**
   * Singleton instances for each primitive type
   * Members will be populated by BuiltinTypes module
   */
  PrimitiveType.STRING = new PrimitiveType(TypeKind.STRING);
  PrimitiveType.NUMBER = new PrimitiveType(TypeKind.NUMBER);
  PrimitiveType.BOOLEAN = new PrimitiveType(TypeKind.BOOLEAN);
  PrimitiveType.NULL = new PrimitiveType(TypeKind.NULL);
  PrimitiveType.UNDEFINED = new PrimitiveType(TypeKind.UNDEFINED);
  PrimitiveType.SYMBOL = new PrimitiveType(TypeKind.SYMBOL);
  PrimitiveType.BIGINT = new PrimitiveType(TypeKind.BIGINT);

  // ============================================
  // Factory Functions
  // ============================================

  /**
   * Get a primitive type by kind
   * @param {string} kind - Type kind
   * @returns {PrimitiveType|null}
   */
  PrimitiveType.fromKind = function(kind) {
    switch (kind) {
      case TypeKind.STRING: return PrimitiveType.STRING;
      case TypeKind.NUMBER: return PrimitiveType.NUMBER;
      case TypeKind.BOOLEAN: return PrimitiveType.BOOLEAN;
      case TypeKind.NULL: return PrimitiveType.NULL;
      case TypeKind.UNDEFINED: return PrimitiveType.UNDEFINED;
      case TypeKind.SYMBOL: return PrimitiveType.SYMBOL;
      case TypeKind.BIGINT: return PrimitiveType.BIGINT;
      default: return null;
    }
  };

  /**
   * Get a primitive type from a JavaScript value
   * @param {*} value - JavaScript value
   * @returns {PrimitiveType|null}
   */
  PrimitiveType.fromValue = function(value) {
    if (value === null) return PrimitiveType.NULL;
    if (value === undefined) return PrimitiveType.UNDEFINED;

    var type = typeof value;
    switch (type) {
      case 'string': return PrimitiveType.STRING;
      case 'number': return PrimitiveType.NUMBER;
      case 'boolean': return PrimitiveType.BOOLEAN;
      case 'symbol': return PrimitiveType.SYMBOL;
      case 'bigint': return PrimitiveType.BIGINT;
      default: return null;
    }
  };

  /**
   * Check if a type is a primitive type
   * @param {Type} type - Type to check
   * @returns {boolean}
   */
  PrimitiveType.isPrimitive = function(type) {
    if (!type || !type.kind) return false;
    return type.kind === TypeKind.STRING ||
           type.kind === TypeKind.NUMBER ||
           type.kind === TypeKind.BOOLEAN ||
           type.kind === TypeKind.NULL ||
           type.kind === TypeKind.UNDEFINED ||
           type.kind === TypeKind.SYMBOL ||
           type.kind === TypeKind.BIGINT;
  };

  // ============================================
  // Export
  // ============================================

  CodeEditor.PrimitiveType = PrimitiveType;

})(window.CodeEditor = window.CodeEditor || {});
