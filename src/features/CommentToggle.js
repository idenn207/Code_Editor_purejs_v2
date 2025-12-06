/**
 * @fileoverview Comment toggling feature
 * @module features/CommentToggle
 */

// ============================================
// Constants
// ============================================

/**
 * Language-specific comment syntax
 * @type {Object.<string, Object>}
 */
const COMMENT_SYNTAX = {
  javascript: {
    line: '//',
    block: { start: '/*', end: '*/' },
  },
  python: {
    line: '#',
    block: null, // Python uses triple quotes, not implemented yet
  },
  html: {
    line: null, // HTML doesn't have line comments
    block: { start: '<!--', end: '-->' },
  },
  css: {
    line: null, // CSS doesn't have line comments
    block: { start: '/*', end: '*/' },
  },
};

// ============================================
// CommentToggle Class
// ============================================

/**
 * Handles toggling line and block comments
 */
export class CommentToggle {
  // ----------------------------------------
  // Instance Properties
  // ----------------------------------------
  _editor = null;
  _syntax = null;
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

    // Set language-specific syntax
    const language = options.language || 'javascript';
    this._syntax = COMMENT_SYNTAX[language] || COMMENT_SYNTAX.javascript;

    // Bind keyboard shortcuts
    this._bindEvents();
  }

  // ----------------------------------------
  // Initialization
  // ----------------------------------------

  _bindEvents() {
    // Store the listener so we can remove it later
    this._keyDownHandler = (event) => this._handleKeyDown(event);

    // Use the editor's view contentElement
    this._editor.view.contentElement.addEventListener('keydown', this._keyDownHandler, false);
  }

  // ----------------------------------------
  // Event Handling
  // ----------------------------------------

  /**
   * Handle keydown event for keyboard shortcuts
   * @param {KeyboardEvent} event - Keyboard event
   * @private
   */
  _handleKeyDown(event) {
    const { key, ctrlKey, metaKey, shiftKey, altKey } = event;
    const modKey = ctrlKey || metaKey;

    // Ctrl+/ or Cmd+/ - Toggle line comment
    if (key === '/' && modKey && !shiftKey && !altKey) {
      event.preventDefault();
      event.stopPropagation();
      this.toggleLineComment();
      return;
    }

    // Shift+Alt+A - Toggle block comment
    if (key === 'a' && shiftKey && altKey && !ctrlKey && !metaKey) {
      event.preventDefault();
      event.stopPropagation();
      this.toggleBlockComment();
      return;
    }
  }

  // ----------------------------------------
  // Line Comment Logic
  // ----------------------------------------

  /**
   * Toggle line comment for selected lines
   */
  toggleLineComment() {
    if (!this._syntax.line) {
      console.warn('Line comments not supported for this language');
      return;
    }

    const { start, end } = this._editor.getSelection();
    const document = this._editor.document;

    // Get start and end positions
    const startPos = document.offsetToPosition(start);
    const endPos = document.offsetToPosition(end);

    // Get all lines in selection
    const startLine = startPos.line;
    const endLine = endPos.line;

    // Check if all lines are commented
    const allCommented = this._areAllLinesCommented(startLine, endLine);

    // Build new text
    const lines = [];
    for (let i = startLine; i <= endLine; i++) {
      let lineText = document.getLine(i);

      if (allCommented) {
        // Remove comment
        lineText = this._uncommentLine(lineText);
      } else {
        // Add comment
        lineText = this._commentLine(lineText);
      }

      lines.push(lineText);
    }

    // Replace lines
    const startOffset = document.positionToOffset(startLine, 0);
    const endOffset = document.positionToOffset(endLine + 1, 0);
    const newText = lines.join('\n');

    // Check if there's a newline at the end
    const hasTrailingNewline = endOffset > startOffset && document.getText()[endOffset - 1] === '\n';

    document.replaceRange(
      startOffset,
      endOffset - (hasTrailingNewline ? 1 : 0),
      newText
    );

    // Restore selection (roughly)
    const commentLength = this._syntax.line.length + 1; // Include space
    const delta = allCommented ? -commentLength : commentLength;
    const numLines = endLine - startLine + 1;

    this._editor.setSelection(
      Math.max(startOffset, start + delta),
      Math.max(startOffset, start + delta * numLines + (end - start))
    );
  }

  /**
   * Check if all lines in range are commented
   * @param {number} startLine - Start line number
   * @param {number} endLine - End line number
   * @returns {boolean}
   * @private
   */
  _areAllLinesCommented(startLine, endLine) {
    const document = this._editor.document;
    const commentPrefix = this._syntax.line;

    for (let i = startLine; i <= endLine; i++) {
      const lineText = document.getLine(i);
      const trimmed = lineText.trim();

      // Skip empty lines
      if (trimmed === '') continue;

      // Check if line starts with comment
      if (!trimmed.startsWith(commentPrefix)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Add line comment to a line
   * @param {string} lineText - Line text
   * @returns {string} Commented line
   * @private
   */
  _commentLine(lineText) {
    const commentPrefix = this._syntax.line + ' ';

    // Find first non-whitespace character
    const match = lineText.match(/^(\s*)/);
    const indent = match ? match[1] : '';
    const content = lineText.slice(indent.length);

    return indent + commentPrefix + content;
  }

  /**
   * Remove line comment from a line
   * @param {string} lineText - Line text
   * @returns {string} Uncommented line
   * @private
   */
  _uncommentLine(lineText) {
    const commentPrefix = this._syntax.line;

    // Find the comment prefix and remove it (with optional space)
    const regex = new RegExp(`^(\\s*)${this._escapeRegex(commentPrefix)}\\s?`);
    return lineText.replace(regex, '$1');
  }

  // ----------------------------------------
  // Block Comment Logic
  // ----------------------------------------

  /**
   * Toggle block comment for selection
   */
  toggleBlockComment() {
    if (!this._syntax.block) {
      console.warn('Block comments not supported for this language');
      return;
    }

    const { start, end } = this._editor.getSelection();
    const text = this._editor.getValue();
    const selectedText = this._editor.getSelectedText();

    const blockStart = this._syntax.block.start;
    const blockEnd = this._syntax.block.end;

    // Check if selection is already block commented
    const beforeSelection = text.slice(Math.max(0, start - blockStart.length), start);
    const afterSelection = text.slice(end, Math.min(text.length, end + blockEnd.length));

    const isCommented = beforeSelection === blockStart && afterSelection === blockEnd;

    if (isCommented) {
      // Remove block comment
      this._editor.document.replaceRange(
        start - blockStart.length,
        end + blockEnd.length,
        selectedText
      );

      this._editor.setSelection(
        start - blockStart.length,
        start - blockStart.length + selectedText.length
      );
    } else {
      // Add block comment
      const commented = blockStart + selectedText + blockEnd;
      this._editor.document.replaceRange(start, end, commented);

      this._editor.setSelection(
        start + blockStart.length,
        start + blockStart.length + selectedText.length
      );
    }
  }

  // ----------------------------------------
  // Public API
  // ----------------------------------------

  /**
   * Set language-specific comment syntax
   * @param {string} language - Language name
   */
  setLanguage(language) {
    this._syntax = COMMENT_SYNTAX[language] || COMMENT_SYNTAX.javascript;
  }

  /**
   * Set custom comment syntax
   * @param {Object} syntax - Custom syntax object
   * @param {string} syntax.line - Line comment prefix
   * @param {Object} syntax.block - Block comment delimiters
   */
  setSyntax(syntax) {
    this._syntax = syntax;
  }

  // ----------------------------------------
  // Helpers
  // ----------------------------------------

  /**
   * Escape special regex characters
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   * @private
   */
  _escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
      this._editor.view.contentElement.removeEventListener('keydown', this._keyDownHandler, false);
    }

    this._editor = null;
    this._syntax = null;
    this._keyDownHandler = null;
    this._disposed = true;
  }
}
