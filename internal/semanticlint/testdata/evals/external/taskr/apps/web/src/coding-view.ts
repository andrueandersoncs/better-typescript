import type { HtmlBuilder } from "foldkit/html";
import { Message, codingEligibility, currentTaskRevision, staleReviewKey, canCancelCoding, type Model } from "./main";

const statusLabels = {
  queued: "Queued",
  running: "Running",
  cancelling: "Cancelling",
  succeeded: "Result submitted",
  failed: "Failed",
  cancelled: "Cancelled",
  interrupted: "Interrupted",
} as const;

const compactId = (id: string) => id.length > 12 ? id.slice(0, 8) : id;
const compactDate = (value: string) => value.replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
const sameMessage = (left: string, right: string) =>
  left.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === right.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const codingRuns = (model: Model, h: HtmlBuilder<Message>) => {
  const state = model.coding;
  const {agent, source, runs} = state.history;
  const reason = codingEligibility(model);
  const revision = currentTaskRevision(model);
  const currentTask = model.tasks.find((task) => task.id === model.editingId);
  const latest = runs[0];
  const acknowledged = (runId: string, digest: string) => state.staleReviewAcknowledgement === staleReviewKey(runId, digest, revision);
  const metric = (label: string, value: string) => h.div([h.Class("coding-metric")], [
    h.span([], [label]),
    h.strong([], [value]),
  ]);
  const diagnosticText = (run: (typeof runs)[number]) => {
    const diagnostic = run.diagnostic;
    if (!diagnostic) return "";
    const native = diagnostic.nativeStage ? `native ${diagnostic.nativeStage}${diagnostic.nativeEventStage ? `/${diagnostic.nativeEventStage}` : ""}${diagnostic.nativeReason ? ` (${diagnostic.nativeReason})` : ""}` : "";
    const gateway = diagnostic.gatewayPhase ? `gateway ${diagnostic.gatewayPhase}${diagnostic.gatewayReason ? `/${diagnostic.gatewayReason}` : ""}${diagnostic.gatewayFailed === null ? "" : diagnostic.gatewayFailed ? " failed" : " healthy"}${diagnostic.modelRequests === null ? "" : `, ${diagnostic.modelRequests} model request${diagnostic.modelRequests === 1 ? "" : "s"}`}${diagnostic.toolCalls === null ? "" : `, ${diagnostic.toolCalls} tool call${diagnostic.toolCalls === 1 ? "" : "s"}`}` : "";
    return [`Runtime diagnostic: ${diagnostic.runtimeStage}/${diagnostic.code}`, native, gateway].filter(Boolean).join(" · ");
  };
  const unavailable = !state.history.available ? state.history.unavailableReason || "Unavailable. Requires a configured runner and explicit operator live enable." : "";
  const showReason = !!reason && (!unavailable || !sameMessage(reason, unavailable));
  const historySummary = runs.length
    ? `${runs.length} attempt${runs.length === 1 ? "" : "s"} · Latest: ${statusLabels[latest!.status]}`
    : state.loaded ? "No attempts yet" : "Execution history";

  return h.section([h.Class("coding-runs"), h.AriaLabel("Codex coding runs")], [
    h.details([h.Class("coding-runs-disclosure")], [
      h.summary([h.Class("coding-runs-toggle")], [
        h.span([h.Class("coding-toggle-copy")], [
          h.span([h.Class("coding-eyebrow")], ["Agent execution"]),
          h.span([h.Class("coding-toggle-title")], ["Codex runs"]),
        ]),
        h.span([h.Class(`coding-toggle-status ${latest ? `status-${latest.status}` : ""}`)], [historySummary]),
      ]),
      h.div([h.Class("coding-runs-content")], [
        h.div([h.Class("coding-section-heading")], [
          h.div([], [
            h.span([h.Class("coding-eyebrow")], ["Isolated workspace"]),
            h.h3([], ["Start a focused run"]),
          ]),
          h.span([h.Class(`coding-availability ${state.history.available ? "available" : "unavailable"}`)], [
            state.history.available ? "Available" : "Live disabled",
          ]),
        ]),
        h.p([h.Class("coding-lede")], ["Codex receives the saved task and a frozen source snapshot. You review the resulting artifact before anything changes."]),
        h.details([h.Class("coding-safety")], [
          h.summary([], ["Execution boundaries"]),
          h.div([], [
            h.p([], ["Saving, assignment and Ready never start a run. Assignee and reviewer text do not grant authority."]),
            h.p([], ["Runs cannot automatically apply, merge, commit or deploy. Review is a local-operator decision, not production authentication."]),
          ]),
        ]),

        h.div([h.Class("coding-setup")], [
          ...(agent ? [
            h.label([h.Class("form-field coding-agent-field")], [
              h.span([], ["Run with"]),
              h.select([h.AriaLabel("Configured run agent"), h.Value(state.selectedAgent), h.Disabled(state.busy || !!state.pending),
                h.OnChange((id) => Message.SelectedCodingAgent({id}))], [
                h.option([h.Value(""), h.Selected(!state.selectedAgent)], ["Choose an agent"]),
                h.option([h.Value(agent.id), h.Selected(state.selectedAgent === agent.id)], [agent.name]),
              ]),
            ]),
            h.div([h.Class("coding-metrics")], [
              metric("Identity", `${agent.id} · v${agent.version}`),
              metric("Model", agent.model),
              metric("Request limit", `${agent.limits.maxModelRequests} model · ${agent.limits.maxToolCalls} tools`),
              metric("Time limit", `${agent.limits.maxDurationMs / 1000} seconds`),
            ]),
          ] : [h.div([h.Class("coding-notice neutral")], [h.strong([], ["No agent configured"]), h.p([], ["Configure a local Codex runner before starting execution."])])]),
          ...(source ? [h.details([h.Class("coding-source")], [
            h.summary([], [
              h.span([], ["Source snapshot"]),
              h.span([], [source.label]),
            ]),
            h.div([h.Class("coding-source-grid")], [
              metric("Receipt", source.id),
              metric("Revision", source.revision),
              metric("Created", compactDate(source.createdAt)),
            ]),
          ])] : []),
          ...(!state.history.available ? [h.div([h.Class("coding-notice warning"), h.Role("status")], [
            h.strong([], ["Execution unavailable"]),
            h.p([], [unavailable]),
          ])] : []),
          ...(state.pending ? [h.div([h.Class("coding-notice warning")], [
            h.strong([], ["Admission needs resolution"]),
            h.p([], [`Task revision ${state.pending.taskRevision} · ${state.pending.agentId} v${state.pending.agentVersion} · source ${compactId(state.pending.sourceId)}`]),
            h.p([], ["Retry sends the identical stored request. It does not create a new attempt."]),
          ])] : []),
          ...(showReason ? [h.p([h.Class("coding-inline-hint")], [reason])] : []),
          h.div([h.Class("run-actions")], [
            h.button([h.Type("button"), h.Class("button primary"), h.Disabled(!!reason), h.OnClick(Message.ClickedStartCoding())],
              [state.busy ? "Request pending…" : state.pending ? "Retry original request" : "Run with Codex"]),
            h.button([h.Type("button"), h.Class("button quiet"), h.Disabled(state.busy || model.saving || model.deleting), h.OnClick(Message.ClickedRefreshCoding())], ["Refresh history"]),
            ...(state.conflict && state.pending ? [h.button([h.Type("button"), h.Class("button quiet"), h.Disabled(state.busy), h.OnClick(Message.ClickedForgetCoding())], ["Clear rejected request"])] : []),
          ]),
        ]),

        ...(runs.some((run) => run.providerOutcome === "unknown") ? [h.div([h.Class("coding-notice warning"), h.Role("status")], [
          h.strong([], ["Earlier usage is unresolved"]),
          h.p([], ["A previous attempt has unknown provider completion and usage. Completed local cleanup does not prove provider stop or zero consumption. A new run is a separate request; Taskr never retries automatically."]),
        ])] : []),
        h.div([h.Class("coding-history-heading")], [
          h.div([], [h.span([h.Class("coding-eyebrow")], ["Activity"]), h.h3([], ["Run history"])]),
          h.span([], [`${runs.length} total`]),
        ]),
        ...(state.loading ? [h.p([h.Role("status"), h.Class("coding-empty")], ["Loading run history…"])] : []),
        ...(state.error ? [h.div([h.Role("alert"), h.Class("coding-notice danger")], [
          h.strong([], ["History could not be reconciled"]),
          h.p([], [state.error, state.conflict ? " Version conflict. Refresh before acting again." : " A failed response does not prove execution stopped."]),
        ])] : []),
        ...(state.loaded && !runs.length ? [h.div([h.Class("coding-empty")], [h.strong([], ["No runs yet"]), h.p([], ["Select an agent to start this task in an isolated checkout."])])] : []),
        h.div([h.Class("coding-history")], runs.map((run) => h.details([h.Class(`coding-run status-${run.status}`)], [
          h.summary([h.Class("coding-run-summary"), h.AriaLabel(`Open run ${run.id}`)], [
            h.span([h.Class("coding-run-marker")]),
            h.span([h.Class("coding-run-identity")], [
              h.strong([], [`Run ${compactId(run.id)}`]),
              h.span([], [compactDate(run.createdAt)]),
            ]),
            h.span([h.Class(`coding-status-pill status-${run.status}`)], [statusLabels[run.status]]),
            h.span([h.Class(`coding-cleanup cleanup-${run.cleanup}`)], [`Cleanup ${run.cleanup}`]),
          ]),
          h.div([h.Class("coding-run-content")], [
            h.div([h.Class("coding-metrics coding-run-metrics")], [
              metric("Task revision", `${run.taskRevision}`),
              metric("Agent", `${run.agent.name} · v${run.agent.version}`),
              metric("Model", run.agent.model),
              metric("Runtime", `v${run.runtimeVersion} · generation ${run.generation}`),
            ]),
            h.div([h.Class("coding-progress")], [
              h.span([], ["Latest update"]),
              h.strong([], [run.progress || "No progress reported"]),
              h.small([], [compactDate(run.updatedAt)]),
            ]),
            h.div([h.Class("coding-state-row")], [
              h.span([h.Class(`coding-state provider-${run.providerOutcome}`)], [run.providerOutcome === "unknown" ? "Provider outcome unknown" : `Provider ${run.providerOutcome}`]),
              h.span([h.Class(`coding-state cleanup-${run.cleanup}`)], [run.cleanup === "complete" ? "Resources released" : `Cleanup ${run.cleanup}`]),
            ]),
            ...(run.providerOutcome === "unknown" ? [h.p([h.Class("coding-inline-hint warning-text")], ["Provider completion and usage are unknown. Do not assume no consumption."])] : []),
            ...(run.cleanup !== "complete" ? [h.p([h.Class("coding-inline-hint warning-text")], ["The task remains reserved. Cancellation is not proof of termination."])] : []),
            ...(run.error ? [h.div([h.Class("coding-notice danger")], [h.strong([], ["Run stopped"]), h.p([], [run.error])])] : []),
            ...(run.diagnostic ? [h.details([h.Class("coding-technical")], [
              h.summary([], ["Runtime diagnostic"]),
              h.p([h.Role("status")], [diagnosticText(run)]),
            ])] : []),
            ...(run.cancellation ? [h.div([h.Class("coding-notice warning"), h.Role("status")], [
              h.strong([], [`Cancellation ${run.cancellation.outcome}`]),
              h.p([], [
                run.cancellation.outcome === "pending" ? "Request recorded, not yet applied by the runtime. Execution may still be running." :
                run.cancellation.outcome === "applied" ? "Runtime accepted cancellation. This does not prove termination; check lifecycle and cleanup." :
                run.cancellation.outcome === "conflict" ? "Runtime revision changed. This command did not cancel the run. Refresh before an explicit retry." :
                "The command made no lifecycle change. Refresh before another action.",
              ]),
              ...(run.cancellation.reason ? [h.small([], [run.cancellation.reason])] : []),
            ])] : run.cancelRequested ? [h.div([h.Class("coding-notice warning"), h.Role("status")], [
              h.strong([], ["Cancellation requested"]),
              h.p([], ["Awaiting controller acknowledgement; execution may still be running."]),
            ])] : []),
            ...(!run.cancelRequested && ["queued", "running"].includes(run.status) ? [h.button([h.Type("button"), h.Class("button danger"), h.Disabled(!canCancelCoding(model, run)),
              h.OnClick(Message.ClickedCancelCoding({runId: run.id, expectedVersion: run.version}))], ["Cancel coding run"])] : []),
            h.details([h.Class("coding-technical")], [
              h.summary([], ["Frozen execution details"]),
              h.div([h.Class("coding-technical-grid")], [
                metric("Run ID", run.id),
                metric("Run versions", `Run v${run.version} · runtime v${run.runtimeVersion}`),
                metric("Frozen limits", `${run.agent.limits.maxModelRequests} requests · ${run.agent.limits.maxToolCalls} tools · ${run.agent.limits.maxDurationMs / 1000}s`),
                metric("Source", `${run.source.label} · ${run.source.id} · ${run.source.revision}`),
              ]),
              h.details([], [
                h.summary([], ["Frozen task input"]),
                h.strong([], [run.taskSnapshot.title]),
                h.pre([h.Class("run-log")], [run.taskSnapshot.description || "(no brief)"]),
                h.pre([h.Class("run-log")], [run.taskSnapshot.acceptanceCriteria || "(no acceptance criteria)"]),
              ]),
            ]),
            ...(run.result ? [h.div([h.Class("coding-result")], [
              h.div([h.Class("coding-result-heading")], [
                h.div([], [h.span([h.Class("coding-eyebrow")], ["Submitted artifact"]), h.h4([], ["Result for review"])]),
                h.span([h.Class("coding-digest"), h.Title(run.result.digest)], [`Digest ${compactId(run.result.digest)}`]),
              ]),
              h.pre([h.Class("run-log result-summary"), h.AriaLabel("Result summary"), h.Tabindex(0)], [run.result.summary]),
              h.div([h.Class("coding-file-list")], run.result.changedFiles.map((file) => h.span([], [file]))),
              h.details([h.Class("coding-artifact")], [
                h.summary([], ["View patch"]),
                h.pre([h.Class("run-log"), h.AriaLabel("Result diff"), h.Tabindex(0)], [run.result.diff || "(no diff)"]),
              ]),
              h.div([h.Class("coding-checks")], run.result.checks.map((check) => h.details([h.Class(`coding-check check-${check.status}`)], [
                h.summary([], [`${check.name} · ${check.status}`]),
                h.pre([h.Class("run-log"), h.Tabindex(0)], [check.output || "(no output)"]),
              ]))),
              h.p([h.Class("coding-usage")], [run.result.usage
                ? `${run.result.usage.totalTokens.toLocaleString()} tokens · ${run.result.usage.inputTokens.toLocaleString()} input · ${run.result.usage.outputTokens.toLocaleString()} output`
                : "Usage not reported"]),
              h.div([h.Class("coding-review-note")], [
                h.strong([], ["Review is evidence, not application"]),
                h.p([], ["The decision binds only this digest. Accepting does not apply changes or mark the task done."]),
                h.small([], [`Result task revision ${run.taskRevision} · current saved revision ${revision}`]),
              ]),
              ...(run.taskRevision !== revision && !run.review ? [h.div([h.Class("coding-notice warning")], [
                h.strong([], ["Task changed after this run"]),
                h.p([], ["Compare the frozen input with the current task before reviewing this older result. Unsaved edits are not review input."]),
                ...(currentTask ? [h.details([h.Class("coding-technical")], [
                  h.summary([], ["Current saved task input"]),
                  h.strong([], [currentTask.title]),
                  h.pre([h.Class("run-log")], [currentTask.description]),
                  h.pre([h.Class("run-log")], [currentTask.acceptanceCriteria]),
                ])] : []),
                h.label([h.Class("coding-acknowledgement")], [
                  h.input([h.Type("checkbox"), h.Checked(acknowledged(run.id, run.result.digest)), h.Disabled(state.busy),
                    h.OnClick(Message.ChangedStaleReviewAcknowledgement({runId: run.id, resultDigest: run.result.digest, taskRevision: revision, checked: !acknowledged(run.id, run.result.digest)}))]),
                  h.span([], [`I understand this result used task revision ${run.taskRevision}, not current revision ${revision}.`]),
                ]),
              ])] : []),
              ...(run.review ? [h.div([h.Class(`coding-review-decision review-${run.review.decision}`)], [
                h.strong([], [`${run.review.decision} by ${run.review.reviewer} · ${run.review.createdAt} · Digest: ${run.review.resultDigest}`]),
                ...(run.review.note ? [h.p([], [run.review.note])] : []),
                h.small([], [`Review input revision ${run.review.inputTaskRevision}; current revision at decision ${run.review.expectedTaskRevision}; stale input acknowledged: ${run.review.acknowledgeStaleTask ? "yes" : "no"}.`]),
              ])] : run.status === "succeeded" && run.cleanup === "complete" ? [
                h.div([h.Class("coding-review-actions")], [
                  h.label([h.Class("form-field")], [
                    h.span([], ["Review note", h.small([], ["required for rejection"])]),
                    h.textarea([h.AriaLabel(`Review note ${run.id}`), h.Value(state.note), h.Maxlength(4000),
                      h.Placeholder("What did you verify?"), h.Disabled(state.busy), h.OnInput((value) => Message.ChangedReviewNote({value}))]),
                  ]),
                  h.div([], [
                    h.button([h.Type("button"), h.Class("button primary"), h.OnClick(Message.ClickedReviewCoding({runId: run.id, resultDigest: run.result.digest, decision: "accepted"})),
                      h.Disabled(state.busy || !!state.pending || (run.taskRevision !== revision && !acknowledged(run.id, run.result.digest)))], ["Accept result"]),
                    h.button([h.Type("button"), h.Class("button danger"), h.OnClick(Message.ClickedReviewCoding({runId: run.id, resultDigest: run.result.digest, decision: "rejected"})),
                      h.Disabled(state.busy || !!state.pending || !state.note.trim() || (run.taskRevision !== revision && !acknowledged(run.id, run.result.digest)))], ["Reject result"]),
                  ]),
                ]),
              ] : [h.p([h.Class("coding-empty compact")], ["Review becomes available after a successful result and completed cleanup."])]),
            ])] : [h.p([h.Class("coding-empty compact")], ["No artifact was submitted for this attempt."])]),
          ]),
        ]))),
      ]),
    ]),
  ]);
};
