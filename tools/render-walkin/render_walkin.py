#!/usr/bin/env python3
# =====================================================================
# 走进名画 · “走进去”视频和手机壁纸（只在本地运行，不部署，不进网站）
#
# 输入：一张做好的入画图（宠物已经放进画里）。输出：
#   - 10 秒竖屏视频 MP4（1080 × 1920）：先看到整幅画，镜头慢慢推进画里，最后停在宠物身上
#   - 手机壁纸 JPG（1170 × 2532，--wallpaper）：以宠物为中心裁成竖屏
#   - 定位图（--grid）：在画上画格子和坐标，帮你找宠物的位置
#
# 用法：
#   python3 tools/render-walkin/render_walkin.py 成品.jpg --grid                      先看格子，找宠物在哪
#   python3 tools/render-walkin/render_walkin.py 成品.jpg --focus 0.43,0.62           做视频
#   python3 tools/render-walkin/render_walkin.py 成品.jpg --focus 0.43,0.62 --wallpaper   视频 + 壁纸
# 可选：--zoom 3（推得多近，默认 3 = 最后画面宽度是原画的三分之一）、--seconds 10、--out 文件名
#
# 需要：Python 3 + Pillow，和 ffmpeg。没有新增仓库依赖。
# 顾客的照片和成品不要放进仓库：放在 tools/render-walkin/input/ 和 output/（已被 .gitignore 忽略），或者仓库外面。
# =====================================================================
import argparse, math, os, shutil, subprocess, sys
from PIL import Image, ImageDraw, ImageFilter

PAPER = (244, 239, 230)   # 网站的纸色
W, H = 1080, 1920          # 视频尺寸（竖屏 9:16）
WP_W, WP_H = 1170, 2532    # 手机壁纸


def ease(t):   # 慢慢开始、慢慢停下
    return t * t * (3 - 2 * t)


def view_at(img, focus, zoom, t, aspect):
    """镜头在原画上的取景框（中心 x, y 和宽度，单位是原画像素）。t=0 看整幅画，t=1 停在宠物身上（取景框不超出原画）。"""
    iw, ih = img.size
    w0 = max(iw * 1.08, ih * 1.08 * aspect)              # 开始：整幅画都在画面里，四周留一点纸色
    c0 = (iw / 2, ih / 2)
    w1 = min(iw / zoom, ih * aspect)                     # 结束：放大到宠物附近，取景框不超出原画
    h1 = w1 / aspect
    c1 = (min(max(focus[0] * iw, w1 / 2), iw - w1 / 2), min(max(focus[1] * ih, h1 / 2), ih - h1 / 2))
    k = ease(t)
    w = math.exp(math.log(w0) + (math.log(w1) - math.log(w0)) * k)   # 按比例缩放，推进的速度看起来均匀
    return c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, w


def frame(img, cx, cy, w, size, aspect):
    h = w / aspect
    box = (cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2)
    return img.transform(size, Image.Transform.EXTENT, box, Image.Resampling.BICUBIC, fillcolor=PAPER)


def shadowed(img):
    """原画四周加一圈很淡的阴影，开头看起来像挂在墙上的一幅画。"""
    pad = max(img.size) // 12
    base = Image.new('RGB', (img.width + pad * 2, img.height + pad * 2), PAPER)
    sh = Image.new('L', base.size, 0)
    ImageDraw.Draw(sh).rectangle((pad, pad + pad // 6, pad + img.width, pad + img.height + pad // 6), fill=70)
    sh = sh.filter(ImageFilter.GaussianBlur(pad // 4))
    base.paste((120, 110, 100), mask=sh)
    base.paste(img, (pad, pad))
    return base, pad


def render_video(src, focus, zoom, seconds, fps, out):
    if not shutil.which('ffmpeg'):
        sys.exit('没有找到 ffmpeg。Mac：先装 Homebrew，再运行 brew install ffmpeg')
    img = Image.open(src).convert('RGB')
    big, pad = shadowed(img)
    aspect = W / H
    n = int(seconds * fps)
    hold0, hold1 = int(fps * 1.2), int(fps * 1.5)   # 开头停 1.2 秒看整幅画；最后停 1.5 秒看宠物
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(fps), '-i', '-',
           '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    # 镜头：开始看整幅画（带阴影的大图，四周留纸色）；结束停在宠物身上（取景框只在原画里），中间按比例平滑推进
    w0 = max(big.width * 1.02, big.height * 1.02 * aspect)
    c0 = (big.width / 2, big.height / 2)
    ex, ey, w1 = view_at(img, focus, zoom, 1, aspect)
    c1 = (ex + pad, ey + pad)
    for i in range(n):
        if i < hold0:
            k = 0.0
        elif i < n - hold1:
            k = ease((i - hold0) / (n - hold0 - hold1))
        else:
            k = 1.0
        w = math.exp(math.log(w0) + (math.log(w1) - math.log(w0)) * k)
        if i >= n - hold1:   # 最后 1.5 秒：再推近一点点，画面不会完全静止
            w *= 1 - 0.03 * ease((i - (n - hold1)) / hold1)
        f = frame(big, c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, w, (W, H), aspect)
        if i < fps // 2:   # 开头半秒从纸色淡入
            f = Image.blend(Image.new('RGB', (W, H), PAPER), f, i / (fps // 2))
        p.stdin.write(f.tobytes())
    p.stdin.close()
    if p.wait() != 0:
        sys.exit('ffmpeg 出错了')
    print('视频：', out)


def render_wallpaper(src, focus, out):
    img = Image.open(src).convert('RGB')
    aspect = WP_W / WP_H
    w = min(img.width, img.height * aspect)   # 竖屏：取景框高度等于原画高度
    h = w / aspect
    cx = min(max(focus[0] * img.width, w / 2), img.width - w / 2)
    cy = min(max(focus[1] * img.height, h / 2), img.height - h / 2)
    frame(img, cx, cy, w, (WP_W, WP_H), aspect).save(out, quality=92)
    print('壁纸：', out)


def render_grid(src, out):
    img = Image.open(src).convert('RGB')
    d = ImageDraw.Draw(img)
    lw = max(1, img.width // 600)
    for i in range(1, 10):
        x, y = img.width * i / 10, img.height * i / 10
        d.line([(x, 0), (x, img.height)], fill=(255, 255, 255), width=lw)
        d.line([(0, y), (img.width, y)], fill=(255, 255, 255), width=lw)
        d.text((x + 4, 4), f'{i / 10:.1f}', fill=(255, 255, 0))
        d.text((4, y + 4), f'{i / 10:.1f}', fill=(255, 255, 0))
    img.save(out, quality=88)
    print('定位图：', out, '（横向是第一个数，竖向是第二个数，比如 --focus 0.4,0.6）')


def main():
    ap = argparse.ArgumentParser(description='“走进去”视频和手机壁纸（本地用）')
    ap.add_argument('image', help='做好的入画图（宠物已经放进画里）')
    ap.add_argument('--focus', help='宠物在画上的位置：横向,竖向，0–1，比如 0.43,0.62')
    ap.add_argument('--zoom', type=float, default=3.0, help='推得多近（默认 3）')
    ap.add_argument('--seconds', type=float, default=10)
    ap.add_argument('--fps', type=int, default=30)
    ap.add_argument('--out', help='视频文件名（默认放在 output/ 里）')
    ap.add_argument('--wallpaper', action='store_true', help='同时做手机壁纸')
    ap.add_argument('--grid', action='store_true', help='只做定位图（帮你找宠物的坐标）')
    a = ap.parse_args()
    here = os.path.dirname(os.path.abspath(__file__))
    outdir = os.path.join(here, 'output'); os.makedirs(outdir, exist_ok=True)
    stem = os.path.splitext(os.path.basename(a.image))[0]
    if a.grid:
        return render_grid(a.image, os.path.join(outdir, stem + '-grid.jpg'))
    if not a.focus:
        ap.error('写上宠物的位置，比如 --focus 0.43,0.62（不知道就先用 --grid 看格子）')
    fx, fy = (float(v) for v in a.focus.split(','))
    if not (0 <= fx <= 1 and 0 <= fy <= 1):
        ap.error('--focus 的两个数都要在 0 到 1 之间')
    render_video(a.image, (fx, fy), a.zoom, a.seconds, a.fps, a.out or os.path.join(outdir, stem + '-walkin.mp4'))
    if a.wallpaper:
        render_wallpaper(a.image, (fx, fy), os.path.join(outdir, stem + '-wallpaper.jpg'))


if __name__ == '__main__':
    main()
