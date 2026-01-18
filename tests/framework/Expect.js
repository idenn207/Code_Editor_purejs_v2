/**
 * @fileoverview Jest-like expect() assertions
 * @module tests/framework/Expect
 */

(function(window) {
  'use strict';

  // ============================================
  // Expect Function
  // ============================================

  /**
   * Create an expectation for a value
   * @param {*} actual - Value to test
   * @returns {Expectation}
   */
  function expect(actual) {
    return new Expectation(actual);
  }

  // ============================================
  // Expectation Class
  // ============================================

  /**
   * Expectation class with matchers
   * @class
   * @param {*} actual - Actual value
   */
  function Expectation(actual) {
    this.actual = actual;
    this.negated = false;
  }

  // ----------------------------------------
  // .not modifier
  // ----------------------------------------

  Object.defineProperty(Expectation.prototype, 'not', {
    get: function() {
      var negated = new Expectation(this.actual);
      negated.negated = true;
      return negated;
    }
  });

  // ----------------------------------------
  // Assertion Helper
  // ----------------------------------------

  /**
   * Assert a condition, respecting .not modifier
   * @param {boolean} condition - Condition to check
   * @param {string} message - Error message on failure
   */
  Expectation.prototype._assert = function(condition, message) {
    var passed = this.negated ? !condition : condition;
    if (!passed) {
      throw new Error(message);
    }
  };

  /**
   * Format value for error messages
   * @param {*} value - Value to format
   * @returns {string}
   */
  function formatValue(value) {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'function') return '[Function' + (value.name ? ': ' + value.name : '') + ']';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (e) {
        return '[Object]';
      }
    }
    return JSON.stringify(value);
  }

  // ----------------------------------------
  // Matchers
  // ----------------------------------------

  /**
   * Strict equality (===)
   * @param {*} expected - Expected value
   */
  Expectation.prototype.toBe = function(expected) {
    this._assert(
      this.actual === expected,
      'Expected ' + formatValue(this.actual) +
      (this.negated ? ' not' : '') + ' to be ' + formatValue(expected)
    );
  };

  /**
   * Deep equality
   * @param {*} expected - Expected value
   */
  Expectation.prototype.toEqual = function(expected) {
    this._assert(
      deepEqual(this.actual, expected),
      'Expected ' + formatValue(this.actual) +
      (this.negated ? ' not' : '') + ' to equal ' + formatValue(expected)
    );
  };

  /**
   * Strict deep equality (also checks types)
   * @param {*} expected - Expected value
   */
  Expectation.prototype.toStrictEqual = function(expected) {
    this._assert(
      strictDeepEqual(this.actual, expected),
      'Expected ' + formatValue(this.actual) +
      (this.negated ? ' not' : '') + ' to strictly equal ' + formatValue(expected)
    );
  };

  /**
   * Check if value is truthy
   */
  Expectation.prototype.toBeTruthy = function() {
    this._assert(
      Boolean(this.actual),
      'Expected ' + formatValue(this.actual) +
      (this.negated ? ' not' : '') + ' to be truthy'
    );
  };

  /**
   * Check if value is falsy
   */
  Expectation.prototype.toBeFalsy = function() {
    this._assert(
      !this.actual,
      'Expected ' + formatValue(this.actual) +
      (this.negated ? ' not' : '') + ' to be falsy'
    );
  };

  /**
   * Check if value is null
   */
  Expectation.prototype.toBeNull = function() {
    this._assert(
      this.actual === null,
      'Expected ' + formatValue(this.actual) +
      (this.negated ? ' not' : '') + ' to be null'
    );
  };

  /**
   * Check if value is undefined
   */
  Expectation.prototype.toBeUndefined = function() {
    this._assert(
      this.actual === undefined,
      'Expected ' + formatValue(this.actual) +
      (this.negated ? ' not' : '') + ' to be undefined'
    );
  };

  /**
   * Check if value is defined (not undefined)
   */
  Expectation.prototype.toBeDefined = function() {
    this._assert(
      this.actual !== undefined,
      'Expected value' + (this.negated ? ' not' : '') + ' to be defined'
    );
  };

  /**
   * Check if value is NaN
   */
  Expectation.prototype.toBeNaN = function() {
    this._assert(
      Number.isNaN(this.actual),
      'Expected ' + formatValue(this.actual) +
      (this.negated ? ' not' : '') + ' to be NaN'
    );
  };

  /**
   * Check if value is instance of constructor
   * @param {function} constructor - Constructor function
   */
  Expectation.prototype.toBeInstanceOf = function(constructor) {
    this._assert(
      this.actual instanceof constructor,
      'Expected ' + formatValue(this.actual) +
      (this.negated ? ' not' : '') + ' to be instance of ' +
      (constructor.name || 'Constructor')
    );
  };

  /**
   * Check if array/string contains item
   * @param {*} item - Item to find
   */
  Expectation.prototype.toContain = function(item) {
    var contains;
    if (Array.isArray(this.actual)) {
      contains = this.actual.indexOf(item) !== -1;
    } else if (typeof this.actual === 'string') {
      contains = this.actual.indexOf(item) !== -1;
    } else if (this.actual instanceof Set) {
      contains = this.actual.has(item);
    } else {
      contains = false;
    }

    this._assert(
      contains,
      'Expected ' + formatValue(this.actual) +
      (this.negated ? ' not' : '') + ' to contain ' + formatValue(item)
    );
  };

  /**
   * Check if object contains key
   * @param {string} key - Key to find
   */
  Expectation.prototype.toHaveProperty = function(key) {
    var has = this.actual !== null &&
              this.actual !== undefined &&
              Object.prototype.hasOwnProperty.call(this.actual, key);

    this._assert(
      has,
      'Expected ' + formatValue(this.actual) +
      (this.negated ? ' not' : '') + ' to have property "' + key + '"'
    );
  };

  /**
   * Check array/string length
   * @param {number} length - Expected length
   */
  Expectation.prototype.toHaveLength = function(length) {
    var actualLength = this.actual ? this.actual.length : 0;
    this._assert(
      actualLength === length,
      'Expected length ' + actualLength +
      (this.negated ? ' not' : '') + ' to be ' + length
    );
  };

  /**
   * Check if function throws
   * @param {string|RegExp} [expected] - Expected error message or pattern
   */
  Expectation.prototype.toThrow = function(expected) {
    if (typeof this.actual !== 'function') {
      throw new Error('toThrow() requires a function');
    }

    var threw = false;
    var actualError = null;

    try {
      this.actual();
    } catch (error) {
      threw = true;
      actualError = error;
    }

    if (expected === undefined) {
      this._assert(
        threw,
        'Expected function' + (this.negated ? ' not' : '') + ' to throw'
      );
    } else if (typeof expected === 'string') {
      this._assert(
        threw && actualError.message.indexOf(expected) !== -1,
        'Expected function to throw error containing "' + expected +
        '" but got "' + (actualError ? actualError.message : 'no error') + '"'
      );
    } else if (expected instanceof RegExp) {
      this._assert(
        threw && expected.test(actualError.message),
        'Expected function to throw error matching ' + expected +
        ' but got "' + (actualError ? actualError.message : 'no error') + '"'
      );
    } else if (typeof expected === 'function') {
      this._assert(
        threw && actualError instanceof expected,
        'Expected function to throw ' + (expected.name || 'Error') +
        ' but got ' + (actualError ? actualError.constructor.name : 'no error')
      );
    }
  };

  /**
   * Check if value is greater than expected
   * @param {number} expected - Expected value
   */
  Expectation.prototype.toBeGreaterThan = function(expected) {
    this._assert(
      this.actual > expected,
      'Expected ' + this.actual +
      (this.negated ? ' not' : '') + ' to be greater than ' + expected
    );
  };

  /**
   * Check if value is greater than or equal to expected
   * @param {number} expected - Expected value
   */
  Expectation.prototype.toBeGreaterThanOrEqual = function(expected) {
    this._assert(
      this.actual >= expected,
      'Expected ' + this.actual +
      (this.negated ? ' not' : '') + ' to be greater than or equal to ' + expected
    );
  };

  /**
   * Check if value is less than expected
   * @param {number} expected - Expected value
   */
  Expectation.prototype.toBeLessThan = function(expected) {
    this._assert(
      this.actual < expected,
      'Expected ' + this.actual +
      (this.negated ? ' not' : '') + ' to be less than ' + expected
    );
  };

  /**
   * Check if value is less than or equal to expected
   * @param {number} expected - Expected value
   */
  Expectation.prototype.toBeLessThanOrEqual = function(expected) {
    this._assert(
      this.actual <= expected,
      'Expected ' + this.actual +
      (this.negated ? ' not' : '') + ' to be less than or equal to ' + expected
    );
  };

  /**
   * Check if number is close to expected (floating point)
   * @param {number} expected - Expected value
   * @param {number} [precision=2] - Number of decimal places
   */
  Expectation.prototype.toBeCloseTo = function(expected, precision) {
    if (precision === undefined) precision = 2;
    var diff = Math.abs(this.actual - expected);
    var threshold = Math.pow(10, -precision) / 2;

    this._assert(
      diff < threshold,
      'Expected ' + this.actual +
      (this.negated ? ' not' : '') + ' to be close to ' + expected
    );
  };

  /**
   * Check if string matches pattern
   * @param {RegExp} pattern - Pattern to match
   */
  Expectation.prototype.toMatch = function(pattern) {
    var matches;
    if (pattern instanceof RegExp) {
      matches = pattern.test(this.actual);
    } else {
      matches = String(this.actual).indexOf(pattern) !== -1;
    }

    this._assert(
      matches,
      'Expected "' + this.actual + '"' +
      (this.negated ? ' not' : '') + ' to match ' + pattern
    );
  };

  /**
   * Check typeof
   * @param {string} type - Expected type
   */
  Expectation.prototype.toBeTypeOf = function(type) {
    this._assert(
      typeof this.actual === type,
      'Expected typeof ' + formatValue(this.actual) + ' (' + typeof this.actual + ')' +
      (this.negated ? ' not' : '') + ' to be "' + type + '"'
    );
  };

  // ----------------------------------------
  // Deep Equality Helpers
  // ----------------------------------------

  /**
   * Deep equality comparison
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {boolean}
   */
  function deepEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;

    // Arrays
    if (Array.isArray(a)) {
      if (!Array.isArray(b) || a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    // Dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    // RegExp
    if (a instanceof RegExp && b instanceof RegExp) {
      return a.toString() === b.toString();
    }

    // Maps
    if (a instanceof Map && b instanceof Map) {
      if (a.size !== b.size) return false;
      for (var entry of a) {
        if (!b.has(entry[0]) || !deepEqual(entry[1], b.get(entry[0]))) {
          return false;
        }
      }
      return true;
    }

    // Sets
    if (a instanceof Set && b instanceof Set) {
      if (a.size !== b.size) return false;
      for (var item of a) {
        if (!b.has(item)) return false;
      }
      return true;
    }

    // Objects
    if (typeof a === 'object') {
      var keysA = Object.keys(a);
      var keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;

      for (var j = 0; j < keysA.length; j++) {
        var key = keysA[j];
        if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
        if (!deepEqual(a[key], b[key])) return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Strict deep equality (checks constructor)
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {boolean}
   */
  function strictDeepEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;

    // Check constructor
    if (a.constructor !== b.constructor) return false;

    return deepEqual(a, b);
  }

  // ============================================
  // Export
  // ============================================

  window.expect = expect;

})(window);
