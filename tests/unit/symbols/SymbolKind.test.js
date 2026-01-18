/**
 * @fileoverview Unit tests for SymbolKind enumeration
 */

describe('SymbolKind', function() {
  var SymbolKind = CodeEditor.SymbolKind;

  describe('enum values', function() {
    it('should have VARIABLE kind', function() {
      expect(SymbolKind.VARIABLE).toBe('variable');
    });

    it('should have FUNCTION kind', function() {
      expect(SymbolKind.FUNCTION).toBe('function');
    });

    it('should have CLASS kind', function() {
      expect(SymbolKind.CLASS).toBe('class');
    });

    it('should have METHOD kind', function() {
      expect(SymbolKind.METHOD).toBe('method');
    });

    it('should have PROPERTY kind', function() {
      expect(SymbolKind.PROPERTY).toBe('property');
    });

    it('should have PARAMETER kind', function() {
      expect(SymbolKind.PARAMETER).toBe('parameter');
    });

    it('should have IMPORT kind', function() {
      expect(SymbolKind.IMPORT).toBe('import');
    });

    it('should have EXPORT kind', function() {
      expect(SymbolKind.EXPORT).toBe('export');
    });

    it('should have ENUM kind', function() {
      expect(SymbolKind.ENUM).toBe('enum');
    });

    it('should have ENUM_MEMBER kind', function() {
      expect(SymbolKind.ENUM_MEMBER).toBe('enum_member');
    });

    it('should have INTERFACE kind', function() {
      expect(SymbolKind.INTERFACE).toBe('interface');
    });

    it('should have TYPE_ALIAS kind', function() {
      expect(SymbolKind.TYPE_ALIAS).toBe('type_alias');
    });

    it('should have CONSTANT kind', function() {
      expect(SymbolKind.CONSTANT).toBe('constant');
    });

    it('should have GETTER kind', function() {
      expect(SymbolKind.GETTER).toBe('getter');
    });

    it('should have SETTER kind', function() {
      expect(SymbolKind.SETTER).toBe('setter');
    });

    it('should have CONSTRUCTOR kind', function() {
      expect(SymbolKind.CONSTRUCTOR).toBe('constructor');
    });

    it('should have MODULE kind', function() {
      expect(SymbolKind.MODULE).toBe('module');
    });

    it('should have LABEL kind', function() {
      expect(SymbolKind.LABEL).toBe('label');
    });

    it('should have BUILTIN kind', function() {
      expect(SymbolKind.BUILTIN).toBe('builtin');
    });

    it('should have UNKNOWN kind', function() {
      expect(SymbolKind.UNKNOWN).toBe('unknown');
    });
  });

  describe('immutability', function() {
    it('should be frozen', function() {
      expect(Object.isFrozen(SymbolKind)).toBe(true);
    });

    it('should not allow adding new properties', function() {
      var original = Object.keys(SymbolKind).length;
      try {
        SymbolKind.NEW_KIND = 'new_kind';
      } catch (e) {
        // Expected in strict mode
      }
      // Either throws or silently fails
      expect(SymbolKind.NEW_KIND).toBeUndefined();
    });
  });

  describe('isCallable', function() {
    it('should return true for FUNCTION', function() {
      expect(SymbolKind.isCallable(SymbolKind.FUNCTION)).toBe(true);
    });

    it('should return true for METHOD', function() {
      expect(SymbolKind.isCallable(SymbolKind.METHOD)).toBe(true);
    });

    it('should return true for CONSTRUCTOR', function() {
      expect(SymbolKind.isCallable(SymbolKind.CONSTRUCTOR)).toBe(true);
    });

    it('should return false for VARIABLE', function() {
      expect(SymbolKind.isCallable(SymbolKind.VARIABLE)).toBe(false);
    });

    it('should return false for CLASS', function() {
      expect(SymbolKind.isCallable(SymbolKind.CLASS)).toBe(false);
    });

    it('should return false for PROPERTY', function() {
      expect(SymbolKind.isCallable(SymbolKind.PROPERTY)).toBe(false);
    });
  });

  describe('isTypeDefinition', function() {
    it('should return true for CLASS', function() {
      expect(SymbolKind.isTypeDefinition(SymbolKind.CLASS)).toBe(true);
    });

    it('should return true for INTERFACE', function() {
      expect(SymbolKind.isTypeDefinition(SymbolKind.INTERFACE)).toBe(true);
    });

    it('should return true for TYPE_ALIAS', function() {
      expect(SymbolKind.isTypeDefinition(SymbolKind.TYPE_ALIAS)).toBe(true);
    });

    it('should return true for ENUM', function() {
      expect(SymbolKind.isTypeDefinition(SymbolKind.ENUM)).toBe(true);
    });

    it('should return false for VARIABLE', function() {
      expect(SymbolKind.isTypeDefinition(SymbolKind.VARIABLE)).toBe(false);
    });

    it('should return false for FUNCTION', function() {
      expect(SymbolKind.isTypeDefinition(SymbolKind.FUNCTION)).toBe(false);
    });
  });

  describe('canHaveMembers', function() {
    it('should return true for CLASS', function() {
      expect(SymbolKind.canHaveMembers(SymbolKind.CLASS)).toBe(true);
    });

    it('should return true for INTERFACE', function() {
      expect(SymbolKind.canHaveMembers(SymbolKind.INTERFACE)).toBe(true);
    });

    it('should return true for ENUM', function() {
      expect(SymbolKind.canHaveMembers(SymbolKind.ENUM)).toBe(true);
    });

    it('should return true for MODULE', function() {
      expect(SymbolKind.canHaveMembers(SymbolKind.MODULE)).toBe(true);
    });

    it('should return false for FUNCTION', function() {
      expect(SymbolKind.canHaveMembers(SymbolKind.FUNCTION)).toBe(false);
    });

    it('should return false for VARIABLE', function() {
      expect(SymbolKind.canHaveMembers(SymbolKind.VARIABLE)).toBe(false);
    });
  });

  describe('isValue', function() {
    it('should return true for VARIABLE', function() {
      expect(SymbolKind.isValue(SymbolKind.VARIABLE)).toBe(true);
    });

    it('should return true for CONSTANT', function() {
      expect(SymbolKind.isValue(SymbolKind.CONSTANT)).toBe(true);
    });

    it('should return true for PARAMETER', function() {
      expect(SymbolKind.isValue(SymbolKind.PARAMETER)).toBe(true);
    });

    it('should return true for PROPERTY', function() {
      expect(SymbolKind.isValue(SymbolKind.PROPERTY)).toBe(true);
    });

    it('should return true for FUNCTION', function() {
      expect(SymbolKind.isValue(SymbolKind.FUNCTION)).toBe(true);
    });

    it('should return true for METHOD', function() {
      expect(SymbolKind.isValue(SymbolKind.METHOD)).toBe(true);
    });

    it('should return true for GETTER', function() {
      expect(SymbolKind.isValue(SymbolKind.GETTER)).toBe(true);
    });

    it('should return true for ENUM_MEMBER', function() {
      expect(SymbolKind.isValue(SymbolKind.ENUM_MEMBER)).toBe(true);
    });

    it('should return false for CLASS', function() {
      expect(SymbolKind.isValue(SymbolKind.CLASS)).toBe(false);
    });

    it('should return false for INTERFACE', function() {
      expect(SymbolKind.isValue(SymbolKind.INTERFACE)).toBe(false);
    });
  });

  describe('toCompletionKind', function() {
    it('should map VARIABLE to variable', function() {
      expect(SymbolKind.toCompletionKind(SymbolKind.VARIABLE)).toBe('variable');
    });

    it('should map PARAMETER to variable', function() {
      expect(SymbolKind.toCompletionKind(SymbolKind.PARAMETER)).toBe('variable');
    });

    it('should map CONSTANT to constant', function() {
      expect(SymbolKind.toCompletionKind(SymbolKind.CONSTANT)).toBe('constant');
    });

    it('should map FUNCTION to function', function() {
      expect(SymbolKind.toCompletionKind(SymbolKind.FUNCTION)).toBe('function');
    });

    it('should map METHOD to method', function() {
      expect(SymbolKind.toCompletionKind(SymbolKind.METHOD)).toBe('method');
    });

    it('should map CONSTRUCTOR to method', function() {
      expect(SymbolKind.toCompletionKind(SymbolKind.CONSTRUCTOR)).toBe('method');
    });

    it('should map CLASS to class', function() {
      expect(SymbolKind.toCompletionKind(SymbolKind.CLASS)).toBe('class');
    });

    it('should map INTERFACE to interface', function() {
      expect(SymbolKind.toCompletionKind(SymbolKind.INTERFACE)).toBe('interface');
    });

    it('should map PROPERTY to property', function() {
      expect(SymbolKind.toCompletionKind(SymbolKind.PROPERTY)).toBe('property');
    });

    it('should map GETTER to property', function() {
      expect(SymbolKind.toCompletionKind(SymbolKind.GETTER)).toBe('property');
    });

    it('should map SETTER to property', function() {
      expect(SymbolKind.toCompletionKind(SymbolKind.SETTER)).toBe('property');
    });

    it('should map ENUM to enum', function() {
      expect(SymbolKind.toCompletionKind(SymbolKind.ENUM)).toBe('enum');
    });

    it('should map ENUM_MEMBER to enumMember', function() {
      expect(SymbolKind.toCompletionKind(SymbolKind.ENUM_MEMBER)).toBe('enumMember');
    });

    it('should map MODULE to module', function() {
      expect(SymbolKind.toCompletionKind(SymbolKind.MODULE)).toBe('module');
    });

    it('should map BUILTIN to builtin', function() {
      expect(SymbolKind.toCompletionKind(SymbolKind.BUILTIN)).toBe('builtin');
    });

    it('should map unknown kinds to text', function() {
      expect(SymbolKind.toCompletionKind('unknown_kind')).toBe('text');
    });

    it('should map UNKNOWN to text', function() {
      expect(SymbolKind.toCompletionKind(SymbolKind.UNKNOWN)).toBe('text');
    });
  });
});
