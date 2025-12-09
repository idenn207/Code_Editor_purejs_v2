/**
 * FileNode - Model for file/directory tree nodes
 *
 * Represents a node in the file tree structure.
 * Supports both files and directories with lazy loading for directories.
 */
export class FileNode {
  // ============================================
  // Static Members
  // ============================================

  static _idCounter = 0;

  static TYPES = {
    FILE: 'file',
    DIRECTORY: 'directory',
  };

  // Language detection by file extension
  static LANGUAGE_MAP = {
    js: 'javascript',
    mjs: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'css',
    less: 'css',
    json: 'json',
    md: 'markdown',
    markdown: 'markdown',
    py: 'python',
    rb: 'ruby',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    go: 'go',
    rs: 'rust',
    php: 'php',
    sh: 'shell',
    bash: 'shell',
    yml: 'yaml',
    yaml: 'yaml',
    xml: 'xml',
    svg: 'xml',
    sql: 'sql',
    txt: 'plaintext',
  };

  // ============================================
  // Instance Members
  // ============================================

  _id = null;
  _name = '';
  _path = '';
  _type = 'file';
  _children = null;
  _parent = null;
  _expanded = false;
  _selected = false;
  _depth = 0;
  _handle = null; // File System Access API handle
  _loaded = false; // Whether directory contents have been loaded

  // ============================================
  // Constructor
  // ============================================

  /**
   * Create a new FileNode
   * @param {string} name - File or directory name
   * @param {string} path - Full path to the file/directory
   * @param {string} type - 'file' or 'directory'
   * @param {Object} options - Additional options
   */
  constructor(name, path, type = 'file', options = {}) {
    this._id = options.id || this._generateId();
    this._name = name;
    this._path = path;
    this._type = type;
    this._children = type === 'directory' ? [] : null;
    this._parent = options.parent || null;
    this._expanded = options.expanded || false;
    this._depth = options.depth || 0;
    this._handle = options.handle || null;
    this._loaded = options.loaded || false;
  }

  // ============================================
  // Public Methods
  // ============================================

  /**
   * Add a child node to this directory
   * @param {FileNode} node - Child node to add
   */
  addChild(node) {
    if (this._type !== 'directory') {
      throw new Error('Cannot add child to file node');
    }
    node._parent = this;
    node._depth = this._depth + 1;
    this._children.push(node);
  }

  /**
   * Remove a child node from this directory
   * @param {FileNode} node - Child node to remove
   * @returns {boolean} True if removed successfully
   */
  removeChild(node) {
    if (this._type !== 'directory' || !this._children) {
      return false;
    }
    const index = this._children.indexOf(node);
    if (index !== -1) {
      this._children.splice(index, 1);
      node._parent = null;
      return true;
    }
    return false;
  }

  /**
   * Find a node by its path (recursive)
   * @param {string} targetPath - Path to search for
   * @returns {FileNode|null} Found node or null
   */
  findByPath(targetPath) {
    if (this._path === targetPath) {
      return this;
    }
    if (this._type === 'directory' && this._children) {
      for (const child of this._children) {
        const found = child.findByPath(targetPath);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  /**
   * Find a node by its ID (recursive)
   * @param {string} id - ID to search for
   * @returns {FileNode|null} Found node or null
   */
  findById(id) {
    if (this._id === id) {
      return this;
    }
    if (this._type === 'directory' && this._children) {
      for (const child of this._children) {
        const found = child.findById(id);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  /**
   * Sort children (directories first, then alphabetically)
   */
  sortChildren() {
    if (!this._children) return;
    this._children.sort((a, b) => {
      // Directories come first
      if (a._type !== b._type) {
        return a._type === 'directory' ? -1 : 1;
      }
      // Then sort alphabetically (case-insensitive)
      return a._name.toLowerCase().localeCompare(b._name.toLowerCase());
    });
  }

  /**
   * Get all visible nodes (for tree rendering)
   * @returns {FileNode[]} Array of visible nodes
   */
  getVisibleNodes() {
    const nodes = [];
    this._collectVisibleNodes(nodes);
    return nodes;
  }

  /**
   * Toggle expanded state
   * @returns {boolean} New expanded state
   */
  toggleExpanded() {
    if (this._type === 'directory') {
      this._expanded = !this._expanded;
    }
    return this._expanded;
  }

  /**
   * Clear all children
   */
  clearChildren() {
    if (this._children) {
      this._children = [];
      this._loaded = false;
    }
  }

  /**
   * Clone this node (shallow, without children)
   * @returns {FileNode} Cloned node
   */
  clone() {
    return new FileNode(this._name, this._path, this._type, {
      id: this._generateId(), // New ID
      parent: null,
      expanded: false,
      depth: this._depth,
      handle: this._handle,
    });
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Generate a unique ID
   * @returns {string} Unique ID
   */
  _generateId() {
    return `node_${++FileNode._idCounter}_${Date.now()}`;
  }

  /**
   * Recursively collect visible nodes
   * @param {FileNode[]} nodes - Array to collect into
   */
  _collectVisibleNodes(nodes) {
    nodes.push(this);
    if (this._type === 'directory' && this._expanded && this._children) {
      for (const child of this._children) {
        child._collectVisibleNodes(nodes);
      }
    }
  }

  // ============================================
  // Getters
  // ============================================

  get id() {
    return this._id;
  }

  get name() {
    return this._name;
  }

  set name(value) {
    this._name = value;
  }

  get path() {
    return this._path;
  }

  set path(value) {
    this._path = value;
  }

  get type() {
    return this._type;
  }

  get children() {
    return this._children;
  }

  get parent() {
    return this._parent;
  }

  get expanded() {
    return this._expanded;
  }

  set expanded(value) {
    if (this._type === 'directory') {
      this._expanded = value;
    }
  }

  get selected() {
    return this._selected;
  }

  set selected(value) {
    this._selected = value;
  }

  get depth() {
    return this._depth;
  }

  get handle() {
    return this._handle;
  }

  set handle(value) {
    this._handle = value;
  }

  get loaded() {
    return this._loaded;
  }

  set loaded(value) {
    this._loaded = value;
  }

  get isFile() {
    return this._type === 'file';
  }

  get isDirectory() {
    return this._type === 'directory';
  }

  /**
   * Get file extension (without dot)
   * @returns {string|null} File extension or null for directories
   */
  get extension() {
    if (this._type === 'directory') return null;
    const parts = this._name.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  }

  /**
   * Get detected language based on file extension
   * @returns {string} Language ID
   */
  get language() {
    const ext = this.extension;
    return FileNode.LANGUAGE_MAP[ext] || 'plaintext';
  }

  /**
   * Check if this node has children
   * @returns {boolean}
   */
  get hasChildren() {
    return this._children && this._children.length > 0;
  }

  /**
   * Get the root node
   * @returns {FileNode}
   */
  get root() {
    let node = this;
    while (node._parent) {
      node = node._parent;
    }
    return node;
  }
}
