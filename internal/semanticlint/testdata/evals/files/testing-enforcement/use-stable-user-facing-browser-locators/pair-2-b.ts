import { expect, test } from "@playwright/test"

test("updates the account email", async ({ page }) => {
  await page.goto("/account/profile")
  const emailInput = page.getByLabel("Email address")

  await emailInput.fill("ari@example.com")
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByText("Profile updated")).toBeVisible()
})

test("shows the profile heading", async ({ page }) => {
  await page.goto("/account/profile")
  await expect(page.getByRole("heading", { name: "Your profile" })).toBeVisible()
})
