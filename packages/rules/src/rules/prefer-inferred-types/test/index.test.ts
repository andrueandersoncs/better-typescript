import * as assert from "node:assert/strict"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { test } from "bun:test"
import { Effect } from "effect"
import { lint } from "@better-typescript/core/linter"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { assertRuleFixture } from "../../../../test/assertRuleFixture.js"
import { ruleNamed } from "../../../../test/ruleNamed.js"

test("prefer-inferred-types reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("prefer-inferred-types")))

const writeProjectFile = async (
  projectPath: string,
  fileName: string,
  source: string
): Promise<void> => {
  const filePath = path.join(projectPath, fileName)

  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, source)
}

const sharedPackageJson = JSON.stringify({
  name: "shared",
  version: "1.0.0",
  type: "module",
  types: "index.d.ts"
})

test("prefer-inferred-types accepts normal package redirects", async () => {
  const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "prefer-inferred-types-"))

  try {
    await Promise.all([
      writeProjectFile(
        projectPath,
        "tsconfig.json",
        JSON.stringify({
          compilerOptions: {
            module: "NodeNext",
            moduleResolution: "NodeNext",
            skipLibCheck: true,
            strict: true,
            target: "ES2022"
          },
          include: ["src/**/*.ts"]
        })
      ),
      writeProjectFile(
        projectPath,
        "src/index.ts",
        [
          'import type { Root } from "shared"',
          'import type { Nested } from "outer"',
          "export const value: Root | Nested = { x: 1 }"
        ].join("\n")
      ),
      writeProjectFile(projectPath, "node_modules/shared/package.json", sharedPackageJson),
      writeProjectFile(
        projectPath,
        "node_modules/shared/index.d.ts",
        "export interface Root { readonly x: number }"
      ),
      writeProjectFile(
        projectPath,
        "node_modules/outer/package.json",
        JSON.stringify({ name: "outer", version: "1.0.0", type: "module", types: "index.d.ts" })
      ),
      writeProjectFile(
        projectPath,
        "node_modules/outer/index.d.ts",
        'export type { Nested } from "shared"'
      ),
      writeProjectFile(
        projectPath,
        "node_modules/outer/node_modules/shared/package.json",
        sharedPackageJson
      ),
      writeProjectFile(
        projectPath,
        "node_modules/outer/node_modules/shared/index.d.ts",
        "export interface Nested { readonly x: number }"
      )
    ])

    const project = await Effect.runPromise(loadProject({ projectPath }))
    const loadedProject = project.projects[0]

    assert.ok(loadedProject)
    assert.deepEqual(loadedProject.program.getSemanticDiagnostics(), [])

    const violations = lint({ project, rules: [ruleNamed("prefer-inferred-types")] })

    assert.deepEqual(violations, [])
  } finally {
    await fs.rm(projectPath, { recursive: true, force: true })
  }
})
