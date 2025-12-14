/**
 * @fileoverview Auto-indent feature for code editor
 * @module features/autoIndent/AutoIndentFeature
 *
 * Automatically handles indentation when pressing Enter:
 * - Maintains current line indentation
 * - Increases indent after opening brackets/colons
 * - Special handling for Enter between paired brackets
 */

(function(CodeEditor) {
  'use strict';

  // Get dependencies
  var Selection = CodeEditor.Selection;

  // ============================================
  // Constants
  // ============================================

  // Characters that trigger indent increase on the next line
  var INDENT_TRIGGERS = new Set(['{', '(', '[', ':']);

  // Characters that indicate we should dedent
  var DEDENT_TRIGGERS = new Set(['}', ')', ']']);

  // HTML void elements (self-closing, don't need closing tags)
  var HTML_VOID_ELEMENTS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
  ]);

  // ============================================
  // Class Definition
  // ============================================

  /**
   * Auto-indent feature for the code editor.
   * Handles smart indentation when pressing Enter.
   *
   * @example
   * var autoIndent = new AutoIndentFeature(editor, { tabSize: 2 });
   */
  class AutoIndentFeature {
    // ----------------------------------------
    // Instance Properties
    // ----------------------------------------
    _editor = null;
    _enabled = true;
    _tabSize = 2;
    _useSpaces = true;
    _boundHandleKeyDown = null;

    // ----------------------------------------
    // Constructor
    // ----------------------------------------

    /**
     * @param {Object} editor - Editor instance
     * @param {Object} options - Configuration options
     * @param {boolean} options.enabled - Whether auto-indent is enabled (default: true)
     * @param {number} options.tabSize - Number of spaces per indent level (default: 2)
     * @param {boolean} options.useSpaces - Use spaces instead of tabs (default: true)
     */
    constructor(editor, options = {}) {
      this._editor = editor;
      this._enabled = options.enabled !== false;
      this._tabSize = options.tabSize || 2;
      this._useSpaces = options.useSpaces !== false;

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

      // Only handle Enter key (without Shift)
      if (event.key === 'Enter' && !event.shiftKey) {
        this._handleEnter(event);
      }

      // Handle Tab key for indentation (only without Shift)
      if (event.key === 'Tab' && !event.shiftKey) {
        this._handleIndent(event);
      }
    }

    _handleEnter(event) {
      // Prevent default Enter behavior
      event.preventDefault();
      event.stopPropagation();

      // Check for multi-cursor mode
      if (this._editor.hasMultipleCursors()) {
        this._handleMultiCursorEnter();
        return;
      }

      var sel = this._editor.getSelection();
      var start = sel.start;
      var end = sel.end;

      // Get cursor position in line/column
      var pos = this._editor.document.offsetToPosition(start);
      var currentLine = this._editor.document.getLine(pos.line);

      // Split line at cursor position
      var beforeCursor = currentLine.slice(0, pos.column);
      var afterCursor = currentLine.slice(pos.column);

      // Get current indentation
      var currentIndent = this._getIndentation(currentLine);

      // Check last non-whitespace character before cursor
      var trimmedBefore = beforeCursor.trimEnd();
      var lastChar = trimmedBefore.slice(-1);
      var shouldIncrease = INDENT_TRIGGERS.has(lastChar);

      // Check for HTML opening tag without closing tag
      var language = this._editor.getLanguage();
      var htmlIndentContext = this._getHTMLIndentContext(beforeCursor, afterCursor, language);
      if (htmlIndentContext.shouldIncrease) {
        shouldIncrease = true;
      }

      // Check first non-whitespace character after cursor
      var trimmedAfter = afterCursor.trimStart();
      var firstCharAfter = trimmedAfter[0];
      var hasClosingBracket = DEDENT_TRIGGERS.has(firstCharAfter);

      // Check for HTML closing tag after cursor
      if (htmlIndentContext.hasClosingTag) {
        hasClosingBracket = true;
      }

      // Calculate new indentation
      var newIndent = currentIndent;
      if (shouldIncrease) {
        newIndent = currentIndent + this._getIndentString();
      }

      // Special case: Enter between paired brackets like {|} or <div>|</div>
      if (shouldIncrease && hasClosingBracket) {
        this._handleBracketEnter(start, end, currentIndent);
        return;
      }

      // Normal Enter: insert newline + indentation
      var insertText = '\n' + newIndent;

      // If there's a selection, delete it first
      if (start !== end) {
        this._editor.document.replaceRange(start, end, insertText);
      } else {
        this._editor.document.insert(start, insertText);
      }

      // Move cursor to end of inserted indentation
      var newCursorPos = start + insertText.length;
      this._editor.setSelection(newCursorPos, newCursorPos);
    }

    /**
     * Handle Enter key for multiple cursors
     * Each cursor gets newline + appropriate indentation
     */
    _handleMultiCursorEnter() {
      var doc = this._editor.document;
      var selections = this._editor.getSelections();
      var language = this._editor.getLanguage();

      // Calculate insert text for each cursor
      var insertTexts = [];
      for (var i = 0; i < selections.all.length; i++) {
        var sel = selections.all[i];
        var pos = doc.offsetToPosition(sel.start);
        var currentLine = doc.getLine(pos.line);
        var beforeCursor = currentLine.slice(0, pos.column);
        var afterCursor = currentLine.slice(pos.column);

        var currentIndent = this._getIndentation(currentLine);
        var trimmedBefore = beforeCursor.trimEnd();
        var lastChar = trimmedBefore.slice(-1);

        var shouldIncrease = INDENT_TRIGGERS.has(lastChar);
        var htmlIndentContext = this._getHTMLIndentContext(beforeCursor, afterCursor, language);
        if (htmlIndentContext.shouldIncrease) {
          shouldIncrease = true;
        }

        var newIndent = currentIndent;
        if (shouldIncrease) {
          newIndent = currentIndent + this._getIndentString();
        }

        insertTexts.push('\n' + newIndent);
      }

      // Process from end to start to preserve offsets
      var sortedSels = selections.sorted(true); // descending
      var sortedTexts = [];

      // Match sorted selections with their insert texts
      var originalSels = selections.all;
      for (var j = 0; j < sortedSels.length; j++) {
        var sortedSel = sortedSels[j];
        var idx = originalSels.findIndex(function(s) {
          return s.start === sortedSel.start && s.end === sortedSel.end;
        });
        sortedTexts.push(insertTexts[idx]);
      }

      // Insert at each cursor position
      for (var k = 0; k < sortedSels.length; k++) {
        var selToInsert = sortedSels[k];
        var textToInsert = sortedTexts[k];
        doc.replaceRange(selToInsert.start, selToInsert.end, textToInsert);
      }

      // Calculate new cursor positions
      var ascendingSels = selections.sorted(false);
      var newSelections = [];
      var cumulativeOffset = 0;

      for (var m = 0; m < ascendingSels.length; m++) {
        var ascSel = ascendingSels[m];
        var ascIdx = originalSels.findIndex(function(s) {
          return s.start === ascSel.start && s.end === ascSel.end;
        });
        var insertedText = insertTexts[ascIdx];
        var deletedLength = ascSel.end - ascSel.start;

        var newPos = ascSel.start + cumulativeOffset + insertedText.length;
        newSelections.push(Selection.cursor(newPos));

        cumulativeOffset += insertedText.length - deletedLength;
      }

      this._editor.setSelections(newSelections);
    }

    _handleBracketEnter(start, end, baseIndent) {
      // {|} -> {\n  |\n}
      var indent = this._getIndentString();
      var insertText = '\n' + baseIndent + indent + '\n' + baseIndent;

      // Replace selection (or insert at cursor)
      if (start !== end) {
        this._editor.document.replaceRange(start, end, insertText);
      } else {
        this._editor.document.insert(start, insertText);
      }

      // Place cursor at the indented middle line
      // Position: start + '\n'.length + baseIndent.length + indent.length
      var cursorPos = start + 1 + baseIndent.length + indent.length;
      this._editor.setSelection(cursorPos, cursorPos);
    }

    /**
     * Handle Tab key - insert indent at cursor or indent selected lines
     * @param {KeyboardEvent} event
     */
    _handleIndent(event) {
      event.preventDefault();
      event.stopPropagation();

      // Check for multi-cursor mode
      if (this._editor.hasMultipleCursors()) {
        this._handleMultiCursorIndent();
        return;
      }

      var sel = this._editor.getSelection();
      var indent = this._getIndentString();

      // If no selection, just insert indent at cursor
      if (sel.start === sel.end) {
        this._editor.document.insert(sel.start, indent);
        var newPos = sel.start + indent.length;
        this._editor.setSelection(newPos, newPos);
        return;
      }

      // If there's a selection, indent all selected lines
      this._indentSelectedLines(sel.start, sel.end);
    }

    /**
     * Handle Shift+Tab - dedent at cursor or dedent selected lines
     * @param {KeyboardEvent} event
     */
    _handleDedent(event) {
      event.preventDefault();
      event.stopPropagation();

      // Check for multi-cursor mode
      if (this._editor.hasMultipleCursors()) {
        this._handleMultiCursorDedent();
        return;
      }

      var sel = this._editor.getSelection();

      // Dedent lines (works for both cursor and selection)
      this._dedentSelectedLines(sel.start, sel.end);
    }

    /**
     * Indent all lines in selection range
     */
    _indentSelectedLines(start, end) {
      var doc = this._editor.document;
      var startPos = doc.offsetToPosition(start);
      var endPos = doc.offsetToPosition(end);
      var indent = this._getIndentString();

      // Process lines from end to start to preserve offsets
      for (var line = endPos.line; line >= startPos.line; line--) {
        var lineStartOffset = doc.positionToOffset({ line: line, column: 0 });
        doc.insert(lineStartOffset, indent);
      }

      // Adjust selection
      var lineCount = endPos.line - startPos.line + 1;
      var newStart = start + indent.length;
      var newEnd = end + (indent.length * lineCount);
      this._editor.setSelection(newStart, newEnd);
    }

    /**
     * Dedent all lines in selection range
     */
    _dedentSelectedLines(start, end) {
      var doc = this._editor.document;
      var startPos = doc.offsetToPosition(start);
      var endPos = doc.offsetToPosition(end);
      var tabSize = this._tabSize;

      var totalRemoved = 0;
      var firstLineRemoved = 0;

      // Process lines from end to start to preserve offsets
      for (var line = endPos.line; line >= startPos.line; line--) {
        var lineText = doc.getLine(line);
        var lineStartOffset = doc.positionToOffset({ line: line, column: 0 });

        // Calculate how much to remove
        var removeCount = 0;
        for (var i = 0; i < tabSize && i < lineText.length; i++) {
          if (lineText[i] === ' ') {
            removeCount++;
          } else if (lineText[i] === '\t') {
            removeCount++;
            break;
          } else {
            break;
          }
        }

        if (removeCount > 0) {
          doc.replaceRange(lineStartOffset, lineStartOffset + removeCount, '');
          totalRemoved += removeCount;
          if (line === startPos.line) {
            firstLineRemoved = removeCount;
          }
        }
      }

      // Adjust selection
      var newStart = Math.max(0, start - firstLineRemoved);
      var newEnd = Math.max(newStart, end - totalRemoved);
      this._editor.setSelection(newStart, newEnd);
    }

    /**
     * Handle Tab key for multiple cursors
     */
    _handleMultiCursorIndent() {
      var doc = this._editor.document;
      var selections = this._editor.getSelections();
      var indent = this._getIndentString();

      // Process from end to start to preserve offsets
      var sortedSels = selections.sorted(true); // descending

      for (var i = 0; i < sortedSels.length; i++) {
        doc.insert(sortedSels[i].start, indent);
      }

      // Calculate new cursor positions
      var ascendingSels = selections.sorted(false);
      var newSelections = [];
      var cumulativeOffset = 0;

      for (var j = 0; j < ascendingSels.length; j++) {
        var newPos = ascendingSels[j].start + cumulativeOffset + indent.length;
        newSelections.push(Selection.cursor(newPos));
        cumulativeOffset += indent.length;
      }

      this._editor.setSelections(newSelections);
    }

    /**
     * Handle Shift+Tab for multiple cursors
     */
    _handleMultiCursorDedent() {
      var doc = this._editor.document;
      var selections = this._editor.getSelections();
      var tabSize = this._tabSize;

      // Calculate removal amounts for each cursor
      var removalAmounts = [];
      for (var i = 0; i < selections.all.length; i++) {
        var sel = selections.all[i];
        var pos = doc.offsetToPosition(sel.start);
        var lineText = doc.getLine(pos.line);
        var lineStartOffset = doc.positionToOffset({ line: pos.line, column: 0 });

        var removeCount = 0;
        for (var j = 0; j < tabSize && j < lineText.length; j++) {
          if (lineText[j] === ' ') {
            removeCount++;
          } else if (lineText[j] === '\t') {
            removeCount++;
            break;
          } else {
            break;
          }
        }

        removalAmounts.push({ sel: sel, lineStartOffset: lineStartOffset, removeCount: removeCount, pos: pos });
      }

      // Process from end to start to preserve offsets
      var sortedRemovals = removalAmounts.slice().sort(function(a, b) {
        return b.lineStartOffset - a.lineStartOffset;
      });

      // Track which lines we've already processed (for multi-cursors on same line)
      var processedLines = new Set();

      for (var k = 0; k < sortedRemovals.length; k++) {
        var removal = sortedRemovals[k];
        if (removal.removeCount > 0 && !processedLines.has(removal.pos.line)) {
          doc.replaceRange(removal.lineStartOffset, removal.lineStartOffset + removal.removeCount, '');
          processedLines.add(removal.pos.line);
        }
      }

      // Calculate new cursor positions
      var ascendingSels = selections.sorted(false);
      var newSelections = [];
      var lineRemovalMap = new Map();

      // Build map of line removals in ascending order
      var ascendingRemovals = removalAmounts.slice().sort(function(a, b) {
        return a.lineStartOffset - b.lineStartOffset;
      });
      for (var m = 0; m < ascendingRemovals.length; m++) {
        var ascRemoval = ascendingRemovals[m];
        if (!lineRemovalMap.has(ascRemoval.pos.line)) {
          lineRemovalMap.set(ascRemoval.pos.line, ascRemoval.removeCount);
        }
      }

      for (var n = 0; n < ascendingSels.length; n++) {
        var ascSel = ascendingSels[n];
        var ascPos = doc.offsetToPosition(ascSel.start);
        var lineRemoval = lineRemovalMap.get(ascPos.line) || 0;

        // Calculate cumulative removal from previous lines
        var prevLinesRemoval = 0;
        lineRemovalMap.forEach(function(amount, line) {
          if (line < ascPos.line) {
            prevLinesRemoval += amount;
          }
        });

        var newCol = Math.max(0, ascPos.column - lineRemoval);
        var newLineStartOffset = doc.positionToOffset({ line: ascPos.line, column: 0 }) - prevLinesRemoval;
        var newCursorPos = newLineStartOffset + newCol;
        newSelections.push(Selection.cursor(Math.max(0, newCursorPos)));
      }

      this._editor.setSelections(newSelections);
    }

    // ----------------------------------------
    // Private Methods
    // ----------------------------------------

    /**
     * Extract leading whitespace from a line
     * @param {string} line
     * @returns {string}
     */
    _getIndentation(line) {
      var match = line.match(/^(\s*)/);
      return match ? match[1] : '';
    }

    /**
     * Get HTML-specific indent context
     * @param {string} beforeCursor - Text before cursor
     * @param {string} afterCursor - Text after cursor
     * @param {string} language - Current language
     * @returns {{ shouldIncrease: boolean, hasClosingTag: boolean }}
     */
    _getHTMLIndentContext(beforeCursor, afterCursor, language) {
      var result = { shouldIncrease: false, hasClosingTag: false };

      if (language !== 'html') {
        return result;
      }

      // Check if line ends with an opening tag: <div>, <span class="foo">, etc.
      // Pattern: <tagname ...> at the end (not self-closing />)
      var openingTagMatch = beforeCursor.match(/<(\w+)(?:\s+[^>]*)?>$/);
      if (openingTagMatch) {
        var tagName = openingTagMatch[1].toLowerCase();
        // Don't indent after void elements
        if (!HTML_VOID_ELEMENTS.has(tagName)) {
          result.shouldIncrease = true;
        }
      }

      // Check if there's a closing tag immediately after cursor
      // Pattern: </tagname> at the start of afterCursor
      var closingTagMatch = afterCursor.match(/^\s*<\/(\w+)>/);
      if (closingTagMatch) {
        result.hasClosingTag = true;
      }

      return result;
    }

    /**
     * Get the indent string based on settings
     * @returns {string}
     */
    _getIndentString() {
      return this._useSpaces ? ' '.repeat(this._tabSize) : '\t';
    }

    // ----------------------------------------
    // Public API
    // ----------------------------------------

    /**
     * Enable auto-indent feature
     */
    enable() {
      this._enabled = true;
    }

    /**
     * Disable auto-indent feature
     */
    disable() {
      this._enabled = false;
    }

    /**
     * Check if auto-indent is enabled
     * @returns {boolean}
     */
    isEnabled() {
      return this._enabled;
    }

    /**
     * Set tab size
     * @param {number} size
     */
    setTabSize(size) {
      this._tabSize = size;
    }

    /**
     * Get tab size
     * @returns {number}
     */
    getTabSize() {
      return this._tabSize;
    }

    /**
     * Set whether to use spaces or tabs
     * @param {boolean} useSpaces
     */
    setUseSpaces(useSpaces) {
      this._useSpaces = useSpaces;
    }

    /**
     * Check if using spaces
     * @returns {boolean}
     */
    isUsingSpaces() {
      return this._useSpaces;
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
  CodeEditor.Features.AutoIndent = AutoIndentFeature;

})(window.CodeEditor = window.CodeEditor || {});
