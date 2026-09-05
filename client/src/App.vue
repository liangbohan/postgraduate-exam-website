<script setup lang="ts">
import AppFooter from '@/components/AppFooter.vue'
import BackupSiteNotice from '@/components/BackupSiteNotice.vue'
import { isNavigating } from '@/router'
</script>

<template>
  <RouterView />
  <AppFooter />
  <BackupSiteNotice />

  <!-- 路由跳转时的全屏 loading：顶部进度条 + 中央转圈 -->
  <div
    v-if="isNavigating"
    class="route-loading-overlay"
    aria-live="polite"
    aria-label="正在加载页面"
  >
    <div class="route-loading-topbar"></div>
    <div class="route-loading-center">
      <div class="route-spinner"></div>
      <div class="route-loading-text">正在加载，请稍候…</div>
    </div>
  </div>
</template>

<style scoped>
.route-loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(2px);
}

.route-loading-topbar {
  position: absolute;
  top: 0;
  left: 0;
  height: 3px;
  width: 100%;
  background: linear-gradient(90deg, #2d68ef 0%, #38bdf8 50%, #2d68ef 100%);
  background-size: 200% 100%;
  animation: route-loading-slide 1.2s ease-in-out infinite;
}

@keyframes route-loading-slide {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.route-loading-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.route-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e4eaf2;
  border-top-color: #2d68ef;
  border-radius: 50%;
  animation: route-spin 0.8s linear infinite;
}

@keyframes route-spin {
  to { transform: rotate(360deg); }
}

.route-loading-text {
  font-size: 14px;
  color: #4f6aa0;
  font-weight: 500;
}
</style>
