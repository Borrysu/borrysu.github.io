/* 逐流 Current v35 主程式（2026-11-22）
   以設計正本 1122_逐流App設計/逐流_App設計v3.html（版面 2 四個房間 × 暮光色塊）的主程式為底，原樣搬過來；
   檔尾「v35 真資料層」把示意資料換成 js/adapter.js 的真資料，動作改呼叫後端。
   一般腳本（不是 module），由 index.html defer 載入；adapter.js 用動態 import 讀。 */

(function(){
'use strict';
const $=s=>document.querySelector(s),esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches);
const LAYOUTS=[[2,'四個房間'],[1,'晨報長流（對照）']];
const SKINS=[[6,'暮光色塊（新）'],[1,'暮光'],[4,'遊樂色塊']];
const STATES=[['ok','正常'],['empty','沒資料'],['loading','載入中'],['error','讀取失敗'],['offline','離線']];
const FONTS={1:'family=Inter:wght@400;500;600&family=Noto+Sans+TC:wght@400;500;700',
 2:'family=DM+Sans:wght@400;500;700&family=EB+Garamond:wght@400;500&family=Noto+Sans+TC:wght@400;500;700&family=Noto+Serif+TC:wght@300;400;700',
 3:'family=Geist:wght@400;500;600&family=Noto+Sans+TC:wght@400;500;700',
 4:'family=Barlow+Condensed:wght@800;900&family=Nunito+Sans:wght@500;700&family=Noto+Sans+TC:wght@500;700;900',
 5:'family=Libre+Caslon+Display&family=Noto+Sans+TC:wght@400;700&family=Noto+Serif+TC:wght@400;700',
 6:'family=Barlow+Condensed:wght@800&family=Inter:wght@400;500;600&family=Noto+Sans+TC:wght@400;500;700;900'};
const ZONE={today:{n:'今天',b:'daqi'},proj:{n:'案子',b:'daqi'},opp:{n:'機會',b:'jiji'},money:{n:'錢',b:'tata'},life:{n:'生活',b:'peng'},daqi:{n:'大器',b:'daqi'}};
const FRESH={daqi:'14:05 更新',jiji:'8:00 整理',tata:'昨天 21:40 對帳',peng:'剛剛同步'};
const ICON={today:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
 river:'<path d="M3 8c3-2 6 2 9 0s6-2 9 0M3 13c3-2 6 2 9 0s6-2 9 0M3 18c3-2 6 2 9 0s6-2 9 0"/>',
 home:'<path d="M4 11l8-7 8 7v9H4zM10 20v-6h4v6"/>',
 proj:'<path d="M4 10h16v9H4zM4 10l1-4h15l-1 4M8 6l2 4M13 6l2 4"/>',
 opp:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 12l6-6"/>',
 money:'<circle cx="12" cy="12" r="8"/><path d="M9.5 9.5c.4-1 1.4-1.5 2.5-1.5 1.4 0 2.5.8 2.5 2s-1 1.7-2.5 2-2.5.8-2.5 2 1.1 2 2.5 2c1.1 0 2.1-.5 2.5-1.5M12 6.5V8M12 16v1.5"/>',
 life:'<path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14zM5 19l7-7"/>',
 daqi:'<path d="M4 5h16v11H10l-5 4v-4H4z"/>'};
const BOTS={
 daqi:{name:'大器',mono:'器',zone:'今天、專案',role:'今天與專案我盯。你在這裡說的話，只有我本人回，不會讓別人代答。',beat:'2 分鐘前報到',cmds:['現在卡在哪一件','幫我排今天的先後','把這件記進待辦'],can:'問進度、交辦、記待辦、代記你在 LINE 說過的答案',cant:'付款、刪檔、對外發訊，這三種要你在對話裡親口說'},
 jiji:{name:'集集',grok:'Gig Gig',mono:'集',zone:'機會',role:'機會頁歸我：找案、讀公告、把重點整理成卡片。',beat:'6 分鐘前報到',cmds:['立即掃描新機會','只找創作資金','這週截止的整理給我'],can:'掃描、讀完整公告、整理重點、建案子資料夾',cant:'領標付款、報名繳費、替你送件'},
 tata:{name:'塔塔',grok:'Tal Tal',mono:'塔',zone:'錢',role:'錢頁歸我：訂閱、待收款、對帳。',beat:'1 小時前報到',cmds:['這個月固定支出多少','到期前提醒我取消示意訂閱 D','待收款列給我'],can:'記帳、對帳、扣款與到期提醒、整理待收款',cant:'付款、轉帳、替你取消訂閱'},
 peng:{name:'朋朋',grok:'Pom Pom',mono:'朋',zone:'生活',role:'生活頁可以交給我：例行提醒、備品清單。',beat:'還沒接上',cmds:['該做的提醒我','列這週購物清單','把要買的備進購物車'],can:'記例行、到期提醒、改備品清單、把要買的備進購物車',cant:'下單付款、刪掉你的紀錄'}
};
const DB={
 dec:[
  {id:'h1',proj:'木星 TAPIN',q:'產品段配樂不變速，只有 3 個接點在拍上，能不能接受？',detail:'扣合那一下不在拍上。要對拍就得把這段變速到 120 BPM，音色會變。',kind:'choice',by:'大器',origin:'巡查待辦',ago:'5 小時前',opts:[{k:'ok',label:'接受，不變速',note:'聽感自然',rec:1},{k:'speed',label:'改成變速對拍',note:'音色會變'}]},
  {id:'h3',proj:'某品牌形象短片（示意）',q:'分鏡第二版客戶兩天沒回，要不要先照這版排拍攝日？',detail:'客戶已讀沒回。先排的話，之後改動超過三場就要重排。',kind:'choice',by:'大器',origin:'專案進度',ago:'1 小時前',opts:[{k:'wait',label:'再等一天，明天中午提醒我',note:'改動風險最小',rec:1},{k:'go',label:'先照第二版排',note:'可能要重排'},{k:'draft',label:'幫我擬一句催客戶的話',note:'只擬稿，不代發'}]},
  {id:'h2',proj:'文化部青年藝術補助',q:'線上申請系統要你本人登入才能送件',detail:'資料都備好了，AI 自查完成，等你決定。登入與按下送件只能你本人做。',kind:'talk',by:'大器',origin:'大器',ago:'26 小時前',link:'https://example.com/',opts:[]}
 ],
 jobs:[
  {id:'j1',bot:'daqi',who:'大器（Claude）',title:'木星 TAPIN 試看帶',st:'等 Mac 開機',wait:true,ago:'40 分鐘前'},
  {id:'j2',bot:'jiji',who:'集集',title:'掃描創作資金新公告',st:'進行中',ago:'6 分鐘前'}
 ],
 events:[
  {at:'2 小時前',who:'大器（Claude）',bot:'daqi',text:'總控台亮相交付，等你定名字、櫃台、開工'},
  {at:'昨天 21:40',who:'塔塔',bot:'tata',text:'本月訂閱對帳，AI 自查完成，等你決定示意訂閱 D 要不要留'},
  {at:'昨天 18:02',who:'集集',bot:'jiji',text:'找到 2 張新機會，放進創作資金'},
  {at:'昨天 11:15',who:'大器（Claude）',bot:'daqi',text:'木星 TAPIN 初剪上傳到試看資料夾'}
 ],
 beats:[
  {name:'Mac 同步',note:'巡查待辦與交接帳同步',late:false,ago:'2 分鐘前'},
  {name:'大器 LINE 收訊',note:'8789 埠有在聽',late:true,ago:'3 小時前，該 5 分鐘一次'},
  {name:'集集 找案',note:'每 3 小時掃一次',late:false,ago:'6 分鐘前'},
  {name:'塔塔 記帳',note:'每天對帳一次',late:false,ago:'1 小時前'}
 ],
 proj:[
  {id:'p1',g:'need',short:'品牌短片',title:'某品牌形象短片導演（示意）',next:'分鏡第二版寫好，等客戶回。',steps:['讀客戶 brief','分鏡第一版','分鏡第二版','排拍攝日','拍攝','交片'],cur:2,due:'剩 3 天交分鏡',urg:true,who:'大器（Claude）',money:'報價 NT$ 120,000',hist:['今天 13:02　大器：分鏡第二版寫好','昨天 16:40　你：第一版第三場太滿','11/19　大器：建好案子資料夾']},
  {id:'p4',g:'doing',title:'新歌 demo：副歌詞第二版（示意）',next:'詞第二版改完，編曲等你聽過再動。',steps:['主歌詞','副歌詞','編曲','錄 demo'],cur:1,due:'沒有期限',who:'大器（Claude）',money:'自己的作品',hist:['昨天 23:10　你：副歌第二句太白','11/20　大器：整理三個押韻方向']},
  {id:'p2',g:'delivered',title:'AI 影片比賽代製（示意）',next:'已交件 2 天，等對方付款。',steps:['製作','交件','收款'],cur:2,due:'約定 11/30 前付',who:'塔塔盯收款',money:'待收 NT$ 30,000',hist:['11/20　交件','11/12　簽約']},
  {id:'p3',g:'paid',title:'工作坊講師鐘點（示意）',next:'已收款，扣繳後實收 NT$ 7,200。',steps:['授課','收款'],cur:2,due:'11/17 入帳',who:'塔塔已對帳',money:'實收 NT$ 7,200',hist:['11/17　入帳 NT$ 7,200','11/02　授課 4 小時']}
 ],
 todo:[
  {id:'t1',title:'建一個報價單產生器（示意）',next:'每次報價都要重打，想要填幾個欄位就出 PDF。',st:'還沒開始'},
  {id:'t2',title:'把 IG 貼文排程接上 Notion（示意）',next:'查完 IG API，正在寫串接。',st:'進行中',steps:['查 IG API','寫串接','測一篇'],cur:1}
 ],
 arch:[{id:'a1',title:'婚禮紀錄側拍（示意）',next:'日期撞期，沒接。',st:'沒接'}],
 opp:[
  {id:'ncafroc',b:'honor',title:'國藝會國際文化交流 第 6 期',org:'國藝會',amt:'沒寫金額',days:1,due:'明天截止',why:'你去年提過想帶作品出國放映。',facts:['補助出國展演、放映、駐村的機票與住宿','個人與團體都能申請','線上系統送件'],warn:['明天 23:59 截止，要先註冊帳號']},
  {id:'honor',b:'honor',title:'某影展短片單元評審邀請（示意）',org:'示意資料',amt:'酬勞沒寫',days:4,due:'4 天後截止',why:'對方直接來信邀請。',facts:['評審 12 支短片','線上看片，一場線上會議'],warn:['酬勞沒寫，回信前先問清楚']},
  {id:'pro360kh',b:'personal',title:'高雄 80 組簡報轉 Reel',org:'PRO360 個人案主',amt:'NT$ 5,000～10,000',days:4,due:'4 天後收走',exp:true,why:'量大但單價低，適合套版。',facts:['80 組簡報各轉一支直式短片','素材對方提供'],warn:['單支換算不到 NT$ 125']},
  {id:'pro360cy',b:'personal',title:'嘉義童裝直播 Reels 剪輯',org:'PRO360 公司案主',amt:'詳談後報價',days:5,due:'5 天後收走',exp:true,why:'長期合作型，每週固定量。',facts:['每週 3 支直播精華','長期配合'],warn:['報價沒寫，要先問']},
  {id:'song',b:'personal',title:'獨立歌手 MV 詞曲委託（示意）',org:'示意資料',amt:'報價 NT$ 3 萬',days:6,due:'6 天後收走',exp:true,why:'詞曲加 MV 一起，跟你的本業最貼。',facts:['一首歌的詞曲','MV 另談'],warn:[]},
  {id:'artefact',b:'fund',title:'Artefact AI Film Festival 第三屆',org:'Artefact',amt:'大獎 € 10,000',days:17,due:'17 天後截止',why:'AI 短片可投，你手上有現成作品。',facts:['AI 生成短片競賽','片長 5 分鐘內','線上投件'],warn:['報名費 € 25，你按付款鈕才付'],pay:'報名費 € 25'},
  {id:'moclang',b:'fund',title:'文化部語言友善環境及創作應用補助',org:'文化部',amt:'補助最高 NT$ 100 萬',days:23,due:'23 天後截止',why:'台語創作可以申請。',facts:['本土語言創作與應用','補助上限 100 萬','要附企劃書與預算表'],warn:['企劃書要 20 頁內']},
  {id:'chroma',b:'fund',title:'Chroma Awards 第二季',org:'ElevenLabs 孵化',amt:'MV 類獎金 US$ 24,000',days:53,due:'53 天後截止',why:'有 MV 類別。',facts:['AI 影片、MV、遊戲三類','線上投件'],warn:[]},
  {id:'tkfan',b:'other',title:'異世界企劃宣傳片後製',org:'Tasker',amt:'預算 NT$ 3 萬',days:6,due:'6 天後收走',exp:true,why:'純後製，時間可控。',facts:['宣傳片後製一支','素材已拍好'],warn:[]},
  {id:'tkmil',b:'other',title:'軍事 YouTube 長片剪輯',org:'Tasker',amt:'每支 NT$ 2,000～3,000',days:6,due:'6 天後收走',exp:true,why:'單價低，列出來讓你知道有這類。',facts:['每支 20 分鐘上下','每月 4 支'],warn:['單價偏低']},
  {id:'tycg',b:'fund',title:'桃園市文化局 116 年補助影視製作',org:'桃園市文化局',amt:'補助上限 NT$ 80 萬',days:30,due:'30 天後截止',st:'snoozed',why:'之前暫存。',facts:['影視製作補助'],warn:[]},
  {id:'flick',b:'fund',title:'Flick AI 影展',org:'FlickArt',amt:'首獎 US$ 10,000',days:40,due:'40 天後截止',st:'snoozed',why:'之前暫存。',facts:['AI 影展徵件'],warn:[]}
 ],
 subs:[
  {id:'s1',name:'示意訂閱 A',amt:390,cyc:'每月',in:2,payer:'自付'},
  {id:'s2',name:'示意訂閱 B（年繳）',amt:2400,cyc:'每年，月均 200',in:5,payer:'自付'},
  {id:'s3',name:'示意訂閱 C',amt:600,cyc:'每月',in:12,payer:'公司付'},
  {id:'s4',name:'示意訂閱 D',amt:150,cyc:'每月',in:20,payer:'自付',cancel:'想取消，15 天內要處理'}
 ],
 rout:[
  {id:'r1',name:'澆花',ago:4,cyc:3},{id:'r2',name:'洗冷氣濾網',ago:41,cyc:30},{id:'r3',name:'剪頭髮',ago:20,cyc:35},{id:'r4',name:'換床單',ago:9,cyc:14},{id:'r5',name:'換牙刷',ago:30,cyc:90}
 ],
 sup:[
  {id:'u1',name:'防曬乳',cat:'保養',buy:true,last:'10/02'},{id:'u2',name:'乳清',cat:'健身補充',buy:true,last:'10/20'},{id:'u3',name:'魚油',cat:'健身補充',buy:true,last:'9/28'},
  {id:'u4',name:'洗面乳',cat:'保養',last:'11/05'},{id:'u5',name:'化妝水',cat:'保養',last:'10/30'},{id:'u6',name:'乳液',cat:'保養',last:'11/01'},
  {id:'u7',name:'肌酸',cat:'健身補充',last:'11/10'},{id:'u8',name:'沐浴乳',cat:'沐浴',last:'11/12'},{id:'u9',name:'雞胸肉',cat:'超市補貨',last:'11/18'},{id:'u10',name:'燕麥',cat:'超市補貨',last:'11/08'},{id:'u11',name:'無糖豆漿',cat:'超市補貨',last:'11/19'}
 ],
 deleted:[]
};
const BASK={personal:'個人案',fund:'創作資金',honor:'影展比賽',other:'非本業'};
const S={layout:2,skin:6,st:'ok',tab:'today',sub:{proj:'proj',opp:'all',life:'rout'},filt:'all',sheet:null,page:null,open:{},more:{},bound:false,thread:[],done:[],err:''};
const H=[];let usedH=false,undoFn=null,toastT=0,after=null,scrollY={},lastTab='today';
try{const q=new URLSearchParams(location.search);const sv=JSON.parse(localStorage.getItem('zl3')||'{}');
 S.layout=+(q.get('layout')||sv.layout||2);S.skin=+(q.get('skin')||sv.skin||6);S.st=q.get('state')||'ok';
 if(q.get('tab'))S.tab=q.get('tab');if(q.get('bound'))S.bound=true}catch(e){}
if(!LAYOUTS.some(l=>l[0]===S.layout))S.layout=2;if(!SKINS.some(l=>l[0]===S.skin))S.skin=6;

/* ---------- 取資料（依原型狀態） ---------- */
const E=()=>S.st==='empty';
const decs=()=>E()?[]:DB.dec.filter(d=>!d.done);
const jobs=()=>E()?[]:DB.jobs;
const evts=()=>E()?[]:DB.events;
const late=()=>E()?[]:DB.beats.filter(b=>b.late);
const projs=g=>E()?[]:DB.proj.filter(p=>!g||p.g===g);
const opps=f=>{if(E())return[];let a=DB.opp.filter(o=>!o.gone);if(f==='snoozed')return a.filter(o=>o.st==='snoozed');a=a.filter(o=>o.st!=='snoozed');if(f&&f!=='all')a=a.filter(o=>o.b===f);return a.sort((x,y)=>x.days-y.days)};
const subs=()=>E()?[]:DB.subs;
const routs=()=>E()?[]:DB.rout.slice().sort((a,b)=>(b.ago/b.cyc)-(a.ago/a.cyc));
const sups=()=>E()?[]:DB.sup;
const over=()=>routs().filter(r=>r.ago>=r.cyc);
const tobuy=()=>sups().filter(u=>u.buy);
const due7=()=>subs().filter(s=>s.in<=7&&s.payer==='自付');
const nt=n=>'NT$ '+Number(n).toLocaleString('en-US');
let monthSelf=()=>subs().filter(s=>s.payer==='自付').reduce((a,s)=>a+(s.cyc.indexOf('年')>-1?200:s.amt),0);
const urgentProj=()=>projs().find(p=>p.urg);
const badge=t=>({today:decs().length,proj:projs('need').length,opp:opps('all').length,money:due7().length,life:over().length+tobuy().length}[t]||0);
const tabsOf=()=>S.layout===3?['today','proj','daqi']:['today','proj','opp','money','life'];

/* ---------- 小零件 ---------- */
const AVEYE='<rect class="ey" x="15.2" y="8.6" width="3.6" height="8" rx="1.8"/><rect class="ey" x="21.4" y="8.6" width="3.6" height="8" rx="1.8"/>';
const AV={jiji:'<rect class="bd" x="2" y="2" width="28" height="28" rx="8.5"/>'+AVEYE,
 tata:'<circle class="bd" cx="16" cy="16" r="14.5"/><ellipse class="hl" cx="9.5" cy="8.5" rx="4" ry="2.4" transform="rotate(-38 9.5 8.5)"/>'+AVEYE,
 peng:'<circle class="bd" cx="16" cy="16" r="14.5"/><ellipse class="hl" cx="9.5" cy="8.5" rx="4" ry="2.4" transform="rotate(-38 9.5 8.5)"/>'+AVEYE};
const BFP={daqi:'daqi',jiji:'gig',tata:'tata',peng:'pompom'},BFC={daqi:'#a37aff',jiji:'#4d86ff',tata:'#ff6700',peng:'#00b351'};
const bm=(b,m,c)=>window.BotFace&&BFP[b]?`<span class="bm bf${c?' '+c:''}" data-b="${b}"${m?` data-m="${m}"`:''} aria-hidden="true"></span>`:AV[b]?`<span class="bm av" data-b="${b}" aria-hidden="true"><svg viewBox="0 0 32 32" focusable="false">${AV[b]}</svg></span>`:`<span class="bm" data-b="${b}" aria-hidden="true">${BOTS[b].mono}</span>`;
const chip=(t,u)=>`<span class="chip${u?' urg':''}">${u?'▲ ':''}${esc(t)}</span>`;
const B=(label,act,id,cls,x)=>`<button class="btn ${cls||''}" data-act="${act}"${id!=null?` data-id="${esc(id)}"`:''}${x||''}>${label}</button>`;
const sh=(b,title,small,more)=>`<div class="sh">${b?shF(b):''}<h2>${title}${small?`<small>${small}</small>`:''}</h2>${more||''}</div>`;
const moreB=(label,act,id)=>`<button class="more" data-act="${act}" data-id="${id}">${label} ›</button>`;
const emptyBox=(big,p,btn)=>`<div class="card empty"><div class="big">${big}</div>${btn?`<div class="btns">${btn}</div>`:''}</div>`;
function zoneHead(z,sum){const b=ZONE[z].b,bot=BOTS[b];
 const st=b==='peng'&&!S.bound?'還沒綁定':FRESH[b];
 return `<div class="zh" data-z="${z}"><h1>${ZONE[z].n}</h1><p class="zown">${bot.name}的房間・${st}</p><p class="sum">${sum}</p>${z==='proj'?`<div class="btns zadv">${dinB('')}<span class="lbl">軍師，只給判斷不動手</span></div>`:''}</div>`}
function skeleton(){return `<div aria-busy="true"><span class="vh">載入中</span><div class="sk" style="height:38px;width:46%;margin-top:26px"></div><div class="sk" style="height:18px;width:82%;margin-top:14px"></div><div class="sk" style="height:68px;margin-top:20px"></div><div class="sk" style="height:170px;margin-top:26px"></div><div class="sk" style="height:60px;margin-top:12px"></div><div class="sk" style="height:60px;margin-top:12px"></div></div>`}
function errorBox(z){const n=ZONE[z].n;const why=z==='money'?'這把鑰匙讀不到錢頁，錢頁只有你本人的鑰匙能看。':'連不上資料庫，可能是網路或資料庫睡著了。上次成功是 14:05。';
 return `<div class="zh" data-z="${z}"><h1>${n}</h1></div><div class="card empty" role="alert" style="margin-top:16px"><div class="big">▲ ${n}讀不到</div><p>${why}</p><div class="btns">${B('再讀一次','retry',null,'pri')}</div></div>`}

/* ---------- 等你拍板 ---------- */
function decActs(d){
 if(d.kind==='talk')return `<div data-dec="${esc(d.id)}"><p class="note">這件要登入和按下送件，面板不給按鈕，只能你本人做。資料備好了：AI 自查完成，等你決定。</p><div class="btns">${B('打開申請網站 ↗','ext',d.id,'pri')}${B('到對話回大器一句','talk',d.id)}${B('我已經弄好了','pick',d.id,'ghost',' data-k="_done"')}</div></div>`;
 const rec=d.opts.find(o=>o.rec)||d.opts[0],rest=d.opts.filter(o=>o!==rec);
 let h=`<div class="btns"><button class="btn pri big" data-act="pick" data-id="${esc(d.id)}" data-k="${esc(rec.k)}"><span>${esc(rec.label)}</span><small>${rec.note?'推薦・'+esc(rec.note):'推薦'}</small></button></div>`;
 if(S.more[d.id])h+=`<div class="btns">${rest.map(o=>`<button class="btn" data-act="pick" data-id="${esc(d.id)}" data-k="${esc(o.k)}">${esc(o.label)}</button>`).join('')}</div><label class="f">寫別的做法<textarea rows="2" placeholder="例：先給我聽兩版再說"></textarea></label>${S.err===d.id?'<p class="err" role="alert">▲ 先寫一句你要的做法，再交給大器。</p>':''}<div class="btns">${B('照我寫的做','pickalt',d.id)}</div>`;
 else h+=`<div class="btns">${B(`其他 ${rest.length} 個做法，或自己寫`,'more',d.id,'ghost',' aria-expanded="false"')}</div>`;
 return `<div data-dec="${esc(d.id)}">${h}</div>`}
function decCard(d){return `<article class="card" data-card="${esc(d.id)}"><div class="meta">${bm('daqi','thinking','sm')}${chip(d.proj)}<span class="lbl">${esc(d.by)}問・${esc(d.ago)}</span></div><h3>${esc(d.q)}</h3>${d.detail?`<p>${esc(d.detail)}</p>`:''}${decActs(d)}<div class="btns" style="margin-top:4px">${B('來龍去脈 ›','sheet','why:'+d.id,'ghost')}${dinB('dec:'+d.id)}</div></article>`}
function decRow(d){const op=!!S.open[d.id];return `<div class="rowi" data-card="${esc(d.id)}"><button class="rowb" data-act="open" data-id="${esc(d.id)}" aria-expanded="${op}">${bm('daqi','thinking')}<span class="tx"><b>${esc(d.q)}</b><small>${esc(d.proj)}・${esc(d.ago)}</small></span><span class="rt"><span class="chev" aria-hidden="true">${op?'⌃':'⌄'}</span></span></button>${op?`<div class="rowx">${d.detail?`<p class="note" style="margin-top:0">${esc(d.detail)}</p>`:''}${decActs(d)}</div>`:''}</div>`}
function jobList(){const j=jobs();if(!j.length)return `<div class="card"><p>現在沒有在跑的工作。交辦之後會出現在這裡。</p></div>`;
 return `<div class="rows">`+j.map(x=>`<div class="rowi"><div class="rowb">${bm(x.bot)}<span class="tx"><b>${esc(x.title)}</b><small>${esc(x.who)}・${esc(x.ago)}</small></span><span class="rt">${chip(x.st,x.wait)}</span></div></div>`).join('')+`</div>`}
function evtList(n){const e=evts().slice(0,n);if(!e.length)return `<div class="card"><p>還沒有做完的紀錄。</p></div>`;
 return `<div class="rows">`+e.map(x=>`<div class="rowi"><div class="rowb">${bm(x.bot)}<span class="tx"><b style="font-weight:500;white-space:normal">${esc(x.text)}</b><small>${esc(x.who)}・${esc(x.at)}</small></span></div></div>`).join('')+`</div>`}
function saySum(){const n=decs().length,p=urgentProj(),l=late().length;
 if(!n&&!p&&!l)return '現在沒有等你的事，可以放心去忙。';
 return [n?`有 <b>${n} 件</b>等你<i class="sx">拍板</i>`:'沒有要拍板的',p?`<b>${esc(p.short||p.title)}</b>${p.due}`:'',l?`<b>${l} 支</b>程式沒報到`:''].filter(Boolean).join('，')+'。'}
function statRow(){const n=decs().length,p=urgentProj(),l=late().length;
 return `<div class="stats"><button class="stat${n?' urg':''}" data-act="jump" data-id="secDec"><b class="tick">${n}</b><span>件等你拍板</span></button><button class="stat" data-act="tab" data-id="proj"><b>${p?'3 天':'0'}</b><span>${p?'最急的交件':'沒有急件'}</span></button><button class="stat${l?' urg':''}" data-act="sheet" data-id="beats"><b>${l?'▲ '+l:'●'}</b><span>${l?'支沒報到':'程式都正常'}</span></button></div>`}
const hero=()=>`<div class="hero"><div class="date">11 月 22 日　週日</div><h1>午安，老大。</h1><p class="say">${saySum()}</p>${statRow()}</div>`;

/* ---------- 各區摘要（長流、房間牆、河共用） ---------- */
function zsum(z){
 if(z==='proj'){const p=projs(),u=urgentProj();return {n:projs('need').length,u:'件要你看',s:u?`${u.short}${u.due}`:'沒有急件',b:`進行中 ${projs('doing').length}・等收款 ${projs('delivered').length}`,none:!p.length,hot:projs('need').length>0}}
 if(z==='opp'){const a=opps('all');return {n:a.length,u:'張待看',s:a.length?`最急：${a[0].org}，${a[0].due}`:'現在沒有新機會',b:'比昨天多 2 張',none:!a.length,hot:a.some(o=>o.days<=3)}}
 if(z==='money'){const d=due7();return {n:nt(monthSelf()),sm:1,u:'本月固定支出',s:d.length?`7 天內扣 ${d.length} 筆`:'7 天內沒有要扣的',b:'上月 NT$ 890，少 150',none:!subs().length,hot:subs().some(x=>x.cancel&&x.in<=3)}}
 const o=over(),t=tobuy();return {n:o.length+t.length,u:'件該顧了',s:o.length?`${o[0].name}超過 ${o[0].ago-o[0].cyc} 天`:'例行都顧好了',b:`${t.length} 樣要買・例行 ${routs().length} 項`,none:!routs().length,hot:o.length>0}}
function oppRow(o){return `<div class="rowi" data-card="${esc(o.id)}"><button class="rowb" data-act="sheet" data-id="opp:${o.id}">${bm('jiji')}<span class="tx"><b>${esc(o.title)}</b><small>${esc(o.amt)}・${BASK[o.b]}</small></span><span class="rt">${chip(o.due,o.days<=4)}<span class="chev" aria-hidden="true">›</span></span></button></div>`}
function routRow(r,short){const ov=r.ago>=r.cyc,pct=Math.min(100,Math.round(r.ago/r.cyc*100));
 return `<div class="rowi" data-card="${esc(r.id)}"><div class="rowb" style="align-items:flex-start"><button class="tx" data-act="sheet" data-id="rout:${r.id}" style="min-height:44px"><b>${esc(r.name)}　<span class="num">${r.ago}</span> 天前</b><small>${ov?`▲ 超過 ${r.ago-r.cyc} 天・`:''}每 ${r.cyc} 天一次${short?'':'・點這裡改日期'}</small><span class="bar${ov?' over':''}"><i style="width:${pct}%"></i></span></button><span class="rt">${B('剛做完','done',r.id,ov?'pri':'')}</span></div></div>`}

/* ---------- 版面 1：晨報長流 ---------- */
function homeL1(){const d=decs(),p=projs().filter(x=>x.g==='need'||x.g==='doing').slice(0,2),o=opps('all'),m=zsum('money'),ov=routs().slice(0,1),tb=tobuy();
 const first=d[0],rest=d.slice(1);
 return hero()+todayStrip()+`<div class="cols"><div>
 <section class="sec" id="secDec">${sh('daqi','等你拍板',d.length+' 件')}${first?`<div class="stack stg">${decCard(first)}${rest.length?`<div class="rows">${rest.map(decRow).join('')}</div>`:''}</div>`:emptyBox('都拍完了','沒有等你決定的事。有新的會出現在這裡，也會推 LINE。')}</section>
 <section class="sec">${sh('daqi','案子下一步',FRESH.daqi,moreB('看全部 '+projs().length,'tab','proj'))}${p.length?`<div class="rows">${p.map(x=>`<div class="rowi"><button class="rowb" data-act="sheet" data-id="proj:${x.id}">${bm('daqi')}<span class="tx"><b>${esc(x.title)}</b><small>${esc(x.next)}</small></span><span class="rt">${x.urg?chip(x.due.replace('交分鏡',''),1):''}<span class="chev" aria-hidden="true">›</span></span></button></div>`).join('')}</div>`:emptyBox('還沒有案子','跟大器說一聲，就會開一個案子。',aiF('daqi','new:proj'))}</section>
 </div><div>
 <section class="sec">${sh('jiji','新機會',FRESH.jiji,moreB('看全部 '+o.length,'tab','opp'))}${o.length?`<div class="rows">${o.slice(0,3).map(oppRow).join('')}</div>`:emptyBox('現在沒有新機會','集集每 3 小時掃一次，也可以現在叫它。',aiF('jiji','','',{do:'cmd',arg:'jiji:立即掃描新機會'}))}</section>
 <section class="sec">${sh('tata','本月的錢',FRESH.tata,moreB('看全部','tab','money'))}${m.none?emptyBox('還沒有訂閱資料','請塔塔把訂閱匯進來，之後每筆扣款前會先提醒。',aiF('tata','','',{do:'cmd',arg:'tata:匯入訂閱'})):`<div class="card"><div class="kline"><b>${m.n}</b><span>${m.u}・${m.b}</span></div><p>${m.s}${due7().length?'：'+due7().map(s=>`${esc(s.name)} ${s.in} 天後 ${nt(s.amt)}`).join('、'):''}</p></div>`}</section>
 <section class="sec">${sh('peng','生活',S.bound?FRESH.peng:'還沒綁定朋朋',moreB('看全部','tab','life'))}${ov.length?`<div class="rows">${ov.map(r=>routRow(r,1)).join('')}${tb.length?`<div class="rowi"><button class="rowb" data-act="lifesub" data-id="sup">${bm('peng')}<span class="tx"><b>${tb.length} 樣要買</b><small>${tb.map(u=>esc(u.name)).join('、')}</small></span><span class="rt"><span class="chev" aria-hidden="true">›</span></span></button></div>`:''}</div>`:emptyBox('還沒有例行事項','加第一項，例如澆花、剪頭髮，之後點一下就歸零。',B('新增第一項例行','add',null,'pri'))}</section>
 <section class="sec">${sh('','最近做完','',moreB('看全部','page','events'))}${evtList(2)}</section>
 </div></div>`}

/* ---------- 版面 2：四個房間 ---------- */
function homeL2(){const d=decs(),f=d[0],l=late().length;let band;
 if(f){const rec=f.kind==='talk'?null:(f.opts.find(o=>o.rec)||f.opts[0]);
  band=`<section class="band" id="secDec" data-card="${esc(f.id)}"><div class="bandtop"><span class="lbl who">${bm('daqi','thinking')}等你拍板・<span class="tick">${d.length}</span> 件・${esc(f.proj)}</span><span class="lbl">${esc(f.ago)}</span></div><h2>${esc(f.q)}</h2>${rec?`<div class="btns"><button class="btn pri big" data-act="pick" data-id="${esc(f.id)}" data-k="${esc(rec.k)}"><span>${esc(rec.label)}</span><small>${rec.note?'推薦・'+esc(rec.note):'推薦'}</small></button></div><div class="btns">${B('看其他做法與來龍去脈','sheet','dec:'+f.id,'ghost')}${dinB('dec:'+f.id)}</div>`:`<p style="margin-top:6px">只能你本人登入送件，面板不給按鈕。</p><div class="btns">${B('看怎麼處理','sheet','dec:'+f.id,'pri')}</div>`}</section>`}
 else band=`<section class="card" style="margin-top:14px"><h3>都拍完了</h3><p>沒有等你決定的事。有新的會出現在這裡，也會推 LINE。</p></section>`;
 const rooms=['proj','opp','money','life'].map(z=>{const s=zsum(z),b=ZONE[z].b;
  return `<button class="room" data-act="room" data-id="${z}" data-z="${z}" data-hot="${s.hot&&!s.none?1:0}"><span class="rh">${bm(b,'z')}${ZONE[z].n}<small>${BOTS[b].name}</small></span><span class="rn${s.sm?' sm':''}">${s.none?'0':s.n}</span><span class="rs"><b>${s.hot&&!s.none?'▲ ':''}${s.u}</b><br>${s.none?'還沒有資料，進去看怎麼開始':esc(s.s)}</span><small class="rb">${s.none?'':esc(s.b)}</small></button>`}).join('');
 return `<div class="zh" data-z="today" style="background:none;padding:14px 2px 0;color:var(--ink)"><p class="lbl">11 月 22 日　週日</p><h1 style="margin-top:4px">午安，老大。</h1></div>${band}${todayStrip()}
 <div class="btns" style="margin-top:8px"><button class="btn${l?' warn':' ghost'} wide" data-act="sheet" data-id="beats" style="justify-content:space-between"><span>${l?`▲ <b>${l} 支</b>程式沒報到`:'● 程式都正常報到'}</span><span>看燈號 ›</span></button></div>
 <div class="wall stg">${rooms}</div>
 <div class="cols"><section class="sec">${sh('','正在跑',jobs().length+' 件')}${jobList()}</section><section class="sec">${sh('','最近做完','',moreB('看全部','page','events'))}${evtList(2)}</section></div>`}

/* ---------- 版面 3：一條河 ---------- */
function riverItems(){const a=[];
 decs().forEach((d,i)=>a.push({z:'dec',b:'daqi',t:d.q,s:d.proj+'・'+d.ago,c:'要拍板',u:1,k:-10+i,id:'dec:'+d.id,card:d.id}));
 over().forEach(r=>a.push({z:'life',b:'peng',t:`${r.name}該做了`,s:`${r.ago} 天前・每 ${r.cyc} 天一次`,c:`超過 ${r.ago-r.cyc} 天`,u:1,k:0,id:'rout:'+r.id,card:r.id}));
 projs().filter(p=>p.g==='need'||p.g==='doing').forEach(p=>a.push({z:'proj',b:'daqi',t:p.title,s:p.next,c:p.urg?'剩 3 天':'沒有期限',u:p.urg,k:p.urg?3:60,id:'proj:'+p.id}));
 opps('all').forEach(o=>a.push({z:'opp',b:'jiji',t:o.title,s:o.amt+'・'+BASK[o.b],c:o.due,u:o.days<=4,k:o.days,id:'opp:'+o.id,card:o.id}));
 subs().filter(s=>s.payer==='自付').forEach(s=>a.push({z:'money',b:'tata',t:`${s.name} 要扣 ${nt(s.amt)}`,s:s.cyc+(s.cancel?'・'+s.cancel:''),c:`${s.in} 天後扣`,u:s.in<=2,k:s.in,id:'sub:'+s.id}));
 const t=tobuy();if(t.length)a.push({z:'life',b:'peng',t:`${t.length} 樣備品要買`,s:t.map(u=>u.name).join('、'),c:'要買',k:8,id:'lifesup'});
 return a.sort((x,y)=>x.k-y.k)}
function homeL3(){const all=riverItems(),f=S.filt,its=f==='all'?all:all.filter(i=>i.z===f);
 const F=[['all','全部'],['dec','拍板'],['proj','案子'],['opp','機會'],['money','錢'],['life','生活']];
 const cnt=k=>k==='all'?all.length:all.filter(i=>i.z===k).length;
 let head='';
 if(f!=='all'&&f!=='dec'){const s=zsum(f),b=ZONE[f].b;head=`<div class="card" style="margin-top:12px"><div class="li"><div><div class="kline"><b>${s.none?'0':s.n}</b><span>${s.u}</span></div><p>${s.none?'還沒有資料':esc(s.s)+'・'+esc(s.b)}</p></div>${bm(b)}</div><div class="btns">${B(`進${ZONE[f].n}全頁 ›`,'page','zone:'+f,'pri')}</div></div>`}
 const rows=its.map(i=>`<div class="rowi" data-card="${i.card||''}"><button class="rowb" data-act="${i.id==='lifesup'?'page':'sheet'}" data-id="${i.id==='lifesup'?'zone:life:sup':i.id}">${bm(i.b)}<span class="tx"><b>${esc(i.t)}</b><small>${esc(i.s)}</small></span><span class="rt">${chip(i.c,i.u)}<span class="chev" aria-hidden="true">›</span></span></button></div>`).join('');
 const empty=E()?emptyBox('河面很靜','現在沒有等你的事。有新的拍板、機會、扣款，會依急迫排在這裡。',aiF('jiji','','',{do:'cmd',arg:'jiji:立即掃描新機會'})):emptyBox(`「${F.find(x=>x[0]===f)[1]}」現在沒有東西`,'換一個篩選，或回到全部。',B('看全部','filt','all','pri'));
 const dn=S.done.length;
 return `<div class="zh" data-z="today" style="background:none;padding:14px 2px 0;color:var(--ink)"><h1>今天的河</h1><p class="sum">${saySum()}</p></div>
 <div class="seg" role="group" aria-label="篩選">${F.map(x=>`<button aria-pressed="${f===x[0]}" data-act="filt" data-id="${x[0]}">${x[1]} ${cnt(x[0])}</button>`).join('')}</div>${head}
 <section class="sec" style="margin-top:14px"><h2 class="vh">依急迫排序</h2>${its.length?`<div class="rows stg">${rows}</div>`:empty}</section>
 <section class="sec">${sh('',`做完了`,dn?`這次處理 ${dn} 件`:'',moreB('看全部','page','events'))}<div class="rows">${S.done.map(x=>`<div class="rowi"><div class="rowb"><span class="bm" aria-hidden="true">✓</span><span class="tx"><b style="font-weight:500;text-decoration:line-through">${esc(x)}</b><small>剛剛・你處理的</small></span></div></div>`).join('')}</div>${evtList(2)}</section>`}
function daqiPage(){const l=late();
 return `<div class="zh" data-z="daqi"><h1>大器</h1><p class="sum">你在這裡說的話，只有大器本人回，不會讓別人代答。</p></div>
 <div class="btns">${B('跟大器說一句','talk',null,'pri big')}</div>
 ${S.thread.length?`<section class="sec">${sh('','你傳給大器的')}${S.thread.map(t=>`<div class="bubble">${esc(t)}<small>傳給大器了・回覆會出現在這裡</small></div>`).join('')}</section>`:''}
 <section class="sec">${sh('','誰負責哪一區')}<div class="rows">${['daqi','jiji','tata','peng'].map(b=>`<div class="rowi"><button class="rowb" data-act="bot" data-id="${b}">${bm(b,'z')}<span class="tx"><b>${BOTS[b].name}</b><small>${BOTS[b].zone}・${b==='peng'&&!S.bound?'還沒綁定':BOTS[b].beat}</small></span><span class="rt"><span class="chev" aria-hidden="true">›</span></span></button></div>`).join('')}</div></section>
 <section class="sec">${sh('','燈號',l.length?`▲ ${l.length} 支沒報到`:'都正常',moreB('看細節','sheet','beats'))}</section>
 <section class="sec">${sh('','正在跑',jobs().length+' 件')}${jobList()}</section>`}

/* ---------- 四個區的整頁（三個版面共用） ---------- */
function projCard(p){const op=!!S.open[p.id];
 return `<article class="card"><div class="meta">${chip(p.due,p.urg)}<span class="lbl">${esc(p.who)}</span></div><h3>${esc(p.title)}</h3><p>${esc(p.next)}</p>${pxOf(p).block!=='沒有卡住'?`<p class="note" style="margin-top:4px">▲ 卡在：${esc(pxOf(p).block)}</p>`:''}<div class="steps" role="img" aria-label="${p.steps.length} 步做到第 ${Math.min(p.cur+1,p.steps.length)} 步">${p.steps.map((s,i)=>`<i class="${i<p.cur?'d':i===p.cur?'c':''}"></i>`).join('')}</div><p class="note">${p.cur<p.steps.length?'現在：'+esc(p.steps[p.cur]):'全部做完'}・${esc(p.money)}</p>${projSync(p)}
 <div class="btns">${B('看詳情 ›','page','proj:'+p.id,'pri')}</div>${op?`<ul class="tl fadein" style="margin-top:14px">${p.hist.map(h=>`<li>${esc(h)}</li>`).join('')}</ul>`:''}</article>`}
function zoneProj(){const s=S.sub.proj,ps=projs(),sm=zsum('proj');let h=zoneHead('proj',ps.length?`${sm.n} ${sm.u}，${esc(sm.s)}`:'還沒有案子');
 h+=`<div class="seg" role="group" aria-label="案子分類">${[['proj','案子 '+ps.length],['todo','待辦 '+(E()?0:DB.todo.length)],['arch','封存 '+(E()?0:DB.arch.length)]].map(x=>`<button aria-pressed="${s===x[0]}" data-act="sub" data-id="proj:${x[0]}">${x[1]}</button>`).join('')}</div>`;
 if(s==='proj'){if(!ps.length)return h+emptyBox('還沒有案子','跟大器說一聲，就會開一個案子，下一步和卡在哪會出現在這裡。',aiF('daqi','new:proj'));
  [['need','要你看'],['doing','進行中'],['delivered','已交件，等收款'],['paid','已收款']].forEach(g=>{const a=projs(g[0]);if(a.length)h+=`<section class="sec">${sh('',g[1],a.length+' 件')}<div class="stack stg grid2">${a.map(projCard).join('')}</div></section>`})}
 else{const a=E()?[]:DB[s];h+=a.length?`<section class="sec"><h2 class="vh">${s==='todo'?'待辦':'封存'}</h2><div class="stack stg">${a.map(t=>`<article class="card"><div class="meta">${chip(t.st)}</div><h3>${esc(t.title)}</h3><p>${esc(t.next)}</p></article>`).join('')}</div></section>`:emptyBox(s==='todo'?'沒有待辦':'封存是空的',s==='todo'?'想到要做的事，跟大器說一句就會記在這裡。':'結案的案子會收在這裡，不會自動消失。',s==='todo'?aiF('daqi','new:todo'):'')}
 return h}
function oppCard(o){const sn=o.st==='snoozed';
 return `<article class="card" data-card="${esc(o.id)}"><div class="meta">${chip(sn?'明天 8:00 回到清單':o.due,!sn&&o.days<=4)}<span class="lbl">${BASK[o.b]}・${esc(o.org)}</span></div><h3>${esc(o.title)}</h3><p class="amt" style="color:var(--ink)">${esc(o.amt)}</p>
 <div class="btns">${B('深入了解','sheet','opp:'+o.id,'pri')}${sn?B('放回清單','unsnooze',o.id):B('暫存到明天','snooze',o.id)}${B('刪掉','del',o.id,'ghost')}</div></article>`}
function zoneOpp(){const s=S.sub.opp,all=opps('all'),sn=opps('snoozed');let h=zoneHead('opp',all.length?`${all.length} 張待看，最急 ${esc(all[0].due)}`:'現在沒有新機會');
 h+=scanRow();
 const tabs=[['all','全部 '+all.length],['snoozed','暫存 '+sn.length]].concat(Object.keys(BASK).map(k=>[k,BASK[k]+' '+opps(k).length]));
 h+=`<div class="seg" role="group" aria-label="機會篩選" style="padding-top:4px">${tabs.map(x=>`<button aria-pressed="${s===x[0]}" data-act="sub" data-id="opp:${x[0]}">${x[1]}</button>`).join('')}</div>`;
 const a=opps(s);
 if(a.length)h+=`<section class="sec" style="margin-top:14px"><h2 class="vh">機會清單，依截止時間排</h2><div class="stack stg grid2">${a.map(oppCard).join('')}</div></section>`;
 else if(s==='all')h+=emptyBox('現在沒有新機會','集集每 3 小時掃一次，也可以現在叫它。',aiF('jiji','','',{do:'cmd',arg:'jiji:立即掃描新機會'}));
 else if(s==='snoozed')h+=emptyBox('沒有暫存的機會','在卡片上按「暫存到明天」，它會先收在這裡，隔天 8:00 回到清單。',B('看全部','sub','opp:all','pri'));
 else h+=emptyBox(`「${BASK[s]}」這一籃現在是空的`,'別的籃子還有機會。',B('看全部','sub','opp:all','pri'));
 const dl=DB.deleted.length;
 return h+`<div class="btns" style="margin-top:20px">${mb(`最近刪掉的 ${dl} 張 ›`,'page','deleted')}</div>`}
function zoneMoney(){const ss=subs(),d=due7();let h=zoneHead('money',ss.length?`7 天內扣 ${d.length} 筆，待收 ${nt(30000)}`:'還沒有訂閱資料');
 if(!ss.length)return h+emptyBox('還沒有訂閱資料','請塔塔把訂閱匯進來，之後每筆扣款前會先提醒。',aiF('tata','','',{do:'cmd',arg:'tata:匯入訂閱'}));
 h+=dueHTML();h+=`<div class="kband"><span class="lbl">本月固定支出（自付）</span><b>${nt(monthSelf())}</b><small>上月 NT$ 890，少 150・公司另付 ${nt(600)}</small></div>`;
 h+=`<section class="sec">${sh('','7 天內要扣',d.length+' 筆')}<div class="hs">${d.map(s=>`<div class="card"><div class="meta">${chip(s.in+' 天後扣',s.in<=2)}</div><h3>${esc(s.name)}</h3><p class="amt" style="color:var(--ink)">${nt(s.amt)}</p>${aifs([aiF('tata','sub:'+s.id,s.rem?'會提醒':'')])}</div>`).join('')}</div></section>`;
 const op=S.open.subs!==false;
 h+=`<section class="sec"><div class="rows"><div class="rowi"><button class="rowb" data-act="open" data-id="subs" aria-expanded="${op}"><span class="tx"><b>全部訂閱 ${ss.length} 筆</b><small>自付 ${ss.filter(s=>s.payer==='自付').length}・公司付 ${ss.filter(s=>s.payer!=='自付').length}${ss.some(s=>s.cancel)?'・▲ 1 筆想取消':''}</small></span><span class="rt"><span class="chev" aria-hidden="true">${op?'⌃':'⌄'}</span></span></button></div>${op?ss.map(s=>`<div class="rowi"><button class="rowb" data-act="sheet" data-id="sub:${s.id}"><span class="tx"><b>${esc(s.name)}</b><small>${s.cancel?'▲ '+esc(s.cancel)+'・':''}${esc(s.cyc)}・${s.payer}・${s.in} 天後扣</small></span><span class="rt"><span class="amt" style="color:var(--ink)">${nt(s.amt)}</span><span class="chev" aria-hidden="true">›</span></span></button></div>`).join(''):''}</div></section>`;
 h+=`<section class="sec">${sh('','待收款','1 筆')}<div class="card"><div class="li"><div><h3>AI 影片比賽代製（示意）</h3><p>已交件 2 天，約定 11/30 前付</p></div><span class="amt">${nt(30000)}</span></div>${aifs([aiF('tata','recv:p2',S.recvRem?'會提醒':'')])}</div></section>`;
 return h}
function zoneLife(){const s=S.sub.life,rs=routs(),o=over(),tb=tobuy();let h=zoneHead('life',(o.length||tb.length)?`${o.length} 件該做了，${tb.length} 樣要買`:(rs.length?'都顧好了':'還沒有例行事項'));
 if(!S.bound)h+=`<div class="card" style="margin-top:14px;border-style:dashed"><h3 aria-level="2">朋朋還沒綁定</h3><div class="btns">${B('綁定朋朋','bindok',null,'pri')}</div></div>`;
 h+=`<div class="seg" role="group" aria-label="生活分類">${[['rout','例行 '+rs.length],['sup','備品 '+sups().length]].concat(lifeTabs()).map(x=>`<button aria-pressed="${s===x[0]}" data-act="sub" data-id="life:${x[0]}">${x[1]}</button>`).join('')}</div>`;
 if(s==='wish'||s==='ord')return h+lifeShop(s);
 if(s==='rout'){h+=rs.length?`<section class="sec" style="margin-top:14px"><h2 class="vh">例行，最該做的在上面</h2><div class="rows stg">${rs.map(r=>routRow(r)).join('')}</div><div class="mrow">${mb('＋ 新增','add')}</div></section>`:emptyBox('還沒有例行事項','加第一項，例如澆花、剪頭髮，之後點一下就歸零。',B('新增第一項例行','add',null,'pri'))}
 else{const ss=sups();if(!ss.length)return h+emptyBox('還沒有備品清單','把常用的東西加進來，快用完時點一下，就會排進購物清單。',B('新增第一樣備品','add',null,'pri'));
  h+=`<section class="sec" style="margin-top:14px">${sh('','要買',tb.length+' 樣',tb.length?`<button class="more" data-act="copy">複製購物清單</button>`:'')}${tb.length?`<div class="rows">${tb.map(u=>`<div class="rowi" data-card="${esc(u.id)}"><div class="rowb"><span class="tx"><b>${esc(u.name)}</b><small>${u.cat}・上次買 ${u.last}</small></span><span class="rt">${mb('✓ 買好了','bought',u.id)}</span></div></div>`).join('')}</div>${S.bound?aifs([aiF('peng','sup:cart',S.cart?'放好了':'')]):''}`:`<div class="card"><p>沒有要買的。</p></div>`}</section>`;
  const cats=[...new Set(ss.filter(u=>!u.buy).map(u=>u.cat))];
  h+=`<section class="sec">${sh('','家裡還有的')}<div class="rows">${cats.map(c=>{const a=ss.filter(u=>!u.buy&&u.cat===c),op=!!S.open['c'+c];return `<div class="rowi"><button class="rowb" data-act="open" data-id="c${c}" aria-expanded="${op}"><span class="tx"><b>${c}</b><small>${a.length} 樣</small></span><span class="rt"><span class="chev" aria-hidden="true">${op?'⌃':'⌄'}</span></span></button></div>${op?a.map(u=>`<div class="rowi" data-card="${esc(u.id)}"><div class="rowb"><span class="tx"><b style="font-weight:500">${esc(u.name)}</b><small>上次買 ${u.last}</small></span><span class="rt">${mb('快用完了','buy',u.id)}</span></div></div>`).join(''):''}`}).join('')}</div></section>`}
 return h}
const zonePage=z=>({proj:zoneProj,opp:zoneOpp,money:zoneMoney,life:zoneLife,daqi:daqiPage}[z]());

/* ---------- 底部抽屜 ---------- */
function sheetHTML(){const [t,id]=S.sheet.split(':');const head=(title)=>`<div class="grab" aria-hidden="true"></div><div class="shead"><h2 id="sTitle">${title}</h2>${B('關閉 ✕','close',null,'ghost',' id="sClose"')}</div>`;
 if(t==='talk'){const about=id&&(DB.dec.find(d=>d.id===id)||DB.proj.find(p=>p.id===id));
  return head('跟大器說')+`<div class="meta" style="margin-top:8px">${bm('daqi',S.said?'speaking':'')}<span class="lbl">大器・只有本人回</span></div><p class="note">只有大器本人回，別的 Bot 不會代答。付款、刪檔、對外發訊也在這裡跟大器說。</p>${about?`<div class="meta" style="margin-top:10px">${chip('關於：'+(about.proj||about.title))}</div>`:''}
  <label class="f">想說什麼<textarea id="talkText" rows="3" placeholder="例：品牌短片先照第二版排拍攝日"></textarea></label>${S.err==='talk'?'<p class="err" role="alert">▲ 還沒寫字。先寫一句再傳。</p>':''}
  <div class="btns">${BOTS.daqi.cmds.map(c=>`<button class="btn" data-act="fill" data-id="${esc(c)}">${esc(c)}</button>`).join('')}</div>
  <div class="btns">${B('傳給大器','send',null,'pri wide')}</div>${S.thread.length?`<p class="h4">你傳過的</p>${S.thread.slice(-2).map(x=>`<div class="bubble">${esc(x)}<small>傳給大器了・回覆會出現在這裡</small></div>`).join('')}`:''}`}
 if(t==='bot'){const b=BOTS[id],un=id==='peng'&&!S.bound;
  return head(`${b.name}・負責${b.zone}`)+`<div class="meta" style="margin-top:8px">${bm(id,'z')}<span class="lbl">${b.grok?'Grok Bot 裡的 '+b.grok+'・':''}${un?'還沒綁定':b.beat+'・'+FRESH[id]}</span></div><p style="margin-top:8px">${esc(b.role)}</p>
  <div class="can"><div><b>能做</b><span>${esc(b.can)}</span></div><div><b>不做</b><span>${esc(b.cant)}</span></div></div>
  ${un?`<div class="btns">${B('綁定朋朋','sheet','bind','pri wide')}</div>`:`<p class="h4">${id==='daqi'?'直接跟大器說':'叫'+b.name+'做事'}</p><div class="btns">${id==='daqi'?B('跟大器說一句','talk',null,'pri wide'):b.cmds.map(c=>`<button class="btn" data-act="cmd" data-id="${id}:${esc(c)}">請${b.name}：${esc(c)}</button>`).join('')}</div>
  ${id==='daqi'?'':`<div class="btns">${B(`${b.name}這次整理得不對，告訴大器`,'talk',null,'ghost')}</div>`}`}`}
 if(t==='bind')return head('朋朋')+`<div class="btns">${S.bound?B('解除綁定','unbind',null,'wide'):B('綁定朋朋','bindok',null,'pri wide')}</div>`;
 if(t==='beats'){const bs=E()?[]:DB.beats;return head('燈號：各程式有沒有報到')+(bs.length?`<div class="rows" style="margin-top:12px">${bs.map(b=>`<div class="rowi"><div class="rowb"><span class="tx"><b>${b.late?'▲ ':'● '}${esc(b.name)}</b><small>${esc(b.note)}・${esc(b.ago)}</small></span><span class="rt">${chip(b.late?'沒報到':'正常',b.late)}</span></div></div>`).join('')}</div>${aifs([aiF('daqi','beats')])}`:`<p style="margin-top:10px">還沒有程式報到過。</p>`)}
 if(t==='dec'||t==='why'){const d=DB.dec.find(x=>x.id===id);
  return head(esc(d.q))+`<div class="meta" style="margin-top:8px">${aiF('daqi','dec:'+d.id)}${chip(d.proj)}<span class="lbl">${esc(d.by)}問・${esc(d.ago)}・來自${esc(d.origin)}</span></div>${d.detail?`<p style="margin-top:8px">${esc(d.detail)}</p>`:''}${t==='dec'?decActs(d):''}${aifs([dinB('dec:'+d.id)])}`}
 if(t==='opp'){const o=DB.opp.find(x=>x.id===id);
  return head(esc(o.title))+`<dl class="kv"><div><dt>金額</dt><dd>${esc(o.amt)}</dd></div><div><dt>時間</dt><dd>${esc(o.due)}</dd></div><div><dt>來源</dt><dd>${esc(o.org)}・${BASK[o.b]}</dd></div></dl>
  <p class="h4">集集的判斷</p><p>${esc(o.why)}</p><p class="h4">重點</p><ul class="ul">${o.facts.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>${o.warn.length?`<p class="h4">要注意</p><ul class="ul">${o.warn.map(f=>`<li>▲ ${esc(f)}</li>`).join('')}</ul>`:''}${o.pay?oppPay(o):''}
  ${aifs([aiF('jiji','opp:'+o.id,o.took?'建好了':'')])}<div class="mrow">${o.st==='snoozed'?mb('↺ 放回清單','unsnooze',o.id):mb('⏸ 暫存到明天','snooze',o.id)}${mb('🗑 刪掉','del',o.id)}${mb('完整公告 ›','page','oppfull:'+o.id)}</div>`}
 if(t==='proj'){const p=DB.proj.find(x=>x.id===id);
  return head(esc(p.title))+`<div class="meta" style="margin-top:8px">${chip(p.due,p.urg)}<span class="lbl">${esc(p.who)}・${esc(p.money)}</span></div><p style="margin-top:8px">${esc(p.next)}</p><div class="steps">${p.steps.map((s,i)=>`<i class="${i<p.cur?'d':i===p.cur?'c':''}"></i>`).join('')}</div><p class="note">${p.cur<p.steps.length?'現在：'+esc(p.steps[p.cur]):'全部做完'}</p><p class="h4">時間軸</p><ul class="tl">${p.hist.map(h=>`<li>${esc(h)}</li>`).join('')}</ul><div class="btns">${B('跟大器說這件','talk',p.id,'pri wide')}</div>`}
 if(t==='sub'){const s=DB.subs.find(x=>x.id===id);
  return head(esc(s.name))+`<dl class="kv"><div><dt>金額</dt><dd>${nt(s.amt)}</dd></div><div><dt>週期</dt><dd>${esc(s.cyc)}</dd></div><div><dt>下次扣款</dt><dd>${s.in} 天後</dd></div><div><dt>誰付</dt><dd>${s.payer}</dd></div></dl>${s.cancel?`<p class="err">▲ ${esc(s.cancel)}</p>`:''}${aifs([aiF('tata','sub:'+s.id,s.rem?'會提醒':'')])}`}
 if(t==='rout'){const r=DB.rout.find(x=>x.id===id);
  return head(esc(r.name))+`<p style="margin-top:8px">上次是 <b>${r.ago} 天前</b>，每 ${r.cyc} 天一次。</p><label class="f">上次做的日期<input type="date" value="2026-11-${String(Math.max(1,22-r.ago)).padStart(2,'0')}"></label><label class="f">多久一次（天）<input type="number" inputmode="numeric" min="1" value="${r.cyc}"></label><div class="btns">${B('存好這一項','saverout',r.id,'pri wide')}</div><div class="mrow">${mb('✓ 剛做完','done',r.id)}</div>${S.bound?aifs([aiF('peng','rout:'+r.id,r.rem?'會提醒':'')]):''}`}
 return head('')}

/* ---------- 推入的整頁 ---------- */
function pageHTML(){const [t,id,sub]=S.page.split(':');const back=S.layout===3&&t==='zone'?'回河':'返回';
 let h=`<div class="page-in"><div class="phead">${B('‹ '+back,'back',null,'ghost',' id="pBack"')}</div>`;
 if(t==='zone')h+=S.st==='loading'?skeleton():S.st==='error'?errorBox(id):zonePage(id);
 else if(t==='events')h+=`<h1 class="pt">最近做完</h1><div style="margin-top:14px">${evtList(99)}</div>`;
 else if(t==='deleted'){const a=DB.deleted;h+=`<h1 class="pt">最近刪掉的</h1><p class="note">刪掉的機會留 72 小時，之後才真的收走。</p>${a.length?`<div class="rows" style="margin-top:14px">${a.map(o=>`<div class="rowi"><div class="rowb"><span class="tx"><b>${esc(o.title)}</b><small>${esc(o.amt)}・剛剛刪掉</small></span><span class="rt">${B('救回來','restore',o.id)}</span></div></div>`).join('')}</div>`:emptyBox('沒有刪掉的機會','在機會卡片按「刪掉」，72 小時內都能在這裡救回來。',B('回機會清單','back',null,'pri'))}`}
 else if(t==='oppfull'){const o=DB.opp.find(x=>x.id===id);h+=`<div class="meta" style="margin-top:8px">${chip(o.due,o.days<=4)}<span class="lbl">${BASK[o.b]}・${esc(o.org)}</span></div><h1 class="pt">${esc(o.title)}</h1><dl class="kv"><div><dt>金額</dt><dd>${esc(o.amt)}</dd></div><div><dt>時間</dt><dd>${esc(o.due)}</dd></div></dl><p class="h4">集集整理的完整公告（示意）</p><ul class="ul">${o.facts.concat(o.warn).map(f=>`<li>${esc(f)}</li>`).join('')}</ul><p class="h4">紀錄</p><ul class="tl"><li>今天 8:00　集集：找到，放進${BASK[o.b]}</li><li>今天 8:02　集集：讀完公告，AI 自查完成，等你決定</li></ul><div class="btns">${B('打開官方公告 ↗','ext',o.id)}</div>${aifs([aiF('jiji','opp:'+o.id,o.took?'建好了':'')])}`}
 return h+`</div>`}

/* ---------- 畫 ---------- */
function renderProto(){return;const mk=(el,arr,cur,act)=>{el.innerHTML=`<span>${el.id==='pLayout'?'版面':el.id==='pSkin'?'外觀':'狀態'}</span>`+arr.map(a=>`<button aria-pressed="${a[0]===cur}" data-act="${act}" data-id="${a[0]}">${el.id==='pLayout'?a[0]+' ':''}${a[1]}</button>`).join('')};
 mk($('#pLayout'),LAYOUTS,S.layout,'setL');mk($('#pSkin'),SKINS,S.skin,'setS');mk($('#pState'),STATES,S.st,'setSt');
 $('#protoNow').textContent=`版面 ${S.layout} ${LAYOUTS.find(l=>l[0]===S.layout)[1]}・外觀 ${SKINS.find(l=>l[0]===S.skin)[1]}`}
function renderTabs(){const ts=tabsOf(),el=$('#tabs');el.style.setProperty('--tn',ts.length);
 const cur=Math.max(0,ts.indexOf(S.tab));
 const bh=n=>n?`<span class="badge">${n}<span class="vh"> 件要處理</span></span>`:'',key=S.layout+'|'+ts.join(',');
 if(el.dataset.k===key&&el.querySelector('.ind')){el.querySelector('.ind').style.transform=`translateX(${cur*100}%)`;
  el.querySelectorAll('.tab').forEach(b=>{const t=b.dataset.id;if(t===S.tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
   const n=badge(t),o=b.querySelector('.badge');if(o&&!n)o.remove();else if(n&&!o)b.insertAdjacentHTML('beforeend',bh(n));else if(o&&o.firstChild.nodeValue!=n)o.firstChild.nodeValue=n});
  if(window.__faceSync)window.__faceSync();return}
 el.dataset.k=key;
 el.innerHTML=`<span class="ind" aria-hidden="true" style="transform:translateX(${cur*100}%)"></span>`+ts.map(t=>{const n=badge(t),nm=t==='today'?(S.layout===3?'河':S.layout===2?'首頁':'今天'):ZONE[t].n;
  const ic=S.layout===2&&t!=='today'?bm(ZONE[t].b):`<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[t==='today'?(S.layout===3?'river':S.layout===2?'home':'today'):t]}</svg>`;
  return `<button class="tab" data-act="tab" data-id="${t}"${t===S.tab?' aria-current="page"':''}>${ic}<span>${nm}</span>${n?`<span class="badge">${n}<span class="vh"> 件要處理</span></span>`:''}</button>`}).join('')}
function viewHTML(){if(S.st==='loading')return skeleton();if(S.st==='error')return errorBox(S.tab);
 if(S.tab==='today')return S.layout===1?homeL1():S.layout===2?homeL2():homeL3();return zonePage(S.tab)}
let shownSheet=null,shownPage=null;
function fixTop(){const pr=document.querySelector('.proto');document.documentElement.style.setProperty('--ph',Math.max(0,Math.round(pr?pr.getBoundingClientRect().bottom:0))+'px')}
addEventListener('scroll',fixTop,{passive:true});addEventListener('resize',fixTop);
function render(dir){const R=document.documentElement;fixTop();
 if(tabsOf().indexOf(S.tab)<0)S.tab='today';
 R.dataset.layout=S.layout;R.dataset.skin=S.skin;if(decs().length)delete R.dataset.calm;else R.dataset.calm='1';R.dataset.tab=S.page&&S.page.indexOf('zone:')===0?S.page.split(':')[1]:S.tab;
 const fl=$('#fontlink'),href=`https://fonts.googleapis.com/css2?${FONTS[S.skin]}&display=swap`;if(fl.getAttribute('href')!==href)fl.setAttribute('href',href);
 renderProto();renderTabs();$('#offline').hidden=S.st!=='offline';
 const v=$('#view');v.innerHTML=viewHTML();v.className='';
 if(dir&&dir!=='keep'){void v.offsetWidth;v.className=dir}
 const pg=$('#page'),sh=$('#sheet'),sc=$('#scrim'),bgs=[v,$('#top'),$('#dock'),document.querySelector('.tabs')];
 if(S.page){pg.innerHTML=pageHTML();pg.hidden=false;if(shownPage!==S.page){if(!shownPage){pg.scrollTop=0;requestAnimationFrame(()=>pg.classList.add('in'))}const b=$('#pBack');if(b&&!S.sheet)b.focus({preventScroll:true})}}
 else if(shownPage){pg.classList.remove('in');setTimeout(()=>{if(!S.page){pg.hidden=true;pg.innerHTML=''}},RM?0:210)}
 shownPage=S.page;
 if(S.sheet){const sp=S.sheet.split(':');sh.dataset.b=sp[0]==='bot'?sp[1]:({opp:'jiji',sub:'tata',rout:'peng',bind:'peng',proj:'daqi',talk:'daqi'}[sp[0]]||'');sh.innerHTML=sheetHTML();sh.hidden=false;sc.hidden=false;if(shownSheet!==S.sheet){if(!shownSheet)requestAnimationFrame(()=>{sh.classList.add('in');sc.classList.add('in')});sh.scrollTop=0;const c=$('#sClose');if(c)c.focus({preventScroll:true})}}
 else if(shownSheet){sh.classList.remove('in');sc.classList.remove('in');setTimeout(()=>{if(!S.sheet){sh.hidden=true;sc.hidden=true;sh.innerHTML=''}},RM?0:210)}
 shownSheet=S.sheet;
 bgs.forEach(e=>{if(e)e.inert=!!(S.page||S.sheet)});pg.inert=!!S.sheet;
 $('#app').classList.toggle('over',!!(S.sheet||S.page));
 try{localStorage.setItem('zl3',JSON.stringify({layout:S.layout,skin:S.skin}))}catch(e){}}

/* ---------- 導航：自己記堆疊，系統返回也走同一條 ---------- */
const snap=()=>({tab:S.tab,sub:Object.assign({},S.sub),filt:S.filt,sheet:S.sheet,page:S.page,chat:S.chat});
function go(patch,dir){H.push(snap());if(patch.tab&&patch.tab!==S.tab)scrollY[S.tab]=window.scrollY;Object.assign(S,patch);S.err='';
 try{history.pushState({n:H.length},'');usedH=true}catch(e){usedH=false}
 render(dir);if(patch.tab&&!patch.sheet&&!patch.page)window.scrollTo(0,scrollY[patch.tab]||0)}
function pop(){const n=H.pop();if(!n)return;const wasTab=S.tab;Object.assign(S,n);S.err='';
 render(wasTab!==S.tab?(S.layout===2&&S.tab==='today'?'zout':'goR'):'keep');if(wasTab!==S.tab)window.scrollTo(0,scrollY[S.tab]||0);
 if(after){const f=after;after=null;f()}}
function back(){if(!H.length)return;if(usedH){try{history.back();return}catch(e){}}pop()}
addEventListener('popstate',pop);
function closeThen(fn){if(S.sheet){after=fn;back()}else fn()}

/* ---------- 回饋 ---------- */
function toast(msg,fn){undoFn=fn||null;$('#toastMsg').textContent=msg;$('#toastUndo').hidden=!fn;const t=$('#toast');t.classList.add('in');clearTimeout(toastT);toastT=setTimeout(()=>{t.classList.remove('in');undoFn=null},fn?5000:3200)}
function leave(id,fn){const els=id?document.querySelectorAll(`#view [data-card="${id}"],#page [data-card="${id}"]`):[];
 if(RM||!els.length){fn();return}els.forEach(e=>e.classList.add('leaving'));setTimeout(fn,180)}
const WRITE=['pick','pickalt','snooze','unsnooze','del','restore','done','buy','bought','cmd','send','bindok','unbind','take','saverout','add'];
const ACT={
 setL(id){S.layout=+id;S.sheet=S.page=null;H.length=0;S.tab='today';S.filt='all';render('fadein');window.scrollTo(0,0)},
 setS(id){S.skin=+id;render('fadein')},
 setSt(id){S.st=id;render('fadein')},
 retry(){S.st='loading';render();setTimeout(()=>{S.st='ok';render('fadein')},RM?0:900)},
 tab(id){if(id===S.tab&&!S.page){window.scrollTo({top:0,behavior:RM?'auto':'smooth'});return}const ts=tabsOf();go({tab:id,sheet:null,page:null},ts.indexOf(id)>ts.indexOf(S.tab)?'goL':'goR')},
 room(id,el){const r=el.getBoundingClientRect(),v=$('#view');v.style.transformOrigin=`${r.left+r.width/2}px ${r.top+r.height/2-v.getBoundingClientRect().top}px`;go({tab:id},'zin')},
 sub(id){const [z,s]=id.split(':');S.sub[z]=s;render('keep');const v=document.querySelector((S.page?'#page':'#view')+' .stg');if(v){v.classList.remove('stg');void v.offsetWidth;v.classList.add('stg')}},
 lifesub(id){S.sub.life=id;ACT.tab('life')},
 filt(id){S.filt=id;render('keep')},
 open(id){S.open[id]=id==='subs'?S.open.subs===false:!S.open[id];render('keep')},
 more(id){S.more[id]=true;render('keep');const t=document.querySelector(`[data-dec="${id}"] textarea`);if(t)t.focus()},
 jump(id){const e=document.getElementById(id);if(e)e.scrollIntoView({behavior:RM?'auto':'smooth',block:'start'})},
 sheet(id){if(S.sheet){S.sheet=id;render('keep')}else go({sheet:id},'keep')},
 talk(id){ACT.sheet('talk'+(id?':'+id:''))},
 bot(id){ACT.sheet('bot:'+id)},
 page(id){const [t,z,s]=id.split(':');if(t==='zone'&&s)S.sub[z]=s;if(S.sheet){after=()=>go({page:id},'keep');back()}else go({page:id},'keep')},
 close(){back()},back(){back()},
 fill(id){const t=$('#talkText');if(t){t.value=id;t.focus()}},
 send(){const t=$('#talkText'),v=t?t.value.trim():'';if(!v){S.err='talk';render('keep');const x=$('#talkText');if(x)x.focus();return}S.thread.push(v);S.err='';closeThen(()=>{render('keep');toast('傳給大器了，回覆會出現在「跟大器說」')})},
 pick(id,el){const d=DB.dec.find(x=>x.id===id),k=el.dataset.k,o=d.opts.find(x=>x.k===k),lab=k==='_done'?'你說已經弄好了':k==='_alt'?'照你寫的做':o.label;
  closeThen(()=>leave(id,()=>{d.done=true;S.done.unshift(d.q);render('keep');toast(`「${lab}」已交給大器`,()=>{d.done=false;S.done.shift();render('keep')})}))},
 pickalt(id){const t=document.querySelector(`[data-dec="${id}"] textarea`);if(!t||!t.value.trim()){S.err=id;render('keep');const x=document.querySelector(`[data-dec="${id}"] textarea`);if(x)x.focus();return}ACT.pick(id,{dataset:{k:'_alt'}})},
 snooze(id){const o=DB.opp.find(x=>x.id===id);closeThen(()=>leave(id,()=>{o.st='snoozed';render('keep');toast('暫存了，明天 8:00 回到清單',()=>{o.st='';render('keep')})}))},
 unsnooze(id){const o=DB.opp.find(x=>x.id===id);closeThen(()=>leave(id,()=>{o.st='';render('keep');toast('放回清單了',()=>{o.st='snoozed';render('keep')})}))},
 del(id){const o=DB.opp.find(x=>x.id===id);closeThen(()=>leave(id,()=>{o.gone=true;DB.deleted.unshift(o);render('keep');toast('刪掉了，72 小時內可救回',()=>{o.gone=false;DB.deleted=DB.deleted.filter(x=>x!==o);render('keep')})}))},
 restore(id){const o=DB.opp.find(x=>x.id===id);o.gone=false;DB.deleted=DB.deleted.filter(x=>x!==o);render('keep');toast('救回來了，已放回機會清單')},
 take(id){const o=DB.opp.find(x=>x.id===id);closeThen(()=>{DB.jobs.unshift({id:'j'+id,bot:'jiji',who:'集集',title:'建案子資料夾：'+o.title,st:'進行中',ago:'剛剛'});render('keep');toast('已請集集建資料夾，進度在「正在跑」')})},
 done(id){const r=DB.rout.find(x=>x.id===id),old=r.ago;closeThen(()=>{r.ago=0;render('keep');toast(`已記錄「${r.name}」${S.bound?'，朋朋 '+r.cyc+' 天後提醒':''}`,()=>{r.ago=old;render('keep')})})},
 saverout(){closeThen(()=>toast('存好了'))},
 buy(id){const u=DB.sup.find(x=>x.id===id);leave(id,()=>{u.buy=true;render('keep');toast(`「${u.name}」排進要買`,()=>{u.buy=false;render('keep')})})},
 bought(id){const u=DB.sup.find(x=>x.id===id),old=u.last;leave(id,()=>{u.buy=false;u.last='11/22';render('keep');toast(`「${u.name}」買好了，日期歸零`,()=>{u.buy=true;u.last=old;render('keep')})})},
 copy(){const txt=tobuy().map(u=>'・'+u.name).join('\n');const ok=()=>toast('購物清單已複製，可以貼到 LINE');try{navigator.clipboard.writeText(txt).then(ok,()=>toast('複製被擋住了，請長按清單自己選取'))}catch(e){toast('複製被擋住了，請長按清單自己選取')}},
 cmd(id){const i=id.indexOf(':'),b=id.slice(0,i),c=id.slice(i+1);closeThen(()=>{DB.jobs.unshift({id:'c'+Date.now(),bot:b,who:BOTS[b].name,title:c,st:'進行中',ago:'剛剛'});render('keep');toast(`已請${BOTS[b].name}：${c}`)})},
 bindok(){S.bound=true;closeThen(()=>{render('keep');toast('綁定朋朋了，之後的紀錄會同步給朋朋',()=>{S.bound=false;render('keep')})})},
 unbind(){S.bound=false;closeThen(()=>{render('keep');toast('已解除綁定，紀錄只留在這支手機')})},
 add(){toast('原型先不做新增表單，正式版在這裡加一項')},
 ext(){toast('原型不會真的開網站，正式版會開官方頁')},
 undo(){if(undoFn){const f=undoFn;undoFn=null;$('#toast').classList.remove('in');f()}}
};
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el||el.disabled)return;const a=el.dataset.act;
 if(S.st==='offline'&&WRITE.indexOf(a)>-1){toast('離線中，這個動作連上線再做');return}
 if(ACT[a])ACT[a](el.dataset.id,el)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(S.chat||S.sheet||S.page))back()});
$('#protoToggle')&&$('#protoToggle').addEventListener('click',()=>{const p=$('#protoPanel'),o=p.hidden;p.hidden=!o;$('#protoToggle').setAttribute('aria-expanded',o);$('#protoArrow').textContent=o?'收起 ▴':'展開 ▾';fixTop()});

/* ---------- v3 追加：會動的頭像（掛載、回收、狀態） ----------
   畫面任何地方出現 .bm.bf 就掛 BotFace；元素被換掉就 destroy（計時器、rAF、觀察器一起收）。
   捲出畫面的由 bot_face 自己的 IntersectionObserver 停住；被抽屜或整頁蓋住的背景頭像也停住。 */
const FACES=new Map(),ZOF={daqi:'proj',jiji:'opp',tata:'money',peng:'life'};let faceQ=0,sayT=0;
const hotOf=b=>{try{if(S.st!=='ok')return false;const s=zsum(ZOF[b]);return !!(s.hot&&!s.none)}catch(e){return false}};
const moodOf=el=>{const m=el.dataset.m;return m==='z'?(hotOf(el.dataset.b)?'alert':'idle'):(m||'idle')};
// 反黑：頭像所在的面有沒有宣告 --bf-tone:ink（整塊房間色的面才有）
const toneOf=el=>getComputedStyle(el).getPropertyValue('--bf-tone').trim()==='ink'?'ink':'color';
function faceSync(){faceQ=0;if(!window.BotFace)return;
 FACES.forEach((f,el)=>{if(!el.isConnected){f.destroy();FACES.delete(el)}});
 const top=S.chat?'#chat':S.sheet?'#sheet':S.page?'#page':null;
 document.querySelectorAll('.bm.bf[data-b]').forEach(el=>{let f=FACES.get(el);const m=moodOf(el),tn=toneOf(el);
  if(!f){const px=Math.round(el.getBoundingClientRect().width)||32;
   f=BotFace.mount(el,{preset:BFP[el.dataset.b],color:BFC[el.dataset.b],size:0,mood:m,tone:tn,calm:px<=34?0.4:px<=44?0.7:1,reduceMotion:RM?true:undefined});
   FACES.set(el,f)}
  else{if(f.getMood()!==m)f.setMood(m);if(f.getTone()!==tn)f.setTone(tn)}
  // 靜止：被抽屜或整頁蓋住的、還有沒選中的分頁（底部只有現在這間的頭像在動）
  const u=!!(top&&!el.closest(top)&&!(top==='#page'&&el.closest('#chead')))||!!el.closest('.tab:not([aria-current])')||(el.classList.contains('sm')&&!el.dataset.m);if(el._u!==u){el._u=u;f.setReduceMotion(u?true:!!RM)}})}
window.__faceSync=faceSync;
// 換外觀、換版面不一定會重畫 DOM，色塊面跟著變，所以也要重算一次反黑
new MutationObserver(()=>{if(!faceQ){faceQ=1;queueMicrotask(faceSync)}}).observe(document.documentElement,{attributes:true,attributeFilter:['data-skin','data-layout']});
new MutationObserver(ms=>{if(faceQ)return;for(const r of ms){if(!(r.target.closest&&r.target.closest('.bot-face'))){faceQ=1;queueMicrotask(faceSync);return}}}).observe(document.body,{childList:true,subtree:true});
// 跟大器說：送出後大器說話 5 秒
{const _send=ACT.send;ACT.send=function(){const n=S.thread.length;_send.apply(this,arguments);if(S.thread.length>n){S.said=1;
 document.querySelectorAll('.hav .bm.bf').forEach(el=>el.dataset.m='speaking');faceSync();clearTimeout(sayT);
 sayT=setTimeout(()=>{S.said=0;document.querySelectorAll('.bm.bf[data-m=speaking]').forEach(el=>delete el.dataset.m);faceSync()},5000)}}}
window.__faces=()=>({n:FACES.size,live:window.BotFace?BotFace._liveCount():0});

/* ---------- v3 追加：浮動對話視窗、房間主人、購物清單、付款鈕、案子詳情、定定與金金（2026-11-22） ----------
   由 _暫存/浮動對話.py 內嵌進 v3 的主程式裡（和主程式同一個作用域）。資料全是示意。 */
/* 萌萌、定定、金金的頭像：1122-F 起用 bot_face.js 的真畫法（cloud、hex、star6，照 Grok Bot app.asar 唯讀抽出）。
   定定是白色（老大 2026-11-22：「定定是白色的！」），淺底有淡描邊。 */
if(window.BotFace){Object.assign(BFP,{mon:'monmon',din:'dinding',kim:'kimkim'});Object.assign(BFC,{mon:'#ff9800',din:'#ffffff',kim:'#ff6700'})}
Object.assign(BOTS,{
 mon:{name:'萌萌',grok:'Mon Mon',mono:'萌',zone:'比價',role:'比價歸我，由朋朋轉給我。',can:'各店價格、運費、到貨時間比一輪，推薦一家',cant:'下單、付款；錢該不該花是金金的事'},
 din:{name:'定定',grok:'Din Din',mono:'定',zone:'案子的軍師',role:'我只給判斷，不動手。',can:'看一件事該怎麼選，講建議、理由、風險',cant:'動手做事、對外聯絡、付款；做事交給大器'},
 kim:{name:'金金',grok:'Kim Kim',mono:'金',zone:'錢該不該花',role:'大筆的錢值不值得花，我給一句話。',can:'看一筆錢對工作或生活的幫助，建議買、等、或不買',cant:'付款、記帳；買不買得起是塔塔的事'}});
/* 老大 2026-11-22：「面板上面可以的話 可以按付款按鈕 我點了就是同意」：各 Bot 的「不做」跟著改 */
BOTS.daqi.cant='刪檔、對外發訊要你在對話裡親口說；付款要你自己按付款鈕';
BOTS.jiji.cant='替你送件；領標、報名費要你按了付款鈕才付';
BOTS.tata.cant='轉帳、替你取消訂閱；帳單要你按了付款鈕才付';
BOTS.peng.can='記例行、到期提醒、改備品清單、補齊購物清單、轉給萌萌比價、備訂單';
BOTS.peng.cant='你沒按付款鈕就付錢、刪掉你的紀錄';
BOTS.peng.cmds=['幫我買防曬乳','該做的提醒我','列這週購物清單'];
BOTS.din.cmds=['現在最該先處理哪一件','這件值不值得接','風險在哪'];

const CH={daqi:[],jiji:[],tata:[],peng:[],din:[]},UNREAD={},PAY={},PT={},ORD={},DV={};let shownChat=null,chatPt=null,fromSel=null,seq=0;
S.chat=null;
const OWN={today:'daqi',proj:'daqi',opp:'jiji',money:'tata',life:'peng',daqi:'daqi'},NOW='14:07',BUD=1500,FREE=6200,BIG=5000;
const ROLE={daqi:'只有大器本人回',jiji:'機會房間主人',tata:'錢房間主人',peng:'生活房間主人・能幫你買東西',din:'案子的軍師・只給判斷'};
const PH={daqi:'跟大器說一句',jiji:'叫集集做什麼',tata:'問塔塔一句',peng:'要買什麼，或叫它做什麼',din:'問定定一句'};
const HELLO={daqi:'寫一句，或點下面的指令。只有大器本人回。',jiji:'機會房間歸集集。要它掃描、整理、建資料夾，在這裡說。',tata:'錢房間歸塔塔。記帳、對帳、提醒，在這裡說；帳單你按付款鈕它才付。',peng:'生活房間歸朋朋。要買東西直接說，朋朋回你一張訂單卡，你按付款鈕才付。',din:'定定只給判斷，不動手。看法可以一鍵交給大器去做。'};
const W=id=>DB.wish.find(x=>x.id===id),isBig=w=>w.price>=BIG||!!w.plan;
function mkCmp(p){return [{shop:'示意商城 A',price:p,ship:0,eta:'後天',total:p,rec:1,why:'含運最便宜，後天到'},{shop:'示意商城 B',price:p-60,ship:100,eta:'3 天後',total:p+40},{shop:'示意商城 C',price:p+120,ship:0,eta:'明天',total:p+120}]}
DB.wish=[
 {id:'w1',name:'乳清蛋白 2.2 kg（示意）',spec:'巧克力口味',price:1280,shop:'示意商城 A',url:'example.com/whey',st:'want',cmp:mkCmp(1280),pick:0,glitch:1,ch:'乳',col:'#5b4a8a'},
 {id:'w2',name:'降噪耳機（示意）',spec:'黑色・藍牙 5.3',price:8990,shop:'示意 3C',url:'example.com/anc',st:'want',ch:'耳',col:'#2f5a7a'},
 {id:'w3',name:'鏡頭轉接環（示意）',spec:'E 轉 EF',price:2700,shop:'示意攝影器材',url:'example.com/ring',st:'want',ch:'鏡',col:'#6a4a3a'}];
DB.orders=[{id:'o1',name:'防曬乳 SPF50 兩瓶（示意）',shop:'示意藥妝',amt:'NT$ 760',st:1,eta:'預計 11/24 到'},{id:'o2',name:'相機清潔組（示意）',shop:'示意商城 B',amt:'NT$ 420',st:2,eta:'11/20 已到'}];
DB.bills=[{id:'b1',name:'示意電信費 11 月',amt:699,to:'示意電信',in:3},{id:'b2',name:'示意信用卡費 11 月',amt:12480,to:'示意銀行',in:9}];
/* 案子詳情的欄位（參考現況 current/js/app.js 的 wcard、progressHTML、filesHTML、histHTML） */
const PD={h3:'p1'};
const PX={p1:{client:'某品牌（示意）',doNext:'等客戶回分鏡第二版；沒回就照第二版先排拍攝日',block:'客戶已讀兩天沒回',left:'剩 3 天',leftSub:'11/25 交分鏡',
  dates:[['交分鏡','11/25，剩 3 天'],['拍攝','12/03 到 12/04（暫定）'],['交片','12/20']],money:[['報價','NT$ 120,000'],['訂金 30%','已收 NT$ 36,000（11/19）'],['尾款 70%','交片後 30 天內，NT$ 84,000']],
  team:[['大器（Claude）','盯進度、寫分鏡、排程'],['定定','軍師，只給判斷不動手'],['你','導演，拍板']],files:[['Pool（素材與專案檔）','/Volumes/Pool/2026/1122_品牌短片/'],['內審（給你看的版本）','/Users/borry/Borry\'s Edit/1122_品牌短片/AI工作夾/02_Render/']]}};
function pxOf(p){return PX[p.id]||(PX[p.id]={client:p.money==='自己的作品'?'自己的作品':'示意客戶',doNext:p.next,block:p.g==='delivered'?'等對方付款':'沒有卡住',left:p.due,leftSub:'',dates:[['期限',p.due]],money:[['狀態',p.money]],team:[[p.who,'負責'],['你','拍板']],files:[['Pool（素材與專案檔）','/Volumes/Pool/2026/'+p.id+'_示意/'],['內審（給你看的版本）','大器內審/'+p.id+'_示意（雲端）']]})}

/* ---------- 付款鈕 ---------- */
function payReg(id,o){if(!PAY[id])PAY[id]=Object.assign({st:'idle'},o);return id}
DB.bills.forEach(b=>payReg('b_'+b.id,{amt:nt(b.amt),to:b.to,by:'tata'}));
function payHTML(id){const p=PAY[id],lab=`付 ${p.amt} 給 ${p.to}`,by=BOTS[p.by].name;let h;
 if(p.st==='idle')h=p.bad?`<button class="btn pri wide" disabled aria-describedby="pe${id}">${esc(lab)}</button><p class="err" id="pe${id}">▲ ${esc(p.bad)}</p><div class="btns">${B(`請${by}重新確認金額`,'payfix',id)}</div>`
  :`<button class="btn pri wide" data-act="pay" data-id="${id}">${esc(lab)}</button>`;
 else if(p.st==='count')h=`<div class="pcount" role="status"><div class="pbar2" aria-hidden="true"><i style="animation-delay:-${5-p.n}s"></i></div><p><b><span class="pn">${p.n}</span> 秒後</b>交給${by}付款：${esc(p.amt)} 給 ${esc(p.to)}</p><button class="btn wide" data-act="paycancel" data-id="${id}">取消付款</button></div>`;
 else if(p.st==='paying')h=`<p class="pst" role="status"><span class="spin" aria-hidden="true"></span>付款中，${by}正在付 ${esc(p.amt)} 給 ${esc(p.to)}</p>`;
 else h=`<p class="pst ok" role="status">✓ 已付款 ${esc(p.amt)} 給 ${esc(p.to)}</p><div class="btns" style="margin-top:4px"><button class="btn" data-act="payrc" data-id="${id}" aria-expanded="${!!p.rc}">${p.rc?'收起收據':'看收據'}</button></div>${p.rc?`<dl class="kvs"><dt>金額</dt><dd>${esc(p.amt)}</dd><dt>付給</dt><dd>${esc(p.to)}</dd><dt>你按下同意</dt><dd>今天 ${p.at}</dd><dt>經手</dt><dd>${by}</dd><dt>單號</dt><dd>示意 ${id.toUpperCase()}</dd></dl>`:''}`;
 return `<div class="payc" data-pay="${id}">${h}</div>`}
function paySync(id){document.querySelectorAll(`[data-pay="${id}"]`).forEach(e=>{e.outerHTML=payHTML(id)});const l=$('#clog');if(l&&l.querySelector(`[data-pay="${id}"]`))l.scrollTop=l.scrollHeight}
function payStop(id,msg){const p=PAY[id];if(!p||p.st!=='count')return;clearInterval(PT[id]);delete PT[id];p.st='idle';paySync(id);toast(msg)}
function payGuard(){Object.keys(PAY).forEach(id=>{if(PAY[id].st==='count'&&!document.querySelector(`[data-pay="${id}"]`))payStop(id,'畫面離開了，付款已取消，沒有扣款')})}
ACT.pay=id=>{const p=PAY[id];if(!p||p.st!=='idle'||p.bad)return;p.st='count';p.n=5;paySync(id);const c=document.querySelector(`[data-pay="${id}"] [data-act=paycancel]`);if(c)c.focus({preventScroll:true});
 PT[id]=setInterval(()=>{p.n--;if(p.n>0){document.querySelectorAll(`[data-pay="${id}"] .pn`).forEach(e=>{e.textContent=p.n});return}
  clearInterval(PT[id]);delete PT[id];p.st='paying';paySync(id);mood(p.by,'thinking');
  PT[id]=setTimeout(()=>{delete PT[id];p.st='paid';p.at=NOW;if(p.done)p.done();paySync(id);
   if(CH[p.by]){CH[p.by].push({w:'bot',t:`付好了：${p.amt} 給 ${p.to}。收據在付款那一格。`,fresh:1});arrive(p.by)}},RM?300:1300)},1000)};
ACT.paycancel=id=>payStop(id,'付款取消了，沒有扣款');
ACT.payrc=id=>{const p=PAY[id];p.rc=!p.rc;paySync(id)};
ACT.payfix=id=>{const p=PAY[id];p.bad=null;p.amt=p.want;if(p.fix)p.fix();CH[p.by].push({w:'bot',t:`我重新確認了：店家把運費多算一次，已經改回 ${p.want}。`,fresh:1});if(S.chat)logSync();else paySync(id);arrive(p.by)};
function oppPay(o){payReg('o_'+o.id,{amt:'€ 25',to:'Artefact（報名費）',by:'jiji'});return `<p class="h4">報名費</p>${payHTML('o_'+o.id)}`}
function billsHTML(){const bs=E()?[]:DB.bills;if(!bs.length)return '';
 return `<section class="sec">${sh('','待繳帳單',bs.filter(b=>PAY['b_'+b.id].st!=='paid').length+' 筆')}<div class="stack">${bs.map(b=>`<div class="card"><div class="meta">${chip(b.in+' 天後到期',b.in<=3)}</div><div class="li"><div><h3>${esc(b.name)}</h3></div><span class="amt">${nt(b.amt)}</span></div>${payHTML('b_'+b.id)}</div>`).join('')}</div></section>`}

/* ---------- 生活：購物清單、比價（朋朋轉萌萌）、金流（塔塔）、值不值（金金）、訂單 ---------- */
function fin(w){const p=w.pick!=null&&Array.isArray(w.cmp)?w.cmp[w.pick].total:w.price;
 return p<=BUD?{k:'ok',t:'可以買',why:`本月生活預算還剩 ${nt(BUD)}，買完剩 ${nt(BUD-p)}。帳上扣掉這個月帳單後還有 ${nt(FREE)}。`}
  :p<=FREE?{k:'over',t:`超出本月預算 ${nt(p-BUD)}`,why:`本月生活預算只剩 ${nt(BUD)}。帳上扣掉帳單後還有 ${nt(FREE)}，付得出來，但會吃到下個月。`}
  :{k:'wait',t:'等 12/10 發薪後',why:`帳上扣掉這個月帳單後只剩 ${nt(FREE)}，不夠付 ${nt(p)}。12/10 發薪後就夠。`}}
function wstep(w){
 if(w.st==='bought')return{n:7,who:['peng'],t:w.ord?'已買，到貨進度在「訂單」':'已買'};
 if(w.ord)return{n:6,who:['peng'],t:'朋朋備好訂單了，等你按付款',act:B('看訂單與付款','wishbuy',w.id,'pri')};
 if(w.cmp==='run')return{n:2,who:['peng','mon'],t:'朋朋請萌萌比價中',run:1};
 if(Array.isArray(w.cmp)&&w.pick==null)return{n:2,who:['peng','mon'],t:'萌萌比好了，選一家'};
 if(!w.cmp)return{n:2,who:['peng','mon'],t:'還沒比價',act:B('請朋朋找萌萌比價','wishcmp',w.id,'pri')+B('不比了，直接請朋朋買','wishbuy',w.id,'ghost')};
 if(w.kim==='run')return{n:4,who:['kim'],t:'金金在看值不值',run:1};
 if(isBig(w)&&!w.kim)return{n:4,who:['kim'],t:`超過 ${nt(BIG)}，可以先問金金值不值`,act:B('請金金看值不值','wishkim',w.id,'pri')+B('先不問，直接請朋朋買','wishbuy',w.id,'ghost')};
 return{n:5,who:w.kim?['kim','peng']:['peng'],t:w.kim?`金金：${w.kim.v}。要買就請朋朋`:'可以請朋朋買了',act:B('請朋朋買','wishbuy',w.id,'pri')}}
function cmpHTML(w){return `<div class="cmp" role="group" aria-label="萌萌的比價對照">${w.cmp.map((c,i)=>`<div class="cr"${c.rec?' data-rec':''}><div><b>${esc(c.shop)}</b>${c.rec?' <span class="chip urg">萌萌推薦</span>':''}<small>商品 ${nt(c.price)}・${c.ship?'運費 '+nt(c.ship):'免運'}・${c.eta}到</small>${c.rec?`<small>理由：${esc(c.why)}</small>`:''}</div><div class="crr"><span class="amt">${nt(c.total)}</span>${w.pick===i?'<span class="lbl">已選這家</span>':w.st==='bought'||w.ord?'':B('選這家','wishpick',w.id+':'+i,c.rec?'pri':'')}</div></div>`).join('')}</div>`}
function wishMore(w,i,n,f){const big=isBig(w),bought=w.st==='bought',st=wstep(w).n;
 const L=[[1,['peng'],'想買：朋朋補齊資料'],[2,['peng','mon'],'比價：朋朋轉給萌萌'],[3,['tata'],'金流：塔塔看買不買得起'],[4,['kim'],'值不值：金金看該不該花'],[5,['peng'],'下訂單：請朋朋買'],[6,[],'付款：你按付款鈕才付']].filter(x=>x[0]!==4||big);
 return `<div class="fadein"><ol class="flow" aria-label="這件的流程">${L.map(x=>{const dn=x[0]<st||x[0]===3,cu=x[0]===st;return `<li data-s="${cu?'cur':dn?'done':''}"><span class="mk" aria-hidden="true">${cu?'▸':dn?'✓':'○'}</span><span class="who">${x[1].map(b=>bm(b,'','sm')).join('')}</span><span>${x[2]}<span class="vh">${cu?'（現在）':dn?'（做完）':'（還沒）'}</span></span></li>`}).join('')}</ol>
 ${bought?'':`<p class="h4">塔塔怎麼看（只是建議，付不付你決定）</p><p class="wnote">${bm('tata','','sm')}<span>${f.why}</span></p>`}
 ${Array.isArray(w.cmp)&&w.pick!=null?`<p class="h4">萌萌的比價</p>${cmpHTML(w)}`:''}
 ${w.kim&&w.kim!=='run'?`<p class="h4">金金怎麼看（只是建議）</p><div class="kcard">${bm('kim','','sm')}<div><b>${esc(w.kim.v)}</b><p>${esc(w.kim.why)}</p><p>建議：${esc(w.kim.todo)}</p></div></div>`:''}
 <p class="h4">這一項</p><p class="note" style="margin-top:0">來源：${esc(w.url)}・${esc(w.spec)}</p>
 <div class="btns">${B('↑ 往上排','wishup',w.id,'',i?'':' disabled')}${B('↓ 往下排','wishdn',w.id,'',i<n-1?'':' disabled')}${B(bought?'改回想買':'標成已買','wishmark',w.id)}${B('從清單刪掉','wishdel',w.id,'ghost')}</div></div>`}
function wishCard(w,i,n){
 if(w.load)return `<div class="card" data-card="${esc(w.id)}" aria-busy="true"><div class="wtop"><div class="wimg sk" aria-hidden="true"></div><div class="wtx"><h3>${esc(w.raw)}</h3><p class="wnow">${bm('peng','thinking','sm')}<span><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>朋朋找資料中：品名、圖片、價格、店家</span></p></div></div></div>`;
 const s=wstep(w),f=fin(w),op=!!S.open['w:'+w.id],bought=w.st==='bought',pk=w.pick!=null&&Array.isArray(w.cmp)?w.cmp[w.pick]:null,ct=bought?'已買':(w.cmp==='run'||(Array.isArray(w.cmp)&&w.pick==null))?'比價中':'想買';
 return `<div class="card" data-card="${esc(w.id)}"><div class="wtop"><div class="wimg" aria-hidden="true" style="background:${w.col}">${esc(w.ch)}<small>示意圖</small></div><div class="wtx"><h3>${esc(w.name)}</h3><p class="amt" style="color:var(--ink)">${nt(pk?pk.total:w.price)}<span class="lbl">　${esc(pk?pk.shop+'・含運':w.shop)}</span></p></div></div>
 <div class="meta" style="margin:10px 0 0">${chip(ct)}${bought?'':`<span class="fin${f.k==='ok'?'':' no'}">${bm('tata','','sm')}${f.k==='ok'?'':'▲ '}塔塔：${f.t}</span>`}</div>
 <p class="wnow">${s.who.map(b=>bm(b,s.run?'thinking':'','sm')).join('')}<span>${s.run?'<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>':''}${esc(s.t)}</span></p>
 ${Array.isArray(w.cmp)&&w.pick==null&&!bought?cmpHTML(w):''}${s.act?`<div class="btns">${s.act}</div>`:''}
 <div class="btns" style="margin-top:6px">${B(op?'收起流程與細節 ⌃':'流程與細節 ⌄','open','w:'+w.id,'ghost',` aria-expanded="${op}"`)}</div>${op?wishMore(w,i,n,f):''}</div>`}
const lifeTabs=()=>[['wish','想買 '+(E()?0:DB.wish.filter(w=>w.st!=='bought').length)],['ord','訂單 '+(E()?0:DB.orders.length)]];
function lifeShop(s){
 if(!S.bound)return emptyBox(s==='wish'?'購物清單要先綁定朋朋':'訂單要先綁定朋朋','綁定後，貼網址或打品名，朋朋會補齊資料、找萌萌比價、幫你備訂單；付款要你按付款鈕。',B('綁定朋朋','bindok',null,'pri'));
 if(s==='ord'){const os=E()?[]:DB.orders,T=['已下單','運送中','已到'];
  return os.length?`<section class="sec" style="margin-top:14px"><h2 class="vh">訂單追蹤</h2><div class="stack stg">${os.map(o=>`<div class="card cardx" data-card="${esc(o.id)}">${mineB('ord:'+o.id,o.name)}<div class="li"><div><h3>${esc(o.name)}</h3><p>${esc(o.shop)}・${esc(o.eta)}</p></div><span class="amt">${esc(o.amt)}</span></div><div class="trk" role="img" aria-label="進度：${T[o.st]}">${T.map((t,i)=>`<span${i<=o.st?' data-on':''}>${i===o.st?'▸ ':''}${t}</span>`).join('')}</div>${o.st<2?syncTag('ord:'+o.id,'個人 L.生活（到貨日）'):''}${aifs([aiF('peng','ord:'+o.id)])}</div>`).join('')}</div></section>`
   :emptyBox('還沒有訂單','在「想買」請朋朋買，或在對話裡跟朋朋說要買什麼，付款後訂單會出現在這裡。',aiF('peng','new:buy'))}
 const ws=E()?[]:DB.wish;
 return `<div class="wadd"><label class="vh" for="wishIn">想買什麼，貼網址或打字</label><input id="wishIn" type="text" placeholder="貼網址，或打想買的東西" enterkeyhint="done" autocomplete="off"><button class="btn pri" data-act="wishadd">加進清單</button></div>${S.err==='wish'?'<p class="err" role="alert">▲ 還沒寫字。貼一個網址，或打想買的東西。</p>':''}
 
 ${ws.length?`<section class="sec" style="margin-top:14px"><h2 class="vh">購物清單</h2><div class="stack stg">${ws.map((w,i)=>wishCard(w,i,ws.length)).join('')}</div></section>`:emptyBox('購物清單是空的','想買的東西貼網址或打字加進來，朋朋會補齊資料。')}`}
ACT.wishadd=()=>{const t=$('#wishIn'),v=t?t.value.trim():'';if(!v){S.err='wish';render('keep');const x=$('#wishIn');if(x)x.focus();return}S.err='';
 const url=/^https?:\/\/|^[\w-]+(\.[\w-]+)+\//.test(v),w={id:'w'+(++seq+10),raw:v,load:1,st:'want',col:'#3d5a4a',ch:'新'};DB.wish.unshift(w);render('keep');
 setTimeout(()=>{w.load=0;w.name=(url?'從網址讀到的品名':v.slice(0,24))+'（示意）';w.spec=url?'規格照網址那一款':'朋朋挑了最多人買的一款，規格可以改';w.price=1590;w.shop='示意商城 B';w.url=url?v.replace(/^https?:\/\//,'').slice(0,40):'朋朋搜尋「'+v.slice(0,12)+'」';if(!url)w.ch=v.slice(0,1);
  if(!document.activeElement||document.activeElement.id!=='cText')render('keep');toast('朋朋補齊了：品名、圖片、價格、店家')},RM?500:1500)};
ACT.wishcmp=id=>{const w=W(id);w.cmp='run';render('keep');setTimeout(()=>{w.cmp=mkCmp(w.price);render('keep');toast('萌萌比好了，朋朋把對照卡放在這張卡上')},RM?500:1600)};
ACT.wishpick=id=>{const a=id.split(':'),w=W(a[0]),old=w.pick;w.pick=+a[1];render('keep');toast(`選了${w.cmp[+a[1]].shop}`,()=>{w.pick=old;render('keep')})};
ACT.wishkim=id=>{const w=W(id);w.kim='run';render('keep');setTimeout(()=>{w.kim=w.id==='w2'?{v:'值得，但不急',why:'你每天剪接戴 6 小時，降噪對工作有幫助；可是現在買會壓到 12/10 前的現金。',todo:'等 12/10 發薪後買，或等雙 12 的價格。'}:{v:'可買可不買',why:`${nt(w.price)} 不算小錢，這一樣對工作沒有直接幫助。`,todo:'放 7 天，還想要再買。'};S.open['w:'+id]=true;render('keep')},RM?500:1500)};
ACT.wishbuy=(id,el)=>{const w=W(id);openChat('peng','wish:'+id,el,w.ord?null:()=>say('peng',`請幫我買「${w.name}」`,'wish:'+id))};
ACT.wishdel=id=>{const i=DB.wish.findIndex(x=>x.id===id),w=DB.wish[i];leave(id,()=>{DB.wish.splice(i,1);render('keep');toast('從購物清單刪掉了',()=>{DB.wish.splice(i,0,w);render('keep')})})};
ACT.wishmark=id=>{const w=W(id),o=w.st;w.st=o==='bought'?'want':'bought';render('keep');toast(w.st==='bought'?'標成已買':'改回想買',()=>{w.st=o;render('keep')})};
const wmove=(id,d)=>{const a=DB.wish,i=a.findIndex(x=>x.id===id),j=i+d;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];render('keep');const b=document.querySelector(`[data-card="${id}"] [data-act=${d<0?'wishup':'wishdn'}]`);if(b&&!b.disabled)b.focus({preventScroll:true})};
ACT.wishup=id=>wmove(id,-1);ACT.wishdn=id=>wmove(id,1);
ACT.askpeng=(id,el)=>openChat('peng',id,el);
function mkOrder(wid,text){const w=wid&&W(wid),id='n'+(++seq),c=w?(w.pick!=null&&Array.isArray(w.cmp)?w.cmp[w.pick]:{shop:w.shop,total:w.price,eta:'3 天後'}):{shop:'示意商城 A',total:890,eta:'後天'};
 const name=w?w.name:(text.replace(/^(請|麻煩)?(朋朋)?(幫我|幫忙)?(買|訂|下單)/,'').trim().slice(0,24)||'你說的東西')+'（示意）',bad=!!(w&&w.glitch),amt=bad?c.total+300:c.total;
 const o=ORD[id]={id,wid,name,spec:w?w.spec:'朋朋找到最接近的一款，規格請你確認',shop:c.shop,eta:c.eta};
 payReg('p'+id,{amt:nt(amt),want:nt(c.total),to:c.shop,by:'peng',bad:bad?`金額和比價時不一樣：訂單 ${nt(amt)}，比價選的是 ${nt(c.total)}。先不能付。`:null,
  done(){DB.orders.unshift({id,name:o.name,shop:o.shop,amt:nt(c.total),st:0,eta:'預計'+o.eta+'到'});if(w)w.st='bought';render('keep')}});
 if(w){w.ord=id;w.glitch=0}return id}
function orderHTML(id){const o=ORD[id],p=PAY['p'+id];return `<b>朋朋備好的訂單（示意）</b><dl class="kvs"><dt>品名</dt><dd>${esc(o.name)}</dd><dt>規格</dt><dd>${esc(o.spec)}</dd><dt>價格</dt><dd>${esc(p.amt)}（含運）</dd><dt>店家</dt><dd>${esc(o.shop)}</dd><dt>預計到貨</dt><dd>${esc(o.eta)}</dd></dl>${payHTML('p'+id)}`}

/* ---------- 定定：只給判斷，看法可以一鍵交給大器 ---------- */
function dinView(ctx){const V={
 'dec:h1':{adv:'接受，不變速',why:'觀眾聽的是音色，3 個接點在拍上已經撐得住節奏；變速救到拍點，卻賠掉整段的質感。',risk:'扣合那一下會有人覺得沒對到。試看時先找一個人看，他沒皺眉就過。',k:1},
 'dec:h3':{adv:'再等一天，同時請大器擬一句催客戶的話',why:'先排拍攝日，客戶一改超過三場就要重排，成本比等一天高。',risk:'再等會壓到 11/25 交分鏡。明天中午還沒回，就照第二版排。',k:1},
 'dec:h2':{adv:'今天就登入送件',why:'資料都備好了，拖到截止前系統容易塞車。',risk:'登入與按送件只有你本人能做，沒有人能代。'},
 'proj:p1':{adv:'先照第二版把拍攝日暫排起來，同時催客戶',why:'剩 3 天交分鏡，客戶兩天沒回；暫排可以改，空等不能。',risk:'客戶若大改超過三場，暫排要重來，先跟攝影師講是暫定。'}};
 return V[ctx]||{adv:(ctx||'').indexOf('proj')===0?'照現在的下一步走，先別加東西':'先拍掉最急的那一件',why:'這件沒有卡住，照計畫推進風險最小。',risk:'期限還遠，容易被別的事插隊，請大器每週提醒一次。'}}
function dinHTML(m){const v=m.v;return `<b>定定的看法（只給判斷，不動手）</b><dl class="kvs"><dt>建議</dt><dd><b>${esc(v.adv)}</b></dd><dt>理由</dt><dd>${esc(v.why)}</dd><dt>風險</dt><dd>${esc(v.risk)}</dd></dl>${m.used?'<p class="pst ok" role="status">✓ 已交給大器，變成下一步</p>':`<div class="btns"><button class="btn pri wide" data-act="dinapply" data-id="${m.mid}">照這個做，交給大器</button></div>`}`}
ACT.dinapply=mid=>{const m=DV[mid];if(!m||m.used)return;m.used=1;const a=(m.ctx||'').split(':'),v=m.v,j={id:'d'+(++seq),bot:'daqi',who:'大器（Claude）',title:v.adv,st:'進行中',ago:'剛剛'};let un=()=>{};
 if(a[0]==='dec'){const d=DB.dec.find(x=>x.id===a[1]);if(d&&v.k&&!d.done){d.done=true;S.done.unshift(d.q);un=()=>{d.done=false;S.done.shift()}}}
 else if(a[0]==='proj'){const p=DB.proj.find(x=>x.id===a[1]);if(p){const x=pxOf(p),o=p.next,ox=x.doNext;p.next=v.adv+'。';x.doNext=v.adv;un=()=>{p.next=o;x.doNext=ox}}}
 DB.jobs.unshift(j);CH.daqi.push({w:'me',t:`照定定的看法做：${v.adv}`},{w:'bot',t:'收到，這是我的下一步了。做完回在這裡。'});
 render('keep');toast(`已交給大器：${v.adv}`,()=>{un();m.used=0;DB.jobs=DB.jobs.filter(x=>x!==j);CH.daqi.splice(-2,2);render('keep')})};
ACT.askdin=(id,el)=>openChat('din',id||'',el,()=>say('din',id?`「${ctxName(id)}」你怎麼看？`:'現在最該先處理哪一件？',id||''));

/* ---------- 案子詳情頁 ---------- */
function projPage(id){const p=DB.proj.find(x=>x.id===id),x=pxOf(p),dq=decs().filter(d=>PD[d.id]===id),o=k=>!!S.open['pd:'+id+':'+k],blk=x.block!=='沒有卡住';
 const row=(k,t,sm,body)=>`<div class="rowi"><button class="rowb" data-act="open" data-id="pd:${id}:${k}" aria-expanded="${o(k)}"><span class="tx"><b>${t}</b><small>${sm}</small></span><span class="rt"><span class="chev" aria-hidden="true">${o(k)?'⌃':'⌄'}</span></span></button></div>${o(k)?`<div class="rowi"><div class="rowx fadein" style="padding-top:14px">${body}</div></div>`:''}`;
 const kv=a=>`<dl class="kvs" style="margin-top:0">${a.map(r=>`<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join('')}</dl>`;
 return `<div class="page-in"><div class="phead">${B('‹ 返回','back',null,'ghost',' id="pBack"')}</div>
 <div class="meta" style="margin-top:8px">${chip(p.due,p.urg)}<span class="lbl">客戶：${esc(x.client)}</span></div><h1 class="pt">${esc(p.title)}</h1>
 <dl class="pk"><div><dt>下一步</dt><dd>${esc(x.doNext)}</dd></div><div><dt>卡在哪</dt><dd>${blk?'▲ ':''}${esc(x.block)}</dd></div><div><dt>${p.urg?'剩幾天':'期限'}</dt><dd><span class="num">${esc(x.left)}</span>${x.leftSub?'　'+esc(x.leftSub):''}</dd></div></dl>
 ${id==='p1'?gcNote():''}${aifs([dinB('proj:'+id)])}
 ${dq.length?`<section class="sec">${sh('',`這件有 ${dq.length} 件等你拍板`)}<div class="stack">${dq.map(decCard).join('')}</div></section>`:''}
 <section class="sec">${sh('','詳情')}<div class="rows">
 ${row('step','階段',`${p.steps.length} 步做到第 ${Math.min(p.cur+1,p.steps.length)} 步：${esc(p.steps[Math.min(p.cur,p.steps.length-1)])}`,`<ol class="stp" style="margin-top:0">${p.steps.map((s,i)=>`<li data-s="${i<p.cur?'d':i===p.cur?'c':''}"><span class="mk" aria-hidden="true">${i<p.cur?'✓':i===p.cur?'▸':'○'}</span><span>${esc(s)}<span class="vh">${i<p.cur?'（做完）':i===p.cur?'（現在）':'（還沒）'}</span></span></li>`).join('')}</ol>`)}
 ${row('date','截止與交件日',esc(x.dates[0][0]+'：'+x.dates[0][1])+(Object.keys(DT).some(k=>DT[k].p===id)?'・同步到行事曆':''),dtBody(id)||kv(x.dates))}
 ${row('money','報價與收款',esc(p.money),kv(x.money))}
 ${row('team','誰在做',esc(x.team.map(t=>t[0]).join('、')),kv(x.team))}
 ${row('file','檔案位置',`${x.files.length} 個位置，本機路徑可以複製`,x.files.map((f,i)=>`<div class="fl"><div><b>${esc(f[0])}</b><small>${esc(f[1])}</small></div>${mb('複製路徑','copypath',id+':'+i)}</div>`).join(''))}
 ${row('hist','最近紀錄與時間軸',esc(p.hist[0]),`<ul class="tl">${p.hist.map(h=>`<li>${esc(h)}</li>`).join('')}</ul>`)}
 </div></section></div>`}
ACT.copypath=id=>{const a=id.split(':'),f=pxOf(DB.proj.find(x=>x.id===a[0])).files[+a[1]],ok=()=>toast('路徑已複製，回電腦貼到「前往資料夾」');try{navigator.clipboard.writeText(f[1]).then(ok,()=>toast('複製被擋住了，請長按路徑自己選取'))}catch(e){toast('複製被擋住了，請長按路徑自己選取')}};
{const _p=pageHTML;pageHTML=function(){const a=S.page.split(':');return a[0]==='proj'?projPage(a[1]):_p()}}

/* ---------- 浮動對話視窗 ---------- */
function ctxName(ctx){const a=(ctx||'').split(':'),f=a[0]==='proj'?DB.proj.find(x=>x.id===a[1]):a[0]==='dec'?DB.dec.find(x=>x.id===a[1]):a[0]==='wish'?W(a[1]):a[0]==='ord'?DB.orders.find(x=>x.id===a[1]):null;return f?(f.short||f.proj||f.title||f.name):''}
function ptOf(el){if(!el||!el.isConnected)return null;const t=(el.querySelector&&el.querySelector('.bm'))||el,r=t.getBoundingClientRect();if(!r.width||r.bottom<0||r.top>innerHeight)return null;return{x:r.left+r.width/2,y:r.top+r.height/2}}
function aim(c,pt){c.classList.add('meas');const r=c.getBoundingClientRect();c.classList.remove('meas');const p=pt||{x:innerWidth-44,y:innerHeight-110};c.style.setProperty('--dx',Math.round(p.x-(r.left+r.width/2))+'px');c.style.setProperty('--dy',Math.round(p.y-(r.top+r.height/2))+'px')}
function openChat(b,ctx,el,auto){const f=()=>{chatPt=ptOf(el);fromSel=el&&el.isConnected?(el.id?'#'+el.id:el.dataset&&el.dataset.act?`[data-act="${el.dataset.act}"]`+(el.dataset.id?`[data-id="${el.dataset.id.replace(/["\\]/g,'\\$&')}"]`:''):null):null;delete UNREAD[b];
  const c={b,ctx:ctx||'',auto:auto||null};if(S.chat){S.chat=c;render('keep')}else go({chat:c},'keep')};
 if(S.sheet)closeThen(f);else f()}
function quick(on){return on.b==='peng'&&!S.bound?[]:(BOTS[on.b].cmds||[])}
function chatShell(on){const b=on.b,bot=BOTS[b],cn=ctxName(on.ctx);
 return `<div class="cav" id="cAv">${bm(b,'idle')}</div>
 <header class="chd"><div class="cwho"><h2 id="cTitle">${bot.name}</h2><small>${ROLE[b]}</small></div><button class="btn ghost" data-act="chatinfo" id="cInfoB" aria-expanded="false" aria-controls="cInfo">能做什麼</button><button class="btn ghost" data-act="chatclose" id="cClose">關閉 ✕</button></header>
 <div class="cinfo" id="cInfo" hidden><div class="can" style="margin:0"><div><b>能做</b><span>${esc(bot.can)}</span></div><div><b>不做</b><span>${esc(bot.cant)}</span></div></div></div>
 ${cn?`<div class="cctx">${chip('關於：'+cn)}</div>`:''}
 <div class="clog" id="clog" role="log" aria-live="polite" aria-label="和${bot.name}的對話" tabindex="0"></div>
 <div class="cq" id="cq"></div><p class="err" id="cErr" role="alert" hidden>▲ 還沒寫字。先寫一句再傳。</p>
 <div class="cin"><textarea id="cText" rows="1" aria-label="想跟${bot.name}說什麼" placeholder="${PH[b]}" enterkeyhint="send"></textarea><button class="btn pri" data-act="chatsend">傳給${bot.name}</button></div>
 <p class="cfoot">原型：回覆是示意，不會真的送出</p>`}
function msgHTML(m){const f=m.fresh?' new':'';m.fresh=0;
 if(m.wait)return `<div class="cm bot${f}"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>${BOTS[m.b].name}處理中</div>`;
 if(m.k==='order')return `<div class="cm bot card${f}">${orderHTML(m.id)}</div>`;
 if(m.k==='din')return `<div class="cm bot card${f}">${dinHTML(m)}</div>`;
 return `<div class="cm ${m.w}${f}">${esc(m.t)}${m.w==='me'?'<small>已送出</small>':''}</div>`}
function logSync(){const on=S.chat,l=$('#clog');if(!on||!l)return;const a=CH[on.b],un=on.b==='peng'&&!S.bound;
 l.innerHTML=a.map(msgHTML).join('')+(un?`<div class="cm bot card"><b>還沒綁定朋朋</b><div class="btns">${B('綁定朋朋','bindok',null,'pri')}</div></div>`:'');
 $('#cq').innerHTML=quick(on).map(q=>`<button data-act="chatq" data-id="${esc(q)}">${esc(q)}</button>`).join('');l.scrollTop=l.scrollHeight}
function mood(b,m){const e=$('#cAv .bm');if(e&&S.chat&&S.chat.b===b){e.dataset.m=m;faceSync()}}
function hop(e){if(!e||RM)return;e.classList.remove('hop');void e.offsetWidth;e.classList.add('hop')}
function headBot(){return Object.keys(UNREAD).find(k=>UNREAD[k])||OWN[document.documentElement.dataset.tab]||'daqi'}
function headSync(){const hd=$('#chead'),b=headBot(),n=UNREAD[b]||0;
 if(hd.dataset.b!==b){hd.dataset.b=b;hd.innerHTML=bm(b,'idle')+'<span class="dot" hidden></span>';hd.style.setProperty('--cc',`var(--c-${b})`)}
 const d=hd.querySelector('.dot');d.hidden=!n;d.textContent=n||'';hd.setAttribute('aria-label',`跟${BOTS[b].name}說`+(n?`，${n} 則新回覆`:''));hd.classList.toggle('off',!!S.chat)}
function arrive(b){if(S.chat&&S.chat.b===b){logSync();mood(b,'speaking');hop($('#cAv'));setTimeout(()=>{if(S.chat&&S.chat.b===b&&!CH[b].some(m=>m.wait))mood(b,'idle')},2200)}
 else{UNREAD[b]=(UNREAD[b]||0)+1;headSync();const hd=$('#chead');hop(hd);const f=FACES.get(hd.querySelector('.bm'));if(f&&!RM)f.poke()}}
function answer(b,text,ctx){const a=(ctx||'').split(':');
 if(b==='din'){const m={w:'bot',k:'din',ctx:ctx||'',v:dinView(ctx),mid:'v'+(++seq)};DV[m.mid]=m;return m}
 if(b==='peng'){if(!S.bound)return{w:'bot',t:'我還沒綁定。先按下面的「綁定朋朋」，我才能幫你記和買。'};
  const w=a[0]==='wish'&&W(a[1]);if(w&&w.ord&&ORD[w.ord])return{w:'bot',t:'訂單卡在上面，你按付款鈕我就去付。'};
  if(w||/買|訂|下單/.test(text))return{w:'bot',k:'order',id:mkOrder(w?w.id:null,text)};
  if(/比價/.test(text))return{w:'bot',t:'好，我轉給萌萌比價，結果會放在「想買」那張卡上。'}}
 if(b==='daqi')return{w:'bot',t:(a[1]&&ctxName(ctx)?`「${ctxName(ctx)}」這件我記下了。`:'收到。')+'我先查，結果回在這裡。'};
 DB.jobs.unshift({id:'c'+(++seq),bot:b,who:BOTS[b].name,title:text.slice(0,40),st:'進行中',ago:'剛剛'});
 return{w:'bot',t:`好，「${text.slice(0,40)}」我去做，做完回在這裡，進度在首頁「正在跑」。`}}
function say(b,text,ctx){const w={w:'bot',wait:1,b,fresh:1};CH[b].push({w:'me',t:text,fresh:1},w);mood(b,'thinking');hop($('#cAv'));logSync();
 setTimeout(()=>{const i=CH[b].indexOf(w);if(i<0)return;CH[b].splice(i,1,Object.assign(answer(b,text,ctx),{fresh:1}));arrive(b)},RM?400:1100)}
function chatSync(){const c=$('#chat'),sc=$('#cscrim'),hd=$('#chead'),on=S.chat;
 if(on){if(!shownChat||shownChat.b!==on.b||shownChat.ctx!==on.ctx){c.dataset.b=on.b;c.style.setProperty('--cc',`var(--c-${on.b})`);c.innerHTML=chatShell(on)}
  logSync();
  if(!shownChat){c.hidden=false;sc.hidden=false;aim(c,chatPt);requestAnimationFrame(()=>{c.classList.add('in');sc.classList.add('in')});const x=$('#cClose');if(x)x.focus({preventScroll:true})}
  [$('#view'),$('#top'),$('#dock'),document.querySelector('.tabs'),$('#page'),$('#sheet')].forEach(e=>{if(e)e.inert=true})}
 else if(shownChat){aim(c,ptOf(fromSel&&document.querySelector(fromSel))||ptOf(hd));c.classList.remove('in');sc.classList.remove('in');
  setTimeout(()=>{if(!S.chat){c.hidden=true;sc.hidden=true;c.innerHTML='';payGuard()}},210)}
 shownChat=on?{b:on.b,ctx:on.ctx}:null;hd.inert=!!(on||S.sheet);headSync();
 if(on&&on.auto){const f=on.auto;on.auto=null;f()}}
{const _r=render;render=function(dir){_r(dir);chatSync();$('#app').classList.toggle('over',!!(S.sheet||S.page||S.chat));payGuard()}}
ACT.talk=(id,el)=>openChat('daqi',id?(DB.proj.some(p=>p.id===id)?'proj:'+id:DB.dec.some(d=>d.id===id)?'dec:'+id:''):'',el);
ACT.bot=(id,el)=>openChat(CH[id]?id:'daqi','',el);
ACT.chathead=(id,el)=>openChat(headBot(),'',el);
ACT.chatclose=()=>{if(S.chat)back()};
ACT.chatinfo=()=>{const i=$('#cInfo'),b=$('#cInfoB'),o=i.hidden;i.hidden=!o;b.setAttribute('aria-expanded',o);b.textContent=o?'收起說明':'能做什麼'};
ACT.chatq=id=>{if(S.chat)say(S.chat.b,id,S.chat.ctx)};
ACT.chatsend=()=>{const t=$('#cText'),v=t?t.value.trim():'',e=$('#cErr');if(!S.chat||!t)return;if(!v){e.hidden=false;t.focus();return}e.hidden=true;t.value='';t.style.height='';say(S.chat.b,v,S.chat.ctx)};
{const _s=ACT.sheet;ACT.sheet=function(id,el){const a=id.split(':');if(a[0]==='talk')return ACT.talk(a[1],el);if(a[0]==='bot')return ACT.bot(a[1],el);if(a[0]==='proj')return ACT.page(id);_s.call(this,id)}}
{const _c=ACT.cmd;ACT.cmd=function(id){_c.apply(this,arguments);const i=id.indexOf(':'),b=id.slice(0,i),c=id.slice(i+1);if(CH[b]){CH[b].push({w:'me',t:c},{w:'bot',t:'好，我去做，做完回在這裡。',fresh:1});arrive(b)}}}
WRITE.push('chatsend','chatq','pay','payfix','wishadd','wishcmp','wishpick','wishkim','wishbuy','wishdel','wishmark','wishup','wishdn','dinapply','askdin');
document.addEventListener('input',e=>{const t=e.target;if(t.id==='cText'){t.style.height='auto';t.style.height=Math.min(96,t.scrollHeight+2)+'px';const x=$('#cErr');if(x)x.hidden=true}});
document.addEventListener('keydown',e=>{if(e.key!=='Enter'||e.shiftKey||e.isComposing||e.keyCode===229)return;const t=e.target;
 if(t.id==='wishIn'){e.preventDefault();ACT.wishadd()}
 else if(t.id==='cText'&&!(window.matchMedia&&matchMedia('(pointer:coarse)').matches)){e.preventDefault();if(S.st==='offline'){toast('離線中，這個動作連上線再做');return}ACT.chatsend()}});
/* 浮動頭像可以拖到左右邊緣停靠；不拖也能用，拖曳只是擺位置 */
{const hd=$('#chead');let st=null,moved=false;const LM=()=>innerWidth>=1000?230:10;
 hd.addEventListener('pointerdown',e=>{st={x:e.clientX,y:e.clientY,r:hd.getBoundingClientRect()};moved=false;try{hd.setPointerCapture(e.pointerId)}catch(_){}});
 hd.addEventListener('pointermove',e=>{if(!st)return;const dx=e.clientX-st.x,dy=e.clientY-st.y;if(!moved&&Math.hypot(dx,dy)<8)return;moved=true;hd.classList.add('drag','moved');
  hd.style.left=Math.max(LM()-6,Math.min(innerWidth-st.r.width-4,st.r.left+dx))+'px';hd.style.top=Math.max(64,Math.min(innerHeight-st.r.height-72,st.r.top+dy))+'px';hd.style.right='auto';hd.style.bottom='auto'});
 const end=()=>{if(!st)return;st=null;if(moved){hd.classList.remove('drag');const r=hd.getBoundingClientRect();hd.style.left=(r.left+r.width/2<(innerWidth+LM())/2?LM():innerWidth-r.width-10)+'px'}};
 hd.addEventListener('pointerup',end);hd.addEventListener('pointercancel',end);
 hd.addEventListener('click',e=>{if(moved){moved=false;e.stopPropagation();e.preventDefault()}},true);
 addEventListener('resize',()=>{if(hd.classList.contains('moved')){hd.classList.remove('moved');hd.style.left=hd.style.top=hd.style.right=hd.style.bottom=''}})}
/* 鍵盤彈出：浮窗底邊跟著鍵盤上緣走，輸入框不被遮（iOS 用 visualViewport 量鍵盤高度） */
if(window.visualViewport){const vv=visualViewport,f=()=>{const kb=Math.max(0,Math.round(innerHeight-vv.height-vv.offsetTop));document.documentElement.style.setProperty('--kb',(kb>80?kb:0)+'px');const l=$('#clog');if(l&&S.chat)l.scrollTop=l.scrollHeight};vv.addEventListener('resize',f);vv.addEventListener('scroll',f)}
window.__chat=()=>({open:!!S.chat,b:S.chat&&S.chat.b,timers:Object.keys(PT).length,unread:Object.assign({},UNREAD)});

/* ---------- 1122-F 追加（2026-11-22）：頭像當入口、小字掃描、該繳的、行事曆、同步 ----------
   由 _暫存/三隻與追加.py 嵌進 v3 主程式（同一個作用域）。資料全是示意，不接真的行事曆或帳戶。 */

/* 日期：以 11/22（週日）為第 0 天 */
const WK='日一二三四五六';
const dOf=n=>{let m=11,d=22+n;if(d>30){m=12;d-=30}return{m,d,w:((n%7)+7)%7}};
const dl=n=>{const x=dOf(n);return `${x.m}/${x.d}`},dlw=n=>{const x=dOf(n);return `${x.m}/${x.d}（${WK[x.w]}）`};
const dayName=n=>n===0?'今天':n===1?'明天':n===2?'後天':dlw(n);
const isoOf=n=>{const x=dOf(n);return `2026-${String(x.m).padStart(2,'0')}-${String(x.d).padStart(2,'0')}`};
const nOfIso=v=>{const a=(v||'').split('-').map(Number);if(a.length<3||!a[2])return null;return a[1]===11?a[2]-22:a[1]===12?a[2]+8:null};
// 個人日曆分類碼與 Google 色（14 號準則）：S 櫻花粉、E 薰衣草、W 孔雀藍、C 橘、L 淡綠；黃色只給公司
const CAT={S:['出班','#E67C73'],E:['剪接','#7986CB'],W:['企劃行政','#039BE5'],C:['創作','#F4511E'],L:['生活','#33B679']};

/* ---------- 頭像當入口：右上角是這一頁主人的臉，點了跟它說話 ---------- */
function pageOwner(){if(!S.page)return null;const a=S.page.split(':');
 if(a[0]==='zone')return{b:ZONE[a[1]].b,ctx:''};if(a[0]==='proj')return{b:'daqi',ctx:'proj:'+a[1]};
 if(a[0]==='oppfull')return{b:'jiji',ctx:''};if(a[0]==='deleted')return{b:'jiji',ctx:''};return{b:'daqi',ctx:''}}
const ownerNow=()=>{const p=pageOwner();return p?p.b:(OWN[S.tab]||'daqi')};
function havHTML(b,ctx){return `<button class="hav" data-act="havtalk" data-id="${b}|${esc(ctx||'')}" aria-label="跟${BOTS[b].name}說話">${bm(b,'idle')}<span class="dot" hidden></span></button>`}
function havSync(){const h=$('#hav'),b=OWN[S.tab]||'daqi';
 if(h&&h.dataset.id!==b+'|'){h.dataset.id=b+'|';const o=h.querySelector('.bm');if(o)o.outerHTML=bm(b,'idle')}
 document.querySelectorAll('.hav').forEach(e=>{const k=e.dataset.id.split('|')[0],n=UNREAD[k]||0,d=e.querySelector('.dot');if(d){d.hidden=!n;d.textContent=n||''}
  e.setAttribute('aria-label',`跟${BOTS[k].name}說話`+(n?`，${n} 則新回覆`:''))})}
ACT.havtalk=(id,el)=>{const i=id.indexOf('|');tipOff();openChat(id.slice(0,i),id.slice(i+1),el)};
// 浮動頭像只在「別隻」有新回覆時才出現；這一頁主人的新回覆，紅點直接標在右上角的臉
{const _h=headSync;headSync=function(){_h();const hd=$('#chead'),b=hd.dataset.b;hd.classList.toggle('gone',!(UNREAD[b]&&b!==ownerNow()));havSync()}}
{const _a=arrive;arrive=function(b){_a(b);if(S.chat&&S.chat.b===b)return;
 document.querySelectorAll('.hav').forEach(e=>{if(e.dataset.id.split('|')[0]!==b)return;hop(e);const f=FACES.get(e.querySelector('.bm'));if(f&&!RM)f.poke()})}}
// 第一次：一個會自己消失的小提示
let tipT=0;
function tipOn(){let seen=null;try{seen=localStorage.getItem('zl3tip')}catch(e){}try{if(new URLSearchParams(location.search).get('tip')==='0')seen='1'}catch(e){}
 if(seen||$('#havtip'))return;const t=document.createElement('div');t.className='havtip';t.id='havtip';t.setAttribute('role','status');
 t.textContent='點右上角的頭像，可以跟這一頁的主人說話';document.body.appendChild(t);try{localStorage.setItem('zl3tip','1')}catch(e){}tipT=setTimeout(tipOff,4800)}
function tipOff(){clearTimeout(tipT);tipT=0;const t=$('#havtip');if(!t||t.classList.contains('out'))return;t.classList.add('out');setTimeout(()=>{if(t.parentNode)t.remove()},RM?0:320)}
document.addEventListener('pointerdown',()=>{if($('#havtip'))tipOff()},true);
// 定定不是房間主人，給一顆小頭像鈕（頭像＋名字），不寫「問定定」
function dinB(ctx){return `<button class="advb" data-act="askdin" data-id="${esc(ctx||'')}" aria-label="問定定的看法">${bm('din')}<span aria-hidden="true">定定</span></button>`}

/* ---------- 機會：立即掃描改成小字 ---------- */
function scanRow(){const on=!!S.scan,turn=on&&Date.now()-(S.scanAt||0)<900;
 return `<div class="scanrow"><span class="lbl">上次 8:00 掃描，新增 2 張</span><button class="scan${turn?' turn':''}" data-act="scan"${on?' aria-disabled="true"':''}><span class="ri" aria-hidden="true">↻</span><span role="status">${on?'已叫集集掃描，約 5～15 分鐘':'立即掃描'}</span></button></div>`}
ACT.scan=()=>{if(S.scan)return;S.scan=1;S.scanAt=Date.now();DB.jobs.unshift({id:'scan',bot:'jiji',who:'集集',title:'立即掃描新機會',st:'進行中',ago:'剛剛'});
 CH.jiji.push({w:'me',t:'立即掃描新機會'},{w:'bot',t:'掃描中，約 5～15 分鐘，新的卡片會直接放進機會清單。',fresh:1});render('keep');arrive('jiji')};

/* ---------- 同步到行事曆：卡片上的小標記與開關 ---------- */
const SY={};
const sy=(k,def)=>SY[k]||(SY[k]=Object.assign({on:true,st:'ok'},def||{}));
function syncTag(k,where,def){const s=sy(k,def);let t;
 if(!s.on)t=`<span class="st">不同步到行事曆</span>`;
 else if(s.st==='run')t=`<span class="st"><span class="spin" aria-hidden="true"></span>大器同步中</span>`;
 else if(s.st==='ask')t=`<span class="st">▲ ${esc(s.note)}，要同步到行事曆嗎？</span><span class="sbtn">${B('同步','syncyes',k,'pri')}${B('先不要','syncno',k,'ghost')}</span>`;
 else t=`<span class="st ok">✓ 已同步到行事曆：${esc(where)}</span>`;
 return `<div class="sync" data-sync="${esc(k)}">${t}<button class="swi" role="switch" aria-checked="${!!s.on}" aria-label="同步到行事曆" data-act="synctog" data-id="${esc(k)}"></button></div>`}
function syncRun(k,msg){const s=sy(k);s.on=true;s.st='run';render('keep');setTimeout(()=>{if(s.st!=='run')return;s.st='ok';render('keep');if(msg)toast(msg)},RM?300:1300)}
ACT.synctog=k=>{const s=sy(k);if(s.on){const o=s.st;s.on=false;render('keep');toast('這張卡不同步了，行事曆上那筆大器會拿掉',()=>{s.on=true;s.st=o;render('keep')})}else syncRun(k,'重新同步到行事曆了')};
ACT.syncyes=k=>{const s=sy(k);if(s.apply){s.apply();s.apply=null}syncRun(k,'已同步到行事曆')};
ACT.syncno=k=>{const s=sy(k);s.on=false;s.st='ok';render('keep');toast('先不同步，日期只留在面板',()=>{s.on=true;s.st='ask';render('keep')})};

/* 案子的日期（品牌短片三個）。對外日期放公司，個人實際排程可以提前（14 號準則） */
const DT={'p1:a':{p:'p1',lab:'交分鏡',d:3,co:1,me:'W',lead:1,meLab:'分鏡定稿'},
 'p1:b':{p:'p1',lab:'拍攝',d:12,co:1,me:'S',lead:0,meLab:'拍攝',tent:1},
 'p1:c':{p:'p1',lab:'交片',d:28,co:1,me:'E',lead:2,meLab:'Final 修正'}};
// 行事曆 → 面板：老大在 Google 行事曆把拍攝從 12/03 改到 12/04（示意），面板跟著改並提示一次
const GCN={k:'p1:b',lab:'拍攝',from:'12/03',to:'12/04'};
const dtWhere=x=>(x.co?`公司（對外${x.lab}日）`:'')+(x.co&&x.me?'＋':'')+(x.me?`個人 ${x.me}.${CAT[x.me][0]}`+(x.lead?`（提前 ${x.lead} 天）`:''):'');
function pxSync(){const p=DB.proj.find(x=>x.id==='p1'),a=DT['p1:a'],X=pxOf(p);
 X.dates=['a','b','c'].map(k=>{const x=DT['p1:'+k];return[x.lab,dl(x.d)+(k==='a'?`，剩 ${x.d} 天`:'')+(x.tent?'（暫定）':'')]});
 X.left=`剩 ${a.d} 天`;X.leftSub=`${dl(a.d)} 交分鏡`;p.due=`剩 ${a.d} 天交分鏡`}
pxSync();
{const p4=DB.proj.find(x=>x.id==='p4');if(p4&&!p4.short)p4.short='新歌 demo'}   // 行事曆上用短名
// 大器自己推算的日期變動：不自動改行事曆，先問
sy('proj:p4',{st:'ask',note:'大器推算錄 demo 會落到 12/05',apply(){DT['p4:a']={p:'p4',lab:'錄 demo',d:13,co:0,me:'C',lead:0,meLab:'錄 demo'}}});
function gcNote(){return S.gcSeen?'':`<div class="gcn" role="status"><span>行事曆改了 ${GCN.from} → ${GCN.to}（${GCN.lab}），面板跟著改了</span>${B('知道了','gcok',null,'ghost')}</div>`}
ACT.gcok=()=>{S.gcSeen=1;render('keep')};
function projSync(p){if(p.id==='p1')return gcNote()+syncTag('proj:p1',`${DT['p1:a'].lab} ${dl(DT['p1:a'].d)} 等 3 個日期，公司＋個人`);
 if(p.id==='p4')return syncTag('proj:p4','個人 C.創作（錄 demo）');return ''}
function dtBody(pid){const ks=Object.keys(DT).filter(k=>DT[k].p===pid);if(!ks.length)return '';
 return ks.map(k=>{const x=DT[k],ed=S.dtEdit===k;return `<div class="dt" data-card="dt:${k}"><div class="li"><div><b>${esc(x.lab)}</b><small>${dlw(x.d)}${x.tent?'・暫定':''}${GCN.k===k?'・行事曆改過':''}</small></div>${ed?`<label class="vh" for="dti">改${esc(x.lab)}的日期</label><input type="date" class="dti" id="dti" data-dt="${k}" value="${isoOf(x.d)}" min="2026-11-22">`:mb('改日期','dtedit',k)}</div>${syncTag('dt:'+k,dtWhere(x))}</div>`}).join('')+`<p class="note">你在這裡親手改的那一筆，大器才會去改行事曆；大器自己推算的日期只會問你。</p>`}
ACT.dtedit=k=>{S.dtEdit=k;render('keep');const i=$('#dti');if(i)i.focus()};
document.addEventListener('change',e=>{const t=e.target;if(!t.classList||!t.classList.contains('dti'))return;const k=t.dataset.dt,x=DT[k],n=nOfIso(t.value);
 if(n==null||n<0){toast('日期要選今天以後');return}const o=x.d;x.d=n;S.dtEdit=null;pxSync();
 syncRun('dt:'+k,`${x.lab}改成 ${dl(n)}，行事曆的${x.co?'公司':''}${x.co&&x.me?'＋':''}${x.me?'個人':''}都更新了`);
 if(o!==n)toast(`${x.lab}改成 ${dl(n)}，大器同步中`,()=>{x.d=o;pxSync();render('keep')})});

/* ---------- 錢：該繳的（放在錢房間最上面） ---------- */
const KIND={card:'信用卡',rent:'房租',util:'水電瓦斯電信',ins:'保險',loan:'貸款',tax:'稅'};
// 欄位參考塔塔記帳現況 kakeibo 的帳單（name、amount、due_day、kind、account）與其他負債，只讀
DB.due=[
 {id:'d1',kind:'card',name:'示意銀行信用卡 11 月帳單',amt:12480,due:'11/25',in:3,auto:1,from:'示意銀行 活存（尾號 0328）'},
 {id:'d2',kind:'util',name:'示意電信 11 月電信費',amt:699,due:'11/25',in:3,to:'示意電信'},
 {id:'d3',kind:'rent',name:'12 月房租（示意）',amt:18000,due:'11/28',in:6,to:'房東 王先生（示意）'},
 {id:'d4',kind:'tax',name:'機車牌照稅（示意）',amt:450,due:'11/30',in:8,to:'監理服務網'},
 {id:'d5',kind:'util',name:'水費 11 月（示意）',amt:412,due:'12/02',in:10,auto:1,from:'示意郵局（尾號 5521）'},
 {id:'d6',kind:'ins',name:'壽險年繳（示意）',amt:24600,due:'12/05',in:13,to:'示意人壽'},
 {id:'d7',kind:'loan',name:'機車分期 第 8／24 期（示意）',amt:3250,due:'12/10',in:18,auto:1,from:'示意銀行 活存（尾號 0328）'},
 {id:'d8',kind:'util',name:'電費 9～10 月（示意）',amt:1236,due:'11/18',in:-4,auto:1,from:'示意郵局（尾號 5521）',paid:'11/18 自動扣了'},
 {id:'d9',kind:'card',name:'示意銀行信用卡 10 月帳單',amt:9870,due:'10/25',in:-28,auto:1,from:'示意銀行 活存（尾號 0328）',paid:'10/24 自動扣了'}];
DB.due.filter(d=>!d.auto).forEach(d=>payReg('d_'+d.id,{amt:nt(d.amt),to:d.to,by:'tata',done(){d.paidAt=NOW}}));
const duePaid=d=>!!d.paid||!!(PAY['d_'+d.id]&&PAY['d_'+d.id].st==='paid');
function dueRow(d){return `<div class="card dr cardx" data-card="${esc(d.id)}">${mineB('due:'+d.id,d.name)}<div class="meta">${chip(`${d.due} 截止・剩 ${d.in} 天`,d.in<=7)}<span class="lbl">${KIND[d.kind]}</span></div>
 <div class="li"><div><h3>${esc(d.name)}</h3><p class="note" style="margin-top:2px">${d.auto?`<span class="chip">自動扣</span> ${esc(d.from)}`:`付給 ${esc(d.to)}`}</p></div><span class="amt">${nt(d.amt)}</span></div>
 ${d.auto?'':payHTML('d_'+d.id)}</div>`}
function dueHTML(){const a=E()?[]:DB.due;if(!a.length)return '';
 // 剛按付款的那一筆先留在原地給你看收據（付款只換那一格，不重畫），下次畫面才收進「已繳」
 const todo=a.filter(d=>!duePaid(d)).sort((x,y)=>x.in-y.in),done=a.filter(duePaid);
 const left=todo,sum=left.reduce((s,d)=>s+d.amt,0),soon=left.filter(d=>d.in<=7).length,hand=left.filter(d=>!d.auto).length,op=!!S.open.duepaid;
 return `<section class="sec due" id="secDue">${sh('tata','該繳的',`${left.length} 筆 ${nt(sum)}${soon?`・▲ 7 天內 ${soon} 筆`:''}・要你按的 ${hand} 筆`)}<div class="stack">${todo.map(dueRow).join('')}</div>
 ${done.length?`<div class="rows" style="margin-top:10px"><div class="rowi"><button class="rowb" data-act="open" data-id="duepaid" aria-expanded="${op}"><span class="tx"><b>已繳 ${done.length} 筆</b><small>${nt(done.reduce((s,d)=>s+d.amt,0))}</small></span><span class="rt"><span class="chev" aria-hidden="true">${op?'⌃':'⌄'}</span></span></button></div>
 ${op?done.map(d=>`<div class="rowi"><div class="rowb"><span class="tx"><b style="font-weight:500">${esc(d.name)}</b><small>✓ ${d.paid?esc(d.paid):`今天 ${d.paidAt} 你按付款鈕，塔塔付了`}・${d.auto?'自動扣':'手動繳'}</small></span><span class="rt"><span class="amt">${nt(d.amt)}</span></span></div></div>`).join(''):''}</div>`:''}</section>`}

/* ---------- 行事曆（示意資料，不接真的行事曆） ---------- */
const CAL=[
 {id:'c1',d:0,t:'14:30',e:'15:30',n:'剪頭髮',src:'me',cat:'L',place:'示意髮廊（永和）'},
 {id:'c2',d:0,t:'18:30',e:'20:30',n:'家庭聚餐',src:'me',cat:'L',place:'示意餐廳（板橋）',who:'家人'},
 {id:'c3',d:0,t:'21:00',e:'22:30',n:'新歌副歌詞第二版',src:'me',cat:'C',place:'家裡'},
 {id:'c4',d:1,t:'10:00',e:'11:00',n:'週會',src:'co',cs:'好咖',place:'公司會議室',who:'好咖全員',why:'你是參加者'},
 {id:'c5',d:2,t:'14:00',e:'15:00',n:'試看帶回饋會議',src:'co',cs:'木星 TAPIN',place:'Google Meet',who:'客戶、大器',why:'你負責的案子'},
 {id:'c6',d:2,t:'15:00',e:'19:00',n:'木星 TAPIN Bcopy 修正',src:'me',cat:'E',place:'家裡'},
 {id:'c7',d:5,t:'13:00',e:'18:00',n:'Borry 有事',src:'co',hold:1,why:'私人案的占位，不寫內容'},
 {id:'c8',d:5,t:'13:00',e:'18:00',n:'牧星 外拍',src:'me',cat:'S',place:'示意外拍地點',priv:1},
 {id:'c9',d:9,t:'10:00',e:'12:00',n:'勘景',src:'co',cs:'品牌短片',place:'示意攝影棚',who:'攝影師、美術',why:'你負責的案子'},
 {id:'c10',d:9,t:'10:00',e:'12:00',n:'品牌短片 勘景',src:'me',cat:'S',place:'示意攝影棚'},
 {id:'c11',d:7,t:'',e:'',all:1,n:'剪接休息日',src:'me',cat:'L',place:''}];
const RULES=[
 '兩個日曆：公司「好咖文創」一律黃色；個人「Borry\'s Calendar」照分類碼上色，黃色只給公司。',
 '公司放對外日期：公司業務、客戶交件日、外部會議、進組出班、團隊協作。標題寫【案名】事件名稱 @Borry。',
 '個人放你實際工作和生活的時段。標題寫「分類碼.事件名」，句點是半形。',
 '分類碼：S 出班（櫻花粉）、E 剪接（薰衣草）、W 企劃行政（孔雀藍）、C 創作（橘）、L 生活（淡綠）。',
 '對外交件日放公司、實際排程放個人；同一件事可以兩邊各一筆，各用各的格式。個人可以比對外日期提前，對外日期不因個人提前而改。',
 '私人案只放個人；公司同時段放匿名「Borry 有事」占位，不寫內容。',
 '分類想超過三秒就先記事件名，分類碼事後補。',
 '不主動改行事曆上既有的事件；你在面板上親手改的那一筆，才算你指定。'];
const rawTitle=e=>e.src==='co'?(e.hold?'Borry 有事':`【${e.cs||'案名待補'}】${e.n} @Borry`):`${e.cat||'（分類待補）'}${e.cat?'.':''}${e.n}`;
const etaN=o=>o.dn!=null?o.dn:/明天/.test(o.eta)?1:/後天/.test(o.eta)?2:(/(\d+) 天後/.exec(o.eta)||[])[1]?+/(\d+) 天後/.exec(o.eta)[1]:(/11\/(\d+)/.exec(o.eta)||[])[1]?+/11\/(\d+)/.exec(o.eta)[1]-22:3;
function calAll(){if(E())return[];const a=CAL.filter(e=>!e.del).map(e=>Object.assign({},e));
 Object.keys(DT).forEach(k=>{const x=DT[k],p=DB.proj.find(q=>q.id===x.p),m=SY['proj:'+x.p],s=SY['dt:'+k];if(m&&(!m.on||m.st==='ask'))return;if(s&&!s.on)return;
  const st=(s&&s.st==='run')||(m&&m.st==='run')?'run':'',cs=p.short||p.title.replace(/（示意）/,'');
  if(x.co)a.push({id:'dt:'+k+':co',d:x.d,all:1,n:x.lab,src:'co',cs,from:'案子',go:'proj:'+x.p,st,why:'你負責的案子'});
  if(x.me)a.push({id:'dt:'+k+':me',d:x.d-x.lead,all:1,n:cs+' '+x.meLab,src:'me',cat:x.me,from:'案子',go:'proj:'+x.p,st})});
 
 DB.orders.forEach(o=>{if(o.st>=2)return;const s=sy('ord:'+o.id);if(!s.on)return;a.push({id:'ord:'+o.id,d:etaN(o),all:1,n:'到貨：'+o.name.replace(/（示意）/,''),src:'me',cat:'L',from:'生活',go:'tab:life',st:s.st==='run'?'run':''})});
 return a.filter(e=>e.d>=0&&e.d<=13).sort((x,y)=>x.d-y.d||((x.all?'':x.t)<(y.all?'':y.t)?-1:1))}
const calFind=id=>calAll().find(e=>e.id===id);
function srcTag(e){return e.src==='co'?`<span class="src" data-s="co"><i aria-hidden="true"></i>公司</span>`:`<span class="src" style="--cc:${e.cat&&CAT[e.cat]?CAT[e.cat][1]:'var(--ink2)'}"><i aria-hidden="true"></i>個人${e.cat?' '+e.cat:''}</span>`}
function evState(e){return e.st==='run'?'<span class="est"><span class="spin" aria-hidden="true"></span>大器同步中</span>':e.mk==='run'?'<span class="est"><span class="spin" aria-hidden="true"></span>大器建立中</span>':e.mk==='ok'?`<span class="est ok">✓ 已加到 ${esc(e.mkTo)}</span>`:e.cancel?'<span class="est">已取消，行事曆上那筆拿掉了</span>':''}
function evRow(e){return `<div class="rowi${e.cancel?' gone':''}" data-card="${esc(e.id)}"><button class="rowb evr" data-act="sheet" data-id="cal:${esc(e.id)}"><span class="tm">${e.all?'全天':e.t}</span><span class="tx"><b>${esc(e.n)}</b><small>${[e.place,e.from?'來自'+e.from:''].filter(Boolean).map(esc).join('・')||'沒寫地點'}</small>${evState(e)}</span><span class="rt">${srcTag(e)}</span></button></div>`}
function todayStrip(){if(S.st==='loading'||S.st==='error')return '';const a=calAll().filter(e=>e.d===0&&!e.cancel);
 return `<section class="sec tday">${sh('','今天行程',a.length?a.length+' 件':'',moreB('看全部','page','cal'))}${a.length?`<div class="hs">${a.slice(0,3).map(e=>`<button class="card evc" data-act="sheet" data-id="cal:${esc(e.id)}"><span class="tm">${e.all?'全天':e.t}</span><b>${esc(e.n)}</b><small>${esc(e.place||'沒寫地點')}</small>${srcTag(e)}</button>`).join('')}</div>`:`<div class="card"><p>今天沒有行程。</p></div>`}</section>`}
function calPage(){const v=S.calv||'week',f=S.calf||'all',all=calAll().filter(e=>f==='all'||e.src===f);
 let h=`<div class="page-in"><div class="phead">${B('‹ 返回','back',null,'ghost',' id="pBack"')}</div><h1 class="pt">行事曆</h1>
 <div class="seg" role="group" aria-label="怎麼看">${[['day','日'],['week','週（往後 14 天）']].map(x=>`<button aria-pressed="${v===x[0]}" data-act="calv" data-id="${x[0]}">${x[1]}</button>`).join('')}</div>
 <div class="seg" role="group" aria-label="看哪邊">${[['all','全部'],['me','只看個人'],['co','只看公司']].map(x=>`<button aria-pressed="${f===x[0]}" data-act="calf" data-id="${x[0]}">${x[1]}</button>`).join('')}</div>
 <div class="btns">${B('＋ 新增行程','sheet','calnew','pri')}${mb('規則 ›','sheet','calrules')}</div>`;
 if(E())return h+emptyBox('行事曆是空的','兩邊都還沒有行程。新增一筆，大器會照你的規則放到個人、公司或兩邊。',B('＋ 新增行程','sheet','calnew','pri'))+'</div>';
 if(v==='day'){const n=Math.max(0,Math.min(13,S.cald||0)),its=all.filter(e=>e.d===n);
  h+=`<div class="cdnav">${B('‹ 前一天','cald',String(n-1),'',n<=0?' disabled':'')}<b>${dayName(n)}${n<3?'　'+dlw(n):''}</b>${B('後一天 ›','cald',String(n+1),'',n>=13?' disabled':'')}</div>`;
  h+=its.length?`<div class="rows">${its.map(evRow).join('')}</div>`:`<div class="card" style="margin-top:12px"><p>${dayName(n)}沒有${f==='me'?'個人的':f==='co'?'公司的':''}行程。</p></div>`}
 else{let any=0;for(let n=0;n<=13;n++){const its=all.filter(e=>e.d===n);if(!its.length)continue;any=1;h+=`<section class="cday"><h3>${dayName(n)}${n<3?'　'+dlw(n):''}</h3><div class="rows">${its.map(evRow).join('')}</div></section>`}
  if(!any)h+=`<div class="card" style="margin-top:12px"><p>往後 14 天沒有${f==='me'?'個人的':'公司的'}行程。</p></div>`}
 return h+`<p class="note" style="margin-top:18px">另有 3 筆公司行程跟你無關，沒列。</p></div>`}
ACT.calv=id=>{S.calv=id;render('keep')};ACT.calf=id=>{S.calf=id;render('keep')};ACT.cald=id=>{S.cald=+id;render('keep')};
const shHead=t=>`<div class="grab" aria-hidden="true"></div><div class="shead"><h2 id="sTitle">${t}</h2>${B('關閉 ✕','close',null,'ghost',' id="sClose"')}</div>`;
function calSheet(id){const e=calFind(id);if(!e)return shHead('這筆行程不在了')+'<p style="margin-top:8px">可能已經取消或改到 14 天以外。</p>';
 let h=shHead(esc(e.n))+`<div class="meta" style="margin-top:8px">${srcTag(e)}<span class="lbl">${dlw(e.d)}　${e.all?'全天':e.t+'～'+e.e}</span></div>${evState(e)?`<p style="margin-top:6px">${evState(e)}</p>`:''}
 <dl class="kvs">${e.place?`<dt>地點</dt><dd>${esc(e.place)}</dd>`:''}${e.who?`<dt>參加者</dt><dd>${esc(e.who)}</dd>`:''}${e.why?`<dt>為什麼列給你</dt><dd>${esc(e.why)}</dd>`:''}<dt>行事曆上寫</dt><dd>${esc(rawTitle(e))}</dd>${e.src==='me'&&e.cat?`<dt>分類</dt><dd>${e.cat}.${CAT[e.cat][0]}</dd>`:''}</dl>`;
 if(e.from)return h+`<div class="btns">${B('去那張卡 ›','calgo',e.go,'pri wide')}</div>`;
 if(e.cancel)return h+`<div class="btns">${B('復原這筆','evundo',e.id,'wide')}</div>`;
 return h+`<label class="f">改成幾點開始<input type="time" id="evT" value="${e.all?'09:00':e.t}"></label><div class="btns">${B('存好，同步到行事曆','evsave',e.id,'pri wide')}</div><div class="mrow">${mb('🗑 取消這筆','evcancel',e.id)}</div>`}
ACT.calgo=id=>{const a=id.split(':');closeThen(()=>{if(a[0]==='proj')ACT.page(id);else go({tab:a[1],page:null,sheet:null},'keep')})};
ACT.evsave=id=>{const e=CAL.find(x=>x.id===id),v=($('#evT')||{}).value;if(!e||!v)return;const o=e.t;closeThen(()=>{e.t=v;e.all=0;e.st='run';render('keep');
 setTimeout(()=>{e.st='';render('keep');toast(`改成 ${v} 開始，行事曆同步好了`,()=>{e.t=o;render('keep')})},RM?300:1300)})};
ACT.evcancel=id=>{const e=CAL.find(x=>x.id===id);closeThen(()=>{e.cancel=1;e.st='run';render('keep');setTimeout(()=>{e.st='';render('keep');toast('取消了，行事曆上那筆拿掉了',()=>{e.cancel=0;render('keep')})},RM?300:1300)})};
ACT.evundo=id=>{const e=CAL.find(x=>x.id===id);closeThen(()=>{e.cancel=0;e.st='run';render('keep');setTimeout(()=>{e.st='';render('keep');toast('復原了，放回行事曆')},RM?300:1300)})};

/* 新增行程：表單下面即時顯示大器會照規則放到哪邊，可以手動改 */
function guess(f){const t=(f.title+' '+f.note+' '+f.who),G={};
 G.priv=/牧星|牧昕|私人案|私案/.test(t);G.life=/健身|聚餐|吃飯|看醫生|牙醫|剪頭髮|家人|約會|運動|私事|休息/.test(t)&&!G.priv;
 G.kind=/交件|交片|交分鏡|送件|交稿/.test(t)?'交件':/拍攝|出班|進組|外拍|勘景/.test(t)?'拍攝':/會議|開會|提案|比稿|週會|回饋/.test(t)?'會議':'';
 G.cs=/品牌短片/.test(t)?'品牌短片':/木星|TAPIN/i.test(t)?'木星 TAPIN':/好咖/.test(t)?'好咖':'';
 G.cat=/拍攝|出班|進組|外拍|勘景/.test(t)?'S':/剪|後期|調色|混音|交片|試看|copy/i.test(t)?'E':/企劃|腳本|分鏡|提案|報價|會議|文件|行政|交件|交稿|開會/.test(t)?'W':/創作|寫歌|demo|新歌|作品|詞/i.test(t)?'C':G.life?'L':'';
 G.co=!G.priv&&!G.life&&(!!G.kind||!!G.cs);G.me=true;G.lead=G.kind==='交件'?2:0;
 const wd=f.n!=null&&dOf(f.n).w>0&&dOf(f.n).w<6,work=f.s>='09:00'&&f.s<'18:00';G.hold=G.priv||(G.life&&wd&&work);return G}
function readForm(){const v=id=>{const e=$('#'+id);return e?e.value.trim():''};return{title:v('cfT'),note:v('cfN'),who:v('cfW'),place:v('cfP'),n:nOfIso(v('cfD')),s:v('cfS'),e:v('cfE')}}
function ctlOf(){const g=id=>$('#'+id);return{co:!!(g('cfCo')&&g('cfCo').checked),me:!!(g('cfMe')&&g('cfMe').checked),cat:g('cfCat')?g('cfCat').value:'',lead:g('cfLead')?+g('cfLead').value:0}}
function predHTML(f,c,G){if(!f.title)return '<b>寫了標題，這裡會顯示放哪邊。</b>';
 const parts=[];if(c.co)parts.push(G.hold?'公司（同時段放「Borry 有事」，不寫內容）':`公司（${G.kind==='交件'?'對外交件日':G.kind==='拍攝'?'進組出班':G.kind==='會議'?'外部會議':'公司業務'}）`);
 if(c.me)parts.push(c.cat?`個人 ${c.cat}.${CAT[c.cat][0]}（${G.kind==='交件'?'實際工作時段':c.cat==='L'?'生活時段':'實際時段'}${c.lead?`，提前 ${c.lead} 天`:''}）`:'個人（分類想不出來，先記名，分類碼之後補）');
 if(!parts.length)return '<b>兩邊都沒勾，這筆不會放上行事曆。</b>';
 const ttl=[];if(c.co)ttl.push(`公司：${G.hold?'Borry 有事':`【${G.cs||'案名待補'}】${f.title} @Borry`}${f.n!=null?'・'+dl(f.n):''}`);
 if(c.me)ttl.push(`個人：${c.cat?c.cat+'.':''}${f.title}${f.n!=null?'・'+dl(Math.max(0,f.n-c.lead)):''}`);
 return `<b>會放到：${parts.join('＋')}</b><p class="ttl">${ttl.map(esc).join('<br>')}</p>`}
function predSync(auto){const f=readForm(),G=guess(f);
 if(auto&&!S.cfMan){const g=id=>$('#'+id);if(g('cfCo'))g('cfCo').checked=G.co||G.hold;if(g('cfMe'))g('cfMe').checked=G.me;if(g('cfCat'))g('cfCat').value=G.cat;if(g('cfLead'))g('cfLead').value=String(G.lead)}
 const p=$('#cfPred');if(p)p.innerHTML=predHTML(f,ctlOf(),G)}
function calNew(){S.cfMan=0;return shHead('新增行程')+`<label class="f">標題<input id="cfT" type="text" placeholder="例：品牌短片交片給客戶" autocomplete="off"></label>
 <div class="two"><label class="f">日期<input id="cfD" type="date" value="${isoOf(1)}" min="2026-11-22"></label><label class="f">開始<input id="cfS" type="time" value="10:00"></label><label class="f">結束<input id="cfE" type="time" value="12:00"></label></div>
 <label class="f">地點<input id="cfP" type="text" placeholder="例：公司會議室、Google Meet" autocomplete="off"></label><label class="f">參加者<input id="cfW" type="text" placeholder="例：客戶、攝影師" autocomplete="off"></label>
 <label class="f">備註<textarea id="cfN" rows="2" placeholder="例：私人案、客戶要看 Acopy"></textarea></label>
 <div class="pred" id="cfPred" aria-live="polite"><b>寫了標題，這裡會顯示放哪邊。</b></div>
 <p class="h4">要改放哪邊</p><div class="chk"><label><input type="checkbox" id="cfCo"> 公司</label><label><input type="checkbox" id="cfMe" checked> 個人</label>
 <label>分類 <select id="cfCat"><option value="">待補</option>${Object.keys(CAT).map(k=>`<option value="${k}">${k} ${CAT[k][0]}</option>`).join('')}</select></label>
 <label>個人提前 <select id="cfLead">${[0,1,2,3].map(n=>`<option value="${n}">${n} 天</option>`).join('')}</select></label></div>
 <p class="err" id="cfErr" role="alert" hidden>▲ 先寫標題，再交給大器。</p>
 <div class="btns">${B('建立','calmk',null,'pri wide')}</div><div class="mrow">${mb('規則 ›','sheet','calrules')}</div>`}
document.addEventListener('input',e=>{const id=e.target.id||'';if(/^cf[TNWP]$/.test(id)){predSync(true);if(id==='cfT'){const x=$('#cfErr');if(x)x.hidden=true}}});
document.addEventListener('change',e=>{const id=e.target.id||'';if(/^cf(Co|Me|Cat|Lead)$/.test(id)){S.cfMan=1;predSync(false)}else if(/^cf[DSE]$/.test(id))predSync(true)});
ACT.calmk=()=>{const f=readForm(),c=ctlOf(),G=guess(f);if(!f.title){const x=$('#cfErr');if(x)x.hidden=false;const t=$('#cfT');if(t)t.focus();return}
 if(f.n==null||f.n<0){toast('日期要選今天以後');return}if(!c.co&&!c.me){toast('兩邊都沒勾，先勾一邊');return}
 const to=[c.co?'公司':'',c.me?'個人':''].filter(Boolean).join('＋'),made=[],sq=++seq;
 if(c.co)made.push({id:'n'+sq+'co',d:f.n,t:f.s,e:f.e,n:G.hold?'Borry 有事':f.title,src:'co',cs:G.cs,hold:G.hold?1:0,place:G.hold?'':f.place,who:G.hold?'':f.who,why:'你建立的',mk:'run',mkTo:to,pair:c.me?1:0});
 if(c.me)made.push({id:'n'+sq+'me',d:Math.max(0,f.n-c.lead),t:f.s,e:f.e,n:f.title,src:'me',cat:c.cat,place:f.place,who:f.who,mk:'run',mkTo:to,pair:c.co?1:0});
 closeThen(()=>{CAL.push(...made);if(S.page!=='cal')ACT.page('cal');else render('keep');
  setTimeout(()=>{made.forEach(m=>m.mk='ok');render('keep');toast(`已加到 ${to}`)},RM?300:1400)})};
function calRules(){return shHead('行事曆規則')+`
 <ol class="rl">${RULES.map((r,i)=>`<li>${S.ruleEd===i?`<label class="vh" for="rlT">改第 ${i+1} 條</label><textarea id="rlT" rows="3">${esc(r)}</textarea><div class="btns">${B('存好','rlsave',String(i),'pri')}${B('不改了','rled','-1','ghost')}</div>`:`<p>${esc(r)}</p><button class="more" data-act="rled" data-id="${i}" aria-label="改第 ${i+1} 條">改</button>`}</li>`).join('')}</ol>`}
ACT.rled=id=>{const n=+id;S.ruleEd=n<0?null:n;render('keep');const t=$('#rlT');if(t)t.focus()};
ACT.rlsave=id=>{const t=$('#rlT'),i=+id;if(t&&t.value.trim())RULES[i]=t.value.trim();S.ruleEd=null;render('keep');toast('改好了（示意，正式版改準則正本）')};

/* 接進原本的抽屜與整頁 */
{const _s=sheetHTML;sheetHTML=function(){const t=S.sheet;if(t.indexOf('cal:')===0)return calSheet(t.slice(4));if(t==='calnew')return calNew();if(t==='calrules')return calRules();return _s()}}
{const _p=pageHTML;pageHTML=function(){const h=S.page==='cal'?calPage():_p(),o=pageOwner();return h.replace(/(id="pBack">[^<]*<\/button>)<\/div>/,`$1${havHTML(o.b,o.ctx)}</div>`)}}
// 修舊 bug：浮窗打開時把抽屜設成 inert，關掉浮窗後沒還原，之後打開的抽屜（例如新增行程表單）點不動
{const _r=render;render=function(d){_r(d);if(!S.chat){const x=$('#sheet');if(x)x.inert=false}}}
WRITE.push('scan','synctog','syncyes','syncno','calmk','evsave','evcancel','evundo','rlsave');


/* ---------- 1122-G 細修（2026-11-22）：只有兩種控制 ----------
   老大 2026-11-22：「應該是分成兩種類型 一種是我人為操作更新編輯的，一種就是ai的小臉，前者就是我可以刪除更新編輯內容之類的，已繳也可能是我自己繳，有ai小臉就是要叫他處理」
   1. 我自己動手：卡片右上的「⋯」（打開同一種編輯清單），或卡片上低調的小字鈕（✓ 做完、買好了）。
   2. 叫 AI 處理：那隻的小臉（無框本體形狀），點臉＝開浮窗帶這張卡；臉旁最多兩三個字的狀態。
   例外：付款鈕保留（寫金額與對象、5 秒可取消），那是老大本人的同意動作。
   由 _暫存/細修.py 嵌進 v3 主程式（同一個作用域），放在 render 之前。 */

/* 萌萌、金金也能直接開浮窗 */
CH.mon=CH.mon||[];CH.kim=CH.kim||[];
BOTS.mon.cmds=['再比一次','找更便宜的'];BOTS.kim.cmds=['值不值得','等一等可以嗎'];
Object.keys(HELLO).forEach(k=>HELLO[k]='');

/* ---------- AI 小臉 ---------- */
// data-id：bot|ctx|直接動作|參數。沒有直接動作就開浮窗帶這張卡；這張卡有明確的下一步，就直接交辦
function aiF(b,ctx,st,o){o=o||{};const run=st&&/中$/.test(st);
 return `<button class="aif" data-act="ai" data-id="${b}|${esc(ctx||'')}|${o.do||''}|${esc(o.arg||'')}" aria-label="叫${BOTS[b].name}處理${st?'，'+esc(st):''}">${bm(b,run?'thinking':(o.m||''))}${st?`<span class="ast">${esc(st)}</span>`:''}</button>`}
const aifs=a=>{const h=a.filter(Boolean).join('');return h?`<div class="aifs">${h}</div>`:''};
function shF(b){return b&&b!==ownerNow()?aiF(b,''):''}
const mineB=(id,name)=>`<button class="mine" data-act="mine" data-id="${esc(id)}" aria-label="編輯${esc(name||'')}"><span aria-hidden="true">⋯</span></button>`;
const mb=(label,act,id,x)=>`<button class="mb" data-act="${act}"${id!=null?` data-id="${esc(id)}"`:''}${x||''}>${label}</button>`;
const cgo=(t,act,id)=>`<button class="cgo" data-act="${act}" data-id="${esc(id)}">${t}</button>`;

// 這張卡交給這隻時，有沒有明確的下一步（有就直接說，沒有就只開浮窗）
function autoFor(b,ctx){const a=(ctx||'').split(':'),k=a[0],id=a[1];
 if(k==='wish'){const w=W(id);if(!w)return null;
  if(b==='mon'&&!Array.isArray(w.cmp)&&w.cmp!=='run'){w.cmp='run';return '幫我比價'}
  if(b==='kim'&&!w.kim){w.kim='run';return '這個值不值得買'}
  if(b==='tata')return '買得起嗎';
  if(b==='peng'&&!w.ord&&w.st!=='bought')return `請幫我買「${w.name}」`;return null}
 if(k==='sub'&&b==='tata'){const s=DB.subs.find(x=>x.id===id);return s&&!s.rem?`扣款前一天提醒我「${s.name}」`:null}
 if(k==='recv'&&b==='tata')return S.recvRem?null:'11/30 沒入帳就提醒我';
 if(k==='rout'&&b==='peng'){const r=DB.rout.find(x=>x.id===id);return r&&!r.rem&&S.bound?`「${r.name}」到期前一天提醒我`:null}
 if(k==='sup'&&b==='peng')return S.cart||!S.bound?null:'把要買的放進購物車（不結帳）';
 if(k==='beats'&&b==='daqi')return '查沒報到的那支';
 return null}
ACT.ai=(id,el)=>{const [b,ctx,d,arg]=id.split('|');
 if(d==='askdin')return ACT.askdin(ctx,el);
 if(d&&ACT[d])return ACT[d](arg||ctx,el);
 const t=autoFor(b,ctx);if(t)render('keep');
 openChat(b,ctx,el,t?()=>say(b,t,ctx):null)};
// 浮窗裡的快捷：跟著這張卡變
{const _q=quick;quick=function(on){const k=(on.ctx||'').split(':')[0];
 if(on.b==='jiji'&&k==='opp')return['要做，建案子資料夾','讀完整公告給我','值不值得做'];
 if(on.b==='peng'&&k==='ord')return['到哪了','改到貨時間'];
 if(on.b==='daqi'&&k==='proj')return['現在卡在哪','擬一句催客戶的話'];
 return _q(on)}}
// 這幾隻接到卡片的回話與副作用
{const _a=answer;answer=function(b,text,ctx){const a=(ctx||'').split(':'),k=a[0],id=a[1];
 if(k==='wish'){const w=W(id);
  if(w&&b==='mon'){if(!Array.isArray(w.cmp))w.cmp=mkCmp(w.price);render('keep');const c=w.cmp.find(x=>x.rec)||w.cmp[0];return{w:'bot',t:`比好了：${c.shop}含運 ${nt(c.total)} 最划算，${c.eta}到。三家對照放在卡上，你選一家。`}}
  if(w&&b==='kim'){w.kim=w.id==='w2'?{v:'值得，但不急',s:'不急',why:'你每天剪接戴 6 小時，降噪對工作有幫助；可是現在買會壓到 12/10 前的現金。',todo:'等 12/10 發薪後買，或等雙 12 的價格。'}:{v:'可買可不買',s:'再想',why:`${nt(w.price)} 不算小錢，這一樣對工作沒有直接幫助。`,todo:'放 7 天，還想要再買。'};render('keep');return{w:'bot',t:`${w.kim.v}。${w.kim.why}建議：${w.kim.todo}`}}
  if(w&&b==='tata'){const f=fin(w);return{w:'bot',t:`${f.t}。${f.why}`}}}
 if(k==='opp'&&b==='jiji'&&/建|要做/.test(text)){const o=DB.opp.find(x=>x.id===id);if(o&&!o.took){o.took=1;DB.jobs.unshift({id:'j'+id,bot:'jiji',who:'集集',title:'建案子資料夾：'+o.title,st:'進行中',ago:'剛剛'});render('keep')}return{w:'bot',t:'好，案子資料夾我去建，好了回在這裡，進度在首頁「正在跑」。'}}
 if(k==='sub'&&b==='tata'){const s=DB.subs.find(x=>x.id===id);if(s){s.rem=1;render('keep')}return{w:'bot',t:`好，${s?s.name:''}扣款前一天提醒你。`}}
 if(k==='recv'&&b==='tata'){S.recvRem=1;render('keep');return{w:'bot',t:'好，11/30 沒入帳我就提醒你。'}}
 if(k==='rout'&&b==='peng'&&S.bound){const r=DB.rout.find(x=>x.id===id);if(r){r.rem=1;render('keep')}return{w:'bot',t:'好，到期前一天提醒你。'}}
 if(k==='sup'&&b==='peng'&&S.bound){S.cart=1;render('keep');return{w:'bot',t:'放進購物車了，沒有結帳。要買再跟我說，我備訂單給你付。'}}
 if(b==='mon')return{w:'bot',t:'把要比的東西貼給我，或在購物卡上點我。'};
 if(b==='kim')return{w:'bot',t:'在購物卡上點我，我看那一樣值不值得。'};
 return _a(b,text,ctx)}}
{const _n=ctxName;ctxName=function(ctx){const a=(ctx||'').split(':'),k=a[0],id=a[1];
 const N={new:{proj:'開新案子',todo:'記一件待辦',buy:'要買什麼'}[id],recv:'AI 影片比賽代製',beats:'沒報到的程式',
  sub:(DB.subs.find(x=>x.id===id)||{}).name,rout:(DB.rout.find(x=>x.id===id)||{}).name,opp:(DB.opp.find(x=>x.id===id)||{}).title,
  sup:'購物清單',job:(DB.jobs.find(x=>x.id===id)||{}).title,evt:(DB.events[+id]||{}).text}[k];return N?String(N).slice(0,24):_n(ctx)}}

/* ---------- 「⋯」：同一種編輯清單 ---------- */
let SW=0;   // 1＝這次畫的同步標記要附開關（編輯清單、案子詳情的日期列）
syncTag=function(k,where,def){const s=sy(k,def);let t;
 if(!s.on)t=`<span class="st">不同步到行事曆</span>`;
 else if(s.st==='run')t=`<span class="st"><span class="spin" aria-hidden="true"></span>大器同步中</span>`;
 else if(s.st==='ask')t=`<span class="st">▲ ${esc(s.note)}，要同步到行事曆嗎？</span><span class="sbtn">${B('同步','syncyes',k,'pri')}${B('先不要','syncno',k,'ghost')}</span>`;
 else t=`<span class="st ok">✓ 已同步：${esc(where)}</span>`;
 return `<div class="sync" data-sync="${esc(k)}">${t}${SW&&s.st!=='ask'?`<button class="swi" role="switch" aria-checked="${!!s.on}" aria-label="同步到行事曆" data-act="synctog" data-id="${esc(k)}"></button>`:''}</div>`};
ACT.mine=id=>ACT.sheet('mine:'+id);
const mi=(ic,label,act,id,x)=>`<button class="mi" data-act="${act}"${id!=null?` data-id="${esc(id)}"`:''}${x||''}><span class="mic" aria-hidden="true">${ic}</span><span>${label}</span></button>`;
const swRow=(k,where)=>{SW=1;const h=syncTag(k,where);SW=0;return `<div class="mi msw">${h}</div>`};
function mineSheet(id){const i=id.indexOf(':'),k=id.slice(0,i),x=id.slice(i+1);let t='',r='';
 if(k==='proj'){const p=DB.proj.find(q=>q.id===x);t=p.title;const done=p.cur>=p.steps.length;
  r=(done?'':mi('✓',`「${esc(p.steps[p.cur])}」做完了`,'mstep',x))+(p.cur>0?mi('↶','退回上一步','mstepb',x):'')+mi('📅','改日期','mdate',x)+(p.id==='p1'?swRow('proj:p1','公司＋個人'):p.id==='p4'&&SY['proj:p4']&&SY['proj:p4'].st!=='ask'?swRow('proj:p4','個人 C.創作'):'')}
 else if(k==='opp'){const o=DB.opp.find(q=>q.id===x);t=o.title;r=(o.st==='snoozed'?mi('↺','放回清單','unsnooze',x):mi('⏸','暫存到明天','snooze',x))+mi('🗑','刪掉（72 小時內可救回）','del',x)}
 else if(k==='wish'){const ws=DB.wish,j=ws.findIndex(q=>q.id===x),w=ws[j];t=w.name;
  r=mi('↑','往上排','wishup',x,j?'':' disabled')+mi('↓','往下排','wishdn',x,j<ws.length-1?'':' disabled')+mi('✓',w.st==='bought'?'改回想買':'我自己買了','wishmark',x)+mi('🗑','從清單刪掉','wishdel',x)}
 else if(k==='ord'){const o=DB.orders.find(q=>q.id===x);t=o.name;r=(o.st<2?mi('✓','已經到了','ordgot',x):mi('↶','改回運送中','ordback',x))+(o.st<2?swRow('ord:'+x,'個人 L.生活'):'')}
 else if(k==='due'){const d=DB.due.find(q=>q.id===x);t=d.name;const pd=duePaid(d);
  r=(pd?(d.self?mi('↶','改回沒繳','dueundo',x):''):mi('✓','我自己繳了','duepaid',x))}
 return shHead(esc(t))+`<div class="mlist">${r}</div>`}
{const _s=sheetHTML;sheetHTML=function(){if(S.sheet.indexOf('mine:')===0)return mineSheet(S.sheet.slice(5));return _s()}}
const undoT=(msg,fn,un)=>closeThen(()=>{fn();render('keep');toast(msg,un?()=>{un();render('keep')}:null)});
ACT.mstep=id=>{const p=DB.proj.find(q=>q.id===id),o=p.cur;undoT(`「${p.steps[o]}」做完了`,()=>{p.cur=Math.min(p.steps.length,o+1)},()=>{p.cur=o})};
ACT.mstepb=id=>{const p=DB.proj.find(q=>q.id===id),o=p.cur;undoT(`退回「${p.steps[o-1]}」`,()=>{p.cur=o-1},()=>{p.cur=o})};
ACT.mdate=id=>{S.open['pd:'+id+':date']=true;closeThen(()=>ACT.page('proj:'+id))};
ACT.ordgot=id=>{const o=DB.orders.find(q=>q.id===id),s=o.st,e=o.eta;undoT('標成已到',()=>{o.st=2;o.eta='11/22 已到'},()=>{o.st=s;o.eta=e})};
ACT.ordback=id=>{const o=DB.orders.find(q=>q.id===id),s=o.st;undoT('改回運送中',()=>{o.st=1},()=>{o.st=s})};
ACT.duepaid=id=>{const d=DB.due.find(q=>q.id===id);undoT('標成已繳，收進「已繳」',()=>{d.paid='今天 你自己繳了';d.self=1},()=>{delete d.paid;delete d.self})};
ACT.dueundo=id=>{const d=DB.due.find(q=>q.id===id),o=d.paid;undoT('改回沒繳',()=>{delete d.paid;delete d.self},()=>{d.paid=o;d.self=1})};
ACT.poke=(id,el)=>{const f=FACES.get(el.querySelector('.bm'));if(f)f.poke()};
WRITE.push('mstep','mstepb','ordgot','ordback','duepaid','dueundo');

/* ---------- 首頁：房間色卡只留頭像（大臉）、房間名、數字、一兩行摘要 ---------- */
function bigF(b,z){return `<button class="bigf" data-act="poke" data-id="${b}" aria-label="戳${BOTS[b].name}">${bm(b,'z')}</button>`}
homeL2=function(){const d=decs(),f=d[0],l=late().length;let band;
 if(f){const rec=f.kind==='talk'?null:(f.opts.find(o=>o.rec)||f.opts[0]);
  band=`<section class="band cardx" id="secDec" data-card="${esc(f.id)}">${mineB('dec:'+f.id,'這件拍板')}<div class="bandtop"><span class="lbl who">${aiF('daqi','dec:'+f.id)}等你拍板・<span class="tick">${d.length}</span> 件・${esc(f.proj)}</span><span class="lbl">${esc(f.ago)}</span></div><h2>${esc(f.q)}</h2>${rec?`<div class="btns"><button class="btn pri big" data-act="pick" data-id="${esc(f.id)}" data-k="${esc(rec.k)}"><span>${esc(rec.label)}</span><small>${rec.note?'推薦・'+esc(rec.note):'推薦'}</small></button></div>`:decActs(f)}${aifs([dinB('dec:'+f.id)])}</section>`}
 else band=`<section class="card" style="margin-top:14px"><h3>都拍完了</h3></section>`;
 const rooms=['proj','opp','money','life'].map(z=>{const s=zsum(z),b=ZONE[z].b,hot=s.hot&&!s.none;
  return `<div class="room" data-z="${z}" data-hot="${hot?1:0}"><button class="rgo" data-act="room" data-id="${z}"><span class="rh">${ZONE[z].n}</span><span class="rn${s.sm?' sm':''}">${s.none?'0':s.n}</span><span class="rs"><b>${hot?'▲ ':''}${s.u}</b>${s.none?'':'<br>'+esc(s.s)}</span></button>${bigF(b,z)}</div>`}).join('');
 return `<div class="zh" data-z="today" style="background:none;padding:14px 2px 0;color:var(--ink)"><p class="lbl">11 月 22 日　週日</p><h1 style="margin-top:4px">午安，老大。</h1></div>${band}${todayStrip()}
 <div class="wall stg">${rooms}</div>
 <div class="btns" style="margin-top:12px"><button class="btn${l?' warn':' ghost'} wide" data-act="sheet" data-id="beats" style="justify-content:space-between"><span>${l?`▲ <b>${l} 支</b>程式沒報到`:'● 程式都正常報到'}</span><span aria-hidden="true">›</span></button></div>
 <div class="cols"><section class="sec">${sh('','正在跑',jobs().length+' 件')}${jobList()}</section><section class="sec">${sh('','最近做完','',moreB('看全部','page','events'))}${evtList(2)}</section></div>`};

/* 房間最上面那張房間色大卡：大大的反黑臉，超出邊緣被裁掉；點臉＝戳它 */
zoneHead=function(z,sum){const b=ZONE[z].b,bot=BOTS[b];
 const st=b==='peng'&&!S.bound?'還沒綁定':FRESH[b];
 return `<div class="zh zhx" data-z="${z}"><div class="zht"><h1>${ZONE[z].n}</h1><p class="zown">${bot.name}的房間・${st}</p><p class="sum">${sum}</p></div>${bigF(b,z)}</div>`};

/* ---------- 拍板、正在跑、最近做完 ---------- */
decActs=function(d){
 if(d.kind==='talk')return `<div data-dec="${esc(d.id)}"><div class="btns">${B('打開申請網站 ↗','ext',d.id,'pri')}${mb('✓ 我已經弄好了','pick',d.id,' data-k="_done"')}</div></div>`;
 const rec=d.opts.find(o=>o.rec)||d.opts[0],rest=d.opts.filter(o=>o!==rec);
 let h=`<div class="btns"><button class="btn pri big" data-act="pick" data-id="${esc(d.id)}" data-k="${esc(rec.k)}"><span>${esc(rec.label)}</span><small>${rec.note?'推薦・'+esc(rec.note):'推薦'}</small></button></div>`;
 if(S.more[d.id])h+=`<div class="btns">${rest.map(o=>`<button class="btn" data-act="pick" data-id="${esc(d.id)}" data-k="${esc(o.k)}">${esc(o.label)}</button>`).join('')}</div><label class="f">寫別的做法<textarea rows="2"></textarea></label>${S.err===d.id?'<p class="err" role="alert">▲ 先寫一句。</p>':''}<div class="btns">${B('照我寫的做','pickalt',d.id)}</div>`;
 else h+=`<div class="mrow">${mb('其他做法','more',d.id,' aria-expanded="false"')}</div>`;
 return `<div data-dec="${esc(d.id)}">${h}</div>`};
decCard=function(d){return `<article class="card cardx" data-card="${esc(d.id)}">${mineB('dec:'+d.id,'這件拍板')}<div class="meta">${aiF('daqi','dec:'+d.id)}${chip(d.proj)}<span class="lbl">${esc(d.ago)}</span></div><h3>${esc(d.q)}</h3>${d.detail?`<p>${esc(d.detail)}</p>`:''}${decActs(d)}${aifs([dinB('dec:'+d.id)])}</article>`};
// 拍板卡的「⋯」直接打開那件的抽屜（其他做法、來龍去脈）
{const _m=ACT.mine;ACT.mine=id=>id.indexOf('dec:')===0?ACT.sheet(id):_m(id)}
jobList=function(){const j=jobs();if(!j.length)return `<div class="card"><p>現在沒有在跑的工作。</p></div>`;
 return `<div class="rows">`+j.map(x=>`<div class="rowi"><div class="rowb">${aiF(x.bot,'job:'+x.id)}<span class="tx"><b>${esc(x.title)}</b><small>${esc(x.who)}・${esc(x.ago)}</small></span><span class="rt">${chip(x.st,x.wait)}</span></div></div>`).join('')+`</div>`};
// v37：最近做完只留一句話（老大 2026-11-22：「最近做完那些文字也太亂」），全文在「看全部」頁點開
const evtShort=t=>{let a=String(t||'').split('｜').map(x=>x.trim()).filter(Boolean);if(a.length>1&&/^[^：]{0,30}（[^）]*）$/.test(a[0]))a=a.slice(1);
 let s=(a[0]||'').replace(/^(狀態|結果)：/,'');const m=s.search(/[；。]/);if(m>8)s=s.slice(0,m);return s.length>48?s.slice(0,46)+'…':s};
evtList=function(n){const e=evts().slice(0,n);if(!e.length)return `<div class="card"><p>還沒有做完的紀錄。</p></div>`;const full=n>=99;
 return `<div class="rows">`+e.map((x,i)=>`<div class="rowi"><div class="rowb">${aiF(x.bot,'evt:'+DB.events.indexOf(x))}<span class="tx">${full?`<details class="evd"><summary><b class="evs">${esc(evtShort(x.text))}</b></summary><p class="evf">${esc(x.text)}</p></details>`:`<b class="evs">${esc(evtShort(x.text))}</b>`}<small>${esc(x.who)}・${esc(x.at)}</small></span></div></div>`).join('')+`</div>`};
dinB=function(ctx){return aiF('din',ctx,'',{do:'askdin'})};

/* ---------- 案子 ---------- */
const WHO={p1:'daqi',p4:'daqi',p2:'tata',p3:'tata'};
projCard=function(p){return `<article class="card cardx">${mineB('proj:'+p.id,p.title)}<div class="meta">${chip(p.due,p.urg)}</div><h3>${cgo(esc(p.title),'page','proj:'+p.id)}</h3><p>${esc(p.next)}</p>${pxOf(p).block!=='沒有卡住'?`<p class="note" style="margin-top:4px">▲ 卡在：${esc(pxOf(p).block)}</p>`:''}<div class="steps" role="img" aria-label="${p.steps.length} 步做到第 ${Math.min(p.cur+1,p.steps.length)} 步">${p.steps.map((s,i)=>`<i class="${i<p.cur?'d':i===p.cur?'c':''}"></i>`).join('')}</div><p class="note">${p.cur<p.steps.length?'現在：'+esc(p.steps[p.cur]):'全部做完'}・${esc(p.money)}</p>${projSync(p)}${aifs([aiF(WHO[p.id]||'daqi','proj:'+p.id),p.g==='need'||p.g==='doing'?dinB('proj:'+p.id):''])}</article>`};

/* ---------- 機會 ---------- */
oppCard=function(o){const sn=o.st==='snoozed';
 return `<article class="card cardx" data-card="${esc(o.id)}">${mineB('opp:'+o.id,o.title)}<div class="meta">${chip(sn?'明天 8:00 回到清單':o.due,!sn&&o.days<=4)}<span class="lbl">${BASK[o.b]}・${esc(o.org)}</span></div><h3>${cgo(esc(o.title),'sheet','opp:'+o.id)}</h3><p class="amt" style="color:var(--ink)">${esc(o.amt)}</p>${aifs([aiF('jiji','opp:'+o.id,o.took?'建好了':'')])}</article>`};
scanRow=function(){const on=!!S.scan,turn=on&&Date.now()-(S.scanAt||0)<900;
 return `<div class="scanrow"><span class="lbl">${on?'集集掃描中，約 5～15 分鐘':'上次 8:00 掃描，新增 2 張'}</span><button class="scan${turn?' turn':''}" data-act="scan"${on?' aria-disabled="true"':''} aria-label="${on?'掃描中':'立即掃描'}"><span class="ri" aria-hidden="true">↻</span></button></div>`};

/* ---------- 生活 ---------- */
routRow=function(r,short){const ov=r.ago>=r.cyc,pct=Math.min(100,Math.round(r.ago/r.cyc*100));
 return `<div class="rowi" data-card="${esc(r.id)}"><div class="rowb" style="align-items:flex-start"><button class="tx" data-act="sheet" data-id="rout:${r.id}" style="min-height:44px"><b>${esc(r.name)}　<span class="num">${r.ago}</span> 天前</b><small>${ov?`▲ 超過 ${r.ago-r.cyc} 天・`:''}每 ${r.cyc} 天一次${r.rem?'・朋朋會提醒':''}</small><span class="bar${ov?' over':''}"><i style="width:${pct}%"></i></span></button><span class="rt">${mb('✓ 做完','done',r.id)}</span></div></div>`};
function wishSt(w){const pk=w.pick!=null&&Array.isArray(w.cmp),f=fin(w),bought=w.st==='bought',p=w.ord&&PAY['p'+w.ord];
 return [aiF('peng','wish:'+w.id,bought?'買了':p?(p.bad?'金額不對':p.st==='paid'?'付好了':'等你付'):''),
  aiF('mon','wish:'+w.id,w.cmp==='run'?'比價中':Array.isArray(w.cmp)&&!pk?'比好了':''),
  bought?'':aiF('tata','wish:'+w.id,f.k==='ok'?'買得起':f.k==='over'?'超支':'等發薪'),
  isBig(w)&&!bought?aiF('kim','wish:'+w.id,w.kim==='run'?'看中':w.kim?w.kim.s:''):'']}
wishCard=function(w,i,n){
 if(w.load)return `<div class="card" data-card="${esc(w.id)}" aria-busy="true"><div class="wtop"><div class="wimg sk" aria-hidden="true"></div><div class="wtx"><h3>${esc(w.raw)}</h3><p class="wnow">${bm('peng','thinking','sm')}<span><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>找資料中</span></p></div></div></div>`;
 const bought=w.st==='bought',pk=w.pick!=null&&Array.isArray(w.cmp)?w.cmp[w.pick]:null;
 return `<div class="card cardx" data-card="${esc(w.id)}">${mineB('wish:'+w.id,w.name)}<div class="wtop"><div class="wimg" aria-hidden="true" style="background:${w.col}">${esc(w.ch)}<small>示意圖</small></div><div class="wtx"><h3>${esc(w.name)}</h3><p class="amt" style="color:var(--ink)">${nt(pk?pk.total:w.price)}<span class="lbl">　${esc(pk?pk.shop+'・含運':w.shop)}</span></p>${bought?chip('已買'):''}</div></div>
 ${Array.isArray(w.cmp)&&w.pick==null&&!bought?cmpHTML(w):''}${w.kim&&w.kim!=='run'&&!bought?`<p class="wk">${esc(w.kim.v)}</p>`:''}${aifs(wishSt(w))}</div>`};

/* ---------- 付款鈕：拿掉說明句；金額不對時，臉＝叫那隻重查 ---------- */
{const _p=payHTML;payHTML=function(id){const p=PAY[id];
 if(p.st==='idle'&&p.bad)return `<div class="payc" data-pay="${id}"><button class="btn pri wide" disabled aria-describedby="pe${id}">${esc(`付 ${p.amt} 給 ${p.to}`)}</button><p class="err" id="pe${id}">▲ ${esc(p.bad)}</p>${aifs([aiF(p.by,'',`重查`,{do:'payfix',arg:id})])}</div>`;
 return _p(id)}}

/* ---------- 定定的看法：「照這個做」交給大器＝大器的臉 ---------- */
dinHTML=function(m){const v=m.v;return `<b>定定的看法</b><dl class="kvs"><dt>建議</dt><dd><b>${esc(v.adv)}</b></dd><dt>理由</dt><dd>${esc(v.why)}</dd><dt>風險</dt><dd>${esc(v.risk)}</dd></dl>${m.used?'<p class="pst ok" role="status">✓ 大器接手了</p>':aifs([aiF('daqi','',`照做`,{do:'dinapply',arg:m.mid})])}`};

/* ---------- 浮窗：拿掉說明（角色小字、能做什麼、原型小字） ---------- */
chatShell=function(on){const b=on.b,bot=BOTS[b],cn=ctxName(on.ctx);
 return `<div class="cav" id="cAv">${bm(b,'idle')}</div>
 <header class="chd"><div class="cwho"><h2 id="cTitle">${bot.name}</h2></div><button class="btn ghost" data-act="chatclose" id="cClose" aria-label="關閉">✕</button></header>
 ${cn?`<div class="cctx">${chip('關於：'+cn)}</div>`:''}
 <div class="clog" id="clog" role="log" aria-live="polite" aria-label="和${bot.name}的對話" tabindex="0"></div>
 <div class="cq" id="cq"></div><p class="err" id="cErr" role="alert" hidden>▲ 還沒寫字。</p>
 <div class="cin"><textarea id="cText" rows="1" aria-label="想跟${bot.name}說什麼" placeholder="${PH[b]||'說一句'}" enterkeyhint="send"></textarea><button class="btn pri" data-act="chatsend">傳送</button></div>`};
{['wishmark','wishdel'].forEach(k=>{const f=ACT[k];ACT[k]=id=>closeThen(()=>f(id))})}
{const _d=dtBody;dtBody=function(pid){SW=1;const h=_d(pid);SW=0;return h.replace(/<p class="note">你在這裡親手改的那一筆[^<]*<\/p>/,'')}}

/* ---------- 1122-H（2026-11-22）：頭像叫聲（bot_voice.js）＋聲音開關 ----------
   由 _暫存/音效.py 嵌進 v3 主程式（同一個作用域）。表情同步在 bot_voice.js 的 attach 裡做（poke、speaking、logged、over、alert、sleepy）；
   這裡補：你叫它（點臉）、它回話了（浮窗沒開時）、做完了／出問題了（臉旁狀態字變化）、開心哼（拍板）、想睡（很久沒動）、開關。 */
{const BV=window.BotVoice;
 if(BV){
  // 開關：右上角頭像左邊，一個喇叭圖示
  const SNDI={on:'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3l4.5-4v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
   off:'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3l4.5-4v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>'};
  const sndSync=()=>{const b=$('#snd');if(!b)return;const on=BV.isEnabled();b.innerHTML=on?SNDI.on:SNDI.off;b.setAttribute('aria-pressed',on);b.setAttribute('aria-label',on?'聲音：開':'聲音：關')};
  {const hv=$('#hav');if(hv&&!$('#snd')){const b=document.createElement('button');b.className='snd';b.id='snd';b.type='button';hv.parentNode.insertBefore(b,hv);
   b.addEventListener('click',()=>{const on=BV.setEnabled(!BV.isEnabled());sndSync();if(on){BV.unlock();BV.play(OWN[document.documentElement.dataset.tab]||'daqi','call',{force:1})}})}}
  sndSync();
  // 你叫它：點小臉、右上頭像、右下浮動頭像（大臉是戳，在 poke 裡）
  const botOf=el=>{const m=el&&el.querySelector('.bm[data-b]');return m?m.dataset.b:null};
  document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('.aif,.hav,#chead');if(!t)return;const b=botOf(t);if(b)BV.play(b,'call')},true);
  // 它回話了：浮窗沒開時頭像只會跳一下，這裡補聲音（浮窗開著時 speaking 表情會自己響）
  {const _a=arrive;arrive=function(b){if(!(S.chat&&S.chat.b===b))BV.play(b,'reply');return _a.apply(this,arguments)}}
  // 開心哼：你拍板了
  {const _p=ACT.pick;if(_p)ACT.pick=function(){const r=_p.apply(this,arguments);BV.play('daqi','hum');return r}}
  // 做完了／出問題了：臉旁狀態字從「…中」變成結果就響；新出現「超支」「金額不對」就響
  const ERR=/^(超支|金額不對)$/,HAP=/^(比好了|買得起|建好了|放好了|會提醒)$/;let STP=null,stq=0;
  const stScan=()=>{stq=0;const m={};document.querySelectorAll('.aif[data-id]').forEach(e=>{const k=e.dataset.id.split('|').slice(0,2).join('|'),a=e.querySelector('.ast');m[k]=a?a.textContent.trim():''});
   if(STP){for(const k in m){const n=m[k],o=STP[k],b=k.split('|')[0];if(o==null||n===o)continue;
    if(ERR.test(n))BV.play(b,'error');else if(/中$/.test(o)&&n)BV.play(b,HAP.test(n)&&Math.random()<0.4?'hum':'done')}}
   STP=m};
  new MutationObserver(()=>{if(!stq){stq=1;requestAnimationFrame(stScan)}}).observe(document.body,{childList:true,subtree:true,characterData:true});
  stScan();
  // 想睡：90 秒沒動，這一頁的主人打個呵欠（一次；有動作就重算）
  let idleT=0;const idle=()=>{clearTimeout(idleT);idleT=0;if(!BV.isEnabled()||!BV.isUnlocked())return;idleT=setTimeout(()=>{idleT=0;if(document.visibilityState==='visible')BV.play(OWN[document.documentElement.dataset.tab]||'daqi','sleepy')},90000)};
  ['pointerdown','keydown'].forEach(t=>addEventListener(t,idle,{capture:true,passive:true}));
  window.__voice=()=>({on:BV.isEnabled(),unlocked:BV.isUnlocked(),stats:Object.assign({},BV._stats),ctx:BV._ctx()?BV._ctx().state:null,idle:!!idleT});
 }}
/* 定定：只放臉，無框無字（aria 照舊說「問定定的看法」） */
dinB=function(ctx){return aiF('din',ctx,'',{do:'askdin'}).replace(/aria-label="[^"]*"/,'aria-label="問定定的看法"')};
render('keep');

/* ---------- 1122-I（2026-11-22）：目標（首頁一條＋目標整頁＋各房間露一小條） ----------
   老大 2026-11-22：「目標 照版本一可以 但是 主要的對話對象會是 定定 只有金錢那邊是金金？」
   來源：目標設計/逐流_目標_原型v1.html（版本一）。由 _暫存/目標.py 嵌進 v3 主程式（同一個作用域），放在 render 之前。
   對話：目標整頁右上角與總覽那句話＝定定；錢的目標卡上的臉＝金金；其他目標卡上的臉照所屬房間（劇本＝大器、補助＝集集、運動＝朋朋）。
   自己動手＝卡右上「⋯」；叫 AI＝點小臉。錢房間版面不動（錢頁另案），錢的目標只在目標頁露出。資料全是示意。 */
const GSEED=()=>[
 {id:'script',name:'完成一部長片劇本',room:'proj',bot:'daqi',why:'導演要走精緻路線，手上得有一本自己的長片。',due:'3/31',dueWhat:'初稿',left:129,
  kind:'bar',now:38,total:90,unit:'場',expect:46,label:'初稿',st:'late',stText:'慢 8 場',short:'劇本 38／90 場',
  base:'照進度今天該到 46 場，慢了 8 場，大約兩週。',next:'這週寫第 39 到 44 場。',src:'案子房間的長片劇本，寫完一場自動加一',auto:1,
  steps:[['故事大綱','d','9/30 完成'],['分場','d','10/28 完成'],['初稿','n','38／90 場'],['修訂稿','',''],['定稿','','']]},
 {id:'grant',name:'拿到一筆創作補助',room:'opp',bot:'jiji',why:'補助是拍自己作品的第一筆錢，也是履歷上的一行。',due:'6/30',dueWhat:'',left:220,
  kind:'pips',now:0,total:1,unit:'筆',label:'拿到',st:'ok',stText:'照進度',short:'補助 0／1，送審中 1',extra:'送審中 1',
  base:'送審中 1 件，準備中 1 件。',next:'國藝會企劃書 12/15 截止，還缺預算表。',src:'機會房間標成補助的機會，送件與結果自動帶入',auto:1,
  steps:[['短片輔導金','n','送審中，1 月公布'],['國藝會常態補助','n','準備中，12/15 截止'],['拿到一筆','','']]},
 {id:'crew',name:'進一個劇組待一檔',room:'proj',bot:'daqi',why:'劇組經驗和人脈，光靠接案長不出來。',due:'9/30',dueWhat:'',left:312,
  kind:'pips',now:0,total:3,unit:'步',label:'走到',st:'stall',stText:'34 天沒動',short:'劇組 0／3 步',
  base:'10/19 立了之後還沒動過。',next:'還沒定下一步。',src:'自己打勾',auto:0,
  steps:[['列出三個想跟的人','',''],['約一個出來聊','',''],['談到一個位置','','']]},
 {id:'fund',name:'緊急預備金存到 6 個月',room:'money',bot:'kim',money:1,why:'接案有空窗，撐得住才敢挑案子。',due:'2027/12/31',dueWhat:'',left:404,
  kind:'bar',now:2.1,total:6,unit:'個月',label:'存到',st:'ok',stText:'照進度',short:'預備金 2.1／6 個月',
  base:'現在 12.6 萬，目標 36 萬。每月存 2 萬，照這速度 2027/11 到。',next:'12/10 發薪日撥 2 萬進去。',src:'錢房間的預備金帳戶餘額，塔塔每晚對帳後更新',auto:1,steps:null},
 {id:'gear',name:'器材基金：換一台機身',room:'money',bot:'kim',money:1,why:'現在的機身拍案子撐得住，拍自己的長片不夠。',due:'2027/6/30',dueWhat:'',left:220,
  kind:'bar',now:4.2,total:12,unit:'萬',label:'存到',st:'ok',stText:'照進度',short:'器材基金 4.2／12 萬',
  base:'每月放 1 萬，照這速度 2027/7 到，比期限晚一個月。',next:'下個案子尾款進來，先撥 2 萬。',src:'錢房間的器材基金帳戶，塔塔每晚對帳後更新',auto:1,steps:null},
 {id:'tax',name:'5 月報稅預留',room:'money',bot:'kim',money:1,why:'5 月要繳綜所稅，先一個月一個月留，到時候不用挖預備金。',due:'2027/5/31',dueWhat:'報稅',left:190,
  kind:'bar',now:1.4,total:4.2,unit:'萬',label:'存到',st:'ok',stText:'照進度',short:'報稅預留 1.4／4.2 萬',
  base:'已存 NT$ 14,000，目標 NT$ 42,000。每月留 NT$ 7,000，照這速度 2027/3 存滿，比 5/31 早。',next:'12/10 發薪日留 7 千進去。',src:'錢房間的報稅預留帳戶，塔塔每晚對帳後更新',auto:1,steps:null},
 {id:'move',name:'每週運動三次',room:'life',bot:'peng',why:'剪片久坐，腰撐得住才拍得久。',due:'',dueWhat:'',left:null,
  kind:'pips',now:2,total:3,unit:'次',label:'本週',st:'ok',stText:'連 4 週達標',short:'運動 本週 2／3',
  base:'已經連續 4 週達標。今天再一次，這週就滿。',next:'今天動一次。',src:'自己打勾，朋朋週四提醒',auto:0,week:[0,1,0,0,1,0,0],steps:null}
];
const GL={list:GSEED(),dropped:[],focus:null};
const gAll=()=>E()?[]:GL.list,gOf=id=>GL.list.find(g=>g.id===id);
const gpct=(a,b)=>Math.max(0,Math.min(100,a/b*100));
const gnum=g=>`${g.label} <span class="num">${g.now}／${g.total}</span> ${g.unit}${g.extra?'，'+esc(g.extra):''}`;
function gchip(g){return g.st==='late'?chip(g.stText,1):g.st==='stall'?`<span class="chip gstall"><span aria-hidden="true">‖ </span>${esc(g.stText)}</span>`:chip(g.stText)}
function gmeter(g){if(g.kind==='bar')return `<div class="gbar" aria-hidden="true"><u style="width:${gpct(g.now,g.total)}%"></u>${g.expect?`<s style="left:${gpct(g.expect,g.total)}%"></s>`:''}</div>`;
 return `<div class="gpips" aria-hidden="true">${Array.from({length:g.total},(_,i)=>`<i class="${i<g.now?'d':''}"></i>`).join('')}</div>`}
const gdue=g=>g.due?`${g.due} 前`:'每週';
// 1122-L：目標頁的對話對象＝定定，錢的目標＝金金；交辦對象＝目標所屬房間的主人
const gTalk=g=>g&&g.room==='money'?'kim':'din';
const GOWN={proj:'daqi',opp:'jiji',life:'peng',money:'tata'},gOwner=g=>g&&GOWN[g.room]||'daqi';
const gHand=g=>g&&g.hand?`<small class="ghand gline2">已交給${BOTS[g.hand].name}</small>`:'';
function gcard(g){return `<article class="card cardx gcard" data-card="g:${g.id}">${mineB('goal:'+g.id,g.name)}<div class="meta">${GL.focus===g.id?chip('這週主推'):''}${gchip(g)}</div><h3>${cgo(esc(g.name),'page','goal:'+g.id)}</h3>${gmeter(g)}<p class="gnum"><span>${gnum(g)}</span><span>${gdue(g)}</span></p><p class="note">下一步：${esc(g.next)}${gHand(g)}</p>${aifs([aiF(gTalk(g),'goal:'+g.id)])}</article>`}
function gsum(){const a=gAll(),l=a.filter(g=>g.st==='late').length,s=a.filter(g=>g.st==='stall').length;
 return {n:a.length,l,s,t:`${a.length} 個${l?`，${l} 個落後`:''}${s?`，${s} 個沒動`:''}`}}

/* ---------- 首頁一條：在拍板帶與今天行程之後 ---------- */
function goalStrip(){if(S.st==='loading'||S.st==='error')return '';const a=gAll(),m=gsum();
 const top1=GL.focus?gOf(GL.focus):(a.find(g=>g.st==='late')||a.find(g=>g.st==='stall'));
 const line=!a.length?'還沒立目標':top1?(GL.focus?'這週主推：':top1.st==='late'?'▲ ':'‖ ')+esc(top1.name)+(GL.focus?'':'，'+esc(top1.stText)):'都照進度';
 return `<section class="sec gstrip-sec">${sh('','目標',a.length?m.t:'')}<div class="card cardx gstrip"><button class="cgo gsgo" data-act="page" data-id="goals"><span class="vh">打開目標，</span>${a.length?`<span class="gminis" aria-hidden="true" style="--gn:${a.length}">${a.map(g=>`<i><u style="width:${gpct(g.now,g.total)}%"></u></i>`).join('')}</span>`:''}<span class="gline">${line}</span><span class="chev" aria-hidden="true">›</span></button>${aifs([aiF('din','goals')])}</div></section>`}
{const _h=homeL2;homeL2=function(){const h=_h(),i=h.indexOf('<div class="wall stg">');return i<0?h:h.slice(0,i)+goalStrip()+h.slice(i)}}

/* ---------- 目標整頁 ---------- */
function goalsPage(){let h=`<h1 class="pt">目標</h1>`;
 if(S.st==='loading')return h+skeleton();
 if(S.st==='error')return h+`<div class="card empty" role="alert" style="margin-top:16px"><div class="big">▲ 目標讀不到</div><p>連不上資料庫。上次成功是 14:05。</p><div class="btns">${B('再讀一次','retry',null,'pri')}</div></div>`;
 const a=gAll(),m=gsum();
 if(!a.length)return h+`<div class="card cardx empty" style="margin-top:16px">${mineB('goals:all','目標')}<div class="big">還沒立目標</div><p>立了之後，進度會自己從案子、機會、錢帶進來。</p>${aifs([aiF('din','goals')])}</div>`;
 const pick=a.some(g=>g.id==='grant')&&a.some(g=>g.id==='script');
 h+=`<div class="card cardx gpick" data-card="gpick">${mineB('goals:all','目標')}<div class="meta"><span class="gsumn num">${m.n}</span><span>個目標</span>${m.l?chip(m.l+' 個落後',1):''}${m.s?`<span class="chip gstall"><span aria-hidden="true">‖ </span>${m.s} 個沒動</span>`:''}${!m.l&&!m.s?chip('都照進度'):''}</div>
 <div class="gsay">${aiF('din','goals')}<p>${pick?'補助 12/15 截止，企劃書還缺預算表；劇本慢了 8 場。這週力氣放哪一個？':'這週照順序推，有落後的我會先講。'}</p></div>
 ${pick?`<div class="btns">${['grant','script'].map(id=>`<button class="btn" data-act="gfocus" data-id="${id}" aria-pressed="${GL.focus===id}">${id==='grant'?'這週推補助':'這週補劇本'}</button>`).join('')}</div>`:''}</div>
 <section class="sec">${sh('','照你的順序')}<div class="stack glist">${a.map(gcard).join('')}</div></section>`;
 if(GL.dropped.length)h+=`<section class="sec">${sh('','放掉的',GL.dropped.length+' 個')}<div class="rows">${GL.dropped.map(g=>`<div class="rowi"><div class="rowb"><span class="tx"><b>${esc(g.name)}</b></span><span class="rt">${mb('↺ 撿回來','grevive',g.id)}</span></div></div>`).join('')}</div></section>`;
 return h}

/* ---------- 單一目標 ---------- */
function goalPage(id){const g=gOf(id);
 if(!g)return `<h1 class="pt">這個目標不在了</h1><div class="card empty" style="margin-top:16px"><p>可能已經放掉。</p><div class="btns">${B('回目標','page','goals','pri')}</div></div>`;
 let prog=`<div class="gbig"><b class="num">${g.now}</b><span>／${g.total} ${g.unit}${g.label==='本週'?'（本週）':''}</span></div>${gmeter(g)}<p class="note">${esc(g.base)}</p>`;
 if(g.steps)prog+=`<ol class="gsteps">${g.steps.map(s=>`<li class="${s[1]}"><i aria-hidden="true">${s[1]==='d'?'✓':''}</i><span>${esc(s[0])}<span class="vh">${s[1]==='d'?'，完成':s[1]==='n'?'，進行中':'，還沒開始'}</span></span><small>${esc(s[2])}</small></li>`).join('')}</ol>`;
 if(g.week){const dn='一二三四五六日';prog+=`<div class="gweek">${g.week.map((v,i)=>`<div>${dn[i]}<i class="${v?'d':i===6?'t':''}">${v?'✓':i===6?'今':''}</i></div>`).join('')}</div>${g.week[6]?'':`<div class="mrow">${mb('✓ 今天動過了','gcheck',g.id)}</div>`}`}
 if(!g.auto&&g.steps&&g.now<g.total)prog+=`<div class="mrow">${mb(`✓「${esc(g.steps[g.now][0])}」做完了`,'gstep',g.id)}</div>`;
 const r=ZONE[g.room],mine=!(g.room==='money');
 return `<div class="meta" style="margin-top:10px">${GL.focus===g.id?chip('這週主推'):''}${gchip(g)}</div><h1 class="pt">${esc(g.name)}</h1><p class="gwhy">${esc(g.why)}</p>
 <section class="sec">${sh('','進度')}<div class="card cardx gprog">${mineB('goal:'+g.id,g.name)}${prog}${aifs([aiF(gTalk(g),'goal:'+g.id)])}</div></section>
 ${g.st==='stall'?`<section class="sec">${sh('','一直沒動')}<div class="card gsay">${aiF('din','goal:'+g.id)}<p>34 天沒動，通常是第一步太大。</p></div></section>`:''}
 ${g.st==='late'?`<section class="sec">${sh('','慢了')}<div class="card gsay">${aiF('din','goal:'+g.id)}<p>照現在一週 6 場，3/31 寫不完。</p></div></section>`:''}
 <section class="sec">${sh('','下一步')}<div class="card"><p style="color:var(--ink);margin:0">${esc(g.next)}${gHand(g)}</p></div></section>
 <section class="sec">${sh('','設定')}<dl class="kv"><div><dt>期限</dt><dd>${g.due?`${esc(g.due)}${g.dueWhat?'（'+esc(g.dueWhat)+'）':''}，還有 <span class="num">${g.left}</span> 天`:'沒有期限，每週算一次'}</dd></div><div><dt>誰盯</dt><dd>${BOTS[gTalk(g)].name}</dd></div><div><dt>誰動手</dt><dd>${BOTS[gOwner(g)].name}</dd></div><div><dt>進度從哪來</dt><dd>${esc(g.src)}</dd></div></dl>
 ${g.auto?`<div class="rows" style="margin-top:6px"><div class="rowi"><button class="rowb" data-act="${mine?'page':'tab'}" data-id="${mine?'zone:'+g.room:g.room}"><span class="tx"><b>到${r.n}房間看</b></span><span class="rt"><span class="chev" aria-hidden="true">›</span></span></button></div></div>`:''}</section>`}

{const _p=pageHTML;pageHTML=function(){const a=(S.page||'').split(':');
 if(a[0]!=='goals'&&a[0]!=='goal')return _p();
 return `<div class="page-in"><div class="phead">${B('‹ 返回','back',null,'ghost',' id="pBack"')}</div>${a[0]==='goals'?goalsPage():goalPage(a[1])}</div>`.replace(/(id="pBack">[^<]*<\/button>)<\/div>/,`$1${havHTML(pageOwner().b,pageOwner().ctx)}</div>`)}}
// 右上角的臉：目標整頁＝定定；單一目標＝那個目標卡上的臉（錢的目標＝金金）
{const _o=pageOwner;pageOwner=function(){const a=(S.page||'').split(':');
 if(a[0]==='goals')return{b:'din',ctx:'goals'};if(a[0]==='goal'){const g=gOf(a[1]);return{b:gTalk(g),ctx:'goal:'+a[1]}}return _o()}}

/* ---------- 各房間露一小條（錢房間不動，錢頁另案） ---------- */
function roomGoals(z){if(z==='money'||S.st!=='ok')return '';const a=gAll().filter(g=>g.room===z);if(!a.length)return '';
 return `<section class="sec groom">${sh('','這間的目標',a.length+' 個')}<div class="rows">${a.map(g=>`<div class="rowi" data-card="gr:${g.id}"><button class="rowb" data-act="page" data-id="goal:${g.id}"><span class="tx"><b>${esc(g.name)}</b><small>${g.label} ${g.now}／${g.total} ${g.unit}・${gdue(g)}</small><span class="gbar sm" aria-hidden="true"><u style="width:${gpct(g.now,g.total)}%"></u></span></span><span class="rt">${g.st==='ok'?'':gchip(g)}<span class="chev" aria-hidden="true">›</span></span></button></div>`).join('')}</div></section>`}
{const _z=zoneHead;zoneHead=function(z,sum){return _z(z,sum)+roomGoals(z)}}

/* ---------- 對話：定定是目標的主要對象，錢的目標是金金 ---------- */
PH.kim='問金金一句';ROLE.kim='錢的目標・值不值得花';
const GQ={din:{goals:['這週力氣放哪','劇本還追得回來嗎','劇組那個怎麼開始'],goal:['這個目標怎麼推','先放掉可以嗎']},
 kim:{goal:['照這速度什麼時候到','每月多存 5 千會怎樣','先動用一點可以嗎']}};
{const _q=quick;quick=function(on){const a=(on.ctx||'').split(':');if(a[0]==='goals'||a[0]==='goal'){const t=GQ[on.b]&&GQ[on.b][a[0]];if(t)return t;
  const g=gOf(a[1]);if(g)return({daqi:['這週要寫哪幾場','每晚 10 點提醒我'],jiji:['預算表先拉一版','還有哪些補助能投'],peng:['今晚 8 點叫我去動','這週還差幾次']})[on.b]||_q(on)}return _q(on)}}
{const _n=ctxName;ctxName=function(ctx){const a=(ctx||'').split(':');if(a[0]==='goals')return '目標';if(a[0]==='goal'){const g=gOf(a[1]);return g?g.name.slice(0,24):''}return _n(ctx)}}
// 打開時先說一句：定定看總覽、金金看錢的目標
{const _a=autoFor;autoFor=function(b,ctx){const a=(ctx||'').split(':');
 if(b==='din'&&a[0]==='goals')return '這週力氣放哪一個？';
 if(b==='din'&&a[0]==='goal'){const g=gOf(a[1]);return g&&g.st==='stall'?'這個一直沒動，第一步怎麼走？':g&&g.st==='late'?'慢了，怎麼追？':'這個目標怎麼推？'}
 if(b==='kim'&&a[0]==='goal')return '照現在的速度，什麼時候到？';
 return _a(b,ctx)}}
// 定定的看法卡（建議、理由、風險；照做＝交給大器）
const GV={goals:{adv:'這週推補助：先把國藝會預算表拉出來',why:'補助 12/15 截止，錯過要等半年；劇本慢 8 場，晚一週還追得回來。',risk:'劇本會再慢約 6 場。下週起每週寫 8 場，3/28 前可以寫完。'},
 'goal:script':{adv:'期限不動，每週多寫 2 場',why:'初稿挪期限會連帶壓到補助送件的作品附件。',risk:'每週 8 場比現在多三成，週末要留一天給它。'},
 'goal:crew':{adv:'這週只做一件：寫下三個想跟的導演或副導',why:'34 天沒動，通常是第一步太大；名單寫出來，下一步自然會出現。',risk:'名單太遠會再卡住，三個人裡至少一個是聊得到的。'},
 'goal:grant':{adv:'今晚請集集拉預算表初稿',why:'企劃書只缺預算表，其他都齊了。',risk:'預算表要你過目，12/12 前看完才不會壓到截止。'}};
{const _v=dinView;dinView=function(ctx){return GV[ctx]||_v(ctx)}}
const GA={
 kim:{'照這速度什麼時候到':g=>g.id==='tax'?'照每月 7 千，2027/3 存滿，比 5/31 早兩個月。':g.id==='gear'?'照每月 1 萬，2027/7 到，比期限晚一個月。尾款進來先撥 2 萬就趕得上。':'照每月 2 萬，2027/11 到，比期限早一個月。',
  '每月多存 5 千會怎樣':g=>{const o=g.base;if(g.id==='tax'){g.base='每月留 1.2 萬，照這速度 2027/1 存滿。';GL.undo=()=>{g.base=o};return '改好了，每月 1.2 萬，2027/1 存滿。這個月還能花的錢會少 5 千，塔塔那邊跟著改。'}g.base=g.id==='gear'?'每月放 1.5 萬，照這速度 2027/3 到。':'每月存 2.5 萬，照這速度 2027/8 到。';GL.undo=()=>{g.base=o};return (g.id==='gear'?'改好了，每月 1.5 萬，2027/3 到。':'改好了，每月 2.5 萬，2027/8 到。')+'這個月還能花的錢會少 5 千，塔塔那邊跟著改。'},
  '先動用一點可以嗎':g=>g.id==='tax'?'不建議。這筆是 5 月要繳的稅，動了到時候要從現金補。':g.id==='fund'?'不建議。預備金是空窗用的，現在 2.1 個月，低於 3 個月不動。':'可以動，但先問塔塔這個月的現金夠不夠。'},
 din:{'劇本還追得回來嗎':()=>'追得回來。每週 8 場，3/28 寫完；前提是這週別再加新案子。','劇組那個怎麼開始':()=>'先寫三個名字給我。我陪你挑一個聊得到的，約出來的那封信交給大器擬。','先放掉可以嗎':()=>'可以。放掉會收進目標頁最下面，要撿回來點一下就好。'}};
{const _an=answer;answer=function(b,text,ctx){const a=(ctx||'').split(':');
 if(a[0]!=='goals'&&a[0]!=='goal')return _an(b,text,ctx);
 const g=a[0]==='goal'?gOf(a[1]):null,f=GA[b]&&GA[b][text];
 if(f){const t=f(g||{});render('keep');return{w:'bot',t}}
 if(b==='din'){if(/力氣|怎麼推|怎麼追|第一步|怎麼走/.test(text)||!GA.din[text]){const m={w:'bot',k:'din',ctx:ctx||'',v:dinView(ctx),mid:'v'+(++seq)};DV[m.mid]=m;return m}}
 if(b==='kim')return{w:'bot',t:g?`${g.name}：${g.base}`:'錢的目標我看著，點卡上的我就好。'};
 return _an(b,text,ctx)}}
// 照定定的看法做：總覽那張＝這週主推補助；單一目標＝那個目標的下一步跟著改
{const _d=ACT.dinapply;ACT.dinapply=function(mid){const m=DV[mid];if(!m||m.used)return _d.apply(this,arguments);const a=(m.ctx||'').split(':');
 if(a[0]!=='goals'&&a[0]!=='goal')return _d.apply(this,arguments);
 const pf=GL.focus,g=a[0]==='goal'?gOf(a[1]):null,on=g&&g.next;
 if(a[0]==='goals')GL.focus='grant';if(g)g.next=m.v.adv+'。';
 _d.apply(this,arguments);
 const fn=undoFn;if(fn){undoFn=()=>{fn();GL.focus=pf;if(g)g.next=on;render('keep')}}}}

/* ---------- 自己動手：⋯ 清單、表單 ---------- */
{const _m=mineSheet;mineSheet=function(id){const i=id.indexOf(':'),k=id.slice(0,i),x=id.slice(i+1);
 if(k==='goals')return shHead('目標')+`<div class="mlist">${mi('＋','立一個目標','sheet','gform:')}${GL.focus?mi('↶','取消這週主推','gfocus',GL.focus):''}</div>`;
 if(k!=='goal')return _m(id);const g=gOf(x);if(!g)return shHead('這個目標不在了');const j=GL.list.indexOf(g);
 return shHead(esc(g.name))+`<div class="mlist">${mi('✎','改名字、為什麼、期限','sheet','gform:'+x)}
 ${g.st==='late'&&g.id==='script'?mi('📅','初稿期限挪到 4/15','gfix',x+'|move')+mi('⏩','期限不動，每週多寫 2 場','gfix',x+'|push'):''}
 ${mi('★',GL.focus===x?'取消這週主推':'設成這週主推','gfocus',x)}${mi('↑','往上排','gup',x,j?'':' disabled')}${mi('↓','往下排','gdn',x,j<GL.list.length-1?'':' disabled')}
 ${mi('✕','放掉這個目標','gdrop',x)}</div>`}}
{const _s=sheetHTML;sheetHTML=function(){const t=S.sheet||'';if(t.indexOf('gform:')!==0)return _s();const id=t.slice(6),g=id&&gOf(id);
 const kinds=[['proj','跟著案子走'],['opp','跟著機會走'],['money','跟著錢走'],['self','自己打勾']],cur=S.gk||(g?(g.auto?g.room:'self'):'self');
 return shHead(g?'改這個目標':'立一個目標')+`<label class="f">想達成什麼<input id="gName" type="text" value="${g?esc(g.name):''}" placeholder="例：完成一部長片劇本" autocomplete="off"${S.err==='gform'?' aria-invalid="true" aria-describedby="gErr"':''}></label>${S.err==='gform'?'<p class="err" id="gErr" role="alert">▲ 還沒寫想達成什麼。</p>':''}
 <label class="f">為什麼<textarea id="gWhy" rows="2">${g?esc(g.why):''}</textarea></label>
 <label class="f">什麼時候前<input id="gDue" type="text" inputmode="numeric" value="${g?esc(g.due):''}" placeholder="例：2027/3/31，空白＝每週算"></label>
 ${g?'':`<p class="h4" id="gkL">進度怎麼算</p><div class="btns" role="group" aria-labelledby="gkL">${kinds.map(k=>`<button class="btn" data-act="gkind" data-id="${k[0]}" aria-pressed="${k[0]===cur}">${k[1]}</button>`).join('')}</div>`}
 <div class="btns">${B(g?'存好這個目標':'立這個目標','gsave',id,'pri wide')}</div>`}}
ACT.gkind=id=>{S.gk=id;document.querySelectorAll('[data-act=gkind]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.id===id))};
ACT.gsave=id=>{const n=$('#gName'),v=n?n.value.trim():'';if(!v){S.err='gform';render('keep');const x=$('#gName');if(x)x.focus();return}
 const why=$('#gWhy').value.trim(),due=$('#gDue').value.trim();S.err='';
 if(id){const g=gOf(id),o={name:g.name,why:g.why,due:g.due};S.gk=null;undoT('存好了',()=>Object.assign(g,{name:v,why:why||g.why,due}),()=>Object.assign(g,o));return}
 const k=S.gk||'self',bot={proj:'daqi',opp:'jiji',money:'kim',self:'din'}[k],room=k==='self'?'life':k;S.gk=null;
 const g={id:'n'+(++seq),name:v,room,bot,money:k==='money'?1:0,why:why||'還沒寫為什麼。',due,dueWhat:'',left:due?90:null,kind:'pips',now:0,total:1,unit:'步',label:'走到',st:'ok',stText:'剛立',short:v,base:'剛立，還沒有進度。',next:'還沒定下一步。',src:{proj:'案子房間，連到哪個案子由大器問你',opp:'機會房間，連到哪類機會由集集問你',money:'錢房間，連到哪個帳戶由塔塔問你',self:'自己打勾'}[k],auto:0,steps:[['第一步','','']]};
 undoT('立好了：'+v,()=>GL.list.push(g),()=>{GL.list=GL.list.filter(x=>x!==g)})};
ACT.gfocus=id=>{const pf=GL.focus;closeThen(()=>{GL.focus=pf===id?null:id;render('keep');toast(GL.focus?'這週主推：'+gOf(id).name:'取消這週主推',()=>{GL.focus=pf;render('keep')})})};
ACT.gfix=arg=>{const [id,how]=arg.split('|'),g=gOf(id),o=Object.assign({},g);
 if(how==='move')undoT('初稿期限改成 4/15',()=>Object.assign(g,{due:'4/15',left:144,st:'ok',stText:'照進度',expect:38,base:'期限挪到 4/15 之後，現在剛好在進度上。',next:'這週寫第 39 到 43 場。'}),()=>Object.assign(g,o));
 else undoT('每週改成 8 場，大器照這個盯',()=>Object.assign(g,{next:'這週寫第 39 到 46 場，每週 8 場。',stText:'慢 8 場，追趕中'}),()=>Object.assign(g,o))};
const gmv=(id,d)=>{const a=GL.list,i=a.findIndex(x=>x.id===id),j=i+d;if(i<0||j<0||j>=a.length)return;undoT(d<0?'往上排了':'往下排了',()=>{[a[i],a[j]]=[a[j],a[i]]},()=>{[a[i],a[j]]=[a[j],a[i]]})};
ACT.gup=id=>gmv(id,-1);ACT.gdn=id=>gmv(id,1);
ACT.gdrop=id=>{const g=gOf(id),i=GL.list.indexOf(g),pf=GL.focus,onGoal=S.page==='goal:'+id;
 closeThen(()=>{const done=()=>{GL.list.splice(i,1);GL.dropped.push(g);if(GL.focus===id)GL.focus=null;render('keep');toast('放掉了：'+g.name,()=>{GL.dropped=GL.dropped.filter(x=>x!==g);GL.list.splice(i,0,g);GL.focus=pf;render('keep')})};
  if(onGoal){after=done;back()}else done()})};
ACT.grevive=id=>{const g=GL.dropped.find(x=>x.id===id);if(!g)return;GL.dropped=GL.dropped.filter(x=>x!==g);GL.list.push(g);render('keep');toast('撿回來了：'+g.name,()=>{GL.list=GL.list.filter(x=>x!==g);GL.dropped.push(g);render('keep')})};
ACT.gcheck=id=>{const g=gOf(id),o=JSON.parse(JSON.stringify(g));undoT('記下了，本週 3／3',()=>Object.assign(g,{now:3,stText:'連 5 週達標',short:'運動 本週 3／3',base:'這週滿 3 次了，連續 5 週達標。',next:'下週一重新算。',week:g.week.map((v,i)=>i===6?1:v)}),()=>Object.assign(g,o))};
ACT.gstep=id=>{const g=gOf(id),o=JSON.parse(JSON.stringify(g));undoT('往前一步',()=>{g.steps[g.now][1]='d';g.steps[g.now][2]='今天完成';g.now++;Object.assign(g,{st:'ok',stText:'照進度',short:`劇組 ${g.now}／3 步`,base:'今天往前一步。',next:g.now<g.total?g.steps[g.now][0]+'。':'都做完了。'})},()=>Object.assign(g,o))};
{const _s=ACT.sheet;ACT.sheet=function(id,el){if(String(id).indexOf('gform:')===0){S.gk=null;S.err=''}return _s.apply(this,arguments)}}
WRITE.push('gsave','gfocus','gfix','gup','gdn','gdrop','grevive','gcheck','gstep');
// 換到另一個目標頁（目標整頁 ⇄ 單一目標 ⇄ 房間）時從頂端開始
{let lp=null;const _r=render;render=function(d){_r(d);const p=S.page||'';if(p!==lp&&lp&&/^(goals|goal:|zone:)/.test(p)){const g=$('#page');if(g)g.scrollTop=0}lp=p}}
window.__goals=()=>({n:GL.list.length,dropped:GL.dropped.length,focus:GL.focus});

/* ---------- 1122-J 錢房間：三個方向都留著，大卡左右滑切換（2026-11-22） ----------
   老大 2026-11-22：「錢頁三種 看能不能都先保留在裡面，我可以轉換 但那個轉換的按鈕要設計好 不然我怕畫面太雜」
   來源：錢頁設計/逐流_錢頁設計.html（A 撐多久、B 這三個月、C 金金說）與 錢頁設計/決策紀錄.md。
   切換（監工定的做法）：不放大按鈕；橘色大卡左右滑換 A／B／C，大卡底部三個小圓點也能點；大卡標題列小字寫現在是哪一種。
   換的時候只換大卡和緊接的第二層，下面「會進來的」「要出去的大筆」「目標」「要你按的」共用。記住上次選的（存不到就預設 A）。
   全面板原則照舊：自己動手＝「⋯」，叫 AI＝點小臉，付款鈕照舊（按下 5 秒內可取消），帳單不同步行事曆。資料全是示意。 */
const MZK=['C','A','B'],MZN=['金金說','撐多久','這三個月'];

const MZ={cash:198400,monthly:58000,safe:3,cashAt:'昨天 21:40 對帳',
 fixedIn:{name:'教學授權分潤',amt:8000,day:10},
 recv:[
  {id:'r1',p:'p2',proj:'AI 影片比賽代製',what:'尾款',amt:30000,date:[2026,10,30],st:'done',stT:'已交件，等付款',total:60000,got:30000,term:'約定 11/30 前付',next:'已交件 2 天，等對方付款'},
  {id:'r2',p:'p1',proj:'品牌形象短片',what:'訂金',amt:45000,date:[2026,11,5],st:'signed',stT:'已簽約',total:120000,got:0,term:'簽約後 15 天付，請款單 11/20 送出',next:'分鏡第二版寫好，等客戶回'},
  {id:'r3',p:'p1',proj:'品牌形象短片',what:'尾款',amt:75000,date:[2027,0,20],st:'signed',stT:'已簽約，交片後收',total:120000,got:0,term:'交片後 30 天付，交片排 12/21',next:'交片晚一天，這筆就晚一天'}],
 quote:{proj:'活動紀錄片',amt:60000,wait:6},
 big:[
  {id:'b1',name:'壽險年繳',amt:24600,date:[2026,11,5],how:'要自己付'},
  {id:'b2',name:'器材保險與保養',amt:18000,date:[2027,0,5],how:'要自己付'},
  {id:'b3',name:'過年（紅包、返鄉）',amt:36000,date:[2027,1,10],how:'你估的'}],
 kim:{at:'週日 20:00 週報',say:'2 月還沒有已簽的案。現在開始談，最快 3 月才收得到錢。',
  why:['已簽的收入到 1/20 就沒有了，之後每月只剩授權約 NT$ 8,000。','2 月有過年的大筆，月底會掉到安全線以下。','你的案子從談到收款，平均要 6 到 8 週。'],
  todo:'這週先追報價中的活動紀錄片；鏡頭等 1/20 尾款進來再買。'},
 dec:[
  {id:'d1',who:'jiji',q:'AI 影片比賽代製尾款 NT$ 30,000，約定 11/30 付。',a:'要先提醒對方嗎？',yes:'請集集今天提醒',no:'到期再說',yesT:'集集今天會提醒對方',noT:'到期再說，11/30 沒進來集集會問你'},
  {id:'d2',who:'jiji',q:'活動紀錄片報價 NT$ 60,000，等了 6 天沒回。',a:'2 月沒有已簽的案，要追嗎？',yes:'請集集追這件報價',no:'我自己問',yesT:'集集會追這件報價',noT:'你自己問，集集不動'},
  {id:'d3',who:'kim',q:'想買的鏡頭 NT$ 62,000。',a:'現在買，1 月底會低於安全線。',yes:'等 1/20 尾款進來再買',no:'現在就買',yesT:'鏡頭等 1/20 尾款進來再買',noT:'現在買，朋朋會來跟你確認訂單'}],
 chased:{},decided:{}};
const MZT=new Date(2026,10,22);
const mzwan=n=>(Math.round(n/1000)/10).toFixed(1)+' 萬';
const mzmd=a=>(a[1]+1)+'/'+a[2];
const mzxun=d=>d<=10?'上旬':d<=20?'中旬':'下旬';
const mzRecv=()=>E()?[]:MZ.recv;
// 一天一天往後推：只算手上現金，或加上已簽的待收與固定進帳。三個方向共用這一份算法。
function mzSim(withIn){const ev={},dk=(y,m,d)=>y*10000+m*100+d,put=(k,o)=>(ev[k]=ev[k]||[]).push(o);
 MZ.big.forEach(b=>put(dk(...b.date),{s:-1,name:b.name,amt:b.amt,d:mzmd(b.date)}));
 if(withIn)mzRecv().forEach(r=>put(dk(...r.date),{s:1,name:r.proj+' '+r.what,amt:r.amt,d:mzmd(r.date)}));
 const daily=MZ.monthly/30.4,day=new Date(MZT),months=[];let bal=MZ.cash,out=null,m=null;
 for(let i=1;i<=400;i++){day.setDate(day.getDate()+1);const y=day.getFullYear(),mo=day.getMonth(),dd=day.getDate();
  const first=y===2026&&mo>=10,key=first?'first':y+'-'+mo;   // 11 月剩下的併進 12 月
  if(!m||m.key!==key){m={key,label:first?'到 12 月底':(mo+1)+' 月',inn:0,out:0,daily:0,items:[],end:0};months.push(m)}
  bal-=daily;m.out+=daily;m.daily+=daily;
  if(withIn&&dd===MZ.fixedIn.day){bal+=MZ.fixedIn.amt;m.inn+=MZ.fixedIn.amt;m.items.push({s:1,name:MZ.fixedIn.name,amt:MZ.fixedIn.amt,d:(mo+1)+'/'+dd})}
  (ev[dk(y,mo,dd)]||[]).forEach(e=>{bal+=e.s*e.amt;if(e.s>0)m.inn+=e.amt;else m.out+=e.amt;m.items.push(e)});
  m.end=bal;if(bal<0&&!out)out={days:i,date:new Date(day)}}
 const r=out?{mo:out.days/30.4,when:(out.date.getMonth()+1)+' 月'+mzxun(out.date.getDate())}:{mo:13,when:'一年後還有'};
 r.txt=out?r.mo.toFixed(1):'12+';r.months=months.slice(0,3);return r}
const mzCmp=a=>{const d=a.mo-MZ.safe;return d<0?`▲ 比安全線 ${MZ.safe} 個月少 ${(-d).toFixed(1)} 個月`:`比安全線 ${MZ.safe} 個月多 ${a.mo>=13?'很多':d.toFixed(1)+' 個月'}`};
const mzEd=(id,label)=>`<button class="mine mzed" data-act="mine" data-id="${id}" aria-label="${label}"><span aria-hidden="true">⋯</span></button>`;

/* ---------- 大卡三張 ---------- */
function mzSlideA(a,b){const sc=Math.max(6,MZ.safe,Math.min(b.mo,13))*1.08,w=x=>Math.min(100,x/sc*100).toFixed(1),sl=w(MZ.safe),n=mzRecv().length;
 return `<p class="mzhl">手上的現金還能撐</p><p class="mzbig"><b>${a.txt}</b><span>個月</span><em>到 ${a.when}</em></p>
 <div class="mzrw" role="img" aria-label="只算手上現金 ${a.txt} 個月；${n?'已簽的都收到 '+b.txt+' 個月':'沒有待收款'}；安全線 ${MZ.safe} 個月">
  <div class="mzrr"><span>只算手上</span><div class="mztk"><i style="width:${w(a.mo)}%"></i><u style="left:${sl}%"></u></div><b>${a.txt}</b></div>
  <div class="mzrr"><span>${n?'已簽都收到':'沒有待收'}</span><div class="mztk"><i style="width:${w(b.mo)}%"></i><u style="left:${sl}%"></u></div><b>${b.txt}</b></div>
  <div class="mzrr cap"><span></span><div><span style="left:${sl}%">安全線 ${MZ.safe}</span></div><span></span></div></div>
 <p class="mzcmp"><span>${mzCmp(a)}</span>${mzEd('mz:safe','改安全線')}</p>`}
function mzSlideB(a,b){const line=MZ.safe*MZ.monthly,ms=b.months,low=ms.find(m=>m.end<line),n=mzRecv().length;
 const hl=low?`<p class="mzhl">${low.label.replace('到 ','')}${low.label.includes('底')?'':'底'}會低於安全線</p><p class="mzbig"><b>${(Math.round(low.end/1000)/10).toFixed(1)}</b><span>萬</span><em>安全線 ${mzwan(line)}</em></p>`
  :`<p class="mzhl">三個月都在安全線以上</p><p class="mzbig"><b>${(Math.round(ms[2].end/1000)/10).toFixed(1)}</b><span>萬</span><em>${ms[2].label}底</em></p>`;
 const mx=Math.max(...ms.map(m=>m.end),line)*1.05;
 return hl+`<div class="mzmini" role="img" aria-label="${ms.map(m=>m.label+'月底剩 '+mzwan(m.end)).join('，')}；安全線 ${mzwan(line)}">${ms.map(m=>`<div class="mzmc${m.end<line?' low':''}"><i style="height:${Math.max(3,m.end/mx*74).toFixed(1)}px"></i><span>${m.label.replace('到 ','')}</span></div>`).join('')}<u style="bottom:${(22+line/mx*74).toFixed(1)}px"></u></div>
 <p class="mzcmp"><span>${low?'那個月只有 '+mzwan(low.inn)+' 會進來。':''}現金撐 ${a.txt} 個月${n?'，已簽都收到 '+b.txt+' 個月':''}</span>${mzEd('mz:safe','改安全線')}</p>`}
function mzSlideC(a){const left=MZ.dec.filter(d=>!MZ.decided[d.id]).length;
 return `<p class="mzhl mzkw">${aiF('kim','mkim')}<span>金金・週日週報</span></p><p class="mzsay">${MZ.kim.say}</p>
 <p class="mzcmp"><span>${mzCmp(a)}${left?`・等你決定 ${left} 件`:'・今天都決定了'}</span>${mzEd('mz:safe','改安全線')}</p>`}

/* ---------- 第二層：跟著大卡換 ---------- */
function mzCalc(a,b){const sR=mzRecv().reduce((x,r)=>x+r.amt,0),sB=MZ.big.reduce((x,r)=>x+r.amt,0),op=!!S.open.mzcalc;
 return `<div class="rows mzcalc"><div class="rowi"><button class="rowb" data-act="open" data-id="mzcalc" aria-expanded="${op}"><span class="tx"><b>怎麼算的</b></span><span class="rt"><span class="chev" aria-hidden="true">${op?'⌃':'⌄'}</span></span></button></div>
 ${op?`<dl class="mzdl"><dt>可動用現金<small>塔塔 ${MZ.cashAt}，預備金與器材基金帳戶不算</small></dt><dd>${nt(MZ.cash)}</dd><dt>平常一個月花<small>塔塔，近 3 期平均</small></dt><dd>${nt(MZ.monthly)}</dd>
 <dt>90 天內的大筆<small>${MZ.big.length} 筆</small></dt><dd>${nt(sB)}</dd><dt>已簽的待收<small>集集，${mzRecv().length} 筆</small></dt><dd>${nt(sR)}</dd>
 <dt>每月固定進帳<small>${MZ.fixedIn.name}</small></dt><dd>${nt(MZ.fixedIn.amt)}</dd><dt>只算手上現金，撐到</dt><dd>${a.when}</dd><dt>已簽的都收到，撐到</dt><dd>${b.when}</dd></dl>`:''}</div>`}
function mzKim(){const op=!!S.open.mzkim;
 return `<section class="sec">${sh('','金金怎麼看',MZ.kim.at)}<div class="card mzkimc"><div class="mzkq">${aiF('kim','mkim')}<p>${MZ.kim.say}</p></div>
 <div class="mrow">${mb(op?'收起理由':'理由和建議','open','mzkim',` aria-expanded="${op}"`)}</div>
 ${op?`<ul class="mzwhy">${MZ.kim.why.map(w=>`<li>${w}</li>`).join('')}</ul><p class="note"><b style="color:var(--ink)">建議：</b>${MZ.kim.todo}</p>`:''}</div></section>`}
function mzMonths(b){const line=MZ.safe*MZ.monthly,ms=b.months,mx=Math.max(...ms.map(m=>Math.max(m.inn,m.out)));
 return `<section class="sec">${sh('','這三個月','照已簽的算')}<div class="rows">${ms.map((m,k)=>{const bad=m.end<line,id='mzm'+k,op=S.open[id]!=null?!!S.open[id]:bad;
  return `<div class="rowi mzmo"><button class="rowb" data-act="mzopen" data-id="${id}" aria-expanded="${op}"><span class="tx"><span class="mzmh"><b>${m.label}</b>${bad?chip('低於安全線',1):''}<span class="mzme">月底剩<b>${mzwan(m.end)}</b></span></span>
  <span class="mzfl"><span>進</span><span class="mzt2"><i class="in" style="width:${(m.inn/mx*100).toFixed(1)}%"></i></span><b>${mzwan(m.inn)}</b></span>
  <span class="mzfl"><span>出</span><span class="mzt2"><i class="out" style="width:${(m.out/mx*100).toFixed(1)}%"></i></span><b>${mzwan(m.out)}</b></span>
  <small>${m.items.filter(i=>i.s>0).length} 筆進、${m.items.filter(i=>i.s<0).length} 筆大筆出</small></span><span class="rt"><span class="chev" aria-hidden="true">${op?'⌃':'⌄'}</span></span></button></div>
  ${op?`<ul class="mzli">${m.items.map(i=>`<li><span>${i.d}</span><span>${i.s>0?'進':'出'} ${esc(i.name)}</span><b>${i.s>0?'+':'−'}${Math.round(i.amt).toLocaleString('en-US')}</b></li>`).join('')}<li><span>每天</span><span>出 平常開銷</span><b>−${Math.round(m.daily).toLocaleString('en-US')}</b></li></ul>`:''}`}).join('')}</div>
 <p class="note mzfoot">進＝已簽的待收加固定進帳；出＝平常開銷加大筆。報價中的不算。</p></section>`}
function mzDecs(){const a=MZ.dec,left=a.filter(d=>!MZ.decided[d.id]).length;
 return `<section class="sec">${sh('','等你決定',left?left+' 件':'都決定了')}<div class="stack">${a.map(d=>{const v=MZ.decided[d.id];
  if(v)return `<div class="card mzdone" data-card="mzd:${d.id}"><p>✓ ${v==='yes'?d.yesT:d.noT}</p>${mb('復原','mzundo',d.id,` aria-label="復原：${esc(d.a)}"`)}</div>`;
  return `<article class="card mzdec" data-card="mzd:${d.id}"><p class="note">${d.q}</p><h3>${d.a}</h3><div class="btns"><button class="btn pri" data-act="mzpick" data-id="${esc(d.id)}" data-v="yes">${d.yes}</button><button class="btn ghost" data-act="mzpick" data-id="${esc(d.id)}" data-v="no">${d.no}</button></div>${aifs([aiF(d.who,'mdec:'+d.id)])}</article>`}).join('')}</div>
 ${left?'':'<p class="note mzfoot">錢的事今天都決定了。金金週日再看一次。</p>'}</section>`}
function mz2HTML(){const a=mzSim(false),b=mzSim(true);
  if(S.mz===2)return mzMonths(b)+mzKim();
 if(S.mz===0)return mzDecs()+`<div class="sec">${mzCalc(a,b)}</div>`;
 return `<div class="sec mzfirst">${mzCalc(a,b)}</div>`+mzKim()}

/* ---------- 共用：會進來的、要出去的大筆、目標、要你按的、塔塔記帳 ---------- */
function mzIn(){const rs=mzRecv(),sum=rs.reduce((a,r)=>a+r.amt,0);
 const rows=rs.map(r=>{const id='mr_'+r.id,op=!!S.open[id];
  return `<div class="rowi mzr" data-card="${id}"><div class="rowb"><button class="tx" data-act="open" data-id="${id}" aria-expanded="${op}"><b>${r.proj} ${r.what}</b><small>${MZ.chased[r.id]?'<span class="mzchase">集集追款中</span>':`${r.st==='done'?'●':'◐'} ${r.stT}`}・預計 ${mzmd(r.date)}</small></button><span class="rt"><span class="amt">${nt(r.amt)}</span>${aiF('jiji','mrecv:'+r.id,MZ.chased[r.id]?'追款中':'')}</span></div>
  ${op?`<div class="mzrx"><span>合約 <b>${nt(r.total)}</b>，已收 <b>${nt(r.got)}</b></span><span>${r.term}</span><span>案子現在：${r.next}</span><div class="mrow">${mb('開這個案子 ›','page','proj:'+r.p)}</div></div>`:''}</div>`}).join('');
 return `<section class="sec">${sh('','會進來的',rs.length?`已簽 ${rs.length} 筆・${nt(sum)}・集集 今天 08:00`:'0 筆')}
 ${rs.length?`<div class="rows">${rows}</div>`:`<div class="card"><h3>沒有已簽的待收款</h3><p>手上的現金就是全部。報價中的談成了才會出現在這裡。</p>${aifs([aiF('jiji','mrecv:none')])}</div>`}
 <div class="card mzq"><p>○ 報價中，不算進去<br><b>${MZ.quote.proj} ${nt(MZ.quote.amt)}</b>・等了 ${MZ.quote.wait} 天</p>${aiF('jiji','mquote')}</div>
 <p class="note mzfoot">另外每月 ${MZ.fixedIn.day} 號固定進${MZ.fixedIn.name}，約 ${nt(MZ.fixedIn.amt)}。</p></section>`}
function mzOut(){const sum=MZ.big.reduce((a,b)=>a+b.amt,0);
 return `<section class="sec">${sh('','要出去的大筆',`90 天內 ${MZ.big.length} 筆・${nt(sum)}`)}<div class="card cardx mzbigc">${mineB('mz:big','大筆支出')}
 <div class="rows mzflat">${MZ.big.map(b=>`<div class="rowi"><div class="rowb"><span class="tx"><b>${b.name}</b><small>${mzmd(b.date)}・${b.how}</small></span><span class="rt"><span class="amt">${nt(b.amt)}</span></span></div></div>`).join('')}</div></div>
 <p class="note mzfoot">平常一個月花 ${nt(MZ.monthly)}（近 3 期平均）。每一筆在塔塔記帳。</p></section>`}
function mzGoals(){const a=gAll().filter(g=>g.room==='money');if(!a.length)return '';
 return `<section class="sec">${sh('','目標',a.length+' 個・金金盯',`<button class="more" data-act="page" data-id="goals">全部目標</button>`)}<div class="rows">${a.map(g=>`<div class="rowi" data-card="mg:${g.id}"><div class="rowb"><button class="tx" data-act="page" data-id="goal:${g.id}"><b>${esc(g.name)}</b><small>${g.label} ${g.now}／${g.total} ${g.unit}・${gdue(g)}</small><span class="gbar sm" aria-hidden="true"><u style="width:${gpct(g.now,g.total)}%"></u></span></button><span class="rt">${aiF(g.bot,'goal:'+g.id)}</span></div></div>`).join('')}</div></section>`}
function mzPay(){const all=E()?[]:DB.due.filter(d=>!d.paid),hand=all.filter(d=>!d.auto&&d.in<=7),rest=all.length-hand.length,auto=all.filter(d=>d.auto).length;
 return `${hand.length?`<section class="sec" id="secDue">${sh('tata','要你按的',`7 天內 ${hand.length} 筆`)}<div class="stack">${hand.map(d=>`<div class="card cardx dr" data-card="${esc(d.id)}"><div class="meta">${chip(`${d.due} 截止・剩 ${d.in} 天`,d.in<=3)}<span class="lbl">要手動繳</span></div><div class="li"><div><h3>${esc(d.name)}</h3></div><span class="amt">${nt(d.amt)}</span></div>${payHTML('d_'+d.id)}</div>`).join('')}</div></section>`:''}
 <div class="rows mztata"><div class="rowi"><a class="rowb" href="https://borrysu.github.io/kakeibo/" target="_blank" rel="noopener">${bm('tata')}<span class="tx"><b>打開塔塔記帳</b><small>每一筆、帳單、訂閱、帳戶。${rest?`其他 ${rest} 筆帳單在那裡，${auto} 筆自動扣，塔塔看著。`:''}</small></span><span class="rt"><span class="chev" aria-hidden="true">↗</span></span></a></div></div>`}

/* ---------- 錢房間 ---------- */
function mzHero(){const a=mzSim(false),b=mzSim(true),st=S.st==='ok'||S.st==='empty'||S.st==='offline'?MZ.cashAt:FRESH.tata;
 const sl=[mzSlideC(a),mzSlideA(a,b),mzSlideB(a,b)];
 return `<div class="zh zhx mz" data-z="money"><div class="zht"><h1>錢</h1><p class="zown">塔塔 ${st}・<span class="mzk">${MZN[S.mz]}</span></p></div>${bigF('tata','money')}
 <div class="mzv" role="group" aria-roledescription="輪播" aria-label="錢的三種看法，左右滑可以換"><div class="mztr" style="transform:translateX(${-S.mz*100}%)">${sl.map((h,k)=>`<div class="mzs" role="group" aria-roledescription="一種看法" aria-label="${MZN[k]}，第 ${k+1} 種，共 3 種" aria-hidden="${k!==S.mz}"${k!==S.mz?' inert':''}>${h}</div>`).join('')}</div></div>
 <div class="mzdots">${MZN.map((n,k)=>`<button class="mzdot" data-act="mzgo" data-id="${k}" aria-label="切到${n}"${k===S.mz?' aria-current="true"':''}><i aria-hidden="true"></i></button>`).join('')}</div></div>`}
zoneMoney=function(){return mzHero()+`<div id="mz2">${mz2HTML()}</div>`+mzIn()+mzOut()+mzGoals()+mzPay()};

/* ---------- 切換改由 1122-K 共用滑卡（cvHTML／cvGo）處理 ---------- */
ACT.mzopen=id=>{const k=+id.slice(3),line=MZ.safe*MZ.monthly,m=mzSim(true).months[k],cur=S.open[id]!=null?!!S.open[id]:(m&&m.end<line);S.open[id]=!cur;render('keep')};

/* ---------- 決定（方向 C） ---------- */
ACT.mzpick=(id,el)=>{const v=el.dataset.v,d=MZ.dec.find(x=>x.id===id);MZ.decided[id]=v;
 if(v==='yes'&&id==='d1')MZ.chased.r1=1;render('keep');
 const u=document.querySelector(`[data-act=mzundo][data-id="${id}"]`);if(u)u.focus({preventScroll:true});
 toast(v==='yes'?d.yesT:d.noT,()=>ACT.mzundo(id))};
ACT.mzundo=id=>{const was=MZ.decided[id];delete MZ.decided[id];if(id==='d1'&&was==='yes')delete MZ.chased.r1;render('keep');
 const p=document.querySelector(`[data-act=mzpick][data-id="${id}"]`);if(p)p.focus({preventScroll:true})};

/* ---------- 「⋯」：安全線、大筆金額（自己動手，直接生效＋復原） ---------- */
{const _m=ACT.mine;ACT.mine=id=>id.indexOf('mz:')===0?ACT.sheet(id):_m(id)}
{const _s=sheetHTML;sheetHTML=function(){const [t,id]=(S.sheet||'').split(':');if(t!=='mz')return _s();
 if(id==='safe')return shHead('安全線')+`<p class="note">現金至少要撐幾個月才安心。改了馬上算，可以復原。</p><div class="mzopts" role="radiogroup" aria-labelledby="sTitle">${[2,3,4,6].map(n=>`<label><input type="radio" name="mzsafe" value="${n}"${MZ.safe===n?' checked':''}>${n} 個月</label>`).join('')}</div>`;
 return shHead('大筆支出')+`<p class="note">改金額馬上重算，可以復原。每一筆的細節在塔塔記帳。</p>${MZ.big.map(b=>`<label class="f mzf${S.err==='mz_'+b.id?' bad':''}">${b.name}<small> ${mzmd(b.date)}・${b.how}</small><input id="mz_${b.id}" data-mzb="${esc(b.id)}" type="text" inputmode="numeric" autocomplete="off" value="${b.amt}"${S.err==='mz_'+b.id?` aria-invalid="true" aria-describedby="mze_${b.id}"`:''}>${S.err==='mz_'+b.id?`<span class="err" id="mze_${b.id}" role="alert">▲ 要填大於 0 的數字，例如 36000。</span>`:''}</label>`).join('')}`}}
document.addEventListener('change',e=>{const t=e.target;
 if(t.name==='mzsafe'){const old=MZ.safe;MZ.safe=+t.value;render('keep');const r=document.querySelector(`input[name=mzsafe][value="${MZ.safe}"]`);if(r)r.focus();
  toast(`安全線改成 ${MZ.safe} 個月`,()=>{MZ.safe=old;render('keep')});return}
 if(t.dataset&&t.dataset.mzb){const v=Number(t.value.replace(/[,\s]/g,'')),b=MZ.big.find(x=>x.id===t.dataset.mzb);
  if(!isFinite(v)||v<=0){S.err='mz_'+b.id;render('keep');const i=document.getElementById('mz_'+b.id);if(i){i.value=t.value;i.focus()}return}
  if(S.err==='mz_'+b.id)S.err='';const old=b.amt;if(old===v){render('keep');return}b.amt=v;render('keep');const i=document.getElementById('mz_'+b.id);if(i)i.focus();
  toast(`${b.name}改成 ${nt(v)}`,()=>{b.amt=old;render('keep')})}});

/* ---------- 叫 AI：集集追款、金金的看法（v3 浮動對話） ---------- */
{const _n=ctxName;ctxName=function(ctx){const a=(ctx||'').split(':'),r=MZ.recv.find(x=>x.id===a[1]),d=MZ.dec.find(x=>x.id===a[1]);
 if(a[0]==='mrecv')return r?r.proj+' '+r.what:'待收款';if(a[0]==='mquote')return MZ.quote.proj+'報價';if(a[0]==='mkim')return '錢的看法';if(a[0]==='mdec')return d?d.a.slice(0,24):'';return _n(ctx)}}
{const _a=autoFor;autoFor=function(b,ctx){const a=(ctx||'').split(':');
 if(b==='jiji'&&a[0]==='mrecv'){const r=MZ.recv.find(x=>x.id===a[1]);return r&&!MZ.chased[r.id]?`幫我追「${r.proj} ${r.what}」${nt(r.amt)}`:null}
 if(b==='jiji'&&a[0]==='mquote')return `${MZ.quote.proj}報價等了 ${MZ.quote.wait} 天，幫我追`;
 if(b==='kim'&&a[0]==='mkim')return '錢這週怎麼看？';
 return _a(b,ctx)}}
{const _q=quick;quick=function(on){const k=(on.ctx||'').split(':')[0];
 if(on.b==='jiji'&&(k==='mrecv'||k==='mquote'))return['擬一句催款的話','什麼時候會進來'];
 if(on.b==='kim'&&(k==='mkim'||k==='mdec'))return['為什麼 2 月會卡','鏡頭什麼時候能買','每月少花 5 千會怎樣'];
 return _q(on)}}
{const _a=answer;answer=function(b,text,ctx){const a=(ctx||'').split(':');
 if(b==='jiji'&&a[0]==='mrecv'){const r=MZ.recv.find(x=>x.id===a[1]);
  if(r&&/追|提醒|催/.test(text)&&!/擬/.test(text)){MZ.chased[r.id]=1;render('keep');return{w:'bot',t:`好，今天下午提醒對方「${r.proj} ${r.what}」${nt(r.amt)}，回覆貼在案子裡。`}}
  if(/擬/.test(text))return{w:'bot',t:'「您好，想跟您確認一下尾款的付款進度，約定是 11/30 前，有需要我這邊補什麼文件嗎？」要我照這句發嗎？'};
  return{w:'bot',t:r?`${r.proj} ${r.what}：${r.term}，預計 ${mzmd(r.date)} 進來。`:'現在沒有已簽的待收款，報價中的我盯著。'}}
 if(b==='jiji'&&a[0]==='mquote')return{w:'bot',t:/擬/.test(text)?'「想跟您確認活動紀錄片的報價，有任何要調整的地方都可以談。」要我照這句發嗎？':`好，今天問${MZ.quote.proj}那邊的窗口，有回覆貼在機會裡。`};
 if(b==='kim'&&(a[0]==='mkim'||a[0]==='mdec')){
  if(/2 月/.test(text))return{w:'bot',t:MZ.kim.why.slice(0,2).join('')};
  if(/鏡頭/.test(text))return{w:'bot',t:'等 1/20 品牌短片尾款 NT$ 75,000 進來再買，現在買 1 月底會低於安全線。'};
  if(/少花/.test(text)){const o=MZ.monthly;MZ.monthly=o-5000;const r=mzSim(false);MZ.monthly=o;return{w:'bot',t:`每月少花 5 千，現金撐到 ${r.when}，多 ${(r.mo-mzSim(false).mo).toFixed(1)} 個月。`}}
  return{w:'bot',t:`${MZ.kim.say}建議：${MZ.kim.todo}`}}
 return _a(b,text,ctx)}}

/* ---------- 首頁錢房間那格：改看撐多久（訂閱是記帳那邊的事） ---------- */
{const _z=zsum;zsum=function(z){if(z!=='money')return _z(z);const a=mzSim(false),low=a.mo<MZ.safe;
 return {n:a.txt,sm:0,u:'個月現金撐得住',s:`到 ${a.when}${low?`・比安全線少 ${(MZ.safe-a.mo).toFixed(1)}`:''}`,b:`已簽待收 ${mzRecv().length} 筆`,none:false,hot:low}}}
window.__money=()=>({mz:S.mz,k:MZK[S.mz],safe:MZ.safe,chased:Object.keys(MZ.chased),decided:Object.assign({},MZ.decided),big:MZ.big.map(b=>b.amt),a:mzSim(false).txt,b:mzSim(true).txt});

/* ---------- 1122-K 每個房間的色卡加「目標」，左右滑（2026-11-22） ----------
   老大 2026-11-22：「這樣好了，然後每一頁的目標 都弄進去色卡可以左右滑動？」
   做法：把錢房間那套滑卡（mzv／mztr／mzdot）抽成共用的 cvHTML／cvGo，錢、案子、機會、生活四個房間共用一份。
   案子、機會、生活：第一頁＝原本的房間摘要，第二頁起每個目標一頁；目標超過 3 個就合併成一頁清單（圓點最多 4 個）。
   錢：金金說、撐多久、這三個月之後加第四頁「目標」（錢的目標合成一頁，金金盯）。沒有目標的房間不出現目標頁與圓點。
   原本大卡下面的「這間的目標」小條、錢房間下面的「目標」區拿掉，避免重複。首頁目標條與目標整頁照舊，互連。
   臉照目標頁的規則：單一目標＝那個目標卡上的臉（劇本、劇組＝大器，補助＝集集，運動＝朋朋，錢的目標＝金金）；合併清單＝定定，錢的清單＝金金。 */

/* ---------- 共用滑卡 ---------- */
const CV={},CVP={},CVK={money:'zl3money2'};   // 錢沿用上一版記住的鍵
S.cv=S.cv||{};
const cvGet=z=>{try{return localStorage.getItem(CVK[z]||'zl3cv_'+z)}catch(e){return null}};
const cvSet=(z,v)=>{try{localStorage.setItem(CVK[z]||'zl3cv_'+z,v)}catch(e){}};
const cvCur=z=>{const m=CV[z];return m?m.ids[S.cv[z]||0]:null};
// 第幾頁：剛從目標頁「到房間看」回來的先翻到那個目標，其次是記住的，再來是第一頁
function cvIdx(z,ids){let i=-1;if(CVP[z]){i=ids.indexOf(CVP[z]);delete CVP[z]}
 if(i<0&&S.cv[z]!=null&&CV[z])i=ids.indexOf(CV[z].ids[S.cv[z]]);
 if(i<0&&S.cv[z]==null){const v=cvGet(z);i=ids.indexOf(v)}
 if(i<0)i=Math.min(S.cv[z]||0,ids.length-1);return Math.max(0,i)}
// sl＝[{id,name,html}]；on＝換頁時要跟著換的東西（錢的第二層）
function cvHTML(z,sl,label,on){const ids=sl.map(s=>s.id),n=sl.length,i=cvIdx(z,ids);S.cv[z]=i;CV[z]={ids,names:sl.map(s=>s.name),on:on||CV[z]&&CV[z].on||null};
 return `<div class="mzv" data-cv="${z}" role="group" aria-roledescription="輪播" aria-label="${label}，左右滑可以換"><div class="mztr" style="transform:translateX(${-i*100}%)">${sl.map((s,k)=>`<div class="mzs" data-sid="${esc(s.id)}" role="group" aria-roledescription="一頁" aria-label="${s.name}，第 ${k+1} 頁，共 ${n} 頁" aria-hidden="${k!==i}"${k!==i?' inert':''}>${s.html}</div>`).join('')}</div></div>
 <div class="mzdots" data-cv="${z}">${sl.map((s,k)=>`<button class="mzdot" data-act="cvgo" data-id="${z}:${k}" aria-label="切到${s.name}"${k===i?' aria-current="true"':''}><i aria-hidden="true"></i></button>`).join('')}</div>`}
const cvView=z=>document.querySelector(`${S.page?'#page':'#view'} .mzv[data-cv="${z}"]`);
const cvAct=v=>v.querySelectorAll(':scope>.mztr>.mzs')[S.cv[v.dataset.cv]||0];
function cvFit(v){const s=cvAct(v);if(s)v.style.height=s.offsetHeight+'px'}
const cvRO=window.ResizeObserver?new ResizeObserver(es=>es.forEach(e=>{const v=e.target.closest('.mzv');if(v)cvFit(v)})):null;let cvSeen=[];
function cvWatch(){const vs=[...document.querySelectorAll('.mzv[data-cv]')],act=vs.map(cvAct).filter(Boolean);
 if(cvRO&&(act.length!==cvSeen.length||act.some((s,k)=>s!==cvSeen[k]))){cvRO.disconnect();act.forEach(s=>cvRO.observe(s));cvSeen=act}
 vs.forEach(cvFit)}
function cvGo(z,i,focusDot){const m=CV[z];if(!m)return;const n=m.ids.length;i=Math.max(0,Math.min(n-1,i));const prev=S.cv[z]||0,ch=i!==prev;S.cv[z]=i;cvSet(z,m.ids[i]);
 const v=cvView(z);if(!v)return;const h=v.parentNode;v.classList.remove('drag');v.querySelector(':scope>.mztr').style.transform=`translateX(${-i*100}%)`;
 v.querySelectorAll(':scope>.mztr>.mzs').forEach((s,k)=>{const on=k===i;s.inert=!on;s.setAttribute('aria-hidden',String(!on))});
 h.querySelectorAll(`.mzdots[data-cv="${z}"] .mzdot`).forEach((d,k)=>{if(k===i)d.setAttribute('aria-current','true');else d.removeAttribute('aria-current')});
 const k=h.querySelector('.mzk');if(k)k.textContent=m.names[i];cvWatch();
 if(ch&&m.on)m.on(i,prev);
 if(focusDot){const d=h.querySelectorAll(`.mzdots[data-cv="${z}"] .mzdot`)[i];if(d)d.focus({preventScroll:true})}}
ACT.cvgo=id=>{const j=id.lastIndexOf(':');cvGo(id.slice(0,j),+id.slice(j+1))};
// 左右滑：只在大卡上；直向捲動交給瀏覽器（touch-action:pan-y）
let CVD=null,cvNoClick=0;
document.addEventListener('pointerdown',e=>{const v=e.target.closest&&e.target.closest('.mzv[data-cv]');if(!v||e.button>0)return;CVD={v,z:v.dataset.cv,x:e.clientX,y:e.clientY,t:performance.now(),dx:0,on:0,id:e.pointerId}},{passive:true});
document.addEventListener('pointermove',e=>{if(!CVD||e.pointerId!==CVD.id)return;const dx=e.clientX-CVD.x,dy=e.clientY-CVD.y;
 if(!CVD.on){if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*1.2){CVD.on=1;CVD.v.classList.add('drag');try{CVD.v.setPointerCapture(e.pointerId)}catch(_){}}else{if(Math.abs(dy)>10)CVD=null;return}}
 const i=S.cv[CVD.z]||0,n=CV[CVD.z]?CV[CVD.z].ids.length:1;let d=dx;if((i===0&&d>0)||(i===n-1&&d<0))d*=.3;CVD.dx=d;
 CVD.v.querySelector(':scope>.mztr').style.transform=`translateX(calc(${-i*100}% + ${d}px))`},{passive:true});
function cvEnd(e){if(!CVD||e.pointerId!==CVD.id)return;const m=CVD;CVD=null;if(!m.on)return;cvNoClick=performance.now();
 const w=m.v.clientWidth||1,vel=m.dx/Math.max(1,performance.now()-m.t),cur=S.cv[m.z]||0;let i=cur;
 if(m.dx<-w*.2||vel<-.45)i++;else if(m.dx>w*.2||vel>.45)i--;cvGo(m.z,i);if(S.cv[m.z]===cur)cvGo(m.z,cur)}
document.addEventListener('pointerup',cvEnd);document.addEventListener('pointercancel',cvEnd);
document.addEventListener('click',e=>{if(performance.now()-cvNoClick<350&&e.target.closest&&e.target.closest('.mzv[data-cv]')){e.stopPropagation();e.preventDefault()}},true);
document.addEventListener('keydown',e=>{const d=e.target.closest&&e.target.closest('.mzdot');if(!d)return;const z=d.parentNode.dataset.cv,m=CV[z];if(!m)return;
 if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();cvGo(z,(S.cv[z]||0)+(e.key==='ArrowRight'?1:-1),true)}
 else if(e.key==='Home'||e.key==='End'){e.preventDefault();cvGo(z,e.key==='Home'?0:m.ids.length-1,true)}});
// 每次畫完量高度；「⋯」抽屜關掉後焦點回到開它的那顆
let cvSh=null;
{const _r=render;render=function(d){_r(d);cvWatch();
 if(!document.querySelector('.mzv[data-cv]')&&cvSeen.length){cvRO&&cvRO.disconnect();cvSeen=[]}
 const sh=S.sheet&&/^(mz|mine):/.test(S.sheet)?S.sheet.replace(/^mine:/,''):null;
 if(cvSh&&!S.sheet){const w=S.page?'#page':'#view',o=document.querySelector(`${w} .mzs:not([inert]) [data-act=mine][data-id="${cvSh}"],${w} .mzbigc [data-act=mine][data-id="${cvSh}"]`);if(o)o.focus({preventScroll:true})}cvSh=sh}}

/* ---------- 目標頁（色卡裡的） ---------- */
const gtag=g=>g.short.split(' ')[0];
function gStat(g){return g.st==='late'?`<span class="cvst bad">▲ ${esc(g.stText)}</span>`:g.st==='stall'?`<span class="cvst stall"><span aria-hidden="true">‖ </span>${esc(g.stText)}</span>`:`<span class="cvst">${esc(g.stText)}</span>`}
function gMeterC(g){if(g.kind==='bar')return `<div class="cvbar" aria-hidden="true"><i style="width:${gpct(g.now,g.total)}%"></i>${g.expect?`<u style="left:${gpct(g.expect,g.total)}%"></u>`:''}</div>`;
 return `<div class="cvpip" aria-hidden="true">${Array.from({length:g.total},(_,i)=>`<i class="${i<g.now?'d':''}"></i>`).join('')}</div>`}
function goalSlide(g){return {id:'g:'+g.id,name:'目標・'+gtag(g),html:`<p class="mzhl cvhl"><button class="cvgn" data-act="page" data-id="goal:${g.id}">${esc(g.name)}<span aria-hidden="true"> ›</span></button></p>
 <p class="mzbig cvbig"><b>${g.now}</b><span>／${g.total} ${g.unit}</span><em>${gdue(g)}</em></p>${gMeterC(g)}
 <p class="cvline">${GL.focus===g.id?'<span class="cvst">這週主推</span>':''}${gStat(g)}<span class="vh">，</span><span class="cvnx">下一步：${esc(g.next)}</span></p>
 <p class="mzcmp cvact">${aiF(g.bot,'goal:'+g.id)}<span></span>${mzEd('goal:'+g.id,'改「'+g.name+'」')}</p>`}}
function goalList(gs,who,head){return `<p class="mzhl cvhl">${head}</p><div class="cvgl">${gs.map(g=>`<button class="cvgr" data-act="page" data-id="goal:${g.id}"><span class="cvgt"><b>${esc(g.name)}</b>${g.st==='ok'?'':gStat(g)}</span>${gMeterC(g)}<small>${g.label} ${g.now}／${g.total} ${g.unit}・${gdue(g)}</small></button>`).join('')}</div>
 <p class="mzcmp cvact">${aiF(who,'goals')}<span></span><button class="more cvall" data-act="page" data-id="goals">全部目標 ›</button></p>`}
// 房間的目標頁：3 個以內一個一頁，超過合併成一頁清單（加上第一頁，圓點最多 4 個）
function goalSlides(z){if(S.st!=='ok')return [];const gs=gAll().filter(g=>g.room===z);if(!gs.length)return [];
 if(gs.length<=3)return gs.map(goalSlide);
 return [{id:'gall',name:'目標',html:goalList(gs,'din',`這間的目標 ${gs.length} 個`)}]}

/* ---------- 案子、機會、生活：大卡第一頁照舊，後面接目標 ---------- */
zoneHead=function(z,sum){const b=ZONE[z].b,bot=BOTS[b],st=b==='peng'&&!S.bound?'還沒綁定':FRESH[b];
 const gs=(z==='proj'||z==='opp'||z==='life')?goalSlides(z):[];
 if(!gs.length){delete CV[z];return `<div class="zh zhx" data-z="${z}"><div class="zht"><h1>${ZONE[z].n}</h1><p class="zown">${bot.name}的房間・${st}</p><p class="sum">${sum}</p></div>${bigF(b,z)}</div>`}
 const sl=[{id:'sum',name:'現況',html:`<p class="sum cvsum">${sum}</p>`}].concat(gs),car=cvHTML(z,sl,ZONE[z].n+'的現況與目標');
 return `<div class="zh zhx mz cvh" data-z="${z}"><div class="zht"><h1>${ZONE[z].n}</h1><p class="zown">${bot.name}的房間・${st}・<span class="mzk">${CV[z].names[S.cv[z]]}</span></p></div>${bigF(b,z)}${car}</div>`};

/* ---------- 錢：金金說、撐多久、這三個月，後面加「目標」 ---------- */
function mzSlideG(){const a=gAll().filter(g=>g.room==='money');return goalList(a,'kim',`目標 ${a.length} 個・金金盯`)}
mz2HTML=function(){const a=mzSim(false),b=mzSim(true),id=cvCur('money')||'C';
 if(id==='B')return mzMonths(b)+mzKim();
 if(id==='C')return mzDecs()+`<div class="sec">${mzCalc(a,b)}</div>`;
 if(id==='G')return mzKim();
 return `<div class="sec mzfirst">${mzCalc(a,b)}</div>`+mzKim()};
function mzOn(i,prev){const z=document.getElementById('mz2');if(!z)return;z.innerHTML=mz2HTML();
 if(!RM){z.classList.remove('mzin','mzl','mzr');void z.offsetWidth;z.classList.add('mzin',i>prev?'mzl':'mzr')}}
mzHero=function(){const a=mzSim(false),b=mzSim(true),st=S.st==='ok'||S.st==='empty'||S.st==='offline'?MZ.cashAt:FRESH.tata;
 const sl=[{id:'C',name:'金金說',html:mzSlideC(a)},{id:'A',name:'撐多久',html:mzSlideA(a,b)},{id:'B',name:'這三個月',html:mzSlideB(a,b)}];
 if(S.st==='ok'&&gAll().some(g=>g.room==='money'))sl.push({id:'G',name:'目標',html:mzSlideG()});
 const car=cvHTML('money',sl,'錢的看法與目標',mzOn);
 return `<div class="zh zhx mz" data-z="money"><div class="zht"><h1>錢</h1><p class="zown">塔塔 ${st}・<span class="mzk">${CV.money.names[S.cv.money]}</span></p></div>${bigF('tata','money')}${car}</div>`};
zoneMoney=function(){return mzHero()+`<div id="mz2">${mz2HTML()}</div>`+mzIn()+mzOut()+mzPay()};
ACT.mzgo=id=>cvGo('money',+id);   // 舊的叫法留著
Object.defineProperty(S,'mz',{get(){return S.cv.money||0},set(v){S.cv.money=v},configurable:true});

/* ---------- 從單一目標「到房間看」：回到房間時色卡直接翻到那個目標 ---------- */
function cvFromGoal(room){const a=(S.page||'').split(':');if(a[0]!=='goal')return;const g=gOf(a[1]);if(!g||g.room!==room)return;
 CVP[room]=room==='money'?'G':(gAll().filter(x=>x.room===room).length>3?'gall':'g:'+g.id)}
{const _p=ACT.page;ACT.page=function(id){if(typeof id==='string'&&id.indexOf('zone:')===0)cvFromGoal(id.slice(5));return _p.apply(this,arguments)}}
{const _t=ACT.tab;ACT.tab=function(id){cvFromGoal(id);return _t.apply(this,arguments)}}
window.__cv=()=>Object.keys(CV).reduce((o,z)=>(o[z]={i:S.cv[z]||0,ids:CV[z].ids.slice(),cur:cvCur(z)},o),{});
// 走查用：改示意目標再重畫（只給檢查腳本）
window.__gtest=(fn)=>{fn(GL,GSEED);render('keep')};

/* ---------- 1122-L 目標收尾（2026-11-22） ----------
   監工：「目標只有一份正本在目標頁，其他地方都只是入口」，老大：「好吧，照你說的」。
   老大：「然後我在考慮目標頁 除了金金 其他是不是都讓定定處理 還是說各頁有各頁的人負責」，監工建議後老大：「嗯」。
   目標頁（整頁與單一目標）只跟定定談，錢的目標跟金金談；看法卡按「照這個做」後交給目標所屬房間的主人：
   劇本、劇組＝大器，補助＝集集，運動＝朋朋，錢＝塔塔（撥款、對帳是塔塔在做）。卡上只留一行小字「已交給集集」。
   房間色卡的目標頁照舊是房間主人的臉（在房間裡就是找房間主人）。 */
GQ.din.goal=['這個目標怎麼推','先放掉可以嗎'];
GQ.kim.goal=['這個目標怎麼推','照這速度什麼時候到','每月多存 5 千會怎樣','先動用一點可以嗎'];
GV['goal:move']={adv:'照現在的節奏，今天動一次就滿',why:'已經連 4 週達標，不用加量，守住就好。',risk:'週末容易斷，朋朋週六早上提醒一次。'};
const KV={'goal:fund':{adv:'每月照存 2 萬，發薪日自動撥',why:'空窗期才是預備金的用途，自動撥才不會被這個月的花費吃掉。',risk:'接案少的月份撥不出來，那個月先撥 1 萬，下個月補。'},
 'goal:gear':{adv:'下個尾款進來先撥 2 萬，之後每月 1 萬',why:'照現在每月 1 萬會晚一個月，先補一筆就趕得上 6/30。',risk:'尾款晚到就會晚，塔塔收到款當天撥。'},
 'goal:tax':{adv:'每月照留 7 千，3 月存滿就停',why:'提早存滿，4、5 月現金比較鬆，報稅那個月不用挖預備金。',risk:'今年收入比去年高的話稅會多，3 月塔塔對完帳再看要不要補。'}};
{const _an=answer;answer=function(b,text,ctx){const a=(ctx||'').split(':');
 if(b==='kim'&&a[0]==='goal'&&/怎麼推/.test(text)){const v=KV[ctx]||{adv:'照現在的速度存，每月對一次帳',why:'錢的目標靠的是固定撥，不是一次衝。',risk:'哪個月撥不出來，先撥一半，下個月補。'};
  const m={w:'bot',k:'din',by:'kim',ctx,v,mid:'v'+(++seq)};DV[m.mid]=m;return m}
 return _an(b,text,ctx)}}
{const _h=dinHTML;dinHTML=function(m){const a=(m.ctx||'').split(':');if(a[0]!=='goals'&&a[0]!=='goal')return _h(m);
 const v=m.v,g=a[0]==='goal'?gOf(a[1]):gOf('grant'),ow=m.handed||gOwner(g);
 return `<b>${m.by==='kim'?'金金':'定定'}的看法</b><dl class="kvs"><dt>建議</dt><dd><b>${esc(v.adv)}</b></dd><dt>理由</dt><dd>${esc(v.why)}</dd><dt>風險</dt><dd>${esc(v.risk)}</dd></dl>${m.used?`<p class="ghand gdone" role="status">已交給${BOTS[ow].name}</p>`:`<div class="btns"><button class="btn pri wide" data-act="dinapply" data-id="${m.mid}">照這個做</button></div>`}`}}
{const _d=ACT.dinapply;ACT.dinapply=function(mid){const m=DV[mid];if(!m||m.used)return _d.apply(this,arguments);const a=(m.ctx||'').split(':');
 if(a[0]!=='goals'&&a[0]!=='goal')return _d.apply(this,arguments);
 const v=m.v,pf=GL.focus,g=a[0]==='goal'?gOf(a[1]):gOf('grant'),ow=gOwner(g),nm=BOTS[ow].name,on=g&&g.next,oh=g&&g.hand;
 const j={id:'d'+(++seq),bot:ow,who:ow==='daqi'?'大器（Claude）':nm,title:v.adv,st:'進行中',ago:'剛剛'};
 m.used=1;m.handed=ow;if(a[0]==='goals')GL.focus='grant';if(g){g.next=v.adv+'。';g.hand=ow}
 DB.jobs.unshift(j);const ch=CH[ow]||(CH[ow]=[]),n0=ch.length;ch.push({w:'me',t:`照${m.by==='kim'?'金金':'定定'}的看法做：${v.adv}`},{w:'bot',t:'收到，這是我的下一步了。做完回在這裡。'});
 render('keep');toast(`已交給${nm}：${v.adv}`,()=>{m.used=0;delete m.handed;GL.focus=pf;if(g){g.next=on;g.hand=oh}DB.jobs=DB.jobs.filter(x=>x!==j);ch.splice(n0,2);render('keep')})}}
window.__hand=()=>GL.list.reduce((o,g)=>(g.hand&&(o[g.id]=g.hand),o),{});


/* ---------- 1122-M 首頁：拍板帶改透明玻璃可滑、目標條改成白色目標卡（2026-11-22） ----------
   老大 2026-11-22：「等我拍版那邊底色換一個，或可能透明，一樣可以左右滑看我其他要拍版的內容
   然後首頁也有一個白色卡片是目標頁面，比照其他房間，但是他寬跟現在目標頁一樣寬（窄度可能也可以跟現在一樣，定定一樣可以反黑，一樣可以左右滑，點入就進入目標房間）這樣如何？」
   監工代決：拍板帶＝半透明深色玻璃、白字、推薦鈕白底黑字；一件一頁，沿用 cvHTML／cvGo；超過 4 件圓點換成「2／5」加左右鍵；拍掉一件滑到下一件。
   目標卡＝定定色（白）整列寬，定定大反黑臉被裁切；一個目標一頁，錢的目標頁放金金小臉；點卡進目標頁（頁首改成房間大卡「目標・定定的房間」）。 */

// 超過 4 頁：圓點換成「第幾／共幾」與左右鍵
const CVN={};
function cvWrap(z,sl,label,on){const n=sl.length;let h=cvHTML(z,sl,label,n>4?(i,p)=>{cvCnt(z);on&&on(i,p)}:on);
 if(n>4){const i=S.cv[z]||0;h=h.replace(/<div class="mzdots" data-cv="[^"]*">[\s\S]*?<\/div>$/,`<div class="cvcnt" data-cv="${z}"><button class="cvar" data-act="cvstep" data-id="${z}:-1" aria-label="上一個"${i?'':' disabled'}><span aria-hidden="true">‹</span></button><span class="cvn" aria-live="polite"><span class="num">${i+1}</span>／${n}</span><button class="cvar" data-act="cvstep" data-id="${z}:1" aria-label="下一個"${i<n-1?'':' disabled'}><span aria-hidden="true">›</span></button></div>`)}
 return h}
function cvCnt(z){const m=CV[z],c=document.querySelector(`${S.page?'#page':'#view'} .cvcnt[data-cv="${z}"]`);if(!m||!c)return;const i=S.cv[z]||0,n=m.ids.length,b=c.querySelectorAll('.cvar');
 c.querySelector('.cvn .num').textContent=i+1;b[0].disabled=!i;b[1].disabled=i>=n-1}
ACT.cvstep=id=>{const j=id.lastIndexOf(':'),z=id.slice(0,j);cvGo(z,(S.cv[z]||0)+(+id.slice(j+1)));cvCnt(z)};

/* 拍板：一件一頁 */
function decSlide(d,n){const rec=d.kind==='talk'?null:(d.opts.find(o=>o.rec)||d.opts[0]);
 return {id:d.id,name:d.proj,html:`<div class="dslide" data-card="${esc(d.id)}">${mineB('dec:'+d.id,'這件拍板')}<div class="bandtop"><span class="lbl who">${aiF('daqi','dec:'+d.id)}<span class="dproj">${esc(d.proj)}</span></span><span class="lbl">${esc(d.ago)}</span></div><h2 class="dq" data-act="decmore" data-id="${esc(d.id)}">${esc(String(d.q||'').replace(/\s*([\u2460-\u2469])/g,'\n$1').trim())}</h2>${rec?`<div class="btns"><button class="btn pri big" data-act="pick" data-id="${esc(d.id)}" data-k="${esc(rec.k)}"><span>${esc(rec.label)}</span><small>${rec.note?'推薦・'+esc(rec.note):'推薦'}</small></button></div>`:decActs(d)}${aifs([dinB('dec:'+d.id)])}</div>`}}
ACT.decmore=id=>{const e=document.querySelector(`.dslide[data-card="${CSS.escape(id)}"] .dq`);if(e){e.classList.toggle('open');const v=e.closest('.mzv');if(v)try{cvFit(v)}catch(_){}}};
function decBand(){const d=decs();if(!d.length)return null;const prev=CV.dec&&CV.dec.ids,gone=prev&&prev.length>d.length;
 const car=cvWrap('dec',d.map(x=>decSlide(x,d.length)),'等你拍板的事');
 return `<section class="band dglass" id="secDec">${gone&&!RM?car.replace('class="mzv"','class="mzv cvin"'):car}</section>`}
// 拍板帶：從原本 homeL2 的輸出把舊的帶子換掉
{const _h=homeL2;homeL2=function(){let h=_h();const b=decBand();if(!b)return h;
 const i=h.indexOf('<section class="band cardx" id="secDec"');if(i<0)return h;const j=h.indexOf('</section>',i);return h.slice(0,i)+b+h.slice(j+10)}}

/* 目標卡：白色、整列寬、定定大反黑臉、一個目標一頁 */
const gSpan=s=>s.replace(/<div /g,'<span ').replace(/<\/div>/g,'</span>');
function goalCardSlide(g){const mon=g.room==='money';
 return {id:'g:'+g.id,name:g.name,html:`<button class="ggo" data-act="page" data-id="goals"><span class="vh">打開目標，</span><span class="ggn">${mon?bm('kim','z','gk'):''}<b>${esc(g.name)}</b></span>${gSpan(gMeterC(g))}<span class="ggs">${GL.focus===g.id?'<span class="cvst">這週主推</span>':''}${gStat(g)}<span class="ggx"><span class="num">${g.now}／${g.total} ${g.unit}</span>・${gdue(g)}</span></span><span class="ggnx">下一步：${esc(g.next)}</span></button>`}}
function goalCard(){if(S.st==='loading'||S.st==='error')return '';const a=gAll(),m=gsum();
 if(!a.length){delete CV.goal;return `<div class="room groomh" data-z="goal"><button class="rgo" data-act="page" data-id="goals"><span class="rh">目標</span><span class="rs">還沒立目標</span></button>${bigF('din','goal')}</div>`}
 const car=cvWrap('goal',a.map(goalCardSlide),'目標');
 return `<div class="room groomh" data-z="goal"><button class="gtopb" data-act="page" data-id="goals"><span class="rh">目標</span><span class="gsm">${esc(m.t)}</span></button>${car}${bigF('din','goal')}</div>`}
goalStrip=goalCard;

/* 目標頁頁首：跟其他房間一樣的大卡 */
{const _g=goalsPage;goalsPage=function(){const h=_g();if(S.st==='loading'||S.st==='error')return h;const a=gAll(),m=gsum();
 return h.replace('<h1 class="pt">目標</h1>',`<div class="zh zhx" data-z="goal"><div class="zht"><h1>目標</h1><p class="zown">定定的房間</p><p class="sum">${a.length?esc(m.t):'還沒立目標'}</p></div>${bigF('din','goal')}</div>`)}}
window.__zl={DB,GL,S,render:d=>render(d)};

/* ---------- 1122-N 新增行程改成一句話輸入（2026-11-22，大器 Opus 5.5，好咖 CLI 派工） ----------
   老大 2026-11-22：「差不多很漂亮 只差那個新增行事曆的部分 這些詳細的內容當然可以保留，但我我希望可以就是我口語隨便說大器也知道怎麼寫 所以應該是在標題列那邊我直接輸入就好，對吧？」
   浮窗最上面只放一個大輸入框，打口語，按「整理」（或 Enter）→ 右上大器的臉「整理中」→ 填進下面的欄位、顯示預判句。
   原本的詳細欄位全部保留，收在「細節」裡（預設收起）。主按鈕寫結果：「加到 公司＋個人」。
   解析是示意規則（今天／明天／後天／週幾／幾月幾號、上午下午幾點、在○○、跟○○、案名關鍵字），正式版交給大器本人。
   由 _暫存/一句話行程.py 嵌進 v3 主程式（同一個作用域），放在 render 之前。 */

const NLN={'零':0,'一':1,'二':2,'兩':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'十一':11,'十二':12};
const nlNum=s=>/^\d+$/.test(s)?+s:NLN[s]!=null?NLN[s]:/^十[一二]$/.test(s)?10+NLN[s[1]]:null;
const NLWK={'日':0,'天':0,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6};
const NLPROJ=[[/木星|TAPIN/i,'木星'],[/品牌短片/,'品牌短片'],[/牧星|牧昕/,'牧星'],[/好咖/,'好咖'],[/新歌/,'新歌 demo']];
const nlP2=n=>String(n).padStart(2,'0');
const addH=(t,h)=>{const [a,b]=t.split(':').map(Number);const m=Math.min(23*60+59,a*60+b+h*60);return nlP2(Math.floor(m/60))+':'+nlP2(m%60)};

/* 一句話 → 欄位。回傳 {title,n,s,e,all,place,who,cs,miss:[...],hit:{...}} */
function nlParse(raw){let t=(raw||'').trim().replace(/\s+/g,' ');const r={raw:t,miss:[],hit:{}};let rest=t;
 const cut=re=>{const m=re.exec(rest);if(m)rest=rest.replace(m[0],' ');return m};
 // 日期
 let m;
 if((m=cut(/大後天/)))r.n=3;else if((m=cut(/後天/)))r.n=2;else if((m=cut(/明天|明早|明晚|明日/)))r.n=1;else if((m=cut(/今天|今晚|今早|今日|等一下|待會/)))r.n=0;
 else if((m=cut(/(下下?)(?:週|周|禮拜|星期)([一二三四五六日天])/))){const w=NLWK[m[2]],base=w===0?7:w;r.n=base+(m[1]==='下下'?7:0)}
 else if((m=cut(/(?:這|本)?(?:週|周|禮拜|星期)([一二三四五六日天])/))){const w=NLWK[m[1]];r.n=w===0?7:w}
 else if((m=cut(/(\d{1,2})\s*[\/月]\s*(\d{1,2})\s*[日號]?/))){const v=nOfIso(`2026-${nlP2(+m[1])}-${nlP2(+m[2])}`);r.n=v}
 else if((m=cut(/(\d{1,2})\s*號/))){const d=+m[1];r.n=d>=22?d-22:d+8}
 if(r.n==null||r.n<0||r.n>40){r.n=null;r.miss.push('date')}
 // 時間：時段＋幾點（＋半／幾分），可帶「到幾點」
 const TS='(早上|上午|中午|下午|晚上|傍晚|凌晨|今晚|明晚)?\\s*';
 const HN='(\\d{1,2}|十[一二]?|[一二兩三四五六七八九])';
 const tre=new RegExp(TS+HN+'\\s*(?:點|:|：|時)\\s*(半|\\d{1,2})?\\s*分?(?:\\s*(?:到|至|～|~|-)\\s*'+TS+HN+'\\s*(?:點|:|：)?\\s*(半|\\d{1,2})?\\s*分?)?');
 const hr=(ap,h,mi,ref)=>{h=nlNum(h);if(h==null)return null;mi=mi==='半'?30:mi?+mi:0;ap=ap||ref||'';
  if(/下午|晚上|傍晚|今晚|明晚/.test(ap)&&h<12)h+=12;else if(/中午/.test(ap)&&h<5)h+=12;else if(!ap&&h>=1&&h<=7)h+=12;
  return h>23||mi>59?null:nlP2(h)+':'+nlP2(mi)};
 if((m=cut(tre))){r.s=hr(m[1],m[2],m[3]);if(m[5])r.e=hr(m[4],m[5],m[6],m[1]&&!m[4]?m[1]:'');if(r.e&&r.s&&r.e<=r.s)r.e=null}
 else if((m=cut(/中午/))){r.s='12:00'}
 if(!r.s){r.miss.push('time');r.all=1}else r.all=0;
 // 地點：在○○ / 到○○ / @○○ / 線上
 if((m=cut(/(?:在|@|＠)\s*([^，,。、\s]+?)(?=開會|開|跟|和|討論|見面|吃飯|剪片|剪接|[，,。、\s]|$)/))){r.place=m[1]}
 else if((m=cut(/線上|視訊|Google ?Meet|Meet/i))){r.place='Google Meet'}
 if(r.place&&/^(線上|視訊)$/.test(r.place))r.place='Google Meet';
 if(!r.place)r.miss.push('place');
 // 參加者：跟○○ / 和○○
 if((m=cut(/(?:跟|和|與)\s*([^，,。、\s]+?)(?=一起|開|討論|見面|見|吃|喝|聊|對|做|去|在|[，,。、\s]|$)/))){r.who=m[1]}
 // 案名
 for(const [re,nm] of NLPROJ){if(re.test(t)){r.cs=nm;break}}
 // 標題：剩下的字
 let ti=rest.replace(/[，,。、！!？?]/g,' ').replace(/\s+/g,' ').trim().replace(/^(要|去|來|得|會|再|先|記得|幫我|排|加)+/,'').replace(/^開/,'').replace(/(一下|一起)$/,'').trim();
 if(/會$/.test(ti)&&!/會議$|聚會$|約會$|音樂會$|演唱會$/.test(ti))ti+='議';
 if(r.who&&/^(會議|吃飯|聚餐|見面|喝咖啡|吃晚餐|吃午餐|討論)$/.test(ti))ti=r.who+ti;
 if(!ti||ti.length<2){if(r.who)ti='跟'+r.who+'見面';else{ti='';r.miss.push('title')}}
 if(r.who&&r.cs&&r.who.indexOf(r.cs)>-1&&ti.indexOf(r.cs)<0)r.meTitle=r.cs+ti;
 r.title=ti;return r}

/* 浮窗 */
const NLMISS={date:'哪天',time:'幾點',place:'地點',title:'標題'};
const nlHintT=k=>k==='date'||k==='time'?'沒抓到，補一下':'大器沒抓到，補一下';
const nlHint=k=>S.nl&&S.nl.p&&S.nl.p.miss.indexOf(k)>-1?`<small class="nlm" id="nlm_${k}">${nlHintT(k)}</small>`:'';
function nlFaceHTML(){const st=S.nl&&S.nl.busy?'thinking':'idle',lab=S.nl&&S.nl.busy?'整理中':S.nl&&S.nl.p?'整理好了':'';
 return `<span class="nlface" id="nlFace">${bm('daqi',st)}<small id="nlFaceLab" aria-live="polite">${lab}</small></span>`}
function calNew(){S.cfMan=0;S.nl=S.nl||{};const P=S.nl.p||{},v=x=>x?esc(x):'';
 return `<div class="grab" aria-hidden="true"></div><div class="shead nlhead"><h2 id="sTitle">新增行程</h2>${nlFaceHTML()}${B('關閉 ✕','close',null,'ghost',' id="sClose"')}</div>
 <label class="vh" for="nlT">用一句話說這筆行程</label>
 <div class="nlbox"><textarea id="nlT" rows="2" enterkeyhint="done" autocomplete="off" placeholder="明天下午三點跟木星開剪接會，在公司">${v(S.nl.txt)}</textarea>
 <button class="btn nlgo" data-act="nlgo" id="nlGo" aria-label="交給大器整理這句">整理</button></div>
 <p class="nlex">隨便講，大器會拆成時間、地點、放哪邊。</p>
 <div class="pred nlpred" id="cfPred" aria-live="polite"${S.nl.p?'':' hidden'}></div>
 <p class="err" id="cfErr" role="alert" hidden>▲ 先打一句話，再交給大器。</p>
 <details class="nldet" id="nlDet"${S.nl.open?' open':''}><summary>細節<small>標題、時間、地點、放哪邊</small></summary>
 <label class="f">標題${nlHint('title')}<input id="cfT" type="text" value="${v(P.title)}" placeholder="例：品牌短片交片給客戶" autocomplete="off"></label>
 <div class="two"><label class="f">日期${nlHint('date')}<input id="cfD" type="date" value="${isoOf(P.n!=null?P.n:1)}" min="2026-11-22"></label><label class="f">開始${nlHint('time')}<input id="cfS" type="time" value="${P.s||'10:00'}"></label><label class="f">結束<input id="cfE" type="time" value="${P.s?(P.e||addH(P.s,1)):'11:00'}"></label></div>
 <label class="nlall"><input type="checkbox" id="cfAll"${P.all?' checked':''}> 全天（沒說幾點就先放全天）</label>
 <label class="f">地點${nlHint('place')}<input id="cfP" type="text" value="${v(P.place)}" placeholder="例：公司會議室、Google Meet" autocomplete="off"></label><label class="f">參加者<input id="cfW" type="text" value="${v(P.who)}" placeholder="例：客戶、攝影師" autocomplete="off"></label>
 <label class="f">備註<textarea id="cfN" rows="2" placeholder="例：私人案、客戶要看 Acopy">${v(S.nl.txt?'原句：'+S.nl.txt:'')}</textarea></label>
 <p class="h4">要改放哪邊</p><div class="chk"><label><input type="checkbox" id="cfCo"> 公司</label><label><input type="checkbox" id="cfMe" checked> 個人</label>
 <label>分類 <select id="cfCat"><option value="">待補</option>${Object.keys(CAT).map(k=>`<option value="${k}">${k} ${CAT[k][0]}</option>`).join('')}</select></label>
 <label>個人提前 <select id="cfLead">${[0,1,2,3].map(n=>`<option value="${n}">${n} 天</option>`).join('')}</select></label></div>
 <div class="mrow">${mb('規則 ›','sheet','calrules')}</div></details>
 <div class="btns">${B(S.nl.p?'加到行事曆':'整理這句','calmk',null,'pri wide',' id="nlMk"')}</div>`}

// 公司標題用案名短稱、個人標題可帶案名
const nlCs=G=>(S.nl&&S.nl.p&&S.nl.p.cs)||G.cs;
const nlMeTitle=f=>{const P=S.nl&&S.nl.p;return P&&P.meTitle&&f.title===P.title?P.meTitle:f.title};
function nlTo(c){return [c.co?'公司':'',c.me?'個人':''].filter(Boolean).join('＋')}
function nlSync(auto){const f=readForm(),G=guess(f),all=!!($('#cfAll')||{}).checked;
 if(auto&&!S.cfMan){const g=id=>$('#'+id);if(g('cfCo'))g('cfCo').checked=G.co||G.hold;if(g('cfMe'))g('cfMe').checked=G.me;if(g('cfCat'))g('cfCat').value=G.cat;if(g('cfLead'))g('cfLead').value=String(G.lead)}
 const c=ctlOf(),p=$('#cfPred'),mk=$('#nlMk');
 if(mk&&S.nl&&S.nl.p)mk.textContent=!f.title?'先補標題':!c.co&&!c.me?'兩邊都沒勾':'加到 '+nlTo(c);
 if(!p||!S.nl||!S.nl.p)return;p.hidden=false;
 if(!f.title){p.innerHTML='<b>大器沒抓到這是什麼事，打開細節補一下標題。</b>';return}
 const cs=nlCs(G),parts=[];
 if(c.co)parts.push(G.hold?'公司「Borry 有事」（不寫內容）':`公司【${cs||'案名待補'}】${f.title} @Borry`);
 if(c.me)parts.push(`個人 ${c.cat?c.cat+'.':''}${nlMeTitle(f)}${c.cat?'':'（分類碼之後補）'}`);
 const when=f.n!=null?dlw(f.n)+(all?'　全天':'　'+f.s+'～'+f.e):'';
 const meta=[when,f.place,f.who?'跟'+f.who:''].filter(Boolean).join('・');
 const lead=c.me&&c.lead&&f.n!=null?`<p class="ttl">個人那筆提前 ${c.lead} 天，放 ${dlw(Math.max(0,f.n-c.lead))}。</p>`:'';
 const miss=S.nl.p.miss.filter(k=>k!=='title'||!f.title).filter(k=>!(k==='time'&&!all)&&!(k==='date'&&S.nl.fix&&S.nl.fix.date)&&!(k==='place'&&f.place));
 const mh=miss.length?`<button class="nlmiss" data-act="nlfix" data-id="${miss[0]}">大器沒抓到：${miss.map(k=>NLMISS[k]).join('、')}，補一下 ›</button>`:'';
 p.innerHTML=parts.length?`<b>會放到：${parts.map(esc).join('<br>＋ ')}</b><p class="ttl">${esc(meta)}${all&&S.nl.p.miss.indexOf('time')>-1?'・沒說幾點，先放全天':''}</p>${lead}${mh}`:`<b>兩邊都沒勾，這筆不會放上行事曆。</b>${mh}`}
// 舊的 predSync 也改走新的預判句（細節裡的欄位一改就跟著變）
predSync=function(auto){nlSync(auto)};

function nlFace(busy){S.nl.busy=busy;const w=$('#nlFace');if(!w)return;const el=w.querySelector('.bm');if(el)el.dataset.m=busy?'thinking':'idle';$('#nlFaceLab').textContent=busy?'整理中':'整理好了';if(window.__faceSync)window.__faceSync()}
function nlFill(P){const g=id=>$('#'+id),set=(id,v)=>{const e=g(id);if(e)e.value=v};
 set('cfT',P.title||'');if(P.n!=null)set('cfD',isoOf(P.n));if(P.s){set('cfS',P.s);set('cfE',P.e||addH(P.s,1))}else{set('cfS','10:00');set('cfE','11:00')}
 const a=g('cfAll');if(a)a.checked=!!P.all;set('cfP',P.place||'');set('cfW',P.who||'');set('cfN','原句：'+P.raw);
 ['title','date','time','place'].forEach(k=>{const lab={title:'cfT',date:'cfD',time:'cfS',place:'cfP'}[k],inp=g(lab);if(!inp)return;const L=inp.closest('label');let h=L.querySelector('.nlm');
  if(P.miss.indexOf(k)>-1){if(!h){h=document.createElement('small');h.className='nlm';h.id='nlm_'+k;h.textContent=nlHintT(k);L.insertBefore(h,inp)}}else if(h)h.remove()});
 S.cfMan=0;S.nl.fix={};nlSync(true)}
let nlT=0;
ACT.nlgo=()=>{const t=$('#nlT'),txt=t?t.value.trim():'';if(!txt){const x=$('#cfErr');if(x)x.hidden=false;if(t)t.focus();return}
 if(S.nl.busy)return;S.nl.txt=txt;const x=$('#cfErr');if(x)x.hidden=true;nlFace(true);const mk=$('#nlMk');if(mk){mk.disabled=true;mk.textContent='大器整理中…'}
 clearTimeout(nlT);nlT=setTimeout(()=>{const P=nlParse(txt);S.nl.p=P;nlFace(false);if(mk)mk.disabled=false;nlFill(P);
  const p=$('#cfPred');if(p)p.hidden=false},RM?150:900)};
ACT.nlfix=k=>{const d=$('#nlDet');if(d)d.open=true;S.nl.open=1;const id={title:'cfT',date:'cfD',time:'cfS',place:'cfP'}[k]||'cfT';const e=$('#'+id);if(e){e.scrollIntoView({block:'center'});e.focus()}};
document.addEventListener('toggle',e=>{if(e.target&&e.target.id==='nlDet'&&S.nl)S.nl.open=e.target.open?1:0},true);
document.addEventListener('keydown',e=>{if(e.target&&e.target.id==='nlT'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();ACT.nlgo()}});
document.addEventListener('input',e=>{const id=e.target.id||'';
 if(id==='nlT'&&S.nl&&S.nl.p&&e.target.value.trim()!==S.nl.txt){const mk=$('#nlMk');if(mk)mk.textContent='整理這句'}
 if(id==='cfS'||id==='cfE'){const a=$('#cfAll');if(a&&a.checked){a.checked=false}}
 if(id==='cfD'&&S.nl){S.nl.fix=S.nl.fix||{};S.nl.fix.date=1}
 if(/^cf[TDSEP]$/.test(id)){const k={cfT:'title',cfD:'date',cfS:'time',cfP:'place'}[id],h=k&&$('#nlm_'+k);if(h&&e.target.value)h.remove()}},true);
document.addEventListener('change',e=>{const id=e.target.id||'';if(id==='cfAll'||id==='cfS'||id==='cfE'||id==='cfD')nlSync(true)});
// 開浮窗時清空上一筆
{const _s=ACT.sheet;ACT.sheet=function(id){if(id==='calnew')S.nl={};return _s.apply(this,arguments)}}

/* 建立：句子還沒整理就先整理；整理過才建立。個人標題可帶案名、沒說幾點放全天 */
ACT.calmk=()=>{const t=$('#nlT'),txt=t?t.value.trim():'';
 if(!S.nl||!S.nl.p||txt!==S.nl.txt){if(txt){ACT.nlgo();return}const ft=$('#cfT');if(!ft||!ft.value.trim()){const x=$('#cfErr');if(x)x.hidden=false;if(t)t.focus();return}}
 const f=readForm(),c=ctlOf(),G=guess(f),all=!!($('#cfAll')||{}).checked;
 if(!f.title){ACT.nlfix('title');return}
 if(f.n==null||f.n<0){toast('日期要選今天以後');return}if(!c.co&&!c.me){toast('兩邊都沒勾，先勾一邊');return}
 const to=nlTo(c),made=[],sq=++seq,cs=nlCs(G),tm=all?{t:'',e:'',all:1}:{t:f.s,e:f.e};
 if(c.co)made.push(Object.assign({id:'n'+sq+'co',d:f.n,n:G.hold?'Borry 有事':f.title,src:'co',cs,hold:G.hold?1:0,place:G.hold?'':f.place,who:G.hold?'':f.who,why:'你建立的',mk:'run',mkTo:to,pair:c.me?1:0},tm));
 if(c.me)made.push(Object.assign({id:'n'+sq+'me',d:Math.max(0,f.n-c.lead),n:nlMeTitle(f),src:'me',cat:c.cat,place:f.place,who:f.who,mk:'run',mkTo:to,pair:c.co?1:0},tm));
 closeThen(()=>{CAL.push(...made);if(S.page!=='cal')ACT.page('cal');else render('keep');
  setTimeout(()=>{made.forEach(m=>m.mk='ok');render('keep');toast(`已加到 ${to}`,()=>{made.forEach(m=>{const i=CAL.indexOf(m);if(i>-1)CAL.splice(i,1)});render('keep')})},RM?300:1400)})};

/* 首頁「今天行程」也有新增入口 */
{const _t=todayStrip;todayStrip=function(){const h=_t();if(!h)return h;const i=h.lastIndexOf('</section>');return i<0?h:h.slice(0,i)+`<div class="mrow tdnew">${mb('＋ 新增行程','sheet','calnew')}</div>`+h.slice(i)}}
window.__nlParse=nlParse;window.__nl=()=>({page:S.page,sheet:S.sheet,miss:S.nl&&S.nl.p?S.nl.p.miss:null,raw:CAL.filter(e=>e.id&&e.id[0]==="n").map(e=>({n:e.n,raw:rawTitle(e),mk:e.mk}))});


/* ================= v35 真資料層（2026-11-22，大器 Opus 5.5 好咖 CLI 派工） =================
   版面、互動全照設計稿 v3（版面 2 四個房間 × 暮光色塊）；這一段只做三件事：
   1. 清掉設計稿的示意資料，改從 js/adapter.js（hub_today、opp_*、hub_money_subs、opp_msg_*、掃描）讀真資料。
   2. 會寫回去的動作（拍板、暫存、刪掉、救回、交件收款、去執行、掃描、跟大器說）改呼叫 adapter。
   3. 沒有後端的區塊（行程、目標、錢的撐多久與週報、帳單付款、購物、例行備品、其他 Bot 對話）
      照設計稿留位置，顯示「還沒接上」，不放假資料。
   所有字串進畫面一律經 esc()；連結只收 http(s)。 */
['dec','jobs','events','beats','proj','todo','arch','opp','subs','rout','sup','deleted','wish','orders','bills','due'].forEach(k=>{DB[k]=[]});
CAL.length=0;GL.list=[];GL.focus=null;MZ.recv=[];MZ.big=[];MZ.dec=[];Object.keys(DT).forEach(k=>{delete DT[k]});
['kim','mon','din','jiji','tata','peng','daqi'].forEach(b=>{CH[b]=[]});
S.layout=2;S.skin=6;S.st='loading';S.bound=true;   // bound=true 只為了讓生活房間標頭顯示 FRESH.peng（還沒接上），綁定流程沒有後端、畫面不出現
const LV={api:null,A:null,mode:'',items:[],hub:null,money:null,moneyErr:'',scan:{},at:0,net:'loading',nokey:false,forced:false,hist:{},arch:[],thread:'',sig:'',dirty:false};
const LMD=t=>{const d=new Date(t);return (d.getMonth()+1)+'/'+d.getDate()};
const LHM=t=>{const d=new Date(t);return d.getHours()+':'+String(d.getMinutes()).padStart(2,'0')};
const LAGO=t=>{if(!t)return '';const m=Math.round((Date.now()-t)/60000);if(m<1)return '剛剛';if(m<60)return m+' 分鐘前';const h=Math.round(m/60);if(h<24)return h+' 小時前';const d=Math.round(h/24);return d<7?d+' 天前':LMD(t)};
const LDAYS=t=>t?Math.ceil((t-Date.now())/864e5):null;
const LWEB=u=>/^https?:\/\//i.test(String(u||''))?String(u):'';
const LBOT=s=>/集集|Gig/i.test(s||'')?'jiji':/塔塔|Tal|金金|Kim/i.test(s||'')?'tata':/朋朋|Pom/i.test(s||'')?'peng':'daqi';
const LERR=e=>{const k=e&&e.kind;return {timeout:'連線逾時',network:'連不上伺服器',offline:'目前沒有網路',auth:'金鑰失效，請重新開專屬網址',forbidden:'這把金鑰不能做這件事，只有老大本人的網址可以',state:'狀態不對，重新整理再試'}[k]||(e&&e.message)||'發生錯誤'};
const LNONE=t=>`<p class="note lnone">${esc(t)}</p>`;
const dateTxt=()=>{const d=new Date();return `${d.getMonth()+1} 月 ${d.getDate()} 日　週${WK[d.getDay()]}`};
const greet=()=>{const h=new Date().getHours();return (h<5?'晚安':h<11?'早安':h<18?'午安':'晚安')+'，老大。'};

/* ---------- 真資料 → 設計稿的資料形狀 ---------- */
const BK={personal:'personal',funding:'fund',achievement:'honor',other:'other'};
function mapDec(d){let opts=d.options.map(o=>({k:o.key,label:o.label,note:o.note,rec:o.recommended?1:0}));
 const kind=d.kind==='talk'||!opts.length?'talk':'choice';
 return {id:d.id,proj:d.project||'大器',q:d.question,detail:d.detail,kind,by:d.askedBy||'大器',origin:d.origin||'大器',ago:LAGO(d.createdAt),link:LWEB(d.link),opts}}
const JST={queued:['排隊中',0],running:['進行中',0],waiting_mac:['等 Mac 開機',1],waiting_you:['等你',1],failed:['失敗',1],done:['做完',0]};
function mapJob(j){const s=JST[j.status]||['進行中',0];return {id:j.id,bot:LBOT(j.agent),who:j.agent||'大器',title:j.title||j.project||'工作',st:s[0],wait:!!s[1],ago:LAGO(j.updatedAt)}}
function mapEvt(e){return {at:LAGO(e.at),who:e.actor||'系統',bot:LBOT(e.actor),text:(e.project?e.project+'：':'')+e.summary}}
function mapBeat(b){const ev=b.every?Math.round(b.every/60):0;return {name:b.name,note:b.note||b.machine||'',late:b.late,ago:(b.lastAt?LAGO(b.lastAt):'還沒報到過')+(b.late&&ev?`，該 ${ev>=60?Math.round(ev/60)+' 小時':ev+' 分鐘'}一次`:'')}}
function oppDue(c){const dd=LDAYS(c.deadline),ex=LDAYS(c.expiresAt);
 if(dd!=null)return {days:dd,due:dd<0?'已過截止':dd===0?'今天截止':dd===1?'明天截止':dd+' 天後截止'};
 if(ex!=null&&c.status!=='snoozed')return {days:ex,due:ex<=0?'今天收走':ex+' 天後收走',exp:true};
 return {days:999,due:c.deadlineText||'沒寫截止'}}
function mapOpp(c){const d=oppDue(c);
 return {id:c.id,b:BK[c.basket]||'other',title:c.title||c.shortTitle,org:c.org||c.sourceSite||'',amt:c.amountDisplay||c.amountLabel||'沒寫金額',days:d.days,due:d.due,exp:!!d.exp,
  why:c.why||c.fit||'',facts:c.facts.length?c.facts:c.quick,warn:c.warn,url:LWEB(c.sourceUrl),st:c.status==='snoozed'?'snoozed':'',
  snz:c.snoozeUntil?`${LMD(c.snoozeUntil)} ${LHM(c.snoozeUntil)} 回到清單`:'暫存中',took:c.folderStatus==='done'?1:0,raw:c}}
const nt0=n=>n==null?'':nt(n);
function mapProj(c){const st=c.status,dl=c.deadline||(c.deliveryDate?Date.parse(c.deliveryDate):null),dd=LDAYS(dl);
 let steps=c.progressSteps.map(s=>s.name),cur;
 if(steps.length){const i=c.progressSteps.findIndex(s=>s.status==='current'||s.status==='blocked'||s.status==='pending');cur=i<0?steps.length:i}
 else{steps=['製作','交件','收款'];cur=st==='doing'?0:st==='delivered'?2:3}
 const urg=dd!=null&&dd<=3&&st==='doing';
 const g=st==='delivered'?'delivered':st==='paid'?'paid':(c.progressBlocker||c.runStatus==='failed'||urg)?'need':'doing';
 const due=st==='paid'?(c.paidAt?LMD(c.paidAt)+' 入帳':'已收款'):st==='delivered'?(c.expectedPayDate?`約定 ${c.expectedPayDate.slice(5).replace('-','/')} 前付`:'等收款'):dd!=null?(dd<0?'已過期限':dd===0?'今天要交':`剩 ${dd} 天`):'沒有期限';
 const money=st==='paid'&&c.receivedAmount!=null?'實收 '+nt(c.receivedAmount):st==='delivered'&&c.finalAmount!=null?'待收 '+nt(c.finalAmount):c.quoteAmount!=null?'報價 '+nt(c.quoteAmount):(c.amountDisplay||'沒寫金額');
 return {id:c.id,g,short:c.shortTitle||c.title,title:c.title,next:c.progressNote||c.firstStep||c.why||'還沒寫下一步',steps,cur,due,urg,who:c.progressUpdatedBy||'大器',money,hist:LV.hist[c.id]||[],raw:c}}
const RUNST={queued:'排隊中',running:'進行中',done:'做完了',failed:'失敗'};
function mapTodo(c){return {id:c.id,title:c.title,next:c.progressNote||c.why||'',st:RUNST[c.runStatus]||'還沒開始',run:c.runStatus,raw:c}}
const CLOSE={won:'成交',lost:'沒上',submitted:'已送件',void:'作廢'};
function mapArch(c){return {id:c.id,title:c.title,next:(c.closedAt?LMD(c.closedAt)+' ':'')+'結案',st:CLOSE[c.closeResult]||'結案'}}
function mapSub(s){return {id:s.id,name:s.name,amt:s.amount,mo:s.monthly,cyc:s.cycle==='yearly'?`每年，月均 ${nt(s.monthly)}`:'每月',in:s.days,payer:s.payer==='self'?'自付':'公司付',
  cancel:s.status==='cancel'?(s.cancelBy?`想取消，${s.cancelBy} 前要處理`:'想取消'):'',idle:s.status==='idle',next:s.next,acct:s.account}}

function applyData(){const it=LV.items;
 DB.opp=it.filter(c=>BK[c.basket]&&(c.status==='new'||c.status==='snoozed')).map(mapOpp);
 DB.deleted=it.filter(c=>BK[c.basket]&&(c.status==='dropped'||c.status==='expired')).map(c=>({id:c.id,title:c.title,amt:c.amountDisplay||c.amountLabel||''}));
 DB.proj=it.filter(c=>['doing','delivered','paid'].includes(c.status)).map(mapProj).sort((a,b)=>(a.urg?0:1)-(b.urg?0:1));
 DB.todo=it.filter(c=>c.basket==='todo'&&c.status==='new').map(mapTodo);
 DB.arch=LV.arch.map(mapArch);
 const h=LV.hub||{open:[],jobs:[],events:[],beats:[]};
 DB.dec=h.open.map(mapDec);DB.jobs=h.jobs.filter(j=>j.status!=='done').map(mapJob);DB.events=h.events.map(mapEvt);DB.beats=h.beats.map(mapBeat);
 DB.subs=LV.money?LV.money.items.filter(s=>s.status!=='cancel'||s.cancelBy).map(mapSub).sort((a,b)=>a.in-b.in):[];
 const t=LV.at?LHM(LV.at):'';FRESH.daqi=LV.forced?'示範資料':t?t+' 更新':'讀取中';
 const ls=lastScan();FRESH.jiji=ls?LHM(ls.at)+' 整理':'還沒掃描過';FRESH.tata=LV.money?'訂閱 '+t+' 讀取':'還沒接上帳戶';FRESH.peng='還沒接上';
 const sp=$('#stamp');if(sp)sp.textContent=LV.forced||LV.nokey?'示範資料':t?t+' 更新':'讀取中'}
function lastScan(){let b=null;Object.values(LV.scan||{}).forEach(v=>{if(v&&v.last&&v.last.at&&(!b||v.last.at>b.at))b=v.last});return b}
const scanOpen=()=>Object.values(LV.scan||{}).some(v=>v&&v.open&&v.open.status!=='done');

/* ---------- 讀資料 ---------- */
let LPOLL=0,LBUSY=false;
async function loadAll(first){if(LBUSY)return;LBUSY=true;const api=LV.api;
 try{
  const [l,h,sc]=await Promise.all([api.list(),api.hubToday?api.hubToday():null,api.scanStatus?api.scanStatus().catch(()=>({})):{}]);
  LV.items=l.items;LV.hub=h;LV.scan=sc||{};LV.at=Date.now();LV.net='ok';
  if(api.moneySubs&&!LV.moneyNo){try{LV.money=await api.moneySubs();LV.moneyErr=''}catch(e){LV.money=null;LV.moneyNo=!!(e&&e.kind==='forbidden');LV.moneyErr=LV.moneyNo?'這把金鑰不能看錢的資料，只有老大本人的網址能看':LERR(e);if(e&&e.kind==='auth')throw e}}
  if(first&&api.archive){api.archive('',null).then(r=>{LV.arch=r.items||[];paint()}).catch(()=>{})}
  if(LV.mode==='live')snapSave();
  S.st='ok';S.scan=scanOpen()?1:0;paint(first?'stgroot':'');
  if(first&&S.chat&&S.chat.b==='daqi')loadMsgs();
 }catch(e){
  if(e&&e.kind==='auth'){LV.net='auth';S.st='error';paint();}
  else if(first&&!LV.retried){LV.retried=1;LBUSY=false;setTimeout(()=>loadAll(true),1500);return}
  else if(LV.at){LV.net='offline';S.st='offline';paint()}
  else if(snapLoad()){LV.net='offline';S.st='offline';paint(first?'stgroot':'')}
  else{LV.net='error';S.st='error';LV.err=LERR(e);paint()}
 }finally{LBUSY=false}}
function sigOf(){return JSON.stringify([LV.items.map(c=>[c.id,c.status,c.progressNote,c.progressSteps,c.runStatus,c.folderStatus]),LV.hub,LV.money,LV.scan,LV.arch.length,S.st])}
function paint(dir){applyData();const s=sigOf();if(!dir&&s===LV.sig&&!LV.dirty)return;
 const a=document.activeElement;if(!dir&&a&&/^(TEXTAREA|INPUT|SELECT)$/.test(a.tagName)&&(a.closest('#view')||a.closest('#sheet')||a.closest('#page'))){LV.dirty=true;return}
 LV.sig=s;LV.dirty=false;keybar();render(dir||'keep')}
document.addEventListener('focusout',()=>{if(LV.dirty)setTimeout(()=>{if(LV.dirty)paint()},50)});
function snapSave(){try{localStorage.setItem(LV.A.CONFIG.SNAPSHOT_KEY+':'+LV.A.keyTag(),JSON.stringify({at:LV.at,items:LV.items,hub:LV.hub}))}catch(e){}}
function snapLoad(){try{const s=JSON.parse(localStorage.getItem(LV.A.CONFIG.SNAPSHOT_KEY+':'+LV.A.keyTag())||'null');if(!s||!Array.isArray(s.items))return false;LV.items=s.items;LV.hub=s.hub;LV.at=s.at;return true}catch(e){return false}}
function schedule(){clearTimeout(LPOLL);if(LV.net==='auth')return;LPOLL=setTimeout(async()=>{if(!document.hidden){await loadAll();if(S.chat&&S.chat.b==='daqi')loadMsgs()}schedule()},S.scan?LV.A.CONFIG.FAST_POLL_MS:LV.A.CONFIG.POLL_MS)}
const reload=()=>loadAll().then(()=>{if(S.chat&&S.chat.b==='daqi')loadMsgs()});

/* 金鑰提示列：沒金鑰（示範）或金鑰失效時才出現，放在離線條的位置 */
function keybar(){const o=$('#offline');if(!o)return;
 if(LV.net==='auth'){o.hidden=false;o.innerHTML='<b aria-hidden="true">▲</b><span>金鑰失效，請重新開老大專屬網址。</span><button class="kbtn" data-act="pastekey">貼上金鑰</button>';return}
 if(LV.nokey){o.hidden=false;o.innerHTML='<b aria-hidden="true">●</b><span>沒有金鑰，現在看到的是示範資料。</span><button class="kbtn" data-act="pastekey">貼上金鑰</button>';return}
 o.innerHTML=`<b aria-hidden="true">▲</b><span>離線中，畫面是 ${LV.at?LHM(LV.at):'上次'} 的資料。會寫回去的動作先擋住，連上線再做。</span>`}
ACT.pastekey=()=>{let v='';try{v=prompt('貼上金鑰或老大專屬網址')||''}catch(e){}const k=LV.A.tokenFrom(v);if(!k){if(v)toast('看不出金鑰，請貼完整網址');return}LV.A.saveKey(k);location.reload()};
{const _r=render;render=function(dir){_r(dir);const o=$('#offline');if(o&&(LV.net==='auth'||LV.nokey))o.hidden=false}}

/* ---------- 首頁 ---------- */
{const _h=homeL2;homeL2=function(){return _h().replace(/11 月 22 日　週日/g,esc(dateTxt())).replace(/午安，老大。/g,esc(greet()))}}
todayStrip=function(){if(S.st==='loading'||S.st==='error')return '';
 return `<section class="sec tday">${sh('','今天行程','')}<div class="card lcard"><p>行事曆還沒接上</p><small>接上之後，今天的行程會一張一張排在這裡。</small></div></section>`};
goalCard=function(){if(S.st==='loading'||S.st==='error')return '';delete CV.goal;
 return `<div class="room groomh lgoal" data-z="goal"><div class="rgo"><span class="rh">目標</span><span class="rs">目標還沒接上</span></div>${bigF('din','goal')}</div>`};
goalStrip=goalCard;
goalSlides=function(z){return S.st==='ok'&&(z==='proj'||z==='opp'||z==='life')?[{id:'gnone',name:'目標',html:`<p class="mzhl cvhl">目標還沒接上</p>`}]:[]};
roomGoals=()=>'';gcNote=()=>'';projSync=()=>'';autoFor=()=>null;
monthSelf=()=>subs().filter(s=>s.payer==='自付').reduce((a,s)=>a+(s.mo||0),0);
{const _z=zsum;zsum=function(z){const s=_z(z);
 if(z==='opp'){s.b='';const a=opps('all');s.s=a.length?`最急：${a[0].org||a[0].title}，${a[0].due}`:'現在沒有新機會'}
 if(z==='money'){s.b='';if(!LV.money){s.n='—';s.sm=0;s.u=LV.moneyErr?'看不到錢的資料':'帳戶還沒接上';s.s='';s.none=false;s.hot=false}else{const d=due7();s.n=nt(monthSelf());s.sm=1;s.u='每月固定支出（自付）';s.s=d.length?`7 天內扣 ${d.length} 筆`:'7 天內沒有要扣的';s.none=false;s.hot=subs().some(x=>x.cancel&&x.in<=3)}}
 if(z==='life'){s.n=0;s.u='生活還沒接上';s.s='';s.none=false;s.hot=false}
 if(z==='proj'){const u=urgentProj();s.s=u?`${u.short}${u.due}`:(projs().length?`進行中 ${projs('doing').length} 件`:'沒有急件')}
 return s}}
errorBox=function(z){const n=ZONE[z]?ZONE[z].n:'逐流';
 if(LV.net==='auth')return `<div class="zh" data-z="${z}"><h1>${n}</h1></div><div class="card empty" role="alert" style="margin-top:16px"><div class="big">▲ 金鑰失效</div><p>請重新開老大專屬網址，或貼上新的金鑰。</p><div class="btns">${B('貼上金鑰','pastekey',null,'pri')}</div></div>`;
 return `<div class="zh" data-z="${z}"><h1>${n}</h1></div><div class="card empty" role="alert" style="margin-top:16px"><div class="big">▲ ${n}讀不到</div><p>${esc(LV.err||'連不上資料庫，可能是網路或資料庫睡著了。')}${LV.at?'上次成功是 '+LHM(LV.at)+'。':''}</p><div class="btns">${B('再讀一次','retry',null,'pri')}</div></div>`};
ACT.retry=()=>{S.st='loading';render();loadAll(true)};

/* ---------- 拍板 ---------- */
async function loadHub(){try{LV.hub=await LV.api.hubToday();paint()}catch(e){}}
ACT.pick=function(id,el){const d=DB.dec.find(x=>x.id===id);if(!d)return;const k=el.dataset.k;let key=k,note=null;
 if(k==='_done'){key='_other';note='我已經弄好了'}else if(k==='_alt'){const t=document.querySelector(`[data-dec="${id}"] textarea`);key='_other';note=t?t.value.trim():''}
 const o=d.opts.find(x=>x.k===k),lab=k==='_done'?'你說已經弄好了':k==='_alt'?'照你寫的做':(o?o.label:'');
 closeThen(()=>leave(id,async()=>{d.done=true;render('keep');
  try{await LV.api.hubAnswer(id,key,note);if(window.BotVoice)BotVoice.play('daqi','hum');
   toast(`「${lab}」記下了`,async()=>{try{await LV.api.hubAnswer(id,null);toast('已收回，放回等你決定')}catch(e){toast('沒收回：'+LERR(e))}loadHub()});LV.hub.open=LV.hub.open.filter(x=>x.id!==id);LV.sig='';paint();loadHub()}
  catch(e){d.done=false;LV.sig='';paint();render('keep');toast('沒存上：'+LERR(e))}}))};
ACT.ext=id=>{const d=DB.dec.find(x=>x.id===id),o=DB.opp.find(x=>x.id===id),u=LWEB(d?d.link:o?o.url:'');if(!u){toast('這件沒有網址');return}window.open(u,'_blank','noopener,noreferrer')};

/* ---------- 機會 ---------- */
oppCard=function(o){const sn=o.st==='snoozed';
 return `<article class="card cardx" data-card="${esc(o.id)}">${mineB('opp:'+o.id,o.title)}<div class="meta">${chip(sn?o.snz:o.due,!sn&&o.days<=4)}<span class="lbl">${BASK[o.b]}・${esc(o.org)}</span></div><h3>${cgo(esc(o.title),'sheet','opp:'+o.id)}</h3><p class="amt" style="color:var(--ink)">${esc(o.amt)}</p>${aifs([aiF('jiji','opp:'+o.id,o.took?'建好了':'')])}</article>`};
scanRow=function(){const on=!!S.scan,ls=lastScan();
 return `<div class="scanrow"><span class="lbl">${on?'集集掃描中，約 5～15 分鐘':ls?`上次 ${LMD(ls.at)} ${LHM(ls.at)} 掃描，新增 ${ls.added} 張`:'還沒掃描過'}</span><button class="scan${on?' turn':''}" data-act="scan"${on?' aria-disabled="true"':''} aria-label="${on?'掃描中':'立即掃描'}"><span class="ri" aria-hidden="true">↻</span></button></div>`};
ACT.scan=async()=>{if(S.scan)return;const f=S.sub.opp,bs=BASK[f]?[f]:['personal','fund','honor','other'],back={fund:'funding',honor:'achievement'};
 S.scan=1;S.scanAt=Date.now();render('keep');
 try{for(const b of bs)await LV.api.scanRequest(back[b]||b);toast('已叫集集掃描，約 5～15 分鐘，新卡片會直接放進清單');schedule()}
 catch(e){S.scan=0;render('keep');toast('沒叫到集集：'+LERR(e))}};
function oppAct(id,action,msg,apply,undo){const o=DB.opp.find(x=>x.id===id);if(!o)return;
 closeThen(()=>leave(id,async()=>{const bak=Object.assign({},o);apply(o);render('keep');
  try{const c=await LV.api.act(id,action);if(c){const i=LV.items.findIndex(x=>x.id===id);if(i>-1)LV.items[i]=c}LV.sig='';paint();toast(msg,undo||null)}
  catch(e){Object.assign(o,bak);LV.sig='';paint();render('keep');toast('沒有成功，已經還原：'+LERR(e))}}))}
ACT.snooze=id=>oppAct(id,'stash','暫存了，到時間會回到清單',o=>{o.st='snoozed'});
ACT.unsnooze=id=>oppAct(id,'unstash','放回清單了',o=>{o.st=''});
ACT.del=id=>oppAct(id,'deleted','刪掉了，72 小時內可救回',o=>{o.gone=true},()=>ACT.restore(id));
ACT.restore=async id=>{try{const c=await LV.api.act(id,'restore');if(c){const i=LV.items.findIndex(x=>x.id===id);if(i>-1)LV.items[i]=c}LV.sig='';paint();toast('救回來了，已放回機會清單')}catch(e){toast('沒救回來：'+LERR(e))}};
async function oppDo(id,action,msg){try{const c=await LV.api.act(id,action);if(c){const i=LV.items.findIndex(x=>x.id===id);if(i>-1)LV.items[i]=c}LV.sig='';paint();toast(msg);schedule()}catch(e){toast('沒有成功：'+LERR(e))}}
ACT.build=id=>closeThen(()=>oppDo(id,'build','要做了，Mac 的程式會建案子資料夾'));
ACT.dive=id=>oppDo(id,'dive','已請集集讀完整公告，讀完會放進「完整公告」');
{const _s=sheetHTML;sheetHTML=function(){const a=S.sheet.split(':');if(a[0]!=='opp')return _s();const o=DB.opp.find(x=>x.id===a[1]);if(!o)return shHead('這張機會不在了');
 const c=o.raw||{},fd=c.folderStatus==='done'?'案子資料夾建好了':c.folderStatus&&c.folderStatus!=='none'?'建資料夾中':'';
 return shHead(esc(o.title))+`<dl class="kv"><div><dt>金額</dt><dd>${esc(o.amt)}</dd></div><div><dt>時間</dt><dd>${esc(o.st==='snoozed'?o.snz:o.due)}</dd></div><div><dt>來源</dt><dd>${esc(o.org)}・${BASK[o.b]}</dd></div></dl>
 ${o.why?`<p class="h4">集集的判斷</p><p>${esc(o.why)}</p>`:''}${o.facts.length?`<p class="h4">重點</p><ul class="ul">${o.facts.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>`:''}${o.warn.length?`<p class="h4">要注意</p><ul class="ul">${o.warn.map(f=>`<li>▲ ${esc(f)}</li>`).join('')}</ul>`:''}
 ${fd?`<p class="note">${esc(fd)}</p>`:''}${aifs([aiF('jiji','opp:'+o.id,o.took?'建好了':'')])}<div class="mrow">${o.st==='snoozed'?mb('↺ 放回清單','unsnooze',o.id):mb('⏸ 暫存','snooze',o.id)}${mb('🗑 刪掉','del',o.id)}${c.folderStatus==='none'||!c.folderStatus?mb('✓ 要做，建資料夾','build',o.id):''}${mb('完整公告 ›','page','oppfull:'+o.id)}</div>`}}
{const _p=pageHTML;pageHTML=function(){const a=S.page.split(':');if(a[0]!=='oppfull')return _p();const o=DB.opp.find(x=>x.id===a[1]);
 let h=`<div class="page-in"><div class="phead">${B('‹ 返回','back',null,'ghost',' id="pBack"')}</div>`;if(!o)return h+emptyBox('這張機會不在了','',B('回機會清單','back',null,'pri'))+'</div>';
 const c=o.raw||{},full=LV.full&&LV.full[o.id];
 h+=`<div class="meta" style="margin-top:8px">${chip(o.due,o.days<=4)}<span class="lbl">${BASK[o.b]}・${esc(o.org)}</span></div><h1 class="pt">${esc(o.title)}</h1><dl class="kv"><div><dt>金額</dt><dd>${esc(o.amt)}</dd></div><div><dt>時間</dt><dd>${esc(o.due)}</dd></div></dl>`;
 h+=`<p class="h4">完整公告</p>`+(full?`<div class="lfull">${esc(full).replace(/\n/g,'<br>')}</div>`:c.crawlStatus==='running'||c.crawlStatus==='queued'?LNONE('集集讀公告中，讀完會出現在這裡。'):`${LNONE(c.hasFullText?'讀取中…':'還沒讀完整公告。')}${c.hasFullText?'':`<div class="mrow">${mb('請集集讀完整公告','dive',o.id)}</div>`}`);
 if((c.attachments||[]).length)h+=`<p class="h4">附件</p><ul class="ul">${c.attachments.map(x=>`<li><a href="${esc(LWEB(x.url))}" target="_blank" rel="noopener noreferrer">${esc(x.name||'附件')}</a></li>`).join('')}</ul>`;
 return h+`<div class="btns">${o.url?B('打開官方公告 ↗','ext',o.id):''}</div>${aifs([aiF('jiji','opp:'+o.id,o.took?'建好了':'')])}</div>`}}
{const _pg=ACT.page;ACT.page=function(id){const r=_pg.apply(this,arguments);const a=String(id).split(':');
 if(a[0]==='oppfull'){LV.full=LV.full||{};const o=DB.opp.find(x=>x.id===a[1]);if(o&&o.raw.hasFullText&&!LV.full[a[1]])LV.api.get(a[1]).then(c=>{if(c&&c.detailText){LV.full[a[1]]=c.detailText;render('keep')}}).catch(()=>{})}
 if(a[0]==='proj'&&!LV.hist[a[1]]&&LV.api.history)LV.api.history(a[1]).then(hs=>{LV.hist[a[1]]=hs.map(e=>`${LMD(e.at)} ${LHM(e.at)}　${e.actor}：${e.action}`);const p=DB.proj.find(x=>x.id===a[1]);if(p)p.hist=LV.hist[a[1]];render('keep')}).catch(()=>{});
 return r}}

/* ---------- 案子 ---------- */
pxOf=function(p){const c=p.raw||{},dates=[],money=[],files=[];
 if(c.deadline)dates.push(['截止',LMD(c.deadline)]);if(c.deliveryDate)dates.push(['交件',c.deliveryDate]);if(c.expectedPayDate)dates.push(['預計付款',c.expectedPayDate]);if(!dates.length)dates.push(['期限',p.due]);
 if(c.quoteAmount!=null)money.push(['報價',nt(c.quoteAmount)]);if(c.depositAmount!=null)money.push(['訂金',nt(c.depositAmount)+(c.depositDate?'（'+c.depositDate+'）':'')]);
 if(c.finalAmount!=null)money.push(['尾款',nt(c.finalAmount)+(c.finalDue?'，'+c.finalDue+' 前':'')]);if(c.receivedAmount!=null)money.push(['已收',nt(c.receivedAmount)]);if(c.paymentTerms)money.push(['付款條件',c.paymentTerms]);
 if(c.earnings&&c.earnings.net!=null)money.push(['實拿',nt(c.earnings.net)+(c.earnings.hourly!=null?`，時薪 ${nt(c.earnings.hourly)}`:'')]);if(!money.length)money.push(['狀態',p.money]);
 if(c.folderPath)files.push(['案子資料夾',c.folderPath]);(c.links||[]).forEach(l=>files.push([l.label||({pool:'Pool（素材與專案檔）',review:'內審（給你看的版本）',pay:'付款',other:'連結'}[l.kind]),l.path||l.url]));
 return {client:c.org||'沒寫',doNext:p.next,block:c.progressBlocker||(p.g==='delivered'?'等對方付款':'沒有卡住'),left:p.due,leftSub:'',dates,money,team:[[p.who,'負責'],['你','拍板']],files}};
{const _zp=zoneProj;zoneProj=function(){const s=S.sub.proj;if(s!=='todo')return _zp();
 const h=_zp(),i=h.indexOf('<section class="sec"><h2 class="vh">待辦</h2>');if(i<0)return h;
 return h.slice(0,i)+`<section class="sec"><h2 class="vh">待辦</h2><div class="stack stg">${DB.todo.map(t=>`<article class="card cardx" data-card="${esc(t.id)}"><div class="meta">${chip(t.st)}</div><h3>${esc(t.title)}</h3>${t.next?`<p>${esc(t.next)}</p>`:''}${t.run?'':`<div class="mrow">${mb('▶ 去執行','run',t.id)}</div>`}</article>`).join('')}</div></section>`}}
{const _ms=mineSheet;mineSheet=function(id){const i=id.indexOf(':'),k=id.slice(0,i),x=id.slice(i+1);if(k!=='proj')return _ms(id);
 const p=DB.proj.find(q=>q.id===x);if(!p)return shHead('這件不在了');const st=p.raw.status;let r='';
 if(st==='doing')r+=mi('✓','已交件，等收款','pdeliver',x);if(st==='delivered')r+=mi('✓','已收款','ppaid',x)+mi('↶','退回進行中','pback',x);if(st==='paid')r+=mi('↶','退回等收款','pback2',x);
 r+=mi('›','看詳情','page','proj:'+x)+mi('💬','跟大器說這件','talk',x);return shHead(esc(p.title))+`<div class="mlist">${r}</div>`}}
async function projDo(id,action,o,msg){closeThen(async()=>{try{const c=await LV.api.act(id,action,o||{});if(c){const i=LV.items.findIndex(x=>x.id===id);if(i>-1)LV.items[i]=c}LV.sig='';paint();toast(msg);reload()}catch(e){toast('沒有成功：'+LERR(e))}})}
ACT.pdeliver=id=>projDo(id,'deliver',null,'標成已交件，收進「等收款」');
ACT.ppaid=id=>projDo(id,'paid',{patch:{}},'標成已收款');
ACT.pback=id=>projDo(id,'back',{to:'doing'},'退回進行中');
ACT.pback2=id=>projDo(id,'back',{to:'delivered'},'退回等收款');
ACT.run=id=>projDo(id,'run',null,'交給大器了，進度會寫回這張卡');
ACT.mstep=ACT.mstepb=ACT.mdate=()=>{};

/* ---------- 錢：設計稿的大卡三頁；有後端的只有訂閱 ---------- */
mzHero=function(){const st=FRESH.tata,ss=subs(),d=due7();
 const s1=LV.money?`<p class="mzhl">${aiF('tata','money')}<span>塔塔・每月訂閱</span></p><p class="mzsay">每月固定支出 ${nt(monthSelf())}，${d.length?`7 天內要扣 ${d.length} 筆`:'7 天內沒有要扣的'}。</p><p class="mzcmp"><span>自付 ${ss.filter(s=>s.payer==='自付').length} 筆・公司付 ${ss.filter(s=>s.payer!=='自付').length} 筆${ss.some(s=>s.cancel)?'・▲ 有想取消的':''}</span></p>`
  :`<p class="mzhl">${aiF('tata','money')}<span>塔塔・每月訂閱</span></p><p class="mzsay">${esc(LV.moneyErr||'訂閱資料還沒讀到')}</p>`;
 const sl=[{id:'S',name:'訂閱',html:s1},{id:'A',name:'撐多久',html:`<p class="mzhl"><span>撐多久</span></p><p class="mzsay">帳戶還沒接上</p><p class="mzcmp"><span>接上塔塔記帳的帳戶後，這裡算現金撐幾個月。</span></p>`},{id:'B',name:'這三個月',html:`<p class="mzhl"><span>這三個月</span></p><p class="mzsay">收支還沒接上</p><p class="mzcmp"><span>接上之後，這裡排出三個月的進出。</span></p>`}];
 const car=cvHTML('money',sl,'錢的看法',mzOn);
 return `<div class="zh zhx mz" data-z="money"><div class="zht"><h1>錢</h1><p class="zown">塔塔 ${esc(st)}・<span class="mzk">${CV.money.names[S.cv.money]}</span></p></div>${bigF('tata','money')}${car}</div>`};
mz2HTML=function(){const id=cvCur('money')||'S';if(id!=='S')return `<section class="sec">${sh('',id==='A'?'撐多久':'這三個月')}<div class="card lcard"><p>${id==='A'?'帳戶還沒接上':'收支還沒接上'}</p><small>要接塔塔記帳的帳戶與帳單（只讀）才算得出來。</small></div></section>`;
 const ss=subs(),d=due7();if(!LV.money)return `<section class="sec">${sh('','訂閱')}<div class="card lcard"><p>${esc(LV.moneyErr||'訂閱還沒讀到')}</p></div></section>`;
 if(!ss.length)return `<section class="sec">${sh('','訂閱','0 筆')}<div class="card lcard"><p>還沒有訂閱資料</p></div></section>`;
 let h=`<section class="sec">${sh('','7 天內要扣',d.length+' 筆')}${d.length?`<div class="hs">${d.map(s=>`<div class="card"><div class="meta">${chip(s.in<=0?'今天扣':s.in+' 天後扣',s.in<=2)}</div><h3>${esc(s.name)}</h3><p class="amt" style="color:var(--ink)">${nt(s.amt)}</p></div>`).join('')}</div>`:`<div class="card"><p>7 天內沒有要扣的。</p></div>`}</section>`;
 const op=S.open.subs!==false;
 h+=`<section class="sec"><div class="rows"><div class="rowi"><button class="rowb" data-act="open" data-id="subs" aria-expanded="${op}"><span class="tx"><b>全部訂閱 ${ss.length} 筆</b><small>自付 ${ss.filter(s=>s.payer==='自付').length}・公司付 ${ss.filter(s=>s.payer!=='自付').length}</small></span><span class="rt"><span class="chev" aria-hidden="true">${op?'⌃':'⌄'}</span></span></button></div>${op?ss.map(s=>`<div class="rowi"><button class="rowb" data-act="sheet" data-id="sub:${esc(s.id)}"><span class="tx"><b>${esc(s.name)}</b><small>${s.cancel?'▲ '+esc(s.cancel)+'・':''}${esc(s.cyc)}・${s.payer}・${s.in} 天後扣</small></span><span class="rt"><span class="amt">${nt(s.amt)}</span></span></button></div>`).join(''):''}</div></section>`;
 return h};
mzIn=function(){return `<section class="sec">${sh('','會進來的')}<div class="card lcard"><p>待收款還沒接上</p><small>已交件的案子在「案子」房間的「已交件，等收款」。</small></div></section>`};
mzOut=function(){return `<section class="sec">${sh('','要出去的大筆')}<div class="card lcard"><p>帳單還沒接上</p></div></section>`};
{const _s=sheetHTML;sheetHTML=function(){const a=S.sheet.split(':');if(a[0]!=='sub')return _s();const s=DB.subs.find(x=>x.id===a[1]);if(!s)return shHead('這筆不在了');
 return shHead(esc(s.name))+`<dl class="kv"><div><dt>金額</dt><dd>${nt(s.amt)}</dd></div><div><dt>週期</dt><dd>${esc(s.cyc)}</dd></div><div><dt>下次扣款</dt><dd>${esc(s.next||s.in+' 天後')}</dd></div><div><dt>誰付</dt><dd>${s.payer}</dd></div>${s.acct?`<div><dt>帳戶</dt><dd>${esc(s.acct)}</dd></div>`:''}</dl>${s.cancel?`<p class="err">▲ ${esc(s.cancel)}</p>`:''}<p class="note">改訂閱請到塔塔記帳。</p>`}}

/* ---------- 生活：位置照設計稿，資料還沒接上 ---------- */
zoneLife=function(){const s=S.sub.life;let h=zoneHead('life','生活還沒接上');
 h+=`<div class="card" style="margin-top:14px;border-style:dashed"><h3 aria-level="2">朋朋還沒接上</h3><p class="note">例行提醒、備品、購物清單、訂單之後由朋朋接。</p></div>`;
 h+=`<div class="seg" role="group" aria-label="生活分類">${[['rout','例行 0'],['sup','備品 0'],['wish','想買 0'],['ord','訂單 0']].map(x=>`<button aria-pressed="${s===x[0]}" data-act="sub" data-id="life:${x[0]}">${x[1]}</button>`).join('')}</div>`;
 const n={rout:'例行',sup:'備品',wish:'想買清單',ord:'訂單'}[s]||'例行';
 return h+`<section class="sec" style="margin-top:14px"><div class="card lcard"><p>${n}還沒接上</p><small>接上之後會出現在這裡。</small></div></section>`};

/* ---------- 對話：只有大器有後端；其他 Bot 照設計稿開得起來，但說明還沒接上 ---------- */
havSync=function(){const h=$('#hav'),b='daqi';if(h&&h.dataset.id!==b+'|'){h.dataset.id=b+'|';const o=h.querySelector('.bm');if(o)o.outerHTML=bm(b,'idle')}
 document.querySelectorAll('.hav').forEach(e=>{const n=UNREAD.daqi||0,d=e.querySelector('.dot');if(d){d.hidden=!n;d.textContent=n||''}e.setAttribute('aria-label','跟大器說話'+(n?`，${n} 則新回覆`:''))})};
headBot=()=>'daqi';
const NAMES={daqi:'大器',jiji:'集集',tata:'塔塔',peng:'朋朋',din:'定定',kim:'金金',mon:'萌萌'};
const ctxItem=ctx=>{const a=(ctx||'').split(':');return (a[0]==='proj'||a[0]==='opp')&&LV.items.some(c=>c.id===a[1])?a[1]:null};
async function loadMsgs(){const on=S.chat;if(!on||on.b!=='daqi'||!LV.api)return;const id=ctxItem(on.ctx);
 try{const ms=await LV.api.msgs(id);if(!S.chat||S.chat.b!=='daqi')return;const key=JSON.stringify(ms.map(m=>m.id));const fresh=key!==LV.thread;LV.thread=key;
  const pend=CH.daqi.filter(m=>m.wait);CH.daqi=ms.map(m=>({w:m.kind==='user'?'me':'bot',t:m.body,b:'daqi'})).concat(pend);
  if(!ms.length&&!pend.length)CH.daqi=[{w:'bot',t:'寫一句，或點下面的指令。只有大器本人回，回覆會出現在這裡。',b:'daqi'}];
  if(fresh)logSync()}catch(e){CH.daqi=[{w:'bot',t:'對話讀不到：'+LERR(e),b:'daqi'}];logSync()}}
{const _o=openChat;openChat=function(b,ctx,el,auto){if(!CH[b])CH[b]=[];
 if(b==='daqi'){LV.thread='';CH.daqi=[{w:'bot',t:'讀取中…',b:'daqi'}];setTimeout(loadMsgs,0)}
 else CH[b]=[{w:'bot',t:`${NAMES[b]||'這隻'}的對話還沒接上。要交代事情，先點右上角跟大器說。`,b}];
 return _o(b,ctx,el,null)}}
quick=function(on){const k=(on.ctx||'').split(':')[0];if(on.b==='daqi')return BOTS.daqi.cmds||[];if(on.b==='jiji'&&k==='opp')return ['要做，建案子資料夾','讀完整公告給我'];return []};
say=function(b,text,ctx){
 if(b==='jiji'){const id=(ctx||'').split(':')[1];CH.jiji.push({w:'me',t:text,fresh:1});
  if(id&&/建/.test(text)){oppDo(id,'build','要做了，Mac 的程式會建案子資料夾');CH.jiji.push({w:'bot',t:'已送出「要做，建資料夾」，進度看這張卡。（這是直接動作，不是集集回話）',fresh:1})}
  else if(id&&/公告/.test(text)){oppDo(id,'dive','已請集集讀完整公告');CH.jiji.push({w:'bot',t:'已送出「讀完整公告」，讀完放在卡片的「完整公告」。（這是直接動作，不是集集回話）',fresh:1})}
  else CH.jiji.push({w:'bot',t:'集集的對話還沒接上，這句沒有送出。要交代事情，先跟大器說。',fresh:1});logSync();return}
 if(b!=='daqi'){CH[b].push({w:'me',t:text,fresh:1},{w:'bot',t:`${NAMES[b]||'這隻'}的對話還沒接上，這句沒有送出。要交代事情，先跟大器說。`,fresh:1});logSync();return}
 const a=(ctx||'').split(':'),id=ctxItem(ctx),d=a[0]==='dec'?DB.dec.find(x=>x.id===a[1]):null,body=d?`關於「${d.proj}：${d.q}」：${text}`:text;
 const w={w:'bot',wait:1,b:'daqi',fresh:1};CH.daqi=CH.daqi.filter(m=>m.t!=='寫一句，或點下面的指令。只有大器本人回，回覆會出現在這裡。');CH.daqi.push({w:'me',t:text,fresh:1},w);mood('daqi','thinking');hop($('#cAv'));logSync();
 LV.api.say(id,body).then(()=>{const i=CH.daqi.indexOf(w);if(i>-1)CH.daqi.splice(i,1,{w:'bot',t:'傳給大器了，回覆會出現在這裡。',b:'daqi',fresh:1});logSync();setTimeout(loadMsgs,1500)})
  .catch(e=>{const i=CH.daqi.indexOf(w);if(i>-1)CH.daqi.splice(i,1,{w:'bot',t:'沒送出：'+LERR(e)+'。這句還在上面，可以再傳一次。',b:'daqi',fresh:1});logSync()})};
ACT.askdin=(ctx,el)=>openChat('din',ctx,el);
ACT.cmd=id=>{const i=id.indexOf(':');openChat(id.slice(0,i),'',null)};
{const _cs=chatShell;chatShell=function(on){return _cs(on).replace(/<textarea id="cText"/,on.b==='daqi'||on.b==='jiji'?'<textarea id="cText"':'<textarea id="cText" disabled')}}
WRITE.push('pdeliver','ppaid','pback','pback2','run','scan','build','dive');

/* ---------- 開機 ---------- */
(async()=>{try{
 const A=await import('./adapter.js?v37');LV.A=A;const q=new URLSearchParams(location.search),mf=q.get('mock');
 LV.forced=mf!==null&&mf!=='0';LV.nokey=!A.hasKey()&&!LV.forced;
 LV.api=await A.createAdapter();LV.mode=LV.api.mode;
 await loadAll(true);schedule();
 if(LV.api.subscribe)LV.api.subscribe(()=>reload(),()=>{});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&LV.net!=='auth')reload()});
 addEventListener('online',()=>reload());addEventListener('offline',()=>{if(LV.at){LV.net='offline';S.st='offline';paint()}});
}catch(e){LV.net='error';LV.err=LERR(e);S.st='error';render()}})();
window.__zl=Object.assign(window.__zl||{},{LV});

render('stgroot');
try{const q=new URLSearchParams(location.search);if(q.get('sub')){const [z,s]=q.get('sub').split(':');S.sub[z]=s;render()}if(q.get('filt')){S.filt=q.get('filt');render()}if(q.get('sheet'))ACT.sheet(q.get('sheet'));if(q.get('page'))ACT.page(q.get('page'));if(q.get('chat'))ACT.bot(q.get('chat'))}catch(e){}
})();
