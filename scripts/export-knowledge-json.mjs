#!/usr/bin/env node
/**
 * 知识内容 JSON 出口（构建时执行）
 *
 * 把知识树 + 知识正文导出为公开静态 JSON，供外部学习工具（如 phrontis /
 * KnowledgeRecorder）运行时直接 fetch，无需再做插件包快照：
 *   - public/knowledge/index.json        轻量清单：各书文件、sha256、统计
 *   - public/knowledge/<bookId>.json     单本书完整数据：知识树 + pointId 正文
 *   - public/knowledge/assets/<bookId>/  文章 image 块引用的图片资源（按块 ID 命名）
 *
 * 序列化规则：
 *   - paragraph / html / formula / callout 原样保留（html 为内联 SVG 字符串）
 *   - image 的 src 重写为 /knowledge/assets/... 相对站点根路径（源文件一并拷出）
 *   - animation 降级为引用（animationId/ariaLabel/scene/stepCount），
 *     丢弃 render 函数与源码——外部工具渲染占位卡片并深链接回源站
 *   - sourceImport 等构建期元数据一律剥离
 *
 * 深链接约定（配合 useKnowledgeReader）：
 *   /#/knowledge/<bookId>/<sectionId>?point=<pointId>   定位到知识点
 *   /#/knowledge/<bookId>/<sectionId>?block=<kb-*>      定位到内容块
 *
 * 用法：node scripts/export-knowledge-json.mjs
 */
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { mkdirSync, writeFileSync, rmSync, existsSync, copyFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')
const CLIENT_ROOT = path.join(PROJECT_ROOT, 'client')
const OUT_DIR = path.join(CLIENT_ROOT, 'public', 'knowledge')

/* -------- 静态资源 stub：image 块的 src 由 sourceImport 重新解析，这里给占位即可 -------- */
const STUB_EXTS = ['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.woff', '.woff2', '.ttf', '.otf', '.eot', '.css', '.scss', '.less', '.sass', '.wasm']
for (const ext of STUB_EXTS) {
  // eslint-disable-next-line node/no-deprecated-api
  require.extensions[ext] = function stubAssetLoader(module, filename) {
    const fileName = (filename.split(/[\\/]/).pop() || 'asset').replace(/[^A-Za-z0-9_-]/g, '_')
    module.exports = `/_stub_asset/${fileName}`
  }
}

const { createJiti } = require('jiti')
const jiti = createJiti(CLIENT_ROOT, {
  cache: false,
  extensions: ['.ts', '.tsx', '.mjs', '.cjs', '.js', '.json'],
  interopDefault: false,
  alias: { '@': path.join(CLIENT_ROOT, 'src') },
})

const treeMod = jiti('./src/content/knowledge-tree.ts')
const books = treeMod.knowledgeBooks || []
const SCHEMA_VERSION = 1
const generatedAt = new Date().toISOString()

/** 拷贝待写出的资源文件：{ srcAbs, ext }，返回站点根相对 URL */
const pendingAssets = []
const warnings = []

/** 把单个内容块序列化为 JSON 安全结构 */
function serializeBlock(block, bookId) {
  const { sourceImport: _sourceImport, ...rest } = block
  if (block.type === 'image') {
    const importPath = block.sourceImport?.path
    if (!importPath || !importPath.startsWith('@/')) {
      warnings.push(`[${bookId}] image 块 ${block.id} 缺少可解析的 sourceImport.path，src 保留占位值`)
      return rest
    }
    const abs = path.join(CLIENT_ROOT, 'src', importPath.slice(2))
    const ext = path.extname(abs)
    pendingAssets.push({ srcAbs: abs, ext, blockId: block.id, bookId })
    return { ...rest, src: `/knowledge/assets/${bookId}/${block.id}${ext}` }
  }
  if (block.type === 'animation') {
    const anim = block.animation
    if (!anim || typeof anim !== 'object') {
      warnings.push(`[${bookId}] animation 块 ${block.id} 缺少 animation 对象`)
      return rest
    }
    return {
      id: block.id,
      type: 'animation',
      animationId: anim.id,
      ariaLabel: anim.ariaLabel,
      scene: anim.scene,
      stepCount: Array.isArray(anim.steps) ? anim.steps.length : 0,
    }
  }
  return rest
}

function serializeArticle(article, bookId) {
  return {
    pointId: article.pointId,
    subpoints: (article.subpoints || []).map((subpoint) => ({
      id: subpoint.id,
      title: subpoint.title,
      blocks: (subpoint.blocks || []).map((block) => serializeBlock(block, bookId)),
    })),
  }
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex')
}

/* -------- 主流程 -------- */
rmSync(OUT_DIR, { recursive: true, force: true })
mkdirSync(OUT_DIR, { recursive: true })

const manifestEntries = []
let totalBlocks = 0

for (const book of books) {
  const bookModulePath = `./src/content/knowledge-articles/books/${book.id}.ts`
  let articlesByPoint = {}
  if (existsSync(path.join(CLIENT_ROOT, 'src', 'content', 'knowledge-articles', 'books', `${book.id}.ts`))) {
    const mod = jiti(bookModulePath)
    articlesByPoint = mod.articlesByPoint || {}
  } else {
    warnings.push(`教材 ${book.id} 没有对应的 books/${book.id}.ts 正文模块，只导出知识树`)
  }

  const serializedArticles = {}
  let blockCount = 0
  let animationCount = 0
  for (const chapter of book.chapters) {
    for (const section of chapter.sections) {
      for (const point of section.points) {
        const article = articlesByPoint[point.id]
        if (!article) continue
        serializedArticles[point.id] = serializeArticle(article, book.id)
        for (const subpoint of serializedArticles[point.id].subpoints) {
          blockCount += subpoint.blocks.length
          animationCount += subpoint.blocks.filter((b) => b.type === 'animation').length
        }
      }
    }
  }
  totalBlocks += blockCount

  const payload = { schemaVersion: SCHEMA_VERSION, bookId: book.id, book, articles: serializedArticles }
  const contentText = JSON.stringify({ book: payload.book, articles: payload.articles })
  const fileName = `${book.id}.json`
  writeFileSync(path.join(OUT_DIR, fileName), JSON.stringify({ ...payload, generatedAt }), 'utf8')

  manifestEntries.push({
    bookId: book.id,
    title: book.title,
    subject: book.subject,
    file: fileName,
    sha256: sha256(contentText),
    bytes: statSync(path.join(OUT_DIR, fileName)).size,
    pointCount: Object.keys(serializedArticles).length,
    blockCount,
    animationCount,
  })
}

/* -------- 拷贝 image 资源（按块 ID 命名，内容不变时 URL 稳定） -------- */
for (const asset of pendingAssets) {
  const destDir = path.join(OUT_DIR, 'assets', asset.bookId)
  mkdirSync(destDir, { recursive: true })
  copyFileSync(asset.srcAbs, path.join(destDir, `${asset.blockId}${asset.ext}`))
}

writeFileSync(
  path.join(OUT_DIR, 'index.json'),
  JSON.stringify({ schemaVersion: SCHEMA_VERSION, generatedAt, books: manifestEntries }),
  'utf8',
)

/* -------- 报告 -------- */
console.log('================ 知识内容 JSON 出口完成 ================')
for (const entry of manifestEntries) {
  console.log(
    `${entry.title}（${entry.bookId}）：${entry.pointCount} 个知识点 / ${entry.blockCount} 个内容块 / ${entry.animationCount} 个动画，` +
      `${(entry.bytes / 1024).toFixed(1)} KB，sha256=${entry.sha256.slice(0, 12)}…`,
  )
}
if (pendingAssets.length) {
  console.log(`拷贝 image 资源 ${pendingAssets.length} 个 → public/knowledge/assets/`)
}
for (const warning of warnings) {
  console.warn(`警告：${warning}`)
}
console.log(`产物：client/public/knowledge/（index.json + ${manifestEntries.length} 本书）`)
