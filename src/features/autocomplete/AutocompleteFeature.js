/**
 * @fileoverview Autocomplete feature - provides code completions
 * @module features/autocomplete/AutocompleteFeature
 */

(function(CodeEditor) {
  'use strict';

  // Get dependencies
  var CompletionService = CodeEditor.CompletionService;
  var AutocompleteWidget = CodeEditor.AutocompleteWidget;

  // ============================================
  // Constants
  // ============================================

  var DEBOUNCE_DELAY = 100;
  var MIN_PREFIX_LENGTH = 1;

  // Characters that trigger autocomplete
  var TRIGGER_CHARS = /^[\w$]$/;

  // Characters that should dismiss autocomplete
  // Note: < is excluded because it's an HTML tag trigger
  var DISMISS_CHARS = /^[\s;,(){}[\]>'"=+\-*/%&|^!~?:]$/;

  // ============================================
  // AutocompleteFeature Class
  // ============================================

  class AutocompleteFeature {
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
    _cachedItems = null; // Cached completion items for filtering

    // Bound event handlers
    _boundHandleKeyDown = null;
    _boundHandleInput = null;
    _boundHandleSelectionChange = null;

    // Debounce timers
    _debounceTimer = null;
    _cursorMoveTimer = null;

    // ----------------------------------------
    // Constructor
    // ----------------------------------------

    /**
     * @param {Object} editor - Editor instance
     * @param {Object} options - Configuration options
     * @param {boolean} options.enabled - Whether feature is enabled (default: true)
     */
    constructor(editor, options = {}) {
      var self = this;

      this._editor = editor;
      this._enabled = options.enabled !== false;

      // Initialize components
      this._service = new CompletionService();
      this._widget = new AutocompleteWidget(editor, {
        onSelect: function(item, cursorOffset) {
          self._handleSelect(item, cursorOffset);
        },
        onCancel: function() {
          self._handleCancel();
        },
      });

      this._bindEvents();
    }

    // ----------------------------------------
    // Event Binding
    // ----------------------------------------

    _bindEvents() {
      var self = this;

      // Keyboard shortcuts (capture phase to intercept before editor)
      this._boundHandleKeyDown = function(e) {
        self._handleKeyDown(e);
      };
      this._editor.view.contentElement.addEventListener('keydown', this._boundHandleKeyDown, true);

      // Text input
      this._boundHandleInput = function(e) {
        self._handleInput(e);
      };
      this._editor.on('input', this._boundHandleInput);

      // Selection/cursor changes
      this._boundHandleSelectionChange = function() {
        self._handleSelectionChange();
      };
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

      var isMac = navigator.platform.includes('Mac');
      var modKey = isMac ? e.metaKey : e.ctrlKey;

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
      var self = this;

      if (!this._enabled) return;

      // Clear any pending debounce
      clearTimeout(this._debounceTimer);

      var text = event.text;
      var type = event.type;
      var range = event.range;

      // Check if this is an insertion event (textupdate from EditContext, input from Textarea)
      var isInsert = type === 'textupdate' || type === 'input';

      // Check if this is a deletion (range.start < range.end with empty or shorter text)
      var isDelete = isInsert && range && range.end > range.start && (!text || text.length < range.end - range.start);

      // Handle character input
      if (isInsert && text && text.length > 0 && !isDelete) {
        // Get the last character typed
        var char = text.charAt(text.length - 1);
        var language = this._editor.getLanguage();

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
          this._debounceTimer = setTimeout(function() {
            self._triggerCompletion(false);
          }, DEBOUNCE_DELAY);
          return;
        }

        // < triggers HTML tag completion
        if (char === '<' && language === 'html') {
          this._debounceTimer = setTimeout(function() {
            self._triggerCompletion(false);
          }, DEBOUNCE_DELAY);
          return;
        }

        // Hyphen triggers autocomplete in CSS (for property names like flex-direction)
        if (char === '-' && language === 'css') {
          this._debounceTimer = setTimeout(function() {
            self._triggerCompletion(false);
          }, DEBOUNCE_DELAY);
          return;
        }

        // Colon triggers property value completion in CSS
        if (char === ':' && language === 'css') {
          this._widget.hide();
          this._debounceTimer = setTimeout(function() {
            self._triggerCompletion(false);
          }, DEBOUNCE_DELAY);
          return;
        }

        // Check if character should trigger completions
        if (TRIGGER_CHARS.test(char)) {
          this._debounceTimer = setTimeout(function() {
            self._triggerCompletion(false);
          }, DEBOUNCE_DELAY);
          return;
        }
      }

      // Handle backspace - update completions if visible
      if (isDelete && this._widget.isVisible()) {
        this._debounceTimer = setTimeout(function() {
          self._updateCompletions();
        }, DEBOUNCE_DELAY);
      }
    }

    _handleSelectionChange() {
      var self = this;

      if (!this._widget.isVisible()) return;

      // Hide if cursor moved to different line or far from trigger position
      var sel = this._editor.getSelection();

      if (this._triggerPosition !== null) {
        var triggerPos = this._editor.document.offsetToPosition(this._triggerPosition);
        var currentPos = this._editor.document.offsetToPosition(sel.end);

        // Hide if moved to different line
        if (currentPos.line !== triggerPos.line) {
          this._widget.hide();
          return;
        }

        // Hide if cursor moved before trigger position
        if (sel.end < this._triggerPosition) {
          this._widget.hide();
          return;
        }

        // Debounce the update to avoid excessive processing
        clearTimeout(this._cursorMoveTimer);
        this._cursorMoveTimer = setTimeout(function() {
          self._updateCompletionsForCursorMove();
        }, 50);
      }
    }

    /**
     * Update completions when cursor moves (arrow keys)
     * Uses cached items and only filters instead of re-fetching completions
     */
    _updateCompletionsForCursorMove() {
      if (this._triggerPosition === null) return;

      var sel = this._editor.getSelection();
      var doc = this._editor.document;
      var pos = doc.offsetToPosition(sel.end);
      var lineText = doc.getLine(pos.line);

      // Calculate new prefix from trigger position to cursor
      var triggerPos = doc.offsetToPosition(this._triggerPosition);
      var newPrefix = lineText.slice(triggerPos.column, pos.column);

      // Check if prefix is still valid (only word characters)
      var language = this._editor.getLanguage();
      var prefixPattern;
      if (language === 'css') {
        prefixPattern = /^[\w-]*$/;
      } else {
        prefixPattern = /^[\w$]*$/;
      }

      if (!prefixPattern.test(newPrefix)) {
        this._widget.hide();
        return;
      }

      // Skip if prefix hasn't changed
      if (newPrefix === this._currentPrefix) {
        return;
      }

      this._currentPrefix = newPrefix;

      // Use cached items if available and filter them locally
      if (this._cachedItems && this._cachedItems.length > 0) {
        var filtered = this._filterCachedItems(this._cachedItems, newPrefix);
        if (filtered.length === 0) {
          this._widget.hide();
          return;
        }
        this._widget.updateItems(filtered, newPrefix);
      } else {
        // Fallback: hide if no cached items
        this._widget.hide();
      }
    }

    /**
     * Filter cached items by prefix
     * @param {Array} items - Cached completion items
     * @param {string} prefix - Current prefix
     * @returns {Array} Filtered items
     */
    _filterCachedItems(items, prefix) {
      if (!prefix) return items.slice(0, 50);

      var lowerPrefix = prefix.toLowerCase();
      var filtered = items.filter(function(item) {
        var label = typeof item === 'string' ? item : item.label;
        return label.toLowerCase().startsWith(lowerPrefix);
      });
      return filtered.slice(0, 30);
    }

    // ----------------------------------------
    // Completion Logic
    // ----------------------------------------

    _triggerCompletion(force) {
      var context = this._getCompletionContext();

      if (!context) {
        this._widget.hide();
        return;
      }

      var prefix = context.prefix;
      var lineText = context.lineText;
      var column = context.column;
      var cursorOffset = context.cursorOffset;
      var htmlContext = context.htmlContext;
      var htmlTagStart = context.htmlTagStart;
      var beforeCursor = lineText.slice(0, column);

      // Check if triggered by dot (member access)
      var isDotTrigger = beforeCursor.match(/\.\s*\w*$/);

      // Check minimum prefix length (unless forced, dot trigger, or HTML tag context)
      if (!force && !isDotTrigger && !htmlContext && prefix.length < MIN_PREFIX_LENGTH) {
        this._widget.hide();
        return;
      }

      // Store trigger position and context
      if (htmlContext === 'tag' && htmlTagStart !== undefined) {
        // For HTML tags, include the < in the replacement range
        var lineStartOffset = cursorOffset - column;
        this._triggerPosition = lineStartOffset + htmlTagStart;
        this._htmlContext = htmlContext;
      } else {
        this._triggerPosition = cursorOffset - prefix.length;
        this._htmlContext = null;
      }
      this._currentPrefix = prefix;

      // Get completions
      var language = this._editor.getLanguage();
      var fullText = this._editor.getValue();
      var items = this._service.getCompletions(language, {
        prefix: prefix,
        lineText: lineText,
        column: column,
        fullText: fullText,
      });

      if (items.length === 0) {
        this._widget.hide();
        this._cachedItems = null;
        return;
      }

      // Cache items for filtering during cursor movement
      this._cachedItems = items;

      // Get cursor rect for positioning
      var cursorRect = this._editor.view.getCursorRect();
      this._widget.show(items, cursorRect, prefix);
    }

    _updateCompletions() {
      if (this._triggerPosition === null) {
        this._widget.hide();
        return;
      }

      var context = this._getCompletionContext();

      if (!context) {
        this._widget.hide();
        return;
      }

      var prefix = context.prefix;
      var lineText = context.lineText;
      var column = context.column;
      var cursorOffset = context.cursorOffset;

      // Check if cursor is still after trigger position
      if (cursorOffset < this._triggerPosition) {
        this._widget.hide();
        return;
      }

      // Update prefix
      this._currentPrefix = prefix;

      // Get new completions
      var language = this._editor.getLanguage();
      var fullText = this._editor.getValue();
      var items = this._service.getCompletions(language, {
        prefix: prefix,
        lineText: lineText,
        column: column,
        fullText: fullText,
      });

      if (items.length === 0) {
        this._widget.hide();
        return;
      }

      this._widget.updateItems(items, prefix);
    }

    _getCompletionContext() {
      var sel = this._editor.getSelection();
      var pos = this._editor.document.offsetToPosition(sel.end);
      var lineText = this._editor.document.getLine(pos.line);
      var beforeCursor = lineText.slice(0, pos.column);
      var language = this._editor.getLanguage();

      // For HTML, check if we're typing a tag name (with or without <)
      if (language === 'html') {
        // Check if typing tag name after < (e.g., "<div")
        var htmlTagMatch = beforeCursor.match(/<(\w*)$/);
        if (htmlTagMatch) {
          return {
            prefix: htmlTagMatch[1],  // Just the tag name part
            lineText: lineText,
            column: pos.column,
            cursorOffset: sel.end,
            htmlContext: 'tag',
            htmlTagStart: pos.column - htmlTagMatch[0].length,  // Position of <
          };
        }
      }

      // Extract word prefix (identifier being typed)
      // For CSS, also include hyphens in property names (e.g., justify-content)
      var prefixMatch;
      if (language === 'css') {
        prefixMatch = beforeCursor.match(/[\w-]*$/);
      } else {
        prefixMatch = beforeCursor.match(/[\w$]*$/);
      }
      var prefix = prefixMatch ? prefixMatch[0] : '';

      return {
        prefix: prefix,
        lineText: lineText,
        column: pos.column,
        cursorOffset: sel.end,
      };
    }

    // ----------------------------------------
    // Selection Handlers
    // ----------------------------------------

    _handleSelect(item, cursorOffset) {
      if (this._triggerPosition === null) return;

      var sel = this._editor.getSelection();

      // Calculate the range to replace (from trigger position to cursor)
      var replaceStart = this._triggerPosition;
      var replaceEnd = sel.end;

      // Replace the prefix with the selected completion
      this._editor.document.replaceRange(replaceStart, replaceEnd, item);

      // Calculate cursor position
      var newPosition = replaceStart + item.length;

      // If cursorOffset is provided, use it (e.g., CSS properties with ": ;")
      if (cursorOffset !== null) {
        newPosition = replaceStart + cursorOffset;
      }
      // For HTML tags, place cursor between opening and closing tags
      // Pattern: <tagname></tagname> - cursor goes after <tagname>
      // Check the pattern regardless of _htmlContext since tags can be completed without '<'
      else {
        var closingTagMatch = item.match(/^<(\w+)><\/\1>$/);
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
      this._cachedItems = null;

      // Return focus to editor
      this._editor.focus();
    }

    _handleCancel() {
      this._triggerPosition = null;
      this._currentPrefix = '';
      this._htmlContext = null;
      this._cachedItems = null;
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
      clearTimeout(this._cursorMoveTimer);

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

      if (this._widget) {
        this._widget.dispose();
      }
      this._service = null;
      this._cachedItems = null;
      this._editor = null;
    }
  }

  // ============================================
  // Export to namespace
  // ============================================

  CodeEditor.Features = CodeEditor.Features || {};
  CodeEditor.Features.Autocomplete = AutocompleteFeature;

})(window.CodeEditor = window.CodeEditor || {});
