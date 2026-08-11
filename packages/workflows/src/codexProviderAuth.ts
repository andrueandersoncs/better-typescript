import { openaiCodexProvider } from "@earendil-works/pi-ai/providers/openai-codex"
import { setProvider } from "@flue/runtime"
import { Effect, Schema } from "effect"
import { CodexAuth } from "./codexAuth.js"
import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

const toCodexAuthResult = (credentials: CodexAuth) => {
  const result = {
    auth: { apiKey: credentials.tokens.access_token },
    source: "Codex OAuth"
  }

  return result
}

const codexAuthJson = Schema.fromJsonString(CodexAuth)
const decode = Schema.decodeUnknownEffect(codexAuthJson)

export const decodeCodexAuth = Effect.fn("CodexAuth.decode")(function* (source: string) {
  return yield* decode(source)
})

const readCodexAuth = Effect.fn("CodexAuth.read")(function* () {
  const home = homedir()
  const defaultHome = join(home, ".codex")
  const codexHome = process.env.CODEX_HOME ?? defaultHome
  const authPath = join(codexHome, "auth.json")
  const source = yield* Effect.tryPromise(() => readFile(authPath, "utf8"))

  return yield* decodeCodexAuth(source)
})

const resolve = () => {
  const auth = readCodexAuth()
  const result = Effect.map(auth, toCodexAuthResult)

  return Effect.runPromise(result)
}

const setCodexProvider = Effect.sync(() => {
  const provider = openaiCodexProvider()

  setProvider({
    ...provider,
    auth: {
      apiKey: {
        name: "Codex OAuth",
        resolve
      }
    }
  })
})

Effect.runSync(setCodexProvider)
