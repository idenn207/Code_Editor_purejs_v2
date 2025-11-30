# Changelog

All notable changes to this project are documented here.
Format: [YYYY-MM-DD] entries, newest first.

---

## [2024-01-20] - Language Service & Auto-Complete

### Added

- `src/tokenizer/Tokenizer.js`: Enhanced Monarch-style tokenizer

  - Purpose: State machine based tokenization for multi-line constructs
  - Features: State transitions, incremental updates, grammar compilation

- `src/tokenizer/grammars/javascript.js`: JavaScript grammar definition

  - Purpose: Define tokenization rules for JavaScript
  - Features: Keywords, operators, strings, comments, template literals

- `src/language/ASTNodes.js`: AST node type definitions

  - Purpose: Define structure for Abstract Syntax Tree nodes
  - Features: Node types, factory functions, location tracking

- `src/language/Parser.js`: Recursive descent parser

  - Purpose: Generate AST from tokens
  - Features: Statement/expression parsing, error recovery, synchronization

- `src/language/SymbolTable.js`: Symbol and scope management

  - Purpose: Track declared variables, functions, classes with scope hierarchy
  - Features: Scope tree, symbol resolution, type inference, member extraction

- `src/language/LanguageService.js`: Code intelligence coordinator

  - Purpose: Orchestrate parsing, symbol table, and completion providers
  - Features: Debounced analysis, AST caching, completion API

- `src/language/providers/CompletionProvider.js`: Auto-complete logic

  - Purpose: Generate context-aware completion suggestions
  - Features: Member completions, global completions, keyword completions

- `src/features/AutoComplete.js`: Auto-complete UI component
  - Purpose: Display and interact with completion suggestions
  - Features: Keyboard navigation, mouse selection, positioning

### Changed

- `src/core/Editor.js`: Integrated Language Service

  - Before: Only tokenizer for syntax highlighting
  - After: Full Language Service with getCompletions(), getDiagnostics()
  - Reason: Enable code intelligence features

- `src/tokenizer/Tokenizer.js`: Upgraded to Monarch-style
  - Before: Simple regex-based line tokenizer
  - After: State machine with grammar definitions
  - Reason: Support multi-line constructs (comments, strings, templates)

### Architecture Decisions

- **ADR-004**: Monarch-style tokenizer for multi-line support
- **ADR-005**: Separate Tokenizer (sync) and Language Service (async)
- **ADR-006**: Recursive descent parser for AST generation
- **ADR-007**: Symbol table with scope hierarchy
- **ADR-008**: Debounced analysis (150ms) for performance

### Known Issues

- Parser does not yet support all JavaScript syntax (async/await, generators, decorators)
- No cross-file symbol resolution
- Large files (>10K lines) may have completion delay

### Next Steps

- [ ] Add Web Worker for background parsing
- [ ] Implement HoverProvider for symbol information
- [ ] Add DiagnosticProvider for error highlighting
- [ ] Support additional languages

---

## [2024-01-15] - Initial Release v1.0.0

### Added

- `src/core/Editor.js`: Main editor class

  - Purpose: Unified API for all editor operations
  - Features: getValue/setValue, selection management, undo/redo, event system

- `src/model/Document.js`: Text storage model

  - Purpose: Line-based text storage and manipulation
  - Features: replaceRange, offset/position conversion, change events

- `src/input/InputHandler.js`: Unified input handler

  - Purpose: Automatically select best input method based on browser support
  - Features: Auto-detection of EditContext support, fallback selection

- `src/input/EditContextHandler.js`: EditContext API implementation

  - Purpose: Modern text input for Chrome/Edge 121+
  - Features: textupdate, compositionstart/end, characterboundsupdate handling

- `src/input/TextareaHandler.js`: Textarea fallback

  - Purpose: Input handling for browsers without EditContext support
  - Features: Hidden textarea (1×1px), composition events, clipboard

- `src/view/EditorView.js`: DOM rendering engine

  - Purpose: Render document content, cursor, and selection
  - Features: Line rendering, cursor positioning, selection rectangles, gutter

- `src/tokenizer/Tokenizer.js`: Basic syntax highlighting

  - Purpose: Tokenize JavaScript code for highlighting
  - Features: Keywords, strings, numbers, comments, functions, classes

- `styles/editor.css`: Editor styles

  - Purpose: Complete styling for editor components
  - Features: Dark theme (default), light theme, VS Code-like syntax colors

- `index.html`: Demo page
  - Purpose: Demonstrate editor capabilities
  - Features: Live editor, controls, keyboard shortcuts reference

### Architecture Decisions

- **ADR-001**: Use EditContext API with textarea fallback
- **ADR-002**: Strategy pattern for input handlers
- **ADR-003**: Line-based document model (array of strings)

### Known Issues

- Multi-line comment highlighting doesn't persist across lines (fixed in 2024-01-20)
- Very large files (>10K lines) may have performance issues
- No virtual scrolling yet

---

## Version History Summary

| Version | Date       | Highlights                               |
| ------- | ---------- | ---------------------------------------- |
| 1.1.0   | 2024-01-20 | Language Service, Parser, Auto-Complete  |
| 1.0.0   | 2024-01-15 | Initial release with EditContext support |

---

## Migration Notes

### From 1.0.0 to 1.1.0

```javascript
// New API available
const editor = new Editor(container, options);

// Get completions at cursor
const completions = editor.getCompletions();

// Access language service
const ast = editor.languageService.getAST();
const symbols = editor.languageService.getSymbolTable();

// Listen for analysis completion
editor.on('analysisComplete', ({ ast, errors }) => {
  console.log('AST updated', ast);
});
```

### New Events

| Event              | Data                | Description                  |
| ------------------ | ------------------- | ---------------------------- |
| `analysisComplete` | `{ ast, errors[] }` | Fired when parsing completes |
