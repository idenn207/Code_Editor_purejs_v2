/**
 * @fileoverview Type substitution utilities for generic type instantiation
 * @module features/autocomplete/types/TypeSubstitution
 */

(function(CodeEditor) {
  'use strict';

  var TypeKind = CodeEditor.TypeKind;
  var Type = CodeEditor.Type;

  // ============================================
  // TypeSubstitution Utilities
  // ============================================

  /**
   * Static utility class for type substitution operations
   * @namespace
   */
  var TypeSubstitution = {};

  // ----------------------------------------
  // Core Substitution
  // ----------------------------------------

  /**
   * Substitute type variables in a type with concrete types
   * @param {Type} type - Type containing type variables
   * @param {Map<string, Type>|Object} typeMap - Mapping from variable names to types
   * @returns {Type} - Type with variables substituted
   */
  TypeSubstitution.substitute = function(type, typeMap) {
    if (!type) return type;

    // Normalize typeMap to Map
    var map = typeMap;
    if (!(typeMap instanceof Map)) {
      map = new Map();
      Object.keys(typeMap).forEach(function(key) {
        map.set(key, typeMap[key]);
      });
    }

    return TypeSubstitution._substituteRecursive(type, map);
  };

  /**
   * Recursive substitution helper
   * @param {Type} type - Type to process
   * @param {Map<string, Type>} typeMap - Type variable mappings
   * @returns {Type}
   * @private
   */
  TypeSubstitution._substituteRecursive = function(type, typeMap) {
    if (!type) return type;

    switch (type.kind) {
      case TypeKind.TYPE_VARIABLE:
        return TypeSubstitution._substituteTypeVariable(type, typeMap);

      case TypeKind.ARRAY:
        return TypeSubstitution._substituteArray(type, typeMap);

      case TypeKind.FUNCTION:
        return TypeSubstitution._substituteFunction(type, typeMap);

      case TypeKind.OBJECT:
        return TypeSubstitution._substituteObject(type, typeMap);

      case TypeKind.UNION:
        return TypeSubstitution._substituteUnion(type, typeMap);

      case TypeKind.CLASS:
        return TypeSubstitution._substituteClass(type, typeMap);

      case TypeKind.INSTANCE:
        return TypeSubstitution._substituteInstance(type, typeMap);

      default:
        // Primitive types and others don't need substitution
        return type;
    }
  };

  /**
   * Substitute a type variable
   * @param {Type} type - TypeVariable
   * @param {Map<string, Type>} typeMap - Type mappings
   * @returns {Type}
   * @private
   */
  TypeSubstitution._substituteTypeVariable = function(type, typeMap) {
    if (typeMap.has(type.name)) {
      return typeMap.get(type.name);
    }
    return type;
  };

  /**
   * Substitute in array type
   * @param {Type} type - ArrayType
   * @param {Map<string, Type>} typeMap - Type mappings
   * @returns {Type}
   * @private
   */
  TypeSubstitution._substituteArray = function(type, typeMap) {
    var newElementType = TypeSubstitution._substituteRecursive(type.elementType, typeMap);

    if (newElementType !== type.elementType) {
      return new CodeEditor.ArrayType(newElementType);
    }
    return type;
  };

  /**
   * Substitute in function type
   * @param {Type} type - FunctionType
   * @param {Map<string, Type>} typeMap - Type mappings
   * @returns {Type}
   * @private
   */
  TypeSubstitution._substituteFunction = function(type, typeMap) {
    var changed = false;

    var newParams = type.params.map(function(p) {
      var newType = TypeSubstitution._substituteRecursive(p.type, typeMap);
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
    });

    var newReturnType = TypeSubstitution._substituteRecursive(type.returnType, typeMap);
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
  };

  /**
   * Substitute in object type
   * @param {Type} type - ObjectType
   * @param {Map<string, Type>} typeMap - Type mappings
   * @returns {Type}
   * @private
   */
  TypeSubstitution._substituteObject = function(type, typeMap) {
    var changed = false;
    var newProps = new Map();

    for (var entry of type.properties) {
      var propName = entry[0];
      var propType = entry[1];
      var newPropType = TypeSubstitution._substituteRecursive(propType, typeMap);

      newProps.set(propName, newPropType);
      if (newPropType !== propType) {
        changed = true;
      }
    }

    if (changed) {
      return new CodeEditor.ObjectType(newProps);
    }
    return type;
  };

  /**
   * Substitute in union type
   * @param {Type} type - UnionType
   * @param {Map<string, Type>} typeMap - Type mappings
   * @returns {Type}
   * @private
   */
  TypeSubstitution._substituteUnion = function(type, typeMap) {
    var changed = false;
    var newTypes = type.types.map(function(t) {
      var newT = TypeSubstitution._substituteRecursive(t, typeMap);
      if (newT !== t) changed = true;
      return newT;
    });

    if (changed) {
      return new CodeEditor.UnionType(newTypes);
    }
    return type;
  };

  /**
   * Substitute in class type (instance members)
   * @param {Type} type - ClassType
   * @param {Map<string, Type>} typeMap - Type mappings
   * @returns {Type}
   * @private
   */
  TypeSubstitution._substituteClass = function(type, typeMap) {
    // For now, return as-is; class types with generics would need special handling
    return type;
  };

  /**
   * Substitute in instance type
   * @param {Type} type - InstanceType
   * @param {Map<string, Type>} typeMap - Type mappings
   * @returns {Type}
   * @private
   */
  TypeSubstitution._substituteInstance = function(type, typeMap) {
    // For now, return as-is; instance types of generic classes need special handling
    return type;
  };

  // ----------------------------------------
  // Type Variable Collection
  // ----------------------------------------

  /**
   * Collect all type variables used in a type
   * @param {Type} type - Type to analyze
   * @returns {TypeVariable[]} - Array of found type variables
   */
  TypeSubstitution.collectTypeVariables = function(type) {
    var result = [];
    var seen = new Set();

    TypeSubstitution._collectTypeVariablesRecursive(type, result, seen);
    return result;
  };

  /**
   * Recursive helper to collect type variables
   * @param {Type} type - Type to analyze
   * @param {TypeVariable[]} result - Array to store results
   * @param {Set<string>} seen - Set of seen variable names
   * @private
   */
  TypeSubstitution._collectTypeVariablesRecursive = function(type, result, seen) {
    if (!type) return;

    switch (type.kind) {
      case TypeKind.TYPE_VARIABLE:
        if (!seen.has(type.name)) {
          seen.add(type.name);
          result.push(type);
        }
        break;

      case TypeKind.ARRAY:
        TypeSubstitution._collectTypeVariablesRecursive(type.elementType, result, seen);
        break;

      case TypeKind.FUNCTION:
        type.params.forEach(function(p) {
          TypeSubstitution._collectTypeVariablesRecursive(p.type, result, seen);
        });
        TypeSubstitution._collectTypeVariablesRecursive(type.returnType, result, seen);
        break;

      case TypeKind.OBJECT:
        for (var entry of type.properties) {
          TypeSubstitution._collectTypeVariablesRecursive(entry[1], result, seen);
        }
        break;

      case TypeKind.UNION:
        type.types.forEach(function(t) {
          TypeSubstitution._collectTypeVariablesRecursive(t, result, seen);
        });
        break;
    }
  };

  /**
   * Check if a type contains any type variables
   * @param {Type} type - Type to check
   * @returns {boolean}
   */
  TypeSubstitution.containsTypeVariables = function(type) {
    return TypeSubstitution.collectTypeVariables(type).length > 0;
  };

  /**
   * Check if a type contains a specific type variable
   * @param {Type} type - Type to check
   * @param {string} varName - Variable name to look for
   * @returns {boolean}
   */
  TypeSubstitution.containsTypeVariable = function(type, varName) {
    var vars = TypeSubstitution.collectTypeVariables(type);
    for (var i = 0; i < vars.length; i++) {
      if (vars[i].name === varName) {
        return true;
      }
    }
    return false;
  };

  // ----------------------------------------
  // Type Mapping Utilities
  // ----------------------------------------

  /**
   * Create a type map from arrays of names and types
   * @param {string[]} names - Type variable names
   * @param {Type[]} types - Corresponding types
   * @returns {Map<string, Type>}
   */
  TypeSubstitution.createTypeMap = function(names, types) {
    var map = new Map();
    var len = Math.min(names.length, types.length);

    for (var i = 0; i < len; i++) {
      map.set(names[i], types[i]);
    }

    return map;
  };

  /**
   * Merge multiple type maps (later maps override earlier)
   * @param {...Map<string, Type>} maps - Type maps to merge
   * @returns {Map<string, Type>}
   */
  TypeSubstitution.mergeMaps = function() {
    var result = new Map();

    for (var i = 0; i < arguments.length; i++) {
      var map = arguments[i];
      if (map instanceof Map) {
        for (var entry of map) {
          result.set(entry[0], entry[1]);
        }
      }
    }

    return result;
  };

  /**
   * Apply substitution map in sequence (composing substitutions)
   * @param {Type} type - Type to substitute
   * @param {Map<string, Type>[]} maps - Sequence of type maps
   * @returns {Type}
   */
  TypeSubstitution.substituteSequence = function(type, maps) {
    var result = type;

    for (var i = 0; i < maps.length; i++) {
      result = TypeSubstitution.substitute(result, maps[i]);
    }

    return result;
  };

  // ----------------------------------------
  // Type Resolution
  // ----------------------------------------

  /**
   * Resolve all type variables in a type using a type map
   * Returns null if any type variable cannot be resolved
   * @param {Type} type - Type to resolve
   * @param {Map<string, Type>} typeMap - Type variable mappings
   * @returns {Type|null}
   */
  TypeSubstitution.resolveCompletely = function(type, typeMap) {
    var substituted = TypeSubstitution.substitute(type, typeMap);

    if (TypeSubstitution.containsTypeVariables(substituted)) {
      return null;
    }

    return substituted;
  };

  /**
   * Get all unresolved type variable names in a type
   * @param {Type} type - Type to check
   * @param {Map<string, Type>} typeMap - Current type bindings
   * @returns {string[]} - Names of unresolved type variables
   */
  TypeSubstitution.getUnresolvedVariables = function(type, typeMap) {
    var allVars = TypeSubstitution.collectTypeVariables(type);
    var unresolved = [];

    for (var i = 0; i < allVars.length; i++) {
      if (!typeMap.has(allVars[i].name)) {
        unresolved.push(allVars[i].name);
      }
    }

    return unresolved;
  };

  // ============================================
  // Export
  // ============================================

  CodeEditor.TypeSubstitution = TypeSubstitution;

})(window.CodeEditor = window.CodeEditor || {});
