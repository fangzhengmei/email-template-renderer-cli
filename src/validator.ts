import { Recipient, TemplateVariables } from './types';

/**
 * 验证错误类型
 */
export interface ValidationError {
  field: string;
  message: string;
  index?: number;
}

/**
 * 验证结果
 */
export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * 数据验证器
 * 负责验证输入数据的结构和类型
 */
export class DataValidator {
  /**
   * 验证模板变量
   * @param data 要验证的数据
   * @returns 验证结果
   */
  validateTemplateVariables(data: unknown): ValidationResult<TemplateVariables> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // 检查是否为对象
    if (data === null || data === undefined) {
      errors.push({
        field: 'variables',
        message: '变量数据不能为空'
      });
      return { valid: false, errors, warnings };
    }

    if (typeof data !== 'object') {
      errors.push({
        field: 'variables',
        message: `变量数据必须是对象类型，实际类型: ${typeof data}`
      });
      return { valid: false, errors, warnings };
    }

    if (Array.isArray(data)) {
      errors.push({
        field: 'variables',
        message: '变量数据不能是数组，必须是对象'
      });
      return { valid: false, errors, warnings };
    }

    const variables = data as Record<string, unknown>;
    const validatedVariables: TemplateVariables = {};

    // 检查每个变量值的类型
    for (const [key, value] of Object.entries(variables)) {
      if (value === undefined) {
        warnings.push({
          field: `variables.${key}`,
          message: `变量 "${key}" 的值为 undefined，将被视为缺失变量`
        });
        continue;
      }

      if (value === null) {
        warnings.push({
          field: `variables.${key}`,
          message: `变量 "${key}" 的值为 null，将被渲染为 "null"`
        });
        validatedVariables[key] = 'null';
        continue;
      }

      // 检查是否为支持的类型
      const valueType = typeof value;
      if (valueType !== 'string' && valueType !== 'number' && valueType !== 'boolean') {
        warnings.push({
          field: `variables.${key}`,
          message: `变量 "${key}" 的类型 "${valueType}" 不被完全支持，将被转换为字符串`
        });
      }

      validatedVariables[key] = value as string | number | boolean;
    }

    return {
      valid: true,
      data: validatedVariables,
      errors,
      warnings
    };
  }

  /**
   * 验证单个收件人
   * @param data 要验证的数据
   * @param index 收件人索引（用于错误报告）
   * @returns 验证结果
   */
  validateRecipient(data: unknown, index?: number): ValidationResult<Recipient> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // 检查是否为对象
    if (data === null || data === undefined) {
      errors.push({
        field: 'recipient',
        message: '收件人数据不能为空',
        index
      });
      return { valid: false, errors, warnings };
    }

    if (typeof data !== 'object') {
      errors.push({
        field: 'recipient',
        message: `收件人数据必须是对象类型，实际类型: ${typeof data}`,
        index
      });
      return { valid: false, errors, warnings };
    }

    if (Array.isArray(data)) {
      errors.push({
        field: 'recipient',
        message: '收件人数据不能是数组，必须是对象',
        index
      });
      return { valid: false, errors, warnings };
    }

    const recipient = data as Record<string, unknown>;
    const validatedRecipient: Partial<Recipient> = {};

    // 检查 email 字段
    if (!('email' in recipient)) {
      errors.push({
        field: 'recipient.email',
        message: '缺少必需字段: email',
        index
      });
    } else {
      const email = recipient.email;
      if (typeof email !== 'string') {
        errors.push({
          field: 'recipient.email',
          message: `email 必须是字符串类型，实际类型: ${typeof email}`,
          index
        });
      } else if (email.trim() === '') {
        errors.push({
          field: 'recipient.email',
          message: 'email 不能为空字符串',
          index
        });
      } else {
        // 简单的 email 格式检查
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          warnings.push({
            field: 'recipient.email',
            message: `email 格式可能不正确: ${email}`,
            index
          });
        }
        validatedRecipient.email = email;
      }
    }

    // 检查 variables 字段
    if (!('variables' in recipient)) {
      errors.push({
        field: 'recipient.variables',
        message: '缺少必需字段: variables',
        index
      });
    } else {
      const variablesResult = this.validateTemplateVariables(recipient.variables);
      
      // 合并变量验证的错误和警告
      for (const error of variablesResult.errors) {
        errors.push({
          ...error,
          field: `recipient.variables.${error.field}`,
          index
        });
      }
      
      for (const warning of variablesResult.warnings) {
        warnings.push({
          ...warning,
          field: `recipient.variables.${warning.field}`,
          index
        });
      }
      
      if (variablesResult.valid && variablesResult.data) {
        validatedRecipient.variables = variablesResult.data;
      }
    }

    // 检查是否有验证通过
    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    return {
      valid: true,
      data: validatedRecipient as Recipient,
      errors,
      warnings
    };
  }

  /**
   * 验证收件人数组
   * @param data 要验证的数据
   * @returns 验证结果
   */
  validateRecipients(data: unknown): ValidationResult<Recipient[]> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // 检查是否为数组
    if (data === null || data === undefined) {
      errors.push({
        field: 'recipients',
        message: '收件人数据不能为空'
      });
      return { valid: false, errors, warnings };
    }

    if (!Array.isArray(data)) {
      errors.push({
        field: 'recipients',
        message: `收件人数据必须是数组类型，实际类型: ${typeof data}`
      });
      return { valid: false, errors, warnings };
    }

    if (data.length === 0) {
      warnings.push({
        field: 'recipients',
        message: '收件人数组为空，将不会渲染任何邮件'
      });
      return { valid: true, data: [], errors, warnings };
    }

    const validatedRecipients: Recipient[] = [];
    let validCount = 0;

    // 验证每个收件人
    for (let i = 0; i < data.length; i++) {
      const result = this.validateRecipient(data[i], i);
      
      // 合并错误和警告
      errors.push(...result.errors);
      warnings.push(...result.warnings);
      
      if (result.valid && result.data) {
        validatedRecipients.push(result.data);
        validCount++;
      }
    }

    // 检查是否有有效收件人
    if (validCount === 0 && data.length > 0) {
      errors.push({
        field: 'recipients',
        message: `所有 ${data.length} 个收件人数据都无效`
      });
      return { valid: false, errors, warnings };
    }

    if (validCount < data.length) {
      warnings.push({
        field: 'recipients',
        message: `只有 ${validCount}/${data.length} 个收件人数据有效，无效的将被跳过`
      });
    }

    return {
      valid: true,
      data: validatedRecipients,
      errors,
      warnings
    };
  }

  /**
   * 格式化验证错误为可读字符串
   * @param errors 验证错误数组
   * @returns 格式化的错误信息
   */
  formatErrors(errors: ValidationError[]): string {
    if (errors.length === 0) {
      return '';
    }

    const lines: string[] = [];
    lines.push(`发现 ${errors.length} 个错误:`);

    for (const error of errors) {
      const indexInfo = error.index !== undefined ? ` [索引 ${error.index}]` : '';
      lines.push(`  • ${error.field}${indexInfo}: ${error.message}`);
    }

    return lines.join('\n');
  }

  /**
   * 格式化验证警告为可读字符串
   * @param warnings 验证警告数组
   * @returns 格式化的警告信息
   */
  formatWarnings(warnings: ValidationError[]): string {
    if (warnings.length === 0) {
      return '';
    }

    const lines: string[] = [];
    lines.push(`发现 ${warnings.length} 个警告:`);

    for (const warning of warnings) {
      const indexInfo = warning.index !== undefined ? ` [索引 ${warning.index}]` : '';
      lines.push(`  • ${warning.field}${indexInfo}: ${warning.message}`);
    }

    return lines.join('\n');
  }
}
