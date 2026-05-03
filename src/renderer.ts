import { TemplateVariables, Recipient, RenderResult, BatchRenderResult, TemplateOptions } from './types';

/**
 * 模板渲染引擎
 * 负责解析模板、替换变量、检测缺失变量
 */
export class TemplateRenderer {
  private variablePattern: RegExp;
  private strictMode: boolean;

  /**
   * 创建模板渲染引擎实例
   * @param options 渲染选项
   */
  constructor(options: TemplateOptions = {}) {
    this.variablePattern = options.variablePattern || /\{\{(\w+)\}\}/g;
    this.strictMode = options.strictMode || false;
  }

  /**
   * 安全地提取变量，处理各种异常情况
   * @param template 模板字符串
   * @returns 变量名数组
   */
  extractVariables(template: string): string[] {
    // 处理 null 或 undefined 的模板
    if (template === null || template === undefined) {
      return [];
    }

    // 确保模板是字符串类型
    const safeTemplate = typeof template === 'string' ? template : String(template);
    
    const variables: Set<string> = new Set();
    let match;

    try {
      // 重置正则表达式的 lastIndex
      this.variablePattern.lastIndex = 0;

      while ((match = this.variablePattern.exec(safeTemplate)) !== null) {
        // 确保变量名有效
        if (match[1] && typeof match[1] === 'string') {
          variables.add(match[1]);
        }
      }
    } catch (error) {
      // 正则表达式执行出错时返回空数组
      console.error('提取变量时出错:', error);
      return [];
    }

    return Array.from(variables);
  }

  /**
   * 检测缺失的变量
   * @param templateVariables 模板中定义的变量
   * @param providedVariables 提供的变量
   * @returns 缺失的变量数组
   */
  findMissingVariables(
    templateVariables: string[],
    providedVariables: TemplateVariables
  ): string[] {
    // 处理空的模板变量数组
    if (!templateVariables || !Array.isArray(templateVariables)) {
      return [];
    }

    // 处理空的提供变量
    if (!providedVariables || typeof providedVariables !== 'object') {
      return templateVariables.filter(v => typeof v === 'string');
    }

    return templateVariables.filter(variable => {
      // 确保变量名是字符串
      if (typeof variable !== 'string') {
        return false;
      }
      return !(variable in providedVariables);
    });
  }

  /**
   * 安全地渲染单个模板，处理各种异常情况
   * @param template 模板字符串
   * @param variables 变量值
   * @returns 渲染后的字符串
   */
  renderSingle(template: string, variables: TemplateVariables): string {
    // 处理 null 或 undefined 的模板
    if (template === null || template === undefined) {
      return '';
    }

    // 确保模板是字符串类型
    const safeTemplate = typeof template === 'string' ? template : String(template);
    
    // 处理 null 或 undefined 的变量
    const safeVariables: TemplateVariables = 
      variables && typeof variables === 'object' && !Array.isArray(variables) 
        ? variables 
        : {};

    try {
      // 重置正则表达式的 lastIndex
      this.variablePattern.lastIndex = 0;

      return safeTemplate.replace(this.variablePattern, (_, variableName) => {
        // 确保变量名是字符串
        if (typeof variableName !== 'string') {
          return _;
        }

        const value = safeVariables[variableName];
        
        if (value === undefined) {
          if (this.strictMode) {
            throw new Error(`Missing variable: ${variableName}`);
          }
          return `{{${variableName}}}`;
        }
        
        // 安全地转换为字符串
        try {
          return String(value);
        } catch {
          // 如果转换失败，返回原始占位符
          return `{{${variableName}}}`;
        }
      });
    } catch (error) {
      // 如果是严格模式且缺失变量，重新抛出错误
      if (this.strictMode && error instanceof Error && error.message.startsWith('Missing variable:')) {
        throw error;
      }
      
      // 其他错误返回原始模板
      console.error('渲染模板时出错:', error);
      return safeTemplate;
    }
  }

  /**
   * 安全地渲染单个收件人的邮件
   * @param template 模板字符串
   * @param recipient 收件人信息
   * @returns 渲染结果
   */
  renderRecipient(template: string, recipient: Recipient): RenderResult {
    // 处理 null 或 undefined 的收件人
    const safeRecipient: Recipient = recipient && typeof recipient === 'object' 
      ? {
          email: recipient.email || 'unknown@example.com',
          variables: recipient.variables || {}
        }
      : {
          email: 'unknown@example.com',
          variables: {}
        };

    let templateVariables: string[] = [];
    let missingVariables: string[] = [];
    
    try {
      templateVariables = this.extractVariables(template);
      missingVariables = this.findMissingVariables(templateVariables, safeRecipient.variables);
    } catch (error) {
      console.error('分析模板变量时出错:', error);
      missingVariables = [];
    }

    const hasMissingVariables = missingVariables.length > 0;
    let content = '';
    let success = false;
    let errorMessage = '';

    try {
      content = this.renderSingle(template, safeRecipient.variables);
      success = !this.strictMode || !hasMissingVariables;
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : '未知错误';
      content = `Error rendering template: ${errorMessage}`;
    }

    return {
      recipient: safeRecipient,
      content,
      missingVariables,
      success,
      errorMessage: success ? undefined : errorMessage
    };
  }

  /**
   * 安全地批量渲染多个收件人的邮件，不会因单个失败而中断
   * @param template 模板字符串
   * @param recipients 收件人数组
   * @returns 批量渲染结果
   */
  renderBatch(template: string, recipients: Recipient[]): BatchRenderResult {
    const results: RenderResult[] = [];
    const allMissingVariables: Set<string> = new Set();
    const skippedRecipients: number[] = [];

    // 处理 null 或 undefined 的收件人数组
    const safeRecipients: Recipient[] = Array.isArray(recipients) ? recipients : [];

    for (let i = 0; i < safeRecipients.length; i++) {
      try {
        const recipient = safeRecipients[i];
        
        // 检查收件人是否有效
        if (!recipient || typeof recipient !== 'object') {
          skippedRecipients.push(i);
          continue;
        }

        const result = this.renderRecipient(template, recipient);
        results.push(result);

        // 收集所有缺失的变量
        for (const variable of result.missingVariables) {
          allMissingVariables.add(variable);
        }
      } catch (error) {
        // 单个收件人渲染失败时记录错误，但继续处理其他收件人
        console.error(`处理收件人 ${i} 时出错:`, error);
        skippedRecipients.push(i);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return {
      results,
      total: safeRecipients.length,
      successCount,
      failureCount,
      skippedCount: skippedRecipients.length,
      allMissingVariables: Array.from(allMissingVariables),
      skippedRecipients: skippedRecipients.length > 0 ? skippedRecipients : undefined
    };
  }
}
