import { Data } from "effect"
import type { RefactorExample } from "../example/data.js"
import type { Detection } from "../location/data.js"

/**
 * Signal is the materialized result of one named check for one wiring scope.
 *
 * @remarks
 *   It remains explicit because rendering and aggregate advice consume the same
 *   detections, reporting policy, and examples. Removing it would split those
 *   correlated values into parallel collections at every consumer.
 * @modelRole shared
 */
export class Signal extends Data.Class<{
  readonly name: string
  readonly reported: boolean
  readonly detections: ReadonlyArray<Detection>
  readonly examples: ReadonlyArray<RefactorExample>
}> {}

/**
 * WiringSignals records whether one wiring matched and the signals it produced.
 *
 * @remarks
 *   It remains explicit because collection and report derivation must distinguish
 *   an unmatched wiring from a matched wiring with no detections. Removing it
 *   would collapse those states or require parallel result arrays.
 * @modelRole shared
 */
export class WiringSignals extends Data.Class<{
  readonly matched: boolean
  readonly signals: ReadonlyArray<Signal>
}> {}
