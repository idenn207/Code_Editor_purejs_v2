import { Editor, isEditContextSupported } from './index.js';

// Sample code with various constructs
const SAMPLE_CODE = `// EditContext Code Editor - Auto-Complete Demo
// Type "user." or "calc." to see member completions!

// Object literal - type "user." to see completions
const user = {
  name: "Alice",
  age: 30,
  email: "alice@example.com",
  obj: {
    str: '',
    num: 0,
  },
  getInfo() {
    return \`\${this.name} (\${this.age})\`;
  }
};

class Calculator {
  constructor(initialValue = 0) {
    this.value = initialValue;
    this.history = [];
  }

  add(n) {
    this.history.push(\`add(\${n})\`);
    this.value += n;
    return this;
  }

  subtract(n) {
    this.history.push(\`subtract(\${n})\`);
    this.value -= n;
    return this;
  }

  multiply(n) {
    this.history.push(\`multiply(\${n})\`);
    this.value *= n;
    return this;
  }

  getResult() {
    return this.value;
  }
}

// Create instance - type "calc." to see completions
const calc = new Calculator(10);

// Function example
function greet(name) {
  const message = \`Hello, \${name}!\`;
  console.log(message);
  return message;
}

// Array methods - type "numbers." to see completions
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
const sum = numbers.reduce((a, b) => a + b, 0);

// Try the auto-complete:
// 1. Type "Math." to see Math methods
// 2. Type "console." to see console methods
// 3. Type "user." to see user object properties
// 4. Type "calc." to see Calculator methods
// 5. Start typing any variable name
`;

// Initialize editor
const container = document.getElementById('editor-container');
const editor = new Editor(container, {
  value: SAMPLE_CODE,
  language: 'javascript',
  fontSize: 14,
  lineHeight: 22,
});

// UI Elements
const inputModeEl = document.getElementById('input-mode');
const ecSupportEl = document.getElementById('ec-support');
const cursorPosEl = document.getElementById('cursor-pos');
const symbolCountEl = document.getElementById('symbol-count');
const errorCountEl = document.getElementById('error-count');
const outputEl = document.getElementById('output');
const symbolsOutputEl = document.getElementById('symbols-output');

// Show input mode
inputModeEl.textContent = editor.inputMode;
inputModeEl.className = `badge ${editor.inputMode === 'editcontext' ? 'badge-success' : 'badge-warning'}`;

// Show EditContext support
const supported = isEditContextSupported();
ecSupportEl.textContent = supported ? 'Yes' : 'No';
ecSupportEl.className = `badge ${supported ? 'badge-success' : 'badge-warning'}`;

// Update cursor position
editor.on('selectionChange', () => {
  const pos = editor.getCursorPosition();
  cursorPosEl.textContent = `${pos.line + 1}:${pos.column + 1}`;
});

// Update on analysis complete
editor.on('analysisComplete', ({ ast, errors }) => {
  const symbols = editor.languageService?.getAllSymbols() || [];
  symbolCountEl.textContent = symbols.length;

  errorCountEl.textContent = errors.length;
  errorCountEl.className = `badge ${errors.length === 0 ? 'badge-success' : 'badge-warning'}`;

  // Update symbols panel
  const userSymbols = symbols.filter((s) => s.type !== 'builtin');
  symbolsOutputEl.textContent =
    userSymbols.map((s) => `${s.kind}: ${s.name}${s.type ? ` (${s.type})` : ''}${s.members.length ? ` [${s.members.length} members]` : ''}`).join('\n') ||
    'No user-defined symbols';
});

// Log events
editor.on('autocompleteShow', () => {
  console.log('[Demo] Auto-complete shown');
});

editor.on('completionAccepted', ({ item }) => {
  console.log('[Demo] Completion accepted:', item.label);
});

// Button handlers
document.getElementById('btn-get-value').onclick = () => {
  outputEl.textContent = editor.getValue();
};

document.getElementById('btn-set-value').onclick = () => {
  editor.setValue(SAMPLE_CODE);
  outputEl.textContent = 'Sample code loaded!';
};

document.getElementById('btn-undo').onclick = () => {
  editor.undo();
};

document.getElementById('btn-redo').onclick = () => {
  editor.redo();
};

document.getElementById('btn-autocomplete').onclick = () => {
  editor.focus();
  editor.triggerAutoComplete();
};

document.getElementById('btn-show-ast').onclick = () => {
  const ast = editor.languageService?.getAST();
  if (ast) {
    outputEl.textContent = JSON.stringify(ast, null, 2).slice(0, 5000) + '\n... (truncated)';
  } else {
    outputEl.textContent = 'No AST available';
  }
};

document.getElementById('btn-show-symbols').onclick = () => {
  const symbols = editor.languageService?.getAllSymbols() || [];
  outputEl.textContent = JSON.stringify(
    symbols.map((s) => ({
      name: s.name,
      kind: s.kind,
      type: s.type,
      members: s.members.map((m) => m.name),
    })),
    null,
    2
  );
};

let isDark = true;
document.getElementById('btn-toggle-theme').onclick = () => {
  isDark = !isDark;
  // container.querySelector('.ec-editor').classList.toggle('ec-theme-light', !isDark);
  container.classList.toggle('ec-theme-light', !isDark);
};

// Focus editor
editor.focus();

// Expose for debugging
window.editor = editor;
console.log('Editor instance available as window.editor');
console.log('Try: editor.getCompletions(editor.getSelection().end)');
