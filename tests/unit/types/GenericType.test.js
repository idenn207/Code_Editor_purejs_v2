/**
 * @fileoverview Unit tests for GenericType
 */

describe('GenericType', function() {
  var GenericType = CodeEditor.GenericType;
  var TypeVariable = CodeEditor.TypeVariable;
  var Type = CodeEditor.Type;
  var TypeKind = CodeEditor.TypeKind;
  var PrimitiveType = CodeEditor.PrimitiveType;
  var ArrayType = CodeEditor.ArrayType;
  var FunctionType = CodeEditor.FunctionType;

  describe('constructor', function() {
    it('should create generic type with base type and parameters', function() {
      var T = new TypeVariable('T');
      var baseType = new ArrayType(T);
      var generic = new GenericType(baseType, [T]);

      expect(generic.baseType).toBe(baseType);
      expect(generic.typeParameters).toHaveLength(1);
      expect(generic.typeParameters[0].name).toBe('T');
    });
  });

  describe('getTypeParameter', function() {
    it('should return type parameter by name', function() {
      var T = new TypeVariable('T');
      var generic = new GenericType(new ArrayType(T), [T]);

      var found = generic.getTypeParameter('T');
      expect(found).toBe(T);
    });

    it('should return null for unknown parameter', function() {
      var T = new TypeVariable('T');
      var generic = new GenericType(new ArrayType(T), [T]);

      expect(generic.getTypeParameter('U')).toBe(null);
    });
  });

  describe('getTypeParameterCount', function() {
    it('should return correct count', function() {
      var T = new TypeVariable('T');
      var U = new TypeVariable('U');
      var generic = new GenericType(Type.ANY, [T, U]);

      expect(generic.getTypeParameterCount()).toBe(2);
    });
  });

  describe('instantiate', function() {
    it('should substitute type variables in array type', function() {
      var T = new TypeVariable('T');
      var baseType = new ArrayType(T);
      var generic = new GenericType(baseType, [T]);

      var instantiated = generic.instantiate([PrimitiveType.NUMBER]);

      expect(instantiated.kind).toBe(TypeKind.ARRAY);
      expect(instantiated.elementType).toBe(PrimitiveType.NUMBER);
    });

    it('should substitute in function type', function() {
      var T = new TypeVariable('T');
      var funcType = new FunctionType(
        [{ name: 'value', type: T }],
        T
      );
      var generic = new GenericType(funcType, [T]);

      var instantiated = generic.instantiate([PrimitiveType.STRING]);

      expect(instantiated.kind).toBe(TypeKind.FUNCTION);
      expect(instantiated.params[0].type).toBe(PrimitiveType.STRING);
      expect(instantiated.returnType).toBe(PrimitiveType.STRING);
    });

    it('should cache instantiations', function() {
      var T = new TypeVariable('T');
      var generic = new GenericType(new ArrayType(T), [T]);

      var inst1 = generic.instantiate([PrimitiveType.NUMBER]);
      var inst2 = generic.instantiate([PrimitiveType.NUMBER]);

      expect(inst1).toBe(inst2);
    });
  });

  describe('inferFromCallArguments', function() {
    it('should infer type arguments from call', function() {
      var T = new TypeVariable('T');
      var funcType = new FunctionType(
        [{ name: 'value', type: T }],
        T
      );
      var generic = new GenericType(funcType, [T]);

      var inferred = generic.inferFromCallArguments([PrimitiveType.NUMBER]);

      expect(inferred.get('T')).toBe(PrimitiveType.NUMBER);
    });
  });

  describe('factory methods', function() {
    it('should create with single T parameter', function() {
      var baseType = new ArrayType(new TypeVariable('T'));
      var generic = GenericType.withT(baseType);

      expect(generic.typeParameters).toHaveLength(1);
      expect(generic.typeParameters[0].name).toBe('T');
    });

    it('should create with T and U parameters', function() {
      var generic = GenericType.withTU(Type.ANY);

      expect(generic.typeParameters).toHaveLength(2);
      expect(generic.typeParameters[0].name).toBe('T');
      expect(generic.typeParameters[1].name).toBe('U');
    });
  });
});
