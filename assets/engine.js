// =====================================================================
// 走进名画 · 场景引擎（所有场景共用的 3D 和互动功能）
//
// 用法（场景文件夹里的 index.html）：
//   import { startScene } from '../../assets/engine.js';
//   startScene('scene.json');
//
// 场景的内容（卡片、三幕、展签、房间形状、家具位置……）都写在 scene.json 里，
// 这个文件只负责“怎么做”，不放任何某一幅画的文字。
// =====================================================================
import * as THREE from 'three';
import { bi, ui, textOf, altAttr, removeStatic, lang, onLang, wirePrefs, langSwitchHTML, creditHTML, imageSourceHTML, loadRegistry, sceneCard, ROOT } from './site.js';

export async function startScene(sceneUrl) {
  removeStatic();
  const S = await fetch(sceneUrl).then(r => r.json());
  const R = await loadRegistry().catch(() => null);
  const meta = R && R.sceneById[S.id];
  // 还没开放的场景：先显示“即将开放”（地址后面加 ?preview 可以预览）
  if (meta && meta.status !== 'live' && !/preview|debug/.test(location.search)) {
    document.body.insertAdjacentHTML('beforeend', `<main class="wrap page-title"><h1>${bi(meta.title)}</h1>
      <p class="lead">${ui('即将开放', 'Coming soon')}</p><a class="btn primary" href="${ROOT}">${ui('回到走进名画', 'Back to Walk into Paintings')}</a></main>`);
    wirePrefs(); return;
  }
  document.body.classList.add('scene');
  if (meta && R.collectionById[meta.collection]) document.body.dataset.series = R.collectionById[meta.collection].accent || '';
  buildDOM(S, R, meta);
  wirePrefs();
  run(S, R, meta);
}

// ---------------------------------------------------------------------
// 1. 页面上的界面（按钮、卡片、三幕……）
// ---------------------------------------------------------------------
function buildDOM(S, R, meta) {
  const P = S.painting, L = S.label, E = S.ending;
  const labelLine = { zh: [L.title.zh, L.artist.zh, L.date.zh, L.museum.zh].join(' · '), en: [L.title.en, L.artist.en, L.date.en, L.museum.en].join(' · ') };
  const imgLine = imageSourceHTML(L.source);   // 图片：… / Image: …
  const missing = file => ui(`（找不到 ${file}）`, `(Image not found: ${file})`);

  // 作品档案表：画家（生卒年）、画名、年份、材质、尺寸、收藏地、博物馆作品页
  const REC = [['artist', '画家（生卒年）', 'Artist (dates)'], ['title', '画名', 'Title'], ['date', '年份', 'Date'],
    ['medium', '材质', 'Medium'], ['dimensions', '尺寸', 'Dimensions'], ['collection', '收藏地', 'Collection'], ['url', '博物馆作品页', 'Museum page']];
  // 全部格子都空着时先不显示（等 Tia 提供数据）
  const hasRecord = S.record && REC.some(([k]) => k === 'url' ? S.record.url : S.record[k] && (S.record[k].zh || S.record[k].en));
  // 只显示已经有内容的行（空着的格子不显示）
  const recordHTML = () => !hasRecord ? '' : `<table class="record">${REC.map(([k, zh, en]) => {
    const v = S.record[k];
    const val = k === 'url' ? (v ? `<a href="${v}" target="_blank" rel="noopener">${ui('打开', 'Open')} ↗</a>` : '')
      : (v && (v.zh || v.en) ? bi(v, ' / ') : '');
    return val ? `<tr><th>${ui(zh, en)}</th><td>${val}</td></tr>` : '';
  }).join('')}</table>`;

  // 延伸阅读与来源（页面最底部）
  const readingItems = ((S.reading && S.reading.items) || []).filter(it => it.url && it.title && (it.title.zh || it.title.en));
  const readingHTML = !readingItems.length ? '' : `<section class="reading">
      <div class="section-title">${ui('延伸阅读与来源', 'Further reading and sources')}</div>
      <ul>${readingItems.map(it => `<li><a href="${it.url}" target="_blank" rel="noopener">${bi(it.title, ' / ')}</a> ↗</li>`).join('')}</ul>
    </section>`;

  const actHTML = (a, i) => `
    <section class="act" id="act${i + 1}">
      ${a.image ? `<img class="reveal" src="${a.image}" ${altAttr(a.alt || '')} />`
        : a.link ? `<a class="btn reveal" href="${a.link.href}" target="_blank" rel="noopener">${ui(a.link.label.zh, a.link.label.en)} ↗</a>` : ''}
      <p class="act-cap reveal">${a.caption ? `<span class="zh">${a.caption.zh}</span><span class="en">${a.caption.en}</span>` : ''}</p>
      <div class="act-text reveal">
        <h3><small>${a.kicker || ''}</small>${bi(a.title)}</h3>
        <p class="zh">${a.text.zh}</p>
        <p class="en">${a.text.en}</p>
      </div>
      <button class="btn reveal next" data-next="${i + 1 < E.acts.length ? 'act' + (i + 2) : 'actEnd'}">${ui('下一幕', 'Next')} ↓</button>
    </section>`;
  const museumLinks = (E.museums || []).map(id => R && R.museumById[id]).filter(m => m && m.url)
    .map(m => `<a class="btn" href="${m.url}" target="_blank" rel="noopener">${bi(m.name, ' · ')}</a>`).join('');

  // 下一个场景：同一系列里的下一幅（还没做的显示“即将开放”）
  let nextHTML = '';
  if (R && meta) {
    const col = R.collectionById[meta.collection];
    const order = col ? col.order : [];
    const nextId = order[order.indexOf(S.id) + 1];
    const next = nextId && R.sceneById[nextId];
    if (next) nextHTML = `<div class="section-title">${ui('下一个场景', 'Next scene')}</div><div class="next-scene">${sceneCard(R, next)}</div>`;
  }

  document.body.insertAdjacentHTML('beforeend', `
  <div class="grain"></div>
  <img id="vpOverlay" src="${P.image}" ${altAttr(P.alt || '')} />

  <div id="intro">
    <img id="introImg" src="${P.image}" ${altAttr(P.alt || '')} />
    <div id="introMissing" class="hidden">${missing(P.image)}</div>
    <div id="introBottom">
      <button id="enter" class="btn primary"><span class="zh">${S.enter.zh}</span><span class="en">${S.enter.en}</span></button>
      <div id="introInfo" class="panel"><div class="lbl">${bi(labelLine, ' / ')}</div><div>${imgLine}</div></div>
    </div>
  </div>
  <a id="sceneHome" href="${ROOT}">← ${ui('走进名画', 'Walk into Paintings')}</a>

  <div id="hint" class="panel"><span class="zh">${S.hint.zh}</span><span class="en-ui">${S.hint.en}</span></div>

  <div id="vpPanel" class="panel">
    <p><span class="zh">${S.viewpoint.text.zh}</span><span class="en">${S.viewpoint.text.en}</span></p>
    <label>${ui('原画叠加', 'Painting overlay')} <input id="vpSlider" type="range" min="0" max="100" value="0" aria-label="overlay" /> <span id="vpVal">0%</span></label>
  </div>

  <div id="tools" class="ui">
    <a class="btn" href="${ROOT}">← ${ui('走进名画', 'Home')}</a>
    <button class="btn" id="compareBtn">${ui('对照原画', 'Original painting')}</button>
    <button class="btn" id="shotBtn">${ui('拍一张', 'Snapshot')}</button>
    <div class="seg${S.projection === false ? ' hidden' : ''}" id="modeSwitch">
      <button data-mode="paint" class="on">${ui('原画质感', 'Painted')}</button>
      <button data-mode="flat">${ui('简笔画', 'Simple view')}</button>
    </div>
    ${S.exclusive && S.exclusive.options ? `<div class="seg" id="wallSwitch">${S.exclusive.options.map((o, i) =>
      `<button data-opt="${i}" class="${i === 0 ? 'on' : ''}">${ui(o.label.zh, o.label.en)}</button>`).join('')}</div>` : ''}
  </div>

  <div id="status" class="ui">
    <div id="progress" class="panel"></div>
    <button class="btn" id="soundBtn"></button>
    <div id="leftHint" class="panel hidden"></div>
    <button class="btn hidden" id="audioBtn"></button>
    <button class="btn primary hidden" id="endBtn">${ui('继续看故事', 'Continue the story')} →</button>
  </div>

  <div class="popup panel" id="compare">
    <button class="close" data-close="compare" aria-label="Close">×</button>
    <img src="${P.image}" ${altAttr(P.alt || '')} data-zoom="${(S.zoom && S.zoom.image) || P.image}" class="zoomable" />
    <p>${bi(labelLine, ' / ')}<br><small>${imgLine}</small></p>
    <p><button class="btn" data-zoom="${(S.zoom && S.zoom.image) || P.image}">${ui('放大看细节', 'Zoom in on details')}</button></p>
    ${hasRecord ? `<details class="rec-box"><summary>${ui('作品档案', 'Artwork record')}</summary>${recordHTML()}</details>` : ''}
  </div>
  <div class="popup panel" id="shot">
    <button class="close" data-close="shot" aria-label="Close">×</button>
    <img id="shotImg" ${altAttr({ zh: '你拍下的画面', en: 'Your snapshot' })} />
    <p><a id="shotSave" download="${S.id}.png">${ui('保存图片', 'Save image')}</a><br>${ui('手机上也可以长按图片保存', 'On phones, long-press the image to save')}</p>
  </div>
  <div id="flash"></div>

  <div id="card" class="panel">
    <button class="close" id="cardClose" aria-label="Close">×</button>
    <h3 id="cardTitle" class="zh"></h3>
    <div class="en-title" id="cardTitleEn"></div>
    <p id="cardZh" class="zh"></p>
    <p class="en" id="cardEn"></p>
  </div>

  <div id="zoom" class="hidden" role="dialog" aria-label="Zoom">
    <div id="zoomStage"><img id="zoomImg" ${altAttr(P.alt || '')} draggable="false" /></div>
    <button class="close" id="zoomClose" aria-label="Close">×</button>
    <div id="zoomBar" class="panel">
      <button id="zoomOut" aria-label="Zoom out">−</button><button id="zoomReset">${ui('还原', 'Reset')}</button><button id="zoomIn" aria-label="Zoom in">+</button>
    </div>
    <div id="zoomHint" class="panel">${ui('双指或滚轮放大，拖动查看细节', 'Pinch or scroll to zoom, drag to explore')}</div>
  </div>

  <div id="joy"><div id="knob"></div></div>
  <div id="langSwitch">${langSwitchHTML()}</div>

  <div id="gallery">
    ${E.acts.map(actHTML).join('')}
    <section class="act final" id="actEnd">
      <h2 class="reveal"><span class="zh">${E.final.zh}</span><small class="en">${E.final.en}</small></h2>
      <div class="versions" id="versions"></div>
      ${E.versions.filter(v => v.image).length > 1 ? `<div class="section-title">${ui('找不同', 'Spot the difference')}<small class="en">Compare two versions — drag left and right</small></div>
      <div class="cmp-pick"><select id="cmpA" aria-label="A"></select><span>↔</span><select id="cmpB" aria-label="B"></select></div>
      <div id="cmp">
        <img id="cmpImgA" ${altAttr({ zh: '版本 A', en: 'Version A' })} onerror="this.style.visibility='hidden'" onload="this.style.visibility='visible'" />
        <img id="cmpImgB" ${altAttr({ zh: '版本 B', en: 'Version B' })} onerror="this.style.visibility='hidden'" onload="this.style.visibility='visible'" />
        <div id="cmpLine"></div>
        <span class="cmp-tag" id="cmpTagA" style="left:8px"></span>
        <span class="cmp-tag" id="cmpTagB" style="right:8px"></span>
      </div>` : ''}
      ${hasRecord ? `<div class="section-title">${ui('作品档案', 'Artwork record')}<small class="en-sub">Artwork record</small></div>${recordHTML()}` : ''}
      <p class="zoom-row"><button class="btn" data-zoom="${(S.zoom && S.zoom.image) || P.image}">${ui('放大看细节', 'Zoom in on details')}</button></p>
      <div class="section-title">${ui('去看真迹', 'See the real paintings')}<small class="en-sub">See the real paintings</small></div>
      <div class="links">${museumLinks}</div>
      ${nextHTML}
      <div class="end-actions">
        ${E.exit && (!E.exit.scene || (R && R.sceneById[E.exit.scene] && R.sceneById[E.exit.scene].status === 'live')) ? `<a class="btn primary" href="${E.exit.href}">${ui(E.exit.label.zh, E.exit.label.en)} →</a>` : ''}
        <button class="btn" id="backRoom">← ${ui('回到房间', 'Back to the room')}</button>
        <a class="btn" href="${ROOT}">${ui('更多名画', 'More paintings')} →</a>
      </div>
      ${readingHTML}
      <div class="credit">${imgLine}<br>${creditHTML()}</div>
    </section>
  </div>`);
}

// ---------------------------------------------------------------------
// 2. 3D 场景和所有互动
// ---------------------------------------------------------------------
function run(S, R, meta) {
  const $ = id => document.getElementById(id);
  const C = S.colors;
  const col = v => (C[v] || v);   // "basin" 这类名字 → scene.json 里的颜色

  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouch) document.body.classList.add('touch');

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouch ? 1.5 : 2));   // 手机上稍微降低清晰度，保证流畅
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.line);
  const OUT = S.room.kind === 'outdoor';   // 户外场景（广场、街道）：没有墙和天花板，有天空
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, OUT ? 400 : 50);

  // ---------- 房间形状 ----------
  const RM = S.room, VIEW = { ...S.viewpoint, aspect: S.painting.width / S.painting.height };
  const H = RM.height, FRONT = RM.front, L = RM.left;
  const P2 = (a, d) => ({ x: (a || d)[0], z: (a || d)[1] });
  const BL = P2(RM.backLeft, [-1, -2]), BR = P2(RM.backRight, [1, -2]), RF = P2(RM.rightFront, [1, 1]);
  const backZ  = x => BL.z + (x - BL.x) / (BR.x - BL.x) * (BR.z - BL.z);
  const rightX = z => BR.x + (z - BR.z) / (RF.z - BR.z) * (RF.x - BR.x);
  const BACK_ROT  = -Math.atan2(BR.z - BL.z, BR.x - BL.x);
  const RIGHT_ROT = -Math.atan2(RF.z - BR.z, RF.x - BR.x);

  // ---------- 简化色块模式：程序生成的笔触纹理（几张小图，所有物体共用） ----------
  const TEX_SIZE = 256;
  const rnd = (a, b) => a + Math.random() * (b - a);
  function strokeCanvas(draw) {
    const cv = document.createElement('canvas'); cv.width = cv.height = TEX_SIZE;
    const g = cv.getContext('2d'); g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, TEX_SIZE, TEX_SIZE); g.lineCap = 'round';
    draw(g, TEX_SIZE);
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }
  function dab(g, x, y, angle, len, width, shade, alpha) {   // 一笔（画三遍、稍微错开，像一刷子里的几根毛）
    g.strokeStyle = `rgb(${shade[0]},${shade[1]},${shade[2]})`; g.globalAlpha = alpha; g.lineWidth = width;
    for (let k = -1; k <= 1; k++) {
      const ox = Math.sin(angle) * k * width * 0.35, oy = -Math.cos(angle) * k * width * 0.35;
      g.beginPath(); g.moveTo(x + ox, y + oy);
      g.quadraticCurveTo(x + ox + Math.cos(angle) * len * 0.5 + (Math.random() - 0.5) * 6, y + oy + Math.sin(angle) * len * 0.5 + (Math.random() - 0.5) * 6,
        x + ox + Math.cos(angle) * len, y + oy + Math.sin(angle) * len);
      g.stroke();
    }
  }
  function fill(g, s, count, fn) {   // 画满一张纹理（边缘重复画，保证无缝平铺）
    for (let i = 0; i < count; i++) {
      const p = fn();
      for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) {
        if (Math.abs(p.x + ox - s / 2) > s * 0.75 || Math.abs(p.y + oy - s / 2) > s * 0.75) continue;
        dab(g, p.x + ox, p.y + oy, p.a, p.len, p.w, p.shade, p.alpha);
      }
    }
  }
  function shade(dark, light) {
    const r = Math.random();
    if (r < 0.45) { const v = rnd(dark, 240); return [v, v, v]; }
    if (r < 0.8) return [255, 255, 255];
    if (r < 0.9) return [rnd(light, 250), rnd(light, 250), 255];
    return [255, rnd(light, 250), rnd(light - 10, 240)];
  }
  const TEX = {
    wall: strokeCanvas((g, s) => fill(g, s, 260, () => ({ x: rnd(0, s), y: rnd(0, s), a: rnd(1.0, 1.9), len: rnd(18, 34), w: rnd(4, 8), shade: shade(215, 225), alpha: rnd(0.2, 0.4) }))),
    wood: strokeCanvas((g, s) => fill(g, s, 140, () => ({ x: rnd(0, s), y: rnd(0, s), a: rnd(-0.08, 0.08), len: rnd(50, 110), w: rnd(3, 7), shade: shade(200, 220), alpha: rnd(0.3, 0.5) }))),
    cloth: strokeCanvas((g, s) => fill(g, s, 220, () => ({ x: rnd(0, s), y: rnd(0, s), a: Math.random() < 0.5 ? rnd(0.5, 0.9) : rnd(2.2, 2.6), len: rnd(12, 24), w: rnd(4, 7), shade: shade(210, 225), alpha: rnd(0.25, 0.45) }))),
    ground: strokeCanvas((g, s) => fill(g, s, 200, () => ({ x: rnd(0, s), y: rnd(0, s), a: rnd(-0.4, 0.4), len: rnd(20, 50), w: rnd(4, 8), shade: shade(200, 220), alpha: rnd(0.25, 0.45) }))),
    floor: strokeCanvas((g, s) => {
      fill(g, s, 160, () => ({ x: rnd(0, s), y: rnd(0, s), a: rnd(1.45, 1.7), len: rnd(40, 90), w: rnd(3, 6), shade: shade(205, 225), alpha: rnd(0.3, 0.5) }));
      g.globalAlpha = 0.55; g.strokeStyle = '#7fae86'; g.lineWidth = 4;
      for (const x of [40, 130, 210]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 6, s); g.stroke(); }
    })
  };
  const gradient = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter; gradient.needsUpdate = true;
  const matCache = {};
  function paint(color, tex = 'wood') {
    const key = color + (typeof tex === 'string' ? tex : tex.uuid);
    if (!matCache[key]) matCache[key] = new THREE.MeshToonMaterial({ color, gradientMap: gradient, map: typeof tex === 'string' ? TEX[tex] : tex });
    return matCache[key];
  }
  const outlineMat = new THREE.LineBasicMaterial({ color: C.line });
  const outlines = [];
  function outline(mesh) { const l = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 30), outlineMat); mesh.add(l); outlines.push(l); return mesh; }
  function box(w, h, d, color, x, y, z, parent = scene, tex = 'wood') {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(col(color), tex)); m.position.set(x, y, z); parent.add(outline(m)); return m;
  }
  function cyl(rt, rb, h, color, x, y, z, parent = scene) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 16), paint(col(color))); m.position.set(x, y, z); parent.add(outline(m)); return m;
  }
  function group(x, y, z, rotY = 0, card = null, parent = scene) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; if (card) g.userData.card = card; parent.add(g); return g;
  }
  const loader = new THREE.TextureLoader();
  function imageTex(src) { const t = loader.load(src); t.colorSpace = THREE.SRGBColorSpace; return t; }
  // 四边形（左上、左下、右下、右上），离墙 1 厘米，贴图
  function quad(pts, mat, card = null, lift = 0.012) {
    const v = pts.map(p => new THREE.Vector3(...p));
    const n = new THREE.Vector3().subVectors(v[1], v[0]).cross(new THREE.Vector3().subVectors(v[3], v[0])).normalize();
    const p = v.map(q => q.clone().addScaledVector(n, lift));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p.flatMap(q => q.toArray()), 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 1, 1], 2));
    geo.setIndex([0, 1, 2, 0, 2, 3]); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); if (card) m.userData.card = card; scene.add(outline(m)); return m;
  }

  // ---------- 地板、墙、天花板（室内）/ 地面和天空（户外） ----------
  const fadeOpts = S.exclusive && S.exclusive.type === 'wallFade' ? S.exclusive.options : [{ color: '#cccccc', tint: 0 }];
  const wallMat = new THREE.MeshToonMaterial({ color: fadeOpts[0].color, gradientMap: gradient, map: TEX.wall });
  let ceil = null;
  if (!OUT) {
    const plan = new THREE.Shape();
    plan.moveTo(L, -FRONT); plan.lineTo(RF.x, -RF.z); plan.lineTo(BR.x, -BR.z); plan.lineTo(BL.x, -BL.z); plan.closePath();
    const floor = new THREE.Mesh(new THREE.ShapeGeometry(plan), paint(C.floor, 'floor'));
    floor.rotation.x = -Math.PI / 2; floor.userData.card = 'floor'; scene.add(floor);
    ceil = new THREE.Mesh(new THREE.ShapeGeometry(plan), new THREE.MeshBasicMaterial({ color: C.ceiling, map: TEX.wall, side: THREE.DoubleSide }));
    ceil.rotation.x = -Math.PI / 2; ceil.position.y = H; scene.add(ceil);

    function wall(x1, z1, x2, z2) {
      const len = Math.hypot(x2 - x1, z2 - z1), geo = new THREE.PlaneGeometry(len, H), uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len, uv.getY(i) * H);
      const m = new THREE.Mesh(geo, wallMat);
      m.position.set((x1 + x2) / 2, H / 2, (z1 + z2) / 2); m.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
      m.userData.card = 'wall'; m.userData.isWall = true; scene.add(m);
      box(len, 0.03, 0.03, C.line, 0, -H / 2 + 0.015, 0.015, m);
    }
    wall(BL.x, BL.z, BR.x, BR.z); wall(BR.x, BR.z, RF.x, RF.z); wall(RF.x, RF.z, L, FRONT); wall(L, FRONT, BL.x, BL.z);
    for (const p of [BL, BR, RF, { x: L, z: FRONT }]) box(0.03, H, 0.03, C.line, p.x, H / 2, p.z);
  } else {
    const G = RM.ground;   // [x0, x1, z0, z1]
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(G[1] - G[0], G[3] - G[2]), paint(C.ground, 'ground'));
    ground.material.map.repeat.set((G[1] - G[0]) / 4, (G[3] - G[2]) / 4);
    ground.rotation.x = -Math.PI / 2; ground.position.set((G[0] + G[1]) / 2, 0, (G[2] + G[3]) / 2);
    ground.userData.card = RM.groundCard || null; scene.add(ground);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(RM.skyRadius || 150, 32, 16), new THREE.MeshBasicMaterial({ color: C.sky, side: THREE.BackSide }));
    sky.userData.card = RM.skyCard || null; sky.userData.isSky = true; scene.add(sky);
  }

  let cornerHit = null;
  if (RM.cornerHotspot) {
    const ch = RM.cornerHotspot;
    cornerHit = new THREE.Mesh(new THREE.CylinderGeometry(ch.radius, ch.radius, H, 12), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    cornerHit.position.set(ch.at[0], H / 2, ch.at[1]); cornerHit.userData.card = ch.card; cornerHit.userData.noPaint = true; scene.add(cornerHit);
  }

  // ---------- 家具和墙上的东西（种类见下面 BUILD） ----------
  const blocks = [];   // 走路时不能穿过的地方
  const wallFrame = (wallName, x, z) => wallName === 'back' ? { pos: [x, backZ(x) + 0.03], rot: BACK_ROT }
    : wallName === 'right' ? { pos: [rightX(z) - 0.03, z], rot: RIGHT_ROT } : { pos: [L + 0.03, z], rot: Math.PI / 2 };
  const BUILD = {
    picture(o) { quad(o.quad, paint('#ffffff', imageTex(o.image)), o.card); },
    window(o) {
      const q = o.quad, c = q.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]);
      const WW = Math.hypot(q[2][0] - q[1][0], q[2][2] - q[1][2]), WH = q[0][1] - q[1][1];
      const w = group(c[0], c[1], backZ(c[0]) + 0.03, BACK_ROT, o.card);
      box(WW - 0.06, WH - 0.06, 0.02, C.glass, 0, 0, -0.01, w, 'cloth');
      for (const s of [-1, 1]) {
        box(WW, 0.07, 0.06, C.window, 0, s * WH / 2, 0, w);
        box(0.07, WH, 0.06, C.window, s * WW / 2, 0, 0, w);
        box(0.04, WH, 0.05, C.window, s * 0.03, 0, 0.01, w);
      }
      for (const y of [-0.12 * WH, 0.22 * WH]) box(WW, 0.04, 0.05, C.window, 0, y, 0.01, w);
      box(WW + 0.15, 0.05, 0.14, C.window, 0, -WH / 2 - 0.04, 0.05, w);
    },
    wallBoxes(o) {
      const f = wallFrame(o.wall, o.x, o.z), g = group(f.pos[0], o.y, f.pos[1], f.rot, o.card);
      for (const [w, h, d, color, x, y, z, tex] of o.boxes) box(w, h, d, color, x, y, z, g, tex || 'wood');
    },
    door(o) {
      const f = wallFrame(o.wall, 0, o.z), g = group(f.pos[0], 0, f.pos[1], f.rot, o.card), w = o.width, h = o.height;
      box(w, h, 0.05, C.door, 0, h / 2, 0, g);
      box(w * 0.75, h * 0.38, 0.02, '#9a7dbd', 0, h * 0.7, 0.035, g);
      box(w * 0.75, h * 0.34, 0.02, '#9a7dbd', 0, h * 0.27, 0.035, g);
      cyl(0.03, 0.03, 0.06, C.line, w * 0.38, h * 0.48, 0.06, g).rotation.x = Math.PI / 2;
      box(w + 0.1, 0.06, 0.07, C.line, 0, h + 0.03, 0, g);
    },
    bed(o) {
      const FL = o.footLeft, FR = o.footRight, HL = o.headLeft;
      const BW = Math.hypot(FR[0] - FL[0], FR[1] - FL[1]), BLEN = Math.hypot(HL[0] - FL[0], HL[1] - FL[1]);
      const bed = group((FL[0] + FR[0]) / 2, 0, (FL[1] + FR[1]) / 2, Math.atan2(-(HL[0] - FL[0]), -(HL[1] - FL[1])), o.card);
      for (const sx of [-1, 1]) {
        box(0.1, 1.27, 0.1, C.wood, sx * BW / 2, 0.635, 0, bed);
        box(0.1, 1.07, 0.1, C.wood, sx * BW / 2, 0.535, -BLEN, bed);
        box(0.05, 0.3, BLEN, C.wood, sx * BW / 2, 0.38, -BLEN / 2, bed);
      }
      box(BW, 1.0, 0.07, C.wood, 0, 0.66, 0, bed);
      box(BW, 0.62, 0.06, C.wood, 0, 0.62, -BLEN, bed);
      box(BW - 0.08, 0.16, BLEN - 0.1, C.sheet, 0, 0.56, -BLEN / 2, bed, 'cloth');
      box(0.45, 0.16, 0.36, C.sheet, -0.24, 0.72, -BLEN + 0.3, bed, 'cloth');
      box(0.45, 0.16, 0.36, C.sheet, 0.24, 0.72, -BLEN + 0.3, bed, 'cloth');
      box(BW - 0.04, 0.1, BLEN * 0.62, C.quilt, 0, 0.67, -BLEN * 0.36, bed, 'cloth');
      box(0.04, 0.3, BLEN * 0.62, C.quilt, -BW / 2 - 0.01, 0.53, -BLEN * 0.36, bed, 'cloth');
      const xs = [FL[0], FR[0], HL[0], HL[0] + FR[0] - FL[0]], zs = [FL[1], FR[1], HL[1], HL[1] + FR[1] - FL[1]];
      blocks.push([Math.min(...xs) - 0.03, Math.max(...xs) + 0.03, Math.min(...zs) - 0.05, Math.max(...zs) + 0.04]);
    },
    chair(o) {
      const back = o.back, front = o.front, seatH = o.seat, backH = o.top;
      const cx = (back[0][0] + back[1][0] + front[0][0] + front[1][0]) / 4, cz = (back[0][1] + back[1][1] + front[0][1] + front[1][1]) / 4;
      const bm = [(back[0][0] + back[1][0]) / 2, (back[0][1] + back[1][1]) / 2], fm = [(front[0][0] + front[1][0]) / 2, (front[0][1] + front[1][1]) / 2];
      const s = Math.min(0.46, Math.hypot(back[0][0] - back[1][0], back[0][1] - back[1][1]));
      const g = group(cx, 0, cz, Math.atan2(fm[0] - bm[0], fm[1] - bm[1]), o.card);
      for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(0.025, 0.025, seatH, C.wood, lx * s / 2, seatH / 2, lz * s / 2, g);
      box(s + 0.05, 0.05, s + 0.05, C.seat, 0, seatH, 0, g, 'cloth');
      for (const lx of [-1, 1]) cyl(0.025, 0.025, backH - seatH, C.wood, lx * s / 2, (seatH + backH) / 2, -s / 2, g);
      for (const k of [0.35, 0.65, 0.92]) box(s, 0.04, 0.03, C.wood, 0, seatH + (backH - seatH) * k, -s / 2, g);
      for (const lz of [-1, 1]) box(s, 0.025, 0.025, C.wood, 0, seatH * 0.35, lz * s / 2, g);
      const r = s * 0.8; blocks.push([cx - r, cx + r, cz - r, cz + r]);
    },
    table(o) {
      const legs = [o.nearLeft, o.nearRight, o.farLeft, o.farRight];
      const tcx = legs.reduce((a, p) => a + p[0], 0) / 4, tcz = legs.reduce((a, p) => a + p[1], 0) / 4;
      const TW = Math.hypot(o.nearRight[0] - o.nearLeft[0], o.nearRight[1] - o.nearLeft[1]), TD = Math.hypot(o.farLeft[0] - o.nearLeft[0], o.farLeft[1] - o.nearLeft[1]);
      const t = group(tcx, 0, tcz, Math.atan2(-(o.nearRight[1] - o.nearLeft[1]), o.nearRight[0] - o.nearLeft[0]), o.card);
      box(TW + 0.16, 0.05, TD + 0.12, C.table, 0, 0.78, 0, t);
      box(TW + 0.04, 0.1, TD, C.table, 0, 0.7, 0, t);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.05, 0.76, 0.05, C.table, x * TW / 2, 0.38, z * TD / 2, t);
      for (const [rt, rb, h, color, x, y, z] of o.items || []) cyl(rt, rb, h, color, x, y, z, t);
      blocks.push([tcx - 0.45, tcx + 0.45, tcz - 0.45, tcz + 0.45]);
    }
  };
  // ---------- 户外用的物体：房子、树、铁路桥、街道、发光入口 ----------
  const named = {};   // 有 id 的物体（独家发现里的“淡出”会用到）
  const portals = [];
  Object.assign(BUILD, {
    // 一栋房子：x、z 是正面中间的位置，w 宽、d 深、h 高；windows 是正面（front）或右侧（side）上的窗和门
    building(o) {
      const g = group(o.x, 0, o.z, o.rot || 0, o.card);
      box(o.w, o.h, o.d, o.color, 0, o.h / 2, -o.d / 2, g, 'wall');
      if (o.roof) box(o.w + 0.3, 0.35, o.d + 0.3, o.roof, 0, o.h + 0.17, -o.d / 2, g);
      for (const wd of o.windows || []) {
        const side = wd.face === 'side', depth = 0.12;
        const b = side ? box(depth, wd.h, wd.w, wd.color, o.w / 2 + depth / 2 - 0.04, wd.y, -wd.x, g)
                       : box(wd.w, wd.h, depth, wd.color, wd.x, wd.y, depth / 2 - 0.04, g);
        if (wd.card) b.userData.card = wd.card;
        if (wd.portal) { b.userData.portal = wd.portal; portals.push({ mesh: b, ...wd.portal }); }
      }
      for (const [w, h, d, color, x, y, z, tex] of o.boxes || []) box(w, h, d, color, x, y, z, g, tex || 'wood');
      if (o.id) named[o.id] = g;
      if (o.solid !== false) {
        const c = Math.cos(o.rot || 0), sn = Math.sin(o.rot || 0), pts = [[-o.w / 2, 0], [o.w / 2, 0], [-o.w / 2, -o.d], [o.w / 2, -o.d]].map(([px, pz]) => [o.x + px * c + pz * sn, o.z - px * sn + pz * c]);
        blocks.push([Math.min(...pts.map(p => p[0])), Math.max(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[1]))]);
      }
    },
    tree(o) {
      const g = group(o.x, 0, o.z, 0, o.card);
      cyl(0.18, 0.25, o.h * 0.5, C.trunk || '#6b4a2e', 0, o.h * 0.25, 0, g);
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(o.r, 1), paint(col(o.color || 'leaves'), 'cloth'));
      m.position.y = o.h * 0.5 + o.r * 0.7; g.add(outline(m));
      blocks.push([o.x - 0.4, o.x + 0.4, o.z - 0.4, o.z + 0.4]);
    },
    // 铁路桥：从 x0 到 x1 横跨，桥面高 y，在 z 的位置
    bridge(o) {
      const g = group(0, 0, o.z, 0, o.card), span = o.x1 - o.x0;
      box(span, 0.8, 1.6, o.color, (o.x0 + o.x1) / 2, o.y + 0.4, 0, g);
      for (const t of o.piers || [0, 1]) box(1.0, o.y, 1.4, o.color, o.x0 + span * t, o.y / 2, 0, g);
      box(span, 0.15, 0.1, C.line, (o.x0 + o.x1) / 2, o.y + 0.9, 0.75, g);
    },
    // 街道：地上的一块长条（可以点）
    road(o) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(o.x1 - o.x0, o.z1 - o.z0), paint(col(o.color), 'ground'));
      m.rotation.x = -Math.PI / 2; m.position.set((o.x0 + o.x1) / 2, 0.01, (o.z0 + o.z1) / 2); m.userData.card = o.card; scene.add(m);
    },
    boxes(o) {
      const g = group(o.x, o.y || 0, o.z, o.rot || 0, o.card);
      for (const [w, h, d, color, x, y, z, tex] of o.boxes) box(w, h, d, color, x, y, z, g, tex || 'wood');
      if (o.id) named[o.id] = g;
    }
  });
  for (const o of S.objects) { if (BUILD[o.type]) BUILD[o.type](o); else console.warn('unknown object type', o.type); }

  // 发光入口：门上的光 + 上方的文字牌，点一下去另一个场景
  function labelSprite(text2) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
    const g = cv.getContext('2d');
    g.fillStyle = 'rgba(28,28,30,.72)'; g.beginPath(); g.roundRect(4, 4, 504, 120, 60); g.fill();
    g.fillStyle = '#fff3b0'; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (text2.length === 1) { g.font = '500 44px sans-serif'; g.fillText(text2[0], 256, 66); }
    else { g.font = '500 38px sans-serif'; g.fillText(text2[0], 256, 44); g.font = '30px sans-serif'; g.fillText(text2[1], 256, 92); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const portalLabelText = pt => lang === 'en' ? [pt.label.en] : lang === 'zh' ? [pt.label.zh] : [pt.label.zh, pt.label.en];
  scene.updateMatrixWorld(true);
  for (const pt of portals) {
    pt.mesh.material = new THREE.MeshBasicMaterial({ color: '#ffe27a', transparent: true, opacity: 0.9 });
    pt.mesh.userData.noPaint = true;
    const wp = new THREE.Vector3(); pt.mesh.getWorldPosition(wp);
    pt.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelSprite(portalLabelText(pt)), depthTest: false, transparent: true, sizeAttenuation: false }));
    pt.sprite.scale.set(0.3, 0.075, 1);   // 不管远近，文字牌在屏幕上一样大
    pt.sprite.position.set(wp.x, wp.y + 1.9, wp.z + 0.3); pt.sprite.userData.noPaint = true; pt.sprite.userData.portal = pt.mesh.userData.portal;
    scene.add(pt.sprite);
  }
  onLang(() => portals.forEach(pt => { pt.sprite.material.map.dispose(); pt.sprite.material.map = labelSprite(portalLabelText(pt)); }));
  // 独家发现“淡出”：把指定的物体（比如黄房子）慢慢变透明
  const fadeObj = S.exclusive && S.exclusive.type === 'fadeObject' ? S.exclusive : null;
  const fadeMeshes = [];
  let fadeTarget = 0, fadeNow = 0;
  if (fadeObj) for (const id of fadeObj.targets) named[id] && named[id].traverse(o => {
    if (!o.material) return;
    o.material = o.material.clone(); o.material.transparent = true; fadeMeshes.push(o);
  });
  function goPortal(pt) { const f = $('flash'); f.style.transition = 'opacity .6s'; f.style.opacity = 1; setTimeout(() => { location.href = pt.href; }, 600); }

  // ---------- 柔和的光（简化色块模式用） ----------
  scene.add(new THREE.HemisphereLight('#fff4d6', '#b5533c', 1.6));
  scene.add(new THREE.AmbientLight('#ffffff', 0.6));
  const sun = new THREE.DirectionalLight('#fff1c4', 1.2);
  if (OUT) sun.position.set(-30, 60, 20); else sun.position.set(-0.3, 2.2, BL.z - 2);
  sun.target.position.set(0.5, 0, -1); scene.add(sun, sun.target);

  // ---------- 画家视角点：地上的发光圆点 ----------
  const vpRing = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.3, 48), new THREE.MeshBasicMaterial({ color: '#ffe27a', transparent: true, opacity: 0.85, depthWrite: false }));
  vpRing.rotation.x = -Math.PI / 2; vpRing.position.set(VIEW.x, 0.01, VIEW.z);
  const vpDot = new THREE.Mesh(new THREE.CircleGeometry(0.2, 48), new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0.35, depthWrite: false }));
  vpDot.rotation.x = -Math.PI / 2; vpDot.position.set(VIEW.x, 0.011, VIEW.z);
  vpRing.userData.noPaint = vpDot.userData.noPaint = true;
  scene.add(vpRing, vpDot);

  // ---------- 投影贴图：把原画从画家视角“投”到墙、地板和家具上 ----------
  const projector = new THREE.PerspectiveCamera(VIEW.fov, VIEW.aspect, 0.3, 14);
  projector.position.set(VIEW.x, VIEW.eye, VIEW.z);
  projector.rotation.set(VIEW.pitch, -VIEW.yaw, 0, 'YXZ');
  projector.updateMatrixWorld(); projector.updateProjectionMatrix();
  const paintingTex = imageTex(S.painting.image); paintingTex.anisotropy = 4;
  const depthRT = new THREE.WebGLRenderTarget(1024, 812);
  depthRT.depthTexture = new THREE.DepthTexture(1024, 812); depthRT.depthTexture.type = THREE.UnsignedIntType;
  const projUniforms = {
    uPaint: { value: paintingTex }, uDepth: { value: depthRT.depthTexture },
    uProjVP: { value: new THREE.Matrix4().multiplyMatrices(projector.projectionMatrix, projector.matrixWorldInverse) },
    uProjPos: { value: projector.position.clone() }, uNear: { value: projector.near }, uFar: { value: projector.far }, uViolet: { value: 0 }
  };
  const projVert = `
    varying vec3 vWorld; varying vec3 vNormal; varying vec2 vUv; uniform vec2 uRepeat;
    void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; vNormal = normalize(mat3(modelMatrix) * normal); vUv = uv * uRepeat; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const projFrag = `
    uniform sampler2D uPaint; uniform sampler2D uDepth; uniform sampler2D uMap;
    uniform mat4 uProjVP; uniform vec3 uProjPos; uniform float uNear; uniform float uFar;
    uniform vec3 uBase; uniform float uWall; uniform float uViolet; uniform float uDouble; uniform float uAlpha;
    varying vec3 vWorld; varying vec3 vNormal; varying vec2 vUv;
    float linDepth(float d) { float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
    void main() {
      vec3 n = normalize(vNormal);
      if (uDouble > 0.5 && !gl_FrontFacing) n = -n;
      float l = 0.78 + 0.22 * max(dot(n, normalize(vec3(0.3, 1.0, 0.5))), 0.0);
      vec3 col = uBase * texture2D(uMap, vUv).rgb * l;            // 投影照不到的地方：简化颜色
      vec4 pc = uProjVP * vec4(vWorld, 1.0);
      if (pc.w > 0.0) {
        vec3 ndc = pc.xyz / pc.w; vec2 uv = ndc.xy * 0.5 + 0.5;
        if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0 && ndc.z < 1.0) {
          float sceneD = linDepth(texture2D(uDepth, uv).r), myD = linDepth(ndc.z * 0.5 + 0.5);
          if (myD <= sceneD + 0.05 && dot(n, normalize(uProjPos - vWorld)) > 0.0) col = texture2D(uPaint, uv).rgb;   // 照到了：显示原画
        }
      }
      if (uWall > 0.5) {   // 褪色开关：把墙上偏蓝的颜色加回一点红色
        float blueish = smoothstep(0.0, 0.12, col.b - col.r);
        col = mix(col, vec3(min(col.r + 0.28 * col.b, 1.0), col.g * 0.88, col.b), uViolet * blueish);
      }
      gl_FragColor = vec4(col, uAlpha);
      #include <colorspace_fragment>
    }`;
  const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); white.needsUpdate = true;
  const projCache = new Map();
  function projMaterial(toon, isWall, doubleSide) {
    const key = toon.uuid + isWall + doubleSide;
    if (!projCache.has(key)) {
      const map = toon.map || white;
      projCache.set(key, new THREE.ShaderMaterial({
        uniforms: { ...projUniforms, uMap: { value: map }, uRepeat: { value: map.repeat ? map.repeat.clone() : new THREE.Vector2(1, 1) },
                    uBase: { value: toon.color.clone() }, uWall: { value: isWall ? 1 : 0 }, uDouble: { value: doubleSide ? 1 : 0 }, uAlpha: { value: 1 } },
        vertexShader: projVert, fragmentShader: projFrag, side: doubleSide ? THREE.DoubleSide : THREE.FrontSide, transparent: !!toon.transparent
      }));
    }
    return projCache.get(key);
  }
  const solids = [];
  scene.traverse(o => {
    if (!o.isMesh || o.userData.noPaint || o.userData.isSky) return;
    o.userData.flatMat = o.material;
    o.userData.paintMat = projMaterial(o.material, !!o.userData.isWall, o === ceil);
    solids.push(o);
  });
  const PROJ = S.projection !== false;   // 原画投影：画家视角和 3D 形状对准以后才打开
  if (PROJ) (function renderProjectorDepth() {   // 从投影仪的位置拍一次“深度图”，判断哪些表面被挡住（只拍一次）
    const hidden = [cornerHit, vpRing, vpDot, ...outlines, ...portals.map(p => p.sprite)].filter(Boolean);
    hidden.forEach(o => o.visible = false);
    scene.overrideMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    renderer.setRenderTarget(depthRT); renderer.render(scene, projector); renderer.setRenderTarget(null);
    scene.overrideMaterial = null;
    hidden.forEach(o => o.visible = true);
  })();
  function setMode(m) {
    for (const o of solids) o.material = m === 'paint' ? o.userData.paintMat : o.userData.flatMat;
    for (const l of outlines) l.visible = m === 'flat';
    document.querySelectorAll('#modeSwitch button').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
  }
  setMode(PROJ ? 'paint' : 'flat');
  document.querySelectorAll('#modeSwitch button').forEach(b => b.onclick = () => setMode(b.dataset.mode));

  // ---------- 第一人称：走动和转视角 ----------
  const player = { x: VIEW.x, z: VIEW.z + 0.18, yaw: VIEW.yaw, pitch: VIEW.pitch, eye: VIEW.eye, r: 0.22 };
  let walking = false;
  const keys = {};
  window.addEventListener('keydown', e => { keys[e.code] = true; });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  function blocked(x, z) {
    const r = player.r;
    if (OUT) { const b = RM.bounds; if (x < b[0] + r || x > b[1] - r || z < b[2] + r || z > b[3] - r) return true; }
    else if (x < L + r || x > rightX(z) - r || z > FRONT - r || z < backZ(x) + r) return true;
    for (const [x0, x1, z0, z1] of blocks) if (x > x0 - r && x < x1 + r && z > z0 - r && z < z1 + r) return true;
    return false;
  }
  let dragId = null, lastX = 0, lastY = 0, downX = 0, downY = 0;
  renderer.domElement.addEventListener('pointerdown', e => { dragId = e.pointerId; lastX = downX = e.clientX; lastY = downY = e.clientY; });
  window.addEventListener('pointermove', e => {
    if (e.pointerId !== dragId || !walking) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) { hideHint(); leaveView(); }
    player.yaw += (e.clientX - lastX) * 0.005;
    player.pitch = Math.max(-1.3, Math.min(1.3, player.pitch - (e.clientY - lastY) * 0.005));
    lastX = e.clientX; lastY = e.clientY;
  });
  window.addEventListener('pointerup', e => {
    if (e.pointerId !== dragId) return;
    dragId = null;
    if (walking && Math.hypot(e.clientX - downX, e.clientY - downY) < 8) { pick(e.clientX, e.clientY); hideHint(); }
  });
  window.addEventListener('pointercancel', e => { if (e.pointerId === dragId) dragId = null; });

  // ---------- 发现卡片 + 进度 ----------
  const raycaster = new THREE.Raycaster(), card = $('card');
  function pick(cx, cy) {
    raycaster.setFromCamera(new THREE.Vector2(cx / window.innerWidth * 2 - 1, -(cy / window.innerHeight) * 2 + 1), camera);
    const shown = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
    const hit = raycaster.intersectObjects(scene.children, true).find(h => (h.object.isMesh || h.object.isSprite) && h.object !== vpRing && h.object !== vpDot && shown(h.object) && !(h.object.userData.fade > 0.5));
    let obj = hit && hit.object;
    if (obj && obj.userData.portal) { goPortal(obj.userData.portal); return; }
    while (obj && !obj.userData.card) obj = obj.parent;
    if (obj && S.cards[obj.userData.card]) showCard(obj.userData.card); else card.style.display = 'none';
  }
  const found = new Set(), TOTAL = Object.keys(S.cards).length, UNLOCK = S.ending.unlockAfter ?? TOTAL;
  function updateProgress() {
    $('progress').textContent = (lang === 'en' ? 'Found ' : '已发现 ') + `${found.size}/${TOTAL}`;
    const left = TOTAL - found.size, show = found.size >= UNLOCK;
    $('endBtn').classList.toggle('hidden', !show);
    $('leftHint').classList.toggle('hidden', !show || left === 0);
    $('leftHint').innerHTML = `<span class="zh">还有 ${left} 个没发现</span><span class="en"><span class="zh"> / </span>${left} left to find</span>`;
  }
  function showCard(key) {
    const t = S.cards[key];
    $('cardTitle').textContent = t.title.zh; $('cardTitleEn').textContent = t.title.en;
    $('cardZh').textContent = t.text.zh; $('cardEn').textContent = t.text.en;
    card.style.display = 'block';
    found.add(key); updateProgress();
  }
  $('cardClose').onclick = () => { card.style.display = 'none'; };

  // ---------- 弹窗 ----------
  const popups = { compare: $('compare'), shot: $('shot') };
  function togglePopup(name, show) {
    for (const k in popups) if (k !== name) popups[k].style.display = 'none';
    const el = popups[name]; el.style.display = (show ?? el.style.display !== 'block') ? 'block' : 'none';
  }
  $('compareBtn').onclick = () => togglePopup('compare');
  document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => togglePopup(b.dataset.close, false));
  // 图片真的加载失败时，才换成“找不到”的提示
  function onMissing(img, text, cls = 'missing') {
    const fail = () => { if (!img.isConnected) return; const d = document.createElement('div'); d.className = cls; d.innerHTML = text; img.replaceWith(d); };
    img.addEventListener('error', fail, { once: true });
    if (img.loading !== 'lazy' && img.complete && img.getAttribute('src') && img.naturalWidth === 0) fail();
  }
  const missing = file => ui(`（找不到 ${file}）`, `(Image not found: ${file})`);
  onMissing($('compare').querySelector('img'), missing(S.painting.image));
  document.querySelectorAll('.act img').forEach(img => onMissing(img, missing(img.getAttribute('src')), 'ph reveal'));

  // ---------- 独家发现：褪色开关 ----------
  const wallTarget = new THREE.Color(fadeOpts[0].color);
  let violetTarget = fadeOpts[0].tint || 0;
  document.querySelectorAll('#wallSwitch button').forEach(b => b.onclick = () => {
    document.querySelectorAll('#wallSwitch button').forEach(x => x.classList.toggle('on', x === b));
    const o = S.exclusive.options[+b.dataset.opt];
    if (fadeObj) fadeTarget = o.fade || 0; else { wallTarget.set(o.color); violetTarget = o.tint || 0; }
  });

  // ---------- 拍一张 ----------
  $('shotBtn').onclick = () => {
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    $('shotImg').src = url; $('shotSave').href = url;
    const f = $('flash'); f.style.transition = 'none'; f.style.opacity = 0.35;   // 轻轻一亮，不闪烁
    requestAnimationFrame(() => { f.style.transition = 'opacity .8s'; f.style.opacity = 0; });
    togglePopup('shot', true);
  };

  // ---------- 声音：用代码现场合成（默认静音，无版权问题） ----------
  let actx = null, master = null, soundOn = false, birdTimer = null;
  const soundLabel = () => { $('soundBtn').innerHTML = ui(soundOn ? '声音：开' : '声音：关', soundOn ? 'Sound: on' : 'Sound: off'); };
  function setupAudio() {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain(); master.gain.value = 0; master.connect(actx.destination);
    const len = actx.sampleRate * 3, buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const wind = actx.createBufferSource(); wind.buffer = buf; wind.loop = true;
    const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 450;
    const wg = actx.createGain(); wg.gain.value = 0.35;
    wind.connect(lp).connect(wg).connect(master); wind.start();
  }
  function chirp(t, f0, f1, dur, vol, pan) {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o.connect(g);
    if (actx.createStereoPanner) { const p = actx.createStereoPanner(); p.pan.value = pan; node = node.connect(p); }
    node.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function birdCall() {
    const t0 = actx.currentTime + 0.05, n = 2 + Math.floor(Math.random() * 5);
    const base = 2600 + Math.random() * 2200, gap = 0.09 + Math.random() * 0.08, pan = Math.random() * 1.6 - 0.8;
    for (let k = 0; k < n; k++) { const up = Math.random() < 0.5; chirp(t0 + k * gap, base * (up ? 0.8 : 1.2), base * (up ? 1.25 : 0.75), 0.06 + Math.random() * 0.05, 0.05, pan); }
  }
  function scheduleBird() { birdTimer = setTimeout(() => { if (soundOn) { birdCall(); scheduleBird(); } }, 1500 + Math.random() * 4500); }
  function setSound(on) {
    soundOn = on; soundLabel();
    if (on) { if (!actx) setupAudio(); actx.resume(); master.gain.setTargetAtTime(0.7, actx.currentTime, 0.4); clearTimeout(birdTimer); birdCall(); scheduleBird(); }
    else if (actx) { master.gain.setTargetAtTime(0, actx.currentTime, 0.2); clearTimeout(birdTimer); }
  }
  soundLabel();
  if (S.sound) $('soundBtn').onclick = () => setSound(!soundOn); else $('soundBtn').classList.add('hidden');
  document.addEventListener('visibilitychange', () => { if (actx && soundOn) document.hidden ? actx.suspend() : actx.resume(); });

  // ---------- 语音导览（scene.json 的 audioGuide 填了录音文件才显示按钮） ----------
  const AG = S.audioGuide || {};
  let guide = null;
  const guideSrc = () => (lang === 'en' ? (AG.en || AG.zh) : (AG.zh || AG.en)) || '';
  const guideLabel = () => {
    const playing = guide && !guide.paused;
    $('audioBtn').innerHTML = playing ? ui('❚❚ 暂停导览', '❚❚ Pause guide') : ui('▶ 语音导览', '▶ Audio guide');
  };
  if (AG.zh || AG.en) {
    $('audioBtn').classList.remove('hidden');
    $('audioBtn').onclick = () => {
      const src = guideSrc();
      if (!guide || guide.dataset.src !== src) {
        if (guide) guide.pause();
        guide = new Audio(src); guide.dataset.src = src;
        guide.onended = guide.onpause = guide.onplay = guideLabel;
      }
      guide.paused ? guide.play() : guide.pause();
    };
  }
  guideLabel();

  // ---------- 细节放大：双指 / 滚轮放大，拖动查看 ----------
  const zoom = $('zoom'), zStage = $('zoomStage'), zImg = $('zoomImg'), Z_MAX = 6;
  let zs = 1, zx = 0, zy = 0, zbw = 0, zbh = 0, zWasWalking = false, lastTap = 0;
  const zPtrs = new Map();
  let zPrev = null;   // 上一次两指的距离和中点
  function zFit() {
    const W = zStage.clientWidth, Hh = zStage.clientHeight, a = (zImg.naturalWidth || 4) / (zImg.naturalHeight || 3);
    if (W / Hh > a) { zbh = Hh; zbw = Hh * a; } else { zbw = W; zbh = W / a; }
    zImg.style.width = zbw + 'px'; zImg.style.height = zbh + 'px';
  }
  function zApply() {   // 不让图片被拖出画面
    const W = zStage.clientWidth, Hh = zStage.clientHeight, w = zbw * zs, h = zbh * zs;
    zx = w <= W ? (W - w) / 2 : Math.min(0, Math.max(W - w, zx));
    zy = h <= Hh ? (Hh - h) / 2 : Math.min(0, Math.max(Hh - h, zy));
    zImg.style.transform = `translate(${zx}px, ${zy}px) scale(${zs})`;
  }
  function zoomAt(ns, cx, cy) {   // 以手指 / 鼠标所在的点为中心放大
    ns = Math.max(1, Math.min(Z_MAX, ns));
    const r = zStage.getBoundingClientRect(), px = cx - r.left, py = cy - r.top;
    zx = px - (px - zx) * ns / zs; zy = py - (py - zy) * ns / zs; zs = ns; zApply();
  }
  function zReset() { zFit(); zs = 1; zApply(); }
  const zCenter = () => { const r = zStage.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  function openZoom(src) {
    zWasWalking = walking; walking = false; for (const k in keys) keys[k] = false;
    zoom.classList.remove('hidden');
    if (zImg.getAttribute('src') !== src) { zImg.onload = zReset; zImg.src = src; }
    zReset();
  }
  function closeZoom() { zoom.classList.add('hidden'); zPtrs.clear(); walking = zWasWalking; }
  document.addEventListener('click', e => { const t = e.target.closest('[data-zoom]'); if (t) openZoom(t.dataset.zoom); });
  $('zoomClose').onclick = closeZoom;
  $('zoomIn').onclick = () => zoomAt(zs * 1.6, ...zCenter());
  $('zoomOut').onclick = () => zoomAt(zs / 1.6, ...zCenter());
  $('zoomReset').onclick = zReset;
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && !zoom.classList.contains('hidden')) closeZoom(); });
  zStage.addEventListener('wheel', e => { e.preventDefault(); zoomAt(zs * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY); }, { passive: false });
  zStage.addEventListener('pointerdown', e => {
    zStage.setPointerCapture(e.pointerId); zPtrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); zPrev = null;
    const now = performance.now();   // 双击 / 双击屏幕：放大或还原
    if (zPtrs.size === 1 && now - lastTap < 300) { zs > 1.05 ? zReset() : zoomAt(2.5, e.clientX, e.clientY); lastTap = 0; } else lastTap = now;
  });
  zStage.addEventListener('pointermove', e => {
    const p = zPtrs.get(e.pointerId); if (!p) return;
    if (zPtrs.size === 1) { zx += e.clientX - p.x; zy += e.clientY - p.y; zApply(); }
    p.x = e.clientX; p.y = e.clientY;
    if (zPtrs.size === 2) {
      const [a, b] = [...zPtrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (zPrev) { zx += mx - zPrev.mx; zy += my - zPrev.my; zoomAt(zs * d / zPrev.d, mx, my); }
      zPrev = { d, mx, my };
    }
  });
  const zUp = e => { zPtrs.delete(e.pointerId); zPrev = null; };
  zStage.addEventListener('pointerup', zUp); zStage.addEventListener('pointercancel', zUp);

  // ---------- 手机摇杆 ----------
  const joy = $('joy'), knob = $('knob'), joyMove = { x: 0, y: 0 };
  let joyId = null;
  function setKnob(e) {
    const rect = joy.getBoundingClientRect();
    let dx = e.clientX - (rect.left + rect.width / 2), dy = e.clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy), max = 40;
    if (len > max) { dx *= max / len; dy *= max / len; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`; joyMove.x = dx / max; joyMove.y = dy / max;
  }
  joy.addEventListener('pointerdown', e => { joyId = e.pointerId; joy.setPointerCapture(joyId); setKnob(e); hideHint(); });
  joy.addEventListener('pointermove', e => { if (e.pointerId === joyId) setKnob(e); });
  const joyEnd = e => { if (e.pointerId !== joyId) return; joyId = null; joyMove.x = joyMove.y = 0; knob.style.transform = ''; };
  joy.addEventListener('pointerup', joyEnd); joy.addEventListener('pointercancel', joyEnd);
  const hint = $('hint');
  let hintHidden = false;
  function hideHint() { if (!hintHidden) { hintHidden = true; setTimeout(() => hint.style.opacity = 0, 2500); } }

  // ---------- 画家视角：站上去 → 对准原画构图 + 叠加滑杆 ----------
  function paintingRect() {
    const W = window.innerWidth, Hh = window.innerHeight, A = W / Hh;
    if (A >= VIEW.aspect) { const w = Hh * VIEW.aspect; return { x: (W - w) / 2, y: 0, w, h: Hh, fov: VIEW.fov }; }
    const h = W / VIEW.aspect, fov = 2 * Math.atan(Math.tan(VIEW.fov * Math.PI / 360) * VIEW.aspect / A) * 180 / Math.PI;
    return { x: 0, y: (Hh - h) / 2, w: W, h, fov };
  }
  function placeRect(el) { const r = paintingRect(); Object.assign(el.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' }); }
  const vpOverlay = $('vpOverlay'), vpPanel = $('vpPanel'), vpSlider = $('vpSlider');
  vpSlider.oninput = () => { vpOverlay.style.opacity = vpSlider.value / 100; $('vpVal').textContent = vpSlider.value + '%'; };
  let view = 'none', needExit = false, alignFrom = null, alignT = 0;
  function enterView() { view = 'aligning'; alignT = 0; alignFrom = { x: player.x, z: player.z, yaw: player.yaw, pitch: player.pitch, fov: camera.fov }; }
  function leaveView() { if (view === 'none') return; view = 'none'; needExit = true; vpPanel.classList.remove('show'); vpOverlay.style.display = 'none'; }
  function showAligned() { view = 'aligned'; placeRect(vpOverlay); vpOverlay.style.display = 'block'; vpPanel.classList.add('show'); }

  // ---------- 开场：原画（和 3D 画面完全重合）→ 淡出 → 站在画里 ----------
  const intro = $('intro'), introImg = $('introImg');
  placeRect(introImg);
  const introFail = () => { introImg.classList.add('hidden'); $('introMissing').classList.remove('hidden'); };
  introImg.addEventListener('error', introFail, { once: true });
  if (introImg.complete && introImg.naturalWidth === 0) introFail();
  camera.fov = paintingRect().fov; camera.updateProjectionMatrix();
  let introT = -1;
  $('enter').onclick = () => { intro.classList.add('fade'); introT = 0; };
  function finishIntro() {
    intro.style.display = 'none'; walking = true;
    document.body.classList.add('in-room'); hint.style.opacity = 1;
    player.x = VIEW.x; player.z = VIEW.z; showAligned();
  }
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const lerpAngle = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;

  // ---------- 结尾：三幕 + 最后一屏 ----------
  const gallery = $('gallery'), E = S.ending;
  for (const v of E.versions) {
    const fig = document.createElement('figure');
    if (!v.image && v.link) {   // 没有放在网站上的版本：链接到博物馆官网
      fig.innerHTML = `<a class="ph ext" href="${v.link.href}" target="_blank" rel="noopener">${ui(v.link.label.zh, v.link.label.en)} ↗</a><figcaption>${bi(v.caption, ' / ')}</figcaption>`;
      $('versions').append(fig); continue;
    }
    const img = document.createElement('img');
    img.src = v.image; img.loading = 'lazy'; img.className = 'zoomable'; img.dataset.zoom = v.image;
    img.dataset.altZh = textOf(v.caption, 'zh'); img.dataset.altEn = textOf(v.caption, 'en'); img.alt = textOf(v.caption, lang);
    onMissing(img, missing(v.image), 'ph');
    const cap = document.createElement('figcaption'); cap.innerHTML = bi(v.caption, ' / ');
    fig.append(img, cap); $('versions').append(fig);
  }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('seen'); }), { root: gallery, threshold: 0.25 });
  document.querySelectorAll('.act').forEach(a => io.observe(a));
  document.querySelectorAll('.next').forEach(b => b.onclick = () => $(b.dataset.next).scrollIntoView({ behavior: 'smooth' }));
  const cmp = $('cmp');   // 只有一个版本时没有“找不同”
  let setCmpImages = () => {};
  if (cmp) {
    const CV = E.versions.filter(v => v.image);   // 只对比放在网站上的图
    CV.forEach((v, i) => { $('cmpA').add(new Option('', i)); $('cmpB').add(new Option('', i)); });
    $('cmpA').value = 0; $('cmpB').value = Math.min(1, CV.length - 1);
    const imgA = $('cmpImgA'), imgB = $('cmpImgB'), line = $('cmpLine');
    setCmpImages = () => {
      const a = CV[$('cmpA').value], b = CV[$('cmpB').value];
      imgA.src = a.image; $('cmpTagA').textContent = textOf(a.short, lang);
      imgB.src = b.image; $('cmpTagB').textContent = textOf(b.short, lang);
      document.querySelectorAll('#cmpA option, #cmpB option').forEach(o => o.textContent = textOf(CV[o.value].short, lang));
    };
    $('cmpA').onchange = $('cmpB').onchange = setCmpImages;
    function setCmp(pct) { pct = Math.max(0, Math.min(100, pct)); imgB.style.clipPath = `inset(0 0 0 ${pct}%)`; line.style.left = pct + '%'; }
    let cmpDrag = false;
    const cmpAt = e => { const r = cmp.getBoundingClientRect(); setCmp((e.clientX - r.left) / r.width * 100); };
    cmp.addEventListener('pointerdown', e => { cmpDrag = true; cmp.setPointerCapture(e.pointerId); cmpAt(e); });
    cmp.addEventListener('pointermove', e => { if (cmpDrag) cmpAt(e); });
    cmp.addEventListener('pointerup', () => { cmpDrag = false; });
    cmp.addEventListener('pointercancel', () => { cmpDrag = false; });
    setCmpImages(); setCmp(50);
  }
  onLang(() => { updateProgress(); setCmpImages(); soundLabel(); guideLabel(); });
  updateProgress();

  $('endBtn').onclick = () => {
    walking = false; for (const k in keys) keys[k] = false;
    card.style.display = 'none'; togglePopup('compare', false); togglePopup('shot', false); leaveView();
    gallery.style.display = 'block';
    gallery.style.scrollBehavior = 'auto'; gallery.scrollTop = 0; gallery.style.scrollBehavior = '';
    requestAnimationFrame(() => gallery.classList.add('show'));
  };
  $('backRoom').onclick = () => { gallery.classList.remove('show'); setTimeout(() => { gallery.style.display = 'none'; walking = true; }, 900); };

  // ---------- 每一帧 ----------
  const clock = new THREE.Clock(), introZ = player.z;
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (gallery.classList.contains('show')) return;   // 在结尾页时不画 3D，省电
    if (introT >= 0 && !walking) {
      introT = Math.min(introT + dt / 1.6, 1);
      player.z = introZ + (VIEW.z - introZ) * ease(introT);
      if (introT >= 1) finishIntro();
    }
    if (walking) {
      let fwd = 0, side = 0;
      if (keys.KeyW || keys.ArrowUp) fwd += 1;
      if (keys.KeyS || keys.ArrowDown) fwd -= 1;
      if (keys.KeyD || keys.ArrowRight) side += 1;
      if (keys.KeyA || keys.ArrowLeft) side -= 1;
      fwd -= joyMove.y; side += joyMove.x;
      if (fwd || side) { hideHint(); leaveView(); }
      const speed = 1.4 * dt, sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
      const dx = (side * cos + fwd * sin) * speed, dz = (side * sin - fwd * cos) * speed;
      if (!blocked(player.x + dx, player.z)) player.x += dx;
      if (!blocked(player.x, player.z + dz)) player.z += dz;
      const dist = Math.hypot(player.x - VIEW.x, player.z - VIEW.z);
      if (dist > 0.5) needExit = false;
      if (view === 'none' && !needExit && dist < 0.3 && !fwd && !side) enterView();
    }
    if (view === 'aligning') {
      alignT = Math.min(alignT + dt, 1);
      const k = ease(alignT);
      player.x = alignFrom.x + (VIEW.x - alignFrom.x) * k; player.z = alignFrom.z + (VIEW.z - alignFrom.z) * k;
      player.yaw = lerpAngle(alignFrom.yaw, VIEW.yaw, k); player.pitch = alignFrom.pitch + (VIEW.pitch - alignFrom.pitch) * k;
      camera.fov = alignFrom.fov + (paintingRect().fov - alignFrom.fov) * k;
      if (alignT >= 1) showAligned();
    } else if (view === 'aligned' || !walking) camera.fov = paintingRect().fov;
    else camera.fov += (70 - camera.fov) * (1 - Math.exp(-dt * 3));
    camera.updateProjectionMatrix();
    const pulse = 0.55 + 0.35 * Math.sin(performance.now() / 600);   // 圆点慢慢呼吸
    vpRing.material.opacity = pulse; vpDot.material.opacity = pulse * 0.4;
    wallMat.color.lerp(wallTarget, 1 - Math.exp(-dt * 4));
    if (fadeObj && Math.abs(fadeTarget - fadeNow) > 0.001) {   // 慢慢淡出 / 淡入（约 2 秒）
      fadeNow += Math.sign(fadeTarget - fadeNow) * Math.min(Math.abs(fadeTarget - fadeNow), dt / 2);
      for (const m of fadeMeshes) {
        m.material.opacity = 1 - fadeNow; m.material.depthWrite = fadeNow < 0.05; m.userData.fade = fadeNow; m.visible = fadeNow < 0.99;
        if (m.userData.paintMat) m.userData.paintMat.uniforms.uAlpha.value = 1 - fadeNow;
      }
    }
    for (const pt of portals) {   // 入口慢慢呼吸；房子淡出时，入口也一起消失
      const f = pt.mesh.userData.fade || 0;
      pt.mesh.material.opacity = (0.55 + 0.4 * Math.sin(performance.now() / 500)) * (1 - f); pt.sprite.visible = f < 0.5;
    }
    projUniforms.uViolet.value += (violetTarget - projUniforms.uViolet.value) * (1 - Math.exp(-dt * 4));
    camera.position.set(player.x, player.eye, player.z);
    camera.rotation.set(player.pitch, -player.yaw, 0, 'YXZ');
    renderer.render(scene, camera);
  }
  loop();
  // 测试用：地址后面加 ?debug 时，可以在控制台里移动位置（普通访问不受影响）
  if (location.search.includes("debug")) window.__room = { player, setMode, leaveView, showCard, portals, camera };
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    placeRect(introImg); if (view === 'aligned') placeRect(vpOverlay);
    if (!zoom.classList.contains('hidden')) zReset();
  });
}
