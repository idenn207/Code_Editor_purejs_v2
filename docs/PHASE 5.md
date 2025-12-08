Phase 5: IDE Features - Development List

| # | Feature | Files to Create/Modify
| Description
|
|-----|--------------------|-----------------------------------
----------------------------------------|----------------------
------------------------------------------------------|
| 1 | Data Models | src/ide/models/FileNode.jssrc/ide/
models/FileTree.jssrc/ide/models/Tab.js | Foundation data
structures for file tree and tabs |
| 2 | FileService | src/ide/services/FileService.js
| File System Access
API wrapper (open, read, write, create, delete, rename) |
| 3 | TabService | src/ide/services/TabService.js
| Tab lifecycle
management with per-tab undo history |
| 4 | SidebarResizer |
src/ide/components/SidebarResizer.js
| Draggable divider for resizable sidebar
(150-500px) |
| 5 | FileExplorer | src/ide/components/FileExplorer.js
| Tree view UI with
expand/collapse, file icons, keyboard navigation |
| 6 | TabBar | src/ide/components/TabBar.js
| Tab bar with dirty
indicator (●), close button (×), drag reorder |
| 7 | ContextMenu | src/ide/components/ContextMenu.js
| Right-click menu for
file/folder/tab operations |
| 8 | IDE Orchestrator | src/ide/IDE.jssrc/ide/index.js
| Main class wiring all
components, keyboard shortcuts |
| 9 | Editor Integration | src/core/Editor.js (modify)
| Add swapDocument(),
getUndoState(), setUndoState() |
| 10 | Styles & Demo | styles/ide.csside.htmlsrc/index.js
(modify) | CSS styles, demo
page, export updates |

---
