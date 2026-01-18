/**
 * @fileoverview Unit tests for UnionType class
 */

describe('UnionType', function() {
  var UnionType = CodeEditor.UnionType;
  var PrimitiveType = CodeEditor.PrimitiveType;
  var ObjectType = CodeEditor.ObjectType;
  var Type = CodeEditor.Type;
  var TypeKind = CodeEditor.TypeKind;

  describe('constructor', function() {
    it('should create union with types', function() {
      var union = new UnionType([PrimitiveType.STRING, PrimitiveType.NUMBER]);
      expect(union.kind).toBe(TypeKind.UNION);
      expect(union.size()).toBe(2);
    });

    it('should create empty union if no types', function() {
      var union = new UnionType();
      expect(union.size()).toBe(0);
    });

    it('should flatten nested unions', function() {
      var inner = new UnionType([PrimitiveType.STRING, PrimitiveType.NUMBER]);
      var outer = new UnionType([inner, PrimitiveType.BOOLEAN]);
      expect(outer.size()).toBe(3);
    });

    it('should deduplicate types', function() {
      var union = new UnionType([PrimitiveType.STRING, PrimitiveType.STRING]);
      expect(union.size()).toBe(1);
    });

    it('should skip never type', function() {
      var union = new UnionType([PrimitiveType.STRING, Type.NEVER]);
      expect(union.size()).toBe(1);
      expect(union.contains(Type.NEVER)).toBe(false);
    });
  });

  describe('add', function() {
    it('should add a type to the union', function() {
      var union = new UnionType([PrimitiveType.STRING]);
      union.add(PrimitiveType.NUMBER);
      expect(union.size()).toBe(2);
    });

    it('should return this for chaining', function() {
      var union = new UnionType();
      expect(union.add(PrimitiveType.STRING)).toBe(union);
    });

    it('should not add duplicates', function() {
      var union = new UnionType([PrimitiveType.STRING]);
      union.add(PrimitiveType.STRING);
      expect(union.size()).toBe(1);
    });
  });

  describe('size / isEmpty', function() {
    it('should return correct size', function() {
      var union = new UnionType([PrimitiveType.STRING, PrimitiveType.NUMBER]);
      expect(union.size()).toBe(2);
    });

    it('should detect empty union', function() {
      var union = new UnionType();
      expect(union.isEmpty()).toBe(true);
    });

    it('should detect non-empty union', function() {
      var union = new UnionType([PrimitiveType.STRING]);
      expect(union.isEmpty()).toBe(false);
    });
  });

  describe('contains', function() {
    it('should return true for contained type', function() {
      var union = new UnionType([PrimitiveType.STRING, PrimitiveType.NUMBER]);
      expect(union.contains(PrimitiveType.STRING)).toBe(true);
    });

    it('should return false for non-contained type', function() {
      var union = new UnionType([PrimitiveType.STRING]);
      expect(union.contains(PrimitiveType.NUMBER)).toBe(false);
    });
  });

  describe('getMember', function() {
    it('should return member that exists on all types', function() {
      var obj1 = new ObjectType({ name: PrimitiveType.STRING, age: PrimitiveType.NUMBER });
      var obj2 = new ObjectType({ name: PrimitiveType.STRING, count: PrimitiveType.NUMBER });
      var union = new UnionType([obj1, obj2]);
      expect(union.getMember('name')).toBe(PrimitiveType.STRING);
    });

    it('should return null if member missing from any type', function() {
      var obj1 = new ObjectType({ name: PrimitiveType.STRING });
      var obj2 = new ObjectType({ count: PrimitiveType.NUMBER });
      var union = new UnionType([obj1, obj2]);
      expect(union.getMember('name')).toBeNull();
    });

    it('should return null for empty union', function() {
      var union = new UnionType();
      expect(union.getMember('name')).toBeNull();
    });
  });

  describe('getMemberNames', function() {
    it('should return common member names', function() {
      var obj1 = new ObjectType({ name: PrimitiveType.STRING, age: PrimitiveType.NUMBER });
      var obj2 = new ObjectType({ name: PrimitiveType.STRING, count: PrimitiveType.NUMBER });
      var union = new UnionType([obj1, obj2]);
      var names = union.getMemberNames();
      expect(names).toContain('name');
      expect(names).not.toContain('age');
      expect(names).not.toContain('count');
    });
  });

  describe('equals', function() {
    it('should return true for same types', function() {
      var union1 = new UnionType([PrimitiveType.STRING, PrimitiveType.NUMBER]);
      var union2 = new UnionType([PrimitiveType.NUMBER, PrimitiveType.STRING]);
      expect(union1.equals(union2)).toBe(true);
    });

    it('should return false for different types', function() {
      var union1 = new UnionType([PrimitiveType.STRING]);
      var union2 = new UnionType([PrimitiveType.NUMBER]);
      expect(union1.equals(union2)).toBe(false);
    });

    it('should return false for different size', function() {
      var union1 = new UnionType([PrimitiveType.STRING]);
      var union2 = new UnionType([PrimitiveType.STRING, PrimitiveType.NUMBER]);
      expect(union1.equals(union2)).toBe(false);
    });

    it('should return false for non-union', function() {
      var union = new UnionType([PrimitiveType.STRING]);
      expect(union.equals(PrimitiveType.STRING)).toBe(false);
    });
  });

  describe('isAssignableTo', function() {
    it('should be assignable to ANY', function() {
      var union = new UnionType([PrimitiveType.STRING, PrimitiveType.NUMBER]);
      expect(union.isAssignableTo(Type.ANY)).toBe(true);
    });

    it('should be assignable if all types assignable to target union', function() {
      var source = new UnionType([PrimitiveType.STRING]);
      var target = new UnionType([PrimitiveType.STRING, PrimitiveType.NUMBER]);
      expect(source.isAssignableTo(target)).toBe(true);
    });

    it('should not be assignable if any type not in target', function() {
      var source = new UnionType([PrimitiveType.STRING, PrimitiveType.BOOLEAN]);
      var target = new UnionType([PrimitiveType.STRING, PrimitiveType.NUMBER]);
      expect(source.isAssignableTo(target)).toBe(false);
    });
  });

  describe('toString', function() {
    it('should return pipe-separated types', function() {
      var union = new UnionType([PrimitiveType.STRING, PrimitiveType.NUMBER]);
      var str = union.toString();
      expect(str).toContain('string');
      expect(str).toContain('|');
      expect(str).toContain('number');
    });

    it('should return never for empty union', function() {
      var union = new UnionType();
      expect(union.toString()).toBe('never');
    });
  });

  describe('clone', function() {
    it('should create a deep copy', function() {
      var union = new UnionType([PrimitiveType.STRING, PrimitiveType.NUMBER]);
      var cloned = union.clone();
      expect(cloned.equals(union)).toBe(true);
      expect(cloned).not.toBe(union);
    });
  });

  describe('simplify', function() {
    it('should return never for empty union', function() {
      var union = new UnionType();
      expect(union.simplify()).toBe(Type.NEVER);
    });

    it('should return single type for one-element union', function() {
      var union = new UnionType([PrimitiveType.STRING]);
      expect(union.simplify()).toBe(PrimitiveType.STRING);
    });

    it('should return ANY if union contains ANY', function() {
      var union = new UnionType([PrimitiveType.STRING, Type.ANY]);
      expect(union.simplify()).toBe(Type.ANY);
    });

    it('should return self for multi-type union', function() {
      var union = new UnionType([PrimitiveType.STRING, PrimitiveType.NUMBER]);
      expect(union.simplify()).toBe(union);
    });
  });

  describe('filter', function() {
    it('should filter types by predicate', function() {
      var union = new UnionType([PrimitiveType.STRING, PrimitiveType.NUMBER, PrimitiveType.BOOLEAN]);
      var filtered = union.filter(function(t) {
        return t.kind === TypeKind.STRING || t.kind === TypeKind.NUMBER;
      });
      expect(filtered.size()).toBe(2);
      expect(filtered.contains(PrimitiveType.BOOLEAN)).toBe(false);
    });
  });

  describe('isNullable', function() {
    it('should return true if contains null', function() {
      var union = new UnionType([PrimitiveType.STRING, PrimitiveType.NULL]);
      expect(union.isNullable()).toBe(true);
    });

    it('should return true if contains undefined', function() {
      var union = new UnionType([PrimitiveType.STRING, PrimitiveType.UNDEFINED]);
      expect(union.isNullable()).toBe(true);
    });

    it('should return false if no null/undefined', function() {
      var union = new UnionType([PrimitiveType.STRING, PrimitiveType.NUMBER]);
      expect(union.isNullable()).toBe(false);
    });
  });

  describe('getNonNullable', function() {
    it('should remove null and undefined', function() {
      var union = new UnionType([PrimitiveType.STRING, PrimitiveType.NULL, PrimitiveType.UNDEFINED]);
      var nonNull = union.getNonNullable();
      expect(nonNull).toBe(PrimitiveType.STRING);
    });
  });

  describe('factory functions', function() {
    it('UnionType.of should create simplified union', function() {
      var result = UnionType.of(PrimitiveType.STRING);
      expect(result).toBe(PrimitiveType.STRING);
    });

    it('UnionType.nullable should create nullable type', function() {
      var result = UnionType.nullable(PrimitiveType.STRING);
      expect(result.isNullable()).toBe(true);
      expect(result.contains(PrimitiveType.STRING)).toBe(true);
    });

    it('UnionType.optional should create optional type', function() {
      var result = UnionType.optional(PrimitiveType.STRING);
      expect(result.contains(PrimitiveType.UNDEFINED)).toBe(true);
    });
  });
});
