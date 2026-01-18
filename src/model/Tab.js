/**
 * Tab - Model for editor tab state
 *
 * Represents a tab in the tab bar, storing file information,
 * dirty state, and editor state (scroll position, selections).
 */
(function(CodeEditor) {
  'use strict';

  class Tab {
    // ============================================
    // Static Members
    // ============================================

    static _idCounter = 0;

    // ============================================
    // Instance Members
    // ============================================

    _id = null;
    _path = '';
    _name = '';
    _language = 'javascript';
    _isDirty = false;
    _isPinned = false;
    _isPreview = false;
    _content = '';
    _originalContent = ''; // Content when opened (for dirty detection)
    _handle = null; // File System Access API handle
    _scrollPosition = { top: 0, left: 0 };
    _selections = []; // Array of {start, end} for multi-cursor support
    _cursorPosition = { line: 0, column: 0 };
    _undoStack = [];
    _redoStack = [];

    // ============================================
    // Constructor
    // ============================================

    /**
     * Create a new Tab
     * @param {Object} options - Tab options
     */
    constructor(options = {}) {
      this._id = options.id || this._generateId();
      this._path = options.path || '';
      this._name = options.name || this._extractName(options.path);
      this._language = options.language || this._detectLanguage(options.path);
      this._isDirty = options.isDirty || false;
      this._isPinned = options.isPinned || false;
      this._isPreview = options.isPreview || false;
      this._content = options.content || '';
      this._originalContent = options.content || '';
      this._handle = options.handle || null;
      this._scrollPosition = options.scrollPosition || { top: 0, left: 0 };
      this._selections = options.selections || [];
      this._cursorPosition = options.cursorPosition || { line: 0, column: 0 };
      this._undoStack = options.undoStack || [];
      this._redoStack = options.redoStack || [];
    }

    // ============================================
    // Public Methods
    // ============================================

    /**
     * Mark the tab as dirty (has unsaved changes)
     */
    markDirty() {
      this._isDirty = true;
    }

    /**
     * Mark the tab as clean (no unsaved changes)
     */
    markClean() {
      this._isDirty = false;
      this._originalContent = this._content;
    }

    /**
     * Update content and check dirty state
     * @param {string} content - New content
     */
    setContent(content) {
      this._content = content;
      this._isDirty = this._content !== this._originalContent;
    }

    /**
     * Save editor state from an editor instance
     * @param {Editor} editor - Editor instance
     */
    saveState(editor) {
      if (!editor) return;

      // Save scroll position
      if (editor.view && typeof editor.view.getScrollPosition === 'function') {
        this._scrollPosition = editor.view.getScrollPosition();
      }

      // Save selections (convert SelectionCollection to array)
      if (typeof editor.getSelections === 'function') {
        var selectionsResult = editor.getSelections();
        // SelectionCollection has .all property, plain array doesn't
        this._selections = selectionsResult.all ? selectionsResult.all : selectionsResult;
      } else if (typeof editor.getSelection === 'function') {
        this._selections = [editor.getSelection()];
      }

      // Save cursor position
      if (typeof editor.getCursorPosition === 'function') {
        this._cursorPosition = editor.getCursorPosition();
      }

      // Save undo/redo stacks
      if (typeof editor.getUndoStack === 'function') {
        this._undoStack = editor.getUndoStack();
      }
      if (typeof editor.getRedoStack === 'function') {
        this._redoStack = editor.getRedoStack();
      }
    }

    /**
     * Restore editor state to an editor instance
     * @param {Editor} editor - Editor instance
     */
    restoreState(editor) {
      if (!editor) return;

      // Restore scroll position
      if (editor.view && typeof editor.view.setScrollPosition === 'function') {
        editor.view.setScrollPosition(this._scrollPosition);
      }

      // Restore selections
      if (this._selections.length > 0) {
        if (typeof editor.setSelections === 'function') {
          editor.setSelections(this._selections);
        } else if (typeof editor.setSelection === 'function' && this._selections[0]) {
          var sel = this._selections[0];
          editor.setSelection(sel.start, sel.end);
        }
      }

      // Restore cursor position (if no selection)
      if (this._selections.length === 0 && typeof editor.setCursorPosition === 'function') {
        editor.setCursorPosition(this._cursorPosition.line, this._cursorPosition.column);
      }

      // Restore undo/redo stacks
      if (typeof editor.setUndoStack === 'function') {
        editor.setUndoStack(this._undoStack);
      }
      if (typeof editor.setRedoStack === 'function') {
        editor.setRedoStack(this._redoStack);
      }
    }

    /**
     * Pin this tab (prevent closing, move to start)
     */
    pin() {
      this._isPinned = true;
      this._isPreview = false;
    }

    /**
     * Unpin this tab
     */
    unpin() {
      this._isPinned = false;
    }

    /**
     * Convert preview tab to regular tab
     */
    keepOpen() {
      this._isPreview = false;
    }

    /**
     * Check if tab can be closed (not dirty or user confirms)
     * @returns {boolean} True if can close
     */
    canClose() {
      return !this._isDirty;
    }

    /**
     * Clone this tab
     * @returns {Tab} Cloned tab
     */
    clone() {
      var self = this;
      return new Tab({
        path: this._path,
        name: this._name,
        language: this._language,
        content: this._content,
        handle: this._handle,
        scrollPosition: { top: this._scrollPosition.top, left: this._scrollPosition.left },
        selections: this._selections.map(function(s) { return { start: s.start, end: s.end }; }),
        cursorPosition: { line: this._cursorPosition.line, column: this._cursorPosition.column },
        undoStack: this._undoStack.slice(),
        redoStack: this._redoStack.slice(),
      });
    }

    // ============================================
    // Private Methods
    // ============================================

    /**
     * Generate a unique ID
     * @returns {string} Unique ID
     */
    _generateId() {
      return 'tab_' + (++Tab._idCounter) + '_' + Date.now();
    }

    /**
     * Extract filename from path
     * @param {string} path - File path
     * @returns {string} Filename
     */
    _extractName(path) {
      if (!path) return 'Untitled';
      var parts = path.split('/');
      return parts[parts.length - 1] || 'Untitled';
    }

    /**
     * Detect language from file path
     * @param {string} path - File path
     * @returns {string} Language ID
     */
    _detectLanguage(path) {
      if (!path) return 'plaintext';

      var parts = path.split('.');
      var ext = parts.length > 1 ? parts.pop().toLowerCase() : '';
      var langMap = {
        js: 'javascript',
        mjs: 'javascript',
        jsx: 'javascript',
        ts: 'typescript',
        tsx: 'typescript',
        html: 'html',
        htm: 'html',
        css: 'css',
        scss: 'css',
        less: 'css',
        json: 'json',
        md: 'markdown',
        py: 'python',
        rb: 'ruby',
        java: 'java',
        go: 'go',
        rs: 'rust',
        php: 'php',
        sh: 'shell',
        yml: 'yaml',
        yaml: 'yaml',
        xml: 'xml',
        sql: 'sql',
      };

      return langMap[ext] || 'plaintext';
    }

    // ============================================
    // Getters and Setters
    // ============================================

    get id() {
      return this._id;
    }

    get path() {
      return this._path;
    }

    set path(value) {
      this._path = value;
      this._name = this._extractName(value);
      this._language = this._detectLanguage(value);
    }

    get name() {
      return this._name;
    }

    set name(value) {
      this._name = value;
    }

    get language() {
      return this._language;
    }

    set language(value) {
      this._language = value;
    }

    get isDirty() {
      return this._isDirty;
    }

    get isPinned() {
      return this._isPinned;
    }

    get isPreview() {
      return this._isPreview;
    }

    set isPreview(value) {
      this._isPreview = value;
    }

    get content() {
      return this._content;
    }

    get originalContent() {
      return this._originalContent;
    }

    get handle() {
      return this._handle;
    }

    set handle(value) {
      this._handle = value;
    }

    get scrollPosition() {
      return this._scrollPosition;
    }

    get selections() {
      return this._selections;
    }

    get cursorPosition() {
      return this._cursorPosition;
    }

    get undoStack() {
      return this._undoStack;
    }

    set undoStack(value) {
      this._undoStack = value;
    }

    get redoStack() {
      return this._redoStack;
    }

    set redoStack(value) {
      this._redoStack = value;
    }

    /**
     * Get display title (name with dirty indicator)
     * @returns {string} Display title
     */
    get displayTitle() {
      return this._isDirty ? this._name + ' *' : this._name;
    }

    /**
     * Get file extension
     * @returns {string} Extension without dot
     */
    get extension() {
      var parts = this._name.split('.');
      return parts.length > 1 ? parts.pop().toLowerCase() : '';
    }

    /**
     * Check if this is a new untitled file
     * @returns {boolean}
     */
    get isUntitled() {
      return !this._path || this._path === '';
    }
  }

  // ============================================
  // Export to namespace
  // ============================================

  CodeEditor.Tab = Tab;

})(window.CodeEditor = window.CodeEditor || {});
