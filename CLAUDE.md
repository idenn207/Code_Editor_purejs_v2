# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pure JavaScript code editor with syntax highlighting using the EditContext API (Chrome 121+). No build tools or bundlers - uses ES modules directly in the browser.

## Running the Project

Open `index.html` in a modern browser (Chrome 121+ or Edge 121+ for EditContext support). Falls back to hidden textarea for unsupported browsers.

## Architecture

```
src/
├── core/Editor.js       # Main editor class - orchestrates all components
├── model/Document.js    # Text storage as line array with offset conversion
├── view/EditorView.js   # Rendering, cursor display, scroll handling
├── input/               # Input handling layer
│   ├── InputHandler.js      # Mode detection and delegation
│   ├── EditContextHandler.js # EditContext API implementation
│   └── TextareaHandler.js    # Hidden textarea fallback
├── tokenizer/           # Monarch-style tokenizer with state machine
│   ├── Tokenizer.js         # Token generation with multi-line state
│   └── grammars/javascript.js
└── features/            # Self-contained feature modules
    └── autoClose/AutoCloseFeature.js
```

### Key Patterns

- **File template**: Imports → Constants → Class (Static → Instance → Constructor → Public → Private → Event Handlers → Getters → Lifecycle)
- **Events**: Components communicate via `on(event, callback)` pattern (both Editor and Document)
- **Features**: Attach to Editor instance, listen to events, manipulate document/selection
- **Naming**: PascalCase classes, camelCase methods (verbs), `_prefix` for private, `handle` prefix for event handlers

## Code Conventions

```javascript
// Private members with underscore prefix
_document = null;
_handleKeyDown(e) {}

// Boolean naming: is/has/can/should prefix
isVisible = true;
hasSelection = false;

// Callbacks: on prefix
constructor({ onTextChange, onCursorMove }) {}
```

## Planned Features (from DEVELOP_ROADMAP.md)

The roadmap outlines adding: autocomplete (hardcoded JS/HTML/CSS built-ins), auto-indent, keyword search, multi-cursor, file explorer, multi-tab, indent coloring, bracket matching, HTML/CSS grammars. New features should follow the existing `features/` folder pattern as self-contained modules.

## Editor API Reference

```javascript
// Document operations
editor.getValue() / editor.setValue(text)
editor.insertText(text)
editor.document.replaceRange(start, end, text)

// Selection
editor.getSelection() → { start, end }
editor.setSelection(start, end)
editor.getSelectedText()

// Undo/Redo
editor.undo() / editor.redo()
editor.canUndo() / editor.canRedo()
```
