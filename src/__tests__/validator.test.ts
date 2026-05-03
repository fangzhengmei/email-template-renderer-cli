import { DataValidator } from '../validator';
import { Recipient, TemplateVariables } from '../types';

describe('DataValidator', () => {
  let validator: DataValidator;

  beforeEach(() => {
    validator = new DataValidator();
  });

  describe('validateTemplateVariables', () => {
    it('应该验证有效的模板变量对象', () => {
      const variables: TemplateVariables = {
        name: 'John',
        orderId: 12345,
        isActive: true
      };
      
      const result = validator.validateTemplateVariables(variables);
      
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(variables);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('应该拒绝 null 变量', () => {
      const result = validator.validateTemplateVariables(null);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('不能为空');
    });

    it('应该拒绝 undefined 变量', () => {
      const result = validator.validateTemplateVariables(undefined);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('应该拒绝非对象类型的变量', () => {
      const result1 = validator.validateTemplateVariables('not an object');
      const result2 = validator.validateTemplateVariables(123);
      const result3 = validator.validateTemplateVariables(true);
      
      expect(result1.valid).toBe(false);
      expect(result2.valid).toBe(false);
      expect(result3.valid).toBe(false);
    });

    it('应该拒绝数组类型的变量', () => {
      const result = validator.validateTemplateVariables(['item1', 'item2']);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('不能是数组');
    });

    it('应该对 undefined 值发出警告', () => {
      const variables = {
        name: 'John',
        undefinedVar: undefined
      };
      
      const result = validator.validateTemplateVariables(variables);
      
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('undefined');
    });

    it('应该对 null 值发出警告', () => {
      const variables = {
        name: 'John',
        nullVar: null
      };
      
      const result = validator.validateTemplateVariables(variables);
      
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('null');
    });

    it('应该对不支持的类型发出警告', () => {
      const variables = {
        name: 'John',
        objVar: { nested: 'value' },
        arrVar: [1, 2, 3]
      };
      
      const result = validator.validateTemplateVariables(variables);
      
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThanOrEqual(2);
    });

    it('应该验证空对象', () => {
      const result = validator.validateTemplateVariables({});
      
      expect(result.valid).toBe(true);
      expect(result.data).toEqual({});
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateRecipient', () => {
    it('应该验证有效的收件人', () => {
      const recipient: Recipient = {
        email: 'test@example.com',
        variables: {
          name: 'John',
          orderId: 12345
        }
      };
      
      const result = validator.validateRecipient(recipient);
      
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(recipient);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝 null 收件人', () => {
      const result = validator.validateRecipient(null);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('应该拒绝 undefined 收件人', () => {
      const result = validator.validateRecipient(undefined);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('应该拒绝非对象类型的收件人', () => {
      const result1 = validator.validateRecipient('not an object');
      const result2 = validator.validateRecipient(123);
      
      expect(result1.valid).toBe(false);
      expect(result2.valid).toBe(false);
    });

    it('应该拒绝数组类型的收件人', () => {
      const result = validator.validateRecipient(['item1', 'item2']);
      
      expect(result.valid).toBe(false);
    });

    it('应该拒绝缺少 email 字段的收件人', () => {
      const invalidRecipient = {
        variables: {
          name: 'John'
        }
      };
      
      const result = validator.validateRecipient(invalidRecipient);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('缺少必需字段: email');
    });

    it('应该拒绝缺少 variables 字段的收件人', () => {
      const invalidRecipient = {
        email: 'test@example.com'
      };
      
      const result = validator.validateRecipient(invalidRecipient);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('缺少必需字段: variables');
    });

    it('应该拒绝 email 不是字符串的收件人', () => {
      const invalidRecipient = {
        email: 12345,
        variables: {
          name: 'John'
        }
      };
      
      const result = validator.validateRecipient(invalidRecipient);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('email 必须是字符串类型');
    });

    it('应该拒绝空字符串 email 的收件人', () => {
      const invalidRecipient = {
        email: '',
        variables: {
          name: 'John'
        }
      };
      
      const result = validator.validateRecipient(invalidRecipient);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('email 不能为空字符串');
    });

    it('应该对格式不正确的 email 发出警告', () => {
      const recipient = {
        email: 'invalid-email',
        variables: {
          name: 'John'
        }
      };
      
      const result = validator.validateRecipient(recipient);
      
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('格式可能不正确');
    });

    it('应该在索引参数中包含错误', () => {
      const invalidRecipient = {
        email: '',
        variables: {
          name: 'John'
        }
      };
      
      const result = validator.validateRecipient(invalidRecipient, 5);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].index).toBe(5);
    });

    it('应该验证包含空变量的收件人', () => {
      const recipient: Recipient = {
        email: 'test@example.com',
        variables: {}
      };
      
      const result = validator.validateRecipient(recipient);
      
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(recipient);
    });
  });

  describe('validateRecipients', () => {
    it('应该验证有效的收件人数组', () => {
      const recipients: Recipient[] = [
        {
          email: 'user1@example.com',
          variables: { name: 'User 1' }
        },
        {
          email: 'user2@example.com',
          variables: { name: 'User 2' }
        }
      ];
      
      const result = validator.validateRecipients(recipients);
      
      expect(result.valid).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝 null 收件人数组', () => {
      const result = validator.validateRecipients(null);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('应该拒绝 undefined 收件人数组', () => {
      const result = validator.validateRecipients(undefined);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('应该拒绝非数组类型的收件人', () => {
      const result = validator.validateRecipients({
        email: 'test@example.com',
        variables: { name: 'Test' }
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('必须是数组类型');
    });

    it('应该对空数组发出警告', () => {
      const result = validator.validateRecipients([]);
      
      expect(result.valid).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('为空');
    });

    it('应该验证包含部分无效收件人的数组', () => {
      const mixedRecipients = [
        {
          email: 'valid@example.com',
          variables: { name: 'Valid' }
        },
        {
          // 缺少 email 字段
          variables: { name: 'Invalid' }
        },
        {
          email: 'another@example.com',
          variables: { name: 'Another' }
        }
      ];
      
      const result = validator.validateRecipients(mixedRecipients);
      
      expect(result.valid).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('只有');
    });

    it('应该拒绝所有收件人都无效的数组', () => {
      const allInvalidRecipients = [
        {
          // 缺少 email 字段
          variables: { name: 'Invalid 1' }
        },
        {
          // 缺少 variables 字段
          email: 'invalid@example.com'
        }
      ];
      
      const result = validator.validateRecipients(allInvalidRecipients);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
    });

    it('应该在错误中包含索引信息', () => {
      const recipients = [
        {
          email: 'valid@example.com',
          variables: { name: 'Valid' }
        },
        {
          // 无效的收件人
          email: '',
          variables: { name: 'Invalid' }
        }
      ];
      
      const result = validator.validateRecipients(recipients);
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].index).toBe(1);
    });
  });

  describe('formatErrors', () => {
    it('应该格式化错误数组', () => {
      const errors = [
        { field: 'email', message: '不能为空', index: 0 },
        { field: 'variables', message: '必须是对象' }
      ];
      
      const formatted = validator.formatErrors(errors);
      
      expect(formatted).toContain('发现 2 个错误');
      expect(formatted).toContain('email');
      expect(formatted).toContain('variables');
      expect(formatted).toContain('[索引 0]');
    });

    it('应该对空错误数组返回空字符串', () => {
      const formatted = validator.formatErrors([]);
      
      expect(formatted).toBe('');
    });
  });

  describe('formatWarnings', () => {
    it('应该格式化警告数组', () => {
      const warnings = [
        { field: 'variables.name', message: '值为 null', index: 1 },
        { field: 'email', message: '格式可能不正确' }
      ];
      
      const formatted = validator.formatWarnings(warnings);
      
      expect(formatted).toContain('发现 2 个警告');
      expect(formatted).toContain('variables.name');
      expect(formatted).toContain('email');
    });

    it('应该对空警告数组返回空字符串', () => {
      const formatted = validator.formatWarnings([]);
      
      expect(formatted).toBe('');
    });
  });
});
