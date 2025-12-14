/**
 * @fileoverview Search match decoration layer for highlighting search results
 */

(function(CodeEditor) {
  'use strict';

  // ============================================
  // SearchDecorations Class
  // ============================================

  class SearchDecorations {
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

      var view = this._editor.view;
      var doc = this._editor.document;
      var padding = 10;

      for (var i = 0; i < matches.length; i++) {
        var match = matches[i];
        var isCurrent = i === currentIndex;

        var startPos = doc.offsetToPosition(match.start);
        var endPos = doc.offsetToPosition(match.end);

        if (startPos.line === endPos.line) {
          this._createDecoration(
            startPos.line,
            startPos.column,
            endPos.column - startPos.column,
            isCurrent,
            padding,
            view
          );
        } else {
          for (var line = startPos.line; line <= endPos.line; line++) {
            var lineText = doc.getLine(line);
            var startCol, endCol;

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
      for (var i = 0; i < this._decorations.length; i++) {
        this._decorations[i].remove();
      }
      this._decorations = [];
    }

    /**
     * Scroll a match into view
     * @param {Object} match - Match object {start, end, line}
     */
    scrollToMatch(match) {
      if (!match) return;

      var pos = this._editor.document.offsetToPosition(match.start);
      var view = this._editor.view;

      var scrollTop = view.contentElement.scrollTop;
      var scrollHeight = view.contentElement.clientHeight;
      var lineTop = pos.line * view.lineHeight;
      var padding = view.lineHeight * 2;

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
      var decoration = document.createElement('div');
      decoration.className = isCurrent ? 'ec-search-match ec-search-match-current' : 'ec-search-match';

      decoration.style.top = (line * view.lineHeight + padding) + 'px';
      decoration.style.left = (column * view.charWidth + padding) + 'px';
      decoration.style.width = (length * view.charWidth) + 'px';
      decoration.style.height = view.lineHeight + 'px';

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
      if (this._layer) this._layer.remove();
      this._editor = null;
    }
  }

  // ============================================
  // Export to Namespace
  // ============================================

  CodeEditor.SearchDecorations = SearchDecorations;

})(window.CodeEditor = window.CodeEditor || {});
