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
│   ├── vendor/three.module.js   3D 程序库 three.js 0.160.0（放在自己仓库里，不依赖外部网站）
│   ├── engine.js         共用的 3D 和互动功能（场景页用）
│   ├── site.js           共用的网站功能：页眉页脚、中英切换、深浅色、画卡片
│   └── style.css         共用的样式（配色、字体）
├── data/scenes.json      所有场景的登记表，首页、筛选和地图都读这里
├── data/about.json       关于页的文字
├── tools/build.py        把每页的文字写进 html（给搜索引擎看），并生成 sitemap.xml、404.html
├── favicon.svg  404.html  sitemap.xml  robots.txt
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
   - `audioGuide`：语音导览。录音放进 `audio/guide-zh.mp3`、`audio/guide-en.mp3`，没有录音时按钮不显示；`transcript` 是文字稿
   - `sound`：环境音的种类（见 `assets/sound.js` 里的 `AMBIENCE`）；`music`：音乐（只用 CC0 / 公有领域录音，`src` 空着时不显示开关）
4. **`index.html` 不用手动改**：第 7 步的 `tools/build.py` 会自动生成（网页标题和分享预览来自 `scene.json` 的 `label`；想自己写，就在 `scene.json` 里加 `seo`，见卧室的例子）。
5. **在登记表登记**：打开 `data/scenes.json`，找到 `yellow-house` 这一条：
   - `status` 改成 `live`
   - 加上 `"path": "scenes/yellow-house/"` 和 `"cover": "scenes/yellow-house/images/封面图.jpg"`
   - 填上 `added`（上线日期，首页“最新开放”按这个排序）、`themes`、`moods`（心情）、`period`、`place`；在伦敦国家美术馆展出的，加 `onDisplay` 和 `room`
6. **填资料来源**：在 `sources.md` 里写下每条事实的出处。
7. **重新生成静态网页**：运行 `python3 tools/build.py`（Claude Code 会帮你运行）。
   它根据 `data/scenes.json` 和每个 `scene.json`，重新生成所有浏览页（画家、主题、时期、心情、博物馆、地图、时间线）、场景页、sitemap 和 404 的静态 HTML（不运行 JavaScript 时看到的内容，也是搜索引擎读到的内容），规则和 JavaScript 版完全一样（比如即将开放最多 3 个、计划中的作品不显示、没有作品的博物馆不显示）。
   **就算忘了这一步也没关系**：合并到 `main` 之后，GitHub 会自动运行它（`.github/workflows/build.yml`），一两分钟后把更新好的网页提交回 `main`。直接在 GitHub 网页上改 `data/scenes.json` 也一样。
8. **上线前检查**（来自网站蓝图的“内容与版权规则”）：公有领域、图片来源已注明、文字由 Tia 提供并核对、解读性内容标明“有人认为”、中英文都检查过。

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

## 黄房子：上传原画

1. 在 GitHub 打开 `scenes/yellow-house/images/`，点 **Add file → Upload files**
2. 上传 Wikimedia Commons 的 "Vincent van Gogh - The yellow house ('The street').jpg"，**文件名改成 `yellow-house.jpg`**
3. 告诉 Claude Code，它会把 3D 房子对准原画、把登记表里的 `status` 改成 `live`，再运行 `tools/build.py`

## 访问统计（GoatCounter）

已经开通：https://walkintopaintings.goatcounter.com 。统计代码由 `tools/build.py` 写在每一页的 `</body>` 前面。
除了访问量，还会记录这些事件（在后台的列表里看）：`enter-scene-场景名`（打开场景）、`step-inside-`（走进画里）、`found-3-`（发现 3 处）、`ending-`（看故事结局）、`see-real-`（点“去现场看真迹”）、`surprise-me`（今天看哪幅）、`audio-`（听语音导览）。
