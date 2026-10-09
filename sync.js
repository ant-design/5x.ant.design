#!/usr/bin/env node

const { execSync } = require('child_process');
const ghPages = require('gh-pages');
const simpleGit = require('simple-git');
const fs = require('fs-extra');
const path = require('path');

/**
 * 构建并部署 antd 文档站点
 * @param {boolean} buildOnly - 是否只构建不部署
 * @param {boolean} skipClean - 是否跳过清理临时目录
 */
async function buildAndDeploy(buildOnly = false, skipClean = false) {
  const tempDir = 'temp-antd-build';

  try {
    console.log('🚀 开始构建 antd 5.x 文档站点...');

    // 1. 克隆仓库
    await fs.remove(tempDir);
    console.log('🔄 克隆 ant-design 5.x-stable 分支...');

    const git = simpleGit();
    await git.clone('https://github.com/ant-design/ant-design.git', tempDir, {
      '--depth': 1,
      '--branch': '5.x-stable',
    });

    // 2. 安装依赖和构建
    console.log('🔄 安装依赖...');
    execSync('ut', { cwd: tempDir, stdio: 'inherit' });

    console.log('🔄 构建文档站点...');
    execSync('ut run site', { cwd: tempDir, stdio: 'inherit' });

    // 3. 构建产物目录
    const buildPath = path.join(tempDir, '_site');
    
    if (!(await fs.pathExists(buildPath))) {
      throw new Error('构建产物目录 _site 不存在');
    }
    
    console.log('📁 使用构建产物目录: _site');

    // 4. 生成 Jekyll 配置文件到构建产物目录
    console.log('🔄 生成 Jekyll 配置文件...');
    const configPath = path.join(buildPath, '_config.yml');
    const configContent = `exclude:
  - "*.txt"
  - "*.md"
  - node_modules
  - package.json
  - package-lock.json
  - yarn.lock
  - .git
  - .gitignore
`;
    
    await fs.writeFile(configPath, configContent);
    console.log('✅ _config.yml 生成完成');

    // 5. 复制 CNAME 文件
    const cnamePath = path.join(process.cwd(), 'CNAME');
    if (await fs.pathExists(cnamePath)) {
      await fs.copy(cnamePath, path.join(buildPath, 'CNAME'));
      console.log('📄 复制 CNAME 文件');
    }

    // 6. 部署（如果不是只构建模式）
    if (!buildOnly) {
      console.log('🔄 部署到 GitHub Pages...');
      await new Promise((resolve, reject) => {
        ghPages.publish(buildPath, {
          branch: 'gh-pages',
          message: `Deploy: ${new Date().toISOString().split('T')[0]}`,
          dotfiles: true,
        }, (error) => error ? reject(error) : resolve());
      });
      console.log('🎉 部署完成！站点: https://5x.ant.design');
    } else {
      console.log('✅ 构建完成！构建产物在:', buildPath);
    }
  } catch (error) {
    console.error(`❌ 失败: ${error.message}`);
    process.exit(1);
  } finally {
    if (!skipClean) {
      await fs.remove(tempDir).catch(() => {});
    } else {
      console.log('🔧 跳过清理临时目录:', tempDir);
    }
  }
}

// 执行构建和部署
if (require.main === module) {
  const args = process.argv.slice(2);
  const buildOnly = args.includes('--build-only');
  const skipClean = args.includes('--skip-clean');
  
  if (buildOnly) {
    console.log('🔧 构建模式：只构建，不部署');
  }
  
  if (skipClean) {
    console.log('🔧 跳过清理模式：保留临时构建目录');
  }
  
  buildAndDeploy(buildOnly, skipClean);
}

module.exports = { buildAndDeploy };
