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
   * 从模板中提取所有变量名
   * @param template 模板字符串
   * @returns 变量名数组
   */
  extractVariables(template: string): string[] {
    const variables: Set<string> = new Set();
    let match;

    // 重置正则表达式的 lastIndex
    this.variablePattern.lastIndex = 0;

    while ((match = this.variablePattern.exec(template)) !== null) {
      variables.add(match[1]);
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
    return templateVariables.filter(
      variable => !(variable in providedVariables)
    );
  }

  /**
   * 渲染单个模板
   * @param template 模板字符串
   * @param variables 变量值
   * @returns 渲染后的字符串
   */
  renderSingle(template: string, variables: TemplateVariables): string {
    // 重置正则表达式的 lastIndex
    this.variablePattern.lastIndex = 0;

    return template.replace(this.variablePattern, (_, variableName) => {
      const value = variables[variableName];
      
      if (value === undefined) {
        if (this.strictMode) {
          throw new Error(`Missing variable: ${variableName}`);
        }
        return `{{${variableName}}}`;
      }
      
      return String(value);
    });
  }

  /**
   * 渲染单个收件人的邮件
   * @param template 模板字符串
   * @param recipient 收件人信息
   * @returns 渲染结果
   */
  renderRecipient(template: string, recipient: Recipient): RenderResult {
    const templateVariables = this.extractVariables(template);
    const missingVariables = this.findMissingVariables(templateVariables, recipient.variables);
    const hasMissingVariables = missingVariables.length > 0;

    let content = '';
    let success = false;

    try {
      content = this.renderSingle(template, recipient.variables);
      success = !this.strictMode || !hasMissingVariables;
    } catch (error) {
      success = false;
      content = `Error rendering template: ${(error as Error).message}`;
    }

    return {
      recipient,
      content,
      missingVariables,
      success
    };
  }

  /**
   * 批量渲染多个收件人的邮件
   * @param template 模板字符串
   * @param recipients 收件人数组
   * @returns 批量渲染结果
   */
  renderBatch(template: string, recipients: Recipient[]): BatchRenderResult {
    const results: RenderResult[] = [];
    const allMissingVariables: Set<string> = new Set();

    for (const recipient of recipients) {
      const result = this.renderRecipient(template, recipient);
      results.push(result);

      // 收集所有缺失的变量
      for (const variable of result.missingVariables) {
        allMissingVariables.add(variable);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return {
      results,
      total: recipients.length,
      successCount,
      failureCount,
      allMissingVariables: Array.from(allMissingVariables)
    };
  }
}
