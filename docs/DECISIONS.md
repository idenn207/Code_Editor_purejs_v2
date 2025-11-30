# Architecture Decision Records (ADR)

## ADR-001: Use EditContext API as Primary Input Method

**Date**: 2024-01-15  
**Status**: Accepted

### Context

We need to choose an input handling method for a web-based code editor supporting regular keyboard input, IME composition, clipboard operations, and custom rendering.

### Options Considered

#### Option A: ContentEditable

- **Pros**: Native selection, mobile support, built-in accessibility
- **Cons**: Must fight browser behaviors, inconsistent across browsers, DOM mutations interfere

#### Option B: Hidden Textarea (Monaco approach)

- **Pros**: Works everywhere, full rendering control, native IME
- **Cons**: Accessibility issues, sync problems, complex position calculations

#### Option C: EditContext API

- **Pros**: Clean separation, direct OS integration, no hidden elements, purpose-built
- **Cons**: Limited browser support (Chrome/Edge 121+), must implement everything

### Decision

Use **EditContext API** as primary with **Hidden Textarea as fallback**.

### Consequences

- **Positive**: Clean architecture, future-proof, best IME integration
- **Negative**: Must maintain two handlers, increased complexity

---

## ADR-002: Strategy Pattern for Input Handlers

**Date**: 2024-01-15  
**Status**: Accepted

### Context

Need to support both EditContext and textarea fallback cleanly.

### Decision

Use **Strategy Pattern** with:

- `InputHandler` - Unified facade that selects strategy
- `EditContextHandler` - EditContext implementation
- `TextareaHandler` - Fallback implementation

### Consequences

- **Positive**: Each handler self-contained and testable, easy to extend
- **Negative**: Three files instead of one

---

## ADR-003: Line-Based Document Model

**Date**: 2024-01-15  
**Status**: Accepted

### Context

Choose internal text storage structure affecting memory, performance, and line operations.

### Options Considered

| Option         | Performance          | Complexity | Notes                             |
| -------------- | -------------------- | ---------- | --------------------------------- |
| Single String  | Poor for large files | Simple     | String concatenation overhead     |
| Array of Lines | Good                 | Medium     | Natural fit for tokenizer         |
| Piece Table    | Excellent            | High       | VSCode approach, overkill for now |
| Rope           | Excellent            | Very High  | For very large files only         |

### Decision

Use **Array of Lines** for initial implementation.

### Consequences

- **Positive**: Simple, fast line operations, easy tokenizer integration
- **Negative**: May need optimization for very large files (>100K lines)

---

## ADR-004: Monarch-Style Tokenizer

**Date**: 2024-01-20  
**Status**: Accepted

### Context

Need syntax highlighting with support for multi-line constructs (comments, strings, templates).

### Options Considered

#### Option A: Simple Regex (Current)

- **Pros**: Fast, simple, no dependencies
- **Cons**: Cannot handle multi-line constructs, limited accuracy

#### Option B: TextMate Grammars

- **Pros**: Industry standard, thousands of grammars, accurate
- **Cons**: Needs Oniguruma (WASM ~500KB), complex

#### Option C: Monarch-Style State Machine

- **Pros**: Handles multi-line, extensible, reasonable performance, no WASM
- **Cons**: Must write grammars from scratch, Monaco-inspired but custom

#### Option D: Tree-sitter

- **Pros**: True parsing, incremental, error recovery
- **Cons**: WASM required, complex setup, overkill for highlighting

### Decision

Use **Monarch-Style State Machine** tokenizer.

### Consequences

- **Positive**: Multi-line support, extensible, good performance
- **Negative**: Custom grammar format, must write all grammars

---

## ADR-005: Separate Tokenizer and Language Service

**Date**: 2024-01-20  
**Status**: Accepted

### Context

Need both fast syntax highlighting (every keystroke) and code intelligence (AST, completions).

### Options Considered

#### Option A: Single Combined System

- **Pros**: Unified codebase, shared parsing
- **Cons**: Performance bottleneck, complexity

#### Option B: Separate Systems

- **Pros**: Tokenizer stays sync/fast, parser can be async, independent optimization
- **Cons**: Some duplication, two codepaths

### Decision

**Separate systems**:

- **Tokenizer**: Sync, per-keystroke, Monarch-style for highlighting
- **Language Service**: Async/debounced, full parsing for intelligence

### Consequences

- **Positive**: Highlighting never blocks, parser can take time
- **Negative**: Two separate token/parse passes
- **Future**: Language Service can move to Web Worker

---

## ADR-006: Recursive Descent Parser

**Date**: 2024-01-20  
**Status**: Accepted

### Context

Need to generate AST from tokens for code intelligence features.

### Options Considered

#### Option A: Hand-written Recursive Descent

- **Pros**: Full control, easy to understand, good error recovery
- **Cons**: More code to write, must handle precedence manually

#### Option B: Parser Generator (PEG.js, ANTLR)

- **Pros**: Grammar-driven, less code, proven algorithms
- **Cons**: External dependency, generated code harder to debug

#### Option C: Pratt Parser / Precedence Climbing

- **Pros**: Elegant expression parsing, handles precedence well
- **Cons**: Less intuitive for statements, learning curve

### Decision

Use **Hand-written Recursive Descent** parser.

### Consequences

- **Positive**: Full control, easy to add error recovery, no dependencies
- **Negative**: More code, must handle operator precedence explicitly
- **Mitigation**: Use precedence climbing for expressions within RD framework

---

## ADR-007: Symbol Table with Scope Hierarchy

**Date**: 2024-01-20  
**Status**: Accepted

### Context

Auto-complete needs to know what variables/functions are available at cursor position.

### Options Considered

#### Option A: Flat Symbol List

- **Pros**: Simple implementation
- **Cons**: No scope awareness, incorrect completions

#### Option B: Scope Tree

- **Pros**: Correct scoping, shadowing support, proper resolution
- **Cons**: More complex, must track scope entry/exit

### Decision

Use **Scope Tree** (linked scopes with parent references).

```
GlobalScope
├── FunctionScope (foo)
│   └── BlockScope (if)
└── ClassScope (MyClass)
    └── MethodScope (render)
```

### Consequences

- **Positive**: Correct variable resolution, proper shadowing
- **Negative**: Must track scope during AST traversal

---

## ADR-008: Debounced Analysis with Immediate Tokenization

**Date**: 2024-01-20  
**Status**: Accepted

### Context

Balance between responsive highlighting and expensive parsing.

### Decision

- **Tokenizer**: Immediate (sync), every keystroke
- **Language Service**: Debounced 150ms after last keystroke
- **Auto-complete**: Debounced 100ms after trigger

### Consequences

- **Positive**: Highlighting always instant, parsing doesn't block typing
- **Negative**: Brief delay before completions available after typing

---

## ADR-009: Context-Aware Completion Provider

**Date**: 2024-01-20  
**Status**: Accepted

### Context

Auto-complete needs different completions based on cursor context.

### Decision

Detect context by analyzing text before cursor:

- **Member access** (`obj.`): Show object properties/methods
- **Global context**: Show variables, functions, keywords
- **Import path**: Show module suggestions

### Consequences

- **Positive**: Relevant completions, better UX
- **Negative**: Context detection can miss edge cases

---

## ADR-010: Incremental Tokenization with State Caching

**Date**: 2024-01-20  
**Status**: Accepted

### Context

Full re-tokenization on every change is expensive for large files.

### Decision

Cache `{tokens, endState}` per line. On change:

1. Invalidate from changed line
2. Re-tokenize until `endState` matches cached state
3. Stop when state stabilizes

### Consequences

- **Positive**: Only changed region re-tokenized
- **Negative**: Cache memory usage, invalidation complexity

---

## Decision Summary

| ADR | Decision                    | Key Rationale                           |
| --- | --------------------------- | --------------------------------------- |
| 001 | EditContext + Fallback      | Best architecture with browser coverage |
| 002 | Strategy Pattern            | Clean separation, testability           |
| 003 | Array of Lines              | Balance of simplicity and performance   |
| 004 | Monarch-Style Tokenizer     | Multi-line support, no WASM dependency  |
| 005 | Separate Tokenizer/Language | Sync highlighting, async intelligence   |
| 006 | Recursive Descent Parser    | Full control, good error recovery       |
| 007 | Scope Tree                  | Correct variable resolution             |
| 008 | Debounced Analysis          | Responsive UI, efficient parsing        |
| 009 | Context-Aware Completions   | Relevant suggestions                    |
| 010 | Incremental Tokenization    | Performance for large files             |
