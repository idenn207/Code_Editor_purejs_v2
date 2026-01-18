/**
 * @fileoverview Search widget UI for find and replace
 */

(function(CodeEditor) {
  'use strict';

  // ============================================
  // Constants
  // ============================================

  var DEBOUNCE_DELAY = 150;

  // ============================================
  // SearchWidget Class
  // ============================================

  class SearchWidget {
    // ----------------------------------------
    // Instance Properties
    // ----------------------------------------

    _editor = null;
    _container = null;
    _visible = false;
    _mode = 'find';

    // DOM Elements
    _findInput = null;
    _replaceInput = null;
    _replaceRow = null;
    _matchCount = null;
    _prevButton = null;
    _nextButton = null;
    _replaceButton = null;
    _replaceAllButton = null;
    _closeButton = null;
    _caseSensitiveToggle = null;
    _wholeWordToggle = null;
    _regexToggle = null;

    // State
    _options = {
      caseSensitive: false,
      wholeWord: false,
      regex: false,
    };

    // Callbacks
    _onSearch = null;
    _onFindNext = null;
    _onFindPrevious = null;
    _onReplace = null;
    _onReplaceAll = null;
    _onClose = null;

    // Debounce timer
    _debounceTimer = null;

    // ResizeObserver
    _resizeObserver = null;

    // ----------------------------------------
    // Constructor
    // ----------------------------------------

    /**
     * @param {Object} editor - Editor instance
     * @param {Object} callbacks - Event callbacks
     */
    constructor(editor, callbacks) {
      if (!callbacks) callbacks = {};

      this._editor = editor;
      this._onSearch = callbacks.onSearch || function() {};
      this._onFindNext = callbacks.onFindNext || function() {};
      this._onFindPrevious = callbacks.onFindPrevious || function() {};
      this._onReplace = callbacks.onReplace || function() {};
      this._onReplaceAll = callbacks.onReplaceAll || function() {};
      this._onClose = callbacks.onClose || function() {};

      this._createDOM();
      this._bindEvents();
      this._setupResizeObserver();
    }

    // ----------------------------------------
    // DOM Creation
    // ----------------------------------------

    _createDOM() {
      this._container = document.createElement('div');
      this._container.className = 'ec-search-widget';
      this._container.style.display = 'none';

      this._container.innerHTML =
        '<div class="ec-search-row">' +
          '<div class="ec-search-input-wrapper">' +
            '<input type="text" class="ec-search-input" placeholder="Find" spellcheck="false" />' +
            '<div class="ec-search-options">' +
              '<button class="ec-search-toggle" data-option="caseSensitive" title="Match Case">Aa</button>' +
              '<button class="ec-search-toggle" data-option="wholeWord" title="Match Whole Word">\\b</button>' +
              '<button class="ec-search-toggle" data-option="regex" title="Use Regular Expression">.*</button>' +
            '</div>' +
          '</div>' +
          '<span class="ec-match-count">No results</span>' +
          '<button class="ec-search-btn ec-search-prev" title="Previous Match (Shift+Enter)">&#x2191;</button>' +
          '<button class="ec-search-btn ec-search-next" title="Next Match (Enter)">&#x2193;</button>' +
          '<button class="ec-search-btn ec-search-close" title="Close (Escape)">&times;</button>' +
        '</div>' +
        '<div class="ec-replace-row">' +
          '<div class="ec-search-input-wrapper">' +
            '<input type="text" class="ec-replace-input" placeholder="Replace" spellcheck="false" />' +
          '</div>' +
          '<button class="ec-search-btn ec-replace-btn" title="Replace">Replace</button>' +
          '<button class="ec-search-btn ec-replace-all-btn" title="Replace All">All</button>' +
        '</div>';

      // Cache DOM references
      this._findInput = this._container.querySelector('.ec-search-input');
      this._replaceInput = this._container.querySelector('.ec-replace-input');
      this._replaceRow = this._container.querySelector('.ec-replace-row');
      this._matchCount = this._container.querySelector('.ec-match-count');
      this._prevButton = this._container.querySelector('.ec-search-prev');
      this._nextButton = this._container.querySelector('.ec-search-next');
      this._closeButton = this._container.querySelector('.ec-search-close');
      this._replaceButton = this._container.querySelector('.ec-replace-btn');
      this._replaceAllButton = this._container.querySelector('.ec-replace-all-btn');
      this._caseSensitiveToggle = this._container.querySelector('[data-option="caseSensitive"]');
      this._wholeWordToggle = this._container.querySelector('[data-option="wholeWord"]');
      this._regexToggle = this._container.querySelector('[data-option="regex"]');

      this._editor.view.container.appendChild(this._container);
    }

    // ----------------------------------------
    // Event Binding
    // ----------------------------------------

    _bindEvents() {
      var self = this;

      this._findInput.addEventListener('input', function() { self._handleFindInput(); });
      this._findInput.addEventListener('keydown', function(e) {
        e.stopPropagation();
        self._handleFindKeyDown(e);
      });

      this._replaceInput.addEventListener('keydown', function(e) {
        e.stopPropagation();
        self._handleReplaceKeyDown(e);
      });

      this._prevButton.addEventListener('click', function() { self._onFindPrevious(); });
      this._nextButton.addEventListener('click', function() { self._onFindNext(); });
      this._closeButton.addEventListener('click', function() { self.hide(); });

      this._replaceButton.addEventListener('click', function() { self._onReplace(self._replaceInput.value); });
      this._replaceAllButton.addEventListener('click', function() { self._onReplaceAll(self._replaceInput.value); });

      this._caseSensitiveToggle.addEventListener('click', function() { self._toggleOption('caseSensitive'); });
      this._wholeWordToggle.addEventListener('click', function() { self._toggleOption('wholeWord'); });
      this._regexToggle.addEventListener('click', function() { self._toggleOption('regex'); });

      this._container.addEventListener('keydown', function(e) {
        e.stopPropagation();
      });
    }

    // ----------------------------------------
    // Event Handlers
    // ----------------------------------------

    _handleFindInput() {
      var self = this;
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(function() {
        self._onSearch(self._findInput.value, self._options);
      }, DEBOUNCE_DELAY);
    }

    _handleFindKeyDown(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(this._debounceTimer);

        if (e.shiftKey) {
          this._onFindPrevious();
        } else {
          this._onFindNext();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.hide();
      } else if ((e.key === 'f' || e.key === 'h') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.key === 'h') {
          this.show('replace');
          this._replaceInput.focus();
          this._replaceInput.select();
        } else {
          this._findInput.select();
        }
      }
    }

    _handleReplaceKeyDown(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          this._onReplaceAll(this._replaceInput.value);
        } else {
          this._onReplace(this._replaceInput.value);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.hide();
      } else if ((e.key === 'f' || e.key === 'h') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.key === 'f') {
          this._findInput.focus();
          this._findInput.select();
        } else {
          this._replaceInput.select();
        }
      }
    }

    _setupResizeObserver() {
      var self = this;
      this._resizeObserver = new ResizeObserver(function(entries) {
        for (var entry of entries) {
          var width = entry.contentRect.width;
          self._handleResize(width);
        }
      });
      this._resizeObserver.observe(this._container);
    }

    _handleResize(width) {
      // Only hide match count if widget is visible and width is actually small
      // Don't hide when width is 0 (container not rendered yet)
      if (width > 0 && width < 350) {
        this._matchCount.classList.add('ec-match-count-hidden');
      } else {
        this._matchCount.classList.remove('ec-match-count-hidden');
      }
    }

    _toggleOption(option) {
      this._options[option] = !this._options[option];

      var button = this._container.querySelector('[data-option="' + option + '"]');
      button.classList.toggle('active', this._options[option]);

      this._onSearch(this._findInput.value, this._options);
    }

    // ----------------------------------------
    // Public Methods
    // ----------------------------------------

    /**
     * Show the search widget
     * @param {string} mode - 'find' or 'replace'
     */
    show(mode) {
      if (mode === undefined) mode = 'find';

      this._mode = mode;
      this._visible = true;
      this._container.style.display = 'block';

      this._replaceRow.style.display = mode === 'replace' ? 'flex' : 'none';

      // Trigger resize check after display
      var self = this;
      requestAnimationFrame(function() {
        self._handleResize(self._container.offsetWidth);
      });

      var selectedText = this._editor.getSelectedText();
      if (selectedText && selectedText.indexOf('\n') === -1) {
        this._findInput.value = selectedText;
      }

      this._findInput.focus();
      this._findInput.select();

      if (this._findInput.value) {
        this._onSearch(this._findInput.value, this._options);
      }
    }

    /**
     * Hide the search widget
     */
    hide() {
      this._visible = false;
      this._container.style.display = 'none';
      clearTimeout(this._debounceTimer);

      this._onClose();
      this._editor.focus();
    }

    /**
     * Check if widget is visible
     * @returns {boolean}
     */
    isVisible() {
      return this._visible;
    }

    /**
     * Get current mode
     * @returns {string} 'find' or 'replace'
     */
    getMode() {
      return this._mode;
    }

    /**
     * Update match count display
     * @param {number} current - Current match index (1-based)
     * @param {number} total - Total number of matches
     */
    updateMatchCount(current, total) {
      if (total === 0) {
        this._matchCount.textContent = 'No results';
        this._matchCount.classList.add('ec-no-results');
      } else {
        this._matchCount.textContent = current + ' of ' + total;
        this._matchCount.classList.remove('ec-no-results');
      }
    }

    /**
     * Set the search query
     * @param {string} query - Search query
     */
    setQuery(query) {
      this._findInput.value = query;
    }

    /**
     * Get the current query
     * @returns {string}
     */
    getQuery() {
      return this._findInput.value;
    }

    /**
     * Get current options
     * @returns {Object}
     */
    getOptions() {
      return Object.assign({}, this._options);
    }

    /**
     * Focus the find input
     */
    focus() {
      this._findInput.focus();
    }

    // ----------------------------------------
    // Lifecycle
    // ----------------------------------------

    /**
     * Clean up resources
     */
    dispose() {
      clearTimeout(this._debounceTimer);
      if (this._resizeObserver) {
        this._resizeObserver.disconnect();
        this._resizeObserver = null;
      }
      if (this._container) this._container.remove();
      this._editor = null;
    }
  }

  // ============================================
  // Export to Namespace
  // ============================================

  CodeEditor.SearchWidget = SearchWidget;

})(window.CodeEditor = window.CodeEditor || {});
