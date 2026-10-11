import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { createSandbox } from "../../src";
import { createSandboxToolApproval, createSandboxTools, toAISandboxSession } from "../../src/ai";
import { local } from "../../src/providers/local";

function setup() {
  return Effect.map(createSandbox({ provider: local(), cwd: "/workspace" }), (sandbox) => ({
    sandbox,
    ai: toAISandboxSession(sandbox),
  }));
}

describe("AI SDK adapter", () => {
  test("maps files, encodings, ranges, and missing files", async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const { ai } = yield* setup();
          yield* Effect.promise(() =>
            ai.writeTextFile({
              path: "lines.txt",
              content: "one\ntwo\nthree",
              encoding: "utf-8",
            }),
          );
          expect(
            yield* Effect.promise(() =>
              ai.readTextFile({ path: "lines.txt", startLine: 2, endLine: 3 }),
            ),
          ).toBe("two\nthree");
          yield* Effect.promise(() =>
            ai.writeBinaryFile({ path: "bytes.bin", content: new Uint8Array([0, 255]) }),
          );
          expect([
            ...(yield* Effect.promise(() => ai.readBinaryFile({ path: "bytes.bin" })))!,
          ]).toEqual([0, 255]);
          expect(yield* Effect.promise(() => ai.readTextFile({ path: "missing.txt" }))).toBeNull();
        }),
      ),
    );
  });

  test("provides AgentOS shell output and the real exit code", async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const { ai } = yield* setup();
          const process = yield* Effect.promise(() =>
            ai.spawn({ command: "printf out; printf err >&2; exit 9" }),
          );
          const [stdout, stderr, result] = yield* Effect.promise(() =>
            Promise.all([
              new Response(process.stdout).text(),
              new Response(process.stderr).text(),
              process.wait(),
            ]),
          );
          expect({ stdout, stderr, ...result }).toEqual({
            stdout: "outerr",
            stderr: "",
            exitCode: 9,
          });
          yield* Effect.promise(() => process.kill());
          yield* Effect.promise(() => process.kill());
        }),
      ),
    );
  });

  test("configures approval modes", () => {
    expect(createSandboxToolApproval()).toEqual({
      bash: "user-approval",
      read_file: "not-applicable",
      write_file: "user-approval",
    });
    expect(createSandboxToolApproval("always")).toEqual({
      bash: "user-approval",
      read_file: "user-approval",
      write_file: "user-approval",
    });
    expect(createSandboxToolApproval("never")).toEqual({
      bash: "not-applicable",
      read_file: "not-applicable",
      write_file: "not-applicable",
    });

    const tools = createSandboxTools();
    expect(tools.bash.needsApproval).toBeUndefined();
    expect(tools.read_file.needsApproval).toBeUndefined();
    expect(tools.write_file.needsApproval).toBeUndefined();
  });
});
