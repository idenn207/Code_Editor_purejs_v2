/**
 * @fileoverview Completion service for autocomplete
 * @module features/autocomplete/CompletionService
 */

import {
  JS_KEYWORDS,
  JS_GLOBALS,
  JS_GLOBAL_FUNCTIONS,
  JS_OBJECT_MEMBERS,
  JS_ARRAY_METHODS,
  JS_STRING_METHODS,
  JS_HTML_ELEMENT_MEMBERS,
  JS_NODE_MEMBERS,
  JS_ELEMENT_RETURNING_METHODS,
  JS_NESTED_MEMBERS,
  JS_METHOD_RETURN_TYPES,
  JS_TYPE_MEMBERS,
} from './data/js-completions.js';

import {
  HTML_TAGS,
  HTML_GLOBAL_ATTRIBUTES,
  HTML_EVENT_ATTRIBUTES,
  HTML_TAG_ATTRIBUTES,
} from './data/html-completions.js';

import {
  CSS_PROPERTIES,
  CSS_PROPERTY_VALUES,
  CSS_COMMON_VALUES,
  CSS_PSEUDO_CLASSES,
  CSS_PSEUDO_ELEMENTS,
  CSS_AT_RULES,
  CSS_FUNCTIONS,
  CSS_COLORS,
} from './data/css-completions.js';

// ============================================
// CompletionService Class
// ============================================

export class CompletionService {
  // ----------------------------------------
  // Public Methods
  // ----------------------------------------

  /**
   * Get completions for the current context
   * @param {string} language - Current language (javascript, html, css)
   * @param {Object} context - Completion context
   * @param {string} context.prefix - Word prefix being typed
   * @param {string} context.lineText - Full line text
   * @param {number} context.column - Cursor column position
   * @param {string} context.fullText - Full document text (optional)
   * @returns {string[]} Array of completion labels
   */
  getCompletions(language, context) {
    const { prefix, lineText, column } = context;

    let items = [];

    switch (language) {
      case 'javascript':
        items = this._getJavaScriptCompletions(lineText, column, prefix, context.fullText);
        break;
      case 'html':
        items = this._getHTMLCompletions(lineText, column, prefix);
        break;
      case 'css':
        items = this._getCSSCompletions(lineText, column, prefix);
        break;
      default:
        items = this._getJavaScriptCompletions(lineText, column, prefix, context.fullText);
    }

    return this._filterAndSort(items, prefix);
  }

  // ----------------------------------------
  // JavaScript Completions
  // ----------------------------------------

  _getJavaScriptCompletions(lineText, column, prefix, fullText = '') {
    const beforeCursor = lineText.slice(0, column);

    // Check for multi-level dot notation (up to 3 levels: a.b.c.)
    // Match patterns like: window.location., document.body.classList., etc.
    const multiDotMatch = beforeCursor.match(/([\w$]+(?:\.[\w$]+)*)\.\s*([\w$]*)$/);
    if (multiDotMatch) {
      const chain = multiDotMatch[1]; // e.g., "window.location" or "element.classList"
      return this._getChainedMemberCompletions(chain, fullText, beforeCursor);
    }

    // Default: keywords and globals
    return [...JS_KEYWORDS, ...JS_GLOBALS, ...JS_GLOBAL_FUNCTIONS];
  }

  /**
   * Get completions for chained member access (e.g., window.location., element.classList.)
   */
  _getChainedMemberCompletions(chain, fullText, beforeCursor) {
    const parts = chain.split('.');

    // Single level: window., document., etc.
    if (parts.length === 1) {
      return this._getJSMemberCompletions(parts[0], fullText, beforeCursor);
    }

    // Multi-level: window.location., element.classList., etc.
    // Try to infer the type at each level
    let currentType = this._inferTypeFromName(parts[0], fullText);
    let currentMembers = null;

    for (let i = 1; i < parts.length; i++) {
      const prop = parts[i];

      // Check if this property has nested members
      if (JS_NESTED_MEMBERS[prop]) {
        currentMembers = JS_NESTED_MEMBERS[prop];
        currentType = null; // Reset type tracking
      }
      // Check if this is a method that returns a known type
      else if (JS_METHOD_RETURN_TYPES[prop]) {
        const returnType = JS_METHOD_RETURN_TYPES[prop];
        currentMembers = JS_TYPE_MEMBERS[returnType] || null;
        currentType = returnType;
      }
      // Check if we have a known type and this property exists on that type
      else if (currentType && JS_TYPE_MEMBERS[currentType]) {
        // Look for nested property on current type
        if (JS_NESTED_MEMBERS[prop]) {
          currentMembers = JS_NESTED_MEMBERS[prop];
          currentType = null;
        } else {
          // Stay with current type's members
          currentMembers = JS_TYPE_MEMBERS[currentType];
        }
      }
      // Unknown - fallback to generic completions
      else {
        currentMembers = null;
        currentType = null;
      }
    }

    // Return the members for the final type in the chain
    if (currentMembers) {
      return currentMembers;
    }

    // Fallback: if the first part is a known object, get its members for the last property
    const lastProp = parts[parts.length - 1];
    if (JS_NESTED_MEMBERS[lastProp]) {
      return JS_NESTED_MEMBERS[lastProp];
    }

    // Ultimate fallback: return HTMLElement members if it looks like an element chain
    if (this._chainLooksLikeDOMElement(parts, fullText)) {
      return JS_HTML_ELEMENT_MEMBERS;
    }

    // Generic fallback
    return [...new Set([...JS_ARRAY_METHODS, ...JS_STRING_METHODS])];
  }

  /**
   * Infer the type of a variable/object name
   */
  _inferTypeFromName(name, fullText) {
    // Known globals
    if (name === 'window') return 'Window';
    if (name === 'document') return 'Document';

    // Check if it's a known object with members
    if (JS_OBJECT_MEMBERS[name]) {
      return name; // Return the object name as type
    }

    // Check if it's an element variable
    if (this._isElementVariable(name, fullText) || this._looksLikeDOMElement(name)) {
      return 'HTMLElement';
    }

    return null;
  }

  /**
   * Check if a chain looks like DOM element access
   */
  _chainLooksLikeDOMElement(parts, fullText) {
    // First part is document or element-like
    if (parts[0] === 'document') return true;
    if (this._looksLikeDOMElement(parts[0])) return true;
    if (this._isElementVariable(parts[0], fullText)) return true;

    // Check if any part is an element-returning method
    for (const part of parts) {
      if (JS_ELEMENT_RETURNING_METHODS.includes(part)) {
        return true;
      }
    }

    return false;
  }

  _getJSMemberCompletions(objectName, fullText, beforeCursor) {
    // Check for known objects
    if (JS_OBJECT_MEMBERS[objectName]) {
      return JS_OBJECT_MEMBERS[objectName];
    }

    // Check if variable was assigned from element-returning methods
    if (fullText && this._isElementVariable(objectName, fullText)) {
      return JS_HTML_ELEMENT_MEMBERS;
    }

    // Check common patterns for DOM elements
    if (this._looksLikeDOMElement(objectName)) {
      return JS_HTML_ELEMENT_MEMBERS;
    }

    // Generic array/string method hints
    return [...new Set([...JS_ARRAY_METHODS, ...JS_STRING_METHODS])];
  }

  /**
   * Check if a variable was assigned from getElementById, querySelector, etc.
   */
  _isElementVariable(varName, fullText) {
    // Patterns to detect element assignment
    const patterns = [
      // const/let/var element = document.getElementById(...)
      new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*(?:document\\.)?getElementById\\s*\\(`, 'm'),
      // const/let/var element = document.querySelector(...)
      new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*(?:document\\.)?querySelector\\s*\\(`, 'm'),
      // const/let/var element = document.createElement(...)
      new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*(?:document\\.)?createElement\\s*\\(`, 'm'),
      // const/let/var element = someElement.closest(...)
      new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*\\w+\\.closest\\s*\\(`, 'm'),
      // const/let/var element = someElement.cloneNode(...)
      new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*\\w+\\.cloneNode\\s*\\(`, 'm'),
      // const/let/var element = event.target
      new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*\\w+\\.target\\b`, 'm'),
      // const/let/var element = event.currentTarget
      new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*\\w+\\.currentTarget\\b`, 'm'),
      // const/let/var element = this (in event handlers context)
      // element = document.getElementById(...) (reassignment)
      new RegExp(`${varName}\\s*=\\s*(?:document\\.)?getElementById\\s*\\(`, 'm'),
      new RegExp(`${varName}\\s*=\\s*(?:document\\.)?querySelector\\s*\\(`, 'm'),
    ];

    for (const pattern of patterns) {
      if (pattern.test(fullText)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if variable name suggests it's a DOM element
   */
  _looksLikeDOMElement(varName) {
    const lowerName = varName.toLowerCase();

    // Common element variable naming patterns
    const elementPatterns = [
      /^el$/,
      /^elem$/,
      /^element$/,
      /el$/i,            // fooEl, myEl
      /elem$/i,          // fooElem
      /element$/i,       // fooElement
      /^btn/i,           // btn, button
      /button$/i,
      /^input/i,
      /input$/i,
      /^div/i,
      /div$/i,
      /^span/i,
      /span$/i,
      /^container/i,
      /container$/i,
      /^wrapper/i,
      /wrapper$/i,
      /^modal/i,
      /modal$/i,
      /^dialog/i,
      /dialog$/i,
      /^form/i,
      /form$/i,
      /^header/i,
      /header$/i,
      /^footer/i,
      /footer$/i,
      /^nav/i,
      /nav$/i,
      /^section/i,
      /section$/i,
      /^canvas/i,
      /canvas$/i,
      /^img/i,
      /^image/i,
      /image$/i,
      /^link/i,
      /link$/i,
      /^anchor/i,
      /^table/i,
      /table$/i,
      /^row/i,
      /row$/i,
      /^cell/i,
      /cell$/i,
      /^list/i,
      /list$/i,
      /^item/i,
      /item$/i,
      /^node/i,
      /node$/i,
      /^dom/i,
      /^target$/i,
      /^parent$/i,
      /^child$/i,
      /^sibling$/i,
    ];

    for (const pattern of elementPatterns) {
      if (pattern.test(lowerName)) {
        return true;
      }
    }

    return false;
  }

  // ----------------------------------------
  // HTML Completions
  // ----------------------------------------

  _getHTMLCompletions(lineText, column, prefix) {
    const beforeCursor = lineText.slice(0, column);

    // Check if we're inside a tag (after < and before >)
    const tagContext = this._getHTMLTagContext(beforeCursor);

    if (tagContext.inTag) {
      if (tagContext.inAttributeValue) {
        // Inside attribute value - provide value completions
        return this._getHTMLAttributeValues(tagContext.tagName, tagContext.attributeName);
      } else if (tagContext.typingTagName) {
        // Still typing the tag name (e.g., "<div", "<d")
        // Return tag completions with snippets
        return this._getHTMLTagCompletions();
      } else if (tagContext.afterTagName) {
        // After tag name with space - provide attribute completions
        return this._getHTMLAttributeCompletions(tagContext.tagName);
      } else {
        // Right after < - provide tag completions
        return this._getHTMLTagCompletions();
      }
    }

    // Check if typing what looks like a tag name without < (e.g., "div", "span")
    // Only if prefix matches a known HTML tag
    if (prefix && this._isHTMLTagPrefix(prefix)) {
      return this._getHTMLTagCompletions();
    }

    // Default: no completions for text content
    return [];
  }

  /**
   * Check if the prefix could be an HTML tag
   */
  _isHTMLTagPrefix(prefix) {
    const lowerPrefix = prefix.toLowerCase();
    return HTML_TAGS.some((tag) => tag.startsWith(lowerPrefix));
  }

  /**
   * Get HTML tag completions with label and insertText
   * @returns {Array<{label: string, insertText: string}>}
   */
  _getHTMLTagCompletions() {
    const selfClosing = new Set([
      'br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base',
      'col', 'embed', 'keygen', 'param', 'source', 'track', 'wbr',
    ]);

    return HTML_TAGS.map((tag) => {
      if (selfClosing.has(tag)) {
        return { label: tag, insertText: `<${tag}>` };
      }
      return { label: tag, insertText: `<${tag}></${tag}>` };
    });
  }

  _getHTMLTagContext(beforeCursor) {
    const result = {
      inTag: false,
      typingTagName: false,  // Currently typing the tag name itself
      afterTagName: false,   // After tag name, space detected, ready for attributes
      inAttributeValue: false,
      tagName: '',
      attributeName: '',
    };

    // Find the last unclosed < tag
    const lastOpenTag = beforeCursor.lastIndexOf('<');
    const lastCloseTag = beforeCursor.lastIndexOf('>');

    if (lastOpenTag > lastCloseTag) {
      result.inTag = true;

      const tagContent = beforeCursor.slice(lastOpenTag + 1);

      // Check if we're in an attribute value first
      const attrValueMatch = tagContent.match(/(\w+)\s*=\s*["']([^"']*)$/);
      if (attrValueMatch) {
        result.inAttributeValue = true;
        result.attributeName = attrValueMatch[1].toLowerCase();
        // Also extract the tag name
        const tagMatch = tagContent.match(/^\/?\s*(\w+)/);
        if (tagMatch) {
          result.tagName = tagMatch[1].toLowerCase();
        }
        return result;
      }

      // Check if we're typing the tag name (no space after tag name)
      // Pattern: "<div" or "</div" or "<" (no space after the partial tag name)
      const typingTagMatch = tagContent.match(/^\/?\s*(\w*)$/);
      if (typingTagMatch) {
        result.typingTagName = true;
        result.tagName = typingTagMatch[1].toLowerCase();
        return result;
      }

      // Check if we're after the tag name (space detected after complete tag name)
      // Pattern: "<div " or "<div class" or "<div class="
      const afterTagMatch = tagContent.match(/^\/?\s*(\w+)\s+/);
      if (afterTagMatch) {
        result.afterTagName = true;
        result.tagName = afterTagMatch[1].toLowerCase();
        return result;
      }
    }

    return result;
  }

  _getHTMLAttributeCompletions(tagName) {
    const tagSpecific = HTML_TAG_ATTRIBUTES[tagName] || [];
    return [...HTML_GLOBAL_ATTRIBUTES, ...HTML_EVENT_ATTRIBUTES, ...tagSpecific];
  }

  _getHTMLAttributeValues(tagName, attributeName) {
    // Common attribute values
    if (attributeName === 'target') {
      return ['_self', '_blank', '_parent', '_top'];
    }
    if (attributeName === 'type' && tagName === 'input') {
      return [
        'text',
        'password',
        'email',
        'number',
        'checkbox',
        'radio',
        'submit',
        'button',
        'file',
        'hidden',
        'date',
        'time',
        'color',
        'range',
      ];
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
    const beforeCursor = lineText.slice(0, column);

    // Check for at-rule
    if (beforeCursor.match(/@\w*$/)) {
      return CSS_AT_RULES.map((r) => r.slice(1)); // Remove @ prefix
    }

    // Check if in property value (after property-name:) - MUST be checked before pseudo-class
    // This detects: "property-name: value" or "property-name:value"
    const propertyValueMatch = beforeCursor.match(/([\w-]+)\s*:\s*([^;]*)$/);
    if (propertyValueMatch) {
      const propertyName = propertyValueMatch[1];
      // Make sure it's a known CSS property, not a selector with pseudo-class
      if (CSS_PROPERTIES.includes(propertyName)) {
        return this._getCSSPropertyValues(propertyName);
      }
    }

    // Check for pseudo-class/element (after : in selectors, not property values)
    // Only match if not inside a declaration (no property-name before the colon)
    const pseudoMatch = beforeCursor.match(/(?:^|[{\s,>+~])[\w.-]*(:+)\s*(\w*)$/);
    if (pseudoMatch) {
      const isDoubleColon = pseudoMatch[1] === '::';
      if (isDoubleColon) {
        return CSS_PSEUDO_ELEMENTS.map((p) => p.slice(2)); // Remove :: prefix
      }
      return CSS_PSEUDO_CLASSES.map((p) => p.replace(/^:/, '')); // Remove : prefix
    }

    // Check if in declaration block (after { or ;) - property completion
    if (beforeCursor.match(/[{;]\s*[\w-]*$/) || beforeCursor.match(/^\s*[\w-]*$/)) {
      return this._getCSSPropertyCompletions();
    }

    // Default: properties
    return this._getCSSPropertyCompletions();
  }

  /**
   * Get CSS property completions with label and insertText
   * Format: "property-name: ;" with cursor between : and ;
   * @returns {Array<{label: string, insertText: string, cursorOffset: number}>}
   */
  _getCSSPropertyCompletions() {
    return CSS_PROPERTIES.map((prop) => ({
      label: prop,
      insertText: `${prop}: ;`,
      cursorOffset: prop.length + 2,  // Position cursor after ": " (before ;)
    }));
  }

  _getCSSPropertyValues(propertyName) {
    // Specific property values
    if (CSS_PROPERTY_VALUES[propertyName]) {
      return [...CSS_PROPERTY_VALUES[propertyName], ...CSS_COMMON_VALUES];
    }

    // Color properties
    if (propertyName.includes('color') || propertyName === 'background') {
      return [...CSS_COLORS, ...CSS_FUNCTIONS.filter((f) => f.startsWith('rgb') || f.startsWith('hsl'))];
    }

    // Transform
    if (propertyName === 'transform') {
      return CSS_FUNCTIONS.filter(
        (f) =>
          f.startsWith('translate') ||
          f.startsWith('rotate') ||
          f.startsWith('scale') ||
          f.startsWith('skew') ||
          f.startsWith('matrix')
      );
    }

    // Default common values
    return CSS_COMMON_VALUES;
  }

  // ----------------------------------------
  // Filtering & Sorting
  // ----------------------------------------

  _filterAndSort(items, prefix) {
    if (!prefix) {
      return items.slice(0, 50); // Limit when no prefix
    }

    const lowerPrefix = prefix.toLowerCase();

    // Helper to get the label for comparison (handles both string and object items)
    const getLabel = (item) => (typeof item === 'string' ? item : item.label);

    // Filter by prefix
    const filtered = items.filter((item) => {
      const label = getLabel(item);
      return label.toLowerCase().startsWith(lowerPrefix);
    });

    // Sort: exact matches first, then alphabetically
    filtered.sort((a, b) => {
      const aLabel = getLabel(a).toLowerCase();
      const bLabel = getLabel(b).toLowerCase();

      // Exact match priority
      if (aLabel === lowerPrefix && bLabel !== lowerPrefix) return -1;
      if (bLabel === lowerPrefix && aLabel !== lowerPrefix) return 1;

      // Alphabetical
      return aLabel.localeCompare(bLabel);
    });

    return filtered.slice(0, 30); // Limit results
  }
}
