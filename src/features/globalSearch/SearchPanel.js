/**
 * SearchPanel - Sidebar search UI component
 *
 * Provides UI for searching and replacing across all files in the workspace.
 * Displays results grouped by file with match previews.
 */
(function(CodeEditor) {
  'use strict';

  // ============================================
  // Constants
  // ============================================

  var DEBOUNCE_DELAY = 300;

  var ICONS = {
    search: '<svg viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M15.25 0a8.25 8.25 0 0 0-6.18 13.72L1 22.88l1.12 1.12 8.05-9.12A8.251 8.251 0 1 0 15.25 0zm0 15a6.75 6.75 0 1 1 0-13.5 6.75 6.75 0 0 1 0 13.5z" transform="scale(0.67)"/></svg>',
    replace: '<svg viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M11.6 2.678a1.75 1.75 0 0 1 0 2.475l-5.5 5.5a1.75 1.75 0 0 1-.954.476l-2.131.355.355-2.131a1.75 1.75 0 0 1 .476-.954l5.5-5.5a1.75 1.75 0 0 1 2.475 0l.279.279zm-1.06.354l-.28-.279a.25.25 0 0 0-.353 0l-5.5 5.5a.25.25 0 0 0-.068.136l-.194 1.166 1.166-.194a.25.25 0 0 0 .136-.068l5.5-5.5a.25.25 0 0 0 0-.353l-.407-.408zM14 10.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3.5a.5.5 0 0 1 0 1H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3.5a.5.5 0 0 1 1 0z"/></svg>',
    caseSensitive: 'Aa',
    wholeWord: 'Ab',
    regex: '.*',
    clear: '<svg viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z"/></svg>',
    expand: '<svg viewBox="0 0 16 16" width="12" height="12"><path fill="currentColor" d="M6 4l4 4-4 4"/></svg>',
    collapse: '<svg viewBox="0 0 16 16" width="12" height="12"><path fill="currentColor" d="M4 6l4 4 4-4"/></svg>',
    file: '<svg viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M13.71 4.29l-3-3L10 1H4L3 2v12l1 1h9l1-1V5l-.29-.71zM13 14H4V2h5v4h4v8zm-3-9V2l3 3h-3z"/></svg>',
    replaceAll: '<svg viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M11.6 2.678a1.75 1.75 0 0 1 0 2.475l-5.5 5.5a1.75 1.75 0 0 1-.954.476l-2.131.355.355-2.131a1.75 1.75 0 0 1 .476-.954l5.5-5.5a1.75 1.75 0 0 1 2.475 0l.279.279z"/></svg>',
    refresh: '<svg viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M13.451 5.609l-.579-.939-1.068.812-.076.094c-.335.415-.927 1.341-.927 2.424 0 2.206-1.794 4-4 4a4.001 4.001 0 0 1-3.16-6.448l1.468 1.468h.036V3.996L1.146 4v.036l1.348 1.348A5.002 5.002 0 0 0 6.8 13c3.309 0 6-2.691 6-6 0-1.373-.503-2.603-1.349-3.391z"/></svg>'
  };

  // ============================================
  // SearchPanel Class
  // ============================================

  class SearchPanel {
    // ============================================
    // Instance Members
    // ============================================

    _container = null;
    _ide = null;
    _searchService = null;
    _isVisible = false;
    _listeners = [];

    // DOM Elements
    _element = null;
    _searchInput = null;
    _replaceInput = null;
    _replaceRow = null;
    _resultsContainer = null;
    _statusElement = null;
    _toggleReplaceBtn = null;

    // State
    _showReplace = false;
    _options = {
      caseSensitive: false,
      wholeWord: false,
      regex: false
    };
    _includePattern = '';
    _excludePattern = '';
    _expandedFiles = new Set();
    _searchDebounceTimer = null;
    _decorations = null;
    _currentHighlightPath = null;

    // ============================================
    // Constructor
    // ============================================

    /**
     * Create a new SearchPanel
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Panel options
     */
    constructor(container, options) {
      options = options || {};
      this._container = container;
      this._ide = options.ide || null;
      this._searchService = options.searchService || null;

      this._createDOM();
      this._bindEvents();
    }

    // ============================================
    // Public Methods
    // ============================================

    /**
     * Show the panel
     */
    show() {
      this._element.style.display = 'flex';
      this._isVisible = true;
    }

    /**
     * Hide the panel
     */
    hide() {
      this._element.style.display = 'none';
      this._isVisible = false;
      this._clearDecorations();
    }

    /**
     * Focus the search input
     */
    focus() {
      if (this._searchInput) {
        this._searchInput.focus();
        this._searchInput.select();
      }
    }

    /**
     * Check if panel is visible
     * @returns {boolean}
     */
    isVisible() {
      return this._isVisible;
    }

    /**
     * Set the search query
     * @param {string} query - Search query
     */
    setQuery(query) {
      if (this._searchInput) {
        this._searchInput.value = query;
      }
    }

    /**
     * Get the current search query
     * @returns {string}
     */
    getQuery() {
      return this._searchInput ? this._searchInput.value : '';
    }

    /**
     * Clear search results
     */
    clear() {
      if (this._searchInput) this._searchInput.value = '';
      if (this._replaceInput) this._replaceInput.value = '';
      if (this._searchService) this._searchService.clear();
      this._clearDecorations();
      this._renderResults();
      this._updateStatus('');
    }

    /**
     * Refresh search results
     */
    refresh() {
      this._performSearch();
    }

    /**
     * Dispose the panel
     */
    dispose() {
      // Clear decorations
      if (this._decorations) {
        this._decorations.dispose();
        this._decorations = null;
      }

      // Remove event listeners
      for (var i = 0; i < this._listeners.length; i++) {
        this._listeners[i]();
      }
      this._listeners = [];

      // Remove DOM
      if (this._element && this._element.parentNode) {
        this._element.parentNode.removeChild(this._element);
      }
    }

    // ============================================
    // Private Methods - DOM Creation
    // ============================================

    /**
     * Create DOM structure
     */
    _createDOM() {
      var self = this;

      // Main container
      this._element = document.createElement('div');
      this._element.className = 'ide-search-panel';
      this._element.style.display = 'none';

      // Header section with inputs
      var header = document.createElement('div');
      header.className = 'ide-search-header';
      this._element.appendChild(header);

      // Search row
      var searchRow = this._createSearchRow();
      header.appendChild(searchRow);

      // Replace row (initially hidden)
      this._replaceRow = this._createReplaceRow();
      header.appendChild(this._replaceRow);

      // Options row
      var optionsRow = this._createOptionsRow();
      header.appendChild(optionsRow);

      // Filters section (collapsible)
      var filtersSection = this._createFiltersSection();
      header.appendChild(filtersSection);

      // Results container
      this._resultsContainer = document.createElement('div');
      this._resultsContainer.className = 'ide-search-results';
      this._element.appendChild(this._resultsContainer);

      // Status bar
      this._statusElement = document.createElement('div');
      this._statusElement.className = 'ide-search-status';
      this._element.appendChild(this._statusElement);

      // Append to container
      this._container.appendChild(this._element);
    }

    /**
     * Create search input row
     * @returns {HTMLElement}
     */
    _createSearchRow() {
      var self = this;
      var row = document.createElement('div');
      row.className = 'ide-search-input-row';

      // Toggle replace button
      this._toggleReplaceBtn = document.createElement('button');
      this._toggleReplaceBtn.className = 'ide-search-toggle-btn';
      this._toggleReplaceBtn.innerHTML = ICONS.expand;
      this._toggleReplaceBtn.title = 'Toggle Replace';
      row.appendChild(this._toggleReplaceBtn);

      // Search input
      this._searchInput = document.createElement('input');
      this._searchInput.type = 'text';
      this._searchInput.className = 'ide-search-input';
      this._searchInput.placeholder = 'Search';
      row.appendChild(this._searchInput);

      // Clear button
      var clearBtn = document.createElement('button');
      clearBtn.className = 'ide-search-btn';
      clearBtn.innerHTML = ICONS.clear;
      clearBtn.title = 'Clear';
      clearBtn.onclick = function() {
        self.clear();
      };
      row.appendChild(clearBtn);

      return row;
    }

    /**
     * Create replace input row
     * @returns {HTMLElement}
     */
    _createReplaceRow() {
      var self = this;
      var row = document.createElement('div');
      row.className = 'ide-search-input-row ide-search-replace-row';
      row.style.display = 'none';

      // Spacer to align with search input
      var spacer = document.createElement('div');
      spacer.className = 'ide-search-toggle-spacer';
      row.appendChild(spacer);

      // Replace input
      this._replaceInput = document.createElement('input');
      this._replaceInput.type = 'text';
      this._replaceInput.className = 'ide-search-input';
      this._replaceInput.placeholder = 'Replace';
      row.appendChild(this._replaceInput);

      // Replace all button
      var replaceAllBtn = document.createElement('button');
      replaceAllBtn.className = 'ide-search-btn';
      replaceAllBtn.innerHTML = ICONS.replaceAll;
      replaceAllBtn.title = 'Replace All';
      replaceAllBtn.onclick = function() {
        self._handleReplaceAll();
      };
      row.appendChild(replaceAllBtn);

      return row;
    }

    /**
     * Create options row
     * @returns {HTMLElement}
     */
    _createOptionsRow() {
      var self = this;
      var row = document.createElement('div');
      row.className = 'ide-search-options';

      // Case sensitive button
      var caseBtn = this._createOptionButton('caseSensitive', ICONS.caseSensitive, 'Match Case');
      row.appendChild(caseBtn);

      // Whole word button
      var wordBtn = this._createOptionButton('wholeWord', ICONS.wholeWord, 'Match Whole Word');
      row.appendChild(wordBtn);

      // Regex button
      var regexBtn = this._createOptionButton('regex', ICONS.regex, 'Use Regular Expression');
      row.appendChild(regexBtn);

      // Spacer
      var spacer = document.createElement('div');
      spacer.style.flex = '1';
      row.appendChild(spacer);

      // Refresh button
      var refreshBtn = document.createElement('button');
      refreshBtn.className = 'ide-search-btn';
      refreshBtn.innerHTML = ICONS.refresh;
      refreshBtn.title = 'Refresh';
      refreshBtn.onclick = function() {
        self.refresh();
      };
      row.appendChild(refreshBtn);

      return row;
    }

    /**
     * Create an option toggle button
     * @param {string} option - Option name
     * @param {string} icon - Icon HTML or text
     * @param {string} title - Button title
     * @returns {HTMLElement}
     */
    _createOptionButton(option, icon, title) {
      var self = this;
      var btn = document.createElement('button');
      btn.className = 'ide-search-option';
      btn.innerHTML = icon;
      btn.title = title;
      btn.dataset.option = option;

      btn.onclick = function() {
        self._options[option] = !self._options[option];
        btn.classList.toggle('active', self._options[option]);
        self._performSearch();
      };

      return btn;
    }

    /**
     * Create filters section
     * @returns {HTMLElement}
     */
    _createFiltersSection() {
      var self = this;
      var section = document.createElement('div');
      section.className = 'ide-search-filters';

      // Files to include
      var includeRow = document.createElement('div');
      includeRow.className = 'ide-search-filter-row';

      var includeLabel = document.createElement('label');
      includeLabel.className = 'ide-search-filter-label';
      includeLabel.textContent = 'files to include';
      includeRow.appendChild(includeLabel);

      var includeInput = document.createElement('input');
      includeInput.type = 'text';
      includeInput.className = 'ide-search-filter-input';
      includeInput.placeholder = 'e.g. *.js, src/**';
      includeInput.oninput = function() {
        self._includePattern = includeInput.value;
        self._debouncedSearch();
      };
      includeRow.appendChild(includeInput);
      section.appendChild(includeRow);

      // Files to exclude
      var excludeRow = document.createElement('div');
      excludeRow.className = 'ide-search-filter-row';

      var excludeLabel = document.createElement('label');
      excludeLabel.className = 'ide-search-filter-label';
      excludeLabel.textContent = 'files to exclude';
      excludeRow.appendChild(excludeLabel);

      var excludeInput = document.createElement('input');
      excludeInput.type = 'text';
      excludeInput.className = 'ide-search-filter-input';
      excludeInput.placeholder = 'e.g. node_modules, *.min.js';
      excludeInput.oninput = function() {
        self._excludePattern = excludeInput.value;
        self._debouncedSearch();
      };
      excludeRow.appendChild(excludeInput);
      section.appendChild(excludeRow);

      return section;
    }

    // ============================================
    // Private Methods - Event Binding
    // ============================================

    /**
     * Bind event handlers
     */
    _bindEvents() {
      var self = this;

      // Search input events
      this._searchInput.addEventListener('input', function() {
        self._debouncedSearch();
      });

      this._searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          self._performSearch();
        } else if (e.key === 'Escape') {
          self.clear();
        }
      });

      // Replace input events
      this._replaceInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          self._handleReplaceAll();
        }
      });

      // Toggle replace
      this._toggleReplaceBtn.addEventListener('click', function() {
        self._showReplace = !self._showReplace;
        self._replaceRow.style.display = self._showReplace ? 'flex' : 'none';
        self._toggleReplaceBtn.innerHTML = self._showReplace ? ICONS.collapse : ICONS.expand;
      });

      // Search service events
      if (this._searchService) {
        var unsubProgress = this._searchService.on('progress', function(data) {
          self._updateStatus('Searching... ' + data.filesSearched + ' files, ' + data.matchCount + ' results');
        });
        this._listeners.push(unsubProgress);

        var unsubComplete = this._searchService.on('searchComplete', function(data) {
          self._renderResults();
          if (data.totalMatches === 0) {
            self._updateStatus('No results found');
            self._clearDecorations();
          } else {
            self._updateStatus(data.totalMatches + ' results in ' + data.filesWithMatches + ' files');
            // Highlight matches in current open file
            self._highlightCurrentFile();
          }
        });
        this._listeners.push(unsubComplete);

        var unsubError = this._searchService.on('error', function(data) {
          self._updateStatus('Error: ' + data.message);
        });
        this._listeners.push(unsubError);
      }
    }

    // ============================================
    // Private Methods - Search
    // ============================================

    /**
     * Debounced search trigger
     */
    _debouncedSearch() {
      var self = this;
      if (this._searchDebounceTimer) {
        clearTimeout(this._searchDebounceTimer);
      }
      this._searchDebounceTimer = setTimeout(function() {
        self._performSearch();
      }, DEBOUNCE_DELAY);
    }

    /**
     * Perform the search
     */
    _performSearch() {
      if (!this._searchService) return;

      var query = this._searchInput.value;
      if (!query) {
        this._searchService.clear();
        this._renderResults();
        this._updateStatus('');
        return;
      }

      var options = {
        caseSensitive: this._options.caseSensitive,
        wholeWord: this._options.wholeWord,
        regex: this._options.regex,
        includePattern: this._includePattern,
        excludePattern: this._excludePattern
      };

      this._searchService.search(query, options);
    }

    // ============================================
    // Private Methods - Rendering
    // ============================================

    /**
     * Render search results
     */
    _renderResults() {
      var self = this;
      this._resultsContainer.innerHTML = '';

      if (!this._searchService) return;

      var results = this._searchService.getResults();
      if (results.size === 0) {
        this._renderEmptyState();
        return;
      }

      results.forEach(function(matches, path) {
        var fileGroup = self._renderFileGroup(path, matches);
        self._resultsContainer.appendChild(fileGroup);
      });
    }

    /**
     * Render empty state
     */
    _renderEmptyState() {
      var empty = document.createElement('div');
      empty.className = 'ide-search-empty';

      var icon = document.createElement('div');
      icon.className = 'ide-search-empty-icon';
      icon.innerHTML = ICONS.search;
      empty.appendChild(icon);

      var text = document.createElement('div');
      text.textContent = this._searchInput.value
        ? 'No results found'
        : 'Enter a search term';
      empty.appendChild(text);

      this._resultsContainer.appendChild(empty);
    }

    /**
     * Render a file group with matches
     * @param {string} path - File path
     * @param {Array} matches - Matches array
     * @returns {HTMLElement}
     */
    _renderFileGroup(path, matches) {
      var self = this;
      var group = document.createElement('div');
      group.className = 'ide-search-file-group';

      // File header
      var header = document.createElement('div');
      header.className = 'ide-search-file-header';

      // Expand/collapse toggle
      var toggle = document.createElement('span');
      toggle.className = 'ide-search-file-toggle';
      var isExpanded = this._expandedFiles.has(path);
      toggle.innerHTML = isExpanded ? ICONS.collapse : ICONS.expand;
      header.appendChild(toggle);

      // File icon
      var fileIcon = document.createElement('span');
      fileIcon.className = 'ide-search-file-icon';
      fileIcon.innerHTML = ICONS.file;
      header.appendChild(fileIcon);

      // File name
      var fileName = document.createElement('span');
      fileName.className = 'ide-search-file-name';
      fileName.textContent = this._getFileName(path);
      header.appendChild(fileName);

      // File path
      var filePath = document.createElement('span');
      filePath.className = 'ide-search-file-path';
      filePath.textContent = this._getDirectoryPath(path);
      header.appendChild(filePath);

      // Match count
      var count = document.createElement('span');
      count.className = 'ide-search-file-count';
      count.textContent = matches.length;
      header.appendChild(count);

      // Replace in file button (if replace mode)
      if (this._showReplace) {
        var replaceBtn = document.createElement('button');
        replaceBtn.className = 'ide-search-btn ide-search-file-replace';
        replaceBtn.innerHTML = ICONS.replaceAll;
        replaceBtn.title = 'Replace All in File';
        replaceBtn.onclick = function(e) {
          e.stopPropagation();
          self._handleReplaceInFile(path);
        };
        header.appendChild(replaceBtn);
      }

      // Toggle on header click
      header.onclick = function() {
        if (self._expandedFiles.has(path)) {
          self._expandedFiles.delete(path);
          toggle.innerHTML = ICONS.expand;
          matchesContainer.style.display = 'none';
        } else {
          self._expandedFiles.add(path);
          toggle.innerHTML = ICONS.collapse;
          matchesContainer.style.display = 'block';
        }
      };

      group.appendChild(header);

      // Matches container
      var matchesContainer = document.createElement('div');
      matchesContainer.className = 'ide-search-matches';
      matchesContainer.style.display = isExpanded ? 'block' : 'none';

      for (var i = 0; i < matches.length; i++) {
        var matchEl = this._renderMatch(matches[i], path, i);
        matchesContainer.appendChild(matchEl);
      }

      group.appendChild(matchesContainer);

      // Auto-expand first few files
      if (this._expandedFiles.size < 3 && !this._expandedFiles.has(path)) {
        this._expandedFiles.add(path);
        toggle.innerHTML = ICONS.collapse;
        matchesContainer.style.display = 'block';
      }

      return group;
    }

    /**
     * Render a single match
     * @param {Object} match - Match object
     * @param {string} path - File path
     * @param {number} index - Match index
     * @returns {HTMLElement}
     */
    _renderMatch(match, path, index) {
      var self = this;
      var el = document.createElement('div');
      el.className = 'ide-search-match';

      // Line number
      var lineNum = document.createElement('span');
      lineNum.className = 'ide-search-match-line';
      lineNum.textContent = (match.line + 1) + ':';
      el.appendChild(lineNum);

      // Match text with highlighting
      var textEl = document.createElement('span');
      textEl.className = 'ide-search-match-text';
      textEl.innerHTML = this._highlightMatch(match);
      el.appendChild(textEl);

      // Replace single button (if replace mode)
      if (this._showReplace) {
        var replaceBtn = document.createElement('button');
        replaceBtn.className = 'ide-search-btn ide-search-match-replace';
        replaceBtn.innerHTML = ICONS.replace;
        replaceBtn.title = 'Replace';
        replaceBtn.onclick = function(e) {
          e.stopPropagation();
          self._handleReplaceMatch(path, index);
        };
        el.appendChild(replaceBtn);
      }

      // Click to navigate (pass index for highlight)
      el.onclick = function() {
        self._navigateToMatch(path, match, index);
      };

      return el;
    }

    /**
     * Highlight match in line text
     * @param {Object} match - Match object
     * @returns {string} HTML with highlight
     */
    _highlightMatch(match) {
      var lineText = match.lineText || '';
      var column = match.column || 0;
      var matchLength = match.text ? match.text.length : 0;

      // Escape HTML
      var escape = function(str) {
        return str.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
      };

      // Truncate if too long
      var maxLen = 100;
      var start = Math.max(0, column - 20);
      var end = Math.min(lineText.length, column + matchLength + 40);

      var prefix = start > 0 ? '...' : '';
      var suffix = end < lineText.length ? '...' : '';

      var before = escape(lineText.substring(start, column));
      var highlighted = escape(lineText.substring(column, column + matchLength));
      var after = escape(lineText.substring(column + matchLength, end));

      return prefix + before +
             '<span class="ide-search-match-highlight">' + highlighted + '</span>' +
             after + suffix;
    }

    /**
     * Update status text
     * @param {string} text - Status text
     */
    _updateStatus(text) {
      if (this._statusElement) {
        this._statusElement.textContent = text;
      }
    }

    // ============================================
    // Private Methods - Navigation
    // ============================================

    /**
     * Navigate to a match in the editor
     * @param {string} path - File path
     * @param {Object} match - Match object
     * @param {number} matchIndex - Index of the match in the file
     */
    _navigateToMatch(path, match, matchIndex) {
      if (!this._ide) return;

      var self = this;

      // Open the file
      this._ide.openFile(path).then(function() {
        // Get editor and navigate to line
        var editor = self._ide.getEditor();
        if (editor) {
          // Set cursor to match position
          editor.setCursorPosition(match.line, match.column);

          // Select the match text
          var startOffset = editor.document.positionToOffset(match.line, match.column);
          var endOffset = startOffset + match.text.length;
          editor.setSelection(startOffset, endOffset);

          // Highlight all matches in this file
          self._highlightMatchesInEditor(editor, path, matchIndex);

          // Focus editor
          self._ide.focusEditor();
        }
      });
    }

    /**
     * Highlight all matches in the editor for the current file
     * @param {Object} editor - Editor instance
     * @param {string} path - File path
     * @param {number} currentIndex - Current match index
     */
    _highlightMatchesInEditor(editor, path, currentIndex) {
      var SearchDecorations = CodeEditor.SearchDecorations;
      if (!SearchDecorations) return;

      // Clear previous decorations if different file or different editor
      if (this._currentHighlightPath !== path) {
        if (this._decorations) {
          this._decorations.dispose();
          this._decorations = null;
        }
      }

      // Get all matches for this file
      var fileMatches = this._searchService.getResults().get(path);
      if (!fileMatches || fileMatches.length === 0) return;

      // Create decorations for this editor
      if (!this._decorations) {
        this._decorations = new SearchDecorations(editor);
      }

      // Convert matches to decoration format
      var decorationMatches = fileMatches.map(function(m) {
        return {
          start: m.start,
          end: m.end,
          line: m.line
        };
      });

      // Render decorations with current index highlighted
      this._decorations.render(decorationMatches, currentIndex);
      this._currentHighlightPath = path;
    }

    /**
     * Clear all decorations
     */
    _clearDecorations() {
      if (this._decorations) {
        this._decorations.dispose();
        this._decorations = null;
      }
      this._currentHighlightPath = null;
    }

    /**
     * Highlight matches in the currently open file
     */
    _highlightCurrentFile() {
      if (!this._ide || !this._searchService) return;

      var editor = this._ide.getEditor();
      if (!editor) return;

      // Get current active tab path
      var workspaceService = this._ide.getWorkspaceService();
      if (!workspaceService) return;

      var activeTab = workspaceService.getActiveTab();
      if (!activeTab) return;

      var path = activeTab.path;
      var fileMatches = this._searchService.getResults().get(path);

      if (!fileMatches || fileMatches.length === 0) {
        this._clearDecorations();
        return;
      }

      // Highlight all matches in the current file (no current index)
      this._highlightMatchesInEditor(editor, path, -1);
    }

    // ============================================
    // Private Methods - Replace
    // ============================================

    /**
     * Handle replace single match
     * @param {string} path - File path
     * @param {number} index - Match index
     */
    async _handleReplaceMatch(path, index) {
      if (!this._searchService || !this._replaceInput) return;

      var replacement = this._replaceInput.value;
      var success = await this._searchService.replaceMatch(path, index, replacement);

      if (success) {
        this._renderResults();
        this._updateStatus(this._searchService.getTotalMatchCount() + ' results in ' +
                          this._searchService.getFileCount() + ' files');
      }
    }

    /**
     * Handle replace all in file
     * @param {string} path - File path
     */
    async _handleReplaceInFile(path) {
      if (!this._searchService || !this._replaceInput) return;

      var replacement = this._replaceInput.value;
      var count = await this._searchService.replaceAllInFile(path, replacement);

      if (count > 0) {
        this._renderResults();
        this._updateStatus('Replaced ' + count + ' matches. ' +
                          this._searchService.getTotalMatchCount() + ' results remaining');
      }
    }

    /**
     * Handle replace all
     */
    async _handleReplaceAll() {
      if (!this._searchService || !this._replaceInput) return;

      var replacement = this._replaceInput.value;
      var count = await this._searchService.replaceAll(replacement);

      if (count > 0) {
        this._renderResults();
        this._updateStatus('Replaced ' + count + ' matches in all files');
      }
    }

    // ============================================
    // Private Methods - Utilities
    // ============================================

    /**
     * Get file name from path
     * @param {string} path - File path
     * @returns {string}
     */
    _getFileName(path) {
      var parts = path.split('/');
      return parts[parts.length - 1];
    }

    /**
     * Get directory path from file path (excludes project name)
     * @param {string} path - File path
     * @returns {string}
     */
    _getDirectoryPath(path) {
      var parts = path.split('/');
      parts.shift(); // Remove project name (root folder)
      parts.pop();   // Remove filename
      return parts.join('/');
    }
  }

  // ============================================
  // Export to namespace
  // ============================================

  CodeEditor.IDE = CodeEditor.IDE || {};
  CodeEditor.IDE.SearchPanel = SearchPanel;

})(window.CodeEditor = window.CodeEditor || {});
