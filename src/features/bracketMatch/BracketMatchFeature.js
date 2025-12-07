/**
 * @fileoverview Bracket match highlight feature for code editor
 * @module features/bracketMatch/BracketMatchFeature
 *
 * Highlights matching brackets when cursor is positioned at or after a bracket.
 * Supports (), [], {}, and <> pairs with depth tracking for nested brackets.
 */

// ============================================
// Constants
// ============================================

// Bracket pair mappings
const BRACKETS = {
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
const OPENING_BRACKETS = new Set(['(', '[', '{', '<']);

// Maximum characters to scan when searching for matching bracket
const MAX_SCAN_DISTANCE = 10000;

// ============================================
// Class Definition
// ============================================

/**
 * Bracket match highlight feature.
 * Highlights matching bracket pairs when cursor is near a bracket.
 *
 * @example
 * const bracketMatch = new BracketMatchFeature(editor);
 */
export class BracketMatchFeature {
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
    this._boundHandleSelectionChange = () => this._scheduleUpdate();
    this._boundHandleBlur = () => this._clearDecorations();

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
    if (!this._enabled) return;

    // Debounce with requestAnimationFrame
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
    }
    this._rafId = requestAnimationFrame(() => {
      this._updateHighlight();
      this._rafId = null;
    });
  }

  _updateHighlight() {
    this._clearDecorations();

    if (!this._enabled) return;

    const { start, end } = this._editor.getSelection();

    // Only highlight when there's no selection (just cursor)
    if (start !== end) return;

    const text = this._editor.document.getText();
    const cursorPos = end;

    // Check character at cursor position
    let bracketPos = -1;
    let bracket = null;

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
    const matchPos = this._findMatchingBracket(text, bracketPos, bracket);

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
    const isOpening = OPENING_BRACKETS.has(bracket);
    const target = BRACKETS[bracket];
    const direction = isOpening ? 1 : -1;

    let depth = 1;
    let pos = offset + direction;
    let scanned = 0;

    while (pos >= 0 && pos < text.length && depth > 0 && scanned < MAX_SCAN_DISTANCE) {
      const char = text[pos];

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
    const view = this._editor.view;
    const doc = this._editor.document;
    const pos = doc.offsetToPosition(offset);

    // Calculate position within content area
    const padding = 10; // Matches EditorView padding
    const top = pos.line * view.lineHeight + padding;
    const left = pos.column * view.charWidth + padding;

    const decoration = document.createElement('div');
    decoration.className = 'ec-bracket-match';
    decoration.style.top = `${top}px`;
    decoration.style.left = `${left}px`;
    decoration.style.width = `${view.charWidth}px`;
    decoration.style.height = `${view.lineHeight}px`;

    this._decorationLayer.appendChild(decoration);
    this._decorations.push(decoration);
  }

  _clearDecorations() {
    for (const decoration of this._decorations) {
      decoration.remove();
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

    this._decorationLayer?.remove();
    this._editor = null;
  }
}
