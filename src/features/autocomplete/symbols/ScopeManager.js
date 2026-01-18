/**
 * @fileoverview Scope manager for handling scope stack during parsing
 * @module features/autocomplete/symbols/ScopeManager
 */

(function(CodeEditor) {
  'use strict';

  var Scope = CodeEditor.Scope;
  var ScopeType = CodeEditor.ScopeType;
  var Symbol = CodeEditor.Symbol;

  // ============================================
  // ScopeManager Class
  // ============================================

  /**
   * Manages scope creation, navigation, and symbol resolution
   * @class
   */
  function ScopeManager() {
    /**
     * Global (root) scope
     * @type {Scope}
     */
    this.globalScope = new Scope(ScopeType.GLOBAL, null, {
      startOffset: 0,
      endOffset: Infinity
    });

    /**
     * Current active scope
     * @type {Scope}
     */
    this.currentScope = this.globalScope;

    /**
     * Scope stack for tracking nested scopes
     * @type {Scope[]}
     */
    this._scopeStack = [this.globalScope];

    /**
     * All scopes created (for lookup by offset)
     * @type {Scope[]}
     */
    this._allScopes = [this.globalScope];
  }

  // ----------------------------------------
  // Scope Navigation
  // ----------------------------------------

  /**
   * Enter a new scope
   * @param {string} type - Scope type (from ScopeType)
   * @param {Object} [options] - Scope options
   * @returns {Scope} - The new scope
   */
  ScopeManager.prototype.enterScope = function(type, options) {
    options = options || {};

    var newScope = new Scope(type, this.currentScope, options);
    this._scopeStack.push(newScope);
    this._allScopes.push(newScope);
    this.currentScope = newScope;

    return newScope;
  };

  /**
   * Exit the current scope and return to parent
   * @returns {Scope} - The exited scope
   */
  ScopeManager.prototype.exitScope = function() {
    if (this._scopeStack.length <= 1) {
      // Don't exit global scope
      return this.globalScope;
    }

    var exitedScope = this._scopeStack.pop();
    this.currentScope = this._scopeStack[this._scopeStack.length - 1];

    return exitedScope;
  };

  /**
   * Enter a function scope
   * @param {Symbol} [functionSymbol] - Function symbol
   * @param {number} [startOffset] - Start offset
   * @returns {Scope}
   */
  ScopeManager.prototype.enterFunctionScope = function(functionSymbol, startOffset) {
    return this.enterScope(ScopeType.FUNCTION, {
      functionSymbol: functionSymbol,
      startOffset: startOffset
    });
  };

  /**
   * Enter an arrow function scope
   * @param {number} [startOffset] - Start offset
   * @returns {Scope}
   */
  ScopeManager.prototype.enterArrowScope = function(startOffset) {
    return this.enterScope(ScopeType.ARROW, {
      startOffset: startOffset
    });
  };

  /**
   * Enter a class scope
   * @param {Symbol} [classSymbol] - Class symbol
   * @param {number} [startOffset] - Start offset
   * @returns {Scope}
   */
  ScopeManager.prototype.enterClassScope = function(classSymbol, startOffset) {
    return this.enterScope(ScopeType.CLASS, {
      classSymbol: classSymbol,
      startOffset: startOffset
    });
  };

  /**
   * Enter a block scope
   * @param {number} [startOffset] - Start offset
   * @returns {Scope}
   */
  ScopeManager.prototype.enterBlockScope = function(startOffset) {
    return this.enterScope(ScopeType.BLOCK, {
      startOffset: startOffset
    });
  };

  /**
   * Enter a catch clause scope
   * @param {number} [startOffset] - Start offset
   * @returns {Scope}
   */
  ScopeManager.prototype.enterCatchScope = function(startOffset) {
    return this.enterScope(ScopeType.CATCH, {
      startOffset: startOffset
    });
  };

  // ----------------------------------------
  // Symbol Definition
  // ----------------------------------------

  /**
   * Define a symbol in the current scope
   * @param {Symbol} symbol - Symbol to define
   * @returns {Symbol} - The defined symbol
   */
  ScopeManager.prototype.define = function(symbol) {
    return this.currentScope.define(symbol);
  };

  /**
   * Define a variable in the current scope
   * @param {string} name - Variable name
   * @param {Type} type - Variable type
   * @param {string} [declarationKind] - var, let, or const
   * @returns {Symbol}
   */
  ScopeManager.prototype.defineVariable = function(name, type, declarationKind) {
    var symbol = Symbol.createVariable(name, type, declarationKind);
    return this.define(symbol);
  };

  /**
   * Define a function in the current scope
   * @param {string} name - Function name
   * @param {Type} type - Function type
   * @returns {Symbol}
   */
  ScopeManager.prototype.defineFunction = function(name, type) {
    var symbol = Symbol.createFunction(name, type);
    return this.define(symbol);
  };

  /**
   * Define a class in the current scope
   * @param {string} name - Class name
   * @param {Type} type - Class type
   * @returns {Symbol}
   */
  ScopeManager.prototype.defineClass = function(name, type) {
    var symbol = Symbol.createClass(name, type);
    return this.define(symbol);
  };

  /**
   * Define a parameter in the current scope
   * @param {string} name - Parameter name
   * @param {Type} type - Parameter type
   * @returns {Symbol}
   */
  ScopeManager.prototype.defineParameter = function(name, type) {
    var symbol = Symbol.createParameter(name, type);
    return this.define(symbol);
  };

  // ----------------------------------------
  // Symbol Resolution
  // ----------------------------------------

  /**
   * Resolve a symbol by name from current scope
   * @param {string} name - Symbol name
   * @returns {Symbol|null}
   */
  ScopeManager.prototype.resolve = function(name) {
    return this.currentScope.resolve(name);
  };

  /**
   * Check if a symbol can be resolved from current scope
   * @param {string} name - Symbol name
   * @returns {boolean}
   */
  ScopeManager.prototype.canResolve = function(name) {
    return this.currentScope.canResolve(name);
  };

  /**
   * Resolve a symbol and get its scope
   * @param {string} name - Symbol name
   * @returns {{ symbol: Symbol, scope: Scope }|null}
   */
  ScopeManager.prototype.resolveWithScope = function(name) {
    return this.currentScope.resolveWithScope(name);
  };

  // ----------------------------------------
  // Scope Lookup
  // ----------------------------------------

  /**
   * Get the scope containing a specific offset
   * @param {number} offset - Source offset
   * @returns {Scope}
   */
  ScopeManager.prototype.getScopeAtOffset = function(offset) {
    var found = this.globalScope.findScopeAtOffset(offset);
    return found || this.globalScope;
  };

  /**
   * Get all visible symbols at a specific offset
   * @param {number} offset - Source offset
   * @returns {Symbol[]}
   */
  ScopeManager.prototype.getVisibleSymbolsAtOffset = function(offset) {
    var scope = this.getScopeAtOffset(offset);
    return scope.getAllVisibleSymbols();
  };

  /**
   * Get symbols matching a prefix at a specific offset
   * @param {string} prefix - Prefix to match
   * @param {number} offset - Source offset
   * @returns {Symbol[]}
   */
  ScopeManager.prototype.getSymbolsWithPrefixAtOffset = function(prefix, offset) {
    var scope = this.getScopeAtOffset(offset);
    return scope.getSymbolsWithPrefix(prefix, true);
  };

  // ----------------------------------------
  // 'this' Context
  // ----------------------------------------

  /**
   * Get the 'this' type at current scope
   * @returns {Type}
   */
  ScopeManager.prototype.getThisType = function() {
    return this.currentScope.getThisType();
  };

  /**
   * Get the 'this' type at a specific offset
   * @param {number} offset - Source offset
   * @returns {Type}
   */
  ScopeManager.prototype.getThisTypeAtOffset = function(offset) {
    var scope = this.getScopeAtOffset(offset);
    return scope.getThisType();
  };

  // ----------------------------------------
  // Scope Queries
  // ----------------------------------------

  /**
   * Get the current scope
   * @returns {Scope}
   */
  ScopeManager.prototype.getCurrentScope = function() {
    return this.currentScope;
  };

  /**
   * Get the global scope
   * @returns {Scope}
   */
  ScopeManager.prototype.getGlobalScope = function() {
    return this.globalScope;
  };

  /**
   * Get the current scope depth
   * @returns {number}
   */
  ScopeManager.prototype.getDepth = function() {
    return this._scopeStack.length - 1;
  };

  /**
   * Check if currently in global scope
   * @returns {boolean}
   */
  ScopeManager.prototype.isInGlobalScope = function() {
    return this.currentScope === this.globalScope;
  };

  /**
   * Check if currently in a function scope
   * @returns {boolean}
   */
  ScopeManager.prototype.isInFunctionScope = function() {
    return this.currentScope.type === ScopeType.FUNCTION ||
           this.currentScope.type === ScopeType.ARROW;
  };

  /**
   * Check if currently in a class scope
   * @returns {boolean}
   */
  ScopeManager.prototype.isInClassScope = function() {
    return this.currentScope.getEnclosingClassScope() !== null;
  };

  /**
   * Get the enclosing function scope from current position
   * @returns {Scope|null}
   */
  ScopeManager.prototype.getEnclosingFunctionScope = function() {
    return this.currentScope.getEnclosingFunctionScope();
  };

  /**
   * Get the enclosing class scope from current position
   * @returns {Scope|null}
   */
  ScopeManager.prototype.getEnclosingClassScope = function() {
    return this.currentScope.getEnclosingClassScope();
  };

  // ----------------------------------------
  // Utilities
  // ----------------------------------------

  /**
   * Reset the scope manager to initial state
   */
  ScopeManager.prototype.reset = function() {
    this.globalScope = new Scope(ScopeType.GLOBAL, null, {
      startOffset: 0,
      endOffset: Infinity
    });
    this.currentScope = this.globalScope;
    this._scopeStack = [this.globalScope];
    this._allScopes = [this.globalScope];
  };

  /**
   * Get all scopes
   * @returns {Scope[]}
   */
  ScopeManager.prototype.getAllScopes = function() {
    return this._allScopes.slice();
  };

  /**
   * Get the scope stack
   * @returns {Scope[]}
   */
  ScopeManager.prototype.getScopeStack = function() {
    return this._scopeStack.slice();
  };

  /**
   * String representation
   * @returns {string}
   */
  ScopeManager.prototype.toString = function() {
    return 'ScopeManager(depth=' + this.getDepth() +
           ', current=' + this.currentScope.type +
           ', totalScopes=' + this._allScopes.length + ')';
  };

  /**
   * Print scope tree for debugging
   * @returns {string}
   */
  ScopeManager.prototype.toDebugString = function() {
    var lines = [];
    var self = this;

    function printScope(scope, indent) {
      var prefix = '  '.repeat(indent);
      var symbolStr = scope.getSymbolNames().join(', ');
      lines.push(prefix + scope.type + ' [' + symbolStr + ']');

      scope.children.forEach(function(child) {
        printScope(child, indent + 1);
      });
    }

    printScope(this.globalScope, 0);
    return lines.join('\n');
  };

  // ============================================
  // Export
  // ============================================

  CodeEditor.ScopeManager = ScopeManager;

})(window.CodeEditor = window.CodeEditor || {});
