/**
 * @fileoverview Hover tooltip UI component
 * @module features/HoverTooltip
 *
 * Displays symbol information when user hovers over code.
 * Handles positioning, styling, and visibility management.
 */

// ============================================
// Constants
// ============================================

const HOVER_DELAY_MS = 300; // Delay before showing tooltip
const HOVER_HIDE_DELAY_MS = 100; // Delay before hiding (allows moving to tooltip)
const TOOLTIP_OFFSET_Y = 5; // Pixels below the hovered line
const TOOLTIP_MAX_WIDTH = 500;
const TOOLTIP_MIN_WIDTH = 200;

// ============================================
// HoverTooltip Class
// ============================================

/**
 * UI component for displaying hover information
 */
export class HoverTooltip {
  // ----------------------------------------
  // Instance Properties
  // ----------------------------------------
  _editor = null;
  _container = null;
  _visible = false;
  _disposed = false;

  // Timers
  _showTimer = null;
  _hideTimer = null;

  // Current state
  _currentOffset = -1;
  _currentInfo = null;

  // Bound handlers (for removal)
  _boundOnMouseMove = null;
  _boundOnMouseLeave = null;
  _boundOnScroll = null;
  _boundOnDocumentChange = null;
  _boundOnTooltipMouseEnter = null;
  _boundOnTooltipMouseLeave = null;

  // ----------------------------------------
  // Constructor
  // ----------------------------------------

  /**
   * @param {Editor} editor - Editor instance
   */
  constructor(editor) {
    this._editor = editor;
    this._initialize();
  }

  // ----------------------------------------
  // Initialization
  // ----------------------------------------

  _initialize() {
    this._createDOM();
    this._bindEvents();
  }

  _createDOM() {
    // Create tooltip container
    this._container = document.createElement('div');
    this._container.className = 'ec-hover-tooltip';
    this._container.style.display = 'none';

    // Add to editor content element
    this._editor.view.contentElement.appendChild(this._container);
  }

  _bindEvents() {
    // Create bound handlers
    this._boundOnMouseMove = this._onMouseMove.bind(this);
    this._boundOnMouseLeave = this._onMouseLeave.bind(this);
    this._boundOnScroll = this._onScroll.bind(this);
    this._boundOnDocumentChange = this._onDocumentChange.bind(this);
    this._boundOnTooltipMouseEnter = this._onTooltipMouseEnter.bind(this);
    this._boundOnTooltipMouseLeave = this._onTooltipMouseLeave.bind(this);

    // Content area events
    const contentEl = this._editor.view.contentElement;
    contentEl.addEventListener('mousemove', this._boundOnMouseMove);
    contentEl.addEventListener('mouseleave', this._boundOnMouseLeave);

    // Tooltip events (allow hovering on tooltip)
    this._container.addEventListener('mouseenter', this._boundOnTooltipMouseEnter);
    this._container.addEventListener('mouseleave', this._boundOnTooltipMouseLeave);

    // Scroll events
    const wrapper = contentEl.parentElement;
    if (wrapper) {
      wrapper.addEventListener('scroll', this._boundOnScroll);
    }

    // Document change events
    this._editor.document.on('change', this._boundOnDocumentChange);

    // Selection change hides tooltip
    this._editor.on('selectionChange', () => {
      this.hide();
    });
  }

  // ----------------------------------------
  // Event Handlers
  // ----------------------------------------

  _onMouseMove(event) {
    // Cancel any pending hide
    this._cancelHideTimer();

    // Don't show hover while selecting
    const { start, end } = this._editor.getSelection();
    if (start !== end) {
      this.hide();
      return;
    }

    // Get position from mouse coordinates
    const position = this._editor.view.getPositionFromPoint(event.clientX, event.clientY);
    if (!position) {
      this._scheduleHide();
      return;
    }

    // Convert to offset
    const offset = this._editor.document.positionToOffset(position.line, position.column);

    // Check if we're on the same word
    if (this._visible && this._isSameWord(offset)) {
      return;
    }

    // Schedule showing hover for new position
    this._scheduleShow(offset, event.clientX, event.clientY);
  }

  _onMouseLeave(event) {
    // Schedule hide (with delay to allow moving to tooltip)
    this._scheduleHide();
  }

  _onScroll() {
    this.hide();
  }

  _onDocumentChange() {
    this.hide();
  }

  _onTooltipMouseEnter() {
    // Cancel hide when mouse enters tooltip
    this._cancelHideTimer();
  }

  _onTooltipMouseLeave() {
    // Hide when mouse leaves tooltip
    this._scheduleHide();
  }

  // ----------------------------------------
  // Timer Management
  // ----------------------------------------

  _scheduleShow(offset, clientX, clientY) {
    // Cancel any pending show
    this._cancelShowTimer();

    this._showTimer = setTimeout(() => {
      this._showTimer = null;
      this._showHoverAt(offset, clientX, clientY);
    }, HOVER_DELAY_MS);
  }

  _cancelShowTimer() {
    if (this._showTimer) {
      clearTimeout(this._showTimer);
      this._showTimer = null;
    }
  }

  _scheduleHide() {
    this._cancelShowTimer();
    this._cancelHideTimer();

    this._hideTimer = setTimeout(() => {
      this._hideTimer = null;
      this.hide();
    }, HOVER_HIDE_DELAY_MS);
  }

  _cancelHideTimer() {
    if (this._hideTimer) {
      clearTimeout(this._hideTimer);
      this._hideTimer = null;
    }
  }

  // ----------------------------------------
  // Show/Hide Logic
  // ----------------------------------------

  _showHoverAt(offset, clientX, clientY) {
    // Get hover info from language service
    const hoverInfo = this._editor.languageService?.getHoverInfo(offset);

    if (!hoverInfo || hoverInfo.contents.length === 0) {
      this.hide();
      return;
    }

    // Store current state
    this._currentOffset = offset;
    this._currentInfo = hoverInfo;

    // Render content
    this._renderContent(hoverInfo);

    // Position tooltip
    this._positionTooltip(hoverInfo.range, clientY);

    // Show
    this._container.style.display = 'block';
    this._visible = true;

    // Emit event
    this._editor.emit('hoverShow', {
      offset,
      range: hoverInfo.range,
    });
  }

  /**
   * Check if offset is within the same word as current hover
   */
  _isSameWord(offset) {
    if (!this._currentInfo || !this._currentInfo.range) {
      return false;
    }

    const { start, end } = this._currentInfo.range;
    return offset >= start && offset <= end;
  }

  /**
   * Hide the tooltip
   */
  hide() {
    if (!this._visible) {
      return;
    }

    this._cancelShowTimer();
    this._cancelHideTimer();

    this._container.style.display = 'none';
    this._visible = false;
    this._currentOffset = -1;
    this._currentInfo = null;

    // Emit event
    this._editor.emit('hoverHide', {});
  }

  // ----------------------------------------
  // Rendering
  // ----------------------------------------

  _renderContent(hoverInfo) {
    this._container.innerHTML = '';

    for (const content of hoverInfo.contents) {
      const el = document.createElement('div');

      switch (content.kind) {
        case 'code':
          el.className = 'ec-hover-code';
          el.textContent = content.value;
          break;

        case 'markdown':
          // Simple markdown support (just display as text for now)
          el.className = 'ec-hover-markdown';
          el.textContent = content.value;
          break;

        case 'text':
        default:
          el.className = 'ec-hover-text';
          el.textContent = content.value;
          break;
      }

      this._container.appendChild(el);
    }
  }

  _positionTooltip(range, mouseY) {
    const contentRect = this._editor.view.contentElement.getBoundingClientRect();

    // Get character rect for the start of the word
    const charRect = this._editor.view.getCharacterRect(range.start);
    if (!charRect) {
      return;
    }

    // Calculate position relative to content element
    let left = charRect.left - contentRect.left;
    let top = charRect.bottom - contentRect.top + TOOLTIP_OFFSET_Y;

    // Get tooltip dimensions
    this._container.style.display = 'block';
    this._container.style.visibility = 'hidden';
    const tooltipRect = this._container.getBoundingClientRect();
    this._container.style.visibility = 'visible';

    // Adjust horizontal position if overflowing
    const maxLeft = contentRect.width - tooltipRect.width - 10;
    if (left > maxLeft) {
      left = Math.max(10, maxLeft);
    }
    if (left < 10) {
      left = 10;
    }

    // Flip above if not enough space below
    const spaceBelow = window.innerHeight - charRect.bottom;
    const spaceAbove = charRect.top;

    if (spaceBelow < tooltipRect.height + 20 && spaceAbove > tooltipRect.height + 20) {
      // Position above the word
      top = charRect.top - contentRect.top - tooltipRect.height - TOOLTIP_OFFSET_Y;
    }

    // Apply position
    this._container.style.left = `${left}px`;
    this._container.style.top = `${top}px`;
  }

  // ----------------------------------------
  // Public Methods
  // ----------------------------------------

  /**
   * Check if tooltip is currently visible
   * @returns {boolean}
   */
  isVisible() {
    return this._visible;
  }

  /**
   * Force show hover at current cursor position
   */
  trigger() {
    const { end } = this._editor.getSelection();
    const charRect = this._editor.view.getCharacterRect(end);

    if (charRect) {
      this._showHoverAt(end, charRect.left, charRect.top);
    }
  }

  // ----------------------------------------
  // Cleanup
  // ----------------------------------------

  dispose() {
    if (this._disposed) {
      return;
    }

    this._cancelShowTimer();
    this._cancelHideTimer();

    // Remove event listeners
    const contentEl = this._editor.view?.contentElement;
    if (contentEl) {
      contentEl.removeEventListener('mousemove', this._boundOnMouseMove);
      contentEl.removeEventListener('mouseleave', this._boundOnMouseLeave);

      const wrapper = contentEl.parentElement;
      if (wrapper) {
        wrapper.removeEventListener('scroll', this._boundOnScroll);
      }
    }

    // Remove DOM element
    this._container?.remove();
    this._container = null;

    this._disposed = true;
  }
}
