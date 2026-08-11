import { expect, test } from "bun:test"
import { Effect } from "effect"
import { decodeCodexAuth } from "../packages/workflows/src/codexProviderAuth.js"

test("Codex OAuth credentials expose the access token", () =>
  Effect.runPromise(
    decodeCodexAuth(
      JSON.stringify({ tokens: { access_token: "access", refresh_token: "refresh" } })
    )
  ).then((credentials) => expect(credentials.tokens.access_token).toBe("access")))
