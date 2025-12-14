/**
 * @fileoverview Individual selection/cursor representation
 *
 * Represents a single selection or cursor position in the editor.
 * Selections have an anchor (fixed point) and cursor (movable point).
 */

(function(CodeEditor) {
  'use strict';

  // ============================================
  // Class Definition
  // ============================================

  /**
   * Represents a selection range or cursor position.
   * Supports both forward (left-to-right) and reversed (right-to-left) selections.
   *
   * @example
   * // Cursor position (no selection)
   * const cursor = new Selection(5, 5);
   *
   * // Forward selection (anchor at 5, cursor at 10)
   * const forward = new Selection(5, 10);
   *
   * // Reversed selection (anchor at 10, cursor at 5)
   * const reversed = new Selection(10, 5, true);
   */
  class Selection {
    // ----------------------------------------
    // Instance Properties
    // ----------------------------------------
    _startOffset = 0;
    _endOffset = 0;
    _isReversed = false;

    // ----------------------------------------
    // Constructor
    // ----------------------------------------

    /**
     * @param {number} startOffset - Start offset (anchor if not reversed)
     * @param {number} endOffset - End offset (cursor if not reversed)
     * @param {boolean} isReversed - Whether selection was made right-to-left
     */
    constructor(startOffset, endOffset, isReversed = false) {
      this._startOffset = startOffset;
      this._endOffset = endOffset;
      this._isReversed = isReversed;
    }

    // ----------------------------------------
    // Getters
    // ----------------------------------------

    /**
     * Anchor position (where selection started, stays fixed during extension)
     * @returns {number}
     */
    get anchor() {
      return this._isReversed ? this._endOffset : this._startOffset;
    }

    /**
     * Cursor position (where selection ends, moves during extension)
     * @returns {number}
     */
    get cursor() {
      return this._isReversed ? this._startOffset : this._endOffset;
    }

    /**
     * Normalized start position (always <= end)
     * @returns {number}
     */
    get start() {
      return Math.min(this._startOffset, this._endOffset);
    }

    /**
     * Normalized end position (always >= start)
     * @returns {number}
     */
    get end() {
      return Math.max(this._startOffset, this._endOffset);
    }

    /**
     * Whether this is a cursor (no selection) vs a range selection
     * @returns {boolean}
     */
    get isEmpty() {
      return this._startOffset === this._endOffset;
    }

    /**
     * Whether selection was made right-to-left
     * @returns {boolean}
     */
    get isReversed() {
      return this._isReversed;
    }

    // ----------------------------------------
    // Public Methods
    // ----------------------------------------

    /**
     * Check if this selection overlaps with another
     * @param {Selection} other - Another selection
     * @returns {boolean}
     */
    overlapsWith(other) {
      return !(this.end < other.start || this.start > other.end);
    }

    /**
     * Check if this selection is adjacent to another (for merging)
     * @param {Selection} other - Another selection
     * @returns {boolean}
     */
    isAdjacentTo(other) {
      return this.end === other.start || this.start === other.end;
    }

    /**
     * Merge with another selection (assumes they overlap or are adjacent)
     * @param {Selection} other - Another selection
     * @returns {Selection} New merged selection
     */
    mergeWith(other) {
      const newStart = Math.min(this.start, other.start);
      const newEnd = Math.max(this.end, other.end);

      // Preserve direction of "this" selection
      if (this._isReversed) {
        return new Selection(newEnd, newStart, true);
      }
      return new Selection(newStart, newEnd, false);
    }

    /**
     * Create a copy with updated offsets
     * @param {number} startOffset - New start offset
     * @param {number} endOffset - New end offset
     * @param {boolean|null} isReversed - New reversed state (null to keep current)
     * @returns {Selection}
     */
    withOffsets(startOffset, endOffset, isReversed = null) {
      return new Selection(
        startOffset,
        endOffset,
        isReversed !== null ? isReversed : this._isReversed
      );
    }

    /**
     * Clone this selection
     * @returns {Selection}
     */
    clone() {
      return new Selection(this._startOffset, this._endOffset, this._isReversed);
    }

    /**
     * Convert to plain object for backward compatibility
     * @returns {{ start: number, end: number }}
     */
    toObject() {
      return { start: this.start, end: this.end };
    }

    /**
     * Check equality with another selection
     * @param {Selection} other - Another selection
     * @returns {boolean}
     */
    equals(other) {
      return (
        this._startOffset === other._startOffset &&
        this._endOffset === other._endOffset &&
        this._isReversed === other._isReversed
      );
    }

    // ----------------------------------------
    // Static Methods
    // ----------------------------------------

    /**
     * Create from legacy {start, end} format
     * Note: {start, end} is treated as {anchor, cursor} when determining direction
     * @param {{ start: number, end: number }} obj - Plain object
     * @returns {Selection}
     */
    static fromObject(obj) {
      const isReversed = obj.start > obj.end;
      // When reversed, swap so _startOffset is always the smaller value
      if (isReversed) {
        return new Selection(obj.end, obj.start, true);
      }
      return new Selection(obj.start, obj.end, false);
    }

    /**
     * Create a cursor (empty selection) at offset
     * @param {number} offset - Cursor position
     * @returns {Selection}
     */
    static cursor(offset) {
      return new Selection(offset, offset, false);
    }

    /**
     * Create a range selection
     * @param {number} anchor - Anchor position (fixed point)
     * @param {number} cursor - Cursor position (movable point)
     * @returns {Selection}
     */
    static range(anchor, cursor) {
      const isReversed = anchor > cursor;
      // When reversed, we need to swap so that _startOffset is always the smaller value
      // The getters will then use _isReversed to correctly return anchor/cursor
      if (isReversed) {
        return new Selection(cursor, anchor, true);
      }
      return new Selection(anchor, cursor, false);
    }
  }

  // ============================================
  // Export to Namespace
  // ============================================

  CodeEditor.Selection = Selection;

})(window.CodeEditor = window.CodeEditor || {});
