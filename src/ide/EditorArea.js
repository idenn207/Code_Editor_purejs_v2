/**
 * EditorArea - Editor container component
 *
 * Container for TabBar and Editor, handles tab switching
 * and manages editor state per tab.
 */

import { TabBar } from './TabBar.js';
import { Tab } from '../model/Tab.js';
import {
  Editor,
  AutoCloseFeature,
  AutocompleteFeature,
  AutoIndentFeature,
  BracketMatchFeature,
  IndentGuideFeature,
  SearchFeature,
  MultiCursorFeature,
} from '../index.js';

export class EditorArea {
  // ============================================
  // Instance Members
  // ============================================

  _container = null;
  _tabBarContainer = null;
  _editorContainer = null;
  _welcomeElement = null;

  _tabBar = null;
  _editor = null;
  _currentTab = null;

  _workspaceService = null;
  _fileService = null;
  _listeners = new Map();

  // Editor features
  _features = {};

  // ============================================
  // Constructor
  // ============================================

  /**
   * Create a new EditorArea
   * @param {HTMLElement} container - Container element
   * @param {Object} options - EditorArea options
   */
  constructor(container, options = {}) {
    this._container = container;
    this._workspaceService = options.workspaceService || null;
    this._fileService = options.fileService || null;

    this._createDOM();
    this._initComponents();
    this._bindEvents();
    this._showWelcome();
  }

  // ============================================
  // Public Methods
  // ============================================

  /**
   * Add a tab
   * @param {Tab} tab - Tab to add
   */
  addTab(tab) {
    this._tabBar.addTab(tab);
    this._hideWelcome();
  }

  /**
   * Remove a tab
   * @param {string} tabId - Tab ID to remove
   */
  removeTab(tabId) {
    this._tabBar.removeTab(tabId);

    // Show welcome if no tabs
    if (this._tabBar.getTabCount() === 0) {
      this._currentTab = null;
      this._editor.setValue('');
      this._showWelcome();
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
   * Focus the editor
   */
  focusEditor() {
    this._editor?.focus();
  }

  /**
   * Dispose EditorArea
   */
  dispose() {
    // Dispose features
    Object.values(this._features).forEach((feature) => {
      if (feature.dispose) feature.dispose();
    });

    this._tabBar?.dispose();
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
      listeners.forEach((cb) => cb(data));
    }
  }

  // ============================================
  // Private Methods - Initialization
  // ============================================

  /**
   * Create DOM structure
   */
  _createDOM() {
    // Clear container
    this._container.innerHTML = '';

    // Tab bar container
    this._tabBarContainer = document.createElement('div');
    this._tabBarContainer.className = 'ide-editor-tabs';
    this._container.appendChild(this._tabBarContainer);

    // Editor container
    this._editorContainer = document.createElement('div');
    this._editorContainer.className = 'ide-editor-container';
    this._container.appendChild(this._editorContainer);

    // Welcome screen
    this._welcomeElement = document.createElement('div');
    this._welcomeElement.className = 'ide-editor-welcome';
    this._welcomeElement.innerHTML = `
      <div class="ide-editor-welcome-logo">{ }</div>
      <div class="ide-editor-welcome-title">Code Editor IDE</div>
      <div class="ide-editor-welcome-subtitle">Open a file or folder to get started</div>
      <div class="ide-editor-welcome-actions">
        <button class="ide-editor-welcome-action" data-action="open-folder">
          Open Folder
          <span class="ide-editor-welcome-shortcut">Ctrl+K Ctrl+O</span>
        </button>
        <button class="ide-editor-welcome-action" data-action="open-file">
          Open File
          <span class="ide-editor-welcome-shortcut">Ctrl+O</span>
        </button>
      </div>
    `;
    this._editorContainer.appendChild(this._welcomeElement);
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

    // Initialize editor features
    this._initFeatures();

    // Hide editor initially (show welcome)
    this._editor.view.container.style.display = 'none';
  }

  /**
   * Initialize editor features
   */
  _initFeatures() {
    // Autocomplete (must be before AutoIndent for Enter key priority)
    this._features.autocomplete = new AutocompleteFeature(this._editor);

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
  }

  /**
   * Bind event handlers
   */
  _bindEvents() {
    // TabBar events
    this._tabBar.on('tabActivate', ({ tabId, tab }) => {
      this._switchToTab(tab);
      this._emit('tabActivate', { tabId, tab });
    });

    this._tabBar.on('tabClose', ({ tabId }) => {
      this._emit('tabClose', { tabId });
    });

    this._tabBar.on('tabCloseRequest', ({ tab, tabId }) => {
      // For now, just close - parent can handle save dialog
      this._tabBar.removeTab(tabId);
      this._emit('tabClose', { tabId });
    });

    // Editor change events
    this._editor.on('change', () => {
      if (this._currentTab) {
        // Update tab content
        this._currentTab.setContent(this._editor.getValue());
        // Update dirty state in TabBar
        this._tabBar.updateTabDirty(this._currentTab.id, this._currentTab.isDirty);
        this._emit('contentChange', { tab: this._currentTab });
      }
    });

    // Editor selection change
    this._editor.on('selectionChange', () => {
      this._emit('selectionChange', {
        selection: this._editor.getSelection(),
        cursorPosition: this._editor.getCursorPosition(),
      });
    });

    // Welcome screen actions
    this._welcomeElement.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]');
      if (action) {
        const actionName = action.dataset.action;
        if (actionName === 'open-folder') {
          this._emit('openFolder', {});
        } else if (actionName === 'open-file') {
          this._emit('openFile', {});
        }
      }
    });
  }

  /**
   * Show welcome screen
   */
  _showWelcome() {
    this._welcomeElement.style.display = '';
    this._editor.view.container.style.display = 'none';
  }

  /**
   * Hide welcome screen
   */
  _hideWelcome() {
    this._welcomeElement.style.display = 'none';
    this._editor.view.container.style.display = '';
  }

  /**
   * Switch to a tab
   * @param {Tab} tab - Tab to switch to
   */
  _switchToTab(tab) {
    // Save current tab state
    if (this._currentTab) {
      this._currentTab.saveState(this._editor);
    }

    // Load new tab
    this._currentTab = tab;

    // Hide welcome, show editor
    this._hideWelcome();

    // Set editor content
    this._editor.setValue(tab.content || '');

    // Set language
    if (tab.language) {
      this._editor.setLanguage(tab.language);
    }

    // Restore tab state (scroll, selection)
    tab.restoreState(this._editor);

    // Focus editor
    this._editor.focus();
  }
}
