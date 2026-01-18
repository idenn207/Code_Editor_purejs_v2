/**
 * @fileoverview Integration tests for Type System
 * Tests interactions between Type, PrimitiveType, FunctionType, ClassType, etc.
 */

describe('TypeSystem Integration', function() {
  var TypeKind = CodeEditor.TypeKind;
  var Type = CodeEditor.Type;
  var PrimitiveType = CodeEditor.PrimitiveType;
  var FunctionType = CodeEditor.FunctionType;
  var ClassType = CodeEditor.ClassType;
  var InstanceType = CodeEditor.InstanceType;
  var ArrayType = CodeEditor.ArrayType;
  var ObjectType = CodeEditor.ObjectType;
  var UnionType = CodeEditor.UnionType;

  describe('FunctionType with PrimitiveType parameters', function() {
    it('should create function with primitive parameter types', function() {
      var fn = new FunctionType([
        { name: 'name', type: PrimitiveType.STRING },
        { name: 'age', type: PrimitiveType.NUMBER }
      ], PrimitiveType.BOOLEAN);

      expect(fn.getParamCount()).toBe(2);
      expect(fn.getParamType(0)).toBe(PrimitiveType.STRING);
      expect(fn.getParamType(1)).toBe(PrimitiveType.NUMBER);
      expect(fn.returnType).toBe(PrimitiveType.BOOLEAN);
    });

    it('should generate correct string representation', function() {
      var fn = new FunctionType([
        { name: 'x', type: PrimitiveType.NUMBER }
      ], PrimitiveType.STRING);

      expect(fn.toString()).toBe('(x: number) => string');
    });

    it('should handle optional primitive parameters', function() {
      var fn = new FunctionType([
        { name: 'required', type: PrimitiveType.STRING },
        { name: 'optional', type: PrimitiveType.NUMBER, optional: true }
      ], Type.VOID);

      expect(fn.getRequiredParamCount()).toBe(1);
      expect(fn.getParamCount()).toBe(2);
      expect(fn.toString()).toBe('(required: string, optional?: number) => void');
    });

    it('should handle rest parameters', function() {
      var fn = new FunctionType([
        { name: 'first', type: PrimitiveType.STRING },
        { name: 'rest', type: PrimitiveType.NUMBER, rest: true }
      ], Type.VOID);

      expect(fn.hasRestParam()).toBe(true);
      expect(fn.getParamType(5)).toBe(PrimitiveType.NUMBER);
    });
  });

  describe('ClassType with instance members', function() {
    var PersonClass;

    beforeEach(function() {
      PersonClass = new ClassType('Person');
      PersonClass.setInstanceMember('name', PrimitiveType.STRING);
      PersonClass.setInstanceMember('age', PrimitiveType.NUMBER);
      PersonClass.setInstanceMember('greet', new FunctionType([], PrimitiveType.STRING));
    });

    it('should create class with instance members', function() {
      expect(PersonClass.name).toBe('Person');
      expect(PersonClass.getInstanceMemberNames()).toContain('name');
      expect(PersonClass.getInstanceMemberNames()).toContain('age');
      expect(PersonClass.getInstanceMemberNames()).toContain('greet');
    });

    it('should create instance type with access to instance members', function() {
      var instance = PersonClass.createInstance();

      expect(instance.kind).toBe(TypeKind.INSTANCE);
      expect(instance.getMember('name')).toBe(PrimitiveType.STRING);
      expect(instance.getMember('age')).toBe(PrimitiveType.NUMBER);
      expect(instance.getMember('greet').kind).toBe(TypeKind.FUNCTION);
    });

    it('should distinguish between class and instance member access', function() {
      PersonClass.setStaticMember('count', PrimitiveType.NUMBER);

      // Class reference gets static members
      expect(PersonClass.getMember('count')).toBe(PrimitiveType.NUMBER);
      expect(PersonClass.getMember('name')).toBeNull();

      // Instance gets instance members
      var instance = PersonClass.createInstance();
      expect(instance.getMember('name')).toBe(PrimitiveType.STRING);
      expect(instance.getMember('count')).toBeNull();
    });
  });

  describe('Class inheritance', function() {
    var AnimalClass;
    var DogClass;

    beforeEach(function() {
      AnimalClass = new ClassType('Animal');
      AnimalClass.setInstanceMember('name', PrimitiveType.STRING);
      AnimalClass.setInstanceMember('speak', new FunctionType([], PrimitiveType.STRING));

      DogClass = new ClassType('Dog', AnimalClass);
      DogClass.setInstanceMember('breed', PrimitiveType.STRING);
      DogClass.setInstanceMember('bark', new FunctionType([], Type.VOID));
    });

    it('should inherit instance members from parent class', function() {
      var dogInstance = DogClass.createInstance();

      // Own members
      expect(dogInstance.getMember('breed')).toBe(PrimitiveType.STRING);
      expect(dogInstance.getMember('bark')).toBeDefined();

      // Inherited members
      expect(dogInstance.getMember('name')).toBe(PrimitiveType.STRING);
      expect(dogInstance.getMember('speak')).toBeDefined();
    });

    it('should report correct inheritance chain', function() {
      var chain = DogClass.getInheritanceChain();

      expect(chain.length).toBe(2);
      expect(chain[0].name).toBe('Dog');
      expect(chain[1].name).toBe('Animal');
    });

    it('should correctly check extends relationship', function() {
      expect(DogClass.extends(AnimalClass)).toBe(true);
      expect(AnimalClass.extends(DogClass)).toBe(false);
    });

    it('should inherit static members', function() {
      AnimalClass.setStaticMember('kingdom', PrimitiveType.STRING);
      DogClass.setStaticMember('species', PrimitiveType.STRING);

      expect(DogClass.getStaticMember('species')).toBe(PrimitiveType.STRING);
      expect(DogClass.getStaticMember('kingdom')).toBe(PrimitiveType.STRING);
    });

    it('should check assignability with inheritance', function() {
      var dogInstance = DogClass.createInstance();
      var animalInstance = AnimalClass.createInstance();

      // Dog instance is assignable to Animal
      expect(dogInstance.isAssignableTo(animalInstance)).toBe(true);

      // Animal instance is NOT assignable to Dog
      expect(animalInstance.isAssignableTo(dogInstance)).toBe(false);
    });
  });

  describe('ArrayType with element types', function() {
    it('should create array of primitive type', function() {
      var numberArray = new ArrayType(PrimitiveType.NUMBER);

      expect(numberArray.elementType).toBe(PrimitiveType.NUMBER);
      expect(numberArray.toString()).toBe('number[]');
    });

    it('should create array of class instance', function() {
      var PersonClass = new ClassType('Person');
      var personArray = new ArrayType(PersonClass.createInstance());

      expect(personArray.elementType.kind).toBe(TypeKind.INSTANCE);
      expect(personArray.toString()).toBe('Person[]');
    });

    it('should create nested arrays', function() {
      var matrix = new ArrayType(new ArrayType(PrimitiveType.NUMBER));

      expect(matrix.toString()).toBe('number[][]');
      expect(matrix.elementType.kind).toBe(TypeKind.ARRAY);
    });
  });

  describe('ObjectType with mixed member types', function() {
    it('should create object with various member types', function() {
      var obj = new ObjectType();
      obj.setProperty('id', PrimitiveType.NUMBER);
      obj.setProperty('name', PrimitiveType.STRING);
      obj.setProperty('tags', new ArrayType(PrimitiveType.STRING));
      obj.setProperty('process', new FunctionType([], Type.VOID));

      expect(obj.getMember('id')).toBe(PrimitiveType.NUMBER);
      expect(obj.getMember('tags').kind).toBe(TypeKind.ARRAY);
      expect(obj.getMember('process').kind).toBe(TypeKind.FUNCTION);
    });

    it('should list all members correctly', function() {
      var obj = new ObjectType();
      obj.setProperty('a', PrimitiveType.STRING);
      obj.setProperty('b', PrimitiveType.NUMBER);
      obj.setProperty('c', PrimitiveType.BOOLEAN);

      var names = obj.getMemberNames();
      expect(names).toContain('a');
      expect(names).toContain('b');
      expect(names).toContain('c');
      expect(names.length).toBe(3);
    });
  });

  describe('UnionType with multiple types', function() {
    it('should create union of primitives', function() {
      var stringOrNumber = new UnionType([
        PrimitiveType.STRING,
        PrimitiveType.NUMBER
      ]);

      expect(stringOrNumber.types.length).toBe(2);
      expect(stringOrNumber.toString()).toBe('string | number');
    });

    it('should include null in nullable union', function() {
      var nullableString = new UnionType([
        PrimitiveType.STRING,
        PrimitiveType.NULL
      ]);

      expect(nullableString.types.length).toBe(2);
      expect(nullableString.toString()).toBe('string | null');
    });

    it('should check if union contains specific type', function() {
      var union = new UnionType([
        PrimitiveType.STRING,
        PrimitiveType.NUMBER,
        PrimitiveType.BOOLEAN
      ]);

      expect(union.contains(PrimitiveType.STRING)).toBe(true);
      expect(union.contains(PrimitiveType.NULL)).toBe(false);
    });
  });

  describe('Type assignability across different types', function() {
    it('should allow any type to be assigned to ANY', function() {
      expect(PrimitiveType.STRING.isAssignableTo(Type.ANY)).toBe(true);
      expect(PrimitiveType.NUMBER.isAssignableTo(Type.ANY)).toBe(true);
      expect(new FunctionType().isAssignableTo(Type.ANY)).toBe(true);
      expect(new ClassType('Foo').isAssignableTo(Type.ANY)).toBe(true);
    });

    it('should check function parameter compatibility', function() {
      var fn1 = new FunctionType([
        { name: 'x', type: PrimitiveType.STRING }
      ], PrimitiveType.NUMBER);

      var fn2 = new FunctionType([
        { name: 'x', type: PrimitiveType.STRING }
      ], PrimitiveType.NUMBER);

      expect(fn1.equals(fn2)).toBe(true);
    });

    it('should not allow incompatible primitive types', function() {
      expect(PrimitiveType.STRING.isAssignableTo(PrimitiveType.NUMBER)).toBe(false);
      expect(PrimitiveType.BOOLEAN.isAssignableTo(PrimitiveType.STRING)).toBe(false);
    });
  });

  describe('Complex type scenarios', function() {
    it('should handle callback function type', function() {
      // Function that takes a callback
      var forEach = new FunctionType([
        { name: 'callback', type: new FunctionType([
          { name: 'item', type: PrimitiveType.STRING },
          { name: 'index', type: PrimitiveType.NUMBER }
        ], Type.VOID) }
      ], Type.VOID);

      expect(forEach.getParamType(0).kind).toBe(TypeKind.FUNCTION);
      expect(forEach.getParamType(0).getParamCount()).toBe(2);
    });

    it('should handle class with method returning instance', function() {
      var BuilderClass = new ClassType('Builder');
      var instance = BuilderClass.createInstance();

      // Method that returns this
      BuilderClass.setInstanceMember('setValue', new FunctionType([
        { name: 'value', type: PrimitiveType.STRING }
      ], instance));

      var builderInstance = BuilderClass.createInstance();
      var setValueMethod = builderInstance.getMember('setValue');

      expect(setValueMethod.kind).toBe(TypeKind.FUNCTION);
      expect(setValueMethod.returnType.kind).toBe(TypeKind.INSTANCE);
    });

    it('should handle generic-like array operations', function() {
      var stringArray = new ArrayType(PrimitiveType.STRING);

      // Array methods should return appropriate types
      var mapMethod = new FunctionType([
        { name: 'callback', type: new FunctionType([
          { name: 'item', type: PrimitiveType.STRING }
        ], PrimitiveType.NUMBER) }
      ], new ArrayType(PrimitiveType.NUMBER));

      expect(mapMethod.returnType.kind).toBe(TypeKind.ARRAY);
      expect(mapMethod.returnType.elementType).toBe(PrimitiveType.NUMBER);
    });
  });
});
