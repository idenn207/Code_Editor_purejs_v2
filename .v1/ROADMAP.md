# Development Roadmap

> Feature implementation plan for EditContext Code Editor

**Last Updated**: 2025-12-05
**Current Version**: 0.3.0 (Phase 4 - Language Service)

---

## Status Legend

- ✅ **Implemented** - Fully functional and tested
- 🚧 **In Progress** - Currently being developed
- 📋 **Planned** - Scheduled for future development
- 🔮 **Future** - Long-term consideration

---

## ✅ Phase 1-3: Core Editor (COMPLETED)

### Document & Input System
- ✅ Line-based document model with version tracking
- ✅ EditContext API integration (Chrome/Edge 121+)
- ✅ Textarea fallback for unsupported browsers (Firefox, Safari)
- ✅ Automatic input strategy selection
- ✅ IME composition support (CJK languages)
- ✅ Emoji picker integration
- ✅ Clipboard operations (cut, copy, paste)

### View & Rendering
- ✅ Line rendering with syntax highlighting
- ✅ Line numbers gutter
- ✅ Cursor rendering with blink animation
- ✅ Selection rendering (single range)
- ✅ Cursor positioning from mouse clicks

### Editing Features
- ✅ Text insertion and deletion
- ✅ Undo/Redo with history stack
- ✅ Tab key handling
- ✅ Newline/Enter key handling

### Keyboard Navigation
- ✅ Arrow keys (up, down, left, right)
- ✅ Home/End (line start/end)
- ✅ Ctrl+Home/End (document start/end)
- ✅ Ctrl+Left/Right (word movement)
- ✅ Shift modifiers for selection
- ✅ Ctrl+Z/Y (undo/redo)
- ✅ Ctrl+A (select all)

---

## ✅ Phase 4: Syntax & Language Service (COMPLETED)

### Tokenizer
- ✅ Monarch-style tokenizer with state machine
- ✅ JavaScript grammar definition
- ✅ Incremental tokenization (line-by-line)
- ✅ State caching for performance
- ✅ Token types: keyword, identifier, string, comment, operator, number, etc.

### Parser & AST
- ✅ Recursive descent parser
- ✅ AST generation for JavaScript
- ✅ Error recovery during parsing
- ✅ Support for:
  - Variable declarations (const, let, var)
  - Function declarations & expressions
  - Arrow functions
  - Class declarations (with methods, properties)
  - Object literals
  - Member expressions (obj.prop, obj[prop])
  - Call expressions
  - Binary/Unary expressions
  - Template literals

### Symbol Table & Scope Management
- ✅ Scope hierarchy (global, function, block, class)
- ✅ Symbol tracking (variables, functions, classes, parameters, properties)
- ✅ Member tracking (object properties, class methods)
- ✅ Symbol resolution with scope chain lookup
- ✅ Type inference (basic)

### Code Intelligence
- ✅ Auto-complete UI component
- ✅ Completion provider (member, global, keyword)
- ✅ Hover tooltip UI
- ✅ Hover provider (symbol information)
- ✅ Diagnostic provider (parse errors)
- ✅ Ctrl+Space to trigger completions
- ✅ Debounced parsing (150ms)
- ✅ Context-aware completions (after `.`, typing identifiers)

---

## 🚧 Phase 5: Advanced Editing (IN PROGRESS)

### Priority 1 - Essential Editing Features

#### P1.1 - Search & Replace (High Priority)
- 📋 Find text (Ctrl+F)
- 📋 Find next/previous (F3/Shift+F3)
- 📋 Replace (Ctrl+H)
- 📋 Replace all
- 📋 Case-sensitive search
- 📋 Regex search
- 📋 Whole word matching
- 📋 Search UI widget

#### P1.2 - Auto-Closing Pairs (High Priority)
- 📋 Auto-close brackets: `()`, `[]`, `{}`
- 📋 Auto-close quotes: `"`, `'`, `` ` ``
- 📋 Auto-surround selection with pairs
- 📋 Language-specific pair configuration
- 📋 Skip over closing character when typing

#### P1.3 - Auto-Indentation (High Priority)
- 📋 Auto-indent on Enter
- 📋 Auto-dedent for closing braces
- 📋 Preserve indentation when inserting lines
- 📋 Smart indentation rules per language
- 📋 Indent/Outdent selection (Tab/Shift+Tab)

#### P1.4 - Comment Toggling (High Priority)
- 📋 Toggle line comment (Ctrl+/)
- 📋 Toggle block comment (Shift+Alt+A)
- 📋 Language-specific comment syntax
- 📋 Multi-line comment support

#### P1.5 - Line Operations (High Priority)
- 📋 Duplicate line (Shift+Alt+Down/Up)
- 📋 Delete line (Ctrl+Shift+K)
- 📋 Move line up/down (Alt+Up/Down)
- 📋 Copy line up/down (Shift+Alt+Up/Down)

### Priority 2 - Visual Enhancements

#### P2.1 - Selected Text Highlighting (Medium Priority)
- 📋 Highlight all occurrences of selected text
- 📋 Border/background differentiation
- 📋 Debounced highlighting

#### P2.2 - Indentation Guides (Medium Priority)
- 📋 Vertical lines showing indentation levels
- 📋 Active indent guide highlighting
- 📋 Configurable color and opacity

#### P2.3 - Word Wrap (Medium Priority)
- 📋 Soft wrap for long lines
- 📋 Wrap indicator
- 📋 Preserve indentation on wrapped lines

#### P2.4 - Bracket Matching (Medium Priority)
- 📋 Highlight matching bracket pairs
- 📋 Jump to matching bracket (Ctrl+Shift+\\)
- 📋 Visual indicator for unmatched brackets

---

## 📋 Phase 6: Multi-Language Support

### Priority 1 - Additional Languages

#### HTML Support
- 📋 HTML grammar definition
- 📋 Tag tokenization
- 📋 Attribute parsing
- 📋 HTML-specific auto-complete
- 📋 Tag auto-closing
- 📋 Emmet support

#### CSS Support
- 📋 CSS grammar definition
- 📋 Property/value tokenization
- 📋 CSS-specific auto-complete
- 📋 Color picker widget
- 📋 Property documentation

#### Python Support
- 📋 Python grammar definition
- 📋 Indentation-based syntax handling
- 📋 Python-specific auto-complete
- 📋 Docstring support

### Priority 2 - Code Formatting

#### Prettier Integration
- 📋 Format document command
- 📋 Format selection
- 📋 Format on save option
- 📋 Prettier config file support
- 📋 Multi-language support (JS, HTML, CSS)

---

## 📋 Phase 7: Advanced Code Intelligence

### Priority 1 - Navigation & Refactoring

#### Go to Definition (High Priority)
- 📋 F12 / Ctrl+Click to jump to definition
- 📋 Symbol location tracking
- 📋 Cross-file navigation (future)
- 📋 Peek definition widget

#### Find All References (High Priority)
- 📋 Find all usages of symbol
- 📋 Reference highlighting
- 📋 Results panel
- 📋 Cross-file references (future)

#### Rename Symbol (High Priority)
- 📋 Rename variable/function/class
- 📋 Update all references
- 📋 Preview changes
- 📋 Undo support

#### Parameter Hints (Medium Priority)
- 📋 Function signature display
- 📋 Current parameter highlighting
- 📋 Tooltip with parameter documentation
- 📋 Multi-signature support (overloads)

### Priority 2 - Diagnostics & Quick Fixes

#### Enhanced Diagnostics (Medium Priority)
- 📋 Error squiggly underlines (red wavy)
- 📋 Warning squiggly underlines (yellow wavy)
- 📋 Info/Hint underlines
- 📋 Diagnostic panel
- 📋 Hover on squiggly for details

#### Quick Fixes / Code Actions (Medium Priority)
- 📋 Lightbulb icon indicator
- 📋 Auto-fix suggestions
- 📋 Common refactorings
- 📋 Import missing modules
- 📋 Add missing properties

### Priority 3 - Advanced Features

#### Code Folding (Low Priority)
- 📋 Fold/unfold regions
- 📋 Folding markers (+/- icons)
- 📋 Fold all / Unfold all
- 📋 Persistent folding state

#### Code Lens (Low Priority)
- 📋 Inline reference count
- 📋 Inline implementation links
- 📋 Test status indicators

---

## 📋 Phase 8: Multi-Cursor & Selection

### Multi-Cursor Support (High Priority)
- 📋 Add cursor above/below (Ctrl+Alt+Up/Down)
- 📋 Add cursor at selection ends (Shift+Alt+I)
- 📋 Select all occurrences (Ctrl+Shift+L)
- 📋 Select next occurrence (Ctrl+D)
- 📋 Undo cursor add (Ctrl+U)
- 📋 Multi-cursor editing
- 📋 Multi-cursor clipboard operations

### Column/Box Selection (Medium Priority)
- 📋 Alt+Shift+Drag for box selection
- 📋 Multi-line cursor in column mode
- 📋 Column mode indicator

---

## 📋 Phase 9: Editor UX Enhancements

### Priority 1 - Essential UX

#### Context Menu (High Priority)
- 📋 Right-click context menu
- 📋 Cut/Copy/Paste
- 📋 Select All
- 📋 Go to Definition
- 📋 Find All References
- 📋 Rename Symbol
- 📋 Format Document

#### Minimap (Medium Priority)
- 📋 Code overview on right side
- 📋 Clickable for navigation
- 📋 Visible region indicator
- 📋 Syntax color preview

#### Sticky Scroll (Medium Priority)
- 📋 Show current function/class at top
- 📋 Nested scope indicators
- 📋 Click to jump to scope start

### Priority 2 - Visual Polish

#### Glyph Margin (Medium Priority)
- 📋 Left margin before line numbers
- 📋 Breakpoint indicators
- 📋 Error/Warning icons
- 📋 Folding markers

#### Overview Ruler (Medium Priority)
- 📋 Scrollbar annotations
- 📋 Error/Warning markers
- 📋 Search result markers
- 📋 Selection markers

#### Link Detection (Low Priority)
- 📋 Underline URLs in code
- 📋 Ctrl+Click to open
- 📋 Tooltip preview

#### Drag & Drop (Low Priority)
- 📋 Drag selected text to move
- 📋 Ctrl+Drag to copy
- 📋 Drop indicator

---

## 📋 Phase 10: Workspace & File Management

### File Explorer (High Priority)
- 📋 Tree view sidebar
- 📋 File/folder navigation
- 📋 File open/close
- 📋 File creation/deletion/rename
- 📋 Folder expand/collapse

### Multi-Tab Interface (High Priority)
- 📋 Tab bar for open files
- 📋 Tab switching (Ctrl+Tab, Ctrl+PgUp/PgDn)
- 📋 Close tab (Ctrl+W)
- 📋 Close all tabs
- 📋 Close others
- 📋 Dirty indicator (unsaved changes)
- 📋 Split editor view

### Command Palette (Medium Priority)
- 📋 Ctrl+Shift+P to open
- 📋 Fuzzy search commands
- 📋 Recent commands
- 📋 Keybinding display

---

## 📋 Phase 11: Customization & Settings

### Theme System (High Priority)
- 📋 Dark theme (already has basic)
- 📋 Light theme (already has basic)
- 📋 High contrast theme
- 📋 Custom theme creation
- 📋 Color token customization

### Settings/Preferences (High Priority)
- 📋 Persistent configuration storage
- 📋 Editor settings (tab size, font size, etc.)
- 📋 Keybinding customization
- 📋 Language-specific settings
- 📋 Settings UI panel

### Font & Typography (Medium Priority)
- 📋 Font ligatures support
- 📋 Font family selection
- 📋 Font size adjustment (Ctrl+=/-)
- 📋 Line height adjustment
- 📋 Letter spacing

---

## 📋 Phase 12: Performance & Scale

### Virtual Scrolling (Critical for Large Files)
- 📋 Render only visible lines
- 📋 Viewport calculation
- 📋 Smooth scrolling
- 📋 Handle 10,000+ line files

### Web Worker Integration (High Priority)
- 📋 Move parsing to Web Worker
- 📋 Non-blocking tokenization
- 📋 Background symbol table building
- 📋 Worker communication protocol

### Lazy Loading (Medium Priority)
- 📋 Load large files in chunks
- 📋 Progressive rendering
- 📋 Memory management

### Incremental Rendering (Medium Priority)
- 📋 Only re-render changed lines
- 📋 Viewport-based updates
- 📋 Batch DOM updates

---

## 📋 Phase 13: Advanced Language Features

### Snippets System (High Priority)
- 📋 Snippet definition format
- 📋 Snippet insertion
- 📋 Tabstop navigation
- 📋 Placeholder variables
- 📋 Built-in snippets library

### Emmet for HTML/CSS (Medium Priority)
- 📋 Emmet abbreviation parsing
- 📋 Expansion trigger
- 📋 HTML tag generation
- 📋 CSS property generation

### Import Path IntelliSense (Medium Priority)
- 📋 Auto-complete file paths in imports
- 📋 Relative path resolution
- 📋 Node modules support
- 📋 Path validation

### JSDoc/TSDoc Support (Low Priority)
- 📋 JSDoc comment parsing
- 📋 Hover documentation from JSDoc
- 📋 Parameter type hints from JSDoc
- 📋 @param, @returns, @type support

### JSON Schema Validation (Low Priority)
- 📋 Schema-based validation
- 📋 Auto-complete from schema
- 📋 package.json schema
- 📋 tsconfig.json schema

---

## 🔮 Phase 14: Future Considerations

### Language Server Protocol (Long-term)
- 🔮 LSP client implementation
- 🔮 Connect to external language servers
- 🔮 TypeScript language server
- 🔮 Python language server
- 🔮 Full type checking

### Diff Editor (Long-term)
- 🔮 Side-by-side diff view
- 🔮 Inline diff view
- 🔮 Change indicators
- 🔮 Accept/reject changes

### Plugin/Extension System (Long-term)
- 🔮 Plugin API definition
- 🔮 Extension loading mechanism
- 🔮 Marketplace integration
- 🔮 Community contributions

### Accessibility (Long-term)
- 🔮 Screen reader support
- 🔮 ARIA labels and live regions
- 🔮 Keyboard-only navigation
- 🔮 Focus indicators
- 🔮 Accessibility audit

### Markdown Features (Long-term)
- 🔮 Markdown preview
- 🔮 Live preview sync
- 🔮 Markdown syntax highlighting
- 🔮 Table of contents

### Collaborative Editing (Long-term)
- 🔮 Real-time collaboration
- 🔮 Conflict resolution
- 🔮 User presence indicators
- 🔮 Cursor sharing

### Mobile Support (Long-term)
- 🔮 Touch input handling
- 🔮 Mobile-friendly UI
- 🔮 Virtual keyboard support
- 🔮 Responsive layout

---

## Priority Summary

### **P0 - Critical (Must Have Soon)**
1. Virtual scrolling (performance bottleneck)
2. Search & Replace (essential editing)
3. Auto-closing pairs (UX expectation)
4. Auto-indentation (code quality)
5. Comment toggling (common operation)

### **P1 - High Priority (Next 3-6 Months)**
1. Line operations (duplicate, delete, move)
2. Multi-cursor support
3. Go to Definition
4. Find All References
5. Rename Symbol
6. HTML/CSS language support
7. File explorer sidebar
8. Multi-tab interface
9. Code formatter integration
10. Selected text highlighting

### **P2 - Medium Priority (6-12 Months)**
1. Bracket matching with highlights
2. Word wrap
3. Indentation guides
4. Context menu
5. Minimap
6. Parameter hints
7. Enhanced diagnostics with squigglies
8. Quick fixes/code actions
9. Theme customization
10. Settings system
11. Web Worker for parsing
12. Snippets system
13. Command palette

### **P3 - Low Priority (12+ Months)**
1. Sticky scroll
2. Code folding with markers
3. Glyph margin
4. Overview ruler
5. Emmet support
6. Import path IntelliSense
7. Diff editor
8. JSDoc parsing
9. Code lens
10. Link detection

### **P4 - Future (Long-term Goals)**
1. Language Server Protocol
2. Plugin/extension system
3. Full accessibility
4. Collaborative editing
5. Mobile support

---

## Milestone Timeline

### **Q1 2025** (Current)
- ✅ Complete Phase 4 (Language Service)
- 🚧 Begin Phase 5 (Advanced Editing)
- Target: Search, Auto-closing, Auto-indent, Comments

### **Q2 2025**
- Complete Phase 5 (Advanced Editing)
- Complete Phase 8 (Multi-cursor)
- Begin Phase 6 (Multi-language)
- Target: HTML/CSS support, Formatter integration

### **Q3 2025**
- Complete Phase 6 (Multi-language)
- Complete Phase 10 (Workspace)
- Begin Phase 7 (Advanced Intelligence)
- Target: File explorer, Multi-tab, Go to Definition

### **Q4 2025**
- Complete Phase 7 (Advanced Intelligence)
- Complete Phase 9 (UX Enhancements)
- Begin Phase 12 (Performance)
- Target: Virtual scrolling, Web Workers, Minimap

### **2026**
- Phase 11 (Customization)
- Phase 13 (Advanced Language)
- Phase 12 (Performance optimization)
- Phase 14 (Future features)

---

## Feature Comparison: Current vs Monaco Editor

| Feature Category | This Editor | Monaco Editor | Gap |
|---|---|---|---|
| **Core Editing** | ✅ Basic | ✅ Full | Medium |
| **Syntax Highlighting** | ✅ JS only | ✅ 100+ languages | Large |
| **Code Intelligence** | ✅ Basic (JS) | ✅ Advanced (LSP) | Large |
| **Auto-complete** | ✅ Implemented | ✅ Advanced | Medium |
| **Multi-cursor** | 📋 Planned | ✅ Full | Large |
| **Search/Replace** | 📋 Planned | ✅ Full | Large |
| **Code Folding** | 📋 Planned | ✅ Full | Large |
| **Minimap** | 📋 Planned | ✅ Full | Medium |
| **Themes** | ✅ Basic 2 | ✅ Many | Medium |
| **Diff Editor** | 🔮 Future | ✅ Full | Large |
| **Extensions** | 🔮 Future | ✅ Full | Large |
| **Performance** | ⚠️ <1000 lines | ✅ 100,000+ lines | Critical |

---

## Contributing

When implementing features from this roadmap:

1. **Follow existing patterns** - Check ARCHITECTURE.md and DECISIONS.md
2. **Maintain code style** - See CLAUDE.md for conventions
3. **Update CHANGELOG.md** - Document all changes
4. **Update this roadmap** - Move items from 📋 to 🚧 to ✅
5. **Test across browsers** - EditContext (Chrome/Edge) and Textarea fallback (Firefox/Safari)

---

## Notes

- **Phase ordering** is flexible - high-priority features can be pulled forward
- **Performance** (Phase 12) is critical and should be addressed before large files become problematic
- **Language Server Protocol** (Phase 14) would replace much of Phase 6-7 but is a major architectural shift
- **Bundle size** should remain minimal - current zero dependencies should be maintained where possible
