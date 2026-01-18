# Code Editor 개발 계획서

> **문서 상태**: 고도화 필요 (자동완성 UI 구현 상세 계획 추가 예정)
>
> **최종 수정일**: 2026-01-17

---

## 프로젝트 개요

**프로젝트명**: Code Editor (Pure JS)

**목표**: 브라우저에서 동작하는 순수 JavaScript 코드 에디터 구현

**기술 스택**:
- Pure JavaScript (ES Modules)
- EditContext API (Chrome 121+)
- 빌드 도구 없음

---

## 구현 방침

- **JSDoc 미지원**: 순수 코드 분석만으로 타입 추론
- **최소 구현**: 목표 기능에 집중, 고급 기능(type narrowing, conditional types) 제외
- **브라우저 전용**: Node.js 빌드 도구 없이 ES 모듈로 직접 실행

---

## 완료된 기능

### 1. 핵심 에디터 기능
- 텍스트 편집 (EditContext API / Textarea fallback)
- 문법 강조 (JavaScript, HTML, CSS)
- 커서 및 선택 영역 처리
- Undo/Redo

### 2. 편의 기능
- 자동 괄호/따옴표 닫기 (`autoClose`)
- 스마트 들여쓰기 (`autoIndent`)
- 괄호 매칭 하이라이트 (`bracketMatch`)
- 들여쓰기 가이드 (`indentGuide`)
- 라인 작업 (주석, 이동, 복제 - `lineOperations`)

### 3. 타입추론 시스템 (Phase 1~6 완료)

| Phase | 설명 | 상태 |
|-------|------|------|
| Phase 1 | Generic 타입 시스템 | ✅ 완료 |
| Phase 2 | 표현식 파서 | ✅ 완료 |
| Phase 3 | 타입추론 엔진 | ✅ 완료 |
| Phase 4 | Built-in 타입 정의 | ✅ 완료 |
| Phase 5 | 클래스 타입 추론 | ✅ 완료 |
| Phase 6 | 통합 API (TypeChecker) | ✅ 완료 |

**구현된 파일**:
```
src/features/autocomplete/
├── types/
│   ├── TypeKind.js
│   ├── Type.js
│   ├── PrimitiveType.js
│   ├── ObjectType.js
│   ├── ArrayType.js
│   ├── FunctionType.js
│   ├── ClassType.js
│   ├── UnionType.js
│   ├── TypeVariable.js
│   ├── GenericType.js
│   ├── TypeSubstitution.js
│   └── BuiltinTypes.js
├── symbols/
│   ├── SymbolKind.js
│   ├── Symbol.js
│   ├── Scope.js
│   └── ScopeManager.js
├── parser/
│   ├── SimpleTokenizer.js
│   ├── ExpressionNode.js
│   └── ExpressionParser.js
├── inference/
│   ├── TypeInferenceEngine.js
│   ├── ReturnTypeAnalyzer.js
│   ├── GenericInference.js
│   ├── ClassTypeBuilder.js
│   └── ThisContextTracker.js
└── TypeChecker.js
```

### 4. 테스트 시스템

| 카테고리 | 파일 수 | 상태 |
|----------|---------|------|
| Unit Tests (types) | 10개 | ✅ |
| Unit Tests (symbols) | 4개 | ✅ |
| Unit Tests (parser) | 1개 | ✅ |
| Integration Tests | 4개 | ✅ |
| E2E Tests | 2개 | ✅ |

**테스트 러너 기능**:
- 카테고리 필터링 (unit/integration/e2e)
- 상태 필터링 (passed/failed/skipped)
- 복사 기능 (Copy Failed)

---

## 진행 예정 기능

### Phase 7: 자동완성 UI (고도화 필요)

> **상태**: 상세 구현 계획 수립 필요

**목표 기능**:
1. 자동완성 팝업 UI
2. 트리거 감지 (`.` 입력, 문자 입력)
3. 키보드 네비게이션 (화살표, Enter, Escape)
4. 에디터 연동

**구현 예정 파일**:
```
src/features/autocomplete/
├── ui/
│   ├── AutocompletePopup.js    # 팝업 UI 컴포넌트
│   ├── CompletionItem.js       # 개별 항목 렌더링
│   └── AutocompleteStyles.js   # 스타일 정의
├── AutocompleteProvider.js     # 제안 항목 제공
├── AutocompleteTrigger.js      # 트리거 감지
└── AutocompleteFeature.js      # 메인 기능 클래스
```

**TODO**:
- [ ] 트리거 조건 정의
- [ ] 팝업 위치 계산 로직
- [ ] 키보드 단축키 정의
- [ ] 성능 최적화 방안
- [ ] 스타일/테마 설계

---

### Phase 8: 추가 기능 (미정)

| 우선순위 | 기능 | 설명 |
|----------|------|------|
| - | 실시간 타입 체크 | 타이핑 중 타입 오류 표시 |
| - | 호버 타입 정보 | 마우스 오버 시 타입 표시 |
| - | Go to Definition | 정의로 이동 기능 |
| - | Find References | 참조 찾기 기능 |
| - | 리팩토링 지원 | 이름 변경 등 |

---

## 파일 구조

```
src/
├── core/
│   └── Editor.js
├── model/
│   └── Document.js
├── view/
│   └── EditorView.js
├── input/
│   ├── InputHandler.js
│   ├── EditContextHandler.js
│   └── TextareaHandler.js
├── tokenizer/
│   ├── Tokenizer.js
│   ├── TokenizerState.js
│   └── grammars/
└── features/
    ├── autoClose/
    ├── autoIndent/
    ├── bracketMatch/
    ├── indentGuide/
    ├── lineOperations/
    └── autocomplete/
        ├── types/
        ├── symbols/
        ├── parser/
        ├── inference/
        ├── ui/           (예정)
        └── TypeChecker.js

tests/
├── framework/
│   ├── TestRunner.js
│   ├── Expect.js
│   └── TestReporter.js
├── unit/
├── integration/
└── e2e/
```

---

## TypeChecker API 요약

```javascript
// 인스턴스 생성
var typeChecker = CodeEditor.TypeChecker.getInstance();

// 소스 코드 분석
var analysis = typeChecker.analyze(sourceCode);

// 표현식 타입 추론
var type = typeChecker.inferExpressionType(expression);

// 자동완성 제안 가져오기
var completions = typeChecker.getCompletions(objectType);
// Returns: [{ name, type, kind }, ...]

// 심볼 타입 조회
var symbolType = typeChecker.getSymbolType('symbolName');

// 클래스 타입 조회
var classType = typeChecker.getClassType('ClassName');
```

---

## 검증 방법

1. **단위 테스트**: `tests/unit/` - 각 모듈별 테스트
2. **통합 테스트**: `tests/integration/` - 모듈 간 연동 테스트
3. **E2E 테스트**: `tests/e2e/` - 전체 워크플로우 테스트
4. **브라우저 테스트**: `tests/index.html` 에서 실행

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-01-17 | Phase 1~6 완료, 테스트 시스템 구축 |
| 2026-01-17 | 테스트 필터링 기능 추가 |
| 2026-01-17 | 개발 계획서 초안 작성 (Phase 7 고도화 필요) |
