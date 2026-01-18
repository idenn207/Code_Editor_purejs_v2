/**
 * @fileoverview Unit tests for TypeVariable
 */

describe('TypeVariable', function() {
  var TypeVariable = CodeEditor.TypeVariable;
  var TypeKind = CodeEditor.TypeKind;
  var Type = CodeEditor.Type;
  var PrimitiveType = CodeEditor.PrimitiveType;

  describe('constructor', function() {
    it('should create a type variable with name', function() {
      var tv = new TypeVariable('T');
      expect(tv.name).toBe('T');
      expect(tv.kind).toBe(TypeKind.TYPE_VARIABLE);
    });

    it('should create a type variable with constraint', function() {
      var tv = new TypeVariable('T', PrimitiveType.STRING);
      expect(tv.name).toBe('T');
      expect(tv.constraint).toBe(PrimitiveType.STRING);
    });

    it('should assign unique IDs', function() {
      var tv1 = new TypeVariable('T');
      var tv2 = new TypeVariable('U');
      expect(tv1.id).not.toBe(tv2.id);
    });
  });

  describe('substitute', function() {
    it('should return resolved type from map', function() {
      var tv = new TypeVariable('T');
      var typeMap = new Map();
      typeMap.set('T', PrimitiveType.NUMBER);

      var result = tv.substitute(typeMap);
      expect(result).toBe(PrimitiveType.NUMBER);
    });

    it('should return self if not in map', function() {
      var tv = new TypeVariable('T');
      var typeMap = new Map();
      typeMap.set('U', PrimitiveType.NUMBER);

      var result = tv.substitute(typeMap);
      expect(result).toBe(tv);
    });

    it('should work with object type map', function() {
      var tv = new TypeVariable('T');
      var typeMap = { T: PrimitiveType.STRING };

      var result = tv.substitute(typeMap);
      expect(result).toBe(PrimitiveType.STRING);
    });
  });

  describe('isResolved', function() {
    it('should return true if in map', function() {
      var tv = new TypeVariable('T');
      var typeMap = new Map();
      typeMap.set('T', PrimitiveType.NUMBER);

      expect(tv.isResolved(typeMap)).toBe(true);
    });

    it('should return false if not in map', function() {
      var tv = new TypeVariable('T');
      var typeMap = new Map();

      expect(tv.isResolved(typeMap)).toBe(false);
    });
  });

  describe('satisfiesConstraint', function() {
    it('should return true if no constraint', function() {
      var tv = new TypeVariable('T');
      expect(tv.satisfiesConstraint(PrimitiveType.NUMBER)).toBe(true);
    });

    it('should check constraint assignability', function() {
      var tv = new TypeVariable('T', PrimitiveType.NUMBER);
      expect(tv.satisfiesConstraint(PrimitiveType.NUMBER)).toBe(true);
    });
  });

  describe('equals', function() {
    it('should return true for same name', function() {
      var tv1 = new TypeVariable('T');
      var tv2 = new TypeVariable('T');
      expect(tv1.equals(tv2)).toBe(true);
    });

    it('should return false for different names', function() {
      var tv1 = new TypeVariable('T');
      var tv2 = new TypeVariable('U');
      expect(tv1.equals(tv2)).toBe(false);
    });
  });

  describe('toString', function() {
    it('should return name', function() {
      var tv = new TypeVariable('T');
      expect(tv.toString()).toBe('T');
    });

    it('should include constraint', function() {
      var tv = new TypeVariable('T', PrimitiveType.STRING);
      expect(tv.toString()).toBe('T extends string');
    });
  });

  describe('factory methods', function() {
    it('should create T type variable', function() {
      var tv = TypeVariable.T();
      expect(tv.name).toBe('T');
    });

    it('should create U type variable', function() {
      var tv = TypeVariable.U();
      expect(tv.name).toBe('U');
    });
  });
});
