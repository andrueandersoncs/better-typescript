import { expect, test } from "@playwright/test"

test("opens the March invoice", async ({ page }) => {
  await page.goto("/billing/invoices")
  const marchInvoice = page.getByRole("row", { name: "March invoice" })

  await marchInvoice.click()
  await expect(page.getByRole("heading", { name: "March invoice" })).toBeVisible()
})

test("shows the invoice list", async ({ page }) => {
  await page.goto("/billing/invoices")
  await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible()
})
