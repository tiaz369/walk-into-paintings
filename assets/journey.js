// =====================================================================
// 走进名画 · 从“艺术故事”“画中侦探”进入场景（3D 场景和轻量版场景共用）
//
//   ?story=故事 id：场景结尾显示“继续这段故事 / Continue the story →”，指向下一站（data/stories.json）
//   ?play=互动名：自动走进画里，再打开对应的互动（data/detective.json；名字和按钮见下面的 PLAY）
// =====================================================================
import { ui, bi, ROOT } from './site.js';

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
  const storyId = param('story');
  if (!storyId) return;
  let D = null;
  try { D = await fetch(ROOT + 'data/stories.json', { cache: 'no-cache' }).then(r => r.json()); } catch (e) { return; }
  const R = await fetch(ROOT + 'data/scenes.json', { cache: 'no-cache' }).then(r => r.json()).catch(() => null);
  const st = D.stories.find(x => x.id === storyId);
  if (!st || !R) return;
  const live = id => R.scenes.some(s => s.id === id && s.status === 'live');
  const stops = st.stops.filter(x => live(x.scene));
  const i = stops.findIndex(x => x.scene === S.id);
  if (i < 0) return;
  const next = stops[i + 1], storyUrl = `${ROOT}stories/${st.id}/`;
  const nextScene = next && R.scenes.find(s => s.id === next.scene);
  const box = document.createElement('div');
  box.className = 'story-next';
  box.innerHTML = `<p class="story-of">${bi(st.title)} · ${i + 1} / ${stops.length}</p>`
    + (nextScene ? `<a class="btn primary" href="${ROOT + nextScene.path}?story=${st.id}">${ui('继续这段故事', 'Continue the story')} → ${bi(next.time, ' · ')} · ${bi(nextScene.title)}</a>`
      : `<a class="btn primary" href="${storyUrl}">${ui('故事讲完了，回到故事', 'The end — back to the story')} →</a>`);
  const end = document.getElementById('actEnd');
  if (!end) return;
  const h = end.querySelector('h2');
  end.insertBefore(box, h ? h.nextSibling : end.firstChild);
}
