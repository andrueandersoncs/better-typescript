import * as assert from "node:assert/strict"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Chunk, Effect, Stream } from "effect"
import {
  reportFromWiring,
  type ReportWiring
} from "../src/kernel.js"
import { loadProject } from "../src/project/loadProject.js"
import {
  loadWiring,
  ProjectWiringError
} from "../src/project/loadWiring.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const configFileName = "better-typescript.config.ts"

const fallbackWiring: ReportWiring = {
  rules: [],
  helpers: [],
  advice: () => Stream.empty
}

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
        'import { Stream } from "effect"',
        "",
        "export default {",
        "  rules: [{ name: \"direct-default-rule\", check: () => Stream.empty }],",
        "  helpers: [],",
        "  advice: () => Stream.empty",
        "}",
        ""
      ].join("\n")
    )

    const wiring = await Effect.runPromise(
      loadWiring(projectDirectory, fallbackWiring)
    )

    assert.deepEqual(
      wiring.rules.map((rule) => rule.name),
      ["direct-default-rule"]
    )
    assert.deepEqual(wiring.helpers, [])
  })
})

test("loadWiring accepts a named zero-argument wiring factory", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        'import { Stream } from "effect"',
        "",
        "export const wiring = () => ({",
        "  rules: [{ name: \"named-factory-rule\", check: () => Stream.empty }],",
        "  helpers: [],",
        "  advice: () => Stream.empty",
        "})",
        ""
      ].join("\n")
    )

    const wiring = await Effect.runPromise(
      loadWiring(projectDirectory, fallbackWiring)
    )

    assert.deepEqual(
      wiring.rules.map((rule) => rule.name),
      ["named-factory-rule"]
    )
  })
})

test("loadWiring accepts a default zero-argument wiring factory", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        'import { Stream } from "effect"',
        "",
        "export default () => ({",
        "  rules: [{ name: \"default-factory-rule\", check: () => Stream.empty }],",
        "  helpers: [],",
        "  advice: () => Stream.empty",
        "})",
        ""
      ].join("\n")
    )

    const wiring = await Effect.runPromise(
      loadWiring(projectDirectory, fallbackWiring)
    )

    assert.deepEqual(
      wiring.rules.map((rule) => rule.name),
      ["default-factory-rule"]
    )
  })
})

test("loadWiring keeps a custom config rule through reportFromWiring", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        'import { Stream } from "effect"',
        'import { Detection, Location } from "../../src/kernel.js"',
        "",
        "export default {",
        "  rules: [",
        "    {",
        "      name: \"config-extra-rule\",",
        "      check: () => Stream.fromIterable([",
        "        new Detection({",
        "          location: new Location({ path: \"src/cases.ts\", line: 1, column: 1 }),",
        "          message: \"configured detection\",",
        "          hint: \"loaded from project config\"",
        "        })",
        "      ])",
        "    }",
        "  ],",
        "  helpers: [],",
        "  advice: () => Stream.empty",
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
        "config-extra-rule",
        "  configured detection",
        "  Hint: loaded from project config",
        "  src/cases.ts:1:1"
      ].join("\n")
    ])
  })
})

test("loadWiring wraps duplicate config names in ProjectWiringError with collisions", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        'import { Stream } from "effect"',
        "",
        "export default {",
        "  rules: [",
        "    { name: \"duplicate-rule\", check: () => Stream.empty },",
        "    { name: \"duplicate-rule\", check: () => Stream.empty }",
        "  ],",
        "  helpers: [",
        "    { name: \"duplicate-helper\", check: () => Stream.empty },",
        "    { name: \"duplicate-helper\", check: () => Stream.empty }",
        "  ],",
        "  advice: () => Stream.empty",
        "}",
        ""
      ].join("\n")
    )

    const error = await loadConfigFailure(projectDirectory)

    assert.ok(error instanceof ProjectWiringError)
    assert.match(error.message, /rules: duplicate-rule/)
    assert.match(error.message, /helpers: duplicate-helper/)
  })
})

test("loadWiring rejects invalid wiring shapes as ProjectWiringError", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(projectDirectory, "export default 42\n")

    const error = await loadConfigFailure(projectDirectory)

    assert.ok(error instanceof ProjectWiringError)
    assert.match(
      error.message,
      /exported wiring must be an object with rules, helpers, and advice/
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
