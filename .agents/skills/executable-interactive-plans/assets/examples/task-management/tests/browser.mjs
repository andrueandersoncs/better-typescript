import { spawn } from "node:child_process"
import { chromium } from "playwright"
import { readFile, rm, writeFile } from "node:fs/promises"

const server = spawn("npm", ["run", "dev"], { stdio: "pipe", detached: true })
const waitForServer = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch("http://127.0.0.1:4174/")).ok) return } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error("Task story-test server did not start")
}

try {
  await waitForServer()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on("pageerror", (error) => { if (!(error.name === "Canceled" || String(error) === "Canceled: Canceled")) errors.push(String(error)) })
  await page.goto("http://127.0.0.1:4174/")
  await page.getByRole("button", { name: "Story Tests" }).waitFor()

  await page.getByRole("button", { name: "Run test" }).click()
  await page.locator(".test-actions .status-badge.passed").waitFor()
  await page.locator(".story-rail button").nth(1).click()
  await page.getByRole("button", { name: "Run test" }).click()
  await page.locator(".test-actions .status-badge.passed").waitFor()
  await page.locator(".story-rail button").nth(2).click()
  await page.getByRole("button", { name: "Run test" }).click()
  await page.locator(".test-actions .status-badge.passed").waitFor()
  await page.locator(".test-list > button").nth(1).click()
  await page.getByRole("button", { name: "Run test" }).click()
  await page.locator(".test-actions .status-badge.passed").waitFor()
  await page.locator(".test-list > button").nth(0).click()
  await page.getByText("All story tests pass").waitFor()
  await page.screenshot({ path: "task-management-story-tests.png", fullPage: true })

  const testPath = new URL("../src/story-tests/complete-task.test.ts", import.meta.url)
  const taskPath = new URL("../src/domain/task.ts", import.meta.url)
  const originalTest = await readFile(testPath, "utf8")
  const originalTask = await readFile(taskPath, "utf8")

  await page.locator(".monaco-editor").click()
  await page.keyboard.press("Control+End")
  await page.keyboard.insertText(" ")
  await page.getByRole("button", { name: "Save proposed code" }).click()
  await page.getByText("Saved. Run affected tests again.").waitFor()
  await page.locator(".story-rail button").nth(0).getByText("Passed").waitFor()
  await page.locator(".story-rail button").nth(1).getByText("Passed").waitFor()
  await page.locator(".story-rail button").nth(2).getByText("Not run").waitFor()

  const restoreTest = await page.evaluate(async (original) => {
    const token = document.querySelector('meta[name="review-session-token"]')?.getAttribute("content") ?? ""
    const headers = { "content-type": "application/json", "x-review-token": token }
    const bootstrap = await fetch("/api/review/bootstrap", { headers }).then((response) => response.json())
    const file = bootstrap.files.find((entry) => entry.fileId === "file.test.complete-task")
    const response = await fetch("/api/review/save", { method: "POST", headers, body: JSON.stringify({ itemType: "test", itemId: "test.complete-task", fileId: file.fileId, loadedHash: file.contentHash, content: original }) })
    return response.status
  }, originalTest)
  if (restoreTest !== 200) throw new Error(`Test restore failed: ${restoreTest}`)

  await page.locator(".tabs").getByRole("button", { name: "Proposed Code" }).click()
  await page.locator(".code-list button").first().click()
  await page.locator(".monaco-editor .view-lines").getByText("TaskId").first().click()
  await page.keyboard.press("End")
  await page.keyboard.insertText(" ")
  await page.getByRole("button", { name: "Save proposed code" }).click()
  await page.getByText("Saved. Run affected tests again.").waitFor()
  await page.locator(".tabs").getByRole("button", { name: "Story Tests" }).click()
  await page.locator(".story-rail button").nth(0).getByText("Not run").waitFor()
  await page.locator(".story-rail button").nth(1).getByText("Passed").waitFor()
  await page.locator(".story-rail button").nth(2).getByText("Not run").waitFor()
  await page.locator(".tabs").getByRole("button", { name: "Proposed Code" }).click()
  await page.screenshot({ path: "task-management-proposed-code.png", fullPage: true })

  try {
    const integration = await page.evaluate(async (original) => {
      const token = document.querySelector('meta[name="review-session-token"]')?.getAttribute("content") ?? ""
      const headers = { "content-type": "application/json", "x-review-token": token }
      const request = async (path, body) => {
        const response = await fetch(path, { method: body === undefined ? "GET" : "POST", headers, body: body === undefined ? undefined : JSON.stringify(body) })
        return { status: response.status, value: await response.json() }
      }
      const first = (await request("/api/review/bootstrap")).value
      const file = first.files.find((entry) => entry.fileId === "file.task")
      const restored = await request("/api/review/save", { itemType: "code", itemId: "code.task-id", fileId: file.fileId, loadedHash: file.contentHash, content: original })
      const restoredFile = restored.value.files.find((entry) => entry.fileId === "file.task")
      const denied = await request("/api/review/save", { itemType: "code", itemId: "code.task-id", fileId: file.fileId, loadedHash: restoredFile.contentHash, content: original.replace('import { Schema }', 'import { Schema, Effect }') })
      const exported = await request("/api/review/export", { decision: "changes-requested", sourceSnapshotId: restored.value.sourceSnapshotId, testResults: {}, comments: {} })
      return { restored: restored.status, denied: denied.status, artifactPath: exported.value.artifactPath, bytes: exported.value.bytes }
    }, originalTask)
    if (integration.restored !== 200 || integration.denied !== 422) throw new Error(JSON.stringify(integration))
    const durable = await readFile(integration.artifactPath, "utf8")
    if (durable !== integration.bytes) throw new Error("Durable and downloaded export bytes differ")
  } finally {
    await writeFile(testPath, originalTest)
    await writeFile(taskPath, originalTask)
    await rm("review-artifact.json", { force: true })
  }
  if (errors.length > 0) throw new Error(errors.join("\n"))
  await browser.close()
  console.log("Task-management story-test acceptance passed")
} finally {
  if (server.pid) process.kill(-server.pid, "SIGTERM")
}
