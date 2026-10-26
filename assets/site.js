// =====================================================================
// 走进名画 · 共用的网站功能（首页、系列页、浏览页、关于页都用它）
//   - 中文 / EN / 双语 切换，浅色 / 深色 / 跟随系统 切换（记住选择）
//   - 页眉、页脚
//   - 读取 data/scenes.json 登记表，画出场景卡片
// 场景页（3D）也会用这里的语言和配色切换。
// =====================================================================
import { LAND } from './world-land.js';   // 地图的陆地轮廓
import { hasGuide } from './guide.js';   // 关于页：有没有语音导览

// 网站根目录（不管网站放在哪个网址下面都能找到）
export const ROOT = new URL('../', import.meta.url).href;

// ---------- 双语文字 ----------
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// 英文里的画名写成 *Title*，显示成斜体（先转义，再加 <i>）
export const escItalic = s => esc(s).replace(/\*([^*]+)\*/g, '<i>$1</i>');
// { zh, en } → 两个 span；只有一种语言时就直接显示那一种
// 双语时中间加分隔符（只在双语时出现）；标题里英文会换到下一行（见 style.css 的 .sep）
export function bi(o, sep = ' · ') {
  if (o == null) return '';
  if (typeof o === 'string') return esc(o);
  if (o.zh && o.en && o.zh !== o.en) return `<span class="zh">${esc(o.zh)}</span><span class="en"><span class="zh sep">${sep}</span>${escItalic(o.en)}</span>`;
  return esc(o.zh || o.en || '');
}
// 界面上的短标签：中文/双语 显示中文，EN 显示英文
export const ui = (zh, en) => `<span class="zh">${esc(zh)}</span><span class="en-ui">${escItalic(en)}</span>`;
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
// 统计脚本写在每一页的 </body> 前面（tools/build.py）。这里记录“事件”，比如走进画里、看到结局。
// 脚本没加载成功（被拦截、网络不好）时什么也不做，网站照常运行。
export function track(path, title = path, tries = 0) {
  try {
    if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path, title, event: true });
    else if (tries < 10) setTimeout(() => track(path, title, tries + 1), 600);   // 脚本还在加载：等一会儿再试，最多等 6 秒
  } catch (e) { /* 统计失败不影响网站 */ }
}
// 带 data-track 的链接、按钮：点一下记一次事件
document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-track]'); if (el) track(el.dataset.track); });

// ---------- 登记表 ----------
// 全站作品排序：已开放的在前，即将开放的在后；同一组里按年份从早到晚（年份一样的，按登记表顺序）
const openRank = s => (s.status === 'live' ? 0 : 1);
const byOpenYear = (a, b) => openRank(a) - openRank(b) || (yearOf(a) ?? 9999) - (yearOf(b) ?? 9999);
const sortWorks = list => [...list].sort(byOpenYear);
// 画家卡片的封面：cover 里列出的场景，用第一个已开放的
// 没有已开放场景的，用 coverImage（放在 assets/artists/ 里的公有领域图片）
const artistCover = (R, a) => [].concat(a.cover || []).map(id => R.sceneById[id]).find(s => s && s.status === 'live' && s.cover)
  || (a.coverImage && { cover: a.coverImage.src, title: a.coverImage.title });
// 其他代表作：只显示核对过的（check 为 ok）
const artistWorks = (W, id) => ((W && W.artists[id]) || []).filter(x => x.check === 'ok');
const workLine = (R, x) => {
  const m = R.museumById[x.museum], url = x.url || (m && m.url);
  const where = x.museumNote ? bi(x.museumNote) : m ? bi(m.name) : '';
  return `<li>${url ? `<a href="${url}" target="_blank" rel="noopener">${bi(x.title)} ↗</a>` : bi(x.title)}<span class="meta">${[x.kind && bi(x.kind), x.year && bi(x.year), where].filter(Boolean).join(' · ')}</span></li>`;
};
let registryPromise = null;
export function loadRegistry() {
  if (!registryPromise) registryPromise = fetch(ROOT + 'data/scenes.json', { cache: 'no-cache' }).then(r => r.json()).then(prepare);
  return registryPromise;
}
function prepare(R) {
  const byId = list => Object.fromEntries(list.map(x => [x.id, x]));
  R.allScenes = R.scenes;
  R.scenes = R.scenes.filter(s => s.status !== 'planned').sort(byOpenYear);   // 计划中的作品：暂不在页面显示；全站排序见 byOpenYear
  R.cityById = byId(R.cities || []);
  R.sceneById = byId(R.scenes); R.artistById = byId(R.artists); R.museumById = byId(R.museums);
  R.collectionById = byId(R.collections); R.themeById = byId(R.themes); R.moodById = byId(R.moods || []); R.periodById = byId(R.periods); R.placeById = byId(R.places);
  R.live = R.scenes.filter(s => s.status === 'live');
  // 系列主色（登记表 collections 里的 color）：按钮和点缀用，比如梵高的黄、代尔夫特蓝
  const css = R.collections.filter(c => c.color && c.accent).map(c => `[data-series="${c.accent}"] { --accent: ${c.color.accent}; --accent-ink: ${c.color.ink || '#ffffff'}; }`).join('\n');
  if (css) { const st = document.createElement('style'); st.id = 'seriesColors'; st.textContent = css; document.head.append(st); }
  return R;
}
export const sceneUrl = s => ROOT + s.path;

// 场景卡片：已上线的可以点进去；还没做的显示“即将开放”
// opts：hideArtist / hideMuseum 不写画家 / 博物馆；title、cover 换成别的版本；workLink 在卡片下面加“官网作品页”
export function sceneCard(R, s, opts = {}) {
  const artist = !opts.hideArtist && R.artistById[s.artist], museum = !opts.hideMuseum && R.museumById[opts.museum || s.museum];
  // 画家页：年份 · 收藏地；博物馆页：年份 · 画家；其他页面：画家 · 年份，下一行收藏地
  const short = opts.hideArtist || opts.hideMuseum;
  const meta = (short ? [bi(opts.year || s.year), artist && bi(artist.name), museum && bi(museum.name)]
    : [artist && bi(artist.name), bi(opts.year || s.year)]).concat(loanLabel(s)).filter(Boolean).join(' · ');
  const live = s.status === 'live', title = opts.title || s.title, cover = opts.cover || s.cover;
  const pic = live && cover
    ? `<img src="${ROOT + cover}" ${altAttr(title)} loading="lazy" />`
    : `<span class="soon">${ui('即将开放', 'Coming soon')}</span>`;
  const nameHTML = opts.bothTitle && title.zh && title.en && title.zh !== title.en ? `<span lang="zh-CN">${esc(title.zh)}</span> · <span lang="en">${esc(title.en)}</span>` : bi(title);
  const inner = `<div class="pic">${pic}</div><div class="name${opts.bothTitle ? ' both' : ''}">${nameHTML}</div>
    <div class="meta">${meta}</div>${museum && !short ? `<div class="meta">${bi(museum.name)}</div>` : ''}`;
  const card = live ? `<a class="card" href="${sceneUrl(s)}">${inner}</a>` : `<div class="card is-soon">${inner}</div>`;
  const url = opts.workLink && (opts.artworkUrl ?? s.artworkUrl);
  const below = (url ? `<a class="work-link" href="${url}" target="_blank" rel="noopener">${ui('官网作品页', 'Museum page')} ↗</a>` : '')
    + (opts.credit ? `<small class="img-credit">${bi(opts.credit, ' / ')}</small>` : '');
  return below ? `<div class="card-wrap">${card}${below}</div>` : card;
}
// items：场景，或 { s: 场景, opts: {...} }
export const cardsHTML = (R, list, opts = {}) => list.length ? `<div class="cards">${list.map(x => x.s ? sceneCard(R, x.s, { ...opts, ...x.opts }) : sceneCard(R, x, opts)).join('')}</div>` : `<p class="soon">${ui('即将开放', 'Coming soon')}</p>`;
// 展厅号：数字写成“43号展厅 / Room 43”，也可以直接写 { zh, en }
const roomLabel = r => r == null || r === '' ? null : typeof r === 'object' ? r : { zh: `${r}号展厅`, en: `Room ${r}` };
const loanLabel = s => s.loan ? ui('借展', 'On loan') : '';
// 一行一幅（画家页、博物馆页）：小图 · 作品名（中 · EN） · 年份 · 收藏地（画家页）或画家（博物馆页）
export function sceneRow(R, s, opts = {}) {
  const artist = !opts.hideArtist && R.artistById[s.artist], museum = !opts.hideMuseum && R.museumById[opts.museum || s.museum];
  const live = s.status === 'live', t = opts.title || s.title, cover = opts.cover || s.cover, y = opts.year || s.year;
  const name = t.zh && t.en && t.zh !== t.en ? `<span lang="zh-CN">${esc(t.zh)}</span> · <span lang="en">${esc(t.en)}</span>` : esc(t.zh || t.en);
  const year = esc(textOf(y, lang === 'en' ? 'en' : 'zh'));
  const room = opts.showRoom && roomLabel(opts.room ?? s.room);
  const D = s.displayAt && R.museumById[s.displayAt.museum];
  const away = D && (opts.museum || s.museum) !== s.displayAt.museum ? bi({ zh: `目前借展于${D.name.zh}`, en: `Currently at ${D.name.en}` }) : D ? bi({ zh: `借自${R.museumById[s.museum].name.zh}`, en: `Lent by ${R.museumById[s.museum].name.en}` }) : '';
  const meta = [year, artist && bi(artist.name), museum && bi(museum.name), room && bi(room), loanLabel(s), away].filter(Boolean).join(' · ');
  const pic = `<span class="row-pic">${live && cover ? `<img src="${ROOT + cover}" ${altAttr(t)} loading="lazy" />` : ''}</span>`;
  const text = `<span class="row-text"><span class="row-title">${name}</span><span class="row-meta">${meta}</span></span>`;
  const url = opts.workLink && (opts.artworkUrl ?? s.artworkUrl);
  const side = (live ? '' : `<span class="row-soon">${ui('即将开放', 'Coming soon')}</span>`)
    + (url ? `<a class="work-link" href="${url}" target="_blank" rel="noopener">${ui('官网作品页', 'Museum page')} ↗</a>` : '');
  return `<div class="row${live ? '' : ' is-soon'}">${live ? `<a class="row-main" href="${sceneUrl(s)}">${pic}${text}</a>` : `<span class="row-main">${pic}${text}</span>`}
    ${side ? `<span class="row-side">${side}</span>` : ''}${opts.credit ? `<small class="img-credit row-credit">${bi(opts.credit, ' / ')}</small>` : ''}</div>`;
}
// 场景里的“隐藏按钮”：暂时收起所有按钮，方便录屏、截图。右下角留一个很淡的“显示按钮”，键盘 H 也可以切换
export function cleanToggle(tools) {
  const hide = document.createElement('button');
  hide.className = 'btn'; hide.id = 'cleanBtn'; hide.innerHTML = '⤢ ' + ui('隐藏按钮', 'Hide controls');
  const show = document.createElement('button');
  show.className = 'btn'; show.id = 'uncleanBtn'; show.innerHTML = ui('显示按钮', 'Show controls');
  tools.append(hide); document.body.append(show);
  const set = on => document.body.classList.toggle('clean', on);
  hide.onclick = () => set(true); show.onclick = () => set(false);
  addEventListener('keydown', e => { if ((e.key === 'h' || e.key === 'H') && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) set(!document.body.classList.contains('clean')); });
}
// 开场原画页的“一分钟看一幅画”：其他按钮都藏起来，安静地显示原画 60 秒，有倒计时，随时可以跳过
export const oneMinuteHTML = () => `<button id="oneMin" class="btn">${ui('一分钟看一幅画', 'One minute of looking')}</button>`;
export function oneMinute(btn, seconds = 60) {
  const bar = document.createElement('div');
  bar.id = 'lookBar'; bar.className = 'panel hidden';
  bar.innerHTML = `<span id="lookTime"></span><button class="btn" id="lookSkip">${ui('跳过', 'Skip')}</button>`;
  document.body.append(bar);
  let timer = null, left = 0;
  const show = () => { bar.querySelector('#lookTime').textContent = `0:${String(left).padStart(2, '0')}`.replace('0:60', '1:00'); };
  const stop = () => { clearInterval(timer); timer = null; document.body.classList.remove('looking'); bar.classList.add('hidden'); };
  btn.onclick = () => {
    left = seconds; show(); document.body.classList.add('looking'); bar.classList.remove('hidden');
    timer = setInterval(() => { left--; show(); if (left <= 0) stop(); }, 1000);
  };
  bar.querySelector('#lookSkip').onclick = stop;
  addEventListener('keydown', e => { if (e.key === 'Escape' && timer) stop(); });
}
// 场景最后一屏“去现场看真迹”：收藏在伦敦这几家美术馆且在展的 → 伦敦参观路线页（那一节）；其他 → 博物馆作品页（没有作品页时用博物馆官网）
export const LONDON_MUSEUMS = ['national-gallery', 'courtauld'];   // 和 data/london.json 的 sections 一致
// 两个网址是不是同一页（忽略 http/https、www、结尾的 /）：用来去掉重复的博物馆链接
const normUrl = u => String(u || '').toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '');
export const sameUrl = (u, ...others) => others.some(o => o && normUrl(o) === normUrl(u));
export function seeInPersonHTML(R, meta) {
  if (!R || !meta) return '';
  const items = [meta].concat(meta.alsoAt || []);   // 这幅画，加上收藏在别处的其他版本
  const D = meta.displayAt && R.museumById[meta.displayAt.museum];   // 借展到别的博物馆：先显示现在能看到它的地方
  const now = D && D.url ? `<a class="btn primary" data-track="see-real-${meta.id}" href="${D.url}" target="_blank" rel="noopener">${ui('现在在', 'Now at')} ${bi(D.name, ' · ')}${meta.displayAt.note ? ' · ' + bi(meta.displayAt.note) : ''} ↗</a>` : '';
  return now + items.map(x => {
    const m = R.museumById[x.museum];
    if (!m) return '';
    const year = items.length > 1 && x.year ? ' · ' + bi(x.year) : '';
    if (LONDON_MUSEUMS.includes(x.museum) && x.onDisplay === true) {
      const room = roomLabel(x.room);
      const page = x.artworkUrl ? `<a class="btn" href="${x.artworkUrl}" target="_blank" rel="noopener">${ui('博物馆作品页', 'Museum page')} ↗</a>` : '';   // 伦敦在展的：参观路线 + 博物馆作品页
      return `<a class="btn primary" data-track="see-real-${meta.id}" href="${ROOT}london/#${x.museum}">${bi(m.name, ' · ')}${room ? ' · ' + bi(room) : ''} → ${ui('参观路线', 'Route by room')}</a>` + page;
    }
    const url = x.artworkUrl || m.url;
    return url ? `<a class="btn" data-track="see-real-${meta.id}" href="${url}" target="_blank" rel="noopener">${bi(m.name, ' · ')}${year} ↗</a>` : '';
  }).join('');
}
export const rowsHTML = (R, list, opts = {}) => list.length ? `<div class="rows">${list.map(x => x.s ? sceneRow(R, x.s, { ...opts, ...x.opts }) : sceneRow(R, x, opts)).join('')}</div>` : '';
// 即将开放的作品最多显示几个（画家页、博物馆页）
export const SOON_MAX = 3;
const capSoon = list => { let n = 0; return list.filter(x => ((x.s || x).status === 'live') || n++ < SOON_MAX); };

// ---------- 页眉、页脚 ----------
const NAV = [
  ['', '首页', 'Home'],
  ['artists/', '画家', 'Artists'], ['themes/', '主题', 'Themes'], ['moods/', '心情', 'Moods'], ['periods/', '时期', 'Periods'],
  ['map/', '地图', 'Map'], ['museums/', '博物馆', 'Museums'], ['timeline/', '时间线', 'Timeline'], ['about/', '关于', 'About']
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

// ---------- 世界地图（向日葵在哪里、几个版本页） ----------
// 世界地图上的一个点：经纬度 → 地图上的位置（和 world-land.js 用同一种投影）
const worldXY = (lat, lon) => [(lon + 180) / 360 * LAND.w, (LAND.north - lat) / 360 * LAND.w];
// 世界地图（只显示 box 这一片：{w, e, s, n} 经纬度）。places 里没有坐标的（比如私人收藏）不标点。
// kind：here = 本场景这一幅（大一点的实心点）；gone = 已毁（灰色空心点）；其他 = 普通实心点
export function worldMap(X) {
  const b = X.box || { w: -180, e: 180, s: -58, n: 84 };
  const [x0, y0] = worldXY(b.n, b.w), [x1, y1] = worldXY(b.s, b.e), k = (x1 - x0) / 700;   // 圆点和字按显示大小换算
  const dots = (X.places || []).map((p, i) => {
    if (p.lat == null) return '';
    const [x, y] = worldXY(p.lat, p.lon), r = (p.kind === 'here' ? 6 : 4.5) * k, f = 12 * k;
    const [tx, ty, anchor] = { l: [x - r - 3 * k, y + f / 3, 'end'], t: [x, y - r - 3 * k, 'middle'], b: [x, y + r + f, 'middle'] }[p.label] || [x + r + 3 * k, y + f / 3, 'start'];
    return `<circle class="dot ${p.kind || ''}" cx="${x}" cy="${y}" r="${r}" stroke-width="${1.6 * k}"/><text x="${tx}" y="${ty}" text-anchor="${anchor}" style="font-size:${f}px">${i + 1}</text>`;
  }).join('');
  return `<svg class="world" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" role="img" aria-label="Map"><path class="land" d="${LAND.d}"/>${dots}</svg>`;
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
  // 现在在哪里：每家有作品显示的博物馆一个点，编号和地图下面的列表一样
  return nowMuseums(R).map((m, i) => {
    const list = museumItems(R, m.id);
    return { id: m.id, num: i + 1, name: m.name, lat: m.lat, lon: m.lon, live: list.some(x => x.s.status === 'live') };
  });
}
const nowMuseums = R => R.museums.filter(m => m.lat != null && museumItems(R, m.id).length);
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
    const placed = [];
    for (const d of dots) {
      if (d.lon < b.w || d.lon > b.e || d.lat < b.s || d.lat > b.n) continue;
      let cx = x0 + (d.lon - b.w) * px, cy = (b.n - d.lat) * py;
      while (placed.some(([x, y]) => Math.hypot(x - cx, y - cy) < 13)) cx += 14;   // 同一座城市的几家博物馆：并排放，不重叠
      placed.push([cx, cy]);
      const [tx, ty, anchor] = d.num ? [cx, cy + 4, 'middle'] : ({ l: [cx - 10, cy + 4, 'end'], t: [cx, cy - 11, 'middle'], b: [cx, cy + 19, 'middle'] }[d.label] || [cx + 10, cy + 4, 'start']);
      body += `<a href="${ROOT}map/?layer=${layer}#${d.id}"><title>${esc(textOf(d.name, lang))}</title><circle class="${d.live ? 'dot' : 'dot-soon'}${d.num ? ' num' : ''}" cx="${cx}" cy="${cy}" r="${d.num ? 8 : small ? 5 : 6}"/>
        <text class="${d.num ? 'num' : ''}" x="${tx}" y="${ty}" text-anchor="${anchor}">${d.num || esc(textOf(d.name, lang))}</text></a>`;
    }
    x0 += w + GAP;
  }
  const note = layer === 'painted' ? ui('示意图：按经纬度标出画作诞生的城市。', 'Schematic map: places where the paintings were made, plotted by latitude and longitude.')
    : ui('示意图：标出收藏这些画的博物馆，编号和下面的列表一样。', 'Schematic map: the museums that hold the paintings, numbered as in the list below.');
  return `<svg class="map" viewBox="0 0 ${x0 - GAP} ${H}" role="img" aria-label="Map">${body}</svg>
    <div class="map-note">${note} ${ui('陆地轮廓：Natural Earth（公有领域）。', 'Coastlines: Natural Earth (public domain).')}</div>`;
}

// =====================================================================
// 各个页面的内容（首页、系列页、五种浏览页、关于）
// 页面文件只写一行：renderPage('home') 之类，内容都从登记表里来。
// =====================================================================
const SOON = () => `<span class="soon">${ui('即将开放', 'Coming soon')}</span>`;
const LATER = () => `<p class="later-one">${ui('即将推出', 'Coming soon')}</p>`;   // 还没有作品可以显示
// 系列的状态：有作品时“现在开放：… · 下一站：…”，还没有作品时“即将开放”（不显示数字）
const openLine = (list) => {
  const live = list.filter(s => s.status === 'live'), next = list.find(s => s.status !== 'live');
  if (!live.length) return ui('即将开放', 'Coming soon');
  const part = (lang, open, nextWord, join) => `${open}${live.map(s => textOf(s.title, lang)).join(join)}` + (next ? ` · ${nextWord}${textOf(next.title, lang)}` : '');
  return bi({ zh: part('zh', '现在开放：', '下一站：', '、'), en: part('en', 'Now open: ', 'Next: ', ', ') }, ' / ');
};
const scenesOf = (R, key, id) => R.scenes.filter(s => (Array.isArray(s[key]) ? s[key].includes(id) : s[key] === id)
  && !(key === 'themes' && id === 'london' && s.onDisplay === false));   // “在伦敦看真迹”只放正在展出的作品
// 一家博物馆页面上的作品：收藏在这里的场景 + 收藏在这里的其他版本（比如芝加哥的1889年版卧室，链接到卧室场景）
function museumItems(R, id) {
  const own = scenesOf(R, 'museum', id).map(s => ({ s, opts: {} }));
  const lent = R.scenes.filter(s => s.displayAt && s.displayAt.museum === id).map(s => ({ s, opts: { museum: id, room: '' } }));   // 借展到这里的作品
  const also = R.scenes.flatMap(s => (s.alsoAt || []).filter(v => v.museum === id)
    .map(v => ({ s, opts: { title: v.title, year: v.year, cover: v.cover, artworkUrl: v.artworkUrl, credit: v.credit, museum: v.museum, room: v.room || '' } })));
  return [...own, ...lent, ...also].sort((a, b) => byOpenYear({ ...a.s, year: a.opts.year || a.s.year }, { ...b.s, year: b.opts.year || b.s.year }));
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

// 首页“从这里开始”的三张大卡片（封面用场景的原画）
const START_HERE = [
  { href: 'artists/?id=van-gogh', scene: 'sunflowers', name: { zh: '梵高', en: 'Van Gogh' } },
  { href: 'artists/?id=vermeer', scene: 'pearl-earring', name: { zh: '维米尔', en: 'Vermeer' } },
  { href: 'london/', scene: 'arnolfini', name: { zh: '在伦敦看真迹', en: 'See them in London' } }
];
// 首页底部一行小图标链接
const HOME_LINKS = [
  { path: 'themes/', name: { zh: '主题', en: 'Themes' } },
  { path: 'moods/', name: { zh: '心情', en: 'Moods' } },
  { path: 'periods/', name: { zh: '时期', en: 'Periods' } },
  { path: 'map/', name: { zh: '地图', en: 'Map' } },
  { path: 'museums/', name: { zh: '博物馆', en: 'Museums' } },
  { path: 'timeline/', name: { zh: '时间线', en: 'Timeline' } }
];

// 首页底部图标（线条图，颜色跟着文字走）
const svg = d => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const HOME_ICONS = {
  'themes/': svg('<rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><rect x="13.5" y="13.5" width="7" height="7" rx="1"/>'),
  'moods/': svg('<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>'),
  'periods/': svg('<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9"/>'),
  'map/': svg('<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
  'museums/': svg('<path d="M3 9.5 12 4l9 5.5M4.5 20h15M6 10.5V18M10 10.5V18M14 10.5V18M18 10.5V18"/>'),
  'timeline/': svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>')
};

// 关于页的文字在 data/about.json（Tia 提供，原文照录）
let ABOUT = null, LONDON = null;   // 伦敦参观路线的文字在 data/london.json
const para = (p, cls = '') => `<p class="zh ${cls}">${p.label ? `<strong>${esc(p.label.zh)}</strong>` : ''}${esc(p.zh)}</p>
  <p class="en ${cls}">${p.label ? `<strong>${esc(p.label.en)}</strong>` : ''}${esc(p.en)}</p>`;

const HERO = { scene: 'bedroom' };   // 首页首屏铺满的那幅画（用场景的原画）；assets/hero/ 里的卧室短片暂时不用
const getJSON = f => fetch(ROOT + 'data/' + f, { cache: 'no-cache' }).then(r => r.json());
// 横向时间轴（手机上竖向）：items 是 { date, text, pics }（都是做好的 HTML）
const trackHTML = items => `<div class="tl-wrap">
  <button class="tl-nav prev" aria-label="Earlier">←</button><button class="tl-nav next" aria-label="Later">→</button>
  <ol class="vg-tl">${items.map(x => `<li class="tl-item${x.pics ? ' has-pic' : ''}"><div class="tl-date">${x.date}</div>${x.text ? `<div class="tl-text">${x.text}</div>` : ''}${x.pics ? `<div class="tl-pics">${x.pics}</div>` : ''}</li>`).join('')}</ol></div>`;
function wireTracks(root) {   // 电脑上：左右箭头翻页，到头了箭头变淡
  root.querySelectorAll('.tl-wrap').forEach(w => {
    const ol = w.querySelector('.vg-tl'), prev = w.querySelector('.tl-nav.prev'), next = w.querySelector('.tl-nav.next');
    const ends = () => { prev.disabled = ol.scrollLeft < 4; next.disabled = ol.scrollLeft + ol.clientWidth > ol.scrollWidth - 4; };
    prev.onclick = () => ol.scrollBy({ left: -ol.clientWidth * 0.8, behavior: 'smooth' });
    next.onclick = () => ol.scrollBy({ left: ol.clientWidth * 0.8, behavior: 'smooth' });
    ol.addEventListener('scroll', ends, { passive: true }); addEventListener('resize', ends); ends();
  });
}
// 画家页的“生平”：data/life/<画家 id>.json（没有这个文件就不显示）
const lifeHTML = (R, L) => trackHTML(L.entries.map(x => ({ date: bi(x.date), text: italics(bi(x.text)), pics: (x.scenes || []).map(id => tlPic(R, id)).join('') })));
const yearOf = s => { const m = String(textOf(s.year, 'en')).match(/\d{4}/); return m ? +m[0] : null; };
const italics = h => h.replace(/\*([^*]+)\*/g, '<i>$1</i>');   // 英文里 *画名* 显示成斜体
const linkBtn = (path, zh, en) => `<a class="btn" href="${ROOT + path}">${ui(zh, en)} →</a>`;
// 时间线上的一幅画：场景 id，或 { id, version: 博物馆 id }（用 alsoAt 里那个版本的图和名字）
function tlPic(R, x) {
  const s = R.sceneById[typeof x === 'string' ? x : x.id];
  if (!s || s.status !== 'live') return '';
  const v = typeof x === 'object' && x.version && (s.alsoAt || []).find(a => a.museum === x.version);
  const title = (v && v.title) || s.title, cover = (v && v.cover) || s.cover;
  return `<a class="tl-pic" href="${sceneUrl(s)}"><img src="${ROOT + cover}" ${altAttr(title)} loading="lazy" /><span>${bi(title)}</span></a>`;
}
// 伦敦参观路线：一行一幅
function londonRow(R, s) {
  const a = R.artistById[s.artist], live = s.status === 'live', t = s.title;
  const name = t.zh && t.en && t.zh !== t.en ? `<span lang="zh-CN">${esc(t.zh)}</span> · <span lang="en">${esc(t.en)}</span>` : esc(t.zh || t.en);
  const meta = [a && bi(a.name), loanLabel(s)].filter(Boolean).join(' · ');   // 展厅号已经写在分组标题上
  const side = (live ? `<a class="btn primary" href="${sceneUrl(s)}">${ui('先走进去看看', 'Step inside first')}</a>` : '')
    + (s.artworkUrl ? `<a class="work-link" href="${s.artworkUrl}" target="_blank" rel="noopener">${ui('官网作品页', 'Museum page')} ↗</a>` : '');
  const note = s.londonNote ? `<span class="row-meta london-note">${bi(s.londonNote, ' / ')}</span>` : '';   // 路线页上的一句提示（比如“想看莫奈的车站，不用去巴黎”）
  return `<div class="row"><span class="row-main"><span class="row-pic">${live && s.cover ? `<img src="${ROOT + s.cover}" ${altAttr(t)} loading="lazy" />` : ''}</span>
    <span class="row-text"><span class="row-title">${name}</span><span class="row-meta">${meta}</span>${note}</span></span>${side ? `<span class="row-side">${side}</span>` : ''}</div>`;
}

// “找不同”对比滑块（和场景最后一屏的一样）：两个下拉选版本，左右拖动
function compareSlider(root, CV, base) {
  const $ = id => root.querySelector('#' + id), cmp = $('cmp'), A = $('cmpA'), B = $('cmpB');
  CV.forEach((v, i) => { A.add(new Option('', i)); B.add(new Option('', i)); });
  A.value = 0; B.value = Math.min(1, CV.length - 1);
  const names = () => {
    $('cmpImgA').src = base + CV[A.value].image; $('cmpTagA').textContent = textOf(CV[A.value].short, lang);
    $('cmpImgB').src = base + CV[B.value].image; $('cmpTagB').textContent = textOf(CV[B.value].short, lang);
    root.querySelectorAll('#cmpA option, #cmpB option').forEach(o => o.textContent = textOf(CV[o.value].short, lang));
  };
  const at = pct => { pct = Math.max(0, Math.min(100, pct)); $('cmpImgB').style.clipPath = `inset(0 0 0 ${pct}%)`; $('cmpLine').style.left = pct + '%'; };
  A.onchange = B.onchange = names;
  let drag = false;
  const move = e => { const r = cmp.getBoundingClientRect(); at((e.clientX - r.left) / r.width * 100); };
  cmp.addEventListener('pointerdown', e => { drag = true; cmp.setPointerCapture(e.pointerId); move(e); });
  cmp.addEventListener('pointermove', e => { if (drag) move(e); });
  cmp.addEventListener('pointerup', () => { drag = false; });
  cmp.addEventListener('pointercancel', () => { drag = false; });
  names(); at(50); onLang(names);
}

const PAGES = {
  // ---------- 首页 ----------
  home(R, main) {
    // 首页只有五块，以图片为主：首屏 · 本周新作 · 从这里开始 · 系列 · 底部图标链接
    // 首屏：一幅画（卧室的原画）铺满一屏
    const pick = R.sceneById[HERO.scene] && R.sceneById[HERO.scene].status === 'live' ? R.sceneById[HERO.scene] : R.live[0];
    const heroMedia = `<img src="${ROOT + pick.cover}" ${altAttr(pick.title)} />`;
    // 本周新作：最近上线的（同一天上线的，登记表里排在后面的算更新）
    const newest = R.live.map(s => [s, R.allScenes.indexOf(s)]).sort((a, b) => (b[0].added || '').localeCompare(a[0].added || '') || b[1] - a[1])[0][0];
    const cover = id => R.sceneById[id] && R.sceneById[id].status === 'live' ? R.sceneById[id] : null;
    const start = START_HERE.map(x => ({ ...x, s: cover(x.scene) })).filter(x => x.s);
    const firstSentence = o => ({ zh: o.zh.split('。')[0] + '。', en: o.en.split('. ')[0].replace(/\.?$/, '.') });
    main.innerHTML = `
      <section class="hero hero-full">
        ${heroMedia}
        <div class="hero-over">
          <div class="t-en en">Step inside the world's great paintings.</div>
          <div class="t-zh zh">走进世界名画的内部。</div>
          <div class="hero-btns"><a class="btn primary" href="${sceneUrl(pick)}">${ui('走进画里', 'Step into the painting')}</a>
            <button class="btn" id="surprise" data-track="surprise-me">🎲 ${ui('今天看哪幅', 'Surprise me')}</button></div>
          <div class="label">${labelOf(R, pick)}${pick.imageSource ? '<br>' + imageSourceHTML(pick.imageSource) : ''}</div>
        </div>
      </section>

      <section class="section wrap" id="new">
        <h2>${ui('本周新作', 'New this week')}</h2>
        <a class="feature" href="${sceneUrl(newest)}">
          <span class="artist-cover feature-pic"><img src="${ROOT + newest.cover}" ${altAttr(newest.title)} /></span>
          <span class="feature-text">
            <span class="feature-name">${bi(newest.title)}</span>
            <span class="feature-intro" id="newIntro">${newest.tagline ? bi(newest.tagline, ' / ') : ''}</span>
            <span class="btn primary">${ui('走进画里', 'Step into the painting')} →</span>
          </span>
        </a>
      </section>

      <section class="section wrap" id="start">
        <h2>${ui('从这里开始', 'Start here')}</h2>
        <div class="start-cards">${start.map(x => `<a class="start-card" href="${ROOT + x.href}">
          <span class="artist-cover"><img src="${ROOT + x.s.cover}" ${altAttr(x.s.title)} loading="lazy" /></span>
          <span class="start-name">${bi(x.name)}</span></a>`).join('')}</div>
      </section>

      <section class="section wrap" id="collections">
        <h2>${ui('系列', 'Collections')}</h2>
        ${R.collections.map(c => {
          const live = sortWorks(c.order.map(x => R.sceneById[x]).filter(s => s && s.status === 'live' && s.cover));
          return live.length ? `<div class="col-row" data-series="${c.accent || ''}">
            <h3><a href="${ROOT}collections/${c.id}/">${bi(c.name)}</a></h3>
            <div class="tl-wrap"><button class="tl-nav prev" aria-label="Back">←</button><button class="tl-nav next" aria-label="More">→</button>
              <ol class="vg-tl home-strip">${live.map(s => `<li>${tlPic(R, s.id)}</li>`).join('')}</ol></div></div>` : ''; }).join('')}
      </section>

      <section class="section wrap home-bottom" id="more">
        <nav class="icon-links">${HOME_LINKS.map(w => `<a href="${ROOT + w.path}"><span class="way-ico" aria-hidden="true">${HOME_ICONS[w.path]}</span><span>${ui(w.name.zh, w.name.en)}</span></a>`).join('')}</nav>
        <p class="home-intro">${bi(firstSentence(ABOUT.home), ' ')} <a href="${ROOT}about/">${ui('关于', 'About')} →</a></p>
      </section>`;
    document.getElementById('surprise').onclick = () => { location.href = sceneUrl(R.live[Math.floor(Math.random() * R.live.length)]); };
    // 本周新作的一句话：登记表里有 tagline 就用它，没有就用场景故事的最后一句（ending.final）
    if (!newest.tagline) fetch(sceneUrl(newest) + 'scene.json').then(r => r.json()).then(d => {
      const el = document.getElementById('newIntro'); if (el && d.ending && d.ending.final) el.innerHTML = bi(d.ending.final, ' / ');
    }).catch(() => {});
    wireTracks(main);
  },

  // ---------- 系列页 ----------
  collection(R, main, { id }) {
    const c = R.collectionById[id];
    document.body.dataset.series = c.accent || '';
    const list = sortWorks(c.order.map(x => R.sceneById[x]).filter(Boolean));
    main.innerHTML = `
      <div class="wrap page-title"><h1>${bi(c.name)}<small class="sub">${bi(c.desc)}</small></h1>
        <p class="soon" style="margin-top:12px">${openLine(list)}</p></div>
      <section class="section wrap">${cardsHTML(R, list)}</section>`;
  },

  // ---------- 按画家（?id= 打开某一位画家的页面） ----------
  async artists(R, main) {
    const W = await getJSON('works.json').catch(() => null);   // 其他代表作（data/works.json）
    const coverHTML = (a, tag) => (c => c ? `<${tag} class="artist-cover"${tag === 'a' ? ` href="?id=${a.id}"` : ''}><img src="${ROOT + c.cover}" ${altAttr(c.title)} loading="lazy" onerror="this.parentNode.remove()" /></${tag}>` : '')(artistCover(R, a));
    // 一位画家的作品：可以走进去的画（已上线 + 最多3个即将开放）；其他代表作（只显示作品名、年份、收藏地，链接到博物馆官网）
    const worksOf = a => {
      const sc = scenesOf(R, 'artist', a.id), more = artistWorks(W, a.id);
      if (!sc.length && !more.length) return LATER();
      return (sc.length ? `<h4 class="works-title">${ui('可以走进去的画', 'Paintings you can step into')}</h4>${cardsHTML(R, capSoon(sc), { hideArtist: true, bothTitle: true })}` : '')
        + (more.length ? `<h4 class="works-title">${bi(W.title, ' / ')}</h4><p class="note">${bi(W.note, ' / ')}</p>
          <ul class="more-works">${more.map(x => workLine(R, x)).join('')}</ul>` : '');
    };
    const id = param('id'), a = id && R.artistById[id];
    if (a) {
      const life = await getJSON(`life/${a.id}.json`).catch(() => null);
      main.innerHTML = `<div class="wrap page-title artist-head">${coverHTML(a, 'span')}<h1>${bi(a.name)}${a.dates ? `<small class="sub">${bi(a.dates)}</small>` : ''}</h1></div>
        <section class="section wrap">
          ${a.bio ? `<p class="lead">${bi(a.bio)}</p>` : ''}
          ${worksOf(a)}</section>
        ${life && life.entries ? `<section class="section wrap life" id="life"><h2>${ui('生平', 'Life')}</h2>${lifeHTML(R, life)}</section>` : ''}
        <section class="wrap"><p style="margin:28px 0"><a class="btn" href="${ROOT}artists/">← ${ui('所有画家', 'All artists')}</a></p></section>`;
      wireTracks(main);
      return;
    }
    main.innerHTML = `<div class="wrap page-title"><h1>${ui('按画家', 'By artist')}</h1></div>
      <section class="section wrap">${R.artists.filter(a => a.status !== 'planned').map(a => `
        <div class="group" id="${a.id}"><div class="artist-head">${coverHTML(a, 'a')}
          <h3><a href="?id=${a.id}" style="text-decoration:none">${artistName(a)}</a></h3></div>
        ${worksOf(a)}</div>`).join('')}</section>`;
  },

  // ---------- 按主题 ----------
  themes(R, main) {
    const hasLive = t => scenesOf(R, 'themes', t.id).some(s => s.status === 'live');
    const id = param('id'), one = id && R.themeById[id];
    if (one) {   // 某一个主题：已开放的全部 + 即将开放最多3个
      main.innerHTML = `<div class="wrap page-title"><h1>${bi(one.name)}</h1>
        ${one.id === 'london' ? `<p style="margin-top:14px">${linkBtn('london/', '按展厅的参观路线', 'Route by room')}</p>` : ''}</div>
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

  // ---------- 按心情（规则和主题页一样：只显示有已开放作品的心情） ----------
  moods(R, main) {
    const hasLive = t => scenesOf(R, 'moods', t.id).some(s => s.status === 'live');
    const id = param('id'), one = id && R.moodById[id];
    if (one) {   // 某一个主题：已开放的全部 + 即将开放最多3个
      main.innerHTML = `<div class="wrap page-title"><h1>${bi(one.name)}</h1>
</div>
        <section class="section wrap">${cardsHTML(R, capSoon(scenesOf(R, 'moods', one.id)))}
          <p style="margin-top:28px"><a class="btn" href="${ROOT}moods/">← ${ui('所有心情', 'All moods')}</a></p></section>`;
      return;
    }
    // 有已开放作品的主题：可以点进去的卡片（封面用第一幅已开放的画）；其余放在底部一行小字
    main.innerHTML = `<div class="wrap page-title"><h1>${ui('按心情', 'By mood')}</h1></div>
      <section class="section wrap"><div class="cards">${(used => R.moods.filter(hasLive).map(t => {
        const list = scenesOf(R, 'moods', t.id), live = list.filter(s => s.status === 'live');
        const cover = live.find(s => s.cover && !used.has(s.id)) || live.find(s => s.cover);   // 尽量每个主题用不同的封面
        if (cover) used.add(cover.id);
        const soonN = Math.min(list.length - live.length, SOON_MAX);
        return `<a class="card" href="?id=${t.id}"><div class="pic">${cover ? `<img src="${ROOT + cover.cover}" ${altAttr(cover.title)} loading="lazy" />` : ''}</div>
          <div class="name">${bi(t.name)}</div><div class="meta">${ui(`${live.length} 幅已开放`, `${live.length} open`)}${soonN ? ' · ' + ui(`${soonN} 幅即将开放`, `${soonN} coming soon`) : ''}</div></a>`;
      }).join(''))(new Set())}</div>
        ${laterLine(R.moods.filter(t => !hasLive(t)).map(t => bi(t.name)))}</section>`;
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
        : nowMuseums(R).map((m, i) => `<div class="group" id="${m.id}"><h3><span class="map-num">${i + 1}</span> <a href="${ROOT}museums/?id=${m.id}" style="text-decoration:none">${bi(m.name)}</a></h3>
            ${rowsHTML(R, capSoon(museumItems(R, m.id)), { hideMuseum: true })}</div>`).join('');
      main.innerHTML = `<div class="wrap page-title"><h1>${ui('地图', 'Map')}</h1>
        <div class="seg map-layers" role="group" aria-label="Map layer">${LAYERS.map(([k, zh, en]) => `<button data-layer="${k}" class="${k === layer ? 'on' : ''}">${ui(zh, en)}</button>`).join('')}</div>
        <p class="lead">${layer === 'painted' ? ui('画作诞生的城市。实心圆点：已开放；空心圆点：即将开放。', 'Cities where the paintings were made. Filled dot: open; outline: coming soon.')
          : ui('这些画现在收藏在哪些博物馆。实心圆点：有已开放的作品；空心圆点：即将开放。', 'The museums where the paintings are now. Filled dot: has an open painting; outline: coming soon.')}</p></div>
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
    const list = one ? [one] : R.museums.filter(m => museumItems(R, m.id).length);   // 没有任何作品（已开放或即将开放）的博物馆先不显示
    main.innerHTML = `<div class="wrap page-title"><h1>${one ? bi(one.name) : ui('按博物馆', 'By museum')}</h1></div>
      <section class="section wrap">${list.map(m => {
        const sc = museumItems(R, m.id);
        return `<div class="group" id="${m.id}">${one ? '' : `<h3><a href="?id=${m.id}" style="text-decoration:none">${bi(m.name)}</a></h3>`}
          <p class="note">${visit(m)}</p>${rowsHTML(R, capSoon(sc), { hideMuseum: true, workLink: true, showRoom: true }) || LATER()}</div>`;
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
        <div id="audioCredit"></div>
        ${ABOUT.analytics ? `<div class="about-note">${para(ABOUT.analytics)}</div>` : ''}
      </section>`;
    // “语音导览由 Tia 录制”：有已上线的场景放了录音之后才显示
    if (ABOUT.audioCredit) Promise.all(R.live.map(s => hasGuide(sceneUrl(s)))).then(r => {
      if (r.some(Boolean)) { document.getElementById('audioCredit').innerHTML = para(ABOUT.audioCredit); setLang(lang); }
    });
  },

  // ---------- 时间线：所有已开放和即将开放的作品，按年份排；顶部按画家筛选 ----------
  timeline(R, main) {
    let who = param('artist') || '';
    const works = R.scenes.filter(s => yearOf(s)).sort((x, y) => yearOf(x) - yearOf(y));
    const artists = R.artists.filter(a => works.some(s => s.artist === a.id));
    const draw = () => {
      const list = works.filter(s => !who || s.artist === who), years = [...new Set(list.map(yearOf))];
      const item = s => s.status === 'live' ? tlPic(R, s.id)
        : `<span class="tl-soon">${bi(s.title)}<small>${ui('即将开放', 'Coming soon')}</small></span>`;
      const meta = s => [!who && R.artistById[s.artist] && ui(R.artistById[s.artist].name.zh, R.artistById[s.artist].name.en), String(textOf(s.year, 'en')) !== String(yearOf(s)) && (typeof s.year === 'object' ? ui(s.year.zh, s.year.en) : esc(s.year))].filter(Boolean).join(' · ');
      main.innerHTML = `<div class="wrap page-title"><h1>${ui('时间线', 'Timeline')}</h1>
          <div class="seg tl-filter" role="group" aria-label="Artist">
            <button data-who="" class="${who ? '' : 'on'}">${ui('全部', 'All')}</button>${artists.map(a => `<button data-who="${a.id}" class="${who === a.id ? 'on' : ''}">${ui(a.name.zh, a.name.en)}</button>`).join('')}</div></div>
        <section class="section wrap">${years.length ? trackHTML(years.map(y => ({ date: String(y),
          pics: list.filter(s => yearOf(s) === y).map(s => `<div class="tl-work">${item(s)}${meta(s) ? `<small class="tl-meta">${meta(s)}</small>` : ''}</div>`).join('') }))) : SOON()}</section>`;
      main.querySelectorAll('[data-who]').forEach(b => b.onclick = () => {
        who = b.dataset.who; history.replaceState(null, '', who ? '?artist=' + who : location.pathname); draw();
      });
      wireTracks(main);
    };
    draw(); onLang(draw);
  },

  // ---------- 同一幅画的几个版本（data/versions.json；图和文字都来自各场景的 scene.json） ----------
  async versions(R, main) {
    const V = await getJSON('versions.json');
    const groups = (await Promise.all(V.groups.map(async g => {
      const meta = R.sceneById[g.scene];
      if (!meta || meta.status !== 'live') return null;
      const S = await fetch(sceneUrl(meta) + 'scene.json', { cache: 'no-cache' }).then(r => r.json());
      return { ...g, meta, S, base: sceneUrl(meta) };
    }))).filter(Boolean);
    const step = g => `<p><a class="btn primary" href="${g.base}">${ui('走进画里', 'Step into the painting')} →</a></p>`;
    main.innerHTML = `<div class="wrap page-title"><h1>${bi(V.title)}</h1></div>
      ${groups.map((g, gi) => {
        const head = `<h2>${bi(g.meta.title)}</h2>`;
        if (g.type === 'compare') {
          const CV = (g.S.ending.versions || []).filter(v => v.image);
          return `<section class="section wrap vers" id="${g.scene}">${head}
            <div class="versions">${CV.map(v => `<figure><img src="${g.base + v.image}" ${altAttr(v.caption)} loading="lazy" /><figcaption>${bi(v.caption, ' / ')}${v.credit ? `<br><small>${bi(v.credit, ' / ')}</small>` : ''}</figcaption></figure>`).join('')}</div>
            ${CV.length > 1 ? `<div class="section-title">${ui('找不同', 'Spot the difference')}<small class="en">Compare two versions — drag left and right</small></div>
            <div class="cmp-pick"><select id="cmpA" aria-label="A"></select><span>↔</span><select id="cmpB" aria-label="B"></select></div>
            <div id="cmp"><img id="cmpImgA" alt="" /><img id="cmpImgB" alt="" /><div id="cmpLine"></div>
              <span class="cmp-tag" id="cmpTagA" style="left:8px"></span><span class="cmp-tag" id="cmpTagB" style="right:8px"></span></div>` : ''}
            ${step(g)}</section>`;
        }
        const X = g.S.exclusive || {};
        return `<section class="section wrap vers" id="${g.scene}">${head}
          <h3>${bi(X.title || X.label)}</h3>
          ${X.intro ? `<p class="where-intro">${bi(X.intro, ' / ')}</p>` : ''}
          ${worldMap(X)}
          <ol class="where-list">${(X.places || []).map(p => `<li class="${p.kind || ''}"><b>${bi(p.date, ' / ')}</b> · ${bi(p.name, ' / ')}${p.note ? ` <small>${bi(p.note, ' / ')}</small>` : ''}</li>`).join('')}</ol>
          <p class="map-note">${bi(X.mapNote || { zh: '示意图：坐标是近似值。陆地轮廓来自 Natural Earth（公有领域）。', en: 'Schematic map: positions are approximate. Coastlines from Natural Earth (public domain).' }, ' ')}</p>
          ${step(g)}</section>`;
      }).join('')}`;
    const cg = groups.find(g => g.type === 'compare');
    if (cg && main.querySelector('#cmp')) compareSlider(main, (cg.S.ending.versions || []).filter(v => v.image), cg.base);
  },

  // ---------- 在伦敦看真迹：按展厅的参观路线（文字在 data/london.json） ----------
  london(R, main) {
    const L = LONDON, key = r => typeof r === 'object' ? r.en : String(r);
    const section = sec => {   // 每家美术馆一节：标题、链接，再按展厅分组
      const m = R.museumById[sec.museum];
      const list = R.allScenes.filter(s => s.museum === sec.museum && s.onDisplay === true && s.room != null && s.room !== '');
      const rooms = [...new Map(list.map(s => [key(s.room), s.room])).values()]
        .sort((a, b) => (typeof a === 'object') - (typeof b === 'object') || (parseInt(key(a)) || 0) - (parseInt(key(b)) || 0));
      return `<section class="section wrap london" id="${sec.museum}"><h2>${bi(sec.title)}<small class="sub">${bi(sec.subtitle)}</small></h2>
        <p class="london-links">${sec.links.map(l => `<a href="${l.url}" target="_blank" rel="noopener">${bi(l.label)} ↗</a>`).join('')}${m && m.url ? `<a href="${m.url}" target="_blank" rel="noopener">${bi(m.name)} ↗</a>` : ''}</p>
        ${rooms.map(r => `<div class="group"><h3>${bi(roomLabel(r))}</h3>
        <div class="rows">${list.filter(s => key(s.room) === key(r)).sort(byOpenYear).map(s => londonRow(R, s)).join('')}</div></div>`).join('') || SOON()}</section>`;
    };
    main.innerHTML = `<div class="wrap page-title"><h1>${bi(L.title)}</h1>
        <p class="notice">${bi(L.notice, ' / ')}</p>
        <p class="london-links"><button class="btn" onclick="print()">${ui('打印', 'Print')}</button></p></div>
      ${L.sections.map(section).join('')}`;
    if (location.hash) { const el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView(); }
  }
};

export async function renderPage(kind, opts = {}) {
  removeStatic();
  const main = document.createElement('main');
  document.body.append(main);
  chrome(opts.nav ?? (kind === 'home' ? '' : kind === 'collection' ? null : kind + '/'));
  document.querySelector('footer').before(main);
  try {
    const [R, about, london] = await Promise.all([loadRegistry(), getJSON('about.json'), getJSON('london.json')]);
    ABOUT = about; LONDON = london;
    await PAGES[kind](R, main, opts);
  } catch (e) {
    main.innerHTML = `<div class="wrap page-title"><p class="soon">${ui('内容加载失败，请刷新页面。', 'Could not load. Please refresh.')}</p></div>`;
    console.error(e);
  }
  setLang(lang);   // 新加的内容也套用当前语言
}
