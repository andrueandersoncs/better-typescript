import { expect, test } from "bun:test";
import { Cause, Effect, Exit, Option } from "effect";
import { createSandbox, SandboxError } from "../../src";
import { defineCapabilities } from "../../src/core/capabilities";
import type { SandboxProvider } from "../../src/core/provider";
import { unsupportedSnapshots } from "../../src/internal/provider-utils";

function disposableProvider(onStop: () => void): SandboxProvider<{}> {
  const unsupported = async (): Promise<never> => {
    throw new Error("not used");
  };

  return {
    id: "local",
    capabilities: defineCapabilities({}),
    async create() {
      return {
        id: "disposable",
        raw: {},
        capabilities: defineCapabilities({}),
        files: {
          write: unsupported,
          read: unsupported,
          list: unsupported,
          mkdir: unsupported,
          remove: unsupported,
          exists: unsupported,
        },
        run: unsupported,
        start: unsupported,
        expose: unsupported,
        snapshots: unsupportedSnapshots("local"),
        stop: async () => onStop(),
      };
    },
  };
}

test("stops a sandbox when its Effect scope exits", async () => {
  let stops = 0;

  await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const sandbox = yield* createSandbox({
          provider: disposableProvider(() => stops++),
        });
        expect(sandbox.id).toBe("disposable");
        expect(stops).toBe(0);
      }),
    ),
  );

  expect(stops).toBe(1);
});

test("stops a sandbox when its Effect scope fails", async () => {
  let stops = 0;
  const failure = new Error("scope failed");

  const exit = await Effect.runPromiseExit(
    Effect.scoped(
      Effect.gen(function* () {
        const sandbox = yield* createSandbox({
          provider: disposableProvider(() => stops++),
        });
        expect(sandbox.id).toBe("disposable");
        return yield* Effect.fail(failure);
      }),
    ),
  );

  expect(Exit.isFailure(exit)).toBe(true);
  if (Exit.isSuccess(exit)) throw new Error("Expected the scope to fail");
  const effectFailure = Cause.failureOption(exit.cause);
  expect(Option.isSome(effectFailure)).toBe(true);
  if (Option.isSome(effectFailure)) expect(effectFailure.value).toBe(failure);
  expect(stops).toBe(1);
});

test("explicit stop and scope finalization share idempotent cleanup", async () => {
  let stops = 0;

  await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const sandbox = yield* createSandbox({
          provider: disposableProvider(() => stops++),
        });
        yield* sandbox.stop();
        expect(stops).toBe(1);
      }),
    ),
  );

  expect(stops).toBe(1);
});

test("scope finalization normalizes cleanup failures", async () => {
  const exit = await Effect.runPromiseExit(
    Effect.scoped(
      Effect.gen(function* () {
        const sandbox = yield* createSandbox({
          provider: disposableProvider(() => {
            throw new Error("cleanup failed");
          }),
        });
        expect(sandbox.id).toBe("disposable");
      }),
    ),
  );

  expect(Exit.isFailure(exit)).toBe(true);
  if (Exit.isSuccess(exit)) throw new Error("Expected scope finalization to fail");
  const defect = Cause.dieOption(exit.cause);
  expect(Option.isSome(defect)).toBe(true);
  if (Option.isNone(defect)) throw new Error("Expected a cleanup defect");
  expect(defect.value).toBeInstanceOf(SandboxError);
  expect(defect.value).toMatchObject({
    provider: "local",
    operation: "sandbox.stop",
  });
});
