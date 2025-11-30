/**
 * @fileoverview Main Editor class - entry point for the code editor
 * @module core/Editor
 *
 * EditContext-based code editor implementation with Language Service.
 * Falls back to hidden textarea for unsupported browsers.
 */

import { AutoComplete } from '../features/AutoComplete.js';
import { InputHandler, isEditContextSupported } from '../input/InputHandler.js';
import { LanguageService } from '../language/LanguageService.js';
import { Document } from '../model/Document.js';
import { EditorView } from '../view/EditorView.js';

// ============================================
// Constants
// ============================================

const DEFAULT_OPTIONS = {
  value: '',
  language: 'javascript',
  readOnly: false,
  tabSize: 2,
  lineHeight: 20,
  fontSize: 14,
  fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
  autoComplete: true,
};

// ============================================
// Class Definition
// ============================================

/**
 * Main code editor class.
 * Provides a unified API for text editing with EditContext support
 * and code intelligence features.
 *
 * @example
 * const editor = new Editor(document.getElementById('editor'), {
 *   value: 'const x = 1;',
 *   language: 'javascript'
 * });
 */
export class Editor {
  // ----------------------------------------
  // Instance Properties
  // ----------------------------------------
  _container = null;
  _options = null;
  _document = null;
  _view = null;
  _inputHandler = null;
  _languageService = null;
  _autoComplete = null;
  _selection = { start: 0, end: 0 };
  _undoStack = [];
  _redoStack = [];
  _listeners = new Map();
  _disposed = false;

  // ----------------------------------------
  // Constructor
  // ----------------------------------------

  /**
   * @param {HTMLElement} container - DOM element to mount editor
   * @param {Object} options - Editor configuration
   */
  constructor(container, options = {}) {
    if (!container || !(container instanceof HTMLElement)) {
      throw new Error('Editor requires a valid DOM element');
    }

    this._container = container;
    this._options = { ...DEFAULT_OPTIONS, ...options };

    this._initialize();
  }

  // ----------------------------------------
  // Initialization
  // ----------------------------------------

  _initialize() {
    // Create document model
    this._document = new Document(this._options.value);

    // Create view
    this._view = new EditorView(this._container, this, {
      lineHeight: this._options.lineHeight,
      fontSize: this._options.fontSize,
      fontFamily: this._options.fontFamily,
      tabSize: this._options.tabSize,
    });

    // Create language service
    this._languageService = new LanguageService(this._document, {
      language: this._options.language,
    });

    // Create input handler (EditContext or fallback)
    this._inputHandler = new InputHandler(this._view.contentElement, this);

    // Create auto-complete (if enabled)
    if (this._options.autoComplete) {
      this._autoComplete = new AutoComplete(this);
    }

    // Track document changes for undo
    this._document.on('change', (change) => this._onDocumentChange(change));

    // Forward language service events
    this._languageService.on('analysisComplete', (data) => {
      this.emit('analysisComplete', data);
    });

    // Log input mode
    console.log(`[Editor] Initialized with ${this._inputHandler.getMode()} input`);
    console.log(`[Editor] EditContext supported: ${isEditContextSupported()}`);
  }

  // ----------------------------------------
  // Document Change Handling
  // ----------------------------------------

  _onDocumentChange(change) {
    // Add to undo stack
    this._undoStack.push({
      type: 'replace',
      startOffset: change.startOffset,
      deletedText: change.deletedText,
      insertedText: change.insertedText,
      selectionBefore: { ...this._selection },
    });

    // Clear redo stack on new change
    this._redoStack = [];

    // Emit change event
    this.emit('change', change);
  }

  // ----------------------------------------
  // Selection Management
  // ----------------------------------------

  /**
   * Get current selection
   * @returns {{ start: number, end: number }}
   */
  getSelection() {
    return { ...this._selection };
  }

  /**
   * Set selection
   * @param {number} start - Selection start offset
   * @param {number} end - Selection end offset
   */
  setSelection(start, end) {
    const docLength = this._document.getLength();

    this._selection = {
      start: Math.max(0, Math.min(start, docLength)),
      end: Math.max(0, Math.min(end, docLength)),
    };

    // Scroll cursor into view
    this._view.scrollToCursor();

    this.emit('selectionChange', this._selection);
  }

  /**
   * Get selected text
   * @returns {string}
   */
  getSelectedText() {
    const { start, end } = this._selection;
    if (start === end) return '';
    return this._document.getTextRange(start, end);
  }

  // ----------------------------------------
  // Undo/Redo
  // ----------------------------------------

  /**
   * Undo last change
   */
  undo() {
    if (this._undoStack.length === 0) return;

    const action = this._undoStack.pop();

    const { startOffset, deletedText, insertedText, selectionBefore } = action;

    this._document.replaceRange(startOffset, startOffset + insertedText.length, deletedText);

    this.setSelection(selectionBefore.start, selectionBefore.end);

    this._redoStack.push(action);

    // Pop the auto-added undo entry
    this._undoStack.pop();
  }

  /**
   * Redo last undone change
   */
  redo() {
    if (this._redoStack.length === 0) return;

    const action = this._redoStack.pop();

    const { startOffset, deletedText, insertedText } = action;

    this._document.replaceRange(startOffset, startOffset + deletedText.length, insertedText);

    const newOffset = startOffset + insertedText.length;
    this.setSelection(newOffset, newOffset);

    // Pop the auto-added undo entry (we'll re-add manually)
    this._undoStack.pop();
    this._undoStack.push(action);
  }

  /**
   * Check if undo is available
   */
  canUndo() {
    return this._undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo() {
    return this._redoStack.length > 0;
  }

  // ----------------------------------------
  // Public API - Text Operations
  // ----------------------------------------

  /**
   * Get entire document text
   * @returns {string}
   */
  getValue() {
    return this._document.getText();
  }

  /**
   * Set entire document text
   * @param {string} text
   */
  setValue(text) {
    this._document.setText(text);
    this.setSelection(0, 0);
    this._languageService.invalidate();
  }

  /**
   * Insert text at current cursor position
   * @param {string} text
   */
  insertText(text) {
    const { start, end } = this._selection;
    this._document.replaceRange(start, end, text);
    this.setSelection(start + text.length, start + text.length);
  }

  /**
   * Get cursor position as line/column
   * @returns {{ line: number, column: number }}
   */
  getCursorPosition() {
    return this._document.offsetToPosition(this._selection.end);
  }

  /**
   * Set cursor position
   * @param {number} line
   * @param {number} column
   */
  setCursorPosition(line, column) {
    const offset = this._document.positionToOffset(line, column);
    this.setSelection(offset, offset);
  }

  // ----------------------------------------
  // Code Intelligence API
  // ----------------------------------------

  /**
   * Get completions at current cursor position
   * @returns {Array} - Completion items
   */
  getCompletions() {
    return this._languageService.getCompletions(this._selection.end);
  }

  /**
   * Get diagnostics (parse errors)
   * @returns {Array} - Diagnostic items
   */
  getDiagnostics() {
    return this._languageService.getDiagnostics();
  }

  /**
   * Get symbol at cursor position
   * @returns {Symbol|null}
   */
  getSymbolAtCursor() {
    return this._languageService.getSymbolAt(this._selection.end);
  }

  /**
   * Get document outline
   * @returns {Array}
   */
  getOutline() {
    return this._languageService.getDocumentSymbols();
  }

  /**
   * Trigger autocomplete manually
   */
  triggerAutoComplete() {
    this._autoComplete?.trigger();
  }

  // ----------------------------------------
  // Focus Management
  // ----------------------------------------

  /**
   * Focus the editor
   */
  focus() {
    this._inputHandler.focus();
  }

  /**
   * Check if editor is focused
   * @returns {boolean}
   */
  isFocused() {
    return this._inputHandler.isFocused();
  }

  // ----------------------------------------
  // Event System
  // ----------------------------------------

  /**
   * Subscribe to editor events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);

    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from editor events
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event
   * @param {string} event
   * @param {*} data
   */
  emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (err) {
          console.error(`Error in ${event} handler:`, err);
        }
      });
    }
  }

  // ----------------------------------------
  // Getters
  // ----------------------------------------

  get document() {
    return this._document;
  }

  get view() {
    return this._view;
  }

  get languageService() {
    return this._languageService;
  }

  get inputMode() {
    return this._inputHandler.getMode();
  }

  get isEditContextSupported() {
    return isEditContextSupported();
  }

  // ----------------------------------------
  // Cleanup
  // ----------------------------------------

  /**
   * Dispose editor and release resources
   */
  dispose() {
    if (this._disposed) return;

    this._autoComplete?.dispose();
    this._languageService?.dispose();
    this._inputHandler?.dispose();
    this._view?.dispose();
    this._listeners.clear();
    this._undoStack = [];
    this._redoStack = [];

    this._disposed = true;
  }
}

// ============================================
// Static Methods
// ============================================

/**
 * Check if EditContext API is available
 * @static
 * @returns {boolean}
 */
Editor.isEditContextSupported = isEditContextSupported;
