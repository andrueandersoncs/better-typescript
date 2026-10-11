/**
 * Pure helpers for the click-to-select contract (ticket 04 / 21).
 * No I/O — command handlers + LiveAskController compose these.
 */

/** omp Ask tool Other label (must match SDK ask.ts). */
export const OTHER_OPTION_LABEL = "Other (type your own)";

/** Suffix omp adds for recommended options. */
export const RECOMMENDED_SUFFIX = " (Recommended)";

export function stripRecommendedSuffix(label: string): string {
  return label.endsWith(RECOMMENDED_SUFFIX)
    ? label.slice(0, -RECOMMENDED_SUFFIX.length)
    : label;
}

export function isOtherOptionLabel(label: string): boolean {
  return stripRecommendedSuffix(label) === OTHER_OPTION_LABEL;
}

/** Match Done selecting even when theme prefixes ANSI/color tokens. */
export function isDoneSelectingLabel(label: string): boolean {
  const plain = stripRecommendedSuffix(label).replace(/\x1b\[[0-9;]*m/g, "");
  return /Done selecting\s*$/.test(plain.trim());
}

export type ClickRefuseReason =
  | "no_session"
  | "no_pending_ask"
  | "not_select"
  | "already_pending"
  | "unknown_answer"
  | "stale"
  | "multi_needs_submit"
  | "other_needs_text"
  | "composer_blocked_by_ask"
  | "dead_session";

export type ClickOk =
  | { ok: true; action: "commit_single"; label: string }
  | { ok: true; action: "toggle_multi"; answerId: string }
  | {
      ok: true;
      action: "commit_multi";
      labels: string[];
      includeOther?: { text: string };
    }
  | { ok: true; action: "commit_other"; text: string }
  | { ok: true; action: "cancel" }
  | { ok: true; action: "composer"; text: string }
  | { ok: true; action: "noop" };

export type ClickResult = ClickOk | { ok: false; reason: ClickRefuseReason; message: string };

export type LiveOption = {
  id: string;
  label: string;
  /** True when this option is the Other chrome row. */
  isOther?: boolean;
  /** True when this option is Done selecting. */
  isDone?: boolean;
};

export type LiveSelectView = {
  kind: "select";
  requestId: string;
  title: string;
  multi: boolean;
  /** Commit already in flight for this question. */
  pending: boolean;
  options: LiveOption[];
};

export type LiveEditorView = {
  kind: "editor" | "input";
  requestId: string;
  title: string;
  pending: boolean;
};

export type LivePendingView =
  | LiveSelectView
  | LiveEditorView
  | { kind: "confirm"; requestId: string; title: string; pending: boolean };

export function findOptionById(
  view: LiveSelectView,
  answerId: string,
): LiveOption | undefined {
  return view.options.find((o) => o.id === answerId);
}

export function findOptionByLabel(
  view: LiveSelectView,
  label: string,
): LiveOption | undefined {
  const want = stripRecommendedSuffix(label);
  return view.options.find(
    (o) => stripRecommendedSuffix(o.label) === want || o.label === label,
  );
}

/**
 * Single-select click: immediate commit of one agent option label.
 * Other chrome is handled by commitOther / other command, not this path
 * when isOther — callers may still pass Other id to open editor path.
 */
export function planClickAnswer(
  view: LivePendingView | null,
  answerId: string,
): ClickResult {
  if (!view) {
    return {
      ok: false,
      reason: "no_pending_ask",
      message: "No active Ask wait for this session",
    };
  }
  if (view.kind !== "select") {
    return {
      ok: false,
      reason: "not_select",
      message: `Active UI is ${view.kind}, not select`,
    };
  }
  if (view.pending) {
    return { ok: true, action: "noop" };
  }
  const opt = findOptionById(view, answerId);
  if (!opt) {
    return {
      ok: false,
      reason: "unknown_answer",
      message: `Unknown answer id: ${answerId}`,
    };
  }
  if (opt.isDone) {
    return {
      ok: false,
      reason: "stale",
      message: "Done selecting is host-drained on multi Submit",
    };
  }
  if (opt.isOther) {
    return {
      ok: false,
      reason: "other_needs_text",
      message: "Other requires custom text via other command",
    };
  }
  if (view.multi) {
    return { ok: true, action: "toggle_multi", answerId: opt.id };
  }
  return {
    ok: true,
    action: "commit_single",
    label: stripRecommendedSuffix(opt.label),
  };
}

export function planMultiSubmit(
  view: LivePendingView | null,
  answerIds: readonly string[],
  otherText?: string,
): ClickResult {
  if (!view) {
    return {
      ok: false,
      reason: "no_pending_ask",
      message: "No active Ask wait for this session",
    };
  }
  if (view.kind !== "select") {
    return {
      ok: false,
      reason: "not_select",
      message: `Active UI is ${view.kind}, not select`,
    };
  }
  if (view.pending) {
    return { ok: true, action: "noop" };
  }
  if (!view.multi) {
    return {
      ok: false,
      reason: "stale",
      message: "multiSubmit requires multi select",
    };
  }
  if (answerIds.length === 0) {
    return {
      ok: false,
      reason: "unknown_answer",
      message: "multiSubmit needs ≥1 answer id",
    };
  }

  const labels: string[] = [];
  let otherSelected = false;
  for (const id of answerIds) {
    const opt = findOptionById(view, id);
    if (!opt) {
      return {
        ok: false,
        reason: "unknown_answer",
        message: `Unknown answer id: ${id}`,
      };
    }
    if (opt.isOther) {
      otherSelected = true;
      continue;
    }
    if (opt.isDone) continue;
    labels.push(stripRecommendedSuffix(opt.label));
  }

  if (otherSelected) {
    const text = otherText?.trim() ?? "";
    if (!text) {
      return {
        ok: false,
        reason: "other_needs_text",
        message: "Other is selected but text is empty",
      };
    }
    return {
      ok: true,
      action: "commit_multi",
      labels,
      includeOther: { text },
    };
  }

  if (labels.length === 0) {
    return {
      ok: false,
      reason: "unknown_answer",
      message: "No selectable labels in multiSubmit set",
    };
  }
  return { ok: true, action: "commit_multi", labels };
}

export function planOther(
  view: LivePendingView | null,
  text: string,
): ClickResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      ok: false,
      reason: "other_needs_text",
      message: "Other text is empty",
    };
  }
  if (!view) {
    return {
      ok: false,
      reason: "no_pending_ask",
      message: "No active Ask wait for this session",
    };
  }
  if (view.pending) {
    return { ok: true, action: "noop" };
  }
  if (view.kind === "editor" || view.kind === "input") {
    return { ok: true, action: "commit_other", text: trimmed };
  }
  if (view.kind !== "select") {
    return {
      ok: false,
      reason: "not_select",
      message: `Active UI is ${view.kind}`,
    };
  }
  return { ok: true, action: "commit_other", text: trimmed };
}

export function planCancel(view: LivePendingView | null): ClickResult {
  if (!view) {
    return {
      ok: false,
      reason: "no_pending_ask",
      message: "No active Ask to cancel",
    };
  }
  return { ok: true, action: "cancel" };
}

export function planComposer(
  view: LivePendingView | null,
  text: string,
): ClickResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      ok: false,
      reason: "other_needs_text",
      message: "Composer text is empty",
    };
  }
  if (view) {
    return {
      ok: false,
      reason: "composer_blocked_by_ask",
      message: "Composer blocked while Ask is open — use Other or Cancel",
    };
  }
  return { ok: true, action: "composer", text: trimmed };
}

/** Build stable live option ids from bind key + index. */
export function liveAnswerId(bindKey: string, index: number): string {
  const stem = bindKey.replace(/^issues\//, "").replace(/\.md$/i, "");
  return `answer:live:${stem}:${index}`;
}

export function liveQuestionId(bindKey: string, seq: number): string {
  const stem = bindKey.replace(/^issues\//, "").replace(/\.md$/i, "");
  return `question:live:${stem}:${seq}`;
}

export function liveAskTurnId(bindKey: string, seq: number): string {
  const stem = bindKey.replace(/^issues\//, "").replace(/\.md$/i, "");
  return `askturn:live:${stem}:${seq}`;
}
