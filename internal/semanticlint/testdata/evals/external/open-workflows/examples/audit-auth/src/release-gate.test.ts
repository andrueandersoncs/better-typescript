import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";
import { decode, encode } from "@open-workflows/core";
import { EventLogTag, FakeInferenceLayer, makeMemoryEventLog, runOf } from "@open-workflows/engine";
import type { RunEvent } from "@open-workflows/engine";
import { graphOf } from "@open-workflows/graph";
import { releaseGate, type GateRejected, type Manifest } from "./release-gate.js";

/**
 * release-gate demonstrates typed errors-as-values (DESIGN.md §5, D1): a workflow that fails with
 * a STRUCTURED value its declared `error` schema describes, surfaced to the caller — not a string.
 */
describe("examples: release-gate (typed errors-as-values, DESIGN.md §5)", () => {
  it("graph draws the Fail arm as a terminal node previewing its typed value", () => {
    const g = graphOf(releaseGate);
    // the `fail()` is a terminal Fail node previewing its typed value
    const failNodes = g.nodes.filter((n) => n.kind === "Fail");
    expect(failNodes).toHaveLength(1);
    expect(failNodes[0]!.meta?.failValue).toMatchObject({ _tag: "GateRejected" });
    // it sits under the branch cluster as the `else` arm. The `then` arm here is a bare `succeed`,
    // which — like any Pure value — renders NO node, so only the Fail arm draws a branch edge.
    // (That's the honest fold: an arm with no work has no node; the Fail arm is the visible one.)
    const branchNode = g.nodes.find((n) => n.kind === "Branch")!;
    expect(failNodes[0]!.parent).toBe(branchNode.id);
    const armEdges = g.edges.filter((e) => e.kind === "branch");
    expect(armEdges.map((e) => e.label)).toEqual(["else"]);
  });

  it("round-trips through serialize → decode with the Fail node + error schema intact", () => {
    const s = encode(releaseGate);
    expect(s.error).toBeDefined(); // the GateRejected schema travels as JSON Schema
    const before = graphOf(releaseGate);
    const after = graphOf(decode(s));
    expect(after.nodes.length).toBe(before.nodes.length);
    expect(after.nodes.filter((n) => n.kind === "Fail")).toHaveLength(1);
  });

  it("FAILS with a typed GateRejected value when the build has violations", async () => {
    const { exit, events } = await Effect.runPromise(
      Effect.gen(function* () {
        const log = yield* makeMemoryEventLog();
        const ls = Layer.mergeAll(FakeInferenceLayer(), Layer.succeed(EventLogTag, log));
        const exit = yield* Effect.either(
          Effect.provide(runOf(releaseGate, { build: "dirty" }, "gate-dirty"), ls)
        );
        return { exit, events: yield* log.read("gate-dirty") };
      }) as Effect.Effect<any>
    );
    expect(exit._tag).toBe("Left"); // the run failed (a value in the error channel)
    const failed = events.find(
      (e: RunEvent): e is Extract<RunEvent, { _tag: "RunFailed" }> => e._tag === "RunFailed"
    )!;
    // the realized half of D1: the STRUCTURED error, schema-encoded, reaches the consumer
    const value = failed.errorValue as GateRejected;
    expect(value._tag).toBe("GateRejected");
    expect(value.count).toBe(2);
    expect(value.violations.map((v) => v.rule).sort()).toEqual(["unsigned", "vulnerable-dep"]);
  });

  it("SUCCEEDS with the manifest when the build is clean (the other branch arm)", async () => {
    const result = (await Effect.runPromise(
      Effect.gen(function* () {
        const log = yield* makeMemoryEventLog();
        const ls = Layer.mergeAll(FakeInferenceLayer(), Layer.succeed(EventLogTag, log));
        return yield* Effect.provide(runOf(releaseGate, { build: "clean" }, "gate-clean"), ls);
      }) as Effect.Effect<Manifest>
    )) as Manifest;
    expect(result.approved).toEqual(["clean/server.bin"]);
  });
});
