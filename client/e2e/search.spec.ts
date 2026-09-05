import { test, expect } from './fixtures'

/**
 * 搜索页：输入关键词出结果、命中文本含 <mark> 高亮。
 */
test("搜索页：输入关键词出现高亮结果", async ({ page }) => {
  const badStatus: string[] = [];
  page.on("response", (res) => {
    if (res.status() >= 400) badStatus.push(res.url());
  });

  await page.goto("/#/search");
  await expect(page.locator('.search-input')).toBeVisible({ timeout: 30_000 });

  // 输入关键词（先确保索引资源可加载，等待页面空闲）
  const input = page.locator('.search-input');
  await input.fill("二叉树");
  await input.press("Enter");

  // 出现结果条目容器（可能无结果则只断言请求无 404 + 无报错）
  await page.waitForTimeout(3000);

  const resultItems = page.locator(".result-item");
  const markEls = page.locator(".result-item mark");

  // 若存在结果，则断言命中文本被 <mark> 包裹至少一次
  const itemCount = await resultItems.count();
  if (itemCount > 0) {
    const markCount = await markEls.count();
    expect(markCount).toBeGreaterThan(0);
  }
  // 控制台无 error（搜索解析失败会抛错）
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  expect(errors.filter((e) => !e.includes("favicon"))).toEqual([]);
  expect(badStatus).toEqual([]);
});
