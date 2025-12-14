/**
 * @fileoverview JavaScript built-in completions data
 */

(function(CodeEditor) {
  'use strict';

  CodeEditor.CompletionData = CodeEditor.CompletionData || {};

  // ============================================
  // Keywords
  // ============================================

  var JS_KEYWORDS = [
    'async',
    'await',
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'export',
    'extends',
    'false',
    'finally',
    'for',
    'function',
    'if',
    'import',
    'in',
    'instanceof',
    'let',
    'new',
    'null',
    'return',
    'static',
    'super',
    'switch',
    'this',
    'throw',
    'true',
    'try',
    'typeof',
    'undefined',
    'var',
    'void',
    'while',
    'yield',
  ];

  // ============================================
  // Global Objects
  // ============================================

  var JS_GLOBALS = [
    'Array',
    'Boolean',
    'console',
    'Date',
    'document',
    'Error',
    'Function',
    'JSON',
    'localStorage',
    'Map',
    'Math',
    'Number',
    'Object',
    'Promise',
    'RegExp',
    'sessionStorage',
    'Set',
    'String',
    'Symbol',
    'WeakMap',
    'WeakSet',
    'window',
  ];

  // ============================================
  // Global Functions
  // ============================================

  var JS_GLOBAL_FUNCTIONS = [
    'alert',
    'clearInterval',
    'clearTimeout',
    'confirm',
    'decodeURI',
    'decodeURIComponent',
    'encodeURI',
    'encodeURIComponent',
    'eval',
    'fetch',
    'isFinite',
    'isNaN',
    'parseFloat',
    'parseInt',
    'prompt',
    'requestAnimationFrame',
    'setInterval',
    'setTimeout',
  ];

  // ============================================
  // Object Methods (after dot)
  // ============================================

  var JS_OBJECT_MEMBERS = {
    console: [
      'assert', 'clear', 'count', 'countReset', 'debug', 'dir', 'dirxml',
      'error', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
      'profile', 'profileEnd', 'table', 'time', 'timeEnd', 'timeLog',
      'timeStamp', 'trace', 'warn',
    ],

    window: [
      'addEventListener', 'alert', 'atob', 'blur', 'btoa', 'cancelAnimationFrame',
      'cancelIdleCallback', 'clearInterval', 'clearTimeout', 'close', 'confirm',
      'createImageBitmap', 'customElements', 'devicePixelRatio', 'dispatchEvent',
      'document', 'fetch', 'focus', 'frameElement', 'frames', 'getComputedStyle',
      'getSelection', 'history', 'indexedDB', 'innerHeight', 'innerWidth',
      'isSecureContext', 'length', 'localStorage', 'location', 'locationbar',
      'matchMedia', 'menubar', 'moveBy', 'moveTo', 'name', 'navigator',
      'open', 'opener', 'outerHeight', 'outerWidth', 'pageXOffset', 'pageYOffset',
      'parent', 'performance', 'personalbar', 'postMessage', 'print', 'prompt',
      'queueMicrotask', 'removeEventListener', 'requestAnimationFrame',
      'requestIdleCallback', 'resizeBy', 'resizeTo', 'screen', 'screenLeft',
      'screenTop', 'screenX', 'screenY', 'scroll', 'scrollbars', 'scrollBy',
      'scrollTo', 'scrollX', 'scrollY', 'self', 'sessionStorage', 'setInterval',
      'setTimeout', 'speechSynthesis', 'status', 'statusbar', 'stop',
      'structuredClone', 'toolbar', 'top', 'visualViewport',
    ],

    document: [
      'activeElement', 'addEventListener', 'adoptNode', 'adoptedStyleSheets',
      'body', 'characterSet', 'childElementCount', 'children', 'close',
      'compatMode', 'contentType', 'cookie', 'createAttribute', 'createComment',
      'createDocumentFragment', 'createElement', 'createElementNS', 'createEvent',
      'createNodeIterator', 'createRange', 'createTextNode', 'createTreeWalker',
      'currentScript', 'defaultView', 'designMode', 'dir', 'dispatchEvent',
      'doctype', 'documentElement', 'documentURI', 'domain', 'elementFromPoint',
      'elementsFromPoint', 'embeds', 'evaluate', 'execCommand', 'exitFullscreen',
      'fonts', 'forms', 'fullscreen', 'fullscreenElement', 'fullscreenEnabled',
      'getAnimations', 'getElementById', 'getElementsByClassName',
      'getElementsByName', 'getElementsByTagName', 'getSelection', 'hasFocus',
      'head', 'hidden', 'images', 'implementation', 'importNode', 'links',
      'location', 'nodeName', 'nodeType', 'open', 'ownerDocument',
      'querySelector', 'querySelectorAll', 'readyState', 'referrer',
      'removeEventListener', 'scripts', 'scrollingElement', 'styleSheets',
      'textContent', 'title', 'URL', 'visibilityState', 'write', 'writeln',
    ],

    Math: [
      'abs', 'acos', 'acosh', 'asin', 'asinh', 'atan', 'atan2', 'atanh',
      'cbrt', 'ceil', 'clz32', 'cos', 'cosh', 'E', 'exp', 'expm1', 'floor',
      'fround', 'hypot', 'imul', 'LN2', 'LN10', 'log', 'log1p', 'log2',
      'log10', 'LOG2E', 'LOG10E', 'max', 'min', 'PI', 'pow', 'random',
      'round', 'sign', 'sin', 'sinh', 'sqrt', 'SQRT1_2', 'SQRT2', 'tan',
      'tanh', 'trunc',
    ],

    JSON: ['parse', 'stringify'],

    Object: [
      'assign', 'create', 'defineProperties', 'defineProperty', 'entries',
      'freeze', 'fromEntries', 'getOwnPropertyDescriptor', 'getOwnPropertyDescriptors',
      'getOwnPropertyNames', 'getOwnPropertySymbols', 'getPrototypeOf', 'hasOwn',
      'is', 'isExtensible', 'isFrozen', 'isSealed', 'keys', 'preventExtensions',
      'prototype', 'seal', 'setPrototypeOf', 'values',
    ],

    Array: ['from', 'isArray', 'of', 'prototype'],

    Promise: ['all', 'allSettled', 'any', 'race', 'reject', 'resolve', 'prototype'],

    String: ['fromCharCode', 'fromCodePoint', 'prototype', 'raw'],

    Number: [
      'EPSILON', 'isFinite', 'isInteger', 'isNaN', 'isSafeInteger',
      'MAX_SAFE_INTEGER', 'MAX_VALUE', 'MIN_SAFE_INTEGER', 'MIN_VALUE',
      'NaN', 'NEGATIVE_INFINITY', 'parseFloat', 'parseInt', 'POSITIVE_INFINITY',
      'prototype',
    ],

    localStorage: ['clear', 'getItem', 'key', 'length', 'removeItem', 'setItem'],

    sessionStorage: ['clear', 'getItem', 'key', 'length', 'removeItem', 'setItem'],

    Date: ['now', 'parse', 'prototype', 'UTC'],

    RegExp: ['prototype', '$1', '$2', '$3', '$4', '$5', '$6', '$7', '$8', '$9',
      'input', 'lastMatch', 'lastParen', 'leftContext', 'rightContext'],
  };

  // ============================================
  // HTMLElement Members (for DOM elements)
  // ============================================

  var JS_HTML_ELEMENT_MEMBERS = [
    'accessKey', 'addEventListener', 'after', 'animate', 'append', 'appendChild',
    'attachShadow', 'attributes', 'before', 'blur', 'childElementCount',
    'childNodes', 'children', 'classList', 'className', 'click', 'clientHeight',
    'clientLeft', 'clientTop', 'clientWidth', 'cloneNode', 'closest', 'contains',
    'contentEditable', 'dataset', 'dir', 'dispatchEvent', 'draggable',
    'firstChild', 'firstElementChild', 'focus', 'getAttribute', 'getAttributeNames',
    'getBoundingClientRect', 'getClientRects', 'getElementsByClassName',
    'getElementsByTagName', 'getRootNode', 'hasAttribute', 'hasAttributes',
    'hasChildNodes', 'hidden', 'id', 'innerHTML', 'innerText', 'insertAdjacentElement',
    'insertAdjacentHTML', 'insertAdjacentText', 'insertBefore', 'isConnected',
    'isContentEditable', 'lang', 'lastChild', 'lastElementChild', 'matches',
    'nextElementSibling', 'nextSibling', 'nodeName', 'nodeType', 'nodeValue',
    'normalize', 'offsetHeight', 'offsetLeft', 'offsetParent', 'offsetTop',
    'offsetWidth', 'outerHTML', 'outerText', 'ownerDocument', 'parentElement',
    'parentNode', 'prepend', 'previousElementSibling', 'previousSibling',
    'querySelector', 'querySelectorAll', 'remove', 'removeAttribute',
    'removeChild', 'removeEventListener', 'replaceChild', 'replaceChildren',
    'replaceWith', 'scrollHeight', 'scrollIntoView', 'scrollLeft', 'scrollTop',
    'scrollWidth', 'setAttribute', 'shadowRoot', 'slot', 'spellcheck', 'style',
    'tabIndex', 'tagName', 'textContent', 'title', 'toggleAttribute',
  ];

  // ============================================
  // Common Instance Methods
  // ============================================

  var JS_ARRAY_METHODS = [
    'at', 'concat', 'copyWithin', 'entries', 'every', 'fill', 'filter',
    'find', 'findIndex', 'findLast', 'findLastIndex', 'flat', 'flatMap',
    'forEach', 'includes', 'indexOf', 'join', 'keys', 'lastIndexOf', 'length',
    'map', 'pop', 'push', 'reduce', 'reduceRight', 'reverse', 'shift', 'slice',
    'some', 'sort', 'splice', 'toLocaleString', 'toReversed', 'toSorted',
    'toSpliced', 'toString', 'unshift', 'values', 'with',
  ];

  var JS_STRING_METHODS = [
    'at', 'charAt', 'charCodeAt', 'codePointAt', 'concat', 'endsWith',
    'includes', 'indexOf', 'isWellFormed', 'lastIndexOf', 'length',
    'localeCompare', 'match', 'matchAll', 'normalize', 'padEnd', 'padStart',
    'repeat', 'replace', 'replaceAll', 'search', 'slice', 'split', 'startsWith',
    'substring', 'toLocaleLowerCase', 'toLocaleUpperCase', 'toLowerCase',
    'toString', 'toUpperCase', 'toWellFormed', 'trim', 'trimEnd', 'trimStart',
    'valueOf',
  ];

  // ============================================
  // Nested Object Members
  // ============================================

  var JS_CLASSLIST_MEMBERS = [
    'add', 'contains', 'entries', 'forEach', 'item', 'keys', 'length',
    'remove', 'replace', 'supports', 'toggle', 'toString', 'value', 'values',
  ];

  var JS_STYLE_MEMBERS = [
    'alignContent', 'alignItems', 'alignSelf', 'animation', 'background',
    'backgroundColor', 'backgroundImage', 'backgroundPosition', 'backgroundRepeat',
    'backgroundSize', 'border', 'borderBottom', 'borderColor', 'borderLeft',
    'borderRadius', 'borderRight', 'borderStyle', 'borderTop', 'borderWidth',
    'bottom', 'boxShadow', 'boxSizing', 'clear', 'color', 'content', 'cssText',
    'cursor', 'direction', 'display', 'flex', 'flexBasis', 'flexDirection',
    'flexFlow', 'flexGrow', 'flexShrink', 'flexWrap', 'float', 'font',
    'fontFamily', 'fontSize', 'fontStyle', 'fontWeight', 'gap', 'getPropertyValue',
    'grid', 'gridArea', 'gridColumn', 'gridRow', 'gridTemplate', 'height',
    'justifyContent', 'left', 'letterSpacing', 'lineHeight', 'listStyle',
    'margin', 'marginBottom', 'marginLeft', 'marginRight', 'marginTop',
    'maxHeight', 'maxWidth', 'minHeight', 'minWidth', 'opacity', 'order',
    'outline', 'overflow', 'overflowX', 'overflowY', 'padding', 'paddingBottom',
    'paddingLeft', 'paddingRight', 'paddingTop', 'position', 'removeProperty',
    'right', 'setProperty', 'textAlign', 'textDecoration', 'textIndent',
    'textOverflow', 'textTransform', 'top', 'transform', 'transformOrigin',
    'transition', 'userSelect', 'verticalAlign', 'visibility', 'whiteSpace',
    'width', 'wordBreak', 'wordSpacing', 'zIndex',
  ];

  var JS_LOCATION_MEMBERS = [
    'ancestorOrigins', 'assign', 'hash', 'host', 'hostname', 'href', 'origin',
    'pathname', 'port', 'protocol', 'reload', 'replace', 'search', 'toString',
  ];

  var JS_HISTORY_MEMBERS = [
    'back', 'forward', 'go', 'length', 'pushState', 'replaceState',
    'scrollRestoration', 'state',
  ];

  var JS_NAVIGATOR_MEMBERS = [
    'appCodeName', 'appName', 'appVersion', 'clipboard', 'cookieEnabled',
    'deviceMemory', 'geolocation', 'hardwareConcurrency', 'language', 'languages',
    'maxTouchPoints', 'mediaDevices', 'onLine', 'platform', 'serviceWorker',
    'storage', 'userAgent', 'vibrate',
  ];

  var JS_NODELIST_MEMBERS = ['entries', 'forEach', 'item', 'keys', 'length', 'values'];

  var JS_NESTED_MEMBERS = {
    classList: JS_CLASSLIST_MEMBERS,
    style: JS_STYLE_MEMBERS,
    location: JS_LOCATION_MEMBERS,
    history: JS_HISTORY_MEMBERS,
    navigator: JS_NAVIGATOR_MEMBERS,
    body: JS_HTML_ELEMENT_MEMBERS,
    head: JS_HTML_ELEMENT_MEMBERS,
    documentElement: JS_HTML_ELEMENT_MEMBERS,
    activeElement: JS_HTML_ELEMENT_MEMBERS,
    parentElement: JS_HTML_ELEMENT_MEMBERS,
    firstElementChild: JS_HTML_ELEMENT_MEMBERS,
    lastElementChild: JS_HTML_ELEMENT_MEMBERS,
    nextElementSibling: JS_HTML_ELEMENT_MEMBERS,
    previousElementSibling: JS_HTML_ELEMENT_MEMBERS,
    childNodes: JS_NODELIST_MEMBERS,
  };

  var JS_METHOD_RETURN_TYPES = {
    getElementById: 'HTMLElement',
    querySelector: 'HTMLElement',
    closest: 'HTMLElement',
    createElement: 'HTMLElement',
    cloneNode: 'HTMLElement',
    querySelectorAll: 'NodeList',
    getElementsByClassName: 'HTMLCollection',
    getElementsByTagName: 'HTMLCollection',
    getBoundingClientRect: 'DOMRect',
  };

  var JS_TYPE_MEMBERS = {
    HTMLElement: JS_HTML_ELEMENT_MEMBERS,
    NodeList: JS_NODELIST_MEMBERS,
    DOMTokenList: JS_CLASSLIST_MEMBERS,
    CSSStyleDeclaration: JS_STYLE_MEMBERS,
    Location: JS_LOCATION_MEMBERS,
    History: JS_HISTORY_MEMBERS,
    Navigator: JS_NAVIGATOR_MEMBERS,
  };

  // ============================================
  // Export to Namespace
  // ============================================

  CodeEditor.CompletionData.JavaScript = {
    keywords: JS_KEYWORDS,
    globals: JS_GLOBALS,
    globalFunctions: JS_GLOBAL_FUNCTIONS,
    objectMembers: JS_OBJECT_MEMBERS,
    htmlElementMembers: JS_HTML_ELEMENT_MEMBERS,
    arrayMethods: JS_ARRAY_METHODS,
    stringMethods: JS_STRING_METHODS,
    classListMembers: JS_CLASSLIST_MEMBERS,
    styleMembers: JS_STYLE_MEMBERS,
    locationMembers: JS_LOCATION_MEMBERS,
    historyMembers: JS_HISTORY_MEMBERS,
    navigatorMembers: JS_NAVIGATOR_MEMBERS,
    nodeListMembers: JS_NODELIST_MEMBERS,
    nestedMembers: JS_NESTED_MEMBERS,
    methodReturnTypes: JS_METHOD_RETURN_TYPES,
    typeMembers: JS_TYPE_MEMBERS,
  };

})(window.CodeEditor = window.CodeEditor || {});
