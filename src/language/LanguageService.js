/**
 * @fileoverview Language Service - coordinator for code intelligence
 * @module language/LanguageService
 */

import { Tokenizer, TokenizerState } from '../tokenizer/Tokenizer.js';
import { Parser } from './Parser.js';
import { SymbolTable } from './SymbolTable.js';
import { CompletionProvider } from './providers/CompletionProvider.js';
import { HoverProvider } from './providers/HoverProvider.js';

// ============================================
// Constants
// ============================================

const ANALYSIS_DEBOUNCE_MS = 150;

// ============================================
// Language Service Class
// ============================================

/**
 * Main coordinator for code intelligence features.
 * Manages parsing, symbol table, and completion providers.
 */
export class LanguageService {
  // ----------------------------------------
  // Instance Properties
  // ----------------------------------------
  _document = null;
  _tokenizer = null;
  _parser = null;
  _symbolTable = null;
  _completionProvider = null;
  _hoverProvider = null;

  _ast = null;
  _errors = [];
  _analysisTimer = null;
  _listeners = new Map();
  _disposed = false;

  // ----------------------------------------
  // Constructor
  // ----------------------------------------

  /**
   * @param {Document} document - Document instance
   * @param {Object} options - Configuration options
   */
  constructor(document, options = {}) {
    this._document = document;
    this._language = options.language || 'javascript';

    this._initialize();
  }

  // ----------------------------------------
  // Initialization
  // ----------------------------------------

  _initialize() {
    // Create tokenizer
    this._tokenizer = new Tokenizer(this._language);

    // Create parser
    this._parser = new Parser();

    // Create symbol table
    this._symbolTable = new SymbolTable();

    // Create completion provider
    this._completionProvider = new CompletionProvider(this);

    // Create hover provider
    this._hoverProvider = new HoverProvider(this);

    // Listen to document changes
    this._document.on('change', (change) => this._onDocumentChange(change));

    // Initial analysis
    this._scheduleAnalysis();
  }

  // ----------------------------------------
  // Document Change Handling
  // ----------------------------------------

  _onDocumentChange(change) {
    // Invalidate tokenizer cache from changed line
    this._tokenizer.invalidateFrom(change.startLine);

    // Schedule re-analysis (debounced)
    this._scheduleAnalysis();
  }

  _scheduleAnalysis() {
    if (this._analysisTimer) {
      clearTimeout(this._analysisTimer);
    }

    this._analysisTimer = setTimeout(() => {
      this._analyze();
    }, ANALYSIS_DEBOUNCE_MS);
  }

  // ----------------------------------------
  // Analysis
  // ----------------------------------------

  _analyze() {
    if (this._disposed) return;

    const startTime = performance.now();

    try {
      // Tokenize document
      const text = this._document.getText();
      const lines = this._document.lines;

      // Get all tokens (flattened)
      const allTokens = [];
      let state = TokenizerState.initial();

      for (let i = 0; i < lines.length; i++) {
        const result = this._tokenizer.getLineTokens(i, lines[i], state);
        allTokens.push(...result.tokens);
        state = result.endState;

        // Add newline token between lines (for parser)
        if (i < lines.length - 1) {
          allTokens.push({
            type: 'whitespace',
            value: '\n',
            start: 0,
            end: 1,
          });
        }
      }

      // Parse tokens
      const { ast, errors } = this._parser.parse(allTokens);
      this._ast = ast;
      this._errors = errors;

      // Build symbol table
      this._symbolTable = new SymbolTable();
      this._symbolTable.buildFromAST(ast);

      const elapsed = performance.now() - startTime;
      console.log(`[LanguageService] Analysis complete in ${elapsed.toFixed(2)}ms`);

      // Emit completion event
      this._emit('analysisComplete', {
        ast: this._ast,
        errors: this._errors,
        elapsed,
      });
    } catch (error) {
      console.error('[LanguageService] Analysis error:', error);
      this._errors = [error];

      this._emit('analysisError', { error });
    }
  }

  // ----------------------------------------
  // Public API - Completions
  // ----------------------------------------

  /**
   * Get completions at cursor offset
   * @param {number} offset - Cursor offset
   * @returns {Array} - Completion items
   */
  getCompletions(offset) {
    return this._completionProvider.provideCompletions(this._document, offset);
  }

  // ----------------------------------------
  // Public API - Hover Information
  // ----------------------------------------

  /**
   * Get hover information at cursor offset
   * @param {number} offset - Cursor offset
   * @returns {HoverInfo|null} - Hover information or null
   */
  getHoverInfo(offset) {
    return this._hoverProvider.provideHover(this._document, offset);
  }

  // ----------------------------------------
  // Public API - Diagnostics
  // ----------------------------------------

  /**
   * Get parse errors/warnings
   * @returns {Array} - Diagnostic items
   */
  getDiagnostics() {
    return this._errors.map((error) => ({
      message: error.message,
      severity: 'error',
      token: error.token,
      range: error.token
        ? {
            start: error.token.start,
            end: error.token.end,
          }
        : null,
    }));
  }

  // ----------------------------------------
  // Public API - Symbol Information
  // ----------------------------------------

  /**
   * Get symbol at offset (for hover)
   * @param {number} offset - Cursor offset
   * @returns {Symbol|null}
   */
  getSymbolAt(offset) {
    // Find the word at offset
    const text = this._document.getText();

    // Find word boundaries
    let start = offset;
    let end = offset;

    while (start > 0 && /\w/.test(text[start - 1])) start--;
    while (end < text.length && /\w/.test(text[end])) end++;

    const word = text.slice(start, end);
    if (!word) return null;

    // Look up symbol
    return this._symbolTable.resolve(word);
  }

  /**
   * Get definition location for symbol at offset
   * @param {number} offset - Cursor offset
   * @returns {Object|null} - { start, end } or null
   */
  getDefinition(offset) {
    const symbol = this.getSymbolAt(offset);
    if (symbol && symbol.node) {
      return {
        start: symbol.node.start,
        end: symbol.node.end,
      };
    }
    return null;
  }

  /**
   * Get all references to symbol at offset
   * @param {number} offset - Cursor offset
   * @returns {Array} - Array of { start, end }
   */
  getReferences(offset) {
    // Would need to track identifier usages
    return [];
  }

  // ----------------------------------------
  // Public API - Document Symbols
  // ----------------------------------------

  /**
   * Get document outline (functions, classes, etc.)
   * @returns {Array}
   */
  getDocumentSymbols() {
    const symbols = this._symbolTable.getAllSymbols();

    return symbols
      .filter((s) => ['function', 'class', 'variable'].includes(s.kind))
      .map((s) => ({
        name: s.name,
        kind: s.kind,
        detail: s.type,
        range: s.node ? { start: s.node.start, end: s.node.end } : null,
      }));
  }

  // ----------------------------------------
  // Public API - Getters
  // ----------------------------------------

  /**
   * Get current AST
   * @returns {ASTNode}
   */
  getAST() {
    return this._ast;
  }

  /**
   * Get symbol table
   * @returns {SymbolTable}
   */
  getSymbolTable() {
    return this._symbolTable;
  }

  /**
   * Get all symbol
   * @returns {}
   */
  getAllSymbols() {
    return this._symbolTable.getAllSymbols();
  }

  /**
   * Get tokenizer
   * @returns {Tokenizer}
   */
  getTokenizer() {
    return this._tokenizer;
  }

  // ----------------------------------------
  // Event System
  // ----------------------------------------

  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  _emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[LanguageService] Event handler error:`, error);
        }
      });
    }
  }

  // ----------------------------------------
  // Manual Triggers
  // ----------------------------------------

  /**
   * Force immediate analysis
   */
  analyze() {
    if (this._analysisTimer) {
      clearTimeout(this._analysisTimer);
    }
    this._analyze();
  }

  /**
   * Invalidate all caches
   */
  invalidate() {
    this._tokenizer.clearCache();
    this._ast = null;
    this._symbolTable = new SymbolTable();
    this._scheduleAnalysis();
  }

  // ----------------------------------------
  // Cleanup
  // ----------------------------------------

  dispose() {
    if (this._disposed) return;

    if (this._analysisTimer) {
      clearTimeout(this._analysisTimer);
    }

    this._listeners.clear();
    this._tokenizer.clearCache();
    this._disposed = true;
  }
}
