<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Chapter } from '@/types'

const props = defineProps<{ chapters: Chapter[]; activeSectionId?: string; query?: string; open?: boolean }>()
const emit = defineEmits<{ selectSection: [id: string] }>()

const SIDEBAR_STATE_KEY = 'knowledge-text-index-state:v1'

function loadOpenChapterId() {
  if (typeof window === 'undefined') return ''
  try {
    const saved = JSON.parse(window.localStorage.getItem(SIDEBAR_STATE_KEY) || '{}')
    if (typeof saved.openChapterId === 'string') return saved.openChapterId
    return Array.isArray(saved.openChapters) && typeof saved.openChapters[0] === 'string'
      ? saved.openChapters[0]
      : ''
  } catch {
    return ''
  }
}

const openChapterId = ref(loadOpenChapterId())

const normalizedQuery = computed(() => props.query?.trim().toLowerCase() || '')
const visibleChapters = computed(() => {
  if (!normalizedQuery.value) return props.chapters
  return props.chapters.flatMap((chapter) => {
    if (chapter.title.toLowerCase().includes(normalizedQuery.value)) return [chapter]
    const sections = chapter.sections.filter((section) =>
      section.title.toLowerCase().includes(normalizedQuery.value)
      || section.points.some((point) => point.title.toLowerCase().includes(normalizedQuery.value)),
    )
    return sections.length ? [{ ...chapter, sections }] : []
  })
})

function openChapter(chapterId: string) {
  if (openChapterId.value === chapterId) return
  openChapterId.value = chapterId
  try {
    window.localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify({ openChapterId: chapterId }))
  } catch {
    // Storage may be unavailable in private or embedded browsing contexts.
  }
}

function toggleChapter(chapterId: string) {
  openChapterId.value = openChapterId.value === chapterId ? '' : chapterId
  try {
    window.localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify({ openChapterId: openChapterId.value }))
  } catch {
    // Storage may be unavailable in private or embedded browsing contexts.
  }
}

function syncToActiveSection() {
  if (!props.activeSectionId) return
  const chapter = props.chapters.find((candidate) =>
    candidate.sections.some((section) => section.id === props.activeSectionId),
  )
  if (chapter) openChapterId.value = chapter.id
}

watch(() => props.activeSectionId, syncToActiveSection, { immediate: true })

// 呼出侧栏时定位到当前 section 所在的章，而不是沿用上次手动打开的章；
// 目录搜索进行中则不打断搜索的展开状态。
watch(
  () => props.open,
  (open) => {
    if (!open || normalizedQuery.value) return
    syncToActiveSection()
  },
)
watch(normalizedQuery, () => {
  const first = visibleChapters.value[0]
  if (normalizedQuery.value && first) openChapter(first.id)
})
</script>

<template>
  <nav
    data-testid="knowledge-sidebar"
    class="min-h-0 flex-1 overflow-y-auto px-3 pb-10 pt-3"
    aria-label="知识目录"
  >
    <div class="mb-2 px-3 py-2 font-mono text-[10px] font-bold tracking-[.15em] text-slate-400">CONTENTS / 目录</div>
    <ol class="m-0 list-none space-y-1 p-0">
      <li
        v-for="(chapter, chapterIndex) in visibleChapters"
        :key="chapter.id"
        class="overflow-hidden rounded-[6px]"
        :class="openChapterId === chapter.id ? 'bg-white ring-1 ring-[#e3e9f1]' : ''"
      >
        <button
          type="button"
          class="grid w-full origin-left grid-cols-[34px_minmax(0,1fr)_18px] items-center gap-2 px-3 py-[13px] text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#12327f]"
          :class="openChapterId === chapter.id
            ? 'rounded-t-[6px] bg-[#eef2f8] text-[#071225]'
            : 'rounded-[6px] text-slate-600 hover:bg-[#eef2f8] hover:text-[#071225]'"
          :aria-expanded="openChapterId === chapter.id"
          @click="toggleChapter(chapter.id)"
        >
          <span
            class="font-mono text-[10px] font-semibold tracking-[.14em] transition-colors"
            :class="openChapterId === chapter.id ? 'text-[#12327f]' : 'text-slate-400 group-hover:text-slate-600'"
            aria-hidden="true"
          >{{ String(chapterIndex + 1).padStart(2, '0') }}</span>
          <span class="min-w-0 text-[16px] font-semibold leading-6 tracking-[-.018em]">{{ chapter.title }}</span>
          <span class="text-center text-sm font-light text-slate-400" aria-hidden="true">{{ openChapterId === chapter.id ? '−' : '+' }}</span>
        </button>

        <div
          class="chapter-sections"
          :class="openChapterId === chapter.id ? 'is-open' : ''"
          :aria-hidden="openChapterId === chapter.id ? undefined : 'true'"
        >
          <ul class="chapter-sections-inner m-0 list-none px-1.5 pb-2 pt-1">
            <li v-for="section in chapter.sections" :key="section.id">
              <button
                type="button"
                class="block w-full rounded-[4px] py-2 pl-[46px] pr-3 text-left text-[15px] leading-6 tracking-[-.012em] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#12327f]"
                :class="section.id === activeSectionId
                  ? 'bg-[#e6eefb] font-semibold text-[#12327f]'
                  : 'font-normal text-slate-600 hover:bg-[#f2f5f9] hover:text-[#071225]'"
                :aria-current="section.id === activeSectionId ? 'page' : undefined"
                @click="emit('selectSection', section.id)"
              >
                {{ section.title }}
              </button>
            </li>
          </ul>
        </div>
      </li>
    </ol>
    <p v-if="!visibleChapters.length" class="px-3 py-8 text-sm text-slate-400">没有匹配的章节或知识点。</p>
  </nav>
</template>

<style scoped>
/* 章节折叠：用 grid 行高过渡实现平滑展开/收起 */
.chapter-sections {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  visibility: hidden;
  transition:
    grid-template-rows 0.32s ease,
    opacity 0.28s ease,
    visibility 0s linear 0.32s;
}

.chapter-sections.is-open {
  grid-template-rows: 1fr;
  opacity: 1;
  visibility: visible;
  transition-delay: 0s;
}

.chapter-sections-inner {
  min-height: 0;
  overflow: hidden;
}
</style>
