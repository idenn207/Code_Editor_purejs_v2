/**
 * @fileoverview Tracks 'this' context across different scopes
 * @module features/autocomplete/inference/ThisContextTracker
 */

(function(CodeEditor) {
  'use strict';

  var NodeType = CodeEditor.NodeType;
  var TypeKind = CodeEditor.TypeKind;
  var Type = CodeEditor.Type;
  var ClassType = CodeEditor.ClassType;
  var ObjectType = CodeEditor.ObjectType;

  // ============================================
  // ThisContext Class
  // ============================================

  /**
   * Represents a 'this' context at a specific scope
   * @class
   * @param {Type} type - The type of 'this'
   * @param {string} kind - Context kind ('class', 'method', 'function', 'arrow', 'global')
   * @param {ClassType} [classType] - Associated class type if in class context
   */
  function ThisContext(type, kind, classType) {
    /**
     * The type of 'this'
     * @type {Type}
     */
    this.type = type;

    /**
     * Context kind
     * @type {string}
     */
    this.kind = kind;

    /**
     * Associated class type (if in class context)
     * @type {ClassType|null}
     */
    this.classType = classType || null;

    /**
     * Whether this is the global context
     * @type {boolean}
     */
    this.isGlobal = kind === 'global';
  }

  // ============================================
  // ThisContextTracker Class
  // ============================================

  /**
   * Tracks 'this' context across nested scopes
   * @class
   */
  function ThisContextTracker() {
    /**
     * Stack of this contexts
     * @type {ThisContext[]}
     */
    this._contextStack = [];

    /**
     * Global 'this' type (window in browser)
     * @type {Type}
     */
    this._globalThis = Type.ANY;

    // Initialize with global context
    this._contextStack.push(new ThisContext(this._globalThis, 'global', null));
  }

  // ----------------------------------------
  // Context Stack Management
  // ----------------------------------------

  /**
   * Push a new 'this' context onto the stack
   * @param {Type} thisType - Type of 'this'
   * @param {string} kind - Context kind
   * @param {ClassType} [classType] - Associated class type
   */
  ThisContextTracker.prototype.pushContext = function(thisType, kind, classType) {
    this._contextStack.push(new ThisContext(thisType, kind, classType));
  };

  /**
   * Pop the current 'this' context
   * @returns {ThisContext|null}
   */
  ThisContextTracker.prototype.popContext = function() {
    // Don't pop the global context
    if (this._contextStack.length > 1) {
      return this._contextStack.pop();
    }
    return null;
  };

  /**
   * Get the current 'this' type
   * @returns {Type}
   */
  ThisContextTracker.prototype.getCurrentThisType = function() {
    var current = this._contextStack[this._contextStack.length - 1];
    return current ? current.type : this._globalThis;
  };

  /**
   * Get the current context
   * @returns {ThisContext}
   */
  ThisContextTracker.prototype.getCurrentContext = function() {
    return this._contextStack[this._contextStack.length - 1];
  };

  /**
   * Get the current class type (if any)
   * @returns {ClassType|null}
   */
  ThisContextTracker.prototype.getCurrentClassType = function() {
    // Search up the stack for a class context
    for (var i = this._contextStack.length - 1; i >= 0; i--) {
      var context = this._contextStack[i];
      if (context.classType) {
        return context.classType;
      }
    }
    return null;
  };

  /**
   * Check if currently inside a class context
   * @returns {boolean}
   */
  ThisContextTracker.prototype.isInClassContext = function() {
    return this.getCurrentClassType() !== null;
  };

  /**
   * Check if currently inside a static method
   * @returns {boolean}
   */
  ThisContextTracker.prototype.isInStaticContext = function() {
    var current = this.getCurrentContext();
    return current && current.kind === 'static';
  };

  /**
   * Get the context stack depth
   * @returns {number}
   */
  ThisContextTracker.prototype.getDepth = function() {
    return this._contextStack.length;
  };

  // ----------------------------------------
  // Context for Nodes
  // ----------------------------------------

  /**
   * Enter a class context
   * @param {ClassType} classType - The class type
   */
  ThisContextTracker.prototype.enterClass = function(classType) {
    // Class body itself uses the class as 'this' for static members
    this.pushContext(classType, 'class', classType);
  };

  /**
   * Enter a class method context
   * @param {ClassType} classType - The class type
   * @param {boolean} isStatic - Whether the method is static
   */
  ThisContextTracker.prototype.enterMethod = function(classType, isStatic) {
    if (isStatic) {
      // Static methods: 'this' refers to the class itself
      this.pushContext(classType, 'static', classType);
    } else {
      // Instance methods: 'this' refers to an instance
      this.pushContext(classType.createInstance(), 'method', classType);
    }
  };

  /**
   * Enter a constructor context
   * @param {ClassType} classType - The class type
   */
  ThisContextTracker.prototype.enterConstructor = function(classType) {
    // In constructor, 'this' refers to the instance being created
    this.pushContext(classType.createInstance(), 'constructor', classType);
  };

  /**
   * Enter a regular function context
   * @param {Type} [thisType] - Explicit 'this' type if known
   */
  ThisContextTracker.prototype.enterFunction = function(thisType) {
    // Regular functions can have dynamic 'this'
    this.pushContext(thisType || Type.ANY, 'function', null);
  };

  /**
   * Enter an arrow function context
   * Arrow functions inherit 'this' from enclosing scope
   */
  ThisContextTracker.prototype.enterArrowFunction = function() {
    // Arrow functions don't create a new 'this' context
    var currentThis = this.getCurrentThisType();
    var currentClass = this.getCurrentClassType();
    this.pushContext(currentThis, 'arrow', currentClass);
  };

  /**
   * Exit the current context
   */
  ThisContextTracker.prototype.exitContext = function() {
    this.popContext();
  };

  // ----------------------------------------
  // Node Processing
  // ----------------------------------------

  /**
   * Process a node and update this context if needed
   * @param {Node} node - AST node
   * @param {ClassType} [classType] - Class type if processing class member
   */
  ThisContextTracker.prototype.processNode = function(node, classType) {
    if (!node) return;

    switch (node.type) {
      case NodeType.CLASS_DECLARATION:
      case NodeType.CLASS_EXPRESSION:
        // Class context handled separately
        break;

      case NodeType.METHOD_DEFINITION:
        if (classType) {
          if (node.kind === 'constructor') {
            this.enterConstructor(classType);
          } else {
            this.enterMethod(classType, node.static || false);
          }
        }
        break;

      case NodeType.FUNCTION_DECLARATION:
      case NodeType.FUNCTION_EXPRESSION:
        this.enterFunction();
        break;

      case NodeType.ARROW_FUNCTION:
        this.enterArrowFunction();
        break;
    }
  };

  /**
   * Get the 'this' type for a specific position in a class
   * @param {ClassType} classType - The class
   * @param {Node} memberNode - The member node
   * @returns {Type}
   */
  ThisContextTracker.prototype.getThisTypeForMember = function(classType, memberNode) {
    if (!memberNode) {
      return classType.createInstance();
    }

    if (memberNode.static) {
      // Static member: 'this' is the class
      return classType;
    }

    // Instance member: 'this' is an instance
    return classType.createInstance();
  };

  // ----------------------------------------
  // Utilities
  // ----------------------------------------

  /**
   * Set the global 'this' type
   * @param {Type} globalType
   */
  ThisContextTracker.prototype.setGlobalThis = function(globalType) {
    this._globalThis = globalType;

    // Update the bottom of the stack
    if (this._contextStack.length > 0) {
      this._contextStack[0] = new ThisContext(globalType, 'global', null);
    }
  };

  /**
   * Reset to initial state
   */
  ThisContextTracker.prototype.reset = function() {
    this._contextStack = [];
    this._contextStack.push(new ThisContext(this._globalThis, 'global', null));
  };

  /**
   * Clone the current state
   * @returns {ThisContextTracker}
   */
  ThisContextTracker.prototype.clone = function() {
    var cloned = new ThisContextTracker();
    cloned._globalThis = this._globalThis;
    cloned._contextStack = this._contextStack.slice();
    return cloned;
  };

  /**
   * Get debug string representation
   * @returns {string}
   */
  ThisContextTracker.prototype.toString = function() {
    return 'ThisContextTracker[' +
      this._contextStack.map(function(ctx) {
        return ctx.kind + ':' + ctx.type.toString();
      }).join(' -> ') +
    ']';
  };

  // ============================================
  // Export
  // ============================================

  CodeEditor.ThisContext = ThisContext;
  CodeEditor.ThisContextTracker = ThisContextTracker;

})(window.CodeEditor = window.CodeEditor || {});
