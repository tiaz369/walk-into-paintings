# “走进画里的你”本地小工具（只在你电脑上用，不在网站上）

四个小工具，按顺序用：

| 步骤 | 工具 | 输出 |
|---|---|---|
| 1. 把抠好的宠物合成进原画 | `composite.py` | 高清入画图（原画其他部分一笔不动） |
| 2. 10 秒“走进去”视频 | `render_walkin.py` | 竖屏 MP4，1080 × 1920 |
| 3. 手机壁纸 | `render_walkin.py --wallpaper-only` | 1170 × 2532 JPG |
| 4. 中英小故事卡 | `story_card.py` | 1080 × 1350 JPG |

**顾客的照片和成品不要放进仓库。** 放在 `input/` 和 `output/` 里（这两个文件夹已被忽略，不会上传），或者放在仓库外面。

## 最简单的用法：让 Claude Code 帮你做

把文件上传到 Claude Code，比如：
- “用 composite 把这只狗放进《干草堆（日落，雪景）》右下角，高度大约画面的五分之一”（附原画和抠好的宠物 PNG）
- “用 render-walkin 做视频和壁纸，宠物在右下”
- “做故事卡：名字 豆豆 / Doudou，中文……英文……”

Claude Code 会运行工具，把结果发给你。文件不会进仓库。

## 自己在电脑上运行

需要 Python 3 和 Pillow（`pip3 install Pillow`）；视频还需要 ffmpeg（Mac：`brew install ffmpeg`）。

```
# 1. 合成：先看格子决定放在哪，再合成
python3 tools/render-walkin/composite.py 原画.jpg --grid
python3 tools/render-walkin/composite.py 原画.jpg 宠物.png --at 0.72,0.86 --height 0.2
#    --at 宠物脚底中间的位置（横向,竖向，0–1）；--height 宠物高度占画面高度的比例
#    可选：--flip 左右翻转、--color 0.6 调色、--texture 0.5 笔触、--shadow 0.35 阴影

# 2 + 3. 视频和壁纸（--focus 是宠物身体中间的位置）
python3 tools/render-walkin/render_walkin.py 成品.jpg --focus 0.72,0.78 --wallpaper
python3 tools/render-walkin/render_walkin.py 成品.jpg --focus 0.72,0.78 --wallpaper-only   # 只做壁纸

# 4. 故事卡
python3 tools/render-walkin/story_card.py 成品.jpg --name "豆豆 / Doudou" \
  --title-zh "干草堆（日落，雪景）" --title-en "Stacks of Wheat (Sunset, Snow Effect)" \
  --zh "中文小故事" --en "English story"
```

结果在 `tools/render-walkin/output/`。

## 提醒

- **可以打印的高清图**：原画要用博物馆官网下载的高清原图（芝加哥艺术博物馆、华盛顿国家美术馆的作品页都有下载按钮）。网站上的图只有约 1600 像素宽，打印不够清楚。
- **宠物 PNG**：要背景透明。iPhone 相册长按宠物就能抠出来；也可以用 remove.bg 或 Photoshop。想让宠物更像画里的笔触，可以先让 AI 工具只把宠物画成这幅画的画风，再抠出来合成。不要让 AI 重画整幅画，原画其他部分要保持原样。
