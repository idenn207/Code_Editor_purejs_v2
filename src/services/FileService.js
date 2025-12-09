/**
 * FileService - File operations service using File System Access API
 *
 * Handles file and directory operations including:
 * - Opening folders via File System Access API
 * - Reading and writing files
 * - Building file tree structure
 * - File content caching
 */

import { FileNode } from '../model/FileNode.js';

export class FileService {
  // ============================================
  // Instance Members
  // ============================================

  _files = new Map(); // path -> { content, handle, node }
  _directoryHandle = null; // Root directory handle
  _listeners = new Map();

  // ============================================
  // Constructor
  // ============================================

  constructor() {
    this._hasFileSystemAccess = 'showDirectoryPicker' in window;
  }

  // ============================================
  // Public Methods
  // ============================================

  /**
   * Check if File System Access API is supported
   * @returns {boolean}
   */
  get isSupported() {
    return this._hasFileSystemAccess;
  }

  /**
   * Open a folder using File System Access API
   * @returns {Promise<FileNode|null>} Root node or null if cancelled
   */
  async openFolder() {
    if (!this._hasFileSystemAccess) {
      throw new Error('File System Access API not supported in this browser');
    }

    try {
      this._directoryHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
      });

      // Clear previous files cache
      this._files.clear();

      // Build file tree from directory handle
      const rootNode = await this._buildFileTree(this._directoryHandle, '', 0);
      rootNode.expanded = true; // Root starts expanded

      this._emit('folderOpened', { root: rootNode, handle: this._directoryHandle });
      return rootNode;
    } catch (err) {
      if (err.name === 'AbortError') {
        // User cancelled the picker
        return null;
      }
      throw err;
    }
  }

  /**
   * Load directory contents (for lazy loading on expand)
   * @param {FileNode} node - Directory node
   */
  async loadDirectoryContents(node) {
    if (node.type !== 'directory' || !node.handle) return;

    node.clearChildren();

    try {
      for await (const entry of node.handle.values()) {
        const childPath = `${node.path}/${entry.name}`;
        const childNode = new FileNode(
          entry.name,
          childPath,
          entry.kind === 'directory' ? 'directory' : 'file',
          {
            depth: node.depth + 1,
            parent: node,
          }
        );
        childNode.handle = entry;

        node.addChild(childNode);
      }

      node.sortChildren();
      node.loaded = true;

      this._emit('directoryLoaded', { node });
    } catch (err) {
      console.error('Failed to load directory contents:', err);
      throw err;
    }
  }

  /**
   * Read file content
   * @param {FileNode} node - File node
   * @returns {Promise<Object>} File data { content, handle, node }
   */
  async readFile(node) {
    if (node.type !== 'file') {
      throw new Error('Cannot read a directory');
    }

    // Check cache
    if (this._files.has(node.path)) {
      return this._files.get(node.path);
    }

    if (!node.handle) {
      throw new Error('File node has no handle');
    }

    try {
      const file = await node.handle.getFile();
      const content = await file.text();

      const fileData = {
        content,
        handle: node.handle,
        node,
      };

      this._files.set(node.path, fileData);
      this._emit('fileOpened', { path: node.path, content, node });

      return fileData;
    } catch (err) {
      console.error('Failed to read file:', err);
      throw err;
    }
  }

  /**
   * Save file content
   * @param {string} path - File path
   * @returns {Promise<void>}
   */
  async saveFile(path) {
    const fileData = this._files.get(path);
    if (!fileData) {
      throw new Error('File not found in cache');
    }

    if (!fileData.handle) {
      throw new Error('File has no handle');
    }

    try {
      const writable = await fileData.handle.createWritable();
      await writable.write(fileData.content);
      await writable.close();

      this._emit('fileSaved', { path });
    } catch (err) {
      console.error('Failed to save file:', err);
      throw err;
    }
  }

  /**
   * Update file content in cache
   * @param {string} path - File path
   * @param {string} content - New content
   */
  updateFileContent(path, content) {
    const fileData = this._files.get(path);
    if (fileData) {
      fileData.content = content;
      this._emit('fileChanged', { path, content });
    }
  }

  /**
   * Get cached file data
   * @param {string} path - File path
   * @returns {Object|null} File data or null
   */
  getFile(path) {
    return this._files.get(path) || null;
  }

  /**
   * Check if file is cached
   * @param {string} path - File path
   * @returns {boolean}
   */
  hasFile(path) {
    return this._files.has(path);
  }

  /**
   * Create a virtual file (not backed by File System)
   * @param {string} path - Virtual path
   * @param {string} content - Initial content
   * @returns {Object} File data
   */
  createVirtualFile(path, content = '') {
    const fileData = {
      content,
      handle: null,
      node: null,
      isVirtual: true,
    };

    this._files.set(path, fileData);
    return fileData;
  }

  /**
   * Close a file (remove from cache)
   * @param {string} path - File path
   */
  closeFile(path) {
    this._files.delete(path);
    this._emit('fileClosed', { path });
  }

  /**
   * Get the root directory handle
   * @returns {FileSystemDirectoryHandle|null}
   */
  getDirectoryHandle() {
    return this._directoryHandle;
  }

  /**
   * Clear all cached files
   */
  clearCache() {
    this._files.clear();
  }

  // ============================================
  // Event System
  // ============================================

  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    return () => this._listeners.get(event).delete(callback);
  }

  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  _emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in FileService event listener for "${event}":`, err);
        }
      });
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Build file tree recursively from directory handle
   * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
   * @param {string} parentPath - Parent path
   * @param {number} depth - Current depth
   * @returns {Promise<FileNode>} Root node
   */
  async _buildFileTree(dirHandle, parentPath, depth) {
    const path = parentPath ? `${parentPath}/${dirHandle.name}` : dirHandle.name;
    const node = new FileNode(dirHandle.name, path, 'directory', { depth });
    node.handle = dirHandle;

    try {
      for await (const entry of dirHandle.values()) {
        const childPath = `${path}/${entry.name}`;

        if (entry.kind === 'file') {
          const fileNode = new FileNode(entry.name, childPath, 'file', {
            depth: depth + 1,
            parent: node,
          });
          fileNode.handle = entry;
          node.addChild(fileNode);
        } else if (entry.kind === 'directory') {
          // For directories, just create the node without loading contents
          // Contents will be loaded on expand (lazy loading)
          const dirNode = new FileNode(entry.name, childPath, 'directory', {
            depth: depth + 1,
            parent: node,
          });
          dirNode.handle = entry;
          dirNode.loaded = false;
          node.addChild(dirNode);
        }
      }

      node.sortChildren();
      node.loaded = true;
    } catch (err) {
      console.error('Failed to read directory:', err);
    }

    return node;
  }
}
