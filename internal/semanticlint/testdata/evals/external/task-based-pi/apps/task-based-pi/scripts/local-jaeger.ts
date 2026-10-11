import { randomUUID } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { checkObservabilityReadiness, isDefaultLocalObservability, safeErrorMessage, type ObservabilityOptions } from "../src/observability.ts";

const appDirectory = resolve(import.meta.dir, "..");
const composeFile = resolve(appDirectory, "docker-compose.observability.yml");
const readinessTimeoutMilliseconds = 20_000;
const composeTimeoutMilliseconds = 15_000;
const lockTimeoutMilliseconds = 10_000;

export interface LocalJaegerHandle {
  readonly owned: boolean;
  readonly leaseId?: string;
  readonly stop: () => Promise<void>;
}

export async function provisionLocalJaegerIfNeeded(
  env: NodeJS.ProcessEnv,
  options: ObservabilityOptions,
  signal?: AbortSignal,
): Promise<LocalJaegerHandle> {
  if (!isDefaultLocalObservability(env)) {
    await checkObservabilityReadiness(options);
    return noopHandle();
  }
  const coordination = localJaegerCoordinationDirectory(env);
  mkdirSync(resolve(coordination, "leases"), { recursive: true, mode: 0o700 });
  const releaseLock = await acquireCoordinationLock(coordination, signal);
  const leaseId = `${process.pid}-${randomUUID()}`;
  let repositoryManaged = false;
  try {
    pruneDeadLeases(coordination);
    repositoryManaged = existsSync(resolve(coordination, "repository-managed"));
    if (!repositoryManaged) {
      try {
        await checkObservabilityReadiness(options, 250);
        // A service without our durable marker is external. Never take ownership.
        return noopHandle();
      } catch {
        throwIfAborted(signal);
        writeFileSync(resolve(coordination, "repository-managed"), `${process.pid}
`, { mode: 0o600, flag: "wx" });
        repositoryManaged = true;
        try {
          await runDockerCompose(["up", "-d"], composeTimeoutMilliseconds);
        } catch (error) {
          rmSync(resolve(coordination, "repository-managed"), { force: true });
          throw error;
        }
      }
    }
    writeFileSync(resolve(coordination, "leases", leaseId), `${process.pid}
`, { mode: 0o600, flag: "wx" });
  } finally {
    releaseLock();
  }

  try {
    await waitUntilReady(options, signal);
  } catch (error) {
    await releaseLease(coordination, leaseId).catch(() => {});
    throw error;
  }
  let stopped = false;
  return {
    owned: repositoryManaged,
    leaseId,
    stop: async () => {
      if (stopped) return;
      stopped = true;
      await releaseLease(coordination, leaseId);
    },
  };
}

function noopHandle(): LocalJaegerHandle {
  return { owned: false, stop: async () => {} };
}

async function waitUntilReady(options: ObservabilityOptions, signal?: AbortSignal): Promise<void> {
  const deadline = Date.now() + readinessTimeoutMilliseconds;
  let lastError: unknown;
  while (Date.now() < deadline) {
    throwIfAborted(signal);
    try {
      await checkObservabilityReadiness(options, 1_000);
      return;
    } catch (error) {
      lastError = error;
      await Bun.sleep(100);
    }
  }
  throw new Error(`Repository Jaeger did not become ready: ${safeErrorMessage(lastError)}`);
}

async function releaseLease(coordination: string, leaseId: string): Promise<void> {
  const releaseLock = await acquireCoordinationLock(coordination);
  try {
    rmSync(resolve(coordination, "leases", leaseId), { force: true });
    pruneDeadLeases(coordination);
    const leases = readdirSync(resolve(coordination, "leases"));
    if (leases.length === 0 && existsSync(resolve(coordination, "repository-managed"))) {
      try {
        await runDockerCompose(["down", "--remove-orphans"], composeTimeoutMilliseconds);
      } finally {
        rmSync(resolve(coordination, "repository-managed"), { force: true });
      }
    }
  } finally {
    releaseLock();
  }
}

async function acquireCoordinationLock(coordination: string, signal?: AbortSignal): Promise<() => void> {
  const lock = resolve(coordination, "lock");
  const deadline = Date.now() + lockTimeoutMilliseconds;
  while (true) {
    throwIfAborted(signal);
    try {
      mkdirSync(lock, { mode: 0o700 });
      writeFileSync(resolve(lock, "owner"), `${process.pid}
`, { mode: 0o600 });
      return () => rmSync(lock, { recursive: true, force: true });
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "EEXIST") throw error;
      if (staleLock(lock)) rmSync(lock, { recursive: true, force: true });
      else if (Date.now() >= deadline) throw new Error("Timed out acquiring local Jaeger coordination lock");
      else await Bun.sleep(25);
    }
  }
}

function staleLock(lock: string): boolean {
  try {
    const pid = Number(readFileSync(resolve(lock, "owner"), "utf8").trim());
    if (Number.isSafeInteger(pid) && pid > 0 && processExists(pid)) return false;
    return Date.now() - statSync(lock).mtimeMs > 1_000;
  } catch {
    return Date.now() - statSync(lock).mtimeMs > 1_000;
  }
}

function pruneDeadLeases(coordination: string): void {
  const directory = resolve(coordination, "leases");
  for (const name of readdirSync(directory)) {
    try {
      const pid = Number(readFileSync(resolve(directory, name), "utf8").trim());
      if (!Number.isSafeInteger(pid) || !processExists(pid)) rmSync(resolve(directory, name), { force: true });
    } catch {
      rmSync(resolve(directory, name), { force: true });
    }
  }
}

function processExists(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

export async function runDockerCompose(arguments_: ReadonlyArray<string>, timeoutMilliseconds: number): Promise<void> {
  // Redirect stderr to a private regular file. A compose descendant may retain
  // the descriptor, but regular-file output has no EOF drain to await. We can
  // read a bounded snapshot and unlink it safely after the compose deadline.
  const errorPath = resolve(tmpdir(), `task-based-pi-compose-${process.pid}-${randomUUID()}.stderr`);
  const errorFd = openSync(errorPath, "w", 0o600);
  try {
    const child = Bun.spawn(["docker", "compose", "-f", composeFile, ...arguments_], {
      cwd: appDirectory,
      stdin: "ignore",
      stdout: "ignore",
      stderr: errorFd,
      env: process.env,
    });
    const completed = await Promise.race([
      child.exited.then((code) => ({ completed: true as const, code })),
      Bun.sleep(timeoutMilliseconds).then(() => ({ completed: false as const, code: -1 })),
    ]);
    if (!completed.completed) {
      if (child.exitCode === null) child.kill("SIGTERM");
      const terminated = await Promise.race([child.exited.then(() => true), Bun.sleep(1_000).then(() => false)]);
      if (!terminated && child.exitCode === null) {
        child.kill("SIGKILL");
        await Promise.race([child.exited, Bun.sleep(1_000)]);
      }
      throw new Error(`docker compose timed out after ${timeoutMilliseconds}ms`);
    }
    const errorText = readFileSync(errorPath, "utf8").slice(0, 65_536);
    if (completed.code !== 0) {
      throw new Error(`docker compose failed with code ${completed.code}: ${safeErrorMessage(errorText)}`);
    }
  } finally {
    // Close only after Bun has observed child exit/cleanup. Unlinking remains
    // safe even when a descendant retained its inherited descriptor.
    closeSync(errorFd);
    rmSync(errorPath, { force: true });
  }
}

export function localJaegerCoordinationDirectory(env: NodeJS.ProcessEnv): string {
  if (env.TBP_JAEGER_COORDINATION_DIRECTORY) return resolve(env.TBP_JAEGER_COORDINATION_DIRECTORY);
  // The compose project, container name, and ports are global for this user,
  // so the default lease/ownership domain must also be global across worktrees.
  return resolve(tmpdir(), "task-based-pi-jaeger-global-v1");
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error("Local Jaeger provisioning was interrupted");
}
