#!/usr/bin/env python3
# =====================================================================
# 走进名画 · 生成首页和浏览页的分享预览图 assets/og-home.jpg（1200×630）
#
# 用法：python3 tools/make_og.py
# 三幅画并排、完整显示不裁切：阿尔勒的卧室、戴珍珠耳环的少女、向日葵；
# 背景用网站的深色，下方一行标题。图片都用网站里已有的原画。
# =====================================================================
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PICS = ['scenes/bedroom/images/v1888.jpg', 'scenes/pearl-earring/images/pearl-earring.jpg', 'scenes/sunflowers/images/sunflowers.jpg']
W, H, BG, INK = 1200, 630, (28, 28, 30), (235, 229, 217)   # 网站深色模式的 --paper 和 --ink
PAD, GAP, TITLE_H = 36, 22, 88
ZH_FONT = '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'
EN_FONT = '/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf'

ims = [Image.open(os.path.join(ROOT, p)).convert('RGB') for p in PICS]
h = H - PAD - TITLE_H   # 三幅画一样高，宽度按比例；放不下时一起缩小
h = min(h, (W - 2 * PAD - GAP * (len(ims) - 1)) / sum(i.width / i.height for i in ims))
ims = [i.resize((round(i.width * h / i.height), round(h)), Image.LANCZOS) for i in ims]
out = Image.new('RGB', (W, H), BG)
top = round((H - h - TITLE_H) / 2)   # 画和标题一起上下居中
x = (W - sum(i.width for i in ims) - GAP * (len(ims) - 1)) // 2
for i in ims:
    out.paste(i, (x, top)); x += i.width + GAP

d = ImageDraw.Draw(out)
zh, sep, en = '走进名画', '  ·  ', 'Walk into Paintings'
fz, fe = ImageFont.truetype(ZH_FONT, 38), ImageFont.truetype(EN_FONT, 40)
wz, ws, we = d.textlength(zh, font=fz), d.textlength(sep, font=fe), d.textlength(en, font=fe)
y = top + h + (TITLE_H - 40) / 2 - 2
x = (W - wz - ws - we) / 2
d.text((x, y), zh, font=fz, fill=INK); d.text((x + wz, y - 2), sep, font=fe, fill=INK); d.text((x + wz + ws, y - 4), en, font=fe, fill=INK)
out.save(os.path.join(ROOT, 'assets/og-home.jpg'), quality=88, optimize=True, progressive=True)
print('assets/og-home.jpg', out.size)
