/**
 * TabBar - Tab management UI component
 *
 * Displays tabs for open files with support for:
 * - Active tab highlighting
 * - Dirty indicator
 * - Close button
 * - Middle-click to close
 * - Scrollable overflow
 */
(function(CodeEditor) {
  'use strict';

  // Get dependencies
  var Tab = CodeEditor.Tab;

  class TabBar {
    // ============================================
    // Static Members
    // ============================================

    // SVG Icons
    static ICONS = {
      close: '<svg viewBox="0 0 16 16"><path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z"/></svg>',
      splitEditor: '<svg viewBox="0 0 16 16"><path d="M14 1H3L2 2v11l1 1h11l1-1V2l-1-1zM8 13H3V2h5v11zm6 0H9V2h5v11z"/></svg>',
      more: '<svg viewBox="0 0 16 16"><path d="M4 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm5 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm5 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>',
      fileJs: '<svg viewBox="0 0 16 16"><rect fill="#f7df1e" width="16" height="16" rx="2"/><text x="4" y="12" font-size="8" font-weight="bold" fill="#000">JS</text></svg>',
      fileTs: '<svg viewBox="0 0 16 16"><rect fill="#3178c6" width="16" height="16" rx="2"/><text x="4" y="12" font-size="8" font-weight="bold" fill="#fff">TS</text></svg>',
      fileHtml: '<svg viewBox="0 0 16 16"><rect fill="#e34c26" width="16" height="16" rx="2"/><text x="1" y="12" font-size="6" font-weight="bold" fill="#fff">HTML</text></svg>',
      fileCss: '<svg viewBox="0 0 16 16"><rect fill="#563d7c" width="16" height="16" rx="2"/><text x="2" y="12" font-size="7" font-weight="bold" fill="#fff">CSS</text></svg>',
      fileJson: '<svg viewBox="0 0 16 16"><rect fill="#f7df1e" width="16" height="16" rx="2"/><text x="3" y="11" font-size="7" font-weight="bold" fill="#000">{}</text></svg>',
      fileMd: '<svg viewBox="0 0 16 16"><rect fill="#519aba" width="16" height="16" rx="2"/><text x="2" y="12" font-size="7" font-weight="bold" fill="#fff">MD</text></svg>',
      file: '<svg viewBox="0 0 16 16"><path fill="#c5c5c5" d="M13.71 4.29l-3-3L10 1H4L3 2v12l1 1h9l1-1V5l-.29-.71zM13 14H4V2h5v4h4v8zm-3-9V2l3 3h-3z"/></svg>',
    };

    // ============================================
    // Instance Members
    // ============================================

    _container = null;
    _tabsContainer = null;
    _actionsContainer = null;
    _tabs = new Map(); // id -> { tab, element }
    _activeTabId = null;
    _listeners = new Map();

    // ============================================
    // Constructor
    // ============================================

    /**
     * Create a new TabBar
     * @param {HTMLElement} container - Container element
     * @param {Object} options - TabBar options
     */
    constructor(container, options) {
      options = options || {};
      this._container = container;
      this._createDOM();
      this._bindEvents();
    }

    // ============================================
    // Public Methods
    // ============================================

    /**
     * Add a tab
     * @param {Tab} tab - Tab to add
     */
    addTab(tab) {
      // Check if tab already exists
      if (this._tabs.has(tab.id)) {
        this.activateTab(tab.id);
        return;
      }

      // Create tab element
      var element = this._createTabElement(tab);
      this._tabsContainer.appendChild(element);

      // Store tab
      this._tabs.set(tab.id, { tab: tab, element: element });

      // Activate if first tab
      if (this._tabs.size === 1) {
        this.activateTab(tab.id);
      }

      this._updateEmptyState();
      this._emit('tabAdded', { tab: tab });
    }

    /**
     * Remove a tab
     * @param {string} tabId - Tab ID to remove
     */
    removeTab(tabId) {
      var tabData = this._tabs.get(tabId);
      if (!tabData) return;

      // Remove element
      tabData.element.remove();
      this._tabs.delete(tabId);

      // If this was the active tab, activate adjacent
      if (this._activeTabId === tabId) {
        this._activeTabId = null;
        var tabIds = Array.from(this._tabs.keys());
        if (tabIds.length > 0) {
          this.activateTab(tabIds[tabIds.length - 1]);
        }
      }

      this._updateEmptyState();
      this._emit('tabRemoved', { tabId: tabId });
    }

    /**
     * Activate a tab
     * @param {string} tabId - Tab ID to activate
     */
    activateTab(tabId) {
      var tabData = this._tabs.get(tabId);
      if (!tabData) return;

      // Update previous active tab
      if (this._activeTabId && this._activeTabId !== tabId) {
        var prevData = this._tabs.get(this._activeTabId);
        if (prevData) {
          prevData.element.classList.remove('active');
        }
      }

      // Activate new tab
      this._activeTabId = tabId;
      tabData.element.classList.add('active');

      // Scroll into view if needed
      tabData.element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

      this._emit('tabActivate', { tabId: tabId, tab: tabData.tab });
    }

    /**
     * Update tab dirty state
     * @param {string} tabId - Tab ID
     * @param {boolean} isDirty - Whether tab is dirty
     */
    updateTabDirty(tabId, isDirty) {
      var tabData = this._tabs.get(tabId);
      if (!tabData) return;

      tabData.tab._isDirty = isDirty;
      var dirtyEl = tabData.element.querySelector('.ide-tab-dirty');
      if (dirtyEl) {
        dirtyEl.classList.toggle('visible', isDirty);
      }
    }

    /**
     * Update tab name
     * @param {string} tabId - Tab ID
     * @param {string} name - New name
     */
    updateTabName(tabId, name) {
      var tabData = this._tabs.get(tabId);
      if (!tabData) return;

      tabData.tab._name = name;
      var labelEl = tabData.element.querySelector('.ide-tab-label');
      if (labelEl) {
        labelEl.textContent = name;
      }
    }

    /**
     * Get tab by ID
     * @param {string} tabId - Tab ID
     * @returns {Tab|null}
     */
    getTab(tabId) {
      var tabData = this._tabs.get(tabId);
      return tabData ? tabData.tab : null;
    }

    /**
     * Get active tab
     * @returns {Tab|null}
     */
    getActiveTab() {
      if (!this._activeTabId) return null;
      var tabData = this._tabs.get(this._activeTabId);
      return tabData ? tabData.tab : null;
    }

    /**
     * Get all tabs
     * @returns {Tab[]}
     */
    getAllTabs() {
      return Array.from(this._tabs.values()).map(function(d) { return d.tab; });
    }

    /**
     * Check if a tab exists
     * @param {string} tabId - Tab ID
     * @returns {boolean}
     */
    hasTab(tabId) {
      return this._tabs.has(tabId);
    }

    /**
     * Get tab count
     * @returns {number}
     */
    getTabCount() {
      return this._tabs.size;
    }

    /**
     * Close all tabs
     */
    closeAllTabs() {
      var self = this;
      var tabIds = Array.from(this._tabs.keys());
      tabIds.forEach(function(id) {
        var tabData = self._tabs.get(id);
        if (tabData && !tabData.tab.isDirty) {
          self.removeTab(id);
        }
      });
    }

    /**
     * Dispose TabBar
     */
    dispose() {
      this._tabs.clear();
      this._listeners.clear();
      this._container.innerHTML = '';
    }

    // ============================================
    // Event System
    // ============================================

    on(event, callback) {
      if (!this._listeners.has(event)) {
        this._listeners.set(event, new Set());
      }
      this._listeners.get(event).add(callback);
      var self = this;
      return function() {
        self._listeners.get(event).delete(callback);
      };
    }

    off(event, callback) {
      var listeners = this._listeners.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
    }

    _emit(event, data) {
      var listeners = this._listeners.get(event);
      if (listeners) {
        listeners.forEach(function(cb) {
          cb(data);
        });
      }
    }

    // ============================================
    // Private Methods
    // ============================================

    /**
     * Create DOM structure
     */
    _createDOM() {
      var self = this;

      // Clear container and add class
      this._container.innerHTML = '';
      this._container.className = 'ide-tab-bar';

      // Tabs container (scrollable)
      this._tabsContainer = document.createElement('div');
      this._tabsContainer.className = 'ide-tabs-container';
      this._container.appendChild(this._tabsContainer);

      // Empty state
      this._emptyElement = document.createElement('div');
      this._emptyElement.className = 'ide-tabs-empty';
      this._emptyElement.textContent = 'No open editors';
      this._tabsContainer.appendChild(this._emptyElement);

      // Actions container
      this._actionsContainer = document.createElement('div');
      this._actionsContainer.className = 'ide-tab-actions';
      this._container.appendChild(this._actionsContainer);

      // Split editor button
      var splitBtn = document.createElement('div');
      splitBtn.className = 'ide-tab-action';
      splitBtn.title = 'Split Editor Right';
      splitBtn.innerHTML = TabBar.ICONS.splitEditor;
      splitBtn.addEventListener('click', function() {
        self._emit('splitEditor', {});
      });
      this._actionsContainer.appendChild(splitBtn);
    }

    /**
     * Bind event handlers
     */
    _bindEvents() {
      var self = this;

      // Middle click to close tab
      this._tabsContainer.addEventListener('auxclick', function(e) {
        if (e.button === 1) {
          // Middle click
          var tabEl = e.target.closest('.ide-tab');
          if (tabEl) {
            e.preventDefault();
            var tabId = tabEl.dataset.tabId;
            self._requestClose(tabId);
          }
        }
      });

      // Scroll tabs horizontally with wheel
      this._tabsContainer.addEventListener('wheel', function(e) {
        if (e.deltaY !== 0) {
          e.preventDefault();
          self._tabsContainer.scrollLeft += e.deltaY;
        }
      });
    }

    /**
     * Create tab element
     * @param {Tab} tab - Tab data
     * @returns {HTMLElement}
     */
    _createTabElement(tab) {
      var self = this;
      var tabEl = document.createElement('div');
      tabEl.className = 'ide-tab';
      tabEl.dataset.tabId = tab.id;

      // Icon
      var icon = document.createElement('span');
      icon.className = 'ide-tab-icon';
      icon.innerHTML = this._getLanguageIcon(tab.language);
      tabEl.appendChild(icon);

      // Label
      var label = document.createElement('span');
      label.className = 'ide-tab-label';
      label.textContent = tab.name;
      tabEl.appendChild(label);

      // Dirty indicator
      var dirty = document.createElement('span');
      dirty.className = 'ide-tab-dirty' + (tab.isDirty ? ' visible' : '');
      tabEl.appendChild(dirty);

      // Close button
      var close = document.createElement('span');
      close.className = 'ide-tab-close';
      close.innerHTML = TabBar.ICONS.close;
      close.addEventListener('click', function(e) {
        e.stopPropagation();
        self._requestClose(tab.id);
      });
      tabEl.appendChild(close);

      // Click to activate
      tabEl.addEventListener('click', function() {
        self.activateTab(tab.id);
      });

      return tabEl;
    }

    /**
     * Get language icon
     * @param {string} language - Language ID
     * @returns {string} SVG icon
     */
    _getLanguageIcon(language) {
      var iconMap = {
        javascript: TabBar.ICONS.fileJs,
        typescript: TabBar.ICONS.fileTs,
        html: TabBar.ICONS.fileHtml,
        css: TabBar.ICONS.fileCss,
        json: TabBar.ICONS.fileJson,
        markdown: TabBar.ICONS.fileMd,
      };
      return iconMap[language] || TabBar.ICONS.file;
    }

    /**
     * Request to close a tab (may prompt if dirty)
     * @param {string} tabId - Tab ID
     */
    _requestClose(tabId) {
      var tabData = this._tabs.get(tabId);
      if (!tabData) return;

      if (tabData.tab.isDirty) {
        // Emit event for parent to handle save/discard dialog
        this._emit('tabCloseRequest', { tab: tabData.tab, tabId: tabId });
      } else {
        this.removeTab(tabId);
        this._emit('tabClose', { tabId: tabId });
      }
    }

    /**
     * Update empty state visibility
     */
    _updateEmptyState() {
      this._emptyElement.style.display = this._tabs.size === 0 ? '' : 'none';
    }
  }

  // ============================================
  // Export to namespace
  // ============================================

  CodeEditor.IDE = CodeEditor.IDE || {};
  CodeEditor.IDE.TabBar = TabBar;

})(window.CodeEditor = window.CodeEditor || {});
