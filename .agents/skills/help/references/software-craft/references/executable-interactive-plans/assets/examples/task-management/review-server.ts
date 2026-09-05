import type { IncomingMessage, ServerResponse } from "node:http"
import { createHash, randomBytes, randomUUID } from "node:crypto"
import { execFile } from "node:child_process"
import { readFile, rename, writeFile } from "node:fs/promises"
import { relative, resolve, sep } from "node:path"
import { promisify } from "node:util"
import type { Plugin, ViteDevServer } from "vite"
import * as ts from "typescript"
import { plan } from "./src/plan-data"
import { codeDependencies, type CodeFile, type HydratedCodeDefinition, type HydratedStoryTest, type SourcePosition, type SourceRange, type TestResult } from "./src/review-types"
import { buildScopeGraph } from "./src/schema-scope"
import type { ScopeGraph } from "./src/scope-types"

const execFileAsync = promisify(execFile)
const root = resolve(import.meta.dirname)
const token = randomBytes(24).toString("hex")
const edits: Array<Record<string, unknown>> = []
const testResults = new Map<string, TestResult>()
const failedSaves = new Set<string>()
let devServer: ViteDevServer
let scopeCache: { readonly key: string; readonly graph: ScopeGraph } | undefined

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex")
const canonicalJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`
const send = (response: ServerResponse, status: number, value: unknown) => { response.statusCode = status; response.setHeader("content-type", "application/json"); response.end(canonicalJson(value)) }
const readBody = async (request: IncomingMessage) => { const chunks: Array<Buffer> = []; for await (const chunk of request) chunks.push(Buffer.from(chunk)); return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown> }
const positionAt = (source: string, offset: number): SourcePosition => { const prefix = source.slice(0, offset), lastLine = prefix.lastIndexOf("\n"); return { line: prefix.split("\n").length, column: offset - lastLine } }
const offsetAt = (source: string, position: SourcePosition) => source.split("\n").slice(0, position.line - 1).reduce((total, line) => total + line.length + 1, 0) + position.column - 1
const inside = (inner: SourceRange, outer: SourceRange, source: string) => offsetAt(source, inner.start) >= offsetAt(source, outer.start) && offsetAt(source, inner.end) <= offsetAt(source, outer.end)

const declarationRange = (source: string, symbol: string): SourceRange => {
  const parsed = ts.createSourceFile("contract.ts", source, ts.ScriptTarget.Latest, true)
  const declarations = parsed.statements.filter((statement) => {
    if (!ts.canHaveModifiers(statement) || !ts.getModifiers(statement)?.some(({ kind }) => kind === ts.SyntaxKind.ExportKeyword)) return false
    if (ts.isVariableStatement(statement)) return statement.declarationList.declarations.some(({ name }) => ts.isIdentifier(name) && name.text === symbol)
    return (ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isFunctionDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) && statement.name?.text === symbol
  })
  if (!declarations.length) throw new Error(`Cannot find exported declaration ${symbol}`)
  return { start: positionAt(source, declarations[0].getStart(parsed)), end: positionAt(source, declarations.at(-1)!.end) }
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

interface BootstrapData {
  readonly files: ReadonlyArray<CodeFile>
  readonly storyTests: ReadonlyArray<HydratedStoryTest>
  readonly proposedCode: ReadonlyArray<HydratedCodeDefinition>
  readonly proposedImportedSourceFileIds: ReadonlyMap<string, ReadonlyArray<string>>
}

const evidenceHash = (test: HydratedStoryTest, bootstrap: BootstrapData) => {
  const testFile = bootstrap.files.find(({ fileId }) => fileId === test.fileId)!
  const dependencyFileIds = new Set<string>()
  const dependencies = test.proposedCodeIds.map((id) => {
    const definition = bootstrap.proposedCode.find((item) => item.id === id)!
    const file = bootstrap.files.find(({ fileId }) => fileId === definition.fileId)!
    dependencyFileIds.add(file.fileId)
    return { id, content: file.content.slice(offsetAt(file.content, definition.range.start), offsetAt(file.content, definition.range.end)) }
  })
  const importedSources = new Set(test.proposedCodeIds.flatMap((id) => bootstrap.proposedImportedSourceFileIds.get(id) ?? []))
  const sharedSources = [...dependencyFileIds].map((fileId) => {
    const file = bootstrap.files.find((item) => item.fileId === fileId)!
    const ranges = bootstrap.proposedCode.filter((item) => item.fileId === fileId)
      .map(({ range }) => [offsetAt(file.content, range.start), offsetAt(file.content, range.end)] as const)
      .sort(([a], [b]) => a - b)
    let cursor = 0
    const chunks: string[] = []
    for (const [start, end] of ranges) { chunks.push(file.content.slice(cursor, start)); cursor = end }
    chunks.push(file.content.slice(cursor))
    return { fileId, content: chunks.join("") }
  })
  const extraSources = [...importedSources].map((fileId) => {
    const file = bootstrap.files.find((item) => item.fileId === fileId)!
    return { fileId, content: file.content }
  })
  return sha256(JSON.stringify({ test, content: testFile.content, dependencies, sharedSources, extraSources }))
}

const currentResults = (bootstrap: BootstrapData) => {
  for (const test of bootstrap.storyTests) {
    const result = testResults.get(test.id)
    if (result?.evidenceHash !== evidenceHash(test, bootstrap)) testResults.delete(test.id)
  }
  return Object.fromEntries(testResults)
}

const localSourceTree = async (roots: ReadonlyArray<CodeFile>) => {
  const sources = new Map(roots.map(({ relativePath, content }) => [relativePath, content]))
  const imports = new Map<string, ReadonlyArray<string>>()
  const pending = [...sources.keys()]
  for (let cursor = 0; cursor < pending.length; cursor += 1) {
    const relativePath = pending[cursor]
    const importedPaths: string[] = []
    for (const { fileName } of ts.preProcessFile(sources.get(relativePath)!, true, true).importedFiles) {
      const resolution = await devServer.pluginContainer.resolveId(fileName, filePath(relativePath), { ssr: true })
      const id = typeof resolution === "string" ? resolution : resolution?.id
      if (!id || id.startsWith("\0")) continue
      const path = resolve(id.replace(/\?.*$/, ""))
      const importedPath = relative(root, path)
      if (!importedPath || importedPath === ".." || importedPath.startsWith(`..${sep}`) || importedPath.split(sep).includes("node_modules")) continue
      importedPaths.push(importedPath)
      if (!sources.has(importedPath)) {
        sources.set(importedPath, await readFile(path, "utf8"))
        pending.push(importedPath)
      }
    }
    imports.set(relativePath, importedPaths)
  }
  return { sources, imports }
}

const loadBootstrap = async () => {
  const codeById = new Map(plan.proposedCode.map((item) => [item.id, item]))
  const dependencyClosure = (ids: ReadonlyArray<string>) => {
    const seen = new Set<string>()
    const visit = (id: string) => {
      if (seen.has(id)) return
      const item = codeById.get(id)
      if (!item) throw new Error(`Unknown proposed-code dependency ${id}`)
      seen.add(id)
      codeDependencies(item).forEach(visit)
    }
    ids.forEach(visit)
    return [...seen]
  }
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const currentDefinitions = new Set(plan.currentCode)
    const definitions = [...plan.storyTests, ...plan.currentCode, ...plan.proposedCode]
    const fileDefinitions = new Map<string, Array<(typeof definitions)[number]>>()
    for (const item of definitions) fileDefinitions.set(item.fileId, [...(fileDefinitions.get(item.fileId) ?? []), item])
    const files: Array<CodeFile> = []
    const storyTests: Array<HydratedStoryTest> = []
    const currentCode: Array<HydratedCodeDefinition> = []
    const proposedCode: Array<HydratedCodeDefinition> = []
    for (const [fileId, items] of fileDefinitions) {
      const relativePath = items[0].relativePath
      const content = await readFile(filePath(relativePath), "utf8")
      files.push({ fileId, relativePath, content, contentHash: sha256(content) })
      for (const item of items) {
        if ("storyId" in item) storyTests.push({ ...item, proposedCodeIds: dependencyClosure(item.proposedCodeIds), range: { start: { line: 1, column: 1 }, end: positionAt(content, content.length) } })
        else (currentDefinitions.has(item) ? currentCode : proposedCode).push({ ...item, range: declarationRange(content, item.symbol) })
      }
    }
    const roots = (items: ReadonlyArray<HydratedCodeDefinition>) => [...new Map(items.map((item) => {
      const file = files.find(({ fileId }) => fileId === item.fileId)!
      return [file.relativePath, file]
    })).values()]
    const currentRoots = roots(currentCode)
    const proposedRoots = roots(proposedCode)
    const currentTree = await localSourceTree(currentRoots)
    const proposedTree = await localSourceTree(proposedRoots)
    const sourceFileIds = new Map<"current" | "proposed", Map<string, string>>()
    for (const [version, tree, versionRoots] of [["current", currentTree, currentRoots], ["proposed", proposedTree, proposedRoots]] as const) {
      const ids = new Map(versionRoots.map(({ relativePath, fileId }) => [relativePath, fileId]))
      for (const [relativePath, content] of tree.sources) {
        if (ids.has(relativePath)) continue
        const fileId = `source:${version}:${relativePath}`
        if (files.some((file) => file.fileId === fileId)) throw new Error(`Imported source file id conflicts with ${fileId}`)
        ids.set(relativePath, fileId)
        files.push({ fileId, relativePath, content, contentHash: sha256(content) })
      }
      sourceFileIds.set(version, ids)
    }
    const proposedRootFileIds = new Set(proposedRoots.map(({ fileId }) => fileId))
    const proposedImportedSourceFileIds = new Map<string, ReadonlyArray<string>>()
    for (const definition of proposedCode) {
      const importedSourceFileIds = new Set<string>()
      const seen = new Set<string>()
      const visit = (relativePath: string): void => {
        if (seen.has(relativePath)) return
        seen.add(relativePath)
        const fileId = sourceFileIds.get("proposed")!.get(relativePath)!
        if (!proposedRootFileIds.has(fileId)) importedSourceFileIds.add(fileId)
        proposedTree.imports.get(relativePath)?.forEach(visit)
      }
      visit(files.find(({ fileId }) => fileId === definition.fileId)!.relativePath)
      proposedImportedSourceFileIds.set(definition.id, [...importedSourceFileIds])
    }
    const sourceSnapshotId = sha256(JSON.stringify({ stories: plan.stories, storyTests, currentCode, proposedCode, files }))
    const scopeFileIds = new Set([...sourceFileIds.get("current")!.values(), ...sourceFileIds.get("proposed")!.values()])
    const scopeFiles = files.filter((file) => scopeFileIds.has(file.fileId))
    const scopeKey = sha256(JSON.stringify({ currentCode, proposedCode, files: scopeFiles }))
    let graph = scopeCache?.graph
    if (scopeCache?.key !== scopeKey) {
      for (const file of scopeFiles) {
        const modules = devServer.moduleGraph.getModulesByFile(filePath(file.relativePath))
        if (modules) for (const module of modules) devServer.moduleGraph.invalidateModule(module)
      }
      const declarations = (items: ReadonlyArray<HydratedCodeDefinition>) => items.map(({ range, ...definition }) => {
        const file = files.find((item) => item.fileId === definition.fileId)!
        return { definition, source: file.content.slice(offsetAt(file.content, range.start), offsetAt(file.content, range.end)) }
      })
      graph = await buildScopeGraph(declarations(currentCode), declarations(proposedCode), (path) => devServer.ssrLoadModule(`/${path}`))
    }
    const sourcesChanged = (await Promise.all(files.map(async ({ relativePath, contentHash }) => sha256(await readFile(filePath(relativePath), "utf8")) !== contentHash))).some(Boolean)
    if (sourcesChanged) continue
    if (scopeCache?.key !== scopeKey) scopeCache = { key: scopeKey, graph: graph! }
    const bootstrap = { plan, sourceSnapshotId, files, storyTests, currentCode, proposedCode, proposedImportedSourceFileIds, scopeGraph: graph! }
    return { ...bootstrap, testResults: currentResults(bootstrap), failedSaveItemIds: [...failedSaves] }
  }
  throw new Error("Source files changed during scope inspection; retry")
}

const isAuthorized = (request: IncomingMessage) => {
  const remote = request.socket.remoteAddress
  const loopback = remote === "127.0.0.1" || remote === "::1" || remote === "::ffff:127.0.0.1"
  const origin = request.headers.origin
  return loopback && (origin === undefined || origin === `http://${request.headers.host}`) && request.headers["x-review-token"] === token
}

const saveItem = async (body: Record<string, unknown>) => {
  const key = String(body.itemId)
  try {
    const bootstrap = await loadBootstrap()
    const inventory = body.itemType === "test" ? bootstrap.storyTests : bootstrap.proposedCode
    const item = inventory.find(({ id, fileId }) => id === body.itemId && fileId === body.fileId)
    const file = bootstrap.files.find(({ fileId }) => fileId === body.fileId)
    if (!item || !file || typeof body.content !== "string") throw new Error("Unknown editable item")
    if (body.loadedHash !== file.contentHash) throw new Error("The file changed after Monaco loaded it")
    if (body.content !== file.content) {
      if (!inside(changedRange(file.content, body.content), item.range, file.content)) throw new Error("Changes must stay inside the selected item")
      if (body.itemType === "code") for (const definition of plan.proposedCode.filter(({ fileId }) => fileId === file.fileId)) declarationRange(body.content, definition.symbol)
      const path = filePath(file.relativePath), temporary = `${path}.${process.pid}.tmp`
      await writeFile(temporary, body.content)
      await rename(temporary, path)
      edits.push({ id: randomUUID(), itemId: item.id, fileId: file.fileId, beforeHash: file.contentHash, afterHash: sha256(body.content), createdAt: new Date().toISOString() })
    }
    failedSaves.delete(key)
    return loadBootstrap()
  } catch (error) {
    failedSaves.add(key)
    throw error
  }
}

const runTest = async (body: Record<string, unknown>) => {
  const bootstrap = await loadBootstrap()
  const test = bootstrap.storyTests.find(({ id }) => id === body.testId)
  if (!test) throw new Error("Unknown story test")
  const currentEvidenceHash = evidenceHash(test, bootstrap)
  testResults.delete(test.id)
  let result: TestResult
  try {
    const { stdout, stderr } = await execFileAsync(resolve(root, "node_modules/.bin/vitest"), ["run", test.relativePath], { cwd: root, timeout: 30_000, env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" } })
    result = { status: "passed", output: `${stdout}${stderr}`.trim(), evidenceHash: currentEvidenceHash }
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string; message?: string }
    result = { status: "failed", output: `${failure.stdout ?? ""}${failure.stderr ?? ""}${failure.message ?? ""}`.trim(), evidenceHash: currentEvidenceHash }
  }
  testResults.set(test.id, result)
  return loadBootstrap()
}

const exportReview = async (body: Record<string, unknown>) => {
  const bootstrap = await loadBootstrap()
  if (body.sourceSnapshotId !== bootstrap.sourceSnapshotId) throw new Error("Source snapshot changed before export")
  if (body.decision !== "approved" && body.decision !== "changes-requested") throw new Error("Choose a review decision")
  if (body.decision === "approved" && failedSaves.size > 0) throw new Error("Resolve failed saves before approval")
  const results = currentResults(bootstrap)
  if (body.decision === "approved" && !bootstrap.storyTests.every(({ id }) => results[id]?.status === "passed")) throw new Error("Run every current story test before approval")
  const artifact = { schemaVersion: "2.0.0", planId: plan.id, sourceSnapshotId: bootstrap.sourceSnapshotId, decision: body.decision, exportedAt: new Date().toISOString(), stories: plan.stories, storyTests: bootstrap.storyTests, currentCode: bootstrap.currentCode, proposedCode: bootstrap.proposedCode, scopeGraph: bootstrap.scopeGraph, files: bootstrap.files, testResults: results, comments: body.comments ?? {}, edits }
  const bytes = canonicalJson(artifact), artifactPath = "review-artifact.json"
  await writeFile(resolve(root, artifactPath), bytes)
  return { artifactPath, bytes }
}

export const reviewServer = (): Plugin => ({
  name: "story-test-review-server",
  transformIndexHtml(html) { return html.replace("</head>", `<meta name="review-session-token" content="${token}"/></head>`) },
  configureServer(server) {
    devServer = server
    let pending = Promise.resolve()
    server.middlewares.use((request, response, next) => {
      if (!request.url?.startsWith("/api/review/")) return next()
      if (!isAuthorized(request)) return send(response, 403, { error: "Review request denied" })
      const operation = pending.then(async () => {
        try {
          if (request.method === "GET" && request.url === "/api/review/bootstrap") return send(response, 200, await loadBootstrap())
          if (request.method === "POST" && request.url === "/api/review/save") return send(response, 200, await saveItem(await readBody(request)))
          if (request.method === "POST" && request.url === "/api/review/run-test") return send(response, 200, await runTest(await readBody(request)))
          if (request.method === "POST" && request.url === "/api/review/export") return send(response, 200, await exportReview(await readBody(request)))
          return send(response, 404, { error: "Unknown review route" })
        } catch (error) {
          return send(response, 422, { error: error instanceof Error ? error.message : String(error) })
        }
      })
      pending = operation.catch(() => {})
      return operation
    })
  },
})
