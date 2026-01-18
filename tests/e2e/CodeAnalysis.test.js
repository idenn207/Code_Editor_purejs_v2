/**
 * @fileoverview E2E tests for Code Analysis
 * Tests complete code analysis scenarios including type checking and symbol resolution
 */

describe('E2E: Code Analysis', function() {
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
  var UnionType = CodeEditor.UnionType;

  describe('Type Inference Scenarios', function() {
    var manager;

    beforeEach(function() {
      manager = new ScopeManager();
    });

    it('should infer types from variable declarations', function() {
      // Simulating: let x = 42; const y = "hello"; var z = true;
      manager.defineVariable('x', PrimitiveType.NUMBER, 'let');
      manager.defineVariable('y', PrimitiveType.STRING, 'const');
      manager.defineVariable('z', PrimitiveType.BOOLEAN, 'var');

      expect(manager.resolve('x').type).toBe(PrimitiveType.NUMBER);
      expect(manager.resolve('y').type).toBe(PrimitiveType.STRING);
      expect(manager.resolve('z').type).toBe(PrimitiveType.BOOLEAN);

      expect(manager.resolve('x').kind).toBe(SymbolKind.VARIABLE);
      expect(manager.resolve('y').kind).toBe(SymbolKind.CONSTANT);
      expect(manager.resolve('z').kind).toBe(SymbolKind.VARIABLE);
    });

    it('should infer array element types', function() {
      // Simulating: const numbers = [1, 2, 3];
      var numbersType = new ArrayType(PrimitiveType.NUMBER);
      manager.defineVariable('numbers', numbersType, 'const');

      var numbersSymbol = manager.resolve('numbers');
      expect(numbersSymbol.type.kind).toBe(CodeEditor.TypeKind.ARRAY);
      expect(numbersSymbol.type.elementType).toBe(PrimitiveType.NUMBER);
    });

    it('should infer object property types', function() {
      // Simulating: const user = { name: "John", age: 30 };
      var userType = new ObjectType();
      userType.setProperty('name', PrimitiveType.STRING);
      userType.setProperty('age', PrimitiveType.NUMBER);

      manager.defineVariable('user', userType, 'const');

      var userSymbol = manager.resolve('user');
      expect(userSymbol.type.getMember('name')).toBe(PrimitiveType.STRING);
      expect(userSymbol.type.getMember('age')).toBe(PrimitiveType.NUMBER);
    });

    it('should infer function return types', function() {
      // Simulating: function add(a, b) { return a + b; }
      var addType = new FunctionType([
        { name: 'a', type: PrimitiveType.NUMBER },
        { name: 'b', type: PrimitiveType.NUMBER }
      ], PrimitiveType.NUMBER);

      manager.defineFunction('add', addType);

      var addSymbol = manager.resolve('add');
      expect(addSymbol.type.returnType).toBe(PrimitiveType.NUMBER);
      expect(addSymbol.type.getParamCount()).toBe(2);
    });

    it('should handle nullable types', function() {
      // Simulating: let value: string | null = null;
      var nullableString = new UnionType([
        PrimitiveType.STRING,
        PrimitiveType.NULL
      ]);

      manager.defineVariable('value', nullableString, 'let');

      var valueSymbol = manager.resolve('value');
      expect(valueSymbol.type.kind).toBe(CodeEditor.TypeKind.UNION);
      expect(valueSymbol.type.isNullable()).toBe(true);
    });
  });

  describe('Class Analysis Scenarios', function() {
    var manager;
    var personClass;
    var employeeClass;

    beforeEach(function() {
      manager = new ScopeManager();

      // Base class: Person
      personClass = new ClassType('Person');
      personClass.setInstanceMember('name', PrimitiveType.STRING);
      personClass.setInstanceMember('age', PrimitiveType.NUMBER);
      personClass.setInstanceMember('greet', new FunctionType([], PrimitiveType.STRING));
      personClass.setStaticMember('species', PrimitiveType.STRING);

      // Derived class: Employee extends Person
      employeeClass = new ClassType('Employee', personClass);
      employeeClass.setInstanceMember('employeeId', PrimitiveType.STRING);
      employeeClass.setInstanceMember('department', PrimitiveType.STRING);
      employeeClass.setInstanceMember('getSalary', new FunctionType([], PrimitiveType.NUMBER));
      employeeClass.setStaticMember('company', PrimitiveType.STRING);

      manager.defineClass('Person', personClass);
      manager.defineClass('Employee', employeeClass);
    });

    it('should analyze class hierarchy', function() {
      var employeeSymbol = manager.resolve('Employee');

      expect(employeeSymbol.type.extends(personClass)).toBe(true);
      expect(employeeSymbol.type.getInheritanceChain().length).toBe(2);
    });

    it('should analyze inherited members', function() {
      var employeeInstance = employeeClass.createInstance();

      // Own members
      expect(employeeInstance.getMember('employeeId')).toBe(PrimitiveType.STRING);
      expect(employeeInstance.getMember('department')).toBe(PrimitiveType.STRING);

      // Inherited members
      expect(employeeInstance.getMember('name')).toBe(PrimitiveType.STRING);
      expect(employeeInstance.getMember('age')).toBe(PrimitiveType.NUMBER);
    });

    it('should analyze static members', function() {
      // Employee static members (own + inherited)
      expect(employeeClass.getStaticMember('company')).toBe(PrimitiveType.STRING);
      expect(employeeClass.getStaticMember('species')).toBe(PrimitiveType.STRING);

      // Person static members
      expect(personClass.getStaticMember('species')).toBe(PrimitiveType.STRING);
      expect(personClass.getStaticMember('company')).toBeNull();
    });

    it('should analyze instance vs class member access', function() {
      // Class reference -> static members
      var classMembers = employeeClass.getMemberNames();
      expect(classMembers).toContain('company');
      expect(classMembers).toContain('species');

      // Instance reference -> instance members
      var instanceMembers = employeeClass.createInstance().getMemberNames();
      expect(instanceMembers).toContain('name');
      expect(instanceMembers).toContain('employeeId');
      expect(instanceMembers).not.toContain('company');
    });

    it('should check type compatibility with inheritance', function() {
      var personInstance = personClass.createInstance();
      var employeeInstance = employeeClass.createInstance();

      // Employee is assignable to Person (subtype)
      expect(employeeInstance.isAssignableTo(personInstance)).toBe(true);

      // Person is NOT assignable to Employee
      expect(personInstance.isAssignableTo(employeeInstance)).toBe(false);
    });
  });

  describe('Function Analysis Scenarios', function() {
    var manager;

    beforeEach(function() {
      manager = new ScopeManager();
    });

    it('should analyze function with optional parameters', function() {
      // function greet(name: string, greeting?: string): string
      var greetType = new FunctionType([
        { name: 'name', type: PrimitiveType.STRING },
        { name: 'greeting', type: PrimitiveType.STRING, optional: true }
      ], PrimitiveType.STRING);

      manager.defineFunction('greet', greetType);

      var greetSymbol = manager.resolve('greet');
      expect(greetSymbol.type.getRequiredParamCount()).toBe(1);
      expect(greetSymbol.type.getParamCount()).toBe(2);
      expect(greetSymbol.type.params[1].optional).toBe(true);
    });

    it('should analyze function with rest parameters', function() {
      // function sum(...numbers: number[]): number
      var sumType = new FunctionType([
        { name: 'numbers', type: PrimitiveType.NUMBER, rest: true }
      ], PrimitiveType.NUMBER);

      manager.defineFunction('sum', sumType);

      var sumSymbol = manager.resolve('sum');
      expect(sumSymbol.type.hasRestParam()).toBe(true);
      expect(sumSymbol.type.getRequiredParamCount()).toBe(0);
    });

    it('should analyze higher-order functions', function() {
      // function map<T, U>(arr: T[], fn: (item: T) => U): U[]
      var callbackType = new FunctionType([
        { name: 'item', type: Type.ANY }
      ], Type.ANY);

      var mapType = new FunctionType([
        { name: 'arr', type: new ArrayType(Type.ANY) },
        { name: 'fn', type: callbackType }
      ], new ArrayType(Type.ANY));

      manager.defineFunction('map', mapType);

      var mapSymbol = manager.resolve('map');
      expect(mapSymbol.type.getParamType(1).kind).toBe(CodeEditor.TypeKind.FUNCTION);
    });

    it('should analyze async functions', function() {
      var asyncFnType = new FunctionType([
        { name: 'url', type: PrimitiveType.STRING }
      ], Type.ANY);
      asyncFnType.isAsync = true;

      manager.defineFunction('fetchData', asyncFnType);

      var fetchSymbol = manager.resolve('fetchData');
      expect(fetchSymbol.type.isAsync).toBe(true);
    });

    it('should analyze generator functions', function() {
      var generatorType = new FunctionType([], Type.ANY);
      generatorType.isGenerator = true;

      manager.defineFunction('range', generatorType);

      var rangeSymbol = manager.resolve('range');
      expect(rangeSymbol.type.isGenerator).toBe(true);
    });

    it('should analyze function signature for completions', function() {
      var complexFn = new FunctionType([
        { name: 'config', type: new ObjectType() },
        { name: 'callback', type: new FunctionType([], Type.VOID) },
        { name: 'options', type: Type.ANY, optional: true }
      ], new ArrayType(PrimitiveType.STRING));

      manager.defineFunction('process', complexFn);

      var processSymbol = manager.resolve('process');
      var signature = processSymbol.type.toString();

      expect(signature).toContain('config');
      expect(signature).toContain('callback');
      expect(signature).toContain('options?');
      expect(signature).toContain('string[]');
    });
  });

  describe('Scope Analysis Scenarios', function() {
    var manager;

    beforeEach(function() {
      manager = new ScopeManager();
    });

    it('should analyze hoisting behavior', function() {
      // In JavaScript, var and function declarations are hoisted
      // Simulating: function uses hoisted var and function

      manager.defineVariable('hoistedVar', Type.ANY, 'var');
      manager.defineFunction('hoistedFn', new FunctionType([], Type.VOID));
      manager.defineVariable('notHoisted', Type.ANY, 'let');

      // All should be resolvable from global scope
      expect(manager.resolve('hoistedVar')).not.toBeNull();
      expect(manager.resolve('hoistedFn')).not.toBeNull();
      expect(manager.resolve('notHoisted')).not.toBeNull();
    });

    it('should analyze closure variable capture', function() {
      // Simulating:
      // function outer() {
      //   let capturedVar = 1;
      //   return function inner() { return capturedVar; }
      // }

      manager.enterFunctionScope();
      manager.defineVariable('capturedVar', PrimitiveType.NUMBER, 'let');

      manager.enterFunctionScope(); // inner function

      // Inner function can access capturedVar
      expect(manager.resolve('capturedVar')).not.toBeNull();
      expect(manager.resolve('capturedVar').type).toBe(PrimitiveType.NUMBER);

      manager.exitScope(); // exit inner
      manager.exitScope(); // exit outer

      // Outside both functions, capturedVar is not accessible
      expect(manager.resolve('capturedVar')).toBeNull();
    });

    it('should analyze block scope with let/const', function() {
      // Simulating:
      // {
      //   let blockScoped = 1;
      //   const blockConst = 2;
      // }
      // // blockScoped and blockConst not accessible here

      manager.enterBlockScope();
      manager.defineVariable('blockScoped', PrimitiveType.NUMBER, 'let');
      manager.defineVariable('blockConst', PrimitiveType.NUMBER, 'const');

      expect(manager.resolve('blockScoped')).not.toBeNull();
      expect(manager.resolve('blockConst')).not.toBeNull();

      manager.exitScope();

      expect(manager.resolve('blockScoped')).toBeNull();
      expect(manager.resolve('blockConst')).toBeNull();
    });

    it('should analyze catch clause scope', function() {
      // Simulating: try { ... } catch (error) { /* error accessible here */ }

      manager.enterCatchScope();
      manager.defineParameter('error', Type.ANY);

      expect(manager.resolve('error')).not.toBeNull();
      expect(manager.getCurrentScope().type).toBe(ScopeType.CATCH);

      manager.exitScope();

      expect(manager.resolve('error')).toBeNull();
    });

    it('should analyze for loop scope', function() {
      // Simulating: for (let i = 0; i < 10; i++) { let x = i * 2; }

      manager.enterBlockScope(); // for loop initializer scope
      manager.defineVariable('i', PrimitiveType.NUMBER, 'let');

      manager.enterBlockScope(); // for loop body scope
      manager.defineVariable('x', PrimitiveType.NUMBER, 'let');

      expect(manager.resolve('i')).not.toBeNull();
      expect(manager.resolve('x')).not.toBeNull();

      manager.exitScope(); // exit body

      expect(manager.resolve('i')).not.toBeNull();
      expect(manager.resolve('x')).toBeNull();

      manager.exitScope(); // exit for loop

      expect(manager.resolve('i')).toBeNull();
    });
  });

  describe('Module-like Structure Analysis', function() {
    var manager;

    beforeEach(function() {
      manager = new ScopeManager();
    });

    it('should analyze exported symbols', function() {
      // Simulating module exports
      var configSymbol = new Symbol('config', SymbolKind.VARIABLE, new ObjectType(), {
        isExported: true
      });
      var initSymbol = new Symbol('initialize', SymbolKind.FUNCTION, new FunctionType([], Type.VOID), {
        isExported: true
      });
      var helperSymbol = new Symbol('_helper', SymbolKind.FUNCTION, new FunctionType([], Type.VOID), {
        isExported: false
      });

      manager.define(configSymbol);
      manager.define(initSymbol);
      manager.define(helperSymbol);

      var allSymbols = manager.globalScope.getSymbols();
      var exported = allSymbols.filter(function(s) { return s.isExported; });
      var internal = allSymbols.filter(function(s) { return !s.isExported; });

      expect(exported.length).toBe(2);
      expect(internal.length).toBe(1);
    });

    it('should analyze default export', function() {
      var defaultExport = new Symbol('MyComponent', SymbolKind.CLASS, new ClassType('MyComponent'), {
        isExported: true,
        isDefaultExport: true
      });

      manager.define(defaultExport);

      var symbols = manager.globalScope.getSymbols();
      var defaultSymbol = symbols.find(function(s) { return s.isDefaultExport; });

      expect(defaultSymbol).not.toBeUndefined();
      expect(defaultSymbol.name).toBe('MyComponent');
    });

    it('should analyze import bindings', function() {
      // Simulating: import { useState, useEffect } from 'react';
      var useStateSymbol = new Symbol('useState', SymbolKind.IMPORT, new FunctionType([], Type.ANY));
      var useEffectSymbol = new Symbol('useEffect', SymbolKind.IMPORT, new FunctionType([], Type.VOID));

      manager.define(useStateSymbol);
      manager.define(useEffectSymbol);

      expect(manager.resolve('useState').kind).toBe(SymbolKind.IMPORT);
      expect(manager.resolve('useEffect').kind).toBe(SymbolKind.IMPORT);
    });
  });

  describe('Type Checking Scenarios', function() {
    it('should check primitive type compatibility', function() {
      expect(PrimitiveType.STRING.isAssignableTo(PrimitiveType.STRING)).toBe(true);
      expect(PrimitiveType.STRING.isAssignableTo(PrimitiveType.NUMBER)).toBe(false);
      expect(PrimitiveType.NUMBER.isAssignableTo(Type.ANY)).toBe(true);
    });

    it('should check function type compatibility', function() {
      var fn1 = new FunctionType([
        { name: 'x', type: PrimitiveType.NUMBER }
      ], PrimitiveType.STRING);

      var fn2 = new FunctionType([
        { name: 'x', type: PrimitiveType.NUMBER }
      ], PrimitiveType.STRING);

      var fn3 = new FunctionType([
        { name: 'x', type: PrimitiveType.STRING }
      ], PrimitiveType.STRING);

      expect(fn1.equals(fn2)).toBe(true);
      expect(fn1.equals(fn3)).toBe(false);
    });

    it('should check array type compatibility', function() {
      var stringArray = new ArrayType(PrimitiveType.STRING);
      var numberArray = new ArrayType(PrimitiveType.NUMBER);
      var anyArray = new ArrayType(Type.ANY);

      expect(stringArray.equals(stringArray)).toBe(true);
      expect(stringArray.equals(numberArray)).toBe(false);
      expect(stringArray.isAssignableTo(anyArray)).toBe(true);
    });

    it('should check object structural compatibility', function() {
      var obj1 = new ObjectType();
      obj1.setProperty('x', PrimitiveType.NUMBER);
      obj1.setProperty('y', PrimitiveType.NUMBER);

      var obj2 = new ObjectType();
      obj2.setProperty('x', PrimitiveType.NUMBER);

      // obj1 has more properties, so it's assignable to obj2 (structural subtyping)
      expect(obj1.isAssignableTo(obj2)).toBe(true);

      // obj2 is missing 'y', so it's NOT assignable to obj1
      expect(obj2.isAssignableTo(obj1)).toBe(false);
    });

    it('should check union type compatibility', function() {
      var stringOrNumber = new UnionType([PrimitiveType.STRING, PrimitiveType.NUMBER]);
      var stringOrNull = new UnionType([PrimitiveType.STRING, PrimitiveType.NULL]);

      // Union contains checks
      expect(stringOrNumber.contains(PrimitiveType.STRING)).toBe(true);
      expect(stringOrNumber.contains(PrimitiveType.NUMBER)).toBe(true);
      expect(stringOrNumber.contains(PrimitiveType.BOOLEAN)).toBe(false);

      // Union is assignable to ANY
      expect(stringOrNumber.isAssignableTo(Type.ANY)).toBe(true);

      // Same union types are equal
      var anotherStringOrNumber = new UnionType([PrimitiveType.STRING, PrimitiveType.NUMBER]);
      expect(stringOrNumber.equals(anotherStringOrNumber)).toBe(true);

      // Different unions are not equal
      expect(stringOrNumber.equals(stringOrNull)).toBe(false);
    });
  });

  describe('Symbol Reference Analysis', function() {
    var manager;

    beforeEach(function() {
      manager = new ScopeManager();
    });

    it('should track symbol references', function() {
      var xSymbol = manager.defineVariable('x', PrimitiveType.NUMBER, 'let');

      // Simulate references to x
      xSymbol.addReference();
      xSymbol.addReference();
      xSymbol.addReference();

      expect(xSymbol.references).toBe(3);
    });

    it('should provide symbol location info', function() {
      var symbol = new Symbol('myFunction', SymbolKind.FUNCTION, new FunctionType([], Type.VOID), {
        location: {
          start: 100,
          end: 150,
          line: 5,
          column: 10
        }
      });

      manager.define(symbol);

      var resolved = manager.resolve('myFunction');
      expect(resolved.location).not.toBeNull();
      expect(resolved.location.start).toBe(100);
      expect(resolved.location.end).toBe(150);
      expect(resolved.location.line).toBe(5);
    });

    it('should provide symbol documentation', function() {
      var symbol = new Symbol('calculate', SymbolKind.FUNCTION, new FunctionType([], PrimitiveType.NUMBER), {
        documentation: 'Calculates the result based on input parameters.'
      });

      manager.define(symbol);

      var resolved = manager.resolve('calculate');
      expect(resolved.documentation).toBe('Calculates the result based on input parameters.');
    });

    it('should track full qualified names for nested symbols', function() {
      var classSymbol = new Symbol('MyClass', SymbolKind.CLASS, new ClassType('MyClass'));
      var methodSymbol = new Symbol('myMethod', SymbolKind.METHOD, new FunctionType([], Type.VOID));

      classSymbol.addMember(methodSymbol);

      expect(methodSymbol.getFullName()).toBe('MyClass.myMethod');
    });
  });

  describe('Performance Edge Cases', function() {
    it('should handle large number of symbols', function() {
      var manager = new ScopeManager();

      // Define 1000 symbols
      for (var i = 0; i < 1000; i++) {
        manager.defineVariable('var' + i, PrimitiveType.NUMBER, 'let');
      }

      expect(manager.globalScope.getSymbolCount()).toBe(1000);

      // Prefix search should still work
      var var9Symbols = manager.globalScope.getSymbolsWithPrefix('var9');
      expect(var9Symbols.length).toBe(111); // var9, var90-var99, var900-var999
    });

    it('should handle deeply nested class hierarchy', function() {
      var baseClass = new ClassType('Base');
      baseClass.setInstanceMember('baseMethod', new FunctionType([], Type.VOID));

      var currentClass = baseClass;
      for (var i = 1; i <= 10; i++) {
        var newClass = new ClassType('Level' + i, currentClass);
        newClass.setInstanceMember('level' + i + 'Method', new FunctionType([], Type.VOID));
        currentClass = newClass;
      }

      // Deepest class should have all inherited methods
      var instance = currentClass.createInstance();
      var allMembers = instance.getMemberNames();

      expect(allMembers).toContain('baseMethod');
      expect(allMembers).toContain('level1Method');
      expect(allMembers).toContain('level10Method');
    });

    it('should handle many scopes efficiently', function() {
      var manager = new ScopeManager();

      // Create 100 nested scopes
      for (var i = 0; i < 100; i++) {
        manager.enterBlockScope();
        manager.defineVariable('scope' + i + 'Var', PrimitiveType.NUMBER, 'let');
      }

      // All 100 variables should be visible at deepest scope
      var allVisible = manager.currentScope.getAllVisibleSymbols();
      expect(allVisible.length).toBe(100);

      // Exit all scopes
      for (var j = 0; j < 100; j++) {
        manager.exitScope();
      }

      expect(manager.isInGlobalScope()).toBe(true);
    });
  });
});
