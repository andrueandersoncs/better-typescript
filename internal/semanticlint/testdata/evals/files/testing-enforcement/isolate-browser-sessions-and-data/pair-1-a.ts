import { expect, test, type BrowserContext, type Page } from "@playwright/test"

let context: BrowserContext
let page: Page

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext()
  page = await context.newPage()
  await page.goto("/settings")
})

test.afterAll(async () => {
  await context.close()
})

test("collapses the navigation", async () => {
  await page.getByRole("button", { name: "Collapse navigation" }).click()
  await expect(page.getByRole("navigation")).toHaveAttribute("data-state", "collapsed")
})

test("shows the expanded navigation", async () => {
  await expect(page.getByRole("navigation")).toHaveAttribute("data-state", "expanded")
})
