// =====================================================================
// 走进名画 · 轻量版场景（静物画用）：分层景深 + 卡片 + 短故事
//
// 用法（场景文件夹里的 index.html）：
//   import { startLight } from '../../assets/light.js';
//   startLight('scene.json');
//
// 不用 3D：同一张原画按 layers 切成几层（背景、桌面、花瓶和花），
// 移动鼠标、拖动或转动手机时，前面的层移动得多一点，看起来像微微转动视角。
// 文字、卡片、故事都写在 scene.json 里（结构和 3D 场景一样，按钮和样式也共用）。
// =====================================================================
import { bi, ui, textOf, altAttr, removeStatic, lang, onLang, wirePrefs, langSwitchHTML, creditHTML, imageSourceHTML, loadRegistry, sceneCard, seeInPersonHTML, cleanToggle, track, oneMinuteHTML, oneMinute, worldMap, ROOT } from './site.js';
import { setupGuide } from './guide.js';
import { setupSound } from './sound.js';
import { variantOf, VARIANTS } from './variants.js';

export async function startLight(sceneUrl) {
  removeStatic();
  const S = await fetch(sceneUrl, { cache: 'no-cache' }).then(r => r.json());
  const R = await loadRegistry().catch(() => null);
  const meta = R && R.sceneById[S.id];
  if (meta && meta.status !== 'live' && !/preview|debug/.test(location.search)) {
    document.body.insertAdjacentHTML('beforeend', `<main class="wrap page-title"><h1>${bi(meta.title)}</h1>
      <p class="lead">${ui('即将开放', 'Coming soon')}</p><a class="btn primary" href="${ROOT}">${ui('回到走进名画', 'Back to Walk into Paintings')}</a></main>`);
    wirePrefs(); return;
  }
  track('enter-scene-' + S.id);   // 访问统计：打开了这个场景
  document.body.classList.add('scene', 'light');
  document.body.dataset.variant = variantOf(S);   // 场景变体：interior / outdoor / still-life / portrait（见 variants.js）
  if (meta && R.collectionById[meta.collection]) document.body.dataset.series = R.collectionById[meta.collection].accent || '';
  buildDOM(S, R, meta);
  wirePrefs();
  run(S, R);
}

const zoomsOf = X => X.zooms || (X.zoom ? [X.zoom] : []);
const isLive = (R, id) => !id || !!(R && R.sceneById[id] && R.sceneById[id].status === 'live');

function buildDOM(S, R, meta) {
  const P = S.painting, L = S.label, E = S.ending, X = S.exclusive || {};
  const labelLine = { zh: [L.title.zh, L.artist.zh, L.date.zh, L.museum.zh].join(' · '), en: [L.title.en, L.artist.en, L.date.en, L.museum.en].join(' · ') };
  const imgLine = imageSourceHTML(L.source);
  const REC = [['artist', '画家（生卒年）', 'Artist (dates)'], ['title', '画名', 'Title'], ['date', '年份', 'Date'],
    ['medium', '材质', 'Medium'], ['dimensions', '尺寸', 'Dimensions'], ['collection', '收藏地', 'Collection'], ['creditLine', '来源说明', 'Credit line'], ['url', '博物馆作品页', 'Museum page']];
  const rec = S.record || {};
  const rows = REC.map(([k, zh, en]) => {
    const v = rec[k];
    const val = k === 'url' ? (v ? `<a href="${v}" target="_blank" rel="noopener">${ui('打开', 'Open')} ↗</a>` : '') : (v && (v.zh || v.en) ? bi(v, ' / ') : '');
    return val ? `<tr><th>${ui(zh, en)}</th><td>${val}</td></tr>` : '';
  }).join('');
  const recordHTML = rows ? `<table class="record">${rows}</table>` : '';
  const readingItems = ((S.reading && S.reading.items) || []).filter(it => it.url && it.title);
  const artist = R && meta && R.artistById[meta.artist];
  const museumLinks = (E.museums || []).map(id => R && R.museumById[id]).filter(m => m && m.url)
    .map(m => `<a class="btn" href="${m.url}" target="_blank" rel="noopener">${bi(m.name, ' · ')}</a>`).join('');
  let nextHTML = '';
  if (R && meta) {
    const order = (R.collectionById[meta.collection] || {}).order || [];
    const next = R.sceneById[order[order.indexOf(S.id) + 1]];
    if (next) nextHTML = `<div class="section-title">${ui('下一个场景', 'Next scene')}</div><div class="next-scene">${sceneCard(R, next)}</div>`;
  }
  // 每一层：同一张原画，按 clip（原画上的 0–1 坐标，多边形）切出来
  const layersHTML = S.layers.map((l, i) => `<div class="layer" data-i="${i}" style="${l.clip ? `clip-path:polygon(${l.clip.map(([x, y]) => `${x * 100}% ${y * 100}%`).join(',')})` : ''}">
      <img src="${P.image}" alt="" draggable="false" /></div>`).join('');
  const spotsHTML = Object.entries(S.spots).map(([key, s]) => `<button class="spot" data-card="${key}" data-layer="${s.layer || 0}" style="left:${s.x * 100}%;top:${s.y * 100}%" aria-label="${textOf(S.cards[key].title, lang)}"></button>`).join('');
  const isMap = X.type === 'map', isCurtain = X.type === 'curtain';
  // 细节放大的热点（zooms：眼睛、嘴唇、珍珠……）；只有一个时也可以写成 zoom
  const ZOOMS = zoomsOf(X), ZL = X.zoomLabel || (X.zoom && X.zoom.label) || { zh: '放大看细节', en: 'Zoom in on details' };
  const zspotsHTML = ZOOMS.map((z, i) => `<button class="zspot" data-z="${i}" style="left:${z.x * 100}%;top:${z.y * 100}%">${ui(z.label.zh, z.label.en)}</button>`).join('');
  // 独家发现“帘子回来了”：示意的帘子放在背景（第 0 层）上面、人物各层下面
  const curtainHTML = isCurtain ? `<div id="curtain" class="curtain" style="--curtain:${X.color || '#3c5a3a'};--curtain-on:${X.opacity ?? 0.75}"></div>` : '';

  document.body.insertAdjacentHTML('beforeend', `
  <div class="grain"></div>
  <div id="stageWrap"><div id="stage" role="img" ${altAttr(P.alt || '')}>${layersHTML.replace('</div>', '</div>' + curtainHTML)}<div id="spots">${spotsHTML}</div><div id="zspots">${zspotsHTML}</div></div></div>

  <div id="intro">
    <img id="introImg" src="${P.image}" ${altAttr(P.alt || '')} />
    <div id="introMissing" class="hidden">${ui(`（找不到 ${P.image}）`, `(Image not found: ${P.image})`)}</div>
    <div id="introBottom">
      <button id="enter" class="btn primary">${bi(S.enter)}</button>
      ${oneMinuteHTML()}
      <div id="introInfo" class="panel"><div class="lbl">${bi(labelLine, ' / ')}</div><div>${imgLine}</div></div>
    </div>
  </div>
  <a id="sceneHome" href="${ROOT}">← ${ui('走进名画', 'Walk into Paintings')}</a>
  ${isCurtain && X.note ? `<div id="curtainNote" class="panel hidden">${bi(X.note, ' / ')}</div>` : ''}
  <div id="hint" class="panel"><span class="zh">${S.hint.zh}</span><span class="en-ui">${S.hint.en}</span></div>

  <div id="tools" class="ui">
    <a class="btn" href="${ROOT}">← ${ui('走进名画', 'Home')}</a>
    <button class="btn" id="compareBtn">${ui('对照原画', 'Original painting')}</button>
    ${isCurtain ? `<button class="btn" id="curtainBtn">✦ ${ui(X.label.zh, X.label.en)}</button>` : ''}
    ${ZOOMS.length ? `<button class="btn" id="zoomBtn">🔍 ${ui(ZL.zh, ZL.en)}</button>`
      : VARIANTS[variantOf(S)].zoomFirst ? `<a class="btn" id="zoomBtn" href="${(S.zoom && S.zoom.image) || P.image}" target="_blank" rel="noopener">🔍 ${ui('放大看细节', 'Zoom in on details')}</a>` : ''}
    ${isMap ? `<button class="btn" id="mapBtn">✦ ${ui(X.label.zh, X.label.en)}</button>` : ''}
  </div>
  <div id="status" class="ui">
    <div id="progress" class="panel"></div>
    <div id="leftHint" class="panel hidden"></div>
    <button class="btn hidden" id="ambBtn"></button>
    <button class="btn hidden" id="musBtn"></button>
    <div id="musInfo" class="panel hidden"></div>
    <button class="btn hidden" id="audioBtn"></button>
    <div id="guideBox" class="panel guide hidden"></div>
    <button class="btn primary hidden" id="endBtn">${ui('继续看故事', 'Continue the story')} →</button>
  </div>

  <div class="popup panel" id="compare">
    <button class="close" data-close="compare" aria-label="Close">×</button>
    <a href="${(S.zoom && S.zoom.image) || P.image}" target="_blank" rel="noopener"><img src="${P.image}" ${altAttr(P.alt || '')} /></a>
    <p>${bi(labelLine, ' / ')}<br><small>${imgLine}</small></p>
    <p><a class="btn" href="${(S.zoom && S.zoom.image) || P.image}" target="_blank" rel="noopener">${ui('看大图', 'Open full size')} ↗</a></p>
    ${recordHTML ? `<details class="rec-box"><summary>${ui('作品档案', 'Artwork record')}</summary>${recordHTML}</details>` : ''}
  </div>
  ${isMap ? `<div class="popup panel" id="where">
    <button class="close" data-close="where" aria-label="Close">×</button>
    <h3>${bi(X.title || X.label)}</h3>
    ${X.intro ? `<p class="where-intro">${bi(X.intro, ' / ')}</p>` : ''}
    ${worldMap(X)}
    ${(X.places || []).length ? `<ol class="where-list">${X.places.map(p => `<li class="${p.kind || ''}"><b>${bi(p.date, ' / ')}</b> · ${bi(p.name, ' / ')}${p.note ? ` <small>${bi(p.note, ' / ')}</small>` : ''}</li>`).join('')}</ol>`
      : `<p class="soon">${bi(X.empty || { zh: '名单核对中，即将补上。', en: 'The list is being checked and will be added soon.' }, ' / ')}</p>`}
    <p class="map-note">${bi(X.mapNote || { zh: '示意图：坐标是近似值。陆地轮廓来自 Natural Earth（公有领域）。', en: 'Schematic map: positions are approximate. Coastlines from Natural Earth (public domain).' }, ' ')}</p>
  </div>` : ''}

  <div id="card" class="panel">
    <button class="close" id="cardClose" aria-label="Close">×</button>
    <h3 id="cardTitle" class="zh"></h3>
    <div class="en-title" id="cardTitleEn"></div>
    <p id="cardZh" class="zh"></p>
    <p class="en" id="cardEn"></p>
    <p id="cardLinkP" class="hidden"><a id="cardLink" class="btn"></a></p>
    <p id="cardLetterP" class="hidden"><a id="cardLetter" class="work-link" target="_blank" rel="noopener">${ui('读原信', 'Read the letter')} ↗</a></p>
  </div>
  <div id="langSwitch">${langSwitchHTML()}</div>

  <div id="gallery">
    ${E.acts.map((a, i) => `
    <section class="act" id="act${i + 1}">
      ${a.image ? `<img class="reveal" src="${a.image}" ${altAttr(a.alt || '')} />` : ''}
      ${a.caption ? `<p class="act-cap reveal"><span class="zh">${a.caption.zh}</span><span class="en">${a.caption.en}</span></p>` : ''}
      <div class="act-text reveal">
        <h3><small>${a.kicker || ''}</small>${bi(a.title)}</h3>
        <p class="zh">${a.text.zh}</p>
        <p class="en">${a.text.en}</p>
      </div>
      <button class="btn reveal next" data-next="${i + 1 < E.acts.length ? 'act' + (i + 2) : 'actEnd'}">${ui('下一段', 'Next')} ↓</button>
    </section>`).join('')}
    <section class="act final" id="actEnd">
      <h2 class="reveal"><span class="zh">${E.final.zh}</span><small class="en">${E.final.en}</small>${E.finalBy ? `<small class="final-by">${bi(E.finalBy, ' / ')}</small>` : ''}</h2>
      ${recordHTML ? `<div class="section-title">${ui('作品档案', 'Artwork record')}<small class="en-sub">Artwork record</small></div>${recordHTML}` : ''}
      ${artist && artist.bio ? `<section class="artist-bio">
        <div class="section-title">${ui('关于画家', 'About the artist')}</div>
        <p><span class="zh">${artist.bio.zh}</span><span class="en">${artist.bio.en}</span></p>
        <p><a class="btn" href="${ROOT}artists/?id=${artist.id}">${ui('更多' + artist.name.zh + '的画', 'More by ' + artist.name.en)} →</a></p>
      </section>` : ''}
      <div class="section-title">${ui('去现场看真迹', 'See it in person')}<small class="en-sub">See it in person</small></div>
      <div class="links">${seeInPersonHTML(R, meta) || museumLinks}</div>
      ${nextHTML}
      <div class="end-actions">
        ${[].concat(E.exit || []).filter(x => isLive(R, x.scene)).map(x => `<a class="btn primary" href="${x.href}">${ui(x.label.zh, x.label.en)} →</a>`).join('')}
        <button class="btn" id="backRoom">← ${ui('回到画里', 'Back to the painting')}</button>
        <a class="btn" href="${ROOT}">${ui('更多名画', 'More paintings')} →</a>
      </div>
      ${readingItems.length ? `<section class="reading"><div class="section-title">${ui('延伸阅读与来源', 'Further reading and sources')}</div>
        <ul>${readingItems.map(it => `<li><a href="${it.url}" target="_blank" rel="noopener">${bi(it.title, ' / ')}</a> ↗</li>`).join('')}</ul></section>` : ''}
      <div class="credit">${imgLine}<br>${creditHTML()}</div>
    </section>
  </div>`);
}

function run(S, R) {
  const $ = id => document.getElementById(id);
  const stage = $('stage'), wrap = $('stageWrap'), layers = [...stage.querySelectorAll('.layer')], spots = [...stage.querySelectorAll('.spot')];
  const A = S.painting.width / S.painting.height;

  // ---------- 原画放在画面正中（留一点边，移动时不露出空白） ----------
  function fit() {
    const W = window.innerWidth, H = window.innerHeight, m = 0.86;
    let w = W * m, h = w / A;
    if (h > H * m) { h = H * m; w = h * A; }
    Object.assign(stage.style, { width: w + 'px', height: h + 'px', left: (W - w) / 2 + 'px', top: (H - h) / 2 + 'px' });
    const ii = $('introImg'); Object.assign(ii.style, { width: w + 'px', height: h + 'px', left: (W - w) / 2 + 'px', top: (H - h) / 2 + 'px' });
  }
  fit(); window.addEventListener('resize', fit);
  const introImg = $('introImg');
  const introFail = () => { introImg.classList.add('hidden'); $('introMissing').classList.remove('hidden'); };
  introImg.addEventListener('error', introFail, { once: true });
  if (introImg.complete && introImg.naturalWidth === 0) introFail();

  // ---------- 分层景深：目标位置（-1..1）慢慢跟上 ----------
  const MAX = S.parallax || 16;   // 最前面一层最多移动多少像素
  let tx = 0, ty = 0, cx = 0, cy = 0;
  window.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') { tx = e.clientX / window.innerWidth * 2 - 1; ty = e.clientY / window.innerHeight * 2 - 1; }
  });
  let drag = null;   // 手机上：拖动画面
  wrap.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') drag = { x: e.clientX, y: e.clientY, tx, ty }; });
  wrap.addEventListener('pointermove', e => {
    if (!drag) return;
    tx = Math.max(-1, Math.min(1, drag.tx + (e.clientX - drag.x) / 120)); ty = Math.max(-1, Math.min(1, drag.ty + (e.clientY - drag.y) / 120));
  });
  const endDrag = () => { drag = null; };
  wrap.addEventListener('pointerup', endDrag); wrap.addEventListener('pointercancel', endDrag);
  let tilt0 = null;
  function onTilt(e) {   // 转动手机
    if (e.gamma == null) return;
    if (!tilt0) tilt0 = { g: e.gamma, b: e.beta };
    tx = Math.max(-1, Math.min(1, (e.gamma - tilt0.g) / 20)); ty = Math.max(-1, Math.min(1, (e.beta - tilt0.b) / 20));
  }
  function startTilt() {
    const D = window.DeviceOrientationEvent;
    if (!D) return;
    if (typeof D.requestPermission === 'function') D.requestPermission().then(r => { if (r === 'granted') window.addEventListener('deviceorientation', onTilt); }).catch(() => {});
    else window.addEventListener('deviceorientation', onTilt);
  }
  const depth = i => (S.layers[i] && S.layers[i].depth) || 0;
  const ZOOMS = zoomsOf(S.exclusive || {});   // 细节放大：画面放大到原画上的 (x, y)
  let zoomT = 0, zoomK = 0, zoomAt = null, zx = 0.5, zy = 0.5, zs = 1;   // zx、zy、zs：现在对准的点和倍数（慢慢跟上目标）
  function frame() {
    requestAnimationFrame(frame);
    if (gallery.classList.contains('show')) return;
    cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
    zoomK += (zoomT - zoomK) * 0.06;
    if (zoomAt) { zx += (zoomAt.x - zx) * 0.08; zy += (zoomAt.y - zy) * 0.08; zs += ((zoomAt.scale || 4) - zs) * 0.08; }
    let zoomCSS = '';
    if (zoomK > 0.001) {   // 把那一点移到屏幕中间，再放大（以画面中心为原点）
      const w = stage.offsetWidth, h = stage.offsetHeight, s = 1 + (zs - 1) * zoomK;
      const px = (zx - 0.5) * w, py = (zy - 0.5) * h;   // 那一点离画面中心多远
      const cxS = stage.offsetLeft + w / 2, cyS = stage.offsetTop + h / 2;
      const qx = cxS + px + (window.innerWidth / 2 - cxS - px) * zoomK, qy = cyS + py + (window.innerHeight / 2 - cyS - py) * zoomK;
      zoomCSS = `translate(${qx - cxS - s * px}px, ${qy - cyS - s * py}px) scale(${s})`;
    }
    stage.style.transform = `${zoomCSS} perspective(1400px) rotateY(${cx * 3 * (1 - zoomK)}deg) rotateX(${-cy * 2 * (1 - zoomK)}deg)`;
    layers.forEach((l, i) => { l.style.transform = `translate(${-cx * MAX * depth(i)}px, ${-cy * MAX * depth(i)}px) scale(${1 + depth(i) * 0.02})`; });
    spots.forEach(s => { const d = depth(+s.dataset.layer); s.style.transform = `translate(calc(-50% + ${-cx * MAX * d}px), calc(-50% + ${-cy * MAX * d}px))`; });
  }

  // ---------- 开场 ----------
  const hint = $('hint');
  oneMinute($('oneMin'));   // 一分钟看一幅画（可选）
  cleanToggle($('tools'));   // 隐藏按钮（录屏、截图用）
  addEventListener('pointerdown', () => { if (document.body.classList.contains('in-room')) hint.style.opacity = 0; });   // 点任意处，操作提示就淡出
  $('enter').onclick = () => {
    track('step-inside-' + S.id);   // 访问统计：走进画里
    startTilt();
    $('intro').classList.add('fade');
    setTimeout(() => { $('intro').style.display = 'none'; document.body.classList.add('in-room'); hint.style.opacity = 1; setTimeout(() => hint.style.opacity = 0, 4000); }, 1200);
  };
  requestAnimationFrame(frame);

  // ---------- 卡片 ----------
  const card = $('card'), found = new Set(), TOTAL = Object.keys(S.cards).length, UNLOCK = S.ending.unlockAfter ?? TOTAL;
  function updateProgress() {
    $('progress').textContent = (lang === 'en' ? 'Found ' : '已发现 ') + `${found.size}/${TOTAL}`;
    const left = TOTAL - found.size, show = found.size >= UNLOCK;
    $('endBtn').classList.toggle('hidden', !show);
    $('leftHint').classList.toggle('hidden', !show || left === 0);
    $('leftHint').innerHTML = `<span class="zh">还有 ${left} 个没发现</span><span class="en"><span class="zh"> / </span>${left} left to find</span>`;
  }
  function showCard(key) {
    hint.style.opacity = 0;   // 提示不遮挡卡片
    const t = S.cards[key];
    $('cardTitle').textContent = t.title.zh; $('cardTitleEn').textContent = t.title.en;
    $('cardZh').textContent = t.text.zh; $('cardEn').textContent = t.text.en;
    const linkOn = t.link && isLive(R, t.link.scene);
    $('cardLinkP').classList.toggle('hidden', !linkOn);
    if (linkOn) { $('cardLink').href = t.link.href; $('cardLink').innerHTML = ui(t.link.label.zh, t.link.label.en) + ' →'; }
    const letter = t.letter && t.letter.url;   // 卡片引用了书信：“读原信”链接到 vangoghletters.org
    $('cardLetterP').classList.toggle('hidden', !letter);
    if (letter) $('cardLetter').href = letter;
    card.style.display = 'block';
    found.add(key); updateProgress();
    if (found.size === 3 && !found.counted) { found.counted = true; track('found-3-' + S.id); }   // 访问统计：发现了3处
    spots.forEach(s => s.classList.toggle('seen', found.has(s.dataset.card)));
  }
  spots.forEach(s => s.onclick = e => { e.stopPropagation(); showCard(s.dataset.card); });
  $('cardClose').onclick = () => { card.style.display = 'none'; };

  // ---------- 弹窗 ----------
  const popups = { compare: $('compare') };
  if ($('where')) popups.where = $('where');
  function togglePopup(name, show) {
    for (const k in popups) if (k !== name) popups[k].style.display = 'none';
    const el = popups[name]; el.style.display = (show ?? el.style.display !== 'block') ? 'block' : 'none';
  }
  $('compareBtn').onclick = () => togglePopup('compare');
  const sound = setupSound(S, { ambBtn: $('ambBtn'), musBtn: $('musBtn'), info: $('musInfo') });   // 环境音、音乐（都默认关闭）
  setupGuide(S, { btn: $('audioBtn'), box: $('guideBox'), duck: on => sound.guide(on) });   // 语音导览（有录音才显示）
  if ($('mapBtn')) $('mapBtn').onclick = () => togglePopup('where');
  if ($('curtainBtn')) $('curtainBtn').onclick = () => {   // 帘子回来了：慢慢浮现 / 消失
    const on = !$('curtainBtn').classList.contains('on');
    $('curtainBtn').classList.toggle('on', on); $('curtain').classList.toggle('on', on);
    if ($('curtainNote')) $('curtainNote').classList.toggle('hidden', !on);
    if (on) track('exclusive-' + S.id);
  };
  // 细节放大：点按钮，画上出现热点；点热点放大到那里（有卡片的显示卡片文字）；放大时再点按钮缩回去
  function zoomTo(z) {
    zoomAt = z; zoomT = z ? 1 : 0;
    if (z && zoomK < 0.01) { zx = z.x; zy = z.y; zs = z.scale || 4; }
    document.body.classList.toggle('zoomed', !!z);
    if (z && z.card) showCard(z.card); else card.style.display = 'none';
    if (z) track('zoom-' + S.id + '-' + (z.id || ''));
  }
  if (ZOOMS.length) {
    $('zoomBtn').onclick = () => {
      if (zoomAt) { zoomTo(null); return; }
      const on = !document.body.classList.contains('zoom-pick');
      document.body.classList.toggle('zoom-pick', on); $('zoomBtn').classList.toggle('on', on);
      if (ZOOMS.length === 1 && on) zoomTo(ZOOMS[0]);
    };
    document.querySelectorAll('.zspot').forEach(b => b.onclick = e => { e.stopPropagation(); zoomTo(ZOOMS[+b.dataset.z]); });
  }
  document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => togglePopup(b.dataset.close, false));

  // ---------- 短故事 ----------
  const gallery = $('gallery');
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('seen'); }), { root: gallery, threshold: 0.25 });
  document.querySelectorAll('.act').forEach(a => io.observe(a));
  document.querySelectorAll('.next').forEach(b => b.onclick = () => $(b.dataset.next).scrollIntoView({ behavior: 'smooth' }));
  $('endBtn').onclick = () => {
    track('ending-' + S.id);   // 访问统计：看故事结局
    card.style.display = 'none'; for (const k in popups) togglePopup(k, false);
    gallery.style.display = 'block';
    gallery.style.scrollBehavior = 'auto'; gallery.scrollTop = 0; gallery.style.scrollBehavior = '';
    requestAnimationFrame(() => gallery.classList.add('show'));
  };
  $('backRoom').onclick = () => { gallery.classList.remove('show'); setTimeout(() => { gallery.style.display = 'none'; }, 900); };
  onLang(updateProgress);
  updateProgress();
  if (location.search.includes('debug')) window.__light = { showCard, togglePopup, zoom: i => { zoomTo(i == null ? null : ZOOMS[i]); }, setView: (x, y) => { tx = x; ty = y; } };
}
