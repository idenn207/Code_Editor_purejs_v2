/**
 * @fileoverview Union type class for A | B type expressions
 * @module features/autocomplete/types/UnionType
 */

(function(CodeEditor) {
  'use strict';

  var TypeKind = CodeEditor.TypeKind;
  var Type = CodeEditor.Type;

  // ============================================
  // UnionType Class
  // ============================================

  /**
   * Represents a union type (A | B | C)
   * @class
   * @extends Type
   * @param {Type[]} [types] - Types in the union
   */
  function UnionType(types) {
    Type.call(this, TypeKind.UNION);

    /**
     * Types in this union (deduplicated and flattened)
     * @type {Type[]}
     */
    this.types = [];

    if (types && types.length > 0) {
      this._addTypes(types);
    }
  }

  // Inherit from Type
  UnionType.prototype = Object.create(Type.prototype);
  UnionType.prototype.constructor = UnionType;

  // ----------------------------------------
  // Type Management
  // ----------------------------------------

  /**
   * Add types to the union (flattens nested unions, deduplicates)
   * @param {Type[]} types - Types to add
   * @private
   */
  UnionType.prototype._addTypes = function(types) {
    var self = this;

    types.forEach(function(type) {
      if (!type) return;

      // Flatten nested unions
      if (type.kind === TypeKind.UNION) {
        self._addTypes(type.types);
        return;
      }

      // Skip never type (identity element for union)
      if (type.kind === TypeKind.NEVER) return;

      // Skip duplicates
      for (var i = 0; i < self.types.length; i++) {
        if (self.types[i].equals(type)) {
          return;
        }
      }

      self.types.push(type);
    });
  };

  /**
   * Add a type to the union
   * @param {Type} type - Type to add
   * @returns {UnionType} - this for chaining
   */
  UnionType.prototype.add = function(type) {
    this._addTypes([type]);
    return this;
  };

  /**
   * Get the number of types in the union
   * @returns {number}
   */
  UnionType.prototype.size = function() {
    return this.types.length;
  };

  /**
   * Check if the union is empty
   * @returns {boolean}
   */
  UnionType.prototype.isEmpty = function() {
    return this.types.length === 0;
  };

  /**
   * Check if the union contains a specific type
   * @param {Type} type - Type to check
   * @returns {boolean}
   */
  UnionType.prototype.contains = function(type) {
    for (var i = 0; i < this.types.length; i++) {
      if (this.types[i].equals(type)) {
        return true;
      }
    }
    return false;
  };

  // ----------------------------------------
  // Member Access
  // ----------------------------------------

  /**
   * Get a member that exists on ALL types in the union
   * @param {string} name - Member name
   * @returns {Type|null}
   */
  UnionType.prototype.getMember = function(name) {
    if (this.types.length === 0) return null;

    // Get member from first type
    var firstMember = this.types[0].getMember(name);
    if (!firstMember) return null;

    // Check if all other types have this member
    var memberTypes = [firstMember];

    for (var i = 1; i < this.types.length; i++) {
      var member = this.types[i].getMember(name);
      if (!member) {
        // Member doesn't exist on all types
        return null;
      }
      memberTypes.push(member);
    }

    // If all members are the same type, return that type
    var allSame = true;
    for (var j = 1; j < memberTypes.length; j++) {
      if (!memberTypes[0].equals(memberTypes[j])) {
        allSame = false;
        break;
      }
    }

    if (allSame) {
      return memberTypes[0];
    }

    // Return union of member types
    return new UnionType(memberTypes);
  };

  /**
   * Get member names that exist on ALL types in the union
   * @returns {string[]}
   */
  UnionType.prototype.getMemberNames = function() {
    if (this.types.length === 0) return [];

    // Start with members from first type
    var commonNames = new Set(this.types[0].getMemberNames());

    // Intersect with members from other types
    for (var i = 1; i < this.types.length; i++) {
      var otherNames = new Set(this.types[i].getMemberNames());
      var intersection = new Set();

      for (var name of commonNames) {
        if (otherNames.has(name)) {
          intersection.add(name);
        }
      }

      commonNames = intersection;
    }

    return Array.from(commonNames);
  };

  // ----------------------------------------
  // Type Comparison
  // ----------------------------------------

  /**
   * Check if this type equals another type
   * @param {Type} other
   * @returns {boolean}
   */
  UnionType.prototype.equals = function(other) {
    if (!other || other.kind !== TypeKind.UNION) return false;

    var otherUnion = other;

    // Check same number of types
    if (this.types.length !== otherUnion.types.length) return false;

    // Check each type exists in other union
    for (var i = 0; i < this.types.length; i++) {
      if (!otherUnion.contains(this.types[i])) {
        return false;
      }
    }

    return true;
  };

  /**
   * Check if this type is assignable to another type
   * A union is assignable if ALL its types are assignable
   * @param {Type} target
   * @returns {boolean}
   */
  UnionType.prototype.isAssignableTo = function(target) {
    if (!target) return false;

    // Any accepts everything
    if (target.kind === TypeKind.ANY) return true;

    // If target is a union, check if each type in this union
    // is assignable to at least one type in target union
    if (target.kind === TypeKind.UNION) {
      var targetUnion = target;

      for (var i = 0; i < this.types.length; i++) {
        var thisType = this.types[i];
        var assignable = false;

        for (var j = 0; j < targetUnion.types.length; j++) {
          if (thisType.isAssignableTo(targetUnion.types[j])) {
            assignable = true;
            break;
          }
        }

        if (!assignable) return false;
      }

      return true;
    }

    // For non-union target, all types must be assignable
    for (var k = 0; k < this.types.length; k++) {
      if (!this.types[k].isAssignableTo(target)) {
        return false;
      }
    }

    return true;
  };

  // ----------------------------------------
  // Type Utilities
  // ----------------------------------------

  /**
   * String representation
   * @returns {string}
   */
  UnionType.prototype.toString = function() {
    if (this.types.length === 0) return 'never';

    return this.types.map(function(t) {
      return t.toString();
    }).join(' | ');
  };

  /**
   * Clone this type
   * @returns {UnionType}
   */
  UnionType.prototype.clone = function() {
    var clonedTypes = this.types.map(function(t) {
      return t.clone();
    });
    return new UnionType(clonedTypes);
  };

  /**
   * Simplify the union type
   * Returns the type itself if union has only one type
   * @returns {Type}
   */
  UnionType.prototype.simplify = function() {
    if (this.types.length === 0) {
      return Type.NEVER;
    }

    if (this.types.length === 1) {
      return this.types[0];
    }

    // Check if any type is 'any' - if so, the union is 'any'
    for (var i = 0; i < this.types.length; i++) {
      if (this.types[i].kind === TypeKind.ANY) {
        return Type.ANY;
      }
    }

    return this;
  };

  /**
   * Filter types in the union based on a predicate
   * @param {function(Type): boolean} predicate
   * @returns {UnionType}
   */
  UnionType.prototype.filter = function(predicate) {
    var filtered = this.types.filter(predicate);
    return new UnionType(filtered);
  };

  /**
   * Check if this is a nullable type (includes null or undefined)
   * @returns {boolean}
   */
  UnionType.prototype.isNullable = function() {
    for (var i = 0; i < this.types.length; i++) {
      var kind = this.types[i].kind;
      if (kind === TypeKind.NULL || kind === TypeKind.UNDEFINED) {
        return true;
      }
    }
    return false;
  };

  /**
   * Get non-nullable version of this union
   * @returns {Type}
   */
  UnionType.prototype.getNonNullable = function() {
    var filtered = this.filter(function(t) {
      return t.kind !== TypeKind.NULL && t.kind !== TypeKind.UNDEFINED;
    });
    return filtered.simplify();
  };

  // ============================================
  // Factory Functions
  // ============================================

  /**
   * Create a union from multiple types
   * @param {...Type} types - Types to union
   * @returns {Type} - Simplified union (may be single type)
   */
  UnionType.of = function() {
    var types = Array.prototype.slice.call(arguments);
    var union = new UnionType(types);
    return union.simplify();
  };

  /**
   * Create a nullable type (T | null | undefined)
   * @param {Type} type - Base type
   * @returns {UnionType}
   */
  UnionType.nullable = function(type) {
    var PrimitiveType = CodeEditor.PrimitiveType;
    return new UnionType([
      type,
      PrimitiveType ? PrimitiveType.NULL : new Type(TypeKind.NULL),
      PrimitiveType ? PrimitiveType.UNDEFINED : new Type(TypeKind.UNDEFINED)
    ]);
  };

  /**
   * Create an optional type (T | undefined)
   * @param {Type} type - Base type
   * @returns {UnionType}
   */
  UnionType.optional = function(type) {
    var PrimitiveType = CodeEditor.PrimitiveType;
    return new UnionType([
      type,
      PrimitiveType ? PrimitiveType.UNDEFINED : new Type(TypeKind.UNDEFINED)
    ]);
  };

  // ============================================
  // Export
  // ============================================

  CodeEditor.UnionType = UnionType;

})(window.CodeEditor = window.CodeEditor || {});
