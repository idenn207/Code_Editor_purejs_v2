# EditContext Code Editor

> A modern, lightweight code editor using the EditContext API with automatic textarea fallback

## Tech Stack

- **Language**: JavaScript (ES6+ Modules)
- **Framework**: None (Vanilla JS)
- **Key Libraries**: None (Zero dependencies)
- **Architecture Pattern**: MVC with Event-Driven Communication

## Project Structure

```
src/
├── core/
│   └── Editor.js           # Main editor facade
├── model/
│   └── Document.js         # Text storage and manipulation
├── input/
│   ├── InputHandler.js     # Unified input (auto-selects strategy)
│   ├── EditContextHandler.js   # EditContext API implementation
│   └── TextareaHandler.js      # Fallback for older browsers
├── view/
│   └── EditorView.js       # DOM rendering (lines, cursor, selection)
├── tokenizer/
│   └── Tokenizer.js        # JavaScript syntax highlighting
└── index.js                # Main exports

styles/
└── editor.css              # All styles (dark/light themes)

docs/
├── ARCHITECTURE.md         # System architecture documentation
├── DECISIONS.md            # Architecture Decision Records
└── CHANGELOG.md            # Version history
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
- **Dispose Pattern**: All classes implement `dispose()` for cleanup

### Anti-patterns to Avoid

- **Direct DOM manipulation in Model**: Document should never touch DOM
- **Circular dependencies**: Use events instead of direct references
- **Global state**: All state lives in Editor or its components
- **Synchronous clipboard**: Always use async Clipboard API

## Current Status

### Completed

- [x] Document model with line-based storage
- [x] EditContext API integration
- [x] Textarea fallback for unsupported browsers
- [x] Cursor rendering with blink animation
- [x] Selection rendering
- [x] Basic undo/redo
- [x] JavaScript syntax highlighting
- [x] Keyboard shortcuts (arrows, home/end, word movement)
- [x] Clipboard operations (copy/cut/paste)
- [x] IME composition support
- [x] Dark and light themes
- [x] Line number gutter

### In Progress

- [ ] Virtual scrolling for large files
- [ ] Multi-cursor support

### Planned

- [ ] Incremental tokenization
- [ ] Code folding
- [ ] Find and replace
- [ ] Additional language support (Python, HTML, CSS)
- [ ] Bracket matching
- [ ] Auto-indent
- [ ] Minimap

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
