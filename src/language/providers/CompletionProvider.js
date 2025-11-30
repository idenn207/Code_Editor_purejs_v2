/**
 * @fileoverview Completion provider for auto-complete
 * @module language/providers/CompletionProvider
 */

import { SymbolKind } from '../SymbolTable.js';

// ============================================
// Completion Item Kind
// ============================================

export const CompletionItemKind = Object.freeze({
  TEXT: 'text',
  METHOD: 'method',
  FUNCTION: 'function',
  CONSTRUCTOR: 'constructor',
  FIELD: 'field',
  VARIABLE: 'variable',
  CLASS: 'class',
  INTERFACE: 'interface',
  MODULE: 'module',
  PROPERTY: 'property',
  KEYWORD: 'keyword',
  SNIPPET: 'snippet',
  CONSTANT: 'constant',
});

// ============================================
// JavaScript Keywords
// ============================================

const JAVASCRIPT_KEYWORDS = [
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'let',
  'new',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
  'async',
  'await',
  'true',
  'false',
  'null',
  'undefined',
];

// ============================================
// Code Snippets
// ============================================

const CODE_SNIPPETS = [
  {
    label: 'for',
    insertText: 'for (let i = 0; i < ${1:array}.length; i++) {\n\t$0\n}',
    detail: 'For Loop',
    kind: CompletionItemKind.SNIPPET,
  },
  {
    label: 'forof',
    insertText: 'for (const ${1:item} of ${2:array}) {\n\t$0\n}',
    detail: 'For...of Loop',
    kind: CompletionItemKind.SNIPPET,
  },
  {
    label: 'forin',
    insertText: 'for (const ${1:key} in ${2:object}) {\n\t$0\n}',
    detail: 'For...in Loop',
    kind: CompletionItemKind.SNIPPET,
  },
  {
    label: 'foreach',
    insertText: '${1:array}.forEach((${2:item}) => {\n\t$0\n});',
    detail: 'Array forEach',
    kind: CompletionItemKind.SNIPPET,
  },
  {
    label: 'if',
    insertText: 'if (${1:condition}) {\n\t$0\n}',
    detail: 'If Statement',
    kind: CompletionItemKind.SNIPPET,
  },
  {
    label: 'ifelse',
    insertText: 'if (${1:condition}) {\n\t$2\n} else {\n\t$0\n}',
    detail: 'If-Else Statement',
    kind: CompletionItemKind.SNIPPET,
  },
  {
    label: 'switch',
    insertText: 'switch (${1:expression}) {\n\tcase ${2:value}:\n\t\t$0\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}',
    detail: 'Switch Statement',
    kind: CompletionItemKind.SNIPPET,
  },
  {
    label: 'try',
    insertText: 'try {\n\t$0\n} catch (${1:error}) {\n\tconsole.error($1);\n}',
    detail: 'Try-Catch Block',
    kind: CompletionItemKind.SNIPPET,
  },
  {
    label: 'func',
    insertText: 'function ${1:name}(${2:params}) {\n\t$0\n}',
    detail: 'Function Declaration',
    kind: CompletionItemKind.SNIPPET,
  },
  {
    label: 'arrow',
    insertText: 'const ${1:name} = (${2:params}) => {\n\t$0\n};',
    detail: 'Arrow Function',
    kind: CompletionItemKind.SNIPPET,
  },
  {
    label: 'class',
    insertText: 'class ${1:ClassName} {\n\tconstructor(${2:params}) {\n\t\t$0\n\t}\n}',
    detail: 'Class Declaration',
    kind: CompletionItemKind.SNIPPET,
  },
  {
    label: 'log',
    insertText: 'console.log($0);',
    detail: 'Console Log',
    kind: CompletionItemKind.SNIPPET,
  },
  {
    label: 'promise',
    insertText: 'new Promise((resolve, reject) => {\n\t$0\n});',
    detail: 'New Promise',
    kind: CompletionItemKind.SNIPPET,
  },
  {
    label: 'asyncfn',
    insertText: 'async function ${1:name}(${2:params}) {\n\t$0\n}',
    detail: 'Async Function',
    kind: CompletionItemKind.SNIPPET,
  },
];

// ============================================
// Array Methods for Auto-Complete
// ============================================

const ARRAY_METHODS = [
  { name: 'push', detail: '(...items) → number', documentation: 'Adds elements to end' },
  { name: 'pop', detail: '() → T | undefined', documentation: 'Removes last element' },
  { name: 'shift', detail: '() → T | undefined', documentation: 'Removes first element' },
  { name: 'unshift', detail: '(...items) → number', documentation: 'Adds elements to beginning' },
  { name: 'slice', detail: '(start?, end?) → T[]', documentation: 'Returns a section' },
  { name: 'splice', detail: '(start, deleteCount?, ...items) → T[]', documentation: 'Adds/removes elements' },
  { name: 'concat', detail: '(...items) → T[]', documentation: 'Merges arrays' },
  { name: 'join', detail: '(separator?) → string', documentation: 'Joins elements into string' },
  { name: 'reverse', detail: '() → T[]', documentation: 'Reverses in place' },
  { name: 'sort', detail: '(compareFn?) → T[]', documentation: 'Sorts in place' },
  { name: 'indexOf', detail: '(item, fromIndex?) → number', documentation: 'Finds index of element' },
  { name: 'lastIndexOf', detail: '(item, fromIndex?) → number', documentation: 'Finds last index' },
  { name: 'includes', detail: '(item, fromIndex?) → boolean', documentation: 'Checks if contains' },
  { name: 'find', detail: '(predicate) → T | undefined', documentation: 'Finds first match' },
  { name: 'findIndex', detail: '(predicate) → number', documentation: 'Finds index of first match' },
  { name: 'filter', detail: '(predicate) → T[]', documentation: 'Filters elements' },
  { name: 'map', detail: '(callback) → U[]', documentation: 'Maps elements' },
  { name: 'reduce', detail: '(callback, initialValue?) → U', documentation: 'Reduces to single value' },
  { name: 'reduceRight', detail: '(callback, initialValue?) → U', documentation: 'Reduces from right' },
  { name: 'forEach', detail: '(callback) → void', documentation: 'Iterates elements' },
  { name: 'every', detail: '(predicate) → boolean', documentation: 'Tests all elements' },
  { name: 'some', detail: '(predicate) → boolean', documentation: 'Tests any element' },
  { name: 'flat', detail: '(depth?) → T[]', documentation: 'Flattens nested arrays' },
  { name: 'flatMap', detail: '(callback) → U[]', documentation: 'Maps then flattens' },
  { name: 'fill', detail: '(value, start?, end?) → T[]', documentation: 'Fills with value' },
  { name: 'copyWithin', detail: '(target, start?, end?) → T[]', documentation: 'Copies within array' },
  { name: 'entries', detail: '() → Iterator', documentation: 'Returns [index, value] iterator' },
  { name: 'keys', detail: '() → Iterator', documentation: 'Returns index iterator' },
  { name: 'values', detail: '() → Iterator', documentation: 'Returns value iterator' },
  { name: 'length', detail: ': number', documentation: 'Array length', kind: CompletionItemKind.PROPERTY },
];

// String methods
const STRING_METHODS = [
  { name: 'charAt', detail: '(index) → string' },
  { name: 'charCodeAt', detail: '(index) → number' },
  { name: 'concat', detail: '(...strings) → string' },
  { name: 'includes', detail: '(search, start?) → boolean' },
  { name: 'indexOf', detail: '(search, start?) → number' },
  { name: 'lastIndexOf', detail: '(search, start?) → number' },
  { name: 'match', detail: '(regexp) → string[] | null' },
  { name: 'matchAll', detail: '(regexp) → Iterator' },
  { name: 'padStart', detail: '(length, pad?) → string' },
  { name: 'padEnd', detail: '(length, pad?) → string' },
  { name: 'repeat', detail: '(count) → string' },
  { name: 'replace', detail: '(search, replace) → string' },
  { name: 'replaceAll', detail: '(search, replace) → string' },
  { name: 'search', detail: '(regexp) → number' },
  { name: 'slice', detail: '(start?, end?) → string' },
  { name: 'split', detail: '(separator?, limit?) → string[]' },
  { name: 'startsWith', detail: '(search, start?) → boolean' },
  { name: 'endsWith', detail: '(search, end?) → boolean' },
  { name: 'substring', detail: '(start, end?) → string' },
  { name: 'toLowerCase', detail: '() → string' },
  { name: 'toUpperCase', detail: '() → string' },
  { name: 'trim', detail: '() → string' },
  { name: 'trimStart', detail: '() → string' },
  { name: 'trimEnd', detail: '() → string' },
  { name: 'length', detail: ': number', kind: CompletionItemKind.PROPERTY },
];

// ============================================
// Completion Provider Class
// ============================================

/**
 * Provides auto-complete suggestions based on context
 */
export class CompletionProvider {
  constructor(languageService) {
    this._languageService = languageService;
  }

  /**
   * Get completions at cursor position
   * @param {Document} document - Document instance
   * @param {number} offset - Cursor offset
   * @returns {Array} - Completion items
   */
  provideCompletions(document, offset) {
    const text = document.getText();
    const context = this._getCompletionContext(text, offset);

    let completions = [];

    switch (context.type) {
      case 'member':
        completions = this._getMemberCompletions(context);
        break;

      case 'global':
        completions = this._getGlobalCompletions(context);
        break;

      case 'import':
        completions = this._getImportCompletions(context);
        break;

      case 'string':
        // Inside string - no completions
        return [];

      default:
        completions = this._getGlobalCompletions(context);
    }

    // Filter by prefix
    if (context.prefix) {
      const prefix = context.prefix.toLowerCase();
      completions = completions.filter((c) => c.label.toLowerCase().startsWith(prefix) || c.label.toLowerCase().includes(prefix));
    }

    // Sort completions
    completions.sort((a, b) => {
      // Exact prefix match first
      const aExact = a.label.toLowerCase().startsWith(context.prefix?.toLowerCase() || '');
      const bExact = b.label.toLowerCase().startsWith(context.prefix?.toLowerCase() || '');
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      // Then by sort text
      return (a.sortText || a.label).localeCompare(b.sortText || b.label);
    });

    return completions;
  }

  // ----------------------------------------
  // Context Detection
  // ----------------------------------------

  _getCompletionContext(text, offset) {
    const beforeCursor = text.slice(0, offset);
    const lines = beforeCursor.split('\n');
    const currentLine = lines[lines.length - 1];

    // Check if inside string
    if (this._isInsideString(beforeCursor)) {
      return { type: 'string', offset };
    }

    // Check for member access (obj. or obj?.)
    const memberMatch = currentLine.match(/(\w+)\s*(\?\.|\.)(\w*)$/);
    if (memberMatch) {
      return {
        type: 'member',
        objectName: memberMatch[1],
        optional: memberMatch[2] === '?.',
        prefix: memberMatch[3] || '',
        offset,
      };
    }

    // Check for chained member access
    const chainedMatch = currentLine.match(/\.(\w*)$/);
    if (chainedMatch) {
      // Try to find the object in chain
      const beforeDot = currentLine.slice(0, currentLine.lastIndexOf('.'));
      const lastWord = beforeDot.match(/(\w+)\s*$/);

      return {
        type: 'member',
        objectName: lastWord ? lastWord[1] : null,
        prefix: chainedMatch[1] || '',
        offset,
      };
    }

    // Check for import statement
    const importMatch = currentLine.match(/import\s+.*from\s+['"]([^'"]*)$/);
    if (importMatch) {
      return {
        type: 'import',
        path: importMatch[1],
        offset,
      };
    }

    // Check for require
    const requireMatch = currentLine.match(/require\s*\(\s*['"]([^'"]*)$/);
    if (requireMatch) {
      return {
        type: 'import',
        path: requireMatch[1],
        offset,
      };
    }

    // Default: global/local completion
    const wordMatch = currentLine.match(/(\w*)$/);
    return {
      type: 'global',
      prefix: wordMatch ? wordMatch[1] : '',
      offset,
    };
  }

  _isInsideString(text) {
    let inString = false;
    let stringChar = null;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const prevChar = text[i - 1];

      if (inString) {
        if (char === stringChar && prevChar !== '\\') {
          inString = false;
          stringChar = null;
        }
      } else {
        if (char === '"' || char === "'" || char === '`') {
          inString = true;
          stringChar = char;
        }
      }
    }

    return inString;
  }

  // ----------------------------------------
  // Completion Generators
  // ----------------------------------------

  _getMemberCompletions(context) {
    const { objectName, prefix } = context;
    const completions = [];

    if (!objectName) {
      return [];
    }

    // Get symbol table
    const symbolTable = this._languageService.getSymbolTable();
    const symbol = symbolTable.resolve(objectName);

    if (symbol) {
      // Add symbol members
      for (const member of symbol.members) {
        completions.push({
          label: member.name,
          kind: this._mapSymbolKind(member.kind),
          detail: member.type || member.kind,
          insertText: member.name,
          documentation: member.documentation,
          sortText: '0' + member.name,
        });
      }

      // Add inferred type methods
      if (symbol.type === 'array') {
        completions.push(...this._getArrayMethods());
      } else if (symbol.type === 'string') {
        completions.push(...this._getStringMethods());
      }
    }

    // Add built-in object methods
    const builtinCompletions = this._getBuiltinMemberCompletions(objectName);
    completions.push(...builtinCompletions);

    return completions;
  }

  _getGlobalCompletions(context) {
    const completions = [];
    const symbolTable = this._languageService.getSymbolTable();

    // Add visible symbols
    const symbols = symbolTable.getAllVisibleSymbols();
    for (const symbol of symbols) {
      completions.push({
        label: symbol.name,
        kind: this._mapSymbolKind(symbol.kind),
        detail: symbol.type || symbol.kind,
        insertText: symbol.name,
        documentation: symbol.documentation,
        sortText: '0' + symbol.name,
      });
    }

    // Add keywords
    for (const keyword of JAVASCRIPT_KEYWORDS) {
      completions.push({
        label: keyword,
        kind: CompletionItemKind.KEYWORD,
        detail: 'keyword',
        insertText: keyword,
        sortText: '1' + keyword,
      });
    }

    // Add snippets
    for (const snippet of CODE_SNIPPETS) {
      completions.push({
        ...snippet,
        sortText: '2' + snippet.label,
      });
    }

    return completions;
  }

  _getImportCompletions(context) {
    // Could return module suggestions from project structure
    return [];
  }

  _getBuiltinMemberCompletions(objectName) {
    const completions = [];

    // Common built-in objects
    const builtins = {
      console: [
        { name: 'log', detail: '(...data) → void' },
        { name: 'error', detail: '(...data) → void' },
        { name: 'warn', detail: '(...data) → void' },
        { name: 'info', detail: '(...data) → void' },
        { name: 'debug', detail: '(...data) → void' },
        { name: 'table', detail: '(data, columns?) → void' },
        { name: 'clear', detail: '() → void' },
        { name: 'time', detail: '(label?) → void' },
        { name: 'timeEnd', detail: '(label?) → void' },
        { name: 'group', detail: '(...label) → void' },
        { name: 'groupEnd', detail: '() → void' },
        { name: 'assert', detail: '(condition, ...data) → void' },
        { name: 'count', detail: '(label?) → void' },
        { name: 'dir', detail: '(obj) → void' },
        { name: 'trace', detail: '(...data) → void' },
      ],
      Math: [
        { name: 'abs', detail: '(x) → number' },
        { name: 'ceil', detail: '(x) → number' },
        { name: 'floor', detail: '(x) → number' },
        { name: 'round', detail: '(x) → number' },
        { name: 'max', detail: '(...values) → number' },
        { name: 'min', detail: '(...values) → number' },
        { name: 'random', detail: '() → number' },
        { name: 'sqrt', detail: '(x) → number' },
        { name: 'pow', detail: '(x, y) → number' },
        { name: 'sin', detail: '(x) → number' },
        { name: 'cos', detail: '(x) → number' },
        { name: 'tan', detail: '(x) → number' },
        { name: 'PI', detail: ': number', kind: CompletionItemKind.CONSTANT },
        { name: 'E', detail: ': number', kind: CompletionItemKind.CONSTANT },
        { name: 'log', detail: '(x) → number' },
        { name: 'log10', detail: '(x) → number' },
        { name: 'exp', detail: '(x) → number' },
        { name: 'sign', detail: '(x) → number' },
        { name: 'trunc', detail: '(x) → number' },
      ],
      JSON: [
        { name: 'parse', detail: '(text, reviver?) → any' },
        { name: 'stringify', detail: '(value, replacer?, space?) → string' },
      ],
      Object: [
        { name: 'keys', detail: '(obj) → string[]' },
        { name: 'values', detail: '(obj) → any[]' },
        { name: 'entries', detail: '(obj) → [string, any][]' },
        { name: 'assign', detail: '(target, ...sources) → object' },
        { name: 'freeze', detail: '(obj) → object' },
        { name: 'seal', detail: '(obj) → object' },
        { name: 'create', detail: '(proto, properties?) → object' },
        { name: 'defineProperty', detail: '(obj, prop, descriptor) → object' },
        { name: 'getOwnPropertyNames', detail: '(obj) → string[]' },
        { name: 'hasOwnProperty', detail: '(prop) → boolean' },
        { name: 'fromEntries', detail: '(entries) → object' },
      ],
      Array: [
        { name: 'from', detail: '(arrayLike, mapFn?) → T[]' },
        { name: 'isArray', detail: '(value) → boolean' },
        { name: 'of', detail: '(...items) → T[]' },
      ],
      Promise: [
        { name: 'all', detail: '(promises) → Promise' },
        { name: 'race', detail: '(promises) → Promise' },
        { name: 'resolve', detail: '(value) → Promise' },
        { name: 'reject', detail: '(reason) → Promise' },
        { name: 'allSettled', detail: '(promises) → Promise' },
        { name: 'any', detail: '(promises) → Promise' },
      ],
      document: [
        { name: 'getElementById', detail: '(id) → Element | null' },
        { name: 'querySelector', detail: '(selector) → Element | null' },
        { name: 'querySelectorAll', detail: '(selector) → NodeList' },
        { name: 'createElement', detail: '(tag) → Element' },
        { name: 'createTextNode', detail: '(text) → Text' },
        { name: 'addEventListener', detail: '(type, listener) → void' },
        { name: 'removeEventListener', detail: '(type, listener) → void' },
        { name: 'body', detail: ': HTMLElement', kind: CompletionItemKind.PROPERTY },
        { name: 'head', detail: ': HTMLElement', kind: CompletionItemKind.PROPERTY },
        { name: 'documentElement', detail: ': HTMLElement', kind: CompletionItemKind.PROPERTY },
      ],
    };

    const members = builtins[objectName];
    if (members) {
      for (const member of members) {
        completions.push({
          label: member.name,
          kind: member.kind || CompletionItemKind.METHOD,
          detail: member.detail,
          insertText: member.name,
          sortText: '0' + member.name,
        });
      }
    }

    return completions;
  }

  _getArrayMethods() {
    return ARRAY_METHODS.map((m) => ({
      label: m.name,
      kind: m.kind || CompletionItemKind.METHOD,
      detail: m.detail,
      documentation: m.documentation,
      insertText: m.name,
      sortText: '0' + m.name,
    }));
  }

  _getStringMethods() {
    return STRING_METHODS.map((m) => ({
      label: m.name,
      kind: m.kind || CompletionItemKind.METHOD,
      detail: m.detail,
      insertText: m.name,
      sortText: '0' + m.name,
    }));
  }

  // ----------------------------------------
  // Helpers
  // ----------------------------------------

  _mapSymbolKind(kind) {
    switch (kind) {
      case SymbolKind.FUNCTION:
        return CompletionItemKind.FUNCTION;
      case SymbolKind.METHOD:
        return CompletionItemKind.METHOD;
      case SymbolKind.CLASS:
        return CompletionItemKind.CLASS;
      case SymbolKind.VARIABLE:
        return CompletionItemKind.VARIABLE;
      case SymbolKind.PARAMETER:
        return CompletionItemKind.VARIABLE;
      case SymbolKind.PROPERTY:
        return CompletionItemKind.PROPERTY;
      case SymbolKind.GETTER:
        return CompletionItemKind.PROPERTY;
      case SymbolKind.SETTER:
        return CompletionItemKind.PROPERTY;
      default:
        return CompletionItemKind.TEXT;
    }
  }
}
