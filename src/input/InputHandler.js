/**
 * @fileoverview Unified input handler with automatic fallback
 * @module input/InputHandler
 *
 * Automatically selects between EditContext (modern) and Textarea (fallback)
 * based on browser support.
 */

import { EditContextHandler, isEditContextSupported } from './EditContextHandler.js';
import { TextareaHandler } from './TextareaHandler.js';

// ============================================
// Constants
// ============================================

export const InputMode = Object.freeze({
  EDIT_CONTEXT: 'editcontext',
  TEXTAREA: 'textarea',
});

// ============================================
// Class Definition
// ============================================

/**
 * Unified input handler that provides a consistent API
 * regardless of the underlying input method.
 */
export class InputHandler {
  // ----------------------------------------
  // Instance Properties
  // ----------------------------------------
  _handler = null;
  _mode = null;
  _element = null;
  _editor = null;

  // ----------------------------------------
  // Constructor
  // ----------------------------------------

  /**
   * @param {HTMLElement} element - Element to attach input handling to
   * @param {Object} editor - Editor instance
   * @param {Object} options - Configuration options
   * @param {string} options.preferredMode - Force a specific mode ('editcontext' | 'textarea')
   */
  constructor(element, editor, options = {}) {
    this._element = element;
    this._editor = editor;

    this._initialize(options);
  }

  // ----------------------------------------
  // Initialization
  // ----------------------------------------

  _initialize(options) {
    const { preferredMode } = options;

    // Determine which input mode to use
    if (preferredMode === InputMode.TEXTAREA) {
      this._mode = InputMode.TEXTAREA;
    } else if (preferredMode === InputMode.EDIT_CONTEXT && isEditContextSupported()) {
      this._mode = InputMode.EDIT_CONTEXT;
    } else if (isEditContextSupported()) {
      this._mode = InputMode.EDIT_CONTEXT;
    } else {
      this._mode = InputMode.TEXTAREA;
    }

    console.log(`[InputHandler] Using ${this._mode} mode`);

    // Create appropriate handler
    if (this._mode === InputMode.EDIT_CONTEXT) {
      this._handler = new EditContextHandler(this._element, this._editor);
    } else {
      this._handler = new TextareaHandler(this._element, this._editor);
    }
  }

  // ----------------------------------------
  // Public API (delegates to underlying handler)
  // ----------------------------------------

  /**
   * Get current input mode
   * @returns {string}
   */
  getMode() {
    return this._mode;
  }

  /**
   * Check if using EditContext
   * @returns {boolean}
   */
  isUsingEditContext() {
    return this._mode === InputMode.EDIT_CONTEXT;
  }

  /**
   * Focus the input
   */
  focus() {
    this._handler.focus();
  }

  /**
   * Check if input is focused
   * @returns {boolean}
   */
  isFocused() {
    return this._handler.isFocused();
  }

  /**
   * Check if IME composition is in progress
   * @returns {boolean}
   */
  isComposing() {
    return this._handler.isComposing();
  }

  /**
   * Get composition decoration ranges
   * @returns {Array}
   */
  getCompositionRanges() {
    return this._handler.getCompositionRanges();
  }

  /**
   * Update cursor position for textarea mode
   */
  updateCursorPosition(rect) {
    if (this._mode === InputMode.TEXTAREA) {
      this._handler.updatePosition(rect);
    }
  }

  /**
   * Clean up resources
   */
  dispose() {
    this._handler?.dispose();
    this._handler = null;
  }
}

// ============================================
// Exports
// ============================================

export { isEditContextSupported };
