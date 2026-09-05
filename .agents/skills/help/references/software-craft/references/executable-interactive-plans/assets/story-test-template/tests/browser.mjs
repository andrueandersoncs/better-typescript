import assert from "node:assert/strict"
import { cp, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"
import { createServer } from "vite"
import ts from "typescript"

const source = dirname(dirname(fileURLToPath(import.meta.url)))
const fixture = await mkdtemp(join(tmpdir(), "story-review-acceptance-"))
let server, browser
const artifactBefore = await readFile(join(source, "review-artifact.json"), "utf8").catch(() => null)
let helperRelativePath, proposedRelativePath, originalProposedSource, inspectedId
const helperSource = `import { Schema } from "effect"

export const inspectionProbe = Schema.brand("ScopeBefore")
`
try {
  await cp(source, fixture, { recursive: true, filter: (path) => !relative(source, path).split(/[\\/]/).some((part) => ["node_modules", "dist", ".git", "review-artifact.json"].includes(part)) })
  await symlink(join(source, "node_modules"), join(fixture, "node_modules"), "dir")
  server = await createServer({ root: fixture, configFile: join(fixture, "vite.config.ts"), server: { host: "127.0.0.1", port: 0, strictPort: false, fs: { allow: [fixture, await realpath(join(fixture, "node_modules"))] } } })
  await server.listen()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true })
  const errors = []
  page.on("pageerror", (error) => { if (error.name !== "Canceled") errors.push(String(error)) })
  await page.goto(server.resolvedUrls.local[0])
  await page.getByRole("button", { name: "Story Tests", exact: true }).waitFor()

  const api = (path, body) => page.evaluate(async ({ path, body }) => {
    const token = document.querySelector('meta[name="review-session-token"]').content
    const response = await fetch(`/api/review/${path}`, { method: body === undefined ? "GET" : "POST", headers: { "content-type": "application/json", "x-review-token": token }, body: body === undefined ? undefined : JSON.stringify(body) })
    return { status: response.status, value: await response.json() }
  }, { path, body })
  const bootstrap = async () => {
    const result = await api("bootstrap")
    assert.equal(result.status, 200)
    return result.value
  }
  const original = await bootstrap()
  const inspected = original.proposedCode.find((item) => item.category === "Schema")
  inspectedId = inspected.id
  proposedRelativePath = inspected.relativePath
  helperRelativePath = join(dirname(proposedRelativePath), "review-helper.ts")
  originalProposedSource = await readFile(join(source, proposedRelativePath), "utf8")
  const parsed = ts.createSourceFile(proposedRelativePath, originalProposedSource, ts.ScriptTarget.Latest, true)
  const declaration = parsed.statements.filter(ts.isVariableStatement).flatMap((statement) => [...statement.declarationList.declarations]).find((item) => item.name.getText(parsed) === inspected.symbol)
  assert.ok(declaration?.initializer, "schema fixture has an initializer")
  const start = declaration.initializer.getStart(parsed), end = declaration.initializer.end
  const preparedSource = `import { inspectionProbe } from "./review-helper"\n${originalProposedSource.slice(0, start)}(${originalProposedSource.slice(start, end)}).pipe(inspectionProbe)${originalProposedSource.slice(end)}`
  await writeFile(join(fixture, helperRelativePath), helperSource)
  await writeFile(join(fixture, proposedRelativePath), preparedSource)
  await page.reload()
  const initial = await bootstrap()
  const sourceFiles = new Map(await Promise.all(initial.files.map(async (file) => [file.relativePath, await readFile(join(fixture, file.relativePath), "utf8")])))
  const selectTest = async (test) => {
    await page.getByRole("button", { name: "Story Tests", exact: true }).click()
    await page.locator(".story-rail button").nth(initial.plan.stories.findIndex((story) => story.id === test.storyId)).click()
    await page.locator(".test-list > button").filter({ hasText: test.label }).click()
  }
  const selectContract = async (item) => {
    await page.getByRole("button", { name: "Proposed Code", exact: true }).click()
    const list = page.locator(".scope-board-node-list")
    if (!await list.evaluate((element) => element.open)) await list.locator("summary").click()
    await list.getByRole("button").filter({ has: page.getByText(item.label, { exact: true }) }).click()
  }
  const runTest = async (test, status = "passed") => {
    await selectTest(test)
    const completed = page.waitForResponse((response) => response.url().endsWith("/api/review/run-test"))
    await page.getByRole("button", { name: "Run test", exact: true }).click()
    const response = await completed
    assert.equal(response.status(), 200)
    const result = await response.json()
    assert.equal(result.testResults[test.id]?.status, status, result.testResults[test.id]?.output)
    await page.locator(`.test-actions .status-badge.${status}`).waitFor()
  }
  const runAll = async () => { for (const test of initial.storyTests) await runTest(test) }
  const edit = async (content) => {
    await page.locator(".monaco-editor textarea").focus()
    await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A")
    await page.keyboard.insertText(content)
  }
  const save = async () => {
    const completed = page.waitForResponse((response) => response.url().endsWith("/api/review/save"))
    await page.getByRole("button", { name: "Save proposed code", exact: true }).click()
    const response = await completed
    assert.equal(response.status(), 200, JSON.stringify(await response.json()))
    return bootstrap()
  }
  const saveItem = async (item, content, loadedHash) => {
    const data = await bootstrap(), file = data.files.find((file) => file.fileId === item.fileId)
    return api("save", { itemType: "storyId" in item ? "test" : "code", itemId: item.id, fileId: item.fileId, loadedHash: loadedHash ?? file.contentHash, content })
  }
  const forged = Object.fromEntries(initial.storyTests.map((test) => [test.id, { status: "passed", output: "client claim" }]))
  assert.equal((await api("export", { decision: "approved", sourceSnapshotId: initial.sourceSnapshotId, testResults: forged })).status, 422, "client claims cannot authorize approval")
  await runAll()
  const helperFile = initial.files.find((file) => file.relativePath === helperRelativePath)
  assert.equal(helperFile?.content, helperSource, "bootstrap captures imported helper bytes")
  const inputBeforeHelperEdit = initial.scopeGraph.nodes.find((node) => node.id === inspectedId)?.proposed?.schema
  await writeFile(join(fixture, helperRelativePath), helperSource.replace("ScopeBefore", "ScopeAfter"))
  const helperEdited = await bootstrap()
  assert.notEqual(helperEdited.sourceSnapshotId, initial.sourceSnapshotId, "helper edits change the source snapshot")
  assert.equal(helperEdited.files.find((file) => file.relativePath === helperRelativePath)?.content, helperSource.replace("ScopeBefore", "ScopeAfter"))
  assert.notDeepEqual(helperEdited.scopeGraph.nodes.find((node) => node.id === inspectedId)?.proposed?.schema, inputBeforeHelperEdit, "helper edits refresh the inspected schema shape")
  assert.equal(helperEdited.testResults[initial.storyTests[0].id], undefined, "helper edits invalidate dependent accepted evidence")
  await writeFile(join(fixture, helperRelativePath), helperSource)
  await page.reload(); await runAll()

  for (const test of initial.storyTests) {
    await selectTest(test)
    await page.locator(".test-editor .dependency-links button").first().click()
    await page.locator(".code-view").waitFor()
    await page.locator(".code-pane .dependency-links").last().getByRole("button").filter({ hasText: test.label }).click()
    await page.locator(".test-editor h2").filter({ hasText: test.label }).waitFor()
  }
  for (const item of initial.proposedCode) {
    await selectContract(item)
    await page.locator(".code-pane h2").filter({ hasText: item.label }).waitFor()
  }

  const test = initial.storyTests[0], testSource = sourceFiles.get(test.relativePath)
  await selectTest(test)
  await page.getByLabel("Review decision").selectOption("approved")
  await edit(`${testSource}\n`)
  assert.equal(await page.getByRole("button", { name: "Proposed Code", exact: true }).isDisabled(), true, "dirty source cannot disappear through navigation")
  assert.equal(await page.getByLabel("Review decision").inputValue(), "", "editing clears the old decision")
  const edited = await save()
  assert.equal(edited.testResults[test.id], undefined)
  for (const other of initial.storyTests.filter((other) => other.id !== test.id)) assert.equal(edited.testResults[other.id]?.status, "passed", "a test edit preserves unrelated passes")
  assert.equal((await api("export", { decision: "approved", sourceSnapshotId: initial.sourceSnapshotId, testResults: forged })).status, 422, "a stale snapshot cannot be approved")
  assert.equal((await api("export", { decision: "approved", sourceSnapshotId: edited.sourceSnapshotId, testResults: forged })).status, 422, "forged passes cannot replace invalidated results")
  assert.equal((await saveItem(test, testSource)).status, 200)
  await page.reload(); await runTest(test)

  const schema = initial.proposedCode.find((item) => item.category === "Schema")
  const schemaFile = sourceFiles.get(schema.relativePath)
  await selectContract(schema)
  await page.getByRole("button", { name: "Edit proposed code", exact: true }).click()
  const offset = schemaFile.split("\n").slice(0, schema.range.start.line - 1).join("\n").length + (schema.range.start.line > 1 ? 1 : 0)
  const schemaPosition = schemaFile.indexOf("Schema.", offset)
  assert.ok(schemaPosition >= offset)
  await edit(`${schemaFile.slice(0, schemaPosition)}Schema .${schemaFile.slice(schemaPosition + 7)}`)
  const schemaEdited = await save()
  if (initial.plan.id === "task-management") assert.equal(schemaEdited.testResults["test.list-tasks"], undefined, "TaskId changes invalidate the Tasks-generated list property transitively")
  assert.equal((await saveItem(schema, schemaFile)).status, 200)
  await page.reload(); await runAll()

  const create = initial.proposedCode.find((item) => item.symbol === "createTask")
  if (create) {
    const content = sourceFiles.get(create.relativePath)
    assert.equal((await saveItem(create, content.replace("service.create(input)", "service.create( input)"))).status, 200)
    const data = await bootstrap()
    assert.equal(data.testResults["test.list-tasks"]?.status, "passed", "an unrelated function edit preserves the list result")
    assert.equal(data.testResults["test.create-task"], undefined)
    assert.equal((await saveItem(create, content)).status, 200)
    await page.reload(); await runAll()
  }

  assert.equal((await saveItem(schema, schemaFile, "stale-loaded-hash")).status, 422)
  assert.equal((await saveItem(test, testSource)).status, 200)
  let data = await bootstrap()
  assert.equal((await api("export", { decision: "approved", sourceSnapshotId: data.sourceSnapshotId })).status, 422, "an unrelated save cannot resolve a failed save")
  assert.equal((await saveItem(schema, schemaFile)).status, 200)

  const beforeRace = await bootstrap()
  const raceHash = beforeRace.files.find((file) => file.fileId === test.fileId).contentHash
  const candidates = [`${testSource}\n`, `${testSource}\n\n`]
  const race = await Promise.all(candidates.map((content) => saveItem(test, content, raceHash)))
  assert.deepEqual(race.map((result) => result.status).sort(), [200, 422], "same-hash saves have one winner")
  const winner = race.findIndex((result) => result.status === 200)
  assert.equal((await bootstrap()).files.find((file) => file.fileId === test.fileId).content, candidates[winner])
  assert.equal((await saveItem(test, testSource)).status, 200)
  await page.reload(); await runTest(test)
  assert.equal((await saveItem(test, `${testSource}\nthrow new Error("acceptance failure probe")\n`)).status, 200)
  await page.reload(); await runTest(test, "failed")
  data = await bootstrap()
  assert.equal((await api("export", { decision: "approved", sourceSnapshotId: data.sourceSnapshotId, testResults: forged })).status, 422, "a current failure blocks approval")
  assert.equal((await saveItem(test, testSource)).status, 200)
  await page.reload(); await runTest(test)

  const fixtureFile = initial.files.find((file) => /export const make\w+/.test(file.content))
  const fixtureSource = sourceFiles.get(fixtureFile.relativePath)
  await writeFile(join(fixture, fixtureFile.relativePath), fixtureSource.replace("export const make", "export  const make"))
  assert.deepEqual((await bootstrap()).testResults, {}, "fixture changes invalidate dependent evidence")
  await writeFile(join(fixture, fixtureFile.relativePath), fixtureSource)
  await page.reload(); await runAll()

  for (const decision of ["approved", "changes-requested"]) {
    await page.getByLabel("Review decision").selectOption(decision)
    const download = page.waitForEvent("download")
    await page.getByRole("button", { name: "Export review", exact: true }).click()
    const saved = await download
    const bytes = await readFile(await saved.path(), "utf8")
    assert.equal(bytes, await readFile(join(fixture, "review-artifact.json"), "utf8"), "durable and downloaded bytes match")
    const artifact = JSON.parse(bytes)
    assert.equal(artifact.decision, decision)
    for (const file of artifact.files) assert.equal(file.content, await readFile(join(fixture, file.relativePath), "utf8"))
  }
  for (const [path, content] of sourceFiles) {
    if (path === helperRelativePath) continue
    assert.equal(await readFile(join(source, path), "utf8"), path === proposedRelativePath ? originalProposedSource : content, "acceptance leaves the real draft unchanged")
  }
  assert.equal(await readFile(join(source, "review-artifact.json"), "utf8").catch(() => null), artifactBefore)
  assert.deepEqual(errors, [])
  console.log(`${initial.plan.id}: isolated browser acceptance passed (editing, transitive/selective invalidation, failed/stale saves, forged evidence, fixture changes, both exact exports)`)
} finally {
  await browser?.close()
  await server?.close()
  await rm(fixture, { recursive: true, force: true })
}
