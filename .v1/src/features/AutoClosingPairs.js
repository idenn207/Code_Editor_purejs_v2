/**
 * @fileoverview Auto-closing pairs feature for brackets, quotes, etc.
 * @module features/AutoClosingPairs
 */

// ============================================
// Constants
// ============================================

/**
 * Default closing pairs configuration
 * @type {Object.<string, string>}
 */
const DEFAULT_PAIRS = {
  '(': ')',
  '[': ']',
  '{': '}',
  '"': '"',
  "'": "'",
  '`': '`',
};

/**
 * Language-specific pair configurations
 * @type {Object.<string, Object.<string, string>>}
 */
const LANGUAGE_PAIRS = {
  javascript: DEFAULT_PAIRS,
  html: {
    ...DEFAULT_PAIRS,
    '<': '>',
  },
  python: {
    '(': ')',
    '[': ']',
    '{': '}',
    '"': '"',
    "'": "'",
  },
  css: DEFAULT_PAIRS,
};

// ============================================
// AutoClosingPairs Class
// ============================================

/**
 * Handles automatic closing of bracket and quote pairs
 */
export class AutoClosingPairs {
  // ----------------------------------------
  // Instance Properties
  // ----------------------------------------
  _editor = null;
  _pairs = DEFAULT_PAIRS;
  _reversePairs = {}; // Closing char -> Opening char map
  _enabled = true;
  _disposed = false;

  // ----------------------------------------
  // Constructor
  // ----------------------------------------

  /**
   * @param {Editor} editor - Editor instance
   * @param {Object} options - Configuration options
   */
  constructor(editor, options = {}) {
    this._editor = editor;
    this._enabled = options.enabled !== false;

    // Set language-specific pairs
    const language = options.language || 'javascript';
    this._pairs = LANGUAGE_PAIRS[language] || DEFAULT_PAIRS;

    // Build reverse map for skip-over detection
    this._buildReversePairs();

    // Bind events
    this._bindEvents();
  }

  // ----------------------------------------
  // Initialization
  // ----------------------------------------

  _buildReversePairs() {
    this._reversePairs = {};
    for (const [open, close] of Object.entries(this._pairs)) {
      this._reversePairs[close] = open;
    }
  }

  _bindEvents() {
    // Listen to keyboard events to intercept character input
    // We need to capture this at the keypress/beforeinput level
    // Store the listener so we can remove it later
    this._keyDownHandler = (event) => this._handleKeyDown(event);

    // Use the editor's view contentElement to catch events before EditContext
    this._editor.view.contentElement.addEventListener('keydown', this._keyDownHandler, true);
  }

  // ----------------------------------------
  // Input Handling
  // ----------------------------------------

  /**
   * Handle keydown event to intercept character input
   * @param {KeyboardEvent} event - Keyboard event
   * @private
   */
  _handleKeyDown(event) {
    if (!this._enabled) return;

    // Ignore modified keys (Ctrl, Alt, Meta combinations)
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    // Get the character that will be typed
    const char = event.key;

    // Only handle single character input
    if (!char || char.length !== 1) return;

    // Don't handle special keys
    if (event.key === 'Enter' || event.key === 'Tab' || event.key === 'Escape') return;

    const { start, end } = this._editor.getSelection();
    const text = this._editor.getValue();

    // Check if typing closing character
    if (this._shouldSkipOver(char, start, end, text)) {
      event.preventDefault();
      event.stopPropagation();
      this._skipOver(start);
      return;
    }

    // Check if typing opening character
    if (this._shouldAutoClose(char, start, end, text)) {
      event.preventDefault();
      event.stopPropagation();
      this._autoClose(char, start, end);
      return;
    }
  }

  // ----------------------------------------
  // Auto-Closing Logic
  // ----------------------------------------

  /**
   * Check if we should skip over the closing character
   * @param {string} char - Character being typed
   * @param {number} start - Selection start
   * @param {number} end - Selection end
   * @param {string} text - Document text
   * @returns {boolean}
   * @private
   */
  _shouldSkipOver(char, start, end, text) {
    // Only skip if no selection
    if (start !== end) return false;

    // Check if next character matches what we're typing
    const nextChar = text[start];
    if (nextChar !== char) return false;

    // Check if this is a closing character
    return this._reversePairs[char] !== undefined;
  }

  /**
   * Skip over the closing character
   * @param {number} position - Cursor position
   * @private
   */
  _skipOver(position) {
    // Just move cursor forward by 1
    this._editor.setSelection(position + 1, position + 1);
  }

  /**
   * Check if we should auto-close with matching pair
   * @param {string} char - Character being typed
   * @param {number} start - Selection start
   * @param {number} end - Selection end
   * @param {string} text - Document text
   * @returns {boolean}
   * @private
   */
  _shouldAutoClose(char, start, end, text) {
    // Check if this is an opening character
    if (!this._pairs[char]) return false;

    // For quotes, check if we should actually close
    // (don't auto-close if inside a word)
    if (this._isQuote(char)) {
      return this._shouldAutoCloseQuote(char, start, text);
    }

    return true;
  }

  /**
   * Check if character is a quote
   * @param {string} char - Character to check
   * @returns {boolean}
   * @private
   */
  _isQuote(char) {
    return char === '"' || char === "'" || char === '`';
  }

  /**
   * Check if we should auto-close a quote
   * @param {string} char - Quote character
   * @param {number} position - Cursor position
   * @param {string} text - Document text
   * @returns {boolean}
   * @private
   */
  _shouldAutoCloseQuote(char, position, text) {
    // Don't auto-close if previous character is alphanumeric
    const prevChar = text[position - 1];
    if (prevChar && /\w/.test(prevChar)) {
      return false;
    }

    // Don't auto-close if next character is alphanumeric
    const nextChar = text[position];
    if (nextChar && /\w/.test(nextChar)) {
      return false;
    }

    return true;
  }

  /**
   * Auto-close with matching pair
   * @param {string} openChar - Opening character
   * @param {number} start - Selection start
   * @param {number} end - Selection end
   * @private
   */
  _autoClose(openChar, start, end) {
    const closeChar = this._pairs[openChar];

    if (start === end) {
      // No selection - insert both characters and move cursor between them
      this._editor.document.replaceRange(start, end, openChar + closeChar);
      this._editor.setSelection(start + 1, start + 1);
    } else {
      // Has selection - surround selection with pair
      const selectedText = this._editor.getSelectedText();
      this._editor.document.replaceRange(start, end, openChar + selectedText + closeChar);
      this._editor.setSelection(start + 1, end + 1);
    }
  }

  // ----------------------------------------
  // Public API
  // ----------------------------------------

  /**
   * Enable auto-closing pairs
   */
  enable() {
    this._enabled = true;
  }

  /**
   * Disable auto-closing pairs
   */
  disable() {
    this._enabled = false;
  }

  /**
   * Check if auto-closing is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this._enabled;
  }

  /**
   * Set language-specific pairs
   * @param {string} language - Language name
   */
  setLanguage(language) {
    this._pairs = LANGUAGE_PAIRS[language] || DEFAULT_PAIRS;
    this._buildReversePairs();
  }

  /**
   * Set custom pairs
   * @param {Object.<string, string>} pairs - Custom pairs map
   */
  setPairs(pairs) {
    this._pairs = pairs;
    this._buildReversePairs();
  }

  // ----------------------------------------
  // Cleanup
  // ----------------------------------------

  /**
   * Dispose and cleanup
   */
  dispose() {
    if (this._disposed) return;

    // Remove event listener
    if (this._keyDownHandler && this._editor && this._editor.view) {
      this._editor.view.contentElement.removeEventListener('keydown', this._keyDownHandler, true);
    }

    this._editor = null;
    this._pairs = null;
    this._reversePairs = null;
    this._keyDownHandler = null;
    this._disposed = true;
  }
}
