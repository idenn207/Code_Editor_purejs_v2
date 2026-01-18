/**
 * @fileoverview Test result reporter for HTML display
 * @module tests/framework/TestReporter
 */

(function(window) {
  'use strict';

  // ============================================
  // TestReporter
  // ============================================

  var TestReporter = {

    /** @type {Object|null} Stored results for copy functionality */
    _lastResults: null,

    /**
     * Render test results to a container
     * @param {Object} results - Test results from TestRunner.run()
     * @param {HTMLElement} container - Container element
     */
    render: function(results, container) {
      // Store results for copy functionality
      this._lastResults = results;
      var html = '<div class="test-report">';

      // Summary bar
      html += this._renderSummary(results);

      // Progress bar
      html += this._renderProgressBar(results);

      // Filter buttons
      html += this._renderFilters();

      // Test results list
      html += this._renderResults(results);

      html += '</div>';

      container.innerHTML = html;

      // Add filter event listeners
      this._attachFilterListeners(container);
    },

    /**
     * Render summary section
     * @param {Object} results - Test results
     * @returns {string} HTML string
     */
    _renderSummary: function(results) {
      var total = results.passed + results.failed + results.skipped;
      var status = results.failed > 0 ? 'failed' : 'passed';

      var html = '<div class="test-summary ' + status + '">';
      html += '<div class="summary-title">';
      html += results.failed > 0 ? 'Tests Failed' : 'All Tests Passed';
      html += '</div>';

      html += '<div class="summary-stats">';
      html += '<span class="stat passed">' + results.passed + ' passed</span>';
      if (results.failed > 0) {
        html += '<span class="stat failed">' + results.failed + ' failed</span>';
      }
      if (results.skipped > 0) {
        html += '<span class="stat skipped">' + results.skipped + ' skipped</span>';
      }
      html += '<span class="stat total">' + total + ' total</span>';
      html += '<span class="stat duration">' + results.duration + 'ms</span>';
      html += '</div>';

      html += '</div>';
      return html;
    },

    /**
     * Render progress bar
     * @param {Object} results - Test results
     * @returns {string} HTML string
     */
    _renderProgressBar: function(results) {
      var total = results.passed + results.failed + results.skipped;
      if (total === 0) return '';

      var passedPercent = (results.passed / total * 100).toFixed(1);
      var failedPercent = (results.failed / total * 100).toFixed(1);
      var skippedPercent = (results.skipped / total * 100).toFixed(1);

      var html = '<div class="test-progress">';
      if (results.passed > 0) {
        html += '<div class="progress-bar passed" style="width: ' + passedPercent + '%"></div>';
      }
      if (results.failed > 0) {
        html += '<div class="progress-bar failed" style="width: ' + failedPercent + '%"></div>';
      }
      if (results.skipped > 0) {
        html += '<div class="progress-bar skipped" style="width: ' + skippedPercent + '%"></div>';
      }
      html += '</div>';
      return html;
    },

    /**
     * Render filter buttons
     * @returns {string} HTML string
     */
    _renderFilters: function() {
      var html = '<div class="test-filters">';

      // Status filters
      html += '<div class="filter-group">';
      html += '<span class="filter-label">Status:</span>';
      html += '<button class="filter-btn status-filter active" data-filter="all">All</button>';
      html += '<button class="filter-btn status-filter" data-filter="passed">Passed</button>';
      html += '<button class="filter-btn status-filter" data-filter="failed">Failed</button>';
      html += '<button class="filter-btn status-filter" data-filter="skipped">Skipped</button>';
      html += '</div>';

      // Category filters
      html += '<div class="filter-group">';
      html += '<span class="filter-label">Category:</span>';
      html += '<button class="filter-btn category-filter active" data-category="all">All</button>';
      html += '<button class="filter-btn category-filter" data-category="unit">Unit</button>';
      html += '<button class="filter-btn category-filter" data-category="integration">Integration</button>';
      html += '<button class="filter-btn category-filter" data-category="e2e">E2E</button>';
      html += '</div>';

      html += '<button class="copy-btn" id="copyFailed">Copy Failed</button>';
      html += '</div>';
      return html;
    },

    /**
     * Render test results list
     * @param {Object} results - Test results
     * @returns {string} HTML string
     */
    _renderResults: function(results) {
      var html = '<div class="test-results-list">';

      results.results.forEach(function(result) {
        var category = result.category || 'unknown';
        html += '<div class="test-result ' + result.status + '" data-status="' + result.status + '" data-category="' + category + '">';

        // Status icon
        var icon = result.status === 'passed' ? '✓' :
                   result.status === 'failed' ? '✗' : '○';
        html += '<span class="result-icon">' + icon + '</span>';

        // Test name
        html += '<span class="result-name">' + escapeHtml(result.name) + '</span>';

        // Duration
        if (result.duration !== undefined) {
          html += '<span class="result-duration">' + result.duration + 'ms</span>';
        }

        // Error details (for failed tests)
        if (result.status === 'failed' && result.error) {
          html += '<div class="result-error">';
          html += '<div class="error-message">' + escapeHtml(result.error) + '</div>';
          if (result.stack) {
            html += '<pre class="error-stack">' + escapeHtml(formatStack(result.stack)) + '</pre>';
          }
          html += '</div>';
        }

        html += '</div>';
      });

      html += '</div>';
      return html;
    },

    /**
     * Format failed test results as text for clipboard
     * @param {Object} results - Test results
     * @returns {string} Formatted text
     */
    _formatResultsAsText: function(results) {
      var failed = results.results.filter(function(r) {
        return r.status === 'failed';
      });

      if (failed.length === 0) {
        return 'No failed tests!';
      }

      var total = results.passed + results.failed + results.skipped;
      var lines = [];

      lines.push('FAILED TESTS (' + failed.length + '/' + total + ')');
      lines.push('=====================================');
      lines.push('');

      failed.forEach(function(result) {
        lines.push('X ' + result.name);
        if (result.error) {
          lines.push('  Error: ' + result.error);
        }
        lines.push('');
      });

      return lines.join('\n');
    },

    /**
     * Attach filter button event listeners
     * @param {HTMLElement} container - Container element
     */
    _attachFilterListeners: function(container) {
      var self = this;
      var statusFilters = container.querySelectorAll('.status-filter');
      var categoryFilters = container.querySelectorAll('.category-filter');
      var results = container.querySelectorAll('.test-result');

      var currentStatusFilter = 'all';
      var currentCategoryFilter = 'all';

      function applyFilters() {
        results.forEach(function(result) {
          var status = result.getAttribute('data-status');
          var category = result.getAttribute('data-category');

          var statusMatch = currentStatusFilter === 'all' || status === currentStatusFilter;
          var categoryMatch = currentCategoryFilter === 'all' || category === currentCategoryFilter;

          if (statusMatch && categoryMatch) {
            result.style.display = '';
          } else {
            result.style.display = 'none';
          }
        });
      }

      // Status filter handlers
      statusFilters.forEach(function(btn) {
        btn.addEventListener('click', function() {
          currentStatusFilter = this.getAttribute('data-filter');

          // Update active button in status group
          statusFilters.forEach(function(b) { b.classList.remove('active'); });
          this.classList.add('active');

          applyFilters();
        });
      });

      // Category filter handlers
      categoryFilters.forEach(function(btn) {
        btn.addEventListener('click', function() {
          currentCategoryFilter = this.getAttribute('data-category');

          // Update active button in category group
          categoryFilters.forEach(function(b) { b.classList.remove('active'); });
          this.classList.add('active');

          applyFilters();
        });
      });

      // Copy Failed button handler
      var copyBtn = container.querySelector('#copyFailed');
      if (copyBtn) {
        copyBtn.addEventListener('click', function() {
          if (!self._lastResults) return;

          var text = self._formatResultsAsText(self._lastResults);

          navigator.clipboard.writeText(text).then(function() {
            // Show success feedback
            var originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            copyBtn.classList.add('copied');

            setTimeout(function() {
              copyBtn.textContent = originalText;
              copyBtn.classList.remove('copied');
            }, 1500);
          }).catch(function(err) {
            console.error('Failed to copy:', err);
            alert('Failed to copy to clipboard');
          });
        });
      }
    },

    /**
     * Get CSS styles for the reporter
     * @returns {string} CSS string
     */
    getStyles: function() {
      return [
        '.test-report { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; }',
        '',
        '.test-summary { padding: 20px; border-radius: 8px; margin-bottom: 16px; }',
        '.test-summary.passed { background: #d4edda; border: 1px solid #28a745; }',
        '.test-summary.failed { background: #f8d7da; border: 1px solid #dc3545; }',
        '.summary-title { font-size: 20px; font-weight: bold; margin-bottom: 8px; }',
        '.test-summary.passed .summary-title { color: #155724; }',
        '.test-summary.failed .summary-title { color: #721c24; }',
        '.summary-stats { display: flex; gap: 16px; flex-wrap: wrap; }',
        '.stat { padding: 4px 8px; border-radius: 4px; font-size: 14px; }',
        '.stat.passed { background: #28a745; color: white; }',
        '.stat.failed { background: #dc3545; color: white; }',
        '.stat.skipped { background: #6c757d; color: white; }',
        '.stat.total { background: #007bff; color: white; }',
        '.stat.duration { background: #17a2b8; color: white; }',
        '',
        '.test-progress { display: flex; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 16px; background: #e9ecef; }',
        '.progress-bar { height: 100%; }',
        '.progress-bar.passed { background: #28a745; }',
        '.progress-bar.failed { background: #dc3545; }',
        '.progress-bar.skipped { background: #6c757d; }',
        '',
        '.test-filters { margin-bottom: 16px; display: flex; gap: 16px; flex-wrap: wrap; align-items: center; }',
        '.filter-group { display: flex; gap: 4px; align-items: center; }',
        '.filter-label { font-size: 13px; color: #666; margin-right: 4px; }',
        '.filter-btn { padding: 6px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; font-size: 13px; }',
        '.filter-btn:hover { background: #f8f9fa; }',
        '.filter-btn.active { background: #007bff; color: white; border-color: #007bff; }',
        '.copy-btn { padding: 6px 12px; border: 1px solid #fd7e14; border-radius: 4px; background: #fd7e14; color: white; cursor: pointer; font-size: 13px; margin-left: auto; }',
        '.copy-btn:hover { background: #e96b00; border-color: #e96b00; }',
        '.copy-btn.copied { background: #28a745; border-color: #28a745; }',
        '',
        '.test-results-list { border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }',
        '.test-result { padding: 12px 16px; border-bottom: 1px solid #eee; display: flex; align-items: flex-start; flex-wrap: wrap; }',
        '.test-result:last-child { border-bottom: none; }',
        '.test-result.passed { background: #f8fff8; }',
        '.test-result.failed { background: #fff8f8; }',
        '.test-result.skipped { background: #f8f8f8; }',
        '.result-icon { width: 20px; font-weight: bold; margin-right: 8px; }',
        '.test-result.passed .result-icon { color: #28a745; }',
        '.test-result.failed .result-icon { color: #dc3545; }',
        '.test-result.skipped .result-icon { color: #6c757d; }',
        '.result-name { flex: 1; font-size: 14px; }',
        '.result-duration { color: #6c757d; font-size: 12px; margin-left: 16px; }',
        '.result-error { width: 100%; margin-top: 8px; padding: 12px; background: #fff0f0; border-radius: 4px; border-left: 3px solid #dc3545; }',
        '.error-message { color: #dc3545; font-weight: 500; margin-bottom: 8px; }',
        '.error-stack { font-size: 12px; color: #666; overflow-x: auto; margin: 0; white-space: pre-wrap; word-break: break-all; }'
      ].join('\n');
    }
  };

  // ============================================
  // Helper Functions
  // ============================================

  /**
   * Escape HTML special characters
   * @param {string} str - String to escape
   * @returns {string}
   */
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Format stack trace for display
   * @param {string} stack - Stack trace
   * @returns {string}
   */
  function formatStack(stack) {
    if (!stack) return '';
    // Remove first line (error message) and clean up
    var lines = stack.split('\n').slice(1);
    return lines.map(function(line) {
      return line.trim();
    }).join('\n');
  }

  // ============================================
  // Export
  // ============================================

  window.TestReporter = TestReporter;

})(window);
