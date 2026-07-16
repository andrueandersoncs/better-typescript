import { HttpClient } from "effect/unstable/http"
import { Effect } from "effect"

export const fetchUser = Effect.fn("fetchUser")(function* (id: string) {
  const response = yield* HttpClient.get(`/users/${id}`)
  return yield* response.json
})
