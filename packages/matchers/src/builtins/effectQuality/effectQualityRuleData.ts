import { Array, Schema } from "effect"

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
