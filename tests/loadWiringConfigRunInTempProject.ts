import * as fs from "node:fs/promises"
import * as path from "node:path"
import { testDirectory } from "./loadWiringConfigTestDirectory.js"

const tsconfig = {
  compilerOptions: {
    target: "ES2022",
    module: "NodeNext",
    moduleResolution: "NodeNext",
    lib: ["ES2022"],
    strict: true,
    skipLibCheck: true,
    noEmit: true
  },
  include: ["src/**/*.ts"]
}

export const runInTempProject = async (
  run: (projectDirectory: string) => Promise<void>
): Promise<void> => {
  const projectDirectory = await fs.mkdtemp(path.join(testDirectory, ".tmp-load-wiring-config-"))

  try {
    await fs.mkdir(path.join(projectDirectory, "src"), { recursive: true })
    await fs.writeFile(
      path.join(projectDirectory, "tsconfig.json"),
      `${JSON.stringify(tsconfig, null, 2)}\n`
    )
    await fs.writeFile(
      path.join(projectDirectory, "src", "cases.ts"),
      "export const configured = 1\n"
    )
    await run(projectDirectory)
  } finally {
    await fs.rm(projectDirectory, { recursive: true, force: true })
  }
}
