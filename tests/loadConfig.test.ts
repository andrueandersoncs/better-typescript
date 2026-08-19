import * as assert from "node:assert/strict"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { test } from "bun:test"
import { Effect } from "effect"
import { defaultConfig } from "@better-typescript/core/config"
import { InvalidLintConfigError, loadConfig } from "@better-typescript/core/config/loadConfig"

const configFileName = "better-typescript.config.ts"

const runInTempProject = async (
  run: (projectDirectory: string) => Promise<void>
): Promise<void> => {
  const projectDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "better-typescript-load-config-")
  )

  try {
    await run(projectDirectory)
  } finally {
    await fs.rm(projectDirectory, { recursive: true, force: true })
  }
}

const writeConfig = (projectDirectory: string, source: string): Promise<void> =>
  fs.writeFile(path.join(projectDirectory, configFileName), source)

const loadFailure = (projectDirectory: string): Promise<InvalidLintConfigError> =>
  Effect.runPromise(Effect.flip(loadConfig(projectDirectory)))

const assertInvalidConfig = (error: InvalidLintConfigError, projectDirectory: string): void => {
  assert.equal(error._tag, "InvalidLintConfigError")
  assert.equal(error.configPath, path.join(projectDirectory, configFileName))
  assert.match(error.message, /^Invalid better-typescript\.config\.ts at /)
}

test("loadConfig returns the default config when no config file exists", async () => {
  await runInTempProject(async (projectDirectory) => {
    const config = await Effect.runPromise(loadConfig(projectDirectory))

    assert.equal(config, defaultConfig)
  })
})

test("loadConfig gives the named config export precedence over the default export", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        'export const config = [{ files: ["named/**/*.ts"], rules: { "*": "warn" } }]',
        'export default [{ files: ["default/**/*.ts"], rules: { "*": "error" } }]'
      ].join("\n")
    )

    const config = await Effect.runPromise(loadConfig(projectDirectory))

    assert.deepEqual(config, [{ files: ["named/**/*.ts"], rules: { "*": "warn" } }])
  })
})

test("loadConfig falls back to the default export when the named export is nullish", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        "export const config = undefined",
        'export default [{ files: ["fallback/**/*.ts"], rules: { "*": "error" } }]'
      ].join("\n")
    )

    const config = await Effect.runPromise(loadConfig(projectDirectory))

    assert.deepEqual(config, [{ files: ["fallback/**/*.ts"], rules: { "*": "error" } }])
  })
})

test("loadConfig reads a default config export", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      'export default [{ files: ["src/**/*.ts"], rules: { "*": "off" } }]'
    )

    const config = await Effect.runPromise(loadConfig(projectDirectory))

    assert.deepEqual(config, [{ files: ["src/**/*.ts"], rules: { "*": "off" } }])
  })
})

test("loadConfig rejects a malformed named export instead of using the default export", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(
      projectDirectory,
      [
        'export const config = "not a lint config"',
        'export default [{ files: ["src/**/*.ts"], rules: { "*": "error" } }]'
      ].join("\n")
    )

    const error = await loadFailure(projectDirectory)

    assertInvalidConfig(error, projectDirectory)
    assert.match(error.reason, /Expected array/)
  })
})

test("loadConfig rejects a schema-invalid exported value", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(projectDirectory, 'export default [{ files: [], rules: { "*": "error" } }]')

    const error = await loadFailure(projectDirectory)

    assertInvalidConfig(error, projectDirectory)
    assert.match(error.reason, /Config files must be a non-empty array/)
  })
})

test("loadConfig rejects a module with no supported config export", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(projectDirectory, "export const unrelated = true")

    const error = await loadFailure(projectDirectory)

    assertInvalidConfig(error, projectDirectory)
    assert.equal(error.reason, "Config must provide a default export or named config export")
  })
})

test("loadConfig maps config module import failures to InvalidLintConfigError", async () => {
  await runInTempProject(async (projectDirectory) => {
    await writeConfig(projectDirectory, 'throw new Error("import boom")')

    const error = await loadFailure(projectDirectory)

    assertInvalidConfig(error, projectDirectory)
    assert.match(error.reason, /import boom/)
  })
})
