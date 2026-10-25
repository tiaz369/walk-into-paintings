// =====================================================================
// 走进名画 · 声音（3D 场景和轻量版场景共用）
//
// 两个开关，都默认关闭：
//   环境音 / Ambience：用代码现场合成（没有录音文件，没有版权问题）。
//     scene.json 的 "ambience" 写用哪一种（见下面 AMBIENCE）；写 null 时不显示开关。
//   音乐 / Music：scene.json 的 "music"，src 填了录音文件才显示开关。
//     只用确认为 CC0 或公有领域的录音。播放时显示曲名和演奏信息。
// 语音导览播放时：环境音自动调小，音乐自动暂停（导览停了再接着放）。
// =====================================================================
import { bi, ui, onLang } from './site.js';

let ctx = null;
const rnd = (a, b) => a + Math.random() * (b - a);

// ---------- 合成用的小零件 ----------
function noiseBuffer(kind = 'white', sec = 4) {
  const len = ctx.sampleRate * sec, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
  }
  return buf;
}
const buffers = {};
const buf = kind => buffers[kind] || (buffers[kind] = noiseBuffer(kind));
function loopNoise(kind, out, { type = 'lowpass', freq = 500, q = 0.7, gain = 0.2 } = {}) {   // 一直响着的底噪（风、房间、河水……）
  const src = ctx.createBufferSource(); src.buffer = buf(kind); src.loop = true;
  src.playbackRate.value = rnd(0.9, 1.1);
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.value = gain;
  src.connect(f).connect(g).connect(out); src.start(ctx.currentTime, rnd(0, 3));
  return { src, f, g };
}
function pan(out, p) {
  if (!ctx.createStereoPanner) return out;
  const n = ctx.createStereoPanner(); n.pan.value = p; n.connect(out); return n;
}
function burst(out, t, { kind = 'white', type = 'bandpass', freq = 2000, q = 1, vol = 0.2, dur = 0.03, p = 0 } = {}) {   // 很短的一声（钟摆、台球、马蹄）
  const src = ctx.createBufferSource(); src.buffer = buf(kind);
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(pan(out, p)); src.start(t, rnd(0, 3)); src.stop(t + dur + 0.05);
}
function tone(out, t, { f0, f1 = f0, type = 'sine', vol = 0.05, attack = 0.005, dur = 0.2, p = 0 }) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(pan(out, p)); o.start(t); o.stop(t + dur + 0.05);
}
// 每隔一段随机时间做一件事（关掉环境音时停下）
function every(state, min, max, fn) {
  const go = () => { state.timers.push(setTimeout(() => { if (state.on) { fn(ctx.currentTime + 0.05); go(); } }, rnd(min, max) * 1000)); };
  go();
}

// ---------- 声音事件 ----------
function bird(out, t) {
  const n = 2 + Math.floor(Math.random() * 5), base = rnd(2600, 4800), gap = rnd(0.09, 0.17), p = rnd(-0.8, 0.8);
  for (let k = 0; k < n; k++) { const up = Math.random() < 0.5; tone(out, t + k * gap, { f0: base * (up ? 0.8 : 1.2), f1: base * (up ? 1.25 : 0.75), vol: 0.035, attack: 0.012, dur: rnd(0.06, 0.11), p }); }
}
function clink(out, t) {   // 杯子碰撞：两个不和谐的高音，很快消失
  const f = rnd(2400, 3600), p = rnd(-0.7, 0.7);
  tone(out, t, { f0: f, vol: 0.03, attack: 0.002, dur: rnd(0.5, 0.9), p });
  tone(out, t, { f0: f * 2.76, vol: 0.012, attack: 0.002, dur: 0.35, p });
  if (Math.random() < 0.4) tone(out, t + rnd(0.06, 0.14), { f0: f * 1.07, vol: 0.02, attack: 0.002, dur: 0.5, p });
}
function billiard(out, t) {   // 台球碰撞：一两声清脆的“咔”
  const p = rnd(-0.5, 0.5);
  burst(out, t, { type: 'bandpass', freq: 2600, q: 3, vol: 0.18, dur: 0.035, p });
  tone(out, t, { f0: 1900, vol: 0.03, attack: 0.001, dur: 0.06, p });
  if (Math.random() < 0.6) { const t2 = t + rnd(0.25, 0.7); burst(out, t2, { type: 'bandpass', freq: 2400, q: 3, vol: 0.1, dur: 0.03, p }); }
}
function murmur(out, gain = 0.12) {   // 低声交谈：几层人声频段的噪声，音量跟着说话的节奏起伏
  const layers = [380, 620, 900].map((freq, i) => {
    const l = loopNoise('white', pan(out, [-0.5, 0.3, 0.6][i]), { type: 'bandpass', freq, q: 1.2, gain: 0 });
    return l;
  });
  return state => every(state, 0.12, 0.35, t => {
    for (const l of layers) l.g.gain.setTargetAtTime(Math.random() < 0.3 ? gain * 0.15 : gain * rnd(0.4, 1), t, 0.06);
  });
}
function hooves(out, t) {   // 远处马车：马蹄“嗒嗒”加车轮的低沉声音，慢慢近了又远去
  const steps = 22, cad = 0.26, p0 = rnd(-0.9, -0.4), p1 = -p0;
  for (let k = 0; k < steps; k++) {
    const x = k / (steps - 1), env = Math.sin(Math.PI * x), tk = t + k * cad + (k % 2 ? 0.09 : 0);
    burst(out, tk, { kind: 'brown', type: 'lowpass', freq: 900, q: 1, vol: 0.25 * env + 0.001, dur: 0.06, p: p0 + (p1 - p0) * x });
  }
  const rumble = ctx.createBufferSource(); rumble.buffer = buf('brown');
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.18, t + steps * cad / 2); g.gain.linearRampToValueAtTime(0.0001, t + steps * cad);
  rumble.connect(f).connect(g).connect(out); rumble.start(t); rumble.stop(t + steps * cad + 0.1);
}
function giggle(out, t) {   // 远处孩子的笑声：几声短短的、有颤音的“哈哈”，一声比一声低
  const n = 3 + Math.floor(Math.random() * 4), base = rnd(420, 620), p = rnd(-0.7, 0.7);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = rnd(1100, 1500); f.Q.value = 1.2;
  f.connect(pan(out, p));
  for (let k = 0; k < n; k++) {
    const tk = t + k * rnd(0.13, 0.18), fr = base * (1 - k * 0.04);
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(fr * 1.08, tk); o.frequency.exponentialRampToValueAtTime(fr, tk + 0.1);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, tk); g.gain.exponentialRampToValueAtTime(0.05, tk + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, tk + 0.11);
    o.connect(g).connect(f); o.start(tk); o.stop(tk + 0.13);
  }
}
function rustle(out, t) {   // 纸张轻响：几下很轻、很短的“沙沙”
  const n = 2 + Math.floor(Math.random() * 4), p = rnd(-0.3, 0.3);
  for (let k = 0; k < n; k++) burst(out, t + k * rnd(0.05, 0.14), { type: 'highpass', freq: rnd(2500, 4500), q: 0.7, vol: rnd(0.03, 0.06), dur: rnd(0.05, 0.12), p });
}
function pour(out, t) {   // 牛奶倒进陶罐：细细的水声，倒完慢慢停下，中间偶尔“咕”一声
  const dur = rnd(5, 9);
  const src = ctx.createBufferSource(); src.buffer = buf('white'); src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.6;
  f.frequency.setValueAtTime(2600, t); f.frequency.linearRampToValueAtTime(1700, t + dur);   // 罐子越满，声音越低
  const flutter = ctx.createGain(); flutter.gain.value = 0.7;
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = rnd(9, 14); lg.gain.value = 0.3;
  lfo.connect(lg).connect(flutter.gain);
  const g = ctx.createGain(); const v = rnd(0.05, 0.08);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.6); g.gain.setValueAtTime(v, t + dur - 1); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(flutter).connect(g).connect(pan(out, -0.25));
  src.start(t, rnd(0, 3)); lfo.start(t); src.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
  for (let k = 0, n = 2 + Math.floor(Math.random() * 3); k < n; k++)
    tone(out, t + rnd(0.8, dur - 1), { f0: rnd(500, 800), f1: rnd(900, 1300), vol: 0.012, attack: 0.004, dur: 0.07, p: -0.25 });
}
function lap(out, t) {   // 河水轻拍岸边：一下涌上来、慢慢退去
  const src = ctx.createBufferSource(); src.buffer = buf('white');
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(400, t); f.frequency.linearRampToValueAtTime(1300, t + 0.35); f.frequency.linearRampToValueAtTime(300, t + 1.6);
  const g = ctx.createGain(); const v = rnd(0.18, 0.32);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
  src.connect(f).connect(g).connect(pan(out, rnd(-0.6, 0.6))); src.start(t, rnd(0, 2)); src.stop(t + 2);
}
function bee(out, t) {   // 一只蜜蜂飞过：嗡嗡声，从一边飞到另一边
  const dur = rnd(2.5, 5), base = rnd(190, 240), p0 = rnd(-1, 1);
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(base, t);
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = rnd(4, 7); lg.gain.value = rnd(6, 14);
  lfo.connect(lg).connect(o.frequency);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = base * 2.2; f.Q.value = 1.4;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.035, t + dur * 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  const pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  let node = o.connect(f).connect(g);
  if (pn) { pn.pan.setValueAtTime(p0, t); pn.pan.linearRampToValueAtTime(-p0 * 0.8, t + dur); node = node.connect(pn); }
  node.connect(out); o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
}
function cicadas(out, t) {   // 蝉鸣：高音的“嘶嘶”，一阵一阵
  const dur = rnd(4, 9);
  const src = ctx.createBufferSource(); src.buffer = buf('white'); src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = rnd(4200, 5600); f.Q.value = 6;
  const am = ctx.createGain(); am.gain.value = 0;
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.type = 'square'; lfo.frequency.value = rnd(28, 45); lg.gain.value = 0.5;
  lfo.connect(lg).connect(am.gain);
  const g = ctx.createGain(); const v = rnd(0.05, 0.09);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 1.2); g.gain.setValueAtTime(v, t + dur - 1.5); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(am).connect(g).connect(pan(out, rnd(-0.7, 0.7)));
  src.start(t, rnd(0, 3)); lfo.start(t); src.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
}

// ---------- 每个场景的环境音（scene.json 的 "ambience"） ----------
// 每一种：start(out, state, opts) 接好一直响着的声音，再安排偶尔出现的声音
const AMBIENCE = {
  // 安静室内，偶尔鸟叫（窗外）
  'room-birds'(out, st) { loopNoise('brown', out, { freq: 260, gain: 0.12 }); bird(out, ctx.currentTime + 0.3); every(st, 2, 7, t => bird(out, t)); },
  // 非常安静的室内：只有很轻的房间底噪
  quiet(out) { loopNoise('brown', out, { freq: 180, gain: 0.06 }); },
  // 安静的室内，窗外远处的街道声（人声和马车都隔着窗，很轻）
  'room-street'(out, st) {
    loopNoise('brown', out, { freq: 220, gain: 0.11 });
    const far = ctx.createGain(); far.gain.value = 0.35; far.connect(pan(out, -0.6));   // 窗在左边
    murmur(far, 0.03)(st);
    hooves(far, ctx.currentTime + 4); every(st, 20, 40, t => hooves(far, t));
  },
  // 夏天的池塘边：轻轻的水声，风吹树叶，几声鸟叫
  pond(out, st) {
    const leaves = loopNoise('brown', out, { type: 'bandpass', freq: 900, q: 0.5, gain: 0.07 });   // 树叶沙沙：音量慢慢起伏
    st.timers.push(setInterval(() => leaves.g.gain.setTargetAtTime(0.04 + 0.08 * Math.random(), ctx.currentTime, 1.2), 1500));
    const water = ctx.createGain(); water.gain.value = 0.4; water.connect(out);
    lap(water, ctx.currentTime + 0.5); every(st, 3, 7, t => lap(water, t));
    bird(out, ctx.currentTime + 1.5); every(st, 4, 11, t => bird(out, t));
  },
  // 巴黎街头的雨天：人声、脚步声，小雨打在伞上（A rainy Paris street）
  'rain-street'(out, st) {
    loopNoise('white', out, { type: 'highpass', freq: 3500, gain: 0.03 });   // 细雨
    loopNoise('brown', out, { freq: 300, gain: 0.08 });
    murmur(out, 0.06)(st);
    const drop = t => burst(out, t, { type: 'bandpass', freq: rnd(1800, 3200), q: 3, vol: 0.05, dur: 0.02, p: rnd(-0.8, 0.8) });   // 雨点打在伞面上
    every(st, 0.08, 0.3, drop);
    const step = t => burst(out, t, { kind: 'brown', type: 'bandpass', freq: rnd(500, 800), q: 4, vol: 0.06, dur: 0.05, p: rnd(-0.6, 0.6) });
    every(st, 0.4, 1.2, step);
  },
  // 安静的画室：画笔在画布上的轻响，偶尔木头椅子的声音（A quiet studio）
  studio(out, st) {
    loopNoise('brown', out, { freq: 190, gain: 0.07 });
    const stroke = t => { for (let i = 0; i < 3; i++) burst(out, t + i * rnd(0.15, 0.3), { kind: 'white', type: 'bandpass', freq: rnd(2500, 4200), q: 1.2, vol: 0.03, dur: rnd(0.12, 0.25), p: 0.2 }); };   // 画笔划过画布
    every(st, 2, 6, stroke);
    const creak = t => burst(out, t, { kind: 'brown', type: 'bandpass', freq: rnd(380, 600), q: 9, vol: 0.12, dur: rnd(0.12, 0.25), p: 0.3 });
    every(st, 12, 25, creak);
  },
  // 安静的室内：远处隔壁房间轻轻的鲁特琴声（拨弦），偶尔纸张的声音（A quiet room, a lute next door）
  'lute-room'(out, st) {
    loopNoise('brown', out, { freq: 200, gain: 0.06 });
    const far = ctx.createGain(); far.gain.value = 0.22; far.connect(pan(out, 0.15));   // 琴声在门那边，很轻
    const notes = [196, 247, 294, 330, 294, 247, 220, 262];
    const phrase = t => notes.forEach((f, i) => { tone(far, t + i * rnd(0.35, 0.5), { f0: f, type: 'triangle', vol: 0.05, attack: 0.004, dur: 1.4 }); tone(far, t + i * 0.42, { f0: f * 2, vol: 0.012, attack: 0.004, dur: 0.6 }); });
    phrase(ctx.currentTime + 2); every(st, 9, 16, phrase);
    const paper = t => { for (let i = 0; i < 4; i++) burst(out, t + i * rnd(0.05, 0.12), { kind: 'white', type: 'bandpass', freq: rnd(3000, 5200), q: 0.9, vol: 0.025, dur: rnd(0.06, 0.14), p: 0.1 }); };   // 展开信纸
    every(st, 14, 28, paper);
  },
  // 代尔夫特的河边：河水轻拍岸边，远处教堂的钟声，风和鸟叫（A riverside in Delft）
  'delft-river'(out, st) {
    const w = loopNoise('brown', out, { freq: 380, gain: 0.08 });
    st.timers.push(setInterval(() => w.g.gain.setTargetAtTime(0.05 + 0.08 * Math.random(), ctx.currentTime, 1.5), 2500));
    lap(out, ctx.currentTime + 0.5); every(st, 2.5, 5, t => lap(out, t));
    every(st, 5, 12, t => bird(out, t));
    const far = ctx.createGain(); far.gain.value = 0.25; far.connect(pan(out, 0.2));   // 远处的钟，很轻
    const bells = t => [523, 392, 440, 330].forEach((f, i) => { tone(far, t + i * 1.1, { f0: f, vol: 0.06, attack: 0.005, dur: 3 }); tone(far, t + i * 1.1, { f0: f * 2.4, vol: 0.015, attack: 0.005, dur: 1.5 }); });
    bells(ctx.currentTime + 4); every(st, 30, 50, bells);
  },
  // 音乐厅：热闹的人声、杯子碰撞，远处乐队的演奏，偶尔一阵掌声（A music hall）
  'music-hall'(out, st) {
    loopNoise('brown', out, { freq: 320, gain: 0.1 });
    murmur(out, 0.12)(st);
    every(st, 1.2, 4, t => clink(out, t));
    const far = ctx.createGain(); far.gain.value = 0.35; far.connect(pan(out, -0.4));   // 乐队在远处
    const chords = [[262, 330, 392], [294, 370, 440], [247, 311, 392], [262, 330, 392]];
    const phrase = t => chords.forEach((c, i) => c.forEach(f => tone(far, t + i * 0.9, { f0: f, type: 'triangle', vol: 0.025, attack: 0.05, dur: 1.0 })));
    phrase(ctx.currentTime + 1.5); every(st, 4, 8, phrase);
    const applause = t => { for (let i = 0; i < 60; i++) burst(far, t + Math.random() * 2.5, { type: 'bandpass', freq: rnd(1500, 3500), q: 1.5, vol: 0.05, dur: 0.02, p: rnd(-0.8, 0.8) }); };
    every(st, 25, 50, applause);
  },
  // 雨中的巴黎路口：小雨声，雨水打在伞上，马车轮子压过湿石板，远处的脚步声（A rainy crossroads）
  'rain-cobbles'(out, st) {
    loopNoise('white', out, { type: 'highpass', freq: 3200, gain: 0.04 });   // 小雨
    loopNoise('brown', out, { freq: 260, gain: 0.06 });
    const drop = t => burst(out, t, { type: 'bandpass', freq: rnd(1800, 3200), q: 3, vol: 0.05, dur: 0.02, p: rnd(-0.8, 0.8) });   // 雨点打在伞面上
    every(st, 0.08, 0.3, drop);
    hooves(out, ctx.currentTime + 3); every(st, 18, 35, t => hooves(out, t));   // 马车压过湿石板
    const step = t => burst(out, t, { kind: 'brown', type: 'bandpass', freq: rnd(500, 800), q: 4, vol: 0.04, dur: 0.05, p: rnd(-0.6, 0.6) });
    every(st, 0.6, 1.6, step);
  },
  // 夏日河边：水声，远处很低的蒸汽和工厂声，偶尔有人跳水的水花声（A summer riverside）
  riverside(out, st) {
    loopNoise('brown', out, { freq: 340, gain: 0.08 });
    loopNoise('brown', out, { type: 'lowpass', freq: 90, gain: 0.07 });   // 远处工厂的低鸣
    lap(out, ctx.currentTime + 0.4); every(st, 2, 5, t => lap(out, t));
    const splash = t => { burst(out, t, { kind: 'white', type: 'bandpass', freq: 1400, q: 0.6, vol: 0.16, dur: 0.35, p: rnd(-0.4, 0.8) }); burst(out, t + 0.12, { kind: 'white', type: 'highpass', freq: 2500, q: 0.5, vol: 0.06, dur: 0.6, p: rnd(-0.4, 0.8) }); };
    every(st, 14, 30, splash);
    every(st, 8, 18, t => bird(out, t));
  },
  // 排练室：木地板轻响，低声交谈，远处的钢琴（A rehearsal room）
  rehearsal(out, st) {
    loopNoise('brown', out, { freq: 240, gain: 0.08 });
    murmur(out, 0.05)(st);
    const creak = t => burst(out, t, { kind: 'brown', type: 'bandpass', freq: rnd(420, 700), q: 10, vol: 0.12, dur: rnd(0.08, 0.18), p: rnd(-0.7, 0.7) });
    every(st, 3, 9, creak);
    const far = ctx.createGain(); far.gain.value = 0.3; far.connect(pan(out, 0.5));   // 钢琴在隔壁，很轻
    const scale = [262, 294, 330, 349, 392, 440, 494, 523];
    const phrase = t => { let k = Math.floor(rnd(0, 4)); for (let i = 0; i < 6; i++) { k = Math.max(0, Math.min(7, k + Math.floor(rnd(-2, 3)))); tone(far, t + i * 0.42, { f0: scale[k], type: 'triangle', vol: 0.05, attack: 0.01, dur: 1.2 }); } };
    phrase(ctx.currentTime + 2); every(st, 7, 14, phrase);
  },
  // 非常安静的冬日室内：很轻的房间底噪，窗外偶尔一阵很远的风（A quiet winter room）
  'winter-room'(out, st) {
    loopNoise('brown', out, { freq: 170, gain: 0.06 });
    const wind = loopNoise('brown', out, { freq: 300, gain: 0.0 });
    every(st, 12, 24, t => { wind.g.gain.setTargetAtTime(0.05, t, 1.5); wind.g.gain.setTargetAtTime(0.0, t + 4, 2); });
  },
  // 春天的花园：风吹叶子，鸟叫（Spring garden）
  'spring-garden'(out, st) {
    const leaves = loopNoise('brown', out, { type: 'bandpass', freq: 1100, q: 0.5, gain: 0.08 });   // 树叶沙沙：音量慢慢起伏
    st.timers.push(setInterval(() => leaves.g.gain.setTargetAtTime(0.04 + 0.1 * Math.random(), ctx.currentTime, 1), 1800));
    bird(out, ctx.currentTime + 0.6); every(st, 1.5, 5, t => bird(out, t));
    every(st, 6, 14, t => { bird(out, t); bird(out, t + rnd(0.4, 0.9)); });   // 偶尔两只鸟一问一答
  },
  // 早春的微风，几声鸟叫（A breeze in early spring）
  'early-spring'(out, st) {
    const w = loopNoise('brown', out, { freq: 360, gain: 0.08 });   // 微风：音量慢慢起伏
    st.timers.push(setInterval(() => w.g.gain.setTargetAtTime(0.04 + 0.09 * Math.random(), ctx.currentTime, 1.5), 2500));
    bird(out, ctx.currentTime + 1.2); every(st, 5, 12, t => bird(out, t));
  },
  // 夜晚的风，远处几声蟋蟀
  'night-wind'(out, st) {
    const w = loopNoise('brown', out, { freq: 380, gain: 0.16 });
    st.timers.push(setInterval(() => { const t = ctx.currentTime, k = Math.random(); w.g.gain.setTargetAtTime(0.1 + 0.18 * k, t, 1.5); w.f.frequency.setTargetAtTime(300 + 400 * k, t, 1.5); }, 2500));
    const far = ctx.createGain(); far.gain.value = 0.35; far.connect(out);
    const chirp = t => { for (let i = 0; i < 3; i++) burst(far, t + i * 0.09, { type: 'bandpass', freq: 4300, q: 14, vol: 0.12, dur: 0.05, p: rnd(-0.6, 0.6) }); };
    chirp(ctx.currentTime + 1); every(st, 1.5, 4, chirp);
  },
  // 农舍里安静的夜晚：木头椅子轻响，餐具碰撞，屋外的风
  farmhouse(out, st) {
    loopNoise('brown', out, { freq: 200, gain: 0.1 });
    const wind = loopNoise('brown', out, { freq: 320, gain: 0.05 });
    st.timers.push(setInterval(() => wind.g.gain.setTargetAtTime(0.03 + 0.07 * Math.random(), ctx.currentTime, 2), 3000));
    const creak = t => burst(out, t, { kind: 'brown', type: 'bandpass', freq: rnd(380, 620), q: 9, vol: 0.18, dur: rnd(0.12, 0.25), p: rnd(-0.5, 0.5) });
    every(st, 6, 14, creak);
    every(st, 3, 8, t => clink(out, t));
  },
  // 安静室内
  room(out) { loopNoise('brown', out, { freq: 220, gain: 0.12 }); },
  // 安静的街道：运河边轻轻的水声，孩子的笑声，远处的鸟叫
  'street-canal'(out, st) {
    loopNoise('brown', out, { freq: 320, gain: 0.11 });
    const water = ctx.createGain(); water.gain.value = 0.45; water.connect(out);   // 运河在身后，水声轻一点
    lap(water, ctx.currentTime + 0.4); every(st, 2.5, 5, t => lap(water, t));
    every(st, 7, 16, t => giggle(out, t));
    every(st, 5, 12, t => bird(out, t));
  },
  // 安静的室内：偶尔有纸张轻响，窗外远处有几声鸟叫
  letter(out, st) {
    loopNoise('brown', out, { freq: 210, gain: 0.11 });
    every(st, 4, 10, t => rustle(out, t));
    every(st, 8, 18, t => bird(pan(out, -0.6), t));
  },
  // 安静的厨房：牛奶倒进陶罐的细细水声，窗外偶尔几声鸟叫
  kitchen(out, st) {
    loopNoise('brown', out, { freq: 220, gain: 0.1 });
    pour(out, ctx.currentTime + 0.8); every(st, 10, 16, t => pour(out, t));
    every(st, 6, 14, t => bird(out, t));
  },
  // 白天街道，远处马车声
  'street-day'(out, st) {
    loopNoise('brown', out, { freq: 380, gain: 0.16 });
    murmur(out, 0.03)(st);
    every(st, 4, 12, t => bird(out, t));
    hooves(out, ctx.currentTime + 2); every(st, 16, 30, t => hooves(out, t));
  },
  // 钟摆、台球碰撞、低声交谈
  'cafe-night'(out, st) {
    loopNoise('brown', out, { freq: 200, gain: 0.1 });
    murmur(out, 0.06)(st);
    let tick = 0;
    const step = () => { st.timers.push(setTimeout(() => { if (!st.on) return; const t = ctx.currentTime + 0.02;
      burst(out, t, { type: 'bandpass', freq: tick++ % 2 ? 1100 : 1500, q: 6, vol: 0.12, dur: 0.025, p: 0.55 }); step(); }, 1000)); };
    step();
    every(st, 4, 11, t => billiard(out, t));
  },
  // 人声、杯子碰撞
  terrace(out, st) {
    loopNoise('brown', out, { freq: 300, gain: 0.1 });
    murmur(out, 0.1)(st);
    every(st, 1.5, 5, t => clink(out, t));
  },
  // 河水轻拍岸边
  river(out, st) {
    loopNoise('brown', out, { freq: 350, gain: 0.12 });
    lap(out, ctx.currentTime + 0.2); every(st, 1.4, 3.2, t => lap(out, t));
  },
  // 夏日蜜蜂声
  bees(out, st) {
    loopNoise('brown', out, { freq: 300, gain: 0.06 });
    bee(out, ctx.currentTime + 0.2); every(st, 1.5, 4, t => bee(out, t));
  },
  // 风声、蝉鸣；风声跟着“起风了”变强
  'wind-cicadas'(out, st, opts) {
    const w = loopNoise('brown', out, { freq: 420, gain: 0.25 });
    if (opts.wind) st.timers.push(setInterval(() => {
      const k = opts.wind(), t = ctx.currentTime;
      w.g.gain.setTargetAtTime(0.25 + 0.55 * k, t, 0.3); w.f.frequency.setTargetAtTime(420 + 700 * k, t, 0.3);
    }, 150));
    cicadas(out, ctx.currentTime + 0.5); every(st, 3, 9, t => cicadas(out, t));
  }
};
// 以前的写法（"birds"、"wind"）也能用
const ALIAS = { birds: 'room-birds', wind: 'wind-cicadas' };

// ambBtn / musBtn：两个开关；info：放音乐时显示曲名的地方；wind()：“起风了”现在多强（0–1）
export function setupSound(S, { ambBtn, musBtn, info, wind = null }) {
  const name = S.ambience !== undefined ? S.ambience : S.sound;   // 以前叫 sound，也能用
  const kind = ALIAS[name] || name, make = AMBIENCE[kind];
  const M = S.music && S.music.src ? S.music : null;
  let ambOn = false, ambGain = null, guiding = false, musicWanted = false;
  const st = { on: false, timers: [] };
  const level = () => guiding ? 0.15 : 0.7;

  // ---------- 环境音 ----------
  const ambLabel = () => { ambBtn.innerHTML = (ambOn ? '🔊 ' : '🔇 ') + ui('环境音', 'Ambience'); ambBtn.classList.toggle('on', ambOn); ambBtn.setAttribute('aria-pressed', ambOn); };
  function setAmb(on) {
    ambOn = on; ambLabel();
    if (on) {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume();
      ambGain = ctx.createGain(); ambGain.gain.value = 0; ambGain.connect(ctx.destination);
      st.on = true; st.timers = [];
      make(ambGain, st, { wind });
      ambGain.gain.setTargetAtTime(level(), ctx.currentTime, 0.5);
    } else if (ambGain) {
      st.on = false; st.timers.forEach(clearTimeout); st.timers.forEach(clearInterval); st.timers = [];
      const g = ambGain; ambGain = null;
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
      setTimeout(() => g.disconnect(), 1500);   // 淡出后拆掉（里面一直响着的声音也一起停）
    }
  }
  if (make) { ambBtn.classList.remove('hidden'); ambBtn.onclick = () => setAmb(!ambOn); ambLabel(); }
  else ambBtn.classList.add('hidden');

  // ---------- 音乐 ----------
  let audio = null;
  const musLabel = () => {
    const on = audio && !audio.paused;
    musBtn.innerHTML = (musicWanted ? '♪ ' : '♪̸ ') + ui('音乐', 'Music'); musBtn.classList.toggle('on', musicWanted); musBtn.setAttribute('aria-pressed', musicWanted);
    info.classList.toggle('hidden', !on);
  };
  const credit = () => {   // 萨蒂《裸体歌舞第一号》· 演奏：××（CC0）
    const zh = `${M.title.zh} · 演奏：${M.performer.zh}${M.license ? `（${M.license}）` : ''}`;
    const en = `${M.title.en} · Performed by ${M.performer.en}${M.license ? ` (${M.license})` : ''}`;
    info.innerHTML = `♪ ${bi({ zh, en }, ' / ')}${M.page ? ` <a href="${M.page}" target="_blank" rel="noopener">${ui('来源', 'Source')} ↗</a>` : ''}`;
  };
  function playMusic() { if (!audio) { audio = new Audio(M.src); audio.loop = true; audio.volume = 0.6; audio.onplay = audio.onpause = musLabel; } if (!guiding) audio.play(); }
  if (M) {
    musBtn.classList.remove('hidden'); credit();
    musBtn.onclick = () => { musicWanted = !musicWanted; musicWanted ? playMusic() : audio && audio.pause(); musLabel(); };
    musLabel(); onLang(credit);
  } else { musBtn.classList.add('hidden'); info.classList.add('hidden'); }

  document.addEventListener('visibilitychange', () => { if (ctx && ambOn) document.hidden ? ctx.suspend() : ctx.resume(); });
  onLang(() => { if (make) ambLabel(); if (M) musLabel(); });

  // 语音导览开始 / 停下时调用：环境音调小，音乐暂停；导览停了，音乐接着放
  return {
    guide(on) {
      guiding = on;
      if (ambGain) ambGain.gain.setTargetAtTime(level(), ctx.currentTime, 0.4);
      if (audio && musicWanted) on ? audio.pause() : audio.play();
    }
  };
}
