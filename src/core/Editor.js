/**
 * @fileoverview Main Editor class - entry point for the code editor
 * @module core/Editor
 *
 * EditContext-based code editor implementation.
 * Falls back to hidden textarea for unsupported browsers.
 */

import { InputHandler, isEditContextSupported } from '../input/InputHandler.js';
import { Document } from '../model/Document.js';
import { Selection } from '../model/Selection.js';
import { SelectionCollection } from '../model/SelectionCollection.js';
import { EditorView } from '../view/EditorView.js';

// ============================================
// Constants
// ============================================

const DEFAULT_OPTIONS = {
  value: '',
  language: 'javascript',
  readOnly: false,
  tabSize: 2,
  lineHeight: 20,
  fontSize: 14,
  fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
};

// ============================================
// Class Definition
// ============================================

/**
 * Main code editor class.
 * Provides a unified API for text editing with EditContext support.
 *
 * @example
 * const editor = new Editor(document.getElementById('editor'), {
 *   value: 'const x = 1;',
 *   language: 'javascript'
 * });
 */
export class Editor {
  // ----------------------------------------
  // Instance Properties
  // ----------------------------------------
  _container = null;
  _options = null;
  _document = null;
  _view = null;
  _inputHandler = null;
  _selections = null; // SelectionCollection - initialized in constructor
  _undoStack = [];
  _redoStack = [];
  _listeners = new Map();
  _disposed = false;
  _batchingUndo = false; // For grouping multi-cursor edits

  // ----------------------------------------
  // Constructor
  // ----------------------------------------

  /**
   * @param {HTMLElement} container - DOM element to mount editor
   * @param {Object} options - Editor configuration
   */
  constructor(container, options = {}) {
    if (!container || !(container instanceof HTMLElement)) {
      throw new Error('Editor requires a valid DOM element');
    }

    this._container = container;
    this._options = { ...DEFAULT_OPTIONS, ...options };

    this._initialize();
  }

  // ----------------------------------------
  // Initialization
  // ----------------------------------------

  _initialize() {
    // Create document model
    this._document = new Document(this._options.value);

    // Initialize selection collection
    this._selections = new SelectionCollection();

    // Create view with language option for tokenizer
    this._view = new EditorView(this._container, this, {
      lineHeight: this._options.lineHeight,
      fontSize: this._options.fontSize,
      fontFamily: this._options.fontFamily,
      tabSize: this._options.tabSize,
      language: this._options.language,
    });

    // Create input handler (EditContext or fallback)
    this._inputHandler = new InputHandler(this._view.contentElement, this);

    // Track document changes for undo
    this._document.on('change', (change) => this._onDocumentChange(change));

    // Log input mode
    console.log(`[Editor] Initialized with ${this._inputHandler.getMode()} input`);
    console.log(`[Editor] EditContext supported: ${isEditContextSupported()}`);
  }

  // ----------------------------------------
  // Document Change Handling
  // ----------------------------------------

  _onDocumentChange(change) {
    // Skip undo tracking during batch operations (handled separately)
    if (!this._batchingUndo) {
      // Add to undo stack
      this._undoStack.push({
        type: 'replace',
        startOffset: change.startOffset,
        deletedText: change.deletedText,
        insertedText: change.insertedText,
        selectionsBefore: this._selections.clone(),
      });

      // Clear redo stack on new change
      this._redoStack = [];
    }

    // Emit change event
    this.emit('change', change);
  }

  // ----------------------------------------
  // Selection Management
  // ----------------------------------------

  /**
   * Get primary selection (normalized so start <= end)
   * For backward compatibility with single-cursor code
   * @returns {{ start: number, end: number }}
   */
  getSelection() {
    const primary = this._selections.primary;
    return { start: primary.start, end: primary.end };
  }

  /**
   * Get raw primary selection without normalization
   * Use this when you need to know the actual anchor vs cursor position
   * (e.g., for selection extension with arrow keys)
   * @returns {{ start: number, end: number }}
   */
  getRawSelection() {
    const primary = this._selections.primary;
    return { start: primary.anchor, end: primary.cursor };
  }

  /**
   * Get all selections
   * @returns {SelectionCollection}
   */
  getSelections() {
    return this._selections;
  }

  /**
   * Set single selection (replaces all cursors)
   * For backward compatibility with single-cursor code
   * @param {number} start - Selection start offset
   * @param {number} end - Selection end offset
   */
  setSelection(start, end) {
    const docLength = this._document.getLength();
    const clampedStart = Math.max(0, Math.min(start, docLength));
    const clampedEnd = Math.max(0, Math.min(end, docLength));
    const isReversed = start > end;

    this._selections.setSingle(isReversed ? clampedEnd : clampedStart, isReversed ? clampedStart : clampedEnd, isReversed);

    // Scroll cursor into view
    this._view.scrollToCursor();

    this.emit('selectionChange', this._selections);
  }

  /**
   * Set all selections at once
   * @param {Array<Selection|{start: number, end: number}>} selections - New selections
   */
  setSelections(selections) {
    const docLength = this._document.getLength();

    // Clamp all selections to document bounds
    const clampedSelections = selections.map((sel) => {
      const start = Math.max(0, Math.min(sel.start, docLength));
      const end = Math.max(0, Math.min(sel.end, docLength));
      if (sel instanceof Selection) {
        return sel.withOffsets(start, end);
      }
      // For plain objects, use fromObject which handles direction correctly
      return Selection.fromObject({ start, end });
    });

    this._selections.setAll(clampedSelections);
    this._view.scrollToCursor();
    this.emit('selectionChange', this._selections);
  }

  /**
   * Add a new cursor at offset (keeps existing cursors)
   * @param {number} offset - Cursor position
   */
  addCursor(offset) {
    const docLength = this._document.getLength();
    const clamped = Math.max(0, Math.min(offset, docLength));

    // Don't add duplicate cursor at same position
    if (this._selections.hasCursorAt(clamped)) {
      return;
    }

    this._selections.add(Selection.cursor(clamped));
    this.emit('selectionChange', this._selections);
  }

  /**
   * Add a new selection (keeps existing selections)
   * @param {number} start - Selection start (anchor)
   * @param {number} end - Selection end (cursor)
   */
  addSelection(start, end) {
    const docLength = this._document.getLength();
    const clampedStart = Math.max(0, Math.min(start, docLength));
    const clampedEnd = Math.max(0, Math.min(end, docLength));

    // Don't add duplicate selection
    const minPos = Math.min(clampedStart, clampedEnd);
    const maxPos = Math.max(clampedStart, clampedEnd);
    if (this._selections.hasSelectionAt(minPos, maxPos)) {
      return;
    }

    this._selections.add(Selection.range(clampedStart, clampedEnd));
    this._view.scrollToCursor();
    this.emit('selectionChange', this._selections);
  }

  /**
   * Check if there are multiple cursors
   * @returns {boolean}
   */
  hasMultipleCursors() {
    return this._selections.isMultiple;
  }

  /**
   * Collapse to single primary cursor
   */
  collapseToSingleCursor() {
    if (this._selections.isMultiple) {
      this._selections.collapseToSingle();
      this.emit('selectionChange', this._selections);
    }
  }

  /**
   * Get selected text from primary selection
   * @returns {string}
   */
  getSelectedText() {
    const { start, end } = this.getSelection();
    if (start === end) return '';
    return this._document.getTextRange(start, end);
  }

  /**
   * Get selected text from all selections
   * @returns {string[]}
   */
  getAllSelectedTexts() {
    return this._selections.all.map((sel) => {
      if (sel.isEmpty) return '';
      return this._document.getTextRange(sel.start, sel.end);
    });
  }

  // ----------------------------------------
  // Undo/Redo
  // ----------------------------------------

  /**
   * Undo last change
   */
  undo() {
    if (this._undoStack.length === 0) return;

    const action = this._undoStack.pop();

    this._batchingUndo = true;

    if (action.type === 'multiCursor') {
      // Multi-cursor undo: reverse all changes in forward order
      const changes = [...action.changes].reverse();
      for (const change of changes) {
        this._document.replaceRange(change.startOffset, change.startOffset + change.insertedText.length, change.deletedText);
      }
    } else {
      // Single change undo
      const { startOffset, deletedText, insertedText } = action;
      this._document.replaceRange(startOffset, startOffset + insertedText.length, deletedText);
    }

    this._batchingUndo = false;

    // Restore selections from before the change
    const { selectionsBefore } = action;
    if (selectionsBefore instanceof SelectionCollection) {
      this._selections = selectionsBefore.clone();
    } else if (selectionsBefore) {
      // Legacy format: { start, end }
      this._selections.setSingle(selectionsBefore.start, selectionsBefore.end);
    }

    this._view.scrollToCursor();
    this.emit('selectionChange', this._selections);

    this._redoStack.push(action);
  }

  /**
   * Redo last undone change
   */
  redo() {
    if (this._redoStack.length === 0) return;

    const action = this._redoStack.pop();

    this._batchingUndo = true;

    if (action.type === 'multiCursor') {
      // Multi-cursor redo: apply all changes in reverse order (highest offset first)
      for (const change of action.changes) {
        this._document.replaceRange(change.startOffset, change.startOffset + change.deletedText.length, change.insertedText);
      }

      // Calculate new cursor positions
      const originalSels = action.selectionsBefore.sorted(false);
      const newSelections = [];
      let cumulativeOffset = 0;

      for (const sel of originalSels) {
        const deletedLength = sel.end - sel.start;
        const insertedLength = action.changes[0]?.insertedText.length || 0;
        const newPos = sel.start + cumulativeOffset + insertedLength;
        newSelections.push(Selection.cursor(newPos));
        cumulativeOffset += insertedLength - deletedLength;
      }

      this._selections.setAll(newSelections);
    } else {
      // Single change redo
      const { startOffset, deletedText, insertedText } = action;
      this._document.replaceRange(startOffset, startOffset + deletedText.length, insertedText);

      const newOffset = startOffset + insertedText.length;
      this._selections.setSingle(newOffset, newOffset);
    }

    this._batchingUndo = false;

    this._view.scrollToCursor();
    this.emit('selectionChange', this._selections);

    this._undoStack.push(action);
  }

  /**
   * Check if undo is available
   */
  canUndo() {
    return this._undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo() {
    return this._redoStack.length > 0;
  }

  // ----------------------------------------
  // Public API - Text Operations
  // ----------------------------------------

  /**
   * Get entire document text
   * @returns {string}
   */
  getValue() {
    return this._document.getText();
  }

  /**
   * Set entire document text
   * @param {string} text
   */
  setValue(text) {
    this._document.setText(text);
    this.setSelection(0, 0);
  }

  /**
   * Insert text at all cursor positions
   * For multi-cursor: processes in reverse order to maintain correct offsets
   * @param {string} text
   */
  insertText(text) {
    if (!this._selections.isMultiple) {
      // Single cursor: simple case
      const { start, end } = this.getSelection();
      this._document.replaceRange(start, end, text);
      this._selections.setSingle(start + text.length, start + text.length);
      this._view.scrollToCursor();
      this.emit('selectionChange', this._selections);
      return;
    }

    // Multi-cursor: process in reverse order and batch undo
    this._insertTextAtAllCursors(text);
  }

  /**
   * Insert text at all cursors (internal method for multi-cursor)
   * @private
   * @param {string} text - Text to insert
   */
  _insertTextAtAllCursors(text) {
    // Store selections before for undo
    const selectionsBefore = this._selections.clone();

    // Get selections sorted by offset (descending for reverse processing)
    const sortedSels = this._selections.sorted(true);

    // Start batch undo - we'll create a single undo entry for all changes
    this._batchingUndo = true;

    // Track all changes for a combined undo entry
    const changes = [];

    // Process each selection from end to start
    for (const sel of sortedSels) {
      const deletedText = sel.isEmpty ? '' : this._document.getTextRange(sel.start, sel.end);

      this._document.replaceRange(sel.start, sel.end, text);

      changes.push({
        startOffset: sel.start,
        deletedLength: sel.end - sel.start,
        deletedText,
        insertedText: text,
      });
    }

    this._batchingUndo = false;

    // Create combined undo entry
    // For simplicity, we store the first change's data
    // Full multi-cursor undo would need to store all changes
    if (changes.length > 0) {
      this._undoStack.push({
        type: 'multiCursor',
        changes: changes,
        selectionsBefore: selectionsBefore,
      });
      this._redoStack = [];
    }

    // Update all selections to point after inserted text
    // Work forward through original order, tracking cumulative offset
    const originalSels = selectionsBefore.sorted(false);
    const newSelections = [];
    let cumulativeOffset = 0;

    for (const sel of originalSels) {
      const deletedLength = sel.end - sel.start;
      const newPos = sel.start + cumulativeOffset + text.length;
      newSelections.push(Selection.cursor(newPos));
      cumulativeOffset += text.length - deletedLength;
    }

    this._selections.setAll(newSelections);
    this._view.scrollToCursor();
    this.emit('selectionChange', this._selections);
  }

  /**
   * Delete text at all cursors (for backspace/delete operations)
   * @param {boolean} forward - True for delete, false for backspace
   * @param {boolean} byWord - True for Ctrl+Backspace/Delete
   */
  deleteAtAllCursors(forward = false, byWord = false) {
    if (!this._selections.isMultiple) {
      // Single cursor is handled by input handlers
      return false;
    }

    const selectionsBefore = this._selections.clone();

    // Step 1: Pre-calculate all delete ranges BEFORE any modifications
    // This ensures word boundaries are computed on the original document
    const deleteRanges = [];
    const ascendingSels = this._selections.sorted(false); // ascending order

    for (const sel of ascendingSels) {
      let deleteStart = sel.start;
      let deleteEnd = sel.end;

      if (sel.isEmpty) {
        if (forward) {
          if (byWord) {
            deleteEnd = this._findWordBoundary(sel.start, 1);
          } else {
            deleteEnd = Math.min(sel.start + 1, this._document.getLength());
          }
        } else {
          if (byWord) {
            deleteStart = this._findWordBoundary(sel.start, -1);
          } else {
            deleteStart = Math.max(sel.start - 1, 0);
          }
        }
      }

      deleteRanges.push({
        start: deleteStart,
        end: deleteEnd,
        cursorPos: forward ? deleteStart : deleteStart, // Where cursor should be after delete
      });
    }

    // Step 2: Perform deletions from end to start to preserve offsets
    this._batchingUndo = true;
    const changes = [];

    // Process in reverse order (descending by offset)
    for (let i = deleteRanges.length - 1; i >= 0; i--) {
      const range = deleteRanges[i];
      if (range.start !== range.end) {
        const deletedText = this._document.getTextRange(range.start, range.end);
        this._document.replaceRange(range.start, range.end, '');
        changes.unshift({
          startOffset: range.start,
          deletedLength: range.end - range.start,
          deletedText,
          insertedText: '',
        });
      }
    }

    this._batchingUndo = false;

    if (changes.length > 0) {
      this._undoStack.push({
        type: 'multiCursor',
        changes,
        selectionsBefore,
      });
      this._redoStack = [];
    }

    // Step 3: Calculate new cursor positions
    // Process in ascending order, tracking cumulative offset changes
    const newSelections = [];
    let cumulativeOffset = 0;

    for (let i = 0; i < deleteRanges.length; i++) {
      const range = deleteRanges[i];
      const deleteLength = range.end - range.start;

      // New cursor position is the delete start (where text was removed)
      // adjusted by how much text was deleted before this position
      const newPos = range.cursorPos + cumulativeOffset;
      newSelections.push(Selection.cursor(Math.max(0, newPos)));

      // Update cumulative offset for subsequent cursors
      cumulativeOffset -= deleteLength;
    }

    this._selections.setAll(newSelections);
    this._view.scrollToCursor();
    this.emit('selectionChange', this._selections);

    return true;
  }

  /**
   * Move all cursors to line edge (Home/End key navigation)
   * Home key behavior (VS Code style):
   * - If cursor is NOT at first non-whitespace: go to first non-whitespace
   * - If cursor IS at first non-whitespace: go to column 0
   * @param {string} edge - 'start' for Home, 'end' for End
   * @param {boolean} shiftKey - Whether to extend selection
   * @param {boolean} modKey - Whether Ctrl/Cmd is held (document start/end)
   */
  moveAllCursorsToLineEdge(edge, shiftKey = false, modKey = false) {
    const doc = this._document;
    const newSelections = [];

    for (const sel of this._selections.all) {
      const anchor = sel.anchor;
      const cursor = sel.cursor;

      let newOffset;

      if (edge === 'start') {
        if (modKey) {
          // Ctrl+Home: go to document start
          newOffset = 0;
        } else {
          // Home: smart home behavior
          const pos = doc.offsetToPosition(cursor);
          const line = doc.getLine(pos.line);
          const lineStart = doc.positionToOffset(pos.line, 0);

          // Find first non-whitespace character position
          const firstNonWhitespace = line.search(/\S/);
          const indentEnd = firstNonWhitespace === -1 ? 0 : firstNonWhitespace;

          // If cursor is at indent end, go to line start (column 0)
          // Otherwise, go to indent end
          if (pos.column === indentEnd) {
            newOffset = lineStart;
          } else {
            newOffset = lineStart + indentEnd;
          }
        }
      } else {
        if (modKey) {
          // Ctrl+End: go to document end
          newOffset = doc.getLength();
        } else {
          // End: go to line end
          const pos = doc.offsetToPosition(cursor);
          newOffset = doc.positionToOffset(pos.line, doc.getLine(pos.line).length);
        }
      }

      if (shiftKey) {
        // Extend selection: keep anchor, move cursor
        newSelections.push(Selection.range(anchor, newOffset));
      } else {
        // Move cursor (no selection)
        newSelections.push(Selection.cursor(newOffset));
      }
    }

    this._selections.setAll(newSelections);
    this._view.scrollToCursor();
    this.emit('selectionChange', this._selections);
  }

  /**
   * Move all cursors in a direction (for arrow key navigation)
   * @param {string} direction - 'left', 'right', 'up', 'down'
   * @param {boolean} shiftKey - Whether to extend selection
   * @param {boolean} modKey - Whether Ctrl/Cmd is held (word/paragraph movement)
   */
  moveAllCursors(direction, shiftKey = false, modKey = false) {
    const doc = this._document;
    const newSelections = [];

    for (const sel of this._selections.all) {
      // Get raw anchor and cursor positions
      const anchor = sel.anchor;
      const cursor = sel.cursor;
      const selMin = sel.start;
      const selMax = sel.end;

      let startPos = anchor;
      let currentPos = cursor;

      // If no shift and there's a selection, collapse to edge
      if (!shiftKey && !sel.isEmpty) {
        if (direction === 'left' || direction === 'up') {
          startPos = currentPos = selMin;
        } else {
          startPos = currentPos = selMax;
        }
      }

      let newOffset = currentPos;
      const pos = doc.offsetToPosition(currentPos);

      switch (direction) {
        case 'left':
          if (modKey) {
            newOffset = this._findWordBoundary(currentPos, -1);
          } else {
            newOffset = Math.max(0, currentPos - 1);
          }
          break;

        case 'right':
          if (modKey) {
            newOffset = this._findWordBoundary(currentPos, 1);
          } else {
            newOffset = Math.min(doc.getLength(), currentPos + 1);
          }
          break;

        case 'up':
          if (pos.line > 0) {
            const targetLine = pos.line - 1;
            const targetCol = Math.min(pos.column, doc.getLine(targetLine).length);
            newOffset = doc.positionToOffset(targetLine, targetCol);
          }
          break;

        case 'down':
          if (pos.line < doc.getLineCount() - 1) {
            const targetLine = pos.line + 1;
            const targetCol = Math.min(pos.column, doc.getLine(targetLine).length);
            newOffset = doc.positionToOffset(targetLine, targetCol);
          }
          break;
      }

      if (shiftKey) {
        // Extend selection: keep anchor, move cursor
        newSelections.push(Selection.range(startPos, newOffset));
      } else {
        // Move cursor (no selection)
        newSelections.push(Selection.cursor(newOffset));
      }
    }

    this._selections.setAll(newSelections);
    this._view.scrollToCursor();
    this.emit('selectionChange', this._selections);
  }

  /**
   * Find word boundary from offset (VS Code style)
   * Word characters: letters, digits, underscore
   * Special stop chars: quotes, backticks, template literal markers
   * @private
   * @param {number} offset - Starting offset
   * @param {number} direction - -1 for backward, 1 for forward
   * @returns {number} - Offset of word boundary
   */
  _findWordBoundary(offset, direction) {
    const text = this._document.getText();
    let pos = offset;

    // Character classification
    const isWordChar = (char) => /[\w]/.test(char); // letters, digits, underscore
    const isWhitespace = (char) => /\s/.test(char);
    // Stop chars: each of these is treated as a single boundary
    const isStopChar = (char) => /[`'"(){}[\],;]/.test(char);

    if (direction < 0) {
      // Ctrl+Left: Move to start of current/previous word
      if (pos === 0) return 0;

      // Step 1: Skip whitespace going backward
      while (pos > 0 && isWhitespace(text[pos - 1])) {
        pos--;
      }

      if (pos === 0) return 0;

      // Step 2: Check what kind of character we're at
      const charBefore = text[pos - 1];

      if (isWordChar(charBefore)) {
        // At end of word: move to start of word
        while (pos > 0 && isWordChar(text[pos - 1])) {
          pos--;
        }
      } else if (isStopChar(charBefore)) {
        // Stop chars: move back one char only
        pos--;
      } else {
        // Other punctuation (operators like . = + -): move through consecutive same-type
        while (pos > 0 && !isWordChar(text[pos - 1]) && !isWhitespace(text[pos - 1]) && !isStopChar(text[pos - 1])) {
          pos--;
        }
      }
    } else {
      // Ctrl+Right: Move through current token (VS Code style)
      if (pos >= text.length) return text.length;

      const charAtPos = text[pos];

      if (isWhitespace(charAtPos)) {
        // At whitespace: skip whitespace, then move through next token
        while (pos < text.length && isWhitespace(text[pos])) {
          pos++;
        }
        // Now at next token - apply same logic (non-recursive)
        if (pos < text.length) {
          const nextChar = text[pos];
          if (isWordChar(nextChar)) {
            while (pos < text.length && isWordChar(text[pos])) {
              pos++;
            }
          } else if (isStopChar(nextChar)) {
            pos++; // Single stop char
          } else {
            // Other punctuation followed by word
            while (pos < text.length && !isWordChar(text[pos]) && !isWhitespace(text[pos]) && !isStopChar(text[pos])) {
              pos++;
            }
            while (pos < text.length && isWordChar(text[pos])) {
              pos++;
            }
          }
        }
      } else if (isWordChar(charAtPos)) {
        // At word: move to end of word
        while (pos < text.length && isWordChar(text[pos])) {
          pos++;
        }
      } else if (isStopChar(charAtPos)) {
        // Stop char: move past just this one char
        pos++;
      } else {
        // Other punctuation (like .): move through consecutive, then through following word
        while (pos < text.length && !isWordChar(text[pos]) && !isWhitespace(text[pos]) && !isStopChar(text[pos])) {
          pos++;
        }
        // If followed directly by word chars, continue through word
        while (pos < text.length && isWordChar(text[pos])) {
          pos++;
        }
      }
    }

    return pos;
  }

  /**
   * Get cursor position as line/column
   * @returns {{ line: number, column: number }}
   */
  getCursorPosition() {
    const primary = this._selections.primary;
    return this._document.offsetToPosition(primary.end);
  }

  /**
   * Set cursor position
   * @param {number} line
   * @param {number} column
   */
  setCursorPosition(line, column) {
    const offset = this._document.positionToOffset(line, column);
    this.setSelection(offset, offset);
  }

  /**
   * Set editor language for syntax highlighting
   * @param {string} language - Language identifier (javascript, html, css)
   */
  setLanguage(language) {
    this._options.language = language;
    this._view.setLanguage(language);
  }

  /**
   * Get current language
   * @returns {string}
   */
  getLanguage() {
    return this._options.language;
  }

  // ----------------------------------------
  // Focus Management
  // ----------------------------------------

  /**
   * Focus the editor
   */
  focus() {
    this._inputHandler.focus();
  }

  /**
   * Check if editor is focused
   * @returns {boolean}
   */
  isFocused() {
    return this._inputHandler.isFocused();
  }

  // ----------------------------------------
  // Event System
  // ----------------------------------------

  /**
   * Subscribe to editor events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);

    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from editor events
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event
   * @param {string} event
   * @param {*} data
   */
  emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (err) {
          console.error(`Error in ${event} handler:`, err);
        }
      });
    }
  }

  // ----------------------------------------
  // Getters
  // ----------------------------------------

  get document() {
    return this._document;
  }

  get view() {
    return this._view;
  }

  get inputMode() {
    return this._inputHandler.getMode();
  }

  get isEditContextSupported() {
    return isEditContextSupported();
  }

  // ----------------------------------------
  // Cleanup
  // ----------------------------------------

  /**
   * Dispose editor and release resources
   */
  dispose() {
    if (this._disposed) return;

    this._inputHandler?.dispose();
    this._view?.dispose();
    this._listeners.clear();
    this._undoStack = [];
    this._redoStack = [];

    this._disposed = true;
  }
}

// ============================================
// Static Methods
// ============================================

/**
 * Check if EditContext API is available
 * @static
 * @returns {boolean}
 */
Editor.isEditContextSupported = isEditContextSupported;

