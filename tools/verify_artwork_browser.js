// =====================================================================
// 走进名画 · 浏览器验收检查（tools/verify_artwork.py --browser 会调用它，也可以单独运行）
//
// 用法：node tools/verify_artwork_browser.js <场景id> --out verify-reports/<场景id> [--lighthouse]
// 自己在仓库文件夹开一个本地网页服务器，用 Playwright 在三种尺寸打开场景页：
//   手机 390×844 · 平板 820×1180 · 电脑 1440×900（quality-standards.md M1）
// 每种尺寸：首屏截图 → 走进画里 → 截图 → 打开、关闭一张卡片 → 打开、关闭独家发现（截图）→ 故事结尾
// 检查：G1 首屏看得到完整原画 · G2 走进按钮 · G5 结尾 · I2 卡片能开关（鼠标、键盘）· I4 加载进度 ·
//       I5 手机按钮 · I6 独家发现能还原 · I7 声音不自动播放 · I8 控制台报错 · M2 横向滚动 · M3 点击区域 ·
//       X1 / X5 axe 无障碍 · P3 Lighthouse（加 --lighthouse）
// 最后一行输出 JSON 结果（[{result, rule, msg}]），截图存进 --out 文件夹。
// axe-core 和 Lighthouse 装在仓库外面（bash tools/verify_setup.sh），没装时那几项算 WARN。
// =====================================================================
const { chromium } = require('playwright');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');

const ROOT = path.resolve(__dirname, '..');
const CACHE = process.env.WIP_VERIFY_CACHE || path.join(os.homedir(), '.cache', 'walk-into-paintings-verify');
const args = process.argv.slice(2);
const sid = args[0];
const out = path.resolve(args.includes('--out') ? args[args.indexOf('--out') + 1] : path.join(ROOT, 'verify-reports', sid || 'x'));
const withLighthouse = args.includes('--lighthouse');
const rows = [];
const add = (result, rule, msg) => rows.push({ result, rule, msg });
// 不算报错的请求：外部字体、统计（网络受限时打不开）、语音导览录音的探测（没有录音时就是 404）
const IGNORE = /fonts\.googleapis|fonts\.gstatic|gc\.zgo\.at|goatcounter|\/audio\/guide-(zh|en)\.mp3/;
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'tablet', width: 820, height: 1180, isMobile: true, hasTouch: true },
  { name: 'desktop', width: 1440, height: 900, isMobile: false, hasTouch: false },
];

function freePort() {
  return new Promise(ok => { const s = http.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => ok(p)); }); });
}
async function startServer() {
  const port = await freePort();
  const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    const up = await new Promise(ok => http.get(`http://127.0.0.1:${port}/`, r => { r.resume(); ok(true); }).on('error', () => ok(false)));
    if (up) return { srv, base: `http://127.0.0.1:${port}/` };
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('本地服务器没有启动');
}
const wait = ms => new Promise(r => setTimeout(r, ms));

// 两张截图有多少像素不一样（0–1），在浏览器里用 canvas 比
async function diffRatio(page, a, b) {
  return page.evaluate(async ([a, b]) => {
    const load = src => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = 'data:image/png;base64,' + src; });
    const [A, B] = await Promise.all([load(a), load(b)]);
    const w = Math.min(A.width, B.width, 400), h = Math.round(w * A.height / A.width);
    const px = im => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(im, 0, 0, w, h); return g.getImageData(0, 0, w, h).data; };
    const pa = px(A), pb = px(B); let n = 0;
    for (let i = 0; i < pa.length; i += 4) if (Math.abs(pa[i] - pb[i]) + Math.abs(pa[i + 1] - pb[i + 1]) + Math.abs(pa[i + 2] - pb[i + 2]) > 60) n++;
    return n / (w * h);
  }, [a.toString('base64'), b.toString('base64')]);
}

async function runAxe(page, where, vp) {
  const axePath = path.join(CACHE, 'node_modules', 'axe-core', 'axe.min.js');
  if (!fs.existsSync(axePath)) { add('WARN', 'X5', `axe-core 没装（bash tools/verify_setup.sh），${vp} ${where} 没检查`); return; }
  await page.addScriptTag({ path: axePath });
  const res = await page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
    return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help, target: (v.nodes[0] && v.nodes[0].target.join(' ')) || '' }));
  });
  const contrast = res.filter(v => v.id === 'color-contrast');
  const critical = res.filter(v => v.impact === 'critical');
  const serious = res.filter(v => v.impact === 'serious' && v.id !== 'color-contrast');
  for (const v of contrast) add('FAIL', 'X1', `${vp} ${where}：文字对比度不够（${v.n} 处，例如 ${v.target}）`);
  for (const v of critical) add('FAIL', 'X5', `${vp} ${where}：axe 严重问题 ${v.id}（${v.n} 处，例如 ${v.target}）：${v.help}`);
  for (const v of serious) add('WARN', 'X5', `${vp} ${where}：axe ${v.id}（${v.n} 处，例如 ${v.target}）：${v.help}`);
  if (!contrast.length && !critical.length) add('PASS', 'X5', `${vp} ${where}：axe 没有严重问题，对比度合格`);
}

async function checkViewport(browser, base, S, vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('wip-lang', 'both'); } catch (e) {}
    // I7：记下用户点击之前有没有开始播放声音
    window.__gesture = false; window.__soundBeforeGesture = 0;
    for (const ev of ['pointerdown', 'keydown', 'touchstart']) addEventListener(ev, () => { window.__gesture = true; }, true);
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      const resume = AC.prototype.resume;
      AC.prototype.resume = function () { if (!window.__gesture) window.__soundBeforeGesture++; return resume.apply(this, arguments); };
    }
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { if (!window.__gesture) window.__soundBeforeGesture++; return play.apply(this, arguments); };
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('页面错误：' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text()) && !/Failed to load resource/.test(m.text())) errors.push('控制台：' + m.text().slice(0, 160)); });
  page.on('response', r => { const u = r.url(); if (r.status() >= 400 && u.startsWith(base) && !IGNORE.test(u)) errors.push(`${r.status()}：${u.replace(base, '/')}`); });
  page.on('requestfailed', r => { const u = r.url(); if (u.startsWith(base) && !IGNORE.test(u)) errors.push('请求失败：' + u.replace(base, '/')); });
  const shot = async name => { const f = path.join(out, `${vp.name}-${name}.png`); const b = await page.screenshot({ path: f }); return b; };
  const full3d = ['interior', 'outdoor'].includes(S.variant);
  const tag = `${vp.name} ${vp.width}×${vp.height}`;

  await page.goto(base + `scenes/${sid}/`, { waitUntil: 'networkidle' }).catch(e => errors.push('打开页面：' + e.message));
  await wait(2000);
  await shot('1-first');
  // M2 横向滚动
  const hscroll = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  hscroll > 1 ? add('FAIL', 'M2', `${tag}：页面能横向滚动（多出 ${hscroll}px）`) : add('PASS', 'M2', `${tag}：没有横向滚动`);
  // G1 首屏完整原画
  const g1 = await page.evaluate(() => {
    const im = document.getElementById('introImg'); if (!im) return { ok: false, why: '没有 #introImg' };
    const r = im.getBoundingClientRect(), fit = getComputedStyle(im).objectFit;
    const inside = r.top >= -1 && r.left >= -1 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1 && r.width > 50;
    return { ok: im.complete && im.naturalWidth > 0 && inside && fit !== 'cover', why: `位置 ${Math.round(r.top)}–${Math.round(r.bottom)} / ${innerHeight}，object-fit ${fit}` };
  });
  g1.ok ? add('PASS', 'G1', `${tag}：首屏看得到完整的原画`) : add('FAIL', 'G1', `${tag}：首屏原画不完整（${g1.why}）`);
  // G2 走进按钮
  const g2 = await page.evaluate(() => { const b = document.getElementById('enter'); if (!b) return null; const r = b.getBoundingClientRect(); return r.top + scrollY; });
  if (g2 === null) add('FAIL', 'G2', `${tag}：没有“走进画里”按钮`);
  else g2 < vp.height * 2 ? add('PASS', 'G2', `${tag}：“走进画里”按钮在两屏之内`) : add('FAIL', 'G2', `${tag}：“走进画里”按钮太靠下（${Math.round(g2)}px）`);
  if (vp.name !== 'tablet') await runAxe(page, '首屏', vp.name);

  // 走进画里；I4 加载进度
  await page.click('#enter').catch(e => errors.push('点“走进画里”：' + e.message));
  const hasProgress = await page.evaluate(() => !!document.getElementById('loadState'));
  if (full3d) hasProgress ? add('PASS', 'I4', `${tag}：有加载进度`) : add('FAIL', 'I4', `${tag}：3D 场景没有加载进度`);
  else if (vp.name === 'phone') hasProgress ? add('PASS', 'I4', '轻量版有加载进度') : add('FAIL', 'I4', '轻量版没有加载进度（规范要求；已同意另开 PR 加上）');
  await wait(full3d ? 6000 : 2500);
  await shot('2-inside');

  // I5 手机按钮
  if (vp.name === 'phone') {
    const btns = await page.evaluate(() => [...document.querySelectorAll('#tools > .btn, #tools > a.btn, #tools > button')].filter(b => b.offsetParent && getComputedStyle(b).visibility !== 'hidden').map(b => b.textContent.trim().slice(0, 12)));
    btns.length <= 3 ? add('PASS', 'I5', `手机上只显示 ${btns.length} 个按钮：${btns.join(' / ')}`) : add('WARN', 'I5', `手机上显示 ${btns.length} 个按钮：${btns.join(' / ')}（规范：返回 + 独家发现 + 更多）`);
    // M3 点击区域
    const small = await page.evaluate(() => [...document.querySelectorAll('#tools button, #tools a, .spot')].filter(b => b.offsetParent).map(b => { const r = b.getBoundingClientRect(); return { t: (b.textContent || b.getAttribute('aria-label') || b.className).trim().slice(0, 10), w: Math.round(r.width), h: Math.round(r.height) }; }).filter(x => x.w < 44 || x.h < 44));
    small.length ? add('WARN', 'M3', `手机上 ${small.length} 个按钮小于 44×44：` + small.slice(0, 5).map(x => `${x.t}(${x.w}×${x.h})`).join('、')) : add('PASS', 'M3', '手机上按钮都不小于 44×44');
  }

  // I2 卡片能开关
  const cardKeys = Object.keys(S.cards || {});
  const cardShown = () => page.evaluate(() => { const c = document.getElementById('card'); return !!c && getComputedStyle(c).display !== 'none' && c.getBoundingClientRect().width > 0; });  // 卡片是 position:fixed，不能用 offsetParent
  if (!full3d) {
    const spot = await page.$('.spot');
    if (!spot) add('FAIL', 'I2', `${tag}：画上没有卡片热点`);
    else {
      await spot.click({ force: true }).catch(() => {}); await wait(600);
      const opened = await cardShown();
      await page.click('#cardClose').catch(() => {}); await wait(400);
      const closed = !(await cardShown());
      opened && closed ? add('PASS', 'I2', `${tag}：卡片能点开、能关上`) : add('FAIL', 'I2', `${tag}：卡片${opened ? '' : '点不开'}${closed ? '' : '关不上'}`);
      if (vp.name === 'desktop') {   // 键盘：Tab 到热点按 Enter 打开，Tab 到关闭按钮按 Enter 关上
        await spot.focus(); await page.keyboard.press('Enter'); await wait(600);
        const kOpen = await cardShown();
        await page.focus('#cardClose').catch(() => {}); await page.keyboard.press('Enter'); await wait(400);
        const kClosed = !(await cardShown());
        kOpen && kClosed ? add('PASS', 'I2', '键盘能打开、关上卡片') : add('FAIL', 'I2', `键盘${kOpen ? '' : '打不开'}${kClosed ? '' : '关不上'}卡片`);
      }
    }
  } else if (cardKeys.length && vp.name === 'phone') {   // 3D：卡片挂在画里的物体上，用 ?card= 打开第一张
    const p2 = await ctx.newPage(); p2.on('pageerror', e => errors.push('页面错误：' + e.message));
    await p2.goto(base + `scenes/${sid}/?card=${cardKeys[0]}`, { waitUntil: 'networkidle' }); await wait(1500);
    await p2.click('#enter').catch(() => {});
    const shown = () => p2.evaluate(() => { const c = document.getElementById('card'); return !!c && getComputedStyle(c).display !== 'none'; });
    // 走进动画结束 1.5 秒后才打开卡片；软件渲染很慢，最多等 20 秒
    const opened = await p2.waitForFunction(() => { const c = document.getElementById('card'); return !!c && getComputedStyle(c).display !== 'none'; }, null, { timeout: 20000 }).then(() => true, () => false); await p2.click('#cardClose').catch(() => {}); await wait(400); const closed = !(await shown());
    opened && closed ? add('PASS', 'I2', '3D 场景：卡片能打开、能关上') : add('WARN', 'I2', `3D 场景：卡片${opened ? '' : '没有自动打开'}${closed ? '' : '关不上'}（要人点画里的物体确认）`);
    await p2.close();
    add('HUMAN', 'I2', '3D 场景：卡片挂在画里的物体上，键盘操作要人试');
  }

  // I6 独家发现能打开、能还原
  // 按钮文字：多数类型是 X.label；墙面褪色、淡出这类是两个选项按钮（X.options，第一个是“现在”，点最后一个打开，点第一个还原）
  const X = S.exclusive || S.compare;
  const opts = X && Array.isArray(X.options) ? X.options.filter(o => o.label && o.label.zh) : [];
  const onLabel = X && X.label && X.label.zh ? X.label.zh : opts.length > 1 ? opts[opts.length - 1].label.zh : null;
  const offLabel = !(X && X.label) && opts.length > 1 ? opts[0].label.zh : null;
  const findBtn = label => page.evaluateHandle(label => [...document.querySelectorAll('#tools button, #tools .btn, .ui button')].find(b => b.textContent.includes(label) && b.offsetParent), label);
  const findAnywhere = async label => {
    let el = (await findBtn(label)).asElement();
    if (!el) { await page.click('#moreBtn').catch(() => {}); await wait(300); el = (await findBtn(label)).asElement(); }
    return el;
  };
  if (!X) add('FAIL', 'I6', `${tag}：没有独家发现`);
  else if (!onLabel) add('HUMAN', 'I6', `${tag}：独家发现（${X.type}）没有固定的按钮文字，脚本没法点，要人试`);
  else {
    const btn = await findAnywhere(onLabel);
    if (!btn) add('FAIL', 'I6', `${tag}：找不到独家发现按钮“${onLabel}”`);
    else {
      const before = await shot('3a-before-exclusive');
      await btn.click().catch(e => errors.push('独家发现：' + e.message)); await wait(2500);
      const on = await shot('3-exclusive');
      const changed = await diffRatio(page, before, on);
      // 关掉：两个选项的点“现在”；有打开的面板就点它的关闭按钮；否则再点一次同一个按钮；最后按 Esc
      const offBtn = offLabel && await findAnywhere(offLabel);
      const closeBtn = offBtn ? null : (await page.evaluateHandle(() => [...document.querySelectorAll('.close, [aria-label="Close"], #vpClose, #zoomClose')].find(b => b.offsetParent && b.id !== 'cardClose' && getComputedStyle(b).visibility !== 'hidden'))).asElement();
      if (offBtn) await offBtn.click().catch(() => {});
      else if (closeBtn) await closeBtn.click().catch(() => {});
      else { const b2 = await findAnywhere(onLabel); if (b2) await b2.click().catch(() => {}); else await page.keyboard.press('Escape'); }
      await wait(2500);
      const after = await shot('4-after-exclusive');
      const back = await diffRatio(page, before, after);   // 和点之前那一刻比（提示、已发现计数会变）
      if (changed < 0.01) add('WARN', 'I6', `${tag}：点了独家发现，画面几乎没变（${(changed * 100).toFixed(1)}%），请看截图`);
      back < 0.05 ? add('PASS', 'I6', `${tag}：独家发现关掉后回到原样（差 ${(back * 100).toFixed(1)}%）`)
        : add('HUMAN', 'I6', `${tag}：关掉独家发现后和原来差 ${(back * 100).toFixed(1)}%（3D 场景会自己动；请对比 ${vp.name}-3a-before-exclusive.png 和 ${vp.name}-4-after-exclusive.png）`);
    }
  }

  // G5 结尾
  await page.evaluate(() => { const b = document.getElementById('endBtn'); if (b) b.click(); }); await wait(1500);
  await page.evaluate(() => { const e = document.getElementById('actEnd'); if (e) e.scrollIntoView(); }); await wait(800);
  const g5 = await page.evaluate(() => {
    const e = document.getElementById('actEnd'); if (!e) return { real: false, next: false };
    return { real: /看真迹|See it in person/.test(e.textContent), next: !!e.querySelector('.next-scene a, .end-main a, .end-actions a, .keep-exploring a') };
  });
  g5.real && g5.next ? add('PASS', 'G5', `${tag}：结尾有“去现场看真迹”和下一个场景`) : add('FAIL', 'G5', `${tag}：结尾${g5.real ? '' : '没有“看真迹”'}${g5.next ? '' : '没有下一个场景的链接'}`);
  if (vp.name === 'phone') { await shot('5-end'); await runAxe(page, '故事结尾', vp.name); }

  // I7 声音 · I8 报错
  const early = await page.evaluate(() => window.__soundBeforeGesture);
  early ? add('FAIL', 'I7', `${tag}：没点之前就开始播放声音（${early} 次）`) : add('PASS', 'I7', `${tag}：声音没有自动播放`);
  const uniq = [...new Set(errors)];
  uniq.length ? add('FAIL', 'I8', `${tag}：${uniq.length} 个报错：` + uniq.slice(0, 4).join(' | ')) : add('PASS', 'I8', `${tag}：没有控制台报错`);
  await ctx.close();
}

function lighthouse(base) {
  const cli = path.join(CACHE, 'node_modules', 'lighthouse', 'cli', 'index.js');
  if (!fs.existsSync(cli)) { add('WARN', 'P3', 'Lighthouse 没装（bash tools/verify_setup.sh），没检查'); return; }
  const json = path.join(out, 'lighthouse.json');
  const r = spawnSync('node', [cli, base + `scenes/${sid}/`, '--only-categories=performance,accessibility', '--form-factor=mobile',
    '--screenEmulation.mobile', '--output=json', '--output-path=' + json, '--quiet', '--chrome-flags=--headless=new --no-sandbox --use-gl=angle --use-angle=swiftshader'],
    { env: { ...process.env, CHROME_PATH: chromium.executablePath() }, encoding: 'utf8', timeout: 240000 });
  if (!fs.existsSync(json)) { add('WARN', 'P3', 'Lighthouse 没能运行：' + ((r.stderr || '') + (r.error ? r.error.message : '')).slice(-200)); return; }
  const L = JSON.parse(fs.readFileSync(json, 'utf8'));
  const perf = Math.round((L.categories.performance.score || 0) * 100), a11y = Math.round((L.categories.accessibility.score || 0) * 100);
  const tti = L.audits.interactive && L.audits.interactive.numericValue;
  perf >= 80 ? add('PASS', 'P3', `Lighthouse 手机性能 ${perf} 分`) : add('WARN', 'P3', `Lighthouse 手机性能 ${perf} 分（目标 80；本地服务器、模拟 4G）`);
  if (tti) tti <= 5000 ? add('PASS', 'P4', `可交互时间 ${(tti / 1000).toFixed(1)} 秒`) : add('WARN', 'P4', `可交互时间 ${(tti / 1000).toFixed(1)} 秒（目标 5 秒内）`);
  add(a11y >= 90 ? 'PASS' : 'WARN', 'X5', `Lighthouse 无障碍 ${a11y} 分`);
}

(async () => {
  if (!sid) { console.error('用法：node tools/verify_artwork_browser.js <场景id> --out <文件夹> [--lighthouse]'); process.exit(2); }
  fs.mkdirSync(out, { recursive: true });
  const S = JSON.parse(fs.readFileSync(path.join(ROOT, 'scenes', sid, 'scene.json'), 'utf8'));
  const { srv, base } = await startServer();
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  try {
    for (const vp of VIEWPORTS) {
      try { await checkViewport(browser, base, S, vp); } catch (e) { add('FAIL', 'M1', `${vp.name}：检查中断：${e.message.slice(0, 160)}`); }
    }
    add('PASS', 'M1', `三种尺寸截图在 ${path.relative(ROOT, out) || out}/`);
    add('HUMAN', 'G3', '第一次来的人能不能只看提示就找到卡片：要 1–3 个人试');
    add('HUMAN', 'X4', '“减少动画”设置下镜头会不会自己动：要人在系统里打开“减少动画”试');
    add('HUMAN', 'M6', '微信内置浏览器：要在手机微信里打开看');
    if (withLighthouse) lighthouse(base);
  } finally { await browser.close(); srv.kill(); }
  console.log(JSON.stringify(rows));
})().catch(e => { console.log(JSON.stringify([{ result: 'FAIL', rule: 'M1', msg: '浏览器检查出错：' + e.message }])); process.exit(0); });
