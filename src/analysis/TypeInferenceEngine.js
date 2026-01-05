/**
 * @fileoverview Type inference engine for JavaScript code analysis
 * @module analysis/TypeInferenceEngine
 */

(function(CodeEditor) {
  'use strict';

  var TYPE_KIND = CodeEditor.Analysis.TYPE_KIND;
  var BuiltinTypes = CodeEditor.Analysis.BuiltinTypes;

  // ============================================
  // TypeInferenceEngine Class
  // ============================================

  /**
   * Infers types and provides type information for completions
   */
  class TypeInferenceEngine {
    constructor(scopeAnalyzer) {
      this._scopeAnalyzer = scopeAnalyzer;
      this._builtinTypes = new BuiltinTypes();
    }

    // ----------------------------------------
    // Main Type Resolution Methods
    // ----------------------------------------

    /**
     * Get the type of an expression at a position
     * @param {string} expression - The expression (e.g., 'user', 'user.name')
     * @param {number} line - Line number
     * @param {number} column - Column number
     * @returns {Object} Type descriptor
     */
    getTypeOfExpression(expression, line, column) {
      var parts = this._parseExpression(expression);

      if (parts.length === 0) {
        return this._builtinTypes.createUnknownType();
      }

      // Handle 'this' keyword
      if (parts[0] === 'this') {
        return this._resolveThisChain(parts.slice(1), line, column);
      }

      // Start with the first identifier
      var type = this._getTypeOfIdentifier(parts[0], line, column);

      // Resolve the chain
      for (var i = 1; i < parts.length; i++) {
        type = this._resolveMemberAccess(type, parts[i]);
      }

      return type;
    }

    /**
     * Get members available for an expression
     * @param {string} expression - The expression before the dot
     * @param {number} line - Line number
     * @param {number} column - Column number
     * @returns {Array} Array of member completions
     */
    getMembersOfExpression(expression, line, column) {
      var type = this.getTypeOfExpression(expression, line, column);
      return this.getMembersOfType(type);
    }

    /**
     * Get all members available for a type
     * @param {Object} type - Type descriptor
     * @returns {Array} Array of member objects { name, kind, typeInfo, isUnknown }
     */
    getMembersOfType(type) {
      if (!type) {
        return this._getUnknownTypeMembers();
      }

      switch (type.kind) {
        case TYPE_KIND.PRIMITIVE:
          return this._getPrimitiveMembers(type.name);

        case TYPE_KIND.ARRAY:
          return this._getArrayMembers(type.elementType);

        case TYPE_KIND.OBJECT:
          if (type.name) {
            // Named type (built-in or DOM)
            return this._getNamedTypeMembers(type.name);
          } else if (type.shape) {
            // Object literal shape
            return this._getObjectShapeMembers(type.shape);
          }
          return this._getGenericObjectMembers();

        case TYPE_KIND.CLASS:
          return this._getClassMembers(type);

        case TYPE_KIND.FUNCTION:
          return this._getFunctionMembers(type);

        case TYPE_KIND.UNKNOWN:
        default:
          return this._getUnknownTypeMembers();
      }
    }

    /**
     * Get 'this' members at a position
     * @param {number} line - Line number
     * @param {number} column - Column number
     * @returns {Array} Array of member objects
     */
    getThisMembers(line, column) {
      var thisType = this._scopeAnalyzer.getThisType(line, column);

      if (!thisType) {
        return [];
      }

      return this.getMembersOfType(thisType);
    }

    // ----------------------------------------
    // Expression Parsing
    // ----------------------------------------

    _parseExpression(expression) {
      if (!expression) return [];

      // Handle method calls: remove () and arguments
      expression = expression.replace(/\([^)]*\)/g, '');

      // Split on dots, handling edge cases
      return expression.split('.').filter(function(p) {
        return p && /^[\w$]+$/.test(p);
      });
    }

    // ----------------------------------------
    // Type Resolution
    // ----------------------------------------

    _getTypeOfIdentifier(name, line, column) {
      // Check for built-in globals
      var builtinGlobals = {
        'window': { kind: TYPE_KIND.OBJECT, name: 'Window' },
        'document': { kind: TYPE_KIND.OBJECT, name: 'Document' },
        'console': { kind: TYPE_KIND.OBJECT, name: 'Console' },
        'Math': { kind: TYPE_KIND.OBJECT, name: 'Math' },
        'JSON': { kind: TYPE_KIND.OBJECT, name: 'JSON' },
        'Object': { kind: TYPE_KIND.OBJECT, name: 'Object' },
        'Array': { kind: TYPE_KIND.OBJECT, name: 'Array' },
        'String': { kind: TYPE_KIND.OBJECT, name: 'String' },
        'Number': { kind: TYPE_KIND.OBJECT, name: 'Number' },
        'Boolean': { kind: TYPE_KIND.OBJECT, name: 'Boolean' },
        'Date': { kind: TYPE_KIND.OBJECT, name: 'Date' },
        'Promise': { kind: TYPE_KIND.OBJECT, name: 'Promise' },
        'localStorage': { kind: TYPE_KIND.OBJECT, name: 'Storage' },
        'sessionStorage': { kind: TYPE_KIND.OBJECT, name: 'Storage' }
      };

      if (builtinGlobals[name]) {
        return builtinGlobals[name];
      }

      // Look up in symbol table
      var symbol = this._scopeAnalyzer.lookupSymbol(name, line, column);

      if (symbol && symbol.type) {
        return this._resolveSymbolType(symbol.type);
      }

      return this._builtinTypes.createUnknownType();
    }

    _resolveSymbolType(type) {
      // If type references another name, try to resolve it
      if (type.referencedName) {
        // For now, return unknown - could add recursive resolution
        return this._builtinTypes.createUnknownType();
      }

      return type;
    }

    _resolveThisChain(parts, line, column) {
      var thisType = this._scopeAnalyzer.getThisType(line, column);

      if (!thisType) {
        return this._builtinTypes.createUnknownType();
      }

      var type = thisType;

      for (var i = 0; i < parts.length; i++) {
        type = this._resolveMemberAccess(type, parts[i]);
      }

      return type;
    }

    _resolveMemberAccess(type, memberName) {
      if (!type || type.kind === TYPE_KIND.UNKNOWN) {
        return this._builtinTypes.createUnknownType();
      }

      // Handle primitive wrapper methods
      if (type.kind === TYPE_KIND.PRIMITIVE) {
        var methodReturn = this._builtinTypes.getMethodReturnType(type.name, memberName);
        if (methodReturn) {
          return this._parseReturnType(methodReturn);
        }
      }

      // Handle named types (built-ins, DOM)
      if (type.kind === TYPE_KIND.OBJECT && type.name) {
        var namedMethodReturn = this._builtinTypes.getMethodReturnType(type.name, memberName);
        if (namedMethodReturn) {
          return this._parseReturnType(namedMethodReturn);
        }

        // Check for property return type
        var members = this._builtinTypes.getAllMembers(type.name);
        if (members[memberName] && members[memberName].returns) {
          return this._parseReturnType(members[memberName].returns);
        }
      }

      // Handle array element access
      if (type.kind === TYPE_KIND.ARRAY) {
        var arrayMethodReturn = this._builtinTypes.getMethodReturnType('Array', memberName);
        if (arrayMethodReturn) {
          // Handle T (element type)
          if (arrayMethodReturn === 'T' && type.elementType) {
            return type.elementType;
          }
          return this._parseReturnType(arrayMethodReturn);
        }
      }

      // Handle object shapes
      if (type.kind === TYPE_KIND.OBJECT && type.shape && type.shape[memberName]) {
        return type.shape[memberName];
      }

      // Handle class members
      if (type.kind === TYPE_KIND.CLASS && type.members) {
        for (var i = 0; i < type.members.length; i++) {
          if (type.members[i].name === memberName) {
            return type.members[i].type || this._builtinTypes.createUnknownType();
          }
        }
      }

      return this._builtinTypes.createUnknownType();
    }

    _parseReturnType(returnTypeStr) {
      if (!returnTypeStr) {
        return this._builtinTypes.createUnknownType();
      }

      // Handle generic arrays: Array<String>
      var arrayMatch = returnTypeStr.match(/^Array<(.+)>$/);
      if (arrayMatch) {
        var elementTypeName = arrayMatch[1];
        var elementType = this._builtinTypes.createPrimitiveType(elementTypeName);
        return this._builtinTypes.createArrayType(elementType);
      }

      // Primitive types
      var primitives = ['String', 'Number', 'Boolean'];
      if (primitives.indexOf(returnTypeStr) !== -1) {
        return this._builtinTypes.createPrimitiveType(returnTypeStr);
      }

      // Special values
      if (returnTypeStr === 'undefined' || returnTypeStr === 'void') {
        return { kind: TYPE_KIND.PRIMITIVE, name: 'undefined' };
      }

      // Object types (DOM, etc.)
      return { kind: TYPE_KIND.OBJECT, name: returnTypeStr };
    }

    // ----------------------------------------
    // Member Generation
    // ----------------------------------------

    _getPrimitiveMembers(typeName) {
      var members = this._builtinTypes.getTypeMembers(typeName);

      if (!members) {
        return [];
      }

      return this._formatMembers(members, typeName);
    }

    _getArrayMembers(elementType) {
      var members = this._builtinTypes.getTypeMembers('Array');
      var result = this._formatMembers(members, 'Array');

      // Add element type info to methods that return elements
      if (elementType) {
        result.forEach(function(member) {
          if (member.typeInfo === 'T') {
            member.typeInfo = elementType.name || 'element';
          }
        });
      }

      return result;
    }

    _getNamedTypeMembers(typeName) {
      var members = this._builtinTypes.getAllMembers(typeName);

      if (!members || Object.keys(members).length === 0) {
        // Fall back to static members for global objects
        var statics = this._builtinTypes.getStaticMembers(typeName);
        if (statics) {
          return this._formatMembers(statics, typeName);
        }
        return this._getGenericObjectMembers();
      }

      return this._formatMembers(members, typeName);
    }

    _getObjectShapeMembers(shape) {
      var result = [];

      Object.keys(shape).forEach(function(key) {
        var propType = shape[key];
        var isMethod = propType.kind === TYPE_KIND.FUNCTION;

        result.push({
          label: key,
          insertText: key,
          kind: isMethod ? 'method' : 'property',
          typeInfo: propType.name || (propType.kind === TYPE_KIND.UNKNOWN ? 'any' : propType.kind),
          isUnknown: propType.kind === TYPE_KIND.UNKNOWN,
          sortOrder: 0
        });
      });

      return result;
    }

    _getClassMembers(type) {
      var result = [];

      // Get members from class type
      if (type.members) {
        type.members.forEach(function(member) {
          var isMethod = member.kind === 'method' ||
            (member.type && member.type.kind === TYPE_KIND.FUNCTION);

          result.push({
            label: member.name,
            insertText: member.name,
            kind: isMethod ? 'method' : 'property',
            typeInfo: member.type ? (member.type.name || 'any') : 'any',
            isUnknown: !member.type || member.type.kind === TYPE_KIND.UNKNOWN,
            sortOrder: member.name.startsWith('_') ? 2 : 0
          });
        });
      }

      // If class name is known, try to get members from scope analyzer
      if (type.name && this._scopeAnalyzer) {
        var classMembers = this._scopeAnalyzer.getClassMembers(type.name);
        classMembers.forEach(function(member) {
          // Check if already added
          var exists = result.some(function(r) { return r.label === member.name; });
          if (!exists) {
            var isMethod = member.kind === 'method';
            result.push({
              label: member.name,
              insertText: member.name,
              kind: isMethod ? 'method' : 'property',
              typeInfo: member.type ? (member.type.name || 'any') : 'any',
              isUnknown: !member.type || member.type.kind === TYPE_KIND.UNKNOWN,
              sortOrder: member.name.startsWith('_') ? 2 : 0
            });
          }
        });
      }

      return result;
    }

    _getFunctionMembers(type) {
      // Functions have limited members (call, apply, bind)
      return [
        { label: 'call', insertText: 'call', kind: 'method', typeInfo: 'any', isUnknown: false, sortOrder: 0 },
        { label: 'apply', insertText: 'apply', kind: 'method', typeInfo: 'any', isUnknown: false, sortOrder: 0 },
        { label: 'bind', insertText: 'bind', kind: 'method', typeInfo: 'Function', isUnknown: false, sortOrder: 0 },
        { label: 'length', insertText: 'length', kind: 'property', typeInfo: 'number', isUnknown: false, sortOrder: 0 },
        { label: 'name', insertText: 'name', kind: 'property', typeInfo: 'string', isUnknown: false, sortOrder: 0 }
      ];
    }

    _getGenericObjectMembers() {
      var members = this._builtinTypes.getTypeMembers('Object');
      return this._formatMembers(members || {}, 'Object');
    }

    _getUnknownTypeMembers() {
      // Combine common string, array, and object methods
      var combined = [];
      var seen = new Set();

      // Add string methods
      var stringMembers = this._builtinTypes.getTypeMembers('String') || {};
      this._addMembersToList(stringMembers, combined, seen, 'String', true);

      // Add array methods
      var arrayMembers = this._builtinTypes.getTypeMembers('Array') || {};
      this._addMembersToList(arrayMembers, combined, seen, 'Array', true);

      // Add object methods
      var objectMembers = this._builtinTypes.getTypeMembers('Object') || {};
      this._addMembersToList(objectMembers, combined, seen, 'Object', true);

      // Sort: non-unknown first, then alphabetically
      combined.sort(function(a, b) {
        if (a.isUnknown !== b.isUnknown) {
          return a.isUnknown ? 1 : -1;
        }
        return a.label.localeCompare(b.label);
      });

      return combined;
    }

    _addMembersToList(members, list, seen, typeName, markAsUnknown) {
      var self = this;
      Object.keys(members).forEach(function(name) {
        if (seen.has(name)) return;
        seen.add(name);

        var member = members[name];
        var isProperty = member.isProperty === true;

        list.push({
          label: name,
          insertText: name,
          kind: isProperty ? 'property' : 'method',
          typeInfo: member.returns || 'any',
          isUnknown: markAsUnknown,
          sortOrder: markAsUnknown ? 1 : 0
        });
      });
    }

    _formatMembers(members, typeName) {
      var result = [];
      var self = this;

      Object.keys(members).forEach(function(name) {
        var member = members[name];
        var isProperty = member.isProperty === true;

        result.push({
          label: name,
          insertText: name,
          kind: isProperty ? 'property' : 'method',
          typeInfo: member.returns || 'any',
          isUnknown: false,
          sortOrder: 0
        });
      });

      // Sort: properties first, then methods, alphabetically
      result.sort(function(a, b) {
        if (a.kind !== b.kind) {
          return a.kind === 'property' ? -1 : 1;
        }
        return a.label.localeCompare(b.label);
      });

      return result;
    }

    // ----------------------------------------
    // Utility Methods
    // ----------------------------------------

    /**
     * Check if a type is unknown
     * @param {Object} type - Type descriptor
     * @returns {boolean}
     */
    isUnknownType(type) {
      return !type || type.kind === TYPE_KIND.UNKNOWN || type.isUnknown;
    }

    /**
     * Get a human-readable type string
     * @param {Object} type - Type descriptor
     * @returns {string}
     */
    getTypeString(type) {
      if (!type) return 'any';

      switch (type.kind) {
        case TYPE_KIND.PRIMITIVE:
          return type.name ? type.name.toLowerCase() : 'any';

        case TYPE_KIND.ARRAY:
          if (type.elementType) {
            return this.getTypeString(type.elementType) + '[]';
          }
          return 'array';

        case TYPE_KIND.OBJECT:
          return type.name || 'object';

        case TYPE_KIND.CLASS:
          return type.name || 'class';

        case TYPE_KIND.FUNCTION:
          if (type.returnType) {
            return '() => ' + this.getTypeString(type.returnType);
          }
          return 'function';

        case TYPE_KIND.UNKNOWN:
        default:
          return 'any';
      }
    }
  }

  // ============================================
  // Export to Namespace
  // ============================================

  CodeEditor.Analysis = CodeEditor.Analysis || {};
  CodeEditor.Analysis.TypeInferenceEngine = TypeInferenceEngine;

})(window.CodeEditor = window.CodeEditor || {});
