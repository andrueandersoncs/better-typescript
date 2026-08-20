import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process"
import { repoRoot } from "./cliRepoRoot.js"

export const spawnCli = (args: ReadonlyArray<string>): ChildProcessWithoutNullStreams => {
  const bunArgs = ["packages/cli/src/index.ts", ...args]

  const child = spawn(process.execPath, bunArgs, {
    cwd: repoRoot,
    env: { ...process.env, NO_COLOR: "1" },
    stdio: "pipe"
  })

  child.stdin.end()

  return child
}
