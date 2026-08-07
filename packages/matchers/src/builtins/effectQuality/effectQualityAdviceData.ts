import { Array, Schema } from "effect"

const adviceKinds = Array.make<
  [
    "config-refined-values",
    "retry-without-jitter",
    "raw-fetch-outside-adapter",
    "test-live-runtime",
    "test-clock-for-time",
    "thin-http-handlers",
    "transaction-network-work",
    "layer-authority-visibility",
    "layer-composition",
    "scoped-background-work",
    "cache-preference",
    "stream-pagination",
    "public-queue",
    "keyed-stream-work",
    "typed-boundary-error",
    "boundary-schema-decode",
    "idempotent-retry",
    "observable-worker-failure",
    "http-client-preference"
  ]
>(
  "config-refined-values",
  "retry-without-jitter",
  "raw-fetch-outside-adapter",
  "test-live-runtime",
  "test-clock-for-time",
  "thin-http-handlers",
  "transaction-network-work",
  "layer-authority-visibility",
  "layer-composition",
  "scoped-background-work",
  "cache-preference",
  "stream-pagination",
  "public-queue",
  "keyed-stream-work",
  "typed-boundary-error",
  "boundary-schema-decode",
  "idempotent-retry",
  "observable-worker-failure",
  "http-client-preference"
)

const adviceKindSchema = Schema.Literals(adviceKinds)

// EffectQualityAdviceData is silent-policy payload because derive and evidence share one record.
export const EffectQualityAdviceData = Schema.Struct({
  kind: adviceKindSchema,
  subject: Schema.String
})

export interface EffectQualityAdviceData extends Schema.Schema.Type<
  typeof EffectQualityAdviceData
> {}
