import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { LOCK_FILE, MAPMAKER_DIR } from "../shared/constants.ts";

export type EffortLock = {
  pid: number;
  port: number;
  host: string;
  url: string;
  effortPath: string;
  startedAt: string;
};

export function mapmakerDir(effortPath: string): string {
  return join(effortPath, MAPMAKER_DIR);
}

export function lockPath(effortPath: string): string {
  return join(mapmakerDir(effortPath), LOCK_FILE);
}

function isPidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function readLock(effortPath: string): Promise<EffortLock | null> {
  try {
    const raw = await readFile(lockPath(effortPath), "utf8");
    const parsed = JSON.parse(raw) as EffortLock;
    if (
      typeof parsed?.pid !== "number" ||
      typeof parsed?.port !== "number" ||
      typeof parsed?.url !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Acquire exclusive harness lock for this effort.
 * Returns existing live lock when another process owns it.
 */
export async function tryAcquireLock(
  effortPath: string,
  next: Omit<EffortLock, "startedAt"> & { startedAt?: string },
): Promise<{ ok: true; lock: EffortLock } | { ok: false; lock: EffortLock }> {
  await mkdir(mapmakerDir(effortPath), { recursive: true });
  const existing = await readLock(effortPath);
  if (existing && isPidAlive(existing.pid) && existing.pid !== process.pid) {
    return { ok: false, lock: existing };
  }

  const lock: EffortLock = {
    ...next,
    startedAt: next.startedAt ?? new Date().toISOString(),
  };
  const target = lockPath(effortPath);
  const tmp = `${target}.${process.pid}.tmp`;
  await writeFile(tmp, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
  await rename(tmp, target);

  // Re-read in case of a race; last writer with live pid wins for refuse check on losers.
  const after = await readLock(effortPath);
  if (after && after.pid !== process.pid && isPidAlive(after.pid)) {
    return { ok: false, lock: after };
  }
  return { ok: true, lock };
}

export async function releaseLock(effortPath: string): Promise<void> {
  const existing = await readLock(effortPath);
  if (!existing || existing.pid !== process.pid) return;
  await rm(lockPath(effortPath), { force: true });
}
