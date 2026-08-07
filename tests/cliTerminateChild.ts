import type { ChildProcessWithoutNullStreams } from "node:child_process"
import type { CloseResult } from "./cliCloseResult.js"
import { withTimeout } from "./cliWithTimeout.js"

export const terminationTimeoutMs = 5_000

export const terminateChild = async (
  child: ChildProcessWithoutNullStreams,
  close: Promise<CloseResult>
): Promise<void> => {
  if (child.exitCode !== null || child.signalCode !== null) {
    await close

    return
  }

  child.kill("SIGTERM")

  try {
    await withTimeout(close, "watch CLI termination", terminationTimeoutMs, () =>
      child.kill("SIGKILL")
    )
  } catch (error) {
    child.kill("SIGKILL")
    throw error
  }
}
