// 純工具：跳脫、時間格式、倒數、斷行。不碰網路，不碰 DOM。

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export const H = 3600e3, D = 24 * H;
export const URGENT_DAYS = 4;           // 紅色只給「真的截止日」在 4 天內
export const WEEK = ['日','一','二','三','四','五','六'];
const p2 = n => String(n).padStart(2, '0');

export function fmtDate(ms) {
  if (!ms) return '';
  const d = new Date(ms), y = new Date().getFullYear();
  return (d.getFullYear() !== y ? d.getFullYear() + '/' : '') + (d.getMonth() + 1) + '/' + d.getDate() +
    '（' + WEEK[d.getDay()] + '）' + p2(d.getHours()) + ':' + p2(d.getMinutes());
}
export function fmtClock(ms) {
  const d = new Date(ms), t = new Date();
  const same = d.toDateString() === t.toDateString();
  return (same ? '' : (d.getMonth() + 1) + '/' + d.getDate() + ' ') + p2(d.getHours()) + ':' + p2(d.getMinutes());
}
export function fmtLeft(m) {
  if (m <= 0) return '時間到';
  const mi = Math.floor(m / 60000), h = Math.floor(mi / 60), d = Math.floor(h / 24);
  if (d >= 2) return d + ' 天 ' + (h % 24) + ' 小時';
  if (h >= 1) return h + ' 小時 ' + (mi % 60) + ' 分';
  return Math.max(mi, 1) + ' 分';
}
export function shortLeft(m) {
  if (m <= 0) return '0 分';
  const mi = Math.floor(m / 60000), h = Math.floor(mi / 60), d = Math.floor(h / 24);
  if (d >= 2) return d + ' 天';
  if (h >= 1) return h + ' 小時';
  return Math.max(mi, 1) + ' 分';
}

// ---------- 斷行 ----------
// 做法：用 Intl.Segmenter 切詞，再把太短的詞併回鄰居（每塊至少 3 個字），
// 標點跟著前後的字走，數字與英文不和後面的中文拆開。
// 塊與塊之間放 <wbr>，搭配 CSS 的 word-break:keep-all，瀏覽器只會在 <wbr> 或空白換行，
// 所以不會出現孤字，也不會把一個詞從中間切開。
const SEG = (typeof Intl !== 'undefined' && Intl.Segmenter) ? new Intl.Segmenter('zh-Hant', { granularity: 'word' }) : null;
const CJK = /[\u2E80-\u9FFF\uF900-\uFAFF]/;
const CLOSE = /^[，。、；：！？）」』》〉】〕…～,.;:!?)\]]+$/;
const OPEN = /^[（「『《〈【〔(\[]+$/;
const MIN = 2;
const len = s => [...s.replace(/[，。、；：！？）」』》〉】〕…～（「『《〈【〔\s]/g, '')].length;
const cache = new Map();

export function softBreak(text) {
  text = String(text ?? '');
  if (cache.has(text)) return cache.get(text);
  const out = build(text);
  if (cache.size > 800) cache.clear();
  cache.set(text, out);
  return out;
}
function build(text) {
  if (!CJK.test(text)) return esc(text);
  let segs;
  if (SEG) segs = [...SEG.segment(text)].map(x => x.segment);
  else segs = text.match(/[\u2E80-\u9FFF\uF900-\uFAFF]{1,2}|[^\u2E80-\u9FFF\uF900-\uFAFF]+/g) || [text];
  // 連在一起的半形字（2027/5/31、YouTube、3.7）先合成一個，避免從斜線或小數點切開
  const merged = [];
  for (const g of segs) {
    if (merged.length && /^[\x21-\x7e]+$/.test(g) && /^[\x21-\x7e]+$/.test(merged[merged.length - 1])) merged[merged.length - 1] += g; else merged.push(g);
  }
  segs = merged;
  // chunks: {t:字串, sp:此塊前面原本是空白}
  const ch = []; let pendSp = false, pendOpen = '';
  for (const s of segs) {
    if (/^\s+$/.test(s)) { pendSp = true; continue; }
    if (CLOSE.test(s) && ch.length) { ch[ch.length - 1].t += s; continue; }
    if (OPEN.test(s)) { pendOpen += s; continue; }
    ch.push({ t: pendOpen + s, sp: pendSp }); pendOpen = ''; pendSp = false;
  }
  if (pendOpen) { if (ch.length) ch[ch.length - 1].t += pendOpen; else ch.push({ t: pendOpen, sp: false }); }
  // 由左到右累積：一塊湊到 MIN 個字才換下一塊；英數接著的中文詞，不讓它單獨成塊
  const out = []; let cur = null;
  for (const c of ch) {
    if (!cur) { cur = { t: c.t, sp: c.sp }; continue; }
    const glue = /[A-Za-z0-9]$/.test(cur.t) && CJK.test(c.t[0]);   // 116 年、YouTube 長片
    const tail = (cur.t.match(/[\u2E80-\u9FFF\uF900-\uFAFF]+$/) || [''])[0].length;
    const hasLatin = /[A-Za-z0-9]/.test(cur.t);
    if (len(cur.t) < MIN || glue || (hasLatin && tail === 1)) cur.t += (c.sp ? (glue ? '\u00a0' : ' ') : '') + c.t;
    else { out.push(cur); cur = { t: c.t, sp: c.sp }; }
  }
  if (cur) {
    if (out.length && len(cur.t) < MIN) out[out.length - 1].t += (cur.sp ? ' ' : '') + cur.t;
    else out.push(cur);
  }
  ch.length = 0; ch.push(...out);
  return ch.map((c, i) => (i ? (c.sp ? ' ' : '<wbr>') : '') + esc(c.t)).join('');
}

// 金額拆成「數字」與「單位」，方便用大字顯示。沒有數字（未公布、無酬勞）就整串當文字。
export function splitAmount(display) {
  const s = String(display || '').trim();
  const m = s.match(/^(\d[\d.,]*(?:\s*[～~到]\s*\d[\d.,]*)?)\s*(.*)$/);
  if (!m || m[2].length > 6) return { num: '', unit: '', text: s };
  return { num: m[1], unit: m[2], text: s };
}
