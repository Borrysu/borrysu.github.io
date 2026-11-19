#!/bin/bash
# 改前端畫面或程式後換版號：所有 css／js 的 ?vN 和 sw.js 的 CACHE 一起換成 N+1，避免新舊檔混搭。
cd "$(dirname "$0")/.."
export HOME=/Users/borry; git pull -q --rebase --autostash
V=$(grep -o "?v[0-9]*" index.html | tr -d '?v' | sort -n | tail -1); N=$((V+1))
sed -i '' "s/?v$V'/?v$N'/g; s/?v$V\"/?v$N\"/g" js/*.js index.html sw.js
sed -i '' -E "s/opp-shell-v$V-[0-9a-z]+/opp-shell-v$N-$(date +%Y%m%d)/" sw.js
echo "v$V -> v$N"; grep -c "?v$N" index.html sw.js js/*.js
