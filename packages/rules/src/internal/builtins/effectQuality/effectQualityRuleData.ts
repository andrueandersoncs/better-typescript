import { Array, Schema } from "effect"

const ruleNames = Array.make<
  [
    "boundary-schema-decode",
    "bounded-retry-schedule",
    "cache-per-request",
    "cache-preference",
    "config-refined-values",
    "effect-fn-name",
    "effect-test-style",
    "global-config-mutation",
    "handrolled-ttl-cache",
    "http-client-preference",
    "http-response-validation",
    "http-status-decode-order",
    "idempotent-retry",
    "inflight-dedupe-map",
    "layer-forever-acquisition",
    "observable-worker-failure",
    "process-environment",
    "production-sleep-loops",
    "raw-fetch-abort-signal",
    "raw-fetch-outside-adapter",
    "retry-without-jitter",
    "schema-class-models",
    "schema-error-class",
    "schema-optional-key",
    "schema-record-interface",
    "scoped-background-work",
    "scoped-client-cache",
    "service-method-effect-fn",
    "stream-pagination",
    "test-clock-for-time",
    "test-sleeps",
    "typed-boundary-error",
    "typed-error-recovery",
    "typescript-namespaces",
    "unbounded-stream-buffer",
    "unbounded-stream-collect",
    "unsafe-casts"
  ]
>(
  "boundary-schema-decode",
  "bounded-retry-schedule",
  "cache-per-request",
  "cache-preference",
  "config-refined-values",
  "effect-fn-name",
  "effect-test-style",
  "global-config-mutation",
  "handrolled-ttl-cache",
  "http-client-preference",
  "http-response-validation",
  "http-status-decode-order",
  "idempotent-retry",
  "inflight-dedupe-map",
  "layer-forever-acquisition",
  "observable-worker-failure",
  "process-environment",
  "production-sleep-loops",
  "raw-fetch-abort-signal",
  "raw-fetch-outside-adapter",
  "retry-without-jitter",
  "schema-class-models",
  "schema-error-class",
  "schema-optional-key",
  "schema-record-interface",
  "scoped-background-work",
  "scoped-client-cache",
  "service-method-effect-fn",
  "stream-pagination",
  "test-clock-for-time",
  "test-sleeps",
  "typed-boundary-error",
  "typed-error-recovery",
  "typescript-namespaces",
  "unbounded-stream-buffer",
  "unbounded-stream-collect",
  "unsafe-casts"
)

const ruleNameSchema = Schema.Literals(ruleNames)

// EffectQualityRuleData exists because its fields form one stable data contract used by the linter.
export const EffectQualityRuleData = Schema.Struct({
  kind: ruleNameSchema,
  subject: Schema.String
})

export interface EffectQualityRuleData extends Schema.Schema.Type<typeof EffectQualityRuleData> {}
