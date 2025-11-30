# Changelog

All notable changes to this project are documented here.
Format: [YYYY-MM-DD] entries, newest first.

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

- `src/tokenizer/Tokenizer.js`: Syntax highlighting

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
- **ADR-004**: Simple regex-based tokenizer
- **ADR-005**: Event-based component communication
- **ADR-006**: CSS variables for theming
- **ADR-007**: Zero external dependencies

### Known Issues

- Multi-line comment highlighting doesn't persist across lines
- Very large files (>10K lines) may have performance issues
- No virtual scrolling yet (all lines rendered)

### Next Steps

- [ ] Implement virtual scrolling for large files
- [ ] Add incremental tokenization
- [ ] Support additional languages
- [ ] Add find/replace functionality
- [ ] Implement code folding

---

## Version History Summary

| Version | Date       | Highlights                               |
| ------- | ---------- | ---------------------------------------- |
| 1.0.0   | 2024-01-15 | Initial release with EditContext support |

---

## Migration Notes

### From Other Editors

If migrating from Monaco, CodeMirror, or Ace:

```javascript
// Monaco
// Before:
monaco.editor.create(container, { value: 'code' });

// After:
new Editor(container, { value: 'code' });
```

```javascript
// CodeMirror 6
// Before:
new EditorView({ doc: 'code', parent: container });

// After:
new Editor(container, { value: 'code' });
```

### API Compatibility

| Feature       | Monaco               | CodeMirror 6           | This Editor      |
| ------------- | -------------------- | ---------------------- | ---------------- |
| Get value     | `getValue()`         | `state.doc.toString()` | `getValue()`     |
| Set value     | `setValue()`         | via transaction        | `setValue()`     |
| Get selection | `getSelection()`     | `state.selection`      | `getSelection()` |
| Focus         | `focus()`            | `focus()`              | `focus()`        |
| Events        | `onDidChangeContent` | `updateListener`       | `on('change')`   |
