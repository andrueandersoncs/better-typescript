import * as assert from "node:assert/strict"
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import type { Readable } from "node:stream"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.dirname(testDirectory)
const noThrowFixturePath = path.join(testDirectory, "fixtures", "no-throw")
const commandTimeoutMs = 30_000
const terminationTimeoutMs = 5_000

interface CliResult {
  readonly status: number | null
  readonly signal: NodeJS.Signals | null
  readonly stdout: string
  readonly stderr: string
}

interface CloseResult {
  readonly status: number | null
  readonly signal: NodeJS.Signals | null
}

const spawnCli = (
  args: ReadonlyArray<string>
): ChildProcessWithoutNullStreams => {
  const nodeArgs = ["--import", "tsx", "packages/cli/src/index.ts", ...args]

  const child = spawn(process.execPath, nodeArgs, {
    cwd: repoRoot,
    env: { ...process.env, NO_COLOR: "1" },
    stdio: "pipe"
  })

  child.stdin.end()

  return child
}

const collectOutput = (stream: Readable): (() => string) => {
  let output = ""

  stream.setEncoding("utf8")
  stream.on("data", (chunk: string) => {
    output += chunk
  })

  return () => output
}

// Subprocess tests still need wall-clock failure deadlines: a hung child has no
// fake clock to advance, while readiness is synchronized through stdout/stderr
// and close events instead of sleeps.
const withTimeout = async <A>(
  promise: Promise<A>,
  description: string,
  timeoutMs: number,
  onTimeout?: () => void
): Promise<A> => {
  let timeout: NodeJS.Timeout | undefined
  const timedOut = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      onTimeout?.()
      reject(new Error(`${description} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timedOut])
  } finally {
    clearTimeout(timeout)
  }
}

const runCli = async (args: ReadonlyArray<string>): Promise<CliResult> => {
  const child = spawnCli(args)
  const stdout = collectOutput(child.stdout)
  const stderr = collectOutput(child.stderr)
  const closed = new Promise<CliResult>((resolve, reject) => {
    child.once("error", reject)
    child.once("close", (status, signal) => {
      resolve({ status, signal, stdout: stdout(), stderr: stderr() })
    })
  })

  return withTimeout(closed, `CLI ${args.join(" ")}`, commandTimeoutMs, () => {
    child.kill("SIGTERM")
  })
}

const copyNoThrowFixture = async (prefix: string): Promise<string> => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix))

  await fs.cp(noThrowFixturePath, tempDir, { recursive: true })

  return tempDir
}

const createSignalFreeFixture = async (): Promise<string> => {
  const tempDir = await copyNoThrowFixture("cli-empty-")
  const sourceDir = path.join(tempDir, "src")

  await fs.rm(sourceDir, { recursive: true, force: true })
  await fs.mkdir(sourceDir, { recursive: true })
  await fs.writeFile(
    path.join(sourceDir, "index.ts"),
    "export const value = 1\n"
  )

  return tempDir
}

const parseNdjson = (
  stdout: string
): ReadonlyArray<Record<string, unknown>> => {
  const lines = stdout.split(/\r?\n/).filter((line) => line.length > 0)

  assert.ok(lines.length > 0, "expected stdout to contain NDJSON events")

  return lines.map((line) => JSON.parse(line) as Record<string, unknown>)
}

const assertAnalyzingStatus = (stderr: string, rootPath: string): void => {
  assert.ok(stderr.includes(`Analyzing ${rootPath}.`))
  assert.doesNotMatch(stderr, /Watching/)
}

const assertWatchingStatus = (stderr: string, rootPath: string): void => {
  assert.ok(stderr.includes(`Watching ${rootPath} for changes.`))
  assert.doesNotMatch(stderr, /Analyzing/)
}

const watchClose = (child: ChildProcessWithoutNullStreams) => {
  let closed = false
  const promise = new Promise<CloseResult>((resolve, reject) => {
    child.once("error", reject)
    child.once("close", (status, signal) => {
      closed = true
      resolve({ status, signal })
    })
  })

  return { isClosed: () => closed, promise }
}

const waitForOutput = async (
  child: ChildProcessWithoutNullStreams,
  stream: Readable,
  description: string,
  predicate: (output: string) => boolean
): Promise<string> => {
  stream.setEncoding("utf8")

  const matched = new Promise<string>((resolve, reject) => {
    let output = ""
    const cleanup = (): void => {
      stream.off("data", onData)
      child.off("error", onError)
      child.off("close", onClose)
    }
    const finish = (value: string): void => {
      cleanup()
      resolve(value)
    }
    const fail = (error: Error): void => {
      cleanup()
      reject(error)
    }
    const onData = (chunk: string): void => {
      output += chunk

      if (predicate(output)) {
        finish(output)
      }
    }
    const onError = (error: Error): void => {
      fail(error)
    }
    const onClose = (
      status: number | null,
      signal: NodeJS.Signals | null
    ): void => {
      fail(
        new Error(
          `${description} was not observed before CLI closed with status ${status} and signal ${signal}`
        )
      )
    }
    stream.on("data", onData)
    child.once("error", onError)
    child.once("close", onClose)
  })

  return withTimeout(matched, description, commandTimeoutMs, () => {
    child.kill("SIGTERM")
  })
}

const waitForFirstStdoutLine = async (
  child: ChildProcessWithoutNullStreams
): Promise<string> => {
  const output = await waitForOutput(
    child,
    child.stdout,
    "initial stdout event",
    (text) => /\r?\n/.test(text)
  )
  const [firstLine] = output.split(/\r?\n/)

  assert.ok(firstLine, "expected initial stdout event line")

  return firstLine
}

const terminateChild = async (
  child: ChildProcessWithoutNullStreams,
  close: Promise<CloseResult>
): Promise<void> => {
  if (child.exitCode !== null || child.signalCode !== null) {
    await close

    return
  }

  child.kill("SIGTERM")

  try {
    await withTimeout(
      close,
      "watch CLI termination",
      terminationTimeoutMs,
      () => child.kill("SIGKILL")
    )
  } catch (error) {
    child.kill("SIGKILL")
    throw error
  }
}

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
      events.some(
        (event) =>
          typeof event.text === "string" && event.text.includes("no-throw")
      ),
      "expected one initial signal event to describe the no-throw rule"
    )
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
})

test("default CLI emits one empty NDJSON event and exits for a signal-free project", async () => {
  const tempDir = await createSignalFreeFixture()

  try {
    const result = await runCli(["--project", tempDir])

    assert.equal(result.status, 0)
    assert.equal(result.signal, null)
    assertAnalyzingStatus(result.stderr, tempDir)
    assert.deepEqual(parseNdjson(result.stdout), [
      { rootPath: tempDir, _tag: "empty" }
    ])
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
