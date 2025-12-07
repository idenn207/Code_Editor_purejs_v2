/**
 * @fileoverview Autocomplete popup widget
 * @module features/autocomplete/AutocompleteWidget
 */

// ============================================
// Constants
// ============================================

const MAX_VISIBLE_ITEMS = 10;
const ITEM_HEIGHT = 24; // px

// ============================================
// AutocompleteWidget Class
// ============================================

export class AutocompleteWidget {
  // ----------------------------------------
  // Instance Properties
  // ----------------------------------------

  _editor = null;
  _container = null;
  _listElement = null;
  _visible = false;
  _items = [];
  _selectedIndex = 0;

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
  constructor(editor, callbacks = {}) {
    this._editor = editor;
    this._onSelect = callbacks.onSelect || (() => {});
    this._onCancel = callbacks.onCancel || (() => {});

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

    // Append to editor container (not content which scrolls)
    this._editor.view.container.appendChild(this._container);
  }

  // ----------------------------------------
  // Event Binding
  // ----------------------------------------

  _bindEvents() {
    // Handle clicks on items
    this._listElement.addEventListener('click', (e) => {
      const item = e.target.closest('.ec-autocomplete-item');
      if (item) {
        const index = parseInt(item.dataset.index, 10);
        this._selectedIndex = index;
        this._confirm();
      }
    });

    // Prevent mouse events from affecting editor
    this._container.addEventListener('mousedown', (e) => {
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
   */
  show(items, cursorRect) {
    if (items.length === 0) {
      this.hide();
      return;
    }

    this._items = items;
    this._selectedIndex = 0;
    this._visible = true;

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
   */
  updateItems(items) {
    if (items.length === 0) {
      this.hide();
      return;
    }

    this._items = items;
    this._selectedIndex = Math.min(this._selectedIndex, items.length - 1);
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
   * Get label from an item (handles both string and object items)
   * @param {string|{label: string}} item
   * @returns {string}
   */
  _getLabel(item) {
    return typeof item === 'string' ? item : item.label;
  }

  /**
   * Get insert text from an item (handles both string and object items)
   * @param {string|{label: string, insertText: string}} item
   * @returns {string}
   */
  _getInsertText(item) {
    if (typeof item === 'string') return item;
    return item.insertText !== undefined ? item.insertText : item.label;
  }

  /**
   * Get cursor offset from an item (for positioning cursor after insertion)
   * @param {string|{cursorOffset: number}} item
   * @returns {number|null} Cursor offset from start of insertion, or null for default
   */
  _getCursorOffset(item) {
    if (typeof item === 'string') return null;
    return item.cursorOffset !== undefined ? item.cursorOffset : null;
  }

  // ----------------------------------------
  // Private Methods
  // ----------------------------------------

  _renderItems() {
    this._listElement.innerHTML = '';

    this._items.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'ec-autocomplete-item';
      li.dataset.index = index;
      li.textContent = this._getLabel(item);

      if (index === this._selectedIndex) {
        li.classList.add('selected');
      }

      this._listElement.appendChild(li);
    });

    // Scroll selected item into view
    this._scrollToSelected();
  }

  _positionWidget(cursorRect) {
    const containerRect = this._editor.view.container.getBoundingClientRect();

    // Calculate widget dimensions
    const widgetHeight = Math.min(this._items.length, MAX_VISIBLE_ITEMS) * ITEM_HEIGHT + 8;
    const widgetWidth = 220; // Fixed width

    // Calculate position relative to container
    let top = cursorRect.bottom - containerRect.top;
    let left = cursorRect.left - containerRect.left;

    // Check if widget would go below container
    const containerBottom = containerRect.height;
    if (top + widgetHeight > containerBottom) {
      // Position above cursor instead
      const aboveTop = cursorRect.top - containerRect.top - widgetHeight;
      if (aboveTop >= 0) {
        top = aboveTop;
      } else {
        // If no room above, constrain to container height
        top = Math.max(0, containerBottom - widgetHeight - 10);
      }
    }

    // Ensure widget stays within container horizontally
    if (left + widgetWidth > containerRect.width) {
      left = Math.max(0, containerRect.width - widgetWidth - 10);
    }
    if (left < 0) left = 10;

    // Ensure top doesn't go negative
    if (top < 0) top = 10;

    this._container.style.top = `${top}px`;
    this._container.style.left = `${left}px`;
    this._container.style.maxHeight = `${Math.min(widgetHeight, containerRect.height - top - 10)}px`;
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
    const items = this._listElement.querySelectorAll('.ec-autocomplete-item');
    items.forEach((item, index) => {
      item.classList.toggle('selected', index === this._selectedIndex);
    });
    this._scrollToSelected();
  }

  _scrollToSelected() {
    const selectedItem = this._listElement.querySelector('.ec-autocomplete-item.selected');
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest' });
    }
  }

  _confirm() {
    const selectedItem = this.getSelectedItem();
    if (selectedItem) {
      // Pass the insert text and cursor offset to the callback
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
    this._container?.remove();
    this._editor = null;
  }
}
