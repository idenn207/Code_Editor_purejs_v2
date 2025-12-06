# Changelog

All notable changes to this project are documented here.
Format: [YYYY-MM-DD] entries, newest first.

---

## [2025-05-30] - Cursor & Rendering Bug Fixes

### Fixed

- `src/view/EditorView.js`: Cursor position misalignment with line position

  - Cause: Duplicate padding calculation in `_renderCursor()` method
  - Solution: Removed redundant padding addition; cursor now positions relative to lines container

- `src/view/EditorView.js`: Two cursors appearing on screen

  - Cause: Cursor element retained residual styles and blink animation continued when unfocused
  - Solution: Added explicit opacity management (0 when unfocused, 1 when focused) in focus/blur handlers

- `styles/editor.css`: Characters outside initial textarea area not rendered

  - Cause: `.ec-content` had `overflow: hidden` which clipped content
  - Solution: Changed overflow to `visible`, added `min-height: 100%` to `.ec-lines`

- `src/view/EditorView.js`: Cursor position shifts after scrolling
  - Cause: Double-counting scroll offset in `getPositionFromPoint()` and `getCharacterRect()`
  - Solution: Removed manual `scrollTop` adjustments since `getBoundingClientRect()` already reflects scroll state

### Changed

- `styles/editor.css`: Improved cursor visibility rules

  - Before: Cursor blink animation applied regardless of focus state
  - After: Animation only applies to `.ec-focused .ec-cursor.ec-cursor-blink`
  - Reason: Prevent ghost cursor artifacts when editor loses focus

- `styles/editor.css`: Updated autocomplete item selected class
  - Before: `.ec-autocomplete-item.selected`
  - After: `.ec-autocomplete-item.ec-autocomplete-item-selected`
  - Reason: Consistent BEM-style naming convention

### Technical Notes

#### Scroll Position Calculation

```javascript
// WRONG - double-counts scroll:
y = clientY - contentRect.top + scrollTop;

// CORRECT - getBoundingClientRect() already reflects scroll:
y = clientY - contentRect.top;
```

#### Cursor Visibility Pattern

```css
.ec-cursor {
  opacity: 0;
} /* Hidden by default */
.ec-focused .ec-cursor {
  opacity: 1;
} /* Visible when focused */
.ec-focused .ec-cursor.ec-cursor-blink {
  ...;
} /* Blink only when focused */
```

### Files Modified

| File                     | Changes                                                                 |
| ------------------------ | ----------------------------------------------------------------------- |
| `src/view/EditorView.js` | Fixed `_renderCursor()`, `getPositionFromPoint()`, `getCharacterRect()` |
| `styles/editor.css`      | Fixed overflow, cursor visibility, class naming                         |

### Next Steps

- [ ] Test cursor behavior with virtual scrolling
- [ ] Verify IME composition positioning after scroll
- [ ] Add unit tests for position calculation methods

---

## [2024-01-20] - Language Service & Auto-Complete

### Added

- `src/tokenizer/Tokenizer.js`: Enhanced Monarch-style tokenizer
- `src/tokenizer/grammars/javascript.js`: JavaScript grammar definition
- `src/language/ASTNodes.js`: AST node type definitions
- `src/language/Parser.js`: Recursive descent parser
- `src/language/SymbolTable.js`: Symbol and scope management
- `src/language/LanguageService.js`: Code intelligence coordinator
- `src/language/providers/CompletionProvider.js`: Auto-complete logic
- `src/features/AutoComplete.js`: Auto-complete UI component

### Changed

- `src/core/Editor.js`: Integrated Language Service with getCompletions(), getDiagnostics()

---

## [2024-01-15] - Initial Release v1.0.0

### Added

- `src/core/Editor.js`: Main editor class
- `src/model/Document.js`: Text storage model
- `src/input/InputHandler.js`: Unified input handler
- `src/input/EditContextHandler.js`: EditContext API implementation
- `src/input/TextareaHandler.js`: Textarea fallback
- `src/view/EditorView.js`: DOM rendering engine
- `src/tokenizer/Tokenizer.js`: Basic syntax highlighting
- `styles/editor.css`: Editor styles with dark/light themes
- `index.html`: Demo page

---

## Version History Summary

| Version | Date       | Highlights                               |
| ------- | ---------- | ---------------------------------------- |
| 1.1.1   | 2025-05-30 | Cursor positioning & scroll bug fixes    |
| 1.1.0   | 2024-01-20 | Language Service, Parser, Auto-Complete  |
| 1.0.0   | 2024-01-15 | Initial release with EditContext support |
