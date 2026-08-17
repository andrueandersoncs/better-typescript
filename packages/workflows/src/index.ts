"use agent"
import { useModel } from "@flue/runtime"
import { registerCodexProvider } from "./codexProvider.js"

registerCodexProvider()

export const HelloWorld = () => {
  useModel("openai-codex/gpt-5.6-terra")
  return "Reply to every prompt with exactly: hello world"
}
