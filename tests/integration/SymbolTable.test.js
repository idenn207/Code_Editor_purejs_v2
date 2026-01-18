/**
 * @fileoverview Integration tests for Symbol Table
 * Tests interactions between Symbol, Scope, and ScopeManager
 */

describe('SymbolTable Integration', function() {
  var SymbolKind = CodeEditor.SymbolKind;
  var Symbol = CodeEditor.Symbol;
  var Scope = CodeEditor.Scope;
  var ScopeType = CodeEditor.ScopeType;
  var ScopeManager = CodeEditor.ScopeManager;
  var Type = CodeEditor.Type;
  var PrimitiveType = CodeEditor.PrimitiveType;
  var FunctionType = CodeEditor.FunctionType;
  var ClassType = CodeEditor.ClassType;

  describe('Symbol with Type integration', function() {
    it('should create variable symbol with primitive type', function() {
      var symbol = Symbol.createVariable('count', PrimitiveType.NUMBER, 'let');

      expect(symbol.name).toBe('count');
      expect(symbol.kind).toBe(SymbolKind.VARIABLE);
      expect(symbol.type).toBe(PrimitiveType.NUMBER);
      expect(symbol.getTypeString()).toBe('number');
    });

    it('should create function symbol with FunctionType', function() {
      var fnType = new FunctionType([
        { name: 'a', type: PrimitiveType.NUMBER },
        { name: 'b', type: PrimitiveType.NUMBER }
      ], PrimitiveType.NUMBER);

      var symbol = Symbol.createFunction('add', fnType);

      expect(symbol.name).toBe('add');
      expect(symbol.kind).toBe(SymbolKind.FUNCTION);
      expect(symbol.isCallable()).toBe(true);
      expect(symbol.type.getParamCount()).toBe(2);
    });

    it('should create class symbol with ClassType', function() {
      var classType = new ClassType('User');
      classType.setInstanceMember('name', PrimitiveType.STRING);
      classType.setInstanceMember('email', PrimitiveType.STRING);

      var symbol = Symbol.createClass('User', classType);

      expect(symbol.name).toBe('User');
      expect(symbol.kind).toBe(SymbolKind.CLASS);
      expect(symbol.isTypeDefinition()).toBe(true);
      expect(symbol.canHaveMembers()).toBe(true);
    });

    it('should handle symbol members for class', function() {
      var classSymbol = new Symbol('MyClass', SymbolKind.CLASS, new ClassType('MyClass'));

      var method1 = Symbol.createMethod('doSomething', new FunctionType([], Type.VOID));
      var prop1 = Symbol.createProperty('value', PrimitiveType.NUMBER);

      classSymbol.addMember(method1);
      classSymbol.addMember(prop1);

      expect(classSymbol.hasMember('doSomething')).toBe(true);
      expect(classSymbol.hasMember('value')).toBe(true);
      expect(classSymbol.getMember('doSomething').isCallable()).toBe(true);
      expect(classSymbol.getMember('value').kind).toBe(SymbolKind.PROPERTY);
    });
  });

  describe('Scope with Symbol management', function() {
    var scope;

    beforeEach(function() {
      scope = new Scope(ScopeType.FUNCTION);
    });

    it('should define and retrieve symbols', function() {
      var x = Symbol.createVariable('x', PrimitiveType.NUMBER, 'let');
      var y = Symbol.createVariable('y', PrimitiveType.STRING, 'const');

      scope.define(x);
      scope.define(y);

      expect(scope.has('x')).toBe(true);
      expect(scope.has('y')).toBe(true);
      expect(scope.get('x').type).toBe(PrimitiveType.NUMBER);
      expect(scope.get('y').type).toBe(PrimitiveType.STRING);
    });

    it('should define multiple symbols at once', function() {
      var symbols = [
        Symbol.createVariable('a', PrimitiveType.NUMBER),
        Symbol.createVariable('b', PrimitiveType.STRING),
        Symbol.createVariable('c', PrimitiveType.BOOLEAN)
      ];

      scope.defineAll(symbols);

      expect(scope.getSymbolCount()).toBe(3);
      expect(scope.getSymbolNames()).toContain('a');
      expect(scope.getSymbolNames()).toContain('b');
      expect(scope.getSymbolNames()).toContain('c');
    });

    it('should find symbols with prefix', function() {
      scope.define(Symbol.createVariable('userName', PrimitiveType.STRING));
      scope.define(Symbol.createVariable('userId', PrimitiveType.NUMBER));
      scope.define(Symbol.createVariable('email', PrimitiveType.STRING));

      var userSymbols = scope.getSymbolsWithPrefix('user', false);

      expect(userSymbols.length).toBe(2);
      expect(userSymbols.some(function(s) { return s.name === 'userName'; })).toBe(true);
      expect(userSymbols.some(function(s) { return s.name === 'userId'; })).toBe(true);
    });
  });

  describe('Nested scopes with symbol resolution', function() {
    var globalScope;
    var functionScope;
    var blockScope;

    beforeEach(function() {
      globalScope = new Scope(ScopeType.GLOBAL);
      globalScope.define(Symbol.createVariable('globalVar', PrimitiveType.STRING, 'var'));

      functionScope = new Scope(ScopeType.FUNCTION, globalScope);
      functionScope.define(Symbol.createVariable('localVar', PrimitiveType.NUMBER, 'let'));

      blockScope = new Scope(ScopeType.BLOCK, functionScope);
      blockScope.define(Symbol.createVariable('blockVar', PrimitiveType.BOOLEAN, 'const'));
    });

    it('should resolve symbol in current scope', function() {
      expect(blockScope.resolve('blockVar').type).toBe(PrimitiveType.BOOLEAN);
    });

    it('should resolve symbol from parent scope', function() {
      expect(blockScope.resolve('localVar').type).toBe(PrimitiveType.NUMBER);
      expect(blockScope.resolve('globalVar').type).toBe(PrimitiveType.STRING);
    });

    it('should return null for undefined symbol', function() {
      expect(blockScope.resolve('nonExistent')).toBeNull();
    });

    it('should resolve with scope information', function() {
      var result = blockScope.resolveWithScope('globalVar');

      expect(result).not.toBeNull();
      expect(result.symbol.name).toBe('globalVar');
      expect(result.scope).toBe(globalScope);
    });

    it('should shadow parent scope symbols', function() {
      // Define same-named variable in block scope
      blockScope.define(Symbol.createVariable('localVar', PrimitiveType.STRING, 'let'));

      // Should resolve to block scope version
      expect(blockScope.resolve('localVar').type).toBe(PrimitiveType.STRING);

      // Function scope should still have original
      expect(functionScope.resolve('localVar').type).toBe(PrimitiveType.NUMBER);
    });

    it('should get all visible symbols', function() {
      var visible = blockScope.getAllVisibleSymbols();

      expect(visible.length).toBe(3);
      expect(visible.some(function(s) { return s.name === 'blockVar'; })).toBe(true);
      expect(visible.some(function(s) { return s.name === 'localVar'; })).toBe(true);
      expect(visible.some(function(s) { return s.name === 'globalVar'; })).toBe(true);
    });

    it('should get scope chain', function() {
      var chain = blockScope.getScopeChain();

      expect(chain.length).toBe(3);
      expect(chain[0]).toBe(blockScope);
      expect(chain[1]).toBe(functionScope);
      expect(chain[2]).toBe(globalScope);
    });
  });

  describe('ScopeManager workflow', function() {
    var manager;

    beforeEach(function() {
      manager = new ScopeManager();
    });

    it('should start with global scope', function() {
      expect(manager.isInGlobalScope()).toBe(true);
      expect(manager.getDepth()).toBe(0);
    });

    it('should define symbol in current scope', function() {
      manager.defineVariable('x', PrimitiveType.NUMBER, 'let');

      expect(manager.resolve('x')).not.toBeNull();
      expect(manager.resolve('x').type).toBe(PrimitiveType.NUMBER);
    });

    it('should enter and exit function scope', function() {
      var fnType = new FunctionType([
        { name: 'param', type: PrimitiveType.STRING }
      ], Type.VOID);
      var fnSymbol = Symbol.createFunction('myFunction', fnType);

      manager.enterFunctionScope(fnSymbol);
      manager.defineParameter('param', PrimitiveType.STRING);
      manager.defineVariable('local', PrimitiveType.NUMBER, 'let');

      expect(manager.getDepth()).toBe(1);
      expect(manager.isInFunctionScope()).toBe(true);
      expect(manager.resolve('param')).not.toBeNull();
      expect(manager.resolve('local')).not.toBeNull();

      manager.exitScope();

      expect(manager.getDepth()).toBe(0);
      expect(manager.isInGlobalScope()).toBe(true);
      expect(manager.resolve('param')).toBeNull();
      expect(manager.resolve('local')).toBeNull();
    });

    it('should handle nested scopes', function() {
      manager.defineVariable('global', PrimitiveType.STRING);

      manager.enterFunctionScope();
      manager.defineVariable('outer', PrimitiveType.NUMBER);

      manager.enterBlockScope();
      manager.defineVariable('inner', PrimitiveType.BOOLEAN);

      expect(manager.getDepth()).toBe(2);

      // Can resolve all
      expect(manager.resolve('inner')).not.toBeNull();
      expect(manager.resolve('outer')).not.toBeNull();
      expect(manager.resolve('global')).not.toBeNull();

      manager.exitScope(); // Exit block

      expect(manager.resolve('inner')).toBeNull();
      expect(manager.resolve('outer')).not.toBeNull();

      manager.exitScope(); // Exit function

      expect(manager.resolve('outer')).toBeNull();
      expect(manager.resolve('global')).not.toBeNull();
    });

    it('should enter class scope', function() {
      var classType = new ClassType('Person');
      var classSymbol = Symbol.createClass('Person', classType);

      manager.enterClassScope(classSymbol);

      expect(manager.isInClassScope()).toBe(true);
      expect(manager.getCurrentScope().classSymbol).toBe(classSymbol);

      manager.exitScope();

      expect(manager.isInClassScope()).toBe(false);
    });

    it('should reset to initial state', function() {
      manager.defineVariable('x', PrimitiveType.NUMBER);
      manager.enterFunctionScope();
      manager.defineVariable('y', PrimitiveType.STRING);

      manager.reset();

      expect(manager.isInGlobalScope()).toBe(true);
      expect(manager.getDepth()).toBe(0);
      expect(manager.resolve('x')).toBeNull();
      expect(manager.resolve('y')).toBeNull();
    });
  });

  describe('Scope offset-based lookup', function() {
    var manager;

    beforeEach(function() {
      manager = new ScopeManager();

      // Simulate parsing: function foo() { let x = 1; { let y = 2; } }
      manager.globalScope.setRange(0, 100);

      manager.enterFunctionScope(null, 10);
      manager.getCurrentScope().setRange(10, 50);
      manager.defineVariable('x', PrimitiveType.NUMBER);

      manager.enterBlockScope(25);
      manager.getCurrentScope().setRange(25, 40);
      manager.defineVariable('y', PrimitiveType.NUMBER);

      manager.exitScope();
      manager.exitScope();
    });

    it('should find scope at offset', function() {
      var scopeAt30 = manager.getScopeAtOffset(30);
      expect(scopeAt30.type).toBe(ScopeType.BLOCK);

      var scopeAt15 = manager.getScopeAtOffset(15);
      expect(scopeAt15.type).toBe(ScopeType.FUNCTION);

      var scopeAt5 = manager.getScopeAtOffset(5);
      expect(scopeAt5.type).toBe(ScopeType.GLOBAL);
    });

    it('should get visible symbols at offset', function() {
      var symbolsAt30 = manager.getVisibleSymbolsAtOffset(30);
      expect(symbolsAt30.length).toBe(2);
      expect(symbolsAt30.some(function(s) { return s.name === 'x'; })).toBe(true);
      expect(symbolsAt30.some(function(s) { return s.name === 'y'; })).toBe(true);

      var symbolsAt15 = manager.getVisibleSymbolsAtOffset(15);
      expect(symbolsAt15.length).toBe(1);
      expect(symbolsAt15[0].name).toBe('x');
    });

    it('should get symbols with prefix at offset', function() {
      // Add more symbols
      manager.globalScope.define(Symbol.createVariable('xValue', PrimitiveType.NUMBER));
      manager.globalScope.define(Symbol.createVariable('yValue', PrimitiveType.STRING));

      var xSymbols = manager.getSymbolsWithPrefixAtOffset('x', 30);
      expect(xSymbols.some(function(s) { return s.name === 'x'; })).toBe(true);
      expect(xSymbols.some(function(s) { return s.name === 'xValue'; })).toBe(true);
    });
  });

  describe('Symbol reference tracking', function() {
    it('should track symbol references', function() {
      var symbol = Symbol.createVariable('counter', PrimitiveType.NUMBER);

      expect(symbol.references).toBe(0);

      symbol.addReference();
      symbol.addReference();
      symbol.addReference();

      expect(symbol.references).toBe(3);
    });

    it('should clone symbol with correct properties', function() {
      var original = new Symbol('myVar', SymbolKind.VARIABLE, PrimitiveType.STRING, {
        isReadOnly: true,
        documentation: 'A string variable'
      });
      original.addReference();
      original.addReference();

      var cloned = original.clone();

      expect(cloned.name).toBe('myVar');
      expect(cloned.kind).toBe(SymbolKind.VARIABLE);
      expect(cloned.type).toBe(PrimitiveType.STRING);
      expect(cloned.isReadOnly).toBe(true);
      expect(cloned.documentation).toBe('A string variable');
      expect(cloned).not.toBe(original);
    });
  });

  describe('Symbol completion items', function() {
    it('should generate completion item from variable symbol', function() {
      var symbol = Symbol.createVariable('userName', PrimitiveType.STRING, 'const');
      var item = symbol.toCompletionItem();

      expect(item.label).toBe('userName');
      expect(item.kind).toBe('constant');
      expect(item.detail).toBe('string');
      expect(item.insertText).toBe('userName');
      expect(item.isReadOnly).toBe(true);
    });

    it('should generate completion item from function symbol', function() {
      var fnType = new FunctionType([
        { name: 'x', type: PrimitiveType.NUMBER }
      ], PrimitiveType.STRING);
      var symbol = Symbol.createFunction('transform', fnType);
      var item = symbol.toCompletionItem();

      expect(item.label).toBe('transform');
      expect(item.kind).toBe('function');
      expect(item.detail).toBe('(x: number) => string');
    });

    it('should generate completion item from class symbol', function() {
      var classType = new ClassType('MyComponent');
      var symbol = Symbol.createClass('MyComponent', classType);
      var item = symbol.toCompletionItem();

      expect(item.label).toBe('MyComponent');
      expect(item.kind).toBe('class');
    });
  });

  describe('Debug output', function() {
    it('should generate debug string for scope manager', function() {
      var manager = new ScopeManager();
      manager.defineVariable('x', PrimitiveType.NUMBER);

      manager.enterFunctionScope();
      manager.defineVariable('y', PrimitiveType.STRING);
      manager.defineParameter('param', Type.ANY);

      var debugStr = manager.toDebugString();

      expect(debugStr).toContain('global');
      expect(debugStr).toContain('function');
      expect(debugStr).toContain('x');
      expect(debugStr).toContain('y');
      expect(debugStr).toContain('param');
    });

    it('should generate toString for symbols', function() {
      var varSymbol = Symbol.createVariable('count', PrimitiveType.NUMBER);
      expect(varSymbol.toString()).toContain('variable');
      expect(varSymbol.toString()).toContain('count');

      var fnSymbol = Symbol.createFunction('process', new FunctionType([], Type.VOID));
      expect(fnSymbol.toString()).toContain('function');
      expect(fnSymbol.toString()).toContain('process');
    });
  });
});
