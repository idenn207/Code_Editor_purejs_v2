/**
 * @fileoverview Search match decoration layer for highlighting search results
 * @module features/search/SearchDecorations
 */

// ============================================
// SearchDecorations Class
// ============================================

export class SearchDecorations {
  // ----------------------------------------
  // Instance Properties
  // ----------------------------------------

  _editor = null;
  _layer = null;
  _decorations = [];

  // ----------------------------------------
  // Constructor
  // ----------------------------------------

  /**
   * @param {Object} editor - Editor instance
   */
  constructor(editor) {
    this._editor = editor;
    this._createLayer();
  }

  // ----------------------------------------
  // DOM Setup
  // ----------------------------------------

  _createLayer() {
    this._layer = document.createElement('div');
    this._layer.className = 'ec-decoration-layer ec-search-decoration-layer';
    this._editor.view.contentElement.appendChild(this._layer);
  }

  // ----------------------------------------
  // Public Methods
  // ----------------------------------------

  /**
   * Render all match decorations
   * @param {Array} matches - Array of match objects {start, end, line}
   * @param {number} currentIndex - Index of current match (0-based)
   */
  render(matches, currentIndex) {
    this.clear();

    if (!matches || matches.length === 0) {
      return;
    }

    const view = this._editor.view;
    const doc = this._editor.document;
    const padding = 10;

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const isCurrent = i === currentIndex;

      // Handle multi-line matches
      const startPos = doc.offsetToPosition(match.start);
      const endPos = doc.offsetToPosition(match.end);

      if (startPos.line === endPos.line) {
        // Single line match
        this._createDecoration(
          startPos.line,
          startPos.column,
          endPos.column - startPos.column,
          isCurrent,
          padding,
          view
        );
      } else {
        // Multi-line match - highlight each line
        for (let line = startPos.line; line <= endPos.line; line++) {
          const lineText = doc.getLine(line);
          let startCol, endCol;

          if (line === startPos.line) {
            startCol = startPos.column;
            endCol = lineText.length;
          } else if (line === endPos.line) {
            startCol = 0;
            endCol = endPos.column;
          } else {
            startCol = 0;
            endCol = lineText.length;
          }

          if (endCol > startCol) {
            this._createDecoration(line, startCol, endCol - startCol, isCurrent, padding, view);
          }
        }
      }
    }
  }

  /**
   * Clear all decorations
   */
  clear() {
    for (const decoration of this._decorations) {
      decoration.remove();
    }
    this._decorations = [];
  }

  /**
   * Scroll a match into view
   * @param {Object} match - Match object {start, end, line}
   */
  scrollToMatch(match) {
    if (!match) return;

    const pos = this._editor.document.offsetToPosition(match.start);
    const view = this._editor.view;

    // Calculate visible range
    const scrollTop = view.contentElement.scrollTop;
    const scrollHeight = view.contentElement.clientHeight;
    const lineTop = pos.line * view.lineHeight;
    const padding = view.lineHeight * 2;

    // Scroll if match is outside visible area
    if (lineTop < scrollTop + padding) {
      view.contentElement.scrollTop = Math.max(0, lineTop - padding);
    } else if (lineTop > scrollTop + scrollHeight - padding) {
      view.contentElement.scrollTop = lineTop - scrollHeight + padding + view.lineHeight;
    }
  }

  // ----------------------------------------
  // Private Methods
  // ----------------------------------------

  _createDecoration(line, column, length, isCurrent, padding, view) {
    const decoration = document.createElement('div');
    decoration.className = isCurrent ? 'ec-search-match ec-search-match-current' : 'ec-search-match';

    decoration.style.top = `${line * view.lineHeight + padding}px`;
    decoration.style.left = `${column * view.charWidth + padding}px`;
    decoration.style.width = `${length * view.charWidth}px`;
    decoration.style.height = `${view.lineHeight}px`;

    this._layer.appendChild(decoration);
    this._decorations.push(decoration);
  }

  // ----------------------------------------
  // Lifecycle
  // ----------------------------------------

  /**
   * Clean up resources
   */
  dispose() {
    this.clear();
    this._layer?.remove();
    this._editor = null;
  }
}
