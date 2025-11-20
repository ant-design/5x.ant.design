#!/usr/bin/env node

const { execSync } = require('child_process');
const ghPages = require('gh-pages');
const simpleGit = require('simple-git');
const fs = require('fs-extra');
const path = require('path');

/**
 * 构建并部署 antd 文档站点
 */
async function buildAndDeploy() {
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

    // 3. 查找构建产物
    const buildDirs = ['dist', '_site', 'build', 'public'];
    let buildPath = null;

    for (const dir of buildDirs) {
      const fullPath = path.join(tempDir, dir);
      if (await fs.pathExists(fullPath)) {
        buildPath = fullPath;
        console.log(`📁 找到构建产物: ${dir}`);
        break;
      }
    }

    if (!buildPath) {
      throw new Error('找不到构建产物目录');
    }

    // 4. 复制 CNAME 文件
    const cnamePath = path.join(process.cwd(), 'CNAME');
    if (await fs.pathExists(cnamePath)) {
      await fs.copy(cnamePath, path.join(buildPath, 'CNAME'));
      console.log('📄 复制 CNAME 文件');
    }

    // 5. 部署
    console.log('🔄 部署到 GitHub Pages...');
    await ghPages.publish(buildPath, {
      branch: 'gh-pages',
      message: `Deploy: ${new Date().toISOString().split('T')[0]}`,
      dotfiles: true,
    });

    console.log('🎉 部署完成！站点: https://5x.ant.design');
  } catch (error) {
    console.error(`❌ 失败: ${error.message}`);
    process.exit(1);
  } finally {
    await fs.remove(tempDir).catch(() => {});
  }
}

// 执行构建和部署
if (require.main === module) {
  buildAndDeploy();
}

module.exports = { buildAndDeploy };
