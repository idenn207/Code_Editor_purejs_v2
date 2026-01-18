/**
 * @fileoverview Type variable class for generic type parameters (T, U, K, etc.)
 * @module features/autocomplete/types/TypeVariable
 */

(function(CodeEditor) {
  'use strict';

  var TypeKind = CodeEditor.TypeKind;
  var Type = CodeEditor.Type;

  // ============================================
  // TypeVariable Class
  // ============================================

  /**
   * Represents a type variable (T, U, K, V, etc.) used in generic types
   * @class
   * @extends Type
   * @param {string} name - Variable name (e.g., 'T', 'U', 'K')
   * @param {Type} [constraint] - Optional constraint (extends constraint)
   */
  function TypeVariable(name, constraint) {
    Type.call(this, TypeKind.TYPE_VARIABLE);

    /**
     * Name of the type variable
     * @type {string}
     */
    this.name = name;

    /**
     * Optional constraint (e.g., T extends SomeType)
     * @type {Type|null}
     */
    this.constraint = constraint || null;

    /**
     * Unique identifier for this type variable instance
     * @type {number}
     */
    this.id = TypeVariable._nextId++;
  }

  // Inherit from Type
  TypeVariable.prototype = Object.create(Type.prototype);
  TypeVariable.prototype.constructor = TypeVariable;

  /**
   * Counter for unique IDs
   * @type {number}
   * @private
   */
  TypeVariable._nextId = 1;

  // ----------------------------------------
  // Type Substitution
  // ----------------------------------------

  /**
   * Substitute this type variable with a concrete type if it exists in the map
   * @param {Map<string, Type>|Object} typeMap - Map of type variable names to types
   * @returns {Type} - The substituted type or this if not found
   */
  TypeVariable.prototype.substitute = function(typeMap) {
    var resolved = null;

    if (typeMap instanceof Map) {
      resolved = typeMap.get(this.name);
    } else if (typeMap && typeof typeMap === 'object') {
      resolved = typeMap[this.name];
    }

    if (resolved) {
      return resolved;
    }

    return this;
  };

  /**
   * Check if this type variable is resolved in the given type map
   * @param {Map<string, Type>|Object} typeMap - Map of type variable names to types
   * @returns {boolean}
   */
  TypeVariable.prototype.isResolved = function(typeMap) {
    if (typeMap instanceof Map) {
      return typeMap.has(this.name);
    } else if (typeMap && typeof typeMap === 'object') {
      return this.name in typeMap;
    }
    return false;
  };

  // ----------------------------------------
  // Constraint Checking
  // ----------------------------------------

  /**
   * Check if a type satisfies this type variable's constraint
   * @param {Type} type - Type to check
   * @returns {boolean}
   */
  TypeVariable.prototype.satisfiesConstraint = function(type) {
    if (!this.constraint) {
      return true;
    }

    return type.isAssignableTo(this.constraint);
  };

  /**
   * Get the effective bound of this type variable
   * Returns the constraint if set, otherwise Type.ANY
   * @returns {Type}
   */
  TypeVariable.prototype.getBound = function() {
    return this.constraint || Type.ANY;
  };

  // ----------------------------------------
  // Member Access (delegates to constraint or returns null)
  // ----------------------------------------

  /**
   * Get a member type by name (delegates to constraint)
   * @param {string} name - Member name
   * @returns {Type|null}
   */
  TypeVariable.prototype.getMember = function(name) {
    if (this.constraint) {
      return this.constraint.getMember(name);
    }
    return null;
  };

  /**
   * Get all member names (delegates to constraint)
   * @returns {string[]}
   */
  TypeVariable.prototype.getMemberNames = function() {
    if (this.constraint) {
      return this.constraint.getMemberNames();
    }
    return [];
  };

  // ----------------------------------------
  // Type Comparison
  // ----------------------------------------

  /**
   * Check if this type variable equals another
   * @param {Type} other
   * @returns {boolean}
   */
  TypeVariable.prototype.equals = function(other) {
    if (!other || other.kind !== TypeKind.TYPE_VARIABLE) return false;

    // Same instance or same name
    if (this === other) return true;
    if (this.name !== other.name) return false;

    // Check constraint equality
    if (this.constraint && other.constraint) {
      return this.constraint.equals(other.constraint);
    }

    return !this.constraint && !other.constraint;
  };

  /**
   * Check if this type is assignable to another type
   * @param {Type} target
   * @returns {boolean}
   */
  TypeVariable.prototype.isAssignableTo = function(target) {
    if (!target) return false;

    // Any accepts everything
    if (target.kind === TypeKind.ANY) return true;

    // Same type variable
    if (target.kind === TypeKind.TYPE_VARIABLE) {
      if (this.equals(target)) return true;

      // Check if this type variable's constraint is assignable to target's constraint
      if (this.constraint && target.constraint) {
        return this.constraint.isAssignableTo(target.constraint);
      }

      // If target has no constraint, this is assignable
      if (!target.constraint) return true;

      // If this has constraint, check if it's assignable to target's constraint
      if (this.constraint) {
        return this.constraint.isAssignableTo(target.constraint);
      }
    }

    // Check if constraint is assignable to target
    if (this.constraint) {
      return this.constraint.isAssignableTo(target);
    }

    return false;
  };

  // ----------------------------------------
  // Type Utilities
  // ----------------------------------------

  /**
   * String representation
   * @returns {string}
   */
  TypeVariable.prototype.toString = function() {
    if (this.constraint) {
      return this.name + ' extends ' + this.constraint.toString();
    }
    return this.name;
  };

  /**
   * Clone this type variable
   * @returns {TypeVariable}
   */
  TypeVariable.prototype.clone = function() {
    var cloned = new TypeVariable(
      this.name,
      this.constraint ? this.constraint.clone() : null
    );
    return cloned;
  };

  // ============================================
  // Factory Functions
  // ============================================

  /**
   * Create a simple type variable with no constraint
   * @param {string} name - Variable name
   * @returns {TypeVariable}
   */
  TypeVariable.create = function(name) {
    return new TypeVariable(name);
  };

  /**
   * Create a type variable with a constraint
   * @param {string} name - Variable name
   * @param {Type} constraint - Constraint type
   * @returns {TypeVariable}
   */
  TypeVariable.createWithConstraint = function(name, constraint) {
    return new TypeVariable(name, constraint);
  };

  /**
   * Common type variable names
   */
  TypeVariable.T = function() { return new TypeVariable('T'); };
  TypeVariable.U = function() { return new TypeVariable('U'); };
  TypeVariable.K = function() { return new TypeVariable('K'); };
  TypeVariable.V = function() { return new TypeVariable('V'); };
  TypeVariable.R = function() { return new TypeVariable('R'); };

  // ============================================
  // Export
  // ============================================

  CodeEditor.TypeVariable = TypeVariable;

})(window.CodeEditor = window.CodeEditor || {});
