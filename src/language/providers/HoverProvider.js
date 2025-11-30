/**
 * @fileoverview Hover information provider
 * @module language/providers/HoverProvider
 *
 * Provides symbol information when user hovers over code.
 * Resolves symbols from SymbolTable and provides formatted documentation.
 */

import { SymbolKind } from '../SymbolTable.js';

// ============================================
// Constants
// ============================================

/**
 * Built-in documentation for common JavaScript APIs
 */
const BUILTIN_DOCS = {
  // Console methods
  'console.log': {
    signature: '(...data: any[]) → void',
    description: 'Outputs a message to the web console.',
  },
  'console.error': {
    signature: '(...data: any[]) → void',
    description: 'Outputs an error message to the web console.',
  },
  'console.warn': {
    signature: '(...data: any[]) → void',
    description: 'Outputs a warning message to the web console.',
  },
  'console.info': {
    signature: '(...data: any[]) → void',
    description: 'Outputs an informational message to the web console.',
  },
  'console.debug': {
    signature: '(...data: any[]) → void',
    description: 'Outputs a debug message to the web console.',
  },
  'console.table': {
    signature: '(data: any, columns?: string[]) → void',
    description: 'Displays tabular data as a table.',
  },
  'console.clear': {
    signature: '() → void',
    description: 'Clears the console.',
  },
  'console.time': {
    signature: '(label?: string) → void',
    description: 'Starts a timer with a specified label.',
  },
  'console.timeEnd': {
    signature: '(label?: string) → void',
    description: 'Stops a timer and logs the elapsed time.',
  },
  'console.assert': {
    signature: '(condition: boolean, ...data: any[]) → void',
    description: 'Logs a message if the assertion is false.',
  },
  'console.group': {
    signature: '(...label: any[]) → void',
    description: 'Creates a new inline group in the console.',
  },
  'console.groupEnd': {
    signature: '() → void',
    description: 'Exits the current inline group.',
  },

  // Math methods
  'Math.abs': {
    signature: '(x: number) → number',
    description: 'Returns the absolute value of a number.',
  },
  'Math.ceil': {
    signature: '(x: number) → number',
    description: 'Returns the smallest integer greater than or equal to x.',
  },
  'Math.floor': {
    signature: '(x: number) → number',
    description: 'Returns the largest integer less than or equal to x.',
  },
  'Math.round': {
    signature: '(x: number) → number',
    description: 'Returns the value of x rounded to the nearest integer.',
  },
  'Math.max': {
    signature: '(...values: number[]) → number',
    description: 'Returns the largest of zero or more numbers.',
  },
  'Math.min': {
    signature: '(...values: number[]) → number',
    description: 'Returns the smallest of zero or more numbers.',
  },
  'Math.random': {
    signature: '() → number',
    description: 'Returns a pseudo-random number between 0 and 1.',
  },
  'Math.sqrt': {
    signature: '(x: number) → number',
    description: 'Returns the square root of a number.',
  },
  'Math.pow': {
    signature: '(base: number, exponent: number) → number',
    description: 'Returns base raised to the power of exponent.',
  },
  'Math.sin': {
    signature: '(x: number) → number',
    description: 'Returns the sine of a number (in radians).',
  },
  'Math.cos': {
    signature: '(x: number) → number',
    description: 'Returns the cosine of a number (in radians).',
  },
  'Math.tan': {
    signature: '(x: number) → number',
    description: 'Returns the tangent of a number (in radians).',
  },
  'Math.PI': {
    signature: ': number',
    description: "The ratio of a circle's circumference to its diameter (~3.14159).",
  },
  'Math.E': {
    signature: ': number',
    description: "Euler's constant (~2.71828).",
  },

  // JSON methods
  'JSON.parse': {
    signature: '(text: string, reviver?: Function) → any',
    description: 'Parses a JSON string and returns the resulting value.',
  },
  'JSON.stringify': {
    signature: '(value: any, replacer?: Function, space?: number) → string',
    description: 'Converts a JavaScript value to a JSON string.',
  },

  // Object methods
  'Object.keys': {
    signature: '(obj: object) → string[]',
    description: "Returns an array of a given object's own enumerable property names.",
  },
  'Object.values': {
    signature: '(obj: object) → any[]',
    description: "Returns an array of a given object's own enumerable property values.",
  },
  'Object.entries': {
    signature: '(obj: object) → [string, any][]',
    description: "Returns an array of a given object's own enumerable [key, value] pairs.",
  },
  'Object.assign': {
    signature: '(target: object, ...sources: object[]) → object',
    description: 'Copies all enumerable own properties from source objects to target.',
  },
  'Object.freeze': {
    signature: '(obj: object) → object',
    description: 'Freezes an object, preventing new properties from being added.',
  },
  'Object.create': {
    signature: '(proto: object, properties?: object) → object',
    description: 'Creates a new object with the specified prototype.',
  },

  // Array methods
  'Array.from': {
    signature: '(arrayLike: Iterable, mapFn?: Function) → any[]',
    description: 'Creates a new Array from an array-like or iterable object.',
  },
  'Array.isArray': {
    signature: '(value: any) → boolean',
    description: 'Determines whether the passed value is an Array.',
  },
  'Array.of': {
    signature: '(...items: any[]) → any[]',
    description: 'Creates a new Array with a variable number of arguments.',
  },

  // Promise methods
  'Promise.all': {
    signature: '(promises: Promise[]) → Promise',
    description: 'Returns a promise that resolves when all promises resolve.',
  },
  'Promise.race': {
    signature: '(promises: Promise[]) → Promise',
    description: 'Returns a promise that resolves/rejects with the first settled promise.',
  },
  'Promise.resolve': {
    signature: '(value: any) → Promise',
    description: 'Returns a Promise that is resolved with the given value.',
  },
  'Promise.reject': {
    signature: '(reason: any) → Promise',
    description: 'Returns a Promise that is rejected with the given reason.',
  },

  // Global functions
  setTimeout: {
    signature: '(callback: Function, delay?: number, ...args: any[]) → number',
    description: 'Calls a function after a specified delay in milliseconds.',
  },
  setInterval: {
    signature: '(callback: Function, delay?: number, ...args: any[]) → number',
    description: 'Repeatedly calls a function with a fixed time delay.',
  },
  clearTimeout: {
    signature: '(timeoutId: number) → void',
    description: 'Cancels a timeout previously established by setTimeout().',
  },
  clearInterval: {
    signature: '(intervalId: number) → void',
    description: 'Cancels a timed, repeating action established by setInterval().',
  },
  parseInt: {
    signature: '(string: string, radix?: number) → number',
    description: 'Parses a string and returns an integer of the specified radix.',
  },
  parseFloat: {
    signature: '(string: string) → number',
    description: 'Parses a string and returns a floating point number.',
  },
  isNaN: {
    signature: '(value: any) → boolean',
    description: 'Determines whether a value is NaN.',
  },
  isFinite: {
    signature: '(value: any) → boolean',
    description: 'Determines whether a value is a finite number.',
  },
  fetch: {
    signature: '(url: string, options?: object) → Promise<Response>',
    description: 'Starts the process of fetching a resource from the network.',
  },
};

/**
 * Keyword documentation
 */
const KEYWORD_DOCS = {
  const: {
    description: 'Declares a block-scoped constant. The value cannot be reassigned.',
  },
  let: {
    description: 'Declares a block-scoped variable, optionally initializing it.',
  },
  var: {
    description: 'Declares a function-scoped or globally-scoped variable.',
  },
  function: {
    description: 'Declares a function with specified parameters.',
  },
  class: {
    description: 'Declares a class (syntactic sugar over prototypes).',
  },
  if: {
    description: 'Executes a statement if a specified condition is truthy.',
  },
  else: {
    description: 'Executes a statement if the previous if condition was falsy.',
  },
  for: {
    description: 'Creates a loop with three optional expressions.',
  },
  while: {
    description: 'Creates a loop that executes while a condition is true.',
  },
  do: {
    description: 'Creates a loop that executes at least once, then repeats while condition is true.',
  },
  switch: {
    description: 'Evaluates an expression and executes matching case statements.',
  },
  case: {
    description: 'Defines a case clause in a switch statement.',
  },
  break: {
    description: 'Terminates the current loop or switch statement.',
  },
  continue: {
    description: 'Terminates execution of current iteration and continues with next.',
  },
  return: {
    description: 'Ends function execution and specifies value to be returned.',
  },
  throw: {
    description: 'Throws a user-defined exception.',
  },
  try: {
    description: 'Marks a block of statements to try, with error handling.',
  },
  catch: {
    description: 'Handles any exception thrown in the try block.',
  },
  finally: {
    description: 'Executes after try/catch regardless of the result.',
  },
  async: {
    description: 'Declares an asynchronous function that returns a Promise.',
  },
  await: {
    description: 'Pauses async function execution until a Promise settles.',
  },
  import: {
    description: 'Imports bindings exported by another module.',
  },
  export: {
    description: 'Exports functions, objects, or primitives from a module.',
  },
  new: {
    description: 'Creates an instance of a constructor function or class.',
  },
  this: {
    description: 'Refers to the current execution context.',
  },
  super: {
    description: 'Calls the parent class constructor or methods.',
  },
  extends: {
    description: 'Creates a class as a child of another class.',
  },
  static: {
    description: 'Defines a static method or property for a class.',
  },
  typeof: {
    description: 'Returns a string indicating the type of the operand.',
  },
  instanceof: {
    description: 'Tests whether an object has a prototype in its chain.',
  },
  in: {
    description: 'Tests whether a property exists in an object.',
  },
  delete: {
    description: 'Removes a property from an object.',
  },
  void: {
    description: 'Evaluates an expression and returns undefined.',
  },
  yield: {
    description: 'Pauses and resumes a generator function.',
  },
  true: {
    description: 'Boolean literal representing logical true.',
  },
  false: {
    description: 'Boolean literal representing logical false.',
  },
  null: {
    description: 'Represents intentional absence of any object value.',
  },
  undefined: {
    description: 'Represents a variable that has not been assigned a value.',
  },
};

// ============================================
// HoverInfo Class
// ============================================

/**
 * Represents hover information for a symbol
 */
export class HoverInfo {
  constructor(contents, range) {
    this.contents = contents; // Array of { kind: 'code'|'text', value: string }
    this.range = range; // { start: number, end: number }
  }
}

// ============================================
// HoverProvider Class
// ============================================

/**
 * Provides hover information for symbols in the editor
 */
export class HoverProvider {
  // ----------------------------------------
  // Instance Properties
  // ----------------------------------------
  _languageService = null;

  // ----------------------------------------
  // Constructor
  // ----------------------------------------

  /**
   * @param {LanguageService} languageService - Language service instance
   */
  constructor(languageService) {
    this._languageService = languageService;
  }

  // ----------------------------------------
  // Public Methods
  // ----------------------------------------

  /**
   * Provide hover information at a given offset
   * @param {Document} document - Document instance
   * @param {number} offset - Cursor offset
   * @returns {HoverInfo|null}
   */
  provideHover(document, offset) {
    const text = document.getText();

    // Get word at offset
    const wordInfo = this._getWordAtOffset(text, offset);
    if (!wordInfo) {
      return null;
    }

    const { word, start, end } = wordInfo;

    // Check for keyword
    if (KEYWORD_DOCS[word]) {
      return this._createKeywordHover(word, start, end);
    }

    // Check for member expression (e.g., "console.log")
    const memberContext = this._getMemberContext(text, start);
    if (memberContext) {
      const fullName = `${memberContext.objectName}.${word}`;

      // Check built-in docs
      if (BUILTIN_DOCS[fullName]) {
        return this._createBuiltinHover(fullName, memberContext.objectName, word, start, end);
      }

      // Try to resolve from symbol table
      const memberHover = this._resolveMemberHover(memberContext.objectName, word, start, end);
      if (memberHover) {
        return memberHover;
      }
    }

    // Check for standalone built-in (global functions)
    if (BUILTIN_DOCS[word]) {
      return this._createBuiltinHover(word, null, word, start, end);
    }

    // Try to resolve from symbol table
    const symbolHover = this._resolveSymbolHover(word, start, end);
    if (symbolHover) {
      return symbolHover;
    }

    return null;
  }

  // ----------------------------------------
  // Word Extraction
  // ----------------------------------------

  /**
   * Get word at a specific offset
   * @param {string} text - Full document text
   * @param {number} offset - Cursor offset
   * @returns {{ word: string, start: number, end: number }|null}
   */
  _getWordAtOffset(text, offset) {
    if (offset < 0 || offset > text.length) {
      return null;
    }

    // Find word boundaries
    let start = offset;
    let end = offset;

    // Move start backwards
    while (start > 0 && this._isWordChar(text[start - 1])) {
      start--;
    }

    // Move end forwards
    while (end < text.length && this._isWordChar(text[end])) {
      end++;
    }

    if (start === end) {
      return null;
    }

    return {
      word: text.slice(start, end),
      start,
      end,
    };
  }

  /**
   * Check if character is part of a word
   * @param {string} char
   * @returns {boolean}
   */
  _isWordChar(char) {
    return /[\w$]/.test(char);
  }

  /**
   * Get member expression context (object name before dot)
   * @param {string} text - Full document text
   * @param {number} wordStart - Start of current word
   * @returns {{ objectName: string, dotOffset: number }|null}
   */
  _getMemberContext(text, wordStart) {
    // Check for dot before word
    let pos = wordStart - 1;

    // Skip whitespace
    while (pos >= 0 && /\s/.test(text[pos])) {
      pos--;
    }

    // Check for dot or optional chaining
    if (pos >= 0 && (text[pos] === '.' || (text[pos] === '.' && text[pos - 1] === '?'))) {
      const dotOffset = pos;
      pos--;

      // Skip optional chaining
      if (pos >= 0 && text[pos] === '?') {
        pos--;
      }

      // Skip whitespace
      while (pos >= 0 && /\s/.test(text[pos])) {
        pos--;
      }

      // Find object name
      let objectEnd = pos + 1;
      while (pos >= 0 && this._isWordChar(text[pos])) {
        pos--;
      }
      const objectStart = pos + 1;

      if (objectStart < objectEnd) {
        return {
          objectName: text.slice(objectStart, objectEnd),
          dotOffset,
        };
      }
    }

    return null;
  }

  // ----------------------------------------
  // Hover Creation Methods
  // ----------------------------------------

  /**
   * Create hover for keyword
   */
  _createKeywordHover(keyword, start, end) {
    const doc = KEYWORD_DOCS[keyword];

    return new HoverInfo(
      [
        { kind: 'code', value: `(keyword) ${keyword}` },
        { kind: 'text', value: doc.description },
      ],
      { start, end }
    );
  }

  /**
   * Create hover for built-in API
   */
  _createBuiltinHover(fullName, objectName, methodName, start, end) {
    const doc = BUILTIN_DOCS[fullName];
    const displayName = objectName ? `${objectName}.${methodName}` : methodName;

    // Determine kind based on signature
    const isProperty = doc.signature.startsWith(':');
    const kindLabel = isProperty ? 'property' : 'method';

    const signatureLine = isProperty ? `(${kindLabel}) ${displayName}${doc.signature}` : `(${kindLabel}) ${displayName}${doc.signature}`;

    return new HoverInfo(
      [
        { kind: 'code', value: signatureLine },
        { kind: 'text', value: doc.description },
      ],
      { start, end }
    );
  }

  /**
   * Resolve hover from symbol table for member expression
   */
  _resolveMemberHover(objectName, memberName, start, end) {
    const symbolTable = this._languageService.getSymbolTable();
    const objectSymbol = symbolTable.resolve(objectName);

    if (!objectSymbol) {
      return null;
    }

    // Find member
    const member = objectSymbol.getMember(memberName);
    if (!member) {
      return null;
    }

    return this._createSymbolHover(member, objectName, start, end);
  }

  /**
   * Resolve hover from symbol table
   */
  _resolveSymbolHover(name, start, end) {
    const symbolTable = this._languageService.getSymbolTable();
    const symbol = symbolTable.resolve(name);

    if (!symbol) {
      return null;
    }

    return this._createSymbolHover(symbol, null, start, end);
  }

  /**
   * Create hover content from a Symbol
   */
  _createSymbolHover(symbol, parentName, start, end) {
    const contents = [];

    // Build signature line
    const signatureLine = this._formatSymbolSignature(symbol, parentName);
    contents.push({ kind: 'code', value: signatureLine });

    // Add type information if available
    if (symbol.type && symbol.type !== 'unknown' && symbol.type !== 'builtin') {
      contents.push({ kind: 'text', value: `Type: ${symbol.type}` });
    }

    // Add documentation if available
    if (symbol.documentation) {
      contents.push({ kind: 'text', value: symbol.documentation });
    }

    // Add members info for objects/classes
    if (symbol.members && symbol.members.length > 0) {
      const memberNames = symbol.members
        .slice(0, 5)
        .map((m) => m.name)
        .join(', ');
      const more = symbol.members.length > 5 ? `, ... (+${symbol.members.length - 5} more)` : '';
      contents.push({ kind: 'text', value: `Members: ${memberNames}${more}` });
    }

    return new HoverInfo(contents, { start, end });
  }

  /**
   * Format symbol signature for display
   */
  _formatSymbolSignature(symbol, parentName) {
    const kindLabel = this._getKindLabel(symbol.kind);
    const prefix = parentName ? `${parentName}.` : '';
    const name = `${prefix}${symbol.name}`;

    switch (symbol.kind) {
      case SymbolKind.FUNCTION:
      case SymbolKind.METHOD: {
        const params = symbol.parameters?.join(', ') || '';
        const returnType = symbol.returnType || 'void';
        return `(${kindLabel}) ${name}(${params}) → ${returnType}`;
      }

      case SymbolKind.CLASS: {
        return `(${kindLabel}) ${name}`;
      }

      case SymbolKind.VARIABLE:
      case SymbolKind.PARAMETER: {
        const type = symbol.type || 'any';
        return `(${kindLabel}) ${name}: ${type}`;
      }

      case SymbolKind.PROPERTY:
      case SymbolKind.GETTER:
      case SymbolKind.SETTER: {
        const type = symbol.type || 'any';
        return `(${kindLabel}) ${name}: ${type}`;
      }

      default:
        return `${name}`;
    }
  }

  /**
   * Get human-readable kind label
   */
  _getKindLabel(kind) {
    switch (kind) {
      case SymbolKind.FUNCTION:
        return 'function';
      case SymbolKind.METHOD:
        return 'method';
      case SymbolKind.CLASS:
        return 'class';
      case SymbolKind.VARIABLE:
        return 'variable';
      case SymbolKind.PARAMETER:
        return 'parameter';
      case SymbolKind.PROPERTY:
        return 'property';
      case SymbolKind.GETTER:
        return 'getter';
      case SymbolKind.SETTER:
        return 'setter';
      case SymbolKind.IMPORT:
        return 'import';
      default:
        return 'symbol';
    }
  }
}
