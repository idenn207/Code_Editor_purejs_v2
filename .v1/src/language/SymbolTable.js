/**
 * @fileoverview Symbol table with scope hierarchy
 * @module language/SymbolTable
 */

import { getIdentifiers, NodeType } from './ASTNodes.js';

// ============================================
// Symbol Kinds
// ============================================

export const SymbolKind = Object.freeze({
  VARIABLE: 'variable',
  FUNCTION: 'function',
  CLASS: 'class',
  PARAMETER: 'parameter',
  PROPERTY: 'property',
  METHOD: 'method',
  GETTER: 'getter',
  SETTER: 'setter',
  IMPORT: 'import',
});

// ============================================
// Symbol Class
// ============================================

/**
 * Represents a declared symbol (variable, function, class, etc.)
 */
export class Symbol {
  constructor(name, kind, options = {}) {
    this.name = name;
    this.kind = kind;
    this.type = options.type || null;
    this.node = options.node || null;
    this.scope = options.scope || null;
    this.members = options.members || [];
    this.documentation = options.documentation || null;

    // For functions
    this.parameters = options.parameters || [];
    this.returnType = options.returnType || null;
  }

  /**
   * Add a member (property/method) to this symbol
   */
  addMember(member) {
    this.members.push(member);
  }

  /**
   * Find a member by name
   */
  getMember(name) {
    return this.members.find((m) => m.name === name);
  }

  /**
   * Get all members of a specific kind
   */
  getMembersByKind(kind) {
    return this.members.filter((m) => m.kind === kind);
  }
}

// ============================================
// Scope Class
// ============================================

/**
 * Represents a lexical scope
 */
export class Scope {
  constructor(parent = null, type = 'block') {
    this.parent = parent;
    this.type = type; // 'global' | 'function' | 'block' | 'class'
    this.symbols = new Map();
    this.children = [];

    if (parent) {
      parent.children.push(this);
    }
  }

  /**
   * Define a symbol in this scope
   */
  define(symbol) {
    symbol.scope = this;
    this.symbols.set(symbol.name, symbol);
    return symbol;
  }

  /**
   * Resolve a symbol by walking up the scope chain
   */
  resolve(name) {
    if (this.symbols.has(name)) {
      return this.symbols.get(name);
    }

    if (this.parent) {
      return this.parent.resolve(name);
    }

    return null;
  }

  /**
   * Resolve symbol only in this scope (no parent lookup)
   */
  resolveLocal(name) {
    return this.symbols.get(name) || null;
  }

  /**
   * Get all symbols visible from this scope
   */
  getAllVisibleSymbols() {
    const symbols = new Map();

    // Collect from this scope and parents
    let scope = this;
    while (scope) {
      for (const [name, symbol] of scope.symbols) {
        if (!symbols.has(name)) {
          symbols.set(name, symbol);
        }
      }
      scope = scope.parent;
    }

    return Array.from(symbols.values());
  }

  /**
   * Get symbols defined in this scope only
   */
  getLocalSymbols() {
    return Array.from(this.symbols.values());
  }
}

// ============================================
// Symbol Table Class
// ============================================

/**
 * Symbol table managing all scopes and symbols
 */
export class SymbolTable {
  constructor() {
    this.globalScope = new Scope(null, 'global');
    this.currentScope = this.globalScope;
    this._allSymbols = [];

    // Add built-in globals
    this._addBuiltins();
  }

  // ----------------------------------------
  // Built-in Symbols
  // ----------------------------------------

  _addBuiltins() {
    // Global objects
    const globalObjects = [
      { name: 'console', members: ['log', 'error', 'warn', 'info', 'debug', 'table', 'clear', 'time', 'timeEnd', 'assert', 'count', 'group', 'groupEnd'] },
      {
        name: 'window',
        members: [
          'document',
          'location',
          'history',
          'navigator',
          'localStorage',
          'sessionStorage',
          'alert',
          'confirm',
          'prompt',
          'setTimeout',
          'setInterval',
          'clearTimeout',
          'clearInterval',
          'fetch',
          'requestAnimationFrame',
        ],
      },
      {
        name: 'document',
        members: [
          'getElementById',
          'querySelector',
          'querySelectorAll',
          'createElement',
          'body',
          'head',
          'documentElement',
          'addEventListener',
          'removeEventListener',
        ],
      },
      {
        name: 'Math',
        members: ['abs', 'ceil', 'floor', 'round', 'max', 'min', 'random', 'sqrt', 'pow', 'sin', 'cos', 'tan', 'PI', 'E', 'log', 'exp', 'sign', 'trunc'],
      },
      { name: 'JSON', members: ['parse', 'stringify'] },
      {
        name: 'Object',
        members: ['keys', 'values', 'entries', 'assign', 'freeze', 'seal', 'create', 'defineProperty', 'getOwnPropertyNames', 'hasOwnProperty'],
      },
      { name: 'Array', members: ['from', 'isArray', 'of'] },
      { name: 'String', members: ['fromCharCode', 'fromCodePoint', 'raw'] },
      {
        name: 'Number',
        members: [
          'isNaN',
          'isFinite',
          'isInteger',
          'isSafeInteger',
          'parseFloat',
          'parseInt',
          'MAX_VALUE',
          'MIN_VALUE',
          'MAX_SAFE_INTEGER',
          'MIN_SAFE_INTEGER',
        ],
      },
      { name: 'Promise', members: ['all', 'race', 'resolve', 'reject', 'allSettled', 'any'] },
      { name: 'Map', members: ['prototype'] },
      { name: 'Set', members: ['prototype'] },
      { name: 'Date', members: ['now', 'parse', 'UTC'] },
      { name: 'RegExp', members: ['prototype'] },
    ];

    for (const obj of globalObjects) {
      const symbol = new Symbol(obj.name, SymbolKind.VARIABLE, {
        type: 'builtin',
      });

      for (const memberName of obj.members) {
        symbol.addMember(
          new Symbol(memberName, SymbolKind.METHOD, {
            type: 'builtin',
          })
        );
      }

      this.globalScope.define(symbol);
    }

    // Global functions
    const globalFunctions = [
      'setTimeout',
      'setInterval',
      'clearTimeout',
      'clearInterval',
      'parseInt',
      'parseFloat',
      'isNaN',
      'isFinite',
      'encodeURI',
      'encodeURIComponent',
      'decodeURI',
      'decodeURIComponent',
      'eval',
      'fetch',
      'alert',
      'confirm',
      'prompt',
    ];

    for (const name of globalFunctions) {
      this.globalScope.define(
        new Symbol(name, SymbolKind.FUNCTION, {
          type: 'builtin',
        })
      );
    }

    // Global classes
    const globalClasses = [
      'Error',
      'TypeError',
      'ReferenceError',
      'SyntaxError',
      'RangeError',
      'ArrayBuffer',
      'DataView',
      'Int8Array',
      'Uint8Array',
      'Int16Array',
      'Uint16Array',
      'Int32Array',
      'Uint32Array',
      'Float32Array',
      'Float64Array',
      'WeakMap',
      'WeakSet',
      'Symbol',
      'Proxy',
      'Reflect',
      'Intl',
      'WebAssembly',
    ];

    for (const name of globalClasses) {
      this.globalScope.define(
        new Symbol(name, SymbolKind.CLASS, {
          type: 'builtin',
        })
      );
    }
  }

  // ----------------------------------------
  // Scope Management
  // ----------------------------------------

  /**
   * Enter a new scope
   */
  enterScope(type = 'block') {
    this.currentScope = new Scope(this.currentScope, type);
    return this.currentScope;
  }

  /**
   * Exit current scope
   */
  exitScope() {
    if (this.currentScope.parent) {
      this.currentScope = this.currentScope.parent;
    }
    return this.currentScope;
  }

  /**
   * Define a symbol in current scope
   */
  define(name, kind, options = {}) {
    const symbol = new Symbol(name, kind, options);
    this.currentScope.define(symbol);
    this._allSymbols.push(symbol);
    return symbol;
  }

  /**
   * Resolve a symbol by name
   */
  resolve(name) {
    return this.currentScope.resolve(name);
  }

  /**
   * Get all visible symbols
   */
  getAllVisibleSymbols() {
    return this.currentScope.getAllVisibleSymbols();
  }

  // ----------------------------------------
  // AST Analysis
  // ----------------------------------------

  /**
   * Build symbol table from AST
   */
  buildFromAST(ast) {
    this._visitNode(ast);
    return this;
  }

  _visitNode(node) {
    if (!node) return;

    switch (node.type) {
      case NodeType.PROGRAM:
        for (const stmt of node.body) {
          this._visitNode(stmt);
        }
        break;

      case NodeType.VARIABLE_DECLARATION:
        this._visitVariableDeclaration(node);
        break;

      case NodeType.FUNCTION_DECLARATION:
        this._visitFunctionDeclaration(node);
        break;

      case NodeType.CLASS_DECLARATION:
        this._visitClassDeclaration(node);
        break;

      case NodeType.BLOCK_STATEMENT:
        this.enterScope('block');
        for (const stmt of node.body) {
          this._visitNode(stmt);
        }
        this.exitScope();
        break;

      case NodeType.IF_STATEMENT:
        this._visitNode(node.consequent);
        if (node.alternate) {
          this._visitNode(node.alternate);
        }
        break;

      case NodeType.FOR_STATEMENT:
        this.enterScope('block');
        if (node.init) this._visitNode(node.init);
        this._visitNode(node.body);
        this.exitScope();
        break;

      case NodeType.FOR_IN_STATEMENT:
      case NodeType.FOR_OF_STATEMENT:
        this.enterScope('block');
        this._visitNode(node.left);
        this._visitNode(node.body);
        this.exitScope();
        break;

      case NodeType.WHILE_STATEMENT:
      case NodeType.DO_WHILE_STATEMENT:
        this._visitNode(node.body);
        break;

      case NodeType.TRY_STATEMENT:
        this._visitNode(node.block);
        if (node.handler) {
          this.enterScope('block');
          if (node.handler.param) {
            this.define(node.handler.param.name, SymbolKind.VARIABLE, {
              node: node.handler.param,
            });
          }
          this._visitNode(node.handler.body);
          this.exitScope();
        }
        if (node.finalizer) {
          this._visitNode(node.finalizer);
        }
        break;

      case NodeType.SWITCH_STATEMENT:
        for (const switchCase of node.cases) {
          for (const stmt of switchCase.consequent) {
            this._visitNode(stmt);
          }
        }
        break;

      case NodeType.EXPRESSION_STATEMENT:
        this._visitExpression(node.expression);
        break;
    }
  }

  _visitVariableDeclaration(node) {
    for (const decl of node.declarations) {
      this._visitDeclarator(decl, node.kind);
    }
  }

  _visitDeclarator(decl, kind) {
    // Handle destructuring
    const identifiers = getIdentifiers(decl.id);

    for (const id of identifiers) {
      const type = decl.init ? this._inferType(decl.init) : null;
      const symbol = this.define(id.name, SymbolKind.VARIABLE, {
        node: decl,
        type,
      });

      // Extract members if init is object
      if (decl.init && decl.init.type === NodeType.OBJECT_EXPRESSION) {
        this._extractObjectMembers(symbol, decl.init);
      }

      // Extract members if init is class instantiation
      if (decl.init && decl.init.type === NodeType.NEW_EXPRESSION) {
        const className = decl.init.callee?.name;
        if (className) {
          const classSymbol = this.resolve(className);
          if (classSymbol) {
            symbol.members = [...classSymbol.members];
          }
        }
      }
    }
  }

  _visitFunctionDeclaration(node) {
    const symbol = this.define(node.id.name, SymbolKind.FUNCTION, {
      node,
      parameters: node.params
        .map((p) => {
          if (p.type === NodeType.IDENTIFIER) return p.name;
          if (p.type === NodeType.ASSIGNMENT_PATTERN) return p.left?.name;
          return null;
        })
        .filter(Boolean),
    });

    // Enter function scope
    this.enterScope('function');

    // Add parameters to scope
    for (const param of node.params) {
      const ids = getIdentifiers(param);
      for (const id of ids) {
        this.define(id.name, SymbolKind.PARAMETER, { node: param });
      }
    }

    // Visit body
    if (node.body.type === NodeType.BLOCK_STATEMENT) {
      for (const stmt of node.body.body) {
        this._visitNode(stmt);
      }
    }

    this.exitScope();
  }

  _visitClassDeclaration(node) {
    const symbol = this.define(node.id.name, SymbolKind.CLASS, {
      node,
    });

    // Extract class members
    if (node.body && node.body.body) {
      for (const member of node.body.body) {
        if (member.type === NodeType.METHOD_DEFINITION) {
          const memberKind =
            member.kind === 'constructor'
              ? SymbolKind.METHOD
              : member.kind === 'get'
              ? SymbolKind.GETTER
              : member.kind === 'set'
              ? SymbolKind.SETTER
              : SymbolKind.METHOD;

          symbol.addMember(
            new Symbol(member.key.name, memberKind, {
              node: member,
              parameters: member.value?.params?.map((p) => p.name).filter(Boolean) || [],
            })
          );
        } else if (member.type === NodeType.PROPERTY_DEFINITION) {
          // Handle class field declarations
          const propertyName = member.key.name || member.key.value;
          const isPrivate = propertyName && propertyName.startsWith('_');

          symbol.addMember(
            new Symbol(propertyName, SymbolKind.PROPERTY, {
              node: member,
              type: isPrivate ? 'private' : 'public',
            })
          );
        }
      }
    }

    // Visit class body in class scope
    this.enterScope('class');

    if (node.body && node.body.body) {
      for (const member of node.body.body) {
        if (member.type === NodeType.METHOD_DEFINITION && member.value) {
          this.enterScope('function');

          // Add parameters
          if (member.value.params) {
            for (const param of member.value.params) {
              const ids = getIdentifiers(param);
              for (const id of ids) {
                this.define(id.name, SymbolKind.PARAMETER, { node: param });
              }
            }
          }

          // Extract this.property assignments from constructor
          if (member.kind === 'constructor' && member.value.body) {
            this._extractConstructorProperties(symbol, member.value.body);
          }

          // Visit method body
          if (member.value.body) {
            this._visitNode(member.value.body);
          }

          this.exitScope();
        }
      }
    }

    this.exitScope();
  }

  /**
   * Extract this.property assignments from constructor body
   */
  _extractConstructorProperties(classSymbol, constructorBody) {
    if (!constructorBody || !constructorBody.body) return;

    const visitNode = (node) => {
      if (!node) return;

      // Check for this.property = value
      if (node.type === NodeType.EXPRESSION_STATEMENT && node.expression) {
        const expr = node.expression;
        if (
          expr.type === NodeType.ASSIGNMENT_EXPRESSION &&
          expr.left.type === NodeType.MEMBER_EXPRESSION &&
          expr.left.object.type === NodeType.THIS_EXPRESSION
        ) {
          const propertyName = expr.left.property.name;
          if (propertyName) {
            // Check if property is already defined (from class fields)
            const existing = classSymbol.getMember(propertyName);
            if (!existing) {
              const isPrivate = propertyName.startsWith('_');
              classSymbol.addMember(
                new Symbol(propertyName, SymbolKind.PROPERTY, {
                  node: expr,
                  type: isPrivate ? 'private' : 'public',
                })
              );
            }
          }
        }
      }

      // Recursively visit block statements
      if (node.type === NodeType.BLOCK_STATEMENT && node.body) {
        for (const statement of node.body) {
          visitNode(statement);
        }
      }

      // Visit if statements
      if (node.type === NodeType.IF_STATEMENT) {
        visitNode(node.consequent);
        visitNode(node.alternate);
      }
    };

    // Visit all statements in constructor body
    for (const statement of constructorBody.body) {
      visitNode(statement);
    }
  }

  _visitExpression(expr) {
    if (!expr) return;

    // Handle assignment expressions that might define properties
    if (expr.type === NodeType.ASSIGNMENT_EXPRESSION) {
      if (expr.left.type === NodeType.MEMBER_EXPRESSION) {
        // this.property = value
        if (expr.left.object.type === NodeType.THIS_EXPRESSION) {
          // Could track instance properties here
        }
      }
    }

    // Handle function expressions assigned to variables
    if (expr.type === NodeType.FUNCTION_EXPRESSION || expr.type === NodeType.ARROW_FUNCTION) {
      // Could enter scope and process
    }
  }

  _extractObjectMembers(symbol, objectExpr) {
    for (const prop of objectExpr.properties) {
      if (prop.type === NodeType.SPREAD_ELEMENT) continue;

      const keyName = prop.key?.name || prop.key?.value;
      if (!keyName) continue;

      const memberKind =
        prop.method || prop.value?.type === NodeType.FUNCTION_EXPRESSION || prop.value?.type === NodeType.ARROW_FUNCTION
          ? SymbolKind.METHOD
          : SymbolKind.PROPERTY;

      const memberType = this._inferType(prop.value);

      const member = new Symbol(keyName, memberKind, {
        node: prop,
        type: memberType,
      });

      // Recursively extract nested object members
      if (prop.value?.type === NodeType.OBJECT_EXPRESSION) {
        this._extractObjectMembers(member, prop.value);
      }

      symbol.addMember(member);
    }
  }

  _inferType(node) {
    if (!node) return null;

    switch (node.type) {
      case NodeType.LITERAL:
        if (typeof node.value === 'string') return 'string';
        if (typeof node.value === 'number') return 'number';
        if (typeof node.value === 'boolean') return 'boolean';
        if (node.value === null) return 'null';
        return 'unknown';

      case NodeType.OBJECT_EXPRESSION:
        return 'object';

      case NodeType.ARRAY_EXPRESSION:
        return 'array';

      case NodeType.FUNCTION_EXPRESSION:
      case NodeType.ARROW_FUNCTION:
        return 'function';

      case NodeType.NEW_EXPRESSION:
        return node.callee?.name || 'object';

      case NodeType.CALL_EXPRESSION:
        return 'unknown';

      case NodeType.IDENTIFIER:
        // Could do type lookup
        return 'unknown';

      default:
        return 'unknown';
    }
  }

  // ----------------------------------------
  // Query Methods
  // ----------------------------------------

  /**
   * Get all defined symbols
   */
  getAllSymbols() {
    return this._allSymbols;
  }

  /**
   * Find symbol at offset (for hover)
   */
  findSymbolAtOffset(offset) {
    // Would need position tracking in AST nodes
    return null;
  }

  /**
   * Find the enclosing class at the given offset
   * Used to resolve 'this' keyword in completion context
   * @param {number} offset - Cursor offset
   * @returns {Symbol|null} - Class symbol or null
   */
  findEnclosingClass(offset) {
    // Walk through all class symbols
    for (const symbol of this._allSymbols) {
      if (symbol.kind === SymbolKind.CLASS && symbol.node) {
        const node = symbol.node;

        // Check if offset is within class body
        if (node.body && offset >= node.body.start && offset <= node.body.end) {
          return symbol;
        }
      }
    }
    return null;
  }

  /**
   * Find the enclosing function or method at the given offset
   * @param {number} offset - Cursor offset
   * @returns {Symbol|null} - Function/method symbol or null
   */
  findEnclosingFunction(offset) {
    // Walk through all function/method symbols
    for (const symbol of this._allSymbols) {
      if ((symbol.kind === SymbolKind.FUNCTION || symbol.kind === SymbolKind.METHOD) && symbol.node) {
        const node = symbol.node;

        // For methods, check the value node which contains the function body
        const bodyNode = symbol.kind === SymbolKind.METHOD ? node.value?.body : node.body;

        if (bodyNode && offset >= bodyNode.start && offset <= bodyNode.end) {
          return symbol;
        }
      }
    }
    return null;
  }

  /**
   * Get symbols by kind
   */
  getSymbolsByKind(kind) {
    return this._allSymbols.filter((s) => s.kind === kind);
  }
}
