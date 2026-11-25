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

/* 2026-11-23 逐流自動更新（放在這支檔，避免跟主程式同時改版衝突）。
   老大一直看到舊版（畫面開著不重新整理就停在舊版），新功能都看不到。每 2 分鐘看一次線上版號：
   沒在打字、沒開卡片、沒在編修時直接重新載入；正在操作就在上方放一顆「有新版，點這裡更新」。 */
(function () {
  if (typeof window === 'undefined' || !/\/current\//.test(location.pathname) || /[?&]mock=/.test(location.search)) return;
  var cur = (function () { var l = document.querySelector('link[href*="app.css?v"]'); var m = l && l.getAttribute('href').match(/\?v(\d+)/); return m ? +m[1] : 0; })();
  if (!cur) return;
  function busy() {
    var a = document.activeElement, d = document.documentElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return true;
    if (d.classList.contains('marking')) return true;
    var ids = ['sheet', 'page', 'chat'];
    for (var i = 0; i < ids.length; i++) { var e = document.getElementById(ids[i]); if (e && !e.hidden && e.classList.contains('in')) return true; }
    return false;
  }
  function bar(v) {
    if (document.getElementById('updBar')) return;
    var b = document.createElement('button'); b.id = 'updBar'; b.type = 'button';
    b.textContent = '有新版（v' + v + '），點這裡更新';
    b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top) + 64px);z-index:96;min-height:44px;padding:0 18px;border-radius:22px;border:0;background:#f5b301;color:#1a1300;font:inherit;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,.35)';
    b.onclick = function () { location.reload(); };
    document.body.appendChild(b);
  }
  function check() {
    fetch('sw.js?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (t) {
      var m = t.match(/opp-shell-v(\d+)/); var v = m ? +m[1] : 0;
      if (v > cur) { if (busy()) bar(v); else location.reload(); }
    }).catch(function () {});
  }
  setTimeout(check, 15000); setInterval(check, 120000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
})();

/* 2026-11-24 要你做「交給大器處理／請霸霸設置」按了卡要離開要你做（逐流 msg 364）。
   老大：「我點了選項結果他還是在最上面要你做，並且也沒有進度」。原本只送訊息、卡片狀態沒動。
   改成：送出後同一張 hub job 改成 running、執行者寫大器或霸霸、進度寫一句，卡從「要你做」移到「正在跑」。 */
(function () {
  if (typeof window === 'undefined') return;
  var tries = 0;
  (function hook() {
    var Z = window.__zl;
    if (!Z || !Z.ACT || !Z.ACT.ydhand || !Z.LV) { if (++tries < 200) setTimeout(hook, 100); return; }
    if (Z.ACT.ydhand.__run) return;
    var orig = Z.ACT.ydhand;
    var wrapped = async function (v) {
      var parts = String(v || '').split('|'), who = parts[0], id = parts.slice(1).join('|');
      var jobs = (Z.LV.hub && Z.LV.hub.jobs) || [], j = jobs.find(function (x) { return x.id === id; });
      await orig.apply(this, arguments);
      if (!j || !Z.LV.api || !Z.LV.api.jobSet) return;
      var name = who === 'baba' ? '霸霸（經大器轉）' : '大器';
      try {
        await Z.LV.api.jobSet({ id: id, title: j.title || j.ask || '要你做', agent: name, status: 'running',
          note: '進度：老大交給' + (who === 'baba' ? '霸霸' : '大器') + '處理，' + new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' 送出，等回報', ask: (who === 'baba' ? '霸霸在做：' : '大器在做：') + (j.ask || j.title || '').replace(/^(大器|霸霸)在做：/, '') });
        j.status = 'running'; j.agent = name;
        if (Z.paint) Z.paint('keep'); else if (Z.render) Z.render('keep');
      } catch (e) { /* 訊息已送出，狀態沒改到就留著，下次同步會再對 */ }
    };
    wrapped.__run = 1; Z.ACT.ydhand = wrapped;
  })();
})();

/* 2026-11-24 chip 長字不出版面（逐流 msg 403、428，老大：「這邊都傳出去版面了」）。放這支檔避開派工正在改 app.css。 */
(function () {
  if (typeof document === 'undefined') return;
  var s = document.createElement('style');
  s.textContent = '.chip{max-width:100%;white-space:normal;overflow-wrap:anywhere;word-break:break-word;height:auto;line-height:1.35;text-align:left}' +
    '#sheet .chip,#page .chip{display:inline-block;padding-top:3px;padding-bottom:3px}' +
    '#sheet,#page{overflow-x:hidden}' +
    '.card .amt,.cardx .amt{white-space:normal;overflow-wrap:anywhere;word-break:break-word}';   // 逐流 msg 458：機會卡金額長字（「按影片類型…計酬」）橫向撐破卡片
  (document.head || document.documentElement).appendChild(s);
})();

/* 2026-11-24 對話框打開時輸入框留空（逐流 msg 264、449）。老大：「這邊一點開就一大堆預設文字準備送出去，我覺得有點太誇張了，我很不好打字」。
   程式幫忙起頭的那句不放進輸入框，改成輸入框上方一顆「建議：…」小條，點了才放進去。老大自己打的字不動。 */
(function () {
  if (typeof document === 'undefined') return;
  var typed = false, lastOpen = false, sug = '';
  document.addEventListener('input', function (e) { if (e.target && e.target.id === 'cText' && e.isTrusted) typed = true; }, true);
  document.addEventListener('keydown', function (e) { if (e.target && e.target.id === 'cText') typed = true; }, true);
  function chip(text) {
    var cin = document.querySelector('#chat .cin'); if (!cin) return;
    var old = document.getElementById('cSug'); if (old) old.remove();
    var b = document.createElement('button'); b.type = 'button'; b.id = 'cSug';
    b.style.cssText = 'display:block;width:100%;text-align:left;margin:0 0 6px;padding:8px 12px;min-height:40px;border-radius:12px;border:1px dashed var(--line2,rgba(255,255,255,.3));background:transparent;color:var(--ink2,#aaa);font:inherit;font-size:13px;line-height:1.4;overflow-wrap:anywhere';
    b.textContent = '建議這樣問（點了才放進去）：' + (text.length > 80 ? text.slice(0, 80) + '…' : text);
    b.onclick = function () { typed = true; sug = ''; var t = document.getElementById('cText'); if (t) { t.value = text; t.focus(); try { t.setSelectionRange(t.value.length, t.value.length); } catch (e) {} } b.remove(); };
    cin.parentNode.insertBefore(b, cin);
  }
  function tick() {
    var c = document.getElementById('chat'), open = !!(c && !c.hidden && c.classList.contains('in'));
    if (open && !lastOpen) { typed = false; sug = ''; }
    if (open && !typed && !(window.__actAt && Date.now() - window.__actAt < 4000)) {
      var t = document.getElementById('cText');
      if (t && t.value.trim()) { sug = t.value; t.value = ''; chip(sug); }
      else if (sug && !document.getElementById('cSug')) chip(sug);
    }
    if (!open) { var s = document.getElementById('cSug'); if (s) s.remove(); sug = ''; }
    lastOpen = open;
  }
  setInterval(tick, 150);
})();

/* 2026-11-24 動作鈕（萌萌先找、請比價、請朋朋買／安排／分類…）不再把一大段指示塞進輸入框（逐流 msg 454，老大：「我真的很不喜歡一點開，就預設很多文字」）。
   按這類鈕＝老大要它去做，直接送出；給機器人的格式指示藏在對話不顯示的標頭裡，畫面只顯示一句「請幫我處理「品名」」。 */
(function () {
  if (typeof document === 'undefined') return;
  var CHAT_ONLY = { ai: 1, havtalk: 1, talk: 1, chatsend: 1, chatclose: 1, chatq: 1, chatinfo: 1, chathead: 1 };
  var lastAct = 0;
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest && e.target.closest('[data-act]');
    if (el && e.isTrusted && !CHAT_ONLY[el.dataset.act] && !el.closest('#chat')) { lastAct = Date.now(); window.__actAt = lastAct; }
  }, true);
  var busy = false;
  setInterval(function () {
    if (!lastAct && window.__actAt) lastAct = window.__actAt;
    if (document.getElementById('cBaba')) { lastAct = 0; window.__actAt = 0; return; }   // 正在等老大講完再派（msg 651），老大打的字不要自動送
    if (busy || !lastAct || Date.now() - lastAct > 4000) return;
    var Z = window.__zl, t = document.getElementById('cText');
    if (!Z || !Z.S || !Z.S.chat || !t || !t.value.trim() || !Z.LV || !Z.LV.api || !Z.LV.api.say) return;
    busy = true; lastAct = 0; window.__actAt = 0;
    var text = t.value, b = Z.S.chat.b, ctx = Z.S.chat.ctx || '';
    t.value = ''; var s = document.getElementById('cSug'); if (s) s.remove();
    var name = (text.match(/「([^」]{1,40})」/) || [])[1] || '';
    var verb = b === 'mon' ? '請幫我找' : b === 'kim' ? '請幫我看' : '請幫我處理';
    var tag = (text.match(/^【([^】]{1,12})】/) || [])[1];
    var shown = tag ? tag + (name ? '「' + name + '」' : '') : (name ? verb + '「' + name + '」' : verb + '這件');
    var hidden = text.replace(/[［］]/g, function (c) { return c === '［' ? '（' : '）'; }).replace(/\n/g, ' ');
    var body = '［老大在逐流按了動作鈕，給你的指示：' + hidden + '］\n' + shown;
    Z.LV.api.say(null, body, b).then(function () {
      if (Z.ACT && Z.ACT.ai) setTimeout(function () { Z.ACT.ai(b + '|' + ctx); }, 300);
    }).catch(function () { t.value = text; }).then(function () { busy = false; });
  }, 120);
})();

/* 2026-11-24 機器人回覆有排版、網址改成短連結（逐流 msg 472、476）。
   老大：「最好他們的回覆也是有排版有格式，然後不是一大串的這樣工程文字的東西我很難辨識」「我不需要完整連結，我要的是一個超連結，這樣才不會版面一堆奇怪的文字」。
   只動畫面：對話框裡機器人的回覆照行分段、清單變條列、**粗體**、網址變「網站名 ↗」短連結；卡片與彈出卡裡露出來的長網址也換成短連結。用 DOM 組，不把原文當 HTML。 */
(function () {
  if (typeof document === 'undefined') return;
  var URL_RE = /https?:\/\/[^\s「」『』（）()<>，。、]+/g;
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return '連結'; } }
  function link(u) { var a = document.createElement('a'); a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = host(u) + ' ↗'; a.className = 'zlink'; return a; }
  function inline(parent, text) {
    var parts = text.split(/(\*\*[^*]+\*\*)/);
    parts.forEach(function (p) {
      if (/^\*\*[^*]+\*\*$/.test(p)) { var b = document.createElement('b'); b.textContent = p.slice(2, -2); parent.appendChild(b); return; }
      var last = 0; p.replace(URL_RE, function (m, i) { if (i > last) parent.appendChild(document.createTextNode(p.slice(last, i))); parent.appendChild(link(m)); last = i + m.length; return m; });
      if (last < p.length) parent.appendChild(document.createTextNode(p.slice(last)));
    });
  }
  function fmtBubble(el) {
    if (el.dataset.fmt || el.classList.contains('card') || el.querySelector('.dots')) return;
    var raw = el.textContent; if (!raw || raw.length < 2) return;
    el.dataset.fmt = '1'; el.textContent = '';
    var lines = raw.split(/\n/), list = null;
    lines.forEach(function (ln) {
      var t = ln.trim(); if (!t) { list = null; return; }
      var m = t.match(/^(?:[-•・*]|\d+[.、)）])\s*(.+)$/);
      if (m) { if (!list) { list = document.createElement(/^\d/.test(t) ? 'ol' : 'ul'); list.className = 'zlist'; el.appendChild(list); } var li = document.createElement('li'); inline(li, m[1]); list.appendChild(li); return; }
      list = null; var p = document.createElement('p'); p.className = /[：:]$/.test(t) && t.length < 24 ? 'zh' : 'zp'; inline(p, t); el.appendChild(p);
    });
  }
  function linkify(root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function (n) {
      if (!n.nodeValue || n.nodeValue.indexOf('http') < 0) return NodeFilter.FILTER_REJECT;
      var p = n.parentElement; if (!p || p.closest('a,button,textarea,input,script,style,#clog,.zlink')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT; } });
    var nodes = [], n; while ((n = w.nextNode())) nodes.push(n);
    nodes.forEach(function (tn) {
      var s = tn.nodeValue; if (!URL_RE.test(s)) return; URL_RE.lastIndex = 0;
      var f = document.createDocumentFragment(), last = 0;
      s.replace(URL_RE, function (m, i) { if (i > last) f.appendChild(document.createTextNode(s.slice(last, i))); f.appendChild(link(m)); last = i + m.length; return m; });
      if (last < s.length) f.appendChild(document.createTextNode(s.slice(last)));
      tn.parentNode.replaceChild(f, tn);
    });
  }
  var st = document.createElement('style');
  st.textContent = '.zlink{color:inherit;text-decoration:underline;text-underline-offset:2px;opacity:.9;word-break:keep-all}' +
    '#clog .cm.bot .zp{margin:0 0 6px;line-height:1.55}#clog .cm.bot .zh{margin:8px 0 4px;font-weight:700}' +
    '#clog .cm.bot .zlist{margin:2px 0 8px;padding-left:20px;line-height:1.55}#clog .cm.bot .zlist li{margin:2px 0}';
  (document.head || document.documentElement).appendChild(st);
  function run() {
    document.querySelectorAll('#clog .cm.bot').forEach(fmtBubble);
    ['view', 'sheet', 'page'].forEach(function (id) { var e = document.getElementById(id); if (e) linkify(e); });
  }
  var t = 0; new MutationObserver(function () { clearTimeout(t); t = setTimeout(run, 60); }).observe(document.documentElement, { childList: true, subtree: true });
})();

/* 2026-11-24 行事曆「個人 ?」的問號拿掉（逐流 msg 481，老大：「為什麼個人帳戶會有一個問號」）。
   問號是「還沒分類」的代碼，不該露出來；有分類的改顯示中文（出班、剪接、企劃行政、創作、生活）。 */
(function () {
  if (typeof document === 'undefined') return;
  var CATN = { S: '出班', E: '剪接', W: '企劃行政', C: '創作', L: '生活' };
  function fix() {
    document.querySelectorAll('.src').forEach(function (s) {
      if (s.dataset.fx) return; var tn = null;
      s.childNodes.forEach(function (n) { if (n.nodeType === 3 && /個人/.test(n.nodeValue)) tn = n; });
      if (!tn) return; s.dataset.fx = '1';
      var m = tn.nodeValue.match(/個人\s*(\S*)/); var c = m && m[1];
      tn.nodeValue = '個人' + (c && CATN[c] ? '・' + CATN[c] : '');
    });
  }
  var t = 0; new MutationObserver(function () { clearTimeout(t); t = setTimeout(fix, 80); }).observe(document.documentElement, { childList: true, subtree: true });
})();

/* 2026-11-24 生活房間「要買」：拿掉「請朋朋買」那行字，按朋朋的臉就是請朋朋買（逐流 msg 445、487、490，老大：「為什麼要做這個？ 感覺請朋朋買 按臉就好」）。 */
(function () {
  if (typeof document === 'undefined') return;
  var st = document.createElement('style'); st.textContent = 'button[data-act="cartbuy"].more{display:none!important}';
  (document.head || document.documentElement).appendChild(st);
  document.addEventListener('click', function (e) {
    var f = e.target && e.target.closest && e.target.closest('[data-act="ai"][data-id^="peng|sup:cart"]');
    if (!f || document.documentElement.classList.contains('marking')) return;
    var Z = window.__zl; if (!Z || !Z.ACT || !Z.ACT.cartbuy) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    window.__actAt = Date.now(); Z.ACT.cartbuy();
  }, true);
})();

/* 2026-11-24 任務已交給大器時，「這件接下來」也要有霸霸的臉可以改交霸霸（逐流 msg 497，老大：「為什麼我這邊沒有可以拍給霸霸做的小臉」）。 */
(function () {
  if (typeof document === 'undefined') return;
  function add() {
    var Z = window.__zl; if (!Z || !Z.S || !/^cview:todo:/.test(Z.S.sheet || '')) return;
    var on = document.querySelector('#sheet .jnext .jgrp-on'); if (!on || on.parentNode.querySelector('.babaf')) return;
    if (/霸霸/.test(on.textContent)) return;
    var id = Z.S.sheet.slice('cview:todo:'.length);
    var b = document.createElement('button'); b.type = 'button'; b.className = 'mb babaf';
    // 不用 .bm.bf[data-b]：那組 class 會被 app.js faceSync 再掛一次臉，變兩顆疊在一起（msg 572「破圖跑版」）
    var f = document.createElement('span'); f.className = 'bbf'; f.setAttribute('aria-hidden', 'true');
    f.style.cssText = 'width:24px;height:24px;display:inline-block;vertical-align:middle;margin-right:6px;pointer-events:none';
    b.appendChild(f); b.appendChild(document.createTextNode('改交給霸霸'));
    b.onclick = async function (ev) {
      ev.stopPropagation(); var L = Z.LV, t = (Z.DB.todo || []).find(function (q) { return q.id === id; }), c = t && t.raw; if (!c || !L.api) return;
      var body = '【請霸霸轉派】' + String(c.title || '這件').slice(0, 80) + '\n卡片：item ' + id + '\n老大改成交給霸霸（原本已交給大器，請先停掉大器那邊）。請用 call-baba.sh 交給霸霸判斷給哪隻機器人或自己做，做完把結果寫回這張卡；要花錢、對外發布的先問老大。';
      b.disabled = true;
      try { await L.api.say(id, body, 'daqi'); await L.api.act(id, 'runset', { status: 'running', note: '【霸霸】轉派中，等霸霸回報' }); b.textContent = '已改交給霸霸'; if (Z.paint) Z.paint('keep'); }
      catch (e) { b.disabled = false; b.textContent = '沒送出，再按一次'; }
    };
    on.parentNode.appendChild(b);
    try { if (window.BotFace) window.BotFace.mount(f, { preset: 'baba', color: '#FFFFFF', size: 0 }); } catch (e) {}
  }
  var t = 0; new MutationObserver(function () { clearTimeout(t); t = setTimeout(add, 90); }).observe(document.documentElement, { childList: true, subtree: true });
})();

/* 2026-11-24 定定只留在目標頁；案子與任務的執行入口只留大器臉＋霸霸臉（逐流 msg 501）。
   老大：「不好意思，讓定定待在目標頁 執行鈕留霸霸跟大器臉」「對啊，怎麼會只有給大器做 當然也要有霸霸」。 */
(function () {
  if (typeof document === 'undefined') return;
  var st = document.createElement('style');
  st.textContent = 'html[data-tab="proj"] [data-act="pjplan"][data-id="din"],[data-act="stplan"][data-id^="din|"],' +
    '.cf-r [data-act="ai"][data-id^="din|proj:"],.cf-r [data-act="ai"][data-id^="din|todo"],' +
    '#sheet .jnext [data-id^="din|"],#sheet [data-act="ai"][data-id^="din|proj:"],#page [data-act="ai"][data-id^="din|proj:"]{display:none!important}' +
    
    '.babaf .bbf{width:22px;height:22px;display:inline-block;vertical-align:middle;margin-right:6px;pointer-events:none}';
  (document.head || document.documentElement).appendChild(st);
  function face(btn) {
    // 不用 .bm.bf[data-b]：那組 class 會被 app.js faceSync 再掛一次臉，變兩顆疊在一起（msg 572「破圖跑版」）
    var f = document.createElement('span'); f.className = 'bbf'; f.setAttribute('aria-hidden', 'true');
    btn.appendChild(f); try { if (window.BotFace) window.BotFace.mount(f, { preset: 'baba', color: '#FFFFFF', size: 0 }); } catch (e) {}
  }
  function add() {
    var Z = window.__zl; if (!Z || !Z.DB || !Z.DB.todo) return;
    document.querySelectorAll('#view article.cardx[data-card]').forEach(function (a) {
      var id = a.dataset.card;
      var isTodo = Z.DB.todo.some(function (t) { return t.id === id; });
      // 案子卡（個人與公司）也要霸霸臉（msg 575，接 501 定案：執行入口都要有大器臉＋霸霸臉）；點了打開跟霸霸的對話，帶這張案子
      var isProj = !isTodo && (Z.DB.proj || []).some(function (q) { return q.id === id; });
      if (!isTodo && !isProj) return;
      var r = a.querySelector('.cf-r'); if (!r || r.querySelector('.babacf')) return;
      // msg 588（老大：「機器人的位置原本的比較好…霸霸的臉太大了那個尺寸跟大家不搭而且他質感不是很好」）：
      // 改用跟大器臉同一套 .aif＋.bm.bf[data-b]（由 app.js faceSync 掛臉，尺寸質感一致），放在大器臉旁邊、⋯ 前面
      var b = document.createElement('button'); b.type = 'button'; b.className = 'aif babacf';
      if (isTodo) { b.dataset.act = 'babaask'; b.dataset.k = 'todo'; b.dataset.id = id; b.setAttribute('aria-label', '跟大器說要交給霸霸'); }
      else { b.dataset.act = 'babaask'; b.dataset.k = 'proj'; b.dataset.id = id; b.setAttribute('aria-label', '跟大器說要交給霸霸推進這個案子'); }
      var f = document.createElement('span'); f.className = 'bm bf'; f.dataset.b = 'baba'; f.setAttribute('aria-hidden', 'true'); b.appendChild(f);
      var dq = r.querySelector('[data-act="ai"][data-id^="daqi|"]'), mine = r.querySelector('.mine');
      if (dq && dq.parentNode === r) dq.after(b); else if (mine && mine.parentNode === r) r.insertBefore(b, mine); else r.appendChild(b);
    });
  }
  var t = 0; new MutationObserver(function () { clearTimeout(t); t = setTimeout(add, 90); }).observe(document.documentElement, { childList: true, subtree: true });
})();

/* 2026-11-24 生活待辦：點這一列就地看朋朋排的時段，不開對話、不跳編輯（逐流 msg 463、546，老大：「然後要顯示在這裡我可以直接點開看選卡片不是連到他的對話啊」）。
   有朋朋安排區塊（.lt2）的列，點標題＝展開／收起那一區並捲到眼前；要改內容用列上的「編輯」。 */
(function () {
  if (typeof document === 'undefined') return;
  var st = document.createElement('style');
  st.textContent = '.rowi.ltopen .lt2{outline:2px solid var(--c-peng,#00b351);outline-offset:4px;border-radius:12px}' +
    '.rowi.ltshut .lt2{display:none}';
  (document.head || document.documentElement).appendChild(st);
  document.addEventListener('click', function (e) {
    if (document.documentElement.classList.contains('marking')) return;
    var b = e.target && e.target.closest && e.target.closest('[data-act="sheet"][data-id^="ltodo:"],[data-act="ltchat"]');
    if (!b) return;
    var row = b.closest('.rowi'); if (!row) return;
    var box = row.querySelector('.lt2');
    if (!box) return;            // 還沒請朋朋排的，照原本打開編輯
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (b.dataset.act === 'ltchat') {   // 「看朋朋回什麼」：就地展開朋朋原話，不開對話
      var r = box.querySelector('.lt2-r,.lt2-h span'); if (r) { r.style.webkitLineClamp = 'unset'; r.style.whiteSpace = 'normal'; }
      row.classList.add('ltopen'); row.classList.remove('ltshut'); box.scrollIntoView({ behavior: 'smooth', block: 'center' }); return;
    }
    var open = row.classList.toggle('ltopen'); row.classList.toggle('ltshut', !open);
    if (open) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, true);
})();

/* 2026-11-24 想買詳情價格拆開（逐流 msg 548，接 466／479）：「NT$27,500（官網價…；…）」改成大字 NT$27,500，括號裡每一段變一行小字。 */
(function () {
  if (typeof document === 'undefined') return;
  var st = document.createElement('style');
  st.textContent = '.wd2-sub{display:block;margin-top:4px;font-size:13px;font-weight:400;line-height:1.45;color:var(--ink2,#aaa)}.wd2-sub span{display:block}';
  (document.head || document.documentElement).appendChild(st);
  function split(el) {
    if (el.dataset.sp) return; var t = el.textContent || ''; var m = t.match(/^\s*(NT\$\s?[\d,]+(?:\.\d+)?)\s*[（(](.+)[）)]\s*$/);
    if (!m) return; el.dataset.sp = '1';
    var parts = m[2].split(/[；;，]\s*|,(?!\d{3})\s*/).filter(function (x) { return x.trim(); });
    el.textContent = m[1];
    var sub = document.createElement('small'); sub.className = 'wd2-sub';
    parts.forEach(function (p) { var s = document.createElement('span'); s.textContent = p.trim(); sub.appendChild(s); });
    el.appendChild(sub);
  }
  var t = 0; new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () {
    // 2026-11-24 v98：想買詳情（wdet:）改成比較卡（app.js「v98」段，價格用 .wc-p／.wc-ps 自己拆），.wd2-p、.wd2-c 在 wdet 已不出現；這裡只處理舊結構與卡片上的 .amt，不要把 .wc-p 加進來。
    document.querySelectorAll('#sheet .wd2-p, #sheet .wd2-c b, #sheet .wdh .amt, #view .cardx .amt').forEach(split);
  }, 80); }).observe(document.documentElement, { childList: true, subtree: true });
})();

// 2026-11-24 監工：全面板去重複（逐流 msg 445／487／490／497／501／560／562，老大：「這邊感覺有很多按鈕重複了」）。
// 規則：同一張卡或同一個彈出頁裡，①有某隻的臉（.hav），就藏掉只是「打開跟牠聊天」的文字鈕；②同一個動作（data-act＋data-id 相同）只留第一個。
// 交出去、做完、步驟鈕這類真的會改狀態的不動。退回：刪掉這一段。
(function () {
  var CHATONLY = { ai: 1, ydq: 1 };
  function scopeOf(el) { return el.closest('.card, .cardx, .rowi, .sheet-b, #sheet, #page') || document.body; }
  function run() {
    document.querySelectorAll('[data-zldup]').forEach(function (e) { e.style.display = ''; e.removeAttribute('data-zldup'); });
    var scopes = new Set();
    document.querySelectorAll('#view [data-act], #sheet [data-act], #page [data-act]').forEach(function (b) { scopes.add(scopeOf(b)); });
    scopes.forEach(function (sc) {
      var faces = {};
      sc.querySelectorAll('.hav[data-act="havtalk"], [data-act="havtalk"]').forEach(function (f) { var id = f.dataset.id || ''; faces[id.split('|')[0]] = id; });
      var seen = {};
      sc.querySelectorAll('[data-act]').forEach(function (b) {
        if (b.offsetParent === null || b.classList.contains('hav')) return;
        // 臉本身（沒字、或只有狀態小字）不藏
        if (b.querySelector('svg, canvas, .bf, [class*="face"]') && b.textContent.trim().length < 4) return;
        var a = b.dataset.act, id = b.dataset.id || '', hide = false;
        if (CHATONLY[a] && !/規劃/.test(b.textContent)) {   // 規劃鈕（跟大器規劃）不算單純聊天，留著（msg 626）
          // ai：id 結尾是「||」才是單純開聊天；ydq＝問大器
          var who = a === 'ydq' ? 'daqi' : id.split('|')[0];
          if (faces[who] && (a === 'ydq' || /\|\|$/.test(id))) hide = true;
        }
        if (a === 'ydhand' && /^baba\|/.test(id) && sc.querySelector('.babacf, .babaf')) hide = true;
        if (!hide && (a === 'sheet' || a === 'page' || a === 'ai' || a === 'open' || a === 'pcsay')) {
          // msg 694：只藏「同動作、同字」的重複（例：兩顆「編輯每一步」）；標題連結與「深入了解」「看細節」這種明確的鈕不算重複，留著
          var key = a + '=' + id + '=' + b.textContent.replace(/\s+/g, '');
          if (seen[key] && b !== seen[key] && !seen[key].contains(b) && !b.contains(seen[key])) hide = true; else seen[key] = b;
        }
        if (hide) { b.style.display = 'none'; b.setAttribute('data-zldup', '1'); }
      });
    });
  }
  var t = 0; new MutationObserver(function (m) {
    if (m.every(function (x) { return x.type === 'attributes'; })) return;
    clearTimeout(t); t = setTimeout(run, 100);
  }).observe(document.documentElement, { childList: true, subtree: true });
})();


/* 2026-11-24 霸霸沒有自己的對話窗，臉按下去是「交給霸霸」：經大器送【請霸霸轉派】，由大器用 call-baba.sh 叫霸霸。
   ①案子卡霸霸臉（msg 575）：霸霸推進這個案子。②任務房「請霸霸規劃」（msg 578，老大：「請霸霸規劃 就會是他打過去叫定定思考 霸霸想辦法推進」）：
   先把輸入框的事加成任務，再請霸霸叫定定規劃、霸霸推進；定定本人不在案子房間出現（msg 501）。退回：刪掉這一段（案子卡霸霸臉會變成沒反應）。 */
(function () {
  if (typeof document === 'undefined') return;
  function Z() { return window.__zl; }
  function toast(t) { var e = document.getElementById('toast'), m = document.getElementById('toastMsg'), u = document.getElementById('toastUndo'); if (!e || !m) return; m.textContent = t; if (u) u.hidden = true; e.classList.add('in'); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove('in'); }, 3200); }
  async function send(id, body) {
    var L = Z().LV; if (!L || !L.api || !L.api.say) { toast('離線中，連上再按'); return false; }
    try { await L.api.say(id, body, 'daqi'); } catch (e) { toast('沒送出，再按一次'); return false; }
    try { if (L.api.act) await L.api.act(id, 'runset', { status: 'running', note: '【霸霸】接手推進中，等霸霸回報' }); } catch (e) {}
    return true;
  }
  document.addEventListener('click', async function (e) {
    var b = e.target.closest && e.target.closest('[data-act="projbaba"]');
    if (!b || document.documentElement.classList.contains('marking')) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    var id = b.dataset.id, p = (Z().DB.proj || []).find(function (q) { return q.id === id; }) || {};
    var name = String(p.name || p.title || '這個案子').slice(0, 80);
    var body = '［老大在逐流按了案子卡上的霸霸臉，給你的指示：用 call-baba.sh 把這個案子交給霸霸推進。霸霸可以叫定定一起想下一步，判斷交給哪隻機器人或自己做，進度寫回這張案子卡；要花錢、對外發布的先問老大。］\n【請霸霸推進】「' + name + '」';
    b.disabled = true; window.__actAt = Date.now();
    if (await send(id, body)) { toast('交給霸霸推進了，進度會寫回這張卡'); if (Z().paint) Z().paint('keep'); }
    b.disabled = false;
  }, true);
  // 任務房：「請大器規劃」旁加「請霸霸規劃」
  function addPlan() {
    document.querySelectorAll('.mrow.pjplan').forEach(function (r) {
      if (r.querySelector('[data-act="pjbaba"]')) return;
      var d = r.querySelector('[data-act="pjplan"][data-id="daqi"]'); if (!d) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = d.className; b.dataset.act = 'pjbaba';
      var f = document.createElement('span'); f.className = 'bbf'; f.setAttribute('aria-hidden', 'true');
      f.style.cssText = 'width:22px;height:22px;display:inline-block;vertical-align:middle;margin-right:6px;pointer-events:none';
      b.appendChild(f); b.appendChild(document.createTextNode('請霸霸規劃'));
      r.appendChild(b);
      try { if (window.BotFace) window.BotFace.mount(f, { preset: 'baba', color: '#FFFFFF', size: 0 }); } catch (e) {}
    });
  }
  document.addEventListener('click', async function (e) {
    var b = e.target.closest && e.target.closest('[data-act="pjbaba"]');
    if (!b || document.documentElement.classList.contains('marking')) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    var t = document.getElementById('pjIn'), v = t ? t.value.trim() : '';
    if (!v) { if (t) t.focus(); toast('先在上面寫要做的事'); return; }
    var L = Z().LV; if (!L || !L.api || !L.api.todoAdd) { toast('離線中，等連上再加'); return; }
    b.disabled = true;
    try {
      var c = await L.api.todoAdd(v.slice(0, 200)); if (t) t.value = '';
      if (c && c.id) {
        var body = '［老大在逐流按了「請霸霸規劃」，給你的指示：用 call-baba.sh 交給霸霸。霸霸去叫定定思考、把這件拆成步驟寫回這張卡，然後霸霸負責推進（交給適合的機器人或自己做）；要花錢、對外發布的先問老大。］\n【請霸霸規劃】「' + v.slice(0, 120) + '」';
        if (Z().paint) Z().paint('keep');
        // msg 651：先開這張新任務的對話，老大講完按「就這樣請霸霸規劃」才送
        if (window.__zlAsk) window.__zlAsk({ id: c.id, who: '霸霸', label: '就這樣請霸霸規劃', go: async function (said) { if (await send(c.id, body + (said ? '\n老大交代：' + said : ''))) toast('交給霸霸規劃了，步驟會寫回這張卡'); else throw new Error('x'); } });
      } else toast('加進任務了，打開卡片再交給霸霸');
      if (Z().paint) Z().paint('keep');
    } catch (err) { toast('沒存上，再按一次'); }
    b.disabled = false;
  }, true);
  var tm = 0; new MutationObserver(function () { clearTimeout(tm); tm = setTimeout(addPlan, 90); }).observe(document.documentElement, { childList: true, subtree: true });
})();

/* 2026-11-24 生活例行：都分好了就不顯示「都分好類了／請朋朋重新分」那行（逐流 msg 588，老大：「這行字還有請皮皮重新分都很多餘」）。退回：刪掉這一段。 */
(function () {
  if (typeof document === 'undefined') return;
  function run() { document.querySelectorAll('.rcbar').forEach(function (r) { if (/^都分好類了/.test(r.textContent.trim())) r.style.display = 'none'; }); }
  var t = 0; new MutationObserver(function () { clearTimeout(t); t = setTimeout(run, 60); }).observe(document.documentElement, { childList: true, subtree: true });
})();

/* 2026-11-24 案子詳情頁：「叫大器處理」的大器臉旁補霸霸臉（逐流 msg 618、575：執行入口都要大器臉＋霸霸臉；停止後要能再派）。點霸霸臉＝projbaba（同案子卡）。退回：刪掉這一段。 */
(function () {
  if (typeof document === 'undefined') return;
  function add() {
    var Z = window.__zl; if (!Z || !Z.S || !/^proj:/.test(Z.S.page || '')) return;
    var id = Z.S.page.slice(5);
    document.querySelectorAll('#page .aif[data-act="ai"][data-id^="daqi|proj:"]').forEach(function (d) {
      if (d.nextElementSibling && d.nextElementSibling.classList.contains('babacf')) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'aif babacf'; b.dataset.act = 'babaask'; b.dataset.k = 'proj'; b.dataset.id = id; b.setAttribute('aria-label', '跟大器說要交給霸霸推進這個案子');
      var f = document.createElement('span'); f.className = 'bm bf'; f.dataset.b = 'baba'; f.setAttribute('aria-hidden', 'true'); b.appendChild(f);
      d.after(b);
    });
  }
  var t = 0; new MutationObserver(function () { clearTimeout(t); t = setTimeout(add, 90); }).observe(document.documentElement, { childList: true, subtree: true });
})();

/* 2026-11-24 全面板規劃入口一律「請大器規劃」＋「請霸霸規劃」（逐流 msg 626，接 578 定案；老大：「請霸霸規劃 就會是他打過去叫定定思考 霸霸想辦法推進」）。
   定定的規劃鈕在案子房間已藏（msg 501）；這裡在每個有定定規劃鈕的列（步驟卡 stplanr、任務詳情規劃列、這件接下來「先想清楚」）補一顆霸霸，
   點了＝經大器送【請霸霸規劃】：霸霸叫定定想、把步驟寫回這張卡，霸霸推進。任務房新增列（pjplan）另有 pjbaba。退回：刪掉這一段。 */
(function () {
  if (typeof document === 'undefined') return;
  function idOf(b) {
    var a = b.dataset.act, v = b.dataset.id || '';
    if (a === 'stplan') return v.split('|')[1] || '';
    if (a === 'ai') { var m = v.match(/^din\|proj:([^|]+)/); return m ? m[1] : ''; }
    return '';
  }
  function add() {
    document.querySelectorAll('[data-act="stplan"][data-id^="din|"], .mrow [data-act="ai"][data-id^="din|proj:"], .jgrp-b [data-act="ai"][data-id^="din|proj:"]').forEach(function (d) {
      var row = d.parentNode; if (!row || row.querySelector('[data-act="bbplan"]')) return;
      var id = idOf(d); if (!id) return;
      var dq = row.querySelector('[data-act="' + d.dataset.act + '"][data-id^="daqi|"]');
      var b = document.createElement('button'); b.type = 'button'; b.className = (dq || d).className; b.dataset.act = 'bbplan'; b.dataset.id = id;
      var f = document.createElement('span'); f.className = 'bm bf'; f.dataset.b = 'baba'; f.setAttribute('aria-hidden', 'true'); b.appendChild(f);
      b.appendChild(document.createTextNode(d.dataset.act === 'stplan' ? '請霸霸規劃步驟' : '請霸霸規劃'));
      if (dq) dq.after(b); else row.appendChild(b);
    });
  }
  function toast(t) { var e = document.getElementById('toast'), m = document.getElementById('toastMsg'), u = document.getElementById('toastUndo'); if (!e || !m) return; m.textContent = t; if (u) u.hidden = true; e.classList.add('in'); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove('in'); }, 3200); }
  document.addEventListener('click', async function (e) {
    var b = e.target.closest && e.target.closest('[data-act="bbplan"]');
    if (!b || document.documentElement.classList.contains('marking')) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    var Z = window.__zl, L = Z && Z.LV; if (!L || !L.api || !L.api.say) { toast('離線中，連上再按'); return; }
    var id = b.dataset.id, c = (L.items || []).find(function (q) { return q.id === id; }) || {};
    var name = String(c.title || '這件').slice(0, 100);
    var body = '［老大在逐流按了「請霸霸規劃」，給你的指示：用 call-baba.sh 交給霸霸。霸霸去叫定定思考、把這件拆成步驟寫回這張卡（opp_progress_set 的 steps），然後霸霸負責推進（交給適合的機器人或自己做）；要花錢、對外發布的先問老大。］\n【請霸霸規劃】「' + name + '」';
    // msg 651：先開這件的對話，老大講完按「就這樣請霸霸規劃」才送
    window.__actAt = 0;
    if (window.__zlAsk) window.__zlAsk({ id: id, who: '霸霸', label: '就這樣請霸霸規劃', go: async function (said) { await L.api.say(id, body + (said ? '\n老大交代：' + said : ''), 'daqi'); toast('交給霸霸規劃了，步驟會寫回這張卡'); } });
  }, true);
  var t = 0; new MutationObserver(function () { clearTimeout(t); t = setTimeout(add, 90); }).observe(document.documentElement, { childList: true, subtree: true });
})();


/* 2026-11-24 按霸霸臉先對話再派（逐流 msg 630，老大：「對沒錯，但是要先跟他講過再往下走，不要突然就衝走了」）。
   按卡上或詳情頁的霸霸臉：先打開這張卡跟大器的對話（輸入框留空，msg 454），輸入框上方一顆「就這樣交給霸霸」；
   老大可以先打字交代，按那顆才真的派（打了字就一起帶給霸霸）。不按就不派。退回：刪掉這一段，並把上面 babaask 改回 jtobaba／projbaba。 */
(function () {
  if (typeof document === 'undefined') return;
  var pend = null; // {k,id}
  function toast(t) { var e = document.getElementById('toast'), m = document.getElementById('toastMsg'), u = document.getElementById('toastUndo'); if (!e || !m) return; m.textContent = t; if (u) u.hidden = true; e.classList.add('in'); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove('in'); }, 3200); }
  function drop() { var o = document.getElementById('cBaba'); if (o && o.parentNode) o.parentNode.removeChild(o); }
  function chip() {
    var cin = document.querySelector('#chat .cin'); if (!cin || !pend) return;
    if (document.getElementById('cBaba')) return;
    var w = document.createElement('div'); w.id = 'cBaba';
    w.style.cssText = 'display:flex;align-items:center;gap:8px;margin:0 0 6px;flex-wrap:wrap';
    var b = document.createElement('button'); b.type = 'button'; b.className = 'btn pri sm';
    var f = document.createElement('span'); f.className = 'bm bf'; f.dataset.b = 'baba'; f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'width:22px;height:22px;display:inline-block;vertical-align:middle;margin-right:6px';
    if (pend.who !== '霸霸') f.dataset.b = 'daqi';
    b.appendChild(f); b.appendChild(document.createTextNode(pend.label || ('就這樣交給' + pend.who)));
    var n = document.createElement('span'); n.style.cssText = 'font-size:12px;color:var(--ink2,#aaa)'; n.textContent = '想先交代就在下面打字，再按這顆；不按不會派';
    w.appendChild(b); w.appendChild(n); cin.parentNode.insertBefore(w, cin);
    b.onclick = async function () {
      var Z = window.__zl, L = Z && Z.LV; if (!L || !L.api || !L.api.say || !pend) return;
      var t = document.getElementById('cText'), said = t ? t.value.trim() : '';
      if (pend.go) {
        b.disabled = true; var G = pend.go;
        try { await G(said); if (t && said) t.value = ''; drop(); pend = null; if (Z.paint) Z.paint('keep'); } catch (e) { b.disabled = false; toast('沒送出，再按一次'); }
        return;
      }
      if (pend.act && pend.act !== 'babaask') {
        // 交給大器做／交給霸霸（任務）／交給大器處理（卡住）：老大有打字就先送給大器，再照原本的鈕派出去
        b.disabled = true; var P = pend;
        try { if (said) { await L.api.say(P.id, '老大交代：' + said, 'daqi'); if (t) t.value = ''; } } catch (e) { b.disabled = false; toast('沒送出，再按一次'); return; }
        drop(); pend = null; window.__zlGo = 1;
        try { Z.ACT[P.act](P.arg); } finally { window.__zlGo = 0; }
        if (P.act === 'stplan') window.__actAt = Date.now();   // stplan 只把規劃請求放進輸入框，交給動作鈕直送那段送出
        return;
      }
      var c = (L.items || []).find(function (q) { return q.id === pend.id; }) || {};
      var name = String(c.title || '這件').slice(0, 100);
      var body = (pend.k === 'proj'
        ? '［老大在逐流跟大器講過後按了「就這樣交給霸霸」，給你的指示：用 call-baba.sh 把這個案子交給霸霸推進。霸霸可以叫定定一起想下一步，判斷交給哪隻機器人或自己做，進度寫回這張案子卡；要花錢、對外發布的先問老大。］\n【請霸霸推進】「' + name + '」'
        : '［老大在逐流跟大器講過後按了「就這樣交給霸霸」，給你的指示：用 call-baba.sh 交給霸霸：霸霸判斷交給哪隻機器人（或自己做），做完把結果寫回這張卡；要花錢、對外發布的先問老大。］\n【請霸霸轉派】「' + name + '」')
        + (said ? '\n老大交代：' + said : '');
      b.disabled = true; window.__actAt = 0;
      try {
        await L.api.say(pend.id, body, 'daqi'); if (t && said) t.value = '';
        try { if (L.api.act) await L.api.act(pend.id, 'runset', { status: 'running', note: '【霸霸】轉派中，等霸霸回報' }); } catch (e) {}
        toast('交給霸霸了，進度會寫回這張卡'); drop(); pend = null; if (Z.paint) Z.paint('keep');
      } catch (e) { b.disabled = false; toast('沒送出，再按一次'); }
    };
  }
  document.addEventListener('click', function (e) {
    if (window.__zlGo) return;   // 從「就這樣交給…」那顆呼叫原本動作時放行
    var b = e.target.closest && e.target.closest('[data-act="babaask"],[data-act="jtorun"],[data-act="jtobaba"],[data-act="blkhand"],[data-act="run"],[data-act="pstrun"],[data-act="stplan"],[data-act="pjplan"]');
    if (!b || b.closest('#chat') || document.documentElement.classList.contains('marking')) return;
    var Z = window.__zl; if (!Z || !Z.ACT || !Z.ACT.ai) return;
    if (b.dataset.act === 'pjplan') { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); pjplan(b); return; }
    var iid = b.dataset.act === 'stplan' ? String(b.dataset.id || '').split('|')[1] : String(b.dataset.id || '').split('|')[0];   // pstrun 的 id 是「卡片id|第幾步」；stplan 是「誰|卡片id」
    var it = (Z.LV.items || []).find(function (q) { return q.id === iid; });
    if (!it) return;   // 不是逐流卡片（例如示範資料以外的 id）就照原本
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (['queued', 'running'].indexOf(it.runStatus) > -1) { toast('這件已經交出去了，要改派先按停止'); return; }
    // msg 643：所有派工臉／派工鈕都先開這件的對話，老大講完按「就這樣交給…」才派
    var act = b.dataset.act;
    pend = { at: Date.now(), k: b.dataset.k || 'proj', id: iid, arg: b.dataset.id, act: act, who: (act === 'jtobaba' || act === 'babaask') ? '霸霸' : '大器' }; window.__actAt = 0;
    if (act === 'stplan') pend.label = '就這樣請大器規劃步驟';
    drop();
    var bid = iid; setTimeout(function () { Z.ACT.ai('daqi|proj:' + bid + '||'); }, 60);   // 等這次點擊處理完再開，不然會被點外面關掉
  }, true);
  window.__zlAsk = function (o) {
    var Z = window.__zl; if (!Z || !Z.ACT || !Z.ACT.ai || !o || !o.id) return;
    pend = { at: Date.now(), id: o.id, who: o.who || '大器', label: o.label, go: o.go }; window.__actAt = 0; drop();
    setTimeout(function () { Z.ACT.ai('daqi|proj:' + o.id + '||'); }, 60);
  };
  async function pjplan(b) {
    // 任務房「請大器規劃」：先把輸入框的事加成任務，開它的對話，老大講完按「就這樣請大器規劃」才送規劃請求
    var Z = window.__zl, L = Z && Z.LV, t = document.getElementById('pjIn'), v = t ? t.value.trim() : '';
    if (!v) { if (t) t.focus(); toast('先在上面寫要做的事'); return; }
    if (!L || !L.api || !L.api.todoAdd) { toast('離線中，等連上再加'); return; }
    var who = b.dataset.id === 'din' ? 'din' : 'daqi';
    try {
      var c = await L.api.todoAdd(v.slice(0, 200)); if (t) t.value = '';
      if (Z.paint) Z.paint('keep');
      if (!c || !c.id) { toast('加進任務了，打開卡片再請它規劃'); return; }
      window.__zlAsk({ id: c.id, who: '大器', label: '就這樣請大器規劃', go: async function (said) {
        await L.api.say(c.id, '請幫我把「' + v.slice(0, 120) + '」規劃成步驟，寫回這張卡。' + (said ? '\n老大交代：' + said : ''), who); toast('請大器規劃了，步驟會寫回這張卡'); } });
    } catch (err) { toast('沒存上，再按一次'); }
  }
  setInterval(function () {
    var c = document.getElementById('chat'), open = !!(c && !c.hidden && c.classList.contains('in'));
    var young = pend && Date.now() - (pend.at || 0) < 2000;   // 剛按下去對話框還在打開，先別清
    if (!open) { if (!young) { drop(); pend = null; } return; }
    var Z = window.__zl; if (pend && !young && Z && Z.S && Z.S.chat && Z.S.chat.ctx !== 'proj:' + pend.id) { drop(); pend = null; return; }
    if (pend) chip();
  }, 200);
})();

/* 2026-11-24 生活「要買」的「比價」鈕補回萌萌的臉（逐流 msg 680，老大：「要是萌萌的小臉」）。
   app.js 把「請萌萌比價」改短成「比價」時用 textContent 蓋掉了臉；這裡沒有臉就補一顆（由 faceSync 掛）。退回：刪掉這一段。 */
(function () {
  if (typeof document === 'undefined') return;
  function run() {
    document.querySelectorAll('[data-act="supcmp"]').forEach(function (b) {
      if (b.querySelector('.bm')) return;
      var f = document.createElement('span'); f.className = 'bm bf'; f.dataset.b = 'mon'; f.setAttribute('aria-hidden', 'true');
      b.insertBefore(f, b.firstChild);
    });
  }
  var t = 0; new MutationObserver(function () { clearTimeout(t); t = setTimeout(run, 60); }).observe(document.documentElement, { childList: true, subtree: true });
})();

/* 2026-11-24 首頁目標窄條改成手指左右滑（msg 692），自動輪播拿掉。 */

/* 2026-11-25 派工前看 AI 額度（逐流 msg 709，老大：「在排步驟卡片以及要執行的時候好像似乎必須查詢一下當下A I帳號的額度，不然好像會不小心就用光」）。
   「就這樣交給…」那顆上方、步驟卡上方各放一行：各帳號本週用了幾 %，≥85% 標紅提醒換帳號。資料來自 hub_ai_quota（Mac 每 30 分鐘、有變才推）；面板只在打開時讀，10 分鐘內共用一次結果。
   Sam 指定才用，不列入建議。退回：刪掉這一段。 */
(function () {
  if (typeof document === 'undefined') return;
  var cache = null, at = 0, busy = false;
  function get() {
    var Z = window.__zl; if (!Z || !Z.LV || !Z.LV.api || !Z.LV.api.aiQuota) return Promise.resolve(null);
    if (cache && Date.now() - at < 600000) return Promise.resolve(cache);
    if (busy) return Promise.resolve(cache); busy = true;
    return Z.LV.api.aiQuota().then(function (d) { cache = Array.isArray(d) ? d : []; at = Date.now(); busy = false; return cache; }).catch(function () { busy = false; return cache; });
  }
  var SHORT = { 'claude': 'Claude 好咖', 'claude-b': 'Claude 個人', 'codex': 'Codex 好咖', 'codex-p': 'Codex 個人', 'agy-b': 'AGY 個人' };
  function html(rows) {
    var show = rows.filter(function (r) { return SHORT[r.account] && r.wk_pct != null; });
    if (!show.length) return '';
    var hi = show.filter(function (r) { return Math.max(r.wk_pct || 0, r.h5_pct || 0) >= 85; });
    var ok = show.filter(function (r) { return Math.max(r.wk_pct || 0, r.h5_pct || 0) < 60; }).sort(function (a, b) { return (a.wk_pct || 0) - (b.wk_pct || 0); });
    var chips = show.map(function (r) { var p = Math.max(r.wk_pct || 0, r.h5_pct || 0); return '<span class="aq' + (p >= 85 ? ' hot' : p >= 60 ? ' mid' : '') + '">' + SHORT[r.account] + ' <b>' + Math.round(p) + '%</b></span>'; }).join('');
    var tip = hi.length ? '<small class="aqt">' + hi.map(function (r) { return SHORT[r.account]; }).join('、') + '快用完' + (ok.length ? '，建議改用 ' + SHORT[ok[0].account] : '') + '</small>' : '';
    return '<div class="aqrow" aria-label="AI 帳號本週額度"><span class="aqh">額度</span>' + chips + tip + '</div>';
  }
  function put(where) {
    if (!where || where.querySelector('.aqrow')) return;
    get().then(function (rows) { if (!rows || where.querySelector('.aqrow')) return; var h = html(rows); if (h) where.insertAdjacentHTML('afterbegin', h); });
  }
  var st = document.createElement('style');
  st.textContent = '.aqrow{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;margin:0 0 8px;font-size:12px;color:var(--ink2)}.aqh{margin-right:2px}' +
    '#cBaba .aqrow{flex-basis:100%;margin-bottom:2px}.aq{padding:2px 8px;border-radius:999px;border:1px solid var(--line)}.aq b{color:var(--ink)}.aq.mid b{color:#f2a93b}.aq.hot{border-color:#f0605a}.aq.hot b{color:#f0605a}.aqt{flex-basis:100%;color:#f0605a}';
  (document.head || document.documentElement).appendChild(st);
  var t = 0; new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () {
    var c = document.getElementById('cBaba'); if (c) put(c.parentNode.querySelector('#cBaba') ? c : null);
    var s = document.querySelector('#sheet .stplanr'); if (s) put(s.parentNode);
  }, 120); }).observe(document.documentElement, { childList: true, subtree: true });
})();

/* 2026-11-25 每張「要你決定」卡都有「已經處理了」（老大：「我看卡片跟大家還是會把已經做完或正在做的事當成沒做推給我欸」）。
   原本只有要登入的卡才有「我已經弄好了」；其他卡做完了也只能選選項。這裡補一顆小鈕，按了照舊走 pick _done（記下「我已經弄好了」、可復原）。退回：刪掉這一段。 */
(function () {
  if (typeof document === 'undefined') return;
  function run() {
    document.querySelectorAll('[data-dec]').forEach(function (box) {
      var id = box.dataset.dec; if (!id || box.querySelector('[data-k="_done"]')) return;
      var host = box.querySelector('.btns, .mrow') || box;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'mb'; b.dataset.act = 'pick'; b.dataset.id = id; b.dataset.k = '_done';
      b.textContent = '✓ 已經處理了'; host.appendChild(b);
    });
  }
  var t = 0; new MutationObserver(function () { clearTimeout(t); t = setTimeout(run, 80); }).observe(document.documentElement, { childList: true, subtree: true });
})();

/* 2026-11-25 今天頁「今天的節奏」（張弛 tide 轉單，【監工】節律技能）：讀 hub_tide_plan_list，只列今天、明天，照時間排，一列一行；
   注意事項（接不上、排不下）在最底下一行灰字。只能看，不加按鈕、不加心情鈕（老大今天說不要每天主動推菜單）。讀不到就整塊不顯示。
   只在首頁讀，10 分鐘內共用一次結果（資料庫降載）。退回：刪掉這一段。 */
(function () {
  if (typeof document === 'undefined') return;
  var cache = null, at = 0, busy = false;
  var KIND = { leave: '出門', start: '開工', internal_due: '內部截止', hard_stop: '收手' };
  function ymd(t) { var x = new Date(t.getTime() + 8 * 3600e3); return x.toISOString().slice(0, 10); }
  function hm(iso) { var x = new Date(new Date(iso).getTime() + 8 * 3600e3); return String(x.getUTCHours()).padStart(2, '0') + ':' + String(x.getUTCMinutes()).padStart(2, '0'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function load() {
    var Z = window.__zl; if (!Z || !Z.LV || !Z.LV.api || !Z.LV.api.tidePlan) return;
    if (busy || (cache && Date.now() - at < 600000)) return; busy = true;
    var now = new Date(), t0 = ymd(now), t1 = ymd(new Date(now.getTime() + 864e5));
    Z.LV.api.tidePlan(t0, t1).then(function (d) { cache = Array.isArray(d) ? d : []; at = Date.now(); busy = false; draw(); }).catch(function () { cache = []; at = Date.now(); busy = false; draw(); });
  }
  function draw() {
    var Z = window.__zl, old = document.getElementById('tideBox'); if (old) old.parentNode.removeChild(old);
    if (!Z || !Z.S || (Z.S.tab && Z.S.tab !== 'today') || Z.S.page || !cache || !cache.length) return;
    var anchor = document.querySelector('#view [data-z="goal"]'); if (!anchor) return;
    var now = Date.now(), t0 = ymd(new Date()), groups = { };
    var rows = cache.filter(function (r) { return r.at && new Date(r.at).getTime() > now - 3600e3; }).sort(function (a, b) { return new Date(a.at) - new Date(b.at); });
    if (!rows.length) return;
    var notes = [];
    rows.forEach(function (r) { var d = ymd(new Date(r.at)) === t0 ? '今天' : '明天'; (groups[d] = groups[d] || []).push(r); var m = r.meta || {}; [m.note, m.warn].forEach(function (n) { if (n && notes.indexOf(n) < 0) notes.push(n); }); });
    var h = '<section id="tideBox" class="tidebox" aria-label="今天的節奏"><h3>今天的節奏</h3>';
    // 2026-11-25 老大：「原本我們在裡面的行事曆那個 還有多少時間多少空檔 幾個小時那個我真的覺得還不錯 可能可以結合？」
    // 每天一條時間條（8～24 點，跟行事曆頁同一套算法 __zl.tlDay）：忙的上色、節奏時間點成小點、右邊空幾小時與最長空檔
    function bar(n, rs) {
      var Zc = window.__zl; if (!Zc || !Zc.tlDay || !Zc.CAL) return '';
      var its = Zc.CAL.filter(function (e) { return e.d === n && !e.cancel && !e.del; }), i = Zc.tlDay(its);
      var nowH = (function () { var x = new Date(Date.now() + 8 * 3600e3); return x.getUTCHours() + x.getUTCMinutes() / 60; })();
      var pc = function (v) { return Math.max(0, Math.min(100, (v - 8) / 16 * 100)); };
      var free = i.free.map(function (f) { return n === 0 ? [Math.max(f[0], nowH), f[1]] : f; }).filter(function (f) { return f[1] - f[0] >= 0.5; });
      var fh = free.reduce(function (t, f) { return t + f[1] - f[0]; }, 0), big = free.slice().sort(function (a, b) { return (b[1] - b[0]) - (a[1] - a[0]); })[0];
      var fmt = function (v) { var H = Math.floor(v), M = Math.round((v - H) * 60); return String(H).padStart(2, '0') + ':' + String(M).padStart(2, '0'); };
      var segs = i.segs.map(function (sg) { return '<i class="tdseg" data-s="' + sg.e.src + '" style="left:' + pc(sg.a) + '%;width:' + Math.max(1.5, pc(sg.b) - pc(sg.a)) + '%"></i>'; }).join('');
      var pins = rs.map(function (r) { var x = new Date(new Date(r.at).getTime() + 8 * 3600e3), v = x.getUTCHours() + x.getUTCMinutes() / 60; return '<i class="tdpin" data-k="' + esc(r.kind) + '" style="left:' + pc(v) + '%"></i>'; }).join('');
      var past = n === 0 ? '<i class="tdpast" style="width:' + pc(nowH) + '%"></i>' : '';
      var hrs = Math.round(fh * 2) / 2;
      return '<div class="tdbar"><span class="tdtrack">' + past + segs + pins + '</span><span class="tdfree' + (fh < 2 ? ' tight' : '') + '"><b class="num">' + hrs + '</b> 小時空' + (big ? '<small>最長 ' + fmt(big[0]) + '～' + fmt(big[1]) + '</small>' : '') + '</span></div>';
    }
    ['今天', '明天'].forEach(function (g) { if (!groups[g]) return;
      h += '<p class="tdg">' + g + '</p>' + bar(g === '今天' ? 0 : 1, groups[g]) + '<ul>' + groups[g].map(function (r) { var k = r.kind === 'leave' ? (r.verb || '出門') : (KIND[r.kind] || r.kind);
        return '<li data-k="' + esc(r.kind) + '"><b class="num">' + hm(r.at) + '</b> ' + esc(k) + '<span>｜' + esc(String(r.title || '').replace(/\s*@Borry/i, '')) + '</span></li>'; }).join('') + '</ul>'; });
    if (notes.length) h += '<p class="tdn">' + notes.map(esc).join('；') + '</p>';
    anchor.insertAdjacentHTML('beforebegin', h + '</section>');
  }
  var st = document.createElement('style');
  st.textContent = '.tidebox{margin:12px 0;padding:12px 14px;border:1px solid var(--line);border-radius:16px;background:var(--sf)}.tidebox h3{margin:0 0 6px;font-size:15px}' +
    '.tidebox .tdg{margin:8px 0 2px;font-size:12px;color:var(--ink2)}.tidebox ul{list-style:none;margin:0;padding:0}.tidebox li{display:flex;gap:6px;align-items:baseline;padding:4px 0;font-size:14px;line-height:1.4;border-top:1px solid var(--line)}' +
    '.tidebox li:first-child{border-top:0}.tidebox li b{min-width:44px}.tidebox li span{color:var(--ink2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}' +
    '.tidebox li[data-k="internal_due"] b{color:var(--urg,#f87171)}'+
    '.tdbar{display:flex;align-items:center;gap:8px;margin:2px 0 6px}.tdtrack{position:relative;flex:1;height:16px;border-radius:5px;background:rgba(127,127,127,.16);overflow:hidden}' +
    '.tdseg{position:absolute;top:0;bottom:0;border-radius:3px;background:#5b8cff}.tdseg[data-s="co"]{background:#f2a93b}.tdpast{position:absolute;left:0;top:0;bottom:0;background:repeating-linear-gradient(135deg,rgba(127,127,127,.28) 0 3px,transparent 3px 7px)}' +
    '.tdpin{position:absolute;top:2px;bottom:2px;width:3px;margin-left:-1px;border-radius:2px;background:var(--ink)}.tdpin[data-k="internal_due"]{background:#f0605a}' +
    '.tdfree{display:flex;flex-direction:column;align-items:flex-end;min-width:86px;font-size:12px;color:var(--ink2);line-height:1.2}.tdfree b{font-size:16px;color:var(--ink)}.tdfree.tight b{color:#f0605a}.tdfree small{font-size:11px}.tidebox .tdn{margin:8px 0 0;font-size:12px;color:var(--ink2)}';
  (document.head || document.documentElement).appendChild(st);
  var t = 0; new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () { if (document.getElementById('tideBox') || !document.querySelector('#view [data-z="goal"]')) { if (!document.querySelector('#view [data-z="goal"]')) return; if (document.getElementById('tideBox')) return; }
    if (cache && Date.now() - at < 600000) draw(); else load(); }, 150); }).observe(document.documentElement, { childList: true, subtree: true });
})();
