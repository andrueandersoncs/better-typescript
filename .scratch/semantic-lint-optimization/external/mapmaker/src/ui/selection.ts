import type { EffortGraphDto, GraphNodeDto } from "@shared/wire-schema.ts";

/** Client-local selection (focus is never a wire command). */
export type Selection =
  | { kind: "map" }
  | { kind: "ticket"; ticketStem: string; highlightNodeId?: string }
  | { kind: "fog"; nodeId: string }
  | { kind: "oos"; nodeId: string }
  | { kind: "node"; nodeId: string };

export function defaultSelection(): Selection {
  return { kind: "map" };
}

export function nodeById(
  graph: EffortGraphDto | null,
  id: string,
): GraphNodeDto | undefined {
  return graph?.nodes.find((n) => n.id === id);
}

/** Ticket stem owning a node, if any (chart-thread → null). */
export function ownerTicketStem(
  graph: EffortGraphDto,
  nodeId: string,
): string | null {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const start = byId.get(nodeId);
  if (!start) return null;
  if (start.kind === "Ticket") return start.stem;
  if (start.kind === "TicketQuestion" || start.kind === "Resolution") {
    return start.ticketStem;
  }
  if (start.kind === "Map" || start.kind === "FogEntry" || start.kind === "OutOfScopeEntry") {
    return null;
  }

  // Walk structural parents via reverse edges.
  const incoming = new Map<string, string[]>();
  for (const e of graph.edges) {
    const list = incoming.get(e.target) ?? [];
    list.push(e.source);
    incoming.set(e.target, list);
  }

  const seen = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const n = byId.get(id);
    if (!n) continue;
    if (n.kind === "Ticket") return n.stem;
    if (n.kind === "TicketQuestion" || n.kind === "Resolution") return n.ticketStem;
    if (n.kind === "AskTurn" && n.ownerId !== "map") {
      // ownerId is ticket stem for work-through asks
      return n.ownerId;
    }
    for (const src of incoming.get(id) ?? []) queue.push(src);
  }
  return null;
}

/**
 * Map a graph node click to selection (IA primary click by kind).
 * GeneratedAnswer routing (click contract) is layered by the caller.
 */
export function selectionFromNodeClick(
  graph: EffortGraphDto,
  nodeId: string,
): Selection {
  const n = nodeById(graph, nodeId);
  if (!n) return defaultSelection();

  switch (n.kind) {
    case "Map":
      return { kind: "map" };
    case "Ticket":
      return { kind: "ticket", ticketStem: n.stem };
    case "FogEntry":
      return { kind: "fog", nodeId: n.id };
    case "OutOfScopeEntry":
      return { kind: "oos", nodeId: n.id };
    case "TicketQuestion":
    case "Resolution":
      return { kind: "ticket", ticketStem: n.ticketStem, highlightNodeId: n.id };
    case "AskTurn": {
      if (n.ownerId === "map") return { kind: "node", nodeId: n.id };
      return { kind: "ticket", ticketStem: n.ownerId, highlightNodeId: n.id };
    }
    case "Question":
    case "GeneratedAnswer": {
      const stem = ownerTicketStem(graph, n.id);
      if (stem) return { kind: "ticket", ticketStem: stem, highlightNodeId: n.id };
      return { kind: "node", nodeId: n.id };
    }
  }
}

export function focusedTicketStem(sel: Selection): string | null {
  return sel.kind === "ticket" ? sel.ticketStem : null;
}

export function cameraTargetForSelection(sel: Selection): {
  kind: "map" | "node" | "none";
  nodeId?: string;
} {
  switch (sel.kind) {
    case "map":
      return { kind: "map", nodeId: "map" };
    case "ticket":
      return {
        kind: "node",
        nodeId: sel.highlightNodeId ?? sel.ticketStem,
      };
    case "fog":
    case "oos":
    case "node":
      return { kind: "node", nodeId: sel.nodeId };
  }
}
