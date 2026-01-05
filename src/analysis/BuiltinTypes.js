/**
 * @fileoverview Built-in JavaScript type definitions for type inference
 * @module analysis/BuiltinTypes
 */

(function(CodeEditor) {
  'use strict';

  // ============================================
  // Type Constants
  // ============================================

  var TYPE_KIND = {
    PRIMITIVE: 'primitive',
    OBJECT: 'object',
    ARRAY: 'array',
    FUNCTION: 'function',
    CLASS: 'class',
    UNKNOWN: 'unknown'
  };

  // ============================================
  // Primitive Type Definitions
  // ============================================

  var STRING_METHODS = {
    // Properties
    length: { returns: 'Number', isProperty: true },

    // Methods
    at: { params: ['number'], returns: 'String' },
    charAt: { params: ['number'], returns: 'String' },
    charCodeAt: { params: ['number'], returns: 'Number' },
    codePointAt: { params: ['number'], returns: 'Number' },
    concat: { params: ['...string'], returns: 'String' },
    endsWith: { params: ['string', 'number?'], returns: 'Boolean' },
    includes: { params: ['string', 'number?'], returns: 'Boolean' },
    indexOf: { params: ['string', 'number?'], returns: 'Number' },
    lastIndexOf: { params: ['string', 'number?'], returns: 'Number' },
    localeCompare: { params: ['string'], returns: 'Number' },
    match: { params: ['RegExp'], returns: 'Array<String>' },
    matchAll: { params: ['RegExp'], returns: 'Iterator' },
    normalize: { params: ['string?'], returns: 'String' },
    padEnd: { params: ['number', 'string?'], returns: 'String' },
    padStart: { params: ['number', 'string?'], returns: 'String' },
    repeat: { params: ['number'], returns: 'String' },
    replace: { params: ['string|RegExp', 'string|function'], returns: 'String' },
    replaceAll: { params: ['string|RegExp', 'string|function'], returns: 'String' },
    search: { params: ['RegExp'], returns: 'Number' },
    slice: { params: ['number', 'number?'], returns: 'String' },
    split: { params: ['string|RegExp', 'number?'], returns: 'Array<String>' },
    startsWith: { params: ['string', 'number?'], returns: 'Boolean' },
    substring: { params: ['number', 'number?'], returns: 'String' },
    toLocaleLowerCase: { params: [], returns: 'String' },
    toLocaleUpperCase: { params: [], returns: 'String' },
    toLowerCase: { params: [], returns: 'String' },
    toString: { params: [], returns: 'String' },
    toUpperCase: { params: [], returns: 'String' },
    trim: { params: [], returns: 'String' },
    trimEnd: { params: [], returns: 'String' },
    trimStart: { params: [], returns: 'String' },
    valueOf: { params: [], returns: 'String' }
  };

  var NUMBER_METHODS = {
    toExponential: { params: ['number?'], returns: 'String' },
    toFixed: { params: ['number?'], returns: 'String' },
    toLocaleString: { params: [], returns: 'String' },
    toPrecision: { params: ['number?'], returns: 'String' },
    toString: { params: ['number?'], returns: 'String' },
    valueOf: { params: [], returns: 'Number' }
  };

  var BOOLEAN_METHODS = {
    toString: { params: [], returns: 'String' },
    valueOf: { params: [], returns: 'Boolean' }
  };

  // ============================================
  // Array Type Definition
  // ============================================

  var ARRAY_METHODS = {
    // Properties
    length: { returns: 'Number', isProperty: true },

    // Mutating methods
    copyWithin: { params: ['number', 'number', 'number?'], returns: 'Array<T>' },
    fill: { params: ['T', 'number?', 'number?'], returns: 'Array<T>' },
    pop: { params: [], returns: 'T' },
    push: { params: ['...T'], returns: 'Number' },
    reverse: { params: [], returns: 'Array<T>' },
    shift: { params: [], returns: 'T' },
    sort: { params: ['function?'], returns: 'Array<T>' },
    splice: { params: ['number', 'number?', '...T'], returns: 'Array<T>' },
    unshift: { params: ['...T'], returns: 'Number' },

    // Non-mutating methods
    at: { params: ['number'], returns: 'T' },
    concat: { params: ['...Array'], returns: 'Array<T>' },
    entries: { params: [], returns: 'Iterator' },
    every: { params: ['function'], returns: 'Boolean' },
    filter: { params: ['function'], returns: 'Array<T>' },
    find: { params: ['function'], returns: 'T' },
    findIndex: { params: ['function'], returns: 'Number' },
    findLast: { params: ['function'], returns: 'T' },
    findLastIndex: { params: ['function'], returns: 'Number' },
    flat: { params: ['number?'], returns: 'Array' },
    flatMap: { params: ['function'], returns: 'Array' },
    forEach: { params: ['function'], returns: 'undefined' },
    includes: { params: ['T', 'number?'], returns: 'Boolean' },
    indexOf: { params: ['T', 'number?'], returns: 'Number' },
    join: { params: ['string?'], returns: 'String' },
    keys: { params: [], returns: 'Iterator' },
    lastIndexOf: { params: ['T', 'number?'], returns: 'Number' },
    map: { params: ['function'], returns: 'Array<U>' },
    reduce: { params: ['function', 'U?'], returns: 'U' },
    reduceRight: { params: ['function', 'U?'], returns: 'U' },
    slice: { params: ['number?', 'number?'], returns: 'Array<T>' },
    some: { params: ['function'], returns: 'Boolean' },
    toLocaleString: { params: [], returns: 'String' },
    toReversed: { params: [], returns: 'Array<T>' },
    toSorted: { params: ['function?'], returns: 'Array<T>' },
    toSpliced: { params: ['number', 'number?', '...T'], returns: 'Array<T>' },
    toString: { params: [], returns: 'String' },
    values: { params: [], returns: 'Iterator' },
    with: { params: ['number', 'T'], returns: 'Array<T>' }
  };

  // ============================================
  // Object Type Definition
  // ============================================

  var OBJECT_METHODS = {
    hasOwnProperty: { params: ['string'], returns: 'Boolean' },
    isPrototypeOf: { params: ['Object'], returns: 'Boolean' },
    propertyIsEnumerable: { params: ['string'], returns: 'Boolean' },
    toLocaleString: { params: [], returns: 'String' },
    toString: { params: [], returns: 'String' },
    valueOf: { params: [], returns: 'Object' }
  };

  // ============================================
  // Date Type Definition
  // ============================================

  var DATE_METHODS = {
    getDate: { params: [], returns: 'Number' },
    getDay: { params: [], returns: 'Number' },
    getFullYear: { params: [], returns: 'Number' },
    getHours: { params: [], returns: 'Number' },
    getMilliseconds: { params: [], returns: 'Number' },
    getMinutes: { params: [], returns: 'Number' },
    getMonth: { params: [], returns: 'Number' },
    getSeconds: { params: [], returns: 'Number' },
    getTime: { params: [], returns: 'Number' },
    getTimezoneOffset: { params: [], returns: 'Number' },
    getUTCDate: { params: [], returns: 'Number' },
    getUTCDay: { params: [], returns: 'Number' },
    getUTCFullYear: { params: [], returns: 'Number' },
    getUTCHours: { params: [], returns: 'Number' },
    getUTCMilliseconds: { params: [], returns: 'Number' },
    getUTCMinutes: { params: [], returns: 'Number' },
    getUTCMonth: { params: [], returns: 'Number' },
    getUTCSeconds: { params: [], returns: 'Number' },
    setDate: { params: ['number'], returns: 'Number' },
    setFullYear: { params: ['number', 'number?', 'number?'], returns: 'Number' },
    setHours: { params: ['number', 'number?', 'number?', 'number?'], returns: 'Number' },
    setMilliseconds: { params: ['number'], returns: 'Number' },
    setMinutes: { params: ['number', 'number?', 'number?'], returns: 'Number' },
    setMonth: { params: ['number', 'number?'], returns: 'Number' },
    setSeconds: { params: ['number', 'number?'], returns: 'Number' },
    setTime: { params: ['number'], returns: 'Number' },
    setUTCDate: { params: ['number'], returns: 'Number' },
    setUTCFullYear: { params: ['number', 'number?', 'number?'], returns: 'Number' },
    setUTCHours: { params: ['number', 'number?', 'number?', 'number?'], returns: 'Number' },
    setUTCMilliseconds: { params: ['number'], returns: 'Number' },
    setUTCMinutes: { params: ['number', 'number?', 'number?'], returns: 'Number' },
    setUTCMonth: { params: ['number', 'number?'], returns: 'Number' },
    setUTCSeconds: { params: ['number', 'number?'], returns: 'Number' },
    toDateString: { params: [], returns: 'String' },
    toISOString: { params: [], returns: 'String' },
    toJSON: { params: [], returns: 'String' },
    toLocaleDateString: { params: [], returns: 'String' },
    toLocaleString: { params: [], returns: 'String' },
    toLocaleTimeString: { params: [], returns: 'String' },
    toString: { params: [], returns: 'String' },
    toTimeString: { params: [], returns: 'String' },
    toUTCString: { params: [], returns: 'String' },
    valueOf: { params: [], returns: 'Number' }
  };

  // ============================================
  // Promise Type Definition
  // ============================================

  var PROMISE_METHODS = {
    then: { params: ['function', 'function?'], returns: 'Promise<U>' },
    catch: { params: ['function'], returns: 'Promise<U>' },
    finally: { params: ['function'], returns: 'Promise<T>' }
  };

  // ============================================
  // RegExp Type Definition
  // ============================================

  var REGEXP_METHODS = {
    // Properties
    flags: { returns: 'String', isProperty: true },
    global: { returns: 'Boolean', isProperty: true },
    ignoreCase: { returns: 'Boolean', isProperty: true },
    multiline: { returns: 'Boolean', isProperty: true },
    source: { returns: 'String', isProperty: true },
    sticky: { returns: 'Boolean', isProperty: true },
    unicode: { returns: 'Boolean', isProperty: true },
    lastIndex: { returns: 'Number', isProperty: true },

    // Methods
    exec: { params: ['string'], returns: 'Array<String>' },
    test: { params: ['string'], returns: 'Boolean' },
    toString: { params: [], returns: 'String' }
  };

  // ============================================
  // Map Type Definition
  // ============================================

  var MAP_METHODS = {
    size: { returns: 'Number', isProperty: true },
    clear: { params: [], returns: 'undefined' },
    delete: { params: ['K'], returns: 'Boolean' },
    entries: { params: [], returns: 'Iterator' },
    forEach: { params: ['function'], returns: 'undefined' },
    get: { params: ['K'], returns: 'V' },
    has: { params: ['K'], returns: 'Boolean' },
    keys: { params: [], returns: 'Iterator' },
    set: { params: ['K', 'V'], returns: 'Map<K,V>' },
    values: { params: [], returns: 'Iterator' }
  };

  // ============================================
  // Set Type Definition
  // ============================================

  var SET_METHODS = {
    size: { returns: 'Number', isProperty: true },
    add: { params: ['T'], returns: 'Set<T>' },
    clear: { params: [], returns: 'undefined' },
    delete: { params: ['T'], returns: 'Boolean' },
    entries: { params: [], returns: 'Iterator' },
    forEach: { params: ['function'], returns: 'undefined' },
    has: { params: ['T'], returns: 'Boolean' },
    keys: { params: [], returns: 'Iterator' },
    values: { params: [], returns: 'Iterator' }
  };

  // ============================================
  // DOM Type Definitions
  // ============================================

  var EVENT_TARGET_METHODS = {
    addEventListener: { params: ['string', 'function', 'object?'], returns: 'undefined' },
    removeEventListener: { params: ['string', 'function', 'object?'], returns: 'undefined' },
    dispatchEvent: { params: ['Event'], returns: 'Boolean' }
  };

  var NODE_METHODS = {
    // Properties
    childNodes: { returns: 'NodeList', isProperty: true },
    firstChild: { returns: 'Node', isProperty: true },
    lastChild: { returns: 'Node', isProperty: true },
    nextSibling: { returns: 'Node', isProperty: true },
    nodeName: { returns: 'String', isProperty: true },
    nodeType: { returns: 'Number', isProperty: true },
    nodeValue: { returns: 'String', isProperty: true },
    ownerDocument: { returns: 'Document', isProperty: true },
    parentNode: { returns: 'Node', isProperty: true },
    parentElement: { returns: 'HTMLElement', isProperty: true },
    previousSibling: { returns: 'Node', isProperty: true },
    textContent: { returns: 'String', isProperty: true },

    // Methods
    appendChild: { params: ['Node'], returns: 'Node' },
    cloneNode: { params: ['boolean?'], returns: 'Node' },
    compareDocumentPosition: { params: ['Node'], returns: 'Number' },
    contains: { params: ['Node'], returns: 'Boolean' },
    getRootNode: { params: [], returns: 'Node' },
    hasChildNodes: { params: [], returns: 'Boolean' },
    insertBefore: { params: ['Node', 'Node?'], returns: 'Node' },
    isEqualNode: { params: ['Node'], returns: 'Boolean' },
    isSameNode: { params: ['Node'], returns: 'Boolean' },
    normalize: { params: [], returns: 'undefined' },
    removeChild: { params: ['Node'], returns: 'Node' },
    replaceChild: { params: ['Node', 'Node'], returns: 'Node' }
  };

  var ELEMENT_METHODS = {
    // Properties
    attributes: { returns: 'NamedNodeMap', isProperty: true },
    childElementCount: { returns: 'Number', isProperty: true },
    children: { returns: 'HTMLCollection', isProperty: true },
    classList: { returns: 'DOMTokenList', isProperty: true },
    className: { returns: 'String', isProperty: true },
    clientHeight: { returns: 'Number', isProperty: true },
    clientLeft: { returns: 'Number', isProperty: true },
    clientTop: { returns: 'Number', isProperty: true },
    clientWidth: { returns: 'Number', isProperty: true },
    firstElementChild: { returns: 'Element', isProperty: true },
    id: { returns: 'String', isProperty: true },
    innerHTML: { returns: 'String', isProperty: true },
    lastElementChild: { returns: 'Element', isProperty: true },
    nextElementSibling: { returns: 'Element', isProperty: true },
    outerHTML: { returns: 'String', isProperty: true },
    previousElementSibling: { returns: 'Element', isProperty: true },
    scrollHeight: { returns: 'Number', isProperty: true },
    scrollLeft: { returns: 'Number', isProperty: true },
    scrollTop: { returns: 'Number', isProperty: true },
    scrollWidth: { returns: 'Number', isProperty: true },
    tagName: { returns: 'String', isProperty: true },

    // Methods
    after: { params: ['...Node|string'], returns: 'undefined' },
    animate: { params: ['object', 'object?'], returns: 'Animation' },
    append: { params: ['...Node|string'], returns: 'undefined' },
    before: { params: ['...Node|string'], returns: 'undefined' },
    closest: { params: ['string'], returns: 'Element' },
    getAttribute: { params: ['string'], returns: 'String' },
    getAttributeNames: { params: [], returns: 'Array<String>' },
    getBoundingClientRect: { params: [], returns: 'DOMRect' },
    getElementsByClassName: { params: ['string'], returns: 'HTMLCollection' },
    getElementsByTagName: { params: ['string'], returns: 'HTMLCollection' },
    hasAttribute: { params: ['string'], returns: 'Boolean' },
    hasAttributes: { params: [], returns: 'Boolean' },
    insertAdjacentElement: { params: ['string', 'Element'], returns: 'Element' },
    insertAdjacentHTML: { params: ['string', 'string'], returns: 'undefined' },
    insertAdjacentText: { params: ['string', 'string'], returns: 'undefined' },
    matches: { params: ['string'], returns: 'Boolean' },
    prepend: { params: ['...Node|string'], returns: 'undefined' },
    querySelector: { params: ['string'], returns: 'Element' },
    querySelectorAll: { params: ['string'], returns: 'NodeList' },
    remove: { params: [], returns: 'undefined' },
    removeAttribute: { params: ['string'], returns: 'undefined' },
    replaceChildren: { params: ['...Node|string'], returns: 'undefined' },
    replaceWith: { params: ['...Node|string'], returns: 'undefined' },
    scroll: { params: ['object|number', 'number?'], returns: 'undefined' },
    scrollBy: { params: ['object|number', 'number?'], returns: 'undefined' },
    scrollIntoView: { params: ['object?'], returns: 'undefined' },
    scrollTo: { params: ['object|number', 'number?'], returns: 'undefined' },
    setAttribute: { params: ['string', 'string'], returns: 'undefined' },
    toggleAttribute: { params: ['string', 'boolean?'], returns: 'Boolean' }
  };

  var HTML_ELEMENT_METHODS = {
    // Properties
    accessKey: { returns: 'String', isProperty: true },
    contentEditable: { returns: 'String', isProperty: true },
    dataset: { returns: 'DOMStringMap', isProperty: true },
    dir: { returns: 'String', isProperty: true },
    draggable: { returns: 'Boolean', isProperty: true },
    hidden: { returns: 'Boolean', isProperty: true },
    innerText: { returns: 'String', isProperty: true },
    lang: { returns: 'String', isProperty: true },
    offsetHeight: { returns: 'Number', isProperty: true },
    offsetLeft: { returns: 'Number', isProperty: true },
    offsetParent: { returns: 'Element', isProperty: true },
    offsetTop: { returns: 'Number', isProperty: true },
    offsetWidth: { returns: 'Number', isProperty: true },
    outerText: { returns: 'String', isProperty: true },
    spellcheck: { returns: 'Boolean', isProperty: true },
    style: { returns: 'CSSStyleDeclaration', isProperty: true },
    tabIndex: { returns: 'Number', isProperty: true },
    title: { returns: 'String', isProperty: true },

    // Methods
    blur: { params: [], returns: 'undefined' },
    click: { params: [], returns: 'undefined' },
    focus: { params: ['object?'], returns: 'undefined' }
  };

  // ============================================
  // DOM Collection Types
  // ============================================

  var NODELIST_METHODS = {
    length: { returns: 'Number', isProperty: true },
    entries: { params: [], returns: 'Iterator' },
    forEach: { params: ['function'], returns: 'undefined' },
    item: { params: ['number'], returns: 'Node' },
    keys: { params: [], returns: 'Iterator' },
    values: { params: [], returns: 'Iterator' }
  };

  var HTML_COLLECTION_METHODS = {
    length: { returns: 'Number', isProperty: true },
    item: { params: ['number'], returns: 'Element' },
    namedItem: { params: ['string'], returns: 'Element' }
  };

  var DOM_TOKEN_LIST_METHODS = {
    length: { returns: 'Number', isProperty: true },
    value: { returns: 'String', isProperty: true },
    add: { params: ['...string'], returns: 'undefined' },
    contains: { params: ['string'], returns: 'Boolean' },
    entries: { params: [], returns: 'Iterator' },
    forEach: { params: ['function'], returns: 'undefined' },
    item: { params: ['number'], returns: 'String' },
    keys: { params: [], returns: 'Iterator' },
    remove: { params: ['...string'], returns: 'undefined' },
    replace: { params: ['string', 'string'], returns: 'Boolean' },
    supports: { params: ['string'], returns: 'Boolean' },
    toggle: { params: ['string', 'boolean?'], returns: 'Boolean' },
    values: { params: [], returns: 'Iterator' }
  };

  var CSS_STYLE_DECLARATION_METHODS = {
    length: { returns: 'Number', isProperty: true },
    cssText: { returns: 'String', isProperty: true },
    getPropertyPriority: { params: ['string'], returns: 'String' },
    getPropertyValue: { params: ['string'], returns: 'String' },
    item: { params: ['number'], returns: 'String' },
    removeProperty: { params: ['string'], returns: 'String' },
    setProperty: { params: ['string', 'string', 'string?'], returns: 'undefined' }
  };

  var DOM_RECT_METHODS = {
    bottom: { returns: 'Number', isProperty: true },
    height: { returns: 'Number', isProperty: true },
    left: { returns: 'Number', isProperty: true },
    right: { returns: 'Number', isProperty: true },
    top: { returns: 'Number', isProperty: true },
    width: { returns: 'Number', isProperty: true },
    x: { returns: 'Number', isProperty: true },
    y: { returns: 'Number', isProperty: true },
    toJSON: { params: [], returns: 'Object' }
  };

  // ============================================
  // Global Object Static Methods
  // ============================================

  var GLOBAL_OBJECT_STATICS = {
    Object: {
      assign: { params: ['object', '...object'], returns: 'Object' },
      create: { params: ['object', 'object?'], returns: 'Object' },
      defineProperties: { params: ['object', 'object'], returns: 'Object' },
      defineProperty: { params: ['object', 'string', 'object'], returns: 'Object' },
      entries: { params: ['object'], returns: 'Array' },
      freeze: { params: ['object'], returns: 'Object' },
      fromEntries: { params: ['iterable'], returns: 'Object' },
      getOwnPropertyDescriptor: { params: ['object', 'string'], returns: 'Object' },
      getOwnPropertyDescriptors: { params: ['object'], returns: 'Object' },
      getOwnPropertyNames: { params: ['object'], returns: 'Array<String>' },
      getOwnPropertySymbols: { params: ['object'], returns: 'Array<Symbol>' },
      getPrototypeOf: { params: ['object'], returns: 'Object' },
      hasOwn: { params: ['object', 'string'], returns: 'Boolean' },
      is: { params: ['any', 'any'], returns: 'Boolean' },
      isExtensible: { params: ['object'], returns: 'Boolean' },
      isFrozen: { params: ['object'], returns: 'Boolean' },
      isSealed: { params: ['object'], returns: 'Boolean' },
      keys: { params: ['object'], returns: 'Array<String>' },
      preventExtensions: { params: ['object'], returns: 'Object' },
      seal: { params: ['object'], returns: 'Object' },
      setPrototypeOf: { params: ['object', 'object'], returns: 'Object' },
      values: { params: ['object'], returns: 'Array' }
    },

    Array: {
      from: { params: ['iterable', 'function?', 'object?'], returns: 'Array' },
      isArray: { params: ['any'], returns: 'Boolean' },
      of: { params: ['...any'], returns: 'Array' }
    },

    String: {
      fromCharCode: { params: ['...number'], returns: 'String' },
      fromCodePoint: { params: ['...number'], returns: 'String' },
      raw: { params: ['object', '...any'], returns: 'String' }
    },

    Number: {
      isFinite: { params: ['any'], returns: 'Boolean' },
      isInteger: { params: ['any'], returns: 'Boolean' },
      isNaN: { params: ['any'], returns: 'Boolean' },
      isSafeInteger: { params: ['any'], returns: 'Boolean' },
      parseFloat: { params: ['string'], returns: 'Number' },
      parseInt: { params: ['string', 'number?'], returns: 'Number' }
    },

    Math: {
      abs: { params: ['number'], returns: 'Number' },
      acos: { params: ['number'], returns: 'Number' },
      acosh: { params: ['number'], returns: 'Number' },
      asin: { params: ['number'], returns: 'Number' },
      asinh: { params: ['number'], returns: 'Number' },
      atan: { params: ['number'], returns: 'Number' },
      atan2: { params: ['number', 'number'], returns: 'Number' },
      atanh: { params: ['number'], returns: 'Number' },
      cbrt: { params: ['number'], returns: 'Number' },
      ceil: { params: ['number'], returns: 'Number' },
      clz32: { params: ['number'], returns: 'Number' },
      cos: { params: ['number'], returns: 'Number' },
      cosh: { params: ['number'], returns: 'Number' },
      exp: { params: ['number'], returns: 'Number' },
      expm1: { params: ['number'], returns: 'Number' },
      floor: { params: ['number'], returns: 'Number' },
      fround: { params: ['number'], returns: 'Number' },
      hypot: { params: ['...number'], returns: 'Number' },
      imul: { params: ['number', 'number'], returns: 'Number' },
      log: { params: ['number'], returns: 'Number' },
      log1p: { params: ['number'], returns: 'Number' },
      log2: { params: ['number'], returns: 'Number' },
      log10: { params: ['number'], returns: 'Number' },
      max: { params: ['...number'], returns: 'Number' },
      min: { params: ['...number'], returns: 'Number' },
      pow: { params: ['number', 'number'], returns: 'Number' },
      random: { params: [], returns: 'Number' },
      round: { params: ['number'], returns: 'Number' },
      sign: { params: ['number'], returns: 'Number' },
      sin: { params: ['number'], returns: 'Number' },
      sinh: { params: ['number'], returns: 'Number' },
      sqrt: { params: ['number'], returns: 'Number' },
      tan: { params: ['number'], returns: 'Number' },
      tanh: { params: ['number'], returns: 'Number' },
      trunc: { params: ['number'], returns: 'Number' }
    },

    JSON: {
      parse: { params: ['string', 'function?'], returns: 'any' },
      stringify: { params: ['any', 'function?', 'number|string?'], returns: 'String' }
    },

    Date: {
      now: { params: [], returns: 'Number' },
      parse: { params: ['string'], returns: 'Number' },
      UTC: { params: ['number', 'number?', 'number?', 'number?', 'number?', 'number?', 'number?'], returns: 'Number' }
    },

    Promise: {
      all: { params: ['iterable'], returns: 'Promise<Array>' },
      allSettled: { params: ['iterable'], returns: 'Promise<Array>' },
      any: { params: ['iterable'], returns: 'Promise' },
      race: { params: ['iterable'], returns: 'Promise' },
      reject: { params: ['any'], returns: 'Promise' },
      resolve: { params: ['any?'], returns: 'Promise' }
    }
  };

  // ============================================
  // Constructor Return Types
  // ============================================

  var CONSTRUCTOR_TYPES = {
    'Array': 'Array',
    'Boolean': 'Boolean',
    'Date': 'Date',
    'Error': 'Error',
    'Function': 'Function',
    'Map': 'Map',
    'Number': 'Number',
    'Object': 'Object',
    'Promise': 'Promise',
    'RegExp': 'RegExp',
    'Set': 'Set',
    'String': 'String',
    'WeakMap': 'WeakMap',
    'WeakSet': 'WeakSet',
    'Int8Array': 'Int8Array',
    'Uint8Array': 'Uint8Array',
    'Uint8ClampedArray': 'Uint8ClampedArray',
    'Int16Array': 'Int16Array',
    'Uint16Array': 'Uint16Array',
    'Int32Array': 'Int32Array',
    'Uint32Array': 'Uint32Array',
    'Float32Array': 'Float32Array',
    'Float64Array': 'Float64Array',
    'BigInt64Array': 'BigInt64Array',
    'BigUint64Array': 'BigUint64Array',
    'ArrayBuffer': 'ArrayBuffer',
    'DataView': 'DataView'
  };

  // ============================================
  // DOM Type Hierarchy
  // ============================================

  var DOM_TYPE_HIERARCHY = {
    'HTMLDivElement': ['HTMLElement'],
    'HTMLSpanElement': ['HTMLElement'],
    'HTMLInputElement': ['HTMLElement'],
    'HTMLButtonElement': ['HTMLElement'],
    'HTMLAnchorElement': ['HTMLElement'],
    'HTMLImageElement': ['HTMLElement'],
    'HTMLFormElement': ['HTMLElement'],
    'HTMLCanvasElement': ['HTMLElement'],
    'HTMLVideoElement': ['HTMLMediaElement'],
    'HTMLAudioElement': ['HTMLMediaElement'],
    'HTMLMediaElement': ['HTMLElement'],
    'HTMLElement': ['Element'],
    'Element': ['Node'],
    'Node': ['EventTarget'],
    'EventTarget': [],
    'Document': ['Node'],
    'DocumentFragment': ['Node']
  };

  // ============================================
  // Type Definitions Registry
  // ============================================

  var TYPE_DEFINITIONS = {
    // Primitives
    String: { prototype: STRING_METHODS },
    Number: { prototype: NUMBER_METHODS },
    Boolean: { prototype: BOOLEAN_METHODS },

    // Collections
    Array: { prototype: ARRAY_METHODS },
    Map: { prototype: MAP_METHODS },
    Set: { prototype: SET_METHODS },

    // Objects
    Object: { prototype: OBJECT_METHODS },
    Date: { prototype: DATE_METHODS },
    RegExp: { prototype: REGEXP_METHODS },
    Promise: { prototype: PROMISE_METHODS },

    // DOM
    EventTarget: { prototype: EVENT_TARGET_METHODS },
    Node: { prototype: Object.assign({}, EVENT_TARGET_METHODS, NODE_METHODS) },
    Element: { prototype: Object.assign({}, EVENT_TARGET_METHODS, NODE_METHODS, ELEMENT_METHODS) },
    HTMLElement: { prototype: Object.assign({}, EVENT_TARGET_METHODS, NODE_METHODS, ELEMENT_METHODS, HTML_ELEMENT_METHODS) },

    // DOM Collections
    NodeList: { prototype: NODELIST_METHODS },
    HTMLCollection: { prototype: HTML_COLLECTION_METHODS },
    DOMTokenList: { prototype: DOM_TOKEN_LIST_METHODS },
    CSSStyleDeclaration: { prototype: CSS_STYLE_DECLARATION_METHODS },
    DOMRect: { prototype: DOM_RECT_METHODS }
  };

  // ============================================
  // BuiltinTypes Class
  // ============================================

  class BuiltinTypes {
    /**
     * Get members of a built-in type
     * @param {string} typeName - Type name (e.g., 'String', 'Array')
     * @returns {Object|null} Type members
     */
    getTypeMembers(typeName) {
      var typeDef = TYPE_DEFINITIONS[typeName];
      if (typeDef && typeDef.prototype) {
        return typeDef.prototype;
      }
      return null;
    }

    /**
     * Get static members of a global object
     * @param {string} objectName - Object name (e.g., 'Math', 'JSON')
     * @returns {Object|null} Static members
     */
    getStaticMembers(objectName) {
      return GLOBAL_OBJECT_STATICS[objectName] || null;
    }

    /**
     * Get the return type of a constructor
     * @param {string} constructorName - Constructor name
     * @returns {string|null} Return type name
     */
    getConstructorType(constructorName) {
      return CONSTRUCTOR_TYPES[constructorName] || null;
    }

    /**
     * Get the return type of a method
     * @param {string} typeName - Type name
     * @param {string} methodName - Method name
     * @returns {string|null} Return type
     */
    getMethodReturnType(typeName, methodName) {
      var members = this.getTypeMembers(typeName);
      if (members && members[methodName]) {
        return members[methodName].returns;
      }

      var statics = this.getStaticMembers(typeName);
      if (statics && statics[methodName]) {
        return statics[methodName].returns;
      }

      return null;
    }

    /**
     * Check if a member is a property (not a method)
     * @param {string} typeName - Type name
     * @param {string} memberName - Member name
     * @returns {boolean}
     */
    isProperty(typeName, memberName) {
      var members = this.getTypeMembers(typeName);
      if (members && members[memberName]) {
        return members[memberName].isProperty === true;
      }
      return false;
    }

    /**
     * Get parent types in the hierarchy
     * @param {string} typeName - Type name
     * @returns {string[]} Parent type names
     */
    getTypeHierarchy(typeName) {
      var hierarchy = [typeName];
      var parents = DOM_TYPE_HIERARCHY[typeName];

      while (parents && parents.length > 0) {
        var parent = parents[0];
        hierarchy.push(parent);
        parents = DOM_TYPE_HIERARCHY[parent];
      }

      return hierarchy;
    }

    /**
     * Get all members including inherited ones
     * @param {string} typeName - Type name
     * @returns {Object} All members
     */
    getAllMembers(typeName) {
      var result = {};
      var hierarchy = this.getTypeHierarchy(typeName);

      // Start from the root and work down (so derived types override base)
      for (var i = hierarchy.length - 1; i >= 0; i--) {
        var members = this.getTypeMembers(hierarchy[i]);
        if (members) {
          Object.assign(result, members);
        }
      }

      return result;
    }

    /**
     * Create a type descriptor
     * @param {string} kind - Type kind
     * @param {string} name - Type name
     * @param {Object} options - Additional options
     * @returns {Object} Type descriptor
     */
    createType(kind, name, options) {
      options = options || {};
      return {
        kind: kind,
        name: name || null,
        shape: options.shape || null,
        elementType: options.elementType || null,
        members: options.members || null,
        returnType: options.returnType || null,
        isUnknown: options.isUnknown || false
      };
    }

    /**
     * Create an unknown type
     * @returns {Object} Unknown type descriptor
     */
    createUnknownType() {
      return this.createType(TYPE_KIND.UNKNOWN, null, { isUnknown: true });
    }

    /**
     * Create a primitive type
     * @param {string} name - Primitive name (String, Number, Boolean)
     * @returns {Object} Type descriptor
     */
    createPrimitiveType(name) {
      return this.createType(TYPE_KIND.PRIMITIVE, name);
    }

    /**
     * Create an array type
     * @param {Object} elementType - Element type descriptor
     * @returns {Object} Type descriptor
     */
    createArrayType(elementType) {
      return this.createType(TYPE_KIND.ARRAY, 'Array', { elementType: elementType });
    }

    /**
     * Create an object type with shape
     * @param {Object} shape - Property name to type mapping
     * @returns {Object} Type descriptor
     */
    createObjectType(shape) {
      return this.createType(TYPE_KIND.OBJECT, null, { shape: shape });
    }

    /**
     * Create a function type
     * @param {Object} returnType - Return type descriptor
     * @returns {Object} Type descriptor
     */
    createFunctionType(returnType) {
      return this.createType(TYPE_KIND.FUNCTION, null, { returnType: returnType });
    }

    /**
     * Get type kind constant
     */
    get TYPE_KIND() {
      return TYPE_KIND;
    }
  }

  // ============================================
  // Export to Namespace
  // ============================================

  CodeEditor.Analysis = CodeEditor.Analysis || {};
  CodeEditor.Analysis.BuiltinTypes = BuiltinTypes;
  CodeEditor.Analysis.TYPE_KIND = TYPE_KIND;

})(window.CodeEditor = window.CodeEditor || {});
