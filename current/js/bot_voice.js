/*!
 * bot_voice.js  Grok Bot 隊的叫聲（逐流版 1122-K 可愛小生物，2026-11-22）
 * 單檔、零依賴、不用音檔：全部用 Web Audio 即時合成（不花點數、不用 AI 生成、不取樣任何遊戲或角色）。
 *
 * 1122-K 改版（老大：「聲音我不愛欸不能是很可愛的那種叫聲嗎 網路遊戲的那些可愛生物」）：
 *   整體音高拉高、變短變彈；每隻有自己的三個「字」（主叫、軟音、招牌音），
 *   用共振峰（母音）＋字頭子音＋彎音畫出來，回話是一串嘰哩咕嚕的碎念。
 *
 * 七隻、每隻一個小生物個性（基準音）：
 *   tata 塔塔  圓滾滾，軟軟的「咕、噗」，音從下面滑上來，招牌音是算盤珠的小「喀」（523 Hz）
 *   jiji 集集  方方的，「嗶、啾」，音高一格一格跳，招牌音是連兩下「嗶嗶」（1047 Hz）
 *   peng 朋朋  膠囊，「啵、噗」，字頭先彈高再晃兩下像彈簧，招牌音是「嘿」（698 Hz）
 *   mon  萌萌  雲，飄飄的「咪、嗚」，慢起、顫音、尾巴往上撒嬌，招牌音是「喵」（880 Hz）
 *   din  定定  白六角，文靜的小「嗯、唔」，音高動得少，招牌音是鼻音小「哼」（622 Hz）
 *   kim  金金  星星，亮亮的「叮、啦」，招牌音是帶兩顆小星星的「鈴」（1397 Hz）
 *   daqi 大器  小黑豹，短短的「喵、嗚」，尾音往下收，招牌音是咕嚕「嚕」（494 Hz）
 *
 * 情境：poke（被戳）call（你叫它）reply（它回話了）done（做完了）error（出問題了）sleepy（想睡）
 *   grr1、grr2（被連戳越來越不耐煩）hum（開心哼一小段）。每個情境 4 個變體，共 36 段／隻。
 *   每次隨機挑一個變體，連續兩次不重複，再加一點音高與長短的微擾；碎念每個字的音高每次都會小跳。
 *
 * 用法（跟 1122-H 一樣，換檔就能用）：
 *   BotVoice.play('tata', 'poke');          // 照規則挑變體
 *   BotVoice.play('jiji', 'done', { v: 2 }); // 指定變體（試聽頁用）
 *   BotVoice.poke('peng');                   // 被戳：自動算連戳次數，戳多了換 grr1、grr2
 *   BotVoice.setEnabled(false);              // 關聲音（之後不建任何節點）
 *   BotVoice.unlock();                       // 在使用者手勢裡呼叫，建立／喚醒 AudioContext
 *   BotVoice.attach(BotFace);                // 跟 bot_face 的表情同步（poke、speaking、logged、over、alert、sleepy）
 *   BotVoice.render('kim', 'done', 0)        // → Promise<AudioBuffer>（OfflineAudioContext，給錄 wav 用）
 *   BotVoice.variants('reply', 'mon')        // 這隻這個情境四個變體的名字（不給第二個參數＝通用說明）
 *
 * 規則：同一隻 0.3 秒內只響一次；全部合起來 0.08 秒內只響一次；沒有使用者手勢前不出聲（瀏覽器規定）。
 *   prefers-reduced-motion 不影響聲音。設定存 localStorage（讀寫失敗就用預設：開）。預設音量小（0.18）。
 */
(function (root) {
  'use strict';

  var ALIAS = { gig: 'jiji', pompom: 'peng', monmon: 'mon', dinding: 'din', kimkim: 'kim' };
  var NAMES = { tata: '塔塔', jiji: '集集', peng: '朋朋', mon: '萌萌', din: '定定', kim: '金金', daqi: '大器' };
  var SITS = ['poke', 'call', 'reply', 'done', 'error', 'sleepy'];
  var CHAT = ['grr1', 'grr2', 'hum'];
  var SIT_NAME = { poke: '被戳', call: '你叫它', reply: '回話了', done: '做完了', error: '出問題了', sleepy: '想睡',
    grr1: '連戳：有點煩', grr2: '連戳：很煩', hum: '開心哼' };

  /* ---------- 音型（七隻共用的音高與節奏，字由各隻自己的字典填） ----------
     P(k, st, ms, bend, sh, gap, a)
       k＝用哪個字（A 主叫、B 軟音、C 招牌音）、st＝對基準音的半音數、ms＝長度、
       bend＝這個字裡音高彎多少半音、sh＝彎法（lin 直線、q 問句：後半才上揚、arc 拱起再回來、
       fall 越掉越快、wob 邊掉邊抖）、gap＝到下一個字的空隙 ms、a＝音量 0～1。 */
  function P(k, st, ms, bend, sh, gap, a) {
    return { k: k, st: st, d: ms / 1000, b: bend || 0, sh: sh || 'lin', gap: (gap == null ? 30 : gap) / 1000, a: a == null ? 1 : a };
  }
  var PAT = {
    poke: [
      { n: '一聲上揚', e: '！', s: [P('A', 4, 110, 5)] },
      { n: '兩聲跳高', e: '', s: [P('A', 2, 70, 2, 'lin', 35), P('A', 7, 90, 3)] },
      { n: '軟軟的問', e: '？', s: [P('B', 0, 150, 8, 'q')] },
      { n: '招牌音', e: '', s: [P('C', 5, 110, -3)] }
    ],
    call: [
      { n: '問句', e: '？', s: [P('A', 0, 180, 7, 'q')] },
      { n: '兩聲問', e: '？', s: [P('B', 0, 80, 0, 'lin', 30), P('A', 5, 140, 5, 'q')] },
      { n: '拉長應聲', e: '～', s: [P('A', 3, 260, 3, 'arc')] },
      { n: '碎念問', e: '？', bab: 1, s: [P('A', 2, 65, 0, 'lin', 15), P('B', 0, 65, 0, 'lin', 15), P('A', 4, 65, 0, 'lin', 15), P('A', 7, 130, 5, 'q')] }
    ],
    reply: [
      { n: '碎念五個字', e: '', bab: 1, s: [P('A', 2, 70, 0, 'lin', 15), P('B', 0, 65, 0, 'lin', 15), P('A', 4, 70, 0, 'lin', 15), P('B', 2, 65, 0, 'lin', 15), P('A', 0, 110, -3)] },
      { n: '碎念六個字', e: '', bab: 1, s: [P('B', 0, 60, 0, 'lin', 12), P('A', 5, 65, 0, 'lin', 12), P('A', 3, 60, 0, 'lin', 22), P('B', 0, 60, 0, 'lin', 12), P('A', 7, 70, 0, 'lin', 12), P('B', 4, 120, -4)] },
      { n: '點頭', e: '', s: [P('A', 3, 80, 0, 'lin', 40), P('A', 3, 80, 0, 'lin', 60), P('B', -1, 130, -3)] },
      { n: '碎念七個字', e: '', bab: 1, s: [P('A', 0, 55, 0, 'lin', 12), P('A', 4, 55, 0, 'lin', 12), P('C', 7, 70, 0, 'lin', 20), P('B', 2, 55, 0, 'lin', 12), P('A', 5, 60, 0, 'lin', 12), P('B', 0, 55, 0, 'lin', 12), P('A', 2, 120, 2, 'arc')] }
    ],
    done: [
      { n: '跳高一聲', e: '！', s: [P('A', 0, 70, 0, 'lin', 25), P('A', 7, 150, 2)] },
      { n: '招牌音拉長', e: '～', s: [P('C', 5, 240, 4)] },
      { n: '一路往上', e: '！', s: [P('A', 0, 65, 0, 'lin', 12), P('A', 4, 65, 0, 'lin', 12), P('A', 7, 65, 0, 'lin', 12), P('C', 12, 170, 1)] },
      { n: '偷笑', e: '', s: [P('A', 9, 70, -2, 'lin', 40), P('A', 7, 70, -2, 'lin', 40), P('A', 10, 120, 3)] }
    ],
    error: [
      { n: '垂下去', e: '…', s: [P('B', 2, 300, -7, 'fall')] },
      { n: '咦，然後垂下去', e: '…', s: [P('A', 5, 100, 3, 'lin', 50), P('B', -2, 220, -5)] },
      { n: '三聲往下', e: '…', s: [P('B', 3, 90, 0, 'lin', 35), P('B', 1, 90, 0, 'lin', 35), P('B', -2, 190, -3)] },
      { n: '招牌音發抖', e: '…', s: [P('C', 0, 280, -5, 'wob')] }
    ],
    sleepy: [
      { n: '打哈欠', e: '～', s: [P('A', -2, 220, 6, 'lin', 0, 0.6), P('B', 4, 380, -10, 'fall', 30, 0.5)] },
      { n: '慢慢垂下', e: '…', s: [P('B', -3, 420, -5, 'lin', 30, 0.55)] },
      { n: '打呼兩下', e: ' z z', s: [P('C', -5, 170, -1, 'lin', 150, 0.45), P('C', -7, 210, -2, 'lin', 30, 0.4)] },
      { n: '夢話', e: '…', s: [P('B', -2, 120, 0, 'lin', 40, 0.5), P('B', -4, 140, 0, 'lin', 50, 0.5), P('B', -5, 260, -3, 'lin', 30, 0.45)] }
    ],
    grr1: [
      { n: '咦！', e: '？！', s: [P('A', 2, 60, 0, 'lin', 20), P('A', 9, 110, 4)] },
      { n: '兩聲抗議', e: '！', s: [P('A', 6, 75, -2, 'lin', 30), P('A', 6, 95, -4)] },
      { n: '軟音接尖音', e: '！', s: [P('B', 0, 70, 0, 'lin', 25), P('A', 8, 100, -3)] },
      { n: '三連往上', e: '！', s: [P('A', 5, 55, 0, 'lin', 18), P('A', 7, 55, 0, 'lin', 18), P('A', 9, 95, 2)] }
    ],
    grr2: [
      { n: '拖長再頓一下', e: '！', s: [P('B', 1, 320, -4, 'arc', 30), P('A', 8, 85, -4)] },
      { n: '招牌音跺腳', e: '！', s: [P('C', 3, 60, 0, 'lin', 15), P('C', -1, 190, -6, 'fall')] },
      { n: '連珠砲抗議', e: '！！', bab: 1, s: [P('A', 7, 50, 0, 'lin', 12), P('A', 9, 50, 0, 'lin', 12), P('A', 7, 50, 0, 'lin', 12), P('A', 10, 50, 0, 'lin', 12), P('A', 7, 50, 0, 'lin', 12), P('B', 2, 130, -5)] },
      { n: '尖叫發抖', e: '～！', s: [P('A', 10, 300, -5, 'wob')] }
    ],
    hum: [
      { n: '三個音往上', e: '～', s: [P('B', 0, 110, 0, 'lin', 30), P('B', 4, 110, 0, 'lin', 30), P('B', 7, 220, 0.5)] },
      { n: '五個音小旋律', e: '～', s: [P('A', 7, 90, 0, 'lin', 25), P('A', 4, 90, 0, 'lin', 25), P('A', 7, 90, 0, 'lin', 25), P('A', 9, 90, 0, 'lin', 25), P('B', 12, 200, 0)] },
      { n: '搖擺', e: '♪', s: [P('B', 4, 130, 0, 'lin', 30), P('B', 2, 80, 0, 'lin', 20), P('B', 0, 130, 0, 'lin', 30), P('B', 4, 80, 0, 'lin', 20), P('B', 7, 220, 0)] },
      { n: '收在招牌音', e: '～', s: [P('B', 0, 100, 0, 'lin', 25), P('B', 7, 100, 0, 'lin', 25), P('B', 4, 100, 0, 'lin', 25), P('B', 9, 100, 0, 'lin', 25), P('C', 7, 220, 0)] }
    ]
  };

  /* 母音 → 三個共振峰（Hz）。已經比大人的嗓子高一截（小生物的小嘴巴），各隻再乘自己的 fs。 */
  var VOW = {
    i: [370, 3100, 4000], e: [600, 2700, 3500], a: [1100, 1900, 3600],
    o: [650, 1200, 3400], u: [430, 1000, 3200], m: [350, 1400, 2800]
  };

  /* ---------- 七隻的字典 ----------
     n＝字、c＝字頭子音（b／p 啵的彈出、g 咕的小彈、ch 啾的氣聲、k 喀、m 鼻音起頭、h 氣音起頭、l 舌音）、
     v＝母音（寫兩三個＝字裡滑過去，例 ia 是「咪啊」＝喵）、
     tick 算盤珠、dbl 一個字裡連兩下（數字＝第二下高幾個半音）、boing 彈簧晃動幾個半音、
     bell 鈴、spark 鈴上面再加兩顆小星星、purr 咕嚕顫動、st 這個字固定偏幾個半音、a 音量。 */
  var LEX = {
    tata: { A: { n: '咕', c: 'g', v: 'u' }, B: { n: '噗', c: 'p', v: 'uo' }, C: { n: '喀', c: '', v: 'o', tick: 1, a: 0.8 } },
    jiji: { A: { n: '嗶', c: '', v: 'i' }, B: { n: '啾', c: 'ch', v: 'iu' }, C: { n: '嗶嗶', c: '', v: 'i', dbl: 3 } },
    peng: { A: { n: '啵', c: 'b', v: 'o', boing: 2.2 }, B: { n: '噗', c: 'p', v: 'u' }, C: { n: '嘿', c: 'h', v: 'e', boing: 1 } },
    mon:  { A: { n: '咪', c: 'm', v: 'i' }, B: { n: '嗚', c: '', v: 'u', air: 0.1 }, C: { n: '喵', c: 'm', v: 'ia' } },
    din:  { A: { n: '嗯', c: '', v: 'm' }, B: { n: '唔', c: '', v: 'u' }, C: { n: '哼', c: 'h', v: 'm' } },
    kim:  { A: { n: '叮', c: '', v: 'i', bell: 1 }, B: { n: '啦', c: 'l', v: 'a' }, C: { n: '鈴', c: '', v: 'i', bell: 1, spark: 1 } },
    daqi: { A: { n: '喵', c: 'm', v: 'iau' }, B: { n: '嗚', c: '', v: 'au' }, C: { n: '嚕', c: '', v: 'u', purr: 1, st: -5 } }
  };

  /* ---------- 七隻的嗓子 ----------
     f＝基準音 Hz、os＝振盪器 [波形, 倍頻, 音量, 走音 cents]、dk＝長短倍數、gk＝彎音倍數（定定小＝文靜）、
     att＝起音秒、lp＝低通 Hz、form＝共振峰混合量、fs＝共振峰倍數、vib＝顫音 [Hz, cents]、
     scoop＝字頭從下面幾個半音滑上來（塔塔的咕）、step＝音高一格一格跳（集集）、
     tail＝字尾多彎幾個半音（萌萌往上撒嬌、大器往下收）、air＝氣音量、gain＝音量補償 */
  var V = {
    tata: { f: 523, os: [['triangle', 1, 1], ['sine', 1, 0.5]], dk: 1.0, gk: 0.85, att: 0.014, lp: 3000, form: 0.45, fs: 1.0, vib: [6, 14], scoop: -2.5, air: 0.03, gain: 0.95 },
    jiji: { f: 1047, os: [['square', 1, 0.3], ['triangle', 1, 0.6]], dk: 0.78, gk: 0.8, att: 0.004, lp: 3800, form: 0.2, fs: 1.3, step: 1, air: 0, gain: 0.85 },
    peng: { f: 698, os: [['sine', 1, 1], ['sine', 2, 0.22]], dk: 0.9, gk: 1.1, att: 0.004, lp: 4500, form: 0.3, fs: 1.15, air: 0.02, gain: 0.95 },
    mon:  { f: 880, os: [['sine', 1, 0.7], ['sine', 1, 0.5, 10], ['triangle', 1, 0.25]], dk: 1.12, gk: 1.1, att: 0.035, lp: 4200, form: 0.4, fs: 1.25, vib: [5.8, 36], tail: 1.5, air: 0.14, gain: 0.95 },
    din:  { f: 622, os: [['triangle', 1, 1]], dk: 1.0, gk: 0.5, att: 0.018, lp: 2600, form: 0.5, fs: 1.1, vib: [5, 8], air: 0.03, gain: 1.1 },
    kim:  { f: 1397, os: [['sine', 1, 1], ['triangle', 1, 0.3]], dk: 0.95, gk: 0.7, att: 0.002, lp: 9000, form: 0.15, fs: 1.3, air: 0, gain: 0.8 },
    daqi: { f: 494, os: [['sawtooth', 1, 0.45], ['triangle', 1, 0.7]], dk: 0.88, gk: 0.8, att: 0.012, lp: 3800, form: 0.8, fs: 1.05, tail: -1.5, air: 0.05, gain: 1.1 }
  };

  /* ---------- 狀態 ---------- */
  var KEY = 'zhuliu.voice';
  var enabled = true, volume = 0.18;
  try { var sv = root.localStorage && root.localStorage.getItem(KEY); if (sv === 'off') enabled = false; } catch (e) {}
  var ctx = null, master = null, unlocked = false;
  var lastAt = {}, lastAny = 0, lastVar = {}, pokeLog = {};
  var stats = { ctx: 0, nodes: 0, played: 0, throttled: 0, blocked: 0, last: null };
  var listeners = [];

  function bk(b) { b = String(b || '').toLowerCase(); return ALIAS[b] || b; }
  function now() { return (root.performance && root.performance.now ? root.performance.now() : Date.now()) / 1000; }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function AC() { return root.AudioContext || root.webkitAudioContext; }
  function ensure() {
    if (!enabled) return null;
    if (!ctx) {
      var C = AC(); if (!C) return null;
      try { ctx = new C(); } catch (e) { return null; }
      stats.ctx++;
      master = ctx.createGain(); stats.nodes++;
      master.gain.value = volume;
      // 很輕的壓縮，連發時不爆
      var comp = ctx.createDynamicsCompressor(); stats.nodes++;
      comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.12;
      master.connect(comp); comp.connect(ctx.destination);
    }
    return ctx;
  }
  function unlock() {
    unlocked = true;
    if (!enabled) return false;
    var c = ensure(); if (!c) return false;
    if (c.state === 'suspended' && c.resume) { try { c.resume(); } catch (e) {} }
    return true;
  }

  /* ---------- 合成 ---------- */
  var noiseCache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function noiseBuf(c) {
    var b = noiseCache && noiseCache.get(c);
    if (b) return b;
    var n = Math.floor(c.sampleRate * 0.6);
    b = c.createBuffer(1, n, c.sampleRate);
    var d = b.getChannelData(0), seed = 12345;
    for (var i = 0; i < n; i++) { seed = (seed * 16807) % 2147483647; d[i] = (seed / 2147483647) * 2 - 1; }
    if (noiseCache) noiseCache.set(c, b);
    return b;
  }
  function N(c, kind) { stats.nodes++; return c['create' + kind](); }

  function shape(sh, u) {
    if (sh === 'q') { if (u < 0.4) return 0; var x = (u - 0.4) / 0.6; return x * x * (3 - 2 * x); }
    if (sh === 'arc') return Math.sin(Math.PI * u);
    if (sh === 'fall') return u * u;
    if (sh === 'wob') return u + 0.25 * Math.sin(2 * Math.PI * 3 * u);
    return u;
  }

  // 很短的一口氣／一聲喀：帶通或高通雜訊
  function burst(c, out, t, type, freq, q, amp, dur) {
    var nb = N(c, 'BufferSource'); nb.buffer = noiseBuf(c);
    var nf = N(c, 'BiquadFilter'); nf.type = type; nf.frequency.value = freq; nf.Q.value = q;
    var ng = N(c, 'Gain');
    ng.gain.setValueAtTime(amp, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    nb.connect(nf); nf.connect(ng); ng.connect(out);
    nb.start(t, Math.random() * 0.3); nb.stop(t + dur + 0.01);
  }
  // 一顆很短的正弦小音（算盤珠、小星星）
  function ping(c, out, t, f0, f1, amp, dur) {
    var o = N(c, 'Oscillator'); o.type = 'sine';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    var g = N(c, 'Gain');
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(amp, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // 一個字。回傳結束時間。
  function syl(c, out, t, s, v, lx, jit) {
    var d = Math.max(0.045, s.d * v.dk * jit.d);
    var st0 = s.st + (lx.st || 0) + jit.st;
    var bend = s.b * v.gk;
    var cons = lx.c || '';
    var amp = s.a * (lx.a || 1) * v.gain * 0.5;
    var fb = v.f * jit.p;

    // 音高曲線（半音 → Hz）
    var on = lx.bell ? 0 : (cons === 'b' || cons === 'p') ? 10 : cons === 'g' ? 5 : (cons === 'ch' || cons === 'k') ? 4 : cons === 'l' ? -3 : 0;
    var onT = cons === 'l' ? 0.02 : 0.012;
    var n = Math.max(16, Math.min(400, Math.ceil(d / 0.003)));
    var curve = new Float32Array(n), q = bend ? Math.abs(bend) / 2 : 1;
    for (var i = 0; i < n; i++) {
      var u = i / (n - 1), tt = u * d;
      var part = bend * shape(s.sh, u);
      if (v.step) part = Math.round(part / q) * q;            // 集集：一格一格跳
      var x = st0 + part;
      if (lx.dbl && u > 0.5) x += lx.dbl;                     // 嗶嗶：第二下高一點
      x += on * Math.exp(-tt / onT);                           // 字頭彈出
      if (v.scoop) x += v.scoop * Math.exp(-tt / 0.03);        // 塔塔：從下面滑上來
      if (lx.boing) x += lx.boing * Math.exp(-u * 3.5) * Math.sin(2 * Math.PI * 22 * tt); // 朋朋：彈簧
      if (v.tail) x += v.tail * u * u * u;                     // 萌萌尾巴上揚、大器尾巴下收
      curve[i] = fb * Math.pow(2, x / 12);
    }

    // 音量包絡
    var env = N(c, 'Gain'), att = Math.min(v.att, d * 0.35), a1, mT = 0, tail = 0.07;
    env.gain.setValueAtTime(0, t);
    if (cons === 'm') {            // 鼻音起頭：先小小聲悶著，再打開
      mT = Math.min(0.045, d * 0.3);
      env.gain.linearRampToValueAtTime(amp * 0.4, t + 0.008);
      env.gain.setValueAtTime(amp * 0.4, t + mT);
      env.gain.linearRampToValueAtTime(amp, t + mT + 0.012);
      a1 = t + mT + 0.012;
    } else {
      if (cons === 'h') att = Math.max(att, 0.03);
      env.gain.linearRampToValueAtTime(amp, t + att);
      a1 = t + att;
    }
    if (lx.bell) {
      env.gain.setTargetAtTime(0, a1, Math.max(0.05, d * 0.45));
      tail = 0.32;
    } else if (lx.dbl) {
      var h = d * 0.42, h2 = d * 0.56;
      env.gain.setValueAtTime(amp, t + Math.max(att, h - 0.008));
      env.gain.linearRampToValueAtTime(0, t + h);
      env.gain.setValueAtTime(0, t + h2);
      env.gain.linearRampToValueAtTime(amp, t + h2 + att);
      env.gain.setTargetAtTime(0, t + Math.max(h2 + att, d * 0.86), 0.012);
    } else {
      var relAt = Math.max(a1, t + d * 0.62);
      env.gain.setValueAtTime(amp, relAt);
      env.gain.setTargetAtTime(0, relAt, Math.max(0.012, (t + d - relAt) / 3.5));
    }
    var end = t + d + tail;

    // 咕嚕顫動（大器的嚕）
    var dest = env;
    if (lx.purr) {
      var amG = N(c, 'Gain'); amG.gain.value = 0.67;
      var lfo = N(c, 'Oscillator'); lfo.type = 'sine'; lfo.frequency.value = 27 * jit.p;
      var lfoG = N(c, 'Gain'); lfoG.gain.value = 0.33;
      lfo.connect(lfoG); lfoG.connect(amG.gain);
      lfo.start(t); lfo.stop(end);
      amG.connect(env); dest = amG;
    }

    // 音色：直通（低通）＋三個共振峰並聯
    var vk = String(lx.v || 'a').split('');
    var pre = N(c, 'Gain'); pre.gain.value = 1;
    var lp = N(c, 'BiquadFilter'); lp.type = 'lowpass'; lp.Q.value = 0.7;
    var lpF = vk[0] === 'm' ? Math.min(v.lp, 1800) : v.lp;
    if (mT) { lp.frequency.setValueAtTime(700, t); lp.frequency.setValueAtTime(700, t + mT); lp.frequency.linearRampToValueAtTime(lpF, t + mT + 0.02); }
    else lp.frequency.setValueAtTime(lpF, t);
    var dry = N(c, 'Gain'); dry.gain.value = 1 - v.form * 0.55;
    pre.connect(lp); lp.connect(dry); dry.connect(dest);
    if (v.form > 0) {
      var FG = [2.2, 1.6, 0.8];
      for (var k = 0; k < 3; k++) {
        var bp = N(c, 'BiquadFilter'); bp.type = 'bandpass'; bp.Q.value = 4;
        bp.frequency.setValueAtTime(VOW[vk[0]][k] * v.fs, t);
        if (vk.length > 1) {
          bp.frequency.setValueAtTime(VOW[vk[0]][k] * v.fs, t + d * 0.15);
          for (var j = 1; j < vk.length; j++) bp.frequency.linearRampToValueAtTime(VOW[vk[j]][k] * v.fs, t + d * (0.15 + 0.6 * j / (vk.length - 1)));
        }
        var bg = N(c, 'Gain'); bg.gain.value = v.form * FG[k];
        pre.connect(bp); bp.connect(bg); bg.connect(dest);
      }
    }

    // 振盪器
    v.os.forEach(function (od) {
      var os = N(c, 'Oscillator'); os.type = od[0];
      var cv = curve;
      if (od[1] !== 1) { cv = new Float32Array(n); for (var z = 0; z < n; z++) cv[z] = curve[z] * od[1]; }
      os.frequency.setValueAtTime(cv[0], t);
      os.frequency.setValueCurveAtTime(cv, t, d);
      if (od[3]) os.detune.value = od[3];
      if (v.vib && d > 0.14) {     // 顫音：字夠長才有，慢慢進來
        var vl = N(c, 'Oscillator'); vl.frequency.value = v.vib[0];
        var vg = N(c, 'Gain');
        vg.gain.setValueAtTime(0, t + 0.05); vg.gain.linearRampToValueAtTime(v.vib[1], t + 0.14);
        vl.connect(vg); vg.connect(os.detune); vl.start(t); vl.stop(end);
      }
      var og = N(c, 'Gain'); og.gain.value = od[2];
      os.connect(og); og.connect(pre);
      os.start(t); os.stop(end);
    });

    // 鈴的泛音（金金），各自衰減，直接出去
    if (lx.bell) {
      var fe = curve[n - 1];
      [[2.76, 0.28, 0.5], [5.4, 0.1, 0.3]].forEach(function (hh) {
        var bo = N(c, 'Oscillator'); bo.type = 'sine';
        bo.frequency.setValueAtTime(curve[0] * hh[0], t); bo.frequency.exponentialRampToValueAtTime(fe * hh[0], t + d);
        var bgn = N(c, 'Gain');
        bgn.gain.setValueAtTime(0.0001, t); bgn.gain.linearRampToValueAtTime(amp * hh[1], t + 0.002);
        bgn.gain.exponentialRampToValueAtTime(0.0001, t + d * hh[2] + 0.06);
        bo.connect(bgn); bgn.connect(out);
        bo.start(t); bo.stop(t + d + 0.1);
      });
      if (lx.spark) {              // 鈴：上面再灑兩顆小星星
        ping(c, out, t + 0.035, curve[0] * 2, curve[0] * 2, amp * 0.3, 0.09);
        ping(c, out, t + 0.075, curve[0] * 3, curve[0] * 3, amp * 0.2, 0.09);
      }
    }

    // 氣音（跟著包絡走）
    var air = (v.air || 0) + (lx.air || 0) + (s.a < 0.7 ? 0.08 : 0);   // 想睡的字多一點氣
    if (air > 0.01) {
      var nb = N(c, 'BufferSource'); nb.buffer = noiseBuf(c);
      var nf = N(c, 'BiquadFilter'); nf.type = 'bandpass'; nf.frequency.value = 3000; nf.Q.value = 0.8;
      var ng = N(c, 'Gain'); ng.gain.value = Math.min(1, air) * 0.6;
      nb.connect(nf); nf.connect(ng); ng.connect(dest);
      nb.start(t, Math.random() * 0.2); nb.stop(end);
    }

    // 字頭子音
    if (cons === 'p') burst(c, out, t, 'bandpass', 2500, 1.2, amp * 0.3, 0.012);
    else if (cons === 'ch') burst(c, out, t, 'highpass', 4500, 0.7, amp * 0.3, 0.026);
    else if (cons === 'k') burst(c, out, t, 'bandpass', 3200, 6, amp * 0.4, 0.014);
    else if (cons === 'h') burst(c, out, t, 'bandpass', 1800, 0.8, amp * 0.4, 0.055);

    // 塔塔：算盤珠的小喀（短正弦往下掉＋一點點木頭雜訊），輕輕的
    if (lx.tick) {
      ping(c, out, t, 2100 * jit.p, 1300 * jit.p, amp * 0.5, 0.025);
      burst(c, out, t, 'bandpass', 3000, 8, amp * 0.5, 0.008);
    }

    env.connect(out);
    return t + d;
  }

  function pickVar(b, sit) {
    var list = PAT[sit]; if (!list) return 0;
    var k = b + ':' + sit, last = lastVar[k], i;
    if (list.length === 1) i = 0;
    else { do { i = Math.floor(Math.random() * list.length); } while (i === last); }
    lastVar[k] = i;
    return i;
  }

  // 一個字至少多長（太短聽不清楚）
  function floorK(pat, s, v) { return pat.s.length === 1 ? Math.max(1, 0.16 / (s.d * v.dk)) : Math.max(1, 0.06 / (s.d * v.dk)); }

  // 把一個音型畫進 out，從時間 t 開始。回傳總長（秒）。
  function schedule(c, out, b, sit, vi, t, exact) {
    var v = V[b], lex = LEX[b], pat = PAT[sit][vi];
    var jp = exact ? 1 : Math.pow(2, rnd(-0.7, 0.7) / 12);   // ±0.7 半音
    var jd = exact ? 1 : rnd(0.92, 1.08);
    var tt = t;
    for (var i = 0; i < pat.s.length; i++) {
      var s = pat.s[i];
      var jst = exact ? 0 : (pat.bab && i < pat.s.length - 1 ? Math.round(rnd(-1.4, 1.4)) : rnd(-0.15, 0.15));  // 碎念：每個字小跳
      var jit = { p: jp, d: jd * floorK(pat, s, v), st: jst };
      tt = syl(c, out, tt, s, v, lex[s.k], jit) + s.gap * jd;
    }
    return tt - t;
  }

  // 這隻這個變體念起來的字（試聽頁按鈕、stats.last.name 用）
  function nameOf(b, sit, vi) {
    var pat = PAT[sit] && PAT[sit][vi]; if (!pat) return '';
    var lex = LEX[b]; if (!lex) return pat.n;
    return pat.s.map(function (s) { return lex[s.k].n; }).join('') + (pat.e || '');
  }

  /* ---------- 對外 ---------- */
  function play(b, sit, o) {
    o = o || {};
    b = bk(b);
    if (!V[b] || !PAT[sit]) return false;
    if (!enabled) { stats.blocked++; return false; }
    if (!unlocked) { stats.blocked++; return false; }
    var t0 = now();
    if (!o.force && ((lastAt[b] && t0 - lastAt[b] < 0.3) || t0 - lastAny < 0.08)) { stats.throttled++; return false; }
    var c = ensure(); if (!c) return false;
    if (c.state === 'suspended' && c.resume) { try { c.resume(); } catch (e) {} }
    lastAt[b] = t0; lastAny = t0;
    var vi = o.v != null ? Math.max(0, Math.min(PAT[sit].length - 1, o.v)) : pickVar(b, sit);
    var bus = N(c, 'Gain'); bus.gain.value = o.gain != null ? o.gain : 1; bus.connect(master);
    var len = schedule(c, bus, b, sit, vi, c.currentTime + 0.01, !!o.exact);
    setTimeout(function () { try { bus.disconnect(); } catch (e) {} }, (len + 0.6) * 1000);
    stats.played++; stats.last = { bot: b, sit: sit, v: vi, name: nameOf(b, sit, vi), len: Math.round(len * 1000) / 1000 };
    listeners.forEach(function (fn) { try { fn(stats.last); } catch (e) {} });
    return true;
  }

  // 被戳：2.5 秒內連戳第 3、4 下換 grr1，第 5 下起換 grr2
  function poke(b) {
    b = bk(b); var t = now(), L = pokeLog[b] || [];
    L = L.filter(function (x) { return t - x < 2.5; }); L.push(t); pokeLog[b] = L;
    var n = L.length;
    return play(b, n >= 5 ? 'grr2' : n >= 3 ? 'grr1' : 'poke');
  }

  function setEnabled(on) {
    enabled = !!on;
    try { root.localStorage && root.localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (e) {}
    if (!enabled && ctx) {
      // 關掉：整個 AudioContext 關掉，之後不建任何節點；再打開時重建
      try { ctx.close(); } catch (e) {}
      ctx = null; master = null;
    }
    return enabled;
  }

  // 用 OfflineAudioContext 算出一段（錄 wav 用）。不受開關、節流影響，固定音高不加微擾。
  function render(b, sit, vi, sr) {
    b = bk(b); sr = sr || 44100;
    var OC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
    var pat = PAT[sit] && PAT[sit][vi];
    if (!OC || !V[b] || !pat) return Promise.reject(new Error('render：沒有 ' + b + ' ' + sit + ' ' + vi));
    var est = 0; pat.s.forEach(function (s) { est += Math.max(0.045, s.d * V[b].dk * floorK(pat, s, V[b])) + s.gap; });
    var len = Math.ceil((est + 0.5) * sr);
    var c = new OC(1, len, sr);
    var bus = c.createGain(); bus.gain.value = 0.9;  // 錄檔用較大音量
    var comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.12;
    bus.connect(comp); comp.connect(c.destination);
    schedule(c, bus, b, sit, vi, 0.005, true);
    return c.startRendering();
  }

  // 跟 bot_face 同步：包住 mount，表情一換就出聲（mount 當下的表情不出聲）
  var MOOD_SIT = { speaking: 'reply', logged: 'done', over: 'error', alert: 'error', sleepy: 'sleepy' };
  function attach(BF) {
    if (!BF || BF.__voice) return BF;
    var m0 = BF.mount;
    BF.mount = function (host, opts) {
      var api = m0.apply(BF, arguments);
      var b = bk((opts && (opts.voice || opts.preset)) || '');
      if (!V[b]) return api;
      var sm = api.setMood, pk = api.poke;
      api.setMood = function (m, o) {
        var prev = api.getMood();
        var r = sm.apply(api, arguments);
        if (m !== prev && MOOD_SIT[m] && !api.__mute) play(b, MOOD_SIT[m]);
        return r;
      };
      api.poke = function () { var r = pk.apply(api, arguments); if (!api.__mute) poke(b); return r; };
      api.voice = b;
      return api;
    };
    BF.__voice = true;
    return BF;
  }

  // 第一次手勢就解鎖（瀏覽器規定）；之後每次手勢都順便喚醒
  function onGesture() { unlock(); }
  if (root.addEventListener) {
    root.addEventListener('pointerdown', onGesture, true);
    root.addEventListener('keydown', onGesture, true);
    root.addEventListener('touchstart', onGesture, { capture: true, passive: true });
  }

  var BotVoice = {
    version: '1122-K',
    BOTS: Object.keys(V), NAMES: NAMES, SITS: SITS, CHAT: CHAT, SIT_NAME: SIT_NAME,
    // variants('reply')＝通用說明；variants('reply','mon')＝萌萌念起來的字
    variants: function (sit, b) {
      b = b ? bk(b) : '';
      return (PAT[sit] || []).map(function (p, i) { return LEX[b] ? nameOf(b, sit, i) : p.n; });
    },
    describe: function (sit, vi) { var p = PAT[sit] && PAT[sit][vi]; return p ? p.n : ''; },
    words: function (b) { var l = LEX[bk(b)]; return l ? [l.A.n, l.B.n, l.C.n] : []; },
    baseHz: function (b) { var v = V[bk(b)]; return v ? v.f : 0; },
    play: play, poke: poke, render: render, attach: attach, unlock: unlock,
    setEnabled: setEnabled,
    isEnabled: function () { return enabled; },
    isUnlocked: function () { return unlocked; },
    setVolume: function (x) { volume = Math.max(0, Math.min(1, +x || 0)); if (master) master.gain.value = volume; },
    onPlay: function (fn) { listeners.push(fn); },
    key: bk,
    _stats: stats,
    _ctx: function () { return ctx; }
  };
  root.BotVoice = BotVoice;
  if (root.BotFace) attach(root.BotFace);
  if (typeof module !== 'undefined' && module.exports) module.exports = BotVoice;
})(typeof window !== 'undefined' ? window : this);
