import { Schema } from "effect"

// CodexTokens exists because Codex's OAuth file includes credentials Flue does not model.
export const CodexTokens = Schema.Struct({
  access_token: Schema.String,
  refresh_token: Schema.String
})

export interface CodexTokens extends Schema.Schema.Type<typeof CodexTokens> {}

// CodexAuth exists because the external OAuth file has no project-owned contract.
export const CodexAuth = Schema.Struct({ tokens: CodexTokens })

export interface CodexAuth extends Schema.Schema.Type<typeof CodexAuth> {}
