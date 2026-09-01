import { spawn } from "node:child_process"
import { chromium } from "playwright"

const server = spawn("npm", ["run", "dev"], { stdio: "pipe", detached: true })
const waitForServer = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch("http://127.0.0.1:4174/")).ok) return } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error("Template server did not start")
}

try {
  await waitForServer()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on("pageerror", (error) => { if (!(error.name === "Canceled" || String(error) === "Canceled: Canceled")) errors.push(String(error)) })
  await page.goto("http://127.0.0.1:4174/")
  await page.getByRole("button", { name: "Story Tests" }).waitFor()
  await page.getByText("greets every generated name", { exact: true }).first().waitFor()
  await page.getByRole("button", { name: "Run test" }).click()
  await page.locator(".test-actions .status-badge.passed").waitFor()
  await page.locator(".tabs").getByRole("button", { name: "Proposed Code" }).click()
  await page.getByText("runExample", { exact: true }).first().waitFor()
  if (errors.length > 0) throw new Error(errors.join("\n"))
  await browser.close()
  console.log("Template browser acceptance passed")
} finally {
  if (server.pid) process.kill(-server.pid, "SIGTERM")
}
