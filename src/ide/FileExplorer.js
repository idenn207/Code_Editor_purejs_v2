/**
 * FileExplorer - File tree component
 *
 * Displays the file tree with expand/collapse, file icons,
 * and keyboard navigation. Follows VSCode file explorer design.
 */
(function(CodeEditor) {
  'use strict';

  // Get dependencies
  var FileNode = CodeEditor.FileNode;

  class FileExplorer {
    // ============================================
    // Static Members
    // ============================================

    // SVG Icons
    static ICONS = {
      chevron: '<svg viewBox="0 0 16 16"><path d="M5.7 13.7L5 13l4.6-4.6L5 3.7l.7-.7 5 5.3-5 5.4z"/></svg>',
      folder: '<svg viewBox="0 0 16 16"><path d="M14.5 3H7.71l-.85-.85L6.51 2H1.5l-.5.5v11l.5.5h13l.5-.5v-10L14.5 3zm-.51 8.49V13h-12V7h4.49l.35-.15.86-.86H14v5.5zM6.51 6l-.35.15-.86.86H2v-3h4.01l.85.85.35.15H13.99v1H6.51z"/></svg>',
      folderOpen: '<svg viewBox="0 0 16 16"><path d="M1.5 14h11l.48-.37 2.63-7-.48-.63H14V3.5l-.5-.5H7.71l-.86-.85L6.5 2h-5l-.5.5v11l.5.5zM2 3h4.01l.85.85.35.15H13v2H8.16l-.86.86-.35.15H1.5l-.47.34L2 3zm11.13 10H2.19l1.67-5H7.5l.35-.15.86-.85h5.79l-1.37 6z"/></svg>',
      file: '<svg viewBox="0 0 16 16"><path d="M13.71 4.29l-3-3L10 1H4L3 2v12l1 1h9l1-1V5l-.29-.71zM13 14H4V2h5v4h4v8zm-3-9V2l3 3h-3z"/></svg>',
      fileJs: '<svg viewBox="0 0 16 16"><path d="M13.71 4.29l-3-3L10 1H4L3 2v12l1 1h9l1-1V5l-.29-.71zM13 14H4V2h5v4h4v8zm-3-9V2l3 3h-3z"/><text x="5" y="12" font-size="5" font-weight="bold" fill="currentColor">JS</text></svg>',
      fileTs: '<svg viewBox="0 0 16 16"><path d="M13.71 4.29l-3-3L10 1H4L3 2v12l1 1h9l1-1V5l-.29-.71zM13 14H4V2h5v4h4v8zm-3-9V2l3 3h-3z"/><text x="5" y="12" font-size="5" font-weight="bold" fill="currentColor">TS</text></svg>',
      fileHtml: '<svg viewBox="0 0 16 16"><path d="M13.71 4.29l-3-3L10 1H4L3 2v12l1 1h9l1-1V5l-.29-.71zM13 14H4V2h5v4h4v8zm-3-9V2l3 3h-3z"/><text x="3" y="12" font-size="4" fill="currentColor">HTML</text></svg>',
      fileCss: '<svg viewBox="0 0 16 16"><path d="M13.71 4.29l-3-3L10 1H4L3 2v12l1 1h9l1-1V5l-.29-.71zM13 14H4V2h5v4h4v8zm-3-9V2l3 3h-3z"/><text x="4" y="12" font-size="4" fill="currentColor">CSS</text></svg>',
      fileJson: '<svg viewBox="0 0 16 16"><path d="M13.71 4.29l-3-3L10 1H4L3 2v12l1 1h9l1-1V5l-.29-.71zM13 14H4V2h5v4h4v8zm-3-9V2l3 3h-3z"/><text x="4" y="12" font-size="4" fill="currentColor">{}</text></svg>',
      fileMd: '<svg viewBox="0 0 16 16"><path d="M13.71 4.29l-3-3L10 1H4L3 2v12l1 1h9l1-1V5l-.29-.71zM13 14H4V2h5v4h4v8zm-3-9V2l3 3h-3z"/><text x="4" y="12" font-size="4" fill="currentColor">MD</text></svg>',
    };

    // ============================================
    // Instance Members
    // ============================================

    _container = null;
    _treeElement = null;
    _welcomeElement = null;
    _rootNode = null;
    _selectedNode = null;
    _focusedNode = null;
    _fileService = null;
    _listeners = new Map();

    // ============================================
    // Constructor
    // ============================================

    /**
     * Create a new FileExplorer
     * @param {HTMLElement} container - Container element
     * @param {Object} options - FileExplorer options
     */
    constructor(container, options) {
      options = options || {};
      this._container = container;
      this._fileService = options.fileService || null;
      this._createDOM();
      this._bindEvents();
      this._showWelcome();
    }

    // ============================================
    // Public Methods
    // ============================================

    /**
     * Set the root node for the file tree
     * @param {FileNode} rootNode - Root file node
     */
    setRoot(rootNode) {
      this._rootNode = rootNode;
      this._hideWelcome();
      this._render();
    }

    /**
     * Get the root node
     * @returns {FileNode|null}
     */
    getRoot() {
      return this._rootNode;
    }

    /**
     * Refresh the file tree
     */
    refresh() {
      this._render();
    }

    /**
     * Select a node by path
     * @param {string} path - Node path
     */
    selectByPath(path) {
      if (!this._rootNode) return;

      var node = this._rootNode.findByPath(path);
      if (node) {
        this._selectNode(node);
        this._scrollToNode(node);
      }
    }

    /**
     * Expand a node
     * @param {FileNode} node - Node to expand
     */
    async expandNode(node) {
      if (node.type !== 'directory') return;

      // Load contents if not loaded
      if (!node.loaded && this._fileService) {
        await this._fileService.loadDirectoryContents(node);
        node.loaded = true;
      }

      node.expanded = true;
      this._render();
    }

    /**
     * Collapse a node
     * @param {FileNode} node - Node to collapse
     */
    collapseNode(node) {
      if (node.type !== 'directory') return;
      node.expanded = false;
      this._render();
    }

    /**
     * Toggle node expand/collapse
     * @param {FileNode} node - Node to toggle
     */
    async toggleNode(node) {
      if (node.type !== 'directory') return;

      if (node.expanded) {
        this.collapseNode(node);
      } else {
        await this.expandNode(node);
      }
    }

    /**
     * Focus the file explorer
     */
    focus() {
      if (this._treeElement) {
        this._treeElement.focus();
      }
    }

    /**
     * Show the file explorer
     */
    show() {
      var wrapper = this._container.querySelector('.ide-file-explorer');
      if (wrapper) {
        wrapper.style.display = '';
      }
    }

    /**
     * Hide the file explorer
     */
    hide() {
      var wrapper = this._container.querySelector('.ide-file-explorer');
      if (wrapper) {
        wrapper.style.display = 'none';
      }
    }

    /**
     * Clear the file tree
     */
    clear() {
      this._rootNode = null;
      this._selectedNode = null;
      this._focusedNode = null;
      this._showWelcome();
    }

    /**
     * Dispose FileExplorer
     */
    dispose() {
      this._listeners.clear();
      this._container.innerHTML = '';
    }

    // ============================================
    // Event System
    // ============================================

    on(event, callback) {
      if (!this._listeners.has(event)) {
        this._listeners.set(event, new Set());
      }
      this._listeners.get(event).add(callback);
      var self = this;
      return function() {
        self._listeners.get(event).delete(callback);
      };
    }

    off(event, callback) {
      var listeners = this._listeners.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
    }

    _emit(event, data) {
      var listeners = this._listeners.get(event);
      if (listeners) {
        listeners.forEach(function(cb) {
          cb(data);
        });
      }
    }

    // ============================================
    // Private Methods - DOM
    // ============================================

    /**
     * Create DOM structure
     */
    _createDOM() {
      // Clear container
      this._container.innerHTML = '';

      // File explorer wrapper
      var wrapper = document.createElement('div');
      wrapper.className = 'ide-file-explorer';

      // Tree container
      this._treeElement = document.createElement('div');
      this._treeElement.className = 'ide-file-tree';
      this._treeElement.tabIndex = 0;
      wrapper.appendChild(this._treeElement);

      // Welcome/empty state
      this._welcomeElement = document.createElement('div');
      this._welcomeElement.className = 'ide-explorer-welcome';
      this._welcomeElement.innerHTML =
        '<div class="ide-explorer-welcome-icon">📁</div>' +
        '<div class="ide-explorer-welcome-text">No folder opened</div>' +
        '<button class="ide-explorer-welcome-btn" data-action="open-folder">' +
        'Open Folder' +
        '</button>';
      wrapper.appendChild(this._welcomeElement);

      this._container.appendChild(wrapper);
    }

    /**
     * Bind event handlers
     */
    _bindEvents() {
      var self = this;

      // Click on tree item
      this._treeElement.addEventListener('click', function(e) {
        self._handleClick(e);
      });

      // Double click to open file
      this._treeElement.addEventListener('dblclick', function(e) {
        self._handleDoubleClick(e);
      });

      // Keyboard navigation
      this._treeElement.addEventListener('keydown', function(e) {
        self._handleKeyDown(e);
      });

      // Open folder button
      this._welcomeElement.addEventListener('click', function(e) {
        var btn = e.target.closest('[data-action="open-folder"]');
        if (btn) {
          self._emit('openFolder', {});
        }
      });
    }

    /**
     * Show welcome/empty state
     */
    _showWelcome() {
      this._treeElement.classList.add('ide-hidden');
      this._welcomeElement.classList.remove('ide-hidden');
    }

    /**
     * Hide welcome/empty state
     */
    _hideWelcome() {
      this._treeElement.classList.remove('ide-hidden');
      this._welcomeElement.classList.add('ide-hidden');
    }

    /**
     * Render the file tree
     */
    _render() {
      this._treeElement.innerHTML = '';
      if (!this._rootNode) return;

      // Get visible nodes (expanded directories show children)
      var visibleNodes = this._rootNode.getVisibleNodes();

      for (var i = 0; i < visibleNodes.length; i++) {
        var node = visibleNodes[i];
        var item = this._renderNode(node);
        this._treeElement.appendChild(item);
      }
    }

    /**
     * Render a single node
     * @param {FileNode} node - Node to render
     * @returns {HTMLElement}
     */
    _renderNode(node) {
      var item = document.createElement('div');
      item.className = 'ide-tree-item';
      item.dataset.path = node.path;
      item.dataset.id = node.id;
      item.dataset.type = node.type;
      item.style.paddingLeft = (node.depth * 12 + 8) + 'px';

      // Selected state
      if (node === this._selectedNode) {
        item.classList.add('selected');
      }

      // Focused state
      if (node === this._focusedNode) {
        item.classList.add('focused');
      }

      // Toggle arrow (for directories)
      if (node.type === 'directory') {
        var toggle = document.createElement('span');
        toggle.className = 'ide-tree-toggle' + (node.expanded ? ' expanded' : '');
        toggle.innerHTML = FileExplorer.ICONS.chevron;
        item.appendChild(toggle);
      } else {
        var spacer = document.createElement('span');
        spacer.className = 'ide-tree-toggle-spacer';
        item.appendChild(spacer);
      }

      // Icon
      var icon = document.createElement('span');
      icon.className = 'ide-tree-icon ' + this._getIconClass(node);
      icon.innerHTML = this._getIcon(node);
      item.appendChild(icon);

      // Label
      var label = document.createElement('span');
      label.className = 'ide-tree-label';
      label.textContent = node.name;
      item.appendChild(label);

      return item;
    }

    /**
     * Get icon class for node
     * @param {FileNode} node
     * @returns {string}
     */
    _getIconClass(node) {
      if (node.type === 'directory') {
        return node.expanded ? 'folder-open' : 'folder';
      }

      var ext = node.extension;
      var classMap = {
        js: 'file-js',
        mjs: 'file-js',
        jsx: 'file-js',
        ts: 'file-ts',
        tsx: 'file-ts',
        html: 'file-html',
        htm: 'file-html',
        css: 'file-css',
        scss: 'file-css',
        json: 'file-json',
        md: 'file-md',
      };

      return classMap[ext] || 'file-default';
    }

    /**
     * Get icon SVG for node
     * @param {FileNode} node
     * @returns {string}
     */
    _getIcon(node) {
      if (node.type === 'directory') {
        return node.expanded
          ? FileExplorer.ICONS.folderOpen
          : FileExplorer.ICONS.folder;
      }

      var ext = node.extension;
      var iconMap = {
        js: FileExplorer.ICONS.fileJs,
        mjs: FileExplorer.ICONS.fileJs,
        jsx: FileExplorer.ICONS.fileJs,
        ts: FileExplorer.ICONS.fileTs,
        tsx: FileExplorer.ICONS.fileTs,
        html: FileExplorer.ICONS.fileHtml,
        htm: FileExplorer.ICONS.fileHtml,
        css: FileExplorer.ICONS.fileCss,
        scss: FileExplorer.ICONS.fileCss,
        json: FileExplorer.ICONS.fileJson,
        md: FileExplorer.ICONS.fileMd,
      };

      return iconMap[ext] || FileExplorer.ICONS.file;
    }

    /**
     * Select a node
     * @param {FileNode} node
     */
    _selectNode(node) {
      // Deselect previous
      if (this._selectedNode) {
        this._selectedNode.selected = false;
      }

      this._selectedNode = node;
      node.selected = true;

      // Update DOM
      var self = this;
      this._treeElement.querySelectorAll('.ide-tree-item').forEach(function(el) {
        el.classList.toggle('selected', el.dataset.id === node.id);
      });

      this._emit('selectionChange', { node: node });
    }

    /**
     * Scroll to make a node visible
     * @param {FileNode} node
     */
    _scrollToNode(node) {
      var item = this._treeElement.querySelector('[data-id="' + node.id + '"]');
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }

    /**
     * Find node by element
     * @param {HTMLElement} element
     * @returns {FileNode|null}
     */
    _findNodeByElement(element) {
      if (!this._rootNode || !element) return null;
      var id = element.dataset.id;
      return this._rootNode.findById(id);
    }

    // ============================================
    // Event Handlers
    // ============================================

    /**
     * Handle click on tree item
     * @param {MouseEvent} e
     */
    _handleClick(e) {
      var item = e.target.closest('.ide-tree-item');
      if (!item) return;

      var node = this._findNodeByElement(item);
      if (!node) return;

      // Select node
      this._selectNode(node);

      // If directory, toggle expand/collapse on single click
      if (node.type === 'directory') {
        this.toggleNode(node);
        return;
      }

      // If file, emit select event
      if (node.type === 'file') {
        this._emit('fileSelect', { node: node, path: node.path });
      }
    }

    /**
     * Handle double click
     * @param {MouseEvent} e
     */
    _handleDoubleClick(e) {
      var item = e.target.closest('.ide-tree-item');
      if (!item) return;

      var node = this._findNodeByElement(item);
      if (!node) return;

      if (node.type === 'directory') {
        // Toggle directory on double click
        this.toggleNode(node);
      } else {
        // Open file (keep open, not preview)
        this._emit('fileOpen', { node: node, path: node.path });
      }
    }

    /**
     * Handle keyboard navigation
     * @param {KeyboardEvent} e
     */
    _handleKeyDown(e) {
      if (!this._rootNode) return;

      var visibleNodes = this._rootNode.getVisibleNodes();
      var currentIndex = visibleNodes.indexOf(this._selectedNode);

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < visibleNodes.length - 1) {
            var nextNode = visibleNodes[currentIndex + 1];
            this._selectNode(nextNode);
            this._scrollToNode(nextNode);
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            var prevNode = visibleNodes[currentIndex - 1];
            this._selectNode(prevNode);
            this._scrollToNode(prevNode);
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (this._selectedNode && this._selectedNode.type === 'directory') {
            if (!this._selectedNode.expanded) {
              this.expandNode(this._selectedNode);
            } else if (this._selectedNode.hasChildren) {
              // Move to first child
              var firstChild = this._selectedNode.children[0];
              this._selectNode(firstChild);
              this._scrollToNode(firstChild);
            }
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (this._selectedNode && this._selectedNode.type === 'directory' && this._selectedNode.expanded) {
            this.collapseNode(this._selectedNode);
          } else if (this._selectedNode && this._selectedNode.parent) {
            // Move to parent
            this._selectNode(this._selectedNode.parent);
            this._scrollToNode(this._selectedNode.parent);
          }
          break;

        case 'Enter':
          e.preventDefault();
          if (this._selectedNode) {
            if (this._selectedNode.type === 'directory') {
              this.toggleNode(this._selectedNode);
            } else {
              this._emit('fileSelect', {
                node: this._selectedNode,
                path: this._selectedNode.path,
              });
            }
          }
          break;

        case 'Home':
          e.preventDefault();
          if (visibleNodes.length > 0) {
            this._selectNode(visibleNodes[0]);
            this._scrollToNode(visibleNodes[0]);
          }
          break;

        case 'End':
          e.preventDefault();
          if (visibleNodes.length > 0) {
            var lastNode = visibleNodes[visibleNodes.length - 1];
            this._selectNode(lastNode);
            this._scrollToNode(lastNode);
          }
          break;
      }
    }
  }

  // ============================================
  // Export to namespace
  // ============================================

  CodeEditor.IDE = CodeEditor.IDE || {};
  CodeEditor.IDE.FileExplorer = FileExplorer;

})(window.CodeEditor = window.CodeEditor || {});
