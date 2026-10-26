// =====================================================================
// 走进名画 · 个人功能（只存在观众自己的浏览器里，localStorage，不需要登录）
//
//   看画护照 / Passport：走到一个场景的结尾（最后一屏），自动盖章；/passport/ 页面按城市和画家显示
//   我的画廊 / My gallery：场景页上的“收藏”按钮（心形）；/my-gallery/ 页面显示收藏的场景，可以分享一个只读链接
// 浏览器不让存（无痕模式等）时，这些功能静静地不起作用，页面照常显示。
// =====================================================================
import { ui, track, ROOT } from './site.js';

const KEY_STAMPS = 'wip-passport', KEY_SAVED = 'wip-saved';
const read = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

// ---------- 看画护照 ----------
export const stamps = () => read(KEY_STAMPS) || {};   // { 场景 id: 盖章日期 YYYY-MM-DD }
export function stamp(id) {
  const s = stamps();
  if (s[id]) return false;
  s[id] = new Date().toISOString().slice(0, 10); write(KEY_STAMPS, s); track('stamp-' + id);
  return true;
}
export function clearStamps() { try { localStorage.removeItem(KEY_STAMPS); } catch (e) {} }

// ---------- 我的画廊 ----------
export const saved = () => (read(KEY_SAVED) || []).filter(x => typeof x === 'string');   // 场景 id，按收藏的先后
export const isSaved = id => saved().includes(id);
export function toggleSaved(id) {
  const list = saved(), on = !list.includes(id);
  write(KEY_SAVED, on ? [...list, id] : list.filter(x => x !== id));
  if (on) track('save-' + id);
  return on;
}
export function setSaved(ids) { write(KEY_SAVED, ids); }

// 心形图标（空心 / 实心）
export const heart = filled => `<svg class="heart" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/></svg>`;
export const saveBtnHTML = () => `<button class="btn save-btn" aria-pressed="false">${heart(false)} <span class="save-label">${ui('收藏', 'Save')}</span></button>`;

// 场景页：收藏按钮 + 走到最后一屏时盖章（engine.js / light.js 调用）
export function setupPersonal(S) {
  const btns = [...document.querySelectorAll('.save-btn')];
  const paint = () => {
    const on = isSaved(S.id);
    for (const b of btns) {
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
      b.querySelector('.heart').outerHTML = heart(on);
      b.querySelector('.save-label').innerHTML = on ? ui('已收藏', 'Saved') : ui('收藏', 'Save');
    }
  };
  btns.forEach(b => b.onclick = () => { toggleSaved(S.id); paint(); });
  paint();
  const end = document.getElementById('actEnd');
  if (!end) return;
  const note = document.createElement('p');
  note.className = 'stamp-note';
  note.innerHTML = `<a href="${ROOT}passport/">✓ ${ui('已盖进你的看画护照', 'Stamped in your Passport')} →</a>`;
  if (stamps()[S.id]) note.classList.add('show');
  const h = end.querySelector('h2'); (h || end.firstChild) && end.insertBefore(note, h ? h.nextSibling : end.firstChild);
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    stamp(S.id); note.classList.add('show'); io.disconnect();
  }), { threshold: 0.25 });
  io.observe(end);
}
