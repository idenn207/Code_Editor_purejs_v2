# 디자인 패턴 가이드

## 1. Command Pattern (Undo/Redo)

```javascript
// command/Command.js
export class Command {
  constructor(document) {
    this._document = document;
    this._executed = false;
  }

  execute() {
    throw new Error('Must implement execute()');
  }

  undo() {
    throw new Error('Must implement undo()');
  }

  redo() {
    this.execute();
  }

  // 연속 명령 병합 가능 여부
  canMergeWith(other) {
    return false;
  }

  mergeWith(other) {
    return false;
  }
}

// command/commands/InsertTextCommand.js
export class InsertTextCommand extends Command {
  constructor(document, position, text) {
    super(document);
    this._position = position;
    this._text = text;
    this._deletedText = null;
  }

  execute() {
    this._deletedText = this._document.getText(this._range);
    this._document.insertAt(this._position, this._text);
    this._executed = true;
    return this;
  }

  undo() {
    this._document.deleteAt(this._position, this._text.length);
    if (this._deletedText) {
      this._document.insertAt(this._position, this._deletedText);
    }
  }

  canMergeWith(other) {
    // 연속 타이핑은 병합
    return (
      other instanceof InsertTextCommand &&
      this._position.line === other._position.line &&
      this._position.column + this._text.length === other._position.column &&
      !this._text.includes('\n')
    );
  }

  mergeWith(other) {
    this._text += other._text;
    return true;
  }
}
```

## 2. Observer Pattern (EventBus)

```javascript
// core/EventBus.js
export class EventBus {
  static _instance = null;

  static getInstance() {
    if (!EventBus._instance) {
      EventBus._instance = new EventBus();
    }
    return EventBus._instance;
  }

  constructor() {
    this._listeners = new Map();
    this._onceListeners = new Map();
  }

  on(event, callback, context = null) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push({ callback, context });

    // 구독 해제 함수 반환
    return () => this.off(event, callback);
  }

  once(event, callback, context = null) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      callback.apply(context, args);
    };
    return this.on(event, wrapper, context);
  }

  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      const index = listeners.findIndex((l) => l.callback === callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, ...args) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach(({ callback, context }) => {
        try {
          callback.apply(context, args);
        } catch (error) {
          console.error(`EventBus error in ${event}:`, error);
        }
      });
    }
  }

  // 이벤트 목록
  static Events = Object.freeze({
    // Document
    DOCUMENT_CHANGE: 'document:change',
    DOCUMENT_SAVED: 'document:saved',

    // Cursor
    CURSOR_MOVE: 'cursor:move',
    CURSOR_BLINK: 'cursor:blink',

    // Selection
    SELECTION_CHANGE: 'selection:change',

    // View
    VIEW_SCROLL: 'view:scroll',
    VIEW_RESIZE: 'view:resize',
    VIEWPORT_CHANGE: 'view:viewport',

    // Editor
    EDITOR_FOCUS: 'editor:focus',
    EDITOR_BLUR: 'editor:blur',

    // Token
    TOKENS_UPDATE: 'tokens:update',
  });
}
```

## 3. Flyweight Pattern (Token 재사용)

```javascript
// tokenizer/TokenPool.js
export class TokenPool {
  constructor() {
    this._pool = new Map();
  }

  getToken(type, value) {
    const key = `${type}:${value}`;

    if (!this._pool.has(key)) {
      this._pool.set(
        key,
        Object.freeze({
          type,
          value,
          length: value.length,
        })
      );
    }

    return this._pool.get(key);
  }

  // 주기적 정리
  cleanup(usedKeys) {
    for (const key of this._pool.keys()) {
      if (!usedKeys.has(key)) {
        this._pool.delete(key);
      }
    }
  }
}
```

## 4. Strategy Pattern (Tokenizer 전략)

```javascript
// tokenizer/TokenizerStrategy.js
export class TokenizerStrategy {
  constructor(grammar) {
    this._grammar = grammar;
  }

  tokenize(line) {
    throw new Error('Must implement tokenize()');
  }

  getInitialState() {
    return null;
  }
}

// tokenizer/strategies/JavaScriptTokenizer.js
export class JavaScriptTokenizer extends TokenizerStrategy {
  tokenize(line, state = null) {
    const tokens = [];
    // JavaScript 토큰화 로직
    return { tokens, endState: state };
  }
}

// tokenizer/Tokenizer.js
export class Tokenizer {
  constructor() {
    this._strategies = new Map();
  }

  registerLanguage(languageId, strategy) {
    this._strategies.set(languageId, strategy);
  }

  tokenize(languageId, line, state) {
    const strategy = this._strategies.get(languageId);
    if (!strategy) {
      return this._defaultTokenize(line);
    }
    return strategy.tokenize(line, state);
  }
}
```
