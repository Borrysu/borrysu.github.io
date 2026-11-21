// 示範模式：沒有後端設定時才會載入。資料改寫自定稿原型的卡片，時間一律相對於「現在」，
// 所以每次打開都像即時資料。真後端上線後，這個檔案不會被載入。
//
// 偵錯參數（只在示範模式有效），可用逗號串接，例如 ?mock=slow,crawlfail
//   empty        整個面板沒有資料
//   emptybasket  成就機會籃是空的
//   slow         列表 6 秒後才回來（看「載入比較久」）
//   hang         列表一直不回來（看載入中與逾時）
//   offline      列表一律失敗（先正常開過一次，再用這個看離線，會顯示上次快照）
//   auth         模擬金鑰錯誤
//   crawlfail    深入了解的爬全文一律失敗
//   crawlslow    深入了解的爬全文 16 秒後才完成（看「正在讀全文」，含超過 10 秒的說明）
//   crawlhang    爬全文一直不回來（看 60 秒逾時）
//   setfail      刪掉、暫存、不做、要做一律失敗（看回復）
//   folderslow   要做之後，資料夾 12 秒後才建好
//   （v17）示範資料另有：既有案（進行中）、已交件、已收款各一張，剛收走的有一張附收走原因
//   longname     第一張卡改成很長的案名（驗右上角不跑版）
//   xss          第一張卡的文字欄都塞惡意 HTML、連結改成 javascript:（驗跳脫用，window.__xss 應一直是 undefined）
//   以上資料一律轉成後端（opp_list）的欄位格式再交給 normalize，所以示範與真後端走同一條路。
import { AdapterError, normalize, normScan, normHistory, normMsgs, normHub, normMoney } from './adapter.js?v33';

const H = 3600e3, D = 24 * H;
const wait = ms => new Promise(r => setTimeout(r, ms));

function build() {
  const now = Date.now();
  const at = (days, hh, mm = 0) => { const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(hh, mm, 0, 0); return d.toISOString(); };
  const ago = h => new Date(now - h * H).toISOString();
  const exp = h => new Date(now - h * H + 7 * D).toISOString();
  const tomorrow8 = at(1, 8);
  const row = (o) => Object.assign({ status: 'new', currency: '', amount_display: '', amount_text: '', amount_label: '', tags: [], detail_text: '', detail_fetched_at: null, work_folder_url: '', warn: [], quick: [], facts: [], is_demo: false, source_url: '', snooze_until: null, due_at: null, found_by: 'Gig Gig' }, o);
  const pcc = 'https://web.pcc.gov.tw/tps/QueryTender/query/searchTenderDetail?pkPmsMain=';
  return [
    row({ id: 'moea', basket: 'company', title: '內政部建築研究所 115 年度業務宣導案', org: '內政部建築研究所', amount_label: '預算', currency: 'NT$', amount_display: '70 萬', deadline: at(2, 17), found_at: ago(30), expires_at: exp(30), found_by: 'Kim Kim', fit: '中', honor: '普通', source_site: '政府電子採購網', source_url: pcc + 'NzEzODEzNjk',
      why: '不用押標金，11/11 流標後重新招標', quick: ['要公司行號，營業項目含一般廣告服務業', '不用押標金'],
      facts: ['資格：公司行號，營業項目要有一般廣告服務業', '押標金：不用', '流標：11/11 流標、重新招標，我推測競爭會比較少', '影片占多少：要看招標文件'], warn: ['要借公司名義投的話，得先問能不能借。'], first_step: '先確認能不能借那間公司的名義投。' }),
    row({ id: 'mingtan', basket: 'company', title: '明潭發電廠簡介影片（公開徵求參考資料）', org: '明潭發電廠', amount_text: '沒寫金額', deadline: at(2, 23, 59), found_at: ago(26), expires_at: exp(26), fit: '中', honor: '普通', source_site: '政府電子採購網', source_url: 'https://web.pcc.gov.tw/prkms/tender/common/noticeDate/redirectPublic',
      why: '現在只是徵求參考資料，未來正式招標值得盯', quick: ['內容有執導、空拍、動畫、配音', '還不是正式招標'], facts: ['現況：公開徵求參考資料', '內容：執導、空拍、動畫、配音', '後續：未來正式招標值得盯'], first_step: '看徵求內容，決定要不要提供參考資料。' }),
    row({ id: 'tust', basket: 'company', title: '臺灣科技大學 116 年形象影片', org: '臺灣科技大學', amount_label: '預算', currency: 'NT$', amount_display: '75 萬', deadline: at(3, 13, 30), found_at: ago(28), expires_at: exp(28), fit: '高', honor: '中等', source_site: '政府電子採購網', source_url: pcc + 'NzEzNjcxOTY',
      why: '最能救 11 月現金流，但只收紙本、要先押標金', quick: ['公司或商業登記加納稅證明、信用證明', '只收紙本，要先繳押標金 3.7 萬'],
      facts: ['資格：公司或商業登記、最近一期納稅證明、信用證明（半年內票據交換所非拒絕往來證明，或會計師簽證財報）', '收件：只收紙本，截止前送到台科大行政大樓 1 樓總務處事務組；企劃書 4 份加 1 份電子檔', '押標金：37,000 元，截止前繳；得標 5 天內再繳履約保證金 37,000 元', '開標：現場可能減價或協商，最多 2 人到場', '限制：不能共同投標；報價高於 75 萬不合格；2027/5/31 前交片', '未寫明：影片支數、長度、評分配比，電子領標後才看得到'],
      warn: ['送件前只剩一個上班日：信用證明和押標金要先辦好。', '手上沒有現成的信用證明，這案基本上來不及。'], first_step: '用公司的採購網帳號電子領標，拿到需求規範書與評審須知。' }),
    row({ id: 'taichung', basket: 'company', title: '臺中市環境教育園區宣導活動計畫（116 年度）', org: '臺中市政府', amount_label: '預算', currency: 'NT$', amount_display: '299 萬', deadline: at(13, 17), found_at: ago(32), expires_at: exp(32), found_by: 'Kim Kim', fit: '中', honor: '普通', source_site: '政府電子採購網', source_url: pcc + 'NzEzODQ1NDk',
      why: '主體是辦活動，影片和企劃算加分', quick: ['公司或商業登記加納稅證明', '影片占多少要看工作項目'], facts: ['資格：公司或商業登記加納稅證明', '內容：主體是辦活動，影片和企劃算加分'], first_step: '先電子領標，看工作項目裡影片占多少。' }),
    row({ id: 'tyenv', basket: 'company', title: '桃園市 116 年度環境教育行銷推廣計畫', org: '桃園市政府', amount_label: '預算', currency: 'NT$', amount_display: '770 萬', deadline: at(9, 9), found_at: ago(32), expires_at: exp(32), found_by: 'Kim Kim', fit: '中', honor: '普通', source_site: '政府電子採購網', source_url: pcc + 'NzEzODM0Mzk',
      why: '規模太大，適合去當得標團隊的分包', quick: ['要有 I1 顧問服務業登記', '適合找夥伴一起投'], facts: ['資格：要有 I1 顧問服務業登記', '規模：大，適合去當得標團隊的影片或企劃分包'], warn: ['你自己投不了，要有 I1 登記的夥伴。'], first_step: '先找有 I1 登記的夥伴合作。' }),
    row({ id: 'taoart', basket: 'company', status: 'snoozed', snooze_until: tomorrow8, title: '桃園市兒童美術館特展暨活動宣傳影片', org: '桃園市兒童美術館', amount_label: '預算', currency: 'NT$', amount_display: '34.4 萬', deadline: at(5, 17), found_at: ago(30), expires_at: exp(30), found_by: 'Gig Gig', fit: '高', honor: '中等', source_site: '政府電子採購網', source_url: pcc + 'NzEzNzk0MjE',
      why: '規模剛好，自然人也能投', quick: ['登記證明（自然人附身分證）', '服務建議書 6 份'], facts: ['資格：登記證明（自然人附身分證）、納稅證明、服務建議書 6 份', '名義：自然人也能投，用個人名義可以'], first_step: '領標，看影片支數和評選配分。' }),
    row({ id: 'pro360kh', basket: 'personal', title: '高雄 80 組簡報轉 Reel', org: 'PRO360 個人案主', amount_label: '預算', currency: 'NT$', amount_display: '5,000～10,000', found_at: ago(54), expires_at: exp(54), found_by: 'Kim Kim', fit: '高', honor: '低', source_site: 'PRO360', source_url: 'https://www.pro360.com.tw/case/request/4911020',
      why: '用 AI 剪很快，先確認能不能遠端', quick: ['個人案主，11/11 發案', '頁面寫要到高雄三民區現場'], facts: ['預算：5 千到 1 萬', '案主：個人，11/11 發案', '地點：頁面寫要到高雄三民區現場'], warn: ['要到現場的話，先確認能不能遠端。'], first_step: '報價，附一支類似的 Reel 樣片。' }),
    row({ id: 'pro360cy', basket: 'personal', title: '嘉義童裝直播 Reels 剪輯', org: 'PRO360 公司案主', amount_text: '詳談後報價', found_at: ago(54), expires_at: exp(54), found_by: 'Kim Kim', fit: '高', honor: '低', source_site: 'PRO360', source_url: 'https://www.pro360.com.tw/case/request/4911111',
      why: '有機會變成每月固定的長期案', quick: ['案主自己拍，要你建議內容再剪', '詳談後報價'], facts: ['報價：詳談後報價', '案主：公司，他們自己拍，要你建議內容再剪', '機會：有機會變成每月固定的長期案'], first_step: '回覆時直接開「每月幾支多少錢」的方案價。' }),
    row({ id: 'demo-song', basket: 'personal', title: '獨立歌手 MV 詞曲委託', org: '示意資料', amount_label: '報價', currency: 'NT$', amount_display: '3 萬', found_at: ago(20), expires_at: exp(20), is_demo: true, found_by: '皮皮（示意）', fit: '中', honor: '普通',
      why: '用個人名義接，詞曲加導演一起做', quick: ['示意資料，不是真實案子', '用來示範個人案籃'], facts: ['說明：這是示意資料'], first_step: '（示意）先回覆想聽哪首 demo。' }),
    row({ id: 'tkfan', basket: 'other', title: '異世界企劃宣傳片後製', org: 'Tasker', amount_label: '預算', currency: 'NT$', amount_display: '3 萬', found_at: ago(30), expires_at: exp(30), fit: '高', honor: '低', source_site: 'Tasker', source_url: 'https://www.tasker.com.tw/cases/TK26091604WBPX40',
      why: '可遠端，適合匿名帳號接；先確認還開著', quick: ['可以遠端', '適合用 nightdesk 匿名帳號接'], facts: ['預算：3 萬元', '地點：可以遠端，適合用 nightdesk 匿名帳號接', '提案：沒付費每月 1 次免費，之後每次扣 T Points（1 點約 1 元），沒成交不退'], warn: ['案子是 9 月貼的，要先確認還開著。'], first_step: '先開頁確認案子還開著，再用 nightdesk 提案。' }),
    row({ id: 'tkmil', basket: 'other', title: '軍事 YouTube 長片剪輯', org: 'Tasker', amount_label: '每支', currency: 'NT$', amount_display: '2,000～3,000', found_at: ago(26), expires_at: exp(26), fit: '中', honor: '低', source_site: 'Tasker', source_url: 'https://www.tasker.com.tw/cases/TK26110904JMPG28',
      why: '每月約 6 支，可以穩定接', quick: ['每個月大約 6 支', 'nightdesk 已完成實名認證'], facts: ['報酬：每支 2,000 到 3,000 元，每月約 6 支', '帳號：nightdesk 已完成實名認證，可以提案', '提案：每月 1 次免費，之後扣 T Points'], first_step: '寫提案草稿給你看，你說投再投。' }),
    row({ id: 'moclang', basket: 'funding', title: '文化部語言友善環境及創作應用補助', org: '文化部', amount_label: '補助最高', currency: 'NT$', amount_display: '100 萬', deadline: at(15, 23, 59), found_at: ago(30), expires_at: exp(30), fit: '高', honor: '加分', source_site: '文化部獎補助資訊網', source_url: 'https://grants.moc.gov.tw/Web/',
      why: '整支 AI 生成不補助，要改成 AI 輔助才拿得到', quick: ['自然人可申請「創作及應用」', '台語占 50% 以上優先'], facts: ['金額：每案最高 100 萬，不超過總經費 49%，其餘自籌', '資格：自然人可申請「創作及應用」，要是創作者本人', 'AI：申請和結案都要交使用 AI 的具結書，成品要標示用 AI 的地方', '優先：台語占 50% 以上、放上 YouTube 這類可擴散的影音', '請款：做完後憑單據請款，前期要自己墊'], warn: ['要點寫明整支都是 AI 生成的作品不補助，事後被查到要退錢。', 'AI 占多少算輔助，要點沒寫，要打電話問承辦人。'], first_step: '先決定要不要改成 AI 輔助，再決定送不送。' }),
    row({ id: 'tycg', basket: 'funding', status: 'snoozed', snooze_until: tomorrow8, title: '桃園市文化局 116 年補助影視製作', org: '桃園市文化局', amount_label: '補助上限', currency: 'NT$', amount_display: '300 萬', deadline: at(46, 17), found_at: ago(30), expires_at: exp(30), fit: '高', honor: '加分', source_site: '桃園市文化局', source_url: 'https://culture.tycg.gov.tw/News_Content.aspx?n=11134&s=1911492',
      why: '掛你名的作品，但要在桃園取景達三分之一', quick: ['要有電影片或節目製作業登記', '桃園取景達片長 1/3 以上'], facts: ['金額：每案上限 300 萬，各級政府補助合計不超過製作成本 50%', '資格：要有電影片製作業或節目製作業登記', '取景：在桃園取景達片長三分之一以上'], warn: ['純雲端生成、不在桃園拍，很可能不符。'], first_step: '確認影視業登記，下載實施要點和申請書。' }),
    row({ id: 'chroma', basket: 'funding', title: 'Chroma Awards 第二季', org: 'ElevenLabs 孵化', amount_label: 'MV 類獎金', currency: 'US$', amount_display: '24,000', deadline: at(53, 23, 59), found_at: ago(3), expires_at: exp(3), fit: '高', honor: '加分', source_site: 'chromaawards.com', source_url: 'https://www.chromaawards.com',
      why: 'MV 類，可以直接投你自己的歌', quick: ['全球可投，免報名費', '用贊助工具做的片有加碼和算力點數'], facts: ['金額：總獎池 US$45 萬以上，其中 Music Video 類 2.4 萬', '報名費：免', '加碼：用贊助工具做的片另有加碼獎金和算力點數'], first_step: '讀完第二季規則，挑一首自己的歌來做 MV。' }),
    row({ id: 'artefact', basket: 'funding', title: 'Artefact AI Film Festival 第三屆', org: 'Artefact', amount_label: '大獎', currency: '€', amount_display: '10,000', deadline: at(17, 23, 59), found_at: ago(3), expires_at: exp(3), fit: '高', honor: '高加分', source_site: 'artefact-ai-film-festival.com', source_url: 'https://artefact-ai-film-festival.com',
      why: '得獎能上巴黎院線，18 天內要做完', quick: ['大獎含 mk2 院線映一週 30 秒', '片長上限 314 秒'], facts: ['金額：大獎 1 萬歐元，加上在法國 mk2 院線映一週 30 秒', '主題：(Dis)Connection', '片長：上限 314 秒', '報名費：免'], warn: ['「前期、拍攝、後期都要用生成式 AI」這條來自第三方網站，官網沒寫，要核對。'], first_step: '決定拿手上的素材改，還是新做一支 5 分鐘內的短片。' }),
    row({ id: 'flick', basket: 'funding', status: 'snoozed', snooze_until: tomorrow8, title: 'Flick AI 影展', org: 'FlickArt', amount_label: '首獎', currency: 'US$', amount_display: '10,000', deadline: at(31, 15, 59), found_at: ago(22), expires_at: exp(22), fit: '高', honor: '普通', source_site: 'flick.art 官方規則', source_url: 'https://flick.art/festival/rules',
      why: '免報名費，但投稿要先公開發全片', quick: ['全球可投，個人或 4 人內團隊', '免報名費'], facts: ['金額：最佳影片 US$10,000，動畫 5,000，導演 2,500', '報名費：免', '資格：2026/3/1 後完成、要有英文字幕', '權利：著作權歸你，送件即非獨家授權 FlickTV 放全片'], warn: ['投稿時要在自己的社群公開發全片、加官方浮水印，之後重視首映權的影展會被卡。', '獎金怎麼匯到台灣、扣不扣稅，規則沒寫。'], first_step: '挑一支不打算再投大影展的作品，或為這個比賽新做一支。' }),
    row({ id: 'ncafroc', basket: 'achievement', title: '國藝會國際文化交流 第 6 期', org: '國藝會', amount_text: '沒寫金額', deadline: at(1, 23, 59), found_at: ago(28), expires_at: exp(28), fit: '中', honor: '加分', source_site: '國藝會', source_url: 'https://www.ncafroc.org.tw/founding_detail.html?categoryId=culturalExchange',
      why: '要明年有出國參展的行程才用得上', quick: ['成就機會，能掛導演名', '頁面沒寫金額'], facts: ['籃別：成就機會', '金額：頁面沒寫', '條件：要明年有出國參展的行程才用得上'], first_step: '先確認明年有沒有出國參展的行程。' }),
    row({ id: 'demo-honor', basket: 'achievement', title: '某影展短片單元評審邀請', org: '示意資料', amount_label: '酬勞', amount_text: '沒寫金額', deadline: at(4, 18), found_at: ago(14), expires_at: exp(14), is_demo: true, found_by: '皮皮（示意）', fit: '高', honor: '加分',
      why: '掛導演名的評審位，錢少但加分', quick: ['示意資料，不是真實案子', '用來示範「成就機會」籃'], facts: ['說明：這是示意資料，用來讓成就機會籃有東西可看'], first_step: '（示意）回覆邀請，確認檔期。' }),
  ];
}


const fmtTxt = iso => { const d = new Date(iso), w = '日一二三四五六'[d.getDay()], p = n => String(n).padStart(2, '0'); return (d.getMonth() + 1) + '/' + d.getDate() + '（' + w + '）' + p(d.getHours()) + ':' + p(d.getMinutes()); };
// 內部寫的舊格式 → 後端格式（欄位名與值都照 BACKEND.md）
function toBackend(r) {
  const o = Object.assign({}, r);
  o.basket = { funding: 'fund', achievement: 'honor' }[r.basket] || r.basket;
  o.status = r.status === 'snoozed' ? 'stashed' : r.status;
  o.amount_display = (r.amount_display || '').replace(/\s+/g, '') || (r.amount_text || '未公布');
  o.currency = r.amount_display ? (r.currency || null) : null;
  o.deadline_text = r.deadline ? fmtTxt(r.deadline) : '沒有截止日，7 天後自動收走';
  o.deadline_approx = false;
  o.expire_at = r.expires_at; o.created_at = r.found_at; o.remind_at = r.snooze_until || null;
  o.short_title = null; o.crawl_status = 'none'; o.crawl_error = null; o.has_full_text = false; o.full_text = '';
  o.folder_status = 'none'; o.folder_path = null; o.folder_name = null; o.folder_error = null; o.notion_url = null; o.drop_reason = null; o.attachments = []; o.links = [];
  o.career = r.career || {}; o.drop_note = r.drop_note || null;
  return o;
}
// 照後端 _opp_earnings 算實拿與時薪（示範用，真資料由資料庫算）
function earn(r) {
  const n = v => v == null ? null : +v, c = r.career || {};
  let gross, basis;
  if (n(r.received_amount) > 0) { gross = n(r.received_amount); basis = 'received'; }
  else if (r.quote_amount == null && r.deposit_amount == null && r.final_amount == null) return null;
  else { gross = Math.max(n(r.quote_amount) || 0, (n(r.deposit_amount) || 0) + (n(r.final_amount) || 0)); basis = 'expected'; }
  const wh = c.tax_withheld === false ? 0 : Math.round(gross * 0.10), nhi = c.tax_withheld === false ? 0 : Math.round(gross * 0.0211);
  const adv = +c.advance_amount || 0, net = gross - wh - nhi - adv;
  const hours = c.actual_hours > 0 ? c.actual_hours : c.est_hours > 0 ? c.est_hours : null, hb = c.actual_hours > 0 ? 'actual' : hours ? 'estimated' : null;
  return { gross, basis, labor_withholding_10pct: wh, nhi_2_11pct: nhi, advance: adv, net, hours, hours_basis: hb, hourly_net: hours ? Math.round(net / hours) : null };
}
const WORK_KEYS = ['quote_amount', 'signed', 'deposit_amount', 'deposit_date', 'final_amount', 'final_due', 'delivery_date', 'payment_terms', 'received_amount', 'expected_pay_date', 'drop_note', 'career'];
function applyWork(r, j) {
  for (const k of Object.keys(j)) if (!WORK_KEYS.includes(k)) throw new AdapterError('state', 'unknown field: ' + k, 400);
  for (const k of WORK_KEYS) if (k !== 'career' && k in j) r[k] = j[k] === '' ? null : j[k];
  if (j.career && typeof j.career === 'object') { const c = Object.assign({}, r.career || {}); for (const [k, v] of Object.entries(j.career)) { if (v == null) delete c[k]; else c[k] = v; } r.career = c; }
}
const today = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
const dayOff = n => { const d = new Date(Date.now() + n * D), p = x => String(x).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
// 案務示範卡：集集記進來的既有案，沒有建資料夾
function workRows() {
  const base = (o) => Object.assign(toBackend({ basket: 'personal', title: '', org: '示意資料', found_at: new Date(Date.now() - 10 * D).toISOString(), expires_at: null, found_by: 'Gig Gig', is_demo: true, why: '', quick: [], facts: [], warn: [] }),
    { source_site: '既有案', folder_status: 'done', folder_path: '（既有案，沒有建資料夾）', decided_at: new Date(Date.now() - 10 * D).toISOString() }, o);
  return [
    base({ id: 'work-doing', status: 'doing', title: '某品牌形象短片導演（示意）', run_status: 'running', progress_note: '分鏡第二版寫好，等客戶回。', progress_updated_by: 'AI協作', progress_updated_at: new Date(Date.now() - 2 * H).toISOString(),
      progress_steps: [{ name: '讀客戶 brief', status: 'done' }, { name: '分鏡第一版', status: 'done' }, { name: '分鏡第二版', status: 'current', note: '等客戶回覆' }, { name: '拍攝', status: 'pending' }, { name: '剪接交片', status: 'pending' }], quote_amount: 120000, signed: true, deposit_amount: 36000, deposit_date: dayOff(-6), final_amount: 84000, final_due: dayOff(30), payment_terms: '簽約付三成，交片後 30 天付尾款',
      career: { line: '個人導演', public_identity: '導演 Borry', status_gain: '中', status_gain_note: '品牌會在片尾掛導演名', est_hours: 60, tax_withheld: true, referrer: '朋友介紹', kim_judgment: '錢普通，但能放作品集。' } }),
    base({ id: 'work-delivered', status: 'delivered', title: 'AI 影片比賽代製（示意）', basket: 'other', quote_amount: 30000, delivery_date: dayOff(-2), delivered_at: new Date(Date.now() - 2 * D).toISOString(), expected_pay_date: dayOff(12), payment_terms: '交件後兩週匯款',
      career: { line: 'AI 影片與比賽', est_hours: 12, actual_hours: 15, tax_withheld: false } }),
    base({ id: 'work-paid', status: 'paid', title: '工作坊講師鐘點（示意）', basket: 'achievement', quote_amount: 8000, received_amount: 7200, delivery_date: dayOff(-20), delivered_at: new Date(Date.now() - 20 * D).toISOString(), paid_at: new Date(Date.now() - 5 * D).toISOString(),
      career: { line: '教學授權', actual_hours: 4, advance_amount: 300, advance_recovered_date: dayOff(-5) } }),
    base({ id: 'todo-1', status: 'new', basket: 'todo', title: '建一個報價單產生器（示意）', why: '每次報價都要重打，想要填幾個欄位就出 PDF。', source_site: '待辦', folder_status: 'none', folder_path: null }),
    base({ id: 'todo-2', status: 'doing', basket: 'todo', title: '把 IG 貼文排程接上 Notion（示意）', source_site: '待辦', folder_status: 'none', folder_path: null, run_status: 'running',
      progress_steps: [{ name: '查 IG API 能不能排程', status: 'done' }, { name: '寫串接', status: 'current' }, { name: '測一篇', status: 'pending' }], progress_updated_by: 'AI協作', progress_updated_at: new Date(Date.now() - 20 * 60e3).toISOString() }),
    base({ id: 'work-gone', status: 'dropped', drop_reason: 'skipped', title: '婚禮紀錄側拍（示意）', folder_status: 'none', folder_path: null, source_site: 'PRO360', drop_note: '日期跟另一案撞期' }),
  ];
}

export function mockAdapter(modeStr) {
  const flags = new Set(String(modeStr).split(',').map(s => s.trim()).filter(Boolean));
  let rows = (flags.has('empty') ? [] : build()).map(toBackend);
  if (flags.has('emptybasket')) rows = rows.filter(r => r.basket !== 'honor');
  if (flags.has('longname') && rows[0]) Object.assign(rows[0], { title: '臺南市安平區台江國家公園地區人物故事暨影像史料徵集計畫第二期委託專業服務案', short_title: '' });   // 驗長案名不跑版
  if (rows[0] && !flags.has('xss')) rows[0].links = [{ kind: 'pay', label: '去領標付款', url: 'https://web.pcc.gov.tw/', amount: 'NT$ 200' }];   // 示範：還沒說要做也能領標
  if (rows.length > 3 && !flags.has('xss')) Object.assign(rows[rows.length - 1], { status: 'closed', close_result: 'won', closed_at: new Date(Date.now() - 3 * D).toISOString(), decided_at: new Date(Date.now() - 20 * D).toISOString(),
    folder_status: 'done', folder_name: '10-27_示意結案', links: [{ kind: 'pool', label: 'Pool（官方文件、標書、成品）', path: '/Users/borry/Desktop/示意/10-27_示意結案' }, { kind: 'review', label: '內審（製作過程）', path: '/Users/borry/Desktop/示意/10-27_示意結案/製作2026-10-27' }] });
  if (!flags.has('empty')) rows = rows.concat(workRows());   // 放在「示意結案」之後，免得被當成最後一張改成結案
  if (flags.has('xss') && rows[0]) {
    const bad = '<img src=x onerror="window.__xss=1">';
    Object.assign(rows[0], { title: bad + '惡意測試卡', org: bad, why: bad, deadline_text: bad, amount_display: bad, first_step: bad,
      quick: [bad], facts: ['欄位：' + bad], warn: [bad], source_url: 'javascript:window.__xss=2', notion_url: 'javascript:window.__xss=3',
      attachments: [{ name: bad, url: 'javascript:window.__xss=4' }],
      status: 'doing', folder_status: 'done', folder_path: '/Users/x/' + bad, decided_at: new Date().toISOString(),
      links: [{ kind: 'pay', label: bad, url: 'javascript:window.__xss=5', amount: bad }, { kind: 'pool', label: bad, path: '/a/' + bad }, { kind: 'review', label: bad, url: 'https://x.test/' + bad }],
      payment_terms: bad, quote_amount: bad, deposit_date: bad, career: { line: bad, public_identity: bad, status_gain: bad, rights: bad, kim_judgment: bad, referrer: bad, est_hours: bad } });
    const g = rows.find(r => r.id === 'work-gone'); if (g) g.drop_note = bad;
    const w = rows.find(r => r.id === 'work-delivered'); if (w) Object.assign(w, { payment_terms: bad, title: bad + '已交件惡意卡', source_site: bad });
  }
  const listeners = new Set();
  const msgs = [{ id: 1, item_id: 'work-doing', kind: 'user', author: 'Borry', body: '客戶說片長要縮到 60 秒', created_at: new Date(Date.now() - 3 * H).toISOString() },
    { id: 2, item_id: 'work-doing', kind: 'daqi', author: '大器', body: '收到，分鏡第二版照 60 秒改，第 4、7 顆合併。', created_at: new Date(Date.now() - 2 * H).toISOString() }];
  if (flags.has('xss')) msgs.push({ id: 3, item_id: null, kind: 'daqi', author: '大器', body: '<img src=x onerror="window.__xss=6">', created_at: new Date().toISOString() });
  // 今天頁的示範資料
  const badH = '<img src=x onerror="window.__xss=7">';
  const hub = { open: [
      { id: 'h1', project: flags.has('xss') ? badH : '木星 TAPIN', question: flags.has('xss') ? badH : '產品段配樂不變速，只有 3 個接點在拍上，能不能接受？', detail: flags.has('xss') ? badH : '扣合那一下不在拍上。\n\n要對拍就得把這段變速到 120 BPM，音色會變。', kind: 'choice', asked_by: flags.has('xss') ? badH : '大器', origin: '巡查待辦', created_at: new Date(Date.now() - 5 * H).toISOString(),
        options: [{ key: 'ok', label: flags.has('xss') ? badH : '接受，不變速', note: flags.has('xss') ? badH : '聽感自然', recommended: true }, { key: 'speed', label: '改成變速對拍' }] },
      { id: 'h2', project: '文化部青年藝術補助', question: '線上申請系統要你本人登入送出', detail: '', kind: 'talk', link: flags.has('xss') ? 'javascript:window.__xss=8' : 'https://example.com/', asked_by: '大器', origin: '大器', created_at: new Date(Date.now() - 26 * H).toISOString(), options: [] }],
    answered: [{ id: 'h0', project: '系統', question: '示範：之前回過的一題', kind: 'choice', asked_by: '大器', origin: '大器', created_at: new Date(Date.now() - 2 * D).toISOString(), options: [{ key: 'ok', label: '照你建議的做' }], status: 'answered', answer_key: 'ok', answer_label: '照你建議的做', answer_note: flags.has('xss') ? badH : '', answer_via: flags.has('xss') ? badH : 'LINE', answer_quote: flags.has('xss') ? badH : '照建議', answered_at: new Date(Date.now() - 20 * H).toISOString(), picked_up_at: new Date(Date.now() - 19 * H).toISOString() }],
    jobs: [{ id: 'j1', agent: flags.has('xss') ? badH : '大器（Claude）', machine: 'Mac', title: flags.has('xss') ? badH : '木星 TAPIN 試看帶', status: 'waiting_mac', updated_at: new Date(Date.now() - 40 * 60e3).toISOString() }],
    events: [{ id: 1, at: new Date(Date.now() - 2 * H).toISOString(), actor: flags.has('xss') ? badH : '大器（Claude）', summary: flags.has('xss') ? badH : '總控台亮相交付，等你定名字、櫃台、開工' }],
    beats: [{ name: flags.has('xss') ? badH : 'Mac 同步', machine: 'MacBook', note: '巡查待辦與交接帳同步', expect_every_s: 300, last_at: new Date(Date.now() - 2 * 60e3).toISOString(), late: false }, { name: '大器 LINE 收訊', machine: 'MacBook', note: '8789 埠有在聽', expect_every_s: 300, last_at: new Date(Date.now() - 3 * H).toISOString(), late: true }] };
  if (flags.has('empty')) { hub.open = []; hub.answered = []; hub.jobs = []; hub.events = []; hub.beats = []; }
  const scans = {};   // 示範：立即掃描叫過的紀錄（示範模式不會真的叫集集）
  const ping = () => listeners.forEach(f => f());
  const find = id => { const r = rows.find(x => x.id === id); if (!r) throw new AdapterError('server', '找不到這筆'); return r; };
  const view = r => { const o = Object.assign({}, r); delete o.full_text; o.has_full_text = !!r.full_text; o.earnings = earn(r); return o; };
  const sorry = () => { if (flags.has('setfail')) throw new AdapterError('server', '伺服器沒有回應'); };
  let nextN = 0;
  const WEEK = 7 * D;

  if (flags.has('live')) setTimeout(() => {
    rows.unshift(Object.assign(toBackend(build()[0]), { id: 'new-' + (++nextN), title: '某縣市觀光宣傳短片', org: '示意資料', is_demo: true, found_by: '皮皮（示意）', created_at: new Date().toISOString() }));
    ping();
  }, 9000);

  return {
    mode: 'mock',
    async list() {
      if (flags.has('hang')) await new Promise(() => {});
      if (flags.has('slow')) await wait(6000);
      await wait(150);
      if (flags.has('offline')) throw new AdapterError('network', '連不上伺服器');
      if (flags.has('auth')) throw new AdapterError('auth', '金鑰不對', 401);
      return { items: rows.filter(r => r.status !== 'closed').map(r => normalize(view(r))), serverTime: Date.now() };
    },
    async hubToday() { await wait(120); return normHub(JSON.parse(JSON.stringify(hub))); },
    async moneySubs() { await wait(150); const d = new Date(), iso = n => { const x = new Date(d.getTime() + n * 864e5); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
      return normMoney({ total_active: 4280, total_company_monthly: 600, items: [
        { id: '1', name: '示意訂閱 A', amount: 390, billing_cycle: 'monthly', monthly_equiv: 390, status: 'active', payer: 'self', account_name: '示意信用卡', next_charge_date: iso(2), days_until: 2 },
        { id: '2', name: '示意訂閱 B（年繳）', amount: 2400, billing_cycle: 'yearly', monthly_equiv: 200, status: 'active', payer: 'self', account_name: '示意信用卡', next_charge_date: iso(5), days_until: 5 },
        { id: '3', name: '示意訂閱 C（公司付）', amount: 600, billing_cycle: 'monthly', monthly_equiv: 600, status: 'active', payer: 'company', next_charge_date: iso(12), days_until: 12 },
        { id: '4', name: '示意訂閱 D', amount: 150, billing_cycle: 'monthly', monthly_equiv: 150, status: 'cancel', payer: 'self', next_charge_date: iso(20), days_until: 20, cancel_by: iso(15) } ] }); },
    async hubAnswer(id, k, note) { await wait(300); sorry();
      const d = hub.open.concat(hub.answered).find(x => x.id === id); if (!d) throw new AdapterError('server', '找不到這筆');
      hub.open = hub.open.filter(x => x.id !== id); hub.answered = hub.answered.filter(x => x.id !== id);
      if (k === null) { Object.assign(d, { status: 'open', answer_key: null, answer_label: null, answer_note: null, answered_at: null, picked_up_at: null }); hub.open.unshift(d); }
      else { const o = (d.options || []).find(x => x.key === k); Object.assign(d, { status: 'answered', answer_key: k, answer_label: o ? o.label : '其他', answer_note: note || '', answered_at: new Date().toISOString(), picked_up_at: null }); hub.answered.unshift(d); }
      return d; },
    async msgs(id) { await wait(120); return normMsgs(msgs.filter(m => (m.item_id || null) === (id || null))); },
    async say(id, body) { await wait(250); sorry(); const m = { id: msgs.length + 1, item_id: id || null, kind: 'user', author: 'Borry', body, created_at: new Date().toISOString() }; msgs.push(m);
      setTimeout(() => { msgs.push({ id: msgs.length + 1, item_id: id || null, kind: 'daqi', author: '大器', body: '（示範）收到：「' + body.slice(0, 30) + '」。真的版本會由 Mac 上的大器回覆。', created_at: new Date().toISOString() }); ping(); }, 2500); return m; },
    async todoAdd(title) { await wait(250); sorry(); const r = Object.assign(workRows()[0], { id: 'todo-n' + (++nextN), basket: 'todo', status: 'new', title, source_site: '待辦', folder_status: 'none', folder_path: null, quote_amount: null, signed: null, deposit_amount: null, final_amount: null, payment_terms: '', career: {}, progress_steps: [], run_status: null, progress_note: '', created_at: new Date().toISOString() }); rows.push(r); return normalize(view(r)); },
    async workAdd(title) { await wait(250); sorry(); const r = Object.assign(workRows()[0], { id: 'work-n' + (++nextN), title, quote_amount: null, signed: null, deposit_amount: null, final_amount: null, payment_terms: '', career: {}, progress_steps: [], run_status: null, progress_note: '', is_demo: false, decided_at: new Date().toISOString() }); rows.push(r); return normalize(view(r)); },
    async scanRequest(basket) { await wait(300); sorry(); const b = { funding: 'fund', achievement: 'honor' }[basket] || basket; if (scans[b] && Date.now() - Date.parse(scans[b].requested_at) < 60e3) return { ok: true, throttled: true }; scans[b] = { status: 'sent', requested_at: new Date().toISOString() }; setTimeout(ping, 50); return { ok: true }; },
    async scanStatus() { await wait(100); return normScan(Object.fromEntries(['company', 'personal', 'other', 'fund', 'honor'].map(b => [b, { open: scans[b] || null, last: b === 'company' ? { done_at: new Date(Date.now() - 5 * H).toISOString(), added: 2 } : null }]))); },
    async history(id) { await wait(150); const r = find(id); return normHistory([{ at: r.created_at || new Date().toISOString(), actor: r.found_by || 'Gig Gig', action: '找到這個機會' }].concat(['doing', 'delivered', 'paid', 'closed'].includes(r.status) ? [{ at: new Date().toISOString(), actor: 'Borry', action: '要做' }] : []).reverse()); },
    async archive(q, year) {
      await wait(200);
      const cl = rows.filter(r => r.status === 'closed'), yr = r => new Date(r.closed_at).getFullYear();
      const hit = cl.filter(r => (!year || yr(r) === +year) && (!q || [r.title, r.short_title, r.org, r.folder_name].join(' ').toLowerCase().includes(String(q).toLowerCase())));
      return { items: hit.map(r => normalize(view(r))), years: [...new Set(cl.map(yr))].sort((a, b) => b - a) };
    },
    async get(id) { await wait(200); return normalize(Object.assign(view(find(id)), { full_text: find(id).full_text })); },
    async act(id, action, o = {}) {
      await wait(450); sorry();
      const r = find(id);
      switch (action) {
        case 'stash': r.status = 'stashed'; r.remind_at = new Date(Date.now() + 18 * H).toISOString(); break;
        case 'unstash': if (r.status !== 'stashed') throw new AdapterError('state', 'not stashed', 400); r.status = 'new'; r.remind_at = null; break;
        case 'deleted': case 'skipped': r.status = 'dropped'; r.drop_reason = action; break;
        case 'restore': if (r.deadline && Date.parse(r.deadline) < Date.now()) throw new AdapterError('state', 'deadline already passed', 400); r.status = 'new'; r.drop_reason = null; break;
        case 'build': {
          if (r.status === 'doing') break;
          r.status = 'doing'; r.folder_status = 'queued';
          const d = new Date(), pad = n => String(n).padStart(2, '0');
          r.folder_name = pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '_' + r.title.replace(/[（）()\s]/g, '').slice(0, 8);
          setTimeout(() => { r.folder_status = 'building'; ping(); }, flags.has('folderslow') ? 4000 : 1200);
          setTimeout(() => { r.folder_status = 'done'; r.folder_path = '（示意資料，沒有建資料夾）'; r.links = [{ kind: 'pool', label: 'Pool（官方文件、標書、成品）', path: '/Users/borry/Desktop/示意/11-16_示意案' }, { kind: 'review', label: '內審（製作過程）', path: '/Users/borry/Desktop/示意/11-16_示意案/製作2026-11-16' }, { kind: 'pay', label: '去領標付款', url: 'https://web.pcc.gov.tw/', amount: 'NT$ 200' }]; ping(); }, flags.has('folderslow') ? 12000 : 3000);
          break;
        }
        case 'work': applyWork(r, o.patch || {}); break;
        case 'run': r.run_status = 'queued'; if (r.basket === 'todo') r.status = 'doing'; msgs.push({ id: msgs.length + 1, item_id: r.id, kind: 'run', author: 'Borry', body: '去執行：' + r.title, created_at: new Date().toISOString() });
          setTimeout(() => { r.run_status = 'running'; r.progress_steps = [{ name: '盤點需求', status: 'current' }, { name: '建置', status: 'pending' }, { name: '驗收', status: 'pending' }]; r.progress_updated_by = 'AI協作'; r.progress_updated_at = new Date().toISOString(); ping(); }, 3000); break;
        case 'deliver': if (!['doing', 'delivered'].includes(r.status)) throw new AdapterError('state', 'cannot go from ' + r.status + ' to delivered', 400);
          if (o.patch) applyWork(r, o.patch); if (r.status === 'doing') { r.status = 'delivered'; r.delivery_date = r.delivery_date || today(); r.delivered_at = r.delivered_at || new Date().toISOString(); } break;
        case 'paid': if (!['delivered', 'paid'].includes(r.status)) throw new AdapterError('state', 'cannot go from ' + r.status + ' to paid', 400);
          if (o.patch) applyWork(r, o.patch); if (r.status === 'paid') break;
          if (r.received_amount == null) throw new AdapterError('state', 'received_amount required for paid (put it in p_patch)', 400);
          r.status = 'paid'; r.paid_at = new Date().toISOString(); break;
        case 'back': { const to = o.to === 'delivered' ? 'delivered' : 'doing';
          if (!((r.status === 'delivered' && to === 'doing') || (r.status === 'paid' && to === 'delivered') || r.status === to)) throw new AdapterError('state', 'cannot go from ' + r.status + ' to ' + to, 400);
          if (r.status !== to) { r.status = to; r.paid_at = null; if (to === 'doing') r.delivered_at = null; } break; }
        case 'close': if (!['doing', 'delivered', 'paid', 'closed'].includes(r.status)) throw new AdapterError('state', 'card is ' + r.status, 400); r.status = 'closed'; r.close_result = o.result; r.closed_at = new Date().toISOString(); break;
        case 'reopen': if (r.status !== 'closed') throw new AdapterError('state', 'card is not closed', 400); r.status = 'doing'; r.close_result = null; r.closed_at = null; break;
        case 'purge': if (!['closed', 'dropped', 'expired', 'doing', 'delivered', 'paid'].includes(r.status)) throw new AdapterError('state', 'cannot purge', 400); if (o.confirm !== r.title && o.confirm !== (r.short_title || r.title)) throw new AdapterError('state', 'confirm text does not match title', 400); rows.splice(rows.indexOf(r), 1); ping(); return null;
        case 'dive': {
          if (r.crawl_status === 'crawling' || (r.crawl_status === 'done' && !o.force)) break;
          r.crawl_status = 'crawling'; r.crawl_error = null;
          setTimeout(() => {
            if (flags.has('crawlfail') || !r.source_url) { r.crawl_status = 'failed'; r.crawl_error = r.source_url ? '對方網站沒有回應，或擋掉了讀取' : '這張卡沒有來源網址'; }
            else { r.crawl_status = 'done'; r.full_text = '# ' + r.title + '\n來源：' + (r.source_site || '') + '\n\n' + r.facts.join('\n') + '\n\n' + (r.warn.length ? '注意事項\n' + r.warn.join('\n') + '\n\n' : '') + '（示範用全文。真後端上線後，這裡會是從公告頁讀回來的原文。）'; }
            ping();
          }, flags.has('crawlhang') ? 24 * H : flags.has('crawlslow') ? 16000 : flags.has('crawlfail') ? 1200 : 2200);
          break;
        }
      }
      return normalize(view(r));
    },
    subscribe(onPing, onState) { listeners.add(onPing); onState(false); return () => listeners.delete(onPing); },
    setKey() {},
  };
}
