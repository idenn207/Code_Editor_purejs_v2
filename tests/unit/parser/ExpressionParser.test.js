/**
 * @fileoverview Unit tests for ExpressionParser
 */

describe('ExpressionParser', function() {
  var ExpressionParser = CodeEditor.ExpressionParser;
  var NodeType = CodeEditor.NodeType;

  describe('literals', function() {
    it('should parse string literal', function() {
      var ast = ExpressionParser.parseExpression('"hello"');
      expect(ast.type).toBe(NodeType.STRING_LITERAL);
      expect(ast.value).toBe('hello');
    });

    it('should parse number literal', function() {
      var ast = ExpressionParser.parseExpression('42');
      expect(ast.type).toBe(NodeType.NUMBER_LITERAL);
      expect(ast.value).toBe(42);
    });

    it('should parse boolean literal', function() {
      var ast = ExpressionParser.parseExpression('true');
      expect(ast.type).toBe(NodeType.BOOLEAN_LITERAL);
      expect(ast.value).toBe(true);
    });

    it('should parse null literal', function() {
      var ast = ExpressionParser.parseExpression('null');
      expect(ast.type).toBe(NodeType.NULL_LITERAL);
    });

    it('should parse array literal', function() {
      var ast = ExpressionParser.parseExpression('[1, 2, 3]');
      expect(ast.type).toBe(NodeType.ARRAY_LITERAL);
      expect(ast.elements).toHaveLength(3);
    });

    it('should parse object literal', function() {
      var ast = ExpressionParser.parseExpression('{ name: "test", value: 42 }');
      expect(ast.type).toBe(NodeType.OBJECT_LITERAL);
      expect(ast.properties).toHaveLength(2);
    });
  });

  describe('identifiers', function() {
    it('should parse identifier', function() {
      var ast = ExpressionParser.parseExpression('foo');
      expect(ast.type).toBe(NodeType.IDENTIFIER);
      expect(ast.name).toBe('foo');
    });

    it('should parse this', function() {
      var ast = ExpressionParser.parseExpression('this');
      expect(ast.type).toBe(NodeType.THIS);
    });
  });

  describe('member expressions', function() {
    it('should parse dot notation', function() {
      var ast = ExpressionParser.parseExpression('obj.prop');
      expect(ast.type).toBe(NodeType.MEMBER_EXPRESSION);
      expect(ast.computed).toBe(false);
      expect(ast.property.name).toBe('prop');
    });

    it('should parse bracket notation', function() {
      var ast = ExpressionParser.parseExpression('arr[0]');
      expect(ast.type).toBe(NodeType.MEMBER_EXPRESSION);
      expect(ast.computed).toBe(true);
    });

    it('should parse chained member access', function() {
      var ast = ExpressionParser.parseExpression('a.b.c');
      expect(ast.type).toBe(NodeType.MEMBER_EXPRESSION);
      expect(ast.property.name).toBe('c');
    });

    it('should parse optional chaining', function() {
      var ast = ExpressionParser.parseExpression('obj?.prop');
      expect(ast.type).toBe(NodeType.MEMBER_EXPRESSION);
      expect(ast.optional).toBe(true);
    });
  });

  describe('call expressions', function() {
    it('should parse function call', function() {
      var ast = ExpressionParser.parseExpression('foo()');
      expect(ast.type).toBe(NodeType.CALL_EXPRESSION);
      expect(ast.arguments).toHaveLength(0);
    });

    it('should parse call with arguments', function() {
      var ast = ExpressionParser.parseExpression('foo(1, "hello")');
      expect(ast.type).toBe(NodeType.CALL_EXPRESSION);
      expect(ast.arguments).toHaveLength(2);
    });

    it('should parse method call', function() {
      var ast = ExpressionParser.parseExpression('obj.method()');
      expect(ast.type).toBe(NodeType.CALL_EXPRESSION);
      expect(ast.callee.type).toBe(NodeType.MEMBER_EXPRESSION);
    });
  });

  describe('new expressions', function() {
    it('should parse new expression', function() {
      var ast = ExpressionParser.parseExpression('new Foo()');
      expect(ast.type).toBe(NodeType.NEW_EXPRESSION);
    });

    it('should parse new with arguments', function() {
      var ast = ExpressionParser.parseExpression('new Foo(1, 2)');
      expect(ast.type).toBe(NodeType.NEW_EXPRESSION);
      expect(ast.arguments).toHaveLength(2);
    });
  });

  describe('arrow functions', function() {
    it('should parse arrow function with expression body', function() {
      var ast = ExpressionParser.parseExpression('x => x * 2');
      expect(ast.type).toBe(NodeType.ARROW_FUNCTION);
      expect(ast.expression).toBe(true);
      expect(ast.params).toHaveLength(1);
    });

    it('should parse arrow function with multiple params', function() {
      var ast = ExpressionParser.parseExpression('(a, b) => a + b');
      expect(ast.type).toBe(NodeType.ARROW_FUNCTION);
      expect(ast.params).toHaveLength(2);
    });

    it('should parse arrow function with block body', function() {
      var ast = ExpressionParser.parseExpression('(x) => { return x; }');
      expect(ast.type).toBe(NodeType.ARROW_FUNCTION);
      expect(ast.expression).toBe(false);
    });
  });

  describe('binary expressions', function() {
    it('should parse addition', function() {
      var ast = ExpressionParser.parseExpression('1 + 2');
      expect(ast.type).toBe(NodeType.BINARY_EXPRESSION);
      expect(ast.operator).toBe('+');
    });

    it('should parse comparison', function() {
      var ast = ExpressionParser.parseExpression('a === b');
      expect(ast.type).toBe(NodeType.BINARY_EXPRESSION);
      expect(ast.operator).toBe('===');
    });

    it('should handle operator precedence', function() {
      var ast = ExpressionParser.parseExpression('1 + 2 * 3');
      expect(ast.type).toBe(NodeType.BINARY_EXPRESSION);
      expect(ast.operator).toBe('+');
      expect(ast.right.operator).toBe('*');
    });
  });

  describe('class declarations', function() {
    it('should parse class declaration', function() {
      var ast = ExpressionParser.parse('class Foo {}');
      expect(ast.body[0].type).toBe(NodeType.CLASS_DECLARATION);
      expect(ast.body[0].id.name).toBe('Foo');
    });

    it('should parse class with extends', function() {
      var ast = ExpressionParser.parse('class Foo extends Bar {}');
      expect(ast.body[0].superClass.name).toBe('Bar');
    });

    it('should parse class with methods', function() {
      var ast = ExpressionParser.parse('class Foo { constructor() {} greet() {} }');
      expect(ast.body[0].body.body).toHaveLength(2);
    });

    it('should parse static members', function() {
      var ast = ExpressionParser.parse('class Foo { static count = 0; }');
      var member = ast.body[0].body.body[0];
      expect(member.static).toBe(true);
    });
  });

  describe('variable declarations', function() {
    it('should parse var declaration', function() {
      var ast = ExpressionParser.parse('var x = 1;');
      expect(ast.body[0].type).toBe(NodeType.VARIABLE_DECLARATION);
      expect(ast.body[0].kind).toBe('var');
    });

    it('should parse let declaration', function() {
      var ast = ExpressionParser.parse('let x = 1;');
      expect(ast.body[0].kind).toBe('let');
    });

    it('should parse const declaration', function() {
      var ast = ExpressionParser.parse('const x = 1;');
      expect(ast.body[0].kind).toBe('const');
    });

    it('should parse multiple declarators', function() {
      var ast = ExpressionParser.parse('var a = 1, b = 2;');
      expect(ast.body[0].declarations).toHaveLength(2);
    });
  });

  describe('function declarations', function() {
    it('should parse function declaration', function() {
      var ast = ExpressionParser.parse('function foo() {}');
      expect(ast.body[0].type).toBe(NodeType.FUNCTION_DECLARATION);
      expect(ast.body[0].id.name).toBe('foo');
    });

    it('should parse function with parameters', function() {
      var ast = ExpressionParser.parse('function add(a, b) { return a + b; }');
      expect(ast.body[0].params).toHaveLength(2);
    });

    it('should parse async function', function() {
      var ast = ExpressionParser.parse('async function fetch() {}');
      expect(ast.body[0].async).toBe(true);
    });
  });
});
