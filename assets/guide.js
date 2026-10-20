// =====================================================================
// 走进名画 · 语音导览（3D 场景和轻量版场景共用）
//
// 录音文件放在场景文件夹的 audio/ 里：
//   audio/guide-zh.mp3   中文
//   audio/guide-en.mp3   English
// 跟着语言切换（中英双语时放中文）；只有一种语言的录音时，两种语言都放它。
// 两个文件都没有时，按钮不显示。不会自动播放。
// 文字稿写在 scene.json 的 audioGuide.transcript 里。
// =====================================================================
import { bi, ui, lang, onLang } from './site.js';

const FILES = { zh: 'audio/guide-zh.mp3', en: 'audio/guide-en.mp3' };
const exists = url => fetch(url, { method: 'HEAD', cache: 'no-cache' }).then(r => r.ok).catch(() => false);
const mmss = t => !isFinite(t) ? '0:00' : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

// 只看有没有录音（关于页用）：base 是场景文件夹的网址
export async function hasGuide(base) {
  const [zh, en] = await Promise.all([exists(base + FILES.zh), exists(base + FILES.en)]);
  return zh || en;
}

// btn：“语音导览”按钮；box：放播放器的空 div；duck(on)：播放时把环境声调小
export async function setupGuide(S, { btn, box, duck = () => {} }) {
  const AG = S.audioGuide || {};
  const src = { zh: AG.zh || FILES.zh, en: AG.en || FILES.en };
  const [hz, he] = await Promise.all([exists(src.zh), exists(src.en)]);
  if (!hz && !he) return;   // 还没有录音：不显示按钮
  const pick = () => { const want = lang === 'en' ? 'en' : 'zh'; return (want === 'zh' ? hz : he) ? want : (hz ? 'zh' : 'en'); };

  const T = AG.transcript || [];
  box.innerHTML = `
    <div class="guide-row">
      <button class="btn primary" id="gPlay" aria-label="Play"></button>
      <input type="range" id="gSeek" min="0" max="1000" value="0" aria-label="Progress" />
      <span id="gTime">0:00 / 0:00</span>
    </div>
    ${T.length ? `<details class="guide-text"><summary>${ui('文字稿', 'Transcript')}</summary>
      ${T.map(p => `${p.title ? `<h4>${bi(p.title)}</h4>` : ''}<p class="zh">${p.text.zh}</p><p class="en">${p.text.en}</p>`).join('')}</details>` : ''}`;
  const play = box.querySelector('#gPlay'), seek = box.querySelector('#gSeek'), time = box.querySelector('#gTime');

  const audio = new Audio();
  audio.preload = 'metadata';
  let cur = null, dragging = false;
  const load = () => { const l = pick(); if (l === cur) return; const was = !audio.paused; audio.pause(); cur = l; audio.src = src[l]; if (was) audio.play(); };
  const label = () => {
    const on = !audio.paused;
    play.textContent = on ? '❚❚' : '▶';
    play.setAttribute('aria-label', on ? 'Pause' : 'Play');
    btn.innerHTML = '🎧 ' + ui('语音导览', 'Audio guide') + (on ? ' ·' : '');
  };
  const tick = () => {
    if (!dragging) seek.value = audio.duration ? Math.round(audio.currentTime / audio.duration * 1000) : 0;
    time.textContent = `${mmss(audio.currentTime)} / ${mmss(audio.duration)}`;
  };
  audio.addEventListener('play', () => { label(); duck(true); });
  audio.addEventListener('pause', () => { label(); duck(false); });
  audio.addEventListener('ended', () => { label(); duck(false); });
  audio.addEventListener('timeupdate', tick);
  audio.addEventListener('loadedmetadata', tick);
  play.onclick = () => audio.paused ? audio.play() : audio.pause();
  seek.addEventListener('input', () => { dragging = true; if (audio.duration) time.textContent = `${mmss(seek.value / 1000 * audio.duration)} / ${mmss(audio.duration)}`; });
  seek.addEventListener('change', () => { dragging = false; if (audio.duration) audio.currentTime = seek.value / 1000 * audio.duration; });

  btn.onclick = () => box.classList.toggle('hidden');
  btn.classList.remove('hidden');
  load(); label();
  onLang(() => { load(); label(); });
  return audio;
}
