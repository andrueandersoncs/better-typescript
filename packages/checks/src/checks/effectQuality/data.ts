import { Array, Schema } from "effect"

// EffectQualityRuleKind is kind vocabulary because detectors and reports must share literals.
export type EffectQualityRuleKind =
  | "unsafe-casts"
  | "schema-class-models"
  | "typescript-namespaces"
  | "process-environment"
  | "test-sleeps"
  | "production-sleep-loops"
  | "unbounded-stream-collect"
  | "unbounded-stream-buffer"
  | "handrolled-ttl-cache"
  | "inflight-dedupe-map"
  | "cache-per-request"
  | "scoped-client-cache"
  | "raw-fetch-abort-signal"
  | "typed-error-recovery"
  | "layer-forever-acquisition"
  | "global-config-mutation"
  | "service-method-effect-fn"
  | "effect-fn-name"
  | "schema-record-interface"
  | "schema-optional-key"
  | "schema-error-class"
  | "config-secret-redaction"
  | "bounded-retry-schedule"
  | "http-response-validation"
  | "http-status-decode-order"
  | "effect-test-style"

const ruleKinds = Array.make<
  [
    "unsafe-casts",
    "schema-class-models",
    "typescript-namespaces",
    "process-environment",
    "test-sleeps",
    "production-sleep-loops",
    "unbounded-stream-collect",
    "unbounded-stream-buffer",
    "handrolled-ttl-cache",
    "inflight-dedupe-map",
    "cache-per-request",
    "scoped-client-cache",
    "raw-fetch-abort-signal",
    "typed-error-recovery",
    "layer-forever-acquisition",
    "global-config-mutation",
    "service-method-effect-fn",
    "effect-fn-name",
    "schema-record-interface",
    "schema-optional-key",
    "schema-error-class",
    "config-secret-redaction",
    "bounded-retry-schedule",
    "http-response-validation",
    "http-status-decode-order",
    "effect-test-style"
  ]
>(
  "unsafe-casts",
  "schema-class-models",
  "typescript-namespaces",
  "process-environment",
  "test-sleeps",
  "production-sleep-loops",
  "unbounded-stream-collect",
  "unbounded-stream-buffer",
  "handrolled-ttl-cache",
  "inflight-dedupe-map",
  "cache-per-request",
  "scoped-client-cache",
  "raw-fetch-abort-signal",
  "typed-error-recovery",
  "layer-forever-acquisition",
  "global-config-mutation",
  "service-method-effect-fn",
  "effect-fn-name",
  "schema-record-interface",
  "schema-optional-key",
  "schema-error-class",
  "config-secret-redaction",
  "bounded-retry-schedule",
  "http-response-validation",
  "http-status-decode-order",
  "effect-test-style"
)

const ruleKindSchema = Schema.Literals(ruleKinds)

// EffectQualityRuleData is detection payload because emission and reports share one record.
export const EffectQualityRuleData = Schema.Struct({
  kind: ruleKindSchema,
  subject: Schema.String
})

export interface EffectQualityRuleData extends Schema.Schema.Type<typeof EffectQualityRuleData> {}

// EffectQualityAdviceKind is kind vocabulary because evidence and advice must share kind keys.
export type EffectQualityAdviceKind =
  | "config-refined-values"
  | "retry-without-jitter"
  | "raw-fetch-outside-adapter"
  | "test-live-runtime"
  | "test-clock-for-time"
  | "thin-http-handlers"
  | "transaction-network-work"
  | "layer-authority-visibility"
  | "layer-composition"
  | "scoped-background-work"
  | "cache-preference"
  | "stream-pagination"
  | "public-queue"
  | "keyed-stream-work"
  | "typed-boundary-error"
  | "boundary-schema-decode"
  | "idempotent-retry"
  | "observable-worker-failure"
  | "http-client-preference"

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

// EffectQualityAdviceData is silent-check payload because derive and evidence share one record.
export const EffectQualityAdviceData = Schema.Struct({
  kind: adviceKindSchema,
  subject: Schema.String
})

export interface EffectQualityAdviceData extends Schema.Schema.Type<
  typeof EffectQualityAdviceData
> {}
