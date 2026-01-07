/**
 * @fileoverview Completion service for autocomplete
 */

(function(CodeEditor) {
  'use strict';

  // Get completion data from namespace
  var CompletionData = CodeEditor.CompletionData || {};
  var HTMLData = CompletionData.HTML || {};
  var CSSData = CompletionData.CSS || {};

  // HTML completions (using correct property names from html-completions.js)
  var HTML_TAGS = HTMLData.tags || [];
  var HTML_GLOBAL_ATTRIBUTES = HTMLData.globalAttributes || [];
  var HTML_EVENT_ATTRIBUTES = HTMLData.eventAttributes || [];
  var HTML_TAG_ATTRIBUTES = HTMLData.tagAttributes || {};

  // CSS completions (using correct property names from css-completions.js)
  var CSS_PROPERTIES = CSSData.properties || [];
  var CSS_PROPERTY_VALUES = CSSData.propertyValues || {};
  var CSS_COMMON_VALUES = CSSData.commonValues || [];
  var CSS_PSEUDO_CLASSES = CSSData.pseudoClasses || [];
  var CSS_PSEUDO_ELEMENTS = CSSData.pseudoElements || [];
  var CSS_AT_RULES = CSSData.atRules || [];
  var CSS_FUNCTIONS = CSSData.functions || [];
  var CSS_COLORS = CSSData.colors || [];

  // ============================================
  // CompletionService Class
  // ============================================

  class CompletionService {
    // ----------------------------------------
    // Instance Properties
    // ----------------------------------------

    _editor = null;
    _intelligentProvider = null;
    _sortingOptions = null;

    // ----------------------------------------
    // Constructor
    // ----------------------------------------

    /**
     * @param {Object} editor - Optional editor instance for intelligent completions
     * @param {Object} sortingOptions - VSCode-style sorting options
     */
    constructor(editor, sortingOptions) {
      this._editor = editor || null;
      this._sortingOptions = sortingOptions || {};
      this._initIntelligentProvider();
    }

    _initIntelligentProvider() {
      // Try to initialize intelligent provider if editor is available
      if (this._editor && CodeEditor.IntelligentCompletionProvider) {
        try {
          this._intelligentProvider = new CodeEditor.IntelligentCompletionProvider(this._editor);
        } catch (e) {
          console.warn('Failed to initialize IntelligentCompletionProvider:', e);
          this._intelligentProvider = null;
        }
      }
    }

    /**
     * Set the editor instance (for late binding)
     * @param {Object} editor - Editor instance
     */
    setEditor(editor) {
      this._editor = editor;
      this._initIntelligentProvider();
    }

    // ----------------------------------------
    // Public Methods
    // ----------------------------------------

    /**
     * Get completions for the current context
     * @param {string} language - Current language (javascript, html, css)
     * @param {Object} context - Completion context
     * @returns {Array} Array of completion items
     */
    getCompletions(language, context) {
      var prefix = context.prefix;
      var lineText = context.lineText;
      var column = context.column;

      var items = [];

      switch (language) {
        case 'javascript':
          items = this._getJavaScriptCompletions(lineText, column, prefix, context.fullText, context);
          break;
        case 'html':
          items = this._getHTMLCompletions(lineText, column, prefix);
          break;
        case 'css':
          items = this._getCSSCompletions(lineText, column, prefix);
          break;
        default:
          items = this._getJavaScriptCompletions(lineText, column, prefix, context.fullText, context);
      }

      return this._filterAndSort(items, prefix, context);
    }

    // ----------------------------------------
    // JavaScript Completions
    // ----------------------------------------

    _getJavaScriptCompletions(lineText, column, prefix, fullText, context) {
      // Use intelligent completions (type inference based)
      if (this._intelligentProvider && context) {
        var intelligentContext = {
          lineText: lineText,
          column: column,
          prefix: prefix,
          cursorOffset: context.cursorOffset || 0
        };

        if (this._intelligentProvider.hasIntelligentCompletions(intelligentContext)) {
          var intelligentItems = this._intelligentProvider.getCompletions(intelligentContext);
          if (intelligentItems && intelligentItems.length > 0) {
            return intelligentItems;
          }
        }
      }

      // No completions available
      return [];
    }

    // ----------------------------------------
    // HTML Completions
    // ----------------------------------------

    _getHTMLCompletions(lineText, column, prefix) {
      var beforeCursor = lineText.slice(0, column);

      var tagContext = this._getHTMLTagContext(beforeCursor);

      if (tagContext.inTag) {
        if (tagContext.inAttributeValue) {
          return this._getHTMLAttributeValues(tagContext.tagName, tagContext.attributeName);
        } else if (tagContext.typingTagName) {
          return this._getHTMLTagCompletions();
        } else if (tagContext.afterTagName) {
          return this._getHTMLAttributeCompletions(tagContext.tagName);
        } else {
          return this._getHTMLTagCompletions();
        }
      }

      if (prefix && this._isHTMLTagPrefix(prefix)) {
        return this._getHTMLTagCompletions();
      }

      return [];
    }

    _isHTMLTagPrefix(prefix) {
      var lowerPrefix = prefix.toLowerCase();
      return HTML_TAGS.some(function(tag) {
        return tag.startsWith(lowerPrefix);
      });
    }

    _getHTMLTagCompletions() {
      var selfClosing = ['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base',
        'col', 'embed', 'keygen', 'param', 'source', 'track', 'wbr'];

      return HTML_TAGS.map(function(tag) {
        if (selfClosing.indexOf(tag) !== -1) {
          return { label: tag, insertText: '<' + tag + '>' };
        }
        return { label: tag, insertText: '<' + tag + '></' + tag + '>' };
      });
    }

    _getHTMLTagContext(beforeCursor) {
      var result = {
        inTag: false,
        typingTagName: false,
        afterTagName: false,
        inAttributeValue: false,
        tagName: '',
        attributeName: '',
      };

      var lastOpenTag = beforeCursor.lastIndexOf('<');
      var lastCloseTag = beforeCursor.lastIndexOf('>');

      if (lastOpenTag > lastCloseTag) {
        result.inTag = true;

        var tagContent = beforeCursor.slice(lastOpenTag + 1);

        var attrValueMatch = tagContent.match(/(\w+)\s*=\s*["']([^"']*)$/);
        if (attrValueMatch) {
          result.inAttributeValue = true;
          result.attributeName = attrValueMatch[1].toLowerCase();
          var tagMatch = tagContent.match(/^\/?\s*(\w+)/);
          if (tagMatch) {
            result.tagName = tagMatch[1].toLowerCase();
          }
          return result;
        }

        var typingTagMatch = tagContent.match(/^\/?\s*(\w*)$/);
        if (typingTagMatch) {
          result.typingTagName = true;
          result.tagName = typingTagMatch[1].toLowerCase();
          return result;
        }

        var afterTagMatch = tagContent.match(/^\/?\s*(\w+)\s+/);
        if (afterTagMatch) {
          result.afterTagName = true;
          result.tagName = afterTagMatch[1].toLowerCase();
          return result;
        }
      }

      return result;
    }

    _getHTMLAttributeCompletions(tagName) {
      var tagSpecific = HTML_TAG_ATTRIBUTES[tagName] || [];
      return [].concat(HTML_GLOBAL_ATTRIBUTES, HTML_EVENT_ATTRIBUTES, tagSpecific);
    }

    _getHTMLAttributeValues(tagName, attributeName) {
      if (attributeName === 'target') {
        return ['_self', '_blank', '_parent', '_top'];
      }
      if (attributeName === 'type' && tagName === 'input') {
        return ['text', 'password', 'email', 'number', 'checkbox', 'radio',
          'submit', 'button', 'file', 'hidden', 'date', 'time', 'color', 'range'];
      }
      if (attributeName === 'type' && tagName === 'button') {
        return ['submit', 'reset', 'button'];
      }
      if (attributeName === 'method') {
        return ['get', 'post'];
      }
      if (attributeName === 'loading') {
        return ['lazy', 'eager'];
      }
      if (attributeName === 'rel') {
        return ['noopener', 'noreferrer', 'stylesheet', 'icon', 'preload'];
      }

      return [];
    }

    // ----------------------------------------
    // CSS Completions
    // ----------------------------------------

    _getCSSCompletions(lineText, column, prefix) {
      var beforeCursor = lineText.slice(0, column);

      if (beforeCursor.match(/@\w*$/)) {
        return CSS_AT_RULES.map(function(r) { return r.slice(1); });
      }

      var propertyValueMatch = beforeCursor.match(/([\w-]+)\s*:\s*([^;]*)$/);
      if (propertyValueMatch) {
        var propertyName = propertyValueMatch[1];
        if (CSS_PROPERTIES.indexOf(propertyName) !== -1) {
          return this._getCSSPropertyValues(propertyName);
        }
      }

      var pseudoMatch = beforeCursor.match(/(::?)\s*(\w*)$/);
      if (pseudoMatch) {
        var lastOpenBrace = beforeCursor.lastIndexOf('{');
        var lastCloseBrace = beforeCursor.lastIndexOf('}');
        var lastSemicolon = beforeCursor.lastIndexOf(';');

        var inSelectorContext = lastOpenBrace === -1 ||
          lastCloseBrace > lastOpenBrace ||
          (lastSemicolon > lastOpenBrace && beforeCursor.slice(lastSemicolon).match(/^\s*[\w.#\[\]:,>+~\s-]*$/));

        var propMatch = beforeCursor.match(/([\w-]+)\s*:/);
        if (inSelectorContext || (propMatch && CSS_PROPERTIES.indexOf(propMatch[1]) === -1)) {
          var isDoubleColon = pseudoMatch[1] === '::';
          if (isDoubleColon) {
            return CSS_PSEUDO_ELEMENTS.map(function(p) { return p.slice(2); });
          }
          return CSS_PSEUDO_CLASSES.map(function(p) { return p.replace(/^:/, ''); });
        }
      }

      if (beforeCursor.match(/[{;]\s*[\w-]*$/) || beforeCursor.match(/^\s*[\w-]*$/)) {
        return this._getCSSPropertyCompletions();
      }

      return this._getCSSPropertyCompletions();
    }

    _getCSSPropertyCompletions() {
      return CSS_PROPERTIES.map(function(prop) {
        return {
          label: prop,
          insertText: prop + ': ;',
          cursorOffset: prop.length + 2,
        };
      });
    }

    _getCSSPropertyValues(propertyName) {
      var values = [];
      var functions = [];

      if (CSS_PROPERTY_VALUES[propertyName]) {
        values = [].concat(CSS_PROPERTY_VALUES[propertyName], CSS_COMMON_VALUES);
      } else if (propertyName.indexOf('color') !== -1 || propertyName === 'background') {
        values = [].concat(CSS_COLORS, CSS_COMMON_VALUES);
      } else {
        values = CSS_COMMON_VALUES.slice();
      }

      if (propertyName === 'transform') {
        functions = CSS_FUNCTIONS.filter(function(f) {
          return f.indexOf('translate') === 0 || f.indexOf('rotate') === 0 ||
            f.indexOf('scale') === 0 || f.indexOf('skew') === 0 || f.indexOf('matrix') === 0;
        });
      } else if (propertyName.indexOf('color') !== -1 || propertyName === 'background' ||
        propertyName === 'border-color' || propertyName === 'outline-color') {
        functions = CSS_FUNCTIONS.filter(function(f) {
          return f.indexOf('rgb') === 0 || f.indexOf('hsl') === 0 ||
            f.indexOf('linear-gradient') === 0 || f.indexOf('radial-gradient') === 0 ||
            f.indexOf('conic-gradient') === 0 || f === 'var(';
        });
      } else if (propertyName === 'background-image') {
        functions = CSS_FUNCTIONS.filter(function(f) {
          return f.indexOf('url') === 0 || f.indexOf('linear-gradient') === 0 ||
            f.indexOf('radial-gradient') === 0 || f.indexOf('conic-gradient') === 0 || f === 'var(';
        });
      } else if (propertyName === 'width' || propertyName === 'height' ||
        propertyName === 'min-width' || propertyName === 'min-height' ||
        propertyName === 'max-width' || propertyName === 'max-height' ||
        propertyName.indexOf('margin') !== -1 || propertyName.indexOf('padding') !== -1 ||
        propertyName.indexOf('gap') !== -1) {
        functions = CSS_FUNCTIONS.filter(function(f) {
          return f === 'calc(' || f === 'min(' || f === 'max(' || f === 'clamp(' || f === 'var(';
        });
      } else {
        functions = CSS_FUNCTIONS.filter(function(f) {
          return f === 'var(' || f === 'calc(';
        });
      }

      return [].concat(values, functions);
    }

    // ----------------------------------------
    // Filtering & Sorting (VSCode-style)
    // ----------------------------------------

    _filterAndSort(items, prefix, context) {
      var self = this;
      var maxItems = (this._sortingOptions && this._sortingOptions.maxItems) || 50;
      var recentSelections = context && context.recentSelections;
      var cursorLine = context && context.cursorLine;

      if (!prefix) {
        return items.slice(0, maxItems);
      }

      var lowerPrefix = prefix.toLowerCase();

      var getLabel = function(item) {
        return typeof item === 'string' ? item : item.label;
      };

      var isFunction = function(item) {
        var label = getLabel(item);
        return label.charAt(label.length - 1) === '(';
      };

      // Filter items - include prefix matches and CamelCase/snake_case matches
      var filtered = items.filter(function(item) {
        var label = getLabel(item);
        var lowerLabel = label.toLowerCase();

        // Prefix match (case-insensitive)
        if (lowerLabel.indexOf(lowerPrefix) === 0) {
          return true;
        }

        // CamelCase/snake_case match
        if (self._sortingOptions && self._sortingOptions.camelCaseMatch) {
          if (self._matchesCamelCase(label, prefix)) {
            return true;
          }
        }

        return false;
      });

      // Sort with VSCode-style algorithm
      filtered.sort(function(a, b) {
        var aLabel = getLabel(a);
        var bLabel = getLabel(b);

        // 1. Calculate match score (case sensitivity)
        var aScore = self._calculateMatchScore(aLabel, prefix);
        var bScore = self._calculateMatchScore(bLabel, prefix);
        if (aScore !== bScore) return aScore - bScore;

        // 2. Recent usage (if enabled)
        if (self._sortingOptions && self._sortingOptions.recentlyUsed && recentSelections) {
          var aRecent = recentSelections.has(aLabel);
          var bRecent = recentSelections.has(bLabel);
          if (aRecent && !bRecent) return -1;
          if (bRecent && !aRecent) return 1;
        }

        // 3. Non-functions before functions
        var aIsFunction = isFunction(a);
        var bIsFunction = isFunction(b);
        if (aIsFunction && !bIsFunction) return 1;
        if (!aIsFunction && bIsFunction) return -1;

        // 4. Alphabetical
        return aLabel.localeCompare(bLabel);
      });

      return filtered.slice(0, maxItems);
    }

    /**
     * Calculate match score for VSCode-style sorting (lower = better)
     * 0: exact case-sensitive match
     * 1: exact case-insensitive match
     * 2: prefix case-sensitive match
     * 3: prefix case-insensitive match
     * 4: CamelCase/snake_case match
     * 5: no match
     */
    _calculateMatchScore(label, prefix) {
      var lowerLabel = label.toLowerCase();
      var lowerPrefix = prefix.toLowerCase();

      // Exact matches
      if (label === prefix) return 0;
      if (lowerLabel === lowerPrefix) return 1;

      // Prefix matches
      if (label.startsWith(prefix)) return 2;
      if (lowerLabel.startsWith(lowerPrefix)) return 3;

      // CamelCase/snake_case matches
      if (this._sortingOptions && this._sortingOptions.camelCaseMatch) {
        if (this._matchesCamelCase(label, prefix)) return 4;
      }

      return 5;
    }

    /**
     * Check if label matches prefix via CamelCase or snake_case initials
     * "gv" matches "getValue" and "get_value"
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
  }

  // ============================================
  // Export to Namespace
  // ============================================

  CodeEditor.CompletionService = CompletionService;

})(window.CodeEditor = window.CodeEditor || {});
