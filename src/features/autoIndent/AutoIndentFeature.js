/**
 * @fileoverview Auto-indent feature for code editor
 * @module features/autoIndent/AutoIndentFeature
 *
 * Automatically handles indentation when pressing Enter:
 * - Maintains current line indentation
 * - Increases indent after opening brackets/colons
 * - Special handling for Enter between paired brackets
 */

// ============================================
// Constants
// ============================================

// Characters that trigger indent increase on the next line
const INDENT_TRIGGERS = new Set(['{', '(', '[', ':']);

// Characters that indicate we should dedent
const DEDENT_TRIGGERS = new Set(['}', ')', ']']);

// ============================================
// Class Definition
// ============================================

/**
 * Auto-indent feature for the code editor.
 * Handles smart indentation when pressing Enter.
 *
 * @example
 * const autoIndent = new AutoIndentFeature(editor, { tabSize: 2 });
 */
export class AutoIndentFeature {
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
    this._boundHandleKeyDown = (e) => this._handleKeyDown(e);
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
  }

  _handleEnter(event) {
    // Prevent default Enter behavior
    event.preventDefault();
    event.stopPropagation();

    const { start, end } = this._editor.getSelection();

    // Get cursor position in line/column
    const pos = this._editor.document.offsetToPosition(start);
    const currentLine = this._editor.document.getLine(pos.line);

    // Split line at cursor position
    const beforeCursor = currentLine.slice(0, pos.column);
    const afterCursor = currentLine.slice(pos.column);

    // Get current indentation
    const currentIndent = this._getIndentation(currentLine);

    // Check last non-whitespace character before cursor
    const trimmedBefore = beforeCursor.trimEnd();
    const lastChar = trimmedBefore.slice(-1);
    const shouldIncrease = INDENT_TRIGGERS.has(lastChar);

    // Check first non-whitespace character after cursor
    const trimmedAfter = afterCursor.trimStart();
    const firstCharAfter = trimmedAfter[0];
    const hasClosingBracket = DEDENT_TRIGGERS.has(firstCharAfter);

    // Calculate new indentation
    let newIndent = currentIndent;
    if (shouldIncrease) {
      newIndent = currentIndent + this._getIndentString();
    }

    // Special case: Enter between paired brackets like {|}
    if (shouldIncrease && hasClosingBracket) {
      this._handleBracketEnter(start, end, currentIndent);
      return;
    }

    // Normal Enter: insert newline + indentation
    const insertText = '\n' + newIndent;

    // If there's a selection, delete it first
    if (start !== end) {
      this._editor.document.replaceRange(start, end, insertText);
    } else {
      this._editor.document.insert(start, insertText);
    }

    // Move cursor to end of inserted indentation
    const newCursorPos = start + insertText.length;
    this._editor.setSelection(newCursorPos, newCursorPos);
  }

  _handleBracketEnter(start, end, baseIndent) {
    // {|} -> {\n  |\n}
    const indent = this._getIndentString();
    const insertText = '\n' + baseIndent + indent + '\n' + baseIndent;

    // Replace selection (or insert at cursor)
    if (start !== end) {
      this._editor.document.replaceRange(start, end, insertText);
    } else {
      this._editor.document.insert(start, insertText);
    }

    // Place cursor at the indented middle line
    // Position: start + '\n'.length + baseIndent.length + indent.length
    const cursorPos = start + 1 + baseIndent.length + indent.length;
    this._editor.setSelection(cursorPos, cursorPos);
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
    const match = line.match(/^(\s*)/);
    return match ? match[1] : '';
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
