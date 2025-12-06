/**
 * @fileoverview Auto-complete UI component
 * @module features/AutoComplete
 */

import { CompletionItemKind } from '../language/providers/CompletionProvider.js';

// ============================================
// Constants
// ============================================

const AUTOCOMPLETE_DEBOUNCE_MS = 100;
const MAX_VISIBLE_ITEMS = 10;
const ITEM_HEIGHT = 24;

// Trigger characters that should show autocomplete
const TRIGGER_CHARACTERS = ['.', '(', '"', "'", '`', '/'];

// ============================================
// AutoComplete Class
// ============================================

/**
 * Auto-complete popup UI component
 */
export class AutoComplete {
  // ----------------------------------------
  // Instance Properties
  // ----------------------------------------
  _editor = null;
  _container = null;
  _listElement = null;
  _items = [];
  _selectedIndex = 0;
  _visible = false;
  _updateTimer = null;
  _disposed = false;

  // ----------------------------------------
  // Constructor
  // ----------------------------------------

  /**
   * @param {Editor} editor - Editor instance
   */
  constructor(editor) {
    this._editor = editor;
    this._initialize();
  }

  // ----------------------------------------
  // Initialization
  // ----------------------------------------

  _initialize() {
    this._createDOM();
    this._bindEvents();
  }

  _createDOM() {
    // Create container
    this._container = document.createElement('div');
    this._container.className = 'ec-autocomplete';
    this._container.style.display = 'none';

    // Create list
    this._listElement = document.createElement('ul');
    this._listElement.className = 'ec-autocomplete-list';

    this._container.appendChild(this._listElement);

    // Add to editor container
    this._editor.view.contentElement.appendChild(this._container);
  }

  _bindEvents() {
    // Input events
    this._editor.on('input', () => this._scheduleUpdate());

    // Selection change
    this._editor.on('selectionChange', () => {
      if (this._visible) {
        this._scheduleUpdate();
      }
    });

    // Keyboard events
    this._editor.view.contentElement.addEventListener(
      'keydown',
      (e) => {
        this._handleKeyDown(e);
      },
      true
    );

    // Click outside to hide
    document.addEventListener('click', (e) => {
      if (!this._container.contains(e.target)) {
        this.hide();
      }
    });

    // Focus/blur
    this._editor.on('blur', () => {
      // Delay hide to allow click on item
      setTimeout(() => {
        if (!this._container.contains(document.activeElement)) {
          this.hide();
        }
      }, 100);
    });
  }

  // ----------------------------------------
  // Update Logic
  // ----------------------------------------

  _scheduleUpdate() {
    if (this._updateTimer) {
      clearTimeout(this._updateTimer);
    }

    this._updateTimer = setTimeout(() => {
      this._update();
    }, AUTOCOMPLETE_DEBOUNCE_MS);
  }

  _update() {
    const { end } = this._editor.getSelection();
    const text = this._editor.document.getText();

    // Check if we should show autocomplete
    if (!this._shouldShow(text, end)) {
      this.hide();
      return;
    }

    // Get completions
    const completions = this._editor.getCompletions();

    if (completions.length === 0) {
      this.hide();
      return;
    }

    // Update items and show
    this._items = completions;
    this._selectedIndex = 0;
    this._render();
    this._position();
    this.show();
  }

  _shouldShow(text, offset) {
    // Don't show if selection
    const { start, end } = this._editor.getSelection();
    if (start !== end) return false;

    // Get character before cursor
    const charBefore = text[offset - 1];

    // Show after trigger character
    if (TRIGGER_CHARACTERS.includes(charBefore)) {
      return true;
    }

    // Show if typing identifier
    const beforeCursor = text.slice(0, offset);
    const wordMatch = beforeCursor.match(/(\w+)$/);

    if (wordMatch && wordMatch[1].length >= 1) {
      return true;
    }

    return false;
  }

  // ----------------------------------------
  // Rendering
  // ----------------------------------------

  _render() {
    this._listElement.innerHTML = '';

    const visibleItems = this._items.slice(0, MAX_VISIBLE_ITEMS);

    visibleItems.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'ec-autocomplete-item';
      if (index === this._selectedIndex) {
        li.classList.add('ec-autocomplete-item-selected');
      }

      // Icon
      const icon = document.createElement('span');
      icon.className = `ec-autocomplete-icon ec-autocomplete-icon-${item.kind}`;
      icon.textContent = this._getIconText(item.kind);
      li.appendChild(icon);

      // Label
      const label = document.createElement('span');
      label.className = 'ec-autocomplete-label';
      label.textContent = item.label;
      li.appendChild(label);

      // Detail
      if (item.detail) {
        const detail = document.createElement('span');
        detail.className = 'ec-autocomplete-detail';
        detail.textContent = item.detail;
        li.appendChild(detail);
      }

      // Click handler
      li.addEventListener('click', () => {
        this._selectedIndex = index;
        this._accept();
      });

      // Hover handler
      li.addEventListener('mouseenter', () => {
        this._selectedIndex = index;
        this._updateSelection();
      });

      this._listElement.appendChild(li);
    });

    // Set container height
    const height = Math.min(visibleItems.length * ITEM_HEIGHT, MAX_VISIBLE_ITEMS * ITEM_HEIGHT);
    this._listElement.style.maxHeight = `${height}px`;
  }

  _updateSelection() {
    const items = this._listElement.querySelectorAll('.ec-autocomplete-item');
    items.forEach((item, index) => {
      if (index === this._selectedIndex) {
        item.classList.add('ec-autocomplete-item-selected');
        // Scroll into view if needed
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('ec-autocomplete-item-selected');
      }
    });
  }

  _position() {
    const cursorRect = this._editor.view.getCursorRect();
    const containerRect = this._editor.view.contentElement.getBoundingClientRect();

    // Position below cursor
    let top = cursorRect.bottom - containerRect.top + 2;
    let left = cursorRect.left - containerRect.left;

    // Check if goes off screen
    const popupHeight = Math.min(this._items.length, MAX_VISIBLE_ITEMS) * ITEM_HEIGHT + 8;
    const popupWidth = 300;

    // Flip above if not enough space below
    if (cursorRect.bottom + popupHeight > window.innerHeight) {
      top = cursorRect.top - containerRect.top - popupHeight - 2;
    }

    // Keep within bounds
    if (left + popupWidth > containerRect.width) {
      left = containerRect.width - popupWidth - 10;
    }

    this._container.style.top = `${top}px`;
    this._container.style.left = `${left}px`;
  }

  _getIconText(kind) {
    switch (kind) {
      case CompletionItemKind.FUNCTION:
      case CompletionItemKind.METHOD:
        return 'ƒ';
      case CompletionItemKind.CLASS:
        return 'C';
      case CompletionItemKind.VARIABLE:
        return 'V';
      case CompletionItemKind.PROPERTY:
      case CompletionItemKind.FIELD:
        return 'P';
      case CompletionItemKind.KEYWORD:
        return 'K';
      case CompletionItemKind.SNIPPET:
        return '{}';
      case CompletionItemKind.CONSTANT:
        return '#';
      default:
        return '•';
    }
  }

  // ----------------------------------------
  // Keyboard Handling
  // ----------------------------------------

  _handleKeyDown(event) {
    if (!this._visible) {
      // Ctrl+Space to trigger
      if (event.key === ' ' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        this._update();
        return;
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        event.stopPropagation();
        this._selectNext();
        break;

      case 'ArrowUp':
        event.preventDefault();
        event.stopPropagation();
        this._selectPrevious();
        break;

      case 'Enter':
      case 'Tab':
        if (this._items.length > 0) {
          event.preventDefault();
          event.stopPropagation();
          this._accept();
        }
        break;

      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        this.hide();
        break;

      case 'ArrowLeft':
      case 'ArrowRight':
        this.hide();
        break;
    }
  }

  _selectNext() {
    this._selectedIndex = Math.min(this._selectedIndex + 1, Math.min(this._items.length, MAX_VISIBLE_ITEMS) - 1);
    this._updateSelection();
  }

  _selectPrevious() {
    this._selectedIndex = Math.max(this._selectedIndex - 1, 0);
    this._updateSelection();
  }

  _accept() {
    const item = this._items[this._selectedIndex];
    if (!item) return;

    const { end } = this._editor.getSelection();
    const text = this._editor.document.getText();

    // Find word start
    let wordStart = end;
    while (wordStart > 0 && /\w/.test(text[wordStart - 1])) {
      wordStart--;
    }

    // Handle dot completion
    if (text[wordStart - 1] === '.') {
      // Keep the dot, insert after it
      wordStart = end;
      while (wordStart > 0 && /\w/.test(text[wordStart - 1])) {
        wordStart--;
      }
    }

    // Get text to insert
    let insertText = item.insertText || item.label;

    // Handle snippets with placeholders
    // For now, just remove placeholders
    insertText = insertText.replace(/\$\{?\d+:?([^}]*)\}?/g, '$1');
    insertText = insertText.replace(/\$\d+/g, '');

    // Replace word with completion
    this._editor.document.replaceRange(wordStart, end, insertText);
    this._editor.setSelection(wordStart + insertText.length, wordStart + insertText.length);

    this.hide();

    // Focus back on editor
    this._editor.focus();
  }

  // ----------------------------------------
  // Visibility
  // ----------------------------------------

  show() {
    if (this._visible) return;
    this._visible = true;
    this._container.style.display = 'block';
  }

  hide() {
    if (!this._visible) return;
    this._visible = false;
    this._container.style.display = 'none';
    this._items = [];
    this._selectedIndex = 0;
  }

  isVisible() {
    return this._visible;
  }

  // ----------------------------------------
  // Manual Trigger
  // ----------------------------------------

  trigger() {
    this._update();
  }

  // ----------------------------------------
  // Cleanup
  // ----------------------------------------

  dispose() {
    if (this._disposed) return;

    if (this._updateTimer) {
      clearTimeout(this._updateTimer);
    }

    this._container?.remove();
    this._disposed = true;
  }
}
