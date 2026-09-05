import { expect, test as base } from '@playwright/test'

const BACKUP_NOTICE_DISMISS_KEY = 'backup-site-notice-dismissed'

const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript((key) => {
      sessionStorage.setItem(key, 'true')
    }, BACKUP_NOTICE_DISMISS_KEY)

    await use(page)
  },
})

export { expect, test }
export type { Page } from '@playwright/test'
