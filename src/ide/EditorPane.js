/**
 * EditorPane - Single editor pane component
 *
 * A self-contained unit with TabBar and Editor.
 * Multiple EditorPanes can exist in a SplitContainer.
 * Refactored from EditorArea to support split view.
 */
(function(CodeEditor) {
  'use strict';

  // Get dependencies
  var TabBar = CodeEditor.IDE.TabBar;
  var Tab = CodeEditor.Tab;
  var Editor = CodeEditor.Editor;
  var AutoCloseFeature = CodeEditor.Features.AutoClose;
  var AutoIndentFeature = CodeEditor.Features.AutoIndent;
  var BracketMatchFeature = CodeEditor.Features.BracketMatch;
  var IndentGuideFeature = CodeEditor.Features.IndentGuide;
  var SearchFeature = CodeEditor.Features.Search;
  var MultiCursorFeature = CodeEditor.Features.MultiCursor;
  var LineOperationsFeature = CodeEditor.Features.LineOperations;

  // Unique ID counter
  var paneIdCounter = 0;

  class EditorPane {
    // ============================================
    // Instance Members
    // ============================================

    _id = null;
    _container = null;
    _tabBarContainer = null;
    _editorContainer = null;

    _tabBar = null;
    _editor = null;
    _currentTab = null;

    _workspaceService = null;
    _fileService = null;
    _listeners = new Map();

    // Editor features
    _features = {};

    // Active state
    _isActive = false;

    // Image viewer
    _imageViewer = null;
    _zoomLevel = 100;
    _panX = 0;
    _panY = 0;
    _isDragging = false;
    _dragStartX = 0;
    _dragStartY = 0;
    _panStartX = 0;
    _panStartY = 0;

    // ============================================
    // Constructor
    // ============================================

    /**
     * Create a new EditorPane
     * @param {HTMLElement} container - Container element
     * @param {Object} options - EditorPane options
     */
    constructor(container, options) {
      options = options || {};
      this._id = 'pane_' + (++paneIdCounter);
      this._container = container;
      this._workspaceService = options.workspaceService || null;
      this._fileService = options.fileService || null;

      this._createDOM();
      this._initComponents();
      this._bindEvents();
    }

    // ============================================
    // Public Methods
    // ============================================

    /**
     * Get pane ID
     * @returns {string}
     */
    getId() {
      return this._id;
    }

    /**
     * Check if pane is active
     * @returns {boolean}
     */
    isActive() {
      return this._isActive;
    }

    /**
     * Set pane active state
     * @param {boolean} active - Whether pane is active
     */
    setActive(active) {
      if (this._isActive === active) return;
      this._isActive = active;
      this._container.classList.toggle('active', active);
    }

    /**
     * Add a tab
     * @param {Tab} tab - Tab to add
     */
    addTab(tab) {
      this._hideEmptyState();
      this._tabBar.addTab(tab);
    }

    /**
     * Remove a tab
     * @param {string} tabId - Tab ID to remove
     */
    removeTab(tabId) {
      this._tabBar.removeTab(tabId);

      // Emit empty event if no tabs remain (pane will be closed by SplitContainer)
      if (this._tabBar.getTabCount() === 0) {
        this._currentTab = null;
        this._editor.setValue('');
        this._showEmptyState();
        this._emit('empty', { paneId: this._id });
      }
    }

    /**
     * Activate a tab
     * @param {string} tabId - Tab ID to activate
     */
    activateTab(tabId) {
      this._tabBar.activateTab(tabId);
    }

    /**
     * Update tab dirty state
     * @param {string} tabId - Tab ID
     * @param {boolean} isDirty - Whether tab is dirty
     */
    updateTabDirty(tabId, isDirty) {
      this._tabBar.updateTabDirty(tabId, isDirty);
    }

    /**
     * Get the editor instance
     * @returns {Editor}
     */
    getEditor() {
      return this._editor;
    }

    /**
     * Get the TabBar instance
     * @returns {TabBar}
     */
    getTabBar() {
      return this._tabBar;
    }

    /**
     * Get current tab
     * @returns {Tab|null}
     */
    getCurrentTab() {
      return this._currentTab;
    }

    /**
     * Check if pane has tabs
     * @returns {boolean}
     */
    hasTabs() {
      return this._tabBar.getTabCount() > 0;
    }

    /**
     * Get tab count
     * @returns {number}
     */
    getTabCount() {
      return this._tabBar.getTabCount();
    }

    /**
     * Focus the editor
     */
    focusEditor() {
      if (this._editor) {
        this._editor.focus();
      }
    }

    /**
     * Get container element
     * @returns {HTMLElement}
     */
    getContainer() {
      return this._container;
    }

    /**
     * Dispose EditorPane
     */
    dispose() {
      var self = this;
      // Dispose features
      Object.keys(this._features).forEach(function(key) {
        var feature = self._features[key];
        if (feature.dispose) feature.dispose();
      });

      if (this._tabBar) this._tabBar.dispose();
      this._editor = null;
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
    // Private Methods - Initialization
    // ============================================

    /**
     * Create DOM structure
     */
    _createDOM() {
      // Set pane class and ID
      this._container.className = 'ide-split-pane';
      this._container.dataset.paneId = this._id;

      // Tab bar container
      this._tabBarContainer = document.createElement('div');
      this._tabBarContainer.className = 'ide-editor-tabs';
      this._container.appendChild(this._tabBarContainer);

      // Editor container
      this._editorContainer = document.createElement('div');
      this._editorContainer.className = 'ide-editor-container';
      this._container.appendChild(this._editorContainer);
    }

    /**
     * Create image viewer DOM (must be called after Editor is created)
     */
    _createImageViewer() {
      // Image viewer (hidden by default)
      this._imageViewer = document.createElement('div');
      this._imageViewer.className = 'ide-image-viewer';
      this._imageViewer.innerHTML =
        '<div class="ide-image-viewer-toolbar">' +
          '<button class="ide-image-zoom-out" title="Zoom Out">−</button>' +
          '<span class="ide-image-zoom-level">100%</span>' +
          '<button class="ide-image-zoom-in" title="Zoom In">+</button>' +
          '<button class="ide-image-zoom-fit" title="Fit to Window">Fit</button>' +
          '<button class="ide-image-zoom-reset" title="Reset to 100%">1:1</button>' +
        '</div>' +
        '<div class="ide-image-viewer-content">' +
          '<img class="ide-image-preview" />' +
        '</div>';
      this._editorContainer.appendChild(this._imageViewer);
    }

    /**
     * Initialize components
     */
    _initComponents() {
      // Create TabBar
      this._tabBar = new TabBar(this._tabBarContainer);

      // Create Editor
      this._editor = new Editor(this._editorContainer, {
        value: '',
        language: 'javascript',
        fontSize: 14,
        lineHeight: 22,
      });

      // Editor sets className to 'ec-editor', add back ide-editor-container for flex layout
      this._editorContainer.classList.add('ide-editor-container');

      // Create image viewer (must be after Editor since Editor clears the container)
      this._createImageViewer();

      // Initialize editor features
      this._initFeatures();

      // Initialize image viewer events
      this._bindImageViewerEvents();

      // Start in empty state (no tabs)
      this._showEmptyState();
    }

    /**
     * Initialize editor features
     */
    _initFeatures() {
      // Auto-close brackets
      this._features.autoClose = new AutoCloseFeature(this._editor);

      // Auto-indent
      this._features.autoIndent = new AutoIndentFeature(this._editor, {
        tabSize: 2,
        useSpaces: true,
      });

      // Bracket matching
      this._features.bracketMatch = new BracketMatchFeature(this._editor);

      // Indent guides
      this._features.indentGuide = new IndentGuideFeature(this._editor, {
        tabSize: 2,
      });

      // Search
      this._features.search = new SearchFeature(this._editor);

      // Multi-cursor
      this._features.multiCursor = new MultiCursorFeature(this._editor);

      // Line operations (comment, move, duplicate)
      this._features.lineOperations = new LineOperationsFeature(this._editor);
    }

    /**
     * Bind event handlers
     */
    _bindEvents() {
      var self = this;

      // Click on pane to activate
      this._container.addEventListener('mousedown', function(e) {
        // Only emit focus if not already active
        if (!self._isActive) {
          self._emit('requestFocus', { paneId: self._id });
        }
      }, true);

      // TabBar events
      this._tabBar.on('tabActivate', function(data) {
        self._switchToTab(data.tab);
        self._emit('tabActivate', { tabId: data.tabId, tab: data.tab, paneId: self._id });
      });

      this._tabBar.on('tabClose', function(data) {
        // Close the tab in WorkspaceService
        if (self._workspaceService) {
          self._workspaceService.closeTabById(data.tabId);
        }
        self._emit('tabClose', { tabId: data.tabId, paneId: self._id });

        // Check if all tabs are closed (tab is already removed from TabBar at this point)
        if (self._tabBar.getTabCount() === 0) {
          self._currentTab = null;
          self._editor.setValue('');
          self._showEmptyState();
          self._emit('empty', { paneId: self._id });
        }
      });

      this._tabBar.on('tabCloseRequest', function(data) {
        // Show confirmation dialog for unsaved changes
        self._showUnsavedChangesDialog(data.tab, data.tabId);
      });

      // Split editor event from TabBar
      this._tabBar.on('splitEditor', function() {
        self._emit('splitRequest', { paneId: self._id, direction: 'horizontal' });
      });

      // Editor change events
      this._editor.on('change', function() {
        if (self._currentTab) {
          // Update tab content
          self._currentTab.setContent(self._editor.getValue());
          // Update dirty state in TabBar
          self._tabBar.updateTabDirty(self._currentTab.id, self._currentTab.isDirty);
          self._emit('contentChange', { tab: self._currentTab, paneId: self._id });
        }
      });

      // Editor selection change
      this._editor.on('selectionChange', function() {
        self._emit('selectionChange', {
          selection: self._editor.getSelection(),
          cursorPosition: self._editor.getCursorPosition(),
          paneId: self._id,
        });
      });

    }

    /**
     * Show unsaved changes confirmation dialog
     * @param {Tab} tab - Tab with unsaved changes
     * @param {string} tabId - Tab ID
     */
    _showUnsavedChangesDialog(tab, tabId) {
      var self = this;

      // Create dialog overlay
      var overlay = document.createElement('div');
      overlay.className = 'ide-dialog-overlay';

      var dialog = document.createElement('div');
      dialog.className = 'ide-dialog';

      dialog.innerHTML =
        '<div class="ide-dialog-header">Unsaved Changes</div>' +
        '<div class="ide-dialog-content">' +
        'Do you want to save the changes you made to <strong>' + tab.name + '</strong>?' +
        '<br><br>' +
        'Your changes will be lost if you don\'t save them.' +
        '</div>' +
        '<div class="ide-dialog-footer">' +
        '<button class="ide-dialog-btn ide-dialog-btn-secondary" data-action="cancel">Cancel</button>' +
        '<button class="ide-dialog-btn ide-dialog-btn-secondary" data-action="dont-save">Don\'t Save</button>' +
        '<button class="ide-dialog-btn ide-dialog-btn-primary" data-action="save">Save</button>' +
        '</div>';

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      // Focus the Save button
      var saveBtn = dialog.querySelector('[data-action="save"]');
      if (saveBtn) saveBtn.focus();

      // Handle button clicks
      var handleAction = async function(action) {
        overlay.remove();

        if (action === 'cancel') {
          // Do nothing, keep tab open
          return;
        }

        if (action === 'save') {
          // Save the file first, then close
          await self._saveAndCloseTab(tab, tabId);
        } else if (action === 'dont-save') {
          // Close without saving
          self._closeTabWithoutSaving(tabId);
        }
      };

      // Button click handlers
      dialog.addEventListener('click', function(e) {
        var btn = e.target.closest('[data-action]');
        if (btn) {
          handleAction(btn.dataset.action);
        }
      });

      // Keyboard handlers (Escape = Cancel, Enter = Save)
      var handleKeyDown = function(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          handleAction('cancel');
          document.removeEventListener('keydown', handleKeyDown);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleAction('save');
          document.removeEventListener('keydown', handleKeyDown);
        }
      };
      document.addEventListener('keydown', handleKeyDown);

      // Click outside to cancel
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          handleAction('cancel');
        }
      });
    }

    /**
     * Save file and close tab
     * @param {Tab} tab - Tab to save
     * @param {string} tabId - Tab ID
     */
    async _saveAndCloseTab(tab, tabId) {
      try {
        if (this._fileService && tab.path) {
          // Sync content from editor to tab and file service before saving
          var content = this._editor.getValue();
          tab.setContent(content);
          this._fileService.updateFileContent(tab.path, content);

          // Save the file
          await this._fileService.saveFile(tab.path);
          tab.markClean();
        }

        // Now close the tab
        this._closeTabWithoutSaving(tabId);
      } catch (err) {
        console.error('Failed to save file:', err);
        this._emit('error', { message: 'Failed to save file', error: err, paneId: this._id });
      }
    }

    /**
     * Close tab without saving
     * @param {string} tabId - Tab ID
     */
    _closeTabWithoutSaving(tabId) {
      this._tabBar.removeTab(tabId);
      if (this._workspaceService) {
        // Use forceCloseTabById to skip dirty check
        this._workspaceService.forceCloseTabById(tabId);
      }
      this._emit('tabClose', { tabId: tabId, paneId: this._id });

      // Emit empty event if no tabs remain (pane will be closed by SplitContainer)
      if (this._tabBar.getTabCount() === 0) {
        this._currentTab = null;
        this._editor.setValue('');
        this._showEmptyState();
        this._emit('empty', { paneId: this._id });
      }
    }

    /**
     * Show empty state (black screen)
     */
    _showEmptyState() {
      this._container.classList.add('empty');
      this._editorContainer.classList.remove('image-mode');
      var wrapper = this._getEditorWrapper();
      if (wrapper) {
        wrapper.style.display = 'none';
      }
      if (this._imageViewer) {
        this._imageViewer.style.display = 'none';
      }
    }

    /**
     * Hide empty state
     */
    _hideEmptyState() {
      this._container.classList.remove('empty');
      // Note: The actual visibility is controlled by _showImageViewer/_showCodeEditor
    }

    /**
     * Switch to a tab
     * @param {Tab} tab - Tab to switch to
     */
    _switchToTab(tab) {
      // Save current tab state (only for code tabs)
      if (this._currentTab && !this._currentTab.isImage()) {
        this._currentTab.saveState(this._editor);
      }

      // Load new tab
      this._currentTab = tab;

      // Hide empty state if visible
      this._hideEmptyState();

      // Check if this is an image tab
      if (tab.isImage()) {
        this._showImageViewer(tab.content);
      } else {
        this._showCodeEditor(tab);
      }
    }

    /**
     * Get the editor wrapper element
     * @returns {HTMLElement}
     */
    _getEditorWrapper() {
      return this._editorContainer.querySelector('.ec-editor-wrapper');
    }

    /**
     * Show image viewer with the given data URL
     * @param {string} dataUrl - Image data URL
     */
    _showImageViewer(dataUrl) {
      // Hide code editor wrapper, show image viewer
      var wrapper = this._getEditorWrapper();
      if (wrapper) {
        wrapper.style.display = 'none';
      }
      this._imageViewer.style.display = 'flex';
      this._editorContainer.classList.add('image-mode');

      // Set image source
      var img = this._imageViewer.querySelector('.ide-image-preview');
      img.src = dataUrl;

      // Reset zoom when switching images
      this._resetZoom();
    }

    /**
     * Show code editor with the given tab
     * @param {Tab} tab - Tab to display
     */
    _showCodeEditor(tab) {
      // Hide image viewer, show code editor wrapper
      this._imageViewer.style.display = 'none';
      this._editorContainer.classList.remove('image-mode');
      var wrapper = this._getEditorWrapper();
      if (wrapper) {
        wrapper.style.display = '';
      }

      // Suppress undo recording during tab content switch
      this._editor.setSuppressUndo(true);

      // Set editor content (this will NOT create an undo entry)
      this._editor.setValue(tab.content || '');

      // Re-enable undo recording
      this._editor.setSuppressUndo(false);

      // Set language
      if (tab.language) {
        this._editor.setLanguage(tab.language);
      }

      // Restore tab state (scroll, selection)
      tab.restoreState(this._editor);

      // Focus editor
      this._editor.focus();
    }

    /**
     * Bind image viewer toolbar events
     */
    _bindImageViewerEvents() {
      var self = this;
      var content = this._imageViewer.querySelector('.ide-image-viewer-content');

      this._imageViewer.querySelector('.ide-image-zoom-in').onclick = function() {
        self._setZoom(self._zoomLevel + 25);
      };

      this._imageViewer.querySelector('.ide-image-zoom-out').onclick = function() {
        self._setZoom(self._zoomLevel - 25);
      };

      this._imageViewer.querySelector('.ide-image-zoom-fit').onclick = function() {
        self._fitToWindow();
      };

      this._imageViewer.querySelector('.ide-image-zoom-reset').onclick = function() {
        self._resetZoom();
      };

      // Mouse wheel zoom
      content.addEventListener('wheel', function(e) {
        if (e.ctrlKey) {
          e.preventDefault();
          var delta = e.deltaY > 0 ? -25 : 25;
          self._setZoom(self._zoomLevel + delta);
        }
      });

      // Drag to pan image
      content.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return; // Left click only
        self._isDragging = true;
        self._dragStartX = e.clientX;
        self._dragStartY = e.clientY;
        self._panStartX = self._panX;
        self._panStartY = self._panY;
        content.style.cursor = 'grabbing';
        e.preventDefault();
      });

      content.addEventListener('mousemove', function(e) {
        if (!self._isDragging) return;
        var dx = e.clientX - self._dragStartX;
        var dy = e.clientY - self._dragStartY;
        self._panX = self._panStartX + dx;
        self._panY = self._panStartY + dy;
        self._updateImageTransform();
      });

      content.addEventListener('mouseup', function() {
        self._isDragging = false;
        content.style.cursor = '';
      });

      content.addEventListener('mouseleave', function() {
        self._isDragging = false;
        content.style.cursor = '';
      });
    }

    /**
     * Update image transform (zoom + pan)
     */
    _updateImageTransform() {
      var img = this._imageViewer.querySelector('.ide-image-preview');
      var scale = this._zoomLevel / 100;
      img.style.transform = 'translate(' + this._panX + 'px, ' + this._panY + 'px) scale(' + scale + ')';
    }

    /**
     * Set zoom level
     * @param {number} level - Zoom level percentage
     */
    _setZoom(level) {
      this._zoomLevel = Math.max(25, Math.min(400, level));
      this._updateImageTransform();
      this._imageViewer.querySelector('.ide-image-zoom-level').textContent = this._zoomLevel + '%';
    }

    /**
     * Fit image to window
     */
    _fitToWindow() {
      var img = this._imageViewer.querySelector('.ide-image-preview');
      var content = this._imageViewer.querySelector('.ide-image-viewer-content');

      // Wait for image to load if needed
      if (!img.naturalWidth) {
        var self = this;
        img.onload = function() {
          self._fitToWindow();
        };
        return;
      }

      var containerWidth = content.clientWidth - 40; // padding
      var containerHeight = content.clientHeight - 40;

      var scaleX = containerWidth / img.naturalWidth;
      var scaleY = containerHeight / img.naturalHeight;
      var scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%

      // Reset pan and set zoom
      this._panX = 0;
      this._panY = 0;
      this._setZoom(Math.round(scale * 100));
    }

    /**
     * Reset zoom to 100% and center image
     */
    _resetZoom() {
      this._panX = 0;
      this._panY = 0;
      this._setZoom(100);
    }
  }

  // ============================================
  // Export to namespace
  // ============================================

  CodeEditor.IDE = CodeEditor.IDE || {};
  CodeEditor.IDE.EditorPane = EditorPane;

})(window.CodeEditor = window.CodeEditor || {});
