import { terminal, type CodingRun, type RunnerEvent } from "../../../packages/coding-contract/src/index";
import type { CodingRuntimeProjection, CodingRuntimeReply, RuntimeCancelCommand, RuntimeCommandOutcome,
  RuntimeEffectAuthorization, RuntimeEffectRequest } from "./coding-runtime-contract";

export interface CodingRuntimeState {
  schema: 1;
  identity: string | null;
  run: CodingRun | null;
  startAccepted: boolean;
  cancellationTombstone: boolean;
  sequence: number;
  commands: Record<string, { payload: string; outcome: RuntimeCommandOutcome }>;
  effects: Record<string, { kind: "work" | "cleanup"; generation: number }>;
  pending: CodingRuntimeProjection[];
}
export const initialCodingRuntimeState = (): CodingRuntimeState => ({ schema: 1, identity: null, run: null,
  startAccepted: false, cancellationTombstone: false, sequence: 0, commands: {}, effects: {}, pending: [] });

/** Canonical immutable identity includes the complete saved brief and exact config/source. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
export const runtimeInputIdentity = (run: CodingRun): string => canonical({ id: run.id, taskId: run.taskId,
  taskRevision: run.taskRevision, taskSnapshot: run.taskSnapshot, agent: run.agent, source: run.source,
  generation: run.generation, createdAt: run.createdAt });

/** Pure serialized transition engine. Caller must durably save state before returning any authorization. */
export class CodingRuntimeEngine {
  readonly state: CodingRuntimeState;
  constructor(state: CodingRuntimeState = initialCodingRuntimeState(), private readonly time = () => new Date().toISOString()) {
    this.state = structuredClone(state);
  }
  private attach(admission: CodingRun): CodingRun {
    const identity = runtimeInputIdentity(admission);
    if (this.state.identity !== null && this.state.identity !== identity) throw new Error("runtime_input_identity_conflict");
    if (!this.state.run) {
      // Never reconstruct authoritative lifecycle from a lagging/progressed D1 projection.
      if (admission.status !== "queued" || admission.runtimeVersion !== 0 || admission.result || admission.finishedAt) throw new Error("runtime_checkpoint_missing");
      if (admission.taskId !== admission.taskSnapshot.id || admission.taskRevision !== admission.taskSnapshot.revision ||
          !Number.isSafeInteger(admission.generation) || admission.generation < 1) throw new Error("runtime_input_identity_conflict");
      this.state.identity = identity;
      this.state.run = structuredClone({ ...admission, review: null, cancelRequested: false, cancellation: null });
    }
    return this.state.run;
  }
  private replay(key: string, payload: string): CodingRuntimeReply | null {
    const previous = this.state.commands[key];
    if (!previous) return null;
    if (previous.payload !== payload) throw new Error("idempotency_conflict");
    return { run: structuredClone(this.state.run!), outcome: structuredClone(previous.outcome) };
  }
  private record(key: string, payload: string, kind: RuntimeCommandOutcome["kind"], id: string,
    outcome: RuntimeCommandOutcome["outcome"], reason = ""): CodingRuntimeReply {
    const run = this.state.run!;
    const command: RuntimeCommandOutcome = { id, kind, outcome, reason, runtimeVersion: run.runtimeVersion };
    if (kind === "cancel") {
      const input = JSON.parse(payload) as RuntimeCancelCommand;
      run.cancellation = { requestId: id, expectedRuntimeVersion: input.expectedRuntimeVersion, outcome, reason };
    }
    this.state.commands[key] = { payload, outcome: command };
    const sequence = ++this.state.sequence;
    this.state.pending.push({ id: `runtime:${run.id}:${sequence}`, sequence, run: structuredClone(run), command });
    return { run: structuredClone(run), outcome: structuredClone(command) };
  }
  private advance(patch: Partial<CodingRun>): void {
    const old = this.state.run!;
    this.state.run = { ...old, ...patch, runtimeVersion: old.runtimeVersion + 1, updatedAt: this.time() };
  }
  start(admission: CodingRun): CodingRuntimeReply {
    const run = this.attach(admission), key = "start", payload = this.state.identity!;
    const replay = this.replay(key, payload); if (replay) return replay;
    this.state.startAccepted = true;
    const blocked = this.state.cancellationTombstone || terminal(run.status);
    if (!blocked) this.advance({});
    // Start is durable inbox acceptance, not an authorization to spawn a process.
    return this.record(key, payload, "start", run.id, blocked ? "noop" : "applied",
      blocked ? "work_no_longer_eligible" : "");
  }
  cancel(admission: CodingRun, command: RuntimeCancelCommand): CodingRuntimeReply {
    const run = this.attach(admission), key = `cancel:${command.id}`, payload = canonical(command);
    const replay = this.replay(key, payload); if (replay) return replay;
    if (command.actor !== "local-operator" || !command.id || !Number.isSafeInteger(command.expectedRuntimeVersion)) throw new Error("invalid_cancel_command");
    if (command.expectedRuntimeVersion !== run.runtimeVersion) return this.record(key, payload, "cancel", command.id, "conflict", "runtime_version_conflict");
    if (terminal(run.status) || run.status === "cancelling") return this.record(key, payload, "cancel", command.id, "noop", terminal(run.status) ? "already_terminal" : "already_cancelling");
    this.state.cancellationTombstone = true;
    this.advance({ status: "cancelling", cancelRequested: true, progress: "Cancellation acknowledged; waiting for local stop proof." });
    return this.record(key, payload, "cancel", command.id, "applied");
  }
  event(admission: CodingRun, event: RunnerEvent): CodingRuntimeReply {
    const old = this.attach(admission), key = `event:${event.eventId}`, payload = canonical(event);
    const replay = this.replay(key, payload); if (replay) return replay;
    const reject = (reason: string) => this.record(key, payload, "event", event.eventId, "conflict", reason);
    if (event.runId !== old.id || event.generation !== old.generation) return reject("generation_conflict");
    if (event.expectedVersion !== old.runtimeVersion) return reject("runtime_version_conflict");
    const allowed: Record<CodingRun["status"], readonly CodingRun["status"][]> = {
      queued: ["running", "failed", "interrupted"], running: ["running", "succeeded", "failed", "interrupted"],
      cancelling: ["cancelling", "cancelled", "interrupted"], succeeded: ["succeeded"], failed: ["failed"],
      cancelled: ["cancelled"], interrupted: ["interrupted"] };
    if (!allowed[old.status].includes(event.status)) return reject("illegal_transition");
    if (event.status === "running" && (!this.state.startAccepted || this.state.cancellationTombstone)) return reject("work_not_authorized");
    if (old.providerOutcome === "completed" && event.providerOutcome !== "completed" ||
        old.providerOutcome === "unknown" && event.providerOutcome === "not-started") return reject("provider_outcome_regression");
    if (!terminal(event.status) && event.cleanup !== "pending") return reject("active_cleanup");
    if (old.cleanup === "complete" && event.cleanup !== "complete") return reject("cleanup_regression");
    if (event.cleanup === "complete" && !terminal(old.status)) return reject("cleanup_requires_separate_acknowledgement");
    // A receipt or aborted SDK fiber is not stop proof. Only the trusted effect executor's
    // explicit old-generation stop assertion can acknowledge cancellation.
    if (event.status === "cancelled" && old.status !== "cancelled" && event.stopProven !== true) return reject("local_stop_unproven");
    if (event.status === "interrupted" && old.status === "cancelling" && event.stopProven !== true && event.cleanup !== "blocked") return reject("uncertain_stop_requires_blocked_cleanup");
    if (event.status === "succeeded" && (!event.result || event.providerOutcome !== "completed")) return reject("incomplete_result");
    if (event.status !== "succeeded" && event.result !== null) return reject("unexpected_result");
    if (["failed", "interrupted"].includes(event.status) && !event.error.trim()) return reject("missing_failure_reason");
    if (event.status === "succeeded" && event.diagnostic !== null) return reject("unexpected_failure_diagnostic");
    if (["failed", "interrupted"].includes(event.status) && event.diagnostic === null) return reject("missing_failure_diagnostic");
    if (terminal(old.status) && (event.status !== old.status || canonical(event.result) !== canonical(old.result) ||
        canonical(event.diagnostic) !== canonical(old.diagnostic) || event.error !== old.error || event.progress !== old.progress)) return reject("terminal_immutable");
    if (event.cleanup === "complete" && !Object.values(this.state.effects).some(effect => effect.kind === "cleanup" && effect.generation === old.generation)) return reject("cleanup_not_authorized");
    this.advance({ status: event.status, cleanup: event.cleanup, progress: event.progress, error: event.error,
      providerOutcome: event.providerOutcome, diagnostic: structuredClone(event.diagnostic), result: structuredClone(event.result),
      finishedAt: old.finishedAt ?? (terminal(event.status) ? this.time() : null) });
    return this.record(key, payload, "event", event.eventId, "applied");
  }
  authorize(request: RuntimeEffectRequest): RuntimeEffectAuthorization {
    const run = this.state.run;
    const reply = (authorized: boolean, reason: string): RuntimeEffectAuthorization => ({ authorized, reason,
      runId: request.runId, generation: request.generation, kind: request.kind,
      runtimeVersion: run?.runtimeVersion ?? 0, effectId: request.effectId });
    if (!run || request.runId !== run.id || request.generation !== run.generation) return reply(false, "generation_conflict");
    if (request.expectedRuntimeVersion !== run.runtimeVersion) return reply(false, "runtime_version_conflict");
    if (!request.effectId || !["work", "cleanup"].includes(request.kind)) return reply(false, "invalid_effect");
    if (request.kind === "work" && (!this.state.startAccepted || this.state.cancellationTombstone || run.status !== "running")) return reply(false, "work_not_authorized");
    // Teardown-only capability may be persisted before work, so an API outage cannot prevent
    // fail-safe stopping of these exact owned resources. It never authorizes execution/reuse.
    if (request.kind === "cleanup" && run.cleanup === "complete") return reply(false, "cleanup_not_authorized");
    const key = `effect:${request.effectId}`;
    const previous = this.state.effects[key];
    if (previous && (previous.kind !== request.kind || previous.generation !== request.generation)) return reply(false, "effect_identity_conflict");
    this.state.effects[key] = { kind: request.kind, generation: request.generation };
    return reply(true, "");
  }
  acknowledgeProjection(id: string): void {
    // FIFO ack prevents a gap from dropping an older authoritative event.
    if (this.state.pending[0]?.id === id) this.state.pending.shift();
  }
}
