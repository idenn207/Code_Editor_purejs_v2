/**
 * @fileoverview Code Editor application entry point
 * @module app
 */

(function() {
  'use strict';

  // Get classes from namespace
  var Editor = CodeEditor.Editor;
  var isEditContextSupported = CodeEditor.isEditContextSupported;
  var AutoCloseFeature = CodeEditor.Features.AutoClose;
  var AutoIndentFeature = CodeEditor.Features.AutoIndent;
  var BracketMatchFeature = CodeEditor.Features.BracketMatch;
  var IndentGuideFeature = CodeEditor.Features.IndentGuide;
  var MultiCursorFeature = CodeEditor.Features.MultiCursor;
  var SearchFeature = CodeEditor.Features.Search;
  var LineOperationsFeature = CodeEditor.Features.LineOperations;

  // ============================================
  // Sample Code for Syntax Highlighting Demo
  // ============================================

  // JavaScript sample code
  var SAMPLE_CODE_JS = '// V2 Minimal Code Editor\n' +
    '// Basic syntax highlighting with EditContext API\n' +
    '\n' +
    '// Variables\n' +
    'const message = "Hello World";\n' +
    'let count = 42;\n' +
    'var legacy = true;\n' +
    '\n' +
    '// Function\n' +
    'function greet(name) {\n' +
    '  console.log(`Hello, ${name}!`);\n' +
    '  return name.toUpperCase();\n' +
    '}\n' +
    '\n' +
    '// Arrow function\n' +
    'const square = (x) => x * x;\n' +
    '\n' +
    '// Array\n' +
    'const numbers = [1, 2, 3, 4, 5];\n' +
    'const doubled = numbers.map(n => n * 2);\n' +
    '\n' +
    '// Object\n' +
    'const user = {\n' +
    '  name: "Alice",\n' +
    '  age: 30\n' +
    '};\n' +
    '\n' +
    '// Class\n' +
    'class Calculator {\n' +
    '  constructor(value) {\n' +
    '    this.value = value;\n' +
    '  }\n' +
    '\n' +
    '  add(n) {\n' +
    '    this.value += n;\n' +
    '    return this;\n' +
    '  }\n' +
    '}\n' +
    '\n' +
    '// Comments test\n' +
    '/* Multi-line\n' +
    '   comment block */\n' +
    '\n' +
    '// String variations\n' +
    'const str1 = "double quotes";\n' +
    'const str2 = \'single quotes\';\n' +
    'const str3 = `template ${message}`;\n' +
    '\n' +
    '// Try editing the code above!\n';

  // HTML sample code
  var SAMPLE_CODE_HTML = '<!DOCTYPE html>\n' +
    '<html lang="en">\n' +
    '<head>\n' +
    '  <meta charset="UTF-8">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '  <title>Sample HTML Page</title>\n' +
    '  <link rel="stylesheet" href="styles.css">\n' +
    '</head>\n' +
    '<body>\n' +
    '  <!-- Main content -->\n' +
    '  <header class="site-header">\n' +
    '    <nav id="main-nav">\n' +
    '      <a href="/">Home</a>\n' +
    '      <a href="/about">About</a>\n' +
    '    </nav>\n' +
    '  </header>\n' +
    '\n' +
    '  <main>\n' +
    '    <h1>Welcome to the Editor</h1>\n' +
    '    <p>This is a paragraph with <strong>bold</strong> text.</p>\n' +
    '\n' +
    '    <!-- Form example -->\n' +
    '    <form action="/submit" method="post">\n' +
    '      <input type="text" name="username" placeholder="Username" required>\n' +
    '      <input type="email" name="email">\n' +
    '      <button type="submit" disabled>Submit</button>\n' +
    '    </form>\n' +
    '\n' +
    '    <!-- Void elements -->\n' +
    '    <img src="image.png" alt="Sample image" />\n' +
    '    <br>\n' +
    '    <hr>\n' +
    '\n' +
    '    <!-- Entities -->\n' +
    '    <p>Special chars: &amp; &lt; &gt; &nbsp; &#169; &#x00A9;</p>\n' +
    '  </main>\n' +
    '\n' +
    '  <script src="app.js"></script>\n' +
    '</body>\n' +
    '</html>\n';

  // CSS sample code
  var SAMPLE_CODE_CSS = '/* CSS Sample - Testing Grammar */\n' +
    '@charset "UTF-8";\n' +
    '@import url(\'https://fonts.googleapis.com/css?family=Roboto\');\n' +
    '\n' +
    '/* CSS Variables */\n' +
    ':root {\n' +
    '  --primary-color: #3498db;\n' +
    '  --secondary-color: rgb(52, 73, 94);\n' +
    '  --spacing: 1rem;\n' +
    '  --font-size: 16px;\n' +
    '}\n' +
    '\n' +
    '/* Element Selectors */\n' +
    'body {\n' +
    '  margin: 0;\n' +
    '  padding: 0;\n' +
    '  font-family: \'Roboto\', sans-serif;\n' +
    '  font-size: var(--font-size);\n' +
    '  line-height: 1.5;\n' +
    '  background-color: #f5f5f5;\n' +
    '}\n' +
    '\n' +
    '/* Class and ID Selectors */\n' +
    '.container {\n' +
    '  max-width: 1200px;\n' +
    '  margin: 0 auto;\n' +
    '  padding: var(--spacing);\n' +
    '}\n' +
    '\n' +
    '#main-header {\n' +
    '  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n' +
    '  color: white;\n' +
    '}\n' +
    '\n' +
    '/* Pseudo-classes and Pseudo-elements */\n' +
    'a:hover,\n' +
    'a:focus {\n' +
    '  color: var(--primary-color);\n' +
    '  text-decoration: underline;\n' +
    '}\n' +
    '\n' +
    '.button::before {\n' +
    '  content: "-> ";\n' +
    '}\n' +
    '\n' +
    '.list-item:nth-child(odd) {\n' +
    '  background-color: rgba(0, 0, 0, 0.05);\n' +
    '}\n' +
    '\n' +
    '/* Attribute Selectors */\n' +
    'input[type="text"],\n' +
    'input[type="email"] {\n' +
    '  border: 1px solid #ccc;\n' +
    '  border-radius: 4px;\n' +
    '  padding: 8px 12px;\n' +
    '}\n' +
    '\n' +
    '[data-theme="dark"] {\n' +
    '  --primary-color: #5dade2;\n' +
    '}\n' +
    '\n' +
    '/* Media Queries */\n' +
    '@media screen and (min-width: 768px) {\n' +
    '  .container {\n' +
    '    padding: calc(var(--spacing) * 2);\n' +
    '  }\n' +
    '\n' +
    '  .grid {\n' +
    '    display: grid;\n' +
    '    grid-template-columns: repeat(3, 1fr);\n' +
    '    gap: 20px;\n' +
    '  }\n' +
    '}\n' +
    '\n' +
    '/* Keyframes Animation */\n' +
    '@keyframes fadeIn {\n' +
    '  0% {\n' +
    '    opacity: 0;\n' +
    '    transform: translateY(-10px);\n' +
    '  }\n' +
    '  100% {\n' +
    '    opacity: 1;\n' +
    '    transform: translateY(0);\n' +
    '  }\n' +
    '}\n' +
    '\n' +
    '.animated {\n' +
    '  animation: fadeIn 0.3s ease-out forwards;\n' +
    '}\n' +
    '\n' +
    '/* Complex Selectors */\n' +
    'nav > ul > li.active > a {\n' +
    '  font-weight: bold !important;\n' +
    '}\n' +
    '\n' +
    '/* Flexbox */\n' +
    '.flex-container {\n' +
    '  display: flex;\n' +
    '  justify-content: space-between;\n' +
    '  align-items: center;\n' +
    '  flex-wrap: wrap;\n' +
    '}\n';

  // Default sample code (JavaScript)
  var SAMPLE_CODE = SAMPLE_CODE_JS;

  // Initialize editor
  var container = document.getElementById('editor-container');
  var editor = new Editor(container, {
    value: SAMPLE_CODE,
    language: 'javascript',
    fontSize: 14,
    lineHeight: 22,
  });

  // Enable Auto-Close feature
  var autoClose = new AutoCloseFeature(editor);

  // Enable Auto-Indent feature
  var autoIndent = new AutoIndentFeature(editor, {
    tabSize: 2,
    useSpaces: true,
  });

  // Enable Bracket Match feature
  var bracketMatch = new BracketMatchFeature(editor);

  // Enable Indent Guide feature
  var indentGuide = new IndentGuideFeature(editor, {
    tabSize: 2,
  });

  // Enable Search feature
  var search = new SearchFeature(editor);

  // Enable Multi-Cursor feature
  var multiCursor = new MultiCursorFeature(editor);

  // Enable Line Operations feature (comment, move, duplicate)
  var lineOperations = new LineOperationsFeature(editor);

  // UI Elements
  var inputModeEl = document.getElementById('input-mode');
  var ecSupportEl = document.getElementById('ec-support');
  var cursorPosEl = document.getElementById('cursor-pos');
  var outputEl = document.getElementById('output');

  // Show input mode
  inputModeEl.textContent = editor.inputMode;
  inputModeEl.className = 'badge ' + (editor.inputMode === 'editcontext' ? 'badge-success' : 'badge-warning');

  // Show EditContext support
  var supported = isEditContextSupported();
  ecSupportEl.textContent = supported ? 'Yes' : 'No';
  ecSupportEl.className = 'badge ' + (supported ? 'badge-success' : 'badge-warning');

  // Update cursor position
  editor.on('selectionChange', function() {
    var pos = editor.getCursorPosition();
    cursorPosEl.textContent = (pos.line + 1) + ':' + (pos.column + 1);
  });

  // Button handlers
  document.getElementById('btn-get-value').onclick = function() {
    outputEl.textContent = editor.getValue();
  };

  document.getElementById('btn-set-value').onclick = function() {
    editor.setValue(SAMPLE_CODE);
    outputEl.textContent = 'Sample code loaded!';
  };

  document.getElementById('btn-undo').onclick = function() {
    editor.undo();
  };

  document.getElementById('btn-redo').onclick = function() {
    editor.redo();
  };

  var isDark = true;
  document.getElementById('btn-toggle-theme').onclick = function() {
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
  window.indentGuide = indentGuide;
  window.multiCursor = multiCursor;
  window.search = search;
  window.lineOperations = lineOperations;

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
  // ============================================

  console.log('Editor instance available as window.editor');
  console.log('AutoCloseFeature available as window.autoClose');
  console.log('AutoIndentFeature available as window.autoIndent');
  console.log('BracketMatchFeature available as window.bracketMatch');
  console.log('IndentGuideFeature available as window.indentGuide');
  console.log('MultiCursorFeature available as window.multiCursor');
  console.log('SearchFeature available as window.search');
  console.log('LineOperationsFeature available as window.lineOperations');
  console.log('');
  console.log('Search: Ctrl+F (find), Ctrl+H (replace)');
  console.log('Line Operations: Ctrl+/ (toggle comment), Alt+Up/Down (move line), Alt+Shift+Up/Down (duplicate line)');
  console.log('Multi-Cursor: Alt+Click (add cursor), Ctrl+Alt+Up/Down (add cursor above/below), Ctrl+D (select next), Escape (collapse)');
  console.log('');
  console.log('Sample code available: SAMPLE_CODE_JS, SAMPLE_CODE_HTML, SAMPLE_CODE_CSS');
  console.log('To test HTML: editor.setLanguage("html"); editor.setValue(SAMPLE_CODE_HTML);');
  console.log('To test CSS: editor.setLanguage("css"); editor.setValue(SAMPLE_CODE_CSS);');

})();
