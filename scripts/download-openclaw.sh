#!/bin/bash

# 下载 OpenClaw 并准备打包资源

set -e

TARGET_DIR="resources/openclaw"

echo "🦞 Preparing OpenClaw for packaging..."

mkdir -p "$TARGET_DIR"

# 使用 npm pack 打包 OpenClaw
echo "📦 Downloading OpenClaw..."
cd "$TARGET_DIR"
npm pack openclaw@latest
tar -xzf openclaw-*.tgz
rm openclaw-*.tgz
mv package/* .
rm -rf package

# 安装生产依赖
echo "📦 Installing production dependencies..."
npm install --production

echo "✅ OpenClaw ready at $TARGET_DIR"
