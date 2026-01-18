/**
 * @fileoverview Class type with static and instance members
 * @module features/autocomplete/types/ClassType
 */

(function(CodeEditor) {
  'use strict';

  var TypeKind = CodeEditor.TypeKind;
  var Type = CodeEditor.Type;

  // ============================================
  // ClassType Class
  // ============================================

  /**
   * Represents a class type with static members, instance members, and constructor
   * @class
   * @extends Type
   * @param {string} name - Class name
   * @param {ClassType} [superClass] - Parent class (for extends)
   */
  function ClassType(name, superClass) {
    Type.call(this, TypeKind.CLASS);

    /**
     * Class name
     * @type {string}
     */
    this.name = name;

    /**
     * Parent class (if extends)
     * @type {ClassType|null}
     */
    this.superClass = superClass || null;

    /**
     * Static members (properties and methods)
     * @type {Map<string, Type>}
     */
    this.staticMembers = new Map();

    /**
     * Instance members (properties and methods)
     * @type {Map<string, Type>}
     */
    this.instanceMembers = new Map();

    /**
     * Constructor type (FunctionType)
     * @type {Type|null}
     */
    this.constructorType = null;
  }

  // Inherit from Type
  ClassType.prototype = Object.create(Type.prototype);
  ClassType.prototype.constructor = ClassType;

  // ----------------------------------------
  // Static Member Access
  // ----------------------------------------

  /**
   * Get a static member type by name (e.g., ClassName.member)
   * @param {string} name - Member name
   * @returns {Type|null}
   */
  ClassType.prototype.getStaticMember = function(name) {
    if (this.staticMembers.has(name)) {
      return this.staticMembers.get(name);
    }

    // Check parent class
    if (this.superClass) {
      return this.superClass.getStaticMember(name);
    }

    return null;
  };

  /**
   * Get all static member names (including inherited)
   * @returns {string[]}
   */
  ClassType.prototype.getStaticMemberNames = function() {
    var names = new Set(this.staticMembers.keys());

    // Add inherited static members
    if (this.superClass) {
      var parentNames = this.superClass.getStaticMemberNames();
      for (var i = 0; i < parentNames.length; i++) {
        names.add(parentNames[i]);
      }
    }

    return Array.from(names);
  };

  /**
   * Set a static member
   * @param {string} name - Member name
   * @param {Type} type - Member type
   * @returns {ClassType} - this for chaining
   */
  ClassType.prototype.setStaticMember = function(name, type) {
    this.staticMembers.set(name, type);
    return this;
  };

  // ----------------------------------------
  // Instance Member Access
  // ----------------------------------------

  /**
   * Get an instance member type by name (e.g., instance.member or this.member)
   * @param {string} name - Member name
   * @returns {Type|null}
   */
  ClassType.prototype.getInstanceMember = function(name) {
    if (this.instanceMembers.has(name)) {
      return this.instanceMembers.get(name);
    }

    // Check parent class
    if (this.superClass) {
      return this.superClass.getInstanceMember(name);
    }

    return null;
  };

  /**
   * Get all instance member names (including inherited)
   * @returns {string[]}
   */
  ClassType.prototype.getInstanceMemberNames = function() {
    var names = new Set(this.instanceMembers.keys());

    // Add inherited instance members
    if (this.superClass) {
      var parentNames = this.superClass.getInstanceMemberNames();
      for (var i = 0; i < parentNames.length; i++) {
        names.add(parentNames[i]);
      }
    }

    return Array.from(names);
  };

  /**
   * Set an instance member
   * @param {string} name - Member name
   * @param {Type} type - Member type
   * @returns {ClassType} - this for chaining
   */
  ClassType.prototype.setInstanceMember = function(name, type) {
    this.instanceMembers.set(name, type);
    return this;
  };

  // ----------------------------------------
  // Type Interface (getMember returns static members for class references)
  // ----------------------------------------

  /**
   * Get a member type by name
   * For ClassType, this returns static members (used when referencing ClassName.member)
   * @param {string} name - Member name
   * @returns {Type|null}
   */
  ClassType.prototype.getMember = function(name) {
    return this.getStaticMember(name);
  };

  /**
   * Get all member names
   * For ClassType, this returns static member names
   * @returns {string[]}
   */
  ClassType.prototype.getMemberNames = function() {
    return this.getStaticMemberNames();
  };

  // ----------------------------------------
  // Constructor
  // ----------------------------------------

  /**
   * Set the constructor type
   * @param {Type} type - Constructor function type
   * @returns {ClassType} - this for chaining
   */
  ClassType.prototype.setConstructor = function(type) {
    this.constructorType = type;
    return this;
  };

  /**
   * Get the constructor type
   * @returns {Type|null}
   */
  ClassType.prototype.getConstructor = function() {
    return this.constructorType;
  };

  // ----------------------------------------
  // Instance Creation
  // ----------------------------------------

  /**
   * Create an instance type for this class
   * @returns {InstanceType}
   */
  ClassType.prototype.createInstance = function() {
    return new InstanceType(this);
  };

  // ----------------------------------------
  // Inheritance
  // ----------------------------------------

  /**
   * Check if this class extends another class
   * @param {ClassType} other - Other class type
   * @returns {boolean}
   */
  ClassType.prototype.extends = function(other) {
    if (!other || other.kind !== TypeKind.CLASS) return false;

    var current = this.superClass;
    while (current) {
      if (current === other || current.name === other.name) {
        return true;
      }
      current = current.superClass;
    }

    return false;
  };

  /**
   * Get the inheritance chain
   * @returns {ClassType[]}
   */
  ClassType.prototype.getInheritanceChain = function() {
    var chain = [this];
    var current = this.superClass;

    while (current) {
      chain.push(current);
      current = current.superClass;
    }

    return chain;
  };

  // ----------------------------------------
  // Type Comparison
  // ----------------------------------------

  /**
   * Check if this type equals another type
   * @param {Type} other
   * @returns {boolean}
   */
  ClassType.prototype.equals = function(other) {
    if (!other || other.kind !== TypeKind.CLASS) return false;
    return this.name === other.name;
  };

  /**
   * Check if this type is assignable to another type
   * @param {Type} target
   * @returns {boolean}
   */
  ClassType.prototype.isAssignableTo = function(target) {
    if (!target) return false;

    // Any accepts everything
    if (target.kind === TypeKind.ANY) return true;

    // Same class
    if (target.kind === TypeKind.CLASS) {
      if (this.name === target.name) return true;

      // Check inheritance
      return this.extends(target);
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
  ClassType.prototype.toString = function() {
    var str = 'class ' + this.name;
    if (this.superClass) {
      str += ' extends ' + this.superClass.name;
    }
    return str;
  };

  /**
   * Clone this type (shallow clone)
   * @returns {ClassType}
   */
  ClassType.prototype.clone = function() {
    var cloned = new ClassType(this.name, this.superClass);
    cloned.staticMembers = new Map(this.staticMembers);
    cloned.instanceMembers = new Map(this.instanceMembers);
    cloned.constructorType = this.constructorType;
    return cloned;
  };

  /**
   * Check if this type is constructable
   * @returns {boolean}
   */
  ClassType.prototype.isConstructable = function() {
    return true;
  };

  // ============================================
  // InstanceType Class
  // ============================================

  /**
   * Represents an instance of a class (result of `new ClassName()`)
   * @class
   * @extends Type
   * @param {ClassType} classType - The class this is an instance of
   */
  function InstanceType(classType) {
    Type.call(this, TypeKind.INSTANCE);

    /**
     * The class this is an instance of
     * @type {ClassType}
     */
    this.classType = classType;
  }

  // Inherit from Type
  InstanceType.prototype = Object.create(Type.prototype);
  InstanceType.prototype.constructor = InstanceType;

  /**
   * Get a member type by name (instance members only)
   * @param {string} name - Member name
   * @returns {Type|null}
   */
  InstanceType.prototype.getMember = function(name) {
    return this.classType.getInstanceMember(name);
  };

  /**
   * Get all member names (instance members only)
   * @returns {string[]}
   */
  InstanceType.prototype.getMemberNames = function() {
    return this.classType.getInstanceMemberNames();
  };

  /**
   * Check if this type equals another type
   * @param {Type} other
   * @returns {boolean}
   */
  InstanceType.prototype.equals = function(other) {
    if (!other || other.kind !== TypeKind.INSTANCE) return false;
    return this.classType.equals(other.classType);
  };

  /**
   * Check if this type is assignable to another type
   * @param {Type} target
   * @returns {boolean}
   */
  InstanceType.prototype.isAssignableTo = function(target) {
    if (!target) return false;

    // Any accepts everything
    if (target.kind === TypeKind.ANY) return true;

    // Same instance type
    if (target.kind === TypeKind.INSTANCE) {
      return this.classType.isAssignableTo(target.classType);
    }

    // Instance is assignable to its class
    if (target.kind === TypeKind.CLASS) {
      return this.classType.isAssignableTo(target);
    }

    return false;
  };

  /**
   * String representation
   * @returns {string}
   */
  InstanceType.prototype.toString = function() {
    return this.classType.name;
  };

  /**
   * Clone this type
   * @returns {InstanceType}
   */
  InstanceType.prototype.clone = function() {
    return new InstanceType(this.classType);
  };

  // ============================================
  // Export
  // ============================================

  CodeEditor.ClassType = ClassType;
  CodeEditor.InstanceType = InstanceType;

})(window.CodeEditor = window.CodeEditor || {});
