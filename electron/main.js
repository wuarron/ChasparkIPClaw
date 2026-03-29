const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const Store = require('electron-store')

// 禁用硬件加速（可选，解决某些渲染问题）
// app.disableHardwareAcceleration()

// 全局变量
let mainWindow = null
let tray = null
let openClawProcess = null
const store = new Store()

// OpenClaw 管理器
class OpenClawManager {
  constructor() {
    this.process = null
    this.isRunning = false
    this.port = store.get('openclaw.port', 18789)
  }

  getStateDir() {
    const stateDir = path.join(app.getPath('userData'), 'openclaw-state')
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true })
    }
    return stateDir
  }

  start() {
    if (this.isRunning) {
      console.log('OpenClaw is already running')
      return
    }

    const resourcePath = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..')
    const openclawPath = path.join(resourcePath, 'openclaw')
    const nodePath = path.join(resourcePath, 'node', 'node.exe')
    
    // 开发环境使用系统 Node.js，生产环境使用打包的 Node.js
    const nodeExecutable = app.isPackaged ? nodePath : process.execPath
    
    console.log('Starting OpenClaw from:', openclawPath)
    console.log('Using Node.js:', nodeExecutable)
    
    try {
      this.process = spawn(nodeExecutable, ['openclaw.mjs', 'gateway', '--port', String(this.port)], {
        cwd: openclawPath,
        env: {
          ...process.env,
          OPENCLAW_STATE_DIR: this.getStateDir(),
          NODE_ENV: 'production'
        },
        stdio: ['ignore', 'pipe', 'pipe']
      })

      this.process.stdout.on('data', (data) => {
        console.log(`[OpenClaw] ${data}`)
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('openclaw-log', data.toString())
        }
      })

      this.process.stderr.on('data', (data) => {
        console.error(`[OpenClaw Error] ${data}`)
      })

      this.process.on('close', (code) => {
        console.log(`OpenClaw process exited with code ${code}`)
        this.isRunning = false
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('openclaw-status', { running: false })
        }
      })

      this.isRunning = true
      
      // 通知主窗口
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('openclaw-status', { running: true, port: this.port })
      }
      
    } catch (error) {
      console.error('Failed to start OpenClaw:', error)
    }
  }

  stop() {
    if (this.process) {
      this.process.kill('SIGTERM')
      this.process = null
      this.isRunning = false
    }
  }

  restart() {
    this.stop()
    setTimeout(() => this.start(), 1000)
  }

  getPort() {
    return this.port
  }

  setPort(port) {
    this.port = port
    store.set('openclaw.port', port)
  }
}

const openClawManager = new OpenClawManager()

// 创建主窗口
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false, // 无边框设计
    transparent: false,
    backgroundColor: '#0a0a0f',
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 15, y: 15 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true
    },
    icon: path.join(__dirname, '../build/icon.png'),
    show: false
  })

  // 加载主页面
  mainWindow.loadFile(path.join(__dirname, '../src/index.html'))

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // 窗口关闭时最小化到托盘
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 创建系统托盘
function createTray() {
  const iconPath = path.join(__dirname, '../build/icon.png')
  let trayIcon
  
  try {
    trayIcon = nativeImage.createFromPath(iconPath)
    if (trayIcon.isEmpty()) {
      // 如果图标加载失败，创建一个默认图标
      trayIcon = nativeImage.createEmpty()
    }
  } catch (e) {
    trayIcon = nativeImage.createEmpty()
  }

  tray = new Tray(trayIcon)
  
  updateTrayMenu()

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

// 更新托盘菜单
function updateTrayMenu() {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开主界面',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    {
      label: openClawManager.isRunning ? '重启服务' : '启动服务',
      click: () => {
        openClawManager.restart()
      }
    },
    { type: 'separator' },
    {
      label: '帮助说明',
      click: () => {
        shell.openExternal('https://docs.openclaw.ai')
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true
        openClawManager.stop()
        app.quit()
      }
    }
  ])

  tray.setToolTip('ChasparkIPClaw')
  tray.setContextMenu(contextMenu)
}

// IPC 处理
ipcMain.handle('window-minimize', () => {
  mainWindow?.minimize()
})

ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.handle('window-close', () => {
  mainWindow?.hide()
})

ipcMain.handle('get-openclaw-status', () => {
  return {
    running: openClawManager.isRunning,
    port: openClawManager.getPort()
  }
})

ipcMain.handle('restart-openclaw', () => {
  openClawManager.restart()
})

ipcMain.handle('get-config', (event, key) => {
  return store.get(key)
})

ipcMain.handle('set-config', (event, key, value) => {
  store.set(key, value)
  return true
})

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  return result.filePaths
})

// 应用启动
app.whenReady().then(() => {
  createMainWindow()
  createTray()
  
  // 启动 OpenClaw（延迟启动，等待窗口加载完成）
  setTimeout(() => {
    openClawManager.start()
    updateTrayMenu()
  }, 2000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

// 所有窗口关闭时退出（Windows/Linux）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出前清理
app.on('before-quit', () => {
  app.isQuitting = true
  openClawManager.stop()
})

// 导出管理器供其他模块使用
module.exports = { openClawManager }
