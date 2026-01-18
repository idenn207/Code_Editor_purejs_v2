/**
 * @fileoverview Unit tests for Symbol class
 */

describe('Symbol', function() {
  var Symbol = CodeEditor.Symbol;
  var SymbolKind = CodeEditor.SymbolKind;
  var PrimitiveType = CodeEditor.PrimitiveType;
  var FunctionType = CodeEditor.FunctionType;
  var Type = CodeEditor.Type;

  describe('constructor', function() {
    it('should create symbol with name and kind', function() {
      var sym = new Symbol('x', SymbolKind.VARIABLE);
      expect(sym.name).toBe('x');
      expect(sym.kind).toBe(SymbolKind.VARIABLE);
    });

    it('should default to UNKNOWN kind', function() {
      var sym = new Symbol('x');
      expect(sym.kind).toBe(SymbolKind.UNKNOWN);
    });

    it('should default to ANY type', function() {
      var sym = new Symbol('x', SymbolKind.VARIABLE);
      expect(sym.type).toBe(Type.ANY);
    });

    it('should accept type parameter', function() {
      var sym = new Symbol('x', SymbolKind.VARIABLE, PrimitiveType.NUMBER);
      expect(sym.type).toBe(PrimitiveType.NUMBER);
    });

    it('should accept options', function() {
      var sym = new Symbol('x', SymbolKind.VARIABLE, PrimitiveType.NUMBER, {
        documentation: 'A number variable',
        isExported: true,
        isReadOnly: true,
        declarationKind: 'const'
      });
      expect(sym.documentation).toBe('A number variable');
      expect(sym.isExported).toBe(true);
      expect(sym.isReadOnly).toBe(true);
      expect(sym.declarationKind).toBe('const');
    });

    it('should default options to false/null', function() {
      var sym = new Symbol('x', SymbolKind.VARIABLE);
      expect(sym.location).toBeNull();
      expect(sym.documentation).toBeNull();
      expect(sym.isExported).toBe(false);
      expect(sym.isDefaultExport).toBe(false);
      expect(sym.isReadOnly).toBe(false);
      expect(sym.isStatic).toBe(false);
      expect(sym.visibility).toBe('public');
    });

    it('should initialize empty members map', function() {
      var sym = new Symbol('x', SymbolKind.CLASS);
      expect(sym.members.size).toBe(0);
    });

    it('should initialize references to 0', function() {
      var sym = new Symbol('x', SymbolKind.VARIABLE);
      expect(sym.references).toBe(0);
    });

    it('should initialize parent to null', function() {
      var sym = new Symbol('x', SymbolKind.VARIABLE);
      expect(sym.parent).toBeNull();
    });
  });

  describe('member management', function() {
    var parentSym;

    beforeEach(function() {
      parentSym = new Symbol('MyClass', SymbolKind.CLASS);
    });

    describe('addMember', function() {
      it('should add a member', function() {
        var member = new Symbol('prop', SymbolKind.PROPERTY, PrimitiveType.STRING);
        parentSym.addMember(member);
        expect(parentSym.members.size).toBe(1);
      });

      it('should set parent of member', function() {
        var member = new Symbol('prop', SymbolKind.PROPERTY);
        parentSym.addMember(member);
        expect(member.parent).toBe(parentSym);
      });

      it('should return this for chaining', function() {
        var member = new Symbol('prop', SymbolKind.PROPERTY);
        expect(parentSym.addMember(member)).toBe(parentSym);
      });
    });

    describe('getMember', function() {
      it('should return existing member', function() {
        var member = new Symbol('prop', SymbolKind.PROPERTY);
        parentSym.addMember(member);
        expect(parentSym.getMember('prop')).toBe(member);
      });

      it('should return null for non-existing member', function() {
        expect(parentSym.getMember('nonExistent')).toBeNull();
      });
    });

    describe('hasMember', function() {
      it('should return true for existing member', function() {
        parentSym.addMember(new Symbol('prop', SymbolKind.PROPERTY));
        expect(parentSym.hasMember('prop')).toBe(true);
      });

      it('should return false for non-existing member', function() {
        expect(parentSym.hasMember('nonExistent')).toBe(false);
      });
    });

    describe('getMemberNames', function() {
      it('should return all member names', function() {
        parentSym.addMember(new Symbol('a', SymbolKind.PROPERTY));
        parentSym.addMember(new Symbol('b', SymbolKind.METHOD));
        var names = parentSym.getMemberNames();
        expect(names).toContain('a');
        expect(names).toContain('b');
        expect(names.length).toBe(2);
      });

      it('should return empty array for no members', function() {
        expect(parentSym.getMemberNames()).toEqual([]);
      });
    });

    describe('getAllMembers', function() {
      it('should return all members as array', function() {
        var a = new Symbol('a', SymbolKind.PROPERTY);
        var b = new Symbol('b', SymbolKind.METHOD);
        parentSym.addMember(a);
        parentSym.addMember(b);
        var members = parentSym.getAllMembers();
        expect(members.length).toBe(2);
        expect(members).toContain(a);
        expect(members).toContain(b);
      });
    });

    describe('removeMember', function() {
      it('should remove existing member', function() {
        var member = new Symbol('prop', SymbolKind.PROPERTY);
        parentSym.addMember(member);
        expect(parentSym.removeMember('prop')).toBe(true);
        expect(parentSym.hasMember('prop')).toBe(false);
      });

      it('should clear parent of removed member', function() {
        var member = new Symbol('prop', SymbolKind.PROPERTY);
        parentSym.addMember(member);
        parentSym.removeMember('prop');
        expect(member.parent).toBeNull();
      });

      it('should return false for non-existing member', function() {
        expect(parentSym.removeMember('nonExistent')).toBe(false);
      });
    });
  });

  describe('symbol properties', function() {
    describe('isCallable', function() {
      it('should return true for function symbols', function() {
        var sym = new Symbol('fn', SymbolKind.FUNCTION);
        expect(sym.isCallable()).toBe(true);
      });

      it('should return true for method symbols', function() {
        var sym = new Symbol('method', SymbolKind.METHOD);
        expect(sym.isCallable()).toBe(true);
      });

      it('should return true for constructor symbols', function() {
        var sym = new Symbol('ctor', SymbolKind.CONSTRUCTOR);
        expect(sym.isCallable()).toBe(true);
      });

      it('should return false for variable symbols', function() {
        var sym = new Symbol('x', SymbolKind.VARIABLE);
        expect(sym.isCallable()).toBe(false);
      });
    });

    describe('isTypeDefinition', function() {
      it('should return true for class symbols', function() {
        var sym = new Symbol('MyClass', SymbolKind.CLASS);
        expect(sym.isTypeDefinition()).toBe(true);
      });

      it('should return false for variable symbols', function() {
        var sym = new Symbol('x', SymbolKind.VARIABLE);
        expect(sym.isTypeDefinition()).toBe(false);
      });
    });

    describe('canHaveMembers', function() {
      it('should return true for class symbols', function() {
        var sym = new Symbol('MyClass', SymbolKind.CLASS);
        expect(sym.canHaveMembers()).toBe(true);
      });

      it('should return false for variable symbols', function() {
        var sym = new Symbol('x', SymbolKind.VARIABLE);
        expect(sym.canHaveMembers()).toBe(false);
      });
    });

    describe('isValue', function() {
      it('should return true for variable symbols', function() {
        var sym = new Symbol('x', SymbolKind.VARIABLE);
        expect(sym.isValue()).toBe(true);
      });

      it('should return false for class symbols', function() {
        var sym = new Symbol('MyClass', SymbolKind.CLASS);
        expect(sym.isValue()).toBe(false);
      });
    });
  });

  describe('getFullName', function() {
    it('should return name for root symbol', function() {
      var sym = new Symbol('x', SymbolKind.VARIABLE);
      expect(sym.getFullName()).toBe('x');
    });

    it('should return dot-separated path for nested symbols', function() {
      var parent = new Symbol('MyClass', SymbolKind.CLASS);
      var child = new Symbol('prop', SymbolKind.PROPERTY);
      parent.addMember(child);
      expect(child.getFullName()).toBe('MyClass.prop');
    });

    it('should handle multiple levels of nesting', function() {
      var grandparent = new Symbol('Module', SymbolKind.MODULE);
      var parent = new Symbol('MyClass', SymbolKind.CLASS);
      var child = new Symbol('method', SymbolKind.METHOD);
      grandparent.addMember(parent);
      parent.addMember(child);
      expect(child.getFullName()).toBe('Module.MyClass.method');
    });
  });

  describe('addReference', function() {
    it('should increment reference count', function() {
      var sym = new Symbol('x', SymbolKind.VARIABLE);
      expect(sym.references).toBe(0);
      sym.addReference();
      expect(sym.references).toBe(1);
      sym.addReference();
      expect(sym.references).toBe(2);
    });
  });

  describe('getCompletionKind', function() {
    it('should delegate to SymbolKind.toCompletionKind', function() {
      var varSym = new Symbol('x', SymbolKind.VARIABLE);
      expect(varSym.getCompletionKind()).toBe('variable');

      var fnSym = new Symbol('fn', SymbolKind.FUNCTION);
      expect(fnSym.getCompletionKind()).toBe('function');

      var classSym = new Symbol('C', SymbolKind.CLASS);
      expect(classSym.getCompletionKind()).toBe('class');
    });
  });

  describe('getTypeString', function() {
    it('should return type string', function() {
      var sym = new Symbol('x', SymbolKind.VARIABLE, PrimitiveType.NUMBER);
      expect(sym.getTypeString()).toBe('number');
    });

    it('should return any for ANY type', function() {
      var sym = new Symbol('x', SymbolKind.VARIABLE, Type.ANY);
      expect(sym.getTypeString()).toBe('any');
    });
  });

  describe('getSignature', function() {
    it('should return name: type for non-callable', function() {
      var sym = new Symbol('x', SymbolKind.VARIABLE, PrimitiveType.NUMBER);
      expect(sym.getSignature()).toBe('x: number');
    });

    it('should return name + signature for callable', function() {
      var fnType = new FunctionType(
        [{ name: 'x', type: PrimitiveType.NUMBER }],
        PrimitiveType.STRING
      );
      var sym = new Symbol('fn', SymbolKind.FUNCTION, fnType);
      var sig = sym.getSignature();
      expect(sig).toContain('fn');
      expect(sig).toContain('x');
    });
  });

  describe('toString', function() {
    it('should return kind and name', function() {
      var sym = new Symbol('x', SymbolKind.VARIABLE);
      var str = sym.toString();
      expect(str).toContain('variable');
      expect(str).toContain('x');
    });

    it('should include type if not ANY', function() {
      var sym = new Symbol('x', SymbolKind.VARIABLE, PrimitiveType.NUMBER);
      var str = sym.toString();
      expect(str).toContain('number');
    });
  });

  describe('clone', function() {
    it('should create a copy with same properties', function() {
      var sym = new Symbol('x', SymbolKind.VARIABLE, PrimitiveType.NUMBER, {
        documentation: 'test doc',
        isExported: true,
        isReadOnly: true,
        declarationKind: 'const',
        isStatic: true,
        visibility: 'private'
      });
      var cloned = sym.clone();

      expect(cloned.name).toBe('x');
      expect(cloned.kind).toBe(SymbolKind.VARIABLE);
      expect(cloned.type).toBe(PrimitiveType.NUMBER);
      expect(cloned.documentation).toBe('test doc');
      expect(cloned.isExported).toBe(true);
      expect(cloned.isReadOnly).toBe(true);
      expect(cloned.declarationKind).toBe('const');
      expect(cloned.isStatic).toBe(true);
      expect(cloned.visibility).toBe('private');
    });

    it('should not be the same object', function() {
      var sym = new Symbol('x', SymbolKind.VARIABLE);
      var cloned = sym.clone();
      expect(cloned).not.toBe(sym);
    });

    it('should clone members', function() {
      var parent = new Symbol('MyClass', SymbolKind.CLASS);
      parent.addMember(new Symbol('prop', SymbolKind.PROPERTY));
      var cloned = parent.clone();
      expect(cloned.hasMember('prop')).toBe(true);
      expect(cloned.getMember('prop')).not.toBe(parent.getMember('prop'));
    });
  });

  describe('toCompletionItem', function() {
    it('should return completion item format', function() {
      var sym = new Symbol('x', SymbolKind.VARIABLE, PrimitiveType.NUMBER, {
        documentation: 'A number',
        isStatic: true,
        isReadOnly: true
      });
      var item = sym.toCompletionItem();

      expect(item.label).toBe('x');
      expect(item.kind).toBe('variable');
      expect(item.detail).toBe('number');
      expect(item.documentation).toBe('A number');
      expect(item.insertText).toBe('x');
      expect(item.isStatic).toBe(true);
      expect(item.isReadOnly).toBe(true);
    });
  });

  describe('factory functions', function() {
    describe('createVariable', function() {
      it('should create variable symbol', function() {
        var sym = Symbol.createVariable('x', PrimitiveType.NUMBER, 'let');
        expect(sym.name).toBe('x');
        expect(sym.kind).toBe(SymbolKind.VARIABLE);
        expect(sym.type).toBe(PrimitiveType.NUMBER);
        expect(sym.declarationKind).toBe('let');
        expect(sym.isReadOnly).toBe(false);
      });

      it('should create constant symbol for const', function() {
        var sym = Symbol.createVariable('x', PrimitiveType.NUMBER, 'const');
        expect(sym.kind).toBe(SymbolKind.CONSTANT);
        expect(sym.isReadOnly).toBe(true);
      });
    });

    describe('createFunction', function() {
      it('should create function symbol', function() {
        var fnType = new FunctionType([], Type.VOID);
        var sym = Symbol.createFunction('fn', fnType);
        expect(sym.name).toBe('fn');
        expect(sym.kind).toBe(SymbolKind.FUNCTION);
        expect(sym.type).toBe(fnType);
      });
    });

    describe('createClass', function() {
      it('should create class symbol', function() {
        var sym = Symbol.createClass('MyClass', Type.ANY);
        expect(sym.name).toBe('MyClass');
        expect(sym.kind).toBe(SymbolKind.CLASS);
      });
    });

    describe('createParameter', function() {
      it('should create parameter symbol', function() {
        var sym = Symbol.createParameter('arg', PrimitiveType.STRING);
        expect(sym.name).toBe('arg');
        expect(sym.kind).toBe(SymbolKind.PARAMETER);
        expect(sym.type).toBe(PrimitiveType.STRING);
      });
    });

    describe('createProperty', function() {
      it('should create property symbol', function() {
        var sym = Symbol.createProperty('prop', PrimitiveType.BOOLEAN, { isStatic: true });
        expect(sym.name).toBe('prop');
        expect(sym.kind).toBe(SymbolKind.PROPERTY);
        expect(sym.type).toBe(PrimitiveType.BOOLEAN);
        expect(sym.isStatic).toBe(true);
      });
    });

    describe('createMethod', function() {
      it('should create method symbol', function() {
        var fnType = new FunctionType([], Type.VOID);
        var sym = Symbol.createMethod('method', fnType, { visibility: 'private' });
        expect(sym.name).toBe('method');
        expect(sym.kind).toBe(SymbolKind.METHOD);
        expect(sym.type).toBe(fnType);
        expect(sym.visibility).toBe('private');
      });
    });

    describe('createBuiltin', function() {
      it('should create builtin symbol', function() {
        var sym = Symbol.createBuiltin('console', Type.ANY);
        expect(sym.name).toBe('console');
        expect(sym.kind).toBe(SymbolKind.BUILTIN);
      });
    });
  });
});
