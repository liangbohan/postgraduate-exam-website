import { test, expect, type Page } from './fixtures'

/**
 * 知识页按 book 拆包验证：
 * 进入某教材仅加载该 book chunk，不加载其余三个 book chunk。
 * 切换教材后仅加载对应 chunk。
 */
const BOOK_CHUNKS = [
  "computer-network",
  "data-structures",
  "computer-organization",
  "operating-systems",
];

function collectChunkRequests(page: Page) {
  const loaded: string[] = [];
  page.on("request", (req) => {
    const url = req.url();
    for (const book of BOOK_CHUNKS) {
      if (url.includes(`/assets/${book}-`)) {
        loaded.push(book);
      }
    }
  });
  return loaded;
}

test("知识页按 book 拆包：仅加载当前教材 chunk", async ({ page }) => {
  const loaded = collectChunkRequests(page);

  await page.goto("/#/knowledge/data-structures");
  // 等待知识正文渲染出来
  await expect(
    page.getByTestId("knowledge-article-column"),
  ).toBeVisible({ timeout: 30_000 });

  // 只加载了 data-structures，未加载其余三个 chunk
  const unique = new Set(loaded);
  expect(unique.has("data-structures")).toBe(true);
  for (const book of ["computer-network", "computer-organization", "operating-systems"]) {
    expect(unique.has(book)).toBe(false);
  }

  // 切换教材：仅加载对应新 chunk
  loaded.length = 0;
  await page.goto("/#/knowledge/computer-network");
  await expect(
    page.getByTestId("knowledge-article-column"),
  ).toBeVisible({ timeout: 30_000 });

  const unique2 = new Set(loaded);
  expect(unique2.has("computer-network")).toBe(true);
  expect(unique2.has("data-structures")).toBe(false);
});

test("知识页无控制台 error 与 404 请求", async ({ page }) => {
  const errors: string[] = [];
  const badStatus: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("response", (res) => {
    if (res.status() >= 400) badStatus.push(res.url());
  });

  await page.goto("/#/knowledge/operating-systems");
  await expect(page.getByTestId("knowledge-article-column")).toBeVisible({
    timeout: 30_000,
  });

  expect(badStatus).toEqual([]);
  expect(errors.filter((e) => !e.includes("favicon"))).toEqual([]);
});
