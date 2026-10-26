// =====================================================================
// 走进名画 · 分享卡片（3D 场景和轻量版场景共用）
//
// 场景页上的“生成分享卡片 / Share card”按钮：画一张 1080 × 1350 的竖版图片
//   上方：原画（完整显示，不裁切）
//   中间：场景最后一屏的那句话（中英各一行）
//   下方：画名 · 画家 · 年份，和网站名“走进名画 · Walk into Paintings”
// 手机上直接显示图片，提示“长按保存”；电脑上可以下载。GoatCounter 记录 share-card-<场景 id>。
// =====================================================================
import { ui, textOf, lang, track } from './site.js';

const W = 1080, H = 1350, PAD = 80;
const C = { bg: '#1c1c1e', ink: '#ebe5d9', muted: '#9b958a', accent: '#c9a24a', line: '#36363b' };   // 网站深色模式的颜色（style.css）
const SERIF = "'Cormorant Garamond', 'Noto Serif SC', 'Songti SC', 'STSong', serif";
const SANS = "'Inter', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', sans-serif";
const plain = s => String(s || '').replace(/\*([^*]+)\*/g, '$1').replace(/<[^>]+>/g, '');   // 去掉 *斜体* 记号和 HTML

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

export async function drawShareCard(S) {
  const L = S.label, fin = (S.ending && S.ending.final) || {};
  await Promise.all([`500 46px ${SERIF}`, `italic 400 36px ${SERIF}`, `400 26px ${SANS}`].map(f => document.fonts.load(f, '走进名画 Walk').catch(() => {})));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = C.bg; g.fillRect(0, 0, W, H);

  // 原画：完整显示，不裁切
  const im = await loadImage(S.painting.image);
  const boxW = W - PAD * 2, boxH = 760, k = Math.min(boxW / im.naturalWidth, boxH / im.naturalHeight);
  const iw = Math.round(im.naturalWidth * k), ih = Math.round(im.naturalHeight * k), ix = (W - iw) / 2, iy = PAD + (boxH - ih) / 2;
  g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 30; g.shadowOffsetY = 8;
  g.drawImage(im, ix, iy, iw, ih);
  g.shadowColor = 'transparent';

  // 最后一屏的那句话：中文一行、英文一行（太长时折行）
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  let y = PAD + boxH + 100;
  g.fillStyle = C.ink; g.font = `500 46px ${SERIF}`;
  for (const l of wrap(g, plain(fin.zh), boxW, 2)) { g.fillText(l, W / 2, y); y += 62; }
  y += 4; g.fillStyle = C.muted; g.font = `italic 400 36px ${SERIF}`;
  for (const l of wrap(g, plain(fin.en), boxW, 2)) { g.fillText(l, W / 2, y); y += 48; }

  // 画名 · 画家 · 年份
  const foot = H - PAD - 64;
  g.strokeStyle = C.line; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2 - 60, foot - 112); g.lineTo(W / 2 + 60, foot - 112); g.stroke();
  g.fillStyle = C.ink; g.font = `400 26px ${SANS}`;
  g.fillText(wrap(g, `《${plain(L.title.zh)}》 · ${plain(L.artist.zh)} · ${plain(L.date.zh)}`, boxW, 1)[0], W / 2, foot - 62);
  g.fillStyle = C.muted; g.font = `italic 400 30px ${SERIF}`;
  g.fillText(wrap(g, `${plain(L.title.en)} · ${plain(L.artist.en)} · ${plain(L.date.en)}`, boxW, 1)[0], W / 2, foot - 20);
  // 网站名
  g.fillStyle = C.accent; g.font = `500 32px ${SERIF}`;
  g.fillText('走进名画 · Walk into Paintings', W / 2, H - PAD + 4);
  return cv.toDataURL('image/png');
}

// 按钮 → 生成 → 弹出图片（手机：长按保存；电脑：下载）
export function setupShareCard(S) {
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
  let url = null;
  const open = async btn => {
    btn.disabled = true;
    try {
      url = url || await drawShareCard(S);
      img.src = url; img.alt = textOf({ zh: '分享卡片', en: 'Share card' }, lang);
      const touch = matchMedia('(pointer: coarse)').matches;
      tip.innerHTML = touch ? ui('长按保存', 'Long-press to save')
        : `<a class="btn primary" href="${url}" download="${S.id}-share-card.png">${ui('下载图片', 'Download image')}</a>`;
      pop.classList.remove('hidden');
      track('share-card-' + S.id);
    } catch (e) { console.warn('share card', e); }
    btn.disabled = false;
  };
  btns.forEach(b => b.onclick = () => open(b));
}
export const shareBtnHTML = () => `<button class="btn share-btn">${ui('生成分享卡片', 'Share card')}</button>`;
