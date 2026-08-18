import type { AuthResult } from "@earendil-works/pi-ai"
import { openaiCodexProvider } from "@earendil-works/pi-ai/providers/openai-codex"
import { setProvider } from "@flue/runtime"
import { Array, Config, ConfigProvider, Effect, Schema, pipe } from "effect"
import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

export const makeCodexAuthResolver = (
  configProvider: ConfigProvider.ConfigProvider = ConfigProvider.fromEnv()
) => {
  const accessTokenKey = Schema.Literal("access_token")
  const refreshTokenKey = Schema.Literal("refresh_token")
  const tokensKey = Schema.Literal("tokens")
  const tokenKeySchemas = Array.make(accessTokenKey, refreshTokenKey)
  const tokenKeys = Schema.Union(tokenKeySchemas)
  const CodexTokens = Schema.Record(tokenKeys, Schema.String)
  const CodexAuth = Schema.Record(tokensKey, CodexTokens)
  const codexAuthJson = Schema.fromJsonString(CodexAuth)

  const readCodexAuth = Effect.fn("CodexAuth.read")(function* () {
    const home = homedir()
    const defaultHome = join(home, ".codex")
    const codexHome = yield* pipe(Config.string("CODEX_HOME"), Config.withDefault(defaultHome))
    const authPath = join(codexHome, "auth.json")
    const source = yield* Effect.tryPromise(() => readFile(authPath, "utf8"))

    return yield* Schema.decodeUnknownEffect(codexAuthJson)(source)
  })

  const toCodexAuthResult = (credentials: Schema.Schema.Type<typeof CodexAuth>): AuthResult => ({
    auth: { apiKey: credentials.tokens.access_token },
    source: "Codex OAuth"
  })

  const resolve = () =>
    pipe(
      readCodexAuth(),
      Effect.map(toCodexAuthResult),
      Effect.provideService(ConfigProvider.ConfigProvider, configProvider),
      Effect.runPromise
    )

  return resolve
}

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
