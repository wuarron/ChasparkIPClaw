const fs = require('fs')
const path = require('path')

// 清理 Electron 语言包，只保留中英文
const KEEP_LOCALES = ['en-US.pak', 'en-GB.pak', 'zh-CN.pak', 'zh-TW.pak']

module.exports = async function(context) {
  const appOutDir = context.appOutDir
  const localesDir = path.join(appOutDir, 'locales')
  
  if (fs.existsSync(localesDir)) {
    console.log('清理语言包，只保留中英文...')
    
    const files = fs.readdirSync(localesDir)
    let removed = 0
    
    for (const file of files) {
      if (file.endsWith('.pak') && !KEEP_LOCALES.includes(file)) {
        fs.unlinkSync(path.join(localesDir, file))
        removed++
      }
    }
    
    console.log(`已删除 ${removed} 个语言包，保留 ${KEEP_LOCALES.length} 个`)
  }
}
