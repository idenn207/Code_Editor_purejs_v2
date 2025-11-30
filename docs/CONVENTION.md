# 코드 컨벤션 (Code Convention)

## 1. 네이밍 규칙

```javascript
// 클래스: PascalCase
class DocumentModel {}
class CursorManager {}

// 메서드/함수: camelCase (동사로 시작)
function calculatePosition() {}
getText() {}
setSelection() {}

// 상수: UPPER_SNAKE_CASE
const MAX_LINE_LENGTH = 10000;
const DEFAULT_TAB_SIZE = 4;

// private 멤버: _ 접두사
class Editor {
    _document = null;
    _cursor = null;

    _handleKeyDown(e) {}
}

// 이벤트 핸들러: handle 접두사
handleClick() {}
handleKeyDown() {}
handleScroll() {}

// boolean 변수: is/has/can/should 접두사
isVisible = true;
hasSelection = false;
canUndo = true;

// 콜백 파라미터: on 접두사
constructor({ onTextChange, onCursorMove }) {}
```

## 2. 파일 구조 템플릿

```javascript
/**
 * @fileoverview 파일 설명
 * @module 모듈명
 */

// ============================================
// Imports
// ============================================
import { EventBus } from '../core/EventBus.js';
import { Position } from './Position.js';

// ============================================
// Constants
// ============================================
const DEFAULT_OPTIONS = {
  tabSize: 4,
  insertSpaces: true,
};

// ============================================
// Class Definition
// ============================================
/**
 * 클래스 설명
 */
export class ClassName {
  // ----------------------------------------
  // Static Properties
  // ----------------------------------------
  static instanceCount = 0;

  // ----------------------------------------
  // Instance Properties
  // ----------------------------------------
  _privateField = null;
  publicField = null;

  // ----------------------------------------
  // Constructor
  // ----------------------------------------
  constructor(options = {}) {
    this._options = { ...DEFAULT_OPTIONS, ...options };
    this._init();
  }

  // ----------------------------------------
  // Public Methods
  // ----------------------------------------
  publicMethod() {}

  // ----------------------------------------
  // Private Methods
  // ----------------------------------------
  _privateMethod() {}

  // ----------------------------------------
  // Event Handlers
  // ----------------------------------------
  _handleEvent() {}

  // ----------------------------------------
  // Getters / Setters
  // ----------------------------------------
  get value() {}
  set value(v) {}

  // ----------------------------------------
  // Lifecycle
  // ----------------------------------------
  dispose() {}
}
```

## 3. JSDoc 주석 규칙

```javascript
/**
 * 문서의 특정 범위에 텍스트를 삽입합니다.
 *
 * @param {Range} range - 삽입할 위치 범위
 * @param {string} text - 삽입할 텍스트
 * @param {Object} [options] - 추가 옵션
 * @param {boolean} [options.undoable=true] - Undo 가능 여부
 * @returns {TextChange} 변경 정보 객체
 * @throws {RangeError} 유효하지 않은 범위일 경우
 *
 * @example
 * const change = document.insertText(
 *     new Range(0, 0, 0, 0),
 *     'Hello World'
 * );
 */
insertText(range, text, options = {}) {}
```
