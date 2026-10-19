// =====================================================================
// 走进名画 · 共用的网站功能（首页、系列页、浏览页、关于页都用它）
//   - 中文 / EN / 双语 切换，浅色 / 深色 / 跟随系统 切换（记住选择）
//   - 页眉、页脚
//   - 读取 data/scenes.json 登记表，画出场景卡片
// 场景页（3D）也会用这里的语言和配色切换。
// =====================================================================
import { LAND } from './world-land.js';   // 地图的陆地轮廓

// 网站根目录（不管网站放在哪个网址下面都能找到）
export const ROOT = new URL('../', import.meta.url).href;

// ---------- 双语文字 ----------
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// { zh, en } → 两个 span；只有一种语言时就直接显示那一种
// 双语时中间加分隔符（只在双语时出现）；标题里英文会换到下一行（见 style.css 的 .sep）
export function bi(o, sep = ' · ') {
  if (o == null) return '';
  if (typeof o === 'string') return esc(o);
  if (o.zh && o.en && o.zh !== o.en) return `<span class="zh">${esc(o.zh)}</span><span class="en"><span class="zh sep">${sep}</span>${esc(o.en)}</span>`;
  return esc(o.zh || o.en || '');
}
// 界面上的短标签：中文/双语 显示中文，EN 显示英文
export const ui = (zh, en) => `<span class="zh">${esc(zh)}</span><span class="en-ui">${esc(en)}</span>`;
// 图片说明：{ zh, en } → alt 属性（切换语言时自动换）
export const altAttr = o => `alt="${esc(textOf(o, lang))}" data-alt-zh="${esc(textOf(o, 'zh'))}" data-alt-en="${esc(textOf(o, 'en'))}"`;
export const textOf = (o, lang) => (o == null ? '' : typeof o === 'string' ? o : (lang === 'en' ? (o.en || o.zh) : (o.zh || o.en)));

// ---------- 偏好设置：语言、配色 ----------
const store = {
  get(k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};
// 第一次来（还没选过）：浏览器是中文 → 双语；其他语言 → 英文
const browserIsZh = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || '']).some(l => /^zh/i.test(l));
export let lang = store.get('wip-lang', browserIsZh ? 'both' : 'en');
const langListeners = [];
export function onLang(fn) { langListeners.push(fn); }
export function setLang(l) {
  if (!['zh', 'en', 'both'].includes(l)) l = browserIsZh ? 'both' : 'en';
  lang = l;
  document.body.classList.remove('lang-zh', 'lang-en', 'lang-both');
  document.body.classList.add('lang-' + l);
  document.documentElement.lang = l === 'en' ? 'en' : 'zh-CN';
  store.set('wip-lang', l);
  langListeners.forEach(fn => fn(l));   // 先让页面重画（比如地图），再给新内容标语言
  // 每段文字标上自己的语言（读屏软件、翻译、搜索引擎会用到）
  document.querySelectorAll('.en, .en-ui, .en-title').forEach(e => { if (!e.lang) e.lang = 'en'; });
  document.querySelectorAll('.zh').forEach(e => { if (!e.lang) e.lang = 'zh-CN'; });
  // 图片的文字说明（alt）也跟着语言换
  document.querySelectorAll('img[data-alt-en]').forEach(i => { i.alt = l === 'en' ? i.dataset.altEn : i.dataset.altZh; });
  document.querySelectorAll('[data-lang]').forEach(b => b.classList.toggle('on', b.dataset.lang === l));
}
export function setTheme(t) {
  if (!['light', 'dark', 'auto'].includes(t)) t = 'auto';
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  document.querySelectorAll('[data-theme-btn]').forEach(b => b.classList.toggle('on', b.dataset.themeBtn === t));
  store.set('wip-theme', t);
}
export const langSwitchHTML = () => `<div class="seg" role="group" aria-label="Language">
    <button data-lang="zh">中文</button><button data-lang="en">EN</button><button data-lang="both">${ui('双语', 'Both')}</button></div>`;
export const themeSwitchHTML = () => `<div class="seg" role="group" aria-label="Theme">
    <button data-theme-btn="light">${ui('浅色', 'Light')}</button><button data-theme-btn="dark">${ui('深色', 'Dark')}</button><button data-theme-btn="auto">${ui('自动', 'Auto')}</button></div>`;
export function wirePrefs(root = document) {
  root.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => setLang(b.dataset.lang));
  root.querySelectorAll('[data-theme-btn]').forEach(b => b.onclick = () => setTheme(b.dataset.themeBtn));
  setLang(lang);
  setTheme(store.get('wip-theme', 'auto'));
}
// 页面一打开就套用（避免先闪一下别的配色）
setTheme(store.get('wip-theme', 'auto'));

// ---------- 署名（全站统一：页脚、场景页都用） ----------
export const CREDIT = {
  byUrl: 'https://tiaz369.github.io',
  zh: ['创意、故事与文字：', 'Tia', ' · 使用 Claude 制作'],
  en: ['Concept, stories and texts by ', 'Tia', ' · Built with Claude']
};
// 图片来源（放在每个场景的展签里）：{ zh, en } → “图片：… / Image: …”
export const imageSourceHTML = src => src ? bi({ zh: '图片：' + src.zh, en: 'Image: ' + src.en }, ' / ') : '';
// ★ 社交账号：填上网址后页脚会自动出现链接
export const SOCIAL = [
  { name: 'X', url: '' },
  { name: { zh: '小红书', en: 'Xiaohongshu' }, url: '' }
];
const creditLine = ([a, name, b]) => `${esc(a)}<a href="${CREDIT.byUrl}">${esc(name)}</a>${esc(b)}`;
// inline = 一行显示（双语时用 / 隔开）；默认中英文各占一行
export const creditHTML = (inline = false) => inline
  ? `<span class="zh">${creditLine(CREDIT.zh)}</span><span class="en"><span class="zh sep"> / </span>${creditLine(CREDIT.en)}</span>`
  : `<span class="zh credit-line">${creditLine(CREDIT.zh)}</span><span class="en credit-line">${creditLine(CREDIT.en)}</span>`;

// ---------- 给搜索引擎看的文字（tools/build.py 写进 html 的）：JavaScript 画好页面后就不需要了 ----------
export function removeStatic() { const s = document.getElementById('static'); if (s) s.remove(); }

// ---------- 访问统计（GoatCounter） ----------
// ★ 在 goatcounter.com 注册后，把你的代码（网址 https://代码.goatcounter.com 里的“代码”）填在这里
export const GOATCOUNTER = '';
if (GOATCOUNTER && !location.hostname.match(/^(localhost|127\.)/)) {
  const sc = document.createElement('script');
  sc.async = true; sc.src = 'https://gc.zgo.at/count.js'; sc.dataset.goatcounter = `https://${GOATCOUNTER}.goatcounter.com/count`;
  document.head.append(sc);
}

// ---------- 登记表 ----------
let registryPromise = null;
export function loadRegistry() {
  if (!registryPromise) registryPromise = fetch(ROOT + 'data/scenes.json', { cache: 'no-cache' }).then(r => r.json()).then(prepare);
  return registryPromise;
}
function prepare(R) {
  const byId = list => Object.fromEntries(list.map(x => [x.id, x]));
  R.allScenes = R.scenes;
  R.scenes = R.scenes.filter(s => s.status !== 'planned');   // 计划中的作品：暂不在页面显示
  R.cityById = byId(R.cities || []);
  R.sceneById = byId(R.scenes); R.artistById = byId(R.artists); R.museumById = byId(R.museums);
  R.collectionById = byId(R.collections); R.themeById = byId(R.themes); R.periodById = byId(R.periods); R.placeById = byId(R.places);
  R.live = R.scenes.filter(s => s.status === 'live');
  return R;
}
export const sceneUrl = s => ROOT + s.path;

// 场景卡片：已上线的可以点进去；还没做的显示“即将开放”
// opts：hideArtist / hideMuseum 不写画家 / 博物馆；title、cover 换成别的版本；workLink 在卡片下面加“官网作品页”
export function sceneCard(R, s, opts = {}) {
  const artist = !opts.hideArtist && R.artistById[s.artist], museum = !opts.hideMuseum && R.museumById[opts.museum || s.museum];
  // 画家页：年份 · 收藏地；博物馆页：年份 · 画家；其他页面：画家 · 年份，下一行收藏地
  const short = opts.hideArtist || opts.hideMuseum;
  const meta = short ? [bi(opts.year || s.year), artist && bi(artist.name), museum && bi(museum.name)].filter(Boolean).join(' · ')
    : [artist && bi(artist.name), bi(opts.year || s.year)].filter(Boolean).join(' · ');
  const live = s.status === 'live', title = opts.title || s.title, cover = opts.cover || s.cover;
  const pic = live && cover
    ? `<img src="${ROOT + cover}" ${altAttr(title)} loading="lazy" />`
    : `<span class="soon">${ui('即将开放', 'Coming soon')}</span>`;
  const inner = `<div class="pic">${pic}</div><div class="name">${bi(title)}</div>
    <div class="meta">${meta}</div>${museum && !short ? `<div class="meta">${bi(museum.name)}</div>` : ''}`;
  const card = live ? `<a class="card" href="${sceneUrl(s)}">${inner}</a>` : `<div class="card is-soon">${inner}</div>`;
  const url = opts.workLink && (opts.artworkUrl ?? s.artworkUrl);
  const below = (url ? `<a class="work-link" href="${url}" target="_blank" rel="noopener">${ui('官网作品页', 'Museum page')} ↗</a>` : '')
    + (opts.credit ? `<small class="img-credit">${bi(opts.credit, ' / ')}</small>` : '');
  return below ? `<div class="card-wrap">${card}${below}</div>` : card;
}
// items：场景，或 { s: 场景, opts: {...} }
export const cardsHTML = (R, list, opts = {}) => list.length ? `<div class="cards">${list.map(x => x.s ? sceneCard(R, x.s, { ...opts, ...x.opts }) : sceneCard(R, x, opts)).join('')}</div>` : `<p class="soon">${ui('即将开放', 'Coming soon')}</p>`;
// 即将开放的作品最多显示几个（画家页、博物馆页）
export const SOON_MAX = 3;
const capSoon = list => { let n = 0; return list.filter(x => ((x.s || x).status === 'live') || n++ < SOON_MAX); };

// ---------- 页眉、页脚 ----------
const NAV = [
  ['', '首页', 'Home'],
  ['artists/', '画家', 'Artists'], ['themes/', '主题', 'Themes'], ['periods/', '时期', 'Periods'],
  ['map/', '地图', 'Map'], ['museums/', '博物馆', 'Museums'], ['about/', '关于', 'About']
];
export function chrome(active) {
  const header = document.createElement('header');
  header.className = 'wrap site-header';
  header.innerHTML = `<a class="brand" href="${ROOT}">${ui('走进名画', 'Walk into Paintings')}<small class="zh">Walk into Paintings</small></a>
    <nav class="site-nav">${NAV.slice(1).map(([p, zh, en]) => `<a href="${ROOT + p}" class="${active === p ? 'on' : ''}">${ui(zh, en)}</a>`).join('')}</nav>`;
  document.body.prepend(header);
  const footer = document.createElement('footer');
  footer.className = 'wrap site-footer';
  const social = SOCIAL.filter(s => s.url).map(s => `<a href="${s.url}" target="_blank" rel="noopener">${bi(s.name)}</a>`).join(' · ');
  footer.innerHTML = `<div class="prefs">${langSwitchHTML()}${themeSwitchHTML()}</div>
    ${social ? social + '<br>' : ''}${creditHTML()}`;
  document.body.append(footer);
  wirePrefs();
}

// ---------- 地图：两层（画在哪里 / 现在在哪里） ----------
// 陆地轮廓来自 Natural Earth（assets/world-land.js）。每一块地图按经纬度范围 box 画出来，
// 东西方向按纬度稍微压扁一点，看起来不会太宽。
const MAP_BOXES = {
  painted: [{ box: { w: -5, e: 12, s: 42, n: 52.8 } }],
  now: [{ box: { w: -90, e: -70, s: 36.5, n: 44.5 }, name: { zh: '北美', en: 'North America' } },
        { box: { w: -2.5, e: 8, s: 47.3, n: 53.8 }, name: { zh: '欧洲', en: 'Europe' } }]
};
// 一层地图上的圆点：画在哪里 = 场景的 place；现在在哪里 = 博物馆所在的城市
function mapDots(R, layer) {
  if (layer === 'painted') return R.places.map(p => {
    const list = R.scenes.filter(s => s.place === p.id);
    return list.length && { id: p.id, name: p.name, lat: p.lat, lon: p.lon, label: p.label, live: list.some(s => s.status === 'live') };
  }).filter(Boolean);
  return (R.cities || []).map(c => {
    const list = museumsIn(R, c.id).flatMap(m => museumItems(R, m.id));
    return list.length && { id: c.id, name: c.name, lat: c.lat, lon: c.lon, label: c.label, live: list.some(x => (x.s || x).status === 'live') };
  }).filter(Boolean);
}
export function mapSVG(R, { layer = 'painted', small = false } = {}) {
  const H = layer === 'painted' ? 460 : 300, GAP = 14;
  const dots = mapDots(R, layer);
  let x0 = 0, body = '';
  for (const P of MAP_BOXES[layer]) {
    const b = P.box, py = H / (b.n - b.s), px = py * Math.min(1, Math.cos((b.n + b.s) / 2 * Math.PI / 180) * 1.3), w = px * (b.e - b.w);
    const vx = (b.w + 180) / 360 * LAND.w, vy = (LAND.north - b.n) / 360 * LAND.w, vw = (b.e - b.w) / 360 * LAND.w, vh = (b.n - b.s) / 360 * LAND.w;
    body += `<svg x="${x0}" y="0" width="${w}" height="${H}" viewBox="${vx} ${vy} ${vw} ${vh}" preserveAspectRatio="none"><path class="land" d="${LAND.d}"/></svg>`;
    if (P.name) body += `<text class="panel-name" x="${x0 + 10}" y="22">${esc(textOf(P.name, lang))}</text>`;
    if (x0) body += `<line class="grid" x1="${x0 - GAP / 2}" y1="0" x2="${x0 - GAP / 2}" y2="${H}"/>`;
    for (const d of dots) {
      if (d.lon < b.w || d.lon > b.e || d.lat < b.s || d.lat > b.n) continue;
      const cx = x0 + (d.lon - b.w) * px, cy = (b.n - d.lat) * py;
      const [tx, ty, anchor] = { l: [cx - 10, cy + 4, 'end'], t: [cx, cy - 11, 'middle'], b: [cx, cy + 19, 'middle'] }[d.label] || [cx + 10, cy + 4, 'start'];
      body += `<a href="${ROOT}map/?layer=${layer}#${d.id}"><circle class="${d.live ? 'dot' : 'dot-soon'}" cx="${cx}" cy="${cy}" r="${small ? 5 : 6}"/>
        <text x="${tx}" y="${ty}" text-anchor="${anchor}">${esc(textOf(d.name, lang))}</text></a>`;
    }
    x0 += w + GAP;
  }
  const note = layer === 'painted' ? ui('示意图：按经纬度标出画作诞生的城市。', 'Schematic map: places where the paintings were made, plotted by latitude and longitude.')
    : ui('示意图：按经纬度标出收藏这些画的博物馆所在的城市。', 'Schematic map: cities of the museums that hold the paintings, plotted by latitude and longitude.');
  return `<svg class="map" viewBox="0 0 ${x0 - GAP} ${H}" role="img" aria-label="Map">${body}</svg>
    <div class="map-note">${note} ${ui('陆地轮廓：Natural Earth（公有领域）。', 'Coastlines: Natural Earth (public domain).')}</div>`;
}

// =====================================================================
// 各个页面的内容（首页、系列页、五种浏览页、关于）
// 页面文件只写一行：renderPage('home') 之类，内容都从登记表里来。
// =====================================================================
const SOON = () => `<span class="soon">${ui('即将开放', 'Coming soon')}</span>`;
// 系列的状态：有作品时“现在开放：… · 下一站：…”，还没有作品时“即将开放”（不显示数字）
const openLine = (list) => {
  const live = list.filter(s => s.status === 'live'), next = list.find(s => s.status !== 'live');
  if (!live.length) return ui('即将开放', 'Coming soon');
  const part = (lang, open, nextWord, join) => `${open}${live.map(s => textOf(s.title, lang)).join(join)}` + (next ? ` · ${nextWord}${textOf(next.title, lang)}` : '');
  return bi({ zh: part('zh', '现在开放：', '下一站：', '、'), en: part('en', 'Now open: ', 'Next: ', ', ') }, ' / ');
};
const scenesOf = (R, key, id) => R.scenes.filter(s => Array.isArray(s[key]) ? s[key].includes(id) : s[key] === id);
// 一家博物馆页面上的作品：收藏在这里的场景 + 收藏在这里的其他版本（比如芝加哥的1889年版卧室，链接到卧室场景）
function museumItems(R, id) {
  const own = scenesOf(R, 'museum', id).map(s => ({ s, opts: {} }));
  const also = R.scenes.flatMap(s => (s.alsoAt || []).filter(v => v.museum === id)
    .map(v => ({ s, opts: { title: v.title, year: v.year, cover: v.cover, artworkUrl: v.artworkUrl, credit: v.credit, museum: v.museum } })));
  return [...own, ...also].sort((a, b) => (a.s.status === 'live' ? 0 : 1) - (b.s.status === 'live' ? 0 : 1));
}
const museumsIn = (R, cityId) => R.museums.filter(m => m.city === cityId);
// 页面底部一行小字：还没有作品可以显示的画家 / 博物馆 / 主题
const laterLine = items => items.length ? `<p class="later">${ui('即将推出：', 'Coming soon: ')}${items.join(' · ')}</p>` : '';
const artistName = a => bi({ zh: a.name.zh + (a.dates ? `（${a.dates.zh}）` : ''), en: a.name.en + (a.dates ? ` (${a.dates.en})` : '') });
const labelOf = (R, s) => {   // 展签：画名 · 画家 · 年份 · 收藏地
  const a = R.artistById[s.artist], m = R.museumById[s.museum];
  return [bi(s.title), a && bi(a.name), bi(s.year), m && bi(m.name)].filter(Boolean).join(' · ');
};
const param = k => new URLSearchParams(location.search).get(k);

// 五种浏览方式（例子是网站蓝图里的）
const WAYS = [
  { path: 'artists/', name: { zh: '按画家', en: 'By artist' }, ex: { zh: '梵高、维米尔、莫奈、德加', en: 'Van Gogh, Vermeer, Monet, Degas' } },
  { path: 'themes/',  name: { zh: '按主题', en: 'By theme' },  ex: { zh: '房间、窗户、咖啡馆、花与花园、首饰、孩子', en: 'Rooms, windows, cafés, flowers and gardens, jewellery, children' } },
  { path: 'periods/', name: { zh: '按时期', en: 'By period' }, ex: { zh: '荷兰黄金时代、印象派、后印象派', en: 'Dutch Golden Age, Impressionism, Post-Impressionism' } },
  { path: 'map/',     name: { zh: '按地图', en: 'By map' },    ex: { zh: '画在哪里、现在在哪里', en: 'Where it was painted, where it is now' } },
  { path: 'museums/', name: { zh: '按博物馆', en: 'By museum' }, ex: { zh: '梵高博物馆、荷兰国立博物馆、伦敦国家美术馆', en: 'Van Gogh Museum, Rijksmuseum, National Gallery' } }
];

// 关于页的文字在 data/about.json（Tia 提供，原文照录）
let ABOUT = null;
const para = (p, cls = '') => `<p class="zh ${cls}">${p.label ? `<strong>${esc(p.label.zh)}</strong>` : ''}${esc(p.zh)}</p>
  <p class="en ${cls}">${p.label ? `<strong>${esc(p.label.en)}</strong>` : ''}${esc(p.en)}</p>`;

const PAGES = {
  // ---------- 首页 ----------
  home(R, main) {
    const pick = R.live[Math.floor(Math.random() * R.live.length)];   // 每次打开随机换一幅
    // 最新上线的（同一天上线的，登记表里排在后面的算更新）
    const newest = R.live.map((s, i) => [s, i]).sort((a, b) => (b[0].added || '').localeCompare(a[0].added || '') || b[1] - a[1])[0][0];
    main.innerHTML = `
      <section class="hero">
        <img src="${ROOT + pick.cover}" ${altAttr(pick.title)} />
        <div class="tagline">
          <div class="t-en en">Step inside the world's great paintings.</div>
          <div class="t-zh zh">走进世界名画的内部。</div>
          <a class="btn primary" href="${sceneUrl(pick)}">${ui('走进画里', 'Step into the painting')}</a>
          <div class="label">${labelOf(R, pick)}${pick.imageSource ? '<br>' + imageSourceHTML(pick.imageSource) : ''}</div>
        </div>
      </section>

      <section class="section wrap" id="new">
        <h2>${ui('最新开放', 'Latest')}</h2>
        <div class="cards" style="max-width:420px">${sceneCard(R, newest)}</div>
        ${newest.tagline ? `<p class="lead" style="margin-top:12px">${bi(newest.tagline, ' / ')}</p>` : ''}
      </section>

      <section class="section wrap" id="collections">
        <h2>${ui('系列', 'Collections')}</h2>
        <div class="series">${R.collections.map(c => `
          <a href="${ROOT}collections/${c.id}/" data-series="${c.accent || ''}">
            <div class="name">${bi(c.name)}</div><div class="desc">${bi(c.desc)}</div>
            <div class="count">${openLine(c.order.map(x => R.sceneById[x]).filter(Boolean))}</div></a>`).join('')}
        </div>
      </section>

      <section class="section wrap" id="browse">
        <h2>${ui('五种浏览方式', 'Five ways to browse')}</h2>
        <div class="ways">${WAYS.map(w => `<a href="${ROOT + w.path}"><div class="name">${bi(w.name)}</div><div class="ex">${bi(w.ex, ' / ')}</div></a>`).join('')}</div>
      </section>

      <section class="section wrap" id="map-preview">
        <h2>${ui('地图', 'Map')}</h2>
        <a href="${ROOT}map/" style="display:block;max-width:560px" id="mapBox">${mapSVG(R, { small: true })}</a>
      </section>

      <section class="section wrap" id="about-preview">
        <h2>${ui('关于这个项目', 'About this project')}</h2>
        ${para(ABOUT.home, 'lead')}
        <a class="btn" href="${ROOT}about/">${ui('关于', 'About')} →</a>
      </section>`;
    onLang(() => { const m = document.getElementById('mapBox'); if (m) m.innerHTML = mapSVG(R, { small: true }); });
  },

  // ---------- 系列页 ----------
  collection(R, main, { id }) {
    const c = R.collectionById[id];
    document.body.dataset.series = c.accent || '';
    const list = c.order.map(x => R.sceneById[x]).filter(Boolean);
    main.innerHTML = `
      <div class="wrap page-title"><h1>${bi(c.name)}<small class="sub">${bi(c.desc)}</small></h1>
        <p class="soon" style="margin-top:12px">${openLine(list)}</p></div>
      <section class="section wrap">${cardsHTML(R, list)}</section>`;
  },

  // ---------- 按画家（?id= 打开某一位画家的页面） ----------
  artists(R, main) {
    const id = param('id'), a = id && R.artistById[id];
    if (a) {
      main.innerHTML = `<div class="wrap page-title"><h1>${bi(a.name)}${a.dates ? `<small class="sub">${bi(a.dates)}</small>` : ''}</h1></div>
        <section class="section wrap">
          ${a.bio ? `<p class="lead">${bi(a.bio)}</p>` : ''}
          ${cardsHTML(R, capSoon(scenesOf(R, 'artist', a.id)), { hideArtist: true })}
          <p style="margin-top:28px"><a class="btn" href="${ROOT}artists/">← ${ui('所有画家', 'All artists')}</a></p></section>`;
      return;
    }
    main.innerHTML = `<div class="wrap page-title"><h1>${ui('按画家', 'By artist')}</h1></div>
      <section class="section wrap">${R.artists.filter(a => scenesOf(R, 'artist', a.id).length).map(a => `
        <div class="group"><h3><a href="?id=${a.id}" style="text-decoration:none">${artistName(a)}</a></h3>
        ${cardsHTML(R, capSoon(scenesOf(R, 'artist', a.id)), { hideArtist: true })}</div>`).join('')}
        ${laterLine(R.artists.filter(a => !scenesOf(R, 'artist', a.id).length).map(artistName))}</section>`;
  },

  // ---------- 按主题 ----------
  themes(R, main) {
    const hasLive = t => scenesOf(R, 'themes', t.id).some(s => s.status === 'live');
    const id = param('id'), one = id && R.themeById[id];
    if (one) {   // 某一个主题：已开放的全部 + 即将开放最多3个
      main.innerHTML = `<div class="wrap page-title"><h1>${bi(one.name)}</h1></div>
        <section class="section wrap">${cardsHTML(R, capSoon(scenesOf(R, 'themes', one.id)))}
          <p style="margin-top:28px"><a class="btn" href="${ROOT}themes/">← ${ui('所有主题', 'All themes')}</a></p></section>`;
      return;
    }
    // 有已开放作品的主题：可以点进去的卡片（封面用第一幅已开放的画）；其余放在底部一行小字
    main.innerHTML = `<div class="wrap page-title"><h1>${ui('按主题', 'By theme')}</h1></div>
      <section class="section wrap"><div class="cards">${(used => R.themes.filter(hasLive).map(t => {
        const list = scenesOf(R, 'themes', t.id), live = list.filter(s => s.status === 'live');
        const cover = live.find(s => s.cover && !used.has(s.id)) || live.find(s => s.cover);   // 尽量每个主题用不同的封面
        if (cover) used.add(cover.id);
        const soonN = Math.min(list.length - live.length, SOON_MAX);
        return `<a class="card" href="?id=${t.id}"><div class="pic">${cover ? `<img src="${ROOT + cover.cover}" ${altAttr(cover.title)} loading="lazy" />` : ''}</div>
          <div class="name">${bi(t.name)}</div><div class="meta">${ui(`${live.length} 幅已开放`, `${live.length} open`)}${soonN ? ' · ' + ui(`${soonN} 幅即将开放`, `${soonN} coming soon`) : ''}</div></a>`;
      }).join(''))(new Set())}</div>
        ${laterLine(R.themes.filter(t => !hasLive(t)).map(t => bi(t.name)))}</section>`;
  },

  // ---------- 按时期：一条时间轴 ----------
  periods(R, main) {
    main.innerHTML = `<div class="wrap page-title"><h1>${ui('按时期', 'By period')}</h1></div>
      <section class="section wrap"><div class="timeline">${R.periods.map(pd => {
        const list = scenesOf(R, 'period', pd.id);
        return `<div class="group" id="${pd.id}"><h3>${bi(pd.name)}</h3>${list.length ? cardsHTML(R, capSoon(list)) : SOON()}</div>`;
      }).join('')}</div></section>`;
  },

  // ---------- 地图：标出画作诞生地 ----------
  map(R, main) {
    let layer = param('layer') === 'now' ? 'now' : 'painted';
    const LAYERS = [['painted', '画在哪里', 'Where it was painted'], ['now', '现在在哪里', 'Where it is now']];
    const draw = () => {
      const groups = layer === 'painted'
        ? R.places.map(pl => { const list = scenesOf(R, 'place', pl.id); return list.length ? `<div class="group" id="${pl.id}"><h3>${bi(pl.name)}</h3>${cardsHTML(R, list)}</div>` : ''; }).join('')
        : (R.cities || []).map(c => {
            const ms = museumsIn(R, c.id).filter(m => museumItems(R, m.id).length);
            return ms.length ? `<div class="group" id="${c.id}"><h3>${bi(c.name)}</h3>${ms.map(m => `<p class="note"><a href="${ROOT}museums/?id=${m.id}">${bi(m.name)}</a></p>${cardsHTML(R, capSoon(museumItems(R, m.id)), { hideMuseum: true })}`).join('')}</div>` : '';
          }).join('');
      main.innerHTML = `<div class="wrap page-title"><h1>${ui('地图', 'Map')}</h1>
        <div class="seg map-layers" role="group" aria-label="Map layer">${LAYERS.map(([k, zh, en]) => `<button data-layer="${k}" class="${k === layer ? 'on' : ''}">${ui(zh, en)}</button>`).join('')}</div>
        <p class="lead">${layer === 'painted' ? ui('画作诞生的城市。实心圆点：已开放；空心圆点：即将开放。', 'Cities where the paintings were made. Filled dot: open; outline: coming soon.')
          : ui('这些画现在收藏在哪里。实心圆点：已开放；空心圆点：即将开放。', 'Where the paintings are now. Filled dot: open; outline: coming soon.')}</p></div>
        <section class="wrap">${mapSVG(R, { layer })}</section>
        <section class="section wrap">${groups || SOON()}</section>`;
      main.querySelectorAll('[data-layer]').forEach(b => b.onclick = () => {
        layer = b.dataset.layer; history.replaceState(null, '', layer === 'now' ? '?layer=now' : location.pathname); draw();
      });
    };
    draw(); onLang(draw);
  },

  // ---------- 按博物馆（?id= 打开某一家） ----------
  museums(R, main) {
    const visit = m => m.url ? `<a class="btn" href="${m.url}" target="_blank" rel="noopener">${ui('参观官网', 'Visit website')} ↗</a>` : '';
    const id = param('id'), one = id && R.museumById[id];
    const list = one ? [one] : R.museums.filter(m => museumItems(R, m.id).length);   // 还没有作品的博物馆先不列
    main.innerHTML = `<div class="wrap page-title"><h1>${one ? bi(one.name) : ui('按博物馆', 'By museum')}</h1></div>
      <section class="section wrap">${list.map(m => {
        const sc = museumItems(R, m.id);
        return `<div class="group" id="${m.id}">${one ? '' : `<h3><a href="?id=${m.id}" style="text-decoration:none">${bi(m.name)}</a></h3>`}
          <p class="note">${visit(m)}</p>${sc.length ? cardsHTML(R, capSoon(sc), { hideMuseum: true, workLink: true }) : SOON()}</div>`;
      }).join('')}
      ${one ? `<p style="margin-top:28px"><a class="btn" href="${ROOT}museums/">← ${ui('所有博物馆', 'All museums')}</a></p>`
        : laterLine(R.museums.filter(m => !museumItems(R, m.id).length).map(m => m.url ? `<a href="${m.url}" target="_blank" rel="noopener">${bi(m.name)} ↗</a>` : bi(m.name)))}</section>`;
  },

  // ---------- 关于（文字来自 Tia，见上面的 ABOUT） ----------
  // ---------- 404：找不到这一页 ----------
  notFound(R, main) {
    main.innerHTML = `<div class="wrap page-title"><h1>${ui('找不到这一页', 'Page not found')}</h1></div>
      <section class="section wrap"><p class="lead">${ui('这个网址没有内容。也许画搬家了？', 'There is nothing at this address. Perhaps the painting has moved?')}</p>
        <a class="btn primary" href="${ROOT}">${ui('回到走进名画', 'Back to Walk into Paintings')}</a></section>
      <section class="section wrap"><h2>${ui('现在开放', 'Now open')}</h2>${cardsHTML(R, R.live)}</section>`;
  },

  about(R, main) {
    main.innerHTML = `<div class="wrap page-title"><h1>${ui('关于', 'About')}</h1></div>
      <section class="section wrap about">
        ${ABOUT.intro.map(p => para(p, 'lead')).join('')}
        ${para(ABOUT.me)}
        ${para(ABOUT.principles)}
      </section>`;
  }
};

export async function renderPage(kind, opts = {}) {
  removeStatic();
  const main = document.createElement('main');
  document.body.append(main);
  chrome(opts.nav ?? (kind === 'home' ? '' : kind === 'collection' ? null : kind + '/'));
  document.querySelector('footer').before(main);
  try {
    const [R, about] = await Promise.all([loadRegistry(), fetch(ROOT + 'data/about.json', { cache: 'no-cache' }).then(r => r.json())]);
    ABOUT = about;
    PAGES[kind](R, main, opts);
  } catch (e) {
    main.innerHTML = `<div class="wrap page-title"><p class="soon">${ui('内容加载失败，请刷新页面。', 'Could not load. Please refresh.')}</p></div>`;
    console.error(e);
  }
  setLang(lang);   // 新加的内容也套用当前语言
}
