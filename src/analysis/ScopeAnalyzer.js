/**
 * @fileoverview Scope analyzer for building scope tree from parsed declarations
 * @module analysis/ScopeAnalyzer
 */

(function(CodeEditor) {
  'use strict';

  var TYPE_KIND = CodeEditor.Analysis.TYPE_KIND;
  var SymbolTable = CodeEditor.Analysis.SymbolTable;
  var BuiltinTypes = CodeEditor.Analysis.BuiltinTypes;

  // ============================================
  // ScopeAnalyzer Class
  // ============================================

  /**
   * Analyzes parsed declarations and builds a scope tree
   */
  class ScopeAnalyzer {
    constructor() {
      this._symbolTable = new SymbolTable();
      this._builtinTypes = new BuiltinTypes();
      this._parser = new CodeEditor.Analysis.JSParser();

      // Cache for analyzed documents
      this._documentVersion = 0;
      this._cachedDeclarations = null;
    }

    // ----------------------------------------
    // Main Analysis Methods
    // ----------------------------------------

    /**
     * Analyze document text and populate symbol table
     * @param {string} text - Document text
     * @param {number} version - Document version (for caching)
     * @returns {SymbolTable}
     */
    analyze(text, version) {
      // Check cache
      if (version !== undefined && version === this._documentVersion && this._cachedDeclarations) {
        return this._symbolTable;
      }

      // Clear and rebuild
      this._symbolTable.clear();

      // Parse declarations
      var declarations = this._parser.parse(text);
      this._cachedDeclarations = declarations;
      this._documentVersion = version || 0;

      // Process declarations
      this._processDeclarations(declarations);

      return this._symbolTable;
    }

    /**
     * Incrementally update analysis for a changed range
     * @param {string} text - Updated document text
     * @param {number} startLine - Start of changed range
     * @param {number} endLine - End of changed range
     * @param {number} version - Document version
     * @returns {SymbolTable}
     */
    updateRange(text, startLine, endLine, version) {
      // For now, do full re-analysis
      // Future optimization: only re-analyze affected scopes
      return this.analyze(text, version);
    }

    /**
     * Get the symbol table
     * @returns {SymbolTable}
     */
    getSymbolTable() {
      return this._symbolTable;
    }

    // ----------------------------------------
    // Declaration Processing
    // ----------------------------------------

    _processDeclarations(declarations) {
      var self = this;
      var globalScope = this._symbolTable.getGlobalScope();

      // First pass: Create scopes for classes and functions
      var scopeMap = new Map(); // declaration -> scopeId

      declarations.forEach(function(decl) {
        if (decl.type === 'ClassDeclaration') {
          var classScope = self._symbolTable.createClassScope(
            globalScope.id,
            decl.range,
            decl.name
          );
          scopeMap.set(decl, classScope.id);

          // Add class to global scope
          self._addClassSymbol(decl, globalScope.id);
        } else if (decl.type === 'FunctionDeclaration') {
          var funcScope = self._symbolTable.createFunctionScope(
            globalScope.id,
            decl.range
          );
          scopeMap.set(decl, funcScope.id);

          // Add function to global scope
          self._addFunctionSymbol(decl, globalScope.id);

          // Add parameters to function scope
          self._addParameterSymbols(decl.params, funcScope.id, decl.range.startLine);
        }
      });

      // Second pass: Process all declarations
      declarations.forEach(function(decl) {
        switch (decl.type) {
          case 'VariableDeclaration':
            self._processVariableDeclaration(decl, globalScope.id, scopeMap);
            break;

          case 'ClassField':
          case 'ClassMethod':
          case 'ClassGetter':
          case 'ClassSetter':
            self._processClassMember(decl, scopeMap);
            break;

          case 'ThisAssignment':
            self._processThisAssignment(decl, scopeMap);
            break;

          case 'ImportDeclaration':
            self._processImportDeclaration(decl, globalScope.id);
            break;
        }
      });
    }

    // ----------------------------------------
    // Symbol Creation
    // ----------------------------------------

    _addClassSymbol(decl, scopeId) {
      var classType = {
        kind: TYPE_KIND.CLASS,
        name: decl.name,
        extends: decl.extends,
        members: []
      };

      this._symbolTable.addSymbol(decl.name, classType, 'class', decl.range, scopeId);
    }

    _addFunctionSymbol(decl, scopeId) {
      var returnType = null;
      if (decl.returnType) {
        returnType = this._builtinTypes.createPrimitiveType(decl.returnType);
      }

      var funcType = {
        kind: TYPE_KIND.FUNCTION,
        name: decl.name,
        params: decl.params,
        returnType: returnType,
        isAsync: decl.isAsync
      };

      this._symbolTable.addSymbol(decl.name, funcType, 'function', decl.range, scopeId);
    }

    _addParameterSymbols(params, scopeId, line) {
      var self = this;
      params.forEach(function(param) {
        self._symbolTable.addSymbol(
          param,
          self._builtinTypes.createUnknownType(),
          'parameter',
          { startLine: line, endLine: line },
          scopeId
        );
      });
    }

    _processVariableDeclaration(decl, scopeId, scopeMap) {
      // Determine the correct scope based on line number
      var targetScope = this._findScopeForLine(decl.range.startLine, scopeId, scopeMap);

      // Infer type from initializer
      var type = this._inferTypeFromInit(decl.init);

      var symbol = this._symbolTable.addSymbol(
        decl.name,
        type,
        'variable',
        decl.range,
        targetScope
      );

      symbol.declarationKind = decl.declarationKind;
    }

    _processClassMember(decl, scopeMap) {
      // Find the class scope
      var classScope = this._findClassScope(decl.className, scopeMap);
      if (!classScope) return;

      var memberType;
      var memberKind;

      switch (decl.type) {
        case 'ClassField':
          memberKind = 'property';
          if (decl.valueType) {
            memberType = this._builtinTypes.createPrimitiveType(decl.valueType);
          } else {
            memberType = this._builtinTypes.createUnknownType();
          }
          break;

        case 'ClassMethod':
          memberKind = 'method';
          memberType = {
            kind: TYPE_KIND.FUNCTION,
            name: decl.name,
            params: decl.params,
            returnType: null,
            isAsync: decl.isAsync,
            isStatic: decl.isStatic
          };
          break;

        case 'ClassGetter':
          memberKind = 'property';
          memberType = this._builtinTypes.createUnknownType();
          break;

        case 'ClassSetter':
          memberKind = 'property';
          memberType = this._builtinTypes.createUnknownType();
          break;
      }

      this._symbolTable.addClassMember(classScope, decl.name, memberType, memberKind);
    }

    _processThisAssignment(decl, scopeMap) {
      if (!decl.className) return;

      var classScope = this._findClassScope(decl.className, scopeMap);
      if (!classScope) return;

      var type;
      if (decl.valueType) {
        type = this._builtinTypes.createPrimitiveType(decl.valueType);
      } else if (decl.init) {
        type = this._inferTypeFromInit(decl.init);
      } else {
        type = this._builtinTypes.createUnknownType();
      }

      this._symbolTable.addClassMember(classScope, decl.name, type, 'property');
    }

    _processImportDeclaration(decl, scopeId) {
      var self = this;

      decl.specifiers.forEach(function(spec) {
        // Create a symbol for each imported name
        var type = {
          kind: TYPE_KIND.UNKNOWN,
          importedFrom: decl.source,
          importedName: spec.imported
        };

        self._symbolTable.addSymbol(
          spec.local,
          type,
          'variable',
          decl.range,
          scopeId
        );
      });
    }

    // ----------------------------------------
    // Type Inference
    // ----------------------------------------

    _inferTypeFromInit(init) {
      if (!init) {
        return this._builtinTypes.createUnknownType();
      }

      switch (init.type) {
        case 'Literal':
          if (init.valueType === 'null' || init.valueType === 'undefined') {
            return this._builtinTypes.createUnknownType();
          }
          return this._builtinTypes.createPrimitiveType(init.valueType);

        case 'ArrayLiteral':
          var elementType = init.elementType
            ? this._builtinTypes.createPrimitiveType(init.elementType)
            : null;
          return this._builtinTypes.createArrayType(elementType);

        case 'ObjectLiteral':
          return this._createObjectTypeFromLiteral(init);

        case 'NewExpression':
          var constructorType = this._builtinTypes.getConstructorType(init.constructorName);
          if (constructorType) {
            return {
              kind: TYPE_KIND.OBJECT,
              name: constructorType
            };
          }
          // User-defined constructor
          return {
            kind: TYPE_KIND.CLASS,
            name: init.constructorName
          };

        case 'CallExpression':
          return this._inferCallReturnType(init.callee);

        case 'ArrowFunction':
        case 'FunctionExpression':
          var returnType = init.returnType
            ? this._builtinTypes.createPrimitiveType(init.returnType)
            : null;
          return this._builtinTypes.createFunctionType(returnType);

        case 'Identifier':
          // Need to look up the identifier in the symbol table
          return {
            kind: TYPE_KIND.UNKNOWN,
            referencedName: init.name
          };

        case 'MemberExpression':
          return {
            kind: TYPE_KIND.UNKNOWN,
            memberChain: init.chain
          };

        default:
          return this._builtinTypes.createUnknownType();
      }
    }

    _createObjectTypeFromLiteral(init) {
      var shape = {};

      if (init.properties) {
        init.properties.forEach(function(prop) {
          if (prop.isMethod) {
            shape[prop.key] = {
              kind: TYPE_KIND.FUNCTION,
              name: prop.key
            };
          } else if (prop.valueType) {
            shape[prop.key] = {
              kind: TYPE_KIND.PRIMITIVE,
              name: prop.valueType
            };
          } else {
            shape[prop.key] = {
              kind: TYPE_KIND.UNKNOWN
            };
          }
        });
      }

      return this._builtinTypes.createObjectType(shape);
    }

    _inferCallReturnType(callee) {
      // Handle method chains like document.getElementById
      var parts = callee.split('.');

      if (parts.length === 1) {
        // Simple function call
        return this._builtinTypes.createUnknownType();
      }

      // Check if the last part has a known return type
      var lastMethod = parts[parts.length - 1];

      // DOM methods
      var domReturnTypes = {
        'getElementById': 'HTMLElement',
        'querySelector': 'Element',
        'querySelectorAll': 'NodeList',
        'getElementsByClassName': 'HTMLCollection',
        'getElementsByTagName': 'HTMLCollection',
        'createElement': 'HTMLElement',
        'createTextNode': 'Text',
        'createDocumentFragment': 'DocumentFragment'
      };

      if (domReturnTypes[lastMethod]) {
        return {
          kind: TYPE_KIND.OBJECT,
          name: domReturnTypes[lastMethod]
        };
      }

      // String methods
      var stringReturnTypes = {
        'split': 'Array<String>',
        'trim': 'String',
        'toUpperCase': 'String',
        'toLowerCase': 'String',
        'slice': 'String',
        'substring': 'String',
        'replace': 'String',
        'replaceAll': 'String'
      };

      if (stringReturnTypes[lastMethod]) {
        var returnTypeName = stringReturnTypes[lastMethod];
        if (returnTypeName.startsWith('Array')) {
          return this._builtinTypes.createArrayType(
            this._builtinTypes.createPrimitiveType('String')
          );
        }
        return this._builtinTypes.createPrimitiveType(returnTypeName);
      }

      // Array methods
      var arrayReturnTypes = {
        'map': 'Array',
        'filter': 'Array',
        'slice': 'Array',
        'concat': 'Array',
        'flat': 'Array',
        'flatMap': 'Array',
        'join': 'String',
        'find': 'T',
        'pop': 'T',
        'shift': 'T'
      };

      if (arrayReturnTypes[lastMethod]) {
        var arrayReturn = arrayReturnTypes[lastMethod];
        if (arrayReturn === 'Array') {
          return this._builtinTypes.createArrayType(null);
        }
        if (arrayReturn === 'String') {
          return this._builtinTypes.createPrimitiveType('String');
        }
        return this._builtinTypes.createUnknownType();
      }

      return this._builtinTypes.createUnknownType();
    }

    // ----------------------------------------
    // Scope Helpers
    // ----------------------------------------

    _findScopeForLine(line, defaultScope, scopeMap) {
      var bestScope = defaultScope;
      var smallestRange = Infinity;

      scopeMap.forEach(function(scopeId, decl) {
        if (decl.range.startLine <= line && decl.range.endLine >= line) {
          var rangeSize = decl.range.endLine - decl.range.startLine;
          if (rangeSize < smallestRange) {
            smallestRange = rangeSize;
            bestScope = scopeId;
          }
        }
      });

      return bestScope;
    }

    _findClassScope(className, scopeMap) {
      var foundScope = null;

      scopeMap.forEach(function(scopeId, decl) {
        if (decl.type === 'ClassDeclaration' && decl.name === className) {
          foundScope = scopeId;
        }
      });

      return foundScope;
    }

    // ----------------------------------------
    // Query Methods
    // ----------------------------------------

    /**
     * Get the scope at a given position
     * @param {number} line - Line number (0-based)
     * @param {number} column - Column number (0-based)
     * @returns {Object} Scope object
     */
    getScopeAtPosition(line, column) {
      return this._symbolTable.getScopeAtPosition(line, column);
    }

    /**
     * Look up a symbol by name from a position
     * @param {string} name - Symbol name
     * @param {number} line - Line number
     * @param {number} column - Column number
     * @returns {Object|null} Symbol or null
     */
    lookupSymbol(name, line, column) {
      var scope = this._symbolTable.getScopeAtPosition(line, column);
      return this._symbolTable.lookup(name, scope.id);
    }

    /**
     * Get the `this` type at a position
     * @param {number} line - Line number
     * @param {number} column - Column number
     * @returns {Object|null} Type descriptor for `this`
     */
    getThisType(line, column) {
      var scope = this._symbolTable.getScopeAtPosition(line, column);
      return this._symbolTable.lookupThis(scope.id);
    }

    /**
     * Get all visible symbols at a position
     * @param {number} line - Line number
     * @param {number} column - Column number
     * @returns {Array} Visible symbols
     */
    getVisibleSymbols(line, column) {
      var scope = this._symbolTable.getScopeAtPosition(line, column);
      return this._symbolTable.getVisibleSymbols(scope.id);
    }

    /**
     * Get class members for a class name
     * @param {string} className - Class name
     * @returns {Array} Class members
     */
    getClassMembers(className) {
      var symbol = this._symbolTable.lookup(className, this._symbolTable.getGlobalScope().id);
      if (!symbol || symbol.type.kind !== TYPE_KIND.CLASS) {
        return [];
      }

      // Find the class scope
      var members = [];
      var self = this;

      this._symbolTable._scopes.forEach(function(scope) {
        if (scope.type === 'class' && scope.className === className) {
          members = self._symbolTable.getClassMembers(scope.id);
        }
      });

      return members;
    }
  }

  // ============================================
  // Export to Namespace
  // ============================================

  CodeEditor.Analysis = CodeEditor.Analysis || {};
  CodeEditor.Analysis.ScopeAnalyzer = ScopeAnalyzer;

})(window.CodeEditor = window.CodeEditor || {});
