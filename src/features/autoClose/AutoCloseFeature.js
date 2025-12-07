/**
 * @fileoverview Auto-close feature for brackets, quotes, and tags
 * @module features/autoClose/AutoCloseFeature
 *
 * Automatically inserts closing characters when typing opening characters.
 * Supports skip-over and pair deletion.
 */

// ============================================
// Constants
// ============================================

const PAIRS = {
  '(': ')',
  '[': ']',
  '{': '}',
  '"': '"',
  "'": "'",
  '`': '`',
};

const CLOSE_CHARS = new Set([')', ']', '}', '"', "'", '`']);

// Characters that, when appearing after cursor, should NOT trigger auto-close
const NO_AUTOCLOSE_BEFORE = /[\w]/;

// ============================================
// Class Definition
// ============================================

/**
 * Auto-close feature for the code editor.
 * Automatically inserts closing characters for brackets and quotes.
 *
 * @example
 * const autoClose = new AutoCloseFeature(editor);
 * // Type '(' and ')' is automatically inserted
 */
export class AutoCloseFeature {
  // ----------------------------------------
  // Instance Properties
  // ----------------------------------------
  _editor = null;
  _enabled = true;
  _boundHandleKeyDown = null;
  _boundHandleInput = null;
  _lastInsertedPair = null;

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
    // Bind keydown at capture phase to intercept before input handlers
    this._boundHandleKeyDown = (e) => this._handleKeyDown(e);
    this._editor.view.contentElement.addEventListener(
      'keydown',
      this._boundHandleKeyDown,
      true // capture phase
    );

    // Listen for input events to handle auto-insert after text is typed
    this._boundHandleInput = (event) => this._handleInput(event);
    this._editor.on('input', this._boundHandleInput);
  }

  // ----------------------------------------
  // Event Handlers
  // ----------------------------------------

  _handleKeyDown(event) {
    if (!this._enabled) return;

    const { key } = event;

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

    // Handle opening characters - mark for auto-close
    if (PAIRS[key]) {
      this._prepareAutoClose(key);
    }
  }

  _handleInput(event) {
    if (!this._enabled) return;

    // Check if we should auto-close after this input
    if (this._lastInsertedPair) {
      const { openChar, position } = this._lastInsertedPair;
      this._lastInsertedPair = null;

      // Verify the character was actually inserted at expected position
      const text = this._editor.getValue();
      const { end } = this._editor.getSelection();

      if (text[end - 1] === openChar) {
        this._insertClosingChar(openChar, end);
      }
    }
  }

  // ----------------------------------------
  // Auto-Close Logic
  // ----------------------------------------

  _prepareAutoClose(openChar) {
    const { start, end } = this._editor.getSelection();

    // Don't auto-close if there's a selection (text will be replaced)
    if (start !== end) {
      this._lastInsertedPair = null;
      return;
    }

    const text = this._editor.getValue();
    const charAfter = text[end];

    // Don't auto-close before alphanumeric characters
    if (charAfter && NO_AUTOCLOSE_BEFORE.test(charAfter)) {
      this._lastInsertedPair = null;
      return;
    }

    // For quotes, check if we're inside a string
    if (openChar === '"' || openChar === "'" || openChar === '`') {
      const charBefore = text[end - 1];

      // Don't auto-close if previous char is alphanumeric (likely end of word)
      if (charBefore && /[\w]/.test(charBefore)) {
        this._lastInsertedPair = null;
        return;
      }
    }

    // Mark for auto-close
    this._lastInsertedPair = {
      openChar,
      position: end,
    };
  }

  _insertClosingChar(openChar, currentPos) {
    const closeChar = PAIRS[openChar];

    // Insert closing character
    this._editor.document.replaceRange(currentPos, currentPos, closeChar);

    // Move cursor back between the pair
    this._editor.setSelection(currentPos, currentPos);
  }

  // ----------------------------------------
  // Skip-Over Logic
  // ----------------------------------------

  _handleSkipOver(closeChar, event) {
    const { start, end } = this._editor.getSelection();

    // Only handle when no selection (cursor position)
    if (start !== end) return false;

    const text = this._editor.getValue();
    const charAtCursor = text[end];

    // If the character at cursor matches what we're typing, skip over it
    if (charAtCursor === closeChar) {
      event.preventDefault();
      event.stopPropagation();

      // Move cursor forward
      this._editor.setSelection(end + 1, end + 1);
      return true;
    }

    return false;
  }

  // ----------------------------------------
  // Pair Deletion Logic
  // ----------------------------------------

  _handleBackspace(event) {
    const { start, end } = this._editor.getSelection();

    // Only handle when no selection
    if (start !== end) return false;
    if (start === 0) return false;

    const text = this._editor.getValue();
    const charBefore = text[start - 1];
    const charAfter = text[start];

    // Check if we have an empty pair: (|) or [|] or {|} etc.
    if (PAIRS[charBefore] === charAfter) {
      event.preventDefault();
      event.stopPropagation();

      // Delete both characters
      this._editor.document.replaceRange(start - 1, start + 1, '');
      this._editor.setSelection(start - 1, start - 1);
      return true;
    }

    return false;
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
