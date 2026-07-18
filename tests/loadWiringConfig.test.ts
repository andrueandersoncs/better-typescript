import * as assert from "node:assert/strict"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect, Schema, Stream } from "effect"
import { defineConfig, makeWiring } from "@better-typescript/core/engine/wiring"
import type { Wiring, WiringConfig } from "@better-typescript/core/engine/wiring/data"
import { Detection } from "@better-typescript/core/engine/location/data"
import { collectWorkspaceSignals } from "@better-typescript/core/engine/wiring"
import { makeContext } from "@better-typescript/core/engine/sources"
import {
  makeCheckFromSubscriptions,
  makeDetection,
  fileCheck
} from "@better-typescript/core/engine/check"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { ProjectWiringConfigError } from "@better-typescript/core/project/loadWiringConfig/data"
import { loadWiringConfig } from "@better-typescript/core/project/loadWiringConfig"
import { decodeWiringConfig } from "@better-typescript/core/project/loadWiringConfig/decode"
import { makeInlineRefactorExamples } from "./exampleHelpers.js"
import { InlineRefactorExamples } from "@better-typescript/core/engine/example/data"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const configFileName = "better-typescript.config.ts"
const virtualConfigPath = path.join(testDirectory, configFileName)

const fallbackWiring: Wiring = makeWiring({ checks: [], derive: () => Stream.empty })

const fallbackConfig: WiringConfig = defineConfig([{ files: ["**/*"], wiring: fallbackWiring }])

const emptyCheck = makeCheckFromSubscriptions(() => [])

const emptyCheckConfigPreamble = [
  'import { Stream } from "effect"',
  'import { makeCheckFromSubscriptions } from "@better-typescript/core/engine/check"',
  "",
  "const emptyCheck = makeCheckFromSubscriptions(() => [])",
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

const decodeFailure = (moduleValue: unknown): Promise<ProjectWiringConfigError> =>
  Effect.runPromise(Effect.flip(decodeWiringConfig(virtualConfigPath, moduleValue)))

const loadConfigFailure = (projectDirectory: string): Promise<ProjectWiringConfigError> =>
  Effect.runPromise(Effect.flip(loadWiringConfig(projectDirectory, fallbackConfig)))

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

test("decodeWiringConfig accepts a named zero-argument config factory", async () => {
  const config = await Effect.runPromise(
    decodeWiringConfig(virtualConfigPath, {
      config: () => [
        {
          files: ["src/**/*.ts"],
          wiring: {
            checks: [{ name: "named-factory-check", check: emptyCheck }],
            derive: () => Stream.empty
          }
        }
      ]
    })
  )

  assert.equal(config[0]?.wiring.checks[0]?.name, "named-factory-check")
})

test("decodeWiringConfig accepts a default zero-argument config factory", async () => {
  const config = await Effect.runPromise(
    decodeWiringConfig(virtualConfigPath, {
      default: () => [
        {
          files: ["src/**/*.ts"],
          wiring: {
            checks: [{ name: "default-factory-check", check: emptyCheck }],
            derive: () => Stream.empty
          }
        }
      ]
    })
  )

  assert.equal(config[0]?.wiring.checks[0]?.name, "default-factory-check")
})

test("decoded glob config drives workspace signals end to end", async () => {
  await runInTempProject(async (projectDirectory) => {
    const config = await Effect.runPromise(
      decodeWiringConfig(virtualConfigPath, {
        default: [
          {
            files: ["src/**/cases.ts"],
            wiring: {
              checks: [
                {
                  name: "config-extra-check",
                  check: fileCheck((context) => [
                    makeDetection(context)({
                      node: context.sourceFile,
                      message: "configured detection",
                      hint: "loaded from project config"
                    })
                  ])
                }
              ],
              derive: () => Stream.empty
            }
          }
        ]
      })
    )

    const workspace = await Effect.runPromise(loadProject(projectDirectory))
    const wiringSignals = await Effect.runPromise(
      collectWorkspaceSignals(config)(workspace.rootPath)(
        workspace.projects.map((project) => makeContext(project.rootPath)(project.program))
      )
    )

    assert.equal(wiringSignals[0]?.matched, true)

    const signal = wiringSignals[0]?.signals[0]

    assert.equal(signal?.name, "config-extra-check")
    assert.equal(signal?.detections[0]?.message, "configured detection")
    assert.equal(signal?.detections[0]?.hint, "loaded from project config")
    assert.deepEqual(
      {
        path: signal?.detections[0]?.location.path,
        line: signal?.detections[0]?.location.line,
        column: signal?.detections[0]?.location.column
      },
      {
        path: "src/cases.ts",
        line: 1,
        column: 1
      }
    )
  })
})

test("decodeWiringConfig rejects empty and blank file glob arrays", async () => {
  const blankError = await decodeFailure([
    {
      files: ["src/**/*.ts", "  "],
      wiring: { checks: [], derive: () => Stream.empty }
    }
  ])

  assert.equal(blankError._tag, "ProjectWiringConfigError")
  assert.match(blankError.message, /files must be a non-empty array/)

  const emptyError = await decodeFailure([
    {
      files: [],
      wiring: { checks: [], derive: () => Stream.empty }
    }
  ])

  assert.match(emptyError.message, /files must be a non-empty array/)
})

test("decodeWiringConfig rejects the legacy bare wiring shape", async () => {
  const error = await decodeFailure({
    checks: [{ name: "legacy-check", check: emptyCheck }],
    derive: () => Stream.empty
  })

  assert.match(error.message, /exported config must be an array/)
})

test("decodeWiringConfig rejects the legacy named wiring export", async () => {
  const error = await decodeFailure({
    wiring: [
      {
        files: ["src/**/*.ts"],
        wiring: { checks: [], derive: () => Stream.empty }
      }
    ]
  })

  assert.match(error.message, /exported config must be an array/)
})

test("decodeWiringConfig rejects legacy per-check paths", async () => {
  const error = await decodeFailure([
    {
      files: ["src/**/*.ts"],
      wiring: {
        checks: [{ name: "legacy-scope", paths: ["src"], check: emptyCheck }],
        derive: () => Stream.empty
      }
    }
  ])

  assert.match(
    error.message,
    /config\[0\]\.wiring\.checks\[0\] must be \{ name: string, check: \{ plan: function \}, reported\?: boolean, examples\?: RefactorExampleSource \}/
  )
})

test("decodeWiringConfig rejects array-valued check examples", async () => {
  const error = await decodeFailure([
    {
      files: ["src/**/*.ts"],
      wiring: {
        checks: [{ name: "array-examples", check: emptyCheck, examples: [] }],
        derive: () => Stream.empty
      }
    }
  ])

  assert.match(
    error.message,
    /config\[0\]\.wiring\.checks\[0\] must be \{ name: string, check: \{ plan: function \}, reported\?: boolean, examples\?: RefactorExampleSource \}/
  )
})

test("decodeWiringConfig rejects legacy thunk-valued check examples", async () => {
  const error = await decodeFailure([
    {
      files: ["src/**/*.ts"],
      wiring: {
        checks: [{ name: "thunk-examples", check: emptyCheck, examples: () => [] }],
        derive: () => Stream.empty
      }
    }
  ])

  assert.match(
    error.message,
    /config\[0\]\.wiring\.checks\[0\] must be \{ name: string, check: \{ plan: function \}, reported\?: boolean, examples\?: RefactorExampleSource \}/
  )
})

test("decodeWiringConfig accepts inline RefactorExampleSource check examples", async () => {
  const examples = makeInlineRefactorExamples([])
  const config = await Effect.runPromise(
    decodeWiringConfig(virtualConfigPath, [
      {
        files: ["src/**/*.ts"],
        wiring: {
          checks: [{ name: "inline-examples", check: emptyCheck, examples }],
          derive: () => Stream.empty
        }
      }
    ])
  )

  const decodedExamples = config[0]?.wiring.checks[0]?.examples

  assert.equal(config[0]?.wiring.checks[0]?.name, "inline-examples")
  assert.ok(Schema.is(InlineRefactorExamples)(decodedExamples))
  assert.equal(decodedExamples._tag, "inline")
  assert.deepEqual(decodedExamples.examples, [])
})

test("decodeWiringConfig rejects duplicate check names across wiring entries", async () => {
  const error = await decodeFailure([
    {
      files: ["src/**/*.ts"],
      wiring: {
        checks: [{ name: "duplicate-check", check: emptyCheck }],
        derive: () => Stream.empty
      }
    },
    {
      files: ["tests/**/*.ts"],
      wiring: {
        checks: [{ name: "duplicate-check", reported: false, check: emptyCheck }],
        derive: () => Stream.empty
      }
    }
  ])

  assert.match(error.message, /Duplicate check names: duplicate-check/)
})

test("decodeWiringConfig rejects invalid wiring entry shapes", async () => {
  const error = await decodeFailure([
    {
      files: ["src/**/*.ts"],
      wiring: 42
    }
  ])

  assert.match(error.message, /config\[0\]\.wiring must be an object with checks and derive/)
})

test("decodeWiringConfig rejects throwing config factories", async () => {
  const error = await decodeFailure(() => {
    throw new Error("factory boom")
  })

  assert.match(error.message, /default export factory failed: factory boom/)
})

test("loadWiringConfig rejects syntax-invalid config modules", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(projectDirectory, "export default [\n")

    const error = await loadConfigFailure(projectDirectory)

    assert.match(error.message, /failed to load config module:/)
  })
})
