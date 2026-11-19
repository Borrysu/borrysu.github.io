#!/bin/bash
# 呼叫機會雷達後端函式（Supabase RPC），金鑰自動帶入，不寫進任何檔案或輸出。
# 用法：tools/rpc.sh <函式名> '<JSON 參數，不含 p_key>'
#   tools/rpc.sh opp_list '{"p_gone_hours":72}'
#   tools/rpc.sh opp_set_link '{"p_id":"<卡片id>","p_kind":"pay","p_target":"https://...","p_label":"去領標付款","p_amount":"NT$ 200"}'
# 金鑰：/Users/borry/.config/borry-opportunities/ai.key（角色「AI協作」：讀、操作、編輯、新增、建資料夾回報；沒有管理員權限）
set -e
FN="$1"; ARGS="${2:-{\}}"
[ -n "$FN" ] || { echo "用法：tools/rpc.sh <函式名> '<JSON>'" >&2; exit 2; }
KEYF=/Users/borry/.config/borry-opportunities/ai.key
[ -r "$KEYF" ] || { echo "讀不到金鑰檔 $KEYF" >&2; exit 2; }
BODY=$(KEYF="$KEYF" ARGS="$ARGS" /usr/bin/python3 -c 'import json,os; a=json.loads(os.environ["ARGS"] or "{}"); a["p_key"]=open(os.environ["KEYF"]).read().strip(); print(json.dumps(a))')
/usr/bin/curl -sS -m 30 -X POST "https://wbfdpuytffyaetghqkbl.supabase.co/rest/v1/rpc/$FN" \
  -H "apikey: sb_publishable_yXl1iCBorFdHNsTl1A4UPg_MQLMYukO" -H "Content-Type: application/json" --data-binary @- <<<"$BODY"
echo
