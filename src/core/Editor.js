/**
 * @fileoverview Main Editor class - entry point for the code editor
 *
 * EditContext-based code editor implementation.
 * Falls back to hidden textarea for unsupported browsers.
 */

(function(CodeEditor) {
  'use strict';

  var InputHandler = CodeEditor.InputHandler;
  var isEditContextSupported = CodeEditor.isEditContextSupported;
  var Document = CodeEditor.Document;
  var Selection = CodeEditor.Selection;
  var SelectionCollection = CodeEditor.SelectionCollection;
  var EditorView = CodeEditor.EditorView;

  // ============================================
  // Constants
  // ============================================

  var DEFAULT_OPTIONS = {
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
   * var editor = new CodeEditor.Editor(document.getElementById('editor'), {
   *   value: 'const x = 1;',
   *   language: 'javascript'
   * });
   */
  class Editor {
    // ----------------------------------------
    // Instance Properties
    // ----------------------------------------
    _container = null;
    _options = null;
    _document = null;
    _view = null;
    _inputHandler = null;
    _selections = null;
    _undoStack = [];
    _redoStack = [];
    _listeners = new Map();
    _disposed = false;
    _batchingUndo = false;

    // ----------------------------------------
    // Constructor
    // ----------------------------------------

    /**
     * @param {HTMLElement} container - DOM element to mount editor
     * @param {Object} options - Editor configuration
     */
    constructor(container, options) {
      if (!options) options = {};

      if (!container || !(container instanceof HTMLElement)) {
        throw new Error('Editor requires a valid DOM element');
      }

      this._container = container;
      this._options = Object.assign({}, DEFAULT_OPTIONS, options);

      this._initialize();
    }

    // ----------------------------------------
    // Initialization
    // ----------------------------------------

    _initialize() {
      var self = this;

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
      this._document.on('change', function(change) {
        self._onDocumentChange(change);
      });

      // Log input mode
      console.log('[Editor] Initialized with ' + this._inputHandler.getMode() + ' input');
      console.log('[Editor] EditContext supported: ' + isEditContextSupported());
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
      this._emit('change', change);
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
      var primary = this._selections.primary;
      return { start: primary.start, end: primary.end };
    }

    /**
     * Get raw primary selection without normalization
     * Use this when you need to know the actual anchor vs cursor position
     * (e.g., for selection extension with arrow keys)
     * @returns {{ start: number, end: number }}
     */
    getRawSelection() {
      var primary = this._selections.primary;
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
      var docLength = this._document.getLength();
      var clampedStart = Math.max(0, Math.min(start, docLength));
      var clampedEnd = Math.max(0, Math.min(end, docLength));
      var isReversed = start > end;

      this._selections.setSingle(
        isReversed ? clampedEnd : clampedStart,
        isReversed ? clampedStart : clampedEnd,
        isReversed
      );

      // Scroll cursor into view
      this._view.scrollToCursor();

      this._emit('selectionChange', this._selections);
    }

    /**
     * Set all selections at once
     * @param {Array<Selection|{start: number, end: number}>} selections - New selections
     */
    setSelections(selections) {
      var self = this;
      var docLength = this._document.getLength();

      // Clamp all selections to document bounds
      var clampedSelections = selections.map(function(sel) {
        var start = Math.max(0, Math.min(sel.start, docLength));
        var end = Math.max(0, Math.min(sel.end, docLength));
        if (sel instanceof Selection) {
          return sel.withOffsets(start, end);
        }
        // For plain objects, use fromObject which handles direction correctly
        return Selection.fromObject({ start: start, end: end });
      });

      this._selections.setAll(clampedSelections);
      this._view.scrollToCursor();
      this._emit('selectionChange', this._selections);
    }

    /**
     * Add a new cursor at offset (keeps existing cursors)
     * @param {number} offset - Cursor position
     */
    addCursor(offset) {
      var docLength = this._document.getLength();
      var clamped = Math.max(0, Math.min(offset, docLength));

      // Don't add duplicate cursor at same position
      if (this._selections.hasCursorAt(clamped)) {
        return;
      }

      this._selections.add(Selection.cursor(clamped));
      this._emit('selectionChange', this._selections);
    }

    /**
     * Add a new selection (keeps existing selections)
     * @param {number} start - Selection start (anchor)
     * @param {number} end - Selection end (cursor)
     */
    addSelection(start, end) {
      var docLength = this._document.getLength();
      var clampedStart = Math.max(0, Math.min(start, docLength));
      var clampedEnd = Math.max(0, Math.min(end, docLength));

      // Don't add duplicate selection
      var minPos = Math.min(clampedStart, clampedEnd);
      var maxPos = Math.max(clampedStart, clampedEnd);
      if (this._selections.hasSelectionAt(minPos, maxPos)) {
        return;
      }

      this._selections.add(Selection.range(clampedStart, clampedEnd));
      this._view.scrollToCursor();
      this._emit('selectionChange', this._selections);
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
        this._emit('selectionChange', this._selections);
      }
    }

    /**
     * Get selected text from primary selection
     * @returns {string}
     */
    getSelectedText() {
      var sel = this.getSelection();
      if (sel.start === sel.end) return '';
      return this._document.getTextRange(sel.start, sel.end);
    }

    /**
     * Get selected text from all selections
     * @returns {string[]}
     */
    getAllSelectedTexts() {
      var self = this;
      return this._selections.all.map(function(sel) {
        if (sel.isEmpty) return '';
        return self._document.getTextRange(sel.start, sel.end);
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

      var action = this._undoStack.pop();

      this._batchingUndo = true;

      if (action.type === 'multiCursor') {
        // Multi-cursor undo: reverse all changes in forward order
        var changes = action.changes.slice().reverse();
        for (var i = 0; i < changes.length; i++) {
          var change = changes[i];
          this._document.replaceRange(
            change.startOffset,
            change.startOffset + change.insertedText.length,
            change.deletedText
          );
        }
      } else {
        // Single change undo
        this._document.replaceRange(
          action.startOffset,
          action.startOffset + action.insertedText.length,
          action.deletedText
        );
      }

      this._batchingUndo = false;

      // Restore selections from before the change
      var selectionsBefore = action.selectionsBefore;
      if (selectionsBefore instanceof SelectionCollection) {
        this._selections = selectionsBefore.clone();
      } else if (selectionsBefore) {
        // Legacy format: { start, end }
        this._selections.setSingle(selectionsBefore.start, selectionsBefore.end);
      }

      this._view.scrollToCursor();
      this._emit('selectionChange', this._selections);

      this._redoStack.push(action);
    }

    /**
     * Redo last undone change
     */
    redo() {
      if (this._redoStack.length === 0) return;

      var action = this._redoStack.pop();

      this._batchingUndo = true;

      if (action.type === 'multiCursor') {
        // Multi-cursor redo: apply all changes in reverse order (highest offset first)
        for (var i = 0; i < action.changes.length; i++) {
          var change = action.changes[i];
          this._document.replaceRange(
            change.startOffset,
            change.startOffset + change.deletedText.length,
            change.insertedText
          );
        }

        // Calculate new cursor positions
        var originalSels = action.selectionsBefore.sorted(false);
        var newSelections = [];
        var cumulativeOffset = 0;

        for (var j = 0; j < originalSels.length; j++) {
          var sel = originalSels[j];
          var deletedLength = sel.end - sel.start;
          var insertedLength = action.changes[0] ? action.changes[0].insertedText.length : 0;
          var newPos = sel.start + cumulativeOffset + insertedLength;
          newSelections.push(Selection.cursor(newPos));
          cumulativeOffset += insertedLength - deletedLength;
        }

        this._selections.setAll(newSelections);
      } else {
        // Single change redo
        this._document.replaceRange(
          action.startOffset,
          action.startOffset + action.deletedText.length,
          action.insertedText
        );

        var newOffset = action.startOffset + action.insertedText.length;
        this._selections.setSingle(newOffset, newOffset);
      }

      this._batchingUndo = false;

      this._view.scrollToCursor();
      this._emit('selectionChange', this._selections);

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
        var sel = this.getSelection();
        this._document.replaceRange(sel.start, sel.end, text);
        this._selections.setSingle(sel.start + text.length, sel.start + text.length);
        this._view.scrollToCursor();
        this._emit('selectionChange', this._selections);
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
      var self = this;

      // Store selections before for undo
      var selectionsBefore = this._selections.clone();

      // Get selections sorted by offset (descending for reverse processing)
      var sortedSels = this._selections.sorted(true);

      // Start batch undo - we'll create a single undo entry for all changes
      this._batchingUndo = true;

      // Track all changes for a combined undo entry
      var changes = [];

      // Process each selection from end to start
      for (var i = 0; i < sortedSels.length; i++) {
        var sel = sortedSels[i];
        var deletedText = sel.isEmpty ? '' : this._document.getTextRange(sel.start, sel.end);

        this._document.replaceRange(sel.start, sel.end, text);

        changes.push({
          startOffset: sel.start,
          deletedLength: sel.end - sel.start,
          deletedText: deletedText,
          insertedText: text,
        });
      }

      this._batchingUndo = false;

      // Create combined undo entry
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
      var originalSels = selectionsBefore.sorted(false);
      var newSelections = [];
      var cumulativeOffset = 0;

      for (var j = 0; j < originalSels.length; j++) {
        var s = originalSels[j];
        var deletedLength = s.end - s.start;
        var newPos = s.start + cumulativeOffset + text.length;
        newSelections.push(Selection.cursor(newPos));
        cumulativeOffset += text.length - deletedLength;
      }

      this._selections.setAll(newSelections);
      this._view.scrollToCursor();
      this._emit('selectionChange', this._selections);
    }

    /**
     * Delete text at all cursors (for backspace/delete operations)
     * @param {boolean} forward - True for delete, false for backspace
     * @param {boolean} byWord - True for Ctrl+Backspace/Delete
     */
    deleteAtAllCursors(forward, byWord) {
      if (forward === undefined) forward = false;
      if (byWord === undefined) byWord = false;

      if (!this._selections.isMultiple) {
        // Single cursor is handled by input handlers
        return false;
      }

      var self = this;
      var selectionsBefore = this._selections.clone();

      // Step 1: Pre-calculate all delete ranges BEFORE any modifications
      var deleteRanges = [];
      var ascendingSels = this._selections.sorted(false);

      for (var i = 0; i < ascendingSels.length; i++) {
        var sel = ascendingSels[i];
        var deleteStart = sel.start;
        var deleteEnd = sel.end;

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
          cursorPos: forward ? deleteStart : deleteStart,
        });
      }

      // Step 2: Perform deletions from end to start to preserve offsets
      this._batchingUndo = true;
      var changes = [];

      // Process in reverse order (descending by offset)
      for (var j = deleteRanges.length - 1; j >= 0; j--) {
        var range = deleteRanges[j];
        if (range.start !== range.end) {
          var deletedText = this._document.getTextRange(range.start, range.end);
          this._document.replaceRange(range.start, range.end, '');
          changes.unshift({
            startOffset: range.start,
            deletedLength: range.end - range.start,
            deletedText: deletedText,
            insertedText: '',
          });
        }
      }

      this._batchingUndo = false;

      if (changes.length > 0) {
        this._undoStack.push({
          type: 'multiCursor',
          changes: changes,
          selectionsBefore: selectionsBefore,
        });
        this._redoStack = [];
      }

      // Step 3: Calculate new cursor positions
      var newSelections = [];
      var cumulativeOffset = 0;

      for (var k = 0; k < deleteRanges.length; k++) {
        var r = deleteRanges[k];
        var deleteLength = r.end - r.start;
        var newPos = r.cursorPos + cumulativeOffset;
        newSelections.push(Selection.cursor(Math.max(0, newPos)));
        cumulativeOffset -= deleteLength;
      }

      this._selections.setAll(newSelections);
      this._view.scrollToCursor();
      this._emit('selectionChange', this._selections);

      return true;
    }

    /**
     * Move all cursors to line edge (Home/End key navigation)
     * @param {string} edge - 'start' for Home, 'end' for End
     * @param {boolean} shiftKey - Whether to extend selection
     * @param {boolean} modKey - Whether Ctrl/Cmd is held (document start/end)
     */
    moveAllCursorsToLineEdge(edge, shiftKey, modKey) {
      if (shiftKey === undefined) shiftKey = false;
      if (modKey === undefined) modKey = false;

      var doc = this._document;
      var newSelections = [];

      var allSels = this._selections.all;
      for (var i = 0; i < allSels.length; i++) {
        var sel = allSels[i];
        var anchor = sel.anchor;
        var cursor = sel.cursor;

        var newOffset;

        if (edge === 'start') {
          if (modKey) {
            // Ctrl+Home: go to document start
            newOffset = 0;
          } else {
            // Home: smart home behavior
            var pos = doc.offsetToPosition(cursor);
            var line = doc.getLine(pos.line);
            var lineStart = doc.positionToOffset(pos.line, 0);

            // Find first non-whitespace character position
            var firstNonWhitespace = line.search(/\S/);
            var indentEnd = firstNonWhitespace === -1 ? 0 : firstNonWhitespace;

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
            var p = doc.offsetToPosition(cursor);
            newOffset = doc.positionToOffset(p.line, doc.getLine(p.line).length);
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
      this._emit('selectionChange', this._selections);
    }

    /**
     * Move all cursors in a direction (for arrow key navigation)
     * @param {string} direction - 'left', 'right', 'up', 'down'
     * @param {boolean} shiftKey - Whether to extend selection
     * @param {boolean} modKey - Whether Ctrl/Cmd is held (word/paragraph movement)
     */
    moveAllCursors(direction, shiftKey, modKey) {
      if (shiftKey === undefined) shiftKey = false;
      if (modKey === undefined) modKey = false;

      var doc = this._document;
      var newSelections = [];

      var allSels = this._selections.all;
      for (var i = 0; i < allSels.length; i++) {
        var sel = allSels[i];
        // Get raw anchor and cursor positions
        var anchor = sel.anchor;
        var cursor = sel.cursor;
        var selMin = sel.start;
        var selMax = sel.end;

        var startPos = anchor;
        var currentPos = cursor;

        // If no shift and there's a selection, collapse to edge
        if (!shiftKey && !sel.isEmpty) {
          if (direction === 'left' || direction === 'up') {
            startPos = currentPos = selMin;
          } else {
            startPos = currentPos = selMax;
          }
        }

        var newOffset = currentPos;
        var pos = doc.offsetToPosition(currentPos);

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
              var targetLineUp = pos.line - 1;
              var targetColUp = Math.min(pos.column, doc.getLine(targetLineUp).length);
              newOffset = doc.positionToOffset(targetLineUp, targetColUp);
            }
            break;

          case 'down':
            if (pos.line < doc.getLineCount() - 1) {
              var targetLineDown = pos.line + 1;
              var targetColDown = Math.min(pos.column, doc.getLine(targetLineDown).length);
              newOffset = doc.positionToOffset(targetLineDown, targetColDown);
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
      this._emit('selectionChange', this._selections);
    }

    /**
     * Find word boundary from offset (VS Code style)
     * @private
     * @param {number} offset - Starting offset
     * @param {number} direction - -1 for backward, 1 for forward
     * @returns {number} - Offset of word boundary
     */
    _findWordBoundary(offset, direction) {
      var text = this._document.getText();
      var pos = offset;

      // Character classification
      var isWordChar = function(char) { return /[\w]/.test(char); };
      var isWhitespace = function(char) { return /[ \t]/.test(char); };
      var isNewline = function(char) { return char === '\n' || char === '\r'; };
      var isStopChar = function(char) { return /[`'"(){}[\],;]/.test(char); };

      if (direction < 0) {
        // Ctrl+Left: Move to start of current/previous word
        if (pos === 0) return 0;

        var charBefore = text[pos - 1];
        if (isNewline(charBefore)) {
          pos--;
          if (pos > 0 && text[pos - 1] === '\r' && text[pos] === '\n') {
            pos--;
          }
          return pos;
        }

        // Skip whitespace going backward (but stop at line boundary)
        while (pos > 0 && isWhitespace(text[pos - 1])) {
          pos--;
        }

        if (pos === 0) return 0;

        if (isNewline(text[pos - 1])) {
          return pos;
        }

        var charBeforeNow = text[pos - 1];

        if (isWordChar(charBeforeNow)) {
          while (pos > 0 && isWordChar(text[pos - 1]) && !isNewline(text[pos - 1])) {
            pos--;
          }
        } else if (isStopChar(charBeforeNow)) {
          pos--;
        } else {
          while (pos > 0 && !isWordChar(text[pos - 1]) && !isWhitespace(text[pos - 1]) && !isStopChar(text[pos - 1]) && !isNewline(text[pos - 1])) {
            pos--;
          }
        }
      } else {
        // Ctrl+Right: Move through current token (VS Code style)
        if (pos >= text.length) return text.length;

        var charAtPos = text[pos];

        if (isNewline(charAtPos)) {
          pos++;
          if (pos < text.length && text[pos - 1] === '\r' && text[pos] === '\n') {
            pos++;
          }
          return pos;
        }

        if (isWhitespace(charAtPos)) {
          while (pos < text.length && isWhitespace(text[pos])) {
            pos++;
          }
          if (pos >= text.length || isNewline(text[pos])) {
            return pos;
          }
          var nextChar = text[pos];
          if (isWordChar(nextChar)) {
            while (pos < text.length && isWordChar(text[pos]) && !isNewline(text[pos])) {
              pos++;
            }
          } else if (isStopChar(nextChar)) {
            pos++;
          } else {
            while (pos < text.length && !isWordChar(text[pos]) && !isWhitespace(text[pos]) && !isStopChar(text[pos]) && !isNewline(text[pos])) {
              pos++;
            }
            while (pos < text.length && isWordChar(text[pos]) && !isNewline(text[pos])) {
              pos++;
            }
          }
        } else if (isWordChar(charAtPos)) {
          while (pos < text.length && isWordChar(text[pos]) && !isNewline(text[pos])) {
            pos++;
          }
        } else if (isStopChar(charAtPos)) {
          pos++;
        } else {
          while (pos < text.length && !isWordChar(text[pos]) && !isWhitespace(text[pos]) && !isStopChar(text[pos]) && !isNewline(text[pos])) {
            pos++;
          }
          while (pos < text.length && isWordChar(text[pos]) && !isNewline(text[pos])) {
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
      var primary = this._selections.primary;
      return this._document.offsetToPosition(primary.end);
    }

    /**
     * Set cursor position
     * @param {number} line
     * @param {number} column
     */
    setCursorPosition(line, column) {
      var offset = this._document.positionToOffset(line, column);
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

      var self = this;
      return function() { self.off(event, callback); };
    }

    /**
     * Unsubscribe from editor events
     * @param {string} event
     * @param {Function} callback
     */
    off(event, callback) {
      var listeners = this._listeners.get(event);
      if (listeners) {
        var index = listeners.indexOf(callback);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }
    }

    /**
     * Emit an event (private)
     * @param {string} event
     * @param {*} data
     */
    _emit(event, data) {
      var listeners = this._listeners.get(event);
      if (listeners) {
        listeners.forEach(function(callback) {
          try {
            callback(data);
          } catch (err) {
            console.error('Error in ' + event + ' handler:', err);
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

      if (this._inputHandler) this._inputHandler.dispose();
      if (this._view) this._view.dispose();
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

  // ============================================
  // Export to Namespace
  // ============================================

  CodeEditor.Editor = Editor;

})(window.CodeEditor = window.CodeEditor || {});
