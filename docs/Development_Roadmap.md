# 코드 에디터 개발 문서

## 1. 개발 로드맵 (Development Roadmap)

### Phase 1: 기반 구조 (Foundation) - 2주

| 순서 | 작업 항목          | 상태 | 설명                 |
| ---- | ------------------ | ---- | -------------------- |
| 1.1  | 프로젝트 구조 설정 | ⬜   | 폴더 구조, 빌드 환경 |
| 1.2  | EventBus 시스템    | ⬜   | 전역 이벤트 관리     |
| 1.3  | Document Model     | ⬜   | Piece Table 구현     |
| 1.4  | 기본 렌더러        | ⬜   | DOM 기반 텍스트 출력 |
| 1.5  | 키보드 입력 처리   | ⬜   | 기본 타이핑, 방향키  |

### Phase 2: 핵심 편집 기능 (Core Editing) - 3주

| 순서 | 작업 항목         | 상태 | 설명                   |
| ---- | ----------------- | ---- | ---------------------- |
| 2.1  | Cursor Manager    | ⬜   | 단일 커서 위치/이동    |
| 2.2  | Selection Manager | ⬜   | 텍스트 선택 영역       |
| 2.3  | Command System    | ⬜   | 명령 패턴 구현         |
| 2.4  | Undo/Redo Stack   | ⬜   | 작업 이력 관리         |
| 2.5  | Clipboard 연동    | ⬜   | 복사/붙여넣기/잘라내기 |
| 2.6  | Line Manager      | ⬜   | 줄 삽입/삭제/병합      |

### Phase 3: 뷰 레이어 (View Layer) - 3주

| 순서 | 작업 항목              | 상태 | 설명                 |
| ---- | ---------------------- | ---- | -------------------- |
| 3.1  | Virtual Scrolling      | ⬜   | 가상 스크롤 구현     |
| 3.2  | Line Number Gutter     | ⬜   | 줄 번호 표시         |
| 3.3  | Cursor Renderer        | ⬜   | 커서 깜빡임, 위치    |
| 3.4  | Selection Renderer     | ⬜   | 선택 영역 하이라이트 |
| 3.5  | Scroll Synchronization | ⬜   | 수직/수평 스크롤바   |
| 3.6  | Minimap                | ⬜   | 코드 미니맵 (선택)   |

### Phase 4: 구문 강조 (Syntax Highlighting) - 2주

| 순서 | 작업 항목                | 상태 | 설명              |
| ---- | ------------------------ | ---- | ----------------- |
| 4.1  | Tokenizer 기본 구조      | ⬜   | 토큰화 엔진       |
| 4.2  | JavaScript 문법          | ⬜   | JS 토큰 규칙      |
| 4.3  | Theme System             | ⬜   | 색상 테마 관리    |
| 4.4  | Incremental Tokenization | ⬜   | 변경분만 재토큰화 |

### Phase 5: 고급 기능 (Advanced Features) - 4주

| 순서 | 작업 항목        | 상태 | 설명              |
| ---- | ---------------- | ---- | ----------------- |
| 5.1  | Multi-Cursor     | ⬜   | 다중 커서 지원    |
| 5.2  | Find & Replace   | ⬜   | 검색/치환 기능    |
| 5.3  | Code Folding     | ⬜   | 코드 접기         |
| 5.4  | Auto Indent      | ⬜   | 자동 들여쓰기     |
| 5.5  | Bracket Matching | ⬜   | 괄호 매칭         |
| 5.6  | Auto Complete    | ⬜   | 자동완성 제안     |
| 5.7  | IME Support      | ⬜   | 한글 등 조합 입력 |

### Phase 6: 확장 및 최적화 (Extensions & Optimization) - 2주

| 순서 | 작업 항목               | 상태 | 설명             |
| ---- | ----------------------- | ---- | ---------------- |
| 6.1  | Plugin System           | ⬜   | 확장 아키텍처    |
| 6.2  | Large File Optimization | ⬜   | 대용량 파일 처리 |
| 6.3  | Worker Thread           | ⬜   | 백그라운드 작업  |
| 6.4  | Performance Profiling   | ⬜   | 성능 측정/개선   |

---

## 2. 프로젝트 구조

```
/pure-code-editor
├── /src
│   ├── /core
│   │   ├── Editor.js              # 에디터 진입점
│   │   ├── EventBus.js            # 이벤트 시스템
│   │   └── Config.js              # 설정 관리
│   │
│   ├── /model
│   │   ├── Document.js            # 문서 모델
│   │   ├── PieceTable.js          # 텍스트 저장 구조
│   │   ├── Position.js            # 위치 (line, column)
│   │   ├── Range.js               # 범위 (start, end)
│   │   └── TextChange.js          # 변경 이벤트
│   │
│   ├── /cursor
│   │   ├── CursorManager.js       # 커서 관리
│   │   ├── Cursor.js              # 단일 커서
│   │   └── SelectionManager.js    # 선택 영역
│   │
│   ├── /command
│   │   ├── CommandManager.js      # 명령 관리자
│   │   ├── Command.js             # 명령 베이스
│   │   ├── UndoStack.js           # Undo/Redo
│   │   ├── /commands
│   │   │   ├── InsertTextCommand.js
│   │   │   ├── DeleteTextCommand.js
│   │   │   ├── IndentCommand.js
│   │   │   └── ...
│   │   └── KeybindingManager.js   # 단축키 매핑
│   │
│   ├── /view
│   │   ├── EditorView.js          # 메인 뷰
│   │   ├── ViewportManager.js     # 가상 스크롤
│   │   ├── LineRenderer.js        # 줄 렌더링
│   │   ├── GutterView.js          # 줄 번호
│   │   ├── CursorView.js          # 커서 렌더링
│   │   ├── SelectionView.js       # 선택 영역
│   │   ├── ScrollbarView.js       # 스크롤바
│   │   └── MinimapView.js         # 미니맵
│   │
│   ├── /tokenizer
│   │   ├── Tokenizer.js           # 토큰화 엔진
│   │   ├── TokenCache.js          # 토큰 캐시
│   │   ├── /grammars
│   │   │   ├── javascript.js
│   │   │   ├── html.js
│   │   │   └── css.js
│   │   └── /themes
│   │       ├── dark.js
│   │       └── light.js
│   │
│   ├── /input
│   │   ├── InputHandler.js        # 입력 총괄
│   │   ├── KeyboardHandler.js     # 키보드
│   │   ├── MouseHandler.js        # 마우스
│   │   ├── IMEHandler.js          # IME 처리
│   │   └── ClipboardHandler.js    # 클립보드
│   │
│   ├── /features
│   │   ├── FindReplace.js         # 검색/치환
│   │   ├── CodeFolding.js         # 코드 접기
│   │   ├── BracketMatcher.js      # 괄호 매칭
│   │   ├── AutoComplete.js        # 자동완성
│   │   └── AutoIndent.js          # 자동 들여쓰기
│   │
│   ├── /utils
│   │   ├── DOMUtils.js            # DOM 헬퍼
│   │   ├── TextUtils.js           # 텍스트 유틸
│   │   ├── MathUtils.js           # 수학 유틸
│   │   └── PerformanceUtils.js    # 성능 측정
│   │
│   └── index.js                   # 메인 export
│
├── /styles
│   ├── editor.css
│   ├── themes/
│   └── variables.css
│
├── /tests
│   ├── /unit
│   └── /integration
│
└── /docs
    ├── ARCHITECTURE.md
    └── API.md
```

---

## 3. 코드 컨벤션 (Code Convention)

### 3.1 네이밍 규칙

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

### 3.2 파일 구조 템플릿

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

### 3.3 JSDoc 주석 규칙

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

---

## 4. 디자인 패턴 가이드

### 4.1 Command Pattern (Undo/Redo)

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

### 4.2 Observer Pattern (EventBus)

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

### 4.3 Flyweight Pattern (Token 재사용)

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

### 4.4 Strategy Pattern (Tokenizer 전략)

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

---

## 5. 이벤트 흐름 다이어그램

```
┌──────────────────────────────────────────────────────────────┐
│                        User Input                             │
│                    (Keyboard/Mouse)                           │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                     InputHandler                              │
│              (KeyboardHandler, MouseHandler)                  │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                   KeybindingManager                           │
│              (Shortcut → Command 매핑)                        │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    CommandManager                             │
│                 (Command 생성 및 실행)                         │
└──────────────────────────┬───────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
┌─────────────────────┐    ┌─────────────────────┐
│    UndoStack        │    │    Document         │
│  (이력 저장)         │    │  (텍스트 수정)       │
└─────────────────────┘    └──────────┬──────────┘
                                      │
                           emit(DOCUMENT_CHANGE)
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│   CursorManager     │ │     Tokenizer       │ │    EditorView       │
│  (커서 위치 갱신)    │ │  (재토큰화)         │ │   (렌더링 요청)      │
└──────────┬──────────┘ └──────────┬──────────┘ └──────────┬──────────┘
           │                       │                       │
           ▼                       ▼                       ▼
     CURSOR_MOVE            TOKENS_UPDATE           requestAnimationFrame
           │                       │                       │
           └───────────────────────┴───────────────────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │   Render Pipeline   │
                        │  (실제 DOM 업데이트) │
                        └─────────────────────┘
```

---

## 6. API 인터페이스 정의

### 6.1 Editor (메인 API)

```javascript
const editor = new Editor(containerElement, {
    // 기본 옵션
    value: '',                    // 초기 텍스트
    language: 'javascript',       // 언어 모드
    theme: 'dark',               // 테마

    // 편집 옵션
    readOnly: false,             // 읽기 전용
    tabSize: 4,                  // 탭 크기
    insertSpaces: true,          // 탭을 스페이스로
    wordWrap: 'off',             // 줄 바꿈 (off|on|wordWrapColumn)
    wordWrapColumn: 80,          // 줄 바꿈 컬럼

    // 표시 옵션
    lineNumbers: true,           // 줄 번호
    minimap: true,               // 미니맵
    folding: true,               // 코드 접기
    renderWhitespace: 'none',    // 공백 표시

    // 기능 옵션
    autoCloseBrackets: true,     // 괄호 자동 닫기
    autoIndent: true,            // 자동 들여쓰기
    matchBrackets: true,         // 괄호 매칭

    // 콜백
    onChange: (change) => {},
    onCursorChange: (cursor) => {},
    onSelectionChange: (selection) => {}
});

// 주요 메서드
editor.getValue()                           // 전체 텍스트
editor.setValue(text)                       // 텍스트 설정
editor.getSelection()                       // 선택 영역
editor.setSelection(range)                  // 선택 설정
editor.getCursorPosition()                  // 커서 위치
editor.setCursorPosition(position)          // 커서 이동
editor.insertText(text, position?)          // 텍스트 삽입
editor.deleteText(range)                    // 텍스트 삭제
editor.undo()                               // 실행 취소
editor.redo()                               // 다시 실행
editor.find(query, options)                 // 검색
editor.replace(query, replacement, options) // 치환
editor.focus()                              // 포커스
editor.dispose()                            // 정리
```

---

## 7. 성능 가이드라인

### 7.1 렌더링 최적화

```javascript
// ❌ 나쁜 예: 매번 전체 렌더링
function render() {
  container.innerHTML = '';
  lines.forEach((line) => {
    container.appendChild(createLineElement(line));
  });
}

// ✅ 좋은 예: 가상 스크롤 + 차분 업데이트
class ViewportManager {
  render(scrollTop) {
    const startLine = Math.floor(scrollTop / this._lineHeight);
    const endLine = Math.min(startLine + this._visibleLineCount + this._overscan, this._totalLines);

    // 변경된 라인만 업데이트
    for (let i = startLine; i < endLine; i++) {
      const lineElement = this._lineElements.get(i);
      if (this._dirtyLines.has(i) || !lineElement) {
        this._renderLine(i);
      }
    }

    // 범위 밖 요소 풀링
    this._recycleLinesOutsideRange(startLine, endLine);
  }
}
```

### 7.2 이벤트 스로틀링

```javascript
// 스크롤/리사이즈는 반드시 스로틀링
class EditorView {
  constructor() {
    this._handleScroll = throttle(this._onScroll.bind(this), 16);
    this._handleResize = debounce(this._onResize.bind(this), 100);
  }
}
```

### 7.3 메모리 관리

```javascript
// dispose 패턴 필수 구현
class Component {
  constructor() {
    this._disposables = [];
  }

  _registerDisposable(disposable) {
    this._disposables.push(disposable);
  }

  dispose() {
    this._disposables.forEach((d) => {
      if (typeof d === 'function') d();
      else if (d.dispose) d.dispose();
    });
    this._disposables = [];
  }
}
```

---

## 8. 테스트 가이드

### 8.1 테스트 구조

```javascript
// tests/unit/model/Document.test.js
describe('Document', () => {
  describe('insertText', () => {
    it('should insert text at the beginning', () => {
      const doc = new Document('Hello');
      doc.insertText(new Position(0, 0), 'Say ');
      expect(doc.getText()).toBe('Say Hello');
    });

    it('should emit DOCUMENT_CHANGE event', () => {
      const doc = new Document('Hello');
      const spy = jest.fn();
      doc.on(Events.DOCUMENT_CHANGE, spy);

      doc.insertText(new Position(0, 0), 'Hi');

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          range: expect.any(Range),
          text: 'Hi',
        })
      );
    });
  });
});
```

### 8.2 필수 테스트 케이스

| 영역      | 테스트 항목                          |
| --------- | ------------------------------------ |
| Document  | 삽입, 삭제, 범위 연산, 대용량 텍스트 |
| Cursor    | 이동, 경계 처리, 멀티 커서           |
| Selection | 생성, 확장, 축소, 다중 선택          |
| Undo/Redo | 단일 작업, 병합, 경계                |
| Tokenizer | 각 언어별, 점진적 파싱               |
| View      | 스크롤, 리사이즈, 라인 재사용        |

---
