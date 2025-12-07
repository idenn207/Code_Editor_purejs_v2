import { Editor, isEditContextSupported, AutoCloseFeature } from './index.js';

// Sample code for basic syntax highlighting demo
const SAMPLE_CODE = `// V2 Minimal Code Editor
// Basic syntax highlighting with EditContext API

// Variables
const message = "Hello World";
let count = 42;
var legacy = true;

// Function
function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return name.toUpperCase();
}

// Arrow function
const square = (x) => x * x;

// Array
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);

// Object
const user = {
  name: "Alice",
  age: 30
};

// Class
class Calculator {
  constructor(value) {
    this.value = value;
  }

  add(n) {
    this.value += n;
    return this;
  }
}

// Comments test
/* Multi-line
   comment block */

// String variations
const str1 = "double quotes";
const str2 = 'single quotes';
const str3 = \`template \${message}\`;

// Try editing the code above!
`;

// Initialize editor
const container = document.getElementById('editor-container');
const editor = new Editor(container, {
  value: SAMPLE_CODE,
  language: 'javascript',
  fontSize: 14,
  lineHeight: 22,
});

// Enable Auto-Close feature
const autoClose = new AutoCloseFeature(editor);

// UI Elements
const inputModeEl = document.getElementById('input-mode');
const ecSupportEl = document.getElementById('ec-support');
const cursorPosEl = document.getElementById('cursor-pos');
const outputEl = document.getElementById('output');

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

let isDark = true;
document.getElementById('btn-toggle-theme').onclick = () => {
  isDark = !isDark;
  container.classList.toggle('ec-theme-light', !isDark);
};

// Focus editor
editor.focus();

// Expose for debugging
window.editor = editor;
window.autoClose = autoClose;
console.log('Editor instance available as window.editor');
console.log('AutoCloseFeature available as window.autoClose');
