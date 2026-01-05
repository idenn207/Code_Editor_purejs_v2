/**
 * @fileoverview Lightweight JavaScript parser for extracting declarations
 * @module analysis/JSParser
 */

(function(CodeEditor) {
  'use strict';

  var TYPE_KIND = CodeEditor.Analysis.TYPE_KIND;

  // ============================================
  // Constants
  // ============================================

  var DECLARATION_KEYWORDS = ['const', 'let', 'var', 'function', 'class', 'import', 'export'];

  // ============================================
  // JSParser Class
  // ============================================

  /**
   * Lightweight parser that extracts declarations from JavaScript code
   */
  class JSParser {
    constructor() {
      this._builtinTypes = new CodeEditor.Analysis.BuiltinTypes();
    }

    // ----------------------------------------
    // Main Parsing Methods
    // ----------------------------------------

    /**
     * Parse document and extract all declarations
     * @param {string} text - Full document text
     * @returns {Array} Array of declaration objects
     */
    parse(text) {
      var declarations = [];
      var lines = text.split('\n');

      var state = {
        inMultiLineComment: false,
        inString: false,
        stringChar: null,
        braceDepth: 0,
        parenDepth: 0,
        bracketDepth: 0,
        currentClass: null,
        currentClassStartLine: -1,
        currentClassBraceDepth: 0
      };

      for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        var line = lines[lineIndex];
        var lineDecls = this._parseLine(line, lineIndex, state, lines);
        declarations = declarations.concat(lineDecls);
      }

      return declarations;
    }

    /**
     * Parse a single line for declarations
     * @param {string} line - Line text
     * @param {number} lineIndex - Line number (0-based)
     * @param {Object} state - Parser state
     * @param {string[]} lines - All lines (for lookahead)
     * @returns {Array} Declarations found on this line
     */
    _parseLine(line, lineIndex, state, lines) {
      var declarations = [];
      var trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('//')) {
        return declarations;
      }

      // Handle multi-line comments
      if (state.inMultiLineComment) {
        if (trimmed.indexOf('*/') !== -1) {
          state.inMultiLineComment = false;
        }
        return declarations;
      }

      if (trimmed.startsWith('/*')) {
        if (trimmed.indexOf('*/') === -1) {
          state.inMultiLineComment = true;
        }
        return declarations;
      }

      // Track class context
      this._updateClassContext(trimmed, lineIndex, state);

      // Parse different declaration types
      var varDecl = this._parseVariableDeclaration(line, lineIndex, lines);
      if (varDecl) {
        declarations.push(varDecl);
      }

      var funcDecl = this._parseFunctionDeclaration(line, lineIndex, lines);
      if (funcDecl) {
        declarations.push(funcDecl);
      }

      var classDecl = this._parseClassDeclaration(line, lineIndex, lines);
      if (classDecl) {
        declarations.push(classDecl);
        state.currentClass = classDecl;
        state.currentClassStartLine = lineIndex;
        state.currentClassBraceDepth = state.braceDepth;
      }

      var importDecl = this._parseImportDeclaration(line, lineIndex);
      if (importDecl) {
        declarations.push(importDecl);
      }

      // Parse class members if inside a class
      if (state.currentClass) {
        var memberDecl = this._parseClassMember(line, lineIndex, state.currentClass);
        if (memberDecl) {
          declarations.push(memberDecl);
        }
      }

      // Parse this.property assignments
      var thisAssign = this._parseThisAssignment(line, lineIndex, state.currentClass);
      if (thisAssign) {
        declarations.push(thisAssign);
      }

      // Update brace depth
      this._updateBraceDepth(line, state);

      // Check if we've exited the current class
      if (state.currentClass && state.braceDepth <= state.currentClassBraceDepth) {
        state.currentClass.range.endLine = lineIndex;
        state.currentClass = null;
      }

      return declarations;
    }

    _updateClassContext(line, lineIndex, state) {
      // Count braces, accounting for strings
      var inString = false;
      var stringChar = null;

      for (var i = 0; i < line.length; i++) {
        var char = line[i];
        var prev = i > 0 ? line[i - 1] : '';

        if (!inString) {
          if (char === '"' || char === "'" || char === '`') {
            inString = true;
            stringChar = char;
          }
        } else {
          if (char === stringChar && prev !== '\\') {
            inString = false;
            stringChar = null;
          }
        }
      }
    }

    _updateBraceDepth(line, state) {
      var inString = false;
      var stringChar = null;

      for (var i = 0; i < line.length; i++) {
        var char = line[i];
        var prev = i > 0 ? line[i - 1] : '';

        if (!inString) {
          if (char === '"' || char === "'" || char === '`') {
            inString = true;
            stringChar = char;
          } else if (char === '{') {
            state.braceDepth++;
          } else if (char === '}') {
            state.braceDepth--;
          } else if (char === '(') {
            state.parenDepth++;
          } else if (char === ')') {
            state.parenDepth--;
          } else if (char === '[') {
            state.bracketDepth++;
          } else if (char === ']') {
            state.bracketDepth--;
          }
        } else {
          if (char === stringChar && prev !== '\\') {
            inString = false;
            stringChar = null;
          }
        }
      }
    }

    // ----------------------------------------
    // Variable Declarations
    // ----------------------------------------

    _parseVariableDeclaration(line, lineIndex, lines) {
      // Match: const/let/var name = value
      var match = line.match(/^\s*(const|let|var)\s+(\w+)\s*=\s*(.*)$/);
      if (!match) return null;

      var kind = match[1];
      var name = match[2];
      var initializer = match[3].trim();

      // Handle multi-line initializers
      var fullInitializer = this._getFullExpression(initializer, lineIndex, lines);

      var initType = this._inferInitializerType(fullInitializer, lineIndex, lines);

      return {
        type: 'VariableDeclaration',
        name: name,
        declarationKind: kind,
        init: initType,
        range: {
          startLine: lineIndex,
          endLine: lineIndex
        }
      };
    }

    _getFullExpression(start, lineIndex, lines) {
      var result = start;
      var braceCount = this._countUnmatched(start, '{', '}');
      var bracketCount = this._countUnmatched(start, '[', ']');
      var parenCount = this._countUnmatched(start, '(', ')');

      var currentLine = lineIndex + 1;
      while ((braceCount > 0 || bracketCount > 0 || parenCount > 0) && currentLine < lines.length) {
        var nextLine = lines[currentLine].trim();
        result += '\n' + nextLine;
        braceCount += this._countUnmatched(nextLine, '{', '}');
        bracketCount += this._countUnmatched(nextLine, '[', ']');
        parenCount += this._countUnmatched(nextLine, '(', ')');
        currentLine++;
      }

      return result;
    }

    _countUnmatched(text, open, close) {
      var count = 0;
      var inString = false;
      var stringChar = null;

      for (var i = 0; i < text.length; i++) {
        var char = text[i];
        var prev = i > 0 ? text[i - 1] : '';

        if (!inString) {
          if (char === '"' || char === "'" || char === '`') {
            inString = true;
            stringChar = char;
          } else if (char === open) {
            count++;
          } else if (char === close) {
            count--;
          }
        } else if (char === stringChar && prev !== '\\') {
          inString = false;
        }
      }

      return count;
    }

    _inferInitializerType(initializer, lineIndex, lines) {
      // Remove trailing semicolon and whitespace
      initializer = initializer.replace(/;?\s*$/, '').trim();

      // String literal
      if (/^["']/.test(initializer) || /^`/.test(initializer)) {
        return {
          type: 'Literal',
          valueType: 'String'
        };
      }

      // Number literal
      if (/^-?\d/.test(initializer) || /^0x/i.test(initializer)) {
        return {
          type: 'Literal',
          valueType: 'Number'
        };
      }

      // Boolean literal
      if (initializer === 'true' || initializer === 'false') {
        return {
          type: 'Literal',
          valueType: 'Boolean'
        };
      }

      // Null/undefined
      if (initializer === 'null' || initializer === 'undefined') {
        return {
          type: 'Literal',
          valueType: initializer
        };
      }

      // Array literal
      if (initializer.startsWith('[')) {
        return this._parseArrayLiteral(initializer);
      }

      // Object literal
      if (initializer.startsWith('{')) {
        return this._parseObjectLiteral(initializer);
      }

      // new Constructor()
      var newMatch = initializer.match(/^new\s+(\w+)/);
      if (newMatch) {
        return {
          type: 'NewExpression',
          constructorName: newMatch[1]
        };
      }

      // Function call
      var callMatch = initializer.match(/^(\w+(?:\.\w+)*)\s*\(/);
      if (callMatch) {
        return {
          type: 'CallExpression',
          callee: callMatch[1]
        };
      }

      // Arrow function
      if (initializer.indexOf('=>') !== -1) {
        return this._parseArrowFunction(initializer);
      }

      // Function expression
      if (initializer.startsWith('function')) {
        return this._parseFunctionExpression(initializer);
      }

      // Identifier reference
      if (/^[\w$]+$/.test(initializer)) {
        return {
          type: 'Identifier',
          name: initializer
        };
      }

      // Member expression (e.g., foo.bar)
      if (/^[\w$]+(?:\.[\w$]+)+$/.test(initializer)) {
        return {
          type: 'MemberExpression',
          chain: initializer
        };
      }

      return {
        type: 'Unknown'
      };
    }

    _parseArrayLiteral(text) {
      // Extract array contents
      var content = text.slice(1, -1).trim();

      if (!content) {
        return {
          type: 'ArrayLiteral',
          elements: [],
          elementType: null
        };
      }

      // Try to infer element type from first element
      var firstElement = this._getFirstArrayElement(content);
      var elementType = null;

      if (firstElement) {
        var elemInit = this._inferInitializerType(firstElement, 0, []);
        if (elemInit.valueType) {
          elementType = elemInit.valueType;
        }
      }

      return {
        type: 'ArrayLiteral',
        elementType: elementType
      };
    }

    _getFirstArrayElement(content) {
      var depth = 0;
      var start = 0;

      for (var i = 0; i < content.length; i++) {
        var char = content[i];
        if (char === '[' || char === '{' || char === '(') {
          depth++;
        } else if (char === ']' || char === '}' || char === ')') {
          depth--;
        } else if (char === ',' && depth === 0) {
          return content.slice(start, i).trim();
        }
      }

      return content.trim();
    }

    _parseObjectLiteral(text) {
      var properties = [];

      // Simple regex-based property extraction
      // Match patterns like: key: value, or "key": value
      var propRegex = /(?:['"]?(\w+)['"]?\s*:\s*|(\w+)\s*\()/g;
      var match;

      while ((match = propRegex.exec(text)) !== null) {
        var propName = match[1] || match[2];
        if (propName) {
          // Determine if it's a method (followed by parenthesis)
          var isMethod = match[2] !== undefined;

          var propType = null;
          if (!isMethod) {
            // Try to get value type
            var afterColon = text.slice(match.index + match[0].length);
            var valueEnd = this._findValueEnd(afterColon);
            var value = afterColon.slice(0, valueEnd).trim();
            var valueInit = this._inferInitializerType(value, 0, []);
            propType = valueInit.valueType || null;
          }

          properties.push({
            key: propName,
            isMethod: isMethod,
            valueType: propType
          });
        }
      }

      return {
        type: 'ObjectLiteral',
        properties: properties
      };
    }

    _findValueEnd(text) {
      var depth = 0;
      var inString = false;
      var stringChar = null;

      for (var i = 0; i < text.length; i++) {
        var char = text[i];
        var prev = i > 0 ? text[i - 1] : '';

        if (!inString) {
          if (char === '"' || char === "'" || char === '`') {
            inString = true;
            stringChar = char;
          } else if (char === '{' || char === '[' || char === '(') {
            depth++;
          } else if (char === '}' || char === ']' || char === ')') {
            if (depth === 0) return i;
            depth--;
          } else if (char === ',' && depth === 0) {
            return i;
          }
        } else if (char === stringChar && prev !== '\\') {
          inString = false;
        }
      }

      return text.length;
    }

    _parseArrowFunction(text) {
      // Match: (params) => body or param => body
      var match = text.match(/^(?:\(([^)]*)\)|(\w+))\s*=>\s*(.*)$/);

      if (!match) {
        return { type: 'ArrowFunction', params: [], returnType: null };
      }

      var paramsStr = match[1] || match[2] || '';
      var body = match[3];

      var params = paramsStr ? paramsStr.split(',').map(function(p) {
        return p.trim().split('=')[0].trim();
      }) : [];

      var returnType = null;
      if (body && !body.startsWith('{')) {
        // Single expression return
        var bodyInit = this._inferInitializerType(body, 0, []);
        returnType = bodyInit.valueType || null;
      }

      return {
        type: 'ArrowFunction',
        params: params,
        returnType: returnType
      };
    }

    _parseFunctionExpression(text) {
      var match = text.match(/^function\s*(\w*)\s*\(([^)]*)\)/);

      if (!match) {
        return { type: 'FunctionExpression', params: [], returnType: null };
      }

      var paramsStr = match[2] || '';
      var params = paramsStr ? paramsStr.split(',').map(function(p) {
        return p.trim().split('=')[0].trim();
      }) : [];

      return {
        type: 'FunctionExpression',
        name: match[1] || null,
        params: params,
        returnType: null
      };
    }

    // ----------------------------------------
    // Function Declarations
    // ----------------------------------------

    _parseFunctionDeclaration(line, lineIndex, lines) {
      // Match: function name(params) or async function name(params)
      var match = line.match(/^\s*(async\s+)?function\s+(\w+)\s*\(([^)]*)\)/);
      if (!match) return null;

      var isAsync = !!match[1];
      var name = match[2];
      var paramsStr = match[3] || '';

      var params = paramsStr ? paramsStr.split(',').map(function(p) {
        return p.trim().split('=')[0].trim();
      }).filter(function(p) { return p; }) : [];

      // Try to find return type from body
      var returnType = this._inferFunctionReturnType(lineIndex, lines);

      return {
        type: 'FunctionDeclaration',
        name: name,
        params: params,
        isAsync: isAsync,
        returnType: returnType,
        range: {
          startLine: lineIndex,
          endLine: this._findFunctionEnd(lineIndex, lines)
        }
      };
    }

    _inferFunctionReturnType(startLine, lines) {
      var braceCount = 0;
      var foundStart = false;

      for (var i = startLine; i < lines.length && i < startLine + 100; i++) {
        var line = lines[i];

        for (var j = 0; j < line.length; j++) {
          if (line[j] === '{') {
            foundStart = true;
            braceCount++;
          } else if (line[j] === '}') {
            braceCount--;
            if (foundStart && braceCount === 0) {
              // End of function
              return null;
            }
          }
        }

        // Look for return statements
        var returnMatch = line.match(/\breturn\s+(.+?)\s*;?\s*$/);
        if (returnMatch && foundStart) {
          var returnValue = returnMatch[1].trim();
          var returnInit = this._inferInitializerType(returnValue, i, lines);

          if (returnInit.valueType) {
            return returnInit.valueType;
          }

          if (returnInit.type === 'Identifier') {
            return null; // Can't determine
          }
        }
      }

      return null;
    }

    _findFunctionEnd(startLine, lines) {
      var braceCount = 0;
      var foundStart = false;

      for (var i = startLine; i < lines.length; i++) {
        var line = lines[i];

        for (var j = 0; j < line.length; j++) {
          if (line[j] === '{') {
            foundStart = true;
            braceCount++;
          } else if (line[j] === '}') {
            braceCount--;
            if (foundStart && braceCount === 0) {
              return i;
            }
          }
        }
      }

      return startLine;
    }

    // ----------------------------------------
    // Class Declarations
    // ----------------------------------------

    _parseClassDeclaration(line, lineIndex, lines) {
      // Match: class Name or class Name extends Parent
      var match = line.match(/^\s*class\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{?/);
      if (!match) return null;

      var name = match[1];
      var extendsName = match[2] || null;

      return {
        type: 'ClassDeclaration',
        name: name,
        extends: extendsName,
        members: [],
        range: {
          startLine: lineIndex,
          endLine: this._findClassEnd(lineIndex, lines)
        }
      };
    }

    _findClassEnd(startLine, lines) {
      var braceCount = 0;
      var foundStart = false;

      for (var i = startLine; i < lines.length; i++) {
        var line = lines[i];

        for (var j = 0; j < line.length; j++) {
          if (line[j] === '{') {
            foundStart = true;
            braceCount++;
          } else if (line[j] === '}') {
            braceCount--;
            if (foundStart && braceCount === 0) {
              return i;
            }
          }
        }
      }

      return startLine;
    }

    _parseClassMember(line, lineIndex, currentClass) {
      var trimmed = line.trim();

      // Skip empty lines, comments, and constructor
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('constructor')) {
        return null;
      }

      // Class field: name = value or #name = value
      var fieldMatch = trimmed.match(/^(#?\w+)\s*=\s*(.*)$/);
      if (fieldMatch) {
        var fieldName = fieldMatch[1];
        var fieldValue = fieldMatch[2].replace(/;?\s*$/, '').trim();
        var fieldInit = this._inferInitializerType(fieldValue, lineIndex, []);

        return {
          type: 'ClassField',
          name: fieldName,
          className: currentClass.name,
          valueType: fieldInit.valueType || null,
          range: { startLine: lineIndex, endLine: lineIndex }
        };
      }

      // Class method: name(params) or async name(params) or static name(params)
      var methodMatch = trimmed.match(/^(static\s+)?(async\s+)?(#?\w+)\s*\(([^)]*)\)/);
      if (methodMatch) {
        var isStatic = !!methodMatch[1];
        var isAsync = !!methodMatch[2];
        var methodName = methodMatch[3];
        var paramsStr = methodMatch[4] || '';

        // Skip getter/setter syntax
        if (methodName === 'get' || methodName === 'set') {
          return null;
        }

        var params = paramsStr ? paramsStr.split(',').map(function(p) {
          return p.trim().split('=')[0].trim();
        }).filter(function(p) { return p; }) : [];

        return {
          type: 'ClassMethod',
          name: methodName,
          className: currentClass.name,
          params: params,
          isStatic: isStatic,
          isAsync: isAsync,
          range: { startLine: lineIndex, endLine: lineIndex }
        };
      }

      // Getter: get name()
      var getterMatch = trimmed.match(/^(static\s+)?get\s+(\w+)\s*\(\)/);
      if (getterMatch) {
        return {
          type: 'ClassGetter',
          name: getterMatch[2],
          className: currentClass.name,
          isStatic: !!getterMatch[1],
          range: { startLine: lineIndex, endLine: lineIndex }
        };
      }

      // Setter: set name(value)
      var setterMatch = trimmed.match(/^(static\s+)?set\s+(\w+)\s*\(/);
      if (setterMatch) {
        return {
          type: 'ClassSetter',
          name: setterMatch[2],
          className: currentClass.name,
          isStatic: !!setterMatch[1],
          range: { startLine: lineIndex, endLine: lineIndex }
        };
      }

      return null;
    }

    _parseThisAssignment(line, lineIndex, currentClass) {
      // Match: this.name = value
      var match = line.match(/\bthis\.(\w+)\s*=\s*(.+?)\s*;?\s*$/);
      if (!match) return null;

      var propName = match[1];
      var propValue = match[2].trim();
      var propInit = this._inferInitializerType(propValue, lineIndex, []);

      return {
        type: 'ThisAssignment',
        name: propName,
        className: currentClass ? currentClass.name : null,
        valueType: propInit.valueType || null,
        init: propInit,
        range: { startLine: lineIndex, endLine: lineIndex }
      };
    }

    // ----------------------------------------
    // Import Declarations
    // ----------------------------------------

    _parseImportDeclaration(line, lineIndex) {
      // Match: import { x, y } from 'path'
      var namedMatch = line.match(/^\s*import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/);
      if (namedMatch) {
        var names = namedMatch[1].split(',').map(function(n) {
          var parts = n.trim().split(/\s+as\s+/);
          return {
            imported: parts[0].trim(),
            local: parts[1] ? parts[1].trim() : parts[0].trim()
          };
        });

        return {
          type: 'ImportDeclaration',
          kind: 'named',
          specifiers: names,
          source: namedMatch[2],
          range: { startLine: lineIndex, endLine: lineIndex }
        };
      }

      // Match: import Name from 'path'
      var defaultMatch = line.match(/^\s*import\s+(\w+)\s+from\s*['"]([^'"]+)['"]/);
      if (defaultMatch) {
        return {
          type: 'ImportDeclaration',
          kind: 'default',
          specifiers: [{ imported: 'default', local: defaultMatch[1] }],
          source: defaultMatch[2],
          range: { startLine: lineIndex, endLine: lineIndex }
        };
      }

      // Match: import * as Name from 'path'
      var namespaceMatch = line.match(/^\s*import\s*\*\s*as\s+(\w+)\s+from\s*['"]([^'"]+)['"]/);
      if (namespaceMatch) {
        return {
          type: 'ImportDeclaration',
          kind: 'namespace',
          specifiers: [{ imported: '*', local: namespaceMatch[1] }],
          source: namespaceMatch[2],
          range: { startLine: lineIndex, endLine: lineIndex }
        };
      }

      return null;
    }
  }

  // ============================================
  // Export to Namespace
  // ============================================

  CodeEditor.Analysis = CodeEditor.Analysis || {};
  CodeEditor.Analysis.JSParser = JSParser;

})(window.CodeEditor = window.CodeEditor || {});
