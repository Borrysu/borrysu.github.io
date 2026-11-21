/* 三個概念的場景：星圖 star、樓層 floor、軌道 orbit。由 shell.js 呼叫 build(ctx)。 */
(function () {
'use strict';
var ORDER_FLOOR = ['ENG', 'KB', 'GOV', 'QA', 'IN', 'CR', 'PR', 'OUT', 'NEW']; // 下到上：底座在下，交付在頂
var ORDER_ORBIT = ['IN', 'CR', 'PR', 'OUT', 'QA', 'GOV', 'KB', 'ENG', 'NEW']; // 內到外：產線在內，底座在外

function byLayer(ctx) { var m = {}; ctx.skills.forEach(function (s) { (m[s.layer] = m[s.layer] || []).push(s); }); return m; }
function bigLabel(ctx, text) { var d = ctx.el('div', 'layerlab', text); document.getElementById('labels').appendChild(d); return d; }
function placeLabel(lab, v, camera, w, h, op) {
  var p = v.clone().project(camera);
  if (p.z > 1 || Math.abs(p.x) > 1.2 || Math.abs(p.y) > 1.2) { lab.style.opacity = 0; return; }
  lab.style.opacity = op; lab.style.transform = 'translate(' + ((p.x * .5 + .5) * w).toFixed(1) + 'px,' + ((-p.y * .5 + .5) * h).toFixed(1) + 'px)';
}

// ---------- 1 星圖：每層一團星系，散在球面上 ----------
function star(ctx) {
  var T = ctx.THREE, bl = byLayer(ctx), ids = ctx.layers.map(function (l) { return l.id; }).filter(function (id) { return bl[id]; });
  var centers = {}, nebulae = [], labs = [];
  ids.forEach(function (id, i) {
    var y = 1 - (i + .5) / ids.length * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963;
    var c = new T.Vector3(Math.cos(th) * r * 88, y * 58, Math.sin(th) * r * 88); centers[id] = c;
    var neb = new T.Sprite(new T.SpriteMaterial({ map: ctx.texGlow, transparent: true, depthWrite: false, opacity: .16 }));
    neb.scale.set(56, 56, 1); neb.position.copy(c); ctx.scene.add(neb); nebulae.push([neb, id]);
    var name = (ctx.layers.filter(function (l) { return l.id === id; })[0] || {}).name || id;
    labs.push([bigLabel(ctx, name), c.clone().add(new T.Vector3(0, 22, 0)), id]);
    bl[id].forEach(function (s, j) {
      var R = ctx.rnd(s.id), n = ctx.nodes[s.id];
      var N = bl[id].length, yy = N > 1 ? 1 - (j + .5) / N * 2 : 0, qq = Math.sqrt(1 - yy * yy), aa = j * 2.399963 + R() * .6, d = 7 + Math.sqrt(N) * 3.4 + R() * 2;
      n.group.position.set(c.x + Math.cos(aa) * qq * d, c.y + yy * d * .8, c.z + Math.sin(aa) * qq * d);
      ctx.scene.add(n.group);
    });
  });
  var dark = true, hasSel = false;
  return {
    camera: { theta: .5, phi: 1.2, radius: 205, target: [0, 0, 0] },
    spin: .00007,
    theme: function (d) { dark = d; var C = ctx.colors(); nebulae.forEach(function (x) { x[0].material.color.set(C[x[1]]); x[0].material.blending = d ? T.AdditiveBlending : T.NormalBlending; x[0].material.opacity = d ? .24 : .12; x[0].material.needsUpdate = true; }); },
    update: function (t, dt, st) { hasSel = !!st.sel; nebulae.forEach(function (x, i) { var s = 56 + Math.sin(t * .4 + i) * 3; x[0].scale.set(s, s, 1); }); },
    labels: function (camera, w, h) { labs.forEach(function (x) { placeLabel(x[0], x[1], camera, w, h, hasSel ? .25 : .9); }); }
  };
}

// ---------- 2 樓層：每層一塊浮空玻璃板，現役比孵化高 ----------
function floor(ctx) {
  var T = ctx.THREE, bl = byLayer(ctx), ids = ORDER_FLOOR.filter(function (id) { return bl[id]; });
  var floors = {}, GAP = 15, W = 64, Dp = 30;
  ids.forEach(function (id, i) {
    var g = new T.Group(); var y0 = (i - (ids.length - 1) / 2) * GAP; g.position.y = y0;
    var slab = new T.Mesh(new T.BoxGeometry(W, .5, Dp), new T.MeshBasicMaterial({ transparent: true, opacity: .1, depthWrite: false }));
    var edge = new T.LineSegments(new T.EdgesGeometry(slab.geometry), new T.LineBasicMaterial({ transparent: true, opacity: .7 }));
    var grid = new T.GridHelper(W, 8, 0xffffff, 0xffffff); grid.scale.z = Dp / W; grid.material.transparent = true; grid.material.opacity = .06; grid.position.y = .3;
    g.add(slab); g.add(edge); g.add(grid); ctx.scene.add(g);
    var name = (ctx.layers.filter(function (l) { return l.id === id; })[0] || {}).name || id;
    var lab = bigLabel(ctx, name);
    var list = bl[id], cols = Math.min(7, list.length), rows = Math.ceil(list.length / cols);
    var pillars = [];
    list.forEach(function (s, j) {
      var n = ctx.nodes[s.id], cx = j % cols, cz = Math.floor(j / cols);
      var x = (cx - (cols - 1) / 2) * (W / (cols + .5)), z = (cz - (rows - 1) / 2) * 9;
      var hgt = s.kind !== 'skill' ? 1.6 : (s.status === '現役' ? 4.2 : 2.2);
      var pil = new T.Mesh(new T.CylinderGeometry(.35, .35, hgt, 8), new T.MeshBasicMaterial({ transparent: true, opacity: .55 }));
      pil.position.set(x, hgt / 2 + .3, z); g.add(pil); pillars.push(pil);
      n.group.position.set(x, hgt + 1.2, z); g.add(n.group);
    });
    floors[id] = { g: g, y0: y0, lift: 0, slab: slab, edge: edge, grid: grid, pillars: pillars, lab: lab, i: i };
  });
  var hoverLayer = null, focus = null, dark = true;
  return {
    camera: { theta: .78, phi: 1.0, radius: 165, target: [0, 0, 0] },
    spin: .00004,
    theme: function (d) {
      dark = d; var C = ctx.colors();
      Object.keys(floors).forEach(function (id) { var f = floors[id], c = new T.Color(C[id]);
        f.slab.material.color.copy(c); f.edge.material.color.copy(c); f.grid.material.color.set(d ? 0xffffff : 0x0f172a);
        f.pillars.forEach(function (p) { p.material.color.copy(c); p.material.blending = d ? T.AdditiveBlending : T.NormalBlending; }); });
    },
    onHover: function (s) { hoverLayer = s ? s.layer : null; },
    onSelect: function (s) { focus = s ? s.layer : null; },
    onLayer: function (id) { focus = id; },
    update: function (t, dt, st) {
      Object.keys(floors).forEach(function (id) { var f = floors[id];
        var want = (id === hoverLayer || id === focus) ? 3.5 : 0; f.lift += (want - f.lift) * .1;
        f.g.position.y = f.y0 + f.lift + Math.sin(t * .6 + f.i) * .35;
        var act = !focus || id === focus; f.slab.material.opacity = (dark ? .1 : .14) * (act ? 1 + f.lift * .25 : .4); f.edge.material.opacity = act ? .75 : .2; });
    },
    labels: function (camera, w, h) { Object.keys(floors).forEach(function (id) { var f = floors[id]; var v = new T.Vector3(-W / 2 - 2, 0, Dp / 2); f.g.localToWorld(v); placeLabel(f.lab, v, camera, w, h, (!focus || id === focus) ? .95 : .35); }); }
  };
}

// ---------- 3 軌道：中心是技能系統，各層一圈斜軌道慢慢轉 ----------
function orbit(ctx) {
  var T = ctx.THREE, bl = byLayer(ctx), ids = ORDER_ORBIT.filter(function (id) { return bl[id]; });
  var rings = [], core = new T.Group();
  var coreMesh = new T.Mesh(new T.SphereGeometry(2.6, 32, 24), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9 }));
  var coreGlow = new T.Sprite(new T.SpriteMaterial({ map: ctx.texGlow, transparent: true, depthWrite: false })); coreGlow.scale.set(26, 26, 1);
  core.add(coreGlow); core.add(coreMesh); ctx.scene.add(core);
  var coreLab = bigLabel(ctx, '技能系統');
  ids.forEach(function (id, i) {
    var R = 15 + i * 8.5, g = new T.Group();
    var rr = ctx.rnd('ring' + id); g.rotation.x = (rr() - .5) * .5; g.rotation.z = (rr() - .5) * .4;
    var pts = new T.EllipseCurve(0, 0, R, R, 0, Math.PI * 2).getPoints(160).map(function (p) { return new T.Vector3(p.x, 0, p.y); });
    var line = new T.LineLoop(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ transparent: true, opacity: .35 }));
    var halo = new T.LineLoop(line.geometry, new T.LineBasicMaterial({ transparent: true, opacity: .12 })); halo.scale.set(1.012, 1, 1.012);
    g.add(line); g.add(halo); ctx.scene.add(g);
    var spin = new T.Group(); g.add(spin);
    var list = bl[id];
    list.forEach(function (s, j) { var a = j / list.length * Math.PI * 2 + rr() * 6; ctx.nodes[s.id].group.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); spin.add(ctx.nodes[s.id].group); });
    var name = (ctx.layers.filter(function (l) { return l.id === id; })[0] || {}).name || id;
    rings.push({ ang: i * .62 + .3, id: id, g: g, spin: spin, line: line, halo: halo, R: R, speed: .09 / Math.sqrt(R / 15), lab: bigLabel(ctx, name) });
  });
  var paused = false, focus = null;
  return {
    camera: { theta: .3, phi: .82, radius: 175, target: [0, 0, 0] },
    spin: .00005,
    theme: function (d) { var C = ctx.colors(); coreMesh.material.color.set(d ? 0xffffff : 0x0f172a); coreGlow.material.color.set(d ? 0xbfe9ff : 0x93c5fd); coreGlow.material.blending = d ? T.AdditiveBlending : T.NormalBlending; coreGlow.material.opacity = d ? .9 : .6;
      rings.forEach(function (r) { r.line.material.color.set(C[r.id]); r.halo.material.color.set(C[r.id]); r.line.material.blending = r.halo.material.blending = d ? T.AdditiveBlending : T.NormalBlending; }); },
    onSelect: function (s) { paused = !!s; focus = s ? s.layer : null; },
    onLayer: function (id) { focus = id; },
    update: function (t, dt, st) {
      if (!paused || st.playing) rings.forEach(function (r) { r.spin.rotation.y += r.speed * dt / 1000; });
      rings.forEach(function (r) { var act = !focus || r.id === focus; r.line.material.opacity = act ? .42 : .1; r.halo.material.opacity = act ? .14 : .03; });
      var s = 26 + Math.sin(t * 1.2) * 3; coreGlow.scale.set(s, s, 1);
    },
    labels: function (camera, w, h) {
      placeLabel(coreLab, new T.Vector3(0, -8, 0), camera, w, h, .9);
      rings.forEach(function (r) { var v = new T.Vector3(Math.cos(r.ang) * (r.R + 2), 0, Math.sin(r.ang) * (r.R + 2)); r.g.localToWorld(v); placeLabel(r.lab, v, camera, w, h, (!focus || r.id === focus) ? .85 : .25); });
    }
  };
}

window.SkillConcepts = { star: star, floor: floor, orbit: orbit };
})();
