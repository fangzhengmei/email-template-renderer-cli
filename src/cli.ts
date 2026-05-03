#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { TemplateRenderer } from './renderer';
import { ResultPreviewer } from './preview';
import { DataValidator, ValidationError, ValidationResult } from './validator';
import { Recipient, TemplateVariables, BatchRenderResult } from './types';

// 创建命令行程序
const program = new Command();

// 初始化渲染器、预览器和验证器
const renderer = new TemplateRenderer();
const previewer = new ResultPreviewer();
const validator = new DataValidator();

/**
 * 读取文件内容，带错误处理
 */
function readFile(filePath: string): string {
  if (!filePath || typeof filePath !== 'string') {
    console.error(chalk.red('❌ 文件路径无效'));
    process.exit(1);
  }

  const resolvedPath = path.resolve(filePath);
  
  // 检查文件是否存在
  if (!fs.existsSync(resolvedPath)) {
    console.error(chalk.red(`❌ 文件不存在: ${resolvedPath}`));
    process.exit(1);
  }

  // 检查是否为文件
  try {
    const stats = fs.statSync(resolvedPath);
    if (!stats.isFile()) {
      console.error(chalk.red(`❌ 路径不是文件: ${resolvedPath}`));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red(`❌ 无法访问文件: ${resolvedPath}`));
    console.error(chalk.red((error as Error).message));
    process.exit(1);
  }

  // 读取文件内容
  try {
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    
    // 检查文件是否为空
    if (content.trim() === '') {
      console.warn(chalk.yellow(`⚠️  文件为空: ${resolvedPath}`));
    }
    
    return content;
  } catch (error) {
    console.error(chalk.red(`❌ 无法读取文件: ${resolvedPath}`));
    console.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}

/**
 * 解析 JSON 文件，带错误处理和详细提示
 */
function parseJsonFile<T>(filePath: string): T {
  const content = readFile(filePath);
  
  if (content.trim() === '') {
    console.error(chalk.red(`❌ JSON 文件为空: ${filePath}`));
    process.exit(1);
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    console.error(chalk.red(`❌ 无法解析 JSON 文件: ${filePath}`));
    
    // 提供更详细的错误信息
    if (error instanceof SyntaxError) {
      const match = error.message.match(/position (\d+)/);
      if (match) {
        const position = parseInt(match[1]);
        const lines = content.split('\n');
        let currentPos = 0;
        let lineNumber = 0;
        let columnNumber = 0;
        
        for (let i = 0; i < lines.length; i++) {
          const lineLength = lines[i].length + 1; // +1 for newline
          if (currentPos + lineLength > position) {
            lineNumber = i + 1;
            columnNumber = position - currentPos + 1;
            break;
          }
          currentPos += lineLength;
        }
        
        console.error(chalk.red(`   错误位置: 第 ${lineNumber} 行, 第 ${columnNumber} 列`));
        
        // 显示错误附近的内容
        if (lineNumber > 0) {
          const startLine = Math.max(0, lineNumber - 2);
          const endLine = Math.min(lines.length, lineNumber + 1);
          
          console.error(chalk.gray('\n   上下文:'));
          for (let i = startLine; i < endLine; i++) {
            const prefix = i + 1 === lineNumber ? chalk.red(' > ') : '   ';
            const lineNum = String(i + 1).padStart(3, ' ');
            console.error(chalk.gray(`${lineNum} |${prefix}${lines[i]}`));
          }
        }
      }
    }
    
    console.error(chalk.red(`   ${(error as Error).message}`));
    process.exit(1);
  }
}

/**
 * 确保输出目录存在，带错误处理
 */
function ensureOutputDir(dirPath: string): void {
  if (!dirPath || typeof dirPath !== 'string') {
    console.error(chalk.red('❌ 输出目录路径无效'));
    process.exit(1);
  }

  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(chalk.gray(`   创建输出目录: ${dirPath}`));
    }
  } catch (error) {
    console.error(chalk.red(`❌ 无法创建输出目录: ${dirPath}`));
    console.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}

/**
 * 写入文件，带错误处理
 */
function writeFile(filePath: string, content: string): boolean {
  try {
    ensureOutputDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error(chalk.red(`❌ 无法写入文件: ${filePath}`));
    console.error(chalk.red((error as Error).message));
    return false;
  }
}

/**
 * 显示验证错误
 */
function displayValidationErrors(result: ValidationResult<unknown>, context: string): void {
  if (result.errors.length > 0) {
    console.error(chalk.red(`\n❌ ${context} 验证失败:`));
    console.error(chalk.red(validator.formatErrors(result.errors)));
  }
  
  if (result.warnings.length > 0) {
    console.warn(chalk.yellow(`\n⚠️  ${context} 警告:`));
    console.warn(chalk.yellow(validator.formatWarnings(result.warnings)));
  }
}

// 配置 CLI 程序
program
  .name('email-render')
  .description('邮件模板渲染 CLI 工具')
  .version('1.0.0');

// 单个渲染命令
program
  .command('render')
  .description('渲染单个邮件模板')
  .option('-t, --template <path>', '模板文件路径')
  .option('-v, --variables <path>', '变量 JSON 文件路径')
  .option('-o, --output <path>', '输出文件路径')
  .option('-p, --preview', '在控制台预览结果')
  .option('--no-content', '不显示邮件内容')
  .option('--strict', '严格模式，缺失变量时失败')
  .action((options) => {
    // 检查必需参数
    if (!options.template) {
      console.error(chalk.red('❌ 请提供模板文件路径 (--template)'));
      process.exit(1);
    }

    if (!options.variables) {
      console.error(chalk.red('❌ 请提供变量文件路径 (--variables)'));
      process.exit(1);
    }

    // 读取模板和变量
    const template = readFile(options.template);
    const rawVariables = parseJsonFile<unknown>(options.variables);

    // 验证变量数据
    const validationResult = validator.validateTemplateVariables(rawVariables);
    displayValidationErrors(validationResult, '变量数据');

    if (!validationResult.valid || !validationResult.data) {
      console.error(chalk.red('\n❌ 变量数据验证失败，无法继续渲染'));
      process.exit(1);
    }

    const variables = validationResult.data;

    // 创建虚拟收件人
    const recipient: Recipient = {
      email: 'single@example.com',
      variables
    };

    // 使用严格模式渲染（如果指定）
    const renderEngine = options.strict 
      ? new TemplateRenderer({ strictMode: true }) 
      : renderer;

    // 渲染
    const result = renderEngine.renderRecipient(template, recipient);

    // 预览
    if (options.preview || !options.output) {
      console.log(previewer.previewSingle(result, options.content !== false));
    }

    // 输出到文件
    if (options.output) {
      const outputPath = path.resolve(options.output);
      if (writeFile(outputPath, result.content)) {
        console.log(chalk.green(`\n✅ 已保存到: ${outputPath}`));
      }
    }

    // 检查缺失变量
    if (result.missingVariables.length > 0) {
      console.log(chalk.yellow(`\n⚠️  注意: 存在 ${result.missingVariables.length} 个缺失变量`));
      console.log(chalk.yellow(`   缺失变量: ${result.missingVariables.join(', ')}`));
    }

    // 检查是否失败
    if (!result.success) {
      console.error(chalk.red(`\n❌ 渲染失败: ${result.errorMessage || '未知错误'}`));
      process.exit(1);
    }
  });

// 批量渲染命令
program
  .command('batch')
  .description('批量渲染邮件模板')
  .option('-t, --template <path>', '模板文件路径')
  .option('-r, --recipients <path>', '收件人 JSON 文件路径')
  .option('-o, --output-dir <path>', '输出目录路径')
  .option('-p, --preview', '在控制台预览结果')
  .option('-d, --details', '显示详细信息')
  .option('--missing-report', '生成缺失变量报告')
  .option('--strict', '严格模式，缺失变量时失败')
  .option('--skip-invalid', '跳过无效的收件人数据')
  .action((options) => {
    // 检查必需参数
    if (!options.template) {
      console.error(chalk.red('❌ 请提供模板文件路径 (--template)'));
      process.exit(1);
    }

    if (!options.recipients) {
      console.error(chalk.red('❌ 请提供收件人文件路径 (--recipients)'));
      process.exit(1);
    }

    // 读取模板和收件人
    const template = readFile(options.template);
    const rawRecipients = parseJsonFile<unknown>(options.recipients);

    // 验证收件人数据
    const validationResult = validator.validateRecipients(rawRecipients);
    displayValidationErrors(validationResult, '收件人数据');

    if (!validationResult.valid || !validationResult.data) {
      if (options.skipInvalid && validationResult.data && validationResult.data.length > 0) {
        console.log(chalk.yellow(`\n⚠️  跳过无效数据，继续处理 ${validationResult.data.length} 个有效收件人`));
      } else {
        console.error(chalk.red('\n❌ 收件人数据验证失败，无法继续渲染'));
        process.exit(1);
      }
    }

    const recipients = validationResult.data || [];

    if (recipients.length === 0) {
      console.log(chalk.yellow('\n⚠️  没有有效的收件人数据，无需渲染'));
      process.exit(0);
    }

    // 使用严格模式渲染（如果指定）
    const renderEngine = options.strict 
      ? new TemplateRenderer({ strictMode: true }) 
      : renderer;

    // 批量渲染
    const result = renderEngine.renderBatch(template, recipients);

    // 预览
    if (options.preview || !options.outputDir) {
      console.log(previewer.previewBatch(result, options.details));
    }

    // 缺失变量报告
    if (options.missingReport) {
      console.log(previewer.generateMissingVariablesReport(result));
    }

    // 输出到文件
    if (options.outputDir) {
      const outputDir = path.resolve(options.outputDir);
      ensureOutputDir(outputDir);

      let savedCount = 0;
      let failedCount = 0;
      
      for (const item of result.results) {
        // 生成安全的文件名
        const safeEmail = item.recipient.email.replace(/[@.]/g, '_');
        const fileName = `${safeEmail}.html`;
        const filePath = path.join(outputDir, fileName);

        if (writeFile(filePath, item.content)) {
          savedCount++;
        } else {
          failedCount++;
        }
      }

      if (savedCount > 0) {
        console.log(chalk.green(`\n✅ 已保存 ${savedCount} 封邮件到: ${outputDir}`));
      }
      if (failedCount > 0) {
        console.error(chalk.red(`❌ ${failedCount} 封邮件保存失败`));
      }
    }

    // 统计信息
    console.log(chalk.bold(`\n📊 渲染统计:`));
    console.log(`   总计: ${result.total} 封`);
    console.log(chalk.green(`   成功: ${result.successCount} 封`));
    if (result.failureCount > 0) {
      console.log(chalk.red(`   失败: ${result.failureCount} 封`));
    }
    if (result.skippedCount && result.skippedCount > 0) {
      console.log(chalk.yellow(`   跳过: ${result.skippedCount} 封`));
    }
    if (result.allMissingVariables.length > 0) {
      console.log(chalk.yellow(`   缺失变量: ${result.allMissingVariables.length} 个`));
    }

    // 如果有失败且是严格模式，退出码为 1
    if (result.failureCount > 0 && options.strict) {
      process.exit(1);
    }
  });

// 检查命令
program
  .command('check')
  .description('检查模板和变量，不实际渲染')
  .option('-t, --template <path>', '模板文件路径')
  .option('-v, --variables <path>', '变量 JSON 文件路径 (可选)')
  .option('-r, --recipients <path>', '收件人 JSON 文件路径 (可选)')
  .action((options) => {
    // 检查必需参数
    if (!options.template) {
      console.error(chalk.red('❌ 请提供模板文件路径 (--template)'));
      process.exit(1);
    }

    // 读取模板
    const template = readFile(options.template);

    // 提取模板变量
    const templateVariables = renderer.extractVariables(template);

    console.log(chalk.bold('\n📋 模板检查报告'));
    console.log('═'.repeat(50));

    console.log(`\n${chalk.bold('模板变量:')}`);
    if (templateVariables.length === 0) {
      console.log(chalk.gray('   模板中没有找到变量'));
    } else {
      for (const variable of templateVariables) {
        console.log(`   • ${variable}`);
      }
      console.log(chalk.gray(`   共 ${templateVariables.length} 个变量`));
    }

    // 检查变量文件
    if (options.variables) {
      console.log(`\n${chalk.bold('变量文件检查:')}`);
      
      try {
        const rawVariables = parseJsonFile<unknown>(options.variables);
        const validationResult = validator.validateTemplateVariables(rawVariables);
        
        if (validationResult.valid && validationResult.data) {
          const missingVariables = renderer.findMissingVariables(templateVariables, validationResult.data);
          
          if (missingVariables.length === 0) {
            console.log(chalk.green('   ✅ 所有变量都已提供'));
          } else {
            console.log(chalk.yellow(`   ⚠️  缺失 ${missingVariables.length} 个变量:`));
            for (const variable of missingVariables) {
              console.log(chalk.yellow(`      • ${variable}`));
            }
          }
        }
        
        displayValidationErrors(validationResult, '变量数据');
      } catch (error) {
        console.error(chalk.red(`   ❌ 无法检查变量文件: ${(error as Error).message}`));
      }
    }

    // 检查收件人文件
    if (options.recipients) {
      console.log(`\n${chalk.bold('收件人检查:')}`);
      
      try {
        const rawRecipients = parseJsonFile<unknown>(options.recipients);
        const validationResult = validator.validateRecipients(rawRecipients);
        
        if (validationResult.valid && validationResult.data) {
          const recipients = validationResult.data;
          console.log(`   共 ${recipients.length} 个有效收件人`);

          // 检查每个收件人的变量
          let totalMissing = 0;
          const recipientsWithMissing: string[] = [];

          for (const recipient of recipients) {
            const missing = renderer.findMissingVariables(templateVariables, recipient.variables);
            if (missing.length > 0) {
              totalMissing++;
              recipientsWithMissing.push(`${recipient.email} (缺失: ${missing.join(', ')})`);
            }
          }

          if (totalMissing === 0) {
            console.log(chalk.green('   ✅ 所有收件人都有完整的变量'));
          } else {
            console.log(chalk.yellow(`   ⚠️  ${totalMissing} 个收件人存在缺失变量:`));
            const maxShow = 10;
            for (let i = 0; i < Math.min(recipientsWithMissing.length, maxShow); i++) {
              console.log(chalk.yellow(`      • ${recipientsWithMissing[i]}`));
            }
            if (recipientsWithMissing.length > maxShow) {
              console.log(chalk.yellow(`      ... 还有 ${recipientsWithMissing.length - maxShow} 个 ...`));
            }
          }
        }
        
        displayValidationErrors(validationResult, '收件人数据');
      } catch (error) {
        console.error(chalk.red(`   ❌ 无法检查收件人文件: ${(error as Error).message}`));
      }
    }

    console.log('\n' + '═'.repeat(50));
  });

// 解析命令行参数
program.parse(process.argv);

// 如果没有提供命令，显示帮助
if (process.argv.length <= 2) {
  program.help();
}
