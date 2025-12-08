/**
 * @fileoverview Collection of selections with normalization
 * @module model/SelectionCollection
 *
 * Manages multiple selections/cursors in the editor.
 * Automatically normalizes (sorts and merges overlapping) selections.
 */

import { Selection } from './Selection.js';

// ============================================
// Class Definition
// ============================================

/**
 * Collection of selections with automatic normalization.
 * Supports multiple cursors and selections with merging of overlapping ranges.
 *
 * @example
 * const collection = new SelectionCollection();
 * collection.add(new Selection(5, 5)); // Add cursor at position 5
 * collection.add(new Selection(10, 15)); // Add selection from 10-15
 */
export class SelectionCollection {
  // ----------------------------------------
  // Instance Properties
  // ----------------------------------------
  _selections = [];
  _primaryIndex = 0;

  // ----------------------------------------
  // Constructor
  // ----------------------------------------

  /**
   * @param {Array<Selection|{start: number, end: number}>} selections - Initial selections
   */
  constructor(selections = []) {
    if (selections.length === 0) {
      this._selections = [new Selection(0, 0)];
    } else {
      this._selections = selections.map((s) =>
        s instanceof Selection ? s.clone() : Selection.fromObject(s)
      );
      this._normalize();
    }
  }

  // ----------------------------------------
  // Getters
  // ----------------------------------------

  /**
   * Primary selection (for scroll-to-cursor, backward compatibility)
   * @returns {Selection}
   */
  get primary() {
    return this._selections[this._primaryIndex];
  }

  /**
   * All selections (read-only copy)
   * @returns {Selection[]}
   */
  get all() {
    return [...this._selections];
  }

  /**
   * Number of selections
   * @returns {number}
   */
  get count() {
    return this._selections.length;
  }

  /**
   * Whether there are multiple cursors/selections
   * @returns {boolean}
   */
  get isMultiple() {
    return this._selections.length > 1;
  }

  /**
   * Primary index
   * @returns {number}
   */
  get primaryIndex() {
    return this._primaryIndex;
  }

  // ----------------------------------------
  // Public Methods - Modification
  // ----------------------------------------

  /**
   * Add a new selection (will be normalized)
   * @param {Selection|{start: number, end: number}} selection - Selection to add
   * @returns {SelectionCollection} this (for chaining)
   */
  add(selection) {
    const sel =
      selection instanceof Selection
        ? selection.clone()
        : Selection.fromObject(selection);

    this._selections.push(sel);
    this._primaryIndex = this._selections.length - 1;
    this._normalize();
    return this;
  }

  /**
   * Set all selections at once
   * @param {Array<Selection|{start: number, end: number}>} selections - New selections
   * @returns {SelectionCollection} this (for chaining)
   */
  setAll(selections) {
    if (selections.length === 0) {
      this._selections = [new Selection(0, 0)];
      this._primaryIndex = 0;
      return this;
    }

    this._selections = selections.map((s) =>
      s instanceof Selection ? s.clone() : Selection.fromObject(s)
    );
    this._primaryIndex = Math.min(this._primaryIndex, this._selections.length - 1);
    this._normalize();
    return this;
  }

  /**
   * Set single selection (replaces all)
   * @param {number} start - Start offset
   * @param {number} end - End offset
   * @param {boolean} isReversed - Whether selection is reversed
   * @returns {SelectionCollection} this (for chaining)
   */
  setSingle(start, end, isReversed = false) {
    this._selections = [new Selection(start, end, isReversed)];
    this._primaryIndex = 0;
    return this;
  }

  /**
   * Remove a selection by index
   * @param {number} index - Index to remove
   * @returns {SelectionCollection} this (for chaining)
   */
  remove(index) {
    if (this._selections.length <= 1) return this; // Keep at least one

    this._selections.splice(index, 1);
    if (this._primaryIndex >= this._selections.length) {
      this._primaryIndex = this._selections.length - 1;
    }
    return this;
  }

  /**
   * Collapse to primary selection only
   * @returns {SelectionCollection} this (for chaining)
   */
  collapseToSingle() {
    this._selections = [this._selections[this._primaryIndex].clone()];
    this._primaryIndex = 0;
    return this;
  }

  /**
   * Set the primary selection index
   * @param {number} index - New primary index
   * @returns {SelectionCollection} this (for chaining)
   */
  setPrimaryIndex(index) {
    if (index >= 0 && index < this._selections.length) {
      this._primaryIndex = index;
    }
    return this;
  }

  // ----------------------------------------
  // Public Methods - Document Change Handling
  // ----------------------------------------

  /**
   * Update all selections after a document change
   * @param {number} changeStart - Start offset of change
   * @param {number} deletedLength - Length of deleted text
   * @param {number} insertedLength - Length of inserted text
   * @returns {SelectionCollection} this (for chaining)
   */
  adjustForDocumentChange(changeStart, deletedLength, insertedLength) {
    const delta = insertedLength - deletedLength;
    const changeEnd = changeStart + deletedLength;

    for (let i = 0; i < this._selections.length; i++) {
      const sel = this._selections[i];
      let newStart = sel._startOffset;
      let newEnd = sel._endOffset;

      // Adjust start offset
      if (newStart >= changeEnd) {
        newStart += delta;
      } else if (newStart > changeStart) {
        newStart = changeStart + insertedLength;
      }

      // Adjust end offset
      if (newEnd >= changeEnd) {
        newEnd += delta;
      } else if (newEnd > changeStart) {
        newEnd = changeStart + insertedLength;
      }

      this._selections[i] = sel.withOffsets(
        Math.max(0, newStart),
        Math.max(0, newEnd)
      );
    }

    this._normalize();
    return this;
  }

  // ----------------------------------------
  // Public Methods - Utility
  // ----------------------------------------

  /**
   * Clone this collection
   * @returns {SelectionCollection}
   */
  clone() {
    const clone = new SelectionCollection([]);
    clone._selections = this._selections.map((s) => s.clone());
    clone._primaryIndex = this._primaryIndex;
    return clone;
  }

  /**
   * Check if a selection at given offset already exists
   * @param {number} offset - Offset to check
   * @returns {boolean}
   */
  hasCursorAt(offset) {
    return this._selections.some((s) => s.isEmpty && s.start === offset);
  }

  /**
   * Check if a selection range already exists
   * @param {number} start - Start offset
   * @param {number} end - End offset
   * @returns {boolean}
   */
  hasSelectionAt(start, end) {
    const normStart = Math.min(start, end);
    const normEnd = Math.max(start, end);
    return this._selections.some(
      (s) => s.start === normStart && s.end === normEnd
    );
  }

  /**
   * Get selections sorted by offset (for reverse iteration)
   * @param {boolean} descending - Sort in descending order
   * @returns {Selection[]}
   */
  sorted(descending = false) {
    const sorted = [...this._selections].sort((a, b) => a.start - b.start);
    return descending ? sorted.reverse() : sorted;
  }

  /**
   * Iterator support
   */
  [Symbol.iterator]() {
    return this._selections[Symbol.iterator]();
  }

  // ----------------------------------------
  // Private Methods
  // ----------------------------------------

  /**
   * Sort by offset and merge overlapping selections
   * @private
   */
  _normalize() {
    if (this._selections.length <= 1) return;

    // Remember primary selection for tracking
    const primarySel = this._selections[this._primaryIndex];
    const primaryStart = primarySel.start;
    const primaryEnd = primarySel.end;

    // Sort by start offset
    this._selections.sort((a, b) => a.start - b.start);

    // Merge overlapping/adjacent selections
    const merged = [this._selections[0]];
    for (let i = 1; i < this._selections.length; i++) {
      const current = this._selections[i];
      const last = merged[merged.length - 1];

      if (last.overlapsWith(current) || last.isAdjacentTo(current)) {
        merged[merged.length - 1] = last.mergeWith(current);
      } else {
        merged.push(current);
      }
    }

    this._selections = merged;

    // Update primary index to point to the selection containing original primary
    this._primaryIndex = 0;
    for (let i = 0; i < this._selections.length; i++) {
      const sel = this._selections[i];
      if (sel.start <= primaryStart && sel.end >= primaryEnd) {
        this._primaryIndex = i;
        break;
      }
      // If original primary was merged, find closest match
      if (sel.start <= primaryStart && sel.end >= primaryStart) {
        this._primaryIndex = i;
        break;
      }
    }

    // Ensure primary index is valid
    this._primaryIndex = Math.min(
      this._primaryIndex,
      this._selections.length - 1
    );
  }
}
