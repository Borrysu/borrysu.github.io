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
  {id:'h1',proj:'藍鯨 NOVA',q:'產品段配樂不變速，只有 3 個接點在拍上，能不能接受？',detail:'扣合那一下不在拍上。要對拍就得把這段變速到 120 BPM，音色會變。',kind:'choice',by:'大器',origin:'巡查待辦',ago:'5 小時前',opts:[{k:'ok',label:'接受，不變速',note:'聽感自然',rec:1},{k:'speed',label:'改成變速對拍',note:'音色會變'}]},
  {id:'h3',proj:'某品牌形象短片（示意）',q:'分鏡第二版客戶兩天沒回，要不要先照這版排拍攝日？',detail:'客戶已讀沒回。先排的話，之後改動超過三場就要重排。',kind:'choice',by:'大器',origin:'專案進度',ago:'1 小時前',opts:[{k:'wait',label:'再等一天，明天中午提醒我',note:'改動風險最小',rec:1},{k:'go',label:'先照第二版排',note:'可能要重排'},{k:'draft',label:'幫我擬一句催客戶的話',note:'只擬稿，不代發'}]},
  {id:'h2',proj:'青年創作補助',q:'線上申請系統要你本人登入才能送件',detail:'資料都備好了，AI 自查完成，等你決定。登入與按下送件只能你本人做。',kind:'talk',by:'大器',origin:'大器',ago:'26 小時前',link:'https://example.com/',opts:[]}
 ],
 jobs:[
  {id:'j1',bot:'daqi',who:'大器（Claude）',title:'藍鯨 NOVA 試看帶',st:'等 Mac 開機',wait:true,ago:'40 分鐘前'},
  {id:'j2',bot:'jiji',who:'集集',title:'掃描創作資金新公告',st:'進行中',ago:'6 分鐘前'}
 ],
 events:[
  {at:'2 小時前',who:'大器（Claude）',bot:'daqi',text:'品牌短片分鏡第二版交出去了，等你看'},
  {at:'昨天 21:40',who:'塔塔',bot:'tata',text:'本月訂閱對帳，AI 自查完成，等你決定示意訂閱 D 要不要留'},
  {at:'昨天 18:02',who:'集集',bot:'jiji',text:'找到 2 張新機會，放進創作資金'},
  {at:'昨天 11:15',who:'大器（Claude）',bot:'daqi',text:'藍鯨 NOVA 初剪上傳到試看資料夾'}
 ],
 beats:[
  {name:'Mac 同步',note:'待辦與紀錄同步',late:false,ago:'2 分鐘前'},
  {name:'大器 收訊',note:'訊息收件有在聽',late:true,ago:'3 小時前，該 5 分鐘一次'},
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
  {id:'ncafroc',b:'honor',title:'海外放映交流計畫 第 6 期',org:'藝術交流基金會',amt:'沒寫金額',days:1,due:'明天截止',why:'你去年提過想帶作品出國放映。',facts:['補助出國展演、放映、駐村的機票與住宿','個人與團體都能申請','線上系統送件'],warn:['明天 23:59 截止，要先註冊帳號']},
  {id:'honor',b:'honor',title:'某影展短片單元評審邀請（示意）',org:'示意資料',amt:'酬勞沒寫',days:4,due:'4 天後截止',why:'對方直接來信邀請。',facts:['評審 12 支短片','線上看片，一場線上會議'],warn:['酬勞沒寫，回信前先問清楚']},
  {id:'pro360kh',b:'personal',title:'80 組簡報轉直式短片',org:'接案城 個人案主',amt:'NT$ 5,000～10,000',days:4,due:'4 天後收走',exp:true,why:'量大但單價低，適合套版。',facts:['80 組簡報各轉一支直式短片','素材對方提供'],warn:['單支換算不到 NT$ 125']},
  {id:'pro360cy',b:'personal',title:'童裝品牌直播精華剪輯',org:'接案城 公司案主',amt:'詳談後報價',days:5,due:'5 天後收走',exp:true,why:'長期合作型，每週固定量。',facts:['每週 3 支直播精華','長期配合'],warn:['報價沒寫，要先問']},
  {id:'song',b:'personal',title:'獨立歌手 MV 詞曲委託（示意）',org:'示意資料',amt:'報價 NT$ 3 萬',days:6,due:'6 天後收走',exp:true,why:'詞曲加 MV 一起，跟你的本業最貼。',facts:['一首歌的詞曲','MV 另談'],warn:[]},
  {id:'artefact',b:'fund',title:'Lumen AI 短片獎 第三屆',org:'Lumen',amt:'大獎 € 10,000',days:17,due:'17 天後截止',why:'AI 短片可投，你手上有現成作品。',facts:['AI 生成短片競賽','片長 5 分鐘內','線上投件'],warn:['報名費 € 25，你按付款鈕才付'],pay:'報名費 € 25'},
  {id:'moclang',b:'fund',title:'母語影像創作補助',org:'城市文化基金會',amt:'補助最高 NT$ 100 萬',days:23,due:'23 天後截止',why:'台語創作可以申請。',facts:['本土語言創作與應用','補助上限 100 萬','要附企劃書與預算表'],warn:['企劃書要 20 頁內']},
  {id:'chroma',b:'fund',title:'Prism 影像獎 第二季',org:'聲波實驗室',amt:'MV 類獎金 US$ 24,000',days:53,due:'53 天後截止',why:'有 MV 類別。',facts:['AI 影片、MV、遊戲三類','線上投件'],warn:[]},
  {id:'tkfan',b:'other',title:'奇幻企劃宣傳片後製',org:'外包市集',amt:'預算 NT$ 3 萬',days:6,due:'6 天後收走',exp:true,why:'純後製，時間可控。',facts:['宣傳片後製一支','素材已拍好'],warn:[]},
  {id:'tkmil',b:'other',title:'歷史頻道長片剪輯',org:'外包市集',amt:'每支 NT$ 2,000～3,000',days:6,due:'6 天後收走',exp:true,why:'單價低，列出來讓你知道有這類。',facts:['每支 20 分鐘上下','每月 4 支'],warn:['單價偏低']},
  {id:'tycg',b:'fund',title:'海港市影視製作補助',org:'海港市文化局',amt:'補助上限 NT$ 80 萬',days:30,due:'30 天後截止',st:'snoozed',why:'之前暫存。',facts:['影視製作補助'],warn:[]},
  {id:'flick',b:'fund',title:'微光 AI 影展',org:'微光影展',amt:'首獎 US$ 10,000',days:40,due:'40 天後截止',st:'snoozed',why:'之前暫存。',facts:['AI 影展徵件'],warn:[]}
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
const BFP={daqi:'daqi',jiji:'gig',tata:'tata',peng:'pompom',baba:'baba'},BFC={daqi:'#a37aff',jiji:'#4d86ff',tata:'#ff6700',peng:'#00b351',baba:'#FFFFFF'};
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
 return `<article class="card" data-card="${esc(o.id)}"><div class="meta">${chip(sn?'明天 8:00 回到清單':o.due,!sn&&o.days<=4)}<span class="lbl">${BASK[o.b]}・${esc(o.org)}</span></div><h3>${esc(o.title)}</h3><p class="amt" style="color:var(--ink)">${esc(oppAmt(o))}</p>
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
BOTS.jiji.cant='替你送件、付款；領標、報名費由塔塔付，要你按了付款鈕才付';
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
function oppPay(o){payReg('o_'+o.id,{amt:'€ 25',to:'Lumen（報名費）',by:'tata'});return `<p class="h4">報名費</p>${payHTML('o_'+o.id)}`}
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
 if(w.cmp==='run')return{n:2,who:['mon'],t:'朋朋請萌萌比價中',run:1};
 if(Array.isArray(w.cmp)&&w.pick==null)return{n:2,who:['mon'],t:'萌萌比好了，選一家'};
 if(!w.cmp)return{n:2,who:['mon'],t:'還沒比價',act:B(bm('mon')+'請朋朋找萌萌比價','wishcmp',w.id,'pri')+B('不比了，直接請朋朋買','wishbuy',w.id,'ghost')};
 if(w.kim==='run')return{n:4,who:['kim'],t:'金金在看值不值',run:1};
 if(isBig(w)&&!w.kim)return{n:4,who:['kim'],t:`超過 ${nt(BIG)}，可以先問金金值不值`,act:B('請金金看值不值','wishkim',w.id,'pri')+B('先不問，直接請朋朋買','wishbuy',w.id,'ghost')};
 return{n:5,who:w.kim?['kim','peng']:['peng'],t:w.kim?`金金：${w.kim.v}。要買就請朋朋`:'可以請朋朋買了',act:B('請朋朋買','wishbuy',w.id,'pri')}}
function cmpHTML(w){return `<div class="cmp" role="group" aria-label="萌萌的比價對照">${w.cmp.map((c,i)=>`<div class="cr"${c.rec?' data-rec':''}><div><b>${esc(c.shop)}</b>${c.rec?' <span class="chip urg">'+bm('mon','','sm')+'萌萌推薦</span>':''}<small>商品 ${nt(c.price)}・${c.ship?'運費 '+nt(c.ship):'免運'}・${c.eta}到</small>${c.rec?`<small>理由：${esc(c.why)}</small>`:''}</div><div class="crr"><span class="amt">${nt(c.total)}</span>${w.pick===i?'<span class="lbl">已選這家</span>':w.st==='bought'||w.ord?'':B('選這家','wishpick',w.id+':'+i,c.rec?'pri':'')}</div></div>`).join('')}</div>`}
function wishMore(w,i,n,f){const big=isBig(w),bought=w.st==='bought',st=wstep(w).n;
 const L=[[1,['peng'],'想買：朋朋補齊資料'],[2,['mon'],'比價：朋朋轉給萌萌'],[3,['tata'],'金流：塔塔看買不買得起'],[4,['kim'],'值不值：金金看該不該花'],[5,['peng'],'下訂單：請朋朋買'],[6,[],'付款：你按付款鈕才付']].filter(x=>x[0]!==4||big);
 return `<div class="fadein"><ol class="flow" aria-label="這件的流程">${L.map(x=>{const dn=x[0]<st||x[0]===3,cu=x[0]===st;return `<li data-s="${cu?'cur':dn?'done':''}"><span class="mk" aria-hidden="true">${cu?'▸':dn?'✓':'○'}</span><span class="who">${x[1].map(b=>bm(b,'','sm')).join('')}</span><span>${x[2]}<span class="vh">${cu?'（現在）':dn?'（做完）':'（還沒）'}</span></span></li>`}).join('')}</ol>
 ${bought?'':`<p class="h4">塔塔怎麼看（只是建議，付不付你決定）</p><p class="wnote">${bm('tata','','sm')}<span>${f.why}</span></p>`}
 ${Array.isArray(w.cmp)&&w.pick!=null?`<p class="h4">${bm('mon','','sm')}萌萌的比價</p>${cmpHTML(w)}`:''}
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
// 2026-11-23 改用台北今天的實際日期（原本寫死 11/22，老大：「行事曆的日期是錯的，那是昨天的日期不是今天的」）
const dOf=n=>{const t=new Date(Date.now()+8*3600e3);t.setUTCHours(0,0,0,0);t.setUTCDate(t.getUTCDate()+n);return{m:t.getUTCMonth()+1,d:t.getUTCDate(),w:t.getUTCDay()}};
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
 {id:'c4',d:1,t:'10:00',e:'11:00',n:'週會',src:'co',cs:'星芒',place:'公司會議室',who:'星芒全員',why:'你是參加者'},
 {id:'c5',d:2,t:'14:00',e:'15:00',n:'試看帶回饋會議',src:'co',cs:'藍鯨 NOVA',place:'Google Meet',who:'客戶、大器',why:'你負責的案子'},
 {id:'c6',d:2,t:'15:00',e:'19:00',n:'藍鯨 NOVA Bcopy 修正',src:'me',cat:'E',place:'家裡'},
 {id:'c7',d:5,t:'13:00',e:'18:00',n:'我有事',src:'co',hold:1,why:'私人案的占位，不寫內容'},
 {id:'c8',d:5,t:'13:00',e:'18:00',n:'晴川 外拍',src:'me',cat:'S',place:'示意外拍地點',priv:1},
 {id:'c9',d:9,t:'10:00',e:'12:00',n:'勘景',src:'co',cs:'品牌短片',place:'示意攝影棚',who:'攝影師、美術',why:'你負責的案子'},
 {id:'c10',d:9,t:'10:00',e:'12:00',n:'品牌短片 勘景',src:'me',cat:'S',place:'示意攝影棚'},
 {id:'c11',d:7,t:'',e:'',all:1,n:'剪接休息日',src:'me',cat:'L',place:''}];
const RULES=[
 '兩個日曆：公司「星芒影像」一律黃色；個人「我的行事曆」照分類碼上色，黃色只給公司。',
 '公司放對外日期：公司業務、客戶交件日、外部會議、進組出班、團隊協作。標題寫【案名】事件名稱 @我。',
 '個人放你實際工作和生活的時段。標題寫「分類碼.事件名」，句點是半形。',
 '分類碼：S 出班（櫻花粉）、E 剪接（薰衣草）、W 企劃行政（孔雀藍）、C 創作（橘）、L 生活（淡綠）。',
 '對外交件日放公司、實際排程放個人；同一件事可以兩邊各一筆，各用各的格式。個人可以比對外日期提前，對外日期不因個人提前而改。',
 '私人案只放個人；公司同時段放匿名「我有事」占位，不寫內容。',
 '分類想超過三秒就先記事件名，分類碼事後補。',
 '不主動改行事曆上既有的事件；你在面板上親手改的那一筆，才算你指定。'];
const rawTitle=e=>e.src==='co'?(e.hold?'我有事':`【${e.cs||'案名待補'}】${e.n} @我`):`${e.cat||'（分類待補）'}${e.cat?'.':''}${e.n}`;
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
 return h+`<p class="note" style="margin-top:18px">公司行事曆只列標題有 @我 的（跟你有關的）。每 30 分鐘從 Google 行事曆同步一次。</p></div>`}
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
 G.priv=/晴川|私人案|私案/.test(t);G.life=/健身|聚餐|吃飯|看醫生|牙醫|剪頭髮|家人|約會|運動|私事|休息/.test(t)&&!G.priv;
 G.kind=/交件|交片|交分鏡|送件|交稿/.test(t)?'交件':/拍攝|出班|進組|外拍|勘景/.test(t)?'拍攝':/會議|開會|提案|比稿|週會|回饋/.test(t)?'會議':'';
 G.cs=/品牌短片/.test(t)?'品牌短片':/藍鯨|NOVA/i.test(t)?'藍鯨 NOVA':/星芒/.test(t)?'星芒':'';
 G.cat=/拍攝|出班|進組|外拍|勘景/.test(t)?'S':/剪|後期|調色|混音|交片|試看|copy/i.test(t)?'E':/企劃|腳本|分鏡|提案|報價|會議|文件|行政|交件|交稿|開會/.test(t)?'W':/創作|寫歌|demo|新歌|作品|詞/i.test(t)?'C':G.life?'L':'';
 G.co=!G.priv&&!G.life&&(!!G.kind||!!G.cs);G.me=true;G.lead=G.kind==='交件'?2:0;
 const wd=f.n!=null&&dOf(f.n).w>0&&dOf(f.n).w<6,work=f.s>='09:00'&&f.s<'18:00';G.hold=G.priv||(G.life&&wd&&work);return G}
function readForm(){const v=id=>{const e=$('#'+id);return e?e.value.trim():''};return{title:v('cfT'),note:v('cfN'),who:v('cfW'),place:v('cfP'),n:nOfIso(v('cfD')),s:v('cfS'),e:v('cfE')}}
function ctlOf(){const g=id=>$('#'+id);return{co:!!(g('cfCo')&&g('cfCo').checked),me:!!(g('cfMe')&&g('cfMe').checked),cat:g('cfCat')?g('cfCat').value:'',lead:g('cfLead')?+g('cfLead').value:0}}
function predHTML(f,c,G){if(!f.title)return '<b>寫了標題，這裡會顯示放哪邊。</b>';
 const parts=[];if(c.co)parts.push(G.hold?'公司（同時段放「我有事」，不寫內容）':`公司（${G.kind==='交件'?'對外交件日':G.kind==='拍攝'?'進組出班':G.kind==='會議'?'外部會議':'公司業務'}）`);
 if(c.me)parts.push(c.cat?`個人 ${c.cat}.${CAT[c.cat][0]}（${G.kind==='交件'?'實際工作時段':c.cat==='L'?'生活時段':'實際時段'}${c.lead?`，提前 ${c.lead} 天`:''}）`:'個人（分類想不出來，先記名，分類碼之後補）');
 if(!parts.length)return '<b>兩邊都沒勾，這筆不會放上行事曆。</b>';
 const ttl=[];if(c.co)ttl.push(`公司：${G.hold?'我有事':`【${G.cs||'案名待補'}】${f.title} @我`}${f.n!=null?'・'+dl(f.n):''}`);
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
 if(c.co)made.push({id:'n'+sq+'co',d:f.n,t:f.s,e:f.e,n:G.hold?'我有事':f.title,src:'co',cs:G.cs,hold:G.hold?1:0,place:G.hold?'':f.place,who:G.hold?'':f.who,why:'你建立的',mk:'run',mkTo:to,pair:c.me?1:0});
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
 // 點臉只打開對話，不代老大送任何一句；要問什麼點下面的快捷或自己打（2026-11-22 老大：點金金會直接送出，這種 bug 要拿掉）
 openChat(b,ctx,el,null)};
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
{const _m=ACT.mine;ACT.mine=id=>{if(id.indexOf('dec:')===0){S.more[id.slice(4)]=true;return ACT.sheet(id)}return _m(id)}}
ACT.decopen=id=>{S.more[id]=true;ACT.sheet('dec:'+id)};
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
  base:'送審中 1 件，準備中 1 件。',next:'藝術交流基金會企劃書 12/15 截止，還缺預算表。',src:'機會房間標成補助的機會，送件與結果自動帶入',auto:1,
  steps:[['短片輔導金','n','送審中，1 月公布'],['藝術交流基金會常態補助','n','準備中，12/15 截止'],['拿到一筆','','']]},
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
 const hot=a.filter(g=>g.st==='late'||g.st==='stall'),cand=hot.concat(a.filter(g=>hot.indexOf(g)<0)).slice(0,2),pick=hot.length>0&&a.length>1;   // v41：原本寫死補助與劇本，改成照真資料（落後、沒動的先列）
 h+=`<div class="card cardx gpick" data-card="gpick">${mineB('goals:all','目標')}<div class="meta"><span class="gsumn num">${m.n}</span><span>個目標</span>${m.l?chip(m.l+' 個落後',1):''}${m.s?`<span class="chip gstall"><span aria-hidden="true">‖ </span>${m.s} 個沒動</span>`:''}${!m.l&&!m.s?chip('都照進度'):''}</div>
 <div class="gsay">${aiF('din','goals')}<p>${pick?esc(hot.map(g=>g.name.slice(0,10)+g.stText).join('；'))+'。這週力氣放哪一個？':'這週照順序推，有落後的我會先講。'}</p></div>
 ${pick?`<div class="btns">${cand.map(g=>`<button class="btn" data-act="gfocus" data-id="${esc(g.id)}" aria-pressed="${GL.focus===g.id}">這週推${esc(g.name.slice(0,8))}</button>`).join('')}</div>`:''}</div>
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
const GV={goals:{adv:'這週推補助：先把藝術交流基金會預算表拉出來',why:'補助 12/15 截止，錯過要等半年；劇本慢 8 場，晚一週還追得回來。',risk:'劇本會再慢約 6 場。下週起每週寫 8 場，3/28 前可以寫完。'},
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
 return {id:d.id,name:d.proj,html:`<div class="dslide" data-card="${esc(d.id)}">${mineB('dec:'+d.id,'這件拍板')}<div class="bandtop"><span class="lbl who">${aiF('daqi','dec:'+d.id)}<span class="dproj">${esc(d.proj)}</span></span><span class="lbl">${esc(d.ago)}</span></div><h2 class="dq" data-act="decopen" data-id="${esc(d.id)}">${esc(String(d.q||'').replace(/\s*([\u2460-\u2469])/g,'\n$1').trim())}</h2>${rec?`<div class="btns"><button class="btn pri big" data-act="pick" data-id="${esc(d.id)}" data-k="${esc(rec.k)}"><span>${esc(rec.label)}</span><small>${rec.note?'推薦・'+esc(rec.note):'推薦'}</small></button></div><div class="mrow"><button class="mb" data-act="decopen" data-id="${esc(d.id)}">其他做法・看細節</button></div>`:decActs(d)}${aifs([dinB('dec:'+d.id)])}</div>`}}
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
 const gb=g=>`${clip(String(g.short||g.name||''),12)} ${g.now}／${g.total}${g.unit?' '+g.unit:''}${g.st==='late'?'・慢':g.st==='stall'?'・沒動':''}`;
 return `<div class="room groomh" data-z="goal"><button class="gtopb" data-act="page" data-id="goals"><span class="rh">目標</span><span class="gsm gsmr" aria-label="各目標重點，手指左右滑"><span>${esc(m.t)}</span>${a.map(g=>`<span>${esc(gb(g))}</span>`).join('')}</span></button>${car}${bigF('din','goal')}</div>`}
goalStrip=goalCard;

/* 目標頁頁首：跟其他房間一樣的大卡 */
{const _g=goalsPage;goalsPage=function(){const h=_g();if(S.st==='loading'||S.st==='error')return h;const a=gAll(),m=gsum();
 return h.replace('<h1 class="pt">目標</h1>',`<div class="zh zhx" data-z="goal"><div class="zht"><h1>目標</h1><p class="zown">定定的房間</p><p class="sum">${a.length?esc(m.t):'還沒立目標'}</p></div>${bigF('din','goal')}</div>`)}}
window.__zl={DB,GL,S,render:d=>render(d)};

/* ---------- 1122-N 新增行程改成一句話輸入（2026-11-22，大器 Opus 5.5，星芒 CLI 派工） ----------
   老大 2026-11-22：「差不多很漂亮 只差那個新增行事曆的部分 這些詳細的內容當然可以保留，但我我希望可以就是我口語隨便說大器也知道怎麼寫 所以應該是在標題列那邊我直接輸入就好，對吧？」
   浮窗最上面只放一個大輸入框，打口語，按「整理」（或 Enter）→ 右上大器的臉「整理中」→ 填進下面的欄位、顯示預判句。
   原本的詳細欄位全部保留，收在「細節」裡（預設收起）。主按鈕寫結果：「加到 公司＋個人」。
   解析是示意規則（今天／明天／後天／週幾／幾月幾號、上午下午幾點、在○○、跟○○、案名關鍵字），正式版交給大器本人。
   由 _暫存/一句話行程.py 嵌進 v3 主程式（同一個作用域），放在 render 之前。 */

const NLN={'零':0,'一':1,'二':2,'兩':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'十一':11,'十二':12};
const nlNum=s=>/^\d+$/.test(s)?+s:NLN[s]!=null?NLN[s]:/^十[一二]$/.test(s)?10+NLN[s[1]]:null;
const NLWK={'日':0,'天':0,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6};
const NLPROJ=[[/藍鯨|NOVA/i,'藍鯨'],[/品牌短片/,'品牌短片'],[/晴川/,'晴川'],[/星芒/,'星芒'],[/新歌/,'新歌 demo']];
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
 <div class="nlbox"><textarea id="nlT" rows="2" enterkeyhint="done" autocomplete="off" placeholder="明天下午三點跟藍鯨開剪接會，在公司">${v(S.nl.txt)}</textarea>
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
 if(c.co)parts.push(G.hold?'公司「我有事」（不寫內容）':`公司【${cs||'案名待補'}】${f.title} @我`);
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
 if(c.co)made.push(Object.assign({id:'n'+sq+'co',d:f.n,n:G.hold?'我有事':f.title,src:'co',cs,hold:G.hold?1:0,place:G.hold?'':f.place,who:G.hold?'':f.who,why:'你建立的',mk:'run',mkTo:to,pair:c.me?1:0},tm));
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
S.layout=2;S.skin=6;S.st='loading';S.bound=false;   // v39：生活照設計稿顯示「朋朋還沒綁定」與各空狀態按鈕；綁定與新增沒有後端，按了出現「還沒接上」
const LV={api:null,A:null,mode:'',items:[],hub:null,money:null,moneyErr:'',scan:{},at:0,net:'loading',nokey:false,forced:false,hist:{},arch:[],thread:'',sig:'',dirty:false};
const LMD=t=>{const d=new Date(t);return (d.getMonth()+1)+'/'+d.getDate()};
const LHM=t=>{const d=new Date(t);return d.getHours()+':'+String(d.getMinutes()).padStart(2,'0')};
const LAGO=t=>{if(!t)return '';const m=Math.round((Date.now()-t)/60000);if(m<1)return '剛剛';if(m<60)return m+' 分鐘前';const h=Math.round(m/60);if(h<24)return h+' 小時前';const d=Math.round(h/24);return d<7?d+' 天前':LMD(t)};
const LDAYS=t=>t?Math.ceil((t-Date.now())/864e5):null;
const LWEB=u=>/^https?:\/\//i.test(String(u||''))?String(u):'';
const LBOT=s=>/集集|Gig/i.test(s||'')?'jiji':/金金|Kim/i.test(s||'')?'kim':/塔塔|Tal/i.test(s||'')?'tata':/朋朋|Pom/i.test(s||'')?'peng':'daqi';   // v50：金金有自己的臉，不再併到塔塔
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

function applyData(){const it=LV.items;applyExtra();
 DB.opp=it.filter(c=>BK[c.basket]&&(c.status==='new'||c.status==='snoozed')).map(mapOpp);
 DB.deleted=it.filter(c=>BK[c.basket]&&(c.status==='dropped'||c.status==='expired')).map(c=>({id:c.id,title:c.title,amt:c.amountDisplay||c.amountLabel||''}));
 DB.proj=it.filter(c=>['doing','delivered','paid'].includes(c.status)).map(mapProj).sort((a,b)=>(a.urg?0:1)-(b.urg?0:1));
 DB.todo=it.filter(c=>c.basket==='todo'&&c.status==='new').map(mapTodo);
 DB.arch=LV.arch.map(mapArch);
 const h=LV.hub||{open:[],jobs:[],events:[],beats:[]};
 DB.dec=h.open.map(mapDec);Object.keys(PD).forEach(k=>{delete PD[k]});DB.dec.forEach(d=>{const pj=d.projFull||d.proj,p=DB.proj.find(x=>x.title===pj||x.short===pj);if(p)PD[d.id]=p.id});DB.jobs=h.jobs.filter(j=>j.status!=='done').map(mapJob);DB.events=h.events.map(mapEvt);DB.beats=h.beats.map(mapBeat);
 DB.subs=LV.money?LV.money.items.filter(s=>s.status!=='cancel'||s.cancelBy).map(mapSub).sort((a,b)=>a.in-b.in):[];
 const t=LV.at?LHM(LV.at):'';FRESH.daqi=LV.forced?'示範資料':t?t+' 更新':'讀取中';
 const ls=lastScan();FRESH.jiji=ls?LHM(ls.at)+' 整理':'還沒掃描過';FRESH.tata=LV.mo?t+' 讀取':LV.money?'訂閱 '+t+' 讀取':'看不到帳戶';FRESH.peng=LV.life?t+' 更新':'讀不到';
 const sp=$('#stamp');if(sp)sp.textContent=LV.forced||LV.nokey?'示範資料':t?t+' 更新':'讀取中'}
function lastScan(){let b=null;Object.values(LV.scan||{}).forEach(v=>{if(v&&v.last&&v.last.at&&(!b||v.last.at>b.at))b=v.last});return b}
const scanOpen=()=>Object.values(LV.scan||{}).some(v=>v&&v.open&&v.open.status!=='done');

/* ---------- 讀資料 ---------- */
let LPOLL=0,LBUSY=false;
/* 2026-11-25 按需載入（11/24 資料庫事故，批次一）：每次只讀核心＋目前所在的房間，其餘切到那間房且資料超過 5 分鐘才讀。
   核心＝list、hubToday。各區 key：goals、cal、scan、money、mo、mtr、pay、life、lifeGone、mon、co。
   退回：git revert 這個 commit（舊版是 loadAll 一次讀全部）。 */
const ZK={home:['goals','cal'],proj:['goals','co'],opp:['goals','scan'],money:['goals','money','mo','mtr','pay'],life:['goals','life','lifeGone','mon']};
const LZ={cur:null,run:null,at:{},err:{},q:Promise.resolve(),seen:''};
const ZN=k=>!LZ.cur||LZ.cur.has(k);
const ZE=k=>{if(LZ.run)LZ.run.add(k)};
const zoneOf=t=>({today:'home',daqi:'home',proj:'proj',opp:'opp',money:'money',life:'life'}[t]||'home');
const zStale=k=>!LZ.at[k]||Date.now()-LZ.at[k]>300000;
function zKeys(){const z=zoneOf(S.tab),a=ZK[z].slice();if(S.page==='cal'&&a.indexOf('cal')<0)a.push('cal');return a}
function loadZones(keys){keys=[...new Set(keys)];return LZ.q=LZ.q.catch(()=>{}).then(async()=>{LZ.cur=new Set(keys);LZ.run=new Set();
 try{await loadMoney();await loadExtra()}finally{const now=Date.now(),bad=LZ.run;LZ.cur=null;LZ.run=null;keys.forEach(k=>{if(bad.has(k))LZ.err[k]=now;else{LZ.at[k]=now;delete LZ.err[k]}})}})}
async function loadMoney(){const api=LV.api;
 if(ZN('money')&&api.moneySubs&&!LV.moneyNo){try{LV.money=await api.moneySubs();LV.moneyErr=''}catch(e){LV.money=null;LV.moneyNo=!!(e&&e.kind==='forbidden');LV.moneyErr=LV.moneyNo?'這把金鑰不能看錢的資料，只有老大本人的網址能看':LERR(e);if(e&&e.kind==='auth')throw e;if(!LV.moneyNo)ZE('money')}}
 if(ZN('scan')&&api.scanStatus)LV.scan=await api.scanStatus().catch(e=>{ZE('scan');return LV.scan||{}})}
async function loadAll(first){if(LBUSY)return;LBUSY=true;const api=LV.api;
 try{
  const [l,h]=await Promise.all([api.list(),api.hubToday?api.hubToday():null]);
  LV.items=l.items;LV.hub=h;LV.at=Date.now();LV.net='ok';
  if(first&&api.archive){api.archive('',null).then(r=>{LV.arch=r.items||[];paint()}).catch(()=>{})}
  const ks=zKeys();if(first||scanOpen())ks.push('scan');
  await loadZones(ks);LZ.seen=zoneOf(S.tab)+(S.page==='cal'?':cal':'');
  if(LV.mode==='live')snapSave();
  S.st='ok';S.scan=scanOpen()?1:0;paint(first?'stgroot':'');
  if(first&&S.chat)loadMsgs();pollInbox();
 }catch(e){
  if(e&&e.kind==='auth'){LV.net='auth';S.st='error';paint();}
  else if(first&&!LV.retried){LV.retried=1;LBUSY=false;setTimeout(()=>loadAll(true),1500);return}
  else if(LV.at){LV.net='offline';S.st='offline';paint()}
  else if(snapLoad()){LV.net='offline';S.st='offline';paint(first?'stgroot':'')}
  else{LV.net='error';S.st='error';LV.err=LERR(e);paint()}
 }finally{LBUSY=false}}
function sigOf(){return JSON.stringify([LV.items.map(c=>[c.id,c.status,c.progressNote,c.progressSteps,c.runStatus,c.folderStatus]),LV.hub,LV.money,LV.scan,LV.arch.length,S.st,LV.goals,LV.cal,LV.life,LV.mo])}
function paint(dir){applyData();const s=sigOf();if(!dir&&s===LV.sig&&!LV.dirty)return;
 const a=document.activeElement;if(!dir&&a&&/^(TEXTAREA|INPUT|SELECT)$/.test(a.tagName)&&(a.closest('#view')||a.closest('#sheet')||a.closest('#page'))){LV.dirty=true;return}
 LV.sig=s;LV.dirty=false;keybar();render(dir||'keep')}
document.addEventListener('focusout',()=>{if(LV.dirty)setTimeout(()=>{if(LV.dirty)paint()},50)});
function snapSave(){try{localStorage.setItem(LV.A.CONFIG.SNAPSHOT_KEY+':'+LV.A.keyTag(),JSON.stringify({at:LV.at,items:LV.items,hub:LV.hub}))}catch(e){}}
function snapLoad(){try{const s=JSON.parse(localStorage.getItem(LV.A.CONFIG.SNAPSHOT_KEY+':'+LV.A.keyTag())||'null');if(!s||!Array.isArray(s.items))return false;LV.items=s.items;LV.hub=s.hub;LV.at=s.at;return true}catch(e){return false}}
function schedule(){clearTimeout(LPOLL);if(LV.net==='auth')return;LPOLL=setTimeout(async()=>{if(!document.hidden){await loadAll();if(S.chat)loadMsgs();pollInbox()}schedule()},S.scan?LV.A.CONFIG.FAST_POLL_MS:LV.A.CONFIG.POLL_MS)}
const reload=()=>loadAll().then(()=>{if(S.chat)loadMsgs();pollInbox()});

/* 金鑰提示列：沒金鑰（示範）或金鑰失效時才出現，放在離線條的位置 */
function keybar(){const o=$('#offline');if(!o)return;
 if(LV.net==='auth'){o.hidden=false;o.innerHTML='<b aria-hidden="true">▲</b><span>金鑰失效，請重新開老大專屬網址。</span><button class="kbtn" data-act="pastekey">貼上金鑰</button>';return}
 if(LV.nokey){o.hidden=false;o.innerHTML='<b aria-hidden="true">●</b><span>沒有金鑰，現在看到的是示範資料。</span><button class="kbtn" data-act="pastekey">貼上金鑰</button>';return}
 o.innerHTML=`<b aria-hidden="true">▲</b><span>離線中，畫面是 ${LV.at?LHM(LV.at):'上次'} 的資料。會寫回去的動作先擋住，連上線再做。</span>`}
ACT.pastekey=()=>{let v='';try{v=prompt('貼上金鑰或老大專屬網址')||''}catch(e){}const k=LV.A.tokenFrom(v);if(!k){if(v)toast('看不出金鑰，請貼完整網址');return}LV.A.saveKey(k);location.reload()};
{const _r=render;render=function(dir){_r(dir);const o=$('#offline');if(o&&(LV.net==='auth'||LV.nokey))o.hidden=false}}

/* ---------- 首頁 ---------- */
{const _h=homeL2;homeL2=function(){return _h().replace(/11 月 22 日　週日/g,esc(dateTxt())).replace(/午安，老大。/g,esc(greet()))}}
// v42：行事曆接上 hub_cal_events（見檔尾「行事曆（v42）」），設計稿的 todayStrip、calPage 照原樣用
gcNote=()=>'';projSync=()=>'';   // v41：目標接上 hub_goals（見檔尾「目標（v41）」），設計稿的 goalCard、goalSlides、roomGoals 照原樣用
monthSelf=()=>subs().filter(s=>s.payer==='自付').reduce((a,s)=>a+(s.mo||0),0);
{const _z=zsum;zsum=function(z){const s=_z(z);
 if(z==='opp'){s.b='';const a=opps('all');s.s=a.length?`最急：${a[0].org||a[0].title}，${a[0].due}`:'現在沒有新機會'}
 if(z==='money'&&!LV.mo){s.b='';if(!LV.money){s.n='—';s.sm=0;s.u=LV.moneyErr?'看不到錢的資料':LZ.at.money||LZ.err.money?'帳戶還沒接上':'點進去才讀';s.s='';s.none=false;s.hot=false}else{const d=due7();s.n=nt(monthSelf());s.sm=1;s.u='每月固定支出（自付）';s.s=d.length?`7 天內扣 ${d.length} 筆`:'7 天內沒有要扣的';s.none=false;s.hot=subs().some(x=>x.cancel&&x.in<=3)}}
 if(z==='life'&&!LV.life){s.n=0;s.u=LZ.at.life||LZ.err.life?'生活讀不到':'點進去才讀';s.s='';s.none=false;s.hot=false}
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
 ${fd?`<p class="note">${esc(fd)}</p>`:''}${aifs([aiF('jiji','opp:'+o.id,o.took?'建好了':fd==='建資料夾中'?'建資料夾中':'')])}<div class="mrow">${o.st==='snoozed'?mb('↺ 放回清單','unsnooze',o.id):mb('⏸ 暫存到明天','snooze',o.id)}${mb('🗑 刪掉','del',o.id)}${mb('完整公告 ›','page','oppfull:'+o.id)}</div>`}}
{const _p=pageHTML;pageHTML=function(){const a=S.page.split(':');if(a[0]!=='oppfull')return _p();const o=DB.opp.find(x=>x.id===a[1]);
 let h=`<div class="page-in"><div class="phead">${B('‹ 返回','back',null,'ghost',' id="pBack"')}</div>`;if(!o)return h+emptyBox('這張機會不在了','',B('回機會清單','back',null,'pri'))+'</div>';
 const c=o.raw||{},full=LV.full&&LV.full[o.id];
 h+=`<div class="meta" style="margin-top:8px">${chip(o.due,o.days<=4)}<span class="lbl">${BASK[o.b]}・${esc(o.org)}</span></div><h1 class="pt">${esc(o.title)}</h1><dl class="kv"><div><dt>金額</dt><dd>${esc(o.amt)}</dd></div><div><dt>時間</dt><dd>${esc(o.due)}</dd></div></dl>`;
 h+=`<p class="h4">完整公告</p>`+(full?`<div class="lfull">${esc(full).replace(/\n/g,'<br>')}</div>`:c.crawlStatus==='running'||c.crawlStatus==='queued'?LNONE('集集讀公告中，讀完會出現在這裡。'):LNONE(c.hasFullText?'讀取中…':'還沒讀完整公告。'));
 const hs=LV.hist[o.id];if(hs&&hs.length)h+=`<p class="h4">紀錄</p><ul class="tl">${hs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
 if((c.attachments||[]).length)h+=`<p class="h4">附件</p><ul class="ul">${c.attachments.map(x=>`<li><a href="${esc(LWEB(x.url))}" target="_blank" rel="noopener noreferrer">${esc(x.name||'附件')}</a></li>`).join('')}</ul>`;
 return h+`<div class="btns">${o.url?B('打開官方公告 ↗','ext',o.id):''}</div>${aifs([aiF('jiji','opp:'+o.id,o.took?'建好了':'')])}</div>`}}
{const _pg=ACT.page;ACT.page=function(id){const r=_pg.apply(this,arguments);const a=String(id).split(':');
 if(a[0]==='oppfull'){LV.full=LV.full||{};const o=DB.opp.find(x=>x.id===a[1]);if(o&&o.raw.hasFullText&&!LV.full[a[1]])LV.api.get(a[1]).then(c=>{if(c&&c.detailText){LV.full[a[1]]=c.detailText;render('keep')}}).catch(()=>{})}
 if((a[0]==='proj'||a[0]==='oppfull')&&!LV.hist[a[1]]&&LV.api.history)LV.api.history(a[1]).then(hs=>{LV.hist[a[1]]=hs.map(e=>`${LMD(e.at)} ${LHM(e.at)}　${e.actor}：${e.action}`);const p=DB.proj.find(x=>x.id===a[1]);if(p)p.hist=LV.hist[a[1]];render('keep')}).catch(()=>{});
 return r}}

/* ---------- 案子 ---------- */
pxOf=function(p){const c=p.raw||{},dates=[],money=[],files=[];
 if(c.deadline)dates.push(['截止',LMD(c.deadline)]);if(c.deliveryDate)dates.push(['交件',c.deliveryDate]);if(c.expectedPayDate)dates.push(['預計付款',c.expectedPayDate]);if(!dates.length)dates.push(['期限',p.due]);
 if(c.quoteAmount!=null)money.push(['報價',nt(c.quoteAmount)]);if(c.depositAmount!=null)money.push(['訂金',nt(c.depositAmount)+(c.depositDate?'（'+c.depositDate+'）':'')]);
 if(c.finalAmount!=null)money.push(['尾款',nt(c.finalAmount)+(c.finalDue?'，'+c.finalDue+' 前':'')]);if(c.receivedAmount!=null)money.push(['已收',nt(c.receivedAmount)]);if(c.paymentTerms)money.push(['付款條件',c.paymentTerms]);
 if(c.earnings&&c.earnings.net!=null)money.push(['實拿',nt(c.earnings.net)+(c.earnings.hourly!=null?`，時薪 ${nt(c.earnings.hourly)}`:'')]);if(!money.length)money.push(['狀態',p.money]);
 if(c.folderPath)files.push(['案子資料夾',c.folderPath]);(c.links||[]).forEach(l=>files.push([l.label||({pool:'Pool（素材與專案檔）',review:'內審（給你看的版本）',pay:'付款',other:'連結'}[l.kind]),l.path||l.url]));
 return {client:c.org||'沒寫',doNext:p.next,block:c.progressBlocker||(p.g==='delivered'?'等對方付款':'沒有卡住'),left:p.due,leftSub:'',dates,money,team:[[p.who,'負責'],['你','拍板']],files}};
{const _zp=zoneProj;zoneProj=function(){const s=S.sub.proj;if(s==='proj')return _zp();   // v39：待辦、封存卡照設計稿（標籤、標題、一句話），舊版正式功能收進「⋯」
 const h=_zp(),k=s==='todo'?'待辦':'封存',i=h.indexOf(`<section class="sec"><h2 class="vh">${k}</h2>`);if(i<0)return h;const a=DB[s];
 return h.slice(0,i)+`<section class="sec"><h2 class="vh">${k}</h2><div class="stack stg">${a.map(t=>`<article class="card cardx" data-card="${esc(t.id)}">${mineB(s+':'+t.id,t.title)}<div class="meta">${chip(t.st)}</div><h3>${esc(t.title)}</h3>${t.next?`<p>${esc(t.next)}</p>`:''}</article>`).join('')}</div></section>`}}
const swNC=()=>`<div class="mi msw"><div class="sync"><span class="st">同步到行事曆（還沒接上）</span><button class="swi" role="switch" aria-checked="false" aria-label="同步到行事曆" data-act="nc" data-id="行事曆還沒接上"></button></div></div>`;
{const _ms=mineSheet;mineSheet=function(id){const i=id.indexOf(':'),k=id.slice(0,i),x=id.slice(i+1);
 if(k==='opp'){const o=DB.opp.find(q=>q.id===x);if(!o)return shHead('這張機會不在了');const c=o.raw||{};   // 設計稿：暫存或放回、刪掉；舊版的「要做，建資料夾」收在這裡
  return _ms(id).replace(/<\/div>$/,(c.folderStatus==='none'||!c.folderStatus?mi('✓','要做，建案子資料夾','build',x):'')+'</div>')}
 if(k==='todo'){const t=DB.todo.find(q=>q.id===x);if(!t)return shHead('這件不在了');return shHead(esc(t.title))+`<div class="mlist">${t.run?mi('✓',esc(t.st),'nc','已經交給大器了，進度會寫回這張卡'):mi('▶','去執行','run',x)}</div>`}
 if(k==='arch'){const t=DB.arch.find(q=>q.id===x);if(!t)return shHead('這件不在了');return shHead(esc(t.title))+`<div class="mlist">${mi('↶','放回進行中','preopen',x)}${mi('🗑','徹底刪除（不進封存區）','ppurge',x)}</div>`}
 if(k==='pclose'){const p=DB.proj.find(q=>q.id===x);if(!p)return shHead('這件不在了');return shHead('結案：'+esc(p.title))+`<div class="mlist">${Object.keys(PCR).map(r=>mi('✓',PCR[r],'pclosedo',x+'|'+r)).join('')}</div>`}
 if(k!=='proj')return _ms(id);
 const p=DB.proj.find(q=>q.id===x);if(!p)return shHead('這件不在了');const st=p.raw.status,done=p.cur>=p.steps.length;
 let r=(done?'':mi('✓',`「${esc(p.steps[p.cur])}」做完了`,'mstep',x))+(p.cur>0?mi('↶','退回上一步','mstepb',x):'')+mi('📅','改日期','mdate',x)+swNC();   // 設計稿四項
 if(st==='doing')r+=mi('✓','已交件，等收款','pdeliver',x);if(st==='delivered')r+=mi('✓','已收款','ppaid',x)+mi('↶','退回進行中','pback',x);if(st==='paid')r+=mi('↶','退回等收款','pback2',x);
 r+=mi('▣','結案，收進封存','sheet','mine:pclose:'+x);
 return shHead(esc(p.title))+`<div class="mlist">${r}</div>`}}
async function projDo(id,action,o,msg){closeThen(async()=>{try{const c=await LV.api.act(id,action,o||{});if(c){const i=LV.items.findIndex(x=>x.id===id);if(i>-1)LV.items[i]=c}LV.sig='';paint();toast(msg);reload()}catch(e){toast('沒有成功：'+LERR(e))}})}
ACT.pdeliver=id=>projDo(id,'deliver',null,'標成已交件，收進「等收款」');
ACT.ppaid=id=>projDo(id,'paid',{patch:{}},'標成已收款');
ACT.pback=id=>projDo(id,'back',{to:'doing'},'退回進行中');
ACT.pback2=id=>projDo(id,'back',{to:'delivered'},'退回等收款');
ACT.run=id=>projDo(id,'run',null,'交給大器了，進度會寫回這張卡');
const PCR={won:'得標／核定',lost:'未得標',submitted:'已送件結案',void:'作廢（做一半不要了）'};
// v39：「這步做完」「退回上一步」照設計稿。有大器寫的步驟就改步驟（opp_progress_set 只帶 p_steps）；沒有步驟就照製作→交件→收款改狀態
function stepsSet(p,cur){return p.raw.progressSteps.map((x,i)=>({name:x.name,note:x.note||'',status:x.status==='skipped'?'skipped':i<cur?'done':i===cur?'current':'pending'}))}
function stepGo(id,dir){const p=DB.proj.find(q=>q.id===id);if(!p)return;const o=p.cur,n=o+dir,lab=dir>0?`「${p.steps[o]}」做完了`:`退回「${p.steps[n]}」`;
 if(p.raw.progressSteps.length){const nw=stepsSet(p,n),old=stepsSet(p,o);
  closeThen(async()=>{try{const c=await LV.api.act(id,'steps',{steps:nw});if(c){const i=LV.items.findIndex(x=>x.id===id);if(i>-1)LV.items[i]=c}LV.sig='';paint();
   toast(lab,async()=>{try{await LV.api.act(id,'steps',{steps:old});reload();toast('還原了')}catch(e){toast('沒還原：'+LERR(e))}})}catch(e){toast('沒有成功：'+LERR(e))}})}
 else{const st=p.raw.status;if(dir>0){if(st==='doing')ACT.pdeliver(id);else if(st==='delivered')ACT.ppaid(id)}else{if(st==='delivered')ACT.pback(id);else if(st==='paid')ACT.pback2(id)}}}
ACT.mstep=id=>stepGo(id,1);ACT.mstepb=id=>stepGo(id,-1);
ACT.pclosedo=v=>{const [id,r]=v.split('|'),p=DB.proj.find(q=>q.id===id);if(!p||!PCR[r])return;let ok=false;try{ok=confirm(`把「${p.title}」標成「${PCR[r]}」，收進封存？之後可以在封存放回進行中。`)}catch(e){}if(!ok)return;
 closeThen(async()=>{try{await LV.api.act(id,'close',{result:r});toast('收進封存了：'+PCR[r]);const a=await LV.api.archive('',null);LV.arch=a.items||[];reload()}catch(e){toast('沒有成功：'+LERR(e))}})};
ACT.preopen=id=>closeThen(async()=>{try{await LV.api.act(id,'reopen');toast('放回進行中了');const a=await LV.api.archive('',null);LV.arch=a.items||[];reload()}catch(e){toast('沒有成功：'+LERR(e))}});
ACT.ppurge=id=>{const t=DB.arch.find(q=>q.id===id);if(!t)return;let v=null;try{v=prompt('徹底刪除後面板和封存都找不回來（電腦裡的資料夾不會動）。\n要刪就輸入完整案名：\n'+t.title)}catch(e){}if(v==null)return;if(v.trim()!==t.title){toast('案名不對，沒有刪');return}
 closeThen(async()=>{try{await LV.api.act(id,'purge',{confirm:v.trim()});toast('徹底刪除了');const a=await LV.api.archive('',null);LV.arch=a.items||[];reload()}catch(e){toast('沒有刪：'+LERR(e))}})};
ACT.nc=msg=>toast(msg||'這個動作還沒接上');

const DZ={mzHero,mz2HTML,mzIn,mzOut};   // v43：先存設計稿原版，接上錢總覽時用原版，讀不到時退回下面的訂閱版
/* ---------- 錢：設計稿的大卡三頁；有後端的只有訂閱 ---------- */
mzHero=function(){const st=FRESH.tata,ss=subs(),d=due7();
 const s1=LV.money?`<p class="mzhl">${aiF('tata','money')}<span>塔塔・每月訂閱</span></p><p class="mzsay">每月固定支出 ${nt(monthSelf())}，${d.length?`7 天內要扣 ${d.length} 筆`:'7 天內沒有要扣的'}。</p><p class="mzcmp"><span>自付 ${ss.filter(s=>s.payer==='自付').length} 筆・公司付 ${ss.filter(s=>s.payer!=='自付').length} 筆${ss.some(s=>s.cancel)?'・▲ 有想取消的':''}</span></p>`
  :`<p class="mzhl">${aiF('tata','money')}<span>塔塔・每月訂閱</span></p><p class="mzsay">${esc(LV.moneyErr||'訂閱資料還沒讀到')}</p>`;
 const sl=[{id:'S',name:'訂閱',html:s1},{id:'A',name:'撐多久',html:`<p class="mzhl"><span>撐多久</span></p><p class="mzsay">${esc(LV.moErr||'帳戶讀不到')}</p>`},{id:'B',name:'這三個月',html:`<p class="mzhl"><span>這三個月</span></p><p class="mzsay">${esc(LV.moErr||'收支讀不到')}</p>`}];
 const car=cvHTML('money',sl,'錢的看法',mzOn);
 return `<div class="zh zhx mz" data-z="money"><div class="zht"><h1>錢</h1><p class="zown">塔塔 ${esc(st)}・<span class="mzk">${CV.money.names[S.cv.money]}</span></p></div>${bigF('tata','money')}${car}</div>`};
mz2HTML=function(){const id=cvCur('money')||'S';if(id!=='S')return `<section class="sec">${sh('',id==='A'?'撐多久':'這三個月')}<div class="card lcard"><p>${esc(LV.moErr||'讀不到')}</p></div></section>`;
 const ss=subs(),d=due7();if(!LV.money)return `<section class="sec">${sh('','訂閱')}<div class="card lcard"><p>${esc(LV.moneyErr||'訂閱還沒讀到')}</p></div></section>`;
 if(!ss.length)return `<section class="sec">${sh('','訂閱','0 筆')}<div class="card lcard"><p>還沒有訂閱資料</p></div></section>`;
 let h=`<section class="sec">${sh('','7 天內要扣',d.length+' 筆')}${d.length?`<div class="hs">${d.map(s=>`<div class="card"><div class="meta">${chip(s.in<=0?'今天扣':s.in+' 天後扣',s.in<=2)}</div><h3>${esc(s.name)}</h3><p class="amt" style="color:var(--ink)">${nt(s.amt)}</p>${aifs([aiF('tata','sub:'+s.id)])}</div>`).join('')}</div>`:`<div class="card"><p>7 天內沒有要扣的。</p></div>`}</section>`;
 const op=S.open.subs!==false;
 h+=`<section class="sec"><div class="rows"><div class="rowi"><button class="rowb" data-act="open" data-id="subs" aria-expanded="${op}"><span class="tx"><b>全部訂閱 ${ss.length} 筆</b><small>自付 ${ss.filter(s=>s.payer==='自付').length}・公司付 ${ss.filter(s=>s.payer!=='自付').length}</small></span><span class="rt"><span class="chev" aria-hidden="true">${op?'⌃':'⌄'}</span></span></button></div>${op?ss.map(s=>`<div class="rowi"><button class="rowb" data-act="sheet" data-id="sub:${esc(s.id)}"><span class="tx"><b>${esc(s.name)}</b><small>${s.cancel?'▲ '+esc(s.cancel)+'・':''}${esc(s.cyc)}・${s.payer}・${s.in} 天後扣</small></span><span class="rt"><span class="amt">${nt(s.amt)}</span></span></button></div>`).join(''):''}</div></section>`;
 return h};
mzIn=function(){return `<section class="sec">${sh('','會進來的')}<div class="card lcard"><p>${esc(LV.moErr||'待收款讀不到')}</p><small>已交件的案子在「案子」房間的「已交件，等收款」。</small></div></section>`};
mzOut=function(){return `<section class="sec">${sh('','要出去的大筆')}<div class="card lcard"><p>${esc(LV.moErr||'帳單讀不到')}</p></div></section>`};
{const _s=sheetHTML;sheetHTML=function(){const a=S.sheet.split(':');if(a[0]!=='sub')return _s();const s=DB.subs.find(x=>x.id===a[1]);if(!s)return shHead('這筆不在了');
 return shHead(esc(s.name))+`<dl class="kv"><div><dt>金額</dt><dd>${nt(s.amt)}</dd></div><div><dt>週期</dt><dd>${esc(s.cyc)}</dd></div><div><dt>下次扣款</dt><dd>${esc(s.next||s.in+' 天後')}</dd></div><div><dt>誰付</dt><dd>${s.payer}</dd></div>${s.acct?`<div><dt>帳戶</dt><dd>${esc(s.acct)}</dd></div>`:''}</dl>${s.cancel?`<p class="err">▲ ${esc(s.cancel)}</p>`:''}${aifs([aiF('tata','sub:'+s.id)])}`}}

/* ---------- 生活：v39 用設計稿的 zoneLife（朋朋還沒綁定、各空狀態與按鈕），會寫的動作沒有後端，按了出現「還沒接上」 ---------- */
// v44：生活接上 hub_life_items（見檔尾「生活（v44）」）
/* 行事曆：建立、改時間、取消、改規則沒有後端 */
['synctog','syncyes','syncno','dtedit'].forEach(k=>{ACT[k]=()=>toast('案子日期同步到行事曆還沒接上')});   // v42：建立、改時間、取消、改規則改成交給大器（見檔尾）

/* ---------- 對話（v40，2026-11-22）：每隻都接上了。給大器的走櫃台；給其他隻的由 Mac 轉送程式 com.borry.current-bot-relay
   打到那隻的 webhook（集集經資料庫、塔塔直打、朋朋萌萌定定金金經霸霸），回覆用回覆票寫回 opp_msgs（bot 欄）。 ---------- */
const NAMES={daqi:'大器',jiji:'集集',tata:'塔塔',peng:'朋朋',din:'定定',kim:'金金',mon:'萌萌'};
const ctxItem=ctx=>{const a=(ctx||'').split(':');return (a[0]==='proj'||a[0]==='opp')&&LV.items.some(c=>c.id===a[1])?a[1]:null};
const HI=b=>b==='daqi'?'寫一句，或點下面的指令。只有大器本人回，回覆會出現在這裡。':`寫一句，${NAMES[b]||'它'}收到會回在這裡，通常幾分鐘。`;
const SEENK='opp_bot_seen';let SEEN=null,CPOLL=0,WAITB={};
function seenLoad(){if(SEEN)return SEEN;try{SEEN=JSON.parse(localStorage.getItem(SEENK)||'null')}catch(e){SEEN=null}return SEEN}
function seenSave(){try{localStorage.setItem(SEENK,JSON.stringify(SEEN))}catch(e){}}
function seenMark(b,id){seenLoad();if(!SEEN)SEEN={};if(id>(SEEN[b]||0)){SEEN[b]=id;seenSave()}delete UNREAD[b]}
// 未讀與「處理中」：每次輪詢讀 opp_bot_inbox（各隻的回覆與還在等的話）
async function pollInbox(){if(!LV.api||!LV.api.botInbox)return;let d;try{d=await LV.api.botInbox()}catch(e){return}
 const first=!seenLoad();if(first){SEEN={};d.replies.forEach(r=>{SEEN[r.bot]=Math.max(SEEN[r.bot]||0,r.id)});seenSave()}
 const was=Object.assign({},UNREAD),neu={};
 d.replies.forEach(r=>{if(r.id>(SEEN[r.bot]||0)&&!(S.chat&&S.chat.b===r.bot))neu[r.bot]=(neu[r.bot]||0)+1});
 Object.keys(NAMES).forEach(b=>{if(b==='daqi')return;if(neu[b])UNREAD[b]=neu[b];else delete UNREAD[b]});
 WAITB={};d.waiting.forEach(w=>{WAITB[w.bot]=1});
 Object.keys(neu).forEach(b=>{if(neu[b]>(was[b]||0))arrive2(b)});headSync();waitFaces()}
function arrive2(b){headSync();document.querySelectorAll('.hav,#chead').forEach(e=>{const k=e.dataset.b||(e.dataset.id||'').split('|')[0];if(k!==b)return;hop(e);const f=FACES.get(e.querySelector('.bm'));if(f&&!RM)f.poke()})}
// 等回覆的那隻，頭像改「思考中」
function waitFaces(){document.querySelectorAll('.hav,#chead').forEach(e=>{const k=e.dataset.b||(e.dataset.id||'').split('|')[0],m=e.querySelector('.bm');if(!m||!k)return;const want=WAITB[k]?'thinking':'idle';if(m.dataset.m!==want&&(m.dataset.m==='idle'||m.dataset.m==='thinking')){m.dataset.m=want;faceSync()}})}
async function loadMsgs(){const on=S.chat;if(!on||!LV.api)return;const b=on.b,id=ctxItem(on.ctx);
 try{const ms=await LV.api.msgs(id,b);if(!S.chat||S.chat.b!==b)return;const key=JSON.stringify(ms.map(m=>m.id));const fresh=key!==LV.thread,had=LV.thread;LV.thread=key;
  const last=ms[ms.length-1],waiting=b!=='daqi'&&last&&last.kind==='user';
  const pend=CH[b].filter(m=>m.local);
  CH[b]=ms.map(m=>({w:m.kind==='user'?'me':'bot',t:m.kind==='user'?String(m.body||'').replace(/^［老大在逐流[^］]*］\n?/,''):m.body,b})).concat(pend.length?pend:(waiting?[{w:'bot',wait:1,b}]:[]));
  if(!ms.length&&!pend.length)CH[b]=[{w:'bot',t:HI(b),b}];
  const lb=ms.filter(m=>m.kind==='bot').pop();if(lb)seenMark(b,lb.id);
  if(fresh){logSync();if(had&&last&&last.kind!=='user'){mood(b,'speaking');hop($('#cAv'));setTimeout(()=>{if(S.chat&&S.chat.b===b)mood(b,'idle')},2200)}else mood(b,waiting?'thinking':'idle')}
  clearTimeout(CPOLL);if(waiting&&!document.hidden)CPOLL=setTimeout(loadMsgs,20000)}   // 2026-11-24 DB 降載：等回覆時 8 秒改 20 秒
 catch(e){CH[b]=[{w:'bot',t:'對話讀不到：'+LERR(e),b}];logSync()}}
{const _o=openChat;openChat=function(b,ctx,el,auto){if(!CH[b])CH[b]=[];clearTimeout(CPOLL);
 LV.thread='';CH[b]=[{w:'bot',t:'讀取中…',b}];delete UNREAD[b];setTimeout(loadMsgs,0);
 return _o(b,ctx,el,auto)}}
// 朋朋的對話不用先綁定（綁定是生活房間購物用的，還沒接上）
{const _l=logSync;logSync=function(){const sb=S.bound;if(S.chat&&S.chat.b==='peng')S.bound=true;try{_l()}finally{S.bound=sb}}}
// 傳給機器人時帶上「老大在哪一頁、看著哪張卡」，不然它不知道在回什麼（老大 2026-11-22：「我在上面跟他們溝通結果他們都不知道在回答什麼欸」）
const ROOMN={today:'首頁',proj:'案子房間',opp:'機會房間',money:'錢房間',life:'生活房間'};
function ctxTag(b,ctx){const a=(ctx||'').split(':'),k=a[0];let on='';
 try{if(k==='goal'||k==='gr'){const g=gOf(a[1]);if(g)on=`目標「${g.name}」：${g.label||'進度'} ${g.now}／${g.total} ${g.unit||''}${g.due?`，期限 ${g.due}`:''}${g.stText?`，${g.stText}`:''}`}
  else if(k==='goals')on='目標總覽頁';
  else if(k==='opp'){const o=DB.opp.find(x=>x.id===a[1]);if(o)on=`機會卡「${o.title}」（${o.org}，${o.amt}，${o.due}）`}
  else if(k==='proj'){const p=DB.proj.find(x=>x.id===a[1]);if(p)on=`案子「${p.title}」，下一步：${p.ask||''}`}
  else{const n=ctxName(ctx);if(n)on=`「${n}」`}}catch(e){}
 const room=ROOMN[S.tab]||'';if(!on&&!room)return '';
 return `［老大在逐流${room?'的'+room:''}${on?'，正在看'+on:''}］\n`}
function sendTo(b,text,ctx){const a=(ctx||'').split(':'),id=ctxItem(ctx),d=a[0]==='dec'?DB.dec.find(x=>x.id===a[1]):null,body=d?`關於「${d.proj}：${d.q}」：${text}`:ctxTag(b,ctx)+text;
 const w={w:'bot',wait:1,local:1,b,fresh:1};CH[b]=CH[b].filter(m=>m.t!==HI(b)&&m.t!=='讀取中…');CH[b].push({w:'me',t:text,fresh:1,local:1},w);mood(b,'thinking');hop($('#cAv'));logSync();
 LV.api.say(id,body,b).then(()=>{CH[b]=CH[b].filter(m=>!m.local);if(b!=='daqi'){WAITB[b]=1;waitFaces()}setTimeout(loadMsgs,800)})
  .catch(e=>{const i=CH[b].indexOf(w);if(i>-1)CH[b].splice(i,1,{w:'bot',t:'沒送出：'+LERR(e)+'。這句還在上面，可以再傳一次。',b,fresh:1});CH[b].forEach(m=>{delete m.local});mood(b,'idle');logSync()})}
say=function(b,text,ctx){
 if(b==='jiji'){const id=(ctx||'').split(':')[1];
  if(id&&/建資料夾|要做/.test(text)&&/建/.test(text)){CH.jiji.push({w:'me',t:text,fresh:1});oppDo(id,'build','要做了，Mac 的程式會建案子資料夾');CH.jiji.push({w:'bot',t:'已送出「要做，建資料夾」，進度看這張卡。（這是直接動作，不是集集回話）',fresh:1});logSync();return}
  if(/^(立即)?掃描|只掃創作資金/.test(text)){const fund=/創作資金/.test(text);CH.jiji.push({w:'me',t:text,fresh:1},{w:'bot',t:fund?'已送出「只掃創作資金」，新卡片會直接放進清單。（這是直接動作，不是集集回話）':'已送出「立即掃描」，新卡片會直接放進清單。（這是直接動作，不是集集回話）',fresh:1});logSync();if(fund){LV.api.scanRequest('funding').then(()=>{S.scan=1;S.scanAt=Date.now();render('keep');schedule()}).catch(e=>toast('沒叫到集集：'+LERR(e)))}else ACT.scan();return}
  if(id&&/讀完整公告/.test(text)){CH.jiji.push({w:'me',t:text,fresh:1});oppDo(id,'dive','已請集集讀完整公告');CH.jiji.push({w:'bot',t:'已送出「讀完整公告」，讀完放在卡片的「完整公告」。（這是直接動作，不是集集回話）',fresh:1});logSync();return}}
 sendTo(b,text,ctx)};
ACT.askdin=(ctx,el)=>openChat('din',ctx,el);
ACT.cmd=id=>{const i=id.indexOf(':'),b=id.slice(0,i),c=id.slice(i+1);if(b==='jiji'&&/掃描/.test(c))return ACT.scan();if(!NAMES[b])return;openChat(b,'',null,()=>say(b,c,''))};


/* ---------- v41（2026-11-22）：目標接上 hub_goals ----------
   讀 hub_goals_list、寫 hub_goal_set（老大本人或可編輯的金鑰）。初始七個是設計稿的目標，資料庫標 demo＝示意值，老大改過就不再標。
   設計稿的卡片、整頁、各房間色卡目標頁照原樣；只換資料與會寫回去的動作。 */
LV.goals=null;LV.goalsErr='';LV.cal=null;LV.life=null;LV.mo=null;LV.moErr='';
async function loadExtra(){const api=LV.api,jobs=[];
 if(ZN('goals')&&api.goals)jobs.push(api.goals().then(d=>{LV.goals=d;LV.goalsErr=''}).catch(e=>{LV.goalsErr=LERR(e);ZE('goals')}));
 if(ZN('cal')&&api.cal)jobs.push(api.cal(14).then(d=>{LV.cal=d}).catch(()=>{ZE('cal')}));
 if(ZN('life')&&api.life)jobs.push(api.life().then(d=>{LV.life=d}).catch(()=>{ZE('life')}));
 if(ZN('mo')&&api.moneyOverview&&!LV.moNo)jobs.push(api.moneyOverview().then(d=>{LV.mo=d;LV.moErr=''}).catch(e=>{LV.mo=null;LV.moNo=!!(e&&e.kind==='forbidden');LV.moErr=LV.moNo?'這把金鑰不能看錢的資料，只有老大本人的網址能看':LERR(e);if(!LV.moNo)ZE('mo')}));
 await Promise.all(jobs)}
const CLN=s=>String(s==null?'':s).replace(/[<>&"'`]/g,'');
const ISOD=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const DOFF=iso=>{if(!iso)return null;const a=String(iso).slice(0,10).split('-').map(Number),t=new Date();t.setHours(0,0,0,0);return Math.round((new Date(a[0],a[1]-1,a[2])-t)/864e5)};
const MON=()=>{const t=new Date();t.setHours(0,0,0,0);t.setDate(t.getDate()-((t.getDay()+6)%7));return ISOD(t)};
function gDueTxt(iso){if(!iso)return '';const a=String(iso).slice(0,10).split('-').map(Number);return a[0]===new Date().getFullYear()?a[1]+'/'+a[2]:a[0]+'/'+a[1]+'/'+a[2]}
function gDueIso(t){t=String(t||'').trim();if(!t)return '';let m=t.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);if(m)return m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');
 m=t.match(/^(\d{1,2})[\/\-.](\d{1,2})$/);if(m){const n=new Date(),y=n.getFullYear(),d=new Date(y,+m[1]-1,+m[2]);if(d<n)d.setFullYear(y+1);return ISOD(d)}return null}
function mapGoal(r){const unit=CLN(r.unit),now=+r.now_val||0,total=+r.total||1,ex=r.expect!=null?+r.expect:null,left=DOFF(r.due);
 let week=null,nowv=now;if(Array.isArray(r.week)||(r.week&&r.week.d)){const w=r.week&&r.week.d?r.week:{mon:MON(),d:[0,0,0,0,0,0,0]};week=w.mon===MON()?w.d.slice(0,7):[0,0,0,0,0,0,0];nowv=week.reduce((a,b)=>a+(b?1:0),0)}
 const idle=r.updated_at?Math.floor((Date.now()-Date.parse(r.updated_at))/864e5):0;
 let st='ok',stText='照進度';if(r.status==='done'){stText='達成了'}else if(r.kind==='bar'&&ex!=null&&now<ex){st='late';stText=`慢 ${+(ex-now).toFixed(1)} ${unit}`}else if(!nowv&&idle>=30){st='stall';stText=`${idle} 天沒動`}else if(week&&nowv>=total)stText='這週達標';
 const nm=CLN(r.name);
 const base=(r.demo?'示意值，請老大改。':'')+(ex!=null?`照進度今天該到 ${ex} ${unit}${now<ex?`，慢了 ${+(ex-now).toFixed(1)} ${unit}`:''}。`:'')+(left!=null&&r.status!=='done'?`離期限還有 ${left} 天。`:'')||'還沒有進度說明。';
 return {id:r.id,name:r.name,why:r.why||'還沒寫為什麼。',due:gDueTxt(r.due),dueIso:r.due||'',dueWhat:CLN(r.due_what),left,kind:r.kind==='pips'?'pips':'bar',now:nowv,total,unit,expect:ex,label:CLN(r.label)||'目前',
  st,stText,short:`${nm.slice(0,8)} ${nowv}／${total}${unit?' '+unit:''}`,extra:r.extra||'',base,next:r.next_step||'還沒定下一步。',src:r.src||'自己改',auto:r.auto?1:0,
  steps:Array.isArray(r.steps)?r.steps.map(x=>[String(x[0]||''),x[1]==='d'?'d':x[1]==='n'?'n':'',String(x[2]||'')]):null,week,room:r.room,bot:r.bot||'daqi',money:r.room==='money'?1:0,demo:!!r.demo,sort:r.sort,raw:r}}
function applyExtra(){
 if(LV.goals){GL.list=(LV.goals.items||[]).map(mapGoal);GL.dropped=(LV.goals.dropped||[]).map(d=>({id:d.id,name:d.name}));const f=GL.list.find(g=>g.raw.focus);GL.focus=f?f.id:null}else{GL.list=[];GL.dropped=[];GL.focus=null}
 if(typeof applyCal==='function')applyCal();if(typeof applyLife==='function')applyLife();if(typeof applyMoney==='function')applyMoney()}
const reloadGoals=()=>LV.api.goals().then(d=>{LV.goals=d;LV.sig='';paint()}).catch(()=>{});
// 寫一筆目標：成功後重讀；undo 給「復原」用
function gw(id,patch,msg,undo){return LV.api.goalSet(id,patch).then(r=>{reloadGoals();if(msg)toast(msg,undo?()=>LV.api.goalSet(undo.id||id,undo.patch).then(reloadGoals).then(()=>toast('還原了')).catch(e=>toast('沒還原：'+LERR(e))):null);return r}).catch(e=>{toast('沒存上：'+LERR(e));reloadGoals()})}
ACT.gsave=id=>{const n=$('#gName'),v=n?n.value.trim():'';if(!v){S.err='gform';render('keep');const x=$('#gName');if(x)x.focus();return}
 const why=$('#gWhy').value.trim(),dt=$('#gDue').value.trim(),due=gDueIso(dt);if(due===null){toast('期限看不懂，寫成 2027/3/31 或 3/31');return}S.err='';
 if(id){const g=gOf(id);if(!g)return;const o={name:g.name,why:g.raw.why||'',due:g.dueIso||''};S.gk=null;closeThen(()=>gw(id,{name:v,why,due},'存好了',{patch:o}));return}
 const k=S.gk||'self',bot={proj:'daqi',opp:'jiji',money:'kim',self:'din'}[k],room=k==='self'?'life':k;S.gk=null;
 const src={proj:'案子房間，連到哪個案子由大器問你',opp:'機會房間，連到哪類機會由集集問你',money:'錢房間，連到哪個帳戶由塔塔問你',self:'自己打勾'}[k];
 closeThen(()=>gw(null,{name:v,why,due,room,bot,auto:k!=='self',src,kind:'pips',total:1,unit:'步',label:'走到',steps:[['第一步','','']],sort:900},'立好了：'+v).then(r=>{if(r&&r.id){window.__lastGoal=r.id}}))};
ACT.gfocus=id=>{const pf=GL.focus,on=pf!==id;closeThen(()=>gw(on?id:pf,{focus:on},on?'這週主推：'+(gOf(id)||{}).name:'取消這週主推',pf&&on?{id:pf,patch:{focus:true}}:{id:on?id:pf,patch:{focus:!on}}))};
function gmv2(id,d){const a=GL.list,i=a.findIndex(x=>x.id===id),j=i+d;if(i<0||j<0||j>=a.length)return;const x=a[i],y=a[j],sx=x.raw.sort,sy2=y.raw.sort;
 let nx=sy2,ny=sx;if(nx===ny){nx=(j+1)*10;ny=(i+1)*10}   // 一樣的排序值先拉開
 closeThen(()=>Promise.all([LV.api.goalSet(x.id,{sort:nx}),LV.api.goalSet(y.id,{sort:ny})]).then(()=>{reloadGoals();toast(d<0?'往上排了':'往下排了',()=>Promise.all([LV.api.goalSet(x.id,{sort:sx}),LV.api.goalSet(y.id,{sort:sy2})]).then(reloadGoals))}).catch(e=>toast('沒排好：'+LERR(e))))}
ACT.gup=id=>gmv2(id,-1);ACT.gdn=id=>gmv2(id,1);
ACT.gdrop=id=>{const g=gOf(id);if(!g)return;const onGoal=S.page==='goal:'+id;closeThen(()=>{const go=()=>gw(id,{status:'dropped',focus:false},'放掉了：'+g.name,{patch:{status:'active'}});if(onGoal){after=go;back()}else go()})};
ACT.grevive=id=>gw(id,{status:'active'},'撿回來了',{patch:{status:'dropped'}});
ACT.gcheck=id=>{const g=gOf(id);if(!g)return;const d=(g.week||[0,0,0,0,0,0,0]).slice(),i=(new Date().getDay()+6)%7,old={mon:MON(),d:d.slice()};
 if(d[i]){toast('今天已經記過了');return}d[i]=1;const n=d.reduce((a,b)=>a+(b?1:0),0);gw(id,{week:{mon:MON(),d},now_val:n},`記下了，本週 ${n}／${g.total}`,{patch:{week:old,now_val:n-1}})};
ACT.gstep=id=>{const g=gOf(id);if(!g||!g.steps)return;const o=JSON.parse(JSON.stringify(g.raw.steps)),st=JSON.parse(JSON.stringify(g.raw.steps)),k=Math.min(Math.round(g.now),st.length-1);
 if(g.now>=g.total){toast('都做完了');return}st[k][1]='d';st[k][2]=LMD(Date.now())+' 完成';if(st[k+1])st[k+1][1]='n';
 gw(id,{steps:st,now_val:g.now+1,next_step:st[k+1]?st[k+1][0]+'。':'都做完了。'},'往前一步',{patch:{steps:o,now_val:g.now,next_step:g.raw.next_step}})};
ACT.gfix=arg=>{const [id,how]=arg.split('|'),g=gOf(id);if(!g)return;if(how==='move'){ACT.sheet('gform:'+id);return}
 openChat('daqi','goal:'+id,null,()=>say('daqi',`目標「${g.name}」${g.stText}，請幫我排追趕的每週量，排好寫回目標的下一步。`,'goal:'+id))};
ACT.gnum=id=>{const g=gOf(id);if(!g)return;let v=null;try{v=prompt(`「${g.name}」現在到多少？（目標 ${g.total} ${g.unit}）`,String(g.now))}catch(e){}if(v==null)return;const n=+String(v).replace(/[^\d.]/g,'');if(!isFinite(n)||String(v).trim()===''){toast('要寫數字');return}
 gw(id,{now_val:n},`改成 ${n}／${g.total} ${g.unit}`,{patch:{now_val:g.raw.now_val}})};
ACT.gnext=id=>{const g=gOf(id);if(!g)return;let v=null;try{v=prompt('下一步寫什麼？',g.raw.next_step||'')}catch(e){}if(v==null)return;gw(id,{next_step:v.trim()},'下一步改好了',{patch:{next_step:g.raw.next_step}})};
ACT.gtotal=id=>{const g=gOf(id);if(!g)return;let v=null;try{v=prompt(`「${g.name}」的總數（單位：${g.unit||'沒寫'}）`,String(g.total))}catch(e){}if(v==null)return;const n=+String(v).replace(/[^\d.]/g,'');if(!(n>0)){toast('要寫大於 0 的數字');return}gw(id,{total:n},'總數改好了',{patch:{total:g.raw.total}})};
// 「⋯」多三項：改目前進度、改總數、改下一步（初始資料是示意值，要能直接改）
{const _ms=mineSheet;mineSheet=function(id){const h=_ms(id),i=id.indexOf(':'),k=id.slice(0,i),x=id.slice(i+1);if(k!=='goal')return h;const g=gOf(x);if(!g)return h;
 const add=mi('#',`改目前進度（現在 ${g.now}／${g.total}${g.unit?' '+esc(g.unit):''}）`,'gnum',x)+mi('#','改總數','gtotal',x)+mi('✎','改下一步','gnext',x)+(g.demo?`<p class="note" style="padding:6px 4px">這是示意值，改過任一項就不再標示意。</p>`:'');
 const j=h.indexOf('<div class="mlist">');return j<0?h:h.slice(0,j+19)+add+h.slice(j+19)}}
// 定定的建議套用：設計稿只改畫面，這裡把主推與下一步寫回去
{const _d=ACT.dinapply;ACT.dinapply=function(mid){const before=GL.list.map(g=>[g.id,g.next]),pf=GL.focus;const r=_d.apply(this,arguments);
 setTimeout(()=>{if(GL.focus!==pf&&GL.focus)LV.api.goalSet(GL.focus,{focus:true}).then(reloadGoals).catch(()=>{});GL.list.forEach(g=>{const b=before.find(x=>x[0]===g.id);if(b&&b[1]!==g.next)LV.api.goalSet(g.id,{next_step:g.next}).catch(()=>{})})},50);return r}}
WRITE.push('gsave','gfocus','gup','gdn','gdrop','grevive','gcheck','gstep','gnum','gtotal','gnext');

/* ---------- v42（2026-11-22）：行事曆接上 hub_cal_events ----------
   Mac 的 com.borry.current-cal-sync 每 30 分鐘用 borrysu 的 Google 行事曆唯讀同步未來 14 天（個人全部、公司只放標題有 Borry 的）。
   面板不直接寫行事曆：新增、改時間、取消、改規則都寫成一句話交給大器，大器照 14 號行事曆準則在兩本行事曆上做。 */
CAT['?']=['沒分類','#8a8a8a'];
function mapCal(e){const loc=e.start?new Date(e.start):null,day=loc?new Date(loc):e.start_date?new Date(e.start_date+'T00:00:00'):null;if(!day)return null;day.setHours(0,0,0,0);
 const t0=new Date();t0.setHours(0,0,0,0);let d=Math.round((day-t0)/864e5);if(d<0)d=0;
 const hm=x=>x?String(new Date(x).getHours()).padStart(2,'0')+':'+String(new Date(x).getMinutes()).padStart(2,'0'):'';
 const raw=String(e.title||''),o={id:e.id,d,t:e.all_day?'':hm(e.start),e:e.all_day?'':hm(e.end),all:e.all_day?1:0,place:e.location||'',src:e.cal==='co'?'co':'me',link:LWEB(e.link),real:1};
 if(o.src==='co'){const m=raw.match(/^【([^】]+)】\s*(.*)$/);o.cs=m?m[1]:'好咖';o.n=(m?m[2]:raw).replace(/\s*@[^@]*$/,'').trim()||raw;o.why='標題有 @Borry'}
 else{const m=raw.match(/^([SEWCL])[.．]\s*(.*)$/);o.cat=m?m[1]:'?';o.n=m?m[2]:raw}
 return o}
function applyCal(){CAL.length=0;if(LV.cal&&Array.isArray(LV.cal.items))LV.cal.items.map(mapCal).filter(Boolean).forEach(x=>CAL.push(x));calFix()}
/* 2026-11-25 行事曆資料修正（老大：「面板行事曆有很多資料好像都很怪」「我覺得要把張弛排的算忙碌」）
   ①多天的全天行程每天都顯示（原本只顯示第一天，或過了開始日就全擠在今天），名稱後加「（第 2／4 天）」；
   ②公司行事曆與個人行事曆同一個時段、同一件事，只留公司那筆，標「個人行事曆也有」；
   ③張弛排的開工時段（hub_tide_plan kind=start，有 est_hours）算成忙碌，顯示成「張弛排」；
   退回：把 applyCal 最後的 calFix() 拿掉。 */
const calKey=t=>String(t||'').replace(/^[A-Za-z]\.|^【[^】]*】|\s*[@＠].*$|[（(][^）)]*[）)]/g,'').replace(/[\s｜|,，、:：]/g,'').toLowerCase();
function calFix(){if(!LV.cal||!Array.isArray(LV.cal.items))return;
 const t0=new Date(Date.now()+8*3600e3);t0.setUTCHours(0,0,0,0);
 // ①
 LV.cal.items.forEach(raw=>{if(!raw.all_day||!raw.start_date||!raw.end_date)return;
  const s0=Date.parse(raw.start_date+'T00:00:00Z'),e0=Date.parse(raw.end_date+'T00:00:00Z'),n=Math.round((e0-s0)/864e5);if(n<=1)return;
  const base=CAL.find(e=>e.id===raw.id);if(!base)return;
  for(let k=0;k<n;k++){const d=Math.round((s0+k*864e5-t0.getTime())/864e5);if(d<0||d>13)continue;
   const tag=`（第 ${k+1}／${n} 天）`;
   if(d===base.d&&!base.spanSet){base.n=base.n+tag;base.spanSet=1;continue}
   CAL.push(Object.assign({},base,{id:base.id+'#'+d,d,n:String(base.n).replace(/（第 \d+／\d+ 天）$/,'')+tag,spanSet:1}))}
  // 開始日在今天以前、被擠到今天的那筆，改成今天這一天的標記
  const sd=Math.round((s0-t0.getTime())/864e5);if(sd<0&&!base.spanSet){const k=-sd;base.n=base.n+`（第 ${k+1}／${n} 天）`;base.spanSet=1}});
 // ②
 CAL.forEach(m=>{if(m.src!=='me'||m.all||!m.t||m.del)return;
  const c=CAL.find(x=>x.src==='co'&&!x.all&&x.d===m.d&&x.t===m.t&&x.e===m.e&&!x.del);
  if(c){m.del=1;m.dupOf=c.id;c.alsoMe=1}});
 // ③
 const tr=window.__tideRows||[];
 tr.forEach(r=>{if(r.kind!=='start'||!r.at)return;const est=+((r.meta||{}).est_hours||0);if(!(est>0))return;
  const x=new Date(Date.parse(r.at)+8*3600e3),d=Math.round((Date.UTC(x.getUTCFullYear(),x.getUTCMonth(),x.getUTCDate())-t0.getTime())/864e5);if(d<0||d>13)return;
  const hh=x.getUTCHours()+x.getUTCMinutes()/60,f=v=>String(Math.floor(v)).padStart(2,'0')+':'+String(Math.round((v%1)*60)).padStart(2,'0');
  CAL.push({id:'tide:'+r.id,d,t:f(hh),e:f(Math.min(24,hh+est)),all:0,n:'張弛排：'+String(r.title||'').replace(/\s*@Borry/i,''),src:'tide',place:'',why:'張弛照交件倒推排的開工時段（不在 Google 行事曆上）',from:1,go:'',real:0})})}
window.__zl=Object.assign(window.__zl||{},{reCal:()=>{applyCal();LV.sig='';paint()}});
{const _cs=calSheet;calSheet=function(id){if(String(id).startsWith('tide:')){const e=calFind(id);if(!e)return shHead('這段不在了');return shHead(esc(e.n))+`<div class="meta" style="margin-top:8px"><span class="lbl">${dlw(e.d)}　${e.t}～${e.e}</span></div><p style="margin-top:8px">張弛照你的交件時間往回推，建議這段開工。它不在 Google 行事曆上，所以這裡不能改時間；要調整就跟大器說。</p>`}return _cs(id)}}
function calAsk(text,ok){LV.api.say(null,'【行事曆】'+text+'（照 14 號行事曆準則建立或修改，做完回報；逐流面板只讀，同步後會出現在行程）','daqi').then(()=>toast(ok)).catch(e=>toast('沒送出：'+LERR(e)))}
ACT.calmk=()=>{const t=$('#nlT'),txt=t?t.value.trim():'',f=readForm(),c=ctlOf();
 const title=f.title||txt;if(!title){const x=$('#cfErr');if(x)x.hidden=false;if(t)t.focus();return}
 const when=f.n!=null&&f.n>=0?dl(f.n)+(f.s?' '+f.s+(f.e?'～'+f.e:''):'（全天）'):'';
 const where=c.co||c.me?[c.co?'公司「好咖文創」':'',c.me?`個人${c.cat?' '+c.cat+'.'+(CAT[c.cat]||['',''])[0]:''}${c.lead?'（提前 '+c.lead+' 天）':''}`:''].filter(Boolean).join('＋'):'你判斷放哪本';
 const body=`新增行程：${txt?'老大原話「'+txt+'」，以原話為準；面板初步整理：':''}標題「${title}」${when?'，'+when:''}${f.place?'，地點 '+f.place:''}${f.who?'，跟 '+f.who:''}${f.note?'，備註 '+f.note:''}，放 ${where}`;
 closeThen(()=>calAsk(body,'交給大器建立了，同步後會出現在行程（約 30 分鐘內）'))};
ACT.evsave=id=>{const e=CAL.find(x=>x.id===id),v=($('#evT')||{}).value;if(!e||!v)return;closeThen(()=>calAsk(`把「${e.n}」（${dl(e.d)}${e.t?' '+e.t:''}，${e.src==='co'?'公司':'個人'}）改到 ${v}`,'改時間交給大器了，改好會同步回來'))};
ACT.evcancel=id=>{const e=CAL.find(x=>x.id===id);if(!e)return;closeThen(()=>calAsk(`取消「${e.n}」（${dl(e.d)}${e.t?' '+e.t:''}，${e.src==='co'?'公司':'個人'}）`,'取消交給大器了，拿掉後會同步回來'))};
ACT.evundo=id=>{const e=CAL.find(x=>x.id===id);if(!e)return;calAsk(`剛剛取消「${e.n}」的請求作廢，請保留這筆`,'跟大器說保留了')};
ACT.rlsave=id=>{const t=$('#rlT'),v=t?t.value.trim():'';S.ruleEd=null;render('keep');if(!v)return;calAsk(`行事曆規則第 ${+id+1} 條想改成：「${v}」。請先照 00_核心第 3 節判斷，改準則正本 14 號後回報`,'規則改寫交給大器了')};
WRITE.push('calmk','evsave','evcancel','evundo','rlsave');

/* ---------- v43（2026-11-22）：錢接上 hub_money_overview，塔塔記帳最常用的事搬進來 ----------
   讀：hub_money_overview（只讀；老大本人或管理員金鑰，AI協作金鑰看不到，照舊寫明）。撐多久、這三個月、金金說、會進來的、90 天大筆、該繳的、要你按的都用真資料，照設計稿原版畫。
   寫：逐流的金鑰沒有 kakeibo 的寫入權限（kakeibo 用 bot_keys），不放大權限：記一筆、標已繳、撤回都經塔塔對話（v40 轉送到塔塔的「記帳面板呼叫」webhook）請塔塔照記帳規則記。
   付款鈕：沒有付款後端，按了寫「還沒接上付款」。 */
KIND.other='固定支出';
const SAFEK='zl_mzsafe';
function mzArr(iso){const a=String(iso).slice(0,10).split('-').map(Number);return [a[0],a[1]-1,a[2]]}
function applyMoney(){const m=LV.mo;if(!m){return}
 const t=new Date();t.setHours(0,0,0,0);MZT.setTime(t.getTime());
 MZ.cash=+m.cash||0;MZ.monthly=(+m.burn>0?+m.burn:0)||monthSelf()||1;try{const v=+localStorage.getItem(SAFEK);if(v>0)MZ.safe=v}catch(e){}
 MZ.cashAt=(LV.at?LHM(LV.at):'')+' 讀取塔塔記帳';MZ.fixedIn={name:'沒有設定',amt:0,day:0};MZ.quote={proj:'',amt:0,wait:0};   // 報價中那張卡沒有資料來源，mzIn 會拿掉
 MZ.dec=[];MZ.chased={};MZ.decided={};
 MZ.recv=(m.recv||[]).map((r,i)=>{const est=!r.date,dd=r.date?mzArr(r.date):mzArr(ISOD(new Date(Date.now()+30*864e5)));
  return {id:'r'+i,p:r.id,proj:CLN(r.title),what:r.status==='delivered'?'尾款':'款項',amt:+r.amount||0,date:dd,st:r.status==='delivered'?'done':'signed',stT:r.status==='delivered'?'已交件，等付款':'進行中',total:+r.amount||0,got:0,term:est?'沒寫付款日，先估 30 天後':(r.terms||''),next:''}});
 MZ.big=(m.big||[]).filter(b=>b.date).map((b,i)=>({id:'b'+i,name:CLN(b.name),amt:+b.amount||0,date:mzArr(b.date),how:b.how==='分期'?'分期':'要自己付'}));
 const kv=((LV.hub&&LV.hub.events)||[]).filter(e=>/金金|Kim/i.test(e.actor||'')).sort((a,b)=>b.at-a.at)[0];
 MZ.kim=kv?{at:LAGO(kv.at),say:esc(kv.summary||''),why:[],todo:'有問題點我的臉直接問。'}:{at:'還沒有週報',say:'金金還沒寫這週的週報。點我的臉可以直接問。',why:[],todo:'週報寫好會出現在這裡。'};
 const kd=n=>/房租/.test(n)?'rent':/房貸|貸款|分期/.test(n)?'loan':/保險|壽險/.test(n)?'ins':/稅/.test(n)?'tax':/電|水|瓦斯|電信|網路/.test(n)?'util':'other';
 DB.due=(m.bills||[]).map(b=>{const id='b'+b.id,paid=b.paid?(b.paid_at?LMD(Date.parse(b.paid_at))+' 已繳':'這期已繳'):(LV.duePaid&&LV.duePaid[id]?LV.duePaid[id]:'');
  const d={id,bid:b.id,kind:b.kind==='card_payment'?'card':kd(b.name||''),name:b.name,amt:+b.amount||0,due:String(b.due_date).slice(5).replace('-','/').replace(/^0/,''),in:+b.days||0,auto:b.auto?1:0,from:b.account||'沒寫帳戶',to:b.account||'對方',paid,self:LV.duePaid&&LV.duePaid[id]?1:0};
  if(!d.auto&&!PAY['d_'+id])payReg('d_'+id,{amt:nt(d.amt),to:d.to,by:'tata',done(){}});return d})}
{const f=mzHero;mzHero=function(){return LV.mo?DZ.mzHero().replace('・今天都決定了',''):f()}}
{const f=mzDecs;mzDecs=function(){return MZ.dec.length?f():''}}   // 錢的「等你決定」沒有資料來源（設計稿是示意），沒有就不顯示
{const f=mz2HTML;mz2HTML=function(){return LV.mo?DZ.mz2HTML():f()}}
{const f=mzIn;mzIn=function(){if(!LV.mo)return f();return DZ.mzIn().replace(/<div class="card mzq">[\s\S]*?<\/div>/,'').replace(/<p class="note mzfoot">[\s\S]*?<\/p>/,'')}}
{const f=mzOut;mzOut=function(){return LV.mo?DZ.mzOut():f()}}
// 錢房間多四塊（塔塔記帳搬進來）：記一筆放在大卡下面；帳戶餘額、最近幾筆、訂閱放在最後
function kkQuick(){return `<section class="sec">${sh('tata','記一筆')}<div class="wadd"><label class="vh" for="kkIn">記一筆，一句話就好</label><input id="kkIn" type="text" placeholder="例：午餐 180 中信" enterkeyhint="send" autocomplete="off"><button class="btn pri" data-act="kkadd">交給塔塔</button></div>${S.err==='kk'?'<p class="err" role="alert">▲ 還沒寫字。寫金額和買了什麼就好。</p>':''}<p class="note">塔塔會整理成金額、分類、帳戶記進塔塔記帳，記好回在塔塔的對話。</p></section>`}
function kkAccts(){const a=(LV.mo.accounts||[]).filter(x=>x.kind!=='stock'||x.balance),op=!!S.open.kkacct;if(!a.length)return '';
 return `<section class="sec"><div class="rows"><div class="rowi"><button class="rowb" data-act="open" data-id="kkacct" aria-expanded="${op}"><span class="tx"><b>帳戶餘額 ${a.length} 個</b><small>能花的現金 ${nt(MZ.cash)}</small></span><span class="rt"><span class="chev" aria-hidden="true">${op?'⌃':'⌄'}</span></span></button></div>${op?a.map(x=>`<div class="rowi"><div class="rowb"><span class="tx"><b style="font-weight:500">${esc(x.name)}${x.suffix?'（'+esc(x.suffix)+'）':''}</b><small>${esc({bank:'銀行',cash:'現金',credit_card:'信用卡',e_money:'電子錢包',stock:'股票',investment:'投資',loan_in:'借來的',loan_out:'借出去的',other:'其他'}[x.kind]||x.kind)}${x.spendable?'・能花':''}</small></span><span class="rt"><span class="amt">${nt(+x.balance||0)}</span></span></div></div>`).join(''):''}</div></section>`}
function kkRecent(){const a=LV.mo.recent||[],op=S.open.kkrec!==false;if(!a.length)return '';
 return `<section class="sec"><div class="rows"><div class="rowi"><button class="rowb" data-act="open" data-id="kkrec" aria-expanded="${op}"><span class="tx"><b>最近 ${a.length} 筆</b><small>完整報表在塔塔記帳</small></span><span class="rt"><span class="chev" aria-hidden="true">${op?'⌃':'⌄'}</span></span></button></div>${op?a.map(x=>{const sg=x.type==='income'?'＋':x.type==='expense'?'－':'⇄';return `<div class="rowi"><div class="rowb"><span class="tx"><b style="font-weight:500">${esc(x.merchant||x.category||({income:'收入',expense:'支出',transfer:'轉帳'}[x.type]||'一筆'))}</b><small>${LMD(Date.parse(x.at))}・${esc(x.category||({transfer:'轉帳',income:'收入'}[x.type]||''))}${x.account?'・'+esc(x.account):''}${x.status&&x.status!=='posted'?'・待確認':''}</small></span><span class="rt"><span class="amt">${sg} ${nt(+x.amount||0)}</span></span></div></div>`}).join(''):''}</div></section>`}
function kkSubs(){const ss=subs(),d=due7();if(!LV.money||!ss.length)return '';const op=!!S.open.subs;
 return `<section class="sec"><div class="rows"><div class="rowi"><button class="rowb" data-act="open" data-id="subs" aria-expanded="${op}"><span class="tx"><b>每月訂閱 ${ss.length} 筆</b><small>自付每月 ${nt(monthSelf())}${d.length?`・7 天內扣 ${d.length} 筆`:''}</small></span><span class="rt"><span class="chev" aria-hidden="true">${op?'⌃':'⌄'}</span></span></button></div>${op?ss.map(s=>`<div class="rowi"><button class="rowb" data-act="sheet" data-id="sub:${esc(s.id)}"><span class="tx"><b>${esc(s.name)}</b><small>${s.cancel?'▲ '+esc(s.cancel)+'・':''}${esc(s.cyc)}・${s.payer}・${s.in} 天後扣</small></span><span class="rt"><span class="amt">${nt(s.amt)}</span></span></button></div>`).join(''):''}</div></section>`}
{const f=zoneMoney;zoneMoney=function(){const h=f();if(!LV.mo||S.st!=='ok'&&S.st!=='offline')return h;const i=h.indexOf('<div id="mz2">');return (i<0?h:h.slice(0,i)+kkQuick()+h.slice(i))+kkAccts()+kkRecent()+kkSubs()}}
function tataSay(text,ok){return LV.api.say(null,text,'tata').then(()=>{WAITB.tata=1;waitFaces();toast(ok);setTimeout(pollInbox,1500)}).catch(e=>{toast('沒送出：'+LERR(e));throw e})}
ACT.kkadd=()=>{const t=$('#kkIn'),v=t?t.value.trim():'';if(!v){S.err='kk';render('keep');const x=$('#kkIn');if(x)x.focus();return}S.err='';
 tataSay(`【記一筆】${v}（老大在逐流錢房間寫的，今天 ${LMD(Date.now())}。請照塔塔記帳規則記進去，看不出分類或帳戶就問老大，記好回一句）`,'交給塔塔了，記好會回在塔塔的對話').then(()=>{const x=$('#kkIn');if(x)x.value=''}).catch(()=>{})};
LV.duePaid={};
ACT.duepaid=id=>{const d=DB.due.find(q=>q.id===id);if(!d)return;closeThen(()=>tataSay(`【標已繳】${d.name} ${nt(d.amt)}，老大說 ${LMD(Date.now())} 自己繳了（從 ${d.from}）。請在塔塔記帳標成這期已繳（mark_bill_paid），記好回一句`,'交給塔塔標已繳了').then(()=>{LV.duePaid[id]='今天 你說繳了，塔塔記帳中';LV.sig='';paint()}).catch(()=>{}))};
ACT.dueundo=id=>{const d=DB.due.find(q=>q.id===id);if(!d)return;closeThen(()=>tataSay(`【撤回已繳】${d.name} 這期剛剛標已繳是誤按，請改回沒繳（如果已經記了交易一起作廢），處理好回一句`,'跟塔塔說改回沒繳了').then(()=>{delete LV.duePaid[id];LV.sig='';paint()}).catch(()=>{}))};
LV.payDemo=ACT.pay;LV.payHTMLDemo=payHTML;
ACT.pay=id=>toast('還沒接上付款，這筆沒有扣款。自己付好後按「⋯ 我自己繳了」，塔塔會記');
document.addEventListener('change',e=>{if(e.target&&e.target.name==='mzsafe'){try{localStorage.setItem(SAFEK,e.target.value)}catch(x){}}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target&&e.target.id==='kkIn'){e.preventDefault();ACT.kkadd()}});
WRITE.push('kkadd','duepaid','dueundo');

/* ---------- v44（2026-11-22）：生活接上 hub_life_items ----------
   購物清單（wish）、例行（rout）、備品（sup）都能新增、改、標完成，寫回資料庫（老大本人或可編輯的金鑰）。
   補資料、比價、值不值、下單交給朋朋、萌萌、金金：經 v40 機器人對話送出，回覆在各自的浮窗；朋朋下單仍要老大當面同意付款。
   訂單沒有後端，顯示空狀態。塔塔「買不買得起」改用錢總覽的現金與安全線算（看不到錢就寫看不到）。 */
LV.wishRun={};
const LCOL=['#5b4a8a','#2f5a7a','#6a4a3a','#3d5a4a','#7a3d5a'];
function applyLife(){const L=LV.life;if(!L){DB.wish=[];DB.rout=[];DB.sup=[];return}S.bound=true;const it=L.items||[];
 DB.wish=it.filter(x=>x.kind==='wish').map((x,i)=>{const age=(Date.now()-Date.parse(x.created_at||0))/6e4,np=x.price==null;
  return {id:x.id,name:x.name,raw:x.name,spec:x.note||'',price:np?0:+x.price,noPrice:np,shop:x.shop||(np?'朋朋還沒補價格':''),url:x.url||'',st:x.status==='done'?'bought':'want',cmp:LV.wishRun[x.id]==='mon'?'run':undefined,kim:LV.wishRun[x.id]==='kim'?'run':undefined,
   load:np&&!x.note&&!x.shop&&age<20?1:0,ch:CLN(x.name).slice(0,1)||'買',col:LCOL[i%LCOL.length],raw2:x}});
 DB.rout=it.filter(x=>x.kind==='rout').map(x=>{const cyc=Math.max(1,+x.cycle_days||30),d=DOFF(x.last_date);return {id:x.id,name:x.name,ago:d==null?cyc:Math.max(0,-d),cyc,rem:!!x.remind,last:x.last_date||'',raw2:x}});
 DB.sup=it.filter(x=>x.kind==='sup').map(x=>({id:x.id,name:x.name,cat:CLN(x.cat)||'其他',buy:!!x.need,last:x.last_date?gDueTxt(x.last_date):'沒記',raw2:x}));
 DB.orders=[]}
// 塔塔：買不買得起（現金扣掉安全線還剩多少）
fin=function(w){if(w.noPrice)return {k:'ok',t:'等朋朋補價格',why:'還沒有價格，朋朋補齊後塔塔才算得出來。'};
 if(!LV.mo)return {k:'ok',t:'看不到錢的資料',why:LV.moErr||'錢總覽讀不到。'};
 const room=MZ.cash-MZ.safe*MZ.monthly,p=w.price;
 return p<=room?{k:'ok',t:'買得起',why:`能花的現金 ${nt(MZ.cash)}，扣掉安全線 ${MZ.safe} 個月（${nt(MZ.safe*MZ.monthly)}）還有 ${nt(room)}，買完剩 ${nt(room-p)}。`}
  :{k:'over',t:'會低於安全線',why:`能花的現金 ${nt(MZ.cash)}，扣掉安全線 ${MZ.safe} 個月後只剩 ${nt(Math.max(0,room))}，買這個會低於安全線。`}};
const reloadLife=()=>LV.api.life().then(d=>{LV.life=d;LV.sig='';paint()}).catch(()=>{});
function lw(id,kind,patch,msg,undo){return LV.api.lifeSet(id,kind,patch).then(r=>{reloadLife();if(msg)toast(msg,undo?()=>LV.api.lifeSet(undo.id||id,kind,undo.patch).then(reloadLife).then(()=>toast('還原了')).catch(e=>toast('沒還原：'+LERR(e))):null);return r}).catch(e=>{toast('沒存上：'+LERR(e));reloadLife()})}
const today=()=>ISOD(new Date());
function botAsk(b,text,ctx){openChat(b,ctx||'',null,()=>say(b,text,ctx||''))}
ACT.bindok=()=>toast(LV.life?'朋朋已經接上了':'生活讀不到，重新整理再試');ACT.unbind=()=>toast('朋朋接在逐流的生活房間，不用解除');
ACT.add=()=>{const k=S.sub.life==='sup'?'sup':'rout';let n=null;try{n=prompt(k==='rout'?'新增例行事項（例：澆花）':'新增備品（例：防曬乳）')}catch(e){}if(!n||!n.trim())return;
 let extra={};if(k==='rout'){let c=null;try{c=prompt('多久一次（天）',k==='rout'?'14':'')}catch(e){}const v=Math.max(1,+c||14);extra={cycle_days:v,last_date:today()}}else{let c=null;try{c=prompt('分類（例：保養、超市補貨）','其他')}catch(e){}extra={cat:(c||'其他').trim(),last_date:today()}}
 lw(null,k,Object.assign({name:n.trim()},extra),'加好了：'+n.trim())};
ACT.done=id=>{const r=DB.rout.find(x=>x.id===id);if(!r)return;lw(id,'rout',{last_date:today()},`${r.name}做完了，從今天重新算`,{patch:{last_date:r.last||''}})};
ACT.saverout=id=>{const r=DB.rout.find(x=>x.id===id);if(!r)return;const d=($('#rDate')||{}).value,c=+(($('#rCyc')||{}).value);if(!(c>0)){toast('多久一次要寫天數');return}
 closeThen(()=>lw(id,'rout',{last_date:d||'',cycle_days:c},'存好了',{patch:{last_date:r.last||'',cycle_days:r.cyc}}))};
ACT.routdel=id=>{const r=DB.rout.find(x=>x.id===id);if(!r)return;closeThen(()=>lw(id,'rout',{status:'dropped'},'拿掉了：'+r.name,{patch:{status:'active'}}))};
ACT.buy=id=>{const u=DB.sup.find(x=>x.id===id);if(!u)return;lw(id,'sup',{need:true},`${u.name}排進購物清單`,{patch:{need:false}})};
ACT.bought=id=>{const u=DB.sup.find(x=>x.id===id);if(!u)return;lw(id,'sup',{need:false,last_date:today()},`${u.name}買好了`,{patch:{need:true,last_date:u.raw2.last_date||''}})};
ACT.copy=()=>{const t=tobuy().map(u=>'・'+u.name).join('\n');try{navigator.clipboard.writeText(t).then(()=>toast('購物清單複製好了'),()=>toast('複製不了，長按選字'))}catch(e){toast('複製不了，長按選字')}};
ACT.wishadd=()=>{const t=$('#wishIn'),v=t?t.value.trim():'';if(!v){S.err='wish';render('keep');const x=$('#wishIn');if(x)x.focus();return}S.err='';
 const url=/^https?:\/\/\S+$/i.test(v),patch=url?{name:v.replace(/^https?:\/\/(www\.)?/i,'').slice(0,40),url:v}:{name:v.slice(0,80)};
 lw(null,'wish',patch,'加進清單了，請朋朋補資料').then(r=>{const x=$('#wishIn');if(x)x.value='';if(r&&r.id)LV.api.say(null,`【購物清單補資料】老大加了「${v}」（清單編號 ${r.id}）。請補品名、規格、價格、店家，補好回一句；要買要等老大說`,'peng').catch(()=>{})})};
ACT.wishcmp=id=>{const w=W(id);if(!w)return;LV.wishRun[id]='mon';LV.sig='';paint();botAsk('mon',`請比價「${w.name}」${w.url?'（'+w.url+'）':''}，列三家含運總價與到貨時間，推薦一家`,'wish:'+id)};
ACT.wishkim=id=>{const w=W(id);if(!w)return;LV.wishRun[id]='kim';LV.sig='';paint();botAsk('kim',`「${w.name}」${w.noPrice?'':nt(w.price)} 值得現在買嗎？`,'wish:'+id)};
ACT.wishpick=()=>toast('比價結果在萌萌的對話裡，選好跟朋朋說');
ACT.wishdel=id=>{const w=W(id);if(!w)return;closeThen(()=>lw(id,'wish',{status:'dropped'},'從購物清單拿掉了',{patch:{status:'active'}}))};
ACT.wishmark=id=>{const w=W(id);if(!w)return;const b=w.st!=='bought';closeThen(()=>lw(id,'wish',{status:b?'done':'active'},b?'標成已買':'改回想買',{patch:{status:b?'active':'done'}}))};
ACT.ordgot=ACT.ordback=()=>toast('訂單還沒有後端，朋朋下單後會跟你說');
// 例行的抽屜：設計稿的日期是寫死的，換成真的上次日期，欄位加 id 才存得回去
{const _s=sheetHTML;sheetHTML=function(){const a=(S.sheet||'').split(':');if(a[0]!=='rout'||!LV.life)return _s();const r=DB.rout.find(x=>x.id===a[1]);if(!r)return shHead('這項不在了');
 return shHead(esc(r.name))+`<p style="margin-top:8px">上次是 <b>${r.ago} 天前</b>，每 ${r.cyc} 天一次。</p><label class="f">上次做的日期<input id="rDate" type="date" value="${esc(r.last)}" max="${today()}"></label><label class="f">多久一次（天）<input id="rCyc" type="number" inputmode="numeric" min="1" value="${r.cyc}"></label><div class="btns">${B('存好這一項','saverout',r.id,'pri wide')}</div><div class="mrow">${mb('✓ 剛做完','done',r.id)}${mb('拿掉這一項','routdel',r.id)}</div>`}}
{const f=wishCard;wishCard=function(){const h=f.apply(this,arguments);return LV.life?h.replace('<small>示意圖</small>',''):h}}   // 真資料的縮圖是品名首字，不是示意圖
WRITE.push('add','done','saverout','routdel','buy','bought','wishadd','wishdel','wishmark');

/* ---------- v45（2026-11-22）：案子「⋯ 改日期」真的能改 ----------
   設計稿的日期編輯掛在示意案子（DT）上，真資料的案子只能看。這裡把交件日、預計付款日、尾款期限做成日期欄，
   改了就經 opp_work_update（act 'work'）寫回，提示條可復原。截止日來自公告，不在這裡改。 */
const PDF=[['delivery_date','交件日'],['expected_pay_date','預計付款日'],['final_due','尾款期限']],PDK={delivery_date:'deliveryDate',expected_pay_date:'expectedPayDate',final_due:'finalDue'};
{const _d=dtBody;dtBody=function(pid){const h=_d(pid);if(h)return h;const p=DB.proj.find(x=>x.id===pid);if(!p||!p.raw||!p.raw.id)return '';const c=p.raw;
 return (c.deadline?`<div class="dt"><div class="li"><div><b>截止</b><small>${LMD(c.deadline)}（公告的日期）</small></div></div></div>`:'')+PDF.map(([f,lab])=>{const v=c[PDK[f]]||'';
  return `<div class="dt"><div class="li"><div style="flex:1;min-width:0"><b>${lab}</b><small>${v?esc(String(v).slice(0,10)):'還沒寫'}</small></div><label class="vh" for="pd_${f}">改${lab}</label><input type="date" class="pdi" id="pd_${f}" data-pid="${esc(pid)}" data-f="${f}" value="${esc(String(v).slice(0,10))}" style="flex:0 0 auto;width:158px;max-width:48%"></div></div>`}).join('')+`<p class="note">改了直接存，案子日期同步到行事曆還沒接上。</p>`}}
document.addEventListener('change',e=>{const t=e.target;if(!t.classList||!t.classList.contains('pdi'))return;if(S.st==='offline'){toast('離線中，這個動作連上線再做');return}
 const id=t.dataset.pid,f=t.dataset.f,p=DB.proj.find(x=>x.id===id);if(!p)return;const old=p.raw[PDK[f]]||null,v=t.value||null,lab=(PDF.find(x=>x[0]===f)||[])[1];
 LV.api.act(id,'work',{patch:{[f]:v}}).then(c=>{if(c){const i=LV.items.findIndex(x=>x.id===id);if(i>-1)LV.items[i]=c}LV.sig='';paint();
  toast(`${lab}${v?'改成 '+v.slice(5).replace('-','/'):'清掉了'}`,()=>LV.api.act(id,'work',{patch:{[f]:old?String(old).slice(0,10):null}}).then(()=>{reload();toast('還原了')}).catch(er=>toast('沒還原：'+LERR(er))))})
  .catch(er=>{toast('沒存上：'+LERR(er));reload()})});
WRITE.push('pdeliver','ppaid','pback','pback2','run','scan','build','dive','pclosedo','preopen','ppurge');

/* ---------- v46（2026-11-22）：卡面只寫「要你做什麼」、每張卡點得開、能編輯刪除封存 ----------
   老大原話：「卡片條目的字實在太多，所以卡片的時會應該是"要我幹麻"的精準描述，點開才是細節，過去已經做完也都可以點開看細節 希望每個卡片都能夠點開 反正所有東西都要能互動 編輯或者是刪除或者是封存懂嗎」
   追加：「我印象中機會卡片，應該會在卡面上直接顯示按鈕有基本操作？」
   卡面一句：資料庫 ask 欄（AI 寫卡時帶 p_ask）；沒填就從原文摘一句（第一個動作句、去掉人名括號與路徑、約 20 字）。原文放細節。
   後端：hub_card_edit／hub_card_shelf／hub_shelf_list／opp_card_edit；資料庫還沒更新時按了只寫「資料庫還沒更新」，不假裝成功。 */
const ASKN=20;
function askCut(t,n,noComma){n=n||ASKN;let s=String(t||'').replace(/\r/g,'');
 s=s.replace(/https?:\/\/\S+/g,'').replace(/(~|\/Users)\/[^\s，。；、）)]*/g,'').replace(/`[^`]*`/g,'');
 let a=s.split(/[｜\n]/).map(x=>x.trim()).filter(Boolean);if(a.length>1&&/^[^：]{0,30}（[^）]*）$/.test(a[0]))a=a.slice(1);s=a[0]||'';
 s=s.replace(/\b[0-9a-f]{7,40}\b/g,'').replace(/\bcommit\b\s*/gi,'').replace(/（[^）]{0,80}）|\([^)]{0,80}\)/g,'').replace(/[（(][^）)]*$/,'').replace(/【[^】]{0,12}】/g,'').replace(/^(狀態|結果|下一步|待辦|問題|決定)：/,'').replace(/^[\s・\-–—*#>]+/,'');
 s=s.replace(/\s+([：，])/g,'$1');const m=s.search(/[。；！？!?]/);if(m>4)s=s.slice(0,m);s=s.replace(/[，、：\s]+$/,'').trim();
 if(s.length>n&&!noComma){const k=s.slice(0,n).lastIndexOf('，');if(k>=8)return s.slice(0,k)}
 return s.length>n?s.slice(0,n-1)+'…':s}
const askOwn=x=>{const s=String(x||'').trim();return s?(s.length>ASKN+6?s.slice(0,ASKN+5)+'…':s):''};
function askDec(d){if(d.raw&&d.raw.ask)return askOwn(d.raw.ask);let q=String(d.q||'').replace(/[？?]\s*$/,''),P=String(d.projFull||'');
 if(P&&(/^[（(]?[^，：\s]{0,4}(已試|已做|已完成|已建|已讀|已辦|已備好|已確認)/.test(q)||!askCut(q)))q=P;   // 巡查待辦同步進來的：問題欄是「已試過什麼」，要決定的事在案子欄
 if(/①/.test(q)&&/^(要你決定|[一二三四五兩]題)/.test(q)){const n=(q.match(/[\u2460-\u2469]/g)||[]).length,f=q.split(/[\u2460-\u2469]/)[1]||'';return askCut(`決定 ${n} 件：${f}`,ASKN+4)}
 const c=askCut(q,ASKN,1)||askCut(P);
 if(d.kind==='talk')return askCut('本人處理：'+c,ASKN+2);return /^(要不要|是否|要|該不該|可不可以|能不能)/.test(c)?askCut('選'+c.replace(/^是否/,'要不要'),ASKN+1):c}
function askJob(j){if(j.raw&&j.raw.ask)return askOwn(j.raw.ask);return askCut(`${WHN[j.who]||String(j.who||'大器').replace(/（[^）]*）/,'')}在做${String(j.raw&&j.raw.title||j.title).replace(/^在?做/,'')}`,ASKN+2)}
function askEvt(e){if(e.raw&&e.raw.ask)return askOwn(e.raw.ask);const t=askCut(e.raw?e.raw.summary:e.text);return /^(做完|完成|已)/.test(t)?t:askCut('做完：'+t,ASKN+3)}
const OPV={fund:'申請',honor:'報名',personal:'接',other:'接'};
function askOpp(o){const c=o.raw||{};if(c.ask)return askOwn(c.ask);return askCut(`看要不要${OPV[o.b]||'接'}：${c.shortTitle||o.title}`,ASKN+4)}
function askProj(p){const c=p.raw||{};if(c.ask)return askOwn(c.ask);
 if(c.status==='delivered')return '確認對方付款'+(c.expectedPayDate?`，${c.expectedPayDate.slice(5).replace('-','/')} 前`:'');
 if(c.status==='paid')return '已收款，看要不要結案';
 if(c.progressBlocker){const b=String(c.progressBlocker),m=b.match(/^等\s*(Borry|老大|你)\s*/);return m?askCut(b.slice(m[0].length)):askCut('解決：'+b,ASKN+3)}
 const n=c.progressNote||c.firstStep||'';return n?askCut(n):'決定下一步'}
const askTodo=t=>t.raw&&t.raw.ask?askOwn(t.raw.ask):askCut(t.title);

// 資料形狀：保留原文，加 ask
const WHN={'Gig Gig':'集集','Kim Kim':'金金','Tal Tal':'塔塔','Tom Tom':'通通','Pom Pom':'朋朋','AI協作':'大器'};
{const _d=mapDec;mapDec=function(r){const x=_d(r);x.raw=r;x.projFull=x.proj;x.ask=askDec(x);if(String(x.proj).length>16)x.proj=askCut(x.proj,14);return x}}
{const _j=mapJob;mapJob=function(r){const x=_j(r);x.raw=r;x.ask=askJob(x);return x}}
{const _e=mapEvt;mapEvt=function(r){const x=_e(r);x.id=r.id;x.raw=r;x.ask=askEvt(x);return x}}
{const _o=mapOpp;mapOpp=function(c){const x=_o(c);x.ask=askOpp(x);return x}}
{const _p=mapProj;mapProj=function(c){const x=_p(c);x.ask=askProj(x);return x}}
{const _t=mapTodo;mapTodo=function(c){const x=_t(c);x.ask=askTodo(x);return x}}
{const _a=mapArch;mapArch=function(c){const x=_a(c);x.raw=c;x.ask=c.ask?askOwn(c.ask):askCut(String(c.title).replace(/｜/g,' '));return x}}
const brief=(a,b)=>[a,b].filter(Boolean).join('・');

// 卡面：拍板（首頁玻璃帶、卡、列）
{const _s=decSlide;decSlide=function(d,n){const r=_s(d,n);r.html=r.html.replace(/<h2 class="dq"([^>]*)>[\s\S]*?<\/h2>/,`<h2 class="dq"$1>${esc(d.ask)}</h2>`);return r}}
decCard=function(d){return `<article class="card cardx" data-card="${esc(d.id)}">${mineB('dec:'+d.id,'這件拍板')}<div class="meta">${aiF('daqi','dec:'+d.id)}${chip(d.proj)}<span class="lbl">${esc(d.ago)}</span></div><h3>${cgo(esc(d.ask),'decopen',d.id)}</h3>${decActs(d)}${aifs([dinB('dec:'+d.id)])}</article>`};
decRow=function(d){return `<div class="rowi" data-card="${esc(d.id)}"><button class="rowb" data-act="decopen" data-id="${esc(d.id)}">${bm('daqi','thinking')}<span class="tx"><b>${esc(d.ask)}</b><small>${esc(brief(d.proj,d.ago))}</small></span><span class="rt"><span class="chev" aria-hidden="true">›</span></span></button></div>`};
// 正在跑、最近做完：一句話，點開看全文
jobList=function(){const j=jobs();if(!j.length)return `<div class="card"><p>現在沒有在跑的工作。</p></div>`;
 return `<div class="rows">`+j.map(x=>`<div class="rowi" data-card="${esc(x.id)}"><div class="rowb">${aiF(x.bot,'job:'+x.id)}<button class="tx" data-act="sheet" data-id="hjob:${esc(x.id)}" style="min-height:44px;text-align:left"><b>${esc(x.ask)}</b><small>${esc(brief(x.raw&&x.raw.project,x.ago))}</small></button><span class="rt">${chip(x.st,x.wait)}</span></div></div>`).join('')+`</div>`};
evtList=function(n){const e=evts().slice(0,n);if(!e.length)return `<div class="card"><p>還沒有做完的紀錄。</p></div>`;
 return `<div class="rows">`+e.map(x=>`<div class="rowi" data-card="${esc(x.id)}"><div class="rowb">${aiF(x.bot,'evt:'+DB.events.indexOf(x))}<button class="tx" data-act="sheet" data-id="hevt:${esc(x.id)}" style="min-height:44px;text-align:left"><b class="evs">${esc(x.ask)}</b><small>${esc(brief(x.who,x.at))}</small></button></div></div>`).join('')+`</div>`};
// 案子
projCard=function(p){return `<article class="card cardx" data-card="${esc(p.id)}" data-act="copen" data-id="page|proj:${esc(p.id)}">${mineB('proj:'+p.id,p.title)}<div class="meta">${chip(p.due,p.urg)}<span class="lbl">${esc(askCut(p.short||p.title,16))}</span></div><h3>${cgo(esc(p.ask),'page','proj:'+p.id)}</h3><div class="steps" role="img" aria-label="${p.steps.length} 步做到第 ${Math.min(p.cur+1,p.steps.length)} 步">${p.steps.map((s,i)=>`<i class="${i<p.cur?'d':i===p.cur?'c':''}"></i>`).join('')}</div><p class="note">${esc(p.money)}</p>${aifs([aiF(WHO[p.id]||'daqi','proj:'+p.id),p.g==='need'||p.g==='doing'?dinB('proj:'+p.id):''])}</article>`};
// 機會：卡面兩顆基本操作（老大 2026-11-22 追加）
const oppFace=o=>o.st==='snoozed'?mb('↺ 放回清單','unsnooze',o.id):mb('⏸ 暫存到明天','snooze',o.id)+mb('🗑 不要了','del',o.id);
oppCard=function(o){const sn=o.st==='snoozed';
 return `<article class="card cardx" data-card="${esc(o.id)}" data-act="copen" data-id="sheet|opp:${esc(o.id)}">${mineB('opp:'+o.id,o.title)}<div class="meta">${chip(sn?o.snz:o.due,!sn&&o.days<=4)}<span class="lbl">${esc(brief(BASK[o.b],askCut(o.org,10)))}</span></div><h3>${cgo(esc(o.ask),'sheet','opp:'+o.id)}</h3><p class="amt" style="color:var(--ink)">${esc(o.amt)}</p><div class="mrow">${oppFace(o)}</div>${aifs([aiF('jiji','opp:'+o.id,o.took?'建好了':'')])}</article>`};
oppRow=function(o){return `<div class="rowi" data-card="${esc(o.id)}"><button class="rowb" data-act="sheet" data-id="opp:${o.id}">${bm('jiji')}<span class="tx"><b>${esc(o.ask)}</b><small>${esc(brief(o.amt,BASK[o.b]))}</small></span><span class="rt">${chip(o.due,o.days<=4)}<span class="chev" aria-hidden="true">›</span></span></button></div>`};
{const _r=riverItems;riverItems=function(){const ix={};DB.dec.forEach(d=>ix['dec:'+d.id]=d.ask);DB.proj.forEach(p=>ix['proj:'+p.id]=p.ask);DB.opp.forEach(o=>ix['opp:'+o.id]=o.ask);return _r().map(i=>ix[i.id]?Object.assign(i,{t:ix[i.id]}):i)}}
// 待辦、封存：一句話＋最常用的一顆
{const _zp=zoneProj;zoneProj=function(){const s=S.sub.proj;if(s==='proj')return _zp();const h=_zp(),k=s==='todo'?'待辦':'封存',i=h.indexOf(`<section class="sec"><h2 class="vh">${k}</h2>`);if(i<0)return h;const a=DB[s];
 return h.slice(0,i)+`<section class="sec"><h2 class="vh">${k}</h2><div class="stack stg">${a.map(t=>`<article class="card cardx" data-card="${esc(t.id)}" data-act="copen" data-id="sheet|cview:${s}:${esc(t.id)}">${mineB(s+':'+t.id,t.title)}<div class="meta">${chip(t.st)}</div><h3>${cgo(esc(t.ask),'sheet','cview:'+s+':'+t.id)}</h3>${s==='todo'&&!t.run?`<div class="mrow">${mb('▶ 去執行','run',t.id)}</div>`:''}</article>`).join('')}</div></section>`}}

// 整張卡點下去＝打開（卡上的按鈕照舊各做各的）
ACT.copen=(v,el)=>{const i=v.indexOf('|'),how=v.slice(0,i),id=v.slice(i+1);const a=document.activeElement;if(a&&el.contains(a)&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))return;if(how==='page')ACT.page(id);else ACT.sheet(id)};

// ---------- 細節抽屜 ----------
const HK={hjob:'job',hevt:'event'};
const hubRow=(k,id)=>k==='decision'?(LV.hub&&LV.hub.open||[]).find(x=>x.id===id):k==='job'?(LV.hub&&LV.hub.jobs||[]).find(x=>x.id===id):(LV.hub&&LV.hub.events||[]).find(x=>String(x.id)===String(id));
const shelfRow=(k,id)=>(LV.shelf||[]).find(s=>s.kind===k&&String(s.row.id)===String(id));
const editRow=(k,id)=>`<div class="mrow">${mb('✎ 編輯','sheet','hedit:'+k+':'+id)}${mb('▣ 封存','hshelf',k+'|'+id+'|archive')}${mb('🗑 刪掉','hshelf',k+'|'+id+'|delete')}</div><p class="note">刪掉的 72 小時內可在「封存與刪掉的」救回。</p>`;
const kvs=a=>`<dl class="kv">${a.filter(x=>x[1]).map(x=>`<div><dt>${x[0]}</dt><dd>${esc(x[1])}</dd></div>`).join('')}</dl>`;
const fullP=(lab,t)=>t?`<p class="h4">${lab}</p><p style="white-space:pre-wrap;word-break:break-word">${esc(t)}</p>`:'';
const tstr=t=>t?`${LMD(t)} ${LHM(t)}`:'';
function hubSheet(t,id){
 if(t==='hjob'){const j=DB.jobs.find(x=>String(x.id)===id),r=j&&j.raw||hubRow('job',id);if(!r)return shHead('這件不在了');const s=(JST[r.status]||['進行中'])[0];
  return shHead(esc(j?j.ask:askCut(r.title)))+kvs([['誰',r.agent],['狀態',s],['案子',r.project],['機器',r.machine],['更新',tstr(r.updatedAt)]])+fullP('在做什麼',r.title)+fullP('備註',r.note)+(r.resultPath?`<p class="h4">成果</p><p class="note" style="word-break:break-all">${esc(r.resultPath)}</p>`:'')+editRow('job',id)}
 if(t==='hevt'){const e=DB.events.find(x=>String(x.id)===id),r=e&&e.raw||hubRow('event',id);if(!r)return shHead('這筆不在了');
  return shHead(esc(e?e.ask:askCut(r.summary)))+kvs([['誰',r.actor],['案子',r.project],['時間',tstr(r.at)]])+fullP('做完了什麼',r.summary)+(r.path?`<p class="h4">檔案</p><p class="note" style="word-break:break-all">${esc(r.path)}</p>`:'')+editRow('event',id)}
 if(t==='hedit'){const [k,x]=id.split(/:(.*)/);const r=hubRow(k,x)||((shelfRow(k,x)||{}).row);if(!r)return shHead('這件不在了');
  const F={decision:['問題','question','細節','detail'],job:['在做什麼','title','備註','note'],event:['做完了什麼','summary','檔案或路徑','path']}[k];
  const cur=k==='decision'?(DB.dec.find(d=>d.id===x)||{}).ask:k==='job'?(DB.jobs.find(d=>String(d.id)===x)||{}).ask:(DB.events.find(d=>String(d.id)===x)||{}).ask;
  return shHead('編輯')+`<label class="f">卡面一句（要你做什麼，約 20 字）<input id="heAsk" maxlength="80" value="${esc(r.ask||'')}" placeholder="${esc(cur||'')}"></label><label class="f">${F[0]}<textarea id="heText" rows="4">${esc(r[F[1]]||'')}</textarea></label><label class="f">${F[2]}<textarea id="heDetail" rows="3">${esc(r[F[3]]||'')}</textarea></label><label class="f">案子<input id="heProj" maxlength="120" value="${esc(r.project||'')}"></label>${S.err==='hedit'?'<p class="err" role="alert">▲ 內容不能空白。</p>':''}<div class="btns">${B('存好','hsave',k+'|'+x,'pri wide')}</div>`}
 if(t==='cview'){const [k,x]=id.split(/:(.*)/);const it=(DB[k]||[]).find(q=>q.id===x);if(!it)return shHead('這件不在了');const c=it.raw||{};
  return shHead(esc(it.ask))+`<p style="margin-top:8px">${esc(c.title||it.title)}</p>`+kvs([['狀態',it.st],['截止',c.deadline?LMD(c.deadline):''],['結案',c.closedAt?LMD(c.closedAt):'']])+fullP('說明',c.why||it.next)+fullP('大器寫的進度',c.progressNote)+`<div class="mrow">${k==='todo'&&!it.run?mb('▶ 去執行','run',x):''}${mb('✎ 改卡面一句','sheet','cedit:'+x)}${k==='todo'?mb('🗑 刪掉','tdel',x):mb('↶ 放回進行中','preopen',x)+mb('🗑 徹底刪除','ppurge',x)}</div>`}
 if(t==='cedit'){const c=LV.items.find(q=>q.id===id)||(LV.arch||[]).find(q=>q.id===id);if(!c)return shHead('這張不在了');
  const cur=(DB.opp.find(q=>q.id===id)||DB.proj.find(q=>q.id===id)||DB.todo.find(q=>q.id===id)||DB.arch.find(q=>q.id===id)||{}).ask;
  return shHead('改卡面')+`<label class="f">卡面一句（要你做什麼，約 20 字）<input id="ceAsk" maxlength="80" value="${esc(c.ask||'')}" placeholder="${esc(cur||'')}"></label><p class="note">留空＝照原文自動摘一句。</p><label class="f">名稱<input id="ceTitle" maxlength="300" value="${esc(c.title||'')}"></label><div class="btns">${B('存好','csave',id,'pri wide')}</div>`}
 if(t==='shelfv'){const [k,x]=id.split(/:(.*)/);const s=shelfRow(k,x);if(!s)return shHead('這件不在了');const r=s.row,txt=r.question||r.title||r.summary||'';
  return shHead(esc(r.ask||askCut(txt)))+kvs([['狀態',s.gone?'刪掉了（72 小時內可救回）':'封存中'],['案子',r.project],['時間',tstr(Date.parse(s.t))]])+fullP('內容',txt)+fullP('細節',r.detail||r.note||r.path)+`<div class="mrow">${s.gone?mb('↺ 救回來','hshelf',k+'|'+x+'|restore'):mb('↺ 放回','hshelf',k+'|'+x+'|unarchive')+mb('🗑 刪掉','hshelf',k+'|'+x+'|delete')}</div>`}
 return null}
{const _s=sheetHTML;sheetHTML=function(){const a=S.sheet.split(':'),t=a[0],id=S.sheet.slice(t.length+1);
 if(t==='hjob'||t==='hevt'||t==='hedit'||t==='cview'||t==='cedit'||t==='shelfv'){const h=hubSheet(t,id);if(h)return h}
 let h=_s();
 {const d=(t==='dec'||t==='why')&&DB.dec.find(x=>x.id===a[1]);if(d)h+=(d.projFull&&d.projFull!==d.proj?`<p class="h4">完整內容</p><p style="white-space:pre-wrap">${esc(d.projFull)}</p>`:'')+editRow('decision',a[1])}
 if(t==='opp'&&DB.opp.find(o=>o.id===a[1]))h=h.replace(/<div class="mrow">([\s\S]*?)<\/div>$/,`<div class="mrow">$1${mb('✎ 改卡面一句','sheet','cedit:'+a[1])}</div>`);
 return h}}
// 拍板抽屜：標題換回全文（卡面是一句話）
// （原本 sheet 'dec' 的標題就是 d.q 全文，不用改）

// 「⋯」加上：改卡面一句、刪除、封存
{const _ms=mineSheet;mineSheet=function(id){const i=id.indexOf(':'),k=id.slice(0,i),x=id.slice(i+1);let h=_ms(id);const add=s=>h.replace(/<\/div>$/,s+'</div>');
 if(k==='proj'&&DB.proj.find(q=>q.id===x))h=add(mi('✎','改卡面一句、名稱','sheet','cedit:'+x)+mi('🗑','徹底刪除（要輸入完整案名）','pkill',x));
 else if(k==='opp'&&DB.opp.find(q=>q.id===x))h=add(mi('✎','改卡面一句、名稱','sheet','cedit:'+x));
 else if(k==='todo'&&DB.todo.find(q=>q.id===x))h=add(mi('✎','改卡面一句、名稱','sheet','cedit:'+x)+mi('🗑','刪掉（72 小時內可救回）','tdel',x));
 else if(k==='arch'&&DB.arch.find(q=>q.id===x))h=add(mi('✎','改卡面一句、名稱','sheet','cedit:'+x));
 else if(k==='dec'&&DB.dec.find(q=>q.id===x))return h;
 return h}}

// ---------- 動作 ----------
const NOFN=e=>e&&(e.status===404||/Could not find the function|PGRST202/i.test(String(e.message||'')));
const hubErr=e=>NOFN(e)?'資料庫還沒更新，這個動作還沒接上':LERR(e);
const SHN={archive:'封存了',unarchive:'放回了',delete:'刪掉了，72 小時內可救回',restore:'救回來了'},SHU={archive:'unarchive',unarchive:'archive',delete:'restore',restore:'delete'};
async function loadShelf(){if(!LV.api||!LV.api.shelf)return;try{LV.shelf=await LV.api.shelf();LV.shelfNo=0}catch(e){LV.shelf=[];LV.shelfNo=NOFN(e)?1:2}}
async function hubAfter(){try{LV.hub=await LV.api.hubToday()}catch(e){}await loadShelf();LV.sig='';paint();render('keep')}
ACT.hshelf=v=>{const [k,id,act]=v.split('|');if(!LV.api.hubShelf)return toast('這個動作還沒接上');
 closeThen(async()=>{try{await LV.api.hubShelf(k,id,act);await hubAfter();toast(SHN[act],async()=>{try{await LV.api.hubShelf(k,id,SHU[act]);await hubAfter();toast('還原了')}catch(e){toast('沒還原：'+hubErr(e))}})}catch(e){toast('沒有成功：'+hubErr(e))}})};
ACT.hsave=v=>{const [k,id]=v.split('|');const g=s=>{const e=document.getElementById(s);return e?e.value:''};const text=g('heText').trim();if(!text){S.err='hedit';render('keep');return}S.err='';
 const r=hubRow(k,id)||((shelfRow(k,id)||{}).row)||{};const F={decision:['question','detail'],job:['title','note'],event:['summary','path']}[k];
 const patch={ask:g('heAsk').trim(),text,detail:g('heDetail'),project:g('heProj').trim()},old={ask:r.ask||'',text:r[F[0]]||'',detail:r[F[1]]||'',project:r.project||''};
 closeThen(async()=>{try{await LV.api.hubEdit(k,id,patch);await hubAfter();toast('改好了',async()=>{try{await LV.api.hubEdit(k,id,old);await hubAfter();toast('還原了')}catch(e){toast('沒還原：'+hubErr(e))}})}catch(e){toast('沒存上：'+hubErr(e))}})};
ACT.csave=id=>{const g=s=>{const e=document.getElementById(s);return e?e.value:''};const c=LV.items.find(q=>q.id===id)||(LV.arch||[]).find(q=>q.id===id)||{};const patch={ask:g('ceAsk').trim()},t=g('ceTitle').trim();if(t&&t!==c.title)patch.title=t;const old={ask:c.ask||''};if(patch.title)old.title=c.title;
 if(!LV.api.cardEdit)return toast('這個動作還沒接上');
 closeThen(async()=>{try{await LV.api.cardEdit(id,patch);if(LV.api.archive){try{const a=await LV.api.archive('',null);LV.arch=a.items||[]}catch(e){}}await reload();toast('改好了',async()=>{try{await LV.api.cardEdit(id,old);reload();toast('還原了')}catch(e){toast('沒還原：'+hubErr(e))}})}catch(e){toast('沒存上：'+hubErr(e))}})};
ACT.tdel=id=>closeThen(async()=>{try{await LV.api.act(id,'deleted');await reload();toast('刪掉了，72 小時內可在「最近刪掉的」救回',()=>ACT.restore(id))}catch(e){toast('沒有成功：'+LERR(e))}});
ACT.pkill=id=>{const p=DB.proj.find(q=>q.id===id);if(!p)return;let v=null;try{v=prompt('徹底刪除後面板和封存都找不回來（電腦裡的資料夾不會動），只有老大本人的網址能刪。\n要刪就輸入完整案名：\n'+p.title)}catch(e){}if(v==null)return;if(v.trim()!==p.title){toast('案名不對，沒有刪');return}
 closeThen(async()=>{try{await LV.api.act(id,'purge',{confirm:v.trim()});toast('徹底刪除了');reload()}catch(e){toast('沒有刪：'+LERR(e))}})};
WRITE.push('hshelf','hsave','csave','tdel','pkill');

// 最近刪掉的：待辦也列進來；封存與刪掉的（拍板、正在跑、最近做完）
{const _ad=applyData;applyData=function(){_ad();DB.deleted=DB.deleted.concat(LV.items.filter(c=>c.basket==='todo'&&(c.status==='dropped'||c.status==='expired')&&!DB.deleted.some(d=>d.id===c.id)).map(c=>({id:c.id,title:c.title,amt:'待辦'})))}}
{const _p=pageHTML;pageHTML=function(){if(S.page!=='shelf'){const h=_p();if(S.page==='events')return h.replace(/<\/div>$/,`<div class="btns" style="margin-top:20px">${mb('封存與刪掉的 ›','page','shelf')}</div></div>`);return h}
 if(LV.shelf===undefined&&LV.api&&!LV.shelfLoading){LV.shelfLoading=1;loadShelf().then(()=>{LV.shelfLoading=0;render('keep')})}
 const a=LV.shelf||[];let h=`<div class="page-in"><div class="phead">${B('‹ 返回','back',null,'ghost',' id="pBack"')}</div><h1 class="pt">封存與刪掉的</h1><p class="note">拍板、正在跑、最近做完收起來的都在這裡。刪掉的留 72 小時，之後才真的收走。</p>`;
 if(LV.shelfNo===1)return h+emptyBox('資料庫還沒更新','封存與刪除要等資料庫更新後才能用。')+'</div>';
 const KN={decision:'拍板',job:'正在跑',event:'做完'};
 return h+(a.length?`<div class="rows" style="margin-top:14px">${a.map(s=>{const r=s.row,txt=r.ask||askCut(r.question||r.title||r.summary);return `<div class="rowi"><button class="rowb" data-act="sheet" data-id="shelfv:${s.kind}:${esc(r.id)}"><span class="tx"><b>${esc(txt)}</b><small>${KN[s.kind]}・${s.gone?'刪掉了':'封存'}・${esc(tstr(Date.parse(s.t)))}</small></span><span class="rt"><span class="chev" aria-hidden="true">›</span></span></button></div>`}).join('')}</div>`:emptyBox('這裡是空的','在卡片點開按「封存」或「刪掉」，就會收到這裡。'))+'</div>'}}
{const _pg=ACT.page;ACT.page=function(id){const r=_pg.apply(this,arguments);if(id==='shelf')loadShelf().then(()=>render('keep'));return r}}
{const _h=homeL2;homeL2=function(){return _h().replace(/(<section class="sec">[^]*?最近做完[^]*?)(<\/section><\/div>)$/,`$1<div class="mrow">${mb('封存與刪掉的 ›','page','shelf')}</div>$2`)}}

/* ---------- v48（2026-11-22）：付款鈕＝授權單、行事曆近即時 ----------
   老大原話：「付款後端當然要接啊！通常按下去是授權讓朋朋或塔塔去付款啦所以他們要知道」
   付款：倒數 5 秒（可取消）後呼叫 hub_pay_authorize 開一張授權單；Mac relay 通知負責的那隻（帳單→塔塔、訂單→朋朋、報名費→塔塔），
   那隻付完用付款票 hub_pay_report 回報，面板從 hub_pay_list 讀狀態。面板與大器都不碰錢、不存卡號。
   行事曆：打開今天頁、行事曆頁或按「現在更新」寫一筆刷新請求（hub_cal_refresh_request），Mac relay 30 秒內看到就跑一次同步。 */
const PBY={tata:'塔塔',peng:'朋朋',jiji:'集集'};
function paySrc(id){const p=PAY[id]||{};
 if(id.indexOf('d_')===0){const d=DB.due.find(q=>q.id===id.slice(2));return d?{kind:'bill',id:d.bid!=null?d.bid:d.id,title:d.name,amount:d.amt,amountText:p.amt,payee:p.to,by:'tata'}:null}
 if(id.indexOf('o_')===0)return {kind:'fee',id:id.slice(2),title:p.title||'報名費',amountText:p.amt,payee:p.to,by:'tata'};
 return {kind:p.by==='peng'?'order':'other',id:id,title:p.title||p.to,amountText:p.amt,payee:p.to,by:p.by||'peng'}}
function payKeyOf(r){return r.src_kind==='bill'?'d_b'+r.src_id:r.src_kind==='fee'?'o_'+r.src_id:r.src_id}
function payApplyRows(rows){if(!Array.isArray(rows))return;const seen={};
 rows.filter(r=>!r.test).forEach(r=>{const k=payKeyOf(r),p=PAY[k];if(!p||seen[k])return;seen[k]=1;if(p.st==='count'||p.st==='sending')return;
  if(r.status==='canceled'){if(p.auth&&p.auth.id===r.id){p.st='idle';p.auth=null}return}
  p.auth=r;p.st=r.status==='authorized'?'auth':r.status;
  if(r.status==='paid'&&r.src_kind==='bill'&&LV.duePaid)LV.duePaid['b'+r.src_id]=`${r.reported_at?LMD(Date.parse(r.reported_at)):'今天'} 你按付款鈕，${r.reported_by||'塔塔'}付了（授權單 #${r.id}）`})}
const PSTAT=r=>r.status==='authorized'?(r.notify_ok===false?'通知沒送出，大器會再送':r.notified_at?`已通知${PBY[r.assignee]}，等它付`:'授權了，30 秒內通知'+PBY[r.assignee]):r.status==='paid'?`${r.reported_by||PBY[r.assignee]}付好了`:r.status==='failed'?'沒付成':'撤回了';
function payLog(r){const t=x=>x?LMD(Date.parse(x))+' '+LHM(Date.parse(x)):'';return `<dl class="kvs"><dt>授權單</dt><dd>#${esc(r.id)}</dd><dt>你按下同意</dt><dd>${esc(t(r.authorized_at))}</dd><dt>交給</dt><dd>${esc(PBY[r.assignee]||r.assignee)}</dd><dt>付給</dt><dd>${esc(r.payee)}</dd><dt>金額</dt><dd>${esc(r.amount_text)}</dd><dt>狀態</dt><dd>${esc(PSTAT(r))}</dd>${r.notified_at?`<dt>通知送出</dt><dd>${esc(t(r.notified_at))}</dd>`:''}${r.reported_at?`<dt>回報</dt><dd>${esc(t(r.reported_at))}</dd>`:''}${r.receipt?`<dt>收據</dt><dd>${esc(r.receipt)}</dd>`:''}${r.note?`<dt>備註</dt><dd>${esc(r.note)}</dd>`:''}</dl>`}
payHTML=function(id){if(LV.mode!=='live'||!LV.api||!LV.api.payAuthorize)return LV.payHTMLDemo(id);const p=PAY[id];if(!p)return '';const r=p.auth,by=PBY[p.by]||'負責的 Bot',lab=`付 ${p.amt} 給 ${p.to}`;let h;
 if(p.st==='count')h=`<div class="pcount" role="status"><div class="pbar2" aria-hidden="true"><i style="animation-delay:-${5-p.n}s"></i></div><p><b><span class="pn">${p.n}</span> 秒後</b>授權${by}付：${esc(p.amt)} 給 ${esc(p.to)}</p><button class="btn wide" data-act="paycancel" data-id="${id}">取消付款</button></div>`;
 else if(p.st==='sending')h=`<p class="pst" role="status"><span class="spin" aria-hidden="true"></span>送出授權中</p>`;
 else if(p.st==='auth'&&r)h=`<p class="pst" role="status"><span class="spin" aria-hidden="true"></span>已授權，等${by}付 ${esc(p.amt)} 給 ${esc(p.to)}</p><p class="note">${esc(PSTAT(r))}</p><div class="mrow">${mb(p.rc?'收起紀錄':'看授權紀錄','payrc',id)}${mb('撤回授權','payundo',id)}</div>${p.rc?payLog(r):''}`;
 else if(p.st==='paid'&&r)h=`<p class="pst ok" role="status">✓ ${esc(r.reported_by||by)}付好了：${esc(p.amt)} 給 ${esc(p.to)}</p>${r.receipt?`<p class="note">收據：${esc(r.receipt)}</p>`:''}<div class="mrow">${mb(p.rc?'收起紀錄':'看授權紀錄','payrc',id)}</div>${p.rc?payLog(r):''}`;
 else if(p.st==='failed'&&r)h=`<p class="err" role="status">▲ ${esc(by)}沒付成${r.note?'：'+esc(r.note):''}</p><button class="btn pri wide" data-act="pay" data-id="${id}">再授權一次：${esc(lab)}</button><div class="mrow">${mb(p.rc?'收起紀錄':'看授權紀錄','payrc',id)}</div>${p.rc?payLog(r):''}`;
 else h=`<button class="btn pri wide" data-act="pay" data-id="${id}">${esc(lab)}</button><p class="note">按下就是授權${by}付這一筆，5 秒內可取消；面板不碰錢。</p>`;
 return `<div class="payc" data-pay="${id}">${h}</div>`};
ACT.pay=id=>{if(LV.mode!=='live'||!LV.api||!LV.api.payAuthorize)return LV.payDemo(id);const p=PAY[id];if(!p||p.st==='count'||p.st==='sending'||p.st==='auth'||p.st==='paid'||p.bad)return;
 const src=paySrc(id);if(!src)return toast('找不到這筆的資料，沒有授權');
 p.prev=p.st;p.st='count';p.n=5;paySync(id);const c=document.querySelector(`[data-pay="${id}"] [data-act=paycancel]`);if(c)c.focus({preventScroll:true});
 PT[id]=setInterval(async()=>{p.n--;if(p.n>0){document.querySelectorAll(`[data-pay="${id}"] .pn`).forEach(e=>{e.textContent=p.n});return}
  clearInterval(PT[id]);delete PT[id];p.st='sending';paySync(id);
  try{const r=await LV.api.payAuthorize(src);p.auth=r;p.st='auth';p.rc=0;paySync(id);toast(`授權了，${PBY[src.by]}會收到通知`);setTimeout(payPoll,35000)}
  catch(e){p.st=p.prev==='failed'?'failed':'idle';paySync(id);toast(NOFN(e)?'資料庫還沒更新，付款授權還沒上線，這筆沒有扣款':e&&e.kind==='forbidden'?'只有老大本人的網址能按付款，這筆沒有授權':'沒送出授權：'+LERR(e))}},1000)};
ACT.paycancel=id=>{const p=PAY[id];if(!p||p.st!=='count')return;clearInterval(PT[id]);delete PT[id];p.st=p.prev==='failed'?'failed':'idle';paySync(id);toast('付款取消了，沒有授權、沒有扣款')};
ACT.payundo=id=>{const p=PAY[id];if(!p||!p.auth)return;if(!LV.api.payCancel)return toast('這個動作還沒接上');const aid=p.auth.id;LV.api.payCancel(aid).then(r=>{if(r&&r.ok===false)return toast(r.why||'撤不回');p.auth=null;p.st='idle';paySync(id);toast(`撤回了，請${PBY[p.by]}不要付`);LV.api.say(null,`【付款授權撤回】授權單 #${aid}（${p.amt} 給 ${p.to}）老大撤回了，還沒付就不要付；已經付了請回報`,p.by==='jiji'?'jiji':p.by).catch(()=>{})}).catch(e=>toast('沒撤回：'+LERR(e)))};
async function payPoll(){if(LV.mode!=='live'||!LV.api||!LV.api.payList||LV.payNo)return;try{payApplyRows(await LV.api.payList());Object.keys(PAY).forEach(k=>{if(document.querySelector(`[data-pay="${k}"]`))paySync(k)})}catch(e){if(NOFN(e))LV.payNo=1}}
WRITE.push('payundo');window.__zl=Object.assign(window.__zl||{},{payPoll});
// 行事曆：更新於幾分鐘前、現在更新
function calAgo(){const s=LV.cal&&LV.cal.synced;if(!s)return '';const t=Math.max(...Object.values(s).map(x=>Date.parse(x)||0));if(!t)return '';const m=Math.round((Date.now()-t)/6e4);return m<1?'剛剛':m<60?m+' 分鐘前':LMD(t)+' '+LHM(t)}
function calKick(force){if(LV.mode!=='live'||!LV.api||!LV.api.calRefresh||LV.calNo)return Promise.resolve(false);if(!force&&Date.now()-(LV.calKickAt||0)<90000)return Promise.resolve(false);LV.calKickAt=Date.now();
 return LV.api.calRefresh().then(()=>{[30000,60000].forEach(ms=>setTimeout(()=>LV.api.cal(14).then(d=>{LV.cal=d;applyCal();render('keep')}).catch(()=>{}),ms));return true}).catch(e=>{if(NOFN(e))LV.calNo=1;return false})}
ACT.calnow=()=>{if(LV.calNo)return toast('資料庫還沒更新，現在更新還沒上線；Mac 每 2 分鐘會自己同步');calKick(true).then(ok=>toast(ok?'叫 Mac 現在同步了，約 30 秒到':'沒叫到，Mac 每 2 分鐘會自己同步'))};
const calUpd=()=>{const a=calAgo();return a?`<div class="mrow calupd"><small>行事曆更新於 ${a}</small>${mb('↻ 現在更新','calnow')}</div>`:''};
{const _p=pageHTML;pageHTML=function(){let h=_p();if(S.page==='cal'){/* 2026-11-24 DB 降載：打開行事曆頁不再自動叫同步，只有按「現在更新」才同步 */h=h.replace('每 30 分鐘從 Google 行事曆同步一次。','Mac 每 2 分鐘從 Google 行事曆同步一次，Mac 關機時停在最後一次。').replace(/(<h1 class="pt">行事曆<\/h1>)/,'$1'+calUpd())}return h}}
{const _t=todayStrip;todayStrip=function(){const h=_t();if(!h)return h;if(S.tab==='today')calKick();const i=h.lastIndexOf('</section>');return i<0?h:h.slice(0,i)+calUpd()+h.slice(i)}}
{const _x=loadExtra;loadExtra=async function(){await _x();if(ZN('pay')&&LV.mode==='live')await payPoll()}}

/* ---------- 開機 ---------- */
(async()=>{try{
 const A=await import('./adapter.js?v122');LV.A=A;const q=new URLSearchParams(location.search),mf=q.get('mock');
 LV.forced=mf!==null&&mf!=='0';LV.nokey=!A.hasKey()&&!A.hasSession()&&!LV.forced;
 if(LV.nokey){loginShow();return}   // v60：沒金鑰也沒登入＝登入頁（示範資料改用 ?mock=1 或登入頁的「先看示範」）
 LV.api=await A.createAdapter();LV.mode=LV.api.mode;
 await loadAll(true);schedule();
 if(LV.api.subscribe)LV.api.subscribe(()=>reload(),()=>{});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&LV.net!=='auth'&&Date.now()-(LV.visAt||0)>120000){LV.visAt=Date.now();reload()}});   // 2026-11-24 DB 降載：切回面板最多 2 分鐘重讀一次
 addEventListener('online',()=>reload());addEventListener('offline',()=>{if(LV.at){LV.net='offline';S.st='offline';paint()}});
}catch(e){LV.net='error';LV.err=LERR(e);S.st='error';render()}})();
// 機會卡（老大 2026-11-22：「應該要有完整標題 以及他是幹嘛的還有他可以拿多少錢」「記得有暫存扭跟深入了解的鈕 還有個不要的鈕吧？」）
// 卡面＝完整標題、一句在做什麼、能拿多少，下面三顆正式按鈕：深入了解、暫存到明天、不要了
const oppWhat=o=>{const r=o.raw||{},fs=(o.facts||[]).map(String),q=(r.quick||[]).map(String);
 const f=fs.find(x=>/^(項目|類別|內容|工作|做什麼|要做)[：:]/.test(x))||q.find(x=>!/截止|押標金|報名費|免費/.test(x))||q[0]||o.why||'';return f.replace(/^(項目|類別|內容|工作|做什麼|要做)[：:]\s*/,'')};
const oppAmt=o=>{const r=o.raw||{},d=r.amountDisplay||'',l=r.amountLabel||'';return d&&l&&d.indexOf(l)<0?l+' '+d:(o.amt||'')};
oppCard=function(o){const sn=o.st==='snoozed',w=oppWhat(o);
 return `<article class="card cardx ocard" data-card="${esc(o.id)}">${mineB('opp:'+o.id,o.title)}<div class="meta">${chip(sn?o.snz:o.due,!sn&&o.days<=4)}<span class="lbl">${esc(brief(BASK[o.b],o.org))}</span></div><h3>${cgo(esc(o.title),'sheet','opp:'+o.id)}</h3>${w?`<p class="owhat">${esc(w)}</p>`:''}<p class="amt" style="color:var(--ink)">${esc(oppAmt(o))}</p>
 <div class="btns">${B('深入了解','sheet','opp:'+o.id,'pri')}${sn?B('放回清單','unsnooze',o.id):B('暫存到明天','snooze',o.id)}${sn?'':B('不要了','del',o.id,'ghost')}</div>${aifs([aiF('jiji','opp:'+o.id,o.took?'建好了':'')])}</article>`};
// 拍板卡（老大 2026-11-22：「要我處理事情的卡片 也太省略內容，我哪知道那樣要幹嘛？ 照你的建議做 跟其他做法跟看細節 這些按鈕的位置太不平衡了吧」）
// 卡面寫完整的問題＋一句為什麼要你定；按鈕：上排「照建議」整列，下排「其他做法」「看細節」等寬並排，定定的臉放同一排右邊
{const _s=decSlide;decSlide=function(d,n){const r=_s(d,n),raw=d.raw||{};
 const q=String(d.q||raw.question||d.ask||'').replace(/\s*([\u2460-\u2469])/g,'\n$1').trim();
 const det=String(raw.detail||'').replace(/\s+/g,' ').trim(),why=det&&det!==q?(det.length>90?det.slice(0,88)+'…':det):'';
 let h=r.html.replace(/<h2 class="dq"([^>]*)>[\s\S]*?<\/h2>/,`<h2 class="dq dfull"$1>${esc(q)}</h2>${why?`<p class="dwhy">${esc(why)}</p>`:''}`);
 h=h.replace(/<div class="mrow"><button class="mb" data-act="decopen" data-id="([^"]*)">其他做法・看細節<\/button><\/div>/,(m,id)=>`<div class="drow2"><button class="btn" data-act="decopen" data-id="${id}">其他做法</button><button class="btn" data-act="decopen" data-id="${id}">看細節</button>__DIN__</div>`);
 if(h.indexOf('__DIN__')>-1){const a=h.lastIndexOf('<div class="aifs');if(a>-1){const e=h.indexOf('</div>',a);const face=h.slice(a,e+6);h=h.slice(0,a)+h.slice(e+6);h=h.replace('__DIN__',face)}else h=h.replace('__DIN__','')}
 r.html=h;return r}}
/* ---------- v50（2026-11-22）：生活待辦、備品請萌萌比價、錢房間改成金金的理財房間 ----------
   老大原話：「生活也要多一個代辦」「待辦」「然後備品那邊加入清單也要可以讓萌萌去比價啊」
   「另外我們設計的時候 錢夜不是要跟記帳面板做出差別嗎？怎麼現在都是塔塔在管？我印象中應該是要金金管吧？那一夜應該要放的是 整個理財的內容吧？」
   待辦：hub_life_items kind='todo'。資料庫 v50 遷移套上前，資料庫不收 todo，先存成 kind='rout'、cat='_todo'（遷移會轉正），兩種都讀。
   刪掉的 72 小時內可救回：讀 hub_life_gone（遷移後才有），沒有就用這支手機記的。
   備品比價：排進「要買」的那一項可以請萌萌比價，走 v40 對話（Mac relay 轉送）；卡上的狀態從萌萌那段對話讀回來。
   錢：房間主人、右上角、對話都是金金；記一筆、最近幾筆、帳戶明細、訂閱移到塔塔記帳，錢房間只留一列入口，塔塔小臉只在帳務那一段。 */
const LGK='zl_life_gone';LV.supRun={};LV.monMsgs=null;LV.monKey='';LV.lifeGone=null;DB.ltodo=[];
const isLT=x=>x.kind==='todo'||(x.kind==='rout'&&x.cat==='_todo');
const clip=(s,n)=>{s=String(s||'').replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n-1)+'…':s};
{const f=applyLife;applyLife=function(){f();const it=(LV.life&&LV.life.items)||[];
 DB.rout=DB.rout.filter(r=>!(r.raw2&&isLT(r.raw2)));
 DB.ltodo=it.filter(isLT).map(x=>({id:x.id,name:x.name,note:x.note||'',done:x.status==='done',at:x.created_at,by:x.created_by||'',raw2:x})).reverse()}}
const ltodos=()=>E()?[]:(DB.ltodo||[]),LT=id=>(DB.ltodo||[]).find(x=>x.id===id);
function goneLocal(){try{const a=JSON.parse(localStorage.getItem(LGK)||'[]'),t=Date.now()-72*36e5;return Array.isArray(a)?a.filter(x=>x&&x.id&&x.at>t):[]}catch(e){return []}}
function goneSave(a){try{localStorage.setItem(LGK,JSON.stringify(a.slice(0,60)))}catch(e){}}
function goneAdd(x){const a=goneLocal().filter(g=>g.id!==x.id);a.unshift({id:x.id,name:x.name,at:Date.now()});goneSave(a)}
function goneDel(id){goneSave(goneLocal().filter(g=>g.id!==id))}
function ltGone(){const m=new Map();(LV.lifeGone||[]).filter(g=>g.kind==='todo'||g.cat==='_todo').forEach(g=>m.set(g.id,{id:g.id,name:g.name}));
 goneLocal().forEach(g=>{if(!m.has(g.id))m.set(g.id,g)});const live=new Set(((LV.life&&LV.life.items)||[]).map(x=>x.id));return [...m.values()].filter(g=>!live.has(g.id))}
function todoRow(t){return `<div class="rowi" data-card="${esc(t.id)}"><div class="rowb" style="align-items:flex-start"><button class="tx" data-act="sheet" data-id="ltodo:${esc(t.id)}" style="min-height:44px"><b>${esc(t.name)}</b><small>${t.note?esc(clip(t.note,40))+'・':''}${t.by&&t.by!=='Borry'?esc(nickOf(t.by))+' 加的・':''}${t.at?LMD(Date.parse(t.at))+' 加入':''}</small></button><span class="rt">${mb('✓ 做完','ltdone',t.id)}</span></div></div>`}
const nickOf=n=>({'AI協作':'大器','Borry':'你'}[n]||n);
function todoHTML(){const a=ltodos(),open=a.filter(t=>!t.done),done=a.filter(t=>t.done),gone=E()?[]:ltGone(),od=!!S.open.ltdone,og=!!S.open.ltgone;
 let h=`<div class="wadd"><label class="vh" for="ltIn">新增待辦</label><input id="ltIn" type="text" placeholder="要做的事，例：預約牙醫" enterkeyhint="done" autocomplete="off" maxlength="200"><button class="btn pri" data-act="ltadd">加進去</button></div>${S.err==='lt'?'<p class="err" role="alert">▲ 還沒寫字。寫要做的事就好。</p>':''}`;
 h+=open.length?`<section class="sec" style="margin-top:14px"><h2 class="vh">待辦，新的在上面</h2><div class="rows stg">${open.map(todoRow).join('')}</div></section>`:emptyBox('沒有待辦','想到要做的事寫在上面，做完點一下打勾。');
 if(done.length)h+=`<section class="sec"><div class="rows"><div class="rowi"><button class="rowb" data-act="open" data-id="ltdone" aria-expanded="${od}"><span class="tx"><b>做完的 ${done.length} 項</b></span><span class="rt"><span class="chev" aria-hidden="true">${od?'⌃':'⌄'}</span></span></button></div>${od?done.map(t=>`<div class="rowi" data-card="${esc(t.id)}"><div class="rowb"><button class="tx" data-act="sheet" data-id="ltodo:${esc(t.id)}" style="min-height:44px"><b style="font-weight:500"><s>${esc(t.name)}</s></b></button><span class="rt">${mb('改回沒做','ltundo',t.id)}</span></div></div>`).join(''):''}</div></section>`;
 if(gone.length)h+=`<section class="sec"><div class="rows"><div class="rowi"><button class="rowb" data-act="open" data-id="ltgone" aria-expanded="${og}"><span class="tx"><b>最近刪掉的 ${gone.length} 項</b><small>72 小時內可以救回</small></span><span class="rt"><span class="chev" aria-hidden="true">${og?'⌃':'⌄'}</span></span></button></div>${og?gone.map(t=>`<div class="rowi"><div class="rowb"><span class="tx"><b style="font-weight:500">${esc(t.name)}</b></span><span class="rt">${mb('↺ 救回','ltrestore',t.id)}</span></div></div>`).join(''):''}</div></section>`;
 return h}
// 備品：排進「要買」的那一項請萌萌比價；狀態從萌萌那段對話讀（送出時句子裡帶備品編號）
function supCmp(u){const ms=LV.monMsgs||[];let q=-1;ms.forEach((m,i)=>{if(m.kind==='user'&&m.body.indexOf('【測試】')!==0&&Date.now()-m.at<14*864e5&&m.body.indexOf('備品編號 '+u.id)>-1)q=i});   // 驗收用的【測試】訊息與兩週前的不算
 if(q<0)return LV.supRun[u.id]?{run:1,t:'萌萌比價中'}:null;
 const later=ms.slice(q+1).filter(m=>m.kind!=='user'),r=later.find(m=>m.body.indexOf(u.name)>-1)||later[0];
 return r?{t:'萌萌：'+clip(r.body,34)}:{run:1,t:'萌萌比價中・'+LHM(ms[q].at)+' 送出'}}
function loadMon(){if(!LV.api||!LV.api.msgs)return Promise.resolve();return LV.api.msgs(null,'mon').then(ms=>{const k=JSON.stringify(ms.map(m=>m.id));if(k!==LV.monKey){LV.monKey=k;LV.monMsgs=ms;LV.sig='';if(S.tab==='life'&&!S.sheet)paint()}}).catch(()=>{})}
{const f=zoneLife;zoneLife=function(){const s=S.sub.life,real=s==='todo';if(real)S.sub.life='rout';let h;try{h=f()}finally{if(real)S.sub.life='todo'}
 const a=h.indexOf('<div class="seg" role="group" aria-label="生活分類">');if(a<0)return h;const e=h.indexOf('</div>',a)+6;let seg=h.slice(a,e);
 if(real)seg=seg.replace('aria-pressed="true"','aria-pressed="false"');
 seg=seg.replace(/(<button[^>]*data-id="life:sup"[^>]*>[^<]*<\/button>)/,(m)=>m+`<button aria-pressed="${real}" data-act="sub" data-id="life:todo">待辦 ${ltodos().filter(t=>!t.done).length}</button>`);
 if(real)return h.slice(0,a)+seg+todoHTML();
 h=h.slice(0,a)+seg+h.slice(e);
 if(s==='sup'&&LV.life)tobuy().forEach(u=>{const st=supCmp(u),old=`<small>${u.cat}・上次買 ${u.last}</small></span><span class="rt">${mb('✓ 買好了','bought',u.id)}</span>`;
  h=h.replace(old,()=>`<small>${u.cat}・上次買 ${u.last}${st?`<br><span class="cmpst${st.run?' run':''}">${bm('mon',st.run?'thinking':'','sm')}${esc(st.t)}</span>`:''}</small></span><span class="rt supbt">${mb(bm('mon')+(st?(st.run?'看比價進度':'看萌萌比價'):'請萌萌比價'),'supcmp',u.id)}${mb('✓ 買好了','bought',u.id)}</span>`)});
 return h}}
// 資料庫還不收 todo 時（v50 遷移沒套）記在這支手機一天，免得每次新增都先撞一次錯
const LTK='zl_todo_legacy';function ltLegacy(){try{return Date.now()-(+localStorage.getItem(LTK)||0)<864e5}catch(e){return false}}
async function ltNew(name){if(!ltLegacy()){try{return await LV.api.lifeSet(null,'todo',{name})}catch(e){if(!/kind and name required|check constraint/i.test(String(e&&e.message||'')))throw e;try{localStorage.setItem(LTK,String(Date.now()))}catch(x){}}}
 return LV.api.lifeSet(null,'rout',{name,cat:'_todo'})}
ACT.ltadd=()=>{const t=$('#ltIn'),v=t?t.value.trim():'';if(!v){S.err='lt';render('keep');const x=$('#ltIn');if(x)x.focus();return}S.err='';
 ltNew(v.slice(0,200)).then(()=>{const x=$('#ltIn');if(x)x.value='';toast('加進待辦了：'+clip(v,24));return reloadLife()}).catch(e=>toast('沒存上：'+LERR(e)))};
ACT.ltdone=id=>{const t=LT(id);if(!t)return;closeThen(()=>lw(id,null,{status:'done'},'做完了：'+clip(t.name,24),{patch:{status:'active'}}))};
ACT.ltundo=id=>{const t=LT(id);if(!t)return;closeThen(()=>lw(id,null,{status:'active'},'改回沒做',{patch:{status:'done'}}))};
ACT.ltdel=id=>{const t=LT(id);if(!t)return;closeThen(()=>{goneAdd(t);lw(id,null,{status:'dropped'},'刪掉了，72 小時內可救回',{patch:{status:t.done?'done':'active'}})})};
ACT.ltrestore=id=>{LV.api.lifeSet(id,null,{status:'active'}).then(()=>{goneDel(id);if(LV.lifeGone)LV.lifeGone=LV.lifeGone.filter(g=>g.id!==id);toast('救回來了，放回待辦');return reloadLife()}).catch(e=>toast('沒救回：'+LERR(e)))};
ACT.ltsave=id=>{const t=LT(id);if(!t)return;const v=(($('#ltName')||{}).value||'').trim(),n2=(($('#ltNote')||{}).value||'').trim();if(!v){toast('要寫做什麼');return}
 closeThen(()=>lw(id,null,{name:v.slice(0,200),note:n2.slice(0,500)},'存好了',{patch:{name:t.name,note:t.note}}))};
ACT.supcmp=(id,el)=>{const u=DB.sup.find(x=>x.id===id);if(!u)return;if(supCmp(u)){openChat('mon','sup:'+id,el,null);return}
 LV.supRun[id]=1;LV.sig='';
 botAsk('mon',`請比價備品「${u.name}」${u.raw2&&u.raw2.note?'（'+u.raw2.note+'）':''}（備品編號 ${id}），列三家含運總價與到貨時間，推薦一家`,'sup:'+id);setTimeout(loadMon,3000)};
{const f=ACT.buy;ACT.buy=id=>{const u=DB.sup.find(x=>x.id===id);if(!u)return;lw(id,'sup',{need:true},`${u.name}排進要買，可以請萌萌比價`,{patch:{need:false}})}}
{const _s=sheetHTML;sheetHTML=function(){const a=(S.sheet||'').split(':');if(a[0]!=='ltodo')return _s();const t=LT(a[1]);if(!t)return shHead('這項不在了');
 return shHead(esc(clip(t.name,24)))+`<label class="f">要做什麼<input id="ltName" type="text" maxlength="200" autocomplete="off" value="${esc(t.name)}"></label><label class="f">備註<textarea id="ltNote" rows="3" maxlength="500">${esc(t.note)}</textarea></label><p class="note">${t.by&&t.by!=='Borry'?esc(nickOf(t.by))+' 加的・':''}${t.at?LMD(Date.parse(t.at))+' 加入':''}${t.done?'・已做完':''}</p><div class="btns">${B('存好這一項','ltsave',t.id,'pri wide')}</div><div class="mrow">${t.done?mb('改回沒做','ltundo',t.id):mb('✓ 做完','ltdone',t.id)}${mb('🗑 刪掉','ltdel',t.id)}</div>`}}
{const _n=ctxName;ctxName=function(ctx){const a=(ctx||'').split(':');if(a[0]==='sup'){const u=DB.sup.find(x=>x.id===a[1]);return u?'備品：'+u.name:(a[1]==='cart'?'要買的備品':'')}
 if(a[0]==='ltodo'){const t=LT(a[1]);return t?'待辦：'+clip(t.name,24):''}if(a[0]==='massets')return '資產與配置';return _n(ctx)}}
{const _x=loadExtra;loadExtra=async function(){await _x();const api=LV.api,jobs=[];
 if(ZN('lifeGone')&&api.lifeGone&&!LV.goneNo)jobs.push(api.lifeGone().then(d=>{LV.lifeGone=Array.isArray(d)?d:[]}).catch(e=>{if(NOFN(e))LV.goneNo=1}));
 if(ZN('mon')&&LV.life&&((LV.life.items||[]).some(x=>x.kind==='sup'&&x.need)||Object.keys(LV.supRun).length))jobs.push(loadMon());
 await Promise.all(jobs)}}
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target&&e.target.id==='ltIn'){e.preventDefault();ACT.ltadd()}});
WRITE.push('ltadd','ltdone','ltundo','ltdel','ltrestore','ltsave','supcmp');

/* ---------- 錢房間＝金金的理財房間 ---------- */
OWN.money='kim';ZONE.money.b='kim';ZOF.kim='money';FRESH.kim='';{const t=$('#tabs');if(t)delete t.dataset.k}   // 底部分頁的臉跟著換成金金
ROLE.kim='錢房間主人・理財';ROLE.tata='記帳與帳單・明細在塔塔記帳';
BOTS.kim.zone='錢';BOTS.kim.role='錢房間歸我：現金撐多久、資產配置、錢的目標、大筆該不該花。';BOTS.kim.can='看現金撐多久、資產怎麼配、錢的目標進度、一筆大錢該不該花';BOTS.kim.cant='付款、記帳、轉帳；每一筆明細是塔塔的事';
BOTS.kim.cmds=['錢這週怎麼看','現金撐得住嗎','資產配置要調嗎'];
BOTS.tata.zone='記帳';BOTS.tata.role='記帳、對帳、帳單歸我。每一筆在塔塔記帳。';
{const _q=quick;quick=function(on){const k=(on.ctx||'').split(':')[0];if(on.b==='kim'&&k==='wish')return['值不值得','等一等可以嗎'];if(on.b==='kim'&&k==='massets')return['資產配置要調嗎','預備金夠不夠','投資比例會不會太高'];return _q(on)}}
function kmNoData(){const car=cvHTML('money',[{id:'K',name:'理財',html:`<p class="mzhl mzkw">${aiF('kim','mkim')}<span>金金・理財</span></p><p class="mzsay">${esc(LV.moErr||'錢的資料還沒讀到')}</p>`}],'錢的看法',mzOn);
 return `<div class="zh zhx mz" data-z="money"><div class="zht"><h1>錢</h1><p class="zown">金金的房間・<span class="mzk">理財</span></p></div>${bigF('kim','money')}${car}</div>`}
{const f=mzHero;mzHero=function(){if(!LV.mo)return kmNoData();
 return f().replace(/<p class="zown">塔塔 ([^<]*?)・/,(m,st)=>`<p class="zown">金金的房間・${st.replace(' 讀取塔塔記帳',' 更新')}・`).replace(bigF('tata','money'),()=>bigF('kim','money'))}}
function kmAssets(){const ac=(LV.mo&&LV.mo.accounts)||[],bal=x=>+x.balance||0,sum=a=>a.reduce((s,x)=>s+bal(x),0);
 const isInv=x=>x.kind==='stock'||x.kind==='investment'||/00\d{3}|證券|ETF|基金|股票|投資/i.test(x.name||''),isDebt=x=>x.kind==='credit_card'||x.kind==='loan_in';
 const cash=ac.filter(x=>x.spendable&&!isDebt(x)&&!isInv(x)),inv=ac.filter(isInv),save=ac.filter(x=>!x.spendable&&!isDebt(x)&&!isInv(x)&&x.kind!=='loan_out'),debt=ac.filter(isDebt);
 const vc=Math.max(0,MZ.cash||sum(cash)),vs=Math.max(0,sum(save)),vi=Math.max(0,sum(inv)),tot=vc+vs+vi,vd=Math.abs(sum(debt)),pc=v=>tot>0?Math.round(v/tot*100):0;
 const row=(name,v,small,has)=>`<div class="rowi"><div class="rowb"><span class="tx"><b>${name}</b><small>${small}</small>${has?`<span class="gbar sm" aria-hidden="true"><u style="width:${pc(v)}%"></u></span>`:''}</span><span class="rt">${has?`<span class="amt">${nt(Math.round(v))}</span><span class="lbl">${pc(v)}%</span>`:'<span class="lbl">還沒接上</span>'}</span></div></div>`;
 return `<section class="sec" id="secAsset">${sh('','資產與配置',tot?'合計 '+nt(Math.round(tot)):'')}<div class="rows kmas">
 ${row('現金（能花的）',vc,`${cash.length} 個帳戶・算撐多久用這個數`,true)}
 ${row('預備金與存款',vs,save.length?`${save.length} 個帳戶・不算進能花的`:'塔塔記帳裡還沒有獨立的預備金帳戶',save.length>0)}
 ${row('投資',vi,inv.length?(vi>0?esc(clip(inv.map(x=>x.name).join('、'),30)):`有 ${inv.length} 個投資帳戶，市值還沒接上`):'例如 00692。塔塔記帳裡還沒有投資帳戶',inv.length>0&&vi>0)}
 ${debt.length?`<div class="rowi"><div class="rowb"><span class="tx"><b>負債</b><small>信用卡未繳與借款，${debt.length} 個帳戶</small></span><span class="rt"><span class="amt">${nt(Math.round(vd))}</span></span></div></div>`:''}</div>
 ${aifs([aiF('kim','massets')])}<p class="note mzfoot">只看大類和比例。每個帳戶的明細在塔塔記帳。</p></section>`}
function kmBig(){const ws=(E()?[]:DB.wish).filter(w=>w.st!=='bought'&&!w.noPrice&&w.price>=BIG);
 return `<section class="sec" id="secBig">${sh('','該不該花的大額',ws.length?`${ws.length} 筆・${nt(BIG)} 以上`:'')}${ws.length?`<div class="rows">${ws.map(w=>{const f=fin(w);return `<div class="rowi mzr" data-card="mw:${esc(w.id)}"><div class="rowb"><button class="tx" data-act="lifesub" data-id="wish"><b>${esc(w.name)}</b><small>${f.k==='ok'?'':'▲ '}${esc(f.t)}${w.shop?'・'+esc(w.shop):''}</small></button><span class="rt"><span class="amt">${nt(w.price)}</span>${aiF('kim','wish:'+w.id,w.kim==='run'?'看中':'')}</span></div></div>`}).join('')}</div><p class="note mzfoot">來自生活房間的「想買」。點金金的臉問值不值得，要買還是請朋朋。</p>`
  :`<div class="card"><p>現在沒有 ${nt(BIG)} 以上想買的東西。</p><p class="note">大筆想買的加進生活房間的「想買」，會出現在這裡，金金看該不該花。</p></div>`}</section>`}
function kmLedger(){return mzPay().replace('<div class="rows mztata">',()=>`<section class="sec" id="secLedger">${sh('tata','記帳與帳單','塔塔管')}<div class="rows mztata">`).replace('每一筆、帳單、訂閱、帳戶。','每一筆明細、帳戶、訂閱、帳單都在那裡記與改。')+'</section>'}
zoneMoney=function(){if(!LV.mo)return mzHero()+kmLedger();
 return mzHero()+`<div id="mz2">${mz2HTML()}</div>`+kmAssets()+mzGoals()+kmBig()+mzIn()+mzOut()+kmLedger()};
/* ---------- v52（2026-11-22）：生活條目左滑編輯刪除、請朋朋買、錢房間不放目標區與記帳 ----------
   老大原話：「然後生活那邊的條目也都要可以編輯跟刪除啊 左滑出現XX可以刪除之類或編輯」
   「要買東西不用按複製購買清單，就是按下去讓朋朋去幫找幫買的意思」
   「錢的目標不是用在上面大色卡移動嗎？」「記帳我不會在這邊記」
   生活：例行、備品、待辦、想買每一項往左滑（手指或滑鼠拖，pointer 事件）出現「編輯」「刪除」；「⋯」裡也有同樣兩項。
   刪除＝status dropped，72 小時內在各分頁底下「最近刪掉的」救回（hub_life_gone）。編輯經 hub_life_set 寫回，提示條可復原。
   備品「要買」的「複製購物清單」換成「請朋朋買」：清單送給朋朋（v40 對話，Mac relay 轉送），朋朋找、比價、下單；付款仍走付款授權單。
   錢：錢的目標只在大色卡左右滑的「目標」頁，下面不再另開目標區；記帳、帳戶、最近幾筆、訂閱、標已繳都不放，只留一列「打開塔塔記帳」與要你按的付款鈕。 */
const LKN={rout:'例行',sup:'備品',todo:'待辦',wish:'想買'};
function LI(id){const it=((LV.life&&LV.life.items)||[]).find(x=>x.id===id);if(it)return {k:isLT(it)?'todo':it.kind,x:it};
 const f=(a,k)=>{const x=(a||[]).find(q=>q.id===id);return x?{k,x:x.raw2||x}:null};
 return f(DB.ltodo,'todo')||f(DB.rout,'rout')||f(DB.sup,'sup')||f(DB.wish,'wish')}
const swa=id=>`<div class="swa" aria-hidden="true"><button class="swe" tabindex="-1" data-act="ledit" data-id="${esc(id)}">編輯</button><button class="swd" tabindex="-1" data-act="ldel" data-id="${esc(id)}">刪除</button></div>`;
// 刪掉的：資料庫 hub_life_gone 為主，這支手機記的補上（離線或剛刪還沒讀回）
function lgoneAdd(id,k,name){const a=goneLocal().filter(g=>g.id!==id);a.unshift({id,kind:k,name,at:Date.now()});goneSave(a)}
function lgone(k){const m=new Map(),ok=g=>k==='todo'?(g.kind==='todo'||g.cat==='_todo'):(g.kind===k&&g.cat!=='_todo');
 (LV.lifeGone||[]).filter(ok).forEach(g=>m.set(g.id,{id:g.id,name:g.name}));goneLocal().filter(g=>(g.kind||'todo')===k).forEach(g=>{if(!m.has(g.id))m.set(g.id,g)});
 const live=new Set(((LV.life&&LV.life.items)||[]).map(x=>x.id));return [...m.values()].filter(g=>!live.has(g.id))}
ltGone=()=>lgone('todo');
function goneSec(k){if(E()||k==='todo')return '';const g=lgone(k),op=!!S.open['lg'+k];if(!g.length)return '';
 return `<section class="sec"><div class="rows"><div class="rowi"><button class="rowb" data-act="open" data-id="lg${k}" aria-expanded="${op}"><span class="tx"><b>最近刪掉的${LKN[k]} ${g.length} 項</b><small>72 小時內可以救回</small></span><span class="rt"><span class="chev" aria-hidden="true">${op?'⌃':'⌄'}</span></span></button></div>${op?g.map(t=>`<div class="rowi"><div class="rowb"><span class="tx"><b style="font-weight:500">${esc(t.name)}</b></span><span class="rt">${mb('↺ 救回','lrestore',t.id)}</span></div></div>`).join(''):''}</div></section>`}
// 每一列、每張想買卡加上左滑的兩顆與「⋯」
function swDecorate(h){const t=document.createElement('template');t.innerHTML=h;
 t.content.querySelectorAll('.rowi[data-card]').forEach(r=>{const id=r.getAttribute('data-card'),li=LI(id);if(!li)return;const f=r.querySelector(':scope>.rowb');if(!f)return;
  r.classList.add('sw');r.setAttribute('data-sw',id);f.classList.add('swf');r.insertAdjacentHTML('afterbegin',swa(id));
  let rt=f.querySelector(':scope>.rt');if(!rt){f.insertAdjacentHTML('beforeend','<span class="rt"></span>');rt=f.querySelector(':scope>.rt')}
  rt.insertAdjacentHTML('beforeend',`<button class="mb swm" data-act="mine" data-id="life:${esc(id)}" aria-label="編輯或刪除：${esc(li.x.name||'')}"><span aria-hidden="true">⋯</span></button>`)});
 t.content.querySelectorAll('.stack>.card[data-card]').forEach(c=>{const id=c.getAttribute('data-card'),li=LI(id);if(!li||li.k!=='wish')return;
  const w=document.createElement('div');w.className='swrap sw';w.setAttribute('data-sw',id);c.classList.add('swf');c.parentNode.insertBefore(w,c);w.insertAdjacentHTML('afterbegin',swa(id));w.appendChild(c)});
 return t.innerHTML}
{const f=zoneLife;zoneLife=function(){const s=S.sub.life;let h=f();
 if(s==='sup')h=h.replace('<button class="more" data-act="copy">複製購物清單</button>',()=>`<button class="more" data-act="cartbuy">請朋朋買</button>`);
 if(s==='sup'){const c=cartNote();if(c)h=h.replace(/(<section class="sec" style="margin-top:14px">[\s\S]*?<\/section>)/,(m)=>m.replace(/<\/section>$/,c+'</section>'))}
 if(LV.life||!E())h=swDecorate(h);
 return h+(['rout','sup','wish'].includes(s)?goneSec(s):'')}}
// 「⋯」：生活列＝編輯、刪除；想買卡原本的清單加「編輯」
{const f=mineSheet;mineSheet=function(id){const i=id.indexOf(':'),k=id.slice(0,i),x=id.slice(i+1);
 if(k==='life'){const li=LI(x);if(!li)return shHead('這項不在了');return shHead(esc(clip(li.x.name,24)))+`<div class="mlist">${mi('✎','編輯','ledit',x)}${mi('🗑','刪除（72 小時內可救回）','ldel',x)}</div>`}
 const h=f(id);return k==='wish'&&LI(x)?h.replace('<div class="mlist">',()=>'<div class="mlist">'+mi('✎','編輯','ledit',x)):h}}
// 編輯抽屜：照種類給欄位
const LF={rout:[['name','名稱','text'],['last_date','上次做的日期','date'],['cycle_days','多久一次（天）','number']],
 sup:[['name','名稱','text'],['cat','分類','text'],['note','備註','area']],
 wish:[['name','品名','text'],['price','價格（NT$）','number'],['shop','店家','text'],['url','網址','url'],['note','規格或備註','area']]};
{const _s=sheetHTML;sheetHTML=function(){const a=(S.sheet||'').split(':');if(a[0]!=='ledit')return _s();const li=LI(a.slice(1).join(':'));if(!li)return shHead('這項不在了');
 if(li.k==='todo'){S.sheet='ltodo:'+li.x.id;return sheetHTML()}
 const x=li.x,fs=LF[li.k]||LF.sup;
 return shHead('編輯'+LKN[li.k]+'：'+esc(clip(x.name,16)))+fs.map(([k,l,ty])=>{const v=x[k]==null?'':String(x[k]);
  return ty==='area'?`<label class="f">${l}<textarea id="le_${k}" rows="3" maxlength="500">${esc(v)}</textarea></label>`
   :`<label class="f">${l}<input id="le_${k}" type="${ty}"${ty==='number'?' inputmode="numeric" min="0"':''}${ty==='date'?` max="${today()}"`:''} maxlength="${k==='url'?500:200}" autocomplete="off" value="${esc(ty==='date'?v.slice(0,10):v)}"></label>`}).join('')
  +`${S.err==='le'?'<p class="err" role="alert">▲ 名稱不能空白。</p>':''}<div class="btns">${B('存好這一項','lsave',x.id,'pri wide')}</div><div class="mrow">${mb('🗑 刪除','ldel',x.id)}</div>`}}
ACT.ledit=id=>{swCloseAll(true);S.err='';ACT.sheet('ledit:'+id)};
ACT.lsave=id=>{const li=LI(id);if(!li)return;const fs=LF[li.k]||LF.sup,p={},old={};
 for(const [k,,ty] of fs){const el=$('#le_'+k);if(!el)continue;let v=el.value.trim();
  if(k==='name'&&!v){S.err='le';render('keep');return}
  if(ty==='number'){if(v===''){if(k==='cycle_days')continue;v=null}else{v=Math.max(0,+v);if(!isFinite(v))continue;if(k==='cycle_days')v=Math.max(1,Math.round(v))}}
  if(k==='url'&&v&&!/^https?:\/\//i.test(v)){toast('網址要 http 或 https 開頭');return}
  const o=li.x[k]==null?(ty==='number'?null:''):li.x[k];if(String(v==null?'':v)===String(o==null?'':ty==='date'?String(o).slice(0,10):o))continue;p[k]=v;old[k]=o}
 S.err='';if(!Object.keys(p).length){closeThen(()=>toast('沒有改到東西'));return}
 closeThen(()=>lw(id,null,p,'存好了：'+clip(p.name||li.x.name,20),{patch:old}))};
ACT.ldel=id=>{const li=LI(id);if(!li)return;swCloseAll(true);const st=li.x.status==='done'?'done':'active';
 closeThen(()=>{lgoneAdd(id,li.k,li.x.name);lw(id,null,{status:'dropped'},`刪掉了：${clip(li.x.name,16)}，72 小時內可救回`,{patch:{status:st}}).then(()=>{if(LV.api.lifeGone)LV.api.lifeGone().then(d=>{LV.lifeGone=Array.isArray(d)?d:LV.lifeGone;LV.sig='';paint()}).catch(()=>{})})})};
ACT.lrestore=id=>{LV.api.lifeSet(id,null,{status:'active'}).then(()=>{goneDel(id);if(LV.lifeGone)LV.lifeGone=LV.lifeGone.filter(g=>g.id!==id);toast('救回來了');return reloadLife()}).catch(e=>toast('沒救回：'+LERR(e)))};
ACT.ltrestore=ACT.lrestore;
{const f=ACT.mine;ACT.mine=id=>{swCloseAll(true);return f(id)}}
// 請朋朋買：要買的備品整份交給朋朋找、比價、下單；付款仍要老大按付款鈕
const CARTK='zl_cart_ask';
function cartNote(){let c=null;try{c=JSON.parse(localStorage.getItem(CARTK)||'null')}catch(e){}if(!c||Date.now()-c.at>3*864e5)return '';
 const left=tobuy().filter(u=>c.ids.includes(u.id)).length;if(!left)return '';
 return `<p class="note cartst">${bm('peng','','sm')}<span>${LMD(c.at)} ${LHM(c.at)} 請朋朋買了 ${c.ids.length} 樣，還有 ${left} 樣沒標買好。付款時朋朋會開授權單給你按。</span></p>`}
ACT.cartbuy=(id,el)=>{const a=tobuy();if(!a.length){toast('沒有要買的備品');return}
 const lines=a.map(u=>`・${u.name}（${u.cat}${u.raw2&&u.raw2.note?'，'+u.raw2.note:''}，備品編號 ${u.id}）`).join('\n');
 try{localStorage.setItem(CARTK,JSON.stringify({at:Date.now(),ids:a.map(u=>u.id)}))}catch(e){}
 LV.sig='';botAsk('peng',`【請朋朋買】老大要買這 ${a.length} 樣備品，請幫忙找、比價後下單：\n${lines}\n付款請開付款授權單，等老大在逐流按付款鈕，不要自己付。買好跟我說是哪幾樣`,'sup:cart')};
WRITE.push('ledit','lsave','ldel','lrestore','cartbuy');
// 左滑：手指或滑鼠拖都行（pointer 事件，拾穗 #42）。只開一列；點別處或捲動就收回
const SWW=144;let SWD=null,swNoClick=0;
const swFront=el=>el.querySelector(':scope>.swf');
function swSet(el,x,anim){const f=swFront(el);if(!f)return;f.style.transition=anim?'':'none';f.style.transform=x?`translateX(${x}px)`:''}
function swOpen(el,on){if(!el)return;const a=el.querySelector(':scope>.swa');
 if(on){swCloseAll(false,el);el.classList.add('swon','open');swSet(el,-SWW,true);if(a){a.removeAttribute('aria-hidden');a.querySelectorAll('button').forEach(b=>b.removeAttribute('tabindex'))}}
 else{el.classList.remove('open');swSet(el,0,true);if(a){a.setAttribute('aria-hidden','true');a.querySelectorAll('button').forEach(b=>b.setAttribute('tabindex','-1'))}setTimeout(()=>{if(!el.classList.contains('open'))el.classList.remove('swon')},RM?0:220)}}
function swCloseAll(now,keep){document.querySelectorAll('.sw.open').forEach(el=>{if(el!==keep)swOpen(el,false)})}
document.addEventListener('pointerdown',e=>{const el=e.target.closest&&e.target.closest('[data-sw]');
 if(!el){if(!(e.target.closest&&e.target.closest('.swa')))swCloseAll();return}
 if(e.button>0||e.target.closest('.swa'))return;SWD={el,x:e.clientX,y:e.clientY,t:performance.now(),id:e.pointerId,on:0,base:el.classList.contains('open')?-SWW:0,dx:0}},{passive:true});
document.addEventListener('pointermove',e=>{if(!SWD||e.pointerId!==SWD.id)return;const dx=e.clientX-SWD.x,dy=e.clientY-SWD.y;
 if(!SWD.on){if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*1.2){SWD.on=1;swCloseAll(false,SWD.el);SWD.el.classList.add('swon');try{SWD.el.setPointerCapture(e.pointerId)}catch(_){}}else{if(Math.abs(dy)>10)SWD=null;return}}
 let x=SWD.base+dx;if(x>0)x*=.25;if(x<-SWW)x=-SWW+(x+SWW)*.3;SWD.dx=dx;swSet(SWD.el,x,false)},{passive:true});
function swEnd(e){if(!SWD||e.pointerId!==SWD.id)return;const m=SWD;SWD=null;if(!m.on)return;swNoClick=performance.now();
 const vel=m.dx/Math.max(1,performance.now()-m.t),x=m.base+m.dx;swOpen(m.el,vel<-.4||(vel<=.4&&x<-SWW/2))}
document.addEventListener('pointerup',swEnd);document.addEventListener('pointercancel',swEnd);
document.addEventListener('click',e=>{if(performance.now()-swNoClick<350&&e.target.closest&&e.target.closest('[data-sw]')&&!e.target.closest('.swa')){e.stopPropagation();e.preventDefault()}},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')swCloseAll()});
addEventListener('scroll',()=>{if(!SWD&&document.querySelector('.sw.open'))swCloseAll()},{passive:true,capture:true});

/* ---------- 錢：目標只在大色卡；記帳只留一列入口 ---------- */
function kmLedger2(){const all=E()?[]:DB.due.filter(d=>!d.paid),hand=all.filter(d=>!d.auto&&d.in<=7);
 return `${hand.length?`<section class="sec" id="secDue">${sh('tata','要你按的',`7 天內 ${hand.length} 筆`)}<div class="stack">${hand.map(d=>`<div class="card dr" data-card="${esc(d.id)}"><div class="meta">${chip(`${d.due} 截止・剩 ${d.in} 天`,d.in<=3)}<span class="lbl">要手動繳</span></div><div class="li"><div><h3>${esc(d.name)}</h3></div><span class="amt">${nt(d.amt)}</span></div>${payHTML('d_'+d.id)}</div>`).join('')}</div></section>`:''}
 <section class="sec" id="secLedger"><div class="rows mztata"><div class="rowi"><a class="rowb" href="https://borrysu.github.io/kakeibo/" target="_blank" rel="noopener"><span class="tx"><b>打開塔塔記帳</b><small>記帳、帳單、訂閱在那裡</small></span><span class="rt"><span class="chev" aria-hidden="true">↗</span></span></a></div></div></section>`}
zoneMoney=function(){if(!LV.mo)return mzHero()+kmLedger2();
 return mzHero()+`<div id="mz2">${mz2HTML()}</div>`+kmAssets()+kmBig()+mzIn()+mzOut()+kmLedger2()};
/* ---------- v54（2026-11-22）：錢頁收支趨勢、負債算進淨資產 ----------
   老大原話：「另外錢頁會有現金流？收入？or負債支出？跟收支分析嗎？不確定」「我說的收支分系不是細項 是類似.. hmm 趨勢嗎？這種不確定」
   金金看往後、塔塔看過去；錢頁不放分類細項。大色卡下面、資產與配置上面放一張小圖：近 6 個月每月收入、支出兩根柱並排，
   上面一條「每月存下來多少」的線，旁邊金金一句（由資料算出的規則句）；「看 12 個月」展開 12 個月與各月數字。
   資料：hub_money_trend（只讀，跟 hub_money_overview 同一道門：老大本人或管理員金鑰）。資料庫還沒套 v54 遷移時寫「還沒接上」，不放假數字。
   資產與配置：負債（卡債、借款、分期）放進去，算出淨資產；掛在信用卡上的分期已含在卡債裡，不重複扣。 */
const MTW=n=>{const a=Math.abs(n),s=n<0?'負 ':'';if(a>=10000)return s+(Math.round(a/1000)/10).toFixed(1).replace(/\.0$/,'')+' 萬';if(a>=1000)return s+Math.round(a/1000)+' 千';return s+Math.round(a)};
const MTM=m=>{const k=+String(m).slice(5,7);return k+'月'};
function mtOk(m){return m&&!m.before_data&&+m.n>0}
function mtDir(a,n){const zn=k=>['零','一','兩','三','四'][k]||k,f=a[0],l=a[a.length-1],d=a.slice(1).map((v,i)=>v-a[i]);
 if(Math.abs(l-f)<=Math.max(Math.abs(f),1)*0.1)return '持平';
 if(d.every(x=>x<0))return zn(n)+'個月往下';if(d.every(x=>x>0))return zn(n)+'個月往上';
 return l>f?`比${zn(n-1)}個月前多`:`比${zn(n-1)}個月前少`}
function mtSay(ms){const done=ms.filter(m=>!m.partial&&mtOk(m)),a=done.slice(-3);
 if(a.length<2)return done.length?`記帳資料才 ${done.length} 個完整月，趨勢還看不出來。`:'塔塔記帳還沒有完整一個月的收支，趨勢還看不出來。';
 const n=a.length,inc=a.map(m=>+m.income||0),exp=a.map(m=>+m.expense||0),sv=a.map(m=>(+m.income||0)-(+m.expense||0)),s0=sv[0],s1=sv[n-1];
 let t=`收入${mtDir(inc,n)}，支出${mtDir(exp,n)}，存下來的從 ${MTW(s0)}${s1>=s0?'升到':'掉到'} ${MTW(s1)}。`;
 if(s1<0)t+=`${MTM(a[n-1].m)}花的比賺的多 ${MTW(-s1)}。`;return t}
function mtChart(ms){const n=ms.length,W=360,H=176,L=34,R=6,T=14,B=24,gw=(W-L-R)/n,bw=Math.max(4,Math.min(16,gw*0.3)),ok=ms.map(mtOk);
 const vals=[0];ms.forEach((m,i)=>{if(ok[i])vals.push(+m.income||0,+m.expense||0,(+m.income||0)-(+m.expense||0))});
 let hi=Math.max(...vals),lo=Math.min(...vals);if(hi<=0)hi=1;const sp=hi-lo||1,y=v=>T+(hi-v)/sp*(H-T-B),y0=y(0);
 const g=ms.map((m,i)=>{const cx=L+gw*i+gw/2,inc=+m.income||0,exp=+m.expense||0,lbl=MTM(m.m)+(m.partial?'*':'');
  const tl=`${m.m}${m.partial?'（到今天）':''}：${ok[i]?`收入 ${nt(inc)}，支出 ${nt(exp)}，存下 ${nt(inc-exp)}`:'沒資料'}`;
  const bars=ok[i]?`<rect class="mtI" x="${(cx-bw-1).toFixed(1)}" y="${y(inc).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1,y0-y(inc)).toFixed(1)}" rx="2"/><rect class="mtE" x="${(cx+1).toFixed(1)}" y="${y(exp).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1,y0-y(exp)).toFixed(1)}" rx="2"/>`
   :`<text class="mtNo" x="${cx.toFixed(1)}" y="${(y0-6).toFixed(1)}" text-anchor="middle">沒資料</text>`;
  return `<g class="mtG${m.partial?' mtP':''}"><title>${esc(tl)}</title><rect class="mtHit" x="${(L+gw*i).toFixed(1)}" y="0" width="${gw.toFixed(1)}" height="${H}"/>${bars}<text class="mtX" x="${cx.toFixed(1)}" y="${H-7}" text-anchor="middle">${lbl}</text></g>`}).join('');
 // 存下來的線：沒資料的月份斷開
 let path='',pen=false,dots='';ms.forEach((m,i)=>{if(!ok[i]){pen=false;return}const cx=L+gw*i+gw/2,v=(+m.income||0)-(+m.expense||0);path+=(pen?'L':'M')+cx.toFixed(1)+' '+y(v).toFixed(1)+' ';pen=true;
  dots+=`<circle class="mtD${m.partial?' mtP':''}" cx="${cx.toFixed(1)}" cy="${y(v).toFixed(1)}" r="3"/>`});
 const ax=`<line class="mtZ" x1="${L}" x2="${W-R}" y1="${y0.toFixed(1)}" y2="${y0.toFixed(1)}"/><text class="mtY" x="${L-5}" y="${(y(hi)+4).toFixed(1)}" text-anchor="end">${MTW(hi)}</text><text class="mtY" x="${L-5}" y="${(y0+4).toFixed(1)}" text-anchor="end">0</text>${lo<0&&y(lo)-y0>12?`<text class="mtY" x="${L-5}" y="${(y(lo)+4).toFixed(1)}" text-anchor="end">${MTW(lo)}</text>`:''}`;
 return `<svg class="mtSvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="近 ${n} 個月每月收入、支出與存下來多少">${ax}${g}<path class="mtLn" d="${path}"/>${dots}</svg>`}
function mtTable(ms){return `<div class="mtTbl" role="table" aria-label="各月收入支出"><div class="mtTr mtTh" role="row"><span role="columnheader">月份</span><span role="columnheader">收入</span><span role="columnheader">支出</span><span role="columnheader">存下</span></div>${ms.slice().reverse().map(m=>{const ok=mtOk(m),i=+m.income||0,e=+m.expense||0;
 return `<div class="mtTr" role="row"><span role="cell">${esc(m.m)}${m.partial?'*':''}</span>${ok?`<span role="cell">${Math.round(i).toLocaleString('en-US')}</span><span role="cell">${Math.round(e).toLocaleString('en-US')}</span><span role="cell"${i-e<0?' class="neg"':''}>${(i-e<0?'−':'')+Math.abs(Math.round(i-e)).toLocaleString('en-US')}</span>`:'<span role="cell" class="mtNoC">沒資料</span><span role="cell"></span><span role="cell"></span>'}</div>`}).join('')}</div>`}
function kmTrend(){if(!LV.mo)return '';
 if(LV.mtrNo==='nofn')return `<section class="sec" id="secTrend">${sh('kim','收支趨勢','')}<div class="card"><p>收支趨勢還沒接上。</p><p class="note">資料庫還沒更新（v54），接上後這裡會畫近 6 個月每月收入、支出和存下來多少。</p></div></section>`;
 if(LV.mtrErr&&!LV.mtr)return `<section class="sec" id="secTrend">${sh('kim','收支趨勢','')}<div class="card"><p>收支趨勢沒讀到：${esc(LV.mtrErr)}</p></div></section>`;
 if(!LV.mtr)return '';
 const all=(LV.mtr.months||[]).slice(-12),op=!!S.open.mztr12,ms=op?all:all.slice(-6);if(!ms.length)return '';
 const pt=ms.some(m=>m.partial&&mtOk(m));
 return `<section class="sec" id="secTrend">${sh('kim','收支趨勢',`近 ${ms.length} 個月`)}<div class="card mtCard">
  <p class="mtSay">${aiF('kim','mtrend')}<span>${esc(mtSay(all))}</span></p>
  ${mtChart(ms)}
  <p class="mtLg"><span><i class="mtKI"></i>收入</span><span><i class="mtKE"></i>支出</span><span><i class="mtKL"></i>存下來</span>${pt?'<span class="mtKP">* 本月到今天</span>':''}</p>
  ${op?mtTable(ms):''}
  <div class="mrow">${mb(op?'收起 ⌃':'看 12 個月與各月數字 ⌄','open','mztr12',` aria-expanded="${op}"`)}</div></div>
  <p class="note mzfoot">只看趨勢，不分類。每一筆在塔塔記帳。</p></section>`}
// 資產與配置：負債放進去、算出淨資產
{const f=kmAssets;kmAssets=function(){let h=f();const t=LV.mtr;
 const debtRe=/<div class="rowi"><div class="rowb"><span class="tx"><b>負債<\/b>[\s\S]*?<\/span><\/span><\/div><\/div>/;
 const ac=(LV.mo&&LV.mo.accounts)||[],isInv=x=>x.kind==='stock'||x.kind==='investment'||/00\d{3}|證券|ETF|基金|股票|投資/i.test(x.name||''),isDebt=x=>x.kind==='credit_card'||x.kind==='loan_in';
 const pos=a=>a.reduce((s,x)=>s+Math.max(0,+x.balance||0),0),tot=Math.max(0,MZ.cash||pos(ac.filter(x=>x.spendable&&!isDebt(x)&&!isInv(x))))+pos(ac.filter(x=>!x.spendable&&!isDebt(x)&&!isInv(x)&&x.kind!=='loan_out'))+pos(ac.filter(isInv));
 let card=0,loan=0,inst=0,instN=0,instOn=0,src='';
 if(t){(t.liab_accounts||[]).forEach(x=>{if(x.kind==='credit_card')card+=+x.amount||0;else loan+=+x.amount||0});(t.installments||[]).forEach(x=>{if(x.on_card)instOn++;else{inst+=+x.amount||0;instN++}})}
 else{ac.filter(isDebt).forEach(x=>{const v=Math.abs(+x.balance||0);if(x.kind==='credit_card')card+=v;else loan+=v});src=LV.mtrNo==='nofn'?'分期還沒算進來（資料庫還沒更新）':''}
 const debt=card+loan+inst,net=tot-debt,parts=[card?`卡債 ${MTW(card)}`:'',loan?`借款 ${MTW(loan)}`:'',inst?`分期 ${MTW(inst)}（${instN} 筆）`:''].filter(Boolean).join('・')||'沒有負債';
 const rows=`<div class="rowi"><div class="rowb"><span class="tx"><b>負債</b><small>${esc(parts)}${instOn?`・另有 ${instOn} 筆分期掛在信用卡，已含在卡債`:''}${src?'・'+src:''}</small></span><span class="rt"><span class="amt">${debt?'−':''}${nt(Math.round(debt))}</span></span></div></div>
  <div class="rowi mtNet"><div class="rowb"><span class="tx"><b>淨資產</b><small>上面三項合計，扣掉負債</small></span><span class="rt"><span class="amt">${net<0?'−':''}${nt(Math.abs(Math.round(net)))}</span></span></div></div>`;
 h=debtRe.test(h)?h.replace(debtRe,()=>rows):h.replace(/(<div class="rows kmas">[\s\S]*?)(<\/div>\s*(?:<div class="aifs">|<p class="note mzfoot">))/,(m,a,b)=>a+rows+b);
 return h}}
{const _q=quick;quick=function(on){const k=(on.ctx||'').split(':')[0];if(on.b==='kim'&&k==='mtrend')return['收入為什麼往下','下個月要省嗎','存下來的夠不夠'];return _q(on)}}
{const _n=ctxName;ctxName=function(ctx){return (ctx||'').split(':')[0]==='mtrend'?'收支趨勢':_n(ctx)}}
{const _x=loadExtra;loadExtra=async function(){await _x();const api=LV.api;
 if(ZN('mtr')&&api.moneyTrend&&LV.mo&&!LV.mtrNo)await api.moneyTrend(12).then(d=>{LV.mtr=d&&Array.isArray(d.months)?d:null;LV.mtrErr=''}).catch(e=>{if(NOFN(e))LV.mtrNo='nofn';else if(e&&e.kind==='forbidden')LV.mtrNo='forbidden';else{LV.mtrErr=LERR(e);ZE('mtr')}})}}
zoneMoney=function(){if(!LV.mo)return mzHero()+kmLedger2();
 return mzHero()+`<div id="mz2">${mz2HTML()}</div>`+kmTrend()+kmAssets()+kmBig()+mzIn()+mzOut()+kmLedger2()};
window.__zl=Object.assign(window.__zl||{},{loadMon});
/* ---------- v56（2026-11-22）：案子卡、機會卡底部同一排 ----------
   老大原話：「然後專案面板卡片跟機會卡片的排版再調整一下」「我覺得按鈕跟小臉圖示要同一排，現在好壅塞」
   底部一排：左邊卡面鈕，右邊負責 Bot 的小臉，「⋯」在最右。放不下時從最後一顆往前收起（第一顆一定留著），收起的動作都在「⋯」裡。卡面字不變。 */
const kfoot=(acts,faces,mine)=>`<div class="kfoot"><div class="cf-l">${acts||''}</div><div class="cf-r">${(faces||[]).filter(Boolean).join('')}${mine}</div></div>`;
projCard=function(p){return `<article class="card cardx" data-card="${esc(p.id)}" data-act="copen" data-id="page|proj:${esc(p.id)}"><div class="meta">${chip(p.due,p.urg)}<span class="lbl">${esc(askCut(p.short||p.title,16))}</span></div><h3>${cgo(esc(p.ask),'page','proj:'+p.id)}</h3><div class="steps" role="img" aria-label="${p.steps.length} 步做到第 ${Math.min(p.cur+1,p.steps.length)} 步">${p.steps.map((s,i)=>`<i class="${i<p.cur?'d':i===p.cur?'c':''}"></i>`).join('')}</div><p class="note">${esc(p.money)}</p>${kfoot('',[aiF(WHO[p.id]||'daqi','proj:'+p.id),p.g==='need'||p.g==='doing'?dinB('proj:'+p.id):''],mineB('proj:'+p.id,p.title))}</article>`};
oppCard=function(o){const sn=o.st==='snoozed',w=oppWhat(o);
 return `<article class="card cardx ocard" data-card="${esc(o.id)}"><div class="meta">${chip(sn?o.snz:o.due,!sn&&o.days<=4)}<span class="lbl">${esc(brief(BASK[o.b],o.org))}</span></div><h3>${cgo(esc(o.title),'sheet','opp:'+o.id)}</h3>${w?`<p class="owhat">${esc(w)}</p>`:''}<p class="amt" style="color:var(--ink)">${esc(oppAmt(o))}</p>`
 +kfoot(B('深入了解','sheet','opp:'+o.id,'pri sm')+(sn?mb('放回清單','unsnooze',o.id):mb('暫存到明天','snooze',o.id))+(sn?'':mb('不要了','del',o.id)),[aiF('jiji','opp:'+o.id,o.took?'建好了':'')],mineB('opp:'+o.id,o.title))+`</article>`};
// 案子房間的待辦、封存卡：「⋯」與去執行也收到底部同一排
{const _zp=zoneProj;zoneProj=function(){const s=S.sub.proj;if(s!=='todo'&&s!=='arch')return _zp();
 return _zp().replace(/<article class="card cardx" data-card="([^"]*)" data-act="copen" data-id="sheet\|cview:[^"]*">(<button class="mine"[\s\S]*?<\/button>)([\s\S]*?)(?:<div class="mrow">([\s\S]*?)<\/div>)?<\/article>/g,(m,id,mine,body,acts)=>m.slice(0,m.indexOf('>')+1)+body+kfoot(acts||'',[],mine)+'</article>')}}
// 放不下時從最後一顆往前收（不換成兩排）
function fitFoots(){document.querySelectorAll('.kfoot .cf-l').forEach(l=>{const bs=[...l.children];bs.forEach(b=>b.classList.remove('cfx'));
 for(let i=bs.length-1;i>0&&l.scrollWidth>l.clientWidth+1;i--)bs[i].classList.add('cfx')})}
{const _r=render;render=function(d){_r(d);fitFoots()}}
addEventListener('resize',fitFoots);try{document.fonts&&document.fonts.ready.then(fitFoots)}catch(e){}
// 案子卡底部加動作鈕（老大 2026-11-22：「那個 面板卡片 專案的怎麼沒有什麼鈕可以進行？」）
// 要你看／進行中＝「這步做完」；已交件＝「收到款了」；都有「看細節」。按了有復原。放不下照 v56 從後面收進⋯
{const _pc=projCard;projCard=function(p){const h=_pc(p);let a='';
 if(p.g==='need'||p.g==='doing'){if(p.cur<p.steps.length)a+=B('這步做完','mstep',p.id,'pri sm')}
 else if(p.g==='delivered')a+=B('收到款了','ppaid',p.id,'pri sm');
 a+=mb('看細節','page','proj:'+p.id);
 return h.replace('<div class="kfoot"><div class="cf-l"></div>',`<div class="kfoot"><div class="cf-l">${a}</div>`)}}
// 拍板後續（2026-11-22，老大：「拍版需要派正確視窗執行 or 另有視窗執行 背景code也可以 但面板要可以追蹤」）
// 你回過的拍板，靠 hub_jobs 的 source_key＝dec-<決定 id> 顯示誰在做、做到哪；點開看問題、步驟與成果。
const decJob=id=>((LV.hub&&LV.hub.jobs)||[]).find(j=>j.sourceKey==='dec-'+id);
const decFollow=()=>{const a=((LV.hub&&LV.hub.answered)||[]).filter(d=>decJob(d.id)&&d.answeredAt&&Date.now()-d.answeredAt<5*864e5);
 const rank=d=>{const s=decJob(d.id).status;return s==='waiting_you'||s==='failed'?0:s==='done'?2:1};
 return a.sort((x,y)=>rank(x)-rank(y)||(y.answeredAt-x.answeredAt))};
function decFollowSec(){const a=decFollow();if(!a.length)return '';const live=a.filter(d=>decJob(d.id).status!=='done').length,show=a.slice(0,Math.max(6,live));
 return `<section class="sec" id="secDecF">${sh('','拍板後續',live?live+' 件還在做':'都做完了')}<div class="rows">`+show.map(d=>{const j=decJob(d.id),s=JST[j.status]||['進行中',0];
  return `<div class="rowi" data-card="${esc(d.id)}"><div class="rowb">${aiF(LBOT(j.agent),'dec:'+d.id)}<button class="tx" data-act="sheet" data-id="hdecf:${esc(d.id)}" style="min-height:44px;text-align:left"><b>${esc(askCut(d.question,26))}</b><small>${esc((j.agent||'大器')+'・'+LAGO(j.updatedAt))}</small></button><span class="rt">${chip(s[0],s[1])}</span></div></div>`}).join('')+`</div></section>`}
{const _h=homeL2;homeL2=function(){const h=_h(),f=decFollowSec();if(!f)return h;const i=h.lastIndexOf('<div class="cols">');return i<0?h+f:h.slice(0,i)+f+h.slice(i)}}
{const _s=sheetHTML;sheetHTML=function(){const a=(S.sheet||'').split(':');if(a[0]!=='hdecf')return _s();const id=a.slice(1).join(':');
 const d=((LV.hub&&LV.hub.answered)||[]).find(x=>x.id===id),j=d&&decJob(id);if(!d||!j)return shHead('這件不在了');const s=(JST[j.status]||['進行中'])[0];
 const note=String(j.note||'').replace(/^決定 [^｜]+｜(老大選「[^」]*」｜)?/,'');
 return shHead(esc(askCut(d.question,40)))+kvs([['你選',d.answerLabel],['誰在做',j.agent],['狀態',s],['案子',d.project],['更新',tstr(j.updatedAt)]])+fullP('問題',d.question)+fullP('做到哪',note)+(j.resultPath?`<p class="h4">成果</p><p class="note" style="word-break:break-all">${esc(j.resultPath)}</p>`:'')}}
/* ---------- v60（2026-11-22）：正式登入＋公司卡 ----------
   老大原話：「我希望能直接打因為只會有我用」「大不了金鑰 跟正式登入處理 反正公司卡也要弄」
   「公司卡片可以同步到我面板來嗎 可以的話上面要能派肉咖工作也能派大器」
   登入：沒有網址金鑰也沒登入時，顯示登入頁（email 收登入碼，或點信裡的連結）。網址金鑰照舊能用，兩種並存。
   公司卡：案子房間多一個「公司」分頁。肉咖從皮條客同步要你決定的、你負責的、進行中的；每張卡兩張臉：肉咖（派公司電腦做）、大器（開對話，帶這張卡）。 */
BOTS.rouka={name:'肉咖',mono:'肉',zone:'公司',role:'公司電腦上的大器同事，做好咖的事。',beat:'',cmds:[],can:'整理皮條客的卡、在公司電腦做公司案子的事，做完回報到這張卡',cant:'不從逐流對公司群組發訊（照肉咖自己的規則）、不付款'};
ROLE.rouka='公司電腦・做好咖的事';
// ---- 登入頁 ----
const LG={step:'email',email:'',err:'',busy:0};
try{LG.email=localStorage.getItem('opp_lg_email')||''}catch(e){}
function loginHTML(){const e=esc(LG.email),err=LG.err?`<p class="err" role="alert">▲ ${esc(LG.err)}</p>`:'',bz=LG.busy?' disabled':'';
 const body=LG.step==='code'
  ?`<p class="note">登入碼寄到 <b>${e}</b> 了。打信裡那串數字，或直接點信裡的連結（在主畫面 App 裡請打數字）。</p>
    <label class="f">登入碼<input id="lgCode" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="信裡的數字"></label>${err}
    <div class="btns">${B(LG.busy?'登入中…':'登入','lgverify',null,'pri wide',bz)}</div>
    <div class="mrow">${mb('再寄一次','lgsend',null,bz)}${mb('換一個 email','lgback')}</div>`
  :`<label class="f">你的 email<input id="lgEmail" type="email" inputmode="email" autocomplete="email" value="${e}" placeholder="登入用的 email"></label>${err}
    <div class="btns">${B(LG.busy?'寄送中…':'寄登入碼給我','lgsend',null,'pri wide',bz)}</div>`;
 return `<div class="zh" data-z="today"><h1>逐流</h1><p class="sum">只有老大能登入。登入一次，這台會記住。</p></div>
 <section class="card login" style="margin-top:14px">${body}</section>
 <div class="mrow" style="margin-top:12px">${mb('我有專屬網址','pastekey')}${mb('先看示範','lgdemo')}</div>`}
function loginShow(msg){LV.login=1;if(msg)LG.err=msg;
 const v=$('#view');if(!v)return;v.innerHTML=loginHTML();
 [document.querySelector('.tabs'),$('#dock'),$('#hav'),$('#chead'),$('#offline')].forEach(x=>{if(x)x.hidden=true});
 const st=$('#stamp');if(st)st.textContent='請先登入';
 const f=$(LG.step==='code'?'#lgCode':'#lgEmail');if(f&&!LG.busy)try{f.focus({preventScroll:true})}catch(e){}}
ACT.lgsend=async()=>{if(LG.busy)return;const i=$('#lgEmail');if(i)LG.email=i.value.trim();
 if(!LG.email){LG.err='先填 email';return loginShow()}
 LG.busy=1;LG.err='';loginShow();
 try{await LV.A.authSendCode(LG.email);try{localStorage.setItem('opp_lg_email',LG.email)}catch(e){}LG.step='code';toast('登入碼寄出了，去收信')}
 catch(e){LG.err=e&&e.kind==='rate'?'寄太多次了，等一分鐘再試':e&&e.kind==='auth'?'這個 email 不能登入（只有老大的帳號可以）':LERR(e)}
 LG.busy=0;loginShow()};
ACT.lgverify=async()=>{if(LG.busy)return;const c=$('#lgCode'),v=c?c.value:'';
 LG.busy=1;LG.err='';loginShow();
 try{await LV.A.authVerify(LG.email,v);location.reload();return}
 catch(e){LG.err=e&&e.kind==='state'?e.message:e&&e.kind==='rate'?'試太多次了，等一分鐘':'登入碼不對或過期了，再寄一次'}
 LG.busy=0;loginShow()};
ACT.lgback=()=>{LG.step='email';LG.err='';loginShow()};
ACT.lgdemo=()=>{location.href=location.pathname+'?mock=1'};
ACT.lgout=async()=>{if(!confirm('登出這台？之後要再收一次登入碼。'))return;await LV.A.signOut();location.reload()};
document.addEventListener('keydown',e=>{if(!LV.login||e.key!=='Enter')return;const t=e.target;if(t&&t.id==='lgEmail'){e.preventDefault();ACT.lgsend()}else if(t&&t.id==='lgCode'){e.preventDefault();ACT.lgverify()}});
// 登入中途過期：回登入頁（網址金鑰失效照舊顯示「金鑰失效」）
{const _p=paint;paint=function(d){if(LV.net==='auth'&&LV.A&&!LV.A.hasKey()&&!LV.forced){LG.step='email';return loginShow('登入過期了，再登入一次')}return _p(d)}}
// 大器對話的「能做什麼」底下：這台的登入狀態與登出
{const _c=chatShell;chatShell=function(on){const h=_c(on);if(on.b!=='daqi'||!LV.A||!LV.A.hasSession()||LV.A.hasKey())return h;
 return h.replace(/(<div class="cinfo" id="cInfo" hidden><div class="can" style="margin:0">[\s\S]*?)(<\/div><\/div>)/,(m,a,c)=>a+'<div><b>這台</b><span>用 email 登入（'+esc(LV.A.sessionEmail())+'）・<button class="mb" data-act="lgout">登出這台</button></span></div>'+c)}}
// ---- 公司卡 ----
const CO_DEMO=()=>{const x=/xss/.test(location.search)?'<img src=x onerror="window.__xss.push(1)">':'';
 return {meta:{lines:['這週要你決定 2 件：示意品牌短片報價、示意活動場地'+x,'進行中 3 件，最急的是示意形象片 12/5 交初剪'],decide_n:2,case_n:5,written_at:new Date(Date.now()-35*60000).toISOString()},
  cards:[{id:'c1',source_id:'d1',title:'示意品牌短片：報價要不要降到 8 萬'+x,ask:'選要不要降價接示意品牌短片',status:'等老大決定',owner:'老大',project:'示意品牌',due:new Date(Date.now()+2*864e5).toISOString().slice(0,10),need_you:true,detail:'客戶回價 8 萬，原報 10 萬。降價的話剪接天數要從 5 天縮成 4 天。（示意資料）',link:'https://example.com/'},
   {id:'c2',source_id:'d2',title:'示意活動場地二選一',ask:'選示意活動要用 A 棚還是 B 棚',status:'等老大決定',owner:'老大',project:'示意活動',need_you:true,detail:'A 棚便宜 3 千但要自己搬燈。（示意資料）'},
   {id:'c3',source_id:'d3',title:'示意形象片初剪',ask:'',status:'剪接中',owner:'示意同事',project:'示意形象片',due:new Date(Date.now()+12*864e5).toISOString().slice(0,10),need_you:false,detail:'初剪 12/5 交。（示意資料）'}],
  tasks:[{id:1,card_id:'c3',assignee:'rouka',body:'整理進度給我',status:'running',created_at:new Date(Date.now()-6e5).toISOString()}]}};
const coDays=d=>{if(!d)return null;const t=new Date(d+'T00:00:00+08:00');return Math.ceil((t-Date.now())/864e5)};
const coDue=c=>{const n=coDays(c.due);return n==null?(c.status||'公司'):n<0?`過期 ${-n} 天`:n===0?'今天截止':`${n} 天後`};
function coData(){return LV.mode==='live'?LV.co:(LV.coDemo||(LV.coDemo=CO_DEMO()))}
function coTaskOf(id,who){const d=coData();return d&&Array.isArray(d.tasks)?d.tasks.find(t=>t.card_id===id&&t.assignee===who):null}
function coSt(t){if(!t)return '';const s=t.assignee==='daqi'?(t.job_status||t.status):t.status;return {queued:'排隊中',taken:'進行中',running:'進行中',waiting_mac:'等 Mac 開機',waiting_you:'等你',done:'做完了',failed:'沒做成',cancelled:''}[s]||''}
function coCard(c){const id='co:'+c.id,n=coDays(c.due),rt=coTaskOf(c.id,'rouka'),dt=coTaskOf(c.id,'daqi');
 return `<article class="card cardx" data-card="${esc(id)}"><div class="meta">${chip(coDue(c),n!=null&&n<=3)}<span class="lbl">${esc(brief(c.project||'公司',c.owner||''))}</span></div><h3>${cgo(esc(c.ask||c.title),'sheet',id)}</h3>${c.ask?`<p class="owhat">${esc(c.title)}</p>`:''}${c.status?`<p class="note">皮條客：${esc(c.status)}</p>`:''}`
 +kfoot(mb('看細節','sheet',id),[aiF('rouka',id,coSt(rt),{do:'coRouka',arg:c.id}),aiF('daqi',id,coSt(dt))],'')+`</article>`}
const coEmpty=(big,p)=>`<div class="card empty"><div class="big">${big}</div><p class="note">${p}</p></div>`;
function coSection(){const d=coData();
 if(LV.coNo==='nofn')return coEmpty('資料庫還沒更新','公司卡要等這次的資料庫更新套上才會出現。');
 if(LV.coNo==='forbidden')return coEmpty('這把金鑰看不到公司卡','只有老大本人（專屬網址或登入）看得到。');
 if(LV.coErr&&!d)return coEmpty('公司卡沒讀到',esc(LV.coErr));
 const m=d&&d.meta,cs=d&&Array.isArray(d.cards)?d.cards:[];
 if(!m&&!cs.length)return `<section class="sec">${sh('','公司')}<div class="card empty"><div class="big">肉咖還沒寫</div><p class="note">公司電腦的肉咖同步過來後，要你決定的事、你負責的案子會出現在這裡。</p><div class="btns">${aifs([aiF('rouka','co:')])}</div></div></section>`;
 const ago=m&&m.written_at?LHM(new Date(m.written_at).getTime()):'',need=cs.filter(c=>c.need_you),rest=cs.filter(c=>!c.need_you);
 let h=`<section class="sec">${sh('','公司重點',ago?`肉咖 ${esc(ago)} 寫的`:'')}<div class="card">${m&&Array.isArray(m.lines)&&m.lines.length?`<ul class="colines">${m.lines.map(l=>`<li>${esc(l)}</li>`).join('')}</ul>`:'<p class="note">肉咖還沒寫重點。</p>'}<p class="note">要你決定 <b class="num">${m&&m.decide_n!=null?+m.decide_n:need.length}</b> 件・公司案子 <b class="num">${m&&m.case_n!=null?+m.case_n:cs.length}</b> 件</p></div></section>`;
 if(need.length)h+=`<section class="sec">${sh('','要你決定',need.length+' 件')}<div class="stack stg grid2">${need.map(coCard).join('')}</div></section>`;
 if(rest.length)h+=`<section class="sec">${sh('','進行中',rest.length+' 件')}<div class="stack stg grid2">${rest.map(coCard).join('')}</div></section>`;
 return h}
{const _zp=zoneProj;zoneProj=function(){const s=S.sub.proj,d=coData(),n=d&&Array.isArray(d.cards)?d.cards.length:0,btn=on=>`<button aria-pressed="${on}" data-act="sub" data-id="proj:co">公司 ${n}</button>`;
 if(s!=='co')return _zp().replace(/(<div class="seg" role="group" aria-label="案子分類">[\s\S]*?)(<\/div>)/,(x,a,b)=>a+btn(false)+b);
 S.sub.proj='proj';let h;try{h=_zp()}finally{S.sub.proj='co'}
 const i=h.indexOf('<div class="seg" role="group" aria-label="案子分類">'),j=i<0?-1:h.indexOf('</div>',i);
 if(j<0)return h+coSection();
 return h.slice(0,j).replace(/aria-pressed="true"/g,'aria-pressed="false"')+btn(true)+'</div>'+coSection()}}
// 詳情與派肉咖
const coFind=id=>{const d=coData();return d&&Array.isArray(d.cards)?d.cards.find(c=>c.id===id):null};
function coSheet(id){const c=coFind(id);if(!c)return shHead('這張公司卡不在了');const d=coData(),ts=(d.tasks||[]).filter(t=>t.card_id===id),link=/^https:\/\//i.test(String(c.link||''))?c.link:'';
 return shHead(esc(c.ask||c.title))+`<div class="meta" style="margin-top:8px">${chip(coDue(c),(coDays(c.due)??9)<=3)}<span class="lbl">${esc(brief(c.project||'公司',c.owner||''))}</span></div>
 ${c.ask?`<p class="h4">${esc(c.title)}</p>`:''}<dl class="kv">${c.status?`<div><dt>皮條客狀態</dt><dd>${esc(c.status)}</dd></div>`:''}${c.owner?`<div><dt>誰負責</dt><dd>${esc(c.owner)}</dd></div>`:''}${c.due?`<div><dt>期限</dt><dd>${esc(c.due)}</dd></div>`:''}</dl>
 ${c.detail?`<p style="white-space:pre-wrap">${esc(c.detail)}</p>`:''}
 <div class="btns">${B('派肉咖做','coRouka',id,'pri')}${B('跟大器說','coDaqi',id)}${link?`<a class="btn ghost" href="${esc(link)}" target="_blank" rel="noopener noreferrer">在皮條客打開</a>`:''}</div>
 ${ts.length?`<p class="h4">派過的工作</p><div class="rows">${ts.map(t=>`<div class="rowi"><div class="rowb">${bm(t.assignee==='daqi'?'daqi':'rouka','z')}<span class="tx"><b>${esc(t.body)}</b><small>${esc(BOTS[t.assignee==='daqi'?'daqi':'rouka'].name)}・${esc(coSt(t)||'')}${t.result?'・'+esc(t.result):t.job_note?'・'+esc(t.job_note):''}</small></span></div></div>`).join('')}</div>`:''}
 <p class="note">公司資料只在這裡給你看；對公司群組發訊照肉咖自己的規則，不從這裡直接發。</p>`}
const CO_Q=['整理這張的最新進度給我','把要我決定的事列清楚，附建議','提醒負責的人下一步'];
function coRoukaSheet(id){const c=coFind(id);if(!c)return shHead('這張公司卡不在了');
 return shHead('派肉咖做')+`<div class="meta" style="margin-top:8px">${bm('rouka','z')}<span class="lbl">肉咖・公司電腦</span></div><div class="meta" style="margin-top:8px">${chip('關於：'+(c.ask||c.title))}</div>
 <label class="f">要肉咖做什麼<textarea id="coText" rows="3" placeholder="例：整理這張的最新進度給我"></textarea></label>${S.err==='co'?'<p class="err" role="alert">▲ 還沒寫字。先寫一句再傳。</p>':''}
 <div class="btns">${CO_Q.map(q=>`<button class="btn" data-act="cofill" data-id="${esc(q)}">${esc(q)}</button>`).join('')}</div>
 <div class="btns">${B('交給肉咖','cosend',id,'pri wide')}</div><p class="note">肉咖拿到單會改成「進行中」，做完回報在這張卡。今天頁的「正在跑」也看得到。</p>`}
{const _s=sheetHTML;sheetHTML=function(){const t=S.sheet||'';if(t.indexOf('co:')===0)return coSheet(t.slice(3));if(t.indexOf('cor:')===0)return coRoukaSheet(t.slice(4));return _s()}}
ACT.coRouka=id=>{S.err='';ACT.sheet('cor:'+String(id).replace(/^co:/,''))};
ACT.coDaqi=(id,el)=>{const f=()=>openChat('daqi','co:'+id,el);if(S.sheet)closeThen(f);else f()};
ACT.cofill=v=>{const t=$('#coText');if(t){t.value=v;t.focus()}};
ACT.cosend=async id=>{const t=$('#coText'),v=t?t.value.trim():'';if(!v){S.err='co';render('keep');return}S.err='';
 if(LV.mode!=='live'){const d=coData();d.tasks.unshift({id:Date.now(),card_id:id,assignee:'rouka',body:v,status:'queued',created_at:new Date().toISOString()});back();toast('示範：交給肉咖了');render('keep');return}
 try{await LV.api.coTask(id,'rouka',v);back();toast('交給肉咖了，公司電腦拿到就會開始');await coLoad();render('keep')}
 catch(e){toast(NOFN(e)?'資料庫還沒更新，派工還沒接上':'沒送出：'+LERR(e))}};
// 叫大器：開對話帶這張卡；送出時另記一筆派工（hub_jobs），面板追蹤得到
{const _n=ctxName;ctxName=function(ctx){const a=(ctx||'').split(':');if(a[0]==='co'){const c=coFind(a[1]);return c?(c.ask||c.title):'公司卡'}return _n(ctx)}}
{const _t=ctxTag;ctxTag=function(b,ctx){const a=(ctx||'').split(':');if(a[0]!=='co')return _t(b,ctx);const c=coFind(a[1]);if(!c)return '［老大在逐流的案子房間・公司］\n';
 return `［老大在逐流的案子房間・公司，正在看公司卡「${c.title}」${c.ask?`，卡面：${c.ask}`:''}${c.status?`，皮條客狀態：${c.status}`:''}${c.owner?`，負責：${c.owner}`:''}${c.due?`，期限 ${c.due}`:''}${/^https:\/\//i.test(String(c.link||''))?`，皮條客連結 ${c.link}`:''}。這是好咖公司的事，做完回報在逐流這張卡（hub_jobs source_key 會是 cotask:編號）］\n`}}
{const _st=sendTo;sendTo=function(b,text,ctx){_st(b,text,ctx);const a=(ctx||'').split(':');
 if(b==='daqi'&&a[0]==='co'&&a[1]&&LV.mode==='live'&&LV.api.coTask)LV.api.coTask(a[1],'daqi',text).then(()=>coLoad()).catch(()=>{})}}
{const _q=quick;quick=function(on){if((on.ctx||'').indexOf('co:')===0&&on.b==='daqi')return['這張現在卡在哪','幫我想怎麼回','整理成我能直接回的一句'];return _q(on)}}
async function coLoad(){const api=LV.api;if(LV.mode!=='live'||!api||!api.company||LV.coNo)return;
 await api.company().then(d=>{LV.co=d&&typeof d==='object'?{meta:d.meta||null,cards:Array.isArray(d.cards)?d.cards:[],tasks:Array.isArray(d.tasks)?d.tasks:[]}:null;LV.coErr=''})
  .catch(e=>{if(NOFN(e))LV.coNo='nofn';else if(e&&e.kind==='forbidden')LV.coNo='forbidden';else{LV.coErr=LERR(e);ZE('co')}})}
{const _x=loadExtra;loadExtra=async function(){await _x();if(ZN('co'))await coLoad()}}
{const _sg=sigOf;sigOf=function(){let s=_sg();try{const d=LV.co;if(d)s+='|co'+d.cards.length+':'+(d.meta&&d.meta.written_at||'')+':'+d.tasks.map(t=>t.id+(t.job_status||t.status)).join(',')}catch(e){}return s}}
/* ---------- 要你做（2026-11-22，拍板後續第三輪） ----------
   老大原話：「要我做的東西不就應該在上面跟我講嗎？」「我希望這個面板可以讓我在上面操作就完成，我所有要做的事情可以不用離開面板」
   hub_jobs status=waiting_you 的工作放首頁最上面。卡上一句；點開是步驟，能直接做完：
   備註裡「動作：名字｜按鈕字」＝按下由 Mac 跑（wake.py 白名單）；「連結：https://…」＝打開連結；「貼回：提示」＝貼回欄位；
   最後一律有「我做好了」，按了工作改 done、卡收掉。按鈕都經 /current-wake，Mac 用金鑰驗是老大才做。 */
const YD={busy:0};
const ydJobs=()=>((LV.hub&&LV.hub.jobs)||[]).filter(j=>j.status==='waiting_you');
function ydParse(j){const o={act:null,actLabel:'',link:'',paste:'',prog:'',steps:[]};
 String(j.note||'').replace(/^決定 [^｜\n]+｜(老大選「[^」]*」｜)?/,'').split('\n').forEach(l=>{let m;
  if((m=l.match(/^動作：([a-z_]+)｜(.+)$/)))o.act=m[1],o.actLabel=m[2];
  else if((m=l.match(/^連結：(\S+)/)))o.link=/^https:\/\//i.test(m[1])?m[1]:'';
  else if((m=l.match(/^貼回：(.+)$/)))o.paste=m[1];
  else if((m=l.match(/^進度：(.+)$/)))o.prog=m[1];
  else if(l.trim())o.steps.push(l)});return o}
const ydFace=j=>j.ask||askCut(String(j.title||'').replace(/^拍板後續｜/,''),26);
function ydMain(j){const p=ydParse(j);
 if(p.link)return `<a class="btn pri" style="text-decoration:none" style="text-decoration:none" href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">打開連結</a>`;
 if(p.act)return B(esc(p.actLabel),'ydrun',j.id,'pri');
 return B('我做好了','yddone',j.id,'pri')}
function ydSec(){const a=ydJobs();if(!a.length)return '';
 return `<section class="sec" id="secYou">${sh('daqi','要你做',a.length+' 件')}<div class="rows">`+a.map(j=>
  `<div class="rowi" data-card="${esc(j.id)}"><div class="rowb"><button class="tx" data-act="sheet" data-id="youdo:${esc(j.id)}" style="min-height:44px;text-align:left"><b>${esc(ydFace(j))}</b><small>${esc((j.project?j.project+'・':'')+LAGO(j.updatedAt))}</small></button><span class="rt">${ydMain(j)}</span></div></div>`).join('')+`</div></section>`}
{const _h=homeL2;homeL2=function(){const h=_h(),y=ydSec();if(!y)return h;const i=h.indexOf('id="secDec"');
 if(i<0)return y+h;const k=h.lastIndexOf('<section',i);return h.slice(0,k)+y+h.slice(k)}}
{const _s=sheetHTML;sheetHTML=function(){const a=(S.sheet||'').split(':');if(a[0]!=='youdo')return _s();const id=a.slice(1).join(':');
 const j=((LV.hub&&LV.hub.jobs)||[]).find(x=>x.id===id);if(!j)return shHead('這件不在了');
 if(j.status!=='waiting_you')return shHead(esc(ydFace(j)))+`<p class="note">${j.status==='done'?'做好了，卡已收。':'Mac 在處理：'+esc(j.agent||'大器')+'。'}</p>`+(ydParse(j).prog?`<p class="note">${esc(ydParse(j).prog)}</p>`:'');
 const p=ydParse(j),bz=YD.busy?' disabled':'';
 return shHead(esc(ydFace(j)))+(p.prog?`<p class="note"><b>${esc(p.prog)}</b></p>`:'')+fullP('怎麼做',p.steps.join('\n'))
  +(p.link?`<div class="btns"><a class="btn pri wide" style="text-decoration:none" style="text-decoration:none" href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">打開連結</a></div>`:'')
  +(p.paste?`<label class="f">${esc(p.paste)}<textarea id="ydPaste" rows="3" placeholder="貼在這裡"></textarea></label><div class="btns">${B(YD.busy?'送出中…':'送出','ydpaste',j.id,'pri wide',bz)}</div>`:'')
  +(p.act&&!p.link?`<div class="btns">${B(esc(p.actLabel),'ydrun',j.id,'pri wide',bz)}</div>`:'')
  +`<div class="btns">${B('我做好了','yddone',j.id,p.act||p.link||p.paste?'ghost wide':'pri wide',bz)}</div>`+kvs([['案子',j.project],['更新',LAGO(j.updatedAt)]])}}
async function ydCall(id,payload,okMsg){if(YD.busy)return;YD.busy=1;render('keep');
 try{await LV.api.macAct({job:id,...payload});toast(okMsg);[3e3,8e3,15e3,30e3,60e3].forEach(t=>setTimeout(()=>hubAfter(),t))}
 catch(e){toast('沒送到：'+LERR(e))}finally{YD.busy=0;await hubAfter()}}
ACT.yddone=id=>ydCall(id,{act:'done'},'記下了，卡收掉');
ACT.ydrun=id=>{const j=((LV.hub&&LV.hub.jobs)||[]).find(x=>x.id===id);const p=j&&ydParse(j);if(!p||!p.act)return;
 if(!S.sheet||S.sheet!=='youdo:'+id)ACT.sheet('youdo:'+id);ydCall(id,{act:'run',name:p.act},'Mac 開始跑了，連結幾秒內出現在卡上')};
ACT.ydpaste=id=>{const t=document.getElementById('ydPaste'),v=t?t.value.trim():'';if(!v){toast('先貼上網址');return}ydCall(id,{act:'paste',val:v},'交給 Mac 了')};
// v62（2026-11-22）：案子房間「待辦」可以直接新增。老大原話：「那個專案待辦那邊 我想要可以新增」。走既有 opp_todo_add。
{const _zp=zoneProj;zoneProj=function(){const h=_zp();if(S.sub.proj!=='todo')return h;
 const f=`<div class="wadd"><label class="vh" for="pjIn">新增待辦</label><input id="pjIn" type="text" placeholder="要做的事，例：寄合約給客戶" enterkeyhint="done" autocomplete="off" maxlength="200"><button class="btn pri" data-act="pjadd">加進去</button></div>${S.err==='pj'?'<p class="err" role="alert">▲ 還沒寫字。寫要做的事就好。</p>':''}`;
 const m='aria-label="案子分類">',i=h.indexOf(m);if(i<0)return f+h;const j=h.indexOf('</div>',i);return j<0?f+h:h.slice(0,j+6)+f+h.slice(j+6)}}
ACT.pjadd=()=>{const t=$('#pjIn'),v=t?t.value.trim():'';if(!v){S.err='pj';render('keep');const x=$('#pjIn');if(x)x.focus();return}S.err='';
 if(!LV.api||!LV.api.todoAdd){toast('離線中，等連上再加');return}
 LV.api.todoAdd(v.slice(0,200)).then(()=>{const x=$('#pjIn');if(x)x.value='';toast('加進交辦了：'+clip(v,24));return reload().then(()=>{paint('keep');const y=$('#pjIn');if(y)y.focus({preventScroll:true})})}).catch(e=>toast('沒存上：'+LERR(e)))};
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target&&e.target.id==='pjIn'&&!e.isComposing){e.preventDefault();ACT.pjadd()}});
/* ---------- v65（2026-11-22）：交辦先規劃再執行，首頁看得到 ----------
   老大原話：「新增的時候當然可以讓定定一起來幫我規劃或者是大器 規劃好之後送出執行，就會在我的電腦上面開新視窗開始運行
   然後那個首頁是不是也要有一個 感覺是不一樣的分類啦，因為為不是案子 有可能是我交代要建置某件事情或執行某件事情 但不希望有大費周章多一個版面」
   - 待辦（basket='todo'）改叫「交辦」。還沒送出（new）與跑中（doing 且 run_status 不是 done）都算交辦，不再算進「案子」；做完的照舊回案子列表可以結案。
   - 新增列多兩顆「請定定規劃」「請大器規劃」：建卡後打開那張卡跟它的對話，送一句規劃請求（老大按了才送）。
   - 對話裡定定或大器回過之後出現「照這個規劃送出執行」：定定的規劃先寫進卡片說明（opp_card_edit why，送進 brief），再走既有 opp_run。
   - 首頁「正在跑」同一條清單加上交辦，標「交辦」，有篩選鈕；不開新版面。資料庫沒動。 */
const JIAO=c=>c&&c.basket==='todo'&&(c.status==='new'||(c.status==='doing'&&c.runStatus!=='done'));
const PLANQ=t=>`幫我規劃這件：${t}。分成步驟、要準備什麼、哪裡要我決定。`;
function jiaoSt(c){if(!c.runStatus)return '還沒送出';const s=c.progressSteps||[],d=s.filter(x=>x.status==='done').length,cu=s.find(x=>x.status==='current'||x.status==='blocked');
 return (RUNST[c.runStatus]||'進行中')+(s.length?`・${Math.min(d+1,s.length)}/${s.length} 步`:'')+(cu?'・'+cu.name:'')}
{const _t=mapTodo;mapTodo=function(c){const x=_t(c);x.st=jiaoSt(c);return x}}
{const _ad=applyData;applyData=function(){_ad();const it=LV.items||[];
 DB.todo=it.filter(JIAO).map(mapTodo).sort((a,b)=>(a.run?0:1)-(b.run?0:1));
 DB.proj=DB.proj.filter(p=>!JIAO(p.raw))}}
// 對話裡認得交辦卡（ctx 用 proj:<id>，ctxItem 本來就收 LV.items 裡的卡）
const jOf=ctx=>{const a=(ctx||'').split(':');return a[0]==='proj'?DB.todo.find(t=>t.id===a[1]):null};
{const _n=ctxName;ctxName=function(ctx){const t=jOf(ctx);return t?t.title:_n(ctx)}}
{const _g=ctxTag;ctxTag=function(b,ctx){const t=jOf(ctx);if(!t)return _g(b,ctx);return `［老大在逐流的${ROOMN[S.tab]||'案子房間'}，正在看交辦「${t.title}」（${t.st}）］\n`}}
// 案子房間：分頁改名交辦、新增列加兩顆規劃鈕、每張交辦卡底部放定定與大器的臉
{const _zp=zoneProj;zoneProj=function(){let h=_zp();h=h.replace(/(data-id="proj:todo">)待辦 /,'$1交辦 ');if(S.sub.proj!=='todo')return h;
 h=h.replace('<label class="vh" for="pjIn">新增待辦</label>','<label class="vh" for="pjIn">新增交辦</label>').replace('placeholder="要做的事，例：寄合約給客戶"','placeholder="要交辦的事，例：把報價單做成模板"')
  .replace(/(<button class="btn pri" data-act="pjadd">加進去<\/button><\/div>)/,`$1<div class="mrow pjplan">${mb(bm('din')+'請定定規劃','pjplan','din')}${mb(bm('daqi')+'請大器規劃','pjplan','daqi')}</div>`)
  .replace(/<h2 class="vh">待辦<\/h2>/,'<h2 class="vh">交辦</h2>').replace('沒有待辦','沒有交辦');
 return h.replace(/(<article class="card cardx" data-card="([^"]*)"[\s\S]*?<div class="cf-r">)/g,(m,a,id)=>{const t=DB.todo.find(q=>q.id===id);return t?a+aiF('din','proj:'+id,'','')+aiF('daqi','proj:'+id,t.run==='running'?'跑中':''):m})}}
ACT.pjplan=b=>{const t=$('#pjIn'),v=t?t.value.trim():'';if(!v){S.err='pj';render('keep');const x=$('#pjIn');if(x)x.focus();return}S.err='';
 if(!LV.api||!LV.api.todoAdd){toast('離線中，等連上再加');return}
 LV.api.todoAdd(v.slice(0,200)).then(c=>{const x=$('#pjIn');if(x)x.value='';return reload().then(()=>{paint('keep');if(!c||!c.id){toast('加進交辦了，打開卡片再請它規劃');return}
  const ctx='proj:'+c.id;openChat(b,ctx,null,()=>say(b,PLANQ(v.slice(0,200)),ctx))})}).catch(e=>toast('沒存上：'+LERR(e)))};
// 對話裡：還沒問就給「請它規劃這件」，回過了就給「照這個規劃送出執行」
const realBot=(b,m)=>m.w==='bot'&&!m.wait&&!m.local&&m.t&&m.t!==HI(b)&&m.t!=='讀取中…'&&!/^(沒送出|對話讀不到|收到，正在看|櫃檯視窗)/.test(m.t);
{const _l=logSync;logSync=function(){_l();const on=S.chat,l=$('#clog');if(!on||!l||(on.b!=='din'&&on.b!=='daqi'))return;const t=jOf(on.ctx);if(!t)return;
 const a=CH[on.b]||[],id=t.id;let x='';
 if(t.run)x=`<p class="note">這件已經送出執行了：${esc(t.st)}。進度會寫回卡片。</p>`;
 else if(a.some(m=>realBot(on.b,m)))x=`<p class="note">規劃看起來可以，就送出。Mac 會開新視窗照這段對話跑。</p><div class="btns">${B('▶ 照這個規劃送出執行','planrun',on.b+'|'+id,'pri wide')}</div>`;
 else if(!a.some(m=>m.w==='me'))x=`<div class="btns">${B(bm(on.b)+'請'+NAMES[on.b]+'規劃這件','planask',on.b+'|'+id,'pri wide')}</div>`;
 if(x){l.insertAdjacentHTML('beforeend',`<div class="cm bot card jplan">${x}</div>`);l.scrollTop=l.scrollHeight}}}
ACT.planask=v=>{const [b,id]=v.split('|'),t=DB.todo.find(q=>q.id===id);if(!t||!S.chat)return;say(b,PLANQ(t.title),'proj:'+id)};
ACT.planrun=async v=>{const [b,id]=v.split('|'),t=DB.todo.find(q=>q.id===id);if(!t||t.run){toast('這件已經送出了');return}
 if(b==='din'){const plan=(CH.din||[]).filter(m=>realBot('din',m)).slice(-3).map(m=>m.t).join('\n\n').slice(0,3000);
  if(plan&&LV.api.cardEdit){const w=(t.raw&&t.raw.why)||'';try{await LV.api.cardEdit(id,{why:(w?w+'\n\n':'')+'【定定的規劃】\n'+plan})}catch(e){toast('規劃沒寫進卡片（'+LERR(e)+'），照樣送出')}}}
 if(S.chat)back();setTimeout(()=>projDo(id,'run',null,'送出了。Mac 會開新視窗跑，進度寫回這張卡'),260)};
// 交辦卡詳情：還沒送出的多兩顆規劃鈕
{const _s=sheetHTML;sheetHTML=function(){const h=_s(),m=/^cview:todo:(.+)$/.exec(S.sheet||'');if(!m)return h;const t=DB.todo.find(q=>q.id===m[1]);if(!t)return h;
 const p=t.raw||{},st=(p.progressSteps||[]).length?`<ul class="tl">${p.progressSteps.map(s=>`<li>${s.status==='done'?'✓':s.status==='current'?'▶':s.status==='blocked'?'▲':'・'} ${esc(s.name)}</li>`).join('')}</ul>`:'';
 return h+(st?`<section class="sec"><h3>步驟</h3>${st}</section>`:'')+`<div class="mrow">${mb(bm('din')+'跟定定規劃','ai','din|proj:'+t.id+'||')}${mb(bm('daqi')+'跟大器規劃','ai','daqi|proj:'+t.id+'||')}</div>`}}
// 首頁：「正在跑」同一條清單加上交辦，標「交辦」，可篩選（全部、交辦、工作）
S.jf=S.jf||'all';
function jiaoRows(){return DB.todo.map(t=>`<div class="rowi" data-card="${esc(t.id)}"><div class="rowb">${aiF('daqi','proj:'+t.id,t.run==='running'?'跑中':'')}<button class="tx" data-act="sheet" data-id="cview:todo:${esc(t.id)}" style="min-height:44px;text-align:left"><b>${esc(t.title||t.ask)}</b><small>${esc(t.st)}</small></button><span class="rt">${chip('交辦')}</span></div></div>`).join('')}
{const _h=homeL2;homeL2=function(){const h=_h();if(E()||!DB.todo.length)return h;const i=h.lastIndexOf('<div class="cols">');if(i<0)return h;
 const k=h.indexOf('正在跑',i);if(k<0)return h;const s0=h.lastIndexOf('<section class="sec">',k),e0=h.indexOf('</section>',k);if(s0<0||e0<0)return h;
 const nj=DB.todo.length,nw=jobs().length,f=nw?S.jf:'all';
 const seg=nw?`<div class="seg jseg" role="group" aria-label="篩選">${[['all','全部 '+(nj+nw)],['todo','交辦 '+nj],['job','工作 '+nw]].map(x=>`<button aria-pressed="${f===x[0]}" data-act="jfilt" data-id="${x[0]}">${x[1]}</button>`).join('')}</div>`:'';
 const body=`<div class="rows">${f!=='job'?jiaoRows():''}${f!=='todo'&&nw?jobList().replace(/^<div class="rows">/,'').replace(/<\/div>$/,''):''}</div>`;
 return h.slice(0,s0)+`<section class="sec">${sh('','交辦・正在跑',(nj+nw)+' 件')}${seg}${body}</section>`+h.slice(e0+10)}}
ACT.jfilt=id=>{S.jf=id;render('keep')};
// 版面 3（河）也認得交辦
{const _r=riverItems;riverItems=function(){return _r().concat(E()?[]:DB.todo.map((t,i)=>({z:'todo',b:'daqi',t:t.ask,s:t.st,c:'交辦',u:0,k:t.run?5+i:30+i,id:'cview:todo:'+t.id,card:t.id}))).sort((x,y)=>x.k-y.k)}}
{const _h3=homeL3;homeL3=function(){const f=S.filt;if(f!=='todo')return _h3().replace(/(<button aria-pressed="false" data-act="filt" data-id="proj">[^<]*<\/button>)/,`$1<button aria-pressed="false" data-act="filt" data-id="todo">交辦 ${riverItems().filter(i=>i.z==='todo').length}</button>`);
 S.filt='dec';let h;try{h=_h3()}finally{S.filt='todo'}const its=riverItems().filter(i=>i.z==='todo');
 h=h.replace(/aria-pressed="true" data-act="filt" data-id="dec"/,'aria-pressed="false" data-act="filt" data-id="dec"').replace(/(<button aria-pressed="false" data-act="filt" data-id="proj">[^<]*<\/button>)/,`$1<button aria-pressed="true" data-act="filt" data-id="todo">交辦 ${its.length}</button>`);
 const rows=its.map(i=>`<div class="rowi" data-card="${i.card}"><button class="rowb" data-act="sheet" data-id="${esc(i.id)}">${bm(i.b)}<span class="tx"><b>${esc(i.t)}</b><small>${esc(i.s)}</small></span><span class="rt">${chip(i.c)}<span class="chev" aria-hidden="true">›</span></span></button></div>`).join('');
 return h.replace(/(<h2 class="vh">依急迫排序<\/h2>)[\s\S]*?(<\/section>)/,`$1${rows?`<div class="rows stg">${rows}</div>`:emptyBox('沒有交辦','到案子房間的「交辦」新增一件。','')}$2`)}}
/* ---------- v68（2026-11-23）：標記修改意見 ----------
   老大：「有對話窗 彈出之後我就可以自己點選想要修改面板會有問題的面板 直接輸入意見 一輪下來，再按送出直接到你這邊來 你再一起修改」
   上方「✎」進標記模式：點哪裡就框起來、寫一句意見、加進清單；一輪點完按「送出」，整份清單用「跟大器說」那條路送出（開頭【面板修改意見】，櫃台轉給逐流帶頭視窗）。
   標記中點畫面不會觸發原本的按鈕；清單存在這台手機，沒送出前關掉也不會不見。 */
{const MK={on:false,list:[],pick:null,box:''},KEY='zl_marks';
 try{MK.list=JSON.parse(localStorage.getItem(KEY)||'[]')||[]}catch(e){MK.list=[]}
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(MK.list))}catch(e){}};
 const T=s=>String(s||'').replace(/\s+/g,' ').trim();
 const cut=(s,n)=>{s=T(s);return s.length>n?s.slice(0,n)+'…':s};
 const mine=e=>e&&e.closest&&e.closest('#mkBar,#mkBox,#mkBtn,#mkFab');
 function where(el){const R=document.documentElement,a=[];
  const room=ROOMN[R.dataset.tab||S.tab]||R.dataset.tab||S.tab||'';if(room)a.push(room);
  try{const sb=S.sub&&S.sub[S.tab];if(sb&&!S.page)a.push(sb)}catch(e){}
  const lay=el.closest('#chat')?'對話窗':el.closest('#sheet')?'彈出卡':el.closest('#page')?'詳情頁':el.closest('#top')?'最上面那排':el.closest('.tabs')?'下方分頁列':el.closest('#dock')?'下方工具列':'';
  if(lay)a.push(lay);
  const ttl=el.closest('#sheet')?$('#sTitle'):el.closest('#chat')?$('#cTitle'):null;if(ttl)a.push('「'+cut(ttl.textContent,20)+'」');
  const sec=el.closest('section.sec,section,article');const h=sec&&sec.querySelector('h2,h3,.vh');if(h&&!h.contains(el)&&h!==ttl)a.push('區塊「'+cut(h.textContent,20)+'」');
  return a.join('｜')}
 function grab(t){const el=t.closest('button,a,input,textarea,select,label,.rowi,.card,li,h2,h3,h4,p,img,svg,.chip,.meta')||t;
  const txt=cut(el.getAttribute('aria-label')||el.textContent||el.getAttribute('placeholder')||el.value||'',60);
  const tag=el.tagName.toLowerCase(),act=el.dataset&&el.dataset.act,id=el.dataset&&el.dataset.id;
  return {el,where:where(el),txt,code:tag+(el.id?'#'+el.id:'')+(act?`[act=${act}${id?' id='+id:''}]`:'')+(el.className&&typeof el.className==='string'?'.'+el.className.trim().split(/\s+/).slice(0,3).join('.'):'')}}
 function bar(){let b=$('#mkBar');if(!MK.on){if(b)b.remove();document.documentElement.classList.remove('marking');return}
  if(!b){b=document.createElement('div');b.id='mkBar';b.className='mkbar';b.setAttribute('role','toolbar');b.setAttribute('aria-label','標記修改意見');document.body.appendChild(b)}
  document.documentElement.classList.add('marking');const n=MK.list.length;
  b.innerHTML=`<span class="mkt"><b>編修模式</b>${n?`已記 ${n} 則，繼續點或送出`:'點要改的地方'}</span><button class="btn ghost" data-mk="list"${n?'':' disabled'}>清單 ${n}</button><button class="btn pri" data-mk="send"${n?'':' disabled'}>送出</button><button class="btn ghost" data-mk="end" aria-label="結束標記">結束</button>`}
 function box(kind){let x=$('#mkBox');if(!kind){if(x)x.remove();MK.box='';return}
  MK.box=kind;if(!x){x=document.createElement('section');x.id='mkBox';x.className='mkbox';x.setAttribute('role','dialog');x.setAttribute('aria-modal','false');document.body.appendChild(x)}
  if(kind==='pick'){const p=MK.pick;x.setAttribute('aria-label','寫修改意見');
   x.innerHTML=`<p class="mkw">${esc(p.where||'這裡')}</p><p class="mkp">你點的：${p.txt?'「'+esc(p.txt)+'」':'（沒有字的地方）'}</p><textarea id="mkIn" rows="3" placeholder="這裡哪裡怪、想改成怎樣"></textarea><div class="btns"><button class="btn pri" data-mk="add">加進清單</button><button class="btn ghost" data-mk="cancel">取消</button></div>`;
   setTimeout(()=>{const i=$('#mkIn');if(i)i.focus()},50)}
  else{x.setAttribute('aria-label','修改意見清單');
   x.innerHTML=`<p class="mkw">這一輪的修改意見 ${MK.list.length} 則</p><ol class="mkl">${MK.list.map((m,i)=>`<li><b>${esc(m.note)}</b><small>${esc(m.where)}${m.txt?'｜「'+esc(cut(m.txt,24))+'」':''}</small><button class="btn ghost" data-mk="del" data-i="${i}" aria-label="刪掉第 ${i+1} 則">✕</button></li>`).join('')}</ol><div class="btns"><button class="btn pri" data-mk="send"${MK.list.length?'':' disabled'}>全部送出</button><button class="btn ghost" data-mk="cancel">繼續點</button></div>`}}
 function clearSel(){document.querySelectorAll('.mk-sel').forEach(e=>e.classList.remove('mk-sel'))}
 function setOn(v){MK.on=v;clearSel();box('');bar();const k=$('#mkBtn');if(k){k.setAttribute('aria-pressed',v?'true':'false');const t=k.querySelector('b');if(t)t.textContent=v?'完成':'編修'}
  if(v)toast(MK.list.length?`編修模式：接著上次的 ${MK.list.length} 則`:'編修模式：點要改的地方，寫一句意見')}
 async function send(){if(!MK.list.length)return;const ver=(document.querySelector('link[href*="app.css?v"]')||{}).href||'';const v=(ver.match(/\?v(\d+)/)||[])[1]||'';
  const dark=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'';
  const body=`【面板修改意見】逐流 v${v}，${MK.list.length} 則（螢幕 ${innerWidth}×${innerHeight}${/dark/.test(dark)?'，深色':''}）\n`+MK.list.map((m,i)=>`${i+1}. ${m.note}\n   位置：${m.where||'（沒判斷出來）'}${m.txt?'；點的是「'+m.txt+'」':''}\n   元件：${m.code}`).join('\n');
  const bs=document.querySelectorAll('#mkBar [data-mk="send"],#mkBox [data-mk="send"]');bs.forEach(b=>{b.disabled=true;b.textContent='送出中…'});
  try{if(!LV.api||!LV.api.say)throw new Error('還沒連上');await LV.api.say(null,body,'daqi');
   const n=MK.list.length;MK.list=[];save();setOn(false);toast(`${n} 則意見送給大器了，改好會回在「跟大器說」`)}
  catch(e){bs.forEach(b=>{b.disabled=false;b.textContent=b.closest('#mkBox')?'全部送出':'送出'});toast('沒送出：'+(typeof LERR==='function'?LERR(e):e.message)+'。清單還在，可以再按一次')}}
 const stop=e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()};
 ['pointerdown','mousedown','touchstart'].forEach(ev=>window.addEventListener(ev,e=>{if(!MK.on||mine(e.target))return;if(ev!=='touchstart')e.preventDefault();e.stopPropagation()},{capture:true,passive:false}));
 window.addEventListener('click',e=>{if(window.__mkHit&&window.__mkHit(e)){stop(e);setOn(!MK.on);return}const k=e.target.closest&&e.target.closest('#mkBtn');if(k){stop(e);setOn(!MK.on);return}
  if(!MK.on)return;const m=e.target.closest&&e.target.closest('[data-mk]');
  if(m){stop(e);if(m.disabled)return;const a=m.dataset.mk;
   if(a==='end'){setOn(false);if(MK.list.length)toast(`${MK.list.length} 則還沒送，下次按「編修」接著寫`)}
   else if(a==='list'){clearSel();box('list')}
   else if(a==='cancel'){clearSel();box('')}
   else if(a==='del'){MK.list.splice(+m.dataset.i,1);save();bar();box(MK.list.length?'list':'')}
   else if(a==='add'){const i=$('#mkIn'),v=i?i.value.trim():'';if(!v){i&&i.focus();toast('寫一句哪裡要改');return}
    const p=MK.pick;MK.list.push({note:v,where:p.where,txt:p.txt,code:p.code});save();clearSel();box('');bar();toast(`記下第 ${MK.list.length} 則`)}
   else if(a==='send')send();return}
  if(mine(e.target))return;stop(e);const p=grab(e.target);MK.pick=p;clearSel();p.el.classList.add('mk-sel');box('pick')},true);
 window.addEventListener('keydown',e=>{if(MK.on&&e.key==='Escape'){if(MK.box){clearSel();box('')}else setOn(false)}});
 function btn(){const top=$('#top');if(!top||$('#mkBtn'))return;const k=document.createElement('button');k.id='mkBtn';k.className='mkbtn';k.type='button';
  k.setAttribute('aria-pressed','false');k.innerHTML='<span aria-hidden="true">✎</span><b>編修</b>';
  const hv=$('#hav');top.insertBefore(k,hv||null)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',btn);else btn();
 window.__zlMK=MK}
/* ---------- v70（2026-11-23）：老大 16 則面板意見第一批（排版、按鈕位置、新增鈕） ----------
   意見 2、3、4、6：「我覺得會需要有大標題，然後簡述小字 點進去有詳情」「標題應該要可以趕快知道這是什麼任務」
   → 列與拍板卡一律拆成「大標題（一眼看懂）＋小字簡述（最多兩行）」，點進去看全文。
   意見 1：「只有我做好了 那我沒做好怎麼辦 想要編輯注記怎麼辦？然後想要詢問怎麼辦？…我不想做怎麼辦？」→ 要你做的卡多四顆：還沒好、加註記、問大器、不做了。
   意見 10、11、12、13：掃描鈕對齊、卡片數字不超出、新增鈕放上面、備品加新增鈕。 */
function TT(raw){let s=String(raw||'').replace(/\s+/g,' ').trim().replace(/^(做完|完成)[：:]\s*/,'').replace(/^照步驟做/,'');
 const m=s.match(/^(.{3,18}?)[：:｜|，,（(]\s*(.+)$/);
 if(m)return {h:m[1].trim(),d:m[2].replace(/^[）)]/,'').trim()};
 if(s.length<=18)return {h:s,d:''};
 return {h:s.slice(0,16)+'…',d:s}}
const TTrow=(raw,meta)=>{const t=TT(raw);return `<b>${esc(t.h)}</b>${t.d?`<small class="d2">${esc(t.d)}</small>`:''}${meta?`<small>${esc(meta)}</small>`:''}`};
decRow=function(d){return `<div class="rowi" data-card="${esc(d.id)}"><button class="rowb" data-act="decopen" data-id="${esc(d.id)}">${bm('daqi','thinking')}<span class="tx">${TTrow(d.q||d.ask,brief(d.proj,d.ago))}</span><span class="rt"><span class="chev" aria-hidden="true">›</span></span></button></div>`};
jobList=function(){const j=jobs();if(!j.length)return `<div class="card"><p>現在沒有在跑的工作。</p></div>`;
 return `<div class="rows">`+j.map(x=>`<div class="rowi" data-card="${esc(x.id)}"><div class="rowb">${aiF(x.bot,'job:'+x.id)}<button class="tx" data-act="sheet" data-id="hjob:${esc(x.id)}" style="min-height:44px;text-align:left">${TTrow(x.ask,brief(x.raw&&x.raw.project,x.ago))}</button><span class="rt">${chip(x.st,x.wait)}</span></div></div>`).join('')+`</div>`};
evtList=function(n){const e=evts().slice(0,n);if(!e.length)return `<div class="card"><p>還沒有做完的紀錄。</p></div>`;
 return `<div class="rows">`+e.map(x=>{const r=x.raw||{},sum=String(r.summary||'');const left=(sum.match(/還沒做[：:](.+)$/)||[])[1];
  const head=r.ask||(left&&r.path?r.path:sum.replace(/｜?還沒做[：:].+$/,''))||x.ask;
  return `<div class="rowi" data-card="${esc(x.id)}"><div class="rowb">${aiF(x.bot,'evt:'+DB.events.indexOf(x))}<button class="tx" data-act="sheet" data-id="hevt:${esc(x.id)}" style="min-height:44px;text-align:left">${TTrow(head,(left?'還差：'+left.trim()+'・':'')+brief(x.who,x.at))}</button></div></div>`}).join('')+`</div>`};
ydSec=function(){const a=ydJobs();if(!a.length)return '';
 return `<section class="sec" id="secYou">${sh('daqi','要你做',a.length+' 件')}<div class="rows">`+a.map(j=>
  `<div class="rowi" data-card="${esc(j.id)}"><div class="rowb"><button class="tx" data-act="sheet" data-id="youdo:${esc(j.id)}" style="min-height:44px;text-align:left">${TTrow(ydFace(j),(j.project?j.project+'・':'')+LAGO(j.updatedAt))}</button><span class="rt">${ydMain(j)}</span></div></div>`).join('')+`</div></section>`};
// 拍板卡：大標題＋簡述
{const _s=decSlide;decSlide=function(d,n){const r=_s(d,n);r.html=r.html.replace(/<h2 class="dq dfull"([^>]*)>([\s\S]*?)<\/h2>(<p class="dwhy">[\s\S]*?<\/p>)?/,(m,at,q,why)=>{
  const raw=q.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'");const t=TT(raw);
  return `<h2 class="dq dfull dhead"${at}>${esc(t.h)}</h2>${t.d?`<p class="dwhy dsum">${esc(t.d)}</p>`:''}${why||''}`});return r}}
// 要你做：還沒好、加註記、問大器、不做了（都先打開跟大器的對話並帶好這張卡，字由老大自己改了再送）
function ydAsk(id,pre){const j=((LV.hub&&LV.hub.jobs)||[]).find(x=>x.id===id);const t=j?ydFace(j):'這件';
 ACT.close&&ACT.close();setTimeout(()=>openChat('daqi','',null,()=>{const i=$('#cText');if(i&&pre){i.value=`關於「${t}」：${pre}`;i.focus();try{i.setSelectionRange(i.value.length,i.value.length)}catch(e){}}}),250)}
ACT.ydnot=id=>ydAsk(id,'我還沒做好，因為');
ACT.ydnote=id=>ydAsk(id,'註記：');
ACT.ydq=id=>ydAsk(id,'');
ACT.ydskip=id=>ydAsk(id,'這件我不想做，原因：');
{const _s=sheetHTML;sheetHTML=function(){const h=_s();const a=(S.sheet||'').split(':');if(a[0]!=='youdo')return h;const id=a.slice(1).join(':');
 const j=((LV.hub&&LV.hub.jobs)||[]).find(x=>x.id===id);if(!j||j.status!=='waiting_you')return h;
 const more=`<p class="h4">還沒辦法做好？</p><div class="ydmore">${B('還沒好','ydnot',id)}${B('加註記','ydnote',id)}${B('問大器','ydq',id)}${B('不做了','ydskip',id)}</div>`;
 return h.replace(/(<div class="btns"><button[^>]*data-act="yddone")/,more+'$1')}}
// 怎麼做：一步一行，加編號（fullP 是 const，改在要你做的卡上後處理）
{const _s=sheetHTML;sheetHTML=function(){const h=_s();if(!/^youdo:/.test(S.sheet||''))return h;
 return h.replace(/<p class="h4">怎麼做<\/p><p style="white-space:pre-wrap;word-break:break-word">([\s\S]*?)<\/p>/,(m,t)=>{const ls=t.split('\n').map(x=>x.replace(/^\s*(\d+[.、)）]|[\u2460-\u2469]|[-・•])\s*/,'').trim()).filter(Boolean);
  return ls.length<2?m:`<p class="h4">怎麼做</p><ol class="ydsteps">${ls.map(x=>`<li>${x}</li>`).join('')}</ol>`})}}
// 生活：新增鈕放上面；備品也有新增
{const f=zoneLife;zoneLife=function(){let h=f();const s=S.sub.life;if(s!=='rout'&&s!=='sup')return h;
 h=h.split(`<div class="mrow">${mb('＋ 新增','add')}</div>`).join('');
 const top=`<div class="addtop">${B(s==='sup'?'＋ 新增備品':'＋ 新增例行','add',null,'pri')}</div>`;
 const i=h.indexOf('<section class="sec"');return i<0?h+top:h.slice(0,i)+top+h.slice(i)}}
/* ---------- v71（2026-11-23）：意見第二批之一，案子房間新增案子、案子可編輯 ----------
   老大原話：「這裡沒有我自己增加工作或案子的內容條件」「內容裡面也都不可以人為編輯 感覺怪怪的 但是我編輯也要能同步知道才可以」
   - 案子分頁多「＋ 新增案子」：標題、說明、期限（交件日），走 opp_work_add，再用 opp_card_edit 補說明、opp_work_update 補期限。
   - 案子詳情頁多「✎ 編輯」：標題、下一步、期限、說明。改了在卡上留「老大 11/23 改過」（寫在說明第一行），並寫一則給大器的訊息，AI 端同步知道。 */
const dTag=()=>{const d=new Date();return `${d.getMonth()+1}/${d.getDate()}`};
const EDM=/^【老大 [\d\/]+ 改過[^】]*】\n?/;
const edMark=c=>{const m=String((c&&c.why)||'').match(/^【老大 ([\d\/]+) 改過[：:]?([^】]*)】/);return m?{d:m[1],f:m[2]}:null};
{const _m=mapProj;mapProj=function(c){const x=_m(c);x.next=String(x.next||'').replace(EDM,'')||'還沒寫下一步';x.ask=String(x.ask||'').replace(EDM,'');x.edited=edMark(c);return x}}
{const _pc=projCard;projCard=function(p){const h=_pc(p);return p.edited?h.replace('</h3>',`</h3><p class="note edm">老大 ${esc(p.edited.d)} 改過</p>`):h}}
const WHYOF=c=>String((c&&c.why)||'').replace(EDM,'').replace(/^［皮條客 [^］\n]*］\n?/,'');
{const _s=sheetHTML;sheetHTML=function(){const a=(S.sheet||'').split(':'),t=a[0];
 if(t==='padd'){return shHead('新增案子')+`<label class="f">案名<input id="paTitle" maxlength="120" placeholder="例：品牌短片導演" autocomplete="off"></label><label class="f">說明（要做什麼、客戶是誰）<textarea id="paWhy" rows="4"></textarea></label><label class="f">期限（交件日）<input type="date" id="paDue"></label>${S.err==='padd'?'<p class="err" role="alert">▲ 還沒寫案名。</p>':''}<div class="btns">${B('建好案子','pasave',null,'pri wide')}</div>`}
 if(t==='pedit'){const id=S.sheet.slice(6),p=DB.proj.find(x=>x.id===id),c=p&&p.raw;if(!c)return shHead('這件不在了');
  return shHead('編輯案子')+`<label class="f">案名<input id="peTitle" maxlength="120" value="${esc(c.title||'')}"></label><label class="f">下一步<input id="peNext" maxlength="200" value="${esc(c.firstStep||'')}" placeholder="${esc(p.next||'')}"></label><label class="f">期限（交件日）<input type="date" id="peDue" value="${esc(String(c.deliveryDate||'').slice(0,10))}"></label><label class="f">說明<textarea id="peWhy" rows="5">${esc(WHYOF(c))}</textarea></label>${S.err==='pedit'?'<p class="err" role="alert">▲ 案名不能空白。</p>':''}<div class="btns">${B('存好','pesave',id,'pri wide')}</div><p class="note">存了會在卡上留「老大 ${dTag()} 改過」，也會告訴大器。</p>`}
 return _s()}}
// 案子分頁頂端的新增鈕；案子詳情頁的編輯鈕
{const _zp=zoneProj;zoneProj=function(){const h=_zp();if(S.sub.proj!=='proj')return h;
 const top=`<div class="addtop">${B('＋ 新增案子','sheet','padd','pri')}</div>`;const i=h.indexOf('<section class="sec"'),j=h.indexOf('class="empty');
 const k=h.indexOf('aria-label="案子分類">');const e=k<0?-1:h.indexOf('</div>',k);return e<0?top+h:h.slice(0,e+6)+top+h.slice(e+6)}}
{const _p=pageHTML;pageHTML=function(){const h=_p(),a=(S.page||'').split(':');if(a[0]!=='proj')return h;const p=DB.proj.find(x=>x.id===a[1]);if(!p||!p.raw||!p.raw.id)return h;
 const m=p.edited?`<p class="note edm">老大 ${esc(p.edited.d)} 改過${p.edited.f?'：'+esc(p.edited.f):''}</p>`:'';
 return h.replace(/(<h1 class="pt">[\s\S]*?<\/h1>)/,`$1${m}<div class="mrow">${mb('✎ 編輯','sheet','pedit:'+p.id)}</div>`)}}
ACT.pasave=()=>{const g=s=>{const e=document.getElementById(s);return e?e.value:''},t=g('paTitle').trim(),why=g('paWhy').trim(),due=g('paDue');
 if(!t){S.err='padd';render('keep');return}S.err='';
 if(!LV.api||!LV.api.workAdd){toast('離線中，連上再加');return}
 closeThen(async()=>{try{const c=await LV.api.workAdd(t.slice(0,120));const id=c&&c.id;
  if(id){if(why&&LV.api.cardEdit)await LV.api.cardEdit(id,{why});if(due)await LV.api.act(id,'work',{patch:{delivery_date:due}})}
  await reload();toast('新增了案子：'+clip(t,20))}catch(e){toast('沒存上：'+LERR(e))}})};
ACT.pesave=id=>{const g=s=>{const e=document.getElementById(s);return e?e.value:''},p=DB.proj.find(x=>x.id===id),c=p&&p.raw;if(!c)return;
 const t=g('peTitle').trim();if(!t){S.err='pedit';render('keep');return}S.err='';
 const nx=g('peNext').trim(),due=g('peDue'),why=g('peWhy').trim(),ch=[];
 const patch={};if(t!==c.title){patch.title=t;ch.push('案名')}if(nx!==(c.firstStep||'')){patch.first_step=nx;ch.push('下一步')}
 const oldDue=String(c.deliveryDate||'').slice(0,10),dueCh=due!==oldDue;if(dueCh)ch.push('期限');
 if(why!==WHYOF(c).trim())ch.push('說明');
 if(!ch.length){toast('沒有改動');closeThen(()=>{});return}
 const mk=`【老大 ${dTag()} 改過：${ch.join('、')}】`;patch.why=mk+'\n'+why;
 const old={why:c.why||'',title:c.title,first_step:c.firstStep||''};
 closeThen(async()=>{try{
  await LV.api.cardEdit(id,patch);if(dueCh)await LV.api.act(id,'work',{patch:{delivery_date:due||null}});
  try{await LV.api.say(id,`【老大改了案子】〈${t}〉改了：${ch.join('、')}。請以面板現在的內容為準（${dTag()}）。`,'daqi')}catch(e){}
  await reload();toast(`存好了，大器知道你改了${ch.join('、')}`,async()=>{try{await LV.api.cardEdit(id,old);if(dueCh)await LV.api.act(id,'work',{patch:{delivery_date:oldDue||null}});await reload();toast('還原了')}catch(e){toast('沒還原：'+LERR(e))}})
 }catch(e){toast('沒存上：'+LERR(e))}})};
WRITE.push('pasave','pesave');
/* ---------- v72（2026-11-23）：意見第二批之二，交辦「步驟卡」：每步可選模型、執行方式（監工本身或開子視窗）、技能 ----------
   老大原話：「希望交辦或者案子與工作可以設立步驟卡與模型選用，如果可以，也可以選用監工、子視窗方式來描寫分派，這樣真的執行的時候就會有照這個架構走，
   並且希望這些卡片會等同一個視窗或多個視窗 可以在裡面裡 標記到我的技能庫」
   存法：不加資料庫欄位。步驟照舊存 progress_steps（opp_progress_set 的 p_steps），模型、方式、技能寫在每步 note 開頭：〔模型：Opus 5.5｜方式：開子視窗｜技能：eyear〕備註。
   送出執行時櫃台 brief 會帶步驟（櫃台說明.md 第 2 點已補一句：照這些指定執行）。 */
const SMODEL=['不指定','Opus 5.5','Fable 5.2','Codex','AGY','Grok'],SMODE=['監工本身','開子視窗'];
const SSKILL=['archimise','canon','copybook','craft','diagram-design','distill','eagle','eyear','eyear-meeting-notes','fieldwork','folio','glean','handy','herald','hyperframes','intake','last30days','lilt','media-use','minimise','mise','motion','present','proof','score','splice','stage','sweep','tableread','trophy','vault','weigh'];
const SMETA=/^〔([^〕]*)〕\s*/;
function stepOf(s){const o={name:s.name||'',status:s.status||'pending',model:'不指定',mode:'監工本身',skill:'',note:s.note||''},m=SMETA.exec(o.note);
 if(m){o.note=o.note.slice(m[0].length);m[1].split('｜').forEach(kv=>{const i=kv.indexOf('：'),k=kv.slice(0,i),v=kv.slice(i+1);if(k==='模型')o.model=v;else if(k==='方式')o.mode=v;else if(k==='技能')o.skill=v})}
 return o}
function stepNote(o){const a=[];if(o.model&&o.model!=='不指定')a.push('模型：'+o.model);if(o.mode&&o.mode!=='監工本身')a.push('方式：'+o.mode);if(o.skill)a.push('技能：'+o.skill);
 return (a.length?`〔${a.join('｜')}〕`:'')+(o.note||'')}
const stepTags=o=>[o.model!=='不指定'?o.model:'',o.mode==='開子視窗'?'子視窗':'',o.skill?'技能 '+o.skill:''].filter(Boolean).join('・');
const sOpt=(a,v)=>a.map(x=>`<option${x===v?' selected':''}>${esc(x)}</option>`).join('');
const stepRow=(o,i)=>`<div class="strow" data-st="${i}" data-status="${esc(o.status)}"><div class="strh"><b>第 ${i+1} 步</b><button type="button" class="mb" data-act="stdel" data-id="${i}">拿掉</button></div>
 <label class="f">這步做什麼<input class="st-name" maxlength="80" value="${esc(o.name)}" placeholder="例：整理素材清單"></label>
 <div class="st3"><label class="f">模型<select class="st-model">${sOpt(SMODEL,o.model)}</select></label><label class="f">方式<select class="st-mode">${sOpt(SMODE,o.mode)}</select></label><label class="f">技能庫<select class="st-skill"><option value="">不標</option>${SSKILL.map(x=>`<option${x===o.skill?' selected':''}>${x}</option>`).join('')}</select></label></div>
 <label class="f">備註<input class="st-note" maxlength="160" value="${esc(o.note)}"></label></div>`;
const todoOf=id=>DB.todo.find(t=>t.id===id)||DB.proj.find(t=>t.id===id);
{const _s=sheetHTML;sheetHTML=function(){const a=(S.sheet||'').split(':'),t=a[0];
 if(t==='stepx'){const id=S.sheet.slice(6),it=todoOf(id),c=it&&it.raw;if(!c)return shHead('這件不在了');
  const st=(c.progressSteps||[]).map(stepOf);if(!st.length)st.push(stepOf({name:''}));
  return shHead('步驟卡')+`<p class="note">一步一張卡：選這步用哪個模型、監工自己做還是開子視窗、標哪個技能。按「去執行」時，大器照這個架構走。</p><div id="stRows">${st.map(stepRow).join('')}</div><div class="mrow">${mb('＋ 加一步','stadd','')}</div>${S.err==='stepx'?'<p class="err" role="alert">▲ 每一步都要寫做什麼。</p>':''}<div class="btns">${B('存好','stsave',id,'pri wide')}</div>`}
 let h=_s();
 if(t==='cview'&&a[1]==='todo'){const id=a.slice(2).join(':'),it=DB.todo.find(q=>q.id===id);if(it&&it.raw){const st=(it.raw.progressSteps||[]).map(stepOf),
   sec=`<p class="h4">步驟卡</p>${st.length?`<ol class="ydsteps stlist">${st.map(o=>`<li>${esc(o.name)}${stepTags(o)?`<small class="d2">${esc(stepTags(o))}</small>`:''}</li>`).join('')}</ol>`:'<p class="note">還沒設步驟。可以自己排，也可以請定定或大器規劃。</p>'}<div class="mrow">${mb('🧩 '+(st.length?'編輯步驟卡':'設步驟卡與模型'),'sheet','stepx:'+id)}</div>`;
   h=h.replace(/<div class="mrow">(?![\s\S]*<div class="mrow">)/,sec+'<div class="mrow">')}}
 return h}}
ACT.stadd=()=>{const box=$('#stRows');if(!box)return;const n=box.querySelectorAll('.strow').length;if(n>=30){toast('最多 30 步');return}
 box.insertAdjacentHTML('beforeend',stepRow(stepOf({name:''}),n));const i=box.querySelector('.strow:last-child .st-name');if(i)i.focus()};
ACT.stdel=i=>{const box=$('#stRows');if(!box)return;const r=box.querySelector(`.strow[data-st="${i}"]`);if(r)r.remove();
 box.querySelectorAll('.strow').forEach((e,k)=>{e.dataset.st=k;e.querySelector('.strh b').textContent=`第 ${k+1} 步`;e.querySelector('[data-act="stdel"]').dataset.id=k})};
ACT.stsave=id=>{const rows=[...document.querySelectorAll('#stRows .strow')],it=todoOf(id),c=it&&it.raw;if(!c)return;
 const steps=rows.map(r=>({name:r.querySelector('.st-name').value.trim(),model:r.querySelector('.st-model').value,mode:r.querySelector('.st-mode').value,skill:r.querySelector('.st-skill').value,note:r.querySelector('.st-note').value.trim(),status:r.dataset.status||'pending'}));
 const keep=steps.filter(s=>s.name||s.note);if(steps.some(s=>!s.name&&(s.note||s.skill))){S.err='stepx';render('keep');return}S.err='';
 const old=(c.progressSteps||[]).map(s=>({name:s.name,status:s.status,note:s.note||''}));
 const body=keep.map(s=>({name:s.name,status:s.status,note:stepNote(s)}));
 if(!LV.api||!LV.api.act){toast('離線中，連上再存');return}
 closeThen(async()=>{try{await LV.api.act(id,'steps',{steps:body});await reload();toast(body.length?`存了 ${body.length} 張步驟卡`:'步驟卡清掉了',async()=>{try{await LV.api.act(id,'steps',{steps:old});await reload();toast('還原了')}catch(e){toast('沒還原：'+LERR(e))}})}catch(e){toast('沒存上：'+LERR(e))}})};
WRITE.push('stsave','stadd','stdel');
{const _p=pageHTML;pageHTML=function(){const h=_p(),x=(S.page||'').split(':');if(x[0]!=='proj')return h;const p=DB.proj.find(q=>q.id===x[1]);if(!p||!p.raw||!p.raw.id)return h;
 return h.replace(/(data-id="pedit:[^"]*">✎ 編輯<\/button>)/,'$1'+mb('🧩 步驟卡','sheet','stepx:'+p.id))}}
{const _ms=mineSheet;mineSheet=function(id){const i=id.indexOf(':'),k=id.slice(0,i),x=id.slice(i+1);const h=_ms(id);
 return k==='todo'&&DB.todo.find(q=>q.id===x)?h.replace(/<\/div>$/,mi('🧩','步驟卡、模型、技能','sheet','stepx:'+x)+'</div>'):h}}
/* ---------- v73（2026-11-23）：意見第二批之三，生活例行事項可分類、分類可收合、請朋朋幫忙分類 ----------
   老大原話：「是否應該新增制定分類或AI幫我分類然後可以收合？」
   分類存在既有欄位 cat（hub_life_set 本來就收），不加資料庫欄位。沒分類的放「其他」。收合狀態記在這支手機（localStorage zl_rcoll）。
   請朋朋分類：按了才送一句給朋朋（不自動送），她回「名稱：分類」每行一項，面板讀得懂就出現「套用朋朋的分類」，老大按了才寫入，可復原。 */
LF.rout.push(['cat','分類（例：家務、身體、車子）','text']);
const RCK='zl_rcoll',RCA='zl_rcat_ask';let RC=new Set();try{RC=new Set(JSON.parse(localStorage.getItem(RCK)||'[]'))}catch(e){}
const rcSave=()=>{try{localStorage.setItem(RCK,JSON.stringify([...RC]))}catch(e){}};
const rcat=r=>String((r.raw2&&r.raw2.cat)||'').trim()||'其他';
const rcNorm=s=>String(s||'').replace(/[\s「」『』（）()]/g,'').toLowerCase();
function rcParse(txt,list){const map={};String(txt||'').split(/\n+/).forEach(l=>{const m=l.match(/^[\s\-•*\d.、)）]*(.+?)\s*(?:[：:]|→|->|＝|=)\s*([^：:\s→]{1,10})\s*$/);if(!m)return;
  const n=rcNorm(m[1]),c=m[2].trim().replace(/[。.，,]$/,'');const r=list.find(x=>rcNorm(x.name)===n)||list.find(x=>n.length>=2&&(rcNorm(x.name).includes(n)||n.includes(rcNorm(x.name))));if(r&&c&&c!=='其他')map[r.id]=c});return map}
let rcMsgs=null,rcKey='',rcAt=0;
function rcLoad(){const ask=+(()=>{try{return localStorage.getItem(RCA)}catch(e){return 0}})()||0;if(!ask||!LV.api||!LV.api.msgs||Date.now()-rcAt<6000)return;rcAt=Date.now();
 LV.api.msgs(null,'peng').then(ms=>{const k=JSON.stringify((ms||[]).map(m=>m.id));if(k!==rcKey){rcKey=k;rcMsgs=ms||[];if(S.tab==='life'&&S.sub.life==='rout'&&!S.sheet){LV.sig='';paint()}}}).catch(()=>{})}
function rcReply(){const ask=+(()=>{try{return localStorage.getItem(RCA)}catch(e){return 0}})()||0;if(!ask||!rcMsgs)return null;
 const later=rcMsgs.filter(m=>m.kind!=='user'&&m.at>=ask-1000);if(!later.length)return{wait:1};
 for(const m of later.slice().reverse()){const map=rcParse(m.body,DB.rout);if(Object.keys(map).length)return{map}}return{wait:0,none:1}}
{const f=zoneLife;zoneLife=function(){const h=f();if(S.sub.life!=='rout'||!LV.life||!DB.rout.length)return h;
 const t=document.createElement('template');t.innerHTML=h;const box=t.content.querySelector('.rows.stg');if(!box)return h;
 const rows=[...box.querySelectorAll(':scope>.rowi[data-card]')];if(!rows.length)return h;
 const byId={};DB.rout.forEach(r=>byId[r.id]=r);const cats=[],g={};
 rows.forEach(r=>{const x=byId[r.getAttribute('data-card')],c=x?rcat(x):'其他';if(!g[c]){g[c]=[];cats.push(c)}g[c].push({el:r,x})});
 cats.sort((a,b)=>(a==='其他')-(b==='其他'));
 const none=(g['其他']||[]).length,grouped=cats.length>1||cats[0]!=='其他';
 if(grouped){box.innerHTML='';cats.forEach(c=>{const a=g[c],open=!RC.has(c),ov=a.filter(o=>o.x&&o.x.ago>=o.x.cyc).length;
  box.insertAdjacentHTML('beforeend',`<div class="rowi rcat"><button class="rowb" data-act="rcoll" data-id="${esc(c)}" aria-expanded="${open}"><span class="tx"><b>${esc(c)}</b><small>${a.length} 項${ov?`・${ov} 項該做了`:''}</small></span><span class="rt"><span class="chev" aria-hidden="true">${open?'⌃':'⌄'}</span></span></button></div>`);
  if(open)a.forEach(o=>box.appendChild(o.el))})}
 const rp=rcReply();let bar='';
 if(rp&&rp.map){const n=Object.keys(rp.map).length;bar=`<div class="rcbar"><span>朋朋分好了：${n} 項</span>${B('套用朋朋的分類','rcapply',null,'pri sm')}</div>`}
 else if(rp&&rp.wait)bar=`<div class="rcbar"><span>朋朋還在分，回來會出現在這裡</span></div>`;
 else if(rp&&rp.none)bar=`<div class="rcbar"><span>朋朋回了，但我讀不出「名稱：分類」</span>${mb('再請一次','rcask')}</div>`;
 else if(none)bar=`<div class="rcbar"><span>${none} 項還沒分類</span>${mb(bm('peng')+'請朋朋幫我分類','rcask')}</div>`;
 else bar=`<div class="rcbar"><span>都分好類了</span>${mb(bm('peng')+'請朋朋重新分','rcask')}</div>`;
 const sec=t.content.querySelector('section.sec');if(sec)sec.insertAdjacentHTML('afterbegin',bar);
 if(rp===null||rp.wait)rcLoad();else if(!rcMsgs)rcLoad();
 return t.innerHTML}}
ACT.rcoll=c=>{if(RC.has(c))RC.delete(c);else RC.add(c);rcSave();render('keep')};
ACT.rcask=()=>{const list=DB.rout.map(r=>r.name+(rcat(r)!=='其他'?'（現在：'+rcat(r)+'）':''));if(!list.length)return;
 try{localStorage.setItem(RCA,String(Date.now()))}catch(e){}rcMsgs=null;rcKey='';
 botAsk('peng',`【請朋朋分類】老大要把例行事項分類，方便收合。請幫這 ${list.length} 項各分一類，只回這個格式，每行一項：名稱：分類。分類用 2 到 3 個字（例：家務、身體、車子、植物、財務、工作、其他）。\n${list.join('\n')}`,'rout:cat');
 setTimeout(rcLoad,4000)};
ACT.rcapply=()=>{const rp=rcReply();if(!rp||!rp.map)return;const ids=Object.keys(rp.map),old={};ids.forEach(id=>{const r=DB.rout.find(x=>x.id===id);old[id]=(r&&r.raw2&&r.raw2.cat)||''});
 (async()=>{try{for(const id of ids)await LV.api.lifeSet(id,'rout',{cat:rp.map[id]});try{localStorage.removeItem(RCA)}catch(e){}rcMsgs=null;rcKey='';await reloadLife();
  toast(`分好了 ${ids.length} 項`,async()=>{try{for(const id of ids)await LV.api.lifeSet(id,'rout',{cat:old[id]});await reloadLife();toast('還原了')}catch(e){toast('沒還原：'+LERR(e))}})}catch(e){toast('沒套完：'+LERR(e));reloadLife()}})()};
ACT.catpick=c=>{const i=$('#le_cat');if(i){i.value=c;i.dispatchEvent(new Event('input',{bubbles:true}))}};
{const _s=sheetHTML;sheetHTML=function(){const h=_s(),a=(S.sheet||'').split(':');if(a[0]!=='ledit')return h;const li=LI(a.slice(1).join(':'));if(!li||li.k!=='rout')return h;
 const cs=[...new Set(DB.rout.map(rcat).filter(c=>c!=='其他').concat(['家務','身體','車子','植物','財務','工作']))].slice(0,10);
 return h.replace(/(<input[^>]*id="le_cat"[^>]*>)/,`$1</label><div class="rcchips">${cs.map(c=>mb(esc(c),'catpick',c)).join('')}</div><label class="vh">`)}}
WRITE.push('rcask','rcapply');
window.__zlRC={parse:rcParse};
/* ---------- v74（2026-11-23）：意見第二批之四，備品請萌萌比價：沒有品牌先問需求 ----------
   老大原話：「比價的時候如果沒有確切品牌名稱就會先找問我需求找推薦」
   判斷：品名或備註裡有英文字或數字（型號）、或是常見品牌，算「有指定品牌」；其餘算沒指定。沒指定時送給萌萌的句子帶「沒有指定品牌，先問老大需求再推薦」，畫面也先說萌萌會問你。 */
const BRANDS=['無印良品','好自在','舒潔','康乃馨','白蘭','好來','黑人','麗仕','多芬','花王','蘭蔻','資生堂','妮維雅','曼秀雷敦','靠得住','蘇菲','佳潔士','高露潔','潘婷','海倫仙度絲','飛利浦','小米','象印','虎牌','大同','日立','三星','蘋果'];
const hasBrand=u=>{const s=(u.name||'')+' '+((u.raw2&&u.raw2.note)||'');return /[A-Za-z]{2,}|\d{2,}/.test(s)||BRANDS.some(b=>s.includes(b))};
const NOBR='沒有指定品牌，先問老大需求再推薦';
ACT.supcmp=(id,el)=>{const u=DB.sup.find(x=>x.id===id);if(!u)return;if(supCmp(u)){openChat('mon','sup:'+id,el,null);return}
 LV.supRun[id]=1;LV.sig='';const nb=!hasBrand(u);
 botAsk('mon',`請比價備品「${u.name}」${u.raw2&&u.raw2.note?'（'+u.raw2.note+'）':''}（備品編號 ${id}）。${nb?NOBR+'：先問我預算、用途、偏好，我回了你再推薦兩三個品牌，': ''}列三家含運總價與到貨時間，推薦一家`,'sup:'+id);setTimeout(loadMon,3000)};
{const f=zoneLife;zoneLife=function(){const h=f();if(S.sub.life!=='sup'||!LV.life)return h;
 const t=document.createElement('template');t.innerHTML=h;let ch=0;
 t.content.querySelectorAll('.rowi[data-card]').forEach(r=>{const b=r.querySelector('[data-act="supcmp"]'),u=b&&DB.sup.find(x=>x.id===r.getAttribute('data-card'));if(!u||supCmp(u)||hasBrand(u))return;
  const sm=r.querySelector('.tx small');if(sm){sm.insertAdjacentHTML('beforeend','<br><span class="cmpst">沒有品牌，萌萌會先問你需求</span>');ch=1}});
 return ch?t.innerHTML:h}}
/* ---------- v75（2026-11-23）：意見第二批之五，生活待辦「請朋朋安排」 ----------
   老大原話：「我覺得可以多一個按鈕 是請朋朋預約 或訂位 或看我行事曆幫我安排幾個適合的時間 確定時間後朋朋能代辦的就先處理，譬如說預定或購買訂票等等」
   按了才送（不自動送）：待辦內容＋老大未來 14 天行事曆空檔（9:00～21:00、至少 1 小時）給朋朋，請她列 2～3 個時段讓老大選；選定後能代辦的（預約、訂位、訂票）先處理，
   付款一律開付款授權單等老大按，不直接付。朋朋的回覆從她那段對話讀回來，顯示在待辦那一列。 */
const mm=s=>{const a=String(s||'').split(':');return a.length<2?null:(+a[0])*60+(+a[1])},hm2=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
const WD=['日','一','二','三','四','五','六'];
function calFree(days){const out=[],now=new Date(),t0=new Date();t0.setHours(0,0,0,0);
 for(let d=0;d<days;d++){const dt=new Date(t0.getTime()+d*864e5),lab=`${dt.getMonth()+1}/${dt.getDate()}（${WD[dt.getDay()]}）`,ev=CAL.filter(e=>e.d===d);
  const all=ev.filter(e=>e.all);let lo=540;if(d===0){const n=now.getHours()*60+now.getMinutes();lo=Math.max(540,Math.ceil((n+30)/60)*60)}
  const bz=ev.filter(e=>!e.all&&mm(e.t)!=null).map(e=>[mm(e.t),mm(e.e)==null?mm(e.t)+60:mm(e.e)]).sort((a,b)=>a[0]-b[0]);
  const fr=[];let cur=lo;bz.forEach(([s,e])=>{if(s-cur>=60)fr.push([cur,s]);cur=Math.max(cur,e)});if(1260-cur>=60)fr.push([cur,1260]);
  out.push(`${lab}${all.length?'（整天有：'+all.map(e=>e.n).join('、')+'）':''}${fr.length?' 空：'+fr.map(r=>hm2(r[0])+'-'+hm2(r[1])).join('、'):' 沒有空檔'}`)}
 return out}
const LTA='zl_lt_ask';let ltAsks={};try{ltAsks=JSON.parse(localStorage.getItem(LTA)||'{}')}catch(e){}
let lpMsgs=null,lpKey='',lpAt=0;
function lpLoad(){if(!LV.api||!LV.api.msgs||Date.now()-lpAt<8000)return;lpAt=Date.now();
 LV.api.msgs(null,'peng').then(ms=>{const k=JSON.stringify((ms||[]).map(m=>m.id));if(k!==lpKey){lpKey=k;lpMsgs=ms||[];if(S.tab==='life'&&S.sub.life==='todo'&&!S.sheet){LV.sig='';paint()}}}).catch(()=>{})}
function ltSt(t){const ms=lpMsgs||[];let q=-1;ms.forEach((m,i)=>{if(m.kind==='user'&&m.body.indexOf('【測試】')!==0&&Date.now()-m.at<14*864e5&&m.body.indexOf('待辦編號 '+t.id)>-1)q=i});
 if(q<0)return ltAsks[t.id]&&Date.now()-ltAsks[t.id]<864e5?{run:1,t:'朋朋安排中・'+LHM(ltAsks[t.id])+' 送出'}:null;
 const later=ms.slice(q+1).filter(m=>m.kind!=='user'),r=later.find(m=>m.body.indexOf(t.name)>-1)||later[0];
 return r?{t:'朋朋：'+clip(r.body,40)}:{run:1,t:'朋朋安排中・'+LHM(ms[q].at)+' 送出'}}
{const f=zoneLife;zoneLife=function(){const h=f();if(S.sub.life!=='todo'||!LV.life)return h;
 const tp=document.createElement('template');tp.innerHTML=h;let ch=0;
 tp.content.querySelectorAll('.rowi[data-card]').forEach(r=>{const t=LT(r.getAttribute('data-card'));if(!t||t.done)return;const st=ltSt(t);
  r.insertAdjacentHTML('beforeend',`<div class="mrow lta">${mb(bm('peng',st&&st.run?'thinking':'','sm')+(st?(st.run?'看朋朋安排進度':'看朋朋的安排'):'請朋朋安排'),'ltask',t.id)}${st?`<span class="cmpst${st.run?' run':''}">${esc(st.t)}</span>`:'<span class="cmpst">預約、訂位、訂票，或排出適合的時間</span>'}</div>`);ch=1});
 lpLoad();return ch?tp.innerHTML:h}}
ACT.ltask=(id,el)=>{const t=LT(id);if(!t)return;if(ltSt(t)){openChat('peng','lt:'+id,el,null);return}
 const free=calFree(14).join('\n'),next=Date.now();ltAsks[id]=next;try{localStorage.setItem(LTA,JSON.stringify(ltAsks))}catch(e){}
 botAsk('peng',`【請朋朋安排】待辦「${t.name}」（待辦編號 ${id}）${t.note?'，備註：'+t.note:''}。請幫我預約、訂位或訂票，流程這樣：\n1. 先看我未來 14 天的行事曆空檔，列 2 到 3 個適合的時段給我選，我在逐流回你。\n2. 我選定時段後，你能代辦的（預約、訂位、訂票）先處理。\n3. 要付款一律開付款授權單，等我在逐流按付款鈕，不要直接付、不要代按。\n我沒選時段之前先不要訂。\n我的行事曆（空檔是 9:00 到 21:00 之間至少 1 小時）：\n${free}`,'lt:'+id);setTimeout(lpLoad,4000)};
{const _n=ctxName;ctxName=function(ctx){const a=(ctx||'').split(':');if(a[0]==='lt'){const t=LT(a[1]);return t?'待辦：'+t.name:''}return _n(ctx)}}
WRITE.push('ltask');
/* ---------- v76（2026-11-23）：意見第二批之六，想買卡有縮圖、點開看價格通路付款方式，沒比過價的卡有「萌萌先找」 ----------
   老大原話：「這邊應該有縮圖 點開要有找到的價格跟詳細資訊還有通路以及付費方式 我正在考慮 我加入想要買的時候是不是萌萌先找？」
   - 縮圖：資料裡有圖片網址（卡片備註「圖片：https://…」或萌萌回覆裡的「圖片：https://…」）就用圖，沒有就是品名首字的色塊。
   - 點開（整張卡）：大圖、價格、通路、付款方式、連結，來自卡片本身與萌萌最近一次回覆（她回「價格：…／通路：…／付款方式：…／連結：…／圖片：…」每行一項）。
     有新資訊可以按「存到這張卡」，寫進 price、shop、url、note（付款方式與圖片網址存在備註的「付款方式：」「圖片：」行），不加資料庫欄位。
   - 「萌萌先找」：想買卡還沒價格、沒比過價時卡上多這顆，按了才送給萌萌（不自動送）。 */
const WFK=/^(價格|通路|付款方式|付費方式|連結|網址|圖片)\s*[：:]\s*(.+)$/;
function wfParse(txt){const o={};String(txt||'').split(/\n+/).forEach(l=>{const m=l.trim().replace(/^[\-•*\d.、)）]+\s*/,'').match(WFK);if(!m)return;const k={價格:'price',通路:'shop',付款方式:'pay',付費方式:'pay',連結:'url',網址:'url',圖片:'img'}[m[1]],v=m[2].trim();if(!o[k])o[k]=v});
 if(o.url){const u=(o.url.match(/https:\/\/[^\s)）」]+/)||[])[0];if(u)o.url=u;else delete o.url}
 if(o.img){const u=(o.img.match(/https:\/\/[^\s)）」]+/)||[])[0];if(u)o.img=u;else delete o.img}
 return o}
const wfNote=n=>{const o={};String(n||'').split('\n').forEach(l=>{const m=l.match(/^(付款方式|圖片)：(.+)$/);if(m)o[m[1]==='圖片'?'img':'pay']=m[2].trim()});return o};
const wfStrip=n=>String(n||'').split('\n').filter(l=>!/^(付款方式|圖片)：/.test(l)).join('\n').trim();
const wfNum=s=>{const m=String(s||'').replace(/,/g,'').match(/\d+(?:\.\d+)?/);return m?+m[0]:null};
const okImg=u=>/^https:\/\/[^\s"'<>]+$/i.test(u||'');
let wfAt=0;function wfLoad(){if(Date.now()-wfAt<8000)return;wfAt=Date.now();loadMon()}
function wfReply(w){const ms=LV.monMsgs||[];let q=-1;ms.forEach((m,i)=>{if(m.kind==='user'&&m.body.indexOf('【測試】')!==0&&Date.now()-m.at<14*864e5&&m.body.indexOf('想買編號 '+w.id)>-1)q=i});
 if(q<0)return null;const later=ms.slice(q+1).filter(m=>m.kind!=='user');if(!later.length)return{run:1,at:ms[q].at};
 const r=later.slice().reverse().find(m=>Object.keys(wfParse(m.body)).length)||later[0];return{msg:r,info:wfParse(r.body)}}
function wfInfo(w){const x=w.raw2||{},nt0=wfNote(x.note),rp=wfReply(w),i=rp&&rp.info||{};
 return {price:w.noPrice?(i.price||''):nt(w.price),shop:w.shop&&!/還沒補/.test(w.shop)?w.shop:(i.shop||''),pay:nt0.pay||i.pay||'',url:w.url||i.url||'',img:okImg(nt0.img)?nt0.img:(okImg(i.img)?i.img:''),rp,
  fresh:{price:i.price&&wfNum(i.price)!=null&&(w.noPrice||wfNum(i.price)!==w.price),shop:i.shop&&i.shop!==w.shop,pay:i.pay&&i.pay!==nt0.pay,url:i.url&&i.url!==w.url,img:okImg(i.img)&&i.img!==nt0.img}}}
const wimgH=(w,big)=>{const f=wfInfo(w);return `<div class="wimg${big?' wbig':''}" aria-hidden="true" style="background:${w.col}">${f.img?`<img src="${esc(f.img)}" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.remove()">`:''}<span>${esc(w.ch)}</span></div>`};
{const _w=wishCard;wishCard=function(w,i,n){let h=_w.apply(this,arguments);if(!LV.life||w.load)return h;
 h=h.replace(/<div class="wimg"[^>]*>[\s\S]*?<\/div><div class="wtx">/,()=>wimgH(w)+'<div class="wtx">');
 h=h.replace(/^<div class="card cardx" data-card="([^"]*)">/,(m,id)=>`<div class="card cardx" data-card="${id}" data-act="copen" data-id="sheet|wdet:${id}">`);
 const st=w.st!=='bought'?wfReply(w):null,need=w.st!=='bought'&&w.noPrice&&!st&&!Array.isArray(w.cmp);
 const row=need?`<div class="mrow">${mb(bm('mon')+'萌萌先找','wishfind',w.id)}<span class="cmpst">價格、通路、付款方式，沒指定品牌她會先問你</span></div>`:st?`<div class="mrow">${mb(bm('mon',st.run?'thinking':'','sm')+(st.run?'看萌萌找的進度':'看萌萌找到的'),'sheet','wdet:'+w.id)}<span class="cmpst${st.run?' run':''}">${st.run?'萌萌找資料中':'萌萌回了，點開看'}</span></div>`:'';
 wfLoad();return row?h.replace(/<\/div>$/,row+'</div>'):h}}
{const _s=sheetHTML;sheetHTML=function(){const a=(S.sheet||'').split(':');if(a[0]!=='wdet')return _s();const w=W(a.slice(1).join(':'));if(!w)return shHead('這項不在了');
 const f=wfInfo(w),fr=f.fresh,any=fr.price||fr.shop||fr.pay||fr.url||fr.img;
 const kv=[['價格',f.price||'還沒找到'],['通路',f.shop||'還沒找到'],['付款方式',f.pay||'還沒找到']];
 const link=f.url?`<p class="h4">連結</p><p style="word-break:break-all"><a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">${esc(f.url)}</a></p>`:'';
 const rp=f.rp;
 return shHead(esc(w.name))+`<div class="wdh">${wimgH(w,1)}<div><p class="amt" style="color:var(--ink);font-size:22px">${esc(f.price||'還沒有價格')}</p><p class="note">${esc(f.shop||'通路還沒找到')}</p></div></div>`+kvs(kv)+link
  +(rp&&rp.msg?`<p class="h4">${bm('mon','','sm')}萌萌最近回的</p><p style="white-space:pre-wrap;word-break:break-word">${esc(clip(rp.msg.body,600))}</p>`:rp&&rp.run?`<p class="note">萌萌找資料中，回來會出現在這裡。</p>`:`<p class="note">還沒請萌萌找。按下面「萌萌先找」，她會找價格、通路、付款方式；沒指定品牌會先問你需求。</p>`)
  +`<div class="mrow">${any?B('存到這張卡','wfsave',w.id,'pri'):''}${rp?mb('開萌萌的對話','wfchat',w.id):mb(bm('mon')+'萌萌先找','wishfind',w.id)}${mb('✎ 編輯','ledit',w.id)}</div>${any?'<p class="note">「存到這張卡」會把價格、通路、連結寫進這張卡，付款方式與圖片網址存在備註裡。</p>':''}`}}
ACT.wfchat=(id,el)=>openChat('mon','wish:'+id,el,null);
ACT.wishfind=id=>{const w=W(id);if(!w)return;LV.wishRun[id]='mon';LV.sig='';
 botAsk('mon',`【萌萌先找】老大想買「${w.name}」（想買編號 ${id}）${w.url?'，來源 '+w.url:''}${w.spec?'，備註：'+w.spec:''}。先幫我找：價格、通路、付款方式（信用卡、貨到付款、分期、超商等）、商品連結、商品圖片網址。每行一項，格式：\n價格：NT$ …\n通路：…\n付款方式：…\n連結：https://…\n圖片：https://…\n沒有指定品牌的話，先問我預算、用途、偏好，我回了你再推薦。`,'wish:'+id);setTimeout(loadMon,3000)};
ACT.wishcmp=ACT.wishfind;
ACT.wfsave=id=>{const w=W(id);if(!w)return;const f=wfInfo(w),fr=f.fresh,p={},old={},x=w.raw2||{};
 if(fr.price){const n=wfNum(f.rp.info.price);if(n!=null){p.price=n;old.price=x.price==null?null:x.price}}
 if(fr.shop){p.shop=f.rp.info.shop;old.shop=x.shop||''}
 if(fr.url&&/^https:\/\//.test(f.rp.info.url)){p.url=f.rp.info.url;old.url=x.url||''}
 if(fr.pay||fr.img){const n0=wfNote(x.note),pay=fr.pay?f.rp.info.pay:n0.pay,img=fr.img?f.rp.info.img:n0.img;p.note=(wfStrip(x.note)+(pay?'\n付款方式：'+pay:'')+(img?'\n圖片：'+img:'')).trim();old.note=x.note||''}
 if(!Object.keys(p).length){toast('沒有新的資料可存');return}
 closeThen(()=>lw(id,'wish',p,'存到這張卡了',{patch:old}))};
WRITE.push('wishfind','wfsave');
window.__zlWF={parse:wfParse};
/* ---------- v77（2026-11-23）：老大面板意見 msg 143 ----------
   1「這邊多一個分類是劇本」：案子房間分類多「劇本」。案名或說明有劇本、編劇、分場、腳本、影集、長片的自動歸進來；編輯案子可以勾「歸到劇本」（說明第一行寫［劇本］，不加資料庫欄位）。
   2「卡片裡的每一個步驟，我也要都可以編輯」：步驟卡每一步多「狀態」（還沒開始、正在做、做完、跳過、卡住），案子詳情頁的按鈕改叫「編輯每一步」，階段打開也有同一顆。 */
const SCRIPT_RE=/劇本|編劇|分場|腳本|影集|長片/,SCRIPT_MK=/^［劇本］\n?/m;
const isScript=p=>{const c=p.raw||{};return SCRIPT_RE.test([p.title,p.short,c.title,c.shortTitle].join(' '))||SCRIPT_MK.test(String(c.why||''))};
{const _zp=zoneProj;zoneProj=function(){const s=S.sub.proj,n=E()?0:DB.proj.filter(isScript).length,btn=on=>`<button aria-pressed="${on}" data-act="sub" data-id="proj:script">劇本 ${n}</button>`;
 const segRe=/(<div class="seg" role="group" aria-label="案子分類">[\s\S]*?)(<\/div>)/;
 if(s!=='script')return _zp().replace(segRe,(x,a,b)=>a+btn(false)+b);
 const all=DB.proj;DB.proj=all.filter(isScript);S.sub.proj='proj';let h;try{h=_zp()}finally{DB.proj=all;S.sub.proj='script'}
 h=h.replace(segRe,(x,a,b)=>a.replace(/aria-pressed="true"/g,'aria-pressed="false"')+btn(true)+b);
 if(!n)h=h.replace(/<div class="addtop">/,`<div class="card" style="margin-top:12px"><p>還沒有劇本案。案名有「劇本、編劇、分場、腳本」會自動放進來，也可以在案子的「✎ 編輯」勾「歸到劇本」。</p></div><div class="addtop">`);
 return h}}
// 編輯案子：歸到劇本
{const _s=sheetHTML;sheetHTML=function(){const h=_s();if(!/^pedit:/.test(S.sheet||''))return h;const id=S.sheet.slice(6),p=DB.proj.find(x=>x.id===id);if(!p)return h;
 const on=SCRIPT_MK.test(String((p.raw||{}).why||''))||isScript(p);
 const box=`<label class="f fchk"><input type="checkbox" id="peScript"${on?' checked':''}> 歸到劇本分類</label>`;
 return h.replace(/(<label class="f">說明)/,box+'$1').replace(/(id="peWhy"[^>]*>)([\s\S]*?)(<\/textarea>)/,(m,a,t,b)=>a+t.replace(/^［劇本］\n?/,'')+b)}}
{const _ps=ACT.pesave;ACT.pesave=function(id){const cb=document.getElementById('peScript'),w=document.getElementById('peWhy');
 if(cb&&w){const t=w.value.replace(/^［劇本］\n?/,'');const p=DB.proj.find(x=>x.id===id),auto=p&&SCRIPT_RE.test([p.title,p.short].join(' '));
  w.value=(cb.checked&&!auto?'［劇本］\n':'')+t}
 return _ps.apply(this,arguments)}}
// 步驟卡：每一步可以改狀態
const STS=[['pending','還沒開始'],['current','正在做'],['done','做完'],['skipped','跳過'],['blocked','卡住']];
const stSel=v=>`<label class="f">狀態<select class="st-status">${STS.map(([k,l])=>`<option value="${k}"${k===v?' selected':''}>${l}</option>`).join('')}</select></label>`;
{const _s=sheetHTML;sheetHTML=function(){const h=_s();if(!/^stepx:/.test(S.sheet||''))return h;
 return h.replace(/(<div class="strow" data-st="\d+" data-status="([^"]*)">[\s\S]*?<input class="st-name"[^>]*><\/label>)/g,(m,a,st)=>a+stSel(st||'pending'))}}
{const _a=ACT.stadd;ACT.stadd=function(){_a.apply(this,arguments);const r=document.querySelector('#stRows .strow:last-child');if(r&&!r.querySelector('.st-status')){const l=r.querySelector('.st-name');if(l)l.closest('label').insertAdjacentHTML('afterend',stSel('pending'))}}}
document.addEventListener('change',e=>{const t=e.target;if(t&&t.classList&&t.classList.contains('st-status')){const r=t.closest('.strow');if(r)r.dataset.status=t.value}});
{const _p=pageHTML;pageHTML=function(){const h=_p(),x=(S.page||'').split(':');if(x[0]!=='proj')return h;
 return h.replace(/🧩 步驟卡/,'🧩 編輯每一步').replace(/(<button[^>]*data-id="pd:[^"]*:step"[^>]*aria-expanded="true"[\s\S]*?<\/button>)/,`$1<div class="mrow">${mb('🧩 編輯每一步','sheet','stepx:'+x[1])}</div>`)}}
/* ---------- v78（2026-11-23）：編輯每一步、編輯案子可以請定定或大器規劃步驟 ----------
   老大原話：「編輯每一步的部分，編輯卡片的部分我希望定定 大器都可以選，幫忙規劃步驟」
   步驟卡與編輯案子頂端各兩顆（帶臉）：請定定規劃步驟、請大器規劃步驟。按了打開跟它的對話並送出規劃請求（老大按的才送）。
   它回了一行一步的清單，對話裡出現「套用成步驟卡」，老大按了才寫入，可復原。 */
const STEPQ=t=>`幫我把「${t}」規劃成步驟卡。一行一步，格式：步驟｜建議模型（Opus 5.5、Fable 5.2、Codex、AGY、Grok 擇一，不用就寫不指定）｜監工本身或開子視窗｜技能（沒有就空白）。最後一行列出哪裡要我決定。`;
const stTitle=id=>{const t=todoOf(id);return t?(t.title||(t.raw&&t.raw.title)||''):''};
const stPlanRow=id=>`<div class="mrow stplanr">${mb(bm('din')+'請定定規劃步驟','stplan','din|'+id)}${mb(bm('daqi')+'請大器規劃步驟','stplan','daqi|'+id)}</div>`;
{const _s=sheetHTML;sheetHTML=function(){const h=_s(),a=(S.sheet||'').split(':');
 if(a[0]==='stepx'){const id=S.sheet.slice(6);return h.replace(/(<p class="note">一步一張卡[\s\S]*?<\/p>)/,'$1'+stPlanRow(id))}
 if(a[0]==='pedit'){const id=S.sheet.slice(6);return h.replace(/(<label class="f">案名)/,`<p class="h4">步驟</p>${stPlanRow(id)}<div class="mrow">${mb('🧩 自己編每一步','sheet','stepx:'+id)}</div>$1`)}
 return h}}
ACT.stplan=v=>{const [b,id]=v.split('|'),t=stTitle(id);if(!t)return;const ctx='proj:'+id;
 closeThen(()=>openChat(b,ctx,null,()=>say(b,STEPQ(t),ctx)))};
// 解析它回的清單
function parseSteps(txt){const out=[];String(txt||'').split('\n').forEach(l=>{const m=l.match(/^\s*(?:\d+\s*[.、)）:：]|[①-⑳]|[-・•*])\s*(.+)$/);if(!m)return;
 const p=m[1].split(/[｜|]/).map(s=>s.replace(/\*\*/g,'').trim());const name=p[0].replace(/[：:]\s*$/,'');if(!name||/要我決定|需要你決定/.test(name))return;
 const mt=(p[1]||'')+' ',model=/fable/i.test(mt)?'Fable 5.2':/opus/i.test(mt)?'Opus 5.5':/codex/i.test(mt)?'Codex':/agy|gemini/i.test(mt)?'AGY':/grok/i.test(mt)?'Grok':'不指定';
 const mode=/子視窗/.test(p[2]||'')?'開子視窗':'監工本身',sk=(p[3]||'').toLowerCase(),skill=SSKILL.find(x=>sk.includes(x))||'';
 out.push({name:name.slice(0,80),model,mode,skill,note:'',status:'pending'})});return out.slice(0,30)}
const lastPlan=b=>{const a=(CH[b]||[]).filter(m=>realBot(b,m));for(let i=a.length-1;i>=0;i--){const s=parseSteps(a[i].t);if(s.length>=2)return s}return null};
{const _l=logSync;logSync=function(){_l();const on=S.chat,l=$('#clog');if(!on||!l||(on.b!=='din'&&on.b!=='daqi'))return;
 const a=(on.ctx||'').split(':');if(a[0]!=='proj'||!todoOf(a[1]))return;const st=lastPlan(on.b);if(!st)return;
 l.insertAdjacentHTML('beforeend',`<div class="cm bot card jplan"><p class="note">${NAMES[on.b]}排了 ${st.length} 步。套用後會換掉這張卡現在的步驟，可以復原。</p><div class="btns">${B('🧩 套用成步驟卡（'+st.length+' 步）','stapply',on.b+'|'+a[1],'pri wide')}</div></div>`);l.scrollTop=l.scrollHeight}}
ACT.stapply=async v=>{const [b,id]=v.split('|'),it=todoOf(id),c=it&&it.raw,st=lastPlan(b);if(!c||!st)return;
 if(!LV.api||!LV.api.act){toast('離線中，連上再套用');return}
 const old=(c.progressSteps||[]).map(s=>({name:s.name,status:s.status,note:s.note||''})),body=st.map(s=>({name:s.name,status:s.status,note:stepNote(s)}));
 try{await LV.api.act(id,'steps',{steps:body});await reload();if(S.chat)back();setTimeout(()=>ACT.sheet('stepx:'+id),300);
  toast(`套用了 ${body.length} 步，可以再改`,async()=>{try{await LV.api.act(id,'steps',{steps:old});await reload();toast('還原了')}catch(e){toast('沒還原：'+LERR(e))}})}
 catch(e){toast('沒套用：'+LERR(e))}};
WRITE.push('stapply');
/* ---------- v79（2026-11-23）：老大面板意見 msg 166（4 則） ----------
   1「這個也要有大器幫忙執行或者霸霸之類的執行（霸霸是設置類機器人）」→ 要你做的卡多「請大器代辦」「請霸霸設置」，送給大器（霸霸那件由大器櫃台轉）。
   2「沒報到我要點下去就有人會去想辦法讓他抱到」→ 燈號細節每支沒報到的多「請大器修」，上方「全部交給大器修」。
   3「這種計劃書，就不會有收款啥的，應該是投標，過審等等之類的那種提示跟步驟」→ 企劃書、標案類案子不顯示收款，改「投標・審查」，可一鍵套投標步驟。
   4「每個步驟不能編輯或按確定或按刪除或按略過或之類的」→ 案子詳情頁最上面一張「步驟」，每一步都有 做完、略過、改、刪。 */
// 1 要你做：交給大器或霸霸
const ydTxt=j=>{const p=ydParse(j);return `「${ydFace(j)}」${p.steps.length?'：'+p.steps.join('；'):''}`};
{const _s=sheetHTML;sheetHTML=function(){const h=_s();const a=(S.sheet||'').split(':');if(a[0]!=='youdo')return h;const id=a.slice(1).join(':');
 const j=((LV.hub&&LV.hub.jobs)||[]).find(x=>x.id===id);if(!j||j.status!=='waiting_you')return h;
 const row=`<p class="h4">交給別人做</p><div class="ydmore">${B(bm('daqi')+'請大器代辦','ydhand','daqi|'+id)}${B(bm('baba')+'請霸霸設置','ydhand','baba|'+id)}</div>`;
 return h.replace(/(<p class="h4">還沒辦法做好？<\/p>)/,row+'$1')}}
ACT.ydhand=async v=>{const [w,id]=v.split('|'),j=((LV.hub&&LV.hub.jobs)||[]).find(x=>x.id===id);if(!j)return;
 const body=w==='baba'?`【請霸霸設置】${ydTxt(j)}。這是設置類的事，請大器轉給霸霸（call-baba.sh）做；要老大本人登入、付款、按同意的留下來在逐流問老大。`
  :`【請大器代辦】${ydTxt(j)}。老大請你能代就代；要老大本人登入、付款、按同意的留下來在逐流問老大。`;
 if(!LV.api||!LV.api.say){toast('離線中，連上再送');return}
 try{await LV.api.say(null,body,'daqi');toast(w==='baba'?'交給霸霸了（大器轉），進度回在「跟大器說」':'交給大器了，進度回在「跟大器說」')}catch(e){toast('沒送出：'+LERR(e))}};
// 2 燈號沒報到：請大器修
const beatAsk=bs=>`【燈號沒報到，請修】${bs.map(b=>`${b.name}（${b.note||''}，最後報到 ${b.ago||'不明'}）`).join('；')}。請查原因、讓它恢復報到，修好在這裡回一句；要老大本人做的再問。`;
{const _s=sheetHTML;sheetHTML=function(){const h=_s();if(S.sheet!=='beats')return h;const late=(E()?[]:DB.beats).filter(b=>b.late);if(!late.length)return h;
 let k=0;const out=h.replace(/(<div class="rowi"><div class="rowb"><span class="tx"><b>)(▲ |● )([\s\S]*?<\/span><span class="rt">)/g,(m,a,mark,rest)=>{k++;
  return mark==='▲ '?m.replace('<span class="rt">',`<span class="rt">${mb(bm('daqi')+'請大器修','beatfix',String(k-1))}`):m});
 return out.replace(/(<div class="rows" style="margin-top:12px">)/,`<div class="btns">${B(bm('daqi')+'全部交給大器修（'+late.length+' 支）','beatfix','all','pri wide')}</div>$1`)}}
ACT.beatfix=async v=>{const all=E()?[]:DB.beats,bs=v==='all'?all.filter(b=>b.late):[all[+v]].filter(Boolean);if(!bs.length)return;
 if(!LV.api||!LV.api.say){toast('離線中，連上再送');return}
 try{await LV.api.say(null,beatAsk(bs),'daqi');toast(`交給大器修 ${bs.length} 支，修好回在「跟大器說」`)}catch(e){toast('沒送出：'+LERR(e))}};
// 3 企劃書、標案類：不顯示收款，改投標・審查
const BID_RE=/企劃書|企畫書|計畫書|計劃書|標案|投標|服務建議書|評選|審查|提案/;
const isBid=p=>{const c=p.raw||{};return BID_RE.test([p.title,p.short,c.title,c.shortTitle].join(' '))&&c.quoteAmount==null};
const BID_STEPS=['準備送件資料','送件','資格審查','評選簡報','等決標','簽約'];
{const _pc=projCard;projCard=function(p){let h=_pc(p);if(!isBid(p))return h;return h.replace(/沒寫金額/g,'投標・審查')}}
{const _p=pageHTML;pageHTML=function(){let h=_p();const x=(S.page||'').split(':');if(x[0]!=='proj')return h;const p=DB.proj.find(q=>q.id===x[1]);if(!p||!isBid(p))return h;
 h=h.replace(/報價與收款/g,'投標與審查').replace(/沒寫金額/g,'投標案，不用收款欄');
 return h}}
ACT.bidsteps=async id=>{const it=todoOf(id),c=it&&it.raw;if(!c||!LV.api||!LV.api.act)return;const old=(c.progressSteps||[]).map(s=>({name:s.name,status:s.status,note:s.note||''}));
 try{await LV.api.act(id,'steps',{steps:BID_STEPS.map((n,i)=>({name:n,status:i?'pending':'current',note:''}))});await reload();paint('keep');
  toast('套上投標步驟了',async()=>{try{await LV.api.act(id,'steps',{steps:old});await reload();paint('keep');toast('還原了')}catch(e){toast('沒還原：'+LERR(e))}})}catch(e){toast('沒套上：'+LERR(e))}};
// 4 案子詳情：每一步 做完、略過、改、刪
const STL={done:'做完',current:'正在做',pending:'還沒',skipped:'略過',blocked:'卡住'};
{const _p=pageHTML;pageHTML=function(){const h=_p();const x=(S.page||'').split(':');if(x[0]!=='proj')return h;const p=DB.proj.find(q=>q.id===x[1]);if(!p||!p.raw||!p.raw.id)return h;
 const st=p.raw.progressSteps||[];
 const rows=st.map((s,i)=>`<li class="pstr" data-s="${esc(s.status)}"><div class="pstn"><span class="chip${s.status==='current'||s.status==='blocked'?' urg':''}">${STL[s.status]||s.status}</span><b>${esc(s.name)}</b></div><div class="pstb">${s.status!=='done'?mb('✓ 做完','pst',p.id+'|'+i+'|done'):mb('↺ 還沒','pst',p.id+'|'+i+'|pending')}${s.status!=='skipped'?mb('略過','pst',p.id+'|'+i+'|skipped'):''}${mb('✎ 改','pst',p.id+'|'+i+'|edit')}${mb('刪','pst',p.id+'|'+i+'|del')}</div></li>`).join('');
 const sec=`<section class="sec pstep"><h3>步驟</h3>${st.length?`<ol class="pstl">${rows}</ol>`:isBid(p)?`<div class="card bidtip"><p><b>這是投標案</b>：步驟通常是 ${BID_STEPS.join('→')}。</p><div class="btns">${B('套用投標步驟','bidsteps',p.id,'pri')}</div></div>`:'<p class="note">還沒有步驟。</p>'}<div class="mrow">${mb('＋ 加一步','pst',p.id+'|-1|add')}${mb('🧩 編輯每一步','sheet','stepx:'+p.id)}</div></section>`;
 const i=h.indexOf('<p class="h4">詳情</p>');if(i>-1)return h.slice(0,i)+sec+h.slice(i);
 const k0=h.search(/<h[23][^>]*>詳情<\/h[23]>/),k=k0>-1?h.lastIndexOf('<section',k0):-1;return k>-1?h.slice(0,k)+sec+h.slice(k):h+sec}}
ACT.pst=async v=>{const [id,si,op]=v.split('|'),i=+si,it=todoOf(id),c=it&&it.raw;if(!c)return;
 if(op==='edit'||op==='add'){if(op==='add'){S.stAdd=1}ACT.sheet('stepx:'+id);if(op==='add')setTimeout(()=>ACT.stadd(),350);return}
 if(!LV.api||!LV.api.act){toast('離線中，連上再改');return}
 const old=(c.progressSteps||[]).map(s=>({name:s.name,status:s.status,note:s.note||''}));let nw=old.map(s=>({...s}));const nm=(old[i]||{}).name||'';
 if(op==='del')nw.splice(i,1);else{nw[i].status=op;if(op==='done'||op==='skipped'){const n=nw.findIndex((s,k)=>k>i&&s.status==='pending');if(n>-1&&!nw.some(s=>s.status==='current'))nw[n].status='current'}}
 try{await LV.api.act(id,'steps',{steps:nw});await reload();paint('keep');
  toast(op==='del'?`刪掉「${clip(nm,14)}」`:op==='done'?`「${clip(nm,14)}」做完了`:op==='skipped'?`略過「${clip(nm,14)}」`:'改回還沒做',async()=>{try{await LV.api.act(id,'steps',{steps:old});await reload();paint('keep');toast('還原了')}catch(e){toast('沒還原：'+LERR(e))}})}
 catch(e){toast('沒改到：'+LERR(e))}};
WRITE.push('pst','bidsteps','ydhand','beatfix');
/* ---------- v81（2026-11-23）：霸霸用霸霸的臉；首頁「要你做」列也能直接交大器或霸霸 ----------
   老大原話：「霸霸要用霸霸的頭像啊 跟動態」「啥鬼，只有我做好了的按鈕，沒有大器處理嗎 或者霸霸處裡」 */
{const _y=ydSec;ydSec=function(){const h=_y();if(!h)return h;
 return h.replace(/(<div class="rowi" data-card="([^"]*)"><div class="rowb">[\s\S]*?<span class="rt">)/g,(m,a,id)=>a+`<button class="ydface" data-act="ydhand" data-id="daqi|${id}" aria-label="請大器代辦">${bm('daqi')}</button><button class="ydface" data-act="ydhand" data-id="baba|${id}" aria-label="請霸霸設置">${bm('baba')}</button>`)}}
/* ---------- v82（2026-11-23）：老大面板意見 msg 203、207、210 ----------
   「封存放最後面」→ 案子房間分類順序：案子、交辦、公司、劇本、封存。
   「我新增案子還沒更新完頁面好像就更新導致我打的內容消失」「新增案子卻沒有出現」→ 背景更新重畫時，彈出卡與詳情頁裡打到一半的字、勾選、游標都保留（原因：重畫把表單清空，送出時案名是空的，所以沒建出來）。
   「點進卡片之後大器跟定定的位置分配很怪，可以接近吧」→ 案子詳情頁大器和定定的臉放在同一排。 */
{const _zp=zoneProj;zoneProj=function(){const h=_zp();return h.replace(/(<div class="seg" role="group" aria-label="案子分類">)([\s\S]*?)(<\/div>)/,(m,a,b,c)=>{
 const arch=(b.match(/<button[^>]*data-id="proj:arch"[^>]*>[\s\S]*?<\/button>/)||[''])[0];return arch?a+b.replace(arch,'')+arch+c:m})}}
// 重畫時保留表單
{const keyOf=()=>(S.sheet||'')+'#'+(S.page||'');
 const snap=()=>{const out={k:keyOf(),f:[],act:null};['#sheet','#page'].forEach(sel=>{const box=$(sel);if(!box||box.hidden)return;
  box.querySelectorAll('input,textarea,select').forEach((e,i)=>{if(e.type==='hidden'||e.type==='button')return;out.f.push({sel,i,id:e.id,v:e.value,c:e.checked,def:e.type==='checkbox'||e.type==='radio'?e.defaultChecked===e.checked:e.defaultValue===e.value})});
  const a=document.activeElement;if(a&&box.contains(a)&&/^(INPUT|TEXTAREA)$/.test(a.tagName)){const all=[...box.querySelectorAll('input,textarea,select')];out.act={sel,i:all.indexOf(a),s:a.selectionStart,e:a.selectionEnd}}});return out};
 const back=o=>{if(!o||o.k!==keyOf())return;o.f.forEach(x=>{if(x.def)return;const box=$(x.sel);if(!box)return;const e=x.id?box.querySelector('#'+CSS.escape(x.id)):box.querySelectorAll('input,textarea,select')[x.i];
   if(!e)return;if(e.type==='checkbox'||e.type==='radio')e.checked=x.c;else e.value=x.v});
  if(o.act){const box=$(o.act.sel),e=box&&box.querySelectorAll('input,textarea,select')[o.act.i];if(e&&document.activeElement!==e){try{e.focus({preventScroll:true});if(o.act.s!=null)e.setSelectionRange(o.act.s,o.act.e)}catch(err){}}}};
 const _r=render;render=function(d){const o=snap();_r(d);back(o)}}
// 案子詳情：大器、定定放同一排
{const _p=pageHTML;pageHTML=function(){const h=_p();const x=(S.page||'').split(':');if(x[0]!=='proj')return h;
 return h.replace(/<div class="aifs([^"]*)">/,(m,c)=>`<div class="aifs${c} aifs2">${aiF('daqi','proj:'+x[1])}`)}}
/* ---------- v83（2026-11-23）：案子詳情每一步點開看詳情（msg 239） ----------
   老大原話：「點進去卡片每個步驟點開都可以看見視窗的內容進度詳情之類的」
   步驟名稱可以點開：這步的備註、用哪個模型、監工或子視窗、技能；正在做或卡住的那步，再加上執行狀態、哪個視窗在跑、進度說明、卡點、最後更新，與這張卡最近三則對話（點了才讀）。
   面板讀不到視窗裡的畫面，看得到的是視窗寫回卡片的進度與訊息。 */
const RUNST2={queued:'排隊中',running:'跑中',done:'跑完',failed:'卡住'};
const PSM={};
async function pstMsgs(id){if(PSM[id]&&Date.now()-PSM[id].t<60e3)return;PSM[id]={t:Date.now(),a:null};
 try{const ms=await LV.api.msgs(id,'daqi');PSM[id].a=(ms||[]).slice(-3)}catch(e){PSM[id].a=[];PSM[id].err=LERR(e)}if((S.page||'').indexOf(id)>-1)render('keep')}
function pstDetail(p,s,i){const c=p.raw||{},o=stepOf(s),tg=stepTags(o),live=s.status==='current'||s.status==='blocked';
 const kv=[['這步備註',o.note],['模型與方式',tg]];
 if(live){kv.push(['執行',RUNST2[c.runStatus]||'還沒送出執行'],['視窗',(String(c.runNote||'').match(/【[^】]+】[^\s，。]*/)||[''])[0]||c.runNote],['進度',c.progressNote],['卡在',c.progressBlocker],['最後更新',c.progressUpdatedAt?LAGO(c.progressUpdatedAt)+(c.progressUpdatedBy?'・'+c.progressUpdatedBy:''):''])}
 const rows=kv.filter(x=>x[1]).map(x=>`<div class="kv"><span>${esc(x[0])}</span><b>${esc(x[1])}</b></div>`).join('');
 let msg='';if(live){const m=PSM[p.id];if(!m)pstMsgs(p.id);msg=`<p class="h4">最近對話</p>`+(!m||m.a===null?'<p class="note">讀取中…</p>':m.a.length?`<ul class="tl">${m.a.map(x=>`<li>${esc((x.kind==='user'?'你：':'大器：')+String(x.body||'').replace(/^［[^］]*］\n?/,'').slice(0,140))}</li>`).join('')}</ul>`:'<p class="note">這張卡還沒有對話。</p>')+`<div class="mrow">${mb(bm('daqi')+'跟大器問這步','pstask',p.id+'|'+i)}</div>`}
 return `<div class="pstd">${rows||'<p class="note">這步還沒有更多資料。按「✎ 改」可以補備註、模型與技能。</p>'}${msg}</div>`}
{const _p=pageHTML;pageHTML=function(){let h=_p();const x=(S.page||'').split(':');if(x[0]!=='proj')return h;const p=DB.proj.find(q=>q.id===x[1]);if(!p||!p.raw)return h;
 const st=p.raw.progressSteps||[];let i=-1;
 return h.replace(/<li class="pstr" data-s="([^"]*)"><div class="pstn">([\s\S]*?)<\/div>/g,(m,s,inner)=>{i++;const k='pst:'+p.id+':'+i,op=!!S.open[k];
  return `<li class="pstr${op?' on':''}" data-s="${s}"><button class="pstn pstbtn" data-act="open" data-id="${esc(k)}" aria-expanded="${op}">${inner}<span class="chev" aria-hidden="true">${op?'⌃':'⌄'}</span></button>`+(op&&st[i]?pstDetail(p,st[i],i):'')})}}
ACT.pstask=v=>{const [id,i]=v.split('|'),p=DB.proj.find(q=>q.id===id),s=p&&p.raw&&(p.raw.progressSteps||[])[+i];if(!s)return;
 openChat('daqi','proj:'+id,null,()=>{const t=$('#cText');if(t){t.value=`第 ${+i+1} 步「${s.name}」現在做到哪？`;t.focus()}})};
/* ---------- v84（2026-11-23）：老大面板意見 msg 245、253（先做的部分） ----------
   245「編修按鈕在卡片點開之後沒辦法顯示，就改不到卡片裡面」→ 詳情頁、彈出卡打開時，右下角浮一顆「✎ 編修」，一樣能進編修模式。
   253「應該要是可以展延的內容而不是自己省略！」→ 清單的標題與小字不再用「…」截斷，整句顯示。
   順手修：「直男行不行導演版」被誤判成投標案（只看說明裡的「審查」），投標判斷改成只看案名。 */
{const fab=()=>{let f=$('#mkFab');const need=!!(S.page||S.sheet)&&!S.chat;
  if(!need){if(f)f.remove();return}
  if(!f){f=document.createElement('button');f.id='mkFab';f.type='button';f.className='mkfab';f.innerHTML='<span aria-hidden="true">✎</span><b>編修</b>';
   f.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const k=$('#mkBtn');if(k)k.click()},true);document.body.appendChild(f)}
  const on=document.documentElement.classList.contains('marking');f.setAttribute('aria-pressed',on?'true':'false');f.querySelector('b').textContent=on?'完成':'編修'};
 const _r=render;render=function(d){_r(d);fab()};new MutationObserver(fab).observe(document.documentElement,{attributes:true,attributeFilter:['class']})}
/* ---------- v85（2026-11-23）：案子詳情做成專案面板、交辦能轉案子或併進案子、工作屬於哪個案子 ----------
   老大原話：「點進去卡片會有一種專案面板設計的感覺 排版美麗 會有質感顏色 按鈕等等顯示進度或者檔案夾雲端連結的位置之類的」
   「交辦任務希望可以有轉變成工作或案子或合併到案件的步驟之類的。另外"工作"跟"交辦"跟"案子"可能要整合好。」
   定義：案子＝有交付物或客戶的事；交辦＝你交給 AI 的一件事（可轉成案子或併進案子）；工作＝AI 現在在 Mac 上跑的那一棒（屬於某個交辦或案子時標出來）。
   不動資料庫：轉案子＝workAdd＋cardEdit＋steps，併案子＝在案子步驟最後加一步，兩者都用 opp_drop 收掉原交辦（72 小時可救回，提示條可復原）。 */
const HTTPS_RE=/https:\/\/[^\s<>"'）)」』，。、]+/g;
const projSteps=p=>{const c=p.raw||{};if(c.progressSteps&&c.progressSteps.length)return c.progressSteps;return (p.steps||[]).map((n,i)=>({name:n,status:i<p.cur?'done':i===p.cur?'current':'pending'}))};
const projKind=p=>isScript(p)?['劇本','script']:isBid(p)?['投標','bid']:['一般','gen'];
function projPaths(p){const c=p.raw||{},out=[],seen={},add=(l,v)=>{v=String(v||'').trim();if(!v||/^[（(]/.test(v)||seen[v])return;seen[v]=1;out.push({l,p:v})};
 add('案子資料夾',c.folderPath);(c.links||[]).forEach(l=>{if(l.path)add(l.kind==='review'?'內審':l.kind==='pool'?'Pool':l.label||'資料夾',l.path)});return out}
function projLinks(p){const c=p.raw||{},out=[],seen={};
 (c.links||[]).forEach(l=>{if(l.url&&l.kind!=='pay'&&!seen[l.url]){seen[l.url]=1;out.push({u:l.url,l:l.label||(l.kind==='pool'?'Pool':l.kind==='review'?'內審':'連結')})}});
 String(c.why||'').replace(HTTPS_RE,u=>{u=u.replace(/[.,;]+$/,'');if(!seen[u]){seen[u]=1;let h='';try{h=new URL(u).hostname.replace(/^www\./,'')}catch(e){}out.push({u,l:h||'連結'})}return u});
 return out.slice(0,4)}
function projHero(p,h1){const c=p.raw||{},st=projSteps(p),tot=st.length,dn=st.filter(s=>s.status==='done'||s.status==='skipped').length,pct=tot?Math.round(dn/tot*100):0,
 cur=st.find(s=>s.status==='current'||s.status==='blocked')||st.find(s=>s.status==='pending'),kd=projKind(p),paths=projPaths(p),lk=projLinks(p),blk=st.some(s=>s.status==='blocked'),real=!!c.id,
 now=!tot?'還沒有步驟，按「編輯每一步」開始排':dn===tot?'每一步都做完了':(blk?'卡住：':'現在：')+cur.name;
 const seg=tot?`<div class="pcx-seg" role="img" aria-label="${dn} 步做完，共 ${tot} 步">${st.slice(0,30).map(s=>`<i data-s="${esc(s.status)}"></i>`).join('')}</div>`:`<div class="pcx-seg" aria-hidden="true"><i></i></div>`;
 const acts=[paths.length?B('📁 複製位置','pcxcopy',p.id+'|0','pcx-b'):'',...lk.map(l=>`<a class="btn pcx-b" href="${esc(l.u)}" target="_blank" rel="noopener noreferrer">☁ ${esc(clip(l.l,16))}</a>`),
  B(bm('daqi')+'跟大器說','ai','daqi|proj:'+p.id+'||','pcx-b'),real?B('🧩 編輯每一步','sheet','stepx:'+p.id,'pcx-b'):''].filter(Boolean).join('');
 const pth=paths.length?`<div class="pcx-paths">${paths.map((q,i)=>`<div><small>${esc(q.l)}</small><span>${esc(q.p)}</span></div>`).join('')}</div>`:`<p class="pcx-none">${real?'還沒有資料夾位置，也沒有雲端連結。':'這是示意案，沒有資料夾位置。'}</p>`;
 return `<section class="pcx" data-k="${kd[1]}" aria-label="專案面板"><div class="pcx-main"><div class="pcx-top"><span class="pcx-kind">${kd[0]}</span>${chip(p.due,p.urg)}</div>${h1}
 <div class="pcx-prog"><div class="pcx-num"><b>${pct}%</b><span>${tot?dn+' / '+tot+' 步':'0 步'}</span></div>${seg}<p class="pcx-now${blk?' blk':''}">${esc(now)}</p></div></div>
 <div class="pcx-side"><div class="pcx-act">${acts}</div>${pth}</div></section>`}
{const _p=pageHTML;pageHTML=function(){const h=_p(),x=(S.page||'').split(':');if(x[0]!=='proj')return h;const p=DB.proj.find(q=>q.id===x[1]);if(!p)return h;
 return h.replace(/<h1 class="pt">[\s\S]*?<\/h1>/,m=>projHero(p,m))}}
ACT.pcxcopy=v=>{const [id,i]=v.split('|'),p=DB.proj.find(q=>q.id===id),q=p&&projPaths(p)[+i];if(!q)return;
 const ok=()=>toast('位置複製好了，回電腦貼到「前往資料夾」');try{navigator.clipboard.writeText(q.p).then(ok,()=>toast('複製被擋住了，請長按路徑自己選取'))}catch(e){toast('複製被擋住了，請長按路徑自己選取')}};
// 交辦詳情：轉成案子、併到案子
{const _s=sheetHTML;sheetHTML=function(){const h=_s(),a=(S.sheet||'').split(':');
 if(a[0]==='cview'&&a[1]==='todo'){const t=DB.todo.find(q=>q.id===a[2]);if(!t)return h;
  return h+`<section class="sec"><h3>這件接下來</h3><p class="note">任務＝你要做的一件事。有交付物，升成案子；本來就是某個案子的一步，併進去；AI 做得完就交給 AI。原交辦會收掉，72 小時內可救回。</p><div class="btns">${B('轉成案子','jtoproj',t.id,'pri')}${B('併到案子','sheet','jmerge:'+t.id)}</div></section>`}
 if(a[0]==='hjob'){const j=jobs().find(q=>q.id===a.slice(1).join(':')),o=j&&jobOwner(j);
  return o?h+`<div class="mrow">${mb('屬於〈'+esc(clip(o.name,18))+'〉 ›',o.k==='proj'?'page':'sheet',o.k==='proj'?'proj:'+o.id:'cview:todo:'+o.id)}</div>`:h}
 if(a[0]==='jmerge'){const id=a[1],t=DB.todo.find(q=>q.id===id);if(!t)return shHead('這件交辦不在了');
  const L=DB.proj.filter(p=>p.raw&&p.raw.id&&['doing','delivered'].includes(p.raw.status));
  return shHead('併到哪個案子')+`<p class="note">「${esc(clip(t.title,30))}」會加在那個案子的最後一步（還沒做）。</p>`+(L.length?`<div class="rows">${L.map(p=>`<div class="rowi"><button class="rowb" data-act="jmergeto" data-id="${esc(id+'|'+p.id)}" style="min-height:52px"><span class="tx"><b>${esc(p.title)}</b><small>${esc(projSteps(p).length+' 步・'+(p.due||''))}</small></span><span class="rt"><span class="chev" aria-hidden="true">›</span></span></button></div>`).join('')}</div>`:`<div class="card"><p>目前沒有進行中的案子可以併。先用「轉成案子」。</p></div>`)}
 return h}}
const jSnap=c=>(c.progressSteps||[]).map(s=>({name:s.name,status:s.status,note:s.note||''}));
async function jDrop(id){await LV.api.act(id,'deleted')}
async function jRestore(id){await LV.api.act(id,'restore')}
ACT.jtoproj=id=>{const t=DB.todo.find(q=>q.id===id),c=t&&t.raw;if(!c||!LV.api||!LV.api.workAdd){toast('離線中，連上再轉');return}
 closeThen(async()=>{let n=null;try{n=await LV.api.workAdd(String(c.title||'新案子').slice(0,120));if(!n||!n.id)throw new Error('案子沒建起來');
  const why=WHYOF(c).trim();if(why&&LV.api.cardEdit)await LV.api.cardEdit(n.id,{why});
  const stp=jSnap(c);if(stp.length)await LV.api.act(n.id,'steps',{steps:stp})}
  catch(e){toast('沒轉成：'+LERR(e));await reload();return}
  let dropped=true;try{await jDrop(id)}catch(e){dropped=false;toast('案子建好了，但原交辦沒收掉（'+LERR(e)+'），請到交辦的「⋯」刪掉')}
  await reload();if(DB.proj.find(q=>q.id===n.id))setTimeout(()=>ACT.page('proj:'+n.id),150);
  if(dropped)toast('轉成案子了，原交辦收掉',async()=>{try{await jDrop(n.id);await jRestore(id);await reload();toast('還原了')}catch(e){toast('沒還原：'+LERR(e))}})})};
ACT.jmergeto=v=>{const [tid,pid]=v.split('|'),t=DB.todo.find(q=>q.id===tid),c=t&&t.raw,p=DB.proj.find(q=>q.id===pid),pc=p&&p.raw;if(!c||!pc||!LV.api||!LV.api.act){toast('離線中，連上再併');return}
 closeThen(async()=>{const old=jSnap(pc),nw=old.concat([{name:String(c.title||'交辦').slice(0,80),status:'pending',note:clip(WHYOF(c),90)}]).slice(0,30);
  try{await LV.api.act(pid,'steps',{steps:nw})}catch(e){toast('沒併進去：'+LERR(e));await reload();return}
  let dropped=true;try{await jDrop(tid)}catch(e){dropped=false;toast('已加成步驟，但原交辦沒收掉（'+LERR(e)+'），請到交辦的「⋯」刪掉')}
  await reload();setTimeout(()=>ACT.page('proj:'+pid),150);
  if(dropped)toast('併進「'+clip(p.title,14)+'」當最後一步',async()=>{try{await LV.api.act(pid,'steps',{steps:old});await jRestore(tid);await reload();toast('還原了')}catch(e){toast('沒還原：'+LERR(e))}})})};
WRITE.push('jtoproj','jmergeto');
// 工作屬於哪個交辦或案子
const normT=s=>String(s||'').replace(/[（(][^）)]*[）)]/g,'').replace(/\s+/g,'').toLowerCase();
function jobOwner(j){const r=j.raw||{},pj=normT(r.project),tt=normT(j.title||r.title);
 const L=DB.proj.filter(p=>p.raw&&p.raw.id).map(p=>({k:'proj',id:p.id,name:p.title,keys:[p.title,p.short]})).concat(DB.todo.map(t=>({k:'todo',id:t.id,name:t.title,keys:[t.title]})));
 for(const o of L)for(const k of o.keys){const n=normT(k);if(n.length<3)continue;if(pj&&(pj===n||(pj.length>=3&&(pj.includes(n)||n.includes(pj)))))return o;if(tt&&n.length>=4&&tt.includes(n))return o}
 return null}
{const _j=jobList;jobList=function(){const h=_j();if(E())return h;const js=jobs();if(!js.length)return h;
 return h.split('<div class="rowi" data-card="').map((s,i)=>{if(!i)return s;const id=s.slice(0,s.indexOf('"')),j=js.find(q=>q.id===id);if(!j)return s;const o=jobOwner(j);
  const own=`<div class="jown">${chip('工作')}${o?`<span>屬於</span>${mb('〈'+esc(clip(o.name,18))+'〉 ›',o.k==='proj'?'page':'sheet',o.k==='proj'?'proj:'+o.id:'cview:todo:'+o.id)}`:'<span>獨立進行，沒對到案子或交辦</span>'}</div>`;
  return s.replace('</span></div></div>','</span></div>'+own+'</div>')}).join('<div class="rowi" data-card="')}}
{const _h=homeL2;homeL2=function(){const h=_h();if(E())return h;const k=h.indexOf('正在跑');if(k<0)return h;
 const a=h.indexOf('<div class="seg jseg"',k),b=h.indexOf('<div class="rows">',k),i=a>-1&&(b<0||a<b)?a:b;if(i<0)return h;
 return h.slice(0,i)+`<p class="note jdef"><b>案子</b>有交付物或客戶的事・<b>任務</b>你要做的一件事（自己收到的或交給 AI 的），可交給 AI 做、併進案子或升成案子・<b>工作</b>AI 現在在 Mac 上跑的那一棒</p>`+h.slice(i)}}
/* ---------- v86（2026-11-23）：監工驗 v85 後收重複 ----------
   詳情頁主卡已有「編輯每一步」，下面那排只留「✎ 編輯」；交辦詳情已有「步驟卡」清單，舊的「步驟」清單拿掉。 */
{const _p=pageHTML;pageHTML=function(){const h=_p();if(!/^proj:/.test(S.page||'')||h.indexOf('編輯每一步')===h.lastIndexOf('編輯每一步'))return h;
 return h.replace(/(<div class="mrow"><button class="mb" data-act="sheet" data-id="pedit:[^"]*">✎ 編輯<\/button>)<button class="mb" data-act="sheet" data-id="stepx:[^"]*">🧩 編輯每一步<\/button>/,'$1')}}
{const _s=sheetHTML;sheetHTML=function(){const h=_s();if(!/^cview:todo:/.test(S.sheet||'')||h.indexOf('步驟卡</p>')<0)return h;
 return h.replace(/<section class="sec"><h3>步驟<\/h3>[\s\S]*?<\/section>/,'')}}
/* ---------- v87（2026-11-23）：老大面板意見 msg 260、264、270 ----------
   260「我希望在哪裡或哪塊面板跟大器或者小頭像講話，他就是那邊專屬的小視窗，不要跳回統合的大視窗，這樣很亂。」
     → 從某張卡或某塊打開的對話，只顯示這張卡的那串：案子、機會卡本來就分開存；目標、拍板、想買、燈號這類沒有卡號的，改成只顯示提到這張卡的那幾則與它的回覆。從最上面頭像打開的才是總對話。
   264「希望點開任何ai對話都不會預設送訊息出去。」→ 所有「打開對話順便送一句」的按鈕，改成把那句先放進輸入框，你看過按「傳送」才送。
   270「霸霸是白色的」→ 霸霸改白身體、深色眼睛、淡描邊。 */
let PREFILL=0;
{const _s=say;say=function(b,text,ctx){if(!PREFILL)return _s.apply(this,arguments);
 const put=(n)=>{const t=$('#cText');if(t){t.value=String(text||'');t.focus();try{t.setSelectionRange(t.value.length,t.value.length)}catch(e){}t.dispatchEvent(new Event('input',{bubbles:true}))}else if(n<20)setTimeout(()=>put(n+1),80)};put(0)}}
{const _o=openChat;openChat=function(b,ctx,el,auto){
 if(LV.api&&LV.api.msgs&&!LV.api.__ctxWrap){const m=LV.api.msgs.bind(LV.api);LV.api.__ctxWrap=1;
  LV.api.msgs=async(id,bb)=>{const ms=await m(id,bb);const c=S.chat&&S.chat.ctx;if(id||!c)return ms;let nm='';try{nm=ctxName(c)}catch(e){}if(!nm)return ms;
   const out=[];let keep=false;(ms||[]).forEach(x=>{if(x.kind==='user')keep=String(x.body||'').indexOf(nm)>-1;if(keep)out.push(x)});return out}}
 if(typeof auto==='function'){const a=auto;auto=function(){PREFILL=1;try{return a.apply(this,arguments)}finally{PREFILL=0}}}
 return _o.call(this,b,ctx,el,auto)}}
/* ---------- v88（2026-11-23）：卡片打開時，上面那顆「編修」也按得到 ----------
   老大：「編修扭 卡片裡面按不到！」原因：彈出卡打開時上面那排被半透明遮罩蓋住，點「編修」其實點到遮罩，卡片就關了。
   改成：遮罩蓋著時，點在「編修」那顆的位置，一樣切換編修模式，卡片不關。 */
{const hit=e=>{if(!(S.sheet||S.page))return false;const k=$('#mkBtn');if(!k)return false;const r=k.getBoundingClientRect();if(!r.width)return false;
  const x=e.clientX,y=e.clientY;if(x==null)return false;if(x<r.left||x>r.right||y<r.top||y>r.bottom)return false;
  const t=document.elementFromPoint(x,y);return !(t&&(t===k||k.contains(t)))};
 ['pointerdown','mousedown','touchstart','pointerup','mouseup'].forEach(ev=>window.addEventListener(ev,e=>{const q=e.touches&&e.touches[0]||e;if(hit(q)){e.preventDefault&&ev!=='touchstart'&&e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}},{capture:true,passive:false}));
 window.__mkHit=hit}
/* ---------- v88b（2026-11-23）：交辦可以變工作、轉公司案子，大器先給建議 ----------
   老大：「然後交辦的內容也要有變成工作，或併入目前某案子的卡片的功能（要自己評估），我會有公司交派任務，那這樣歸去哪？」
   交辦詳情「這件接下來」改成：最上面一行大器的建議（依標題比對：像某個進行中的案子就建議併進去；提到公司、客戶就建議轉公司案子；有交付物就轉個人案子；其他交給 AI 做），下面四顆：交給 AI 做（變成工作）、併到案子、轉成案子、轉成公司案子。公司交派的任務＝轉成公司案子，在案子房間標「公司」。 */
const CO_RE=/公司|好咖|肉咖|客戶|業主|老闆|主管|報價|交片|巴西/,DELIV_RE=/剪|拍|企劃|提案|劇本|分鏡|交付|交件|影片|設計/;
function jSuggest(t){const ti=String(t.title||'');const L=DB.proj.filter(p=>p.raw&&p.raw.id&&['doing','delivered'].includes(p.raw.status));
 const m=L.map(p=>{const keys=[p.short,(p.raw&&p.raw.shortTitle)||'',String(p.title||'').split(/[\s｜|：:（(]/)[0]].filter(k=>k&&k.length>=2);return {p,hit:keys.some(k=>ti.includes(k))}}).find(x=>x.hit);
 if(m)return {k:'merge',p:m.p,why:`標題提到「${clip(m.p.short||m.p.title,12)}」，看起來是這個案子的一步`};
 if(CO_RE.test(ti))return {k:'co',why:'提到公司或客戶，歸成公司案子比較好追'};
 if(DELIV_RE.test(ti))return {k:'proj',why:'有交付物，轉成案子才看得到步驟和期限'};
 return {k:'run',why:'這件 AI 自己做得完，直接交給 AI 做，進度會回到這張卡'}}
{const _s=sheetHTML;sheetHTML=function(){const h=_s(),a=(S.sheet||'').split(':');if(a[0]!=='cview'||a[1]!=='todo')return h;const t=DB.todo.find(q=>q.id===a[2]);if(!t)return h;
 const g=jSuggest(t),lab={merge:'併到〈'+(g.p?clip(g.p.short||g.p.title,10):'')+'〉',co:'轉成公司案子',proj:'轉成案子',run:'交給 AI 做'}[g.k];
 const act={merge:['jmergeto',t.id+'|'+(g.p&&g.p.id)],co:['jtoco',t.id],proj:['jtoproj',t.id],run:['jtorun',t.id]}[g.k];
 const sec=`<section class="sec jnext"><h3>這件接下來</h3><div class="card jsug">${bm('daqi')}<div><p><b>大器建議：${esc(lab)}</b></p><p class="note">${esc(g.why)}</p></div></div><div class="btns">${B(esc(lab),act[0],act[1],'pri wide')}</div><div class="ydmore">${t.run?'':B('交給 AI 做（變成工作）','jtorun',t.id)}${B('併到案子','sheet','jmerge:'+t.id)}${B('轉成案子','jtoproj',t.id)}${B('轉成公司案子','jtoco',t.id)}</div><p class="note">公司交派的任務選「轉成公司案子」，放在案子房間、標「公司」。原交辦會收掉，72 小時內可救回。</p></section>`;
 return h.replace(/<section class="sec"><h3>這件接下來<\/h3>[\s\S]*?<\/section>/,sec)}}
ACT.jtorun=id=>{const t=DB.todo.find(q=>q.id===id);if(!t)return;if(t.run){toast('這件已經在跑了');return}closeThen(()=>projDo(id,'run',null,'交給 AI 做了：Mac 開視窗跑，進度回到這張卡'))};
ACT.jtoco=id=>{const t=DB.todo.find(q=>q.id===id),c=t&&t.raw;if(!c||!LV.api||!LV.api.workAdd){toast('離線中，連上再轉');return}
 closeThen(async()=>{let n=null;try{n=await LV.api.workAdd(String(c.title||'公司案子').slice(0,120),'company');if(!n||!n.id)throw new Error('案子沒建起來');
  const why=WHYOF(c).trim();if(why&&LV.api.cardEdit)await LV.api.cardEdit(n.id,{why});const stp=jSnap(c);if(stp.length)await LV.api.act(n.id,'steps',{steps:stp})}
  catch(e){toast('沒轉成：'+LERR(e));await reload();return}
  let dropped=true;try{await jDrop(id)}catch(e){dropped=false;toast('公司案子建好了，但原交辦沒收掉（'+LERR(e)+'），請到交辦的「⋯」刪掉')}
  await reload();if(DB.proj.find(q=>q.id===n.id))setTimeout(()=>ACT.page('proj:'+n.id),150);
  if(dropped)toast('轉成公司案子了，原交辦收掉',async()=>{try{await jDrop(n.id);await jRestore(id);await reload();toast('還原了')}catch(e){toast('沒還原：'+LERR(e))}})})};
WRITE.push('jtorun','jtoco');
/* ---------- v88c（2026-11-23）：「交辦」改叫「任務」 ----------
   老大：「我收到的內容很可能不一定跟公司有關，應該是說我收到的要做的類似待辦吧？還是任務？」→ 統一叫「任務」：你要做的一件事，自己收到的或交給 AI 的都算。
   畫面上的字統一換（資料與程式內部名稱不動）；公司交派的任務一樣是任務，要追交付物就升成案子，選公司。 */
const REN=s=>s.indexOf('交辦')<0?s:s.replace(/交辦/g,'任務');
function renameIn(root){if(!root)return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){if(n.nodeValue.indexOf('交辦')>-1)n.nodeValue=REN(n.nodeValue)}
 root.querySelectorAll('[placeholder*="交辦"],[aria-label*="交辦"]').forEach(e=>{['placeholder','aria-label'].forEach(a=>{const v=e.getAttribute(a);if(v)e.setAttribute(a,REN(v))})})}
{const _r=render;render=function(d){_r(d);['#view','#sheet','#page','#chat','#dock','#tabs'].forEach(q=>renameIn($(q)))}}
{const _t=toast;toast=function(m,fn){return _t(REN(String(m||'')),fn)}}
new MutationObserver(ms=>{ms.forEach(m=>m.addedNodes.forEach(x=>{if(x.nodeType===1)renameIn(x);else if(x.nodeType===3&&x.nodeValue.indexOf('交辦')>-1)x.nodeValue=REN(x.nodeValue)}))}).observe(document.getElementById('app'),{childList:true,subtree:true});
/* ---------- v89（2026-11-23）：案子卡跟著進度走、交了就退下（msg 283） ----------
   老大：「這邊我進度更新了畫面上面的標題描述卻沒變，而且今天要交的內容給了，但他還是掛在這邊很怪，應該要等後面日期公布才會跳上來」
   1 你最後改了步驟（進度由你更新），卡面那一句改成「現在這一步」，下面寫進度說明。
   2 期限到了但「送件、交件、送印、交付、提交」那步已做完：不再標「今天要交／已過期限」，改「已交・等下一步」，不排在最急，等有新日期再上來。 */
const SENT_RE=/送件|交件|送印|交付|交出|提交|上傳|寄出/;
{const _m=mapProj;mapProj=function(c){const x=_m(c),ps=c.progressSteps||[];if(!ps.length)return x;
 const ci=ps.findIndex(s=>s.status==='current'||s.status==='blocked'||s.status==='pending'),cs=ci>-1?ps[ci]:null;
 const met=ps.some((s,i)=>s.status==='done'&&SENT_RE.test(s.name)&&(ci<0||i<ci));
 const dl=c.deadline||(c.deliveryDate?Date.parse(c.deliveryDate):null),dd=LDAYS(dl);
 if(met&&dd!=null&&dd<=0&&c.status==='doing'){x.urg=false;x.due='已交・等下一步';if(x.g==='need'&&!c.progressBlocker&&c.runStatus!=='failed')x.g='doing'}
 if(cs&&c.progressUpdatedBy==='Borry'){x.ask='現在：'+cs.name;x.next=c.progressNote||x.next}
 return x}}
/* ---------- v90（2026-11-23）：任務可以自己按「做完了」（msg 290） ----------
   老大：「應該也要有我人工可以的已完成吧」→ 任務詳情最上面「✓ 做完了」，任務清單每張卡也有；收進封存，按「復原」救回。後端 opp_todo_done（遷移檔 20261123_逐流v90_任務做完.sql）。 */
ACT.tdone=id=>{const t=DB.todo.find(q=>q.id===id);if(!t||!LV.api||!LV.api.act){toast('離線中，連上再按');return}
 closeThen(async()=>{try{await LV.api.act(id,'tdone',{done:true});await reload();paint('keep');
  toast('「'+clip(t.title,16)+'」做完了，收進封存',async()=>{try{await LV.api.act(id,'tdone',{done:false});await reload();paint('keep');toast('救回來了')}catch(e){toast('沒救回：'+LERR(e))}})}
 catch(e){toast('沒標上：'+LERR(e))}})};
WRITE.push('tdone');
{const _s=sheetHTML;sheetHTML=function(){const h=_s(),a=(S.sheet||'').split(':');if(a[0]!=='cview'||a[1]!=='todo')return h;const id=a.slice(2).join(':');if(!DB.todo.find(q=>q.id===id))return h;
 return h.replace(/(<div class="grab"[^>]*><\/div><div class="shead">[\s\S]*?<\/div>)/,`$1<div class="btns">${B('✓ 做完了','tdone',id,'pri wide')}</div>`)}}
{const _zp=zoneProj;zoneProj=function(){const h=_zp();if(S.sub.proj!=='todo')return h;
 return h.replace(/(<article class="card cardx" data-card="([^"]*)"[\s\S]*?<div class="cf-l">)/g,(m,a,id)=>DB.todo.find(q=>q.id===id)?a+mb('✓ 做完了','tdone',id):m)}}
{const _ma=mapArch;mapArch=function(c){const x=_ma(c);if(c.basket==='todo'&&c.closeResult==='won')x.st='任務做完';return x}}
/* ---------- v91（2026-11-23）：修「轉成案子」跳狀態不對（msg 312） ----------
   原因：後端 opp_work_add 不准建「跟還沒收掉的卡同名」的案子，原任務本身就同名，所以被擋。
   改成：先收掉原任務、再建案子；建不起來就把原任務救回來。轉成公司案子同樣。 */
async function jOff(id){try{await jDrop(id);return 'drop'}catch(e){await LV.api.act(id,'tdone',{done:true});return 'done'}}
async function jBack(id,how){if(how==='done')await LV.api.act(id,'tdone',{done:false});else await jRestore(id)}
async function jConvert(id,basket){const t=DB.todo.find(q=>q.id===id),c=t&&t.raw;if(!c||!LV.api||!LV.api.workAdd){toast('離線中，連上再轉');return}
 closeThen(async()=>{let how='';try{how=await jOff(id)}catch(e){toast('沒轉成（收原任務失敗）：'+LERR(e));return}
  let n=null;try{n=await LV.api.workAdd(String(c.title||'新案子').slice(0,120),basket||undefined);if(!n||!n.id)throw new Error('案子沒建起來');
   const why=WHYOF(c).trim();if(why&&LV.api.cardEdit)await LV.api.cardEdit(n.id,{why});const stp=jSnap(c);if(stp.length)await LV.api.act(n.id,'steps',{steps:stp})}
  catch(e){try{if(!n)await jBack(id,how)}catch(e2){}toast('沒轉成：'+LERR(e)+'。原任務還在');await reload();paint('keep');return}
  await reload();paint('keep');if(DB.proj.find(q=>q.id===n.id))setTimeout(()=>ACT.page('proj:'+n.id),150);
  toast(basket==='company'?'轉成公司案子了，原任務收掉':'轉成案子了，原任務收掉',async()=>{try{await LV.api.act(n.id,'close',{result:'void'});await jBack(id,how);await reload();paint('keep');toast('還原了')}catch(e){toast('沒還原：'+LERR(e))}})})}
ACT.jtoproj=id=>jConvert(id,'');ACT.jtoco=id=>jConvert(id,'company');
/* ---------- v92（2026-11-24）：彈出卡改版、等你時往前推、步驟執行鈕、詳情卡片化、「要你看」說明 ----------
   老大原話（逐流 msg 297、302、315、319、322）：「這邊感覺就是要有個快速按鈕可以到達目的地處理或者接入面板處理，不是我要在那邊跑來跑去…並且文字排版的樣式，只要字多就會很難閱讀很辛苦」
   「顯示等你的時候，要有更積極能往下往前做的步驟或方法或引導或按鈕」「怎麼會沒有執行鈕讓對應的ai 去執行工作？」「這塊區域的排版精美一點視覺一點不要像工程文字」
   「要我看的定義是什麼？怎樣才能離開這裡？怎樣才能到這裡？」
   1 工作、做完、要你做、拍板後續的彈出卡：最上面一句大字「現在要做什麼」，下面一排動作鈕；內容分段條列；網址、本機路徑、工具、機器人、視窗名自動變按鈕（跟誰說＝打開對話只預填，不代送）。
   2 等你、卡住、等 Mac 的卡一定有往前推的鈕。3 案子步驟每步「▶ 執行這步」。4 詳情區改成卡片格。5 「要你看」加說明與每張卡為什麼在這裡。 */
const PC_TOOLS=[[/Notion/i,'Notion','https://www.notion.so/'],[/Higgsfield/i,'Higgsfield','https://higgsfield.ai/'],[/雲端硬碟|Google ?Drive|雲端/i,'雲端硬碟','https://drive.google.com/'],[/Gmail/i,'Gmail','https://mail.google.com/'],[/行事曆|Calendar/i,'行事曆','https://calendar.google.com/'],[/GitHub/i,'GitHub','https://github.com/']];
const PC_APPS=[[/Premiere/i,'Premiere'],[/DaVinci|達文西/i,'DaVinci'],[/ComfyUI/i,'ComfyUI'],[/Finder/i,'Finder']];
const PC_BOTS=[['jiji',/集集|Gig ?Gig/i],['tata',/塔塔/],['peng',/朋朋/],['mon',/萌萌/],['din',/定定/],['kim',/金金/]];
const PC_PATH=/(?:~|\/Users|\/Volumes)\/[^\s<>"'，。、；）)」』｜]+/g,PC_WIN=/【(?:監工|子|總控|機會雷達|櫃台|櫃檯)】[^\s，。、；｜|「」]{1,24}/g;
function pcBtns(txt,about,skip){txt=String(txt||'');const out=[],seen={},add=(k,h)=>{if(seen[k]||(skip&&skip===k))return;seen[k]=1;out.push(h)},a=String(about||'這件');
 (txt.match(HTTPS_RE)||[]).forEach(u=>{u=u.replace(/[.,;]+$/,'');let h='';try{h=new URL(u).hostname.replace(/^www\./,'')}catch(e){return}add(u,`<a class="btn pc-b" href="${esc(u)}" target="_blank" rel="noopener noreferrer">↗ ${esc(h)}</a>`)});
 PC_TOOLS.forEach(([re,l,u])=>{if(re.test(txt))add('t:'+l,`<a class="btn pc-b" href="${u}" target="_blank" rel="noopener noreferrer">↗ 開 ${l}</a>`)});
 (txt.match(PC_PATH)||[]).forEach(p=>{p=p.replace(/[.,;]+$/,'');const n=p.replace(/\/+$/,'').split('/').pop()||p;add(p,B('📁 複製「'+esc(n)+'」位置','pccopy',p,'pc-b'))});
 PC_APPS.forEach(([re,l])=>{if(re.test(txt))add('a:'+l,B('🖥 叫大器開 '+l,'pcsay',`daqi|請在 Mac 上開 ${l} 處理「${a}」：`,'pc-b'))});
 PC_BOTS.forEach(([b,re])=>{if(re.test(txt))add('b:'+b,B(bm(b)+'跟'+BOTS[b].name+'說','pcsay',`${b}|關於「${a}」：`,'pc-b'))});
 if(/霸霸/.test(txt))add('b:baba',B(bm('baba')+'請霸霸（大器轉）','pcsay',`daqi|請轉給霸霸：關於「${a}」，`,'pc-b'));
 (txt.match(PC_WIN)||[]).forEach(w=>add('w:'+w,B(bm('daqi')+'跟'+esc(w)+'說','pcsay',`daqi|請轉給${w}：關於「${a}」，`,'pc-b')));
 return out}
ACT.pcsay=v=>{const i=v.indexOf('|'),b=v.slice(0,i),t=v.slice(i+1),bb=BOTS[b]?b:'daqi';
 const go=()=>openChat(bb,'',null,()=>{const x=$('#cText');if(x){x.value=t;x.focus();try{x.setSelectionRange(t.length,t.length)}catch(e){}}});
 if(S.sheet)closeThen(()=>setTimeout(go,60));else go()};
ACT.pccopy=p=>{const ok=()=>toast('位置複製好了，回電腦貼到「前往資料夾」');try{navigator.clipboard.writeText(p).then(ok,()=>toast('複製被擋住了，請長按路徑自己選取'))}catch(e){toast('複製被擋住了，請長按路徑自己選取')}};
const pcLines=t=>{const out=[];String(t||'').replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean).forEach(l=>{if(l.length>56)l.replace(/([。；！？])/g,'$1\n').split(/\n|｜/).map(x=>x.trim()).filter(Boolean).forEach(x=>out.push(x));else l.split('｜').map(x=>x.trim()).filter(Boolean).forEach(x=>out.push(x))});
 return out.map(x=>x.replace(/^\s*(\d+[.、)）]|[①-⑩]|[-・•])\s*/,'')).filter(Boolean)};
const pcSec=(title,t,ol)=>{const ls=pcLines(t);if(!ls.length)return '';const tag=ol?'ol':'ul';
 return `<div class="pc-sec"><p class="pc-h">${title}</p>${ls.length===1?`<p class="pc-p">${esc(ls[0])}</p>`:`<${tag} class="pc-l">${ls.map(x=>`<li>${esc(x)}</li>`).join('')}</${tag}>`}</div>`};
function pcView(o){return shHead(esc(o.kick))+`<div class="pc">`
 +`<div class="pc-now${o.urg?' urg':''}"><p class="pc-k">現在要做什麼</p><p class="pc-big">${esc(o.now)}</p>${o.sub?`<p class="pc-sub">${esc(o.sub)}</p>`:''}<div class="pc-chips">${(o.chips||[]).filter(c=>c&&c[0]).map(c=>chip(c[0],c[1])).join('')}</div></div>`
 +(o.acts&&o.acts.length?`<div class="pc-acts">${o.acts.join('')}</div>`:'')+(o.extra||'')
 +(o.tools&&o.tools.length?`<div class="pc-sec"><p class="pc-h">一鍵到達</p><div class="pc-tools">${o.tools.join('')}</div></div>`:'')
 +(o.secs||[]).join('')+(o.more?`<details class="pc-more"><summary>更多細節</summary>${o.more}</details>`:'')
 +`<div class="mrow pc-edit">${(o.edit||[]).join('')}</div></div>`}
const PCK={waiting_you:'要你做',running:'AI 在做',queued:'排隊中',waiting_mac:'等 Mac',failed:'卡住了',done:'做完了'};
function pcJob(r,d){const id=String(r.id),st=r.status||'running',s=JST[st]||['進行中',0],p=ydParse(r),bot=LBOT(r.agent),bz=YD.busy?' disabled':'';
 const face=r.ask||askCut(String(r.title||'').replace(/^拍板後續｜/,''),40),Q=`「${face}」`;
 let now,sub='',acts=[],extra='',secs=[];
 if(st==='waiting_you'){now=face;sub=p.prog||'';
  const main=p.link?`<a class="btn pri pc-main" href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">↗ 打開連結</a>`:p.act?B(esc(p.actLabel),'ydrun',id,'pri pc-main',bz):B('✓ 我做好了','yddone',id,'pri pc-main',bz);
  acts=[main,p.link||p.act?B('✓ 我做好了','yddone',id,'',bz):'',B(bm('daqi')+'交給大器處理','ydhand','daqi|'+id),B('📅 改期','pcsay',`daqi|${Q}改到＿＿再做，原因：`),B('✕ 不做了','ydskip',id)].filter(Boolean);
  if(p.paste)extra=`<div class="pc-sec"><label class="f">${esc(p.paste)}<textarea id="ydPaste" rows="3" placeholder="貼在這裡"></textarea></label><div class="btns">${B(YD.busy?'送出中…':'送出','ydpaste',id,'pri wide',bz)}</div></div>`;
  extra+=`<div class="mrow pc-alt">${mb(bm('baba')+'請霸霸設置','ydhand','baba|'+id)}${mb('還沒好','ydnot',id)}${mb('加註記','ydnote',id)}${mb('問大器','ydq',id)}</div>`;
  secs.push(pcSec('怎麼做',p.steps.join('\n'),true))}
 else{if(st==='failed'){now='卡住了，選一個處理方式';acts=[B(bm('daqi')+'交給大器重跑','ydhand','daqi|'+id,'pri pc-main'),B('問怎麼了','pcsay',`${bot}|${Q}卡在哪？要我做什麼？`),B('我自己來','pcsay',`daqi|${Q}我自己處理，你先停。`),B('▣ 收起來','hshelf','job|'+id+'|archive')]}
  else if(st==='waiting_mac'){now='等 Mac 開機，開了會自動接著跑';acts=[B('請大器看 Mac','pcsay',`daqi|${Q}一直在等 Mac，幫我看 Mac 有沒有醒著。`,'pri pc-main'),B('問進度','pcsay',`${bot}|${Q}現在做到哪？`),B('改期','pcsay',`daqi|${Q}改到＿＿再做。`)]}
  else if(st==='done'){now='做完了'+(r.resultPath?'，成果在下面':'');acts=[r.resultPath?(/^https:\/\//.test(r.resultPath)?`<a class="btn pri pc-main" href="${esc(r.resultPath)}" target="_blank" rel="noopener noreferrer">↗ 打開成果</a>`:B('📁 複製成果位置','pccopy',r.resultPath,'pri pc-main')):'',B('問這件','pcsay',`${bot}|關於${Q}：`),B('接著做下一步','pcsay',`daqi|${Q}做完了，下一步請：`),B('▣ 收起來','hshelf','job|'+id+'|archive')].filter(Boolean)}
  else{now='不用你動，'+(r.agent||'大器')+'在做';acts=[B('問進度','pcsay',`${bot}|${Q}現在做到哪？`,'pri pc-main'),B('補一句','pcsay',`${bot}|關於${Q}，補充：`)]}
  sub=face;secs.push(pcSec('在做什麼',String(r.title||'').replace(/^拍板後續｜/,'')),pcSec('做到哪',[p.prog].concat(p.steps).filter(Boolean).join('\n')))}
 if(d)secs.unshift(pcSec('你拍板的問題',d.question));
 let own='';try{const jj=jobs().find(q=>q.id===id)||{raw:r,title:r.title},o=jobOwner(jj);if(o)own=`<div class="mrow">${mb('屬於〈'+esc(o.name)+'〉 ›',o.k==='proj'?'page':'sheet',o.k==='proj'?'proj:'+o.id:'cview:todo:'+o.id)}</div>`}catch(e){}
 const more=kvs([['誰',r.agent],['機器',r.machine],['案子',r.project],['更新',tstr(r.updatedAt)]])+(r.resultPath?`<p class="pc-path">${esc(r.resultPath)}</p>`:'')+own;
 return pcView({kick:(d?'拍板後續・':'')+(PCK[st]||'工作'),now,sub,urg:s[1],chips:[[s[0],s[1]],d?['你選：'+(d.answerLabel||'')]:null,[r.agent],[r.project],[LAGO(r.updatedAt)]],acts,extra,
  tools:pcBtns([r.title,r.note,r.resultPath].join('\n'),face,r.resultPath),secs,more,edit:[mb('✎ 改這張','sheet','hedit:job:'+id),mb('▣ 封存','hshelf','job|'+id+'|archive'),mb('🗑 刪掉','hshelf','job|'+id+'|delete')]})}
function pcEvt(r){const id=String(r.id),face=r.ask||askCut(r.summary,40),bot=LBOT(r.actor),Q=`「${face}」`,pth=r.path||'';
 return pcView({kick:'做完了',now:face,chips:[['做完',0],[r.actor],[r.project],[tstr(r.at)]],
  acts:[pth?(/^https:\/\//.test(pth)?`<a class="btn pri pc-main" href="${esc(pth)}" target="_blank" rel="noopener noreferrer">↗ 打開成果</a>`:B('📁 複製檔案位置','pccopy',pth,'pri pc-main')):'',B('問這件','pcsay',`${bot}|關於${Q}：`),B('接著做下一步','pcsay',`daqi|${Q}做完了，下一步請：`)].filter(Boolean),
  tools:pcBtns([r.summary,pth].join('\n'),face,pth),secs:[pcSec('做完了什麼',r.summary)],more:pth?`<p class="pc-path">${esc(pth)}</p>`:'',
  edit:[mb('✎ 改這張','sheet','hedit:event:'+id),mb('▣ 封存','hshelf','event|'+id+'|archive'),mb('🗑 刪掉','hshelf','event|'+id+'|delete')]})}
{const _s=sheetHTML;sheetHTML=function(){const a=(S.sheet||'').split(':'),t=a[0],id=a.slice(1).join(':');
 if(t==='hjob'||t==='youdo'){const r=hubRow('job',id)||((DB.jobs.find(x=>String(x.id)===id)||{}).raw);if(r)return pcJob(r)}
 if(t==='hevt'){const r=hubRow('event',id)||((DB.events.find(x=>String(x.id)===id)||{}).raw);if(r)return pcEvt(r)}
 if(t==='hdecf'){const d=((LV.hub&&LV.hub.answered)||[]).find(x=>x.id===id),j=d&&decJob(id);if(d&&j)return pcJob(j,d)}
 let h=_s();
 if(t==='dec'||t==='why'){const d=DB.dec.find(x=>x.id===a[1]);if(d){const rec=d.kind==='talk'?null:((d.opts||[]).find(o=>o.rec)||(d.opts||[])[0]);
  const tl=pcBtns([d.q,d.detail,d.projFull,d.link].join('\n'),askCut(d.ask||d.q,30));
  const nb=`<div class="pc pc-dec"><div class="pc-now"><p class="pc-k">現在要做什麼</p><p class="pc-big">${d.kind==='talk'?'只有你本人能做：照下面步驟辦':'選一個做法，按下去就交給大器'}</p>${rec?`<p class="pc-sub">大器推薦：${esc(rec.label)}</p>`:''}</div>${tl.length?`<div class="pc-sec"><p class="pc-h">一鍵到達</p><div class="pc-tools">${tl.join('')}</div></div>`:''}</div>`;
  h=h.replace(/(<div class="shead">[\s\S]*?<\/button><\/div>)/,'$1'+nb).replace('>✎ 編輯<','>✎ 改這張<')}}
 return h}}
// 3 案子步驟：每一步「▶ 執行這步」（走既有 opp_run；先在這張卡寫一則【只做這一步】，櫃台照這則只做那一步）
const PSR={};
{const _p=pageHTML;pageHTML=function(){const h=_p(),x=(S.page||'').split(':');if(x[0]!=='proj')return h;const p=DB.proj.find(q=>q.id===x[1]);if(!p||!p.raw||!p.raw.id)return h;
 const c=p.raw,st=c.progressSteps||[],busy=['running','queued'].includes(c.runStatus);let i=-1;
 return h.replace(/(<li class="pstr[^"]*" data-s="([^"]*)">[\s\S]*?<div class="pstb">)/g,(m,a,s)=>{i++;const k=p.id+'|'+i;
  if(s==='done'||s==='skipped')return m;
  if((busy&&(s==='current'||s==='blocked'))||(PSR[k]&&Date.now()-PSR[k]<15*60e3))return a+`<span class="chip urg pstrun-on">${busy&&(s==='current'||s==='blocked')?'跑中':'已送出'}</span>`;
  return a+`<button class="mb pstrun" data-act="pstrun" data-id="${esc(k)}">▶ 執行這步</button>`})}}
ACT.pstrun=async v=>{const [id,si]=v.split('|'),i=+si,p=DB.proj.find(q=>q.id===id),c=p&&p.raw,s=c&&(c.progressSteps||[])[i];if(!s)return;
 const k=id+'|'+i;if(PSR[k]&&Date.now()-PSR[k]<15*60e3){toast('這步剛送出過，Mac 在開視窗');return}
 if(['running','queued'].includes(c.runStatus)&&(s.status==='current'||s.status==='blocked')){toast('這步已經在跑了');return}
 if(!LV.api||!LV.api.act||!LV.api.say){toast('離線中，連上再送');return}
 const o=stepOf(s),body=`【只做這一步】第 ${i+1} 步：${o.name}。用 ${o.model==='不指定'?'預設模型':o.model}，${o.mode}${o.skill?'，技能 '+o.skill:''}。${o.note?'這步備註：'+o.note+'。':''}其他步驟不要動；做完把這步標做完，回報成果位置。`;
 PSR[k]=Date.now();render('keep');
 try{await LV.api.say(id,body,'daqi')}catch(e){delete PSR[k];render('keep');toast('沒送出：'+LERR(e));return}
 let ran=true;try{const nc=await LV.api.act(id,'run');if(nc){const j=LV.items.findIndex(q=>q.id===id);if(j>-1)LV.items[j]=nc}}catch(e){ran=false}
 LV.sig='';paint('keep');
 toast(ran?`送出第 ${i+1} 步。Mac 會開新視窗只做這步；開不了窗時，Claude App 側欄會出現開窗卡，點一下就開工`:`第 ${i+1} 步交給大器櫃台了，它會照這步開視窗；進度寫回這張卡`);setTimeout(()=>reload&&reload(),4e3)};
WRITE.push('pstrun');
// 4 詳情區：卡片格，圖示＋標題＋重點大字
const PDI={step:'🧭',date:'📅',money:'💰',team:'👥',file:'📁',hist:'🕘'};
{const _p=pageHTML;pageHTML=function(){let h=_p();if(!/^proj:/.test(S.page||''))return h;
 h=h.replace(/<section class="sec">(\s*)<div class="sh"><h2>詳情<\/h2><\/div>(\s*)<div class="rows">/,'<section class="sec pdx">$1<div class="sh"><h2>詳情</h2></div>$2<div class="rows pdgrid">');
 return h.replace(/(<button class="rowb" data-act="open" data-id="pd:[^"]*:([a-z]+)" aria-expanded="[a-z]+">)<span class="tx"><b>([\s\S]*?)<\/b><small>([\s\S]*?)<\/small><\/span>/g,(m,a,k,t,sm)=>
  `${a}<span class="pdic" aria-hidden="true">${PDI[k]||'•'}</span><span class="tx"><small class="pdt">${t}</small><b class="pdv">${sm.replace(/(NT\$ ?[\d,]+|剩 \d+ 天|\d+ 步做到第 \d+ 步)/g,'<em>$1</em>')}</b></span>`)}}
// 5 「要你看」：定義、怎麼進來、怎麼離開；每張卡寫為什麼在這裡
function needWhy(p){const c=p.raw||{},a=[];if(c.progressBlocker)a.push('卡在：'+c.progressBlocker);if(c.runStatus==='failed')a.push('AI 跑到一半失敗');
 const dl=c.deadline||(c.deliveryDate?Date.parse(c.deliveryDate):null),dd=c.id?LDAYS(dl):null;if(dd!=null&&dd<=3)a.push(dd<0?'已過期限':dd===0?'今天到期':dd+' 天內到期');else if(!c.id&&p.urg)a.push('3 天內到期');
 return a.join('・')||'有事要你看'}
{const _pc=projCard;projCard=function(p){const h=_pc(p);if(p.g!=='need')return h;return h.replace(/(<\/h3>)/,`$1<p class="ndwhy">▲ 在這裡因為：${esc(needWhy(p))}</p>`)}}
{const _zp=zoneProj;zoneProj=function(){const h=_zp();const i=h.indexOf('<h2>要你看<');if(i<0)return h;const e=h.indexOf('</h2>',i)+5,op=!!S.open.needhelp;
 const btn=`<button class="mb ndq" data-act="open" data-id="needhelp" aria-expanded="${op}">ⓘ 什麼會在這裡</button>`;
 const help=op?`<div class="card ndhelp fadein"><p><b>「要你看」</b>＝進行中的案子裡，現在需要你出手的那幾件。</p><p class="pc-h">什麼會進來</p><ul class="pc-l"><li>大器寫了卡點（卡在某件事）</li><li>AI 跑到一半失敗</li><li>期限剩 3 天內，還沒交</li></ul><p class="pc-h">怎麼離開</p><ul class="pc-l"><li>解掉卡點，或在步驟按「✓ 做完」</li><li>請 AI 重跑成功</li><li>改期限，或送件那步做完（會改成「已交・等下一步」）</li></ul><p class="note">每張卡上的「▲ 在這裡因為」寫出它被列進來的原因。</p></div>`:'';
 const j=h.indexOf('</div>',e);return j<0?h:h.slice(0,e)+btn+h.slice(e,j+6)+help+h.slice(j+6)}}
/* ---------- v93（2026-11-24）：步驟卡改卡片、@掛技能；執行狀態白話；立刻停止 ----------
   老大原話（逐流 msg 327 第 2 點）：「這邊的排版按鈕字體也很像工程文字，希望設計過視覺，然後步驟卡模型技能也是用卡片的感覺而不是工程器，模型可點選然後技能掛載不是用選的而是我能在卡片下方講任務內容時就 @技能（中英文都可以），然後卡片的上方就會有監工，子視窗，模型等級（絲滑流暢）」
   msg 330：「要可以立刻停止，然後我不知道去執行是用什麼去執行」　msg 335：「排隊是啥意思」
   1 步驟卡：一步一張卡，上方一排：監工／子視窗切換、模型、狀態；下方輸入框寫這步做什麼，打 @ 跳技能建議（中英文），選了變成技能小卡。存法照舊（note 開頭〔…〕，多個技能用「、」）。
     編輯中的內容放在 STD（草稿），背景重畫不會清掉。
   2 狀態白話：queued＝「已送出，等 Mac 開視窗」；running＝「誰在做：這步」；目前這步要老大做＝「等你：這步」。旁邊 ⓘ 寫誰在執行、什麼模型、哪個視窗。
   3 ■ 立刻停止：run_status 改 failed＋run_note「老大按停止」（adapter runset，opp_progress_set 既有參數），再寫一則【停止】給櫃台；提示條可復原（復原＝改回原狀態＋寫一則【繼續】）。 */
const SKZH={archimise:'大意匠',canon:'定本',copybook:'臨帖',craft:'考工','diagram-design':'圖解',distill:'蒸餾',eagle:'素材庫',eyear:'耳目','eyear-meeting-notes':'會議記錄',fieldwork:'采風',folio:'裝幀',glean:'拾穗',handy:'趁手',herald:'喉舌',hyperframes:'逐格渲染',intake:'過眼',last30days:'近況',lilt:'繡口','media-use':'媒體',minimise:'小意匠',mise:'意匠',motion:'走馬',present:'亮相',proof:'校讎',score:'協律',splice:'連綴',stage:'搬演',sweep:'灑掃',tableread:'圍讀',trophy:'奪標',vault:'倉庫',weigh:'執秤'};
const SKL=k=>(SKZH[k]?SKZH[k]+' ':'')+k;
const SMDL=[['Opus 5.5','一般主力'],['Fable 5.2','判斷級、驗收'],['Codex','生圖、程式'],['AGY','看片、查證'],['Grok','Grok Bot 隊'],['不指定','照預設']];
const skSplit=s=>String(s||'').split(/[、,，\s]+/).map(x=>x.trim().toLowerCase()).filter(x=>SSKILL.includes(x));
const skFind=q=>{q=String(q||'').toLowerCase();return SSKILL.filter(k=>!q||k.includes(q)||(SKZH[k]||'').includes(q)).sort((a,b)=>(a.startsWith(q)||(SKZH[a]||'').startsWith(q)?0:1)-(b.startsWith(q)||(SKZH[b]||'').startsWith(q)?0:1)).slice(0,6)};
const skExact=w=>{w=String(w||'').toLowerCase();return SSKILL.find(k=>k===w||SKZH[k]===w)||''};
let STD=null,SSUG=null;
const stdNew=()=>({name:'',status:'pending',model:'不指定',mode:'監工本身',skills:[],note:'',pk:''});
function stdLoad(id){const it=todoOf(id),c=it&&it.raw;if(!c)return null;const st=(c.progressSteps||[]).map(s=>{const o=stepOf(s);return {name:o.name,status:o.status,model:SMDL.some(m=>m[0]===o.model)?o.model:'不指定',mode:o.mode==='開子視窗'?'開子視窗':'監工本身',skills:skSplit(o.skill),note:o.note,pk:''}});
 if(!st.length)st.push(stdNew());return {id,steps:st}}
const stsL=v=>(STS.find(x=>x[0]===v)||STS[0])[1];
function stcHTML(o,i){const pk=o.pk,sub=o.mode==='開子視窗';
 const opts=pk==='model'?SMDL.map(([m,h])=>`<button type="button" class="stc-o${m===o.model?' on':''}" data-act="stcset" data-id="${i}|model|${esc(m)}"><b>${esc(m)}</b><small>${esc(h)}</small></button>`).join('')
  :pk==='status'?STS.map(([k,l])=>`<button type="button" class="stc-o s-${k}${k===o.status?' on':''}" data-act="stcset" data-id="${i}|status|${k}"><b>${esc(l)}</b></button>`).join(''):'';
 return `<div class="stc s-${esc(o.status)}" data-i="${i}">
 <div class="stc-top"><span class="stc-n" aria-hidden="true">${i+1}</span>
  <div class="stc-seg${sub?' r':''}" role="group" aria-label="第 ${i+1} 步誰來做"><i aria-hidden="true"></i><button type="button" data-act="stcmode" data-id="${i}|監工本身" aria-pressed="${!sub}">監工</button><button type="button" data-act="stcmode" data-id="${i}|開子視窗" aria-pressed="${sub}">子視窗</button></div>
  <button type="button" class="stc-c mdl${o.model==='不指定'?' dim':''}" data-act="stcpk" data-id="${i}|model" aria-expanded="${pk==='model'}"><span aria-hidden="true">◆</span>${esc(o.model==='不指定'?'模型':o.model)}</button>
  <button type="button" class="stc-c sts s-${esc(o.status)}" data-act="stcpk" data-id="${i}|status" aria-expanded="${pk==='status'}">${esc(stsL(o.status))}</button>
  <button type="button" class="stc-x" data-act="stdel" data-id="${i}" aria-label="拿掉第 ${i+1} 步">✕</button></div>
 <div class="stc-pk${pk?' open':''}" role="group" aria-label="${pk==='model'?'選模型':'選狀態'}"><div>${opts}</div></div>
 ${o.skills.length?`<div class="stc-sks">${o.skills.map(k=>`<span class="stc-sk">@${esc(SKL(k))}<button type="button" data-act="stcsk" data-id="${i}|${esc(k)}" aria-label="拿掉技能 ${esc(k)}">✕</button></span>`).join('')}</div>`:''}
 <div class="stc-in"><textarea class="st-name" data-i="${i}" rows="2" maxlength="120" placeholder="這步要做什麼？打 @ 掛技能，例：@意匠 寫第三場分鏡" aria-label="第 ${i+1} 步做什麼">${esc(o.name)}</textarea><div class="stc-sug" role="listbox" aria-label="技能建議" hidden></div></div>
 <input class="st-note" data-i="${i}" maxlength="160" value="${esc(o.note)}" placeholder="備註（可不填）" aria-label="第 ${i+1} 步備註"></div>`}
const stcList=()=>STD.steps.map(stcHTML).join('');
function stcRedraw(i){const box=$('#stRows');if(!box||!STD)return;if(i==null){box.innerHTML=stcList();return}
 const el=box.querySelector(`.stc[data-i="${i}"]`);if(!el)return;const t=document.createElement('div');t.innerHTML=stcHTML(STD.steps[i],i);const n=t.firstElementChild;el.replaceWith(n);return n}
{const _s=sheetHTML;sheetHTML=function(){const a=(S.sheet||'').split(':');if(a[0]!=='stepx')return _s();
 const id=S.sheet.slice(6);if(!STD||STD.id!==id)STD=stdLoad(id);if(!STD)return shHead('這件不在了');
 return shHead('步驟卡')+`<p class="note stc-lead">一步一張卡。上面選誰來做、用哪個模型；下面寫這步要做什麼，打 <b>@</b> 掛技能（中英文都可以）。按「去執行」時，大器照這個架構走。</p>${stPlanRow(id)}<div id="stRows" class="stcs">${stcList()}</div><div class="mrow">${mb('＋ 加一步','stadd','')}</div>${S.err==='stepx'?'<p class="err" role="alert">▲ 每一步都要寫做什麼。</p>':''}<div class="btns">${B('存好','stsave',id,'pri wide')}</div>`}}
{const _a=ACT.sheet;ACT.sheet=function(id){if(/^stepx:/.test(String(id||'')))STD=null;return _a.apply(this,arguments)}}
ACT.stadd=()=>{if(!STD)return;if(STD.steps.length>=30){toast('最多 30 步');return}STD.steps.push(stdNew());const box=$('#stRows');if(!box)return;
 box.insertAdjacentHTML('beforeend',stcHTML(STD.steps[STD.steps.length-1],STD.steps.length-1));const n=box.lastElementChild;if(n){n.classList.add('stpop');const t=n.querySelector('.st-name');if(t)t.focus()}};
ACT.stdel=i=>{if(!STD)return;i=+i;const old=STD.steps.slice();STD.steps.splice(i,1);if(!STD.steps.length)STD.steps.push(stdNew());stcRedraw();
 toast(`拿掉第 ${i+1} 步（還沒存）`,()=>{if(!STD)return;STD.steps=old;stcRedraw()})};
ACT.stcmode=v=>{if(!STD)return;const [i,m]=v.split('|'),o=STD.steps[+i];if(!o)return;o.mode=m;const el=document.querySelector(`#stRows .stc[data-i="${i}"] .stc-seg`);if(!el)return;
 el.classList.toggle('r',m==='開子視窗');el.querySelectorAll('button').forEach((b,k)=>b.setAttribute('aria-pressed',String((k===1)===(m==='開子視窗'))))};
ACT.stcpk=v=>{if(!STD)return;const [i,k]=v.split('|'),o=STD.steps[+i];if(!o)return;o.pk=o.pk===k?'':k;STD.steps.forEach((x,j)=>{if(j!==+i)x.pk=''});
 document.querySelectorAll('#stRows .stc').forEach(el=>{const j=+el.dataset.i,x=STD.steps[j];if(!x)return;const p=el.querySelector('.stc-pk');
  if(j===+i&&o.pk){const t=document.createElement('div');t.innerHTML=stcHTML(o,j);p.firstElementChild.innerHTML=t.querySelector('.stc-pk>div').innerHTML;p.setAttribute('aria-label',k==='model'?'選模型':'選狀態')}
  p.classList.toggle('open',!!x.pk);el.querySelectorAll('[data-act="stcpk"]').forEach(b=>b.setAttribute('aria-expanded',String(x.pk===b.dataset.id.split('|')[1])))})};
ACT.stcset=v=>{if(!STD)return;const [i,k,val]=v.split('|'),o=STD.steps[+i];if(!o)return;o[k]=val;o.pk='';const n=stcRedraw(+i);
 if(n){const c=n.querySelector(k==='model'?'.stc-c.mdl':'.stc-c.sts');if(c){c.classList.add('stpop');c.focus({preventScroll:true})}}};
ACT.stcsk=v=>{if(!STD)return;const [i,k]=v.split('|'),o=STD.steps[+i];if(!o)return;o.skills=o.skills.filter(x=>x!==k);stcRedraw(+i)};
function stcAddSkill(i,k,cut){const o=STD&&STD.steps[i];if(!o||!k)return;if(!o.skills.includes(k)){if(o.skills.length>=3){toast('一步最多掛 3 個技能');return}o.skills.push(k)}
 if(cut){o.name=(o.name.slice(0,cut[0])+o.name.slice(cut[1])).replace(/[ 　]{2,}/g,' ').replace(/^\s+/,'')}
 SSUG=null;const n=stcRedraw(i);if(n){const sk=n.querySelector('.stc-sk:last-child');if(sk)sk.classList.add('stpop');const t=n.querySelector('.st-name');if(t){t.focus({preventScroll:true});const p=cut?Math.min(cut[0],t.value.length):t.value.length;try{t.setSelectionRange(p,p)}catch(e){}}}}
ACT.stcadd=v=>{const [i,k]=v.split('|');const s=SSUG&&SSUG.i===+i?SSUG:null;stcAddSkill(+i,k,s?[s.a,s.b]:null)};
function stcSug(t){const i=+t.dataset.i,box=t.parentNode.querySelector('.stc-sug'),pos=t.selectionStart==null?t.value.length:t.selectionStart,pre=t.value.slice(0,pos),m=pre.match(/(^|\s)[@＠]([^\s@＠]{0,20})$/);
 if(!m){SSUG=null;box.hidden=true;box.innerHTML='';return}const q=m[2],list=skFind(q);if(!list.length){SSUG=null;box.hidden=false;box.innerHTML=`<p class="stc-none">沒有叫「${esc(q)}」的技能</p>`;return}
 SSUG={i,a:pos-q.length-1,b:pos,list,h:SSUG&&SSUG.i===i?Math.min(SSUG.h||0,list.length-1):0};
 box.hidden=false;box.innerHTML=list.map((k,j)=>`<button type="button" role="option" class="stc-s${j===SSUG.h?' on':''}" aria-selected="${j===SSUG.h}" data-act="stcadd" data-id="${i}|${k}"><b>${esc(SKZH[k]||k)}</b><small>${esc(k)}</small></button>`).join('')}
document.addEventListener('input',e=>{const t=e.target;if(!STD||!t||!t.closest||!t.closest('#stRows'))return;const i=+t.dataset.i,o=STD.steps[i];if(!o)return;
 if(t.classList.contains('st-name')){o.name=t.value;stcSug(t)}else if(t.classList.contains('st-note'))o.note=t.value});
document.addEventListener('keydown',e=>{const t=e.target;if(!SSUG||!t||!t.classList||!t.classList.contains('st-name')||+t.dataset.i!==SSUG.i||e.isComposing)return;
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();SSUG.h=(SSUG.h+(e.key==='ArrowDown'?1:SSUG.list.length-1))%SSUG.list.length;t.parentNode.querySelectorAll('.stc-s').forEach((b,j)=>{b.classList.toggle('on',j===SSUG.h);b.setAttribute('aria-selected',String(j===SSUG.h))})}
 else if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();stcAddSkill(SSUG.i,SSUG.list[SSUG.h],[SSUG.a,SSUG.b])}
 else if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();SSUG=null;const b=t.parentNode.querySelector('.stc-sug');b.hidden=true}},true);
document.addEventListener('focusout',e=>{const t=e.target;if(t&&t.classList&&t.classList.contains('st-name'))setTimeout(()=>{const b=t.parentNode&&t.parentNode.querySelector('.stc-sug');if(b&&!b.contains(document.activeElement)&&document.activeElement!==t){b.hidden=true;SSUG=null}},180)});
ACT.stsave=id=>{if(!STD||STD.id!==id)return;const it=todoOf(id),c=it&&it.raw;if(!c)return;
 // 沒選建議、直接打完的 @技能 也收進來
 STD.steps.forEach(o=>{o.name=o.name.replace(/(^|\s)[@＠]([^\s@＠]+)/g,(m,a,w)=>{const k=skExact(w);if(!k)return m;if(!o.skills.includes(k)&&o.skills.length<3)o.skills.push(k);return a}).replace(/\s{2,}/g,' ').trim();o.note=o.note.trim()});
 const keep=STD.steps.filter(s=>s.name||s.note||s.skills.length);if(keep.some(s=>!s.name)){S.err='stepx';render('keep');return}S.err='';
 const old=(c.progressSteps||[]).map(s=>({name:s.name,status:s.status,note:s.note||''}));
 const body=keep.map(s=>({name:s.name.slice(0,80),status:s.status,note:stepNote({model:s.model,mode:s.mode,skill:s.skills.join('、'),note:s.note})}));
 if(!LV.api||!LV.api.act){toast('離線中，連上再存');return}
 STD=null;closeThen(async()=>{try{await LV.api.act(id,'steps',{steps:body});await reload();toast(body.length?`存了 ${body.length} 張步驟卡`:'步驟卡清掉了',async()=>{try{await LV.api.act(id,'steps',{steps:old});await reload();toast('還原了')}catch(e){toast('沒還原：'+LERR(e))}})}catch(e){toast('沒存上：'+LERR(e))}})};
document.addEventListener('mousedown',e=>{if(e.target&&e.target.closest&&e.target.closest('.stc-s'))e.preventDefault()});
// 2 狀態白話
const YOU_RE=/老大|你|申請|登入|付款|本人|親自/;
RUNST.queued='已送出，等 Mac 開視窗';RUNST2.queued='已送出，等 Mac 開視窗';RUNST2.running='在做';JST.queued[0]='已送出，等接手';PCK.queued='已送出';
{const _c=coSt;coSt=function(t){const s=_c(t);return s==='排隊中'?'已送出，等接手':s}}
function runCur(c){const s=c.progressSteps||[];let k=s.findIndex(x=>x.status==='current'||x.status==='blocked');if(k<0&&c.runStatus==='queued')k=s.findIndex(x=>x.status==='pending');return k}
function runWho(c){const w=((String(c.runNote||'').match(/【[^】]+】[^，。；、\n]{0,30}/)||[''])[0]).trim();let j=null;
 try{j=jobs().find(q=>{const r=q.raw||{};if(!['running','queued','waiting_you','waiting_mac'].includes(r.status))return false;const o=jobOwner(q);return o&&o.id===c.id})}catch(e){}
 const r=j&&j.raw||{},k=runCur(c),o=k>-1?stepOf((c.progressSteps||[])[k]):null;
 return {win:w,agent:r.agent||'',mach:r.machine||'',model:o&&o.model!=='不指定'?o.model:'',mode:o?o.mode:'',skill:o?o.skill:'',step:o?o.name:'',k,n:(c.progressSteps||[]).length,by:c.progressUpdatedBy||''}}
const stopped=c=>c.runStatus==='failed'&&/老大按停止/.test(c.runNote||'');
function runSay(c){if(!c||!c.runStatus)return '還沒送出';const w=runWho(c),cnt=w.n&&w.k>-1?`・${w.k+1}/${w.n} 步`:'';
 if(c.runStatus==='done')return '做完了';
 if(stopped(c))return '已停止（你按的）'+cnt;
 if(c.runStatus==='failed')return '卡住了'+(w.step?'：'+w.step:'')+cnt;
 if(w.step&&YOU_RE.test(w.step))return '等你：'+w.step+cnt;
 if(c.runStatus==='queued')return '已送出，等 Mac 開視窗'+cnt;
 const who=w.agent||w.win||'大器';return `${who}${/[A-Za-z0-9]$/.test(who)?' ':''}在做：${w.step||'這件'}${w.model?'（'+w.model+'）':''}${cnt}`}
jiaoSt=runSay;
function runInfo(c){const w=runWho(c),you=w.step&&YOU_RE.test(w.step),q=c.runStatus==='queued';
 const rows=[['誰在執行',you?'你（這步要你本人做）':q?'還沒有人接：Mac 上的櫃台會開一個新的 Claude Code 視窗來做':(w.agent||(w.win?'Claude Code 視窗':'大器（Mac 上的 Claude Code）'))],
  ['在哪個視窗',w.win||(q?'還沒開，開了會寫在這裡':'大器還沒回報視窗名')],['模型',w.model||'沒指定：用大器預設（Opus 5.5）'],['方式',w.mode||'監工本身'],w.skill?['技能',skSplit(w.skill).map(SKL).join('、')||w.skill]:null,['機器',w.mach||'老大的 Mac'],
  ['這步',w.step?`第 ${w.k+1} 步：${w.step}`:'還沒排步驟'],['最後回報',c.progressUpdatedAt?LAGO(c.progressUpdatedAt)+(w.by?'・'+w.by:''):'']].filter(x=>x&&x[1]);
 return `<dl class="rinfo">${rows.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><p class="note">「已送出」＝按了去執行，Mac 還沒開出視窗；通常一兩分鐘內就會變成「在做」。Mac 關機時會等到開機。</p>`}
const RINFO={};
function runBar(c){if(!c||!c.id||!c.runStatus)return '';const busy=['queued','running'].includes(c.runStatus),u=c.runStatus==='failed'&&!stopped(c),k=c.id,op=!!RINFO[k];
 return `<div class="runbar${busy?' live':''}${u?' urg':''}" data-rb="${esc(k)}"><div class="rb-top"><span class="rb-dot" aria-hidden="true"></span><p class="rb-t">${esc(runSay(c))}</p>
 <button type="button" class="rb-i" data-act="rbinfo" data-id="${esc(k)}" aria-expanded="${op}" aria-label="誰在執行、什麼模型、哪個視窗">ⓘ</button></div>
 <div class="rb-more${op?' open':''}"><div>${runInfo(c)}</div></div>${busy?`<div class="btns rb-b">${B('■ 立刻停止','runstop',k,'rb-stop')}</div>`:''}</div>`}
ACT.rbinfo=k=>{RINFO[k]=!RINFO[k];document.querySelectorAll(`.runbar[data-rb="${CSS.escape(k)}"]`).forEach(el=>{el.querySelector('.rb-more').classList.toggle('open',!!RINFO[k]);el.querySelector('.rb-i').setAttribute('aria-expanded',String(!!RINFO[k]))})};
const itemOf=id=>(LV.items||[]).find(q=>q.id===id);
ACT.runstop=async id=>{const c=itemOf(id);if(!c||!['queued','running'].includes(c.runStatus)){toast('這件已經沒在跑了');return}
 if(!LV.api||!LV.api.act){toast('離線中，連上再按');return}
 const old={status:c.runStatus,note:c.runNote||''},w=runWho(c);
 const put=nc=>{if(!nc)return;const j=LV.items.findIndex(q=>q.id===id);if(j>-1)LV.items[j]=nc};
 try{put(await LV.api.act(id,'runset',{status:'stopped',note:'老大按停止'}))}catch(e){toast('沒停下：'+LERR(e));return}
 LV.sig='';paint('keep');
 let sent=true;try{await LV.api.say(id,`【停止】老大按了立刻停止。${w.win?'視窗：'+w.win+'。':''}${w.step?'停在第 '+(w.k+1)+' 步：'+w.step+'。':''}請馬上停掉這張卡正在跑的視窗或背景程序，不要再改檔或對外發送，回報停在哪、做到哪。`,'daqi')}catch(e){sent=false}
 toast(sent?'停下了，已叫大器關掉那個視窗':'面板標停止了，但通知大器沒送出，請到對話跟大器說',async()=>{try{put(await LV.api.act(id,'runset',old));LV.sig='';paint('keep');
   try{await LV.api.say(id,'【繼續】老大收回剛剛的停止，照原本的接著做。','daqi')}catch(e){}toast('收回停止了，照原本的接著做')}catch(e){toast('沒收回：'+LERR(e))}});
 setTimeout(()=>reload&&reload(),4e3)};
WRITE.push('runstop','stsave','stadd','stdel');
// 任務彈出卡（交辦）、案子詳情：最上面放狀態列
{const _s=sheetHTML;sheetHTML=function(){const h=_s(),a=(S.sheet||'').split(':');if(a[0]!=='cview'||a[1]!=='todo')return h;const it=DB.todo.find(q=>q.id===a.slice(2).join(':')),c=it&&it.raw;if(!c||!c.runStatus)return h;
 return h.replace(/(<div class="shead">[\s\S]*?<\/button><\/div>)/,'$1'+runBar(c))}}
{const _p=pageHTML;pageHTML=function(){const h=_p(),x=(S.page||'').split(':');if(x[0]!=='proj')return h;const c=itemOf(x[1]);if(!c||!c.runStatus)return h;
 const i=h.indexOf('</h1>');return i<0?h:h.slice(0,i+5)+runBar(c)+h.slice(i+5)}}
// 案子步驟詳情：執行一欄白話
{const _d=pstDetail;pstDetail=function(p,s,i){const h=_d(p,s,i),c=p.raw||{};if(!c.runStatus||!(s.status==='current'||s.status==='blocked'))return h;return h.replace(/(<span>執行<\/span><b>)[^<]*/,'$1'+esc(runSay(c)))}}
/* ---------- v94（2026-11-24）：按鈕收斂與線條小圖示、大器建議直接點、做完了重設計、主卡鈕無框、肉咖會動的臉、連結預覽、讀不到換路 ----------
   老大原話（逐流 2026-11-23「編修」）：
   msg 360「這邊邏輯好怪，然後怎麼會放emoji ，如果要的話應該是畫風相似的小圖示，這邊有好多問大器 請霸霸設置 這些狀態讓我有點混亂」
   msg 349「當大器建議 轉成案子的時候，就只接點有大器這張卡就好，不用多一個按鈕」「這個按鈕在這邊我不喜歡而且白色很不搭，設計一下吧」
   msg 378「畫面是不錯但是多這樣的按鈕就會有卡卡的感覺，應該不要有框？我也不確定」
   msg 388「肉咖的臉請幫我也設計一個會動的。」「紫色應該是大器，桃紅色粉紅色才是肉咖」
   msg 345「希望這樣貼的時候至少要有網頁簡介活動內容與圖片吧不然我怎麼判斷」
   msg 357「大器讀不到的時候要想辦法吧？不然有重要資料怎辦」
   1 全站按鈕的符號（📅 ✕ 🗑 🧩 📁 ☁ 🖥 ↗ ✓ ✎ ▣ ↶ ▶ ■ …）畫面上換成同一套線條小圖示（ic()，1.75 線寬、圓角、跟字同色）。程式裡的字不動，畫上去時換。
   2 要你做彈出卡：主要 2～3 顆（主鈕實心、次鈕線框），其他收進「更多做法」。
   3 任務「這件接下來」：大器建議那張卡整張可以點（點了照建議做），下面只列其他做法；「做完了」改成綠色細框小鈕。
   4 案子詳情主卡動作鈕無框（圖示＋字，按下才有底）。
   5 肉咖：會動的桃紅臉（bot_face.js preset rouka），派肉咖做的鈕改桃紅。
   6 彈出卡裡的網址：抓網頁標題、簡介、圖片做成預覽卡（Edge Function link-preview，待監工部署；函式不在時照舊顯示網址鈕）。
   7 卡片寫「讀不到／看不到／沒權限／打不開」：彈出卡上方一條「請大器換路再讀」，按了直接送【換路再讀】給大器櫃台。 */
// 1 線條小圖示
const ICP={check:'<path d="M5 12.5l4.2 4.2L19 7"/>',x:'<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
 cal:'<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
 trash:'<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l.9 12.2a1.6 1.6 0 0 0 1.6 1.3h6a1.6 1.6 0 0 0 1.6-1.3L17.5 7M10 11v5.5M14 11v5.5"/>',
 steps:'<path d="M10 6.5h10M10 12h10M10 17.5h10"/><rect x="3.5" y="4.5" width="4" height="4" rx="1.2"/><rect x="3.5" y="10" width="4" height="4" rx="1.2"/><rect x="3.5" y="15.5" width="4" height="4" rx="1.2"/>',
 folder:'<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.2h7a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
 cloud:'<path d="M7.2 18.5h10.2a4 4 0 0 0 .5-7.96 6 6 0 0 0-11.4-1.3A4.75 4.75 0 0 0 7.2 18.5z"/>',
 screen:'<rect x="3" y="4.5" width="18" height="12" rx="2.5"/><path d="M9 20h6M12 16.5V20"/>',
 ext:'<path d="M14 4.5h5.5V10M19.5 4.5L11 13M17 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4"/>',
 archive:'<rect x="3.5" y="4" width="17" height="5" rx="1.5"/><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4"/>',
 edit:'<path d="M4.5 19.5h4l10.3-10.3a2.1 2.1 0 0 0-3-3L5.5 16.5zM13.8 8.2l3 3"/>',
 undo:'<path d="M9 5.5L4.5 10 9 14.5"/><path d="M4.5 10H14a5.5 5.5 0 0 1 0 11h-3"/>',
 redo:'<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"/>',
 play:'<path d="M8 5.5v13l10.5-6.5z"/>',stop:'<rect x="6.5" y="6.5" width="11" height="11" rx="2"/>',pause:'<path d="M9 6v12M15 6v12"/>',
 ff:'<path d="M4.5 6.5v11l7-5.5zM12.5 6.5v11l7-5.5z"/>',swap:'<path d="M7 4.5L3.5 8 7 11.5M3.5 8h14M17 12.5l3.5 3.5-3.5 3.5M20.5 16h-14"/>',
 money:'<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.4c-.5-.9-1.6-1.5-2.8-1.5-1.6 0-2.8.8-2.8 2 0 2.9 5.8 1.5 5.8 4.3 0 1.3-1.3 2.1-3 2.1-1.3 0-2.4-.5-2.9-1.5M12 6.2v1.7M12 16.3v1.6"/>',
 compass:'<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
 team:'<circle cx="9" cy="9" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M15.5 6.2a3 3 0 0 1 0 5.6M17 14.2a5 5 0 0 1 3.5 4.8"/>',
 clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.9v.2"/>',
 gem:'<path d="M12 3.5l7 8.5-7 8.5-7-8.5z"/>',star:'<path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"/>',
 more:'<path d="M6 9.5l6 6 6-6"/>',arrow:'<path d="M5 12h13.5M13 6.5l5.5 5.5-5.5 5.5"/>',hand:'<path d="M5 12.5h9.5M10.5 8l4.5 4.5-4.5 4.5M17 5.5v14"/>',
 chat:'<path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5h-8l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5z"/>',
 note:'<path d="M6 3.5h8.5L19 8v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1-1.5zM14 3.5V8.5h5M8.5 13h7M8.5 16.5h4.5"/>',
 wait:'<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12h.1M12 12h.1M15.5 12h.1"/>',route:'<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/>'};
const ic=(n,c)=>ICP[n]?`<svg class="ic${c?' '+c:''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICP[n]}</svg>`:'';
const EMO={'✓':'check','✕':'x','📅':'cal','🗑':'trash','🧩':'steps','📁':'folder','☁':'cloud','🖥':'screen','↗':'ext','▣':'archive','✎':'edit','↶':'undo','↺':'undo','↻':'redo',
 '▶':'play','■':'stop','⏸':'pause','⏩':'ff','⇄':'swap','💰':'money','🧭':'compass','👥':'team','🕘':'clock','ⓘ':'info','◆':'gem','★':'star'};
const EMO_RE=new RegExp('('+Object.keys(EMO).join('|')+')\\uFE0F?[ 　]?','gu');
const EMO_SEL='button,a.btn,a.pc-b,.mic,.pdic,[role="button"]';
function icSwap(root){if(!root||!root.querySelectorAll)return;const els=[];if(root.matches&&root.matches(EMO_SEL))els.push(root);root.querySelectorAll(EMO_SEL).forEach(e=>els.push(e));
 els.forEach(el=>{const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),hit=[];let n;while((n=w.nextNode())){EMO_RE.lastIndex=0;if(EMO_RE.test(n.nodeValue)&&!(n.parentNode&&n.parentNode.closest&&n.parentNode.closest('svg,textarea,input')))hit.push(n)}
  hit.forEach(t=>{const f=document.createDocumentFragment(),s=t.nodeValue;let last=0;EMO_RE.lastIndex=0;let m;
   while((m=EMO_RE.exec(s))){if(m.index>last)f.appendChild(document.createTextNode(s.slice(last,m.index)));const tp=document.createElement('template');tp.innerHTML=ic(EMO[m[1]]);f.appendChild(tp.content);last=m.index+m[0].length}
   if(last<s.length)f.appendChild(document.createTextNode(s.slice(last)));t.parentNode.replaceChild(f,t)})})}
{const _r=render;render=function(d){_r(d);icSwap(document.getElementById('app'));lpHydrate()}}
new MutationObserver(ms=>{ms.forEach(m=>m.addedNodes.forEach(x=>{if(x.nodeType===1)icSwap(x);else if(x.nodeType===3&&x.parentNode&&x.parentNode.closest&&x.parentNode.closest(EMO_SEL)){EMO_RE.lastIndex=0;if(EMO_RE.test(x.nodeValue))icSwap(x.parentNode.closest(EMO_SEL))}}))}).observe(document.body,{childList:true,subtree:true,characterData:false});
// 2 要你做彈出卡：主要 2～3 顆，其他收進「更多做法」
const YDM={};
{const _j=pcJob;pcJob=function(r,d){const h=_j(r,d);if((r.status||'')!=='waiting_you')return h;
 const id=String(r.id),p=ydParse(r),bz=YD.busy?' disabled':'',face=r.ask||askCut(String(r.title||'').replace(/^拍板後續｜/,''),40),Q=`「${face}」`;
 const main=p.link?`<a class="btn pri pc-main" href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">${ic('ext')}打開連結</a>`:p.act?B(ic('play')+esc(p.actLabel),'ydrun',id,'pri pc-main',bz):B(ic('check')+'我做好了','yddone',id,'pri pc-main',bz);
 const sec=[p.link||p.act?B(ic('check')+'我做好了','yddone',id,'pc-2',bz):'',B(ic('hand')+'交給大器','ydhand','daqi|'+id,'pc-2'),p.link||p.act?'':B(ic('x')+'不做了','ydskip',id,'pc-2')].filter(Boolean);
 const more=[p.link||p.act?mb(ic('x')+'不做了','ydskip',id):'',mb(ic('team')+'請霸霸設置','ydhand','baba|'+id),mb(ic('wait')+'還沒好','ydnot',id),mb(ic('note')+'加註記','ydnote',id),mb(ic('chat')+'問大器','ydq',id),mb(ic('cal')+'改期','pcsay',`daqi|${Q}改到＿＿再做，原因：`)].filter(Boolean);
 const op=!!YDM[id];
 const acts=`<div class="pc-acts v94">${main}<div class="pc-2s">${sec.join('')}</div></div><div class="pc-mo${op?' open':''}"><button class="mb pc-mot" data-act="ydmore" data-id="${esc(id)}" aria-expanded="${op}">更多做法 ${ic('more','mo-c')}</button><div class="pc-mol"><div>${more.join('')}</div></div></div>`;
 return h.replace(/<div class="pc-acts">[\s\S]*?<\/div>/,acts).replace(/<div class="mrow pc-alt">[\s\S]*?<\/div>/,'')}}
ACT.ydmore=id=>{YDM[id]=!YDM[id];document.querySelectorAll('.pc-mo').forEach(el=>{const b=el.querySelector('.pc-mot');if(!b||b.dataset.id!==id)return;el.classList.toggle('open',!!YDM[id]);b.setAttribute('aria-expanded',String(!!YDM[id]))})};
// 3 任務「這件接下來」：建議卡整張可點；做完了改細框小鈕
{const _s=sheetHTML;sheetHTML=function(){let h=_s();const a=(S.sheet||'').split(':');if(a[0]!=='cview'||a[1]!=='todo')return h;const id=a.slice(2).join(':'),t=DB.todo.find(q=>q.id===id);if(!t)return h;
 h=h.replace(/<div class="btns"><button class="btn pri wide" data-act="tdone"[^>]*>[\s\S]*?<\/button><\/div>/,`<div class="tdrow"><button class="btn tdb" data-act="tdone" data-id="${esc(id)}">${ic('check')}做完了</button></div>`);
 const g=jSuggest(t),lab={merge:'併到〈'+(g.p?clip(g.p.short||g.p.title,10):'')+'〉',co:'轉成公司案子',proj:'轉成案子',run:'交給 AI 做'}[g.k];
 const act={merge:['jmergeto',t.id+'|'+(g.p&&g.p.id)],co:['jtoco',t.id],proj:['jtoproj',t.id],run:['jtorun',t.id]}[g.k];
 const alt=[g.k!=='run'&&!t.run?mb(ic('play')+'交給 AI 做','jtorun',t.id):'',mb(ic('folder')+(g.k==='merge'?'併到別的案子':'併到案子'),'sheet','jmerge:'+t.id),g.k!=='proj'?mb(ic('steps')+'轉成案子','jtoproj',t.id):'',g.k!=='co'?mb(ic('team')+'轉成公司案子','jtoco',t.id):''].filter(Boolean);
 const sec=`<section class="sec jnext v94"><h3>這件接下來</h3><button class="card jsug jsugb" data-act="${act[0]}" data-id="${esc(act[1])}" aria-label="照大器建議：${esc(lab)}">${bm('daqi')}<span class="jsug-t"><small>大器建議・點這張照做</small><b>${esc(lab)}</b><span class="jsug-w">${esc(g.why)}</span></span><span class="jsug-go" aria-hidden="true">${ic('arrow')}</span></button>
 <div class="jalt"><span class="jalt-h">或改成</span>${alt.join('')}</div><p class="note">原任務會收掉，72 小時內可救回。</p></section>`;
 return h.replace(/<section class="sec jnext">[\s\S]*?<\/section>/,sec)}}
// 5 肉咖：會動的桃紅臉
BFP.rouka='rouka';BFC.rouka='#FF4F9A';
{const _c=coSection;coSection=function(){return _c().replace(/<div class="sh">(<h2>公司(?:重點)?)/,`<div class="sh">${aiF('rouka','co:')}$1`)}}
{const _cs=coSheet;coSheet=function(id){return _cs(id).replace(/class="btn pri" data-act="coRouka"/,'class="btn rk" data-act="coRouka"').replace(/>派肉咖做</,'>'+bm('rouka','','sm')+'派肉咖做<')}}
{const _cr=coRoukaSheet;coRoukaSheet=function(id){return _cr(id).replace(/class="btn pri wide" data-act="cosend"/,'class="btn rk wide" data-act="cosend"')}}
// 6 連結預覽：彈出卡裡的網址做成預覽卡
const LPC={};let LPDOWN=false;
const LP_DEMO={'example.org':{site_name:'示範售票（虛構）',title:'示範工作坊：短片剪接入門',description:'12/14 週六下午兩點，台北。三小時實作，帶自己的素材來剪一支 30 秒短片，名額 20 人，費用 800 元。（示範資料，不是真的活動）',image:'icons/icon-512.png'},
 'example.com':{site_name:'示範雲端（虛構）',title:'試看帶第二版',description:'某品牌形象短片試看帶，1 分 12 秒。（示範資料）',image:''}};
{const _b=pcBtns;pcBtns=function(txt,about,skip){return _b(txt,about,skip).map(x=>{const m=x.match(/^<a class="btn pc-b" href="(https:[^"]+)"[^>]*>↗ (?!開 )/);return m?x.replace('<a class="btn pc-b" ',`<a class="btn pc-b lpb" data-lp="${m[1]}" `):x})}}
const lpOK=u=>/^https:\/\//.test(String(u||''));
async function lpGet(u){if(u in LPC)return LPC[u];
 if(LV.mode!=='live'){let host='';try{host=new URL(u).hostname.replace(/^www\./,'')}catch(e){}LPC[u]=LP_DEMO[host]||null;return LPC[u]}
 if(LPDOWN||!LV.A||!LV.A.CONFIG)return null;
 const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),7000);LPC[u]=null;
 try{const r=await fetch(LV.A.CONFIG.SUPABASE_URL.replace(/\/+$/,'')+'/functions/v1/link-preview?url='+encodeURIComponent(u),{headers:{apikey:LV.A.CONFIG.SUPABASE_ANON_KEY},signal:ac.signal,credentials:'omit',cache:'no-store'});
  if(r.status===404){LPDOWN=true;return null}if(!r.ok)return null;const j=await r.json();
  if(!j||!(j.title||j.description))return null;LPC[u]={title:String(j.title||'').slice(0,140),description:String(j.description||'').slice(0,300),site_name:String(j.site_name||'').slice(0,60),image:lpOK(j.image)?String(j.image):''};return LPC[u]}
 catch(e){return null}finally{clearTimeout(tm)}}
function lpCard(u,d){let host='';try{host=new URL(u).hostname.replace(/^www\./,'')}catch(e){}
 return `<a class="lp" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${d.image?`<span class="lp-img"><img src="${esc(d.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></span>`:''}<span class="lp-tx"><small>${ic('ext')}${esc(d.site_name||host)}</small><b>${esc(d.title||host)}</b>${d.description?`<span class="lp-d">${esc(d.description)}</span>`:''}</span></a>`}
function lpHydrate(){document.querySelectorAll('a.lpb[data-lp]:not([data-lpd])').forEach(a=>{a.setAttribute('data-lpd','1');const u=a.getAttribute('data-lp');if(!lpOK(u))return;
 lpGet(u).then(d=>{if(!d||!a.isConnected)return;const t=document.createElement('template');t.innerHTML=lpCard(u,d);const box=a.closest('.pc-tools');a.replaceWith(t.content);if(box)box.classList.add('has-lp')})})}
// 7 讀不到：請大器換路再讀
const RR_RE=/讀不到|看不到|沒權限|沒有權限|打不開|無法讀取|無法開啟|下載不了/;const RRS={};
function rrSrc(txt){return pcLines(txt).filter(l=>RR_RE.test(l)).slice(0,3)}
function rrInfo(t,id){if(t==='hjob'||t==='youdo'){const r=hubRow('job',id)||((DB.jobs.find(x=>String(x.id)===id)||{}).raw);return r&&{title:r.ask||r.title,txt:[r.title,r.note,r.ask].join('\n'),item:null,k:'job '+id}}
 if(t==='hevt'){const r=hubRow('event',id)||((DB.events.find(x=>String(x.id)===id)||{}).raw);return r&&{title:r.ask||askCut(r.summary,40),txt:[r.summary,r.path].join('\n'),item:null,k:'event '+id}}
 if(t==='hdecf'){const d=((LV.hub&&LV.hub.answered)||[]).find(x=>x.id===id),j=d&&decJob(id);return d&&{title:d.question,txt:[d.question,d.detail,j&&j.title,j&&j.note].join('\n'),item:null,k:'decision '+id}}
 if(t==='dec'||t==='why'){const d=DB.dec.find(x=>x.id===id);return d&&{title:d.ask||d.q,txt:[d.q,d.detail].join('\n'),item:null,k:'decision '+id}}
 if(t==='cview'&&id.indexOf('todo:')===0){const it=DB.todo.find(q=>q.id===id.slice(5)),c=it&&it.raw;return c&&{title:c.title,txt:[c.title,WHYOF(c),c.runNote,c.progressNote,c.progressBlocker].join('\n'),item:c.id||null,k:'item '+c.id}}
 return null}
{const _s=sheetHTML;sheetHTML=function(){const h=_s(),a=(S.sheet||'').split(':'),t=a[0],id=a.slice(1).join(':');const o=rrInfo(t,id);if(!o)return h;const src=rrSrc(o.txt);if(!src.length)return h;
 const key=t+':'+id,sent=RRS[key]&&Date.now()-RRS[key]<30*60e3;
 const box=`<div class="rr"><p class="rr-h">▲ 大器有東西讀不到</p><ul class="rr-l">${src.map(s=>`<li>${esc(clip(s,80))}</li>`).join('')}</ul>${sent?`<p class="rr-ok">${ic('check')}已請大器換路，拿到會寫回這張卡</p>`:B(ic('route')+'請大器換路再讀','reroute',key,'rr-b')}</div>`;
 return h.replace(/(<div class="shead">[\s\S]*?<\/button><\/div>)/,'$1'+box)}}
ACT.reroute=async key=>{const i=key.indexOf(':'),t=key.slice(0,i),id=key.slice(i+1),o=rrInfo(t,id);if(!o)return;
 if(RRS[key]&&Date.now()-RRS[key]<30*60e3){toast('剛請過了，大器在換路');return}if(!LV.api||!LV.api.say){toast('離線中，連上再按');return}
 const src=rrSrc(o.txt),body=`【換路再讀】${clip(String(o.title||'這張卡'),60)}\n讀不到的來源：${src.join('；')}\n卡片：${o.k}\n請照過眼門路階梯換路拿到內容（附件下載、肉咖代抓公司群、網頁讀取、匯出、問來源的人），拿到後把內容摘要寫回這張卡；全部路都試過還拿不到，回報試了哪幾條、還缺什麼。`;
 RRS[key]=Date.now();render('keep');
 try{await LV.api.say(o.item,body,'daqi');toast('交給大器換路了，拿到會寫回這張卡')}catch(e){delete RRS[key];render('keep');toast('沒送出：'+LERR(e))}};
WRITE.push('reroute');
/* ---------- v95（2026-11-24）：首頁減重、任務去向加霸霸、來源白話、按鈕統一、中文機器人名、卡點可處理 ----------
   老大原話（逐流「編修」，2026-11-23）：
   msg 394「我覺得如果偷拍完了的話，這一個格子可能就要低調一點，不然他空在那邊好礙眼」「不曉得為什麼就覺得今天行程這個樣子顯示好像有一點太大塊了，會有點阻礙，我看整體」
   msg 398「當然也有霸霸可以選」「我的意思是說 跟定定 大器規劃 霸霸是轉告適合機器人去執行或者他自己去執行 會有這個差別，是因為有一些事情大器都不做」「這到底啥」
   msg 400「去執行 跟變成工作 差別在哪裡？」　msg 407「現在都換成中文名字囉，我說機器人」
   msg 410「這個描述我整個無法更動也無法進行處理這樣在這裡這樣很不舒服」 */
// 1 首頁：都拍完了縮成一行小字；今天行程一行一件、最多 3 件
{const _h=homeL2;homeL2=function(){return _h().replace(/<section class="card" style="margin-top:14px"><h3>都拍完了<\/h3>(?:<p>[^<]*<\/p>)?<\/section>/,`<p class="dnone">✓ 都拍完了，沒有等你決定的事</p>`)}}
todayStrip=function(){if(S.st==='loading'||S.st==='error')return '';if(S.tab==='today')calKick();
 const a=calAll().filter(e=>e.d===0&&!e.cancel),ago=calAgo();
 const row=e=>`<button class="tdi" data-act="sheet" data-id="cal:${esc(e.id)}"><span class="tm">${e.all?'全天':esc(e.t)}</span><b>${esc(e.n)}</b>${e.place?`<small>${esc(e.place)}</small>`:''}<i class="tdd" style="--cc:${e.src==='co'?'var(--ink2)':(e.cat&&CAT[e.cat]?CAT[e.cat][1]:'var(--ink2)')}" aria-label="${e.src==='co'?'公司':'個人'}"></i></button>`;
 return `<section class="sec tday v95"><div class="tdh"><h2>今天行程<small>${a.length?a.length+' 件':'沒有行程'}</small></h2><span class="tdh-r">${mb('＋ 新增','sheet','calnew')}${moreB('看全部','page','cal')}</span></div>${a.length?`<div class="tdl">${a.slice(0,3).map(row).join('')}</div>${a.length>3?`<button class="tdm" data-act="page" data-id="cal">還有 ${a.length-3} 件 ›</button>`:''}`:''}${ago?`<p class="tdu">行事曆 ${esc(ago)}更新${mb('↻','calnow','',' aria-label="現在更新"')}</p>`:''}</section>`};

// 2 任務去向：先想清楚（定定、大器規劃）／交出去做（交給大器做、交給霸霸）
const BABA_RE=/Grok|社群|發文|貼文|發一則|\bIG\b|Instagram|Threads|臉書|\bFB\b|推特|生圖|出圖|畫一張|找人|找演員|找攝影|聯絡|打給|詢價|比價|下單|代買|訂位|訂票/i;
function jSug95(t){const g=jSuggest(t);if(g.k==='merge')return g;if(BABA_RE.test(String(t.title||'')+' '+String((t.raw&&t.raw.why)||'')))return {k:'baba',why:'這類事大器不做（要用 Grok Bot 帳號、對外發、生圖或找人），交給霸霸轉給適合的機器人，或它自己做'};return g}
const JLAB=(g)=>({merge:'併到〈'+(g.p?clip(g.p.short||g.p.title,10):'')+'〉',co:'轉成公司案子',proj:'轉成案子',run:'交給大器做',baba:'交給霸霸'}[g.k]);
{const _s=sheetHTML;sheetHTML=function(){let h=_s();const m=/^cview:todo:(.+)$/.exec(S.sheet||'');if(!m)return h;const id=m[1],t=DB.todo.find(q=>q.id===id);if(!t)return h;
 const c=t.raw||{},g=jSug95(t),lab=JLAB(g);
 const act={merge:['jmergeto',t.id+'|'+(g.p&&g.p.id)],co:['jtoco',t.id],proj:['jtoproj',t.id],run:['jtorun',t.id],baba:['jtobaba',t.id]}[g.k];
 const run=!!t.run||!!c.runStatus,who=/【霸霸】/.test(c.runNote||'')?'霸霸':'大器';
 const think=`<div class="jgrp"><span class="jgrp-h">先想清楚</span><div class="jgrp-b">${mb(bm('din')+'跟定定規劃','ai','din|proj:'+id+'||')}${mb(bm('daqi')+'跟大器規劃','ai','daqi|proj:'+id+'||')}</div></div>`;
 const doit=`<div class="jgrp"><span class="jgrp-h">交出去做</span><div class="jgrp-b">${run?`<span class="jgrp-on">${ic('play')}已交給${who}，進度會寫回這張卡</span>`:mb(bm('daqi')+'交給大器做','jtorun',id)+mb(bm('baba')+'交給霸霸','jtobaba',id)}</div><p class="jgrp-n">大器在 Mac 開視窗做；大器不做的事（Grok Bot 帳號、社群發文、生圖、找人）交給霸霸，它轉給適合的機器人或自己做。</p></div>`;
 const alt=[mb(ic('folder')+(g.k==='merge'?'併到別的案子':'併到案子'),'sheet','jmerge:'+id),g.k!=='proj'?mb(ic('steps')+'轉成案子','jtoproj',id):'',g.k!=='co'?mb(ic('team')+'轉成公司案子','jtoco',id):''].filter(Boolean);
 const sug=(run&&(g.k==='run'||g.k==='baba'))?'':`<button class="card jsug jsugb" data-act="${act[0]}" data-id="${esc(act[1])}" aria-label="照大器建議：${esc(lab)}">${bm(g.k==='baba'?'baba':'daqi')}<span class="jsug-t"><small>大器建議・點這張照做</small><b>${esc(lab)}</b><span class="jsug-w">${esc(g.why)}</span></span><span class="jsug-go" aria-hidden="true">${ic('arrow')}</span></button>`;
 const sec=`<section class="sec jnext v95"><h3>這件接下來</h3>${sug}${think}${doit}<div class="jalt"><span class="jalt-h">或改成</span>${alt.join('')}</div><p class="note">轉成或併到案子時，原任務會收掉，72 小時內可救回。</p></section>`;
 h=h.replace(/<div class="mrow"><button class="mb" data-act="ai" data-id="din\|proj:[^"]*">[\s\S]*?<\/button><button class="mb" data-act="ai" data-id="daqi\|proj:[^"]*">[\s\S]*?<\/button><\/div>/,'')
  .replace(/<button class="mb" data-act="run" data-id="[^"]*">▶ 去執行<\/button>/,'');
 return h.replace(/<section class="sec jnext v94">[\s\S]*?<\/section>/,sec)}}
// 3 去執行＝變成工作＝交給大器做：同一條路
{const _r=ACT.run;ACT.run=id=>DB.todo.find(q=>q.id===id)?ACT.jtorun(id):_r(id)}
ACT.jtobaba=id=>{const t=DB.todo.find(q=>q.id===id),c=t&&t.raw;if(!c)return;if(t.run||c.runStatus){toast('這件已經交出去了');return}
 if(!LV.api||!LV.api.say||!LV.api.act){toast('離線中，連上再按');return}
 const why=String(WHYOF(c)||'').trim(),body=`【請霸霸轉派】${clip(String(c.title||'這件'),80)}${why?'\n說明：'+clip(why,300):''}\n卡片：item ${id}\n大器不做這類事。請用 call-baba.sh 交給霸霸：霸霸判斷交給哪隻機器人（或自己做），做完把結果寫回這張卡；要花錢、對外發布的先問老大。`;
 closeThen(async()=>{try{await LV.api.say(id,body,'daqi')}catch(e){toast('沒送出：'+LERR(e));return}
  try{const n=await LV.api.act(id,'runset',{status:'running',note:'【霸霸】轉派中，等霸霸回報'});const i=LV.items.findIndex(x=>x.id===id);if(n&&i>-1)LV.items[i]=n;LV.sig='';paint()}catch(e){}
  toast('交給霸霸了，進度會寫回這張卡');reload()})};
WRITE.push('jtobaba');

// 5 機器人中文名、按鈕用詞：畫面層統一換（不改上百個呼叫點）
const ZHN={gig:'集集',tal:'塔塔',pom:'朋朋',mon:'萌萌',din:'定定',kim:'金金',bot:'霸霸',pix:'皮皮',tom:'通通',zap:'渣渣',dom:'當當',zom:'鬆鬆',bon:'幫幫'};
const ZH_RE=/\b(Gig|Tal|Pom|Mon|Din|Kim|Bot|Pix|Tom|Zap|Dom|Zom|Bon) ?\1\b(?:\s*[（(](集集|塔塔|朋朋|萌萌|定定|金金|霸霸|皮皮|通通|渣渣|當當|鬆鬆|幫幫)[）)])?/gi;
const CJK=/[　-〿一-鿿＀-￯]/;
function zhName(s){if(s==null)return s;s=String(s);if(!/(Gig|Tal|Pom|Mon|Din|Kim|Bot|Pix|Tom|Zap|Dom|Zom|Bon) ?\1/i.test(s))return s;
 return s.replace(ZH_RE,(m,a,cn,off,all)=>{const zh=ZHN[a.toLowerCase()];return zh}).replace(/([一-鿿，。：「]) (集集|塔塔|朋朋|萌萌|定定|金金|霸霸|皮皮|通通|渣渣|當當|鬆鬆|幫幫)/g,'$1$2').replace(/(集集|塔塔|朋朋|萌萌|定定|金金|霸霸|皮皮|通通|渣渣|當當|鬆鬆|幫幫) (?=[一-鿿，。：])/g,'$1')}
window.zhName=zhName;
Object.assign(WHN,{'Bot Bot':'霸霸','Din Din':'定定','Mon Mon':'萌萌','Zom Zom':'鬆鬆','Pix Pix':'皮皮','Zap Zap':'渣渣','Dom Dom':'當當','Bon Bon':'幫幫'});
const WORDX=[[/交給 AI 做（變成工作）/g,'交給大器做'],[/交給 AI 做/g,'交給大器做'],[/去執行/g,'交給大器做']];
// 6 來源那行：白話一句＋可展開原文
const SRC_RE=/來源：\s*(\S+)\s+(\S+)\s+(\d{1,2}\/\d{1,2})(?:\s+\d{1,2}:\d{2})?\s*「([^」]*)」?/;
function siteName(u){let h='';try{h=new URL(String(u).replace(/[…⋯]+$/,'')).hostname.replace(/^www\./,'')}catch(e){return '網頁'}
 const M=[[/accupass/,'Accupass 活動通'],[/kktix/,'KKTIX'],[/facebook|fb\.(com|me)/,'Facebook'],[/instagram/,'Instagram'],[/youtu/,'YouTube'],[/forms\.gle|docs\.google\.com\/forms/,'Google 表單'],[/docs\.google/,'Google 文件'],[/drive\.google/,'Google 雲端硬碟'],[/notion/,'Notion'],[/line\.me/,'LINE'],[/threads/,'Threads'],[/^(x|twitter)\.com/,'X'],[/beclass/,'BeClass'],[/surveycake/,'SurveyCake']];
 const f=M.find(x=>x[0].test(h));return f?f[1]:h}
function srcSay(m){const [,grp,who,date,q]=m;const us=q.match(/https?:\/\/[^\s」]+/g)||[];let txt=q.replace(/https?:\/\/[^\s」]+/g,' ').replace(/[…⋯]+/g,'').replace(/\s+/g,' ').trim();
 const site=us.length?siteName(us[0]):'';const sum=txt&&site?`${txt}（附 ${site} 連結）`:txt||(site?`${site} 連結`:'（沒有內容）');
 return {line:`${zhName(who)} ${date} 在${grp}說：${clip(sum,48)}`,orig:q}}
function textSwap(root){if(!root||!root.querySelectorAll)return;const SKIP=/^(TEXTAREA|INPUT|SCRIPT|STYLE|SELECT)$/;
 const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentNode;if(!p||SKIP.test(p.nodeName)||(p.closest&&p.closest('.srcw,[contenteditable="true"]')))return NodeFilter.FILTER_REJECT;const v=n.nodeValue;return /(Gig|Tal|Pom|Mon|Din|Kim|Bot|Pix|Tom|Zap|Dom|Zom|Bon) ?\1|去執行|交給 AI 做|來源：/i.test(v)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}});
 const ns=[];while(w.nextNode())ns.push(w.currentNode);
 ns.forEach(n=>{let v=n.nodeValue;const sm=n.parentNode.closest&&n.parentNode.closest('#sheet,#page')?SRC_RE.exec(v):null;
  if(sm){const o=srcSay(sm),pre=v.slice(0,sm.index).replace(/來源：\s*$/,''),post=v.slice(sm.index+sm[0].length);const box=document.createElement('span');box.className='srcw';
   box.innerHTML=`<span class="srcw-t">${esc(o.line)}</span><button type="button" class="srcx" aria-expanded="false">看原文</button><span class="srco" hidden>${esc(o.orig)}</span>`;
   const f=document.createDocumentFragment();if(pre)f.appendChild(document.createTextNode(zhName(pre)));f.appendChild(box);if(post)f.appendChild(document.createTextNode(zhName(post)));n.parentNode.replaceChild(f,n);return}
  let x=zhName(v);if(n.parentNode.closest&&n.parentNode.closest('button,.mb,.btn,.note,p,small,.jsug-t'))WORDX.forEach(([r,t])=>{x=x.replace(r,t)});if(x!==v)n.nodeValue=x});
 root.querySelectorAll('[aria-label],[title]').forEach(e=>['aria-label','title'].forEach(a=>{const v=e.getAttribute(a);if(v&&/(Gig|Tal|Pom|Mon|Din|Kim|Bot) ?\1|去執行|交給 AI 做/i.test(v)){let x=zhName(v);WORDX.forEach(([r,t])=>{x=x.replace(r,t)});e.setAttribute(a,x)}}))}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.srcx');if(!b)return;e.stopPropagation();const o=b.nextElementSibling;if(!o)return;const on=o.hidden;o.hidden=!on;b.setAttribute('aria-expanded',String(on));b.textContent=on?'收起原文':'看原文'},true);
{const _r=render;render=function(d){_r(d);textSwap(document.getElementById('app'))}}
{const _t=toast;toast=function(msg,fn){return _t(typeof msg==='string'?zhName(msg).replace(/交給 AI 做/g,'交給大器做'):msg,fn)}}
new MutationObserver(ms=>{ms.forEach(m=>m.addedNodes.forEach(x=>{if(x.nodeType===1)textSwap(x);else if(x.nodeType===3&&x.parentNode&&x.parentNode.nodeType===1)textSwap(x.parentNode)}))}).observe(document.body,{childList:true,subtree:true});

// 7 卡點：可改、可交給大器、可清掉
const BLKS={};
function blkCard(id){const p=DB.proj.find(x=>x.id===id),c=p&&p.raw;return c&&c.progressBlocker?c:null}
{const _p=pageHTML;pageHTML=function(){const h=_p(),m=/^proj:(.+)$/.exec(S.page||'');if(!m)return h;const id=m[1],c=blkCard(id);if(!c)return h;
 const sent=BLKS[id]&&Date.now()-BLKS[id]<30*60e3;
 const box=`<section class="blkx"><p class="blkx-h">▲ 卡在這裡</p><p class="blkx-t">${esc(c.progressBlocker)}</p>${sent?`<p class="blkx-ok">${ic('check')}已交給大器處理，解掉會清掉這條並寫回進度</p>`:''}<div class="blkx-a">${B('✎ 改','sheet','blkedit:'+id,'sm')}${sent?'':B(bm('daqi')+'交給大器處理','blkhand',id,'sm')}${B('✓ 我處理好了','blkdone',id,'sm')}</div></section>`;
 let x=h.replace(/<div><dt>卡在哪<\/dt><dd>[\s\S]*?<\/dd><\/div>/,'');const i=x.indexOf('<dl class="pk">'),j=i<0?-1:x.indexOf('</dl>',i);
 return j<0?x.replace(/(<h1 class="pt">[\s\S]*?<\/h1>)/,'$1'+box):x.slice(0,j+5)+box+x.slice(j+5)}}
{const _s=sheetHTML;sheetHTML=function(){const m=/^blkedit:(.+)$/.exec(S.sheet||'');if(!m)return _s();const c=blkCard(m[1]);if(!c)return shHead('這條卡點已經清掉了');
 return shHead('改卡點')+`<p class="note">寫現在卡在哪。清空就等於沒有卡住。</p><textarea id="blkIn" class="blkin" rows="3" aria-label="卡點">${esc(c.progressBlocker)}</textarea><div class="btns">${B('存好','blksave',m[1],'pri wide')}</div>`}}
async function blkSet(id,text,msg,undo){const c=LV.items.find(x=>x.id===id);try{const n=await LV.api.act(id,'blocker',{text});const i=LV.items.findIndex(x=>x.id===id);if(n&&i>-1)LV.items[i]=n;LV.sig='';paint();
  if(!text&&n&&n.progressBlocker){toast('資料庫沒清掉這條，我請大器處理');return}toast(msg,undo);reload()}catch(e){toast('沒有成功：'+LERR(e))}}
ACT.blksave=id=>{const el=document.getElementById('blkIn'),c=blkCard(id);if(!el||!c)return;const v=el.value.trim(),old=c.progressBlocker;if(v===old){ACT.close&&ACT.close();return}
 closeThen(()=>blkSet(id,v,v?'卡點改好了':'清掉了，不算卡住',()=>blkSet(id,old,'還原了')))};
ACT.blkdone=id=>{const c=blkCard(id);if(!c)return;const old=c.progressBlocker;delete BLKS[id];blkSet(id,'','清掉了，不算卡住',()=>blkSet(id,old,'還原了'))};
ACT.blkhand=async id=>{const c=blkCard(id);if(!c)return;if(!LV.api||!LV.api.say){toast('離線中，連上再按');return}
 const body=`【卡點處理】${clip(String(c.title||'這個案子'),60)}\n卡在：${c.progressBlocker}\n卡片：item ${id}\n請想辦法解掉（換路、找替代、問對的人）；解掉後清空卡點（opp_progress_set p_blocker 空字串）並寫回進度；需要老大決定或本人做的，開要你做卡。`;
 BLKS[id]=Date.now();render('keep');
 try{await LV.api.say(id,body,'daqi')}catch(e){delete BLKS[id];render('keep');toast('沒送出：'+LERR(e));return}
 try{const n=await LV.api.act(id,'runset',{status:'running',note:'【大器】處理卡點中'});const i=LV.items.findIndex(x=>x.id===id);if(n&&i>-1)LV.items[i]=n;LV.sig='';paint()}catch(e){}
 toast('交給大器處理了，解掉會寫回這張卡')};
WRITE.push('blksave','blkdone','blkhand');
/* ---------- v96（2026-11-24）：生活房間小臉收斂、朋朋安排就地選時段、萌萌進度頁重排、步驟卡寬裕與選 CLI ----------
   msg 445：「這個案件好像有點多雨，只要有他的小臉就可以」「這邊有好多重複的小臉」→ 備品「要買」整段只留一張朋朋的臉（按了＝請朋朋買），列上的萌萌臉與底下那排小臉拿掉。
   msg 463：「這邊我想要就是小小的按鈕，可以選時間這樣 不想要點了，又是打開朋朋的對話視窗 只希望他針對那一個代辦的安排顯示在那邊，然後我可以有選項或者是空格往下執行」
     → 待辦「請朋朋安排」直接送（不開對話），卡上顯示「朋朋排時段中」；朋朋回的 2～3 個時段變成卡上的小按鈕，點了送「就這個時段」，卡上改「已選 <時段>，朋朋代辦中」；也可以「自己填時間」。
   msg 466：「這邊也是這個排版很怪」→ 想買詳情（wdet:）重排：上面圖、價格、通路，萌萌狀態一條，三格資訊，萌萌回覆一塊，按鈕一排。
   msg 414：「這邊排版有點擁堵 可以再寬裕一點」「我希望這邊也可以讓我選擇各種C L I然後會有對應指令跟模型」→ 步驟卡放寬；多一個 CLI 選擇，選了顯示對應指令與帳號，模型清單跟著換，存進 note〔…｜CLI：codex B〕。 */

// 1 備品「要買」：一張朋朋的臉
{const f=zoneLife;zoneLife=function(){const h=f();if(S.sub.life!=='sup')return h;
 const tp=document.createElement('template');tp.innerHTML=h;const cb=tp.content.querySelector('[data-act="cartbuy"]');if(!cb)return h;
 const sec=cb.closest('section');let asked=false;try{const c=JSON.parse(localStorage.getItem('zl_cart_ask')||'null');asked=!!(c&&Date.now()-c.at<3*864e5)}catch(e){}
 const nb=document.createElement('template');nb.innerHTML=`<button class="cartf" data-act="cartbuy" aria-label="請朋朋買這幾樣" title="請朋朋買">${bm('peng',asked?'thinking':'')}</button>`;cb.replaceWith(nb.content);
 if(sec){sec.querySelectorAll('.aifs').forEach(x=>x.remove());sec.querySelectorAll('.rowi .bm,.cartst .bm').forEach(x=>x.remove());
  sec.querySelectorAll('[data-act="supcmp"]').forEach(b=>{b.textContent=b.textContent.replace(/請萌萌比價/,'比價').trim()})}
 return tp.innerHTML}}

// 2 待辦：朋朋安排就地選時段
const LTP='zl_lt_pick';let ltPicks={};try{ltPicks=JSON.parse(localStorage.getItem(LTP)||'{}')}catch(e){}
const LT2={own:{}};
function ltOk(m){return m&&Date.now()-m.at<14*864e5&&String(m.body||'').indexOf('【測試】')<0}
function ltYear(mo){const n=new Date();let y=n.getFullYear();if(mo<n.getMonth()+1-2)y++;return y}
function ltSlots(txt){const out=[],seen={};const re=/(\d{1,2})\s*\/\s*(\d{1,2})[^\n\d]{0,10}?(上午|中午|下午|晚上)?\s*(\d{1,2})(?:\s*[:：]\s*(\d{2})|\s*點(半)?)(?:\s*[-~～到至]\s*(上午|中午|下午|晚上)?\s*(\d{1,2})(?:\s*[:：]\s*(\d{2})|\s*點(半)?)?)?/g;let m;
 const H=(ap,h)=>{h=+h;if((ap==='下午'||ap==='晚上')&&h<12)h+=12;if(ap==='中午'&&h<11)h+=12;return h};
 while((m=re.exec(String(txt||'')))&&out.length<3){const mo=+m[1],d=+m[2];if(mo<1||mo>12||d<1||d>31)continue;const h1=H(m[3],m[4]);if(h1>23)continue;
  const mi1=m[5]||(m[6]?'30':'00'),dt=new Date(ltYear(mo),mo-1,d),wd=WD[dt.getDay()];
  let lab=`${mo}/${d}（${wd}）${String(h1).padStart(2,'0')}:${mi1}`;if(m[8]){const h2=H(m[7]||m[3],m[8]);if(h2<=24)lab+=`～${String(h2).padStart(2,'0')}:${m[9]||(m[10]?'30':'00')}`}
  if(!seen[lab]){seen[lab]=1;out.push(lab)}}
 return out}
function ltSt2(t){const ms=(lpMsgs||[]).filter(ltOk);let q=-1,p=-1;
 ms.forEach((m,i)=>{if(m.kind!=='user'||String(m.body).indexOf('待辦編號 '+t.id)<0)return;if(/就這個時段/.test(m.body))p=i;else q=i});
 const lp=ltPicks[t.id]&&Date.now()-ltPicks[t.id].at<7*864e5?ltPicks[t.id]:null,la=ltAsks[t.id]&&Date.now()-ltAsks[t.id]<864e5?ltAsks[t.id]:0;
 if(p>q&&p>-1){const sl=(ltClean(ms[p].body).match(/就這個時段[：:]\s*(.+)$/)||[])[1]||(lp&&lp.slot)||'';const r=ms.slice(p+1).find(m=>m.kind!=='user');return {k:'picked',slot:sl.trim(),at:ms[p].at,r}}
 if(q<0){if(lp)return {k:'picked',slot:lp.slot,at:lp.at};if(la)return {k:'wait',at:la};return null}
 if(lp&&lp.at>ms[q].at)return {k:'picked',slot:lp.slot,at:lp.at};
 const later=ms.slice(q+1).filter(m=>m.kind!=='user');if(!later.length)return {k:'wait',at:ms[q].at};
 const withS=later.slice().reverse().find(m=>ltSlots(m.body).length),r=withS||later[later.length-1];return {k:'slots',slots:withS?ltSlots(withS.body):[],r}}
const ltClean=s=>String(s||'').replace(/^［[^］]*］\s*/,'').replace(/\s+/g,' ').trim();
function lt2HTML(t){const st=ltSt2(t),id=esc(t.id),own=LT2.own[t.id];
 const ownBox=own?`<div class="lt2-own"><input id="lt2In_${id}" type="text" maxlength="60" autocomplete="off" placeholder="例：11/28 下午三點、週末都可以" aria-label="自己填時間"><button type="button" class="lt2-go" data-act="ltown" data-id="${id}">送出</button></div>`:'';
 const ownC=`<button type="button" class="lt2-c dim" data-act="ltownt" data-id="${id}" aria-expanded="${!!own}">${own?'收起':'自己填時間'}</button>`;
 if(!st)return `<div class="lt2"><button type="button" class="lt2-c ask" data-act="ltplan" data-id="${id}">${bm('peng','','sm')}<span>請朋朋排時間</span></button>${ownC}</div>${ownBox}`;
 if(st.k==='wait')return `<div class="lt2"><span class="lt2-st run">${bm('peng','thinking','sm')}<span>朋朋排時段中・${LHM(st.at)} 送出</span></span></div>`;
 if(st.k==='slots')return `<div class="lt2 col">${st.slots.length?`<p class="lt2-h">${bm('peng','','sm')}<span>朋朋排了這幾個時段，點一個：</span></p>`:`<p class="lt2-h">${bm('peng','','sm')}<span>朋朋：${esc(clip(ltClean(st.r.body),60))}</span></p>`}<div class="lt2-sl">${st.slots.map((s,i)=>`<button type="button" class="lt2-c slot" data-act="ltslot" data-id="${id}|${i}">${esc(s)}</button>`).join('')}${ownC}<button type="button" class="lt2-c dim" data-act="ltchat" data-id="${id}">看朋朋回什麼</button></div></div>${ownBox}`;
 return `<div class="lt2 col"><p class="lt2-st ok">${ic('check')}<span>已選 ${esc(st.slot||'時段')}，朋朋代辦中</span></p>${st.r?`<p class="lt2-r">朋朋：${esc(clip(ltClean(st.r.body),70))}</p>`:''}<div class="lt2-sl">${ownC.replace('自己填時間','改時間')}${st.r?`<button type="button" class="lt2-c dim" data-act="ltchat" data-id="${id}">看朋朋回什麼</button>`:''}</div></div>${ownBox}`}
{const f=zoneLife;zoneLife=function(){const h=f();if(S.sub.life!=='todo'||!LV.life)return h;
 const tp=document.createElement('template');tp.innerHTML=h;let ch=0;
 tp.content.querySelectorAll('.rowi[data-card]').forEach(r=>{const t=LT(r.getAttribute('data-card'));r.querySelectorAll('.lta').forEach(x=>{x.remove();ch=1});if(!t||t.done)return;r.insertAdjacentHTML('beforeend',lt2HTML(t));ch=1});
 return ch?tp.innerHTML:h}}
async function ltSend(t,body,shown){if(!LV.api||!LV.api.say){toast('離線中，連上再按');return false}
 try{await LV.api.say(null,`［老大在逐流按了動作鈕，給你的指示：${body.replace(/[［］]/g,c=>c==='［'?'（':'）').replace(/\n/g,' ')}］\n${shown}`,'peng')}catch(e){toast('沒送出：'+LERR(e));return false}
 lpAt=0;setTimeout(lpLoad,600);return true}
ACT.ltplan=async id=>{const t=LT(id);if(!t)return;const free=calFree(14).join('；');ltAsks[id]=Date.now();try{localStorage.setItem(LTA,JSON.stringify(ltAsks))}catch(e){}LV.sig='';paint();
 const ok=await ltSend(t,`【請朋朋安排】待辦「${t.name}」（待辦編號 ${id}）${t.note?'，備註：'+t.note:''}。請先看我未來 14 天的行事曆空檔，列 2 到 3 個適合的時段給我選，每個時段一行，格式「時段：11/26（三）14:00～15:00」，我會在逐流點一個。我選定前先不要訂。選定後能代辦的（預約、訂位、訂票）先處理；要付款一律開付款授權單，等我在逐流按付款鈕，不要直接付。我的行事曆（9:00 到 21:00 之間至少 1 小時的空檔）：${free}`,`請幫我排「${t.name}」的時間`);
 if(ok)toast('交給朋朋了，時段排好會出現在這張卡上');else{delete ltAsks[id];try{localStorage.setItem(LTA,JSON.stringify(ltAsks))}catch(e){}LV.sig='';paint()}};
async function ltPick(id,slot){const t=LT(id);if(!t||!slot)return;const prev=ltPicks[id];ltPicks[id]={slot,at:Date.now()};try{localStorage.setItem(LTP,JSON.stringify(ltPicks))}catch(e){}delete LT2.own[id];LV.sig='';paint();
 const ok=await ltSend(t,`待辦「${t.name}」（待辦編號 ${id}）老大選了時段，就這個時段：${slot}。能代辦的（預約、訂位、訂票）先處理；要付款開付款授權單等老大在逐流按，不要直接付。好了或訂不到在逐流回我`,`就這個時段：${slot}`);
 if(ok)toast('跟朋朋說好了：'+slot);else{if(prev)ltPicks[id]=prev;else delete ltPicks[id];try{localStorage.setItem(LTP,JSON.stringify(ltPicks))}catch(e){}LV.sig='';paint()}}
ACT.ltslot=v=>{const [id,i]=String(v).split('|'),t=LT(id);if(!t)return;const st=ltSt2(t);const s=st&&st.slots&&st.slots[+i];if(s)ltPick(id,s)};
ACT.ltownt=id=>{LT2.own[id]=!LT2.own[id];LV.sig='';paint();if(LT2.own[id])setTimeout(()=>{const x=document.getElementById('lt2In_'+id);if(x)x.focus()},60)};
ACT.ltown=id=>{const x=document.getElementById('lt2In_'+id),v=x?x.value.trim():'';if(!v){toast('寫一下想要的時間');if(x)x.focus();return}if(x)x.blur();ltPick(id,v.slice(0,60))};
ACT.ltchat=(id,el)=>openChat('peng','lt:'+id,el,null);
document.addEventListener('keydown',e=>{const t=e.target;if(e.key!=='Enter'||e.isComposing||!t||!t.id||t.id.indexOf('lt2In_')!==0)return;e.preventDefault();ACT.ltown(t.id.slice(6))});
setInterval(()=>{if(document.hidden||S.tab!=='life'||S.sub.life!=='todo'||S.sheet||!LV.life)return;if(ltodos().some(t=>{if(t.done)return false;const s=ltSt2(t);return s&&(s.k==='wait'||(s.k==='picked'&&!s.r))})){lpAt=0;lpLoad()}},60000);   // 2026-11-24 DB 降載：8 秒改 60 秒
WRITE.push('ltplan','ltslot','ltown');

// 3 想買詳情重排
{const _s=sheetHTML;sheetHTML=function(){const a=(S.sheet||'').split(':');if(a[0]!=='wdet')return _s();const w=W(a.slice(1).join(':'));if(!w)return shHead('這項不在了');
 const f=wfInfo(w),fr=f.fresh,any=fr.price||fr.shop||fr.pay||fr.url||fr.img,rp=f.rp;
 const st=rp&&rp.msg?`<p class="wd2-st">${bm('mon','','sm')}<span>萌萌回了・${LMD(rp.msg.at)} ${LHM(rp.msg.at)}</span></p>`:rp&&rp.run?`<p class="wd2-st run">${bm('mon','thinking','sm')}<span>萌萌找資料中・${LHM(rp.at)} 送出，回來會出現在這裡</span></p>`:`<p class="wd2-st dim">${bm('mon','','sm')}<span>還沒請萌萌找</span></p>`;
 const cell=(l,v,nw)=>`<div class="wd2-c${v?'':' none'}"><small>${l}${nw?'<i>新</i>':''}</small><b>${esc(v||'還沒找到')}</b></div>`;
 const KEY=/^(價格|通路|付款方式|付費方式|連結|網址|圖片)\s*[：:]/;
 const rest=rp&&rp.msg?String(rp.msg.body).replace(/^［[^］]*］\s*/,'').split(/\n+/).map(l=>l.trim()).filter(l=>l&&!KEY.test(l.replace(/^[\-•*\d.、)）]+\s*/,''))):[];
 let site='';try{site=f.url?new URL(f.url).hostname.replace(/^www\./,''):''}catch(e){}
 return shHead(esc(w.name))
  +`<div class="wd2-hero">${wimgH(w,1)}<div class="wd2-hm"><p class="wd2-p">${esc(f.price||'還沒有價格')}</p><p class="wd2-s">${esc(f.shop||'通路還沒找到')}</p>${f.url?`<a class="wd2-l" href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">${esc(site||'商品頁')} ↗</a>`:''}</div></div>`
  +st+`<div class="wd2-g">${cell('價格',f.price,fr.price)}${cell('通路',f.shop,fr.shop)}${cell('付款方式',f.pay,fr.pay)}</div>`
  +(rest.length?`<div class="wd2-rp"><p class="wd2-rh">萌萌說</p>${rest.slice(0,12).map(l=>`<p>${esc(clip(l,160))}</p>`).join('')}</div>`:'')
  +(!rp?`<p class="note">按「萌萌先找」，她會找價格、通路、付款方式；沒指定品牌會先問你需求。</p>`:'')
  +(any?`<div class="btns">${B('把新找到的存到這張卡','wfsave',w.id,'pri wide')}</div>`:'')
  +`<div class="wd2-a">${rp?mb('開萌萌的對話','wfchat',w.id):B(bm('mon','','sm')+'萌萌先找','wishfind',w.id,'pri')}${mb('✎ 編輯','ledit',w.id)}</div>`}}

// 4 步驟卡：寬裕＋選 CLI（2026-11-24 現查：agy models、cursor-agent --list-models、codex debug models、grok models）
const SCLI=[
 {k:'claude',acct:'好咖帳號',cmd:'claude -p "…" --model {m}',models:[['claude-opus-5-5','Opus 5.5'],['claude-fable-5-2','Fable 5.2'],['claude-sonnet-5-5','Sonnet 5.5'],['claude-haiku-5-5','Haiku 5.5']]},
 {k:'claude B',acct:'個人帳號',cmd:'CLAUDE_CONFIG_DIR=~/.claude-b claude -p "…" --model {m}',models:[['claude-opus-5-5','Opus 5.5'],['claude-fable-5-2','Fable 5.2'],['claude-sonnet-5-5','Sonnet 5.5'],['claude-haiku-5-5','Haiku 5.5']]},
 {k:'codex',acct:'好咖帳號（Team）',cmd:'CODEX_HOME=~/.codex-company codex exec -m {m} "…"',models:[['gpt-6.1-sol','預設'],['gpt-6.2-sol',''],['gpt-6.2-astra',''],['gpt-6.1-terra',''],['gpt-6-luna','']]},
 {k:'codex B',acct:'個人帳號（Pro Lite）',cmd:'CODEX_HOME=~/.codex-personal codex exec -m {m} "…"',models:[['gpt-6.1-sol','預設'],['gpt-6.2-sol',''],['gpt-6.2-astra',''],['gpt-6.1-terra',''],['gpt-6-luna','']]},
 {k:'agy',acct:'好咖帳號',cmd:'agy -p "…" --model {m}',models:[['gemini-3.8-flash-high','預設・查證'],['gemini-3.8-flash-medium','快查'],['gemini-3.8-flash-low','格式整理'],['gemini-4-argon-medium','長推理'],['gemini-4-argon-high','吃重任務']]},
 {k:'agy B',acct:'個人帳號',cmd:'agy B -p "…" --model {m}',models:[['gemini-3.8-flash-high','預設・查證'],['gemini-3.8-flash-medium','快查'],['gemini-3.8-flash-low','格式整理'],['gemini-4-argon-medium','長推理'],['gemini-4-argon-high','吃重任務']]},
 {k:'cursor',acct:'本人帳號',cmd:'Cursor -p "…" --model {m} --output-format text',models:[['auto','預設'],['composer-2.5',''],['gpt-5.3-codex',''],['claude-opus-5-thinking-high','第三方，另計'],['cursor-grok-4.5-high','']]},
 {k:'grok',acct:'本人帳號',cmd:'grok -p "…" -m {m} --permission-mode plan',models:[['grok-4.6','預設'],['grok-4.5','']]}];
const SCLIK=SCLI.map(c=>c.k),cliOf=k=>SCLI.find(c=>c.k===k)||null;
const cliMdl=(c,m)=>c.models.some(x=>x[0]===m)?m:c.models[0][0];
const cliCmd=(c,m)=>c.cmd.replace('{m}',m);
{const _o=stepOf;stepOf=function(s){const o=_o(s);o.cli='';const m=SMETA.exec(s.note||'');if(m)m[1].split('｜').forEach(kv=>{const i=kv.indexOf('：');if(kv.slice(0,i)==='CLI'&&SCLIK.includes(kv.slice(i+1)))o.cli=kv.slice(i+1)});return o}}
{const _n=stepNote;stepNote=function(o){const r=_n(o);if(!o.cli)return r;const m=SMETA.exec(r);return m?`〔${m[1]}｜CLI：${o.cli}〕`+r.slice(m[0].length):`〔CLI：${o.cli}〕`+r}}
stdLoad=function(id){const it=todoOf(id),c=it&&it.raw;if(!c)return null;const st=(c.progressSteps||[]).map(s=>{const o=stepOf(s),cl=cliOf(o.cli);
 return {name:o.name,status:o.status,cli:cl?cl.k:'',model:cl?cliMdl(cl,o.model):(SMDL.some(m=>m[0]===o.model)?o.model:'不指定'),mode:o.mode==='開子視窗'?'開子視窗':'監工本身',skills:skSplit(o.skill),note:o.note,pk:''}});
 if(!st.length)st.push(Object.assign(stdNew(),{cli:''}));return {id,steps:st}};
{const _h=stcHTML;stcHTML=function(o,i){const cl=cliOf(o.cli);let h;
 if(o.pk==='cli'){const sv=o.pk;o.pk='';h=_h(o,i);o.pk=sv;
  const opts=`<button type="button" class="stc-o${!cl?' on':''}" data-act="stcset" data-id="${i}|cli|"><b>不指定</b><small>照預設</small></button>`+SCLI.map(c=>`<button type="button" class="stc-o${cl&&cl.k===c.k?' on':''}" data-act="stcset" data-id="${i}|cli|${esc(c.k)}"><b>${esc(c.k)}</b><small>${esc(c.acct)}</small></button>`).join('');
  h=h.replace('<div class="stc-pk" role="group" aria-label="選狀態"><div></div></div>',`<div class="stc-pk open" role="group" aria-label="選 CLI"><div>${opts}</div></div>`)}
 else if(o.pk==='model'&&cl){const sv=o.pk;o.pk='';h=_h(o,i);o.pk=sv;
  const opts=cl.models.map(([m,n])=>`<button type="button" class="stc-o${m===o.model?' on':''}" data-act="stcset" data-id="${i}|model|${esc(m)}"><b>${esc(m)}</b><small>${esc(n||cl.k)}</small></button>`).join('');
  h=h.replace('<div class="stc-pk" role="group" aria-label="選狀態"><div></div></div>',`<div class="stc-pk open" role="group" aria-label="選模型"><div>${opts}</div></div>`).replace(/(data-act="stcpk" data-id="\d+\|model" aria-expanded=")false/,'$1true')}
 else h=_h(o,i);
 const chip=`<button type="button" class="stc-c cli${cl?'':' dim'}" data-act="stcpk" data-id="${i}|cli" aria-expanded="${o.pk==='cli'}"><span aria-hidden="true">›_</span>${esc(cl?cl.k:'CLI')}</button>`;
 h=h.replace(/(<button type="button" class="stc-c mdl)/,chip+'$1');
 if(cl)h=h.replace(/(<span aria-hidden="true">◆<\/span>)[^<]*/,'$1'+esc(o.model)).replace('class="stc-c mdl dim"','class="stc-c mdl"');
 if(cl){const pkEnd=h.indexOf('</div></div>',h.indexOf('class="stc-pk'))+12;h=h.slice(0,pkEnd)+`<div class="stc-cmd"><small>${esc(cl.acct)}</small><code>${esc(cliCmd(cl,o.model))}</code></div>`+h.slice(pkEnd)}
 return h}}
{const _p=ACT.stcpk;ACT.stcpk=v=>{const [i,k]=String(v).split('|');if(k!=='cli'&&!(k==='model'&&STD&&STD.steps[+i]&&cliOf(STD.steps[+i].cli)))return _p(v);
 if(!STD)return;const o=STD.steps[+i];if(!o)return;o.pk=o.pk===k?'':k;STD.steps.forEach((x,j)=>{if(j!==+i&&x.pk){x.pk='';stcRedraw(j)}});stcRedraw(+i)}}
{const _s=ACT.stcset;ACT.stcset=v=>{const [i,k,val]=String(v).split('|');if(k!=='cli')return _s(v);if(!STD)return;const o=STD.steps[+i];if(!o)return;
 const cl=cliOf(val);o.cli=cl?cl.k:'';o.model=cl?cliMdl(cl,o.model):(SMDL.some(m=>m[0]===o.model)?o.model:'不指定');o.pk='';const n=stcRedraw(+i);if(n){const c=n.querySelector('.stc-c.cli');if(c){c.classList.add('stpop');c.focus({preventScroll:true})}}}}
{const _a=ACT.stadd;ACT.stadd=()=>{_a();if(STD){const o=STD.steps[STD.steps.length-1];if(o&&o.cli==null)o.cli=''}}}
{const _v=ACT.stsave;ACT.stsave=id=>{if(STD&&STD.id===id){const _n2=stepNote;let k=0;
  // 存檔時照順序把每步的 CLI 帶進 stepNote（原本的 stsave 只傳模型、方式、技能、備註）
  const live=STD.steps.filter(s=>s.name||s.note||s.skills.length);const q=live.map(s=>s.cli||'');
  stepNote=function(o){return _n2(Object.assign({},o,{cli:q[k++]||''}))};try{return _v(id)}finally{stepNote=_n2}}return _v(id)}}

/* ---------- 2026-11-24：公司卡也能「做完／改步驟／派工」，經肉咖同步回皮條客（拍板 current-company-sync-1124） ----------
   老大原話（逐流 msg 508）：「反正在這邊我的行為動作是可以同步到皮條客那邊去的 另外公司專案的部分也是在這邊而且也適用監工與子監工邏輯 以及各種CLI工具 差別就插在我要在公司那台電腦上鎖還是我的電腦上面做」
   老大選：照建議做（逐流不碰皮條客鑰匙，全經肉咖）。
   1 公司卡多三顆：做完、步驟、派工。逐流只寫一張單給肉咖（hub_company_tasks），公司電腦每分鐘收單，肉咖在皮條客照做再回報。
   2 步驟卡沿用同一套（監工／子視窗、模型、CLI、@技能），每步多一顆「在哪做」：公司電腦（肉咖）或我電腦（大器）。存在 note〔…｜在：公司〕。
     步驟存 hub_company_cards.steps（hub_company_steps_set，遷移 20261124_公司卡步驟）；資料庫還沒套時，拿最近一張【改步驟】單裡的〔steps〕顯示。
   3 派工：選公司的步驟派給肉咖；選我電腦的照大器流程（開大器對話帶這張卡送出，另記 cotask）。 */
{const _o=stepOf;stepOf=function(s){const o=_o(s);o.where='';const m=SMETA.exec(s.note||'');if(m)m[1].split('｜').forEach(kv=>{const i=kv.indexOf('：');if(kv.slice(0,i)==='在'&&/^(公司|我電腦)$/.test(kv.slice(i+1)))o.where=kv.slice(i+1)});return o}}
{const _n=stepNote;stepNote=function(o){const r=_n(o);if(!o.where)return r;const m=SMETA.exec(r);return m?`〔${m[1]}｜在：${o.where}〕`+r.slice(m[0].length):`〔在：${o.where}〕`+r}}
const CO_STP=/〔steps〕(\[[\s\S]*\])\s*$/;
function coStepsOf(c){if(!c)return [];if(Array.isArray(c.steps))return c.steps;const d=coData(),ts=(d&&d.tasks||[]).filter(t=>t.card_id===c.id&&/^【改步驟】/.test(t.body||''));
 for(const t of ts){const m=CO_STP.exec(t.body||'');if(m){try{const a=JSON.parse(m[1]);if(Array.isArray(a))return a}catch(e){}}}return []}
const coWhere=o=>o.where==='我電腦'?'我電腦':'公司';
const coWho=w=>w==='我電腦'?'大器・我電腦':'肉咖・公司電腦';
const coTags=o=>[coWho(coWhere(o)),o.mode==='開子視窗'?'子視窗':'監工',o.cli||'',o.model&&o.model!=='不指定'?o.model:'',o.skill?'@'+o.skill:''].filter(Boolean).join('・');
const coStLine=(o,k)=>`${k+1}. ${o.name}（${coTags(o)}${o.status&&o.status!=='pending'?'・'+stsL(o.status):''}）${o.note?'：'+o.note:''}`;
// 卡面三顆
coCard=function(c){const id='co:'+c.id,n=coDays(c.due),rt=coTaskOf(c.id,'rouka'),dt=coTaskOf(c.id,'daqi'),st=coStepsOf(c).map(stepOf),dn=st.filter(o=>o.status==='done').length;
 return `<article class="card cardx" data-card="${esc(id)}"><div class="meta">${chip(coDue(c),n!=null&&n<=3)}<span class="lbl">${esc(brief(c.project||'公司',c.owner||''))}</span></div><h3>${cgo(esc(c.ask||c.title),'sheet',id)}</h3>${c.ask?`<p class="owhat">${esc(c.title)}</p>`:''}${c.status?`<p class="note">皮條客：${esc(c.status)}</p>`:''}${st.length?`<p class="note">步驟 ${dn}／${st.length}</p>`:''}`
 +kfoot(mb('做完','sheet','codone:'+c.id)+mb('步驟','sheet','stepx:co:'+c.id)+mb('派工','sheet','codisp:'+c.id),[aiF('rouka',id,coSt(rt),{do:'coRouka',arg:c.id}),aiF('daqi',id,coSt(dt))],'')+`</article>`};
// 詳情：加步驟清單與三顆
{const _cs=coSheet;coSheet=function(id){const h=_cs(id),c=coFind(id);if(!c)return h;const st=coStepsOf(c).map(stepOf);
 const sec=`<p class="h4">步驟卡</p>${st.length?`<ol class="ydsteps stlist">${st.map(o=>`<li>${esc(o.name)}<small class="d2">${esc(coTags(o))}${o.status&&o.status!=='pending'?'・'+esc(stsL(o.status)):''}</small></li>`).join('')}</ol>`:'<p class="note">還沒排步驟。排了之後每一步可以選在公司電腦（肉咖）或我電腦（大器）做。</p>'}`;
 const btns=`<div class="btns">${B('做完','sheet','codone:'+id)}${B(st.length?'改步驟':'排步驟','sheet','stepx:co:'+id)}${B('派工','sheet','codisp:'+id,'pri')}</div>`;
 const i=h.indexOf('<div class="btns">');return i<0?h+sec+btns:h.slice(0,i)+sec+btns+h.slice(i).replace(B('派肉咖做','coRouka',id,'pri'),B('另外交代肉咖','coRouka',id))}}
// 做完：確認一次
function coDoneSheet(id){const c=coFind(id);if(!c)return shHead('這張公司卡不在了');const dt=(coData().tasks||[]).find(t=>t.card_id===id&&/^【做完】/.test(t.body||'')&&!['failed','cancelled'].includes(t.status));
 return shHead('這張做完了？')+`<div class="meta" style="margin-top:8px">${chip(c.ask||c.title)}</div><p>按下去，肉咖會在皮條客把這張卡標成做完，回報在這張卡。</p>`
 +(dt?`<p class="note">已經送過做完（${esc(coSt(dt)||'已送出')}）。</p>`:'')+`<div class="btns">${B('對，做完了','codoneok',id,'pri wide')}</div><p class="note">送錯了：等肉咖回報後，在這張卡按「另外交代肉咖」說改回進行中。</p>`}
ACT.codoneok=async id=>{const c=coFind(id);if(!c)return;const body=`【做完】老大在逐流按了做完：請在皮條客把這張卡（皮條客 id ${c.source_id}）標成做完／結案，做完回報一句。`;
 if(LV.mode!=='live'){coData().tasks.unshift({id:Date.now(),card_id:id,assignee:'rouka',body,status:'queued',created_at:new Date().toISOString()});back();toast('示範：做完交給肉咖了');render('keep');return}
 try{await LV.api.coTask(id,'rouka',body);back();toast('交給肉咖了，皮條客那邊改好會回報');await coLoad();render('keep')}catch(e){toast(NOFN(e)?'資料庫還沒更新，派工還沒接上':'沒送出：'+LERR(e))}};
// 步驟卡：沿用同一套編輯器，多「在哪做」
{const _l=stdLoad;stdLoad=function(id){if(String(id).indexOf('co:')!==0)return _l(id);const c=coFind(id.slice(3));if(!c)return null;
 const st=coStepsOf(c).map(s=>{const o=stepOf(s),cl=cliOf(o.cli);return {name:o.name,status:o.status,cli:cl?cl.k:'',model:cl?cliMdl(cl,o.model):(SMDL.some(m=>m[0]===o.model)?o.model:'不指定'),mode:o.mode==='開子視窗'?'開子視窗':'監工本身',skills:skSplit(o.skill),note:o.note,where:coWhere(o),pk:''}});
 if(!st.length)st.push(Object.assign(stdNew(),{cli:'',where:'公司'}));return {id,steps:st}}}
{const _h=stcHTML;stcHTML=function(o,i){const h=_h(o,i);if(!STD||!isCoStd(STD.id))return h;const w=coWhere(o);
 const seg=`<div class="stc-seg${w==='我電腦'?' r':''}" role="group" aria-label="第 ${i+1} 步在哪做"><i aria-hidden="true"></i><button type="button" data-act="stcwhr" data-id="${i}|公司" aria-pressed="${w==='公司'}">公司電腦</button><button type="button" data-act="stcwhr" data-id="${i}|我電腦" aria-pressed="${w==='我電腦'}">我電腦</button></div>`;
 const j=h.indexOf('<div class="stc-pk');return j<0?h:h.slice(0,j)+`<div class="stc-top stc-whr">${seg}<small>${esc(w==='我電腦'?'大器在這台做':'肉咖在公司電腦做')}</small></div>`+h.slice(j)}}
ACT.stcwhr=v=>{if(!STD)return;const [i,w]=String(v).split('|'),o=STD.steps[+i];if(!o)return;o.where=w;const n=stcRedraw(+i);if(n){const b=n.querySelector('.stc-whr');if(b)b.classList.add('stpop')}};
{const _a=ACT.stadd;ACT.stadd=()=>{_a();if(STD&&isCoStd(STD.id)){const o=STD.steps[STD.steps.length-1];if(o&&!o.where){o.where='公司';stcRedraw(STD.steps.length-1)}}}}
{const _s=sheetHTML;sheetHTML=function(){const t=S.sheet||'';
 if(t.indexOf('codone:')===0)return coDoneSheet(t.slice(7));if(t.indexOf('codisp:')===0)return coDispSheet(t.slice(7));
 const h=_s();if(t.indexOf('stepx:co:')!==0)return h;
 return h.replace(/<div class="mrow stplanr">[\s\S]*?<\/div>/,'').replace(/按「去執行」時，大器照這個架構走。/,'每一步選在公司電腦（肉咖）還是我電腦（大器）做。存好會交一張單給肉咖，在皮條客照著改。')}}
{const _v=ACT.stsave;ACT.stsave=id=>{if(String(id).indexOf('co:')!==0)return _v(id);if(!STD||STD.id!==id)return;const cid=id.slice(3),c=coFind(cid);if(!c)return;
 STD.steps.forEach(o=>{o.name=o.name.replace(/(^|\s)[@＠]([^\s@＠]+)/g,(m,a,w)=>{const k=skExact(w);if(!k)return m;if(!o.skills.includes(k)&&o.skills.length<3)o.skills.push(k);return a}).replace(/\s{2,}/g,' ').trim();o.note=o.note.trim()});
 const keep=STD.steps.filter(s=>s.name||s.note||s.skills.length);if(keep.some(s=>!s.name)){S.err='stepx';render('keep');return}S.err='';
 const old=coStepsOf(c).slice(),body=keep.map(s=>({name:s.name.slice(0,80),status:s.status,note:stepNote({model:s.model,mode:s.mode,skill:s.skills.join('、'),cli:s.cli||'',where:coWhere(s),note:s.note})}));
 const lines=body.map((s,k)=>coStLine(stepOf(s),k)).join('\n'),js='〔steps〕'+JSON.stringify(body);
 let msg=`【改步驟】老大在逐流改了這張公司卡的步驟（皮條客 id ${c.source_id}），共 ${body.length} 步。請在皮條客照這份更新進度與步數，做完回報一句。\n${lines}\n`;
 if((msg+js).length>2000)msg=msg.slice(0,Math.max(0,1990-js.length))+'…\n';msg+=js;
 STD=null;closeThen(async()=>{
  if(LV.mode!=='live'){c.steps=body;coData().tasks.unshift({id:Date.now(),card_id:cid,assignee:'rouka',body:msg,status:'queued',created_at:new Date().toISOString()});toast(`示範：存了 ${body.length} 步，交給肉咖同步`);render('keep');return}
  let saved=false;try{await LV.api.coSteps(cid,body);saved=true}catch(e){if(!NOFN(e)){toast('沒存上：'+LERR(e));return}}
  try{await LV.api.coTask(cid,'rouka',msg)}catch(e){toast((saved?'步驟存了，但':'')+'沒交給肉咖：'+LERR(e));await coLoad();render('keep');return}
  await coLoad();render('keep');
  toast(`存了 ${body.length} 步，交給肉咖同步到皮條客`,saved?async()=>{try{await LV.api.coSteps(cid,old);await coLoad();render('keep');toast('逐流這邊還原了；肉咖那張單照舊，要改回再交代它')}catch(e){toast('沒還原：'+LERR(e))}}:null)})}}
// 派工：照步驟派，公司的給肉咖、我電腦的給大器
const coStepMsg=(c,st,k)=>{const o=st[k];return `【派工】公司卡「${c.title}」第 ${k+1}／${st.length} 步：${o.name}。架構：${o.mode==='開子視窗'?'開子視窗':'監工本身'}${o.cli?'・CLI '+o.cli:''}${o.model&&o.model!=='不指定'?'・模型 '+o.model:''}${o.skill?'・技能 '+o.skill:''}。${o.note?'備註：'+o.note+'。':''}做完回報，並在皮條客把這步標成做完。`};
function coDispSheet(id){const c=coFind(id);if(!c)return shHead('這張公司卡不在了');const st=coStepsOf(c).map(stepOf),open=st.map((o,k)=>[o,k]).filter(([o])=>o.status!=='done'&&o.status!=='skipped');
 if(!st.length)return shHead('派工')+`<div class="meta" style="margin-top:8px">${chip('關於：'+(c.ask||c.title))}</div><p class="note">這張還沒排步驟。先排步驟，每一步選在公司電腦或我電腦做；或直接交代肉咖一句話。</p><div class="btns">${B('排步驟','sheet','stepx:co:'+id,'pri')}${B('直接交代肉咖','coRouka',id)}</div>`;
 return shHead('派工')+`<div class="meta" style="margin-top:8px">${chip('關於：'+(c.ask||c.title))}</div>
 <div class="rows">${st.map((o,k)=>`<div class="rowi"><div class="rowb">${bm(coWhere(o)==='我電腦'?'daqi':'rouka','z')}<span class="tx"><b>${k+1}. ${esc(o.name)}</b><small>${esc(coTags(o))}${o.status!=='pending'?'・'+esc(stsL(o.status)):''}</small></span>${o.status==='done'||o.status==='skipped'?'':`<span class="rt">${mb('派這步','codstep',id+'|'+k)}</span>`}</div></div>`).join('')}</div>
 ${open.length?`<div class="btns">${B(`照步驟全部派（${open.length} 步）`,'codall',id,'pri wide')}</div>`:'<p class="note">每一步都做完或跳過了。</p>'}
 <p class="note">公司電腦的步驟交給肉咖，一分鐘內收單；我電腦的步驟開大器對話帶這張卡送出。</p><div class="mrow">${mb('改步驟','sheet','stepx:co:'+id)}</div>`}
async function coSendStep(c,st,ks){const rk=ks.filter(k=>coWhere(st[k])!=='我電腦'),dk=ks.filter(k=>coWhere(st[k])==='我電腦');
 if(LV.mode!=='live'){rk.forEach(k=>coData().tasks.unshift({id:Date.now()+k,card_id:c.id,assignee:'rouka',body:coStepMsg(c,st,k),status:'queued',created_at:new Date().toISOString()}));render('keep')}
 else if(rk.length){const msg=rk.length===1?coStepMsg(c,st,rk[0]):`【派工】公司卡「${c.title}」照步驟做這 ${rk.length} 步，一步做完回報一次：\n`+rk.map(k=>coStLine(st[k],k)).join('\n');await LV.api.coTask(c.id,'rouka',msg.slice(0,2000))}
 if(dk.length){const t=dk.length===1?coStepMsg(c,st,dk[0]).replace(/，並在皮條客把這步標成做完/,'；公司那邊的狀態由肉咖同步'):`公司卡「${c.title}」這幾步在我電腦做：\n`+dk.map(k=>coStLine(st[k],k)).join('\n')+'\n照步驟架構走，做完回報在這張卡。';
  if(LV.mode==='live')openChat('daqi','co:'+c.id,null,()=>sendTo('daqi',t,'co:'+c.id));else toast('示範：我電腦的步驟會開大器對話送出')}
 return {r:rk.length,d:dk.length}}
ACT.codstep=async v=>{const [id,k]=String(v).split('|'),c=coFind(id);if(!c)return;const st=coStepsOf(c).map(stepOf);if(!st[+k])return;
 try{const n=await coSendStep(c,st,[+k]);if(n.r){if(S.sheet)back();toast(`第 ${+k+1} 步交給肉咖了`);await coLoad();render('keep')}}catch(e){toast(NOFN(e)?'資料庫還沒更新，派工還沒接上':'沒送出：'+LERR(e))}};
ACT.codall=async id=>{const c=coFind(id);if(!c)return;const st=coStepsOf(c).map(stepOf),ks=st.map((o,k)=>k).filter(k=>st[k].status!=='done'&&st[k].status!=='skipped');if(!ks.length)return;
 try{const n=await coSendStep(c,st,ks);if(n.r&&!n.d){if(S.sheet)back()}toast([n.r?`${n.r} 步交給肉咖`:'',n.d?`${n.d} 步開大器對話`:''].filter(Boolean).join('，'));await coLoad();render('keep')}catch(e){toast(NOFN(e)?'資料庫還沒更新，派工還沒接上':'沒送出：'+LERR(e))}};

/* ---------- v98（2026-11-24）：想買詳情改成比較卡 ----------
   老大原話（msg 553）：「這一頁不能這樣，這一頁應該要有所比較 會有幾張卡片比較之類的 同一個商品的不同價格不同通路之類的或者是規格的差異 不是給我一堆文字 然後比較的話就會讓那個什麼獲勝的那個可能某個數字是突出的 拿點進去卡片的話可以看到詳細的內容」
   - wdet: 改成：商品圖與一行摘要、萌萌狀態，下面 2～4 張比較卡（手機橫滑、桌機並排）。含運總價最低＝「最划算」、萌萌標「標記：規格最好」＝「規格最好」，獲勝的數字放大上色。
   - 點一張卡＝下面展開那張的全部細節（萌萌原話、連結、付款方式），一次只看一張；再點一次收起。
   - 萌萌回覆格式：一個方案一段，「方案：／價格：／規格：／運費：／付款方式：／連結：／圖片：／查核：」（可加「標記：規格最好」）。舊格式（單一價格、通路）顯示成一張卡；還沒回、但卡上有存價格的也顯示一張「這張卡存的」。
   - 「存到這張卡」：存點開的那張，沒點就存最划算那張。
   - 這段取代 v96 的 wd2 版面，所以 bot_voice.js 的 .wd2-p 價格拆行在 wdet 不再有對象（那段選擇器旁有註記）。比較卡價格自己拆大字與小字，不靠 bot_voice。 */
const WCK={方案:'name',價格:'price',規格:'spec',運費:'ship',付款方式:'pay',付費方式:'pay',連結:'url',網址:'url',圖片:'img',查核:'chk',通路:'shop',標記:'mark'};
const WCRE=/^(方案|價格|規格|運費|付款方式|付費方式|連結|網址|圖片|查核|通路|標記)\s*[：:]\s*(.*)$/;
const wcUrl=s=>(String(s||'').match(/https:\/\/[^\s)）」<>"']+/)||[])[0]||'';
function wcSegs(body){const out=[];out.gen=[];
 String(body||'').replace(/^［[^］]*］\s*/,'').split(/\n\s*\n/).forEach(par=>{const lines=par.split(/\n+/).map(l=>l.trim()).filter(Boolean);
 if(!lines.some(l=>/^方案\s*[：:]/.test(l.replace(/^[\-•*\d.、)）]+\s*/,'')))){out.gen.push(...lines);return}
 let cur=null;
 lines.forEach(l=>{const c=l.replace(/^[\-•*\d.、)）]+\s*/,''),m=c.match(WCRE);
  if(m&&m[1]==='方案'){cur={name:m[2].trim()||('方案 '+(out.length+1)),raw:[l]};out.push(cur);return}
  if(!cur){out.gen.push(l);return}cur.raw.push(l);if(m){const k=WCK[m[1]];if(!cur[k])cur[k]=m[2].trim()}else(cur.more=cur.more||[]).push(l)})});
 return out}
function wcPlans(w){const rp=wfReply(w);let ps=[],gen=[];
 if(rp&&rp.msg){ps=wcSegs(rp.msg.body);gen=ps.gen.filter(l=>!/^（示範回覆）$/.test(l));
  if(!ps.length){const i=wfParse(rp.msg.body);if(i.price||i.shop)ps=[{name:i.shop||'萌萌找到的',price:i.price,pay:i.pay,url:i.url,img:i.img,shop:i.shop,old:1,more:String(rp.msg.body).replace(/^［[^］]*］\s*/,'').split(/\n+/).map(l=>l.trim()).filter(l=>l&&!WCRE.test(l.replace(/^[\-•*\d.、)）]+\s*/,'')))}];gen=[]}}
 if(!ps.length&&!w.noPrice&&w.price){const n0=wfNote((w.raw2||{}).note);ps=[{name:w.shop&&!/還沒補/.test(w.shop)?w.shop:'這張卡存的',price:nt(w.price),pay:n0.pay,url:w.url,img:n0.img,saved:1}]}
 ps=ps.slice(0,4);ps.forEach(p=>{p.url=wcUrl(p.url);p.img=okImg(wcUrl(p.img))?wcUrl(p.img):'';p.n=wfNum(p.price)});
 const nums=ps.filter(p=>p.n!=null);if(ps.length>1&&nums.length){const lo=Math.min(...nums.map(p=>p.n));const c=nums.find(p=>p.n===lo);if(nums.filter(p=>p.n===lo).length<ps.length)c.cheap=1}
 if(ps.length>1){const s=ps.find(p=>/規格最好|規格最強|最高規/.test(p.mark||''));if(s)s.best=1}
 return {ps,rp,gen}}
LV.wcSel=LV.wcSel||{};
function wcPrice(p){if(p.n==null)return {big:p.price||'還沒有價格',sub:''};
 const sub=String(p.price||'').replace(/NT\$\s?[\d,]+(?:\.\d+)?/i,'').replace(/^[\s（(]+|[\s）)]+$/g,'').replace(/[；;]\s*/g,'・').trim();
 return {big:'NT$ '+p.n.toLocaleString('en-US'),sub}}
function wcCard(w,p,i,sel){const pr=wcPrice(p),sp=String(p.spec||'').split(/[、，,／\/；;]\s*/).map(s=>s.trim()).filter(Boolean).slice(0,3);
 const meta=[p.ship?'運費 '+p.ship:'',p.pay||''].filter(Boolean).join('・');
 const chk=p.chk?('查核 '+p.chk.replace(/^\d{4}[-/]/,'').replace('-','/')):(p.saved?'卡上存的':'');
 return `<button type="button" class="wc-card${p.cheap?' cheap':''}${p.best?' spec':''}${sel===i?' on':''}" data-act="wcpick" data-id="${esc(w.id)}|${i}" aria-pressed="${sel===i}" aria-label="${esc(p.name)} ${esc(pr.big)}，點開看細節">`
  +`<span class="wc-tags">${p.cheap?'<span class="wc-tag cheap">最划算</span>':''}${p.best?'<span class="wc-tag spec">規格最好</span>':''}</span>`
  +`<span class="wc-n">${esc(clip(p.name,24))}</span><span class="wc-p">${esc(pr.big)}</span>${pr.sub?`<span class="wc-ps">${esc(clip(pr.sub,30))}</span>`:''}`
  +(sp.length?`<span class="wc-sp">${sp.map(s=>`<span>${esc(clip(s,26))}</span>`).join('')}</span>`:'')
  +(meta?`<span class="wc-m">${esc(clip(meta,40))}</span>`:'')+(chk?`<span class="wc-d">${esc(chk)}</span>`:'')+`</button>`}
function wcDet(w,p,i){let site='';try{site=p.url?new URL(p.url).hostname.replace(/^www\./,''):''}catch(e){}
 const kv=[['價格',p.price],['規格',p.spec],['運費',p.ship],['付款方式',p.pay],['查核',p.chk]].filter(x=>x[1]);
 const said=(p.more||[]).filter(l=>!/^（示範回覆）/.test(l)||l.length>8);
 return `<div class="wc-det" role="region" aria-label="${esc(p.name)}的細節"><p class="wc-dh">${esc(p.name)}${p.cheap?' <span class="wc-tag cheap">最划算</span>':''}${p.best?' <span class="wc-tag spec">規格最好</span>':''}</p>`
  +(kv.length?`<dl class="wc-kv">${kv.map(x=>`<dt>${x[0]}</dt><dd>${esc(x[1])}</dd>`).join('')}</dl>`:'')
  +(p.url?`<a class="wc-lk" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${esc(site||'商品頁')} ↗</a>`:'')
  +(said.length&&!p.saved?`<p class="wc-rh">萌萌另外說</p><div class="wc-raw">${said.slice(0,14).map(l=>`<p>${esc(clip(l,200))}</p>`).join('')}</div>`:'')
  +(!p.saved?`<div class="btns">${B('存這個方案到這張卡','wcsave',w.id+'|'+i,'pri wide')}</div>`:'')+`</div>`}
{const _s=sheetHTML;sheetHTML=function(){const a=(S.sheet||'').split(':');if(a[0]!=='wdet')return _s();const w=W(a.slice(1).join(':'));if(!w)return shHead('這項不在了');
 const {ps,rp,gen}=wcPlans(w);let sel=LV.wcSel[w.id];if(sel!=null&&!ps[sel])sel=null;
 const st=rp&&rp.msg?`<p class="wd2-st">${bm('mon','','sm')}<span>萌萌回了・${LMD(rp.msg.at)} ${LHM(rp.msg.at)}${ps.length>1?`・比了 ${ps.length} 個方案`:''}</span></p>`:rp&&rp.run?`<p class="wd2-st run">${bm('mon','thinking','sm')}<span>萌萌比價中・${LHM(rp.at)} 送出，比好會變成比較卡</span></p>`:`<p class="wd2-st dim">${bm('mon','','sm')}<span>還沒請萌萌比</span></p>`;
 const ch=ps.find(p=>p.cheap),top=ch||ps[0];
 const sum=top?(ch?`最划算 ${wcPrice(ch).big}・${esc(clip(ch.name,16))}`:`${esc(wcPrice(top).big)}・${esc(clip(top.name,16))}`):'還沒有價格';
 const cols=ps.length<=3?ps.length:2;
 const save=ps.length&&!(ps.length===1&&ps[0].saved)?(()=>{const k=sel!=null?sel:Math.max(0,ps.indexOf(ch));const p=ps[k];return p&&!p.saved?`<div class="btns">${B(`存「${esc(clip(p.name,12))}」到這張卡`,'wcsave',w.id+'|'+k,'pri wide')}</div>`:''})():'';
 return shHead(esc(w.name))
  +`<div class="wc-hero">${wimgH(w,1)}<div class="wc-hm"><p class="wc-sum">${sum}</p>${w.spec?`<p class="wc-note">${esc(clip(wfStrip(w.spec),60))}</p>`:''}</div></div>`+st
  +(ps.length?`<div class="wc-row" style="--wc-cols:${cols}">${ps.map((p,i)=>wcCard(w,p,i,sel)).join('')}</div>${ps.length>1?'<p class="wc-hint">點一張看細節</p>':''}${gen.length?`<div class="wc-raw wc-gen"><p class="wc-rh">${bm('mon','','sm')}萌萌說</p>${gen.slice(0,4).map(l=>`<p>${esc(clip(l.replace(/^（示範回覆）/,''),160))}</p>`).join('')}</div>`:''}`:(!rp?`<p class="note">按「萌萌先比」，她會找 2 到 4 個方案（不同通路或規格），變成比較卡；沒指定品牌會先問你需求。</p>`:''))
  +(sel!=null?wcDet(w,ps[sel],sel):'')+(sel==null?save:'')
  +`<div class="wd2-a">${rp?mb('開萌萌的對話','wfchat',w.id)+mb(bm('mon','','sm')+'請萌萌再比一次','wishfind',w.id):B(bm('mon','','sm')+'萌萌先比','wishfind',w.id,'pri')}${mb('✎ 編輯','ledit',w.id)}</div>`}}
ACT.wcpick=v=>{const s=String(v),k=s.lastIndexOf('|'),id=s.slice(0,k),i=+s.slice(k+1);LV.wcSel[id]=LV.wcSel[id]===i?null:i;render('keep');
 setTimeout(()=>{const d=document.querySelector('#sheet .wc-det');if(d)d.scrollIntoView({behavior:RM?'auto':'smooth',block:'nearest'})},60)};
ACT.wcsave=v=>{const s=String(v),k=s.lastIndexOf('|'),id=s.slice(0,k),w=W(id);if(!w)return;const p=wcPlans(w).ps[+s.slice(k+1)];if(!p||p.saved){toast('沒有新的資料可存');return}
 const x=w.raw2||{},pt={},old={};
 if(p.n!=null&&(w.noPrice||p.n!==w.price)){pt.price=p.n;old.price=x.price==null?null:x.price}
 const shop=p.shop&&p.shop!==p.name?`${p.name}（${p.shop}）`:p.name;if(shop&&shop!==x.shop){pt.shop=shop.slice(0,80);old.shop=x.shop||''}
 if(p.url&&p.url!==x.url){pt.url=p.url;old.url=x.url||''}
 const n0=wfNote(x.note),pay=p.pay||n0.pay,img=p.img||n0.img;if((p.pay&&p.pay!==n0.pay)||(p.img&&p.img!==n0.img)){pt.note=(wfStrip(x.note)+(pay?'\n付款方式：'+pay:'')+(img?'\n圖片：'+img:'')).trim();old.note=x.note||''}
 if(!Object.keys(pt).length){toast('這個方案已經存在卡上了');return}
 delete LV.wcSel[id];closeThen(()=>lw(id,'wish',pt,`存了「${clip(p.name,12)}」`,{patch:old}))};
const WC_ASK=(w,id)=>`【萌萌先找】老大想買「${w.name}」（想買編號 ${id}）${w.url?'，來源 '+w.url:''}${w.spec?'，備註：'+wfStrip(w.spec).replace(/\n/g,' '):''}。請比 2 到 4 個方案（同一商品不同通路，或不同規格），逐流會把每個方案變成一張比較卡。一個方案一段，段和段之間空一行，每段固定這幾行：\n方案：<通路或規格名>\n價格：NT$ …（含運總價）\n規格：<重點 2～3 項，用頓號分開>\n運費：…\n付款方式：…\n連結：https://…\n圖片：https://…\n查核：YYYY-MM-DD\n規格最好的那段多加一行「標記：規格最好」。價格一定寫含運總價的數字。沒有指定品牌的話，先問我預算、用途、偏好，我回了你再比。`;
ACT.wishfind=id=>{const w=W(id);if(!w)return;LV.wishRun[id]='mon';LV.sig='';delete LV.wcSel[id];botAsk('mon',WC_ASK(w,id),'wish:'+id);setTimeout(loadMon,3000)};
ACT.wishcmp=ACT.wishfind;
WRITE.push('wcsave');
window.__zlWC={segs:wcSegs,plans:wcPlans};
/* ---------- v100（2026-11-24）：公司案子＝逐流原生案子卡（老大 msg 566、511） ----------
   老大原話：「我覺得公司的這邊案子不要 完全同步皮條客好了 架構一樣跟其他案子是一樣的卡片 但裡面多了肉咖可以使用 然後多了同步更新工作狀態到好咖皮條客對應的欄目」
   1 公司案子＝basket company 的原生案子卡（跟個人案同一套：步驟卡、監工／子視窗、CLI、大器臉、霸霸臉），公司分頁列這些；案子分頁不再混進公司案。
   2 不再「從皮條客全量匯入」：舊匯入的卡（hub_company_cards）留在公司分頁底下一區，按「轉成原生案子」帶內容、步驟、期限過來，原卡不刪。
   3 公司案子多：肉咖的臉（派肉咖做、同步到皮條客）、步驟「在哪做」（公司電腦＝肉咖／我電腦＝大器）。逐流做完、改步驟、派工會交一張單給肉咖，肉咖在皮條客對應欄目照改。
   4 移到公司／移回個人：後端沒有改籃函式，照「轉成案子」同一招：新建、帶內容、舊的收掉，提示條可復原。
   5 連結：案子 why 第一行［皮條客 <id>］對到皮條客那張卡；沒有這行的新案子，單走 hub_company_task_add_opp（遷移 20261124_公司原生卡，沒套上前寫「資料庫還沒更新」）。 */
const isCoCase=p=>!!(p&&p.raw&&p.raw.basket==='company');
const CO_MKR=/^［皮條客 ([^］\n]*)］\n?/;
const coSrcOf=c=>{const m=CO_MKR.exec(String((c&&c.why)||'').replace(EDM,''));return m?m[1].trim():''};
const coRowOf=c=>{const sid=coSrcOf(c),d=coData();return sid&&d&&Array.isArray(d.cards)?d.cards.find(x=>String(x.source_id)===sid)||null:null};
function isCoStd(id){id=String(id);if(id.indexOf('co:')===0)return true;const p=DB.proj.find(q=>q.id===id);return isCoCase(p)}
const coCaseTasks=c=>{const d=coData(),r=coRowOf(c);return d&&Array.isArray(d.tasks)?d.tasks.filter(t=>(r&&t.card_id===r.id)||t.card_id===c.id||(!t.card_id&&t.card_title===c.title)):[]};
const coAdoptedIds=()=>{const s=new Set();DB.proj.filter(isCoCase).forEach(p=>{const k=coSrcOf(p.raw);if(k)s.add(k)});return s};
async function coPush(c,text){
 if(LV.mode!=='live'){const d=coData();d.tasks.unshift({id:Date.now()+Math.random(),card_id:c.id,card_title:c.title,assignee:'rouka',body:text,status:'queued',created_at:new Date().toISOString()});return true}
 try{const r=coRowOf(c);if(r)await LV.api.coTask(r.id,'rouka',text);else await LV.api.coTaskOpp(c.id,c.title,'rouka',text);return true}
 catch(e){toast(NOFN(e)?'資料庫還沒更新，同步到皮條客還沒接上（逐流這邊照樣存了）':'沒交給肉咖：'+LERR(e));return false}}
const coCaseLink=c=>coRowOf(c)?`皮條客 id ${coSrcOf(c)}`:'皮條客上還沒有這張（請在對應欄目新增，案名照抄）';
// 1 卡面與詳情去掉連結行
{const _m=mapProj;mapProj=function(c){const x=_m(c);x.next=String(x.next||'').replace(CO_MKR,'')||'還沒寫下一步';return x}}
// 2 步驟「在哪做」：原生公司案子也有
{const _l=stdLoad;stdLoad=function(id){const r=_l(id);if(!r||String(id).indexOf('co:')===0||!isCoStd(id))return r;const it=todoOf(id),c=it&&it.raw,st=(c&&c.progressSteps)||[];
 r.steps.forEach((s,i)=>{s.where=st[i]?coWhere(stepOf(st[i])):'公司'});return r}}
{const _v=ACT.stsave;ACT.stsave=id=>{if(!STD||STD.id!==id||String(id).indexOf('co:')===0||!isCoStd(id))return _v(id);
 const p=DB.proj.find(q=>q.id===id),c=p&&p.raw,live=STD.steps.filter(s=>s.name||s.note||s.skills.length),q=live.map(s=>s.where||'公司'),_n2=stepNote;let k=0;
 const sum=live.map((s,i)=>`${i+1}. ${s.name}（${coWho(q[i])}${s.cli?'・'+s.cli:''}${s.model&&s.model!=='不指定'?'・'+s.model:''}${s.skills.length?'・@'+s.skills.join('、'):''}）`).join('\n');
 stepNote=function(o){return _n2(Object.assign({},o,{where:q[k++]||'公司'}))};
 try{_v(id)}finally{stepNote=_n2}
 if(c&&live.length)setTimeout(()=>coPush(c,`【改步驟】老大在逐流改了公司案子「${c.title}」的步驟（${coCaseLink(c)}），共 ${live.length} 步。請在皮條客對應欄目照這份更新進度與步數，做完回報一句。\n${sum}`.slice(0,2000)),300)}}
// 3 公司分頁＝原生公司案子
{const _zp=zoneProj;zoneProj=function(){coWrapAdd();const s=S.sub.proj,all=DB.proj,nat=all.filter(isCoCase),d=coData(),ad=coAdoptedIds(),left=d&&Array.isArray(d.cards)?d.cards.filter(c=>!ad.has(String(c.source_id))):[],n=nat.length+left.length,
  btn=on=>`<button aria-pressed="${on}" data-act="sub" data-id="proj:co">公司 ${n}</button>`,segRe=/(<div class="seg" role="group" aria-label="案子分類">)([\s\S]*?)(<\/div>)/,fix=h=>h.replace(/<button[^>]*data-id="proj:co"[^>]*>公司 \d+<\/button>/,'');
  if(s!=='co'){DB.proj=all.filter(p=>!isCoCase(p));let h;try{h=_zp()}finally{DB.proj=all}
   return /data-id="proj:co"/.test(h)?h.replace(/(data-id="proj:co">)公司 \d+/,`$1公司 ${n}`):h.replace(segRe,(x,a,b,c)=>a+b+btn(false)+c)}
  S.sub.proj='proj';DB.proj=nat;let h;try{h=_zp()}finally{DB.proj=all;S.sub.proj='co'}
  h=h.replace(segRe,(x,a,b,c)=>a+fix(b).replace(/aria-pressed="true"/g,'aria-pressed="false"')+btn(true)+c);
  h=h.replace(/<div class="addtop"><button[^>]*data-id="padd"[^>]*>[^<]*<\/button><\/div>/g,'');
  const top=`<div class="addtop">${B('＋ 新增公司案子','sheet','padd:co','pri')}</div>`,k=h.indexOf('aria-label="案子分類">'),e=k<0?-1:h.indexOf('</div>',k);
  h=e<0?top+h:h.slice(0,e+6)+top+h.slice(e+6);
  if(!nat.length)h=h.replace(/(<div class="addtop">[\s\S]*?<\/div>)/,`$1<div class="card" style="margin-top:12px"><p>還沒有公司案子。按「新增公司案子」，或到個人案子的「⋯」選「移到公司」。</p></div>`);
  return h+coLeftSec(left)}}
function coLeftSec(left){if(!left.length)return '';
 return `<section class="sec"><h3>皮條客匯入的卡 ${left.length} 張</h3><div class="card"><p class="note">這些是之前從皮條客整批匯入的，還不是案子。轉成原生案子後跟其他案子一樣，有步驟、監工、肉咖、大器；原卡不刪。</p><div class="btns">${B(`全部轉成原生案子（${left.length}）`,'coadoptall',null,'pri wide')}</div></div><div class="rows">${left.map(c=>`<div class="rowi"><div class="rowb"><span class="tx"><b>${esc(c.ask||c.title)}</b><small>${esc(brief(c.project||'公司',c.owner||''))}${c.due?'・'+esc(coDue(c)):''}</small></span><span class="rt">${mb('轉成案子','coadopt',c.id)}</span></div></div>`).join('')}</div></section>`}
async function coAdoptOne(c){const ad=coAdoptedIds();if(ad.has(String(c.source_id)))return null;
 const dup=DB.proj.find(p=>String(p.title).trim().toLowerCase()===String(c.title).trim().toLowerCase());let title=String(c.title||'公司案子').slice(0,120);if(dup)title=(title.slice(0,112)+'（公司）');
 const n=await LV.api.workAdd(title,'company');if(!n||!n.id)throw new Error('案子沒建起來');
 const link=/^https:\/\//i.test(String(c.link||''))?c.link:'',why=`［皮條客 ${c.source_id}］\n`+[c.detail||'',c.status?'皮條客狀態：'+c.status:'',c.owner?'負責：'+c.owner:'',link?'皮條客：'+link:''].filter(Boolean).join('\n');
 await LV.api.cardEdit(n.id,{why:why.slice(0,3000),...(c.ask?{ask:String(c.ask).slice(0,80)}:{})});
 const st=coStepsOf(c);if(st.length)await LV.api.act(n.id,'steps',{steps:st.map(s=>({name:String(s.name||'').slice(0,80),status:s.status||'pending',note:s.note||''}))});
 if(c.due)await LV.api.act(n.id,'work',{patch:{delivery_date:String(c.due).slice(0,10)}});return n}
ACT.coadopt=async id=>{const c=coFind(id);if(!c||!LV.api||!LV.api.workAdd){toast('離線中，連上再轉');return}
 try{const n=await coAdoptOne(c);await reload();paint('keep');toast(n?'轉成原生案子了，原卡留著':'這張已經轉過了')}catch(e){await reload();paint('keep');toast('沒轉成：'+LERR(e))}};
ACT.coadoptall=async()=>{const d=coData(),ad=coAdoptedIds(),left=(d&&d.cards||[]).filter(c=>!ad.has(String(c.source_id)));if(!left.length||!LV.api||!LV.api.workAdd)return;let ok=0,bad='';
 for(const c of left){try{if(await coAdoptOne(c))ok++}catch(e){bad=LERR(e)}}await reload();paint('keep');toast(`轉成原生案子 ${ok} 張，原卡留著${bad?'；有沒轉成的：'+bad:''}`)};
// 4 新增公司案子
function coWrapAdd(){if(!LV.api||LV.api.__coW)return;const w=LV.api.workAdd,ce=LV.api.cardEdit;LV.api.workAdd=function(t,b){const f=LV.coAdd;LV.coAdd=false;return w.call(this,t,b||(f?'company':undefined))};
 LV.api.cardEdit=function(id,p){if(p&&typeof p.why==='string'&&p.why.indexOf('［皮條客 ')<0){const c=(LV.items||[]).find(x=>x.id===id),m=c&&CO_MKR.exec(String(c.why||'').replace(EDM,''));if(m){const e=EDM.exec(p.why),pre=e?e[0]:'';p=Object.assign({},p,{why:pre+m[0].trim()+'\n'+p.why.slice(pre.length)})}}return ce.call(this,id,p)};LV.api.__coW=1}
coWrapAdd();
{const _s=sheetHTML;sheetHTML=function(){const t=S.sheet||'';const h=_s();if(t==='padd:co'){LV.coAdd=false;return h.replace('>新增案子<','>新增公司案子<')}return h}}
{const _p=ACT.pasave;ACT.pasave=function(a){if(S.sheet==='padd:co'&&((document.getElementById('paTitle')||{}).value||'').trim()){coWrapAdd();LV.coAdd=true}return _p(a)}}
// 5 案子詳情：公司案子多肉咖與同步；個人案多「移到公司」
{const _h=projHero;projHero=function(p,h1){let h=_h(p,h1);const c=p.raw||{};if(!c.id)return h;
 if(isCoCase(p)){const ts=coCaseTasks(c).filter(t=>t.assignee==='rouka'),lt=ts[0],stt=lt?coSt(lt):'';
  h=h.replace(/(<div class="pcx-act">)/,`$1${B(bm('rouka')+'派肉咖做','sheet','cocase:'+p.id,'pcx-b')}${B('同步到皮條客','cosync',p.id,'pcx-b')}`);
  h=h.replace(/(<p class="pcx-now[^>]*>[\s\S]*?<\/p>)/,`$1<p class="note">公司案子・${esc(coCaseLink(c))}${stt?'・肉咖：'+esc(stt):''}</p>`)}
 return h}}
// 6 詳情「⋯」與案子「⋯」多一項：移到公司／移回個人
{const _s=sheetHTML;sheetHTML=function(){const t=S.sheet||'',h=_s();if(t.indexOf('mine:proj:')!==0)return h;const id=t.slice(10),p=DB.proj.find(q=>q.id===id);if(!p||!p.raw||!p.raw.id)return h;
 const it=isCoCase(p)?mi('⇄','移回個人案子','pmove',id+'|personal')+mi('◆','同步到皮條客','cosync',id)+mi('◆','派肉咖做','sheet','cocase:'+id):mi('⇄','移到公司','pmove',id+'|company');
 return h.replace(/<\/div>$/,it+'</div>')}}
// 7 肉咖的臉：公司案子卡
{const _pc=projCard;projCard=function(p){const h=_pc(p);if(!isCoCase(p))return h;const ts=coCaseTasks(p.raw).filter(t=>t.assignee==='rouka'),f=aiF('rouka','proj:'+p.id,coSt(ts[0]),{do:'cocase',arg:p.id});
 return h.replace(/(<div class="cf-r">)/,`$1${f}`)}}
ACT.cocase=id=>{S.err='';ACT.sheet('cocase:'+id)};
const CO_Q2=['把這張在皮條客的進度整理給我','把這張在皮條客標成做完','到皮條客確認這張的期限和負責人'];
{const _s=sheetHTML;sheetHTML=function(){const t=S.sheet||'';if(t.indexOf('cocase:')!==0)return _s();const id=t.slice(7),p=DB.proj.find(q=>q.id===id);if(!p)return shHead('這件不在了');const c=p.raw;
 return shHead('派肉咖做')+`<div class="meta" style="margin-top:8px">${bm('rouka','z')}<span class="lbl">肉咖・公司電腦</span></div><div class="meta" style="margin-top:8px">${chip('關於：'+(p.ask||p.title))}</div>
 <label class="f">要肉咖做什麼<textarea id="coText" rows="3" placeholder="例：把這張在皮條客的進度改成剪接中"></textarea></label>${S.err==='co'?'<p class="err" role="alert">▲ 還沒寫字。先寫一句再傳。</p>':''}
 <div class="btns">${CO_Q2.map(q=>`<button class="btn" data-act="cofill" data-id="${esc(q)}">${esc(q)}</button>`).join('')}</div>
 <div class="btns">${B('交給肉咖','cocasesend',id,'pri wide')}</div><p class="note">${esc(coCaseLink(c))}。肉咖拿到單會改成「進行中」，做完回報在這張卡，今天頁「正在跑」也看得到。</p>`}}
ACT.cocasesend=async id=>{const p=DB.proj.find(q=>q.id===id),t=$('#coText'),v=t?t.value.trim():'';if(!p)return;if(!v){S.err='co';render('keep');return}S.err='';
 const ok=await coPush(p.raw,`【派工】公司案子「${p.title}」（${coCaseLink(p.raw)}）：${v}。做完回報；要改皮條客就改對應欄目。`);if(ok){back();toast(LV.mode==='live'?'交給肉咖了，公司電腦拿到就會開始':'示範：交給肉咖了');try{await coLoad()}catch(e){}render('keep')}};
// 8 同步到皮條客（把這張目前的狀態交給肉咖寫進對應欄目）
ACT.cosync=async id=>{const p=DB.proj.find(q=>q.id===id);if(!p||!isCoCase(p))return;const c=p.raw,st=(c.progressSteps||[]).map(stepOf),dn=st.filter(o=>o.status==='done'||o.status==='skipped').length;
 const lines=st.map((o,k)=>`${k+1}. ${o.name}（${coWho(coWhere(o))}・${stsL(o.status)}）`).join('\n');
 const msg=`【同步】公司案子「${p.title}」（${coCaseLink(c)}）目前狀態，請在皮條客對應欄目改成一樣：狀態 ${stsL(st.find(o=>o.status==='current'||o.status==='blocked')?'current':dn===st.length&&st.length?'done':'pending')}；${st.length?`步驟 ${dn}／${st.length}。\n${lines}`:'還沒排步驟。'}${c.progressBlocker?`\n卡點：${c.progressBlocker}`:''}${c.deliveryDate?`\n交件日：${String(c.deliveryDate).slice(0,10)}`:''}\n做完回報一句。`;
 if(S.sheet)back();const ok=await coPush(c,msg.slice(0,2000));if(ok){toast(LV.mode==='live'?'交給肉咖了，皮條客改好會回報':'示範：同步交給肉咖了');try{await coLoad()}catch(e){}render('keep')}};
// 這步做完／退回、做完交件：公司案子同步一則
{const _g=ACT.mstep,_b=ACT.mstepb;const wrap=(f,w)=>id=>{const p=DB.proj.find(q=>q.id===id),c=p&&isCoCase(p)?p.raw:null,nm=c?(p.steps[w>0?p.cur:p.cur-1]||''):'';const r=f(id);
  if(c&&nm)setTimeout(()=>coPush(c,`【同步】公司案子「${p.title}」（${coCaseLink(c)}）${w>0?'做完了':'退回了'}「${nm}」，請在皮條客對應欄目照改。做完回報一句。`),400);return r};ACT.mstep=wrap(_g,1);ACT.mstepb=wrap(_b,-1)}
// 案子被移走、結案後，還開著的詳情頁不要當掉
{const _p=pageHTML;pageHTML=function(){const a=(S.page||'').split(':');if(a[0]==='proj'&&!DB.proj.find(q=>q.id===a[1]))return `<div class="page-in"><div class="phead">${B('‹ 返回','back',null,'ghost',' id="pBack"')}</div>`+emptyBox('這張案子不在這裡了','可能已移到公司或個人，或已結案。',B('回案子','back',null,'pri'))+'</div>';return _p()}}
// 9 移到公司／移回個人
ACT.pmove=async v=>{const [id,to]=String(v).split('|'),p=DB.proj.find(q=>q.id===id),c=p&&p.raw;if(!c||!LV.api||!LV.api.workAdd){toast('離線中，連上再移');return}
 const toCo=to==='company';if(toCo===isCoCase(p))return;coWrapAdd();
 closeThen(async()=>{let n=null,closed=false;if(S.page==='proj:'+id)back();try{await LV.api.act(id,'close',{result:'void'});closed=true;
   n=await LV.api.workAdd(String(c.title).slice(0,120),toCo?'company':'personal');if(!n||!n.id)throw new Error('案子沒建起來');
   let why=String(c.why||'').replace(EDM,'').replace(CO_MKR,'').trim();if(c.folderPath&&!/^[（(]/.test(c.folderPath)&&why.indexOf(c.folderPath)<0)why+=(why?'\n':'')+'原資料夾：'+c.folderPath;
   const ce={};if(why)ce.why=why.slice(0,3000);if(c.ask)ce.ask=String(c.ask).slice(0,80);if(c.shortTitle)ce.short_title=c.shortTitle;if(c.firstStep)ce.first_step=c.firstStep;if(Object.keys(ce).length)await LV.api.cardEdit(n.id,ce);
   const st=(c.progressSteps||[]).map(s=>({name:s.name,status:s.status,note:s.note||''}));if(st.length)await LV.api.act(n.id,'steps',{steps:st});
   const pt={};if(c.deliveryDate)pt.delivery_date=String(c.deliveryDate).slice(0,10);if(c.quoteAmount!=null)pt.quote_amount=c.quoteAmount;if(Object.keys(pt).length)await LV.api.act(n.id,'work',{patch:pt})}
  catch(e){try{if(!n&&closed)await LV.api.act(id,'reopen',{})}catch(e2){}await reload();paint('keep');toast('沒移成：'+LERR(e)+(n?'（新卡已建，原卡收掉了，請到封存放回）':'。原卡還在'));return}
  await reload();paint('keep');if(DB.proj.find(q=>q.id===n.id))S.sub.proj=toCo?'co':'proj';paint('keep');
  toast(toCo?'移到公司了，原卡收掉（封存可放回）':'移回個人了，原卡收掉（封存可放回）',async()=>{try{await LV.api.act(n.id,'close',{result:'void'});await LV.api.act(id,'reopen',{});await reload();paint('keep');toast('還原了')}catch(e){toast('沒還原：'+LERR(e))}})})};

window.__zl=Object.assign(window.__zl||{},{zhName,textSwap,srcSay});
/* ---------- v109：首頁目標小卡橫滑（msg 643 第 2 點）＋行事曆忙閒視覺面板（msg 646） ----------
   老大：「這邊感覺要簡述目標 可以手指左右滑」「行事曆區我覺得要用一個視覺化的方式讓我可以很清楚知道我在哪些日期要忙哪些事情…」
   目標：首頁目標房間的摘要鈕換成一排小卡（手機橫滑 scroll-snap、桌機並排），點卡進該目標頁，最後一張看全部。
   行事曆：行事曆頁上方 14 天格子，色塊深淺＝那天排了幾小時，點一天展開那天的行程，空的日子寫有空。資料用既有 calAll()，不新增資料表。
   退回：刪掉這一段（goalStrip 回到 goalCard、calPage 回到原樣）。 */
{const gmCard=g=>{const late=g.st==='late',stall=g.st==='stall';
  const brief=g.next?String(g.next).replace(/[。．.]$/,''):'';
  return `<button class="gmc${late?' late':stall?' stall':''}" data-act="page" data-id="goal:${esc(g.id)}"><span class="vh">打開目標，</span><b class="gmn">${esc(g.name)}</b>${gSpan(gMeterC(g))}<span class="gmv"><span class="num">${esc(String(g.now))}</span><small>／${esc(String(g.total))} ${esc(g.unit||'')}</small></span><span class="gms">${late?'▲ ':stall?'‖ ':''}${esc(g.stText||'')}</span>${brief?`<span class="gmx">${esc(brief)}</span>`:''}</button>`};
 const goalMini=function(){if(S.st==='loading'||S.st==='error')return '';const a=gAll(),m=gsum();delete CV.goal;
  if(!a.length)return `<div class="room groomh gmroom" data-z="goal"><button class="rgo" data-act="page" data-id="goals"><span class="rh">目標</span><span class="rs">還沒立目標</span></button>${bigF('din','goal')}</div>`;
  const ord=a.slice().sort((x,y)=>(y.st==='late')-(x.st==='late')||(GL.focus===y.id)-(GL.focus===x.id));
  return `<div class="room groomh gmroom" data-z="goal"><div class="gmh"><span class="rh">目標</span><span class="gsm">${esc(m.t)}</span></div><div class="gmrow" role="list" aria-label="目標，手指左右滑">${ord.map(g=>`<div role="listitem">${gmCard(g)}</div>`).join('')}<div role="listitem"><button class="gmc gmall" data-act="page" data-id="goals"><b class="gmn">看全部目標</b><span class="gms">${a.length} 個 ›</span></button></div></div>${bigF('din','goal')}</div>`};
 // 2026-11-24 msg 687 老大：「改回去我要原本的那種設計只是窄窄的但上面的字要有不同目標的一點內容」→ 回到窄的一條（goalCard），標題旁的字輪流帶出各目標重點（msg 692 改成手指左右滑，不自動輪播）
 goalStrip=goalCard;

 // 行事曆忙閒：一天的忙碌時數＝把有時間的行程合併重疊後加總，全天行程算 4 小時
 const hm2=s=>{const m=/^(\d{1,2}):(\d{2})/.exec(s||'');return m?+m[1]+m[2]/60:null};
 const busyOf=its=>{let all=0;const iv=[];its.forEach(e=>{if(e.cancel)return;if(e.all||!e.t){all++;return}const a=hm2(e.t);let b=hm2(e.e);if(a==null)return;if(b==null||b<=a)b=a+1;iv.push([a,b])});
  iv.sort((x,y)=>x[0]-y[0]);let h=0,cs=null,ce=null;iv.forEach(([a,b])=>{if(cs==null||a>ce){if(cs!=null)h+=ce-cs;cs=a;ce=b}else ce=Math.max(ce,b)});if(cs!=null)h+=ce-cs;
  return {h:h+all*4,n:its.filter(e=>!e.cancel).length,all}};
 const lvOf=h=>h<=0?0:h<=1.5?1:h<=3.5?2:h<=6?3:4;
 const hTxt=h=>{const r=Math.round(h*2)/2;return (r%1?r.toFixed(1):r)+'h'};
 function busyPanel(all){const sel=S.calsel;let cells='';
  for(let n=0;n<14;n++){const its=all.filter(e=>e.d===n&&!e.cancel),b=busyOf(its),lv=lvOf(b.h),x=dOf(n),wk=x.w===0||x.w===6;
   cells+=`<button class="cbday" data-lv="${lv}" data-act="calpick" data-id="${n}" aria-pressed="${sel===n}" aria-label="${dayName(n)} ${x.m}/${x.d}，${b.n?b.n+' 件，約 '+hTxt(b.h):'有空'}"><span class="cbw${wk?' we':''}">${n===0?'今':WK[x.w]}</span><span class="cbd num">${x.d}</span><span class="cbz" aria-hidden="true">${b.n?`<i style="height:${Math.min(100,Math.round(b.h/8*100))}%"></i>`:''}</span><span class="cbn">${b.n?b.n+' 件':'有空'}</span></button>`}
  const free=Array.from({length:14},(_,n)=>n).filter(n=>!all.some(e=>e.d===n&&!e.cancel)).length;
  let h=`<section class="cbusy" aria-label="接下來 14 天忙閒"><div class="cbhd"><b>接下來 14 天</b><small>${free} 天有空</small><span class="cblg" aria-hidden="true"><i data-lv="0"></i><i data-lv="1"></i><i data-lv="2"></i><i data-lv="3"></i><i data-lv="4"></i></span></div><div class="cbgrid">${cells}</div>`;
  if(sel!=null&&sel>=0&&sel<14){const its=all.filter(e=>e.d===sel),b=busyOf(its);
   h+=`<div class="cbsel"><div class="cbselh"><b>${dayName(sel)}${sel<3?'　'+dlw(sel):''}</b><small>${b.n?b.n+' 件・約 '+hTxt(b.h):''}</small>${mb('收起','calpick',String(sel))}</div>${its.length?`<div class="rows">${its.map(evRow).join('')}</div>`:`<p class="cbfree">這天有空。</p>`}</div>`}
  else h+=`<p class="cbhint">點一天看那天的行程</p>`;
  return h+'</section>'}
 ACT.calpick=id=>{const n=+id;S.calsel=S.calsel===n?null:n;render('keep')};
 const _cp=calPage;calPage=function(){const h=_cp();if(E())return h;const f=S.calf||'all',all=calAll().filter(e=>f==='all'||e.src===f);
  const i=h.indexOf('<div class="seg"');return i<0?h:h.slice(0,i)+busyPanel(all)+h.slice(i)};
 window.__zl=Object.assign(window.__zl||{},{busyOf,goalMini});}
/* ---------- v113（2026-11-24）：行事曆時間條（趁手 handy） ----------
   老大原話（逐流 msg 646）：「行事曆區我覺得要用一個視覺化的方式讓我可以很清楚知道我在哪些日期要忙哪些事情然後這樣我才會知道我什麼時候有空什麼時候沒空」
   2026-11-24：「普通的行事曆，我會沒辦法評估我的時間」「然後這個就放到我們逐流的行事曆那一頁頁面裡面就好」
   任務句：老大打開行事曆頁，5 秒內看出接下來兩週哪幾天滿、滿在什麼、哪些時段還空幾小時。
   做法：一天一條時間條（8 點到 24 點），忙的時段上色（個人藍、公司黃，條上和展開都寫字），空檔是底色；右邊寫「空 N 小時」（只算 9 點到 22 點）。
   最上面一句總結：這 7 天還空幾小時、最空哪天。點一天展開那天的行程與空檔時段。取代 v109 的 14 格忙閒格。
   退回：刪掉這一段（v109 的忙閒格會回來）。 */
{const TL0=8,TL1=24,FW0=9,FW1=22;
 const hm=s=>{const m=/^(\d{1,2}):(\d{2})/.exec(s||'');return m?+m[1]+m[2]/60:null};
 const fmt=h=>{const H=Math.floor(h),M=Math.round((h-H)*60);return String(H).padStart(2,'0')+':'+String(M).padStart(2,'0')};
 const hrs=h=>{const r=Math.round(h*2)/2;return (r%1?r.toFixed(1):String(r))};
 function dayInfo(its){const segs=[],alls=[];
  its.forEach(e=>{if(e.cancel)return;if(e.all||!e.t){alls.push(e);return}const a=hm(e.t);let b=hm(e.e);if(a==null)return;if(b==null||b<=a)b=a+1;segs.push({a,b,e})});
  segs.sort((x,y)=>x.a-y.a);
  const mg=[];segs.forEach(s=>{const l=mg[mg.length-1];if(l&&s.a<=l[1])l[1]=Math.max(l[1],s.b);else mg.push([s.a,s.b])});
  const free=[];let c=FW0;mg.forEach(([a,b])=>{const A=Math.max(a,FW0),B=Math.min(b,FW1);if(B<=FW0||A>=FW1)return;if(A-c>=0.5)free.push([c,A]);c=Math.max(c,B)});if(FW1-c>=0.5)free.push([c,FW1]);
  const busy0=mg.reduce((t,[a,b])=>t+Math.max(0,Math.min(b,FW1)-Math.max(a,FW0)),0);
  // 2026-11-25 全天卻寫「每天約 N 小時」的，空檔扣 N 小時（張弛已在這天排同名時段就不重扣）
  const est=alls.reduce((t,e)=>{const m=/每天約?\s*(\d+(?:\.\d+)?)\s*小時/.exec(e.n||'');if(!m)return t;const k=calKey(e.n);if(segs.some(x=>x.e.src==='tide'&&calKey(x.e.n)===k))return t;return t+(+m[1])},0);
  const freeH0=free.reduce((t,[a,b])=>t+b-a,0);
  return {segs,alls,free,freeH:Math.max(0,freeH0-est),est,busy:busy0+est,n:segs.length+alls.length}}
 const pct=h=>Math.max(0,Math.min(100,(h-TL0)/(TL1-TL0)*100));
 // v115 評估：老大選「要幾小時」，每天找最早一段連續放得下的空檔（今天只看現在以後）
 const fitOf=(i,need,from)=>{for(const [a,b] of i.free){const A=Math.max(a,from);if(b-A>=need-1e-6)return [A,A+need]}return null};
 const NEEDS=[1,2,3,4,6];
 // 立體負荷：一天一棟樓，高度＝排了幾小時，顏色＝那天還空多少（評估時改成放得下／放不下）
 function towers(days,need,now){const W=18,D=10,GAP=25,BASE=118,MAXH=84,X0=8;let g='';
  days.forEach((d,k)=>{const fh=d.n===0?d.i.freeNow:d.i.freeH,busy=Math.max(0,FW1-FW0-fh),h=Math.max(3,Math.round(busy/(FW1-FW0)*MAXH)),x=X0+k*GAP,y=BASE;
   const fit=need?fitOf(d.i,need,d.n===0?now:0):null,st=need?(fit?'ok':'no'):(fh<2?'no':fh<5?'mid':'ok');
   g+=`<g class="tw" data-st="${st}"><polygon class="twr" points="${x+W},${y} ${x+W+D},${y-D/2} ${x+W+D},${y-h-D/2} ${x+W},${y-h}"/><rect class="twf" x="${x}" y="${y-h}" width="${W}" height="${h}"/><polygon class="twt" points="${x},${y-h} ${x+D},${y-h-D/2} ${x+W+D},${y-h-D/2} ${x+W},${y-h}"/>`+
    (need?`<text class="twm" x="${x+W/2+D/2}" y="${y-h-D/2-5}">${fit?'✓':'✕'}</text>`:'')+
    `<text class="tww" x="${x+W/2}" y="${y+14}">${d.n===0?'今':WK[d.x.w]}</text><text class="twd" x="${x+W/2}" y="${y+26}">${d.x.d}</text></g>`});
  const full=BASE-MAXH;
  return `<svg class="twsvg" viewBox="0 0 ${X0+14*GAP+D+4} ${BASE+30}" role="img" aria-label="接下來 14 天每天排了多少，越高越滿"><line class="twcap" x1="0" y1="${full}" x2="${X0+14*GAP+D}" y2="${full}"/><text class="twcapt" x="0" y="${full-4}">排滿（9～22 點）</text>${g}</svg>`}
 function tlEval(days,now){const need=S.tlneed||0;
  const chips=`<div class="tlneed" role="group" aria-label="我要找多久的空檔"><span>我要找</span>${NEEDS.map(n=>`<button class="mb" data-act="tlneed" data-id="${n}" aria-pressed="${need===n}">${n} 小時</button>`).join('')}${need?`<button class="mb" data-act="tlneed" data-id="0">不評估</button>`:''}</div>`;
  if(!need)return chips;
  const wk=days.slice(0,7).map(d=>({d,f:fitOf(d.i,need,d.n===0?now:0)})),ok=wk.filter(x=>x.f),first=days.map(d=>({d,f:fitOf(d.i,need,d.n===0?now:0)})).find(x=>x.f);
  const lab=d=>d.n===0?'今天':d.n===1?'明天':'週'+WK[d.x.w];
  return chips+`<p class="tlverdict${ok.length?'':' bad'}">要連續 <b>${need}</b> 小時：這 7 天 <b>${ok.length}</b> 天可以${first?`，最快 <b>${lab(first.d)} ${fmt(first.f[0])}</b>`:'，兩週內都排不進'}${wk.length-ok.length?`；${wk.filter(x=>!x.f).map(x=>lab(x.d)).join('、')}不行`:''}。</p>`}
 ACT.tlneed=id=>{const n=+id;S.tlneed=n&&S.tlneed!==n?n:0;render('keep')};
 function tlPanel(all){const sel=S.calsel,now=(()=>{const t=new Date(Date.now()+8*3600e3);return t.getUTCHours()+t.getUTCMinutes()/60})();
  const days=Array.from({length:14},(_,n)=>({n,x:dOf(n),i:dayInfo(all.filter(e=>e.d===n))}));
  // 今天只算現在之後的空檔
  const d0=days[0].i;d0.freeNow=Math.max(0,d0.free.reduce((t,[a,b])=>t+Math.max(0,b-Math.max(a,now)),0)-(d0.est||0));
  const wk=days.slice(0,7),freeWk=wk.reduce((t,d)=>t+(d.n===0?d0.freeNow:d.i.freeH),0);
  const best=wk.slice(1).sort((p,q)=>q.i.freeH-p.i.freeH)[0];
  const full=wk.filter(d=>(d.n===0?d0.freeNow:d.i.freeH)<2).length;
  let nx=null;for(const d of days){const c=d.i.segs.filter(s=>d.n>0||s.a>now).sort((p,q)=>p.a-q.a)[0];if(c){nx={d,s:c};break}}
  const nxt=nx?(()=>{const mins=Math.round(((nx.d.n*24+nx.s.a)-now)*60),wait=mins<60?mins+' 分鐘後':mins<1440?Math.floor(mins/60)+' 小時'+(mins%60?(mins%60)+' 分':'')+'後':(nx.d.n===1?'明天':'週'+WK[nx.d.x.w]);
   return `<p class="tlnext"><span>下一件</span><b>${esc(String(nx.s.e.n||''))}</b><small>${nx.d.n===0?'今天':nx.d.n===1?'明天':'週'+WK[nx.d.x.w]} ${fmt(nx.s.a)}・${wait}</small></p>`})():'';
  const ruler=[8,12,16,20,24].map(h=>`<span style="left:${pct(h)}%">${h}</span>`).join('');
  let rows='';
  days.forEach(d=>{const i=d.i,we=d.x.w===0||d.x.w===6,fh=d.n===0?d0.freeNow:i.freeH,tight=fh<2,open=sel===d.n;
   const bars=i.segs.map(s=>{const w=Math.max(1.2,pct(s.b)-pct(s.a));return `<i class="tlseg" data-s="${s.e.src}" style="left:${pct(s.a)}%;width:${w}%">${w>=14?`<span>${esc(String(s.e.n||''))}</span>`:''}</i>`}).join('');
   const now_=d.n===0&&now>=TL0&&now<=TL1?`<b class="tlnow" style="left:${pct(now)}%" aria-hidden="true"></b>`:'';
   const past=d.n===0?`<i class="tlpast" style="width:${pct(Math.min(Math.max(now,TL0),TL1))}%"></i>`:'';
   const lab=`${d.n===0?'今天':d.n===1?'明天':'週'+WK[d.x.w]}　${d.x.m}/${d.x.d}`,need=S.tlneed||0,fit=need?fitOf(i,need,d.n===0?now:0):null;
   const fitBox=fit?`<i class="tlfit" style="left:${pct(fit[0])}%;width:${pct(fit[1])-pct(fit[0])}%"></i>`:'';
   const summ=i.n?`${i.n} 件・空 ${hrs(fh)} 小時`:`整天有空`;
   rows+=`<div class="tlday${open?' open':''}${we?' we':''}"><button class="tlrow" data-act="tlpick" data-id="${d.n}" aria-expanded="${open}" aria-label="${lab}，${summ}"><span class="tll${we?' we':''}"><b>${d.n===0?'今天':d.n===1?'明天':'週'+WK[d.x.w]}</b><small class="num">${d.x.m}/${d.x.d}</small></span><span class="tlbar${need?(fit?' fit':' nofit'):''}" aria-hidden="true">${past}${bars}${fitBox}${now_}${i.alls.length?`<em class="tlall">全天 ${i.alls.length}</em>`:''}</span>${need?`<span class="tlf tlv ${fit?'ok':'no'}"><b>${fit?'✓':'✕'}</b><small>${fit?fmt(fit[0])+' 起':'不夠'}</small></span>`:''}<span class="tlf${tight?' tight':fh>=6?' roomy':''}"${need?' hidden':''}><b class="num">${hrs(fh)}</b><small>小時空</small>${i.busy>0?`<small class="tlbz">排 ${hrs(i.busy)}</small>`:''}</span></button>`;
   if(open){const ev=all.filter(e=>e.d===d.n),alls=ev.filter(e=>e.all||!e.t),timed=ev.filter(e=>!(e.all||!e.t));
    const items=timed.map(e=>({k:hm(e.t)||0,h:`<div class="rows">${evRow(e)}</div>`}));
    i.free.forEach(([a,b])=>{const A=d.n===0?Math.max(a,now):a;if(b-A<0.5)return;items.push({k:A-0.001,h:`<p class="tlgap"><span><b>空 ${hrs(b-A)} 小時</b>${fmt(A)}～${fmt(b)}</span></p>`})});
    items.sort((x,y)=>x.k-y.k);
    rows+=`<div class="tlx">${alls.length?`<div class="rows">${alls.map(evRow).join('')}</div>`:''}${items.length?items.map(x=>x.h).join(''):`<p class="tlnone">這天沒有行程，也沒有空檔可算。</p>`}${i.free.length?'':`<p class="tlnone">9 點到 22 點沒有空檔。</p>`}</div>`}
   rows+='</div>'});
  return `<section class="tl" aria-label="接下來兩週的時間">
   <div class="tlhd">${tlEval(days,now)}<p class="tlsum"${S.tlneed?' hidden':''}>這 7 天還空 <b class="num">${hrs(freeWk)}</b> 小時${best?`，最空是${best.n===1?'明天':'週'+WK[best.x.w]}（${hrs(best.i.freeH)} 小時）`:''}${full?`，${full} 天幾乎排滿`:''}。</p>
   <p class="tlkey"><span><i data-s="me"></i>個人</span><span><i data-s="co"></i>公司</span><span><i class="tlk-free"></i>空檔</span><small>空檔只算 9 點到 22 點</small></p>${towers(days,S.tlneed||0,now)}${nxt}</div>
   <div class="tlruler" aria-hidden="true"><span class="tll"></span><span class="tlbar tlr">${ruler}</span><span class="tlf"></span></div>
   ${rows}<p class="cbhint">點一天看那天的行程和空檔時段</p></section>`}
 ACT.tlpick=id=>{const n=+id;S.calsel=S.calsel===n?null:n;render('keep')};
 const _cp2=calPage;calPage=function(){const h=_cp2();if(E())return h;const f=S.calf||'all',all=calAll().filter(e=>f==='all'||e.src===f);
  // 換掉 v109 的 14 格忙閒格；篩選（全部／個人／公司）放到時間條上面，切了時間條跟著變
  let x=h.replace(/<section class="cbusy"[\s\S]*?<\/section>/,'');
  const seg2=x.match(/<div class="seg" role="group" aria-label="看哪邊">[\s\S]*?<\/div>/);
  const i=x.indexOf('<div class="seg"');if(i<0)return x;
  if(seg2)x=x.replace(seg2[0],'');
  return x.slice(0,i)+(seg2?seg2[0]:'')+tlPanel(all)+x.slice(i)};
 window.__zl=Object.assign(window.__zl||{},{tlDay:dayInfo});}
/* ---------- 2026-11-25 按需載入：切房間時補讀、讀失敗的區顯示重試 ---------- */
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{roomWatch()}catch(e){}return r}}
function roomWatch(){if(!LV.at||!LZ.seen||S.st==='loading')return;const k=zoneOf(S.tab)+(S.page==='cal'?':cal':'');if(k===LZ.seen)return;LZ.seen=k;
 const ks=zKeys().filter(zStale);if(ks.length)loadZones(ks).then(()=>{LV.sig='';paint()})}
function zhm(ks){const t=Math.max(0,...ks.map(k=>LZ.at[k]||0));if(!t)return '還沒讀到';const d=new Date(t);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
function zbanner(keys){if(S.st==='loading'||S.st==='error')return '';const bad=keys.filter(k=>LZ.err[k]);if(!bad.length)return '';
 return `<div class="zerr" role="status"><span>這區有資料沒讀到，上次更新 ${zhm(keys)}</span><button class="btn sm" data-act="zretry">重試</button></div>`}
{const _v=viewHTML;viewHTML=function(){const h=_v.apply(this,arguments);return S.page?h:zbanner(zKeys())+h}}
{const _p=pageHTML;pageHTML=function(){const h=_p.apply(this,arguments);return S.page==='cal'?zbanner(['cal'])+h:h}}
ACT.zretry=()=>{const ks=zKeys().filter(k=>LZ.err[k]||zStale(k));toast('重新讀取中');loadZones(ks).then(()=>{LV.sig='';paint();if(zKeys().some(k=>LZ.err[k]))toast('還是沒讀到，等一下再試')})};
window.__zl=Object.assign(window.__zl||{},{LZ,loadZones});
/* ---------- v122（2026-11-25）：首頁「今天」合成一塊 ----------
   老大：「今天的節奏跟今天的行事曆 我有點搞不懂為什麼要這樣設計」「還有 4 件 › 跟看全部的按鈕是一樣的，還有四件你應該把收合展開不是跳轉頁面」
   「原本我們在裡面的行事曆那個 還有多少時間多少空檔 幾個小時那個我真的覺得還不錯 可能可以結合？」「我覺得要把張弛排的算忙碌」
   做法：原本「今天行程」與「今天的節奏」合成一塊「今天」：一條時間條（行事曆＋張弛排的時段都算忙碌）、右邊空幾小時與最長空檔；
   下面照時間排：行程、張弛排的開工時段、出門／上線、內部截止；先列 4 件，「還有 N 件」原地展開／收起；最底下一行灰字注意事項；再一行「明天」摘要。
   也拿掉首頁每次重畫都叫行事曆同步（calKick），只有按 ↻ 才同步（資料庫降載）。退回：刪掉這一段（舊 todayStrip 與 bot_voice 的 #tideBox 會回來）。 */
{const KIND={leave:'出門',internal_due:'內部截止',hard_stop:'收手'};
 const tw=iso=>{const x=new Date(Date.parse(iso)+8*3600e3);return{h:x.getUTCHours()+x.getUTCMinutes()/60,d:Math.round((Date.UTC(x.getUTCFullYear(),x.getUTCMonth(),x.getUTCDate())-(()=>{const t=new Date(Date.now()+8*3600e3);t.setUTCHours(0,0,0,0);return t.getTime()})())/864e5)}};
 const f2=v=>String(Math.floor(v)).padStart(2,'0')+':'+String(Math.round((v%1)*60)).padStart(2,'0');
 const pc=v=>Math.max(0,Math.min(100,(v-8)/16*100));
 const nowH=()=>{const x=new Date(Date.now()+8*3600e3);return x.getUTCHours()+x.getUTCMinutes()/60};
 function dayOf(n){const Z=window.__zl,its=calAll().filter(e=>e.d===n&&!e.cancel),i=Z&&Z.tlDay?Z.tlDay(its):null,nh=nowH();
  const marks=(window.__tideRows||[]).filter(r=>r.kind!=='start'&&r.at&&tw(r.at).d===n).map(r=>({h:tw(r.at).h,r}));
  let free=i?i.free.map(f=>n===0?[Math.max(f[0],nh),f[1]]:f).filter(f=>f[1]-f[0]>=0.5):[];
  const fh=Math.max(0,free.reduce((t,f)=>t+f[1]-f[0],0)-((i&&i.est)||0)),big=free.slice().sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]))[0];
  const notes=[];(window.__tideRows||[]).forEach(r=>{if(!r.at||tw(r.at).d!==n)return;const m=r.meta||{};[m.note,m.warn].forEach(x=>{if(x&&notes.indexOf(x)<0)notes.push(x)})});
  return {its,i,marks,fh,big,notes}}
 function bar(n,D){const i=D.i;if(!i)return '';const nh=nowH();
  const segs=i.segs.map(s=>`<i class="tdseg" data-s="${s.e.src}" style="left:${pc(s.a)}%;width:${Math.max(1.5,pc(s.b)-pc(s.a))}%"></i>`).join('');
  const pins=D.marks.map(m=>`<i class="tdpin" data-k="${m.r.kind}" style="left:${pc(m.h)}%"></i>`).join('');
  const past=n===0?`<i class="tdpast" style="width:${pc(nh)}%"></i>`:'';
  return `<div class="tdbar"><span class="tdtrack" aria-hidden="true">${past}${segs}${pins}</span><span class="tdfree${D.fh<2?' tight':''}"><b class="num">${Math.round(D.fh*2)/2}</b> 小時空${D.big?`<small>最長 ${f2(D.big[0])}～${f2(D.big[1])}</small>`:''}</span></div>`}
 function rows(D){const out=[];
  D.its.filter(e=>e.all||!e.t).forEach(e=>out.push({k:-1,h:`<button class="tdi" data-act="sheet" data-id="cal:${esc(e.id)}"><span class="tm">全天</span><b>${e.cs?esc(e.cs)+'・':''}${esc(e.n)}</b><i class="tdd" data-s="${e.src}"></i></button>`}));
  D.its.filter(e=>!(e.all||!e.t)).forEach(e=>{const m=/^(\d+):(\d+)/.exec(e.t);out.push({k:m?+m[1]+m[2]/60:0,h:`<button class="tdi${e.src==='tide'?' tide':''}" data-act="sheet" data-id="cal:${esc(e.id)}"><span class="tm">${esc(e.t)}${e.e?'～'+esc(e.e):''}</span><b>${e.cs&&e.src!=='tide'?esc(e.cs)+'・':''}${esc(e.src==='tide'?String(e.n).replace(/^張弛排：/,''):e.n)}</b>${e.src==='tide'?'<small>張弛排的開工時段</small>':e.place?`<small>${esc(e.place)}</small>`:''}<i class="tdd" data-s="${e.src}"></i></button>`})});
  D.marks.forEach(m=>{const r=m.r,k=r.kind==='leave'?(r.verb||'出門'):(KIND[r.kind]||r.kind);out.push({k:m.h-0.001,h:`<div class="tdi tdmk" data-k="${r.kind}"><span class="tm">${f2(m.h)}</span><b>${esc(k)}</b><small>${esc(String(r.title||'').replace(/\s*@Borry/i,''))}</small></div>`})});
  return out.sort((a,b)=>a.k-b.k).map(x=>x.h)}
 ACT.tdmore=()=>{S.tdOpen=!S.tdOpen;render('keep')};
 todayStrip=function(){if(S.st==='loading'||S.st==='error')return '';
  const D=dayOf(0),R=rows(D),ago=calAgo(),open=!!S.tdOpen,N=4;
  const T=dayOf(1),tr=rows(T),tfirst=T.its.filter(e=>!(e.all||!e.t)).concat([]).sort((a,b)=>String(a.t).localeCompare(String(b.t)))[0];
  let h=`<section class="sec tday v122"><div class="tdh"><h2>今天<small>${D.its.length+D.marks.length?(D.its.length+D.marks.length)+' 件':'沒有行程'}</small></h2><span class="tdh-r">${mb('＋ 新增','sheet','calnew')}${moreB('行事曆','page','cal')}</span></div>`;
  h+=bar(0,D);
  if(R.length){h+=`<div class="tdl">${(open?R:R.slice(0,N)).join('')}</div>`;if(R.length>N)h+=`<button class="tdm" data-act="tdmore" aria-expanded="${open}">${open?'收起':'還有 '+(R.length-N)+' 件'}</button>`}
  if(D.notes.length)h+=`<p class="tdnote">${D.notes.map(esc).join('；')}</p>`;
  h+=`<p class="tdtmr"><b>明天</b> 空 ${Math.round(T.fh*2)/2} 小時${T.big?`・最長 ${f2(T.big[0])}～${f2(T.big[1])}`:''}${tfirst?`・第一件 ${esc(tfirst.t)} ${esc(String(tfirst.n).replace(/^張弛排：/,''))}`:''}</p>`;
  if(ago)h+=`<p class="tdu">行事曆 ${esc(ago)}更新${mb('↻','calnow','',' aria-label="現在更新"')}</p>`;
  return h+'</section>'};
 window.__tideInline=true;}
window.__zl=Object.assign(window.__zl||{},{LV,ACT,GL,DB,CAL,MZ,S,paint:d=>paint(d)});

render('stgroot');
try{const q=new URLSearchParams(location.search);if(q.get('sub')){const [z,s]=q.get('sub').split(':');S.sub[z]=s;render()}if(q.get('filt')){S.filt=q.get('filt');render()}if(q.get('sheet'))ACT.sheet(q.get('sheet'));if(q.get('page'))ACT.page(q.get('page'));if(q.get('chat'))ACT.bot(q.get('chat'))}catch(e){}
})();
