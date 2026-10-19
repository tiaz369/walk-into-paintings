#!/usr/bin/env python3
# =====================================================================
# 走进名画 · 生成网页文件（给搜索引擎看的文字、sitemap、404）
#
# 用法：在仓库文件夹里运行  python3 tools/build.py
# 什么时候运行：改了 data/scenes.json 或任何 scene.json 之后（Claude Code 会帮你运行）
#
# 它做的事：
#   1. 把每一页的主要文字（标题、介绍、卡片、故事）直接写进 index.html，
#      这样搜索引擎和分享预览不运行 JavaScript 也能读到。
#      （打开网页的人看到的仍然是 JavaScript 画出来的页面，这些文字会被替换掉。）
#   2. 生成 sitemap.xml、robots.txt、404.html
# 只用 Python 自带的功能，不用安装任何东西。
# =====================================================================
import json, html, os, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://tiaz369.github.io/walk-into-paintings/'
NAME = {'zh': '走进名画', 'en': 'Walk into Paintings'}
TAGLINE = {'zh': '走进世界名画的内部。', 'en': "Step inside the world's great paintings."}
FONTS = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500&family=Noto+Serif+SC:wght@400;500&display=swap'
THREE = 'assets/vendor/three.module.js'   # three.js 0.160.0，放在自己的仓库里（不依赖外部 CDN，中国大陆也能打开）

R = json.load(open(os.path.join(ROOT, 'data/scenes.json'), encoding='utf-8'))
R['scenes'] = [s for s in R['scenes'] if s['status'] != 'planned']   # 计划中的作品：暂不在页面显示
by = lambda k: {x['id']: x for x in R[k]}
ARTISTS, MUSEUMS, COLS, THEMES, PERIODS, PLACES, SCENES = by('artists'), by('museums'), by('collections'), by('themes'), by('periods'), by('places'), by('scenes')
SOON_MAX = 3   # 画家页、博物馆页最多列几个即将开放的作品
LIVE = [s for s in R['scenes'] if s['status'] == 'live']
BUILT = [s for s in R['scenes'] if s.get('path') and os.path.exists(os.path.join(ROOT, s['path'], 'scene.json'))]   # 有文件夹的场景（包括还没上线的）
SCENE_DATA = {s['id']: json.load(open(os.path.join(ROOT, s['path'], 'scene.json'), encoding='utf-8')) for s in BUILT}

e = lambda t: html.escape(str(t or ''), quote=True)
def t(o, lang='zh'):
    if o is None: return ''
    if isinstance(o, str): return o
    return o.get(lang) or o.get('zh' if lang == 'en' else 'en') or ''
def both(o, sep=' · '):   # 纯文字：中文 · English
    if isinstance(o, str) or o is None: return t(o)
    zh, en = o.get('zh', ''), o.get('en', '')
    return f'{zh}{sep}{en}' if zh and en and zh != en else (zh or en)
def bi(o, tag='span', cls=''):   # 双语 HTML，各自标上语言
    if isinstance(o, str) or o is None: return e(t(o))
    c = f' class="{cls}"' if cls else ''
    zh, en = o.get('zh', ''), o.get('en', '')
    out = f'<{tag} lang="zh-CN"{c}>{e(zh)}</{tag}>' if zh else ''
    if en and en != zh: out += f' <{tag} lang="en"{c}>{e(en)}</{tag}>'
    return out

def scene_line(s, hide=(), title=None, year=None):   # hide：这一页已经写了的画家 / 博物馆，不再重复
    a, m = ARTISTS.get(s['artist']), MUSEUMS.get(s['museum'])
    if hide:   # 画家页 / 博物馆页：作品名 · 年份 · 收藏地或画家
        return ' · '.join(x for x in [both(title or s['title']), both(year or s['year']), 'artist' not in hide and a and both(a['name']), 'museum' not in hide and m and both(m['name'])] if x)
    return ' · '.join(x for x in [both(title or s['title']), a and both(a['name']), both(year or s['year']), m and both(m['name'])] if x)
def scene_li(s, up, hide=(), title=None, url=None, year=None):
    work = f' · <a href="{e(url)}">官网作品页 · Museum page</a>' if url else ''
    if s['status'] == 'live': return f'<li><a href="{up}{s["path"]}">{e(scene_line(s, hide, title, year))}</a>{work}</li>'
    return f'<li>{e(scene_line(s, hide, title, year))} — 即将开放 / Coming soon{work}</li>'
def scene_list(lst, up, hide=()): return '<ul>' + ''.join(scene_li(s, up, hide) for s in lst) + '</ul>' if lst else '<p>即将开放 / Coming soon</p>'
def cap_soon(lst, key=lambda x: x):   # 已开放的都列出；即将开放的最多 SOON_MAX 个
    n, out = 0, []
    for x in lst:
        if key(x)['status'] == 'live': out.append(x)
        elif n < SOON_MAX: out.append(x); n += 1
    return out
def museum_items(mid):   # 收藏在这里的场景 + 收藏在这里的其他版本
    own = [(s, None, s.get('artworkUrl'), None) for s in R['scenes'] if s['museum'] == mid]
    also = [(s, v['title'], v.get('artworkUrl'), v.get('year')) for s in R['scenes'] for v in s.get('alsoAt', []) if v['museum'] == mid]
    return sorted(own + also, key=lambda x: x[0]['status'] != 'live')
def of(key, id_): return [s for s in R['scenes'] if (id_ in s[key] if isinstance(s.get(key), list) else s.get(key) == id_)]

ABOUT = json.load(open(os.path.join(ROOT, 'data/about.json'), encoding='utf-8'))
def para(p):
    out = ''
    for lang, code in (('zh', 'zh-CN'), ('en', 'en')):
        lab = f'<strong>{e(p["label"][lang])}</strong>' if p.get('label') else ''
        out += f'<p lang="{code}">{lab}{e(p[lang])}</p>'
    return out
CREDIT = ('<p><span lang="zh-CN">创意、故事与文字：<a href="https://tiaz369.github.io">Tia</a> · 使用 Claude 制作</span><br>'
          '<span lang="en">Concept, stories and texts by <a href="https://tiaz369.github.io">Tia</a> · Built with Claude</span></p>')
NAV = [('', '首页', 'Home'), ('artists/', '画家', 'Artists'), ('themes/', '主题', 'Themes'), ('periods/', '时期', 'Periods'),
       ('map/', '地图', 'Map'), ('museums/', '博物馆', 'Museums'), ('about/', '关于', 'About')]
def nav(up): return '<nav>' + ' · '.join(f'<a href="{up}{p}">{zh} {en}</a>' for p, zh, en in NAV) + '</nav>'

# ---------- 页面外壳 ----------
def head(path, title, desc, image, image_alt, up, scene=False):
    url = SITE + path
    img = SITE + image
    return f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0{', maximum-scale=1.0, user-scalable=no' if scene else ''}" />
  <title>{e(title)}</title>
  <meta name="description" content="{e(desc)}" />
  <link rel="canonical" href="{url}" />
  <link rel="icon" href="{up}favicon.svg" type="image/svg+xml" />
  <!-- 社交分享预览（爬虫不运行 JavaScript，所以写在这里） -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="走进名画 · Walk into Paintings" />
  <meta property="og:locale" content="zh_CN" />
  <meta property="og:locale:alternate" content="en_GB" />
  <meta property="og:url" content="{url}" />
  <meta property="og:title" content="{e(title)}" />
  <meta property="og:description" content="{e(desc)}" />
  <meta property="og:image" content="{img}" />
  <meta property="og:image:alt" content="{e(image_alt)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{e(title)}" />
  <meta name="twitter:description" content="{e(desc)}" />
  <meta name="twitter:image" content="{img}" />
  <meta name="twitter:image:alt" content="{e(image_alt)}" />
  <script>document.documentElement.classList.add('js')</script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <!-- 字体：不挡住网页显示（谷歌字体打不开时，直接用系统字体） -->
  <link rel="stylesheet" href="{FONTS}" media="print" onload="this.media='all'" />
  <noscript><link rel="stylesheet" href="{FONTS}" /></noscript>
  <link rel="stylesheet" href="{up}assets/style.css" />{f"""
  <script type="importmap">
    {{ "imports": {{ "three": "{up}{THREE}" }} }}
  </script>""" if scene else ''}
</head>
'''
def page(path, title, desc, static, script, image='scenes/bedroom/images/v1888.jpg', image_alt='梵高《阿尔勒的卧室》1888 · Vincent van Gogh, The Bedroom, 1888', scene=False, up=None, noindex=False):
    if up is None: up = '../' * path.count('/')
    body = f'''<body class="lang-both">
  <!-- ↓ 自动生成（tools/build.py）：给搜索引擎看的文字。打开网页时会被 JavaScript 画出来的页面替换。不要手动改这一段。 -->
  <div id="static" class="static">
    <header><a href="{up or './'}">走进名画 · Walk into Paintings</a> {nav(up)}</header>
    <main>
{static}
    </main>
    <footer>{CREDIT}</footer>
  </div>
  <!-- ↑ 自动生成结束 -->
  <script type="module">
{script}
  </script>
  <noscript><p style="padding:20px">走进名画需要开启 JavaScript 才能走进画里。Walk into Paintings needs JavaScript to step inside the paintings.</p></noscript>
</body>
</html>
'''
    out = os.path.join(ROOT, path, 'index.html') if not path.endswith('.html') else os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    h = head(path, title, desc, image, image_alt, up, scene)
    if noindex: h = h.replace(f'  <link rel="canonical" href="{SITE + path}" />\n', '  <meta name="robots" content="noindex" />\n')
    open(out, 'w', encoding='utf-8').write(h + body)
    return path

def site_script(up, kind, extra=''):
    return f"""    import {{ renderPage }} from '{up or './'}assets/site.js';
    renderPage('{kind}'{extra});"""

PAGES = []
T = lambda zh, en: f'{zh} · {en} — 走进名画 | Walk into Paintings'
DESC = both(TAGLINE, ' ')

# ---------- 首页 ----------
s = f'''      <h1>{bi(NAME)}</h1>
      <p>{bi(TAGLINE)}</p>
      <h2>最新开放 · Latest</h2>
      {scene_list(sorted(LIVE, key=lambda s: s.get('added', ''), reverse=True), '')}
      <h2>系列 · Collections</h2>
      {''.join(f'<h3><a href="collections/{c["id"]}/">{e(both(c["name"]))}</a></h3><p>{e(both(c["desc"]))}</p>{scene_list([SCENES[x] for x in c["order"] if x in SCENES], "")}' for c in R['collections'])}
      <h2>关于这个项目 · About this project</h2>
      {para(ABOUT['home'])}
      <p><a href="about/">关于 · About</a></p>'''
PAGES.append(page('', '走进名画 · Walk into Paintings', DESC, s, site_script('', 'home')))

# ---------- 系列页 ----------
for c in R['collections']:
    p = f'collections/{c["id"]}/'
    lst = [SCENES[x] for x in c['order'] if x in SCENES]
    s = f'      <h1>{bi(c["name"])}</h1>\n      <p>{bi(c["desc"])}</p>\n      {scene_list(lst, "../../")}'
    PAGES.append(page(p, T(t(c['name']), t(c['name'], 'en')), f'{both(c["name"])}：{both(c["desc"])}', s, site_script('../../', 'collection', f", {{ id: '{c['id']}' }}")))

# ---------- 浏览页 ----------
def groups(items, key, up, name='name'):
    return ''.join(f'<h2 id="{x["id"]}">{e(both(x[name]))}</h2>{scene_list(of(key, x["id"]), up)}' for x in items)
def later(names): return f'<p>即将推出 · Coming soon: {" · ".join(names)}</p>' if names else ''   # 还没有作品可以显示的
def aname(a): return both(a['name']) + (f'（{both(a["dates"], " / ")}）' if a.get('dates') else '')
arts = ''.join(f'<h2 id="{a["id"]}">{e(aname(a))}</h2>' + (scene_list(cap_soon(of("artist", a["id"])), "../", ("artist",)) if of('artist', a['id']) else '<p>即将推出 · Coming soon</p>') for a in R['artists'])
PAGES.append(page('artists/', T('画家', 'Artists'), '按画家浏览 · Browse by artist', '      <h1>按画家 · By artist</h1>\n      ' + arts, site_script('../', 'artists')))
live_in = lambda tid: any(x['status'] == 'live' for x in of('themes', tid))
ths = ''.join(f'<h2 id="{x["id"]}">{e(both(x["name"]))}</h2>{scene_list(cap_soon(of("themes", x["id"])), "../")}' for x in R['themes'] if live_in(x['id']))
ths += later([e(both(x['name'])) for x in R['themes'] if not live_in(x['id'])])
PAGES.append(page('themes/', T('主题', 'Themes'), '按主题浏览 · Browse by theme', '      <h1>按主题 · By theme</h1>\n      ' + ths, site_script('../', 'themes')))
pers = ''.join(f'<h2 id="{x["id"]}">{e(both(x["name"]))}</h2>{scene_list(cap_soon(of("period", x["id"])), "../")}' for x in R['periods'])
PAGES.append(page('periods/', T('时期', 'Periods'), '按时期浏览 · Browse by period', '      <h1>按时期 · By period</h1>\n      ' + pers, site_script('../', 'periods')))
def ul(items): return '<ul>' + ''.join(scene_li(s, '../', ('museum',), title, url, year) for s, title, url, year in items) + '</ul>'
painted = ''.join(f'<h3 id="{p["id"]}">{e(both(p["name"]))}</h3>{scene_list(of("place", p["id"]), "../")}' for p in R['places'] if of('place', p['id']))
now = ''.join(f'<h3 id="{m["id"]}">{i + 1} · {e(both(m["name"]))}</h3>{ul(cap_soon(museum_items(m["id"]), lambda x: x[0]))}'
              for i, m in enumerate([m for m in R['museums'] if m.get('lat') is not None and museum_items(m['id'])]))
PAGES.append(page('map/', T('地图', 'Map'), '画在哪里、现在在哪里 · Where the paintings were made, and where they are now', '      <h1>地图 · Map</h1>\n      <h2>画在哪里 · Where it was painted</h2>' + painted + '<h2>现在在哪里 · Where it is now</h2>' + now, site_script('../', 'map')))
mus = ''.join(f'<h2 id="{m["id"]}">{e(both(m["name"]))}</h2>' + (f'<p><a href="{e(m["url"])}">参观官网 · Visit website</a></p>' if m.get('url') else '') + (ul(cap_soon(museum_items(m['id']), lambda x: x[0])) if museum_items(m['id']) else '<p>即将推出 · Coming soon</p>') for m in R['museums'])
PAGES.append(page('museums/', T('博物馆', 'Museums'), '按博物馆浏览：去哪里看真迹 · Browse by museum: where to see the real paintings', '      <h1>按博物馆 · By museum</h1>\n      ' + mus, site_script('../', 'museums')))
PAGES.append(page('about/', T('关于', 'About'), t(ABOUT['intro'][0]) + ' ' + t(ABOUT['intro'][0], 'en'),
                  '      <h1>关于 · About</h1>\n      ' + ''.join(para(p) for p in ABOUT['intro']) + para(ABOUT['me']) + para(ABOUT['principles']), site_script('../', 'about')))

# ---------- 场景页 ----------
REC = [('artist', '画家（生卒年）', 'Artist (dates)'), ('title', '画名', 'Title'), ('date', '年份', 'Date'), ('medium', '材质', 'Medium'),
       ('dimensions', '尺寸', 'Dimensions'), ('collection', '收藏地', 'Collection'), ('creditLine', '来源说明', 'Credit line')]
for meta in BUILT:
    S = SCENE_DATA[meta['id']]
    L, E, up = S['label'], S['ending'], '../../'
    title = S.get('seo', {}).get('title') or f'{t(L["title"])} · 走进名画 | {t(L["title"], "en")} · Walk into Paintings'
    desc = S.get('seo', {}).get('description') or f'走进{t(L["artist"])}的《{t(L["title"])}》，{t(L["date"])}。Walk into {t(L["artist"], "en")}’s {t(L["title"], "en")}, {t(L["date"], "en")}.'
    labelline = ' · '.join(both(L[k], ' / ') for k in ('title', 'artist', 'date', 'museum'))
    alt = both(S['painting'].get('alt'), ' · ')
    cards = ''.join(f'<h3>{bi(c["title"])}</h3>{bi(c["text"], "p")}' for c in S['cards'].values())
    acts = ''.join(f'<h3>{e(a.get("kicker", ""))} {bi(a["title"])}</h3>{bi(a["text"], "p")}' + (f'<p>{e(both(a["caption"], " / "))}</p>' if a.get('caption') else '') for a in E['acts'])
    rec = S.get('record')
    rec_html = ''
    if rec and any(both(v) for k, v in rec.items() if not k.startswith('_')):
        rows = ''.join(f'<tr><th>{zh} · {en}</th><td>{e(both(rec.get(k), " / "))}</td></tr>' for k, zh, en in REC if both(rec.get(k)))   # 空着的行不写
        if rec.get('url'): rows += f'<tr><th>博物馆作品页 · Museum page</th><td><a href="{e(rec["url"])}">{e(rec["url"])}</a></td></tr>'
        rec_html = f'<h2>作品档案 · Artwork record</h2><table>{rows}</table>'
    items = [i for i in (S.get('reading') or {}).get('items', []) if i.get('url')]
    reading = ('<h2>延伸阅读与来源 · Further reading and sources</h2><ul>' + ''.join(f'<li><a href="{e(i["url"])}">{e(both(i["title"], " / "))}</a></li>' for i in items) + '</ul>') if items else ''
    A = ARTISTS.get(meta['artist'])
    artist_html = f'<h2>关于画家 · About the artist</h2>{bi(A["bio"], "p")}<p><a href="{up}artists/?id={A["id"]}">更多{e(A["name"]["zh"])}的画 · More by {e(A["name"]["en"])}</a></p>' if A and A.get('bio') else ''
    museums = ''.join(f'<li><a href="{e(MUSEUMS[m]["url"])}">{e(both(MUSEUMS[m]["name"]))}</a></li>' for m in E.get('museums', []) if m in MUSEUMS and MUSEUMS[m].get('url'))
    s = f'''      <h1>{bi(L["title"])}</h1>
      <p>{e(labelline)}</p>
      <p>图片：{e(L["source"]["zh"])} / Image: {e(L["source"]["en"])}</p>
      <img src="{e(S["painting"]["image"])}" alt="{e(alt)}" width="{S["painting"]["width"]}" height="{S["painting"]["height"]}" />
      <h2>发现 · Discover</h2>
      {cards}
      <h2>故事 · The story</h2>
      {acts}
      <p><strong>{bi(E["final"])}</strong></p>
      {rec_html}
      {artist_html}
      <h2>去看真迹 · See the real painting</h2>
      <ul>{museums}</ul>
      {reading}'''
    script = ("    import { startLight } from '../../assets/light.js';\n    startLight('scene.json');" if S.get('kind') == 'light'   # 轻量版：分层景深
              else "    import { startScene } from '../../assets/engine.js';\n    startScene('scene.json');")
    path = page(meta['path'], title, desc, s, script, image=meta.get('cover') or (meta['path'] + S['painting']['image']), image_alt=alt, scene=True, noindex=meta['status'] != 'live')
    if meta['status'] == 'live': PAGES.append(path)   # 还没上线的场景不放进 sitemap

# ---------- 404 ----------
s404 = '''      <h1>找不到这一页 · Page not found</h1>
      <p><a href="/walk-into-paintings/">回到走进名画 · Back to Walk into Paintings</a></p>'''
page('404.html', '找不到这一页 · Page not found — 走进名画', '找不到这一页 · Page not found', s404,
     "    import { renderPage } from '/walk-into-paintings/assets/site.js';\n    renderPage('notFound', { nav: null });",
     up='/walk-into-paintings/', noindex=True)   # 404 页可能出现在任何网址下，所以链接用完整路径

# ---------- sitemap.xml、robots.txt ----------
today = datetime.date.today().isoformat()
urls = ''.join(f'  <url><loc>{SITE}{p}</loc><lastmod>{today}</lastmod></url>\n' for p in PAGES if not p.endswith('.html'))
open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8').write(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n')
open(os.path.join(ROOT, 'robots.txt'), 'w', encoding='utf-8').write(f'User-agent: *\nAllow: /\n\nSitemap: {SITE}sitemap.xml\n')
print('生成了', len(PAGES), '个页面 + sitemap.xml + robots.txt')
for p in PAGES: print('  ', p or '(首页)')
