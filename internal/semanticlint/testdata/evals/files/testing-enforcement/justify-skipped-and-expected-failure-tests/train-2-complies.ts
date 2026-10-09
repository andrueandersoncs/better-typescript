import { expect, test } from "@playwright/test"

test.describe("checkout", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/cart?fixture=two-items")
  })

  test("shows the order total", async ({ page }) => {
    await expect(page.getByTestId("order-total")).toHaveText("$84.00")
  })

  test("applies a promo code", async ({ page }) => {
    await page.getByLabel("Promo code").fill("SAVE10")
    await page.getByRole("button", { name: "Apply" }).click()
    await expect(page.getByTestId("order-total")).toHaveText("$75.60")
  })

  test("pays with Apple Pay", async ({ page, browserName }) => {
    test.skip(browserName !== "webkit", "Apple Pay button is only rendered in Safari/WebKit")
    await page.getByRole("button", { name: "Apple Pay" }).click()
    await expect(page.getByText("Payment sheet opened")).toBeVisible()
  })

  test("places the order with a saved card", async ({ page }) => {
    await page.getByRole("radio", { name: "Visa ending 4242" }).check()
    await page.getByRole("button", { name: "Place order" }).click()
    await expect(page).toHaveURL(/\/orders\/\w+/)
  })
})
