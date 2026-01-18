/**
 * @fileoverview Unit tests for ArrayType class
 */

describe('ArrayType', function() {
  var ArrayType = CodeEditor.ArrayType;
  var PrimitiveType = CodeEditor.PrimitiveType;
  var Type = CodeEditor.Type;
  var TypeKind = CodeEditor.TypeKind;

  describe('constructor', function() {
    it('should create array with specified element type', function() {
      var arr = new ArrayType(PrimitiveType.NUMBER);
      expect(arr.kind).toBe(TypeKind.ARRAY);
      expect(arr.elementType).toBe(PrimitiveType.NUMBER);
    });

    it('should default to ANY element type', function() {
      var arr = new ArrayType();
      expect(arr.elementType).toBe(Type.ANY);
    });
  });

  describe('elementType', function() {
    it('should store the element type', function() {
      var arr = new ArrayType(PrimitiveType.STRING);
      expect(arr.elementType).toBe(PrimitiveType.STRING);
    });
  });

  describe('getMember', function() {
    it('should return method from instance methods', function() {
      var arr = new ArrayType(PrimitiveType.NUMBER);
      // Methods are set by BuiltinTypes, so we test the mechanism
      arr.setMethod('customMethod', PrimitiveType.STRING);
      expect(arr.getMember('customMethod')).toBe(PrimitiveType.STRING);
    });

    it('should return null for unknown method', function() {
      var arr = new ArrayType(PrimitiveType.NUMBER);
      expect(arr.getMember('unknownMethod')).toBeNull();
    });
  });

  describe('getMemberNames', function() {
    it('should return method names', function() {
      var arr = new ArrayType(PrimitiveType.NUMBER);
      arr.setMethod('push', PrimitiveType.NUMBER);
      arr.setMethod('pop', PrimitiveType.NUMBER);
      var names = arr.getMemberNames();
      expect(names).toContain('push');
      expect(names).toContain('pop');
    });
  });

  describe('equals', function() {
    it('should return true for same element type', function() {
      var arr1 = new ArrayType(PrimitiveType.NUMBER);
      var arr2 = new ArrayType(PrimitiveType.NUMBER);
      expect(arr1.equals(arr2)).toBe(true);
    });

    it('should return false for different element type', function() {
      var arr1 = new ArrayType(PrimitiveType.NUMBER);
      var arr2 = new ArrayType(PrimitiveType.STRING);
      expect(arr1.equals(arr2)).toBe(false);
    });

    it('should return false for non-array types', function() {
      var arr = new ArrayType(PrimitiveType.NUMBER);
      expect(arr.equals(PrimitiveType.NUMBER)).toBe(false);
    });
  });

  describe('isAssignableTo', function() {
    it('should be assignable to same element type', function() {
      var arr1 = new ArrayType(PrimitiveType.NUMBER);
      var arr2 = new ArrayType(PrimitiveType.NUMBER);
      expect(arr1.isAssignableTo(arr2)).toBe(true);
    });

    it('should be assignable to ANY', function() {
      var arr = new ArrayType(PrimitiveType.NUMBER);
      expect(arr.isAssignableTo(Type.ANY)).toBe(true);
    });

    it('should not be assignable to different element type', function() {
      var arr1 = new ArrayType(PrimitiveType.NUMBER);
      var arr2 = new ArrayType(PrimitiveType.STRING);
      expect(arr1.isAssignableTo(arr2)).toBe(false);
    });

    it('should not be assignable to non-array type', function() {
      var arr = new ArrayType(PrimitiveType.NUMBER);
      expect(arr.isAssignableTo(PrimitiveType.NUMBER)).toBe(false);
    });
  });

  describe('toString', function() {
    it('should return element type with brackets', function() {
      var arr = new ArrayType(PrimitiveType.NUMBER);
      expect(arr.toString()).toBe('number[]');
    });

    it('should wrap complex types in parentheses', function() {
      var UnionType = CodeEditor.UnionType;
      var union = new UnionType([PrimitiveType.STRING, PrimitiveType.NUMBER]);
      var arr = new ArrayType(union);
      expect(arr.toString()).toContain('(');
    });
  });

  describe('clone', function() {
    it('should create a copy with cloned element type', function() {
      var arr = new ArrayType(PrimitiveType.NUMBER);
      var cloned = arr.clone();
      expect(cloned.equals(arr)).toBe(true);
      expect(cloned).not.toBe(arr);
    });
  });

  describe('withElementType', function() {
    it('should create new array with different element type', function() {
      var arr = new ArrayType(PrimitiveType.NUMBER);
      var newArr = arr.withElementType(PrimitiveType.STRING);
      expect(newArr.elementType).toBe(PrimitiveType.STRING);
      expect(arr.elementType).toBe(PrimitiveType.NUMBER);
    });
  });

  describe('factory functions', function() {
    it('ArrayType.ofAny should create array with ANY element', function() {
      var arr = ArrayType.ofAny();
      expect(arr.elementType).toBe(Type.ANY);
    });
  });

  describe('static shared methods', function() {
    it('should support setSharedMethod', function() {
      ArrayType.setSharedMethod('testMethod', PrimitiveType.BOOLEAN);
      var arr = new ArrayType(PrimitiveType.NUMBER);
      expect(arr.getMember('testMethod')).toBe(PrimitiveType.BOOLEAN);
      // Cleanup
      ArrayType._sharedMethods.delete('testMethod');
    });
  });
});
