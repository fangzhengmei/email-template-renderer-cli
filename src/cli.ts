#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { TemplateRenderer } from './renderer';
import { ResultPreviewer } from './preview';
import { Recipient, TemplateVariables } from './types';

// 创建命令行程序
const program = new Command();

// 初始化渲染器和预览器
const renderer = new TemplateRenderer();
const previewer = new ResultPreviewer();

/**
 * 读取文件内容
 */
function readFile(filePath: string): string {
  try {
    return fs.readFileSync(path.resolve(filePath), 'utf-8');
  } catch (error) {
    console.error(chalk.red(`❌ 无法读取文件: ${filePath}`));
    console.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}

/**
 * 解析 JSON 文件
 */
function parseJsonFile<T>(filePath: string): T {
  const content = readFile(filePath);
  try {
    return JSON.parse(content);
  } catch (error) {
    console.error(chalk.red(`❌ 无法解析 JSON 文件: ${filePath}`));
    console.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}

/**
 * 确保输出目录存在
 */
function ensureOutputDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
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
    const variables = parseJsonFile<TemplateVariables>(options.variables);

    // 创建虚拟收件人
    const recipient: Recipient = {
      email: 'single@example.com',
      variables
    };

    // 渲染
    const result = renderer.renderRecipient(template, recipient);

    // 预览
    if (options.preview || !options.output) {
      console.log(previewer.previewSingle(result, options.content !== false));
    }

    // 输出到文件
    if (options.output) {
      const outputPath = path.resolve(options.output);
      ensureOutputDir(path.dirname(outputPath));
      fs.writeFileSync(outputPath, result.content, 'utf-8');
      console.log(chalk.green(`\n✅ 已保存到: ${outputPath}`));
    }

    // 检查缺失变量
    if (result.missingVariables.length > 0) {
      console.log(chalk.yellow(`\n⚠️  注意: 存在 ${result.missingVariables.length} 个缺失变量`));
      console.log(chalk.yellow(`   缺失变量: ${result.missingVariables.join(', ')}`));
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
    const recipients = parseJsonFile<Recipient[]>(options.recipients);

    // 批量渲染
    const result = renderer.renderBatch(template, recipients);

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
      for (const item of result.results) {
        // 生成安全的文件名
        const safeEmail = item.recipient.email.replace(/[@.]/g, '_');
        const fileName = `${safeEmail}.html`;
        const filePath = path.join(outputDir, fileName);

        fs.writeFileSync(filePath, item.content, 'utf-8');
        savedCount++;
      }

      console.log(chalk.green(`\n✅ 已保存 ${savedCount} 封邮件到: ${outputDir}`));
    }

    // 统计信息
    console.log(chalk.bold(`\n📊 渲染统计:`));
    console.log(`   总计: ${result.total} 封`);
    console.log(chalk.green(`   成功: ${result.successCount} 封`));
    if (result.failureCount > 0) {
      console.log(chalk.red(`   失败: ${result.failureCount} 封`));
    }
    if (result.allMissingVariables.length > 0) {
      console.log(chalk.yellow(`   缺失变量: ${result.allMissingVariables.length} 个`));
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
      const variables = parseJsonFile<TemplateVariables>(options.variables);
      const missingVariables = renderer.findMissingVariables(templateVariables, variables);

      console.log(`\n${chalk.bold('变量文件检查:')}`);
      if (missingVariables.length === 0) {
        console.log(chalk.green('   ✅ 所有变量都已提供'));
      } else {
        console.log(chalk.yellow(`   ⚠️  缺失 ${missingVariables.length} 个变量:`));
        for (const variable of missingVariables) {
          console.log(chalk.yellow(`      • ${variable}`));
        }
      }
    }

    // 检查收件人文件
    if (options.recipients) {
      const recipients = parseJsonFile<Recipient[]>(options.recipients);

      console.log(`\n${chalk.bold('收件人检查:')}`);
      console.log(`   共 ${recipients.length} 个收件人`);

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

    console.log('\n' + '═'.repeat(50));
  });

// 解析命令行参数
program.parse(process.argv);

// 如果没有提供命令，显示帮助
if (process.argv.length <= 2) {
  program.help();
}
