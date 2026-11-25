/* 逐流 v200a（2026-11-25）：跟好咖皮條客關聯的公司案子，步驟空著時給一個「請肉咖帶來」入口。
   老大原話（msg 1259）：「像這種跟好咖皮條客關聯的卡片就要連動內容，步驟也是」。
   決策 2a0a0288：逐流不碰皮條客鑰匙，全經肉咖。這裡只改顯示，按鈕走既有的派肉咖單（coPush），不讀公司資料。
   退回：index.html 拿掉 co_mirror.js 那行。 */
(function () {
  if (typeof pageHTML !== 'function' || typeof ACT !== 'object') return;
  const EMPTY = '<p class="note">還沒有步驟。</p>';
  const _p = pageHTML;
  pageHTML = function () {
    const h = _p();
    try {
      const x = (S.page || '').split(':');
      if (x[0] !== 'proj' || h.indexOf(EMPTY) < 0) return h;
      const p = DB.proj.find(q => q.id === x[1]);
      const c = p && p.raw;
      if (!c || c.basket !== 'company' || !coSrcOf(c)) return h;
      const tip = `<div class="card bidtip"><p><b>此案步驟在好咖皮條客</b>：點下面請肉咖把內容與步驟帶來，逐流只顯示、不回寫皮條客。</p><div class="btns"><button class="btn rk" data-act="coMirrorAsk" data-id="${esc(p.id)}">${typeof bm === 'function' ? bm('rouka', '', 'sm') : ''}請肉咖帶來</button></div></div>`;
      return h.replace(EMPTY, tip);
    } catch (e) { return h; }
  };
  ACT.coMirrorAsk = async id => {
    const p = DB.proj.find(q => q.id === id), c = p && p.raw;
    if (!c) return;
    const sid = coSrcOf(c);
    const text = `【請帶來內容與步驟】皮條客 ${sid}「${c.title}」：請把這案目前的下一步、步驟（名稱與狀態）、期限整理成摘要回報到這張單。只要摘要，不帶金額、合約與個資。逐流只顯示，不回寫皮條客。`;
    const ok = await coPush(c, text);
    if (ok) { toast('交給肉咖了，帶來後會出現在這張卡的「派過的工作」'); try { await coLoad(); } catch (e) {} render('keep'); }
  };
})();
