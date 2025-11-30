/**
 * @fileoverview Monarch-style tokenizer with state machine
 * @module tokenizer/Tokenizer
 */

import { JavaScriptGrammar, TokenType, identifyFunctionCalls } from './grammars/javascript.js';

// ============================================
// Tokenizer State
// ============================================

/**
 * Represents tokenizer state for incremental tokenization
 */
export class TokenizerState {
  constructor(name = 'root', stack = []) {
    this.name = name;
    this.stack = stack;
  }

  clone() {
    return new TokenizerState(this.name, [...this.stack]);
  }

  equals(other) {
    if (!other) return false;
    if (this.name !== other.name) return false;
    if (this.stack.length !== other.stack.length) return false;
    return this.stack.every((s, i) => s === other.stack[i]);
  }

  static initial() {
    return new TokenizerState('root', []);
  }
}

// ============================================
// Tokenizer Class
// ============================================

/**
 * Monarch-style tokenizer with state machine for syntax highlighting.
 * Supports multi-line constructs via state preservation.
 */
export class Tokenizer {
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
        return JavaScriptGrammar;
      default:
        console.warn(`[Tokenizer] Unknown language: ${language}, using JavaScript`);
        return JavaScriptGrammar;
    }
  }

  // ----------------------------------------
  // Rule Compilation
  // ----------------------------------------

  _compileRules() {
    const tokenizer = this._grammar.tokenizer;

    for (const [stateName, rules] of Object.entries(tokenizer)) {
      this._compiledRules[stateName] = [];

      for (const rule of rules) {
        // Handle include directive
        if (rule.include) {
          this._compiledRules[stateName].push({
            type: 'include',
            state: rule.include.slice(1), // Remove @
          });
          continue;
        }

        // Handle array rule [pattern, action, nextState?]
        if (Array.isArray(rule)) {
          const [pattern, action, nextState] = rule;
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
    if (pattern instanceof RegExp) {
      // Ensure pattern matches from start
      const source = pattern.source.startsWith('^') ? pattern.source : `^(?:${pattern.source})`;
      return new RegExp(source, pattern.flags);
    }

    // String pattern - replace grammar references
    let source = pattern;

    // Replace @reference with grammar values
    source = source.replace(/@(\w+)/g, (match, name) => {
      const ref = this._grammar[name];

      if (Array.isArray(ref)) {
        // Keyword list - escape and join
        const escaped = ref.map((k) => this._escapeRegex(k));
        return `(?:${escaped.join('|')})`;
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
      source = `^(?:${source})`;
    }

    return new RegExp(source);
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
   * @returns {{ tokens: Array, endState: TokenizerState }}
   */
  tokenizeLine(line, state = TokenizerState.initial()) {
    const tokens = [];
    let pos = 0;
    let currentState = state.clone();

    while (pos < line.length) {
      const matchResult = this._matchRule(line, pos, currentState.name);

      if (matchResult) {
        const { value, token, nextState } = matchResult;

        // Add token (skip whitespace in output if desired)
        if (token) {
          tokens.push({
            type: token,
            value: value,
            start: pos,
            end: pos + value.length,
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
        });
        pos++;
      }
    }

    // Post-process to identify function calls
    const processedTokens = identifyFunctionCalls(tokens);

    return {
      tokens: processedTokens,
      endState: currentState,
    };
  }

  _matchRule(line, pos, stateName) {
    const rules = this._compiledRules[stateName];
    if (!rules) return null;

    const remaining = line.slice(pos);

    for (const rule of rules) {
      // Handle include
      if (rule.type === 'include') {
        const result = this._matchRule(line, pos, rule.state);
        if (result) return result;
        continue;
      }

      const match = rule.regex.exec(remaining);
      if (match) {
        const value = match[0];
        const token = this._resolveToken(rule.action, value);

        return {
          value,
          token,
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
      for (const [caseKey, tokenType] of Object.entries(action.cases)) {
        if (caseKey === '@default') continue;

        const refName = caseKey.slice(1); // Remove @
        const refList = this._grammar[refName];

        if (Array.isArray(refList) && refList.includes(value)) {
          return tokenType;
        }
      }
      return action.cases['@default'] || TokenType.IDENTIFIER;
    }

    return TokenType.PLAIN;
  }

  _transition(state, nextState) {
    const newState = state.clone();

    if (nextState === '@pop') {
      const prevState = newState.stack.pop() || 'root';
      newState.name = prevState;
    } else if (nextState === '@push') {
      newState.stack.push(newState.name);
    } else if (nextState.startsWith('@')) {
      // Named state transition
      newState.stack.push(newState.name);
      newState.name = nextState.slice(1);
    } else {
      newState.stack.push(newState.name);
      newState.name = nextState;
    }

    return newState;
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
    const cacheKey = lineIndex;
    const cached = this._cache.get(cacheKey);

    // Check cache validity
    if (cached && cached.line === line && cached.startState.equals(startState)) {
      return {
        tokens: cached.tokens,
        endState: cached.endState,
      };
    }

    // Tokenize and cache
    const result = this.tokenizeLine(line, startState);

    this._cache.set(cacheKey, {
      line,
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
    for (const key of this._cache.keys()) {
      if (key >= fromLine) {
        this._cache.delete(key);
      }
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
    const lines = text.split('\n');
    const result = [];
    let state = TokenizerState.initial();

    for (let i = 0; i < lines.length; i++) {
      const lineResult = this.getLineTokens(i, lines[i], state);
      result.push(lineResult.tokens);
      state = lineResult.endState;
    }

    return result;
  }

  /**
   * Tokenize with incremental update
   * @param {Array<string>} lines - Document lines
   * @param {number} startLine - First changed line
   * @returns {Array<Array>} - Updated tokens
   */
  tokenizeIncremental(lines, startLine = 0) {
    // Invalidate from changed line
    this.invalidateFrom(startLine);

    // Get state from previous line
    let state;
    if (startLine > 0) {
      const prevCached = this._cache.get(startLine - 1);
      state = prevCached ? prevCached.endState.clone() : TokenizerState.initial();
    } else {
      state = TokenizerState.initial();
    }

    const result = [];

    for (let i = 0; i < lines.length; i++) {
      if (i < startLine) {
        // Use cached result for unchanged lines
        const cached = this._cache.get(i);
        if (cached) {
          result.push(cached.tokens);
          state = cached.endState.clone();
          continue;
        }
      }

      const lineResult = this.getLineTokens(i, lines[i], state);
      result.push(lineResult.tokens);

      // Check if state stabilized (matches next cached state)
      const nextCached = this._cache.get(i + 1);
      if (nextCached && lineResult.endState.equals(nextCached.startState)) {
        // State stabilized - remaining cached lines are still valid
        for (let j = i + 1; j < lines.length; j++) {
          const c = this._cache.get(j);
          if (c) {
            result.push(c.tokens);
          } else {
            break;
          }
        }
        break;
      }

      state = lineResult.endState;
    }

    return result;
  }
}

// ============================================
// Exports
// ============================================

export { TokenType, TokenizerState };
