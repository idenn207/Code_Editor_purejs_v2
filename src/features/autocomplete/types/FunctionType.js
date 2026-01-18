/**
 * @fileoverview Function type class with parameters and return type
 * @module features/autocomplete/types/FunctionType
 */

(function(CodeEditor) {
  'use strict';

  var TypeKind = CodeEditor.TypeKind;
  var Type = CodeEditor.Type;

  // ============================================
  // FunctionType Class
  // ============================================

  /**
   * Represents a function type with parameters and return type
   * @class
   * @extends Type
   * @param {Array<{name: string, type: Type, optional?: boolean, rest?: boolean}>} [params] - Parameters
   * @param {Type} [returnType] - Return type (defaults to VOID)
   */
  function FunctionType(params, returnType) {
    Type.call(this, TypeKind.FUNCTION);

    /**
     * Function parameters
     * @type {Array<{name: string, type: Type, optional: boolean, rest: boolean}>}
     */
    this.params = (params || []).map(function(p) {
      return {
        name: p.name || 'arg',
        type: p.type || Type.ANY,
        optional: p.optional || false,
        rest: p.rest || false
      };
    });

    /**
     * Return type
     * @type {Type}
     */
    this.returnType = returnType || Type.VOID;

    /**
     * Whether this function is async
     * @type {boolean}
     */
    this.isAsync = false;

    /**
     * Whether this function is a generator
     * @type {boolean}
     */
    this.isGenerator = false;
  }

  // Inherit from Type
  FunctionType.prototype = Object.create(Type.prototype);
  FunctionType.prototype.constructor = FunctionType;

  // ----------------------------------------
  // Parameter Access
  // ----------------------------------------

  /**
   * Get parameter type by index
   * @param {number} index - Parameter index
   * @returns {Type|null}
   */
  FunctionType.prototype.getParamType = function(index) {
    if (index < 0 || index >= this.params.length) {
      // Check for rest parameter
      var lastParam = this.params[this.params.length - 1];
      if (lastParam && lastParam.rest) {
        return lastParam.type;
      }
      return null;
    }
    return this.params[index].type;
  };

  /**
   * Get parameter name by index
   * @param {number} index - Parameter index
   * @returns {string|null}
   */
  FunctionType.prototype.getParamName = function(index) {
    if (index < 0 || index >= this.params.length) return null;
    return this.params[index].name;
  };

  /**
   * Get the number of required parameters
   * @returns {number}
   */
  FunctionType.prototype.getRequiredParamCount = function() {
    var count = 0;
    for (var i = 0; i < this.params.length; i++) {
      if (!this.params[i].optional && !this.params[i].rest) {
        count++;
      }
    }
    return count;
  };

  /**
   * Get the total number of parameters
   * @returns {number}
   */
  FunctionType.prototype.getParamCount = function() {
    return this.params.length;
  };

  /**
   * Check if this function has a rest parameter
   * @returns {boolean}
   */
  FunctionType.prototype.hasRestParam = function() {
    var lastParam = this.params[this.params.length - 1];
    return lastParam && lastParam.rest;
  };

  // ----------------------------------------
  // Member Access (Functions are objects too)
  // ----------------------------------------

  /**
   * Get a member type (functions have properties like length, name, etc.)
   * @param {string} name - Member name
   * @returns {Type|null}
   */
  FunctionType.prototype.getMember = function(name) {
    // Function.prototype members
    if (FunctionType._sharedMembers && FunctionType._sharedMembers.has(name)) {
      return FunctionType._sharedMembers.get(name);
    }
    return null;
  };

  /**
   * Get all member names
   * @returns {string[]}
   */
  FunctionType.prototype.getMemberNames = function() {
    if (FunctionType._sharedMembers) {
      return Array.from(FunctionType._sharedMembers.keys());
    }
    return [];
  };

  // ----------------------------------------
  // Type Comparison
  // ----------------------------------------

  /**
   * Check if this type equals another type
   * @param {Type} other
   * @returns {boolean}
   */
  FunctionType.prototype.equals = function(other) {
    if (!other || other.kind !== TypeKind.FUNCTION) return false;

    var otherFunc = other;

    // Check parameter count
    if (this.params.length !== otherFunc.params.length) return false;

    // Check each parameter
    for (var i = 0; i < this.params.length; i++) {
      if (!this.params[i].type.equals(otherFunc.params[i].type)) {
        return false;
      }
    }

    // Check return type
    return this.returnType.equals(otherFunc.returnType);
  };

  /**
   * Check if this type is assignable to another type
   * @param {Type} target
   * @returns {boolean}
   */
  FunctionType.prototype.isAssignableTo = function(target) {
    if (!target) return false;

    // Any accepts everything
    if (target.kind === TypeKind.ANY) return true;

    // Must be function type
    if (target.kind !== TypeKind.FUNCTION) return false;

    var targetFunc = target;

    // Check parameter count (source can have fewer required params)
    if (this.getRequiredParamCount() > targetFunc.params.length) {
      return false;
    }

    // Check parameters (contravariant)
    for (var i = 0; i < targetFunc.params.length; i++) {
      var sourceParam = this.params[i];
      var targetParam = targetFunc.params[i];

      if (sourceParam && !targetParam.type.isAssignableTo(sourceParam.type)) {
        return false;
      }
    }

    // Check return type (covariant)
    return this.returnType.isAssignableTo(targetFunc.returnType);
  };

  // ----------------------------------------
  // Type Utilities
  // ----------------------------------------

  /**
   * String representation
   * @returns {string}
   */
  FunctionType.prototype.toString = function() {
    var paramsStr = this.params.map(function(p) {
      var str = p.name;
      if (p.optional) str += '?';
      if (p.rest) str = '...' + str;
      str += ': ' + p.type.toString();
      return str;
    }).join(', ');

    return '(' + paramsStr + ') => ' + this.returnType.toString();
  };

  /**
   * Clone this type
   * @returns {FunctionType}
   */
  FunctionType.prototype.clone = function() {
    var clonedParams = this.params.map(function(p) {
      return {
        name: p.name,
        type: p.type.clone(),
        optional: p.optional,
        rest: p.rest
      };
    });

    var cloned = new FunctionType(clonedParams, this.returnType.clone());
    cloned.isAsync = this.isAsync;
    cloned.isGenerator = this.isGenerator;
    return cloned;
  };

  /**
   * Check if this function is callable (always true for FunctionType)
   * @returns {boolean}
   */
  FunctionType.prototype.isCallable = function() {
    return true;
  };

  // ============================================
  // Static Properties
  // ============================================

  /**
   * Shared members for all functions (length, name, bind, call, apply)
   * @type {Map<string, Type>}
   */
  FunctionType._sharedMembers = new Map();

  /**
   * Set a shared member for all functions
   * @param {string} name - Member name
   * @param {Type} type - Member type
   */
  FunctionType.setSharedMember = function(name, type) {
    FunctionType._sharedMembers.set(name, type);
  };

  // ============================================
  // Factory Functions
  // ============================================

  /**
   * Create a function type that takes no arguments and returns void
   * @returns {FunctionType}
   */
  FunctionType.voidFunction = function() {
    return new FunctionType([], Type.VOID);
  };

  /**
   * Create a function type with specified return type and no parameters
   * @param {Type} returnType - Return type
   * @returns {FunctionType}
   */
  FunctionType.returning = function(returnType) {
    return new FunctionType([], returnType);
  };

  /**
   * Create a predicate function type (takes one arg, returns boolean)
   * @param {Type} argType - Argument type
   * @returns {FunctionType}
   */
  FunctionType.predicate = function(argType) {
    return new FunctionType(
      [{ name: 'value', type: argType }],
      CodeEditor.PrimitiveType ? CodeEditor.PrimitiveType.BOOLEAN : new Type(TypeKind.BOOLEAN)
    );
  };

  // ============================================
  // Export
  // ============================================

  CodeEditor.FunctionType = FunctionType;

})(window.CodeEditor = window.CodeEditor || {});
