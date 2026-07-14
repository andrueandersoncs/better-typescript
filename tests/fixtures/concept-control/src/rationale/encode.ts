import type { ApiPayload } from "./data.js"

export const encodePayload = (payload: ApiPayload): string =>
  payload.identifier
