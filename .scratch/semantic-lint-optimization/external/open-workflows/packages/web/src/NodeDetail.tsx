import { useEffect, useState } from "react";
import { Option, Predicate, Record as EffectRecord, Schema } from "effect";
import type { GraphNode } from "@open-workflows/graph";
import {
  isKept,
  type Maybe,
  type NodeActivity,
  type NodeInstance,
  type NodeStatus,
  type RunEvent,
  type VerifyVerdict,
} from "./useRun.js";

const STATUS_COLOR: Record<NodeStatus, string> = {
  idle: "#94a3b8",
  running: "#3b82f6",
  retrying: "#f59e0b",
  succeeded: "#22c55e",
  failed: "#ef4444",
  stopped: "#78716c", // stopped by request (DESIGN.md §9)
};

const isObj = (v: unknown): v is Record<string, unknown> => {
  const isObjectType = typeof v === "object";
  const nonNull = v !== null;
  return isObjectType && nonNull;
};

const jsonStringify = (v: unknown): string => JSON.stringify(v, null, 2);
const safeStringify = Option.liftThrowable(jsonStringify);
const toFallbackString = (v: unknown): (() => string) => () => String(v);

const pretty = (v: unknown): string => {
  const stringified = safeStringify(v);
  const fallback = toFallbackString(v);
  return Option.getOrElse(stringified, fallback);
};

const isAnomaly = (i: NodeInstance): boolean => {
  const failed = i.status === "failed";
  const stopped = i.status === "stopped";
  return failed || stopped;
};

export const defaultInstanceIndex = (instances: ReadonlyArray<NodeInstance>): number => {
  const firstNotable = instances.findIndex(isAnomaly);
  return firstNotable >= 0 ? firstNotable : Math.max(0, instances.length - 1);
};

type StopTargetArgs = {
  readonly nodeId: string;
  readonly fanned: boolean;
  readonly aggregateStatus: NodeStatus;
  readonly hasControl: boolean;
} & Partial<{
  readonly selected: NodeInstance;
  readonly firstInstance: NodeInstance;
}>;

type StopTarget = { readonly targetId: string; readonly canStop: boolean };

export const nodeStopTarget = (args: StopTargetArgs): StopTarget => {
  const { nodeId, fanned, selected, firstInstance, aggregateStatus, hasControl } = args;
  const targetInstance = fanned ? selected : firstInstance;
  const targetId = targetInstance?.runtimeId ?? nodeId;
  const targetStatus = fanned ? (selected?.status ?? "idle") : aggregateStatus;
  const isRunning = targetStatus === "running";
  const isRetrying = targetStatus === "retrying";
  const inFlight = isRunning || isRetrying;
  const canStop = hasControl && inFlight;
  const target = { targetId, canStop };
  return target;
};

type NodeDetailProps = {
  readonly node: GraphNode;
  readonly onClose: () => void;
} & Partial<{
  readonly activity: NodeActivity;

  readonly onStopNode: (runtimeId: string) => void;

  readonly controlBusy: boolean;
}>;

export const NodeDetail = ({
  node,
  activity,
  onClose,
  onStopNode,
  controlBusy,
}: NodeDetailProps) => {
  const status = activity?.status ?? "idle";
  const template = node.meta?.promptTemplate;
  const instanceList = activity?.instanceList ?? [];
  const multiInstance = (activity?.instances ?? 0) > 1;
  const multiListed = instanceList.length > 1;
  const fanned = multiInstance && multiListed;

  const [selectedIdx, setSelectedIdx] = useState(0);
  const resetSelectedIdx = () => {
    const idx = defaultInstanceIndex(instanceList);
    return void setSelectedIdx(idx);
  };
  useEffect(resetSelectedIdx, [node.id, instanceList.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clamp once: a live update can shrink the list below a stale `selectedIdx` for one render.
  const safeIdx = fanned ? Math.min(selectedIdx, instanceList.length - 1) : 0;
  const selected: Maybe<NodeInstance> = instanceList[safeIdx];

  const detail = fanned ? selected?.detail : activity?.detail;

  // inline resolvedPrompt — split into consts to satisfy no-multiple-boolean-operators
  const resolvedPromptRaw = isObj(detail) ? detail.prompt : undefined;
  const resolvedPromptType = typeof resolvedPromptRaw;
  const resolvedPromptIsString = resolvedPromptType === "string";
  const resolved: string | undefined = resolvedPromptIsString ? resolvedPromptRaw as string : undefined;

  // inline resolvedModel — same pattern
  const resolvedModelRaw = isObj(detail) ? detail.model : undefined;
  const resolvedModelType = typeof resolvedModelRaw;
  const resolvedModelIsString = resolvedModelType === "string";
  const model: string | undefined = resolvedModelIsString ? resolvedModelRaw as string : undefined;

  // inline resolvedMaxTokens — same pattern
  const resolvedMaxTokensRaw = isObj(detail) ? detail.maxTokens : undefined;
  const resolvedMaxTokensType = typeof resolvedMaxTokensRaw;
  const resolvedMaxTokensIsNumber = resolvedMaxTokensType === "number";
  const maxTokens: number | undefined = resolvedMaxTokensIsNumber ? resolvedMaxTokensRaw as number : undefined;

  const result = fanned ? selected?.result : activity?.result;
  const errorMsg = fanned ? selected?.error : activity?.error;
  const errorValue = fanned ? selected?.errorValue : activity?.errorValue;
  const timelineEvents = fanned ? (selected?.events ?? []) : (activity?.events ?? []);
  const timelineAttempts = fanned ? (selected?.attempts ?? 0) : (activity?.attempts ?? 0);
  const fannedSelection = fanned && selected;
  const instanceLabel = fannedSelection
    ? ` (instance ${safeIdx + 1} of ${instanceList.length})`
    : "";

  const hasControl = Predicate.isNotUndefined(onStopNode);
  const selectedParts = EffectRecord.filterMap({ selected }, Option.fromNullable);
  const firstInstanceParts = EffectRecord.filterMap({ firstInstance: instanceList[0] }, Option.fromNullable);
  const { targetId: stopTargetId, canStop: canStopNode } = nodeStopTarget({
    nodeId: node.id,
    fanned,
    ...selectedParts,
    ...firstInstanceParts,
    aggregateStatus: status,
    hasControl,
  });
  // Returns the id it stopped so it isn't a bare void function; onClick ignores the value.
  const handleStopNode = (): string => {
    onStopNode!(stopTargetId);
    return stopTargetId;
  };

  const isBranch = node.kind === "Branch";
  const isVerify = node.kind === "Verify";
  const isDynamic = node.kind === "Dynamic";
  const hasMaxTokens = Predicate.isNotUndefined(maxTokens);
  const resolvedDiffersFromTemplate = resolved !== template;
  const resolvedEchoesTemplate = resolved === template;
  const showResolvedDistinct = resolved && resolvedDiffersFromTemplate;
  const showResolvedEcho = resolved && resolvedEchoesTemplate;
  const hasResponseSchema = Predicate.isNotUndefined(node.meta?.responseSchema);
  const hasResult = Predicate.isNotUndefined(result);
  const hasErrorValue = Predicate.isNotUndefined(errorValue);
  const hasSpawned = Predicate.isNotUndefined(activity?.spawned);
  const unreached = !activity;

  const renderTimelineRow = (e: RunEvent, i: number) => (
    <li key={i} style={{ fontSize: 12, color: "#475569" }}>
      <Timeline event={e} baseId={node.id} />
    </li>
  );

  return (
    <aside
      style={{
        width: 380,
        borderLeft: "1px solid #e2e8f0",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        fontFamily: "ui-sans-serif, system-ui",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 14px",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            color: "#64748b",
          }}
        >
          {node.kind}
        </span>
        <strong style={{ fontSize: 14, flex: 1 }}>{node.label}</strong>
        <span
          style={{
            fontSize: 11,
            color: "#fff",
            background: STATUS_COLOR[status],
            padding: "2px 8px",
            borderRadius: 999,
          }}
        >
          {status}
        </span>
        {}
        {canStopNode && (
          <button
            onClick={handleStopNode}
            disabled={controlBusy}
            title={`Stop this node (${stopTargetId})`}
            style={{
              border: "1px solid #fecaca",
              background: controlBusy ? "#fef2f2" : "#fff",
              color: "#b91c1c",
              cursor: controlBusy ? "default" : "pointer",
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 6,
            }}
          >
            ■ Stop{fanned ? " instance" : ""}
          </button>
        )}
        <button
          onClick={onClose}
          aria-label="Close detail"
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: 18,
            lineHeight: 1,
            color: "#94a3b8",
            padding: 2,
          }}
        >
          ×
        </button>
      </header>

      <div
        style={{
          overflowY: "auto",
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <Field label="Node id">
          <code style={mono}>{node.id}</code>
        </Field>

        {activity?.progress && (
          <Field label="Fan-out progress" hint="live — completed / started instances">
            <span style={{ fontSize: 13, color: "#475569" }}>
              <strong>
                {activity.progress.done}/{activity.progress.total}
              </strong>{" "}
              instances complete
            </span>
          </Field>
        )}

        {}
        {isBranch && (
          <Field
            label="Taken arm"
            hint={activity?.taken ? "live — the path the engine took" : undefined}
          >
            {activity?.taken ? (
              <span style={{ fontSize: 13, color: "#475569" }}>
                ran the <strong>{activity.taken}</strong> arm; the other is dimmed in the graph
              </span>
            ) : (
              <span style={{ fontSize: 13, color: "#94a3b8" }}>not yet decided</span>
            )}
          </Field>
        )}

        {}
        {isVerify && (
          <Field
            label="Refutation verdicts"
            hint={
              activity?.verdicts
                ? `live — kept ${activity.verdicts.filter(isKept).length}/${activity.verdicts.length}`
                : undefined
            }
          >
            {activity?.verdicts ? (
              <Verdicts verdicts={activity.verdicts} />
            ) : (
              <span style={{ fontSize: 13, color: "#94a3b8" }}>not yet verified</span>
            )}
          </Field>
        )}

        {}
        {isDynamic && (
          <Field
            label="Spawned"
            hint={
              hasSpawned
                ? "live — nodes produced at run time"
                : "opaque — shape unknown until it runs"
            }
          >
            {hasSpawned ? (
              <span style={{ fontSize: 13, color: "#475569" }}>
                spawned <strong>{activity?.spawned}</strong>{" "}
                {activity?.spawned === 1 ? "node" : "nodes"} underneath — see the timeline below for
                each
              </span>
            ) : (
              <span style={{ fontSize: 13, color: "#94a3b8" }}>
                {status === "idle" ? "not yet reached" : "ran without spawning observable nodes"}
              </span>
            )}
          </Field>
        )}

        {}
        {fanned && (
          <Field
            label="Fan-out instances"
            hint={`one template node, ${instanceList.length} runtime instances — pick one`}
          >
            <InstancePicker instances={instanceList} selected={safeIdx} onSelect={setSelectedIdx} />
          </Field>
        )}

        {model && (
          <Field label="Model">
            <code style={mono}>{model}</code>
          </Field>
        )}

        {hasMaxTokens && (
          <Field label="Max tokens">
            <code style={mono}>{maxTokens}</code>
          </Field>
        )}

        {}
        {template && (
          <Field label="Prompt template" hint="static — from the workflow description">
            <Pre>{template}</Pre>
          </Field>
        )}
        {showResolvedDistinct && (
          <Field
            label="Resolved prompt"
            hint={`live — what the engine actually sent${instanceLabel}`}
          >
            <Pre highlight>{resolved}</Pre>
          </Field>
        )}
        {showResolvedEcho && (
          <Field
            label="Resolved prompt"
            hint={`live — identical to the template (no upstream interpolation)${instanceLabel}`}
          >
            <Pre highlight>{resolved}</Pre>
          </Field>
        )}

        {hasResponseSchema && (
          <Field label="Response schema">
            <Pre>{pretty(node.meta?.responseSchema)}</Pre>
          </Field>
        )}

        {node.meta?.retry && (
          <Field label="Retry policy">
            <code style={mono}>{node.meta.retry}</code>
          </Field>
        )}

        {node.meta?.itemsUnresolved && (
          <Field
            label="⚠ Items unresolved"
            hint="this workflow was registered as a serialized description"
          >
            <Pre>
              {`This fan-out's items came from an upstream value transformed in a way that couldn't ` +
                `be reconstructed across the serialization boundary (e.g. a .map()/.filter() whose ` +
                `callback didn't cross the wire). The fan-out therefore runs over an empty set.\n\n` +
                `Resolvable cases — the binding itself, a property path, or .flat() — round-trip and ` +
                `fan out normally. To recover this one, register the workflow in-process, or reshape ` +
                `the items with a step whose result is data (not a closure).`}
            </Pre>
          </Field>
        )}

        {hasResult && (
          <Field
            label="Result"
            hint={fanned ? `instance ${safeIdx + 1} of ${instanceList.length}` : undefined}
          >
            <Pre>{pretty(result)}</Pre>
          </Field>
        )}

        {errorMsg && (
          <Field
            label="Error"
            hint={fanned ? `instance ${safeIdx + 1} of ${instanceList.length}` : undefined}
          >
            <Pre tone="error">{errorMsg}</Pre>
          </Field>
        )}

        {hasErrorValue && (
          <Field label="Error value" hint="typed error (errors-as-values)">
            <Pre tone="error">{pretty(errorValue)}</Pre>
          </Field>
        )}

        {timelineEvents.length > 0 && (
          <Field
            label="Activity"
            hint={
              timelineAttempts > 0
                ? `${timelineAttempts} retr${timelineAttempts === 1 ? "y" : "ies"}/re-prompt(s)`
                : undefined
            }
          >
            <ol
              style={{
                margin: 0,
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {timelineEvents.map(renderTimelineRow)}
            </ol>
          </Field>
        )}

        {unreached && (
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Not yet reached in this run.</p>
        )}
      </div>
    </aside>
  );
};

const renderVerdictRow = (v: VerifyVerdict, i: number) => (
  <li
    key={i}
    style={{
      border: `1px solid ${v.kept ? "#bbf7d0" : "#fecaca"}`,
      background: v.kept ? "#f0fdf4" : "#fef2f2",
      borderRadius: 6,
      padding: "6px 8px",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: "#fff",
          background: v.kept ? "#22c55e" : "#ef4444",
          padding: "1px 6px",
          borderRadius: 999,
        }}
      >
        {v.kept ? "kept" : "refuted"}
      </span>
      <span style={{ fontSize: 11, color: "#64748b" }}>
        {v.confirmed} confirmed · {v.refuted} refuted
      </span>
    </div>
    <code style={{ ...mono, fontSize: 11, display: "block", whiteSpace: "pre-wrap" }}>
      {pretty(v.item)}
    </code>
  </li>
);

type VerdictsProps = { readonly verdicts: ReadonlyArray<VerifyVerdict> };

const Verdicts = ({ verdicts }: VerdictsProps) => (
  <ul
    style={{
      margin: 0,
      padding: 0,
      listStyle: "none",
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}
  >
    {verdicts.map(renderVerdictRow)}
  </ul>
);

const STATUS_GLYPH: Record<NodeStatus, string> = {
  idle: "·",
  running: "…",
  retrying: "↻",
  succeeded: "✓",
  failed: "✗",
  stopped: "■", // a deliberately halted node (DESIGN.md §9)
};

type InstancePickerProps = {
  readonly instances: ReadonlyArray<NodeInstance>;
  readonly selected: number;
  readonly onSelect: (i: number) => void;
};

const InstancePicker = ({ instances, selected, onSelect }: InstancePickerProps) => {
  const renderChip = (inst: NodeInstance, i: number) => {
    const isSel = i === selected;
    const color = STATUS_COLOR[inst.status];
    // Returns the index it selected so it isn't a bare void function; onClick ignores the value.
    const handleSelect = (): number => {
      onSelect(i);
      return i;
    };
    return (
      <button
        key={inst.runtimeId}
        onClick={handleSelect}
        title={`${inst.runtimeId} — ${inst.status}`}
        aria-pressed={isSel}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          minWidth: 30,
          justifyContent: "center",
          padding: "3px 7px",
          borderRadius: 6,
          border: `1px solid ${isSel ? color : "#e2e8f0"}`,
          // selected chip fills with its status color; others stay light with a colored glyph
          background: isSel ? color : "#fff",
          color: isSel ? "#fff" : "#475569",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 600,
          boxShadow: isSel ? `0 0 0 2px ${color}33` : undefined,
        }}
      >
        <span style={{ color: isSel ? "#fff" : color }}>{STATUS_GLYPH[inst.status]}</span>
        {i + 1}
      </button>
    );
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{instances.map(renderChip)}</div>
  );
};

const NodeRetryingSchema = Schema.TaggedStruct("NodeRetrying", {});
const NodeRepromptingSchema = Schema.TaggedStruct("NodeReprompting", {});
const NodeVerifiedSchema = Schema.TaggedStruct("NodeVerified", {});
const NodeCompensatedSchema = Schema.TaggedStruct("NodeCompensated", {});
const NodeStoppedSchema = Schema.TaggedStruct("NodeStopped", {});
const isNodeRetrying = Schema.is(NodeRetryingSchema);
const isNodeReprompting = Schema.is(NodeRepromptingSchema);
const isNodeVerified = Schema.is(NodeVerifiedSchema);
const isNodeCompensated = Schema.is(NodeCompensatedSchema);
const isNodeStopped = Schema.is(NodeStoppedSchema);

type TimelineProps = {
  readonly event: RunEvent;
} & Partial<{
  readonly baseId: string;
}>;

const Timeline = ({ event, baseId }: TimelineProps) => {
  const tag = event._tag.replace(/^Node/, "");

  // inline timelineExtra — pre-compute each branch to avoid nested ternaries
  const retrying = isNodeRetrying(event);
  const reprompting = isNodeReprompting(event);
  const verified = isNodeVerified(event);
  const compensated = isNodeCompensated(event);
  const stopped = isNodeStopped(event);

  const reasonSuffix = event.reason ? ` — ${event.reason}` : "";
  const attemptedExtra = ` #${event.attempt}${reasonSuffix}`;

  const eventVerdicts = event.verdicts;
  const keptVerdicts = eventVerdicts ? eventVerdicts.filter(isKept) : [];
  const keptCount = keptVerdicts.length;
  const totalCount = eventVerdicts ? eventVerdicts.length : 0;
  const verifiedExtra = ` — kept ${keptCount}/${totalCount}`;

  const compensatedExtra = event.error ? ` — rollback failed: ${event.error}` : " — rolled back";
  const stoppedExtra = " — stopped by request";

  // Pick the appropriate extra label using one conditional per line
  const fromRetrying = retrying ? attemptedExtra : undefined;
  const fromReprompting = reprompting ? attemptedExtra : undefined;
  const fromVerified = verified ? verifiedExtra : undefined;
  const fromCompensated = compensated ? compensatedExtra : undefined;
  const fromStopped = stopped ? stoppedExtra : undefined;
  const extras = [fromRetrying, fromReprompting, fromVerified, fromCompensated, fromStopped];
  const foundExtra = extras.find(Predicate.isNotUndefined);
  const extra = foundExtra ?? "";

  const fromSpawnedChild = baseId ? event.nodeId?.startsWith(baseId + "/") : false;
  const spawnedFrom = fromSpawnedChild ? event.nodeId!.slice(baseId!.length + 1) : undefined;
  return (
    <span>
      {spawnedFrom && (
        <code style={{ ...mono, fontSize: 11, color: "#64748b", marginRight: 6 }}>
          {spawnedFrom}
        </code>
      )}
      <span style={{ fontWeight: 600 }}>{tag}</span>
      {extra}
    </span>
  );
};

const mono: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 12,
  color: "#0f172a",
  wordBreak: "break-all",
};

type FieldProps = {
  readonly label: string;
  readonly children: React.ReactNode;
} & Partial<{
  readonly hint: string;
}>;

const Field = ({ label, hint, children }: FieldProps) => (
  <div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: "#94a3b8",
        }}
      >
        {label}
      </span>
      {hint && <span style={{ fontSize: 11, color: "#cbd5e1" }}>{hint}</span>}
    </div>
    {children}
  </div>
);

type PreProps = {
  readonly children: React.ReactNode;
} & Partial<{
  readonly highlight: boolean;
  readonly tone: "error";
}>;

const Pre = ({ children, highlight, tone }: PreProps) => {
  const isError = tone === "error";
  const plainBackground = highlight ? "#eff6ff" : "#f8fafc";
  const background = isError ? "#fef2f2" : plainBackground;
  const plainBorder = highlight ? "#bfdbfe" : "#e2e8f0";
  const borderColor = isError ? "#fecaca" : plainBorder;
  const color = isError ? "#b91c1c" : "#0f172a";
  return (
    <pre
      style={{
        margin: 0,
        padding: "8px 10px",
        borderRadius: 6,
        background,
        border: `1px solid ${borderColor}`,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 12,
        color,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        maxHeight: 240,
        overflowY: "auto",
      }}
    >
      {children}
    </pre>
  );
};
