/**
 * @fileoverview Auto-indent feature for code editor
 * @module features/autoIndent/AutoIndentFeature
 *
 * Automatically handles indentation when pressing Enter:
 * - Maintains current line indentation
 * - Increases indent after opening brackets/colons
 * - Special handling for Enter between paired brackets
 */

import { Selection } from '../../model/Selection.js';

// ============================================
// Constants
// ============================================

// Characters that trigger indent increase on the next line
const INDENT_TRIGGERS = new Set(['{', '(', '[', ':']);

// Characters that indicate we should dedent
const DEDENT_TRIGGERS = new Set(['}', ')', ']']);

// HTML void elements (self-closing, don't need closing tags)
const HTML_VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

// ============================================
// Class Definition
// ============================================

/**
 * Auto-indent feature for the code editor.
 * Handles smart indentation when pressing Enter.
 *
 * @example
 * const autoIndent = new AutoIndentFeature(editor, { tabSize: 2 });
 */
export class AutoIndentFeature {
  // ----------------------------------------
  // Instance Properties
  // ----------------------------------------
  _editor = null;
  _enabled = true;
  _tabSize = 2;
  _useSpaces = true;
  _boundHandleKeyDown = null;

  // ----------------------------------------
  // Constructor
  // ----------------------------------------

  /**
   * @param {Object} editor - Editor instance
   * @param {Object} options - Configuration options
   * @param {boolean} options.enabled - Whether auto-indent is enabled (default: true)
   * @param {number} options.tabSize - Number of spaces per indent level (default: 2)
   * @param {boolean} options.useSpaces - Use spaces instead of tabs (default: true)
   */
  constructor(editor, options = {}) {
    this._editor = editor;
    this._enabled = options.enabled !== false;
    this._tabSize = options.tabSize || 2;
    this._useSpaces = options.useSpaces !== false;

    this._bindEvents();
  }

  // ----------------------------------------
  // Event Binding
  // ----------------------------------------

  _bindEvents() {
    this._boundHandleKeyDown = (e) => this._handleKeyDown(e);
    this._editor.view.contentElement.addEventListener(
      'keydown',
      this._boundHandleKeyDown,
      true // capture phase
    );
  }

  // ----------------------------------------
  // Event Handlers
  // ----------------------------------------

  _handleKeyDown(event) {
    if (!this._enabled) return;

    // Only handle Enter key (without Shift)
    if (event.key === 'Enter' && !event.shiftKey) {
      this._handleEnter(event);
    }

    // Handle Tab key for indentation (only without Shift)
    if (event.key === 'Tab' && !event.shiftKey) {
      this._handleIndent(event);
    }
  }

  _handleEnter(event) {
    // Prevent default Enter behavior
    event.preventDefault();
    event.stopPropagation();

    // Check for multi-cursor mode
    if (this._editor.hasMultipleCursors()) {
      this._handleMultiCursorEnter();
      return;
    }

    const { start, end } = this._editor.getSelection();

    // Get cursor position in line/column
    const pos = this._editor.document.offsetToPosition(start);
    const currentLine = this._editor.document.getLine(pos.line);

    // Split line at cursor position
    const beforeCursor = currentLine.slice(0, pos.column);
    const afterCursor = currentLine.slice(pos.column);

    // Get current indentation
    const currentIndent = this._getIndentation(currentLine);

    // Check last non-whitespace character before cursor
    const trimmedBefore = beforeCursor.trimEnd();
    const lastChar = trimmedBefore.slice(-1);
    let shouldIncrease = INDENT_TRIGGERS.has(lastChar);

    // Check for HTML opening tag without closing tag
    const language = this._editor.getLanguage();
    const htmlIndentContext = this._getHTMLIndentContext(beforeCursor, afterCursor, language);
    if (htmlIndentContext.shouldIncrease) {
      shouldIncrease = true;
    }

    // Check first non-whitespace character after cursor
    const trimmedAfter = afterCursor.trimStart();
    const firstCharAfter = trimmedAfter[0];
    let hasClosingBracket = DEDENT_TRIGGERS.has(firstCharAfter);

    // Check for HTML closing tag after cursor
    if (htmlIndentContext.hasClosingTag) {
      hasClosingBracket = true;
    }

    // Calculate new indentation
    let newIndent = currentIndent;
    if (shouldIncrease) {
      newIndent = currentIndent + this._getIndentString();
    }

    // Special case: Enter between paired brackets like {|} or <div>|</div>
    if (shouldIncrease && hasClosingBracket) {
      this._handleBracketEnter(start, end, currentIndent);
      return;
    }

    // Normal Enter: insert newline + indentation
    const insertText = '\n' + newIndent;

    // If there's a selection, delete it first
    if (start !== end) {
      this._editor.document.replaceRange(start, end, insertText);
    } else {
      this._editor.document.insert(start, insertText);
    }

    // Move cursor to end of inserted indentation
    const newCursorPos = start + insertText.length;
    this._editor.setSelection(newCursorPos, newCursorPos);
  }

  /**
   * Handle Enter key for multiple cursors
   * Each cursor gets newline + appropriate indentation
   */
  _handleMultiCursorEnter() {
    const doc = this._editor.document;
    const selections = this._editor.getSelections();
    const language = this._editor.getLanguage();

    // Calculate insert text for each cursor
    const insertTexts = [];
    for (const sel of selections.all) {
      const pos = doc.offsetToPosition(sel.start);
      const currentLine = doc.getLine(pos.line);
      const beforeCursor = currentLine.slice(0, pos.column);
      const afterCursor = currentLine.slice(pos.column);

      const currentIndent = this._getIndentation(currentLine);
      const trimmedBefore = beforeCursor.trimEnd();
      const lastChar = trimmedBefore.slice(-1);

      let shouldIncrease = INDENT_TRIGGERS.has(lastChar);
      const htmlIndentContext = this._getHTMLIndentContext(beforeCursor, afterCursor, language);
      if (htmlIndentContext.shouldIncrease) {
        shouldIncrease = true;
      }

      let newIndent = currentIndent;
      if (shouldIncrease) {
        newIndent = currentIndent + this._getIndentString();
      }

      insertTexts.push('\n' + newIndent);
    }

    // Process from end to start to preserve offsets
    const sortedSels = selections.sorted(true); // descending
    const sortedTexts = [];

    // Match sorted selections with their insert texts
    const originalSels = selections.all;
    for (const sortedSel of sortedSels) {
      const idx = originalSels.findIndex(
        (s) => s.start === sortedSel.start && s.end === sortedSel.end
      );
      sortedTexts.push(insertTexts[idx]);
    }

    // Insert at each cursor position
    for (let i = 0; i < sortedSels.length; i++) {
      const sel = sortedSels[i];
      const insertText = sortedTexts[i];
      doc.replaceRange(sel.start, sel.end, insertText);
    }

    // Calculate new cursor positions
    const ascendingSels = selections.sorted(false);
    const newSelections = [];
    let cumulativeOffset = 0;

    for (let i = 0; i < ascendingSels.length; i++) {
      const sel = ascendingSels[i];
      const idx = originalSels.findIndex(
        (s) => s.start === sel.start && s.end === sel.end
      );
      const insertText = insertTexts[idx];
      const deletedLength = sel.end - sel.start;

      const newPos = sel.start + cumulativeOffset + insertText.length;
      newSelections.push(Selection.cursor(newPos));

      cumulativeOffset += insertText.length - deletedLength;
    }

    this._editor.setSelections(newSelections);
  }

  _handleBracketEnter(start, end, baseIndent) {
    // {|} -> {\n  |\n}
    const indent = this._getIndentString();
    const insertText = '\n' + baseIndent + indent + '\n' + baseIndent;

    // Replace selection (or insert at cursor)
    if (start !== end) {
      this._editor.document.replaceRange(start, end, insertText);
    } else {
      this._editor.document.insert(start, insertText);
    }

    // Place cursor at the indented middle line
    // Position: start + '\n'.length + baseIndent.length + indent.length
    const cursorPos = start + 1 + baseIndent.length + indent.length;
    this._editor.setSelection(cursorPos, cursorPos);
  }

  /**
   * Handle Tab key - insert indent at cursor or indent selected lines
   * @param {KeyboardEvent} event
   */
  _handleIndent(event) {
    event.preventDefault();
    event.stopPropagation();

    // Check for multi-cursor mode
    if (this._editor.hasMultipleCursors()) {
      this._handleMultiCursorIndent();
      return;
    }

    const { start, end } = this._editor.getSelection();
    const indent = this._getIndentString();

    // If no selection, just insert indent at cursor
    if (start === end) {
      this._editor.document.insert(start, indent);
      const newPos = start + indent.length;
      this._editor.setSelection(newPos, newPos);
      return;
    }

    // If there's a selection, indent all selected lines
    this._indentSelectedLines(start, end);
  }

  /**
   * Handle Shift+Tab - dedent at cursor or dedent selected lines
   * @param {KeyboardEvent} event
   */
  _handleDedent(event) {
    event.preventDefault();
    event.stopPropagation();

    // Check for multi-cursor mode
    if (this._editor.hasMultipleCursors()) {
      this._handleMultiCursorDedent();
      return;
    }

    const { start, end } = this._editor.getSelection();

    // Dedent lines (works for both cursor and selection)
    this._dedentSelectedLines(start, end);
  }

  /**
   * Indent all lines in selection range
   */
  _indentSelectedLines(start, end) {
    const doc = this._editor.document;
    const startPos = doc.offsetToPosition(start);
    const endPos = doc.offsetToPosition(end);
    const indent = this._getIndentString();

    // Process lines from end to start to preserve offsets
    for (let line = endPos.line; line >= startPos.line; line--) {
      const lineStartOffset = doc.positionToOffset({ line, column: 0 });
      doc.insert(lineStartOffset, indent);
    }

    // Adjust selection
    const lineCount = endPos.line - startPos.line + 1;
    const newStart = start + indent.length;
    const newEnd = end + (indent.length * lineCount);
    this._editor.setSelection(newStart, newEnd);
  }

  /**
   * Dedent all lines in selection range
   */
  _dedentSelectedLines(start, end) {
    const doc = this._editor.document;
    const startPos = doc.offsetToPosition(start);
    const endPos = doc.offsetToPosition(end);
    const tabSize = this._tabSize;

    let totalRemoved = 0;
    let firstLineRemoved = 0;

    // Process lines from end to start to preserve offsets
    for (let line = endPos.line; line >= startPos.line; line--) {
      const lineText = doc.getLine(line);
      const lineStartOffset = doc.positionToOffset({ line, column: 0 });

      // Calculate how much to remove
      let removeCount = 0;
      for (let i = 0; i < tabSize && i < lineText.length; i++) {
        if (lineText[i] === ' ') {
          removeCount++;
        } else if (lineText[i] === '\t') {
          removeCount++;
          break;
        } else {
          break;
        }
      }

      if (removeCount > 0) {
        doc.replaceRange(lineStartOffset, lineStartOffset + removeCount, '');
        totalRemoved += removeCount;
        if (line === startPos.line) {
          firstLineRemoved = removeCount;
        }
      }
    }

    // Adjust selection
    const newStart = Math.max(0, start - firstLineRemoved);
    const newEnd = Math.max(newStart, end - totalRemoved);
    this._editor.setSelection(newStart, newEnd);
  }

  /**
   * Handle Tab key for multiple cursors
   */
  _handleMultiCursorIndent() {
    const doc = this._editor.document;
    const selections = this._editor.getSelections();
    const indent = this._getIndentString();

    // Process from end to start to preserve offsets
    const sortedSels = selections.sorted(true); // descending

    for (const sel of sortedSels) {
      doc.insert(sel.start, indent);
    }

    // Calculate new cursor positions
    const ascendingSels = selections.sorted(false);
    const newSelections = [];
    let cumulativeOffset = 0;

    for (const sel of ascendingSels) {
      const newPos = sel.start + cumulativeOffset + indent.length;
      newSelections.push(Selection.cursor(newPos));
      cumulativeOffset += indent.length;
    }

    this._editor.setSelections(newSelections);
  }

  /**
   * Handle Shift+Tab for multiple cursors
   */
  _handleMultiCursorDedent() {
    const doc = this._editor.document;
    const selections = this._editor.getSelections();
    const tabSize = this._tabSize;

    // Calculate removal amounts for each cursor
    const removalAmounts = [];
    for (const sel of selections.all) {
      const pos = doc.offsetToPosition(sel.start);
      const lineText = doc.getLine(pos.line);
      const lineStartOffset = doc.positionToOffset({ line: pos.line, column: 0 });

      let removeCount = 0;
      for (let i = 0; i < tabSize && i < lineText.length; i++) {
        if (lineText[i] === ' ') {
          removeCount++;
        } else if (lineText[i] === '\t') {
          removeCount++;
          break;
        } else {
          break;
        }
      }

      removalAmounts.push({ sel, lineStartOffset, removeCount, pos });
    }

    // Process from end to start to preserve offsets
    const sortedRemovals = [...removalAmounts].sort((a, b) => b.lineStartOffset - a.lineStartOffset);

    // Track which lines we've already processed (for multi-cursors on same line)
    const processedLines = new Set();

    for (const { pos, lineStartOffset, removeCount } of sortedRemovals) {
      if (removeCount > 0 && !processedLines.has(pos.line)) {
        doc.replaceRange(lineStartOffset, lineStartOffset + removeCount, '');
        processedLines.add(pos.line);
      }
    }

    // Calculate new cursor positions
    const ascendingSels = selections.sorted(false);
    const newSelections = [];
    let cumulativeRemoved = 0;
    const lineRemovalMap = new Map();

    // Build map of line removals in ascending order
    const ascendingRemovals = [...removalAmounts].sort((a, b) => a.lineStartOffset - b.lineStartOffset);
    for (const { pos, removeCount } of ascendingRemovals) {
      if (!lineRemovalMap.has(pos.line)) {
        lineRemovalMap.set(pos.line, removeCount);
      }
    }

    for (const sel of ascendingSels) {
      const pos = doc.offsetToPosition(sel.start);
      const removal = lineRemovalMap.get(pos.line) || 0;

      // Calculate cumulative removal from previous lines
      let prevLinesRemoval = 0;
      for (const [line, amount] of lineRemovalMap) {
        if (line < pos.line) {
          prevLinesRemoval += amount;
        }
      }

      const newCol = Math.max(0, pos.column - removal);
      const lineStartOffset = doc.positionToOffset({ line: pos.line, column: 0 }) - prevLinesRemoval;
      const newPos = lineStartOffset + newCol;
      newSelections.push(Selection.cursor(Math.max(0, newPos)));
    }

    this._editor.setSelections(newSelections);
  }

  // ----------------------------------------
  // Private Methods
  // ----------------------------------------

  /**
   * Extract leading whitespace from a line
   * @param {string} line
   * @returns {string}
   */
  _getIndentation(line) {
    const match = line.match(/^(\s*)/);
    return match ? match[1] : '';
  }

  /**
   * Get HTML-specific indent context
   * @param {string} beforeCursor - Text before cursor
   * @param {string} afterCursor - Text after cursor
   * @param {string} language - Current language
   * @returns {{ shouldIncrease: boolean, hasClosingTag: boolean }}
   */
  _getHTMLIndentContext(beforeCursor, afterCursor, language) {
    const result = { shouldIncrease: false, hasClosingTag: false };

    if (language !== 'html') {
      return result;
    }

    // Check if line ends with an opening tag: <div>, <span class="foo">, etc.
    // Pattern: <tagname ...> at the end (not self-closing />)
    const openingTagMatch = beforeCursor.match(/<(\w+)(?:\s+[^>]*)?>$/);
    if (openingTagMatch) {
      const tagName = openingTagMatch[1].toLowerCase();
      // Don't indent after void elements
      if (!HTML_VOID_ELEMENTS.has(tagName)) {
        result.shouldIncrease = true;
      }
    }

    // Check if there's a closing tag immediately after cursor
    // Pattern: </tagname> at the start of afterCursor
    const closingTagMatch = afterCursor.match(/^\s*<\/(\w+)>/);
    if (closingTagMatch) {
      result.hasClosingTag = true;
    }

    return result;
  }

  /**
   * Get the indent string based on settings
   * @returns {string}
   */
  _getIndentString() {
    return this._useSpaces ? ' '.repeat(this._tabSize) : '\t';
  }

  // ----------------------------------------
  // Public API
  // ----------------------------------------

  /**
   * Enable auto-indent feature
   */
  enable() {
    this._enabled = true;
  }

  /**
   * Disable auto-indent feature
   */
  disable() {
    this._enabled = false;
  }

  /**
   * Check if auto-indent is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this._enabled;
  }

  /**
   * Set tab size
   * @param {number} size
   */
  setTabSize(size) {
    this._tabSize = size;
  }

  /**
   * Get tab size
   * @returns {number}
   */
  getTabSize() {
    return this._tabSize;
  }

  /**
   * Set whether to use spaces or tabs
   * @param {boolean} useSpaces
   */
  setUseSpaces(useSpaces) {
    this._useSpaces = useSpaces;
  }

  /**
   * Check if using spaces
   * @returns {boolean}
   */
  isUsingSpaces() {
    return this._useSpaces;
  }

  // ----------------------------------------
  // Lifecycle
  // ----------------------------------------

  /**
   * Clean up resources
   */
  dispose() {
    if (this._boundHandleKeyDown) {
      this._editor.view.contentElement.removeEventListener(
        'keydown',
        this._boundHandleKeyDown,
        true
      );
    }

    this._editor = null;
  }
}
