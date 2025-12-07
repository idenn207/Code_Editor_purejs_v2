/**
 * @fileoverview Main entry point for V2 Minimal Code Editor
 * @module editcontext-editor-v2
 */

// Core
export { Editor } from './core/Editor.js';

// Model
export { Document } from './model/Document.js';

// Input
export { EditContextHandler, isEditContextSupported } from './input/EditContextHandler.js';
export { InputHandler, InputMode } from './input/InputHandler.js';
export { TextareaHandler } from './input/TextareaHandler.js';

// View
export { EditorView } from './view/EditorView.js';

// Tokenizer
export { JavaScriptGrammar } from './tokenizer/grammars/javascript.js';
export { Tokenizer, TokenizerState, TokenType } from './tokenizer/Tokenizer.js';

// Features
export { AutoCloseFeature } from './features/autoClose/AutoCloseFeature.js';
export { AutoIndentFeature } from './features/autoIndent/AutoIndentFeature.js';
export { BracketMatchFeature } from './features/bracketMatch/BracketMatchFeature.js';

// Version
export const VERSION = '2.0.0';

// Feature detection helper
export function checkBrowserSupport() {
  return {
    editContext: 'EditContext' in window,
    clipboard: 'clipboard' in navigator,
    selection: 'getSelection' in window,
  };
}

// Default export
import { Editor } from './core/Editor.js';
export default Editor;
