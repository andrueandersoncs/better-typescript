import { expect, test } from "@playwright/test"

const customer = { id: "customer-42", email: "alex@example.com", city: "Dublin" }

test.beforeEach(async ({ request }) => {
  await request.delete(`/api/customers/${customer.id}`)
  await request.post("/api/customers", { data: customer })
})

test("changes a customer's city", async ({ page }) => {
  await page.goto(`/customers/${customer.id}`)
  await page.getByLabel("City").fill("Leeds")
  await page.getByRole("button", { name: "Save profile" }).click()
  await expect(page.getByText("Profile saved")).toBeVisible()
})

test("displays the original city", async ({ page }) => {
  await page.goto(`/customers/${customer.id}`)
  await expect(page.getByLabel("City")).toHaveValue(customer.city)
})

test.afterAll(async ({ request }) => {
  await request.delete(`/api/customers/${customer.id}`)
})
