import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "bun:test"
import { Effect, Function, Schema } from "effect"
import { workspaceSignalsForProjects } from "@better-typescript/core/engine/reportPipeline"
import { makeContext } from "@better-typescript/matchers/sources/makeContext"
import { makePolicy } from "@better-typescript/core/engine/policy/makePolicy"
import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import { fileMatcher } from "@better-typescript/matchers/matcher/fileMatcher"
import { makeFileMatch } from "@better-typescript/matchers/builtins/exportSurface"
import { emptyRefactorExampleSource } from "@better-typescript/core/engine/example/examplesFromDefinition"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { loadWiringConfig } from "@better-typescript/core/project/loadWiringConfig"
import { decodeWiringConfig } from "@better-typescript/core/project/loadWiringConfig"
import { InlineRefactorExamples } from "@better-typescript/core/engine/example/inlineRefactorExamples"
import { fallbackConfig } from "./loadWiringConfigFallback.js"
import { emptyMatcher } from "./loadWiringConfigEmptyMatcher.js"
import { emptyGuidance } from "./loadWiringConfigEmptyGuidance.js"
import { makeEmptyPolicy } from "./loadWiringConfigMakeEmptyPolicy.js"
import { emptyPolicyConfigPreamble } from "./loadWiringConfigEmptyPolicyConfigPreamble.js"
import { runInTempProject } from "./loadWiringConfigRunInTempProject.js"
import { writeConfig } from "./loadWiringConfigWriteConfig.js"
import { decodeFailure } from "./loadWiringConfigDecodeFailure.js"
import { loadConfigFailure } from "./loadWiringConfigLoadConfigFailure.js"
import { virtualConfigPath } from "./loadWiringConfigVirtualConfigPath.js"

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
        ...emptyPolicyConfigPreamble,
        "export default [",
        "  {",
        '    files: ["src/**/*.{ts,tsx}", "scripts/*.mts"],',
        "    wiring: {",
        '      policies: [makeEmptyPolicy("source-check")],',
        "      derive: () => []",
        "    }",
        "  },",
        "  {",
        '    files: ["tests/**/*.ts"],',
        "    wiring: {",
        '      policies: [makeEmptyPolicy("test-helper", false)],',
        "      derive: () => []",
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
      config.map((entry) => entry.wiring.policies[0]?.name),
      ["source-check", "test-helper"]
    )
    assert.deepEqual(
      config.map((entry) => entry.wiring.policies[0]?.reported),
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
            policies: [makeEmptyPolicy("named-factory-check")],
            derive: () => []
          }
        }
      ]
    })
  )

  assert.equal(config[0]?.wiring.policies[0]?.name, "named-factory-check")
})

test("decodeWiringConfig accepts a default zero-argument config factory", async () => {
  const config = await Effect.runPromise(
    decodeWiringConfig(virtualConfigPath, {
      default: () => [
        {
          files: ["src/**/*.ts"],
          wiring: {
            policies: [makeEmptyPolicy("default-factory-check")],
            derive: () => []
          }
        }
      ]
    })
  )

  assert.equal(config[0]?.wiring.policies[0]?.name, "default-factory-check")
})

test("decoded glob config drives workspace signals end to end", async () => {
  await runInTempProject(async (projectDirectory) => {
    const configuredPolicy = makePolicy({
      name: "config-extra-check",
      matcher: fileMatcher((context) => {
        const match = makeFileMatch(context.sourceFile, null)
        return [match]
      }),
      guidance: () => (match) =>
        makeFindings(match.target, "configured detection", "loaded from project config", null),
      examples: emptyRefactorExampleSource
    })

    const config = await Effect.runPromise(
      decodeWiringConfig(virtualConfigPath, {
        default: [
          {
            files: ["src/**/cases.ts"],
            wiring: {
              policies: [configuredPolicy],
              derive: () => []
            }
          }
        ]
      })
    )

    const workspace = await Effect.runPromise(loadProject(projectDirectory))
    const contexts = workspace.projects.map((project) =>
      makeContext(project.rootPath)(project.program)
    )
    const wiringSignals = await Effect.runPromise(
      workspaceSignalsForProjects(config)(workspace.rootPath)(contexts)(Function.identity)
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
      wiring: { policies: [], derive: () => [] }
    }
  ])

  assert.equal(blankError._tag, "ProjectWiringConfigError")
  assert.match(blankError.message, /files must be a non-empty array/)

  const emptyError = await decodeFailure([
    {
      files: [],
      wiring: { policies: [], derive: () => [] }
    }
  ])

  assert.match(emptyError.message, /files must be a non-empty array/)
})

test("decodeWiringConfig rejects the legacy bare wiring shape", async () => {
  const error = await decodeFailure({
    policies: [makeEmptyPolicy("legacy-check")],
    derive: () => []
  })

  assert.match(error.message, /exported config must be an array/)
})

test("decodeWiringConfig rejects the legacy named wiring export", async () => {
  const error = await decodeFailure({
    wiring: [
      {
        files: ["src/**/*.ts"],
        wiring: { policies: [], derive: () => [] }
      }
    ]
  })

  assert.match(error.message, /exported config must be an array/)
})

test("decodeWiringConfig rejects legacy per-policy paths", async () => {
  const error = await decodeFailure([
    {
      files: ["src/**/*.ts"],
      wiring: {
        policies: [
          { name: "legacy-scope", paths: ["src"], matcher: emptyMatcher, guidance: emptyGuidance }
        ],
        derive: () => []
      }
    }
  ])

  assert.match(
    error.message,
    /config\[0\]\.wiring\.policies\[0\] must be a Policy \(matcher\.plan function\) or WorkspacePolicy \(matcher\.match function\)/
  )
})

test("decodeWiringConfig rejects array-valued policy examples", async () => {
  const error = await decodeFailure([
    {
      files: ["src/**/*.ts"],
      wiring: {
        policies: [
          { name: "array-examples", matcher: emptyMatcher, guidance: emptyGuidance, examples: [] }
        ],
        derive: () => []
      }
    }
  ])

  assert.match(
    error.message,
    /config\[0\]\.wiring\.policies\[0\] must be a Policy \(matcher\.plan function\) or WorkspacePolicy \(matcher\.match function\)/
  )
})

test("decodeWiringConfig rejects legacy thunk-valued policy examples", async () => {
  const error = await decodeFailure([
    {
      files: ["src/**/*.ts"],
      wiring: {
        policies: [
          {
            name: "thunk-examples",
            matcher: emptyMatcher,
            guidance: emptyGuidance,
            examples: () => []
          }
        ],
        derive: () => []
      }
    }
  ])

  assert.match(
    error.message,
    /config\[0\]\.wiring\.policies\[0\] must be a Policy \(matcher\.plan function\) or WorkspacePolicy \(matcher\.match function\)/
  )
})

test("decodeWiringConfig accepts inline RefactorExampleSource policy examples", async () => {
  const examples = InlineRefactorExamples.make({ examples: [] })
  const config = await Effect.runPromise(
    decodeWiringConfig(virtualConfigPath, [
      {
        files: ["src/**/*.ts"],
        wiring: {
          policies: [
            makePolicy({
              name: "inline-examples",
              matcher: emptyMatcher,
              guidance: emptyGuidance,
              examples
            })
          ],
          derive: () => []
        }
      }
    ])
  )

  const decodedExamples = config[0]?.wiring.policies[0]?.examples

  assert.equal(config[0]?.wiring.policies[0]?.name, "inline-examples")
  assert.ok(Schema.is(InlineRefactorExamples)(decodedExamples))
  assert.equal(decodedExamples._tag, "inline")
  assert.deepEqual(decodedExamples.examples, [])
})

test("decodeWiringConfig rejects duplicate policy names across wiring entries", async () => {
  const error = await decodeFailure([
    {
      files: ["src/**/*.ts"],
      wiring: {
        policies: [makeEmptyPolicy("duplicate-check")],
        derive: () => []
      }
    },
    {
      files: ["tests/**/*.ts"],
      wiring: {
        policies: [makeEmptyPolicy("duplicate-check", false)],
        derive: () => []
      }
    }
  ])

  assert.match(error.message, /Duplicate policy names: duplicate-check/)
})

test("decodeWiringConfig rejects invalid wiring entry shapes", async () => {
  const error = await decodeFailure([
    {
      files: ["src/**/*.ts"],
      wiring: 42
    }
  ])

  assert.match(error.message, /config\[0\]\.wiring must be an object with policies and derive/)
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
