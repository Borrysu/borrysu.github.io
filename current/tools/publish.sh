#!/bin/bash
# 推上線：先看要換哪些檔、再 commit、push，最後等 GitHub Pages 換成新版。
# 用法：tools/publish.sh "這次改了什麼"
# 用 Borry 本人的 HOME 跑 git，AGY 公司帳號改了 HOME 也推得出去。
set -e
MSG="$1"; [ -n "$MSG" ] || { echo "用法：tools/publish.sh \"說明\"" >&2; exit 2; }
cd "$(dirname "$0")/.."
export HOME=/Users/borry
git pull -q --rebase --autostash
git status -s .; git add -A .; git diff --cached --stat
git diff --cached --quiet && { echo "沒有要推的改動"; exit 0; }
git commit -q -m "$MSG" && git push -q && git log --oneline -1
V=$(grep -o "opp-shell-v[0-9]*" sw.js | head -1)
for i in $(seq 1 40); do L=$(curl -s "https://borrysu.github.io/current/sw.js?t=$i$RANDOM" | grep -o "opp-shell-v[0-9]*" | head -1); [ "$L" = "$V" ] && { echo "線上已是 $V"; exit 0; }; sleep 5; done
echo "等了 200 秒線上還不是 $V，請再查" >&2; exit 1
