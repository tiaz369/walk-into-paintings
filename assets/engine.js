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
import { bi, ui, textOf, altAttr, removeStatic, lang, onLang, wirePrefs, langSwitchHTML, creditHTML, imageSourceHTML, loadRegistry, sceneCard, seeInPersonHTML, cleanToggle, track, oneMinuteHTML, oneMinute, ROOT } from './site.js';
import { setupGuide } from './guide.js';
import { setupSound } from './sound.js';
import { variantOf, VARIANTS } from './variants.js';

export async function startScene(sceneUrl) {
  removeStatic();
  const S = await fetch(sceneUrl, { cache: 'no-cache' }).then(r => r.json());   // 每次都先确认有没有更新（不用等缓存过期）
  const R = await loadRegistry().catch(() => null);
  const meta = R && R.sceneById[S.id];
  // 还没开放的场景：先显示“即将开放”（地址后面加 ?preview 可以预览）
  if (meta && meta.status !== 'live' && !/preview|debug/.test(location.search)) {
    document.body.insertAdjacentHTML('beforeend', `<main class="wrap page-title"><h1>${bi(meta.title)}</h1>
      <p class="lead">${ui('即将开放', 'Coming soon')}</p><a class="btn primary" href="${ROOT}">${ui('回到走进名画', 'Back to Walk into Paintings')}</a></main>`);
    wirePrefs(); return;
  }
  track('enter-scene-' + S.id);   // 访问统计：打开了这个场景
  document.body.classList.add('scene');
  document.body.dataset.variant = variantOf(S);   // 场景变体：interior / outdoor / still-life / portrait（见 variants.js）
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
  const TW = S.compare || (S.exclusive && S.exclusive.type === 'compare' ? S.exclusive : null);   // 对比滑块（可以和另一个独家发现同时有）
  const labelLine = { zh: [L.title.zh, L.artist.zh, L.date.zh, L.museum.zh].join(' · '), en: [L.title.en, L.artist.en, L.date.en, L.museum.en].join(' · ') };
  const imgLine = imageSourceHTML(L.source);   // 图片：… / Image: …
  // 个别图片有自己的来源说明（比如奥赛的照片），页面底部也一起列出
  const extraCredits = [...new Map([...E.acts, ...E.versions].filter(x => x.credit).map(x => [x.credit.zh, bi(x.credit, ' / ')])).values()];
  const missing = file => ui(`（找不到 ${file}）`, `(Image not found: ${file})`);

  // 作品档案表：画家（生卒年）、画名、年份、材质、尺寸、收藏地、博物馆作品页
  const REC = [['artist', '画家（生卒年）', 'Artist (dates)'], ['title', '画名', 'Title'], ['date', '年份', 'Date'],
    ['medium', '材质', 'Medium'], ['dimensions', '尺寸', 'Dimensions'], ['collection', '收藏地', 'Collection'], ['creditLine', '来源说明', 'Credit line'], ['url', '博物馆作品页', 'Museum page']];
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

  const isLive = id => !id || !!(R && R.sceneById[id] && R.sceneById[id].status === 'live');
  // 站内链接按钮（比如“去看《夜晚露天咖啡座》”），目标场景开放后才显示
  const moreHTML = m => m && isLive(m.scene) ? `<p><a class="btn" href="${m.href}">${ui(m.label.zh, m.label.en)} →</a></p>` : '';
  const actHTML = (a, i) => `
    <section class="act" id="act${i + 1}">
      ${a.image ? `<img class="reveal" src="${a.image}" ${altAttr(a.alt || '')} />`
        : a.link ? `<a class="btn reveal" href="${a.link.href}" target="_blank" rel="noopener">${ui(a.link.label.zh, a.link.label.en)} ↗</a>` : ''}
      <p class="act-cap reveal">${a.caption ? `<span class="zh">${a.caption.zh}</span><span class="en">${a.caption.en}</span>` : ''}${a.credit ? `<small class="img-credit">${bi(a.credit, ' / ')}</small>` : ''}</p>
      <div class="act-text reveal">
        <h3><small>${a.kicker || ''}</small>${bi(a.title)}</h3>
        <p class="zh">${a.text.zh}</p>
        <p class="en">${a.text.en}</p>
        ${moreHTML(a.more)}
      </div>
      <button class="btn reveal next" data-next="${i + 1 < E.acts.length ? 'act' + (i + 2) : 'actEnd'}">${ui('下一幕', 'Next')} ↓</button>
    </section>`;
  // 关于画家：登记表里的画家简介（每个场景都一样），链接到画家页
  const artist = R && meta && R.artistById[meta.artist];
  const artistHTML = artist && artist.bio ? `<section class="artist-bio">
      <div class="section-title">${ui('关于画家', 'About the artist')}</div>
      <p><span class="zh">${artist.bio.zh}</span><span class="en">${artist.bio.en}</span></p>
      <p><a class="btn" href="${ROOT}artists/?id=${artist.id}">${ui('更多' + artist.name.zh + '的画', 'More by ' + artist.name.en)} →</a></p>
    </section>` : '';
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
      ${oneMinuteHTML()}
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
    <button class="btn" id="shotBtn">📷 ${ui('拍一张', 'Snapshot')}</button>
    <div class="seg${S.projection === false ? ' hidden' : ''}" id="modeSwitch">
      <button data-mode="paint" class="on">${ui('原画质感', 'Painted')}</button>
      <button data-mode="flat">${ui('简笔画', 'Simple view')}</button>
    </div>
    ${S.exclusive && S.exclusive.type === 'pair' ? `<button class="btn" id="pairBtn">✦ ${ui(S.exclusive.label.zh, S.exclusive.label.en)}</button>` : ''}
    ${TW ? `<button class="btn" id="twinBtn">✦ ${ui(TW.label.zh, TW.label.en)}</button>` : ''}
    ${S.exclusive && S.exclusive.type === 'wind' ? `<button class="btn" id="windBtn">🌬 ${ui(S.exclusive.label.zh, S.exclusive.label.en)}</button>` : ''}
    ${S.exclusive && S.exclusive.type === 'mirror' ? `<button class="btn" id="mirrorBtn">✦ ${ui(S.exclusive.label.zh, S.exclusive.label.en)}</button>` : ''}
    ${S.exclusive && S.exclusive.type === 'reveal' ? `<button class="btn" id="revealBtn">✦ ${ui(S.exclusive.label.zh, S.exclusive.label.en)}</button>` : ''}
    ${S.exclusive && S.exclusive.type === 'reveal' && S.exclusive.today ? `<div class="seg hidden" id="todaySwitch"><button data-today="0" class="on">${ui(S.exclusive.today.then.zh, S.exclusive.today.then.en)}</button><button data-today="1">${ui(S.exclusive.today.now.zh, S.exclusive.today.now.en)}</button></div>` : ''}
    ${S.exclusive && S.exclusive.options ? `<div class="seg" id="wallSwitch">${S.exclusive.options.map((o, i) =>
      `<button data-opt="${i}" class="${i === 0 ? 'on' : ''}">${ui(o.label.zh, o.label.en)}</button>`).join('')}</div>` : ''}
  </div>

  ${S.exclusive && S.exclusive.type === 'reveal' && S.exclusive.note ? `<div id="revealNote" class="panel">${bi(S.exclusive.note, ' / ')}</div>` : ''}
  <div id="status" class="ui">
    <div id="progress" class="panel"></div>
    <button class="btn hidden" id="ambBtn"></button>
    <button class="btn hidden" id="musBtn"></button>
    <div id="musInfo" class="panel hidden"></div>
    <div id="leftHint" class="panel hidden"></div>
    <button class="btn hidden" id="audioBtn"></button>
    <div id="guideBox" class="panel guide hidden"></div>
    <button class="btn primary hidden" id="endBtn">${ui('继续看故事', 'Continue the story')} →</button>
  </div>

  <div class="popup panel" id="compare">
    <button class="close" data-close="compare" aria-label="Close">×</button>
    <img src="${P.image}" ${altAttr(P.alt || '')} data-zoom="${(S.zoom && S.zoom.image) || P.image}" class="zoomable" />
    <p>${bi(labelLine, ' / ')}<br><small>${imgLine}</small></p>
    <p><button class="btn" data-zoom="${(S.zoom && S.zoom.image) || P.image}">${ui('放大看细节', 'Zoom in on details')}</button></p>
    ${hasRecord ? `<details class="rec-box"><summary>${ui('作品档案', 'Artwork record')}</summary>${recordHTML()}</details>` : ''}
  </div>
  ${TW ? `<div class="popup panel" id="twin">
    <button class="close" data-close="twin" aria-label="Close">×</button>
    <h3>${bi(TW.label)}</h3>
    <div class="twin-cmp" id="twinCmp">
      <img id="twinA" src="${TW.left.image}" ${altAttr(TW.left.caption)} />
      <img id="twinB" src="${TW.right.image}" ${altAttr(TW.right.caption)} />
      <div class="twin-line" id="twinLine"></div>
    </div>
    <p class="twin-caps"><span>← ${bi(TW.left.caption, ' / ')}</span><span>${bi(TW.right.caption, ' / ')} →</span></p>
    <p><small>${ui('左右拖动对比', 'Drag left and right to compare')}${[TW.left.credit, TW.right.credit].filter(Boolean).map(c => ' · ' + bi(c, ' / ')).join('')}</small></p>
  </div>` : ''}
  ${S.exclusive && S.exclusive.type === 'pair' ? `<div class="popup panel" id="pair">
    <button class="close" data-close="pair" aria-label="Close">×</button>
    <h3>${bi(S.exclusive.label)}</h3>
    <div class="seg pair-modes">${S.exclusive.modes.map(m => `<button data-pair="${m.id}">${ui(m.label.zh, m.label.en)}</button>`).join('')}</div>
    <div class="pair-imgs">${[S.exclusive.left, S.exclusive.right].map(x => `<figure data-mode="${x.mode}">
      <img src="${x.image}" ${altAttr(x.caption)} /><figcaption>${bi(x.caption, ' / ')}</figcaption></figure>`).join('')}</div>
    ${S.exclusive.note ? `<p>${bi(S.exclusive.note, ' / ')}</p>` : ''}
    ${S.exclusive.credit ? `<p><small>${bi(S.exclusive.credit, ' / ')}</small></p>` : ''}
  </div>` : ''}
  ${S.exclusive && S.exclusive.type === 'mirror' ? (M => `<div class="popup panel" id="mirror">
    <button class="close" data-close="mirror" aria-label="Close">×</button>
    <h3>${bi(M.label)}</h3>
    <div class="mirror-zoom" role="img" ${altAttr(M.alt || M.label).replace('alt=', 'aria-label=')} style="background-image:url('${S.painting.image}');aspect-ratio:${(M.crop.w * S.painting.width) / (M.crop.h * S.painting.height)};background-size:${100 / M.crop.w}% ${100 / M.crop.h}%;background-position:${M.crop.x / (1 - M.crop.w) * 100}% ${M.crop.y / (1 - M.crop.h) * 100}%"></div>
    <p>${bi(M.text, ' / ')}</p>
  </div>`)(S.exclusive) : ''}
  <div class="popup panel" id="shot">
    <button class="close" data-close="shot" aria-label="Close">×</button>
    <img id="shotImg" ${altAttr({ zh: '你拍下的画面', en: 'Your snapshot' })} />
    <p><a id="shotSave" download="${S.id}.png">${ui('保存图片', 'Save image')}</a><br>${ui('手机上也可以长按图片保存', 'On phones, long-press the image to save')}</p>
  </div>
  <div id="flash"></div>
  <div id="toast" class="panel" role="status"></div>

  <div id="card" class="panel">
    <button class="close" id="cardClose" aria-label="Close">×</button>
    <h3 id="cardTitle" class="zh"></h3>
    <div class="en-title" id="cardTitleEn"></div>
    <p id="cardZh" class="zh"></p>
    <p class="en" id="cardEn"></p>
    <p id="cardLinkP" class="hidden"><a id="cardLink" class="btn"></a></p>
    <p id="cardLetterP" class="hidden"><a id="cardLetter" class="work-link" target="_blank" rel="noopener">${ui('读原信', 'Read the letter')} ↗</a></p>
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
      <h2 class="reveal"><span class="zh">${E.final.zh}</span><small class="en">${E.final.en}</small>${E.finalBy ? `<small class="final-by">${bi(E.finalBy, ' / ')}</small>` : ''}</h2>
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
      ${artistHTML}
      <div class="section-title">${ui('去现场看真迹', 'See it in person')}<small class="en-sub">See it in person</small></div>
      <div class="links">${seeInPersonHTML(R, meta) || museumLinks}</div>
      ${nextHTML}
      <div class="end-actions">
        ${[].concat(E.exit || []).filter(x => isLive(x.scene)).map(x => `<a class="btn primary" href="${x.href}">${ui(x.label.zh, x.label.en)} →</a>`).join('')}
        <button class="btn" id="backRoom">← ${ui('回到房间', 'Back to the room')}</button>
        <a class="btn" href="${ROOT}">${ui('更多名画', 'More paintings')} →</a>
      </div>
      ${readingHTML}
      <div class="credit">${[imgLine, ...extraCredits].join('<br>')}<br>${creditHTML()}</div>
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
  // 场景自己的贴图（比如从原画里剪下来的地砖、墙面）：textures 写 { 名字: { image, size（米） } }
  for (const [name, t] of Object.entries(S.textures || {})) {
    if (!t || !t.image) continue;   // 跳过说明文字（"_说明"）
    const tx = new THREE.TextureLoader().load(t.image); tx.colorSpace = THREE.SRGBColorSpace;
    tx.wrapS = tx.wrapT = THREE.MirroredRepeatWrapping; tx.repeat.set(1 / (t.size || 1), 1 / (t.size || 1)); TEX[name] = tx;
  }
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

  // 灯的光晕（一张柔和的圆形渐变图，所有灯共用）
  const halos = [];
  let _halo = null;
  function haloTex() {
    if (_halo) return _halo;
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const g = cv.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return (_halo = new THREE.CanvasTexture(cv));
  }

  // ---------- 地板、墙、天花板（室内）/ 地面和天空（户外） ----------
  const fadeOpts = S.exclusive && S.exclusive.type === 'wallFade' ? S.exclusive.options : [{ color: C.wall || '#cccccc', tint: 0 }];
  const wallMat = new THREE.MeshToonMaterial({ color: fadeOpts[0].color, gradientMap: gradient, map: TEX[RM.wallTex || 'wall'] });
  let ceil = null;
  if (!OUT) {
    const plan = new THREE.Shape();
    plan.moveTo(L, -FRONT); plan.lineTo(RF.x, -RF.z); plan.lineTo(BR.x, -BR.z); plan.lineTo(BL.x, -BL.z); plan.closePath();
    const floor = new THREE.Mesh(new THREE.ShapeGeometry(plan), paint(C.floor, RM.floorTex || 'floor'));
    floor.rotation.x = -Math.PI / 2; floor.userData.card = RM.floorCard ?? 'floor'; scene.add(floor);
    ceil = new THREE.Mesh(new THREE.ShapeGeometry(plan), new THREE.MeshBasicMaterial({ color: C.ceiling, map: TEX.wall, side: THREE.DoubleSide }));
    ceil.rotation.x = -Math.PI / 2; ceil.position.y = H; scene.add(ceil);

    function wall(x1, z1, x2, z2) {
      const len = Math.hypot(x2 - x1, z2 - z1), geo = new THREE.PlaneGeometry(len, H), uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len, uv.getY(i) * H);
      const m = new THREE.Mesh(geo, wallMat);
      m.position.set((x1 + x2) / 2, H / 2, (z1 + z2) / 2); m.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
      m.userData.card = RM.wallCard ?? 'wall'; m.userData.isWall = true; scene.add(m);
      box(len, 0.03, 0.03, C.line, 0, -H / 2 + 0.015, 0.015, m);
    }
    wall(BL.x, BL.z, BR.x, BR.z); wall(BR.x, BR.z, RF.x, RF.z); wall(RF.x, RF.z, L, FRONT); wall(L, FRONT, BL.x, BL.z);
    for (const p of [BL, BR, RF, { x: L, z: FRONT }]) box(0.03, H, 0.03, C.line, p.x, H / 2, p.z);
  } else {
    const G = RM.ground;   // [x0, x1, z0, z1]
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(G[1] - G[0], G[3] - G[2]), paint(C.ground, RM.groundTex || 'ground'));
    if (!RM.groundTex) ground.material.map.repeat.set((G[1] - G[0]) / 4, (G[3] - G[2]) / 4);
    else { const sz = (S.textures[RM.groundTex] || {}).size || 4; ground.material.map.repeat.set((G[1] - G[0]) / sz, (G[3] - G[2]) / sz); }   // 场景自己的地面贴图（比如原画里的麦田）
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
      if (o.id) named[o.id] = g;
    },
    door(o) {
      const f = wallFrame(o.wall, o.x || 0, o.z), g = group(f.pos[0], 0, f.pos[1], f.rot, o.card), w = o.width, h = o.height;   // 后墙上的门可以用 x 指定位置
      box(w, h, 0.05, C.door, 0, h / 2, 0, g, o.tex || 'wood');
      if (!o.plain) box(w * 0.75, h * 0.38, 0.02, C.doorPanel || '#9a7dbd', 0, h * 0.7, 0.035, g);
      if (!o.plain) box(w * 0.75, h * 0.34, 0.02, C.doorPanel || '#9a7dbd', 0, h * 0.27, 0.035, g);
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
  const swayers = [];   // 起风时会摆动的物体（柏树、麦穗）
  const portals = [];
  // 入口通往的场景还没开放时，不显示入口
  const portalOpen = pt => !pt.scene || (R && R.sceneById[pt.scene] && R.sceneById[pt.scene].status === 'live');
  Object.assign(BUILD, {
    // 一栋房子：x、z 是正面中间的位置，w 宽、d 深、h 高；windows 是正面（front）或右侧（side）上的窗和门
    building(o) {
      const g = group(o.x, o.y || 0, o.z, o.rot || 0, o.card);
      box(o.w, o.h, o.d, o.color, 0, o.h / 2, -o.d / 2, g, 'wall');
      if (o.roof) box(o.w + 0.3, 0.35, o.d + 0.3, o.roof, 0, o.h + 0.17, -o.d / 2, g);
      for (const wd of o.windows || []) {
        const side = wd.face === 'side', depth = 0.12;
        const b = side ? box(depth, wd.h, wd.w, wd.color, o.w / 2 + depth / 2 - 0.04, wd.y, -wd.x, g)
                       : box(wd.w, wd.h, depth, wd.color, wd.x, wd.y, depth / 2 - 0.04, g);
        if (wd.card) b.userData.card = wd.card;
        if (wd.portal && portalOpen(wd.portal)) { b.userData.portal = wd.portal; portals.push({ mesh: b, ...wd.portal }); }
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
      if (o.id) named[o.id] = g;
      if (o.sway) swayers.push({ g, amp: o.sway, phase: o.x * 0.7 + o.z * 0.3 });
      if (o.shape === 'bush') {   // 灌木 / 橄榄树丛：一团扁圆的树冠，高 h、宽 2r
        const b = new THREE.Mesh(new THREE.IcosahedronGeometry(o.r, 1), paint(col(o.color || 'leaves'), 'cloth'));
        b.scale.y = (o.h / 2) / o.r; b.position.y = o.h / 2; g.add(outline(b));
        blocks.push([o.x - o.r, o.x + o.r, o.z - o.r, o.z + o.r]); return;
      }
      if (o.shape === 'cypress') {   // 柏树：一根短树干 + 细高的尖锥
        cyl(0.12, 0.16, o.h * 0.12, C.trunk || '#6b4a2e', 0, o.h * 0.06, 0, g);
        const c = new THREE.Mesh(new THREE.ConeGeometry(o.r, o.h * 0.92, 12), paint(col(o.color || 'leaves'), 'cloth'));
        c.position.y = o.h * 0.08 + o.h * 0.46; g.add(outline(c));
        blocks.push([o.x - o.r, o.x + o.r, o.z - o.r, o.z + o.r]); return;
      }
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
    // 吊灯：灯罩 + 发光的灯泡 + 一圈光晕（光晕在“天亮了”时慢慢变淡）
    lamp(o) {
      const g = group(o.x, o.y, o.z, 0, o.card);
      cyl(0.01, 0.01, o.cord || 0.6, C.line, 0, (o.cord || 0.6) / 2 + 0.15, 0, g);
      cyl(0.08, 0.22, 0.14, col(o.shade || 'lampShade'), 0, 0.08, 0, g);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshBasicMaterial({ color: col(o.light || 'lampLight') }));
      bulb.userData.noPaint = true; g.add(bulb);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: col(o.light || 'lampLight'), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.scale.set(o.halo || 1.4, o.halo || 1.4, 1); halo.userData.noPaint = true; g.add(halo); halos.push(halo);
    },
    // 台球桌：绿色台面 + 木框 + 四条腿
    billiard(o) {
      const g = group(o.x, 0, o.z, o.rot || 0, o.card), w = o.w || 1.3, l = o.l || 2.5;
      box(w, 0.06, l, col(o.felt || 'felt'), 0, 0.8, 0, g, 'cloth');
      for (const s of [-1, 1]) { box(0.12, 0.14, l + 0.24, C.wood, s * (w / 2 + 0.06), 0.82, 0, g); box(w + 0.24, 0.14, 0.12, C.wood, 0, 0.82, s * (l / 2 + 0.06), g); }
      box(w, 0.18, l, C.wood, 0, 0.66, 0, g);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.1, 0.6, 0.1, C.wood, x * (w / 2 - 0.05), 0.3, z * (l / 2 - 0.05), g);
      const c = Math.cos(o.rot || 0), sn = Math.sin(o.rot || 0), r = Math.max(w, l) / 2 * Math.max(Math.abs(c), Math.abs(sn)) + 0.3;
      blocks.push([o.x - r, o.x + r, o.z - r, o.z + r]);
    },
    // 小圆桌（可以带几把简单的椅子）
    roundTable(o) {
      const g = group(o.x, 0, o.z, o.rot || 0, o.card), r = o.r || 0.4;
      cyl(r, r, 0.04, col(o.color || 'tableTop'), 0, 0.74, 0, g);
      cyl(0.04, 0.04, 0.72, C.line, 0, 0.36, 0, g);
      for (const a of o.chairs || []) {
        const cx = Math.sin(a) * (r + 0.32), cz = Math.cos(a) * (r + 0.32), ch = group(cx, 0, cz, a, null, g);
        box(0.4, 0.04, 0.4, C.wood, 0, 0.45, 0, ch); box(0.4, 0.45, 0.04, C.wood, 0, 0.7, 0.18, ch);
        for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.03, 0.45, 0.03, C.wood, x * 0.17, 0.22, z * 0.17, ch);
      }
      blocks.push([o.x - r - 0.3, o.x + r + 0.3, o.z - r - 0.3, o.z + r + 0.3]);
    },
    // 简单的人形：站着（standing）、坐着（sitting）、趴在桌上（slumped）
    figure(o) {
      const g = group(o.x, o.y || 0, o.z, o.rot || 0, o.card), c = col(o.color || 'coat');
      if (o.pose === 'standing') {
        cyl(0.2, 0.24, 1.1, c, 0, 0.95, 0, g); cyl(0.09, 0.09, 0.5, col(o.legs || 'trousers'), -0.08, 0.25, 0, g); cyl(0.09, 0.09, 0.5, col(o.legs || 'trousers'), 0.08, 0.25, 0, g);
        const h = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), paint(col('skin'))); h.position.y = 1.65; g.add(outline(h));
      } else {
        cyl(0.18, 0.22, 0.55, c, 0, 0.72, 0, g).rotation.x = o.pose === 'slumped' ? -0.9 : -0.1;
        const h = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), paint(col(o.hat || 'skin')));
        h.position.set(0, o.pose === 'slumped' ? 0.86 : 1.12, o.pose === 'slumped' ? -0.32 : -0.02); g.add(outline(h));
        box(0.4, 0.04, 0.4, C.wood, 0, 0.45, 0.05, g);
      }
      blocks.push([o.x - 0.35, o.x + 0.35, o.z - 0.35, o.z + 0.35]);
    },
    // 墙上或空地上的一扇门，点一下去另一个场景（portal）
    portalDoor(o) {
      const g = group(o.x, 0, o.z, o.rot || 0, null);
      const W = o.w || 1, Hd = o.h || 2.2;   // 门框：两边和上面三根细条（不挡在发光的门后面）
      for (const s of [-1, 1]) box(0.08, Hd + 0.08, 0.08, C.line, s * (W / 2 + 0.04), (Hd + 0.08) / 2, 0.02, g);
      box(W + 0.16, 0.08, 0.08, C.line, 0, Hd + 0.04, 0.02, g);
      const d = box(W, Hd, 0.04, '#ffffff', 0, Hd / 2, 0.02, g);
      if (portalOpen(o.portal)) { d.userData.portal = o.portal; portals.push({ mesh: d, ...o.portal }); } else g.visible = false;
    },
    // 一块平面（四个角：左上、左下、右下、右上，世界坐标），两面都能看见，比如雨棚、墙面
    surface(o) {
      const m = quad(o.pts, paint(col(o.color), o.tex || 'wall').clone(), o.card, 0);
      m.material.side = THREE.DoubleSide; m.userData.double = true;
      if (o.id) named[o.id] = m;
    },
    boxes(o) {
      const g = group(o.x, o.y || 0, o.z, o.rot || 0, o.card);
      if (o.sway) swayers.push({ g, amp: o.sway, phase: o.x * 0.7 + o.z * 0.3 });
      for (const [w, h, d, color, x, y, z, tex] of o.boxes) box(w, h, d, color, x, y, z, g, tex || 'wood');
      if (o.id) named[o.id] = g;
    }
  });
  const firstObject = scene.children.length;
  for (const o of S.objects) { if (BUILD[o.type]) BUILD[o.type](o); else console.warn('unknown object type', o.type); }
  const objectRoots = scene.children.slice(firstObject);   // objects 里建出来的东西（“1658 / 今天”淡出时用）

  // 发光入口：门上的光 + 上方的文字牌，点一下去另一个场景
  function labelSprite(text2) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
    const g = cv.getContext('2d');
    g.fillStyle = 'rgba(28,28,30,.72)'; g.beginPath(); g.roundRect(4, 4, 504, 120, 60); g.fill();
    g.fillStyle = '#fff3b0'; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (text2.length === 1) { g.font = '500 44px sans-serif'; g.fillText(text2[0], 256, 66, 460); }
    else { g.font = '500 38px sans-serif'; g.fillText(text2[0], 256, 44, 460); g.font = '30px sans-serif'; g.fillText(text2[1], 256, 92, 460); }
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
  // 独家发现里的“1658 / 今天”（reveal.today）：除了 keep 里的物体（按 id），其他慢慢淡出，只留下今天还在的部分（示意）
  const todayObj = S.exclusive && S.exclusive.type === 'reveal' && S.exclusive.today ? S.exclusive.today : null;
  const todayMeshes = [];
  let todayTarget = 0, todayNow = 0;
  if (todayObj) {
    const keep = new Set((todayObj.keep || []).map(id => named[id]).filter(Boolean));
    for (const root of objectRoots) if (!keep.has(root)) root.traverse(o => {
      if (!o.material) return;
      o.material = o.material.clone(); o.material.transparent = true; todayMeshes.push(o);
    });
  }
  // 独家发现“天亮了”：在场景里待得越久，灯光和窗外慢慢从深夜变成清晨
  const dawnObj = S.exclusive && S.exclusive.type === 'dawn' ? S.exclusive : null;
  const dawnGlass = [];
  let dawnTime = 0, dawn = 0, dawnShown = false;
  if (dawnObj) for (const id of dawnObj.glass || []) named[id] && named[id].traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.userData.noPaint = true; dawnGlass.push(o); } });
  const nightHemi = new THREE.Color('#ffe2a0'), dawnHemi = new THREE.Color('#dfe8f5'), nightGlass = new THREE.Color(dawnObj ? col(dawnObj.night || '#0d1633') : '#000'), dawnGlassC = new THREE.Color(dawnObj ? col(dawnObj.day || '#d6e2f0') : '#000');
  function goPortal(pt) { const f = $('flash'); f.style.transition = 'opacity .6s'; f.style.opacity = 1; setTimeout(() => { location.href = pt.href; }, 600); }

  // ---------- 柔和的光（简化色块模式用） ----------
  const hemi = new THREE.HemisphereLight('#fff4d6', '#b5533c', 1.6); scene.add(hemi);
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
  const projector = new THREE.PerspectiveCamera(VIEW.fov, VIEW.aspect, 0.3, OUT ? (RM.projectFar || 220) : 14);   // 户外看得更远
  projector.position.set(VIEW.x, VIEW.eye, VIEW.z);
  projector.rotation.set(VIEW.pitch, -VIEW.yaw, 0, 'YXZ');
  projector.updateMatrixWorld(); projector.updateProjectionMatrix();
  const paintingTex = imageTex(S.painting.image); paintingTex.anisotropy = 4;
  const depthRT = new THREE.WebGLRenderTarget(1024, 812);
  depthRT.depthTexture = new THREE.DepthTexture(1024, 812); depthRT.depthTexture.type = THREE.UnsignedIntType;
  const projUniforms = {
    uPaint: { value: paintingTex }, uDepth: { value: depthRT.depthTexture },
    uProjVP: { value: new THREE.Matrix4().multiplyMatrices(projector.projectionMatrix, projector.matrixWorldInverse) },
    uProjPos: { value: projector.position.clone() }, uNear: { value: projector.near }, uFar: { value: projector.far }, uViolet: { value: 0 }, uDawn: { value: 0 },
    uWind: { value: 0 }, uTime: { value: 0 }   // 独家发现“起风了”
  };
  const projVert = `
    varying vec3 vWorld; varying vec3 vNormal; varying vec2 vUv; uniform vec2 uRepeat;
    void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; vNormal = normalize(mat3(modelMatrix) * normal); vUv = uv * uRepeat; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const projFrag = `
    uniform sampler2D uPaint; uniform sampler2D uDepth; uniform sampler2D uMap;
    uniform mat4 uProjVP; uniform vec3 uProjPos; uniform float uNear; uniform float uFar;
    uniform vec3 uBase; uniform float uWall; uniform float uViolet; uniform float uDouble; uniform float uAlpha; uniform float uEdge; uniform float uSky; uniform float uDawn; uniform float uWind; uniform float uTime;
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
        vec2 wuv = uv + uWind * vec2(0.004 * sin(uv.y * 26.0 + uTime * 2.3), 0.0025 * sin(uv.x * 19.0 + uTime * 1.7)) * (0.4 + uv.y);   // 起风：画面越往上动得越多
        if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0 && ndc.z < 1.0) {
          float sceneD = linDepth(texture2D(uDepth, uv).r), myD = linDepth(ndc.z * 0.5 + 0.5);
          float edge = smoothstep(0.0, 0.05, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));   // 原画边缘慢慢过渡，不留硬边
          if (myD <= sceneD + 0.05 + sceneD * 0.02 && dot(n, normalize(uProjPos - vWorld)) > 0.0) col = mix(col, texture2D(uPaint, wuv).rgb, uEdge > 0.5 ? edge : 1.0);   // 照到了：显示原画
          else if (uSky > 0.5) col = mix(col, texture2D(uPaint, vec2(uv.x, 0.9)).rgb, edge);   // 天空被房子挡住的地方：用同一列画里天空的颜色
        }
      }
      col = mix(col, col * vec3(0.8, 0.92, 1.1) + vec3(0.05, 0.06, 0.09), uDawn);   // 天亮了：灯光变淡、偏冷的晨光
      if (uWall > 0.5) {   // 褪色开关：把墙上偏蓝的颜色加回一点红色
        float blueish = smoothstep(0.0, 0.12, col.b - col.r);
        col = mix(col, vec3(min(col.r + 0.28 * col.b, 1.0), col.g * 0.88, col.b), uViolet * blueish);
      }
      gl_FragColor = vec4(col, uAlpha);
      #include <colorspace_fragment>
    }`;
  const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); white.needsUpdate = true;
  const projCache = new Map();
  function projMaterial(toon, isWall, doubleSide, isSky = false) {
    const key = toon.uuid + isWall + doubleSide + isSky;
    if (!projCache.has(key)) {
      const map = toon.map || white;
      projCache.set(key, new THREE.ShaderMaterial({
        uniforms: { ...projUniforms, uMap: { value: map }, uRepeat: { value: map.repeat ? map.repeat.clone() : new THREE.Vector2(1, 1) },
                    uBase: { value: toon.color.clone() }, uWall: { value: isWall ? 1 : 0 }, uDouble: { value: doubleSide ? 1 : 0 }, uAlpha: { value: 1 }, uEdge: { value: OUT || S.softEdge ? 1 : 0 }, uSky: { value: isSky ? 1 : 0 } },
        vertexShader: projVert, fragmentShader: projFrag, side: doubleSide ? THREE.DoubleSide : THREE.FrontSide, transparent: !!toon.transparent
      }));
    }
    return projCache.get(key);
  }
  const solids = [];
  scene.traverse(o => {
    if (!o.isMesh || o.userData.noPaint) return;
    o.userData.flatMat = o.material;
    o.userData.paintMat = projMaterial(o.material, !!o.userData.isWall, o === ceil || !!o.userData.isSky || !!o.userData.double, !!o.userData.isSky);   // 天花板和天空从里面看
    solids.push(o);
  });
  const PROJ = S.projection !== false;   // 原画投影：画家视角和 3D 形状对准以后才打开
  if (PROJ) (function renderProjectorDepth() {   // 从投影仪的位置拍一次“深度图”，判断哪些表面被挡住（只拍一次）
    const hidden = [cornerHit, vpRing, vpDot, ...outlines, ...portals.map(p => p.sprite), ...halos].filter(Boolean);
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

  // ---------- 独家发现“星空连线”：点夜空，画里的星星之间连出线 ----------
  // stars 写的是星星在原画上的位置（0–1：从左到右、从上到下），从画家视角投到天空上
  const constObj = S.exclusive && S.exclusive.type === 'constellation' ? S.exclusive : null;
  let constGroup = null;
  if (constObj) {
    constGroup = new THREE.Group(); constGroup.visible = false; constGroup.userData.card = constObj.card;
    const R = (RM.skyRadius || 150) * 0.9;
    const pts = constObj.stars.map(([fx, fy]) => {
      const d = new THREE.Vector3(fx * 2 - 1, 1 - fy * 2, 0.5).unproject(projector).sub(projector.position).normalize();
      return projector.position.clone().addScaledVector(d, R);
    });
    const starMat = new THREE.SpriteMaterial({ map: haloTex(), color: '#fff6c8', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    for (const p of pts) { const st = new THREE.Sprite(starMat); st.position.copy(p); st.scale.set(R * 0.035, R * 0.035, 1); constGroup.add(st); }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(constObj.lines.flatMap(([a, b]) => [pts[a], pts[b]]));
    constGroup.add(new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0.85, depthWrite: false })));
    scene.add(constGroup);
  }
  // ---------- 天上的星星（一直亮着，点一下看卡片）：位置同样写成原画上的 0–1 ----------
  if (S.skyStars) {
    const SR = (RM.skyRadius || 150) * 0.9, sg = new THREE.Group();
    const sm = new THREE.SpriteMaterial({ map: haloTex(), color: S.skyStars.color || '#fff3b0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    for (const [fx, fy, sz] of S.skyStars.stars) {
      const d = new THREE.Vector3(fx * 2 - 1, 1 - fy * 2, 0.5).unproject(projector).sub(projector.position).normalize();
      const st = new THREE.Sprite(sm); st.position.copy(projector.position).addScaledVector(d, SR);
      st.scale.set(SR * (sz || 0.05), SR * (sz || 0.05), 1); st.userData.noPaint = true; sg.add(st);
    }
    sg.userData.card = S.skyStars.card; scene.add(sg);
  }
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
    hideHint();   // 提示不遮挡卡片
    const t = S.cards[key];
    $('cardTitle').textContent = t.title.zh; $('cardTitleEn').textContent = t.title.en;
    $('cardZh').textContent = t.text.zh; $('cardEn').textContent = t.text.en;
    // 卡片里的链接（比如“去卧室看博赫的画像”）
    const linkOn = t.link && (!t.link.scene || (R && R.sceneById[t.link.scene] && R.sceneById[t.link.scene].status === 'live'));
    $('cardLinkP').classList.toggle('hidden', !linkOn);
    if (t.link) { $('cardLink').href = t.link.href; $('cardLink').innerHTML = ui(t.link.label.zh, t.link.label.en) + ' →'; }
    if (constGroup && key === constObj.card) constGroup.visible = true;   // 星空连线
    const letter = t.letter && t.letter.url;   // 卡片引用了书信：“读原信”链接到 vangoghletters.org
    $('cardLetterP').classList.toggle('hidden', !letter);
    if (letter) $('cardLetter').href = letter;
    card.style.display = 'block';
    found.add(key); updateProgress();
    if (found.size === 3 && !found.counted) { found.counted = true; track('found-3-' + S.id); }   // 访问统计：发现了3处
  }
  $('cardClose').onclick = () => { card.style.display = 'none'; };

  // ---------- 弹窗 ----------
  const popups = { compare: $('compare'), shot: $('shot') };
  if ($('twin')) popups.twin = $('twin');
  if ($('pair')) {   // 独家发现“两把椅子面对面”：白天 / 夜晚，点一下突出其中一幅
    popups.pair = $('pair');
    $('pairBtn').onclick = () => togglePopup('pair');
    document.querySelectorAll('[data-pair]').forEach(b => b.onclick = () => {
      const on = !b.classList.contains('on');
      document.querySelectorAll('[data-pair]').forEach(x => x.classList.toggle('on', on && x === b));
      document.querySelectorAll('.pair-imgs figure').forEach(f => f.classList.toggle('dim', on && f.dataset.mode !== b.dataset.pair));
    });
  }
  function togglePopup(name, show) {
    for (const k in popups) if (k !== name) popups[k].style.display = 'none';
    const el = popups[name]; el.style.display = (show ?? el.style.display !== 'block') ? 'block' : 'none';
  }
  $('compareBtn').onclick = () => togglePopup('compare');
  if ($('twin')) {   // 独家发现“两个星夜”：拖动分界线
    const tc = $('twinCmp'), tB = $('twinB'), tL = $('twinLine');
    const setTwin = pct => { pct = Math.max(0, Math.min(100, pct)); tB.style.clipPath = `inset(0 0 0 ${pct}%)`; tL.style.left = pct + '%'; };
    let td = false;
    const tAt = e => { const r = tc.getBoundingClientRect(); setTwin((e.clientX - r.left) / r.width * 100); };
    tc.addEventListener('pointerdown', e => { td = true; tc.setPointerCapture(e.pointerId); tAt(e); });
    tc.addEventListener('pointermove', e => { if (td) tAt(e); });
    tc.addEventListener('pointerup', () => { td = false; }); tc.addEventListener('pointercancel', () => { td = false; });
    setTwin(50);
    $('twinBtn').onclick = () => togglePopup('twin');
  }
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

  // ---------- 小提示条（几秒后自动消失） ----------
  function showToast(m) {
    if (!m) return;
    const t = $('toast'); t.innerHTML = `<span class="zh">${m.zh}</span><span class="en">${m.en}</span>`;
    t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 10000);
  }

  // ---------- 拍一张 ----------
  $('shotBtn').onclick = () => {
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    $('shotImg').src = url; $('shotSave').href = url;
    const f = $('flash'); f.style.transition = 'none'; f.style.opacity = 0.35;   // 轻轻一亮，不闪烁
    requestAnimationFrame(() => { f.style.transition = 'opacity .8s'; f.style.opacity = 0; });
    togglePopup('shot', true);
  };

  // ---------- 声音：环境音（代码合成）和音乐（CC0 / 公有领域录音），都默认关闭；见 sound.js ----------
  const sound = setupSound(S, { ambBtn: $('ambBtn'), musBtn: $('musBtn'), info: $('musInfo'), wind: () => windK });

  // ---------- 语音导览（场景文件夹 audio/ 里有录音才显示按钮；播放时环境音调小、音乐暂停） ----------
  setupGuide(S, { btn: $('audioBtn'), box: $('guideBox'), duck: on => sound.guide(on) });

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
  function hideHint() { if (!hintHidden) { hintHidden = true; hint.style.opacity = 0; } }   // 操作提示：点任意处、走动或 4 秒后淡出

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
  let view = 'none', needExit = false, alignFrom = null, alignT = 0, filmFov = null;
  function enterView() { view = 'aligning'; alignT = 0; alignFrom = { x: player.x, z: player.z, yaw: player.yaw, pitch: player.pitch, fov: camera.fov }; }
  function leaveView() { if (view === 'none') return; view = 'none'; mirrorArmed = true; needExit = true; vpPanel.classList.remove('show'); vpOverlay.style.display = 'none'; }
  function showAligned() {
    view = 'aligned'; placeRect(vpOverlay); vpOverlay.style.display = 'block'; vpPanel.classList.add('show');
    if (mirrorObj && mirrorArmed && !mirrorSeen) { mirrorSeen = true; togglePopup('mirror', true); track('exclusive-' + S.id); }   // 站到画家视角点：镜子放大
  }
  // 独家发现“镜子里的人”（mirror）：站到画家视角点时（或点按钮），把原画上 crop 这一块（镜子）放大显示，配上文字
  const mirrorObj = S.exclusive && S.exclusive.type === 'mirror' ? S.exclusive : null;
  let mirrorSeen = false, mirrorArmed = false;   // 刚走进画里时也站在视角点上：先不弹出，离开过一次再回来才弹出
  if (mirrorObj) {
    popups.mirror = $('mirror');
    $('mirrorBtn').onclick = () => { if (view === 'aligned') togglePopup('mirror', true); else { mirrorSeen = false; mirrorArmed = true; enterView(); } };
  }

  // ---------- 开场：原画（和 3D 画面完全重合）→ 淡出 → 站在画里 ----------
  const intro = $('intro'), introImg = $('introImg');
  placeRect(introImg);
  const introFail = () => { introImg.classList.add('hidden'); $('introMissing').classList.remove('hidden'); };
  introImg.addEventListener('error', introFail, { once: true });
  if (introImg.complete && introImg.naturalWidth === 0) introFail();
  camera.fov = paintingRect().fov; camera.updateProjectionMatrix();
  let introT = -1;
  $('enter').onclick = () => { intro.classList.add('fade'); introT = 0; track('step-inside-' + S.id); };
  oneMinute($('oneMin'));   // 一分钟看一幅画（可选）
  cleanToggle($('tools'));   // 隐藏按钮（录屏、截图用）
  addEventListener('pointerdown', () => { if (document.body.classList.contains('in-room')) hideHint(); });
  function finishIntro() {
    intro.style.display = 'none'; walking = true;
    document.body.classList.add('in-room'); hint.style.opacity = 1; setTimeout(hideHint, 4000);
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
    const cap = document.createElement('figcaption'); cap.innerHTML = bi(v.caption, ' / ') + (v.credit ? `<br><small class="img-credit">${bi(v.credit, ' / ')}</small>` : '');
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
  onLang(() => { updateProgress(); setCmpImages(); });
  updateProgress();

  $('endBtn').onclick = () => {
    track('ending-' + S.id);   // 访问统计：看故事结局
    walking = false; for (const k in keys) keys[k] = false;
    card.style.display = 'none'; for (const k in popups) togglePopup(k, false); leaveView();
    gallery.style.display = 'block';
    gallery.style.scrollBehavior = 'auto'; gallery.scrollTop = 0; gallery.style.scrollBehavior = '';
    requestAnimationFrame(() => gallery.classList.add('show'));
  };
  $('backRoom').onclick = () => { gallery.classList.remove('show'); setTimeout(() => { gallery.style.display = 'none'; walking = true; }, 900); };

  // ---------- 每一帧 ----------
  const clock = new THREE.Clock(), introZ = player.z;
  const windObj = S.exclusive && S.exclusive.type === 'wind' ? S.exclusive : null;
  let windOn = false, windK = 0;
  if (windObj) $('windBtn').onclick = () => {
    windOn = !windOn; $('windBtn').classList.toggle('on', windOn);
    if (windOn && windObj.card) showCard(windObj.card);
  };
  // 独家发现“画布下的秘密”（reveal）：打开后，后来被画家盖掉的东西以半透明轮廓出现（自己画的示意图）
  // shapes：每一个 { at: [x, y, z], rot, label: {zh, en}, labelAt: [x, y, z], parts: [...] }，parts 里每一项是：
  //   ['box', 宽, 高, 深, x, y, z]、['cyl', 上半径, 下半径, 高, x, y, z]：半透明的轮廓
  //   ['glow', 宽, 高, x, y, z, 转角]：一块发光的面（比如看不见的窗户亮起来）
  //   ['line', x1, y1, z1, x2, y2, z2]：一条虚线（比如光线、影子的方向）
  const revealObj = S.exclusive && S.exclusive.type === 'reveal' ? S.exclusive : null;
  let revealOn = false, revealK = 0;
  const revealGroup = new THREE.Group(), revealMats = [];
  if (revealObj) {
    revealGroup.visible = false; scene.add(revealGroup);
    const fill = new THREE.MeshBasicMaterial({ color: revealObj.color || '#fffbe8', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const edge = new THREE.LineBasicMaterial({ color: revealObj.line || '#fff3b0', transparent: true, opacity: 0, depthTest: false });
    const glow = new THREE.MeshBasicMaterial({ color: revealObj.glow || '#fff4c8', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    const dash = new THREE.LineDashedMaterial({ color: revealObj.line || '#fff3b0', dashSize: 0.06, gapSize: 0.04, transparent: true, opacity: 0, depthTest: false });
    revealMats.push([fill, 0.3], [edge, 1], [glow, 0.85], [dash, 1]);
    const labels = [];
    for (const it of revealObj.shapes || []) {
      const g = new THREE.Group(); g.position.set(...it.at); g.rotation.y = it.rot || 0; revealGroup.add(g);
      for (const [kind, ...v] of it.parts) {
        if (kind === 'glow') {
          const m = new THREE.Mesh(new THREE.PlaneGeometry(v[0], v[1]), glow); m.position.set(v[2], v[3], v[4]); m.rotation.y = v[5] || 0;
          m.userData.noPaint = true; m.raycast = () => {}; g.add(m); continue;
        }
        if (kind === 'line') {
          const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(v[0], v[1], v[2]), new THREE.Vector3(v[3], v[4], v[5])]), dash);
          l.computeLineDistances(); l.raycast = () => {}; g.add(l); continue;
        }
        const geo = kind === 'cyl' ? new THREE.CylinderGeometry(v[0], v[1], v[2], 24, 1, true) : new THREE.BoxGeometry(v[0], v[1], v[2]);
        const m = new THREE.Mesh(geo, fill); m.position.set(...(kind === 'cyl' ? v.slice(3) : v.slice(3)));
        m.userData.noPaint = true; m.raycast = () => {};   // 不挡住点击
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), edge); e.raycast = () => {}; m.add(e); g.add(m);
      }
      if (it.label) {
        const mat = new THREE.SpriteMaterial({ transparent: true, depthTest: false, sizeAttenuation: false, opacity: 0 });
        const sp = new THREE.Sprite(mat); sp.scale.set(0.26, 0.065, 1); sp.position.set(...(it.labelAt || [0, 0.4, 0])); sp.raycast = () => {};
        g.add(sp); labels.push([mat, it.label]); revealMats.push([mat, 1]);
      }
    }
    const setLabels = () => labels.forEach(([mat, l]) => { mat.map = labelSprite(lang === 'en' ? [l.en] : lang === 'zh' ? [l.zh] : [l.zh, l.en]); mat.needsUpdate = true; });
    setLabels(); onLang(setLabels);
    $('revealBtn').onclick = () => {
      revealOn = !revealOn; $('revealBtn').classList.toggle('on', revealOn);
      if ($('revealNote')) $('revealNote').classList.toggle('show', revealOn);
      if ($('todaySwitch')) { $('todaySwitch').classList.toggle('hidden', !revealOn); if (!revealOn) setToday(0); }
      if (revealOn && revealObj.card) showCard(revealObj.card);
    };
  }
  function setToday(v) {   // “1658 / 今天”
    todayTarget = v;
    document.querySelectorAll('[data-today]').forEach(b => b.classList.toggle('on', +b.dataset.today === v));
  }
  document.querySelectorAll('[data-today]').forEach(b => b.onclick = () => setToday(+b.dataset.today));
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (gallery.classList.contains('show')) return;   // 在结尾页时不画 3D，省电
    if (revealObj) {   // 画布下的秘密：轮廓慢慢浮现 / 消失
      revealK += ((revealOn ? 1 : 0) - revealK) * Math.min(1, dt * 2.5);
      revealGroup.visible = revealK > 0.01;
      for (const [m, full] of revealMats) m.opacity = full * revealK;
    }
    if (windObj) {   // 起风了：慢慢变强 / 变弱
      windK += ((windOn ? 1 : 0) - windK) * Math.min(1, dt * 1.5);
      const t = clock.elapsedTime; projUniforms.uWind.value = windK; projUniforms.uTime.value = t;
      for (const w of swayers) { w.g.rotation.z = windK * w.amp * Math.sin(t * 2.1 + w.phase); w.g.rotation.x = windK * w.amp * 0.4 * Math.sin(t * 1.6 + w.phase * 1.3); }
    }
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
      const speed = (RM.walkSpeed || 1.4) * dt, sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
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
    } else if (filmFov) camera.fov = filmFov;   // 录首页动图用（只在 ?debug 下）
    else if (view === 'aligned' || !walking) camera.fov = paintingRect().fov;
    else camera.fov += (70 - camera.fov) * (1 - Math.exp(-dt * 3));
    camera.updateProjectionMatrix();
    const pulse = 0.55 + 0.35 * Math.sin(performance.now() / 600);   // 圆点慢慢呼吸
    vpRing.material.opacity = pulse; vpDot.material.opacity = pulse * 0.4;
    wallMat.color.lerp(wallTarget, 1 - Math.exp(-dt * 4));
    if (todayObj && Math.abs(todayTarget - todayNow) > 0.001) {   // “今天”：其他部分慢慢淡出（约 2 秒）
      todayNow += Math.sign(todayTarget - todayNow) * Math.min(Math.abs(todayTarget - todayNow), dt / 2);
      for (const m of todayMeshes) {
        m.material.opacity = 1 - todayNow; m.material.depthWrite = todayNow < 0.05; m.visible = todayNow < 0.99;
        if (m.userData.paintMat) m.userData.paintMat.uniforms.uAlpha.value = 1 - todayNow;
      }
    }
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
    if (dawnObj && walking) {   // 天亮了：待够 start 秒后，用 duration 秒慢慢变成清晨
      dawnTime += dt;
      dawn = Math.max(0, Math.min(1, (dawnTime - (dawnObj.start ?? 20)) / (dawnObj.duration ?? 120)));
      projUniforms.uDawn.value = dawn;
      hemi.color.copy(nightHemi).lerp(dawnHemi, dawn);
      for (const h of halos) h.material.opacity = 0.55 * (1 - 0.85 * dawn);
      for (const m of dawnGlass) m.material.color.copy(nightGlass).lerp(dawnGlassC, dawn);
      if (dawn >= 1 && !dawnShown) { dawnShown = true; showToast(dawnObj.message); }
    }
    if (RM.walkEye) {   // 画家视角的眼睛比一般人高（比如站在高处）：离开视角点后，慢慢降到走路的高度
      const t = Math.min(1, Math.hypot(player.x - VIEW.x, player.z - VIEW.z) / 2);
      player.eye = VIEW.eye + (RM.walkEye - VIEW.eye) * t * t * (3 - 2 * t);
    }
    camera.position.set(player.x, player.eye, player.z);
    camera.rotation.set(player.pitch, -player.yaw, 0, 'YXZ');
    renderer.render(scene, camera);
  }
  loop();
  // 测试用：地址后面加 ?debug 时，可以在控制台里移动位置（普通访问不受影响）
  if (location.search.includes("debug")) window.__room = { player, setMode, leaveView, showCard, portals, camera, skipTime: s => { dawnTime += s; },
    film: fov => { walking = !fov; introT = -1; view = 'none'; vpOverlay.style.display = 'none'; filmFov = fov || null; }, viewFov: () => paintingRect().fov, VIEW };
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    placeRect(introImg); if (view === 'aligned') placeRect(vpOverlay);
    if (!zoom.classList.contains('hidden')) zReset();
  });
}
