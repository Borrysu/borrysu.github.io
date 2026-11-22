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
  POLL_MS: 15000,          // 輪詢備援
  FAST_POLL_MS: 3000,      // 有「讀全文中」或「建資料夾中」時加快
  TIMEOUT_MS: 15000,       // 一般請求逾時
  SLOW_MS: 3000,           // 超過這麼久還沒回來，就顯示「載入比較久」
  GONE_HOURS: 72,
  RPC: { list: 'opp_list', get: 'opp_get', topic: 'get_opp_realtime_topic',
         dive: 'opp_dive', stash: 'opp_stash', unstash: 'opp_unstash', drop: 'opp_drop', restore: 'opp_restore', build: 'opp_build',
         close: 'opp_close', reopen: 'opp_reopen', archive: 'opp_archive', purge: 'opp_purge',
         scanRequest: 'opp_scan_request', scanStatus: 'opp_scan_status',
         workUpdate: 'opp_work_update', setStatus: 'opp_set_status', workAdd: 'opp_work_add',
         msgList: 'opp_msg_list', msgAdd: 'opp_msg_add', botInbox: 'opp_bot_inbox', todoAdd: 'opp_todo_add', run: 'opp_run', progress: 'opp_progress_set',
         hubToday: 'hub_today', moneySubs: 'hub_money_subs', hubAnswer: 'hub_decision_answer',
         goals: 'hub_goals_list', goalSet: 'hub_goal_set', cal: 'hub_cal_list', life: 'hub_life_list', lifeSet: 'hub_life_set', lifeGone: 'hub_life_gone', money: 'hub_money_overview', moneyTrend: 'hub_money_trend',
         hubEdit: 'hub_card_edit', hubShelf: 'hub_card_shelf', shelf: 'hub_shelf_list', cardEdit: 'opp_card_edit',
         payAuthorize: 'hub_pay_authorize', payCancel: 'hub_pay_cancel', payList: 'hub_pay_list', calRefresh: 'hub_cal_refresh_request' },   // v48：付款鈕＝授權單（交給塔塔／朋朋／集集付）、行事曆現在更新   // v46：卡面一句 ask、hub 卡片編輯封存刪除、案子機會待辦改卡面一句   // v41（2026-11-22）：目標、行事曆（唯讀同步）、生活、錢總覽（只讀）   // 2026-11-17：跟大器說、待辦、去執行   // 案務：報價收款欄位、doing→delivered→paid（Borry 與集集的金鑰可用）
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
export function saveKey(k) { KEY = k; LS.set(CONFIG.KEY_STORAGE, k); try { const u = new URL(location.href); u.hash = ''; u.searchParams.set('k', k); history.replaceState(null, '', u.pathname + u.search); } catch (e) {} }  // 網址也一起換，不然重新整理會讀回舊的 ?k=
export const keyTag = () => KEY.slice(0, 6);        // 快照用，不是完整金鑰

export async function createAdapter() {
  const mockFlag = qs.get('mock');
  const forceMock = mockFlag !== null && mockFlag !== '0';
  if (hasKey() && !forceMock && CONFIG.SUPABASE_URL.startsWith('http')) return liveAdapter();
  const { mockAdapter } = await import('./mock.js?v55');
  return mockAdapter(forceMock ? mockFlag : '');
}

// ---------- 正規化：後端欄位 → 前端欄位 ----------
const BASKET = { todo: 'todo', company: 'company', personal: 'personal', other: 'other', fund: 'funding', honor: 'achievement', funding: 'funding', achievement: 'achievement' };
const ts = v => { if (!v) return null; const n = typeof v === 'number' ? v : Date.parse(v); return Number.isFinite(n) ? n : null; };
const arr = v => Array.isArray(v) ? v.map(x => String(x)).filter(Boolean) : (typeof v === 'string' && v ? [v] : []);
const str = v => (v == null ? '' : String(v));
const web = v => { v = str(v).trim(); return /^https?:\/\//i.test(v) ? v : ''; };   // 連結只收 http(s)，擋 javascript: 等

const BOTS_OK = ['daqi', 'jiji', 'tata', 'peng', 'mon', 'din', 'kim'];
// v40：各 Bot 的回覆與還在等的話（opp_bot_inbox）
export const normInbox = d => ({ replies: (d && Array.isArray(d.replies) ? d.replies : []).filter(r => BOTS_OK.includes(r.bot)).map(r => ({ id: +r.id || 0, bot: r.bot, item: r.item_id ? str(r.item_id) : null, body: str(r.body), at: ts(r.created_at) })),
  waiting: (d && Array.isArray(d.waiting) ? d.waiting : []).filter(w => BOTS_OK.includes(w.bot)).map(w => ({ id: +w.id || 0, bot: w.bot })) });
export const normMsgs = d => (Array.isArray(d) ? d : []).map(m => ({ id: +m.id || 0, kind: ['user', 'daqi', 'system', 'run', 'bot'].includes(m.kind) ? m.kind : 'user', bot: BOTS_OK.includes(m.bot) ? m.bot : 'daqi', author: nick(str(m.author)), body: str(m.body), at: ts(m.created_at) })).filter(m => m.body && m.at);
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
    jobs: arr(d.jobs).map(r => ({ id: str(r.id), agent: str(r.agent), machine: str(r.machine), project: str(r.project), title: str(r.title), note: str(r.note), ask: str(r.ask), resultPath: str(r.result_path),
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
    runStatus: ['queued', 'running', 'done', 'failed'].includes(r.run_status) ? r.run_status : '', runNote: str(r.run_note),
  };
}

// ---------- 真後端（Supabase REST + Realtime） ----------
function liveAdapter() {
  const base = CONFIG.SUPABASE_URL.replace(/\/+$/, '');
  const headers = { 'content-type': 'application/json', apikey: CONFIG.SUPABASE_ANON_KEY };
  async function rpc(name, body, timeout, opt) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeout || CONFIG.TIMEOUT_MS);
    let res;
    try { res = await fetch(base + '/rest/v1/rpc/' + name, { method: 'POST', headers, body: JSON.stringify({ p_key: KEY, ...body }), signal: ac.signal, cache: 'no-store' }); }
    catch (e) { throw new AdapterError(ac.signal.aborted ? 'timeout' : (navigator.onLine === false ? 'offline' : 'network'), ac.signal.aborted ? '連線逾時' : '連不上伺服器'); }
    finally { clearTimeout(t); }
    let data = null; const txt = await res.text();
    try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }
    if (!res.ok) {
      const msg = String((data && (data.message || data.error || data.hint)) || ('HTTP ' + res.status));
      if (res.status === 403 && opt && opt.work) throw new AdapterError('forbidden', msg, 403);   // 案務 RPC：這把金鑰不能改案務（不是金鑰失效），不清金鑰
      if (res.status === 401 || res.status === 403) { LS.del(CONFIG.SNAPSHOT_KEY + ':' + keyTag()); LS.del(CONFIG.KEY_STORAGE); KEY = ''; throw new AdapterError('auth', msg, res.status); }
      throw new AdapterError(res.status === 400 || res.status === 422 ? 'state' : 'server', msg, res.status);
    }
    return data;
  }
  const card = d => { d = Array.isArray(d) ? d[0] : d; return d && typeof d === 'object' && d.id ? normalize(d) : null; };
  const R = CONFIG.RPC, W = { work: true };
  return {
    mode: 'live',
    async list() {
      const d = await rpc(R.list, { p_gone_hours: CONFIG.GONE_HOURS });
      if (!d || !Array.isArray(d.items)) throw new AdapterError('server', '回傳格式不對');
      const all = [].concat(d.items, d.doing || [], d.delivered || [], d.paid || [], d.gone || []).map(normalize);
      return { items: all, serverTime: ts(d.server_time) };
    },
    async get(id) { return card(await rpc(R.get, { p_id: id })); },
    async history(id) {   // 卡片動作紀錄：誰、什麼時候、做了什麼（opp_get 的 history）
      const d = await rpc(R.get, { p_id: id }); const r = Array.isArray(d) ? d[0] : d;
      return normHistory(r && r.history);
    },
    async msgs(id, bot) { return normMsgs(await rpc(R.msgList, { p_item_id: id || null, p_limit: 80, p_bot: bot || 'daqi' })); },
    async say(id, body, bot) { return rpc(R.msgAdd, { p_item_id: id || null, p_body: body, p_bot: bot || 'daqi' }); },
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
    async shelf() { const d = await rpc(R.shelf, {}, 0, W); return Array.isArray(d) ? d : []; },
    // v48：付款授權單。只有老大本人的金鑰能授權（AI協作金鑰回 403，不清金鑰）；面板不碰錢，實際付款由負責的 Bot 做完回報
    async payAuthorize(o) { return rpc(R.payAuthorize, { p_src_kind: o.kind, p_src_id: o.id == null ? null : String(o.id), p_src_title: o.title || null, p_amount: o.amount == null ? null : +o.amount, p_amount_text: o.amountText, p_payee: o.payee, p_assignee: o.by || null, p_link: o.link || null }, 0, W); },
    async payCancel(id) { return rpc(R.payCancel, { p_id: +id }, 0, W); },
    async payList() { const d = await rpc(R.payList, { p_limit: 80 }, 0, W); return Array.isArray(d) ? d : []; },
    async calRefresh() { return rpc(R.calRefresh, {}, 0, W); },
    async cardEdit(id, patch) { return card(await rpc(R.cardEdit, { p_id: id, p_patch: patch || {} }, 0, W)); },
    async hubAnswer(id, k, note) { return rpc(R.hubAnswer, { p_id: id, p_answer_key: k, p_note: note || null }, 0, W); },   // 403＝這把金鑰不能替 Borry 回答，不清金鑰
    async todoAdd(title, note) { return card(await rpc(R.todoAdd, { p_title: title, p_note: note || null })); },
    async workAdd(title) { return card(await rpc(R.workAdd, { p_title: title }, 0, W)); },
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
        case 'reopen': return card(await rpc(R.reopen, { p_id: id }));
        case 'purge': await rpc(R.purge, { p_id: id, p_confirm: o.confirm }); return null;
        case 'work': return card(await rpc(R.workUpdate, { p_id: id, p_patch: o.patch || {} }, 0, W));
        case 'deliver': return card(await rpc(R.setStatus, { p_id: id, p_status: 'delivered', ...(o.patch ? { p_patch: o.patch } : {}) }, 0, W));
        case 'paid': return card(await rpc(R.setStatus, { p_id: id, p_status: 'paid', p_patch: o.patch || {} }, 0, W));
        case 'run': return card(await rpc(R.run, { p_id: id }));
        case 'steps': return card(await rpc(R.progress, { p_id: id, p_steps: o.steps || [] }, 0, W));   // v39：案子「⋯」這步做完／退回上一步，只改步驟，不動 note、blocker
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
