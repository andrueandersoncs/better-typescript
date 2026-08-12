import { expect, test } from "bun:test"
import { ConfigProvider } from "effect"
import { hasProvider } from "@flue/runtime/internal"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { makeCodexAuthResolver } from "../packages/workflows/src/codexProviderAuth.js"

test("Codex home is injectable with ConfigProvider", async () => {
  const directory = await mkdtemp(join(tmpdir(), "better-typescript-codex-"))
  const authPath = join(directory, "auth.json")
  const source = JSON.stringify({
    tokens: { access_token: "injected-access", refresh_token: "injected-refresh" }
  })

  await writeFile(authPath, source)

  const provider = ConfigProvider.fromUnknown({ CODEX_HOME: directory })
  const resolve = makeCodexAuthResolver(provider)
  const result = await resolve()

  expect(result.auth.apiKey).toBe("injected-access")
  await rm(directory, { recursive: true })
})

test("workflow entrypoint registers the Codex provider", async () => {
  await import("../packages/workflows/src/index.js")

  expect(hasProvider("openai-codex")).toBe(true)
})
