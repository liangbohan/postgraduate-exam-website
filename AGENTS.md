# AGENTS.md — 给 AI 助手的仓库导航

> 本文件供 AI 助手（Cursor / Codex / Claude Code / Aider 等）快速读懂本仓库。
> 愿景与贡献流程见 `README.md`，本文件只讲技术地图与约定。

## 一句话定位

408 考研电子教材，纯前端静态站点。知识树 + 知识文章 + 历年真题 + 可视化动画 + 全文搜索，无后端。

## 技术栈

- **框架**：Vue 3.5 + TypeScript 5.7 + Vite 8
- **路由**：vue-router 4（history 模式）
- **UI**：Tailwind CSS 4
- **数学**：KaTeX
- **Markdown**：marked + dompurify
- **动画**：manim-web（代码动画）
- **搜索**：minisearch + segmentit（中文分词）+ 自研评分
- **包管理**：npm workspaces，根目录是 orchestrator，`client/` 是实际前端

## 常用命令（在根目录执行）

```bash
npm run dev                # 启动开发服务器（含真题索引重建 + 搜索索引重建）
npm run build              # 校验 + 构建
npm run validate:content   # 只校验知识树与文章注册
npm run validate:exams     # 只校验真题数据
npm run rebuild:exams      # 重新汇总真题 manifest / index
npm run export:knowledge   # 导出知识内容 JSON 出口（public/knowledge/）
npm run build:search-index # 重新生成搜索索引
```

开发服务器默认 http://localhost:5173

## 目录地图

```
postgraduate-exam-website/
├── README.md                     # 愿景 + 贡献流程（面向人）
├── AGENTS.md                     # 本文件（面向 AI）
├── package.json                  # workspaces 根，编排脚本
├── scripts/                      # 构建期脚本（Node）
│   ├── rebuild-exam-index.mjs    #   真题 manifest/index 生成
│   ├── export-knowledge-json.mjs #   知识内容 JSON 出口（public/knowledge/）
│   ├── build-search-index.cjs    #   搜索索引生成
│   ├── validate_knowledge_content.mjs
│   └── validate_exam_content.mjs
└── client/                       # 前端工程
    ├── vite.config.ts
    ├── index.html
    ├── package.json
    └── src/
        ├── main.ts              # 入口：createApp + router + ElementPlus
        ├── App.vue
        ├── router/index.ts      # 6 条路由，见下
        ├── types.ts             # 全局类型：Book/Chapter/Section/KnowledgePoint/Exam
        ├── views/               # 页面级组件
        │   ├── HomePage.vue            # / 首页（搜索框 + 共建者滚动栏）
        │   ├── SearchPage.vue          # /search 搜索结果
        │   ├── KnowledgePage.vue       # /knowledge/:bookId?/:sectionId?
        │   ├── KnowledgeEditorPage.vue # /knowledge-editor/:pointId?
        │   └── ExamPage.vue            # /exams 真题
        ├── components/          # 复用组件（layout/knowledge/exams/icons）
        ├── content/            # ★ 静态内容源
        │   ├── knowledge-tree.ts       #   Book→Chapter→Section→KnowledgePoint 树
        │   ├── index.ts               #   对外统一出口
        │   ├── contributors.ts        #   首页共建者名单（加一行即上滚动栏）
        │   └── knowledge-articles/    #   按 book/chapter/article.ts 组织
        │       ├── registry.ts        #     文章注册表（新增文章必须登记）
        │       ├── types.ts           #     KnowledgeArticleData 类型
        │       ├── editor.ts
        │       └── <book>/<chapter>/<article>.ts
        ├── animations/          # manim-web 代码动画，按 book/chapter 组织
        ├── services/
        │   └── examRepository.ts # 真题读取/筛选/作答（纯前端）
        ├── search/              # 搜索模块
        │   ├── composables/
        │   │   ├── searchKnowledge.ts  # 知识搜索评分核心
        │   │   ├── searchExam.ts
        │   │   └── useSearch.ts
        │   ├── shared.ts
        │   └── types/index.ts
        └── styles/
    └── public/
        ├── exams/<year>/paper.json     # 真题静态题库
        ├── knowledge/                  # 知识内容 JSON 出口（构建期生成，勿跟踪）
        │   ├── index.json              #   各书清单（sha256/统计）
        │   ├── <bookId>.json           #   单本书完整知识树 + 正文
        │   └── assets/<bookId>/        #   image 块引用的图片资源
        └── search/
            └── synonyms.json            # 同义词表
    # 注：408-terms.txt 唯一数据源在 client/src/search/408-terms.txt，
    #    public/search/ 下的副本由 vite.config.ts closeBundle 钩子自动生成。
```

## 路由表

| path | name | 视图 |
| --- | --- | --- |
| `/` | home | HomePage |
| `/search` | search | SearchPage（query: `q`） |
| `/knowledge/:bookId?/:sectionId?` | knowledge | KnowledgePage |
| `/knowledge-editor/:pointId?` | knowledge-editor | KnowledgeEditorPage |
| `/exams` | exams | ExamPage |

## 数据模型

```
Book
 └─ Chapter (layer: TOP/L1/L2/...)
     └─ Section          ← 路由与左侧目录单元，页面按 points 顺序渲染文章
         └─ KnowledgePoint (id, title, summary, importance)
```

- **知识文章**：`knowledge-articles/<book>/<chapter>/<article>.ts` 导出 `KnowledgeArticleData`，在 `registry.ts` 注册一次。
- **内容块 ID**：每个内容块有全局唯一稳定的 `kb-*` ID，被真题 `knowledgeBlockIds` 精确引用。
- **真题**：`public/exams/<year>/paper.json`，由 `scripts/rebuild-exam-index.mjs` 汇总到 `manifest.json` / `index.json`。
- **搜索索引**：`scripts/build-search-index.cjs` 生成 `public/search/search-index.json`（已在 `.gitignore` 中，勿提交）。

## 常见任务的入口

| 想做的事 | 去哪里改 |
| --- | --- |
| 新增 / 修订知识点讲解 | `client/src/content/knowledge-articles/<book>/<chapter>/*.ts` + `registry.ts` |
| 调整知识树结构（章节顺序、层级） | `client/src/content/knowledge-tree.ts` |
| 新增 manim 动画 | `client/src/animations/<book>/<chapter>/*.ts` |
| 加 / 改真题 | `client/public/exams/<year>/paper.json`（改完跑 `npm run rebuild:exams`） |
| 外部工具拉取知识内容 | 读 `client/public/knowledge/`（JSON 出口，由 `npm run export:knowledge` 生成） |
| 改搜索算法 / 评分 | `client/src/search/composables/searchKnowledge.ts` |
| 扩 408 专业词典 | `client/public/search/408-terms.txt`（一行一词） |
| 改同义词 | `client/public/search/synonyms.json` |
| 首页共建者名单 | `client/src/content/contributors.ts` |
| 全局页脚 | `client/src/components/AppFooter.vue` |
| 路由 | `client/src/router/index.ts` |

## 硬约束（勿违反）

- **路由模式**：必须是 `createWebHashHistory()`（GitHub Pages 二级目录下 history 模式刷新会 404）。
- **Vite sourcemap（默认关闭）**：默认不生成 sourcemap（压缩产物体积，约省 16MB）；需调试时传 `VITE_SOURCEMAP=true npm run build -w client`。`vite-plugin-vue-devtools` 已恢复，仅在 dev 模式生效（`apply: 'serve'` 默认），不参与 build，不影响 sourcemap。
- **Vite `base`**：默认 `/`（本机 dev 直接打开 `http://localhost:5173/`）；GitHub Pages 二级目录部署时由 deploy.yml 传 `VITE_BASE_PATH=/postgraduate-exam-website/`；自定义域名时改为 `VITE_BASE_PATH=/` 自行传即可。`index.html` 里所有 `public/` 下的静态资源（favicon、manifest 等）引用必须用 Vite 的 `%BASE_URL%` 占位符，不能写死绝对路径。
- **`launch.json`** 使用简化 `sourceMapPathOverrides`，只保留 `"vite:///src/*": "${workspaceFolder}/client/src/*"`。
- **搜索输入**：最多 20 字符；搜索结果 `topK = 8`。
- **静态 fetch 绝对路径**：前端所有 `fetch('/xxx/...')` 类型的请求（/exams/... /search/...）必须通过 `shared.ts` 里的 `withBase()` 拼接 `import.meta.env.BASE_URL`，否则 GitHub Pages 二级目录下 404。
- **408-terms.txt 只有一份**：唯一源文件是 `client/src/search/408-terms.txt`；`client/public/search/408-terms.txt` 由 vite 插件自动生成，**绝不手动编辑或提交**（已在 .gitignore 忽略）。
- **SVG 图表**：禁止步骤标签、侧边说明框、列号标尺、中文标签、底部结论横幅、箭头标注、无关附文。线段长度必须匹配语义范围（如除号竖线只到被除数行底部）。
- **涉及计算的 SVG**：先在草稿列出每一行数值，确认数学正确后再填坐标。
- **Manim-web 坐标系**：y 轴向上为正，与 SVG 相反；从 SVG 切到 Manim-web 时 `+margin` / `-margin` 极易写反。
- **SVG 竖排文字**：禁止用 `<tspan dy>` 累积（会产生偏移误差），用独立 `<text>` + `dominant-baseline="middle"` + 显式 y 坐标。
- **竖线越过目标元素**：终点 y 必须写到元素 y 值另一侧（向下延伸 = y 减小），否则视觉断开。
- **GBN 时序图**：连续帧无缝衔接（后帧 top = 前帧 bottom）；收到 ACK 后立即续发（ACK 到达 y = 新帧 top）；ACK 编号规则：收到帧 n 返回 ACK(n+1)；用绿色虚线标注「一个发送周期 = Ts + RTT」。
- **选择重传协议**：W_s ≥ W_r，且 W_s + W_r ≤ 2^n（n 为帧序号比特数），W_s = W_r 为通常取值。
- **CSMA/CA 时序图**：严格三列布局（Source / Destination / Other Nodes），SIFS 括号与相邻帧边缘无间隙，DATA 段加粗。

## 编辑风格约定

- 改文件优先用 `Edit` 做精确替换，不要用 `Write` 重写整个文件（除非大改）。
- 中文回复；代码注释中文。
- 不要主动创建 `*.md` 文档，除非用户明确要求。
- 不要给未改动的代码加注释 / 类型注解 / 错误处理。
- 备案号、社交链接等占位值需替换为真实信息时，先与用户确认。

## 本地数据闭环

```
真题 paper.json ──rebuild-exam-index──▶ manifest/index.json ──┐
                                                                ├─▶ 前端运行时读取
知识文章 *.ts ──build-search-index──▶ search-index.json ────────┘
                  ▲
408-terms.txt ───┘
synonyms.json ───┘
```

新增 / 修改内容后，`npm run dev` 与 `npm run build` 会自动重建索引；单独跑可以用 `npm run rebuild:exams` 或 `npm run build:search-index`。

另有面向外部学习工具（如 phrontis）的知识内容 JSON 出口：`npm run export:knowledge` 生成 `client/public/knowledge/`（index.json 清单 + 每本书的完整知识树与正文），随 `npm run dev` / `npm run build` 自动刷新。深链接规则：

- `/#/knowledge/<bookId>?point=<pointId>`：直达知识点（自动反查所在 section 并滚动定位）
- `/#/knowledge/<bookId>/<sectionId>?block=<kb-*>`：直达具体内容块
