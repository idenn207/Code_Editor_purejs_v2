/**
 * @fileoverview Textarea fallback for browsers without EditContext support
 *
 * This is the fallback input method for browsers that don't support EditContext.
 * Uses a hidden textarea (Monaco/VSCode approach) to capture input.
 */

(function(CodeEditor) {
  'use strict';

  var Selection = CodeEditor.Selection;

  // ============================================
  // Class Definition
  // ============================================

  /**
   * Handles text input using a hidden textarea element.
   * Fallback for browsers without EditContext support.
   */
  class TextareaHandler {
    // ----------------------------------------
    // Instance Properties
    // ----------------------------------------
    _textarea = null;
    _element = null;
    _editor = null;
    _isComposing = false;
    _compositionText = '';
    _disposed = false;

    // ----------------------------------------
    // Constructor
    // ----------------------------------------

    /**
     * @param {HTMLElement} element - Container element
     * @param {Object} editor - Editor instance
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
      this._createTextarea();
      this._bindEvents();
    }

    _createTextarea() {
      this._textarea = document.createElement('textarea');
      this._textarea.className = 'editor-hidden-textarea';

      // Accessibility attributes
      this._textarea.setAttribute('autocorrect', 'off');
      this._textarea.setAttribute('autocapitalize', 'off');
      this._textarea.setAttribute('autocomplete', 'off');
      this._textarea.setAttribute('spellcheck', 'false');
      this._textarea.setAttribute('tabindex', '0');
      this._textarea.setAttribute('role', 'textbox');
      this._textarea.setAttribute('aria-multiline', 'true');
      this._textarea.setAttribute('aria-label', 'Code editor');

      // Make nearly invisible but still functional
      Object.assign(this._textarea.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '1px',
        height: '1em',
        padding: '0',
        margin: '0',
        border: 'none',
        outline: 'none',
        resize: 'none',
        overflow: 'hidden',
        whiteSpace: 'pre',
        opacity: '0.01',
        background: 'transparent',
        color: 'transparent',
        fontSize: 'inherit',
        fontFamily: 'inherit',
        lineHeight: 'inherit',
        zIndex: '10',
        caretColor: 'transparent',
      });

      this._element.appendChild(this._textarea);
    }

    // ----------------------------------------
    // Event Binding
    // ----------------------------------------

    _bindEvents() {
      var self = this;
      var ta = this._textarea;

      ta.addEventListener('input', function(e) { self._handleInput(e); });
      ta.addEventListener('compositionstart', function(e) { self._handleCompositionStart(e); });
      ta.addEventListener('compositionupdate', function(e) { self._handleCompositionUpdate(e); });
      ta.addEventListener('compositionend', function(e) { self._handleCompositionEnd(e); });
      ta.addEventListener('keydown', function(e) { self._handleKeyDown(e); });
      ta.addEventListener('focus', function() { self._handleFocus(); });
      ta.addEventListener('blur', function() { self._handleBlur(); });
      ta.addEventListener('paste', function(e) { self._handlePaste(e); });
      ta.addEventListener('copy', function(e) { self._handleCopy(e); });
      ta.addEventListener('cut', function(e) { self._handleCut(e); });

      this._element.addEventListener('mousedown', function(e) {
        if (e.target !== self._textarea) {
          self._handleMouseDown(e);
        }
      });

      document.addEventListener('selectionchange', function() { self._handleSelectionChange(); });
    }

    // ----------------------------------------
    // Input Event Handlers
    // ----------------------------------------

    _handleInput(event) {
      if (this._isComposing) {
        return;
      }

      var text = this._textarea.value;

      if (text) {
        this._editor.insertText(text);
        this._textarea.value = '';

        this._editor._emit('input', {
          type: 'input',
          text: text,
        });
      }
    }

    _handleCompositionStart(event) {
      this._isComposing = true;
      this._compositionText = '';
      this._editor._emit('compositionStart');
    }

    _handleCompositionUpdate(event) {
      this._compositionText = event.data || '';

      this._editor._emit('compositionUpdate', {
        text: this._compositionText,
      });
    }

    _handleCompositionEnd(event) {
      this._isComposing = false;

      var text = event.data || this._textarea.value;
      var selection = this._editor.getSelection();

      if (text) {
        this._editor.document.replaceRange(selection.start, selection.end, text);
        this._editor.setSelection(selection.start + text.length, selection.start + text.length);
      }

      this._textarea.value = '';
      this._compositionText = '';

      this._editor._emit('compositionEnd');
    }

    // ----------------------------------------
    // Keyboard Event Handlers
    // ----------------------------------------

    _handleKeyDown(event) {
      if (this._isComposing) {
        return;
      }

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
      }
    }

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
    }

    _handleHomeEnd(key, shiftKey, modKey) {
      var edge = key === 'Home' ? 'start' : 'end';
      this._editor.moveAllCursorsToLineEdge(edge, shiftKey, modKey);
    }

    _handleBackspace(modKey) {
      if (this._editor.hasMultipleCursors()) {
        this._editor.deleteAtAllCursors(false, modKey);
        return;
      }

      var doc = this._editor.document;
      var selection = this._editor.getSelection();
      var start = selection.start;
      var end = selection.end;

      if (start === end && start > 0) {
        start = modKey ? this._findWordBoundary(start, -1) : start - 1;
      }

      if (start !== end) {
        doc.delete(start, end);
        this._editor.setSelection(start, start);
      }
    }

    _handleDelete(modKey) {
      if (this._editor.hasMultipleCursors()) {
        this._editor.deleteAtAllCursors(true, modKey);
        return;
      }

      var doc = this._editor.document;
      var selection = this._editor.getSelection();
      var start = selection.start;
      var end = selection.end;

      if (start === end && end < doc.getLength()) {
        end = modKey ? this._findWordBoundary(end, 1) : end + 1;
      }

      if (start !== end) {
        doc.delete(start, end);
        this._editor.setSelection(start, start);
      }
    }

    _handleEnter() {
      this._editor.insertText('\n');
    }

    _handleTab(shiftKey) {
      var tabText = '  ';
      this._editor.insertText(tabText);
    }

    _handleSelectAll() {
      this._editor.setSelection(0, this._editor.document.getLength());
    }

    // ----------------------------------------
    // Focus & Mouse Handlers
    // ----------------------------------------

    _handleFocus() {
      this._editor._emit('focus');
    }

    _handleBlur() {
      this._editor._emit('blur');
    }

    _handleMouseDown(event) {
      var position = this._editor.view.getPositionFromPoint(event.clientX, event.clientY);

      if (position !== null) {
        var offset = this._editor.document.positionToOffset(position.line, position.column);
        this._editor.setSelection(offset, offset, true); // skipScroll for mouse click
      }

      this._textarea.focus();
    }

    _handleSelectionChange() {
      var selection = window.getSelection();

      if (!selection || !selection.rangeCount || !this._element.contains(selection.anchorNode)) {
        return;
      }

      if (this._isComposing) {
        return;
      }

      try {
        var range = selection.getRangeAt(0);

        var start = this._getOffsetFromNode(range.startContainer, range.startOffset);
        var end = this._getOffsetFromNode(range.endContainer, range.endOffset);

        if (start !== null && end !== null) {
          var currentSelection = this._editor.getSelection();

          if (currentSelection.start !== start || currentSelection.end !== end) {
            this._editor.setSelection(start, end, true); // skipScroll for mouse drag
          }
        }
      } catch (error) {
        // Silently ignore errors
      }
    }

    // ----------------------------------------
    // Clipboard Handlers
    // ----------------------------------------

    _handlePaste(event) {
      event.preventDefault();

      var text = event.clipboardData ? event.clipboardData.getData('text/plain') : '';
      if (!text) return;

      if (this._editor.hasMultipleCursors()) {
        var normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        var lines = normalizedText.split('\n');
        var selections = this._editor.getSelections();

        if (lines.length === selections.count) {
          this._smartPasteMultiCursor(lines, selections);
        } else {
          this._editor.insertText(text);
        }
        return;
      }

      var selection = this._editor.getSelection();
      this._editor.document.replaceRange(selection.start, selection.end, text);
      this._editor.setSelection(selection.start + text.length, selection.start + text.length);
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

    _handleCopy(event) {
      if (this._editor.hasMultipleCursors()) {
        var texts = this._editor.getAllSelectedTexts();
        var hasSelection = texts.some(function(t) { return t.length > 0; });

        if (hasSelection) {
          var combinedText = texts.filter(function(t) { return t.length > 0; }).join('\n');
          if (event.clipboardData) {
            event.clipboardData.setData('text/plain', combinedText);
          }
          event.preventDefault();
        }
        return;
      }

      var selection = this._editor.getSelection();
      if (selection.start !== selection.end) {
        var text = this._editor.document.getTextRange(selection.start, selection.end);
        if (event.clipboardData) {
          event.clipboardData.setData('text/plain', text);
        }
        event.preventDefault();
      }
    }

    _handleCut(event) {
      if (this._editor.hasMultipleCursors()) {
        var texts = this._editor.getAllSelectedTexts();
        var hasSelection = texts.some(function(t) { return t.length > 0; });

        if (hasSelection) {
          var combinedText = texts.filter(function(t) { return t.length > 0; }).join('\n');
          if (event.clipboardData) {
            event.clipboardData.setData('text/plain', combinedText);
          }
          event.preventDefault();
          this._editor.insertText('');
        }
        return;
      }

      var selection = this._editor.getSelection();
      if (selection.start !== selection.end) {
        var text = this._editor.document.getTextRange(selection.start, selection.end);
        if (event.clipboardData) {
          event.clipboardData.setData('text/plain', text);
        }
        this._editor.document.delete(selection.start, selection.end);
        this._editor.setSelection(selection.start, selection.start);
        event.preventDefault();
      }
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

      var walker = document.createTreeWalker(
        lineElement,
        NodeFilter.SHOW_TEXT,
        null
      );

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
        var walker2 = document.createTreeWalker(
          node,
          NodeFilter.SHOW_TEXT,
          null
        );

        columnOffset = 0;
        var childCount = 0;
        while (walker2.nextNode() && childCount < nodeOffset) {
          columnOffset += walker2.currentNode.textContent.length;
          childCount++;
        }
      }

      return this._editor.document.positionToOffset(lineIndex, columnOffset);
    }

    // ----------------------------------------
    // Public Methods
    // ----------------------------------------

    updatePosition(cursorRect) {
      if (!this._textarea) return;

      Object.assign(this._textarea.style, {
        top: cursorRect.top + 'px',
        left: cursorRect.left + 'px',
        height: cursorRect.height + 'px',
        lineHeight: cursorRect.height + 'px',
      });
    }

    focus() {
      if (this._textarea) {
        this._textarea.focus({ preventScroll: true });
      }
    }

    isFocused() {
      return document.activeElement === this._textarea;
    }

    isComposing() {
      return this._isComposing;
    }

    getCompositionRanges() {
      if (!this._isComposing) return [];

      var selection = this._editor.getSelection();
      return [
        {
          start: selection.start,
          end: selection.start + this._compositionText.length,
          underlineStyle: 'solid-underline',
        },
      ];
    }

    dispose() {
      if (this._disposed) return;

      if (this._textarea) {
        this._textarea.remove();
      }
      this._textarea = null;
      this._disposed = true;
    }
  }

  // ============================================
  // Export to Namespace
  // ============================================

  CodeEditor.TextareaHandler = TextareaHandler;

})(window.CodeEditor = window.CodeEditor || {});
