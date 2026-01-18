/**
 * @fileoverview Base Type class for the type system
 * @module features/autocomplete/types/Type
 */

(function(CodeEditor) {
  'use strict';

  var TypeKind = CodeEditor.TypeKind;

  // ============================================
  // Type Class
  // ============================================

  /**
   * Base class for all types in the type system
   * @class
   */
  function Type(kind) {
    this.kind = kind !== undefined ? kind : TypeKind.ANY;
  }

  // ----------------------------------------
  // Member Access
  // ----------------------------------------

  /**
   * Get a member (property/method) type by name
   * @param {string} name - Member name
   * @returns {Type|null} - Member type or null if not found
   */
  Type.prototype.getMember = function(name) {
    return null;
  };

  /**
   * Get all member names available on this type
   * @returns {string[]} - Array of member names
   */
  Type.prototype.getMemberNames = function() {
    return [];
  };

  /**
   * Check if this type has a member with the given name
   * @param {string} name - Member name
   * @returns {boolean}
   */
  Type.prototype.hasMember = function(name) {
    return this.getMember(name) !== null;
  };

  // ----------------------------------------
  // Type Comparison
  // ----------------------------------------

  /**
   * Check if this type equals another type
   * @param {Type} other - Another type to compare
   * @returns {boolean}
   */
  Type.prototype.equals = function(other) {
    if (!other) return false;
    return this.kind === other.kind;
  };

  /**
   * Check if this type is assignable to another type
   * @param {Type} target - Target type
   * @returns {boolean}
   */
  Type.prototype.isAssignableTo = function(target) {
    if (!target) return false;

    // Any type accepts everything
    if (target.kind === TypeKind.ANY) return true;

    // Everything is assignable to unknown
    if (target.kind === TypeKind.UNKNOWN) return true;

    // Never is assignable to everything (bottom type)
    if (this.kind === TypeKind.NEVER) return true;

    // Same kind check
    return this.equals(target);
  };

  // ----------------------------------------
  // Type Utilities
  // ----------------------------------------

  /**
   * Get a human-readable string representation of this type
   * @returns {string}
   */
  Type.prototype.toString = function() {
    return this.kind;
  };

  /**
   * Create a deep clone of this type
   * @returns {Type}
   */
  Type.prototype.clone = function() {
    return new Type(this.kind);
  };

  /**
   * Check if this type is a primitive type
   * @returns {boolean}
   */
  Type.prototype.isPrimitive = function() {
    return this.kind === TypeKind.STRING ||
           this.kind === TypeKind.NUMBER ||
           this.kind === TypeKind.BOOLEAN ||
           this.kind === TypeKind.NULL ||
           this.kind === TypeKind.UNDEFINED ||
           this.kind === TypeKind.SYMBOL ||
           this.kind === TypeKind.BIGINT;
  };

  /**
   * Check if this type represents a callable (function)
   * @returns {boolean}
   */
  Type.prototype.isCallable = function() {
    return this.kind === TypeKind.FUNCTION;
  };

  /**
   * Check if this type is constructable (can be used with new)
   * @returns {boolean}
   */
  Type.prototype.isConstructable = function() {
    return this.kind === TypeKind.CLASS ||
           this.kind === TypeKind.FUNCTION;
  };

  // ============================================
  // Singleton Type Instances
  // ============================================

  /**
   * Singleton instances for common types
   */
  Type.ANY = new Type(TypeKind.ANY);
  Type.VOID = new Type(TypeKind.VOID);
  Type.NEVER = new Type(TypeKind.NEVER);
  Type.UNKNOWN = new Type(TypeKind.UNKNOWN);

  // ============================================
  // Export
  // ============================================

  CodeEditor.Type = Type;

})(window.CodeEditor = window.CodeEditor || {});
