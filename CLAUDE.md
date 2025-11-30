# EditContext Code Editor

> A modern, lightweight code editor using the EditContext API with automatic textarea fallback and intelligent code completion

## Tech Stack

- **Language**: JavaScript (ES6+ Modules)
- **Framework**: None (Vanilla JS)
- **Key Libraries**: None (Zero dependencies)
- **Architecture Pattern**: MVC with Event-Driven Communication + Language Service

## Project Structure

```
src/
├── core/
│   └── Editor.js              # Main editor facade
├── model/
│   └── Document.js            # Text storage and manipulation
├── input/
│   ├── InputHandler.js        # Unified input (auto-selects strategy)
│   ├── EditContextHandler.js  # EditContext API implementation
│   └── TextareaHandler.js     # Fallback for older browsers
├── view/
│   └── EditorView.js          # DOM rendering (lines, cursor, selection)
├── tokenizer/
│   ├── Tokenizer.js           # Monarch-style tokenizer with state machine
│   ├── TokenizerState.js      # State management for incremental tokenization
│   └── grammars/
│       └── javascript.js      # JavaScript grammar definition
├── language/
│   ├── LanguageService.js     # Main coordinator for code intelligence
│   ├── Lexer.js               # Token classification
│   ├── Parser.js              # Recursive descent parser → AST
│   ├── ASTNodes.js            # AST node type definitions
│   ├── SymbolTable.js         # Variable/function/class tracking
│   ├── ScopeManager.js        # Scope hierarchy management
│   └── providers/
│       ├── CompletionProvider.js   # Auto-complete logic
│       ├── HoverProvider.js        # Hover information
│       └── DiagnosticProvider.js   # Error detection
├── features/
│   ├── AutoComplete.js        # Auto-complete UI component
│   ├── BracketMatcher.js      # Bracket matching (planned)
│   └── CodeFolding.js         # Code folding (planned)
├── utils/
│   ├── DOMUtils.js            # DOM helper functions
│   └── PerformanceUtils.js    # Performance measurement
└── index.js                   # Main exports

styles/
└── editor.css                 # All styles (dark/light themes)

docs/
├── ARCHITECTURE.md            # System architecture documentation
├── CHANGELOG.md               # Version history
├── DECISIONS.md               # Architecture Decision Records
└── Development_Roadmap.md     # Development phases and tasks
```

## Coding Conventions

### Naming

- Files: `PascalCase.js` for classes
- Classes: `PascalCase` (e.g., `EditContextHandler`)
- Methods/Variables: `camelCase` (e.g., `getSelection`)
- Private members: `_` prefix (e.g., `_document`, `_handleInput`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_OPTIONS`)
- Events: `camelCase` (e.g., `selectionChange`, `compositionStart`)

### Patterns to Follow

- **Event Emitter**: All major classes emit events for state changes
- **Strategy Pattern**: InputHandler selects between EditContext and Textarea
- **Facade Pattern**: Editor class provides unified API
- **Visitor Pattern**: AST traversal for symbol collection
- **Dispose Pattern**: All classes implement `dispose()` for cleanup

### Anti-patterns to Avoid

- **Direct DOM manipulation in Model**: Document should never touch DOM
- **Circular dependencies**: Use events instead of direct references
- **Global state**: All state lives in Editor or its components
- **Synchronous heavy parsing**: Use debouncing for Parser/LanguageService
- **Blocking main thread**: Consider Web Workers for large files

## Current Status

### Completed (Phase 1-2)

- [x] Document model with line-based storage
- [x] EditContext API integration
- [x] Textarea fallback for unsupported browsers
- [x] Cursor rendering with blink animation
- [x] Selection rendering
- [x] Basic undo/redo
- [x] Keyboard shortcuts (arrows, home/end, word movement)
- [x] Clipboard operations (copy/cut/paste)
- [x] IME composition support

### In Progress (Phase 4-5)

- [x] Monarch-style tokenizer with state machine
- [x] JavaScript grammar definition
- [x] Incremental tokenization
- [ ] Parser → AST generation
- [ ] Symbol table with scope management
- [ ] Auto-complete provider
- [ ] Auto-complete UI component

### Planned (Phase 5-6)

- [ ] Multi-cursor support
- [ ] Find & Replace
- [ ] Code folding
- [ ] Bracket matching
- [ ] Auto-indent
- [ ] Additional language support (Python, HTML, CSS)
- [ ] Web Worker for background parsing
- [ ] Virtual scrolling for large files

## Quick Commands

```bash
# Development (requires local server for ES modules)
python -m http.server 8080
# or
npx serve .

# Open in browser
open http://localhost:8080

# No build step required - pure ES modules
```

## Usage

```javascript
import { Editor } from './src/index.js';

const editor = new Editor(document.getElementById('container'), {
  value: 'const x = 1;',
  language: 'javascript',
  fontSize: 14,
  lineHeight: 22,
});

// Listen to changes
editor.on('change', (change) => {
  console.log('Document changed:', change);
});

// Get auto-complete suggestions
const completions = editor.getCompletions();

// Get/set value
const code = editor.getValue();
editor.setValue('new code');

// Focus
editor.focus();
```

## Browser Support

| Browser     | EditContext | Fallback    |
| ----------- | ----------- | ----------- |
| Chrome 121+ | ✅          | -           |
| Edge 121+   | ✅          | -           |
| Firefox     | -           | ✅ Textarea |
| Safari      | -           | ✅ Textarea |
| Chrome <121 | -           | ✅ Textarea |

## Related Documentation

- Architecture: `docs/ARCHITECTURE.md`
- Changelog: `docs/CHANGELOG.md`
- Decisions: `docs/DECISIONS.md`
- Roadmap: `docs/Development_Roadmap.md`
