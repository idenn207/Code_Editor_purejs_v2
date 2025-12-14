/**
 * @fileoverview Monarch-style tokenizer with state machine
 */

(function(CodeEditor) {
  'use strict';

  // Dependencies from namespace
  var Grammars = CodeEditor.Grammars;
  var TokenizerState = CodeEditor.TokenizerState;
  var TokenType = Grammars.JavaScriptTokenType;
  var identifyFunctionCalls = Grammars.identifyFunctionCalls;

  // ============================================
  // Tokenizer Class
  // ============================================

  /**
   * Monarch-style tokenizer with state machine for syntax highlighting.
   * Supports multi-line constructs via state preservation.
   */
  class Tokenizer {
    // ----------------------------------------
    // Instance Properties
    // ----------------------------------------
    _grammar = null;
    _compiledRules = {};
    _cache = new Map();
    _language = 'javascript';

    // ----------------------------------------
    // Constructor
    // ----------------------------------------

    constructor(language = 'javascript') {
      this._language = language;
      this._grammar = this._loadGrammar(language);
      this._compileRules();
    }

    // ----------------------------------------
    // Grammar Loading
    // ----------------------------------------

    _loadGrammar(language) {
      switch (language) {
        case 'javascript':
        case 'js':
          return Grammars.JavaScript;
        case 'html':
        case 'htm':
          return Grammars.HTML;
        case 'css':
          return Grammars.CSS;
        default:
          console.warn('[Tokenizer] Unknown language: ' + language + ', using JavaScript');
          return Grammars.JavaScript;
      }
    }

    // ----------------------------------------
    // Rule Compilation
    // ----------------------------------------

    _compileRules() {
      var tokenizer = this._grammar.tokenizer;

      for (var stateName in tokenizer) {
        if (!tokenizer.hasOwnProperty(stateName)) continue;

        var rules = tokenizer[stateName];
        this._compiledRules[stateName] = [];

        for (var i = 0; i < rules.length; i++) {
          var rule = rules[i];

          // Handle include directive
          if (rule.include) {
            var includeName = rule.include.startsWith('@') ? rule.include.slice(1) : rule.include;
            this._compiledRules[stateName].push({
              type: 'include',
              state: includeName,
            });
            continue;
          }

          // Handle array rule [pattern, action, nextState?]
          if (Array.isArray(rule)) {
            var pattern = rule[0];
            var action = rule[1];
            var nextState = rule[2];
            this._compiledRules[stateName].push({
              regex: this._compilePattern(pattern),
              action: typeof action === 'string' ? { token: action } : action,
              nextState: nextState,
            });
          }
        }
      }
    }

    _compilePattern(pattern) {
      var self = this;
      // Get source string from pattern (RegExp or string)
      var source = pattern instanceof RegExp ? pattern.source : pattern;
      var flags = pattern instanceof RegExp ? pattern.flags : '';

      // Replace @reference with grammar values
      source = source.replace(/@(\w+)/g, function(match, name) {
        var ref = self._grammar[name];

        if (Array.isArray(ref)) {
          // Keyword list - escape and join
          var escaped = ref.map(function(k) { return self._escapeRegex(k); });
          return '(?:' + escaped.join('|') + ')';
        }

        if (ref instanceof RegExp) {
          return ref.source;
        }

        if (typeof ref === 'string') {
          return ref;
        }

        return match;
      });

      // Ensure pattern matches from start
      if (!source.startsWith('^')) {
        source = '^(?:' + source + ')';
      }

      return new RegExp(source, flags);
    }

    _escapeRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // ----------------------------------------
    // Tokenization
    // ----------------------------------------

    /**
     * Tokenize a single line with state
     * @param {string} line - Line content
     * @param {TokenizerState} state - Current tokenizer state
     * @param {number} lineIndex - Line number (0-based)
     * @returns {{ tokens: Array, endState: TokenizerState }}
     */
    tokenizeLine(line, state, lineIndex) {
      if (!state) state = TokenizerState.initial();
      if (lineIndex === undefined) lineIndex = 0;

      var tokens = [];
      var pos = 0;
      var currentState = state.clone();

      while (pos < line.length) {
        var matchResult = this._matchRule(line, pos, currentState.name);

        if (matchResult) {
          var value = matchResult.value;
          var token = matchResult.token;
          var nextState = matchResult.nextState;

          // Add token (skip whitespace in output if desired)
          if (token) {
            tokens.push({
              type: token,
              value: value,
              start: pos,
              end: pos + value.length,
              line: lineIndex,
            });
          }

          // Handle state transition
          if (nextState) {
            currentState = this._transition(currentState, nextState);
          }

          pos += value.length;
        } else {
          // No rule matched - emit as plain token
          tokens.push({
            type: TokenType.PLAIN,
            value: line[pos],
            start: pos,
            end: pos + 1,
            line: lineIndex,
          });
          pos++;
        }
      }

      // Post-process to identify function calls
      var processedTokens = identifyFunctionCalls(tokens);

      return {
        tokens: processedTokens,
        endState: currentState,
      };
    }

    _matchRule(line, pos, stateName) {
      var rules = this._compiledRules[stateName];
      if (!rules) return null;

      var remaining = line.slice(pos);

      for (var i = 0; i < rules.length; i++) {
        var rule = rules[i];

        // Handle include
        if (rule.type === 'include') {
          var result = this._matchRule(line, pos, rule.state);
          if (result) return result;
          continue;
        }

        var match = rule.regex.exec(remaining);
        if (match) {
          var value = match[0];
          var token = this._resolveToken(rule.action, value);

          return {
            value: value,
            token: token,
            nextState: rule.nextState,
          };
        }
      }

      return null;
    }

    _resolveToken(action, value) {
      if (typeof action === 'string') {
        return action;
      }

      if (action.token) {
        return action.token;
      }

      if (action.cases) {
        for (var caseKey in action.cases) {
          if (!action.cases.hasOwnProperty(caseKey)) continue;
          if (caseKey === '@default') continue;

          var tokenType = action.cases[caseKey];
          var refName = caseKey.slice(1); // Remove @
          var refList = this._grammar[refName];

          if (Array.isArray(refList) && refList.includes(value)) {
            return tokenType;
          }
        }
        return action.cases['@default'] || TokenType.IDENTIFIER;
      }

      return TokenType.PLAIN;
    }

    _transition(state, nextState) {
      var newState = state.clone();

      // Handle multiple transitions (e.g., "@pop @pop")
      if (typeof nextState === 'string' && nextState.includes(' ')) {
        var transitions = nextState.split(/\s+/);
        for (var i = 0; i < transitions.length; i++) {
          this._applyTransition(newState, transitions[i]);
        }
        return newState;
      }

      return this._applyTransition(newState, nextState);
    }

    _applyTransition(state, nextState) {
      if (nextState === '@pop') {
        var prevState = state.stack.pop() || 'root';
        state.name = prevState;
      } else if (nextState === '@push') {
        state.stack.push(state.name);
      } else if (nextState.startsWith('@')) {
        // Named state transition
        state.stack.push(state.name);
        state.name = nextState.slice(1);
      } else if (nextState) {
        state.stack.push(state.name);
        state.name = nextState;
      }

      return state;
    }

    // ----------------------------------------
    // Incremental Tokenization
    // ----------------------------------------

    /**
     * Get cached tokens for a line, or tokenize if needed
     * @param {number} lineIndex - Line index
     * @param {string} line - Line content
     * @param {TokenizerState} startState - State at start of line
     * @returns {{ tokens: Array, endState: TokenizerState }}
     */
    getLineTokens(lineIndex, line, startState) {
      var cacheKey = lineIndex;
      var cached = this._cache.get(cacheKey);

      // Check cache validity
      if (cached && cached.line === line && cached.startState.equals(startState)) {
        return {
          tokens: cached.tokens,
          endState: cached.endState,
        };
      }

      // Tokenize and cache
      var result = this.tokenizeLine(line, startState, lineIndex);

      this._cache.set(cacheKey, {
        line: line,
        startState: startState.clone(),
        tokens: result.tokens,
        endState: result.endState,
      });

      return result;
    }

    /**
     * Invalidate cache from a specific line
     * @param {number} fromLine - Line index to invalidate from
     */
    invalidateFrom(fromLine) {
      var keysToDelete = [];
      this._cache.forEach(function(value, key) {
        if (key >= fromLine) {
          keysToDelete.push(key);
        }
      });
      for (var i = 0; i < keysToDelete.length; i++) {
        this._cache.delete(keysToDelete[i]);
      }
    }

    /**
     * Clear all cached tokens
     */
    clearCache() {
      this._cache.clear();
    }

    // ----------------------------------------
    // Full Document Tokenization
    // ----------------------------------------

    /**
     * Tokenize entire document
     * @param {string} text - Full document text
     * @returns {Array<Array>} - Array of token arrays per line
     */
    tokenize(text) {
      var lines = text.split('\n');
      var result = [];
      var state = TokenizerState.initial();

      for (var i = 0; i < lines.length; i++) {
        var lineResult = this.getLineTokens(i, lines[i], state);
        result.push(lineResult.tokens);
        state = lineResult.endState;
      }

      return result;
    }
  }

  // ============================================
  // Export to Namespace
  // ============================================

  CodeEditor.Tokenizer = Tokenizer;

})(window.CodeEditor = window.CodeEditor || {});
