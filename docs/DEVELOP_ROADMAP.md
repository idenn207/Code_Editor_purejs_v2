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
      // ...etc.
    ],
    methods: [
      { name: 'alert', signature: '(message?: any): void', doc: 'Displays an alert dialog' },
      { name: 'confirm', signature: '(message?: string): boolean', doc: 'Displays a confirm dialog' },
      { name: 'prompt', signature: '(message?: string, default?: string): string | null', doc: 'Displays a prompt dialog' },
      // ...etc.
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
      // ...etc.
    ],
    methods: [
      { name: 'getElementById', signature: '(id: string): HTMLElement | null', doc: 'Gets element by ID' },
      { name: 'getElementsByClassName', signature: '(names: string): HTMLCollection', doc: 'Gets elements by class name' },
      { name: 'getElementsByTagName', signature: '(name: string): HTMLCollection', doc: 'Gets elements by tag name' },
      { name: 'querySelector', signature: '(selectors: string): Element | null', doc: 'Queries single element' },
      { name: 'querySelectorAll', signature: '(selectors: string): NodeList', doc: 'Queries all matching elements' },
      { name: 'createElement', signature: '(tagName: string): HTMLElement', doc: 'Creates an element' },
      // ...etc.
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
      // ...etc.
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
      // ...etc.
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
      // ...etc.
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
      // ...etc.
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
      // ...etc.
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
      // ...etc.
    ],
    methods: [
      { name: 'getAttribute', signature: '(name: string): string | null', doc: 'Gets attribute value' },
      { name: 'setAttribute', signature: '(name: string, value: string): void', doc: 'Sets attribute value' },
      { name: 'removeAttribute', signature: '(name: string): void', doc: 'Removes attribute' },
      { name: 'hasAttribute', signature: '(name: string): boolean', doc: 'Checks for attribute' },
      // ...etc.
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
  // ...etc.
];

// data/completions/html-attributes.js
export const HTML_ATTRIBUTES = {
  // Global attributes (apply to all elements)
  global: [
    { name: 'id', doc: 'Unique identifier' },
    { name: 'class', doc: 'CSS class names' },
    { name: 'style', doc: 'Inline CSS styles' },
    // ...etc.
  ],

  // Event attributes (global)
  events: [
    { name: 'onclick', doc: 'Click event handler' },
    { name: 'ondblclick', doc: 'Double click event handler' },
    { name: 'onmousedown', doc: 'Mouse down event handler' },
    // ...etc.
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
    // ...etc.
  ],
  // ...etc.
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
  // ...etc
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
  // ...etc.
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
  // ...etc.
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
