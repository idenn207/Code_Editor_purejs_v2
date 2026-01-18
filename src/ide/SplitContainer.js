/**
 * SplitContainer - Container for managing split editor panes
 *
 * Manages one or more EditorPanes in a split layout with resizable dividers.
 * Supports horizontal (left-right) and vertical (top-bottom) splits.
 */
(function(CodeEditor) {
  'use strict';

  // Get dependencies
  var EditorPane = CodeEditor.IDE.EditorPane;
  var SplitDivider = CodeEditor.IDE.SplitDivider;

  class SplitContainer {
    // ============================================
    // Instance Members
    // ============================================

    _container = null;
    _panes = [];              // Array of EditorPane instances
    _dividers = [];           // Array of SplitDivider instances
    _activePaneId = null;
    _splitDirection = null;   // 'horizontal' | 'vertical' | null
    _minPaneSize = 100;

    _workspaceService = null;
    _fileService = null;
    _listeners = new Map();

    // ============================================
    // Constructor
    // ============================================

    /**
     * Create a new SplitContainer
     * @param {HTMLElement} container - Container element
     * @param {Object} options - SplitContainer options
     */
    constructor(container, options) {
      options = options || {};
      this._container = container;
      this._workspaceService = options.workspaceService || null;
      this._fileService = options.fileService || null;
      this._minPaneSize = options.minPaneSize || 100;

      this._createDOM();
      this._createInitialPane();
    }

    // ============================================
    // Public Methods
    // ============================================

    /**
     * Get all panes
     * @returns {EditorPane[]}
     */
    getPanes() {
      return this._panes.slice();
    }

    /**
     * Get pane count
     * @returns {number}
     */
    getPaneCount() {
      return this._panes.length;
    }

    /**
     * Get pane by ID
     * @param {string} paneId - Pane ID
     * @returns {EditorPane|null}
     */
    getPane(paneId) {
      return this._panes.find(function(p) { return p.getId() === paneId; }) || null;
    }

    /**
     * Get active pane
     * @returns {EditorPane|null}
     */
    getActivePane() {
      if (!this._activePaneId) {
        return this._panes[0] || null;
      }
      return this.getPane(this._activePaneId);
    }

    /**
     * Set active pane
     * @param {string} paneId - Pane ID to activate
     */
    setActivePane(paneId) {
      var self = this;
      if (this._activePaneId === paneId) return;

      var pane = this.getPane(paneId);
      if (!pane) return;

      // Deactivate all panes
      this._panes.forEach(function(p) {
        p.setActive(p.getId() === paneId);
      });

      this._activePaneId = paneId;
      this._emit('activePaneChanged', { paneId: paneId, pane: pane });
    }

    /**
     * Split the active pane (or specified pane)
     * @param {string} direction - 'horizontal' (side by side) or 'vertical' (top/bottom)
     * @param {string} paneId - Optional pane ID to split (defaults to active pane)
     * @returns {EditorPane|null} New pane or null if split failed
     */
    splitPane(direction, paneId) {
      direction = direction || 'horizontal';
      paneId = paneId || this._activePaneId;

      // Can only have one split direction
      if (this._splitDirection && this._splitDirection !== direction) {
        console.warn('Cannot mix split directions. Current: ' + this._splitDirection);
        return null;
      }

      // Limit to 2 panes for simplicity (can be extended later)
      if (this._panes.length >= 2) {
        console.warn('Maximum pane limit reached');
        return null;
      }

      var sourcePane = this.getPane(paneId);
      if (!sourcePane) return null;

      // Get current tab from source pane - required for split
      var currentTab = sourcePane.getCurrentTab();
      if (!currentTab) {
        console.warn('Cannot split: no active tab in source pane');
        return null;
      }

      // Set split direction
      this._splitDirection = direction;
      this._container.classList.add(direction);

      // Create divider
      var divider = new SplitDivider(direction, { minSize: this._minPaneSize });
      this._bindDividerEvents(divider);
      this._dividers.push(divider);

      // Create new pane
      var newPaneContainer = document.createElement('div');
      var newPane = new EditorPane(newPaneContainer, {
        workspaceService: this._workspaceService,
        fileService: this._fileService,
      });
      this._bindPaneEvents(newPane);
      this._panes.push(newPane);

      // Insert divider and new pane after source pane
      var sourcePaneContainer = sourcePane.getContainer();
      sourcePaneContainer.after(divider.getElement());
      divider.getElement().after(newPaneContainer);

      // Clone the current tab and add to new pane
      var clonedTab = currentTab.clone();
      newPane.addTab(clonedTab);
      newPane.activateTab(clonedTab.id);

      // Set equal sizes
      this._setEqualSizes();

      // Activate new pane
      this.setActivePane(newPane.getId());

      this._emit('paneAdded', { pane: newPane, direction: direction });

      return newPane;
    }

    /**
     * Close a pane
     * @param {string} paneId - Pane ID to close
     */
    closePane(paneId) {
      // Cannot close the last pane
      if (this._panes.length <= 1) {
        return;
      }

      var paneIndex = this._panes.findIndex(function(p) { return p.getId() === paneId; });
      if (paneIndex === -1) return;

      var pane = this._panes[paneIndex];

      // Remove divider (either before or after the pane)
      if (this._dividers.length > 0) {
        var dividerIndex = paneIndex > 0 ? paneIndex - 1 : 0;
        var divider = this._dividers[dividerIndex];
        if (divider) {
          divider.dispose();
          this._dividers.splice(dividerIndex, 1);
        }
      }

      // Remove pane container from DOM and dispose
      var paneContainer = pane.getContainer();
      pane.dispose();
      if (paneContainer && paneContainer.parentNode) {
        paneContainer.parentNode.removeChild(paneContainer);
      }
      this._panes.splice(paneIndex, 1);

      // If this was active pane, activate another
      if (this._activePaneId === paneId) {
        var newActivePane = this._panes[0];
        if (newActivePane) {
          this.setActivePane(newActivePane.getId());
        }
      }

      // Reset layout if only one pane left
      if (this._panes.length === 1) {
        this._splitDirection = null;
        this._container.classList.remove('horizontal', 'vertical');
        this._panes[0].getContainer().style.flex = '';
      }

      this._emit('paneRemoved', { paneId: paneId });
    }

    /**
     * Add a tab to the active pane
     * @param {Tab} tab - Tab to add
     */
    addTab(tab) {
      var pane = this.getActivePane();
      if (pane) {
        pane.addTab(tab);
      }
    }

    /**
     * Remove a tab from its pane
     * @param {string} tabId - Tab ID to remove
     */
    removeTab(tabId) {
      // Find which pane has this tab and remove it
      for (var i = 0; i < this._panes.length; i++) {
        var pane = this._panes[i];
        var tabBar = pane.getTabBar();
        if (tabBar.hasTab(tabId)) {
          pane.removeTab(tabId);
          break;
        }
      }
    }

    /**
     * Activate a tab in any pane
     * @param {string} tabId - Tab ID to activate
     */
    activateTab(tabId) {
      // Find which pane has this tab and activate it
      for (var i = 0; i < this._panes.length; i++) {
        var pane = this._panes[i];
        var tabBar = pane.getTabBar();
        if (tabBar.hasTab(tabId)) {
          pane.activateTab(tabId);
          this.setActivePane(pane.getId());
          break;
        }
      }
    }

    /**
     * Update tab dirty state
     * @param {string} tabId - Tab ID
     * @param {boolean} isDirty - Whether tab is dirty
     */
    updateTabDirty(tabId, isDirty) {
      // Find which pane has this tab and update it
      for (var i = 0; i < this._panes.length; i++) {
        var pane = this._panes[i];
        var tabBar = pane.getTabBar();
        if (tabBar.hasTab(tabId)) {
          pane.updateTabDirty(tabId, isDirty);
          break;
        }
      }
    }

    /**
     * Get the editor from the active pane
     * @returns {Editor|null}
     */
    getEditor() {
      var pane = this.getActivePane();
      return pane ? pane.getEditor() : null;
    }

    /**
     * Focus the active pane's editor
     */
    focusEditor() {
      var pane = this.getActivePane();
      if (pane) {
        pane.focusEditor();
      }
    }

    /**
     * Get current tab from active pane
     * @returns {Tab|null}
     */
    getCurrentTab() {
      var pane = this.getActivePane();
      return pane ? pane.getCurrentTab() : null;
    }

    /**
     * Dispose container and all panes
     */
    dispose() {
      var self = this;
      this._dividers.forEach(function(d) { d.dispose(); });
      this._panes.forEach(function(p) { p.dispose(); });
      this._dividers = [];
      this._panes = [];
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
      this._container.className = 'ide-split-container';
    }

    /**
     * Create initial pane
     */
    _createInitialPane() {
      var paneContainer = document.createElement('div');
      this._container.appendChild(paneContainer);

      var pane = new EditorPane(paneContainer, {
        workspaceService: this._workspaceService,
        fileService: this._fileService,
      });

      this._bindPaneEvents(pane);
      this._panes.push(pane);

      // Set as active
      this._activePaneId = pane.getId();
      pane.setActive(true);
    }

    /**
     * Bind events from an EditorPane
     * @param {EditorPane} pane
     */
    _bindPaneEvents(pane) {
      var self = this;

      pane.on('requestFocus', function(data) {
        self.setActivePane(data.paneId);
      });

      pane.on('splitRequest', function(data) {
        self.splitPane(data.direction, data.paneId);
      });

      pane.on('empty', function(data) {
        // Close pane when all tabs are closed (if not the last pane)
        if (self._panes.length > 1) {
          self.closePane(data.paneId);
        }
      });

      pane.on('tabActivate', function(data) {
        self._emit('tabActivate', data);
      });

      pane.on('tabClose', function(data) {
        self._emit('tabClose', data);
      });

      pane.on('contentChange', function(data) {
        self._emit('contentChange', data);
      });

      pane.on('selectionChange', function(data) {
        self._emit('selectionChange', data);
      });

      pane.on('openFolder', function(data) {
        self._emit('openFolder', data);
      });

      pane.on('openFile', function(data) {
        self._emit('openFile', data);
      });

      pane.on('error', function(data) {
        self._emit('error', data);
      });
    }

    /**
     * Bind events from a SplitDivider
     * @param {SplitDivider} divider
     */
    _bindDividerEvents(divider) {
      var self = this;
      var startPosition = 0;
      var startSizes = [];

      divider.on('dragStart', function(data) {
        startPosition = data.direction === 'horizontal' ? data.clientX : data.clientY;
        startSizes = self._panes.map(function(p) {
          var rect = p.getContainer().getBoundingClientRect();
          return data.direction === 'horizontal' ? rect.width : rect.height;
        });
      });

      divider.on('drag', function(data) {
        var currentPosition = data.direction === 'horizontal' ? data.clientX : data.clientY;
        var delta = currentPosition - startPosition;

        // Calculate new sizes
        var newSize1 = startSizes[0] + delta;
        var newSize2 = startSizes[1] - delta;

        // Enforce minimum sizes
        if (newSize1 < self._minPaneSize) {
          newSize1 = self._minPaneSize;
          newSize2 = startSizes[0] + startSizes[1] - self._minPaneSize;
        }
        if (newSize2 < self._minPaneSize) {
          newSize2 = self._minPaneSize;
          newSize1 = startSizes[0] + startSizes[1] - self._minPaneSize;
        }

        // Apply sizes as flex-basis
        self._panes[0].getContainer().style.flex = '0 0 ' + newSize1 + 'px';
        self._panes[1].getContainer().style.flex = '0 0 ' + newSize2 + 'px';
      });

      divider.on('dragEnd', function() {
        self._emit('layoutChanged', {});
      });
    }

    /**
     * Set equal sizes for all panes
     */
    _setEqualSizes() {
      var self = this;
      var flexValue = 1 / this._panes.length;
      this._panes.forEach(function(pane) {
        pane.getContainer().style.flex = '1 1 0';
      });
    }
  }

  // ============================================
  // Export to namespace
  // ============================================

  CodeEditor.IDE = CodeEditor.IDE || {};
  CodeEditor.IDE.SplitContainer = SplitContainer;

})(window.CodeEditor = window.CodeEditor || {});
