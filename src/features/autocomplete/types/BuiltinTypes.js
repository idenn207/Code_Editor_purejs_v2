/**
 * @fileoverview Built-in JavaScript type definitions
 * @module features/autocomplete/types/BuiltinTypes
 */

(function(CodeEditor) {
  'use strict';

  var Type = CodeEditor.Type;
  var TypeKind = CodeEditor.TypeKind;
  var PrimitiveType = CodeEditor.PrimitiveType;
  var ObjectType = CodeEditor.ObjectType;
  var ArrayType = CodeEditor.ArrayType;
  var FunctionType = CodeEditor.FunctionType;
  var ClassType = CodeEditor.ClassType;
  var UnionType = CodeEditor.UnionType;
  var TypeVariable = CodeEditor.TypeVariable;
  var GenericType = CodeEditor.GenericType;

  // ============================================
  // BuiltinTypes Class
  // ============================================

  /**
   * Registry for built-in JavaScript types
   * @class
   */
  function BuiltinTypes() {
    /**
     * Global type registry (Array, Object, etc.)
     * @type {Map<string, Type>}
     */
    this._globals = new Map();

    /**
     * Prototype method cache by type kind
     * @type {Map<string, Map<string, Type>>}
     */
    this._prototypeMethods = new Map();

    /**
     * Whether initialization is complete
     * @type {boolean}
     */
    this._initialized = false;

    // Initialize built-in types
    this._initialize();
  }

  // ----------------------------------------
  // Initialization
  // ----------------------------------------

  /**
   * Initialize all built-in types
   * @private
   */
  BuiltinTypes.prototype._initialize = function() {
    if (this._initialized) return;

    this._initStringMethods();
    this._initNumberMethods();
    this._initBooleanMethods();
    this._initArrayMethods();
    this._initObjectMethods();
    this._initFunctionMethods();
    this._initMathObject();
    this._initJSONObject();
    this._initConsoleObject();
    this._initDateClass();
    this._initRegExpClass();
    this._initErrorClass();
    this._initPromiseClass();
    this._initGlobalFunctions();

    this._initialized = true;
  };

  // ----------------------------------------
  // String Methods
  // ----------------------------------------

  BuiltinTypes.prototype._initStringMethods = function() {
    var methods = new Map();
    var str = PrimitiveType.STRING;
    var num = PrimitiveType.NUMBER;
    var bool = PrimitiveType.BOOLEAN;

    // Properties
    methods.set('length', num);

    // Common methods
    methods.set('charAt', new FunctionType([{ name: 'index', type: num }], str));
    methods.set('charCodeAt', new FunctionType([{ name: 'index', type: num }], num));
    methods.set('codePointAt', new FunctionType([{ name: 'index', type: num }], UnionType.of(num, PrimitiveType.UNDEFINED)));
    methods.set('concat', new FunctionType([{ name: 'strings', type: str, rest: true }], str));
    methods.set('includes', new FunctionType([{ name: 'searchString', type: str }, { name: 'position', type: num, optional: true }], bool));
    methods.set('endsWith', new FunctionType([{ name: 'searchString', type: str }, { name: 'position', type: num, optional: true }], bool));
    methods.set('indexOf', new FunctionType([{ name: 'searchString', type: str }, { name: 'position', type: num, optional: true }], num));
    methods.set('lastIndexOf', new FunctionType([{ name: 'searchString', type: str }, { name: 'position', type: num, optional: true }], num));
    methods.set('localeCompare', new FunctionType([{ name: 'compareString', type: str }], num));
    methods.set('match', new FunctionType([{ name: 'regexp', type: Type.ANY }], UnionType.of(new ArrayType(str), PrimitiveType.NULL)));
    methods.set('matchAll', new FunctionType([{ name: 'regexp', type: Type.ANY }], Type.ANY));
    methods.set('normalize', new FunctionType([{ name: 'form', type: str, optional: true }], str));
    methods.set('padEnd', new FunctionType([{ name: 'targetLength', type: num }, { name: 'padString', type: str, optional: true }], str));
    methods.set('padStart', new FunctionType([{ name: 'targetLength', type: num }, { name: 'padString', type: str, optional: true }], str));
    methods.set('repeat', new FunctionType([{ name: 'count', type: num }], str));
    methods.set('replace', new FunctionType([{ name: 'searchValue', type: Type.ANY }, { name: 'replaceValue', type: Type.ANY }], str));
    methods.set('replaceAll', new FunctionType([{ name: 'searchValue', type: Type.ANY }, { name: 'replaceValue', type: Type.ANY }], str));
    methods.set('search', new FunctionType([{ name: 'regexp', type: Type.ANY }], num));
    methods.set('slice', new FunctionType([{ name: 'start', type: num, optional: true }, { name: 'end', type: num, optional: true }], str));
    methods.set('split', new FunctionType([{ name: 'separator', type: Type.ANY, optional: true }, { name: 'limit', type: num, optional: true }], new ArrayType(str)));
    methods.set('startsWith', new FunctionType([{ name: 'searchString', type: str }, { name: 'position', type: num, optional: true }], bool));
    methods.set('substring', new FunctionType([{ name: 'start', type: num }, { name: 'end', type: num, optional: true }], str));
    methods.set('toLowerCase', new FunctionType([], str));
    methods.set('toUpperCase', new FunctionType([], str));
    methods.set('toLocaleLowerCase', new FunctionType([{ name: 'locales', type: Type.ANY, optional: true }], str));
    methods.set('toLocaleUpperCase', new FunctionType([{ name: 'locales', type: Type.ANY, optional: true }], str));
    methods.set('trim', new FunctionType([], str));
    methods.set('trimStart', new FunctionType([], str));
    methods.set('trimEnd', new FunctionType([], str));
    methods.set('valueOf', new FunctionType([], str));
    methods.set('toString', new FunctionType([], str));
    methods.set('at', new FunctionType([{ name: 'index', type: num }], UnionType.of(str, PrimitiveType.UNDEFINED)));

    this._prototypeMethods.set(TypeKind.STRING, methods);

    // Set on PrimitiveType.STRING
    PrimitiveType.STRING.setMembers(Object.fromEntries(methods));
  };

  // ----------------------------------------
  // Number Methods
  // ----------------------------------------

  BuiltinTypes.prototype._initNumberMethods = function() {
    var methods = new Map();
    var str = PrimitiveType.STRING;
    var num = PrimitiveType.NUMBER;
    var bool = PrimitiveType.BOOLEAN;

    methods.set('toExponential', new FunctionType([{ name: 'fractionDigits', type: num, optional: true }], str));
    methods.set('toFixed', new FunctionType([{ name: 'digits', type: num, optional: true }], str));
    methods.set('toLocaleString', new FunctionType([{ name: 'locales', type: Type.ANY, optional: true }], str));
    methods.set('toPrecision', new FunctionType([{ name: 'precision', type: num, optional: true }], str));
    methods.set('toString', new FunctionType([{ name: 'radix', type: num, optional: true }], str));
    methods.set('valueOf', new FunctionType([], num));

    this._prototypeMethods.set(TypeKind.NUMBER, methods);

    // Set on PrimitiveType.NUMBER
    PrimitiveType.NUMBER.setMembers(Object.fromEntries(methods));
  };

  // ----------------------------------------
  // Boolean Methods
  // ----------------------------------------

  BuiltinTypes.prototype._initBooleanMethods = function() {
    var methods = new Map();
    var str = PrimitiveType.STRING;
    var bool = PrimitiveType.BOOLEAN;

    methods.set('toString', new FunctionType([], str));
    methods.set('valueOf', new FunctionType([], bool));

    this._prototypeMethods.set(TypeKind.BOOLEAN, methods);

    // Set on PrimitiveType.BOOLEAN
    PrimitiveType.BOOLEAN.setMembers(Object.fromEntries(methods));
  };

  // ----------------------------------------
  // Array Methods
  // ----------------------------------------

  BuiltinTypes.prototype._initArrayMethods = function() {
    var methods = new Map();
    var str = PrimitiveType.STRING;
    var num = PrimitiveType.NUMBER;
    var bool = PrimitiveType.BOOLEAN;

    // Properties
    methods.set('length', num);

    // Static-like methods (we'll handle these specially)
    // Instance methods with generic placeholders
    // Note: These return types will be overridden by GenericInference for specific calls

    methods.set('at', new FunctionType([{ name: 'index', type: num }], Type.ANY));
    methods.set('concat', new FunctionType([{ name: 'items', type: Type.ANY, rest: true }], new ArrayType(Type.ANY)));
    methods.set('copyWithin', new FunctionType([{ name: 'target', type: num }, { name: 'start', type: num }, { name: 'end', type: num, optional: true }], new ArrayType(Type.ANY)));
    methods.set('entries', new FunctionType([], Type.ANY));
    methods.set('every', new FunctionType([{ name: 'predicate', type: Type.ANY }, { name: 'thisArg', type: Type.ANY, optional: true }], bool));
    methods.set('fill', new FunctionType([{ name: 'value', type: Type.ANY }, { name: 'start', type: num, optional: true }, { name: 'end', type: num, optional: true }], new ArrayType(Type.ANY)));
    methods.set('filter', new FunctionType([{ name: 'predicate', type: Type.ANY }, { name: 'thisArg', type: Type.ANY, optional: true }], new ArrayType(Type.ANY)));
    methods.set('find', new FunctionType([{ name: 'predicate', type: Type.ANY }, { name: 'thisArg', type: Type.ANY, optional: true }], Type.ANY));
    methods.set('findIndex', new FunctionType([{ name: 'predicate', type: Type.ANY }, { name: 'thisArg', type: Type.ANY, optional: true }], num));
    methods.set('findLast', new FunctionType([{ name: 'predicate', type: Type.ANY }, { name: 'thisArg', type: Type.ANY, optional: true }], Type.ANY));
    methods.set('findLastIndex', new FunctionType([{ name: 'predicate', type: Type.ANY }, { name: 'thisArg', type: Type.ANY, optional: true }], num));
    methods.set('flat', new FunctionType([{ name: 'depth', type: num, optional: true }], new ArrayType(Type.ANY)));
    methods.set('flatMap', new FunctionType([{ name: 'callback', type: Type.ANY }, { name: 'thisArg', type: Type.ANY, optional: true }], new ArrayType(Type.ANY)));
    methods.set('forEach', new FunctionType([{ name: 'callback', type: Type.ANY }, { name: 'thisArg', type: Type.ANY, optional: true }], Type.VOID));
    methods.set('includes', new FunctionType([{ name: 'searchElement', type: Type.ANY }, { name: 'fromIndex', type: num, optional: true }], bool));
    methods.set('indexOf', new FunctionType([{ name: 'searchElement', type: Type.ANY }, { name: 'fromIndex', type: num, optional: true }], num));
    methods.set('join', new FunctionType([{ name: 'separator', type: str, optional: true }], str));
    methods.set('keys', new FunctionType([], Type.ANY));
    methods.set('lastIndexOf', new FunctionType([{ name: 'searchElement', type: Type.ANY }, { name: 'fromIndex', type: num, optional: true }], num));
    methods.set('map', new FunctionType([{ name: 'callback', type: Type.ANY }, { name: 'thisArg', type: Type.ANY, optional: true }], new ArrayType(Type.ANY)));
    methods.set('pop', new FunctionType([], Type.ANY));
    methods.set('push', new FunctionType([{ name: 'items', type: Type.ANY, rest: true }], num));
    methods.set('reduce', new FunctionType([{ name: 'callback', type: Type.ANY }, { name: 'initialValue', type: Type.ANY, optional: true }], Type.ANY));
    methods.set('reduceRight', new FunctionType([{ name: 'callback', type: Type.ANY }, { name: 'initialValue', type: Type.ANY, optional: true }], Type.ANY));
    methods.set('reverse', new FunctionType([], new ArrayType(Type.ANY)));
    methods.set('shift', new FunctionType([], Type.ANY));
    methods.set('slice', new FunctionType([{ name: 'start', type: num, optional: true }, { name: 'end', type: num, optional: true }], new ArrayType(Type.ANY)));
    methods.set('some', new FunctionType([{ name: 'predicate', type: Type.ANY }, { name: 'thisArg', type: Type.ANY, optional: true }], bool));
    methods.set('sort', new FunctionType([{ name: 'compareFn', type: Type.ANY, optional: true }], new ArrayType(Type.ANY)));
    methods.set('splice', new FunctionType([{ name: 'start', type: num }, { name: 'deleteCount', type: num, optional: true }], new ArrayType(Type.ANY)));
    methods.set('toLocaleString', new FunctionType([], str));
    methods.set('toReversed', new FunctionType([], new ArrayType(Type.ANY)));
    methods.set('toSorted', new FunctionType([{ name: 'compareFn', type: Type.ANY, optional: true }], new ArrayType(Type.ANY)));
    methods.set('toSpliced', new FunctionType([{ name: 'start', type: num }, { name: 'deleteCount', type: num, optional: true }], new ArrayType(Type.ANY)));
    methods.set('toString', new FunctionType([], str));
    methods.set('unshift', new FunctionType([{ name: 'items', type: Type.ANY, rest: true }], num));
    methods.set('values', new FunctionType([], Type.ANY));
    methods.set('with', new FunctionType([{ name: 'index', type: num }, { name: 'value', type: Type.ANY }], new ArrayType(Type.ANY)));

    this._prototypeMethods.set(TypeKind.ARRAY, methods);

    // Set shared methods on ArrayType
    ArrayType.setSharedMethods(Object.fromEntries(methods));
  };

  // ----------------------------------------
  // Object Methods
  // ----------------------------------------

  BuiltinTypes.prototype._initObjectMethods = function() {
    var methods = new Map();
    var str = PrimitiveType.STRING;
    var bool = PrimitiveType.BOOLEAN;

    methods.set('hasOwnProperty', new FunctionType([{ name: 'prop', type: str }], bool));
    methods.set('isPrototypeOf', new FunctionType([{ name: 'obj', type: Type.ANY }], bool));
    methods.set('propertyIsEnumerable', new FunctionType([{ name: 'prop', type: str }], bool));
    methods.set('toLocaleString', new FunctionType([], str));
    methods.set('toString', new FunctionType([], str));
    methods.set('valueOf', new FunctionType([], Type.ANY));

    this._prototypeMethods.set(TypeKind.OBJECT, methods);

    // Object static methods
    var objectType = new ObjectType();
    objectType.setProperty('keys', new FunctionType([{ name: 'obj', type: Type.ANY }], new ArrayType(str)));
    objectType.setProperty('values', new FunctionType([{ name: 'obj', type: Type.ANY }], new ArrayType(Type.ANY)));
    objectType.setProperty('entries', new FunctionType([{ name: 'obj', type: Type.ANY }], new ArrayType(new ArrayType(Type.ANY))));
    objectType.setProperty('assign', new FunctionType([{ name: 'target', type: Type.ANY }, { name: 'sources', type: Type.ANY, rest: true }], Type.ANY));
    objectType.setProperty('create', new FunctionType([{ name: 'proto', type: Type.ANY }, { name: 'props', type: Type.ANY, optional: true }], Type.ANY));
    objectType.setProperty('defineProperty', new FunctionType([{ name: 'obj', type: Type.ANY }, { name: 'prop', type: str }, { name: 'descriptor', type: Type.ANY }], Type.ANY));
    objectType.setProperty('defineProperties', new FunctionType([{ name: 'obj', type: Type.ANY }, { name: 'props', type: Type.ANY }], Type.ANY));
    objectType.setProperty('freeze', new FunctionType([{ name: 'obj', type: Type.ANY }], Type.ANY));
    objectType.setProperty('fromEntries', new FunctionType([{ name: 'entries', type: Type.ANY }], Type.ANY));
    objectType.setProperty('getOwnPropertyDescriptor', new FunctionType([{ name: 'obj', type: Type.ANY }, { name: 'prop', type: str }], Type.ANY));
    objectType.setProperty('getOwnPropertyDescriptors', new FunctionType([{ name: 'obj', type: Type.ANY }], Type.ANY));
    objectType.setProperty('getOwnPropertyNames', new FunctionType([{ name: 'obj', type: Type.ANY }], new ArrayType(str)));
    objectType.setProperty('getOwnPropertySymbols', new FunctionType([{ name: 'obj', type: Type.ANY }], new ArrayType(Type.ANY)));
    objectType.setProperty('getPrototypeOf', new FunctionType([{ name: 'obj', type: Type.ANY }], Type.ANY));
    objectType.setProperty('is', new FunctionType([{ name: 'value1', type: Type.ANY }, { name: 'value2', type: Type.ANY }], bool));
    objectType.setProperty('isExtensible', new FunctionType([{ name: 'obj', type: Type.ANY }], bool));
    objectType.setProperty('isFrozen', new FunctionType([{ name: 'obj', type: Type.ANY }], bool));
    objectType.setProperty('isSealed', new FunctionType([{ name: 'obj', type: Type.ANY }], bool));
    objectType.setProperty('preventExtensions', new FunctionType([{ name: 'obj', type: Type.ANY }], Type.ANY));
    objectType.setProperty('seal', new FunctionType([{ name: 'obj', type: Type.ANY }], Type.ANY));
    objectType.setProperty('setPrototypeOf', new FunctionType([{ name: 'obj', type: Type.ANY }, { name: 'proto', type: Type.ANY }], Type.ANY));

    this._globals.set('Object', objectType);
  };

  // ----------------------------------------
  // Function Methods
  // ----------------------------------------

  BuiltinTypes.prototype._initFunctionMethods = function() {
    var methods = new Map();
    var str = PrimitiveType.STRING;
    var num = PrimitiveType.NUMBER;

    methods.set('length', num);
    methods.set('name', str);
    methods.set('apply', new FunctionType([{ name: 'thisArg', type: Type.ANY }, { name: 'args', type: Type.ANY, optional: true }], Type.ANY));
    methods.set('bind', new FunctionType([{ name: 'thisArg', type: Type.ANY }, { name: 'args', type: Type.ANY, rest: true }], Type.ANY));
    methods.set('call', new FunctionType([{ name: 'thisArg', type: Type.ANY }, { name: 'args', type: Type.ANY, rest: true }], Type.ANY));
    methods.set('toString', new FunctionType([], str));

    this._prototypeMethods.set(TypeKind.FUNCTION, methods);

    // Set shared members on FunctionType
    for (var entry of methods) {
      FunctionType.setSharedMember(entry[0], entry[1]);
    }
  };

  // ----------------------------------------
  // Math Object
  // ----------------------------------------

  BuiltinTypes.prototype._initMathObject = function() {
    var mathType = new ObjectType();
    var num = PrimitiveType.NUMBER;

    // Constants
    mathType.setProperty('E', num);
    mathType.setProperty('LN10', num);
    mathType.setProperty('LN2', num);
    mathType.setProperty('LOG10E', num);
    mathType.setProperty('LOG2E', num);
    mathType.setProperty('PI', num);
    mathType.setProperty('SQRT1_2', num);
    mathType.setProperty('SQRT2', num);

    // Methods
    mathType.setProperty('abs', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('acos', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('acosh', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('asin', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('asinh', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('atan', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('atan2', new FunctionType([{ name: 'y', type: num }, { name: 'x', type: num }], num));
    mathType.setProperty('atanh', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('cbrt', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('ceil', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('clz32', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('cos', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('cosh', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('exp', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('expm1', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('floor', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('fround', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('hypot', new FunctionType([{ name: 'values', type: num, rest: true }], num));
    mathType.setProperty('imul', new FunctionType([{ name: 'a', type: num }, { name: 'b', type: num }], num));
    mathType.setProperty('log', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('log10', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('log1p', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('log2', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('max', new FunctionType([{ name: 'values', type: num, rest: true }], num));
    mathType.setProperty('min', new FunctionType([{ name: 'values', type: num, rest: true }], num));
    mathType.setProperty('pow', new FunctionType([{ name: 'base', type: num }, { name: 'exponent', type: num }], num));
    mathType.setProperty('random', new FunctionType([], num));
    mathType.setProperty('round', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('sign', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('sin', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('sinh', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('sqrt', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('tan', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('tanh', new FunctionType([{ name: 'x', type: num }], num));
    mathType.setProperty('trunc', new FunctionType([{ name: 'x', type: num }], num));

    this._globals.set('Math', mathType);
  };

  // ----------------------------------------
  // JSON Object
  // ----------------------------------------

  BuiltinTypes.prototype._initJSONObject = function() {
    var jsonType = new ObjectType();
    var str = PrimitiveType.STRING;

    jsonType.setProperty('parse', new FunctionType([{ name: 'text', type: str }, { name: 'reviver', type: Type.ANY, optional: true }], Type.ANY));
    jsonType.setProperty('stringify', new FunctionType([{ name: 'value', type: Type.ANY }, { name: 'replacer', type: Type.ANY, optional: true }, { name: 'space', type: Type.ANY, optional: true }], str));

    this._globals.set('JSON', jsonType);
  };

  // ----------------------------------------
  // Console Object
  // ----------------------------------------

  BuiltinTypes.prototype._initConsoleObject = function() {
    var consoleType = new ObjectType();
    var voidType = Type.VOID;

    consoleType.setProperty('assert', new FunctionType([{ name: 'condition', type: Type.ANY }, { name: 'data', type: Type.ANY, rest: true }], voidType));
    consoleType.setProperty('clear', new FunctionType([], voidType));
    consoleType.setProperty('count', new FunctionType([{ name: 'label', type: PrimitiveType.STRING, optional: true }], voidType));
    consoleType.setProperty('countReset', new FunctionType([{ name: 'label', type: PrimitiveType.STRING, optional: true }], voidType));
    consoleType.setProperty('debug', new FunctionType([{ name: 'data', type: Type.ANY, rest: true }], voidType));
    consoleType.setProperty('dir', new FunctionType([{ name: 'obj', type: Type.ANY }, { name: 'options', type: Type.ANY, optional: true }], voidType));
    consoleType.setProperty('dirxml', new FunctionType([{ name: 'data', type: Type.ANY, rest: true }], voidType));
    consoleType.setProperty('error', new FunctionType([{ name: 'data', type: Type.ANY, rest: true }], voidType));
    consoleType.setProperty('group', new FunctionType([{ name: 'data', type: Type.ANY, rest: true }], voidType));
    consoleType.setProperty('groupCollapsed', new FunctionType([{ name: 'data', type: Type.ANY, rest: true }], voidType));
    consoleType.setProperty('groupEnd', new FunctionType([], voidType));
    consoleType.setProperty('info', new FunctionType([{ name: 'data', type: Type.ANY, rest: true }], voidType));
    consoleType.setProperty('log', new FunctionType([{ name: 'data', type: Type.ANY, rest: true }], voidType));
    consoleType.setProperty('table', new FunctionType([{ name: 'data', type: Type.ANY }, { name: 'columns', type: Type.ANY, optional: true }], voidType));
    consoleType.setProperty('time', new FunctionType([{ name: 'label', type: PrimitiveType.STRING, optional: true }], voidType));
    consoleType.setProperty('timeEnd', new FunctionType([{ name: 'label', type: PrimitiveType.STRING, optional: true }], voidType));
    consoleType.setProperty('timeLog', new FunctionType([{ name: 'label', type: PrimitiveType.STRING, optional: true }, { name: 'data', type: Type.ANY, rest: true }], voidType));
    consoleType.setProperty('trace', new FunctionType([{ name: 'data', type: Type.ANY, rest: true }], voidType));
    consoleType.setProperty('warn', new FunctionType([{ name: 'data', type: Type.ANY, rest: true }], voidType));

    this._globals.set('console', consoleType);
  };

  // ----------------------------------------
  // Date Class
  // ----------------------------------------

  BuiltinTypes.prototype._initDateClass = function() {
    var dateClass = new ClassType('Date');
    var str = PrimitiveType.STRING;
    var num = PrimitiveType.NUMBER;
    var bool = PrimitiveType.BOOLEAN;

    // Constructor
    dateClass.setConstructor(new FunctionType([
      { name: 'value', type: Type.ANY, optional: true }
    ], Type.ANY));

    // Instance methods
    dateClass.setInstanceMember('getDate', new FunctionType([], num));
    dateClass.setInstanceMember('getDay', new FunctionType([], num));
    dateClass.setInstanceMember('getFullYear', new FunctionType([], num));
    dateClass.setInstanceMember('getHours', new FunctionType([], num));
    dateClass.setInstanceMember('getMilliseconds', new FunctionType([], num));
    dateClass.setInstanceMember('getMinutes', new FunctionType([], num));
    dateClass.setInstanceMember('getMonth', new FunctionType([], num));
    dateClass.setInstanceMember('getSeconds', new FunctionType([], num));
    dateClass.setInstanceMember('getTime', new FunctionType([], num));
    dateClass.setInstanceMember('getTimezoneOffset', new FunctionType([], num));
    dateClass.setInstanceMember('getUTCDate', new FunctionType([], num));
    dateClass.setInstanceMember('getUTCDay', new FunctionType([], num));
    dateClass.setInstanceMember('getUTCFullYear', new FunctionType([], num));
    dateClass.setInstanceMember('getUTCHours', new FunctionType([], num));
    dateClass.setInstanceMember('getUTCMilliseconds', new FunctionType([], num));
    dateClass.setInstanceMember('getUTCMinutes', new FunctionType([], num));
    dateClass.setInstanceMember('getUTCMonth', new FunctionType([], num));
    dateClass.setInstanceMember('getUTCSeconds', new FunctionType([], num));
    dateClass.setInstanceMember('setDate', new FunctionType([{ name: 'date', type: num }], num));
    dateClass.setInstanceMember('setFullYear', new FunctionType([{ name: 'year', type: num }], num));
    dateClass.setInstanceMember('setHours', new FunctionType([{ name: 'hours', type: num }], num));
    dateClass.setInstanceMember('setMilliseconds', new FunctionType([{ name: 'ms', type: num }], num));
    dateClass.setInstanceMember('setMinutes', new FunctionType([{ name: 'min', type: num }], num));
    dateClass.setInstanceMember('setMonth', new FunctionType([{ name: 'month', type: num }], num));
    dateClass.setInstanceMember('setSeconds', new FunctionType([{ name: 'sec', type: num }], num));
    dateClass.setInstanceMember('setTime', new FunctionType([{ name: 'time', type: num }], num));
    dateClass.setInstanceMember('toDateString', new FunctionType([], str));
    dateClass.setInstanceMember('toISOString', new FunctionType([], str));
    dateClass.setInstanceMember('toJSON', new FunctionType([], str));
    dateClass.setInstanceMember('toLocaleDateString', new FunctionType([{ name: 'locales', type: Type.ANY, optional: true }], str));
    dateClass.setInstanceMember('toLocaleString', new FunctionType([{ name: 'locales', type: Type.ANY, optional: true }], str));
    dateClass.setInstanceMember('toLocaleTimeString', new FunctionType([{ name: 'locales', type: Type.ANY, optional: true }], str));
    dateClass.setInstanceMember('toString', new FunctionType([], str));
    dateClass.setInstanceMember('toTimeString', new FunctionType([], str));
    dateClass.setInstanceMember('toUTCString', new FunctionType([], str));
    dateClass.setInstanceMember('valueOf', new FunctionType([], num));

    // Static methods
    dateClass.setStaticMember('now', new FunctionType([], num));
    dateClass.setStaticMember('parse', new FunctionType([{ name: 'dateString', type: str }], num));
    dateClass.setStaticMember('UTC', new FunctionType([{ name: 'year', type: num }, { name: 'month', type: num, optional: true }], num));

    this._globals.set('Date', dateClass);
  };

  // ----------------------------------------
  // RegExp Class
  // ----------------------------------------

  BuiltinTypes.prototype._initRegExpClass = function() {
    var regexpClass = new ClassType('RegExp');
    var str = PrimitiveType.STRING;
    var num = PrimitiveType.NUMBER;
    var bool = PrimitiveType.BOOLEAN;

    // Constructor
    regexpClass.setConstructor(new FunctionType([
      { name: 'pattern', type: Type.ANY },
      { name: 'flags', type: str, optional: true }
    ], Type.ANY));

    // Properties
    regexpClass.setInstanceMember('flags', str);
    regexpClass.setInstanceMember('global', bool);
    regexpClass.setInstanceMember('ignoreCase', bool);
    regexpClass.setInstanceMember('lastIndex', num);
    regexpClass.setInstanceMember('multiline', bool);
    regexpClass.setInstanceMember('source', str);
    regexpClass.setInstanceMember('sticky', bool);
    regexpClass.setInstanceMember('unicode', bool);
    regexpClass.setInstanceMember('dotAll', bool);

    // Methods
    regexpClass.setInstanceMember('exec', new FunctionType([{ name: 'string', type: str }], UnionType.of(new ArrayType(str), PrimitiveType.NULL)));
    regexpClass.setInstanceMember('test', new FunctionType([{ name: 'string', type: str }], bool));
    regexpClass.setInstanceMember('toString', new FunctionType([], str));

    this._globals.set('RegExp', regexpClass);
  };

  // ----------------------------------------
  // Error Class
  // ----------------------------------------

  BuiltinTypes.prototype._initErrorClass = function() {
    var errorClass = new ClassType('Error');
    var str = PrimitiveType.STRING;

    // Constructor
    errorClass.setConstructor(new FunctionType([
      { name: 'message', type: str, optional: true }
    ], Type.ANY));

    // Properties
    errorClass.setInstanceMember('message', str);
    errorClass.setInstanceMember('name', str);
    errorClass.setInstanceMember('stack', UnionType.of(str, PrimitiveType.UNDEFINED));

    // Methods
    errorClass.setInstanceMember('toString', new FunctionType([], str));

    this._globals.set('Error', errorClass);

    // Create subclasses
    var errorTypes = ['TypeError', 'RangeError', 'ReferenceError', 'SyntaxError', 'URIError', 'EvalError'];
    for (var i = 0; i < errorTypes.length; i++) {
      var subClass = new ClassType(errorTypes[i], errorClass);
      this._globals.set(errorTypes[i], subClass);
    }
  };

  // ----------------------------------------
  // Promise Class
  // ----------------------------------------

  BuiltinTypes.prototype._initPromiseClass = function() {
    var promiseClass = new ClassType('Promise');

    // Constructor
    promiseClass.setConstructor(new FunctionType([
      { name: 'executor', type: new FunctionType([
        { name: 'resolve', type: Type.ANY },
        { name: 'reject', type: Type.ANY }
      ], Type.VOID) }
    ], Type.ANY));

    // Instance methods
    promiseClass.setInstanceMember('then', new FunctionType([
      { name: 'onFulfilled', type: Type.ANY, optional: true },
      { name: 'onRejected', type: Type.ANY, optional: true }
    ], Type.ANY));
    promiseClass.setInstanceMember('catch', new FunctionType([
      { name: 'onRejected', type: Type.ANY }
    ], Type.ANY));
    promiseClass.setInstanceMember('finally', new FunctionType([
      { name: 'onFinally', type: Type.ANY }
    ], Type.ANY));

    // Static methods
    promiseClass.setStaticMember('resolve', new FunctionType([{ name: 'value', type: Type.ANY, optional: true }], Type.ANY));
    promiseClass.setStaticMember('reject', new FunctionType([{ name: 'reason', type: Type.ANY, optional: true }], Type.ANY));
    promiseClass.setStaticMember('all', new FunctionType([{ name: 'values', type: Type.ANY }], Type.ANY));
    promiseClass.setStaticMember('allSettled', new FunctionType([{ name: 'values', type: Type.ANY }], Type.ANY));
    promiseClass.setStaticMember('any', new FunctionType([{ name: 'values', type: Type.ANY }], Type.ANY));
    promiseClass.setStaticMember('race', new FunctionType([{ name: 'values', type: Type.ANY }], Type.ANY));

    this._globals.set('Promise', promiseClass);
  };

  // ----------------------------------------
  // Global Functions
  // ----------------------------------------

  BuiltinTypes.prototype._initGlobalFunctions = function() {
    var str = PrimitiveType.STRING;
    var num = PrimitiveType.NUMBER;
    var bool = PrimitiveType.BOOLEAN;

    this._globals.set('parseInt', new FunctionType([{ name: 'string', type: str }, { name: 'radix', type: num, optional: true }], num));
    this._globals.set('parseFloat', new FunctionType([{ name: 'string', type: str }], num));
    this._globals.set('isNaN', new FunctionType([{ name: 'value', type: Type.ANY }], bool));
    this._globals.set('isFinite', new FunctionType([{ name: 'value', type: Type.ANY }], bool));
    this._globals.set('encodeURI', new FunctionType([{ name: 'uri', type: str }], str));
    this._globals.set('encodeURIComponent', new FunctionType([{ name: 'uriComponent', type: str }], str));
    this._globals.set('decodeURI', new FunctionType([{ name: 'encodedURI', type: str }], str));
    this._globals.set('decodeURIComponent', new FunctionType([{ name: 'encodedURIComponent', type: str }], str));
    this._globals.set('eval', new FunctionType([{ name: 'script', type: str }], Type.ANY));

    // Global constants
    this._globals.set('undefined', PrimitiveType.UNDEFINED);
    this._globals.set('NaN', num);
    this._globals.set('Infinity', num);

    // Array constructor
    this._globals.set('Array', new ObjectType({
      isArray: new FunctionType([{ name: 'value', type: Type.ANY }], bool),
      from: new FunctionType([{ name: 'arrayLike', type: Type.ANY }, { name: 'mapFn', type: Type.ANY, optional: true }], new ArrayType(Type.ANY)),
      of: new FunctionType([{ name: 'items', type: Type.ANY, rest: true }], new ArrayType(Type.ANY))
    }));

    // Number constructor
    this._globals.set('Number', new ObjectType({
      isFinite: new FunctionType([{ name: 'value', type: Type.ANY }], bool),
      isInteger: new FunctionType([{ name: 'value', type: Type.ANY }], bool),
      isNaN: new FunctionType([{ name: 'value', type: Type.ANY }], bool),
      isSafeInteger: new FunctionType([{ name: 'value', type: Type.ANY }], bool),
      parseFloat: new FunctionType([{ name: 'string', type: str }], num),
      parseInt: new FunctionType([{ name: 'string', type: str }, { name: 'radix', type: num, optional: true }], num),
      MAX_VALUE: num,
      MIN_VALUE: num,
      MAX_SAFE_INTEGER: num,
      MIN_SAFE_INTEGER: num,
      POSITIVE_INFINITY: num,
      NEGATIVE_INFINITY: num,
      NaN: num,
      EPSILON: num
    }));

    // String constructor
    this._globals.set('String', new ObjectType({
      fromCharCode: new FunctionType([{ name: 'codes', type: num, rest: true }], str),
      fromCodePoint: new FunctionType([{ name: 'codePoints', type: num, rest: true }], str),
      raw: new FunctionType([{ name: 'template', type: Type.ANY }], str)
    }));

    // Boolean constructor
    this._globals.set('Boolean', new FunctionType([{ name: 'value', type: Type.ANY }], bool));
  };

  // ----------------------------------------
  // Public API
  // ----------------------------------------

  /**
   * Get a global type by name
   * @param {string} name - Global name
   * @returns {Type|null}
   */
  BuiltinTypes.prototype.getGlobalType = function(name) {
    return this._globals.get(name) || null;
  };

  /**
   * Get prototype method for a type
   * @param {Type} type - The type
   * @param {string} methodName - Method name
   * @returns {Type|null}
   */
  BuiltinTypes.prototype.getPrototypeMethod = function(type, methodName) {
    if (!type) return null;

    var methods = this._prototypeMethods.get(type.kind);
    if (methods) {
      return methods.get(methodName) || null;
    }

    return null;
  };

  /**
   * Check if a name is a global
   * @param {string} name - Name to check
   * @returns {boolean}
   */
  BuiltinTypes.prototype.isGlobal = function(name) {
    return this._globals.has(name);
  };

  /**
   * Get all global names
   * @returns {string[]}
   */
  BuiltinTypes.prototype.getGlobalNames = function() {
    return Array.from(this._globals.keys());
  };

  // ============================================
  // Singleton Instance
  // ============================================

  /**
   * Singleton instance
   * @type {BuiltinTypes}
   */
  BuiltinTypes._instance = null;

  /**
   * Get singleton instance
   * @returns {BuiltinTypes}
   */
  BuiltinTypes.getInstance = function() {
    if (!BuiltinTypes._instance) {
      BuiltinTypes._instance = new BuiltinTypes();
    }
    return BuiltinTypes._instance;
  };

  // ============================================
  // Export
  // ============================================

  CodeEditor.BuiltinTypes = BuiltinTypes;

})(window.CodeEditor = window.CodeEditor || {});
