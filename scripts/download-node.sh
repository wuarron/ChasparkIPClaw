#!/bin/bash

# 下载 Node.js Windows 运行时
# 这个脚本在 Linux 上运行，下载 Windows 版本的 Node.js

set -e

NODE_VERSION="v20.11.0"
NODE_URL="https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-win-x64.zip"
TARGET_DIR="resources/node"

echo "📥 Downloading Node.js ${NODE_VERSION} for Windows x64..."

mkdir -p tmp
curl -L -o tmp/node-win.zip "$NODE_URL"

echo "📦 Extracting..."
unzip -o tmp/node-win.zip -d tmp/

# 只复制必要的文件
echo "📋 Copying files..."
mkdir -p "$TARGET_DIR"
cp -r tmp/node-${NODE_VERSION}-win-x64/* "$TARGET_DIR/"

# 清理
rm -rf tmp

echo "✅ Node.js runtime ready at $TARGET_DIR"
