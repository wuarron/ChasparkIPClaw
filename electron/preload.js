const { contextBridge, ipcRenderer } = require('electron')

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  
  // OpenClaw 管理
  getOpenClawStatus: () => ipcRenderer.invoke('get-openclaw-status'),
  restartOpenClaw: () => ipcRenderer.invoke('restart-openclaw'),
  
  // 配置管理
  getConfig: (key) => ipcRenderer.invoke('get-config', key),
  setConfig: (key, value) => ipcRenderer.invoke('set-config', key, value),
  
  // 文件选择
  selectFile: () => ipcRenderer.invoke('select-file'),
  
  // 日志管理
  getLogPath: () => ipcRenderer.invoke('get-log-path'),
  getLogs: () => ipcRenderer.invoke('get-logs'),
  
  // 事件监听
  onOpenClawStatus: (callback) => {
    ipcRenderer.on('openclaw-status', (event, data) => callback(data))
  },
  onOpenClawLog: (callback) => {
    ipcRenderer.on('openclaw-log', (event, data) => callback(data))
  },
  
  // 移除监听
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  }
})
