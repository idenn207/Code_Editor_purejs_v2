/**
 * @fileoverview Simple Jest-like test runner for browser
 * @module tests/framework/TestRunner
 */

(function(window) {
  'use strict';

  // ============================================
  // Test State
  // ============================================

  var currentSuite = null;
  var suites = [];
  var onlyMode = false;
  var currentFilter = 'all'; // 'all', 'unit', 'integration', 'e2e'
  var currentCategory = null; // Category being registered

  // ============================================
  // Category Management
  // ============================================

  /**
   * Set the category for subsequent test suites
   * @param {string} category - 'unit', 'integration', 'e2e'
   */
  function setCategory(category) {
    currentCategory = category;
  }

  /**
   * Set the filter for running tests
   * @param {string} filter - 'all', 'unit', 'integration', 'e2e'
   */
  function setFilter(filter) {
    currentFilter = filter;
  }

  /**
   * Get current filter
   * @returns {string}
   */
  function getFilter() {
    return currentFilter;
  }

  // ============================================
  // describe/it API
  // ============================================

  /**
   * Define a test suite
   * @param {string} name - Suite name
   * @param {function} fn - Suite function containing tests
   */
  function describe(name, fn) {
    var suite = {
      name: name,
      tests: [],
      beforeEach: null,
      afterEach: null,
      beforeAll: null,
      afterAll: null,
      parent: currentSuite,
      only: false,
      skip: false,
      category: currentSuite ? currentSuite.category : currentCategory
    };

    var previousSuite = currentSuite;
    currentSuite = suite;

    if (previousSuite) {
      previousSuite.tests.push(suite);
    } else {
      suites.push(suite);
    }

    fn();
    currentSuite = previousSuite;
  }

  /**
   * Define a focused test suite (only this suite runs)
   */
  describe.only = function(name, fn) {
    onlyMode = true;
    var suite = {
      name: name,
      tests: [],
      beforeEach: null,
      afterEach: null,
      beforeAll: null,
      afterAll: null,
      parent: currentSuite,
      only: true,
      skip: false,
      category: currentSuite ? currentSuite.category : currentCategory
    };

    var previousSuite = currentSuite;
    currentSuite = suite;

    if (previousSuite) {
      previousSuite.tests.push(suite);
    } else {
      suites.push(suite);
    }

    fn();
    currentSuite = previousSuite;
  };

  /**
   * Define a skipped test suite
   */
  describe.skip = function(name, fn) {
    var suite = {
      name: name,
      tests: [],
      beforeEach: null,
      afterEach: null,
      beforeAll: null,
      afterAll: null,
      parent: currentSuite,
      only: false,
      skip: true,
      category: currentSuite ? currentSuite.category : currentCategory
    };

    if (currentSuite) {
      currentSuite.tests.push(suite);
    } else {
      suites.push(suite);
    }
    // Don't execute fn for skipped suites
  };

  /**
   * Define a test case
   * @param {string} name - Test name
   * @param {function} fn - Test function
   */
  function it(name, fn) {
    if (!currentSuite) {
      throw new Error('it() must be called inside describe()');
    }

    currentSuite.tests.push({
      name: name,
      fn: fn,
      isTest: true,
      only: false,
      skip: false
    });
  }

  /**
   * Define a focused test (only this test runs)
   */
  it.only = function(name, fn) {
    if (!currentSuite) {
      throw new Error('it.only() must be called inside describe()');
    }

    onlyMode = true;
    currentSuite.tests.push({
      name: name,
      fn: fn,
      isTest: true,
      only: true,
      skip: false
    });
  };

  /**
   * Define a skipped test
   */
  it.skip = function(name, fn) {
    if (!currentSuite) {
      throw new Error('it.skip() must be called inside describe()');
    }

    currentSuite.tests.push({
      name: name,
      fn: fn,
      isTest: true,
      only: false,
      skip: true
    });
  };

  // Alias
  var test = it;
  test.only = it.only;
  test.skip = it.skip;

  // ============================================
  // Hooks
  // ============================================

  /**
   * Run before each test in the current suite
   * @param {function} fn - Hook function
   */
  function beforeEach(fn) {
    if (!currentSuite) {
      throw new Error('beforeEach() must be called inside describe()');
    }
    currentSuite.beforeEach = fn;
  }

  /**
   * Run after each test in the current suite
   * @param {function} fn - Hook function
   */
  function afterEach(fn) {
    if (!currentSuite) {
      throw new Error('afterEach() must be called inside describe()');
    }
    currentSuite.afterEach = fn;
  }

  /**
   * Run once before all tests in the current suite
   * @param {function} fn - Hook function
   */
  function beforeAll(fn) {
    if (!currentSuite) {
      throw new Error('beforeAll() must be called inside describe()');
    }
    currentSuite.beforeAll = fn;
  }

  /**
   * Run once after all tests in the current suite
   * @param {function} fn - Hook function
   */
  function afterAll(fn) {
    if (!currentSuite) {
      throw new Error('afterAll() must be called inside describe()');
    }
    currentSuite.afterAll = fn;
  }

  // ============================================
  // Test Runner
  // ============================================

  /**
   * Run all registered test suites
   * @returns {{ passed: number, failed: number, skipped: number, errors: Array, results: Array }}
   */
  function runTests() {
    var results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      results: [],
      startTime: Date.now(),
      endTime: 0,
      filter: currentFilter
    };

    suites.forEach(function(suite) {
      runSuite(suite, results, [], '');
    });

    results.endTime = Date.now();
    results.duration = results.endTime - results.startTime;

    return results;
  }

  /**
   * Run a test suite
   * @param {Object} suite - Suite to run
   * @param {Object} results - Results accumulator
   * @param {Array} hooks - Inherited beforeEach hooks
   * @param {string} prefix - Name prefix for nested suites
   */
  function runSuite(suite, results, hooks, prefix) {
    // Skip if suite is skipped or (in onlyMode and not only)
    if (suite.skip) {
      countSkipped(suite, results);
      return;
    }

    if (onlyMode && !suite.only && !hasOnlyTests(suite)) {
      countSkipped(suite, results);
      return;
    }

    // Skip if category filter is active and suite doesn't match
    if (currentFilter !== 'all' && suite.category && suite.category !== currentFilter) {
      countSkipped(suite, results);
      return;
    }

    var fullName = prefix ? prefix + ' > ' + suite.name : suite.name;

    // Collect hooks
    var allBeforeEach = hooks.slice();
    if (suite.beforeEach) {
      allBeforeEach.push(suite.beforeEach);
    }

    // Run beforeAll
    if (suite.beforeAll) {
      try {
        suite.beforeAll();
      } catch (error) {
        console.error('beforeAll failed in "' + fullName + '": ' + error.message);
      }
    }

    // Run tests
    suite.tests.forEach(function(item) {
      if (item.isTest) {
        runTest(item, results, allBeforeEach, suite.afterEach, fullName, suite.category);
      } else {
        // Nested suite
        runSuite(item, results, allBeforeEach, fullName);
      }
    });

    // Run afterAll
    if (suite.afterAll) {
      try {
        suite.afterAll();
      } catch (error) {
        console.error('afterAll failed in "' + fullName + '": ' + error.message);
      }
    }
  }

  /**
   * Run a single test
   * @param {Object} test - Test to run
   * @param {Object} results - Results accumulator
   * @param {Array} beforeHooks - beforeEach hooks to run
   * @param {function} afterHook - afterEach hook to run
   * @param {string} suiteName - Parent suite name
   */
  function runTest(test, results, beforeHooks, afterHook, suiteName, suiteCategory) {
    var fullName = suiteName + ' > ' + test.name;

    // Skip if test is skipped or (in onlyMode and not only)
    if (test.skip || (onlyMode && !test.only)) {
      results.skipped++;
      results.results.push({
        name: fullName,
        status: 'skipped',
        category: suiteCategory
      });
      console.log('%c○ ' + fullName, 'color: #999');
      return;
    }

    var startTime = Date.now();

    try {
      // Run beforeEach hooks
      beforeHooks.forEach(function(hook) {
        hook();
      });

      // Run test
      test.fn();

      // Test passed
      results.passed++;
      results.results.push({
        name: fullName,
        status: 'passed',
        duration: Date.now() - startTime,
        category: suiteCategory
      });
      console.log('%c✓ ' + fullName, 'color: green');

    } catch (error) {
      // Test failed
      results.failed++;
      var errorInfo = {
        name: fullName,
        status: 'failed',
        error: error.message,
        stack: error.stack,
        duration: Date.now() - startTime,
        category: suiteCategory
      };
      results.errors.push(errorInfo);
      results.results.push(errorInfo);
      console.error('%c✗ ' + fullName + ': ' + error.message, 'color: red');

    } finally {
      // Run afterEach
      if (afterHook) {
        try {
          afterHook();
        } catch (e) {
          console.error('afterEach failed: ' + e.message);
        }
      }
    }
  }

  /**
   * Count skipped tests in a suite
   */
  function countSkipped(suite, results) {
    suite.tests.forEach(function(item) {
      if (item.isTest) {
        results.skipped++;
        results.results.push({
          name: item.name,
          status: 'skipped'
        });
      } else {
        countSkipped(item, results);
      }
    });
  }

  /**
   * Check if suite has any focused tests
   */
  function hasOnlyTests(suite) {
    for (var i = 0; i < suite.tests.length; i++) {
      var item = suite.tests[i];
      if (item.only) return true;
      if (!item.isTest && hasOnlyTests(item)) return true;
    }
    return false;
  }

  // ============================================
  // Reset
  // ============================================

  /**
   * Reset all test state
   */
  function reset() {
    suites = [];
    currentSuite = null;
    onlyMode = false;
  }

  // ============================================
  // Export
  // ============================================

  window.TestRunner = {
    describe: describe,
    it: it,
    test: test,
    beforeEach: beforeEach,
    afterEach: afterEach,
    beforeAll: beforeAll,
    afterAll: afterAll,
    run: runTests,
    reset: reset,
    setCategory: setCategory,
    setFilter: setFilter,
    getFilter: getFilter
  };

  // Global exports
  window.describe = describe;
  window.it = it;
  window.test = test;
  window.beforeEach = beforeEach;
  window.afterEach = afterEach;
  window.beforeAll = beforeAll;
  window.afterAll = afterAll;

})(window);
