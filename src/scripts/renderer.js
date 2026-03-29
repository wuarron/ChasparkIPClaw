/**
 * ChasparkIPClaw - Renderer Process
 * 主界面交互逻辑
 */

// DOM 元素
const elements = {
  // 标题栏按钮
  btnMinimize: document.getElementById('btn-minimize'),
  btnMaximize: document.getElementById('btn-maximize'),
  btnClose: document.getElementById('btn-close'),
  
  // 侧边栏
  searchInput: document.getElementById('search-input'),
  addSessionBtn: document.getElementById('add-session-btn'),
  sessionList: document.getElementById('session-list'),
  menuInspiration: document.getElementById('menu-inspiration'),
  menuTasks: document.getElementById('menu-tasks'),
  btnWelink: document.getElementById('btn-welink'),
  btnSettings: document.getElementById('btn-settings'),
  
  // 主内容区
  chatArea: document.getElementById('chat-area'),
  welcomeScreen: document.getElementById('welcome-screen'),
  messagesContainer: document.getElementById('messages-container'),
  
  // 输入区
  messageInput: document.getElementById('message-input'),
  attachmentPreview: document.getElementById('attachment-preview'),
  btnAttachment: document.getElementById('btn-attachment'),
  btnSend: document.getElementById('btn-send'),
  statusIndicator: document.getElementById('status-indicator'),
  
  // 设置面板
  settingsPanel: document.getElementById('settings-panel'),
  closeSettings: document.getElementById('close-settings'),
  overlay: document.getElementById('overlay'),
  settingPort: document.getElementById('setting-port'),
  settingStatus: document.getElementById('setting-status'),
  btnRestartService: document.getElementById('btn-restart-service')
}

// 应用状态
const state = {
  sessions: [],
  currentSession: null,
  messages: [],
  attachments: [],
  isServiceRunning: false,
  servicePort: 18789
}

// ========================================
// 初始化
// ========================================
async function init() {
  // 加载配置
  await loadConfig()
  
  // 绑定事件
  bindEvents()
  
  // 检查服务状态
  await checkServiceStatus()
  
  // 监听服务状态变化
  window.electronAPI.onOpenClawStatus((data) => {
    state.isServiceRunning = data.running
    state.servicePort = data.port
    updateServiceStatus()
  })
  
  // 加载会话列表
  loadSessions()
}

async function loadConfig() {
  try {
    const port = await window.electronAPI.getConfig('openclaw.port')
    if (port) {
      state.servicePort = port
      elements.settingPort.value = port
    }
  } catch (e) {
    console.error('Failed to load config:', e)
  }
}

async function checkServiceStatus() {
  try {
    const status = await window.electronAPI.getOpenClawStatus()
    state.isServiceRunning = status.running
    state.servicePort = status.port
    updateServiceStatus()
  } catch (e) {
    console.error('Failed to check service status:', e)
    state.isServiceRunning = false
    updateServiceStatus()
  }
}

function updateServiceStatus() {
  const statusDot = elements.statusIndicator.querySelector('.status-dot')
  const statusText = elements.statusIndicator.querySelector('.status-text')
  
  if (state.isServiceRunning) {
    statusDot.classList.remove('offline')
    statusText.textContent = '服务运行中'
    elements.settingStatus.textContent = '运行中'
    elements.settingStatus.style.color = '#4ade80'
  } else {
    statusDot.classList.add('offline')
    statusText.textContent = '服务未运行'
    elements.settingStatus.textContent = '未运行'
    elements.settingStatus.style.color = '#ef4444'
  }
}

// ========================================
// 事件绑定
// ========================================
function bindEvents() {
  // 标题栏按钮
  elements.btnMinimize.addEventListener('click', () => {
    window.electronAPI.minimizeWindow()
  })
  
  elements.btnMaximize.addEventListener('click', () => {
    window.electronAPI.maximizeWindow()
  })
  
  elements.btnClose.addEventListener('click', () => {
    window.electronAPI.closeWindow()
  })
  
  // 新建会话
  elements.addSessionBtn.addEventListener('click', createNewSession)
  
  // 搜索会话
  elements.searchInput.addEventListener('input', (e) => {
    filterSessions(e.target.value)
  })
  
  // 技能按钮
  document.querySelectorAll('.skill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const skill = btn.dataset.skill
      useSkill(skill)
    })
  })
  
  // 提示卡片
  document.querySelectorAll('.tip-card').forEach(card => {
    card.addEventListener('click', () => {
      const title = card.querySelector('.tip-title').textContent
      elements.messageInput.value = `请帮我了解${title}的方法`
      elements.messageInput.focus()
    })
  })
  
  // 输入框
  elements.messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  })
  
  elements.messageInput.addEventListener('input', () => {
    autoResizeTextarea()
  })
  
  // 发送按钮
  elements.btnSend.addEventListener('click', sendMessage)
  
  // 附件按钮
  elements.btnAttachment.addEventListener('click', selectFile)
  
  // 设置按钮
  elements.btnSettings.addEventListener('click', openSettings)
  elements.closeSettings.addEventListener('click', closeSettings)
  elements.overlay.addEventListener('click', closeSettings)
  
  // 重启服务
  elements.btnRestartService.addEventListener('click', async () => {
    elements.btnRestartService.disabled = true
    elements.btnRestartService.textContent = '重启中...'
    await window.electronAPI.restartOpenClaw()
    setTimeout(() => {
      elements.btnRestartService.disabled = false
      elements.btnRestartService.textContent = '重启服务'
    }, 3000)
  })
  
  // 端口设置
  elements.settingPort.addEventListener('change', async () => {
    const port = parseInt(elements.settingPort.value)
    if (port >= 1024 && port <= 65535) {
      await window.electronAPI.setConfig('openclaw.port', port)
      state.servicePort = port
    }
  })
  
  // WeLink 绑定
  elements.btnWelink.addEventListener('click', () => {
    alert('WeLink 绑定功能即将推出')
  })
  
  // 灵感广场
  elements.menuInspiration.addEventListener('click', () => {
    alert('灵感广场功能即将推出')
  })
  
  // 定时任务
  elements.menuTasks.addEventListener('click', () => {
    alert('定时任务功能即将推出')
  })
}

// ========================================
// 会话管理
// ========================================
function loadSessions() {
  // 从本地存储加载会话
  const savedSessions = localStorage.getItem('chaspark-sessions')
  if (savedSessions) {
    state.sessions = JSON.parse(savedSessions)
    renderSessionList()
  }
}

function saveSessions() {
  localStorage.setItem('chaspark-sessions', JSON.stringify(state.sessions))
}

function createNewSession() {
  const session = {
    id: Date.now().toString(),
    name: '新对话',
    createdAt: new Date().toISOString(),
    messages: []
  }
  
  state.sessions.unshift(session)
  state.currentSession = session
  saveSessions()
  renderSessionList()
  showSession(session)
}

function renderSessionList() {
  elements.sessionList.innerHTML = state.sessions.map(session => `
    <div class="session-item ${state.currentSession?.id === session.id ? 'active' : ''}" 
         data-id="${session.id}">
      <span class="session-icon">💬</span>
      <span class="session-name">${session.name}</span>
      <span class="session-time">${formatTime(session.createdAt)}</span>
    </div>
  `).join('')
  
  // 绑定点击事件
  elements.sessionList.querySelectorAll('.session-item').forEach(item => {
    item.addEventListener('click', () => {
      const sessionId = item.dataset.id
      const session = state.sessions.find(s => s.id === sessionId)
      if (session) {
        state.currentSession = session
        renderSessionList()
        showSession(session)
      }
    })
  })
}

function showSession(session) {
  elements.welcomeScreen.style.display = 'none'
  elements.messagesContainer.style.display = 'block'
  
  state.messages = session.messages || []
  renderMessages()
}

function filterSessions(query) {
  const items = elements.sessionList.querySelectorAll('.session-item')
  items.forEach(item => {
    const name = item.querySelector('.session-name').textContent.toLowerCase()
    item.style.display = name.includes(query.toLowerCase()) ? 'flex' : 'none'
  })
}

// ========================================
// 消息处理
// ========================================
function sendMessage() {
  const content = elements.messageInput.value.trim()
  if (!content) return
  
  // 如果没有当前会话，创建新会话
  if (!state.currentSession) {
    createNewSession()
  }
  
  // 添加用户消息
  const userMessage = {
    id: Date.now().toString(),
    role: 'user',
    content: content,
    timestamp: new Date().toISOString()
  }
  
  state.messages.push(userMessage)
  state.currentSession.messages = state.messages
  
  // 更新会话名称
  if (state.messages.length === 1) {
    state.currentSession.name = content.slice(0, 20) + (content.length > 20 ? '...' : '')
  }
  
  saveSessions()
  renderMessages()
  renderSessionList()
  
  // 清空输入
  elements.messageInput.value = ''
  autoResizeTextarea()
  
  // 发送到 OpenClaw
  sendToOpenClaw(content)
}

async function sendToOpenClaw(content) {
  const port = state.servicePort
  const url = `http://localhost:${port}`
  
  try {
    // 调用 OpenClaw Gateway API
    const response = await fetch(`${url}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'main',
        messages: state.messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        stream: false
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    const assistantContent = data.choices?.[0]?.message?.content || '抱歉，未能获取回复'
    
    const assistantMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: assistantContent,
      timestamp: new Date().toISOString()
    }
    
    state.messages.push(assistantMessage)
    state.currentSession.messages = state.messages
    saveSessions()
    renderMessages()
    
  } catch (error) {
    console.error('Failed to send message to OpenClaw:', error)
    
    // 显示错误消息
    const errorMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `❌ 连接服务失败: ${error.message}\n\n请检查 OpenClaw 服务是否正在运行（端口 ${port}）`,
      timestamp: new Date().toISOString()
    }
    
    state.messages.push(errorMessage)
    state.currentSession.messages = state.messages
    saveSessions()
    renderMessages()
  }
}

function renderMessages() {
  elements.messagesContainer.innerHTML = state.messages.map(msg => `
    <div class="message ${msg.role}">
      <div class="message-avatar">
        ${msg.role === 'user' ? '👤' : '🦞'}
      </div>
      <div class="message-content">
        ${escapeHtml(msg.content)}
      </div>
    </div>
  `).join('')
  
  // 滚动到底部
  elements.chatArea.scrollTop = elements.chatArea.scrollHeight
}

// ========================================
// 技能使用
// ========================================
function useSkill(skillId) {
  const skillPrompts = {
    'patent-search': '请帮我进行专利检索，我需要查找关于 ',
    'prior-art': '请帮我分析现有技术，技术领域是 ',
    'claim-draft': '请帮我撰写权利要求书，发明内容是 ',
    'patent-analysis': '请帮我生成专利分析报告，分析对象是 ',
    'trademark-search': '请帮我查询商标，商标名称是 ',
    'ip-consult': '我有一个知识产权相关的问题：'
  }
  
  const prompt = skillPrompts[skillId] || ''
  elements.messageInput.value = prompt
  elements.messageInput.focus()
}

// ========================================
// 文件选择
// ========================================
async function selectFile() {
  const files = await window.electronAPI.selectFile()
  if (files && files.length > 0) {
    state.attachments = files
    showAttachmentPreview(files[0])
  }
}

function showAttachmentPreview(filePath) {
  const fileName = filePath.split(/[\\/]/).pop()
  elements.attachmentPreview.style.display = 'block'
  elements.attachmentPreview.querySelector('.attachment-name').textContent = fileName
  elements.attachmentPreview.querySelector('.attachment-remove').onclick = () => {
    state.attachments = []
    elements.attachmentPreview.style.display = 'none'
  }
}

// ========================================
// 设置面板
// ========================================
function openSettings() {
  elements.settingsPanel.classList.add('show')
  elements.overlay.classList.add('show')
  elements.overlay.style.display = 'block'
}

function closeSettings() {
  elements.settingsPanel.classList.remove('show')
  elements.overlay.classList.remove('show')
  setTimeout(() => {
    elements.overlay.style.display = 'none'
  }, 250)
}

// ========================================
// 工具函数
// ========================================
function formatTime(isoString) {
  const date = new Date(isoString)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML.replace(/\n/g, '<br>')
}

function autoResizeTextarea() {
  const textarea = elements.messageInput
  textarea.style.height = 'auto'
  textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px'
}

// ========================================
// 启动应用
// ========================================
document.addEventListener('DOMContentLoaded', init)
