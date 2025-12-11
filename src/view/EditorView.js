/**
 * @fileoverview Editor view for rendering text content
 * @module view/EditorView
 */

import { Tokenizer, TokenizerState } from '../tokenizer/Tokenizer.js';

// ============================================
// Constants
// ============================================

const DEFAULT_OPTIONS = {
  lineHeight: 20,
  fontSize: 14,
  fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
  tabSize: 2,
  padding: 10,
  language: 'javascript',
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
  _tokenizer = null;

  // DOM Elements
  _wrapper = null;
  _gutterElement = null;
  _contentElement = null;
  _linesElement = null;
  _cursorContainer = null; // Container for multiple cursors
  _cursorElements = []; // Array of cursor elements
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

    // Create tokenizer directly
    this._tokenizer = new Tokenizer(this._options.language);

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

    // Cursor container for multiple cursors
    this._cursorContainer = document.createElement('div');
    this._cursorContainer.className = 'ec-cursor-container';

    // Assemble DOM
    this._contentElement.appendChild(this._selectionElement);
    this._contentElement.appendChild(this._compositionElement);
    this._contentElement.appendChild(this._linesElement);
    this._contentElement.appendChild(this._cursorContainer);

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

    // FIX Issue 3: Set min-height to ensure content area expands
    this._linesElement.style.minHeight = '100%';
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

    // Create a persistent measurement element for variable-width character measurement
    this._measureElement = document.createElement('span');
    this._measureElement.style.cssText = `
      position: absolute;
      visibility: hidden;
      white-space: pre;
      font-size: ${this._options.fontSize}px;
      font-family: ${this._options.fontFamily};
    `;
    document.body.appendChild(this._measureElement);

    console.log(`[EditorView] Character metrics: ${this._charWidth.toFixed(2)}px × ${this._lineHeight}px`);
  }

  /**
   * Measure the actual rendered width of text
   * Handles variable-width characters (Korean, CJK, emoji, etc.)
   * @param {string} text - Text to measure
   * @returns {number} - Width in pixels
   */
  _measureTextWidth(text) {
    if (!text) return 0;
    this._measureElement.textContent = text;
    return this._measureElement.getBoundingClientRect().width;
  }

  _bindEvents() {
    // Invalidate tokenizer cache and re-render on document change
    this._editor.document.on('change', (change) => {
      this._tokenizer.invalidateFrom(change.startLine);
      this._render();
    });

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

    // Focus styling - manage cursor visibility for all cursors
    this._editor.on('focus', () => {
      this._container.classList.add('ec-focused');
      for (const cursor of this._cursorElements) {
        cursor.classList.add('ec-cursor-blink');
        cursor.style.opacity = '1';
      }
    });

    this._editor.on('blur', () => {
      this._container.classList.remove('ec-focused');
      for (const cursor of this._cursorElements) {
        cursor.classList.remove('ec-cursor-blink');
        cursor.style.opacity = '0';
      }
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
    const doc = this._editor._document;
    const lines = doc.getLines();
    const tokenizer = this._tokenizer;

    // Clear and render all lines
    this._linesElement.innerHTML = '';

    let state = TokenizerState.initial();

    lines.forEach((lineText, index) => {
      const lineEl = document.createElement('div');
      lineEl.className = 'ec-line';
      lineEl.dataset.lineIndex = index;

      // Get cached tokens or tokenize
      const result = tokenizer.getLineTokens(index, lineText, state);
      const tokens = result.tokens;
      state = result.endState;

      // Render tokens
      for (const token of tokens) {
        const span = document.createElement('span');
        span.className = `ec-token ec-token-${this._normalizeTokenType(token.type)}`;
        span.textContent = token.value;
        lineEl.appendChild(span);
      }

      // Ensure empty lines have content for height
      if (tokens.length === 0 || lineText === '') {
        const emptySpan = document.createElement('span');
        emptySpan.textContent = '\u00A0';
        lineEl.appendChild(emptySpan);
      }

      this._linesElement.appendChild(lineEl);
    });
  }

  _normalizeTokenType(type) {
    // Map token types to CSS classes
    if (!type) return 'plain';

    // Handle dot notation (e.g., 'keyword.literal' -> 'keyword-literal')
    return type.replace(/\./g, '-');
  }

  _renderGutter() {
    const totalLines = this._editor.document.getLineCount();

    this._gutterElement.innerHTML = '';

    // Render all line numbers
    for (let i = 0; i < totalLines; i++) {
      const lineNumEl = document.createElement('div');
      lineNumEl.className = 'ec-gutter-line';
      lineNumEl.textContent = String(i + 1);
      this._gutterElement.appendChild(lineNumEl);
    }
  }

  /**
   * Render all cursors (supports multi-cursor)
   */
  _renderCursor() {
    const doc = this._editor.document;
    const selections = this._editor.getSelections();
    const isFocused = this._container.classList.contains('ec-focused');

    // Clear existing cursor elements
    this._cursorContainer.innerHTML = '';
    this._cursorElements = [];

    // Create a cursor element for each selection
    for (const sel of selections) {
      // Cursor is at the 'cursor' position (movable end of selection)
      const cursorOffset = sel.cursor;
      const pos = doc.offsetToPosition(cursorOffset);

      // Calculate position relative to content area (inside padding)
      // Use actual text measurement for proper cursor positioning with variable-width chars
      const lineText = doc.getLine(pos.line);
      const textBeforeCursor = lineText.slice(0, pos.column);
      const top = pos.line * this._lineHeight + this._options.padding;
      const left = this._measureTextWidth(textBeforeCursor) + this._options.padding;

      // Create cursor element
      const cursorEl = document.createElement('div');
      cursorEl.className = 'ec-cursor';
      cursorEl.style.top = `${top}px`;
      cursorEl.style.left = `${left}px`;
      cursorEl.style.height = `${this._lineHeight}px`;
      cursorEl.style.width = '2px';

      // Add blink animation and visibility based on focus state
      if (isFocused) {
        cursorEl.classList.add('ec-cursor-blink');
        cursorEl.style.opacity = '1';
      } else {
        cursorEl.style.opacity = '0';
      }

      this._cursorContainer.appendChild(cursorEl);
      this._cursorElements.push(cursorEl);
    }
  }

  /**
   * Render all selections (supports multi-cursor)
   */
  _renderSelection() {
    this._selectionElement.innerHTML = '';

    const doc = this._editor._document;
    const selections = this._editor.getSelections();
    const offset = this._options.padding;

    // Render each selection
    for (const sel of selections) {
      if (sel.isEmpty) continue; // Skip cursors without selection

      const startPos = doc.offsetToPosition(sel.start);
      const endPos = doc.offsetToPosition(sel.end);

      // Render selection rectangles for each line
      for (let line = startPos.line; line <= endPos.line; line++) {
        const lineText = doc.getLine(line);

        let startCol = line === startPos.line ? startPos.column : 0;
        let endCol = line === endPos.line ? endPos.column : lineText.length;

        // Include newline in selection visual
        const hasTrailingNewline = line !== endPos.line;
        if (hasTrailingNewline) {
          endCol = Math.max(endCol, lineText.length);
        }

        if (startCol === endCol && !hasTrailingNewline) continue;

        // Use actual text measurement for proper selection with variable-width chars
        const textBeforeStart = lineText.slice(0, startCol);
        const textBeforeEnd = lineText.slice(0, endCol);
        const startX = this._measureTextWidth(textBeforeStart);
        const endX = this._measureTextWidth(textBeforeEnd);
        const trailingWidth = hasTrailingNewline ? this._charWidth * 0.5 : 0;

        const selRect = document.createElement('div');
        selRect.className = 'ec-selection-rect';
        selRect.style.top = `${line * this._lineHeight + offset}px`;
        selRect.style.left = `${startX + offset}px`;
        selRect.style.width = `${Math.max(endX - startX + trailingWidth, 4)}px`;
        selRect.style.height = `${this._lineHeight}px`;

        this._selectionElement.appendChild(selRect);
      }
    }
  }

  _renderComposition(ranges) {
    this._compositionElement.innerHTML = '';
    const padding = this._options.padding;

    ranges.forEach((range) => {
      const doc = this._editor._document;
      const startPos = doc.offsetToPosition(range.start);
      const endPos = doc.offsetToPosition(range.end);

      // Use actual text measurement for composition decoration with variable-width chars
      const lineText = doc.getLine(startPos.line);
      const textBeforeStart = lineText.slice(0, startPos.column);
      const textBeforeEnd = lineText.slice(0, endPos.column);
      const startX = this._measureTextWidth(textBeforeStart);
      const width = this._measureTextWidth(textBeforeEnd) - startX;

      // For simplicity, handle single-line composition
      const decoration = document.createElement('div');
      decoration.className = `ec-composition-decoration ec-${range.underlineStyle}`;
      decoration.style.top = `${startPos.line * this._lineHeight + this._lineHeight - 2 + padding}px`;
      decoration.style.left = `${startX + padding}px`;
      decoration.style.width = `${Math.max(width, 4)}px`;

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

    // Use binary search with actual text measurement for accurate column detection
    // This handles variable-width characters (Korean, CJK, etc.)
    const column = this._findColumnFromX(lineText, x);

    return { line, column };
  }

  /**
   * Find the column position from an x coordinate using actual text measurement
   * Uses binary search for efficiency with variable-width characters
   * @param {string} lineText - The text of the line
   * @param {number} targetX - The x coordinate to find
   * @returns {number} - The column position
   */
  _findColumnFromX(lineText, targetX) {
    if (lineText.length === 0 || targetX <= 0) return 0;

    // Binary search for the column
    let low = 0;
    let high = lineText.length;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const midX = this._measureTextWidth(lineText.slice(0, mid));

      if (midX < targetX) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    // Check if we should round to the nearest character
    if (low > 0 && low <= lineText.length) {
      const prevX = this._measureTextWidth(lineText.slice(0, low - 1));
      const currX = this._measureTextWidth(lineText.slice(0, low));
      const midPoint = (prevX + currX) / 2;

      if (targetX < midPoint) {
        return low - 1;
      }
    }

    return Math.min(low, lineText.length);
  }

  /**
   * Get bounding rectangle for a character at given offset
   * @param {number} offset
   * @returns {DOMRect | null}
   */
  getCharacterRect(offset) {
    const doc = this._editor._document;
    const pos = doc.offsetToPosition(offset);

    const contentRect = this._contentElement.getBoundingClientRect();

    // Use actual text measurement for proper cursor positioning with variable-width chars
    const lineText = doc.getLine(pos.line);
    const textBeforeCursor = lineText.slice(0, pos.column);

    const x = contentRect.left + this._options.padding + this._measureTextWidth(textBeforeCursor);
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
    // Use raw selection - 'end' is always the cursor position
    const { end } = this._editor.getRawSelection();
    return this.getCharacterRect(end);
  }

  /**
   * Scroll to ensure primary cursor is visible
   */
  scrollToCursor() {
    // Scroll to primary selection's cursor
    const primary = this._editor.getSelections().primary;
    const pos = this._editor.document.offsetToPosition(primary.cursor);

    const cursorTop = pos.line * this._lineHeight;
    const cursorBottom = cursorTop + this._lineHeight;

    const viewTop = this._wrapper.scrollTop;
    const viewBottom = viewTop + this._wrapper.clientHeight;

    if (cursorTop < viewTop) {
      this._wrapper.scrollTop = cursorTop;
    } else if (cursorBottom > viewBottom) {
      this._wrapper.scrollTop = cursorBottom - this._wrapper.clientHeight;
    }
  }

  /**
   * Set language for syntax highlighting
   * @param {string} language - Language identifier
   */
  setLanguage(language) {
    this._options.language = language;
    this._tokenizer = new Tokenizer(language);
    this._render();
  }

  // ----------------------------------------
  // Getters
  // ----------------------------------------

  get container() {
    return this._container;
  }

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
    this._tokenizer?.clearCache();
    this._tokenizer = null;
    this._container.innerHTML = '';

    // Clean up measurement element
    if (this._measureElement) {
      this._measureElement.remove();
      this._measureElement = null;
    }
  }
}

