import type { AnswerSource } from "./graph-model.ts";
import type { ParsedAnswer, ParsedAskTurn, ParsedQuestion } from "./parse-asks.ts";
import { parseAsksSection } from "./parse-asks.ts";

export type ArchiveAnswerInput = {
  /** Full id token, e.g. `answer:abc`. Generated when missing. */
  id?: string;
  label: string;
  source: AnswerSource;
  selected: boolean;
  selectionOrder?: number;
};

export type ArchiveQuestionInput = {
  id?: string;
  prompt: string;
  multi: boolean;
  answers: ArchiveAnswerInput[];
};

export type ArchiveAskTurnInput = {
  id?: string;
  questions: ArchiveQuestionInput[];
};

export type CommittedQuestionArchive = {
  /** Existing turn id to append into, or omit to create a new AskTurn. */
  askTurnId?: string;
  question: ArchiveQuestionInput;
};

const ASKS_HEADING = "## Asks";
const COMMENTS_HEADING_RE = /^##[ \t]+Comments[ \t]*$/im;
const ASKS_HEADING_RE = /^##[ \t]+Asks[ \t]*$/im;
const NEXT_H2_RE = /^##[ \t]+/gm;

function newId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}:${rand}`;
}

function ensureAnswerId(a: ArchiveAnswerInput): ParsedAnswer {
  const id = a.id && a.id.length > 0 ? a.id : newId("answer");
  const out: ParsedAnswer = {
    id,
    label: a.label,
    source: a.source,
    selected: a.selected,
  };
  if (a.selectionOrder !== undefined) out.selectionOrder = a.selectionOrder;
  return out;
}

function ensureQuestion(q: ArchiveQuestionInput): ParsedQuestion {
  return {
    id: q.id && q.id.length > 0 ? q.id : newId("question"),
    prompt: q.prompt,
    multi: q.multi,
    answers: q.answers.map(ensureAnswerId),
  };
}

function ensureTurn(t: ArchiveAskTurnInput): ParsedAskTurn {
  return {
    id: t.id && t.id.length > 0 ? t.id : newId("askturn"),
    questions: t.questions.map(ensureQuestion),
  };
}

function renderAnswer(a: ParsedAnswer): string {
  const mark = a.selected ? "x" : " ";
  const attrs = [`source=${a.source}`];
  if (a.selected) attrs.push("selected");
  return `- [${mark}] ${a.label} <!-- mapmaker:id=${a.id} ${attrs.join(" ")} -->`;
}

function renderQuestion(q: ParsedQuestion): string {
  const lines = [
    `#### Question <!-- mapmaker:id=${q.id} -->`,
    "",
    q.prompt,
    "",
    ...q.answers.map(renderAnswer),
    "",
  ];
  return lines.join("\n");
}

function renderTurn(t: ParsedAskTurn): string {
  const lines = [
    `### AskTurn <!-- mapmaker:id=${t.id} -->`,
    "",
    ...t.questions.map(renderQuestion),
  ];
  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}

/** Render full `## Asks` section body (including heading). */
export function renderAsksSection(turns: readonly ParsedAskTurn[]): string {
  if (turns.length === 0) return `${ASKS_HEADING}\n`;
  const body = turns.map(renderTurn).join("\n").trimEnd();
  return `${ASKS_HEADING}\n\n${body}\n`;
}

/**
 * Locate `## Asks` span in raw markdown: [headingStart, sectionEnd).
 * sectionEnd is start of next H2 or EOF.
 */
export function findAsksSectionSpan(
  raw: string,
): { headingStart: number; bodyStart: number; sectionEnd: number } | null {
  ASKS_HEADING_RE.lastIndex = 0;
  const start = ASKS_HEADING_RE.exec(raw);
  if (!start || start.index === undefined) return null;
  const headingStart = start.index;
  const bodyStart = headingStart + start[0].length;
  NEXT_H2_RE.lastIndex = bodyStart;
  const next = NEXT_H2_RE.exec(raw);
  const sectionEnd = next?.index ?? raw.length;
  return { headingStart, bodyStart, sectionEnd };
}

/**
 * Section-merge the entire `## Asks` region.
 * Creates the section before `## Comments` if present, else appends.
 * Preserves all foreign text outside the section.
 */
export function mergeAsksSection(
  raw: string,
  turns: readonly ParsedAskTurn[],
): string {
  const section = renderAsksSection(turns);
  const span = findAsksSectionSpan(raw);
  if (span) {
    const before = raw.slice(0, span.headingStart);
    let after = raw.slice(span.sectionEnd);
    // Avoid double blank lines at the join.
    const beforeClean = before.replace(/\s*$/, "\n\n");
    const afterClean = after.replace(/^\s*/, after.length > 0 ? "\n" : "");
    return `${beforeClean}${section.trimEnd()}\n${afterClean}`.replace(
      /\n{3,}/g,
      "\n\n",
    );
  }

  COMMENTS_HEADING_RE.lastIndex = 0;
  const comments = COMMENTS_HEADING_RE.exec(raw);
  if (comments && comments.index !== undefined) {
    const before = raw.slice(0, comments.index).replace(/\s*$/, "\n\n");
    const after = raw.slice(comments.index);
    return `${before}${section.trimEnd()}\n\n${after}`.replace(/\n{3,}/g, "\n\n");
  }

  const base = raw.replace(/\s*$/, "\n\n");
  return `${base}${section.trimEnd()}\n`;
}

/**
 * Append one committed Question into the ticket archive.
 * - Reuses `askTurnId` when provided and already present.
 * - Otherwise appends a new AskTurn (or extends the last turn when `appendToLastTurn`).
 * Returns the merged markdown and the stable ids assigned.
 */
export function appendCommittedQuestion(
  raw: string,
  commit: CommittedQuestionArchive,
  opts?: { appendToLastTurn?: boolean },
): {
  raw: string;
  askTurnId: string;
  question: ParsedQuestion;
  turns: ParsedAskTurn[];
} {
  const existing = parseAsksSection(raw).map((t) => ({
    id: t.id,
    questions: t.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      multi: q.multi,
      answers: q.answers.map((a) => ({ ...a })),
    })),
  }));

  const question = ensureQuestion(commit.question);
  let askTurnId = commit.askTurnId;
  let turns = existing;

  if (askTurnId) {
    const idx = turns.findIndex((t) => t.id === askTurnId);
    if (idx >= 0) {
      const turn = turns[idx]!;
      // Idempotent: replace same question id if re-persisting.
      const qIdx = turn.questions.findIndex((q) => q.id === question.id);
      const questions =
        qIdx >= 0
          ? turn.questions.map((q, i) => (i === qIdx ? question : q))
          : [...turn.questions, question];
      turns = turns.map((t, i) => (i === idx ? { ...t, questions } : t));
    } else {
      turns = [...turns, { id: askTurnId, questions: [question] }];
    }
  } else if (opts?.appendToLastTurn && turns.length > 0) {
    const last = turns[turns.length - 1]!;
    askTurnId = last.id;
    turns = [
      ...turns.slice(0, -1),
      { id: last.id, questions: [...last.questions, question] },
    ];
  } else {
    askTurnId = newId("askturn");
    turns = [...turns, { id: askTurnId, questions: [question] }];
  }

  return {
    raw: mergeAsksSection(raw, turns),
    askTurnId,
    question,
    turns,
  };
}

/**
 * Replace the full archive with the given turns (ids preserved / filled).
 */
export function replaceAsksArchive(
  raw: string,
  turnsIn: readonly ArchiveAskTurnInput[],
): { raw: string; turns: ParsedAskTurn[] } {
  const turns = turnsIn.map(ensureTurn);
  return { raw: mergeAsksSection(raw, turns), turns };
}

export { newId as newArchiveId };
