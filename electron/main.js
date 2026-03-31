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

// 日志文件管理
class LogManager {
  constructor() {
    this.logPath = path.join(app.getPath('userData'), 'logs')
    this.currentLogFile = null
    this.logStream = null
  }

  init() {
    if (!fs.existsSync(this.logPath)) {
      fs.mkdirSync(this.logPath, { recursive: true })
    }
    
    const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    this.currentLogFile = path.join(this.logPath, `openclaw-${date}.log`)
    this.logStream = fs.createWriteStream(this.currentLogFile, { flags: 'a' })
    
    this.log('========================================')
    this.log('ChasparkIPClaw Log Started')
    this.log('========================================')
    this.log('App version:', app.getVersion())
    this.log('Electron version:', process.versions.electron)
    this.log('Node version:', process.versions.node)
    this.log('Platform:', process.platform, process.arch)
    this.log('User data path:', app.getPath('userData'))
    this.log('========================================')
  }

  log(...args) {
    const timestamp = new Date().toISOString()
    const message = `[${timestamp}] ${args.join(' ')}\n`
    
    // 控制台输出
    console.log(...args)
    
    // 文件输出
    if (this.logStream) {
      this.logStream.write(message)
    }
  }

  error(...args) {
    const timestamp = new Date().toISOString()
    const message = `[${timestamp}] [ERROR] ${args.join(' ')}\n`
    
    console.error(...args)
    if (this.logStream) {
      this.logStream.write(message)
    }
  }

  getLogPath() {
    return this.currentLogFile
  }

  getLogs() {
    if (this.currentLogFile && fs.existsSync(this.currentLogFile)) {
      return fs.readFileSync(this.currentLogFile, 'utf8')
    }
    return ''
  }

  close() {
    if (this.logStream) {
      this.logStream.end()
    }
  }
}

const logManager = new LogManager()

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
      logManager.log('[OpenClaw] Already running, skipping start')
      return
    }

    const resourcePath = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..')
    const openclawPath = path.join(resourcePath, 'openclaw')
    const nodePath = path.join(resourcePath, 'node', 'node.exe')
    
    // 开发环境使用系统 Node.js，生产环境使用打包的 Node.js
    const nodeExecutable = app.isPackaged ? nodePath : process.execPath

    logManager.log('========================================')
    logManager.log('[OpenClaw] Starting OpenClaw Service')
    logManager.log('========================================')
    logManager.log('[OpenClaw] Packaged:', app.isPackaged)
    logManager.log('[OpenClaw] Resource path:', resourcePath)
    logManager.log('[OpenClaw] OpenClaw path:', openclawPath)
    logManager.log('[OpenClaw] Node.js executable:', nodeExecutable)
    logManager.log('[OpenClaw] Port:', this.port)
    logManager.log('[OpenClaw] State dir:', this.getStateDir())
    
    // 详细路径检查
    logManager.log('[OpenClaw] Checking paths...')
    
    // 检查 OpenClaw 目录
    if (!fs.existsSync(openclawPath)) {
      const error = `OpenClaw directory not found: ${openclawPath}`
      logManager.error('[OpenClaw] ERROR:', error)
      this.logAndNotify('PATH_ERROR', error, { path: openclawPath, exists: false })
      return
    }
    logManager.log('[OpenClaw] ✓ OpenClaw directory exists')
    
    // 列出 OpenClaw 目录内容
    try {
      const openclawContents = fs.readdirSync(openclawPath)
      logManager.log('[OpenClaw] OpenClaw directory contents:', openclawContents.join(', '))
    } catch (e) {
      logManager.error('[OpenClaw] Failed to list OpenClaw directory:', e.message)
    }
    
    // 检查 openclaw.mjs
    const openclawMjs = path.join(openclawPath, 'openclaw.mjs')
    if (!fs.existsSync(openclawMjs)) {
      const error = `openclaw.mjs not found: ${openclawMjs}`
      logManager.error('[OpenClaw] ERROR:', error)
      this.logAndNotify('PATH_ERROR', error, { path: openclawMjs, exists: false })
      return
    }
    logManager.log('[OpenClaw] ✓ openclaw.mjs exists')
    
    // 检查 Node.js
    if (app.isPackaged) {
      if (!fs.existsSync(nodePath)) {
        const error = `Node.js executable not found: ${nodePath}`
        logManager.error('[OpenClaw] ERROR:', error)
        this.logAndNotify('PATH_ERROR', error, { path: nodePath, exists: false })
        return
      }
      logManager.log('[OpenClaw] ✓ Node.js executable exists')
      
      // 检查 Node.js 版本
      try {
        const nodeStats = fs.statSync(nodePath)
        logManager.log('[OpenClaw] Node.js file size:', nodeStats.size, 'bytes')
      } catch (e) {
        logManager.error('[OpenClaw] Failed to stat Node.js:', e.message)
      }
    }
    
    // 检查 node_modules
    const nodeModulesPath = path.join(openclawPath, 'node_modules')
    if (fs.existsSync(nodeModulesPath)) {
      logManager.log('[OpenClaw] ✓ node_modules exists')
      try {
        const nmContents = fs.readdirSync(nodeModulesPath)
        logManager.log('[OpenClaw] node_modules has', nmContents.length, 'packages')
      } catch (e) {
        logManager.error('[OpenClaw] Failed to list node_modules:', e.message)
      }
    } else {
      logManager.error('[OpenClaw] ⚠ node_modules not found!')
    }
    
    // 检查 dist 目录
    const distPath = path.join(openclawPath, 'dist')
    if (fs.existsSync(distPath)) {
      logManager.log('[OpenClaw] ✓ dist directory exists')
    } else {
      logManager.error('[OpenClaw] ⚠ dist directory not found!')
    }
    
    logManager.log('[OpenClaw] All path checks passed, starting process...')
    logManager.log('========================================')
    
    try {
      // 构建启动参数
      const spawnArgs = [
        'openclaw.mjs', 
        'gateway', 
        '--port', String(this.port),
        '--verbose'  // 添加详细日志
      ]
      
      // 构建环境变量
      const spawnEnv = {
        ...process.env,
        OPENCLAW_STATE_DIR: this.getStateDir(),
        NODE_ENV: 'production',
        // 添加 Node.js 选项以支持 ESM
        NODE_OPTIONS: '--experimental-vm-modules',
        // 启用调试日志
        DEBUG: 'openclaw:*',
        // 强制颜色输出
        FORCE_COLOR: '1'
      }
      
      logManager.log('[OpenClaw] Spawn arguments:', spawnArgs.join(' '))
      logManager.log('[OpenClaw] Working directory:', openclawPath)
      logManager.log('[OpenClaw] Environment variables:')
      logManager.log('  OPENCLAW_STATE_DIR:', spawnEnv.OPENCLAW_STATE_DIR)
      logManager.log('  NODE_ENV:', spawnEnv.NODE_ENV)
      logManager.log('  NODE_OPTIONS:', spawnEnv.NODE_OPTIONS)
      logManager.log('  DEBUG:', spawnEnv.DEBUG)
      
      // 使用 node 运行 openclaw.mjs
      this.process = spawn(nodeExecutable, spawnArgs, {
        cwd: openclawPath,
        env: spawnEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
      })

      logManager.log('[OpenClaw] Process spawned, PID:', this.process.pid)

      this.process.stdout.on('data', (data) => {
        const log = data.toString()
        logManager.log(`[OpenClaw STDOUT] ${log.trim()}`)
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('openclaw-log', log)
        }
      })

      this.process.stderr.on('data', (data) => {
        const error = data.toString()
        logManager.error(`[OpenClaw STDERR] ${error.trim()}`)
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('openclaw-log', `[STDERR] ${error}`)
        }
      })

      this.process.on('error', (error) => {
        logManager.error('[OpenClaw] Process spawn error:', error)
        logManager.error('[OpenClaw] Error code:', error.code)
        logManager.error('[OpenClaw] Error errno:', error.errno)
        logManager.error('[OpenClaw] Error syscall:', error.syscall)
        this.isRunning = false
        this.logAndNotify('SPAWN_ERROR', `Failed to spawn OpenClaw: ${error.message}`, {
          code: error.code,
          errno: error.errno,
          syscall: error.syscall
        })
      })

      this.process.on('close', (code, signal) => {
        logManager.log(`[OpenClaw] Process exited with code ${code}, signal ${signal}`)
        this.isRunning = false
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('openclaw-status', { 
            running: false, 
            exitCode: code,
            signal: signal
          })
        }
      })

      this.isRunning = true
      
      // 通知主窗口
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('openclaw-status', { running: true, port: this.port })
      }
      
    } catch (error) {
      logManager.error('[OpenClaw] Exception during startup:', error)
      logManager.error('[OpenClaw] Stack trace:', error.stack)
      this.logAndNotify('STARTUP_EXCEPTION', `Failed to start OpenClaw: ${error.message}`, {
        stack: error.stack
      })
    }
  }

  logAndNotify(errorType, message, details = {}) {
    // 详细日志
    logManager.error('========================================')
    logManager.error(`[OpenClaw] Error Type: ${errorType}`)
    logManager.error(`[OpenClaw] Message: ${message}`)
    logManager.error('[OpenClaw] Details:', JSON.stringify(details, null, 2))
    logManager.error('========================================')
    
    // 通知 UI
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('openclaw-status', { 
        running: false, 
        error: message,
        errorType: errorType,
        details: details
      })
    }
  }

  notifyError(message) {
    this.logAndNotify('GENERAL_ERROR', message)
  }

  stop() {
    if (this.process) {
      logManager.log('[OpenClaw] Stopping process, PID:', this.process.pid)
      this.process.kill('SIGTERM')
      this.process = null
      this.isRunning = false
    }
  }

  restart() {
    logManager.log('[OpenClaw] Restarting...')
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
    backgroundColor: '#f8f9fa',  // Light theme background
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

// 获取日志文件路径
ipcMain.handle('get-log-path', () => {
  return logManager.getLogPath()
})

// 获取日志内容
ipcMain.handle('get-logs', () => {
  return logManager.getLogs()
})

// 应用启动
app.whenReady().then(() => {
  // 初始化日志管理器
  logManager.init()
  logManager.log('App ready, creating main window...')
  
  createMainWindow()
  createTray()
  
  // 启动 OpenClaw（延迟启动，等待窗口加载完成）
  setTimeout(() => {
    logManager.log('Starting OpenClaw service...')
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
  logManager.log('App quitting, cleaning up...')
  app.isQuitting = true
  openClawManager.stop()
  logManager.close()
})

// 导出管理器供其他模块使用
module.exports = { openClawManager, logManager }
