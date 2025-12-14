/**
 * @fileoverview HTML built-in completions data
 */

(function(CodeEditor) {
  'use strict';

  CodeEditor.CompletionData = CodeEditor.CompletionData || {};

  // ============================================
  // HTML Tags
  // ============================================

  var HTML_TAGS = [
    // Document structure
    'html', 'head', 'body', 'title', 'meta', 'link', 'script', 'style', 'noscript',

    // Sections
    'header', 'footer', 'main', 'nav', 'section', 'article', 'aside',

    // Content grouping
    'div', 'span', 'p', 'br', 'hr', 'pre', 'blockquote',

    // Text content
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',

    // Inline text
    'a', 'strong', 'em', 'b', 'i', 'u', 's', 'small', 'mark', 'code', 'kbd', 'sub', 'sup',

    // Lists
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',

    // Tables
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',

    // Forms
    'form', 'input', 'textarea', 'button', 'select', 'option', 'optgroup',
    'label', 'fieldset', 'legend', 'datalist', 'output',

    // Media
    'img', 'audio', 'video', 'source', 'track', 'canvas', 'svg', 'picture', 'figure', 'figcaption',

    // Embedded
    'iframe', 'embed', 'object',

    // Interactive
    'details', 'summary', 'dialog',

    // Other
    'template', 'slot',
  ];

  // ============================================
  // Global Attributes (apply to all elements)
  // ============================================

  var HTML_GLOBAL_ATTRIBUTES = [
    'accesskey', 'class', 'contenteditable', 'data-', 'dir', 'draggable',
    'hidden', 'id', 'lang', 'role', 'spellcheck', 'style', 'tabindex', 'title', 'translate',
  ];

  // ============================================
  // Event Attributes
  // ============================================

  var HTML_EVENT_ATTRIBUTES = [
    'onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover', 'onmouseout',
    'onmousemove', 'onkeydown', 'onkeyup', 'onkeypress', 'onfocus', 'onblur',
    'onchange', 'oninput', 'onsubmit', 'onreset', 'onload', 'onerror', 'onscroll',
  ];

  // ============================================
  // Tag-Specific Attributes
  // ============================================

  var HTML_TAG_ATTRIBUTES = {
    a: ['href', 'target', 'rel', 'download', 'hreflang', 'type'],
    img: ['src', 'alt', 'width', 'height', 'loading', 'srcset', 'sizes', 'crossorigin'],
    input: [
      'type', 'name', 'value', 'placeholder', 'required', 'disabled', 'readonly',
      'checked', 'min', 'max', 'minlength', 'maxlength', 'pattern', 'step',
      'autocomplete', 'autofocus', 'multiple', 'accept',
    ],
    button: ['type', 'name', 'value', 'disabled', 'autofocus', 'form'],
    form: ['action', 'method', 'enctype', 'target', 'autocomplete', 'novalidate'],
    textarea: [
      'name', 'placeholder', 'required', 'disabled', 'readonly', 'rows', 'cols',
      'minlength', 'maxlength', 'wrap', 'autofocus',
    ],
    select: ['name', 'required', 'disabled', 'multiple', 'size', 'autofocus'],
    option: ['value', 'selected', 'disabled', 'label'],
    label: ['for'],
    link: ['href', 'rel', 'type', 'media', 'sizes', 'crossorigin'],
    script: ['src', 'type', 'async', 'defer', 'crossorigin', 'integrity', 'nomodule'],
    style: ['type', 'media'],
    meta: ['name', 'content', 'charset', 'http-equiv'],
    iframe: ['src', 'srcdoc', 'name', 'width', 'height', 'sandbox', 'allow', 'loading', 'referrerpolicy'],
    video: ['src', 'poster', 'width', 'height', 'autoplay', 'controls', 'loop', 'muted', 'preload', 'playsinline'],
    audio: ['src', 'autoplay', 'controls', 'loop', 'muted', 'preload'],
    source: ['src', 'type', 'srcset', 'sizes', 'media'],
    canvas: ['width', 'height'],
    table: ['border'],
    td: ['colspan', 'rowspan', 'headers'],
    th: ['colspan', 'rowspan', 'headers', 'scope'],
    col: ['span'],
    colgroup: ['span'],
  };

  // ============================================
  // Common Attribute Values
  // ============================================

  var HTML_ATTRIBUTE_VALUES = {
    target: ['_self', '_blank', '_parent', '_top'],
    rel: ['noopener', 'noreferrer', 'nofollow', 'external', 'stylesheet', 'icon', 'preload'],
    type: {
      input: [
        'text', 'password', 'email', 'number', 'tel', 'url', 'search', 'date',
        'time', 'datetime-local', 'month', 'week', 'color', 'file', 'checkbox',
        'radio', 'range', 'hidden', 'submit', 'reset', 'button',
      ],
      button: ['submit', 'reset', 'button'],
      script: ['text/javascript', 'module'],
      style: ['text/css'],
    },
    method: ['get', 'post'],
    enctype: ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'],
    loading: ['lazy', 'eager'],
    autocomplete: ['on', 'off'],
    dir: ['ltr', 'rtl', 'auto'],
    crossorigin: ['anonymous', 'use-credentials'],
  };

  // ============================================
  // Export to Namespace
  // ============================================

  CodeEditor.CompletionData.HTML = {
    tags: HTML_TAGS,
    globalAttributes: HTML_GLOBAL_ATTRIBUTES,
    eventAttributes: HTML_EVENT_ATTRIBUTES,
    tagAttributes: HTML_TAG_ATTRIBUTES,
    attributeValues: HTML_ATTRIBUTE_VALUES,
  };

})(window.CodeEditor = window.CodeEditor || {});
