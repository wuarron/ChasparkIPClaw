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
├── installer/       # 安装程序源码
├── scripts/         # 构建脚本
├── resources/       # 安装资源文件
├── docs/            # 文档
└── tests/           # 测试
```

## 技术栈

- Electron / Tauri (可选)
- NSIS / Inno Setup / WiX Toolset
- Node.js

## 许可证

MIT License
