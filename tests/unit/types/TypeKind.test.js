/**
 * @fileoverview Unit tests for TypeKind enum
 */

describe('TypeKind', function() {
  var TypeKind = CodeEditor.TypeKind;

  describe('enum values', function() {
    it('should have STRING type', function() {
      expect(TypeKind.STRING).toBe('string');
    });

    it('should have NUMBER type', function() {
      expect(TypeKind.NUMBER).toBe('number');
    });

    it('should have BOOLEAN type', function() {
      expect(TypeKind.BOOLEAN).toBe('boolean');
    });

    it('should have NULL type', function() {
      expect(TypeKind.NULL).toBe('null');
    });

    it('should have UNDEFINED type', function() {
      expect(TypeKind.UNDEFINED).toBe('undefined');
    });

    it('should have OBJECT type', function() {
      expect(TypeKind.OBJECT).toBe('object');
    });

    it('should have ARRAY type', function() {
      expect(TypeKind.ARRAY).toBe('array');
    });

    it('should have FUNCTION type', function() {
      expect(TypeKind.FUNCTION).toBe('function');
    });

    it('should have CLASS type', function() {
      expect(TypeKind.CLASS).toBe('class');
    });

    it('should have INSTANCE type', function() {
      expect(TypeKind.INSTANCE).toBe('instance');
    });

    it('should have UNION type', function() {
      expect(TypeKind.UNION).toBe('union');
    });

    it('should have ANY type', function() {
      expect(TypeKind.ANY).toBe('any');
    });

    it('should have VOID type', function() {
      expect(TypeKind.VOID).toBe('void');
    });

    it('should have NEVER type', function() {
      expect(TypeKind.NEVER).toBe('never');
    });
  });

  describe('immutability', function() {
    it('should be frozen (immutable)', function() {
      expect(Object.isFrozen(TypeKind)).toBe(true);
    });

    it('should not allow adding new properties', function() {
      expect(function() {
        TypeKind.NEW_TYPE = 'new';
      }).not.toThrow();
      // Even though it doesn't throw in strict mode, the value won't be added
      expect(TypeKind.NEW_TYPE).toBeUndefined();
    });
  });
});
