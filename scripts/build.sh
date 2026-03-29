#!/bin/bash

# ChasparkIPClaw 构建脚本
# 用于准备打包所需的资源文件

set -e

echo "🦞 ChasparkIPClaw Build Script"
echo "=============================="

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# 安装依赖
echo "📦 Installing dependencies..."
npm install

# 创建资源目录
echo "📁 Creating resource directories..."
mkdir -p resources/openclaw
mkdir -p resources/node

# 下载 Node.js 运行时（Windows x64）
echo "📥 Downloading Node.js runtime for Windows..."
NODE_VERSION="v20.11.0"
NODE_URL="https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-win-x64.zip"

if [ ! -f "resources/node/node.exe" ]; then
    curl -L -o /tmp/node-win.zip "$NODE_URL"
    unzip -o /tmp/node-win.zip -d /tmp/
    cp -r /tmp/node-${NODE_VERSION}-win-x64/* resources/node/
    rm -rf /tmp/node-${NODE_VERSION}-win-x64 /tmp/node-win.zip
    echo "✅ Node.js runtime downloaded"
else
    echo "✅ Node.js runtime already exists"
fi

# 复制 OpenClaw
echo "📋 Copying OpenClaw..."
if [ -d "$HOME/.openclaw" ]; then
    # 如果本地有 OpenClaw，复制它
    echo "   Found local OpenClaw installation"
    # 这里需要根据实际情况调整
else
    echo "   Installing OpenClaw via npm..."
    npm install -g openclaw@latest --prefix resources/openclaw
fi

# 创建图标（占位）
echo "🎨 Creating placeholder icon..."
# 实际项目中需要创建真实的图标文件

echo ""
echo "✅ Build preparation complete!"
echo ""
echo "Next steps:"
echo "  1. Add icon files to build/ directory (icon.ico, icon.png)"
echo "  2. Run 'npm run build:win' to create the installer"
echo ""
