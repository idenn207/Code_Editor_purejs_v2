/**
 * @fileoverview Main entry point for EditContext Code Editor
 * @module editcontext-editor
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

// Language Service
export { AST, ASTNode, ASTVisitor, NodeType } from './language/ASTNodes.js';
export { LanguageService } from './language/LanguageService.js';
export { ParseError, Parser } from './language/Parser.js';
export { CompletionItemKind, CompletionProvider } from './language/providers/CompletionProvider.js';
export { HoverInfo, HoverProvider } from './language/providers/HoverProvider.js';
export { Scope, Symbol, SymbolKind, SymbolTable } from './language/SymbolTable.js';

// Features
export { AutoComplete } from './features/AutoComplete.js';
export { HoverTooltip } from './features/HoverTooltip.js';

// Version
export const VERSION = '1.2.0';

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
