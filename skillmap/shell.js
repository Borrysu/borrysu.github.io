/* 技能地圖 3D 概念原型共用外殼（2026-11-22 大器 Claude）
   參考：me.sh 軌道光線與玻璃托盤、The Resonance 發光玻璃邊、Weaviate 暗底分色、Solana 光線軌跡、
   Spatial Chat 等角浮空平台、Memotron 圖＋右側檢視欄、Kin 手機全螢幕關係圖、Graphy 淺色瓷白底發光物。
   three.js r128（cdnjs）。所有文字用 textContent，不插 HTML。 */
(function () {
'use strict';
var $ = function (s) { return document.querySelector(s); };
function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
var LAYER_COLOR = { IN: 0x38d0ff, CR: 0xa78bfa, PR: 0xf472b6, OUT: 0xfbbf24, QA: 0xa3e635, GOV: 0x2dd4bf, KB: 0x60a5fa, ENG: 0x94a3b8, NEW: 0xf5f5f4 };
var LAYER_COLOR_LIGHT = { IN: 0x0284c7, CR: 0x7c3aed, PR: 0xdb2777, OUT: 0xd97706, QA: 0x65a30d, GOV: 0x0d9488, KB: 0x2563eb, ENG: 0x64748b, NEW: 0x57534e };
function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }
function rnd(seed) { var a = Math.floor(hash(seed) * 4294967295) >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

var mqDark = matchMedia('(prefers-color-scheme: dark)'), mqDesk = matchMedia('(min-width: 900px)'), mqRM = matchMedia('(prefers-reduced-motion: reduce)');
function isDark() { var t = document.documentElement.getAttribute('data-theme'); return t ? t === 'dark' : mqDark.matches; }
var LITE = /lite=1/.test(location.hash) || ((navigator.hardwareConcurrency || 8) <= 4 && /Mobi|Android/i.test(navigator.userAgent));

function glowTexture(ring) {
  var c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d');
  if (ring) {
    g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 7; g.beginPath(); g.arc(64, 64, 30, 0, Math.PI * 2); g.stroke();
    var r2 = g.createRadialGradient(64, 64, 0, 64, 64, 64); r2.addColorStop(0, 'rgba(255,255,255,.35)'); r2.addColorStop(.5, 'rgba(255,255,255,.08)'); r2.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r2; g.fillRect(0, 0, 128, 128);
  } else {
    var r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.18, 'rgba(255,255,255,.9)'); r.addColorStop(.4, 'rgba(255,255,255,.25)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  }
  var t = new THREE.CanvasTexture(c); return t;
}

window.SkillShell = { init: init };

function init(opt) {
  var root = $('#app');
  var gl = (function () { try { var c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; } })();
  if (!window.THREE || !gl) { location.replace('list.html' + location.search); return; }
  opt.load().then(function (d) { if (d) start(opt, d.map, d); }).catch(function (e) { if (opt.onError) opt.onError(e); else root.appendChild(el('div', 'fallback', '讀不到資料：' + e.message)); });
}

function start(opt, map, D) {
  var api = opt.api || null, confirms = (D && D.confirms) || [], commit = D && D.source_commit;
  var skills = map.skills, layers = map.layers, scns = map.scenarios || [];
  var byId = {}; skills.forEach(function (s) { s.from = []; byId[s.id] = s; });
  skills.forEach(function (s) { (s.to || []).forEach(function (t) { if (byId[t]) byId[t].from.push(s.id); }); });
  var links = []; skills.forEach(function (s) { (s.to || []).forEach(function (t) { if (byId[t]) links.push([s.id, t]); }); });
  var layerName = {}; layers.forEach(function (l) { layerName[l.id] = l.name; });

  // ---------- three 基本 ----------
  var stage = $('#stage');
  var renderer = new THREE.WebGLRenderer({ antialias: !LITE, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, LITE ? 1 : 2));
  stage.appendChild(renderer.domElement);
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, 1, 0.5, 2000);
  var texGlow = glowTexture(false), texRing = glowTexture(true);
  var colors = function () { return isDark() ? LAYER_COLOR : LAYER_COLOR_LIGHT; };

  // 星塵背景
  var starN = LITE ? 300 : 1400, sp = new Float32Array(starN * 3), sr = rnd('stars');
  for (var i = 0; i < starN; i++) { var u = sr() * 2 - 1, th = sr() * Math.PI * 2, rr = 300 + sr() * 400, q = Math.sqrt(1 - u * u); sp[i * 3] = rr * q * Math.cos(th); sp[i * 3 + 1] = rr * u; sp[i * 3 + 2] = rr * q * Math.sin(th); }
  var sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  var stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, transparent: true, opacity: .55, depthWrite: false }));
  scene.add(stars);

  // ---------- 節點 ----------
  var nodes = {}; // id -> {s, group, core, glow, pick, label}
  var pickables = [];
  var labelBox = $('#labels');
  skills.forEach(function (s) {
    var g = new THREE.Group();
    var size = s.kind === 'skill' ? 1 : .75;
    var core = new THREE.Mesh(new THREE.SphereGeometry(.9 * size, 20, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    var glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: s.status === '孵化' ? texRing : texGlow, transparent: true, depthWrite: false }));
    glow.scale.set(8 * size, 8 * size, 1);
    var pick = new THREE.Mesh(new THREE.SphereGeometry(3.2, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    pick.userData.id = s.id; pickables.push(pick);
    g.add(glow); g.add(core); g.add(pick);
    var lab = el('div', 'lab'); lab.appendChild(el('b', '', s.zh || s.id)); lab.appendChild(el('span', '', s.id)); labelBox.appendChild(lab);
    nodes[s.id] = { s: s, group: g, core: core, glow: glow, pick: pick, label: lab, size: size, phase: hash(s.id) * 6.28, dim: 0, lift: 0 };
  });

  var ctx = { THREE: THREE, scene: scene, skills: skills, layers: layers, nodes: nodes, byId: byId, colors: colors, isDark: isDark, rnd: rnd, hash: hash, LITE: LITE, texGlow: texGlow, el: el };
  var concept = opt.build(ctx);

  // ---------- 連線 ----------
  var baseGeo = new THREE.BufferGeometry(), basePos = new Float32Array(links.length * 6), baseCol = new Float32Array(links.length * 6);
  baseGeo.setAttribute('position', new THREE.BufferAttribute(basePos, 3)); baseGeo.setAttribute('color', new THREE.BufferAttribute(baseCol, 3));
  var baseMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .22, depthWrite: false });
  var baseLines = new THREE.LineSegments(baseGeo, baseMat); scene.add(baseLines);
  var hiGeo = new THREE.BufferGeometry(), hiPos = new Float32Array(60 * 6), hiCol = new Float32Array(60 * 6);
  hiGeo.setAttribute('position', new THREE.BufferAttribute(hiPos, 3)); hiGeo.setAttribute('color', new THREE.BufferAttribute(hiCol, 3));
  var hiMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .95, depthWrite: false });
  var hiLines = new THREE.LineSegments(hiGeo, hiMat); scene.add(hiLines); hiGeo.setDrawRange(0, 0);
  var hiLinks = [];
  // 光點沿線跑（交給＝往外，來自＝往內）
  var sparks = [];
  for (var k = 0; k < 40; k++) { var spk = new THREE.Sprite(new THREE.SpriteMaterial({ map: texGlow, transparent: true, depthWrite: false })); spk.scale.set(2.2, 2.2, 1); spk.visible = false; scene.add(spk); sparks.push(spk); }
  var comet = new THREE.Sprite(new THREE.SpriteMaterial({ map: texGlow, transparent: true, depthWrite: false, color: 0xffffff })); comet.scale.set(6, 6, 1); comet.visible = false; scene.add(comet);

  var tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  function wpos(id, v) { return nodes[id].group.getWorldPosition(v || new THREE.Vector3()); }

  // ---------- 主題 ----------
  function applyTheme() {
    var dark = isDark(), C = colors();
    var bg = new THREE.Color(dark ? 0x07080c : 0xeef1f6);
    scene.background = bg; scene.fog = new THREE.FogExp2(bg.getHex(), dark ? .0042 : .0036);
    stars.material.color.set(dark ? 0xffffff : 0x8a94a6); stars.material.opacity = dark ? .55 : .35;
    var blend = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
    skills.forEach(function (s) {
      var n = nodes[s.id], c = new THREE.Color(C[s.layer] || 0xffffff);
      n.glow.material.color.copy(c); n.glow.material.blending = blend; n.glow.material.opacity = dark ? .95 : .55; n.glow.material.needsUpdate = true;
      n.core.material.color.copy(dark ? new THREE.Color(0xffffff).lerp(c, .25) : c);
    });
    links.forEach(function (l, i) { var c = new THREE.Color(C[byId[l[0]].layer] || 0xffffff); for (var j = 0; j < 2; j++) { baseCol[i * 6 + j * 3] = c.r; baseCol[i * 6 + j * 3 + 1] = c.g; baseCol[i * 6 + j * 3 + 2] = c.b; } });
    baseGeo.attributes.color.needsUpdate = true;
    baseMat.opacity = dark ? .2 : .28; baseMat.blending = blend; hiMat.blending = blend;
    sparks.forEach(function (x) { x.material.blending = blend; }); comet.material.blending = blend; comet.material.color.set(dark ? 0xffffff : 0x111827);
    if (concept.theme) concept.theme(dark);
    setHighlight(sel);
  }

  // ---------- 相機控制（拖轉、滾輪／雙指縮放、點選） ----------
  var cam = concept.camera || { theta: .6, phi: 1.15, radius: 150, target: [0, 0, 0] };
  var narrow = innerWidth / innerHeight < 1 ? Math.min(1.7, 1.15 / (innerWidth / innerHeight)) : 1; cam.radius *= narrow;
  var C = { theta: cam.theta, phi: cam.phi, radius: cam.radius, target: new THREE.Vector3().fromArray(cam.target) };
  var G = { theta: C.theta, phi: C.phi, radius: C.radius, target: C.target.clone() };
  var home = { theta: cam.theta, phi: cam.phi, radius: cam.radius, target: C.target.clone() };
  var ptrs = {}, lastPinch = 0, down = null, interacting = 0;
  var cv = renderer.domElement; cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', function (e) { cv.setPointerCapture(e.pointerId); ptrs[e.pointerId] = { x: e.clientX, y: e.clientY }; down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 }; interacting = performance.now(); });
  cv.addEventListener('pointermove', function (e) {
    var p = ptrs[e.pointerId];
    if (!p) { hoverAt(e.clientX, e.clientY); return; }
    var ids = Object.keys(ptrs);
    if (ids.length === 1) {
      var dx = e.clientX - p.x, dy = e.clientY - p.y;
      G.theta -= dx * .006; G.phi = clampPhi(G.phi - dy * .005);
      if (down) down.moved += Math.abs(dx) + Math.abs(dy);
    } else if (ids.length === 2) {
      p.x = e.clientX; p.y = e.clientY;
      var a = ptrs[ids[0]], b = ptrs[ids[1]], dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (lastPinch) G.radius = clampR(G.radius * lastPinch / dist);
      lastPinch = dist; if (down) down.moved += 99; interacting = performance.now(); return;
    }
    p.x = e.clientX; p.y = e.clientY; interacting = performance.now();
  });
  function up(e) {
    delete ptrs[e.pointerId]; lastPinch = 0;
    if (down && down.moved < 8 && performance.now() - down.t < 500 && !Object.keys(ptrs).length) {
      var id = pickAt(e.clientX, e.clientY); if (id) select(id, true); else if (concept.onEmptyTap) concept.onEmptyTap();
    }
    if (!Object.keys(ptrs).length) down = null;
  }
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', function (e) { e.preventDefault(); G.radius = clampR(G.radius * Math.exp(e.deltaY * .0012)); interacting = performance.now(); }, { passive: false });
  function clampPhi(v) { if (LITE) return Math.max(.75, Math.min(1.25, v)); return Math.max(.18, Math.min(2.95, v)); }
  function clampR(v) { return Math.max(18, Math.min(420, v)); }

  var ray = new THREE.Raycaster(), mv = new THREE.Vector2();
  function pickAt(x, y) {
    var r = cv.getBoundingClientRect(); mv.x = (x - r.left) / r.width * 2 - 1; mv.y = -(y - r.top) / r.height * 2 + 1;
    ray.setFromCamera(mv, camera); var hit = ray.intersectObjects(pickables, false); return hit.length ? hit[0].object.userData.id : null;
  }
  var hovered = null;
  function hoverAt(x, y) {
    if (!mqDesk.matches) return; var id = pickAt(x, y);
    if (id !== hovered) { hovered = id; cv.style.cursor = id ? 'pointer' : 'grab'; if (concept.onHover) concept.onHover(id ? byId[id] : null); }
  }

  // ---------- 選取與高亮 ----------
  var sel = null, focusLayer = null;
  function setHighlight(id) {
    hiLinks = []; var C2 = colors();
    if (id) links.forEach(function (l) { if (l[0] === id || l[1] === id) hiLinks.push(l); });
    hiLinks.forEach(function (l, i) { var c = new THREE.Color(C2[byId[l[0]].layer]); var w = new THREE.Color(isDark() ? 0xffffff : 0x111827); for (var j = 0; j < 2; j++) { var cc = j ? c : w.clone().lerp(c, .4); hiCol[i * 6 + j * 3] = cc.r; hiCol[i * 6 + j * 3 + 1] = cc.g; hiCol[i * 6 + j * 3 + 2] = cc.b; } });
    hiGeo.attributes.color.needsUpdate = true; hiGeo.setDrawRange(0, hiLinks.length * 2);
    sparks.forEach(function (x, i) { x.visible = i < hiLinks.length * 2 && !LITE; if (x.visible) x.material.color.set(C2[byId[hiLinks[i >> 1][0]].layer]); });
  }
  function neighbors(id) { var s = byId[id]; return [id].concat(s.to || [], s.from || []); }
  function select(id, fly) {
    sel = id; setHighlight(id); renderDetail(id);
    if (id && fly) flyTo(id);
    if (concept.onSelect) concept.onSelect(id ? byId[id] : null);
    try { history.replaceState(null, '', location.pathname + location.search + (id ? '#' + id.replace(/[^\w-]/g, '') : '')); } catch (e) {}
  }
  function flyTo(id, r) {
    var p = wpos(id); G.target.copy(p); G.radius = clampR(r || (mqDesk.matches ? 70 : 85));
    if (concept.flyOffset) concept.flyOffset(G);
  }
  function resetView() { G.theta = home.theta; G.phi = home.phi; G.radius = home.radius; G.target.copy(home.target); focusLayer = null; select(null); paintLegend(); }

  // ---------- 介面：頂列、圖例、詳情、情境 ----------
  var legend = $('#legend');
  function paintLegend() {
    legend.textContent = ''; var cnt = {}; skills.forEach(function (s) { cnt[s.layer] = (cnt[s.layer] || 0) + 1; });
    layers.forEach(function (l) {
      if (!cnt[l.id]) return; var b = el('button', 'chip'); var dot = el('i'); dot.style.background = '#' + new THREE.Color(colors()[l.id]).getHexString();
      b.appendChild(dot); b.appendChild(document.createTextNode(l.name + ' ' + cnt[l.id])); b.setAttribute('aria-pressed', String(focusLayer === l.id));
      b.onclick = function () { focusLayer = focusLayer === l.id ? null : l.id; paintLegend(); if (focusLayer) { var c = new THREE.Vector3(), n = 0; skills.forEach(function (s) { if (s.layer === l.id) { c.add(wpos(s.id, tmpA)); n++; } }); G.target.copy(c.divideScalar(n)); G.radius = clampR(mqDesk.matches ? 90 : 110); if (concept.onLayer) concept.onLayer(l.id); } else if (concept.onLayer) concept.onLayer(null); };
      legend.appendChild(b);
    });
  }
  $('#reset').onclick = resetView;

  var panel = $('#panel');
  function row(p, l, v) { if (!v) return; var r = el('div', 'row'); r.appendChild(el('div', 'k', l)); r.appendChild(el('div', 'v', v)); p.appendChild(r); }
  function renderDetail(id) {
    panel.textContent = '';
    if (!id) { panel.classList.remove('open'); return; }
    var s = byId[id]; panel.classList.add('open');
    var grip = el('button', 'grip'); grip.setAttribute('aria-label', '展開或收起詳情'); grip.onclick = function () { panel.classList.toggle('full'); }; panel.appendChild(grip);
    var x = el('button', 'x', '×'); x.setAttribute('aria-label', '關閉'); x.onclick = function () { select(null); }; panel.appendChild(x);
    var h = el('h2', '', s.zh || s.id); var st = el('span', 'st' + (s.status === '孵化' ? ' inc' : ''), s.kind === 'skill' ? s.status : (s.kind === 'kb' ? '知識庫' : s.kind === 'eng' ? '引擎' : '載體')); h.appendChild(st); panel.appendChild(h);
    var meta = [s.id, layerName[s.layer]]; if (s.version) meta.push('版本 ' + s.version); if (s.updated) meta.push('更新 ' + s.updated); panel.appendChild(el('div', 'meta', meta.join('・')));
    row(panel, '做什麼', s.one); row(panel, '吃進來', s.inp); row(panel, '吐出去', s.out); row(panel, '畢業還差', s.gate && s.gate.length > 80 ? s.gate.slice(0, 80) + '…' : s.gate);
    function rel(l, ids) { ids = (ids || []).filter(function (i) { return byId[i]; }); if (!ids.length) return; var r = el('div', 'row'); r.appendChild(el('div', 'k', l)); var w = el('div', 'rel'); ids.forEach(function (i) { var b = el('button', 'chip'); var dot = el('i'); dot.style.background = '#' + new THREE.Color(colors()[byId[i].layer]).getHexString(); b.appendChild(dot); b.appendChild(document.createTextNode(byId[i].zh || i)); b.onclick = function () { select(i, true); }; w.appendChild(b); }); r.appendChild(w); panel.appendChild(r); }
    rel('接著交給', s.to); rel('誰會交給它', s.from);
    var mine = confirms.filter(function (c) { return c.skill_id === s.id; });
    if (mine.length) { var rq = el('div', 'row'); rq.appendChild(el('div', 'k', '你送過的請求（' + mine.length + '）'));
      mine.slice(0, 4).forEach(function (c) { var q = el('div', 'req'); q.appendChild(el('b', '', reqLabel(c) + (c.taken_at ? '・Mac 已取' : '・等 Mac 取'))); var nn = reqNote(c); if (nn) q.appendChild(el('div', '', nn)); rq.appendChild(q); }); panel.appendChild(rq); }
    if (s.kind !== 'eng') actions(s);
  }
  var REQ = { confirm: { label: '確認', act: 'confirm' }, question: { label: '問一下', act: 'question' }, change: { label: '要改', act: 'change' },
    upgrade: { label: '要升級', act: 'change', pre: '【要升級】' }, retire: { label: '提出退役', act: 'change', pre: '【要退役】' }, relayer: { label: '重新分層', act: 'change', pre: '【重新分層】' } };
  function reqLabel(c) { var n = c.note || ''; for (var k in REQ) if (REQ[k].pre && n.indexOf(REQ[k].pre) === 0) return REQ[k].label; return (REQ[c.action] || {}).label || c.action; }
  function reqNote(c) { var n = c.note || ''; for (var k in REQ) if (REQ[k].pre && n.indexOf(REQ[k].pre) === 0) return n.slice(REQ[k].pre.length); return n; }
  var PH = { question: '想問什麼？', change: '哪裡要改、改成怎樣？', upgrade: '要升級什麼：加什麼能力、修什麼坑？', retire: '為什麼退役？有沒有誰接手？', relayer: '它該放哪一層？' };
  function actions(s) {
    var acts = el('div', 'acts'), more = el('div', 'acts more'), comp = el('div', 'compose'), ta = el('textarea'), send = el('button', 'act pri'), msg = el('div', 'msg'), cur = null, all = [];
    comp.hidden = true; more.hidden = true; ta.setAttribute('aria-label', '請求內容'); comp.appendChild(ta); comp.appendChild(send);
    function pick(k) { cur = k; all.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.k === k)); }); comp.hidden = false; ta.placeholder = PH[k] || ''; send.textContent = '送出「' + REQ[k].label + '」'; msg.textContent = k === 'retire' ? '退役要你在 Mac 那邊再拍板，這裡只送請求。' : ''; ta.focus(); }
    function btn(box, k, pri) { var b = el('button', 'act' + (pri ? ' pri' : ''), REQ[k].label); b.dataset.k = k; if (!pri) { b.setAttribute('aria-pressed', 'false'); all.push(b); } b.onclick = function () { if (k === 'confirm') go('confirm'); else pick(k); }; box.appendChild(b); }
    btn(acts, 'confirm', true); btn(acts, 'question'); btn(acts, 'change');
    var mb = el('button', 'act', '更多…'); mb.setAttribute('aria-expanded', 'false'); mb.onclick = function () { more.hidden = !more.hidden; mb.setAttribute('aria-expanded', String(!more.hidden)); }; acts.appendChild(mb);
    if (s.kind === 'skill') { btn(more, 'upgrade'); btn(more, 'retire'); } btn(more, 'relayer');
    if (s.layer === 'NEW' || s.layer_src === 'auto') { more.hidden = false; mb.setAttribute('aria-expanded', 'true'); }
    send.onclick = function () { go(cur); };
    function go(k) {
      var R = REQ[k], note = ta.value.trim();
      if (k !== 'confirm' && !note) { msg.className = 'msg err'; msg.textContent = '先寫內容再送'; ta.focus(); return; }
      if (!api) { msg.textContent = '這裡不能送請求'; return; }
      var bs = panel.querySelectorAll('.acts button,.compose button'); bs.forEach(function (b) { b.disabled = true; }); msg.className = 'msg'; msg.textContent = '送出中…';
      api.send({ p_skill_id: s.id, p_action: R.act, p_note: note ? (R.pre || '') + note : null, p_ref_commit: commit }).then(function () {
        var ok = '已送出「' + R.label + '」，Mac 會在 5 分鐘內取走、開派工單'; ta.value = ''; if (opt.onSent) opt.onSent();
        return api.list().then(function (l) { if (Array.isArray(l)) confirms = l; renderDetail(s.id); var m2 = panel.querySelector('.msg'); if (m2) m2.textContent = ok; });
      }).catch(function (e) { bs.forEach(function (b) { b.disabled = false; }); msg.className = 'msg err';
        msg.textContent = (e.status === 401 || e.status === 403) ? '這把金鑰不能送請求（只有你本人的金鑰可以）' : '送不出去：' + e.message + '。內容還在，網路好了再按一次。'; });
    }
    panel.appendChild(acts); panel.appendChild(more); panel.appendChild(comp); panel.appendChild(msg);
  }

  // 情境播放
  var scnSel = $('#scn'), playBtn = $('#play'), caption = $('#caption'), play = null;
  scns.forEach(function (sc) { var o = el('option', '', sc.name + '（' + sc.steps.length + ' 步）'); o.value = sc.id; scnSel.appendChild(o); });
  playBtn.onclick = function () { if (play) stopPlay(); else startPlay(scnSel.value); };
  function startPlay(id) {
    var sc = scns.filter(function (x) { return x.id === id; })[0]; if (!sc) return;
    var steps = sc.steps.filter(function (st) { return byId[st.id]; });
    play = { steps: steps, i: -1, t0: 0, name: sc.name }; playBtn.textContent = '停止'; playBtn.setAttribute('aria-pressed', 'true'); next();
  }
  function next() {
    if (!play) return; play.i++;
    if (play.i >= play.steps.length) { stopPlay(); return; }
    var st = play.steps[play.i]; play.t0 = performance.now();
    select(st.id, true); caption.textContent = play.name + '　' + (play.i + 1) + '／' + play.steps.length + '　' + (byId[st.id].zh || st.id) + '：' + (st.say || '');
    caption.classList.add('show');
  }
  function stopPlay() { play = null; playBtn.textContent = '播放情境'; playBtn.setAttribute('aria-pressed', 'false'); comet.visible = false; caption.classList.remove('show'); }

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (play) stopPlay(); select(null); } });

  // ---------- 迴圈 ----------
  function resize() { var w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize); resize();
  mqDark.addEventListener && mqDark.addEventListener('change', function () { applyTheme(); paintLegend(); if (sel) renderDetail(sel); });
  applyTheme(); paintLegend();
  if (location.hash.length > 1 && !/lite/.test(location.hash)) { var hid = decodeURIComponent(location.hash.slice(1)); if (byId[hid]) setTimeout(function () { select(hid, true); }, 300); }

  var last = performance.now(), frames = 0, fpsT = last, lowCount = 0;
  var proj = new THREE.Vector3(), offX = 0, offY = 0;
  function loop(now) {
    var dt = Math.min(50, now - last); last = now; var t = now / 1000;
    if (!sel && !play && !mqRM.matches && now - interacting > 2500) G.theta += dt * (concept.spin || .00006);
    concept.update && concept.update(t, dt, { sel: sel, playing: !!play });
    var k = 1 - Math.pow(.0025, dt / 1000);
    C.theta += (G.theta - C.theta) * k; C.phi += (G.phi - C.phi) * k; C.radius += (G.radius - C.radius) * k; C.target.lerp(G.target, k);
    camera.position.set(C.target.x + C.radius * Math.sin(C.phi) * Math.sin(C.theta), C.target.y + C.radius * Math.cos(C.phi), C.target.z + C.radius * Math.sin(C.phi) * Math.cos(C.theta));
    camera.lookAt(C.target);
    // 詳情欄打開時，把畫面中心讓開（電腦往左、手機往上）
    var vw = stage.clientWidth, vh = stage.clientHeight, ox = 0, oy = 0;
    if (sel) { if (mqDesk.matches) ox = 190; else oy = vh * .23; }
    offX += (ox - offX) * k; offY += (oy - offY) * k;
    if (Math.abs(offX) + Math.abs(offY) > .5) camera.setViewOffset(vw, vh, offX, offY, vw, vh); else camera.clearViewOffset();
    // 節點脈動與淡化
    var hs = sel ? neighbors(sel) : null;
    skills.forEach(function (s) {
      var n = nodes[s.id];
      var on = (!hs || hs.indexOf(s.id) >= 0) && (!focusLayer || s.layer === focusLayer) && (!n.off);
      n.dim += ((on ? 0 : 1) - n.dim) * .12;
      var pulse = 1 + (mqRM.matches ? 0 : Math.sin(t * 1.6 + n.phase) * .06) + (s.id === sel ? .35 : 0) + (s.id === hovered ? .2 : 0);
      var sc = 8 * n.size * pulse; n.glow.scale.set(sc, sc, 1);
      n.glow.material.opacity = (isDark() ? .95 : .55) * (1 - n.dim * .82); n.core.material.opacity = 1 - n.dim * .7; n.core.material.transparent = true;
    });
    // 連線位置
    links.forEach(function (l, i) { wpos(l[0], tmpA); wpos(l[1], tmpB); basePos.set([tmpA.x, tmpA.y, tmpA.z, tmpB.x, tmpB.y, tmpB.z], i * 6); });
    baseGeo.attributes.position.needsUpdate = true; baseMat.opacity = (isDark() ? .13 : .2) * (sel || focusLayer ? .3 : 1);
    hiLinks.forEach(function (l, i) {
      wpos(l[0], tmpA); wpos(l[1], tmpB); hiPos.set([tmpA.x, tmpA.y, tmpA.z, tmpB.x, tmpB.y, tmpB.z], i * 6);
      for (var j = 0; j < 2; j++) { var spk = sparks[i * 2 + j]; if (spk && spk.visible) { var f = ((t * .45 + j * .5 + i * .13) % 1); spk.position.copy(tmpA).lerp(tmpB, f); var a = Math.sin(f * Math.PI); spk.scale.set(2.4 * a + .4, 2.4 * a + .4, 1); } }
    });
    hiGeo.attributes.position.needsUpdate = true;
    // 情境彗星
    if (play) {
      var e = (now - play.t0) / 1000;
      if (play.i > 0 && e < 1.2) { comet.visible = true; wpos(play.steps[play.i - 1].id, tmpA); wpos(play.steps[play.i].id, tmpB); var f2 = Math.min(1, e / 1.2); f2 = f2 * f2 * (3 - 2 * f2); comet.position.copy(tmpA).lerp(tmpB, f2); } else comet.visible = false;
      if (e > 2.4) next();
    }
    // 標籤
    var w = stage.clientWidth, h = stage.clientHeight, desk = mqDesk.matches;
    skills.forEach(function (s) {
      var n = nodes[s.id]; wpos(s.id, proj); var dcam = proj.distanceTo(camera.position); proj.project(camera);
      var show = proj.z < 1 && Math.abs(proj.x) < 1.1 && Math.abs(proj.y) < 1.1;
      var important = s.id === sel || s.id === hovered || (hs && hs.indexOf(s.id) >= 0) || (focusLayer && s.layer === focusLayer);
      var op = important ? 1 : (desk ? Math.max(0, Math.min(.9, (230 - dcam) / 110)) : Math.max(0, Math.min(.85, (150 - dcam) / 70)));
      if (sel && !important) op *= .25;
      if (!show || op < .04) { n.label.style.opacity = 0; n.label.style.visibility = 'hidden'; return; }
      n.label.style.visibility = 'visible'; n.label.style.opacity = op.toFixed(2);
      n.label.style.transform = 'translate(' + ((proj.x * .5 + .5) * w).toFixed(1) + 'px,' + ((-proj.y * .5 + .5) * h).toFixed(1) + 'px)';
      n.label.classList.toggle('hot', s.id === sel);
    });
    if (concept.labels) concept.labels(camera, w, h);
    renderer.render(scene, camera);
    // 效能：連續低於 40fps 就降級
    frames++; if (now - fpsT > 1000) { var fps = frames * 1000 / (now - fpsT); frames = 0; fpsT = now; window.__fps = Math.round(fps); if (fps < 40 && !LITE && !/hq=1/.test(location.search)) { if (++lowCount >= 3) { LITE = true; renderer.setPixelRatio(1); stars.visible = false; document.body.classList.add('lite'); } } else lowCount = 0; }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  window.__skillmap = { select: select, startPlay: startPlay, reset: resetView };
}
})();
