/**
 * @fileoverview High-level type checker API for autocomplete
 * @module features/autocomplete/TypeChecker
 */

(function(CodeEditor) {
  'use strict';

  var ExpressionParser = CodeEditor.ExpressionParser;
  var TypeInferenceEngine = CodeEditor.TypeInferenceEngine;
  var ClassTypeBuilder = CodeEditor.ClassTypeBuilder;
  var ThisContextTracker = CodeEditor.ThisContextTracker;
  var BuiltinTypes = CodeEditor.BuiltinTypes;
  var NodeType = CodeEditor.NodeType;
  var TypeKind = CodeEditor.TypeKind;
  var Type = CodeEditor.Type;
  var PrimitiveType = CodeEditor.PrimitiveType;
  var ArrayType = CodeEditor.ArrayType;
  var ObjectType = CodeEditor.ObjectType;
  var FunctionType = CodeEditor.FunctionType;
  var ClassType = CodeEditor.ClassType;
  var InstanceType = CodeEditor.InstanceType;

  // ============================================
  // TypeChecker Class
  // ============================================

  /**
   * High-level API for type checking and inference
   * @class
   * @param {Object} [options] - Configuration options
   */
  function TypeChecker(options) {
    options = options || {};

    /**
     * Built-in types registry
     * @type {BuiltinTypes}
     */
    this._builtinTypes = BuiltinTypes.getInstance();

    /**
     * Type inference engine
     * @type {TypeInferenceEngine}
     */
    this._inferenceEngine = new TypeInferenceEngine({
      builtinTypes: this._builtinTypes
    });

    /**
     * Class type builder
     * @type {ClassTypeBuilder}
     */
    this._classBuilder = new ClassTypeBuilder(this._inferenceEngine);

    /**
     * This context tracker
     * @type {ThisContextTracker}
     */
    this._thisTracker = new ThisContextTracker();

    /**
     * Cache of analyzed source code
     * @type {Map<string, Object>}
     */
    this._analysisCache = new Map();

    /**
     * Symbol table for declarations
     * @type {Map<string, Type>}
     */
    this._symbolTable = new Map();

    /**
     * Class type cache
     * @type {Map<string, ClassType>}
     */
    this._classTypes = new Map();
  }

  // ----------------------------------------
  // Main API
  // ----------------------------------------

  /**
   * Analyze source code and extract type information
   * @param {string} source - Source code to analyze
   * @returns {Object} Analysis result with declarations and types
   */
  TypeChecker.prototype.analyze = function(source) {
    // Check cache
    if (this._analysisCache.has(source)) {
      return this._analysisCache.get(source);
    }

    // Parse source
    var ast;
    try {
      ast = ExpressionParser.parse(source);
    } catch (e) {
      return {
        success: false,
        error: e.message,
        declarations: [],
        classes: [],
        functions: []
      };
    }

    // Reset state
    this._symbolTable.clear();
    this._classTypes.clear();
    this._thisTracker.reset();
    this._inferenceEngine.clearCache();
    this._classBuilder.clearCache();

    // First pass: collect declarations
    var declarations = [];
    var classes = [];
    var functions = [];

    this._collectDeclarations(ast, declarations, classes, functions);

    // Build result
    var result = {
      success: true,
      ast: ast,
      declarations: declarations,
      classes: classes,
      functions: functions
    };

    // Cache result
    this._analysisCache.set(source, result);

    return result;
  };

  /**
   * Infer the type of an expression in context
   * @param {string} expression - Expression string
   * @param {Object} [context] - Context with local variables
   * @returns {Type}
   */
  TypeChecker.prototype.inferExpressionType = function(expression, context) {
    // Set up context
    if (context) {
      if (context.thisType) {
        this._inferenceEngine.setThisContext(context.thisType);
      }
      if (context.locals) {
        for (var name in context.locals) {
          this._inferenceEngine.addLocalBinding(name, context.locals[name]);
        }
      }
    }

    // Parse expression
    var exprAst;
    try {
      exprAst = ExpressionParser.parseExpression(expression);
    } catch (e) {
      return Type.ANY;
    }

    // Infer type
    var type = this._inferenceEngine.inferType(exprAst);

    // Clear context
    this._inferenceEngine.clearLocalBindings();
    this._inferenceEngine.setThisContext(null);

    return type;
  };

  /**
   * Get type at a specific position in source code
   * @param {string} source - Source code
   * @param {number} offset - Character offset
   * @returns {Type}
   */
  TypeChecker.prototype.getTypeAtOffset = function(source, offset) {
    // Analyze source first
    var analysis = this.analyze(source);
    if (!analysis.success) {
      return Type.ANY;
    }

    // Find node at offset
    var node = this._findNodeAtOffset(analysis.ast, offset);
    if (!node) {
      return Type.ANY;
    }

    // Infer type of the found node
    return this._inferenceEngine.inferType(node);
  };

  /**
   * Get completions for a member expression
   * @param {Type} objectType - Type of the object
   * @returns {Array<{name: string, type: Type, kind: string}>}
   */
  TypeChecker.prototype.getCompletions = function(objectType) {
    var completions = [];

    if (!objectType) {
      return completions;
    }

    // Get member names
    var memberNames = objectType.getMemberNames();

    for (var i = 0; i < memberNames.length; i++) {
      var name = memberNames[i];
      var memberType = objectType.getMember(name);

      completions.push({
        name: name,
        type: memberType,
        kind: this._getMemberKind(memberType)
      });
    }

    // Sort by name
    completions.sort(function(a, b) {
      return a.name.localeCompare(b.name);
    });

    return completions;
  };

  /**
   * Get callback parameter types for array method
   * @param {string} methodName - Array method name
   * @param {ArrayType} arrayType - Array type
   * @returns {FunctionType}
   */
  TypeChecker.prototype.getCallbackType = function(methodName, arrayType) {
    return this._inferenceEngine.getCallbackType(methodName, arrayType);
  };

  /**
   * Check if a type is callable
   * @param {Type} type - Type to check
   * @returns {boolean}
   */
  TypeChecker.prototype.isCallable = function(type) {
    return type && type.isCallable();
  };

  /**
   * Check if a type is constructable
   * @param {Type} type - Type to check
   * @returns {boolean}
   */
  TypeChecker.prototype.isConstructable = function(type) {
    return type && type.isConstructable();
  };

  /**
   * Get the return type of a function type
   * @param {Type} funcType - Function type
   * @returns {Type}
   */
  TypeChecker.prototype.getReturnType = function(funcType) {
    if (funcType && funcType.kind === TypeKind.FUNCTION) {
      return funcType.returnType;
    }
    return Type.ANY;
  };

  /**
   * Get the element type of an array type
   * @param {Type} arrayType - Array type
   * @returns {Type}
   */
  TypeChecker.prototype.getElementType = function(arrayType) {
    if (arrayType && arrayType.kind === TypeKind.ARRAY) {
      return arrayType.elementType;
    }
    return Type.ANY;
  };

  /**
   * Get class type by name
   * @param {string} className - Class name
   * @returns {ClassType|null}
   */
  TypeChecker.prototype.getClassType = function(className) {
    return this._classTypes.get(className) || null;
  };

  /**
   * Get symbol type by name
   * @param {string} name - Symbol name
   * @returns {Type|null}
   */
  TypeChecker.prototype.getSymbolType = function(name) {
    // Check local symbols
    if (this._symbolTable.has(name)) {
      return this._symbolTable.get(name);
    }

    // Check built-in globals
    return this._builtinTypes.getGlobalType(name);
  };

  // ----------------------------------------
  // Declaration Collection
  // ----------------------------------------

  /**
   * Collect declarations from AST
   * @param {Node} ast - AST root
   * @param {Array} declarations - Output array for variable declarations
   * @param {Array} classes - Output array for class declarations
   * @param {Array} functions - Output array for function declarations
   * @private
   */
  TypeChecker.prototype._collectDeclarations = function(ast, declarations, classes, functions) {
    if (!ast || !ast.body) return;

    for (var i = 0; i < ast.body.length; i++) {
      var node = ast.body[i];
      this._processDeclaration(node, declarations, classes, functions);
    }
  };

  /**
   * Process a declaration node
   * @param {Node} node - AST node
   * @param {Array} declarations - Output array for variables
   * @param {Array} classes - Output array for classes
   * @param {Array} functions - Output array for functions
   * @private
   */
  TypeChecker.prototype._processDeclaration = function(node, declarations, classes, functions) {
    if (!node) return;

    switch (node.type) {
      case NodeType.VARIABLE_DECLARATION:
        this._processVariableDeclaration(node, declarations);
        break;

      case NodeType.FUNCTION_DECLARATION:
        this._processFunctionDeclaration(node, functions);
        break;

      case NodeType.CLASS_DECLARATION:
        this._processClassDeclaration(node, classes);
        break;

      case NodeType.EXPRESSION_STATEMENT:
        // Check for assignment to undeclared variable
        if (node.expression && node.expression.type === NodeType.ASSIGNMENT_EXPRESSION) {
          var left = node.expression.left;
          if (left.type === NodeType.IDENTIFIER && !this._symbolTable.has(left.name)) {
            var type = this._inferenceEngine.inferType(node.expression.right);
            this._symbolTable.set(left.name, type);
            declarations.push({
              name: left.name,
              type: type,
              kind: 'var',
              node: node
            });
          }
        }
        break;
    }
  };

  /**
   * Process variable declaration
   * @param {Node} node - VariableDeclaration node
   * @param {Array} declarations - Output array
   * @private
   */
  TypeChecker.prototype._processVariableDeclaration = function(node, declarations) {
    for (var i = 0; i < node.declarations.length; i++) {
      var decl = node.declarations[i];
      var name = decl.id.name;
      var type = decl.init ? this._inferenceEngine.inferType(decl.init) : Type.ANY;

      this._symbolTable.set(name, type);
      declarations.push({
        name: name,
        type: type,
        kind: node.kind,
        node: decl
      });
    }
  };

  /**
   * Process function declaration
   * @param {Node} node - FunctionDeclaration node
   * @param {Array} functions - Output array
   * @private
   */
  TypeChecker.prototype._processFunctionDeclaration = function(node, functions) {
    if (!node.id) return;

    var name = node.id.name;
    var type = this._inferenceEngine.inferType(node);

    this._symbolTable.set(name, type);
    functions.push({
      name: name,
      type: type,
      node: node
    });
  };

  /**
   * Process class declaration
   * @param {Node} node - ClassDeclaration node
   * @param {Array} classes - Output array
   * @private
   */
  TypeChecker.prototype._processClassDeclaration = function(node, classes) {
    if (!node.id) return;

    var name = node.id.name;
    var classType = this._classBuilder.buildClassType(node);

    this._symbolTable.set(name, classType);
    this._classTypes.set(name, classType);
    classes.push({
      name: name,
      type: classType,
      node: node
    });
  };

  // ----------------------------------------
  // AST Navigation
  // ----------------------------------------

  /**
   * Find AST node at a specific offset
   * @param {Node} root - Root node
   * @param {number} offset - Character offset
   * @returns {Node|null}
   * @private
   */
  TypeChecker.prototype._findNodeAtOffset = function(root, offset) {
    if (!root) return null;

    // Check if offset is within this node
    if (root.start !== undefined && root.end !== undefined) {
      if (offset < root.start || offset > root.end) {
        return null;
      }
    }

    // Check children
    var best = root;

    for (var key in root) {
      var value = root[key];

      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          for (var i = 0; i < value.length; i++) {
            var found = this._findNodeAtOffset(value[i], offset);
            if (found && found !== root) {
              best = found;
            }
          }
        } else if (value.type) {
          var found = this._findNodeAtOffset(value, offset);
          if (found && found !== root) {
            best = found;
          }
        }
      }
    }

    return best;
  };

  // ----------------------------------------
  // Utility Methods
  // ----------------------------------------

  /**
   * Get member kind string
   * @param {Type} type - Member type
   * @returns {string}
   * @private
   */
  TypeChecker.prototype._getMemberKind = function(type) {
    if (!type) return 'property';

    switch (type.kind) {
      case TypeKind.FUNCTION:
        return 'method';
      case TypeKind.CLASS:
        return 'class';
      default:
        return 'property';
    }
  };

  /**
   * Get type string representation
   * @param {Type} type - Type to stringify
   * @returns {string}
   */
  TypeChecker.prototype.typeToString = function(type) {
    if (!type) return 'any';
    return type.toString();
  };

  /**
   * Clear all caches
   */
  TypeChecker.prototype.clearCache = function() {
    this._analysisCache.clear();
    this._symbolTable.clear();
    this._classTypes.clear();
    this._inferenceEngine.clearCache();
    this._classBuilder.clearCache();
  };

  // ----------------------------------------
  // Static Methods
  // ----------------------------------------

  /**
   * Create a new TypeChecker instance
   * @param {Object} [options] - Options
   * @returns {TypeChecker}
   */
  TypeChecker.create = function(options) {
    return new TypeChecker(options);
  };

  /**
   * Singleton instance
   * @type {TypeChecker}
   * @private
   */
  TypeChecker._instance = null;

  /**
   * Get singleton instance
   * @returns {TypeChecker}
   */
  TypeChecker.getInstance = function() {
    if (!TypeChecker._instance) {
      TypeChecker._instance = new TypeChecker();
    }
    return TypeChecker._instance;
  };

  // ============================================
  // Export
  // ============================================

  CodeEditor.TypeChecker = TypeChecker;

})(window.CodeEditor = window.CodeEditor || {});
