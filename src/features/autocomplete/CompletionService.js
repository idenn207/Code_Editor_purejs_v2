/**
 * @fileoverview Completion service for autocomplete
 */

(function(CodeEditor) {
  'use strict';

  // Get completion data from namespace
  var CompletionData = CodeEditor.CompletionData || {};
  var JSData = CompletionData.JavaScript || {};
  var HTMLData = CompletionData.HTML || {};
  var CSSData = CompletionData.CSS || {};

  // Get intelligent completion provider (may not be loaded yet)
  var IntelligentCompletionProvider = null;

  // JavaScript completions (using correct property names from js-completions.js)
  var JS_KEYWORDS = JSData.keywords || [];
  var JS_GLOBALS = JSData.globals || [];
  var JS_GLOBAL_FUNCTIONS = JSData.globalFunctions || [];
  var JS_OBJECT_MEMBERS = JSData.objectMembers || {};
  var JS_ARRAY_METHODS = JSData.arrayMethods || [];
  var JS_STRING_METHODS = JSData.stringMethods || [];
  var JS_HTML_ELEMENT_MEMBERS = JSData.htmlElementMembers || [];
  var JS_NODE_MEMBERS = JSData.nodeListMembers || [];
  var JS_ELEMENT_RETURNING_METHODS = Object.keys(JSData.methodReturnTypes || {}).filter(function(m) {
    return JSData.methodReturnTypes[m] === 'HTMLElement';
  });
  var JS_NESTED_MEMBERS = JSData.nestedMembers || {};
  var JS_METHOD_RETURN_TYPES = JSData.methodReturnTypes || {};
  var JS_TYPE_MEMBERS = JSData.typeMembers || {};

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
    _useIntelligentCompletions = true;

    // ----------------------------------------
    // Constructor
    // ----------------------------------------

    /**
     * @param {Object} editor - Optional editor instance for intelligent completions
     */
    constructor(editor) {
      this._editor = editor || null;
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

      return this._filterAndSort(items, prefix);
    }

    // ----------------------------------------
    // JavaScript Completions
    // ----------------------------------------

    _getJavaScriptCompletions(lineText, column, prefix, fullText, context) {
      if (!fullText) fullText = '';
      var beforeCursor = lineText.slice(0, column);

      // Try intelligent completions first if available
      if (this._useIntelligentCompletions && this._intelligentProvider && context) {
        var intelligentContext = {
          lineText: lineText,
          column: column,
          prefix: prefix,
          cursorOffset: context.cursorOffset || 0
        };

        // Check if intelligent provider can handle this context
        if (this._intelligentProvider.hasIntelligentCompletions(intelligentContext)) {
          var intelligentItems = this._intelligentProvider.getCompletions(intelligentContext);

          if (intelligentItems && intelligentItems.length > 0) {
            return intelligentItems;
          }
        }
      }

      // Fall back to pattern-based completions

      // Check for multi-level dot notation
      var multiDotMatch = beforeCursor.match(/([\w$]+(?:\.[\w$]+)*)\.\s*([\w$]*)$/);
      if (multiDotMatch) {
        var chain = multiDotMatch[1];
        return this._getChainedMemberCompletions(chain, fullText, beforeCursor);
      }

      // Default: keywords and globals
      return [].concat(JS_KEYWORDS, JS_GLOBALS, JS_GLOBAL_FUNCTIONS);
    }

    _getChainedMemberCompletions(chain, fullText, beforeCursor) {
      var self = this;
      var parts = chain.split('.');

      if (parts.length === 1) {
        return this._getJSMemberCompletions(parts[0], fullText, beforeCursor);
      }

      var currentType = this._inferTypeFromName(parts[0], fullText);
      var currentMembers = null;

      for (var i = 1; i < parts.length; i++) {
        var prop = parts[i];

        if (JS_NESTED_MEMBERS[prop]) {
          currentMembers = JS_NESTED_MEMBERS[prop];
          currentType = null;
        } else if (JS_METHOD_RETURN_TYPES[prop]) {
          var returnType = JS_METHOD_RETURN_TYPES[prop];
          currentMembers = JS_TYPE_MEMBERS[returnType] || null;
          currentType = returnType;
        } else if (currentType && JS_TYPE_MEMBERS[currentType]) {
          if (JS_NESTED_MEMBERS[prop]) {
            currentMembers = JS_NESTED_MEMBERS[prop];
            currentType = null;
          } else {
            currentMembers = JS_TYPE_MEMBERS[currentType];
          }
        } else {
          currentMembers = null;
          currentType = null;
        }
      }

      if (currentMembers) {
        return currentMembers;
      }

      var lastProp = parts[parts.length - 1];
      if (JS_NESTED_MEMBERS[lastProp]) {
        return JS_NESTED_MEMBERS[lastProp];
      }

      if (this._chainLooksLikeDOMElement(parts, fullText)) {
        return JS_HTML_ELEMENT_MEMBERS;
      }

      var combined = [].concat(JS_ARRAY_METHODS, JS_STRING_METHODS);
      return combined.filter(function(item, index) {
        return combined.indexOf(item) === index;
      });
    }

    _inferTypeFromName(name, fullText) {
      if (name === 'window') return 'Window';
      if (name === 'document') return 'Document';

      if (JS_OBJECT_MEMBERS[name]) {
        return name;
      }

      if (this._isElementVariable(name, fullText) || this._looksLikeDOMElement(name)) {
        return 'HTMLElement';
      }

      return null;
    }

    _chainLooksLikeDOMElement(parts, fullText) {
      if (parts[0] === 'document') return true;
      if (this._looksLikeDOMElement(parts[0])) return true;
      if (this._isElementVariable(parts[0], fullText)) return true;

      for (var i = 0; i < parts.length; i++) {
        if (JS_ELEMENT_RETURNING_METHODS.indexOf(parts[i]) !== -1) {
          return true;
        }
      }

      return false;
    }

    _getJSMemberCompletions(objectName, fullText, beforeCursor) {
      if (JS_OBJECT_MEMBERS[objectName]) {
        return JS_OBJECT_MEMBERS[objectName];
      }

      if (fullText && this._isElementVariable(objectName, fullText)) {
        return JS_HTML_ELEMENT_MEMBERS;
      }

      if (this._looksLikeDOMElement(objectName)) {
        return JS_HTML_ELEMENT_MEMBERS;
      }

      var combined = [].concat(JS_ARRAY_METHODS, JS_STRING_METHODS);
      return combined.filter(function(item, index) {
        return combined.indexOf(item) === index;
      });
    }

    _isElementVariable(varName, fullText) {
      var patterns = [
        new RegExp('(?:const|let|var)\\s+' + varName + '\\s*=\\s*(?:document\\.)?getElementById\\s*\\(', 'm'),
        new RegExp('(?:const|let|var)\\s+' + varName + '\\s*=\\s*(?:document\\.)?querySelector\\s*\\(', 'm'),
        new RegExp('(?:const|let|var)\\s+' + varName + '\\s*=\\s*(?:document\\.)?createElement\\s*\\(', 'm'),
        new RegExp('(?:const|let|var)\\s+' + varName + '\\s*=\\s*\\w+\\.closest\\s*\\(', 'm'),
        new RegExp('(?:const|let|var)\\s+' + varName + '\\s*=\\s*\\w+\\.cloneNode\\s*\\(', 'm'),
        new RegExp('(?:const|let|var)\\s+' + varName + '\\s*=\\s*\\w+\\.target\\b', 'm'),
        new RegExp('(?:const|let|var)\\s+' + varName + '\\s*=\\s*\\w+\\.currentTarget\\b', 'm'),
        new RegExp(varName + '\\s*=\\s*(?:document\\.)?getElementById\\s*\\(', 'm'),
        new RegExp(varName + '\\s*=\\s*(?:document\\.)?querySelector\\s*\\(', 'm'),
      ];

      for (var i = 0; i < patterns.length; i++) {
        if (patterns[i].test(fullText)) {
          return true;
        }
      }

      return false;
    }

    _looksLikeDOMElement(varName) {
      var lowerName = varName.toLowerCase();

      var elementPatterns = [
        /^el$/, /^elem$/, /^element$/,
        /el$/i, /elem$/i, /element$/i,
        /^btn/i, /button$/i,
        /^input/i, /input$/i,
        /^div/i, /div$/i,
        /^span/i, /span$/i,
        /^container/i, /container$/i,
        /^wrapper/i, /wrapper$/i,
        /^modal/i, /modal$/i,
        /^dialog/i, /dialog$/i,
        /^form/i, /form$/i,
        /^header/i, /header$/i,
        /^footer/i, /footer$/i,
        /^nav/i, /nav$/i,
        /^section/i, /section$/i,
        /^canvas/i, /canvas$/i,
        /^img/i, /^image/i, /image$/i,
        /^link/i, /link$/i,
        /^anchor/i,
        /^table/i, /table$/i,
        /^row/i, /row$/i,
        /^cell/i, /cell$/i,
        /^list/i, /list$/i,
        /^item/i, /item$/i,
        /^node/i, /node$/i,
        /^dom/i,
        /^target$/i, /^parent$/i, /^child$/i, /^sibling$/i,
      ];

      for (var i = 0; i < elementPatterns.length; i++) {
        if (elementPatterns[i].test(lowerName)) {
          return true;
        }
      }

      return false;
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
    // Filtering & Sorting
    // ----------------------------------------

    _filterAndSort(items, prefix) {
      if (!prefix) {
        return items.slice(0, 50);
      }

      var lowerPrefix = prefix.toLowerCase();

      var getLabel = function(item) {
        return typeof item === 'string' ? item : item.label;
      };

      var isFunction = function(item) {
        var label = getLabel(item);
        return label.charAt(label.length - 1) === '(';
      };

      var filtered = items.filter(function(item) {
        var label = getLabel(item);
        return label.toLowerCase().indexOf(lowerPrefix) === 0;
      });

      filtered.sort(function(a, b) {
        var aLabel = getLabel(a).toLowerCase();
        var bLabel = getLabel(b).toLowerCase();
        var aIsFunction = isFunction(a);
        var bIsFunction = isFunction(b);

        if (aLabel === lowerPrefix && bLabel !== lowerPrefix && !aIsFunction) return -1;
        if (bLabel === lowerPrefix && aLabel !== lowerPrefix && !bIsFunction) return 1;

        if (aIsFunction && !bIsFunction) return 1;
        if (!aIsFunction && bIsFunction) return -1;

        return aLabel.localeCompare(bLabel);
      });

      return filtered.slice(0, 30);
    }
  }

  // ============================================
  // Export to Namespace
  // ============================================

  CodeEditor.CompletionService = CompletionService;

})(window.CodeEditor = window.CodeEditor || {});
