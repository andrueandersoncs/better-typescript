import { Effect } from "effect"

export const fetchWithoutAbort = Effect.tryPromise({
  try: () => fetch("https://example.test"),
  catch: () => new Error("failed")
})

export const decodeBeforeStatus = async (response: Response) => {
  const json = await response.json()
  if (!response.ok) throw new Error("failed")
  return json
}
