// =====================================================================
// 走进名画 · 分享这一幅（3D 场景和轻量版场景共用）
//
// 两个按钮，场景页顶部工具栏一组、故事结尾一组：
//   “分享 / Share”：手机和支持的浏览器用系统分享（画名 + 一句话 + 场景链接）；
//                   不支持时复制链接，提示“链接已复制 / Link copied”。GoatCounter 记 share。
//   “生成分享图 / Save image”：画一张 1080 × 1440 的竖版图（适合小红书）：
//     上方原画（完整显示，不裁切）· 中英画名 · 画家 · 年份 · 收藏地 · 一句话（ending.final）
//     · 底部小图标 + walkintopaintings.com。浅色（网站纸色）。下载为 走进名画-<id>.jpg。GoatCounter 记 share-image。
// 分享出去的链接带 ?ref=share（GoatCounter 会把它算作来源，能看出分享带来的访问；不加别的追踪）。
// =====================================================================
import { ui, textOf, lang, track, ROOT } from './site.js';

const W = 1080, H = 1440, PAD = 80;
const C = { bg: '#f5f0e6', ink: '#22201c', muted: '#6f685c', accent: '#8a6a2c', line: '#d6cdbb' };   // 网站浅色模式的颜色（style.css）
const SERIF = "'Cormorant Garamond', 'Songti SC', 'STSong', 'Noto Serif SC', 'Source Han Serif SC', 'WIP Serif SC', serif";
const SANS = "'Inter', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', sans-serif";
const SITE = 'walkintopaintings.com';
const plain = s => String(s || '').replace(/\*([^*]+)\*/g, '$1').replace(/<[^>]+>/g, '');   // 去掉 *斜体* 记号和 HTML
const t = o => plain(textOf(o, lang === 'en' ? 'en' : 'zh'));

function loadImage(src) {
  return new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = src; });
}
// 一段文字按宽度折行（中文按字，英文按词），最多 maxLines 行
function wrap(g, text, maxW, maxLines) {
  const parts = /[　-鿿]/.test(text) ? [...text] : text.split(/(\s+)/);
  const lines = []; let cur = '';
  for (const p of parts) {
    const next = cur + p;
    if (g.measureText(next).width > maxW && cur.trim()) { lines.push(cur.trim()); cur = p.trimStart(); } else cur = next;
  }
  if (cur.trim()) lines.push(cur.trim());
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/.$/, '…'); }
  return lines;
}
// 长画名：先缩小字号（最小 min），还放不下就折成 maxLines 行
function fit(g, text, font, size, min, maxW, maxLines) {
  for (let s = size; s >= min; s -= 2) { g.font = font(s); if (g.measureText(text).width <= maxW) return { size: s, lines: [text] }; }
  g.font = font(min); return { size: min, lines: wrap(g, text, maxW, maxLines) };
}

// 分享链接：场景页的正式网址（canonical）+ ?ref=share
export function shareUrl() {
  const c = document.querySelector('link[rel="canonical"]');
  const u = new URL(c ? c.href : location.origin + location.pathname);
  u.search = '?ref=share'; u.hash = '';
  return u.href;
}

export async function drawShareCard(S) {
  const L = S.label, fin = (S.ending && S.ending.final) || {};
  await Promise.all([`400 60px ${SERIF}`, `italic 400 40px ${SERIF}`, `400 28px ${SANS}`].map(f => document.fonts.load(f, '走进名画 Walk').catch(() => {})));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
  const boxW = W - PAD * 2;

  // 原画：完整显示，不裁切
  const im = await loadImage(S.painting.image);
  const boxH = 720, k = Math.min(boxW / im.naturalWidth, boxH / im.naturalHeight);
  const iw = Math.round(im.naturalWidth * k), ih = Math.round(im.naturalHeight * k), ix = (W - iw) / 2, iy = PAD + (boxH - ih) / 2;
  g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 24; g.shadowOffsetY = 6;
  g.drawImage(im, ix, iy, iw, ih);
  g.shadowColor = 'transparent';

  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  let y = PAD + boxH + 96;
  // 中文画名（长的缩小或折行）
  g.fillStyle = C.ink;
  const zh = fit(g, plain(L.title.zh), s => `400 ${s}px ${SERIF}`, 60, 40, boxW, 2);
  for (const l of zh.lines) { g.fillText(l, W / 2, y); y += zh.size * 1.25; }
  // 英文画名（斜体）
  g.fillStyle = C.muted;
  const en = fit(g, plain(L.title.en), s => `italic 400 ${s}px ${SERIF}`, 40, 28, boxW, 2);
  y -= 8; for (const l of en.lines) { g.fillText(l, W / 2, y); y += en.size * 1.3; }
  // 画家 · 年份 · 收藏地（中文一行，英文一行）
  y += 14;
  const metaLine = k => [L.artist[k], L.date[k], L.museum && L.museum[k]].filter(Boolean).map(plain).join(' · ');
  for (const [k, col] of [['zh', C.ink], ['en', C.muted]]) {   // 太长：先缩小字号，还放不下就折成两行
    g.fillStyle = col;
    const m = fit(g, metaLine(k), s => `400 ${s}px ${SANS}`, 28, 22, boxW, 2);
    for (const l of m.lines) { g.fillText(l, W / 2, y); y += m.size * 1.45; }
  }
  y -= 40;   // 回到最后一行的基线（下面的分隔线从这里往下算）
  // 分隔线 + 一句话
  y += 52; g.strokeStyle = C.line; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2 - 60, y); g.lineTo(W / 2 + 60, y); g.stroke();
  y += 66; g.fillStyle = C.ink; g.font = `400 40px ${SERIF}`;
  for (const l of wrap(g, plain(fin.zh), boxW, 2)) { g.fillText(l, W / 2, y); y += 54; }
  g.fillStyle = C.muted; g.font = `italic 400 34px ${SERIF}`;
  for (const l of wrap(g, plain(fin.en), boxW, 2)) { g.fillText(l, W / 2, y); y += 44; }

  // 底部：小图标 + 网址
  const fy = H - PAD + 6;
  g.font = `500 30px ${SERIF}`; g.fillStyle = C.accent;
  const tw = g.measureText(SITE).width, icon = 40, gap = 14, x0 = (W - (icon + gap + tw)) / 2;
  try { const logo = await loadImage(ROOT + 'favicon.svg'); g.drawImage(logo, x0, fy - icon + 8, icon, icon); } catch (e) {}
  g.textAlign = 'left'; g.fillText(SITE, x0 + icon + gap, fy);
  return cv.toDataURL('image/jpeg', 0.9);
}

// 小提示（“链接已复制”）：两秒后自己消失
function toast(html) {
  const el = document.createElement('div');
  el.className = 'share-toast'; el.setAttribute('role', 'status'); el.innerHTML = html;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('out'), 1800); setTimeout(() => el.remove(), 2400);
}

async function shareLink(S) {
  const L = S.label, fin = (S.ending && S.ending.final) || {};
  const url = shareUrl();
  const title = `${t(L.title)} · ${lang === 'en' ? 'Walk into Paintings' : '走进名画'}`;
  const text = t(fin);
  if (navigator.share) {
    try { await navigator.share({ title, text, url }); track('share'); } catch (e) { /* 用户取消 */ }
    return;
  }
  try { await navigator.clipboard.writeText(url); } catch (e) {
    const ta = document.createElement('textarea'); ta.value = url; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e2) {} ta.remove();
  }
  toast(ui('链接已复制', 'Link copied'));
  track('share');
}

// 按钮 → 分享链接 / 生成分享图（手机：长按保存，支持时也能直接分享图片；电脑：下载）
export function setupShareCard(S) {
  document.querySelectorAll('.share-link').forEach(b => b.onclick = () => shareLink(S));
  const btns = [...document.querySelectorAll('.share-btn')];   // 按钮栏里一个，最后一屏一个
  if (!S.ending || !S.ending.final) { btns.forEach(b => b.remove()); return; }
  const pop = document.createElement('div');
  pop.className = 'share-pop hidden'; pop.setAttribute('role', 'dialog');
  pop.innerHTML = `<div class="share-box panel"><button class="close" aria-label="Close">×</button>
    <img alt="" /><p class="share-tip"></p></div>`;
  document.body.appendChild(pop);
  const img = pop.querySelector('img'), tip = pop.querySelector('.share-tip');
  const close = () => pop.classList.add('hidden');
  pop.querySelector('.close').onclick = close;
  pop.addEventListener('click', e => { if (e.target === pop) close(); });
  const name = `走进名画-${S.id}.jpg`;
  let url = null;
  const open = async btn => {
    btn.disabled = true;
    try {
      url = url || await drawShareCard(S);
      img.src = url; img.alt = textOf({ zh: '分享图', en: 'Share image' }, lang);
      const touch = matchMedia('(pointer: coarse)').matches;
      let file = null;
      try { file = new File([await (await fetch(url)).blob()], name, { type: 'image/jpeg' }); } catch (e) {}
      const canFile = file && navigator.canShare && navigator.canShare({ files: [file] });
      tip.innerHTML = (touch ? ui('长按图片保存', 'Long-press the image to save') + '<br>' : '')
        + (canFile ? `<button class="btn primary share-file">${ui('分享图片', 'Share image')}</button> ` : '')
        + (touch ? '' : `<a class="btn primary" href="${url}" download="${name}">${ui('下载图片', 'Download image')}</a>`);
      const sf = tip.querySelector('.share-file');
      if (sf) sf.onclick = () => navigator.share({ files: [file], url: shareUrl() }).catch(() => {});
      pop.classList.remove('hidden');
      track('share-image');
    } catch (e) { console.warn('share image', e); }
    btn.disabled = false;
  };
  btns.forEach(b => b.onclick = () => open(b));
}
export const shareBtnHTML = () => `<button class="btn share-link">↗ ${ui('分享', 'Share')}</button><button class="btn share-btn">${ui('生成分享图', 'Save image')}</button>`;
