import * as assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { test } from "bun:test"
import { repoRoot } from "./cliRepoRoot.js"
import { noValueAliasesFixturePath } from "./cliNoValueAliasesFixturePath.js"
import { commandTimeoutMs } from "./cliCommandTimeoutMs.js"
import { runCli } from "./cliRunCli.js"
import { spawnCli } from "./cliSpawnCli.js"
import { copyNoThrowFixture } from "./cliNoThrowFixture.js"
import { createSignalFreeFixture } from "./cliCreateSignalFreeFixture.js"
import { parseNdjson } from "./cliParseNdjson.js"
import { assertAnalyzingStatus } from "./cliAssertAnalyzingStatus.js"
import { assertWatchingStatus } from "./cliAssertWatchingStatus.js"
import { watchClose } from "./cliWatchClose.js"
import { waitForOutput } from "./cliWaitForOutput.js"
import { waitForFirstStdoutLine } from "./cliWaitForFirstStdoutLine.js"
import { terminateChild } from "./cliTerminateChild.js"

test("default CLI emits NDJSON initial signal events and exits", async () => {
  const tempDir = await copyNoThrowFixture("cli-signals-")

  try {
    const result = await runCli(["--project", tempDir])

    assert.equal(result.status, 0)
    assert.equal(result.signal, null)
    assertAnalyzingStatus(result.stderr, tempDir)

    const events = parseNdjson(result.stdout)

    assert.ok(events.length > 0, "expected the fixture to emit signal events")
    assert.ok(events.every((event) => event._tag === "signal"))
    assert.ok(
      events.some((event) => typeof event.text === "string" && event.text.includes("no-throw")),
      "expected one initial signal event to describe the no-throw rule"
    )
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
})

test("default CLI emits the no-value-aliases public identity", async () => {
  const result = await runCli(["--project", noValueAliasesFixturePath])

  assert.equal(result.status, 0)
  assert.equal(result.signal, null)
  assertAnalyzingStatus(result.stderr, noValueAliasesFixturePath)

  const events = parseNdjson(result.stdout)
  const aliasEvent = events.find(
    (event) => typeof event.text === "string" && event.text.includes("no-value-aliases")
  )

  assert.ok(aliasEvent)
  assert.match(String(aliasEvent.text), /Do not declare aliases for existing values\./)
  assert.match(String(aliasEvent.text), /Use the referenced value directly\./)
  assert.doesNotMatch(String(aliasEvent.text), /no-export-aliases/)
})

test("default CLI emits one empty NDJSON event and exits for a signal-free project", async () => {
  const tempDir = await createSignalFreeFixture()

  try {
    const result = await runCli(["--project", tempDir])

    assert.equal(result.status, 0)
    assert.equal(result.signal, null)
    assertAnalyzingStatus(result.stderr, tempDir)
    assert.deepEqual(parseNdjson(result.stdout), [{ rootPath: tempDir, _tag: "empty" }])
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
})

test("--watch keeps the CLI alive after its initial report and prints watching status", async () => {
  const tempDir = await copyNoThrowFixture("cli-watch-")
  const child = spawnCli(["--project", tempDir, "--watch"])
  const close = watchClose(child)

  try {
    const [line, stderr] = await Promise.all([
      waitForFirstStdoutLine(child),
      waitForOutput(child, child.stderr, "watching status", (text) =>
        text.includes(`Watching ${tempDir} for changes.`)
      )
    ])
    const event = JSON.parse(line) as Record<string, unknown>

    assert.equal(event._tag, "signal")
    assertWatchingStatus(stderr, tempDir)
    assert.equal(child.exitCode, null)
    assert.equal(child.signalCode, null)
    assert.equal(close.isClosed(), false)
  } finally {
    await terminateChild(child, close.promise)
    await fs.rm(tempDir, { recursive: true, force: true })
  }
})

test("--watch follows the discovered workspace root from a nested invocation", async () => {
  const tempDir = await copyNoThrowFixture("cli-watch-root-")
  const nestedDir = path.join(tempDir, "src", "nested")
  const siblingPath = path.join(tempDir, "src", "allowed.ts")

  await fs.mkdir(nestedDir)

  const child = spawnCli(["--project", nestedDir, "--watch"])
  const close = watchClose(child)

  try {
    await waitForFirstStdoutLine(child)
    await Bun.sleep(300)

    const rerun = waitForOutput(child, child.stdout, "sibling workspace rerun", (text) =>
      text.includes('"_tag":"signal"')
    )

    await fs.appendFile(siblingPath, "\n")
    await rerun

    assert.equal(child.exitCode, null)
    assert.equal(child.signalCode, null)
  } finally {
    await terminateChild(child, close.promise)
    await fs.rm(tempDir, { recursive: true, force: true })
  }
})

test("--pretty one-shot renders the empty report text and exits", async () => {
  const tempDir = await createSignalFreeFixture()

  try {
    const result = await runCli(["--project", tempDir, "--pretty"])

    assert.equal(result.status, 0)
    assert.equal(result.signal, null)
    assertAnalyzingStatus(result.stderr, tempDir)
    assert.equal(result.stdout, `No signals in ${tempDir}.\n\n`)
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
})

test("root package bun link exposes the CLI binary", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cli-link-"))
  const consumerDir = path.join(tempDir, "consumer")
  const bunInstall = path.join(tempDir, "bun-install")
  const bunCache = path.join(tempDir, "bun-cache")
  const linkedCliCommand =
    process.platform === "win32" ? "better-typescript.cmd" : "better-typescript"

  await fs.mkdir(consumerDir)
  await fs.writeFile(
    path.join(consumerDir, "package.json"),
    JSON.stringify({ name: "linked-consumer", private: true })
  )

  const bunEnv = {
    ...process.env,
    BUN_INSTALL: bunInstall,
    BUN_INSTALL_CACHE_DIR: bunCache
  }

  try {
    execFileSync(process.execPath, ["link", "--ignore-scripts"], {
      cwd: repoRoot,
      env: bunEnv,
      stdio: "pipe",
      timeout: commandTimeoutMs
    })
    execFileSync(process.execPath, ["link", "better-typescript", "--ignore-scripts"], {
      cwd: consumerDir,
      env: bunEnv,
      stdio: "pipe",
      timeout: commandTimeoutMs
    })

    const stdout = execFileSync(
      path.join(consumerDir, "node_modules", ".bin", linkedCliCommand),
      ["--help"],
      {
        cwd: consumerDir,
        encoding: "utf8",
        env: { ...process.env, NO_COLOR: "1" },
        stdio: ["ignore", "pipe", "pipe"],
        timeout: commandTimeoutMs
      }
    )

    assert.match(stdout, /USAGE\s+better-typescript \[flags\]/)
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
})
