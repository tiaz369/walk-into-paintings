# 走进名画 · Walk into Paintings

**Step inside the world's great paintings. 走进世界名画的内部。**

走进名画是一座可以走进去的线上美术馆：每一幅名画都是一个可探索的空间，配有双语故事，最后引导观众去看真迹。

- 网址：https://tiaz369.github.io/walk-into-paintings/
- 作者：Tia，用 AI 制作，所有内容由本人撰写和核对
- 托管：GitHub Pages

## 文件夹

```
walk-into-paintings/
├── index.html            首页
├── about/                关于这个项目
├── map/                  地图页
├── artists/  themes/  periods/  museums/   浏览页面
├── collections/arles/    系列页（每个系列一个文件夹：arles、delft、national-gallery、stage）
├── scenes/
│   └── bedroom/
│       ├── index.html    场景页（只有几行，套用模板）
│       ├── scene.json    这个场景的内容：卡片、三幕、展签、房间形状、家具位置
│       ├── sources.md    资料来源记录
│       └── images/       原画和裁剪图
├── assets/
│   ├── engine.js         共用的 3D 和互动功能（场景页用）
│   ├── site.js           共用的网站功能：页眉页脚、中英切换、深浅色、画卡片
│   └── style.css         共用的样式（配色、字体）
└── data/scenes.json      所有场景的登记表，首页、筛选和地图都读这里
```

原则：功能代码只写一次，每个新场景只加一个文件夹和一条登记。

## 如何新增一个场景

以“黄房子”为例（登记表里已经有它，状态是 `soon`）：

1. **复制文件夹**：把 `scenes/bedroom/` 整个复制一份，改名为 `scenes/yellow-house/`。
2. **换图片**：把原画放进 `scenes/yellow-house/images/`，删掉卧室的图片。
3. **改 `scene.json`**（场景的全部内容都在这里）：
   - `id`：改成 `yellow-house`（要和登记表里的一样）
   - `painting`：原画文件名和宽高
   - `label`：展签——画名、画家、年份、收藏地；`source` 是图片来源，会显示成“图片：… / Image: …”
   - `viewpoint`：画家视角（镜头位置和角度；需要对照原画调整，可以请 Claude Code 帮忙计算）
   - `room` 和 `objects`：房间形状和家具位置（可用的家具种类见 `assets/engine.js` 里的 `BUILD`）
   - `cards`：发现卡片（完整版 5–7 个，轻量版 3–4 个），每个都要有中英文
   - `ending`：三幕故事、最后一句话、各版本的展签、博物馆
   - `record`：作品档案表（画家生卒年、画名、年份、材质、尺寸、收藏地、博物馆作品页）。空着的格子显示“待补充”
   - `zoom`：细节放大用的图片（默认就是原画）
   - `reading`：页面最底部的“延伸阅读与来源”，每条写 `title`（中英文）和 `url`
   - `audioGuide`：语音导览录音文件（`zh` / `en`）。空着时按钮不显示
4. **改 `index.html`**：只需要改 `<title>` 和分享预览（`og:` 开头的几行）里的文字和网址。
5. **在登记表登记**：打开 `data/scenes.json`，找到 `yellow-house` 这一条：
   - `status` 改成 `live`
   - 加上 `"path": "scenes/yellow-house/"` 和 `"cover": "scenes/yellow-house/images/封面图.jpg"`
   - 填上 `added`（上线日期，首页“本周新作”按这个排序）、`themes`、`period`
6. **填资料来源**：在 `sources.md` 里写下每条事实的出处。
7. **上线前检查**（来自网站蓝图的“内容与版权规则”）：公有领域、图片来源已注明、文字由 Tia 提供并核对、解读性内容标明“有人认为”、中英文都检查过。

首页、系列页、浏览页和地图会自动出现新场景，不用改它们。

## 本地预览

场景页要通过网址打开（直接双击 html 文件会读不到 `scene.json`）。在仓库文件夹里运行：

```
python3 -m http.server 8000
```

然后在浏览器打开 http://localhost:8000/

## 旧地址

- `tiaz369.github.io/bedroom/` → 自动跳转到 `scenes/bedroom/`
- `tiaz369.github.io/walk-into-paintings/bedroom/` → 自动跳转到 `scenes/bedroom/`
