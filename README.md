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
├── artists/  themes/  moods/  periods/  museums/  timeline/   浏览页面
├── london/  versions/    专题页：在伦敦看真迹、同一幅画的几个版本
├── collections/arles/    系列页（每个系列一个文件夹：nuenen、arles、saint-remy、delft、paris-streets、stage）
├── scenes/
│   └── bedroom/
│       ├── index.html    场景页（只有几行，套用模板）
│       ├── scene.json    这个场景的内容：变体、卡片、三幕、展签、独家发现、环境音、光线、衔接、房间形状、家具位置
│       ├── audio/        语音导览录音（guide-zh.mp3、guide-en.mp3，可选）
│       ├── sources.md    资料来源记录
│       └── images/       原画和裁剪图
├── assets/
│   ├── vendor/three.module.js   3D 程序库 three.js 0.160.0（放在自己仓库里，不依赖外部网站）
│   ├── variants.js       场景模板：一个骨架，四种变体（interior、outdoor、still-life、portrait）
│   ├── engine.js         完整版场景（interior、outdoor）：3D 走动和互动
│   ├── light.js          轻量版场景（still-life、portrait）：分层景深
│   ├── sound.js          环境音（代码合成）和音乐
│   ├── guide.js          语音导览播放器
│   ├── hero/             首页首屏短片（暂时不用：首屏现在是一幅画铺满一屏）
│   ├── site.js           共用的网站功能：页眉页脚、中英切换、深浅色、画卡片
│   └── style.css         共用的样式（配色、字体）
├── data/scenes.json      所有场景的登记表，首页、筛选和地图都读这里
├── data/about.json       关于页的文字
├── data/life/            画家页“生平”（每位画家一个文件，比如 van-gogh.json）
├── tools/build.py        把每页的文字写进 html（给搜索引擎看），并生成 sitemap.xml、404.html
├── tools/check_scenes.py 检查每个场景是否符合模板（build.py 会自动运行）
├── .github/workflows/build.yml   合并到 main 后自动运行 build.py
├── favicon.svg  404.html  sitemap.xml  robots.txt
```

原则：功能代码只写一次，每个新场景只加一个文件夹和一条登记。

## 场景模板：一个骨架，四种变体

**骨架**（所有场景都有，顺序固定）：

开场原画 → 走进画里 → 发现卡片 → 独家发现 → 故事 → 作品档案与画家简介 → 去看真迹 → 下一个场景

**四种变体**（`scene.json` 里的 `variant`；规则写在 `assets/variants.js` 和 `tools/check_scenes.py`）：

| variant | 用哪个程序 | 卡片 | 画家视角 | 故事 | 现有场景 |
|---|---|---|---|---|---|
| `interior` 室内房间（完整版） | `engine.js`：第一人称在房间里走动 | 5–7 | 有 | 三幕 | bedroom、night-cafe、vangogh-chair |
| `outdoor` 户外风景（完整版） | `engine.js`：第一人称走动，有天空、风和远景 | 5–7 | 有 | 三幕 | yellow-house、cafe-terrace、starry-night-rhone、wheatfield-cypresses |
| `still-life` 静物（轻量版） | `light.js`：分层景深，可轻微转动视角 | 3–6 | 没有 | 一段短故事（三段） | sunflowers |
| `portrait` 人物肖像（轻量版） | `light.js`：分层景深，重点是细节放大（多一个“放大看细节”按钮） | 3–6 | 没有 | 一段短故事（三段） | 暂无 |

**每个场景必须各自不同的四样东西**（都写在 `scene.json` 里）：

- `exclusive`：独家发现（每个场景一个，不能和别的场景重复）
- `ambience`：环境音（用 `assets/sound.js` 里 `AMBIENCE` 的一种，比如 `room-birds`、`river`）
- `lighting`：光线设定，`type`（`daylight` 白天、`gaslight` 煤气灯、`night` 夜晚、`window` 窗边光……）和中英文 `label`
- `links`：与其他场景的衔接一览——`doors` 房间里的门、`cards` 卡片里的链接、`end` 故事结尾的按钮（“下一个场景”按系列顺序自动出现）

**系列主色**：写在 `data/scenes.json` 的 `collections` → `color`，用于按钮和点缀。梵高在阿尔勒、梵高在圣雷米：梵高的黄 `#c99a22`；维米尔的代尔夫特：代尔夫特蓝 `#2f5597`。

## 如何新增一个场景

1. **选变体**：室内 `interior`、户外 `outdoor`、静物 `still-life`、肖像 `portrait`。
   复制一个同变体的现有场景文件夹当起点（室内：`scenes/bedroom/`；户外：`scenes/yellow-house/`；静物、肖像：`scenes/sunflowers/`），改名为新场景的 id，比如 `scenes/the-milkmaid/`。
2. **填 `scene.json`**（场景的全部内容都在这里；所有事实文字由 Tia 提供）：
   - `id`（和登记表一样）、`variant`
   - **作品档案**：`label`（展签：画名、画家、年份、收藏地；`source` 是图片来源）、`record`（画家生卒年、材质、尺寸、来源说明、博物馆作品页）
   - **卡片**：`cards`（数量见上表），每个都有中英文；引用了书信的卡片可以加 `letter.url`（“读原信”）
   - **故事**：`ending.acts`（三段）、`ending.final`（最后一句话）、`ending.museums`
   - **独家发现**：`exclusive`
   - **声音**：`ambience`（环境音）、`music`（可选，只用 CC0 / 公有领域录音）、`audioGuide`（语音导览，录音放进 `audio/`）
   - **光线**：`lighting`
   - **衔接**：`links`，以及真正的门（`objects` 里的 `portal`）、卡片链接（`cards` 的 `link`）、结尾按钮（`ending.exit`）
   - 完整版还要：`viewpoint`（画家视角，可以请 Claude Code 对照原画计算）、`room` 和 `objects`（房间和家具，种类见 `assets/engine.js` 里的 `BUILD`）；轻量版要：`layers`（分层）和 `spots`（卡片的位置）
   - **来源**：在场景文件夹的 `sources.md` 里写下每条事实的出处；`reading` 是页面最底部的“延伸阅读与来源”
3. **放图片**：原画放进 `scenes/新场景/images/`，在 `images/README.md` 里写图片来源和授权，并在 `scene.json` 的 `imageSource.files` 里给每张图片记一条（见下面的“版权规则”）。
4. **登记到 `data/scenes.json`**：在 `scenes` 里找到（或新加）这一条，`status` 改成 `live`，加上 `path`、`cover`、`added`（上线日期），以及 `collection`、`themes`、`moods`（心情）、`period`、`place`、`museum`；在伦敦国家美术馆展出的，加 `onDisplay` 和 `room`。新系列在 `collections` 里加一条，写上 `color`（主色）。
5. **重新生成静态页面**：运行 `python3 tools/build.py`（Claude Code 会帮你运行）。
   它根据 `data/scenes.json` 和每个 `scene.json`，重新生成所有浏览页（画家、主题、时期、心情、博物馆、地图、时间线）、场景页、sitemap 和 404 的静态 HTML（不运行 JavaScript 时看到的内容，也是搜索引擎读到的内容），规则和 JavaScript 版完全一样。
   它还会自动运行 `tools/check_scenes.py`，按变体检查卡片数量、故事段数、独家发现是否重复、环境音、光线、衔接是否齐全，有问题会列出来。
   **就算忘了这一步也没关系**：合并到 `main` 之后，GitHub 会自动运行它（`.github/workflows/build.yml`）。
6. **发布**：Claude Code 开一个 Pull Request → 在 GitHub 上点 **Merge pull request** → **Confirm merge** → 等 1–2 分钟，强制刷新网站（Ctrl+Shift+R）。
   上线前再检查一遍（来自网站蓝图的“内容与版权规则”）：公有领域、图片来源已注明、文字由 Tia 提供并核对、解读性内容标明“有人认为”、中英文都检查过。
   **年份和收藏地**：不同来源写的不一样时，以收藏这幅画的博物馆官网为准。官网核对不了的，标“待核对”，先不显示（画家页的“其他代表作”在 `data/works.json` 里，`check` 写 `ok` 才显示）。
   **示意类效果**：只要改变了原画外观的效果（画面上加出来、改出来、拿走的东西，比如褪色前的颜色、天亮、风吹、灯光变化、被移走的物体），页面上都必须加一句“这是示意。/ This is an illustration.”（写在独家发现的说明 note 里，打开效果时显示）。
   **资料记录**：每个 `scene.json` 都要有 `sources`（资料来源列表，每项写 `url`，可以加 `title`）、`imageSource`（图片来源：`text` 说明、`url` 原图网址、`license` 授权；`files` 里每张图片一条：`file`、`from` 来源、`url`、`license`、`status`、`verified` 核对日期）和 `lastVerified`（最后核实日期，YYYY-MM-DD）。核对过资料就更新 `lastVerified`。
   **英文画名的格式**：画名出现在句子里时用斜体（卡片、故事、按钮、图注、时间线、延伸阅读里都一样，在 json 里写成 `*Irises*`）；展签、作品档案里单独一栏的画名不用斜体；括号里的补充说明用正体，例如 `*Irises* (in a vase)`。

首页、系列页、浏览页、时间线和地图会自动出现新场景，不用改它们。

## 版权规则

**允许**
1. 画作：画家去世超过 70 年。
2. 图片只来自：
   - a. 博物馆开放授权（CC0 / 公有领域）：芝加哥艺术博物馆、大都会博物馆、华盛顿国家美术馆、荷兰国立博物馆等；
   - b. Wikimedia Commons 上标注为 PD-Art 的平面画作翻拍。
3. 自制内容：3D 场景、示意效果、代码合成的声音、自己写的文字。
4. 开源字体（如 Google Fonts，OFL 授权）。

**禁止**
1. 伦敦国家美术馆、考陶尔德、维也纳艺术史博物馆、莫瑞泰斯、RMN 等官网下载的限制用途图片。
2. Google 艺术与文化上的图片。
3. 含人物、展厅设施的照片，以及雕塑等立体作品的照片（除非是 CC0）。
4. 现代实景照片。
5. 电影剧照、纸币图案、书籍封面、博物馆标志。
6. 仍在版权期内的作品。
7. 长篇引用受版权保护的译文（只引短句并注明出处，其余用链接）。

**记录和检查**
- 每张图片（包括裁出来的小图和我们做的示意图）都要在 `scene.json` 的 `imageSource.files` 里记一条：`file` 文件名、`from` 来源、`url` 原图网址（还没记下写“待补”）、`license` 授权、`status`（符合 / 不符合 / 来源不明 / 待决定）、`verified` 核对日期。`tools/check_scenes.py` 会检查 `images/` 里每个文件都有记录。
- 分享图（`assets/og-*.jpg`）、分享卡片、首页动画和画家封面（`assets/artists/`）用的图片也要符合规则。
- 音频只能是代码合成的，或确认为 CC0 / 公有领域的录音。
- 最近一次全站检查的结果在 `copyright-check.md`。

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
