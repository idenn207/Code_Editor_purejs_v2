/**
 * @fileoverview Autocomplete popup widget
 */

(function(CodeEditor) {
  'use strict';

  // ============================================
  // Constants
  // ============================================

  var MAX_VISIBLE_ITEMS = 10;
  var ITEM_HEIGHT = 24;

  // ============================================
  // AutocompleteWidget Class
  // ============================================

  class AutocompleteWidget {
    // ----------------------------------------
    // Instance Properties
    // ----------------------------------------

    _editor = null;
    _container = null;
    _listElement = null;
    _visible = false;
    _items = [];
    _selectedIndex = 0;
    _currentPrefix = '';

    // Callbacks
    _onSelect = null;
    _onCancel = null;

    // ----------------------------------------
    // Constructor
    // ----------------------------------------

    /**
     * @param {Object} editor - Editor instance
     * @param {Object} callbacks - Event callbacks
     */
    constructor(editor, callbacks) {
      if (!callbacks) callbacks = {};
      this._editor = editor;
      this._onSelect = callbacks.onSelect || function() {};
      this._onCancel = callbacks.onCancel || function() {};

      this._createDOM();
      this._bindEvents();
    }

    // ----------------------------------------
    // DOM Creation
    // ----------------------------------------

    _createDOM() {
      this._container = document.createElement('div');
      this._container.className = 'ec-autocomplete';
      this._container.style.display = 'none';

      this._listElement = document.createElement('ul');
      this._listElement.className = 'ec-autocomplete-list';

      this._container.appendChild(this._listElement);

      this._editor.view.container.appendChild(this._container);
    }

    // ----------------------------------------
    // Event Binding
    // ----------------------------------------

    _bindEvents() {
      var self = this;

      this._listElement.addEventListener('click', function(e) {
        var item = e.target.closest('.ec-autocomplete-item');
        if (item) {
          var index = parseInt(item.dataset.index, 10);
          self._selectedIndex = index;
          self._confirm();
        }
      });

      this._container.addEventListener('mousedown', function(e) {
        e.preventDefault();
        e.stopPropagation();
      });
    }

    // ----------------------------------------
    // Public Methods
    // ----------------------------------------

    /**
     * Show autocomplete popup with items
     * @param {string[]} items - Completion items
     * @param {DOMRect} cursorRect - Cursor position rectangle
     * @param {string} prefix - Current typing prefix
     */
    show(items, cursorRect, prefix) {
      if (prefix === undefined) prefix = '';

      if (items.length === 0) {
        this.hide();
        return;
      }

      this._items = items;
      this._selectedIndex = 0;
      this._visible = true;
      this._currentPrefix = prefix;

      this._renderItems();
      this._positionWidget(cursorRect);

      this._container.style.display = 'block';
    }

    /**
     * Hide the autocomplete popup
     */
    hide() {
      if (!this._visible) return;

      this._visible = false;
      this._container.style.display = 'none';
      this._items = [];
      this._selectedIndex = 0;
    }

    /**
     * Check if widget is visible
     * @returns {boolean}
     */
    isVisible() {
      return this._visible;
    }

    /**
     * Handle keyboard events
     * @param {KeyboardEvent} e - Keyboard event
     * @returns {boolean} True if event was handled
     */
    handleKeyDown(e) {
      if (!this._visible) return false;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          e.stopImmediatePropagation();
          this._selectNext();
          return true;

        case 'ArrowUp':
          e.preventDefault();
          e.stopImmediatePropagation();
          this._selectPrevious();
          return true;

        case 'Enter':
        case 'Tab':
          e.preventDefault();
          e.stopImmediatePropagation();
          this._confirm();
          return true;

        case 'Escape':
          e.preventDefault();
          e.stopImmediatePropagation();
          this.hide();
          this._onCancel();
          return true;

        default:
          return false;
      }
    }

    /**
     * Update items (for filtering while typing)
     * @param {string[]} items - New filtered items
     * @param {string} prefix - Current typing prefix
     */
    updateItems(items, prefix) {
      if (prefix === undefined) prefix = '';

      if (items.length === 0) {
        this.hide();
        return;
      }

      this._items = items;
      this._selectedIndex = Math.min(this._selectedIndex, items.length - 1);
      if (prefix) {
        this._currentPrefix = prefix;
      }
      this._renderItems();
    }

    /**
     * Set the current prefix for highlighting
     * @param {string} prefix
     */
    setPrefix(prefix) {
      this._currentPrefix = prefix;
      this._renderItems();
    }

    /**
     * Get the currently selected item
     * @returns {string|{label: string, insertText: string}|null}
     */
    getSelectedItem() {
      if (this._items.length === 0) return null;
      return this._items[this._selectedIndex];
    }

    /**
     * Get label from an item
     * @param {string|{label: string}} item
     * @returns {string}
     */
    _getLabel(item) {
      return typeof item === 'string' ? item : item.label;
    }

    /**
     * Get insert text from an item
     * @param {string|{label: string, insertText: string}} item
     * @returns {string}
     */
    _getInsertText(item) {
      if (typeof item === 'string') return item;
      return item.insertText !== undefined ? item.insertText : item.label;
    }

    /**
     * Get cursor offset from an item
     * @param {string|{cursorOffset: number}} item
     * @returns {number|null}
     */
    _getCursorOffset(item) {
      if (typeof item === 'string') return null;
      return item.cursorOffset !== undefined ? item.cursorOffset : null;
    }

    // ----------------------------------------
    // Private Methods
    // ----------------------------------------

    _renderItems() {
      var self = this;
      this._listElement.innerHTML = '';

      this._items.forEach(function(item, index) {
        var li = document.createElement('li');
        li.className = 'ec-autocomplete-item';
        li.dataset.index = index;

        var label = self._getLabel(item);
        var prefix = self._currentPrefix;

        if (prefix && label.toLowerCase().indexOf(prefix.toLowerCase()) === 0) {
          var matchSpan = document.createElement('span');
          matchSpan.className = 'ec-autocomplete-match';
          matchSpan.textContent = label.slice(0, prefix.length);

          var restSpan = document.createElement('span');
          restSpan.textContent = label.slice(prefix.length);

          li.appendChild(matchSpan);
          li.appendChild(restSpan);
        } else {
          li.textContent = label;
        }

        if (index === self._selectedIndex) {
          li.classList.add('selected');
        }

        self._listElement.appendChild(li);
      });

      this._scrollToSelected();
    }

    _positionWidget(cursorRect) {
      var containerRect = this._editor.view.container.getBoundingClientRect();

      var widgetHeight = Math.min(this._items.length, MAX_VISIBLE_ITEMS) * ITEM_HEIGHT + 8;
      var widgetWidth = 220;

      var top = cursorRect.bottom - containerRect.top;
      var left = cursorRect.left - containerRect.left;

      var containerBottom = containerRect.height;
      if (top + widgetHeight > containerBottom) {
        var aboveTop = cursorRect.top - containerRect.top - widgetHeight;
        if (aboveTop >= 0) {
          top = aboveTop;
        } else {
          top = Math.max(0, containerBottom - widgetHeight - 10);
        }
      }

      if (left + widgetWidth > containerRect.width) {
        left = Math.max(0, containerRect.width - widgetWidth - 10);
      }
      if (left < 0) left = 10;

      if (top < 0) top = 10;

      this._container.style.top = top + 'px';
      this._container.style.left = left + 'px';
      this._container.style.maxHeight = Math.min(widgetHeight, containerRect.height - top - 10) + 'px';
    }

    _selectNext() {
      if (this._items.length === 0) return;

      this._selectedIndex = (this._selectedIndex + 1) % this._items.length;
      this._updateSelection();
    }

    _selectPrevious() {
      if (this._items.length === 0) return;

      this._selectedIndex = (this._selectedIndex - 1 + this._items.length) % this._items.length;
      this._updateSelection();
    }

    _updateSelection() {
      var self = this;
      var items = this._listElement.querySelectorAll('.ec-autocomplete-item');
      items.forEach(function(item, index) {
        item.classList.toggle('selected', index === self._selectedIndex);
      });
      this._scrollToSelected();
    }

    _scrollToSelected() {
      var selectedItem = this._listElement.querySelector('.ec-autocomplete-item.selected');
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
      }
    }

    _confirm() {
      var selectedItem = this.getSelectedItem();
      if (selectedItem) {
        this._onSelect(this._getInsertText(selectedItem), this._getCursorOffset(selectedItem));
      }
      this.hide();
    }

    // ----------------------------------------
    // Lifecycle
    // ----------------------------------------

    /**
     * Clean up resources
     */
    dispose() {
      if (this._container) this._container.remove();
      this._editor = null;
    }
  }

  // ============================================
  // Export to Namespace
  // ============================================

  CodeEditor.AutocompleteWidget = AutocompleteWidget;

})(window.CodeEditor = window.CodeEditor || {});
