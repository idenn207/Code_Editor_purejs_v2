/**
 * @fileoverview Unit tests for ObjectType class
 */

describe('ObjectType', function() {
  var ObjectType = CodeEditor.ObjectType;
  var PrimitiveType = CodeEditor.PrimitiveType;
  var TypeKind = CodeEditor.TypeKind;

  describe('constructor', function() {
    it('should create an empty object type', function() {
      var obj = new ObjectType();
      expect(obj.kind).toBe(TypeKind.OBJECT);
      expect(obj.getPropertyCount()).toBe(0);
    });

    it('should accept initial properties as object', function() {
      var obj = new ObjectType({
        name: PrimitiveType.STRING,
        age: PrimitiveType.NUMBER
      });
      expect(obj.getPropertyCount()).toBe(2);
    });

    it('should accept initial properties as Map', function() {
      var props = new Map();
      props.set('name', PrimitiveType.STRING);
      var obj = new ObjectType(props);
      expect(obj.getPropertyCount()).toBe(1);
    });
  });

  describe('setProperty', function() {
    it('should add a property', function() {
      var obj = new ObjectType();
      obj.setProperty('name', PrimitiveType.STRING);
      expect(obj.hasProperty('name')).toBe(true);
    });

    it('should return this for chaining', function() {
      var obj = new ObjectType();
      var result = obj.setProperty('name', PrimitiveType.STRING);
      expect(result).toBe(obj);
    });

    it('should overwrite existing property', function() {
      var obj = new ObjectType({ name: PrimitiveType.STRING });
      obj.setProperty('name', PrimitiveType.NUMBER);
      expect(obj.getMember('name')).toBe(PrimitiveType.NUMBER);
    });
  });

  describe('getMember', function() {
    it('should return property type', function() {
      var obj = new ObjectType({ name: PrimitiveType.STRING });
      expect(obj.getMember('name')).toBe(PrimitiveType.STRING);
    });

    it('should return null for unknown property', function() {
      var obj = new ObjectType();
      expect(obj.getMember('unknown')).toBeNull();
    });
  });

  describe('getMemberNames', function() {
    it('should return all property names', function() {
      var obj = new ObjectType({
        name: PrimitiveType.STRING,
        age: PrimitiveType.NUMBER
      });
      var names = obj.getMemberNames();
      expect(names).toContain('name');
      expect(names).toContain('age');
      expect(names.length).toBe(2);
    });

    it('should return empty array for empty object', function() {
      var obj = new ObjectType();
      expect(obj.getMemberNames()).toEqual([]);
    });
  });

  describe('hasProperty', function() {
    it('should return true for existing property', function() {
      var obj = new ObjectType({ name: PrimitiveType.STRING });
      expect(obj.hasProperty('name')).toBe(true);
    });

    it('should return false for non-existing property', function() {
      var obj = new ObjectType();
      expect(obj.hasProperty('name')).toBe(false);
    });
  });

  describe('removeProperty', function() {
    it('should remove a property', function() {
      var obj = new ObjectType({ name: PrimitiveType.STRING });
      obj.removeProperty('name');
      expect(obj.hasProperty('name')).toBe(false);
    });

    it('should return true if property existed', function() {
      var obj = new ObjectType({ name: PrimitiveType.STRING });
      expect(obj.removeProperty('name')).toBe(true);
    });

    it('should return false if property did not exist', function() {
      var obj = new ObjectType();
      expect(obj.removeProperty('name')).toBe(false);
    });
  });

  describe('equals', function() {
    it('should return true for equal object types', function() {
      var obj1 = new ObjectType({ name: PrimitiveType.STRING });
      var obj2 = new ObjectType({ name: PrimitiveType.STRING });
      expect(obj1.equals(obj2)).toBe(true);
    });

    it('should return false for different properties', function() {
      var obj1 = new ObjectType({ name: PrimitiveType.STRING });
      var obj2 = new ObjectType({ name: PrimitiveType.NUMBER });
      expect(obj1.equals(obj2)).toBe(false);
    });

    it('should return false for different property count', function() {
      var obj1 = new ObjectType({ name: PrimitiveType.STRING });
      var obj2 = new ObjectType({ name: PrimitiveType.STRING, age: PrimitiveType.NUMBER });
      expect(obj1.equals(obj2)).toBe(false);
    });

    it('should return false for non-object types', function() {
      var obj = new ObjectType();
      expect(obj.equals(PrimitiveType.STRING)).toBe(false);
    });
  });

  describe('isAssignableTo', function() {
    it('should be assignable to same structure', function() {
      var obj1 = new ObjectType({ name: PrimitiveType.STRING });
      var obj2 = new ObjectType({ name: PrimitiveType.STRING });
      expect(obj1.isAssignableTo(obj2)).toBe(true);
    });

    it('should be assignable to ANY', function() {
      var obj = new ObjectType({ name: PrimitiveType.STRING });
      expect(obj.isAssignableTo(CodeEditor.Type.ANY)).toBe(true);
    });

    it('should be assignable if has all required properties', function() {
      var source = new ObjectType({
        name: PrimitiveType.STRING,
        age: PrimitiveType.NUMBER
      });
      var target = new ObjectType({ name: PrimitiveType.STRING });
      expect(source.isAssignableTo(target)).toBe(true);
    });

    it('should not be assignable if missing properties', function() {
      var source = new ObjectType({ name: PrimitiveType.STRING });
      var target = new ObjectType({
        name: PrimitiveType.STRING,
        age: PrimitiveType.NUMBER
      });
      expect(source.isAssignableTo(target)).toBe(false);
    });
  });

  describe('merge', function() {
    it('should merge properties from another object type', function() {
      var obj1 = new ObjectType({ name: PrimitiveType.STRING });
      var obj2 = new ObjectType({ age: PrimitiveType.NUMBER });
      obj1.merge(obj2);
      expect(obj1.hasProperty('name')).toBe(true);
      expect(obj1.hasProperty('age')).toBe(true);
    });

    it('should overwrite existing properties', function() {
      var obj1 = new ObjectType({ name: PrimitiveType.STRING });
      var obj2 = new ObjectType({ name: PrimitiveType.NUMBER });
      obj1.merge(obj2);
      expect(obj1.getMember('name')).toBe(PrimitiveType.NUMBER);
    });

    it('should return this for chaining', function() {
      var obj1 = new ObjectType();
      var obj2 = new ObjectType();
      expect(obj1.merge(obj2)).toBe(obj1);
    });
  });

  describe('clone', function() {
    it('should create a deep copy', function() {
      var obj = new ObjectType({ name: PrimitiveType.STRING });
      var cloned = obj.clone();
      expect(cloned.equals(obj)).toBe(true);
      expect(cloned).not.toBe(obj);
    });
  });

  describe('toString', function() {
    it('should return object literal format', function() {
      var obj = new ObjectType({ name: PrimitiveType.STRING });
      var str = obj.toString();
      expect(str).toContain('name');
      expect(str).toContain('string');
    });
  });

  describe('factory functions', function() {
    it('ObjectType.empty should create empty object', function() {
      var obj = ObjectType.empty();
      expect(obj.getPropertyCount()).toBe(0);
    });

    it('ObjectType.from should create from plain object', function() {
      var obj = ObjectType.from({ name: PrimitiveType.STRING });
      expect(obj.hasProperty('name')).toBe(true);
    });
  });
});
