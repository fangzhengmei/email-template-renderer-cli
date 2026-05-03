import chalk from 'chalk';
import { RenderResult, BatchRenderResult } from './types';

/**
 * 预览渲染结果的工具类
 * 提供美观的命令行输出
 */
export class ResultPreviewer {
  /**
   * 预览单个渲染结果
   * @param result 渲染结果
   * @param showContent 是否显示完整内容
   */
  previewSingle(result: RenderResult, showContent: boolean = true): string {
    const lines: string[] = [];
    
    // 标题
    lines.push(chalk.bold('\n📧 邮件渲染结果'));
    lines.push('─'.repeat(50));
    
    // 收件人信息
    lines.push(`${chalk.bold('收件人:')} ${result.recipient.email}`);
    
    // 状态
    const status = result.success 
      ? chalk.green('✅ 成功') 
      : chalk.red('❌ 失败');
    lines.push(`${chalk.bold('状态:')} ${status}`);
    
    // 缺失变量
    if (result.missingVariables.length > 0) {
      lines.push(`${chalk.bold('缺失变量:')} ${chalk.yellow(result.missingVariables.join(', '))}`);
    } else {
      lines.push(`${chalk.bold('缺失变量:')} ${chalk.green('无')}`);
    }
    
    // 内容预览
    if (showContent) {
      lines.push('');
      lines.push(chalk.bold('📄 邮件内容:'));
      lines.push('─'.repeat(50));
      
      // 截断长内容，添加省略号
      const maxLines = 20;
      const contentLines = result.content.split('\n');
      
      if (contentLines.length > maxLines) {
        lines.push(...contentLines.slice(0, maxLines));
        lines.push(chalk.gray(`\n... 还有 ${contentLines.length - maxLines} 行 ...`));
      } else {
        lines.push(...contentLines);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * 预览批量渲染结果
   * @param result 批量渲染结果
   * @param showDetails 是否显示详细信息
   */
  previewBatch(result: BatchRenderResult, showDetails: boolean = false): string {
    const lines: string[] = [];
    
    // 标题
    lines.push(chalk.bold('\n📊 批量邮件渲染报告'));
    lines.push('═'.repeat(60));
    
    // 统计信息
    lines.push('');
    lines.push(chalk.bold('📈 统计信息:'));
    lines.push(`  ${chalk.bold('总计:')} ${result.total} 封邮件`);
    lines.push(`  ${chalk.green('✅ 成功:')} ${result.successCount} 封`);
    lines.push(`  ${chalk.red('❌ 失败:')} ${result.failureCount} 封`);
    
    // 成功率
    const successRate = result.total > 0 
      ? Math.round((result.successCount / result.total) * 100) 
      : 0;
    const rateColor = successRate === 100 ? 'green' : successRate >= 80 ? 'yellow' : 'red';
    lines.push(`  ${chalk.bold('成功率:')} ${chalk[rateColor](`${successRate}%`)}`);
    
    // 所有缺失变量
    if (result.allMissingVariables.length > 0) {
      lines.push('');
      lines.push(chalk.bold('⚠️ 所有缺失变量:'));
      for (const variable of result.allMissingVariables) {
        // 统计有多少收件人缺少这个变量
        const missingCount = result.results.filter(
          r => r.missingVariables.includes(variable)
        ).length;
        lines.push(`  - ${chalk.yellow(variable)}: ${missingCount} 个收件人缺失`);
      }
    }
    
    // 详细信息
    if (showDetails) {
      lines.push('');
      lines.push(chalk.bold('📋 详细结果:'));
      lines.push('─'.repeat(60));
      
      for (const item of result.results) {
        const statusIcon = item.success ? '✅' : '❌';
        const missingInfo = item.missingVariables.length > 0 
          ? ` (缺失: ${item.missingVariables.join(', ')})` 
          : '';
        
        lines.push(`\n${statusIcon} ${item.recipient.email}${missingInfo}`);
        
        if (item.missingVariables.length > 0) {
          lines.push(`   ${chalk.yellow('缺失变量: ' + item.missingVariables.join(', '))}`);
        }
      }
    }
    
    lines.push('');
    lines.push('═'.repeat(60));
    
    return lines.join('\n');
  }

  /**
   * 生成缺失变量的详细报告
   * @param result 批量渲染结果
   */
  generateMissingVariablesReport(result: BatchRenderResult): string {
    if (result.allMissingVariables.length === 0) {
      return chalk.green('\n✅ 没有缺失变量，所有邮件都可以正常渲染！\n');
    }
    
    const lines: string[] = [];
    
    lines.push(chalk.bold('\n📋 缺失变量详细报告'));
    lines.push('═'.repeat(60));
    
    // 按变量分组
    const variableRecipients: Record<string, string[]> = {};
    
    for (const variable of result.allMissingVariables) {
      variableRecipients[variable] = result.results
        .filter(r => r.missingVariables.includes(variable))
        .map(r => r.recipient.email);
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
  }
}
