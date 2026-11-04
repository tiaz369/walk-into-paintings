// =====================================================================
// 走进名画 · 从“艺术故事”“画中侦探”进入场景（3D 场景和轻量版场景共用）
//
//   ?story=故事 id：场景结尾显示“继续这段故事 / Continue the story →”，指向下一站（data/stories.json）
//   ?play=互动名：自动走进画里，再打开对应的互动（data/detective.json；名字和按钮见下面的 PLAY）
// =====================================================================
import { ui, bi, ROOT, typeTagHTML } from './site.js';

// 画中侦探：互动名 → 场景里那个按钮
const PLAY = {
  loupe: '#loupeBtn', count: '#countBtn', mirror: '#mirrorBtn', focus: '#focusBtn', insc: '#inscBtn',
  'toggle-0': '[data-toggle="0"]', 'toggle-1': '[data-toggle="1"]'
};
const param = k => new URLSearchParams(location.search).get(k);
const waitFor = (test, ms = 60000) => new Promise(ok => {
  const t0 = Date.now(), tick = () => { if (test()) ok(true); else if (Date.now() - t0 > ms) ok(false); else setTimeout(tick, 200); };
  tick();
});

export async function setupJourney(S) {
  const play = PLAY[param('play')];
  if (play) {   // 自动走进去，再打开互动
    const enter = document.getElementById('enter');
    if (enter) setTimeout(() => enter.click(), 600);
    if (await waitFor(() => document.body.classList.contains('in-room'))) {
      setTimeout(() => { const b = document.querySelector(play); if (b && !b.classList.contains('on')) b.click(); }, 1800);
    }
  }
  collapseEnd();
  keepExploring(S);
  const storyId = param('story');
  let D = null;
  try { D = await fetch(ROOT + 'data/stories.json', { cache: 'no-cache' }).then(r => r.json()); } catch (e) { return; }
  const R = await fetch(ROOT + 'data/scenes.json', { cache: 'no-cache' }).then(r => r.json()).catch(() => null);
  if (!R) return;
  const live = id => R.scenes.some(s => s.id === id && s.status === 'live');
  if (!storyId) {   // 不是从故事页进来的：结尾加“这幅画也在一个故事里”，指向包含这幅画的故事
    const ins = D.stories.filter(x => x.stops.some(y => y.scene === S.id));
    const end = document.getElementById('actEnd');
    if (!ins.length || !end) return;
    const box = document.createElement('div');
    box.className = 'story-next';
    box.innerHTML = `<p class="story-of">${ui('这幅画也在一个故事里', 'This painting is part of a story')}</p>`
      + ins.map(x => `<a class="btn" href="${ROOT}stories/${x.id}/">${bi(x.title)} →</a>`).join(' ');
    const h = end.querySelector('h2');
    end.insertBefore(box, h ? h.nextSibling : end.firstChild);
    return;
  }
  const st = D.stories.find(x => x.id === storyId);
  if (!st) return;
  const stops = st.stops.filter(x => live(x.scene));
  const i = stops.findIndex(x => x.scene === S.id);
  if (i < 0) return;
  const next = stops[i + 1], storyUrl = `${ROOT}stories/${st.id}/`;
  const nextScene = next && R.scenes.find(s => s.id === next.scene);
  const box = document.createElement('div');
  box.className = 'story-next';
  box.innerHTML = `<p class="story-of">${bi(st.title)} · ${i + 1} / ${stops.length}</p>`
    + (nextScene ? `<a class="btn primary" href="${ROOT + nextScene.path}?story=${st.id}">${ui('继续这段故事', 'Continue the story')} → ${next.time ? bi(next.time, ' · ') + ' · ' : ''}${bi(nextScene.title)}</a>`
      : `<a class="btn primary" href="${storyUrl}">${ui('故事结束 · 回到故事页', 'The end · Back to the story page')} →</a>`);
  const end = document.getElementById('actEnd');
  if (!end) return;
  const h = end.querySelector('h2');
  end.insertBefore(box, h ? h.nextSibling : end.firstChild);
}

// ---------- 场景结尾“继续探索”：推荐 2–3 个相关场景（同系列 → 同画家 → 同主题），只推荐已上线的 ----------
async function keepExploring(S) {
  const end = document.getElementById('actEnd');
  if (!end) return;
  const R = await fetch(ROOT + 'data/scenes.json', { cache: 'no-cache' }).then(r => r.json()).catch(() => null);
  if (!R) return;
  const me = R.scenes.find(s => s.id === S.id);
  if (!me) return;
  const live = R.scenes.filter(s => s.status === 'live' && s.id !== me.id && s.cover);
  const inCol = c => R.collections.filter(x => x.order.includes(c)).flatMap(x => x.order);
  const sameCol = new Set(inCol(me.id));
  const themes = new Set((me.themes || []).filter(t => t !== 'london'));
  const picks = [];
  const add = (list, why) => { for (const s of list) { if (picks.length >= 3) return; if (!picks.some(p => p.s.id === s.id)) { picks.push({ s, why }); return; } } };
  // 同系列：按系列里的顺序，从这一幅后面开始
  const col = R.collections.find(x => x.order.includes(me.id));
  if (col) { const i = col.order.indexOf(me.id); add([...col.order.slice(i + 1), ...col.order.slice(0, i)].map(id => live.find(s => s.id === id)).filter(Boolean), { zh: '同一个系列', en: 'Same collection' }); }
  add(live.filter(s => s.artist === me.artist && !sameCol.has(s.id)), { zh: '同一位画家', en: 'Same artist' });
  add(live.filter(s => (s.themes || []).some(t => themes.has(t)) && s.artist !== me.artist), { zh: '相似的主题', en: 'Similar theme' });
  if (picks.length < 2) add(live.filter(s => s.artist === me.artist), { zh: '同一位画家', en: 'Same artist' });
  if (!picks.length) return;
  const box = document.createElement('div');
  box.className = 'keep-exploring';
  box.innerHTML = `<div class="section-title">${ui('继续探索', 'Keep exploring')}</div><div class="ke-cards">${picks.map(({ s, why }) => `<a class="ke-card" href="${ROOT + s.path}">
      <span class="ke-pic"><img src="${ROOT + s.cover}" alt="" loading="lazy" />${typeTagHTML(s)}</span>
      <span class="ke-why">${ui(why.zh, why.en)}</span><span class="ke-name">${bi(s.title)}</span></a>`).join('')}</div>`;
  const acts = end.querySelector('.end-actions');   // 放在结尾按钮后面（延伸阅读之前）
  if (acts) acts.after(box); else end.append(box);
}

// ---------- 最后一屏的文字部分默认折叠，只显示标题，点一下展开（作品档案、关于画家、去现场看真迹、延伸阅读） ----------
function collapseEnd() {
  const end = document.getElementById('actEnd');
  if (!end) return;
  const KEEP = /找不同|Spot the difference|下一个场景|Next scene|继续探索|Keep exploring/;
  for (const t of [...end.querySelectorAll('.section-title')]) {
    if (KEEP.test(t.textContent) || t.closest('details')) continue;
    const d = document.createElement('details'); d.className = 'end-fold';
    const sum = document.createElement('summary'); sum.className = 'section-title'; sum.innerHTML = t.innerHTML;
    d.append(sum);
    const host = t.parentElement;
    if (host !== end && (host.classList.contains('artist-bio') || host.classList.contains('reading'))) {   // 标题在自己的小节里：整节收进去
      host.before(d); t.remove(); while (host.firstChild) d.append(host.firstChild); d.append(host); host.remove();
      continue;
    }
    t.before(d); t.remove();
    let n = d.nextElementSibling;   // 标题后面的内容，直到下一个标题或按钮区
    while (n && !n.classList.contains('section-title') && !n.classList.contains('end-actions') && !n.classList.contains('next-scene') && !n.classList.contains('credit') && !n.classList.contains('keep-exploring') && !n.classList.contains('subscribe-slot') && !n.classList.contains('end-main') && !n.matches('section, details')) {
      const nx = n.nextElementSibling; d.append(n); n = nx;
    }
  }
}
