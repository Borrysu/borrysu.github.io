// 機會雷達主程式：狀態、畫面、事件。只透過 adapter.js 取得與寫入資料。
import { createAdapter, CONFIG, AdapterError, hasKey, keyTag, tokenFrom, saveKey } from './adapter.js?v28';
import { esc, H, D, URGENT_DAYS, fmtDate, fmtClock, fmtLeft, shortLeft, softBreak, splitAmount } from './util.js?v28';

const $ = s => document.querySelector(s);
// 個人版不收公司標案（Borry 2026-11-17：「公司標案我機會雷達似乎就不用了」），公司案只留在封存與舊資料的標籤
const BASKETS = [
  { k: 'personal', n: '個人案', d: '自由導演、編劇、詞曲名義接的案子' },
  // 創作資金只放申請得到的錢；影展、比賽（含 AI 比賽）歸「影展比賽」（Borry 2026-11-17：「AI比賽…算影展跟比賽，他不是我能申請到的資金」）
  { k: 'funding', n: '創作資金', d: '補助、委製、投資：自己申請得到的錢' },
  { k: 'achievement', n: '影展比賽', d: '影展、比賽（含 AI 比賽）、創投、合作、評審' },
  { k: 'other', n: '非本業', d: '非本業賺錢機會、AI 可以自己跑的' },
];
const BN = Object.fromEntries(BASKETS.map(b => [b.k, b.n]).concat([['company', '公司案'], ['todo', '待辦']]));
// 進行中：手上所有專案（案務＋進度＋跟大器說）；待辦：要請 AI 建置的事，按「去執行」大器開子視窗跑（Borry 2026-11-17）
const DOING = { k: 'doing', n: '進行中', d: '手上所有專案：案務、進度，有事直接跟大器說' };
const TODO = { k: 'todo', n: '待辦', d: '要請 AI 建置的事，按「去執行」大器就開跑並回報進度' };
// 封存放在最右邊一欄，往左滑才看得到（Borry 2026-11-16 皮條客：「封存可以放到盯案後續的右邊，我們往左滑才看得到」）
const ARCH = { k: 'archive', n: '封存', d: '結案與作廢的案子，不會自動消失' };
// 今天：打開第一眼先看要你決定的事（Borry 2026-11-19：「總控台照建議開工」，名字用通告板）
const TODAY = { k: 'today', n: '今天', d: '現在要你決定的事，還有誰在做什麼' };
const TABS = [TODAY].concat(BASKETS, [DOING, TODO, ARCH]);
const HOLD_HOUR = 8;      // 暫存後，隔天幾點提醒（由集集傳訊息，不是瀏覽器）
const IC = {
  trash: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>',
  bm: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
  dive: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  inbox: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13l2-8h12l2 8M4 13v6h16v-6M4 13h5l1 2h4l1-2h5"/></svg>',
  warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l9 16H3zM12 10v5M12 17.5v.5"/></svg>',
};

// ---------------- 狀態 ----------------
const S = {
  items: new Map(),
  net: 'loading',      // loading | ok | offline | auth | nokey
  hadData: false,      // 畫面上是不是已經有資料可看（快照或網路）
  slow: false, lastOk: null, rt: false, firstNet: false,
  tab: 'today', sheet: false, drawer: null,   // drawer = {id, view:'preview'|'full'}
  detail: new Map(),   // id → {st:'loading'|'fail'|'none', err, t0}
  textOpen: new Set(), fresh: new Set(),
  scan: {},             // 各籃立即掃描的單：{open, last}
  hist: new Map(),      // 卡片動作紀錄：id → [{at, actor, action}]
  arch: { open: false, q: '', year: '', items: [], years: [], busy: false, err: '', loaded: false },   // 封存區
  draft: new Map(),     // 案務欄位還沒存的輸入：id → {欄位: 字串}；重繪時照填回去
  goneOpen: false,      // 「剛收走的」有沒有展開
  careerOpen: new Set(), // 哪些卡的「職涯與工時」展開著
  msgs: new Map(),      // 跟大器說：key（卡片 id，整個面板是 ''）→ {items, busy, err}
  chatDraft: new Map(), // 還沒送出的話
  sending: new Set(),
  hub: { open: [], answered: [], jobs: [], events: [], beats: [], loaded: false, err: '' },   // 今天頁
  hubBusy: new Set(), hubAnsOpen: false,
};
let api, lastFocus = null, sigLast = '', depth = 0, ignorePop = false;
const locks = new Set(), mutDone = {};
let OFF = 0;                                   // 伺服器時間與本機時間的差，倒數用校正後的時間
const tnow = () => Date.now() + OFF;

const items = () => [...S.items.values()];
const get = id => S.items.get(id) || S.arch.items.find(i => i.id === id);
const WORK = new Set(['doing', 'delivered', 'paid']);       // 進行中、已交件、已收款：都開資料夾抽屜
const isWork = it => !!it && WORK.has(it.status);
const isOld = it => it.sourceSite === '既有案' || it.basket === 'todo';             // 集集直接記進來的既有案，沒有建資料夾
const editing = box => { const a = document.activeElement; return !!(a && box && box.contains(a) && a.matches('input,select,textarea')); };
const money = n => n == null ? '' : 'NT$ ' + Math.round(n).toLocaleString('zh-TW');

// ---------------- 倒數（只做顯示；真正收走看資料庫的 status 與 expires_at） ----------------
function target(it) {
  if (it.deadline && (!it.expiresAt || it.deadline <= it.expiresAt)) return { kind: 'dl', at: it.deadline };
  if (it.expiresAt) return { kind: 'ttl', at: it.expiresAt };
  return { kind: 'none', at: Infinity };
}
const vanishAt = it => target(it).at;
function lvOf(it) {
  const t = target(it), m = t.at - tnow();
  if (t.kind === 'dl') return m < URGENT_DAYS * D ? 'hot' : m < 7 * D ? 'warm' : 'calm';   // 紅色只給真的截止日
  if (t.kind === 'ttl') return m < D ? 'warm' : 'calm';
  return 'calm';
}
function cdShort(it) {
  const t = target(it), m = t.at - tnow();
  if (t.kind === 'none') return '<span class="nodl">沒寫截止日</span>';
  if (t.kind === 'dl') return '<b>' + (m <= 0 ? '時間到' : shortLeft(m)) + '</b>' + (m <= 0 ? '' : ' 截止');
  return '<b>' + (m <= 0 ? '即將' : shortLeft(m)) + '</b> ' + (m <= 0 ? '收走' : '後收走');
}
function cdFull(it) {
  const t = target(it), m = t.at - tnow();
  if (t.kind === 'none') return '沒寫';
  return m <= 0 ? (t.kind === 'dl' ? '時間到' : '即將收走') : fmtLeft(m);
}
function cdLine(it) {            // 待決區用：「剩 6 天 5 小時 截止」
  const t = target(it), m = t.at - tnow();
  if (t.kind === 'none') return '沒寫截止日';
  if (t.kind === 'dl') return m <= 0 ? '截止時間到了' : '剩 <b>' + fmtLeft(m) + '</b> 截止';
  return m <= 0 ? '即將收走' : '<b>' + fmtLeft(m) + '</b> 後收走';
}
function tick() {
  document.querySelectorAll('[data-cd]').forEach(e => {
    const it = get(e.dataset.cd); if (!it) return;
    const mode = e.dataset.mode;
    if (mode === 'short') e.innerHTML = cdShort(it); else if (mode === 'line') e.innerHTML = cdLine(it); else e.textContent = cdFull(it);
    e.dataset.lvl = lvOf(it);
    const card = e.closest('.card'); if (card) card.dataset.lvl = lvOf(it);
  });
  document.querySelectorAll('[data-elapsed]').forEach(e => {
    const d = S.detail.get(e.dataset.elapsed); if (!d) return;
    const sec = Math.floor((tnow() - d.t0) / 1000);
    e.textContent = sec;
    const hint = e.parentNode && e.parentNode.querySelector('[data-elapsed-hint]');
    if (hint) hint.textContent = crawlHint(sec);
  });
  renderSummary();
}

// ---------------- 小積木 ----------------
const chip = it => '<span class="chip b-' + it.basket + '"><i></i>' + BN[it.basket] + '</span>';
const demo = it => it.isDemo ? '<span class="demo-badge">示意資料</span>' : '';
const orgLine = it => it.org && !it.title.includes(it.org) && !it.isDemo ? '<p class="dt-org">' + esc(it.org) + '</p>' : '';
function amt(it) {
  const lab = it.amountLabel ? '<em>' + esc(it.amountLabel) + '</em>' : '';
  const a = splitAmount(it.amountDisplay);
  if (a.num) {
    const long = a.num.length > 7 ? ' long' : '';
    return '<span class="amt' + long + '">' + lab + (it.currency ? '<i>' + esc(it.currency) + '</i>' : '') + '<b>' + esc(a.num) + '</b>' + (a.unit ? '<u>' + esc(a.unit) + '</u>' : '') + '</span>';
  }
  const t = a.text || '沒寫金額';
  return '<span class="amt noamt">' + (t.includes(it.amountLabel) ? '' : lab) + '<b>' + esc(t) + '</b></span>';
}
const link = it => it.sourceUrl ? '<a href="' + esc(it.sourceUrl) + '" target="_blank" rel="noopener noreferrer">' + (it.sourceSite ? '開啟原始連結（' + esc(it.sourceSite) + '）' : '開啟原始連結') + '</a>' : '';
const para = s => esc(s).split(/\n{2,}/).map(p => p.replace(/\n/g, '<br>')).join('<br><br>');

// ---------------- 畫面：頂端 ----------------
function renderLive() {
  const el = $('#live'); let dot = '', txt = '';
  const mock = api && api.mode === 'mock';
  if (S.net === 'loading') { dot = 'idle'; txt = S.hadData ? '更新中，先顯示上次的內容' : '載入中'; }
  else if (S.net === 'offline') { dot = 'off'; txt = S.lastOk ? '離線中，顯示 ' + fmtClock(S.lastOk) + ' 的內容' : '連不上伺服器'; }
  else if (S.net === 'auth') { dot = 'off'; txt = '金鑰失效'; }
  else { dot = S.rt ? '' : 'idle'; txt = (mock ? '示範資料，' : S.rt ? '即時更新，' : '每 15 秒更新，') + fmtClock(S.lastOk) + ' 更新'; }
  el.innerHTML = '<span class="dot ' + dot + '"></span><span>' + txt + '</span>';
}
function renderSummary() {
  const live = inbox();
  const now = tnow();
  const hot = items().filter(i => (i.status === 'new' || i.status === 'snoozed') && i.deadline && i.deadline > now && i.deadline - now < URGENT_DAYS * D).length;
  // 右上角合併：待看、進行中、最急的一件（Borry 2026-11-16 皮條客：黃色提示併到右上角，最緊急的小字提醒，進行中的標籤變黃）
  const doing = items().filter(i => i.status === 'doing' && i.basket !== 'todo');
  const urgent = doing.filter(i => i.deadline && i.deadline > now && i.deadline - now < URGENT_DAYS * D).sort((a, b) => a.deadline - b.deadline);
  $('#sum').innerHTML = S.hadData ? '<b>' + live.length + '</b> 筆待看' + (doing.length ? '・<b>' + doing.length + '</b> 件進行中' : '') +
    // 截止提醒只看進行中的案子（Borry 2026-11-16：「截止日要放的是進行中的！」）
    (urgent.length ? '<br><span class="hotn">最急：' + esc(nm(urgent[0])) + '，剩 ' + esc(shortLeft(urgent[0].deadline - now)) + (urgent.length > 1 ? '（共 ' + urgent.length + ' 件 ' + URGENT_DAYS + ' 天內截止）' : '') + '</span>' : '') : '';
  ['#holdbtn', '#hpill'].forEach(q => { const b = $(q); if (b) b.classList.toggle('urgent', urgent.length > 0); });
}
function renderNotice() {
  const el = $('#notice'); let html = '', cls = 'notice';
  if (api && api.mode === 'mock' && !hasKey()) {
    html = '<span class="txt">沒有金鑰，現在看到的是示範資料。要看真的機會，請用 Borry 專屬網址開啟。</span><button type="button" data-act="paste-key">貼上金鑰</button>';
  } else if (S.net === 'offline') {
    cls += ' off';
    html = '<span class="txt">' + (S.lastOk ? '連不到伺服器，畫面是 ' + fmtClock(S.lastOk) + ' 的內容。恢復連線後會自動更新。' : '連不到伺服器，也沒有上次的內容可以顯示。') + '</span><button type="button" data-act="retry">重試</button>';
  } else if (S.net === 'loading' && S.slow) {
    html = '<span class="spin"></span><span class="txt">' + (S.hadData ? '連線比較慢，先顯示上次的內容，等一下會自動更新。' : '載入比較久，網路可能很慢，請稍等。') + '</span>';
  } else if (S.net === 'ok' && S.slow) {
    html = '<span class="spin"></span><span class="txt">正在更新…</span>';
  }
  el.className = cls; el.hidden = !html; el.innerHTML = html;
}

// ---------------- 畫面：看板 ----------------
function sortList(l) { return l.sort((a, b) => vanishAt(a) - vanishAt(b) || (b.foundAt || 0) - (a.foundAt || 0)); }
const inbox = () => items().filter(i => i.status === 'new' && i.basket !== 'todo' && i.basket !== 'company');

function card(it) {
  const lv = lvOf(it);
  return '<article class="card b-' + it.basket + (S.fresh.has(it.id) ? ' fresh' : '') + '" data-id="' + esc(it.id) + '" data-lvl="' + lv + '" tabindex="0" aria-label="' + esc(it.title) + '">' +
    '<div class="c1"><span class="tm" data-cd="' + esc(it.id) + '" data-mode="short" data-lvl="' + lv + '">' + cdShort(it) + '</span>' + demo(it) + '</div>' +
    '<h3 class="sb">' + softBreak(it.title) + '</h3><div class="c3">' + amt(it) + '</div>' +
    '<div class="ca"><button class="del" data-act="del" data-id="' + esc(it.id) + '" type="button">' + IC.trash + '<span>刪掉</span></button>' +
    '<button data-act="hold" data-id="' + esc(it.id) + '" type="button">' + IC.bm + '<span>暫存</span></button>' +
    '<button class="go" data-act="dive" data-id="' + esc(it.id) + '" type="button">' + IC.dive + '<span>深入了解</span></button></div></article>';
}
const skel = () => '<div class="card skel"><div class="sk"></div><div class="sk"></div><div class="sk"></div></div>';

function renderBoard() {
  const lanes = $('#lanes'), board = $('#board');
  const keep = {}; lanes.querySelectorAll('.lane').forEach(l => { keep[l.dataset.l] = l.querySelector('.lbody').scrollTop; });
  const left = lanes.scrollLeft;
  const fid = document.activeElement && ['arch-q', 'todo-in', 'work-in'].includes(document.activeElement.id) ? document.activeElement.id : '';
  const hf = document.activeElement && document.activeElement.dataset && /^hub:/.test(document.activeElement.dataset.chat || '') ? document.activeElement.dataset.chat : '';
  let msg = $('#boardmsg'); if (!msg) { msg = document.createElement('div'); msg.id = 'boardmsg'; msg.className = 'board-msg'; msg.hidden = true; board.appendChild(msg); }
  const all = inbox(), loadingEmpty = !S.hadData && S.net === 'loading';
  const holdN = holdItems().length;
  // 整個面板的三種特殊狀態
  let m = null;
  if (S.net === 'auth') m = { ic: IC.warn, t: '金鑰失效', p: '請重新開 Borry 專屬網址。', btn: '<button class="btn btn-primary" data-act="paste-key" type="button">貼上金鑰</button>' };
  else if (S.net === 'offline' && !S.hadData) m = { ic: IC.warn, t: '載入失敗', p: '連不到伺服器，也沒有上次的內容可以顯示。請確認網路後再試。', btn: '<button class="btn btn-primary" data-act="retry" type="button">再試一次</button>' };
  msg.hidden = !m; lanes.hidden = !!m;
  if (m) msg.innerHTML = m.ic + '<h2>' + m.t + '</h2><p>' + m.p + '</p>' + m.btn;

  $('#tabs').innerHTML = TABS.map(b => '<button class="tab b-' + b.k + '" type="button" role="tab" data-tab="' + b.k + '" aria-selected="' + (S.tab === b.k) + '">' +
    (loadingEmpty ? '<b class="sk-n sk"></b>' : '<b>' + (b.k === 'today' ? (S.hub.loaded ? S.hub.open.length : '…') : b.k === 'archive' ? (S.arch.loaded ? S.arch.items.length : '…') : b.k === 'doing' ? workItems().length : b.k === 'todo' ? todoItems().filter(i => i.status === 'new' || i.runStatus === 'queued' || i.runStatus === 'running').length : all.filter(i => i.basket === b.k).length) + '</b>') + b.n + '</button>').join('');
  $('#tabs').hidden = !!m;
  if (!m) lanes.innerHTML = todayLane() + BASKETS.map(b => {
    const list = sortList(all.filter(i => i.basket === b.k));
    const body = loadingEmpty ? skel() + skel() + skel()
      : list.length ? list.map(card).join('')
      : '<div class="zero">' + IC.inbox + '<b>這一籃目前是空的</b><span>集集和金金找到新的，會自動出現在這裡。</span></div>';
    return '<section class="lane b-' + b.k + (S.tab === b.k ? ' cur' : '') + '" data-l="' + b.k + '"><div class="lh"><h2><i class="ld"></i>' + b.n + '' + (loadingEmpty ? '' : '<em>' + list.length + '</em>') + '</h2><p>' + b.d + '</p>' + scanLine(b.k) + '</div><div class="lbody">' + body + '</div></section>';
  }).join('') + doingLane() + todoLane() + archLane();
  lanes.querySelectorAll('.lane').forEach(l => { const b = l.querySelector('.lbody'); if (keep[l.dataset.l]) b.scrollTop = keep[l.dataset.l]; });
  if (fid) { const q = $('#' + fid); if (q) { q.focus(); try { q.setSelectionRange(q.value.length, q.value.length); } catch (e) {} } }
  if (hf) { const q = lanes.querySelector('[data-chat="' + CSS.escape(hf) + '"]'); if (q) { q.focus(); try { q.setSelectionRange(q.value.length, q.value.length); } catch (e) {} } }
  lanes.scrollLeft = left;
  const st = $('#tabs [aria-selected="true"]'); if (st && st.scrollIntoView) st.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  S.fresh.clear();
  edgeFade();
}
function scanLine(k) {   // 立即掃描：重新整理小符號＋一行小字，和「上次掃描」同大小放一列（Borry 2026-11-16：畫面簡潔一點）
  if (!api || S.net === 'auth') return '';
  const s = S.scan[k] || {}, all = S.scan.all || {};
  const o = [s.open, all.open].filter(Boolean).sort((a, b) => b.at - a.at)[0];
  const l = [s.last, all.last].filter(Boolean).sort((a, b) => b.at - a.at)[0];
  const fresh = o && tnow() - o.at < 60e3;     // 叫完 60 秒內不能再按
  const btn = '<button class="scanb" data-act="scan" data-b="' + k + '" type="button"' + (fresh ? ' disabled' : '') + ' aria-label="立即掃描"><span aria-hidden="true">↻</span>立即掃描</button>';
  const info = o ? '已叫集集掃描（' + fmtClock(o.at) + '），約 5～15 分鐘' : l ? '上次 ' + fmtClock(l.at) + '，新增 ' + l.added + ' 張' : '';
  return '<p class="scanl' + (o ? ' wait' : '') + '">' + btn + (info ? '<span>' + info + '</span>' : '') + '</p>';
}
async function loadScan() { try { if (!api.scanStatus) return; const n = await api.scanStatus(); if (JSON.stringify(n) !== JSON.stringify(S.scan)) { S.scan = n; renderBoard(); } } catch (e) {} }
function edgeFade() {
  const l = $('#lanes'), b = $('#board'); if (!l) return;
  b.classList.toggle('sl', l.scrollLeft > 8);
  b.classList.toggle('sr', l.scrollWidth - l.clientWidth - l.scrollLeft > 8);
}

// ---------------- 畫面：待決區 ----------------
const holdItems = () => sortList(items().filter(i => i.status === 'snoozed'));
const doingItems = () => items().filter(i => i.status === 'doing').sort((a, b) => (a.deadline || Infinity) - (b.deadline || Infinity) || (b.decidedAt || 0) - (a.decidedAt || 0));   // 最急的在最上面（Borry 2026-11-16），沒截止日的排最後
const deliveredItems = () => items().filter(i => i.status === 'delivered').sort((a, b) => (a.expectedPayDate || '9999').localeCompare(b.expectedPayDate || '9999') || (b.deliveredAt || 0) - (a.deliveredAt || 0));   // 最快入帳的在上面
const paidItems = () => items().filter(i => i.status === 'paid').sort((a, b) => (b.paidAt || 0) - (a.paidAt || 0));
const goneItems = () => items().filter(i => i.status === 'dropped' || i.status === 'expired').slice(0, 50);

function pcard(it) {
  const lv = lvOf(it), id = esc(it.id);
  const rem = it.snoozeUntil;
  const remTxt = rem ? (rem > tnow() ? '提醒時間：' + fmtDate(rem) + '，由集集傳訊息給你' : '已到提醒時間，請決定要不要做') : '';
  return '<article class="pc" data-id="' + id + '" data-lvl="' + lv + '">' + '<div class="dt-tags" style="margin:0">' + chip(it) + demo(it) + '</div>' +
    '<h3 class="sb">' + softBreak(it.title) + '</h3><p class="st">' + (remTxt ? remTxt + '<br>' : '') + '<span data-cd="' + id + '" data-mode="line" data-lvl="' + lv + '">' + cdLine(it) + '</span></p>' +
    '<div class="pa"><button class="pd" data-act="del" data-id="' + id + '" type="button">刪掉</button><button class="pg" data-act="dive" data-id="' + id + '" type="button">深入了解</button><button class="pu" data-act="unstash" data-id="' + id + '" type="button">取消暫存</button></div></article>';
}
const LK = { pool: 'Pool', review: '內審', pay: '去領標付款', other: '連結' };
const linkOf = (it, k) => it.links.find(l => l.kind === k);
function payBtn(it, cls) {
  const p = linkOf(it, 'pay'); if (!p) return '';
  return '<a class="' + cls + '" href="' + esc(p.url) + '" target="_blank" rel="noopener noreferrer">' + esc(p.label || LK.pay) + (p.amount ? '（' + esc(p.amount) + '）' : '') + '</a>';
}
function filesHTML(it) {     // Pool／內審並排（Borry 2026-11-16：手機上兩個並列，不要變成兩行）；https 開連結，本機路徑可複製
  const ls = it.links.filter(l => l.kind === 'pool' || l.kind === 'review' || l.kind === 'other'); if (!ls.length) return '';
  return '<section class="files"><h3>檔案</h3><div class="flrow">' + ls.map(l => '<div class="fl" title="' + esc(l.label || LK[l.kind]) + '"><b>' + esc(LK[l.kind]) + '</b>' +
    (l.url ? '<a class="btn btn-ghost" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">開啟</a>'
           : '<button class="btn btn-ghost" data-act="copy-link" data-id="' + esc(it.id) + '" data-i="' + it.links.indexOf(l) + '" type="button">複製位置</button><small class="fp">' + esc(l.path) + '</small>') +
    '</div>').join('') + '</div>' + (ls.some(l => l.path) ? '<p class="dt-meta">本機路徑在手機上打不開，是給電腦用的。</p>' : '') + '</section>';
}
async function loadHistory(id) {
  try { if (!api.history) return; const h = await api.history(id); S.hist.set(id, h); if (S.drawer && S.drawer.id === id) renderDrawer(); } catch (e) {}
}
function bidBox(it) {      // 還沒說要做的卡也能領標：領標是拿詳細資料，不代表要做（Borry 2026-11-16）
  if (isWork(it) || !linkOf(it, 'pay')) return '';
  return '<section class="paybox"><h3>領標</h3><p>領標是先拿到詳細資料，不代表要做。AI 做到付款頁就停，付款那一下要你本人來。</p>' + payBtn(it, 'btn btn-primary') + '</section>';
}
function histHTML(it) {     // 誰、什麼時候、做了什麼
  const h = S.hist.get(it.id); if (!h || !h.length) return '';
  return '<section class="dt-sec hist"><h3>紀錄</h3><ul>' + h.map(e => '<li><time>' + esc(fmtClock(e.at)) + '</time><span><b>' + esc(e.actor) + '</b>' + esc(e.action) + '</span></li>').join('') + '</ul></section>';
}
const RES = { won: '得標／核定', lost: '未得標', submitted: '已送件結案', void: '作廢（做一半不要了）' };
function closeBox(it) {
  if (!isWork(it)) return '';
  if (it.basket === 'todo') return '<section class="closebox"><h3>收尾</h3><p>做完或不要了，就收進封存區。</p><div class="cb">' +
    '<button class="btn btn-ghost" data-act="close" data-r="submitted" data-id="' + esc(it.id) + '" type="button">完成</button>' +
    '<button class="btn btn-ghost del" data-act="close" data-r="void" data-id="' + esc(it.id) + '" type="button">不做了</button></div></section>';
  return '<section class="closebox"><h3>結案</h3><p>做完或不做了，就收進封存區，以後找檔案從封存區找。</p><div class="cb">' +
    Object.keys(RES).map(k => '<button class="btn btn-ghost' + (k === 'void' ? ' del' : '') + '" data-act="close" data-r="' + k + '" data-id="' + esc(it.id) + '" type="button">' + RES[k] + '</button>').join('') +
    '<button class="btn btn-ghost del purge" data-act="purge" data-id="' + esc(it.id) + '" type="button">徹底刪除（不進封存區）</button></div></section>';
}
function arow(it) {
  const id = esc(it.id), d = it.closedAt ? fmtDate(it.closedAt) : '';
  return '<article class="pc arow" data-aid="' + id + '"><div class="dt-tags" style="margin:0">' + chip(it) + '<span class="rbadge r-' + esc(it.closeResult) + '">' + esc(it.basket === 'todo' ? (it.closeResult === 'void' ? '不做了' : '完成') : RES[it.closeResult] || '已結案') + '</span></div>' +
    '<h3 class="sb">' + softBreak(it.title) + '</h3><p class="st">' + (it.org ? esc(it.org) + '<br>' : '') + (d ? '結案：' + d : '') + (it.folderName ? '<br>資料夾：' + esc(it.folderName) : '') + '</p>' +
    filesHTML(it) + '<div class="pa"><button data-act="reopen" data-id="' + id + '" type="button">放回進行中</button><button class="pd" data-act="purge" data-id="' + id + '" type="button">徹底刪除</button></div></article>';
}
function archLane() {      // 封存欄：搜尋、篩年份、每列有 Pool／內審、可放回進行中或徹底刪除
  const a = S.arch;
  const yrs = '<select id="arch-year" aria-label="年份"><option value="">全部年份</option>' + a.years.map(y => '<option value="' + y + '"' + (String(y) === String(a.year) ? ' selected' : '') + '>' + y + '</option>').join('') + '</select>';
  const list = a.busy && !a.loaded ? '<p class="sheet-note"><span class="spin"></span>載入中</p>'
    : a.err ? '<div class="zero"><b>封存區讀不到</b><span>' + esc(a.err) + '</span><button class="btn btn-ghost" data-act="arch-reload" type="button">再試一次</button></div>'
    : a.items.length ? a.items.map(arow).join('')
    : '<div class="zero">' + IC.inbox + '<b>' + (a.q || a.year ? '找不到符合的案子' : '封存是空的') + '</b><span>進行中的案子按「結案」後會放在這裡。</span></div>';
  return '<section class="lane b-archive' + (S.tab === 'archive' ? ' cur' : '') + '" data-l="archive"><div class="lh"><h2><i class="ld"></i>' + ARCH.n + (a.loaded ? '<em>' + a.items.length + '</em>' : '') + '</h2><p>' + ARCH.d + '</p>' +
    '<div class="arch-f"><input id="arch-q" type="search" placeholder="搜案名、機關、資料夾" value="' + esc(a.q) + '" enterkeyhint="search">' + yrs + '</div></div>' +
    '<div class="lbody">' + list + '<p class="sheet-note">徹底刪除只刪面板上的資料，電腦裡的資料夾不會動。</p></div></section>';
}

// ---------------- 進行中、待辦、跟大器說（Borry 2026-11-17：公司版肉咖對話改成跟大器對話） ----------------
const WORDER = { doing: 0, delivered: 1, paid: 2 };
const workItems = () => items().filter(i => isWork(i) && i.basket !== 'todo').sort((a, b) => WORDER[a.status] - WORDER[b.status] || (a.deadline || Infinity) - (b.deadline || Infinity) || (b.decidedAt || 0) - (a.decidedAt || 0));
const todoItems = () => items().filter(i => i.basket === 'todo' && ['new', 'snoozed', 'doing', 'delivered', 'paid'].includes(i.status)).sort((a, b) => (a.status === 'new' ? 1 : 0) - (b.status === 'new' ? 1 : 0) || (b.foundAt || 0) - (a.foundAt || 0));
const RUN = { queued: '已交給大器，等 Mac 接手', running: '大器執行中', done: '大器做完了，等你看', failed: '大器卡住了，要你看一下' };
const stepDone = st => st.filter(x => x.status === 'done' || x.status === 'skipped').length;
function progressHTML(it, mini) {     // 進度步驟：做完幾步、現在哪一步、卡在哪
  const st = it.progressSteps, run = it.runStatus;
  if (!st.length && !it.progressNote && !it.progressBlocker && !run) return mini ? '' : '<section class="prog"><h3>進度</h3><p class="dt-meta">還沒有進度。跟大器說要做什麼，或按「去執行」，大器會把步驟寫在這裡。</p></section>';
  const n = stepDone(st), cur = st.find(x => x.status === 'current' || x.status === 'blocked');
  const bar = st.length ? '<div class="pbar" role="progressbar" aria-valuemin="0" aria-valuemax="' + st.length + '" aria-valuenow="' + n + '"><i style="width:' + Math.round(n / st.length * 100) + '%"></i></div>' : '';
  const runTxt = run ? '<span class="run r-' + esc(run) + '">' + (run === 'running' || run === 'queued' ? '<span class="spin"></span>' : '') + esc(RUN[run] || run) + '</span>' : '';
  if (mini) return '<div class="pmini">' + runTxt + (st.length ? bar + '<small>' + n + '／' + st.length + (cur ? '，' + esc(cur.name) : '') + '</small>' : '') + (it.progressBlocker ? '<small class="blk">卡住：' + esc(it.progressBlocker) + '</small>' : '') + '</div>';
  const ICS = { done: '✓', current: '▸', blocked: '!', skipped: '–', pending: '' };
  return '<section class="prog"><h3>進度</h3>' + runTxt + bar +
    (st.length ? '<ol class="steps">' + st.map(x => '<li class="s-' + esc(x.status) + '"><i aria-hidden="true">' + (ICS[x.status] || '') + '</i><span class="sbp">' + softBreak(x.name) + (x.note ? '<small>' + esc(x.note) + '</small>' : '') + '</span></li>').join('') + '</ol>' : '') +
    (it.progressNote ? '<p class="pnote sbp">' + softBreak(it.progressNote) + '</p>' : '') +
    (it.progressBlocker ? '<p class="pblk sbp"><b>卡住：</b>' + softBreak(it.progressBlocker) + '</p>' : '') +
    (it.runNote ? '<p class="dt-meta">' + esc(it.runNote) + '</p>' : '') +
    (it.progressUpdatedAt ? '<p class="dt-meta">' + esc(it.progressUpdatedBy || '大器') + ' 更新於 ' + fmtClock(it.progressUpdatedAt) + '</p>' : '') + '</section>';
}
function wcard(it) {
  const id = esc(it.id);
  const st = it.status === 'delivered' ? '已交件' + (it.expectedPayDate ? '，預計 ' + esc(it.expectedPayDate) + ' 入帳' : '，等收款')
    : it.status === 'paid' ? '已收款' + (it.receivedAmount != null ? ' ' + money(it.receivedAmount) : '')
    : it.deadline ? '<span data-cd="' + id + '" data-mode="line" data-lvl="' + lvOf(it) + '">' + cdLine(it) + '</span>' : (it.quoteAmount != null ? '報價 ' + money(it.quoteAmount) : '進行中');
  return '<article class="pc wk" data-id="' + id + '" data-lvl="' + lvOf(it) + '"><div class="dt-tags" style="margin:0">' + chip(it) + demo(it) + '</div><h3 class="sb">' + softBreak(it.title) + '</h3>' +
    '<p class="st">' + st + '</p>' + progressHTML(it, true) +
    '<div class="pa"><button data-act="chat" data-id="' + id + '" type="button">跟大器說</button><button class="pg" data-act="open-folder" data-id="' + id + '" type="button">案務與進度</button></div></article>';
}
// ---------------- 今天頁（通告板） ----------------
const HJ = { queued: '排隊中', running: '進行中', waiting_mac: '等 Mac 上線', waiting_you: '等你', done: '做完了', failed: '卡住了' };
function agoTxt(t) {
  if (!t) return '';
  const m = Math.max(0, Math.round((tnow() - t) / 60000));
  return m < 1 ? '剛剛' : m < 60 ? m + ' 分鐘前' : m < 1440 ? Math.round(m / 60) + ' 小時前' : Math.round(m / 1440) + ' 天前';
}
function hcard(d) {
  const id = esc(d.id), busy = S.hubBusy.has(d.id), note = S.chatDraft.get('hub:' + d.id) || '';
  const body = d.kind === 'talk'
    ? '<p class="hmeta">這件要你到對話裡回一句。付款、刪檔、對外發訊不在面板上按。' + (d.link ? ' <a href="' + esc(d.link) + '" target="_blank" rel="noopener noreferrer">開對話</a>' : '') + '</p>'
    : '<div class="hopts">' + d.options.map(o => '<button class="' + (o.recommended ? 'rec' : '') + '" data-act="hub-pick" data-id="' + id + '" data-k="' + esc(o.key) + '" type="button"' + (busy ? ' disabled' : '') + '>' +
        (o.recommended ? '<small>推薦</small>' : '') + '<span>' + esc(o.label) + '</span>' + (o.note ? '<em>' + esc(o.note) + '</em>' : '') + '</button>').join('') + '</div>' +
      '<div class="hnote"><textarea data-chat="hub:' + id + '" rows="2" maxlength="2000" placeholder="想補充，或你有別的做法，寫在這裡" aria-label="補充或別的做法">' + esc(note) + '</textarea>' +
      '<button class="btn btn-ghost" data-act="hub-other" data-id="' + id + '" type="button"' + (busy ? ' disabled' : '') + '>照我寫的做</button></div>';
  return '<article class="hc">' + (d.project ? '<span class="hproj">' + esc(d.project) + '</span>' : '') + '<h3 class="sb">' + softBreak(d.question) + '</h3>' +
    (d.detail ? '<details class="hd"><summary>看細節</summary><p class="sbp">' + para(d.detail) + '</p></details>' : '') +
    '<p class="hmeta">' + esc(d.askedBy || '大器') + ' 問的，' + esc(agoTxt(d.createdAt)) + (d.origin && d.origin !== '大器' ? '，來自' + esc(d.origin) : '') + '</p>' + body + '</article>';
}
function todayLane() {
  const h = S.hub, loadingEmpty = !h.loaded && !h.err;
  const beat = h.beats.length ? '<p class="hbeat">' + h.beats.map(b => '<span class="' + (b.late ? 'l' : 'k') + '">' + esc(b.name) + (b.late ? '：' + esc(agoTxt(b.lastAt)) + '之後沒再報到' : '：正常') + '</span>').join('') + '</p>' : '';
  const dec = loadingEmpty ? skel() + skel()
    : h.err && !h.loaded ? '<div class="zero"><b>今天頁讀不到</b><span>' + esc(h.err) + '</span></div>'
    : h.open.length ? h.open.map(hcard).join('')
    : '<div class="zero">' + IC.inbox + '<b>現在沒有要你決定的事</b><span>AI 做到只剩你能決定的時候，會出現在這裡。</span></div>';
  const act = h.jobs.filter(j => j.status !== 'done' && j.status !== 'failed');
  const jobs = act.length ? act.map(j => '<li><b>' + esc(j.agent) + '</b>' + (j.machine ? '<small>' + esc(j.machine) + '</small>' : '') + '<span>' + esc(j.title) + '</span><em class="j-' + j.status + '">' + HJ[j.status] + '</em></li>').join('')
    : '<li class="none">還沒有 AI 回報正在跑的工作。這一塊要等下一步把各個 AI 的開工、收工接進來。</li>';
  const ev = h.events.slice(0, 8).map(e => '<li><b>' + esc(e.actor) + '</b><small>' + esc(agoTxt(e.at)) + '</small><span>' + esc(e.summary) + '</span></li>').join('');
  const ans = h.answered.length ? '<details class="hans"' + (S.hubAnsOpen ? ' open' : '') + '><summary>你回過的 ' + h.answered.length + ' 件（最近七天）</summary>' +
    h.answered.map(d => '<div class="ha"><p class="sbp">' + softBreak(d.question) + '</p><p class="hmeta">你選：<b>' + esc(d.answerLabel) + '</b>' + (d.answerNote ? '，補充：' + esc(d.answerNote) : '') + (d.answerVia ? '。你在 ' + esc(d.answerVia) + ' 說的，大器代記' + (d.answerQuote ? '，原話「' + esc(d.answerQuote) + '」' : '') : '') + '，' + esc(agoTxt(d.answeredAt)) + (d.pickedUp ? '，大器已收到' : '，等大器收') + '</p>' +
      '<button class="btn btn-ghost" data-act="hub-undo" data-id="' + esc(d.id) + '" type="button"' + (S.hubBusy.has(d.id) ? ' disabled' : '') + '>收回，重新決定</button></div>').join('') + '</details>' : '';
  return '<section class="lane b-today' + (S.tab === 'today' ? ' cur' : '') + '" data-l="today"><div class="lh"><h2><i class="ld"></i>' + TODAY.n + (h.loaded ? '<em>' + h.open.length + '</em>' : '') + '</h2><p>' + TODAY.d + '</p>' + beat + '</div>' +
    '<div class="lbody"><h3 class="hh">等你決定</h3>' + dec + ans + '<h3 class="hh">正在跑</h3><ul class="hl">' + jobs + '</ul>' + (ev ? '<h3 class="hh">最近做完</h3><ul class="hl">' + ev + '</ul>' : '') + '</div></section>';
}
async function loadHub() {
  if (!api.hubToday) return;
  try {
    const h = await api.hubToday(), s0 = JSON.stringify([S.hub.open, S.hub.answered, S.hub.jobs, S.hub.events, S.hub.beats, S.hub.loaded]);
    S.hub = Object.assign({}, h, { loaded: true, err: '' });
    if (JSON.stringify([S.hub.open, S.hub.answered, S.hub.jobs, S.hub.events, S.hub.beats, true]) !== s0) renderBoard();
  } catch (e) { if (!S.hub.loaded) { S.hub.err = e instanceof AdapterError ? (e.kind === 'network' || e.kind === 'offline' ? '連不上伺服器' : '這把金鑰讀不到今天頁') : '發生錯誤'; renderBoard(); } }
}
async function hubAnswer(id, k) {
  if (S.hubBusy.has(id)) return;
  const d = S.hub.open.concat(S.hub.answered).find(x => x.id === id); if (!d) return;
  const note = (S.chatDraft.get('hub:' + id) || '').trim();
  if (k === '_other' && !note) { toast('先在上面寫一句你要怎麼做', { bad: true }); return; }
  S.hubBusy.add(id); renderBoard();
  try {
    await api.hubAnswer(id, k, k === null ? null : (note || null));
    if (k !== null) S.chatDraft.delete('hub:' + id);
    toast(k === null ? '已收回，放回等你決定' : '記下了');
    await loadHub();
  } catch (e) { toast(e instanceof AdapterError && e.kind === 'forbidden' ? '這把金鑰不能替你回答，請用你自己的網址開' : '沒存上，再按一次', { bad: true }); }
  finally { S.hubBusy.delete(id); renderBoard(); }
}

function doingLane() {
  const list = workItems(), loadingEmpty = !S.hadData && S.net === 'loading';
  const form = '<form class="addf" data-form="work"><input id="work-in" type="text" maxlength="200" placeholder="記一個手上的案子（案名）" aria-label="記一個手上的案子" enterkeyhint="done"><button class="btn btn-primary" type="submit">記下來</button></form>';
  const body = loadingEmpty ? skel() + skel() : list.length ? list.map(wcard).join('')
    : '<div class="zero">' + IC.inbox + '<b>還沒有進行中的案子</b><span>機會按「要做」、或在上面記一個手上的案子，就會出現在這裡。大器每天也會整理一次。</span></div>';
  return '<section class="lane b-doing' + (S.tab === 'doing' ? ' cur' : '') + '" data-l="doing"><div class="lh"><h2><i class="ld"></i>' + DOING.n + (loadingEmpty ? '' : '<em>' + list.length + '</em>') + '</h2><p>' + DOING.d + '</p>' + form + '</div><div class="lbody">' + body + '</div></section>';
}
function tcard(it) {
  const id = esc(it.id), run = it.runStatus, busy = run === 'queued' || run === 'running', fin = it.status !== 'new' && it.status !== 'snoozed';
  return '<article class="pc td" data-id="' + id + '"><h3 class="sb">' + softBreak(it.title) + '</h3>' + (it.why ? '<p class="st sbp">' + softBreak(it.why) + '</p>' : '') +
    progressHTML(it, true) +
    '<div class="pa">' + (fin ? '' : '<button class="pd" data-act="del" data-id="' + id + '" type="button">刪掉</button>') +
    '<button data-act="chat" data-id="' + id + '" type="button">跟大器說</button>' +
    (busy ? '' : '<button class="pg" data-act="run" data-id="' + id + '" type="button">' + (run === 'done' || run === 'failed' ? '再執行一次' : '去執行') + '</button>') + '</div></article>';
}
function todoLane() {
  const list = todoItems(), loadingEmpty = !S.hadData && S.net === 'loading';
  const d = S.chatDraft.get('todo:new') || '';
  const form = '<form class="addf" data-form="todo"><input id="todo-in" type="text" maxlength="300" placeholder="要請 AI 做什麼（例如：建一個報價單產生器）" aria-label="新增待辦" value="' + esc(d) + '" enterkeyhint="done"><button class="btn btn-primary" type="submit">新增</button></form>';
  const body = loadingEmpty ? skel() : list.length ? list.map(tcard).join('')
    : '<div class="zero">' + IC.inbox + '<b>沒有待辦</b><span>在上面打一句要 AI 做的事，按「去執行」大器就開一個子視窗跑，進度會寫回這張卡。</span></div>';
  return '<section class="lane b-todo' + (S.tab === 'todo' ? ' cur' : '') + '" data-l="todo"><div class="lh"><h2><i class="ld"></i>' + TODO.n + (loadingEmpty ? '' : '<em>' + list.length + '</em>') + '</h2><p>' + TODO.d + '</p>' + form + '</div><div class="lbody">' + body + '</div></section>';
}
const chatKey = id => id || '';
function msgsHTML(k) {
  const m = S.msgs.get(k);
  if (!m || (!m.items && m.busy)) return '<p class="dt-meta"><span class="spin"></span>載入中</p>';
  if (m.err && !m.items) return '<p class="dt-meta">讀不到對話：' + esc(m.err) + '</p>';
  const list = m.items || [];
  if (!list.length) return '<p class="dt-meta">還沒有對話。' + (k ? '這張卡的事直接說，大器會照這張卡去做、去查。' : '面板上的事、要找什麼機會、要整理什麼，直接說。') + '</p>';
  const last = list[list.length - 1], waiting = last.kind === 'user' || last.kind === 'run';
  return list.map(x => '<div class="msg m-' + esc(x.kind) + '"><p class="sbp">' + softBreak(x.body) + '</p><time>' + esc(x.kind === 'daqi' ? '大器' : x.kind === 'run' ? '去執行' : x.kind === 'system' ? '系統' : '你') + '・' + esc(fmtClock(x.at)) + '</time></div>').join('') +
    (waiting ? '<p class="dt-meta wait"><span class="spin"></span>大器收到後會回在這裡，通常 1～3 分鐘；Mac 睡著時會等醒來再回。</p>' : '');
}
function chatHTML(id) {
  const k = chatKey(id), v = S.chatDraft.get(k) || '';
  return '<section class="chat" data-k="' + esc(k) + '"><h3>跟大器說</h3><div class="msgs" data-msgs="' + esc(k) + '">' + msgsHTML(k) + '</div>' +
    '<div class="cin"><textarea rows="2" maxlength="4000" data-chat="' + esc(k) + '" aria-label="跟大器說" placeholder="' + (id ? '這張卡要大器做什麼、查什麼' : '要大器做什麼都可以說') + '">' + esc(v) + '</textarea>' +
    '<button class="btn btn-primary" data-act="chat-send" data-id="' + esc(k) + '" type="button"' + (S.sending.has(k) ? ' disabled' : '') + '>送出</button></div>' +
    '<p class="dt-meta">付款、對外發訊、刪檔這類事，大器會先問你，不會自己做。</p></section>';
}
function paintMsgs(k) { document.querySelectorAll('[data-msgs="' + CSS.escape(k) + '"]').forEach(b => { const end = b.scrollHeight - b.scrollTop - b.clientHeight < 40; b.innerHTML = msgsHTML(k); if (end) b.scrollTop = b.scrollHeight; }); }
async function loadMsgs(id) {
  const k = chatKey(id); if (!api || !api.msgs) return;
  const m = S.msgs.get(k) || {}; if (m.busy) return; m.busy = true; S.msgs.set(k, m);
  try { const list = await api.msgs(id || null); const same = m.items && JSON.stringify(m.items) === JSON.stringify(list); m.items = list; m.err = ''; if (!same) paintMsgs(k); }
  catch (e) { m.err = reason(e); if (!m.items) paintMsgs(k); }
  finally { m.busy = false; }
}
async function sendMsg(k) {
  const v = (S.chatDraft.get(k) || '').trim(); if (!v || S.sending.has(k)) return;
  S.sending.add(k); const btn = document.querySelector('[data-act="chat-send"][data-id="' + CSS.escape(k) + '"]'); if (btn) btn.disabled = true;
  try { await api.say(k || null, v); S.chatDraft.delete(k); document.querySelectorAll('[data-chat="' + CSS.escape(k) + '"]').forEach(t => { t.value = ''; }); toast('已經跟大器說了'); }
  catch (e) { toast('沒有送出：' + reason(e), { bad: true }); }
  finally { S.sending.delete(k); if (btn) btn.disabled = false; await loadMsgs(k); const b = document.querySelector('[data-msgs="' + CSS.escape(k) + '"]'); if (b) b.scrollTop = b.scrollHeight; }
}
function openChat(id) {      // 有卡片就開卡片抽屜並捲到對話；沒有就開整個面板的對話
  if (id) { const it = get(id); if (!it) return; openDrawer(id, isWork(it) || it.basket === 'todo' ? 'folder' : 'full'); }
  else { if (!S.drawer) lastFocus = document.activeElement; S.drawer = { id: '', view: 'chat' }; renderDrawer(); syncOverlay(); }
  loadMsgs(id);
  setTimeout(() => { const c = document.querySelector('#drawer .chat'); if (c && id) c.scrollIntoView({ block: 'start' }); const t = document.querySelector('#drawer [data-chat]'); if (t) t.focus({ preventScroll: !!id }); }, 60);
}
function actRun(id) {
  const it = get(id); if (!it) return;
  mutate(id, 'run', '已交給大器：「' + nm(it) + '」，進度會寫在這張卡').then(ok => { if (ok) loadMsgs(id); });
}
async function addForm(kind, input) {
  const v = input.value.trim(); if (!v) { input.focus(); return; }
  input.disabled = true;
  try {
    const c = kind === 'todo' ? await api.todoAdd(v) : await api.workAdd(v);
    if (c) S.items.set(c.id, c);
    input.value = ''; if (kind === 'todo') S.chatDraft.delete('todo:new');
    toast(kind === 'todo' ? '已新增待辦，要大器開跑就按「去執行」' : '已記下「' + nm(c || { title: v }) + '」，點開可以填案務');
    saveSnapshot(); renderAll();
  } catch (e) { toast('沒有加成：' + reason(e), { bad: true }); }
  finally { input.disabled = false; }
}
function renderArchive() { renderBoard(); }
let archT;
async function loadArchive() {
  const a = S.arch; a.busy = true; a.err = '';
  try { const r = await api.archive(a.q, a.year); a.items = r.items; a.years = r.years; a.loaded = true; }
  catch (e) { a.err = reason(e); if (e instanceof AdapterError && e.kind === 'auth') S.net = 'auth'; }
  finally { a.busy = false; renderBoard(); }
}
async function archAct(id, action, opt, okMsg) {
  try { await api.act(id, action, opt); toast(okMsg); if (action === 'purge') { S.items.delete(id); if (S.drawer && S.drawer.id === id) closeDrawer(true); renderAll(); } await loadArchive(); refresh(); }
  catch (e) { toast('沒有成功：' + reason(e), { bad: true }); }
}
const folderState = it => it.folderStatus === 'done' ? 'done' : it.folderStatus === 'failed' ? 'failed' : 'wait';
function dcard(it) {
  const id = esc(it.id), fs = folderState(it);
  let st = fs === 'done' ? (isOld(it) ? '既有案，沒有建資料夾' : '工作資料夾建好了') : fs === 'failed' ? '資料夾沒建成，請找通通' : '<span class="spin"></span>' + (it.folderStatus === 'building' ? '正在建立工作資料夾' : '已排隊，等 Mac 接工作');
  if (it.status === 'delivered') st = '已交件' + (it.deliveryDate ? '（' + esc(it.deliveryDate) + '）' : '') + '，' + (it.expectedPayDate ? '預計 ' + esc(it.expectedPayDate) + ' 入帳' : '等收款');
  if (it.status === 'paid') st = '已收款' + (it.receivedAmount != null ? ' ' + money(it.receivedAmount) : '') + (it.paidAt ? '，' + fmtClock(it.paidAt) : '');
  return '<article class="pc' + (fs === 'done' && it.status === 'doing' ? ' done' : '') + '" data-id="' + id + '">' + '<div class="dt-tags" style="margin:0">' + chip(it) + demo(it) + '</div><h3 class="sb">' + softBreak(it.title) + '</h3>' +
    '<p class="st">' + st + '</p><div class="pa">' + payBtn(it, 'pp') + '<button class="pg" data-act="open-folder" data-id="' + id + '" type="button">' + (it.status !== 'doing' || isOld(it) ? '看案務' : fs === 'done' ? '看資料夾位置' : '看進度') + '</button></div></article>';
}
const goneWhy = it => it.dropReason === 'deleted' ? '你刪掉的' : it.dropReason === 'skipped' ? '你決定不做的' : '時間到，自動收走';
function gcard(it) {
  const id = esc(it.id);
  const past = it.deadline && it.deadline <= tnow();
  const d = S.draft.get(it.id), note = d && d.drop_note != null ? d.drop_note : (it.dropNote || '');
  return '<article class="pc" data-id="' + id + '"><h3 class="sb">' + softBreak(it.title) + '</h3><p class="st">' + goneWhy(it) + (past ? '<br>截止已過，救不回來' : '') + '</p>' +
    '<div class="dnote"><textarea rows="2" data-wf="drop_note" data-id="' + id + '" aria-label="收走的原因" placeholder="為什麼收走（自己記，之後回頭看）">' + esc(note) + '</textarea>' +
    '<button class="btn btn-ghost" data-act="save-note" data-id="' + id + '" type="button">存原因</button></div>' +
    (past ? '' : '<div class="pa"><button data-act="restore" data-id="' + id + '" type="button">救回來</button></div>') + '</article>';
}
function renderSheet() {
  const h = holdItems(), d = doingItems().filter(i => i.basket !== 'todo'), dv = deliveredItems(), pd = paidItems(), g = goneItems();
  $('#hpill').hidden = $('#holdbtn').hidden = S.net === 'auth';
  $('#holdbtn').innerHTML = '待決區<b>' + h.length + '</b>';
  $('#hpill').innerHTML = '待決區<b>' + h.length + '</b>';
  const sh = $('#sheet'); const sc = sh.querySelector('.db') ? sh.querySelector('.db').scrollTop : 0;
  if (editing(sh)) { sh.classList.toggle('show', S.sheet); return; }   // 正在填「收走原因」：輪詢不重畫，免得字不見
  let body = '';
  if (!h.length) body += '<div class="zero"><b>沒有暫存的機會</b><span>按「暫存」的機會會放在這裡，到時候 iPhone 提醒事項會提醒你。</span></div>';
  if (h.length) body += '<p class="grp">暫存中，' + h.length + ' 筆</p>' + h.map(pcard).join('');
  if (d.length + dv.length + pd.length) body += '<p class="sheet-note">要做、已交件、已收款的案子在「進行中」那一欄。<button class="btn btn-ghost" data-act="go-doing" type="button">看進行中</button></p>';
  if (g.length) body += '<details class="gone"' + (S.goneOpen ? ' open' : '') + '><summary>剛收走的，' + g.length + ' 筆，72 小時內可以救回來</summary>' + g.map(gcard).join('') + '</details>';
  body += '<p class="sheet-note">提醒由集集傳訊息給你，網頁自己不會跳通知。</p>';
  sh.innerHTML = '<div class="dh"><span>待決區</span><button class="xb" data-act="close-hold" type="button" aria-label="關閉待決區">×</button></div><div class="db">' + body + '</div>';
  sh.querySelector('.db').scrollTop = sc;
  sh.classList.toggle('show', S.sheet);
}

// ---------------- 畫面：詳細資料抽屜 ----------------
function viewOf() {
  if (S.drawer && S.drawer.view === 'chat') return 'chat';
  const it = S.drawer && get(S.drawer.id); if (!it) return null;
  return isWork(it) || it.basket === 'todo' ? 'folder' : S.drawer.view;
}
function statBlock(it) {
  const t = target(it), lv = lvOf(it);
  const lab = t.kind === 'dl' ? '距離截止' : t.kind === 'ttl' ? '沒處理就收走' : '截止日';
  const dtx = esc(it.deadlineText || (it.deadline ? fmtDate(it.deadline) : ''));
  const small = t.kind === 'dl' ? dtx : t.kind === 'ttl' ? (it.deadline ? '截止 ' + dtx : (dtx || '預計 ' + fmtDate(it.expiresAt) + ' 收走')) : '來源沒寫';
  return '<div class="dt-stats"><div class="dt-stat">' + amt(it) + '</div><div class="dt-stat"><em>' + lab + '</em><span class="dt-cd" data-cd="' + esc(it.id) + '" data-lvl="' + lv + '">' + cdFull(it) + '</span><small>' + small + '</small></div></div>';
}
function head(it) { return '<header><div class="dt-tags">' + chip(it) + demo(it) + '</div><h2 class="sb">' + softBreak(it.title) + '</h2>' + orgLine(it) + '</header>'; }
const warnBox = (w, n) => w.length ? '<section class="dt-warn"><h3>要注意</h3><ul>' + w.slice(0, n || 9).map(x => '<li class="sbp">' + softBreak(x) + '</li>').join('') + '</ul></section>' : '';
const firstBox = it => it.firstStep ? '<section class="dt-first"><h3>第一步</h3><p class="sbp">' + softBreak(it.firstStep) + '</p></section>' : '';
const metaLine = it => '<p class="dt-meta">' + (it.foundBy ? '由 ' + esc(it.foundBy) + ' 找到' : '') + (it.sourceSite ? (it.foundBy ? '，' : '') + '來源 ' + esc(it.sourceSite) : '') + (it.foundAt ? '，' + fmtClock(it.foundAt) + ' 進來' : '') + '</p>';

function previewHTML(it) {
  const rem = it.status === 'snoozed' ? it.snoozeUntil : null;
  return '<div class="dt">' + head(it) + statBlock(it) +
    (it.why ? '<p class="dt-why sbp">' + softBreak(it.why) + '</p>' : '') +
    (it.quick.length ? '<ul class="pv-list">' + it.quick.map(x => '<li class="sbp">' + softBreak(x) + '</li>').join('') + '</ul>' : '') +
    warnBox(it.warn, 1) + firstBox(it) + bidBox(it) +
    (rem ? '<p class="dt-meta">暫存中，' + (rem > tnow() ? fmtDate(rem) + ' 集集會傳訊息提醒你' : '已到提醒時間') + '</p>' : '') + metaLine(it) + '</div>';
}
function crawlHTML(it) {
  const id = esc(it.id);
  if (it.detailText) {
    const open = S.textOpen.has(it.id);
    const att = it.attachments.length ? '<details class="att"><summary>附件 ' + it.attachments.length + ' 個</summary><ul>' + it.attachments.map(a => '<li><a href="' + esc(a.url) + '" target="_blank" rel="noopener noreferrer">' + esc(a.name || a.url) + '</a></li>').join('') + '</ul></details>' : '';   // 附件預設收合
    return '<section class="dt-sec dt-text"><h3>公告全文</h3><div class="txt' + (open ? ' open' : '') + '">' + para(it.detailText) + '</div>' +
      '<button class="more" data-act="toggle-text" data-id="' + id + '" type="button">' + (open ? '收合全文' : '展開全文') + '</button>' + att + '</section>';
  }
  const d = S.detail.get(it.id), st = it.crawlStatus;
  if (d && d.timedOut && !d.busy) {
    return '<section class="dt-crawl fail"><div><b>讀全文逾時</b><small>已經等超過 60 秒，還沒讀完。上面的條件還可以看。要全文的話，可以再讀一次' + (it.sourceUrl ? '，或開原始連結' : '') + '。</small></div><div class="acts">' +
      '<button class="btn btn-primary" data-act="retry-detail" data-id="' + id + '" type="button">再讀一次</button>' +
      (it.sourceUrl ? '<a class="btn btn-ghost" href="' + esc(it.sourceUrl) + '" target="_blank" rel="noopener noreferrer">開原始連結</a>' : '') + '</div></section>';
  }
  if (st === 'failed' && !(d && d.busy)) {
    if (!it.sourceUrl) return '<section class="dt-crawl fail"><div><b>沒有全文</b><small>這張卡沒有來源網址，讀不到全文。上面的條件是集集和金金整理的。</small></div></section>';
    return '<section class="dt-crawl fail"><div><b>抓取失敗，開原始連結</b><small>' + esc(it.crawlError || '沒有抓到全文') + '。上面的條件是集集和金金整理的，全文要自己開連結看。</small></div><div class="acts">' +
      '<a class="btn btn-primary" href="' + esc(it.sourceUrl) + '" target="_blank" rel="noopener noreferrer">開原始連結</a>' +
      '<button class="btn btn-ghost" data-act="retry-detail" data-id="' + id + '" type="button">再讀一次</button></div></section>';
  }
  const t0 = d && d.t0 || tnow();
  const sec = Math.floor((tnow() - t0) / 1000);
  return '<section class="dt-crawl wait" aria-live="polite"><div class="row"><span class="spin" aria-hidden="true"></span><div><b>正在讀全文</b><small>已等 <span data-elapsed="' + id + '">' + sec + '</span> 秒，<span data-elapsed-hint="' + id + '">' + crawlHint(sec) + '</span></small></div></div><div class="crawl-sk" aria-hidden="true"><i class="sk"></i><i class="sk"></i><i class="sk"></i></div></section>';
}
function crawlHint(sec) {
  return sec > 10
    ? '比平常久，再等一下；超過 60 秒會停止。讀完會自動出現在這裡，你也可以先看上面的條件。'
    : '通常 2 到 10 秒。讀完會自動出現在這裡，你也可以先看上面的條件。';
}
function fullHTML(it) {
  const facts = it.facts.length ? '<section class="dt-sec"><h3>完整條件</h3><ul class="dt-list">' + it.facts.map(f => {
    const m = f.match(/^([^：]{1,14})：([\s\S]+)$/);
    return m ? '<li><b>' + esc(m[1]) + '</b><span class="sbp">' + softBreak(m[2]) + '</span></li>' : '<li><span class="sbp">' + softBreak(f) + '</span></li>';
  }).join('') + '</ul></section>' : '';
  return '<div class="dt">' + head(it) + statBlock(it) +
    (it.why ? '<div><p class="dt-why sbp">' + softBreak(it.why) + '</p>' + (it.fit || it.honor ? '<p class="dt-fit">' + (it.fit ? '契合度 <b>' + esc(it.fit) + '</b>' : '') + (it.honor ? '導演地位 <b>' + esc(it.honor) + '</b>' : '') + '</p>' : '') + '</div>' : '') +
    warnBox(it.warn) + bidBox(it) + crawlHTML(it) + firstBox(it) + facts +
    '<section class="dt-sec dt-src"><h3>來源</h3>' + metaLine(it) + link(it) + '</section>' + chatHTML(it.id) + histHTML(it) + '</div>';
}
// ---------------- 案務：報價、收款、職涯欄位（doing／delivered／paid 的抽屜） ----------------
// 欄位名稱照後端 opp_work_update 的 p_patch；career.* 是合併寫入，空白＝移除該鍵。
const LINES = ['公司正職', '個人導演', 'nightdesk 標案代寫', 'AI 影片與比賽', '教學授權'];
const WF = [   // [後端鍵, 前端屬性, 標題, 型別, 寬]
  ['quote_amount', 'quoteAmount', '報價', 'num'], ['signed', 'signed', '簽約', 'yn'],
  ['deposit_amount', 'depositAmount', '訂金', 'num'], ['deposit_date', 'depositDate', '訂金入帳日', 'date'],
  ['final_amount', 'finalAmount', '尾款', 'num'], ['final_due', 'finalDue', '尾款到期', 'date'],
  ['delivery_date', 'deliveryDate', '交件日', 'date'], ['expected_pay_date', 'expectedPayDate', '預計入帳日', 'date'],
  ['received_amount', 'receivedAmount', '實收金額', 'num'], ['payment_terms', 'paymentTerms', '付款條件', 'text', 1],
];
const CF = [   // career 內的鍵
  ['line', '路線', 'sel', 0, LINES], ['public_identity', '對外掛名', 'text'], ['referrer', '介紹人', 'text'],
  ['status_gain', '地位加分', 'sel', 0, ['高', '中', '低']], ['conflicts_haoka', '跟好咖衝突', 'yn'],
  ['status_gain_note', '地位加分說明', 'text', 1], ['rights', '權利歸屬', 'text', 1],
  ['est_hours', '預估工時（小時）', 'num'], ['actual_hours', '實際工時（小時）', 'num'],
  ['advance_amount', '代墊金額', 'num'], ['advance_recovered_date', '代墊收回日', 'date'],
  ['tax_withheld', '扣繳 10%＋二代健保', 'tax'], ['kim_judgment', '金金的判斷', 'area', 1],
];
const WK = WF.map(f => f[0]), CK = CF.map(f => 'c.' + f[0]);
const curStr = (it, k) => {        // 後端現在的值 → 輸入框字串
  let v;
  if (k.startsWith('c.')) v = (it.career || {})[k.slice(2)];
  else { const f = WF.find(x => x[0] === k); v = f ? it[f[1]] : it[k]; }
  return v == null ? '' : typeof v === 'boolean' ? String(v) : String(v);
};
const valStr = (it, k) => { const d = S.draft.get(it.id); return d && d[k] != null ? d[k] : curStr(it, k); };
function fieldHTML(it, k, label, type, wide, opts) {
  const id = esc(it.id), v = valStr(it, k), a = ' data-wf="' + esc(k) + '" data-id="' + id + '" aria-label="' + esc(label) + '"';
  let inp;
  if (type === 'num') inp = '<input type="number" inputmode="decimal" min="0" step="any"' + a + ' value="' + esc(v) + '">';
  else if (type === 'date') inp = '<input type="date"' + a + ' value="' + esc(v) + '">';
  else if (type === 'area') inp = '<textarea rows="3"' + a + '>' + esc(v) + '</textarea>';
  else if (type === 'text') inp = '<input type="text"' + a + ' value="' + esc(v) + '">';
  else {
    const o = type === 'yn' ? [['', '沒填'], ['true', '是'], ['false', '否']] : type === 'tax' ? [['', '沒填（照預設會扣）'], ['true', '會扣'], ['false', '不扣']]
      : [['', '沒填']].concat(opts.map(x => [x, x]));
    if (type === 'sel' && v && !opts.includes(v)) o.push([v, v]);
    inp = '<select' + a + '>' + o.map(([ov, ot]) => '<option value="' + esc(ov) + '"' + (ov === v ? ' selected' : '') + '>' + esc(ot) + '</option>').join('') + '</select>';
  }
  return '<label class="wf' + (wide ? ' w' : '') + '"><span>' + esc(label) + '</span>' + inp + '</label>';
}
function dirty(it) { const d = S.draft.get(it.id); return !!d && Object.keys(d).some(k => k !== 'drop_note' && d[k] !== curStr(it, k)); }
function earnHTML(it) {
  const e = it.earnings;
  if (!e || e.net == null) return '<div class="earn"><p class="dt-meta">還沒有金額，填了報價、訂金尾款或實收，存檔後會算出實拿與時薪。</p></div>';
  const basis = e.basis === 'received' ? '實收' : '預估';
  const parts = [money(e.gross) + '（' + (e.basis === 'received' ? '實收' : '照報價／訂金＋尾款預估') + '）'];
  if (e.withholding) parts.push('扣繳 ' + money(e.withholding)); if (e.nhi) parts.push('二代健保 ' + money(e.nhi)); if (e.advance) parts.push('代墊 ' + money(e.advance));
  return '<div class="earn"><div class="dt-stats"><div class="dt-stat"><em>實拿（' + basis + '）</em><b>' + esc(money(e.net)) + '</b></div>' +
    '<div class="dt-stat"><em>時薪' + (e.hourly != null ? '（' + (e.hoursBasis === 'actual' ? '實際工時' : '預估工時') + '）' : '') + '</em><b>' + (e.hourly != null ? esc(money(e.hourly)) : '—') + '</b>' +
    (e.hourly != null ? '<small>' + esc(String(e.hours)) + ' 小時</small>' : '<small>填工時後才算</small>') + '</div></div>' +
    '<p class="dt-meta">' + esc(parts.join('，')) + '。' + (dirty(it) ? '有還沒存的修改，存檔後重算。' : '') + '</p></div>';
}
function workHTML(it) {
  const id = esc(it.id), st = it.status;
  const btns = '<button class="btn btn-ghost" data-act="save-work" data-id="' + id + '" type="button">存檔</button>' +
    (st === 'doing' ? '<button class="btn btn-primary" data-act="deliver" data-id="' + id + '" type="button">交件</button>' : '') +
    (st === 'delivered' ? '<button class="btn btn-primary" data-act="paid" data-id="' + id + '" type="button">已收款</button><button class="btn btn-ghost back" data-act="back" data-to="doing" data-id="' + id + '" type="button">退回進行中</button>' : '') +
    (st === 'paid' ? '<button class="btn btn-ghost back" data-act="back" data-to="delivered" data-id="' + id + '" type="button">退回已交件</button>' : '');
  const stTxt = st === 'delivered' ? '已交件' + (it.deliveryDate ? '，交件日 ' + esc(it.deliveryDate) : '') + '。收到錢後先填「實收金額」再按「已收款」。'
    : st === 'paid' ? '已收款' + (it.paidAt ? '，' + fmtDate(it.paidAt) : '') + '。' : '做完交給對方就按「交件」，沒填交件日會記成今天。';
  return '<section class="work"><h3>案務</h3><p class="dt-meta">' + stTxt + '</p>' + earnHTML(it) +
    '<div class="wg">' + WF.map(f => fieldHTML(it, f[0], f[2], f[3], f[4])).join('') + '</div>' +
    '<details class="wc"' + (S.careerOpen && S.careerOpen.has(it.id) ? ' open' : '') + ' data-id="' + id + '"><summary>職涯與工時</summary><div class="wg">' + CF.map(f => fieldHTML(it, 'c.' + f[0], f[1], f[2], f[3], f[4])).join('') + '</div></details>' +
    '<div class="wb">' + btns + '</div></section>';
}
// 草稿 → p_patch（只送有改的欄位）。格式不對回傳 {bad: 欄位}
function buildPatch(it) {
  const d = S.draft.get(it.id) || {}, patch = {}, career = {};
  for (const k of Object.keys(d)) {
    if (k === 'drop_note' || d[k] === curStr(it, k)) continue;
    const ck = k.startsWith('c.') ? k.slice(2) : null;
    const f = ck ? CF.find(x => x[0] === ck) : WF.find(x => x[0] === k); if (!f) continue;
    const type = ck ? f[2] : f[3], raw = String(d[k]).trim();
    let v;
    if (raw === '') v = null;
    else if (type === 'num') { v = Number(raw); if (!Number.isFinite(v) || v < 0) return { bad: k, label: ck ? f[1] : f[2] }; }
    else if (type === 'yn' || type === 'tax') v = raw === 'true';
    else if (type === 'date') { if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { bad: k, label: ck ? f[1] : f[2] }; v = raw; }
    else v = raw;
    if (ck) career[ck] = v; else patch[k] = v;
  }
  if (Object.keys(career).length) patch.career = career;
  return { patch };
}
function markBad(id, k, msg) {
  toast(msg, { bad: true });
  const el = document.querySelector('#drawer [data-wf="' + CSS.escape(k) + '"][data-id="' + CSS.escape(id) + '"]');
  if (el) { const dt = el.closest('details'); if (dt) dt.open = true; el.classList.add('bad'); el.focus({ preventScroll: false }); }
}
async function saveWork(id, step) {
  const it = get(id); if (!it || locks.has(id)) return;
  const r = buildPatch(it);
  if (r.bad) return markBad(id, r.bad, '「' + r.label + '」格式不對，要填 0 以上的數字或日期');
  const patch = r.patch, has = Object.keys(patch).length > 0;
  if (step === 'paid') {
    const rec = 'received_amount' in patch ? patch.received_amount : it.receivedAmount;
    if (rec == null) return markBad(id, 'received_amount', '要先填「實收金額」才能按已收款');
  }
  if (!step) { if (!has) { toast('沒有要存的修改'); return; } return mutate(id, 'work', '已存檔', null, { patch }); }
  if (step === 'back') {
    const to = it.status === 'paid' ? 'delivered' : 'doing';
    if (!window.confirm('把「' + nm(it) + '」退回「' + (to === 'doing' ? '進行中' : '已交件') + '」？' + (has ? '\n還沒存的修改會先存起來。' : ''))) return;
    if (has && !(await mutate(id, 'work', null, null, { patch }))) return;
    return mutate(id, 'back', '已退回' + (to === 'doing' ? '進行中' : '已交件'), null, { to });
  }
  return mutate(id, step, step === 'deliver' ? '已交件：' + nm(it) : '已收款：' + nm(it), null, has ? { patch } : {});
}
function todoHTML(it) {      // 待辦卡的抽屜：說明、進度、跟大器說、去執行
  const id = esc(it.id), run = it.runStatus, busy = run === 'queued' || run === 'running';
  return '<div class="dt">' + head(it) + (it.why ? '<p class="dt-why sbp">' + softBreak(it.why) + '</p>' : '') + progressHTML(it) +
    (busy ? '' : '<div class="acts"><button class="btn btn-primary" data-act="run" data-id="' + id + '" type="button">' + (run === 'done' || run === 'failed' ? '再執行一次' : '去執行') + '</button></div>') +
    '<p class="dt-meta">按「去執行」後，大器會在 Mac 開一個子視窗用你的個人帳號跑，做到要花錢、對外、刪檔或要你判斷的地方就停下來問你。</p>' +
    chatHTML(it.id) + histHTML(it) + closeBox(it) + '</div>';
}
function folderHTML(it) {
  if (it.basket === 'todo') return todoHTML(it);
  const fs = folderState(it), name = it.folderName ? '「' + esc(it.folderName) + '」' : '';
  if (fs === 'failed') return '<div class="fold"><p class="fold-t"><span class="ok-ic bad" aria-hidden="true">!</span>資料夾沒建成</p><p>' + esc(it.folderError || '原因不明') + '</p><p>請跟通通說，他會處理。這張卡已經記成「要做」，不會不見。</p></div>';
  if (fs !== 'done') return '<div class="fold"><p class="fold-t"><span class="spin"></span>' + (it.folderStatus === 'building' ? '正在建立工作資料夾' : '已排隊，等 Mac 接工作') + '</p><p>Mac 每分鐘接一次工作，通常 1 到 2 分鐘內建好，附件多會久一點。你可以先回到面板，不用等。</p></div>';
  const pay = linkOf(it, 'pay');
  const payBox = pay ? '<section class="paybox"><h3>領標付款</h3><p>AI 做到付款頁就停，付款那一下要你本人來。</p>' + payBtn(it, 'btn btn-primary') + '</section>' : '';
  const p = it.folderPath, real = /^\//.test(p), old = isOld(it);
  const top = old ? '<p class="fold-t">既有案，沒有建資料夾</p><p>「' + esc(it.title) + '」是已經在做的案子，直接記進面板，沒有建工作資料夾。</p>'
    : '<p class="fold-t"><span class="ok-ic" aria-hidden="true">✓</span>' + (real ? '工作資料夾建好了' : '這張是示意卡') + '</p><p>' + (real ? '「' + esc(it.title) + '」的工作都放在這個資料夾。' : '示意卡按「要做」不會真的建資料夾，其他流程跟真的一樣。') + '</p>' +
      '<div class="path">' + esc(p || it.folderName) + '</div><div class="acts">' +
      (real ? '<button class="btn btn-primary" data-act="copy-path" data-id="' + esc(it.id) + '" type="button">複製位置</button>' : '') + '</div>';
  return '<div class="fold">' + top + progressHTML(it) + chatHTML(it.id) + workHTML(it) + payBox + filesHTML(it) + histHTML(it) + closeBox(it) + '</div>';
}
function renderDrawer() {
  if (S.drawer && S.drawer.view === 'chat') {    // 整個面板跟大器說
    const dr = $('#drawer');
    if (editing(dr) && dr.dataset.key === 'chat') return;
    dr.innerHTML = '<div class="dh"><span>跟大器說</span><button class="xb" data-act="close-drawer" type="button" aria-label="關閉">×</button></div><div class="db"><div class="dt">' + chatHTML('') + '</div></div>';
    dr.dataset.key = 'chat'; dr.classList.add('show');
    const b = dr.querySelector('.msgs'); if (b) b.scrollTop = b.scrollHeight;
    return;
  }
  const dr = $('#drawer'), it = S.drawer && get(S.drawer.id), view = viewOf();
  if (!it || !view) { dr.classList.remove('show'); return; }
  if (editing(dr) && dr.dataset.key === it.id + view) return;   // 正在填案務欄位：輪詢不重畫，免得字不見、游標跳走
  const sc = dr.querySelector('.db') && dr.dataset.key === it.id + view ? dr.querySelector('.db').scrollTop : 0;
  const id = esc(it.id); let label, body, foot = '';
  if (view === 'folder') {
    label = it.basket === 'todo' ? '待辦' : it.status === 'delivered' ? '已交件' : it.status === 'paid' ? '已收款' : isOld(it) ? '進行中' : folderState(it) === 'done' ? '已建資料夾' : '建立資料夾';
    body = folderHTML(it);
    foot = '<div class="df"><button class="btn btn-primary" data-act="close-drawer" type="button">回到面板</button></div>';
  } else if (view === 'full') {
    label = '完整內容'; body = fullHTML(it);
    foot = '<div class="df"><button class="btn btn-ghost del" data-act="no" data-id="' + id + '" type="button">不做</button><button class="btn btn-primary" data-act="yes" data-id="' + id + '" type="button">要做，建立工作資料夾</button></div>';
  } else {
    label = '快速預覽'; body = previewHTML(it);
    foot = '<div class="df"><button class="btn btn-ghost del" data-act="del" data-id="' + id + '" type="button">刪掉</button>' +
      (it.status === 'snoozed' ? '' : '<button class="btn btn-ghost hold" data-act="hold" data-id="' + id + '" type="button">暫存</button>') +
      '<button class="btn btn-primary" data-act="dive" data-id="' + id + '" type="button">深入了解</button></div>';
  }
  dr.innerHTML = '<div class="dh"><span>' + label + '</span><button class="xb" data-act="close-drawer" type="button" aria-label="關閉">×</button></div><div class="db">' + body + '</div>' + foot;
  dr.dataset.key = it.id + view;
  dr.querySelector('.db').scrollTop = sc;
  dr.classList.add('show');
}

function renderAll() {
  renderLive(); renderNotice(); renderSummary(); renderBoard(); renderSheet();
  if (S.drawer) { if (S.drawer.view !== 'chat' && !get(S.drawer.id)) closeDrawer(true); else renderDrawer(); }
  syncOverlay();
}

// ---------------- 疊層開關 ----------------
function syncOverlay() {
  const any = S.sheet || !!S.drawer;
  $('#scrim').classList.toggle('show', any);
  $('#app').inert = any; $('#hpill').inert = any;
  $('#app').setAttribute('aria-hidden', any ? 'true' : 'false');
  const want = (S.drawer ? 1 : 0) + (S.sheet ? 1 : 0);
  if (want && !depth) { history.pushState({ opp: 1 }, ''); }
  if (!want && depth) { ignorePop = true; history.back(); }
  depth = want ? 1 : 0;
}
function openDrawer(id, view) {
  if (!get(id)) return;
  if (!S.drawer) lastFocus = document.activeElement;
  S.drawer = { id, view: view || 'preview' };
  if (view === 'full') ensureDetail(id);
  if (view === 'full' || view === 'folder') { loadHistory(id); loadMsgs(id); }
  renderDrawer(); syncOverlay();
  const dr = $('#drawer'); if (!dr.contains(document.activeElement)) dr.querySelector('.xb')?.focus({ preventScroll: true });
}
function closeDrawer(silent) {
  S.drawer = null; $('#drawer').classList.remove('show'); syncOverlay();
  if (!silent) restoreFocus();
}
function openSheet() { if (!S.sheet) lastFocus = document.activeElement; S.sheet = true; renderSheet(); syncOverlay(); $('#sheet .xb')?.focus({ preventScroll: true }); }
function closeSheet() { S.sheet = false; $('#sheet').classList.remove('show'); syncOverlay(); restoreFocus(); }
function restoreFocus() { if (!S.sheet && !S.drawer && lastFocus && document.contains(lastFocus)) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} } }

// ---------------- toast ----------------
let toastT;
function toast(msg, opt = {}) {
  const t = $('#toast'); clearTimeout(toastT);
  t.className = opt.bad ? 'bad' : '';
  t.innerHTML = '<span class="sbp">' + softBreak(msg) + '</span>' + (opt.undo ? '<button type="button" id="toast-undo">復原</button>' : '');
  void t.offsetWidth; t.classList.add('show');
  if (opt.undo) $('#toast-undo').onclick = () => { t.classList.remove('show'); opt.undo(); };
  toastT = setTimeout(() => t.classList.remove('show'), opt.bad ? 7000 : 6000);
}

// ---------------- 寫入：樂觀更新，失敗就還原 ----------------
const nextRemind = () => { const d = new Date(tnow()); d.setDate(d.getDate() + 1); d.setHours(HOLD_HOUR, 0, 0, 0); return d.getTime(); };
const reason = e => {
  if (!(e instanceof AdapterError)) return '發生錯誤';
  if (e.kind === 'state') return /deadline/i.test(e.message) ? '截止日已經過了，救不回來' : '這張卡的狀態已經變了，已重新同步';
  return { timeout: '連線逾時', network: '連不上伺服器', offline: '目前沒有網路', auth: '金鑰失效，請重新開 Borry 專屬網址', forbidden: '這把金鑰不能改案務，只有 Borry 和集集可以' }[e.kind] || e.message;
};
const short = t => t.length > 14 ? t.slice(0, 14) + '…' : t;
const nm = it => short(it.shortTitle || it.title);
const NEXT = { stash: 'snoozed', unstash: 'new', deleted: 'dropped', skipped: 'dropped', restore: 'new', build: 'doing', close: 'closed', reopen: 'doing', deliver: 'delivered', paid: 'paid', run: 'doing' };
const mergeCard = (old, res) => ({ ...res, detailText: res.detailText || (old ? old.detailText : ''), attachments: res.attachments.length ? res.attachments : (old ? old.attachments : []) });

async function mutate(id, action, msg, undo, opt = {}) {
  const it = get(id); if (!it || locks.has(id)) return false;
  const prev = { ...it };
  locks.add(id);
  const next = { ...it, status: action === 'back' ? (opt.to === 'delivered' ? 'delivered' : 'doing') : (NEXT[action] || it.status) };
  if (action === 'stash') next.snoozeUntil = nextRemind();
  if (action === 'unstash' || action === 'restore') next.snoozeUntil = null;
  if (action === 'deleted' || action === 'skipped') next.dropReason = action;
  if (action === 'build') next.folderStatus = 'queued';
  if (action === 'run') { next.runStatus = 'queued'; if (it.basket !== 'todo') next.status = it.status; }
  if (action === 'close') { next.closeResult = opt.result; next.closedAt = tnow(); }
  S.items.set(id, next);
  renderAll();
  if (msg) toast(msg, { undo: undo ? () => undo(prev) : null });
  try {
    const res = await api.act(id, action, opt);
    mutDone[id] = tnow();
    if (res && S.items.has(id)) S.items.set(id, mergeCard(get(id), res));
    if (opt.patch) S.draft.delete(id);      // 存進去了，草稿清掉，改顯示後端的值
    if (S.hist.has(id)) loadHistory(id);
    saveSnapshot();
    return true;
  } catch (e) {
    S.items.set(id, prev);
    if (e instanceof AdapterError && e.kind === 'auth') { S.net = 'auth'; }
    toast('沒有成功，已經還原：' + (opt.patch && e instanceof AdapterError && e.kind === 'state' ? '欄位格式不對（' + e.message + '）' : reason(e)) + (e.kind === 'auth' ? '' : '。'), { bad: true });
    if (e instanceof AdapterError && e.kind === 'state' && !opt.patch) refresh();
    return false;
  } finally { locks.delete(id); renderAll(); if (action === 'build') kickPoll(); }
}
function leave(id, kind, then) {
  const c = document.querySelector('.card[data-id="' + CSS.escape(id) + '"]');
  if (!c) return then();
  c.classList.add('leave'); if (kind === 'hold') c.classList.add('r');
  setTimeout(then, 300);
}
// 刪掉與不做都可以復原：呼叫 opp_restore，原本是暫存的再暫存回去
const undoDrop = prev => mutate(prev.id, 'restore', '已復原').then(ok => { if (ok && prev.status === 'snoozed') mutate(prev.id, 'stash'); });
function actDrop(id, why, msg) {
  const it = get(id); if (!it) return;
  if (S.drawer && S.drawer.id === id) closeDrawer(true);
  leave(id, 'del', () => mutate(id, why, msg(it), undoDrop));
}
const actDel = id => actDrop(id, 'deleted', it => '已刪掉「' + nm(it) + '」');
const actNo = id => actDrop(id, 'skipped', it => '不做「' + nm(it) + '」，已收走');
function actHold(id) {
  const it = get(id); if (!it) return;
  if (S.drawer && S.drawer.id === id) closeDrawer(true);
  leave(id, 'hold', () => mutate(id, 'stash', '「' + nm(it) + '」放進待決區，明天 ' + String(HOLD_HOUR).padStart(2, '0') + ':00 集集會傳訊息提醒你', () => mutate(id, 'unstash', '已復原')));
}
function actUnstash(id) {
  const it = get(id); if (!it) return;
  if (S.drawer && S.drawer.id === id) closeDrawer(true);
  mutate(id, 'unstash', '「' + nm(it) + '」已取消暫存，回到待看', () => mutate(id, 'stash', '已復原'));
}

// ---------------- 深入了解：資料庫端讀全文，前端等結果 ----------------
const wait = ms => new Promise(r => setTimeout(r, ms));
const redrawDrawer = id => { if (S.drawer && S.drawer.id === id) renderDrawer(); };
function put(c) { if (c && S.items.has(c.id)) S.items.set(c.id, mergeCard(get(c.id), c)); }
async function ensureDetail(id, force) {
  const it = get(id); if (!it) return;
  if (it.detailText && !force) return;
  const cur = S.detail.get(id); if (cur && cur.busy) return;
  S.detail.set(id, { busy: true, t0: tnow() });
  redrawDrawer(id);
  try {
    let c = it;
    if (force || it.crawlStatus === 'none' || it.crawlStatus === 'failed') c = (await api.act(id, 'dive', { force })) || it;
    else if (it.crawlStatus === 'done' || it.hasFullText) c = (await api.get(id)) || it;
    put(c); redrawDrawer(id);
    const t0 = tnow();
    while (c.crawlStatus === 'crawling' && tnow() - t0 < 60000) { await wait(2000); c = (await api.get(id)) || c; put(c); redrawDrawer(id); }
    if (c.crawlStatus === 'crawling') {
      S.detail.set(id, { busy: false, timedOut: true, t0: (S.detail.get(id) && S.detail.get(id).t0) || t0 });
      saveSnapshot();
      return;
    }
    if (c.crawlStatus === 'done' && !c.detailText) { c = (await api.get(id)) || c; put(c); }
    saveSnapshot();
  } catch (e) {
    if (e instanceof AdapterError && e.kind === 'auth') S.net = 'auth';
    toast('讀全文沒有成功：' + reason(e), { bad: true });
  } finally {
    const d = S.detail.get(id);
    if (!(d && d.timedOut)) S.detail.delete(id);
    renderAll();
  }
}

// ---------------- 讀取：快照、逾時、輪詢、即時 ----------------
// 舊版快照沒有新欄位：補預設值，畫面不會因 undefined 出錯
const SNAP_DEF = { detailText: '', quick: [], facts: [], warn: [], dropNote: '', quoteAmount: null, signed: null, depositAmount: null, depositDate: '', finalAmount: null, finalDue: '', deliveryDate: '', paymentTerms: '', receivedAmount: null, expectedPayDate: '', deliveredAt: null, paidAt: null, earnings: null, progressSteps: [], progressNote: '', progressBlocker: '', progressUpdatedAt: null, progressUpdatedBy: '', runStatus: '', runNote: '' };
const snapKey = () => CONFIG.SNAPSHOT_KEY + ':' + (api.mode === 'mock' ? 'mock' : keyTag());
function loadSnapshot() {
  try { const s = JSON.parse(localStorage.getItem(snapKey()) || 'null'); if (s && Array.isArray(s.items) && s.items.length) { s.items.forEach(i => i && i.id && S.items.set(i.id, { ...SNAP_DEF, ...i, career: i.career && typeof i.career === 'object' ? i.career : {}, links: Array.isArray(i.links) ? i.links : [], attachments: Array.isArray(i.attachments) ? i.attachments : [] })); S.lastOk = s.at; S.hadData = true; return true; } } catch (e) {}
  return false;
}
function saveSnapshot() {
  try { localStorage.setItem(snapKey(), JSON.stringify({ at: S.lastOk || tnow(), items: items().map(i => ({ ...i, detailText: i.detailText.slice(0, 30000) })) })); } catch (e) {}
}
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new AdapterError('timeout', '連線逾時')), ms))]);
const sig = () => JSON.stringify(items().map(i => [i.id, i.status, i.snoozeUntil, i.deadline, i.expiresAt, i.title, i.folderStatus, i.folderPath, i.crawlStatus, i.crawlError, (i.detailText || '').length, i.amountDisplay, i.why,
  i.dropNote, i.quoteAmount, i.signed, i.depositAmount, i.depositDate, i.finalAmount, i.finalDue, i.deliveryDate, i.paymentTerms, i.receivedAmount, i.expectedPayDate, i.deliveredAt, i.paidAt, i.career, i.earnings, (i.links || []).length, i.progressSteps, i.progressNote, i.progressBlocker, i.progressUpdatedAt, i.runStatus, i.runNote]));

let inflight = false, again = false, pollT, pingT, unsub = () => {};
async function refresh() {
  if (inflight) { again = true; return; } inflight = true; again = false;
  const t0 = tnow(), before = sig(), prevNet = S.net, hadSlow = S.slow;
  const slowT = setTimeout(() => { S.slow = true; renderNotice(); renderLive(); }, CONFIG.SLOW_MS);
  try {
    const r = await withTimeout(api.list(), CONFIG.TIMEOUT_MS);
    if (r.serverTime) OFF = r.serverTime - Date.now();
    const known = new Set(S.items.keys()), added = [], next = new Map();
    r.items.forEach(x => {
      const keepLocal = locks.has(x.id) || (mutDone[x.id] && mutDone[x.id] > t0);
      const old = S.items.get(x.id);
      next.set(x.id, keepLocal && old ? old : mergeCard(old, x));
      if (!known.has(x.id) && x.status === 'new' && x.basket !== 'todo') added.push(x);
    });
    locks.forEach(id => { if (!next.has(id) && S.items.has(id)) next.set(id, S.items.get(id)); });
    S.items = next; S.net = 'ok'; S.hadData = true; S.lastOk = tnow();
    if (S.firstNet && added.length) { added.forEach(a => S.fresh.add(a.id)); toast('新進 ' + added.length + ' 筆：「' + nm(added[0]) + '」' + (added.length > 1 ? ' 等' : '')); }
    if (!S.arch.loaded && !S.arch.busy) loadArchive();
    if (S.drawer) loadMsgs(S.drawer.view === 'chat' ? '' : S.drawer.id);
    S.firstNet = true; saveSnapshot(); loadScan(); loadHub();
    // 讀全文在別處完成了，而且正開著這張卡的詳細頁：把全文抓進來
    const dr = S.drawer && get(S.drawer.id);
    if (dr && viewOf() === 'full' && dr.crawlStatus === 'done' && !dr.detailText) ensureDetail(dr.id);
  } catch (e) {
    S.net = e instanceof AdapterError && e.kind === 'auth' ? 'auth' : 'offline';
  } finally {
    clearTimeout(slowT); S.slow = false; inflight = false;
    if (sig() !== before || S.net !== prevNet || hadSlow) renderAll(); else { renderLive(); renderNotice(); }
    if (S.net === 'auth') { clearTimeout(pollT); unsub(); unsub = () => {}; }   // 金鑰失效就停輪詢與即時連線
    else if (again) { again = false; refresh(); }                          // 抓取中又收到變動通知：補抓一次
  }
}
const needFast = () => items().some(i => i.crawlStatus === 'crawling' || (i.status === 'doing' && folderState(i) === 'wait'));
function schedulePoll() { clearTimeout(pollT); if (S.net === 'auth') return; pollT = setTimeout(async () => { if (!document.hidden) await refresh(); schedulePoll(); }, needFast() ? CONFIG.FAST_POLL_MS : CONFIG.POLL_MS); }
function kickPoll() { schedulePoll(); }
const ping = () => { clearTimeout(pingT); pingT = setTimeout(refresh, 150); };

// ---------------- 事件 ----------------
// 手機：在看板上左右滑動切到相鄰的籃子（橫向位移夠大且明顯比直向大才算）
let swX = null, swY = 0, swT = 0;
const board = document.getElementById('board');
board.addEventListener('touchstart', e => {
  if (e.touches.length !== 1 || window.innerWidth >= 960 || S.sheet || S.drawer) { swX = null; return; }
  swX = e.touches[0].clientX; swY = e.touches[0].clientY; swT = Date.now();
}, { passive: true });
board.addEventListener('touchend', e => {
  if (swX === null) return;
  const t = e.changedTouches[0], dx = t.clientX - swX, dy = t.clientY - swY; swX = null;
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5 || Date.now() - swT > 800) return;
  const i = TABS.findIndex(b => b.k === S.tab), j = i + (dx < 0 ? 1 : -1);
  if (i < 0 || j < 0 || j >= TABS.length) return;
  S.tab = TABS[j].k; renderBoard(); if (S.tab === 'archive' && !S.arch.loaded) loadArchive();
  const cur = document.querySelector('.lane.cur'); if (cur) { cur.classList.add(dx < 0 ? 'sw-l' : 'sw-r'); cur.addEventListener('animationend', () => cur.classList.remove('sw-l', 'sw-r'), { once: true }); }
}, { passive: true });

document.addEventListener('click', e => {
  const act = e.target.closest('[data-act]'), a = act && act.dataset.act, id = act && act.dataset.id;
  if (e.target.id === 'scrim') { S.drawer ? closeDrawer() : closeSheet(); return; }
  const tab = e.target.closest('[data-tab]'); if (tab) { S.tab = tab.dataset.tab; renderBoard(); if (S.tab === 'archive') loadArchive(); return; }
  if (e.target.closest('#hpill,#holdbtn')) { openSheet(); return; }
  if (a) {
    switch (a) {
      case 'del': actDel(id); break;
      case 'hold': actHold(id); break;
      case 'unstash': actUnstash(id); break;
      case 'dive': openDrawer(id, 'full'); break;
      case 'no': actNo(id); break;
      case 'yes': mutate(id, 'build'); break;
      case 'open-folder': openDrawer(id, 'folder'); break;
      case 'restore': mutate(id, 'restore', '已救回來，放回待看'); break;
      case 'paste-key': pasteKey(); break;
      case 'retry': refresh(); break;
      case 'retry-detail': ensureDetail(id, true); break;
      case 'toggle-text': S.textOpen.has(id) ? S.textOpen.delete(id) : S.textOpen.add(id); renderDrawer(); break;
      case 'close-drawer': closeDrawer(); break;
      case 'close-hold': closeSheet(); break;
      case 'open-hold': openSheet(); break;
      case 'scan': { const k = act.dataset.b; act.disabled = true;
        api.scanRequest(k).then(r => { toast(r && r.throttled ? '剛叫過了，等一下再按' : '已叫集集掃描「' + BN[k] + '」，約 5～15 分鐘'); loadScan(); setTimeout(renderBoard, 61e3); },
          e => { act.disabled = false; toast('沒有叫成：' + reason(e), { bad: true }); }); break; }
      case 'chat': openChat(id); break;
      case 'chat-open': openChat(''); break;
      case 'chat-send': sendMsg(id || ''); break;
      case 'run': actRun(id); break;
      case 'go-doing': closeSheet(); S.tab = 'doing'; renderBoard(); break;
      case 'open-archive': closeSheet(); S.tab = 'archive'; renderBoard(); loadArchive(); break;
      case 'hub-pick': hubAnswer(id, act.dataset.k); break;
      case 'hub-other': hubAnswer(id, '_other'); break;
      case 'hub-undo': hubAnswer(id, null); break;
      case 'arch-reload': loadArchive(); break;
      case 'close': { const it = get(id), r = act.dataset.r; if (!it || !RES[r]) break;
        if (!window.confirm('把「' + nm(it) + '」標成「' + RES[r] + '」，收進封存區？之後可以在封存區放回進行中。')) break;
        closeDrawer(true); mutate(id, 'close', '已收進封存區：' + RES[r], null, { result: r }).then(ok => ok && loadArchive()); break; }
      case 'reopen': archAct(id, 'reopen', {}, '已放回進行中'); break;
      case 'purge': { const it = get(id); if (!it) break;
        const v = window.prompt('徹底刪除後面板和封存區都找不回來（電腦裡的資料夾不會動）。\n要刪就輸入完整案名：\n' + it.title);
        if (v == null) break;
        if (v.trim() !== it.title.trim() && v.trim() !== (it.shortTitle || it.title).trim()) { toast('案名不對，沒有刪', { bad: true }); break; }
        archAct(id, 'purge', { confirm: v.trim() }, '已徹底刪除'); break; }
      case 'copy-link': { const it = get(id), l = it && it.links[+act.dataset.i]; l && l.path && navigator.clipboard && navigator.clipboard.writeText(l.path).then(() => toast('已複製位置'), () => toast('這個瀏覽器不讓複製，請長按路徑自己複製')); break; }
      case 'save-work': saveWork(id); break;
      case 'deliver': saveWork(id, 'deliver'); break;
      case 'paid': saveWork(id, 'paid'); break;
      case 'back': saveWork(id, 'back'); break;
      case 'save-note': { const it = get(id); if (!it) break; const d = S.draft.get(id), v = d && d.drop_note != null ? d.drop_note.trim() : (it.dropNote || '');
        mutate(id, 'work', '已存收走的原因', null, { patch: { drop_note: v || null } }); break; }
      case 'copy-path': { const it = get(id); navigator.clipboard && it && navigator.clipboard.writeText(it.folderPath).then(() => toast('已複製位置'), () => toast('這個瀏覽器不讓複製，請長按路徑自己複製')); break; }
    }
    return;
  }
  const c = e.target.closest('.card:not(.skel), .pc[data-id]');
  if (c && !e.target.closest('summary,a')) {
    const it = get(c.dataset.id); if (!it || c.closest('.gone')) return;
    openDrawer(c.dataset.id, isWork(it) || it.basket === 'todo' ? 'folder' : 'preview');
  }
});
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]'); if (!f) return;
  e.preventDefault(); addForm(f.dataset.form, f.querySelector('input'));
});
document.addEventListener('input', e => {
  if (e.target.dataset && e.target.dataset.chat != null) { S.chatDraft.set(e.target.dataset.chat, e.target.value); return; }
  if (e.target.id === 'todo-in') { S.chatDraft.set('todo:new', e.target.value); return; }
  const wf = e.target.dataset && e.target.dataset.wf;
  if (wf) { const id = e.target.dataset.id, d = S.draft.get(id) || {}; d[wf] = e.target.value; S.draft.set(id, d); e.target.classList.remove('bad'); return; }
  if (e.target.id === 'arch-q') { S.arch.q = e.target.value; clearTimeout(archT); archT = setTimeout(loadArchive, 350); }
});
document.addEventListener('toggle', e => {
  const t = e.target; if (!t.classList) return;
  if (t.classList.contains('gone')) S.goneOpen = t.open;
  if (t.classList.contains('hans')) S.hubAnsOpen = t.open;
  if (t.classList.contains('wc') && t.dataset.id) { if (t.open) S.careerOpen.add(t.dataset.id); else S.careerOpen.delete(t.dataset.id); }
}, true);
document.addEventListener('change', e => {
  const wf = e.target.dataset && e.target.dataset.wf;
  if (wf) { const id = e.target.dataset.id, d = S.draft.get(id) || {}; d[wf] = e.target.value; S.draft.set(id, d); return; }
  if (e.target.id === 'arch-year') { S.arch.year = e.target.value; loadArchive(); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (S.drawer) closeDrawer(); else if (S.sheet) closeSheet(); return; }
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && e.target.dataset && e.target.dataset.chat != null && !/^hub:/.test(e.target.dataset.chat)) { e.preventDefault(); sendMsg(e.target.dataset.chat); return; }
  if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('card')) openDrawer(e.target.dataset.id, 'preview');
  if (e.key === 'Tab' && (S.drawer || S.sheet)) {         // 焦點只在最上層的疊層內打轉
    const box = S.drawer ? $('#drawer') : $('#sheet');
    const f = [...box.querySelectorAll('button,a[href],summary,input,select,textarea,[tabindex="0"]')].filter(x => !x.disabled && x.offsetParent !== null);
    if (!f.length) return; const first = f[0], last = f[f.length - 1];
    if (!box.contains(document.activeElement)) { first.focus(); e.preventDefault(); }
    else if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  }
});
window.addEventListener('popstate', () => {
  if (ignorePop) { ignorePop = false; return; }
  if (S.drawer || S.sheet) { depth = 0; S.drawer = null; S.sheet = false; $('#drawer').classList.remove('show'); $('#sheet').classList.remove('show'); syncOverlay(); renderAll(); }
});
$('#lanes').addEventListener('scroll', edgeFade, { passive: true });
window.addEventListener('resize', edgeFade);
window.addEventListener('online', () => refresh());
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.net !== 'auth') refresh(); });

// ---------------- 啟動 ----------------
function pasteKey() {
  const v = window.prompt('貼上完整網址或金鑰（Borry 專屬網址）');
  const k = tokenFrom(v) || String(v || '').trim();
  if (k.length >= 20) { saveKey(k); location.reload(); } else if (v) toast('這不像金鑰，請貼完整網址', { bad: true });
}
(async function boot() {
  api = await createAdapter();
  loadSnapshot();                        // 先用快照立刻畫出來，不等網路
  S.net = 'loading'; renderAll();
  unsub = api.subscribe(ping, on => { S.rt = on; renderLive(); });
  await refresh();
  schedulePoll();
  setInterval(tick, 30000);
  setInterval(() => { if (S.drawer && !document.hidden && S.net === 'ok') loadMsgs(S.drawer.view === 'chat' ? '' : S.drawer.id); }, 10000);   // 抽屜開著時每 10 秒看大器回了沒
  setInterval(() => { if (document.querySelector('[data-elapsed]')) tick(); }, 1000);
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
