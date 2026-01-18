/**
 * @fileoverview Builds ClassType from class definitions in AST
 * @module features/autocomplete/inference/ClassTypeBuilder
 */

(function(CodeEditor) {
  'use strict';

  var NodeType = CodeEditor.NodeType;
  var TypeKind = CodeEditor.TypeKind;
  var Type = CodeEditor.Type;
  var PrimitiveType = CodeEditor.PrimitiveType;
  var ClassType = CodeEditor.ClassType;
  var FunctionType = CodeEditor.FunctionType;

  // ============================================
  // ClassTypeBuilder Class
  // ============================================

  /**
   * Builds ClassType from class declaration/expression nodes
   * @class
   * @param {TypeInferenceEngine} engine - Type inference engine
   */
  function ClassTypeBuilder(engine) {
    /**
     * Reference to type inference engine
     * @type {TypeInferenceEngine}
     */
    this._engine = engine;

    /**
     * Cache of built class types by node
     * @type {Map<Node, ClassType>}
     */
    this._classCache = new Map();
  }

  // ----------------------------------------
  // Main Building Methods
  // ----------------------------------------

  /**
   * Build ClassType from a class node
   * @param {Node} classNode - ClassDeclaration or ClassExpression node
   * @returns {ClassType}
   */
  ClassTypeBuilder.prototype.buildClassType = function(classNode) {
    // Check cache
    if (this._classCache.has(classNode)) {
      return this._classCache.get(classNode);
    }

    // Get class name
    var className = classNode.id ? classNode.id.name : 'AnonymousClass';

    // Resolve superclass
    var superClass = null;
    if (classNode.superClass) {
      superClass = this._resolveSuperClass(classNode.superClass);
    }

    // Create class type
    var classType = new ClassType(className, superClass);

    // Cache early to handle recursive references
    this._classCache.set(classNode, classType);

    // Process class body
    if (classNode.body && classNode.body.body) {
      this._processClassBody(classType, classNode.body.body);
    }

    return classType;
  };

  /**
   * Resolve superclass from expression
   * @param {Node} superExpr - Superclass expression
   * @returns {ClassType|null}
   * @private
   */
  ClassTypeBuilder.prototype._resolveSuperClass = function(superExpr) {
    var superType = this._engine.inferType(superExpr);

    if (superType && superType.kind === TypeKind.CLASS) {
      return superType;
    }

    return null;
  };

  /**
   * Process class body members
   * @param {ClassType} classType - Class type to populate
   * @param {Node[]} members - Class body members
   * @private
   */
  ClassTypeBuilder.prototype._processClassBody = function(classType, members) {
    // First pass: collect all property definitions and method signatures
    var constructorNode = null;

    for (var i = 0; i < members.length; i++) {
      var member = members[i];
      if (!member) continue;

      if (member.type === NodeType.METHOD_DEFINITION) {
        if (member.kind === 'constructor') {
          constructorNode = member;
        } else {
          this._processMethod(classType, member);
        }
      } else if (member.type === NodeType.PROPERTY_DEFINITION) {
        this._processProperty(classType, member);
      }
    }

    // Process constructor after collecting other members
    // This allows us to infer types from constructor assignments
    if (constructorNode) {
      this._processConstructor(classType, constructorNode);
    }
  };

  /**
   * Process a method definition
   * @param {ClassType} classType - Class type
   * @param {Node} methodNode - MethodDefinition node
   * @private
   */
  ClassTypeBuilder.prototype._processMethod = function(classType, methodNode) {
    var methodName = this._getMemberName(methodNode.key);
    if (methodName === null) return;

    var isStatic = methodNode.static || false;

    // Build method type with this context
    var methodType = this._buildMethodType(classType, methodNode);

    if (isStatic) {
      classType.setStaticMember(methodName, methodType);
    } else {
      classType.setInstanceMember(methodName, methodType);
    }
  };

  /**
   * Process a property definition
   * @param {ClassType} classType - Class type
   * @param {Node} propNode - PropertyDefinition node
   * @private
   */
  ClassTypeBuilder.prototype._processProperty = function(classType, propNode) {
    var propName = this._getMemberName(propNode.key);
    if (propName === null) return;

    var isStatic = propNode.static || false;

    // Infer type from initializer
    var propType = Type.ANY;
    if (propNode.value) {
      propType = this._engine.inferType(propNode.value);
    }

    if (isStatic) {
      classType.setStaticMember(propName, propType);
    } else {
      classType.setInstanceMember(propName, propType);
    }
  };

  /**
   * Process constructor and extract this.xxx assignments
   * @param {ClassType} classType - Class type
   * @param {Node} constructorNode - Constructor MethodDefinition node
   * @private
   */
  ClassTypeBuilder.prototype._processConstructor = function(classType, constructorNode) {
    var funcNode = constructorNode.value;
    if (!funcNode) return;

    // Build constructor type
    var constructorType = this._buildMethodType(classType, constructorNode);
    classType.setConstructor(constructorType);

    // Analyze constructor body for this.xxx = value patterns
    if (funcNode.body && funcNode.body.type === NodeType.BLOCK_STATEMENT) {
      this._analyzeConstructorBody(classType, funcNode);
    }
  };

  /**
   * Analyze constructor body for property assignments
   * @param {ClassType} classType - Class type
   * @param {Node} funcNode - Constructor function node
   * @private
   */
  ClassTypeBuilder.prototype._analyzeConstructorBody = function(classType, funcNode) {
    // Set up parameter bindings
    var paramBindings = new Map();
    if (funcNode.params) {
      for (var i = 0; i < funcNode.params.length; i++) {
        var param = funcNode.params[i];
        var paramName = this._getParamName(param);
        if (paramName) {
          var paramType = param.defaultValue
            ? this._engine.inferType(param.defaultValue)
            : Type.ANY;
          paramBindings.set(paramName, paramType);
        }
      }
    }

    // Save current local bindings
    var savedBindings = new Map(this._engine._localBindings);

    // Add parameter bindings
    for (var entry of paramBindings) {
      this._engine.addLocalBinding(entry[0], entry[1]);
    }

    // Set this context
    var savedThisContext = this._engine._thisContext;
    this._engine.setThisContext(classType.createInstance());

    // Scan statements for this.xxx = value
    this._scanForThisAssignments(classType, funcNode.body.body, paramBindings);

    // Restore context
    this._engine._thisContext = savedThisContext;
    this._engine._localBindings = savedBindings;
  };

  /**
   * Scan statements for this.xxx = value assignments
   * @param {ClassType} classType - Class type
   * @param {Node[]} statements - Statements to scan
   * @param {Map<string, Type>} paramBindings - Parameter type bindings
   * @private
   */
  ClassTypeBuilder.prototype._scanForThisAssignments = function(classType, statements, paramBindings) {
    if (!statements) return;

    for (var i = 0; i < statements.length; i++) {
      var stmt = statements[i];
      if (!stmt) continue;

      if (stmt.type === NodeType.EXPRESSION_STATEMENT) {
        var expr = stmt.expression;
        if (expr && expr.type === NodeType.ASSIGNMENT_EXPRESSION) {
          this._processThisAssignment(classType, expr, paramBindings);
        }
      }
    }
  };

  /**
   * Process a potential this.xxx = value assignment
   * @param {ClassType} classType - Class type
   * @param {Node} assignExpr - Assignment expression
   * @param {Map<string, Type>} paramBindings - Parameter bindings
   * @private
   */
  ClassTypeBuilder.prototype._processThisAssignment = function(classType, assignExpr, paramBindings) {
    var left = assignExpr.left;

    // Check for this.xxx pattern
    if (left.type !== NodeType.MEMBER_EXPRESSION) return;
    if (left.object.type !== NodeType.THIS) return;
    if (left.computed) return;

    var propName = left.property.name;
    if (!propName) return;

    // Skip if already defined (from property definition)
    if (classType.instanceMembers.has(propName)) return;

    // Infer type from right side
    var valueType = this._inferAssignmentType(assignExpr.right, paramBindings);

    classType.setInstanceMember(propName, valueType);
  };

  /**
   * Infer type of assignment value with parameter awareness
   * @param {Node} valueNode - Value expression
   * @param {Map<string, Type>} paramBindings - Parameter bindings
   * @returns {Type}
   * @private
   */
  ClassTypeBuilder.prototype._inferAssignmentType = function(valueNode, paramBindings) {
    // If value is a direct parameter reference, use parameter type
    if (valueNode.type === NodeType.IDENTIFIER && paramBindings.has(valueNode.name)) {
      return paramBindings.get(valueNode.name);
    }

    return this._engine.inferType(valueNode);
  };

  // ----------------------------------------
  // Method Type Building
  // ----------------------------------------

  /**
   * Build method type with proper this context
   * @param {ClassType} classType - Class type
   * @param {Node} methodNode - MethodDefinition node
   * @returns {FunctionType}
   * @private
   */
  ClassTypeBuilder.prototype._buildMethodType = function(classType, methodNode) {
    var funcNode = methodNode.value;
    if (!funcNode) {
      return new FunctionType([], Type.ANY);
    }

    // Build parameter types
    var params = this._buildParameterTypes(funcNode.params);

    // Set this context for return type analysis
    var savedThisContext = this._engine._thisContext;
    var isStatic = methodNode.static || false;

    if (!isStatic) {
      this._engine.setThisContext(classType.createInstance());
    }

    // Infer return type
    var returnType = this._inferMethodReturnType(funcNode);

    // Restore this context
    this._engine._thisContext = savedThisContext;

    var funcType = new FunctionType(params, returnType);
    funcType.isAsync = funcNode.async || false;
    funcType.isGenerator = funcNode.generator || false;

    return funcType;
  };

  /**
   * Build parameter types from parameter nodes
   * @param {Node[]} paramNodes - Parameter nodes
   * @returns {Array<{name: string, type: Type, optional: boolean, rest: boolean}>}
   * @private
   */
  ClassTypeBuilder.prototype._buildParameterTypes = function(paramNodes) {
    var params = [];

    if (!paramNodes) return params;

    for (var i = 0; i < paramNodes.length; i++) {
      var param = paramNodes[i];
      var paramName = this._getParamName(param);
      var paramType = Type.ANY;

      if (param.defaultValue) {
        paramType = this._engine.inferType(param.defaultValue);
      }

      params.push({
        name: paramName || 'arg' + i,
        type: paramType,
        optional: !!param.defaultValue,
        rest: param.rest || false
      });
    }

    return params;
  };

  /**
   * Infer method return type
   * @param {Node} funcNode - Function node
   * @returns {Type}
   * @private
   */
  ClassTypeBuilder.prototype._inferMethodReturnType = function(funcNode) {
    if (!funcNode.body) return Type.VOID;

    var isExpression = funcNode.expression || false;
    return this._engine._returnAnalyzer.analyzeReturnType(funcNode.body, isExpression);
  };

  // ----------------------------------------
  // Helper Methods
  // ----------------------------------------

  /**
   * Get member name from key node
   * @param {Node} keyNode - Key node
   * @returns {string|null}
   * @private
   */
  ClassTypeBuilder.prototype._getMemberName = function(keyNode) {
    if (!keyNode) return null;

    switch (keyNode.type) {
      case NodeType.IDENTIFIER:
        return keyNode.name;
      case NodeType.STRING_LITERAL:
        return keyNode.value;
      case NodeType.NUMBER_LITERAL:
        return String(keyNode.value);
      default:
        return null;
    }
  };

  /**
   * Get parameter name
   * @param {Node} param - Parameter node
   * @returns {string|null}
   * @private
   */
  ClassTypeBuilder.prototype._getParamName = function(param) {
    if (!param) return null;

    if (typeof param.name === 'string') {
      return param.name;
    }
    if (param.name && param.name.type === NodeType.IDENTIFIER) {
      return param.name.name;
    }

    return null;
  };

  /**
   * Clear the class cache
   */
  ClassTypeBuilder.prototype.clearCache = function() {
    this._classCache.clear();
  };

  // ============================================
  // Export
  // ============================================

  CodeEditor.ClassTypeBuilder = ClassTypeBuilder;

})(window.CodeEditor = window.CodeEditor || {});
