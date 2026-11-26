# “走进去”视频工具（只在本地用，不在网站上）

给“走进画里的你”的订单做 10 秒竖屏视频（1080 × 1920）和手机壁纸（1170 × 2532）。
视频：先看到整幅画，镜头慢慢推进画里，最后停在宠物身上。

**顾客的照片和成品不要放进仓库。** 放在 `input/` 和 `output/` 里（这两个文件夹已被忽略，不会上传），或者放在仓库外面。

## 最简单的用法：让 Claude Code 帮你做

把做好的入画图（宠物已经放进画里）上传到 Claude Code，说：
“用 render-walkin 做视频和壁纸，宠物在画面左下”。
Claude Code 会运行工具，把视频和壁纸发给你。文件不会进仓库。

## 自己在电脑上运行

需要 Python 3（装好 Pillow：`pip3 install Pillow`）和 ffmpeg（Mac：`brew install ffmpeg`）。

```
# 1. 找宠物的位置：生成一张带格子的图，看宠物在哪一格
python3 tools/render-walkin/render_walkin.py 成品.jpg --grid

# 2. 做视频和壁纸（横向, 竖向；0–1）
python3 tools/render-walkin/render_walkin.py 成品.jpg --focus 0.43,0.62 --wallpaper
```

结果在 `tools/render-walkin/output/`。可选：`--zoom 4`（推得更近）、`--seconds 8`。
做一条视频大约 20–30 秒。
