/**
 * @fileoverview EditContext API implementation for text input handling
 *
 * EditContext API provides direct integration with OS text input services
 * without relying on contenteditable or hidden textarea elements.
 *
 * Browser Support: Chrome 121+, Edge 121+
 */

(function (CodeEditor) {
  'use strict';

  var Selection = CodeEditor.Selection;

  // ============================================
  // Constants
  // ============================================

  var COMPOSITION_STYLE = {
    NONE: 'none',
    SOLID_UNDERLINE: 'solid-underline',
    DOTTED_UNDERLINE: 'dotted-underline',
    DOUBLE_UNDERLINE: 'double-underline',
    SQUIGGLE_UNDERLINE: 'squiggle-underline',
  };

  // ============================================
  // Class Definition
  // ============================================

  /**
   * Handles text input using the EditContext API.
   * Provides clean separation between input handling and view rendering.
   */
  class EditContextHandler {
    // ----------------------------------------
    // Instance Properties
    // ----------------------------------------
    _editContext = null;
    _element = null;
    _editor = null;
    _isComposing = false;
    _compositionRanges = [];
    _disposed = false;

    // ----------------------------------------
    // Constructor
    // ----------------------------------------

    /**
     * @param {HTMLElement} element - Element to attach EditContext to
     * @param {Object} editor - Editor instance with document and view
     */
    constructor(element, editor) {
      this._element = element;
      this._editor = editor;

      this._initialize();
    }

    // ----------------------------------------
    // Initialization
    // ----------------------------------------

    _initialize() {
      var self = this;

      // Create EditContext instance
      this._editContext = new EditContext({
        text: this._editor.document.getText(),
        selectionStart: 0,
        selectionEnd: 0,
      });

      // Attach to DOM element
      this._element.editContext = this._editContext;

      // Make element focusable
      this._element.tabIndex = 0;

      // Disable spellcheck
      this._element.spellcheck = false;
      this._element.setAttribute('spellcheck', 'false');

      // Bind events
      this._bindEditContextEvents();
      this._bindElementEvents();
      this._bindDocumentEvents();
    }

    // ----------------------------------------
    // Event Binding
    // ----------------------------------------

    _bindEditContextEvents() {
      var self = this;
      var ec = this._editContext;

      // Text update - fired when user inputs text
      ec.addEventListener('textupdate', function (e) {
        self._handleTextUpdate(e);
      });

      // Text format update - fired during IME composition for styling
      ec.addEventListener('textformatupdate', function (e) {
        self._handleTextFormatUpdate(e);
      });

      // Character bounds update - OS needs character positions for IME window
      ec.addEventListener('characterboundsupdate', function (e) {
        self._handleCharacterBoundsUpdate(e);
      });

      // Composition events
      ec.addEventListener('compositionstart', function (e) {
        self._handleCompositionStart(e);
      });
      ec.addEventListener('compositionend', function (e) {
        self._handleCompositionEnd(e);
      });
    }

    _bindElementEvents() {
      var self = this;

      // Focus management
      this._element.addEventListener('focus', function () {
        self._handleFocus();
      });
      this._element.addEventListener('blur', function () {
        self._handleBlur();
      });

      // Keyboard events (for non-text keys like arrows, shortcuts)
      this._element.addEventListener('keydown', function (e) {
        self._handleKeyDown(e);
      });

      // Mouse events for selection
      this._element.addEventListener('mousedown', function (e) {
        self._handleMouseDown(e);
      });

      // Capture native browser selection changes (for mouse drag selection)
      document.addEventListener('selectionchange', function () {
        self._handleSelectionChange();
      });
    }

    _bindDocumentEvents() {
      var self = this;

      // Sync EditContext when document changes externally
      this._editor.document.on('change', function (change) {
        if (!self._isComposing) {
          self._syncEditContextText();
        }
      });

      // Sync EditContext selection when editor selection changes programmatically
      this._editor.on('selectionChange', function () {
        if (!self._isComposing) {
          self._syncEditContextSelection();
        }
      });
    }

    // ----------------------------------------
    // EditContext Event Handlers
    // ----------------------------------------

    _handleTextUpdate(event) {
      const { text } = event;

      // Use insertText for multi-cursor support
      // insertText handles all cursors and updates selections properly
      this._editor.insertText(text);

      // Sync EditContext with new state
      this._syncEditContextText();
      this._syncEditContextSelection();

      // Emit event for view update
      this._editor._emit('input', {
        type: 'textupdate',
        text,
      });
    }

    _handleTextFormatUpdate(event) {
      var self = this;
      var formats = event.getTextFormats();

      this._compositionRanges = formats.map(function (format) {
        return {
          start: format.rangeStart,
          end: format.rangeEnd,
          underlineStyle: self._mapUnderlineStyle(format.underlineStyle),
          underlineThickness: format.underlineThickness,
        };
      });

      this._editor._emit('compositionFormat', this._compositionRanges);
    }

    _handleCharacterBoundsUpdate(event) {
      var rangeStart = event.rangeStart;
      var rangeEnd = event.rangeEnd;
      var bounds = this._calculateCharacterBounds(rangeStart, rangeEnd);
      this._editContext.updateCharacterBounds(rangeStart, bounds);
    }

    _handleCompositionStart(event) {
      this._isComposing = true;
      this._editor._emit('compositionStart');
    }

    _handleCompositionEnd(event) {
      this._isComposing = false;
      this._compositionRanges = [];
      this._editor._emit('compositionEnd');
    }

    // ----------------------------------------
    // Element Event Handlers
    // ----------------------------------------

    _handleFocus() {
      this._editor._emit('focus');
    }

    _handleBlur() {
      this._editor._emit('blur');
    }

    _handleKeyDown(event) {
      var key = event.key;
      var ctrlKey = event.ctrlKey;
      var metaKey = event.metaKey;
      var shiftKey = event.shiftKey;
      var modKey = ctrlKey || metaKey;

      switch (key) {
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowUp':
        case 'ArrowDown':
          this._handleArrowKey(key, shiftKey, modKey);
          event.preventDefault();
          break;

        case 'Home':
        case 'End':
          this._handleHomeEnd(key, shiftKey, modKey);
          event.preventDefault();
          break;

        case 'Backspace':
          this._handleBackspace(modKey);
          event.preventDefault();
          break;

        case 'Delete':
          this._handleDelete(modKey);
          event.preventDefault();
          break;

        case 'Enter':
          this._handleEnter();
          event.preventDefault();
          break;

        case 'Tab':
          this._handleTab(shiftKey);
          event.preventDefault();
          break;

        case 'a':
          if (modKey) {
            this._handleSelectAll();
            event.preventDefault();
          }
          break;

        case 'z':
          if (modKey) {
            if (shiftKey) {
              this._editor.redo();
            } else {
              this._editor.undo();
            }
            event.preventDefault();
          }
          break;

        case 'y':
          if (modKey) {
            this._editor.redo();
            event.preventDefault();
          }
          break;

        case 'c':
          if (modKey) {
            this._handleCopy();
          }
          break;

        case 'x':
          if (modKey) {
            this._handleCut();
            event.preventDefault();
          }
          break;

        case 'v':
          if (modKey) {
            this._handlePaste();
          }
          break;
      }
    }

    _handleMouseDown(event) {
      var position = this._editor.view.getPositionFromPoint(event.clientX, event.clientY);

      if (position !== null) {
        var offset = this._editor.document.positionToOffset(position.line, position.column);
        this._editor.setSelection(offset, offset, true); // skipScroll for mouse click
        this._syncEditContextSelection();
      }
    }

    _handleSelectionChange() {
      var selection = window.getSelection();

      // Only process if selection is within our editor
      if (!selection || !selection.rangeCount || !this._element.contains(selection.anchorNode)) {
        return;
      }

      // Ignore if we're composing (IME input)
      if (this._isComposing) {
        return;
      }

      try {
        var range = selection.getRangeAt(0);

        // Convert DOM selection to editor offsets
        var start = this._getOffsetFromNode(range.startContainer, range.startOffset);
        var end = this._getOffsetFromNode(range.endContainer, range.endOffset);

        // Only update if we successfully converted both positions
        if (start !== null && end !== null) {
          var currentSelection = this._editor.getSelection();

          // Only update if the selection has actually changed
          if (currentSelection.start !== start || currentSelection.end !== end) {
            this._editor.setSelection(start, end, true); // skipScroll for mouse drag
            this._syncEditContextSelection();
          }
        }
      } catch (error) {
        // Silently ignore errors during selection conversion
      }
    }

    // ----------------------------------------
    // Key Handlers
    // ----------------------------------------

    _handleArrowKey(key, shiftKey, modKey) {
      var directionMap = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowUp: 'up',
        ArrowDown: 'down',
      };

      var direction = directionMap[key];
      if (!direction) return;

      this._editor.moveAllCursors(direction, shiftKey, modKey);
      this._syncEditContextSelection();
    }

    _handleHomeEnd(key, shiftKey, modKey) {
      var edge = key === 'Home' ? 'start' : 'end';
      this._editor.moveAllCursorsToLineEdge(edge, shiftKey, modKey);
      this._syncEditContextSelection();
    }

    _handleBackspace(modKey) {
      if (this._editor.hasMultipleCursors()) {
        if (this._editor.deleteAtAllCursors(false, modKey)) {
          this._syncEditContextText();
          this._syncEditContextSelection();
          return;
        }
      }

      var doc = this._editor.document;
      var selection = this._editor.getSelection();
      var start = selection.start;
      var end = selection.end;

      if (start === end) {
        if (start > 0) {
          if (modKey) {
            var wordStart = this._findWordBoundary(start, -1);
            start = wordStart;
          } else {
            start = start - 1;
          }
        }
      }

      if (start !== end) {
        doc.delete(start, end);
        this._editor.setSelection(start, start);
        this._syncEditContextText();
        this._syncEditContextSelection();

        // Emit input event for autocomplete to detect deletion
        this._editor._emit('input', {
          type: 'delete',
          text: '',
          deletedLength: end - start,
        });
      }
    }

    _handleDelete(modKey) {
      if (this._editor.hasMultipleCursors()) {
        if (this._editor.deleteAtAllCursors(true, modKey)) {
          this._syncEditContextText();
          this._syncEditContextSelection();
          return;
        }
      }

      var doc = this._editor.document;
      var selection = this._editor.getSelection();
      var start = selection.start;
      var end = selection.end;

      if (start === end) {
        if (end < doc.getLength()) {
          if (modKey) {
            var wordEnd = this._findWordBoundary(end, 1);
            end = wordEnd;
          } else {
            end = end + 1;
          }
        }
      }

      if (start !== end) {
        doc.delete(start, end);
        this._editor.setSelection(start, start);
        this._syncEditContextText();
        this._syncEditContextSelection();

        // Emit input event for autocomplete to detect deletion
        this._editor._emit('input', {
          type: 'delete',
          text: '',
          deletedLength: end - start,
        });
      }
    }

    _handleEnter() {
      this._editor.insertText('\n');
      this._syncEditContextText();
      this._syncEditContextSelection();
    }

    _handleTab(shiftKey) {
      var tabText = '  ';
      this._editor.insertText(tabText);
      this._syncEditContextText();
      this._syncEditContextSelection();
    }

    _handleSelectAll() {
      var length = this._editor.document.getLength();
      this._editor.setSelection(0, length);
      this._syncEditContextSelection();
    }

    _handleCopy() {
      if (this._editor.hasMultipleCursors()) {
        var texts = this._editor.getAllSelectedTexts();
        var hasSelection = texts.some(function (t) {
          return t.length > 0;
        });

        if (hasSelection) {
          var combinedText = texts
            .filter(function (t) {
              return t.length > 0;
            })
            .join('\n');
          navigator.clipboard.writeText(combinedText);
        }
        return;
      }

      var selection = this._editor.getSelection();
      if (selection.start !== selection.end) {
        var text = this._editor.document.getTextRange(selection.start, selection.end);
        navigator.clipboard.writeText(text);
      }
    }

    _handleCut() {
      if (this._editor.hasMultipleCursors()) {
        var texts = this._editor.getAllSelectedTexts();
        var hasSelection = texts.some(function (t) {
          return t.length > 0;
        });

        if (hasSelection) {
          var combinedText = texts
            .filter(function (t) {
              return t.length > 0;
            })
            .join('\n');
          navigator.clipboard.writeText(combinedText);
          this._editor.insertText('');
          this._syncEditContextText();
          this._syncEditContextSelection();
        }
        return;
      }

      var selection = this._editor.getSelection();
      if (selection.start !== selection.end) {
        var text = this._editor.document.getTextRange(selection.start, selection.end);
        navigator.clipboard.writeText(text);
        this._editor.document.delete(selection.start, selection.end);
        this._editor.setSelection(selection.start, selection.start);
        this._syncEditContextText();
        this._syncEditContextSelection();
      }
    }

    _handlePaste() {
      var self = this;

      navigator.clipboard
        .readText()
        .then(function (text) {
          if (self._editor.hasMultipleCursors()) {
            var normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            var lines = normalizedText.split('\n');
            var selections = self._editor.getSelections();

            if (lines.length === selections.count) {
              self._smartPasteMultiCursor(lines, selections);
            } else {
              self._editor.insertText(text);
            }

            self._syncEditContextText();
            self._syncEditContextSelection();
            return;
          }

          var selection = self._editor.getSelection();
          self._editor.document.replaceRange(selection.start, selection.end, text);
          self._editor.setSelection(selection.start + text.length, selection.start + text.length);
          self._syncEditContextText();
          self._syncEditContextSelection();
        })
        .catch(function (err) {
          console.error('Paste failed:', err);
        });
    }

    _smartPasteMultiCursor(lines, selections) {
      var doc = this._editor.document;
      var sortedSels = selections.sorted(false);
      var descendingSels = selections.sorted(true);

      var selToLine = new Map();
      for (var i = 0; i < sortedSels.length; i++) {
        selToLine.set(sortedSels[i], lines[i]);
      }

      for (var j = 0; j < descendingSels.length; j++) {
        var sel = descendingSels[j];
        var lineText = selToLine.get(sel);
        doc.replaceRange(sel.start, sel.end, lineText);
      }

      var newSelections = [];
      var cumulativeOffset = 0;

      for (var k = 0; k < sortedSels.length; k++) {
        var s = sortedSels[k];
        var lt = lines[k];
        var deletedLength = s.end - s.start;

        var newPos = s.start + cumulativeOffset + lt.length;
        newSelections.push(Selection.cursor(newPos));

        cumulativeOffset += lt.length - deletedLength;
      }

      this._editor.setSelections(newSelections);
    }

    // ----------------------------------------
    // Helper Methods
    // ----------------------------------------

    _findWordBoundary(offset, direction) {
      return this._editor._findWordBoundary(offset, direction);
    }

    _getOffsetFromNode(node, nodeOffset) {
      var lineElement = node;
      while (lineElement && lineElement !== this._element) {
        if (lineElement.dataset && lineElement.dataset.lineIndex !== undefined) {
          break;
        }
        lineElement = lineElement.parentElement;
      }

      if (!lineElement || !lineElement.dataset || lineElement.dataset.lineIndex === undefined) {
        return null;
      }

      var lineIndex = parseInt(lineElement.dataset.lineIndex);
      var columnOffset = 0;

      var walker = document.createTreeWalker(lineElement, NodeFilter.SHOW_TEXT, null);

      var currentNode;
      while ((currentNode = walker.nextNode())) {
        if (currentNode === node) {
          columnOffset += nodeOffset;
          break;
        } else {
          columnOffset += currentNode.textContent.length;
        }
      }

      if (node.nodeType === Node.ELEMENT_NODE && node.dataset && node.dataset.lineIndex !== undefined) {
        var walker2 = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);

        columnOffset = 0;
        var childCount = 0;
        while (walker2.nextNode() && childCount < nodeOffset) {
          columnOffset += walker2.currentNode.textContent.length;
          childCount++;
        }
      }

      return this._editor.document.positionToOffset(lineIndex, columnOffset);
    }

    _calculateCharacterBounds(rangeStart, rangeEnd) {
      var bounds = [];

      for (var i = rangeStart; i < rangeEnd; i++) {
        var rect = this._editor.view.getCharacterRect(i);
        if (rect) {
          bounds.push(new DOMRect(rect.x, rect.y, rect.width, rect.height));
        }
      }

      return bounds;
    }

    _mapUnderlineStyle(style) {
      switch (style) {
        case 'solid':
          return COMPOSITION_STYLE.SOLID_UNDERLINE;
        case 'dotted':
          return COMPOSITION_STYLE.DOTTED_UNDERLINE;
        case 'double':
          return COMPOSITION_STYLE.DOUBLE_UNDERLINE;
        case 'squiggle':
          return COMPOSITION_STYLE.SQUIGGLE_UNDERLINE;
        default:
          return COMPOSITION_STYLE.NONE;
      }
    }

    // ----------------------------------------
    // Synchronization with EditContext
    // ----------------------------------------

    _syncEditContextText() {
      var text = this._editor.document.getText();
      this._editContext.updateText(0, this._editContext.text.length, text);
    }

    _syncEditContextSelection() {
      var selection = this._editor.getSelection();
      this._editContext.updateSelection(selection.start, selection.end);
      this._updateControlBounds();
    }

    _updateControlBounds() {
      var rect = this._element.getBoundingClientRect();
      this._editContext.updateControlBounds(rect);

      var selectionRect = this._editor.view.getSelectionRect();
      if (selectionRect) {
        this._editContext.updateSelectionBounds(selectionRect);
      }
    }

    // ----------------------------------------
    // Public Methods
    // ----------------------------------------

    focus() {
      this._element.focus({ preventScroll: true });
    }

    isFocused() {
      return document.activeElement === this._element;
    }

    isComposing() {
      return this._isComposing;
    }

    getCompositionRanges() {
      return this._compositionRanges;
    }

    updateSelection(start, end) {
      this._editContext.updateSelection(start, end);
    }

    dispose() {
      if (this._disposed) return;

      this._element.editContext = null;
      this._editContext = null;
      this._disposed = true;
    }
  }

  // ============================================
  // Feature Detection
  // ============================================

  function isEditContextSupported() {
    return 'EditContext' in window;
  }

  // ============================================
  // Export to Namespace
  // ============================================

  CodeEditor.EditContextHandler = EditContextHandler;
  CodeEditor.isEditContextSupported = isEditContextSupported;
})((window.CodeEditor = window.CodeEditor || {}));

