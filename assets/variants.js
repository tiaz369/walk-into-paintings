// =====================================================================
// 走进名画 · 场景模板：一个骨架，四种变体
//
// 骨架（所有场景都有，顺序固定）：
//   开场原画 → 走进画里 → 发现卡片 → 独家发现 → 故事 → 作品档案与画家简介 → 去看真迹 → 下一个场景
//
// 变体：scene.json 里的 "variant" 写下面四个中的一个。
//   engine：用哪一个程序（3d = assets/engine.js，第一人称走动；light = assets/light.js，分层景深）
//   cards：发现卡片的数量范围；acts：故事几段；viewpoint：有没有画家视角对齐
// tools/check_scenes.py 会按这里的规则检查每个场景（同样的规则也写在那里，两边要一致）。
// =====================================================================
export const SKELETON = ['intro', 'enter', 'cards', 'exclusive', 'story', 'record', 'see-real', 'next'];

export const VARIANTS = {
  interior: {
    name: { zh: '室内房间（完整版）', en: 'Interior (full)' },
    engine: '3d', cards: [5, 7], acts: 3, viewpoint: true,
    desc: '第一人称在房间里走动；画家视角对齐；三幕故事'
  },
  outdoor: {
    name: { zh: '户外风景（完整版）', en: 'Outdoor (full)' },
    engine: '3d', cards: [5, 7], acts: 3, viewpoint: true,
    desc: '第一人称在场景里走动，有天空、风和远景；画家视角对齐；三幕故事'
  },
  'still-life': {
    name: { zh: '静物（轻量版）', en: 'Still life (light)' },
    engine: 'light', cards: [3, 6], acts: 3, viewpoint: false,
    desc: '分层景深，可以轻微转动视角；一段短故事（三段）'
  },
  portrait: {
    name: { zh: '人物肖像（轻量版）', en: 'Portrait (light)' },
    engine: 'light', cards: [3, 6], acts: 3, viewpoint: false, zoomFirst: true,
    desc: '分层景深，重点是细节放大；一段短故事（三段）'
  }
};

// 没写 variant 的旧场景：轻量版当静物，3D 当室内
export const variantOf = S => VARIANTS[S.variant] ? S.variant : (S.kind === 'light' ? 'still-life' : 'interior');
