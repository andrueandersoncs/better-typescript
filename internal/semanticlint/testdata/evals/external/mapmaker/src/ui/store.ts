import { create } from "zustand";
import type { GraphFilters } from "@domain/density-collapse.ts";
import type {
  CommandRequest,
  CommandResponse,
  EffortSnapshot,
  LiveAskDto,
  MapChromeDto,
  ReclaimableSessionDto,
  StripSnapshotDto,
  WsServerMessage,
} from "@shared/wire-schema.ts";
import {
  encodeClientMessage,
  fetchSnapshot,
  parseServerMessage,
  postCommand,
  wsUrl,
} from "./api/client.ts";
import {
  defaultSelection,
  focusedTicketStem,
  selectionFromNodeClick,
  type Selection,
} from "./selection.ts";

export type Toast = { id: number; text: string } | null;

export type ConnState = "boot" | "connecting" | "live" | "reconnecting" | "error";

type UiState = {
  conn: ConnState;
  error: string | null;
  snapshot: EffortSnapshot | null;
  selection: Selection;
  filters: GraphFilters;
  /** User pin expand/collapse by ticket stem. */
  pinExpand: Map<string, boolean>;
  /** Local multi-select toggles until Submit (ticket 21 wires commit). */
  multiSelectedAnswerIds: Set<string>;
  otherDraft: string;
  composerDraft: string;
  toast: Toast;
  /** Last command error message for banner. */
  commandNote: string | null;

  // ── derived helpers ──────────────────────────────────────────────
  applySnapshot: (s: EffortSnapshot) => void;
  applyWsMessage: (msg: WsServerMessage) => void;
  setSelection: (sel: Selection) => void;
  keepSelectionOnEmptyCanvas: () => void;
  selectFromNodeId: (nodeId: string) => void;
  toggleFilter: (key: keyof GraphFilters) => void;
  togglePinExpand: (stem: string) => void;
  toggleMultiAnswer: (answerId: string) => void;
  clearMultiAnswers: () => void;
  setOtherDraft: (text: string) => void;
  setComposerDraft: (text: string) => void;
  pushToast: (text: string) => void;
  dismissToast: () => void;
  runCommand: (req: CommandRequest) => Promise<CommandResponse>;
  bootstrap: () => void;
  teardown: () => void;
  focusNextFrontier: () => void;
  focusStripKey: (key: string) => void;
};

let toastSeq = 1;
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let intentionalClose = false;
let bootstrapped = false;

function liveAskTicketStems(asks: readonly LiveAskDto[]): Set<string> {
  const out = new Set<string>();
  for (const a of asks) {
    if (a.key !== "chart") {
      // key is ticket relPath; stem is basename without .md
      const stem = a.key
        .replace(/^issues\//, "")
        .replace(/\.md$/i, "");
      out.add(stem);
    }
  }
  return out;
}

export const useStore = create<UiState>((set, get) => ({
  conn: "boot",
  error: null,
  snapshot: null,
  selection: defaultSelection(),
  filters: {},
  pinExpand: new Map(),
  multiSelectedAnswerIds: new Set(),
  otherDraft: "",
  composerDraft: "",
  toast: null,
  commandNote: null,

  applySnapshot: (s) => {
    set({ snapshot: s, error: null, conn: "live" });
  },

  applyWsMessage: (msg) => {
    const cur = get().snapshot;
    if (msg.type === "snapshot") {
      set({ snapshot: msg.snapshot, error: null, conn: "live" });
      // Auto-focus ticket when a new live Ask arrives (IA).
      maybeAutoFocusAsk(get, set, cur?.liveAsks ?? [], msg.snapshot.liveAsks);
      return;
    }
    if (!cur) return;

    if (msg.type === "projection") {
      set({
        snapshot: {
          ...cur,
          generatedAt: msg.generatedAt,
          map: msg.map,
          graph: msg.graph,
        },
      });
      return;
    }
    if (msg.type === "strip") {
      set({
        snapshot: {
          ...cur,
          strip: msg.strip,
          reclaimable: msg.reclaimable,
        },
      });
      return;
    }
    if (msg.type === "ask") {
      const prevAsks = cur.liveAsks;
      const next = prevAsks.filter((a) => a.key !== msg.key);
      if (msg.ask) next.push(msg.ask);
      set({ snapshot: { ...cur, liveAsks: next } });
      maybeAutoFocusAsk(get, set, prevAsks, next);
      return;
    }
    if (msg.type === "health") {
      set({ snapshot: { ...cur, health: msg.health } });
    }
  },

  setSelection: (sel) => set({ selection: sel, multiSelectedAnswerIds: new Set() }),

  keepSelectionOnEmptyCanvas: () => {
    // IA: empty canvas keeps last selection — no-op.
  },

  selectFromNodeId: (nodeId) => {
    const snap = get().snapshot;
    if (!snap) return;
    const sel = selectionFromNodeClick(snap.graph, nodeId);
    set({ selection: sel, multiSelectedAnswerIds: new Set() });
  },

  toggleFilter: (key) => {
    const f = { ...get().filters };
    const cur = f[key];
    if (cur) delete f[key];
    else f[key] = true;
    set({ filters: f });
  },

  togglePinExpand: (stem) => {
    const next = new Map(get().pinExpand);
    const cur = next.get(stem);
    // cycle: unset → expand → collapse → unset
    if (cur === undefined) next.set(stem, true);
    else if (cur === true) next.set(stem, false);
    else next.delete(stem);
    set({ pinExpand: next });
  },

  toggleMultiAnswer: (answerId) => {
    const next = new Set(get().multiSelectedAnswerIds);
    if (next.has(answerId)) next.delete(answerId);
    else next.add(answerId);
    set({ multiSelectedAnswerIds: next });
  },

  clearMultiAnswers: () => set({ multiSelectedAnswerIds: new Set() }),

  setOtherDraft: (text) => set({ otherDraft: text }),
  setComposerDraft: (text) => set({ composerDraft: text }),

  pushToast: (text) => set({ toast: { id: toastSeq++, text } }),
  dismissToast: () => set({ toast: null }),

  runCommand: async (req) => {
    try {
      const res = await postCommand(req);
      if (!res.ok) {
        const note =
          res.code === "not_implemented"
            ? `${req.op} not wired yet (${res.error})`
            : res.error;
        set({ commandNote: note });
        get().pushToast(note);
      } else {
        set({ commandNote: res.message ?? null });
        if (req.op === "claim" || req.op === "unclaim" || req.op === "reclaim") {
          // Selection stays on ticket; snapshot arrives via WS.
        }
        if (req.op === "clickAnswer" || req.op === "multiSubmit" || req.op === "other") {
          set({ multiSelectedAnswerIds: new Set(), otherDraft: "" });
        }
        if (req.op === "composerSend") {
          set({ composerDraft: "" });
        }
      }
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ commandNote: msg });
      get().pushToast(msg);
      return {
        ok: false,
        op: req.op,
        error: msg,
        code: "internal",
      };
    }
  },

  bootstrap: () => {
    intentionalClose = false;
    if (ws && ws.readyState === WebSocket.OPEN) {
      sendWs({ type: "resync" });
      void fetchSnapshot()
        .then((s) => get().applySnapshot(s))
        .catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          set({ conn: "error", error: msg });
        });
      return;
    }
    if (bootstrapped && ws) return;
    bootstrapped = true;
    void (async () => {
      set({ conn: "connecting", error: null });
      try {
        const snap = await fetchSnapshot();
        get().applySnapshot(snap);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        set({ conn: "error", error: msg });
        bootstrapped = false;
      }
      connectWs(get, set);
    })();
  },

  teardown: () => {
    intentionalClose = true;
    bootstrapped = false;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.close();
      ws = null;
    }
  },

  focusNextFrontier: () => {
    const snap = get().snapshot;
    if (!snap) return;
    const tickets = snap.graph.nodes
      .filter((n) => n.kind === "Ticket" && n.frontier && n.status === "open")
      .sort((a, b) => {
        if (a.kind !== "Ticket" || b.kind !== "Ticket") return 0;
        return a.stem.localeCompare(b.stem);
      });
    const first = tickets[0];
    if (!first || first.kind !== "Ticket") {
      get().pushToast("No frontier tickets");
      return;
    }
    set({
      selection: { kind: "ticket", ticketStem: first.stem },
      multiSelectedAnswerIds: new Set(),
    });
  },

  focusStripKey: (key) => {
    if (key === "chart") {
      set({ selection: { kind: "map" }, multiSelectedAnswerIds: new Set() });
      return;
    }
    const stem = key.replace(/^issues\//, "").replace(/\.md$/i, "");
    set({
      selection: { kind: "ticket", ticketStem: stem },
      multiSelectedAnswerIds: new Set(),
    });
  },
}));

function maybeAutoFocusAsk(
  get: () => UiState,
  set: (
    partial: Partial<UiState> | ((s: UiState) => Partial<UiState>),
  ) => void,
  prev: readonly LiveAskDto[],
  next: readonly LiveAskDto[],
): void {
  const prevKeys = new Set(prev.map((a) => a.key));
  for (const a of next) {
    if (prevKeys.has(a.key)) continue;
    // New Ask — steal focus (IA).
    if (a.key === "chart") {
      set({ selection: { kind: "map" }, multiSelectedAnswerIds: new Set() });
    } else {
      const stem = a.key.replace(/^issues\//, "").replace(/\.md$/i, "");
      set({
        selection: { kind: "ticket", ticketStem: stem },
        multiSelectedAnswerIds: new Set(),
      });
    }
    return;
  }
  void get;
}

function connectWs(
  get: () => UiState,
  set: (
    partial: Partial<UiState> | ((s: UiState) => Partial<UiState>),
  ) => void,
): void {
  if (intentionalClose) return;
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const socket = new WebSocket(wsUrl());
  ws = socket;
  set({
    conn: get().snapshot ? "reconnecting" : "connecting",
  });

  socket.addEventListener("open", () => {
    set({ conn: "live", error: null });
  });

  socket.addEventListener("message", (ev) => {
    try {
      const data: unknown = JSON.parse(String(ev.data));
      const msg = parseServerMessage(data);
      get().applyWsMessage(msg);
    } catch (err) {
      console.warn("[mapmaker ui] bad ws message", err);
    }
  });

  socket.addEventListener("close", () => {
    ws = null;
    if (intentionalClose) return;
    set({ conn: "reconnecting" });
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      // HTTP resync then WS
      void fetchSnapshot()
        .then((s) => get().applySnapshot(s))
        .catch(() => {
          /* ignore; WS retry still helps */
        })
        .finally(() => connectWs(get, set));
    }, 1200);
  });

  socket.addEventListener("error", () => {
    // close handler drives reconnect
  });
}

export function sendWs(msg: Parameters<typeof encodeClientMessage>[0]): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(encodeClientMessage(msg));
  }
}

export function selectMapChrome(s: EffortSnapshot | null): MapChromeDto | null {
  return s?.map ?? null;
}

export function selectStrip(s: EffortSnapshot | null): StripSnapshotDto | null {
  return s?.strip ?? null;
}

export function selectReclaimable(
  s: EffortSnapshot | null,
): ReclaimableSessionDto[] {
  return s?.reclaimable ?? [];
}

export function liveAskForKey(
  s: EffortSnapshot | null,
  key: string,
): LiveAskDto | null {
  return s?.liveAsks.find((a) => a.key === key) ?? null;
}

export function ticketRelPath(stem: string): string {
  // Projector uses issues/<file>; stem is file basename without extension
  // but may already be full stem like "20-classic-dock-ui-shell".
  return `issues/${stem}.md`;
}

export { focusedTicketStem, liveAskTicketStems };
