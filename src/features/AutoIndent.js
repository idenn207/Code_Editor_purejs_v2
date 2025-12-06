/**
 * @fileoverview Auto-indentation feature
 * @module features/AutoIndent
 */

// ============================================
// Constants
// ============================================

/**
 * Characters that increase indentation on next line
 * @type {RegExp}
 */
const INDENT_INCREASE_PATTERN = /[{[(]\s*$/;

/**
 * Characters that decrease indentation on current line
 * @type {RegExp}
 */
const INDENT_DECREASE_PATTERN = /^\s*[}\])]/;

/**
 * Keywords that increase indentation (JavaScript)
 * @type {RegExp}
 */
const INDENT_INCREASE_KEYWORDS = /\b(if|else|for|while|do|switch|case|try|catch|finally|function|class)\s*(\(.*\))?\s*$/;

// ============================================
// AutoIndent Class
// ============================================

/**
 * Handles automatic indentation
 */
export class AutoIndent {
  // ----------------------------------------
  // Instance Properties
  // ----------------------------------------
  _editor = null;
  _tabSize = 2;
  _insertSpaces = true;
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
    this._tabSize = options.tabSize || 2;
    this._insertSpaces = options.insertSpaces !== false;

    // Bind events
    this._bindEvents();
  }

  // ----------------------------------------
  // Initialization
  // ----------------------------------------

  _bindEvents() {
    // Store the listener so we can remove it later
    this._keyDownHandler = (event) => this._handleKeyDown(event);

    // Use the editor's view contentElement
    this._editor.view.contentElement.addEventListener('keydown', this._keyDownHandler, true);
  }

  // ----------------------------------------
  // Event Handling
  // ----------------------------------------

  /**
   * Handle keydown event for indentation
   * @param {KeyboardEvent} event - Keyboard event
   * @private
   */
  _handleKeyDown(event) {
    const { key, ctrlKey, metaKey, shiftKey } = event;
    const modKey = ctrlKey || metaKey;

    // Enter key - Auto-indent new line
    if (key === 'Enter' && !modKey && !shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      this._handleEnter();
      return;
    }

    // Tab key - Indent/Outdent
    if (key === 'Tab') {
      event.preventDefault();
      event.stopPropagation();
      if (shiftKey) {
        this.outdent();
      } else {
        this.indent();
      }
      return;
    }

    // Closing brace - Auto-dedent
    if ((key === '}' || key === ')' || key === ']') && !modKey && !shiftKey) {
      // Let the key be typed first, then dedent
      setTimeout(() => {
        this._handleClosingBrace(key);
      }, 0);
      return;
    }
  }

  // ----------------------------------------
  // Enter Key Handling
  // ----------------------------------------

  /**
   * Handle Enter key press with auto-indentation
   * @private
   */
  _handleEnter() {
    const { start, end } = this._editor.getSelection();
    const document = this._editor.document;

    // Get current line
    const currentPos = document.offsetToPosition(start);
    const currentLine = document.getLine(currentPos.line);

    // Detect current indentation
    let indent = this._detectIndent(currentLine);

    // Check if line ends with indent-increasing character
    const shouldIncreaseIndent = INDENT_INCREASE_PATTERN.test(currentLine.trimEnd());

    // Check if line ends with indent-increasing keyword
    const hasIncreaseKeyword = INDENT_INCREASE_KEYWORDS.test(currentLine.trimEnd());

    if (shouldIncreaseIndent || hasIncreaseKeyword) {
      indent += this._tabSize;
    }

    // Check if we're between brackets
    const charBefore = document.getText()[start - 1];
    const charAfter = document.getText()[start];
    const betweenBrackets =
      (charBefore === '{' && charAfter === '}') ||
      (charBefore === '[' && charAfter === ']') ||
      (charBefore === '(' && charAfter === ')');

    if (betweenBrackets) {
      // Insert two lines with proper indentation
      const indentStr = ' '.repeat(indent);
      const dedentStr = ' '.repeat(indent - this._tabSize);
      const newText = '\n' + indentStr + '\n' + dedentStr;

      document.replaceRange(start, end, newText);

      // Position cursor on the middle line
      const newPos = start + 1 + indentStr.length;
      this._editor.setSelection(newPos, newPos);
    } else {
      // Insert single line with proper indentation
      const indentStr = ' '.repeat(indent);
      const newText = '\n' + indentStr;

      document.replaceRange(start, end, newText);

      // Position cursor after indentation
      const newPos = start + newText.length;
      this._editor.setSelection(newPos, newPos);
    }
  }

  // ----------------------------------------
  // Closing Brace Handling
  // ----------------------------------------

  /**
   * Handle closing brace with auto-dedent
   * @param {string} char - Closing character
   * @private
   */
  _handleClosingBrace(char) {
    const { end } = this._editor.getSelection();
    const document = this._editor.document;

    // Get current line
    const currentPos = document.offsetToPosition(end);
    const currentLine = document.getLine(currentPos.line);

    // Check if the closing brace is the only content on the line (besides whitespace)
    const trimmed = currentLine.trim();
    if (trimmed !== char) {
      return; // Don't dedent if there's other content
    }

    // Get current indentation
    const currentIndent = this._detectIndent(currentLine);

    if (currentIndent === 0) {
      return; // Already at zero indentation
    }

    // Calculate new indentation (dedent by one level)
    const newIndent = Math.max(0, currentIndent - this._tabSize);
    const newIndentStr = ' '.repeat(newIndent);

    // Replace the line
    const lineStart = document.positionToOffset(currentPos.line, 0);
    const lineEnd = document.positionToOffset(currentPos.line, currentLine.length);

    document.replaceRange(lineStart, lineEnd, newIndentStr + char);

    // Position cursor after the brace
    const newPos = lineStart + newIndentStr.length + 1;
    this._editor.setSelection(newPos, newPos);
  }

  // ----------------------------------------
  // Indent/Outdent Operations
  // ----------------------------------------

  /**
   * Indent selected lines or insert tab at cursor
   */
  indent() {
    const { start, end } = this._editor.getSelection();
    const document = this._editor.document;

    if (start === end) {
      // No selection - insert tab/spaces at cursor
      const tabStr = this._insertSpaces ? ' '.repeat(this._tabSize) : '\t';
      document.replaceRange(start, end, tabStr);
      this._editor.setSelection(start + tabStr.length, start + tabStr.length);
    } else {
      // Has selection - indent all selected lines
      this._indentLines(start, end, 1);
    }
  }

  /**
   * Outdent selected lines
   */
  outdent() {
    const { start, end } = this._editor.getSelection();

    if (start === end) {
      // No selection - remove indentation before cursor
      this._outdentAtCursor(start);
    } else {
      // Has selection - outdent all selected lines
      this._indentLines(start, end, -1);
    }
  }

  /**
   * Indent or outdent lines in range
   * @param {number} start - Selection start offset
   * @param {number} end - Selection end offset
   * @param {number} direction - 1 for indent, -1 for outdent
   * @private
   */
  _indentLines(start, end, direction) {
    const document = this._editor.document;

    // Get line range
    const startPos = document.offsetToPosition(start);
    const endPos = document.offsetToPosition(end);

    const startLine = startPos.line;
    const endLine = endPos.line;

    // Process each line
    const lines = [];
    for (let i = startLine; i <= endLine; i++) {
      let lineText = document.getLine(i);

      if (direction === 1) {
        // Indent - add spaces
        const indentStr = ' '.repeat(this._tabSize);
        lineText = indentStr + lineText;
      } else {
        // Outdent - remove spaces
        lineText = this._removeLeadingSpaces(lineText, this._tabSize);
      }

      lines.push(lineText);
    }

    // Replace lines
    const replaceStart = document.positionToOffset(startLine, 0);
    const replaceEnd = document.positionToOffset(endLine + 1, 0);
    const newText = lines.join('\n');

    // Check if there's a newline at the end
    const hasTrailingNewline = document.getText()[replaceEnd - 1] === '\n';

    document.replaceRange(
      replaceStart,
      replaceEnd - (hasTrailingNewline ? 1 : 0),
      newText
    );

    // Update selection
    const delta = direction * this._tabSize;
    const numLines = endLine - startLine + 1;

    this._editor.setSelection(
      Math.max(replaceStart, start + delta),
      Math.max(replaceStart, start + delta * numLines + (end - start))
    );
  }

  /**
   * Outdent at cursor position
   * @param {number} offset - Cursor offset
   * @private
   */
  _outdentAtCursor(offset) {
    const document = this._editor.document;
    const pos = document.offsetToPosition(offset);
    const lineText = document.getLine(pos.line);

    // Get text before cursor
    const beforeCursor = lineText.slice(0, pos.column);

    // Check if all characters before cursor are spaces
    if (!/^\s+$/.test(beforeCursor)) {
      return; // Can't outdent if there's non-whitespace before cursor
    }

    // Remove up to tabSize spaces before cursor
    const spacesToRemove = Math.min(this._tabSize, beforeCursor.length);
    const removeStart = offset - spacesToRemove;

    document.replaceRange(removeStart, offset, '');
    this._editor.setSelection(removeStart, removeStart);
  }

  // ----------------------------------------
  // Helper Methods
  // ----------------------------------------

  /**
   * Detect indentation level of a line
   * @param {string} lineText - Line text
   * @returns {number} Number of spaces
   * @private
   */
  _detectIndent(lineText) {
    const match = lineText.match(/^(\s*)/);
    if (!match) return 0;

    const whitespace = match[1];

    // Count spaces (tabs count as tabSize spaces)
    let count = 0;
    for (const char of whitespace) {
      if (char === ' ') {
        count++;
      } else if (char === '\t') {
        count += this._tabSize;
      }
    }

    return count;
  }

  /**
   * Remove leading spaces from a line
   * @param {string} lineText - Line text
   * @param {number} count - Number of spaces to remove
   * @returns {string} Line text with spaces removed
   * @private
   */
  _removeLeadingSpaces(lineText, count) {
    let removed = 0;
    let index = 0;

    while (removed < count && index < lineText.length) {
      if (lineText[index] === ' ') {
        removed++;
        index++;
      } else if (lineText[index] === '\t') {
        removed += this._tabSize;
        index++;
      } else {
        break;
      }
    }

    return lineText.slice(index);
  }

  // ----------------------------------------
  // Public API
  // ----------------------------------------

  /**
   * Set tab size
   * @param {number} size - Tab size in spaces
   */
  setTabSize(size) {
    this._tabSize = size;
  }

  /**
   * Set whether to insert spaces or tabs
   * @param {boolean} insertSpaces - True to insert spaces
   */
  setInsertSpaces(insertSpaces) {
    this._insertSpaces = insertSpaces;
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
    this._keyDownHandler = null;
    this._disposed = true;
  }
}
