import { test, expect } from "@playwright/test";

test("default local Worker reports unavailable development execution without changing tasks", async ({ page, request }) => {
  const title = `Disabled development check ${crypto.randomUUID()}`;
  const created = await request.post("/api/tasks", { data: { title } });
  expect(created.status()).toBe(201);
  const { task } = await created.json();
  try {
    const history = await request.get(`/api/tasks/${task.id}/development-runs`);
    expect(history.status()).toBe(200);
    const body = await history.json();
    // This suite targets ordinary Docker-free development. Enabled execution is
    // verified separately; never start a real paid run as a browser-test side effect.
    test.skip(body.available, "Requires the default execution-disabled local stack.");
    expect(body.runs).toEqual([]);
    expect(body.unavailableReason).toContain("not configured");
    await page.goto("/");
    await page.getByRole("searchbox", { name: "Search tasks" }).fill(title);
    await page.getByRole("button", { name: `Open ${title}`, exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Run checks", exact: true })).not.toBeVisible();
    await dialog.locator("summary").filter({ hasText: /^Development checks/ }).click();
    await expect(dialog.getByText(/Development checks unavailable/)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Run checks", exact: true })).toBeDisabled();
    const refused = await request.post(`/api/tasks/${task.id}/development-runs`, { data: { requestId: crypto.randomUUID() } });
    expect(refused.status()).toBe(503);
    await page.reload();
    await page.getByRole("searchbox", { name: "Search tasks" }).fill(title);
    await page.getByRole("button", { name: `Open ${title}`, exact: true }).click();
    await expect(dialog.getByLabel("Status", { exact: true })).toHaveValue("todo");
    await expect(dialog.getByLabel("Task title", { exact: true })).toHaveValue(title);
  } finally {
    expect((await request.delete(`/api/tasks/${task.id}`)).status()).toBe(204);
  }
});
