<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const BACKUP_SITE_URL = 'https://liangbohan.github.io/postgraduate-exam-website/'
const SESSION_DISMISS_KEY = 'backup-site-notice-dismissed'

const isVisible = ref(false)
const hasCopied = ref(false)
const closeButton = ref<HTMLButtonElement | null>(null)
let copyResetTimer: number | undefined

const hasDismissedThisSession = () => {
  try {
    return sessionStorage.getItem(SESSION_DISMISS_KEY) === 'true'
  } catch {
    return false
  }
}

const closeNotice = () => {
  isVisible.value = false

  try {
    sessionStorage.setItem(SESSION_DISMISS_KEY, 'true')
  } catch {
    // 存储不可用时仍允许正常关闭弹窗
  }
}

const fallbackCopy = (text: string) => {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  return copied
}

const copyBackupUrl = async () => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(BACKUP_SITE_URL)
    } else if (!fallbackCopy(BACKUP_SITE_URL)) {
      throw new Error('copy failed')
    }

    hasCopied.value = true
    window.clearTimeout(copyResetTimer)
    copyResetTimer = window.setTimeout(() => {
      hasCopied.value = false
    }, 2200)
  } catch {
    hasCopied.value = false
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isVisible.value) closeNotice()
}

onMounted(async () => {
  if (!hasDismissedThisSession()) {
    isVisible.value = true
    await nextTick()
    closeButton.value?.focus()
  }

  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.clearTimeout(copyResetTimer)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="notice">
      <div v-if="isVisible" class="notice-layer" role="presentation">
        <section
          class="notice-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="backup-notice-title"
          aria-describedby="backup-notice-description"
        >
          <button
            ref="closeButton"
            class="notice-close"
            type="button"
            aria-label="关闭备用站点提醒"
            @click="closeNotice"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m7 7 10 10M17 7 7 17" />
            </svg>
          </button>

          <div class="notice-mark" aria-hidden="true">
            <span>!</span>
          </div>

          <div class="notice-content">
            <p class="notice-eyebrow">站点访问提醒</p>
            <h2 id="backup-notice-title">请收藏备用站点</h2>
            <p id="backup-notice-description" class="notice-description">
              近期域名解析可能出现波动。若当前站点暂时无法访问，可通过下方备用地址继续学习。
            </p>

            <div class="backup-address">
              <a :href="BACKUP_SITE_URL" target="_blank" rel="noopener noreferrer">
                {{ BACKUP_SITE_URL }}
              </a>
              <button class="copy-button" type="button" @click="copyBackupUrl">
                <svg v-if="!hasCopied" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="8" y="8" width="11" height="11" rx="1.5" />
                  <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-10A1.5 1.5 0 0 0 3 5.5v10A1.5 1.5 0 0 0 4.5 17H8" />
                </svg>
                <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m5 12 4 4L19 6" />
                </svg>
                {{ hasCopied ? '已复制' : '复制地址' }}
              </button>
            </div>

            <p class="notice-footnote">建议现在复制保存，或打开备用站点后加入浏览器收藏夹。</p>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.notice-layer {
  position: fixed;
  inset: 0;
  z-index: 10020;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(9 27 52 / 32%);
  backdrop-filter: blur(5px);
}

.notice-dialog {
  position: relative;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 20px;
  width: min(100%, 590px);
  padding: 32px 34px 30px;
  overflow: hidden;
  color: #10233b;
  background: #fff;
  border: 1px solid #d8e1ee;
  border-radius: 8px;
  box-shadow:
    0 24px 70px rgb(15 38 71 / 22%),
    0 2px 8px rgb(15 38 71 / 8%);
}

.notice-dialog::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  content: '';
  background: #2453c7;
}

.notice-mark {
  display: grid;
  place-items: center;
  align-self: start;
  width: 48px;
  height: 48px;
  color: #183f9f;
  background: #edf3ff;
  border: 1px solid #cad9fb;
  border-radius: 50%;
}

.notice-mark span {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

.notice-content {
  min-width: 0;
}

.notice-eyebrow {
  margin: 1px 0 7px;
  color: #2453c7;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .16em;
}

h2 {
  margin: 0;
  color: #0c1f37;
  font-size: clamp(24px, 4vw, 30px);
  font-weight: 750;
  letter-spacing: -.035em;
  line-height: 1.25;
}

.notice-description {
  margin: 14px 0 20px;
  color: #4d6078;
  font-size: 15px;
  line-height: 1.8;
}

.backup-address {
  display: flex;
  align-items: stretch;
  min-width: 0;
  background: #f5f8fc;
  border: 1px solid #dce5f0;
  border-radius: 5px;
  box-shadow: inset 0 1px 3px rgb(34 57 88 / 6%);
}

.backup-address a {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 12px 14px;
  overflow: hidden;
  color: #183f9f;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.backup-address a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.copy-button {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-width: 108px;
  padding: 0 14px;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  background: #183f9f;
  border: 0;
  border-radius: 0 4px 4px 0;
  transition: background-color 160ms ease;
}

.copy-button:hover {
  background: #12327f;
}

.copy-button:focus-visible,
.notice-close:focus-visible,
.backup-address a:focus-visible {
  outline: 3px solid rgb(36 83 199 / 28%);
  outline-offset: 3px;
}

.copy-button svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.notice-footnote {
  margin: 12px 0 0;
  color: #7b899a;
  font-size: 12px;
  line-height: 1.6;
}

.notice-close {
  position: absolute;
  top: 13px;
  right: 13px;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  color: #718096;
  background: transparent;
  border: 0;
  border-radius: 4px;
  transition: color 160ms ease, background-color 160ms ease;
}

.notice-close:hover {
  color: #10233b;
  background: #f0f4f9;
}

.notice-close svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 1.7;
}

.notice-enter-active,
.notice-leave-active {
  transition: opacity 180ms ease;
}

.notice-enter-active .notice-dialog,
.notice-leave-active .notice-dialog {
  transition: transform 220ms cubic-bezier(.22, 1, .36, 1), opacity 180ms ease;
}

.notice-enter-from,
.notice-leave-to,
.notice-enter-from .notice-dialog,
.notice-leave-to .notice-dialog {
  opacity: 0;
}

.notice-enter-from .notice-dialog {
  transform: translateY(10px) scale(.985);
}

.notice-leave-to .notice-dialog {
  transform: translateY(6px) scale(.99);
}

@media (max-width: 560px) {
  .notice-layer {
    align-items: end;
    padding: 12px;
  }

  .notice-dialog {
    grid-template-columns: 38px minmax(0, 1fr);
    gap: 14px;
    padding: 26px 20px 24px;
  }

  .notice-mark {
    width: 38px;
    height: 38px;
  }

  .notice-mark span {
    font-size: 20px;
  }

  .backup-address {
    display: block;
  }

  .backup-address a {
    padding-right: 44px;
  }

  .copy-button {
    width: 100%;
    min-height: 44px;
    border-radius: 0 0 4px 4px;
  }
}
</style>
