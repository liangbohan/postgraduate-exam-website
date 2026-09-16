<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { content } from "@/content";
import { findSubpointLocationByBlockId } from "@/content/knowledge-articles/registry";
import type { Exam } from "@/types";
import ExamMarkdown from "./ExamMarkdown.vue";
import ExamQuestionTools from "./ExamQuestionTools.vue";

const props = defineProps<{
  exam: Exam;
  menuOpen?: boolean;
}>();
const emit = defineEmits<{
  "toggle-tools": [];
  "close-tools": [];
}>();

const selectedAnswer = ref("");
const result = ref<{
  correct: boolean;
  answer: string;
  explanation: string;
  submitted?: boolean;
}>();
const revealedExam = ref<Exam>();
const error = ref("");
const solutionExpanded = ref(false);
const revealing = ref(false);
const currentExam = computed(() => revealedExam.value || props.exam);

// 翻卡复习模式
const cardMode = ref(false);
const flipped = ref(false);
const answerWasExpanded = ref(false);
let hoverable = true;

watch(
  () => props.exam.id,
  () => {
    selectedAnswer.value = "";
    result.value = undefined;
    revealedExam.value = undefined;
    error.value = "";
    solutionExpanded.value = false;
    revealing.value = false;
    cardMode.value = false;
    flipped.value = false;
    answerWasExpanded.value = false;
  },
);

const linkedKnowledge = computed(() => {
  const seen = new Set<string>();
  const links: Array<{ key: string; title: string; href: string }> = [];
  for (const blockId of currentExam.value.knowledgeBlockIds || []) {
    const location = findSubpointLocationByBlockId(blockId);
    if (!location) continue;
    const key = `${location.pointId}:${location.subpointId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({
      key,
      title: location.subpointTitle,
      href: content.getKnowledgePageHref(location.pointId, location.subpointId),
    });
  }
  return links;
});

const canSubmit = computed(
  () =>
    currentExam.value.questionType === "choice" &&
    !!selectedAnswer.value &&
    !result.value,
);

async function submitAnswer() {
  if (!canSubmit.value) return;
  error.value = "";
  try {
    result.value = {
      ...(await content.submitAnswer(props.exam.id, selectedAnswer.value)),
      submitted: true,
    };
    solutionExpanded.value = true;
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "答案提交失败。";
  }
}

async function revealSolution() {
  error.value = "";
  revealing.value = true;
  try {
    const fullExam = await content.getExam(props.exam.id, true);
    if (!fullExam) {
      error.value = "未找到该题。";
      return;
    }
    revealedExam.value = fullExam;
    result.value = {
      correct: false,
      answer: fullExam.answer || "",
      explanation: fullExam.explanation || "",
      submitted: false,
    };
    solutionExpanded.value = true;
  } catch (reason) {
    error.value =
      reason instanceof Error ? reason.message : "解析没有加载出来。";
  } finally {
    revealing.value = false;
  }
}

type OptionState = "idle" | "selected" | "correct" | "wrong";

function optionState(key: string): OptionState {
  if (result.value) {
    if (key === result.value.answer) return "correct";
    if (selectedAnswer.value === key) return "wrong";
    return "idle";
  }
  return selectedAnswer.value === key ? "selected" : "idle";
}

function optionStatus(key: string): { symbol: string; label: string } | null {
  const state = optionState(key);
  if (state === "correct") return { symbol: "✓", label: "正确答案" };
  if (state === "wrong") return { symbol: "×", label: "你的选择" };
  return null;
}

// —— 翻卡模式 ——
function enterCardMode() {
  if (!result.value) return;
  answerWasExpanded.value = solutionExpanded.value;
  solutionExpanded.value = false;
  cardMode.value = true;
  flipped.value = false;
}

function exitCardMode() {
  cardMode.value = false;
  flipped.value = false;
  solutionExpanded.value = answerWasExpanded.value;
}

function onCardMouseEnter() {
  if (cardMode.value && hoverable) flipped.value = true;
}

function onCardMouseLeave() {
  if (cardMode.value && hoverable) flipped.value = false;
}

function handleCardClick(event: MouseEvent) {
  if (!cardMode.value || hoverable) return;
  const target = event.target as HTMLElement;
  if (target.closest("button, a, input, .katex-display")) return;
  flipped.value = !flipped.value;
}

function onCardKeydown(event: KeyboardEvent) {
  if (!cardMode.value) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    flipped.value = !flipped.value;
  } else if (event.key === "Escape") {
    exitCardMode();
  }
}

function onGlobalKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && cardMode.value) exitCardMode();
}

function updateHoverable() {
  hoverable = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

onMounted(() => {
  updateHoverable();
  document.addEventListener("keydown", onGlobalKeydown);
});
onBeforeUnmount(() => {
  document.removeEventListener("keydown", onGlobalKeydown);
});
</script>

<template>
  <!-- 翻卡复习模式：外观与普通试卷完全一致，仅鼠标悬停时 3D 反转 -->
  <article
    v-if="cardMode"
    :id="`exam-${exam.id}`"
    class="exam-flip-card group relative scroll-mt-24 border-t border-[#e1e6ed] py-7 first:border-t-0 first:pt-8"
    :class="flipped ? 'is-flipped' : ''"
    tabindex="0"
    role="button"
    :aria-label="
      flipped ? '已显示答案，按 Enter 返回题目' : '显示题目，按 Enter 查看答案'
    "
    @mouseenter="onCardMouseEnter"
    @mouseleave="onCardMouseLeave"
    @keydown="onCardKeydown"
    @click="handleCardClick"
  >
    <span class="sr-only" aria-live="polite">{{
      flipped ? "已显示答案" : "已返回题目"
    }}</span>
    <div class="exam-flip-card__inner">
      <!-- 正面：题目（与普通试卷完全一致的布局） -->
      <section
        class="exam-flip-card__face exam-flip-card__front"
        aria-label="题目面"
      >
        <span class="sticky top-0 bg-white flex min-w-0 items-center gap-2 pt-1">
          <b
            class="shrink-0 select-none font-mono text-[15px] font-semibold leading-7 tracking-[-.02em] text-[#12327f]"
            >{{ exam.year }}.{{ exam.number }}</b
          >
        </span>
        <div class="min-w-0 max-w-[1010px]">
          <section aria-label="题干">
            <ExamMarkdown :source="currentExam.stem" />
          </section>

          <div v-if="currentExam.options.length" class="mt-7">
            <button
              v-for="option in currentExam.options"
              :key="option.key"
              type="button"
              class="exam-option"
              :data-state="optionState(option.key)"
              disabled
            >
              <span class="option-key" aria-hidden="true">{{
                option.key
              }}</span>
              <span class="option-content"
                ><ExamMarkdown inline :source="option.text"
              /></span>
              <span
                class="option-status"
                :aria-label="optionStatus(option.key)?.label"
              >
                <template v-if="optionStatus(option.key)">
                  <span class="status-symbol" aria-hidden="true">{{
                    optionStatus(option.key)!.symbol
                  }}</span>
                  <span class="status-label">{{
                    optionStatus(option.key)!.label
                  }}</span>
                </template>
              </span>
            </button>
          </div>
        </div>
      </section>

      <!-- 背面：答案与解析 -->
      <section
        class="exam-flip-card__face exam-flip-card__back"
        aria-label="答案面"
      >
        <h3 class="flip-back-title">答案与解析</h3>
        <div class="text-slate-700">
          <div class="mb-4 flex flex-wrap items-center gap-4 text-sm">
            <b
              v-if="currentExam.questionType === 'choice' && result?.submitted"
              :class="result?.correct ? 'text-emerald-700' : 'text-orange-700'"
              >{{ result?.correct ? "回答正确" : "答案不一致" }}</b
            >
            <span
              ><b class="font-semibold text-[#071225]">标准答案：</b
              >{{ result?.answer || "见解析" }}</span
            >
          </div>
          <ExamMarkdown :source="result?.explanation || ''" />
        </div>

        <div class="mt-5 flex justify-end">
          <button
            type="button"
            class="flip-exit"
            title="退出卡片"
            aria-label="退出卡片"
            @click.stop="exitCardMode"
          >
            退出卡片
          </button>
        </div>
      </section>
    </div>
  </article>

  <!-- 普通试卷状态 -->
  <article
    v-else
    :id="`exam-${exam.id}`"
    class="group relative scroll-mt-24 border-t border-[#e1e6ed] py-7 first:border-t-0 first:pt-8"
  >
    <span class="sticky top-0 bg-white flex justify-between min-w-0 items-center gap-2 pt-1">
      <b
        class="shrink-0 select-none font-mono text-[15px] font-semibold leading-7 tracking-[-.02em] text-[#12327f]"
        >{{ exam.year }}.{{ exam.number }}</b
      >
      <ExamQuestionTools
        :open="!!menuOpen"
        :linked-knowledge="linkedKnowledge"
        :can-submit="canSubmit"
        :has-answer="!!result"
        :answer-expanded="solutionExpanded"
        class="shrink-0"
        @toggle="emit('toggle-tools')"
        @close="emit('close-tools')"
        @reveal="revealSolution"
        @submit="submitAnswer"
        @toggle-answer="solutionExpanded = !solutionExpanded"
      />
    </span>
    <div class="min-w-0 max-w-[1010px]">
      <section aria-label="题干">
        <ExamMarkdown :source="currentExam.stem" />
      </section>

      <div v-if="currentExam.options.length" class="mt-7">
        <button
          v-for="option in currentExam.options"
          :key="option.key"
          type="button"
          class="exam-option"
          :data-state="optionState(option.key)"
          :disabled="!!result"
          :aria-pressed="selectedAnswer === option.key"
          @click="selectedAnswer = option.key"
        >
          <span class="option-key" aria-hidden="true">{{ option.key }}</span>
          <span class="option-content"
            ><ExamMarkdown inline :source="option.text"
          /></span>
          <span
            class="option-status"
            :aria-label="optionStatus(option.key)?.label"
          >
            <template v-if="optionStatus(option.key)">
              <span class="status-symbol" aria-hidden="true">{{
                optionStatus(option.key)!.symbol
              }}</span>
              <span class="status-label">{{
                optionStatus(option.key)!.label
              }}</span>
            </template>
          </span>
        </button>
      </div>

      <p
        v-if="error"
        class="mt-5 border-l-2 border-red-300 bg-red-50/70 px-4 py-3 text-sm text-red-700"
      >
        {{ error }}
      </p>

      <!-- 原位展开的答案与解析 -->
      <div
        class="grid transition-[grid-template-rows,opacity] duration-200 ease-out"
        :class="
          solutionExpanded && result
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0'
        "
      >
        <div class="overflow-hidden">
          <section
            class="relative my-7 border-l-[3px] border-[#8ea7d0] bg-[#f6f8fb] px-[clamp(18px,3vw,30px)] py-6"
          >
            <div class="mb-5 flex flex-wrap items-center gap-4 text-sm">
              <b
                v-if="
                  currentExam.questionType === 'choice' && result?.submitted
                "
                :class="
                  result?.correct ? 'text-emerald-700' : 'text-orange-700'
                "
                >{{ result?.correct ? "回答正确" : "答案不一致" }}</b
              >
              <span class="text-slate-700"
                ><b class="font-semibold text-[#071225]">标准答案：</b
                >{{ result?.answer || "见解析" }}</span
              >
            </div>
            <div class="text-slate-700">
              <ExamMarkdown :source="result?.explanation || ''" />
            </div>

            <!-- 卡片化入口（右上角） -->
            <button
              type="button"
              class="flip-entry absolute right-4 top-4"
              title="将题目和答案制成正反面复习卡，点击后鼠标移动到题目上可查看答案"
              aria-label="将题目和答案制成正反面复习卡，点击后鼠标移动到题目上可查看答案"
              @click="enterCardMode"
            >
              <svg
                class="h-4 w-4"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                aria-hidden="true"
              >
                <rect x="3" y="5" width="12" height="10" rx="1.5" />
                <rect
                  x="5"
                  y="3"
                  width="12"
                  height="10"
                  rx="1.5"
                  fill="#fff"
                />
                <path d="M5 3h12a1 1 0 0 1 1 1v10" />
              </svg>
              卡片化答案
            </button>
          </section>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* —— 选项样式 —— */
.exam-option {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 82px;
  align-items: center;
  column-gap: 14px;
  width: 100%;
  padding: 14px 10px;
  text-align: left;
  background: transparent;
  border: 0;
  border-bottom: 1px solid #e5e9f0;
  color: #27364b;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.exam-option:focus-visible {
  outline: 2px solid rgba(49, 95, 189, 0.45);
  outline-offset: -2px;
}

.exam-option:disabled {
  cursor: default;
}

.exam-option:not(:disabled):hover {
  background: #f7f9fc;
}

.exam-option:not(:disabled):hover .option-key {
  border-color: #8da4cc;
}

.option-key {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  margin-top: 1px;
  border: 1px solid #d0d7e3;
  border-radius: 50%;
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  color: #27364b;
  transition:
    border-color 0.12s ease,
    background-color 0.12s ease,
    color 0.12s ease;
}

.option-content {
  min-width: 0;
}

.option-status {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  min-height: 28px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.exam-option[data-state="selected"] {
  background: rgba(49, 95, 189, 0.055);
}
.exam-option[data-state="selected"] .option-key {
  background: #12327f;
  border-color: #12327f;
  color: #ffffff;
}

.exam-option[data-state="correct"] {
  background: rgba(34, 197, 94, 0.035);
}
.exam-option[data-state="correct"] .option-key {
  background: #217a55;
  border-color: #217a55;
  color: #ffffff;
}
.exam-option[data-state="correct"] .option-status {
  color: #217a55;
}

.exam-option[data-state="wrong"] {
  background: rgba(239, 68, 68, 0.025);
}
.exam-option[data-state="wrong"] .option-key {
  border-color: #b45353;
  color: #b45353;
}
.exam-option[data-state="wrong"] .option-status {
  color: #b45353;
}

@media (max-width: 640px) {
  .exam-option {
    grid-template-columns: 28px minmax(0, 1fr) 22px;
    column-gap: 12px;
    padding: 12px 6px;
  }
  .status-label {
    display: none;
  }
}

/* —— 制成复习卡入口 —— */
.flip-entry {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 36px;
  min-width: 36px;
  padding: 6px 8px;
  font-size: 12px;
  color: #8b99b0;
  background: transparent;
  border: 0;
  cursor: pointer;
  transition: color 0.12s ease;
}
.flip-entry:hover {
  color: #12327f;
}

/* —— 翻卡容器：外观与普通试卷一致，仅提供 3D 透视 —— */
.exam-flip-card {
  perspective: 1400px;
  outline: none;
}

.exam-flip-card:focus-visible {
  outline: 2px solid rgba(49, 95, 189, 0.45);
  outline-offset: 2px;
}

.exam-flip-card__inner {
  display: grid;
  transform-style: preserve-3d;
  transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.exam-flip-card__face {
  grid-area: 1 / 1;
  min-width: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.exam-flip-card__back {
  transform: rotateY(180deg);
  background: #f8fafc;
  border-radius: 4px;
  padding: 18px 20px;
}

.exam-flip-card.is-flipped .exam-flip-card__inner {
  transform: rotateY(180deg);
}

.flip-back-title {
  margin: 0 0 14px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #31559e;
}

.flip-exit {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 36px;
  min-width: 36px;
  padding: 6px 8px;
  margin-left: auto;
  font-size: 12px;
  color: #8b99b0;
  background: transparent;
  border: 0;
  cursor: pointer;
  transition: color 0.12s ease;
}
.flip-exit:hover {
  color: #12327f;
}

@media (prefers-reduced-motion: reduce) {
  .exam-flip-card {
    perspective: none;
  }
  .exam-flip-card__inner {
    transform: none !important;
    transition: opacity 120ms ease;
  }
  .exam-flip-card__face {
    backface-visibility: visible;
    transition: opacity 120ms ease;
  }
  .exam-flip-card__back {
    transform: none !important;
  }
  .exam-flip-card__front {
    opacity: 1;
    pointer-events: auto;
  }
  .exam-flip-card__back {
    opacity: 0;
    pointer-events: none;
  }
  .exam-flip-card.is-flipped .exam-flip-card__front {
    opacity: 0;
    pointer-events: none;
  }
  .exam-flip-card.is-flipped .exam-flip-card__back {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
