# EditContext Code Editor

A lightweight, modern code editor built with the [EditContext API](https://developer.mozilla.org/en-US/docs/Web/API/EditContext_API) — the new web standard for building custom text editors.

![Demo Screenshot](https://via.placeholder.com/800x400?text=EditContext+Code+Editor)

## ✨ Features

- 🚀 **Modern Input Handling** — Uses EditContext API for clean input/rendering separation
- 🔄 **Automatic Fallback** — Hidden textarea for unsupported browsers
- 🌏 **IME Support** — Full Korean, Japanese, Chinese input with composition styling
- 🎨 **Syntax Highlighting** — JavaScript tokenizer with VS Code-like colors
- 🌓 **Theming** — Dark (default) and light themes via CSS variables
- ⌨️ **Keyboard Shortcuts** — All standard editor shortcuts
- 📋 **Clipboard** — Copy, cut, paste support
- ↩️ **Undo/Redo** — Transaction-based history
- 📦 **Zero Dependencies** — Pure vanilla JavaScript

## 🌐 Browser Support

| Browser     | Input Method      | Status          |
| ----------- | ----------------- | --------------- |
| Chrome 121+ | EditContext       | ✅ Full support |
| Edge 121+   | EditContext       | ✅ Full support |
| Firefox     | Textarea fallback | ✅ Works        |
| Safari      | Textarea fallback | ✅ Works        |

## 🚀 Quick Start

### 1. Include the files

```html
<link rel="stylesheet" href="styles/editor.css" />
```

### 2. Create a container

```html
<div id="editor" style="height: 400px;"></div>
```

### 3. Initialize the editor

```html
<script type="module">
  import { Editor } from './src/index.js';

  const editor = new Editor(document.getElementById('editor'), {
    value: 'const hello = "world";',
    language: 'javascript',
  });
</script>
```

## 📖 API Reference

### Constructor Options

```javascript
new Editor(container, {
  value: '', // Initial content
  language: 'javascript', // Language for syntax highlighting
  fontSize: 14, // Font size in pixels
  lineHeight: 20, // Line height in pixels
  tabSize: 2, // Spaces per tab
  readOnly: false, // Disable editing
});
```

### Methods

| Method                     | Description                  |
| -------------------------- | ---------------------------- |
| `getValue()`               | Get editor content as string |
| `setValue(text)`           | Set editor content           |
| `getSelection()`           | Get `{start, end}` offsets   |
| `setSelection(start, end)` | Set selection                |
| `getSelectedText()`        | Get selected text            |
| `insertText(text)`         | Insert at cursor             |
| `getCursorPosition()`      | Get `{line, column}`         |
| `focus()`                  | Focus the editor             |
| `undo()`                   | Undo last change             |
| `redo()`                   | Redo last undone change      |
| `dispose()`                | Clean up resources           |

### Events

```javascript
editor.on('change', (change) => {
  console.log('Text changed:', change);
});

editor.on('selectionChange', (selection) => {
  console.log('Cursor moved:', selection);
});

editor.on('focus', () => console.log('Focused'));
editor.on('blur', () => console.log('Blurred'));
editor.on('compositionStart', () => console.log('IME started'));
editor.on('compositionEnd', () => console.log('IME ended'));
```

## ⌨️ Keyboard Shortcuts

| Shortcut                  | Action             |
| ------------------------- | ------------------ |
| `Ctrl+Z`                  | Undo               |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo               |
| `Ctrl+A`                  | Select all         |
| `Ctrl+C`                  | Copy               |
| `Ctrl+X`                  | Cut                |
| `Ctrl+V`                  | Paste              |
| `Ctrl+←/→`                | Word navigation    |
| `Home/End`                | Line start/end     |
| `Ctrl+Home/End`           | Document start/end |
| `Tab`                     | Insert spaces      |

## 🎨 Theming

Toggle between dark and light themes:

```javascript
// Switch to light theme
document.querySelector('.ec-editor').classList.add('ec-theme-light');

// Switch to dark theme
document.querySelector('.ec-editor').classList.remove('ec-theme-light');
```

Customize colors via CSS variables:

```css
.ec-editor {
  --ec-bg: #1e1e1e;
  --ec-fg: #d4d4d4;
  --ec-keyword: #569cd6;
  --ec-string: #ce9178;
  --ec-number: #b5cea8;
  --ec-comment: #6a9955;
  --ec-function: #dcdcaa;
  --ec-class: #4ec9b0;
}
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│              User Input                  │
│     (Keyboard / IME / Clipboard)        │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│            InputHandler                  │
│  ┌───────────────┐ ┌───────────────┐   │
│  │ EditContext   │ │   Textarea    │   │
│  │ (Chrome 121+) │ │  (Fallback)   │   │
│  └───────────────┘ └───────────────┘   │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│              Editor                      │
│  ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │ Document │ │Selection │ │  Undo  │  │
│  └──────────┘ └──────────┘ └────────┘  │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│            EditorView                    │
│  Lines | Cursor | Selection | Gutter    │
└─────────────────────────────────────────┘
```

## 📚 Documentation

- [Architecture Overview](docs/ARCHITECTURE.md) — System design and data flow
- [Decision Records](docs/DECISIONS.md) — Why things are built this way
- [Changelog](docs/CHANGELOG.md) — Version history

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License — feel free to use in your projects!

## 🔗 Resources

- [EditContext API on MDN](https://developer.mozilla.org/en-US/docs/Web/API/EditContext_API)
- [Chrome Blog: Introducing EditContext](https://developer.chrome.com/blog/introducing-editcontext-api)
- [W3C EditContext Specification](https://w3c.github.io/edit-context/)
