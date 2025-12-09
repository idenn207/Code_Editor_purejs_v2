/**
 * @fileoverview Main entry point for V2 Minimal Code Editor
 * @module editcontext-editor-v2
 */

// Core
export { Editor } from './core/Editor.js';

// Model
export { Document } from './model/Document.js';
export { Selection } from './model/Selection.js';
export { SelectionCollection } from './model/SelectionCollection.js';

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
export { AutocompleteFeature } from './features/autocomplete/AutocompleteFeature.js';
export { AutoIndentFeature } from './features/autoIndent/AutoIndentFeature.js';
export { BracketMatchFeature } from './features/bracketMatch/BracketMatchFeature.js';
export { IndentGuideFeature } from './features/indentGuide/IndentGuideFeature.js';
export { MultiCursorFeature } from './features/multiCursor/MultiCursorFeature.js';
export { SearchFeature } from './features/search/SearchFeature.js';

// IDE Components
export { IDE } from './ide/IDE.js';
export { ActivityBar } from './ide/ActivityBar.js';
export { Sidebar } from './ide/Sidebar.js';
export { FileExplorer } from './ide/FileExplorer.js';
export { TabBar } from './ide/TabBar.js';
export { EditorArea } from './ide/EditorArea.js';
export { StatusBar } from './ide/StatusBar.js';

// IDE Models
export { FileNode } from './model/FileNode.js';
export { Tab } from './model/Tab.js';

// IDE Services
export { FileService } from './services/FileService.js';
export { WorkspaceService } from './services/WorkspaceService.js';

// Version
export const VERSION = '2.1.0';

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
