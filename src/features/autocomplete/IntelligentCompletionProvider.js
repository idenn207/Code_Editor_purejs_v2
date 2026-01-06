/**
 * @fileoverview Intelligent completion provider with type inference
 * @module features/autocomplete/IntelligentCompletionProvider
 */

(function(CodeEditor) {
  'use strict';

  var TYPE_KIND = CodeEditor.Analysis.TYPE_KIND;
  var ScopeAnalyzer = CodeEditor.Analysis.ScopeAnalyzer;
  var TypeInferenceEngine = CodeEditor.Analysis.TypeInferenceEngine;
  var ImportResolver = CodeEditor.Analysis.ImportResolver;
  var BuiltinTypes = CodeEditor.Analysis.BuiltinTypes;

  // ============================================
  // Constants
  // ============================================

  var ANALYSIS_DEBOUNCE_MS = 150;

  // ============================================
  // IntelligentCompletionProvider Class
  // ============================================

  /**
   * Provides context-aware completions using type inference
   */
  class IntelligentCompletionProvider {
    constructor(editor) {
      this._editor = editor;
      this._scopeAnalyzer = new ScopeAnalyzer();
      this._typeEngine = new TypeInferenceEngine(this._scopeAnalyzer);
      this._importResolver = new ImportResolver();
      this._builtinTypes = new BuiltinTypes();

      this._documentVersion = 0;
      this._analysisTimer = null;
      this._lastAnalyzedVersion = -1;

      this._bindEvents();
    }

    // ----------------------------------------
    // Event Binding
    // ----------------------------------------

    _bindEvents() {
      var self = this;

      // Listen for document changes to trigger re-analysis
      this._editor.on('change', function(change) {
        self._scheduleAnalysis();
      });

      // Initial analysis
      this._scheduleAnalysis();
    }

    _scheduleAnalysis() {
      var self = this;
      this._documentVersion++;

      if (this._analysisTimer) {
        clearTimeout(this._analysisTimer);
      }

      this._analysisTimer = setTimeout(function() {
        self._analyzeDocument();
      }, ANALYSIS_DEBOUNCE_MS);
    }

    _analyzeDocument() {
      if (this._documentVersion === this._lastAnalyzedVersion) {
        return;
      }

      var text = this._editor.getValue();
      this._scopeAnalyzer.analyze(text, this._documentVersion);
      this._lastAnalyzedVersion = this._documentVersion;
    }

    // ----------------------------------------
    // Main Completion Methods
    // ----------------------------------------

    /**
     * Get completions for the current context
     * @param {Object} context - Completion context
     * @param {string} context.lineText - Current line text
     * @param {number} context.column - Cursor column
     * @param {string} context.prefix - Current word prefix
     * @param {number} context.cursorOffset - Cursor offset in document
     * @param {number} context.cursorLine - Cursor line for locality bonus
     * @param {Map} context.recentSelections - Recent selection tracking
     * @param {Object} context.sortingOptions - VSCode-style sorting options
     * @returns {Array} Completion items
     */
    getCompletions(context) {
      // Ensure analysis is up to date
      if (this._lastAnalyzedVersion !== this._documentVersion) {
        this._analyzeDocument();
      }

      var lineText = context.lineText;
      var column = context.column;
      var beforeCursor = lineText.slice(0, column);

      // Determine completion context type
      var completionContext = this._getCompletionContext(beforeCursor, context);

      if (!completionContext) {
        return [];
      }

      switch (completionContext.type) {
        case 'memberAccess':
          return this._getMemberCompletions(completionContext, context);

        case 'thisAccess':
          return this._getThisCompletions(completionContext, context);

        case 'identifier':
          return this._getIdentifierCompletions(completionContext, context);

        default:
          return [];
      }
    }

    /**
     * Check if intelligent completions are available for this context
     * @param {Object} context - Completion context
     * @returns {boolean}
     */
    hasIntelligentCompletions(context) {
      var lineText = context.lineText;
      var column = context.column;
      var beforeCursor = lineText.slice(0, column);

      var completionContext = this._getCompletionContext(beforeCursor, context);
      return completionContext !== null;
    }

    // ----------------------------------------
    // Context Detection
    // ----------------------------------------

    _getCompletionContext(beforeCursor, context) {
      // Skip if in string or comment
      if (this._isInStringOrComment(beforeCursor)) {
        return null;
      }

      // Check for 'this.' access
      var thisMatch = beforeCursor.match(/\bthis\.([\w$]*)$/);
      if (thisMatch) {
        return {
          type: 'thisAccess',
          prefix: thisMatch[1]
        };
      }

      // Check for member access chain: expr. or expr.partial
      var memberMatch = beforeCursor.match(/([\w$]+(?:\([^)]*\))?(?:\.[\w$]+(?:\([^)]*\))?)*)\.\s*([\w$]*)$/);
      if (memberMatch) {
        return {
          type: 'memberAccess',
          chain: memberMatch[1],
          prefix: memberMatch[2]
        };
      }

      // Check for identifier completion
      var identMatch = beforeCursor.match(/([\w$]+)$/);
      if (identMatch && identMatch[1].length >= 1) {
        return {
          type: 'identifier',
          prefix: identMatch[1]
        };
      }

      return null;
    }

    _isInStringOrComment(text) {
      var inString = false;
      var stringChar = null;
      var prevChar = '';

      for (var i = 0; i < text.length; i++) {
        var char = text[i];

        // Check for comments
        if (!inString) {
          if (char === '/' && prevChar === '/') {
            return true; // Line comment
          }
        }

        // Check for strings
        if (!inString) {
          if (char === '"' || char === "'" || char === '`') {
            inString = true;
            stringChar = char;
          }
        } else {
          if (char === stringChar && prevChar !== '\\') {
            inString = false;
            stringChar = null;
          }
        }

        prevChar = char;
      }

      return inString;
    }

    // ----------------------------------------
    // Completion Generators
    // ----------------------------------------

    _getMemberCompletions(completionContext, context) {
      var chain = completionContext.chain;
      var prefix = completionContext.prefix;

      // Get cursor position for scope lookup
      var pos = this._editor.document.offsetToPosition(context.cursorOffset);

      // Get members from type inference engine
      var members = this._typeEngine.getMembersOfExpression(chain, pos.line, pos.column);

      // Filter by prefix
      if (prefix) {
        var lowerPrefix = prefix.toLowerCase();
        members = members.filter(function(m) {
          return m.label.toLowerCase().indexOf(lowerPrefix) === 0;
        });
      }

      // Format as completion items
      return this._formatCompletionItems(members, prefix);
    }

    _getThisCompletions(completionContext, context) {
      var prefix = completionContext.prefix;

      // Get cursor position
      var pos = this._editor.document.offsetToPosition(context.cursorOffset);

      // Get this members from type inference engine
      var members = this._typeEngine.getThisMembers(pos.line, pos.column);

      // Filter by prefix
      if (prefix) {
        var lowerPrefix = prefix.toLowerCase();
        members = members.filter(function(m) {
          return m.label.toLowerCase().indexOf(lowerPrefix) === 0;
        });
      }

      return this._formatCompletionItems(members, prefix);
    }

    _getIdentifierCompletions(completionContext, context) {
      var prefix = completionContext.prefix;
      var lowerPrefix = prefix.toLowerCase();

      // Get cursor position
      var pos = this._editor.document.offsetToPosition(context.cursorOffset);

      // Get visible symbols
      var symbols = this._scopeAnalyzer.getVisibleSymbols(pos.line, pos.column);

      // Convert symbols to completion items
      var items = symbols.map(function(symbol) {
        return {
          label: symbol.name,
          insertText: symbol.name,
          kind: symbol.kind,
          typeInfo: symbol.type ? this._typeEngine.getTypeString(symbol.type) : 'any',
          isUnknown: !symbol.type || symbol.type.kind === TYPE_KIND.UNKNOWN,
          sortOrder: this._getSortOrder(symbol),
          declarationLine: symbol.line  // For locality bonus
        };
      }, this);

      // Filter by prefix (including CamelCase/snake_case)
      var self = this;
      items = items.filter(function(item) {
        if (item.label.toLowerCase().indexOf(lowerPrefix) === 0) {
          return true;
        }
        // CamelCase/snake_case match
        if (self._matchesCamelCase(item.label, prefix)) {
          return true;
        }
        return false;
      });

      // Add keywords if they match
      var keywords = this._getMatchingKeywords(prefix);
      items = items.concat(keywords);

      // Sort and dedupe with context
      return this._sortAndDedupe(items, prefix, context);
    }

    _getSortOrder(symbol) {
      // Lower number = higher priority
      switch (symbol.kind) {
        case 'variable':
          return symbol.name.startsWith('_') ? 3 : 0;
        case 'function':
          return 1;
        case 'class':
          return 2;
        case 'parameter':
          return 0;
        default:
          return 4;
      }
    }

    _getMatchingKeywords(prefix) {
      var keywords = [
        'async', 'await', 'break', 'case', 'catch', 'class', 'const',
        'continue', 'debugger', 'default', 'delete', 'do', 'else',
        'export', 'extends', 'false', 'finally', 'for', 'function',
        'if', 'import', 'in', 'instanceof', 'let', 'new', 'null',
        'return', 'static', 'super', 'switch', 'this', 'throw',
        'true', 'try', 'typeof', 'undefined', 'var', 'void',
        'while', 'yield'
      ];

      var lowerPrefix = prefix.toLowerCase();

      return keywords
        .filter(function(kw) {
          return kw.indexOf(lowerPrefix) === 0;
        })
        .map(function(kw) {
          return {
            label: kw,
            insertText: kw,
            kind: 'keyword',
            typeInfo: 'keyword',
            isUnknown: false,
            sortOrder: 5
          };
        });
    }

    // ----------------------------------------
    // Formatting and Sorting
    // ----------------------------------------

    _formatCompletionItems(members, prefix) {
      var self = this;

      return members.map(function(member) {
        return {
          label: member.label,
          insertText: member.insertText || member.label,
          kind: member.kind,
          typeInfo: member.typeInfo || 'any',
          isUnknown: member.isUnknown || false,
          sortOrder: member.sortOrder || 0,
          declarationLine: member.declarationLine  // For locality bonus
        };
      });
    }

    /**
     * Sort and dedupe items with VSCode-style algorithm
     * @param {Array} items - Completion items
     * @param {string} prefix - Current prefix
     * @param {Object} context - Completion context with sortingOptions, recentSelections, cursorLine
     */
    _sortAndDedupe(items, prefix, context) {
      var self = this;

      // Remove duplicates
      var seen = new Set();
      var unique = items.filter(function(item) {
        if (seen.has(item.label)) {
          return false;
        }
        seen.add(item.label);
        return true;
      });

      // Get sorting context
      var sortingOptions = context && context.sortingOptions;
      var recentSelections = context && context.recentSelections;
      var cursorLine = context && context.cursorLine;
      var maxItems = (sortingOptions && sortingOptions.maxItems) || 50;

      // VSCode-style sorting
      unique.sort(function(a, b) {
        // 1. Match score (case sensitivity)
        var aScore = self._calculateMatchScore(a.label, prefix, sortingOptions);
        var bScore = self._calculateMatchScore(b.label, prefix, sortingOptions);
        if (aScore !== bScore) return aScore - bScore;

        // 2. Recent usage (if enabled)
        if (sortingOptions && sortingOptions.recentlyUsed && recentSelections) {
          var aRecent = recentSelections.has(a.label);
          var bRecent = recentSelections.has(b.label);
          if (aRecent && !bRecent) return -1;
          if (bRecent && !aRecent) return 1;
        }

        // 3. Locality bonus (if enabled)
        if (sortingOptions && sortingOptions.localityBonus && cursorLine !== undefined) {
          var aLocality = self._getLocalityScore(a, cursorLine);
          var bLocality = self._getLocalityScore(b, cursorLine);
          if (aLocality !== bLocality) return aLocality - bLocality;
        }

        // 4. Sort order (kind-based priority)
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }

        // 5. Unknown status
        if (a.isUnknown !== b.isUnknown) {
          return a.isUnknown ? 1 : -1;
        }

        // 6. Alphabetical
        return a.label.localeCompare(b.label);
      });

      return unique.slice(0, maxItems);
    }

    /**
     * Calculate match score for VSCode-style sorting (lower = better)
     */
    _calculateMatchScore(label, prefix, sortingOptions) {
      var lowerLabel = label.toLowerCase();
      var lowerPrefix = prefix.toLowerCase();

      // Exact matches
      if (label === prefix) return 0;
      if (lowerLabel === lowerPrefix) return 1;

      // Prefix matches
      if (label.startsWith(prefix)) return 2;
      if (lowerLabel.startsWith(lowerPrefix)) return 3;

      // CamelCase/snake_case matches
      if (!sortingOptions || sortingOptions.camelCaseMatch !== false) {
        if (this._matchesCamelCase(label, prefix)) return 4;
      }

      return 5;
    }

    /**
     * Check if label matches prefix via CamelCase or snake_case initials
     */
    _matchesCamelCase(label, prefix) {
      var lowerPrefix = prefix.toLowerCase();

      // CamelCase: Extract initials from camelCase (getValue -> gv)
      var camelInitials = label.replace(/[^A-Z]/g, '').toLowerCase();
      var camelFull = (label[0] + camelInitials).toLowerCase();
      if (camelFull.startsWith(lowerPrefix)) return true;

      // snake_case: Extract initials from snake_case (get_value -> gv)
      var snakeParts = label.split('_');
      if (snakeParts.length > 1) {
        var snakeInitials = snakeParts.map(function(p) { return p[0] || ''; }).join('').toLowerCase();
        if (snakeInitials.startsWith(lowerPrefix)) return true;
      }

      return false;
    }

    /**
     * Calculate locality score (lower = closer to cursor, better)
     */
    _getLocalityScore(item, cursorLine) {
      if (item.declarationLine === undefined) return 2;  // Unknown = file scope

      var distance = Math.abs(cursorLine - item.declarationLine);
      if (distance < 10) return 0;   // Very close
      if (distance < 50) return 1;   // Same region
      return 2;                       // Far away
    }

    // ----------------------------------------
    // Symbol Lookup API
    // ----------------------------------------

    /**
     * Look up a symbol by name at a position
     * @param {string} name - Symbol name
     * @param {number} line - Line number
     * @param {number} column - Column number
     * @returns {Object|null} Symbol info
     */
    lookupSymbol(name, line, column) {
      return this._scopeAnalyzer.lookupSymbol(name, line, column);
    }

    /**
     * Get the type of an expression
     * @param {string} expression - Expression string
     * @param {number} line - Line number
     * @param {number} column - Column number
     * @returns {Object} Type descriptor
     */
    getExpressionType(expression, line, column) {
      return this._typeEngine.getTypeOfExpression(expression, line, column);
    }

    /**
     * Get a readable type string
     * @param {Object} type - Type descriptor
     * @returns {string}
     */
    getTypeString(type) {
      return this._typeEngine.getTypeString(type);
    }

    // ----------------------------------------
    // Lifecycle
    // ----------------------------------------

    /**
     * Force re-analysis of the document
     */
    refresh() {
      this._lastAnalyzedVersion = -1;
      this._analyzeDocument();
    }

    /**
     * Dispose resources
     */
    dispose() {
      if (this._analysisTimer) {
        clearTimeout(this._analysisTimer);
      }

      this._editor = null;
      this._scopeAnalyzer = null;
      this._typeEngine = null;
      this._importResolver = null;
    }
  }

  // ============================================
  // Export to Namespace
  // ============================================

  CodeEditor.IntelligentCompletionProvider = IntelligentCompletionProvider;

})(window.CodeEditor = window.CodeEditor || {});
