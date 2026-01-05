/**
 * @fileoverview ES6 import resolver for multi-file type inference
 * @module analysis/ImportResolver
 */

(function(CodeEditor) {
  'use strict';

  var TYPE_KIND = CodeEditor.Analysis.TYPE_KIND;

  // ============================================
  // ImportResolver Class
  // ============================================

  /**
   * Resolves ES6 imports and provides exported symbols from other files
   */
  class ImportResolver {
    constructor() {
      this._exportCache = new Map(); // filePath -> exports
      this._pendingResolves = new Map(); // filePath -> Promise
      this._parser = null; // Lazy init
    }

    // ----------------------------------------
    // Main Resolution Methods
    // ----------------------------------------

    /**
     * Resolve an import path to exports
     * @param {string} importPath - The import path (e.g., './utils', '../models/User')
     * @param {string} currentFilePath - Path of the importing file
     * @returns {Promise<Object>} Resolved exports { [name]: type }
     */
    async resolveImport(importPath, currentFilePath) {
      // Resolve relative path
      var resolvedPath = this._resolvePath(importPath, currentFilePath);

      // Check cache
      if (this._exportCache.has(resolvedPath)) {
        return this._exportCache.get(resolvedPath);
      }

      // Check if already resolving
      if (this._pendingResolves.has(resolvedPath)) {
        return this._pendingResolves.get(resolvedPath);
      }

      // Start resolution
      var resolvePromise = this._fetchAndAnalyze(resolvedPath);
      this._pendingResolves.set(resolvedPath, resolvePromise);

      try {
        var exports = await resolvePromise;
        this._exportCache.set(resolvedPath, exports);
        return exports;
      } finally {
        this._pendingResolves.delete(resolvedPath);
      }
    }

    /**
     * Get cached exports for a file
     * @param {string} filePath - File path
     * @returns {Object|null} Cached exports or null
     */
    getCachedExports(filePath) {
      return this._exportCache.get(filePath) || null;
    }

    /**
     * Invalidate cache for a file
     * @param {string} filePath - File path
     */
    invalidateCache(filePath) {
      this._exportCache.delete(filePath);
    }

    /**
     * Clear all cached exports
     */
    clearCache() {
      this._exportCache.clear();
    }

    // ----------------------------------------
    // Path Resolution
    // ----------------------------------------

    _resolvePath(importPath, currentFilePath) {
      // Handle node_modules imports (not supported - return as-is)
      if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        return importPath;
      }

      // Get directory of current file
      var currentDir = this._getDirectory(currentFilePath);

      // Handle relative imports
      if (importPath.startsWith('./')) {
        return this._normalizePath(currentDir + '/' + importPath.slice(2));
      }

      if (importPath.startsWith('../')) {
        return this._normalizePath(currentDir + '/' + importPath);
      }

      // Absolute import
      return importPath;
    }

    _getDirectory(filePath) {
      var lastSlash = filePath.lastIndexOf('/');
      if (lastSlash === -1) return '.';
      return filePath.slice(0, lastSlash);
    }

    _normalizePath(path) {
      var parts = path.split('/');
      var result = [];

      for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        if (part === '.' || part === '') continue;
        if (part === '..') {
          result.pop();
        } else {
          result.push(part);
        }
      }

      return result.join('/');
    }

    // ----------------------------------------
    // File Fetching and Analysis
    // ----------------------------------------

    async _fetchAndAnalyze(filePath) {
      try {
        // Try to fetch the file
        var content = await this._fetchFile(filePath);

        if (!content) {
          return {};
        }

        // Parse and extract exports
        return this._extractExports(content);
      } catch (error) {
        console.warn('ImportResolver: Failed to resolve ' + filePath, error);
        return {};
      }
    }

    async _fetchFile(filePath) {
      // Try common extensions if not specified
      var extensions = ['.js', '.mjs', '.ts', ''];
      var hasExtension = /\.[a-z]+$/i.test(filePath);

      if (hasExtension) {
        extensions = [''];
      }

      for (var i = 0; i < extensions.length; i++) {
        var fullPath = filePath + extensions[i];

        try {
          var response = await fetch(fullPath);
          if (response.ok) {
            return await response.text();
          }
        } catch (e) {
          // Continue to next extension
        }
      }

      return null;
    }

    _extractExports(content) {
      var exports = {};

      // Initialize parser lazily
      if (!this._parser) {
        this._parser = new CodeEditor.Analysis.JSParser();
      }

      // Parse the file
      var declarations = this._parser.parse(content);

      // Process export statements
      this._processExportDeclarations(content, declarations, exports);

      return exports;
    }

    _processExportDeclarations(content, declarations, exports) {
      var self = this;
      var lines = content.split('\n');

      // Find export statements in the source
      lines.forEach(function(line, lineIndex) {
        var trimmed = line.trim();

        // export const/let/var name = ...
        var varExport = trimmed.match(/^export\s+(const|let|var)\s+(\w+)/);
        if (varExport) {
          var varName = varExport[2];
          // Find corresponding declaration
          var varDecl = self._findDeclaration(declarations, 'VariableDeclaration', varName);
          if (varDecl && varDecl.init) {
            exports[varName] = self._typeFromInit(varDecl.init);
          } else {
            exports[varName] = { kind: TYPE_KIND.UNKNOWN };
          }
          return;
        }

        // export function name() ...
        var funcExport = trimmed.match(/^export\s+(async\s+)?function\s+(\w+)/);
        if (funcExport) {
          var funcName = funcExport[2];
          var funcDecl = self._findDeclaration(declarations, 'FunctionDeclaration', funcName);
          exports[funcName] = {
            kind: TYPE_KIND.FUNCTION,
            name: funcName,
            params: funcDecl ? funcDecl.params : [],
            returnType: funcDecl && funcDecl.returnType
              ? { kind: TYPE_KIND.PRIMITIVE, name: funcDecl.returnType }
              : null
          };
          return;
        }

        // export class Name ...
        var classExport = trimmed.match(/^export\s+class\s+(\w+)/);
        if (classExport) {
          var className = classExport[1];
          var classDecl = self._findDeclaration(declarations, 'ClassDeclaration', className);
          exports[className] = {
            kind: TYPE_KIND.CLASS,
            name: className,
            extends: classDecl ? classDecl.extends : null
          };
          return;
        }

        // export default ...
        var defaultExport = trimmed.match(/^export\s+default\s+/);
        if (defaultExport) {
          // export default class Name
          var defaultClass = trimmed.match(/^export\s+default\s+class\s+(\w+)?/);
          if (defaultClass) {
            exports['default'] = {
              kind: TYPE_KIND.CLASS,
              name: defaultClass[1] || 'default'
            };
            return;
          }

          // export default function
          var defaultFunc = trimmed.match(/^export\s+default\s+(async\s+)?function\s*(\w+)?/);
          if (defaultFunc) {
            exports['default'] = {
              kind: TYPE_KIND.FUNCTION,
              name: defaultFunc[2] || 'default'
            };
            return;
          }

          // export default identifier or expression
          exports['default'] = { kind: TYPE_KIND.UNKNOWN };
          return;
        }

        // export { name1, name2 }
        var namedExports = trimmed.match(/^export\s*\{([^}]+)\}/);
        if (namedExports) {
          var names = namedExports[1].split(',');
          names.forEach(function(name) {
            var parts = name.trim().split(/\s+as\s+/);
            var localName = parts[0].trim();
            var exportedName = parts[1] ? parts[1].trim() : localName;

            // Find the declaration for this name
            var decl = self._findDeclarationByName(declarations, localName);
            if (decl) {
              exports[exportedName] = self._typeFromDeclaration(decl);
            } else {
              exports[exportedName] = { kind: TYPE_KIND.UNKNOWN };
            }
          });
          return;
        }
      });

      return exports;
    }

    _findDeclaration(declarations, type, name) {
      for (var i = 0; i < declarations.length; i++) {
        var decl = declarations[i];
        if (decl.type === type && decl.name === name) {
          return decl;
        }
      }
      return null;
    }

    _findDeclarationByName(declarations, name) {
      for (var i = 0; i < declarations.length; i++) {
        var decl = declarations[i];
        if (decl.name === name) {
          return decl;
        }
      }
      return null;
    }

    _typeFromInit(init) {
      if (!init) {
        return { kind: TYPE_KIND.UNKNOWN };
      }

      switch (init.type) {
        case 'Literal':
          if (init.valueType === 'null' || init.valueType === 'undefined') {
            return { kind: TYPE_KIND.UNKNOWN };
          }
          return { kind: TYPE_KIND.PRIMITIVE, name: init.valueType };

        case 'ArrayLiteral':
          return {
            kind: TYPE_KIND.ARRAY,
            elementType: init.elementType
              ? { kind: TYPE_KIND.PRIMITIVE, name: init.elementType }
              : null
          };

        case 'ObjectLiteral':
          var shape = {};
          if (init.properties) {
            init.properties.forEach(function(prop) {
              if (prop.valueType) {
                shape[prop.key] = { kind: TYPE_KIND.PRIMITIVE, name: prop.valueType };
              } else if (prop.isMethod) {
                shape[prop.key] = { kind: TYPE_KIND.FUNCTION };
              } else {
                shape[prop.key] = { kind: TYPE_KIND.UNKNOWN };
              }
            });
          }
          return { kind: TYPE_KIND.OBJECT, shape: shape };

        case 'NewExpression':
          return { kind: TYPE_KIND.OBJECT, name: init.constructorName };

        case 'ArrowFunction':
        case 'FunctionExpression':
          return {
            kind: TYPE_KIND.FUNCTION,
            returnType: init.returnType
              ? { kind: TYPE_KIND.PRIMITIVE, name: init.returnType }
              : null
          };

        default:
          return { kind: TYPE_KIND.UNKNOWN };
      }
    }

    _typeFromDeclaration(decl) {
      switch (decl.type) {
        case 'VariableDeclaration':
          return this._typeFromInit(decl.init);

        case 'FunctionDeclaration':
          return {
            kind: TYPE_KIND.FUNCTION,
            name: decl.name,
            params: decl.params,
            returnType: decl.returnType
              ? { kind: TYPE_KIND.PRIMITIVE, name: decl.returnType }
              : null
          };

        case 'ClassDeclaration':
          return {
            kind: TYPE_KIND.CLASS,
            name: decl.name,
            extends: decl.extends
          };

        default:
          return { kind: TYPE_KIND.UNKNOWN };
      }
    }

    // ----------------------------------------
    // Import Symbol Resolution
    // ----------------------------------------

    /**
     * Get the type of a specific imported symbol
     * @param {string} localName - Local name in the importing file
     * @param {string} importPath - Import source path
     * @param {string} importedName - Name as exported (or 'default')
     * @param {string} currentFilePath - Current file path
     * @returns {Object} Type descriptor
     */
    async getImportedType(localName, importPath, importedName, currentFilePath) {
      var exports = await this.resolveImport(importPath, currentFilePath);

      if (exports[importedName]) {
        return exports[importedName];
      }

      return { kind: TYPE_KIND.UNKNOWN };
    }

    /**
     * Synchronously get imported type from cache
     * @param {string} importPath - Import source path
     * @param {string} importedName - Name as exported
     * @param {string} currentFilePath - Current file path
     * @returns {Object|null} Type descriptor or null if not cached
     */
    getImportedTypeSync(importPath, importedName, currentFilePath) {
      var resolvedPath = this._resolvePath(importPath, currentFilePath);
      var exports = this._exportCache.get(resolvedPath);

      if (exports && exports[importedName]) {
        return exports[importedName];
      }

      return null;
    }
  }

  // ============================================
  // Export to Namespace
  // ============================================

  CodeEditor.Analysis = CodeEditor.Analysis || {};
  CodeEditor.Analysis.ImportResolver = ImportResolver;

})(window.CodeEditor = window.CodeEditor || {});
