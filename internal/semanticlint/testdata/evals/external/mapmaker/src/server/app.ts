import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import { ZodError } from "zod";
import {
  parseCommandRequest,
  type CommandResponse,
  type WsServerMessage,
} from "../shared/wire-schema.ts";
import { dispatchCommand } from "./commands.ts";
import type { EffortRuntime } from "./effort-runtime.ts";
import type { EffortLock } from "./lock.ts";
import type { ProjectionHub } from "./projection-hub.ts";
import { buildHealth } from "./projection.ts";

export type HarnessState = {
  effortPath: string;
  lock: EffortLock;
  runtime?: EffortRuntime;
  hub?: ProjectionHub;
  /** Absolute path to Vite `dist/` when built; optional. */
  uiDistDir?: string;
};

/** Hono Bun adapter attaches its own data shape; we keep client cleanup aside. */
const wsUnsubs = new WeakMap<object, () => void>();

const { upgradeWebSocket, websocket } = createBunWebSocket();

export { websocket };

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function placeholderHtml(effortPath: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>mapmaker</title>
    <style>
      :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, sans-serif; }
      body { margin: 2rem; line-height: 1.5; max-width: 42rem; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .muted { opacity: 0.75; }
      ul { padding-left: 1.2rem; }
    </style>
  </head>
  <body>
    <h1>mapmaker</h1>
    <p>Harness is up for <code>${escapeHtml(effortPath)}</code>.</p>
    <p class="muted">Classic dock UI lands next. Wire endpoints:</p>
    <ul class="muted">
      <li><a href="/api/health"><code>GET /api/health</code></a></li>
      <li><code>GET /api/snapshot</code> — full effort hydrate</li>
      <li><code>POST /api/command</code> — claim / unclaim / chart / ask ops</li>
      <li><code>WS /api/ws</code> — live projection + strip + ask</li>
    </ul>
    <p class="muted">Dev UI: run Vite against this origin (proxy <code>/api</code>) once the shell ticket lands; production serves <code>dist/</code> from the harness when present.</p>
  </body>
</html>`;
}

export function createApp(state: HarnessState): Hono {
  const app = new Hono();

  app.get("/api/health", (c) => {
    return c.json(buildHealth(state.lock));
  });

  app.get("/api/snapshot", async (c) => {
    if (!state.hub) {
      return c.json(
        { error: "projection hub not ready", code: "internal" },
        503,
      );
    }
    try {
      const snapshot = await state.hub.getSnapshot();
      return c.json(snapshot);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message, code: "internal" }, 500);
    }
  });

  app.post("/api/command", async (c) => {
    if (!state.runtime || !state.hub) {
      return c.json(
        {
          ok: false,
          op: "claim",
          error: "harness runtime not ready",
          code: "internal",
        } satisfies CommandResponse,
        503,
      );
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json(
        {
          ok: false,
          op: "claim",
          error: "invalid JSON body",
          code: "validation",
        } satisfies CommandResponse,
        400,
      );
    }

    let req;
    try {
      req = parseCommandRequest(body);
    } catch (err) {
      const message =
        err instanceof ZodError
          ? err.issues.map((i) => i.message).join("; ")
          : err instanceof Error
            ? err.message
            : String(err);
      return c.json(
        {
          ok: false,
          op: "claim",
          error: message,
          code: "validation",
        } satisfies CommandResponse,
        400,
      );
    }

    const result = await dispatchCommand(
      { runtime: state.runtime, hub: state.hub },
      req,
    );
    const status = result.ok
      ? 200
      : result.code === "validation"
        ? 400
        : result.code === "not_found"
          ? 404
          : result.code === "conflict"
            ? 409
            : result.code === "not_implemented"
              ? 501
              : 500;
    return c.json(result, status);
  });

  app.get(
    "/api/ws",
    upgradeWebSocket(() => {
      return {
        async onOpen(_event, ws) {
          if (!state.hub) return;
          const raw = ws.raw;
          if (!raw) return;

          const client = {
            send: (message: WsServerMessage) => {
              if (ws.readyState === 1) {
                ws.send(JSON.stringify(message));
              }
            },
          };
          const unsub = await state.hub.addClient(client);
          wsUnsubs.set(raw, unsub);
        },
        async onMessage(event, ws) {
          if (!state.hub) return;
          const data =
            typeof event.data === "string"
              ? event.data
              : new TextDecoder().decode(event.data as ArrayBuffer);
          const reply = await state.hub.handleClientMessage(data);
          if (reply && ws.readyState === 1) {
            ws.send(JSON.stringify(reply));
          }
        },
        onClose(_event, ws) {
          const raw = ws.raw;
          if (!raw) return;
          const unsub = wsUnsubs.get(raw);
          unsub?.();
          wsUnsubs.delete(raw);
        },
      };
    }),
  );

  // Static UI from Vite dist when present; else placeholder shell notes.
  app.get("/", async (c) => {
    if (state.uiDistDir) {
      try {
        const html = await readFile(join(state.uiDistDir, "index.html"), "utf8");
        return c.html(html);
      } catch {
        // fall through
      }
    }
    return c.html(placeholderHtml(state.effortPath));
  });

  if (state.uiDistDir) {
    app.get("/assets/*", async (c) => {
      const rel = c.req.path.replace(/^\//, "");
      try {
        const file = Bun.file(join(state.uiDistDir!, rel));
        if (await file.exists()) {
          return new Response(file);
        }
      } catch {
        // 404 below
      }
      return c.notFound();
    });
  }

  return app;
}

export type HarnessWebSocket = typeof websocket;
