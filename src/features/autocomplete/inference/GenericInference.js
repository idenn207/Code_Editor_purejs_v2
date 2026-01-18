/**
 * @fileoverview Generic type inference for function calls
 * @module features/autocomplete/inference/GenericInference
 */

(function(CodeEditor) {
  'use strict';

  var TypeKind = CodeEditor.TypeKind;
  var Type = CodeEditor.Type;
  var TypeVariable = CodeEditor.TypeVariable;
  var TypeSubstitution = CodeEditor.TypeSubstitution;
  var ArrayType = CodeEditor.ArrayType;
  var FunctionType = CodeEditor.FunctionType;
  var ObjectType = CodeEditor.ObjectType;
  var UnionType = CodeEditor.UnionType;
  var PrimitiveType = CodeEditor.PrimitiveType;

  // ============================================
  // GenericInference Class
  // ============================================

  /**
   * Handles generic type inference for function calls
   * @class
   * @param {TypeInferenceEngine} engine - The type inference engine
   */
  function GenericInference(engine) {
    /**
     * Reference to the type inference engine
     * @type {TypeInferenceEngine}
     */
    this._engine = engine;
  }

  // ----------------------------------------
  // Main Inference Methods
  // ----------------------------------------

  /**
   * Infer type arguments from function call arguments
   * @param {FunctionType} funcType - Generic function type
   * @param {Type[]} argTypes - Types of actual arguments
   * @param {TypeVariable[]} typeParams - Type parameters to infer
   * @returns {Map<string, Type>} - Inferred type bindings
   */
  GenericInference.prototype.inferTypeArguments = function(funcType, argTypes, typeParams) {
    var inferred = new Map();

    if (!funcType || funcType.kind !== TypeKind.FUNCTION) {
      return inferred;
    }

    // Initialize with constraints
    for (var i = 0; i < typeParams.length; i++) {
      var tp = typeParams[i];
      if (tp.constraint) {
        // Will use constraint as fallback
      }
    }

    // Infer from each argument
    var numArgs = Math.min(argTypes.length, funcType.params.length);
    for (var i = 0; i < numArgs; i++) {
      var paramType = funcType.params[i].type;
      var argType = argTypes[i];

      this._inferFromTypes(paramType, argType, inferred, typeParams);
    }

    // Fill in unresolved type parameters with constraints or any
    for (var i = 0; i < typeParams.length; i++) {
      var tp = typeParams[i];
      if (!inferred.has(tp.name)) {
        inferred.set(tp.name, tp.constraint || Type.ANY);
      }
    }

    return inferred;
  };

  /**
   * Infer type variable bindings by matching expected type with actual type
   * @param {Type} expectedType - Type with potential type variables
   * @param {Type} actualType - Concrete type
   * @param {Map<string, Type>} inferred - Map to store inferred bindings
   * @param {TypeVariable[]} typeParams - Valid type parameters
   * @private
   */
  GenericInference.prototype._inferFromTypes = function(expectedType, actualType, inferred, typeParams) {
    if (!expectedType || !actualType) return;

    // Direct type variable match
    if (expectedType.kind === TypeKind.TYPE_VARIABLE) {
      // Verify it's one of our type parameters
      if (this._isValidTypeParam(expectedType.name, typeParams)) {
        this._unifyTypeVariable(expectedType, actualType, inferred);
      }
      return;
    }

    // Array type - infer element type
    if (expectedType.kind === TypeKind.ARRAY && actualType.kind === TypeKind.ARRAY) {
      this._inferFromTypes(expectedType.elementType, actualType.elementType, inferred, typeParams);
      return;
    }

    // Function type - infer from callback parameters and return type
    if (expectedType.kind === TypeKind.FUNCTION && actualType.kind === TypeKind.FUNCTION) {
      this._inferFromFunctionTypes(expectedType, actualType, inferred, typeParams);
      return;
    }

    // Object type - infer from properties
    if (expectedType.kind === TypeKind.OBJECT && actualType.kind === TypeKind.OBJECT) {
      this._inferFromObjectTypes(expectedType, actualType, inferred, typeParams);
      return;
    }

    // Union type
    if (expectedType.kind === TypeKind.UNION) {
      this._inferFromUnionType(expectedType, actualType, inferred, typeParams);
      return;
    }
  };

  /**
   * Check if a type parameter name is valid
   * @param {string} name - Type parameter name
   * @param {TypeVariable[]} typeParams - Valid type parameters
   * @returns {boolean}
   * @private
   */
  GenericInference.prototype._isValidTypeParam = function(name, typeParams) {
    for (var i = 0; i < typeParams.length; i++) {
      if (typeParams[i].name === name) {
        return true;
      }
    }
    return false;
  };

  /**
   * Unify a type variable with an actual type
   * @param {TypeVariable} typeVar - Type variable
   * @param {Type} actualType - Actual type
   * @param {Map<string, Type>} inferred - Inferred bindings
   * @private
   */
  GenericInference.prototype._unifyTypeVariable = function(typeVar, actualType, inferred) {
    var name = typeVar.name;

    // Check constraint satisfaction
    if (typeVar.constraint && !actualType.isAssignableTo(typeVar.constraint)) {
      // Type doesn't satisfy constraint - use constraint
      if (!inferred.has(name)) {
        inferred.set(name, typeVar.constraint);
      }
      return;
    }

    if (inferred.has(name)) {
      // Already have a binding - try to unify
      var existing = inferred.get(name);

      // If same type, nothing to do
      if (existing.equals(actualType)) {
        return;
      }

      // Create union of types
      var unified = this._unifyTypes(existing, actualType);
      inferred.set(name, unified);
    } else {
      inferred.set(name, actualType);
    }
  };

  /**
   * Unify two types (find common type)
   * @param {Type} type1 - First type
   * @param {Type} type2 - Second type
   * @returns {Type}
   * @private
   */
  GenericInference.prototype._unifyTypes = function(type1, type2) {
    // Same type
    if (type1.equals(type2)) {
      return type1;
    }

    // One is assignable to the other
    if (type1.isAssignableTo(type2)) {
      return type2;
    }
    if (type2.isAssignableTo(type1)) {
      return type1;
    }

    // Both arrays - unify element types
    if (type1.kind === TypeKind.ARRAY && type2.kind === TypeKind.ARRAY) {
      var unified = this._unifyTypes(type1.elementType, type2.elementType);
      return new ArrayType(unified);
    }

    // Create union type
    return UnionType.of(type1, type2);
  };

  /**
   * Infer from function types (for callbacks)
   * @param {FunctionType} expected - Expected function type
   * @param {FunctionType} actual - Actual function type
   * @param {Map<string, Type>} inferred - Inferred bindings
   * @param {TypeVariable[]} typeParams - Type parameters
   * @private
   */
  GenericInference.prototype._inferFromFunctionTypes = function(expected, actual, inferred, typeParams) {
    // Infer from parameters (contravariant, but we're inferring so covariant here)
    var minParams = Math.min(expected.params.length, actual.params.length);
    for (var i = 0; i < minParams; i++) {
      this._inferFromTypes(expected.params[i].type, actual.params[i].type, inferred, typeParams);
    }

    // Infer from return type
    this._inferFromTypes(expected.returnType, actual.returnType, inferred, typeParams);
  };

  /**
   * Infer from object types
   * @param {ObjectType} expected - Expected object type
   * @param {ObjectType} actual - Actual object type
   * @param {Map<string, Type>} inferred - Inferred bindings
   * @param {TypeVariable[]} typeParams - Type parameters
   * @private
   */
  GenericInference.prototype._inferFromObjectTypes = function(expected, actual, inferred, typeParams) {
    for (var entry of expected.properties) {
      var propName = entry[0];
      var expectedPropType = entry[1];
      var actualPropType = actual.getMember(propName);

      if (actualPropType) {
        this._inferFromTypes(expectedPropType, actualPropType, inferred, typeParams);
      }
    }
  };

  /**
   * Infer from union type
   * @param {UnionType} expected - Expected union type
   * @param {Type} actual - Actual type
   * @param {Map<string, Type>} inferred - Inferred bindings
   * @param {TypeVariable[]} typeParams - Type parameters
   * @private
   */
  GenericInference.prototype._inferFromUnionType = function(expected, actual, inferred, typeParams) {
    // Try each type in the union
    for (var i = 0; i < expected.types.length; i++) {
      this._inferFromTypes(expected.types[i], actual, inferred, typeParams);
    }
  };

  // ----------------------------------------
  // Specialized Inference Methods
  // ----------------------------------------

  /**
   * Infer type arguments for array method calls
   * @param {string} methodName - Method name (e.g., 'map', 'filter')
   * @param {ArrayType} arrayType - Array type being called on
   * @param {Type[]} argTypes - Types of call arguments
   * @returns {Type} - Inferred return type
   */
  GenericInference.prototype.inferArrayMethodReturn = function(methodName, arrayType, argTypes) {
    var elementType = arrayType.elementType;

    switch (methodName) {
      case 'map':
        // Array<T>.map<U>(callback: (value: T) => U): Array<U>
        // Return type is Array<U> where U is callback's return type
        if (argTypes.length > 0 && argTypes[0].kind === TypeKind.FUNCTION) {
          var callbackReturn = argTypes[0].returnType;
          return new ArrayType(callbackReturn);
        }
        return new ArrayType(Type.ANY);

      case 'filter':
        // Array<T>.filter(predicate: (value: T) => boolean): Array<T>
        return arrayType;

      case 'find':
        // Array<T>.find(predicate: (value: T) => boolean): T | undefined
        return UnionType.of(elementType, PrimitiveType.UNDEFINED);

      case 'reduce':
        // Array<T>.reduce<U>(callback: (acc: U, curr: T) => U, initial: U): U
        if (argTypes.length > 1) {
          // Initial value type determines accumulator type
          return argTypes[1];
        }
        if (argTypes.length > 0 && argTypes[0].kind === TypeKind.FUNCTION) {
          return argTypes[0].returnType;
        }
        return Type.ANY;

      case 'forEach':
        return Type.VOID;

      case 'every':
      case 'some':
      case 'includes':
        return PrimitiveType.BOOLEAN;

      case 'indexOf':
      case 'lastIndexOf':
      case 'findIndex':
        return PrimitiveType.NUMBER;

      case 'concat':
        return arrayType;

      case 'slice':
      case 'splice':
        return arrayType;

      case 'flat':
        // Flatten one level by default
        if (elementType.kind === TypeKind.ARRAY) {
          return new ArrayType(elementType.elementType);
        }
        return arrayType;

      case 'flatMap':
        // flatMap<U>(callback: (value: T) => U[]): Array<U>
        if (argTypes.length > 0 && argTypes[0].kind === TypeKind.FUNCTION) {
          var callbackReturn = argTypes[0].returnType;
          if (callbackReturn.kind === TypeKind.ARRAY) {
            return new ArrayType(callbackReturn.elementType);
          }
          return new ArrayType(callbackReturn);
        }
        return new ArrayType(Type.ANY);

      case 'push':
      case 'unshift':
        return PrimitiveType.NUMBER;

      case 'pop':
      case 'shift':
        return UnionType.of(elementType, PrimitiveType.UNDEFINED);

      case 'join':
        return PrimitiveType.STRING;

      case 'reverse':
      case 'sort':
        return arrayType;

      case 'fill':
        return arrayType;

      case 'copyWithin':
        return arrayType;

      case 'entries':
      case 'keys':
      case 'values':
        return Type.ANY; // Iterator types

      default:
        return Type.ANY;
    }
  };

  /**
   * Create callback parameter type for array methods
   * @param {string} methodName - Method name
   * @param {ArrayType} arrayType - Array type
   * @returns {FunctionType} - Callback type
   */
  GenericInference.prototype.createArrayCallbackType = function(methodName, arrayType) {
    var elementType = arrayType.elementType;

    switch (methodName) {
      case 'map':
      case 'filter':
      case 'find':
      case 'findIndex':
      case 'every':
      case 'some':
      case 'forEach':
        return new FunctionType([
          { name: 'value', type: elementType },
          { name: 'index', type: PrimitiveType.NUMBER, optional: true },
          { name: 'array', type: arrayType, optional: true }
        ], methodName === 'map' ? Type.ANY : PrimitiveType.BOOLEAN);

      case 'reduce':
      case 'reduceRight':
        return new FunctionType([
          { name: 'accumulator', type: Type.ANY },
          { name: 'currentValue', type: elementType },
          { name: 'currentIndex', type: PrimitiveType.NUMBER, optional: true },
          { name: 'array', type: arrayType, optional: true }
        ], Type.ANY);

      case 'flatMap':
        return new FunctionType([
          { name: 'value', type: elementType },
          { name: 'index', type: PrimitiveType.NUMBER, optional: true },
          { name: 'array', type: arrayType, optional: true }
        ], new ArrayType(Type.ANY));

      case 'sort':
        return new FunctionType([
          { name: 'a', type: elementType },
          { name: 'b', type: elementType }
        ], PrimitiveType.NUMBER);

      default:
        return new FunctionType([{ name: 'value', type: elementType }], Type.ANY);
    }
  };

  // ----------------------------------------
  // Substitution Methods
  // ----------------------------------------

  /**
   * Apply type argument substitution to a function type
   * @param {FunctionType} funcType - Generic function type
   * @param {Map<string, Type>} typeArgs - Type arguments
   * @returns {FunctionType} - Instantiated function type
   */
  GenericInference.prototype.instantiateFunction = function(funcType, typeArgs) {
    if (!funcType || funcType.kind !== TypeKind.FUNCTION) {
      return funcType;
    }

    return TypeSubstitution.substitute(funcType, typeArgs);
  };

  /**
   * Get the inferred return type after substitution
   * @param {FunctionType} funcType - Generic function type
   * @param {Map<string, Type>} typeArgs - Type arguments
   * @returns {Type} - Instantiated return type
   */
  GenericInference.prototype.getInstantiatedReturnType = function(funcType, typeArgs) {
    if (!funcType || funcType.kind !== TypeKind.FUNCTION) {
      return Type.ANY;
    }

    return TypeSubstitution.substitute(funcType.returnType, typeArgs);
  };

  // ============================================
  // Export
  // ============================================

  CodeEditor.GenericInference = GenericInference;

})(window.CodeEditor = window.CodeEditor || {});
