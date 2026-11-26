#!/usr/bin/env python3
# =====================================================================
# 走进名画 · 中英小故事卡（只在本地运行，不部署，不进网站）
#
# 输入：成品图（宠物已经在画里）、宠物名字、画名、中文和英文的小故事。输出：一张 1080 × 1350 的卡片图（JPG）。
# 版式：纸色底；上面是成品图；下面是宠物名字、“走进《画名》”、中文故事、英文故事；最下面一行网站名。
#
# 用法：
#   python3 tools/render-walkin/story_card.py 成品.jpg --name "豆豆 / Doudou" \
#     --title-zh "干草堆（日落，雪景）" --title-en "Stacks of Wheat (Sunset, Snow Effect)" \
#     --zh "雪后的傍晚，豆豆走进了莫奈的田野……" --en "On a snowy evening, Doudou stepped into Monet's field…"
#   文字太长时，图片会自动变小，给文字让地方。
#   字体：自动找电脑上的中文字体（Mac：宋体 / 苹方；Linux：Noto / 文泉驿）。找不到时用 --font-zh 和 --font-en 指定字体文件。
# 只需要 Python 3 + Pillow。
# =====================================================================
import argparse, os, sys
from PIL import Image, ImageDraw, ImageFont

PAPER, INK, MUTED, LINE = (244, 239, 230), (28, 28, 30), (111, 104, 92), (214, 206, 192)
W, H, M = 1080, 1350, 72   # 卡片尺寸（4:5，适合手机和社交平台）和边距
ZH_FONTS = ['/System/Library/Fonts/Supplemental/Songti.ttc', '/System/Library/Fonts/PingFang.ttc', '/Library/Fonts/Songti.ttc',
            '/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc', '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
            '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 'C:/Windows/Fonts/simsun.ttc', 'C:/Windows/Fonts/msyh.ttc']
EN_FONTS = ['/System/Library/Fonts/Supplemental/Georgia Italic.ttf', '/System/Library/Fonts/Supplemental/Georgia.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf',
            'C:/Windows/Fonts/georgiai.ttf']


def find(paths, given):
    for p in ([given] if given else []) + paths:
        if p and os.path.exists(p):
            return p
    return None


def wrap(draw, text, font, width):
    """按宽度换行：中文一个字一个字排，英文按单词排。"""
    lines, cur = [], ''
    tokens = []
    for part in text.split(' '):
        if any('\u4e00' <= ch <= '\u9fff' or ch in '，。、；：！？“”（）《》' for ch in part):
            tokens += list(part) + [' ']
        else:
            tokens += [part, ' ']
    for t in tokens:
        test = cur + t
        if draw.textlength(test.strip(), font=font) <= width or not cur.strip():
            cur = test
        else:
            lines.append(cur.strip()); cur = t.lstrip()
    if cur.strip():
        lines.append(cur.strip())
    return lines


def card(src, name, title_zh, title_en, zh, en, fzh, fen, out):
    img = Image.open(src).convert('RGB')
    c = Image.new('RGB', (W, H), PAPER)
    d = ImageDraw.Draw(c)
    f_name, f_title = ImageFont.truetype(fzh, 54), ImageFont.truetype(fzh, 30)
    f_zh, f_en, f_foot = ImageFont.truetype(fzh, 32), ImageFont.truetype(fen, 30), ImageFont.truetype(fzh, 22)
    tw = W - 2 * M
    title = f'走进《{title_zh}》' + (f' · Into {title_en}' if title_en else '')
    blocks = [(f_name, wrap(d, name, f_name, tw), INK, 12), (f_title, wrap(d, title, f_title, tw), MUTED, 28)]
    blocks.append((f_zh, wrap(d, zh, f_zh, tw), INK, 18))
    blocks.append((f_en, wrap(d, en, f_en, tw), MUTED, 0))
    # 先算文字要多高，剩下的给图片
    lh = lambda f: int(f.size * 1.55)
    text_h = sum(lh(f) * len(ls) + gap for f, ls, _, gap in blocks)
    foot_h = 70
    avail = H - M - 40 - text_h - foot_h - M // 2
    if avail < 300:
        sys.exit('文字太长了，卡片放不下。请把中文或英文的故事写短一点。')
    s = min(tw / img.width, avail / img.height)
    pic = img.resize((int(img.width * s), int(img.height * s)), Image.Resampling.LANCZOS)
    c.paste(pic, ((W - pic.width) // 2, M))
    y = M + pic.height + 40
    for f, ls, color, gap in blocks:
        for line in ls:
            d.text((M, y), line, font=f, fill=color); y += lh(f)
        y += gap
    d.line([(M, H - foot_h), (W - M, H - foot_h)], fill=LINE, width=1)
    d.text((M, H - foot_h + 20), '走进名画 · Walk into Paintings', font=f_foot, fill=MUTED)
    url = 'walkintopaintings.com'
    d.text((W - M - d.textlength(url, font=f_foot), H - foot_h + 20), url, font=f_foot, fill=MUTED)
    c.save(out, quality=94)
    print('故事卡：', out)


def main():
    ap = argparse.ArgumentParser(description='中英小故事卡（本地用）')
    ap.add_argument('image', help='成品图（宠物已经在画里）')
    ap.add_argument('--name', required=True, help='宠物名字，比如 "豆豆 / Doudou"')
    ap.add_argument('--title-zh', required=True, help='中文画名')
    ap.add_argument('--title-en', default='', help='英文画名')
    ap.add_argument('--zh', required=True, help='中文小故事（2–3 句）')
    ap.add_argument('--en', required=True, help='英文小故事（2–3 句）')
    ap.add_argument('--font-zh', help='中文字体文件（找不到时再写）')
    ap.add_argument('--font-en', help='英文字体文件（找不到时再写）')
    ap.add_argument('--out', help='输出文件名（默认放在 output/ 里）')
    a = ap.parse_args()
    fzh = find(ZH_FONTS, a.font_zh)
    if not fzh:
        sys.exit('找不到中文字体。请用 --font-zh 指定一个字体文件（.ttf / .ttc / .otf）。')
    fen = find(EN_FONTS, a.font_en) or fzh
    outdir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'output'); os.makedirs(outdir, exist_ok=True)
    out = a.out or os.path.join(outdir, os.path.splitext(os.path.basename(a.image))[0] + '-story-card.jpg')
    card(a.image, a.name, a.title_zh, a.title_en, a.zh, a.en, fzh, fen, out)


if __name__ == '__main__':
    main()
