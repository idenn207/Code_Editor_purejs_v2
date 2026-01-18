/**
 * @fileoverview Unit tests for FunctionType class
 */

describe('FunctionType', function() {
  var FunctionType = CodeEditor.FunctionType;
  var PrimitiveType = CodeEditor.PrimitiveType;
  var Type = CodeEditor.Type;
  var TypeKind = CodeEditor.TypeKind;

  describe('constructor', function() {
    it('should create function with params and return type', function() {
      var fn = new FunctionType(
        [{ name: 'x', type: PrimitiveType.NUMBER }],
        PrimitiveType.STRING
      );
      expect(fn.kind).toBe(TypeKind.FUNCTION);
      expect(fn.returnType).toBe(PrimitiveType.STRING);
    });

    it('should default to empty params', function() {
      var fn = new FunctionType();
      expect(fn.params).toEqual([]);
    });

    it('should default to VOID return type', function() {
      var fn = new FunctionType([]);
      expect(fn.returnType).toBe(Type.VOID);
    });

    it('should normalize parameter objects', function() {
      var fn = new FunctionType([{ name: 'x' }], PrimitiveType.NUMBER);
      expect(fn.params[0].type).toBe(Type.ANY);
      expect(fn.params[0].optional).toBe(false);
      expect(fn.params[0].rest).toBe(false);
    });
  });

  describe('getParamType', function() {
    it('should return parameter type by index', function() {
      var fn = new FunctionType([
        { name: 'x', type: PrimitiveType.NUMBER },
        { name: 'y', type: PrimitiveType.STRING }
      ], Type.VOID);
      expect(fn.getParamType(0)).toBe(PrimitiveType.NUMBER);
      expect(fn.getParamType(1)).toBe(PrimitiveType.STRING);
    });

    it('should return null for out of range index', function() {
      var fn = new FunctionType([{ name: 'x', type: PrimitiveType.NUMBER }], Type.VOID);
      expect(fn.getParamType(5)).toBeNull();
    });

    it('should return rest parameter type for extra indices', function() {
      var fn = new FunctionType([
        { name: 'args', type: PrimitiveType.NUMBER, rest: true }
      ], Type.VOID);
      expect(fn.getParamType(0)).toBe(PrimitiveType.NUMBER);
      expect(fn.getParamType(5)).toBe(PrimitiveType.NUMBER);
    });
  });

  describe('getParamName', function() {
    it('should return parameter name by index', function() {
      var fn = new FunctionType([{ name: 'myParam', type: PrimitiveType.NUMBER }], Type.VOID);
      expect(fn.getParamName(0)).toBe('myParam');
    });

    it('should return null for out of range index', function() {
      var fn = new FunctionType([], Type.VOID);
      expect(fn.getParamName(0)).toBeNull();
    });
  });

  describe('getRequiredParamCount', function() {
    it('should count required parameters only', function() {
      var fn = new FunctionType([
        { name: 'a', type: PrimitiveType.NUMBER },
        { name: 'b', type: PrimitiveType.NUMBER },
        { name: 'c', type: PrimitiveType.NUMBER, optional: true }
      ], Type.VOID);
      expect(fn.getRequiredParamCount()).toBe(2);
    });

    it('should not count rest parameters', function() {
      var fn = new FunctionType([
        { name: 'a', type: PrimitiveType.NUMBER },
        { name: 'rest', type: PrimitiveType.NUMBER, rest: true }
      ], Type.VOID);
      expect(fn.getRequiredParamCount()).toBe(1);
    });
  });

  describe('getParamCount', function() {
    it('should return total parameter count', function() {
      var fn = new FunctionType([
        { name: 'a', type: PrimitiveType.NUMBER },
        { name: 'b', type: PrimitiveType.STRING }
      ], Type.VOID);
      expect(fn.getParamCount()).toBe(2);
    });
  });

  describe('hasRestParam', function() {
    it('should return true if last param is rest', function() {
      var fn = new FunctionType([
        { name: 'args', type: PrimitiveType.NUMBER, rest: true }
      ], Type.VOID);
      expect(fn.hasRestParam()).toBe(true);
    });

    it('should return false if no rest param', function() {
      var fn = new FunctionType([{ name: 'x', type: PrimitiveType.NUMBER }], Type.VOID);
      expect(fn.hasRestParam()).toBe(false);
    });
  });

  describe('equals', function() {
    it('should return true for same signature', function() {
      var fn1 = new FunctionType([{ name: 'x', type: PrimitiveType.NUMBER }], PrimitiveType.STRING);
      var fn2 = new FunctionType([{ name: 'y', type: PrimitiveType.NUMBER }], PrimitiveType.STRING);
      expect(fn1.equals(fn2)).toBe(true);
    });

    it('should return false for different param count', function() {
      var fn1 = new FunctionType([{ name: 'x', type: PrimitiveType.NUMBER }], PrimitiveType.STRING);
      var fn2 = new FunctionType([], PrimitiveType.STRING);
      expect(fn1.equals(fn2)).toBe(false);
    });

    it('should return false for different param types', function() {
      var fn1 = new FunctionType([{ name: 'x', type: PrimitiveType.NUMBER }], PrimitiveType.STRING);
      var fn2 = new FunctionType([{ name: 'x', type: PrimitiveType.STRING }], PrimitiveType.STRING);
      expect(fn1.equals(fn2)).toBe(false);
    });

    it('should return false for different return types', function() {
      var fn1 = new FunctionType([], PrimitiveType.STRING);
      var fn2 = new FunctionType([], PrimitiveType.NUMBER);
      expect(fn1.equals(fn2)).toBe(false);
    });
  });

  describe('isAssignableTo', function() {
    it('should be assignable to ANY', function() {
      var fn = new FunctionType([], Type.VOID);
      expect(fn.isAssignableTo(Type.ANY)).toBe(true);
    });

    it('should not be assignable to non-function', function() {
      var fn = new FunctionType([], Type.VOID);
      expect(fn.isAssignableTo(PrimitiveType.STRING)).toBe(false);
    });
  });

  describe('toString', function() {
    it('should return arrow function format', function() {
      var fn = new FunctionType(
        [{ name: 'x', type: PrimitiveType.NUMBER }],
        PrimitiveType.STRING
      );
      var str = fn.toString();
      expect(str).toContain('x');
      expect(str).toContain('number');
      expect(str).toContain('=>');
      expect(str).toContain('string');
    });

    it('should show optional params with ?', function() {
      var fn = new FunctionType(
        [{ name: 'x', type: PrimitiveType.NUMBER, optional: true }],
        Type.VOID
      );
      expect(fn.toString()).toContain('x?');
    });

    it('should show rest params with ...', function() {
      var fn = new FunctionType(
        [{ name: 'args', type: PrimitiveType.NUMBER, rest: true }],
        Type.VOID
      );
      expect(fn.toString()).toContain('...args');
    });
  });

  describe('clone', function() {
    it('should create a deep copy', function() {
      var fn = new FunctionType(
        [{ name: 'x', type: PrimitiveType.NUMBER }],
        PrimitiveType.STRING
      );
      fn.isAsync = true;
      var cloned = fn.clone();
      expect(cloned.equals(fn)).toBe(true);
      expect(cloned.isAsync).toBe(true);
      expect(cloned).not.toBe(fn);
    });
  });

  describe('isCallable', function() {
    it('should always return true', function() {
      var fn = new FunctionType([], Type.VOID);
      expect(fn.isCallable()).toBe(true);
    });
  });

  describe('factory functions', function() {
    it('FunctionType.voidFunction should create void function', function() {
      var fn = FunctionType.voidFunction();
      expect(fn.params).toEqual([]);
      expect(fn.returnType).toBe(Type.VOID);
    });

    it('FunctionType.returning should create function with return type', function() {
      var fn = FunctionType.returning(PrimitiveType.STRING);
      expect(fn.params).toEqual([]);
      expect(fn.returnType).toBe(PrimitiveType.STRING);
    });

    it('FunctionType.predicate should create predicate function', function() {
      var fn = FunctionType.predicate(PrimitiveType.NUMBER);
      expect(fn.getParamCount()).toBe(1);
      expect(fn.returnType.kind).toBe(TypeKind.BOOLEAN);
    });
  });
});
