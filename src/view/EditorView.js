/**
 * @fileoverview Editor view for rendering text content
 */

(function(CodeEditor) {
  'use strict';

  // Dependencies from namespace
  var Tokenizer = CodeEditor.Tokenizer;
  var TokenizerState = CodeEditor.TokenizerState;

  // ============================================
  // Constants
  // ============================================

  var DEFAULT_OPTIONS = {
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
  class EditorView {
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

    // Background tokenization state (Hybrid Viewport Priority)
    _pendingTokenization = null; // setTimeout handle for background work
    _lineStates = new Map(); // Cached tokenizer end states per line index
    _isBackgroundTokenizing = false; // Flag to track background tokenization
    _backgroundQueue = []; // Lines waiting to be tokenized in background

    // Incremental rendering state
    _currentLineCount = 0; // Track line count for incremental updates
    _pendingChange = null; // Store change info for incremental render

    // ----------------------------------------
    // Constructor
    // ----------------------------------------

    constructor(container, editor, options) {
      if (!options) options = {};
      this._container = container;
      this._editor = editor;
      this._options = Object.assign({}, DEFAULT_OPTIONS, options);

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
      var fontSize = this._options.fontSize;
      var fontFamily = this._options.fontFamily;
      var lineHeight = this._options.lineHeight;
      var padding = this._options.padding;

      this._container.style.cssText =
        'font-size: ' + fontSize + 'px; ' +
        'font-family: ' + fontFamily + '; ' +
        'line-height: ' + lineHeight + 'px;';

      this._contentElement.style.padding = padding + 'px';
      this._gutterElement.style.padding = padding + 'px 0';

      // FIX Issue 3: Set min-height to ensure content area expands
      this._linesElement.style.minHeight = '100%';
    }

    _measureCharacter() {
      var self = this;
      // Create temporary element to measure character width
      var measureEl = document.createElement('span');
      measureEl.style.cssText =
        'position: absolute; ' +
        'visibility: hidden; ' +
        'font-size: ' + this._options.fontSize + 'px; ' +
        'font-family: ' + this._options.fontFamily + '; ' +
        'white-space: pre;';
      measureEl.textContent = 'X';

      document.body.appendChild(measureEl);
      this._charWidth = measureEl.getBoundingClientRect().width;
      this._lineHeight = this._options.lineHeight;
      document.body.removeChild(measureEl);

      // Create a persistent measurement element for variable-width character measurement
      this._measureElement = document.createElement('span');
      this._measureElement.style.cssText =
        'position: absolute; ' +
        'visibility: hidden; ' +
        'white-space: pre; ' +
        'font-size: ' + this._options.fontSize + 'px; ' +
        'font-family: ' + this._options.fontFamily + ';';
      document.body.appendChild(this._measureElement);

      console.log('[EditorView] Character metrics: ' + this._charWidth.toFixed(2) + 'px × ' + this._lineHeight + 'px');
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
      var self = this;

      // Invalidate tokenizer cache and re-render on document change
      this._editor.document.on('change', function(change) {
        // Cancel any pending background tokenization
        self._cancelBackgroundTokenization();

        // Invalidate cached states from the changed line onwards
        self._invalidateStatesFrom(change.startLine);

        // Invalidate tokenizer cache
        self._tokenizer.invalidateFrom(change.startLine);

        // Store change for incremental render
        self._pendingChange = change;

        // Use incremental render instead of full re-render
        self._renderIncremental(change);
        self._renderGutter();
        self._renderCursor();
        self._renderSelection();

        self._pendingChange = null;
      });

      // Re-render cursor/selection on selection change
      this._editor.on('selectionChange', function() {
        self._renderCursor();
        self._renderSelection();
      });

      // Handle composition formatting
      this._editor.on('compositionFormat', function(ranges) {
        self._renderComposition(ranges);
      });

      this._editor.on('compositionEnd', function() {
        self._compositionElement.innerHTML = '';
      });

      // Focus styling - manage cursor visibility for all cursors
      this._editor.on('focus', function() {
        self._container.classList.add('ec-focused');
        for (var i = 0; i < self._cursorElements.length; i++) {
          var cursor = self._cursorElements[i];
          cursor.classList.add('ec-cursor-blink');
          cursor.style.opacity = '1';
        }
      });

      this._editor.on('blur', function() {
        self._container.classList.remove('ec-focused');
        for (var i = 0; i < self._cursorElements.length; i++) {
          var cursor = self._cursorElements[i];
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

    /**
     * Full render - used for initial load and language change
     */
    _renderLines() {
      var doc = this._editor._document;
      var lines = doc.getLines();
      var totalLines = lines.length;

      // Clear and create all line elements
      this._linesElement.innerHTML = '';

      // Create all line elements
      for (var i = 0; i < totalLines; i++) {
        var lineEl = document.createElement('div');
        lineEl.className = 'ec-line';
        lineEl.dataset.lineIndex = i;
        lineEl.innerHTML = '<span>\u00A0</span>';
        this._linesElement.appendChild(lineEl);
      }

      // Track current line count
      this._currentLineCount = totalLines;

      // Get visible range with buffer
      var visibleRange = this._getVisibleLineRange();
      var startLine = visibleRange.startLine;
      var endLine = visibleRange.endLine;

      // Phase 1: Synchronously tokenize visible lines (priority)
      this._tokenizeAndRenderRange(0, endLine, lines);

      // Phase 2: Schedule background tokenization for remaining lines
      if (endLine < totalLines - 1) {
        this._scheduleBackgroundTokenization(endLine + 1, totalLines - 1, lines);
      }
    }

    /**
     * Incremental render - only update changed lines (FAST)
     * @param {Object} change - Change info from document
     */
    _renderIncremental(change) {
      var doc = this._editor._document;
      var lines = doc.getLines();
      var newLineCount = lines.length;
      var oldLineCount = this._currentLineCount;

      // Calculate line delta from the change
      var deletedLines = change.deletedText.split('\n').length - 1;
      var insertedLines = change.insertedText.split('\n').length - 1;
      var lineDelta = insertedLines - deletedLines;

      // Handle line count changes
      if (lineDelta > 0) {
        // Lines were added - insert new DOM elements
        var insertPoint = change.startLine + 1;
        var referenceNode = this._linesElement.children[insertPoint] || null;

        for (var i = 0; i < lineDelta; i++) {
          var lineEl = document.createElement('div');
          lineEl.className = 'ec-line';
          lineEl.innerHTML = '<span>\u00A0</span>';
          this._linesElement.insertBefore(lineEl, referenceNode);
        }
      } else if (lineDelta < 0) {
        // Lines were removed - remove DOM elements
        var removeCount = Math.abs(lineDelta);
        var removeStart = change.startLine + 1;

        for (var j = 0; j < removeCount; j++) {
          var lineEl = this._linesElement.children[removeStart];
          if (lineEl) {
            lineEl.remove();
          }
        }
      }

      // Update line indices for all lines after the change
      if (lineDelta !== 0) {
        var startUpdate = change.startLine;
        for (var k = startUpdate; k < this._linesElement.children.length; k++) {
          this._linesElement.children[k].dataset.lineIndex = k;
        }
      }

      // Update current line count
      this._currentLineCount = newLineCount;

      // Determine which lines need re-tokenization
      // At minimum, re-tokenize the changed line and any new lines
      var affectedStart = change.startLine;
      var affectedEnd = Math.min(
        change.startLine + Math.max(1, insertedLines + 1),
        newLineCount - 1
      );

      // Re-tokenize affected lines
      this._tokenizeAndRenderRange(affectedStart, affectedEnd, lines);

      // For multi-line changes, schedule background tokenization for lines after
      // (in case state changed and affects subsequent lines)
      if (affectedEnd < newLineCount - 1) {
        this._scheduleBackgroundTokenization(affectedEnd + 1, newLineCount - 1, lines);
      }
    }

    /**
     * Tokenize and render a range of lines synchronously
     * @param {number} fromLine - Start line (inclusive)
     * @param {number} toLine - End line (inclusive)
     * @param {string[]} lines - All document lines
     */
    _tokenizeAndRenderRange(fromLine, toLine, lines) {
      var tokenizer = this._tokenizer;

      // Get starting state for the range
      var state = this._getStateForLine(fromLine, lines);

      for (var i = fromLine; i <= toLine; i++) {
        var lineText = lines[i];
        var lineEl = this._linesElement.children[i];

        if (!lineEl) continue;

        // Tokenize the line
        var result = tokenizer.getLineTokens(i, lineText, state);
        var tokens = result.tokens;

        // Cache the end state for this line
        this._lineStates.set(i, result.endState);
        state = result.endState;

        // Render tokens to DOM
        this._renderLineTokens(lineEl, tokens, lineText);
      }
    }

    /**
     * Render tokens to a line element
     * @param {HTMLElement} lineEl - The line DOM element
     * @param {Array} tokens - Tokens to render
     * @param {string} lineText - Original line text
     */
    _renderLineTokens(lineEl, tokens, lineText) {
      lineEl.innerHTML = '';

      for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        var span = document.createElement('span');
        span.className = 'ec-token ec-token-' + this._normalizeTokenType(token.type);
        span.textContent = token.value;
        lineEl.appendChild(span);
      }

      // Ensure empty lines have content for height
      if (tokens.length === 0 || lineText === '') {
        var emptySpan = document.createElement('span');
        emptySpan.textContent = '\u00A0';
        lineEl.appendChild(emptySpan);
      }
    }

    /**
     * Get the visible line range based on scroll position
     * @returns {{ startLine: number, endLine: number }}
     */
    _getVisibleLineRange() {
      var scrollTop = this._wrapper.scrollTop;
      var viewportHeight = this._wrapper.clientHeight;
      var totalLines = this._editor.document.getLineCount();

      // Calculate visible lines
      var startLine = Math.max(0, Math.floor(scrollTop / this._lineHeight) - 5); // 5 line buffer above
      var endLine = Math.min(
        totalLines - 1,
        Math.ceil((scrollTop + viewportHeight) / this._lineHeight) + 5 // 5 line buffer below
      );

      return { startLine: startLine, endLine: endLine };
    }

    /**
     * Get the tokenizer state for a specific line
     * Must tokenize from the beginning if state is not cached
     * @param {number} lineIndex - Target line index
     * @param {string[]} lines - All document lines
     * @returns {TokenizerState}
     */
    _getStateForLine(lineIndex, lines) {
      if (lineIndex === 0) {
        return TokenizerState.initial();
      }

      // Check if we have a cached state from the previous line
      var cachedState = this._lineStates.get(lineIndex - 1);
      if (cachedState) {
        return cachedState;
      }

      // Find the nearest cached state before this line
      var nearestLine = -1;
      for (var i = lineIndex - 1; i >= 0; i--) {
        if (this._lineStates.has(i)) {
          nearestLine = i;
          break;
        }
      }

      // Tokenize from the nearest cached state (or beginning) to build up state
      var state = nearestLine >= 0 ? this._lineStates.get(nearestLine) : TokenizerState.initial();
      var startFrom = nearestLine >= 0 ? nearestLine + 1 : 0;

      for (var j = startFrom; j < lineIndex; j++) {
        var result = this._tokenizer.getLineTokens(j, lines[j], state);
        this._lineStates.set(j, result.endState);
        state = result.endState;
      }

      return state;
    }

    /**
     * Schedule background tokenization using setTimeout(0)
     * Uses VS Code's pattern - setTimeout is faster than requestIdleCallback
     * @param {number} fromLine - Start line
     * @param {number} toLine - End line
     * @param {string[]} lines - All document lines
     */
    _scheduleBackgroundTokenization(fromLine, toLine, lines) {
      this._cancelBackgroundTokenization();

      this._backgroundQueue = [];
      for (var i = fromLine; i <= toLine; i++) {
        this._backgroundQueue.push(i);
      }

      this._isBackgroundTokenizing = true;
      this._processBackgroundChunk(lines);
    }

    /**
     * Process a chunk of background tokenization
     * Uses setTimeout(0) for better performance than requestIdleCallback
     * @param {string[]} lines - All document lines
     */
    _processBackgroundChunk(lines) {
      var self = this;

      if (!this._isBackgroundTokenizing || this._backgroundQueue.length === 0) {
        this._isBackgroundTokenizing = false;
        return;
      }

      var CHUNK_SIZE = 100; // Process 100 lines per chunk (VS Code uses larger chunks)
      var chunk = this._backgroundQueue.splice(0, CHUNK_SIZE);

      // Get state for first line in chunk
      var state = this._getStateForLine(chunk[0], lines);
      var statesConverged = false;

      for (var i = 0; i < chunk.length; i++) {
        var lineIndex = chunk[i];

        // Check if document changed (lines array might be stale)
        if (lineIndex >= this._linesElement.children.length) {
          break;
        }

        var lineText = lines[lineIndex];
        var lineEl = this._linesElement.children[lineIndex];

        if (!lineEl) continue;

        // Tokenize the line
        var result = this._tokenizer.getLineTokens(lineIndex, lineText, state);

        // Early termination: if new end state equals cached state, we can stop
        var cachedEndState = this._lineStates.get(lineIndex);
        if (cachedEndState && cachedEndState.equals(result.endState)) {
          statesConverged = true;
          // Still render this line but can stop after
        }

        // Cache the end state
        this._lineStates.set(lineIndex, result.endState);
        state = result.endState;

        // Render tokens to DOM
        this._renderLineTokens(lineEl, result.tokens, lineText);

        if (statesConverged) {
          // States have converged - remaining lines don't need retokenization
          this._backgroundQueue = [];
          break;
        }
      }

      // Schedule next chunk if there's more work
      if (this._backgroundQueue.length > 0 && !statesConverged) {
        this._pendingTokenization = setTimeout(function() {
          self._processBackgroundChunk(lines);
        }, 0);
      } else {
        this._isBackgroundTokenizing = false;
      }
    }

    /**
     * Cancel pending background tokenization
     */
    _cancelBackgroundTokenization() {
      if (this._pendingTokenization !== null) {
        clearTimeout(this._pendingTokenization);
        this._pendingTokenization = null;
      }
      this._isBackgroundTokenizing = false;
      this._backgroundQueue = [];
    }

    /**
     * Invalidate cached states from a specific line onwards
     * @param {number} fromLine - Line to invalidate from
     */
    _invalidateStatesFrom(fromLine) {
      var self = this;
      // Remove all cached states from fromLine onwards
      var keysToDelete = [];
      this._lineStates.forEach(function(value, key) {
        if (key >= fromLine) {
          keysToDelete.push(key);
        }
      });
      for (var i = 0; i < keysToDelete.length; i++) {
        this._lineStates.delete(keysToDelete[i]);
      }
    }

    _normalizeTokenType(type) {
      // Map token types to CSS classes
      if (!type) return 'plain';

      // Handle dot notation (e.g., 'keyword.literal' -> 'keyword-literal')
      return type.replace(/\./g, '-');
    }

    _renderGutter() {
      var totalLines = this._editor.document.getLineCount();
      var currentGutterLines = this._gutterElement.children.length;

      // Incremental update: only add/remove what's needed
      if (totalLines > currentGutterLines) {
        // Add new line numbers
        for (var i = currentGutterLines; i < totalLines; i++) {
          var lineNumEl = document.createElement('div');
          lineNumEl.className = 'ec-gutter-line';
          lineNumEl.textContent = String(i + 1);
          this._gutterElement.appendChild(lineNumEl);
        }
      } else if (totalLines < currentGutterLines) {
        // Remove excess line numbers
        while (this._gutterElement.children.length > totalLines) {
          this._gutterElement.lastChild.remove();
        }
      }
      // If line count is the same, no DOM changes needed
    }

    /**
     * Render all cursors (supports multi-cursor)
     */
    _renderCursor() {
      var doc = this._editor.document;
      var selectionsCollection = this._editor.getSelections();
      var selections = selectionsCollection.all; // Get array from SelectionCollection
      var isFocused = this._container.classList.contains('ec-focused');

      // Clear existing cursor elements
      this._cursorContainer.innerHTML = '';
      this._cursorElements = [];

      // Create a cursor element for each selection
      for (var i = 0; i < selections.length; i++) {
        var sel = selections[i];
        // Cursor is at the 'cursor' position (movable end of selection)
        var cursorOffset = sel.cursor;
        var pos = doc.offsetToPosition(cursorOffset);

        // Calculate position relative to content area (inside padding)
        // Use actual text measurement for proper cursor positioning with variable-width chars
        var lineText = doc.getLine(pos.line);
        var textBeforeCursor = lineText.slice(0, pos.column);
        var top = pos.line * this._lineHeight + this._options.padding;
        var left = this._measureTextWidth(textBeforeCursor) + this._options.padding;

        // Create cursor element
        var cursorEl = document.createElement('div');
        cursorEl.className = 'ec-cursor';
        cursorEl.style.top = top + 'px';
        cursorEl.style.left = left + 'px';
        cursorEl.style.height = this._lineHeight + 'px';
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

      var doc = this._editor._document;
      var selectionsCollection = this._editor.getSelections();
      var selections = selectionsCollection.all; // Get array from SelectionCollection
      var offset = this._options.padding;

      // Render each selection
      for (var i = 0; i < selections.length; i++) {
        var sel = selections[i];
        if (sel.isEmpty) continue; // Skip cursors without selection

        var startPos = doc.offsetToPosition(sel.start);
        var endPos = doc.offsetToPosition(sel.end);

        // Render selection rectangles for each line
        for (var line = startPos.line; line <= endPos.line; line++) {
          var lineText = doc.getLine(line);

          var startCol = line === startPos.line ? startPos.column : 0;
          var endCol = line === endPos.line ? endPos.column : lineText.length;

          // Include newline in selection visual
          var hasTrailingNewline = line !== endPos.line;
          if (hasTrailingNewline) {
            endCol = Math.max(endCol, lineText.length);
          }

          if (startCol === endCol && !hasTrailingNewline) continue;

          // Use actual text measurement for proper selection with variable-width chars
          var textBeforeStart = lineText.slice(0, startCol);
          var textBeforeEnd = lineText.slice(0, endCol);
          var startX = this._measureTextWidth(textBeforeStart);
          var endX = this._measureTextWidth(textBeforeEnd);
          var trailingWidth = hasTrailingNewline ? this._charWidth * 0.5 : 0;

          var selRect = document.createElement('div');
          selRect.className = 'ec-selection-rect';
          selRect.style.top = (line * this._lineHeight + offset) + 'px';
          selRect.style.left = (startX + offset) + 'px';
          selRect.style.width = Math.max(endX - startX + trailingWidth, 4) + 'px';
          selRect.style.height = this._lineHeight + 'px';

          this._selectionElement.appendChild(selRect);
        }
      }
    }

    _renderComposition(ranges) {
      var self = this;
      this._compositionElement.innerHTML = '';
      var padding = this._options.padding;

      for (var i = 0; i < ranges.length; i++) {
        var range = ranges[i];
        var doc = this._editor._document;
        var startPos = doc.offsetToPosition(range.start);
        var endPos = doc.offsetToPosition(range.end);

        // Use actual text measurement for composition decoration with variable-width chars
        var lineText = doc.getLine(startPos.line);
        var textBeforeStart = lineText.slice(0, startPos.column);
        var textBeforeEnd = lineText.slice(0, endPos.column);
        var startX = this._measureTextWidth(textBeforeStart);
        var width = this._measureTextWidth(textBeforeEnd) - startX;

        // For simplicity, handle single-line composition
        var decoration = document.createElement('div');
        decoration.className = 'ec-composition-decoration ec-' + range.underlineStyle;
        decoration.style.top = (startPos.line * this._lineHeight + this._lineHeight - 2 + padding) + 'px';
        decoration.style.left = (startX + padding) + 'px';
        decoration.style.width = Math.max(width, 4) + 'px';

        this._compositionElement.appendChild(decoration);
      }
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
      var contentRect = this._contentElement.getBoundingClientRect();

      var x = clientX - contentRect.left - this._options.padding;
      var y = clientY - contentRect.top - this._options.padding;

      var line = Math.max(0, Math.min(Math.floor(y / this._lineHeight), this._editor.document.getLineCount() - 1));

      var lineText = this._editor.document.getLine(line);

      // Use binary search with actual text measurement for accurate column detection
      // This handles variable-width characters (Korean, CJK, etc.)
      var column = this._findColumnFromX(lineText, x);

      return { line: line, column: column };
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
      var low = 0;
      var high = lineText.length;

      while (low < high) {
        var mid = Math.floor((low + high) / 2);
        var midX = this._measureTextWidth(lineText.slice(0, mid));

        if (midX < targetX) {
          low = mid + 1;
        } else {
          high = mid;
        }
      }

      // Check if we should round to the nearest character
      if (low > 0 && low <= lineText.length) {
        var prevX = this._measureTextWidth(lineText.slice(0, low - 1));
        var currX = this._measureTextWidth(lineText.slice(0, low));
        var midPoint = (prevX + currX) / 2;

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
      var doc = this._editor._document;
      var pos = doc.offsetToPosition(offset);

      var contentRect = this._contentElement.getBoundingClientRect();

      // Use actual text measurement for proper cursor positioning with variable-width chars
      var lineText = doc.getLine(pos.line);
      var textBeforeCursor = lineText.slice(0, pos.column);

      var x = contentRect.left + this._options.padding + this._measureTextWidth(textBeforeCursor);
      var y = contentRect.top + this._options.padding + pos.line * this._lineHeight;

      return new DOMRect(x, y, this._charWidth, this._lineHeight);
    }

    /**
     * Get bounding rectangle for current selection
     * @returns {DOMRect | null}
     */
    getSelectionRect() {
      var selection = this._editor.getSelection();
      var start = selection.start;
      var end = selection.end;

      if (start === end) {
        return this.getCharacterRect(start);
      }

      var startRect = this.getCharacterRect(start);
      var endRect = this.getCharacterRect(end);

      return new DOMRect(startRect.x, startRect.y, endRect.x + endRect.width - startRect.x, endRect.y + endRect.height - startRect.y);
    }

    /**
     * Get cursor position rectangle (for input handler)
     * @returns {DOMRect}
     */
    getCursorRect() {
      // Use raw selection - 'end' is always the cursor position
      var rawSelection = this._editor.getRawSelection();
      return this.getCharacterRect(rawSelection.end);
    }

    /**
     * Scroll to ensure primary cursor is visible
     */
    scrollToCursor() {
      // Scroll to primary selection's cursor
      var primary = this._editor.getSelections().primary;
      var pos = this._editor.document.offsetToPosition(primary.cursor);

      var cursorTop = pos.line * this._lineHeight;
      var cursorBottom = cursorTop + this._lineHeight;

      var viewTop = this._wrapper.scrollTop;
      var viewBottom = viewTop + this._wrapper.clientHeight;

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
      // Cancel any pending background tokenization
      this._cancelBackgroundTokenization();

      // Clear cached states (they're for the old language)
      this._lineStates.clear();

      // Create new tokenizer for the language
      this._options.language = language;
      this._tokenizer = new Tokenizer(language);

      // Re-render with new tokenizer
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
      // Cancel any pending background tokenization
      this._cancelBackgroundTokenization();

      // Clear cached states
      this._lineStates.clear();

      // Clear tokenizer
      if (this._tokenizer) {
        this._tokenizer.clearCache();
      }
      this._tokenizer = null;

      // Clear DOM
      this._container.innerHTML = '';

      // Clean up measurement element
      if (this._measureElement) {
        this._measureElement.remove();
        this._measureElement = null;
      }
    }
  }

  // ============================================
  // Export to Namespace
  // ============================================

  CodeEditor.EditorView = EditorView;

})(window.CodeEditor = window.CodeEditor || {});
