/**
 * ActivityBar - Left icon navigation bar
 *
 * Vertical icon bar for switching between views (Explorer, Search, etc.)
 * Follows VSCode activity bar design.
 */

export class ActivityBar {
  // ============================================
  // Static Members
  // ============================================

  static VIEWS = {
    EXPLORER: 'explorer',
    SEARCH: 'search',
    GIT: 'git',
    DEBUG: 'debug',
    EXTENSIONS: 'extensions',
  };

  // SVG Icons (VSCode-like)
  static ICONS = {
    explorer: `<svg viewBox="0 0 24 24"><path d="M17.5 0h-9L7 1.5V6H2.5L1 7.5v15.07L2.5 24h12.07L16 22.57V18h4.7l1.3-1.43V4.5L17.5 0zm0 2.12l2.38 2.38H17.5V2.12zm-3 20.38h-12v-15H7v9.07L8.5 18h6v4.5zm6-6h-12v-15H16V6h4.5v10.5z"/></svg>`,
    search: `<svg viewBox="0 0 24 24"><path d="M15.25 0a8.25 8.25 0 0 0-6.18 13.72L1 22.88l1.12 1.12 8.05-9.12A8.251 8.251 0 1 0 15.25 0zm0 15a6.75 6.75 0 1 1 0-13.5 6.75 6.75 0 0 1 0 13.5z"/></svg>`,
    git: `<svg viewBox="0 0 24 24"><path d="M21.007 8.222A3.738 3.738 0 0 0 15.045 5.2a3.737 3.737 0 0 0 1.156 6.583 2.988 2.988 0 0 1-2.668 1.67h-2.99a4.456 4.456 0 0 0-2.989 1.165V7.4a3.737 3.737 0 1 0-1.494 0v9.117a3.776 3.776 0 1 0 1.816.099 2.99 2.99 0 0 1 2.668-1.667h2.99a4.484 4.484 0 0 0 4.223-3.039 3.736 3.736 0 0 0 3.25-3.687zM4.565 3.738a2.242 2.242 0 1 1 4.484 0 2.242 2.242 0 0 1-4.484 0zm4.484 16.441a2.242 2.242 0 1 1-4.484 0 2.242 2.242 0 0 1 4.484 0zm8.221-9.715a2.242 2.242 0 1 1 0-4.485 2.242 2.242 0 0 1 0 4.485z"/></svg>`,
    debug: `<svg viewBox="0 0 24 24"><path d="M10.94 13.5l-1.32 1.32a3.73 3.73 0 0 0-7.24 0L1.06 13.5 0 14.56l1.72 1.72-.22.22V18H0v1.5h1.5v.08c.077.489.214.966.41 1.42L0 22.94 1.06 24l1.65-1.65A4.308 4.308 0 0 0 6 24a4.31 4.31 0 0 0 3.29-1.65L10.94 24 12 22.94 10.09 21c.198-.464.336-.951.41-1.45v-.07H12V18h-1.5v-1.5l-.22-.22L12 14.56l-1.06-1.06zM6 13.5a2.25 2.25 0 0 1 2.25 2.25h-4.5A2.25 2.25 0 0 1 6 13.5zm3 8.25A3 3 0 0 1 6 21a3 3 0 0 1-3-.75v-2.75h6v3zM21 6a3 3 0 0 0-3-3h-3.18a3 3 0 0 0-5.64 0H6a3 3 0 0 0-3 3v6.5h1.5V6A1.5 1.5 0 0 1 6 4.5h3.18a3 3 0 0 0 5.64 0H18A1.5 1.5 0 0 1 19.5 6v6H21V6zm-9-1.5A1.5 1.5 0 1 1 13.5 6 1.5 1.5 0 0 1 12 4.5zm6 9a2.25 2.25 0 0 1 4.5 0v.75h-4.5v-.75zm0 2.25h4.5v3a3 3 0 0 1-4.5.75v-3.75zm4.5-2.25a2.25 2.25 0 0 0-4.5 0H16.5v-1.5l.22-.22L15 10.06l1.06-1.06 1.32 1.32a3.73 3.73 0 0 1 7.24 0l1.32-1.32L27 10.06l-1.72 1.72.22.22v1.5h-1.5zM27 18h-1.5v1.5H27V18zm0 3h-1.5v.08a5.18 5.18 0 0 1-.41 1.42L27 24.44l-1.06 1.06-1.65-1.65a4.31 4.31 0 0 1-3.29 1.65 4.308 4.308 0 0 1-3.29-1.65L16.06 25.5 15 24.44l1.91-1.94a5.18 5.18 0 0 1-.41-1.42v-.08H15V19.5h1.5v-.08c.077-.489.214-.966.41-1.42L15 16.06l1.06-1.06 1.72 1.72.22-.22V15H19.5v1.5z"/></svg>`,
    extensions: `<svg viewBox="0 0 24 24"><path d="M13.5 1.5L15 0h7.5L24 1.5V9l-1.5 1.5H15L13.5 9V1.5zm1.5 0V9h7.5V1.5H15zM0 15l1.5-1.5H9L10.5 15v7.5L9 24H1.5L0 22.5V15zm1.5 0v7.5H9V15H1.5zm0-13.5L0 0h7.5L9 1.5V9L7.5 10.5H0L-1.5 9V1.5zm0 0V9H7.5V1.5H0z"/></svg>`,
    settings: `<svg viewBox="0 0 24 24"><path d="M19.85 8.75l4.15.83v4.84l-4.15.83 2.35 3.52-3.43 3.43-3.52-2.35-.83 4.15H9.58l-.83-4.15-3.52 2.35-3.43-3.43 2.35-3.52L0 13.42V8.58l4.15-.83L1.8 4.23 5.23.8l3.52 2.35L9.58 0h4.84l.83 4.15 3.52-2.35 3.43 3.43-2.35 3.52zM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>`,
    account: `<svg viewBox="0 0 24 24"><path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm0 3.6a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2zM12 21a8.4 8.4 0 0 1-7-3.76c.035-2.32 4.667-3.59 7-3.59 2.32 0 6.965 1.27 7 3.59A8.4 8.4 0 0 1 12 21z"/></svg>`,
  };

  // ============================================
  // Instance Members
  // ============================================

  _container = null;
  _topElement = null;
  _bottomElement = null;
  _items = new Map();
  _activeView = 'explorer';
  _listeners = new Map();

  // ============================================
  // Constructor
  // ============================================

  /**
   * Create a new ActivityBar
   * @param {HTMLElement} container - Container element
   * @param {Object} options - ActivityBar options
   */
  constructor(container, options = {}) {
    this._container = container;
    this._activeView = options.activeView || 'explorer';
    this._createDOM();
    this._createDefaultItems();
  }

  // ============================================
  // Public Methods
  // ============================================

  /**
   * Add an activity item
   * @param {string} id - Unique item ID
   * @param {Object} options - Item options
   */
  addItem(id, options = {}) {
    const {
      icon = '',
      label = '',
      tooltip = '',
      position = 'top',
      badge = null,
      onClick = null,
    } = options;

    // Create item element
    const item = document.createElement('div');
    item.className = 'ide-activity-item';
    item.dataset.view = id;
    item.setAttribute('data-tooltip', tooltip || label);

    // Icon container
    const iconEl = document.createElement('div');
    iconEl.className = 'ide-activity-icon';
    iconEl.innerHTML = ActivityBar.ICONS[icon] || icon;
    item.appendChild(iconEl);

    // Badge (if provided)
    if (badge !== null && badge > 0) {
      const badgeEl = document.createElement('span');
      badgeEl.className = 'ide-activity-badge';
      badgeEl.textContent = badge > 99 ? '99+' : badge.toString();
      item.appendChild(badgeEl);
    }

    // Set active state
    if (id === this._activeView) {
      item.classList.add('active');
    }

    // Click handler
    item.addEventListener('click', () => {
      if (onClick) {
        onClick();
      } else {
        this.setActiveView(id);
      }
    });

    // Store item data
    this._items.set(id, {
      element: item,
      position,
      icon,
      label,
      tooltip,
      badge,
    });

    // Add to DOM
    const targetContainer = position === 'bottom' ? this._bottomElement : this._topElement;
    targetContainer.appendChild(item);
  }

  /**
   * Set the active view
   * @param {string} viewId - View ID
   */
  setActiveView(viewId) {
    const previousView = this._activeView;
    this._activeView = viewId;
    this._updateActiveState();
    this._emit('viewChange', { view: viewId, previousView });
  }

  /**
   * Get the active view
   * @returns {string} Active view ID
   */
  getActiveView() {
    return this._activeView;
  }

  /**
   * Set badge count for an item
   * @param {string} itemId - Item ID
   * @param {number} count - Badge count (0 to hide)
   */
  setBadge(itemId, count) {
    const item = this._items.get(itemId);
    if (!item) return;

    let badgeEl = item.element.querySelector('.ide-activity-badge');

    if (count > 0) {
      if (!badgeEl) {
        badgeEl = document.createElement('span');
        badgeEl.className = 'ide-activity-badge';
        item.element.appendChild(badgeEl);
      }
      badgeEl.textContent = count > 99 ? '99+' : count.toString();
    } else if (badgeEl) {
      badgeEl.remove();
    }

    item.badge = count;
  }

  /**
   * Update item tooltip
   * @param {string} itemId - Item ID
   * @param {string} tooltip - New tooltip text
   */
  setTooltip(itemId, tooltip) {
    const item = this._items.get(itemId);
    if (item) {
      item.element.setAttribute('data-tooltip', tooltip);
      item.tooltip = tooltip;
    }
  }

  /**
   * Show an item
   * @param {string} itemId - Item ID
   */
  showItem(itemId) {
    const item = this._items.get(itemId);
    if (item) {
      item.element.style.display = '';
    }
  }

  /**
   * Hide an item
   * @param {string} itemId - Item ID
   */
  hideItem(itemId) {
    const item = this._items.get(itemId);
    if (item) {
      item.element.style.display = 'none';
    }
  }

  /**
   * Dispose ActivityBar
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
  // Private Methods
  // ============================================

  /**
   * Create DOM structure
   */
  _createDOM() {
    // Clear container
    this._container.innerHTML = '';

    // Top section (main navigation icons)
    this._topElement = document.createElement('div');
    this._topElement.className = 'ide-activity-top';
    this._container.appendChild(this._topElement);

    // Bottom section (settings, account)
    this._bottomElement = document.createElement('div');
    this._bottomElement.className = 'ide-activity-bottom';
    this._container.appendChild(this._bottomElement);
  }

  /**
   * Create default activity items
   */
  _createDefaultItems() {
    // Top items - main navigation
    this.addItem('explorer', {
      icon: 'explorer',
      label: 'Explorer',
      tooltip: 'Explorer (Ctrl+Shift+E)',
      position: 'top',
    });

    this.addItem('search', {
      icon: 'search',
      label: 'Search',
      tooltip: 'Search (Ctrl+Shift+F)',
      position: 'top',
    });

    // Bottom items
    this.addItem('settings', {
      icon: 'settings',
      label: 'Settings',
      tooltip: 'Manage (Settings)',
      position: 'bottom',
      onClick: () => this._emit('settingsClick', {}),
    });
  }

  /**
   * Update active state for all items
   */
  _updateActiveState() {
    this._items.forEach((item, id) => {
      if (id === this._activeView) {
        item.element.classList.add('active');
      } else {
        item.element.classList.remove('active');
      }
    });
  }
}
