/**
 * @fileoverview Unit tests for Type base class
 */

describe('Type', function() {
  var Type = CodeEditor.Type;
  var TypeKind = CodeEditor.TypeKind;

  describe('constructor', function() {
    it('should create a type with the given kind', function() {
      var type = new Type(TypeKind.STRING);
      expect(type.kind).toBe(TypeKind.STRING);
    });

    it('should default to ANY kind if not provided', function() {
      var type = new Type();
      expect(type.kind).toBe(TypeKind.ANY);
    });
  });

  describe('singletons', function() {
    describe('Type.ANY', function() {
      it('should exist', function() {
        expect(Type.ANY).toBeDefined();
      });

      it('should have kind "any"', function() {
        expect(Type.ANY.kind).toBe(TypeKind.ANY);
      });

      it('should be a singleton', function() {
        expect(Type.ANY).toBe(Type.ANY);
      });
    });

    describe('Type.VOID', function() {
      it('should exist', function() {
        expect(Type.VOID).toBeDefined();
      });

      it('should have kind "void"', function() {
        expect(Type.VOID.kind).toBe(TypeKind.VOID);
      });
    });

    describe('Type.NEVER', function() {
      it('should exist', function() {
        expect(Type.NEVER).toBeDefined();
      });

      it('should have kind "never"', function() {
        expect(Type.NEVER.kind).toBe(TypeKind.NEVER);
      });
    });

    describe('Type.UNKNOWN', function() {
      it('should exist', function() {
        expect(Type.UNKNOWN).toBeDefined();
      });

      it('should have kind "unknown"', function() {
        expect(Type.UNKNOWN.kind).toBe(TypeKind.UNKNOWN);
      });
    });
  });

  describe('getMember', function() {
    it('should return null for base Type', function() {
      var type = new Type(TypeKind.STRING);
      expect(type.getMember('foo')).toBeNull();
    });
  });

  describe('getMemberNames', function() {
    it('should return empty array for base Type', function() {
      var type = new Type(TypeKind.STRING);
      expect(type.getMemberNames()).toEqual([]);
    });
  });

  describe('equals', function() {
    it('should return true for same type', function() {
      var type1 = new Type(TypeKind.STRING);
      var type2 = new Type(TypeKind.STRING);
      expect(type1.equals(type2)).toBe(true);
    });

    it('should return false for different types', function() {
      var type1 = new Type(TypeKind.STRING);
      var type2 = new Type(TypeKind.NUMBER);
      expect(type1.equals(type2)).toBe(false);
    });

    it('should return false for null', function() {
      var type = new Type(TypeKind.STRING);
      expect(type.equals(null)).toBe(false);
    });

    it('should work with singletons', function() {
      expect(Type.ANY.equals(Type.ANY)).toBe(true);
      expect(Type.ANY.equals(Type.VOID)).toBe(false);
    });
  });

  describe('isAssignableTo', function() {
    it('should return true for same type', function() {
      var type1 = new Type(TypeKind.STRING);
      var type2 = new Type(TypeKind.STRING);
      expect(type1.isAssignableTo(type2)).toBe(true);
    });

    it('should return true when target is ANY', function() {
      var type = new Type(TypeKind.STRING);
      expect(type.isAssignableTo(Type.ANY)).toBe(true);
    });

    it('should return false for null target', function() {
      var type = new Type(TypeKind.STRING);
      expect(type.isAssignableTo(null)).toBe(false);
    });
  });

  describe('toString', function() {
    it('should return the kind as string', function() {
      var type = new Type(TypeKind.STRING);
      expect(type.toString()).toBe('string');
    });
  });

  describe('clone', function() {
    it('should create a copy with the same kind', function() {
      var type = new Type(TypeKind.STRING);
      var cloned = type.clone();
      expect(cloned.kind).toBe(TypeKind.STRING);
      expect(cloned).not.toBe(type);
    });
  });
});
