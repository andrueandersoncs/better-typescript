import { openaiCodexProvider } from "@earendil-works/pi-ai/providers/openai-codex"
import { setProvider } from "@flue/runtime"
import { makeCodexAuthResolver } from "./codexProviderAuth.js"

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
