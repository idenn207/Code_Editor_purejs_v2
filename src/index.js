/**
 * @fileoverview Main entry point for EditContext Code Editor
 * @module editcontext-editor
 */

export { Editor } from './core/Editor.js';
export { EditContextHandler } from './input/EditContextHandler.js';
export { InputHandler, InputMode, isEditContextSupported } from './input/InputHandler.js';
export { TextareaHandler } from './input/TextareaHandler.js';
export { Document } from './model/Document.js';
export { Tokenizer, TokenType } from './tokenizer/Tokenizer.js';
export { EditorView } from './view/EditorView.js';

// Version
export const VERSION = '1.0.0';

// Feature detection helper
export function checkBrowserSupport() {
  return {
    editContext: 'EditContext' in window,
    clipboard: 'clipboard' in navigator,
    selection: 'getSelection' in window,
  };
}
