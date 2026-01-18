/**
 * @fileoverview Unit tests for PrimitiveType class
 */

describe('PrimitiveType', function() {
  var PrimitiveType = CodeEditor.PrimitiveType;
  var TypeKind = CodeEditor.TypeKind;

  describe('singletons', function() {
    it('should have STRING singleton', function() {
      expect(PrimitiveType.STRING).toBeDefined();
      expect(PrimitiveType.STRING.kind).toBe(TypeKind.STRING);
    });

    it('should have NUMBER singleton', function() {
      expect(PrimitiveType.NUMBER).toBeDefined();
      expect(PrimitiveType.NUMBER.kind).toBe(TypeKind.NUMBER);
    });

    it('should have BOOLEAN singleton', function() {
      expect(PrimitiveType.BOOLEAN).toBeDefined();
      expect(PrimitiveType.BOOLEAN.kind).toBe(TypeKind.BOOLEAN);
    });

    it('should have NULL singleton', function() {
      expect(PrimitiveType.NULL).toBeDefined();
      expect(PrimitiveType.NULL.kind).toBe(TypeKind.NULL);
    });

    it('should have UNDEFINED singleton', function() {
      expect(PrimitiveType.UNDEFINED).toBeDefined();
      expect(PrimitiveType.UNDEFINED.kind).toBe(TypeKind.UNDEFINED);
    });

    it('should have SYMBOL singleton', function() {
      expect(PrimitiveType.SYMBOL).toBeDefined();
      expect(PrimitiveType.SYMBOL.kind).toBe(TypeKind.SYMBOL);
    });

    it('should have BIGINT singleton', function() {
      expect(PrimitiveType.BIGINT).toBeDefined();
      expect(PrimitiveType.BIGINT.kind).toBe(TypeKind.BIGINT);
    });
  });

  describe('fromKind', function() {
    it('should return STRING for string kind', function() {
      expect(PrimitiveType.fromKind(TypeKind.STRING)).toBe(PrimitiveType.STRING);
    });

    it('should return NUMBER for number kind', function() {
      expect(PrimitiveType.fromKind(TypeKind.NUMBER)).toBe(PrimitiveType.NUMBER);
    });

    it('should return BOOLEAN for boolean kind', function() {
      expect(PrimitiveType.fromKind(TypeKind.BOOLEAN)).toBe(PrimitiveType.BOOLEAN);
    });

    it('should return null for non-primitive kind', function() {
      expect(PrimitiveType.fromKind(TypeKind.OBJECT)).toBeNull();
    });
  });

  describe('fromValue', function() {
    it('should return STRING for string values', function() {
      expect(PrimitiveType.fromValue('hello')).toBe(PrimitiveType.STRING);
      expect(PrimitiveType.fromValue('')).toBe(PrimitiveType.STRING);
    });

    it('should return NUMBER for number values', function() {
      expect(PrimitiveType.fromValue(42)).toBe(PrimitiveType.NUMBER);
      expect(PrimitiveType.fromValue(3.14)).toBe(PrimitiveType.NUMBER);
      expect(PrimitiveType.fromValue(0)).toBe(PrimitiveType.NUMBER);
      expect(PrimitiveType.fromValue(NaN)).toBe(PrimitiveType.NUMBER);
    });

    it('should return BOOLEAN for boolean values', function() {
      expect(PrimitiveType.fromValue(true)).toBe(PrimitiveType.BOOLEAN);
      expect(PrimitiveType.fromValue(false)).toBe(PrimitiveType.BOOLEAN);
    });

    it('should return NULL for null', function() {
      expect(PrimitiveType.fromValue(null)).toBe(PrimitiveType.NULL);
    });

    it('should return UNDEFINED for undefined', function() {
      expect(PrimitiveType.fromValue(undefined)).toBe(PrimitiveType.UNDEFINED);
    });

    it('should return null for objects', function() {
      expect(PrimitiveType.fromValue({})).toBeNull();
      expect(PrimitiveType.fromValue([])).toBeNull();
    });
  });

  describe('equals', function() {
    it('should return true for same primitive type', function() {
      expect(PrimitiveType.STRING.equals(PrimitiveType.STRING)).toBe(true);
    });

    it('should return false for different primitive types', function() {
      expect(PrimitiveType.STRING.equals(PrimitiveType.NUMBER)).toBe(false);
    });
  });

  describe('isAssignableTo', function() {
    it('should be assignable to same type', function() {
      expect(PrimitiveType.STRING.isAssignableTo(PrimitiveType.STRING)).toBe(true);
    });

    it('should be assignable to ANY', function() {
      expect(PrimitiveType.STRING.isAssignableTo(CodeEditor.Type.ANY)).toBe(true);
    });

    it('should not be assignable to different primitive', function() {
      expect(PrimitiveType.STRING.isAssignableTo(PrimitiveType.NUMBER)).toBe(false);
    });
  });

  describe('toString', function() {
    it('should return "string" for STRING', function() {
      expect(PrimitiveType.STRING.toString()).toBe('string');
    });

    it('should return "number" for NUMBER', function() {
      expect(PrimitiveType.NUMBER.toString()).toBe('number');
    });

    it('should return "boolean" for BOOLEAN', function() {
      expect(PrimitiveType.BOOLEAN.toString()).toBe('boolean');
    });
  });

  describe('clone', function() {
    it('should return the same singleton', function() {
      expect(PrimitiveType.STRING.clone()).toBe(PrimitiveType.STRING);
    });
  });

  describe('isPrimitive', function() {
    it('should return true for primitive types', function() {
      expect(PrimitiveType.isPrimitive(PrimitiveType.STRING)).toBe(true);
      expect(PrimitiveType.isPrimitive(PrimitiveType.NUMBER)).toBe(true);
      expect(PrimitiveType.isPrimitive(PrimitiveType.BOOLEAN)).toBe(true);
    });

    it('should return false for non-primitive types', function() {
      expect(PrimitiveType.isPrimitive(CodeEditor.Type.ANY)).toBe(false);
    });
  });
});
