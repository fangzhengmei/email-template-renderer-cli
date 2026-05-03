/**
 * 模板变量类型
 */
export type TemplateVariables = Record<string, string | number | boolean>;

/**
 * 收件人信息
 */
export interface Recipient {
  email: string;
  variables: TemplateVariables;
}

/**
 * 单个渲染结果
 */
export interface RenderResult {
  recipient: Recipient;
  content: string;
  missingVariables: string[];
  success: boolean;
}

/**
 * 批量渲染结果
 */
export interface BatchRenderResult {
  results: RenderResult[];
  total: number;
  successCount: number;
  failureCount: number;
  allMissingVariables: string[];
}

/**
 * 模板解析选项
 */
export interface TemplateOptions {
  variablePattern?: RegExp;
  strictMode?: boolean;
}
