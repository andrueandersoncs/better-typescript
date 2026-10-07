import { expect, test } from "@playwright/test"

test("submits the checkout form", async ({ page }) => {
  await page.goto("/checkout")
  const submitOrder = page.locator("main > form > div.actions > button:nth-of-type(2)")

  await submitOrder.click()
  await expect(page).toHaveURL(/confirmation/)
})

test("keeps the basket total visible", async ({ page }) => {
  await page.goto("/checkout")
  await expect(page.getByText("Order total")).toBeVisible()
})
