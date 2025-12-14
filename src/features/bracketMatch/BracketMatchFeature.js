/**
 * @fileoverview Bracket match highlight feature for code editor
 * @module features/bracketMatch/BracketMatchFeature
 *
 * Highlights matching brackets when cursor is positioned at or after a bracket.
 * Supports (), [], {}, and <> pairs with depth tracking for nested brackets.
 */

(function(CodeEditor) {
  'use strict';

  // ============================================
  // Constants
  // ============================================

  // Bracket pair mappings
  var BRACKETS = {
    '(': ')',
    ')': '(',
    '[': ']',
    ']': '[',
    '{': '}',
    '}': '{',
    '<': '>',
    '>': '<',
  };

  // Opening brackets (scan forward to find match)
  var OPENING_BRACKETS = new Set(['(', '[', '{', '<']);

  // Maximum characters to scan when searching for matching bracket
  var MAX_SCAN_DISTANCE = 10000;

  // ============================================
  // Class Definition
  // ============================================

  /**
   * Bracket match highlight feature.
   * Highlights matching bracket pairs when cursor is near a bracket.
   *
   * @example
   * var bracketMatch = new BracketMatchFeature(editor);
   */
  class BracketMatchFeature {
    // ----------------------------------------
    // Instance Properties
    // ----------------------------------------
    _editor = null;
    _enabled = true;
    _decorationLayer = null;
    _decorations = [];
    _boundHandleSelectionChange = null;
    _boundHandleBlur = null;
    _rafId = null;

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

      this._createDecorationLayer();
      this._bindEvents();
    }

    // ----------------------------------------
    // DOM Setup
    // ----------------------------------------

    _createDecorationLayer() {
      this._decorationLayer = document.createElement('div');
      this._decorationLayer.className = 'ec-decoration-layer ec-bracket-match-layer';
      this._editor.view.contentElement.appendChild(this._decorationLayer);
    }

    // ----------------------------------------
    // Event Binding
    // ----------------------------------------

    _bindEvents() {
      var self = this;

      this._boundHandleSelectionChange = function() {
        self._scheduleUpdate();
      };
      this._boundHandleBlur = function() {
        self._clearDecorations();
      };

      this._editor.on('selectionChange', this._boundHandleSelectionChange);
      this._editor.on('blur', this._boundHandleBlur);

      // Also listen to document changes to update highlights
      this._editor.document.on('change', this._boundHandleSelectionChange);

      // Initial update
      this._updateHighlight();
    }

    // ----------------------------------------
    // Update Logic
    // ----------------------------------------

    _scheduleUpdate() {
      var self = this;

      if (!this._enabled) return;

      // Debounce with requestAnimationFrame
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
      }
      this._rafId = requestAnimationFrame(function() {
        self._updateHighlight();
        self._rafId = null;
      });
    }

    _updateHighlight() {
      this._clearDecorations();

      if (!this._enabled) return;

      var sel = this._editor.getSelection();

      // Only highlight when there's no selection (just cursor)
      if (sel.start !== sel.end) return;

      var text = this._editor.document.getText();
      var cursorPos = sel.end;

      // Check character at cursor position
      var bracketPos = -1;
      var bracket = null;

      // First, check character at cursor position
      if (cursorPos < text.length && BRACKETS[text[cursorPos]]) {
        bracketPos = cursorPos;
        bracket = text[cursorPos];
      }
      // Then, check character before cursor
      else if (cursorPos > 0 && BRACKETS[text[cursorPos - 1]]) {
        bracketPos = cursorPos - 1;
        bracket = text[bracketPos];
      }

      if (bracketPos === -1 || !bracket) return;

      // Find matching bracket
      var matchPos = this._findMatchingBracket(text, bracketPos, bracket);

      if (matchPos !== -1) {
        this._addDecoration(bracketPos);
        this._addDecoration(matchPos);
      }
    }

    // ----------------------------------------
    // Bracket Matching Algorithm
    // ----------------------------------------

    /**
     * Find the matching bracket for a bracket at the given position.
     * Uses depth tracking to handle nested brackets correctly.
     *
     * @param {string} text - Full document text
     * @param {number} offset - Position of the bracket to match
     * @param {string} bracket - The bracket character
     * @returns {number} Position of matching bracket, or -1 if not found
     */
    _findMatchingBracket(text, offset, bracket) {
      var isOpening = OPENING_BRACKETS.has(bracket);
      var target = BRACKETS[bracket];
      var direction = isOpening ? 1 : -1;

      var depth = 1;
      var pos = offset + direction;
      var scanned = 0;

      while (pos >= 0 && pos < text.length && depth > 0 && scanned < MAX_SCAN_DISTANCE) {
        var char = text[pos];

        // TODO: In future, skip characters inside strings/comments
        // For now, we do simple matching

        if (char === bracket) {
          depth++;
        } else if (char === target) {
          depth--;
        }

        if (depth === 0) {
          return pos;
        }

        pos += direction;
        scanned++;
      }

      return -1; // No match found
    }

    // ----------------------------------------
    // Decoration Management
    // ----------------------------------------

    _addDecoration(offset) {
      var view = this._editor.view;
      var doc = this._editor.document;
      var pos = doc.offsetToPosition(offset);

      // Calculate position within content area
      var padding = 10; // Matches EditorView padding
      var top = pos.line * view.lineHeight + padding;
      var left = pos.column * view.charWidth + padding;

      var decoration = document.createElement('div');
      decoration.className = 'ec-bracket-match';
      decoration.style.top = top + 'px';
      decoration.style.left = left + 'px';
      decoration.style.width = view.charWidth + 'px';
      decoration.style.height = view.lineHeight + 'px';

      this._decorationLayer.appendChild(decoration);
      this._decorations.push(decoration);
    }

    _clearDecorations() {
      for (var i = 0; i < this._decorations.length; i++) {
        this._decorations[i].remove();
      }
      this._decorations = [];
    }

    // ----------------------------------------
    // Public API
    // ----------------------------------------

    /**
     * Enable bracket matching
     */
    enable() {
      this._enabled = true;
      this._updateHighlight();
    }

    /**
     * Disable bracket matching
     */
    disable() {
      this._enabled = false;
      this._clearDecorations();
    }

    /**
     * Check if bracket matching is enabled
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
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
      }

      this._clearDecorations();

      if (this._boundHandleSelectionChange) {
        this._editor.off('selectionChange', this._boundHandleSelectionChange);
        this._editor.document.off('change', this._boundHandleSelectionChange);
      }

      if (this._boundHandleBlur) {
        this._editor.off('blur', this._boundHandleBlur);
      }

      if (this._decorationLayer) {
        this._decorationLayer.remove();
      }
      this._editor = null;
    }
  }

  // ============================================
  // Export to namespace
  // ============================================

  CodeEditor.Features = CodeEditor.Features || {};
  CodeEditor.Features.BracketMatch = BracketMatchFeature;

})(window.CodeEditor = window.CodeEditor || {});
