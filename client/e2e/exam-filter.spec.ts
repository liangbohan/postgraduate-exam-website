import { test, expect } from './fixtures'

/**
 * 真题筛选抽屉交互：悬停展开、勾选年份+题型、应用后 URL 反映 query。
 * 验证移除 Element Plus 后交互正常、排版无塌陷。
 */
test("真题筛选抽屉：勾选条件并应用，URL 携带筛选 query", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto("/#/exams");
  await expect(page.locator("main")).toBeVisible({ timeout: 30_000 });

  // 悬停左侧抽屉触发区展开（左抽屉 aria-label 为触发文案）
  const trigger = page.locator('[aria-label="悬停展开真题筛选"]');
  await trigger.hover();
  await expect(page.locator("text=年份").first()).toBeVisible();

  // 抽屉样式无塌陷：勾选框/输入框可见、可交互
  const searchInput = page.locator('input[placeholder="搜索知识点（回车前往搜索页）"]');
  await expect(searchInput).toBeVisible();
  await expect(searchInput).toBeEnabled();

  // 勾选某一年份（选择出现在 chips 里的一个年份按钮）
  const yearChips = page.locator(".filter-chip");
  const count = await yearChips.count();
  expect(count).toBeGreaterThan(2); // 至少 "全部" + 若干年份
  // 点第 2 个 chip（具体年份，非"全部"）
  await yearChips.nth(1).click();

  // 勾选题型"选择题"
  const typeChips = page.locator('.filter-chip').filter({ hasText: /选择题/ });
  await typeChips.first().click();

  // 检查 URL query 已被写入（replace）
  const url = page.url();
  expect(url).toMatch(/year=\d+/);
  // 题库选项筛选更新（列表仍在渲染，无崩溃）
  await expect(page.locator("main section").first()).toBeVisible();

  expect(consoleErrors.length).toBe(0);
});
