#!/usr/bin/env python3
# =====================================================================
# 走进名画 · 一幅画的验收检查（按 quality-standards.md 第 4、5、9 节）
#
# 用法：
#   python3 tools/verify_artwork.py <场景id>              静态检查（数据、双语、来源、图片、HTML）
#   python3 tools/verify_artwork.py <场景id> --browser    再加浏览器检查：三种尺寸截图、控制台报错、
#                                                          横向滚动、卡片、独家发现、axe（见 verify_artwork_browser.js）
#   python3 tools/verify_artwork.py <场景id> --browser --lighthouse   再加 Lighthouse（手机）
#   python3 tools/verify_artwork.py --all --report-only   全站老场景：只出报告，不算失败
#
# 结果分四种：PASS 通过 · FAIL 必过项（HARD）没通过 · WARN 可选项（SOFT）没通过，要写进交付报告 ·
#             HUMAN 脚本没法判断，需要人看（事实是否准确、图片是否真的是 PD-Art、画面效果）。
# 有 FAIL 时退出码是 1（--report-only 时总是 0）。报告写进 verify-reports/<场景id>/（不上传到仓库）。
#
# 老场景（登记表里 added 早于 LEGACY_BEFORE）的三条已知例外：卡片 6–7 张（I2）、图片超过 500KB（P1）、
# 轻量版没有加载进度（I4）
# 只算 WARN。这是 Tia 2026-11-22 同意的（新画严格按规范）。
# 只用 Python 自带的库；浏览器检查用电脑上已有的 Playwright（node），axe 和 Lighthouse 由
# tools/verify_setup.sh 装到仓库外面的缓存文件夹，不加进仓库依赖。
# =====================================================================
import argparse, datetime, json, os, re, subprocess, sys, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEGACY_BEFORE = '2026-11-22'
MAX_IMAGE_KB = 500
VARIANTS = ('interior', 'outdoor', 'still-life', 'portrait')
# 2.4 允许的图片来源网站（新加网站要 Tia 同意）
IMAGE_ALLOW = ('commons.wikimedia.org', 'upload.wikimedia.org', 'artic.edu', 'metmuseum.org', 'nga.gov', 'rijksmuseum.nl')
IMAGE_ALLOW_README = ('getty.edu',)   # README 允许、规范没写：WARN，请 Tia 决定
# 2.4 禁止的下载来源（只管图片：作品页链接到这些博物馆是可以的）
FORBIDDEN = ('nationalgallery.org.uk', 'courtauld.ac.uk', 'khm.at', 'mauritshuis.nl', 'vangoghmuseum.nl', 'vangoghmuseum',
             'musee-orsay.fr', 'photo.rmn.fr', 'rmn.fr', 'artsandculture.google.com', 'artuk.org', 'bridgemanimages',
             'christies.com', 'tate.org.uk')
IMAGE_EXT = re.compile(r'\.(jpe?g|png|webp|gif|tiff?)\b', re.I)
# P2：已知的外部服务（Tia 2026-11-22：英文字体以后放进仓库；统计脚本加载失败不影响页面）→ 只算 WARN
KNOWN_EXTERNAL = ('fonts.googleapis.com', 'fonts.gstatic.com', 'gc.zgo.at', 'walkintopaintings.goatcounter.com')
SELF = ('walkintopaintings.com',)
SCENE_KEYS = ('id', 'variant', 'painting', 'label', 'record', 'cards', 'ending', 'exclusive', 'ambience', 'lighting',
              'links', 'sources', 'imageSource', 'lastVerified')
REGISTRY_KEYS = ('id', 'status', 'title', 'artist', 'year', 'museum', 'version', 'themes', 'moods',
                 'period', 'path', 'cover', 'artworkUrl', 'added')


class Report:
    def __init__(self, sid):
        self.sid, self.rows = sid, []

    def add(self, result, rule, msg):
        self.rows.append({'result': result, 'rule': rule, 'msg': msg})

    def ok(self, rule, msg): self.add('PASS', rule, msg)
    def fail(self, rule, msg): self.add('FAIL', rule, msg)
    def warn(self, rule, msg): self.add('WARN', rule, msg)
    def human(self, rule, msg): self.add('HUMAN', rule, msg)

    def failed(self): return [r for r in self.rows if r['result'] == 'FAIL']

    def text(self):
        order = {'FAIL': 0, 'WARN': 1, 'HUMAN': 2, 'PASS': 3}
        lines = [f'== {self.sid}']
        for r in sorted(self.rows, key=lambda r: (order[r['result']], r['rule'])):
            lines.append(f"  {r['result']:<5} {r['rule']:<4} {r['msg']}")
        n = {k: sum(1 for r in self.rows if r['result'] == k) for k in order}
        lines.append(f"  合计：FAIL {n['FAIL']} · WARN {n['WARN']} · HUMAN {n['HUMAN']} · PASS {n['PASS']}")
        return '\n'.join(lines)


def host(url):
    try: return (urllib.parse.urlparse(url).hostname or '').lower()
    except ValueError: return ''


def host_in(h, domains): return any(h == d or h.endswith('.' + d) for d in domains)


def walk_bilingual(o, path, out):
    """每个有 zh 或 en 的对象：两种语言都要有、都不能是空的（L1）。以 _ 开头的是说明，不检查。"""
    if isinstance(o, dict):
        if ('zh' in o or 'en' in o) and not path.endswith('audioGuide'):   # audioGuide 的 zh / en 是录音文件名，不是文字
            empty = [k for k in ('zh', 'en') if not isinstance(o.get(k), str) or not o.get(k).strip()]
            if len(empty) == 1: out.append(f'{path}.{empty[0]}')   # 只有一种语言：缺另一种
            elif len(empty) == 2 and '.record.' in path: out.append(f'{path}（两种语言都空着）')   # 作品档案空着：要在报告里标出来
        for k, v in o.items():
            if not str(k).startswith('_') and k not in ('zh', 'en'): walk_bilingual(v, f'{path}.{k}', out)
    elif isinstance(o, list):
        for i, v in enumerate(o): walk_bilingual(v, f'{path}[{i}]', out)
    return out


def sentences(t):
    t = re.sub(r'“[^”]*”|"[^"]*"', '“”', t or '')   # 引文里的句号不算
    return len([s for s in re.split(r'[。！？!?]|(?<=[a-z\)])\.(?=\s|$)', t) if s.strip()])


def parse_day(s):
    m = re.match(r'(\d{4})-(\d{2})(?:-(\d{2}))?', str(s or ''))
    return datetime.date(int(m[1]), int(m[2]), int(m[3] or 1)) if m else None


def check_static(sid, root, report, today=None):
    today = today or datetime.date.today()
    R = json.load(open(os.path.join(root, 'data/scenes.json'), encoding='utf-8'))
    meta = next((s for s in R['scenes'] if s['id'] == sid), None)
    if not meta: report.fail('2.2', f'{sid} 不在登记表 data/scenes.json 里'); return None
    path = os.path.join(root, meta.get('path') or f'scenes/{sid}/', 'scene.json')
    if not os.path.exists(path): report.fail('2.2', f'没有 {os.path.relpath(path, root)}'); return None
    S = json.load(open(path, encoding='utf-8'))
    legacy = (meta.get('added') or '0') < LEGACY_BEFORE
    sdir = os.path.dirname(path)

    # ---- 2.2 / I1：数据格式 ----
    miss = [k for k in REGISTRY_KEYS if not meta.get(k)]
    report.fail('2.2', f'登记表缺少 {", ".join(miss)}') if miss else report.ok('2.2', '登记表字段齐全')
    miss = [k for k in SCENE_KEYS if k not in S and not (k == 'exclusive' and S.get('compare'))]   # 独家发现也可以写成 compare
    report.fail('I1', f'scene.json 缺少 {", ".join(miss)}') if miss else report.ok('I1', 'scene.json 骨架字段齐全')
    if S.get('variant') not in VARIANTS: report.fail('I1', f"variant 是 {S.get('variant')!r}，要写 {' / '.join(VARIANTS)}")
    if S.get('id') != sid: report.fail('I1', f"scene.json 的 id 是 {S.get('id')!r}，和登记表 {sid!r} 不一样")
    acts = len((S.get('ending') or {}).get('acts') or [])
    report.ok('I1', '故事三段') if acts == 3 else report.fail('I1', f'故事 {acts} 段，要 3 段')
    if not (S.get('ending') or {}).get('final'): report.fail('2.2', '缺少最后一屏 ending.final')
    if (S.get('ending') or {}).get('museums') is None and not meta.get('museum'): report.fail('G5', '结尾没有“去现场看真迹”的博物馆')
    # 模板检查（check_scenes.py）：独家发现重复、环境音、光线、衔接是否一致
    sys.path.insert(0, os.path.join(root, 'tools'))
    try:
        import check_scenes
        check_scenes.ROOT = root
        _, problems = check_scenes.check()
        mine = [p for p in problems if p.startswith(sid + ':')]
        for p in mine: report.fail('I1', '模板检查：' + p.split(':', 1)[1].strip())
        if not mine: report.ok('I1', '模板检查（独家发现、环境音、光线、衔接）通过')
    except Exception as e:   # noqa: BLE001
        report.warn('I1', f'模板检查没能运行：{e}')

    # ---- I2：卡片 ----
    cards = S.get('cards') or {}
    if len(cards) == 6: report.ok('I2', '6 张发现卡片')
    elif legacy and 6 <= len(cards) <= 7: report.warn('I2', f'{len(cards)} 张卡片（老场景的已知例外，新画要 6 张）')
    else: report.fail('I2', f'{len(cards)} 张卡片，要正好 6 张')
    spots = S.get('spots')
    if isinstance(spots, dict):
        extra = sorted(set(spots) - set(cards))
        if extra: report.fail('I2', f'spots 里有没有卡片的热点：{", ".join(extra)}')
        lost = sorted(set(cards) - set(spots))
        if lost: report.fail('I2', f'这些卡片在画上没有热点：{", ".join(lost)}')
        bad = [k for k, s in spots.items() if not (0 <= s.get('x', -1) <= 1 and 0 <= s.get('y', -1) <= 1)]
        if bad: report.fail('I2', f'热点坐标不在 0–1 之间：{", ".join(bad)}')

    # ---- L1 双语 · L3 长度 ----
    missing = walk_bilingual({k: v for k, v in S.items() if not k.startswith('_')}, 'scene', [])
    missing += walk_bilingual({k: meta.get(k) for k in ('title', 'year') if isinstance(meta.get(k), dict)}, 'registry', [])
    blank = [m.split('（')[0] for m in missing if m.endswith('（两种语言都空着）')]
    missing = [m for m in missing if not m.endswith('（两种语言都空着）')]
    if missing: report.fail('L1', f'{len(missing)} 处缺中文或英文：' + '、'.join(missing[:8]) + (' …' if len(missing) > 8 else ''))
    else: report.ok('L1', '所有文字都有中文和英文')
    if blank: report.warn('2.2', '作品档案这些栏空着（官网没有就留空，但要在报告里说明）：' + '、'.join(blank))
    lt = ((S.get('label') or {}).get('title') or {}).get('zh')
    if lt and (meta.get('title') or {}).get('zh') and lt != meta['title']['zh']:
        report.warn('A2', f"展签画名“{lt}”和登记表“{meta['title']['zh']}”不一样（可能是故意写的全名，请确认）")
    long = [f'{k}({lang})' for k, c in cards.items() for lang in ('zh', 'en') if sentences((c.get('text') or {}).get(lang)) > 2]
    report.warn('L3', '卡片超过两句：' + '、'.join(long)) if long else report.ok('L3', '每张卡片 1–2 句')

    # ---- A1 来源 · A2 官网 ----
    src = [x for x in (S.get('sources') or []) if isinstance(x, dict) and x.get('url')]
    official = meta.get('artworkUrl') or ''
    if not src: report.fail('A1', 'sources 是空的：每条事实都要有出处')
    elif not any(host(x['url']) == host(official) for x in src) and host((S.get('record') or {}).get('url', '')) != host(official):
        report.fail('A1', f'sources 里没有收藏博物馆官网（{host(official) or "登记表没有 artworkUrl"}）')
    else: report.ok('A1', f'{len(src)} 条来源，包括收藏博物馆官网')
    if (S.get('record') or {}).get('url') and official and S['record']['url'] != official:
        report.warn('A2', '作品档案的网址和登记表的 artworkUrl 不一样')
    report.human('A1', '每句事实是否真的出自所列来源：要人对照（或第二个 AI 复核，5.2）')
    report.human('A2', '画名、年份、材质、尺寸、收藏方是否和官网完全一致：要人对照官网')
    report.human('A4', '解读性的句子是否用了“可能 / perhaps”')
    report.human('L6', '敏感话题是否克制（自伤、疾病、裸体、未成年人、酒、掠夺）')

    # ---- A5 / A7 展厅 ----
    if meta.get('room'):
        d = parse_day(meta.get('roomVerified'))
        if not meta.get('roomVerified'): report.fail('A5', '写了展厅号，但没有 roomVerified（核对日期）')
        elif d and (today - d).days > 90: report.warn('A7', f'展厅信息 {meta["roomVerified"]} 核对，已超过 90 天，推广前要重新核对')
        else: report.ok('A5', f'展厅号有核对日期（{meta["roomVerified"]}）')
    else: report.ok('A5', '没有写展厅号')

    # ---- C1–C3 图片来源 · P1 大小 ----
    IS = S.get('imageSource') or {}
    files = {f.get('file'): f for f in IS.get('files', []) if isinstance(f, dict)}
    img_dir = os.path.join(sdir, 'images')
    on_disk = []
    for r, _, fs in os.walk(img_dir):
        on_disk += [os.path.relpath(os.path.join(r, f), img_dir) for f in fs if f != 'README.md']
    for f in sorted(on_disk):
        x = files.get(f)
        if not x: report.fail('C2', f'images/{f} 没有来源记录（imageSource.files）'); continue
        miss = [k for k in ('from', 'url', 'license', 'status', 'verified') if k not in x]
        if miss: report.fail('C2', f'images/{f} 的来源记录缺少 {", ".join(miss)}')
        if not str(x.get('status', '')).startswith('符合'): report.fail('C1', f'images/{f} 的版权状态是“{x.get("status")}”，要“符合”')
        h = host(x.get('url', ''))
        derived = not x.get('url') and str(x.get('license', '')).startswith('同')   # 从原画裁出的小图：授权同原画
        if derived: pass
        elif host_in(h, IMAGE_ALLOW): pass
        elif host_in(h, IMAGE_ALLOW_README): report.warn('C1', f'images/{f} 来自 {h}：README 允许，规范的允许名单里没有，请 Tia 决定')
        else: report.fail('C1', f'images/{f} 的原图网址 {x.get("url") or "（空）"} 不在允许的网站里')
        kb = os.path.getsize(os.path.join(img_dir, f)) // 1024
        if kb > MAX_IMAGE_KB:
            (report.warn if legacy else report.fail)('P1', f'images/{f} 有 {kb}KB，超过 {MAX_IMAGE_KB}KB' + ('（老场景，另开 PR 压缩）' if legacy else ''))
    for f in files:
        if f and f not in on_disk: report.warn('C2', f'imageSource.files 记了 {f}，但 images/ 里没有这个文件')
    if on_disk and not any(r['rule'] in ('C1', 'C2') and r['result'] == 'FAIL' for r in report.rows):
        report.ok('C1', f'{len(on_disk)} 张图片都有来源记录，来源网站都在允许名单里')
    if not any(r['rule'] == 'P1' for r in report.rows): report.ok('P1', f'所有图片都不超过 {MAX_IMAGE_KB}KB')
    # C3：图片来源记录和图片文件名里，不能出现禁止的网站
    blob = json.dumps(IS, ensure_ascii=False).lower() + ' ' + ' '.join(on_disk).lower()
    hits = set()
    for d in FORBIDDEN:   # 禁止的网站名旁边（前后 80 个字符）出现图片文件名，就算从那里下载的图
        for m in re.finditer(re.escape(d), blob):
            if IMAGE_EXT.search(blob[max(0, m.start() - 80):m.end() + 80]): hits.add(d)
    for u in [IS.get('url', '')] + [x.get('url', '') for x in files.values()]:   # 原图网址本身在禁止的网站上
        hits.update(d for d in FORBIDDEN if '.' in d and host_in(host(u or ''), (d,)))
    hits = sorted(hits)
    report.fail('C3', '图片来源里出现禁止的网站：' + '、'.join(sorted(set(hits)))) if hits else report.ok('C3', '图片来源里没有禁止的网站')
    report.human('C1', '图片文件是否真的就是记录里的 Commons PD-Art / CC0 文件：要人打开原图页核对')

    # ---- X2 替代文字 ----
    alts = [('painting.alt', (S.get('painting') or {}).get('alt'))]
    alts += [(f'ending.acts[{i}].alt', a.get('alt')) for i, a in enumerate((S.get('ending') or {}).get('acts') or []) if a.get('image')]
    bad = [n for n, a in alts if not (isinstance(a, dict) and a.get('zh') and a.get('en'))]
    report.fail('X2', '缺中英文替代文字：' + '、'.join(bad)) if bad else report.ok('X2', f'{len(alts)} 处原画图片都有中英文替代文字')

    # ---- L7 示意 ----
    X = S.get('exclusive') or {}
    marked = '这是示意' in json.dumps(X, ensure_ascii=False)
    report.human('L7', f'独家发现（{X.get("type")}）' + ('已标“这是示意”' if marked else '没有标“这是示意”') + '：它有没有改变原画外观，要人判断')

    # ---- 静态 HTML · M4 · P2 ----
    html_path = os.path.join(sdir, 'index.html')
    if not os.path.exists(html_path): report.fail('I1', '没有生成静态页面 index.html（运行 tools/build.py）')
    else:
        H = open(html_path, encoding='utf-8').read()
        names = [(meta.get('title') or {}).get('zh'), ((S.get('label') or {}).get('title') or {}).get('zh')]
        report.ok('I1', '静态页面已生成，含画名') if any(t and t in H for t in names) else report.fail('I1', '静态页面里没有画名：重新运行 tools/build.py')
        vp = re.search(r'<meta name="viewport" content="([^"]*)"', H)
        if not vp: report.fail('M4', '没有 viewport 设置')
        elif re.search(r'maximum-scale|user-scalable\s*=\s*no', vp[1]): report.fail('M4', f'viewport 禁止缩放：{vp[1]}')
        else: report.ok('M4', 'viewport 没有禁止缩放')
        ext = sorted({host(u) for u in re.findall(r'(?:src|href)="((?:https?:)?//[^"]+)"', H)} - {''})
        ext = [h for h in ext if not host_in(h, SELF)]
        loads = re.findall(r'<(?:script|link)[^>]+(?:src|href)="((?:https?:)?//[^"]+)"', H)
        load_hosts = sorted({host(u) for u in loads} - {''})
        unknown = [h for h in load_hosts if not host_in(h, KNOWN_EXTERNAL) and not host_in(h, SELF)]
        if unknown: report.fail('P2', '页面加载了外部资源：' + '、'.join(unknown))
        known = [h for h in load_hosts if host_in(h, KNOWN_EXTERNAL)]
        if known: report.warn('P2', '已知的外部服务（字体、统计；Tia 已同意以后把英文字体放进仓库）：' + '、'.join(known))
        if not unknown and not known: report.ok('P2', '没有外部 CDN')
    report.human('V3', '中英文字体在真机上是否正确（宋体 / EB Garamond）：看截图或真机')
    return {'meta': meta, 'scene': S, 'legacy': legacy}


def check_links(info, report, timeout=10):
    """外部链接：作品页和来源能不能打开（200）。网络受限时只算 WARN。"""
    import urllib.request
    urls = [info['meta'].get('artworkUrl')] + [x.get('url') for x in info['scene'].get('sources') or [] if isinstance(x, dict)]
    for u in dict.fromkeys(u for u in urls if u and u.startswith('http')):
        try:
            req = urllib.request.Request(u, method='GET', headers={'User-Agent': 'WalkIntoPaintings-verify/1.0'})
            with urllib.request.urlopen(req, timeout=timeout) as r: code = r.status
            report.ok('A2', f'{u} → {code}') if code == 200 else report.warn('A2', f'{u} → {code}')
        except Exception as e:   # noqa: BLE001
            msg = str(getattr(e, 'code', '') or e)[:80]
            (report.fail if getattr(e, 'code', 0) == 404 else report.warn)('A2', f'{u} 打不开：{msg}')


def run_browser(sid, out, report, lighthouse, legacy=False):
    js = os.path.join(ROOT, 'tools', 'verify_artwork_browser.js')
    cmd = ['node', js, sid, '--out', out] + (['--lighthouse'] if lighthouse else [])
    try:
        p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=900)
    except (OSError, subprocess.TimeoutExpired) as e:
        report.warn('M1', f'浏览器检查没能运行：{e}'); return
    try: rows = json.loads(p.stdout.strip().splitlines()[-1])
    except (ValueError, IndexError):
        report.warn('M1', '浏览器检查没有返回结果：' + (p.stderr or p.stdout)[-300:]); return
    for r in rows:
        res = r['result']
        if legacy and res == 'FAIL' and r['rule'] == 'I4':   # 老的轻量版场景还没有加载进度：已同意另开 PR 补，先算 WARN
            res = 'WARN'
        report.add(res, r['rule'], r['msg'])


def main(argv=None):
    ap = argparse.ArgumentParser(description='走进名画 · 一幅画的验收检查')
    ap.add_argument('ids', nargs='*', help='场景 id，比如 painter-of-sunflowers')
    ap.add_argument('--all', action='store_true', help='检查所有已上线场景')
    ap.add_argument('--root', default=ROOT, help=argparse.SUPPRESS)
    ap.add_argument('--browser', action='store_true', help='加上浏览器检查（截图、控制台、axe）')
    ap.add_argument('--lighthouse', action='store_true', help='加上 Lighthouse（需要 --browser）')
    ap.add_argument('--links', action='store_true', help='检查外部链接能不能打开')
    ap.add_argument('--report-only', action='store_true', help='只出报告，有 FAIL 也返回 0')
    ap.add_argument('--out', default=None, help='报告和截图放在哪里（默认 verify-reports/<id>/）')
    ap.add_argument('--today', default=None, help=argparse.SUPPRESS)
    a = ap.parse_args(argv)
    root = os.path.abspath(a.root)
    R = json.load(open(os.path.join(root, 'data/scenes.json'), encoding='utf-8'))
    ids = [s['id'] for s in R['scenes'] if s['status'] == 'live'] if a.all else a.ids
    if not ids: ap.error('写一个场景 id，或者用 --all')
    today = datetime.date.fromisoformat(a.today) if a.today else None
    any_fail = False
    for sid in ids:
        rep = Report(sid)
        info = check_static(sid, root, rep, today)
        out = a.out or os.path.join(root, 'verify-reports', sid)
        if info and a.links: check_links(info, rep)
        if info and a.browser:
            os.makedirs(out, exist_ok=True); run_browser(sid, out, rep, a.lighthouse, info['legacy'])
        txt = rep.text(); print(txt)
        if a.browser or a.out:
            os.makedirs(out, exist_ok=True)
            open(os.path.join(out, 'report.txt'), 'w', encoding='utf-8').write(txt + '\n')
            json.dump(rep.rows, open(os.path.join(out, 'report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        any_fail = any_fail or bool(rep.failed())
    return 0 if a.report_only or not any_fail else 1


if __name__ == '__main__':
    sys.exit(main())
