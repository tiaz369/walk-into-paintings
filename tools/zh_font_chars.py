# 收集网站里用到的所有汉字和中文标点，写进一个文本文件（给 zh_font_build.py 用）
# 用法：python3 tools/zh_font_chars.py . chars.txt
import os, re, sys
root = sys.argv[1]; chars = set()
for d, _, fs in os.walk(root):
    if '/.git' in d or '/originals' in d or '/vendor' in d: continue
    for f in fs:
        if f.endswith(('.json', '.js', '.html', '.py')):
            try: t = open(os.path.join(d, f), encoding='utf8').read()
            except Exception: continue
            chars.update(c for c in t if '⺀' <= c <= '鿿' or '　' <= c <= '〿' or '＀' <= c <= '￯' or c in '“”‘’…—·')
print(len(chars), file=sys.stderr); open(sys.argv[2], 'w').write(''.join(sorted(chars)))
