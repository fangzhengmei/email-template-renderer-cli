import { TemplateRenderer } from '../renderer';
import { Recipient, TemplateVariables } from '../types';

describe('TemplateRenderer', () => {
  let renderer: TemplateRenderer;

  beforeEach(() => {
    renderer = new TemplateRenderer();
  });

  describe('extractVariables', () => {
    it('应该从模板中提取变量名', () => {
      const template = 'Hello {{name}}, your order {{orderId}} is ready!';
      const variables = renderer.extractVariables(template);
      
      expect(variables).toHaveLength(2);
      expect(variables).toContain('name');
      expect(variables).toContain('orderId');
    });

    it('应该处理没有变量的模板', () => {
      const template = 'Hello World!';
      const variables = renderer.extractVariables(template);
      
      expect(variables).toHaveLength(0);
    });

    it('应该去重相同的变量名', () => {
      const template = 'Hello {{name}}! Again hello {{name}}!';
      const variables = renderer.extractVariables(template);
      
      expect(variables).toHaveLength(1);
      expect(variables).toContain('name');
    });

    it('应该提取多个不同的变量', () => {
      const template = '{{a}} {{b}} {{c}} {{d}}';
      const variables = renderer.extractVariables(template);
      
      expect(variables).toHaveLength(4);
      expect(variables).toEqual(expect.arrayContaining(['a', 'b', 'c', 'd']));
    });
  });

  describe('findMissingVariables', () => {
    it('应该返回缺失的变量', () => {
      const templateVariables = ['name', 'orderId', 'date'];
      const providedVariables: TemplateVariables = {
        name: 'John',
        date: '2024-01-01'
      };
      
      const missing = renderer.findMissingVariables(templateVariables, providedVariables);
      
      expect(missing).toHaveLength(1);
      expect(missing).toContain('orderId');
    });

    it('应该返回空数组当没有缺失变量', () => {
      const templateVariables = ['name', 'orderId'];
      const providedVariables: TemplateVariables = {
        name: 'John',
        orderId: 12345
      };
      
      const missing = renderer.findMissingVariables(templateVariables, providedVariables);
      
      expect(missing).toHaveLength(0);
    });

    it('应该返回所有变量当没有提供任何变量', () => {
      const templateVariables = ['name', 'orderId', 'date'];
      const providedVariables: TemplateVariables = {};
      
      const missing = renderer.findMissingVariables(templateVariables, providedVariables);
      
      expect(missing).toHaveLength(3);
      expect(missing).toEqual(['name', 'orderId', 'date']);
    });
  });

  describe('renderSingle', () => {
    it('应该替换模板中的变量', () => {
      const template = 'Hello {{name}}, your order is {{orderId}}.';
      const variables: TemplateVariables = {
        name: 'Alice',
        orderId: 12345
      };
      
      const result = renderer.renderSingle(template, variables);
      
      expect(result).toBe('Hello Alice, your order is 12345.');
    });

    it('应该处理不同类型的变量值', () => {
      const template = 'String: {{str}}, Number: {{num}}, Boolean: {{bool}}';
      const variables: TemplateVariables = {
        str: 'test',
        num: 42,
        bool: true
      };
      
      const result = renderer.renderSingle(template, variables);
      
      expect(result).toBe('String: test, Number: 42, Boolean: true');
    });

    it('在非严格模式下应该保留缺失的变量占位符', () => {
      const template = 'Hello {{name}}, your order is {{orderId}}.';
      const variables: TemplateVariables = {
        name: 'Bob'
      };
      
      const result = renderer.renderSingle(template, variables);
      
      expect(result).toBe('Hello Bob, your order is {{orderId}}.');
    });

    it('在严格模式下应该抛出错误当变量缺失', () => {
      const strictRenderer = new TemplateRenderer({ strictMode: true });
      const template = 'Hello {{name}}';
      const variables: TemplateVariables = {};
      
      expect(() => {
        strictRenderer.renderSingle(template, variables);
      }).toThrow('Missing variable: name');
    });
  });

  describe('renderRecipient', () => {
    it('应该渲染单个收件人的邮件', () => {
      const template = 'Dear {{name}}, your order {{orderId}} has been shipped.';
      const recipient: Recipient = {
        email: 'test@example.com',
        variables: {
          name: 'Charlie',
          orderId: 98765
        }
      };
      
      const result = renderer.renderRecipient(template, recipient);
      
      expect(result.recipient.email).toBe('test@example.com');
      expect(result.content).toBe('Dear Charlie, your order 98765 has been shipped.');
      expect(result.missingVariables).toHaveLength(0);
      expect(result.success).toBe(true);
    });

    it('应该检测缺失的变量', () => {
      const template = 'Dear {{name}}, your order {{orderId}} has been shipped.';
      const recipient: Recipient = {
        email: 'test@example.com',
        variables: {
          name: 'David'
        }
      };
      
      const result = renderer.renderRecipient(template, recipient);
      
      expect(result.missingVariables).toHaveLength(1);
      expect(result.missingVariables).toContain('orderId');
      expect(result.success).toBe(true); // 非严格模式下仍然成功
    });

    it('在严格模式下应该标记为失败当变量缺失', () => {
      const strictRenderer = new TemplateRenderer({ strictMode: true });
      const template = 'Dear {{name}}';
      const recipient: Recipient = {
        email: 'test@example.com',
        variables: {}
      };
      
      const result = strictRenderer.renderRecipient(template, recipient);
      
      expect(result.success).toBe(false);
      expect(result.missingVariables).toContain('name');
    });
  });

  describe('renderBatch', () => {
    it('应该批量渲染多个收件人', () => {
      const template = 'Hello {{name}}!';
      const recipients: Recipient[] = [
        { email: 'alice@example.com', variables: { name: 'Alice' } },
        { email: 'bob@example.com', variables: { name: 'Bob' } },
        { email: 'charlie@example.com', variables: { name: 'Charlie' } }
      ];
      
      const result = renderer.renderBatch(template, recipients);
      
      expect(result.total).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.results[0].content).toBe('Hello Alice!');
      expect(result.results[1].content).toBe('Hello Bob!');
      expect(result.results[2].content).toBe('Hello Charlie!');
    });

    it('应该收集所有缺失的变量', () => {
      const template = 'Hello {{name}}, your order {{orderId}} is ready.';
      const recipients: Recipient[] = [
        { email: 'alice@example.com', variables: { name: 'Alice' } }, // 缺失 orderId
        { email: 'bob@example.com', variables: { orderId: 123 } },   // 缺失 name
        { email: 'charlie@example.com', variables: {} }               // 缺失所有
      ];
      
      const result = renderer.renderBatch(template, recipients);
      
      expect(result.allMissingVariables).toHaveLength(2);
      expect(result.allMissingVariables).toContain('name');
      expect(result.allMissingVariables).toContain('orderId');
    });

    it('应该正确统计成功和失败数量', () => {
      const strictRenderer = new TemplateRenderer({ strictMode: true });
      const template = 'Hello {{name}}!';
      const recipients: Recipient[] = [
        { email: 'alice@example.com', variables: { name: 'Alice' } },  // 成功
        { email: 'bob@example.com', variables: {} },                    // 失败
        { email: 'charlie@example.com', variables: { name: 'Charlie' } }, // 成功
        { email: 'david@example.com', variables: {} }                    // 失败
      ];
      
      const result = strictRenderer.renderBatch(template, recipients);
      
      expect(result.total).toBe(4);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(2);
    });

    it('应该处理空的收件人数组', () => {
      const template = 'Hello {{name}}!';
      const recipients: Recipient[] = [];
      
      const result = renderer.renderBatch(template, recipients);
      
      expect(result.total).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
      expect(result.results).toHaveLength(0);
      expect(result.allMissingVariables).toHaveLength(0);
    });
  });

  describe('自定义变量模式', () => {
    it('应该支持自定义变量模式', () => {
      const customRenderer = new TemplateRenderer({
        variablePattern: /\$\{(\w+)\}/g
      });
      
      const template = 'Hello ${name}, your order is ${orderId}.';
      const variables: TemplateVariables = {
        name: 'Eve',
        orderId: 54321
      };
      
      const extracted = customRenderer.extractVariables(template);
      expect(extracted).toHaveLength(2);
      expect(extracted).toContain('name');
      expect(extracted).toContain('orderId');
      
      const result = customRenderer.renderSingle(template, variables);
      expect(result).toBe('Hello Eve, your order is 54321.');
    });
  });
});
