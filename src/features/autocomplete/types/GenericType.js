/**
 * @fileoverview Generic type wrapper for types with type parameters
 * @module features/autocomplete/types/GenericType
 */

(function(CodeEditor) {
  'use strict';

  var TypeKind = CodeEditor.TypeKind;
  var Type = CodeEditor.Type;
  var TypeVariable = CodeEditor.TypeVariable;

  // ============================================
  // GenericType Class
  // ============================================

  /**
   * Represents a generic type with type parameters (e.g., Array<T>, Map<K,V>)
   * @class
   * @param {Type} baseType - The base type (FunctionType, ClassType, etc.)
   * @param {TypeVariable[]} typeParameters - Array of type parameters
   */
  function GenericType(baseType, typeParameters) {
    /**
     * The underlying type (may contain TypeVariables)
     * @type {Type}
     */
    this.baseType = baseType;

    /**
     * Type parameters for this generic type
     * @type {TypeVariable[]}
     */
    this.typeParameters = typeParameters || [];

    /**
     * Cache of instantiated types
     * @type {Map<string, Type>}
     * @private
     */
    this._instantiationCache = new Map();
  }

  // ----------------------------------------
  // Type Parameter Management
  // ----------------------------------------

  /**
   * Get a type parameter by name
   * @param {string} name - Parameter name
   * @returns {TypeVariable|null}
   */
  GenericType.prototype.getTypeParameter = function(name) {
    for (var i = 0; i < this.typeParameters.length; i++) {
      if (this.typeParameters[i].name === name) {
        return this.typeParameters[i];
      }
    }
    return null;
  };

  /**
   * Get the index of a type parameter by name
   * @param {string} name - Parameter name
   * @returns {number} -1 if not found
   */
  GenericType.prototype.getTypeParameterIndex = function(name) {
    for (var i = 0; i < this.typeParameters.length; i++) {
      if (this.typeParameters[i].name === name) {
        return i;
      }
    }
    return -1;
  };

  /**
   * Get the number of type parameters
   * @returns {number}
   */
  GenericType.prototype.getTypeParameterCount = function() {
    return this.typeParameters.length;
  };

  /**
   * Get type parameter names
   * @returns {string[]}
   */
  GenericType.prototype.getTypeParameterNames = function() {
    return this.typeParameters.map(function(tp) {
      return tp.name;
    });
  };

  // ----------------------------------------
  // Instantiation
  // ----------------------------------------

  /**
   * Create an instantiated (concrete) type by substituting type arguments
   * @param {Type[]} typeArgs - Concrete types for each type parameter
   * @returns {Type} - The instantiated type
   */
  GenericType.prototype.instantiate = function(typeArgs) {
    if (!typeArgs || typeArgs.length === 0) {
      return this.baseType;
    }

    // Build cache key
    var cacheKey = typeArgs.map(function(t) { return t.toString(); }).join(',');

    if (this._instantiationCache.has(cacheKey)) {
      return this._instantiationCache.get(cacheKey);
    }

    // Build type map
    var typeMap = new Map();
    for (var i = 0; i < this.typeParameters.length && i < typeArgs.length; i++) {
      typeMap.set(this.typeParameters[i].name, typeArgs[i]);
    }

    // Substitute in base type
    var instantiated = this._substituteInType(this.baseType, typeMap);

    this._instantiationCache.set(cacheKey, instantiated);
    return instantiated;
  };

  /**
   * Recursively substitute type variables in a type
   * @param {Type} type - Type to substitute in
   * @param {Map<string, Type>} typeMap - Map of type variable names to concrete types
   * @returns {Type}
   * @private
   */
  GenericType.prototype._substituteInType = function(type, typeMap) {
    if (!type) return type;

    // Type variable - directly substitute
    if (type.kind === TypeKind.TYPE_VARIABLE) {
      var resolved = typeMap.get(type.name);
      return resolved || type;
    }

    // Array type - substitute element type
    if (type.kind === TypeKind.ARRAY) {
      var newElementType = this._substituteInType(type.elementType, typeMap);
      if (newElementType !== type.elementType) {
        return new CodeEditor.ArrayType(newElementType);
      }
      return type;
    }

    // Function type - substitute parameter and return types
    if (type.kind === TypeKind.FUNCTION) {
      var changed = false;
      var newParams = type.params.map(function(p) {
        var newType = this._substituteInType(p.type, typeMap);
        if (newType !== p.type) {
          changed = true;
          return {
            name: p.name,
            type: newType,
            optional: p.optional,
            rest: p.rest
          };
        }
        return p;
      }, this);

      var newReturnType = this._substituteInType(type.returnType, typeMap);
      if (newReturnType !== type.returnType) {
        changed = true;
      }

      if (changed) {
        var newFunc = new CodeEditor.FunctionType(newParams, newReturnType);
        newFunc.isAsync = type.isAsync;
        newFunc.isGenerator = type.isGenerator;
        return newFunc;
      }
      return type;
    }

    // Object type - substitute property types
    if (type.kind === TypeKind.OBJECT) {
      var changed = false;
      var newProps = new Map();

      for (var entry of type.properties) {
        var propName = entry[0];
        var propType = entry[1];
        var newPropType = this._substituteInType(propType, typeMap);
        newProps.set(propName, newPropType);
        if (newPropType !== propType) {
          changed = true;
        }
      }

      if (changed) {
        return new CodeEditor.ObjectType(newProps);
      }
      return type;
    }

    // Union type - substitute each type in the union
    if (type.kind === TypeKind.UNION) {
      var changed = false;
      var newTypes = type.types.map(function(t) {
        var newT = this._substituteInType(t, typeMap);
        if (newT !== t) changed = true;
        return newT;
      }, this);

      if (changed) {
        return new CodeEditor.UnionType(newTypes);
      }
      return type;
    }

    // No substitution needed
    return type;
  };

  /**
   * Create an instantiation with partial type arguments
   * Remaining type parameters stay as variables
   * @param {Object} partialArgs - Object mapping parameter names to types
   * @returns {Type}
   */
  GenericType.prototype.partialInstantiate = function(partialArgs) {
    var typeMap = new Map();

    if (partialArgs instanceof Map) {
      typeMap = partialArgs;
    } else {
      Object.keys(partialArgs).forEach(function(key) {
        typeMap.set(key, partialArgs[key]);
      });
    }

    return this._substituteInType(this.baseType, typeMap);
  };

  // ----------------------------------------
  // Type Inference
  // ----------------------------------------

  /**
   * Infer type arguments from actual types
   * @param {Type[]} actualTypes - Actual types corresponding to parameters that use type variables
   * @param {number[]} paramIndices - Indices of parameters to use for inference
   * @returns {Map<string, Type>} - Inferred type arguments
   */
  GenericType.prototype.inferTypeArguments = function(actualTypes, paramIndices) {
    var inferred = new Map();

    if (!this.baseType || this.baseType.kind !== TypeKind.FUNCTION) {
      return inferred;
    }

    var funcType = this.baseType;

    for (var i = 0; i < actualTypes.length && i < paramIndices.length; i++) {
      var paramIndex = paramIndices[i];
      if (paramIndex >= funcType.params.length) continue;

      var paramType = funcType.params[paramIndex].type;
      var actualType = actualTypes[i];

      this._inferFromTypes(paramType, actualType, inferred);
    }

    return inferred;
  };

  /**
   * Infer type variable bindings by matching expected type with actual type
   * @param {Type} expectedType - Type with potential type variables
   * @param {Type} actualType - Concrete type
   * @param {Map<string, Type>} inferred - Map to store inferred bindings
   * @private
   */
  GenericType.prototype._inferFromTypes = function(expectedType, actualType, inferred) {
    if (!expectedType || !actualType) return;

    // Direct type variable match
    if (expectedType.kind === TypeKind.TYPE_VARIABLE) {
      var varName = expectedType.name;

      // If already inferred, check compatibility
      if (inferred.has(varName)) {
        // Could implement union/intersection here if needed
        return;
      }

      // Check constraint satisfaction
      if (expectedType.constraint && !actualType.isAssignableTo(expectedType.constraint)) {
        return;
      }

      inferred.set(varName, actualType);
      return;
    }

    // Array type - infer element type
    if (expectedType.kind === TypeKind.ARRAY && actualType.kind === TypeKind.ARRAY) {
      this._inferFromTypes(expectedType.elementType, actualType.elementType, inferred);
      return;
    }

    // Function type - infer from parameters and return type
    if (expectedType.kind === TypeKind.FUNCTION && actualType.kind === TypeKind.FUNCTION) {
      // Infer from parameters (contravariant)
      var minParams = Math.min(expectedType.params.length, actualType.params.length);
      for (var i = 0; i < minParams; i++) {
        this._inferFromTypes(expectedType.params[i].type, actualType.params[i].type, inferred);
      }

      // Infer from return type (covariant)
      this._inferFromTypes(expectedType.returnType, actualType.returnType, inferred);
      return;
    }

    // Object type - infer from properties
    if (expectedType.kind === TypeKind.OBJECT && actualType.kind === TypeKind.OBJECT) {
      for (var entry of expectedType.properties) {
        var propName = entry[0];
        var expectedPropType = entry[1];
        var actualPropType = actualType.getMember(propName);

        if (actualPropType) {
          this._inferFromTypes(expectedPropType, actualPropType, inferred);
        }
      }
      return;
    }
  };

  /**
   * Infer type arguments from call arguments for a generic function
   * @param {Type[]} argTypes - Types of actual arguments
   * @returns {Map<string, Type>} - Inferred type bindings
   */
  GenericType.prototype.inferFromCallArguments = function(argTypes) {
    var inferred = new Map();

    if (!this.baseType || this.baseType.kind !== TypeKind.FUNCTION) {
      return inferred;
    }

    var funcType = this.baseType;

    for (var i = 0; i < argTypes.length && i < funcType.params.length; i++) {
      var paramType = funcType.params[i].type;
      var argType = argTypes[i];

      this._inferFromTypes(paramType, argType, inferred);
    }

    return inferred;
  };

  // ----------------------------------------
  // Type Utilities
  // ----------------------------------------

  /**
   * String representation
   * @returns {string}
   */
  GenericType.prototype.toString = function() {
    var params = this.typeParameters.map(function(tp) {
      return tp.toString();
    }).join(', ');

    return this.baseType.toString() + '<' + params + '>';
  };

  /**
   * Clone this generic type
   * @returns {GenericType}
   */
  GenericType.prototype.clone = function() {
    var clonedParams = this.typeParameters.map(function(tp) {
      return tp.clone();
    });

    return new GenericType(this.baseType.clone(), clonedParams);
  };

  // ============================================
  // Factory Functions
  // ============================================

  /**
   * Create a generic type with single type parameter T
   * @param {Type} baseType - Base type containing TypeVariable T
   * @returns {GenericType}
   */
  GenericType.withT = function(baseType) {
    return new GenericType(baseType, [new TypeVariable('T')]);
  };

  /**
   * Create a generic type with two type parameters T and U
   * @param {Type} baseType - Base type containing TypeVariables T and U
   * @returns {GenericType}
   */
  GenericType.withTU = function(baseType) {
    return new GenericType(baseType, [
      new TypeVariable('T'),
      new TypeVariable('U')
    ]);
  };

  /**
   * Create a generic type with K and V type parameters (for maps)
   * @param {Type} baseType - Base type
   * @returns {GenericType}
   */
  GenericType.withKV = function(baseType) {
    return new GenericType(baseType, [
      new TypeVariable('K'),
      new TypeVariable('V')
    ]);
  };

  // ============================================
  // Export
  // ============================================

  CodeEditor.GenericType = GenericType;

})(window.CodeEditor = window.CodeEditor || {});
