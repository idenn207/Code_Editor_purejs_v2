/**
 * @fileoverview Object type class for objects with properties
 * @module features/autocomplete/types/ObjectType
 */

(function(CodeEditor) {
  'use strict';

  var TypeKind = CodeEditor.TypeKind;
  var Type = CodeEditor.Type;

  // ============================================
  // ObjectType Class
  // ============================================

  /**
   * Represents an object type with named properties
   * @class
   * @extends Type
   * @param {Map<string, Type>|Object} [properties] - Initial properties
   */
  function ObjectType(properties) {
    Type.call(this, TypeKind.OBJECT);

    /**
     * Map of property names to their types
     * @type {Map<string, Type>}
     */
    this.properties = new Map();

    // Initialize properties
    if (properties) {
      if (properties instanceof Map) {
        this.properties = new Map(properties);
      } else {
        var self = this;
        Object.keys(properties).forEach(function(key) {
          self.properties.set(key, properties[key]);
        });
      }
    }
  }

  // Inherit from Type
  ObjectType.prototype = Object.create(Type.prototype);
  ObjectType.prototype.constructor = ObjectType;

  // ----------------------------------------
  // Property Management
  // ----------------------------------------

  /**
   * Get a property type by name
   * @param {string} name - Property name
   * @returns {Type|null}
   */
  ObjectType.prototype.getMember = function(name) {
    return this.properties.get(name) || null;
  };

  /**
   * Get all property names
   * @returns {string[]}
   */
  ObjectType.prototype.getMemberNames = function() {
    return Array.from(this.properties.keys());
  };

  /**
   * Set a property type
   * @param {string} name - Property name
   * @param {Type} type - Property type
   * @returns {ObjectType} - this for chaining
   */
  ObjectType.prototype.setProperty = function(name, type) {
    this.properties.set(name, type);
    return this;
  };

  /**
   * Remove a property
   * @param {string} name - Property name
   * @returns {boolean} - true if property existed
   */
  ObjectType.prototype.removeProperty = function(name) {
    return this.properties.delete(name);
  };

  /**
   * Check if a property exists
   * @param {string} name - Property name
   * @returns {boolean}
   */
  ObjectType.prototype.hasProperty = function(name) {
    return this.properties.has(name);
  };

  /**
   * Get the number of properties
   * @returns {number}
   */
  ObjectType.prototype.getPropertyCount = function() {
    return this.properties.size;
  };

  // ----------------------------------------
  // Type Comparison
  // ----------------------------------------

  /**
   * Check if this type equals another type
   * Two object types are equal if they have the same properties with equal types
   * @param {Type} other
   * @returns {boolean}
   */
  ObjectType.prototype.equals = function(other) {
    if (!other || other.kind !== TypeKind.OBJECT) return false;

    var otherObj = other;

    // Check same number of properties
    if (this.properties.size !== otherObj.properties.size) return false;

    // Check each property
    for (var entry of this.properties) {
      var name = entry[0];
      var type = entry[1];
      var otherType = otherObj.properties.get(name);

      if (!otherType || !type.equals(otherType)) {
        return false;
      }
    }

    return true;
  };

  /**
   * Check if this type is assignable to another type (structural typing)
   * @param {Type} target
   * @returns {boolean}
   */
  ObjectType.prototype.isAssignableTo = function(target) {
    if (!target) return false;

    // Any accepts everything
    if (target.kind === TypeKind.ANY) return true;

    // Must be object type
    if (target.kind !== TypeKind.OBJECT) return false;

    var targetObj = target;

    // Check that all target properties exist in this type with compatible types
    for (var entry of targetObj.properties) {
      var name = entry[0];
      var targetType = entry[1];
      var thisType = this.properties.get(name);

      if (!thisType || !thisType.isAssignableTo(targetType)) {
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
  ObjectType.prototype.toString = function() {
    var props = [];
    for (var entry of this.properties) {
      props.push(entry[0] + ': ' + entry[1].toString());
    }
    return '{ ' + props.join(', ') + ' }';
  };

  /**
   * Clone this type (deep clone)
   * @returns {ObjectType}
   */
  ObjectType.prototype.clone = function() {
    var clonedProps = new Map();
    for (var entry of this.properties) {
      clonedProps.set(entry[0], entry[1].clone());
    }
    return new ObjectType(clonedProps);
  };

  /**
   * Merge another object type into this one
   * Properties from other will overwrite existing properties
   * @param {ObjectType} other
   * @returns {ObjectType} - this for chaining
   */
  ObjectType.prototype.merge = function(other) {
    if (other && other.kind === TypeKind.OBJECT) {
      for (var entry of other.properties) {
        this.properties.set(entry[0], entry[1]);
      }
    }
    return this;
  };

  /**
   * Create a new object type that is the intersection of this and another
   * @param {ObjectType} other
   * @returns {ObjectType}
   */
  ObjectType.prototype.intersect = function(other) {
    var result = this.clone();
    if (other && other.kind === TypeKind.OBJECT) {
      result.merge(other);
    }
    return result;
  };

  // ============================================
  // Factory Functions
  // ============================================

  /**
   * Create an empty object type
   * @returns {ObjectType}
   */
  ObjectType.empty = function() {
    return new ObjectType();
  };

  /**
   * Create an object type from a plain object
   * @param {Object} obj - Object with type values
   * @returns {ObjectType}
   */
  ObjectType.from = function(obj) {
    return new ObjectType(obj);
  };

  // ============================================
  // Export
  // ============================================

  CodeEditor.ObjectType = ObjectType;

})(window.CodeEditor = window.CodeEditor || {});
