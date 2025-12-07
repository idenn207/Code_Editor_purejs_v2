# Code Editor V2 - Development Roadmap

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture Design](#2-architecture-design)
3. [Feature Specifications](#3-feature-specifications)
4. [Implementation Phases](#4-implementation-phases)
5. [File Structure](#5-file-structure)

---

## 1. Overview

### 1.1 Current Architecture Analysis

```
Current Structure:
┌─────────────────────────────────────────────────┐
│                    Editor.js                     │
│              (Main Entry Point)                  │
├─────────────────────────────────────────────────┤
│  Document.js  │  EditorView.js  │ InputHandler  │
│   (Model)     │    (View)       │   (Input)     │
├─────────────────────────────────────────────────┤
│              Tokenizer + Grammar                 │
│           (Syntax Highlighting)                  │
└─────────────────────────────────────────────────┘
```

### 1.2 Features to Implement

| #   | Feature          | Description                                     |
| --- | ---------------- | ----------------------------------------------- |
| 1   | Autocomplete     | Hardcoded completions for JS/HTML/CSS built-ins |
| 2   | Auto-Close       | Automatic bracket, quote, and tag closing       |
| 3   | Auto-Indent      | Smart indentation on Enter key                  |
| 4   | Keyword Search   | Find and Replace functionality                  |
| 5   | Multi Cursor     | Multiple cursor support with Ctrl+Click         |
| 6   | File Explorer    | IDE sidebar with file tree                      |
| 7   | Multi Tab        | Tabbed editor interface                         |
| 8   | Indent Coloring  | Rainbow indentation guides                      |
| 9   | Bracket Match    | Highlight matching brackets                     |
| 10  | HTML/CSS Grammar | Syntax highlighting for HTML and CSS            |

---

## 2. Architecture Design

### 2.1 Monaco Editor Reference Patterns

| Concept         | Description                                  | Our Implementation  |
| --------------- | -------------------------------------------- | ------------------- |
| **Services**    | DI-based singleton services                  | `services/` folder  |
| **Providers**   | Feature extension points                     | `providers/` folder |
| **Features**    | Self-contained feature modules               | `features/` folder  |
| **Decorations** | Visual decorations (underlines, backgrounds) | `view/decorations/` |
| **Widgets**     | UI components (autocomplete, search)         | `view/widgets/`     |

### 2.2 Proposed Architecture

```
src/
├── core/
│   ├── Editor.js              # Main editor (existing)
│   ├── EditorInstance.js      # Single editor instance (NEW)
│   └── IDE.js                 # IDE controller (NEW)
│
├── model/
│   ├── Document.js            # Text model (existing)
│   ├── Selection.js           # Selection model (NEW)
│   ├── SelectionCollection.js # Multi-cursor support (NEW)
│   └── FileModel.js           # File model for IDE (NEW)
│
├── view/
│   ├── EditorView.js          # Editor view (existing)
│   ├── decorations/           # (NEW)
│   │   ├── DecorationManager.js
│   │   ├── BracketMatchDecoration.js
│   │   └── IndentGuideDecoration.js
│   └── widgets/               # (NEW)
│       ├── AutocompleteWidget.js
│       └── SearchWidget.js
│
├── services/                  # (NEW)
│   ├── CompletionService.js
│   ├── SearchService.js
│   └── FileService.js
│
├── providers/                 # (NEW)
│   ├── CompletionProvider.js
│   ├── JSCompletionProvider.js
│   ├── HTMLCompletionProvider.js
│   └── CSSCompletionProvider.js
│
├── features/                  # (NEW)
│   ├── autoClose/
│   ├── autoIndent/
│   ├── bracketMatch/
│   └── multiCursor/
│
├── ide/                       # (NEW)
│   ├── FileExplorer.js
│   ├── TabManager.js
│   └── Sidebar.js
│
├── tokenizer/                 # (existing, extended)
│   ├── Tokenizer.js
│   ├── TokenizerState.js
│   └── grammars/
│       ├── javascript.js
│       ├── html.js            # (NEW)
│       └── css.js             # (NEW)
│
├── data/                      # (NEW)
│   └── completions/
│       ├── js-builtins.js
│       ├── html-tags.js
│       ├── html-attributes.js
│       └── css-properties.js
│
└── input/                     # (existing)
    ├── InputHandler.js
    ├── EditContextHandler.js
    └── TextareaHandler.js
```

---

## 3. Feature Specifications

### 3.1 Autocomplete (Hardcoded Built-ins)

#### 3.1.1 Overview

Provide autocomplete suggestions for JavaScript, HTML, and CSS built-in APIs and keywords.

#### 3.1.2 Provider Interface

```javascript
// providers/CompletionProvider.js
export class CompletionProvider {
  /**
   * @param {Document} document
   * @param {Position} position
   * @param {CompletionContext} context
   * @returns {CompletionList}
   */
  provideCompletionItems(document, position, context) {
    throw new Error('Must implement');
  }
}
```

#### 3.1.3 JavaScript Built-ins

```javascript
// data/completions/js-builtins.js
export const JS_BUILTINS = {
  // Global objects
  globals: [
    'window',
    'document',
    'console',
    'Math',
    'JSON',
    'Date',
    'Array',
    'Object',
    'String',
    'Number',
    'Boolean',
    'RegExp',
    'Promise',
    'Map',
    'Set',
    'WeakMap',
    'WeakSet',
    'Symbol',
    'Error',
    'TypeError',
    'ReferenceError',
    'SyntaxError',
    'parseInt',
    'parseFloat',
    'isNaN',
    'isFinite',
    'encodeURI',
    'decodeURI',
    'encodeURIComponent',
    'decodeURIComponent',
    'setTimeout',
    'setInterval',
    'clearTimeout',
    'clearInterval',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'fetch',
    'Response',
    'Request',
    'Headers',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'navigator',
    'location',
    'history',
    'screen',
    'alert',
    'confirm',
    'prompt',
  ],

  // Window object properties and methods
  window: {
    kind: 'module',
    properties: [
      { name: 'document', type: 'Document', doc: 'Returns the Document object' },
      { name: 'location', type: 'Location', doc: 'Returns the Location object' },
      { name: 'history', type: 'History', doc: 'Returns the History object' },
      { name: 'navigator', type: 'Navigator', doc: 'Returns the Navigator object' },
      { name: 'screen', type: 'Screen', doc: 'Returns the Screen object' },
      { name: 'localStorage', type: 'Storage', doc: 'Returns the localStorage object' },
      { name: 'sessionStorage', type: 'Storage', doc: 'Returns the sessionStorage object' },
      { name: 'innerWidth', type: 'number', doc: 'Inner width of the window' },
      { name: 'innerHeight', type: 'number', doc: 'Inner height of the window' },
      { name: 'outerWidth', type: 'number', doc: 'Outer width of the window' },
      { name: 'outerHeight', type: 'number', doc: 'Outer height of the window' },
      { name: 'scrollX', type: 'number', doc: 'Horizontal scroll position' },
      { name: 'scrollY', type: 'number', doc: 'Vertical scroll position' },
    ],
    methods: [
      { name: 'alert', signature: '(message?: any): void', doc: 'Displays an alert dialog' },
      { name: 'confirm', signature: '(message?: string): boolean', doc: 'Displays a confirm dialog' },
      { name: 'prompt', signature: '(message?: string, default?: string): string | null', doc: 'Displays a prompt dialog' },
      { name: 'open', signature: '(url?: string, target?: string, features?: string): Window | null', doc: 'Opens a new browser window' },
      { name: 'close', signature: '(): void', doc: 'Closes the current window' },
      { name: 'setTimeout', signature: '(handler: Function, timeout?: number, ...args): number', doc: 'Calls a function after a delay' },
      { name: 'setInterval', signature: '(handler: Function, timeout?: number, ...args): number', doc: 'Calls a function repeatedly' },
      { name: 'clearTimeout', signature: '(id: number): void', doc: 'Cancels a timeout' },
      { name: 'clearInterval', signature: '(id: number): void', doc: 'Cancels an interval' },
      { name: 'requestAnimationFrame', signature: '(callback: FrameRequestCallback): number', doc: 'Requests animation frame' },
      { name: 'cancelAnimationFrame', signature: '(id: number): void', doc: 'Cancels animation frame' },
      { name: 'fetch', signature: '(input: RequestInfo, init?: RequestInit): Promise<Response>', doc: 'Fetches a resource' },
      { name: 'scroll', signature: '(x: number, y: number): void', doc: 'Scrolls to a position' },
      { name: 'scrollTo', signature: '(x: number, y: number): void', doc: 'Scrolls to a position' },
      { name: 'scrollBy', signature: '(x: number, y: number): void', doc: 'Scrolls by an amount' },
      { name: 'getComputedStyle', signature: '(element: Element): CSSStyleDeclaration', doc: 'Gets computed style' },
      { name: 'matchMedia', signature: '(query: string): MediaQueryList', doc: 'Returns a MediaQueryList' },
      { name: 'addEventListener', signature: '(type: string, listener: EventListener): void', doc: 'Adds an event listener' },
      { name: 'removeEventListener', signature: '(type: string, listener: EventListener): void', doc: 'Removes an event listener' },
    ],
  },

  // Document object
  document: {
    kind: 'module',
    properties: [
      { name: 'body', type: 'HTMLBodyElement', doc: 'Returns the body element' },
      { name: 'head', type: 'HTMLHeadElement', doc: 'Returns the head element' },
      { name: 'documentElement', type: 'HTMLHtmlElement', doc: 'Returns the html element' },
      { name: 'title', type: 'string', doc: 'Document title' },
      { name: 'URL', type: 'string', doc: 'Document URL' },
      { name: 'domain', type: 'string', doc: 'Document domain' },
      { name: 'referrer', type: 'string', doc: 'Referrer URL' },
      { name: 'cookie', type: 'string', doc: 'Document cookies' },
      { name: 'readyState', type: 'string', doc: 'Document ready state' },
      { name: 'activeElement', type: 'Element | null', doc: 'Currently focused element' },
      { name: 'forms', type: 'HTMLCollection', doc: 'Collection of forms' },
      { name: 'images', type: 'HTMLCollection', doc: 'Collection of images' },
      { name: 'links', type: 'HTMLCollection', doc: 'Collection of links' },
      { name: 'scripts', type: 'HTMLCollection', doc: 'Collection of scripts' },
    ],
    methods: [
      { name: 'getElementById', signature: '(id: string): HTMLElement | null', doc: 'Gets element by ID' },
      { name: 'getElementsByClassName', signature: '(names: string): HTMLCollection', doc: 'Gets elements by class name' },
      { name: 'getElementsByTagName', signature: '(name: string): HTMLCollection', doc: 'Gets elements by tag name' },
      { name: 'querySelector', signature: '(selectors: string): Element | null', doc: 'Queries single element' },
      { name: 'querySelectorAll', signature: '(selectors: string): NodeList', doc: 'Queries all matching elements' },
      { name: 'createElement', signature: '(tagName: string): HTMLElement', doc: 'Creates an element' },
      { name: 'createTextNode', signature: '(data: string): Text', doc: 'Creates a text node' },
      { name: 'createDocumentFragment', signature: '(): DocumentFragment', doc: 'Creates a document fragment' },
      { name: 'createComment', signature: '(data: string): Comment', doc: 'Creates a comment node' },
      { name: 'createEvent', signature: '(type: string): Event', doc: 'Creates an event' },
      { name: 'write', signature: '(...text: string[]): void', doc: 'Writes to document' },
      { name: 'writeln', signature: '(...text: string[]): void', doc: 'Writes line to document' },
      { name: 'open', signature: '(): Document', doc: 'Opens document for writing' },
      { name: 'close', signature: '(): void', doc: 'Closes document' },
      { name: 'execCommand', signature: '(command: string, showUI?: boolean, value?: string): boolean', doc: 'Executes a command' },
      { name: 'addEventListener', signature: '(type: string, listener: EventListener): void', doc: 'Adds event listener' },
      { name: 'removeEventListener', signature: '(type: string, listener: EventListener): void', doc: 'Removes event listener' },
    ],
  },

  // Console object
  console: {
    kind: 'module',
    methods: [
      { name: 'log', signature: '(...data: any[]): void', doc: 'Logs to console' },
      { name: 'info', signature: '(...data: any[]): void', doc: 'Logs info message' },
      { name: 'warn', signature: '(...data: any[]): void', doc: 'Logs warning message' },
      { name: 'error', signature: '(...data: any[]): void', doc: 'Logs error message' },
      { name: 'debug', signature: '(...data: any[]): void', doc: 'Logs debug message' },
      { name: 'trace', signature: '(...data: any[]): void', doc: 'Logs stack trace' },
      { name: 'table', signature: '(data: any, columns?: string[]): void', doc: 'Displays tabular data' },
      { name: 'dir', signature: '(item: any): void', doc: 'Displays object properties' },
      { name: 'dirxml', signature: '(item: any): void', doc: 'Displays XML representation' },
      { name: 'group', signature: '(...label: any[]): void', doc: 'Creates console group' },
      { name: 'groupCollapsed', signature: '(...label: any[]): void', doc: 'Creates collapsed group' },
      { name: 'groupEnd', signature: '(): void', doc: 'Ends console group' },
      { name: 'clear', signature: '(): void', doc: 'Clears console' },
      { name: 'count', signature: '(label?: string): void', doc: 'Logs call count' },
      { name: 'countReset', signature: '(label?: string): void', doc: 'Resets call count' },
      { name: 'time', signature: '(label?: string): void', doc: 'Starts timer' },
      { name: 'timeEnd', signature: '(label?: string): void', doc: 'Ends timer' },
      { name: 'timeLog', signature: '(label?: string, ...data: any[]): void', doc: 'Logs timer value' },
      { name: 'assert', signature: '(condition?: boolean, ...data: any[]): void', doc: 'Logs if condition is false' },
    ],
  },

  // Array methods
  Array: {
    kind: 'class',
    staticMethods: [
      { name: 'isArray', signature: '(value: any): boolean', doc: 'Checks if value is an array' },
      { name: 'from', signature: '(arrayLike: ArrayLike<T>, mapFn?: Function): T[]', doc: 'Creates array from iterable' },
      { name: 'of', signature: '(...items: T[]): T[]', doc: 'Creates array from arguments' },
    ],
    instanceMethods: [
      { name: 'push', signature: '(...items: T[]): number', doc: 'Adds elements to end' },
      { name: 'pop', signature: '(): T | undefined', doc: 'Removes last element' },
      { name: 'shift', signature: '(): T | undefined', doc: 'Removes first element' },
      { name: 'unshift', signature: '(...items: T[]): number', doc: 'Adds elements to start' },
      { name: 'slice', signature: '(start?: number, end?: number): T[]', doc: 'Returns portion of array' },
      { name: 'splice', signature: '(start: number, deleteCount?: number, ...items: T[]): T[]', doc: 'Changes array contents' },
      { name: 'concat', signature: '(...items: (T | T[])[]): T[]', doc: 'Merges arrays' },
      { name: 'join', signature: '(separator?: string): string', doc: 'Joins elements into string' },
      { name: 'reverse', signature: '(): T[]', doc: 'Reverses array in place' },
      { name: 'sort', signature: '(compareFn?: (a: T, b: T) => number): T[]', doc: 'Sorts array in place' },
      { name: 'indexOf', signature: '(searchElement: T, fromIndex?: number): number', doc: 'Finds index of element' },
      { name: 'lastIndexOf', signature: '(searchElement: T, fromIndex?: number): number', doc: 'Finds last index of element' },
      { name: 'includes', signature: '(searchElement: T, fromIndex?: number): boolean', doc: 'Checks if element exists' },
      { name: 'find', signature: '(predicate: (value: T) => boolean): T | undefined', doc: 'Finds first matching element' },
      { name: 'findIndex', signature: '(predicate: (value: T) => boolean): number', doc: 'Finds index of first match' },
      { name: 'filter', signature: '(predicate: (value: T) => boolean): T[]', doc: 'Filters elements' },
      { name: 'map', signature: '(callbackfn: (value: T) => U): U[]', doc: 'Maps elements to new array' },
      { name: 'reduce', signature: '(callbackfn: (acc: U, value: T) => U, initialValue: U): U', doc: 'Reduces array to single value' },
      { name: 'reduceRight', signature: '(callbackfn: (acc: U, value: T) => U, initialValue: U): U', doc: 'Reduces from right' },
      { name: 'forEach', signature: '(callbackfn: (value: T) => void): void', doc: 'Executes for each element' },
      { name: 'every', signature: '(predicate: (value: T) => boolean): boolean', doc: 'Tests if all pass' },
      { name: 'some', signature: '(predicate: (value: T) => boolean): boolean', doc: 'Tests if any pass' },
      { name: 'flat', signature: '(depth?: number): T[]', doc: 'Flattens nested arrays' },
      { name: 'flatMap', signature: '(callbackfn: (value: T) => U[]): U[]', doc: 'Maps then flattens' },
      { name: 'fill', signature: '(value: T, start?: number, end?: number): T[]', doc: 'Fills with value' },
      { name: 'copyWithin', signature: '(target: number, start: number, end?: number): T[]', doc: 'Copies within array' },
      { name: 'entries', signature: '(): IterableIterator<[number, T]>', doc: 'Returns iterator of entries' },
      { name: 'keys', signature: '(): IterableIterator<number>', doc: 'Returns iterator of keys' },
      { name: 'values', signature: '(): IterableIterator<T>', doc: 'Returns iterator of values' },
      { name: 'at', signature: '(index: number): T | undefined', doc: 'Returns element at index' },
      { name: 'toReversed', signature: '(): T[]', doc: 'Returns reversed copy' },
      { name: 'toSorted', signature: '(compareFn?: (a: T, b: T) => number): T[]', doc: 'Returns sorted copy' },
      { name: 'toSpliced', signature: '(start: number, deleteCount?: number, ...items: T[]): T[]', doc: 'Returns spliced copy' },
      { name: 'with', signature: '(index: number, value: T): T[]', doc: 'Returns copy with replaced element' },
    ],
  },

  // String methods
  String: {
    kind: 'class',
    staticMethods: [
      { name: 'fromCharCode', signature: '(...codes: number[]): string', doc: 'Creates string from char codes' },
      { name: 'fromCodePoint', signature: '(...codePoints: number[]): string', doc: 'Creates string from code points' },
      { name: 'raw', signature: '(template: TemplateStringsArray, ...substitutions: any[]): string', doc: 'Raw template string' },
    ],
    instanceMethods: [
      { name: 'charAt', signature: '(pos: number): string', doc: 'Returns character at position' },
      { name: 'charCodeAt', signature: '(index: number): number', doc: 'Returns char code at position' },
      { name: 'codePointAt', signature: '(pos: number): number | undefined', doc: 'Returns code point at position' },
      { name: 'concat', signature: '(...strings: string[]): string', doc: 'Concatenates strings' },
      { name: 'includes', signature: '(searchString: string, position?: number): boolean', doc: 'Checks if contains substring' },
      { name: 'endsWith', signature: '(searchString: string, endPosition?: number): boolean', doc: 'Checks if ends with' },
      { name: 'startsWith', signature: '(searchString: string, position?: number): boolean', doc: 'Checks if starts with' },
      { name: 'indexOf', signature: '(searchString: string, position?: number): number', doc: 'Finds index of substring' },
      { name: 'lastIndexOf', signature: '(searchString: string, position?: number): number', doc: 'Finds last index of substring' },
      { name: 'localeCompare', signature: '(that: string): number', doc: 'Compares strings' },
      { name: 'match', signature: '(regexp: RegExp): RegExpMatchArray | null', doc: 'Matches against regex' },
      { name: 'matchAll', signature: '(regexp: RegExp): IterableIterator<RegExpMatchArray>', doc: 'Returns all matches' },
      { name: 'normalize', signature: '(form?: string): string', doc: 'Unicode normalization' },
      { name: 'padEnd', signature: '(maxLength: number, fillString?: string): string', doc: 'Pads end of string' },
      { name: 'padStart', signature: '(maxLength: number, fillString?: string): string', doc: 'Pads start of string' },
      { name: 'repeat', signature: '(count: number): string', doc: 'Repeats string' },
      { name: 'replace', signature: '(searchValue: string | RegExp, replaceValue: string): string', doc: 'Replaces substring' },
      { name: 'replaceAll', signature: '(searchValue: string | RegExp, replaceValue: string): string', doc: 'Replaces all occurrences' },
      { name: 'search', signature: '(regexp: RegExp): number', doc: 'Searches for match' },
      { name: 'slice', signature: '(start?: number, end?: number): string', doc: 'Extracts portion' },
      { name: 'split', signature: '(separator: string | RegExp, limit?: number): string[]', doc: 'Splits into array' },
      { name: 'substring', signature: '(start: number, end?: number): string', doc: 'Returns substring' },
      { name: 'toLowerCase', signature: '(): string', doc: 'Converts to lowercase' },
      { name: 'toUpperCase', signature: '(): string', doc: 'Converts to uppercase' },
      { name: 'toLocaleLowerCase', signature: '(locales?: string | string[]): string', doc: 'Locale lowercase' },
      { name: 'toLocaleUpperCase', signature: '(locales?: string | string[]): string', doc: 'Locale uppercase' },
      { name: 'trim', signature: '(): string', doc: 'Trims whitespace' },
      { name: 'trimStart', signature: '(): string', doc: 'Trims start whitespace' },
      { name: 'trimEnd', signature: '(): string', doc: 'Trims end whitespace' },
      { name: 'at', signature: '(index: number): string | undefined', doc: 'Returns character at index' },
    ],
  },

  // Object methods
  Object: {
    kind: 'class',
    staticMethods: [
      { name: 'keys', signature: '(obj: object): string[]', doc: 'Returns array of keys' },
      { name: 'values', signature: '(obj: object): any[]', doc: 'Returns array of values' },
      { name: 'entries', signature: '(obj: object): [string, any][]', doc: 'Returns array of entries' },
      { name: 'assign', signature: '(target: object, ...sources: object[]): object', doc: 'Copies properties' },
      { name: 'create', signature: '(proto: object | null, propertiesObject?: object): object', doc: 'Creates object with prototype' },
      { name: 'defineProperty', signature: '(obj: object, prop: string, descriptor: object): object', doc: 'Defines property' },
      { name: 'defineProperties', signature: '(obj: object, props: object): object', doc: 'Defines multiple properties' },
      { name: 'freeze', signature: '(obj: T): Readonly<T>', doc: 'Freezes object' },
      { name: 'seal', signature: '(obj: T): T', doc: 'Seals object' },
      { name: 'isFrozen', signature: '(obj: any): boolean', doc: 'Checks if frozen' },
      { name: 'isSealed', signature: '(obj: any): boolean', doc: 'Checks if sealed' },
      { name: 'isExtensible', signature: '(obj: any): boolean', doc: 'Checks if extensible' },
      { name: 'preventExtensions', signature: '(obj: T): T', doc: 'Prevents extensions' },
      { name: 'getOwnPropertyNames', signature: '(obj: any): string[]', doc: 'Gets property names' },
      { name: 'getOwnPropertySymbols', signature: '(obj: any): symbol[]', doc: 'Gets property symbols' },
      { name: 'getOwnPropertyDescriptor', signature: '(obj: any, prop: string): PropertyDescriptor | undefined', doc: 'Gets property descriptor' },
      { name: 'getOwnPropertyDescriptors', signature: '(obj: any): object', doc: 'Gets all descriptors' },
      { name: 'getPrototypeOf', signature: '(obj: any): any', doc: 'Gets prototype' },
      { name: 'setPrototypeOf', signature: '(obj: any, proto: object | null): any', doc: 'Sets prototype' },
      { name: 'hasOwn', signature: '(obj: object, prop: string): boolean', doc: 'Checks own property' },
      { name: 'fromEntries', signature: '(entries: Iterable<[string, any]>): object', doc: 'Creates object from entries' },
    ],
    instanceMethods: [
      { name: 'hasOwnProperty', signature: '(prop: string): boolean', doc: 'Checks if has own property' },
      { name: 'isPrototypeOf', signature: '(obj: object): boolean', doc: 'Checks if is prototype of' },
      { name: 'propertyIsEnumerable', signature: '(prop: string): boolean', doc: 'Checks if enumerable' },
      { name: 'toString', signature: '(): string', doc: 'Returns string representation' },
      { name: 'valueOf', signature: '(): Object', doc: 'Returns primitive value' },
      { name: 'toLocaleString', signature: '(): string', doc: 'Returns locale string' },
    ],
  },

  // Math object
  Math: {
    kind: 'module',
    properties: [
      { name: 'PI', type: 'number', doc: 'Pi constant (~3.14159)' },
      { name: 'E', type: 'number', doc: "Euler's constant (~2.718)" },
      { name: 'LN2', type: 'number', doc: 'Natural log of 2' },
      { name: 'LN10', type: 'number', doc: 'Natural log of 10' },
      { name: 'LOG2E', type: 'number', doc: 'Base 2 log of E' },
      { name: 'LOG10E', type: 'number', doc: 'Base 10 log of E' },
      { name: 'SQRT2', type: 'number', doc: 'Square root of 2' },
      { name: 'SQRT1_2', type: 'number', doc: 'Square root of 1/2' },
    ],
    methods: [
      { name: 'abs', signature: '(x: number): number', doc: 'Returns absolute value' },
      { name: 'ceil', signature: '(x: number): number', doc: 'Rounds up' },
      { name: 'floor', signature: '(x: number): number', doc: 'Rounds down' },
      { name: 'round', signature: '(x: number): number', doc: 'Rounds to nearest' },
      { name: 'trunc', signature: '(x: number): number', doc: 'Truncates decimal' },
      { name: 'max', signature: '(...values: number[]): number', doc: 'Returns maximum' },
      { name: 'min', signature: '(...values: number[]): number', doc: 'Returns minimum' },
      { name: 'pow', signature: '(base: number, exponent: number): number', doc: 'Returns power' },
      { name: 'sqrt', signature: '(x: number): number', doc: 'Returns square root' },
      { name: 'cbrt', signature: '(x: number): number', doc: 'Returns cube root' },
      { name: 'random', signature: '(): number', doc: 'Returns random 0-1' },
      { name: 'sign', signature: '(x: number): number', doc: 'Returns sign (-1, 0, 1)' },
      { name: 'sin', signature: '(x: number): number', doc: 'Returns sine' },
      { name: 'cos', signature: '(x: number): number', doc: 'Returns cosine' },
      { name: 'tan', signature: '(x: number): number', doc: 'Returns tangent' },
      { name: 'asin', signature: '(x: number): number', doc: 'Returns arcsine' },
      { name: 'acos', signature: '(x: number): number', doc: 'Returns arccosine' },
      { name: 'atan', signature: '(x: number): number', doc: 'Returns arctangent' },
      { name: 'atan2', signature: '(y: number, x: number): number', doc: 'Returns angle from x-axis' },
      { name: 'sinh', signature: '(x: number): number', doc: 'Returns hyperbolic sine' },
      { name: 'cosh', signature: '(x: number): number', doc: 'Returns hyperbolic cosine' },
      { name: 'tanh', signature: '(x: number): number', doc: 'Returns hyperbolic tangent' },
      { name: 'log', signature: '(x: number): number', doc: 'Returns natural log' },
      { name: 'log2', signature: '(x: number): number', doc: 'Returns base 2 log' },
      { name: 'log10', signature: '(x: number): number', doc: 'Returns base 10 log' },
      { name: 'exp', signature: '(x: number): number', doc: 'Returns e^x' },
      { name: 'hypot', signature: '(...values: number[]): number', doc: 'Returns hypotenuse' },
      { name: 'clz32', signature: '(x: number): number', doc: 'Returns leading zeros' },
      { name: 'imul', signature: '(a: number, b: number): number', doc: 'Returns 32-bit multiply' },
      { name: 'fround', signature: '(x: number): number', doc: 'Returns nearest float32' },
    ],
  },

  // JSON object
  JSON: {
    kind: 'module',
    methods: [
      { name: 'parse', signature: '(text: string, reviver?: (key: string, value: any) => any): any', doc: 'Parses JSON string' },
      { name: 'stringify', signature: '(value: any, replacer?: any, space?: string | number): string', doc: 'Converts to JSON string' },
    ],
  },

  // Promise class
  Promise: {
    kind: 'class',
    staticMethods: [
      { name: 'resolve', signature: '(value?: T): Promise<T>', doc: 'Returns resolved promise' },
      { name: 'reject', signature: '(reason?: any): Promise<never>', doc: 'Returns rejected promise' },
      { name: 'all', signature: '(values: Promise<T>[]): Promise<T[]>', doc: 'Waits for all promises' },
      { name: 'allSettled', signature: '(values: Promise<T>[]): Promise<PromiseSettledResult<T>[]>', doc: 'Waits for all to settle' },
      { name: 'race', signature: '(values: Promise<T>[]): Promise<T>', doc: 'Returns first settled' },
      { name: 'any', signature: '(values: Promise<T>[]): Promise<T>', doc: 'Returns first fulfilled' },
    ],
    instanceMethods: [
      { name: 'then', signature: '(onfulfilled?: (value: T) => U, onrejected?: (reason: any) => U): Promise<U>', doc: 'Handles fulfillment' },
      { name: 'catch', signature: '(onrejected?: (reason: any) => U): Promise<U>', doc: 'Handles rejection' },
      { name: 'finally', signature: '(onfinally?: () => void): Promise<T>', doc: 'Runs on settle' },
    ],
  },

  // DOM Element methods (common)
  Element: {
    kind: 'class',
    properties: [
      { name: 'id', type: 'string', doc: 'Element ID' },
      { name: 'className', type: 'string', doc: 'Element class name' },
      { name: 'classList', type: 'DOMTokenList', doc: 'Element class list' },
      { name: 'innerHTML', type: 'string', doc: 'Inner HTML content' },
      { name: 'outerHTML', type: 'string', doc: 'Outer HTML content' },
      { name: 'textContent', type: 'string | null', doc: 'Text content' },
      { name: 'tagName', type: 'string', doc: 'Tag name' },
      { name: 'attributes', type: 'NamedNodeMap', doc: 'Element attributes' },
      { name: 'children', type: 'HTMLCollection', doc: 'Child elements' },
      { name: 'childNodes', type: 'NodeList', doc: 'Child nodes' },
      { name: 'parentElement', type: 'Element | null', doc: 'Parent element' },
      { name: 'parentNode', type: 'Node | null', doc: 'Parent node' },
      { name: 'firstChild', type: 'Node | null', doc: 'First child node' },
      { name: 'lastChild', type: 'Node | null', doc: 'Last child node' },
      { name: 'firstElementChild', type: 'Element | null', doc: 'First child element' },
      { name: 'lastElementChild', type: 'Element | null', doc: 'Last child element' },
      { name: 'nextSibling', type: 'Node | null', doc: 'Next sibling node' },
      { name: 'previousSibling', type: 'Node | null', doc: 'Previous sibling node' },
      { name: 'nextElementSibling', type: 'Element | null', doc: 'Next sibling element' },
      { name: 'previousElementSibling', type: 'Element | null', doc: 'Previous sibling element' },
      { name: 'style', type: 'CSSStyleDeclaration', doc: 'Element style' },
      { name: 'dataset', type: 'DOMStringMap', doc: 'Data attributes' },
      { name: 'clientWidth', type: 'number', doc: 'Inner width' },
      { name: 'clientHeight', type: 'number', doc: 'Inner height' },
      { name: 'scrollWidth', type: 'number', doc: 'Scroll width' },
      { name: 'scrollHeight', type: 'number', doc: 'Scroll height' },
      { name: 'scrollTop', type: 'number', doc: 'Scroll top position' },
      { name: 'scrollLeft', type: 'number', doc: 'Scroll left position' },
      { name: 'offsetWidth', type: 'number', doc: 'Offset width' },
      { name: 'offsetHeight', type: 'number', doc: 'Offset height' },
      { name: 'offsetTop', type: 'number', doc: 'Offset top' },
      { name: 'offsetLeft', type: 'number', doc: 'Offset left' },
      { name: 'offsetParent', type: 'Element | null', doc: 'Offset parent' },
    ],
    methods: [
      { name: 'getAttribute', signature: '(name: string): string | null', doc: 'Gets attribute value' },
      { name: 'setAttribute', signature: '(name: string, value: string): void', doc: 'Sets attribute value' },
      { name: 'removeAttribute', signature: '(name: string): void', doc: 'Removes attribute' },
      { name: 'hasAttribute', signature: '(name: string): boolean', doc: 'Checks for attribute' },
      { name: 'toggleAttribute', signature: '(name: string, force?: boolean): boolean', doc: 'Toggles attribute' },
      { name: 'querySelector', signature: '(selectors: string): Element | null', doc: 'Queries child element' },
      { name: 'querySelectorAll', signature: '(selectors: string): NodeList', doc: 'Queries child elements' },
      { name: 'closest', signature: '(selectors: string): Element | null', doc: 'Finds closest ancestor' },
      { name: 'matches', signature: '(selectors: string): boolean', doc: 'Checks if matches selector' },
      { name: 'appendChild', signature: '(node: Node): Node', doc: 'Appends child node' },
      { name: 'removeChild', signature: '(node: Node): Node', doc: 'Removes child node' },
      { name: 'insertBefore', signature: '(node: Node, child: Node | null): Node', doc: 'Inserts before child' },
      { name: 'replaceChild', signature: '(node: Node, child: Node): Node', doc: 'Replaces child node' },
      { name: 'cloneNode', signature: '(deep?: boolean): Node', doc: 'Clones the node' },
      { name: 'contains', signature: '(node: Node | null): boolean', doc: 'Checks if contains node' },
      { name: 'append', signature: '(...nodes: (Node | string)[]): void', doc: 'Appends nodes' },
      { name: 'prepend', signature: '(...nodes: (Node | string)[]): void', doc: 'Prepends nodes' },
      { name: 'before', signature: '(...nodes: (Node | string)[]): void', doc: 'Inserts before' },
      { name: 'after', signature: '(...nodes: (Node | string)[]): void', doc: 'Inserts after' },
      { name: 'remove', signature: '(): void', doc: 'Removes element' },
      { name: 'replaceWith', signature: '(...nodes: (Node | string)[]): void', doc: 'Replaces with nodes' },
      {
        name: 'addEventListener',
        signature: '(type: string, listener: EventListener, options?: boolean | AddEventListenerOptions): void',
        doc: 'Adds event listener',
      },
      {
        name: 'removeEventListener',
        signature: '(type: string, listener: EventListener, options?: boolean | EventListenerOptions): void',
        doc: 'Removes event listener',
      },
      { name: 'dispatchEvent', signature: '(event: Event): boolean', doc: 'Dispatches event' },
      { name: 'getBoundingClientRect', signature: '(): DOMRect', doc: 'Gets bounding rectangle' },
      { name: 'getClientRects', signature: '(): DOMRectList', doc: 'Gets client rectangles' },
      { name: 'scroll', signature: '(x: number, y: number): void', doc: 'Scrolls element' },
      { name: 'scrollTo', signature: '(x: number, y: number): void', doc: 'Scrolls to position' },
      { name: 'scrollBy', signature: '(x: number, y: number): void', doc: 'Scrolls by amount' },
      { name: 'scrollIntoView', signature: '(arg?: boolean | ScrollIntoViewOptions): void', doc: 'Scrolls into view' },
      { name: 'focus', signature: '(options?: FocusOptions): void', doc: 'Focuses element' },
      { name: 'blur', signature: '(): void', doc: 'Blurs element' },
      { name: 'click', signature: '(): void', doc: 'Simulates click' },
    ],
  },
};
```

#### 3.1.4 HTML Built-ins

```javascript
// data/completions/html-tags.js
export const HTML_TAGS = [
  // Document metadata
  { name: 'html', doc: 'Root element of an HTML document', hasClosingTag: true },
  { name: 'head', doc: 'Container for metadata', hasClosingTag: true },
  { name: 'title', doc: 'Document title', hasClosingTag: true },
  { name: 'base', doc: 'Base URL for relative URLs', hasClosingTag: false },
  { name: 'link', doc: 'External resource link', hasClosingTag: false },
  { name: 'meta', doc: 'Metadata element', hasClosingTag: false },
  { name: 'style', doc: 'Style information', hasClosingTag: true },

  // Sectioning
  { name: 'body', doc: 'Document body', hasClosingTag: true },
  { name: 'article', doc: 'Self-contained composition', hasClosingTag: true },
  { name: 'section', doc: 'Generic section', hasClosingTag: true },
  { name: 'nav', doc: 'Navigation section', hasClosingTag: true },
  { name: 'aside', doc: 'Sidebar content', hasClosingTag: true },
  { name: 'header', doc: 'Header section', hasClosingTag: true },
  { name: 'footer', doc: 'Footer section', hasClosingTag: true },
  { name: 'main', doc: 'Main content', hasClosingTag: true },
  { name: 'address', doc: 'Contact information', hasClosingTag: true },

  // Headings
  { name: 'h1', doc: 'Heading level 1', hasClosingTag: true },
  { name: 'h2', doc: 'Heading level 2', hasClosingTag: true },
  { name: 'h3', doc: 'Heading level 3', hasClosingTag: true },
  { name: 'h4', doc: 'Heading level 4', hasClosingTag: true },
  { name: 'h5', doc: 'Heading level 5', hasClosingTag: true },
  { name: 'h6', doc: 'Heading level 6', hasClosingTag: true },
  { name: 'hgroup', doc: 'Heading group', hasClosingTag: true },

  // Text content
  { name: 'div', doc: 'Generic container', hasClosingTag: true },
  { name: 'p', doc: 'Paragraph', hasClosingTag: true },
  { name: 'hr', doc: 'Horizontal rule', hasClosingTag: false },
  { name: 'pre', doc: 'Preformatted text', hasClosingTag: true },
  { name: 'blockquote', doc: 'Block quotation', hasClosingTag: true },
  { name: 'ol', doc: 'Ordered list', hasClosingTag: true },
  { name: 'ul', doc: 'Unordered list', hasClosingTag: true },
  { name: 'li', doc: 'List item', hasClosingTag: true },
  { name: 'dl', doc: 'Description list', hasClosingTag: true },
  { name: 'dt', doc: 'Description term', hasClosingTag: true },
  { name: 'dd', doc: 'Description details', hasClosingTag: true },
  { name: 'figure', doc: 'Figure with caption', hasClosingTag: true },
  { name: 'figcaption', doc: 'Figure caption', hasClosingTag: true },

  // Inline text
  { name: 'a', doc: 'Hyperlink', hasClosingTag: true },
  { name: 'em', doc: 'Emphasis', hasClosingTag: true },
  { name: 'strong', doc: 'Strong importance', hasClosingTag: true },
  { name: 'small', doc: 'Small print', hasClosingTag: true },
  { name: 's', doc: 'Strikethrough', hasClosingTag: true },
  { name: 'cite', doc: 'Citation', hasClosingTag: true },
  { name: 'q', doc: 'Inline quotation', hasClosingTag: true },
  { name: 'dfn', doc: 'Definition', hasClosingTag: true },
  { name: 'abbr', doc: 'Abbreviation', hasClosingTag: true },
  { name: 'code', doc: 'Code fragment', hasClosingTag: true },
  { name: 'var', doc: 'Variable', hasClosingTag: true },
  { name: 'samp', doc: 'Sample output', hasClosingTag: true },
  { name: 'kbd', doc: 'Keyboard input', hasClosingTag: true },
  { name: 'sub', doc: 'Subscript', hasClosingTag: true },
  { name: 'sup', doc: 'Superscript', hasClosingTag: true },
  { name: 'i', doc: 'Idiomatic text', hasClosingTag: true },
  { name: 'b', doc: 'Bold text', hasClosingTag: true },
  { name: 'u', doc: 'Underline', hasClosingTag: true },
  { name: 'mark', doc: 'Highlighted text', hasClosingTag: true },
  { name: 'ruby', doc: 'Ruby annotation', hasClosingTag: true },
  { name: 'rt', doc: 'Ruby text', hasClosingTag: true },
  { name: 'rp', doc: 'Ruby parenthesis', hasClosingTag: true },
  { name: 'bdi', doc: 'Bidirectional isolation', hasClosingTag: true },
  { name: 'bdo', doc: 'Bidirectional override', hasClosingTag: true },
  { name: 'span', doc: 'Generic inline container', hasClosingTag: true },
  { name: 'br', doc: 'Line break', hasClosingTag: false },
  { name: 'wbr', doc: 'Word break opportunity', hasClosingTag: false },

  // Edits
  { name: 'ins', doc: 'Inserted text', hasClosingTag: true },
  { name: 'del', doc: 'Deleted text', hasClosingTag: true },

  // Embedded content
  { name: 'picture', doc: 'Picture element', hasClosingTag: true },
  { name: 'source', doc: 'Media source', hasClosingTag: false },
  { name: 'img', doc: 'Image', hasClosingTag: false },
  { name: 'iframe', doc: 'Inline frame', hasClosingTag: true },
  { name: 'embed', doc: 'Embed external content', hasClosingTag: false },
  { name: 'object', doc: 'External object', hasClosingTag: true },
  { name: 'param', doc: 'Object parameter', hasClosingTag: false },
  { name: 'video', doc: 'Video player', hasClosingTag: true },
  { name: 'audio', doc: 'Audio player', hasClosingTag: true },
  { name: 'track', doc: 'Text track', hasClosingTag: false },
  { name: 'map', doc: 'Image map', hasClosingTag: true },
  { name: 'area', doc: 'Image map area', hasClosingTag: false },

  // SVG and MathML
  { name: 'svg', doc: 'SVG container', hasClosingTag: true },
  { name: 'math', doc: 'MathML container', hasClosingTag: true },

  // Scripting
  { name: 'script', doc: 'Script element', hasClosingTag: true },
  { name: 'noscript', doc: 'Fallback for no script', hasClosingTag: true },
  { name: 'template', doc: 'Template element', hasClosingTag: true },
  { name: 'slot', doc: 'Web component slot', hasClosingTag: true },
  { name: 'canvas', doc: 'Canvas element', hasClosingTag: true },

  // Tables
  { name: 'table', doc: 'Table element', hasClosingTag: true },
  { name: 'caption', doc: 'Table caption', hasClosingTag: true },
  { name: 'colgroup', doc: 'Column group', hasClosingTag: true },
  { name: 'col', doc: 'Table column', hasClosingTag: false },
  { name: 'thead', doc: 'Table head', hasClosingTag: true },
  { name: 'tbody', doc: 'Table body', hasClosingTag: true },
  { name: 'tfoot', doc: 'Table foot', hasClosingTag: true },
  { name: 'tr', doc: 'Table row', hasClosingTag: true },
  { name: 'td', doc: 'Table cell', hasClosingTag: true },
  { name: 'th', doc: 'Table header cell', hasClosingTag: true },

  // Forms
  { name: 'form', doc: 'Form element', hasClosingTag: true },
  { name: 'label', doc: 'Form label', hasClosingTag: true },
  { name: 'input', doc: 'Input control', hasClosingTag: false },
  { name: 'button', doc: 'Button element', hasClosingTag: true },
  { name: 'select', doc: 'Select dropdown', hasClosingTag: true },
  { name: 'datalist', doc: 'Data list', hasClosingTag: true },
  { name: 'optgroup', doc: 'Option group', hasClosingTag: true },
  { name: 'option', doc: 'Select option', hasClosingTag: true },
  { name: 'textarea', doc: 'Text area', hasClosingTag: true },
  { name: 'output', doc: 'Output element', hasClosingTag: true },
  { name: 'progress', doc: 'Progress indicator', hasClosingTag: true },
  { name: 'meter', doc: 'Scalar measurement', hasClosingTag: true },
  { name: 'fieldset', doc: 'Field set', hasClosingTag: true },
  { name: 'legend', doc: 'Field set legend', hasClosingTag: true },

  // Interactive
  { name: 'details', doc: 'Disclosure widget', hasClosingTag: true },
  { name: 'summary', doc: 'Details summary', hasClosingTag: true },
  { name: 'dialog', doc: 'Dialog box', hasClosingTag: true },
  { name: 'menu', doc: 'Menu element', hasClosingTag: true },
];

// data/completions/html-attributes.js
export const HTML_ATTRIBUTES = {
  // Global attributes (apply to all elements)
  global: [
    { name: 'id', doc: 'Unique identifier' },
    { name: 'class', doc: 'CSS class names' },
    { name: 'style', doc: 'Inline CSS styles' },
    { name: 'title', doc: 'Advisory title' },
    { name: 'lang', doc: 'Language code' },
    { name: 'dir', doc: 'Text direction (ltr/rtl)' },
    { name: 'hidden', doc: 'Hidden state', type: 'boolean' },
    { name: 'tabindex', doc: 'Tab order', type: 'number' },
    { name: 'accesskey', doc: 'Keyboard shortcut' },
    { name: 'contenteditable', doc: 'Editable content', type: 'boolean' },
    { name: 'draggable', doc: 'Draggable element', type: 'boolean' },
    { name: 'spellcheck', doc: 'Spell checking', type: 'boolean' },
    { name: 'translate', doc: 'Translation', type: 'boolean' },
    { name: 'data-*', doc: 'Custom data attribute' },
    { name: 'aria-*', doc: 'ARIA attribute' },
    { name: 'role', doc: 'ARIA role' },
  ],

  // Event attributes (global)
  events: [
    { name: 'onclick', doc: 'Click event handler' },
    { name: 'ondblclick', doc: 'Double click event handler' },
    { name: 'onmousedown', doc: 'Mouse down event handler' },
    { name: 'onmouseup', doc: 'Mouse up event handler' },
    { name: 'onmouseover', doc: 'Mouse over event handler' },
    { name: 'onmouseout', doc: 'Mouse out event handler' },
    { name: 'onmousemove', doc: 'Mouse move event handler' },
    { name: 'onmouseenter', doc: 'Mouse enter event handler' },
    { name: 'onmouseleave', doc: 'Mouse leave event handler' },
    { name: 'onkeydown', doc: 'Key down event handler' },
    { name: 'onkeyup', doc: 'Key up event handler' },
    { name: 'onkeypress', doc: 'Key press event handler' },
    { name: 'onfocus', doc: 'Focus event handler' },
    { name: 'onblur', doc: 'Blur event handler' },
    { name: 'onchange', doc: 'Change event handler' },
    { name: 'oninput', doc: 'Input event handler' },
    { name: 'onsubmit', doc: 'Submit event handler' },
    { name: 'onreset', doc: 'Reset event handler' },
    { name: 'onload', doc: 'Load event handler' },
    { name: 'onerror', doc: 'Error event handler' },
    { name: 'onscroll', doc: 'Scroll event handler' },
    { name: 'onresize', doc: 'Resize event handler' },
    { name: 'oncontextmenu', doc: 'Context menu event handler' },
    { name: 'oncopy', doc: 'Copy event handler' },
    { name: 'oncut', doc: 'Cut event handler' },
    { name: 'onpaste', doc: 'Paste event handler' },
    { name: 'ondrag', doc: 'Drag event handler' },
    { name: 'ondragstart', doc: 'Drag start event handler' },
    { name: 'ondragend', doc: 'Drag end event handler' },
    { name: 'ondragenter', doc: 'Drag enter event handler' },
    { name: 'ondragleave', doc: 'Drag leave event handler' },
    { name: 'ondragover', doc: 'Drag over event handler' },
    { name: 'ondrop', doc: 'Drop event handler' },
  ],

  // Element-specific attributes
  a: [
    { name: 'href', doc: 'Link URL' },
    { name: 'target', doc: 'Link target', values: ['_self', '_blank', '_parent', '_top'] },
    {
      name: 'rel',
      doc: 'Link relationship',
      values: ['noopener', 'noreferrer', 'nofollow', 'external', 'author', 'bookmark', 'help', 'license', 'next', 'prev', 'search', 'tag'],
    },
    { name: 'download', doc: 'Download filename' },
    { name: 'hreflang', doc: 'Language of linked resource' },
    { name: 'type', doc: 'MIME type' },
    { name: 'ping', doc: 'URLs to ping' },
    { name: 'referrerpolicy', doc: 'Referrer policy' },
  ],

  img: [
    { name: 'src', doc: 'Image source URL', required: true },
    { name: 'alt', doc: 'Alternative text', required: true },
    { name: 'width', doc: 'Image width' },
    { name: 'height', doc: 'Image height' },
    { name: 'loading', doc: 'Loading behavior', values: ['lazy', 'eager'] },
    { name: 'decoding', doc: 'Decoding hint', values: ['sync', 'async', 'auto'] },
    { name: 'srcset', doc: 'Image sources for responsive' },
    { name: 'sizes', doc: 'Image sizes for responsive' },
    { name: 'crossorigin', doc: 'CORS setting', values: ['anonymous', 'use-credentials'] },
    { name: 'usemap', doc: 'Image map reference' },
    { name: 'ismap', doc: 'Server-side image map', type: 'boolean' },
    { name: 'referrerpolicy', doc: 'Referrer policy' },
  ],

  input: [
    {
      name: 'type',
      doc: 'Input type',
      values: [
        'text',
        'password',
        'email',
        'number',
        'tel',
        'url',
        'search',
        'date',
        'time',
        'datetime-local',
        'month',
        'week',
        'color',
        'file',
        'checkbox',
        'radio',
        'range',
        'hidden',
        'submit',
        'reset',
        'button',
        'image',
      ],
    },
    { name: 'name', doc: 'Input name' },
    { name: 'value', doc: 'Input value' },
    { name: 'placeholder', doc: 'Placeholder text' },
    { name: 'required', doc: 'Required field', type: 'boolean' },
    { name: 'disabled', doc: 'Disabled state', type: 'boolean' },
    { name: 'readonly', doc: 'Read-only state', type: 'boolean' },
    { name: 'autofocus', doc: 'Auto focus', type: 'boolean' },
    { name: 'autocomplete', doc: 'Autocomplete', values: ['on', 'off'] },
    { name: 'min', doc: 'Minimum value' },
    { name: 'max', doc: 'Maximum value' },
    { name: 'step', doc: 'Step increment' },
    { name: 'minlength', doc: 'Minimum length' },
    { name: 'maxlength', doc: 'Maximum length' },
    { name: 'pattern', doc: 'Validation pattern' },
    { name: 'size', doc: 'Input size' },
    { name: 'multiple', doc: 'Multiple values', type: 'boolean' },
    { name: 'accept', doc: 'Accepted file types' },
    { name: 'checked', doc: 'Checked state', type: 'boolean' },
    { name: 'list', doc: 'Datalist ID' },
    { name: 'form', doc: 'Form ID' },
    { name: 'formaction', doc: 'Form action URL' },
    { name: 'formmethod', doc: 'Form method', values: ['get', 'post'] },
    { name: 'formenctype', doc: 'Form encoding type' },
    { name: 'formtarget', doc: 'Form target' },
    { name: 'formnovalidate', doc: 'Skip validation', type: 'boolean' },
  ],

  button: [
    { name: 'type', doc: 'Button type', values: ['submit', 'reset', 'button'] },
    { name: 'name', doc: 'Button name' },
    { name: 'value', doc: 'Button value' },
    { name: 'disabled', doc: 'Disabled state', type: 'boolean' },
    { name: 'autofocus', doc: 'Auto focus', type: 'boolean' },
    { name: 'form', doc: 'Form ID' },
    { name: 'formaction', doc: 'Form action URL' },
    { name: 'formmethod', doc: 'Form method', values: ['get', 'post'] },
    { name: 'formenctype', doc: 'Form encoding type' },
    { name: 'formtarget', doc: 'Form target' },
    { name: 'formnovalidate', doc: 'Skip validation', type: 'boolean' },
  ],

  form: [
    { name: 'action', doc: 'Form action URL' },
    { name: 'method', doc: 'Form method', values: ['get', 'post'] },
    { name: 'enctype', doc: 'Encoding type', values: ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'] },
    { name: 'target', doc: 'Form target', values: ['_self', '_blank', '_parent', '_top'] },
    { name: 'name', doc: 'Form name' },
    { name: 'autocomplete', doc: 'Autocomplete', values: ['on', 'off'] },
    { name: 'novalidate', doc: 'Skip validation', type: 'boolean' },
    { name: 'accept-charset', doc: 'Character encodings' },
  ],

  textarea: [
    { name: 'name', doc: 'Textarea name' },
    { name: 'placeholder', doc: 'Placeholder text' },
    { name: 'rows', doc: 'Visible rows' },
    { name: 'cols', doc: 'Visible columns' },
    { name: 'required', doc: 'Required field', type: 'boolean' },
    { name: 'disabled', doc: 'Disabled state', type: 'boolean' },
    { name: 'readonly', doc: 'Read-only state', type: 'boolean' },
    { name: 'autofocus', doc: 'Auto focus', type: 'boolean' },
    { name: 'autocomplete', doc: 'Autocomplete', values: ['on', 'off'] },
    { name: 'minlength', doc: 'Minimum length' },
    { name: 'maxlength', doc: 'Maximum length' },
    { name: 'wrap', doc: 'Wrap behavior', values: ['soft', 'hard'] },
    { name: 'form', doc: 'Form ID' },
  ],

  select: [
    { name: 'name', doc: 'Select name' },
    { name: 'required', doc: 'Required field', type: 'boolean' },
    { name: 'disabled', doc: 'Disabled state', type: 'boolean' },
    { name: 'multiple', doc: 'Multiple selection', type: 'boolean' },
    { name: 'size', doc: 'Visible options' },
    { name: 'autofocus', doc: 'Auto focus', type: 'boolean' },
    { name: 'autocomplete', doc: 'Autocomplete', values: ['on', 'off'] },
    { name: 'form', doc: 'Form ID' },
  ],

  option: [
    { name: 'value', doc: 'Option value' },
    { name: 'selected', doc: 'Selected state', type: 'boolean' },
    { name: 'disabled', doc: 'Disabled state', type: 'boolean' },
    { name: 'label', doc: 'Option label' },
  ],

  label: [{ name: 'for', doc: 'Associated element ID' }],

  table: [{ name: 'border', doc: 'Table border' }],

  td: [
    { name: 'colspan', doc: 'Column span' },
    { name: 'rowspan', doc: 'Row span' },
    { name: 'headers', doc: 'Header IDs' },
  ],

  th: [
    { name: 'colspan', doc: 'Column span' },
    { name: 'rowspan', doc: 'Row span' },
    { name: 'headers', doc: 'Header IDs' },
    { name: 'scope', doc: 'Header scope', values: ['row', 'col', 'rowgroup', 'colgroup'] },
    { name: 'abbr', doc: 'Abbreviated header' },
  ],

  video: [
    { name: 'src', doc: 'Video source URL' },
    { name: 'poster', doc: 'Poster image URL' },
    { name: 'width', doc: 'Video width' },
    { name: 'height', doc: 'Video height' },
    { name: 'controls', doc: 'Show controls', type: 'boolean' },
    { name: 'autoplay', doc: 'Auto play', type: 'boolean' },
    { name: 'loop', doc: 'Loop playback', type: 'boolean' },
    { name: 'muted', doc: 'Muted audio', type: 'boolean' },
    { name: 'preload', doc: 'Preload behavior', values: ['none', 'metadata', 'auto'] },
    { name: 'playsinline', doc: 'Play inline on iOS', type: 'boolean' },
    { name: 'crossorigin', doc: 'CORS setting', values: ['anonymous', 'use-credentials'] },
  ],

  audio: [
    { name: 'src', doc: 'Audio source URL' },
    { name: 'controls', doc: 'Show controls', type: 'boolean' },
    { name: 'autoplay', doc: 'Auto play', type: 'boolean' },
    { name: 'loop', doc: 'Loop playback', type: 'boolean' },
    { name: 'muted', doc: 'Muted audio', type: 'boolean' },
    { name: 'preload', doc: 'Preload behavior', values: ['none', 'metadata', 'auto'] },
    { name: 'crossorigin', doc: 'CORS setting', values: ['anonymous', 'use-credentials'] },
  ],

  source: [
    { name: 'src', doc: 'Source URL' },
    { name: 'type', doc: 'MIME type' },
    { name: 'srcset', doc: 'Image sources' },
    { name: 'sizes', doc: 'Image sizes' },
    { name: 'media', doc: 'Media query' },
  ],

  iframe: [
    { name: 'src', doc: 'Frame source URL' },
    { name: 'srcdoc', doc: 'HTML content' },
    { name: 'name', doc: 'Frame name' },
    { name: 'width', doc: 'Frame width' },
    { name: 'height', doc: 'Frame height' },
    { name: 'sandbox', doc: 'Sandbox restrictions' },
    { name: 'allow', doc: 'Feature policy' },
    { name: 'allowfullscreen', doc: 'Allow fullscreen', type: 'boolean' },
    { name: 'loading', doc: 'Loading behavior', values: ['lazy', 'eager'] },
    { name: 'referrerpolicy', doc: 'Referrer policy' },
  ],

  canvas: [
    { name: 'width', doc: 'Canvas width' },
    { name: 'height', doc: 'Canvas height' },
  ],

  script: [
    { name: 'src', doc: 'Script source URL' },
    { name: 'type', doc: 'Script type', values: ['text/javascript', 'module'] },
    { name: 'async', doc: 'Async loading', type: 'boolean' },
    { name: 'defer', doc: 'Defer execution', type: 'boolean' },
    { name: 'crossorigin', doc: 'CORS setting', values: ['anonymous', 'use-credentials'] },
    { name: 'integrity', doc: 'Subresource integrity' },
    { name: 'nomodule', doc: 'Fallback for module', type: 'boolean' },
    { name: 'referrerpolicy', doc: 'Referrer policy' },
  ],

  link: [
    { name: 'href', doc: 'Resource URL' },
    {
      name: 'rel',
      doc: 'Relationship',
      values: ['stylesheet', 'icon', 'preload', 'prefetch', 'preconnect', 'dns-prefetch', 'manifest', 'canonical', 'author', 'license', 'alternate'],
    },
    { name: 'type', doc: 'MIME type' },
    { name: 'media', doc: 'Media query' },
    { name: 'sizes', doc: 'Icon sizes' },
    { name: 'as', doc: 'Preload resource type', values: ['script', 'style', 'image', 'font', 'fetch', 'document'] },
    { name: 'crossorigin', doc: 'CORS setting', values: ['anonymous', 'use-credentials'] },
    { name: 'integrity', doc: 'Subresource integrity' },
    { name: 'disabled', doc: 'Disabled stylesheet', type: 'boolean' },
    { name: 'hreflang', doc: 'Language of linked resource' },
    { name: 'imagesrcset', doc: 'Image sources' },
    { name: 'imagesizes', doc: 'Image sizes' },
  ],

  meta: [
    {
      name: 'name',
      doc: 'Metadata name',
      values: ['viewport', 'description', 'keywords', 'author', 'robots', 'theme-color', 'color-scheme', 'generator', 'application-name'],
    },
    { name: 'content', doc: 'Metadata content' },
    { name: 'charset', doc: 'Character encoding' },
    { name: 'http-equiv', doc: 'HTTP header', values: ['content-type', 'default-style', 'refresh', 'x-ua-compatible', 'content-security-policy'] },
    { name: 'property', doc: 'Open Graph property' },
  ],

  style: [
    { name: 'type', doc: 'Style type' },
    { name: 'media', doc: 'Media query' },
    { name: 'nonce', doc: 'CSP nonce' },
  ],

  details: [{ name: 'open', doc: 'Open state', type: 'boolean' }],

  dialog: [{ name: 'open', doc: 'Open state', type: 'boolean' }],

  ol: [
    { name: 'reversed', doc: 'Reversed order', type: 'boolean' },
    { name: 'start', doc: 'Starting number' },
    { name: 'type', doc: 'List type', values: ['1', 'a', 'A', 'i', 'I'] },
  ],

  li: [{ name: 'value', doc: 'List item value' }],

  time: [{ name: 'datetime', doc: 'Machine-readable date/time' }],

  progress: [
    { name: 'value', doc: 'Current value' },
    { name: 'max', doc: 'Maximum value' },
  ],

  meter: [
    { name: 'value', doc: 'Current value' },
    { name: 'min', doc: 'Minimum value' },
    { name: 'max', doc: 'Maximum value' },
    { name: 'low', doc: 'Low threshold' },
    { name: 'high', doc: 'High threshold' },
    { name: 'optimum', doc: 'Optimum value' },
  ],
};
```

#### 3.1.5 CSS Built-ins

```javascript
// data/completions/css-properties.js
export const CSS_PROPERTIES = [
  // Layout
  {
    name: 'display',
    values: [
      'none',
      'block',
      'inline',
      'inline-block',
      'flex',
      'inline-flex',
      'grid',
      'inline-grid',
      'table',
      'table-row',
      'table-cell',
      'contents',
      'flow-root',
    ],
    doc: 'Element display type',
  },
  { name: 'position', values: ['static', 'relative', 'absolute', 'fixed', 'sticky'], doc: 'Positioning method' },
  { name: 'top', doc: 'Top offset' },
  { name: 'right', doc: 'Right offset' },
  { name: 'bottom', doc: 'Bottom offset' },
  { name: 'left', doc: 'Left offset' },
  { name: 'inset', doc: 'Shorthand for top/right/bottom/left' },
  { name: 'z-index', doc: 'Stack order' },
  { name: 'float', values: ['none', 'left', 'right', 'inline-start', 'inline-end'], doc: 'Float direction' },
  { name: 'clear', values: ['none', 'left', 'right', 'both', 'inline-start', 'inline-end'], doc: 'Clear floats' },

  // Box model
  { name: 'width', doc: 'Element width' },
  { name: 'height', doc: 'Element height' },
  { name: 'min-width', doc: 'Minimum width' },
  { name: 'min-height', doc: 'Minimum height' },
  { name: 'max-width', doc: 'Maximum width' },
  { name: 'max-height', doc: 'Maximum height' },
  { name: 'margin', doc: 'Margin shorthand' },
  { name: 'margin-top', doc: 'Top margin' },
  { name: 'margin-right', doc: 'Right margin' },
  { name: 'margin-bottom', doc: 'Bottom margin' },
  { name: 'margin-left', doc: 'Left margin' },
  { name: 'margin-inline', doc: 'Inline margins' },
  { name: 'margin-block', doc: 'Block margins' },
  { name: 'padding', doc: 'Padding shorthand' },
  { name: 'padding-top', doc: 'Top padding' },
  { name: 'padding-right', doc: 'Right padding' },
  { name: 'padding-bottom', doc: 'Bottom padding' },
  { name: 'padding-left', doc: 'Left padding' },
  { name: 'padding-inline', doc: 'Inline padding' },
  { name: 'padding-block', doc: 'Block padding' },
  { name: 'box-sizing', values: ['content-box', 'border-box'], doc: 'Box sizing model' },
  { name: 'overflow', values: ['visible', 'hidden', 'scroll', 'auto', 'clip'], doc: 'Overflow behavior' },
  { name: 'overflow-x', values: ['visible', 'hidden', 'scroll', 'auto', 'clip'], doc: 'Horizontal overflow' },
  { name: 'overflow-y', values: ['visible', 'hidden', 'scroll', 'auto', 'clip'], doc: 'Vertical overflow' },
  { name: 'overflow-wrap', values: ['normal', 'break-word', 'anywhere'], doc: 'Word wrap behavior' },

  // Flexbox
  { name: 'flex', doc: 'Flex shorthand' },
  { name: 'flex-direction', values: ['row', 'row-reverse', 'column', 'column-reverse'], doc: 'Flex direction' },
  { name: 'flex-wrap', values: ['nowrap', 'wrap', 'wrap-reverse'], doc: 'Flex wrapping' },
  { name: 'flex-flow', doc: 'Flex direction and wrap' },
  { name: 'flex-grow', doc: 'Flex grow factor' },
  { name: 'flex-shrink', doc: 'Flex shrink factor' },
  { name: 'flex-basis', doc: 'Flex basis size' },
  {
    name: 'justify-content',
    values: ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly', 'start', 'end'],
    doc: 'Main axis alignment',
  },
  { name: 'align-items', values: ['stretch', 'flex-start', 'flex-end', 'center', 'baseline', 'start', 'end'], doc: 'Cross axis alignment' },
  {
    name: 'align-content',
    values: ['stretch', 'flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly', 'start', 'end'],
    doc: 'Multi-line alignment',
  },
  { name: 'align-self', values: ['auto', 'stretch', 'flex-start', 'flex-end', 'center', 'baseline', 'start', 'end'], doc: 'Individual cross alignment' },
  { name: 'order', doc: 'Flex item order' },
  { name: 'gap', doc: 'Grid/flex gap' },
  { name: 'row-gap', doc: 'Row gap' },
  { name: 'column-gap', doc: 'Column gap' },

  // Grid
  { name: 'grid', doc: 'Grid shorthand' },
  { name: 'grid-template', doc: 'Grid template shorthand' },
  { name: 'grid-template-columns', doc: 'Column track sizing' },
  { name: 'grid-template-rows', doc: 'Row track sizing' },
  { name: 'grid-template-areas', doc: 'Named grid areas' },
  { name: 'grid-auto-columns', doc: 'Auto column size' },
  { name: 'grid-auto-rows', doc: 'Auto row size' },
  { name: 'grid-auto-flow', values: ['row', 'column', 'dense', 'row dense', 'column dense'], doc: 'Auto placement algorithm' },
  { name: 'grid-column', doc: 'Column placement' },
  { name: 'grid-column-start', doc: 'Column start line' },
  { name: 'grid-column-end', doc: 'Column end line' },
  { name: 'grid-row', doc: 'Row placement' },
  { name: 'grid-row-start', doc: 'Row start line' },
  { name: 'grid-row-end', doc: 'Row end line' },
  { name: 'grid-area', doc: 'Grid area placement' },
  { name: 'place-content', doc: 'Align and justify content' },
  { name: 'place-items', doc: 'Align and justify items' },
  { name: 'place-self', doc: 'Align and justify self' },

  // Typography
  { name: 'font', doc: 'Font shorthand' },
  { name: 'font-family', doc: 'Font family' },
  { name: 'font-size', doc: 'Font size' },
  { name: 'font-weight', values: ['normal', 'bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900'], doc: 'Font weight' },
  { name: 'font-style', values: ['normal', 'italic', 'oblique'], doc: 'Font style' },
  { name: 'font-variant', doc: 'Font variant' },
  {
    name: 'font-stretch',
    values: ['ultra-condensed', 'extra-condensed', 'condensed', 'semi-condensed', 'normal', 'semi-expanded', 'expanded', 'extra-expanded', 'ultra-expanded'],
    doc: 'Font stretch',
  },
  { name: 'line-height', doc: 'Line height' },
  { name: 'letter-spacing', doc: 'Letter spacing' },
  { name: 'word-spacing', doc: 'Word spacing' },
  { name: 'text-align', values: ['left', 'right', 'center', 'justify', 'start', 'end'], doc: 'Text alignment' },
  { name: 'text-align-last', values: ['auto', 'left', 'right', 'center', 'justify', 'start', 'end'], doc: 'Last line alignment' },
  { name: 'text-decoration', doc: 'Text decoration shorthand' },
  { name: 'text-decoration-line', values: ['none', 'underline', 'overline', 'line-through'], doc: 'Decoration line type' },
  { name: 'text-decoration-style', values: ['solid', 'double', 'dotted', 'dashed', 'wavy'], doc: 'Decoration style' },
  { name: 'text-decoration-color', doc: 'Decoration color' },
  { name: 'text-decoration-thickness', doc: 'Decoration thickness' },
  { name: 'text-underline-offset', doc: 'Underline offset' },
  { name: 'text-transform', values: ['none', 'capitalize', 'uppercase', 'lowercase', 'full-width'], doc: 'Text capitalization' },
  { name: 'text-indent', doc: 'First line indent' },
  { name: 'text-shadow', doc: 'Text shadow' },
  { name: 'text-overflow', values: ['clip', 'ellipsis'], doc: 'Overflow text display' },
  { name: 'white-space', values: ['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line', 'break-spaces'], doc: 'Whitespace handling' },
  { name: 'word-break', values: ['normal', 'break-all', 'keep-all', 'break-word'], doc: 'Word breaking' },
  { name: 'vertical-align', values: ['baseline', 'sub', 'super', 'top', 'text-top', 'middle', 'bottom', 'text-bottom'], doc: 'Vertical alignment' },

  // Colors and backgrounds
  { name: 'color', doc: 'Text color' },
  { name: 'background', doc: 'Background shorthand' },
  { name: 'background-color', doc: 'Background color' },
  { name: 'background-image', doc: 'Background image' },
  { name: 'background-position', doc: 'Background position' },
  { name: 'background-size', values: ['auto', 'cover', 'contain'], doc: 'Background size' },
  { name: 'background-repeat', values: ['repeat', 'repeat-x', 'repeat-y', 'no-repeat', 'space', 'round'], doc: 'Background repeat' },
  { name: 'background-attachment', values: ['scroll', 'fixed', 'local'], doc: 'Background attachment' },
  { name: 'background-origin', values: ['border-box', 'padding-box', 'content-box'], doc: 'Background origin' },
  { name: 'background-clip', values: ['border-box', 'padding-box', 'content-box', 'text'], doc: 'Background clip' },
  { name: 'background-blend-mode', doc: 'Background blend mode' },
  { name: 'opacity', doc: 'Element opacity' },

  // Borders
  { name: 'border', doc: 'Border shorthand' },
  { name: 'border-width', doc: 'Border width' },
  { name: 'border-style', values: ['none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'], doc: 'Border style' },
  { name: 'border-color', doc: 'Border color' },
  { name: 'border-top', doc: 'Top border' },
  { name: 'border-right', doc: 'Right border' },
  { name: 'border-bottom', doc: 'Bottom border' },
  { name: 'border-left', doc: 'Left border' },
  { name: 'border-radius', doc: 'Border radius' },
  { name: 'border-top-left-radius', doc: 'Top-left radius' },
  { name: 'border-top-right-radius', doc: 'Top-right radius' },
  { name: 'border-bottom-right-radius', doc: 'Bottom-right radius' },
  { name: 'border-bottom-left-radius', doc: 'Bottom-left radius' },
  { name: 'border-image', doc: 'Border image shorthand' },
  { name: 'border-collapse', values: ['separate', 'collapse'], doc: 'Table border collapse' },
  { name: 'border-spacing', doc: 'Table border spacing' },
  { name: 'outline', doc: 'Outline shorthand' },
  { name: 'outline-width', doc: 'Outline width' },
  { name: 'outline-style', doc: 'Outline style' },
  { name: 'outline-color', doc: 'Outline color' },
  { name: 'outline-offset', doc: 'Outline offset' },

  // Effects
  { name: 'box-shadow', doc: 'Box shadow' },
  { name: 'filter', doc: 'Visual filters' },
  { name: 'backdrop-filter', doc: 'Backdrop filters' },
  { name: 'mix-blend-mode', doc: 'Element blend mode' },
  { name: 'clip-path', doc: 'Clipping path' },
  { name: 'mask', doc: 'Mask shorthand' },
  { name: 'mask-image', doc: 'Mask image' },

  // Transforms
  { name: 'transform', doc: 'Transform functions' },
  { name: 'transform-origin', doc: 'Transform origin' },
  { name: 'transform-style', values: ['flat', 'preserve-3d'], doc: '3D transform style' },
  { name: 'perspective', doc: '3D perspective' },
  { name: 'perspective-origin', doc: 'Perspective origin' },
  { name: 'backface-visibility', values: ['visible', 'hidden'], doc: 'Backface visibility' },
  { name: 'rotate', doc: 'Rotation' },
  { name: 'scale', doc: 'Scale' },
  { name: 'translate', doc: 'Translation' },

  // Transitions and animations
  { name: 'transition', doc: 'Transition shorthand' },
  { name: 'transition-property', doc: 'Transition properties' },
  { name: 'transition-duration', doc: 'Transition duration' },
  { name: 'transition-timing-function', values: ['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out', 'step-start', 'step-end'], doc: 'Transition timing' },
  { name: 'transition-delay', doc: 'Transition delay' },
  { name: 'animation', doc: 'Animation shorthand' },
  { name: 'animation-name', doc: 'Animation name' },
  { name: 'animation-duration', doc: 'Animation duration' },
  { name: 'animation-timing-function', doc: 'Animation timing' },
  { name: 'animation-delay', doc: 'Animation delay' },
  { name: 'animation-iteration-count', doc: 'Animation iterations' },
  { name: 'animation-direction', values: ['normal', 'reverse', 'alternate', 'alternate-reverse'], doc: 'Animation direction' },
  { name: 'animation-fill-mode', values: ['none', 'forwards', 'backwards', 'both'], doc: 'Animation fill mode' },
  { name: 'animation-play-state', values: ['running', 'paused'], doc: 'Animation state' },

  // Lists
  { name: 'list-style', doc: 'List style shorthand' },
  {
    name: 'list-style-type',
    values: ['disc', 'circle', 'square', 'decimal', 'decimal-leading-zero', 'lower-roman', 'upper-roman', 'lower-alpha', 'upper-alpha', 'none'],
    doc: 'List marker type',
  },
  { name: 'list-style-position', values: ['inside', 'outside'], doc: 'List marker position' },
  { name: 'list-style-image', doc: 'List marker image' },

  // Tables
  { name: 'table-layout', values: ['auto', 'fixed'], doc: 'Table layout algorithm' },
  { name: 'caption-side', values: ['top', 'bottom'], doc: 'Caption position' },
  { name: 'empty-cells', values: ['show', 'hide'], doc: 'Empty cell visibility' },

  // User interface
  {
    name: 'cursor',
    values: [
      'auto',
      'default',
      'none',
      'context-menu',
      'help',
      'pointer',
      'progress',
      'wait',
      'cell',
      'crosshair',
      'text',
      'vertical-text',
      'alias',
      'copy',
      'move',
      'no-drop',
      'not-allowed',
      'grab',
      'grabbing',
      'all-scroll',
      'col-resize',
      'row-resize',
      'n-resize',
      's-resize',
      'e-resize',
      'w-resize',
      'ne-resize',
      'nw-resize',
      'se-resize',
      'sw-resize',
      'ew-resize',
      'ns-resize',
      'nesw-resize',
      'nwse-resize',
      'zoom-in',
      'zoom-out',
    ],
    doc: 'Cursor type',
  },
  { name: 'user-select', values: ['auto', 'none', 'text', 'all'], doc: 'Text selection behavior' },
  { name: 'pointer-events', values: ['auto', 'none'], doc: 'Pointer events' },
  { name: 'resize', values: ['none', 'both', 'horizontal', 'vertical'], doc: 'Element resizability' },
  { name: 'caret-color', doc: 'Text cursor color' },
  { name: 'accent-color', doc: 'Accent color for form controls' },
  { name: 'appearance', values: ['none', 'auto'], doc: 'Native appearance' },

  // Visibility
  { name: 'visibility', values: ['visible', 'hidden', 'collapse'], doc: 'Element visibility' },
  { name: 'content', doc: 'Generated content' },
  { name: 'quotes', doc: 'Quote characters' },
  { name: 'counter-reset', doc: 'Reset counters' },
  { name: 'counter-increment', doc: 'Increment counters' },

  // Scrolling
  { name: 'scroll-behavior', values: ['auto', 'smooth'], doc: 'Scroll behavior' },
  { name: 'scroll-snap-type', doc: 'Scroll snap behavior' },
  { name: 'scroll-snap-align', values: ['none', 'start', 'end', 'center'], doc: 'Scroll snap alignment' },
  { name: 'scroll-margin', doc: 'Scroll snap margin' },
  { name: 'scroll-padding', doc: 'Scroll snap padding' },
  { name: 'overscroll-behavior', values: ['auto', 'contain', 'none'], doc: 'Overscroll behavior' },

  // Columns
  { name: 'columns', doc: 'Column shorthand' },
  { name: 'column-count', doc: 'Column count' },
  { name: 'column-width', doc: 'Column width' },
  { name: 'column-gap', doc: 'Column gap' },
  { name: 'column-rule', doc: 'Column rule shorthand' },
  { name: 'column-rule-width', doc: 'Column rule width' },
  { name: 'column-rule-style', doc: 'Column rule style' },
  { name: 'column-rule-color', doc: 'Column rule color' },
  { name: 'column-span', values: ['none', 'all'], doc: 'Column spanning' },

  // Writing modes
  { name: 'writing-mode', values: ['horizontal-tb', 'vertical-rl', 'vertical-lr'], doc: 'Writing mode' },
  { name: 'direction', values: ['ltr', 'rtl'], doc: 'Text direction' },
  { name: 'unicode-bidi', doc: 'Unicode bidirectional' },
  { name: 'text-orientation', values: ['mixed', 'upright', 'sideways'], doc: 'Text orientation' },

  // Object fit
  { name: 'object-fit', values: ['fill', 'contain', 'cover', 'none', 'scale-down'], doc: 'Object fit' },
  { name: 'object-position', doc: 'Object position' },

  // Aspect ratio
  { name: 'aspect-ratio', doc: 'Aspect ratio' },

  // Container queries
  { name: 'container', doc: 'Container shorthand' },
  { name: 'container-type', values: ['normal', 'size', 'inline-size'], doc: 'Container type' },
  { name: 'container-name', doc: 'Container name' },

  // Print
  { name: 'page-break-before', values: ['auto', 'always', 'avoid', 'left', 'right'], doc: 'Page break before' },
  { name: 'page-break-after', values: ['auto', 'always', 'avoid', 'left', 'right'], doc: 'Page break after' },
  { name: 'page-break-inside', values: ['auto', 'avoid'], doc: 'Page break inside' },
  { name: 'break-before', doc: 'Break before' },
  { name: 'break-after', doc: 'Break after' },
  { name: 'break-inside', doc: 'Break inside' },
  { name: 'orphans', doc: 'Minimum lines at bottom' },
  { name: 'widows', doc: 'Minimum lines at top' },
];

// CSS functions for autocomplete
export const CSS_FUNCTIONS = [
  { name: 'rgb', signature: '(r, g, b)', doc: 'RGB color' },
  { name: 'rgba', signature: '(r, g, b, a)', doc: 'RGB color with alpha' },
  { name: 'hsl', signature: '(h, s, l)', doc: 'HSL color' },
  { name: 'hsla', signature: '(h, s, l, a)', doc: 'HSL color with alpha' },
  { name: 'hwb', signature: '(h, w, b)', doc: 'HWB color' },
  { name: 'lab', signature: '(l, a, b)', doc: 'Lab color' },
  { name: 'lch', signature: '(l, c, h)', doc: 'LCH color' },
  { name: 'oklch', signature: '(l, c, h)', doc: 'OKLCH color' },
  { name: 'oklab', signature: '(l, a, b)', doc: 'OKLAB color' },
  { name: 'color', signature: '(colorspace params)', doc: 'Color function' },
  { name: 'color-mix', signature: '(in colorspace, color1, color2)', doc: 'Mix colors' },
  { name: 'url', signature: '(path)', doc: 'URL reference' },
  { name: 'var', signature: '(--custom-property)', doc: 'CSS variable' },
  { name: 'calc', signature: '(expression)', doc: 'Calculate value' },
  { name: 'min', signature: '(value1, value2, ...)', doc: 'Minimum value' },
  { name: 'max', signature: '(value1, value2, ...)', doc: 'Maximum value' },
  { name: 'clamp', signature: '(min, val, max)', doc: 'Clamped value' },
  { name: 'linear-gradient', signature: '(direction, colors)', doc: 'Linear gradient' },
  { name: 'radial-gradient', signature: '(shape, colors)', doc: 'Radial gradient' },
  { name: 'conic-gradient', signature: '(angle, colors)', doc: 'Conic gradient' },
  { name: 'repeating-linear-gradient', signature: '(direction, colors)', doc: 'Repeating linear gradient' },
  { name: 'repeating-radial-gradient', signature: '(shape, colors)', doc: 'Repeating radial gradient' },
  { name: 'repeating-conic-gradient', signature: '(angle, colors)', doc: 'Repeating conic gradient' },
  { name: 'translate', signature: '(x, y)', doc: 'Translation transform' },
  { name: 'translateX', signature: '(x)', doc: 'X translation' },
  { name: 'translateY', signature: '(y)', doc: 'Y translation' },
  { name: 'translateZ', signature: '(z)', doc: 'Z translation' },
  { name: 'translate3d', signature: '(x, y, z)', doc: '3D translation' },
  { name: 'rotate', signature: '(angle)', doc: 'Rotation transform' },
  { name: 'rotateX', signature: '(angle)', doc: 'X rotation' },
  { name: 'rotateY', signature: '(angle)', doc: 'Y rotation' },
  { name: 'rotateZ', signature: '(angle)', doc: 'Z rotation' },
  { name: 'rotate3d', signature: '(x, y, z, angle)', doc: '3D rotation' },
  { name: 'scale', signature: '(x, y)', doc: 'Scale transform' },
  { name: 'scaleX', signature: '(x)', doc: 'X scale' },
  { name: 'scaleY', signature: '(y)', doc: 'Y scale' },
  { name: 'scaleZ', signature: '(z)', doc: 'Z scale' },
  { name: 'scale3d', signature: '(x, y, z)', doc: '3D scale' },
  { name: 'skew', signature: '(x-angle, y-angle)', doc: 'Skew transform' },
  { name: 'skewX', signature: '(angle)', doc: 'X skew' },
  { name: 'skewY', signature: '(angle)', doc: 'Y skew' },
  { name: 'matrix', signature: '(a, b, c, d, tx, ty)', doc: 'Matrix transform' },
  { name: 'matrix3d', signature: '(...)', doc: '3D matrix transform' },
  { name: 'perspective', signature: '(length)', doc: 'Perspective transform' },
  { name: 'blur', signature: '(radius)', doc: 'Blur filter' },
  { name: 'brightness', signature: '(amount)', doc: 'Brightness filter' },
  { name: 'contrast', signature: '(amount)', doc: 'Contrast filter' },
  { name: 'drop-shadow', signature: '(x y blur color)', doc: 'Drop shadow filter' },
  { name: 'grayscale', signature: '(amount)', doc: 'Grayscale filter' },
  { name: 'hue-rotate', signature: '(angle)', doc: 'Hue rotation filter' },
  { name: 'invert', signature: '(amount)', doc: 'Invert filter' },
  { name: 'opacity', signature: '(amount)', doc: 'Opacity filter' },
  { name: 'saturate', signature: '(amount)', doc: 'Saturation filter' },
  { name: 'sepia', signature: '(amount)', doc: 'Sepia filter' },
  { name: 'attr', signature: '(attribute-name)', doc: 'Attribute value' },
  { name: 'counter', signature: '(name)', doc: 'Counter value' },
  { name: 'counters', signature: '(name, string)', doc: 'Nested counter value' },
  { name: 'image-set', signature: '(image options)', doc: 'Responsive image' },
  { name: 'fit-content', signature: '(length)', doc: 'Fit content size' },
  { name: 'minmax', signature: '(min, max)', doc: 'Grid minmax' },
  { name: 'repeat', signature: '(count, tracks)', doc: 'Grid repeat' },
];

// CSS at-rules
export const CSS_AT_RULES = [
  { name: '@media', doc: 'Media query' },
  { name: '@import', doc: 'Import stylesheet' },
  { name: '@font-face', doc: 'Custom font' },
  { name: '@keyframes', doc: 'Animation keyframes' },
  { name: '@supports', doc: 'Feature query' },
  { name: '@page', doc: 'Page style' },
  { name: '@layer', doc: 'Cascade layer' },
  { name: '@container', doc: 'Container query' },
  { name: '@property', doc: 'Custom property definition' },
  { name: '@scope', doc: 'Scope styles' },
  { name: '@starting-style', doc: 'Entry animation styles' },
];

// CSS pseudo-classes
export const CSS_PSEUDO_CLASSES = [
  { name: ':hover', doc: 'Mouse hover state' },
  { name: ':active', doc: 'Active/pressed state' },
  { name: ':focus', doc: 'Focus state' },
  { name: ':focus-visible', doc: 'Keyboard focus state' },
  { name: ':focus-within', doc: 'Contains focus' },
  { name: ':visited', doc: 'Visited link' },
  { name: ':link', doc: 'Unvisited link' },
  { name: ':target', doc: 'URL fragment target' },
  { name: ':first-child', doc: 'First child element' },
  { name: ':last-child', doc: 'Last child element' },
  { name: ':only-child', doc: 'Only child element' },
  { name: ':nth-child()', doc: 'Nth child element' },
  { name: ':nth-last-child()', doc: 'Nth child from end' },
  { name: ':first-of-type', doc: 'First of type' },
  { name: ':last-of-type', doc: 'Last of type' },
  { name: ':only-of-type', doc: 'Only of type' },
  { name: ':nth-of-type()', doc: 'Nth of type' },
  { name: ':nth-last-of-type()', doc: 'Nth of type from end' },
  { name: ':empty', doc: 'Empty element' },
  { name: ':enabled', doc: 'Enabled form control' },
  { name: ':disabled', doc: 'Disabled form control' },
  { name: ':checked', doc: 'Checked input' },
  { name: ':indeterminate', doc: 'Indeterminate state' },
  { name: ':required', doc: 'Required input' },
  { name: ':optional', doc: 'Optional input' },
  { name: ':valid', doc: 'Valid input' },
  { name: ':invalid', doc: 'Invalid input' },
  { name: ':in-range', doc: 'Value in range' },
  { name: ':out-of-range', doc: 'Value out of range' },
  { name: ':read-only', doc: 'Read-only element' },
  { name: ':read-write', doc: 'Editable element' },
  { name: ':placeholder-shown', doc: 'Showing placeholder' },
  { name: ':default', doc: 'Default form control' },
  { name: ':root', doc: 'Document root' },
  { name: ':not()', doc: 'Negation selector' },
  { name: ':is()', doc: 'Matches-any selector' },
  { name: ':where()', doc: 'Zero-specificity is()' },
  { name: ':has()', doc: 'Relational selector' },
  { name: ':lang()', doc: 'Language selector' },
  { name: ':dir()', doc: 'Direction selector' },
  { name: ':any-link', doc: 'Any link' },
  { name: ':local-link', doc: 'Same-origin link' },
  { name: ':playing', doc: 'Playing media' },
  { name: ':paused', doc: 'Paused media' },
  { name: ':fullscreen', doc: 'Fullscreen element' },
  { name: ':modal', doc: 'Modal element' },
  { name: ':picture-in-picture', doc: 'PiP element' },
  { name: ':autofill', doc: 'Autofilled input' },
];

// CSS pseudo-elements
export const CSS_PSEUDO_ELEMENTS = [
  { name: '::before', doc: 'Insert before content' },
  { name: '::after', doc: 'Insert after content' },
  { name: '::first-line', doc: 'First line of text' },
  { name: '::first-letter', doc: 'First letter' },
  { name: '::selection', doc: 'Selected text' },
  { name: '::marker', doc: 'List marker' },
  { name: '::placeholder', doc: 'Input placeholder' },
  { name: '::backdrop', doc: 'Backdrop behind modal' },
  { name: '::cue', doc: 'Video cue' },
  { name: '::file-selector-button', doc: 'File input button' },
  { name: '::part()', doc: 'Shadow DOM part' },
  { name: '::slotted()', doc: 'Slotted content' },
  { name: '::highlight()', doc: 'Highlighted text' },
  { name: '::target-text', doc: 'URL fragment text' },
  { name: '::spelling-error', doc: 'Spelling error' },
  { name: '::grammar-error', doc: 'Grammar error' },
];
```

#### 3.1.6 Autocomplete Widget UI

```javascript
// view/widgets/AutocompleteWidget.js
export class AutocompleteWidget {
  _element = null;
  _listElement = null;
  _selectedIndex = 0;
  _items = [];
  _visible = false;
  _onSelect = null;

  constructor(container, options = {}) {
    this._container = container;
    this._maxItems = options.maxItems || 10;
    this._createDOM();
  }

  _createDOM() {
    this._element = document.createElement('div');
    this._element.className = 'ec-autocomplete';
    this._element.style.display = 'none';

    this._listElement = document.createElement('ul');
    this._listElement.className = 'ec-autocomplete-list';

    this._element.appendChild(this._listElement);
    this._container.appendChild(this._element);
  }

  show(items, position) {
    /* ... */
  }
  hide() {
    /* ... */
  }
  selectNext() {
    /* ... */
  }
  selectPrevious() {
    /* ... */
  }
  confirm() {
    /* ... */
  }
}
```

---

### 3.2 Auto-Close (Brackets, Quotes, Tags)

#### 3.2.1 Overview

Automatically insert closing characters when opening characters are typed.

#### 3.2.2 Implementation

```javascript
// features/autoClose/AutoCloseFeature.js
export class AutoCloseFeature {
  static PAIRS = {
    '(': ')',
    '[': ']',
    '{': '}',
    '"': '"',
    "'": "'",
    '`': '`',
    '<': '>',
  };

  static SKIP_CHARS = [')', ']', '}', '"', "'", '`', '>'];

  constructor(editor) {
    this._editor = editor;
    this._bindEvents();
  }

  _handleInput(char, position) {
    // 1. Is it a pair character?
    if (AutoCloseFeature.PAIRS[char]) {
      return this._insertPair(char, position);
    }

    // 2. Is it a closing char and matches next char? (skip over)
    if (this._shouldSkipOver(char, position)) {
      return this._skipOver(position);
    }

    return false; // Default behavior
  }

  _handleBackspace(position) {
    // Delete empty pair: () -> empty
    const before = this._getCharBefore(position);
    const after = this._getCharAfter(position);

    if (AutoCloseFeature.PAIRS[before] === after) {
      return this._deletePair(position);
    }

    return false;
  }
}
```

#### 3.2.3 HTML Tag Auto-Close

```javascript
// features/autoClose/HTMLAutoClose.js
export class HTMLAutoClose {
  static VOID_ELEMENTS = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];

  handleTagClose(tagName) {
    if (HTMLAutoClose.VOID_ELEMENTS.includes(tagName.toLowerCase())) {
      return ''; // No auto-close for void elements
    }
    return `</${tagName}>`;
  }
}
```

---

### 3.3 Auto-Indent

#### 3.3.1 Overview

Automatically apply appropriate indentation when pressing Enter.

#### 3.3.2 Rules

1. Maintain indentation of previous line
2. Increase indentation after `{`, `(`, `[`
3. Decrease indentation before `}`, `)`, `]`
4. Language-specific keyword-based indentation (if, for, function, etc.)

#### 3.3.3 Implementation

```javascript
// features/autoIndent/AutoIndentFeature.js
export class AutoIndentFeature {
  static INDENT_TRIGGERS = ['{', '(', '[', ':'];
  static DEDENT_TRIGGERS = ['}', ')', ']'];

  constructor(editor, options = {}) {
    this._editor = editor;
    this._tabSize = options.tabSize || 2;
    this._useSpaces = options.useSpaces !== false;
  }

  handleEnter(position) {
    const currentLine = this._editor.document.getLine(position.line);
    const beforeCursor = currentLine.slice(0, position.column);
    const afterCursor = currentLine.slice(position.column);

    const currentIndent = this._getIndentation(currentLine);
    const lastChar = beforeCursor.trim().slice(-1);
    const shouldIncrease = AutoIndentFeature.INDENT_TRIGGERS.includes(lastChar);

    const firstCharAfter = afterCursor.trim()[0];
    const shouldDecrease = AutoIndentFeature.DEDENT_TRIGGERS.includes(firstCharAfter);

    let newIndent = currentIndent;
    if (shouldIncrease) {
      newIndent += this._getIndentString();
    }

    // Special case: Enter between {}
    if (shouldIncrease && shouldDecrease) {
      return this._handleBracketEnter(position, currentIndent);
    }

    return '\n' + newIndent;
  }

  _handleBracketEnter(position, baseIndent) {
    // {|} → {\n  |\n}
    const indent = this._getIndentString();
    return `\n${baseIndent}${indent}\n${baseIndent}`;
  }
}
```

---

### 3.4 Keyword Search (Find & Replace)

#### 3.4.1 Overview

Ctrl+F for search, Ctrl+H for replace functionality.

#### 3.4.2 UI Design

```
┌──────────────────────────────────────────────┐
│ 🔍 [search input        ] [↑][↓] 3 of 15 [x]│
│ ↔️ [replace input       ] [Replace][All]     │
│ ☐ Case ☐ Word ☐ Regex                        │
└──────────────────────────────────────────────┘
```

#### 3.4.3 Implementation

```javascript
// services/SearchService.js
export class SearchService {
  constructor(editor) {
    this._editor = editor;
    this._matches = [];
    this._currentIndex = -1;
  }

  find(query, options = {}) {
    const { caseSensitive = false, wholeWord = false, regex = false } = options;

    this._matches = [];
    const text = this._editor.document.getText();
    const pattern = this._buildPattern(query, options);

    let match;
    while ((match = pattern.exec(text)) !== null) {
      this._matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
      });
    }

    return this._matches;
  }

  findNext() {
    /* ... */
  }
  findPrevious() {
    /* ... */
  }
  replace(replacement) {
    /* ... */
  }
  replaceAll(replacement) {
    /* ... */
  }
}
```

---

### 3.5 Multi Cursor

#### 3.5.1 Overview

Support multiple cursors with Ctrl+Click and Ctrl+D for selecting next occurrence.

#### 3.5.2 Selection Model Changes

```javascript
// model/Selection.js
export class Selection {
  constructor(startOffset, endOffset, isReversed = false) {
    this.startOffset = startOffset;
    this.endOffset = endOffset;
    this.isReversed = isReversed;
  }

  get anchor() {
    return this.isReversed ? this.endOffset : this.startOffset;
  }
  get cursor() {
    return this.isReversed ? this.startOffset : this.endOffset;
  }
  get isEmpty() {
    return this.startOffset === this.endOffset;
  }
}

// model/SelectionCollection.js
export class SelectionCollection {
  _selections = [];
  _primaryIndex = 0;

  get primary() {
    return this._selections[this._primaryIndex];
  }
  get all() {
    return [...this._selections];
  }
  get count() {
    return this._selections.length;
  }

  add(selection) {
    this._selections.push(selection);
    this._normalize();
  }

  _normalize() {
    // Sort by offset and merge overlapping selections
    this._selections.sort((a, b) => a.startOffset - b.startOffset);
    this._mergeOverlapping();
  }
}
```

#### 3.5.3 Editor Changes

```javascript
// Editor.js modifications
class Editor {
  _selections = new SelectionCollection();

  // Backward compatibility
  getSelection() {
    const primary = this._selections.primary;
    return { start: primary.startOffset, end: primary.endOffset };
  }

  // New API
  getAllSelections() {
    return this._selections.all;
  }

  addSelection(start, end) {
    this._selections.add(new Selection(start, end));
  }

  // Apply text to all cursors
  insertText(text) {
    // Process in reverse order to prevent offset shift issues
    const selections = this._selections.all.reverse();

    for (const sel of selections) {
      this._document.replaceRange(sel.startOffset, sel.endOffset, text);
    }
  }
}
```

---

### 3.6 File Explorer (IDE Sidebar)

#### 3.6.1 Overview

VS Code-style file explorer in sidebar.

#### 3.6.2 Data Model

```javascript
// model/FileModel.js
export class FileNode {
  constructor(name, path, type = 'file') {
    this.name = name;
    this.path = path;
    this.type = type; // 'file' | 'directory'
    this.children = type === 'directory' ? [] : null;
    this.expanded = false;
    this.modified = false;
  }
}
```

#### 3.6.3 UI Component

```javascript
// ide/FileExplorer.js
export class FileExplorer {
  _element = null;
  _treeElement = null;
  _fileService = null;

  constructor(container, fileService, options = {}) {
    this._container = container;
    this._fileService = fileService;
    this._createDOM();
  }

  render(tree) {
    this._treeElement.innerHTML = '';
    this._renderNode(tree, this._treeElement, 0);
  }

  _renderNode(node, parent, depth) {
    const item = document.createElement('div');
    item.className = `ide-tree-item ${node.type}`;
    item.style.paddingLeft = `${depth * 16 + 8}px`;

    const icon = node.type === 'directory' ? (node.expanded ? '📂' : '📁') : this._getFileIcon(node.name);

    item.innerHTML = `
      <span class="ide-tree-icon">${icon}</span>
      <span class="ide-tree-name">${node.name}</span>
    `;

    parent.appendChild(item);
  }
}
```

---

### 3.7 Multi Tab

#### 3.7.1 Overview

Tabbed editor interface for opening multiple files.

#### 3.7.2 UI Design

```
┌──────────────────────────────────────────────────────┐
│ [index.js ●] [styles.css] [app.js] [+]          [×] │
├──────────────────────────────────────────────────────┤
│                    Editor Content                    │
└──────────────────────────────────────────────────────┘
```

#### 3.7.3 Implementation

```javascript
// ide/TabManager.js
export class TabManager {
  _tabs = [];
  _activeIndex = -1;
  _editors = new Map(); // path -> Editor instance

  openFile(path, content, options = {}) {
    // Check if already open
    const existingIndex = this._tabs.findIndex((t) => t.path === path);
    if (existingIndex !== -1) {
      this.activateTab(existingIndex);
      return;
    }

    // Create new tab
    const tab = {
      path,
      name: path.split('/').pop(),
      modified: false,
      language: this._detectLanguage(path),
    };

    this._tabs.push(tab);
    this._renderTabs();
    this.activateTab(this._tabs.length - 1);
  }

  closeTab(index) {
    /* ... */
  }
  activateTab(index) {
    /* ... */
  }
}
```

---

### 3.8 Indent Coloring (Rainbow Indentation)

#### 3.8.1 Overview

Display different colored guidelines for each indentation level.

#### 3.8.2 Implementation

```javascript
// view/decorations/IndentGuideDecoration.js
export class IndentGuideDecoration {
  static COLORS = [
    'rgba(255, 255, 64, 0.3)', // Yellow
    'rgba(127, 255, 127, 0.3)', // Green
    'rgba(255, 127, 255, 0.3)', // Pink
    'rgba(79, 236, 236, 0.3)', // Cyan
    'rgba(255, 179, 71, 0.3)', // Orange
    'rgba(171, 128, 255, 0.3)', // Purple
  ];

  constructor(view, options = {}) {
    this._view = view;
    this._tabSize = options.tabSize || 2;
    this._createLayer();
  }

  render(lines) {
    this._element.innerHTML = '';

    lines.forEach((line, lineIndex) => {
      const indentLevel = this._getIndentLevel(line);

      for (let level = 0; level < indentLevel; level++) {
        const guide = document.createElement('div');
        guide.className = 'ec-indent-guide';
        guide.style.background = IndentGuideDecoration.COLORS[level % 6];
        this._element.appendChild(guide);
      }
    });
  }
}
```

---

### 3.9 Bracket Match Highlight

#### 3.9.1 Overview

Highlight matching brackets when cursor is on a bracket.

#### 3.9.2 Implementation

```javascript
// features/bracketMatch/BracketMatchFeature.js
export class BracketMatchFeature {
  static BRACKETS = {
    '(': ')',
    ')': '(',
    '[': ']',
    ']': '[',
    '{': '}',
    '}': '{',
    '<': '>',
    '>': '<',
  };

  constructor(editor) {
    this._editor = editor;
    this._decorations = [];
    this._bindEvents();
  }

  _updateHighlight() {
    this._clearDecorations();

    const { end } = this._editor.getSelection();
    const text = this._editor.document.getText();
    const charAtCursor = text[end];

    if (BracketMatchFeature.BRACKETS[charAtCursor]) {
      const matchOffset = this._findMatchingBracket(text, end, charAtCursor);

      if (matchOffset !== -1) {
        this._addDecoration(end);
        this._addDecoration(matchOffset);
      }
    }
  }

  _findMatchingBracket(text, offset, bracket) {
    const isOpen = ['(', '[', '{', '<'].includes(bracket);
    const target = BracketMatchFeature.BRACKETS[bracket];
    const direction = isOpen ? 1 : -1;

    let depth = 1;
    let pos = offset + direction;

    while (pos >= 0 && pos < text.length && depth > 0) {
      if (text[pos] === bracket) depth++;
      else if (text[pos] === target) depth--;

      if (depth === 0) return pos;
      pos += direction;
    }

    return -1;
  }
}
```

---

### 3.10 HTML/CSS Grammar

#### 3.10.1 HTML Grammar

```javascript
// tokenizer/grammars/html.js
export const HTMLGrammar = {
  name: 'html',

  voidElements: ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'],

  tokenizer: {
    root: [
      [/<!DOCTYPE\s+html>/i, 'doctype'],
      [/<!--/, 'comment', '@comment'],
      [/<\//, 'tag.open', '@closingTag'],
      [/</, 'tag.open', '@openingTag'],
      [/[^<]+/, 'content'],
    ],

    comment: [
      [/[^-]+/, 'comment'],
      [/-->/, 'comment', '@pop'],
      [/-/, 'comment'],
    ],

    openingTag: [[/[a-zA-Z][\w\-]*/, 'tag.name', '@tagContent']],

    tagContent: [
      [/\/>/, 'tag.close', '@pop'],
      [/>/, 'tag.close', '@pop'],
      [/[a-zA-Z][\w\-]*/, 'attribute.name'],
      [/=/, 'operator'],
      [/"[^"]*"/, 'attribute.value'],
      [/'[^']*'/, 'attribute.value'],
      [/\s+/, 'whitespace'],
    ],
  },
};
```

#### 3.10.2 CSS Grammar

```javascript
// tokenizer/grammars/css.js
export const CSSGrammar = {
  name: 'css',

  tokenizer: {
    root: [
      [/\/\*/, 'comment', '@comment'],
      [/@[\w\-]+/, 'at-rule', '@atRule'],
      [/\.[\w\-]+/, 'selector.class'],
      [/#[\w\-]+/, 'selector.id'],
      [/::?[\w\-]+/, 'selector.pseudo'],
      [/[\w\-]+/, 'selector.tag'],
      [/\{/, 'delimiter.bracket', '@block'],
      [/[>+~]/, 'operator'],
      [/\s+/, 'whitespace'],
    ],

    comment: [
      [/[^*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/\*/, 'comment'],
    ],

    block: [
      [/[\w\-]+(?=\s*:)/, 'property'],
      [/:/, 'operator', '@value'],
      [/\{/, 'delimiter.bracket', '@push'],
      [/\}/, 'delimiter.bracket', '@pop'],
      [/\s+/, 'whitespace'],
    ],

    value: [
      [/#[0-9a-fA-F]{3,8}\b/, 'value.color'],
      [/-?[\d.]+(?:px|em|rem|%|vh|vw)?/, 'value.number'],
      [/"[^"]*"/, 'value.string'],
      [/'[^']*'/, 'value.string'],
      [/var\(/, 'function', '@variable'],
      [/[\w\-]+\(/, 'function', '@function'],
      [/[\w\-]+/, 'value'],
      [/;/, 'delimiter', '@pop'],
      [/\}/, 'delimiter.bracket', '@pop'],
      [/!important/, 'keyword'],
      [/\s+/, 'whitespace'],
      [/,/, 'delimiter'],
    ],
  },
};
```

---

## 4. Implementation Phases

### 4.1 Phase Overview

| Phase       | Features                                   | Difficulty | Est. Duration |
| ----------- | ------------------------------------------ | ---------- | ------------- |
| **Phase 1** | Bracket Match, Auto-Indent, Auto-Close     | ⭐⭐       | 1-2 days      |
| **Phase 2** | HTML/CSS Grammar, Indent Coloring          | ⭐⭐⭐     | 2-3 days      |
| **Phase 3** | Keyword Search, Autocomplete (JS/HTML/CSS) | ⭐⭐⭐     | 3-4 days      |
| **Phase 4** | Multi Cursor                               | ⭐⭐⭐⭐   | 3-4 days      |
| **Phase 5** | File Explorer, Multi Tab                   | ⭐⭐⭐     | 3-4 days      |

### 4.2 Dependency Graph

```
                    ┌─────────────────┐
                    │ HTML/CSS Grammar │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────────┐
        │ Auto-    │  │ Indent   │  │ Autocomplete │
        │ Complete │  │ Coloring │  │   (HTML)     │
        └──────────┘  └──────────┘  └──────────────┘

        ┌──────────┐  ┌──────────┐  ┌──────────────┐
        │ Bracket  │  │  Auto-   │  │   Keyword    │
        │  Match   │  │  Close   │  │   Search     │
        └────┬─────┘  └────┬─────┘  └──────────────┘
             │             │
             └──────┬──────┘
                    │
                    ▼
              ┌──────────┐
              │ Auto-    │
              │ Indent   │
              └──────────┘

        ┌──────────────────────────────────────────┐
        │           Multi Cursor                    │
        │  (Selection model change - wide impact)   │
        └──────────────────────────────────────────┘

        ┌──────────────────────────────────────────┐
        │           IDE Features                    │
        │    (File Explorer + Multi Tab)            │
        │     (Independent, can implement anytime)  │
        └──────────────────────────────────────────┘
```

### 4.3 Phase Details

#### Phase 1: Basic Editing Features (1-2 days)

**Features:**

- Bracket Match Highlight
- Auto-Close (brackets, quotes)
- Auto-Indent

**Why First:**

- Independent features with minimal dependencies
- Immediate improvement to editing experience
- Foundation for later features

#### Phase 2: Grammar & Visual (2-3 days)

**Features:**

- HTML Grammar
- CSS Grammar
- Indent Coloring (Rainbow Indentation)

**Why Second:**

- Extends existing tokenizer system
- Required for HTML/CSS autocomplete
- Visual enhancement

#### Phase 3: Search & Autocomplete (3-4 days)

**Features:**

- Keyword Search (Find & Replace)
- Autocomplete with JS/HTML/CSS built-ins

**Why Third:**

- Search is independent utility
- Autocomplete depends on grammars from Phase 2
- Core productivity features

#### Phase 4: Multi Cursor (3-4 days)

**Features:**

- Multiple cursor support
- Ctrl+Click to add cursor
- Ctrl+D to select next occurrence

**Why Fourth:**

- Requires significant model changes
- Affects many existing features
- Complex implementation

#### Phase 5: IDE Features (3-4 days)

**Features:**

- File Explorer (Sidebar)
- Multi Tab Editor

**Why Last:**

- Independent from editor core
- Can be developed in parallel
- Wraps editor in IDE shell

---

## 5. File Structure

### 5.1 Final Project Structure

```
src/
├── core/
│   ├── Editor.js              # Main editor
│   ├── EditorInstance.js      # Single editor instance (Phase 5)
│   └── IDE.js                 # IDE controller (Phase 5)
│
├── model/
│   ├── Document.js            # Text model
│   ├── Selection.js           # Selection model (Phase 4)
│   ├── SelectionCollection.js # Multi-cursor support (Phase 4)
│   └── FileModel.js           # File model (Phase 5)
│
├── view/
│   ├── EditorView.js          # Editor view
│   ├── decorations/
│   │   ├── DecorationManager.js    # Phase 1
│   │   ├── BracketMatchDecor.js    # Phase 1
│   │   └── IndentGuideDecor.js     # Phase 2
│   └── widgets/
│       ├── AutocompleteWidget.js   # Phase 3
│       └── SearchWidget.js         # Phase 3
│
├── services/
│   ├── CompletionService.js   # Phase 3
│   ├── SearchService.js       # Phase 3
│   └── FileService.js         # Phase 5
│
├── providers/
│   ├── CompletionProvider.js  # Phase 3
│   ├── JSCompletionProvider.js        # Phase 3
│   ├── HTMLCompletionProvider.js      # Phase 3
│   └── CSSCompletionProvider.js       # Phase 3
│
├── features/
│   ├── autoClose/
│   │   └── AutoCloseFeature.js     # Phase 1
│   ├── autoIndent/
│   │   └── AutoIndentFeature.js    # Phase 1
│   ├── bracketMatch/
│   │   └── BracketMatchFeature.js  # Phase 1
│   └── multiCursor/
│       └── MultiCursorFeature.js   # Phase 4
│
├── ide/
│   ├── FileExplorer.js        # Phase 5
│   ├── TabManager.js          # Phase 5
│   └── Sidebar.js             # Phase 5
│
├── tokenizer/
│   ├── Tokenizer.js
│   ├── TokenizerState.js
│   └── grammars/
│       ├── javascript.js
│       ├── html.js            # Phase 2
│       └── css.js             # Phase 2
│
├── data/
│   └── completions/
│       ├── js-builtins.js     # Phase 3
│       ├── html-tags.js       # Phase 3
│       ├── html-attributes.js # Phase 3
│       └── css-properties.js  # Phase 3
│
└── input/
    ├── InputHandler.js
    ├── EditContextHandler.js
    └── TextareaHandler.js
```

---

## Appendix: Quick Reference

### Keyboard Shortcuts (Planned)

| Shortcut           | Action                 |
| ------------------ | ---------------------- |
| `Ctrl+F`           | Find                   |
| `Ctrl+H`           | Replace                |
| `Ctrl+D`           | Select next occurrence |
| `Ctrl+Click`       | Add cursor             |
| `Ctrl+/`           | Toggle comment         |
| `Ctrl+]`           | Indent                 |
| `Ctrl+[`           | Outdent                |
| `Ctrl+Enter`       | Insert line below      |
| `Ctrl+Shift+Enter` | Insert line above      |
| `Ctrl+Shift+K`     | Delete line            |

### CSS Classes for Syntax Highlighting

```css
/* JavaScript */
.ec-token-keyword {
}
.ec-token-string {
}
.ec-token-number {
}
.ec-token-comment {
}
.ec-token-function {
}
.ec-token-class {
}
.ec-token-identifier {
}

/* HTML */
.ec-token-tag-name {
}
.ec-token-attribute-name {
}
.ec-token-attribute-value {
}

/* CSS */
.ec-token-selector {
}
.ec-token-property {
}
.ec-token-value {
}
.ec-token-at-rule {
}
```
