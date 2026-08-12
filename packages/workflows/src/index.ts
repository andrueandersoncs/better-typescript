"use agent"
import "./codexProviderRegistration.js"
import { useModel } from "@flue/runtime"

export const HelloWorld = () => {
  useModel("openai-codex/gpt-5.6-terra")
  return "Reply to every prompt with exactly: hello world"
}
