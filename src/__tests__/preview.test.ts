import { ResultPreviewer } from '../preview';
import { RenderResult, BatchRenderResult, Recipient } from '../types';

describe('ResultPreviewer', () => {
  let previewer: ResultPreviewer;

  beforeEach(() => {
    previewer = new ResultPreviewer();
  });

  describe('previewSingle', () => {
    it('应该预览有效的单个渲染结果', () => {
      const recipient: Recipient = {
        email: 'test@example.com',
        variables: { name: 'John' }
      };
      
      const result: RenderResult = {
        recipient,
        content: 'Hello John!',
        missingVariables: [],
        success: true
      };
      
      const preview = previewer.previewSingle(result);
      
      expect(preview).toContain('test@example.com');
      expect(preview).toContain('成功');
      expect(preview).toContain('Hello John!');
    });

    it('应该处理 null 结果', () => {
      const preview = previewer.previewSingle(null as unknown as RenderResult);
      
      expect(preview).toContain('无效的渲染结果');
    });

    it('应该处理 undefined 结果', () => {
      const preview = previewer.previewSingle(undefined as unknown as RenderResult);
      
      expect(preview).toContain('无效的渲染结果');
    });

    it('应该处理无效的结果对象', () => {
      const preview = previewer.previewSingle('not an object' as unknown as RenderResult);
      
      expect(preview).toContain('无效的渲染结果');
    });

    it('应该处理缺失的 recipient 字段', () => {
      const result = {
        content: 'Hello!',
        missingVariables: [],
        success: true
      } as unknown as RenderResult;
      
      const preview = previewer.previewSingle(result);
      
      expect(preview).toContain('unknown@example.com');
    });

    it('应该处理缺失的 email 字段', () => {
      const result: RenderResult = {
        recipient: {
          email: undefined as unknown as string,
          variables: {}
        },
        content: 'Hello!',
        missingVariables: [],
        success: true
      };
      
      const preview = previewer.previewSingle(result);
      
      expect(preview).toContain('unknown@example.com');
    });

    it('应该处理缺失的 success 字段', () => {
      const result = {
        recipient: {
          email: 'test@example.com',
          variables: {}
        },
        content: 'Hello!',
        missingVariables: []
      } as unknown as RenderResult;
      
      const preview = previewer.previewSingle(result);
      
      expect(preview).toContain('失败');
    });

    it('应该处理缺失的 missingVariables 字段', () => {
      const result = {
        recipient: {
          email: 'test@example.com',
          variables: {}
        },
        content: 'Hello!',
        success: true
      } as unknown as RenderResult;
      
      const preview = previewer.previewSingle(result);
      
      expect(preview).toContain('无');
    });

    it('应该处理非数组的 missingVariables', () => {
      const result: RenderResult = {
        recipient: {
          email: 'test@example.com',
          variables: {}
        },
        content: 'Hello!',
        missingVariables: 'not an array' as unknown as string[],
        success: true
      };
      
      const preview = previewer.previewSingle(result);
      
      expect(preview).toContain('无');
    });

    it('应该显示错误信息（如果有）', () => {
      const result: RenderResult = {
        recipient: {
          email: 'test@example.com',
          variables: {}
        },
        content: 'Error!',
        missingVariables: ['name'],
        success: false,
        errorMessage: 'Missing variable: name'
      };
      
      const preview = previewer.previewSingle(result);
      
      expect(preview).toContain('失败');
      expect(preview).toContain('Missing variable: name');
    });

    it('应该在 showContent 为 false 时不显示内容', () => {
      const result: RenderResult = {
        recipient: {
          email: 'test@example.com',
          variables: { name: 'John' }
        },
        content: 'This is a long content that should not be shown',
        missingVariables: [],
        success: true
      };
      
      const preview = previewer.previewSingle(result, false);
      
      expect(preview).not.toContain('This is a long content');
    });

    it('应该处理缺失的 content 字段', () => {
      const result = {
        recipient: {
          email: 'test@example.com',
          variables: {}
        },
        missingVariables: [],
        success: true
      } as unknown as RenderResult;
      
      const preview = previewer.previewSingle(result);
      
      // 不应该抛出错误
      expect(typeof preview).toBe('string');
    });
  });

  describe('previewBatch', () => {
    it('应该预览有效的批量渲染结果', () => {
      const result: BatchRenderResult = {
        results: [
          {
            recipient: { email: 'user1@example.com', variables: { name: 'User 1' } },
            content: 'Hello User 1!',
            missingVariables: [],
            success: true
          },
          {
            recipient: { email: 'user2@example.com', variables: { name: 'User 2' } },
            content: 'Hello User 2!',
            missingVariables: ['orderId'],
            success: true
          }
        ],
        total: 2,
        successCount: 2,
        failureCount: 0,
        allMissingVariables: ['orderId']
      };
      
      const preview = previewer.previewBatch(result);
      
      expect(preview).toContain('总计: 2');
      expect(preview).toContain('成功: 2');
      expect(preview).toContain('orderId');
    });

    it('应该处理 null 批量结果', () => {
      const preview = previewer.previewBatch(null as unknown as BatchRenderResult);
      
      expect(preview).toContain('无效的批量渲染结果');
    });

    it('应该处理 undefined 批量结果', () => {
      const preview = previewer.previewBatch(undefined as unknown as BatchRenderResult);
      
      expect(preview).toContain('无效的批量渲染结果');
    });

    it('应该处理缺失的统计字段', () => {
      const result = {
        results: []
      } as unknown as BatchRenderResult;
      
      const preview = previewer.previewBatch(result);
      
      expect(preview).toContain('总计: 0');
      expect(preview).toContain('成功: 0');
      expect(preview).toContain('失败: 0');
    });

    it('应该处理 skippedCount 字段', () => {
      const result: BatchRenderResult = {
        results: [
          {
            recipient: { email: 'user1@example.com', variables: {} },
            content: 'Hello!',
            missingVariables: [],
            success: true
          }
        ],
        total: 3,
        successCount: 1,
        failureCount: 0,
        skippedCount: 2,
        allMissingVariables: []
      };
      
      const preview = previewer.previewBatch(result);
      
      expect(preview).toContain('跳过: 2');
    });

    it('应该处理 skippedRecipients 字段', () => {
      const result: BatchRenderResult = {
        results: [
          {
            recipient: { email: 'user1@example.com', variables: {} },
            content: 'Hello!',
            missingVariables: [],
            success: true
          }
        ],
        total: 3,
        successCount: 1,
        failureCount: 0,
        allMissingVariables: [],
        skippedRecipients: [1, 2]
      };
      
      const preview = previewer.previewBatch(result);
      
      expect(preview).toContain('跳过的收件人索引');
      expect(preview).toContain('1, 2');
    });

    it('应该在 showDetails 为 true 时显示详细信息', () => {
      const result: BatchRenderResult = {
        results: [
          {
            recipient: { email: 'user1@example.com', variables: {} },
            content: 'Hello 1!',
            missingVariables: [],
            success: true
          },
          {
            recipient: { email: 'user2@example.com', variables: {} },
            content: 'Error!',
            missingVariables: ['name'],
            success: false,
            errorMessage: 'Missing variable: name'
          }
        ],
        total: 2,
        successCount: 1,
        failureCount: 1,
        allMissingVariables: ['name']
      };
      
      const preview = previewer.previewBatch(result, true);
      
      expect(preview).toContain('详细结果');
      expect(preview).toContain('user1@example.com');
      expect(preview).toContain('user2@example.com');
      expect(preview).toContain('Missing variable: name');
    });

    it('应该处理 results 中的无效项', () => {
      const result: BatchRenderResult = {
        results: [
          {
            recipient: { email: 'valid@example.com', variables: {} },
            content: 'Hello!',
            missingVariables: [],
            success: true
          },
          null as unknown as RenderResult,
          'not an object' as unknown as RenderResult
        ],
        total: 3,
        successCount: 1,
        failureCount: 0,
        allMissingVariables: []
      };
      
      // 不应该抛出错误
      const preview = previewer.previewBatch(result, true);
      expect(typeof preview).toBe('string');
    });

    it('应该处理非数组的 results', () => {
      const result = {
        results: 'not an array',
        total: 0,
        successCount: 0,
        failureCount: 0,
        allMissingVariables: []
      } as unknown as BatchRenderResult;
      
      // 不应该抛出错误
      const preview = previewer.previewBatch(result);
      expect(typeof preview).toBe('string');
    });
  });

  describe('generateMissingVariablesReport', () => {
    it('应该在没有缺失变量时返回成功消息', () => {
      const result: BatchRenderResult = {
        results: [],
        total: 0,
        successCount: 0,
        failureCount: 0,
        allMissingVariables: []
      };
      
      const report = previewer.generateMissingVariablesReport(result);
      
      expect(report).toContain('没有缺失变量');
    });

    it('应该生成缺失变量的详细报告', () => {
      const result: BatchRenderResult = {
        results: [
          {
            recipient: { email: 'user1@example.com', variables: {} },
            content: '',
            missingVariables: ['name', 'orderId'],
            success: true
          },
          {
            recipient: { email: 'user2@example.com', variables: {} },
            content: '',
            missingVariables: ['name'],
            success: true
          }
        ],
        total: 2,
        successCount: 2,
        failureCount: 0,
        allMissingVariables: ['name', 'orderId']
      };
      
      const report = previewer.generateMissingVariablesReport(result);
      
      expect(report).toContain('缺失变量详细报告');
      expect(report).toContain('变量: name');
      expect(report).toContain('变量: orderId');
      expect(report).toContain('user1@example.com');
      expect(report).toContain('user2@example.com');
    });

    it('应该处理 null 结果', () => {
      const report = previewer.generateMissingVariablesReport(null as unknown as BatchRenderResult);
      
      expect(report).toContain('无效的批量渲染结果');
    });

    it('应该处理 undefined 结果', () => {
      const report = previewer.generateMissingVariablesReport(undefined as unknown as BatchRenderResult);
      
      expect(report).toContain('无效的批量渲染结果');
    });

    it('应该处理非数组的 allMissingVariables', () => {
      const result = {
        results: [],
        total: 0,
        successCount: 0,
        failureCount: 0,
        allMissingVariables: 'not an array'
      } as unknown as BatchRenderResult;
      
      const report = previewer.generateMissingVariablesReport(result);
      
      expect(report).toContain('没有缺失变量');
    });

    it('应该限制显示的收件人数量', () => {
      const manyRecipients: RenderResult[] = [];
      
      for (let i = 0; i < 15; i++) {
        manyRecipients.push({
          recipient: { email: `user${i}@example.com`, variables: {} },
          content: '',
          missingVariables: ['name'],
          success: true
        });
      }
      
      const result: BatchRenderResult = {
        results: manyRecipients,
        total: 15,
        successCount: 15,
        failureCount: 0,
        allMissingVariables: ['name']
      };
      
      const report = previewer.generateMissingVariablesReport(result);
      
      expect(report).toContain('还有 5 个收件人');
    });

    it('应该处理 results 中的无效项', () => {
      const result: BatchRenderResult = {
        results: [
          {
            recipient: { email: 'valid@example.com', variables: {} },
            content: '',
            missingVariables: ['name'],
            success: true
          },
          null as unknown as RenderResult,
          {
            // 缺少 missingVariables
            recipient: { email: 'invalid@example.com', variables: {} },
            content: '',
            success: true
          } as unknown as RenderResult
        ],
        total: 3,
        successCount: 2,
        failureCount: 0,
        allMissingVariables: ['name']
      };
      
      // 不应该抛出错误
      const report = previewer.generateMissingVariablesReport(result);
      expect(typeof report).toBe('string');
    });

    it('应该处理缺少 email 的收件人', () => {
      const result: BatchRenderResult = {
        results: [
          {
            recipient: { email: undefined as unknown as string, variables: {} },
            content: '',
            missingVariables: ['name'],
            success: true
          }
        ],
        total: 1,
        successCount: 1,
        failureCount: 0,
        allMissingVariables: ['name']
      };
      
      const report = previewer.generateMissingVariablesReport(result);
      
      expect(report).toContain('unknown@example.com');
    });
  });
});
