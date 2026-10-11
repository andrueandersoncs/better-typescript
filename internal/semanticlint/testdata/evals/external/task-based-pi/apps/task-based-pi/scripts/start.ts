import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { resolveBootstrapObservabilityOptions, resolveRuntimeOptions, type RuntimeOptions } from "../src/config.ts";
import { RotatingJsonlWriter } from "../src/observability.ts";
import { provisionLocalJaegerIfNeeded, type LocalJaegerHandle } from "./local-jaeger.ts";

const runId = process.env.TBP_RUN_ID?.trim() || randomUUID();
const childEnvironment: NodeJS.ProcessEnv = {
  ...process.env,
  TBP_RUN_ID: runId,
  TBP_PROCESS_ROLE: "all",
  TBP_PROCESS_INSTANCE_ID: process.env.TBP_PROCESS_INSTANCE_ID?.trim() || randomUUID(),
};
const abort = new AbortController();
let requestedSignal: NodeJS.Signals | undefined;
let child: Bun.Subprocess | undefined;
let jaeger: LocalJaegerHandle | undefined;
let stopping: Promise<void> | undefined;

async function stop(signal: NodeJS.Signals): Promise<void> {
  requestedSignal ??= signal;
  abort.abort();
  if (stopping) return stopping;
  stopping = (async () => {
    const active = child;
    if (!active || active.exitCode !== null) return;
    active.kill(signal);
    const graceful = await Promise.race([active.exited.then(() => true), Bun.sleep(5_000).then(() => false)]);
    if (!graceful) {
      active.kill("SIGKILL");
      await active.exited;
    }
  })();
  return stopping;
}
process.once("SIGINT", () => void stop("SIGINT"));
process.once("SIGTERM", () => void stop("SIGTERM"));

let exitCode = 1;
let options: RuntimeOptions;
try {
  options = resolveRuntimeOptions(childEnvironment);
} catch (error) {
  // The supported package launcher validates before the application child can
  // open its sink. Open the minimal safe writer only on this failure path.
  try {
    const writer = new RotatingJsonlWriter(resolveBootstrapObservabilityOptions(childEnvironment));
    writer.write("tbp.runtime.configuration.failed", "ERROR", "Runtime configuration validation failed", {
      "error.type": error instanceof Error ? error.name : "UnknownError",
      "error.message": error instanceof Error ? error.message : String(error),
    });
    writer.write("tbp.runtime.bootstrap.failed", "ERROR", "Operational runtime bootstrap failed");
    writer.close();
  } catch {
    // No safe durable sink exists. Do not echo unsafe configuration values.
  }
  process.exit(78);
}
try {
  jaeger = await provisionLocalJaegerIfNeeded(process.env, options, abort.signal);
  if (requestedSignal) throw new Error("Start interrupted before child launch");
  child = Bun.spawn([process.execPath, "src/index.ts"], {
    cwd: resolve(import.meta.dir, ".."),
    env: childEnvironment,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  if (requestedSignal) await stop(requestedSignal);
  exitCode = await child.exited;
} catch {
  exitCode = requestedSignal === "SIGINT" ? 130 : requestedSignal === "SIGTERM" ? 143 : 1;
} finally {
  if (requestedSignal) await stop(requestedSignal);
  await jaeger?.stop().catch(() => { exitCode = 1; });
}
process.exit(exitCode);
