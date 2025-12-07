/**
 * @fileoverview Monarch-style tokenizer with state machine
 * @module tokenizer/Tokenizer
 */

import { JavaScriptGrammar, TokenType, identifyFunctionCalls } from './grammars/javascript.js';
import { TokenizerState } from './TokenizerState.js';

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
          const includeName = rule.include.startsWith('@') ? rule.include.slice(1) : rule.include;
          this._compiledRules[stateName].push({
            type: 'include',
            state: includeName,
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
    // Get source string from pattern (RegExp or string)
    let source = pattern instanceof RegExp ? pattern.source : pattern;
    const flags = pattern instanceof RegExp ? pattern.flags : '';

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
  tokenizeLine(line, state = TokenizerState.initial(), lineIndex = 0) {
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

    // Handle multiple transitions (e.g., "@pop @pop")
    if (typeof nextState === 'string' && nextState.includes(' ')) {
      const transitions = nextState.split(/\s+/);
      for (const t of transitions) {
        this._applyTransition(newState, t);
      }
      return newState;
    }

    return this._applyTransition(newState, nextState);
  }

  _applyTransition(state, nextState) {
    if (nextState === '@pop') {
      const prevState = state.stack.pop() || 'root';
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
    const result = this.tokenizeLine(line, startState, lineIndex);

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
}

// ============================================
// Exports
// ============================================

export { TokenType, TokenizerState };

