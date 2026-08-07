import type { ChildProcessWithoutNullStreams } from "node:child_process"
import type { Readable } from "node:stream"
import { commandTimeoutMs } from "./cliCommandTimeoutMs.js"
import { withTimeout } from "./cliWithTimeout.js"

export const waitForOutput = async (
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
    const onClose = (status: number | null, signal: NodeJS.Signals | null): void => {
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
