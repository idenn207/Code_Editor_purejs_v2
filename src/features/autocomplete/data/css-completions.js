/**
 * @fileoverview CSS built-in completions data
 */

(function(CodeEditor) {
  'use strict';

  CodeEditor.CompletionData = CodeEditor.CompletionData || {};

  // ============================================
  // CSS Properties
  // ============================================

  var CSS_PROPERTIES = [
    // Layout
    'display', 'position', 'top', 'right', 'bottom', 'left', 'float', 'clear',
    'z-index', 'overflow', 'overflow-x', 'overflow-y', 'visibility',

    // Flexbox
    'flex', 'flex-direction', 'flex-wrap', 'flex-flow', 'flex-grow', 'flex-shrink',
    'flex-basis', 'justify-content', 'align-items', 'align-self', 'align-content',
    'order', 'gap', 'row-gap', 'column-gap',

    // Grid
    'grid', 'grid-template', 'grid-template-columns', 'grid-template-rows',
    'grid-template-areas', 'grid-column', 'grid-row', 'grid-area', 'grid-auto-columns',
    'grid-auto-rows', 'grid-auto-flow', 'place-items', 'place-content', 'place-self',

    // Box model
    'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'box-sizing',

    // Border
    'border', 'border-width', 'border-style', 'border-color', 'border-top',
    'border-right', 'border-bottom', 'border-left', 'border-radius', 'border-collapse',
    'outline', 'outline-width', 'outline-style', 'outline-color', 'outline-offset',

    // Background
    'background', 'background-color', 'background-image', 'background-repeat',
    'background-position', 'background-size', 'background-attachment',
    'background-clip', 'background-origin',

    // Typography
    'color', 'font', 'font-family', 'font-size', 'font-weight', 'font-style',
    'font-variant', 'line-height', 'letter-spacing', 'word-spacing', 'text-align',
    'text-decoration', 'text-transform', 'text-indent', 'text-shadow', 'text-overflow',
    'white-space', 'word-break', 'word-wrap', 'overflow-wrap',

    // List
    'list-style', 'list-style-type', 'list-style-position', 'list-style-image',

    // Table
    'table-layout', 'border-spacing', 'caption-side', 'empty-cells',

    // Transform & Animation
    'transform', 'transform-origin', 'transition', 'transition-property',
    'transition-duration', 'transition-timing-function', 'transition-delay',
    'animation', 'animation-name', 'animation-duration', 'animation-timing-function',
    'animation-delay', 'animation-iteration-count', 'animation-direction',
    'animation-fill-mode', 'animation-play-state',

    // Effects
    'opacity', 'box-shadow', 'filter', 'backdrop-filter', 'mix-blend-mode',

    // Misc
    'cursor', 'pointer-events', 'user-select', 'resize', 'content', 'quotes',
    'counter-reset', 'counter-increment',

    // Scroll
    'scroll-behavior', 'scroll-snap-type', 'scroll-snap-align', 'overscroll-behavior',

    // Aspect
    'aspect-ratio', 'object-fit', 'object-position',
  ];

  // ============================================
  // Property Values
  // ============================================

  var CSS_PROPERTY_VALUES = {
    display: [
      'none', 'block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid',
      'inline-grid', 'table', 'table-row', 'table-cell', 'contents', 'flow-root',
    ],
    position: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
    'flex-direction': ['row', 'row-reverse', 'column', 'column-reverse'],
    'flex-wrap': ['nowrap', 'wrap', 'wrap-reverse'],
    'justify-content': [
      'flex-start', 'flex-end', 'center', 'space-between', 'space-around',
      'space-evenly', 'start', 'end',
    ],
    'align-items': ['flex-start', 'flex-end', 'center', 'baseline', 'stretch', 'start', 'end'],
    'align-content': [
      'flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'stretch', 'start', 'end',
    ],
    'text-align': ['left', 'right', 'center', 'justify', 'start', 'end'],
    'text-decoration': ['none', 'underline', 'overline', 'line-through'],
    'text-transform': ['none', 'capitalize', 'uppercase', 'lowercase'],
    'font-weight': ['normal', 'bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
    'font-style': ['normal', 'italic', 'oblique'],
    'white-space': ['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line', 'break-spaces'],
    overflow: ['visible', 'hidden', 'scroll', 'auto', 'clip'],
    visibility: ['visible', 'hidden', 'collapse'],
    cursor: [
      'auto', 'default', 'none', 'pointer', 'grab', 'grabbing', 'text', 'crosshair',
      'move', 'not-allowed', 'wait', 'progress', 'help', 'zoom-in', 'zoom-out',
    ],
    'border-style': ['none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset'],
    'background-repeat': ['repeat', 'repeat-x', 'repeat-y', 'no-repeat', 'space', 'round'],
    'background-size': ['auto', 'cover', 'contain'],
    'background-position': ['top', 'right', 'bottom', 'left', 'center'],
    'background-attachment': ['scroll', 'fixed', 'local'],
    'object-fit': ['fill', 'contain', 'cover', 'none', 'scale-down'],
    'box-sizing': ['content-box', 'border-box'],
    float: ['none', 'left', 'right'],
    clear: ['none', 'left', 'right', 'both'],
    resize: ['none', 'both', 'horizontal', 'vertical'],
    'user-select': ['none', 'auto', 'text', 'all'],
    'pointer-events': ['none', 'auto'],
    'list-style-type': [
      'none', 'disc', 'circle', 'square', 'decimal', 'decimal-leading-zero',
      'lower-roman', 'upper-roman', 'lower-alpha', 'upper-alpha',
    ],
    'list-style-position': ['inside', 'outside'],
    'animation-direction': ['normal', 'reverse', 'alternate', 'alternate-reverse'],
    'animation-fill-mode': ['none', 'forwards', 'backwards', 'both'],
    'animation-play-state': ['running', 'paused'],
    'transition-timing-function': ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'step-start', 'step-end'],
    'scroll-behavior': ['auto', 'smooth'],
  };

  // ============================================
  // Common Values
  // ============================================

  var CSS_COMMON_VALUES = [
    'inherit', 'initial', 'unset', 'revert', 'auto', 'none', '0', '100%', '50%',
    'transparent', 'currentColor',
  ];

  // ============================================
  // CSS Colors
  // ============================================

  var CSS_COLORS = [
    'transparent', 'currentColor', 'black', 'white', 'red', 'green', 'blue',
    'yellow', 'orange', 'purple', 'pink', 'gray', 'grey', 'cyan', 'magenta',
    'lime', 'navy', 'teal', 'olive', 'maroon', 'silver', 'aqua', 'fuchsia',
  ];

  // ============================================
  // CSS Functions
  // ============================================

  var CSS_FUNCTIONS = [
    'rgb(', 'rgba(', 'hsl(', 'hsla(', 'url(', 'var(', 'calc(', 'min(', 'max(',
    'clamp(', 'linear-gradient(', 'radial-gradient(', 'conic-gradient(',
    'repeat(', 'minmax(', 'fit-content(', 'translate(', 'translateX(',
    'translateY(', 'scale(', 'scaleX(', 'scaleY(', 'rotate(', 'skew(', 'matrix(',
  ];

  // ============================================
  // Pseudo-classes
  // ============================================

  var CSS_PSEUDO_CLASSES = [
    ':hover', ':active', ':focus', ':focus-visible', ':focus-within', ':visited',
    ':link', ':target', ':first-child', ':last-child', ':only-child', ':nth-child(',
    ':nth-last-child(', ':first-of-type', ':last-of-type', ':only-of-type',
    ':nth-of-type(', ':nth-last-of-type(', ':not(', ':is(', ':where(', ':has(',
    ':empty', ':enabled', ':disabled', ':checked', ':required', ':optional',
    ':valid', ':invalid', ':placeholder-shown', ':read-only', ':read-write', ':root',
  ];

  // ============================================
  // Pseudo-elements
  // ============================================

  var CSS_PSEUDO_ELEMENTS = [
    '::before', '::after', '::first-line', '::first-letter', '::selection',
    '::marker', '::placeholder', '::backdrop', '::file-selector-button',
  ];

  // ============================================
  // At-rules
  // ============================================

  var CSS_AT_RULES = [
    '@media', '@import', '@font-face', '@keyframes', '@supports', '@page',
    '@layer', '@container', '@property', '@charset', '@namespace',
  ];

  // ============================================
  // Units
  // ============================================

  var CSS_UNITS = [
    'px', 'em', 'rem', '%', 'vh', 'vw', 'vmin', 'vmax', 'ch', 'ex', 'pt', 'pc',
    'cm', 'mm', 'in', 'deg', 'rad', 'turn', 'ms', 's', 'fr',
  ];

  // ============================================
  // Export to Namespace
  // ============================================

  CodeEditor.CompletionData.CSS = {
    properties: CSS_PROPERTIES,
    propertyValues: CSS_PROPERTY_VALUES,
    commonValues: CSS_COMMON_VALUES,
    colors: CSS_COLORS,
    functions: CSS_FUNCTIONS,
    pseudoClasses: CSS_PSEUDO_CLASSES,
    pseudoElements: CSS_PSEUDO_ELEMENTS,
    atRules: CSS_AT_RULES,
    units: CSS_UNITS,
  };

})(window.CodeEditor = window.CodeEditor || {});
