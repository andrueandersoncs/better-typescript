import { spawn } from "node:child_process"
import { once } from "node:events"
import * as path from "node:path"
import { Effect } from "effect"
import { defaultConfig } from "@better-typescript/guidance/preset/defaultWiring"
import { loadWiringConfig } from "@better-typescript/core/project/loadWiringConfig"

interface SelfHostBenchmarkTarget {
  readonly rootPath: string
  readonly cliPath: string
  readonly checkNames: ReadonlyArray<string>
}

interface SelfHostDurationSummary {
  readonly minimumMs: number
  readonly medianMs: number
  readonly maximumMs: number
}

interface SelfHostBenchmarkReport extends SelfHostDurationSummary {
  readonly target: SelfHostBenchmarkTarget
  readonly durationsMs: ReadonlyArray<number>
}

interface SelfHostBenchmarkOptions {
  readonly repetitions: number
  readonly timeoutMs: number
}

export const selfHostBenchmarkTarget = async (
  rootPath: string
): Promise<SelfHostBenchmarkTarget> => {
  const config = await Effect.runPromise(loadWiringConfig(rootPath, defaultConfig))
  const checkNames = config.flatMap((entry) => entry.wiring.policies.map((check) => check.name))

  return {
    rootPath,
    cliPath: path.join(rootPath, "packages", "cli", "dist", "index.js"),
    checkNames
  }
}

const summarizeSelfHostDurations = (
  durationsMs: ReadonlyArray<number>
): SelfHostDurationSummary => {
  if (durationsMs.length === 0) {
    throw new Error("Self-host benchmark requires at least one duration.")
  }

  const ordered = Array.from(durationsMs).sort((self, that) => self - that)
  const middle = Math.floor(ordered.length / 2)
  const medianMs =
    ordered.length % 2 === 0 ? (ordered[middle - 1] + ordered[middle]) / 2 : ordered[middle]

  return {
    minimumMs: ordered[0],
    medianMs,
    maximumMs: ordered[ordered.length - 1]
  }
}

const runSelfHostOnce = async (
  target: SelfHostBenchmarkTarget,
  timeoutMs: number
): Promise<number> => {
  const started = performance.now()
  const child = spawn(process.execPath, [target.cliPath, "--project", target.rootPath], {
    cwd: target.rootPath,
    env: { ...process.env, NO_COLOR: "1" },
    signal: AbortSignal.timeout(timeoutMs),
    stdio: "ignore"
  })
  const [status, signal] = await once(child, "close")

  if (status !== 0) {
    throw new Error(
      `Self-hosted CLI exited with status ${String(status)} and signal ${String(signal)}.`
    )
  }

  return performance.now() - started
}

export const runSelfHostBenchmark = async (
  target: SelfHostBenchmarkTarget,
  options: SelfHostBenchmarkOptions
): Promise<SelfHostBenchmarkReport> => {
  if (!Number.isInteger(options.repetitions) || options.repetitions <= 0) {
    throw new Error("Self-host benchmark repetitions must be a positive integer.")
  }

  const durationsMs: Array<number> = []

  for (let index = 0; index < options.repetitions; index += 1) {
    durationsMs.push(await runSelfHostOnce(target, options.timeoutMs))
  }

  return {
    target,
    durationsMs,
    ...summarizeSelfHostDurations(durationsMs)
  }
}
