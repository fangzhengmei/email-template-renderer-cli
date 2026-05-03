import chalk from 'chalk';
import { RenderResult, BatchRenderResult } from './types';

/**
 * 预览渲染结果的工具类
 * 提供美观的命令行输出，包含完整的容错处理
 */
export class ResultPreviewer {
  /**
   * 安全地预览单个渲染结果
   * @param result 渲染结果
   * @param showContent 是否显示完整内容
   */
  previewSingle(result: RenderResult, showContent: boolean = true): string {
    const lines: string[] = [];
    
    try {
      // 处理 null 或 undefined 的 result
      if (!result || typeof result !== 'object') {
        lines.push(chalk.red('\n❌ 无效的渲染结果'));
        return lines.join('\n');
      }
      
      // 标题
      lines.push(chalk.bold('\n📧 邮件渲染结果'));
      lines.push('─'.repeat(50));
      
      // 收件人信息（容错处理）
      const recipientEmail = result.recipient?.email || 'unknown@example.com';
      lines.push(`${chalk.bold('收件人:')} ${recipientEmail}`);
      
      // 状态（容错处理）
      const success = typeof result.success === 'boolean' ? result.success : false;
      const status = success 
        ? chalk.green('✅ 成功') 
        : chalk.red('❌ 失败');
      lines.push(`${chalk.bold('状态:')} ${status}`);
      
      // 错误信息（如果有）
      if (result.errorMessage) {
        lines.push(`${chalk.bold('错误信息:')} ${chalk.red(result.errorMessage)}`);
      }
      
      // 缺失变量（容错处理）
      const missingVariables = Array.isArray(result.missingVariables) 
        ? result.missingVariables.filter(v => typeof v === 'string')
        : [];
      
      if (missingVariables.length > 0) {
        lines.push(`${chalk.bold('缺失变量:')} ${chalk.yellow(missingVariables.join(', '))}`);
      } else {
        lines.push(`${chalk.bold('缺失变量:')} ${chalk.green('无')}`);
      }
      
      // 内容预览（容错处理）
      if (showContent) {
        lines.push('');
        lines.push(chalk.bold('📄 邮件内容:'));
        lines.push('─'.repeat(50));
        
        // 安全地获取内容
        const content = typeof result.content === 'string' ? result.content : '';
        
        // 截断长内容，添加省略号
        const maxLines = 20;
        const contentLines = content.split('\n');
        
        if (contentLines.length > maxLines) {
          lines.push(...contentLines.slice(0, maxLines));
          lines.push(chalk.gray(`\n... 还有 ${contentLines.length - maxLines} 行 ...`));
        } else {
          lines.push(...contentLines);
        }
      }
    } catch (error) {
      lines.push(chalk.red(`\n❌ 预览渲染结果时出错: ${(error as Error).message}`));
    }
    
    return lines.join('\n');
  }

  /**
   * 安全地预览批量渲染结果
   * @param result 批量渲染结果
   * @param showDetails 是否显示详细信息
   */
  previewBatch(result: BatchRenderResult, showDetails: boolean = false): string {
    const lines: string[] = [];
    
    try {
      // 处理 null 或 undefined 的 result
      if (!result || typeof result !== 'object') {
        lines.push(chalk.red('\n❌ 无效的批量渲染结果'));
        return lines.join('\n');
      }
      
      // 标题
      lines.push(chalk.bold('\n📊 批量邮件渲染报告'));
      lines.push('═'.repeat(60));
      
      // 统计信息（容错处理）
      const total = typeof result.total === 'number' ? result.total : 0;
      const successCount = typeof result.successCount === 'number' ? result.successCount : 0;
      const failureCount = typeof result.failureCount === 'number' ? result.failureCount : 0;
      const skippedCount = typeof result.skippedCount === 'number' ? result.skippedCount : 0;
      
      lines.push('');
      lines.push(chalk.bold('📈 统计信息:'));
      lines.push(`  ${chalk.bold('总计:')} ${total} 封邮件`);
      lines.push(`  ${chalk.green('✅ 成功:')} ${successCount} 封`);
      lines.push(`  ${chalk.red('❌ 失败:')} ${failureCount} 封`);
      
      if (skippedCount > 0) {
        lines.push(`  ${chalk.yellow('⚠️  跳过:')} ${skippedCount} 封`);
      }
      
      // 成功率
      const successRate = total > 0 
        ? Math.round((successCount / total) * 100) 
        : 0;
      const rateColor = successRate === 100 ? 'green' : successRate >= 80 ? 'yellow' : 'red';
      lines.push(`  ${chalk.bold('成功率:')} ${chalk[rateColor](`${successRate}%`)}`);
      
      // 所有缺失变量（容错处理）
      const allMissingVariables = Array.isArray(result.allMissingVariables)
        ? result.allMissingVariables.filter(v => typeof v === 'string')
        : [];
      
      if (allMissingVariables.length > 0) {
        lines.push('');
        lines.push(chalk.bold('⚠️ 所有缺失变量:'));
        
        // 安全地获取结果数组
        const results = Array.isArray(result.results) ? result.results : [];
        
        for (const variable of allMissingVariables) {
          // 统计有多少收件人缺少这个变量
          const missingCount = results.filter(r => {
            if (!r || !Array.isArray(r.missingVariables)) return false;
            return r.missingVariables.includes(variable);
          }).length;
          lines.push(`  - ${chalk.yellow(variable)}: ${missingCount} 个收件人缺失`);
        }
      }
      
      // 详细信息
      if (showDetails) {
        lines.push('');
        lines.push(chalk.bold('📋 详细结果:'));
        lines.push('─'.repeat(60));
        
        // 安全地获取结果数组
        const results = Array.isArray(result.results) ? result.results : [];
        
        for (const item of results) {
          if (!item || typeof item !== 'object') continue;
          
          const itemSuccess = typeof item.success === 'boolean' ? item.success : false;
          const statusIcon = itemSuccess ? '✅' : '❌';
          
          // 安全地获取 email
          const itemEmail = item.recipient?.email || 'unknown@example.com';
          
          // 安全地获取缺失变量
          const itemMissingVariables = Array.isArray(item.missingVariables)
            ? item.missingVariables.filter(v => typeof v === 'string')
            : [];
          
          const missingInfo = itemMissingVariables.length > 0 
            ? ` (缺失: ${itemMissingVariables.join(', ')})` 
            : '';
          
          lines.push(`\n${statusIcon} ${itemEmail}${missingInfo}`);
          
          if (itemMissingVariables.length > 0) {
            lines.push(`   ${chalk.yellow('缺失变量: ' + itemMissingVariables.join(', '))}`);
          }
          
          // 显示错误信息（如果有）
          if (item.errorMessage) {
            lines.push(`   ${chalk.red('错误: ' + item.errorMessage)}`);
          }
        }
      }
      
      // 跳过的收件人信息
      if (result.skippedRecipients && result.skippedRecipients.length > 0) {
        lines.push('');
        lines.push(chalk.bold('⚠️ 跳过的收件人索引:'));
        lines.push(`   ${result.skippedRecipients.join(', ')}`);
      }
    } catch (error) {
      lines.push(chalk.red(`\n❌ 预览批量渲染结果时出错: ${(error as Error).message}`));
    }
    
    lines.push('');
    lines.push('═'.repeat(60));
    
    return lines.join('\n');
  }

  /**
   * 安全地生成缺失变量的详细报告
   * @param result 批量渲染结果
   */
  generateMissingVariablesReport(result: BatchRenderResult): string {
    try {
      // 处理 null 或 undefined 的 result
      if (!result || typeof result !== 'object') {
        return chalk.red('\n❌ 无效的批量渲染结果\n');
      }
      
      // 安全地获取所有缺失变量
      const allMissingVariables = Array.isArray(result.allMissingVariables)
        ? result.allMissingVariables.filter(v => typeof v === 'string')
        : [];
      
      if (allMissingVariables.length === 0) {
        return chalk.green('\n✅ 没有缺失变量，所有邮件都可以正常渲染！\n');
      }
      
      const lines: string[] = [];
      
      lines.push(chalk.bold('\n📋 缺失变量详细报告'));
      lines.push('═'.repeat(60));
      
      // 安全地获取结果数组
      const results = Array.isArray(result.results) ? result.results : [];
      
      // 按变量分组
      const variableRecipients: Record<string, string[]> = {};
      
      for (const variable of allMissingVariables) {
        variableRecipients[variable] = results
          .filter(r => {
            if (!r || !Array.isArray(r.missingVariables)) return false;
            return r.missingVariables.includes(variable);
          })
          .map(r => r.recipient?.email || 'unknown@example.com');
      }
      
      // 按缺失数量排序
      const sortedVariables = Object.entries(variableRecipients)
        .sort((a, b) => b[1].length - a[1].length);
      
      for (const [variable, recipients] of sortedVariables) {
        lines.push(`\n${chalk.bold.yellow(`⚠️ 变量: ${variable}`)}`);
        lines.push(`   ${chalk.gray(`影响 ${recipients.length} 个收件人:`)}`);
        
        // 限制显示数量
        const maxShow = 10;
        const displayed = recipients.slice(0, maxShow);
        const hidden = recipients.length - maxShow;
        
        for (const email of displayed) {
          lines.push(`   • ${email}`);
        }
        
        if (hidden > 0) {
          lines.push(`   ... 还有 ${hidden} 个收件人 ...`);
        }
      }
      
      lines.push('');
      lines.push('═'.repeat(60));
      
      return lines.join('\n');
    } catch (error) {
      return chalk.red(`\n❌ 生成缺失变量报告时出错: ${(error as Error).message}\n`);
    }
  }
}
