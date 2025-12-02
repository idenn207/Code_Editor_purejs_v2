/**
 * @fileoverview AST Node type definitions
 * @module language/ASTNodes
 */

// ============================================
// Node Types
// ============================================

export const NodeType = Object.freeze({
  // Program
  PROGRAM: 'Program',

  // Declarations
  VARIABLE_DECLARATION: 'VariableDeclaration',
  VARIABLE_DECLARATOR: 'VariableDeclarator',
  FUNCTION_DECLARATION: 'FunctionDeclaration',
  CLASS_DECLARATION: 'ClassDeclaration',
  CLASS_BODY: 'ClassBody',
  METHOD_DEFINITION: 'MethodDefinition',

  // Expressions
  IDENTIFIER: 'Identifier',
  LITERAL: 'Literal',
  OBJECT_EXPRESSION: 'ObjectExpression',
  ARRAY_EXPRESSION: 'ArrayExpression',
  FUNCTION_EXPRESSION: 'FunctionExpression',
  ARROW_FUNCTION: 'ArrowFunctionExpression',
  CALL_EXPRESSION: 'CallExpression',
  NEW_EXPRESSION: 'NewExpression',
  MEMBER_EXPRESSION: 'MemberExpression',
  BINARY_EXPRESSION: 'BinaryExpression',
  UNARY_EXPRESSION: 'UnaryExpression',
  UPDATE_EXPRESSION: 'UpdateExpression',
  ASSIGNMENT_EXPRESSION: 'AssignmentExpression',
  LOGICAL_EXPRESSION: 'LogicalExpression',
  CONDITIONAL_EXPRESSION: 'ConditionalExpression',
  SEQUENCE_EXPRESSION: 'SequenceExpression',
  THIS_EXPRESSION: 'ThisExpression',

  // Properties
  PROPERTY: 'Property',
  SPREAD_ELEMENT: 'SpreadElement',
  REST_ELEMENT: 'RestElement',

  // Patterns
  ARRAY_PATTERN: 'ArrayPattern',
  OBJECT_PATTERN: 'ObjectPattern',
  ASSIGNMENT_PATTERN: 'AssignmentPattern',

  // Statements
  BLOCK_STATEMENT: 'BlockStatement',
  EXPRESSION_STATEMENT: 'ExpressionStatement',
  EMPTY_STATEMENT: 'EmptyStatement',
  IF_STATEMENT: 'IfStatement',
  FOR_STATEMENT: 'ForStatement',
  FOR_IN_STATEMENT: 'ForInStatement',
  FOR_OF_STATEMENT: 'ForOfStatement',
  WHILE_STATEMENT: 'WhileStatement',
  DO_WHILE_STATEMENT: 'DoWhileStatement',
  SWITCH_STATEMENT: 'SwitchStatement',
  SWITCH_CASE: 'SwitchCase',
  RETURN_STATEMENT: 'ReturnStatement',
  THROW_STATEMENT: 'ThrowStatement',
  TRY_STATEMENT: 'TryStatement',
  CATCH_CLAUSE: 'CatchClause',
  BREAK_STATEMENT: 'BreakStatement',
  CONTINUE_STATEMENT: 'ContinueStatement',

  // Import/Export
  IMPORT_DECLARATION: 'ImportDeclaration',
  IMPORT_SPECIFIER: 'ImportSpecifier',
  IMPORT_DEFAULT_SPECIFIER: 'ImportDefaultSpecifier',
  EXPORT_DECLARATION: 'ExportDeclaration',
  EXPORT_NAMED_DECLARATION: 'ExportNamedDeclaration',
  EXPORT_DEFAULT_DECLARATION: 'ExportDefaultDeclaration',
});

// ============================================
// Base AST Node
// ============================================

/**
 * Base class for all AST nodes
 */
export class ASTNode {
  constructor(type, props = {}) {
    this.type = type;
    this.start = props.start ?? 0;
    this.end = props.end ?? 0;
    this.loc = props.loc ?? null;

    // Copy additional properties
    for (const [key, value] of Object.entries(props)) {
      if (key !== 'start' && key !== 'end' && key !== 'loc') {
        this[key] = value;
      }
    }
  }
}

// ============================================
// AST Factory
// ============================================

/**
 * Factory functions for creating AST nodes
 */
export const AST = {
  // ----------------------------------------
  // Program
  // ----------------------------------------

  program(body, loc = {}) {
    return new ASTNode(NodeType.PROGRAM, { body, ...loc });
  },

  // ----------------------------------------
  // Declarations
  // ----------------------------------------

  variableDeclaration(kind, declarations, loc = {}) {
    return new ASTNode(NodeType.VARIABLE_DECLARATION, {
      kind, // 'const' | 'let' | 'var'
      declarations,
      ...loc,
    });
  },

  variableDeclarator(id, init = null, loc = {}) {
    return new ASTNode(NodeType.VARIABLE_DECLARATOR, {
      id,
      init,
      ...loc,
    });
  },

  functionDeclaration(id, params, body, loc = {}) {
    return new ASTNode(NodeType.FUNCTION_DECLARATION, {
      id,
      params,
      body,
      async: false,
      generator: false,
      ...loc,
    });
  },

  classDeclaration(id, superClass, body, loc = {}) {
    return new ASTNode(NodeType.CLASS_DECLARATION, {
      id,
      superClass,
      body,
      ...loc,
    });
  },

  classBody(body, loc = {}) {
    return new ASTNode(NodeType.CLASS_BODY, { body, ...loc });
  },

  methodDefinition(key, value, kind = 'method', computed = false, isStatic = false, loc = {}) {
    return new ASTNode(NodeType.METHOD_DEFINITION, {
      key,
      value,
      kind, // 'constructor' | 'method' | 'get' | 'set'
      computed,
      static: isStatic,
      ...loc,
    });
  },

  // ----------------------------------------
  // Expressions
  // ----------------------------------------

  identifier(name, loc = {}) {
    return new ASTNode(NodeType.IDENTIFIER, { name, ...loc });
  },

  literal(value, raw = null, loc = {}) {
    return new ASTNode(NodeType.LITERAL, {
      value,
      raw: raw ?? String(value),
      ...loc,
    });
  },

  objectExpression(properties, loc = {}) {
    return new ASTNode(NodeType.OBJECT_EXPRESSION, { properties, ...loc });
  },

  property(key, value, kind = 'init', method = false, shorthand = false, computed = false, loc = {}) {
    return new ASTNode(NodeType.PROPERTY, {
      key,
      value,
      kind,
      method,
      shorthand,
      computed,
      ...loc,
    });
  },

  arrayExpression(elements, loc = {}) {
    return new ASTNode(NodeType.ARRAY_EXPRESSION, { elements, ...loc });
  },

  functionExpression(id, params, body, loc = {}) {
    return new ASTNode(NodeType.FUNCTION_EXPRESSION, {
      id,
      params,
      body,
      async: false,
      generator: false,
      ...loc,
    });
  },

  arrowFunctionExpression(params, body, expression = false, loc = {}) {
    return new ASTNode(NodeType.ARROW_FUNCTION, {
      params,
      body,
      expression, // true if body is expression, false if block
      async: false,
      ...loc,
    });
  },

  callExpression(callee, args, loc = {}) {
    return new ASTNode(NodeType.CALL_EXPRESSION, {
      callee,
      arguments: args,
      ...loc,
    });
  },

  newExpression(callee, args, loc = {}) {
    return new ASTNode(NodeType.NEW_EXPRESSION, {
      callee,
      arguments: args,
      ...loc,
    });
  },

  memberExpression(object, property, computed = false, optional = false, loc = {}) {
    return new ASTNode(NodeType.MEMBER_EXPRESSION, {
      object,
      property,
      computed,
      optional,
      ...loc,
    });
  },

  binaryExpression(operator, left, right, loc = {}) {
    return new ASTNode(NodeType.BINARY_EXPRESSION, {
      operator,
      left,
      right,
      ...loc,
    });
  },

  unaryExpression(operator, argument, prefix = true, loc = {}) {
    return new ASTNode(NodeType.UNARY_EXPRESSION, {
      operator,
      argument,
      prefix,
      ...loc,
    });
  },

  updateExpression(operator, argument, prefix = false, loc = {}) {
    return new ASTNode(NodeType.UPDATE_EXPRESSION, {
      operator,
      argument,
      prefix,
      ...loc,
    });
  },

  assignmentExpression(operator, left, right, loc = {}) {
    return new ASTNode(NodeType.ASSIGNMENT_EXPRESSION, {
      operator,
      left,
      right,
      ...loc,
    });
  },

  logicalExpression(operator, left, right, loc = {}) {
    return new ASTNode(NodeType.LOGICAL_EXPRESSION, {
      operator,
      left,
      right,
      ...loc,
    });
  },

  conditionalExpression(test, consequent, alternate, loc = {}) {
    return new ASTNode(NodeType.CONDITIONAL_EXPRESSION, {
      test,
      consequent,
      alternate,
      ...loc,
    });
  },

  thisExpression(loc = {}) {
    return new ASTNode(NodeType.THIS_EXPRESSION, { ...loc });
  },

  // ----------------------------------------
  // Statements
  // ----------------------------------------

  blockStatement(body, loc = {}) {
    return new ASTNode(NodeType.BLOCK_STATEMENT, { body, ...loc });
  },

  expressionStatement(expression, loc = {}) {
    return new ASTNode(NodeType.EXPRESSION_STATEMENT, { expression, ...loc });
  },

  emptyStatement(loc = {}) {
    return new ASTNode(NodeType.EMPTY_STATEMENT, { ...loc });
  },

  ifStatement(test, consequent, alternate = null, loc = {}) {
    return new ASTNode(NodeType.IF_STATEMENT, {
      test,
      consequent,
      alternate,
      ...loc,
    });
  },

  forStatement(init, test, update, body, loc = {}) {
    return new ASTNode(NodeType.FOR_STATEMENT, {
      init,
      test,
      update,
      body,
      ...loc,
    });
  },

  forInStatement(left, right, body, loc = {}) {
    return new ASTNode(NodeType.FOR_IN_STATEMENT, {
      left,
      right,
      body,
      ...loc,
    });
  },

  forOfStatement(left, right, body, loc = {}) {
    return new ASTNode(NodeType.FOR_OF_STATEMENT, {
      left,
      right,
      body,
      await: false,
      ...loc,
    });
  },

  whileStatement(test, body, loc = {}) {
    return new ASTNode(NodeType.WHILE_STATEMENT, {
      test,
      body,
      ...loc,
    });
  },

  doWhileStatement(body, test, loc = {}) {
    return new ASTNode(NodeType.DO_WHILE_STATEMENT, {
      body,
      test,
      ...loc,
    });
  },

  returnStatement(argument = null, loc = {}) {
    return new ASTNode(NodeType.RETURN_STATEMENT, {
      argument,
      ...loc,
    });
  },

  throwStatement(argument, loc = {}) {
    return new ASTNode(NodeType.THROW_STATEMENT, {
      argument,
      ...loc,
    });
  },

  tryStatement(block, handler = null, finalizer = null, loc = {}) {
    return new ASTNode(NodeType.TRY_STATEMENT, {
      block,
      handler,
      finalizer,
      ...loc,
    });
  },

  catchClause(param, body, loc = {}) {
    return new ASTNode(NodeType.CATCH_CLAUSE, {
      param,
      body,
      ...loc,
    });
  },

  breakStatement(label = null, loc = {}) {
    return new ASTNode(NodeType.BREAK_STATEMENT, { label, ...loc });
  },

  continueStatement(label = null, loc = {}) {
    return new ASTNode(NodeType.CONTINUE_STATEMENT, { label, ...loc });
  },

  switchStatement(discriminant, cases, loc = {}) {
    return new ASTNode(NodeType.SWITCH_STATEMENT, {
      discriminant,
      cases,
      ...loc,
    });
  },

  switchCase(test, consequent, loc = {}) {
    return new ASTNode(NodeType.SWITCH_CASE, {
      test, // null for default case
      consequent,
      ...loc,
    });
  },
};

// ============================================
// AST Visitor
// ============================================

/**
 * Base visitor class for AST traversal
 */
export class ASTVisitor {
  visit(node) {
    if (!node) return;

    const methodName = `visit${node.type}`;
    if (typeof this[methodName] === 'function') {
      return this[methodName](node);
    }

    return this.visitDefault(node);
  }

  visitDefault(node) {
    // Override in subclass for default behavior
  }

  visitChildren(node) {
    for (const key of Object.keys(node)) {
      const child = node[key];

      if (child && typeof child === 'object') {
        if (Array.isArray(child)) {
          for (const item of child) {
            if (item && item.type) {
              this.visit(item);
            }
          }
        } else if (child.type) {
          this.visit(child);
        }
      }
    }
  }
}

// ============================================
// AST Utilities
// ============================================

/**
 * Get all identifiers from a node (for destructuring patterns)
 * @param {ASTNode} node - Pattern or identifier node
 * @returns {Array<ASTNode>} - Array of identifier nodes
 */
export function getIdentifiers(node) {
  if (!node) return [];

  switch (node.type) {
    case NodeType.IDENTIFIER:
      return [node];

    case NodeType.OBJECT_PATTERN:
      return node.properties.flatMap((prop) => getIdentifiers(prop.value));

    case NodeType.ARRAY_PATTERN:
      return node.elements.filter(Boolean).flatMap(getIdentifiers);

    case NodeType.ASSIGNMENT_PATTERN:
      return getIdentifiers(node.left);

    case NodeType.REST_ELEMENT:
      return getIdentifiers(node.argument);

    default:
      return [];
  }
}

/**
 * Check if node is an expression
 * @param {ASTNode} node
 * @returns {boolean}
 */
export function isExpression(node) {
  if (!node) return false;

  return [
    NodeType.IDENTIFIER,
    NodeType.LITERAL,
    NodeType.OBJECT_EXPRESSION,
    NodeType.ARRAY_EXPRESSION,
    NodeType.FUNCTION_EXPRESSION,
    NodeType.ARROW_FUNCTION,
    NodeType.CALL_EXPRESSION,
    NodeType.NEW_EXPRESSION,
    NodeType.MEMBER_EXPRESSION,
    NodeType.BINARY_EXPRESSION,
    NodeType.UNARY_EXPRESSION,
    NodeType.UPDATE_EXPRESSION,
    NodeType.ASSIGNMENT_EXPRESSION,
    NodeType.LOGICAL_EXPRESSION,
    NodeType.CONDITIONAL_EXPRESSION,
    NodeType.THIS_EXPRESSION,
  ].includes(node.type);
}
