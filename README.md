# ChasparkIPClaw

基于 OpenClaw 的 Windows 本地安装程序项目。

## 简介

本项目旨在为 OpenClaw 制作一个 Windows 平台的一键安装程序，简化用户在本地 Windows 环境下的部署流程。

## 功能目标

- Windows 安装包 (.exe / .msi)
- 自动安装依赖环境 (Node.js, etc.)
- 配置向导
- 服务管理 (启动/停止/重启)
- 开机自启动选项

## 项目结构

```
ChasparkIPClaw/
├── electron/           # Electron 主进程
│   ├── main.js         # 主进程入口
│   └── preload.js      # 预加载脚本
├── src/                # 渲染进程
│   ├── index.html      # 主页面
│   ├── styles/         # 样式文件
│   └── scripts/        # 前端脚本
├── build/              # 构建资源
├── resources/          # 打包资源
│   ├── openclaw/       # OpenClaw 文件
│   └── node/           # Node.js 运行时
├── scripts/            # 构建脚本
└── package.json        # 项目配置
```

## 开发指南

### 环境要求

- Node.js 18+
- npm / pnpm / yarn

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建

```bash
# 构建所有平台
npm run build

# 仅构建 Windows
npm run build:win
```

## 技术栈

- **Electron** - 跨平台桌面应用框架
- **electron-builder** - 打包和分发工具
- **electron-store** - 本地配置存储
- **electron-updater** - 自动更新

## 许可证

MIT License
