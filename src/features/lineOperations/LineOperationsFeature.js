/**
 * @fileoverview Line operations feature for code editor
 * @module features/lineOperations/LineOperationsFeature
 *
 * Provides line-level operations:
 * - Ctrl+/: Toggle line comment (language-aware)
 * - Alt+Up/Down: Move line(s) up/down
 * - Alt+Shift+Up/Down: Duplicate line(s) up/down
 */

(function(CodeEditor) {
  'use strict';

  // Get dependencies
  var Selection = CodeEditor.Selection;

  // ============================================
  // Constants
  // ============================================

  // Language-specific comment configurations
  var COMMENT_CONFIG = {
    javascript: { type: 'line', prefix: '//' },
    html: { type: 'block', open: '<!--', close: '-->' },
    css: { type: 'block', open: '/*', close: '*/' }
  };

  // ============================================
  // Helper Functions
  // ============================================

  /**
   * Escape special regex characters in a string
   * @param {string} str
   * @returns {string}
   */
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ============================================
  // Class Definition
  // ============================================

  /**
   * Line operations feature for the code editor.
   * Handles toggle comment, move lines, and duplicate lines.
   *
   * @example
   * var lineOps = new LineOperationsFeature(editor);
   */
  class LineOperationsFeature {
    // ----------------------------------------
    // Instance Properties
    // ----------------------------------------
    _editor = null;
    _enabled = true;
    _boundHandleKeyDown = null;

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
      this._editor.view.contentElement.addEventListener(
        'keydown',
        this._boundHandleKeyDown,
        true // capture phase
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

      // Ctrl+/ or Cmd+/: Toggle line comment
      if (modKey && !altKey && !shiftKey && key === '/') {
        event.preventDefault();
        event.stopPropagation();
        this._toggleLineComment();
        return;
      }

      // Alt+Up: Move line up (no Shift, no Ctrl)
      if (altKey && !modKey && !shiftKey && key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        this._moveLinesUp();
        return;
      }

      // Alt+Down: Move line down (no Shift, no Ctrl)
      if (altKey && !modKey && !shiftKey && key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        this._moveLinesDown();
        return;
      }

      // Alt+Shift+Up: Duplicate lines up
      if (altKey && shiftKey && !modKey && key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        this._duplicateLinesUp();
        return;
      }

      // Alt+Shift+Down: Duplicate lines down
      if (altKey && shiftKey && !modKey && key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        this._duplicateLinesDown();
        return;
      }
    }

    // ----------------------------------------
    // Helper Methods
    // ----------------------------------------

    /**
     * Get merged line ranges affected by all selections
     * @returns {Array<{startLine: number, endLine: number, selections: Array}>}
     */
    _getAffectedLineRanges() {
      var doc = this._editor.document;
      var selections = this._editor.getSelections();
      var ranges = [];

      // Convert each selection to line range
      for (var i = 0; i < selections.all.length; i++) {
        var sel = selections.all[i];
        var startPos = doc.offsetToPosition(sel.start);
        var endPos = doc.offsetToPosition(sel.end);

        // If selection ends at column 0, don't include that line
        // (matches VSCode behavior - selecting up to start of line)
        var endLine = endPos.line;
        if (endPos.column === 0 && endPos.line > startPos.line) {
          endLine = endPos.line - 1;
        }

        ranges.push({
          startLine: startPos.line,
          endLine: endLine,
          selections: [sel]
        });
      }

      // Sort by startLine
      ranges.sort(function(a, b) {
        return a.startLine - b.startLine;
      });

      // Merge overlapping/adjacent ranges
      return this._mergeOverlappingRanges(ranges);
    }

    /**
     * Merge overlapping or adjacent line ranges
     * @param {Array} ranges
     * @returns {Array}
     */
    _mergeOverlappingRanges(ranges) {
      if (ranges.length <= 1) return ranges;

      var merged = [ranges[0]];

      for (var i = 1; i < ranges.length; i++) {
        var current = ranges[i];
        var last = merged[merged.length - 1];

        // Overlapping or adjacent (endLine + 1 >= startLine)
        if (last.endLine + 1 >= current.startLine) {
          last.endLine = Math.max(last.endLine, current.endLine);
          last.selections = last.selections.concat(current.selections);
        } else {
          merged.push(current);
        }
      }

      return merged;
    }

    /**
     * Shift all selections vertically by a line delta
     * @param {number} lineDelta - Number of lines to shift (positive = down, negative = up)
     */
    _shiftSelectionsVertically(lineDelta) {
      var doc = this._editor.document;
      var selections = this._editor.getSelections();
      var newSelections = [];

      for (var i = 0; i < selections.all.length; i++) {
        var sel = selections.all[i];
        var anchorPos = doc.offsetToPosition(sel.anchor);
        var cursorPos = doc.offsetToPosition(sel.cursor);

        var newAnchorLine = anchorPos.line + lineDelta;
        var newCursorLine = cursorPos.line + lineDelta;

        // Clamp to valid line range
        var lineCount = doc.getLineCount();
        newAnchorLine = Math.max(0, Math.min(newAnchorLine, lineCount - 1));
        newCursorLine = Math.max(0, Math.min(newCursorLine, lineCount - 1));

        // Clamp columns to new line lengths
        var newAnchorCol = Math.min(anchorPos.column, doc.getLine(newAnchorLine).length);
        var newCursorCol = Math.min(cursorPos.column, doc.getLine(newCursorLine).length);

        var newAnchor = doc.positionToOffset(newAnchorLine, newAnchorCol);
        var newCursor = doc.positionToOffset(newCursorLine, newCursorCol);

        newSelections.push(Selection.range(newAnchor, newCursor));
      }

      this._editor.setSelections(newSelections);
    }

    /**
     * Save current selection positions (line, column) before document modification
     * @returns {Array<{anchorLine: number, anchorCol: number, cursorLine: number, cursorCol: number}>}
     */
    _saveSelectionPositions() {
      var doc = this._editor.document;
      var selections = this._editor.getSelections();
      var positions = [];

      for (var i = 0; i < selections.all.length; i++) {
        var sel = selections.all[i];
        var anchorPos = doc.offsetToPosition(sel.anchor);
        var cursorPos = doc.offsetToPosition(sel.cursor);

        positions.push({
          anchorLine: anchorPos.line,
          anchorCol: anchorPos.column,
          cursorLine: cursorPos.line,
          cursorCol: cursorPos.column
        });
      }

      return positions;
    }

    /**
     * Restore selections from saved positions with a line delta applied
     * @param {Array} positions - Saved positions from _saveSelectionPositions
     * @param {number} lineDelta - Number of lines to shift (positive = down, negative = up)
     */
    _restoreSelectionPositions(positions, lineDelta) {
      var doc = this._editor.document;
      var newSelections = [];
      var lineCount = doc.getLineCount();

      for (var i = 0; i < positions.length; i++) {
        var pos = positions[i];

        var newAnchorLine = pos.anchorLine + lineDelta;
        var newCursorLine = pos.cursorLine + lineDelta;

        // Clamp to valid line range
        newAnchorLine = Math.max(0, Math.min(newAnchorLine, lineCount - 1));
        newCursorLine = Math.max(0, Math.min(newCursorLine, lineCount - 1));

        // Clamp columns to new line lengths
        var newAnchorCol = Math.min(pos.anchorCol, doc.getLine(newAnchorLine).length);
        var newCursorCol = Math.min(pos.cursorCol, doc.getLine(newCursorLine).length);

        var newAnchor = doc.positionToOffset(newAnchorLine, newAnchorCol);
        var newCursor = doc.positionToOffset(newCursorLine, newCursorCol);

        newSelections.push(Selection.range(newAnchor, newCursor));
      }

      this._editor.setSelections(newSelections);
    }

    // ----------------------------------------
    // Toggle Line Comment
    // ----------------------------------------

    /**
     * Toggle line comments for all affected lines
     */
    _toggleLineComment() {
      var language = this._editor.getLanguage();
      var config = COMMENT_CONFIG[language];
      if (!config) return; // Unsupported language

      var doc = this._editor.document;
      var lineRanges = this._getAffectedLineRanges();

      if (lineRanges.length === 0) return;

      // Determine toggle state: if ALL lines are commented, uncomment; else comment all
      var allCommented = this._checkAllLinesCommented(lineRanges, config);

      // Process lines from bottom to top (reverse) to preserve offsets
      for (var i = lineRanges.length - 1; i >= 0; i--) {
        var range = lineRanges[i];

        for (var line = range.endLine; line >= range.startLine; line--) {
          if (allCommented) {
            this._uncommentLine(line, config);
          } else {
            this._commentLine(line, config);
          }
        }
      }
    }

    /**
     * Check if all affected lines are already commented
     * @param {Array} lineRanges
     * @param {Object} config - Comment configuration
     * @returns {boolean}
     */
    _checkAllLinesCommented(lineRanges, config) {
      var doc = this._editor.document;

      for (var i = 0; i < lineRanges.length; i++) {
        var range = lineRanges[i];
        for (var line = range.startLine; line <= range.endLine; line++) {
          var lineText = doc.getLine(line);
          var trimmed = lineText.trimStart();

          // Skip empty lines
          if (trimmed.length === 0) continue;

          if (config.type === 'line') {
            if (!trimmed.startsWith(config.prefix)) return false;
          } else {
            // Block comment: check for open marker
            if (!trimmed.startsWith(config.open)) return false;
          }
        }
      }
      return true;
    }

    /**
     * Add comment to a line
     * @param {number} lineIndex
     * @param {Object} config - Comment configuration
     */
    _commentLine(lineIndex, config) {
      var doc = this._editor.document;
      var lineText = doc.getLine(lineIndex);
      var lineStart = doc.positionToOffset(lineIndex, 0);

      // Find the indentation
      var indentMatch = lineText.match(/^(\s*)/);
      var indent = indentMatch ? indentMatch[1] : '';
      var contentStart = indent.length;
      var content = lineText.slice(contentStart);

      var insertText, startOffset, endOffset;

      if (config.type === 'line') {
        // Insert // after indentation
        insertText = config.prefix + ' ';
        startOffset = lineStart + contentStart;
        endOffset = startOffset;
        doc.replaceRange(startOffset, endOffset, insertText);
      } else {
        // Block comment: wrap entire line content
        if (content.length === 0) {
          // Empty line - just add comment markers
          insertText = config.open + ' ' + config.close;
        } else {
          insertText = config.open + ' ' + content + ' ' + config.close;
        }
        startOffset = lineStart + contentStart;
        endOffset = lineStart + lineText.length;
        doc.replaceRange(startOffset, endOffset, insertText);
      }
    }

    /**
     * Remove comment from a line
     * @param {number} lineIndex
     * @param {Object} config - Comment configuration
     */
    _uncommentLine(lineIndex, config) {
      var doc = this._editor.document;
      var lineText = doc.getLine(lineIndex);
      var lineStart = doc.positionToOffset(lineIndex, 0);

      var indentMatch = lineText.match(/^(\s*)/);
      var indent = indentMatch ? indentMatch[1] : '';
      var contentStart = indent.length;
      var afterIndent = lineText.slice(contentStart);

      if (config.type === 'line') {
        // Remove // (and optional space after)
        var prefixPattern = new RegExp('^' + escapeRegex(config.prefix) + ' ?');
        var match = afterIndent.match(prefixPattern);
        if (match) {
          var startOffset = lineStart + contentStart;
          var endOffset = startOffset + match[0].length;
          doc.replaceRange(startOffset, endOffset, '');
        }
      } else {
        // Block comment: remove open and close markers
        var openPattern = new RegExp('^' + escapeRegex(config.open) + ' ?');
        var closePattern = new RegExp(' ?' + escapeRegex(config.close) + '$');

        var content = afterIndent;
        var openMatch = content.match(openPattern);
        var closeMatch = content.match(closePattern);

        if (openMatch && closeMatch) {
          var newContent = content.slice(openMatch[0].length);
          newContent = newContent.slice(0, newContent.length - closeMatch[0].length);

          var startOffset = lineStart + contentStart;
          var endOffset = lineStart + lineText.length;
          doc.replaceRange(startOffset, endOffset, newContent);
        }
      }
    }

    // ----------------------------------------
    // Move Lines
    // ----------------------------------------

    /**
     * Move affected lines up by one
     */
    _moveLinesUp() {
      var doc = this._editor.document;
      var lineRanges = this._getAffectedLineRanges();

      // Can't move up if first range starts at line 0
      if (lineRanges.length === 0 || lineRanges[0].startLine === 0) return;

      // Save selection positions BEFORE modifying document
      var savedPositions = this._saveSelectionPositions();

      // Process ranges from top to bottom for move up
      for (var i = 0; i < lineRanges.length; i++) {
        var range = lineRanges[i];
        var startLine = range.startLine;
        var endLine = range.endLine;
        var targetLine = startLine - 1;

        // Get line contents
        var linesToMove = [];
        for (var l = startLine; l <= endLine; l++) {
          linesToMove.push(doc.getLine(l));
        }
        var lineAbove = doc.getLine(targetLine);

        // Calculate offsets
        var targetLineStart = doc.positionToOffset(targetLine, 0);
        var endLineEnd = doc.positionToOffset(endLine, doc.getLine(endLine).length);

        // Build new text: [linesToMove] + '\n' + [lineAbove]
        var newText = linesToMove.join('\n') + '\n' + lineAbove;

        doc.replaceRange(targetLineStart, endLineEnd, newText);
      }

      // Restore selections with line shift applied
      this._restoreSelectionPositions(savedPositions, -1);
    }

    /**
     * Move affected lines down by one
     */
    _moveLinesDown() {
      var doc = this._editor.document;
      var lineRanges = this._getAffectedLineRanges();
      var lastLine = doc.getLineCount() - 1;

      // Can't move down if last range ends at last line
      if (lineRanges.length === 0 || lineRanges[lineRanges.length - 1].endLine >= lastLine) return;

      // Save selection positions BEFORE modifying document
      var savedPositions = this._saveSelectionPositions();

      // Process ranges from bottom to top for move down
      for (var i = lineRanges.length - 1; i >= 0; i--) {
        var range = lineRanges[i];
        var startLine = range.startLine;
        var endLine = range.endLine;
        var targetLine = endLine + 1;

        // Get line contents
        var linesToMove = [];
        for (var l = startLine; l <= endLine; l++) {
          linesToMove.push(doc.getLine(l));
        }
        var lineBelow = doc.getLine(targetLine);

        // Calculate offsets
        var startLineStart = doc.positionToOffset(startLine, 0);
        var targetLineEnd = doc.positionToOffset(targetLine, doc.getLine(targetLine).length);

        // Build new text: [lineBelow] + '\n' + [linesToMove]
        var newText = lineBelow + '\n' + linesToMove.join('\n');

        doc.replaceRange(startLineStart, targetLineEnd, newText);
      }

      // Restore selections with line shift applied
      this._restoreSelectionPositions(savedPositions, 1);
    }

    // ----------------------------------------
    // Duplicate Lines
    // ----------------------------------------

    /**
     * Duplicate affected lines above (cursor stays on original)
     */
    _duplicateLinesUp() {
      this._duplicateLines('up');
    }

    /**
     * Duplicate affected lines below (cursor stays on original)
     */
    _duplicateLinesDown() {
      this._duplicateLines('down');
    }

    /**
     * Duplicate affected lines in the specified direction
     * @param {string} direction - 'up' or 'down'
     */
    _duplicateLines(direction) {
      var doc = this._editor.document;
      var lineRanges = this._getAffectedLineRanges();

      if (lineRanges.length === 0) return;

      // Calculate total lines being duplicated (for cursor adjustment)
      var totalDuplicatedLines = 0;
      for (var r = 0; r < lineRanges.length; r++) {
        totalDuplicatedLines += lineRanges[r].endLine - lineRanges[r].startLine + 1;
      }

      // Process from bottom to top to preserve offsets
      for (var i = lineRanges.length - 1; i >= 0; i--) {
        var range = lineRanges[i];
        var startLine = range.startLine;
        var endLine = range.endLine;

        // Get lines to duplicate
        var linesToDuplicate = [];
        for (var l = startLine; l <= endLine; l++) {
          linesToDuplicate.push(doc.getLine(l));
        }
        var duplicateText = linesToDuplicate.join('\n');

        var insertOffset, insertText;

        if (direction === 'up') {
          // Insert at start of startLine
          insertOffset = doc.positionToOffset(startLine, 0);
          insertText = duplicateText + '\n';
        } else {
          // Insert after endLine
          insertOffset = doc.positionToOffset(endLine, doc.getLine(endLine).length);
          insertText = '\n' + duplicateText;
        }

        doc.replaceRange(insertOffset, insertOffset, insertText);
      }

      // Update selections based on direction
      if (direction === 'up') {
        // For duplicate up: cursor stays on original, which has shifted down
        this._shiftSelectionsVertically(totalDuplicatedLines);
      }
      // For duplicate down: cursor stays on original lines (no shift needed)
    }

    // ----------------------------------------
    // Public API
    // ----------------------------------------

    /**
     * Enable line operations feature
     */
    enable() {
      this._enabled = true;
    }

    /**
     * Disable line operations feature
     */
    disable() {
      this._enabled = false;
    }

    /**
     * Check if line operations is enabled
     * @returns {boolean}
     */
    isEnabled() {
      return this._enabled;
    }

    // ----------------------------------------
    // Lifecycle
    // ----------------------------------------

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

      this._editor = null;
    }
  }

  // ============================================
  // Export to namespace
  // ============================================

  CodeEditor.Features = CodeEditor.Features || {};
  CodeEditor.Features.LineOperations = LineOperationsFeature;

})(window.CodeEditor = window.CodeEditor || {});
