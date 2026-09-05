import type { Effect } from "../../Effect"
import type { Json } from "../../Schema"

export interface HttpClientResponse {
  readonly json: Effect<Json>
}
