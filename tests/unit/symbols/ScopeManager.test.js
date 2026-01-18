/**
 * @fileoverview Unit tests for ScopeManager class
 */

describe('ScopeManager', function() {
  var ScopeManager = CodeEditor.ScopeManager;
  var ScopeType = CodeEditor.ScopeType;
  var Symbol = CodeEditor.Symbol;
  var SymbolKind = CodeEditor.SymbolKind;
  var PrimitiveType = CodeEditor.PrimitiveType;
  var Type = CodeEditor.Type;

  var manager;

  beforeEach(function() {
    manager = new ScopeManager();
  });

  describe('constructor', function() {
    it('should create global scope', function() {
      expect(manager.globalScope).toBeDefined();
      expect(manager.globalScope.type).toBe(ScopeType.GLOBAL);
    });

    it('should set current scope to global', function() {
      expect(manager.currentScope).toBe(manager.globalScope);
    });

    it('should initialize scope stack with global scope', function() {
      expect(manager.getScopeStack().length).toBe(1);
      expect(manager.getScopeStack()[0]).toBe(manager.globalScope);
    });

    it('should set global scope range', function() {
      expect(manager.globalScope.startOffset).toBe(0);
      expect(manager.globalScope.endOffset).toBe(Infinity);
    });
  });

  describe('scope navigation', function() {
    describe('enterScope', function() {
      it('should create new scope', function() {
        var newScope = manager.enterScope(ScopeType.FUNCTION);
        expect(newScope.type).toBe(ScopeType.FUNCTION);
      });

      it('should set parent to current scope', function() {
        var parentScope = manager.currentScope;
        var newScope = manager.enterScope(ScopeType.FUNCTION);
        expect(newScope.parent).toBe(parentScope);
      });

      it('should update current scope', function() {
        var newScope = manager.enterScope(ScopeType.FUNCTION);
        expect(manager.currentScope).toBe(newScope);
      });

      it('should add to scope stack', function() {
        manager.enterScope(ScopeType.FUNCTION);
        expect(manager.getScopeStack().length).toBe(2);
      });

      it('should accept options', function() {
        var scope = manager.enterScope(ScopeType.FUNCTION, { startOffset: 100 });
        expect(scope.startOffset).toBe(100);
      });
    });

    describe('exitScope', function() {
      it('should return to parent scope', function() {
        manager.enterScope(ScopeType.FUNCTION);
        manager.exitScope();
        expect(manager.currentScope).toBe(manager.globalScope);
      });

      it('should return exited scope', function() {
        var entered = manager.enterScope(ScopeType.FUNCTION);
        var exited = manager.exitScope();
        expect(exited).toBe(entered);
      });

      it('should not exit global scope', function() {
        var result = manager.exitScope();
        expect(result).toBe(manager.globalScope);
        expect(manager.currentScope).toBe(manager.globalScope);
      });

      it('should update scope stack', function() {
        manager.enterScope(ScopeType.FUNCTION);
        manager.enterScope(ScopeType.BLOCK);
        expect(manager.getScopeStack().length).toBe(3);
        manager.exitScope();
        expect(manager.getScopeStack().length).toBe(2);
      });
    });

    describe('enterFunctionScope', function() {
      it('should create function scope', function() {
        var scope = manager.enterFunctionScope();
        expect(scope.type).toBe(ScopeType.FUNCTION);
      });

      it('should accept function symbol', function() {
        var funcSymbol = new Symbol('fn', SymbolKind.FUNCTION);
        var scope = manager.enterFunctionScope(funcSymbol);
        expect(scope.functionSymbol).toBe(funcSymbol);
      });

      it('should accept start offset', function() {
        var scope = manager.enterFunctionScope(null, 100);
        expect(scope.startOffset).toBe(100);
      });
    });

    describe('enterArrowScope', function() {
      it('should create arrow scope', function() {
        var scope = manager.enterArrowScope();
        expect(scope.type).toBe(ScopeType.ARROW);
      });
    });

    describe('enterClassScope', function() {
      it('should create class scope', function() {
        var scope = manager.enterClassScope();
        expect(scope.type).toBe(ScopeType.CLASS);
      });

      it('should accept class symbol', function() {
        var classSymbol = new Symbol('MyClass', SymbolKind.CLASS);
        var scope = manager.enterClassScope(classSymbol);
        expect(scope.classSymbol).toBe(classSymbol);
      });
    });

    describe('enterBlockScope', function() {
      it('should create block scope', function() {
        var scope = manager.enterBlockScope();
        expect(scope.type).toBe(ScopeType.BLOCK);
      });
    });

    describe('enterCatchScope', function() {
      it('should create catch scope', function() {
        var scope = manager.enterCatchScope();
        expect(scope.type).toBe(ScopeType.CATCH);
      });
    });
  });

  describe('symbol definition', function() {
    describe('define', function() {
      it('should define symbol in current scope', function() {
        var sym = new Symbol('x', SymbolKind.VARIABLE);
        manager.define(sym);
        expect(manager.currentScope.has('x')).toBe(true);
      });

      it('should return the defined symbol', function() {
        var sym = new Symbol('x', SymbolKind.VARIABLE);
        expect(manager.define(sym)).toBe(sym);
      });
    });

    describe('defineVariable', function() {
      it('should create and define variable symbol', function() {
        var sym = manager.defineVariable('x', PrimitiveType.NUMBER, 'let');
        expect(sym.name).toBe('x');
        expect(sym.kind).toBe(SymbolKind.VARIABLE);
        expect(sym.type).toBe(PrimitiveType.NUMBER);
        expect(manager.resolve('x')).toBe(sym);
      });
    });

    describe('defineFunction', function() {
      it('should create and define function symbol', function() {
        var sym = manager.defineFunction('fn', Type.ANY);
        expect(sym.name).toBe('fn');
        expect(sym.kind).toBe(SymbolKind.FUNCTION);
        expect(manager.resolve('fn')).toBe(sym);
      });
    });

    describe('defineClass', function() {
      it('should create and define class symbol', function() {
        var sym = manager.defineClass('MyClass', Type.ANY);
        expect(sym.name).toBe('MyClass');
        expect(sym.kind).toBe(SymbolKind.CLASS);
        expect(manager.resolve('MyClass')).toBe(sym);
      });
    });

    describe('defineParameter', function() {
      it('should create and define parameter symbol', function() {
        manager.enterFunctionScope();
        var sym = manager.defineParameter('arg', PrimitiveType.STRING);
        expect(sym.name).toBe('arg');
        expect(sym.kind).toBe(SymbolKind.PARAMETER);
        expect(manager.resolve('arg')).toBe(sym);
      });
    });
  });

  describe('symbol resolution', function() {
    describe('resolve', function() {
      it('should resolve symbol from current scope', function() {
        var sym = manager.defineVariable('x', PrimitiveType.NUMBER);
        expect(manager.resolve('x')).toBe(sym);
      });

      it('should resolve symbol from parent scope', function() {
        var sym = manager.defineVariable('x', PrimitiveType.NUMBER);
        manager.enterFunctionScope();
        manager.enterBlockScope();
        expect(manager.resolve('x')).toBe(sym);
      });

      it('should return null for undefined symbol', function() {
        expect(manager.resolve('notDefined')).toBeNull();
      });
    });

    describe('canResolve', function() {
      it('should return true for resolvable symbol', function() {
        manager.defineVariable('x', PrimitiveType.NUMBER);
        expect(manager.canResolve('x')).toBe(true);
      });

      it('should return false for non-resolvable symbol', function() {
        expect(manager.canResolve('notDefined')).toBe(false);
      });
    });

    describe('resolveWithScope', function() {
      it('should return symbol and containing scope', function() {
        var sym = manager.defineVariable('x', PrimitiveType.NUMBER);
        manager.enterFunctionScope();
        var result = manager.resolveWithScope('x');
        expect(result.symbol).toBe(sym);
        expect(result.scope).toBe(manager.globalScope);
      });
    });
  });

  describe('scope lookup', function() {
    describe('getScopeAtOffset', function() {
      it('should return scope containing offset', function() {
        manager.globalScope.setRange(0, 1000);
        var func = manager.enterFunctionScope(null, 100);
        func.endOffset = 500;
        var block = manager.enterBlockScope(200);
        block.endOffset = 400;
        manager.exitScope();
        manager.exitScope();

        expect(manager.getScopeAtOffset(50)).toBe(manager.globalScope);
        expect(manager.getScopeAtOffset(150)).toBe(func);
        expect(manager.getScopeAtOffset(300)).toBe(block);
      });

      it('should return global scope for uncontained offset', function() {
        expect(manager.getScopeAtOffset(50)).toBe(manager.globalScope);
      });
    });

    describe('getVisibleSymbolsAtOffset', function() {
      it('should return all visible symbols at offset', function() {
        manager.defineVariable('global', PrimitiveType.NUMBER);
        manager.globalScope.setRange(0, 1000);

        var func = manager.enterFunctionScope(null, 100);
        func.endOffset = 500;
        manager.defineVariable('local', PrimitiveType.STRING);
        manager.exitScope();

        var visibleInGlobal = manager.getVisibleSymbolsAtOffset(50);
        var visibleInFunc = manager.getVisibleSymbolsAtOffset(200);

        expect(visibleInGlobal.map(function(s) { return s.name; })).toContain('global');
        expect(visibleInGlobal.map(function(s) { return s.name; })).not.toContain('local');

        expect(visibleInFunc.map(function(s) { return s.name; })).toContain('global');
        expect(visibleInFunc.map(function(s) { return s.name; })).toContain('local');
      });
    });

    describe('getSymbolsWithPrefixAtOffset', function() {
      it('should return matching symbols at offset', function() {
        manager.defineVariable('apple', PrimitiveType.NUMBER);
        manager.defineVariable('apricot', PrimitiveType.NUMBER);
        manager.defineVariable('banana', PrimitiveType.NUMBER);
        manager.globalScope.setRange(0, 1000);

        var results = manager.getSymbolsWithPrefixAtOffset('ap', 50);
        expect(results.length).toBe(2);
      });
    });
  });

  describe('scope queries', function() {
    describe('getCurrentScope', function() {
      it('should return current scope', function() {
        expect(manager.getCurrentScope()).toBe(manager.globalScope);
        var func = manager.enterFunctionScope();
        expect(manager.getCurrentScope()).toBe(func);
      });
    });

    describe('getGlobalScope', function() {
      it('should return global scope', function() {
        manager.enterFunctionScope();
        manager.enterBlockScope();
        expect(manager.getGlobalScope()).toBe(manager.globalScope);
      });
    });

    describe('getDepth', function() {
      it('should return current depth', function() {
        expect(manager.getDepth()).toBe(0);
        manager.enterFunctionScope();
        expect(manager.getDepth()).toBe(1);
        manager.enterBlockScope();
        expect(manager.getDepth()).toBe(2);
        manager.exitScope();
        expect(manager.getDepth()).toBe(1);
      });
    });

    describe('isInGlobalScope', function() {
      it('should return true when in global scope', function() {
        expect(manager.isInGlobalScope()).toBe(true);
      });

      it('should return false when in nested scope', function() {
        manager.enterFunctionScope();
        expect(manager.isInGlobalScope()).toBe(false);
      });
    });

    describe('isInFunctionScope', function() {
      it('should return true in function scope', function() {
        manager.enterFunctionScope();
        expect(manager.isInFunctionScope()).toBe(true);
      });

      it('should return true in arrow function scope', function() {
        manager.enterArrowScope();
        expect(manager.isInFunctionScope()).toBe(true);
      });

      it('should return false in block scope', function() {
        manager.enterBlockScope();
        expect(manager.isInFunctionScope()).toBe(false);
      });
    });

    describe('isInClassScope', function() {
      it('should return true when in class scope', function() {
        manager.enterClassScope();
        expect(manager.isInClassScope()).toBe(true);
      });

      it('should return true when in nested scope inside class', function() {
        manager.enterClassScope();
        manager.enterFunctionScope();
        expect(manager.isInClassScope()).toBe(true);
      });

      it('should return false when not in class', function() {
        manager.enterFunctionScope();
        expect(manager.isInClassScope()).toBe(false);
      });
    });

    describe('getEnclosingFunctionScope', function() {
      it('should return enclosing function scope', function() {
        var func = manager.enterFunctionScope();
        manager.enterBlockScope();
        expect(manager.getEnclosingFunctionScope()).toBe(func);
      });

      it('should return null when not in function', function() {
        manager.enterBlockScope();
        expect(manager.getEnclosingFunctionScope()).toBeNull();
      });
    });

    describe('getEnclosingClassScope', function() {
      it('should return enclosing class scope', function() {
        var cls = manager.enterClassScope();
        manager.enterFunctionScope();
        expect(manager.getEnclosingClassScope()).toBe(cls);
      });

      it('should return null when not in class', function() {
        manager.enterFunctionScope();
        expect(manager.getEnclosingClassScope()).toBeNull();
      });
    });
  });

  describe('utilities', function() {
    describe('reset', function() {
      it('should reset to initial state', function() {
        manager.defineVariable('x', PrimitiveType.NUMBER);
        manager.enterFunctionScope();
        manager.enterBlockScope();

        manager.reset();

        expect(manager.getDepth()).toBe(0);
        expect(manager.isInGlobalScope()).toBe(true);
        expect(manager.resolve('x')).toBeNull();
        expect(manager.getAllScopes().length).toBe(1);
      });
    });

    describe('getAllScopes', function() {
      it('should return all created scopes', function() {
        manager.enterFunctionScope();
        manager.enterBlockScope();
        manager.exitScope();
        manager.exitScope();
        manager.enterClassScope();

        var scopes = manager.getAllScopes();
        expect(scopes.length).toBe(4); // global + function + block + class
      });

      it('should return a copy', function() {
        var scopes = manager.getAllScopes();
        scopes.push(null);
        expect(manager.getAllScopes().length).toBe(1);
      });
    });

    describe('getScopeStack', function() {
      it('should return current scope stack', function() {
        var func = manager.enterFunctionScope();
        var block = manager.enterBlockScope();

        var stack = manager.getScopeStack();
        expect(stack.length).toBe(3);
        expect(stack[0]).toBe(manager.globalScope);
        expect(stack[1]).toBe(func);
        expect(stack[2]).toBe(block);
      });

      it('should return a copy', function() {
        var stack = manager.getScopeStack();
        stack.push(null);
        expect(manager.getScopeStack().length).toBe(1);
      });
    });

    describe('toString', function() {
      it('should return descriptive string', function() {
        manager.enterFunctionScope();
        var str = manager.toString();
        expect(str).toContain('ScopeManager');
        expect(str).toContain('depth=1');
        expect(str).toContain('function');
      });
    });

    describe('toDebugString', function() {
      it('should return formatted tree', function() {
        manager.defineVariable('x', PrimitiveType.NUMBER);
        manager.enterFunctionScope();
        manager.defineVariable('y', PrimitiveType.STRING);
        manager.exitScope();

        var debug = manager.toDebugString();
        expect(debug).toContain('global');
        expect(debug).toContain('x');
        expect(debug).toContain('function');
        expect(debug).toContain('y');
      });
    });
  });

  describe('nested scope scenarios', function() {
    it('should handle deeply nested scopes', function() {
      manager.defineVariable('a', PrimitiveType.NUMBER);
      manager.enterFunctionScope();
      manager.defineVariable('b', PrimitiveType.NUMBER);
      manager.enterBlockScope();
      manager.defineVariable('c', PrimitiveType.NUMBER);
      manager.enterBlockScope();
      manager.defineVariable('d', PrimitiveType.NUMBER);

      expect(manager.getDepth()).toBe(3);
      expect(manager.resolve('a')).toBeDefined();
      expect(manager.resolve('b')).toBeDefined();
      expect(manager.resolve('c')).toBeDefined();
      expect(manager.resolve('d')).toBeDefined();
    });

    it('should correctly shadow variables in nested scopes', function() {
      manager.defineVariable('x', PrimitiveType.NUMBER);
      manager.enterFunctionScope();
      manager.defineVariable('x', PrimitiveType.STRING);

      expect(manager.resolve('x').type).toBe(PrimitiveType.STRING);

      manager.exitScope();
      expect(manager.resolve('x').type).toBe(PrimitiveType.NUMBER);
    });

    it('should handle multiple function scopes', function() {
      manager.defineVariable('global', PrimitiveType.NUMBER);

      manager.enterFunctionScope();
      manager.defineVariable('fn1Var', PrimitiveType.STRING);
      manager.exitScope();

      manager.enterFunctionScope();
      manager.defineVariable('fn2Var', PrimitiveType.BOOLEAN);

      expect(manager.resolve('global')).toBeDefined();
      expect(manager.resolve('fn1Var')).toBeNull();
      expect(manager.resolve('fn2Var')).toBeDefined();
    });
  });
});
