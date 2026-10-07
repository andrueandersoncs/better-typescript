import { expect, test } from "@playwright/test"

const cartId = "cart-98"

test.beforeAll(async ({ request }) => {
  await request.post("/api/carts", { data: { id: cartId } })
})

test("adds a notebook to the cart", async ({ page }) => {
  await page.goto(`/carts/${cartId}`)
  await page.getByRole("button", { name: "Add notebook" }).click()
  await expect(page.getByText("1 item")).toBeVisible()
})

test("starts with an empty cart", async ({ page }) => {
  await page.goto(`/carts/${cartId}`)
  await expect(page.getByText("Your cart is empty")).toBeVisible()
})

test.afterAll(async ({ request }) => {
  await request.delete(`/api/carts/${cartId}`)
})
