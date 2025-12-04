/**
 * @fileoverview Textarea fallback for browsers without EditContext support
 * @module input/TextareaHandler
 *
 * This is the fallback input method for browsers that don't support EditContext.
 * Uses a hidden textarea (Monaco/VSCode approach) to capture input.
 */

// ============================================
// Class Definition
// ============================================

/**
 * Handles text input using a hidden textarea element.
 * Fallback for browsers without EditContext support.
 */
export class TextareaHandler {
  // ----------------------------------------
  // Instance Properties
  // ----------------------------------------
  _textarea = null;
  _element = null;
  _editor = null;
  _isComposing = false;
  _compositionText = '';
  _disposed = false;

  // ----------------------------------------
  // Constructor
  // ----------------------------------------

  /**
   * @param {HTMLElement} element - Container element
   * @param {Object} editor - Editor instance
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
    this._createTextarea();
    this._bindEvents();
  }

  _createTextarea() {
    this._textarea = document.createElement('textarea');
    this._textarea.className = 'editor-hidden-textarea';

    // Accessibility attributes
    this._textarea.setAttribute('autocorrect', 'off');
    this._textarea.setAttribute('autocapitalize', 'off');
    this._textarea.setAttribute('autocomplete', 'off');
    this._textarea.setAttribute('spellcheck', 'false');
    this._textarea.setAttribute('tabindex', '0');
    this._textarea.setAttribute('role', 'textbox');
    this._textarea.setAttribute('aria-multiline', 'true');
    this._textarea.setAttribute('aria-label', 'Code editor');

    // Make nearly invisible but still functional
    Object.assign(this._textarea.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '1px',
      height: '1em',
      padding: '0',
      margin: '0',
      border: 'none',
      outline: 'none',
      resize: 'none',
      overflow: 'hidden',
      whiteSpace: 'pre',
      opacity: '0.01',
      background: 'transparent',
      color: 'transparent',
      fontSize: 'inherit',
      fontFamily: 'inherit',
      lineHeight: 'inherit',
      zIndex: '10',
      caretColor: 'transparent',
    });

    this._element.appendChild(this._textarea);
  }

  // ----------------------------------------
  // Event Binding
  // ----------------------------------------

  _bindEvents() {
    const ta = this._textarea;

    ta.addEventListener('input', (e) => this._handleInput(e));
    ta.addEventListener('compositionstart', (e) => this._handleCompositionStart(e));
    ta.addEventListener('compositionupdate', (e) => this._handleCompositionUpdate(e));
    ta.addEventListener('compositionend', (e) => this._handleCompositionEnd(e));
    ta.addEventListener('keydown', (e) => this._handleKeyDown(e));
    ta.addEventListener('focus', () => this._handleFocus());
    ta.addEventListener('blur', () => this._handleBlur());
    ta.addEventListener('paste', (e) => this._handlePaste(e));
    ta.addEventListener('copy', (e) => this._handleCopy(e));
    ta.addEventListener('cut', (e) => this._handleCut(e));

    this._element.addEventListener('mousedown', (e) => {
      if (e.target !== this._textarea) {
        this._handleMouseDown(e);
      }
    });

    // Capture native browser selection changes (for mouse drag selection)
    document.addEventListener('selectionchange', () => this._handleSelectionChange());
  }

  // ----------------------------------------
  // Input Event Handlers
  // ----------------------------------------

  _handleInput(event) {
    if (this._isComposing) {
      return;
    }

    const text = this._textarea.value;

    if (text) {
      const { start, end } = this._editor.getSelection();

      this._editor.document.replaceRange(start, end, text);
      this._editor.setSelection(start + text.length, start + text.length);

      this._textarea.value = '';

      this._editor.emit('input', {
        type: 'input',
        text,
        range: { start, end },
      });
    }
  }

  _handleCompositionStart(event) {
    this._isComposing = true;
    this._compositionText = '';
    this._editor.emit('compositionStart');
  }

  _handleCompositionUpdate(event) {
    this._compositionText = event.data || '';

    this._editor.emit('compositionUpdate', {
      text: this._compositionText,
    });
  }

  _handleCompositionEnd(event) {
    this._isComposing = false;

    const text = event.data || this._textarea.value;
    const { start, end } = this._editor.getSelection();

    if (text) {
      this._editor.document.replaceRange(start, end, text);
      this._editor.setSelection(start + text.length, start + text.length);
    }

    this._textarea.value = '';
    this._compositionText = '';

    this._editor.emit('compositionEnd');
  }

  // ----------------------------------------
  // Keyboard Event Handlers
  // ----------------------------------------

  _handleKeyDown(event) {
    if (this._isComposing) {
      return;
    }

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
    }
  }

  _handleArrowKey(key, shiftKey, modKey) {
    const doc = this._editor.document;
    let { start, end } = this._editor.getSelection();

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
        newOffset = modKey ? this._findWordBoundary(end, -1) : Math.max(0, end - 1);
        break;
      case 'ArrowRight':
        newOffset = modKey ? this._findWordBoundary(end, 1) : Math.min(doc.getLength(), end + 1);
        break;
      case 'ArrowUp':
        if (pos.line > 0) {
          const targetCol = Math.min(pos.column, doc.getLine(pos.line - 1).length);
          newOffset = doc.positionToOffset(pos.line - 1, targetCol);
        }
        break;
      case 'ArrowDown':
        if (pos.line < doc.getLineCount() - 1) {
          const targetCol = Math.min(pos.column, doc.getLine(pos.line + 1).length);
          newOffset = doc.positionToOffset(pos.line + 1, targetCol);
        }
        break;
    }

    this._editor.setSelection(shiftKey ? start : newOffset, newOffset);
  }

  _handleHomeEnd(key, shiftKey, modKey) {
    const doc = this._editor.document;
    const { start, end } = this._editor.getSelection();
    const pos = doc.offsetToPosition(end);

    let newOffset;
    if (key === 'Home') {
      newOffset = modKey ? 0 : doc.positionToOffset(pos.line, 0);
    } else {
      newOffset = modKey ? doc.getLength() : doc.positionToOffset(pos.line, doc.getLine(pos.line).length);
    }

    this._editor.setSelection(shiftKey ? start : newOffset, newOffset);
  }

  _handleBackspace(modKey) {
    const doc = this._editor.document;
    let { start, end } = this._editor.getSelection();

    if (start === end && start > 0) {
      start = modKey ? this._findWordBoundary(start, -1) : start - 1;
    }

    if (start !== end) {
      doc.delete(start, end);
      this._editor.setSelection(start, start);
    }
  }

  _handleDelete(modKey) {
    const doc = this._editor.document;
    let { start, end } = this._editor.getSelection();

    if (start === end && end < doc.getLength()) {
      end = modKey ? this._findWordBoundary(end, 1) : end + 1;
    }

    if (start !== end) {
      doc.delete(start, end);
      this._editor.setSelection(start, start);
    }
  }

  _handleEnter() {
    const { start, end } = this._editor.getSelection();
    this._editor.document.replaceRange(start, end, '\n');
    this._editor.setSelection(start + 1, start + 1);
  }

  _handleTab(shiftKey) {
    const { start, end } = this._editor.getSelection();
    const tabText = '  ';
    this._editor.document.replaceRange(start, end, tabText);
    this._editor.setSelection(start + tabText.length, start + tabText.length);
  }

  _handleSelectAll() {
    this._editor.setSelection(0, this._editor.document.getLength());
  }

  // ----------------------------------------
  // Focus & Mouse Handlers
  // ----------------------------------------

  _handleFocus() {
    this._editor.emit('focus');
  }

  _handleBlur() {
    this._editor.emit('blur');
  }

  _handleMouseDown(event) {
    const position = this._editor.view.getPositionFromPoint(event.clientX, event.clientY);

    if (position !== null) {
      const offset = this._editor.document.positionToOffset(position.line, position.column);
      this._editor.setSelection(offset, offset);
    }

    this._textarea.focus();
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
        }
      }
    } catch (error) {
      // Silently ignore errors during selection conversion
      // This can happen during rapid DOM updates
    }
  }

  // ----------------------------------------
  // Clipboard Handlers
  // ----------------------------------------

  _handlePaste(event) {
    event.preventDefault();

    const text = event.clipboardData?.getData('text/plain') || '';
    if (text) {
      const { start, end } = this._editor.getSelection();
      this._editor.document.replaceRange(start, end, text);
      this._editor.setSelection(start + text.length, start + text.length);
    }
  }

  _handleCopy(event) {
    const { start, end } = this._editor.getSelection();
    if (start !== end) {
      const text = this._editor.document.getTextRange(start, end);
      event.clipboardData?.setData('text/plain', text);
      event.preventDefault();
    }
  }

  _handleCut(event) {
    const { start, end } = this._editor.getSelection();
    if (start !== end) {
      const text = this._editor.document.getTextRange(start, end);
      event.clipboardData?.setData('text/plain', text);
      this._editor.document.delete(start, end);
      this._editor.setSelection(start, start);
      event.preventDefault();
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

  // ----------------------------------------
  // Public Methods
  // ----------------------------------------

  updatePosition(cursorRect) {
    if (!this._textarea) return;

    Object.assign(this._textarea.style, {
      top: `${cursorRect.top}px`,
      left: `${cursorRect.left}px`,
      height: `${cursorRect.height}px`,
      lineHeight: `${cursorRect.height}px`,
    });
  }

  focus() {
    this._textarea?.focus();
  }

  isFocused() {
    return document.activeElement === this._textarea;
  }

  isComposing() {
    return this._isComposing;
  }

  getCompositionRanges() {
    if (!this._isComposing) return [];

    const { start } = this._editor.getSelection();
    return [
      {
        start,
        end: start + this._compositionText.length,
        underlineStyle: 'solid-underline',
      },
    ];
  }

  dispose() {
    if (this._disposed) return;

    this._textarea?.remove();
    this._textarea = null;
    this._disposed = true;
  }
}
