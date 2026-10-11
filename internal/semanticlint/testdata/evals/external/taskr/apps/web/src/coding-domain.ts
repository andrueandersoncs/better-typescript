import { Schema } from "effect";
import { Task } from "./domain";
// Decode all public data before it reaches the pure model or HTML text nodes.
export const AgentConfig = Schema.Struct({ id: Schema.String, version: Schema.Number, name: Schema.String,
  provider: Schema.Literal("codex-chatgpt"), model: Schema.String,
  limits: Schema.Struct({maxModelRequests: Schema.Number, maxToolCalls: Schema.Number, maxDurationMs: Schema.Number}) });
export const SourceReceipt = Schema.Struct({id: Schema.String, revision: Schema.String, createdAt: Schema.String, label: Schema.String});
export const RunResult = Schema.Struct({version: Schema.Literal(1), digest: Schema.String, summary: Schema.String,
  diff: Schema.String, changedFiles: Schema.Array(Schema.String), checks: Schema.Array(Schema.Struct({name: Schema.String,
    status: Schema.Literals(["passed", "failed", "not-run"]), exitCode: Schema.NullOr(Schema.Number), output: Schema.String})),
  usage: Schema.NullOr(Schema.Struct({inputTokens: Schema.Number, outputTokens: Schema.Number, totalTokens: Schema.Number}))});
export const CancellationReceipt = Schema.Struct({requestId: Schema.String, expectedRuntimeVersion: Schema.Number,
  outcome: Schema.Literals(["pending", "applied", "conflict", "noop"]), reason: Schema.String});
export const RunDiagnostic = Schema.Struct({
  runtimeStage: Schema.Literals(["allocation", "native", "collect", "result", "stop", "recovery"]),
  code: Schema.Literals(["task-runtime-boundary-unverified", "runtime-live-disabled", "input-policy", "owned-ledger", "duplicate-attempt", "resource-ownership", "cleanup-blocked", "native-protocol", "native-policy", "native-transport", "tool-correlation", "tool-budget", "tool-failed", "result-policy", "cancelled", "duration-limit", "runtime-failed"]),
  nativeStage: Schema.NullOr(Schema.Literals(["initialize", "config", "account", "quota", "model", "thread", "turn-start", "turn-bind", "waiting", "verify-complete", "usage-total", "rpc-close"])),
  nativeEventStage: Schema.NullOr(Schema.Literals(["initial", "plan", "tool-receipt", "bind-thread", "bind-turn", "replay", "notification-budget", "notification-shape", "notification-policy", "notification-early", "notification-correlation", "thread-shape", "thread-settings", "thread-status", "turn-shape", "turn-items", "turn-completed", "item-shape", "item-type", "agent-message-shape", "tool-item-correlation", "item-order", "agent-message-phase", "agent-message-deltas", "delta-shape", "delta-order", "delta-budget", "usage", "verify-readiness", "verify-terminal-summary", "verify-unique-ids", "verify-terminal-coverage", "verify-completed-coverage", "verified"])),
  nativeReason: Schema.NullOr(Schema.Literals(["none", "other", "account-changed", "event-correlation", "forbidden-item", "incomplete-turn", "item-policy", "output-policy", "quota-changed", "thread-policy", "tool-correlation", "transport-limit", "turn-policy", "unexpected-event", "usage-policy", "native-protocol", "native-policy", "native-transport", "cancelled", "duration-limit"])),
  gatewayPhase: Schema.NullOr(Schema.Literals(["initial", "metadata", "request-policy", "upstream", "response-policy", "validated", "control"])),
  gatewayReason: Schema.NullOr(Schema.Literals(["none", "policy", "request-policy", "upstream-transport", "upstream-status", "upstream-encoding", "upstream-body", "upstream-model", "upstream-content-type", "response-policy", "response-admission", "response-framing", "response-block", "response-event-json", "response-event-type", "response-event-fields", "response-sequence", "response-envelope", "response-fields", "response-fields-conversation", "response-fields-prompt", "response-fields-prompt-cache-retention", "response-fields-billing", "response-fields-other", "response-state", "response-state-identity", "response-state-status", "response-state-error", "response-state-storage", "response-state-service-tier", "response-state-model", "response-state-tool-choice", "response-state-tools", "response-metadata", "response-output", "response-usage", "response-item-index", "response-item-added", "response-item-state", "response-item-done", "response-item-done-message", "response-item-done-reasoning", "response-item-done-function-call", "response-function-identity", "response-function-fields", "response-function-tool", "response-function-namespace", "response-function-encrypted-state", "response-function-arguments", "response-function-arguments-text", "response-function-arguments-json", "response-function-arguments-object", "response-function-arguments-fields", "response-function-arguments-operation", "response-function-arguments-path", "response-function-arguments-path-type", "response-function-arguments-path-empty", "response-function-arguments-path-absolute", "response-function-arguments-path-backslash", "response-function-arguments-path-segments", "response-function-arguments-content", "response-function-arguments-mode", "response-item-stream", "response-stream-identity", "response-stream-function-arguments", "response-stream-content-part", "response-stream-output-text", "response-stream-reasoning-summary-part", "response-stream-reasoning-summary-text", "response-stream-reasoning-text", "response-completion", "metadata-response", "control-policy"])),
  gatewayFailed: Schema.NullOr(Schema.Boolean), modelRequests: Schema.NullOr(Schema.Number), toolCalls: Schema.NullOr(Schema.Number),
});
export const CodingRun = Schema.Struct({id: Schema.String, taskId: Schema.String, taskRevision: Schema.Number,
  agent: AgentConfig, source: SourceReceipt, status: Schema.Literals(["queued", "running", "cancelling", "succeeded", "failed", "cancelled", "interrupted"]),
  version: Schema.Number, generation: Schema.Number, createdAt: Schema.String, updatedAt: Schema.String, finishedAt: Schema.NullOr(Schema.String),
  cancelRequested: Schema.Boolean, runtimeVersion: Schema.Number, cancellation: Schema.NullOr(CancellationReceipt),
  cleanup: Schema.Literals(["pending", "complete", "blocked"]), error: Schema.String, progress: Schema.String,
  providerOutcome: Schema.Literals(["not-started", "unknown", "completed"]), diagnostic: Schema.NullOr(RunDiagnostic), taskSnapshot: Task, result: Schema.NullOr(RunResult),
  review: Schema.NullOr(Schema.Struct({id: Schema.String, resultDigest: Schema.String, decision: Schema.Literals(["accepted", "rejected"]),
    note: Schema.String, createdAt: Schema.String, reviewer: Schema.Literal("local-operator"),
    expectedTaskRevision: Schema.Number, inputTaskRevision: Schema.Number, acknowledgeStaleTask: Schema.Boolean})) });
export type CodingRun = typeof CodingRun.Type;
export const CodingRunHistory = Schema.Struct({available: Schema.Boolean, unavailableReason: Schema.String,
  agent: Schema.NullOr(AgentConfig), source: Schema.NullOr(SourceReceipt), runs: Schema.Array(CodingRun)});
export const StartBody = Schema.Struct({requestId: Schema.String, taskRevision: Schema.Number, agentId: Schema.String,
  agentVersion: Schema.Number, sourceId: Schema.String});
export const codingCorrelation = {taskId: Schema.String, epoch: Schema.Number, generation: Schema.Number};
export const CodingState = Schema.Struct({history: CodingRunHistory, loading: Schema.Boolean, loaded: Schema.Boolean,
  busy: Schema.Boolean, error: Schema.String, generation: Schema.Number, pending: Schema.NullOr(StartBody),
  conflict: Schema.Boolean, selectedAgent: Schema.String, note: Schema.String, staleReviewAcknowledgement: Schema.String, refreshedCancellation: Schema.String});
export const codingDefaults: typeof CodingState.Type = {history: {available: false, unavailableReason: "Configuration has not loaded.", agent: null, source: null, runs: []},
  loading: false, loaded: false, busy: false, error: "", generation: 0, pending: null, conflict: false, selectedAgent: "", note: "", staleReviewAcknowledgement: "", refreshedCancellation: ""};
export const codingMessages = {
  ClickedRefreshCoding: {}, SelectedCodingAgent: {id: Schema.String}, ClickedStartCoding: {}, ClickedForgetCoding: {},
  LoadedCoding: {...codingCorrelation, history: CodingRunHistory, pending: Schema.NullOr(StartBody)},
  FailedCoding: {...codingCorrelation, error: Schema.String, pending: Schema.NullOr(StartBody), conflict: Schema.Boolean},
  UpdatedCoding: {...codingCorrelation, run: CodingRun}, ForgottenCoding: {...codingCorrelation},
  ClickedCancelCoding: {runId: Schema.String, expectedVersion: Schema.Number},
  ChangedReviewNote: {value: Schema.String},
  ChangedStaleReviewAcknowledgement: {runId: Schema.String, resultDigest: Schema.String, taskRevision: Schema.Number, checked: Schema.Boolean},
  RefreshedCodingTask: {...codingCorrelation, task: Task},
  ClickedReviewCoding: {runId: Schema.String, resultDigest: Schema.String, decision: Schema.Literals(["accepted", "rejected"])},
};
export const holdsReservation = (run: CodingRun) => ["queued", "running", "cancelling"].includes(run.status) || run.cleanup !== "complete";

// Compile-time cross-layer drift checks; imports are erased from the browser bundle.
import type * as Contract from "../../../packages/coding-contract/src/index";
type Assert<T extends true> = T;
export type RunContractCompatible = Assert<CodingRun extends Contract.CodingRun ? true : false>;
export type RunSchemaComplete = Assert<Contract.CodingRun extends CodingRun ? true : false>;
export type HistoryContractCompatible = Assert<typeof CodingRunHistory.Type extends Contract.CodingRunHistory ? true : false>;
