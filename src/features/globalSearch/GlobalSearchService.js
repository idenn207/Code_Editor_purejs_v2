/**
 * GlobalSearchService - Multi-file search service
 *
 * Provides search functionality across all files in the workspace.
 * Supports regex, case sensitivity, and whole word matching.
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
    includePattern: '',
    excludePattern: ''
  };

  var MAX_MATCHES_PER_FILE = 1000;
  var MAX_TOTAL_MATCHES = 10000;

  // ============================================
  // GlobalSearchService Class
  // ============================================

  class GlobalSearchService {
    // ============================================
    // Instance Members
    // ============================================

    _fileService = null;
    _workspaceService = null;
    _results = new Map();
    _query = '';
    _options = null;
    _isSearching = false;
    _abortRequested = false;
    _listeners = new Map();
    _totalMatches = 0;
    _filesSearched = 0;
    _filesWithMatches = 0;

    // ============================================
    // Constructor
    // ============================================

    /**
     * Create a new GlobalSearchService
     * @param {FileService} fileService - File service instance
     * @param {WorkspaceService} workspaceService - Workspace service instance
     */
    constructor(fileService, workspaceService) {
      this._fileService = fileService;
      this._workspaceService = workspaceService;
      this._options = Object.assign({}, DEFAULT_OPTIONS);
    }

    // ============================================
    // Public Methods
    // ============================================

    /**
     * Search across all files in the workspace
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Map>} Results map (path -> matches[])
     */
    async search(query, options) {
      if (!options) options = {};

      // Abort any ongoing search
      if (this._isSearching) {
        this.abort();
        // Wait a tick for cleanup
        await new Promise(function(resolve) { setTimeout(resolve, 0); });
      }

      this._query = query;
      this._options = Object.assign({}, DEFAULT_OPTIONS, options);
      this._results.clear();
      this._totalMatches = 0;
      this._filesSearched = 0;
      this._filesWithMatches = 0;
      this._abortRequested = false;

      if (!query) {
        this._emit('searchComplete', this._getSearchStats());
        return this._results;
      }

      this._isSearching = true;
      this._emit('searchStart', { query: query });

      try {
        var rootNode = this._workspaceService.getRootFolder();
        if (!rootNode) {
          this._isSearching = false;
          this._emit('searchComplete', this._getSearchStats());
          return this._results;
        }

        // Collect all file nodes (recursively loads unloaded directories)
        var fileNodes = [];
        await this._collectFileNodesAsync(rootNode, fileNodes);

        // Filter by include/exclude patterns
        fileNodes = this._filterFiles(fileNodes);

        // Search each file
        var regex = this._buildRegex();
        if (!regex) {
          this._isSearching = false;
          this._emit('error', { message: 'Invalid search pattern' });
          return this._results;
        }

        for (var i = 0; i < fileNodes.length; i++) {
          if (this._abortRequested) {
            break;
          }

          if (this._totalMatches >= MAX_TOTAL_MATCHES) {
            break;
          }

          var node = fileNodes[i];
          await this._searchFile(node, regex);
          this._filesSearched++;

          // Emit progress
          this._emit('progress', {
            filesSearched: this._filesSearched,
            totalFiles: fileNodes.length,
            matchCount: this._totalMatches
          });
        }
      } catch (err) {
        console.error('GlobalSearchService error:', err);
        this._emit('error', { message: err.message });
      }

      this._isSearching = false;
      this._emit('searchComplete', this._getSearchStats());
      return this._results;
    }

    /**
     * Abort ongoing search
     */
    abort() {
      this._abortRequested = true;
    }

    /**
     * Clear search results
     */
    clear() {
      this._results.clear();
      this._query = '';
      this._totalMatches = 0;
      this._filesSearched = 0;
      this._filesWithMatches = 0;
      this._emit('cleared', {});
    }

    /**
     * Get search results
     * @returns {Map} Results map (path -> matches[])
     */
    getResults() {
      return this._results;
    }

    /**
     * Get total match count
     * @returns {number}
     */
    getTotalMatchCount() {
      return this._totalMatches;
    }

    /**
     * Get number of files with matches
     * @returns {number}
     */
    getFileCount() {
      return this._filesWithMatches;
    }

    /**
     * Get current query
     * @returns {string}
     */
    getQuery() {
      return this._query;
    }

    /**
     * Check if search is in progress
     * @returns {boolean}
     */
    isSearching() {
      return this._isSearching;
    }

    /**
     * Replace a single match in a file
     * @param {string} path - File path
     * @param {number} matchIndex - Index of match in file results
     * @param {string} replacement - Replacement text
     * @returns {Promise<boolean>} Success
     */
    async replaceMatch(path, matchIndex, replacement) {
      var fileMatches = this._results.get(path);
      if (!fileMatches || matchIndex >= fileMatches.length) {
        return false;
      }

      var match = fileMatches[matchIndex];
      var fileData = this._fileService.getFile(path);
      if (!fileData || !fileData.content) {
        return false;
      }

      var content = fileData.content;
      var replacementText = this._processReplacement(replacement, match.text);

      // Replace in content
      var newContent = content.substring(0, match.start) +
                       replacementText +
                       content.substring(match.end);

      // Update file content
      this._fileService.updateFileContent(path, newContent);

      // Update matches - remove this match and adjust offsets
      var delta = replacementText.length - (match.end - match.start);
      fileMatches.splice(matchIndex, 1);

      for (var i = matchIndex; i < fileMatches.length; i++) {
        fileMatches[i].start += delta;
        fileMatches[i].end += delta;
      }

      this._totalMatches--;

      if (fileMatches.length === 0) {
        this._results.delete(path);
        this._filesWithMatches--;
      }

      this._emit('matchReplaced', { path: path, matchIndex: matchIndex });
      return true;
    }

    /**
     * Replace all matches in a specific file
     * @param {string} path - File path
     * @param {string} replacement - Replacement text
     * @returns {Promise<number>} Number of replacements made
     */
    async replaceAllInFile(path, replacement) {
      var fileMatches = this._results.get(path);
      if (!fileMatches || fileMatches.length === 0) {
        return 0;
      }

      var fileData = this._fileService.getFile(path);
      if (!fileData || !fileData.content) {
        return 0;
      }

      var content = fileData.content;
      var count = fileMatches.length;

      // Replace from end to start to preserve offsets
      for (var i = fileMatches.length - 1; i >= 0; i--) {
        var match = fileMatches[i];
        var replacementText = this._processReplacement(replacement, match.text);
        content = content.substring(0, match.start) +
                  replacementText +
                  content.substring(match.end);
      }

      // Update file content
      this._fileService.updateFileContent(path, content);

      // Clear matches for this file
      this._totalMatches -= count;
      this._results.delete(path);
      this._filesWithMatches--;

      this._emit('fileReplaced', { path: path, count: count });
      return count;
    }

    /**
     * Replace all matches in all files
     * @param {string} replacement - Replacement text
     * @returns {Promise<number>} Total number of replacements made
     */
    async replaceAll(replacement) {
      var totalCount = 0;
      var paths = Array.from(this._results.keys());

      for (var i = 0; i < paths.length; i++) {
        var count = await this.replaceAllInFile(paths[i], replacement);
        totalCount += count;
      }

      this._emit('allReplaced', { count: totalCount });
      return totalCount;
    }

    // ============================================
    // Event System
    // ============================================

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
      if (!this._listeners.has(event)) {
        this._listeners.set(event, new Set());
      }
      this._listeners.get(event).add(callback);
      var self = this;
      return function() {
        self._listeners.get(event).delete(callback);
      };
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    _emit(event, data) {
      var listeners = this._listeners.get(event);
      if (listeners) {
        listeners.forEach(function(callback) {
          try {
            callback(data);
          } catch (err) {
            console.error('GlobalSearchService event error:', err);
          }
        });
      }
    }

    // ============================================
    // Private Methods
    // ============================================

    /**
     * Collect all file nodes from the tree (async version)
     * Recursively loads directory contents if not already loaded
     * @param {FileNode} node - Current node
     * @param {Array} files - Array to collect files into
     */
    async _collectFileNodesAsync(node, files) {
      if (node.type === 'file') {
        files.push(node);
      } else if (node.type === 'directory') {
        // Load directory contents if not loaded yet
        if (!node.loaded && node.handle) {
          await this._fileService.loadDirectoryContents(node);
          node.loaded = true;
        }

        // Traverse children
        if (node.children) {
          for (var i = 0; i < node.children.length; i++) {
            await this._collectFileNodesAsync(node.children[i], files);
          }
        }
      }
    }

    /**
     * Filter files by include/exclude patterns
     * @param {Array} files - File nodes array
     * @returns {Array} Filtered file nodes
     */
    _filterFiles(files) {
      var self = this;
      var includePattern = this._options.includePattern;
      var excludePattern = this._options.excludePattern;

      if (!includePattern && !excludePattern) {
        return files;
      }

      return files.filter(function(node) {
        var path = node.path;

        // Check exclude pattern first
        if (excludePattern && self._matchesGlob(path, excludePattern)) {
          return false;
        }

        // Check include pattern
        if (includePattern && !self._matchesGlob(path, includePattern)) {
          return false;
        }

        return true;
      });
    }

    /**
     * Simple glob pattern matching
     * @param {string} path - File path
     * @param {string} pattern - Glob pattern
     * @returns {boolean} Whether path matches pattern
     */
    _matchesGlob(path, pattern) {
      // Split by comma for multiple patterns
      var patterns = pattern.split(',').map(function(p) {
        return p.trim();
      });

      for (var i = 0; i < patterns.length; i++) {
        if (this._matchesSingleGlob(path, patterns[i])) {
          return true;
        }
      }

      return false;
    }

    /**
     * Match a single glob pattern
     * @param {string} path - File path
     * @param {string} pattern - Single glob pattern
     * @returns {boolean}
     */
    _matchesSingleGlob(path, pattern) {
      if (!pattern) return false;

      // Convert glob to regex
      var regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '{{GLOBSTAR}}')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '.')
        .replace(/\{\{GLOBSTAR\}\}/g, '.*');

      try {
        var regex = new RegExp(regexPattern, 'i');
        return regex.test(path);
      } catch (e) {
        return false;
      }
    }

    /**
     * Search a single file
     * @param {FileNode} node - File node
     * @param {RegExp} regex - Search regex
     */
    async _searchFile(node, regex) {
      try {
        // Try to get from cache first
        var fileData = this._fileService.getFile(node.path);
        var content;

        if (fileData && fileData.content !== undefined) {
          content = fileData.content;
        } else {
          // Load file content
          var result = await this._fileService.readFile(node);
          if (!result) return;
          content = result.content;
        }

        if (!content) return;

        // Find matches
        var matches = this._findMatches(content, regex, node.path);

        if (matches.length > 0) {
          this._results.set(node.path, matches);
          this._totalMatches += matches.length;
          this._filesWithMatches++;
        }
      } catch (err) {
        console.warn('Error searching file:', node.path, err);
      }
    }

    /**
     * Find all matches in content
     * @param {string} content - File content
     * @param {RegExp} regex - Search regex
     * @param {string} path - File path for context
     * @returns {Array} Matches array
     */
    _findMatches(content, regex, path) {
      var matches = [];
      var lines = content.split('\n');
      var offset = 0;
      var matchCount = 0;

      // Reset regex lastIndex
      regex.lastIndex = 0;

      var match;
      while ((match = regex.exec(content)) !== null && matchCount < MAX_MATCHES_PER_FILE) {
        if (this._totalMatches + matchCount >= MAX_TOTAL_MATCHES) {
          break;
        }

        var start = match.index;
        var end = start + match[0].length;

        // Calculate line number
        var lineInfo = this._getLineInfo(content, start);

        matches.push({
          start: start,
          end: end,
          line: lineInfo.line,
          column: lineInfo.column,
          text: match[0],
          lineText: lineInfo.lineText,
          previewStart: lineInfo.previewStart,
          previewEnd: lineInfo.previewEnd
        });

        matchCount++;

        // Prevent infinite loop on zero-length matches
        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }

      return matches;
    }

    /**
     * Get line information for an offset
     * @param {string} content - File content
     * @param {number} offset - Character offset
     * @returns {Object} Line info
     */
    _getLineInfo(content, offset) {
      var line = 0;
      var lineStart = 0;

      for (var i = 0; i < offset; i++) {
        if (content[i] === '\n') {
          line++;
          lineStart = i + 1;
        }
      }

      var lineEnd = content.indexOf('\n', offset);
      if (lineEnd === -1) lineEnd = content.length;

      var lineText = content.substring(lineStart, lineEnd);

      // Trim for preview, keeping some context
      var previewStart = Math.max(0, offset - lineStart - 20);
      var previewEnd = Math.min(lineText.length, offset - lineStart + 50);

      return {
        line: line,
        column: offset - lineStart,
        lineText: lineText,
        previewStart: previewStart,
        previewEnd: previewEnd
      };
    }

    /**
     * Build search regex
     * @returns {RegExp|null}
     */
    _buildRegex() {
      if (!this._query) return null;

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

    /**
     * Escape special regex characters
     * @param {string} str - String to escape
     * @returns {string}
     */
    _escapeRegex(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Process replacement string
     * @param {string} replacement - Replacement template
     * @param {string} matchedText - Matched text
     * @returns {string}
     */
    _processReplacement(replacement, matchedText) {
      if (!this._options.regex) {
        return replacement;
      }

      // Handle $& for full match
      var result = replacement.replace(/\$&/g, matchedText);

      // Handle capture groups $1, $2, etc.
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

    /**
     * Get search statistics
     * @returns {Object}
     */
    _getSearchStats() {
      return {
        query: this._query,
        totalMatches: this._totalMatches,
        filesSearched: this._filesSearched,
        filesWithMatches: this._filesWithMatches,
        aborted: this._abortRequested
      };
    }
  }

  // ============================================
  // Export to namespace
  // ============================================

  CodeEditor.GlobalSearchService = GlobalSearchService;

})(window.CodeEditor = window.CodeEditor || {});
