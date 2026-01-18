/**
 * @fileoverview Analyzes return statements to infer function return types
 * @module features/autocomplete/inference/ReturnTypeAnalyzer
 */

(function(CodeEditor) {
  'use strict';

  var NodeType = CodeEditor.NodeType;
  var Type = CodeEditor.Type;
  var TypeKind = CodeEditor.TypeKind;
  var PrimitiveType = CodeEditor.PrimitiveType;
  var UnionType = CodeEditor.UnionType;

  // ============================================
  // ReturnTypeAnalyzer Class
  // ============================================

  /**
   * Analyzes function bodies to infer return types
   * @class
   * @param {TypeInferenceEngine} engine - The type inference engine
   */
  function ReturnTypeAnalyzer(engine) {
    /**
     * Reference to the type inference engine
     * @type {TypeInferenceEngine}
     */
    this._engine = engine;
  }

  // ----------------------------------------
  // Main Analysis Methods
  // ----------------------------------------

  /**
   * Analyze a function body to determine its return type
   * @param {Node} body - Function body (BlockStatement or expression)
   * @param {boolean} isExpression - Is this an arrow function with expression body
   * @returns {Type}
   */
  ReturnTypeAnalyzer.prototype.analyzeReturnType = function(body, isExpression) {
    // Expression body - return type is the expression type
    if (isExpression) {
      return this._engine.inferType(body);
    }

    // Block body - collect return statements
    var returnTypes = [];
    var hasImplicitReturn = this._collectReturnTypes(body, returnTypes);

    // No return statements found - function has void return type
    if (returnTypes.length === 0) {
      return Type.VOID;
    }

    // Single return type
    if (returnTypes.length === 1) {
      return returnTypes[0];
    }

    // Multiple return types - create union
    return new UnionType(returnTypes).simplify();
  };

  /**
   * Collect all return types from a function body
   * @param {Node} node - AST node to analyze
   * @param {Type[]} returnTypes - Array to collect types
   * @returns {boolean} - Whether there's an implicit return path
   * @private
   */
  ReturnTypeAnalyzer.prototype._collectReturnTypes = function(node, returnTypes) {
    if (!node) return true;

    switch (node.type) {
      case NodeType.RETURN_STATEMENT:
        if (node.argument) {
          var type = this._engine.inferType(node.argument);
          this._addUniqueType(returnTypes, type);
        } else {
          this._addUniqueType(returnTypes, PrimitiveType.UNDEFINED);
        }
        return false; // No implicit return after explicit return

      case NodeType.BLOCK_STATEMENT:
        return this._analyzeBlock(node.body, returnTypes);

      case NodeType.EXPRESSION_STATEMENT:
        // Expression statements don't affect return type
        return true;

      case NodeType.VARIABLE_DECLARATION:
        return true;

      default:
        // For unsupported nodes, assume implicit return possible
        return true;
    }
  };

  /**
   * Analyze a block of statements
   * @param {Node[]} statements - Block statements
   * @param {Type[]} returnTypes - Array to collect types
   * @returns {boolean} - Whether there's an implicit return path
   * @private
   */
  ReturnTypeAnalyzer.prototype._analyzeBlock = function(statements, returnTypes) {
    if (!statements || statements.length === 0) {
      return true; // Empty block has implicit return
    }

    for (var i = 0; i < statements.length; i++) {
      var stmt = statements[i];
      var hasImplicit = this._collectReturnTypes(stmt, returnTypes);

      // If we hit an explicit return, no more paths after it
      if (!hasImplicit) {
        return false;
      }
    }

    return true; // Reached end of block without return
  };

  /**
   * Add a type to the collection if it's not already present
   * @param {Type[]} types - Array of types
   * @param {Type} type - Type to add
   * @private
   */
  ReturnTypeAnalyzer.prototype._addUniqueType = function(types, type) {
    for (var i = 0; i < types.length; i++) {
      if (types[i].equals(type)) {
        return;
      }
    }
    types.push(type);
  };

  // ----------------------------------------
  // Helper Methods
  // ----------------------------------------

  /**
   * Check if a node contains a return statement
   * @param {Node} node - Node to check
   * @returns {boolean}
   */
  ReturnTypeAnalyzer.prototype.hasReturnStatement = function(node) {
    if (!node) return false;

    if (node.type === NodeType.RETURN_STATEMENT) {
      return true;
    }

    if (node.type === NodeType.BLOCK_STATEMENT) {
      for (var i = 0; i < node.body.length; i++) {
        if (this.hasReturnStatement(node.body[i])) {
          return true;
        }
      }
    }

    return false;
  };

  /**
   * Get all return statements from a function body
   * @param {Node} body - Function body
   * @returns {Node[]} - Array of return statement nodes
   */
  ReturnTypeAnalyzer.prototype.getReturnStatements = function(body) {
    var statements = [];
    this._collectReturnStatements(body, statements);
    return statements;
  };

  /**
   * Collect return statements recursively
   * @param {Node} node - Node to analyze
   * @param {Node[]} statements - Array to collect statements
   * @private
   */
  ReturnTypeAnalyzer.prototype._collectReturnStatements = function(node, statements) {
    if (!node) return;

    if (node.type === NodeType.RETURN_STATEMENT) {
      statements.push(node);
      return;
    }

    if (node.type === NodeType.BLOCK_STATEMENT) {
      for (var i = 0; i < node.body.length; i++) {
        this._collectReturnStatements(node.body[i], statements);
      }
    }

    // Don't descend into nested functions
    if (node.type === NodeType.FUNCTION_EXPRESSION ||
        node.type === NodeType.FUNCTION_DECLARATION ||
        node.type === NodeType.ARROW_FUNCTION) {
      return;
    }
  };

  // ============================================
  // Export
  // ============================================

  CodeEditor.ReturnTypeAnalyzer = ReturnTypeAnalyzer;

})(window.CodeEditor = window.CodeEditor || {});
