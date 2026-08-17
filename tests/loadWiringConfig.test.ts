import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { Effect, Schema } from "effect"
import {
  ProjectWiringConfigError,
  loadWiringConfig
} from "@better-typescript/core/project/loadWiringConfig"
import { reportEvents } from "@better-typescript/core/engine/reportPipeline"
import { WorkspaceUpdate } from "@better-typescript/core/engine/watch/data"
import { makeContext } from "@better-typescript/matchers/sources/makeContext"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { InlineRefactorExamples } from "@better-typescript/core/engine/example/inlineRefactorExamples"
import { fallbackConfig } from "./loadWiringConfigFallback.js"
import { configSource } from "./loadWiringConfigEmptyPolicyConfigPreamble.js"
import { runInTempProject } from "./loadWiringConfigRunInTempProject.js"
import { loadSource } from "./loadWiringConfigLoadSource.js"
import { failSource } from "./loadWiringConfigFailSource.js"

test("loadWiringConfig returns fallback config when a project has no config", async () => {
  await runInTempProject(async (projectDirectory) => {
    const config = await Effect.runPromise(loadWiringConfig(projectDirectory, fallbackConfig))

    assert.equal(config, fallbackConfig)
  })
})

test("loadWiringConfig accepts arbitrary glob wiring entries", async () => {
  await runInTempProject(async (projectDirectory) => {
    const config = await loadSource(
      projectDirectory,
      configSource(
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
        "]"
      )
    )

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

test("loadWiringConfig accepts a named zero-argument config factory", async () => {
  await runInTempProject(async (projectDirectory) => {
    const config = await loadSource(
      projectDirectory,
      configSource(
        "export const config = () => [{",
        '  files: ["src/**/*.ts"],',
        '  wiring: { policies: [makeEmptyPolicy("named-factory-check")], derive: () => [] }',
        "}]"
      )
    )

    assert.equal(config[0]?.wiring.policies[0]?.name, "named-factory-check")
  })
})

test("loadWiringConfig accepts a default zero-argument config factory", async () => {
  await runInTempProject(async (projectDirectory) => {
    const config = await loadSource(
      projectDirectory,
      configSource(
        "export default () => [{",
        '  files: ["src/**/*.ts"],',
        '  wiring: { policies: [makeEmptyPolicy("default-factory-check")], derive: () => [] }',
        "}]"
      )
    )

    assert.equal(config[0]?.wiring.policies[0]?.name, "default-factory-check")
  })
})

test("loadWiringConfig prefers the named config export over the default export", async () => {
  await runInTempProject(async (projectDirectory) => {
    const config = await loadSource(
      projectDirectory,
      configSource(
        "export const config = [{",
        '  files: ["src/**/*.ts"],',
        '  wiring: { policies: [makeEmptyPolicy("named-check")], derive: () => [] }',
        "}]",
        "export default [{",
        '  files: ["src/**/*.ts"],',
        '  wiring: { policies: [makeEmptyPolicy("default-check")], derive: () => [] }',
        "}]"
      )
    )

    assert.equal(config[0]?.wiring.policies[0]?.name, "named-check")
  })
})

test("loadWiringConfig ignores inherited config export properties", async () => {
  await runInTempProject(async (projectDirectory) => {
    const error = await failSource(
      projectDirectory,
      configSource(
        "const inheritedConfig = [{",
        '  files: ["src/**/*.ts"],',
        '  wiring: { policies: [makeEmptyPolicy("inherited-check")], derive: () => [] }',
        "}]",
        "export default Object.create({ config: inheritedConfig })"
      )
    )

    assert.equal(Schema.is(ProjectWiringConfigError)(error), true)
    assert.equal(error._tag, "ProjectWiringConfigError")
    assert.equal(
      error.reason,
      "exported config must be an array of { files: string[], wiring: { policies, derive } }"
    )
    assert.equal(error.configPath, `${projectDirectory}/better-typescript.config.ts`)
  })
})

test("loaded glob config drives reportEvents end to end", async () => {
  await runInTempProject(async (projectDirectory) => {
    const config = await loadSource(
      projectDirectory,
      configSource(
        "const configuredPolicy = makePolicy({",
        '  name: "config-extra-check",',
        "  matcher: fileMatcher((context) => [makeFileMatch(context.sourceFile, null)]),",
        "  guidance: () => (match) => makeFindings(",
        '    match.target, "configured detection", "loaded from project config", null',
        "  ),",
        "  examples: emptyRefactorExampleSource",
        "})",
        "export default [{",
        '  files: ["src/**/cases.ts"],',
        "  wiring: { policies: [configuredPolicy], derive: () => [] }",
        "}]"
      )
    )
    const workspace = await Effect.runPromise(loadProject(projectDirectory))
    const update = new WorkspaceUpdate({
      rootPath: workspace.rootPath,
      contexts: workspace.projects.map((project) => makeContext(project.rootPath)(project.program))
    })
    const events = await Effect.runPromise(reportEvents(config)(update))
    const text = events.find((event) => event._tag === "signal")?.text

    assert.match(text ?? "", /^config-extra-check/)
    assert.match(text ?? "", /configured detection/)
    assert.match(text ?? "", /loaded from project config/)
    assert.match(text ?? "", /src\/cases\.ts:1:1/)
  })
})

test("loadWiringConfig rejects empty and blank file glob arrays", async () => {
  await runInTempProject(async (projectDirectory) => {
    const blankError = await failSource(
      projectDirectory,
      configSource(
        "export default [{",
        '  files: ["src/**/*.ts", "  "],',
        "  wiring: { policies: [], derive: () => [] }",
        "}]"
      )
    )

    assert.equal(blankError._tag, "ProjectWiringConfigError")
    assert.match(blankError.message, /files must be a non-empty array/)

    const emptyError = await failSource(
      projectDirectory,
      configSource(
        "export default [{",
        "  files: [],",
        "  wiring: { policies: [], derive: () => [] }",
        "}]"
      )
    )

    assert.match(emptyError.message, /files must be a non-empty array/)
  })
})

test("loadWiringConfig rejects the legacy bare wiring shape", async () => {
  await runInTempProject(async (projectDirectory) => {
    const error = await failSource(
      projectDirectory,
      configSource(
        "export default {",
        '  policies: [makeEmptyPolicy("legacy-check")],',
        "  derive: () => []",
        "}"
      )
    )

    assert.match(error.message, /exported config must be an array/)
  })
})

test("loadWiringConfig rejects the legacy named wiring export", async () => {
  await runInTempProject(async (projectDirectory) => {
    const error = await failSource(
      projectDirectory,
      configSource(
        "export const wiring = [{",
        '  files: ["src/**/*.ts"],',
        "  wiring: { policies: [], derive: () => [] }",
        "}]"
      )
    )

    assert.match(error.message, /exported config must be an array/)
  })
})

test("loadWiringConfig rejects structural Policy lookalikes", async () => {
  await runInTempProject(async (projectDirectory) => {
    const error = await failSource(
      projectDirectory,
      configSource(
        "export default [{",
        '  files: ["src/**/*.ts"],',
        "  wiring: {",
        "    policies: [{",
        '      name: "lookalike",',
        "      matcher: emptyMatcher,",
        "      guidance: emptyGuidance,",
        "      examples: emptyRefactorExampleSource,",
        "      reported: true",
        "    }],",
        "    derive: () => []",
        "  }",
        "}]"
      )
    )

    assert.match(
      error.message,
      /config\[0\]\.wiring\.policies\[0\] must be a Policy \(matcher\.plan function\) or WorkspacePolicy \(matcher\.match function\)/
    )
  })
})

test("loadWiringConfig rejects legacy per-policy paths", async () => {
  await runInTempProject(async (projectDirectory) => {
    const error = await failSource(
      projectDirectory,
      configSource(
        "export default [{",
        '  files: ["src/**/*.ts"],',
        "  wiring: {",
        '    policies: [{ name: "legacy-scope", paths: ["src"], matcher: emptyMatcher, guidance: emptyGuidance }],',
        "    derive: () => []",
        "  }",
        "}]"
      )
    )

    assert.match(error.message, /policies\[0\] must be a Policy/)
  })
})

test("loadWiringConfig rejects array and thunk-valued policy examples", async () => {
  await runInTempProject(async (projectDirectory) => {
    for (const examples of ["[]", "() => []"]) {
      const error = await failSource(
        projectDirectory,
        configSource(
          "export default [{",
          '  files: ["src/**/*.ts"],',
          "  wiring: {",
          `    policies: [{ name: "invalid-examples", matcher: emptyMatcher, guidance: emptyGuidance, examples: ${examples} }],`,
          "    derive: () => []",
          "  }",
          "}]"
        )
      )

      assert.match(error.message, /policies\[0\] must be a Policy/)
    }
  })
})

test("loadWiringConfig accepts inline RefactorExampleSource policy examples", async () => {
  await runInTempProject(async (projectDirectory) => {
    const config = await loadSource(
      projectDirectory,
      configSource(
        'import { InlineRefactorExamples } from "@better-typescript/core/engine/example/inlineRefactorExamples"',
        "const examples = InlineRefactorExamples.make({ examples: [] })",
        "export default [{",
        '  files: ["src/**/*.ts"],',
        "  wiring: {",
        '    policies: [makePolicy({ name: "inline-examples", matcher: emptyMatcher, guidance: emptyGuidance, examples })],',
        "    derive: () => []",
        "  }",
        "}]"
      )
    )
    const decodedExamples = config[0]?.wiring.policies[0]?.examples

    assert.equal(config[0]?.wiring.policies[0]?.name, "inline-examples")
    assert.ok(Schema.is(InlineRefactorExamples)(decodedExamples))
    assert.equal(decodedExamples._tag, "inline")
    assert.deepEqual(decodedExamples.examples, [])
  })
})

test("loadWiringConfig rejects duplicate policy names across wiring entries", async () => {
  await runInTempProject(async (projectDirectory) => {
    const error = await failSource(
      projectDirectory,
      configSource(
        "export default [",
        '  { files: ["src/**/*.ts"], wiring: { policies: [makeEmptyPolicy("duplicate-check")], derive: () => [] } },',
        '  { files: ["tests/**/*.ts"], wiring: { policies: [makeEmptyPolicy("duplicate-check", false)], derive: () => [] } }',
        "]"
      )
    )

    assert.match(error.message, /Duplicate policy names: duplicate-check/)
  })
})

test("loadWiringConfig rejects invalid wiring entry shapes", async () => {
  await runInTempProject(async (projectDirectory) => {
    const error = await failSource(
      projectDirectory,
      configSource('export default [{ files: ["src/**/*.ts"], wiring: 42 }]')
    )

    assert.match(error.message, /config\[0\]\.wiring must be an object with policies and derive/)
  })
})

test("loadWiringConfig rejects throwing config factories", async () => {
  await runInTempProject(async (projectDirectory) => {
    const error = await failSource(
      projectDirectory,
      configSource('export default () => { throw new Error("factory boom") }')
    )

    assert.match(error.message, /default export factory failed: factory boom/)
  })
})

test("loadWiringConfig normalizes non-Error factory failures", async () => {
  await runInTempProject(async (projectDirectory) => {
    const error = await failSource(
      projectDirectory,
      configSource('export default () => { throw "plain failure" }')
    )

    assert.equal(Schema.is(ProjectWiringConfigError)(error), true)
    assert.equal(error._tag, "ProjectWiringConfigError")
    assert.equal(error.reason, "default export factory failed: plain failure")
    assert.equal(error.configPath, `${projectDirectory}/better-typescript.config.ts`)
  })
})

test("loadWiringConfig rejects syntax-invalid config modules", async () => {
  await runInTempProject(async (projectDirectory) => {
    const error = await failSource(projectDirectory, "export default [\n")

    assert.match(error.message, /failed to load config module:/)
  })
})
