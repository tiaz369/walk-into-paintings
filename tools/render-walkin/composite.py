#!/usr/bin/env python3
# =====================================================================
# 走进名画 · 把抠好的宠物合成进原画（只在本地运行，不部署，不进网站）
#
# 原画其他部分一笔不动，只在宠物的位置加上宠物：
#   1. 按原画那一块的颜色给宠物调色（color 强度可调）
#   2. 把那一块原画的笔触纹理叠到宠物身上（texture），看起来像同一支笔画的
#   3. 宠物脚下加一块柔和的阴影（shadow），边缘轻轻羽化
#
# 用法：
#   python3 tools/render-walkin/composite.py 原画.jpg --grid                         先看格子，决定放在哪
#   python3 tools/render-walkin/composite.py 原画.jpg 宠物.png --at 0.62,0.86 --height 0.22
#     --at      宠物“脚底中间”在原画上的位置（横向,竖向，0–1）
#     --height  宠物的高度占原画高度的比例（比如 0.22）
#   可选：--flip（左右翻转）、--color 0.6、--texture 0.5、--shadow 0.35、--out 文件名
#
# 宠物.png：背景透明的宠物（iPhone 相册长按抠图、remove.bg、Photoshop 都可以；也可以先让 AI 画成画风再抠）。
# 原画：用博物馆官网下载的高清原图，成品才清楚、可以打印（网站上的图只有约 1600 像素宽）。
# 只需要 Python 3 + Pillow。顾客的照片和成品放在 input/、output/（不会上传到仓库）。
# =====================================================================
import argparse, os, sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageStat


def match_color(pet_rgb, alpha, ref, strength):
    """把宠物每个颜色通道的平均值和对比度，往原画那一块靠（strength 0 = 不调，1 = 完全一样）。"""
    ps = ImageStat.Stat(pet_rgb, alpha)
    rs = ImageStat.Stat(ref)
    bands = []
    for i, band in enumerate(pet_rgb.split()):
        pm, psd = ps.mean[i], max(ps.stddev[i], 1)
        rm, rsd = rs.mean[i], max(rs.stddev[i], 1)
        tm, tsd = pm + (rm - pm) * strength, psd + (rsd - psd) * strength
        a = tsd / psd
        b = tm - a * pm
        bands.append(band.point(lambda v, a=a, b=b: max(0, min(255, int(a * v + b)))))
    return Image.merge('RGB', bands)


def add_texture(pet_rgb, ref, strength):
    """把原画那一块的笔触细节（原画 − 模糊后的原画）叠到宠物上。"""
    ref = ref.resize(pet_rgb.size)
    detail = ImageChops.subtract(ref, ref.filter(ImageFilter.GaussianBlur(3)), scale=1, offset=128)
    textured = ImageChops.add(pet_rgb, detail, scale=1, offset=-128)
    soft = pet_rgb.filter(ImageFilter.GaussianBlur(0.8))   # 先轻轻柔化照片的锐利边缘，再加笔触
    return Image.blend(soft, textured, strength)


def composite(painting, pet_path, at, height, flip, color, texture, shadow):
    base = Image.open(painting).convert('RGB')
    pet = Image.open(pet_path).convert('RGBA')
    box = pet.getchannel('A').getbbox()
    if not box:
        sys.exit('宠物.png 没有透明背景（或者全是透明的）。请先抠图，存成带透明背景的 PNG。')
    pet = pet.crop(box)
    if flip:
        pet = pet.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    th = max(8, int(base.height * height))
    tw = max(8, int(pet.width * th / pet.height))
    pet = pet.resize((tw, th), Image.Resampling.LANCZOS)
    x = int(at[0] * base.width - tw / 2)
    y = int(at[1] * base.height - th)          # 脚底对齐 --at 的位置
    # 原画里宠物周围的一块（往外多取一点），用来调色和取笔触
    pad = max(tw, th) // 3
    rb = (max(0, x - pad), max(0, y - pad), min(base.width, x + tw + pad), min(base.height, y + th + pad))
    ref = base.crop(rb)
    alpha = pet.getchannel('A')
    rgb = match_color(pet.convert('RGB'), alpha, ref, color)
    under = base.crop((max(0, x), max(0, y), min(base.width, x + tw), min(base.height, y + th))).resize((tw, th))
    rgb = add_texture(rgb, under, texture)
    alpha = alpha.filter(ImageFilter.GaussianBlur(max(1, th // 300)))   # 边缘轻轻羽化
    out = base.copy()
    if shadow > 0:   # 脚下一块扁扁的柔和阴影
        sh = Image.new('L', base.size, 0)
        cx, cy, rx, ry = x + tw / 2, y + th, tw * 0.45, max(3, th * 0.06)
        ImageDraw.Draw(sh).ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=int(255 * shadow))
        sh = sh.filter(ImageFilter.GaussianBlur(max(2, th // 25)))
        dark = Image.new('RGB', base.size, (40, 32, 40))
        out = Image.composite(dark, out, sh)
    out.paste(rgb, (x, y), alpha)
    return out


def grid(src, out):
    img = Image.open(src).convert('RGB')
    d = ImageDraw.Draw(img)
    lw = max(1, img.width // 600)
    for i in range(1, 10):
        X, Y = img.width * i / 10, img.height * i / 10
        d.line([(X, 0), (X, img.height)], fill=(255, 255, 255), width=lw)
        d.line([(0, Y), (img.width, Y)], fill=(255, 255, 255), width=lw)
        d.text((X + 4, 4), f'{i / 10:.1f}', fill=(255, 255, 0))
        d.text((4, Y + 4), f'{i / 10:.1f}', fill=(255, 255, 0))
    img.save(out, quality=88)
    print('定位图：', out)


def main():
    ap = argparse.ArgumentParser(description='把抠好的宠物合成进原画（本地用）')
    ap.add_argument('painting', help='原画（博物馆官网的高清图）')
    ap.add_argument('pet', nargs='?', help='背景透明的宠物 PNG')
    ap.add_argument('--at', help='宠物脚底中间的位置：横向,竖向（0–1）')
    ap.add_argument('--height', type=float, default=0.2, help='宠物高度占原画高度的比例（默认 0.2）')
    ap.add_argument('--flip', action='store_true', help='左右翻转宠物')
    ap.add_argument('--color', type=float, default=0.6, help='调色强度 0–1（默认 0.6）')
    ap.add_argument('--texture', type=float, default=0.5, help='笔触纹理强度 0–1（默认 0.5）')
    ap.add_argument('--shadow', type=float, default=0.35, help='阴影深浅 0–1（默认 0.35，0 = 不加）')
    ap.add_argument('--grid', action='store_true', help='只做定位图')
    ap.add_argument('--out', help='输出文件名（默认放在 output/ 里）')
    a = ap.parse_args()
    outdir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'output'); os.makedirs(outdir, exist_ok=True)
    stem = os.path.splitext(os.path.basename(a.painting))[0]
    if a.grid:
        return grid(a.painting, os.path.join(outdir, stem + '-grid.jpg'))
    if not a.pet or not a.at:
        ap.error('要写宠物图片和 --at 位置，比如：composite.py 原画.jpg 宠物.png --at 0.62,0.86 --height 0.22')
    at = tuple(float(v) for v in a.at.split(','))
    out = a.out or os.path.join(outdir, stem + '-with-pet.jpg')
    composite(a.painting, a.pet, at, a.height, a.flip, a.color, a.texture, a.shadow).save(out, quality=95)
    print('合成图：', out)


if __name__ == '__main__':
    main()
