#!/bin/bash
# 清理 Electron 语言包，只保留中英文

DIST_DIR="${1:-dist/win-unpacked}"
LOCALES_DIR="$DIST_DIR/locales"

if [ -d "$LOCALES_DIR" ]; then
    echo "清理语言包，只保留中英文..."
    
    # 保留的语言包
    KEEP_LANGS="en-US.pak en-GB.pak zh-CN.pak zh-TW.pak"
    
    # 删除其他语言包
    for pak in "$LOCALES_DIR"/*.pak; do
        filename=$(basename "$pak")
        keep=false
        for keep_lang in $KEEP_LANGS; do
            if [ "$filename" = "$keep_lang" ]; then
                keep=true
                break
            fi
        done
        
        if [ "$keep" = false ]; then
            rm -f "$pak"
            echo "删除: $filename"
        fi
    done
    
    echo "语言包清理完成"
else
    echo "语言包目录不存在: $LOCALES_DIR"
fi
