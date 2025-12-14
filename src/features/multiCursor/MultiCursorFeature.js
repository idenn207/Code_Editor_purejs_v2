/**
 * @fileoverview Multi-cursor feature - Alt+Click, Ctrl+Alt+Arrow, Ctrl+D, Escape
 * @module features/multiCursor/MultiCursorFeature
 *
 * Provides multi-cursor support:
 * - Alt+Click: Add cursor at click position
 * - Ctrl+Alt+Up/Down: Add cursor above/below
 * - Ctrl+D: Select next occurrence
 * - Escape: Collapse to single cursor
 */

(function(CodeEditor) {
  'use strict';

  // Get dependencies
  var Selection = CodeEditor.Selection;

  // ============================================
  // Class Definition
  // ============================================

  /**
   * Multi-cursor feature for the code editor.
   * Enables adding and managing multiple cursors.
   *
   * @example
   * var multiCursor = new MultiCursorFeature(editor);
   */
  class MultiCursorFeature {
    // ----------------------------------------
    // Instance Properties
    // ----------------------------------------
    _editor = null;
    _enabled = true;
    _boundHandleKeyDown = null;
    _boundHandleMouseDown = null;

    // ----------------------------------------
    // Constructor
    // ----------------------------------------

    /**
     * @param {Object} editor - Editor instance
     * @param {Object} options - Configuration options
     * @param {boolean} options.enabled - Whether feature is enabled (default: true)
     */
    constructor(editor, options = {}) {
      this._editor = editor;
      this._enabled = options.enabled !== false;

      this._bindEvents();
    }

    // ----------------------------------------
    // Event Binding
    // ----------------------------------------

    _bindEvents() {
      var self = this;

      this._boundHandleKeyDown = function(e) {
        self._handleKeyDown(e);
      };
      this._boundHandleMouseDown = function(e) {
        self._handleMouseDown(e);
      };

      // Capture phase to intercept before other handlers
      this._editor.view.contentElement.addEventListener(
        'keydown',
        this._boundHandleKeyDown,
        true
      );
      this._editor.view.contentElement.addEventListener(
        'mousedown',
        this._boundHandleMouseDown,
        true
      );
    }

    // ----------------------------------------
    // Event Handlers
    // ----------------------------------------

    _handleKeyDown(event) {
      if (!this._enabled) return;

      var key = event.key;
      var ctrlKey = event.ctrlKey;
      var metaKey = event.metaKey;
      var altKey = event.altKey;
      var shiftKey = event.shiftKey;
      var modKey = ctrlKey || metaKey;

      // Escape: collapse to single cursor
      if (key === 'Escape' && this._editor.hasMultipleCursors()) {
        event.preventDefault();
        event.stopPropagation();
        this._editor.collapseToSingleCursor();
        return;
      }

      // Ctrl+Alt+Up: Add cursor above
      if (modKey && altKey && key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        this._addCursorsAbove();
        return;
      }

      // Ctrl+Alt+Down: Add cursor below
      if (modKey && altKey && key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        this._addCursorsBelow();
        return;
      }

      // Ctrl+D: Select next occurrence
      if (modKey && !altKey && !shiftKey && key === 'd') {
        event.preventDefault();
        event.stopPropagation();
        this._selectNextOccurrence();
        return;
      }
    }

    _handleMouseDown(event) {
      if (!this._enabled) return;

      // Alt+Click: Add cursor at position
      if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        this._addCursorAtClick(event);
        return;
      }
    }

    // ----------------------------------------
    // Multi-Cursor Operations
    // ----------------------------------------

    /**
     * Add cursor at mouse click position
     * @param {MouseEvent} event
     */
    _addCursorAtClick(event) {
      var position = this._editor.view.getPositionFromPoint(
        event.clientX,
        event.clientY
      );

      if (position === null) return;

      var offset = this._editor.document.positionToOffset(
        position.line,
        position.column
      );

      this._editor.addCursor(offset);
    }

    /**
     * Add cursors on the line above each existing cursor (VS Code style)
     */
    _addCursorsAbove() {
      var doc = this._editor.document;
      var selections = this._editor.getSelections();
      var newSelections = [];

      // Get all current selections
      for (var i = 0; i < selections.all.length; i++) {
        var sel = selections.all[i];
        // Keep existing selection
        newSelections.push(sel.clone());

        // Calculate position for new cursor above
        var pos = doc.offsetToPosition(sel.cursor);

        if (pos.line > 0) {
          var targetLine = pos.line - 1;
          var targetLineLength = doc.getLine(targetLine).length;
          var targetCol = Math.min(pos.column, targetLineLength);
          var newOffset = doc.positionToOffset(targetLine, targetCol);

          // Add new cursor if not already at this position
          if (!selections.hasCursorAt(newOffset)) {
            newSelections.push(Selection.cursor(newOffset));
          }
        }
      }

      // Update all selections
      if (newSelections.length > selections.count) {
        this._editor.setSelections(newSelections);
      }
    }

    /**
     * Add cursors on the line below each existing cursor (VS Code style)
     */
    _addCursorsBelow() {
      var doc = this._editor.document;
      var selections = this._editor.getSelections();
      var newSelections = [];
      var lineCount = doc.getLineCount();

      // Get all current selections
      for (var i = 0; i < selections.all.length; i++) {
        var sel = selections.all[i];
        // Keep existing selection
        newSelections.push(sel.clone());

        // Calculate position for new cursor below
        var pos = doc.offsetToPosition(sel.cursor);

        if (pos.line < lineCount - 1) {
          var targetLine = pos.line + 1;
          var targetLineLength = doc.getLine(targetLine).length;
          var targetCol = Math.min(pos.column, targetLineLength);
          var newOffset = doc.positionToOffset(targetLine, targetCol);

          // Add new cursor if not already at this position
          if (!selections.hasCursorAt(newOffset)) {
            newSelections.push(Selection.cursor(newOffset));
          }
        }
      }

      // Update all selections
      if (newSelections.length > selections.count) {
        this._editor.setSelections(newSelections);
      }
    }

    /**
     * Select the next occurrence of the currently selected text (Ctrl+D)
     */
    _selectNextOccurrence() {
      var selections = this._editor.getSelections();
      var primarySel = selections.primary;

      // If no selection, select the word at cursor first
      if (primarySel.isEmpty) {
        this._selectWordAtCursor();
        return;
      }

      // Get the text to search for
      var selectedText = this._editor.document.getTextRange(
        primarySel.start,
        primarySel.end
      );

      if (!selectedText) return;

      // Find the next occurrence after the last selection
      var allSelections = selections.all;
      var lastEnd = 0;
      for (var i = 0; i < allSelections.length; i++) {
        if (allSelections[i].end > lastEnd) {
          lastEnd = allSelections[i].end;
        }
      }

      var text = this._editor.document.getText();
      var nextIndex = text.indexOf(selectedText, lastEnd);
      var wrapped = false;

      // Wrap around to beginning if not found
      if (nextIndex === -1) {
        nextIndex = text.indexOf(selectedText, 0);
        wrapped = true;
      }

      // Helper to check if an index is already selected
      var isSelected = function(idx) {
        for (var j = 0; j < allSelections.length; j++) {
          var s = allSelections[j];
          if (s.start === idx && s.end === idx + selectedText.length) {
            return true;
          }
        }
        return false;
      };

      // If already selected, keep searching for next unselected occurrence
      while (nextIndex !== -1 && isSelected(nextIndex)) {
        var searchFrom = nextIndex + selectedText.length;
        nextIndex = text.indexOf(selectedText, searchFrom);

        // Wrap around if needed (but only once)
        if (nextIndex === -1 && !wrapped) {
          nextIndex = text.indexOf(selectedText, 0);
          wrapped = true;
        }

        // Stop if we've wrapped and reached back to where we started
        if (wrapped && nextIndex >= lastEnd) {
          nextIndex = -1;
          break;
        }
      }

      if (nextIndex !== -1 && !isSelected(nextIndex)) {
        this._editor.addSelection(nextIndex, nextIndex + selectedText.length);
      }
    }

    /**
     * Select the word at the current cursor position
     */
    _selectWordAtCursor() {
      var offset = this._editor.getSelection().end;
      var text = this._editor.document.getText();

      // Find word boundaries
      var start = offset;
      var end = offset;
      var wordRegex = /\w/;

      // Move start backward to word beginning
      while (start > 0 && wordRegex.test(text[start - 1])) {
        start--;
      }

      // Move end forward to word end
      while (end < text.length && wordRegex.test(text[end])) {
        end++;
      }

      // Select the word if found
      if (start !== end) {
        this._editor.setSelection(start, end);
      }
    }

    // ----------------------------------------
    // Public API
    // ----------------------------------------

    /**
     * Enable multi-cursor feature
     */
    enable() {
      this._enabled = true;
    }

    /**
     * Disable multi-cursor feature
     */
    disable() {
      this._enabled = false;
    }

    /**
     * Check if feature is enabled
     * @returns {boolean}
     */
    isEnabled() {
      return this._enabled;
    }

    /**
     * Clean up resources
     */
    dispose() {
      if (this._boundHandleKeyDown) {
        this._editor.view.contentElement.removeEventListener(
          'keydown',
          this._boundHandleKeyDown,
          true
        );
      }

      if (this._boundHandleMouseDown) {
        this._editor.view.contentElement.removeEventListener(
          'mousedown',
          this._boundHandleMouseDown,
          true
        );
      }

      this._editor = null;
    }
  }

  // ============================================
  // Export to namespace
  // ============================================

  CodeEditor.Features = CodeEditor.Features || {};
  CodeEditor.Features.MultiCursor = MultiCursorFeature;

})(window.CodeEditor = window.CodeEditor || {});
