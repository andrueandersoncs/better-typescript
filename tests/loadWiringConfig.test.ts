import * as assert from "node:assert/strict"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Chunk, Effect, Stream } from "effect"
import { defineConfig } from "@better-typescript/core/engine/report"
import { reportFromConfig } from "@better-typescript/core/project/loadProject"
import type { Wiring, WiringConfig } from "@better-typescript/core/engine/report/data"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { ProjectWiringConfigError } from "@better-typescript/core/project/loadWiringConfig/data"
import { loadWiringConfig } from "@better-typescript/core/project/loadWiringConfig"
import { checkFromSubscriptions, fileCheck, locateNode } from "@better-typescript/core/engine/check"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const configFileName = "better-typescript.config.ts"

const fallbackWiring: Wiring = {
  checks: [],
  derive: () => Stream.empty
}

const fallbackConfig: WiringConfig = defineConfig([{ files: ["**/*"], wiring: fallbackWiring }])

const emptyCheckConfigPreamble = [
  'import { Stream } from "effect"',
  "",
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

const writeConfig = (projectDirectory: string, source: string): Promise<void> =>
  fs.writeFile(path.join(projectDirectory, configFileName), source)

const loadConfigFailure = (projectDirectory: string): Promise<ProjectWiringConfigError> =>
  Effect.runPromise(Effect.flip(loadWiringConfig(projectDirectory, fallbackConfig)))

const collectStream = <A>(stream: Stream.Stream<A, Error>): Promise<ReadonlyArray<A>> =>
  Effect.runPromise(Effect.map(Stream.runCollect(stream), Chunk.toReadonlyArray))

test("loadWiringConfig returns fallback config when a project has no config", async () => {
  await runInTempProject(async (projectDirectory) => {
    const config = await Effect.runPromise(loadWiringConfig(projectDirectory, fallbackConfig))

    assert.equal(config, fallbackConfig)
  })
})

test("loadWiringConfig accepts arbitrary glob wiring entries", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        ...emptyCheckConfigPreamble,
        "export default [",
        "  {",
        '    files: ["src/**/*.{ts,tsx}", "scripts/*.mts"],',
        "    wiring: {",
        '      checks: [{ name: "source-check", check: emptyCheck }],',
        "      derive: () => Stream.empty",
        "    }",
        "  },",
        "  {",
        '    files: ["tests/**/*.ts"],',
        "    wiring: {",
        '      checks: [{ name: "test-helper", reported: false, check: emptyCheck }],',
        "      derive: () => Stream.empty",
        "    }",
        "  }",
        "]",
        ""
      ].join("\n")
    )

    const config = await Effect.runPromise(loadWiringConfig(projectDirectory, fallbackConfig))

    assert.equal(config.length, 2)
    assert.deepEqual(config[0]?.files, ["src/**/*.{ts,tsx}", "scripts/*.mts"])
    assert.deepEqual(config[1]?.files, ["tests/**/*.ts"])
    assert.deepEqual(
      config.map((entry) => entry.wiring.checks[0]?.name),
      ["source-check", "test-helper"]
    )
    assert.deepEqual(
      config.map((entry) => entry.wiring.checks[0]?.reported),
      [true, false]
    )
  })
})

test("loadWiringConfig accepts a named zero-argument config factory", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        ...emptyCheckConfigPreamble,
        "export const config = () => ([",
        "  {",
        '    files: ["src/**/*.ts"],',
        "    wiring: {",
        '      checks: [{ name: "named-factory-check", check: emptyCheck }],',
        "      derive: () => Stream.empty",
        "    }",
        "  }",
        "])",
        ""
      ].join("\n")
    )

    const config = await Effect.runPromise(loadWiringConfig(projectDirectory, fallbackConfig))

    assert.equal(config[0]?.wiring.checks[0]?.name, "named-factory-check")
  })
})

test("loadWiringConfig accepts a default zero-argument config factory", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        ...emptyCheckConfigPreamble,
        "export default () => ([",
        "  {",
        '    files: ["src/**/*.ts"],',
        "    wiring: {",
        '      checks: [{ name: "default-factory-check", check: emptyCheck }],',
        "      derive: () => Stream.empty",
        "    }",
        "  }",
        "])",
        ""
      ].join("\n")
    )

    const config = await Effect.runPromise(loadWiringConfig(projectDirectory, fallbackConfig))

    assert.equal(config[0]?.wiring.checks[0]?.name, "default-factory-check")
  })
})

test("loaded glob config drives the report end to end", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        'import { Stream } from "effect"',
        "",
        'import { Detection } from "@better-typescript/core/engine/location/data"',
        "",
        "",
        "export default [",
        "  {",
        '    files: ["src/**/cases.ts"],',
        "    wiring: {",
        "      checks: [",
        "        {",
        '          name: "config-extra-check",',
        "          check: fileCheck((context) => [",
        "            new Detection({",
        "              location: locateNode(context)(context.sourceFile),",
        '              message: "configured detection",',
        '              hint: "loaded from project config"',
        "            })",
        "          ])",
        "        }",
        "      ],",
        "      derive: () => Stream.empty",
        "    }",
        "  }",
        "]",
        ""
      ].join("\n")
    )

    const config = await Effect.runPromise(loadWiringConfig(projectDirectory, fallbackConfig))
    const workspace = await Effect.runPromise(loadProject(projectDirectory))
    const blocks = await collectStream(reportFromConfig(config)(workspace))

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

test("loadWiringConfig rejects empty and blank file glob arrays", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        ...emptyCheckConfigPreamble,
        "export default [",
        "  {",
        '    files: ["src/**/*.ts", "  "],',
        "    wiring: { checks: [], derive: () => Stream.empty }",
        "  }",
        "]",
        ""
      ].join("\n")
    )

    const blankError = await loadConfigFailure(projectDirectory)

    assert.equal(blankError._tag, "ProjectWiringConfigError")
    assert.match(blankError.message, /files must be a non-empty array/)

    await writeConfig(
      projectDirectory,
      [
        'import { Stream } from "effect"',
        "export default [",
        "  {",
        "    files: [],",
        "    wiring: { checks: [], derive: () => Stream.empty }",
        "  }",
        "]",
        ""
      ].join("\n")
    )

    const emptyError = await loadConfigFailure(projectDirectory)

    assert.match(emptyError.message, /files must be a non-empty array/)
  })
})

test("loadWiringConfig rejects the legacy bare wiring shape", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        ...emptyCheckConfigPreamble,
        "export default {",
        '  checks: [{ name: "legacy-check", check: emptyCheck }],',
        "  derive: () => Stream.empty",
        "}",
        ""
      ].join("\n")
    )

    const error = await loadConfigFailure(projectDirectory)

    assert.match(error.message, /exported config must be an array/)
  })
})

test("loadWiringConfig rejects the legacy named wiring export", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        ...emptyCheckConfigPreamble,
        "export const wiring = [{",
        '  files: ["src/**/*.ts"],',
        "  wiring: { checks: [], derive: () => Stream.empty }",
        "}]",
        ""
      ].join("\n")
    )

    const error = await loadConfigFailure(projectDirectory)

    assert.match(error.message, /exported config must be an array/)
  })
})

test("loadWiringConfig rejects legacy per-check paths", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        ...emptyCheckConfigPreamble,
        "export default [{",
        '  files: ["src/**/*.ts"],',
        "  wiring: {",
        '    checks: [{ name: "legacy-scope", paths: ["src"], check: emptyCheck }],',
        "    derive: () => Stream.empty",
        "  }",
        "}]",
        ""
      ].join("\n")
    )

    const error = await loadConfigFailure(projectDirectory)

    assert.match(error.message, /config\[0\]\.wiring\.checks\[0\] must be/)
  })
})

test("loadWiringConfig rejects duplicate check names across wiring entries", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        ...emptyCheckConfigPreamble,
        "export default [",
        "  {",
        '    files: ["src/**/*.ts"],',
        "    wiring: {",
        '      checks: [{ name: "duplicate-check", check: emptyCheck }],',
        "      derive: () => Stream.empty",
        "    }",
        "  },",
        "  {",
        '    files: ["tests/**/*.ts"],',
        "    wiring: {",
        '      checks: [{ name: "duplicate-check", reported: false, check: emptyCheck }],',
        "      derive: () => Stream.empty",
        "    }",
        "  }",
        "]",
        ""
      ].join("\n")
    )

    const error = await loadConfigFailure(projectDirectory)

    assert.match(error.message, /Duplicate check names: duplicate-check/)
  })
})

test("loadWiringConfig rejects invalid wiring entry shapes", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        'import { Stream } from "effect"',
        "export default [{",
        '  files: ["src/**/*.ts"],',
        "  wiring: 42",
        "}]",
        ""
      ].join("\n")
    )

    const error = await loadConfigFailure(projectDirectory)

    assert.match(error.message, /config\[0\]\.wiring must be an object with checks and derive/)
  })
})

test("loadWiringConfig rejects throwing config factories", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      ["export default () => {", '  throw new Error("factory boom")', "}", ""].join("\n")
    )

    const error = await loadConfigFailure(projectDirectory)

    assert.match(error.message, /default export factory failed: factory boom/)
  })
})

test("loadWiringConfig rejects syntax-invalid config modules", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(projectDirectory, "export default [\n")

    const error = await loadConfigFailure(projectDirectory)

    assert.match(error.message, /failed to load config module:/)
  })
})
