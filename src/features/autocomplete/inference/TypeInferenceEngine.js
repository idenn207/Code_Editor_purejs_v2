/**
 * @fileoverview Main type inference engine for JavaScript code
 * @module features/autocomplete/inference/TypeInferenceEngine
 */

(function(CodeEditor) {
  'use strict';

  var NodeType = CodeEditor.NodeType;
  var TypeKind = CodeEditor.TypeKind;
  var Type = CodeEditor.Type;
  var PrimitiveType = CodeEditor.PrimitiveType;
  var ArrayType = CodeEditor.ArrayType;
  var ObjectType = CodeEditor.ObjectType;
  var FunctionType = CodeEditor.FunctionType;
  var ClassType = CodeEditor.ClassType;
  var InstanceType = CodeEditor.InstanceType;
  var UnionType = CodeEditor.UnionType;
  var TypeVariable = CodeEditor.TypeVariable;
  var TypeSubstitution = CodeEditor.TypeSubstitution;
  var ReturnTypeAnalyzer = CodeEditor.ReturnTypeAnalyzer;
  var GenericInference = CodeEditor.GenericInference;

  // ============================================
  // TypeInferenceEngine Class
  // ============================================

  /**
   * Main engine for type inference
   * @class
   * @param {Object} [options] - Engine options
   */
  function TypeInferenceEngine(options) {
    options = options || {};

    /**
     * Scope manager for variable lookups
     * @type {ScopeManager|null}
     */
    this._scopeManager = options.scopeManager || null;

    /**
     * Built-in types registry
     * @type {Object|null}
     */
    this._builtinTypes = options.builtinTypes || null;

    /**
     * Return type analyzer
     * @type {ReturnTypeAnalyzer}
     */
    this._returnAnalyzer = new ReturnTypeAnalyzer(this);

    /**
     * Generic type inference helper
     * @type {GenericInference}
     */
    this._genericInference = new GenericInference(this);

    /**
     * Type cache for expressions
     * @type {Map<Node, Type>}
     */
    this._typeCache = new Map();

    /**
     * Current 'this' type context
     * @type {Type|null}
     */
    this._thisContext = null;

    /**
     * Local type bindings (for function parameters, etc.)
     * @type {Map<string, Type>}
     */
    this._localBindings = new Map();
  }

  // ----------------------------------------
  // Configuration
  // ----------------------------------------

  /**
   * Set the scope manager
   * @param {ScopeManager} scopeManager
   */
  TypeInferenceEngine.prototype.setScopeManager = function(scopeManager) {
    this._scopeManager = scopeManager;
  };

  /**
   * Set built-in types registry
   * @param {Object} builtinTypes
   */
  TypeInferenceEngine.prototype.setBuiltinTypes = function(builtinTypes) {
    this._builtinTypes = builtinTypes;
  };

  /**
   * Set the current 'this' context
   * @param {Type} thisType
   */
  TypeInferenceEngine.prototype.setThisContext = function(thisType) {
    this._thisContext = thisType;
  };

  /**
   * Add a local type binding
   * @param {string} name - Variable name
   * @param {Type} type - Variable type
   */
  TypeInferenceEngine.prototype.addLocalBinding = function(name, type) {
    this._localBindings.set(name, type);
  };

  /**
   * Clear local bindings
   */
  TypeInferenceEngine.prototype.clearLocalBindings = function() {
    this._localBindings.clear();
  };

  /**
   * Clear the type cache
   */
  TypeInferenceEngine.prototype.clearCache = function() {
    this._typeCache.clear();
  };

  // ----------------------------------------
  // Main Inference Methods
  // ----------------------------------------

  /**
   * Infer the type of an AST node
   * @param {Node} node - AST node
   * @returns {Type}
   */
  TypeInferenceEngine.prototype.inferType = function(node) {
    if (!node) return Type.ANY;

    // Check cache
    if (this._typeCache.has(node)) {
      return this._typeCache.get(node);
    }

    var type = this._inferTypeImpl(node);
    this._typeCache.set(node, type);
    return type;
  };

  /**
   * Implementation of type inference
   * @param {Node} node - AST node
   * @returns {Type}
   * @private
   */
  TypeInferenceEngine.prototype._inferTypeImpl = function(node) {
    switch (node.type) {
      // Literals
      case NodeType.STRING_LITERAL:
        return PrimitiveType.STRING;

      case NodeType.NUMBER_LITERAL:
        return PrimitiveType.NUMBER;

      case NodeType.BOOLEAN_LITERAL:
        return PrimitiveType.BOOLEAN;

      case NodeType.NULL_LITERAL:
        return PrimitiveType.NULL;

      case NodeType.UNDEFINED_LITERAL:
        return PrimitiveType.UNDEFINED;

      case NodeType.TEMPLATE_LITERAL:
        return PrimitiveType.STRING;

      case NodeType.ARRAY_LITERAL:
        return this._inferArrayLiteralType(node);

      case NodeType.OBJECT_LITERAL:
        return this._inferObjectLiteralType(node);

      // Identifiers
      case NodeType.IDENTIFIER:
        return this._inferIdentifierType(node);

      case NodeType.THIS:
        return this._thisContext || Type.ANY;

      // Expressions
      case NodeType.MEMBER_EXPRESSION:
        return this._inferMemberType(node);

      case NodeType.CALL_EXPRESSION:
        return this._inferCallType(node);

      case NodeType.NEW_EXPRESSION:
        return this._inferNewType(node);

      case NodeType.BINARY_EXPRESSION:
        return this._inferBinaryType(node);

      case NodeType.UNARY_EXPRESSION:
        return this._inferUnaryType(node);

      case NodeType.CONDITIONAL_EXPRESSION:
        return this._inferConditionalType(node);

      case NodeType.ASSIGNMENT_EXPRESSION:
        return this.inferType(node.right);

      // Functions
      case NodeType.ARROW_FUNCTION:
      case NodeType.FUNCTION_EXPRESSION:
      case NodeType.FUNCTION_DECLARATION:
        return this._inferFunctionType(node);

      // Classes
      case NodeType.CLASS_EXPRESSION:
      case NodeType.CLASS_DECLARATION:
        return this._inferClassType(node);

      default:
        return Type.ANY;
    }
  };

  // ----------------------------------------
  // Literal Type Inference
  // ----------------------------------------

  /**
   * Infer type of array literal
   * @param {Node} node - ArrayLiteral node
   * @returns {ArrayType}
   * @private
   */
  TypeInferenceEngine.prototype._inferArrayLiteralType = function(node) {
    if (!node.elements || node.elements.length === 0) {
      return new ArrayType(Type.ANY);
    }

    var elementTypes = [];
    var seenTypes = new Set();

    for (var i = 0; i < node.elements.length; i++) {
      var elem = node.elements[i];
      if (elem === null) continue; // Skip holes

      // Handle spread
      if (elem.type === NodeType.SPREAD_ELEMENT) {
        var spreadType = this.inferType(elem.argument);
        if (spreadType.kind === TypeKind.ARRAY) {
          var typeStr = spreadType.elementType.toString();
          if (!seenTypes.has(typeStr)) {
            seenTypes.add(typeStr);
            elementTypes.push(spreadType.elementType);
          }
        }
        continue;
      }

      var elemType = this.inferType(elem);
      var typeStr = elemType.toString();
      if (!seenTypes.has(typeStr)) {
        seenTypes.add(typeStr);
        elementTypes.push(elemType);
      }
    }

    if (elementTypes.length === 0) {
      return new ArrayType(Type.ANY);
    }

    if (elementTypes.length === 1) {
      return new ArrayType(elementTypes[0]);
    }

    return new ArrayType(new UnionType(elementTypes).simplify());
  };

  /**
   * Infer type of object literal
   * @param {Node} node - ObjectLiteral node
   * @returns {ObjectType}
   * @private
   */
  TypeInferenceEngine.prototype._inferObjectLiteralType = function(node) {
    var objType = new ObjectType();

    if (!node.properties) return objType;

    for (var i = 0; i < node.properties.length; i++) {
      var prop = node.properties[i];

      // Skip spread properties for now
      if (prop.value && prop.value.type === NodeType.SPREAD_ELEMENT) {
        continue;
      }

      var propName = this._getPropertyName(prop.key);
      if (propName === null) continue;

      var propType;
      if (prop.shorthand) {
        propType = this._inferIdentifierType(prop.value || prop.key);
      } else {
        propType = this.inferType(prop.value);
      }

      objType.setProperty(propName, propType);
    }

    return objType;
  };

  /**
   * Get property name from key node
   * @param {Node} key - Property key
   * @returns {string|null}
   * @private
   */
  TypeInferenceEngine.prototype._getPropertyName = function(key) {
    if (!key) return null;

    switch (key.type) {
      case NodeType.IDENTIFIER:
        return key.name;
      case NodeType.STRING_LITERAL:
        return key.value;
      case NodeType.NUMBER_LITERAL:
        return String(key.value);
      default:
        return null;
    }
  };

  // ----------------------------------------
  // Identifier Type Inference
  // ----------------------------------------

  /**
   * Infer type of identifier
   * @param {Node} node - Identifier node
   * @returns {Type}
   * @private
   */
  TypeInferenceEngine.prototype._inferIdentifierType = function(node) {
    var name = node.name;

    // Check local bindings first
    if (this._localBindings.has(name)) {
      return this._localBindings.get(name);
    }

    // Check built-in globals
    if (this._builtinTypes) {
      var builtinType = this._builtinTypes.getGlobalType(name);
      if (builtinType) {
        return builtinType;
      }
    }

    // Check scope manager
    if (this._scopeManager) {
      var symbol = this._scopeManager.lookupSymbol(name);
      if (symbol && symbol.type) {
        return symbol.type;
      }
    }

    return Type.ANY;
  };

  // ----------------------------------------
  // Member Expression Type Inference
  // ----------------------------------------

  /**
   * Infer type of member expression
   * @param {Node} node - MemberExpression node
   * @returns {Type}
   * @private
   */
  TypeInferenceEngine.prototype._inferMemberType = function(node) {
    var objectType = this.inferType(node.object);

    // Get property name
    var propName;
    if (node.computed) {
      // obj[expr]
      if (node.property.type === NodeType.STRING_LITERAL) {
        propName = node.property.value;
      } else if (node.property.type === NodeType.NUMBER_LITERAL) {
        propName = String(node.property.value);
        // For numeric access on array, return element type
        if (objectType.kind === TypeKind.ARRAY) {
          return objectType.elementType;
        }
      } else {
        // Dynamic access - for arrays return element type
        if (objectType.kind === TypeKind.ARRAY) {
          return objectType.elementType;
        }
        return Type.ANY;
      }
    } else {
      // obj.prop
      propName = node.property.name;
    }

    // Get member type from object
    var memberType = objectType.getMember(propName);
    if (memberType) {
      return memberType;
    }

    // Check built-in prototype methods
    if (this._builtinTypes) {
      var protoType = this._builtinTypes.getPrototypeMethod(objectType, propName);
      if (protoType) {
        return protoType;
      }
    }

    return Type.ANY;
  };

  // ----------------------------------------
  // Call Expression Type Inference
  // ----------------------------------------

  /**
   * Infer type of call expression
   * @param {Node} node - CallExpression node
   * @returns {Type}
   * @private
   */
  TypeInferenceEngine.prototype._inferCallType = function(node) {
    var calleeType = this.inferType(node.callee);

    // Check for array method call
    if (node.callee.type === NodeType.MEMBER_EXPRESSION) {
      var objectType = this.inferType(node.callee.object);

      if (objectType.kind === TypeKind.ARRAY && !node.callee.computed) {
        var methodName = node.callee.property.name;
        var argTypes = this._inferArgumentTypes(node.arguments);

        return this._genericInference.inferArrayMethodReturn(methodName, objectType, argTypes);
      }
    }

    // Regular function call
    if (calleeType.kind === TypeKind.FUNCTION) {
      return calleeType.returnType;
    }

    return Type.ANY;
  };

  /**
   * Infer types of call arguments
   * @param {Node[]} args - Argument nodes
   * @returns {Type[]}
   * @private
   */
  TypeInferenceEngine.prototype._inferArgumentTypes = function(args) {
    var types = [];

    for (var i = 0; i < args.length; i++) {
      var arg = args[i];

      if (arg.type === NodeType.SPREAD_ELEMENT) {
        types.push(this.inferType(arg.argument));
      } else {
        types.push(this.inferType(arg));
      }
    }

    return types;
  };

  // ----------------------------------------
  // New Expression Type Inference
  // ----------------------------------------

  /**
   * Infer type of new expression
   * @param {Node} node - NewExpression node
   * @returns {Type}
   * @private
   */
  TypeInferenceEngine.prototype._inferNewType = function(node) {
    var calleeType = this.inferType(node.callee);

    // Built-in constructors
    if (node.callee.type === NodeType.IDENTIFIER) {
      var name = node.callee.name;

      switch (name) {
        case 'Array':
          if (node.arguments.length === 0) {
            return new ArrayType(Type.ANY);
          }
          if (node.arguments.length === 1 &&
              node.arguments[0].type === NodeType.NUMBER_LITERAL) {
            return new ArrayType(Type.ANY);
          }
          // new Array(elem1, elem2, ...)
          var argTypes = this._inferArgumentTypes(node.arguments);
          if (argTypes.length > 0) {
            if (argTypes.length === 1) {
              return new ArrayType(argTypes[0]);
            }
            return new ArrayType(new UnionType(argTypes).simplify());
          }
          return new ArrayType(Type.ANY);

        case 'Object':
          return new ObjectType();

        case 'Map':
        case 'Set':
        case 'WeakMap':
        case 'WeakSet':
          // Return basic types for now
          return Type.ANY;

        case 'Date':
          if (this._builtinTypes) {
            var dateClass = this._builtinTypes.getGlobalType('Date');
            if (dateClass && dateClass.kind === TypeKind.CLASS) {
              return dateClass.createInstance();
            }
            return dateClass || Type.ANY;
          }
          return Type.ANY;

        case 'RegExp':
          if (this._builtinTypes) {
            var regexpClass = this._builtinTypes.getGlobalType('RegExp');
            if (regexpClass && regexpClass.kind === TypeKind.CLASS) {
              return regexpClass.createInstance();
            }
            return regexpClass || Type.ANY;
          }
          return Type.ANY;

        case 'Error':
        case 'TypeError':
        case 'RangeError':
        case 'ReferenceError':
        case 'SyntaxError':
          if (this._builtinTypes) {
            var errorClass = this._builtinTypes.getGlobalType(name);
            if (errorClass && errorClass.kind === TypeKind.CLASS) {
              return errorClass.createInstance();
            }
            return errorClass || Type.ANY;
          }
          return Type.ANY;

        case 'Promise':
          return Type.ANY; // TODO: Promise<T>
      }
    }

    // User-defined class
    if (calleeType.kind === TypeKind.CLASS) {
      return calleeType.createInstance();
    }

    return Type.ANY;
  };

  // ----------------------------------------
  // Binary Expression Type Inference
  // ----------------------------------------

  /**
   * Infer type of binary expression
   * @param {Node} node - BinaryExpression node
   * @returns {Type}
   * @private
   */
  TypeInferenceEngine.prototype._inferBinaryType = function(node) {
    var op = node.operator;
    var leftType = this.inferType(node.left);
    var rightType = this.inferType(node.right);

    // Comparison operators always return boolean
    if (op === '==' || op === '===' || op === '!=' || op === '!==' ||
        op === '<' || op === '>' || op === '<=' || op === '>=' ||
        op === 'instanceof' || op === 'in') {
      return PrimitiveType.BOOLEAN;
    }

    // Logical operators
    if (op === '&&') {
      // Returns right side type if left is truthy, otherwise left
      return new UnionType([leftType, rightType]).simplify();
    }

    if (op === '||') {
      // Returns left if truthy, otherwise right
      return new UnionType([leftType, rightType]).simplify();
    }

    if (op === '??') {
      // Nullish coalescing
      return new UnionType([leftType, rightType]).simplify();
    }

    // Arithmetic operators
    if (op === '+') {
      // String concatenation takes precedence
      if (leftType.kind === TypeKind.STRING || rightType.kind === TypeKind.STRING) {
        return PrimitiveType.STRING;
      }
      // Number addition
      if (leftType.kind === TypeKind.NUMBER && rightType.kind === TypeKind.NUMBER) {
        return PrimitiveType.NUMBER;
      }
      // Default to any (could be string or number)
      return new UnionType([PrimitiveType.STRING, PrimitiveType.NUMBER]).simplify();
    }

    // Other arithmetic operators return number
    if (op === '-' || op === '*' || op === '/' || op === '%' || op === '**') {
      return PrimitiveType.NUMBER;
    }

    // Bitwise operators return number
    if (op === '&' || op === '|' || op === '^' ||
        op === '<<' || op === '>>' || op === '>>>') {
      return PrimitiveType.NUMBER;
    }

    return Type.ANY;
  };

  // ----------------------------------------
  // Unary Expression Type Inference
  // ----------------------------------------

  /**
   * Infer type of unary expression
   * @param {Node} node - UnaryExpression node
   * @returns {Type}
   * @private
   */
  TypeInferenceEngine.prototype._inferUnaryType = function(node) {
    var op = node.operator;

    switch (op) {
      case '!':
        return PrimitiveType.BOOLEAN;
      case 'typeof':
        return PrimitiveType.STRING;
      case 'void':
        return PrimitiveType.UNDEFINED;
      case 'delete':
        return PrimitiveType.BOOLEAN;
      case '+':
      case '-':
      case '~':
        return PrimitiveType.NUMBER;
      default:
        return this.inferType(node.argument);
    }
  };

  // ----------------------------------------
  // Conditional Expression Type Inference
  // ----------------------------------------

  /**
   * Infer type of conditional (ternary) expression
   * @param {Node} node - ConditionalExpression node
   * @returns {Type}
   * @private
   */
  TypeInferenceEngine.prototype._inferConditionalType = function(node) {
    var consequentType = this.inferType(node.consequent);
    var alternateType = this.inferType(node.alternate);

    // If same type, return that type
    if (consequentType.equals(alternateType)) {
      return consequentType;
    }

    // Otherwise, return union
    return new UnionType([consequentType, alternateType]).simplify();
  };

  // ----------------------------------------
  // Function Type Inference
  // ----------------------------------------

  /**
   * Infer type of function
   * @param {Node} node - Function node
   * @returns {FunctionType}
   * @private
   */
  TypeInferenceEngine.prototype._inferFunctionType = function(node) {
    // Build parameter types
    var params = [];
    for (var i = 0; i < node.params.length; i++) {
      var param = node.params[i];
      var paramType = Type.ANY;

      // Try to infer from default value
      if (param.defaultValue) {
        paramType = this.inferType(param.defaultValue);
      }

      params.push({
        name: typeof param.name === 'string' ? param.name : (param.name ? param.name.name : 'arg'),
        type: paramType,
        optional: !!param.defaultValue,
        rest: param.rest || false
      });
    }

    // Infer return type
    var isExpression = node.expression || false;
    var returnType = this._returnAnalyzer.analyzeReturnType(node.body, isExpression);

    var funcType = new FunctionType(params, returnType);
    funcType.isAsync = node.async || false;
    funcType.isGenerator = node.generator || false;

    return funcType;
  };

  /**
   * Infer function return type with parameter bindings
   * @param {Node} funcNode - Function node
   * @param {Map<string, Type>} paramTypes - Parameter type bindings
   * @returns {Type}
   */
  TypeInferenceEngine.prototype.inferFunctionReturnType = function(funcNode, paramTypes) {
    // Save current bindings
    var savedBindings = new Map(this._localBindings);

    // Add parameter bindings
    if (paramTypes) {
      for (var entry of paramTypes) {
        this._localBindings.set(entry[0], entry[1]);
      }
    }

    // Infer return type
    var isExpression = funcNode.expression || false;
    var returnType = this._returnAnalyzer.analyzeReturnType(funcNode.body, isExpression);

    // Restore bindings
    this._localBindings = savedBindings;

    return returnType;
  };

  // ----------------------------------------
  // Class Type Inference
  // ----------------------------------------

  /**
   * Infer type of class
   * @param {Node} node - Class node
   * @returns {ClassType}
   * @private
   */
  TypeInferenceEngine.prototype._inferClassType = function(node) {
    var className = node.id ? node.id.name : 'AnonymousClass';

    // Infer superclass
    var superClass = null;
    if (node.superClass) {
      var superType = this.inferType(node.superClass);
      if (superType.kind === TypeKind.CLASS) {
        superClass = superType;
      }
    }

    var classType = new ClassType(className, superClass);

    // Process class body
    if (node.body && node.body.body) {
      this._processClassMembers(classType, node.body.body);
    }

    return classType;
  };

  /**
   * Process class members
   * @param {ClassType} classType - Class type to populate
   * @param {Node[]} members - Class body members
   * @private
   */
  TypeInferenceEngine.prototype._processClassMembers = function(classType, members) {
    for (var i = 0; i < members.length; i++) {
      var member = members[i];
      if (!member) continue;

      var memberName = this._getPropertyName(member.key);
      if (memberName === null) continue;

      var isStatic = member.static || false;

      if (member.type === NodeType.METHOD_DEFINITION) {
        var methodType = this._inferMethodType(member, classType);

        if (member.kind === 'constructor') {
          classType.setConstructor(methodType);
          // Analyze constructor for this.xxx assignments
          this._analyzeConstructorAssignments(classType, member.value);
        } else if (isStatic) {
          classType.setStaticMember(memberName, methodType);
        } else {
          classType.setInstanceMember(memberName, methodType);
        }
      } else if (member.type === NodeType.PROPERTY_DEFINITION) {
        var propType = member.value ? this.inferType(member.value) : Type.ANY;

        if (isStatic) {
          classType.setStaticMember(memberName, propType);
        } else {
          classType.setInstanceMember(memberName, propType);
        }
      }
    }
  };

  /**
   * Infer type of class method
   * @param {Node} methodNode - MethodDefinition node
   * @param {ClassType} classType - Class containing the method
   * @returns {FunctionType}
   * @private
   */
  TypeInferenceEngine.prototype._inferMethodType = function(methodNode, classType) {
    var funcNode = methodNode.value;

    // Save and set this context
    var savedThisContext = this._thisContext;
    this._thisContext = classType.createInstance();

    var funcType = this._inferFunctionType(funcNode);

    // Restore this context
    this._thisContext = savedThisContext;

    return funcType;
  };

  /**
   * Analyze constructor for this.xxx assignments
   * @param {ClassType} classType - Class type
   * @param {Node} constructorFunc - Constructor function node
   * @private
   */
  TypeInferenceEngine.prototype._analyzeConstructorAssignments = function(classType, constructorFunc) {
    if (!constructorFunc || !constructorFunc.body) return;

    var body = constructorFunc.body;
    if (body.type !== NodeType.BLOCK_STATEMENT) return;

    // Save and set this context
    var savedThisContext = this._thisContext;
    this._thisContext = classType.createInstance();

    // Add parameter bindings
    var savedBindings = new Map(this._localBindings);
    if (constructorFunc.params) {
      for (var i = 0; i < constructorFunc.params.length; i++) {
        var param = constructorFunc.params[i];
        var paramName = typeof param.name === 'string' ? param.name : (param.name ? param.name.name : null);
        if (paramName) {
          var paramType = param.defaultValue ? this.inferType(param.defaultValue) : Type.ANY;
          this._localBindings.set(paramName, paramType);
        }
      }
    }

    // Scan for this.xxx = ... assignments
    this._scanForThisAssignments(body.body, classType);

    // Restore bindings and context
    this._localBindings = savedBindings;
    this._thisContext = savedThisContext;
  };

  /**
   * Scan statements for this.xxx = value assignments
   * @param {Node[]} statements - Statements to scan
   * @param {ClassType} classType - Class type to populate
   * @private
   */
  TypeInferenceEngine.prototype._scanForThisAssignments = function(statements, classType) {
    for (var i = 0; i < statements.length; i++) {
      var stmt = statements[i];
      if (!stmt) continue;

      if (stmt.type === NodeType.EXPRESSION_STATEMENT) {
        var expr = stmt.expression;

        if (expr && expr.type === NodeType.ASSIGNMENT_EXPRESSION) {
          this._processThisAssignment(expr, classType);
        }
      }
    }
  };

  /**
   * Process a potential this.xxx = value assignment
   * @param {Node} assignExpr - Assignment expression
   * @param {ClassType} classType - Class type
   * @private
   */
  TypeInferenceEngine.prototype._processThisAssignment = function(assignExpr, classType) {
    var left = assignExpr.left;

    // Check for this.xxx pattern
    if (left.type === NodeType.MEMBER_EXPRESSION &&
        left.object.type === NodeType.THIS &&
        !left.computed) {
      var propName = left.property.name;
      var valueType = this.inferType(assignExpr.right);

      // Only add if not already defined
      if (!classType.instanceMembers.has(propName)) {
        classType.setInstanceMember(propName, valueType);
      }
    }
  };

  // ----------------------------------------
  // Callback Type Inference
  // ----------------------------------------

  /**
   * Infer callback parameter types for array methods
   * @param {string} methodName - Array method name
   * @param {ArrayType} arrayType - Array type
   * @returns {FunctionType}
   */
  TypeInferenceEngine.prototype.getCallbackType = function(methodName, arrayType) {
    return this._genericInference.createArrayCallbackType(methodName, arrayType);
  };

  /**
   * Infer callback parameter types and bind them
   * @param {Node} callbackNode - Callback function node
   * @param {FunctionType} expectedType - Expected callback type
   */
  TypeInferenceEngine.prototype.bindCallbackParameters = function(callbackNode, expectedType) {
    if (!callbackNode.params || !expectedType.params) return;

    var numParams = Math.min(callbackNode.params.length, expectedType.params.length);
    for (var i = 0; i < numParams; i++) {
      var param = callbackNode.params[i];
      var paramName = typeof param.name === 'string' ? param.name : (param.name ? param.name.name : null);

      if (paramName) {
        this._localBindings.set(paramName, expectedType.params[i].type);
      }
    }
  };

  // ============================================
  // Static Methods
  // ============================================

  /**
   * Create a new type inference engine
   * @param {Object} options - Options
   * @returns {TypeInferenceEngine}
   */
  TypeInferenceEngine.create = function(options) {
    return new TypeInferenceEngine(options);
  };

  // ============================================
  // Export
  // ============================================

  CodeEditor.TypeInferenceEngine = TypeInferenceEngine;

})(window.CodeEditor = window.CodeEditor || {});
