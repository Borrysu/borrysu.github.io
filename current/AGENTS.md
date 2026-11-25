# 機會雷達：給 Codex（小光）、AGY、Cursor、Claude（大器）的改版入口

Borry 2026-11-17：「你讓 GPT AGY 都有權利去改我機會雷達，然後也要知道用什麼工具並且怎麼改。還有 cursor」。
所以這四家都可以改這個面板。規則與現況以同資料夾 `CLAUDE.md` 為正本（名字是 Claude 的，但內容是大家共用的規則），**動手前完整讀一遍**，本檔只補「用什麼工具、怎麼改」。

- 面板：https://borrysu.github.io/current/ （舊網址 https://borrysu.github.io/borry-opportunities/ 已轉址到這裡；Borry 個人的機會雷達，靜態網頁＋Supabase 專案 kakeibo）
- 本機正本：`/Users/borry/Developer/borrysu.github.io/current`（公開 repo `Borrysu/borrysu.github.io` 的 `current/` 子資料夾；2026-11-20 起正本，舊 repo `Borrysu/borry-opportunities` 只剩轉址頁，不要再改；**任何金鑰都不准寫進來**）
- 公司版「好咖皮條客」在公司電腦，不歸這裡。

## 工具（都在 `tools/`，任何一家用 bash 就能跑）

| 要做什麼 | 用什麼 |
|---|---|
| 讀或改案子資料（加卡、改內容、放連結、結案、掃描單…） | `tools/rpc.sh <函式> '<JSON>'`，金鑰自動帶入（角色「AI協作」，沒有管理員權限，不能徹底刪除） |
| 本機看畫面 | `tools/preview.sh`，開 `http://localhost:8811/?mock=1`、`?mock=xss`、`?mock=longname` |
| 改了 css／js 之後換版號 | `tools/bump.sh`（?vN 與 sw.js 快取名一起加一） |
| 推上線並等 GitHub Pages 換新 | `tools/publish.sh "這次改了什麼"`（會先 pull、列出要換的檔，再推） |
| 改資料庫結構（加欄位、改函式） | `tools/sql.sh 檔案.sql`。需要 `~/.config/borry-opportunities/supabase-pat`；沒有就交給大器（Claude），它有 Supabase 連接器 |

函式清單與用法：`CLAUDE.md` 第 12～16、21 條，以及 `js/adapter.js` 開頭註解。

## 怎麼改

1. **只改資料**（案子內容、連結、進度、提醒）：用 `tools/rpc.sh`，**不用改版**（CLAUDE.md 第 21 條）。
2. **改畫面或功能**：改 `index.html`、`css/app.css`、`js/*.js` → `tools/bump.sh` → `tools/preview.sh` 在 390 寬看 `?mock=1`、`?mock=xss`（`window.__xss` 要一直是空的）、`?mock=longname`（標題不能被擠成直排）→ 改 `CLAUDE.md` 的規則 → `tools/publish.sh "說明"` → 開線上網址再看一次。
3. **改資料庫結構**：先用 `tools/sql.sh -c "select pg_get_functiondef('public.opp_xxx'::regproc)"` 存原定義到 `~/Claude-Projects/Tools/opportunity-folder-job/backup/`，只加不刪；改完用測試資料驗，驗完刪掉測試資料。

## 不准做

- 金鑰、權杖寫進 repo 或貼進對話（repo 是公開的）。
- 刪資料庫裡的卡或資料表、改別人的金鑰權限。徹底刪除只有 Borry 本人能做。
- 搶滑鼠、把 App 叫到前景；一律背景跑（大器 AGENTS.md「CLI 背景執行」）。
- 同時有別的 AI 在改：推之前 `git pull`，衝突就停下回報，不要強推（`--force` 禁用）。

改完在 `/Users/borry/Claude projects/handoff/交接帳.md` 檔尾追加一行（誰、改了什麼、commit）。這是個人案：Codex 用 `codex B`、AGY 用 `agy B`、Cursor 用本人帳號、Claude 用 `claude B`。

## v24（2026-11-17）：進行中、待辦、跟大器說

- 籃子：個人版不收公司標案，`basket='company'` 新卡寫入時自動收走（72 小時內可救回）。新籃 `todo`＝Borry 的待辦（要請 AI 建置的事），不會自動過期。
- 前端欄位順序：個人案、創作資金、成就機會、非本業（`other`，含非本業賺錢與 AI 可代跑）、進行中（doing／delivered／paid，含既有案與案務欄位）、待辦、封存。
- 跟大器說：`opp_msg_add(p_item_id 或 null, p_body)`、`opp_msg_list(p_item_id, p_limit)`。用 AI協作金鑰寫的會顯示成「大器」並直接算已處理。
- **總聊天／子聊天（v131，2026-11-25）**：老大原話「每隻機器人會有總聊天…點擊某一張卡片或者是某一處，那他要有一個子聊天…可是總聊天會看見子聊天」。讀：`opp_msg_thread(p_bot, p_scope, p_limit)`，p_scope＝`all`（總聊天，所有卡與各處）｜`item:<卡id>`｜`ctx:<位置>`（目標、決策等卡片以外的地方）｜`gen`。寫：卡片照舊 `opp_msg_add(p_item_id,…)`；卡片以外的地方用 `opp_msg_say(p_item_id null, p_body, p_bot, p_ctx)`。回話不用帶 ctx，資料庫會沿用老大那句的位置。
- **讀取時機（v133，2026-11-25）**：老大原話「只有我在使用逐流的時候有更動會即時讀寫 平時我沒開 可以設置一個背景讀寫間隔（要有意義）然後只要我點開 畫面一定是最新資料」。面板：正在用（前景且 3 分鐘內有點滑打字）推播即讀＋5 分鐘補讀；開著沒動只記有新的、30 分鐘讀一次、一碰就補讀；背景不讀；打開一定先讀。Mac 兩支 relay 每 5 分鐘（即時靠面板送出時叫醒）。新功能不要自己加輪詢，要即時就叫醒 Mac 或靠推播。
- **逐流監工（bot＝`jian`）與大器分工**：老大原話「編修應該是直接與逐流監工對話，逐流的大器才是櫃檯 一個是改面板架構設計 一個是負責內容的」。面板「編修」清單與「逐流監工」對話都寫 bot jian，Mac relay（`opp_jian_take`）直送【監工】逐流視窗，不經櫃檯；監工用 AI協作金鑰 `opp_msg_add(…, p_bot:"jian")` 回話。櫃檯不接面板改版，收到改面板的事轉給監工。
- Mac 收件：`opp_msg_pending`／`opp_msg_handled(p_ids)`，由 launchd `com.borry.opportunity-daqi-relay` 轉給側欄視窗「【機會雷達】大器櫃台」，說明在 `/Users/borry/Claude-Projects/Tools/opportunity-daqi/櫃台說明.md`。
- 待辦：`opp_todo_add(p_title, p_note)`；去執行：`opp_run(p_id)`（待辦卡變 doing、run_status=queued，並留一則 kind=run 訊息）。
- 進度：`opp_progress_set(p_id, p_steps, p_note, p_blocker, p_run_status, p_run_session, p_run_note)`，steps 是 `[{name,status(pending/current/done/skipped/blocked),note}]`，最多 30 步。
- 既有案：`opp_work_add` 現在 Gig Gig、Borry、AI協作都能用；大器每天整理手上專案時用它建卡。
- 2026-11-17 Borry 更正：`fund`（創作資金）只放自己申請得到的錢（補助、委製、投資）；影展、比賽（含 AI 比賽、獎金型比賽）一律放 `honor`，前端欄名改「影展比賽」。

## v26（2026-11-19）：改名通告板、加「今天」頁

- 名字改「通告板」，repo 名與網址不變。第一個分頁「今天」，資料來自 `hub_today`。
- 要問 Borry 事情：`tools/rpc.sh hub_decision_add '{"p_question":"…","p_project":"案名","p_options":[{"key":"a","label":"…","note":"一句理由","recommended":true},{"key":"b","label":"…"}]}'`。付款、刪檔、對外發訊用 `"p_kind":"talk"`。
- 收答案、回報工作、記紀錄、常駐程式報到的函式與規矩，見 `CLAUDE.md` 第 22 條。
- 回答會同步追加到 `/Users/borry/Claude projects/handoff/通告板回覆.md`，開工讀交接帳時一起看。

## v46（2026-11-22）：卡面一句、點開、編輯刪除封存

- 寫卡片一定附「卡面一句」：動詞開頭、約 20 字、說要老大做什麼（例：`hub_decision_add` 帶 `"p_ask":"選要不要接木星加價 3 萬"`；`hub_job_set`、`hub_event_add`、`opp_todo_add` 同樣帶 `p_ask`；案子與機會用 `tools/rpc.sh opp_card_edit '{"p_id":"…","p_patch":{"ask":"確認 11/30 前寄發票"}}'`）。原文照舊放細節欄位。
- **資料庫 v46 遷移套上之前不要帶 p_ask**，先把那一句寫成 question／title／summary 的第一句。套上沒有：`tools/rpc.sh hub_shelf_list '{}'` 回陣列＝已套上，回找不到函式＝還沒。
- 編輯、封存、刪除（72 小時可救回）：`hub_card_edit`、`hub_card_shelf`、`hub_shelf_list`，規則細節看 `CLAUDE.md` 第 32 條。

## v48（2026-11-22）：付款授權單、行事曆現在更新

- 付款鈕按下＝老大授權那一隻 Bot 付（帳單塔塔、訂單朋朋、報名費集集），面板與大器不代付。函式：`hub_pay_authorize`、`hub_pay_cancel`、`hub_pay_list`、`hub_pay_take`／`hub_pay_notified`（Mac relay 用）、`hub_pay_report`（Bot 回報，用通知裡的付款票）。細節 `CLAUDE.md` 第 33 條。
- 行事曆：Mac 每 120 秒同步；替老大改完 Google 行程後跑 `tools/rpc.sh hub_cal_refresh_request '{}'`，30 秒內進面板。
- 資料庫 v48 遷移還沒套上時這些函式都找不到（`tools/rpc.sh hub_pay_list '{}'` 回 PGRST202＝還沒套），面板會寫「資料庫還沒更新」。

## v50（2026-11-22）：生活待辦、機器人寫生活清單、錢房間歸金金

- 生活清單（`hub_life_items`）多一種 `kind='todo'`（待辦）。大器替老大加：`tools/rpc.sh hub_life_set '{"p_id":null,"p_kind":"todo","p_patch":{"name":"預約牙醫","note":"…"}}'`；回 `kind and name required`＝資料庫 v50 遷移還沒套，先用 `"p_kind":"rout"`、patch 加 `"cat":"_todo"`（遷移會轉正）。
- 朋朋、萌萌自己寫生活清單：用轉送訊息裡的回覆票呼叫 `opp_bot_life_add`（只能新增，用法寫在 relay 轉給它們的訊息裡）。`tools/rpc.sh opp_bot_life_add '{}'` 回 PGRST202＝還沒套遷移。
- 錢房間的主人是金金（理財）；記帳、帳戶明細、訂閱在塔塔記帳，不要再往逐流錢房間加記帳類功能。細節 `CLAUDE.md` 第 34 條。

## v52（2026-11-22）：生活條目左滑編輯刪除、請朋朋買、錢房間只留入口

- 生活每一項（例行、備品、待辦、想買）左滑出現「編輯」「刪除」，「⋯」也有同樣兩項。刪除＝`status:'dropped'`，各分頁底下「最近刪掉的」72 小時內救回（`hub_life_gone`、`hub_life_set status=active`）。v50 遷移已套，`kind='todo'` 直接收，不用再走 `rout＋_todo`。
- 備品「要買」的按鈕是「請朋朋買」：整份清單經 `opp_msg_add(p_bot:'peng')` 交朋朋找、比價、下單；付款仍走付款授權單。
- 錢房間：目標只在大色卡左右滑的「目標」頁，下面不開目標區；不放記帳功能，只留「要你按的」付款鈕與一列「打開塔塔記帳」。細節 `CLAUDE.md` 第 35 條。

## v54（2026-11-22）：錢頁收支趨勢、淨資產

- 錢房間多一張「收支趨勢」（近 6 個月收入、支出、存下來的線，可展開 12 個月）與「淨資產」列。資料走只讀 `hub_money_trend`，只有老大本人與管理員金鑰讀得到（`tools/rpc.sh` 的 AI協作金鑰會回 28000，正常）。
- `tools/rpc.sh hub_money_trend '{}'` 回 PGRST202＝v54 遷移還沒套。細節 `CLAUDE.md` 第 36 條。

## v60（2026-11-22）：正式登入、公司卡、肉咖鑰匙

- 老大可以不帶金鑰直接開，用 email 登入碼登入；網址金鑰照常能用。帳號只有一個，要在 Supabase 儀表板建（不要自己登入老大的帳號）。
- 案子房間「公司」分頁：公司電腦的肉咖同步皮條客的卡過來（`hub_company_summary_write`，肉咖鑰匙），老大點肉咖的臉派公司電腦做、點大器的臉跟大器說。大器收到帶「公司卡」的訊息，做完 `tools/rpc.sh hub_job_set '{"p_title":"…","p_agent":"大器","p_status":"done","p_source_key":"cotask:編號"}'`。
- 肉咖鑰匙只能用三支：`hub_company_summary_write`、`hub_rouka_take`、`hub_rouka_report`。細節 `CLAUDE.md` 第 41 條。

## 收卡規則（2026-11-25，所有 AI 都要照做）

老大原話：「我看卡片跟大家還是會把已經做完或正在做的事當成沒做推給我欸」。

- **誰發的卡誰收**：你發過的「要你決定」卡（`hub_decision_add`）、你寫的「等你：…」步驟、你開的工作（`hub_job_set`），事情做完或不用做了，**當場**收掉：決策卡用 `hub_decision_close`（只帶 p_id，不能附字；收完用 `opp_msg_add` 跟老大說一句為什麼收），步驟改 done／skipped，工作改 done，`run_status` 清掉（`opp_progress_set` 傳 `p_run_status:"stopped"`）。
- **發卡前先查**：要問老大前，先 `hub_today` 看 `open` 有沒有同一件已經在等，或已經做完的證據（行事曆已建、卡片步驟已 done、交接帳有記），有就不要再發。
- **不替老大答他的卡**：老大點的卡只能老大點；你只能收掉「你自己發、而且已經不需要他決定」的卡，收的時候寫明為什麼。
- 面板每張決策卡都有「✓ 已經處理了」，老大看到過期的卡可以一鍵收。

### 開工先看誰在處理（2026-11-25 v125）

老大原話：「我派誰去工作或什麼的，我在上面做了什麼動作，我全部的機器人全部的 AI 都會知道，誰正在處理這種東西應該要做到無痛。」

- 開工先讀 `hub_today` 的 `jobs`，再看相關卡片的 `run_note`、`run_session`：有人（霸霸、大器、別的 Bot）已經在處理同一件，就接著做或先問他，不重複開工。
- 老大在面板按「就這樣做」派工時，面板會寫一筆 `hub_jobs`（`source_key`＝`dispatch:<卡片id>`，agent＝被派的那隻，note 帶卡片 id 與老大交代原文），卡片 `run_note` 開頭是 `【霸霸】`或`【大器】`。接手的人做完照上面收卡規則收掉這筆。
- 「今天要做」是老大自己寫的清單（`hub_tide_log`，note.type＝`want`／`done`／`undo`，ref＝`want:<id>`）。被請到的機器人要看懂：`want` 是老大確認要做的事，`done` 是他打勾做完。
- 老大按派工臉會先開那隻自己的對話並送一則「［前情｜…］」，內容是先別動手；等他說「就這樣」或按「就這樣做」才是真的派下來。
