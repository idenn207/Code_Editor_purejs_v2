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
│  │                             │    │                             │        │
│  │  • textupdate event         │    │  • Hidden textarea (1×1px)  │        │
│  │  • compositionstart/end     │    │  • input event              │        │
│  │  • characterboundsupdate    │    │  • compositionstart/end     │        │
│  │  • No DOM manipulation      │    │  • Sync with model          │        │
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
│  │                 │  │                 │  │  • undoStack[]  │             │
│  │  • lines[]      │  │  • start        │  │  • redoStack[]  │             │
│  │  • version      │  │  • end          │  │  • Transaction  │             │
│  │  • getText()    │  │                 │  │                 │             │
│  │  • replaceRange │  │                 │  │                 │             │
│  └────────┬────────┘  └────────┬────────┘  └─────────────────┘             │
│           │                    │                                            │
│           │ 'change' event     │ 'selectionChange' event                   │
└───────────┼────────────────────┼────────────────────────────────────────────┘
            │                    │
            ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EditorView                                      │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Gutter    │  │    Lines    │  │   Cursor    │  │  Selection  │        │
│  │  (numbers)  │  │  (content)  │  │  (blink)    │  │  (highlight)│        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │                │                │                │                │
│         └────────────────┴────────────────┴────────────────┘                │
│                                    │                                        │
│                          DOM Rendering                                      │
└─────────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Tokenizer                                       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  JavaScript Grammar                                              │       │
│  │  • Keywords: const, let, function, class, return, ...           │       │
│  │  • Strings: "...", '...', `...`                                 │       │
│  │  • Numbers: 123, 0xFF, 1.5e10                                   │       │
│  │  • Comments: //, /* */                                          │       │
│  │  • Operators: +, -, *, /, =, ==, ===, ...                       │       │
│  └─────────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Modules

### Document (model/Document.js)

- **Location**: `src/model/Document.js`
- **Purpose**: Stores and manipulates text content as an array of lines
- **Dependencies**: None (standalone)
- **Dependents**: Editor, InputHandlers, EditorView

#### Key Methods

| Method               | Purpose                       | Parameters                                                | Returns          |
| -------------------- | ----------------------------- | --------------------------------------------------------- | ---------------- |
| `getText()`          | Get full document text        | None                                                      | `string`         |
| `replaceRange()`     | Replace text in range         | `startOffset: number, endOffset: number, newText: string` | `Change` object  |
| `offsetToPosition()` | Convert offset to line/column | `offset: number`                                          | `{line, column}` |
| `positionToOffset()` | Convert line/column to offset | `line: number, column: number`                            | `number`         |
| `getLine()`          | Get specific line content     | `lineIndex: number`                                       | `string`         |

#### Usage Example

```javascript
const doc = new Document('Hello\nWorld');
doc.replaceRange(5, 5, ' Beautiful'); // Insert at position 5
console.log(doc.getText()); // "Hello Beautiful\nWorld"

const pos = doc.offsetToPosition(7); // {line: 0, column: 7}
```

---

### EditContextHandler (input/EditContextHandler.js)

- **Location**: `src/input/EditContextHandler.js`
- **Purpose**: Handles text input via EditContext API (Chrome 121+)
- **Dependencies**: Editor, Document
- **Dependents**: InputHandler

#### Key Methods

| Method                           | Purpose                        | Parameters                          | Returns   |
| -------------------------------- | ------------------------------ | ----------------------------------- | --------- |
| `_handleTextUpdate()`            | Process text input from OS     | `event: TextUpdateEvent`            | `void`    |
| `_handleCharacterBoundsUpdate()` | Provide char positions for IME | `event: CharacterBoundsUpdateEvent` | `void`    |
| `_syncEditContextText()`         | Sync document to EditContext   | None                                | `void`    |
| `focus()`                        | Focus the editor               | None                                | `void`    |
| `isComposing()`                  | Check if IME is active         | None                                | `boolean` |

#### Usage Example

```javascript
// Automatically selected by InputHandler when supported
const handler = new EditContextHandler(element, editor);

// EditContext events are handled internally
// textupdate → document.replaceRange()
// characterboundsupdate → view.getCharacterRect()
```

---

### TextareaHandler (input/TextareaHandler.js)

- **Location**: `src/input/TextareaHandler.js`
- **Purpose**: Fallback input handler using hidden textarea
- **Dependencies**: Editor, Document
- **Dependents**: InputHandler

#### Key Methods

| Method                    | Purpose                       | Parameters                | Returns |
| ------------------------- | ----------------------------- | ------------------------- | ------- |
| `_handleInput()`          | Process textarea input event  | `event: InputEvent`       | `void`  |
| `_handleCompositionEnd()` | Handle IME composition finish | `event: CompositionEvent` | `void`  |
| `updatePosition()`        | Move textarea near cursor     | `cursorRect: DOMRect`     | `void`  |
| `focus()`                 | Focus the hidden textarea     | None                      | `void`  |

---

### EditorView (view/EditorView.js)

- **Location**: `src/view/EditorView.js`
- **Purpose**: Renders document content, cursor, and selection to DOM
- **Dependencies**: Editor, Document, Tokenizer
- **Dependents**: Editor

#### Key Methods

| Method                   | Purpose                                   | Parameters         | Returns          |
| ------------------------ | ----------------------------------------- | ------------------ | ---------------- |
| `_renderLines()`         | Render all lines with syntax highlighting | None               | `void`           |
| `_renderCursor()`        | Position and render cursor                | None               | `void`           |
| `_renderSelection()`     | Render selection rectangles               | None               | `void`           |
| `getPositionFromPoint()` | Convert screen coords to position         | `clientX, clientY` | `{line, column}` |
| `getCharacterRect()`     | Get bounding rect for character           | `offset: number`   | `DOMRect`        |

---

### Tokenizer (tokenizer/Tokenizer.js)

- **Location**: `src/tokenizer/Tokenizer.js`
- **Purpose**: Tokenizes code for syntax highlighting
- **Dependencies**: None
- **Dependents**: EditorView

#### Token Types

| Type       | Example             | Color (Dark Theme) |
| ---------- | ------------------- | ------------------ |
| `keyword`  | `const`, `function` | `#569cd6`          |
| `string`   | `"hello"`           | `#ce9178`          |
| `number`   | `42`, `3.14`        | `#b5cea8`          |
| `comment`  | `// note`           | `#6a9955`          |
| `function` | `myFunc(`           | `#dcdcaa`          |
| `class`    | `MyClass`           | `#4ec9b0`          |

---

## Data Flow

### 1. User Types Character

```
User presses 'a'
      │
      ▼
┌─────────────────────────────────┐
│ EditContext receives textupdate │
│ OR                              │
│ Textarea receives input event   │
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
                 ▼
┌─────────────────────────────────┐
│ Document emits 'change' event   │
│ • Undo stack updated            │
│ • Selection updated             │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ EditorView._render()            │
│ • Re-tokenize changed lines     │
│ • Update DOM                    │
│ • Reposition cursor             │
└─────────────────────────────────┘
```

### 2. IME Composition (Korean/Japanese/Chinese)

```
User starts IME input
      │
      ▼
┌─────────────────────────────────┐
│ compositionstart event          │
│ • isComposing = true            │
│ • Block immediate updates       │
└────────────────┬────────────────┘
                 │
      (User types phonetic input)
                 │
                 ▼
┌─────────────────────────────────┐
│ textformatupdate event          │
│ • Get composition ranges        │
│ • Render underline decorations  │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ characterboundsupdate event     │
│ • Calculate char positions      │
│ • Report to OS for IME window   │
└────────────────┬────────────────┘
                 │
      (User selects final character)
                 │
                 ▼
┌─────────────────────────────────┐
│ compositionend event            │
│ • isComposing = false           │
│ • Commit final text to document │
│ • Clear composition decorations │
└─────────────────────────────────┘
```

---

## State Management

### Editor State Structure

```javascript
{
  // Document state
  document: {
    _lines: ['line 1', 'line 2', ...],
    _version: 42
  },

  // Selection state
  _selection: {
    start: 15,    // Character offset
    end: 15       // Same as start = cursor, different = selection
  },

  // History state
  _undoStack: [
    {
      type: 'replace',
      startOffset: 10,
      deletedText: '',
      insertedText: 'hello',
      selectionBefore: { start: 10, end: 10 }
    },
    // ...more transactions
  ],
  _redoStack: []
}
```

### State Transitions

| Action           | Before                         | After                                       |
| ---------------- | ------------------------------ | ------------------------------------------- |
| Type 'a'         | `selection: {start:5, end:5}`  | `selection: {start:6, end:6}`, doc modified |
| Select text      | `selection: {start:5, end:5}`  | `selection: {start:5, end:10}`              |
| Delete selection | `selection: {start:5, end:10}` | `selection: {start:5, end:5}`, doc modified |
| Undo             | Current state                  | Previous state from undoStack               |
| Redo             | Current state                  | Next state from redoStack                   |

---

## Extension Points

### Adding New Language Support

1. Create grammar file at `src/tokenizer/grammars/[language].js`
2. Define token patterns:

```javascript
// src/tokenizer/grammars/python.js
export const PYTHON_KEYWORDS = new Set([
  'def', 'class', 'if', 'else', 'elif', 'for', 'while',
  'return', 'import', 'from', 'as', 'try', 'except', ...
]);

export function tokenizePython(line) {
  // Return array of tokens
}
```

3. Register in Tokenizer:

```javascript
// In Tokenizer constructor
if (language === 'python') {
  this._tokenize = tokenizePython;
}
```

### Adding New Input Handler

1. Create handler at `src/input/[Name]Handler.js`
2. Implement required interface:

```javascript
class CustomHandler {
  constructor(element, editor) {}

  focus() {}
  isFocused() {
    return boolean;
  }
  isComposing() {
    return boolean;
  }
  getCompositionRanges() {
    return [];
  }
  dispose() {}
}
```

3. Add detection logic in `InputHandler.js`

---

## Performance Considerations

### Virtual Rendering (Future Enhancement)

Currently renders all lines. For large files:

- Implement viewport-based rendering
- Only render visible lines + buffer
- Recycle DOM nodes

### Tokenization Optimization

- **Current**: Full line re-tokenization on change
- **Improvement**: Incremental tokenization
  - Track dirty lines
  - Only re-tokenize affected lines
  - Cache token results

### Event Throttling

```javascript
// Already implemented for scroll/resize
this._handleScroll = throttle(this._onScroll.bind(this), 16);
this._handleResize = debounce(this._onResize.bind(this), 100);
```

### Memory Management

- Document stores lines as array (not single string)
- Undo stack has implicit limit (could add explicit max)
- Disposed handlers clean up event listeners

---

## Browser Compatibility

| Feature           | Chrome | Edge | Firefox | Safari |
| ----------------- | ------ | ---- | ------- | ------ |
| EditContext API   | 121+   | 121+ | ❌      | ❌     |
| Textarea Fallback | ✅     | ✅   | ✅      | ✅     |
| Clipboard API     | ✅     | ✅   | ✅      | ✅     |
| IME Support       | ✅     | ✅   | ✅      | ✅     |

The editor automatically detects EditContext support and falls back to hidden textarea for unsupported browsers.
