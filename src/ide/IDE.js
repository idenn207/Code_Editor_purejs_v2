/**
 * IDE - Main IDE Orchestrator
 *
 * Creates and manages the IDE DOM structure and coordinates all IDE components.
 * Follows VSCode layout: Activity Bar | Sidebar | Editor Area | Status Bar
 */
(function(CodeEditor) {
  'use strict';

  // Get dependencies
  var ActivityBar = CodeEditor.IDE.ActivityBar;
  var Sidebar = CodeEditor.IDE.Sidebar;
  var SplitContainer = CodeEditor.IDE.SplitContainer;
  var StatusBar = CodeEditor.IDE.StatusBar;
  var FileExplorer = CodeEditor.IDE.FileExplorer;
  var SearchPanel = CodeEditor.IDE.SearchPanel;
  var FileService = CodeEditor.FileService;
  var WorkspaceService = CodeEditor.WorkspaceService;
  var GlobalSearchService = CodeEditor.GlobalSearchService;

  class IDE {
    // ============================================
    // Instance Members
    // ============================================

    _container = null;
    _options = {};
    _listeners = new Map();

    // DOM Elements
    _rootElement = null;
    _mainElement = null;

    // Components
    _activityBar = null;
    _sidebar = null;
    _splitContainer = null;
    _statusBar = null;
    _fileExplorer = null;
    _searchPanel = null;

    // Services
    _fileService = null;
    _workspaceService = null;
    _globalSearchService = null;

    // State
    _isSidebarVisible = true;
    _activeView = 'explorer';

    // ============================================
    // Constructor
    // ============================================

    /**
     * Create a new IDE instance
     * @param {HTMLElement} container - Container element
     * @param {Object} options - IDE options
     */
    constructor(container, options) {
      var defaultOptions = {
        sidebarWidth: 250,
        sidebarMinWidth: 150,
        sidebarMaxWidth: 500,
        showActivityBar: true,
        showSidebar: true,
        showStatusBar: true,
        theme: 'dark',
      };
      options = options || {};
      this._container = container;
      this._options = {};
      for (var key in defaultOptions) {
        this._options[key] = options[key] !== undefined ? options[key] : defaultOptions[key];
      }

      this._initServices();
      this._createDOM();
      this._initComponents();
      this._bindEvents();
      this._applyTheme(this._options.theme);
    }

    // ============================================
    // Public Methods
    // ============================================

    /**
     * Open a folder using File System Access API
     * @returns {Promise<FileNode|null>} Root node or null if cancelled
     */
    async openFolder() {
      try {
        var rootNode = await this._fileService.openFolder();
        if (rootNode) {
          this._workspaceService.setRootFolder(rootNode);
          this._fileExplorer.setRoot(rootNode);
          this._statusBar.setFolderOpened(true);
          this._emit('folderOpened', { root: rootNode });
        }
        return rootNode;
      } catch (err) {
        console.error('Failed to open folder:', err);
        this._emit('error', { message: 'Failed to open folder', error: err });
        return null;
      }
    }

    /**
     * Open a file
     * @param {string} path - File path
     * @param {FileNode} node - Optional file node
     */
    async openFile(path, node) {
      node = node || null;
      try {
        var tab = await this._workspaceService.openFile(path, node);
        if (tab) {
          this._emit('fileOpened', { path: path, tab: tab });
        }
      } catch (err) {
        console.error('Failed to open file:', err);
        this._emit('error', { message: 'Failed to open file', error: err });
      }
    }

    /**
     * Save the current file
     */
    async saveCurrentFile() {
      try {
        var activeTab = this._splitContainer.getCurrentTab();
        if (activeTab && activeTab.isDirty) {
          // Sync content from editor to tab and file service before saving
          var editor = this._splitContainer.getEditor();
          if (editor) {
            var content = editor.getValue();
            activeTab.setContent(content);
            this._fileService.updateFileContent(activeTab.path, content);
          }

          await this._fileService.saveFile(activeTab.path);
          activeTab.markClean();
          this._splitContainer.updateTabDirty(activeTab.id, false);
          this._emit('fileSaved', { path: activeTab.path });
        }
      } catch (err) {
        console.error('Failed to save file:', err);
        this._emit('error', { message: 'Failed to save file', error: err });
      }
    }

    /**
     * Toggle sidebar visibility
     */
    toggleSidebar() {
      this._isSidebarVisible = !this._isSidebarVisible;
      this._sidebar.setVisible(this._isSidebarVisible);
      this._emit('sidebarToggled', { visible: this._isSidebarVisible });
    }

    /**
     * Show sidebar
     */
    showSidebar() {
      this._isSidebarVisible = true;
      this._sidebar.setVisible(true);
      this._emit('sidebarToggled', { visible: true });
    }

    /**
     * Hide sidebar
     */
    hideSidebar() {
      this._isSidebarVisible = false;
      this._sidebar.setVisible(false);
      this._emit('sidebarToggled', { visible: false });
    }

    /**
     * Set active view in sidebar
     * @param {string} viewId - View ID ('explorer', 'search', etc.)
     */
    setActiveView(viewId) {
      this._activeView = viewId;
      this._activityBar.setActiveView(viewId);

      // Show sidebar if hidden when changing views
      if (!this._isSidebarVisible) {
        this.showSidebar();
      }

      this._emit('viewChanged', { view: viewId });
    }

    /**
     * Set IDE theme
     * @param {string} theme - 'dark' or 'light'
     */
    setTheme(theme) {
      this._applyTheme(theme);
      this._emit('themeChanged', { theme: theme });
    }

    /**
     * Get the editor instance from active pane
     * @returns {Editor} Editor instance
     */
    getEditor() {
      return this._splitContainer ? this._splitContainer.getEditor() : null;
    }

    /**
     * Get the SplitContainer instance
     * @returns {SplitContainer}
     */
    getSplitContainer() {
      return this._splitContainer;
    }

    /**
     * Split the active editor pane
     * @param {string} direction - 'horizontal' or 'vertical'
     */
    splitActivePane(direction) {
      if (this._splitContainer) {
        this._splitContainer.splitPane(direction);
      }
    }

    /**
     * Get file service
     * @returns {FileService}
     */
    getFileService() {
      return this._fileService;
    }

    /**
     * Get workspace service
     * @returns {WorkspaceService}
     */
    getWorkspaceService() {
      return this._workspaceService;
    }

    /**
     * Focus the editor
     */
    focusEditor() {
      if (this._splitContainer) {
        this._splitContainer.focusEditor();
      }
    }

    /**
     * Dispose IDE and cleanup
     */
    dispose() {
      if (this._activityBar) this._activityBar.dispose();
      if (this._sidebar) this._sidebar.dispose();
      if (this._splitContainer) this._splitContainer.dispose();
      if (this._statusBar) this._statusBar.dispose();
      if (this._fileExplorer) this._fileExplorer.dispose();
      if (this._searchPanel) this._searchPanel.dispose();
      this._listeners.clear();

      if (this._rootElement && this._rootElement.parentNode) {
        this._rootElement.parentNode.removeChild(this._rootElement);
      }

      // Remove keyboard handler
      if (this._boundHandleKeyDown) {
        document.removeEventListener('keydown', this._boundHandleKeyDown);
      }
    }

    // ============================================
    // Event System
    // ============================================

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     * @returns {Function} Unsubscribe function
     */
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

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     */
    off(event, callback) {
      var listeners = this._listeners.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    _emit(event, data) {
      var listeners = this._listeners.get(event);
      if (listeners) {
        listeners.forEach(function(callback) {
          try {
            callback(data);
          } catch (err) {
            console.error('Error in IDE event listener for "' + event + '":', err);
          }
        });
      }
    }

    // ============================================
    // Private Methods - Initialization
    // ============================================

    /**
     * Initialize services
     */
    _initServices() {
      this._fileService = new FileService();
      this._workspaceService = new WorkspaceService(this._fileService);
    }

    /**
     * Create DOM structure
     */
    _createDOM() {
      // Root element
      this._rootElement = document.createElement('div');
      this._rootElement.className = 'ide-root';

      // Main container (Activity Bar + Sidebar + Editor Area)
      this._mainElement = document.createElement('div');
      this._mainElement.className = 'ide-main';
      this._rootElement.appendChild(this._mainElement);

      // Activity Bar container
      this._activityBarContainer = document.createElement('div');
      this._activityBarContainer.className = 'ide-activity-bar';
      if (this._options.showActivityBar) {
        this._mainElement.appendChild(this._activityBarContainer);
      }

      // Sidebar container
      this._sidebarContainer = document.createElement('div');
      this._sidebarContainer.className = 'ide-sidebar';
      this._sidebarContainer.style.width = this._options.sidebarWidth + 'px';
      if (this._options.showSidebar) {
        this._mainElement.appendChild(this._sidebarContainer);
      }

      // Editor Area container
      this._editorAreaContainer = document.createElement('div');
      this._editorAreaContainer.className = 'ide-editor-area';
      this._mainElement.appendChild(this._editorAreaContainer);

      // Status Bar container
      this._statusBarContainer = document.createElement('div');
      this._statusBarContainer.className = 'ide-status-bar';
      if (this._options.showStatusBar) {
        this._rootElement.appendChild(this._statusBarContainer);
      }

      // Append to container
      this._container.appendChild(this._rootElement);
    }

    /**
     * Initialize components
     */
    _initComponents() {
      // Activity Bar
      if (this._options.showActivityBar) {
        this._activityBar = new ActivityBar(this._activityBarContainer, {
          activeView: this._activeView,
        });
      }

      // Sidebar with File Explorer and Search Panel
      if (this._options.showSidebar) {
        this._sidebar = new Sidebar(this._sidebarContainer, {
          width: this._options.sidebarWidth,
          minWidth: this._options.sidebarMinWidth,
          maxWidth: this._options.sidebarMaxWidth,
        });

        // File Explorer
        this._fileExplorer = new FileExplorer(this._sidebar.getContentElement(), {
          fileService: this._fileService,
        });

        // Global Search Service and Panel
        this._globalSearchService = new GlobalSearchService(
          this._fileService,
          this._workspaceService
        );
        this._searchPanel = new SearchPanel(this._sidebar.getContentElement(), {
          ide: this,
          searchService: this._globalSearchService,
        });
      }

      // Split Container (replaces EditorArea)
      this._splitContainer = new SplitContainer(this._editorAreaContainer, {
        workspaceService: this._workspaceService,
        fileService: this._fileService,
      });

      // Status Bar
      if (this._options.showStatusBar) {
        this._statusBar = new StatusBar(this._statusBarContainer, {
          editor: this._splitContainer.getEditor(),
        });
      }
    }

    /**
     * Bind events between components
     */
    _bindEvents() {
      var self = this;

      // Activity Bar view change
      if (this._activityBar) {
        this._activityBar.on('viewChange', function(data) {
          var previousView = self._activeView;
          self._activeView = data.view;

          // Switch between views
          if (data.view === 'explorer') {
            if (self._fileExplorer) self._fileExplorer.show();
            if (self._searchPanel) self._searchPanel.hide();
            self._sidebar.setTitle('EXPLORER');
          } else if (data.view === 'search') {
            if (self._fileExplorer) self._fileExplorer.hide();
            if (self._searchPanel) {
              self._searchPanel.show();
              self._searchPanel.focus();
            }
            self._sidebar.setTitle('SEARCH');
          }

          // Show sidebar if hidden when changing views
          if (!self._isSidebarVisible) {
            self.showSidebar();
          }

          self._emit('viewChanged', { view: data.view, previousView: previousView });
        });
      }

      // Sidebar resize
      if (this._sidebar) {
        this._sidebar.on('resize', function(data) {
          self._emit('sidebarResized', { width: data.width });
        });
      }

      // File Explorer file selection
      if (this._fileExplorer) {
        this._fileExplorer.on('fileSelect', function(data) {
          self.openFile(data.path, data.node);
        });

        this._fileExplorer.on('openFolder', function() {
          self.openFolder();
        });
      }

      // SplitContainer events
      if (this._splitContainer) {
        this._splitContainer.on('tabActivate', function(data) {
          // Update status bar
          if (self._statusBar) {
            self._statusBar.setLanguage(data.tab.language);
          }
          self._emit('tabActivated', { tab: data.tab });
        });

        this._splitContainer.on('tabClose', function(data) {
          self._emit('tabClosed', { tabId: data.tabId });
        });

        this._splitContainer.on('contentChange', function() {
          self._emit('contentChanged', {});
        });

        this._splitContainer.on('openFolder', function() {
          self.openFolder();
        });

        this._splitContainer.on('activePaneChanged', function(data) {
          // Update status bar with new pane's editor
          if (self._statusBar && data.pane) {
            var currentTab = data.pane.getCurrentTab();
            if (currentTab) {
              self._statusBar.setLanguage(currentTab.language);
            }
          }
        });
      }

      // Workspace Service events
      this._workspaceService.on('tabOpened', function(data) {
        self._splitContainer.addTab(data.tab);
      });

      this._workspaceService.on('tabActivated', function(data) {
        self._splitContainer.activateTab(data.tab.id);
        // Update status bar language
        if (self._statusBar) {
          self._statusBar.setLanguage(data.tab.language);
        }
      });

      this._workspaceService.on('tabClosed', function(data) {
        self._splitContainer.removeTab(data.tab.id);
      });

      // Keyboard shortcuts
      this._boundHandleKeyDown = function(e) {
        self._handleKeyDown(e);
      };
      document.addEventListener('keydown', this._boundHandleKeyDown);
    }

    /**
     * Handle global keyboard shortcuts
     * @param {KeyboardEvent} e
     */
    _handleKeyDown(e) {
      // Ctrl+B: Toggle sidebar
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        this.toggleSidebar();
      }

      // Ctrl+S: Save file
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.saveCurrentFile();
      }

      // Ctrl+Shift+E: Focus explorer
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        this.setActiveView('explorer');
        if (this._fileExplorer) this._fileExplorer.focus();
      }

      // Ctrl+Shift+F: Open search in files
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        this.setActiveView('search');
      }

      // Ctrl+\: Split editor right (horizontal)
      if (e.ctrlKey && e.key === '\\') {
        e.preventDefault();
        this.splitActivePane('horizontal');
      }

      // Ctrl+Shift+\: Split editor down (vertical)
      if (e.ctrlKey && e.shiftKey && e.key === '|') {
        e.preventDefault();
        this.splitActivePane('vertical');
      }
    }

    /**
     * Apply theme to IDE
     * @param {string} theme - 'dark' or 'light'
     */
    _applyTheme(theme) {
      this._rootElement.classList.remove('ide-theme-dark', 'ide-theme-light');
      if (theme === 'light') {
        this._rootElement.classList.add('ide-theme-light');
      }
      this._options.theme = theme;
    }

    // ============================================
    // Getters
    // ============================================

    get container() {
      return this._container;
    }

    get rootElement() {
      return this._rootElement;
    }

    get isSidebarVisible() {
      return this._isSidebarVisible;
    }

    get activeView() {
      return this._activeView;
    }

    get theme() {
      return this._options.theme;
    }
  }

  // ============================================
  // Export to namespace
  // ============================================

  CodeEditor.IDE = CodeEditor.IDE || {};
  CodeEditor.IDE.IDE = IDE;

})(window.CodeEditor = window.CodeEditor || {});
