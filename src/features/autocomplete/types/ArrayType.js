/**
 * @fileoverview Array type class with element type
 * @module features/autocomplete/types/ArrayType
 */

(function(CodeEditor) {
  'use strict';

  var TypeKind = CodeEditor.TypeKind;
  var Type = CodeEditor.Type;

  // ============================================
  // ArrayType Class
  // ============================================

  /**
   * Represents an array type with a specific element type
   * @class
   * @extends Type
   * @param {Type} [elementType] - Type of array elements (defaults to ANY)
   */
  function ArrayType(elementType) {
    Type.call(this, TypeKind.ARRAY);

    /**
     * Type of elements in the array
     * @type {Type}
     */
    this.elementType = elementType || Type.ANY;

    /**
     * Array methods will be populated by BuiltinTypes
     * @type {Map<string, Type>}
     */
    this._methods = new Map();
  }

  // Inherit from Type
  ArrayType.prototype = Object.create(Type.prototype);
  ArrayType.prototype.constructor = ArrayType;

  // ----------------------------------------
  // Member Access
  // ----------------------------------------

  /**
   * Get a member (method/property) type by name
   * @param {string} name - Member name
   * @returns {Type|null}
   */
  ArrayType.prototype.getMember = function(name) {
    // Check instance methods first
    if (this._methods.has(name)) {
      return this._methods.get(name);
    }

    // Check shared array methods
    if (ArrayType._sharedMethods && ArrayType._sharedMethods.has(name)) {
      return ArrayType._sharedMethods.get(name);
    }

    return null;
  };

  /**
   * Get all member names
   * @returns {string[]}
   */
  ArrayType.prototype.getMemberNames = function() {
    var names = new Set(this._methods.keys());

    // Add shared methods
    if (ArrayType._sharedMethods) {
      for (var name of ArrayType._sharedMethods.keys()) {
        names.add(name);
      }
    }

    return Array.from(names);
  };

  /**
   * Set a method type (used during initialization)
   * @param {string} name - Method name
   * @param {Type} type - Method type
   */
  ArrayType.prototype.setMethod = function(name, type) {
    this._methods.set(name, type);
  };

  // ----------------------------------------
  // Type Comparison
  // ----------------------------------------

  /**
   * Check if this type equals another type
   * @param {Type} other
   * @returns {boolean}
   */
  ArrayType.prototype.equals = function(other) {
    if (!other || other.kind !== TypeKind.ARRAY) return false;
    return this.elementType.equals(other.elementType);
  };

  /**
   * Check if this type is assignable to another type
   * @param {Type} target
   * @returns {boolean}
   */
  ArrayType.prototype.isAssignableTo = function(target) {
    if (!target) return false;

    // Any accepts everything
    if (target.kind === TypeKind.ANY) return true;

    // Must be array type
    if (target.kind !== TypeKind.ARRAY) return false;

    // Element type must be assignable
    return this.elementType.isAssignableTo(target.elementType);
  };

  // ----------------------------------------
  // Type Utilities
  // ----------------------------------------

  /**
   * String representation
   * @returns {string}
   */
  ArrayType.prototype.toString = function() {
    var elemStr = this.elementType.toString();

    // Wrap complex types in parentheses
    if (this.elementType.kind === TypeKind.UNION ||
        this.elementType.kind === TypeKind.FUNCTION) {
      elemStr = '(' + elemStr + ')';
    }

    return elemStr + '[]';
  };

  /**
   * Clone this type
   * @returns {ArrayType}
   */
  ArrayType.prototype.clone = function() {
    var cloned = new ArrayType(this.elementType.clone());
    cloned._methods = new Map(this._methods);
    return cloned;
  };

  /**
   * Create a new array type with a different element type
   * @param {Type} newElementType
   * @returns {ArrayType}
   */
  ArrayType.prototype.withElementType = function(newElementType) {
    return new ArrayType(newElementType);
  };

  // ============================================
  // Static Properties
  // ============================================

  /**
   * Shared methods for all array types
   * Will be populated by BuiltinTypes module
   * @type {Map<string, Type>}
   */
  ArrayType._sharedMethods = new Map();

  /**
   * Set a shared method for all arrays
   * @param {string} name - Method name
   * @param {Type} type - Method type
   */
  ArrayType.setSharedMethod = function(name, type) {
    ArrayType._sharedMethods.set(name, type);
  };

  /**
   * Set multiple shared methods
   * @param {Object} methods - Object mapping names to types
   */
  ArrayType.setSharedMethods = function(methods) {
    Object.keys(methods).forEach(function(name) {
      ArrayType._sharedMethods.set(name, methods[name]);
    });
  };

  // ============================================
  // Factory Functions
  // ============================================

  /**
   * Create an array type with any element type
   * @returns {ArrayType}
   */
  ArrayType.ofAny = function() {
    return new ArrayType(Type.ANY);
  };

  /**
   * Create an array type from multiple possible element types (union)
   * @param {Type[]} types - Element types
   * @returns {ArrayType}
   */
  ArrayType.ofUnion = function(types) {
    // UnionType will be created when UnionType is available
    // For now, use the first type or ANY
    if (types.length === 0) {
      return new ArrayType(Type.ANY);
    }
    if (types.length === 1) {
      return new ArrayType(types[0]);
    }
    // Will be replaced with UnionType when available
    return new ArrayType(types[0]);
  };

  // ============================================
  // Export
  // ============================================

  CodeEditor.ArrayType = ArrayType;

})(window.CodeEditor = window.CodeEditor || {});
