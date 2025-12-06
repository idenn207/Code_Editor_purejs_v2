/**
 * @fileoverview Line operations feature (duplicate, delete, move)
 * @module features/LineOperations
 */

// ============================================
// LineOperations Class
// ============================================

/**
 * Handles line-based editing operations
 */
export class LineOperations {
  // ----------------------------------------
  // Instance Properties
  // ----------------------------------------
  _editor = null;
  _disposed = false;

  // ----------------------------------------
  // Constructor
  // ----------------------------------------

  /**
   * @param {Editor} editor - Editor instance
   */
  constructor(editor) {
    this._editor = editor;

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

    // Alt+Up/Down - Move line up/down
    if ((key === 'ArrowUp' || key === 'ArrowDown') && altKey && !modKey && !shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      const direction = key === 'ArrowUp' ? -1 : 1;
      this.moveLine(direction);
      return;
    }

    // Shift+Alt+Up/Down - Duplicate line up/down
    if ((key === 'ArrowUp' || key === 'ArrowDown') && altKey && shiftKey && !modKey) {
      event.preventDefault();
      event.stopPropagation();
      const direction = key === 'ArrowUp' ? -1 : 1;
      this.duplicateLine(direction);
      return;
    }

    // Ctrl+Shift+K - Delete line
    if (key === 'k' && modKey && shiftKey && !altKey) {
      event.preventDefault();
      event.stopPropagation();
      this.deleteLine();
      return;
    }
  }

  // ----------------------------------------
  // Line Operations
  // ----------------------------------------

  /**
   * Duplicate line(s) up or down
   * @param {number} direction - Direction (-1 for up, 1 for down)
   */
  duplicateLine(direction = 1) {
    const { start, end } = this._editor.getSelection();
    const document = this._editor.document;

    // Get start and end line numbers
    const startPos = document.offsetToPosition(start);
    const endPos = document.offsetToPosition(end);

    const startLine = startPos.line;
    const endLine = endPos.line;

    // Get all lines in selection
    const lines = [];
    for (let i = startLine; i <= endLine; i++) {
      lines.push(document.getLine(i));
    }

    // Duplicate text
    const duplicatedText = lines.join('\n');

    if (direction === -1) {
      // Duplicate above - insert at start of selection
      const insertOffset = document.positionToOffset(startLine, 0);
      document.replaceRange(insertOffset, insertOffset, duplicatedText + '\n');

      // Move selection to duplicated lines
      this._editor.setSelection(insertOffset, insertOffset + duplicatedText.length);
    } else {
      // Duplicate below - insert after selection
      const insertOffset = document.positionToOffset(endLine + 1, 0);
      document.replaceRange(insertOffset, insertOffset, duplicatedText + '\n');

      // Keep selection on original lines
      this._editor.setSelection(start, end);
    }
  }

  /**
   * Delete line(s)
   */
  deleteLine() {
    const { start, end } = this._editor.getSelection();
    const document = this._editor.document;

    // Get start and end line numbers
    const startPos = document.offsetToPosition(start);
    const endPos = document.offsetToPosition(end);

    const startLine = startPos.line;
    const endLine = endPos.line;

    // Calculate range to delete (including newline)
    const deleteStart = document.positionToOffset(startLine, 0);
    let deleteEnd = document.positionToOffset(endLine + 1, 0);

    // Handle last line (may not have newline)
    if (deleteEnd === deleteStart) {
      deleteEnd = document.positionToOffset(endLine, document.getLine(endLine).length);
    }

    // Delete the lines
    document.replaceRange(deleteStart, deleteEnd, '');

    // Move cursor to start of next line (or end of previous line if at end)
    const newLineCount = document.getLineCount();
    if (startLine < newLineCount) {
      const newOffset = document.positionToOffset(startLine, 0);
      this._editor.setSelection(newOffset, newOffset);
    } else if (startLine > 0) {
      const prevLine = startLine - 1;
      const newOffset = document.positionToOffset(prevLine, document.getLine(prevLine).length);
      this._editor.setSelection(newOffset, newOffset);
    } else {
      this._editor.setSelection(0, 0);
    }
  }

  /**
   * Move line(s) up or down
   * @param {number} direction - Direction (-1 for up, 1 for down)
   */
  moveLine(direction = 1) {
    const { start, end } = this._editor.getSelection();
    const document = this._editor.document;

    // Get start and end line numbers
    const startPos = document.offsetToPosition(start);
    const endPos = document.offsetToPosition(end);

    const startLine = startPos.line;
    const endLine = endPos.line;

    // Check bounds
    if (direction === -1 && startLine === 0) {
      return; // Can't move up from first line
    }
    if (direction === 1 && endLine === document.getLineCount() - 1) {
      return; // Can't move down from last line
    }

    // Get lines to move
    const lines = [];
    for (let i = startLine; i <= endLine; i++) {
      lines.push(document.getLine(i));
    }
    const movingText = lines.join('\n');

    if (direction === -1) {
      // Move up - swap with line above
      const targetLine = startLine - 1;
      const targetText = document.getLine(targetLine);

      // Calculate offsets
      const targetOffset = document.positionToOffset(targetLine, 0);
      const endOffset = document.positionToOffset(endLine + 1, 0);

      // Build replacement text (moving lines first, then target line)
      const replacement = movingText + '\n' + targetText;

      // Replace
      document.replaceRange(targetOffset, endOffset, replacement);

      // Update selection to moved lines
      const newStart = targetOffset + startPos.column;
      const newEnd = targetOffset + movingText.length - (document.getLine(endLine).length - endPos.column);

      this._editor.setSelection(newStart, newEnd);
    } else {
      // Move down - swap with line below
      const targetLine = endLine + 1;
      const targetText = document.getLine(targetLine);

      // Calculate offsets
      const startOffset = document.positionToOffset(startLine, 0);
      const targetEndOffset = document.positionToOffset(targetLine + 1, 0);

      // Build replacement text (target line first, then moving lines)
      const replacement = targetText + '\n' + movingText;

      // Replace
      document.replaceRange(startOffset, targetEndOffset, replacement);

      // Update selection to moved lines
      const newStart = document.positionToOffset(startLine + 1, startPos.column);
      const newEnd = document.positionToOffset(endLine + 1, endPos.column);

      this._editor.setSelection(newStart, newEnd);
    }
  }

  // ----------------------------------------
  // Public API
  // ----------------------------------------

  /**
   * Duplicate current line or selection down
   */
  duplicateDown() {
    this.duplicateLine(1);
  }

  /**
   * Duplicate current line or selection up
   */
  duplicateUp() {
    this.duplicateLine(-1);
  }

  /**
   * Move current line or selection up
   */
  moveUp() {
    this.moveLine(-1);
  }

  /**
   * Move current line or selection down
   */
  moveDown() {
    this.moveLine(1);
  }

  /**
   * Delete current line or selection
   */
  delete() {
    this.deleteLine();
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
    this._keyDownHandler = null;
    this._disposed = true;
  }
}
