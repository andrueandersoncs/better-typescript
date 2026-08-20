import { Effect } from "effect"

const fetchWithAbort = Effect.tryPromise({
  try: (signal) => fetch("https://example.test", { signal }),
  catch: () => new Error("failed")
})

export const allowed = { fetchWithAbort }
