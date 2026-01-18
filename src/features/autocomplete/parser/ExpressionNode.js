/**
 * @fileoverview AST node definitions for JavaScript expressions
 * @module features/autocomplete/parser/ExpressionNode
 */

(function(CodeEditor) {
  'use strict';

  // ============================================
  // Node Type Enumeration
  // ============================================

  /**
   * AST node type enumeration
   * @enum {string}
   */
  var NodeType = Object.freeze({
    // Literals
    STRING_LITERAL: 'StringLiteral',
    NUMBER_LITERAL: 'NumberLiteral',
    BOOLEAN_LITERAL: 'BooleanLiteral',
    NULL_LITERAL: 'NullLiteral',
    UNDEFINED_LITERAL: 'UndefinedLiteral',
    REGEX_LITERAL: 'RegexLiteral',
    TEMPLATE_LITERAL: 'TemplateLiteral',
    ARRAY_LITERAL: 'ArrayLiteral',
    OBJECT_LITERAL: 'ObjectLiteral',

    // Identifiers
    IDENTIFIER: 'Identifier',
    THIS: 'ThisExpression',

    // Expressions
    MEMBER_EXPRESSION: 'MemberExpression',
    CALL_EXPRESSION: 'CallExpression',
    NEW_EXPRESSION: 'NewExpression',
    BINARY_EXPRESSION: 'BinaryExpression',
    UNARY_EXPRESSION: 'UnaryExpression',
    CONDITIONAL_EXPRESSION: 'ConditionalExpression',
    ASSIGNMENT_EXPRESSION: 'AssignmentExpression',
    SEQUENCE_EXPRESSION: 'SequenceExpression',

    // Functions
    ARROW_FUNCTION: 'ArrowFunction',
    FUNCTION_EXPRESSION: 'FunctionExpression',
    FUNCTION_DECLARATION: 'FunctionDeclaration',

    // Classes
    CLASS_EXPRESSION: 'ClassExpression',
    CLASS_DECLARATION: 'ClassDeclaration',
    CLASS_BODY: 'ClassBody',
    METHOD_DEFINITION: 'MethodDefinition',
    PROPERTY_DEFINITION: 'PropertyDefinition',

    // Statements (for basic support)
    VARIABLE_DECLARATION: 'VariableDeclaration',
    VARIABLE_DECLARATOR: 'VariableDeclarator',
    RETURN_STATEMENT: 'ReturnStatement',
    BLOCK_STATEMENT: 'BlockStatement',
    EXPRESSION_STATEMENT: 'ExpressionStatement',

    // Parameters
    PARAMETER: 'Parameter',
    REST_ELEMENT: 'RestElement',
    SPREAD_ELEMENT: 'SpreadElement',

    // Property
    PROPERTY: 'Property',

    // Program (root)
    PROGRAM: 'Program'
  });

  // ============================================
  // Base Node Class
  // ============================================

  /**
   * Base AST node class
   * @class
   * @param {string} type - Node type
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function Node(type, start, end) {
    this.type = type;
    this.start = start !== undefined ? start : -1;
    this.end = end !== undefined ? end : -1;
  }

  /**
   * Clone this node (shallow)
   * @returns {Node}
   */
  Node.prototype.clone = function() {
    var cloned = Object.create(Object.getPrototypeOf(this));
    Object.assign(cloned, this);
    return cloned;
  };

  // ============================================
  // Literal Nodes
  // ============================================

  /**
   * String literal node
   * @class
   * @extends Node
   * @param {string} value - String value
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function StringLiteral(value, start, end) {
    Node.call(this, NodeType.STRING_LITERAL, start, end);
    this.value = value;
  }
  StringLiteral.prototype = Object.create(Node.prototype);
  StringLiteral.prototype.constructor = StringLiteral;

  /**
   * Number literal node
   * @class
   * @extends Node
   * @param {number} value - Numeric value
   * @param {string} raw - Raw string value
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function NumberLiteral(value, raw, start, end) {
    Node.call(this, NodeType.NUMBER_LITERAL, start, end);
    this.value = value;
    this.raw = raw;
  }
  NumberLiteral.prototype = Object.create(Node.prototype);
  NumberLiteral.prototype.constructor = NumberLiteral;

  /**
   * Boolean literal node
   * @class
   * @extends Node
   * @param {boolean} value - Boolean value
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function BooleanLiteral(value, start, end) {
    Node.call(this, NodeType.BOOLEAN_LITERAL, start, end);
    this.value = value;
  }
  BooleanLiteral.prototype = Object.create(Node.prototype);
  BooleanLiteral.prototype.constructor = BooleanLiteral;

  /**
   * Null literal node
   * @class
   * @extends Node
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function NullLiteral(start, end) {
    Node.call(this, NodeType.NULL_LITERAL, start, end);
    this.value = null;
  }
  NullLiteral.prototype = Object.create(Node.prototype);
  NullLiteral.prototype.constructor = NullLiteral;

  /**
   * Undefined literal node
   * @class
   * @extends Node
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function UndefinedLiteral(start, end) {
    Node.call(this, NodeType.UNDEFINED_LITERAL, start, end);
    this.value = undefined;
  }
  UndefinedLiteral.prototype = Object.create(Node.prototype);
  UndefinedLiteral.prototype.constructor = UndefinedLiteral;

  /**
   * Template literal node
   * @class
   * @extends Node
   * @param {string} value - Template string
   * @param {Node[]} expressions - Template expressions
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function TemplateLiteral(value, expressions, start, end) {
    Node.call(this, NodeType.TEMPLATE_LITERAL, start, end);
    this.value = value;
    this.expressions = expressions || [];
  }
  TemplateLiteral.prototype = Object.create(Node.prototype);
  TemplateLiteral.prototype.constructor = TemplateLiteral;

  /**
   * Array literal node
   * @class
   * @extends Node
   * @param {Node[]} elements - Array elements
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function ArrayLiteral(elements, start, end) {
    Node.call(this, NodeType.ARRAY_LITERAL, start, end);
    this.elements = elements || [];
  }
  ArrayLiteral.prototype = Object.create(Node.prototype);
  ArrayLiteral.prototype.constructor = ArrayLiteral;

  /**
   * Object literal node
   * @class
   * @extends Node
   * @param {Property[]} properties - Object properties
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function ObjectLiteral(properties, start, end) {
    Node.call(this, NodeType.OBJECT_LITERAL, start, end);
    this.properties = properties || [];
  }
  ObjectLiteral.prototype = Object.create(Node.prototype);
  ObjectLiteral.prototype.constructor = ObjectLiteral;

  /**
   * Property node (for object literals)
   * @class
   * @extends Node
   * @param {Node} key - Property key
   * @param {Node} value - Property value
   * @param {boolean} computed - Is key computed [expr]
   * @param {boolean} shorthand - Is shorthand { foo }
   * @param {string} kind - 'init', 'get', or 'set'
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function Property(key, value, computed, shorthand, kind, start, end) {
    Node.call(this, NodeType.PROPERTY, start, end);
    this.key = key;
    this.value = value;
    this.computed = computed || false;
    this.shorthand = shorthand || false;
    this.kind = kind || 'init';
  }
  Property.prototype = Object.create(Node.prototype);
  Property.prototype.constructor = Property;

  // ============================================
  // Identifier Nodes
  // ============================================

  /**
   * Identifier node
   * @class
   * @extends Node
   * @param {string} name - Identifier name
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function Identifier(name, start, end) {
    Node.call(this, NodeType.IDENTIFIER, start, end);
    this.name = name;
  }
  Identifier.prototype = Object.create(Node.prototype);
  Identifier.prototype.constructor = Identifier;

  /**
   * This expression node
   * @class
   * @extends Node
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function ThisExpression(start, end) {
    Node.call(this, NodeType.THIS, start, end);
  }
  ThisExpression.prototype = Object.create(Node.prototype);
  ThisExpression.prototype.constructor = ThisExpression;

  // ============================================
  // Expression Nodes
  // ============================================

  /**
   * Member expression node (obj.prop or obj[expr])
   * @class
   * @extends Node
   * @param {Node} object - Object being accessed
   * @param {Node} property - Property being accessed
   * @param {boolean} computed - Is bracket notation
   * @param {boolean} optional - Is optional chain ?.
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function MemberExpression(object, property, computed, optional, start, end) {
    Node.call(this, NodeType.MEMBER_EXPRESSION, start, end);
    this.object = object;
    this.property = property;
    this.computed = computed || false;
    this.optional = optional || false;
  }
  MemberExpression.prototype = Object.create(Node.prototype);
  MemberExpression.prototype.constructor = MemberExpression;

  /**
   * Call expression node
   * @class
   * @extends Node
   * @param {Node} callee - Function being called
   * @param {Node[]} arguments - Call arguments
   * @param {boolean} optional - Is optional call ?.()
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function CallExpression(callee, args, optional, start, end) {
    Node.call(this, NodeType.CALL_EXPRESSION, start, end);
    this.callee = callee;
    this.arguments = args || [];
    this.optional = optional || false;
  }
  CallExpression.prototype = Object.create(Node.prototype);
  CallExpression.prototype.constructor = CallExpression;

  /**
   * New expression node
   * @class
   * @extends Node
   * @param {Node} callee - Constructor being called
   * @param {Node[]} arguments - Constructor arguments
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function NewExpression(callee, args, start, end) {
    Node.call(this, NodeType.NEW_EXPRESSION, start, end);
    this.callee = callee;
    this.arguments = args || [];
  }
  NewExpression.prototype = Object.create(Node.prototype);
  NewExpression.prototype.constructor = NewExpression;

  /**
   * Binary expression node
   * @class
   * @extends Node
   * @param {string} operator - Operator string
   * @param {Node} left - Left operand
   * @param {Node} right - Right operand
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function BinaryExpression(operator, left, right, start, end) {
    Node.call(this, NodeType.BINARY_EXPRESSION, start, end);
    this.operator = operator;
    this.left = left;
    this.right = right;
  }
  BinaryExpression.prototype = Object.create(Node.prototype);
  BinaryExpression.prototype.constructor = BinaryExpression;

  /**
   * Unary expression node
   * @class
   * @extends Node
   * @param {string} operator - Operator string
   * @param {Node} argument - Operand
   * @param {boolean} prefix - Is prefix operator
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function UnaryExpression(operator, argument, prefix, start, end) {
    Node.call(this, NodeType.UNARY_EXPRESSION, start, end);
    this.operator = operator;
    this.argument = argument;
    this.prefix = prefix !== undefined ? prefix : true;
  }
  UnaryExpression.prototype = Object.create(Node.prototype);
  UnaryExpression.prototype.constructor = UnaryExpression;

  /**
   * Conditional expression node (ternary)
   * @class
   * @extends Node
   * @param {Node} test - Condition
   * @param {Node} consequent - True branch
   * @param {Node} alternate - False branch
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function ConditionalExpression(test, consequent, alternate, start, end) {
    Node.call(this, NodeType.CONDITIONAL_EXPRESSION, start, end);
    this.test = test;
    this.consequent = consequent;
    this.alternate = alternate;
  }
  ConditionalExpression.prototype = Object.create(Node.prototype);
  ConditionalExpression.prototype.constructor = ConditionalExpression;

  /**
   * Assignment expression node
   * @class
   * @extends Node
   * @param {string} operator - Assignment operator
   * @param {Node} left - Left side
   * @param {Node} right - Right side
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function AssignmentExpression(operator, left, right, start, end) {
    Node.call(this, NodeType.ASSIGNMENT_EXPRESSION, start, end);
    this.operator = operator;
    this.left = left;
    this.right = right;
  }
  AssignmentExpression.prototype = Object.create(Node.prototype);
  AssignmentExpression.prototype.constructor = AssignmentExpression;

  // ============================================
  // Function Nodes
  // ============================================

  /**
   * Parameter node
   * @class
   * @extends Node
   * @param {string|Node} name - Parameter name or pattern
   * @param {Node} defaultValue - Default value
   * @param {boolean} rest - Is rest parameter
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function Parameter(name, defaultValue, rest, start, end) {
    Node.call(this, NodeType.PARAMETER, start, end);
    this.name = name;
    this.defaultValue = defaultValue || null;
    this.rest = rest || false;
  }
  Parameter.prototype = Object.create(Node.prototype);
  Parameter.prototype.constructor = Parameter;

  /**
   * Arrow function node
   * @class
   * @extends Node
   * @param {Parameter[]} params - Parameters
   * @param {Node} body - Function body
   * @param {boolean} expression - Is expression body (no braces)
   * @param {boolean} async - Is async function
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function ArrowFunction(params, body, expression, async, start, end) {
    Node.call(this, NodeType.ARROW_FUNCTION, start, end);
    this.params = params || [];
    this.body = body;
    this.expression = expression || false;
    this.async = async || false;
  }
  ArrowFunction.prototype = Object.create(Node.prototype);
  ArrowFunction.prototype.constructor = ArrowFunction;

  /**
   * Function expression node
   * @class
   * @extends Node
   * @param {Identifier} id - Function name (optional)
   * @param {Parameter[]} params - Parameters
   * @param {Node} body - Function body
   * @param {boolean} async - Is async function
   * @param {boolean} generator - Is generator function
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function FunctionExpression(id, params, body, async, generator, start, end) {
    Node.call(this, NodeType.FUNCTION_EXPRESSION, start, end);
    this.id = id || null;
    this.params = params || [];
    this.body = body;
    this.async = async || false;
    this.generator = generator || false;
  }
  FunctionExpression.prototype = Object.create(Node.prototype);
  FunctionExpression.prototype.constructor = FunctionExpression;

  /**
   * Function declaration node
   * @class
   * @extends Node
   */
  function FunctionDeclaration(id, params, body, async, generator, start, end) {
    Node.call(this, NodeType.FUNCTION_DECLARATION, start, end);
    this.id = id;
    this.params = params || [];
    this.body = body;
    this.async = async || false;
    this.generator = generator || false;
  }
  FunctionDeclaration.prototype = Object.create(Node.prototype);
  FunctionDeclaration.prototype.constructor = FunctionDeclaration;

  // ============================================
  // Class Nodes
  // ============================================

  /**
   * Class expression/declaration node
   * @class
   * @extends Node
   * @param {Identifier} id - Class name (optional for expressions)
   * @param {Node} superClass - Parent class
   * @param {ClassBody} body - Class body
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function ClassExpression(id, superClass, body, start, end) {
    Node.call(this, NodeType.CLASS_EXPRESSION, start, end);
    this.id = id || null;
    this.superClass = superClass || null;
    this.body = body;
  }
  ClassExpression.prototype = Object.create(Node.prototype);
  ClassExpression.prototype.constructor = ClassExpression;

  /**
   * Class declaration node
   * @class
   * @extends Node
   */
  function ClassDeclaration(id, superClass, body, start, end) {
    Node.call(this, NodeType.CLASS_DECLARATION, start, end);
    this.id = id;
    this.superClass = superClass || null;
    this.body = body;
  }
  ClassDeclaration.prototype = Object.create(Node.prototype);
  ClassDeclaration.prototype.constructor = ClassDeclaration;

  /**
   * Class body node
   * @class
   * @extends Node
   * @param {Node[]} body - Class members
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function ClassBody(body, start, end) {
    Node.call(this, NodeType.CLASS_BODY, start, end);
    this.body = body || [];
  }
  ClassBody.prototype = Object.create(Node.prototype);
  ClassBody.prototype.constructor = ClassBody;

  /**
   * Method definition node
   * @class
   * @extends Node
   * @param {Node} key - Method name
   * @param {Node} value - Method function
   * @param {string} kind - 'method', 'constructor', 'get', or 'set'
   * @param {boolean} computed - Is key computed
   * @param {boolean} static - Is static method
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function MethodDefinition(key, value, kind, computed, isStatic, start, end) {
    Node.call(this, NodeType.METHOD_DEFINITION, start, end);
    this.key = key;
    this.value = value;
    this.kind = kind || 'method';
    this.computed = computed || false;
    this.static = isStatic || false;
  }
  MethodDefinition.prototype = Object.create(Node.prototype);
  MethodDefinition.prototype.constructor = MethodDefinition;

  /**
   * Property definition node (class fields)
   * @class
   * @extends Node
   * @param {Node} key - Property name
   * @param {Node} value - Initial value
   * @param {boolean} computed - Is key computed
   * @param {boolean} static - Is static property
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function PropertyDefinition(key, value, computed, isStatic, start, end) {
    Node.call(this, NodeType.PROPERTY_DEFINITION, start, end);
    this.key = key;
    this.value = value;
    this.computed = computed || false;
    this.static = isStatic || false;
  }
  PropertyDefinition.prototype = Object.create(Node.prototype);
  PropertyDefinition.prototype.constructor = PropertyDefinition;

  // ============================================
  // Statement Nodes
  // ============================================

  /**
   * Variable declaration node
   * @class
   * @extends Node
   * @param {string} kind - 'var', 'let', or 'const'
   * @param {VariableDeclarator[]} declarations - Declarators
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function VariableDeclaration(kind, declarations, start, end) {
    Node.call(this, NodeType.VARIABLE_DECLARATION, start, end);
    this.kind = kind;
    this.declarations = declarations || [];
  }
  VariableDeclaration.prototype = Object.create(Node.prototype);
  VariableDeclaration.prototype.constructor = VariableDeclaration;

  /**
   * Variable declarator node
   * @class
   * @extends Node
   * @param {Node} id - Variable name/pattern
   * @param {Node} init - Initial value
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function VariableDeclarator(id, init, start, end) {
    Node.call(this, NodeType.VARIABLE_DECLARATOR, start, end);
    this.id = id;
    this.init = init || null;
  }
  VariableDeclarator.prototype = Object.create(Node.prototype);
  VariableDeclarator.prototype.constructor = VariableDeclarator;

  /**
   * Return statement node
   * @class
   * @extends Node
   * @param {Node} argument - Return value
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function ReturnStatement(argument, start, end) {
    Node.call(this, NodeType.RETURN_STATEMENT, start, end);
    this.argument = argument || null;
  }
  ReturnStatement.prototype = Object.create(Node.prototype);
  ReturnStatement.prototype.constructor = ReturnStatement;

  /**
   * Block statement node
   * @class
   * @extends Node
   * @param {Node[]} body - Statements
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function BlockStatement(body, start, end) {
    Node.call(this, NodeType.BLOCK_STATEMENT, start, end);
    this.body = body || [];
  }
  BlockStatement.prototype = Object.create(Node.prototype);
  BlockStatement.prototype.constructor = BlockStatement;

  /**
   * Expression statement node
   * @class
   * @extends Node
   * @param {Node} expression - Expression
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function ExpressionStatement(expression, start, end) {
    Node.call(this, NodeType.EXPRESSION_STATEMENT, start, end);
    this.expression = expression;
  }
  ExpressionStatement.prototype = Object.create(Node.prototype);
  ExpressionStatement.prototype.constructor = ExpressionStatement;

  /**
   * Spread element node
   * @class
   * @extends Node
   * @param {Node} argument - Spread argument
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function SpreadElement(argument, start, end) {
    Node.call(this, NodeType.SPREAD_ELEMENT, start, end);
    this.argument = argument;
  }
  SpreadElement.prototype = Object.create(Node.prototype);
  SpreadElement.prototype.constructor = SpreadElement;

  /**
   * Program node (root)
   * @class
   * @extends Node
   * @param {Node[]} body - Top-level statements
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  function Program(body, start, end) {
    Node.call(this, NodeType.PROGRAM, start, end);
    this.body = body || [];
  }
  Program.prototype = Object.create(Node.prototype);
  Program.prototype.constructor = Program;

  // ============================================
  // Export
  // ============================================

  CodeEditor.NodeType = NodeType;
  CodeEditor.Node = Node;

  // Literals
  CodeEditor.StringLiteral = StringLiteral;
  CodeEditor.NumberLiteral = NumberLiteral;
  CodeEditor.BooleanLiteral = BooleanLiteral;
  CodeEditor.NullLiteral = NullLiteral;
  CodeEditor.UndefinedLiteral = UndefinedLiteral;
  CodeEditor.TemplateLiteral = TemplateLiteral;
  CodeEditor.ArrayLiteral = ArrayLiteral;
  CodeEditor.ObjectLiteral = ObjectLiteral;
  CodeEditor.Property = Property;

  // Identifiers
  CodeEditor.Identifier = Identifier;
  CodeEditor.ThisExpression = ThisExpression;

  // Expressions
  CodeEditor.MemberExpression = MemberExpression;
  CodeEditor.CallExpression = CallExpression;
  CodeEditor.NewExpression = NewExpression;
  CodeEditor.BinaryExpression = BinaryExpression;
  CodeEditor.UnaryExpression = UnaryExpression;
  CodeEditor.ConditionalExpression = ConditionalExpression;
  CodeEditor.AssignmentExpression = AssignmentExpression;

  // Functions
  CodeEditor.Parameter = Parameter;
  CodeEditor.ArrowFunction = ArrowFunction;
  CodeEditor.FunctionExpression = FunctionExpression;
  CodeEditor.FunctionDeclaration = FunctionDeclaration;

  // Classes
  CodeEditor.ClassExpression = ClassExpression;
  CodeEditor.ClassDeclaration = ClassDeclaration;
  CodeEditor.ClassBody = ClassBody;
  CodeEditor.MethodDefinition = MethodDefinition;
  CodeEditor.PropertyDefinition = PropertyDefinition;

  // Statements
  CodeEditor.VariableDeclaration = VariableDeclaration;
  CodeEditor.VariableDeclarator = VariableDeclarator;
  CodeEditor.ReturnStatement = ReturnStatement;
  CodeEditor.BlockStatement = BlockStatement;
  CodeEditor.ExpressionStatement = ExpressionStatement;
  CodeEditor.SpreadElement = SpreadElement;
  CodeEditor.Program = Program;

})(window.CodeEditor = window.CodeEditor || {});
