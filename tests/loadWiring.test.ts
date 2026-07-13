import * as assert from "node:assert/strict"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Chunk, Effect, Stream } from "effect"
import { type Wiring } from "@better-typescript/core/engine/report/data"
import { reportFromWiring } from "@better-typescript/core/engine/report"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { ProjectWiringError } from "@better-typescript/core/project/loadWiring/data"
import { loadWiring } from "@better-typescript/core/project/loadWiring"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const configFileName = "better-typescript.config.ts"

const fallbackWiring: Wiring = {
  checks: [],
  derive: () => Stream.empty
}

const emptyCheckConfigPreamble = [
  'import { Stream } from "effect"',
  'import { checkFromSubscriptions } from "@better-typescript/core/engine/check"',
  "",
  "const emptyCheck = checkFromSubscriptions(() => [])",
  ""
]

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

const runInTempProject = async (
  run: (projectDirectory: string) => Promise<void>
): Promise<void> => {
  const projectDirectory = await fs.mkdtemp(
    path.join(testDirectory, ".tmp-load-wiring-")
  )

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

const writeConfig = (projectDirectory: string, source: string): Promise<void> =>
  fs.writeFile(path.join(projectDirectory, configFileName), source)

const loadConfigFailure = (
  projectDirectory: string
): Promise<ProjectWiringError> =>
  Effect.runPromise(Effect.flip(loadWiring(projectDirectory, fallbackWiring)))

const collectStream = <A>(
  stream: Stream.Stream<A, Error>
): Promise<ReadonlyArray<A>> =>
  Effect.runPromise(
    Effect.map(Stream.runCollect(stream), Chunk.toReadonlyArray)
  )

test("loadWiring returns fallback wiring when a project has no config", async () => {
  await runInTempProject(async (projectDirectory) => {
    const wiring = await Effect.runPromise(
      loadWiring(projectDirectory, fallbackWiring)
    )

    assert.equal(wiring, fallbackWiring)
  })
})

test("loadWiring accepts a direct default wiring object", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        ...emptyCheckConfigPreamble,
        "export default {",
        '  checks: [{ name: "direct-default-check", check: emptyCheck }],',
        "  derive: () => Stream.empty",
        "}",
        ""
      ].join("\n")
    )

    const wiring = await Effect.runPromise(
      loadWiring(projectDirectory, fallbackWiring)
    )

    assert.deepEqual(
      wiring.checks.map((check) => check.name),
      ["direct-default-check"]
    )
    assert.deepEqual(
      wiring.checks.map((check) => check.reported),
      [true]
    )
  })
})

test("loadWiring preserves configured check paths", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        ...emptyCheckConfigPreamble,
        "export default {",
        '  checks: [{ name: "scoped-check", paths: ["src/cases.ts"], check: emptyCheck }],',
        "  derive: () => Stream.empty",
        "}",
        ""
      ].join("\n")
    )

    const wiring = await Effect.runPromise(
      loadWiring(projectDirectory, fallbackWiring)
    )

    assert.deepEqual(wiring.checks[0]?.paths, ["src/cases.ts"])
  })
})

test("loadWiring rejects non-path check scopes", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        ...emptyCheckConfigPreamble,
        "export default {",
        '  checks: [{ name: "invalid-scope", paths: ["src", "  "], check: emptyCheck }],',
        "  derive: () => Stream.empty",
        "}",
        ""
      ].join("\n")
    )

    const error = await loadConfigFailure(projectDirectory)

    assert.ok(error instanceof ProjectWiringError)
    assert.match(error.message, /paths\?: string\[\]/)
  })
})

test("loadWiring accepts a named zero-argument wiring factory", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        ...emptyCheckConfigPreamble,
        "export const wiring = () => ({",
        '  checks: [{ name: "named-factory-check", check: emptyCheck }],',
        "  derive: () => Stream.empty",
        "})",
        ""
      ].join("\n")
    )

    const wiring = await Effect.runPromise(
      loadWiring(projectDirectory, fallbackWiring)
    )

    assert.deepEqual(
      wiring.checks.map((check) => check.name),
      ["named-factory-check"]
    )
  })
})

test("loadWiring accepts a default zero-argument wiring factory", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        ...emptyCheckConfigPreamble,
        "export default () => ({",
        '  checks: [{ name: "default-factory-check", check: emptyCheck }],',
        "  derive: () => Stream.empty",
        "})",
        ""
      ].join("\n")
    )

    const wiring = await Effect.runPromise(
      loadWiring(projectDirectory, fallbackWiring)
    )

    assert.deepEqual(
      wiring.checks.map((check) => check.name),
      ["default-factory-check"]
    )
  })
})

test("loadWiring keeps a custom config check through reportFromWiring", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        'import { Stream } from "effect"',
        'import { fileCheck } from "@better-typescript/core/engine/check"',
        'import { Detection, Location } from "@better-typescript/core/engine/location/data"',
        "",
        "export default {",
        "  checks: [",
        "    {",
        '      name: "config-extra-check",',
        "      check: fileCheck(() => [",
        "        new Detection({",
        '          location: new Location({ path: "src/cases.ts", line: 1, column: 1 }),',
        '          message: "configured detection",',
        '          hint: "loaded from project config"',
        "        })",
        "      ])",
        "    }",
        "  ],",
        "  derive: () => Stream.empty",
        "}",
        ""
      ].join("\n")
    )

    const wiring = await Effect.runPromise(
      loadWiring(projectDirectory, fallbackWiring)
    )
    const workspace = await Effect.runPromise(loadProject(projectDirectory))
    const blocks = await collectStream(reportFromWiring(wiring)(workspace))

    assert.deepEqual(blocks, [
      [
        "config-extra-check",
        "  configured detection",
        "  Hint: loaded from project config",
        "  src/cases.ts:1:1"
      ].join("\n")
    ])
  })
})

test("loadWiring wraps duplicate config check names in ProjectWiringError with collisions", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        ...emptyCheckConfigPreamble,
        "export default {",
        "  checks: [",
        '    { name: "duplicate-check", check: emptyCheck },',
        '    { name: "duplicate-check", check: emptyCheck }',
        "  ],",
        "  derive: () => Stream.empty",
        "}",
        ""
      ].join("\n")
    )

    const error = await loadConfigFailure(projectDirectory)

    assert.ok(error instanceof ProjectWiringError)
    assert.match(error.message, /Duplicate check names: duplicate-check/)
  })
})

test("loadWiring rejects duplicate names across reported and silent checks", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        ...emptyCheckConfigPreamble,
        "export default {",
        "  checks: [",
        '    { name: "global-duplicate", check: emptyCheck },',
        '    { name: "global-duplicate", reported: false, check: emptyCheck }',
        "  ],",
        "  derive: () => Stream.empty",
        "}",
        ""
      ].join("\n")
    )

    const error = await loadConfigFailure(projectDirectory)

    assert.ok(error instanceof ProjectWiringError)
    assert.match(error.message, /Duplicate check names: global-duplicate/)
  })
})

test("loadWiring rejects invalid wiring shapes as ProjectWiringError", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(projectDirectory, "export default 42\n")

    const error = await loadConfigFailure(projectDirectory)
    assert.ok(error instanceof ProjectWiringError)

    assert.match(
      error.message,
      /exported wiring must be an object with checks and derive/
    )
  })
})

test("loadWiring rejects throwing config factories as ProjectWiringError", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        "export default () => {",
        '  throw new Error("factory boom")',
        "}",
        ""
      ].join("\n")
    )

    const error = await loadConfigFailure(projectDirectory)

    assert.ok(error instanceof ProjectWiringError)
    assert.match(error.message, /default export factory failed: factory boom/)
  })
})

test("loadWiring rejects syntax-invalid config modules as ProjectWiringError", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(projectDirectory, "export default {\n")

    const error = await loadConfigFailure(projectDirectory)

    assert.ok(error instanceof ProjectWiringError)
    assert.match(error.message, /failed to load config module:/)
  })
})
