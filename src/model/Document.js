/**
 * @fileoverview Document model for text storage and manipulation
 * @module model/Document
 */

// ============================================
// Class Definition
// ============================================

/**
 * Represents the text document being edited.
 * Stores content as an array of lines for efficient line-based operations.
 */
export class Document {
  // ----------------------------------------
  // Instance Properties
  // ----------------------------------------
  _lines = [''];
  _version = 0;
  _listeners = new Map();

  // ----------------------------------------
  // Constructor
  // ----------------------------------------
  constructor(initialText = '') {
    if (initialText) {
      this._lines = initialText.split('\n');
    }
  }

  // ----------------------------------------
  // Public Methods - Text Access
  // ----------------------------------------

  /**
   * Get the full document text
   * @returns {string}
   */
  getText() {
    return this._lines.join('\n');
  }

  /**
   * Get text within a range
   * @param {number} startOffset
   * @param {number} endOffset
   * @returns {string}
   */
  getTextRange(startOffset, endOffset) {
    const text = this.getText();
    return text.slice(startOffset, endOffset);
  }

  /**
   * Get a specific line's content
   * @param {number} lineIndex - 0-based line index
   * @returns {string}
   */
  getLine(lineIndex) {
    return this._lines[lineIndex] || '';
  }

  /**
   * Get total number of lines
   * @returns {number}
   */
  getLineCount() {
    return this._lines.length;
  }

  /**
   * Get total character count
   * @returns {number}
   */
  getLength() {
    return this.getText().length;
  }

  // ----------------------------------------
  // Public Methods - Text Modification
  // ----------------------------------------

  /**
   * Replace text in a range with new text
   * @param {number} startOffset - Start character offset
   * @param {number} endOffset - End character offset
   * @param {string} newText - Text to insert
   * @returns {Object} Change info { startOffset, endOffset, insertedText, deletedText }
   */
  replaceRange(startOffset, endOffset, newText) {
    const oldText = this.getText();
    const deletedText = oldText.slice(startOffset, endOffset);

    const newFullText = oldText.slice(0, startOffset) + newText + oldText.slice(endOffset);

    this._lines = newFullText.split('\n');
    this._version++;

    const change = {
      startOffset,
      endOffset,
      insertedText: newText,
      deletedText,
      newEndOffset: startOffset + newText.length,
    };

    this._emit('change', change);
    return change;
  }

  /**
   * Insert text at a specific offset
   * @param {number} offset
   * @param {string} text
   */
  insert(offset, text) {
    return this.replaceRange(offset, offset, text);
  }

  /**
   * Delete text in a range
   * @param {number} startOffset
   * @param {number} endOffset
   */
  delete(startOffset, endOffset) {
    return this.replaceRange(startOffset, endOffset, '');
  }

  /**
   * Set entire document content
   * @param {string} text
   */
  setText(text) {
    return this.replaceRange(0, this.getLength(), text);
  }

  // ----------------------------------------
  // Public Methods - Position Conversion
  // ----------------------------------------

  /**
   * Convert character offset to line/column position
   * @param {number} offset
   * @returns {{ line: number, column: number }}
   */
  offsetToPosition(offset) {
    let remaining = offset;

    for (let line = 0; line < this._lines.length; line++) {
      const lineLength = this._lines[line].length;

      if (remaining <= lineLength) {
        return { line, column: remaining };
      }

      remaining -= lineLength + 1; // +1 for newline
    }

    // Past end of document
    const lastLine = this._lines.length - 1;
    return {
      line: lastLine,
      column: this._lines[lastLine].length,
    };
  }

  /**
   * Convert line/column position to character offset
   * @param {number} line
   * @param {number} column
   * @returns {number}
   */
  positionToOffset(line, column) {
    let offset = 0;

    for (let i = 0; i < line && i < this._lines.length; i++) {
      offset += this._lines[i].length + 1; // +1 for newline
    }

    if (line < this._lines.length) {
      offset += Math.min(column, this._lines[line].length);
    }

    return offset;
  }

  // ----------------------------------------
  // Event System
  // ----------------------------------------

  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);

    return () => this.off(event, callback);
  }

  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  _emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  // ----------------------------------------
  // Getters
  // ----------------------------------------

  get version() {
    return this._version;
  }

  get lines() {
    return this._lines;
  }
}
