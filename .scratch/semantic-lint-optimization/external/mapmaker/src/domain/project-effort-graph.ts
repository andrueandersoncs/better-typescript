import {
  edgeId,
  fogNodeId,
  mapNodeId,
  oosNodeId,
  resolutionNodeId,
  ticketNodeId,
  ticketQuestionNodeId,
  type EffortGraph,
  type GeneratedAnswerGraphNode,
  type GraphEdge,
  type GraphNode,
  type QuestionGraphNode,
  type AskTurnGraphNode,
} from "./graph-model.ts";
import { parseMapMarkdown, type ParsedMap } from "./parse-map.ts";
import type { ParsedAnswer, ParsedAskTurn, ParsedQuestion } from "./parse-asks.ts";
import {
  parseTicketBody,
  type ImpliesFromAnchor,
  type ParsedTicketBody,
} from "./parse-ticket-body.ts";
import {
  indexTicketsById,
  isFrontierTicket,
  type TicketRecord,
} from "./tickets.ts";

/** In-flight Ask gap filled from a live Session (pre-persist). */
export type SessionAskOverlay = {
  /** Ticket stem, or `map` for chart thread. */
  ownerId: string;
  askTurnId: string;
  questions: Array<{
    id: string;
    prompt: string;
    multi: boolean;
    /** Index of the active unanswered question (sequential Ask). */
    active?: boolean;
    answers: Array<{
      id: string;
      label: string;
      source: "agent" | "custom";
      selected?: boolean;
      selectionOrder?: number;
      pending?: boolean;
    }>;
  }>;
};

export type ProjectEffortGraphInput = {
  mapMarkdown: string;
  /** Effort-relative path → raw ticket markdown. */
  tickets: ReadonlyMap<string, string> | Iterable<readonly [string, string]>;
  /** Optional live Session overlays for in-flight Asks. */
  sessionOverlays?: readonly SessionAskOverlay[];
};

type EmitCtx = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeIds: Set<string>;
};

function addNode(ctx: EmitCtx, node: GraphNode): void {
  if (ctx.nodeIds.has(node.id)) return;
  ctx.nodeIds.add(node.id);
  ctx.nodes.push(node);
}

function addEdge(
  ctx: EmitCtx,
  kind: GraphEdge["kind"],
  source: string,
  target: string,
): void {
  if (!ctx.nodeIds.has(source) || !ctx.nodeIds.has(target)) return;
  const id = edgeId(kind, source, target);
  // Dedup identical edges.
  if (ctx.edges.some((e) => e.id === id)) return;
  ctx.edges.push({ id, kind, source, target });
}

function toTicketRecords(tickets: ParsedTicketBody[]): TicketRecord[] {
  return tickets.map((t) => ({
    relPath: t.relPath,
    id: t.id,
    title: t.title,
    type: t.type,
    status: t.status,
    blockedBy: t.blockedBy,
    raw: t.raw,
  }));
}

function emitAnswers(
  ctx: EmitCtx,
  questionId: string,
  answers: readonly ParsedAnswer[],
  ephemeral: boolean,
): void {
  for (const a of answers) {
    const node: GeneratedAnswerGraphNode = {
      id: a.id,
      kind: "GeneratedAnswer",
      questionId,
      label: a.label,
      source: a.source,
      selected: a.selected,
      ...(a.selectionOrder !== undefined
        ? { selectionOrder: a.selectionOrder }
        : {}),
      ...(ephemeral ? { ephemeral: true } : {}),
    };
    addNode(ctx, node);
    addEdge(ctx, "hasAnswer", questionId, a.id);
  }
}

function emitQuestions(
  ctx: EmitCtx,
  askTurnId: string,
  questions: readonly ParsedQuestion[],
  ephemeral: boolean,
): void {
  for (const q of questions) {
    const node: QuestionGraphNode = {
      id: q.id,
      kind: "Question",
      askTurnId,
      prompt: q.prompt,
      multi: q.multi,
      ...(ephemeral ? { ephemeral: true } : {}),
    };
    addNode(ctx, node);
    addEdge(ctx, "hasQuestion", askTurnId, q.id);
    emitAnswers(ctx, q.id, q.answers, ephemeral);
  }
}

/**
 * Emit AskTurn tree and derive `continues` edges.
 * `continues`: every Selected GeneratedAnswer under Question i → Question i+1
 * within the same AskTurn (fan-from-each). Across AskTurns under the same owner,
 * last Question's selected answers continue into the next AskTurn's first Question.
 */
function emitAskArchive(
  ctx: EmitCtx,
  ownerId: string,
  ownerKind: "Map" | "Ticket",
  turns: readonly ParsedAskTurn[],
  ephemeral: boolean,
): void {
  // Flatten questions in archive order for continues derivation across turns.
  type FlatQ = { questionId: string; selectedAnswerIds: string[] };
  const flat: FlatQ[] = [];

  for (const turn of turns) {
    const turnNode: AskTurnGraphNode = {
      id: turn.id,
      kind: "AskTurn",
      ownerId,
      ...(ephemeral ? { ephemeral: true } : {}),
    };
    addNode(ctx, turnNode);
    if (ownerKind === "Map") {
      addEdge(ctx, "hasAsk", mapNodeId(), turn.id);
    } else {
      addEdge(ctx, "hasAsk", ticketNodeId(ownerId), turn.id);
    }
    emitQuestions(ctx, turn.id, turn.questions, ephemeral);

    for (const q of turn.questions) {
      flat.push({
        questionId: q.id,
        selectedAnswerIds: q.answers
          .filter((a) => a.selected)
          .map((a) => a.id),
      });
    }
  }

  for (let i = 0; i < flat.length - 1; i++) {
    const cur = flat[i];
    const next = flat[i + 1];
    if (!cur || !next) continue;
    for (const answerId of cur.selectedAnswerIds) {
      addEdge(ctx, "continues", answerId, next.questionId);
    }
  }
}

function emitMap(ctx: EmitCtx, map: ParsedMap): void {
  addNode(ctx, {
    id: mapNodeId(),
    kind: "Map",
    relPath: "map.md",
    destination: map.destination,
  });

  for (const fog of map.fogEntries) {
    const id = fogNodeId(fog.idSlug);
    addNode(ctx, {
      id,
      kind: "FogEntry",
      text: fog.text,
    });
    addEdge(ctx, "contains", mapNodeId(), id);
  }

  for (const oos of map.outOfScopeEntries) {
    const id = oosNodeId(oos.idSlug);
    addNode(ctx, {
      id,
      kind: "OutOfScopeEntry",
      text: oos.text,
    });
    addEdge(ctx, "contains", mapNodeId(), id);
  }

  if (map.asks.length > 0) {
    emitAskArchive(ctx, "map", "Map", map.asks, false);
  }
}

function emitTicket(
  ctx: EmitCtx,
  ticket: ParsedTicketBody,
  byId: ReadonlyMap<string, TicketRecord>,
): void {
  const stem = ticket.stem;
  const tNodeId = ticketNodeId(stem);
  const record: TicketRecord = {
    relPath: ticket.relPath,
    id: ticket.id,
    title: ticket.title,
    type: ticket.type,
    status: ticket.status,
    blockedBy: ticket.blockedBy,
    raw: ticket.raw,
  };

  addNode(ctx, {
    id: tNodeId,
    kind: "Ticket",
    stem,
    ticketId: ticket.id,
    relPath: ticket.relPath,
    title: ticket.title,
    type: ticket.type,
    status: ticket.status,
    frontier: isFrontierTicket(record, byId),
  });
  addEdge(ctx, "contains", mapNodeId(), tNodeId);

  const tqId = ticketQuestionNodeId(stem);
  addNode(ctx, {
    id: tqId,
    kind: "TicketQuestion",
    ticketStem: stem,
    body: ticket.questionBody,
  });
  addEdge(ctx, "hasTicketQuestion", tNodeId, tqId);

  if (ticket.asks.length > 0) {
    emitAskArchive(ctx, stem, "Ticket", ticket.asks, false);
  }

  // Resolution only when resolved (and preferably has Answer body).
  if (ticket.status === "resolved") {
    const rId = resolutionNodeId(stem);
    addNode(ctx, {
      id: rId,
      kind: "Resolution",
      ticketStem: stem,
      body: ticket.answerBody ?? "",
    });
    addEdge(ctx, "hasResolution", tNodeId, rId);
  }
}

function emitBlocks(ctx: EmitCtx, tickets: readonly ParsedTicketBody[]): void {
  const stemByNumericId = new Map<string, string>();
  for (const t of tickets) stemByNumericId.set(t.id, t.stem);

  for (const t of tickets) {
    const target = ticketNodeId(t.stem);
    for (const blockerId of t.blockedBy) {
      const blockerStem = stemByNumericId.get(blockerId);
      if (!blockerStem) continue;
      addEdge(ctx, "blocks", ticketNodeId(blockerStem), target);
    }
  }
}

function resolveImpliesSourceId(
  anchor: ImpliesFromAnchor,
  answerIds: ReadonlySet<string>,
): string | null {
  if (anchor.kind === "answer") {
    // Prefer exact id match; also try bare token if callers omitted prefix.
    if (answerIds.has(anchor.answerId)) return anchor.answerId;
    const bare = anchor.answerId.replace(/^answer:/, "");
    const prefixed = bare.startsWith("answer:") ? bare : `answer:${bare}`;
    if (answerIds.has(prefixed)) return prefixed;
    if (answerIds.has(bare)) return bare;
    // Still emit if source node exists under either form once nodes are known —
    // caller checks nodeIds.
    return anchor.answerId;
  }
  return resolutionNodeId(anchor.sourceTicketStem);
}

function emitImpliesTicket(
  ctx: EmitCtx,
  tickets: readonly ParsedTicketBody[],
): void {
  const answerIds = new Set(
    ctx.nodes.filter((n) => n.kind === "GeneratedAnswer").map((n) => n.id),
  );

  for (const t of tickets) {
    const target = ticketNodeId(t.stem);
    for (const anchor of t.impliesFrom) {
      const source = resolveImpliesSourceId(anchor, answerIds);
      if (!source) continue;
      addEdge(ctx, "impliesTicket", source, target);
    }
  }
}

function overlayToParsedTurns(overlay: SessionAskOverlay): ParsedAskTurn[] {
  return [
    {
      id: overlay.askTurnId,
      questions: overlay.questions.map((q) => {
        let order = 0;
        const answers: ParsedAnswer[] = q.answers.map((a) => {
          const selected = Boolean(a.selected);
          const parsed: ParsedAnswer = {
            id: a.id,
            label: a.label,
            source: a.source,
            selected,
          };
          if (selected) {
            order += 1;
            parsed.selectionOrder = a.selectionOrder ?? order;
          }
          return parsed;
        });
        return {
          id: q.id,
          prompt: q.prompt,
          multi: q.multi || answers.filter((x) => x.selected).length > 1,
          answers,
        };
      }),
    },
  ];
}

function emitSessionOverlays(
  ctx: EmitCtx,
  overlays: readonly SessionAskOverlay[],
  ticketStems: ReadonlySet<string>,
): void {
  for (const overlay of overlays) {
    const ownerId = overlay.ownerId;
    if (ownerId === "map") {
      emitAskArchive(ctx, "map", "Map", overlayToParsedTurns(overlay), true);
      continue;
    }
    if (!ticketStems.has(ownerId)) continue;
    // Skip if disk already has this askTurn id (file wins after persist).
    if (ctx.nodeIds.has(overlay.askTurnId)) continue;
    emitAskArchive(ctx, ownerId, "Ticket", overlayToParsedTurns(overlay), true);

    // Preserve the Session's explicit active marker for chrome. It is not
    // persisted to markdown, so archive Questions remain inactive.
    for (const q of overlay.questions) {
      const node = ctx.nodes.find((n) => n.id === q.id);
      if (node?.kind === "Question" && q.active) {
        node.active = true;
      }
      for (const a of q.answers) {
        if (!a.pending) continue;
        const answerNode = ctx.nodes.find((n) => n.id === a.id);
        if (answerNode?.kind === "GeneratedAnswer") {
          answerNode.pending = true;
        }
      }
    }
  }
}

function ticketsFromInput(
  input: ProjectEffortGraphInput["tickets"],
): Array<readonly [string, string]> {
  if (input instanceof Map) return [...input.entries()];
  return [...input];
}

/**
 * Project effort markdown (+ optional live Session overlay) into the locked
 * graph model. Pure: no I/O.
 */
export function projectEffortGraph(
  input: ProjectEffortGraphInput,
): EffortGraph {
  const map = parseMapMarkdown(input.mapMarkdown);
  const parsedTickets: ParsedTicketBody[] = [];
  for (const [relPath, raw] of ticketsFromInput(input.tickets)) {
    const parsed = parseTicketBody(relPath.replaceAll("\\", "/"), raw);
    if (parsed) parsedTickets.push(parsed);
  }
  parsedTickets.sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true }),
  );

  const byId = indexTicketsById(toTicketRecords(parsedTickets));
  const ctx: EmitCtx = { nodes: [], edges: [], nodeIds: new Set() };

  emitMap(ctx, map);
  for (const t of parsedTickets) emitTicket(ctx, t, byId);
  emitBlocks(ctx, parsedTickets);
  emitImpliesTicket(ctx, parsedTickets);

  if (input.sessionOverlays?.length) {
    emitSessionOverlays(
      ctx,
      input.sessionOverlays,
      new Set(parsedTickets.map((t) => t.stem)),
    );
  }

  return { nodes: ctx.nodes, edges: ctx.edges };
}

/** Convenience: index nodes by id. */
export function indexGraphNodes(
  graph: EffortGraph,
): Map<string, GraphNode> {
  const m = new Map<string, GraphNode>();
  for (const n of graph.nodes) m.set(n.id, n);
  return m;
}

/** Edges of a given kind. */
export function edgesOfKind(
  graph: EffortGraph,
  kind: GraphEdge["kind"],
): GraphEdge[] {
  return graph.edges.filter((e) => e.kind === kind);
}
