// =====================================================================
// 走进名画 · 共用的网站功能（首页、系列页、浏览页、关于页都用它）
//   - 中文 / EN / 双语 切换，浅色 / 深色 / 跟随系统 切换（记住选择）
//   - 页眉、页脚
//   - 读取 data/scenes.json 登记表，画出场景卡片
// 场景页（3D）也会用这里的语言和配色切换。
// =====================================================================

// 网站根目录（不管网站放在哪个网址下面都能找到）
export const ROOT = new URL('../', import.meta.url).href;

// ---------- 双语文字 ----------
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// { zh, en } → 两个 span；只有一种语言时就直接显示那一种
// 双语时中间加分隔符（只在双语时出现）；标题里英文会换到下一行（见 style.css 的 .sep）
export function bi(o, sep = ' · ') {
  if (o == null) return '';
  if (typeof o === 'string') return esc(o);
  if (o.zh && o.en) return `<span class="zh">${esc(o.zh)}</span><span class="en"><span class="zh sep">${sep}</span>${esc(o.en)}</span>`;
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
  if (!registryPromise) registryPromise = fetch(ROOT + 'data/scenes.json').then(r => r.json()).then(prepare);
  return registryPromise;
}
function prepare(R) {
  const byId = list => Object.fromEntries(list.map(x => [x.id, x]));
  R.sceneById = byId(R.scenes); R.artistById = byId(R.artists); R.museumById = byId(R.museums);
  R.collectionById = byId(R.collections); R.themeById = byId(R.themes); R.periodById = byId(R.periods); R.placeById = byId(R.places);
  R.live = R.scenes.filter(s => s.status === 'live');
  return R;
}
export const sceneUrl = s => ROOT + s.path;

// 场景卡片：已上线的可以点进去；还没做的显示“即将开放”
export function sceneCard(R, s) {
  const artist = R.artistById[s.artist], museum = R.museumById[s.museum];
  const meta = [artist && bi(artist.name), bi(s.year)].filter(Boolean).join(' · ');
  const live = s.status === 'live';
  const pic = live && s.cover
    ? `<img src="${ROOT + s.cover}" ${altAttr(s.title)} loading="lazy" />`
    : `<span class="soon">${ui('即将开放', 'Coming soon')}</span>`;
  const inner = `<div class="pic">${pic}</div><div class="name">${bi(s.title)}</div>
    <div class="meta">${meta}</div>${museum ? `<div class="meta">${bi(museum.name)}</div>` : ''}`;
  return live ? `<a class="card" href="${sceneUrl(s)}">${inner}</a>` : `<div class="card is-soon">${inner}</div>`;
}
export const cardsHTML = (R, list) => list.length ? `<div class="cards">${list.map(s => sceneCard(R, s)).join('')}</div>` : `<p class="soon">${ui('即将开放', 'Coming soon')}</p>`;

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

// ---------- 小地图（只标出画作诞生的城市） ----------
// 用经纬度直接换算位置；以后可以换成真正的地图
export function mapSVG(R, { width = 800, height = 520, small = false } = {}) {
  const box = { w: -7, e: 13, s: 41.5, n: 55.5 };   // 西欧的大致范围
  const x = lon => (lon - box.w) / (box.e - box.w) * width;
  const y = lat => (box.n - lat) / (box.n - box.s) * height;
  let g = '';
  for (let lon = -5; lon <= 12; lon += 5) g += `<line class="grid" x1="${x(lon)}" y1="0" x2="${x(lon)}" y2="${height}"/>`;
  for (let lat = 45; lat <= 55; lat += 5) g += `<line class="grid" x1="0" y1="${y(lat)}" x2="${width}" y2="${y(lat)}"/>`;
  let dots = '';
  for (const p of R.places) {
    const scenes = R.scenes.filter(s => s.place === p.id);
    if (!scenes.length) continue;
    const live = scenes.some(s => s.status === 'live');
    const cx = x(p.lon), cy = y(p.lat);
    dots += `<a href="${ROOT}map/#${p.id}"><circle class="${live ? 'dot' : 'dot-soon'}" cx="${cx}" cy="${cy}" r="${small ? 5 : 7}"/>
      <text x="${cx + 10}" y="${cy + 4}">${esc(textOf(p.name, lang))}</text></a>`;
  }
  return `<svg class="map" viewBox="0 0 ${width} ${height}" role="img" aria-label="Map">${g}${dots}</svg>
    <div class="map-note">${ui('示意图：按经纬度标出画作诞生的城市。', 'Schematic map: places plotted by latitude and longitude.')}</div>`;
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
const labelOf = (R, s) => {   // 展签：画名 · 画家 · 年份 · 收藏地
  const a = R.artistById[s.artist], m = R.museumById[s.museum];
  return [bi(s.title), a && bi(a.name), bi(s.year), m && bi(m.name)].filter(Boolean).join(' · ');
};
const param = k => new URLSearchParams(location.search).get(k);

// 五种浏览方式（例子是网站蓝图里的）
const WAYS = [
  { path: 'artists/', name: { zh: '按画家', en: 'By artist' }, ex: { zh: '梵高、维米尔、莫奈、德加', en: 'Van Gogh, Vermeer, Monet, Degas' } },
  { path: 'themes/',  name: { zh: '按主题', en: 'By theme' },  ex: { zh: '房间、窗户、咖啡馆、花园、首饰、孩子', en: 'Rooms, windows, cafés, gardens, jewellery, children' } },
  { path: 'periods/', name: { zh: '按时期', en: 'By period' }, ex: { zh: '荷兰黄金时代、印象派、后印象派', en: 'Dutch Golden Age, Impressionism, Post-Impressionism' } },
  { path: 'map/',     name: { zh: '按地图', en: 'By map' },    ex: { zh: '阿尔勒、巴黎、代尔夫特、伦敦', en: 'Arles, Paris, Delft, London' } },
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
      main.innerHTML = `<div class="wrap page-title"><h1>${bi(a.name)}</h1></div>
        <section class="section wrap">
          ${a.bio ? `<p class="lead">${bi(a.bio)}</p>` : ''}
          ${cardsHTML(R, scenesOf(R, 'artist', a.id))}
          <p style="margin-top:28px"><a class="btn" href="${ROOT}artists/">← ${ui('所有画家', 'All artists')}</a></p></section>`;
      return;
    }
    main.innerHTML = `<div class="wrap page-title"><h1>${ui('按画家', 'By artist')}</h1></div>
      <section class="section wrap">${R.artists.map(a => `
        <div class="group"><h3><a href="?id=${a.id}" style="text-decoration:none">${bi(a.name)}</a></h3>
        ${cardsHTML(R, scenesOf(R, 'artist', a.id))}</div>`).join('')}</section>`;
  },

  // ---------- 按主题 ----------
  themes(R, main) {
    main.innerHTML = `<div class="wrap page-title"><h1>${ui('按主题', 'By theme')}</h1></div>
      <section class="section wrap">${R.themes.map(t => {
        const list = scenesOf(R, 'themes', t.id);
        return `<div class="group" id="${t.id}"><h3>${bi(t.name)}</h3>${list.length ? cardsHTML(R, list) : SOON()}</div>`;
      }).join('')}</section>`;
  },

  // ---------- 按时期：一条时间轴 ----------
  periods(R, main) {
    main.innerHTML = `<div class="wrap page-title"><h1>${ui('按时期', 'By period')}</h1></div>
      <section class="section wrap"><div class="timeline">${R.periods.map(pd => {
        const list = scenesOf(R, 'period', pd.id);
        return `<div class="group" id="${pd.id}"><h3>${bi(pd.name)}</h3>${list.length ? cardsHTML(R, list) : SOON()}</div>`;
      }).join('')}</div></section>`;
  },

  // ---------- 地图：标出画作诞生地 ----------
  map(R, main) {
    const draw = () => {
      main.innerHTML = `<div class="wrap page-title"><h1>${ui('地图', 'Map')}</h1>
        <p class="lead">${ui('地图上标出画作诞生的城市。实心圆点：已开放；空心圆点：即将开放。', 'Cities where the paintings were made. Filled dot: open; outline: coming soon.')}</p></div>
        <section class="wrap">${mapSVG(R)}</section>
        <section class="section wrap">${R.places.map(pl => {
          const list = scenesOf(R, 'place', pl.id);
          return `<div class="group" id="${pl.id}"><h3>${bi(pl.name)}</h3>${list.length ? cardsHTML(R, list) : SOON()}</div>`;
        }).join('')}</section>`;
    };
    draw(); onLang(draw);
  },

  // ---------- 按博物馆（?id= 打开某一家） ----------
  museums(R, main) {
    const visit = m => m.url ? `<a class="btn" href="${m.url}" target="_blank" rel="noopener">${ui('参观官网', 'Visit website')} ↗</a>` : '';
    const id = param('id'), one = id && R.museumById[id];
    const list = one ? [one] : R.museums;
    main.innerHTML = `<div class="wrap page-title"><h1>${one ? bi(one.name) : ui('按博物馆', 'By museum')}</h1></div>
      <section class="section wrap">${list.map(m => {
        const sc = scenesOf(R, 'museum', m.id);
        return `<div class="group" id="${m.id}">${one ? '' : `<h3><a href="?id=${m.id}" style="text-decoration:none">${bi(m.name)}</a></h3>`}
          <p class="note">${visit(m)}</p>${sc.length ? cardsHTML(R, sc) : SOON()}</div>`;
      }).join('')}
      ${one ? `<p style="margin-top:28px"><a class="btn" href="${ROOT}museums/">← ${ui('所有博物馆', 'All museums')}</a></p>` : ''}</section>`;
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
    const [R, about] = await Promise.all([loadRegistry(), fetch(ROOT + 'data/about.json').then(r => r.json())]);
    ABOUT = about;
    PAGES[kind](R, main, opts);
  } catch (e) {
    main.innerHTML = `<div class="wrap page-title"><p class="soon">${ui('内容加载失败，请刷新页面。', 'Could not load. Please refresh.')}</p></div>`;
    console.error(e);
  }
  setLang(lang);   // 新加的内容也套用当前语言
}
