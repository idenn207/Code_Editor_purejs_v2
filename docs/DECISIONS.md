# Architecture Decision Records (ADR)

## ADR-001: Use EditContext API as Primary Input Method

**Date**: 2024-01-15  
**Status**: Accepted

### Context

We need to choose an input handling method for a web-based code editor. The editor must support:

- Regular keyboard input
- IME composition (Korean, Japanese, Chinese)
- Clipboard operations
- Proper accessibility
- Custom rendering (syntax highlighting)

### Options Considered

#### Option A: ContentEditable

- **Pros**:
  - Native browser selection handling
  - Good mobile support
  - Built-in accessibility
  - Works in all browsers
- **Cons**:
  - Must fight browser's built-in editing behaviors
  - Inconsistent behavior across browsers
  - DOM mutations interfere with custom rendering
  - Difficult to implement custom undo/redo

#### Option B: Hidden Textarea (Monaco/VSCode approach)

- **Pros**:
  - Works in all browsers
  - Full control over rendering
  - Native IME support through textarea
  - Simple implementation
- **Cons**:
  - Accessibility issues (screen readers can't read content)
  - Sync issues between textarea and display
  - IME window positioning can be problematic
  - Requires complex position calculations

#### Option C: EditContext API

- **Pros**:
  - Clean separation of input and rendering
  - Direct integration with OS text services
  - No hidden elements needed
  - Better accessibility potential
  - No browser editing quirks to fight
  - Purpose-built for custom editors
- **Cons**:
  - Limited browser support (Chrome/Edge 121+ only)
  - New API, less documentation
  - Must implement everything manually (cursor, selection, scrolling)

### Decision

Use **EditContext API** as the primary input method with **Hidden Textarea as fallback** for unsupported browsers.

### Consequences

- **Positive**:
  - Clean architecture with clear separation of concerns
  - Future-proof (EditContext is the emerging standard)
  - Best possible IME integration on supported browsers
  - No DOM manipulation conflicts
- **Negative**:
  - Must maintain two input handlers
  - Increased complexity in InputHandler
  - Testing required across multiple browsers
- **Risks**:
  - Firefox/Safari may never implement EditContext (mitigation: fallback works well)

### Related

- ADR-002: Input Handler Architecture

---

## ADR-002: Unified InputHandler with Automatic Fallback

**Date**: 2024-01-15  
**Status**: Accepted

### Context

Given ADR-001's decision to use EditContext with textarea fallback, we need to decide how to structure the input handling code to support both methods.

### Options Considered

#### Option A: Single Class with Conditionals

- **Pros**:
  - Single file to maintain
  - No abstraction overhead
- **Cons**:
  - Mixed concerns
  - Difficult to test
  - Code becomes complex with many if/else branches

#### Option B: Strategy Pattern with Separate Handlers

- **Pros**:
  - Clean separation of implementations
  - Easy to test each handler independently
  - Easy to add new input methods
  - Follows Open/Closed principle
- **Cons**:
  - More files to maintain
  - Slight abstraction overhead

#### Option C: Inheritance with Base Class

- **Pros**:
  - Shared code in base class
  - Clear hierarchy
- **Cons**:
  - Tight coupling
  - Less flexible than composition

### Decision

Use **Strategy Pattern** (Option B) with:

- `InputHandler` - Unified facade that selects strategy
- `EditContextHandler` - EditContext implementation
- `TextareaHandler` - Fallback implementation

### Consequences

- **Positive**:
  - Each handler is self-contained and testable
  - Easy to add new input methods (e.g., for specific platforms)
  - Clear API boundary between handlers
- **Negative**:
  - Three files instead of one
  - Must ensure API consistency between handlers

### Related

- ADR-001: Use EditContext API as Primary Input Method

---

## ADR-003: Line-Based Document Model

**Date**: 2024-01-15  
**Status**: Accepted

### Context

We need to choose how to store and manipulate document text internally. The choice affects:

- Memory usage
- Edit performance
- Line-based operations (syntax highlighting, line numbers)

### Options Considered

#### Option A: Single String

- **Pros**:
  - Simple implementation
  - Direct mapping to textarea value
  - Easy serialization
- **Cons**:
  - Poor performance for large files (string concatenation)
  - Requires splitting for line operations
  - Memory copying on every edit

#### Option B: Array of Lines

- **Pros**:
  - Efficient line-based operations
  - Good for syntax highlighting (per-line)
  - Natural fit for line numbers
  - Reasonable edit performance
- **Cons**:
  - Must join for full text
  - Cross-line operations slightly complex

#### Option C: Piece Table (like VSCode)

- **Pros**:
  - Excellent performance for large files
  - Efficient undo/redo
  - Minimal memory copying
- **Cons**:
  - Complex implementation
  - Overkill for simple editor
  - Harder to debug

#### Option D: Rope Data Structure

- **Pros**:
  - Excellent performance for very large files
  - Balanced tree structure
- **Cons**:
  - Very complex implementation
  - Significant overhead for small files

### Decision

Use **Array of Lines** (Option B) for initial implementation.

Rationale:

- Good balance of simplicity and performance
- Natural fit for our tokenizer (line-based)
- Easy to upgrade to Piece Table later if needed

### Consequences

- **Positive**:
  - Simple, understandable code
  - Fast line-based operations
  - Easy integration with tokenizer
- **Negative**:
  - May need optimization for very large files (>100K lines)
  - Cross-line operations require more code
- **Risks**:
  - Performance degradation with large files (mitigation: can migrate to Piece Table)

### Related

- ADR-004: Tokenizer Strategy

---

## ADR-004: Simple Regex-Based Tokenizer

**Date**: 2024-01-15  
**Status**: Accepted

### Context

We need syntax highlighting for the code editor. Must choose tokenization approach.

### Options Considered

#### Option A: TextMate Grammars (like VSCode)

- **Pros**:
  - Industry standard
  - Huge library of existing grammars
  - Accurate highlighting
- **Cons**:
  - Complex Oniguruma regex engine needed
  - Large bundle size
  - Overkill for simple editor

#### Option B: Tree-sitter

- **Pros**:
  - Accurate parsing
  - Incremental updates
  - Error recovery
- **Cons**:
  - WASM required
  - Complex setup
  - Large grammar files

#### Option C: Simple Regex Tokenizer

- **Pros**:
  - Small and fast
  - Easy to understand and modify
  - No dependencies
  - Good enough for basic highlighting
- **Cons**:
  - Not as accurate as full parser
  - Limited to simple patterns
  - Multi-line constructs difficult

### Decision

Use **Simple Regex Tokenizer** (Option C) for initial implementation.

### Consequences

- **Positive**:
  - Zero dependencies
  - Fast tokenization
  - Easy to add new languages
  - Small bundle size
- **Negative**:
  - Some edge cases won't highlight correctly
  - Multi-line strings/comments need special handling
- **Risks**:
  - Users may expect VSCode-quality highlighting (mitigation: document limitations)

### Related

- ADR-003: Line-Based Document Model

---

## ADR-005: Event-Based Communication

**Date**: 2024-01-15  
**Status**: Accepted

### Context

Components need to communicate (e.g., Document → View, Selection → Cursor). Must choose communication pattern.

### Options Considered

#### Option A: Direct Method Calls

- **Pros**:
  - Simple
  - Type-safe
  - Easy to trace
- **Cons**:
  - Tight coupling
  - Circular dependencies possible
  - Hard to extend

#### Option B: Observer Pattern (Events)

- **Pros**:
  - Loose coupling
  - Easy to add listeners
  - Flexible extension
- **Cons**:
  - Harder to trace flow
  - Must manage subscriptions

#### Option C: Redux-like Store

- **Pros**:
  - Single source of truth
  - Time-travel debugging
  - Predictable state
- **Cons**:
  - Boilerplate
  - Overhead for simple editor
  - Learning curve

### Decision

Use **Observer Pattern** with simple event emitter on each component.

### Consequences

- **Positive**:
  - Components loosely coupled
  - Easy to add new features that react to events
  - View updates automatically on model changes
- **Negative**:
  - Must track subscriptions for cleanup
  - Event flow less obvious than direct calls
- **Risks**:
  - Memory leaks from forgotten subscriptions (mitigation: dispose pattern)

---

## ADR-006: CSS Variables for Theming

**Date**: 2024-01-15  
**Status**: Accepted

### Context

Need theming support for light/dark modes and syntax colors.

### Options Considered

#### Option A: Multiple CSS Files

- **Pros**:
  - Complete separation
  - Easy to create themes
- **Cons**:
  - File switching required
  - Duplicate selectors

#### Option B: CSS Variables

- **Pros**:
  - Runtime switching
  - Single CSS file
  - Easy to customize
  - Can be set via JavaScript
- **Cons**:
  - IE11 not supported (acceptable)

#### Option C: CSS-in-JS

- **Pros**:
  - Dynamic styling
  - Scoped styles
- **Cons**:
  - Runtime overhead
  - Requires build step or library

### Decision

Use **CSS Variables** for all theme-related values.

```css
.ec-editor {
  --ec-bg: #1e1e1e;
  --ec-keyword: #569cd6;
  /* ... */
}

.ec-editor.ec-theme-light {
  --ec-bg: #ffffff;
  --ec-keyword: #0000ff;
}
```

### Consequences

- **Positive**:
  - Easy theme switching (toggle class)
  - Users can customize via CSS
  - No JavaScript needed for basic theming
- **Negative**:
  - No IE11 support (acceptable)

---

## ADR-007: No External Dependencies

**Date**: 2024-01-15  
**Status**: Accepted

### Context

Decide whether to use external libraries for common functionality.

### Options Considered

#### Option A: Use Libraries (lodash, eventemitter3, etc.)

- **Pros**:
  - Battle-tested code
  - Less code to maintain
- **Cons**:
  - Bundle size increases
  - Version management
  - Potential security issues

#### Option B: Vanilla JavaScript Only

- **Pros**:
  - Zero dependencies
  - Small bundle size
  - Full control
  - No supply chain risks
- **Cons**:
  - More code to write
  - Must handle edge cases

### Decision

Use **Vanilla JavaScript Only** - no external runtime dependencies.

### Consequences

- **Positive**:
  - Minimal bundle size (~20KB minified)
  - No dependency updates needed
  - No security vulnerabilities from deps
- **Negative**:
  - More code to write and maintain
  - Must implement utilities ourselves

---

## Decision Summary

| ADR | Decision                  | Key Rationale                           |
| --- | ------------------------- | --------------------------------------- |
| 001 | EditContext + Fallback    | Best architecture with browser coverage |
| 002 | Strategy Pattern          | Clean separation, testability           |
| 003 | Array of Lines            | Balance of simplicity and performance   |
| 004 | Simple Regex Tokenizer    | Zero dependencies, good enough          |
| 005 | Event-Based Communication | Loose coupling                          |
| 006 | CSS Variables             | Runtime theming, simple                 |
| 007 | No External Dependencies  | Minimal bundle, no supply chain risk    |
