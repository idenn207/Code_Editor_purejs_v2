/**
 * @fileoverview Integration tests for type inference
 */

describe('TypeInference', function() {
  var TypeChecker = CodeEditor.TypeChecker;
  var TypeKind = CodeEditor.TypeKind;
  var PrimitiveType = CodeEditor.PrimitiveType;
  var Type = CodeEditor.Type;

  var checker;

  beforeEach(function() {
    checker = TypeChecker.create();
  });

  describe('literal type inference', function() {
    it('should infer string type', function() {
      var type = checker.inferExpressionType('"hello"');
      expect(type.kind).toBe(TypeKind.STRING);
    });

    it('should infer number type', function() {
      var type = checker.inferExpressionType('42');
      expect(type.kind).toBe(TypeKind.NUMBER);
    });

    it('should infer boolean type', function() {
      var type = checker.inferExpressionType('true');
      expect(type.kind).toBe(TypeKind.BOOLEAN);
    });

    it('should infer null type', function() {
      var type = checker.inferExpressionType('null');
      expect(type.kind).toBe(TypeKind.NULL);
    });

    it('should infer array type', function() {
      var type = checker.inferExpressionType('[1, 2, 3]');
      expect(type.kind).toBe(TypeKind.ARRAY);
      expect(type.elementType.kind).toBe(TypeKind.NUMBER);
    });

    it('should infer object type', function() {
      var type = checker.inferExpressionType('{ name: "test" }');
      expect(type.kind).toBe(TypeKind.OBJECT);
      var nameProp = type.getMember('name');
      expect(nameProp.kind).toBe(TypeKind.STRING);
    });
  });

  describe('function return type inference', function() {
    it('should infer return type from expression body', function() {
      var type = checker.inferExpressionType('(x) => x + 1');
      expect(type.kind).toBe(TypeKind.FUNCTION);
    });

    it('should infer return type from explicit return', function() {
      var analysis = checker.analyze('function foo() { return 42; }');
      expect(analysis.success).toBe(true);

      var fooType = checker.getSymbolType('foo');
      expect(fooType.kind).toBe(TypeKind.FUNCTION);
      expect(fooType.returnType.kind).toBe(TypeKind.NUMBER);
    });

    it('should infer void for no return', function() {
      var analysis = checker.analyze('function foo() { console.log("hi"); }');
      var fooType = checker.getSymbolType('foo');
      expect(fooType.returnType.kind).toBe(TypeKind.VOID);
    });
  });

  describe('array method type inference', function() {
    it('should infer map return type', function() {
      var type = checker.inferExpressionType('[1, 2, 3].map(x => x * 2)');
      expect(type.kind).toBe(TypeKind.ARRAY);
    });

    it('should infer filter return type preserves element type', function() {
      var type = checker.inferExpressionType('[1, 2, 3].filter(x => x > 1)');
      expect(type.kind).toBe(TypeKind.ARRAY);
      expect(type.elementType.kind).toBe(TypeKind.NUMBER);
    });

    it('should infer forEach return void', function() {
      var type = checker.inferExpressionType('[1, 2, 3].forEach(x => console.log(x))');
      expect(type.kind).toBe(TypeKind.VOID);
    });

    it('should infer find return element or undefined', function() {
      var type = checker.inferExpressionType('[1, 2, 3].find(x => x > 1)');
      expect(type.kind).toBe(TypeKind.UNION);
    });

    it('should infer reduce return type from initial value', function() {
      var type = checker.inferExpressionType('[1, 2, 3].reduce((acc, x) => acc + x, 0)');
      expect(type.kind).toBe(TypeKind.NUMBER);
    });
  });

  describe('class type inference', function() {
    it('should infer class type', function() {
      var analysis = checker.analyze('class Person { constructor(name) { this.name = name; } }');
      expect(analysis.success).toBe(true);
      expect(analysis.classes).toHaveLength(1);

      var personType = checker.getClassType('Person');
      expect(personType).not.toBe(null);
      expect(personType.name).toBe('Person');
    });

    it('should infer instance member types from constructor', function() {
      checker.analyze('class Counter { constructor() { this.count = 0; } }');

      var counterType = checker.getClassType('Counter');
      var countType = counterType.getInstanceMember('count');
      expect(countType.kind).toBe(TypeKind.NUMBER);
    });

    it('should infer method return types', function() {
      checker.analyze('class Calc { add(a, b) { return a + b; } }');

      var calcType = checker.getClassType('Calc');
      var addType = calcType.getInstanceMember('add');
      expect(addType.kind).toBe(TypeKind.FUNCTION);
    });

    it('should infer static member types', function() {
      checker.analyze('class Counter { static count = 0; }');

      var counterType = checker.getClassType('Counter');
      var countType = counterType.getStaticMember('count');
      expect(countType.kind).toBe(TypeKind.NUMBER);
    });
  });

  describe('variable declaration type inference', function() {
    it('should infer type from initializer', function() {
      checker.analyze('const name = "Alice";');
      var type = checker.getSymbolType('name');
      expect(type.kind).toBe(TypeKind.STRING);
    });

    it('should infer array element type', function() {
      checker.analyze('const numbers = [1, 2, 3];');
      var type = checker.getSymbolType('numbers');
      expect(type.kind).toBe(TypeKind.ARRAY);
      expect(type.elementType.kind).toBe(TypeKind.NUMBER);
    });

    it('should infer object property types', function() {
      checker.analyze('const user = { name: "Bob", age: 30 };');
      var type = checker.getSymbolType('user');
      expect(type.kind).toBe(TypeKind.OBJECT);
      expect(type.getMember('name').kind).toBe(TypeKind.STRING);
      expect(type.getMember('age').kind).toBe(TypeKind.NUMBER);
    });
  });

  describe('binary expression type inference', function() {
    it('should infer number + number = number', function() {
      var type = checker.inferExpressionType('1 + 2');
      expect(type.kind).toBe(TypeKind.NUMBER);
    });

    it('should infer string + string = string', function() {
      var type = checker.inferExpressionType('"a" + "b"');
      expect(type.kind).toBe(TypeKind.STRING);
    });

    it('should infer comparison returns boolean', function() {
      var type = checker.inferExpressionType('1 === 2');
      expect(type.kind).toBe(TypeKind.BOOLEAN);
    });

    it('should infer logical AND returns union', function() {
      var type = checker.inferExpressionType('true && "yes"');
      expect(type.kind).toBe(TypeKind.UNION);
    });
  });

  describe('member expression type inference', function() {
    it('should infer string.length as number', function() {
      var type = checker.inferExpressionType('"hello".length');
      expect(type.kind).toBe(TypeKind.NUMBER);
    });

    it('should infer array.length as number', function() {
      var type = checker.inferExpressionType('[1,2,3].length');
      expect(type.kind).toBe(TypeKind.NUMBER);
    });

    it('should infer array element access', function() {
      var type = checker.inferExpressionType('[1,2,3][0]');
      expect(type.kind).toBe(TypeKind.NUMBER);
    });
  });

  describe('new expression type inference', function() {
    it('should infer Date instance', function() {
      var type = checker.inferExpressionType('new Date()');
      expect(type.kind).toBe(TypeKind.INSTANCE);
    });

    it('should infer Array constructor', function() {
      var type = checker.inferExpressionType('new Array(1, 2, 3)');
      expect(type.kind).toBe(TypeKind.ARRAY);
    });
  });

  describe('completions', function() {
    it('should get completions for string', function() {
      var type = checker.inferExpressionType('"test"');
      var completions = checker.getCompletions(type);

      var names = completions.map(function(c) { return c.name; });
      expect(names).toContain('length');
      expect(names).toContain('charAt');
      expect(names).toContain('toUpperCase');
    });

    it('should get completions for array', function() {
      var type = checker.inferExpressionType('[1,2,3]');
      var completions = checker.getCompletions(type);

      var names = completions.map(function(c) { return c.name; });
      expect(names).toContain('length');
      expect(names).toContain('map');
      expect(names).toContain('filter');
      expect(names).toContain('push');
    });

    it('should get completions for object literal', function() {
      var type = checker.inferExpressionType('{ name: "test", value: 42 }');
      var completions = checker.getCompletions(type);

      var names = completions.map(function(c) { return c.name; });
      expect(names).toContain('name');
      expect(names).toContain('value');
    });
  });
});
