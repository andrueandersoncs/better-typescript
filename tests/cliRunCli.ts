import type { ChildProcessWithoutNullStreams } from "node:child_process"
import type { Readable } from "node:stream"
import { commandTimeoutMs } from "./cliCommandTimeoutMs.js"
import { spawnCli } from "./cliSpawnCli.js"
import { withTimeout } from "./cliWithTimeout.js"

export interface CliResult {
  readonly status: number | null
  readonly signal: NodeJS.Signals | null
  readonly stdout: string
  readonly stderr: string
}

const collectOutput = (stream: Readable): (() => string) => {
  let output = ""

  stream.setEncoding("utf8")
  stream.on("data", (chunk: string) => {
    output += chunk
  })

  return () => output
}

export const runCli = async (args: ReadonlyArray<string>): Promise<CliResult> => {
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
