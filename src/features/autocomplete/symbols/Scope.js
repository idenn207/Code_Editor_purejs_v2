/**
 * @fileoverview Scope class for symbol resolution with parent chain
 * @module features/autocomplete/symbols/Scope
 */

(function(CodeEditor) {
  'use strict';

  var Symbol = CodeEditor.Symbol;

  // ============================================
  // ScopeType Enumeration
  // ============================================

  /**
   * Types of scopes
   * @readonly
   * @enum {string}
   */
  var ScopeType = Object.freeze({
    /**
     * Global/module scope
     */
    GLOBAL: 'global',

    /**
     * Function scope
     */
    FUNCTION: 'function',

    /**
     * Block scope (if, for, while, etc.)
     */
    BLOCK: 'block',

    /**
     * Class scope
     */
    CLASS: 'class',

    /**
     * With statement scope
     */
    WITH: 'with',

    /**
     * Catch clause scope
     */
    CATCH: 'catch',

    /**
     * Arrow function scope
     */
    ARROW: 'arrow',

    /**
     * Module scope
     */
    MODULE: 'module'
  });

  // ============================================
  // Scope Class
  // ============================================

  /**
   * Represents a lexical scope containing symbols
   * @class
   * @param {string} type - Scope type (from ScopeType)
   * @param {Scope} [parent] - Parent scope
   * @param {Object} [options] - Additional options
   */
  function Scope(type, parent, options) {
    options = options || {};

    /**
     * Scope type
     * @type {string}
     */
    this.type = type || ScopeType.BLOCK;

    /**
     * Parent scope (null for global scope)
     * @type {Scope|null}
     */
    this.parent = parent || null;

    /**
     * Symbols defined in this scope
     * @type {Map<string, Symbol>}
     */
    this.symbols = new Map();

    /**
     * Child scopes
     * @type {Scope[]}
     */
    this.children = [];

    /**
     * Start offset of this scope in source code
     * @type {number}
     */
    this.startOffset = options.startOffset || 0;

    /**
     * End offset of this scope in source code
     * @type {number}
     */
    this.endOffset = options.endOffset || 0;

    /**
     * Associated class symbol (for class scopes)
     * @type {Symbol|null}
     */
    this.classSymbol = options.classSymbol || null;

    /**
     * Associated function symbol (for function scopes)
     * @type {Symbol|null}
     */
    this.functionSymbol = options.functionSymbol || null;

    /**
     * Whether this scope creates a new 'this' binding
     * @type {boolean}
     */
    this.hasThisBinding = type === ScopeType.FUNCTION || type === ScopeType.CLASS;

    /**
     * Depth level (0 for global)
     * @type {number}
     */
    this.depth = parent ? parent.depth + 1 : 0;

    // Add to parent's children
    if (parent) {
      parent.children.push(this);
    }
  }

  // ----------------------------------------
  // Symbol Definition
  // ----------------------------------------

  /**
   * Define a symbol in this scope
   * @param {Symbol} symbol - Symbol to define
   * @returns {Symbol} - The defined symbol
   */
  Scope.prototype.define = function(symbol) {
    this.symbols.set(symbol.name, symbol);
    return symbol;
  };

  /**
   * Define multiple symbols
   * @param {Symbol[]} symbols - Symbols to define
   * @returns {Scope} - this for chaining
   */
  Scope.prototype.defineAll = function(symbols) {
    var self = this;
    symbols.forEach(function(symbol) {
      self.define(symbol);
    });
    return this;
  };

  /**
   * Remove a symbol from this scope
   * @param {string} name - Symbol name
   * @returns {boolean} - true if symbol existed
   */
  Scope.prototype.remove = function(name) {
    return this.symbols.delete(name);
  };

  /**
   * Check if a symbol is defined in this scope (not parent scopes)
   * @param {string} name - Symbol name
   * @returns {boolean}
   */
  Scope.prototype.has = function(name) {
    return this.symbols.has(name);
  };

  /**
   * Get a symbol from this scope only (not parent scopes)
   * @param {string} name - Symbol name
   * @returns {Symbol|null}
   */
  Scope.prototype.get = function(name) {
    return this.symbols.get(name) || null;
  };

  // ----------------------------------------
  // Symbol Resolution
  // ----------------------------------------

  /**
   * Resolve a symbol by name, searching up the scope chain
   * @param {string} name - Symbol name
   * @returns {Symbol|null}
   */
  Scope.prototype.resolve = function(name) {
    // Check this scope
    if (this.symbols.has(name)) {
      return this.symbols.get(name);
    }

    // Check parent scope
    if (this.parent) {
      return this.parent.resolve(name);
    }

    return null;
  };

  /**
   * Resolve a symbol and return the scope it was found in
   * @param {string} name - Symbol name
   * @returns {{ symbol: Symbol, scope: Scope }|null}
   */
  Scope.prototype.resolveWithScope = function(name) {
    // Check this scope
    if (this.symbols.has(name)) {
      return {
        symbol: this.symbols.get(name),
        scope: this
      };
    }

    // Check parent scope
    if (this.parent) {
      return this.parent.resolveWithScope(name);
    }

    return null;
  };

  /**
   * Check if a symbol can be resolved from this scope
   * @param {string} name - Symbol name
   * @returns {boolean}
   */
  Scope.prototype.canResolve = function(name) {
    return this.resolve(name) !== null;
  };

  // ----------------------------------------
  // Symbol Enumeration
  // ----------------------------------------

  /**
   * Get all symbols defined in this scope
   * @returns {Symbol[]}
   */
  Scope.prototype.getSymbols = function() {
    return Array.from(this.symbols.values());
  };

  /**
   * Get all symbol names defined in this scope
   * @returns {string[]}
   */
  Scope.prototype.getSymbolNames = function() {
    return Array.from(this.symbols.keys());
  };

  /**
   * Get all visible symbols (this scope + all parent scopes)
   * @returns {Symbol[]}
   */
  Scope.prototype.getAllVisibleSymbols = function() {
    var visible = new Map();

    // Collect from this scope up to global
    var current = this;
    while (current) {
      for (var entry of current.symbols) {
        var name = entry[0];
        var symbol = entry[1];
        // Don't overwrite - closer scopes take precedence
        if (!visible.has(name)) {
          visible.set(name, symbol);
        }
      }
      current = current.parent;
    }

    return Array.from(visible.values());
  };

  /**
   * Get all visible symbol names
   * @returns {string[]}
   */
  Scope.prototype.getAllVisibleSymbolNames = function() {
    var names = new Set();

    var current = this;
    while (current) {
      for (var name of current.symbols.keys()) {
        names.add(name);
      }
      current = current.parent;
    }

    return Array.from(names);
  };

  /**
   * Get symbols matching a prefix
   * @param {string} prefix - Prefix to match
   * @param {boolean} [includeParents=true] - Whether to search parent scopes
   * @returns {Symbol[]}
   */
  Scope.prototype.getSymbolsWithPrefix = function(prefix, includeParents) {
    if (includeParents === undefined) includeParents = true;

    var results = [];
    var seen = new Set();
    var lowerPrefix = prefix.toLowerCase();

    var current = this;
    while (current) {
      for (var entry of current.symbols) {
        var name = entry[0];
        var symbol = entry[1];

        if (!seen.has(name) && name.toLowerCase().startsWith(lowerPrefix)) {
          results.push(symbol);
          seen.add(name);
        }
      }

      if (!includeParents) break;
      current = current.parent;
    }

    return results;
  };

  // ----------------------------------------
  // Scope Navigation
  // ----------------------------------------

  /**
   * Get the global (root) scope
   * @returns {Scope}
   */
  Scope.prototype.getGlobalScope = function() {
    var current = this;
    while (current.parent) {
      current = current.parent;
    }
    return current;
  };

  /**
   * Get the enclosing function scope
   * @returns {Scope|null}
   */
  Scope.prototype.getEnclosingFunctionScope = function() {
    var current = this;
    while (current) {
      if (current.type === ScopeType.FUNCTION || current.type === ScopeType.ARROW) {
        return current;
      }
      current = current.parent;
    }
    return null;
  };

  /**
   * Get the enclosing class scope
   * @returns {Scope|null}
   */
  Scope.prototype.getEnclosingClassScope = function() {
    var current = this;
    while (current) {
      if (current.type === ScopeType.CLASS) {
        return current;
      }
      current = current.parent;
    }
    return null;
  };

  /**
   * Find a child scope containing the given offset
   * @param {number} offset - Source offset
   * @returns {Scope|null}
   */
  Scope.prototype.findScopeAtOffset = function(offset) {
    // Check if offset is within this scope
    if (offset < this.startOffset || offset > this.endOffset) {
      return null;
    }

    // Check children (more specific scopes)
    for (var i = 0; i < this.children.length; i++) {
      var child = this.children[i];
      var found = child.findScopeAtOffset(offset);
      if (found) {
        return found;
      }
    }

    // No child contains it, this is the most specific scope
    return this;
  };

  /**
   * Get the scope chain from this scope to global
   * @returns {Scope[]}
   */
  Scope.prototype.getScopeChain = function() {
    var chain = [];
    var current = this;

    while (current) {
      chain.push(current);
      current = current.parent;
    }

    return chain;
  };

  // ----------------------------------------
  // 'this' Context
  // ----------------------------------------

  /**
   * Get the 'this' type for this scope
   * @returns {Type|null}
   */
  Scope.prototype.getThisType = function() {
    var current = this;

    while (current) {
      // Arrow functions don't have their own 'this'
      if (current.type === ScopeType.ARROW) {
        current = current.parent;
        continue;
      }

      // Class scope - 'this' is instance type
      if (current.type === ScopeType.CLASS && current.classSymbol) {
        var classType = current.classSymbol.type;
        if (classType && classType.createInstance) {
          return classType.createInstance();
        }
      }

      // Function inside a class method
      if (current.type === ScopeType.FUNCTION) {
        var classScope = current.getEnclosingClassScope();
        if (classScope && classScope.classSymbol) {
          var cType = classScope.classSymbol.type;
          if (cType && cType.createInstance) {
            return cType.createInstance();
          }
        }
        // Non-class function - 'this' is any
        return CodeEditor.Type.ANY;
      }

      current = current.parent;
    }

    // Global 'this' is any (or window in browser)
    return CodeEditor.Type.ANY;
  };

  // ----------------------------------------
  // Utilities
  // ----------------------------------------

  /**
   * Set the range of this scope
   * @param {number} start - Start offset
   * @param {number} end - End offset
   * @returns {Scope} - this for chaining
   */
  Scope.prototype.setRange = function(start, end) {
    this.startOffset = start;
    this.endOffset = end;
    return this;
  };

  /**
   * String representation
   * @returns {string}
   */
  Scope.prototype.toString = function() {
    var symbolNames = this.getSymbolNames().join(', ');
    return 'Scope(' + this.type + ', depth=' + this.depth + ', symbols=[' + symbolNames + '])';
  };

  /**
   * Get symbol count in this scope
   * @returns {number}
   */
  Scope.prototype.getSymbolCount = function() {
    return this.symbols.size;
  };

  /**
   * Check if this scope is empty
   * @returns {boolean}
   */
  Scope.prototype.isEmpty = function() {
    return this.symbols.size === 0;
  };

  /**
   * Clear all symbols from this scope
   */
  Scope.prototype.clear = function() {
    this.symbols.clear();
  };

  // ============================================
  // Export
  // ============================================

  CodeEditor.ScopeType = ScopeType;
  CodeEditor.Scope = Scope;

})(window.CodeEditor = window.CodeEditor || {});
