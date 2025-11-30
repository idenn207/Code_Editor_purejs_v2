/**
 * @fileoverview Editor view for rendering text content
 * @module view/EditorView
 */

// ============================================
// Constants
// ============================================

const DEFAULT_OPTIONS = {
  lineHeight: 20,
  fontSize: 14,
  fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
  tabSize: 2,
  padding: 10,
};

// ============================================
// Class Definition
// ============================================

/**
 * Handles rendering of the editor content, cursor, and selection.
 */
export class EditorView {
  // ----------------------------------------
  // Instance Properties
  // ----------------------------------------
  _container = null;
  _editor = null;
  _options = null;

  // DOM Elements
  _wrapper = null;
  _gutterElement = null;
  _contentElement = null;
  _linesElement = null;
  _cursorElement = null;
  _selectionElement = null;
  _compositionElement = null;

  // Metrics cache
  _charWidth = 0;
  _lineHeight = 0;

  // ----------------------------------------
  // Constructor
  // ----------------------------------------

  constructor(container, editor, options = {}) {
    this._container = container;
    this._editor = editor;
    this._options = { ...DEFAULT_OPTIONS, ...options };

    this._initialize();
  }

  // ----------------------------------------
  // Initialization
  // ----------------------------------------

  _initialize() {
    this._createDOM();
    this._measureCharacter();
    this._bindEvents();
    this._render();
  }

  _createDOM() {
    this._container.innerHTML = '';
    this._container.className = 'ec-editor';

    // Main wrapper
    this._wrapper = document.createElement('div');
    this._wrapper.className = 'ec-editor-wrapper';

    // Line number gutter
    this._gutterElement = document.createElement('div');
    this._gutterElement.className = 'ec-gutter';

    // Content area
    this._contentElement = document.createElement('div');
    this._contentElement.className = 'ec-content';

    // Selection layer (behind text)
    this._selectionElement = document.createElement('div');
    this._selectionElement.className = 'ec-selection-layer';

    // Composition decoration layer
    this._compositionElement = document.createElement('div');
    this._compositionElement.className = 'ec-composition-layer';

    // Lines container
    this._linesElement = document.createElement('div');
    this._linesElement.className = 'ec-lines';

    // Cursor layer
    this._cursorElement = document.createElement('div');
    this._cursorElement.className = 'ec-cursor';

    // Assemble DOM
    this._contentElement.appendChild(this._selectionElement);
    this._contentElement.appendChild(this._compositionElement);
    this._contentElement.appendChild(this._linesElement);
    this._contentElement.appendChild(this._cursorElement);

    this._wrapper.appendChild(this._gutterElement);
    this._wrapper.appendChild(this._contentElement);

    this._container.appendChild(this._wrapper);

    // Apply font styles
    this._applyStyles();
  }

  _applyStyles() {
    const { fontSize, fontFamily, lineHeight, padding } = this._options;

    this._container.style.cssText = `
      font-size: ${fontSize}px;
      font-family: ${fontFamily};
      line-height: ${lineHeight}px;
    `;

    this._contentElement.style.padding = `${padding}px`;
    this._gutterElement.style.padding = `${padding}px 0`;
  }

  _measureCharacter() {
    // Create temporary element to measure character width
    const measureEl = document.createElement('span');
    measureEl.style.cssText = `
      position: absolute;
      visibility: hidden;
      font-size: ${this._options.fontSize}px;
      font-family: ${this._options.fontFamily};
      white-space: pre;
    `;
    measureEl.textContent = 'X';

    document.body.appendChild(measureEl);
    this._charWidth = measureEl.getBoundingClientRect().width;
    this._lineHeight = this._options.lineHeight;
    document.body.removeChild(measureEl);

    console.log(`[EditorView] Character metrics: ${this._charWidth}px × ${this._lineHeight}px`);
  }

  _bindEvents() {
    // Re-render on document change
    this._editor.document.on('change', () => this._render());

    // Re-render cursor/selection on selection change
    this._editor.on('selectionChange', () => {
      this._renderCursor();
      this._renderSelection();
    });

    // Handle composition formatting
    this._editor.on('compositionFormat', (ranges) => {
      this._renderComposition(ranges);
    });

    this._editor.on('compositionEnd', () => {
      this._compositionElement.innerHTML = '';
    });

    // Focus styling
    this._editor.on('focus', () => {
      this._container.classList.add('ec-focused');
      this._cursorElement.classList.add('ec-cursor-blink');
    });

    this._editor.on('blur', () => {
      this._container.classList.remove('ec-focused');
      this._cursorElement.classList.remove('ec-cursor-blink');
    });
  }

  // ----------------------------------------
  // Rendering
  // ----------------------------------------

  _render() {
    this._renderLines();
    this._renderGutter();
    this._renderCursor();
    this._renderSelection();
  }

  _renderLines() {
    const doc = this._editor.document;
    const lines = doc.lines;
    const tokenizer = this._editor.tokenizer;

    this._linesElement.innerHTML = '';

    lines.forEach((lineText, index) => {
      const lineEl = document.createElement('div');
      lineEl.className = 'ec-line';
      lineEl.dataset.lineIndex = index;

      if (tokenizer) {
        // Syntax highlighted rendering
        const tokens = tokenizer.tokenizeLine(lineText);
        tokens.forEach((token) => {
          const span = document.createElement('span');
          span.className = `ec-token ec-token-${token.type}`;
          span.textContent = token.value;
          lineEl.appendChild(span);
        });
      } else {
        // Plain text rendering
        lineEl.textContent = lineText || '\u00A0'; // Non-breaking space for empty lines
      }

      this._linesElement.appendChild(lineEl);
    });
  }

  _renderGutter() {
    const lineCount = this._editor.document.getLineCount();
    this._gutterElement.innerHTML = '';

    for (let i = 0; i < lineCount; i++) {
      const lineNumEl = document.createElement('div');
      lineNumEl.className = 'ec-gutter-line';
      lineNumEl.textContent = String(i + 1);
      this._gutterElement.appendChild(lineNumEl);
    }
  }

  _renderCursor() {
    const { start, end } = this._editor.getSelection();
    const doc = this._editor.document;

    // Use selection end as cursor position
    const pos = doc.offsetToPosition(end);

    const top = pos.line * this._lineHeight;
    const left = pos.column * this._charWidth;

    this._cursorElement.style.top = `${top}px`;
    this._cursorElement.style.left = `${left + this._options.padding}px`;
    this._cursorElement.style.height = `${this._lineHeight}px`;
  }

  _renderSelection() {
    const { start, end } = this._editor.getSelection();
    this._selectionElement.innerHTML = '';

    if (start === end) {
      return; // No selection
    }

    const doc = this._editor.document;
    const startPos = doc.offsetToPosition(start);
    const endPos = doc.offsetToPosition(end);

    // Render selection rectangles for each line
    for (let line = startPos.line; line <= endPos.line; line++) {
      const lineText = doc.getLine(line);

      let startCol = line === startPos.line ? startPos.column : 0;
      let endCol = line === endPos.line ? endPos.column : lineText.length;

      if (startCol === endCol && line !== endPos.line) {
        endCol = lineText.length + 1; // Include newline
      }

      const selRect = document.createElement('div');
      selRect.className = 'ec-selection-rect';
      selRect.style.top = `${line * this._lineHeight}px`;
      selRect.style.left = `${startCol * this._charWidth + this._options.padding}px`;
      selRect.style.width = `${(endCol - startCol) * this._charWidth}px`;
      selRect.style.height = `${this._lineHeight}px`;

      this._selectionElement.appendChild(selRect);
    }
  }

  _renderComposition(ranges) {
    this._compositionElement.innerHTML = '';

    ranges.forEach((range) => {
      const doc = this._editor.document;
      const startPos = doc.offsetToPosition(range.start);
      const endPos = doc.offsetToPosition(range.end);

      // For simplicity, handle single-line composition
      const decoration = document.createElement('div');
      decoration.className = `ec-composition-decoration ec-${range.underlineStyle}`;
      decoration.style.top = `${startPos.line * this._lineHeight + this._lineHeight - 2}px`;
      decoration.style.left = `${startPos.column * this._charWidth + this._options.padding}px`;
      decoration.style.width = `${(endPos.column - startPos.column) * this._charWidth}px`;

      this._compositionElement.appendChild(decoration);
    });
  }

  // ----------------------------------------
  // Public Methods - Position Calculations
  // ----------------------------------------

  /**
   * Get line/column position from screen coordinates
   * @param {number} clientX
   * @param {number} clientY
   * @returns {{ line: number, column: number } | null}
   */
  getPositionFromPoint(clientX, clientY) {
    const contentRect = this._contentElement.getBoundingClientRect();

    const x = clientX - contentRect.left - this._options.padding;
    const y = clientY - contentRect.top - this._options.padding;

    const line = Math.max(0, Math.min(Math.floor(y / this._lineHeight), this._editor.document.getLineCount() - 1));

    const lineText = this._editor.document.getLine(line);
    const column = Math.max(0, Math.min(Math.round(x / this._charWidth), lineText.length));

    return { line, column };
  }

  /**
   * Get bounding rectangle for a character at given offset
   * @param {number} offset
   * @returns {DOMRect | null}
   */
  getCharacterRect(offset) {
    const doc = this._editor.document;
    const pos = doc.offsetToPosition(offset);

    const contentRect = this._contentElement.getBoundingClientRect();

    const x = contentRect.left + this._options.padding + pos.column * this._charWidth;
    const y = contentRect.top + this._options.padding + pos.line * this._lineHeight;

    return new DOMRect(x, y, this._charWidth, this._lineHeight);
  }

  /**
   * Get bounding rectangle for current selection
   * @returns {DOMRect | null}
   */
  getSelectionRect() {
    const { start, end } = this._editor.getSelection();

    if (start === end) {
      return this.getCharacterRect(start);
    }

    const startRect = this.getCharacterRect(start);
    const endRect = this.getCharacterRect(end);

    return new DOMRect(startRect.x, startRect.y, endRect.x + endRect.width - startRect.x, endRect.y + endRect.height - startRect.y);
  }

  /**
   * Get cursor position rectangle (for input handler)
   * @returns {DOMRect}
   */
  getCursorRect() {
    const { end } = this._editor.getSelection();
    return this.getCharacterRect(end);
  }

  // ----------------------------------------
  // Getters
  // ----------------------------------------

  get contentElement() {
    return this._contentElement;
  }

  get charWidth() {
    return this._charWidth;
  }

  get lineHeight() {
    return this._lineHeight;
  }

  // ----------------------------------------
  // Cleanup
  // ----------------------------------------

  dispose() {
    this._container.innerHTML = '';
  }
}
