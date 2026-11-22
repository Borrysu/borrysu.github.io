/* 示範模式（錄影用，2026-11-22，大器 Opus 5.5）
   老大原話：「設計頁面給我沒有我真實資料的，我想要錄下來很想」
   只在網址帶 ?mock=（不是 0）時生效，正式版完全不跑這段。
   1. 這支手機的 localStorage 換成記憶體裡的一份：讀不到老大的金鑰 opp_key、快照、已讀位置，也不寫回去；重整就還原。
      （adapter 讀不到金鑰就不會把 ?k= 放上網址，錄影畫面不會露出金鑰；真的 opp_key 一個字都不動。）
   2. 畫面上的「示意」「（示意）」標籤、示範字樣與殘留的真名換成看起來像真的虛構名字。
   3. 右下角很小地標「示範資料」。
   這個檔案要在其他腳本之前同步載入（index.html 的 head）。 */
(function () {
  var q; try { q = new URLSearchParams(location.search).get('mock'); } catch (e) { return; }
  if (q === null || q === '0') return;
  window.__demo = true;

  // ---------- 1. localStorage 隔離 ----------
  try {
    var real = window.localStorage, mem = Object.create(null), P = Storage.prototype;
    var g = P.getItem, s = P.setItem, r = P.removeItem, c = P.clear, k = P.key;
    P.getItem = function (n) { return this === real ? (n in mem ? mem[n] : null) : g.call(this, n); };
    P.setItem = function (n, v) { if (this === real) { mem[n] = String(v); return; } return s.call(this, n, v); };
    P.removeItem = function (n) { if (this === real) { delete mem[n]; return; } return r.call(this, n); };
    P.clear = function () { if (this === real) { mem = Object.create(null); return; } return c.call(this); };
    P.key = function (i) { return this === real ? (Object.keys(mem)[i] || null) : k.call(this, i); };
  } catch (e) {}

  // ---------- 2. 文字整理 ----------
  var hm = function () { var d = new Date(); return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); };
  var PAIRS = [
    ['原型：回覆是示意，不會真的送出', ''], ['巡查待辦', '待辦清單'], ['交接帳', '工作紀錄'], ['同步到行事曆（還沒接上）', '同步到行事曆'], ['這是示意值，改過任一項就不再標示意。', ''], ['示意值，請老大改。', ''], ['示意值', '目前值'],
    ['示意證券 00692', '台股 ETF 定期定額'], ['00692', '台股 ETF'],
    ['示意銀行', '晨星銀行'], ['示意預備金', '晨星銀行 定存'], ['示意信用卡', '晨星信用卡'], ['示意電信', '遠揚電信'], ['示意郵局', '郵局'], ['示意人壽', '安和人壽'],
    ['示意商城 A', '樂購商城'], ['示意商城 B', '優選商城'], ['示意商城', '樂購商城'], ['示意 3C', '光速 3C'], ['示意攝影器材', '光圈器材行'], ['示意相機店', '光圈器材行'], ['示意藥妝', '康寧藥妝'],
    ['示意鏡頭 35mm', '35mm 定焦鏡頭'], ['示意髮廊', '小巷髮廊'], ['示意餐廳', '老家餐館'], ['示意攝影棚', '南港攝影棚'], ['示意外拍地點', '河濱公園'],
    ['示意客戶', '直接來信的客戶'], ['示意已交件案', '比賽代製案'], ['示意標案', '社區影像標案'], ['示意結案', '品牌短片結案'], ['示意講師費', '講師費'],
    ['示意訂閱 A', '影音串流'], ['示意訂閱 B', '雲端硬碟 2TB'], ['示意訂閱 C', '剪輯軟體'], ['示意訂閱 D', '音樂串流'], ['示意訂閱', '影音串流'],
    ['好咖文創', '星芒影像'], ['好咖', '星芒'], ["Borry's Calendar", '我的行事曆'], ['@Borry', '@我'], ['寶瑞', '老大'], ['Borry', '老大'], ['borrysu', '我的'],
    ['木星 TAPIN', '藍鯨 NOVA'], ['木星', '藍鯨'], ['TAPIN', 'NOVA'], ['示意圖', ''], ['示意資料', '']
  ];
  var PAREN = /[（(]示意[^）)]*[）)]/g, LEFT = /示意/g;
  function fix(t) {
    if (!t || !/示|巡查|交接帳|還沒接上|好咖|Borry|寶瑞|borrysu|木星|TAPIN|00692/.test(t)) return t;
    var o = t.replace(PAREN, '');
    if (o.indexOf('示範資料') > -1) o = o.replace(/示範資料/g, hm() + ' 更新');
    for (var i = 0; i < PAIRS.length; i++) if (o.indexOf(PAIRS[i][0]) > -1) o = o.split(PAIRS[i][0]).join(PAIRS[i][1]);
    return o.replace(LEFT, '');
  }
  var ATTR = ['placeholder', 'aria-label', 'title', 'alt'];
  function scrub(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (!(root.parentNode && root.parentNode.closest && root.parentNode.closest('#demoTag'))) { var v = fix(root.nodeValue); if (v !== root.nodeValue) root.nodeValue = v; } return; }
    if (root.nodeType !== 1 || root.id === 'demoTag' || root.tagName === 'SCRIPT' || root.tagName === 'STYLE') return;
    for (var a = 0; a < ATTR.length; a++) { var x = root.getAttribute(ATTR[a]); if (x) { var y = fix(x); if (y !== x) root.setAttribute(ATTR[a], y); } }
    var w = document.createTreeWalker(root, 5, null), n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) { if (n.parentNode && n.parentNode.closest && n.parentNode.closest('#demoTag,script,style')) continue; var nv = fix(n.nodeValue); if (nv !== n.nodeValue) n.nodeValue = nv; }
      else for (var b = 0; b < ATTR.length; b++) { var ax = n.getAttribute(ATTR[b]); if (ax) { var ay = fix(ax); if (ay !== ax) n.setAttribute(ATTR[b], ay); } }
    }
  }
  function tag() {
    if (document.getElementById('demoTag')) return;
    var t = document.createElement('div'); t.id = 'demoTag'; t.setAttribute('aria-hidden', 'true'); t.textContent = '示範資料';
    t.style.cssText = 'position:fixed;right:10px;top:calc(env(safe-area-inset-top,0px) + 3px);z-index:99999;font:500 9px/1 Inter,"Noto Sans TC",sans-serif;letter-spacing:.04em;color:rgba(243,239,224,.38);pointer-events:none;';
    document.body.appendChild(t);
  }
  function start() {
    scrub(document.body); tag();
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.type === 'characterData') scrub(m.target);
        else if (m.type === 'attributes') scrub(m.target.nodeType === 1 ? m.target : null);
        else for (var j = 0; j < m.addedNodes.length; j++) scrub(m.addedNodes[j]);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
    var tt = document.querySelector('title'); if (tt) tt.textContent = fix(tt.textContent);
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
