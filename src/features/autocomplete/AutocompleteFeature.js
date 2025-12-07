/**
 * @fileoverview Autocomplete feature - provides code completions
 * @module features/autocomplete/AutocompleteFeature
 */

import { CompletionService } from './CompletionService.js';
import { AutocompleteWidget } from './AutocompleteWidget.js';

// ============================================
// Constants
// ============================================

const DEBOUNCE_DELAY = 100;
const MIN_PREFIX_LENGTH = 1;

// Characters that trigger autocomplete
const TRIGGER_CHARS = /^[\w$]$/;

// Characters that should dismiss autocomplete
// Note: < is excluded because it's an HTML tag trigger
const DISMISS_CHARS = /^[\s;,(){}\[\]>'"=+\-*/%&|^!~?:]$/;

// ============================================
// AutocompleteFeature Class
// ============================================

export class AutocompleteFeature {
  // ----------------------------------------
  // Instance Properties
  // ----------------------------------------

  _editor = null;
  _enabled = true;
  _service = null;
  _widget = null;

  // State
  _triggerPosition = null; // Position where completion was triggered
  _currentPrefix = '';
  _htmlContext = null; // HTML-specific context ('tag', etc.)

  // Bound event handlers
  _boundHandleKeyDown = null;
  _boundHandleInput = null;
  _boundHandleSelectionChange = null;

  // Debounce timer
  _debounceTimer = null;

  // ----------------------------------------
  // Constructor
  // ----------------------------------------

  /**
   * @param {Object} editor - Editor instance
   * @param {Object} options - Configuration options
   * @param {boolean} options.enabled - Whether feature is enabled (default: true)
   */
  constructor(editor, options = {}) {
    this._editor = editor;
    this._enabled = options.enabled !== false;

    // Initialize components
    this._service = new CompletionService();
    this._widget = new AutocompleteWidget(editor, {
      onSelect: (item, cursorOffset) => this._handleSelect(item, cursorOffset),
      onCancel: () => this._handleCancel(),
    });

    this._bindEvents();
  }

  // ----------------------------------------
  // Event Binding
  // ----------------------------------------

  _bindEvents() {
    // Keyboard shortcuts (capture phase to intercept before editor)
    this._boundHandleKeyDown = (e) => this._handleKeyDown(e);
    this._editor.view.contentElement.addEventListener('keydown', this._boundHandleKeyDown, true);

    // Text input
    this._boundHandleInput = (e) => this._handleInput(e);
    this._editor.on('input', this._boundHandleInput);

    // Selection/cursor changes
    this._boundHandleSelectionChange = () => this._handleSelectionChange();
    this._editor.on('selectionChange', this._boundHandleSelectionChange);
  }

  // ----------------------------------------
  // Keyboard Handling
  // ----------------------------------------

  _handleKeyDown(e) {
    if (!this._enabled) return;

    // Let widget handle navigation keys if visible
    if (this._widget.isVisible()) {
      if (this._widget.handleKeyDown(e)) {
        return;
      }
    }

    const isMac = navigator.platform.includes('Mac');
    const modKey = isMac ? e.metaKey : e.ctrlKey;

    // Ctrl/Cmd + Space: Force show completions
    if (modKey && e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      this._triggerCompletion(true);
      return;
    }
  }

  // ----------------------------------------
  // Input Handling
  // ----------------------------------------

  _handleInput(event) {
    if (!this._enabled) return;

    // Clear any pending debounce
    clearTimeout(this._debounceTimer);

    const { text, type, range } = event;

    // Check if this is an insertion event (textupdate from EditContext, input from Textarea)
    const isInsert = type === 'textupdate' || type === 'input';

    // Check if this is a deletion (range.start < range.end with empty or shorter text)
    const isDelete = isInsert && range && range.end > range.start && (!text || text.length < range.end - range.start);

    // Handle character input
    if (isInsert && text && text.length > 0 && !isDelete) {
      // Get the last character typed
      const char = text.charAt(text.length - 1);
      const language = this._editor.getLanguage();

      // Check if character should dismiss completions
      // In CSS, hyphen is part of property names, so don't dismiss
      if (DISMISS_CHARS.test(char)) {
        if (!(char === '-' && language === 'css')) {
          this._widget.hide();
          return;
        }
      }

      // Dot triggers member completion
      if (char === '.') {
        this._debounceTimer = setTimeout(() => {
          this._triggerCompletion(false);
        }, DEBOUNCE_DELAY);
        return;
      }

      // < triggers HTML tag completion
      if (char === '<' && language === 'html') {
        this._debounceTimer = setTimeout(() => {
          this._triggerCompletion(false);
        }, DEBOUNCE_DELAY);
        return;
      }

      // Hyphen triggers autocomplete in CSS (for property names like flex-direction)
      if (char === '-' && language === 'css') {
        this._debounceTimer = setTimeout(() => {
          this._triggerCompletion(false);
        }, DEBOUNCE_DELAY);
        return;
      }

      // Colon triggers property value completion in CSS
      if (char === ':' && language === 'css') {
        this._widget.hide();
        this._debounceTimer = setTimeout(() => {
          this._triggerCompletion(false);
        }, DEBOUNCE_DELAY);
        return;
      }

      // Check if character should trigger completions
      if (TRIGGER_CHARS.test(char)) {
        this._debounceTimer = setTimeout(() => {
          this._triggerCompletion(false);
        }, DEBOUNCE_DELAY);
        return;
      }
    }

    // Handle backspace - update completions if visible
    if (isDelete && this._widget.isVisible()) {
      this._debounceTimer = setTimeout(() => {
        this._updateCompletions();
      }, DEBOUNCE_DELAY);
    }
  }

  _handleSelectionChange() {
    if (!this._widget.isVisible()) return;

    // Hide if cursor moved to different line or far from trigger position
    const { end } = this._editor.getSelection();

    if (this._triggerPosition !== null) {
      const triggerPos = this._editor.document.offsetToPosition(this._triggerPosition);
      const currentPos = this._editor.document.offsetToPosition(end);

      // Hide if moved to different line
      if (currentPos.line !== triggerPos.line) {
        this._widget.hide();
        return;
      }

      // Hide if cursor moved before trigger position
      if (end < this._triggerPosition) {
        this._widget.hide();
        return;
      }
    }
  }

  // ----------------------------------------
  // Completion Logic
  // ----------------------------------------

  _triggerCompletion(force) {
    const context = this._getCompletionContext();

    if (!context) {
      this._widget.hide();
      return;
    }

    const { prefix, lineText, column, cursorOffset, htmlContext, htmlTagStart } = context;
    const beforeCursor = lineText.slice(0, column);

    // Check if triggered by dot (member access)
    const isDotTrigger = beforeCursor.match(/\.\s*\w*$/);

    // Check minimum prefix length (unless forced, dot trigger, or HTML tag context)
    if (!force && !isDotTrigger && !htmlContext && prefix.length < MIN_PREFIX_LENGTH) {
      this._widget.hide();
      return;
    }

    // Store trigger position and context
    if (htmlContext === 'tag' && htmlTagStart !== undefined) {
      // For HTML tags, include the < in the replacement range
      const lineStartOffset = cursorOffset - column;
      this._triggerPosition = lineStartOffset + htmlTagStart;
      this._htmlContext = htmlContext;
    } else {
      this._triggerPosition = cursorOffset - prefix.length;
      this._htmlContext = null;
    }
    this._currentPrefix = prefix;

    // Get completions
    const language = this._editor.getLanguage();
    const fullText = this._editor.getValue();
    const items = this._service.getCompletions(language, {
      prefix,
      lineText,
      column,
      fullText,
    });

    if (items.length === 0) {
      this._widget.hide();
      return;
    }

    // Get cursor rect for positioning
    const cursorRect = this._editor.view.getCursorRect();
    this._widget.show(items, cursorRect);
  }

  _updateCompletions() {
    if (this._triggerPosition === null) {
      this._widget.hide();
      return;
    }

    const context = this._getCompletionContext();

    if (!context) {
      this._widget.hide();
      return;
    }

    const { prefix, lineText, column, cursorOffset } = context;

    // Check if cursor is still after trigger position
    if (cursorOffset < this._triggerPosition) {
      this._widget.hide();
      return;
    }

    // Update prefix
    this._currentPrefix = prefix;

    // Get new completions
    const language = this._editor.getLanguage();
    const fullText = this._editor.getValue();
    const items = this._service.getCompletions(language, {
      prefix,
      lineText,
      column,
      fullText,
    });

    if (items.length === 0) {
      this._widget.hide();
      return;
    }

    this._widget.updateItems(items);
  }

  _getCompletionContext() {
    const { end } = this._editor.getSelection();
    const pos = this._editor.document.offsetToPosition(end);
    const lineText = this._editor.document.getLine(pos.line);
    const beforeCursor = lineText.slice(0, pos.column);
    const language = this._editor.getLanguage();

    // For HTML, check if we're typing a tag name (with or without <)
    if (language === 'html') {
      // Check if typing tag name after < (e.g., "<div")
      const htmlTagMatch = beforeCursor.match(/<(\w*)$/);
      if (htmlTagMatch) {
        return {
          prefix: htmlTagMatch[1],  // Just the tag name part
          lineText,
          column: pos.column,
          cursorOffset: end,
          htmlContext: 'tag',
          htmlTagStart: pos.column - htmlTagMatch[0].length,  // Position of <
        };
      }
    }

    // Extract word prefix (identifier being typed)
    // For CSS, also include hyphens in property names (e.g., justify-content)
    let prefixMatch;
    if (language === 'css') {
      prefixMatch = beforeCursor.match(/[\w-]*$/);
    } else {
      prefixMatch = beforeCursor.match(/[\w$]*$/);
    }
    const prefix = prefixMatch ? prefixMatch[0] : '';

    return {
      prefix,
      lineText,
      column: pos.column,
      cursorOffset: end,
    };
  }

  // ----------------------------------------
  // Selection Handlers
  // ----------------------------------------

  _handleSelect(item, cursorOffset = null) {
    if (this._triggerPosition === null) return;

    const { end } = this._editor.getSelection();

    // Calculate the range to replace (from trigger position to cursor)
    const replaceStart = this._triggerPosition;
    const replaceEnd = end;

    // Replace the prefix with the selected completion
    this._editor.document.replaceRange(replaceStart, replaceEnd, item);

    // Calculate cursor position
    let newPosition = replaceStart + item.length;

    // If cursorOffset is provided, use it (e.g., CSS properties with ": ;")
    if (cursorOffset !== null) {
      newPosition = replaceStart + cursorOffset;
    }
    // For HTML tags, place cursor between opening and closing tags
    // Pattern: <tagname></tagname> - cursor goes after <tagname>
    // Check the pattern regardless of _htmlContext since tags can be completed without '<'
    else {
      const closingTagMatch = item.match(/^<(\w+)><\/\1>$/);
      if (closingTagMatch) {
        // Position cursor after "<tagname>": <div>|</div>
        // "<" + tagname + ">" = 1 + tagname.length + 1
        newPosition = replaceStart + closingTagMatch[1].length + 2;
      }
    }

    this._editor.setSelection(newPosition, newPosition);

    // Reset state
    this._triggerPosition = null;
    this._currentPrefix = '';
    this._htmlContext = null;

    // Return focus to editor
    this._editor.focus();
  }

  _handleCancel() {
    this._triggerPosition = null;
    this._currentPrefix = '';
    this._htmlContext = null;
    this._editor.focus();
  }

  // ----------------------------------------
  // Public Methods
  // ----------------------------------------

  /**
   * Manually trigger autocomplete
   */
  trigger() {
    this._triggerCompletion(true);
  }

  /**
   * Check if autocomplete popup is visible
   * @returns {boolean}
   */
  isVisible() {
    return this._widget.isVisible();
  }

  /**
   * Hide autocomplete popup
   */
  hide() {
    this._widget.hide();
  }

  /**
   * Enable the autocomplete feature
   */
  enable() {
    this._enabled = true;
  }

  /**
   * Disable the autocomplete feature
   */
  disable() {
    this._enabled = false;
    this._widget.hide();
  }

  /**
   * Check if feature is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this._enabled;
  }

  // ----------------------------------------
  // Lifecycle
  // ----------------------------------------

  /**
   * Clean up resources
   */
  dispose() {
    clearTimeout(this._debounceTimer);

    if (this._boundHandleKeyDown) {
      this._editor.view.contentElement.removeEventListener(
        'keydown',
        this._boundHandleKeyDown,
        true
      );
    }

    if (this._boundHandleInput) {
      this._editor.off('input', this._boundHandleInput);
    }

    if (this._boundHandleSelectionChange) {
      this._editor.off('selectionChange', this._boundHandleSelectionChange);
    }

    this._widget?.dispose();
    this._service = null;
    this._editor = null;
  }
}
