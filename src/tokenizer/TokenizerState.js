/**
 * @fileoverview Tokenizer state for incremental tokenization
 */

(function(CodeEditor) {
  'use strict';

  // ============================================
  // Class Definition
  // ============================================

  /**
   * Represents tokenizer state for incremental tokenization
   */
  class TokenizerState {
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
  // Export to Namespace
  // ============================================

  CodeEditor.TokenizerState = TokenizerState;

})(window.CodeEditor = window.CodeEditor || {});
