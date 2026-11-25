/*!
 * bot_face.js  Grok Bot 隊的會動頭像（逐流版 1122-F（萌萌雲朵、定定六角、金金六角星；1122-E 反黑、大器紫黑），從 tata_face.js 1122-A2 擴出）
 * 單檔、零依賴。照 Grok Bot App 內建頭像系統：依 shape 畫身體、兩隻挖空直立膠囊眼、
 * 沒有嘴、沒有腮紅、沒有配件。表情全靠眼形與身體動作。
 *
 * 用法：
 *   var face = BotFace.mount(el, { preset: 'gig', size: 64 });       // tata、gig、pompom、daqi、monmon、dinding、kimkim
 *   var face = BotFace.mount(el, { shape: 'square', color: '#1084FE' }); // 自己指定
 *   face.setMood('over');            // idle speaking logged over poke sleepy thinking alert
 *   face.setMood('logged', { label: '+1' });  // 小數字（64px 以上才顯示）
 *   face.setColor('#00C972');        // 換成房間色（也吃 App 色名：orange、cyan…）
 *   face.poke();                     // spin、bounce、nod 隨機一種
 *   face.destroy();
 *
 * shape：sphere（App 的 blob）、square、tablet（橫躺膠囊，1122-D）、hex（圓角六邊厚板）、star6（App 的 star，
 *   六角星厚板）、cloud（五顆球拼成的雲，1122-F）。teardrop 介面保留，目前畫成 sphere 並在 console 提醒一次
 *   （要加形狀用 BotFace.registerShape）。
 * outline:true（1122-F，給白色的定定）：一般底色時沿輪廓加一圈淡淡的深色描邊，奶油白卡片上才看得到；
 *   描邊色吃 CSS 變數 --bot-line；反黑時不描邊。
 * 顏色：選項 color 優先；沒給就吃 CSS 變數 --bot-body，再退回 --tata-body，最後 #FF6700。
 *   --bot-eye（或 --tata-eye）有設才填眼睛，沒設就是挖空透出底色。
 * 其他選項：shadow、followPointer、label（aria 名稱）、names（各 mood 的 aria 說法）、reduceMotion。
 * logged 與 poke 是一次性動作，播完回到上一個常駐 mood。
 * 相容：window.TataFace 仍可用（等於 preset 'tata'）。
 *
 * 反黑（1122-E）：放在整塊房間色的面上用。整隻變黑剪影、高光收掉、眼睛挖空透出底色；
 *   回到一般底色再顯示自己的顏色。mount 時給 tone:'ink'（或 invert:true），之後 face.setTone('ink'｜'color')，
 *   切換有 0.28 秒過渡。黑的顏色吃 CSS 變數 --bot-ink（預設 #0B0A10）；--bot-ink-in 有設，耳內會用它（給房間色）。
 * calm（1122-E 收進正本）：0 到 1，小尺寸時把姿勢偏移量打折（24 到 32px 建議 0.4），被戳轉圈例外。
 *
 * 大器（preset 'daqi'，1122-E 改版）：跟另外三隻同一套：球身、兩隻直立膠囊眼、沒有嘴、沒有眼鏡，
 *   只多兩隻黑豹耳。紫黑配色：一般底上紫色身體、黑色填色的眼睛與耳內；反黑時整隻黑、眼睛透出底下的紫。
 *   setColor() 換的是身體色（跟其他三隻一樣）。
 *   相關選項（其他隻也能單獨開）：ears:'panther'、earIn（耳內色）、eye（眼睛填色）、fit（整體縮放，留位置給耳朵）、
 *   eyeTilt（眼尾上揚角度）、sep（兩眼間距角）、glasses:true（細線眼鏡，舊版大器用）、
 *   colorTarget:'accent'＋accent（本體色固定、setColor 換點綴色，舊版大器用）。
 *   speaking 是新增的常駐 mood：身體跟著講話節奏點，右下角四根聲波條；每一隻都能用。
 */
(function (root) {
  'use strict';

  var R = 44;                 // 球半徑（viewBox 單位，viewBox 是 -50 -50 100 100）
  var SEP = 17;               // 兩眼各離臉中心的角度
  var NS = 'http://www.w3.org/2000/svg';
  var PI = Math.PI, D2R = PI / 180;
  var MOOD_LIST = ['idle', 'speaking', 'logged', 'over', 'poke', 'sleepy', 'thinking', 'alert'];
  var MOOD_NAME = {
    idle: '待機', speaking: '說話中', logged: '剛完成一件', over: '不妙', poke: '被點',
    sleepy: '想睡', thinking: '端詳', alert: '提醒'
  };

  // App 色票（index.eager-common-D2eZn7JB.js 的 dn 陣列）
  var COLORS = {
    black: '#000', brown: '#936439', red: '#FF263C', orange: '#FF6700', yellow: '#FF9800',
    green: '#00C972', cyan: '#00BCA6', blue: '#1084FE', violet: '#9159FE', magenta: '#FF309B', gray: '#777777'
  };
  // App 的形狀別名（同檔 o_() 與 Aa：blob→sphere、star→star6、heart→heartChubby、flower→starFlower）
  var ALIAS = { blob: 'sphere', star: 'star6', heart: 'heartChubby', flower: 'starFlower', hexagon: 'hex' };
  var RESERVED = ['teardrop'];

  // 預設三隻（設定值來自 ~/grokbot-memory-export/_profiles/*/profile.json）
  var PRESETS = {
    tata:   { shape: 'sphere', color: '#FF6700', label: '塔塔',
      names: { logged: '記帳成功', over: '超支', alert: '帳單將到期' } },
    // 集集、朋朋 2026-11-22 05:11 老大在 Grok Bot 改過（sand-client-persistence：集集 square／blue、朋朋 tablet／green）
    gig:    { shape: 'square', color: '#1084FE', label: '集集',
      names: { logged: '新機會進來', over: '案子卡住', thinking: '評估中', alert: '截止快到' } },
    pompom: { shape: 'tablet', color: '#00C972', label: '朋朋',
      names: { logged: '辦好一件', over: '卡住了', alert: '要你確認' } },
    // 1122-F 三隻（Grok Bot 本機資料唯讀查到：萌萌 cloud／yellow、定定 hex、金金 star／orange）
    // 定定本機讀到 black，老大 2026-11-22 說「定定是白色的！」，以老大為準：白身體、深色眼睛、淡描邊
    monmon:  { shape: 'cloud', color: '#FF9800', label: '萌萌',
      names: { thinking: '比價中', logged: '比好了', alert: '價格變了' } },
    dinding: { shape: 'hex', color: '#FFFFFF', eye: '#17151E', outline: true, label: '定定',
      names: { thinking: '想一下', logged: '有看法了', alert: '有風險' } },
    // 肉咖：公司 Mac 的 AI（好咖）。老大 2026-11-23 定 F2：桃紅底、黑剪影、黃色只放在眼睛（README 1123_PixPix_肉咖臉）；
    // 老大：「肉咖的臉請幫我也設計一個會動的。」「紫色應該是大器，桃紅色粉紅色才是肉咖」。會動版：桃紅身體、黃眼、黑描邊，黃只在眼睛
    // 2026-11-24 老大：「你看皮皮給的肉咖大頭照改啦」（msg 624）→ 照皮條客上的肉咖大頭照（公司 Mac haoka-pimp/site/icons/rouka.jpg，豹紋守宮）：金黃身體、深色眼睛
    rouka:   { shape: 'gecko', color: '#FFB22E', eye: '#2A1608', outline: true, label: '肉咖',   // 老大 2026-11-23：「你應該要用皮皮傳過來的頭像去設計一個這種泡泡質感的動圖」→ 照 F2：黑頭、黃眼、頭頂兩眼鼓起；桃紅留給按鈕與描邊
      names: { thinking: '在做', logged: '做好了', alert: '要你看' } },
    baba:    { shape: 'shield', color: '#FFFFFF', eye: '#17151E', outline: true, label: '霸霸',   // 老大 2026-11-23：「霸霸是白色的」（Grok Bot 本機資料是 black，以老大為準）
      names: { thinking: '設置中', logged: '設好了', alert: '要你點頭' } },
    kimkim:  { shape: 'star6', color: '#FF6700', label: '金金',
      names: { thinking: '看值不值', logged: '看完了', alert: '先別買' } },
    // 大器：不是 Grok Bot，是照同一套畫法自己設計的。1122-E：紫色球身（App 色票 violet）、黑眼、黑耳內、兩隻黑豹耳
    // 逐流監工（2026-11-25 老大：逐流監工就是大器，管面板，所以加逐流四色光環；挑「一、光環」，要流動絲滑）
    jian:   { shape: 'sphere', color: '#9159FE', eye: '#0E0C16', earIn: '#0E0C16',
      ears: 'panther', fit: 0.86, ring: 'zhuliu', label: '逐流監工',
      names: { idle: '待命', speaking: '說話中', thinking: '思考中', logged: '改好了', over: '不妙', alert: '要你看', sleepy: '想睡' } },
    daqi:   { shape: 'sphere', color: '#9159FE', eye: '#0E0C16', earIn: '#0E0C16',
      ears: 'panther', fit: 0.86, label: '大器',
      names: { idle: '待命', speaking: '說話中', thinking: '思考中', logged: '完成', over: '不妙', alert: '提醒你', sleepy: '想睡' } }
  };
  function resolveColor(c) { return c ? (COLORS[c] || c) : ''; }

  /* ---------- 形狀登錄 ---------- */
  // kind 'sphere'：球面貼眼（原 tata_face 的做法）
  // kind 'slab'：平面輪廓擠出成厚板，眼睛貼在正面（App 的 extrusion，seat 'front'）
  var SHAPES = {
    sphere: { kind: 'sphere' },
    // hex：App 2D 輪廓 ms(114,6,20,π/6)＝外接圓半徑 114、6 邊、圓角 20、從 30 度起算（尖角朝上下）；
    // 3D 是 extrusion（_l：halfDepth .36、bevel .22），size 1.2519；眼睛 jo.hex＝預設值（.26／.57／.64／.12）
    hex: {
      kind: 'slab', half: 0.92, corner: 20 / 114, depth: 0.36,
      eye: { w: 1, h: 1, gap: 1, shiftY: 0.12 },
      pose: { yaw: -12, pitch: 10, roll: -12, k: 0.55 },
      path: function (S, c) { return roundPoly(6, S, S * c, PI / 6); }
    },
    // star6：App 2D 輪廓是常數 Os（一段 SVG 路徑，六個圓角尖），這裡照原路徑以中心為原點、半高 1 正規化；
    // 3D 是 extrusion halfDepth .30、bevel .18，size 1.4976；眼睛 jo.star6＝寬 .184782、高 .44966、間距 .419133
    star6: {
      kind: 'slab', half: 0.98, corner: 0, depth: 0.30,
      eye: { w: 0.184782 / 0.26, h: 0.44966 / 0.57, gap: 0.419133 / 0.64, shiftY: 0.12 },
      pose: { yaw: -10, pitch: 10, roll: -10, k: 0.55 },
      path: function (S) { return scalePath(STAR_D, S); }
    },
    // cloud：App 2D 輪廓 hs([[L-62,L+26,56],[L+62,L+26,54],[L,L+34,62],[L-24,L-30,62],[L+38,L-26,54]])＝五個圓的聯集；
    // 3D 是 loft depth .72（輪廓往前後收成枕頭），size 1.3455；眼睛 seat loft，jo.cloud＝寬 .21294、高 .46683、間距 .470016、shiftY .07
    // 這裡把五個圓當五顆球（以 L 為單位，y 朝下），每格把球心轉一次再畫圓，任何角度輪廓都對
    cloud: {
      kind: 'cloud', half: 0.98,
      balls: [[-62, 26, 56], [62, 26, 54], [0, 34, 62], [-24, -30, 62], [38, -26, 54]],
      eye: { w: 0.21294 / 0.26, h: 0.46683 / 0.57, gap: 0.470016 / 0.64, shiftY: 0.07 },
      pose: { yaw: 16, pitch: 12, roll: 6, k: 0.6 }
    },
    // square：App 用 Ts(107,28)＝四角在畫布中心 ±107、圓角 28 的圓角正方（畫布半寬 L=114.2705）；
    // 3D 是 extrusion halfDepth .36、bevel .22；眼睛 jo.square＝寬 .2553、高 .5598、間距 .5294、shiftY .12
    square: {
      kind: 'slab', half: 0.80, corner: 28 / 107, depth: 0.36,
      eye: { w: 0.2553 / 0.26, h: 0.5598 / 0.57, gap: 0.5294 / 0.64, shiftY: 0.12 },
      path: function (S, c) { return roundRect(S, S, S * c); }
    },
    // tablet：App 2D 輪廓 _s(114,74)＝半寬 114、半高 74、兩端半圓（橫的體育場形）；
    // 3D 是 pill axis 0＝沿 x 軸躺平的膠囊（圓柱＋兩端半球），size 1.3923；
    // 眼睛 seat wrapX＝繞著圓柱面貼，jo.tablet＝寬 .2132、高 .4674、間距 .587776、shiftY .02
    // shield：霸霸（Grok Bot 本機資料 avatarShape shield／black，2026-11-23 唯讀查到）。盾牌：平頂圓角、兩側直下、底部收成圓尖；3D 照 hex 的 extrusion
    shield: {
      kind: 'slab', half: 0.95, corner: 0, depth: 0.34,
      eye: { w: 1, h: 0.92, gap: 1, shiftY: 0.02 },
      pose: { yaw: -12, pitch: 10, roll: -8, k: 0.55 },
      path: function (S) { return scalePath('M-0.86 -0.72Q-0.86 -0.92 -0.66 -0.92H0.66Q0.86 -0.92 0.86 -0.72V0.06C0.86 0.52 0.46 0.82 0 1C-0.46 0.82 -0.86 0.52 -0.86 0.06Z', S); }
    },
    // gecko：肉咖（老大 2026-11-23：「肉咖要像是一隻守宮」）。守宮頭：寬扁、兩眼在頭頂兩側鼓起、吻端圓，3D 照 extrusion
    gecko: {
      kind: 'slab', half: 0.96, corner: 0, depth: 0.32,
      eye: { w: 2.1, h: 0.62, gap: 2.45, shiftY: -0.50 }, eyeY: -0.50,
      pose: { yaw: -8, pitch: 12, roll: -5, k: 0.55 },
      path: function (S) { return scalePath('M-1 0.10C-1 0.52 -0.58 0.70 0 0.70C0.58 0.70 1 0.52 1 0.10C1 -0.10 0.97 -0.26 0.92 -0.40C0.92 -0.70 0.76 -0.92 0.56 -0.92C0.38 -0.92 0.24 -0.76 0.22 -0.52C0.12 -0.48 -0.12 -0.48 -0.22 -0.52C-0.24 -0.76 -0.38 -0.92 -0.56 -0.92C-0.76 -0.92 -0.92 -0.70 -0.92 -0.40C-0.97 -0.26 -1 -0.10 -1 0.10Z', S); }
    },
    tablet: {
      kind: 'pill', half: 0.98, radius: 74 / 114,
      eye: { w: 0.2132 / 0.26, h: 0.4674 / 0.57, gap: 0.587776 / 0.64, shiftY: 0.02 }
    }
  };
  var STAR_D = 'M-0.1551 -0.8531C-0.1039 -1.0000 0.1039 -1.0000 0.1551 -0.8531L0.2356 -0.6226C0.2624 -0.5457 0.3414 -0.5001 0.4214 -0.5153L0.6613 -0.5609C0.8141 -0.5899 0.9180 -0.4101 0.8164 -0.2922L0.6569 -0.1073C0.6038 -0.0456 0.6038 0.0456 0.6569 0.1073L0.8164 0.2922C0.9180 0.4101 0.8141 0.5900 0.6613 0.5609L0.4214 0.5153C0.3414 0.5001 0.2624 0.5457 0.2356 0.6226L0.1551 0.8531C0.1039 1.0000 -0.1039 1.0000 -0.1551 0.8531L-0.2356 0.6226C-0.2624 0.5457 -0.3414 0.5001 -0.4214 0.5153L-0.6613 0.5609C-0.8141 0.5900 -0.9180 0.4101 -0.8164 0.2922L-0.6569 0.1073C-0.6038 0.0456 -0.6038 -0.0456 -0.6569 -0.1073L-0.8164 -0.2922C-0.9180 -0.4101 -0.8141 -0.5899 -0.6613 -0.5609L-0.4214 -0.5153C-0.3414 -0.5001 -0.2624 -0.5457 -0.2356 -0.6226L-0.1551 -0.8531Z';
  function scalePath(d, k) {
    return d.replace(/-?\d+(\.\d+)?/g, function (n) { return (+n * k).toFixed(3); });
  }
  // 正多邊形加圓角（App 的 ms → ps 逐角加圓角）：n 邊、外接圓半徑 S、圓角半徑 r、起始角 rot
  function roundPoly(n, S, r, rot) {
    var P = [], i, d = '';
    for (i = 0; i < n; i++) P.push([S * Math.cos(rot + i * 2 * PI / n), S * Math.sin(rot + i * 2 * PI / n)]);
    var half = PI / 2 - PI / n, cut = r / Math.tan(half);   // 每個內角的一半，切點離頂點的距離
    for (i = 0; i < n; i++) {
      var a = P[(i + n - 1) % n], v = P[i], b = P[(i + 1) % n];
      var la = Math.hypot(a[0] - v[0], a[1] - v[1]), lb = Math.hypot(b[0] - v[0], b[1] - v[1]);
      var p1 = [v[0] + (a[0] - v[0]) / la * cut, v[1] + (a[1] - v[1]) / la * cut];
      var p2 = [v[0] + (b[0] - v[0]) / lb * cut, v[1] + (b[1] - v[1]) / lb * cut];
      d += (i ? 'L' : 'M') + p1[0].toFixed(3) + ' ' + p1[1].toFixed(3) + 'A' + r.toFixed(3) + ' ' + r.toFixed(3) + ' 0 0 1 ' + p2[0].toFixed(3) + ' ' + p2[1].toFixed(3);
    }
    return d + 'Z';
  }
  function roundRect(hw, hh, r) {
    return 'M' + (-hw + r) + ' ' + (-hh) + 'H' + (hw - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + hw + ' ' + (-hh + r) +
      'V' + (hh - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (hw - r) + ' ' + hh + 'H' + (-hw + r) +
      'A' + r + ' ' + r + ' 0 0 1 ' + (-hw) + ' ' + (hh - r) + 'V' + (-hh + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (-hw + r) + ' ' + (-hh) + 'Z';
  }
  var warned = {};
  function resolveShape(s) {
    s = ALIAS[s] || s || 'sphere';
    if (SHAPES[s]) return s;
    if (!warned[s] && root.console) {
      warned[s] = 1;
      root.console.warn('BotFace：形狀 ' + s + (RESERVED.indexOf(s) >= 0 ? ' 介面已留、還沒畫，' : ' 不認得，') + '先畫成 sphere');
    }
    return 'sphere';
  }

  /* ---------- 小工具 ---------- */
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function ss(a, b, x) { var k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); }
  function ease(k) { return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }
  function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
  // 梯形包絡：a 到 b 升起，c 到 d 落下
  function bump(a, b, c, d, x) { return ss(a, b, x) * (1 - ss(c, d, x)); }
  // 眨眼：0.10 秒閉、0.16 秒開，合計 0.26 秒（k 可放慢）
  function blink(t, t0, k) {
    k = k || 1;
    var x = (t - t0) / k;
    if (x <= 0 || x >= 0.26) return 0;
    return x < 0.10 ? ease(x / 0.10) : 1 - ease((x - 0.10) / 0.16);
  }
  function blinks(t, list, k) {
    var m = 0;
    for (var i = 0; i < list.length; i++) { var v = blink(t, list[i], k); if (v > m) m = v; }
    return m;
  }
  function wrap180(a) { a = ((a + 180) % 360 + 360) % 360 - 180; return a; }

  /* ---------- 眼形：[寬, 高, 上下彎, 左右彎, 傾斜度, 下移]，單位是球半徑 ---------- */
  var EYE = {
    neutral: [0.21, 0.46, 0, 0, 0, 0],          // 直立膠囊
    happy:   [0.36, 0.15, 0.13, 0, 0, -0.02],   // 上彎弧
    sad:     [0.20, 0.36, 0, 0, 16, 0.05],      // 略斜下
    sleepy:  [0.36, 0.09, -0.10, 0, 0, 0.06],   // 下彎細弧
    wide:    [0.34, 0.46, 0, 0, 0, 0],          // 睜大變圓
    big:     [0.27, 0.54, 0, 0, 0, 0],          // 端詳：大的那隻
    small:   [0.17, 0.30, 0, 0, 0, 0.02],       // 端詳：小的那隻
    calm:    [0.20, 0.26, 0, 0, 0, 0.02]        // 半開
  };
  function mixEye(a, b, k) {
    if (k <= 0) return a; if (k >= 1) return b;
    var o = [];
    for (var i = 0; i < 6; i++) o[i] = a[i] + (b[i] - a[i]) * k;
    return o;
  }

  // 眼形輪廓：圓角矩形（膠囊）沿周長等距取 48 點，再做彎曲與傾斜。
  // 任何兩種眼形都是同一組參數插值，所以切換是連續變形，不硬換。
  var NPTS = 48;
  function eyePath(e, side, scale, tilt) {
    var w = Math.max(e[0], 0.02) * scale, h = Math.max(e[1], 0.02) * scale;
    var hw = w / 2, hh = h / 2, r = Math.min(hw, hh), sx = hw - r, sy = hh - r;
    var q = PI * r / 2, per = 4 * sx + 4 * sy + 4 * q;
    var by = e[2] * scale, bx = e[3] * scale * side;
    var rot = -side * (e[4] + (tilt || 0)) * D2R, cr = Math.cos(rot), sr = Math.sin(rot);
    var dy = e[5] * scale, d = '';
    for (var i = 0; i < NPTS; i++) {
      var s = per * i / NPTS, x, y, a;
      if (s < sx) { x = s; y = -hh; }
      else if ((s -= sx) < q) { a = -PI / 2 + s / r; x = sx + r * Math.cos(a); y = -sy + r * Math.sin(a); }
      else if ((s -= q) < 2 * sy) { x = hw; y = -sy + s; }
      else if ((s -= 2 * sy) < q) { a = s / r; x = sx + r * Math.cos(a); y = sy + r * Math.sin(a); }
      else if ((s -= q) < 2 * sx) { x = sx - s; y = hh; }
      else if ((s -= 2 * sx) < q) { a = PI / 2 + s / r; x = -sx + r * Math.cos(a); y = sy + r * Math.sin(a); }
      else if ((s -= q) < 2 * sy) { x = -hw; y = sy - s; }
      else if ((s -= 2 * sy) < q) { a = PI + s / r; x = -sx + r * Math.cos(a); y = -sy + r * Math.sin(a); }
      else { s -= q; x = -sx + s; y = -hh; }
      var nx = x / hw, ny = y / hh;
      y += by * (nx * nx - 0.3333);
      x += bx * (ny * ny - 0.3333);
      var X = x * cr - y * sr, Y = x * sr + y * cr + dy;
      d += (i ? 'L' : 'M') + X.toFixed(4) + ' ' + Y.toFixed(4);
    }
    return d + 'Z';
  }

  /* ---------- 姿勢 ---------- */
  // yaw 左右轉、pitch 上下、roll 歪頭（度）；gx gy 視線；sq 垂直擠壓；ty 位移（半徑倍數，負的往上）；
  // sc 整體縮放；lid 眼皮（1 全閉）；glow 光暈；tok 入帳小點進度；lab 入帳數字進度；L R 兩眼眼形。
  // eL eR 兩耳（0 直立、正的往外塌、負的豎更高，有耳朵的才用得到）；spk 聲波條顯示量；spt 聲波時間。
  var BASE = { yaw: 22, pitch: 21, roll: 24 };
  function pose(o) {
    var p = { yaw: BASE.yaw, pitch: BASE.pitch, roll: BASE.roll, gx: 0, gy: 0, sq: 1, ty: 0, sc: 1,
      lid: 0, glow: 0, tok: 0, lab: 0, eL: 0, eR: 0, spk: 0, spt: 0, L: EYE.neutral, R: EYE.neutral };
    for (var k in o) p[k] = o[k];
    return p;
  }
  var NUM = ['yaw', 'pitch', 'roll', 'gx', 'gy', 'sq', 'ty', 'sc', 'lid', 'glow', 'eL', 'eR', 'spk'];
  function lerpPose(a, b, k) {
    var p = { tok: b.tok, lab: b.lab, spt: b.spt };
    for (var i = 0; i < NUM.length; i++) {
      var n = NUM[i], av = a[n];
      if (n === 'yaw') av = b.yaw + wrap180(av - b.yaw);   // 走最短的那一邊，轉圈後不會倒轉回來
      p[n] = av + (b[n] - av) * k;
    }
    p.L = mixEye(a.L, b.L, k); p.R = mixEye(a.R, b.R, k);
    return p;
  }

  /* ---------- 七個 mood ---------- */
  var W16 = 2 * PI / 16;
  var MOODS = {
    // 待機：16 秒大循環＝6 秒＋4 秒＋6 秒三小段（對應 Grok Bot Idle_A、Idle_B、Idle_D），
    // 所有週期都整除 16 秒，頭尾接得起來。呼吸 4 秒一輪。
    idle: {
      loop: 16, still: 0.3,
      fn: function (t) {
        var yaw = 14 + 19 * Math.sin(W16 * t) + 7 * Math.sin(3 * W16 * t + 1.3);
        var g = bump(9.0, 9.35, 10.1, 10.5, t);          // 第 9 秒往左下瞄一眼
        var b = Math.sin(2 * PI * t / 4);
        return pose({
          yaw: yaw,
          pitch: 20 + 8 * Math.sin(2 * W16 * t + 0.6) + 3 * Math.sin(5 * W16 * t),
          roll: 8 + 0.65 * yaw,
          gx: 0.25 * Math.sin(2 * W16 * t + 2.1) - 1.3 * g,
          gy: 0.2 * Math.sin(3 * W16 * t) - 0.9 * g,
          sq: 1 + 0.016 * b, ty: -0.006 * b,
          // 不等距眨眼；12.07 與 12.37 是連眨
          lid: blinks(t, [1.16, 4.0, 8.2, 10.59, 12.07, 12.37, 14.25]),
          // 耳朵：第 6 秒左耳連抖兩下，第 13 秒右耳抖一下
          eL: 0.55 * bump(6.30, 6.36, 6.40, 6.52, t) + 0.45 * bump(6.62, 6.68, 6.72, 6.84, t),
          eR: 0.5 * bump(13.2, 13.26, 13.3, 13.42, t)
        });
      }
    },

    // 記帳成功：一顆小點落進身體，吞一下，小跳，眼睛上彎。2.3 秒，播完回常駐 mood。
    logged: {
      dur: 2.3, still: 1.5,
      fn: function (t) {
        var up = ss(0, 0.2, t) - ss(0.36, 0.6, t);
        var hap = ss(0.36, 0.64, t) * (1 - ss(1.95, 2.25, t));
        var hop = (t > 0.62 && t < 1.12) ? Math.sin(PI * (t - 0.62) / 0.5) : 0;
        var e = mixEye(mixEye(EYE.neutral, EYE.wide, ss(0, 0.15, t) * (1 - ss(0.36, 0.6, t))), EYE.happy, hap);
        return pose({
          yaw: 22 - 14 * hap, pitch: 21 + 16 * up - 3 * hap, roll: 24 - 18 * hap,
          sq: 1 - 0.09 * bump(0.36, 0.46, 0.5, 0.62, t) + 0.03 * hop
            - 0.08 * bump(1.10, 1.17, 1.2, 1.4, t) + 0.02 * bump(1.4, 1.5, 1.55, 1.75, t),
          ty: -0.24 * hop,
          tok: clamp(t / 0.38, 0, 1),
          lab: clamp((t - 0.5) / 1.3, 0, 1),
          eL: -0.3 * up + 0.4 * hop - 0.15 * hap, eR: -0.3 * up + 0.4 * hop - 0.15 * hap,
          L: e, R: e
        });
      }
    },

    // 超支：眼睛斜下、身體縮一點、整體慢一拍（呼吸 7 秒、眨眼放慢），每輪嘆一口氣再抬頭看你一眼。
    over: {
      loop: 7, still: 0.5,
      fn: function (t) {
        var s = bump(4.2, 4.8, 5.4, 5.9, t);
        var look = bump(5.9, 6.2, 6.5, 6.9, t);
        return pose({
          yaw: 6 + 6 * Math.sin(2 * PI * t / 7), pitch: -8 + 2 * Math.sin(4 * PI * t / 7) + 16 * look,
          roll: 4, gy: -0.3 + 0.5 * look,
          sc: 0.94, sq: 0.975 + 0.012 * Math.sin(2 * PI * t / 7) - 0.035 * s, ty: 0.04 + 0.02 * s,
          lid: blinks(t, [2.8, 6.55], 1.4),
          eL: 0.6 - 0.25 * look, eR: 0.6 - 0.25 * look,      // 飛機耳，抬頭看你時豎回一點
          L: EYE.sad, R: EYE.sad
        });
      }
    },

    // 想睡（深夜）：眼睛下彎細弧、呼吸 8 秒一輪、頭慢慢垂下去，點一下頭驚醒，一隻眼半開又闔上。
    sleepy: {
      loop: 8, still: 1,
      fn: function (t) {
        var drop = ss(5.6, 6.5, t) * (1 - ss(6.5, 6.62, t));
        var peek = ss(6.6, 6.75, t) * (1 - ss(7.3, 7.8, t));
        return pose({
          yaw: 10, pitch: -10 - 4 * Math.sin(2 * PI * t / 8) - 12 * drop, roll: 14 + 6 * drop,
          sq: 1 + 0.03 * Math.sin(2 * PI * t / 8) + 0.02 * peek, ty: 0.03 + 0.03 * drop,
          eL: 0.34 + 0.16 * drop, eR: 0.34 + 0.16 * drop - 0.45 * peek,
          L: EYE.sleepy, R: mixEye(EYE.sleepy, EYE.calm, peek)
        });
      }
    },

    // 端詳：一大一小，歪頭看一邊，再透過一次眨眼（0.35 秒）換邊。4.8 秒一輪。
    thinking: {
      loop: 4.8, still: 1,
      fn: function (t) {
        var s = ss(2.0, 2.4, t) - ss(4.4, 4.8, t);
        return pose({
          yaw: 18 - 30 * s, pitch: 25 + 2 * Math.sin(2 * PI * t / 2.4), roll: 14 - 24 * s,
          gy: 0.5, sq: 1.01,
          lid: 0.85 * blinks(t, [2.03, 4.43], 1.35),
          eL: 0.08 + 0.42 * s, eR: 0.5 - 0.42 * s,
          L: mixEye(EYE.big, EYE.small, s), R: mixEye(EYE.small, EYE.big, s)
        });
      }
    },

    // 帳單將到期：眼睛睜大瞄向右上，身體拉高，每 3.2 秒連跳兩下帶光暈，接一次連眨。
    alert: {
      loop: 3.2, still: 0.9,
      fn: function (t) {
        var pu = bump(0, 0.12, 0.14, 0.34, t) + bump(0.38, 0.5, 0.52, 0.72, t);
        return pose({
          yaw: 23, pitch: 27, roll: 22, gx: 0.4, gy: 0.5,
          sq: 1.03 + 0.03 * pu, sc: 1 + 0.05 * pu, ty: -0.05 * pu,
          glow: ss(0, 0.12, t) * (0.25 + 0.75 * Math.exp(-2.4 * t)),
          lid: blinks(t, [1.9, 2.2]),
          eL: -0.3 - 0.3 * pu, eR: -0.3 - 0.3 * pu,
          L: EYE.wide, R: EYE.wide
        });
      }
    },

    // 說話：臉轉正對著你，身體跟著講話節奏輕點，聲波條在右下角跳（條的高度在 _draw 算）。4.8 秒一輪。
    speaking: {
      loop: 4.8, still: 0.62,
      fn: function (t) {
        var w = 2 * PI / 4.8;
        var beat = Math.abs(Math.sin(4.5 * w * t)) * (0.6 + 0.4 * Math.sin(2 * w * t + 0.8));
        var e = mixEye(EYE.neutral, EYE.wide, 0.18 * bump(2.6, 2.75, 3.1, 3.3, t));
        return pose({
          yaw: 7 + 7 * Math.sin(w * t), pitch: 20 + 3 * Math.sin(2 * w * t + 0.5) + 2 * beat,
          roll: 9 + 5 * Math.sin(w * t + 1.1),
          gx: 0.15 * Math.sin(2 * w * t), gy: 0.1,
          sq: 1 + 0.02 * beat, ty: -0.012 * beat,
          lid: blinks(t, [1.72, 3.94]),
          eL: 0.14 * bump(0.9, 0.96, 1.0, 1.14, t), eR: 0.12 * beat,
          spk: 1, spt: t,
          L: e, R: e
        });
      }
    },

    // 被點的三種反應
    poke_spin: {
      dur: 1.0, still: 0.5,
      fn: function (t) {
        var e = mixEye(EYE.neutral, EYE.happy, bump(0.05, 0.2, 0.8, 1.0, t));
        return pose({
          yaw: BASE.yaw + 360 * ease(clamp(t / 0.85, 0, 1)),
          sq: 1 - 0.05 * bump(0, 0.08, 0.12, 0.3, t), ty: -0.06 * Math.sin(PI * clamp(t / 0.85, 0, 1)),
          eL: 0.45 * bump(0.05, 0.25, 0.6, 0.9, t), eR: 0.45 * bump(0.05, 0.25, 0.6, 0.9, t),
          L: e, R: e
        });
      }
    },
    poke_bounce: {
      dur: 1.15, still: 0.3,
      fn: function (t) {
        var h1 = t < 0.45 ? Math.sin(PI * t / 0.45) : 0;
        var h2 = (t > 0.5 && t < 0.82) ? Math.sin(PI * (t - 0.5) / 0.32) : 0;
        var e = mixEye(mixEye(EYE.neutral, EYE.wide, bump(0, 0.1, 0.4, 0.55, t)), EYE.happy, bump(0.45, 0.6, 0.95, 1.15, t));
        return pose({
          yaw: 14, roll: 14,
          ty: -0.34 * h1 - 0.14 * h2,
          sq: 1 + 0.04 * h1 + 0.02 * h2 - 0.10 * bump(0.43, 0.47, 0.5, 0.58, t) - 0.05 * bump(0.80, 0.84, 0.87, 0.98, t),
          eL: 0.5 * bump(0.02, 0.2, 0.3, 0.5, t) + 0.3 * bump(0.5, 0.62, 0.7, 0.9, t),
          eR: 0.5 * bump(0.06, 0.24, 0.34, 0.54, t) + 0.3 * bump(0.54, 0.66, 0.74, 0.94, t),
          L: e, R: e
        });
      }
    },
    poke_nod: {
      dur: 1.0, still: 0.2,
      fn: function (t) {
        var n = t < 0.84 ? Math.pow(Math.sin(PI * t / 0.42), 2) : 0;
        var e = mixEye(EYE.neutral, EYE.happy, bump(0, 0.15, 0.8, 1.0, t));
        return pose({ yaw: 10, pitch: 21 - 30 * n, roll: 10, sq: 1 - 0.03 * n, ty: 0.02 * n, eL: 0.35 * n, eR: 0.35 * n, L: e, R: e });
      }
    }
  };
  var POKES = ['poke_spin', 'poke_bounce', 'poke_nod'];

  /* ---------- 共用的畫格迴圈（所有實例共用一個 requestAnimationFrame） ---------- */
  var live = [], rafId = 0;
  function tick(now) {
    rafId = 0;
    for (var i = 0; i < live.length; i++) live[i]._frame(now);
    if (live.length) rafId = root.requestAnimationFrame(tick);
  }
  function addLive(inst) {
    if (live.indexOf(inst) < 0) live.push(inst);
    if (!rafId && live.length) rafId = root.requestAnimationFrame(tick);
  }
  function removeLive(inst) {
    var i = live.indexOf(inst);
    if (i >= 0) live.splice(i, 1);
    if (!live.length && rafId) { root.cancelAnimationFrame(rafId); rafId = 0; }
  }

  /* ---------- 樣式與 DOM ---------- */
  var styled = false, uid = 0;
  function injectStyle(doc) {
    if (styled) return; styled = true;
    var s = doc.createElement('style');
    s.setAttribute('data-bot-face', '');
    s.textContent =
      '.bot-face{display:inline-block;position:relative;line-height:0;vertical-align:middle;' +
      '-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}' +
      '.bot-face{--bf-b:var(--bot-body,var(--tata-body,#FF6700));--bf-a:var(--bot-accent,var(--bf-b));' +
      '--bf-e:var(--bot-eye,var(--tata-eye,transparent));--bf-ei:var(--bot-ear,var(--bf-a));--bf-hl:1}' +
      '.bot-face[data-tone=ink]{--bf-b:var(--bot-ink,#0B0A10);--bf-a:var(--bf-b);--bf-e:transparent;' +
      '--bf-ei:var(--bot-ink-in,var(--bf-b));--bf-hl:0}' +
      '.bot-face>svg{display:block;width:100%;height:100%;overflow:visible;stroke:none}' +
      '.bot-face>svg *{transition:fill .28s ease,stroke .28s ease,stop-color .28s ease}' +
      '.bot-face .bf-hl{opacity:var(--bf-hl);transition:opacity .28s ease}' +
      '.bot-face[data-outline][data-tone=color]>svg{filter:drop-shadow(0 0 .45px var(--bot-line,rgba(20,17,30,.7))) drop-shadow(0 0 .45px var(--bot-line,rgba(20,17,30,.45)))}' +
      '@media (prefers-reduced-motion:reduce){.bot-face>svg *,.bot-face .bf-hl{transition:none}}' +
      '.bot-face text{font:700 11px/1 var(--font-num,ui-rounded,system-ui,sans-serif);' +
      'font-variant-numeric:tabular-nums;fill:currentColor}';
    doc.head.appendChild(s);
  }
  function el(doc, name, attrs, parent) {
    var n = doc.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function stop(doc, parent, off, color, op) {
    var s = el(doc, 'stop', { offset: off }, parent);
    s.setAttribute('style', 'stop-color:' + color + ';stop-opacity:' + op);
  }

  // 顏色都走 .bot-face 上的內部變數（見 injectStyle），反黑只要換這幾個變數
  var BODY = 'var(--bf-b)';
  var ACCENT = 'var(--bf-a)';   // 點綴色：沒設就等於身體色
  var EARIN = 'var(--bf-ei)';   // 耳內色：沒設就等於點綴色
  var NSIDE = 8;              // 厚板側面用幾層疊出來
  // 黑豹耳：位置（頭上的經緯度）、半寬、高、根部埋進球裡的比例。單位是球半徑。
  var EAR = { lon: 41, lat: 49, w: 0.33, h: 0.58, root: 0.84, lean: 52, minW: 0.62 };
  // 鏡片：半寬、半高、圓角（貼在眼睛所在的切面上）
  var LENS = { hw: 0.262, hh: 0.31, r: 0.15, by: -0.1 };
  var NBAR = 4, BAR_N = [9, 13, 7, 11], BAR_P = [0.3, 1.9, 4.1, 2.7];   // 聲波條：每輪跳幾下、起始相位
  function earPath(w, h, y0) {
    return 'M' + (-w) + ' ' + y0 + 'Q' + (-w * 0.94) + ' ' + (y0 + h * 0.74) + ' ' + (-w * 0.17) + ' ' + (y0 + h * 0.96) +
      'Q0 ' + (y0 + h * 1.03) + ' ' + (w * 0.17) + ' ' + (y0 + h * 0.96) + 'Q' + (w * 0.94) + ' ' + (y0 + h * 0.74) + ' ' + w + ' ' + y0;
  }

  function build(inst, doc) {
    var id = 'botf' + (++uid);
    var body = BODY, shp = SHAPES[inst.shape];
    var svg = el(doc, 'svg', { viewBox: '-50 -50 100 100', 'aria-hidden': 'true', focusable: 'false' });
    var defs = el(doc, 'defs', {}, svg);

    var gh = el(doc, 'radialGradient', { id: id + 'h' }, defs);
    stop(doc, gh, '0.45', ACCENT, 0.5); stop(doc, gh, '1', ACCENT, 0);

    // 眼睛是挖空：用遮罩在身體上挖兩個洞
    var mask = el(doc, 'mask', { id: id + 'm', maskUnits: 'userSpaceOnUse', x: -70, y: -70, width: 140, height: 140 }, defs);
    el(doc, 'rect', { x: -70, y: -70, width: 140, height: 140, fill: '#fff' }, mask);
    inst.mL = el(doc, 'path', { fill: '#000' }, mask);
    inst.mR = el(doc, 'path', { fill: '#000' }, mask);

    if (inst.opts.shadow) {
      inst.shadow = el(doc, 'ellipse', { cx: 0, cy: R + 3.5, rx: R * 0.62, ry: 2.6, fill: '#000', opacity: 0.16 }, svg);
    }
    inst.halo = el(doc, 'circle', { r: R * 1.5, fill: 'url(#' + id + 'h)', opacity: 0 }, svg);

    inst.body = el(doc, 'g', {}, svg);
    // 耳朵畫兩層：一層在身體後面（永遠畫），一層在身體前面（耳根轉到正面時才淡入）
    var mkEars = function () {
      var out = [];
      for (var i = 0; i < 2; i++) {
        var g = el(doc, 'g', {}, inst.body);
        var a = el(doc, 'path', { d: earPath(EAR.w, EAR.h, 0) + 'Z' }, g);
        a.setAttribute('style', 'fill:' + body);
        // 耳內：舊版大器（點綴色模式）是淡淡一層；一般模式是實色（紫身體配黑耳內）
        var b = el(doc, 'path', { d: earPath(EAR.w * (inst.accentMode ? 0.52 : 0.42), EAR.h * (inst.accentMode ? 0.6 : 0.5), EAR.h * (inst.accentMode ? 0.16 : 0.2)) + 'Z', opacity: inst.accentMode ? 0.34 : 0.92 }, g);
        b.setAttribute('style', 'fill:' + EARIN);
        // 輪廓線只有點綴色模式要（黑身體在深底上靠它看出耳朵）；一般模式跟其他三隻一樣不描邊
        var c = el(doc, 'path', { d: earPath(EAR.w, EAR.h, 0), fill: 'none', 'stroke-opacity': inst.accentMode ? 0.62 : 0,
          'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, g);
        c.setAttribute('style', 'stroke:' + ACCENT);
        inst.lines.push(c);
        out.push(g);
      }
      return out;
    };
    inst.lines = [];
    if (inst.ears && shp.kind === 'sphere') inst.earB = mkEars();
    // --bot-eye 有設就填色（從洞裡透出來），沒設就是挖空
    var fillG = el(doc, 'g', {}, inst.body);
    fillG.setAttribute('style', 'fill:var(--bf-e)');
    inst.fL = el(doc, 'path', {}, fillG);
    inst.fR = el(doc, 'path', {}, fillG);
    var solid = el(doc, 'g', { mask: 'url(#' + id + 'm)' }, inst.body);

    if (shp.kind === 'sphere') {
      var gl = el(doc, 'radialGradient', { id: id + 'l', cx: '0.34', cy: '0.26', r: '0.62' }, defs);
      stop(doc, gl, '0', '#fff', 0.42); stop(doc, gl, '1', '#fff', 0);
      var gs = el(doc, 'radialGradient', { id: id + 's', cx: '0.42', cy: '0.36', r: '0.72' }, defs);
      stop(doc, gs, '0.55', '#000', 0); stop(doc, gs, '1', '#000', 0.26);
      var gp = el(doc, 'radialGradient', { id: id + 'p' }, defs);
      stop(doc, gp, '0', '#fff', 0.6); stop(doc, gp, '1', '#fff', 0);
      var base = el(doc, 'circle', { r: R }, solid);
      base.setAttribute('style', 'fill:' + body);
      el(doc, 'circle', { r: R, fill: 'url(#' + id + 's)' }, solid);
      if (inst.accentMode) {
        // 深色身體：白高光會發灰，改用點綴色的高光，再加一圈輪廓光，深底上才看得出球的邊
        var ga = el(doc, 'radialGradient', { id: id + 'a', cx: '0.32', cy: '0.24', r: '0.66' }, defs);
        stop(doc, ga, '0', ACCENT, 0.4); stop(doc, ga, '0.5', ACCENT, 0.07); stop(doc, ga, '1', ACCENT, 0);
        var gr = el(doc, 'radialGradient', { id: id + 'r' }, defs);
        stop(doc, gr, '0.8', ACCENT, 0); stop(doc, gr, '0.94', ACCENT, 0.3); stop(doc, gr, '1', ACCENT, 0.74);
        el(doc, 'circle', { r: R, fill: 'url(#' + id + 'a)', 'class': 'bf-hl' }, solid);
        el(doc, 'circle', { r: R, fill: 'url(#' + id + 'r)', 'class': 'bf-hl' }, solid);
      } else {
        el(doc, 'circle', { r: R, fill: 'url(#' + id + 'l)', 'class': 'bf-hl' }, solid);
      }
      el(doc, 'ellipse', { 'class': 'bf-hl', cx: -R * 0.40, cy: -R * 0.52, rx: R * 0.17, ry: R * 0.10,
        transform: 'rotate(-38 ' + (-R * 0.40) + ' ' + (-R * 0.52) + ')', fill: 'url(#' + id + 'p)' }, solid);
    } else if (shp.kind === 'pill') {
      // 膠囊：任何角度的正投影輪廓都是「兩個等大圓＋外切線」，每格只重算長度與方向
      var pg = el(doc, 'linearGradient', { id: id + 'g', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
      stop(doc, pg, '0', '#fff', 0.36); stop(doc, pg, '0.4', '#fff', 0.05); stop(doc, pg, '0.62', '#000', 0);
      stop(doc, pg, '1', '#000', 0.26);
      var pgl = el(doc, 'radialGradient', { id: id + 'p' }, defs);
      stop(doc, pgl, '0', '#fff', 0.55); stop(doc, pgl, '1', '#fff', 0);
      var pb = el(doc, 'path', {}, solid); pb.setAttribute('style', 'fill:' + body);
      inst.pillEls = [pb, el(doc, 'path', { fill: 'url(#' + id + 'g)', 'class': 'bf-hl' }, solid)];
      inst.pillHi = el(doc, 'ellipse', { fill: 'url(#' + id + 'p)', 'class': 'bf-hl' }, solid);
      inst.PA = shp.half * shp.radius * R;               // 圓柱半徑
      inst.PO = shp.half * (1 - shp.radius) * R;         // 圓柱段半長
    } else if (shp.kind === 'cloud') {
      // 雲：五顆球。身體色用一組圓；光影是一塊矩形，用同一組圓當裁切（球重疊處才不會疊深）
      var ck = shp.half * R / 1.033;                     // 1.033＝最外側球邊到中心（以 L 為 1）
      inst.CB = shp.balls.map(function (b) { return [b[0] / 114.2705 * ck * 1.0, -b[1] / 114.2705 * ck, b[2] / 114.2705 * ck]; });
      var clip = el(doc, 'clipPath', { id: id + 'c' }, defs);
      var cg = el(doc, 'g', {}, solid); cg.setAttribute('style', 'fill:' + body);
      inst.cBody = []; inst.cClip = [];
      for (var ci = 0; ci < inst.CB.length; ci++) { inst.cBody.push(el(doc, 'circle', {}, cg)); inst.cClip.push(el(doc, 'circle', {}, clip)); }
      var cl = el(doc, 'radialGradient', { id: id + 'l', gradientUnits: 'userSpaceOnUse', cx: -R * 0.3, cy: -R * 0.42, r: R * 1.25 }, defs);
      stop(doc, cl, '0', '#fff', 0.4); stop(doc, cl, '0.42', '#fff', 0.06); stop(doc, cl, '0.7', '#000', 0); stop(doc, cl, '1', '#000', 0.24);
      el(doc, 'rect', { x: -60, y: -60, width: 120, height: 120, fill: 'url(#' + id + 'l)', 'clip-path': 'url(#' + id + 'c)', 'class': 'bf-hl' }, solid);
      // 不另畫球與球之間的凹線：每顆球描暗邊會在別顆球上留下一圈圈泡泡紋（試過，1122-F 拿掉），輪廓的凹凸已經看得出雲
      var cp2 = el(doc, 'radialGradient', { id: id + 'p' }, defs);
      stop(doc, cp2, '0', '#fff', 0.6); stop(doc, cp2, '1', '#fff', 0);
      inst.cHi = el(doc, 'ellipse', { fill: 'url(#' + id + 'p)', 'class': 'bf-hl' }, solid);
    } else {
      // 厚板：同一個輪廓沿深度疊 NSIDE 層當側面，最上面一層是正面
      var S = shp.half * R;
      el(doc, 'path', { id: id + 'f', d: shp.path(S, shp.corner) }, defs);
      var fg = el(doc, 'linearGradient', { id: id + 'g', x1: '0.1', y1: '0', x2: '0.9', y2: '1' }, defs);
      stop(doc, fg, '0', '#fff', 0.34); stop(doc, fg, '0.45', '#fff', 0.04); stop(doc, fg, '1', '#000', 0.16);
      var href = '#' + id + 'f';
      var mk = function (parent, attrs) {
        var u = el(doc, 'use', attrs || {}, parent);
        u.setAttribute('href', href);
        return u;
      };
      var sideG = el(doc, 'g', {}, solid); sideG.setAttribute('style', 'fill:' + body);
      var shadeG = el(doc, 'g', { opacity: 0.34, fill: '#000' }, solid);
      inst.sides = [];
      for (var i = 0; i < NSIDE; i++) inst.sides.push([mk(sideG), mk(shadeG)]);
      var frontG = el(doc, 'g', {}, solid);
      var f0 = mk(frontG); f0.setAttribute('style', 'fill:' + body);
      var f1 = mk(frontG, { fill: 'url(#' + id + 'g)', 'class': 'bf-hl' });
      var f2 = mk(frontG, { fill: 'none', stroke: '#fff', 'stroke-opacity': 0.28, 'stroke-width': 1.4, 'class': 'bf-hl' });
      inst.front = [f0, f1, f2];
      inst.S = S; inst.D = shp.depth * S / 0.94;
    }

    if (inst.earB) inst.earF = mkEars();
    if (inst.glasses && shp.kind === 'sphere') {
      var gg = el(doc, 'g', { fill: 'none', 'stroke-linecap': 'round' }, inst.body);
      gg.setAttribute('style', 'stroke:' + ACCENT);
      var lensD = roundRect(LENS.hw, LENS.hh, LENS.r);
      inst.lens = [];
      for (var li = 0; li < 2; li++) {
        var lf = el(doc, 'path', { d: lensD, stroke: 'none', 'fill-opacity': 0.1, 'class': 'bf-hl' }, gg);
        lf.setAttribute('style', 'fill:#fff');
        var lo = el(doc, 'path', { d: lensD, 'vector-effect': 'non-scaling-stroke' }, gg);
        inst.lens.push([lf, lo]); inst.lines.push(lo);
      }
      inst.bridge = el(doc, 'path', { 'vector-effect': 'non-scaling-stroke' }, gg);
      inst.lines.push(inst.bridge);
    }

    // 聲波條（speaking 才出現），放在右下角球沒佔到的地方
    inst.bars = [];
    var bg = inst.barG = el(doc, 'g', { opacity: 0 }, svg);
    for (var bi = 0; bi < NBAR; bi++) {
      var br = el(doc, 'rect', { x: 24.6 + bi * 5.3, width: 3.5, rx: 1.75, 'stroke-width': 0.5 }, bg);
      br.setAttribute('style', 'fill:' + ACCENT + ';stroke:' + body);
      inst.bars.push(br);
    }

    inst.tok = el(doc, 'circle', { r: R * 0.13, opacity: 0 }, svg);
    inst.tok.setAttribute('style', 'fill:' + ACCENT);
    inst.lab = el(doc, 'text', { 'text-anchor': 'middle', opacity: 0 }, svg);
    return svg;
  }

  /* ---------- 逐流光環（ring:'zhuliu'）----------
     臉縮成 0.74 倍，外面一圈斜躺的橢圓環，四色各一段順著環流動。
     流動＝CSS stroke-dashoffset 關鍵影格：offset(t) = -P·(t/6.0 + 0.45/2π·sin(2πt/6.0))，速度有快慢但不停不倒退，6.0 秒首尾完全接上。
     後半圈畫在臉後面，前半圈畫在臉前面；前半圈壓一道深紫邊，只裁在臉的圓裡，透明底上不會有淡色邊。 */
  var RING = { fit: 0.74, rx: 46, ry: 12.5, cy: 9, tilt: -12, P: 199.188, T: 6.0,
    colors: ['#a37aff', '#4d86ff', '#ff6700', '#00b351'] };
  var ringStyled = false;
  function ringStyle(doc) {
    if (ringStyled) return; ringStyled = true;
    var P = RING.P, q = P / 4, css = '', N = 60;
    var arr = function (w, gv) { var d = q - (w + gv); return d.toFixed(3) + ' ' + (P - d).toFixed(3); };
    for (var i = 0; i < 4; i++) {
      css += '@keyframes bfRing' + i + '{';
      for (var j = 0; j <= N; j++) {
        var off = -P * (j / N + 0.45 / (2 * PI) * Math.sin(2 * PI * j / N)) - i * q;
        css += (100 * j / N).toFixed(3) + '%{stroke-dashoffset:' + off.toFixed(3) + '}';
      }
      css += '}.bf-rg' + i + '{stroke-dashoffset:' + (-i * q).toFixed(3) + ';animation:bfRing' + i + ' ' + RING.T + 's linear infinite}';
    }
    css += '.bf-rg{fill:none;stroke-linecap:round}' +
      '.bf-rb .bf-rg{stroke-width:5.2;stroke-dasharray:' + arr(5.2, 5.8) + ';opacity:.92}' +
      '.bf-rf .bf-rg{stroke-width:6.4;stroke-dasharray:' + arr(6.4, 4.6) + '}' +
      '.bf-re{stroke:#5b3bc4;stroke-width:9.2;stroke-dasharray:' + arr(9.2, 1.8) + '}' +
      '.bf-rw{transform-box:view-box;transform-origin:0 0}.bf-ring-s .bf-rw{transform:scale(.9)}' +
      '.bf-ring-s .bf-rb .bf-rg{stroke-width:8;stroke-dasharray:' + arr(8, 7.5) + '}' +
      '.bf-ring-s .bf-rf .bf-rg{stroke-width:9;stroke-dasharray:' + arr(9, 6.5) + '}' +
      '.bf-ring-s .bf-re{stroke-width:11.5;stroke-dasharray:' + arr(11.5, 4) + '}' +
      '.bot-face[data-ring-still] .bf-rg{animation-play-state:paused}' +
      '.bot-face[data-tone=ink] .bf-rg{stroke:var(--bf-b)}.bot-face[data-tone=ink] .bf-re{display:none}';
    var s = doc.createElement('style'); s.setAttribute('data-bot-face-ring', ''); s.textContent = css;
    (doc.head || doc.documentElement).appendChild(s);
  }
  function addRing(inst, doc) {
    ringStyle(doc);
    var svg = inst.svg, k = 1 / RING.fit, defs = svg.querySelector('defs');
    var id = (svg.querySelector('mask') || { id: 'botfx' }).id + 'r';
    // 整張圖放大視窗，臉自然縮成 fit 倍；光環用原本 100 單位的座標畫，再放大 1/fit 倍
    svg.setAttribute('viewBox', (-50 * k).toFixed(3) + ' ' + (-50 * k).toFixed(3) + ' ' + (100 * k).toFixed(3) + ' ' + (100 * k).toFixed(3));
    var fh = el(doc, 'clipPath', { id: id + 'f' }, defs); el(doc, 'path', { d: 'M-60 0H60V40H-60Z' }, fh);
    // 以下座標都是「整格 100 單位」：臉在裡面佔 fit 倍
    var hd = el(doc, 'clipPath', { id: id + 'h' }, defs);
    el(doc, 'circle', { cx: 0, cy: (R * (1 - inst.fit) * RING.fit).toFixed(3), r: (R * inst.fit * RING.fit + 0.6).toFixed(3) }, hd);
    var d = 'M0 ' + (-RING.ry) + 'A' + RING.rx + ' ' + RING.ry + ' 0 1 1 0 ' + RING.ry + 'A' + RING.rx + ' ' + RING.ry + ' 0 1 1 0 ' + (-RING.ry) + 'Z';
    var sc = 'scale(' + k.toFixed(4) + ')', tf = 'translate(0 ' + RING.cy + ') rotate(' + RING.tilt + ')';
    var lanes = function (g, cls, stroke) {
      for (var i = 0; i < 4; i++) {
        var p = el(doc, 'path', { d: d, 'class': 'bf-rg bf-rg' + i + (cls ? ' ' + cls : '') }, g);
        if (stroke) p.setAttribute('stroke', RING.colors[i]);
      }
    };
    var back = el(doc, 'g', { transform: sc }, null);
    lanes(el(doc, 'g', { transform: tf, 'class': 'bf-rb' }, el(doc, 'g', { 'class': 'bf-rw' }, back)), '', true);
    svg.insertBefore(back, inst.body);
    var front = el(doc, 'g', { transform: sc }, null);
    // 深紫分隔邊：先裁到臉的圓，再裁到環的前半圈
    var e1 = el(doc, 'g', { 'clip-path': 'url(#' + id + 'h)' }, front);
    lanes(el(doc, 'g', { 'clip-path': 'url(#' + id + 'f)' }, el(doc, 'g', { transform: tf }, el(doc, 'g', { 'class': 'bf-rw' }, e1))), 'bf-re', false);
    lanes(el(doc, 'g', { 'clip-path': 'url(#' + id + 'f)' }, el(doc, 'g', { transform: tf, 'class': 'bf-rf' }, el(doc, 'g', { 'class': 'bf-rw' }, front))), '', true);
    svg.insertBefore(front, inst.body.nextSibling);
    return { back: back, front: front };
  }

  /* ---------- 實例 ---------- */
  function Face(host, opts) {
    var doc = host.ownerDocument;
    opts = opts || {};
    var pre = PRESETS[opts.preset] || {};
    this.host = host; this.opts = opts; this.doc = doc;
    this.shape = resolveShape(opts.shape || pre.shape);
    this.slab = SHAPES[this.shape].kind === 'slab';
    this.pill = SHAPES[this.shape].kind === 'pill';
    this.cloud = SHAPES[this.shape].kind === 'cloud';
    this.label = opts.label || pre.label || 'Bot';
    var pick = function (k, d) { return opts[k] !== undefined ? opts[k] : (pre[k] !== undefined ? pre[k] : d); };
    this.ears = pick('ears', ''); this.glasses = !!pick('glasses', false);
    this.fit = +pick('fit', 1) || 1; this.eyeTilt = +pick('eyeTilt', 0) || 0; this.sep = +pick('sep', SEP) || SEP;
    // colorTarget 'accent'：本體色固定，setColor 換的是點綴色
    this.accentMode = pick('colorTarget', 'body') === 'accent';
    this.bodyColor = resolveColor(pre.color); this.accent0 = resolveColor(pick('accent', ''));
    this.eyeColor = resolveColor(pick('eye', ''));
    this.earIn = resolveColor(pick('earIn', ''));
    this.names = {};
    for (var nk in MOOD_NAME) this.names[nk] = MOOD_NAME[nk];
    var nm = opts.names || pre.names || {};
    for (nk in nm) this.names[nk] = nm[nk];
    this.base = 'idle'; this.mood = 'idle'; this.key = 'idle';
    this.t0 = 0; this.from = null; this.cur = null; this.lastPoke = '';
    this.dL = null; this.dR = null; this.gaze = { x: 0, y: 0, tx: 0, ty: 0 };
    this.timer = 0; this.dead = false; this.visible = true; this.labelText = '';
    injectStyle(doc);
    this.wrap = doc.createElement('span');
    this.wrap.className = 'bot-face tata-face';
    this.wrap.setAttribute('role', 'img');
    this.wrap.setAttribute('data-shape', this.shape);
    if (this.eyeColor) this.wrap.style.setProperty('--bot-eye', this.eyeColor);
    if (this.earIn) this.wrap.style.setProperty('--bot-ear', this.earIn);
    if (pick('outline', false)) this.wrap.setAttribute('data-outline', '');
    this.setTone(opts.tone || (opts.invert ? 'ink' : 'color'));
    if (this.accentMode) {
      this.wrap.style.setProperty('--bot-body', this.bodyColor);
      this.setColor(opts.color || this.accent0);
    } else {
      if (this.accent0) this.wrap.style.setProperty('--bot-accent', this.accent0);
      this.setColor(opts.color || pre.color);
    }
    this.svg = build(this, doc);
    this.ring = pick('ring', '') ? addRing(this, doc) : null;
    this.wrap.appendChild(this.svg);
    host.appendChild(this.wrap);
    this.setSize(this.opts.size);

    var self = this;
    // 減少動態：參數優先，沒給就跟系統設定
    this.mq = (this.opts.reduceMotion === undefined && root.matchMedia)
      ? root.matchMedia('(prefers-reduced-motion: reduce)') : null;
    this.reduced = this.opts.reduceMotion === undefined ? !!(this.mq && this.mq.matches) : !!this.opts.reduceMotion;
    if (this.mq) {
      this.onMq = function (e) { self.reduced = e.matches; self._sync(); };
      if (this.mq.addEventListener) this.mq.addEventListener('change', this.onMq);
      else if (this.mq.addListener) this.mq.addListener(this.onMq);
    }
    // 捲出畫面就停，省電
    if (root.IntersectionObserver) {
      this.io = new root.IntersectionObserver(function (es) {
        self.visible = es[es.length - 1].isIntersecting; self._sync();
      });
      this.io.observe(this.wrap);
    }
    if (this.opts.followPointer) {
      this.onMove = function (e) {
        var r = self.wrap.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        var d = Math.sqrt(dx * dx + dy * dy) || 1, k = Math.min(1, d / 260);
        self.gaze.tx = dx / d * k; self.gaze.ty = -dy / d * k;
      };
      root.addEventListener('pointermove', this.onMove, { passive: true });
    }
    this._enter(MOOD_LIST.indexOf(this.opts.mood) >= 0 ? this.opts.mood : 'idle', null, true);
  }

  // 換身體色：吃 hex 或 App 色名；給空值就退回 CSS 變數
  // accentMode（大器）：本體不變，換的是點綴色；給空值回到預設點綴色
  Face.prototype.setColor = function (c) {
    c = resolveColor(c);
    if (this.accentMode) {
      c = c || this.accent0;
      if (c) this.wrap.style.setProperty('--bot-accent', c); else this.wrap.style.removeProperty('--bot-accent');
    } else if (c) this.wrap.style.setProperty('--bot-body', c); else this.wrap.style.removeProperty('--bot-body');
    this.color = c;
  };

  // 反黑：'ink' 整隻變黑剪影（放在整塊房間色上），'color' 顯示自己的顏色。顏色切換由 CSS 過渡
  Face.prototype.setTone = function (t) {
    this.tone = t === 'ink' ? 'ink' : 'color';
    this.wrap.setAttribute('data-tone', this.tone);
  };

  Face.prototype.setSize = function (size) {
    this.size = +size || 0;
    if (this.size) { this.wrap.style.width = this.size + 'px'; this.wrap.style.height = this.size + 'px'; }
    else { this.wrap.style.width = '100%'; this.wrap.style.height = '100%'; }
    // 小尺寸把眼睛放大一點，32px 也看得清楚
    var px = this.size || this.wrap.getBoundingClientRect().width || 64;
    var eff = px * this.fit * (this.ring ? RING.fit : 1);   // 有耳朵、有光環的身體比較小，眼睛照實際大小補
    if (this.ring) this.svg.setAttribute('class', px <= 48 ? 'bf-ring-s' : '');
    this.eyeScale = eff < 40 ? 1.3 : eff < 56 ? 1.15 : 1;
    this.small = px < 64;
    // 眼鏡與耳朵的線：固定螢幕粗細（不跟著投影變形）
    var lw = clamp(px * 0.0125, 0.8, 1.8).toFixed(2);
    for (var i = 0; this.lines && i < this.lines.length; i++) this.lines[i].setAttribute('stroke-width', lw);
    this.dL = this.dR = null;
    if (this.cur) this._draw(this.cur);
  };

  Face.prototype._now = function () { return root.performance ? root.performance.now() : Date.now(); };

  // 進入某個 mood。instant 為真時不做過渡。
  Face.prototype._enter = function (mood, o, instant) {
    if (this.dead) return;
    var key = mood;
    if (mood === 'poke') {
      var pool = POKES.filter(function (k) { return k !== this.lastPoke; }, this);
      key = pool[Math.floor(Math.random() * pool.length)];
      this.lastPoke = key;
    }
    var def = MOODS[key];
    if (!def.dur) this.base = mood;            // 常駐 mood 才記成回去的地方
    this.mood = mood; this.key = key;
    this.labelText = (o && o.label != null) ? String(o.label) : '';
    this.lab.textContent = this.labelText;
    this.wrap.setAttribute('aria-label', this.label + '：' + this.names[mood]);
    this.wrap.setAttribute('data-mood', mood);
    this.wrap.setAttribute('data-variant', key);
    var now = this._now();
    this.from = (!instant && this.cur && !this.reduced) ? this.cur : null;
    this.b0 = now; this.bd = def.dur ? 160 : 300;   // 眼形與姿勢過渡：一次性動作 0.16 秒起手，其餘 0.30 秒
    this.t0 = now;
    if (this.timer) { root.clearTimeout(this.timer); this.timer = 0; }
    this._sync();
  };

  // 依「減少動態、是否在畫面內」決定跑迴圈或畫一張靜止圖
  Face.prototype._sync = function () {
    if (this.dead) return;
    if (this.ring) { if (this.reduced || !this.visible) this.wrap.setAttribute('data-ring-still', ''); else this.wrap.removeAttribute('data-ring-still'); }
    var def = MOODS[this.key];
    if (this.reduced) {
      removeLive(this);
      this.from = null;
      var p = def.fn(def.still);
      p.lid = 0; p.tok = 0; p.ty = 0; p.sq = 1; p.sc = p.sc < 1 ? p.sc : 1; p.glow = p.glow ? 0.5 : 0;
      p.lab = (this.labelText && def.dur) ? 0.3 : 0;
      this.cur = p; this._draw(p);
      // 一次性動作在減少動態時只換眼形，停一下就換回去
      if (def.dur && !this.timer) {
        var self = this;
        this.timer = root.setTimeout(function () { self.timer = 0; self._enter(self.base, null, true); }, def.dur * 1000);
      }
      return;
    }
    if (this.timer) { root.clearTimeout(this.timer); this.timer = 0; }
    if (this.visible) addLive(this); else removeLive(this);
    if (!this.cur) { this.cur = def.fn(0); this._draw(this.cur); }
  };

  Face.prototype._frame = function (now) {
    var def = MOODS[this.key], t = (now - this.t0) / 1000;
    if (def.dur && t >= def.dur) { this._enter(this.base); def = MOODS[this.key]; t = 0; }
    var p = def.fn(def.loop ? t % def.loop : t);
    // calm＜1：把姿勢偏移量打折（24 到 32px 不晃眼），被戳轉圈例外
    var cm = this.opts.calm;
    if (cm != null && cm < 1 && this.key !== 'poke_spin') {
      p.yaw = BASE.yaw + (p.yaw - BASE.yaw) * cm; p.pitch = BASE.pitch + (p.pitch - BASE.pitch) * cm;
      p.roll = BASE.roll + (p.roll - BASE.roll) * cm; p.gx *= cm; p.gy *= cm; p.ty *= cm;
      p.sq = 1 + (p.sq - 1) * cm; p.sc = 1 + (p.sc - 1) * cm;
    }
    var g = this.gaze;
    if (this.opts.followPointer) {
      g.x += (g.tx - g.x) * 0.12; g.y += (g.ty - g.y) * 0.12;
      p.gx += g.x * 1.6; p.gy += g.y * 1.4;
    }
    if (this.from) {
      var k = (now - this.b0) / this.bd;
      if (k >= 1) this.from = null; else p = lerpPose(this.from, p, ease(k));
    }
    this.cur = p; this._draw(p);
  };

  Face.prototype._draw = function (p) {
    var f = function (n) { return n.toFixed(3); };
    // 身體：以球底為支點擠壓，垂直壓扁時水平變寬
    var fit = this.fit, cyo = R * (1 - fit);
    var sY = fit * p.sc * p.sq, sX = fit * p.sc * (2 - p.sq);
    this.body.setAttribute('transform',
      'translate(0 ' + f(p.ty * R + R) + ') scale(' + f(sX) + ' ' + f(sY) + ') translate(0 ' + (-R) + ')');

    if (this.slab) this._drawSlab(p, f); else if (this.pill) this._drawPill(p, f); else if (this.cloud) this._drawCloud(p, f); else {
    // 眼睛貼在球面上：歪頭、上下、左右三個旋轉後做正投影，靠邊時自然變窄、轉到背面就看不到
    var yaw = (p.yaw + p.gx * 12) * D2R, pit = (p.pitch + p.gy * 10) * D2R, rol = p.roll * D2R;
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pit), sp = Math.sin(pit), cr = Math.cos(rol), sr = Math.sin(rol);
    var lid = 1 - 0.93 * clamp(p.lid, 0, 1);
    var gl = [], gvis = 1, ls = Math.min(this.eyeScale, 1.1);
    for (var s = -1; s <= 1; s += 2) {
      var lam = s * this.sep * D2R, cl = Math.cos(lam), sl = Math.sin(lam);
      // 位置 P、往東 E、往北 N 三個向量，依序做歪頭、上下、左右
      var v = [[sl, 0, cl], [cl, 0, -sl], [0, 1, 0]], o = [];
      for (var i = 0; i < 3; i++) {
        var x = v[i][0], y = v[i][1], z = v[i][2];
        var x1 = x * cr - y * sr, y1 = x * sr + y * cr;
        var y2 = y1 * cp + z * sp, z2 = -y1 * sp + z * cp;
        o[i] = [x1 * cy + z2 * sy, y2, -x1 * sy + z2 * cy];
      }
      var P = o[0], E = o[1], N = o[2];
      var vis = ss(0.08, 0.32, P[2]);
      var m = 'matrix(' + f(R * E[0]) + ' ' + f(-R * E[1]) + ' ' + f(-R * N[0] * lid) + ' ' + f(R * N[1] * lid) +
        ' ' + f(R * P[0]) + ' ' + f(-R * P[1]) + ')';
      var eye = s < 0 ? p.L : p.R;
      var mp = s < 0 ? this.mL : this.mR, fp = s < 0 ? this.fL : this.fR;
      // 眼形沒在變形時是同一個常數陣列，直接跳過路徑重算
      if (eye !== (s < 0 ? this.dL : this.dR)) {
        var d = eyePath(eye, s, this.eyeScale, this.eyeTilt);
        mp.setAttribute('d', d); fp.setAttribute('d', d);
        if (s < 0) this.dL = eye; else this.dR = eye;
      }
      mp.setAttribute('transform', m); fp.setAttribute('transform', m);
      mp.setAttribute('opacity', f(vis)); fp.setAttribute('opacity', f(vis));
      if (this.lens) {
        // 鏡片：同一個切面，但不跟著眼皮壓扁
        var lz = this.lens[s < 0 ? 0 : 1], K = R * ls;
        var lm = 'matrix(' + f(K * E[0]) + ' ' + f(-K * E[1]) + ' ' + f(-K * N[0]) + ' ' + f(K * N[1]) +
          ' ' + f(R * P[0]) + ' ' + f(-R * P[1]) + ')';
        lz[0].setAttribute('transform', lm); lz[1].setAttribute('transform', lm);
        lz[0].setAttribute('opacity', f(vis)); lz[1].setAttribute('opacity', f(vis));
        // 鼻樑的兩個端點（鏡片內側）與往上拱的控制點
        var px0 = R * P[0], py0 = -R * P[1];
        var lp = function (x, y) { return [px0 + K * (E[0] * x - N[0] * y), py0 + K * (-E[1] * x + N[1] * y)]; };
        var an = lp(-s * LENS.hw, LENS.by), cn = lp(-s * 0.34 / ls, LENS.by - 0.1);
        gl.push([an[0], an[1], cn[0], cn[1]]);
        if (vis < gvis) gvis = vis;
      }
    }
    if (this.bridge && gl.length === 2) {
      this.bridge.setAttribute('d', 'M' + f(gl[0][0]) + ' ' + f(gl[0][1]) + 'Q' + f((gl[0][2] + gl[1][2]) / 2) + ' ' +
        f((gl[0][3] + gl[1][3]) / 2) + ' ' + f(gl[1][0]) + ' ' + f(gl[1][1]));
      this.bridge.setAttribute('opacity', f(gvis));
    }
    if (this.earB) {
      var la = EAR.lat * D2R;
      for (var es = -1; es <= 1; es += 2) {
        var lo2 = es * EAR.lon * D2R;
        var eP = rotV([Math.cos(la) * Math.sin(lo2), Math.sin(la), Math.cos(la) * Math.cos(lo2)], cy, sy, cp, sp, cr, sr);
        // 耳朵的寬度方向往正面收（耳殼朝前），不照耳根的經度，轉頭時才不會太快變成側面
        var lo3 = lo2 * 0.3;
        var eE = rotV([Math.cos(lo3), 0, -Math.sin(lo3)], cy, sy, cp, sp, cr, sr);
        var lean = es < 0 ? p.eL : p.eR, th = es * lean * EAR.lean * D2R;
        var hs = 1 - 0.28 * Math.max(lean, 0) + 0.3 * Math.max(-lean, 0);
        var ct = Math.cos(th) * hs, st = Math.sin(th) * hs;
        var ma = eE[0], mb = -eE[1], mc = eP[0] * ct + eE[0] * st, md = -(eP[1] * ct + eE[1] * st);
        // 耳朵其實是立體的，不會薄成一條線：投影後的寬度（垂直於耳朵長軸的分量）至少留 EAR.minW
        var hl = Math.sqrt(mc * mc + md * md) || 1, nx = md / hl, ny = -mc / hl, wn = ma * nx + mb * ny;
        var mw = EAR.minW * clamp(hl / 0.75, 0.45, 1);   // 耳朵朝著你倒下來時整隻變短，寬度下限跟著縮
        if (Math.abs(wn) < mw) { var add = (wn < 0 ? -mw : mw) - wn; ma += nx * add; mb += ny * add; }
        var em = 'matrix(' + f(R * ma) + ' ' + f(R * mb) + ' ' + f(R * mc) + ' ' + f(R * md) + ' ' +
          f(R * EAR.root * eP[0]) + ' ' + f(-R * EAR.root * eP[1]) + ')';
        var ei = es < 0 ? 0 : 1;
        this.earB[ei].setAttribute('transform', em);
        this.earF[ei].setAttribute('transform', em);
        this.earF[ei].setAttribute('opacity', f(ss(0.02, 0.28, eP[2])));
      }
    }

    }

    // 聲波條：每根各自的拍子，整輪 4.8 秒接得起來
    if (p.spk > 0.01) {
      this.barG.setAttribute('opacity', f(clamp(p.spk, 0, 1)));
      for (var bi = 0; bi < NBAR; bi++) {
        var bv = 0.22 + 0.78 * Math.abs(Math.sin(PI * BAR_N[bi] * p.spt / 4.8 + BAR_P[bi])) *
          (0.62 + 0.38 * Math.sin(2 * PI * p.spt / 2.4 + bi * 1.7));
        var bh = 3.5 + 11 * bv * clamp(p.spk, 0, 1);
        this.bars[bi].setAttribute('y', f(36.5 - bh / 2)); this.bars[bi].setAttribute('height', f(bh));
      }
      this.barOn = true;
    } else if (this.barOn) { this.barG.setAttribute('opacity', 0); this.barOn = false; }

    this.halo.setAttribute('opacity', f(p.glow * 0.9));
    if (p.glow) this.halo.setAttribute('transform', 'translate(0 ' + f(cyo) + ') scale(' + f(fit * (0.86 + 0.2 * p.glow)) + ')');
    if (this.shadow) {
      var lift = clamp(-p.ty, 0, 0.5);
      this.shadow.setAttribute('rx', f(fit * R * (0.62 - 0.5 * lift) * (2 - p.sq)));
      this.shadow.setAttribute('opacity', f(0.16 - 0.2 * lift));
    }
    // 入帳小點：從上方落進身體
    var tk = p.tok;
    if (tk > 0 && tk < 1) {
      var e2 = tk * tk;
      this.tok.setAttribute('transform', 'translate(' + f(R * 0.12) + ' ' + f(R * (-1.95 + 1.0 * e2)) + ') scale(' + f(1 - 0.5 * e2) + ')');
      this.tok.setAttribute('opacity', f(Math.min(1, tk * 6)));
    } else this.tok.setAttribute('opacity', 0);
    // 入帳數字：往上飄再淡出（小尺寸不顯示）
    var lb = p.lab;
    if (this.labelText && !this.small && lb > 0 && lb < 1) {
      this.lab.setAttribute('y', f(-R * (1.16 + 0.3 * easeOut(lb))));
      this.lab.setAttribute('opacity', f(Math.min(1, lb * 5) * (1 - ss(0.7, 1, lb))));
    } else this.lab.setAttribute('opacity', 0);
  };

  // 3D 旋轉：歪頭（z 軸）、上下（x 軸）、左右（y 軸），順序同球面版
  function rotV(v, cy, sy, cp, sp, cr, sr) {
    var x = v[0], y = v[1], z = v[2];
    var x1 = x * cr - y * sr, y1 = x * sr + y * cr;
    var y2 = y1 * cp + z * sp, z2 = -y1 * sp + z * cp;
    return [x1 * cy + z2 * sy, y2, -x1 * sy + z2 * cy];
  }
  // 厚板的基準姿勢：照選單列 bot-square-face 序列圖，正面朝左上、整塊順時針歪，看得到右下兩個側面
  var SLAB = { yaw: -16, pitch: 12, roll: -18, k: 0.55 };

  Face.prototype._drawSlab = function (p, f) {
    var shp = SHAPES[this.shape], S = this.S, Dz = this.D, PO = shp.pose || SLAB;
    // 動作表是照球體調的，平面身體轉太多會像翻牌，所以偏移量打折；轉圈例外，要轉滿一圈
    var k = this.key === 'poke_spin' ? 1 : PO.k;
    var yaw = (PO.yaw + k * (p.yaw - BASE.yaw)) * D2R;
    var pit = (PO.pitch + 0.5 * (p.pitch - BASE.pitch)) * D2R;
    var rol = (PO.roll + 0.6 * (p.roll - BASE.roll)) * D2R;
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pit), sp = Math.sin(pit), cr = Math.cos(rol), sr = Math.sin(rol);
    var E = rotV([1, 0, 0], cy, sy, cp, sp, cr, sr), N = rotV([0, 1, 0], cy, sy, cp, sp, cr, sr), Z = rotV([0, 0, 1], cy, sy, cp, sp, cr, sr);
    var lin = f(E[0]) + ' ' + f(-E[1]) + ' ' + f(-N[0]) + ' ' + f(N[1]) + ' ';
    var at = function (z) { return 'matrix(' + lin + f(z * Z[0]) + ' ' + f(-z * Z[1]) + ')'; };
    // 朝向你的那一面當蓋子，側面從背面疊到蓋子
    var sgn = Z[2] >= 0 ? 1 : -1;
    for (var i = 0; i < NSIDE; i++) {
      var tf = at(-sgn * Dz + sgn * 2 * Dz * i / NSIDE);
      this.sides[i][0].setAttribute('transform', tf); this.sides[i][1].setAttribute('transform', tf);
    }
    var cap = at(sgn * Dz);
    for (var j = 0; j < 3; j++) this.front[j].setAttribute('transform', cap);

    // 眼睛貼在正面（z = +D）；正面轉到背後就看不到
    var vis = ss(0.05, 0.3, Z[2]);
    var lid = 1 - 0.93 * clamp(p.lid, 0, 1);
    var K = R * 0.9 * shp.eye.h;                       // 眼形單位 → viewBox
    var half = Math.sin(SEP * D2R) * R * shp.eye.gap * 0.8;   // 0.8：對選單列序列圖量，比 App 比例略收
    var ex = 0.12 * R * p.gx, ey = (shp.eyeY != null ? shp.eyeY : -0.06) * R - 0.10 * R * p.gy;   // 眼睛略高於正面中心（序列圖量的，App shiftY 的單位沒核到）
    for (var s = -1; s <= 1; s += 2) {
      var cx = s * half + ex, cyy = ey;
      // 正面座標 (cx, cyy) 經 at(D) 投影
      var X0 = cx * E[0] - cyy * N[0] + Dz * Z[0], Y0 = -cx * E[1] + cyy * N[1] - Dz * Z[1];
      var m = 'matrix(' + f(K * E[0]) + ' ' + f(-K * E[1]) + ' ' + f(-K * N[0] * lid) + ' ' + f(K * N[1] * lid) +
        ' ' + f(X0) + ' ' + f(Y0) + ')';
      var eye = s < 0 ? p.L : p.R;
      var mp = s < 0 ? this.mL : this.mR, fp = s < 0 ? this.fL : this.fR;
      if (eye !== (s < 0 ? this.dL : this.dR)) {
        var d = eyePath(eye, s, this.eyeScale, this.eyeTilt);
        mp.setAttribute('d', d); fp.setAttribute('d', d);
        if (s < 0) this.dL = eye; else this.dR = eye;
      }
      mp.setAttribute('transform', m); fp.setAttribute('transform', m);
      mp.setAttribute('opacity', f(vis)); fp.setAttribute('opacity', f(vis));
    }
  };

  // 膠囊的基準姿勢：照選單列 bot-tablet-face 序列圖，右端略高、正面朝右上，眼睛在圓柱的右上半
  var PILL = { yaw: 14, pitch: 12, roll: 14, k: 0.6 };

  Face.prototype._drawPill = function (p, f) {
    var shp = SHAPES[this.shape], A = this.PA, O = this.PO;
    var k = this.key === 'poke_spin' ? 1 : PILL.k;
    var yaw = (PILL.yaw + k * (p.yaw - BASE.yaw)) * D2R;
    var pit = (PILL.pitch + 0.6 * (p.pitch - BASE.pitch)) * D2R;
    var rol = (PILL.roll + 0.6 * (p.roll - BASE.roll)) * D2R;
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pit), sp = Math.sin(pit), cr = Math.cos(rol), sr = Math.sin(rol);
    // 輪廓：圓柱軸兩端點投影到畫面，畫成以 A 為半徑的體育場形
    var X = rotV([1, 0, 0], cy, sy, cp, sp, cr, sr);
    var ux = X[0], uy = -X[1], l = Math.sqrt(ux * ux + uy * uy);
    if (l < 1e-4) { ux = 1; uy = 0; } else { ux /= l; uy /= l; }
    if (ux < 0) { ux = -ux; uy = -uy; }                 // 方向固定朝右，亮面才會一直在上面
    var hl = O * l;
    var d = roundRect(hl + A, A, A);
    var tf = 'matrix(' + f(ux) + ' ' + f(uy) + ' ' + f(-uy) + ' ' + f(ux) + ' 0 0)';
    for (var i = 0; i < 2; i++) { this.pillEls[i].setAttribute('d', d); this.pillEls[i].setAttribute('transform', tf); }
    // 高光：左上方一小塊（光從左上來，不跟著身體轉）
    var hx = -hl - A * 0.3, hy = -A * 0.56;   // 貼左端，不靠近左眼
    this.pillHi.setAttribute('cx', f(hx * ux - hy * uy)); this.pillHi.setAttribute('cy', f(hx * uy + hy * ux));
    this.pillHi.setAttribute('rx', f(A * 0.3)); this.pillHi.setAttribute('ry', f(A * 0.14));
    this.pillHi.setAttribute('transform', 'rotate(' + f(Math.atan2(uy, ux) / D2R) + ' ' +
      f(hx * ux - hy * uy) + ' ' + f(hx * uy + hy * ux) + ')');

    // 眼睛：繞圓柱面貼（App seat wrapX），沿軸左右分開；視線讓眼睛沿軸滑、繞圓柱轉
    var lid = 1 - 0.93 * clamp(p.lid, 0, 1);
    var K = R * shp.eye.h;
    var half = Math.sin(SEP * D2R) * R * shp.eye.gap;
    var phi = shp.eye.shiftY / shp.radius + 0.16 * p.gy;
    var cph = Math.cos(phi), sph = Math.sin(phi);
    for (var s = -1; s <= 1; s += 2) {
      var xe = clamp(s * half + 0.1 * R * p.gx, -O, O);
      var P = rotV([xe, A * sph, A * cph], cy, sy, cp, sp, cr, sr);
      var E = rotV([1, 0, 0], cy, sy, cp, sp, cr, sr);
      var N = rotV([0, cph, -sph], cy, sy, cp, sp, cr, sr);
      var Nz = rotV([0, sph, cph], cy, sy, cp, sp, cr, sr);
      var vis = ss(0.05, 0.3, Nz[2]);
      var m = 'matrix(' + f(K * E[0]) + ' ' + f(-K * E[1]) + ' ' + f(-K * N[0] * lid) + ' ' + f(K * N[1] * lid) +
        ' ' + f(P[0]) + ' ' + f(-P[1]) + ')';
      var eye = s < 0 ? p.L : p.R;
      var mp = s < 0 ? this.mL : this.mR, fp = s < 0 ? this.fL : this.fR;
      if (eye !== (s < 0 ? this.dL : this.dR)) {
        var ed = eyePath(eye, s, this.eyeScale, this.eyeTilt);
        mp.setAttribute('d', ed); fp.setAttribute('d', ed);
        if (s < 0) this.dL = eye; else this.dR = eye;
      }
      mp.setAttribute('transform', m); fp.setAttribute('transform', m);
      mp.setAttribute('opacity', f(vis)); fp.setAttribute('opacity', f(vis));
    }
  };

  // 雲：每顆球心轉一次，畫成同半徑的圓（球的投影永遠是圓），遠的先畫
  Face.prototype._drawCloud = function (p, f) {
    var shp = SHAPES[this.shape], PO = shp.pose;
    var k = this.key === 'poke_spin' ? 1 : PO.k;
    var yaw = (PO.yaw + k * (p.yaw - BASE.yaw)) * D2R;
    var pit = (PO.pitch + 0.6 * (p.pitch - BASE.pitch)) * D2R;
    var rol = (PO.roll + 0.6 * (p.roll - BASE.roll)) * D2R;
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pit), sp = Math.sin(pit), cr = Math.cos(rol), sr = Math.sin(rol);
    var CB = this.CB, Q = [], i;
    for (i = 0; i < CB.length; i++) { var q = rotV([CB[i][0], CB[i][1], 0], cy, sy, cp, sp, cr, sr); Q.push([q[0], q[1], q[2], CB[i][2], i]); }
    var ord = Q.slice().sort(function (a, b) { return a[2] - b[2]; });
    for (i = 0; i < ord.length; i++) {
      var o = ord[i], c = this.cBody[i], cc = this.cClip[i];
      c.setAttribute('cx', f(o[0])); c.setAttribute('cy', f(-o[1])); c.setAttribute('r', f(o[3]));
      cc.setAttribute('cx', f(o[0])); cc.setAttribute('cy', f(-o[1])); cc.setAttribute('r', f(o[3]));
    }
    // 高光：左上那顆球的左上角
    var hb = Q[3];
    var hx = hb[0] - hb[3] * 0.42, hy = -hb[1] - hb[3] * 0.48;
    this.cHi.setAttribute('cx', f(hx)); this.cHi.setAttribute('cy', f(hy));
    this.cHi.setAttribute('rx', f(hb[3] * 0.36)); this.cHi.setAttribute('ry', f(hb[3] * 0.2));
    this.cHi.setAttribute('transform', 'rotate(-34 ' + f(hx) + ' ' + f(hy) + ')');

    // 眼睛：落在雲的表面（找最凸出的那顆球），切面跟著那顆球的法線，轉到背面就看不到
    var E = rotV([1, 0, 0], cy, sy, cp, sp, cr, sr), N = rotV([0, 1, 0], cy, sy, cp, sp, cr, sr);
    var lid = 1 - 0.93 * clamp(p.lid, 0, 1);
    var K = R * 0.9 * shp.eye.h;
    var half = Math.sin(SEP * D2R) * R * shp.eye.gap * 0.86;
    var ey0 = shp.eye.shiftY * R * 0.6 + 0.10 * R * p.gy;
    for (var s = -1; s <= 1; s += 2) {
      var x0 = s * half + 0.12 * R * p.gx, y0 = ey0, z0 = 0, nb = null;
      for (i = 0; i < CB.length; i++) {
        var dx = x0 - CB[i][0], dy = y0 - CB[i][1], rr = CB[i][2] * CB[i][2] - dx * dx - dy * dy;
        if (rr > 0) { var z = Math.sqrt(rr); if (z > z0) { z0 = z; nb = [dx / CB[i][2], dy / CB[i][2], z / CB[i][2]]; } }
      }
      if (!nb) nb = [0, 0, 1];
      var P = rotV([x0, y0, z0], cy, sy, cp, sp, cr, sr), Nz = rotV(nb, cy, sy, cp, sp, cr, sr);
      var vis = ss(0.08, 0.32, Nz[2]);
      var m = 'matrix(' + f(K * E[0]) + ' ' + f(-K * E[1]) + ' ' + f(-K * N[0] * lid) + ' ' + f(K * N[1] * lid) +
        ' ' + f(P[0]) + ' ' + f(-P[1]) + ')';
      var eye = s < 0 ? p.L : p.R;
      var mp = s < 0 ? this.mL : this.mR, fp = s < 0 ? this.fL : this.fR;
      if (eye !== (s < 0 ? this.dL : this.dR)) {
        var ed = eyePath(eye, s, this.eyeScale, this.eyeTilt);
        mp.setAttribute('d', ed); fp.setAttribute('d', ed);
        if (s < 0) this.dL = eye; else this.dR = eye;
      }
      mp.setAttribute('transform', m); fp.setAttribute('transform', m);
      mp.setAttribute('opacity', f(vis)); fp.setAttribute('opacity', f(vis));
    }
  };

  Face.prototype.destroy = function () {
    if (this.dead) return;
    this.dead = true;
    removeLive(this);
    if (this.timer) { root.clearTimeout(this.timer); this.timer = 0; }
    if (this.io) this.io.disconnect();
    if (this.mq) {
      if (this.mq.removeEventListener) this.mq.removeEventListener('change', this.onMq);
      else if (this.mq.removeListener) this.mq.removeListener(this.onMq);
    }
    if (this.onMove) root.removeEventListener('pointermove', this.onMove);
    if (this.wrap.parentNode) this.wrap.parentNode.removeChild(this.wrap);
  };

  /* ---------- 對外介面 ---------- */
  function api(inst) {
    return {
      setMood: function (m, o) {
        if (MOOD_LIST.indexOf(m) < 0) { if (root.console) root.console.warn('BotFace：沒有這個 mood', m); return; }
        inst._enter(m, o);
      },
      poke: function () { inst._enter('poke'); },
      setColor: function (c) { inst.setColor(c); },
      setTone: function (t) { inst.setTone(t); },
      getTone: function () { return inst.tone; },
      setSize: function (n) { inst.setSize(n); },
      setReduceMotion: function (v) { inst.reduced = !!v; inst._sync(); },
      getMood: function () { return inst.mood; },
      getShape: function () { return inst.shape; },
      destroy: function () { inst.destroy(); }
    };
  }
  var BotFace = {
    version: '1122-F',
    MOODS: MOOD_LIST.slice(),
    COLORS: COLORS,
    PRESETS: PRESETS,
    SHAPES: function () { return Object.keys(SHAPES); },
    mount: function (host, opts) {
      if (!host || !host.appendChild) throw new Error('BotFace.mount 需要一個元素');
      return api(new Face(host, opts || {}));
    },
    // 加形狀：kind 'slab' 需給 half、corner、depth、eye{w,h,gap,shiftY}、path(S, corner)，可加 pose{yaw,pitch,roll,k}；
    //   kind 'cloud' 需給 half、balls[[x,y,r]…]（以 App 畫布半寬 L=114.27 為單位、y 朝下）、eye、pose；
    //   kind 'pill'（橫躺膠囊）需給 half（總半長）、radius（端半徑／總半長）、eye{w,h,gap,shiftY}
    registerShape: function (name, def) { SHAPES[name] = def; },
    // 測試用：目前還在跑迴圈的實例數
    _liveCount: function () { return live.length; }
  };
  // 舊介面相容：TataFace.mount 等於 preset 'tata'
  var TataFace = {
    version: BotFace.version, MOODS: MOOD_LIST.slice(),
    mount: function (host, opts) {
      var o = {}; opts = opts || {};
      for (var k in opts) o[k] = opts[k];
      if (!o.preset) o.preset = 'tata';
      return BotFace.mount(host, o);
    },
    _liveCount: BotFace._liveCount
  };

  root.BotFace = BotFace;
  if (!root.TataFace) root.TataFace = TataFace;
  if (typeof module !== 'undefined' && module.exports) module.exports = BotFace;
})(typeof window !== 'undefined' ? window : this);
