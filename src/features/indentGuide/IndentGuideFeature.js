/**
 * @fileoverview Indent guide feature for code editor
 * @module features/indentGuide/IndentGuideFeature
 *
 * Renders vertical lines at each indentation level with rainbow coloring.
 * Updates on document changes and respects tab size configuration.
 */

(function(CodeEditor) {
  'use strict';

  // ============================================
  // Constants
  // ============================================

  // Number of distinct colors for indent levels (cycles after this)
  var COLOR_COUNT = 6;

  // Default tab/indent size
  var DEFAULT_TAB_SIZE = 2;

  // ============================================
  // Class Definition
  // ============================================

  /**
   * Indent guide feature.
   * Renders vertical indent guides with rainbow coloring.
   *
   * @example
   * var indentGuide = new IndentGuideFeature(editor, { tabSize: 2 });
   */
  class IndentGuideFeature {
    // ----------------------------------------
    // Instance Properties
    // ----------------------------------------
    _editor = null;
    _enabled = true;
    _tabSize = DEFAULT_TAB_SIZE;
    _decorationLayer = null;
    _decorations = [];
    _boundHandleChange = null;
    _rafId = null;

    // ----------------------------------------
    // Constructor
    // ----------------------------------------

    /**
     * @param {Object} editor - Editor instance
     * @param {Object} options - Configuration options
     * @param {boolean} options.enabled - Whether feature is enabled (default: true)
     * @param {number} options.tabSize - Spaces per indent level (default: 2)
     */
    constructor(editor, options = {}) {
      this._editor = editor;
      this._enabled = options.enabled !== false;
      this._tabSize = options.tabSize || DEFAULT_TAB_SIZE;

      this._createDecorationLayer();
      this._bindEvents();
    }

    // ----------------------------------------
    // DOM Setup
    // ----------------------------------------

    _createDecorationLayer() {
      this._decorationLayer = document.createElement('div');
      this._decorationLayer.className = 'ec-decoration-layer ec-indent-guide-layer';
      this._editor.view.contentElement.appendChild(this._decorationLayer);
    }

    // ----------------------------------------
    // Event Binding
    // ----------------------------------------

    _bindEvents() {
      var self = this;

      this._boundHandleChange = function() {
        self._scheduleUpdate();
      };

      // Update guides on document changes
      this._editor.document.on('change', this._boundHandleChange);

      // Initial render
      this._updateGuides();
    }

    // ----------------------------------------
    // Update Logic
    // ----------------------------------------

    _scheduleUpdate() {
      var self = this;

      if (!this._enabled) return;

      // Debounce with requestAnimationFrame
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
      }
      this._rafId = requestAnimationFrame(function() {
        self._updateGuides();
        self._rafId = null;
      });
    }

    _updateGuides() {
      this._clearDecorations();

      if (!this._enabled) return;

      var doc = this._editor.document;
      var view = this._editor.view;
      var lineCount = doc.getLineCount();
      var padding = 10; // Matches EditorView padding

      // Track which indent guides to render per line
      for (var lineIndex = 0; lineIndex < lineCount; lineIndex++) {
        var lineText = doc.getLine(lineIndex);
        var indentLevel = this._getIndentLevel(lineText);

        // Render a guide for each indent level on this line
        for (var level = 1; level <= indentLevel; level++) {
          var column = (level - 1) * this._tabSize;
          var colorClass = 'ec-indent-guide-' + (((level - 1) % COLOR_COUNT) + 1);

          var guide = document.createElement('div');
          guide.className = 'ec-indent-guide ' + colorClass;
          guide.style.left = (column * view.charWidth + padding) + 'px';
          guide.style.top = (lineIndex * view.lineHeight + padding) + 'px';
          guide.style.height = view.lineHeight + 'px';

          this._decorationLayer.appendChild(guide);
          this._decorations.push(guide);
        }
      }
    }

    /**
     * Calculate indent level for a line
     * @param {string} lineText - Text content of the line
     * @returns {number} Number of indent levels
     */
    _getIndentLevel(lineText) {
      if (!lineText) return 0;

      var spaces = 0;
      for (var i = 0; i < lineText.length; i++) {
        var char = lineText[i];
        if (char === ' ') {
          spaces++;
        } else if (char === '\t') {
          spaces += this._tabSize;
        } else {
          break;
        }
      }

      return Math.floor(spaces / this._tabSize);
    }

    // ----------------------------------------
    // Decoration Management
    // ----------------------------------------

    _clearDecorations() {
      for (var i = 0; i < this._decorations.length; i++) {
        this._decorations[i].remove();
      }
      this._decorations = [];
    }

    // ----------------------------------------
    // Public API
    // ----------------------------------------

    /**
     * Enable indent guides
     */
    enable() {
      this._enabled = true;
      this._updateGuides();
    }

    /**
     * Disable indent guides
     */
    disable() {
      this._enabled = false;
      this._clearDecorations();
    }

    /**
     * Check if indent guides are enabled
     * @returns {boolean}
     */
    isEnabled() {
      return this._enabled;
    }

    /**
     * Set tab size and re-render
     * @param {number} size - Spaces per indent level
     */
    setTabSize(size) {
      this._tabSize = size;
      this._updateGuides();
    }

    /**
     * Get current tab size
     * @returns {number}
     */
    getTabSize() {
      return this._tabSize;
    }

    // ----------------------------------------
    // Lifecycle
    // ----------------------------------------

    /**
     * Clean up resources
     */
    dispose() {
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
      }

      this._clearDecorations();

      if (this._boundHandleChange) {
        this._editor.document.off('change', this._boundHandleChange);
      }

      if (this._decorationLayer) {
        this._decorationLayer.remove();
      }
      this._editor = null;
    }
  }

  // ============================================
  // Export to namespace
  // ============================================

  CodeEditor.Features = CodeEditor.Features || {};
  CodeEditor.Features.IndentGuide = IndentGuideFeature;

})(window.CodeEditor = window.CodeEditor || {});
