/**
 * @fileoverview EditContext API implementation for text input handling
 * @module input/EditContextHandler
 *
 * EditContext API provides direct integration with OS text input services
 * without relying on contenteditable or hidden textarea elements.
 *
 * Browser Support: Chrome 121+, Edge 121+
 */

// ============================================
// Constants
// ============================================

const COMPOSITION_STYLE = {
  NONE: 'none',
  SOLID_UNDERLINE: 'solid-underline',
  DOTTED_UNDERLINE: 'dotted-underline',
  DOUBLE_UNDERLINE: 'double-underline',
  SQUIGGLE_UNDERLINE: 'squiggle-underline',
};

// ============================================
// Class Definition
// ============================================

/**
 * Handles text input using the EditContext API.
 * Provides clean separation between input handling and view rendering.
 */
export class EditContextHandler {
  // ----------------------------------------
  // Instance Properties
  // ----------------------------------------
  _editContext = null;
  _element = null;
  _editor = null;
  _isComposing = false;
  _compositionRanges = [];
  _disposed = false;

  // ----------------------------------------
  // Constructor
  // ----------------------------------------

  /**
   * @param {HTMLElement} element - Element to attach EditContext to
   * @param {Object} editor - Editor instance with document and view
   */
  constructor(element, editor) {
    this._element = element;
    this._editor = editor;

    this._initialize();
  }

  // ----------------------------------------
  // Initialization
  // ----------------------------------------

  _initialize() {
    // Create EditContext instance
    this._editContext = new EditContext({
      text: this._editor.document.getText(),
      selectionStart: 0,
      selectionEnd: 0,
    });

    // Attach to DOM element
    this._element.editContext = this._editContext;

    // Make element focusable
    this._element.tabIndex = 0;

    // Bind events
    this._bindEditContextEvents();
    this._bindElementEvents();
    this._bindDocumentEvents();
  }

  // ----------------------------------------
  // Event Binding
  // ----------------------------------------

  _bindEditContextEvents() {
    const ec = this._editContext;

    // Text update - fired when user inputs text
    ec.addEventListener('textupdate', (e) => this._handleTextUpdate(e));

    // Text format update - fired during IME composition for styling
    ec.addEventListener('textformatupdate', (e) => this._handleTextFormatUpdate(e));

    // Character bounds update - OS needs character positions for IME window
    ec.addEventListener('characterboundsupdate', (e) => this._handleCharacterBoundsUpdate(e));

    // Composition events
    ec.addEventListener('compositionstart', (e) => this._handleCompositionStart(e));
    ec.addEventListener('compositionend', (e) => this._handleCompositionEnd(e));
  }

  _bindElementEvents() {
    // Focus management
    this._element.addEventListener('focus', () => this._handleFocus());
    this._element.addEventListener('blur', () => this._handleBlur());

    // Keyboard events (for non-text keys like arrows, shortcuts)
    this._element.addEventListener('keydown', (e) => this._handleKeyDown(e));

    // Mouse events for selection
    this._element.addEventListener('mousedown', (e) => this._handleMouseDown(e));
  }

  _bindDocumentEvents() {
    // Sync EditContext when document changes externally
    this._editor.document.on('change', (change) => {
      if (!this._isComposing) {
        this._syncEditContextText();
      }
    });
  }

  // ----------------------------------------
  // EditContext Event Handlers
  // ----------------------------------------

  /**
   * Handle text input from EditContext
   * This is the main event for receiving user input
   */
  _handleTextUpdate(event) {
    const { updateRangeStart, updateRangeEnd, text, selectionStart, selectionEnd } = event;

    console.log('[EditContext] textupdate:', {
      range: `${updateRangeStart}-${updateRangeEnd}`,
      text: text,
      selection: `${selectionStart}-${selectionEnd}`,
    });

    // Apply text change to document model
    this._editor.document.replaceRange(updateRangeStart, updateRangeEnd, text);

    // Update selection
    this._editor.setSelection(selectionStart, selectionEnd);

    // Emit event for view update
    this._editor.emit('input', {
      type: 'textupdate',
      text,
      range: { start: updateRangeStart, end: updateRangeEnd },
    });
  }

  /**
   * Handle IME composition styling
   * OS sends formatting hints during composition
   */
  _handleTextFormatUpdate(event) {
    const formats = event.getTextFormats();

    console.log('[EditContext] textformatupdate:', formats);

    this._compositionRanges = formats.map((format) => ({
      start: format.rangeStart,
      end: format.rangeEnd,
      underlineStyle: this._mapUnderlineStyle(format.underlineStyle),
      underlineThickness: format.underlineThickness,
    }));

    // Emit for view to render composition decorations
    this._editor.emit('compositionFormat', this._compositionRanges);
  }

  /**
   * Handle character bounds request from OS
   * Required for proper IME window positioning
   */
  _handleCharacterBoundsUpdate(event) {
    const { rangeStart, rangeEnd } = event;

    console.log('[EditContext] characterboundsupdate:', { rangeStart, rangeEnd });

    // Calculate character bounds from view
    const bounds = this._calculateCharacterBounds(rangeStart, rangeEnd);

    // Report bounds back to EditContext
    this._editContext.updateCharacterBounds(rangeStart, bounds);
  }

  /**
   * Handle composition start (IME begins)
   */
  _handleCompositionStart(event) {
    console.log('[EditContext] compositionstart');

    this._isComposing = true;
    this._editor.emit('compositionStart');
  }

  /**
   * Handle composition end (IME finishes)
   */
  _handleCompositionEnd(event) {
    console.log('[EditContext] compositionend');

    this._isComposing = false;
    this._compositionRanges = [];
    this._editor.emit('compositionEnd');
  }

  // ----------------------------------------
  // Element Event Handlers
  // ----------------------------------------

  _handleFocus() {
    console.log('[EditContext] focus');
    this._editor.emit('focus');
  }

  _handleBlur() {
    console.log('[EditContext] blur');
    this._editor.emit('blur');
  }

  /**
   * Handle keyboard events for non-text input
   * EditContext handles text input, but we need to handle:
   * - Arrow keys (cursor movement)
   * - Backspace/Delete
   * - Enter (newline)
   * - Shortcuts (Ctrl+C, Ctrl+V, etc.)
   */
  _handleKeyDown(event) {
    const { key, ctrlKey, metaKey, shiftKey } = event;
    const modKey = ctrlKey || metaKey;

    console.log('[EditContext] keydown:', key);

    // Let EditContext handle regular text input
    // We only intercept special keys

    switch (key) {
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown':
        this._handleArrowKey(key, shiftKey, modKey);
        event.preventDefault();
        break;

      case 'Home':
      case 'End':
        this._handleHomeEnd(key, shiftKey, modKey);
        event.preventDefault();
        break;

      case 'Backspace':
        this._handleBackspace(modKey);
        event.preventDefault();
        break;

      case 'Delete':
        this._handleDelete(modKey);
        event.preventDefault();
        break;

      case 'Enter':
        this._handleEnter();
        event.preventDefault();
        break;

      case 'Tab':
        this._handleTab(shiftKey);
        event.preventDefault();
        break;

      // Shortcuts
      case 'a':
        if (modKey) {
          this._handleSelectAll();
          event.preventDefault();
        }
        break;

      case 'z':
        if (modKey) {
          if (shiftKey) {
            this._editor.redo();
          } else {
            this._editor.undo();
          }
          event.preventDefault();
        }
        break;

      case 'y':
        if (modKey) {
          this._editor.redo();
          event.preventDefault();
        }
        break;

      case 'c':
        if (modKey) {
          this._handleCopy();
          // Don't prevent default - let browser handle clipboard
        }
        break;

      case 'x':
        if (modKey) {
          this._handleCut();
          event.preventDefault();
        }
        break;

      case 'v':
        if (modKey) {
          this._handlePaste();
          // Don't prevent default - let browser handle clipboard
        }
        break;
    }
  }

  _handleMouseDown(event) {
    // Calculate position from click coordinates
    const position = this._editor.view.getPositionFromPoint(event.clientX, event.clientY);

    if (position !== null) {
      const offset = this._editor.document.positionToOffset(position.line, position.column);

      this._editor.setSelection(offset, offset);
      this._syncEditContextSelection();
    }
  }

  // ----------------------------------------
  // Key Handlers
  // ----------------------------------------

  _handleArrowKey(key, shiftKey, modKey) {
    const doc = this._editor.document;
    let { start, end } = this._editor.getSelection();

    // If no shift, collapse selection to anchor
    if (!shiftKey && start !== end) {
      if (key === 'ArrowLeft' || key === 'ArrowUp') {
        end = start;
      } else {
        start = end;
      }
    }

    let newOffset = end;
    const pos = doc.offsetToPosition(end);

    switch (key) {
      case 'ArrowLeft':
        if (modKey) {
          // Move to word boundary (simplified)
          newOffset = this._findWordBoundary(end, -1);
        } else {
          newOffset = Math.max(0, end - 1);
        }
        break;

      case 'ArrowRight':
        if (modKey) {
          newOffset = this._findWordBoundary(end, 1);
        } else {
          newOffset = Math.min(doc.getLength(), end + 1);
        }
        break;

      case 'ArrowUp':
        if (pos.line > 0) {
          const targetLine = pos.line - 1;
          const targetCol = Math.min(pos.column, doc.getLine(targetLine).length);
          newOffset = doc.positionToOffset(targetLine, targetCol);
        }
        break;

      case 'ArrowDown':
        if (pos.line < doc.getLineCount() - 1) {
          const targetLine = pos.line + 1;
          const targetCol = Math.min(pos.column, doc.getLine(targetLine).length);
          newOffset = doc.positionToOffset(targetLine, targetCol);
        }
        break;
    }

    if (shiftKey) {
      this._editor.setSelection(start, newOffset);
    } else {
      this._editor.setSelection(newOffset, newOffset);
    }

    this._syncEditContextSelection();
  }

  _handleHomeEnd(key, shiftKey, modKey) {
    const doc = this._editor.document;
    const { start, end } = this._editor.getSelection();
    const pos = doc.offsetToPosition(end);

    let newOffset;

    if (key === 'Home') {
      if (modKey) {
        newOffset = 0; // Document start
      } else {
        newOffset = doc.positionToOffset(pos.line, 0); // Line start
      }
    } else {
      if (modKey) {
        newOffset = doc.getLength(); // Document end
      } else {
        newOffset = doc.positionToOffset(pos.line, doc.getLine(pos.line).length);
      }
    }

    if (shiftKey) {
      this._editor.setSelection(start, newOffset);
    } else {
      this._editor.setSelection(newOffset, newOffset);
    }

    this._syncEditContextSelection();
  }

  _handleBackspace(modKey) {
    const doc = this._editor.document;
    let { start, end } = this._editor.getSelection();

    if (start === end) {
      // No selection - delete character before cursor
      if (start > 0) {
        if (modKey) {
          // Delete word
          const wordStart = this._findWordBoundary(start, -1);
          start = wordStart;
        } else {
          start = start - 1;
        }
      }
    }

    if (start !== end) {
      doc.delete(start, end);
      this._editor.setSelection(start, start);
      this._syncEditContextText();
      this._syncEditContextSelection();
    }
  }

  _handleDelete(modKey) {
    const doc = this._editor.document;
    let { start, end } = this._editor.getSelection();

    if (start === end) {
      // No selection - delete character after cursor
      if (end < doc.getLength()) {
        if (modKey) {
          // Delete word
          const wordEnd = this._findWordBoundary(end, 1);
          end = wordEnd;
        } else {
          end = end + 1;
        }
      }
    }

    if (start !== end) {
      doc.delete(start, end);
      this._editor.setSelection(start, start);
      this._syncEditContextText();
      this._syncEditContextSelection();
    }
  }

  _handleEnter() {
    const { start, end } = this._editor.getSelection();

    this._editor.document.replaceRange(start, end, '\n');
    this._editor.setSelection(start + 1, start + 1);
    this._syncEditContextText();
    this._syncEditContextSelection();
  }

  _handleTab(shiftKey) {
    const { start, end } = this._editor.getSelection();
    const tabText = '  '; // 2 spaces

    this._editor.document.replaceRange(start, end, tabText);
    this._editor.setSelection(start + tabText.length, start + tabText.length);
    this._syncEditContextText();
    this._syncEditContextSelection();
  }

  _handleSelectAll() {
    const length = this._editor.document.getLength();
    this._editor.setSelection(0, length);
    this._syncEditContextSelection();
  }

  _handleCopy() {
    const { start, end } = this._editor.getSelection();
    if (start !== end) {
      const text = this._editor.document.getTextRange(start, end);
      navigator.clipboard.writeText(text);
    }
  }

  _handleCut() {
    const { start, end } = this._editor.getSelection();
    if (start !== end) {
      const text = this._editor.document.getTextRange(start, end);
      navigator.clipboard.writeText(text);
      this._editor.document.delete(start, end);
      this._editor.setSelection(start, start);
      this._syncEditContextText();
      this._syncEditContextSelection();
    }
  }

  async _handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      const { start, end } = this._editor.getSelection();

      this._editor.document.replaceRange(start, end, text);
      this._editor.setSelection(start + text.length, start + text.length);
      this._syncEditContextText();
      this._syncEditContextSelection();
    } catch (err) {
      console.error('Paste failed:', err);
    }
  }

  // ----------------------------------------
  // Helper Methods
  // ----------------------------------------

  /**
   * Find word boundary in given direction
   * @param {number} offset - Starting offset
   * @param {number} direction - -1 for left, 1 for right
   * @returns {number}
   */
  _findWordBoundary(offset, direction) {
    const text = this._editor.document.getText();
    const wordRegex = /\w/;
    let pos = offset;

    if (direction < 0) {
      // Move left
      pos--;
      // Skip whitespace
      while (pos > 0 && !wordRegex.test(text[pos])) pos--;
      // Skip word characters
      while (pos > 0 && wordRegex.test(text[pos - 1])) pos--;
    } else {
      // Move right
      // Skip word characters
      while (pos < text.length && wordRegex.test(text[pos])) pos++;
      // Skip whitespace
      while (pos < text.length && !wordRegex.test(text[pos])) pos++;
    }

    return Math.max(0, Math.min(text.length, pos));
  }

  /**
   * Calculate character bounding rectangles for IME positioning
   */
  _calculateCharacterBounds(rangeStart, rangeEnd) {
    const bounds = [];

    for (let i = rangeStart; i < rangeEnd; i++) {
      const rect = this._editor.view.getCharacterRect(i);
      if (rect) {
        bounds.push(new DOMRect(rect.x, rect.y, rect.width, rect.height));
      }
    }

    return bounds;
  }

  /**
   * Map EditContext underline style to our format
   */
  _mapUnderlineStyle(style) {
    switch (style) {
      case 'solid':
        return COMPOSITION_STYLE.SOLID_UNDERLINE;
      case 'dotted':
        return COMPOSITION_STYLE.DOTTED_UNDERLINE;
      case 'double':
        return COMPOSITION_STYLE.DOUBLE_UNDERLINE;
      case 'squiggle':
        return COMPOSITION_STYLE.SQUIGGLE_UNDERLINE;
      default:
        return COMPOSITION_STYLE.NONE;
    }
  }

  // ----------------------------------------
  // Synchronization with EditContext
  // ----------------------------------------

  /**
   * Sync document text to EditContext
   * Call after programmatic document changes
   */
  _syncEditContextText() {
    const text = this._editor.document.getText();
    this._editContext.updateText(0, this._editContext.text.length, text);
  }

  /**
   * Sync selection to EditContext
   * Call after programmatic selection changes
   */
  _syncEditContextSelection() {
    const { start, end } = this._editor.getSelection();
    this._editContext.updateSelection(start, end);

    // Also update control bounds for proper IME positioning
    this._updateControlBounds();
  }

  /**
   * Update control bounds (editor position) for EditContext
   */
  _updateControlBounds() {
    const rect = this._element.getBoundingClientRect();
    this._editContext.updateControlBounds(rect);

    // Update selection bounds
    const selectionRect = this._editor.view.getSelectionRect();
    if (selectionRect) {
      this._editContext.updateSelectionBounds(selectionRect);
    }
  }

  // ----------------------------------------
  // Public Methods
  // ----------------------------------------

  /**
   * Focus the editor
   */
  focus() {
    this._element.focus();
  }

  /**
   * Check if editor is focused
   */
  isFocused() {
    return document.activeElement === this._element;
  }

  /**
   * Check if currently composing (IME active)
   */
  isComposing() {
    return this._isComposing;
  }

  /**
   * Get composition decoration ranges
   */
  getCompositionRanges() {
    return this._compositionRanges;
  }

  /**
   * Update selection from external source
   */
  updateSelection(start, end) {
    this._editContext.updateSelection(start, end);
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this._disposed) return;

    this._element.editContext = null;
    this._editContext = null;
    this._disposed = true;
  }
}

// ============================================
// Feature Detection
// ============================================

/**
 * Check if EditContext API is supported
 * @returns {boolean}
 */
export function isEditContextSupported() {
  return 'EditContext' in window;
}
