import * as assert from "node:assert/strict"
import type { ChildProcessWithoutNullStreams } from "node:child_process"
import { waitForOutput } from "./cliWaitForOutput.js"

export const waitForFirstStdoutLine = async (
  child: ChildProcessWithoutNullStreams
): Promise<string> => {
  const output = await waitForOutput(child, child.stdout, "initial stdout event", (text) =>
    /\r?\n/.test(text)
  )
  const [firstLine] = output.split(/\r?\n/)

  assert.ok(firstLine, "expected initial stdout event line")

  return firstLine
}
