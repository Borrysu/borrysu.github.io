#!/bin/bash
# 改資料庫結構（加欄位、改函式）用。走 Supabase 官方 Management API，需要 Borry 的個人存取權杖：
#   /Users/borry/.config/borry-opportunities/supabase-pat （權限 600，sbp_ 開頭）
# 用法：tools/sql.sh 檔案.sql   或   tools/sql.sh -c "select 1"
# 改函式前先備份原定義：tools/sql.sh -c "select pg_get_functiondef('public.opp_xxx'::regproc)" > 備份檔
set -e
PATF=/Users/borry/.config/borry-opportunities/supabase-pat
[ -r "$PATF" ] || { echo "還沒有存取權杖（$PATF）。資料庫結構要改，請交給大器（Claude）：它有 Supabase 連接器。" >&2; exit 3; }
if [ "$1" = "-c" ]; then Q="$2"; else Q=$(cat "$1"); fi
Q="$Q" /usr/bin/python3 -c 'import json,os;print(json.dumps({"query":os.environ["Q"]}))' | /usr/bin/curl -sS -m 60 -X POST \
  "https://api.supabase.com/v1/projects/wbfdpuytffyaetghqkbl/database/query" \
  -H "Authorization: Bearer $(cat "$PATF")" -H "Content-Type: application/json" --data-binary @-
echo
