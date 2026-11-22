# Delivery report template (quality-standards.md 6.4) — paste into the PR description

```markdown
## 交付报告 · <画名 zh> / <Title en>

### 1. 加了什么、改了什么
- 新场景：`scenes/<id>/`（scene.json、images/、sources.md、index.html）
- 登记表：`data/scenes.json`（<id>，系列 <collection> 第 N 幅）
- 其他改动：<画家页 / 博物馆 / 别的场景的链接…；没有就写“无”>

### 2. 检查结果（python3 tools/verify_artwork.py <id> --browser --lighthouse）
- 必过项（HARD）：全部通过 ✅ / 还有 N 项没过 ❌（列出）
- 可选项（SOFT）没通过的：
  - <规则号> <内容> — 原因 / 以后怎么处理
- 合计：FAIL n · WARN n · HUMAN n · PASS n

### 3. 需要 Tia 看的（脚本判断不了）
- [ ] 事实和来源对得上（A1–A3）：<哪些已由第二个 AI 对照，哪些没有>
- [ ] 图片确实是记录里的 Commons PD-Art 文件（C1）
- [ ] 中英文意思一致、读起来自然（L2）
- [ ] 手机上打开看一遍（截图见对话）
- 没查到的：<尺寸、展厅、日期…>

### 4. 新场景以外的改动
- <没有就写“无”>
```
