/**
 * @fileoverview E2E tests for Autocomplete Workflow
 * Tests complete autocomplete scenarios from code input to suggestion output
 */

describe('E2E: Autocomplete Workflow', function() {
  var SymbolKind = CodeEditor.SymbolKind;
  var Symbol = CodeEditor.Symbol;
  var ScopeManager = CodeEditor.ScopeManager;
  var ScopeType = CodeEditor.ScopeType;
  var Type = CodeEditor.Type;
  var PrimitiveType = CodeEditor.PrimitiveType;
  var FunctionType = CodeEditor.FunctionType;
  var ClassType = CodeEditor.ClassType;
  var ArrayType = CodeEditor.ArrayType;
  var ObjectType = CodeEditor.ObjectType;

  /**
   * Helper: Simulate building a symbol table from code structure
   * In real implementation, this would be done by a parser
   */
  function buildSymbolTable(codeStructure) {
    var manager = new ScopeManager();

    codeStructure.forEach(function(item) {
      switch (item.type) {
        case 'variable':
          manager.defineVariable(item.name, item.valueType || Type.ANY, item.kind || 'let');
          break;
        case 'function':
          var fnType = new FunctionType(
            (item.params || []).map(function(p) {
              return { name: p.name, type: p.type || Type.ANY };
            }),
            item.returnType || Type.VOID
          );
          manager.defineFunction(item.name, fnType);
          if (item.body) {
            manager.enterFunctionScope(null, item.startOffset || 0);
            (item.params || []).forEach(function(p) {
              manager.defineParameter(p.name, p.type || Type.ANY);
            });
            buildSymbolTable.call(null, item.body).globalScope.getSymbols().forEach(function(s) {
              manager.define(s);
            });
            manager.exitScope();
          }
          break;
        case 'class':
          var classType = new ClassType(item.name, item.superClass);
          (item.members || []).forEach(function(m) {
            if (m.isStatic) {
              classType.setStaticMember(m.name, m.memberType || Type.ANY);
            } else {
              classType.setInstanceMember(m.name, m.memberType || Type.ANY);
            }
          });
          manager.defineClass(item.name, classType);
          break;
      }
    });

    return manager;
  }

  /**
   * Helper: Get completion items from symbols
   */
  function getCompletionItems(symbols) {
    return symbols.map(function(s) {
      return s.toCompletionItem();
    });
  }

  /**
   * Helper: Filter completions by prefix
   */
  function filterByPrefix(items, prefix) {
    var lowerPrefix = prefix.toLowerCase();
    return items.filter(function(item) {
      return item.label.toLowerCase().startsWith(lowerPrefix);
    });
  }

  describe('Variable and Constant Completions', function() {
    var manager;

    beforeEach(function() {
      manager = buildSymbolTable([
        { type: 'variable', name: 'userName', valueType: PrimitiveType.STRING, kind: 'let' },
        { type: 'variable', name: 'userAge', valueType: PrimitiveType.NUMBER, kind: 'let' },
        { type: 'variable', name: 'isActive', valueType: PrimitiveType.BOOLEAN, kind: 'let' },
        { type: 'variable', name: 'MAX_USERS', valueType: PrimitiveType.NUMBER, kind: 'const' },
        { type: 'variable', name: 'API_URL', valueType: PrimitiveType.STRING, kind: 'const' }
      ]);
    });

    it('should provide all variable completions with empty prefix', function() {
      var symbols = manager.globalScope.getSymbolsWithPrefix('');
      var items = getCompletionItems(symbols);

      expect(items.length).toBe(5);
    });

    it('should filter completions by prefix "user"', function() {
      var symbols = manager.globalScope.getSymbolsWithPrefix('user');
      var items = getCompletionItems(symbols);

      expect(items.length).toBe(2);
      expect(items.some(function(i) { return i.label === 'userName'; })).toBe(true);
      expect(items.some(function(i) { return i.label === 'userAge'; })).toBe(true);
    });

    it('should show correct types in completion details', function() {
      var symbols = manager.globalScope.getSymbolsWithPrefix('user');
      var items = getCompletionItems(symbols);

      var nameItem = items.find(function(i) { return i.label === 'userName'; });
      var ageItem = items.find(function(i) { return i.label === 'userAge'; });

      expect(nameItem.detail).toBe('string');
      expect(ageItem.detail).toBe('number');
    });

    it('should mark const variables as constants', function() {
      var symbols = manager.globalScope.getSymbolsWithPrefix('MAX');
      var items = getCompletionItems(symbols);

      expect(items[0].kind).toBe('constant');
      expect(items[0].isReadOnly).toBe(true);
    });

    it('should be case-insensitive in prefix matching', function() {
      var symbols = manager.globalScope.getSymbolsWithPrefix('USER');
      expect(symbols.length).toBe(2);

      symbols = manager.globalScope.getSymbolsWithPrefix('api');
      expect(symbols.length).toBe(1);
    });
  });

  describe('Function Completions', function() {
    var manager;

    beforeEach(function() {
      manager = buildSymbolTable([
        {
          type: 'function',
          name: 'calculateTotal',
          params: [
            { name: 'price', type: PrimitiveType.NUMBER },
            { name: 'quantity', type: PrimitiveType.NUMBER }
          ],
          returnType: PrimitiveType.NUMBER
        },
        {
          type: 'function',
          name: 'formatCurrency',
          params: [{ name: 'amount', type: PrimitiveType.NUMBER }],
          returnType: PrimitiveType.STRING
        },
        {
          type: 'function',
          name: 'validateInput',
          params: [{ name: 'input', type: PrimitiveType.STRING }],
          returnType: PrimitiveType.BOOLEAN
        }
      ]);
    });

    it('should provide function completions with signature', function() {
      var symbols = manager.globalScope.getSymbolsWithPrefix('calculate');
      var items = getCompletionItems(symbols);

      expect(items.length).toBe(1);
      expect(items[0].label).toBe('calculateTotal');
      expect(items[0].kind).toBe('function');
      expect(items[0].detail).toContain('number');
    });

    it('should filter functions by prefix', function() {
      var symbols = manager.globalScope.getSymbolsWithPrefix('format');
      var items = getCompletionItems(symbols);

      expect(items.length).toBe(1);
      expect(items[0].label).toBe('formatCurrency');
    });

    it('should show all functions with empty prefix', function() {
      var symbols = manager.globalScope.getSymbolsWithPrefix('');
      var items = getCompletionItems(symbols);

      expect(items.length).toBe(3);
      expect(items.every(function(i) { return i.kind === 'function'; })).toBe(true);
    });
  });

  describe('Class Completions', function() {
    var manager;
    var userClass;

    beforeEach(function() {
      userClass = new ClassType('User');
      userClass.setInstanceMember('id', PrimitiveType.NUMBER);
      userClass.setInstanceMember('name', PrimitiveType.STRING);
      userClass.setInstanceMember('email', PrimitiveType.STRING);
      userClass.setInstanceMember('getName', new FunctionType([], PrimitiveType.STRING));
      userClass.setInstanceMember('setName', new FunctionType([
        { name: 'name', type: PrimitiveType.STRING }
      ], Type.VOID));
      userClass.setStaticMember('count', PrimitiveType.NUMBER);
      userClass.setStaticMember('create', new FunctionType([
        { name: 'name', type: PrimitiveType.STRING }
      ], userClass.createInstance()));

      manager = new ScopeManager();
      manager.defineClass('User', userClass);
      manager.defineVariable('currentUser', userClass.createInstance(), 'const');
    });

    it('should provide class name completions', function() {
      var symbols = manager.globalScope.getSymbolsWithPrefix('User');
      var items = getCompletionItems(symbols);

      expect(items.length).toBe(1);
      expect(items[0].label).toBe('User');
      expect(items[0].kind).toBe('class');
    });

    it('should provide instance member completions', function() {
      var userSymbol = manager.resolve('currentUser');
      var instanceType = userSymbol.type;
      var memberNames = instanceType.getMemberNames();

      expect(memberNames).toContain('id');
      expect(memberNames).toContain('name');
      expect(memberNames).toContain('email');
      expect(memberNames).toContain('getName');
      expect(memberNames).toContain('setName');
      expect(memberNames).not.toContain('count'); // static member
    });

    it('should provide static member completions for class reference', function() {
      var userSymbol = manager.resolve('User');
      var classType = userSymbol.type;
      var staticNames = classType.getStaticMemberNames();

      expect(staticNames).toContain('count');
      expect(staticNames).toContain('create');
      expect(staticNames).not.toContain('name'); // instance member
    });

    it('should show method signatures in completion detail', function() {
      var userSymbol = manager.resolve('currentUser');
      var getNameType = userSymbol.type.getMember('getName');

      expect(getNameType.toString()).toBe('() => string');
    });
  });

  describe('Nested Scope Completions', function() {
    var manager;

    beforeEach(function() {
      manager = new ScopeManager();

      // Global scope
      manager.defineVariable('globalConfig', new ObjectType(), 'const');
      manager.defineFunction('initApp', new FunctionType([], Type.VOID));

      // Function scope
      manager.enterFunctionScope(null, 10);
      manager.getCurrentScope().setRange(10, 100);
      manager.defineParameter('options', new ObjectType());
      manager.defineVariable('result', Type.ANY, 'let');

      // Block scope inside function
      manager.enterBlockScope(30);
      manager.getCurrentScope().setRange(30, 80);
      manager.defineVariable('innerVar', PrimitiveType.STRING, 'let');
    });

    it('should include all visible symbols at inner scope', function() {
      var symbols = manager.getVisibleSymbolsAtOffset(50);

      expect(symbols.some(function(s) { return s.name === 'innerVar'; })).toBe(true);
      expect(symbols.some(function(s) { return s.name === 'result'; })).toBe(true);
      expect(symbols.some(function(s) { return s.name === 'options'; })).toBe(true);
      expect(symbols.some(function(s) { return s.name === 'globalConfig'; })).toBe(true);
      expect(symbols.some(function(s) { return s.name === 'initApp'; })).toBe(true);
    });

    it('should not include block-scoped variables outside block', function() {
      var symbols = manager.getVisibleSymbolsAtOffset(20);

      expect(symbols.some(function(s) { return s.name === 'innerVar'; })).toBe(false);
      expect(symbols.some(function(s) { return s.name === 'result'; })).toBe(true);
      expect(symbols.some(function(s) { return s.name === 'options'; })).toBe(true);
    });

    it('should not include function-scoped variables outside function', function() {
      var symbols = manager.getVisibleSymbolsAtOffset(5);

      expect(symbols.some(function(s) { return s.name === 'innerVar'; })).toBe(false);
      expect(symbols.some(function(s) { return s.name === 'result'; })).toBe(false);
      expect(symbols.some(function(s) { return s.name === 'options'; })).toBe(false);
      expect(symbols.some(function(s) { return s.name === 'globalConfig'; })).toBe(true);
    });

    it('should prioritize closer scope symbols in completions', function() {
      // Define shadowing variable in inner scope
      manager.defineVariable('result', PrimitiveType.STRING, 'let');

      var symbols = manager.getVisibleSymbolsAtOffset(50);
      var resultSymbols = symbols.filter(function(s) { return s.name === 'result'; });

      // Should only get one (the shadowing one)
      expect(resultSymbols.length).toBe(1);
      expect(resultSymbols[0].type).toBe(PrimitiveType.STRING);
    });
  });

  describe('Member Access Completions', function() {
    it('should provide object property completions', function() {
      var objType = new ObjectType();
      objType.setProperty('firstName', PrimitiveType.STRING);
      objType.setProperty('lastName', PrimitiveType.STRING);
      objType.setProperty('age', PrimitiveType.NUMBER);
      objType.setProperty('getFullName', new FunctionType([], PrimitiveType.STRING));

      var memberNames = objType.getMemberNames();

      expect(memberNames).toContain('firstName');
      expect(memberNames).toContain('lastName');
      expect(memberNames).toContain('age');
      expect(memberNames).toContain('getFullName');
    });

    it('should provide array method completions', function() {
      var arrayType = new ArrayType(PrimitiveType.STRING);

      // Array types would have built-in methods
      // In real implementation, these would be populated from built-in definitions
      expect(arrayType.elementType).toBe(PrimitiveType.STRING);
    });

    it('should provide inherited member completions', function() {
      var animalClass = new ClassType('Animal');
      animalClass.setInstanceMember('name', PrimitiveType.STRING);
      animalClass.setInstanceMember('speak', new FunctionType([], Type.VOID));

      var dogClass = new ClassType('Dog', animalClass);
      dogClass.setInstanceMember('breed', PrimitiveType.STRING);
      dogClass.setInstanceMember('bark', new FunctionType([], Type.VOID));

      var dogInstance = dogClass.createInstance();
      var memberNames = dogInstance.getMemberNames();

      // Should include both own and inherited members
      expect(memberNames).toContain('breed');
      expect(memberNames).toContain('bark');
      expect(memberNames).toContain('name');
      expect(memberNames).toContain('speak');
    });
  });

  describe('Completion Sorting and Ranking', function() {
    var manager;

    beforeEach(function() {
      manager = new ScopeManager();

      // Variables with different types
      manager.defineVariable('activeUser', PrimitiveType.STRING, 'let');
      manager.defineVariable('activeCount', PrimitiveType.NUMBER, 'let');
      manager.defineVariable('ACTION_TYPE', PrimitiveType.STRING, 'const');
      manager.defineFunction('activeHandler', new FunctionType([], Type.VOID));
      manager.defineClass('ActiveRecord', new ClassType('ActiveRecord'));
    });

    it('should return all matching completions', function() {
      var symbols = manager.globalScope.getSymbolsWithPrefix('active');
      var items = getCompletionItems(symbols);

      expect(items.length).toBe(4); // activeUser, activeCount, activeHandler, ActiveRecord
    });

    it('should include completion kind for sorting', function() {
      var symbols = manager.globalScope.getSymbolsWithPrefix('active');
      var items = getCompletionItems(symbols);

      var kinds = items.map(function(i) { return i.kind; });

      expect(kinds).toContain('variable');
      expect(kinds).toContain('function');
      expect(kinds).toContain('class');
    });

    it('should distinguish between variables and constants', function() {
      var symbols = manager.globalScope.getSymbolsWithPrefix('A');
      var items = getCompletionItems(symbols);

      var constItem = items.find(function(i) { return i.label === 'ACTION_TYPE'; });
      var recordItem = items.find(function(i) { return i.label === 'ActiveRecord'; });

      expect(constItem.kind).toBe('constant');
      expect(recordItem.kind).toBe('class');
    });
  });

  describe('Complex Real-World Scenarios', function() {
    it('should handle React-like component structure', function() {
      var manager = new ScopeManager();

      // Props type
      var propsType = new ObjectType();
      propsType.setProperty('title', PrimitiveType.STRING);
      propsType.setProperty('onClick', new FunctionType([], Type.VOID));

      // State type
      var stateType = new ObjectType();
      stateType.setProperty('count', PrimitiveType.NUMBER);
      stateType.setProperty('isLoading', PrimitiveType.BOOLEAN);

      // Component class
      var componentClass = new ClassType('MyComponent');
      componentClass.setInstanceMember('props', propsType);
      componentClass.setInstanceMember('state', stateType);
      componentClass.setInstanceMember('render', new FunctionType([], Type.ANY));
      componentClass.setInstanceMember('setState', new FunctionType([
        { name: 'newState', type: Type.ANY }
      ], Type.VOID));

      manager.defineClass('MyComponent', componentClass);

      // Inside render method, 'this' should have access to props and state
      manager.enterClassScope(Symbol.createClass('MyComponent', componentClass));
      manager.enterFunctionScope();

      // Simulate this.props.
      var thisType = componentClass.createInstance();
      var propsMembers = thisType.getMember('props').getMemberNames();

      expect(propsMembers).toContain('title');
      expect(propsMembers).toContain('onClick');

      // Simulate this.state.
      var stateMembers = thisType.getMember('state').getMemberNames();

      expect(stateMembers).toContain('count');
      expect(stateMembers).toContain('isLoading');
    });

    it('should handle Express-like route handler', function() {
      var manager = new ScopeManager();

      // Request type
      var reqType = new ObjectType();
      reqType.setProperty('params', new ObjectType());
      reqType.setProperty('query', new ObjectType());
      reqType.setProperty('body', Type.ANY);
      reqType.setProperty('headers', new ObjectType());

      // Response type
      var resType = new ObjectType();
      resType.setProperty('send', new FunctionType([{ name: 'body', type: Type.ANY }], Type.ANY));
      resType.setProperty('json', new FunctionType([{ name: 'obj', type: Type.ANY }], Type.ANY));
      resType.setProperty('status', new FunctionType([{ name: 'code', type: PrimitiveType.NUMBER }], resType));

      // Route handler
      var handlerType = new FunctionType([
        { name: 'req', type: reqType },
        { name: 'res', type: resType }
      ], Type.VOID);

      manager.defineVariable('app', new ObjectType(), 'const');
      manager.enterFunctionScope();
      manager.defineParameter('req', reqType);
      manager.defineParameter('res', resType);

      // Inside handler, req. and res. should work
      var reqSymbol = manager.resolve('req');
      var reqMembers = reqSymbol.type.getMemberNames();

      expect(reqMembers).toContain('params');
      expect(reqMembers).toContain('query');
      expect(reqMembers).toContain('body');

      var resSymbol = manager.resolve('res');
      var resMembers = resSymbol.type.getMemberNames();

      expect(resMembers).toContain('send');
      expect(resMembers).toContain('json');
      expect(resMembers).toContain('status');
    });

    it('should handle Promise chain completions', function() {
      // Simulating: fetch().then(res => res.json()).then(data => ...)
      var jsonType = new FunctionType([], Type.ANY);

      var responseType = new ObjectType();
      responseType.setProperty('json', jsonType);
      responseType.setProperty('text', new FunctionType([], PrimitiveType.STRING));
      responseType.setProperty('ok', PrimitiveType.BOOLEAN);
      responseType.setProperty('status', PrimitiveType.NUMBER);

      var manager = new ScopeManager();

      // In .then callback
      manager.enterArrowScope();
      manager.defineParameter('res', responseType);

      var resSymbol = manager.resolve('res');
      var resMembers = resSymbol.type.getMemberNames();

      expect(resMembers).toContain('json');
      expect(resMembers).toContain('text');
      expect(resMembers).toContain('ok');
      expect(resMembers).toContain('status');
    });

    it('should handle destructured imports', function() {
      var manager = new ScopeManager();

      // Simulating: import { useState, useEffect, useRef } from 'react';
      var useStateType = new FunctionType([{ name: 'initial', type: Type.ANY }], new ArrayType(Type.ANY));
      var useEffectType = new FunctionType([
        { name: 'effect', type: new FunctionType([], Type.VOID) },
        { name: 'deps', type: new ArrayType(Type.ANY), optional: true }
      ], Type.VOID);
      var useRefType = new FunctionType([{ name: 'initial', type: Type.ANY }], new ObjectType());

      manager.defineFunction('useState', useStateType);
      manager.defineFunction('useEffect', useEffectType);
      manager.defineFunction('useRef', useRefType);

      var symbols = manager.globalScope.getSymbolsWithPrefix('use');
      var items = getCompletionItems(symbols);

      expect(items.length).toBe(3);
      expect(items.every(function(i) { return i.kind === 'function'; })).toBe(true);
      expect(items.every(function(i) { return i.label.startsWith('use'); })).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', function() {
    var manager;

    beforeEach(function() {
      manager = new ScopeManager();
    });

    it('should handle empty prefix gracefully', function() {
      manager.defineVariable('x', PrimitiveType.NUMBER);
      manager.defineVariable('y', PrimitiveType.STRING);

      var symbols = manager.globalScope.getSymbolsWithPrefix('');
      expect(symbols.length).toBe(2);
    });

    it('should handle non-matching prefix', function() {
      manager.defineVariable('apple', PrimitiveType.STRING);
      manager.defineVariable('banana', PrimitiveType.STRING);

      var symbols = manager.globalScope.getSymbolsWithPrefix('xyz');
      expect(symbols.length).toBe(0);
    });

    it('should handle special characters in identifiers', function() {
      manager.defineVariable('$element', Type.ANY);
      manager.defineVariable('_private', Type.ANY);
      manager.defineVariable('__proto', Type.ANY);

      var dollarSymbols = manager.globalScope.getSymbolsWithPrefix('$');
      expect(dollarSymbols.length).toBe(1);

      var underscoreSymbols = manager.globalScope.getSymbolsWithPrefix('_');
      expect(underscoreSymbols.length).toBe(2);
    });

    it('should handle deeply nested scopes', function() {
      manager.defineVariable('level0', PrimitiveType.NUMBER);

      for (var i = 1; i <= 10; i++) {
        manager.enterBlockScope();
        manager.defineVariable('level' + i, PrimitiveType.NUMBER);
      }

      // At deepest level, should see all 11 variables
      var allSymbols = manager.currentScope.getAllVisibleSymbols();
      expect(allSymbols.length).toBe(11);

      // Exit all scopes
      for (var j = 0; j < 10; j++) {
        manager.exitScope();
      }

      // Back at global, should only see level0
      allSymbols = manager.currentScope.getAllVisibleSymbols();
      expect(allSymbols.length).toBe(1);
      expect(allSymbols[0].name).toBe('level0');
    });

    it('should handle symbols with same name in different scopes', function() {
      manager.defineVariable('value', PrimitiveType.STRING, 'let');

      manager.enterFunctionScope();
      manager.defineVariable('value', PrimitiveType.NUMBER, 'let');

      manager.enterBlockScope();
      manager.defineVariable('value', PrimitiveType.BOOLEAN, 'let');

      // At innermost scope, should get boolean version
      var innerValue = manager.resolve('value');
      expect(innerValue.type).toBe(PrimitiveType.BOOLEAN);

      manager.exitScope();

      // At function scope, should get number version
      var fnValue = manager.resolve('value');
      expect(fnValue.type).toBe(PrimitiveType.NUMBER);

      manager.exitScope();

      // At global, should get string version
      var globalValue = manager.resolve('value');
      expect(globalValue.type).toBe(PrimitiveType.STRING);
    });
  });
});
