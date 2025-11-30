# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Operating System                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Keyboard   │  │     IME      │  │    Emoji     │  │  Clipboard   │    │
│  │    Input     │  │   (CJK)      │  │   Picker     │  │   Manager    │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         └─────────────────┴─────────────────┴─────────────────┘            │
│                                     │                                       │
│                          Text Input Service                                 │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
══════════════════════════════════════╪════════════════════════════════════════
                                      │  Browser
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            InputHandler                                      │
│  ┌─────────────────────────────┐    ┌─────────────────────────────┐        │
│  │    EditContextHandler       │ OR │     TextareaHandler         │        │
│  │    (Chrome/Edge 121+)       │    │     (All Browsers)          │        │
│  └──────────────┬──────────────┘    └──────────────┬──────────────┘        │
└─────────────────┼───────────────────────────────────┼───────────────────────┘
                  └─────────────────┬─────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               Editor (Core)                                  │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │    Document     │  │    Selection    │  │   Undo Stack    │             │
│  │     Model       │  │     State       │  │                 │             │
│  │  • lines[]      │  │  • start        │  │  • undoStack[]  │             │
│  │  • version      │  │  • end          │  │  • redoStack[]  │             │
│  └────────┬────────┘  └────────┬────────┘  └─────────────────┘             │
│           │                    │                                            │
│           │ 'change' event     │ 'selectionChange' event                   │
└───────────┼────────────────────┼────────────────────────────────────────────┘
            │                    │
            ▼                    ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                         Processing Layer                                       │
│                                                                               │
│  ┌─────────────────────────────┐    ┌─────────────────────────────────────┐  │
│  │        Tokenizer            │    │        Language Service             │  │
│  │   (Syntax Highlighting)     │    │     (Code Intelligence)             │  │
│  │                             │    │                                     │  │
│  │  • Monarch-style grammar    │    │  ┌───────────────────────────────┐  │  │
│  │  • State machine            │    │  │     Parser (AST Generator)   │  │  │
│  │  • Incremental updates      │    │  │     • Recursive descent      │  │  │
│  │  • Sync per keystroke       │    │  │     • Error recovery         │  │  │
│  │                             │    │  └─────────────┬─────────────────┘  │  │
│  │  Grammar:                   │    │                │                    │  │
│  │  • root state               │    │  ┌─────────────▼─────────────────┐  │  │
│  │  • comment state            │    │  │       Symbol Table            │  │  │
│  │  • string states            │    │  │     • Scope hierarchy         │  │  │
│  │  • template state           │    │  │     • Type inference          │  │  │
│  │                             │    │  │     • Member tracking         │  │  │
│  └─────────────────────────────┘    │  └─────────────┬─────────────────┘  │  │
│               │                     │                │                    │  │
│               │                     │  ┌─────────────▼─────────────────┐  │  │
│               │                     │  │    Completion Provider        │  │  │
│               │                     │  │     • Member completions      │  │  │
│               │                     │  │     • Global completions      │  │  │
│               │                     │  │     • Keyword completions     │  │  │
│               │                     │  └───────────────────────────────┘  │  │
│               │                     │                                     │  │
│               │                     │  • Async/Debounced (150ms)          │  │
│               │                     │  • Future: Web Worker               │  │
│               │                     └─────────────────────────────────────┘  │
└───────────────┼───────────────────────────────────────┼───────────────────────┘
                │                                       │
                └───────────────────┬───────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EditorView                                      │
│                                                                              │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────┐ │
│  │  Gutter   │ │   Lines   │ │  Cursor   │ │ Selection │ │ AutoComplete  │ │
│  │ (numbers) │ │ (content) │ │  (blink)  │ │(highlight)│ │   (popup)     │ │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────────┘ │
│        │              │              │              │              │        │
│        └──────────────┴──────────────┴──────────────┴──────────────┘        │
│                                    │                                        │
│                          DOM Rendering                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Modules

### Document (model/Document.js)

- **Location**: `src/model/Document.js`
- **Purpose**: Stores and manipulates text content as an array of lines
- **Dependencies**: None (standalone)
- **Dependents**: Editor, InputHandlers, EditorView, LanguageService

#### Key Methods

| Method               | Purpose                       | Parameters                                                | Returns          |
| -------------------- | ----------------------------- | --------------------------------------------------------- | ---------------- |
| `getText()`          | Get full document text        | None                                                      | `string`         |
| `replaceRange()`     | Replace text in range         | `startOffset: number, endOffset: number, newText: string` | `Change` object  |
| `offsetToPosition()` | Convert offset to line/column | `offset: number`                                          | `{line, column}` |
| `positionToOffset()` | Convert line/column to offset | `line: number, column: number`                            | `number`         |
| `getLine()`          | Get specific line content     | `lineIndex: number`                                       | `string`         |

---

### Tokenizer (tokenizer/Tokenizer.js)

- **Location**: `src/tokenizer/Tokenizer.js`
- **Purpose**: Monarch-style tokenizer with state machine for syntax highlighting
- **Dependencies**: Grammar definitions
- **Dependents**: EditorView, LanguageService

#### Key Methods

| Method             | Purpose                         | Parameters                   | Returns                |
| ------------------ | ------------------------------- | ---------------------------- | ---------------------- |
| `tokenizeLine()`   | Tokenize single line with state | `line: string, state: State` | `{tokens[], endState}` |
| `invalidateFrom()` | Clear cache from line index     | `lineIndex: number`          | `void`                 |

#### State Machine States

| State                 | Purpose                    | Transitions                 |
| --------------------- | -------------------------- | --------------------------- |
| `root`                | Default state              | → comment, string, template |
| `comment`             | Multi-line comment /\* \*/ | → root (@pop)               |
| `string_double`       | Double-quoted string       | → root (@pop)               |
| `string_single`       | Single-quoted string       | → root (@pop)               |
| `string_template`     | Template literal ``        | → template_expression, root |
| `template_expression` | ${...} inside template     | → string_template (@pop)    |

---

### Parser (language/Parser.js)

- **Location**: `src/language/Parser.js`
- **Purpose**: Recursive descent parser generating AST from tokens
- **Dependencies**: Tokenizer, ASTNodes
- **Dependents**: LanguageService, SymbolTable

#### Key Methods

| Method               | Purpose                | Parameters        | Returns           |
| -------------------- | ---------------------- | ----------------- | ----------------- |
| `parse()`            | Parse tokens into AST  | `tokens: Token[]` | `{ast, errors[]}` |
| `_parseStatement()`  | Parse single statement | None              | `ASTNode`         |
| `_parseExpression()` | Parse expression       | None              | `ASTNode`         |

#### Supported AST Nodes

| Node Type             | Description              | Key Properties               |
| --------------------- | ------------------------ | ---------------------------- |
| `Program`             | Root node                | `body: Statement[]`          |
| `VariableDeclaration` | const/let/var            | `kind, declarations[]`       |
| `FunctionDeclaration` | function declaration     | `id, params[], body`         |
| `ClassDeclaration`    | class declaration        | `id, superClass, body`       |
| `ObjectExpression`    | Object literal {}        | `properties[]`               |
| `MemberExpression`    | Property access obj.prop | `object, property, computed` |
| `CallExpression`      | Function call fn()       | `callee, arguments[]`        |

---

### SymbolTable (language/SymbolTable.js)

- **Location**: `src/language/SymbolTable.js`
- **Purpose**: Tracks declared symbols with scope hierarchy
- **Dependencies**: ASTNodes
- **Dependents**: CompletionProvider

#### Key Methods

| Method           | Purpose                        | Parameters               | Returns        |
| ---------------- | ------------------------------ | ------------------------ | -------------- |
| `enterScope()`   | Create and enter new scope     | `type: string`           | `Scope`        |
| `exitScope()`    | Return to parent scope         | None                     | `void`         |
| `define()`       | Define symbol in current scope | `name, kind, type, node` | `Symbol`       |
| `resolve()`      | Find symbol in scope chain     | `name: string`           | `Symbol\|null` |
| `buildFromAST()` | Build table from AST           | `ast: ASTNode`           | `this`         |

#### Symbol Kinds

| Kind        | Description          | Example              |
| ----------- | -------------------- | -------------------- |
| `variable`  | Variable declaration | `const x = 1`        |
| `function`  | Function declaration | `function foo() {}`  |
| `class`     | Class declaration    | `class MyClass {}`   |
| `parameter` | Function parameter   | `function(param) {}` |
| `property`  | Object property      | `{ prop: value }`    |
| `method`    | Object/class method  | `{ fn() {} }`        |

---

### LanguageService (language/LanguageService.js)

- **Location**: `src/language/LanguageService.js`
- **Purpose**: Coordinates parsing, symbol table, and completion providers
- **Dependencies**: Document, Tokenizer, Parser, SymbolTable, Providers
- **Dependents**: Editor

#### Key Methods

| Method             | Purpose                   | Parameters       | Returns        |
| ------------------ | ------------------------- | ---------------- | -------------- |
| `getCompletions()` | Get completions at offset | `offset: number` | `Completion[]` |
| `getDiagnostics()` | Get parse errors/warnings | None             | `Diagnostic[]` |
| `getSymbolAt()`    | Get symbol at offset      | `offset: number` | `Symbol\|null` |
| `getAST()`         | Get current AST           | None             | `ASTNode`      |

---

### CompletionProvider (language/providers/CompletionProvider.js)

- **Location**: `src/language/providers/CompletionProvider.js`
- **Purpose**: Generates auto-complete suggestions based on context
- **Dependencies**: SymbolTable
- **Dependents**: LanguageService

#### Completion Context Types

| Context Type | Trigger          | Example           | Completions                    |
| ------------ | ---------------- | ----------------- | ------------------------------ |
| `member`     | `.` after object | `user.`           | Object properties/methods      |
| `global`     | Any identifier   | `con`             | Variables, functions, keywords |
| `import`     | In import string | `import x from '` | Module paths                   |

#### Completion Item Structure

```javascript
{
  label: string,        // Display text
  kind: string,         // 'function' | 'variable' | 'keyword' | ...
  detail: string,       // Additional info (type)
  insertText: string,   // Text to insert
  sortText: string      // Sort order
}
```

---

## Data Flow

### 1. User Types Character

```
User presses 'a'
      │
      ▼
┌─────────────────────────────────┐
│ EditContext receives textupdate │
│ OR Textarea receives input      │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ document.replaceRange(          │
│   selectionStart,               │
│   selectionEnd,                 │
│   'a'                           │
│ )                               │
└────────────────┬────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌─────────────┐      ┌─────────────────────┐
│  Tokenizer  │      │  Language Service   │
│ (immediate) │      │ (debounced 150ms)   │
└──────┬──────┘      └──────────┬──────────┘
       │                        │
       ▼                        ▼
┌─────────────┐      ┌─────────────────────┐
│   Tokens    │      │   AST + Symbols     │
└──────┬──────┘      └──────────┬──────────┘
       │                        │
       └────────────┬───────────┘
                    │
                    ▼
           ┌─────────────────┐
           │   EditorView    │
           │   _render()     │
           └─────────────────┘
```

### 2. Auto-Complete Flow

```
User types "user."
      │
      ▼
┌─────────────────────────────────┐
│ AutoComplete._scheduleUpdate()  │
│ (debounced 100ms)               │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ editor.getCompletions()         │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ CompletionProvider              │
│   ._getCompletionContext()      │
│   → { type: 'member',           │
│       objectName: 'user',       │
│       prefix: '' }              │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ symbolTable.resolve('user')     │
│   → Symbol { members: [...] }   │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ Return completions:             │
│ [ { label: 'name', ... },       │
│   { label: 'age', ... },        │
│   { label: 'getInfo', ... } ]   │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ AutoComplete._render()          │
│ AutoComplete.show()             │
└─────────────────────────────────┘
```

---

## State Management

### Editor State Structure

```javascript
{
  // Document state
  _document: {
    _lines: ['line 1', 'line 2', ...],
    _version: 42
  },

  // Selection state
  _selection: {
    start: 15,
    end: 15
  },

  // History state
  _undoStack: [...],
  _redoStack: [],

  // Language Service state
  _languageService: {
    _ast: { type: 'Program', body: [...] },
    _symbolTable: {
      globalScope: { symbols: Map, children: [...] },
      currentScope: Scope
    }
  }
}
```

---

## Extension Points

### Adding New Language Support

1. Create grammar file at `src/tokenizer/grammars/[language].js`:

```javascript
export const PythonGrammar = {
  name: 'python',
  keywords: ['def', 'class', 'if', 'else', ...],
  tokenizer: {
    root: [...],
    // states
  }
};
```

2. Register in Tokenizer constructor
3. Create parser rules if AST support needed
4. Add completion provider customizations

### Adding New Completion Provider

1. Create provider at `src/language/providers/[Name]Provider.js`
2. Implement `provideCompletions(document, offset)` method
3. Register in LanguageService

---

## Performance Considerations

### Tokenization

- **Incremental**: Only re-tokenize changed lines + affected following lines
- **State Caching**: Cache end state per line for quick re-tokenization
- **Sync**: Runs synchronously for immediate highlighting

### Parsing

- **Debounced**: 150ms delay after last keystroke
- **Error Recovery**: Parser continues after errors
- **Future**: Web Worker for large files

### Completion

- **On-Demand**: Only computed when autocomplete triggered
- **Cached Symbols**: Symbol table persists between parses
- **Filtered**: Early filtering by prefix

---

## Browser Compatibility

| Feature           | Chrome | Edge | Firefox | Safari |
| ----------------- | ------ | ---- | ------- | ------ |
| EditContext API   | 121+   | 121+ | ❌      | ❌     |
| Textarea Fallback | ✅     | ✅   | ✅      | ✅     |
| Clipboard API     | ✅     | ✅   | ✅      | ✅     |
| IME Support       | ✅     | ✅   | ✅      | ✅     |
