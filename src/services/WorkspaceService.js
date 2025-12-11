/**
 * WorkspaceService - Workspace state management
 *
 * Manages workspace/project state including:
 * - Open tabs tracking
 * - Active tab management
 * - Coordination between FileService and UI components
 */

import { Tab } from '../model/Tab.js';

export class WorkspaceService {
  // ============================================
  // Instance Members
  // ============================================

  _fileService = null;
  _openTabs = [];
  _activeTabIndex = -1;
  _rootNode = null;
  _listeners = new Map();

  // ============================================
  // Constructor
  // ============================================

  /**
   * Create a new WorkspaceService
   * @param {FileService} fileService - File service instance
   */
  constructor(fileService) {
    this._fileService = fileService;
    this._bindFileServiceEvents();
  }

  // ============================================
  // Public Methods - Root/Folder Management
  // ============================================

  /**
   * Set the root folder node
   * @param {FileNode} rootNode - Root folder node
   */
  setRootFolder(rootNode) {
    this._rootNode = rootNode;
    this._emit('rootChanged', { root: rootNode });
  }

  /**
   * Get the root folder node
   * @returns {FileNode|null}
   */
  getRootFolder() {
    return this._rootNode;
  }

  /**
   * Check if a folder is open
   * @returns {boolean}
   */
  hasFolderOpen() {
    return this._rootNode !== null;
  }

  // ============================================
  // Public Methods - Tab Management
  // ============================================

  /**
   * Open a file as a new tab
   * @param {string} path - File path
   * @param {FileNode} node - Optional file node
   * @returns {Promise<Tab>} Created or existing tab
   */
  async openFile(path, node = null) {
    // Check if file is already open
    const existingIndex = this._openTabs.findIndex((t) => t.path === path);
    if (existingIndex !== -1) {
      this.activateTab(existingIndex);
      return this._openTabs[existingIndex];
    }

    // Load file content
    let content = '';
    let handle = null;

    if (node && this._fileService) {
      try {
        const fileData = await this._fileService.readFile(node);
        content = fileData.content;
        handle = fileData.handle;
      } catch (err) {
        console.error('Failed to read file:', err);
        // Continue with empty content
      }
    } else if (this._fileService.hasFile(path)) {
      const fileData = this._fileService.getFile(path);
      content = fileData.content;
      handle = fileData.handle;
    }

    // Create new tab
    const tab = new Tab({
      path,
      content,
      handle,
      language: this._detectLanguage(path),
    });

    // Add to open tabs
    this._openTabs.push(tab);
    const index = this._openTabs.length - 1;

    this._emit('tabOpened', { tab, index });

    // Activate the new tab
    this.activateTab(index);

    return tab;
  }

  /**
   * Close a tab by index
   * @param {number} index - Tab index
   * @returns {boolean} True if closed successfully
   */
  closeTab(index) {
    if (index < 0 || index >= this._openTabs.length) {
      return false;
    }

    const tab = this._openTabs[index];

    // Check if tab is dirty
    if (tab.isDirty) {
      this._emit('tabCloseRequest', { tab, index });
      return false;
    }

    // Remove tab
    this._openTabs.splice(index, 1);

    // Adjust active index
    if (this._activeTabIndex >= this._openTabs.length) {
      this._activeTabIndex = this._openTabs.length - 1;
    } else if (this._activeTabIndex > index) {
      this._activeTabIndex--;
    }

    this._emit('tabClosed', { tab, index });

    // Activate adjacent tab if available
    if (this._activeTabIndex >= 0 && this._openTabs.length > 0) {
      this._emit('tabActivated', {
        tab: this._openTabs[this._activeTabIndex],
        index: this._activeTabIndex,
      });
    }

    return true;
  }

  /**
   * Close a tab by ID
   * @param {string} tabId - Tab ID
   * @returns {boolean} True if closed successfully
   */
  closeTabById(tabId) {
    const index = this._openTabs.findIndex((t) => t.id === tabId);
    if (index === -1) return false;
    return this.closeTab(index);
  }

  /**
   * Force close a tab by ID (skip dirty check)
   * Used when user chooses "Don't Save" in confirmation dialog
   * @param {string} tabId - Tab ID
   * @returns {boolean} True if closed successfully
   */
  forceCloseTabById(tabId) {
    const index = this._openTabs.findIndex((t) => t.id === tabId);
    if (index === -1) return false;

    const tab = this._openTabs[index];

    // Remove tab without checking dirty state
    this._openTabs.splice(index, 1);

    // Adjust active index
    if (this._activeTabIndex >= this._openTabs.length) {
      this._activeTabIndex = this._openTabs.length - 1;
    } else if (this._activeTabIndex > index) {
      this._activeTabIndex--;
    }

    this._emit('tabClosed', { tab, index });

    // Activate adjacent tab if available
    if (this._activeTabIndex >= 0 && this._openTabs.length > 0) {
      this._emit('tabActivated', {
        tab: this._openTabs[this._activeTabIndex],
        index: this._activeTabIndex,
      });
    }

    return true;
  }

  /**
   * Activate a tab by index
   * @param {number} index - Tab index
   */
  activateTab(index) {
    if (index < 0 || index >= this._openTabs.length) return;

    this._activeTabIndex = index;
    const tab = this._openTabs[index];

    this._emit('tabActivated', { tab, index });
  }

  /**
   * Activate a tab by ID
   * @param {string} tabId - Tab ID
   */
  activateTabById(tabId) {
    const index = this._openTabs.findIndex((t) => t.id === tabId);
    if (index !== -1) {
      this.activateTab(index);
    }
  }

  /**
   * Get the active tab
   * @returns {Tab|null}
   */
  getActiveTab() {
    if (this._activeTabIndex < 0 || this._activeTabIndex >= this._openTabs.length) {
      return null;
    }
    return this._openTabs[this._activeTabIndex];
  }

  /**
   * Get active tab index
   * @returns {number}
   */
  getActiveTabIndex() {
    return this._activeTabIndex;
  }

  /**
   * Get all open tabs
   * @returns {Tab[]}
   */
  getOpenTabs() {
    return [...this._openTabs];
  }

  /**
   * Get tab by ID
   * @param {string} tabId - Tab ID
   * @returns {Tab|null}
   */
  getTabById(tabId) {
    return this._openTabs.find((t) => t.id === tabId) || null;
  }

  /**
   * Get tab by path
   * @param {string} path - File path
   * @returns {Tab|null}
   */
  getTabByPath(path) {
    return this._openTabs.find((t) => t.path === path) || null;
  }

  /**
   * Check if a file is open
   * @param {string} path - File path
   * @returns {boolean}
   */
  isFileOpen(path) {
    return this._openTabs.some((t) => t.path === path);
  }

  /**
   * Get open tab count
   * @returns {number}
   */
  getTabCount() {
    return this._openTabs.length;
  }

  /**
   * Update tab content
   * @param {string} tabId - Tab ID
   * @param {string} content - New content
   */
  updateTabContent(tabId, content) {
    const tab = this.getTabById(tabId);
    if (tab) {
      tab.setContent(content);
      // Also update in file service cache
      if (this._fileService && tab.path) {
        this._fileService.updateFileContent(tab.path, content);
      }
      this._emit('tabContentChanged', { tab, content });
    }
  }

  /**
   * Mark tab as saved
   * @param {string} tabId - Tab ID
   */
  markTabSaved(tabId) {
    const tab = this.getTabById(tabId);
    if (tab) {
      tab.markClean();
      this._emit('tabSaved', { tab });
    }
  }

  /**
   * Close all tabs
   * @param {boolean} force - Force close even if dirty
   * @returns {boolean} True if all closed successfully
   */
  closeAllTabs(force = false) {
    if (!force) {
      const hasDirty = this._openTabs.some((t) => t.isDirty);
      if (hasDirty) {
        this._emit('closeAllRequest', { tabs: this._openTabs.filter((t) => t.isDirty) });
        return false;
      }
    }

    const closedTabs = [...this._openTabs];
    this._openTabs = [];
    this._activeTabIndex = -1;

    closedTabs.forEach((tab) => {
      this._emit('tabClosed', { tab, index: -1 });
    });

    this._emit('allTabsClosed', {});
    return true;
  }

  /**
   * Close tabs except active
   */
  closeOtherTabs() {
    const activeTab = this.getActiveTab();
    if (!activeTab) return;

    const tabsToClose = this._openTabs.filter((t) => t.id !== activeTab.id);
    tabsToClose.forEach((tab) => {
      const index = this._openTabs.indexOf(tab);
      if (index !== -1 && !tab.isDirty) {
        this.closeTab(index);
      }
    });
  }

  // ============================================
  // Event System
  // ============================================

  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    return () => this._listeners.get(event).delete(callback);
  }

  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  _emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in WorkspaceService event listener for "${event}":`, err);
        }
      });
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Bind file service events
   */
  _bindFileServiceEvents() {
    if (!this._fileService) return;

    // When a file is saved externally
    this._fileService.on('fileSaved', ({ path }) => {
      const tab = this.getTabByPath(path);
      if (tab) {
        tab.markClean();
        this._emit('tabSaved', { tab });
      }
    });
  }

  /**
   * Detect language from file path
   * @param {string} path - File path
   * @returns {string} Language ID
   */
  _detectLanguage(path) {
    if (!path) return 'plaintext';

    const ext = path.split('.').pop()?.toLowerCase();
    const langMap = {
      js: 'javascript',
      mjs: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      html: 'html',
      htm: 'html',
      css: 'css',
      scss: 'css',
      less: 'css',
      json: 'json',
      md: 'markdown',
      py: 'python',
      rb: 'ruby',
      java: 'java',
      go: 'go',
      rs: 'rust',
      php: 'php',
      sh: 'shell',
      yml: 'yaml',
      yaml: 'yaml',
      xml: 'xml',
      sql: 'sql',
    };

    return langMap[ext] || 'plaintext';
  }
}
