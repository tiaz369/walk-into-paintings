# 生成精简版中文衬线字体 assets/fonts/zh-serif.woff2（只包含网站用到的字）
# 需要：fonttools、brotli（pip install fonttools brotli），和 @fontsource/noto-serif-sc 的字体文件（npm pack @fontsource/noto-serif-sc）
# 用法：python3 tools/zh_font_build.py <fonttools 所在目录，没有就写 .> chars.txt <fontsource 包里的 files 目录> <临时目录> assets/fonts/zh-serif.woff2
# 字体：Noto Serif SC，SIL Open Font License 1.1（assets/fonts/OFL-Noto-Serif-SC.txt）
import sys, glob, os
sys.path.insert(0, sys.argv[1])
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.merge import Merger
chars = open(sys.argv[2], encoding='utf8').read()
want = set(ord(c) for c in chars)
src = sorted(glob.glob(sys.argv[3] + '/noto-serif-sc-*-400-normal.woff2'))
parts = []
for f in src:
    ft = TTFont(f); cmap = set(ft.getBestCmap().keys())
    hit = want & cmap
    if not hit: continue
    opts = subset.Options(); opts.flavor = None; opts.layout_features = ['*']; opts.notdef_outline = True
    s = subset.Subsetter(opts); s.populate(unicodes=hit); s.subset(ft)
    out = f'{sys.argv[4]}/part-{len(parts)}.ttf'; ft.flavor = None; ft.save(out); parts.append(out)
print('parts', len(parts))
m = Merger(); font = m.merge(parts)
font.flavor = 'woff2'; font.save(sys.argv[5])
got = set(TTFont(sys.argv[5]).getBestCmap().keys())
print('missing', ''.join(chr(c) for c in sorted(want - got))[:200], 'size', os.path.getsize(sys.argv[5]) // 1024, 'KB')
