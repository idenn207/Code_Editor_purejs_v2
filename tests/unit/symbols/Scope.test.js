/**
 * @fileoverview Unit tests for Scope and ScopeType classes
 */

describe('ScopeType', function() {
  var ScopeType = CodeEditor.ScopeType;

  describe('enum values', function() {
    it('should have GLOBAL type', function() {
      expect(ScopeType.GLOBAL).toBe('global');
    });

    it('should have FUNCTION type', function() {
      expect(ScopeType.FUNCTION).toBe('function');
    });

    it('should have BLOCK type', function() {
      expect(ScopeType.BLOCK).toBe('block');
    });

    it('should have CLASS type', function() {
      expect(ScopeType.CLASS).toBe('class');
    });

    it('should have WITH type', function() {
      expect(ScopeType.WITH).toBe('with');
    });

    it('should have CATCH type', function() {
      expect(ScopeType.CATCH).toBe('catch');
    });

    it('should have ARROW type', function() {
      expect(ScopeType.ARROW).toBe('arrow');
    });

    it('should have MODULE type', function() {
      expect(ScopeType.MODULE).toBe('module');
    });
  });

  describe('immutability', function() {
    it('should be frozen', function() {
      expect(Object.isFrozen(ScopeType)).toBe(true);
    });
  });
});

describe('Scope', function() {
  var Scope = CodeEditor.Scope;
  var ScopeType = CodeEditor.ScopeType;
  var Symbol = CodeEditor.Symbol;
  var SymbolKind = CodeEditor.SymbolKind;
  var PrimitiveType = CodeEditor.PrimitiveType;

  describe('constructor', function() {
    it('should create scope with type', function() {
      var scope = new Scope(ScopeType.BLOCK);
      expect(scope.type).toBe(ScopeType.BLOCK);
    });

    it('should default to BLOCK type', function() {
      var scope = new Scope();
      expect(scope.type).toBe(ScopeType.BLOCK);
    });

    it('should set parent scope', function() {
      var parent = new Scope(ScopeType.GLOBAL);
      var child = new Scope(ScopeType.FUNCTION, parent);
      expect(child.parent).toBe(parent);
    });

    it('should add child to parent', function() {
      var parent = new Scope(ScopeType.GLOBAL);
      var child = new Scope(ScopeType.FUNCTION, parent);
      expect(parent.children).toContain(child);
    });

    it('should initialize empty symbols map', function() {
      var scope = new Scope(ScopeType.BLOCK);
      expect(scope.symbols.size).toBe(0);
    });

    it('should set depth based on parent', function() {
      var global = new Scope(ScopeType.GLOBAL);
      expect(global.depth).toBe(0);

      var func = new Scope(ScopeType.FUNCTION, global);
      expect(func.depth).toBe(1);

      var block = new Scope(ScopeType.BLOCK, func);
      expect(block.depth).toBe(2);
    });

    it('should accept options', function() {
      var scope = new Scope(ScopeType.FUNCTION, null, {
        startOffset: 10,
        endOffset: 100
      });
      expect(scope.startOffset).toBe(10);
      expect(scope.endOffset).toBe(100);
    });

    it('should set hasThisBinding for FUNCTION', function() {
      var func = new Scope(ScopeType.FUNCTION);
      expect(func.hasThisBinding).toBe(true);
    });

    it('should set hasThisBinding for CLASS', function() {
      var cls = new Scope(ScopeType.CLASS);
      expect(cls.hasThisBinding).toBe(true);
    });

    it('should not set hasThisBinding for BLOCK', function() {
      var block = new Scope(ScopeType.BLOCK);
      expect(block.hasThisBinding).toBe(false);
    });
  });

  describe('symbol definition', function() {
    var scope;

    beforeEach(function() {
      scope = new Scope(ScopeType.BLOCK);
    });

    describe('define', function() {
      it('should add symbol to scope', function() {
        var sym = new Symbol('x', SymbolKind.VARIABLE);
        scope.define(sym);
        expect(scope.symbols.has('x')).toBe(true);
      });

      it('should return the defined symbol', function() {
        var sym = new Symbol('x', SymbolKind.VARIABLE);
        expect(scope.define(sym)).toBe(sym);
      });
    });

    describe('defineAll', function() {
      it('should define multiple symbols', function() {
        var symbols = [
          new Symbol('a', SymbolKind.VARIABLE),
          new Symbol('b', SymbolKind.VARIABLE)
        ];
        scope.defineAll(symbols);
        expect(scope.has('a')).toBe(true);
        expect(scope.has('b')).toBe(true);
      });

      it('should return this for chaining', function() {
        expect(scope.defineAll([])).toBe(scope);
      });
    });

    describe('remove', function() {
      it('should remove symbol from scope', function() {
        scope.define(new Symbol('x', SymbolKind.VARIABLE));
        expect(scope.remove('x')).toBe(true);
        expect(scope.has('x')).toBe(false);
      });

      it('should return false for non-existing symbol', function() {
        expect(scope.remove('nonExistent')).toBe(false);
      });
    });

    describe('has', function() {
      it('should return true for defined symbol', function() {
        scope.define(new Symbol('x', SymbolKind.VARIABLE));
        expect(scope.has('x')).toBe(true);
      });

      it('should return false for undefined symbol', function() {
        expect(scope.has('x')).toBe(false);
      });

      it('should not check parent scope', function() {
        var parent = new Scope(ScopeType.GLOBAL);
        parent.define(new Symbol('x', SymbolKind.VARIABLE));
        var child = new Scope(ScopeType.BLOCK, parent);
        expect(child.has('x')).toBe(false);
      });
    });

    describe('get', function() {
      it('should return symbol from this scope only', function() {
        var sym = new Symbol('x', SymbolKind.VARIABLE);
        scope.define(sym);
        expect(scope.get('x')).toBe(sym);
      });

      it('should return null for undefined symbol', function() {
        expect(scope.get('x')).toBeNull();
      });

      it('should not check parent scope', function() {
        var parent = new Scope(ScopeType.GLOBAL);
        parent.define(new Symbol('x', SymbolKind.VARIABLE));
        var child = new Scope(ScopeType.BLOCK, parent);
        expect(child.get('x')).toBeNull();
      });
    });
  });

  describe('symbol resolution', function() {
    describe('resolve', function() {
      it('should resolve symbol in current scope', function() {
        var scope = new Scope(ScopeType.BLOCK);
        var sym = new Symbol('x', SymbolKind.VARIABLE);
        scope.define(sym);
        expect(scope.resolve('x')).toBe(sym);
      });

      it('should resolve symbol in parent scope', function() {
        var parent = new Scope(ScopeType.GLOBAL);
        var sym = new Symbol('y', SymbolKind.VARIABLE);
        parent.define(sym);
        var child = new Scope(ScopeType.BLOCK, parent);
        expect(child.resolve('y')).toBe(sym);
      });

      it('should return null for undefined symbol', function() {
        var scope = new Scope(ScopeType.BLOCK);
        expect(scope.resolve('notFound')).toBeNull();
      });

      it('should shadow parent symbols', function() {
        var parent = new Scope(ScopeType.GLOBAL);
        var parentSym = new Symbol('x', SymbolKind.VARIABLE, PrimitiveType.NUMBER);
        parent.define(parentSym);

        var child = new Scope(ScopeType.BLOCK, parent);
        var childSym = new Symbol('x', SymbolKind.VARIABLE, PrimitiveType.STRING);
        child.define(childSym);

        expect(child.resolve('x')).toBe(childSym);
        expect(parent.resolve('x')).toBe(parentSym);
      });

      it('should traverse multiple levels of nesting', function() {
        var global = new Scope(ScopeType.GLOBAL);
        var sym = new Symbol('z', SymbolKind.VARIABLE);
        global.define(sym);

        var func = new Scope(ScopeType.FUNCTION, global);
        var block = new Scope(ScopeType.BLOCK, func);
        var inner = new Scope(ScopeType.BLOCK, block);

        expect(inner.resolve('z')).toBe(sym);
      });
    });

    describe('resolveWithScope', function() {
      it('should return symbol and scope', function() {
        var parent = new Scope(ScopeType.GLOBAL);
        var sym = new Symbol('x', SymbolKind.VARIABLE);
        parent.define(sym);
        var child = new Scope(ScopeType.BLOCK, parent);

        var result = child.resolveWithScope('x');
        expect(result.symbol).toBe(sym);
        expect(result.scope).toBe(parent);
      });

      it('should return null for undefined symbol', function() {
        var scope = new Scope(ScopeType.BLOCK);
        expect(scope.resolveWithScope('notFound')).toBeNull();
      });
    });

    describe('canResolve', function() {
      it('should return true for resolvable symbol', function() {
        var scope = new Scope(ScopeType.BLOCK);
        scope.define(new Symbol('x', SymbolKind.VARIABLE));
        expect(scope.canResolve('x')).toBe(true);
      });

      it('should return false for non-resolvable symbol', function() {
        var scope = new Scope(ScopeType.BLOCK);
        expect(scope.canResolve('x')).toBe(false);
      });
    });
  });

  describe('symbol enumeration', function() {
    describe('getSymbols', function() {
      it('should return all symbols in this scope', function() {
        var scope = new Scope(ScopeType.BLOCK);
        var a = new Symbol('a', SymbolKind.VARIABLE);
        var b = new Symbol('b', SymbolKind.VARIABLE);
        scope.define(a);
        scope.define(b);
        var symbols = scope.getSymbols();
        expect(symbols.length).toBe(2);
        expect(symbols).toContain(a);
        expect(symbols).toContain(b);
      });
    });

    describe('getSymbolNames', function() {
      it('should return all symbol names', function() {
        var scope = new Scope(ScopeType.BLOCK);
        scope.define(new Symbol('a', SymbolKind.VARIABLE));
        scope.define(new Symbol('b', SymbolKind.VARIABLE));
        var names = scope.getSymbolNames();
        expect(names).toContain('a');
        expect(names).toContain('b');
      });
    });

    describe('getAllVisibleSymbols', function() {
      it('should include symbols from all ancestor scopes', function() {
        var global = new Scope(ScopeType.GLOBAL);
        var func = new Scope(ScopeType.FUNCTION, global);
        var block = new Scope(ScopeType.BLOCK, func);

        var a = new Symbol('a', SymbolKind.VARIABLE);
        var b = new Symbol('b', SymbolKind.VARIABLE);
        var c = new Symbol('c', SymbolKind.VARIABLE);
        global.define(a);
        func.define(b);
        block.define(c);

        var visible = block.getAllVisibleSymbols();
        var names = visible.map(function(s) { return s.name; });

        expect(names).toContain('a');
        expect(names).toContain('b');
        expect(names).toContain('c');
      });

      it('should not include shadowed symbols', function() {
        var parent = new Scope(ScopeType.GLOBAL);
        var parentSym = new Symbol('x', SymbolKind.VARIABLE, PrimitiveType.NUMBER);
        parent.define(parentSym);

        var child = new Scope(ScopeType.BLOCK, parent);
        var childSym = new Symbol('x', SymbolKind.VARIABLE, PrimitiveType.STRING);
        child.define(childSym);

        var visible = child.getAllVisibleSymbols();
        expect(visible.length).toBe(1);
        expect(visible[0]).toBe(childSym);
      });
    });

    describe('getAllVisibleSymbolNames', function() {
      it('should return unique names from all scopes', function() {
        var parent = new Scope(ScopeType.GLOBAL);
        parent.define(new Symbol('a', SymbolKind.VARIABLE));
        parent.define(new Symbol('x', SymbolKind.VARIABLE));

        var child = new Scope(ScopeType.BLOCK, parent);
        child.define(new Symbol('b', SymbolKind.VARIABLE));
        child.define(new Symbol('x', SymbolKind.VARIABLE)); // shadow

        var names = child.getAllVisibleSymbolNames();
        expect(names).toContain('a');
        expect(names).toContain('b');
        expect(names).toContain('x');
        expect(names.length).toBe(3);
      });
    });

    describe('getSymbolsWithPrefix', function() {
      it('should return symbols matching prefix', function() {
        var scope = new Scope(ScopeType.BLOCK);
        scope.define(new Symbol('apple', SymbolKind.VARIABLE));
        scope.define(new Symbol('apricot', SymbolKind.VARIABLE));
        scope.define(new Symbol('banana', SymbolKind.VARIABLE));

        var results = scope.getSymbolsWithPrefix('ap');
        expect(results.length).toBe(2);
      });

      it('should be case-insensitive', function() {
        var scope = new Scope(ScopeType.BLOCK);
        scope.define(new Symbol('Apple', SymbolKind.VARIABLE));
        var results = scope.getSymbolsWithPrefix('ap');
        expect(results.length).toBe(1);
      });

      it('should include parent symbols by default', function() {
        var parent = new Scope(ScopeType.GLOBAL);
        parent.define(new Symbol('app1', SymbolKind.VARIABLE));
        var child = new Scope(ScopeType.BLOCK, parent);
        child.define(new Symbol('app2', SymbolKind.VARIABLE));

        var results = child.getSymbolsWithPrefix('app');
        expect(results.length).toBe(2);
      });

      it('should exclude parent symbols when includeParents is false', function() {
        var parent = new Scope(ScopeType.GLOBAL);
        parent.define(new Symbol('app1', SymbolKind.VARIABLE));
        var child = new Scope(ScopeType.BLOCK, parent);
        child.define(new Symbol('app2', SymbolKind.VARIABLE));

        var results = child.getSymbolsWithPrefix('app', false);
        expect(results.length).toBe(1);
      });
    });
  });

  describe('scope navigation', function() {
    describe('getGlobalScope', function() {
      it('should return root scope', function() {
        var global = new Scope(ScopeType.GLOBAL);
        var func = new Scope(ScopeType.FUNCTION, global);
        var block = new Scope(ScopeType.BLOCK, func);

        expect(block.getGlobalScope()).toBe(global);
        expect(func.getGlobalScope()).toBe(global);
        expect(global.getGlobalScope()).toBe(global);
      });
    });

    describe('getEnclosingFunctionScope', function() {
      it('should return nearest function scope', function() {
        var global = new Scope(ScopeType.GLOBAL);
        var func = new Scope(ScopeType.FUNCTION, global);
        var block = new Scope(ScopeType.BLOCK, func);
        var innerBlock = new Scope(ScopeType.BLOCK, block);

        expect(innerBlock.getEnclosingFunctionScope()).toBe(func);
      });

      it('should return arrow function scope', function() {
        var global = new Scope(ScopeType.GLOBAL);
        var arrow = new Scope(ScopeType.ARROW, global);
        var block = new Scope(ScopeType.BLOCK, arrow);

        expect(block.getEnclosingFunctionScope()).toBe(arrow);
      });

      it('should return null if no function scope', function() {
        var global = new Scope(ScopeType.GLOBAL);
        var block = new Scope(ScopeType.BLOCK, global);

        expect(block.getEnclosingFunctionScope()).toBeNull();
      });
    });

    describe('getEnclosingClassScope', function() {
      it('should return nearest class scope', function() {
        var global = new Scope(ScopeType.GLOBAL);
        var cls = new Scope(ScopeType.CLASS, global);
        var method = new Scope(ScopeType.FUNCTION, cls);
        var block = new Scope(ScopeType.BLOCK, method);

        expect(block.getEnclosingClassScope()).toBe(cls);
      });

      it('should return null if no class scope', function() {
        var global = new Scope(ScopeType.GLOBAL);
        var func = new Scope(ScopeType.FUNCTION, global);

        expect(func.getEnclosingClassScope()).toBeNull();
      });
    });

    describe('findScopeAtOffset', function() {
      it('should find most specific scope containing offset', function() {
        var global = new Scope(ScopeType.GLOBAL, null, { startOffset: 0, endOffset: 1000 });
        var func = new Scope(ScopeType.FUNCTION, global, { startOffset: 100, endOffset: 500 });
        var block = new Scope(ScopeType.BLOCK, func, { startOffset: 200, endOffset: 400 });

        expect(global.findScopeAtOffset(50)).toBe(global);
        expect(global.findScopeAtOffset(150)).toBe(func);
        expect(global.findScopeAtOffset(300)).toBe(block);
        expect(global.findScopeAtOffset(450)).toBe(func);
        expect(global.findScopeAtOffset(600)).toBe(global);
      });

      it('should return null if offset outside scope', function() {
        var scope = new Scope(ScopeType.BLOCK, null, { startOffset: 100, endOffset: 200 });
        expect(scope.findScopeAtOffset(50)).toBeNull();
        expect(scope.findScopeAtOffset(250)).toBeNull();
      });
    });

    describe('getScopeChain', function() {
      it('should return chain from current to global', function() {
        var global = new Scope(ScopeType.GLOBAL);
        var func = new Scope(ScopeType.FUNCTION, global);
        var block = new Scope(ScopeType.BLOCK, func);

        var chain = block.getScopeChain();
        expect(chain.length).toBe(3);
        expect(chain[0]).toBe(block);
        expect(chain[1]).toBe(func);
        expect(chain[2]).toBe(global);
      });
    });
  });

  describe('utilities', function() {
    describe('setRange', function() {
      it('should set start and end offsets', function() {
        var scope = new Scope(ScopeType.BLOCK);
        scope.setRange(10, 100);
        expect(scope.startOffset).toBe(10);
        expect(scope.endOffset).toBe(100);
      });

      it('should return this for chaining', function() {
        var scope = new Scope(ScopeType.BLOCK);
        expect(scope.setRange(10, 100)).toBe(scope);
      });
    });

    describe('toString', function() {
      it('should return descriptive string', function() {
        var scope = new Scope(ScopeType.FUNCTION);
        scope.define(new Symbol('x', SymbolKind.VARIABLE));
        var str = scope.toString();
        expect(str).toContain('Scope');
        expect(str).toContain('function');
        expect(str).toContain('x');
      });
    });

    describe('getSymbolCount', function() {
      it('should return number of symbols', function() {
        var scope = new Scope(ScopeType.BLOCK);
        expect(scope.getSymbolCount()).toBe(0);
        scope.define(new Symbol('a', SymbolKind.VARIABLE));
        expect(scope.getSymbolCount()).toBe(1);
        scope.define(new Symbol('b', SymbolKind.VARIABLE));
        expect(scope.getSymbolCount()).toBe(2);
      });
    });

    describe('isEmpty', function() {
      it('should return true for empty scope', function() {
        var scope = new Scope(ScopeType.BLOCK);
        expect(scope.isEmpty()).toBe(true);
      });

      it('should return false for non-empty scope', function() {
        var scope = new Scope(ScopeType.BLOCK);
        scope.define(new Symbol('x', SymbolKind.VARIABLE));
        expect(scope.isEmpty()).toBe(false);
      });
    });

    describe('clear', function() {
      it('should remove all symbols', function() {
        var scope = new Scope(ScopeType.BLOCK);
        scope.define(new Symbol('a', SymbolKind.VARIABLE));
        scope.define(new Symbol('b', SymbolKind.VARIABLE));
        scope.clear();
        expect(scope.isEmpty()).toBe(true);
      });
    });
  });
});
