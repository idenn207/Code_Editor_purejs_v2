/**
 * @fileoverview Search feature - Find and Replace functionality
 * @module features/search/SearchFeature
 */

(function(CodeEditor) {
  'use strict';

  // Get dependencies
  var SearchService = CodeEditor.SearchService;
  var SearchWidget = CodeEditor.SearchWidget;
  var SearchDecorations = CodeEditor.SearchDecorations;

  // ============================================
  // SearchFeature Class
  // ============================================

  class SearchFeature {
    // ----------------------------------------
    // Instance Properties
    // ----------------------------------------

    _editor = null;
    _enabled = true;
    _service = null;
    _widget = null;
    _decorations = null;
    _isReplacing = false;

    // Bound event handlers
    _boundHandleKeyDown = null;
    _boundHandleDocumentChange = null;

    // ----------------------------------------
    // Constructor
    // ----------------------------------------

    /**
     * @param {Object} editor - Editor instance
     * @param {Object} options - Configuration options
     * @param {boolean} options.enabled - Whether feature is enabled (default: true)
     */
    constructor(editor, options = {}) {
      var self = this;

      this._editor = editor;
      this._enabled = options.enabled !== false;

      // Initialize components
      this._service = new SearchService(editor.document);
      this._decorations = new SearchDecorations(editor);
      this._widget = new SearchWidget(editor, {
        onSearch: function(query, opts) {
          self._handleSearch(query, opts);
        },
        onFindNext: function() {
          self.findNext();
        },
        onFindPrevious: function() {
          self.findPrevious();
        },
        onReplace: function(replacement) {
          self._handleReplace(replacement);
        },
        onReplaceAll: function(replacement) {
          self._handleReplaceAll(replacement);
        },
        onClose: function() {
          self._handleClose();
        },
      });

      this._bindEvents();
    }

    // ----------------------------------------
    // Event Binding
    // ----------------------------------------

    _bindEvents() {
      var self = this;

      // Keyboard shortcuts (capture phase to intercept before editor)
      this._boundHandleKeyDown = function(e) {
        self._handleKeyDown(e);
      };
      this._editor.view.contentElement.addEventListener('keydown', this._boundHandleKeyDown, true);

      // Document changes - update match positions
      this._boundHandleDocumentChange = function() {
        self._handleDocumentChange();
      };
      this._editor.document.on('change', this._boundHandleDocumentChange);
    }

    // ----------------------------------------
    // Keyboard Handling
    // ----------------------------------------

    _handleKeyDown(e) {
      if (!this._enabled) return;

      var isMac = navigator.platform.includes('Mac');
      var modKey = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + F: Open Find
      if (modKey && e.key === 'f') {
        e.preventDefault();
        e.stopPropagation();
        this.openFind();
        return;
      }

      // Ctrl/Cmd + H: Open Replace
      if (modKey && e.key === 'h') {
        e.preventDefault();
        e.stopPropagation();
        this.openReplace();
        return;
      }

      // F3 / Shift+F3: Find Next/Previous (when widget is open)
      if (e.key === 'F3' && this._widget.isVisible()) {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) {
          this.findPrevious();
        } else {
          this.findNext();
        }
        return;
      }

      // Escape: Close widget
      if (e.key === 'Escape' && this._widget.isVisible()) {
        e.preventDefault();
        e.stopPropagation();
        this.close();
        return;
      }
    }

    // ----------------------------------------
    // Search Handlers
    // ----------------------------------------

    _handleSearch(query, options) {
      var count = this._service.search(query, options);

      // Find match nearest to cursor
      if (count > 0) {
        var sel = this._editor.getSelection();
        this._service.findNearestMatch(sel.end);
      }

      this._updateUI();
    }

    _handleDocumentChange() {
      // Skip if we're in the middle of a replace operation
      if (this._isReplacing) {
        return;
      }

      // Re-run search if widget is visible
      if (this._widget.isVisible() && this._widget.getQuery()) {
        var query = this._widget.getQuery();
        var options = this._widget.getOptions();
        this._service.search(query, options);
        this._updateUI();
      }
    }

    _handleReplace(replacement) {
      var result = this._service.replace(replacement);
      if (result) {
        this._updateUI();
        // Move to next match
        if (this._service.getMatchCount() > 0) {
          this._navigateToCurrentMatch();
        }
      }
    }

    _handleReplaceAll(replacement) {
      // Temporarily disable document change handler during batch replace
      this._isReplacing = true;
      var count = this._service.replaceAll(replacement);
      this._isReplacing = false;

      // Update UI to show 0 matches remaining
      this._updateUI();
    }

    _handleClose() {
      this._service.clear();
      this._decorations.clear();
    }

    // ----------------------------------------
    // UI Updates
    // ----------------------------------------

    _updateUI() {
      var matches = this._service.getMatches();
      var currentIndex = this._service.getCurrentIndex();
      var total = this._service.getMatchCount();

      // Update decorations
      this._decorations.render(matches, currentIndex - 1);

      // Update widget
      this._widget.updateMatchCount(currentIndex, total);

      // Scroll to current match
      var currentMatch = this._service.getCurrentMatch();
      if (currentMatch) {
        this._decorations.scrollToMatch(currentMatch);
      }
    }

    _navigateToCurrentMatch() {
      var match = this._service.getCurrentMatch();
      if (match) {
        // Move cursor to start of match
        this._editor.setSelection(match.start, match.end);
        this._decorations.scrollToMatch(match);
      }
    }

    // ----------------------------------------
    // Public Methods
    // ----------------------------------------

    /**
     * Open find dialog
     */
    openFind() {
      this._widget.show('find');
    }

    /**
     * Open replace dialog
     */
    openReplace() {
      this._widget.show('replace');
    }

    /**
     * Find next match
     */
    findNext() {
      // If no matches yet, perform search first
      if (this._service.getMatchCount() === 0) {
        var query = this._widget.getQuery();
        if (query) {
          this._handleSearch(query, this._widget.getOptions());
        }
        return;
      }

      var match = this._service.findNext();
      if (match) {
        this._updateUI();
        this._navigateToCurrentMatch();
      }
    }

    /**
     * Find previous match
     */
    findPrevious() {
      // If no matches yet, perform search first
      if (this._service.getMatchCount() === 0) {
        var query = this._widget.getQuery();
        if (query) {
          this._handleSearch(query, this._widget.getOptions());
        }
        return;
      }

      var match = this._service.findPrevious();
      if (match) {
        this._updateUI();
        this._navigateToCurrentMatch();
      }
    }

    /**
     * Close search widget
     */
    close() {
      this._widget.hide();
    }

    /**
     * Check if search widget is visible
     * @returns {boolean}
     */
    isVisible() {
      return this._widget.isVisible();
    }

    /**
     * Enable the search feature
     */
    enable() {
      this._enabled = true;
    }

    /**
     * Disable the search feature
     */
    disable() {
      this._enabled = false;
      this.close();
    }

    /**
     * Check if feature is enabled
     * @returns {boolean}
     */
    isEnabled() {
      return this._enabled;
    }

    // ----------------------------------------
    // Lifecycle
    // ----------------------------------------

    /**
     * Clean up resources
     */
    dispose() {
      if (this._boundHandleKeyDown) {
        this._editor.view.contentElement.removeEventListener('keydown', this._boundHandleKeyDown, true);
      }

      if (this._boundHandleDocumentChange) {
        this._editor.document.off('change', this._boundHandleDocumentChange);
      }

      if (this._widget) {
        this._widget.dispose();
      }
      if (this._decorations) {
        this._decorations.dispose();
      }
      if (this._service) {
        this._service.clear();
      }

      this._editor = null;
    }
  }

  // ============================================
  // Export to namespace
  // ============================================

  CodeEditor.Features = CodeEditor.Features || {};
  CodeEditor.Features.Search = SearchFeature;

})(window.CodeEditor = window.CodeEditor || {});
