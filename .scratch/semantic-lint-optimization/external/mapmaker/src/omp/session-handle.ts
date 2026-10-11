import type { SessionKind } from "../shared/sessions-schema.ts";
import { PendingToolUIBridge } from "./pending-ui.ts";
import type { Theme } from "@oh-my-pi/pi-coding-agent";

/** Opaque listener token for subscribe. */
export type Unsubscribe = () => void;

/**
 * Minimal harness-facing Session surface.
 * Real omp AgentSession is adapted behind this; tests use FakeSessionHandle.
 */
export type SessionHandle = {
  readonly id: string;
  /** Absolute omp JSONL path when durable; synthetic id when in-memory. */
  readonly sessionPath: string;
  prompt(text: string): Promise<void>;
  dispose(): Promise<void>;
  /**
   * Observe session events. AFK dispatcher watches for Ask tool starts.
   * Event shape is intentionally narrow for pool policy tests.
   */
  subscribe(listener: (event: SessionEvent) => void): Unsubscribe;
};

export type SessionEvent =
  | {
      type: "tool_execution_start";
      toolName: string;
      toolCallId?: string;
      args?: unknown;
    }
  | { type: "idle" }
  | { type: "error"; message: string };

export type CreateSessionParams = {
  cwd: string;
  /** Optional absolute path to resume; omit for fresh. */
  sessionPath?: string;
  kind: SessionKind;
  /** Ticket relPath or `chart` for Map-scoped. */
  bindKey: string;
};

export type SessionFactory = (
  params: CreateSessionParams,
) => Promise<SessionHandle>;

/** In-memory fake for pool/AFK tests. */
export class FakeSessionHandle implements SessionHandle {
  readonly id: string;
  readonly sessionPath: string;
  readonly kind: SessionKind;
  readonly bindKey: string;
  /** Optional tool UI bridge so click-contract tests can park selects. */
  readonly toolUI: PendingToolUIBridge;
  prompts: string[] = [];
  disposed = false;
  private listeners = new Set<(event: SessionEvent) => void>();
  private pendingPrompt: {
    resolve: () => void;
    reject: (err: unknown) => void;
  } | null = null;

  constructor(params: CreateSessionParams & { id?: string; theme?: Theme }) {
    this.id = params.id ?? `fake-${params.bindKey}-${params.kind}`;
    this.sessionPath =
      params.sessionPath ??
      `/tmp/mapmaker-fake-sessions/${encodeURIComponent(params.bindKey)}.jsonl`;
    this.kind = params.kind;
    this.bindKey = params.bindKey;
    const theme = params.theme ?? ({ name: "fake" } as unknown as Theme);
    this.toolUI = new PendingToolUIBridge(theme);
  }

  async prompt(text: string): Promise<void> {
    if (this.disposed) throw new Error("session disposed");
    this.prompts.push(text);
    // Resolve immediately unless a test parks the turn.
    if (this.pendingPrompt) {
      return new Promise<void>((resolve, reject) => {
        this.pendingPrompt = { resolve, reject };
      });
    }
  }

  /** Test helper: hold the next prompt() until releasePrompt(). */
  holdNextPrompt(): void {
    this.pendingPrompt = {
      resolve: () => {},
      reject: () => {},
    };
  }

  releasePrompt(): void {
    const p = this.pendingPrompt;
    this.pendingPrompt = null;
    p?.resolve();
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    this.toolUI.dispose();
    this.listeners.clear();
    this.pendingPrompt?.reject(new Error("disposed"));
    this.pendingPrompt = null;
  }

  subscribe(listener: (event: SessionEvent) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Test helper: emit an event to subscribers. */
  emit(event: SessionEvent): void {
    for (const l of this.listeners) l(event);
  }

  /** Emit Ask tool start (AFK → auto-Unclaim trigger). */
  emitAsk(args?: unknown): void {
    this.emit({
      type: "tool_execution_start",
      toolName: "ask",
      toolCallId: `ask-${this.prompts.length}`,
      args,
    });
  }
}

export function createFakeSessionFactory(opts?: {
  onCreate?: (handle: FakeSessionHandle) => void | Promise<void>;
  handles?: FakeSessionHandle[];
}): SessionFactory {
  const handles = opts?.handles ?? [];
  return async (params) => {
    const handle = new FakeSessionHandle(params);
    handles.push(handle);
    await opts?.onCreate?.(handle);
    return handle;
  };
}

/**
 * @deprecated Prefer {@link createOmpSessionFactory}. Kept for explicit test isolation.
 */
export function createUnimplementedSessionFactory(): SessionFactory {
  return async (params) => {
    throw new Error(
      `omp SessionFactory not wired (kind=${params.kind} bindKey=${params.bindKey}); pass createOmpSessionFactory() or a test fake`,
    );
  };
}
