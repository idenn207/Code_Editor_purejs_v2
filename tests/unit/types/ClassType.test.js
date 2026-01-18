/**
 * @fileoverview Unit tests for ClassType and InstanceType classes
 */

describe('ClassType', function() {
  var ClassType = CodeEditor.ClassType;
  var InstanceType = CodeEditor.InstanceType;
  var FunctionType = CodeEditor.FunctionType;
  var PrimitiveType = CodeEditor.PrimitiveType;
  var Type = CodeEditor.Type;
  var TypeKind = CodeEditor.TypeKind;

  describe('constructor', function() {
    it('should create class with name', function() {
      var cls = new ClassType('MyClass');
      expect(cls.kind).toBe(TypeKind.CLASS);
      expect(cls.name).toBe('MyClass');
    });

    it('should have empty members by default', function() {
      var cls = new ClassType('MyClass');
      expect(cls.staticMembers.size).toBe(0);
      expect(cls.instanceMembers.size).toBe(0);
    });

    it('should accept superClass', function() {
      var parent = new ClassType('Parent');
      var child = new ClassType('Child', parent);
      expect(child.superClass).toBe(parent);
    });
  });

  describe('setStaticMember / getStaticMember', function() {
    it('should set and get static members', function() {
      var cls = new ClassType('Counter');
      cls.setStaticMember('count', PrimitiveType.NUMBER);
      expect(cls.getStaticMember('count')).toBe(PrimitiveType.NUMBER);
    });

    it('should inherit static members from parent', function() {
      var parent = new ClassType('Parent');
      parent.setStaticMember('parentStatic', PrimitiveType.STRING);
      var child = new ClassType('Child', parent);
      expect(child.getStaticMember('parentStatic')).toBe(PrimitiveType.STRING);
    });

    it('should return null for unknown static member', function() {
      var cls = new ClassType('MyClass');
      expect(cls.getStaticMember('unknown')).toBeNull();
    });
  });

  describe('setInstanceMember / getInstanceMember', function() {
    it('should set and get instance members', function() {
      var cls = new ClassType('Person');
      cls.setInstanceMember('name', PrimitiveType.STRING);
      expect(cls.getInstanceMember('name')).toBe(PrimitiveType.STRING);
    });

    it('should inherit instance members from parent', function() {
      var parent = new ClassType('Parent');
      parent.setInstanceMember('parentProp', PrimitiveType.STRING);
      var child = new ClassType('Child', parent);
      expect(child.getInstanceMember('parentProp')).toBe(PrimitiveType.STRING);
    });

    it('should return null for unknown instance member', function() {
      var cls = new ClassType('MyClass');
      expect(cls.getInstanceMember('unknown')).toBeNull();
    });
  });

  describe('getMember (for class reference)', function() {
    it('should return static members', function() {
      var cls = new ClassType('Counter');
      cls.setStaticMember('count', PrimitiveType.NUMBER);
      expect(cls.getMember('count')).toBe(PrimitiveType.NUMBER);
    });
  });

  describe('getMemberNames', function() {
    it('should return static member names', function() {
      var cls = new ClassType('Counter');
      cls.setStaticMember('count', PrimitiveType.NUMBER);
      cls.setStaticMember('increment', new FunctionType([], Type.VOID));
      var names = cls.getMemberNames();
      expect(names).toContain('count');
      expect(names).toContain('increment');
    });
  });

  describe('getStaticMemberNames', function() {
    it('should include inherited static members', function() {
      var parent = new ClassType('Parent');
      parent.setStaticMember('parentStatic', PrimitiveType.STRING);
      var child = new ClassType('Child', parent);
      child.setStaticMember('childStatic', PrimitiveType.NUMBER);
      var names = child.getStaticMemberNames();
      expect(names).toContain('parentStatic');
      expect(names).toContain('childStatic');
    });
  });

  describe('getInstanceMemberNames', function() {
    it('should include inherited instance members', function() {
      var parent = new ClassType('Parent');
      parent.setInstanceMember('parentProp', PrimitiveType.STRING);
      var child = new ClassType('Child', parent);
      child.setInstanceMember('childProp', PrimitiveType.NUMBER);
      var names = child.getInstanceMemberNames();
      expect(names).toContain('parentProp');
      expect(names).toContain('childProp');
    });
  });

  describe('setConstructor / getConstructor', function() {
    it('should set and get constructor type', function() {
      var cls = new ClassType('Person');
      var ctorType = new FunctionType([{ name: 'name', type: PrimitiveType.STRING }], Type.VOID);
      cls.setConstructor(ctorType);
      expect(cls.getConstructor()).toBe(ctorType);
    });
  });

  describe('createInstance', function() {
    it('should create an InstanceType', function() {
      var cls = new ClassType('Person');
      var instance = cls.createInstance();
      expect(instance).toBeInstanceOf(InstanceType);
      expect(instance.classType).toBe(cls);
    });
  });

  describe('extends', function() {
    it('should return true for parent class', function() {
      var grandparent = new ClassType('Grandparent');
      var parent = new ClassType('Parent', grandparent);
      var child = new ClassType('Child', parent);
      expect(child.extends(parent)).toBe(true);
      expect(child.extends(grandparent)).toBe(true);
    });

    it('should return false for non-parent', function() {
      var cls1 = new ClassType('Class1');
      var cls2 = new ClassType('Class2');
      expect(cls1.extends(cls2)).toBe(false);
    });
  });

  describe('getInheritanceChain', function() {
    it('should return full inheritance chain', function() {
      var grandparent = new ClassType('Grandparent');
      var parent = new ClassType('Parent', grandparent);
      var child = new ClassType('Child', parent);
      var chain = child.getInheritanceChain();
      expect(chain.length).toBe(3);
      expect(chain[0]).toBe(child);
      expect(chain[1]).toBe(parent);
      expect(chain[2]).toBe(grandparent);
    });
  });

  describe('equals', function() {
    it('should return true for same name', function() {
      var cls1 = new ClassType('MyClass');
      var cls2 = new ClassType('MyClass');
      expect(cls1.equals(cls2)).toBe(true);
    });

    it('should return false for different names', function() {
      var cls1 = new ClassType('Class1');
      var cls2 = new ClassType('Class2');
      expect(cls1.equals(cls2)).toBe(false);
    });
  });

  describe('isAssignableTo', function() {
    it('should be assignable to same class', function() {
      var cls1 = new ClassType('MyClass');
      var cls2 = new ClassType('MyClass');
      expect(cls1.isAssignableTo(cls2)).toBe(true);
    });

    it('should be assignable to parent class', function() {
      var parent = new ClassType('Parent');
      var child = new ClassType('Child', parent);
      expect(child.isAssignableTo(parent)).toBe(true);
    });

    it('should be assignable to ANY', function() {
      var cls = new ClassType('MyClass');
      expect(cls.isAssignableTo(Type.ANY)).toBe(true);
    });
  });

  describe('toString', function() {
    it('should return class representation', function() {
      var cls = new ClassType('MyClass');
      expect(cls.toString()).toContain('class');
      expect(cls.toString()).toContain('MyClass');
    });

    it('should show extends for subclass', function() {
      var parent = new ClassType('Parent');
      var child = new ClassType('Child', parent);
      expect(child.toString()).toContain('extends');
      expect(child.toString()).toContain('Parent');
    });
  });

  describe('clone', function() {
    it('should create a shallow copy', function() {
      var cls = new ClassType('MyClass');
      cls.setStaticMember('count', PrimitiveType.NUMBER);
      cls.setInstanceMember('name', PrimitiveType.STRING);
      var cloned = cls.clone();
      expect(cloned.name).toBe('MyClass');
      expect(cloned.getStaticMember('count')).toBe(PrimitiveType.NUMBER);
      expect(cloned.getInstanceMember('name')).toBe(PrimitiveType.STRING);
      expect(cloned).not.toBe(cls);
    });
  });

  describe('isConstructable', function() {
    it('should always return true', function() {
      var cls = new ClassType('MyClass');
      expect(cls.isConstructable()).toBe(true);
    });
  });
});

describe('InstanceType', function() {
  var ClassType = CodeEditor.ClassType;
  var InstanceType = CodeEditor.InstanceType;
  var PrimitiveType = CodeEditor.PrimitiveType;
  var Type = CodeEditor.Type;
  var TypeKind = CodeEditor.TypeKind;

  describe('constructor', function() {
    it('should create instance with classType', function() {
      var cls = new ClassType('Person');
      var instance = new InstanceType(cls);
      expect(instance.kind).toBe(TypeKind.INSTANCE);
      expect(instance.classType).toBe(cls);
    });
  });

  describe('getMember', function() {
    it('should return instance members of class', function() {
      var cls = new ClassType('Person');
      cls.setInstanceMember('name', PrimitiveType.STRING);
      var instance = new InstanceType(cls);
      expect(instance.getMember('name')).toBe(PrimitiveType.STRING);
    });

    it('should not return static members', function() {
      var cls = new ClassType('Counter');
      cls.setStaticMember('count', PrimitiveType.NUMBER);
      var instance = new InstanceType(cls);
      expect(instance.getMember('count')).toBeNull();
    });
  });

  describe('getMemberNames', function() {
    it('should return instance member names', function() {
      var cls = new ClassType('Person');
      cls.setInstanceMember('name', PrimitiveType.STRING);
      cls.setInstanceMember('age', PrimitiveType.NUMBER);
      var instance = new InstanceType(cls);
      var names = instance.getMemberNames();
      expect(names).toContain('name');
      expect(names).toContain('age');
    });
  });

  describe('equals', function() {
    it('should return true for same class instance', function() {
      var cls = new ClassType('Person');
      var inst1 = new InstanceType(cls);
      var inst2 = new InstanceType(cls);
      expect(inst1.equals(inst2)).toBe(true);
    });

    it('should return false for different class instances', function() {
      var cls1 = new ClassType('Person');
      var cls2 = new ClassType('Animal');
      var inst1 = new InstanceType(cls1);
      var inst2 = new InstanceType(cls2);
      expect(inst1.equals(inst2)).toBe(false);
    });
  });

  describe('isAssignableTo', function() {
    it('should be assignable to ANY', function() {
      var cls = new ClassType('Person');
      var instance = new InstanceType(cls);
      expect(instance.isAssignableTo(Type.ANY)).toBe(true);
    });

    it('should be assignable to same instance type', function() {
      var cls = new ClassType('Person');
      var inst1 = new InstanceType(cls);
      var inst2 = new InstanceType(cls);
      expect(inst1.isAssignableTo(inst2)).toBe(true);
    });

    it('should be assignable to parent instance type', function() {
      var parent = new ClassType('Parent');
      var child = new ClassType('Child', parent);
      var childInst = new InstanceType(child);
      var parentInst = new InstanceType(parent);
      expect(childInst.isAssignableTo(parentInst)).toBe(true);
    });
  });

  describe('toString', function() {
    it('should return class name', function() {
      var cls = new ClassType('Person');
      var instance = new InstanceType(cls);
      expect(instance.toString()).toBe('Person');
    });
  });

  describe('clone', function() {
    it('should create a new instance with same class', function() {
      var cls = new ClassType('Person');
      var instance = new InstanceType(cls);
      var cloned = instance.clone();
      expect(cloned.classType).toBe(cls);
      expect(cloned).not.toBe(instance);
    });
  });
});
