; Custom NSIS installer script for ChasparkIPClaw
; Check for running instances before installation

!macro customHeader
  !include "nsProcess.nsh"
!macroend

!macro customInit
  ; Check if ChasparkIPClaw is running
  ${nsProcess::FindProcess} "ChasparkIPClaw.exe" $R0
  
  StrCmp $R0 0 0 notRunning
  
  ; Process is running, show message
  MessageBox MB_ICONEXCLAMATION|MB_OKCANCEL \
    "检测到 ChasparkIPClaw 正在运行！$\r$\n$\r$\n\
    请先关闭正在运行的程序，然后点击"确定"继续安装。$\r$\n$\r$\n\
    如果程序已关闭但仍显示此消息，请打开任务管理器结束 ChasparkIPClaw.exe 进程。" \
    IDOK tryKill IDCANCEL abortInstall
  
  tryKill:
    ; Try to kill the process
    ${nsProcess::KillProcess} "ChasparkIPClaw.exe" $R0
    Sleep 2000
    
    ; Check again
    ${nsProcess::FindProcess} "ChasparkIPClaw.exe" $R0
    StrCmp $R0 0 stillRunning continueInstall
    
  stillRunning:
    MessageBox MB_ICONSTOP|MB_OK \
      "无法关闭 ChasparkIPClaw 进程。$\r$\n$\r$\n\
      请手动关闭程序后重新运行安装程序。"
    Abort
  
  abortInstall:
    Abort
  
  notRunning:
    ; Also check for portable version
    ${nsProcess::FindProcess} "ChasparkIPClaw-1.0.0-Portable.exe" $R0
    StrCmp $R0 0 0 continueInstall
    
    MessageBox MB_ICONEXCLAMATION|MB_OKCANCEL \
      "检测到 ChasparkIPClaw 便携版正在运行！$\r$\n$\r$\n\
      请先关闭正在运行的程序，然后点击"确定"继续安装。" \
      IDOK tryKillPortable IDCANCEL abortInstall
    
  tryKillPortable:
    ${nsProcess::KillProcess} "ChasparkIPClaw-1.0.0-Portable.exe" $R0
    Sleep 2000
    
  continueInstall:
    ; Continue with installation
!macroend

!macro customUnInstall
  ; Check if app is running before uninstall
  ${nsProcess::FindProcess} "ChasparkIPClaw.exe" $R0
  StrCmp $R0 0 0 continueUninstall
  
  MessageBox MB_ICONEXCLAMATION|MB_OKCANCEL \
    "检测到 ChasparkIPClaw 正在运行！$\r$\n$\r$\n\
    请先关闭程序，然后点击"确定"继续卸载。" \
    IDOK tryKillUninstall IDCANCEL abortUninstall
  
  tryKillUninstall:
    ${nsProcess::KillProcess} "ChasparkIPClaw.exe" $R0
    Sleep 2000
    
  continueUninstall:
    ; Continue with uninstall
    Goto doneUninstall
    
  abortUninstall:
    Abort
    
  doneUninstall:
!macroend
