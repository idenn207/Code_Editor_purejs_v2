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

    // Capture native browser selection changes (for mouse drag selection)
    document.addEventListener('selectionchange', () => this._handleSelectionChange());
  }

  _bindDocumentEvents() {
    // Sync EditContext when document changes externally
    this._editor.document.on('change', (change) => {
      if (!this._isComposing) {
        this._syncEditContextText();
      }
    });

    // Sync EditContext selection when editor selection changes programmatically
    // This handles cases where features (like AutoCloseFeature) call editor.setSelection()
    // directly without going through EditContextHandler
    this._editor.on('selectionChange', () => {
      if (!this._isComposing) {
        this._syncEditContextSelection();
      }
    });
  }

  // ----------------------------------------
  // EditContext Event Handlers
  // ----------------------------------------

  _handleTextUpdate(event) {
    const { updateRangeStart, updateRangeEnd, text, selectionStart, selectionEnd } = event;

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

  _handleTextFormatUpdate(event) {
    const formats = event.getTextFormats();

    this._compositionRanges = formats.map((format) => ({
      start: format.rangeStart,
      end: format.rangeEnd,
      underlineStyle: this._mapUnderlineStyle(format.underlineStyle),
      underlineThickness: format.underlineThickness,
    }));

    this._editor.emit('compositionFormat', this._compositionRanges);
  }

  _handleCharacterBoundsUpdate(event) {
    const { rangeStart, rangeEnd } = event;
    const bounds = this._calculateCharacterBounds(rangeStart, rangeEnd);
    this._editContext.updateCharacterBounds(rangeStart, bounds);
  }

  _handleCompositionStart(event) {
    this._isComposing = true;
    this._editor.emit('compositionStart');
  }

  _handleCompositionEnd(event) {
    this._isComposing = false;
    this._compositionRanges = [];
    this._editor.emit('compositionEnd');
  }

  // ----------------------------------------
  // Element Event Handlers
  // ----------------------------------------

  _handleFocus() {
    this._editor.emit('focus');
  }

  _handleBlur() {
    this._editor.emit('blur');
  }

  _handleKeyDown(event) {
    const { key, ctrlKey, metaKey, shiftKey } = event;
    const modKey = ctrlKey || metaKey;

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
        }
        break;
    }
  }

  _handleMouseDown(event) {
    const position = this._editor.view.getPositionFromPoint(event.clientX, event.clientY);

    if (position !== null) {
      const offset = this._editor.document.positionToOffset(position.line, position.column);
      this._editor.setSelection(offset, offset);
      this._syncEditContextSelection();
    }
  }

  _handleSelectionChange() {
    const selection = window.getSelection();

    // Only process if selection is within our editor
    if (!selection || !selection.rangeCount || !this._element.contains(selection.anchorNode)) {
      return;
    }

    // Ignore if we're composing (IME input)
    if (this._isComposing) {
      return;
    }

    try {
      const range = selection.getRangeAt(0);

      // Convert DOM selection to editor offsets
      const start = this._getOffsetFromNode(range.startContainer, range.startOffset);
      const end = this._getOffsetFromNode(range.endContainer, range.endOffset);

      // Only update if we successfully converted both positions
      if (start !== null && end !== null) {
        const currentSelection = this._editor.getSelection();

        // Only update if the selection has actually changed
        if (currentSelection.start !== start || currentSelection.end !== end) {
          this._editor.setSelection(start, end);
          this._syncEditContextSelection();
        }
      }
    } catch (error) {
      // Silently ignore errors during selection conversion
      // This can happen during rapid DOM updates
    }
  }

  // ----------------------------------------
  // Key Handlers
  // ----------------------------------------

  _handleArrowKey(key, shiftKey, modKey) {
    const doc = this._editor.document;
    // Use raw selection to preserve anchor/cursor direction for selection extension
    let { start, end } = this._editor.getRawSelection();

    // For collapse logic (no shift), we need normalized min/max values
    const selMin = Math.min(start, end);
    const selMax = Math.max(start, end);

    if (!shiftKey && start !== end) {
      // Collapse selection: Left/Up goes to left edge, Right/Down goes to right edge
      if (key === 'ArrowLeft' || key === 'ArrowUp') {
        start = end = selMin;
      } else {
        start = end = selMax;
      }
    }

    let newOffset = end;
    const pos = doc.offsetToPosition(end);

    switch (key) {
      case 'ArrowLeft':
        if (modKey) {
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
        newOffset = 0;
      } else {
        newOffset = doc.positionToOffset(pos.line, 0);
      }
    } else {
      if (modKey) {
        newOffset = doc.getLength();
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
      if (start > 0) {
        if (modKey) {
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
      if (end < doc.getLength()) {
        if (modKey) {
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
    const tabText = '  ';

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

  _findWordBoundary(offset, direction) {
    const text = this._editor.document.getText();
    const wordRegex = /\w/;
    let pos = offset;

    if (direction < 0) {
      pos--;
      while (pos > 0 && !wordRegex.test(text[pos])) pos--;
      while (pos > 0 && wordRegex.test(text[pos - 1])) pos--;
    } else {
      while (pos < text.length && wordRegex.test(text[pos])) pos++;
      while (pos < text.length && !wordRegex.test(text[pos])) pos++;
    }

    return Math.max(0, Math.min(text.length, pos));
  }

  /**
   * Convert DOM node and offset to editor offset
   * @param {Node} node - DOM node from selection
   * @param {number} nodeOffset - Offset within the node
   * @returns {number | null} Editor offset, or null if conversion failed
   */
  _getOffsetFromNode(node, nodeOffset) {
    // Walk up the DOM tree to find the line element
    let lineElement = node;
    while (lineElement && lineElement !== this._element) {
      if (lineElement.dataset?.lineIndex !== undefined) {
        break;
      }
      lineElement = lineElement.parentElement;
    }

    // If we couldn't find a line element, return null
    if (!lineElement || lineElement.dataset?.lineIndex === undefined) {
      return null;
    }

    const lineIndex = parseInt(lineElement.dataset.lineIndex);

    // Calculate column offset within the line
    let columnOffset = 0;

    // Create a tree walker to traverse all text nodes in the line
    const walker = document.createTreeWalker(
      lineElement,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentNode;
    while ((currentNode = walker.nextNode())) {
      if (currentNode === node) {
        // Found the target node, add the offset within it
        columnOffset += nodeOffset;
        break;
      } else {
        // Add the full length of this text node
        columnOffset += currentNode.textContent.length;
      }
    }

    // If the node is an element (not text), we need to handle it differently
    if (node.nodeType === Node.ELEMENT_NODE && node.dataset?.lineIndex !== undefined) {
      // Selection is at element level, use nodeOffset to count children
      const walker = document.createTreeWalker(
        node,
        NodeFilter.SHOW_TEXT,
        null
      );

      columnOffset = 0;
      let childCount = 0;
      while (walker.nextNode() && childCount < nodeOffset) {
        columnOffset += walker.currentNode.textContent.length;
        childCount++;
      }
    }

    // Convert line/column to editor offset
    return this._editor.document.positionToOffset(lineIndex, columnOffset);
  }

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

  _syncEditContextText() {
    const text = this._editor.document.getText();
    this._editContext.updateText(0, this._editContext.text.length, text);
  }

  _syncEditContextSelection() {
    const { start, end } = this._editor.getSelection();
    this._editContext.updateSelection(start, end);
    this._updateControlBounds();
  }

  _updateControlBounds() {
    const rect = this._element.getBoundingClientRect();
    this._editContext.updateControlBounds(rect);

    const selectionRect = this._editor.view.getSelectionRect();
    if (selectionRect) {
      this._editContext.updateSelectionBounds(selectionRect);
    }
  }

  // ----------------------------------------
  // Public Methods
  // ----------------------------------------

  focus() {
    this._element.focus();
  }

  isFocused() {
    return document.activeElement === this._element;
  }

  isComposing() {
    return this._isComposing;
  }

  getCompositionRanges() {
    return this._compositionRanges;
  }

  updateSelection(start, end) {
    this._editContext.updateSelection(start, end);
  }

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

export function isEditContextSupported() {
  return 'EditContext' in window;
}
