/**
 * @fileoverview Search service for find and replace functionality
 */

(function(CodeEditor) {
  'use strict';

  // ============================================
  // Constants
  // ============================================

  var DEFAULT_OPTIONS = {
    caseSensitive: false,
    wholeWord: false,
    regex: false,
  };

  // ============================================
  // SearchService Class
  // ============================================

  class SearchService {
    // ----------------------------------------
    // Instance Properties
    // ----------------------------------------

    _document = null;
    _query = '';
    _options = null;
    _matches = [];
    _currentIndex = -1;

    // ----------------------------------------
    // Constructor
    // ----------------------------------------

    /**
     * @param {Document} document - The document model to search
     */
    constructor(document) {
      this._document = document;
      this._options = Object.assign({}, DEFAULT_OPTIONS);
    }

    // ----------------------------------------
    // Public Methods
    // ----------------------------------------

    /**
     * Search for all matches of the query in the document
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {number} Number of matches found
     */
    search(query, options) {
      if (!options) options = {};

      this._query = query;
      this._options = Object.assign({}, DEFAULT_OPTIONS, options);
      this._matches = [];
      this._currentIndex = -1;

      if (!query) {
        return 0;
      }

      try {
        this._findAllMatches();
      } catch (e) {
        console.warn('Search error:', e.message);
        return 0;
      }

      if (this._matches.length > 0) {
        this._currentIndex = 0;
      }

      return this._matches.length;
    }

    /**
     * Navigate to the next match
     * @returns {Object|null} The next match or null
     */
    findNext() {
      if (this._matches.length === 0) {
        return null;
      }
      this._currentIndex = (this._currentIndex + 1) % this._matches.length;
      return this.getCurrentMatch();
    }

    /**
     * Navigate to the previous match
     * @returns {Object|null} The previous match or null
     */
    findPrevious() {
      if (this._matches.length === 0) {
        return null;
      }
      this._currentIndex = (this._currentIndex - 1 + this._matches.length) % this._matches.length;
      return this.getCurrentMatch();
    }

    /**
     * Find the match nearest to a given offset
     * @param {number} offset - Document offset
     * @returns {Object|null} The nearest match or null
     */
    findNearestMatch(offset) {
      if (this._matches.length === 0) {
        return null;
      }

      var index = -1;
      for (var i = 0; i < this._matches.length; i++) {
        if (this._matches[i].start >= offset) {
          index = i;
          break;
        }
      }
      if (index === -1) {
        index = 0;
      }

      this._currentIndex = index;
      return this.getCurrentMatch();
    }

    /**
     * Replace the current match
     * @param {string} replacement - Replacement text
     * @returns {Object|null} Replacement info or null
     */
    replace(replacement) {
      var match = this.getCurrentMatch();
      if (!match) {
        return null;
      }

      var replacementText = this._processReplacement(replacement, match.text);
      this._document.replaceRange(match.start, match.end, replacementText);

      var delta = replacementText.length - (match.end - match.start);
      this._matches.splice(this._currentIndex, 1);

      for (var i = this._currentIndex; i < this._matches.length; i++) {
        this._matches[i].start += delta;
        this._matches[i].end += delta;
      }

      if (this._matches.length === 0) {
        this._currentIndex = -1;
      } else if (this._currentIndex >= this._matches.length) {
        this._currentIndex = 0;
      }

      return {
        start: match.start,
        end: match.start + replacementText.length,
        replacedText: match.text,
        replacementText: replacementText,
      };
    }

    /**
     * Replace all matches
     * @param {string} replacement - Replacement text
     * @returns {number} Number of replacements made
     */
    replaceAll(replacement) {
      if (this._matches.length === 0) {
        return 0;
      }

      var count = this._matches.length;

      for (var i = this._matches.length - 1; i >= 0; i--) {
        var match = this._matches[i];
        var replacementText = this._processReplacement(replacement, match.text);
        this._document.replaceRange(match.start, match.end, replacementText);
      }

      this._matches = [];
      this._currentIndex = -1;
      return count;
    }

    /**
     * Get all matches
     * @returns {Array} Array of match objects
     */
    getMatches() {
      return this._matches.slice();
    }

    /**
     * Get the current match
     * @returns {Object|null} Current match or null
     */
    getCurrentMatch() {
      if (this._currentIndex < 0 || this._currentIndex >= this._matches.length) {
        return null;
      }
      return this._matches[this._currentIndex];
    }

    /**
     * Get current match index (1-based)
     * @returns {number} Current index or 0
     */
    getCurrentIndex() {
      return this._matches.length > 0 ? this._currentIndex + 1 : 0;
    }

    /**
     * Get total match count
     * @returns {number} Total matches
     */
    getMatchCount() {
      return this._matches.length;
    }

    /**
     * Clear search state
     */
    clear() {
      this._query = '';
      this._matches = [];
      this._currentIndex = -1;
    }

    /**
     * Get current query
     * @returns {string} Current query
     */
    getQuery() {
      return this._query;
    }

    /**
     * Get current options
     * @returns {Object} Current options
     */
    getOptions() {
      return Object.assign({}, this._options);
    }

    // ----------------------------------------
    // Private Methods
    // ----------------------------------------

    _findAllMatches() {
      var self = this;
      var text = this._document.getText();
      var regex = this._buildRegex();

      if (!regex) {
        return;
      }

      var match;
      var maxMatches = 10000;
      var count = 0;

      while ((match = regex.exec(text)) !== null && count < maxMatches) {
        var start = match.index;
        var end = start + match[0].length;
        var pos = this._document.offsetToPosition(start);

        this._matches.push({
          start: start,
          end: end,
          line: pos.line,
          text: match[0],
        });

        count++;

        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }
    }

    _buildRegex() {
      if (!this._query) {
        return null;
      }

      var pattern = this._query;
      var flags = 'g';

      if (!this._options.regex) {
        pattern = this._escapeRegex(pattern);
      }

      if (this._options.wholeWord) {
        pattern = '\\b' + pattern + '\\b';
      }

      if (!this._options.caseSensitive) {
        flags += 'i';
      }

      try {
        return new RegExp(pattern, flags);
      } catch (e) {
        console.warn('Invalid regex:', e.message);
        return null;
      }
    }

    _escapeRegex(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    _processReplacement(replacement, matchedText) {
      if (!this._options.regex) {
        return replacement;
      }

      var result = replacement.replace(/\$&/g, matchedText);

      if (/\$\d+/.test(result)) {
        try {
          var regex = this._buildRegex();
          if (regex) {
            var singleRegex = new RegExp(regex.source, regex.flags.replace('g', ''));
            var match = matchedText.match(singleRegex);
            if (match) {
              result = result.replace(/\$(\d+)/g, function(_, num) {
                var index = parseInt(num, 10);
                return match[index] !== undefined ? match[index] : '';
              });
            }
          }
        } catch (e) {
          // Ignore capture group errors
        }
      }

      return result;
    }
  }

  // ============================================
  // Export to Namespace
  // ============================================

  CodeEditor.SearchService = SearchService;

})(window.CodeEditor = window.CodeEditor || {});
