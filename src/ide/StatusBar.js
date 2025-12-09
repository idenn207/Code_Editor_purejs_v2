/**
 * StatusBar - Bottom status bar component
 *
 * Displays information like cursor position, language, encoding, line ending,
 * and other status information. Follows VSCode status bar design.
 */

export class StatusBar {
  // ============================================
  // Static Members
  // ============================================

  static POSITIONS = {
    LEFT: 'left',
    RIGHT: 'right',
  };

  // SVG Icons
  static ICONS = {
    branch: `<svg viewBox="0 0 16 16"><path d="M9 4.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm0 1a2.5 2.5 0 0 1 2.45 2H12a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-.55a2.5 2.5 0 0 1-4.9 0H6a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1h.55A2.5 2.5 0 0 1 9 5.5zM3 4.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0zM4.5 6A2.5 2.5 0 0 0 2 8.5v3a.5.5 0 0 0 1 0v-3a1.5 1.5 0 0 1 3 0v3a.5.5 0 0 0 1 0v-3A2.5 2.5 0 0 0 4.5 6z"/></svg>`,
    error: `<svg viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm5.25-2.25a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75zM6 8.75a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5H6z"/></svg>`,
    warning: `<svg viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8.893 1.5c-.183-.31-.52-.5-.887-.5s-.703.19-.886.5L.138 13.5a.998.998 0 0 0 0 1.001c.183.31.52.5.886.5h13.952c.367 0 .704-.19.887-.5a.999.999 0 0 0 0-1.001L8.893 1.5zM8 5.5a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 5.5zM8 12a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>`,
    check: `<svg viewBox="0 0 16 16"><path fill-rule="evenodd" d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/></svg>`,
    sync: `<svg viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 2.5a5.5 5.5 0 0 0-5.061 3.378.75.75 0 0 1-1.378-.596A7.001 7.001 0 0 1 14.5 7H14a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 12 7.75V6.25a.75.75 0 0 1 1.5 0v.25a5.5 5.5 0 0 0-5.5-4zM2.5 9a.75.75 0 0 1 .75.75v.25a5.5 5.5 0 0 0 10.561-2.378.75.75 0 0 1 1.378.596A7.001 7.001 0 0 1 1.5 9H2a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 4 8.25v1.5a.75.75 0 0 1-1.5 0V9.5z"/></svg>`,
    bell: `<svg viewBox="0 0 16 16"><path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zm.995-14.901a1 1 0 1 0-1.99 0A5.002 5.002 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901z"/></svg>`,
  };

  // ============================================
  // Instance Members
  // ============================================

  _container = null;
  _element = null;
  _leftElement = null;
  _rightElement = null;
  _items = new Map();
  _editor = null;
  _listeners = new Map();
  _folderOpened = false;

  // ============================================
  // Constructor
  // ============================================

  /**
   * Create a new StatusBar
   * @param {HTMLElement} container - Container element
   * @param {Object} options - StatusBar options
   */
  constructor(container, options = {}) {
    this._container = container;
    this._editor = options.editor || null;
    this._createDOM();
    this._createDefaultItems();
    this._bindEditorEvents();
  }

  // ============================================
  // Public Methods
  // ============================================

  /**
   * Add a status item
   * @param {string} id - Unique item ID
   * @param {Object} options - Item options
   */
  addItem(id, options = {}) {
    const {
      position = StatusBar.POSITIONS.LEFT,
      icon = null,
      text = '',
      tooltip = '',
      onClick = null,
      priority = 0,
    } = options;

    // Create item element
    const item = document.createElement('div');
    item.className = 'ide-status-item';
    item.dataset.id = id;
    item.dataset.priority = priority;

    if (tooltip) {
      item.title = tooltip;
    }

    // Icon
    if (icon) {
      const iconEl = document.createElement('span');
      iconEl.className = 'ide-status-icon';
      iconEl.innerHTML = StatusBar.ICONS[icon] || icon;
      item.appendChild(iconEl);
    }

    // Text
    const textEl = document.createElement('span');
    textEl.className = 'ide-status-text';
    textEl.textContent = text;
    item.appendChild(textEl);

    // Click handler
    if (onClick) {
      item.addEventListener('click', onClick);
    } else {
      item.classList.add('disabled');
    }

    // Store item data
    this._items.set(id, {
      element: item,
      position,
      icon,
      text,
      tooltip,
      onClick,
      priority,
    });

    // Add to DOM (sorted by priority)
    this._insertItem(item, position, priority);
  }

  /**
   * Update a status item
   * @param {string} id - Item ID
   * @param {Object} updates - Updated properties
   */
  updateItem(id, updates) {
    const item = this._items.get(id);
    if (!item) return;

    const { element } = item;

    if (updates.text !== undefined) {
      const textEl = element.querySelector('.ide-status-text');
      if (textEl) {
        textEl.textContent = updates.text;
      }
      item.text = updates.text;
    }

    if (updates.icon !== undefined) {
      let iconEl = element.querySelector('.ide-status-icon');
      if (updates.icon) {
        if (!iconEl) {
          iconEl = document.createElement('span');
          iconEl.className = 'ide-status-icon';
          element.insertBefore(iconEl, element.firstChild);
        }
        iconEl.innerHTML = StatusBar.ICONS[updates.icon] || updates.icon;
      } else if (iconEl) {
        iconEl.remove();
      }
      item.icon = updates.icon;
    }

    if (updates.tooltip !== undefined) {
      element.title = updates.tooltip;
      item.tooltip = updates.tooltip;
    }

    if (updates.visible !== undefined) {
      element.style.display = updates.visible ? '' : 'none';
    }
  }

  /**
   * Remove a status item
   * @param {string} id - Item ID
   */
  removeItem(id) {
    const item = this._items.get(id);
    if (item) {
      item.element.remove();
      this._items.delete(id);
    }
  }

  /**
   * Show an item
   * @param {string} id - Item ID
   */
  showItem(id) {
    const item = this._items.get(id);
    if (item) {
      item.element.style.display = '';
    }
  }

  /**
   * Hide an item
   * @param {string} id - Item ID
   */
  hideItem(id) {
    const item = this._items.get(id);
    if (item) {
      item.element.style.display = 'none';
    }
  }

  /**
   * Set editor instance
   * @param {Editor} editor - Editor instance
   */
  setEditor(editor) {
    this._editor = editor;
    this._bindEditorEvents();
    this._updateCursorPosition();
  }

  /**
   * Set folder opened state
   * @param {boolean} opened - Whether a folder is opened
   */
  setFolderOpened(opened) {
    this._folderOpened = opened;
    this._container.classList.toggle('no-folder', !opened);
  }

  /**
   * Set language display
   * @param {string} language - Language ID
   */
  setLanguage(language) {
    const displayNames = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      html: 'HTML',
      css: 'CSS',
      json: 'JSON',
      markdown: 'Markdown',
      python: 'Python',
      plaintext: 'Plain Text',
    };
    this.updateItem('language', {
      text: displayNames[language] || language,
    });
  }

  /**
   * Set problems count (errors/warnings)
   * @param {number} errors - Error count
   * @param {number} warnings - Warning count
   */
  setProblems(errors, warnings) {
    const text =
      errors > 0 || warnings > 0 ? `${errors} ${warnings}` : 'No Problems';
    this.updateItem('problems', { text });

    // Update status bar state
    this._container.classList.remove('error', 'warning');
    if (errors > 0) {
      this._container.classList.add('error');
    } else if (warnings > 0) {
      this._container.classList.add('warning');
    }
  }

  /**
   * Set status message (temporary display)
   * @param {string} message - Message to show
   * @param {number} timeout - Auto-hide timeout in ms (0 = no timeout)
   */
  setMessage(message, timeout = 5000) {
    this.updateItem('message', { text: message, visible: true });

    if (timeout > 0) {
      setTimeout(() => {
        this.updateItem('message', { visible: false });
      }, timeout);
    }
  }

  /**
   * Dispose StatusBar
   */
  dispose() {
    this._items.clear();
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

  _emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach((cb) => cb(data));
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Create DOM structure
   */
  _createDOM() {
    // Clear container
    this._container.innerHTML = '';

    // Left section
    this._leftElement = document.createElement('div');
    this._leftElement.className = 'ide-status-left';
    this._container.appendChild(this._leftElement);

    // Right section
    this._rightElement = document.createElement('div');
    this._rightElement.className = 'ide-status-right';
    this._container.appendChild(this._rightElement);

    // Set initial state
    this._container.classList.add('no-folder');
  }

  /**
   * Create default status items
   */
  _createDefaultItems() {
    // Left side items
    this.addItem('branch', {
      position: 'left',
      icon: 'branch',
      text: 'main',
      tooltip: 'Source Control',
      priority: 1,
    });

    this.addItem('sync', {
      position: 'left',
      icon: 'sync',
      text: '',
      tooltip: 'Synchronize Changes',
      priority: 2,
    });

    this.addItem('problems', {
      position: 'left',
      icon: 'error',
      text: '0 0',
      tooltip: 'Problems',
      priority: 3,
    });

    this.addItem('message', {
      position: 'left',
      text: '',
      priority: 10,
    });
    this.hideItem('message');

    // Right side items
    this.addItem('position', {
      position: 'right',
      text: 'Ln 1, Col 1',
      tooltip: 'Go to Line',
      priority: 1,
      onClick: () => this._emit('goToLine', {}),
    });

    this.addItem('selection', {
      position: 'right',
      text: '',
      tooltip: 'Selection',
      priority: 2,
    });
    this.hideItem('selection');

    this.addItem('indentation', {
      position: 'right',
      text: 'Spaces: 2',
      tooltip: 'Select Indentation',
      priority: 3,
      onClick: () => this._emit('selectIndentation', {}),
    });

    this.addItem('encoding', {
      position: 'right',
      text: 'UTF-8',
      tooltip: 'Select Encoding',
      priority: 4,
      onClick: () => this._emit('selectEncoding', {}),
    });

    this.addItem('lineEnding', {
      position: 'right',
      text: 'LF',
      tooltip: 'Select End of Line Sequence',
      priority: 5,
      onClick: () => this._emit('selectLineEnding', {}),
    });

    this.addItem('language', {
      position: 'right',
      text: 'JavaScript',
      tooltip: 'Select Language Mode',
      priority: 6,
      onClick: () => this._emit('selectLanguage', {}),
    });

    this.addItem('notifications', {
      position: 'right',
      icon: 'bell',
      text: '',
      tooltip: 'Notifications',
      priority: 10,
    });
  }

  /**
   * Insert item in sorted order by priority
   * @param {HTMLElement} element - Item element
   * @param {string} position - 'left' or 'right'
   * @param {number} priority - Item priority
   */
  _insertItem(element, position, priority) {
    const container =
      position === 'left' ? this._leftElement : this._rightElement;
    const items = Array.from(container.children);

    // Find insertion point based on priority
    let insertBefore = null;
    for (const item of items) {
      const itemPriority = parseInt(item.dataset.priority || '0', 10);
      if (priority < itemPriority) {
        insertBefore = item;
        break;
      }
    }

    if (insertBefore) {
      container.insertBefore(element, insertBefore);
    } else {
      container.appendChild(element);
    }
  }

  /**
   * Bind editor events
   */
  _bindEditorEvents() {
    if (!this._editor) return;

    // Selection change
    this._editor.on('selectionChange', () => {
      this._updateCursorPosition();
      this._updateSelectionInfo();
    });

    // Language change
    if (this._editor.on) {
      this._editor.on('languageChange', ({ language }) => {
        this.setLanguage(language);
      });
    }
  }

  /**
   * Update cursor position display
   */
  _updateCursorPosition() {
    if (!this._editor) return;

    const pos = this._editor.getCursorPosition();
    this.updateItem('position', {
      text: `Ln ${pos.line + 1}, Col ${pos.column + 1}`,
    });
  }

  /**
   * Update selection info display
   */
  _updateSelectionInfo() {
    if (!this._editor) return;

    const selection = this._editor.getSelection();
    const hasSelection = selection.start !== selection.end;

    if (hasSelection) {
      const selectedText = this._editor.getSelectedText();
      const lines = selectedText.split('\n').length;
      const chars = selectedText.length;

      if (lines > 1) {
        this.updateItem('selection', {
          text: `(${lines} lines, ${chars} chars)`,
          visible: true,
        });
      } else {
        this.updateItem('selection', {
          text: `(${chars} selected)`,
          visible: true,
        });
      }
    } else {
      this.hideItem('selection');
    }
  }
}
