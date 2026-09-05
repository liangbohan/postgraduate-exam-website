import { test, expect } from './fixtures'

/**
 * 全站冒烟：依次访问首页/知识/真题/搜索四页，
 * 断言主视觉元素可见、无控制台 error、无 404 资源请求。
 */
const ROUTES: Array<{ path: string; selector: string; label: string }> = [
  { path: "/#/", selector: ".search-btn", label: "首页" },
  { path: "/#/knowledge", selector: "[data-testid='knowledge-article-column']", label: "知识页" },
  { path: "/#/exams", selector: "main", label: "真题页" },
  { path: "/#/search", selector: ".search-input", label: "搜索页" },
];

test("全站冒烟：四页主视觉可见且无错误", async ({ page }) => {
  const consoleErrors: string[] = [];
  const badStatus: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("response", (res) => {
    if (res.status() >= 400) badStatus.push(`${res.status()} ${res.url()}`);
  });

  for (const route of ROUTES) {
    await test.step(`访问${route.label}`, async () => {
      await page.goto(route.path);
      await expect(page.locator(route.selector).first()).toBeVisible({
        timeout: 30_000,
      });
    });
  }

  expect([
    ...badStatus.filter((s) => !s.includes("favicon")),
  ]).toEqual([]);
  expect(consoleErrors.filter((e) => !e.includes("favicon"))).toEqual([]);
});
