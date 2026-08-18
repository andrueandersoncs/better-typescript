import type { AuthResult } from "@earendil-works/pi-ai"
import { openaiCodexProvider } from "@earendil-works/pi-ai/providers/openai-codex"
import { setProvider } from "@flue/runtime"
import { Config, ConfigProvider, Effect, Schema, pipe } from "effect"
import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

// CodexTokens exists because Codex's OAuth file includes credentials Flue does not model.
const CodexTokens = Schema.Struct({
  access_token: Schema.String,
  refresh_token: Schema.String
})

interface CodexTokens extends Schema.Schema.Type<typeof CodexTokens> {}

// CodexAuth exists because the external OAuth file has no project-owned contract.
const CodexAuth = Schema.Struct({ tokens: CodexTokens })

interface CodexAuth extends Schema.Schema.Type<typeof CodexAuth> {}

const toCodexAuthResult: (credentials: CodexAuth) => AuthResult = (credentials) => ({
  auth: { apiKey: credentials.tokens.access_token },
  source: "Codex OAuth"
})

const codexAuthJson = Schema.fromJsonString(CodexAuth)
const decodeCodexAuth = Schema.decodeUnknownEffect(codexAuthJson)

const readCodexAuth = Effect.fn("CodexAuth.read")(function* () {
  const home = homedir()
  const defaultHome = join(home, ".codex")
  const codexHome = yield* pipe(Config.string("CODEX_HOME"), Config.withDefault(defaultHome))
  const authPath = join(codexHome, "auth.json")
  const source = yield* Effect.tryPromise(() => readFile(authPath, "utf8"))

  return yield* decodeCodexAuth(source)
})

export const makeCodexAuthResolver =
  (configProvider: ConfigProvider.ConfigProvider = ConfigProvider.fromEnv()) =>
  () =>
    pipe(
      readCodexAuth(),
      Effect.map(toCodexAuthResult),
      Effect.provideService(ConfigProvider.ConfigProvider, configProvider),
      Effect.runPromise
    )

const codexProviderName = "openai-codex"

export const registerCodexProvider = () => {
  const provider = openaiCodexProvider()

  setProvider({
    ...provider,
    auth: {
      apiKey: {
        name: "Codex OAuth",
        resolve: makeCodexAuthResolver()
      }
    }
  })

  return codexProviderName
}
