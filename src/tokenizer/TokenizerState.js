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
