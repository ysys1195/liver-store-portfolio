import { expect, test } from "@playwright/test";

test("Basic認証・初回Disclaimerからデモ注文完了まで", async ({
  page,
  playwright,
}) => {
  const anonymous = await playwright.request.newContext({
    baseURL: test.info().project.use.baseURL,
    // Playwright otherwise inherits the project's valid Basic credentials.
    httpCredentials: [],
  });
  try {
    const denied = await anonymous.get("/");
    expect(denied.status()).toBe(401);
    expect(denied.headers()["www-authenticate"]).toContain("Basic");
  } finally {
    await anonymous.dispose();
  }

  const unauthorized = await playwright.request.newContext({
    baseURL: test.info().project.use.baseURL,
    httpCredentials: { username: "invalid", password: "invalid" },
  });
  try {
    const denied = await unauthorized.get("/");
    expect(denied.status()).toBe(401);
    expect(denied.headers()["www-authenticate"]).toContain("Basic");
  } finally {
    await unauthorized.dispose();
  }

  await page.goto("/");
  const disclaimer = page.getByRole("dialog", { name: "ご覧いただく前に" });
  await expect(disclaimer).toBeVisible();
  await expect(disclaimer).toContainText("非公式・非商用");
  await disclaimer.getByRole("button", { name: "内容を確認しました" }).click();
  await expect(disclaimer).toBeHidden();

  await page.getByRole("link", { name: "商品を見る", exact: true }).click();
  await expect(page).toHaveURL(/\/products\/yui-midnight-voice$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "夜風ユイ Midnight Voice",
  );
  await page.getByRole("button", { name: "カートに追加" }).click();
  await page.getByRole("link", { name: "カートを見る" }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByRole("list", { name: "カートの商品" })).toContainText(
    "夜風ユイ Midnight Voice",
  );
  await page.getByRole("link", { name: "Demo Checkoutへ" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(
    page.getByRole("heading", { name: "Demo Checkout" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "デモ注文を確定する" }).click();
  await expect(
    page.getByRole("heading", { name: "デモ注文が完了しました" }),
  ).toBeVisible();
  await expect(page.getByText("確定金額：￥1,000")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "デモ注文が完了しました" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
