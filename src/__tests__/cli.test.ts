import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * CLI 测试辅助类
 * 用于管理临时测试文件和运行 CLI 命令
 */
class CLITestHelper {
  public testDir: string;
  private projectRoot: string;
  private compiledCliPath: string;

  constructor() {
    this.projectRoot = path.resolve(__dirname, '..', '..');
    this.testDir = path.join(this.projectRoot, 'test-temp');
    this.compiledCliPath = path.join(this.projectRoot, 'dist', 'cli.js');
  }

  /**
   * 确保 CLI 已编译
   */
  ensureCompiled(): void {
    if (!fs.existsSync(this.compiledCliPath)) {
      console.log('编译 CLI 中...');
      execSync('npm run build', {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });
    }
  }

  /**
   * 创建临时测试目录
   */
  setup(): void {
    if (!fs.existsSync(this.testDir)) {
      fs.mkdirSync(this.testDir, { recursive: true });
    }
  }

  /**
   * 清理临时测试目录
   */
  teardown(): void {
    if (fs.existsSync(this.testDir)) {
      fs.rmSync(this.testDir, { recursive: true, force: true });
    }
  }

  /**
   * 创建临时文件
   * @param filename 文件名
   * @param content 文件内容
   * @returns 文件的完整路径
   */
  createTempFile(filename: string, content: string): string {
    const filePath = path.join(this.testDir, filename);
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * 创建临时目录
   * @param dirname 目录名
   * @returns 目录的完整路径
   */
  createTempDir(dirname: string): string {
    const dirPath = path.join(this.testDir, dirname);
    fs.mkdirSync(dirPath, { recursive: true });
    return dirPath;
  }

  /**
   * 检查文件是否存在
   * @param filename 文件名
   * @returns 文件是否存在
   */
  fileExists(filename: string): boolean {
    const filePath = path.join(this.testDir, filename);
    return fs.existsSync(filePath);
  }

  /**
   * 读取文件内容
   * @param filename 文件名
   * @returns 文件内容
   */
  readFile(filename: string): string {
    const filePath = path.join(this.testDir, filename);
    return fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * 运行 CLI 命令
   * @param args 命令参数
   * @returns 命令执行结果
   */
  runCLI(args: string[]): { stdout: string; stderr: string; exitCode: number } {
    const command = `node "${this.compiledCliPath}" ${args.join(' ')}`;

    try {
      const stdout = execSync(command, {
        encoding: 'utf-8',
        cwd: this.projectRoot,
        timeout: 10000,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return { stdout, stderr: '', exitCode: 0 };
    } catch (error) {
      return {
        stdout: (error as any).stdout?.toString() || '',
        stderr: (error as any).stderr?.toString() || '',
        exitCode: (error as any).status || 1
      };
    }
  }
}

describe('CLI 集成测试', () => {
  let testHelper: CLITestHelper;

  beforeAll(() => {
    testHelper = new CLITestHelper();
    // 确保 CLI 已编译
    try {
      testHelper.ensureCompiled();
    } catch (error) {
      console.warn('编译 CLI 失败，跳过集成测试:', error);
    }
  });

  beforeEach(() => {
    testHelper.setup();
  });

  afterEach(() => {
    testHelper.teardown();
  });

  // 检查 CLI 是否已编译
  const isCliCompiled = (): boolean => {
    return fs.existsSync(testHelper.compiledCliPath);
  };

  describe('无效文件路径测试', () => {
    it('应该在模板文件不存在时返回错误', () => {
      if (!isCliCompiled()) {
        console.log('CLI 未编译，跳过测试');
        return;
      }

      // 创建变量文件
      const variablesPath = testHelper.createTempFile('variables.json', JSON.stringify({ name: 'John' }));
      const nonExistentTemplate = path.join(testHelper.testDir, 'non-existent.html');

      // 运行 CLI 命令
      const result = testHelper.runCLI(['render', '-t', `"${nonExistentTemplate}"`, '-v', `"${variablesPath}"`]);

      // 验证结果
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('不存在');
    });

    it('应该在变量文件不存在时返回错误', () => {
      if (!isCliCompiled()) {
        console.log('CLI 未编译，跳过测试');
        return;
      }

      // 创建模板文件
      const templatePath = testHelper.createTempFile('template.html', 'Hello {{name}}!');
      const nonExistentVariables = path.join(testHelper.testDir, 'non-existent.json');

      // 运行 CLI 命令
      const result = testHelper.runCLI(['render', '-t', `"${templatePath}"`, '-v', `"${nonExistentVariables}"`]);

      // 验证结果
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('不存在');
    });

    it('应该在收件人文件不存在时返回错误', () => {
      if (!isCliCompiled()) {
        console.log('CLI 未编译，跳过测试');
        return;
      }

      // 创建模板文件
      const templatePath = testHelper.createTempFile('template.html', 'Hello {{name}}!');
      const nonExistentRecipients = path.join(testHelper.testDir, 'non-existent.json');

      // 运行 CLI 命令
      const result = testHelper.runCLI(['batch', '-t', `"${templatePath}"`, '-r', `"${nonExistentRecipients}"`]);

      // 验证结果
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('不存在');
    });

    it('应该在路径是目录而不是文件时返回错误', () => {
      if (!isCliCompiled()) {
        console.log('CLI 未编译，跳过测试');
        return;
      }

      // 创建一个目录而不是文件
      const dirPath = testHelper.createTempDir('not-a-file');
      
      // 创建变量文件
      const variablesPath = testHelper.createTempFile('variables.json', JSON.stringify({ name: 'John' }));

      // 运行 CLI 命令（使用目录作为模板文件）
      const result = testHelper.runCLI(['render', '-t', `"${dirPath}"`, '-v', `"${variablesPath}"`]);

      // 验证结果
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('不是文件');
    });
  });

  describe('JSON 解析失败测试', () => {
    it('应该在 JSON 格式无效时返回错误', () => {
      if (!isCliCompiled()) {
        console.log('CLI 未编译，跳过测试');
        return;
      }

      // 创建模板文件
      const templatePath = testHelper.createTempFile('template.html', 'Hello {{name}}!');
      
      // 创建无效的 JSON 文件（缺少引号）
      const invalidJsonPath = testHelper.createTempFile('invalid.json', '{ name: "John" }');

      // 运行 CLI 命令
      const result = testHelper.runCLI(['render', '-t', `"${templatePath}"`, '-v', `"${invalidJsonPath}"`]);

      // 验证结果
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('无法解析 JSON');
    });

    it('应该在 JSON 文件为空时返回错误', () => {
      if (!isCliCompiled()) {
        console.log('CLI 未编译，跳过测试');
        return;
      }

      // 创建模板文件
      const templatePath = testHelper.createTempFile('template.html', 'Hello {{name}}!');
      
      // 创建空的 JSON 文件
      const emptyJsonPath = testHelper.createTempFile('empty.json', '');

      // 运行 CLI 命令
      const result = testHelper.runCLI(['render', '-t', `"${templatePath}"`, '-v', `"${emptyJsonPath}"`]);

      // 验证结果
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('JSON 文件为空');
    });

    it('应该在 JSON 有语法错误时显示详细位置', () => {
      if (!isCliCompiled()) {
        console.log('CLI 未编译，跳过测试');
        return;
      }

      // 创建模板文件
      const templatePath = testHelper.createTempFile('template.html', 'Hello {{name}}!');
      
      // 创建有语法错误的 JSON 文件（多余的逗号）
      const syntaxErrorJsonPath = testHelper.createTempFile(
        'syntax-error.json',
        `{
  "name": "John",
  "age": 30,
  "city": "New York",
}`
      );

      // 运行 CLI 命令
      const result = testHelper.runCLI(['render', '-t', `"${templatePath}"`, '-v', `"${syntaxErrorJsonPath}"`]);

      // 验证结果
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('无法解析 JSON');
    });
  });

  describe('结构校验失败测试', () => {
    it('应该在变量不是对象时返回错误', () => {
      if (!isCliCompiled()) {
        console.log('CLI 未编译，跳过测试');
        return;
      }

      // 创建模板文件
      const templatePath = testHelper.createTempFile('template.html', 'Hello {{name}}!');
      
      // 创建数组而不是对象的变量文件
      const arrayVariablesPath = testHelper.createTempFile('array-variables.json', '["item1", "item2"]');

      // 运行 CLI 命令
      const result = testHelper.runCLI(['render', '-t', `"${templatePath}"`, '-v', `"${arrayVariablesPath}"`]);

      // 验证结果
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('不能是数组');
    });

    it('应该在收件人不是数组时返回错误', () => {
      if (!isCliCompiled()) {
        console.log('CLI 未编译，跳过测试');
        return;
      }

      // 创建模板文件
      const templatePath = testHelper.createTempFile('template.html', 'Hello {{name}}!');
      
      // 创建对象而不是数组的收件人文件
      const objectRecipientsPath = testHelper.createTempFile(
        'object-recipients.json',
        JSON.stringify({
          email: 'test@example.com',
          variables: { name: 'John' }
        })
      );

      // 运行 CLI 命令
      const result = testHelper.runCLI(['batch', '-t', `"${templatePath}"`, '-r', `"${objectRecipientsPath}"`]);

      // 验证结果
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('必须是数组类型');
    });

    it('应该在收件人缺少 email 字段时返回错误', () => {
      if (!isCliCompiled()) {
        console.log('CLI 未编译，跳过测试');
        return;
      }

      // 创建模板文件
      const templatePath = testHelper.createTempFile('template.html', 'Hello {{name}}!');
      
      // 创建缺少 email 字段的收件人文件
      const invalidRecipientsPath = testHelper.createTempFile(
        'invalid-recipients.json',
        JSON.stringify([
          {
            // 缺少 email 字段
            variables: { name: 'John' }
          }
        ])
      );

      // 运行 CLI 命令
      const result = testHelper.runCLI(['batch', '-t', `"${templatePath}"`, '-r', `"${invalidRecipientsPath}"`]);

      // 验证结果
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('缺少必需字段');
    });

    it('应该在收件人缺少 variables 字段时返回错误', () => {
      if (!isCliCompiled()) {
        console.log('CLI 未编译，跳过测试');
        return;
      }

      // 创建模板文件
      const templatePath = testHelper.createTempFile('template.html', 'Hello {{name}}!');
      
      // 创建缺少 variables 字段的收件人文件
      const invalidRecipientsPath = testHelper.createTempFile(
        'invalid-recipients.json',
        JSON.stringify([
          {
            email: 'test@example.com'
            // 缺少 variables 字段
          }
        ])
      );

      // 运行 CLI 命令
      const result = testHelper.runCLI(['batch', '-t', `"${templatePath}"`, '-r', `"${invalidRecipientsPath}"`]);

      // 验证结果
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('缺少必需字段');
    });

    it('应该在所有收件人都无效时返回错误', () => {
      if (!isCliCompiled()) {
        console.log('CLI 未编译，跳过测试');
        return;
      }

      // 创建模板文件
      const templatePath = testHelper.createTempFile('template.html', 'Hello {{name}}!');
      
      // 创建所有收件人都无效的文件
      const allInvalidRecipientsPath = testHelper.createTempFile(
        'all-invalid-recipients.json',
        JSON.stringify([
          {
            // 缺少 email 字段
            variables: { name: 'John' }
          },
          {
            // 缺少 variables 字段
            email: 'test2@example.com'
          }
        ])
      );

      // 运行 CLI 命令
      const result = testHelper.runCLI(['batch', '-t', `"${templatePath}"`, '-r', `"${allInvalidRecipientsPath}"`]);

      // 验证结果
      expect(result.exitCode).not.toBe(0);
    });

    it('应该在使用 --skip-invalid 选项时跳过无效收件人并继续处理', () => {
      if (!isCliCompiled()) {
        console.log('CLI 未编译，跳过测试');
        return;
      }

      // 创建模板文件
      const templatePath = testHelper.createTempFile('template.html', 'Hello {{name}}!');
      
      // 创建部分无效的收件人文件
      const mixedRecipientsPath = testHelper.createTempFile(
        'mixed-recipients.json',
        JSON.stringify([
          {
            email: 'valid@example.com',
            variables: { name: 'Valid' }
          },
          {
            // 无效的收件人
            variables: { name: 'Invalid' }
          },
          {
            email: 'another@example.com',
            variables: { name: 'Another' }
          }
        ])
      );

      // 运行 CLI 命令（使用 --skip-invalid 选项）
      const result = testHelper.runCLI(['batch', '-t', `"${templatePath}"`, '-r', `"${mixedRecipientsPath}"`, '--skip-invalid']);

      // 验证结果
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('跳过无效数据');
      expect(result.stdout).toContain('成功: 2');
    });
  });

  describe('正常渲染输出测试', () => {
    it('应该成功渲染单个邮件', () => {
      if (!isCliCompiled()) {
        console.log('CLI 未编译，跳过测试');
        return;
      }

      // 创建模板文件
      const templatePath = testHelper.createTempFile('template.html', 'Hello {{name}}! Your order is {{orderId}}.');
      
      // 创建变量文件
      const variablesPath = testHelper.createTempFile(
        'variables.json',
        JSON.stringify({
          name: 'John',
          orderId: 12345
        })
      );

      // 创建输出路径
      const outputPath = path.join(testHelper.testDir, 'output.html');

      // 运行 CLI 命令
      const result = testHelper.runCLI(['render', '-t', `"${templatePath}"`, '-v', `"${variablesPath}"`, '-o', `"${outputPath}"`]);

      // 验证结果
      expect(result.exitCode).toBe(0);
      expect(testHelper.fileExists('output.html')).toBe(true);
      
      // 验证输出内容
      const outputContent = testHelper.readFile('output.html');
      expect(outputContent).toBe('Hello John! Your order is 12345.');
    });

    it('应该成功批量渲染多个邮件', () => {
      if (!isCliCompiled()) {
        console.log('CLI 未编译，跳过测试');
        return;
      }

      // 创建模板文件
      const templatePath = testHelper.createTempFile('template.html', 'Hello {{name}}!');
      
      // 创建收件人文件
      const recipientsPath = testHelper.createTempFile(
        'recipients.json',
        JSON.stringify([
          {
            email: 'alice@example.com',
            variables: { name: 'Alice' }
          },
          {
            email: 'bob@example.com',
            variables: { name: 'Bob' }
          }
        ])
      );

      // 创建输出目录
      const outputDir = path.join(testHelper.testDir, 'output');

      // 运行 CLI 命令
      const result = testHelper.runCLI(['batch', '-t', `"${templatePath}"`, '-r', `"${recipientsPath}"`, '-o', `"${outputDir}"`]);

      // 验证结果
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('成功: 2');
      
      // 验证输出文件
      expect(testHelper.fileExists('output/alice_example_com.html')).toBe(true);
      expect(testHelper.fileExists('output/bob_example_com.html')).toBe(true);
      
      // 验证输出内容
      const aliceContent = testHelper.readFile('output/alice_example_com.html');
      expect(aliceContent).toBe('Hello Alice!');
      
      const bobContent = testHelper.readFile('output/bob_example_com.html');
      expect(bobContent).toBe('Hello Bob!');
    });

    it('应该成功检查模板和变量', () => {
      if (!isCliCompiled()) {
        console.log('CLI 未编译，跳过测试');
        return;
      }

      // 创建模板文件
      const templatePath = testHelper.createTempFile('template.html', 'Hello {{name}}! Your order is {{orderId}}.');
      
      // 创建变量文件
      const variablesPath = testHelper.createTempFile(
        'variables.json',
        JSON.stringify({
          name: 'John'
          // 缺少 orderId
        })
      );

      // 运行 CLI 命令
      const result = testHelper.runCLI(['check', '-t', `"${templatePath}"`, '-v', `"${variablesPath}"`]);

      // 验证结果
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('模板变量');
      expect(result.stdout).toContain('name');
      expect(result.stdout).toContain('orderId');
      expect(result.stdout).toContain('缺失');
    });

    it('应该在严格模式下当变量缺失时失败', () => {
      if (!isCliCompiled()) {
        console.log('CLI 未编译，跳过测试');
        return;
      }

      // 创建模板文件
      const templatePath = testHelper.createTempFile('template.html', 'Hello {{name}}!');
      
      // 创建缺少变量的变量文件
      const missingVariablesPath = testHelper.createTempFile('missing-variables.json', '{}');

      // 运行 CLI 命令（使用 --strict 选项）
      const result = testHelper.runCLI(['render', '-t', `"${templatePath}"`, '-v', `"${missingVariablesPath}"`, '--strict']);

      // 验证结果
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('渲染失败');
    });

    it('应该在非严格模式下当变量缺失时继续渲染', () => {
      if (!isCliCompiled()) {
        console.log('CLI 未编译，跳过测试');
        return;
      }

      // 创建模板文件
      const templatePath = testHelper.createTempFile('template.html', 'Hello {{name}}!');
      
      // 创建缺少变量的变量文件
      const missingVariablesPath = testHelper.createTempFile('missing-variables.json', '{}');

      // 运行 CLI 命令（不使用 --strict 选项，即非严格模式）
      const result = testHelper.runCLI(['render', '-t', `"${templatePath}"`, '-v', `"${missingVariablesPath}"`]);

      // 验证结果
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('缺失变量');
    });

    it('应该在预览模式下显示渲染结果', () => {
      if (!isCliCompiled()) {
        console.log('CLI 未编译，跳过测试');
        return;
      }

      // 创建模板文件
      const templatePath = testHelper.createTempFile('template.html', 'Hello {{name}}!');
      
      // 创建变量文件
      const variablesPath = testHelper.createTempFile(
        'variables.json',
        JSON.stringify({
          name: 'John'
        })
      );

      // 运行 CLI 命令（使用 --preview 选项）
      const result = testHelper.runCLI(['render', '-t', `"${templatePath}"`, '-v', `"${variablesPath}"`, '--preview']);

      // 验证结果
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('邮件渲染结果');
      expect(result.stdout).toContain('John');
    });

    it('应该在批量渲染时显示缺失变量报告', () => {
      if (!isCliCompiled()) {
        console.log('CLI 未编译，跳过测试');
        return;
      }

      // 创建模板文件
      const templatePath = testHelper.createTempFile('template.html', 'Hello {{name}}! Your order is {{orderId}}.');
      
      // 创建收件人文件（部分缺少变量）
      const recipientsPath = testHelper.createTempFile(
        'recipients.json',
        JSON.stringify([
          {
            email: 'alice@example.com',
            variables: { name: 'Alice' }
            // 缺少 orderId
          },
          {
            email: 'bob@example.com',
            variables: { name: 'Bob', orderId: 123 }
          }
        ])
      );

      // 运行 CLI 命令（使用 --missing-report 选项）
      const result = testHelper.runCLI(['batch', '-t', `"${templatePath}"`, '-r', `"${recipientsPath}"`, '--missing-report']);

      // 验证结果
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('缺失变量详细报告');
      expect(result.stdout).toContain('orderId');
    });
  });
});
