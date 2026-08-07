import type { ChildProcessWithoutNullStreams } from "node:child_process"
import type { CloseResult } from "./cliCloseResult.js"

export const watchClose = (child: ChildProcessWithoutNullStreams) => {
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
