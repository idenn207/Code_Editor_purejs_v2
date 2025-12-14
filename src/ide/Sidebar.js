/**
 * Sidebar - Resizable sidebar container
 *
 * Container for sidebar panels (File Explorer, Search, etc.)
 * Supports resizing via drag handle and keyboard toggle.
 */
(function(CodeEditor) {
  'use strict';

  class Sidebar {
    // ============================================
    // Instance Members
    // ============================================

    _container = null;
    _headerElement = null;
    _contentElement = null;
    _resizerElement = null;
    _listeners = new Map();

    // State
    _width = 250;
    _minWidth = 150;
    _maxWidth = 500;
    _isVisible = true;
    _isResizing = false;
    _startX = 0;
    _startWidth = 0;
    _title = 'EXPLORER';

    // Bound handlers
    _boundHandleResizeStart = null;
    _boundHandleResizeMove = null;
    _boundHandleResizeEnd = null;

    // ============================================
    // Constructor
    // ============================================

    /**
     * Create a new Sidebar
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Sidebar options
     */
    constructor(container, options) {
      options = options || {};
      this._container = container;
      this._width = options.width || 250;
      this._minWidth = options.minWidth || 150;
      this._maxWidth = options.maxWidth || 500;
      this._title = options.title || 'EXPLORER';

      this._createDOM();
      this._bindEvents();
      this._applyWidth();
    }

    // ============================================
    // Public Methods
    // ============================================

    /**
     * Set sidebar width
     * @param {number} width - Width in pixels
     */
    setWidth(width) {
      this._width = Math.min(this._maxWidth, Math.max(this._minWidth, width));
      this._applyWidth();
      this._emit('resize', { width: this._width });
    }

    /**
     * Get current width
     * @returns {number} Width in pixels
     */
    getWidth() {
      return this._width;
    }

    /**
     * Set sidebar visibility
     * @param {boolean} visible - Whether sidebar is visible
     */
    setVisible(visible) {
      this._isVisible = visible;
      this._container.classList.toggle('collapsed', !visible);
      this._emit('visibilityChange', { visible: visible });
    }

    /**
     * Toggle sidebar visibility
     * @returns {boolean} New visibility state
     */
    toggle() {
      this.setVisible(!this._isVisible);
      return this._isVisible;
    }

    /**
     * Get visibility state
     * @returns {boolean}
     */
    isVisible() {
      return this._isVisible;
    }

    /**
     * Set sidebar title
     * @param {string} title - Title text
     */
    setTitle(title) {
      this._title = title;
      var titleEl = this._headerElement.querySelector('.ide-sidebar-title');
      if (titleEl) {
        titleEl.textContent = title;
      }
    }

    /**
     * Get content element for adding panels
     * @returns {HTMLElement}
     */
    getContentElement() {
      return this._contentElement;
    }

    /**
     * Get header element for adding actions
     * @returns {HTMLElement}
     */
    getHeaderElement() {
      return this._headerElement;
    }

    /**
     * Add an action button to the header
     * @param {string} id - Action ID
     * @param {Object} options - Action options
     */
    addHeaderAction(id, options) {
      options = options || {};
      var icon = options.icon || '';
      var tooltip = options.tooltip || '';
      var onClick = options.onClick || null;

      var actionsEl = this._headerElement.querySelector('.ide-sidebar-header-actions');
      if (!actionsEl) return;

      var action = document.createElement('div');
      action.className = 'ide-sidebar-action';
      action.dataset.action = id;
      action.title = tooltip;
      action.innerHTML = icon;

      if (onClick) {
        action.addEventListener('click', onClick);
      }

      actionsEl.appendChild(action);
    }

    /**
     * Dispose Sidebar
     */
    dispose() {
      // Remove event listeners
      document.removeEventListener('mousemove', this._boundHandleResizeMove);
      document.removeEventListener('mouseup', this._boundHandleResizeEnd);

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
      // Clear container
      this._container.innerHTML = '';

      // Header
      this._headerElement = document.createElement('div');
      this._headerElement.className = 'ide-sidebar-header';

      var title = document.createElement('span');
      title.className = 'ide-sidebar-title';
      title.textContent = this._title;
      this._headerElement.appendChild(title);

      var actions = document.createElement('div');
      actions.className = 'ide-sidebar-header-actions';
      this._headerElement.appendChild(actions);

      this._container.appendChild(this._headerElement);

      // Content area
      this._contentElement = document.createElement('div');
      this._contentElement.className = 'ide-sidebar-content';
      this._container.appendChild(this._contentElement);

      // Resize handle
      this._resizerElement = document.createElement('div');
      this._resizerElement.className = 'ide-sidebar-resizer';
      this._container.appendChild(this._resizerElement);
    }

    /**
     * Bind event handlers
     */
    _bindEvents() {
      var self = this;

      // Bind resize handlers
      this._boundHandleResizeStart = function(e) {
        self._handleResizeStart(e);
      };
      this._boundHandleResizeMove = function(e) {
        self._handleResizeMove(e);
      };
      this._boundHandleResizeEnd = function() {
        self._handleResizeEnd();
      };

      this._resizerElement.addEventListener('mousedown', this._boundHandleResizeStart);

      // Double-click to reset width
      this._resizerElement.addEventListener('dblclick', function() {
        self.setWidth(250); // Reset to default
      });
    }

    /**
     * Handle resize start
     * @param {MouseEvent} e
     */
    _handleResizeStart(e) {
      e.preventDefault();
      this._isResizing = true;
      this._startX = e.clientX;
      this._startWidth = this._width;

      // Add active class to resizer
      this._resizerElement.classList.add('active');

      // Add document listeners
      document.addEventListener('mousemove', this._boundHandleResizeMove);
      document.addEventListener('mouseup', this._boundHandleResizeEnd);

      // Prevent text selection during resize
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    }

    /**
     * Handle resize move
     * @param {MouseEvent} e
     */
    _handleResizeMove(e) {
      if (!this._isResizing) return;

      var delta = e.clientX - this._startX;
      var newWidth = this._startWidth + delta;
      this.setWidth(newWidth);
    }

    /**
     * Handle resize end
     */
    _handleResizeEnd() {
      this._isResizing = false;

      // Remove active class from resizer
      this._resizerElement.classList.remove('active');

      // Remove document listeners
      document.removeEventListener('mousemove', this._boundHandleResizeMove);
      document.removeEventListener('mouseup', this._boundHandleResizeEnd);

      // Restore user select
      document.body.style.userSelect = '';
      document.body.style.cursor = '';

      this._emit('resizeEnd', { width: this._width });
    }

    /**
     * Apply width to container
     */
    _applyWidth() {
      this._container.style.width = this._width + 'px';
    }

    // ============================================
    // Getters
    // ============================================

    get width() {
      return this._width;
    }

    get visible() {
      return this._isVisible;
    }

    get title() {
      return this._title;
    }
  }

  // ============================================
  // Export to namespace
  // ============================================

  CodeEditor.IDE = CodeEditor.IDE || {};
  CodeEditor.IDE.Sidebar = Sidebar;

})(window.CodeEditor = window.CodeEditor || {});
