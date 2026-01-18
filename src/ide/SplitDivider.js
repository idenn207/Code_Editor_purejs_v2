/**
 * SplitDivider - Draggable divider between split panes
 *
 * Handles mouse drag to resize panes with minimum size constraints.
 */
(function(CodeEditor) {
  'use strict';

  class SplitDivider {
    // ============================================
    // Instance Members
    // ============================================

    _element = null;
    _direction = null; // 'horizontal' | 'vertical'
    _minSize = 100;
    _isDragging = false;
    _listeners = new Map();

    // Bound handlers for cleanup
    _boundMouseMove = null;
    _boundMouseUp = null;

    // ============================================
    // Constructor
    // ============================================

    /**
     * Create a new SplitDivider
     * @param {string} direction - 'horizontal' (left-right) or 'vertical' (top-bottom)
     * @param {Object} options - Divider options
     */
    constructor(direction, options) {
      options = options || {};
      this._direction = direction;
      this._minSize = options.minSize || 100;

      this._createElement();
      this._bindEvents();
    }

    // ============================================
    // Public Methods
    // ============================================

    /**
     * Get the divider element
     * @returns {HTMLElement}
     */
    getElement() {
      return this._element;
    }

    /**
     * Get direction
     * @returns {string}
     */
    getDirection() {
      return this._direction;
    }

    /**
     * Dispose divider
     */
    dispose() {
      this._cleanup();
      if (this._element && this._element.parentNode) {
        this._element.parentNode.removeChild(this._element);
      }
      this._listeners.clear();
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
     * Create divider element
     */
    _createElement() {
      this._element = document.createElement('div');
      this._element.className = 'ide-split-divider ide-split-divider-' + this._direction;
    }

    /**
     * Bind event handlers
     */
    _bindEvents() {
      var self = this;

      this._boundMouseMove = function(e) {
        self._handleMouseMove(e);
      };

      this._boundMouseUp = function(e) {
        self._handleMouseUp(e);
      };

      this._element.addEventListener('mousedown', function(e) {
        self._handleMouseDown(e);
      });
    }

    /**
     * Handle mouse down - start dragging
     * @param {MouseEvent} e
     */
    _handleMouseDown(e) {
      e.preventDefault();
      this._isDragging = true;
      this._element.classList.add('active');

      // Add document listeners
      document.addEventListener('mousemove', this._boundMouseMove);
      document.addEventListener('mouseup', this._boundMouseUp);

      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
      document.body.style.cursor = this._direction === 'horizontal' ? 'col-resize' : 'row-resize';

      this._emit('dragStart', {
        direction: this._direction,
        clientX: e.clientX,
        clientY: e.clientY,
      });
    }

    /**
     * Handle mouse move - update position
     * @param {MouseEvent} e
     */
    _handleMouseMove(e) {
      if (!this._isDragging) return;

      this._emit('drag', {
        direction: this._direction,
        clientX: e.clientX,
        clientY: e.clientY,
      });
    }

    /**
     * Handle mouse up - end dragging
     * @param {MouseEvent} e
     */
    _handleMouseUp(e) {
      if (!this._isDragging) return;

      this._isDragging = false;
      this._element.classList.remove('active');
      this._cleanup();

      this._emit('dragEnd', {
        direction: this._direction,
        clientX: e.clientX,
        clientY: e.clientY,
      });
    }

    /**
     * Clean up document listeners
     */
    _cleanup() {
      document.removeEventListener('mousemove', this._boundMouseMove);
      document.removeEventListener('mouseup', this._boundMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
  }

  // ============================================
  // Export to namespace
  // ============================================

  CodeEditor.IDE = CodeEditor.IDE || {};
  CodeEditor.IDE.SplitDivider = SplitDivider;

})(window.CodeEditor = window.CodeEditor || {});
