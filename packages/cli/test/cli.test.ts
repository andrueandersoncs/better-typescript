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
import { copyNoThrowFixture } from "./cliNoThrowFixture.js"
import { createSignalFreeFixture } from "./cliCreateSignalFreeFixture.js"
import { parseNdjson } from "./cliParseNdjson.js"
import { assertAnalyzingStatus } from "./cliAssertAnalyzingStatus.js"

test("CLI reports the published package version", async () => {
  const result = await runCli(["--version"])

  assert.equal(result.status, 0)
  assert.equal(result.stdout.trim(), "better-typescript v0.0.4")
})

test("default CLI emits one NDJSON object per violation and exits successfully", async () => {
  const tempDir = await copyNoThrowFixture("cli-violations-")

  try {
    const result = await runCli(["--project", tempDir])
    const violations = parseNdjson(result.stdout)

    assert.equal(result.status, 0)
    assert.equal(result.signal, null)
    assertAnalyzingStatus(result.stderr, tempDir)
    assert.ok(violations.length > 0)
    assert.ok(violations.some(({ ruleName }) => ruleName === "no-throw"))
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
})

test("CLI loads glob and rule configuration from the project root", async () => {
  const tempDir = await copyNoThrowFixture("cli-config-")

  await fs.writeFile(
    path.join(tempDir, "better-typescript.config.ts"),
    [
      "export default [",
      '  { files: ["src/cases.ts"], rules: { "*": "off", "no-throw": "error" } }',
      "]"
    ].join("\n")
  )

  try {
    const result = await runCli(["--project", tempDir])
    const violations = parseNdjson(result.stdout)

    assert.ok(violations.length > 0)
    assert.ok(
      violations.every(({ level, ruleName }) => level === "error" && ruleName === "no-throw")
    )
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
})

test("default CLI emits the selected no-value-aliases identity", async () => {
  const result = await runCli(["--project", noValueAliasesFixturePath])
  const violations = parseNdjson(result.stdout)
  const aliases = violations.filter(({ ruleName }) => ruleName === "no-value-aliases")

  assert.equal(result.status, 0)
  assertAnalyzingStatus(result.stderr, noValueAliasesFixturePath)
  assert.ok(aliases.length > 0)
  assert.ok(aliases.every(({ message }) => message.includes("Use the referenced value directly.")))
})

test("default CLI prints no violation object for an empty project", async () => {
  const tempDir = await createSignalFreeFixture()

  try {
    const result = await runCli(["--project", tempDir])

    assert.equal(result.status, 0)
    assert.equal(result.signal, null)
    assertAnalyzingStatus(result.stderr, tempDir)
    assert.deepEqual(parseNdjson(result.stdout), [])
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
})

test("pretty CLI output is a projection of the same violation fields", async () => {
  const tempDir = await copyNoThrowFixture("cli-pretty-")

  try {
    const result = await runCli(["--project", tempDir, "--pretty"])

    assert.equal(result.status, 0)
    assertAnalyzingStatus(result.stderr, tempDir)
    assert.match(
      result.stdout,
      /src\/cases\.ts:\d+:\d+ error no-throw Avoid throwing errors with throw\./
    )
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
