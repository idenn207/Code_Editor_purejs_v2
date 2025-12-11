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
      // Close the tab in WorkspaceService
      if (this._workspaceService) {
        this._workspaceService.closeTabById(tabId);
      }
      this._emit('tabClose', { tabId });
    });

    this._tabBar.on('tabCloseRequest', ({ tab, tabId }) => {
      // Show confirmation dialog for unsaved changes
      this._showUnsavedChangesDialog(tab, tabId);
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
   * Show unsaved changes confirmation dialog
   * @param {Tab} tab - Tab with unsaved changes
   * @param {string} tabId - Tab ID
   */
  _showUnsavedChangesDialog(tab, tabId) {
    // Create dialog overlay
    const overlay = document.createElement('div');
    overlay.className = 'ide-dialog-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'ide-dialog';

    dialog.innerHTML = `
      <div class="ide-dialog-header">Unsaved Changes</div>
      <div class="ide-dialog-content">
        Do you want to save the changes you made to <strong>${tab.name}</strong>?
        <br><br>
        Your changes will be lost if you don't save them.
      </div>
      <div class="ide-dialog-footer">
        <button class="ide-dialog-btn ide-dialog-btn-secondary" data-action="cancel">Cancel</button>
        <button class="ide-dialog-btn ide-dialog-btn-secondary" data-action="dont-save">Don't Save</button>
        <button class="ide-dialog-btn ide-dialog-btn-primary" data-action="save">Save</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Focus the Save button
    const saveBtn = dialog.querySelector('[data-action="save"]');
    saveBtn?.focus();

    // Handle button clicks
    const handleAction = async (action) => {
      overlay.remove();

      if (action === 'cancel') {
        // Do nothing, keep tab open
        return;
      }

      if (action === 'save') {
        // Save the file first, then close
        await this._saveAndCloseTab(tab, tabId);
      } else if (action === 'dont-save') {
        // Close without saving
        this._closeTabWithoutSaving(tabId);
      }
    };

    // Button click handlers
    dialog.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (btn) {
        handleAction(btn.dataset.action);
      }
    });

    // Keyboard handlers (Escape = Cancel, Enter = Save)
    const handleKeyDown = (e) => {
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
    overlay.addEventListener('click', (e) => {
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
        // Sync content from editor to tab and file service
        const content = this._editor.getValue();
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
      this._emit('error', { message: 'Failed to save file', error: err });
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
    this._emit('tabClose', { tabId });
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
