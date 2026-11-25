const NICK={'AI協作':'大器','大器':'大器','Gig Gig':'集集','Kim Kim':'金金','Tom Tom':'通通','Tongtong':'通通','PixPix':'皮皮','Borry':'你','Mac':'Mac 建資料夾程式','系統':'系統'};
const nick=(n)=>NICK[n]||n;
// =====================================================================
// 資料轉接層：整個前端只有這個檔案知道後端長什麼樣（規格見 ../BACKEND.md）。
// 有金鑰就連真後端（Supabase RPC）；沒有金鑰時退回示範模式（假資料，不連網路）。
//
// 提供給 app.js 的介面（兩種模式相同）：
//   const api = await createAdapter();
//   api.mode                      'live' 或 'mock'
//   await api.list()              → { items: [正規化卡片], serverTime: ms|null }（含待看、暫存、要做、剛收走）
//   await api.get(id)             → 單張卡，含 detailText（opp_get）
//   await api.act(id, action, o)  → 更新後的卡。action：dive｜stash｜unstash｜deleted｜skipped｜restore｜build
//   await api.archive(q, year)    → { items, years }（封存區，opp_archive）；act 另有 close｜reopen｜purge｜deliver｜paid｜back｜work
//   api.subscribe(onPing, onState)→ 取消函式；onPing() 代表「有變動，請重抓」，onState(bool) 代表即時連線狀態
//   api.setKey(k)                 存新金鑰（示範模式下按「貼上金鑰」用）
// =====================================================================

export const CONFIG = {
  SUPABASE_URL: 'https://wbfdpuytffyaetghqkbl.supabase.co',
  // 公開的 publishable key（BACKEND.md：可以寫進網頁）。私鑰絕不寫在這裡，只從網址 ?k=、# 或 localStorage 來。
  SUPABASE_ANON_KEY: 'sb_publishable_yXl1iCBorFdHNsTl1A4UPg_MQLMYukO',
  KEY_STORAGE: 'opp_key',
  SNAPSHOT_KEY: 'opp.snapshot.v2',
  // 2026-11-24 資料庫 Disk I/O 爆掉（老大：「碰到大問題囉，資料庫爆炸了整個面板無法讀取」「你先幫我停止逐流的自動更新部分」）：
  // 自動整頁重讀從每 15 秒改成每 10 分鐘，忙碌加快從 3 秒改 60 秒。要立刻看新資料就下拉／切回面板（切回最多 2 分鐘一次）。退回：改回 15000、3000。
  POLL_MS: 600000,         // 輪詢備援（原 15000）
  FAST_POLL_MS: 60000,     // 有「讀全文中」或「建資料夾中」時加快（原 3000）
  TIMEOUT_MS: 15000,       // 一般請求逾時
  SLOW_MS: 3000,           // 超過這麼久還沒回來，就顯示「載入比較久」
  GONE_HOURS: 72,
  // v58：送出「跟大器說」「去執行」後叫醒 Mac 大器（Tailscale Funnel，服務端驗金鑰角色＝Borry 才觸發，其他 403）。失敗安靜略過，照舊靠輪詢。示範模式不打。
  WAKE_URL: 'https://borrys-macbook-pro-16.tail1f7ef7.ts.net/current-wake', WAKE_MS: 3000,
  RPC: { list: 'opp_list', get: 'opp_get', topic: 'get_opp_realtime_topic',
         dive: 'opp_dive', stash: 'opp_stash', unstash: 'opp_unstash', drop: 'opp_drop', restore: 'opp_restore', build: 'opp_build',
         close: 'opp_close', reopen: 'opp_reopen', todoDone: 'opp_todo_done', archive: 'opp_archive', purge: 'opp_purge',
         scanRequest: 'opp_scan_request', scanStatus: 'opp_scan_status',
         workUpdate: 'opp_work_update', setStatus: 'opp_set_status', workAdd: 'opp_work_add',
         msgList: 'opp_msg_list', msgAdd: 'opp_msg_add', botInbox: 'opp_bot_inbox', todoAdd: 'opp_todo_add', run: 'opp_run', progress: 'opp_progress_set',
         hubToday: 'hub_today', moneySubs: 'hub_money_subs', hubAnswer: 'hub_decision_answer',
         goals: 'hub_goals_list', goalSet: 'hub_goal_set', cal: 'hub_cal_list', life: 'hub_life_list', lifeSet: 'hub_life_set', lifeGone: 'hub_life_gone', money: 'hub_money_overview', moneyTrend: 'hub_money_trend',
         hubEdit: 'hub_card_edit', hubShelf: 'hub_card_shelf', shelf: 'hub_shelf_list', cardEdit: 'opp_card_edit',
         payAuthorize: 'hub_pay_authorize', payCancel: 'hub_pay_cancel', payList: 'hub_pay_list', calRefresh: 'hub_cal_refresh_request', company: 'hub_company_summary', coTask: 'hub_company_task_add' },   // v48：付款鈕＝授權單（交給塔塔／朋朋付）、行事曆現在更新   // v46：卡面一句 ask、hub 卡片編輯封存刪除、案子機會待辦改卡面一句   // v41（2026-11-22）：目標、行事曆（唯讀同步）、生活、錢總覽（只讀）   // 2026-11-17：跟大器說、待辦、去執行   // 案務：報價收款欄位、doing→delivered→paid（Borry 與集集的金鑰可用）
};

export class AdapterError extends Error {
  constructor(kind, message, status) { super(message); this.kind = kind; this.status = status; }
}

const qs = new URLSearchParams(location.search);

// ---------- 金鑰：照記帳面板，網址 ?k= 帶進來（也收 #k=），存 localStorage，並留在網址上 ----------
export function tokenFrom(s) {
  s = String(s || '').trim(); if (!s) return '';
  let m = s.match(/\/k\/([A-Za-z0-9_-]{20,})/); if (m) return m[1];
  m = s.match(/[?&#]k=([^&#\s]+)/); if (m) { try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; } }
  m = s.match(/#([A-Za-z0-9_-]{20,})/); if (m) return m[1];
  m = s.match(/^[A-Za-z0-9_-]{20,}$/); return m ? m[0] : '';
}
const LS = { get: k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }, del: k => { try { localStorage.removeItem(k); } catch (e) {} } };
let KEY = '';
(function initKey() {
  // 金鑰來源順序：網址 ?k=、網址 #k=（相容舊做法）、localStorage。
  // 照記帳面板：金鑰留在網址上（改成 ?k=金鑰、拿掉 #），這樣 iPhone 加到主畫面時網址帶著金鑰，獨立 App 第一次開也有。
  const fromUrl = tokenFrom(location.search) || tokenFrom(location.hash);
  if (fromUrl.length >= 20) { KEY = fromUrl; LS.set(CONFIG.KEY_STORAGE, KEY); } else KEY = LS.get(CONFIG.KEY_STORAGE);
  if (KEY.length >= 20) {
    try { const u = new URL(location.href); u.hash = ''; u.searchParams.set('k', KEY); history.replaceState(null, '', u.pathname + u.search); } catch (e) {}
  }
})();
export const hasKey = () => KEY.length >= 20;

// ---------- v60 正式登入（Supabase Auth，只有老大一個帳號；註冊關閉）。跟網址金鑰並存：有金鑰先用金鑰，沒有才用登入 ----------
// session 存 localStorage opp_sess：{ a: access_token, r: refresh_token, x: 到期秒數(epoch), e: email }。金鑰與 session 都不寫進 repo。
const SESS_KEY = 'opp_sess';
let SESS = null;
try { SESS = JSON.parse(LS.get(SESS_KEY) || 'null'); if (!SESS || !SESS.a || !SESS.r) SESS = null; } catch (e) { SESS = null; }
function setSess(d, email) {
  if (!d || !d.access_token || !d.refresh_token) return false;
  const x = +d.expires_at || (Math.floor(Date.now() / 1000) + (+d.expires_in || 3600));
  SESS = { a: d.access_token, r: d.refresh_token, x, e: email || (d.user && d.user.email) || (SESS && SESS.e) || '' };
  LS.set(SESS_KEY, JSON.stringify(SESS)); return true;
}
function dropSess() { SESS = null; LS.del(SESS_KEY); }
(function magicLinkHash() {   // 信裡的登入連結回來時網址是 #access_token=…&refresh_token=…
  if (!/access_token=/.test(location.hash)) return;
  try { const h = new URLSearchParams(location.hash.slice(1));
    setSess({ access_token: h.get('access_token'), refresh_token: h.get('refresh_token'), expires_at: h.get('expires_at'), expires_in: h.get('expires_in') });
    history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
})();
export const hasSession = () => !!SESS;
export const sessionEmail = () => (SESS && SESS.e) || '';
const AUTH = () => CONFIG.SUPABASE_URL.replace(/\/+$/, '') + '/auth/v1';
async function authPost(path, body, bearer) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), CONFIG.TIMEOUT_MS);
  let res;
  try { res = await fetch(AUTH() + path, { method: 'POST', headers: { 'content-type': 'application/json', apikey: CONFIG.SUPABASE_ANON_KEY, ...(bearer ? { authorization: 'Bearer ' + bearer } : {}) }, body: JSON.stringify(body || {}), signal: ac.signal, cache: 'no-store', credentials: 'omit' }); }
  catch (e) { throw new AdapterError(ac.signal.aborted ? 'timeout' : 'network', ac.signal.aborted ? '連線逾時' : '連不上伺服器'); }
  finally { clearTimeout(t); }
  let d = null; try { d = await res.json(); } catch (e) {}
  if (!res.ok) throw new AdapterError(res.status === 429 ? 'rate' : 'auth', String((d && (d.msg || d.error_description || d.message || d.error)) || ('HTTP ' + res.status)), res.status);
  return d;
}
// 寄登入碼（信裡同時有連結）；create_user:false＝不會幫陌生 email 開帳號
export async function authSendCode(email) {
  email = String(email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new AdapterError('state', 'email 格式不對');
  const to = location.origin + location.pathname;
  await authPost('/otp?redirect_to=' + encodeURIComponent(to), { email, create_user: false });
  return true;
}
export async function authVerify(email, code) {
  email = String(email || '').trim().toLowerCase(); code = String(code || '').replace(/\D/g, '');
  if (code.length < 6) throw new AdapterError('state', '登入碼是信裡那串數字');
  const d = await authPost('/verify', { type: 'email', email, token: code });
  if (!setSess(d, email)) throw new AdapterError('auth', '沒拿到登入狀態');
  return true;
}
let refreshing = null;
async function freshToken(force) {
  if (!SESS) return '';
  if (!force && SESS.x - 90 > Date.now() / 1000) return SESS.a;
  if (!refreshing) refreshing = authPost('/token?grant_type=refresh_token', { refresh_token: SESS.r })
    .then(d => { setSess(d); return SESS.a; })
    .catch(e => { if (e.kind === 'auth') dropSess(); throw e; })
    .finally(() => { refreshing = null; });
  return refreshing;
}
export async function signOut() {
  const a = SESS && SESS.a; dropSess();
  LS.del(CONFIG.SNAPSHOT_KEY + ':sess');
  if (a) { try { await authPost('/logout', {}, a); } catch (e) {} }
}
export function saveKey(k) { KEY = k; LS.set(CONFIG.KEY_STORAGE, k); try { const u = new URL(location.href); u.hash = ''; u.searchParams.set('k', k); history.replaceState(null, '', u.pathname + u.search); } catch (e) {} }  // 網址也一起換，不然重新整理會讀回舊的 ?k=
export const keyTag = () => KEY ? KEY.slice(0, 6) : (SESS ? 'sess' : '');        // 快照用，不是完整金鑰

// 2026-11-25 量測：每次呼叫後端 +1，依函式名分類（window.__rpcCount = {total, by:{name:n}}）。退回：刪這段與 rpcCount( 呼叫
function rpcCount(name) { try { const c = window.__rpcCount || (window.__rpcCount = { total: 0, by: {} }); c.total++; c.by[name] = (c.by[name] || 0) + 1; } catch (e) {} }
function countWrap(api) { const o = {}; for (const k of Object.keys(api)) { const f = api[k]; o[k] = typeof f === 'function' ? function () { rpcCount(k); return f.apply(this, arguments); } : f; } return o; }
export async function createAdapter() {
  const mockFlag = qs.get('mock');
  const forceMock = mockFlag !== null && mockFlag !== '0';
  if ((hasKey() || hasSession()) && !forceMock && CONFIG.SUPABASE_URL.startsWith('http')) return liveAdapter();
  const { mockAdapter } = await import('./mock.js?v140');
  return countWrap(mockAdapter(forceMock ? mockFlag : ''));
}

// ---------- 正規化：後端欄位 → 前端欄位 ----------
const BASKET = { todo: 'todo', company: 'company', personal: 'personal', other: 'other', fund: 'funding', honor: 'achievement', funding: 'funding', achievement: 'achievement' };
const ts = v => { if (!v) return null; const n = typeof v === 'number' ? v : Date.parse(v); return Number.isFinite(n) ? n : null; };
const arr = v => Array.isArray(v) ? v.map(x => String(x)).filter(Boolean) : (typeof v === 'string' && v ? [v] : []);
const str = v => (v == null ? '' : String(v));
const web = v => { v = str(v).trim(); return /^https?:\/\//i.test(v) ? v : ''; };   // 連結只收 http(s)，擋 javascript: 等

const BOTS_OK = ['daqi', 'jiji', 'tata', 'peng', 'mon', 'din', 'kim', 'baba', 'jian'];
// v40：各 Bot 的回覆與還在等的話（opp_bot_inbox）
export const normInbox = d => ({ replies: (d && Array.isArray(d.replies) ? d.replies : []).filter(r => BOTS_OK.includes(r.bot)).map(r => ({ id: +r.id || 0, bot: r.bot, item: r.item_id ? str(r.item_id) : null, body: str(r.body), at: ts(r.created_at) })),
  waiting: (d && Array.isArray(d.waiting) ? d.waiting : []).filter(w => BOTS_OK.includes(w.bot)).map(w => ({ id: +w.id || 0, bot: w.bot })) });
export const normMsgs = d => (Array.isArray(d) ? d : []).map(m => ({ id: +m.id || 0, kind: ['user', 'daqi', 'system', 'run', 'bot'].includes(m.kind) ? m.kind : 'user', bot: BOTS_OK.includes(m.bot) ? m.bot : 'daqi', author: nick(str(m.author)), body: str(m.body), at: ts(m.created_at), item: m.item_id || null, itemTitle: str(m.item_title), ctx: str(m.ctx) })).filter(m => m.body && m.at);
export const normHistory = h => (Array.isArray(h) ? h : []).map(e => ({ at: ts(e && e.at), actor: nick(str(e && e.actor)), action: str(e && e.action) })).filter(e => e.at && e.action);
// 掃描請求單：後端籃名 → 前端籃名
const BACK_BASKET = { company: 'company', personal: 'personal', other: 'other', funding: 'fund', achievement: 'honor' };
// 錢頁：每月訂閱（只讀，hub_money_subs，只有管理員金鑰能讀）
export function normMoney(d) {
  d = d && typeof d === 'object' ? d : {};
  return { totalActive: num(d.total_active) || 0, totalCompany: num(d.total_company_monthly) || 0,
    items: (Array.isArray(d.items) ? d.items : []).map(r => ({ id: str(r.id), name: str(r.name), amount: num(r.amount) || 0, monthly: num(r.monthly_equiv) || 0, cycle: r.billing_cycle === 'yearly' ? 'yearly' : 'monthly',
      status: ['active', 'idle', 'cancel'].includes(r.status) ? r.status : 'active', payer: r.payer === 'company' ? 'company' : 'self', account: str(r.account_name), next: str(r.next_charge_date), days: num(r.days_until) || 0, cancelBy: str(r.cancel_by) })) };
}
// 通告板「今天」頁（2026-11-19）：等你決定、正在跑、最近做完、各程式有沒有報到。欄位一律轉成字串或數字，畫面端再跳脫。
export function normHub(d) {
  d = d && typeof d === 'object' ? d : {};
  const arr = v => (Array.isArray(v) ? v : []);
  const dec = r => ({ id: str(r.id), project: str(r.project), question: str(r.question), detail: str(r.detail), ask: str(r.ask), kind: r.kind === 'talk' ? 'talk' : 'choice',
    options: arr(r.options).slice(0, 8).map(o => ({ key: str(o && o.key), label: str(o && o.label), note: str(o && o.note), recommended: !!(o && o.recommended) })).filter(o => o.key && o.label),
    link: /^https:\/\//i.test(str(r.link)) ? str(r.link) : '', askedBy: str(r.asked_by), origin: str(r.origin), createdAt: ts(r.created_at),
    answerKey: str(r.answer_key), answerLabel: str(r.answer_label), answerNote: str(r.answer_note), answerVia: str(r.answer_via), answerQuote: str(r.answer_quote), answeredAt: ts(r.answered_at), pickedUp: !!r.picked_up_at });
  return {
    open: arr(d.open).map(dec), answered: arr(d.answered).map(dec),
    jobs: arr(d.jobs).map(r => ({ id: str(r.id), agent: str(r.agent), machine: str(r.machine), project: str(r.project), title: str(r.title), note: str(r.note), ask: str(r.ask), resultPath: str(r.result_path), sourceKey: str(r.source_key),
      status: ['queued', 'running', 'waiting_mac', 'waiting_you', 'done', 'failed'].includes(r.status) ? r.status : 'running', updatedAt: ts(r.updated_at) })),
    events: arr(d.events).map(r => ({ id: str(r.id), at: ts(r.at), actor: str(r.actor), project: str(r.project), summary: str(r.summary), ask: str(r.ask), path: str(r.path) })),
    beats: arr(d.beats).map(r => ({ name: str(r.name), machine: str(r.machine), note: str(r.note), every: num(r.expect_every_s), lastAt: ts(r.last_at), late: !!r.late })),
  };
}
export function normScan(d) {
  const out = {}; if (!d || typeof d !== 'object') return out;
  for (const [k, v] of Object.entries(d)) {
    const o = v && v.open, l = v && v.last;
    out[BASKET[k] || k] = { open: o ? { status: str(o.status), at: ts(o.requested_at), takenAt: ts(o.taken_at) } : null,
      last: l ? { at: ts(l.done_at), added: +l.added || 0, note: str(l.note) } : null };
  }
  return out;
}
const num = v => { if (v == null || v === '') return null; const n = +v; return Number.isFinite(n) ? n : null; };
const day = v => { v = str(v); return /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : ''; };
const CAREER_TXT = ['line', 'public_identity', 'status_gain', 'status_gain_note', 'rights', 'kim_judgment', 'referrer'], CAREER_NUM = ['est_hours', 'actual_hours', 'advance_amount'], CAREER_BOOL = ['conflicts_haoka', 'tax_withheld'];
export function normCareer(c) {
  const o = {}; if (!c || typeof c !== 'object' || Array.isArray(c)) return o;
  CAREER_TXT.forEach(k => { if (c[k] != null && typeof c[k] === 'string' && c[k]) o[k] = c[k]; });
  CAREER_NUM.forEach(k => { const n = num(c[k]); if (n != null && typeof c[k] !== 'boolean') o[k] = n; });
  CAREER_BOOL.forEach(k => { if (typeof c[k] === 'boolean') o[k] = c[k]; });
  const d = day(c.advance_recovered_date); if (d) o.advance_recovered_date = d;
  return o;
}
function normEarn(e) {
  if (!e || typeof e !== 'object') return null;
  return { gross: num(e.gross), basis: str(e.basis), withholding: num(e.labor_withholding_10pct), nhi: num(e.nhi_2_11pct), advance: num(e.advance), net: num(e.net), hours: num(e.hours), hoursBasis: str(e.hours_basis), hourly: num(e.hourly_net) };
}
export function normalize(r) {
  return {
    id: str(r.id), title: str(r.title), shortTitle: str(r.short_title), org: str(r.org), ask: str(r.ask),
    basket: BASKET[r.basket] || 'other',
    status: r.status === 'stashed' ? 'snoozed' : (['new', 'doing', 'delivered', 'paid', 'dropped', 'expired', 'closed'].includes(r.status) ? r.status : 'new'),
    closeResult: ['won', 'lost', 'submitted', 'void'].includes(r.close_result) ? r.close_result : '', closedAt: ts(r.closed_at), decidedAt: ts(r.decided_at),
    amountLabel: str(r.amount_label), currency: str(r.currency), amountDisplay: str(r.amount_display),
    deadline: ts(r.deadline), deadlineText: str(r.deadline_text), deadlineApprox: !!r.deadline_approx,
    expiresAt: ts(r.expire_at), snoozeUntil: ts(r.remind_at), stashDueAt: ts(r.stash_due_at),
    sourceUrl: web(r.source_url), sourceSite: str(r.source_site), foundBy: nick(str(r.found_by)), foundAt: ts(r.created_at), isDemo: !!r.is_demo,
    why: str(r.why), quick: arr(r.quick), facts: arr(r.facts), warn: arr(r.warn), firstStep: str(r.first_step), fit: str(r.fit), honor: str(r.honor),
    crawlStatus: str(r.crawl_status) || 'none', crawlError: str(r.crawl_error), hasFullText: !!r.has_full_text,
    detailText: str(r.full_text), attachments: Array.isArray(r.attachments) ? r.attachments.filter(a => a && web(a.url)) : [],
    folderStatus: str(r.folder_status) || 'none', folderError: str(r.folder_error), folderName: str(r.folder_name), folderPath: str(r.folder_path), notionUrl: web(r.notion_url),
    dropReason: str(r.drop_reason), dropNote: str(r.drop_note),
    // 案務：報價、收款、職涯欄位、實拿時薪（後端算好，不手填）
    quoteAmount: num(r.quote_amount), signed: r.signed == null ? null : !!r.signed,
    depositAmount: num(r.deposit_amount), depositDate: day(r.deposit_date), finalAmount: num(r.final_amount), finalDue: day(r.final_due),
    deliveryDate: day(r.delivery_date), paymentTerms: str(r.payment_terms), receivedAmount: num(r.received_amount), expectedPayDate: day(r.expected_pay_date),
    deliveredAt: ts(r.delivered_at), paidAt: ts(r.paid_at), career: normCareer(r.career), earnings: normEarn(r.earnings),
    // 檔案與付款連結：pool／review 可以是本機絕對路徑（個人案）或 https；pay、other 只收 https
    links: (Array.isArray(r.links) ? r.links : []).map(l => l && typeof l === 'object' ? {
      kind: ['pool', 'review', 'pay', 'other'].includes(l.kind) ? l.kind : 'other', label: str(l.label), amount: str(l.amount),
      url: /^https:\/\//i.test(str(l.url)) ? str(l.url) : '', path: /^\//.test(str(l.path)) && !/\.\./.test(str(l.path)) ? str(l.path) : '' } : null)
      .filter(l => l && (l.url || (l.path && (l.kind === 'pool' || l.kind === 'review')))),
    // 進度與去執行（大器寫回）
    progressSteps: (Array.isArray(r.progress_steps) ? r.progress_steps : []).filter(x => x && typeof x === 'object' && str(x.name)).slice(0, 30)
      .map(x => ({ name: str(x.name), note: str(x.note), status: ['pending', 'current', 'done', 'skipped', 'blocked'].includes(x.status) ? x.status : 'pending' })),
    progressNote: str(r.progress_note), progressBlocker: str(r.progress_blocker), progressUpdatedAt: ts(r.progress_updated_at), progressUpdatedBy: nick(str(r.progress_updated_by)),
    runStatus: ['queued', 'running', 'done', 'failed'].includes(r.run_status) ? r.run_status : '', runNote: str(r.run_note), runSession: str(r.run_session),
  };
}

// ---------- 真後端（Supabase REST + Realtime） ----------
function liveAdapter() {
  const base = CONFIG.SUPABASE_URL.replace(/\/+$/, '');
  const headers = { 'content-type': 'application/json', apikey: CONFIG.SUPABASE_ANON_KEY };
  async function rpc(name, body, timeout, opt) {
    rpcCount(name);   // 2026-11-25 量測：window.__rpcCount
    // v60：有網址金鑰照舊帶 p_key；沒有金鑰就用登入的 token（p_key 送 null，資料庫 _opp_cap 認 auth.uid()）
    let tok = '';
    if (!(KEY.length >= 20) && SESS) { try { tok = await freshToken(opt && opt.retried); } catch (e) { if (e.kind === 'auth') throw new AdapterError('auth', '登入過期，請重新登入', 401); throw e; } }
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeout || CONFIG.TIMEOUT_MS);
    let res;
    try { res = await fetch(base + '/rest/v1/rpc/' + name, { method: 'POST', headers: tok ? { ...headers, authorization: 'Bearer ' + tok } : headers, body: JSON.stringify({ p_key: tok ? null : KEY, ...body }), signal: ac.signal, cache: 'no-store' }); }
    catch (e) { throw new AdapterError(ac.signal.aborted ? 'timeout' : (navigator.onLine === false ? 'offline' : 'network'), ac.signal.aborted ? '連線逾時' : '連不上伺服器'); }
    finally { clearTimeout(t); }
    let data = null; const txt = await res.text();
    try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }
    if (!res.ok) {
      const msg = String((data && (data.message || data.error || data.hint)) || ('HTTP ' + res.status));
      if (res.status === 403 && opt && opt.work) throw new AdapterError('forbidden', msg, 403);   // 案務 RPC：這把金鑰不能改案務（不是金鑰失效），不清金鑰
      if (tok && (res.status === 401 || res.status === 403)) {   // 登入的 token 過期或被收回：先換一次新的再試，還不行才登出
        if (!(opt && opt.retried)) return rpc(name, body, timeout, { ...(opt || {}), retried: true });
        dropSess(); throw new AdapterError('auth', msg, res.status);
      }
      if (res.status === 401 || res.status === 403) { LS.del(CONFIG.SNAPSHOT_KEY + ':' + keyTag()); LS.del(CONFIG.KEY_STORAGE); KEY = ''; throw new AdapterError('auth', msg, res.status); }
      throw new AdapterError(res.status === 400 || res.status === 422 ? 'state' : 'server', msg, res.status);
    }
    return data;
  }
  const card = d => { d = Array.isArray(d) ? d[0] : d; return d && typeof d === 'object' && d.id ? normalize(d) : null; };
  const R = CONFIG.RPC, W = { work: true };
  function wake(extra) {   // 不等、不報錯；text/plain 免預檢
    try { const ac = new AbortController(); const t = setTimeout(() => ac.abort(), CONFIG.WAKE_MS);
      fetch(CONFIG.WAKE_URL, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify({ ...(KEY.length >= 20 ? { k: KEY } : { t: SESS ? SESS.a : '' }), ...(extra || {}) }), signal: ac.signal, cache: 'no-store', credentials: 'omit' }).catch(() => {}).finally(() => clearTimeout(t)); } catch (e) {}
  }
  // 2026-11-22 面板按鈕叫 Mac 做事（要你做卡：我做好了、開始登入、貼回）；要等回覆，失敗丟錯
  async function macAct(p) {
    const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 15000);
    try {
      const r = await fetch(CONFIG.WAKE_URL, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify({ ...(KEY.length >= 20 ? { k: KEY } : { t: SESS ? SESS.a : '' }), ...p }), signal: ac.signal, cache: 'no-store', credentials: 'omit' });
      let d = {}; try { d = await r.json() } catch (e) {}
      if (!r.ok) throw new AdapterError(r.status === 409 ? 'state' : 'server', r.status === 503 ? 'Mac 還沒準備好' : r.status === 409 ? 'Mac 那邊沒在等，先按開始' : 'Mac 回 ' + r.status, r.status);
      return d;
    } catch (e) { if (e instanceof AdapterError) throw e; throw new AdapterError('server', 'Mac 連不上（關機或沒網路）'); } finally { clearTimeout(t); }
  }
  return {
    mode: 'live',
    async list() {
      const d = await rpc(R.list, { p_gone_hours: CONFIG.GONE_HOURS });
      if (!d || !Array.isArray(d.items)) throw new AdapterError('server', '回傳格式不對');
      const all = [].concat(d.items, d.doing || [], d.delivered || [], d.paid || [], d.gone || []).map(normalize);
      return { items: all, serverTime: ts(d.server_time) };
    },
    async get(id) { return card(await rpc(R.get, { p_id: id })); },
    async aiQuota() { return rpc('hub_ai_quota_list', {}); },
    async tideLog(since, kind) { return rpc('hub_tide_log_list', { p_since: since, p_kind: kind || null }); },   // 2026-11-25 每天確認：讀今天的確認與想排
    async tideLogAdd(kind, patch) { return rpc('hub_tide_log_add', { p_kind: kind, p_patch: patch }, 0, W); },
    async calWrite(note) { const r = await rpc('hub_tide_log_add', { p_kind: 'note', p_patch: { source: '面板', note } }, 0, W); wake({ act: 'calwrite' }); return r; },   // 2026-11-25 v124：面板改行事曆，寫 cal_write 再叫 Mac 的 write.mjs 寫進 Google
    async tidePlan(from, to) { return rpc('hub_tide_plan_list', { p_from: from, p_to: to }); },   // 2026-11-25 張弛：今天的節奏（只讀）   // 2026-11-25 msg 709：各 AI 帳號額度（Mac 每 30 分鐘、有變才推）
    async history(id) {   // 卡片動作紀錄：誰、什麼時候、做了什麼（opp_get 的 history）
      const d = await rpc(R.get, { p_id: id }); const r = Array.isArray(d) ? d[0] : d;
      return normHistory(r && r.history);
    },
    // 2026-11-25 v131 老大：「每隻機器人會有總聊天…點擊某一張卡片或者是某一處，那他要有一個子聊天…可是總聊天會看見子聊天」
    // scope：all＝總聊天（含所有子聊天）｜item:<id>｜ctx:<哪一處>。沒帶 scope 照舊讀。
    async msgs(id, bot, scope) { if (scope) return normMsgs(await rpc('opp_msg_thread', { p_bot: bot || 'daqi', p_scope: scope, p_limit: 120 })); return normMsgs(await rpc(R.msgList, { p_item_id: id || null, p_limit: 80, p_bot: bot || 'daqi' })); },
    async say(id, body, bot, ctx) { const r = ctx && !id ? await rpc('opp_msg_say', { p_item_id: null, p_body: body, p_bot: bot || 'daqi', p_ctx: ctx }) : await rpc(R.msgAdd, { p_item_id: id || null, p_body: body, p_bot: bot || 'daqi' }); if (!bot || bot === 'daqi' || bot === 'jian') wake(); else wake({ act: 'botsend' }); return r; }   // 2026-11-25 v125：送給別隻也叫 Mac relay 立刻跑一次
,
    async botInbox() { return normInbox(await rpc(R.botInbox, {})); },
    async hubToday() { return normHub(await rpc(R.hubToday, {})); },
    async moneySubs() { return normMoney(await rpc(R.moneySubs, {}, 0, W)); },   // v35：403＝這把金鑰不能看錢（AI協作金鑰），不是金鑰失效，不清金鑰
    // v41：目標、行事曆、生活、錢總覽。回傳原樣，app.js 檔尾轉成設計稿的形狀；寫入與錢的 403 不清金鑰
    async goals() { return rpc(R.goals, {}); },
    async goalSet(id, patch) { return rpc(R.goalSet, { p_id: id || null, p_patch: patch || {} }, 0, W); },
    async cal(days) { return rpc(R.cal, { p_days: days || 14 }); },
    async life() { return rpc(R.life, {}); },
    async lifeSet(id, kind, patch) { return rpc(R.lifeSet, { p_id: id || null, p_kind: kind || null, p_patch: patch || {} }, 0, W); },
    async lifeGone() { return rpc(R.lifeGone, {}, 0, W); },   // v50：最近 72 小時刪掉的（資料庫遷移套上前會回找不到函式，前端退回本機記的）
    async moneyOverview() { return rpc(R.money, {}, 0, W); },
    async moneyTrend(n) { return rpc(R.moneyTrend, { p_months: n || 12 }, 0, W); },   // v54：每月收入、支出、存下與負債（只讀，跟錢總覽同一道門；資料庫還沒套遷移會回找不到函式）
    // v46：卡片編輯、封存、刪除。kind＝decision｜job｜event；action＝archive｜unarchive｜delete｜restore（刪除 72 小時內可救回）
    async hubEdit(kind, id, patch) { return rpc(R.hubEdit, { p_kind: kind, p_id: String(id), p_patch: patch || {} }, 0, W); },
    async hubShelf(kind, id, action) { return rpc(R.hubShelf, { p_kind: kind, p_id: String(id), p_action: action }, 0, W); },
    async jobSet(o) { return rpc('hub_job_set', { p_id: o.id, p_title: o.title, p_agent: o.agent, p_status: o.status || 'running', p_note: o.note || null, p_ask: o.ask || null, p_project: o.project || null, p_needs: o.needs || 'any', ...(o.sourceKey ? { p_source_key: o.sourceKey } : {}) }, 0, W); },   // 2026-11-24 要你做交給大器／霸霸：卡轉成在跑
    async shelf() { const d = await rpc(R.shelf, {}, 0, W); return Array.isArray(d) ? d : []; },
    // v48：付款授權單。只有老大本人的金鑰能授權（AI協作金鑰回 403，不清金鑰）；面板不碰錢，實際付款由負責的 Bot 做完回報
    async payAuthorize(o) { return rpc(R.payAuthorize, { p_src_kind: o.kind, p_src_id: o.id == null ? null : String(o.id), p_src_title: o.title || null, p_amount: o.amount == null ? null : +o.amount, p_amount_text: o.amountText, p_payee: o.payee, p_assignee: o.by || null, p_link: o.link || null }, 0, W); },
    async payCancel(id) { return rpc(R.payCancel, { p_id: +id }, 0, W); },
    async payList() { const d = await rpc(R.payList, { p_limit: 80 }, 0, W); return Array.isArray(d) ? d : []; },
    async calRefresh() { const r = await rpc(R.calRefresh, {}, 0, W); wake({ act: 'botsend' }); return r; },   // v133：叫 Mac 立刻跑一輪（relay 背景間隔放慢後靠這個即時）
    // v60：公司卡（肉咖從皮條客同步過來，只有老大讀得到）與派工（肉咖或大器，各記一筆 hub_jobs）
    async company() { return rpc(R.company, {}, 0, W); },
    async coTaskOpp(oppId, title, assignee, body) { return rpc('hub_company_task_add_opp', { p_opp_id: oppId, p_title: title, p_assignee: assignee, p_body: body }, 0, W); },   // v100 原生公司案子同步到皮條客（遷移 20261124_公司原生卡）
    async coSteps(cardId, steps) { return rpc('hub_company_steps_set', { p_card_id: cardId, p_steps: steps }, 0, W); },   // 2026-11-24 公司卡步驟卡
    async coTask(cardId, who, body) { const r = await rpc(R.coTask, { p_card_id: cardId, p_assignee: who, p_body: body }, 0, W); if (who === 'daqi') wake(); return r; },
    async cardEdit(id, patch) { return card(await rpc(R.cardEdit, { p_id: id, p_patch: patch || {} }, 0, W)); },
    async hubAnswer(id, k, note) { const r = await rpc(R.hubAnswer, { p_id: id, p_answer_key: k, p_note: note || null }, 0, W); if (k) wake({ act: 'decided' }); return r; },
    async macAct(p) { return macAct(p); },   // 403＝這把金鑰不能替 Borry 回答，不清金鑰
    async todoAdd(title, note) { return card(await rpc(R.todoAdd, { p_title: title, p_note: note || null })); },
    async workAdd(title, basket) { return card(await rpc(R.workAdd, basket ? { p_title: title, p_basket: basket } : { p_title: title }, 0, W)); },
    async scanRequest(basket) { return rpc(R.scanRequest, { p_basket: BACK_BASKET[basket] || basket }); },   // 立即掃描：留單給集集
    async scanStatus() { return normScan(await rpc(R.scanStatus, {})); },
    async archive(q, year) {   // 封存區：結案與作廢的案子
      const d = await rpc(R.archive, { p_q: q || null, p_year: year ? +year : null, p_limit: 200 });
      return { items: (d && Array.isArray(d.items) ? d.items : []).map(normalize), years: d && Array.isArray(d.years) ? d.years : [] };
    },
    async act(id, action, o = {}) {
      switch (action) {
        case 'dive': return card(await rpc(R.dive, { p_id: id, ...(o.force ? { p_force: true } : {}) }));
        case 'stash': return card(await rpc(R.stash, { p_id: id }));
        case 'unstash': return card(await rpc(R.unstash, { p_id: id }));
        case 'deleted': case 'skipped': return card(await rpc(R.drop, { p_id: id, p_reason: action }));
        case 'restore': return card(await rpc(R.restore, { p_id: id }));
        case 'build': return card(await rpc(R.build, { p_id: id }));
        case 'close': return card(await rpc(R.close, { p_id: id, p_result: o.result }));
        case 'tdone': return card(await rpc(R.todoDone, { p_id: id, p_done: o.done !== false }));   // v90 任務手動做完／救回
        case 'reopen': return card(await rpc(R.reopen, { p_id: id }));
        case 'purge': await rpc(R.purge, { p_id: id, p_confirm: o.confirm }); return null;
        case 'work': return card(await rpc(R.workUpdate, { p_id: id, p_patch: o.patch || {} }, 0, W));
        case 'deliver': return card(await rpc(R.setStatus, { p_id: id, p_status: 'delivered', ...(o.patch ? { p_patch: o.patch } : {}) }, 0, W));
        case 'paid': return card(await rpc(R.setStatus, { p_id: id, p_status: 'paid', p_patch: o.patch || {} }, 0, W));
        case 'run': { const c = card(await rpc(R.run, { p_id: id })); wake(); return c; }
        case 'steps': return card(await rpc(R.progress, { p_id: id, p_steps: o.steps || [] }, 0, W));
        case 'blocker': return card(await rpc(R.progress, { p_id: id, p_blocker: o.text || '' }, 0, W));   // v95 卡點：改、清掉（空字串＝清掉）
        case 'runset': return card(await rpc(R.progress, { p_id: id, p_run_status: o.status, p_run_note: o.note || '' }, 0, W));   // v93 立刻停止與復原：只改執行狀態與執行備註   // v39：案子「⋯」這步做完／退回上一步，只改步驟，不動 note、blocker
        case 'back': return card(await rpc(R.setStatus, { p_id: id, p_status: o.to === 'delivered' ? 'delivered' : 'doing' }, 0, W));
      }
      throw new AdapterError('server', '未知動作');
    },
    subscribe(onPing, onState) {
      let stopFn = () => {}, dead = false;
      rpc(R.topic, {}).then(t => { if (!dead && typeof t === 'string' && t) stopFn = realtime(base, t, onPing, onState); else onState(false); }).catch(() => onState(false));
      return () => { dead = true; stopFn(); };
    },
    setKey(k) { KEY = k; LS.set(CONFIG.KEY_STORAGE, k); },
  };
}

// Supabase Realtime（Phoenix 協定）。只聽 broadcast；任何訊息都只當成「請重抓」，不信任內容。
function realtime(base, channel, onPing, onState) {
  const url = base.replace(/^http/, 'ws') + '/realtime/v1/websocket?apikey=' + encodeURIComponent(CONFIG.SUPABASE_ANON_KEY) + '&vsn=1.0.0';
  const topic = 'realtime:' + channel;
  let ws, hb, rt, n = 0, stop = false, tries = 0;
  const send = o => { try { ws.send(JSON.stringify(o)); } catch (e) {} };
  function open() {
    if (stop) return;
    try { ws = new WebSocket(url); } catch (e) { onState(false); return; }
    ws.onopen = () => {
      send({ topic, event: 'phx_join', ref: String(++n), payload: { config: { broadcast: { self: false, ack: false }, presence: { key: '' }, postgres_changes: [], private: false }, access_token: CONFIG.SUPABASE_ANON_KEY } });
      hb = setInterval(() => send({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(++n) }), 25000);
    };
    ws.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.topic !== topic) return;
      if (m.event === 'phx_reply') { if (m.payload && m.payload.status === 'ok') { if (tries) onPing(); tries = 0; onState(true); } else onState(false); }
      else if (m.event === 'broadcast') onPing();
      else if (m.event === 'phx_error' || m.event === 'phx_close') onState(false);
    };
    ws.onclose = () => { clearInterval(hb); onState(false); if (!stop) rt = setTimeout(open, Math.min(30000, 1500 * 2 ** tries++)); };
    ws.onerror = () => { try { ws.close(); } catch (e) {} };
  }
  const vis = () => { if (!document.hidden && (!ws || ws.readyState > 1)) { clearTimeout(rt); open(); } };
  document.addEventListener('visibilitychange', vis);
  open();
  return () => { stop = true; clearTimeout(rt); clearInterval(hb); document.removeEventListener('visibilitychange', vis); try { ws.close(); } catch (e) {} };
}
