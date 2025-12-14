/**
 * @fileoverview Auto-close feature for brackets, quotes, and tags
 * @module features/autoClose/AutoCloseFeature
 *
 * Automatically inserts closing characters when typing opening characters.
 * Supports skip-over and pair deletion.
 */

(function(CodeEditor) {
  'use strict';

  // Get dependencies
  var Selection = CodeEditor.Selection;

  // ============================================
  // Constants
  // ============================================

  var PAIRS = {
    '(': ')',
    '[': ']',
    '{': '}',
    '"': '"',
    "'": "'",
    '`': '`',
  };

  var CLOSE_CHARS = new Set([')', ']', '}', '"', "'", '`']);

  // Characters that, when appearing after cursor, should NOT trigger auto-close
  var NO_AUTOCLOSE_BEFORE = /[\w]/;

  // HTML void elements (self-closing, don't need closing tags)
  var HTML_VOID_ELEMENTS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
  ]);

  // ============================================
  // Class Definition
  // ============================================

  /**
   * Auto-close feature for the code editor.
   * Automatically inserts closing characters for brackets and quotes.
   *
   * @example
   * var autoClose = new AutoCloseFeature(editor);
   * // Type '(' and ')' is automatically inserted
   */
  class AutoCloseFeature {
    // ----------------------------------------
    // Instance Properties
    // ----------------------------------------
    _editor = null;
    _enabled = true;
    _boundHandleKeyDown = null;
    _boundHandleInput = null;
    _lastInsertedPair = null;
    _pendingHTMLTagClose = null;
    _pendingMultiCursorClose = null; // For multi-cursor auto-close

    // ----------------------------------------
    // Constructor
    // ----------------------------------------

    /**
     * @param {Object} editor - Editor instance
     * @param {Object} options - Configuration options
     * @param {boolean} options.enabled - Whether auto-close is enabled (default: true)
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

      // Bind keydown at capture phase to intercept before input handlers
      this._boundHandleKeyDown = function(e) {
        self._handleKeyDown(e);
      };
      this._editor.view.contentElement.addEventListener(
        'keydown',
        this._boundHandleKeyDown,
        true // capture phase
      );

      // Listen for input events to handle auto-insert after text is typed
      this._boundHandleInput = function(event) {
        self._handleInput(event);
      };
      this._editor.on('input', this._boundHandleInput);
    }

    // ----------------------------------------
    // Event Handlers
    // ----------------------------------------

    _handleKeyDown(event) {
      if (!this._enabled) return;

      var key = event.key;

      // Handle Backspace for pair deletion
      if (key === 'Backspace') {
        if (this._handleBackspace(event)) {
          return;
        }
      }

      // Handle closing characters for skip-over
      if (CLOSE_CHARS.has(key)) {
        if (this._handleSkipOver(key, event)) {
          return;
        }
      }

      // Handle '>' for HTML tag auto-close
      if (key === '>' && this._editor.getLanguage() === 'html') {
        this._prepareHTMLTagClose();
      }

      // Handle opening characters - mark for auto-close
      if (PAIRS[key]) {
        // Check for multi-cursor mode
        if (this._editor.hasMultipleCursors()) {
          this._prepareMultiCursorAutoClose(key);
        } else {
          this._prepareAutoClose(key);
        }
      }
    }

    _handleInput(event) {
      if (!this._enabled) return;

      // Check if we should auto-close HTML tag after this input
      if (this._pendingHTMLTagClose) {
        var tagName = this._pendingHTMLTagClose;
        this._pendingHTMLTagClose = null;

        var text = this._editor.getValue();
        var sel = this._editor.getSelection();

        // Verify '>' was actually inserted
        if (text[sel.end - 1] === '>') {
          this._insertHTMLClosingTag(tagName, sel.end);
        }
      }

      // Check if we should auto-close for multi-cursor
      if (this._pendingMultiCursorClose) {
        var openChar = this._pendingMultiCursorClose.openChar;
        this._pendingMultiCursorClose = null;

        this._insertClosingCharAtAllCursors(openChar);
        return;
      }

      // Check if we should auto-close after this input (single cursor)
      if (this._lastInsertedPair) {
        var pairOpenChar = this._lastInsertedPair.openChar;
        this._lastInsertedPair = null;

        // Verify the character was actually inserted at expected position
        var pairText = this._editor.getValue();
        var pairSel = this._editor.getSelection();

        if (pairText[pairSel.end - 1] === pairOpenChar) {
          this._insertClosingChar(pairOpenChar, pairSel.end);
        }
      }
    }

    // ----------------------------------------
    // Auto-Close Logic
    // ----------------------------------------

    _prepareAutoClose(openChar) {
      var sel = this._editor.getSelection();

      // Don't auto-close if there's a selection (text will be replaced)
      if (sel.start !== sel.end) {
        this._lastInsertedPair = null;
        return;
      }

      var text = this._editor.getValue();
      var charAfter = text[sel.end];

      // Don't auto-close before alphanumeric characters
      if (charAfter && NO_AUTOCLOSE_BEFORE.test(charAfter)) {
        this._lastInsertedPair = null;
        return;
      }

      // For quotes, check if we're inside a string
      if (openChar === '"' || openChar === "'" || openChar === '`') {
        var charBefore = text[sel.end - 1];

        // Don't auto-close if previous char is alphanumeric (likely end of word)
        if (charBefore && /[\w]/.test(charBefore)) {
          this._lastInsertedPair = null;
          return;
        }
      }

      // Mark for auto-close
      this._lastInsertedPair = {
        openChar: openChar,
        position: sel.end,
      };
    }

    _insertClosingChar(openChar, currentPos) {
      var closeChar = PAIRS[openChar];

      // Insert closing character
      this._editor.document.replaceRange(currentPos, currentPos, closeChar);

      // Move cursor back between the pair
      this._editor.setSelection(currentPos, currentPos);
    }

    /**
     * Prepare multi-cursor auto-close
     * @param {string} openChar - Opening character
     */
    _prepareMultiCursorAutoClose(openChar) {
      var text = this._editor.getValue();
      var selections = this._editor.getSelections();

      // Check if all cursors should auto-close
      var shouldAutoClose = true;

      for (var i = 0; i < selections.all.length; i++) {
        var sel = selections.all[i];
        // Don't auto-close if there's a selection
        if (!sel.isEmpty) {
          shouldAutoClose = false;
          break;
        }

        var charAfter = text[sel.end];

        // Don't auto-close before alphanumeric characters
        if (charAfter && NO_AUTOCLOSE_BEFORE.test(charAfter)) {
          shouldAutoClose = false;
          break;
        }

        // For quotes, check context
        if (openChar === '"' || openChar === "'" || openChar === '`') {
          var charBefore = text[sel.end - 1];

          // Don't auto-close if previous char is alphanumeric
          if (charBefore && /[\w]/.test(charBefore)) {
            shouldAutoClose = false;
            break;
          }
        }
      }

      if (shouldAutoClose) {
        this._pendingMultiCursorClose = { openChar: openChar };
      } else {
        this._pendingMultiCursorClose = null;
      }
    }

    /**
     * Insert closing character at all cursor positions
     * @param {string} openChar - Opening character
     */
    _insertClosingCharAtAllCursors(openChar) {
      var closeChar = PAIRS[openChar];
      var text = this._editor.getValue();
      var selections = this._editor.getSelections();

      // Verify all cursors have the opening char before them
      var allValid = true;
      for (var i = 0; i < selections.all.length; i++) {
        var sel = selections.all[i];
        if (text[sel.end - 1] !== openChar) {
          allValid = false;
          break;
        }
      }

      if (!allValid) return;

      // Get sorted selections (descending by offset) to insert from end to start
      var sortedSels = selections.sorted(true);

      // Insert closing chars at each cursor position (from end to start to preserve offsets)
      for (var j = 0; j < sortedSels.length; j++) {
        this._editor.document.replaceRange(sortedSels[j].end, sortedSels[j].end, closeChar);
      }

      // Cursors should stay in place (between open and close chars)
      // We need to account for the closing chars we inserted BEFORE each cursor
      // Since we inserted from end to start, cursors at lower offsets need adjustment
      var originalSels = selections.sorted(false); // ascending order
      var newSelections = [];

      for (var k = 0; k < originalSels.length; k++) {
        var origSel = originalSels[k];
        // Each cursor position needs to be offset by the number of closing chars
        // inserted BEFORE it (i.e., at lower positions)
        // Since originalSels is sorted ascending, cursors 0..k-1 are before cursor k
        var adjustment = k; // k closing chars were inserted before this cursor
        newSelections.push(Selection.cursor(origSel.end + adjustment));
      }

      this._editor.setSelections(newSelections);
    }

    // ----------------------------------------
    // HTML Tag Auto-Close Logic
    // ----------------------------------------

    /**
     * Prepare to auto-close an HTML tag when '>' is typed
     */
    _prepareHTMLTagClose() {
      var sel = this._editor.getSelection();

      // Only handle when no selection
      if (sel.start !== sel.end) {
        this._pendingHTMLTagClose = null;
        return;
      }

      var text = this._editor.getValue();
      var beforeCursor = text.slice(0, sel.end);
      var afterCursor = text.slice(sel.end);

      // Find the last unclosed < tag
      // Pattern: <tagname or <tagname attributes (not already closed with > or />)
      var tagMatch = beforeCursor.match(/<(\w+)(?:\s+[^>]*)?$/);

      if (tagMatch) {
        var tagName = tagMatch[1].toLowerCase();

        // Don't auto-close void elements
        if (HTML_VOID_ELEMENTS.has(tagName)) {
          this._pendingHTMLTagClose = null;
          return;
        }

        // Don't auto-close if it's a closing tag </tag
        if (beforeCursor.match(/<\/\w*$/)) {
          this._pendingHTMLTagClose = null;
          return;
        }

        // Don't auto-close if there's already a closing tag right after cursor
        // This handles autocomplete inserting the full tag
        var closingTagPattern = new RegExp('^</' + tagName + '>', 'i');
        if (closingTagPattern.test(afterCursor)) {
          this._pendingHTMLTagClose = null;
          return;
        }

        this._pendingHTMLTagClose = tagName;
      } else {
        this._pendingHTMLTagClose = null;
      }
    }

    /**
     * Insert the closing HTML tag
     */
    _insertHTMLClosingTag(tagName, currentPos) {
      var text = this._editor.getValue();
      var afterCursor = text.slice(currentPos);

      // Double-check: Don't insert if closing tag already exists
      var closingTagPattern = new RegExp('^</' + tagName + '>', 'i');
      if (closingTagPattern.test(afterCursor)) {
        return;
      }

      var closingTag = '</' + tagName + '>';

      // Insert closing tag
      this._editor.document.replaceRange(currentPos, currentPos, closingTag);

      // Keep cursor between opening and closing tags
      this._editor.setSelection(currentPos, currentPos);
    }

    // ----------------------------------------
    // Skip-Over Logic
    // ----------------------------------------

    _handleSkipOver(closeChar, event) {
      // Handle multi-cursor skip-over
      if (this._editor.hasMultipleCursors()) {
        return this._handleMultiCursorSkipOver(closeChar, event);
      }

      var sel = this._editor.getSelection();

      // Only handle when no selection (cursor position)
      if (sel.start !== sel.end) return false;

      var text = this._editor.getValue();
      var charAtCursor = text[sel.end];

      // If the character at cursor matches what we're typing, skip over it
      if (charAtCursor === closeChar) {
        event.preventDefault();
        event.stopPropagation();

        // Move cursor forward
        this._editor.setSelection(sel.end + 1, sel.end + 1);
        return true;
      }

      return false;
    }

    /**
     * Handle skip-over for multi-cursor mode
     */
    _handleMultiCursorSkipOver(closeChar, event) {
      var text = this._editor.getValue();
      var selections = this._editor.getSelections();

      // Check if ALL cursors can skip over
      var allCanSkip = true;
      for (var i = 0; i < selections.all.length; i++) {
        var sel = selections.all[i];
        if (!sel.isEmpty) {
          allCanSkip = false;
          break;
        }
        if (text[sel.end] !== closeChar) {
          allCanSkip = false;
          break;
        }
      }

      if (!allCanSkip) return false;

      event.preventDefault();
      event.stopPropagation();

      // Move all cursors forward
      this._editor.moveAllCursors('right', false, false);
      return true;
    }

    // ----------------------------------------
    // Pair Deletion Logic
    // ----------------------------------------

    _handleBackspace(event) {
      // Handle multi-cursor pair deletion
      if (this._editor.hasMultipleCursors()) {
        return this._handleMultiCursorBackspace(event);
      }

      var sel = this._editor.getSelection();

      // Only handle when no selection
      if (sel.start !== sel.end) return false;
      if (sel.start === 0) return false;

      var text = this._editor.getValue();
      var charBefore = text[sel.start - 1];
      var charAfter = text[sel.start];

      // Check if we have an empty pair: (|) or [|] or {|} etc.
      if (PAIRS[charBefore] === charAfter) {
        event.preventDefault();
        event.stopPropagation();

        // Delete both characters
        this._editor.document.replaceRange(sel.start - 1, sel.start + 1, '');
        this._editor.setSelection(sel.start - 1, sel.start - 1);
        return true;
      }

      return false;
    }

    /**
     * Handle pair deletion for multi-cursor mode
     */
    _handleMultiCursorBackspace(event) {
      var text = this._editor.getValue();
      var selections = this._editor.getSelections();

      // Check if ALL cursors are in an empty pair
      var allInPair = true;
      for (var i = 0; i < selections.all.length; i++) {
        var sel = selections.all[i];
        if (!sel.isEmpty || sel.start === 0) {
          allInPair = false;
          break;
        }

        var charBefore = text[sel.start - 1];
        var charAfter = text[sel.start];

        if (PAIRS[charBefore] !== charAfter) {
          allInPair = false;
          break;
        }
      }

      if (!allInPair) return false;

      event.preventDefault();
      event.stopPropagation();

      // Delete pairs at all cursor positions (from end to start)
      var sortedSels = selections.sorted(true);

      for (var j = 0; j < sortedSels.length; j++) {
        this._editor.document.replaceRange(sortedSels[j].start - 1, sortedSels[j].start + 1, '');
      }

      // Update cursor positions
      var originalSels = selections.sorted(false);
      var newSelections = [];
      var cumulativeOffset = 0;

      for (var k = 0; k < originalSels.length; k++) {
        var origSel = originalSels[k];
        var newPos = origSel.start - 1 + cumulativeOffset;
        newSelections.push(Selection.cursor(Math.max(0, newPos)));
        cumulativeOffset -= 2; // Removed 2 chars (pair)
      }

      this._editor.setSelections(newSelections);
      return true;
    }

    // ----------------------------------------
    // Public API
    // ----------------------------------------

    /**
     * Enable auto-close feature
     */
    enable() {
      this._enabled = true;
    }

    /**
     * Disable auto-close feature
     */
    disable() {
      this._enabled = false;
    }

    /**
     * Check if auto-close is enabled
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

      if (this._boundHandleInput) {
        this._editor.off('input', this._boundHandleInput);
      }

      this._editor = null;
    }
  }

  // ============================================
  // Export to namespace
  // ============================================

  CodeEditor.Features = CodeEditor.Features || {};
  CodeEditor.Features.AutoClose = AutoCloseFeature;

})(window.CodeEditor = window.CodeEditor || {});
