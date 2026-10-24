#!/usr/bin/env python3
# =====================================================================
# 走进名画 · 检查场景是否符合模板（一个骨架，四种变体）
#
# 用法：python3 tools/check_scenes.py      （tools/build.py 每次也会自动运行它）
# 只提醒，不会改任何文件；有问题时列出来，方便上线前核对。
# 规则和 assets/variants.js 一致：
#   interior / outdoor：完整版（3D 走动），卡片 5–7 个，有画家视角，三幕故事
#   still-life / portrait：轻量版（分层景深），卡片 3–6 个，一段短故事（三段）
# 每个场景还必须有：exclusive（独家发现，不能和别的场景重复）、ambience（环境音）、
# lighting（光线设定）、links（与其他场景的衔接，要和门、卡片、结尾按钮一致）。
# =====================================================================
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VARIANTS = {
    'interior':   {'engine': '3d',    'cards': (5, 7), 'acts': 3, 'viewpoint': True},
    'outdoor':    {'engine': '3d',    'cards': (5, 7), 'acts': 3, 'viewpoint': True},
    'still-life': {'engine': 'light', 'cards': (3, 6), 'acts': 3, 'viewpoint': False},
    'portrait':   {'engine': 'light', 'cards': (3, 6), 'acts': 3, 'viewpoint': False},
}


def ambience_kinds():   # assets/sound.js 里能用的环境音
    src = open(os.path.join(ROOT, 'assets/sound.js'), encoding='utf-8').read()
    block = src[src.index('const AMBIENCE = {'):src.index('const ALIAS')]
    kinds = set(re.findall(r"^\s{2}'?([a-z-]+)'?\(out", block, re.M))
    return kinds | {'birds', 'wind'}   # 以前的写法


def scene_id(link):   # {scene: ...} 或 {href: '../bedroom/'}
    if link.get('scene'): return link['scene']
    m = re.fullmatch(r'\.\./([a-z0-9-]+)/', link.get('href', ''))   # 只算“../场景名/”；链接到主题页等不算场景
    return m.group(1) if m else None


def portals(o, out):
    if isinstance(o, dict):
        if isinstance(o.get('portal'), dict): out.append(scene_id(o['portal']))
        for v in o.values(): portals(v, out)
    elif isinstance(o, list):
        for v in o: portals(v, out)
    return out


def check():
    R = json.load(open(os.path.join(ROOT, 'data/scenes.json'), encoding='utf-8'))
    ids = {s['id'] for s in R['scenes']}
    kinds = ambience_kinds()
    problems, rows, seen = [], [], {}
    uniq = lambda l: list(dict.fromkeys(x for x in l if x))
    for meta in R['scenes']:
        path = meta.get('path') and os.path.join(ROOT, meta['path'], 'scene.json')
        if not path or not os.path.exists(path): continue
        S = json.load(open(path, encoding='utf-8'))
        sid, v = meta['id'], S.get('variant')
        say = lambda msg: problems.append(f'{sid}: {msg}')
        if v not in VARIANTS:
            say(f'variant 要写 {" / ".join(VARIANTS)} 中的一个（现在是 {v!r}）'); continue
        rule = VARIANTS[v]
        engine = 'light' if S.get('kind') == 'light' or v in ('still-life', 'portrait') else '3d'
        if engine != rule['engine']: say(f'{v} 应该用 {rule["engine"]} 版，现在是 {engine}')
        n, (lo, hi) = len(S.get('cards', {})), rule['cards']
        if not lo <= n <= hi: say(f'发现卡片 {n} 个，{v} 要 {lo}–{hi} 个')
        acts = len(S.get('ending', {}).get('acts', []))
        if acts != rule['acts']: say(f'故事 {acts} 段，要 {rule["acts"]} 段')
        if rule['viewpoint'] and not S.get('viewpoint'): say('缺少画家视角 viewpoint')
        for k in ('painting', 'label', 'record'):
            if not S.get(k): say(f'缺少 {k}')
        # 独家发现：每个场景一个，不能重复
        X = S.get('exclusive') or S.get('compare')
        if not X: say('缺少独家发现 exclusive')
        else:
            key = json.dumps(X.get('label') or X.get('type'), ensure_ascii=False, sort_keys=True) + '|' + str(X.get('type'))
            if key in seen: say(f'独家发现和 {seen[key]} 重复')
            seen[key] = sid
        # 环境音、光线
        amb = S.get('ambience', S.get('sound'))
        if 'ambience' not in S: say('缺少 ambience（环境音）')
        elif amb is not None and amb not in kinds: say(f'ambience {amb!r} 不在 assets/sound.js 的 AMBIENCE 里')
        L = S.get('lighting') or {}
        if not L.get('type') or not L.get('label'): say('缺少 lighting（光线设定：type 和 label）')
        # 衔接：一览要和真正的设置一致
        links = S.get('links')
        if not isinstance(links, dict): say('缺少 links（与其他场景的衔接）')
        else:
            ex = S.get('ending', {}).get('exit') or []
            ex = [ex] if isinstance(ex, dict) else ex
            real = {'doors': uniq(portals(S.get('objects', []), []) + portals(S.get('room', {}), [])),
                    'cards': uniq(scene_id(l) for c in S['cards'].values() for l in ([c['link']] if c.get('link') else []) + c.get('links', [])),
                    'end': uniq(scene_id(x) for x in ex)}
            for k, want in real.items():
                if sorted(links.get(k, [])) != sorted(want): say(f'links.{k} 写的是 {links.get(k, [])}，实际是 {want}')
            for x in sum((links.get(k, []) for k in real), []):
                if x not in ids: say(f'links 里的 {x} 不在登记表 data/scenes.json 里')
        rows.append((sid, v, n, amb, L.get('type')))
    return rows, problems


if __name__ == '__main__':
    rows, problems = check()
    for r in rows: print('  %-22s %-11s 卡片 %d  环境音 %-13s 光线 %s' % r)
    print('\n'.join(['场景检查：有 %d 处要看一下' % len(problems)] + ['  · ' + p for p in problems]) if problems else '场景检查：全部符合模板')
