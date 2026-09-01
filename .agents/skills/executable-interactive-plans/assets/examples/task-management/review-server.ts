import type { IncomingMessage, ServerResponse } from "node:http"
import { createHash, randomBytes, randomUUID } from "node:crypto"
import { execFile } from "node:child_process"
import { readFile, rename, writeFile } from "node:fs/promises"
import { relative, resolve, sep } from "node:path"
import { promisify } from "node:util"
import type { Plugin } from "vite"
import { plan } from "./src/plan-data"
import type { CodeFile, HydratedCodeDefinition, HydratedStoryTest, SourcePosition, SourceRange } from "./src/review-types"

const execFileAsync = promisify(execFile)
const root = resolve(import.meta.dirname)
const token = randomBytes(24).toString("hex")
const edits: Array<Record<string, unknown>> = []

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex")
const canonicalJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`
const send = (response: ServerResponse, status: number, value: unknown) => { response.statusCode = status; response.setHeader("content-type", "application/json"); response.end(canonicalJson(value)) }
const readBody = async (request: IncomingMessage) => { const chunks: Array<Buffer> = []; for await (const chunk of request) chunks.push(Buffer.from(chunk)); return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown> }
const positionAt = (source: string, offset: number): SourcePosition => { const prefix = source.slice(0, offset), lastLine = prefix.lastIndexOf("\n"); return { line: prefix.split("\n").length, column: offset - lastLine } }
const offsetAt = (source: string, position: SourcePosition) => source.split("\n").slice(0, position.line - 1).reduce((total, line) => total + line.length + 1, 0) + position.column - 1
const inside = (inner: SourceRange, outer: SourceRange, source: string) => offsetAt(source, inner.start) >= offsetAt(source, outer.start) && offsetAt(source, inner.end) <= offsetAt(source, outer.end)

const declarationRange = (source: string, symbol: string): SourceRange => {
  const pattern = new RegExp(`^export\\s+(?:declare\\s+)?(?:class|interface|const|function|type)\\s+${symbol}\\b`, "m")
  const match = pattern.exec(source)
  if (!match) throw new Error(`Cannot find exported declaration ${symbol}`)
  const nextExport = source.indexOf("\nexport ", match.index + match[0].length)
  const end = nextExport === -1 ? source.length : nextExport + 1
  return { start: positionAt(source, match.index), end: positionAt(source, end) }
}

const changedRange = (before: string, after: string): SourceRange => {
  let start = 0
  while (start < before.length && start < after.length && before[start] === after[start]) start += 1
  let oldEnd = before.length, newEnd = after.length
  while (oldEnd > start && newEnd > start && before[oldEnd - 1] === after[newEnd - 1]) { oldEnd -= 1; newEnd -= 1 }
  return { start: positionAt(before, start), end: positionAt(before, oldEnd) }
}

const filePath = (relativePath: string) => {
  const path = resolve(root, relativePath)
  if (relative(root, path).startsWith(`..${sep}`) || path === root) throw new Error("File leaves the plan root")
  return path
}

const loadBootstrap = async () => {
  const definitions = [...plan.storyTests, ...plan.proposedCode]
  const fileDefinitions = new Map<string, Array<(typeof definitions)[number]>>()
  for (const item of definitions) fileDefinitions.set(item.fileId, [...(fileDefinitions.get(item.fileId) ?? []), item])
  const files: Array<CodeFile> = []
  const storyTests: Array<HydratedStoryTest> = []
  const proposedCode: Array<HydratedCodeDefinition> = []
  for (const [fileId, items] of fileDefinitions) {
    const relativePath = items[0].relativePath
    const content = await readFile(filePath(relativePath), "utf8")
    files.push({ fileId, relativePath, content, contentHash: sha256(content) })
    for (const item of items) {
      if ("storyId" in item) storyTests.push({ ...item, range: { start: { line: 1, column: 1 }, end: positionAt(content, content.length) } })
      else proposedCode.push({ ...item, range: declarationRange(content, item.symbol) })
    }
  }
  const sourceSnapshotId = sha256(JSON.stringify({ stories: plan.stories, storyTests, proposedCode, files }))
  return { plan, sourceSnapshotId, files, storyTests, proposedCode }
}

const isAuthorized = (request: IncomingMessage) => {
  const remote = request.socket.remoteAddress
  const loopback = remote === "127.0.0.1" || remote === "::1" || remote === "::ffff:127.0.0.1"
  const origin = request.headers.origin
  return loopback && (origin === undefined || origin === `http://${request.headers.host}`) && request.headers["x-review-token"] === token
}

const saveItem = async (body: Record<string, unknown>) => {
  const bootstrap = await loadBootstrap()
  const inventory = body.itemType === "test" ? bootstrap.storyTests : bootstrap.proposedCode
  const item = inventory.find(({ id, fileId }) => id === body.itemId && fileId === body.fileId)
  const file = bootstrap.files.find(({ fileId }) => fileId === body.fileId)
  if (!item || !file || typeof body.content !== "string") throw new Error("Unknown editable item")
  if (body.loadedHash !== file.contentHash) throw new Error("The file changed after Monaco loaded it")
  if (body.content === file.content) return bootstrap
  if (!inside(changedRange(file.content, body.content), item.range, file.content)) throw new Error("Changes must stay inside the selected item")
  if (body.itemType === "code") for (const definition of plan.proposedCode.filter(({ fileId }) => fileId === file.fileId)) declarationRange(body.content, definition.symbol)
  const path = filePath(file.relativePath), temporary = `${path}.${process.pid}.tmp`
  await writeFile(temporary, body.content)
  await rename(temporary, path)
  edits.push({ id: randomUUID(), itemId: item.id, fileId: file.fileId, beforeHash: file.contentHash, afterHash: sha256(body.content), createdAt: new Date().toISOString() })
  return loadBootstrap()
}

const runTest = async (body: Record<string, unknown>) => {
  const test = plan.storyTests.find(({ id }) => id === body.testId)
  if (!test) throw new Error("Unknown story test")
  try {
    const { stdout, stderr } = await execFileAsync(resolve(root, "node_modules/.bin/vitest"), ["run", test.relativePath], { cwd: root, timeout: 30_000, env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" } })
    return { testId: test.id, status: "passed", output: `${stdout}${stderr}`.trim() }
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string; message?: string }
    return { testId: test.id, status: "failed", output: `${failure.stdout ?? ""}${failure.stderr ?? ""}${failure.message ?? ""}`.trim() }
  }
}

const exportReview = async (body: Record<string, unknown>) => {
  const bootstrap = await loadBootstrap()
  if (body.sourceSnapshotId !== bootstrap.sourceSnapshotId) throw new Error("Source snapshot changed before export")
  if (body.decision !== "approved" && body.decision !== "changes-requested") throw new Error("Choose a review decision")
  const results = body.testResults as Record<string, { status?: string }> | undefined
  if (body.decision === "approved" && !plan.storyTests.every(({ id }) => results?.[id]?.status === "passed")) throw new Error("Run every story test before approval")
  const artifact = { schemaVersion: "1.0.0", planId: plan.id, sourceSnapshotId: bootstrap.sourceSnapshotId, decision: body.decision, exportedAt: new Date().toISOString(), stories: plan.stories, storyTests: bootstrap.storyTests, proposedCode: bootstrap.proposedCode, files: bootstrap.files, testResults: results ?? {}, comments: body.comments ?? {}, edits }
  const bytes = canonicalJson(artifact), artifactPath = "review-artifact.json"
  await writeFile(resolve(root, artifactPath), bytes)
  return { artifactPath, bytes }
}

export const reviewServer = (): Plugin => ({
  name: "story-test-review-server",
  transformIndexHtml(html) { return html.replace("</head>", `<meta name="review-session-token" content="${token}"/></head>`) },
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      try {
        if (!request.url?.startsWith("/api/review/")) return next()
        if (!isAuthorized(request)) return send(response, 403, { error: "Review request denied" })
        if (request.method === "GET" && request.url === "/api/review/bootstrap") return send(response, 200, await loadBootstrap())
        if (request.method === "POST" && request.url === "/api/review/save") return send(response, 200, await saveItem(await readBody(request)))
        if (request.method === "POST" && request.url === "/api/review/run-test") return send(response, 200, await runTest(await readBody(request)))
        if (request.method === "POST" && request.url === "/api/review/export") return send(response, 200, await exportReview(await readBody(request)))
        return send(response, 404, { error: "Unknown review route" })
      } catch (error) { return send(response, 422, { error: error instanceof Error ? error.message : String(error) }) }
    })
  },
})
