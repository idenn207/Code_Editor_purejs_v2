/**
 * IDE Application Entry Point
 *
 * Bootstraps the IDE and sets up global event handlers.
 */

import { IDE } from './ide/IDE.js';

// Check browser compatibility
function checkCompatibility() {
  const hasFileSystemAccess = 'showDirectoryPicker' in window;
  const hasEditContext = 'EditContext' in window;

  return {
    fileSystemAccess: hasFileSystemAccess,
    editContext: hasEditContext,
    isSupported: hasFileSystemAccess, // File System Access is required for IDE
  };
}

// Show compatibility warning
function showCompatWarning() {
  const warning = document.getElementById('compat-warning');
  const loading = document.getElementById('loading-screen');
  if (warning) warning.classList.add('visible');
  if (loading) loading.classList.add('hidden');
}

// Hide loading screen
function hideLoading() {
  const loading = document.getElementById('loading-screen');
  if (loading) {
    loading.classList.add('hidden');
  }
}

// Initialize IDE
function initIDE() {
  const container = document.getElementById('ide-root');
  if (!container) {
    console.error('IDE container not found');
    return null;
  }

  // Create IDE instance
  const ide = new IDE(container, {
    sidebarWidth: 250,
    showActivityBar: true,
    showSidebar: true,
    showStatusBar: true,
    theme: 'dark',
  });

  // Set up global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+E: Focus explorer
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      ide.setActiveView('explorer');
    }

    // Ctrl+Shift+F: Focus search (placeholder)
    if (e.ctrlKey && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      ide.setActiveView('search');
    }

    // Ctrl+` : Toggle sidebar (alternative)
    if (e.ctrlKey && e.key === '`') {
      e.preventDefault();
      ide.toggleSidebar();
    }
  });

  // Log IDE info
  console.log('%c Code Editor IDE ', 'background: #007acc; color: white; font-size: 14px; padding: 4px 8px; border-radius: 4px;');
  console.log('IDE instance available as window.ide');
  console.log('');
  console.log('Keyboard shortcuts:');
  console.log('  Ctrl+B          - Toggle sidebar');
  console.log('  Ctrl+S          - Save file');
  console.log('  Ctrl+Shift+E    - Focus Explorer');
  console.log('  Ctrl+Shift+F    - Focus Search');
  console.log('');
  console.log('Click "Open Folder" in the sidebar or welcome screen to get started.');

  return ide;
}

// Main entry point
async function main() {
  try {
    const compat = checkCompatibility();

    // Check if File System Access API is supported
    if (!compat.fileSystemAccess) {
      console.warn('File System Access API not supported. Showing compatibility warning.');
      showCompatWarning();
      return;
    }

    // Initialize IDE
    const ide = initIDE();

    if (ide) {
      // Hide loading screen
      hideLoading();

      // Expose IDE instance globally for debugging
      window.ide = ide;

      // Also expose services for debugging
      window.fileService = ide.getFileService();
      window.workspaceService = ide.getWorkspaceService();
    }
  } catch (err) {
    console.error('Failed to initialize IDE:', err);

    // Show error in loading screen
    const loading = document.getElementById('loading-screen');
    if (loading) {
      loading.innerHTML = `
        <div style="color: #f48771; font-size: 16px; margin-bottom: 16px;">
          Failed to initialize IDE
        </div>
        <div style="color: #858585; font-size: 14px;">
          ${err.message}
        </div>
        <div style="margin-top: 24px;">
          <a href="index.html" style="color: #3794ff;">
            Use standalone editor instead
          </a>
        </div>
      `;
    }
  }
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
