/**
 * @fileoverview EditContext API implementation for text input handling
 * @module input/EditContextHandler
 *
 * EditContext API provides direct integration with OS text input services
 * without relying on contenteditable or hidden textarea elements.
 *
 * Browser Support: Chrome 121+, Edge 121+
 */

import { Selection } from '../model/Selection.js';

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
    const { text } = event;

    // Use insertText for multi-cursor support
    // insertText handles all cursors and updates selections properly
    this._editor.insertText(text);

    // Sync EditContext with new state
    this._syncEditContextText();
    this._syncEditContextSelection();

    // Emit event for view update
    this._editor.emit('input', {
      type: 'textupdate',
      text,
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
    // Map key to direction
    const directionMap = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'up',
      ArrowDown: 'down',
    };

    const direction = directionMap[key];
    if (!direction) return;

    // Use Editor's multi-cursor aware method
    this._editor.moveAllCursors(direction, shiftKey, modKey);

    this._syncEditContextSelection();
  }

  _handleHomeEnd(key, shiftKey, modKey) {
    const edge = key === 'Home' ? 'start' : 'end';

    // Use Editor's multi-cursor aware method
    this._editor.moveAllCursorsToLineEdge(edge, shiftKey, modKey);

    this._syncEditContextSelection();
  }

  _handleBackspace(modKey) {
    // Check for multi-cursor - let Editor handle it
    if (this._editor.hasMultipleCursors()) {
      if (this._editor.deleteAtAllCursors(false, modKey)) {
        this._syncEditContextText();
        this._syncEditContextSelection();
        return;
      }
    }

    // Single cursor handling
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
    // Check for multi-cursor - let Editor handle it
    if (this._editor.hasMultipleCursors()) {
      if (this._editor.deleteAtAllCursors(true, modKey)) {
        this._syncEditContextText();
        this._syncEditContextSelection();
        return;
      }
    }

    // Single cursor handling
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
    // Use insertText for multi-cursor support
    this._editor.insertText('\n');
    this._syncEditContextText();
    this._syncEditContextSelection();
  }

  _handleTab(shiftKey) {
    const tabText = '  ';
    // Use insertText for multi-cursor support
    this._editor.insertText(tabText);
    this._syncEditContextText();
    this._syncEditContextSelection();
  }

  _handleSelectAll() {
    const length = this._editor.document.getLength();
    this._editor.setSelection(0, length);
    this._syncEditContextSelection();
  }

  _handleCopy() {
    // Handle multi-cursor copy
    if (this._editor.hasMultipleCursors()) {
      const texts = this._editor.getAllSelectedTexts();
      const hasSelection = texts.some((t) => t.length > 0);

      if (hasSelection) {
        // Join all selected texts with newlines
        const combinedText = texts.filter((t) => t.length > 0).join('\n');
        navigator.clipboard.writeText(combinedText);
      }
      return;
    }

    // Single cursor copy
    const { start, end } = this._editor.getSelection();
    if (start !== end) {
      const text = this._editor.document.getTextRange(start, end);
      navigator.clipboard.writeText(text);
    }
  }

  _handleCut() {
    // Handle multi-cursor cut
    if (this._editor.hasMultipleCursors()) {
      const texts = this._editor.getAllSelectedTexts();
      const hasSelection = texts.some((t) => t.length > 0);

      if (hasSelection) {
        // Copy all selected texts
        const combinedText = texts.filter((t) => t.length > 0).join('\n');
        navigator.clipboard.writeText(combinedText);

        // Delete selections by inserting empty string
        this._editor.insertText('');
        this._syncEditContextText();
        this._syncEditContextSelection();
      }
      return;
    }

    // Single cursor cut
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

      // Handle multi-cursor smart paste
      if (this._editor.hasMultipleCursors()) {
        const lines = text.split('\n');
        const selections = this._editor.getSelections();

        // Smart paste: if line count matches cursor count, paste each line at each cursor
        if (lines.length === selections.count) {
          this._smartPasteMultiCursor(lines, selections);
        } else {
          // Normal paste: insert full text at all cursors
          this._editor.insertText(text);
        }

        this._syncEditContextText();
        this._syncEditContextSelection();
        return;
      }

      // Single cursor paste
      const { start, end } = this._editor.getSelection();
      this._editor.document.replaceRange(start, end, text);
      this._editor.setSelection(start + text.length, start + text.length);
      this._syncEditContextText();
      this._syncEditContextSelection();
    } catch (err) {
      console.error('Paste failed:', err);
    }
  }

  /**
   * Smart paste for multi-cursor: paste each line at each cursor
   * @param {string[]} lines - Lines to paste
   * @param {SelectionCollection} selections - Current selections
   */
  _smartPasteMultiCursor(lines, selections) {
    const doc = this._editor.document;

    // Get selections sorted ascending to match with lines in order
    const sortedSels = selections.sorted(false); // ascending

    // Process from end to start to preserve offsets
    const descendingSels = selections.sorted(true);

    // Create a map of selection to its line
    const selToLine = new Map();
    for (let i = 0; i < sortedSels.length; i++) {
      selToLine.set(sortedSels[i], lines[i]);
    }

    // Insert from end to start
    for (const sel of descendingSels) {
      const lineText = selToLine.get(sel);
      doc.replaceRange(sel.start, sel.end, lineText);
    }

    // Calculate new cursor positions
    const newSelections = [];
    let cumulativeOffset = 0;

    for (let i = 0; i < sortedSels.length; i++) {
      const sel = sortedSels[i];
      const lineText = lines[i];
      const deletedLength = sel.end - sel.start;

      const newPos = sel.start + cumulativeOffset + lineText.length;
      newSelections.push(Selection.cursor(newPos));

      cumulativeOffset += lineText.length - deletedLength;
    }

    this._editor.setSelections(newSelections);
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
