/**
 * @fileoverview Symbol table and scope management for type inference
 * @module analysis/SymbolTable
 */

(function(CodeEditor) {
  'use strict';

  var TYPE_KIND = CodeEditor.Analysis.TYPE_KIND;

  // ============================================
  // Symbol Class
  // ============================================

  /**
   * Represents a symbol (variable, function, class, etc.)
   */
  class Symbol {
    /**
     * @param {string} name - Symbol name
     * @param {Object} type - Type descriptor
     * @param {string} kind - Symbol kind (variable, function, class, parameter, property)
     * @param {Object} range - Source range { startLine, endLine, startCol, endCol }
     * @param {string} scopeId - Parent scope ID
     */
    constructor(name, type, kind, range, scopeId) {
      this.name = name;
      this.type = type;
      this.kind = kind;
      this.range = range;
      this.scopeId = scopeId;
      this.declarationKind = null; // 'const', 'let', 'var' for variables
    }
  }

  // ============================================
  // Scope Class
  // ============================================

  /**
   * Represents a scope (global, function, class, block)
   */
  class Scope {
    /**
     * @param {string} id - Unique scope identifier
     * @param {string} type - Scope type (global, function, class, block, method)
     * @param {string|null} parent - Parent scope ID
     * @param {Object} range - Source range { startLine, endLine }
     */
    constructor(id, type, parent, range) {
      this.id = id;
      this.type = type;
      this.parent = parent;
      this.range = range;
      this.symbols = new Map();
      this.children = [];
      this.thisType = null; // For class/method scopes
      this.className = null; // For class scopes
    }

    /**
     * Add a symbol to this scope
     * @param {Symbol} symbol - Symbol to add
     */
    addSymbol(symbol) {
      this.symbols.set(symbol.name, symbol);
    }

    /**
     * Get a symbol from this scope
     * @param {string} name - Symbol name
     * @returns {Symbol|undefined}
     */
    getSymbol(name) {
      return this.symbols.get(name);
    }

    /**
     * Check if scope has a symbol
     * @param {string} name - Symbol name
     * @returns {boolean}
     */
    hasSymbol(name) {
      return this.symbols.has(name);
    }

    /**
     * Get all symbols in this scope
     * @returns {Symbol[]}
     */
    getAllSymbols() {
      return Array.from(this.symbols.values());
    }
  }

  // ============================================
  // SymbolTable Class
  // ============================================

  /**
   * Manages symbols and scopes for a document
   */
  class SymbolTable {
    constructor() {
      this._scopes = new Map();
      this._globalScope = null;
      this._scopeCounter = 0;
      this._lineToScopes = new Map(); // line -> [scopeIds] for fast lookup

      this._initGlobalScope();
    }

    // ----------------------------------------
    // Initialization
    // ----------------------------------------

    _initGlobalScope() {
      this._globalScope = this._createScope('global', null, { startLine: 0, endLine: Infinity });
      this._addGlobalSymbols();
    }

    _addGlobalSymbols() {
      var builtinTypes = new CodeEditor.Analysis.BuiltinTypes();

      // Add global objects
      var globals = [
        'window', 'document', 'console', 'Math', 'JSON', 'Object', 'Array',
        'String', 'Number', 'Boolean', 'Date', 'RegExp', 'Promise', 'Map',
        'Set', 'Error', 'localStorage', 'sessionStorage', 'navigator', 'location'
      ];

      for (var i = 0; i < globals.length; i++) {
        var name = globals[i];
        this.addSymbol(name, {
          kind: TYPE_KIND.OBJECT,
          name: name
        }, 'variable', { startLine: 0, endLine: 0 }, this._globalScope.id);
      }

      // Add global functions
      var globalFunctions = [
        'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI',
        'decodeURI', 'encodeURIComponent', 'decodeURIComponent',
        'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
        'requestAnimationFrame', 'cancelAnimationFrame', 'fetch', 'alert',
        'confirm', 'prompt'
      ];

      for (var j = 0; j < globalFunctions.length; j++) {
        var funcName = globalFunctions[j];
        this.addSymbol(funcName, {
          kind: TYPE_KIND.FUNCTION,
          name: funcName,
          returnType: builtinTypes.createUnknownType()
        }, 'function', { startLine: 0, endLine: 0 }, this._globalScope.id);
      }
    }

    // ----------------------------------------
    // Scope Management
    // ----------------------------------------

    /**
     * Create a new scope
     * @param {string} type - Scope type
     * @param {string|null} parentId - Parent scope ID
     * @param {Object} range - Source range
     * @returns {Scope}
     */
    _createScope(type, parentId, range) {
      var id = 'scope_' + (this._scopeCounter++);
      var scope = new Scope(id, type, parentId, range);
      this._scopes.set(id, scope);

      if (parentId) {
        var parent = this._scopes.get(parentId);
        if (parent) {
          parent.children.push(id);
        }
      }

      // Index by line for fast lookup
      this._indexScopeByLines(scope);

      return scope;
    }

    _indexScopeByLines(scope) {
      for (var line = scope.range.startLine; line <= scope.range.endLine && line < 10000; line++) {
        if (!this._lineToScopes.has(line)) {
          this._lineToScopes.set(line, []);
        }
        this._lineToScopes.get(line).push(scope.id);
      }
    }

    /**
     * Create a function scope
     * @param {string} parentId - Parent scope ID
     * @param {Object} range - Source range
     * @returns {Scope}
     */
    createFunctionScope(parentId, range) {
      return this._createScope('function', parentId, range);
    }

    /**
     * Create a class scope
     * @param {string} parentId - Parent scope ID
     * @param {Object} range - Source range
     * @param {string} className - Class name
     * @returns {Scope}
     */
    createClassScope(parentId, range, className) {
      var scope = this._createScope('class', parentId, range);
      scope.className = className;
      scope.thisType = {
        kind: TYPE_KIND.CLASS,
        name: className,
        members: []
      };
      return scope;
    }

    /**
     * Create a method scope (inside a class)
     * @param {string} parentId - Parent scope ID (should be class scope)
     * @param {Object} range - Source range
     * @returns {Scope}
     */
    createMethodScope(parentId, range) {
      var scope = this._createScope('method', parentId, range);

      // Inherit thisType from parent class scope
      var parent = this._scopes.get(parentId);
      while (parent) {
        if (parent.type === 'class' && parent.thisType) {
          scope.thisType = parent.thisType;
          break;
        }
        parent = parent.parent ? this._scopes.get(parent.parent) : null;
      }

      return scope;
    }

    /**
     * Create a block scope
     * @param {string} parentId - Parent scope ID
     * @param {Object} range - Source range
     * @returns {Scope}
     */
    createBlockScope(parentId, range) {
      return this._createScope('block', parentId, range);
    }

    /**
     * Get the global scope
     * @returns {Scope}
     */
    getGlobalScope() {
      return this._globalScope;
    }

    /**
     * Get a scope by ID
     * @param {string} scopeId - Scope ID
     * @returns {Scope|undefined}
     */
    getScope(scopeId) {
      return this._scopes.get(scopeId);
    }

    /**
     * Get the innermost scope at a given position
     * @param {number} line - Line number (0-based)
     * @param {number} column - Column number (0-based)
     * @returns {Scope}
     */
    getScopeAtPosition(line, column) {
      var scopeIds = this._lineToScopes.get(line);

      if (!scopeIds || scopeIds.length === 0) {
        return this._globalScope;
      }

      // Find the innermost scope (smallest range that contains the position)
      var innermost = this._globalScope;
      var smallestSize = Infinity;

      for (var i = 0; i < scopeIds.length; i++) {
        var scope = this._scopes.get(scopeIds[i]);
        if (!scope) continue;

        var size = scope.range.endLine - scope.range.startLine;
        if (size < smallestSize) {
          smallestSize = size;
          innermost = scope;
        }
      }

      return innermost;
    }

    /**
     * Get the scope chain from a scope to global
     * @param {string} scopeId - Starting scope ID
     * @returns {Scope[]}
     */
    getScopeChain(scopeId) {
      var chain = [];
      var current = this._scopes.get(scopeId);

      while (current) {
        chain.push(current);
        current = current.parent ? this._scopes.get(current.parent) : null;
      }

      return chain;
    }

    // ----------------------------------------
    // Symbol Management
    // ----------------------------------------

    /**
     * Add a symbol to a scope
     * @param {string} name - Symbol name
     * @param {Object} type - Type descriptor
     * @param {string} kind - Symbol kind
     * @param {Object} range - Source range
     * @param {string} scopeId - Target scope ID
     * @returns {Symbol}
     */
    addSymbol(name, type, kind, range, scopeId) {
      var scope = this._scopes.get(scopeId);
      if (!scope) {
        scope = this._globalScope;
      }

      var symbol = new Symbol(name, type, kind, range, scope.id);
      scope.addSymbol(symbol);

      return symbol;
    }

    /**
     * Look up a symbol by name, walking up the scope chain
     * @param {string} name - Symbol name
     * @param {string} scopeId - Starting scope ID
     * @returns {Symbol|null}
     */
    lookup(name, scopeId) {
      var chain = this.getScopeChain(scopeId);

      for (var i = 0; i < chain.length; i++) {
        var symbol = chain[i].getSymbol(name);
        if (symbol) {
          return symbol;
        }
      }

      return null;
    }

    /**
     * Look up the `this` type in a scope
     * @param {string} scopeId - Scope ID
     * @returns {Object|null} Type descriptor for `this`
     */
    lookupThis(scopeId) {
      var chain = this.getScopeChain(scopeId);

      for (var i = 0; i < chain.length; i++) {
        if (chain[i].thisType) {
          return chain[i].thisType;
        }
      }

      return null;
    }

    /**
     * Get all symbols visible from a scope
     * @param {string} scopeId - Scope ID
     * @returns {Symbol[]}
     */
    getVisibleSymbols(scopeId) {
      var seen = new Set();
      var symbols = [];
      var chain = this.getScopeChain(scopeId);

      for (var i = 0; i < chain.length; i++) {
        var scopeSymbols = chain[i].getAllSymbols();
        for (var j = 0; j < scopeSymbols.length; j++) {
          var symbol = scopeSymbols[j];
          if (!seen.has(symbol.name)) {
            seen.add(symbol.name);
            symbols.push(symbol);
          }
        }
      }

      return symbols;
    }

    // ----------------------------------------
    // Class Member Management
    // ----------------------------------------

    /**
     * Add a member to a class
     * @param {string} classScopeId - Class scope ID
     * @param {string} name - Member name
     * @param {Object} type - Type descriptor
     * @param {string} memberKind - 'property' or 'method'
     */
    addClassMember(classScopeId, name, type, memberKind) {
      var scope = this._scopes.get(classScopeId);
      if (!scope || scope.type !== 'class') return;

      if (!scope.thisType.members) {
        scope.thisType.members = [];
      }

      // Check for existing member
      var existingIndex = -1;
      for (var i = 0; i < scope.thisType.members.length; i++) {
        if (scope.thisType.members[i].name === name) {
          existingIndex = i;
          break;
        }
      }

      var member = { name: name, type: type, kind: memberKind };

      if (existingIndex >= 0) {
        scope.thisType.members[existingIndex] = member;
      } else {
        scope.thisType.members.push(member);
      }
    }

    /**
     * Get all members of a class
     * @param {string} classScopeId - Class scope ID
     * @returns {Array}
     */
    getClassMembers(classScopeId) {
      var scope = this._scopes.get(classScopeId);
      if (!scope || scope.type !== 'class' || !scope.thisType) {
        return [];
      }

      return scope.thisType.members || [];
    }

    // ----------------------------------------
    // Cache Invalidation
    // ----------------------------------------

    /**
     * Invalidate symbols and scopes in a line range
     * @param {number} startLine - Start line (0-based)
     * @param {number} endLine - End line (0-based)
     */
    invalidateRange(startLine, endLine) {
      var scopesToRemove = [];

      // Find scopes that overlap with the range
      this._scopes.forEach(function(scope, id) {
        if (id === this._globalScope.id) return;

        // Check if scope overlaps with invalidation range
        var overlaps = !(scope.range.endLine < startLine || scope.range.startLine > endLine);

        if (overlaps) {
          scopesToRemove.push(id);
        }
      }, this);

      // Remove affected scopes
      for (var i = 0; i < scopesToRemove.length; i++) {
        this._removeScope(scopesToRemove[i]);
      }

      // Clear line index for the range
      for (var line = startLine; line <= endLine; line++) {
        this._lineToScopes.delete(line);
      }
    }

    _removeScope(scopeId) {
      var scope = this._scopes.get(scopeId);
      if (!scope) return;

      // Remove from parent's children
      if (scope.parent) {
        var parent = this._scopes.get(scope.parent);
        if (parent) {
          var idx = parent.children.indexOf(scopeId);
          if (idx >= 0) {
            parent.children.splice(idx, 1);
          }
        }
      }

      // Recursively remove children
      var children = scope.children.slice();
      for (var i = 0; i < children.length; i++) {
        this._removeScope(children[i]);
      }

      this._scopes.delete(scopeId);
    }

    /**
     * Clear all symbols and scopes (except global)
     */
    clear() {
      var globalId = this._globalScope.id;
      this._scopes.clear();
      this._lineToScopes.clear();
      this._scopeCounter = 0;

      this._initGlobalScope();
    }

    // ----------------------------------------
    // Debugging
    // ----------------------------------------

    /**
     * Get debug info about the symbol table
     * @returns {Object}
     */
    getDebugInfo() {
      var scopeCount = this._scopes.size;
      var symbolCount = 0;

      this._scopes.forEach(function(scope) {
        symbolCount += scope.symbols.size;
      });

      return {
        scopeCount: scopeCount,
        symbolCount: symbolCount,
        scopes: Array.from(this._scopes.values()).map(function(s) {
          return {
            id: s.id,
            type: s.type,
            symbols: Array.from(s.symbols.keys()),
            range: s.range
          };
        })
      };
    }
  }

  // ============================================
  // Export to Namespace
  // ============================================

  CodeEditor.Analysis = CodeEditor.Analysis || {};
  CodeEditor.Analysis.Symbol = Symbol;
  CodeEditor.Analysis.Scope = Scope;
  CodeEditor.Analysis.SymbolTable = SymbolTable;

})(window.CodeEditor = window.CodeEditor || {});
