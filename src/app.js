import { AutoCloseFeature, AutoIndentFeature, BracketMatchFeature, Editor, isEditContextSupported } from './index.js';

// ============================================
// Sample Code for Syntax Highlighting Demo
// ============================================

// JavaScript sample code
const SAMPLE_CODE_JS = `// V2 Minimal Code Editor
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

// HTML sample code
const SAMPLE_CODE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sample HTML Page</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <!-- Main content -->
  <header class="site-header">
    <nav id="main-nav">
      <a href="/">Home</a>
      <a href="/about">About</a>
    </nav>
  </header>

  <main>
    <h1>Welcome to the Editor</h1>
    <p>This is a paragraph with <strong>bold</strong> text.</p>

    <!-- Form example -->
    <form action="/submit" method="post">
      <input type="text" name="username" placeholder="Username" required>
      <input type="email" name="email">
      <button type="submit" disabled>Submit</button>
    </form>

    <!-- Void elements -->
    <img src="image.png" alt="Sample image" />
    <br>
    <hr>

    <!-- Entities -->
    <p>Special chars: &amp; &lt; &gt; &nbsp; &#169; &#x00A9;</p>
  </main>

  <script src="app.js"></script>
</body>
</html>
`;

// CSS sample code
const SAMPLE_CODE_CSS = `/* CSS Sample - Testing Grammar */
@charset "UTF-8";
@import url('https://fonts.googleapis.com/css?family=Roboto');

/* CSS Variables */
:root {
  --primary-color: #3498db;
  --secondary-color: rgb(52, 73, 94);
  --spacing: 1rem;
  --font-size: 16px;
}

/* Element Selectors */
body {
  margin: 0;
  padding: 0;
  font-family: 'Roboto', sans-serif;
  font-size: var(--font-size);
  line-height: 1.5;
  background-color: #f5f5f5;
}

/* Class and ID Selectors */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing);
}

#main-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* Pseudo-classes and Pseudo-elements */
a:hover,
a:focus {
  color: var(--primary-color);
  text-decoration: underline;
}

.button::before {
  content: "→ ";
}

.list-item:nth-child(odd) {
  background-color: rgba(0, 0, 0, 0.05);
}

/* Attribute Selectors */
input[type="text"],
input[type="email"] {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px 12px;
}

[data-theme="dark"] {
  --primary-color: #5dade2;
}

/* Media Queries */
@media screen and (min-width: 768px) {
  .container {
    padding: calc(var(--spacing) * 2);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
}

/* Keyframes Animation */
@keyframes fadeIn {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.animated {
  animation: fadeIn 0.3s ease-out forwards;
}

/* Complex Selectors */
nav > ul > li.active > a {
  font-weight: bold !important;
}

/* Flexbox */
.flex-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}
`;

// Default sample code (JavaScript)
const SAMPLE_CODE = SAMPLE_CODE_CSS;

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

// Enable Auto-Indent feature
const autoIndent = new AutoIndentFeature(editor, {
  tabSize: 2,
  useSpaces: true,
});

// Enable Bracket Match feature
const bracketMatch = new BracketMatchFeature(editor);

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
window.autoIndent = autoIndent;
window.bracketMatch = bracketMatch;

// Expose sample code for testing different languages
window.SAMPLE_CODE_JS = SAMPLE_CODE_JS;
window.SAMPLE_CODE_HTML = SAMPLE_CODE_HTML;
window.SAMPLE_CODE_CSS = SAMPLE_CODE_CSS;

// ============================================
// Testing HTML/CSS Grammar - Instructions
// ============================================
//
// To test different language grammars in the browser console:
//
// 1. Test HTML highlighting:
//    editor.setLanguage('html');
//    editor.setValue(SAMPLE_CODE_HTML);
//
// 2. Test CSS highlighting:
//    editor.setLanguage('css');
//    editor.setValue(SAMPLE_CODE_CSS);
//
// 3. Switch back to JavaScript:
//    editor.setLanguage('javascript');
//    editor.setValue(SAMPLE_CODE_JS);
//
// Note: If setLanguage() is not implemented yet, you can create
// a new editor instance with a different language:
//
//    const container = document.getElementById('editor-container');
//    container.innerHTML = '';
//    const htmlEditor = new Editor(container, {
//      value: SAMPLE_CODE_HTML,
//      language: 'html'
//    });
//
// ============================================

console.log('Editor instance available as window.editor');
console.log('AutoCloseFeature available as window.autoClose');
console.log('AutoIndentFeature available as window.autoIndent');
console.log('BracketMatchFeature available as window.bracketMatch');
console.log('');
console.log('Sample code available: SAMPLE_CODE_JS, SAMPLE_CODE_HTML, SAMPLE_CODE_CSS');
console.log('To test HTML: editor.setLanguage("html"); editor.setValue(SAMPLE_CODE_HTML);');
console.log('To test CSS: editor.setLanguage("css"); editor.setValue(SAMPLE_CODE_CSS);');

