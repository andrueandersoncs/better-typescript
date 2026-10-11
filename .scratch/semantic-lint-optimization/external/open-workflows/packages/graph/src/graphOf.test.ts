import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import {
  agent,
  branch,
  dynamic,
  fail,
  forEach,
  gen,
  parallel,
  retry,
  step,
  succeed,
  use,
  verify,
  workflow,
  WorkflowCycleError,
} from "@open-workflows/core";
import type { WorkflowDef } from "@open-workflows/core";
import { graphOf } from "./index.js";
import type { Graph } from "./types.js";

const Finding = Schema.Struct({
  file: Schema.String,
  issue: Schema.String,
});

const nodeKinds = (g: Graph) => g.nodes.map((n) => n.kind).sort();
const byKind = (g: Graph, kind: string) => g.nodes.filter((n) => n.kind === kind);
const ids = (g: Graph) => g.nodes.map((n) => n.id);

describe("graphOf — pure fold, no execution", () => {
  it("PROOF: folds a workflow with NO engine present, without running any step body", () => {
    // The step bodies are *poisoned* — calling them throws. If graphOf executed anything,
    // this test would throw. It must not.
    const poison = () => {
      throw new Error("graph interpreter executed a step body!");
    };

    const def = workflow(
      "audit-auth",
      { payload: Schema.Struct({ dir: Schema.String }), success: Schema.Array(Finding) },
      ({ dir }) =>
        gen(function* () {
          const files = yield* step<string[]>("list-routes", poison);
          const found = yield* forEach(
            files,
            (f) =>
              agent("review", {
                prompt: `Review ${f} for missing auth checks.`,
                schema: Schema.Array(Finding),
              }).pipe(retry({ times: 3, schedule: "exponential" })),
            { concurrency: "engine" }
          );
          return found.flat();
        })
    );

    const g = graphOf(def); // must not throw
    expect(g.workflow).toBe("audit-auth");
    expect(nodeKinds(g)).toContain("Step");
    expect(nodeKinds(g)).toContain("ForEach");
    expect(nodeKinds(g)).toContain("Agent");
    expect(nodeKinds(g)).toContain("Start");
    expect(nodeKinds(g)).toContain("End");
  });

  it("Agent nodes carry the prompt template + a JSON Schema of the response", () => {
    const def = workflow("x", { payload: Schema.Void, success: Schema.Array(Finding) }, () =>
      agent("review", { prompt: "Review {file}", schema: Schema.Array(Finding) })
    );
    const g = graphOf(def);
    const a = byKind(g, "Agent")[0]!;
    expect(a.meta?.promptTemplate).toBe("Review {file}");
    // JSONSchema.make should yield an object with a type/array shape
    expect(a.meta?.responseSchema).toBeTypeOf("object");
  });

  it("ForEach renders the body ONCE as a template and records fan-out width", () => {
    const def = workflow("x", { payload: Schema.Void, success: Schema.Array(Schema.Number) }, () =>
      forEach([1, 2, 3, 4], (n) => succeed(n))
    );
    const g = graphOf(def);
    const fe = byKind(g, "ForEach")[0]!;
    expect(fe.meta?.fanOut).toBe(4);
    expect(fe.meta?.concurrency).toBe("engine");
  });

  it("retry policy is summarized on the node", () => {
    const def = workflow("x", { payload: Schema.Void, success: Schema.String }, () =>
      agent("a", { prompt: "p" }).pipe(retry({ times: 5, schedule: "spaced" }))
    );
    const g = graphOf(def);
    expect(byKind(g, "Agent")[0]!.meta?.retry).toBe("spaced x5");
  });

  it("branch draws BOTH arms as children of the branch cluster", () => {
    const def = workflow("x", { payload: Schema.Void, success: Schema.String }, () =>
      branch(
        true,
        step("yes", () => {}),
        step("no", () => {})
      )
    );
    const g = graphOf(def);
    const branchNode = byKind(g, "Branch")[0]!;
    const children = g.nodes.filter((n) => n.parent === branchNode.id);
    expect(children.map((c) => c.label).sort()).toEqual(["no", "yes"]);
    const armEdges = g.edges.filter((e) => e.kind === "branch");
    expect(armEdges.map((e) => e.label).sort()).toEqual(["else", "then"]);
  });

  it("fail() draws ONE terminal Fail node previewing its typed error value (DESIGN.md §5)", () => {
    const def = workflow(
      "x",
      {
        payload: Schema.Void,
        success: Schema.Array(Finding),
        error: Schema.Struct({ _tag: Schema.Literal("FoundIssues"), count: Schema.Number }),
      },
      () =>
        branch(
          true,
          fail({ _tag: "FoundIssues" as const, count: 3 }),
          succeed([] as ReadonlyArray<{ file: string; issue: string }>)
        )
    );
    const g = graphOf(def);
    const failNode = byKind(g, "Fail")[0]!;
    expect(failNode).toBeDefined();
    expect(failNode.label).toBe("fail");
    // the value is a fold-time literal, so the static graph can preview WHAT it fails with
    expect(failNode.meta?.failValue).toEqual({ _tag: "FoundIssues", count: 3 });
    // it sits under the branch cluster as the `then` arm, drawn alongside the success arm
    const branchNode = byKind(g, "Branch")[0]!;
    expect(failNode.parent).toBe(branchNode.id);
  });

  it("fail() at the workflow root renders a Fail node wired between start and end", () => {
    const def = workflow(
      "always-fails",
      { payload: Schema.Void, success: Schema.Never, error: Schema.String },
      () => fail("boom")
    );
    const g = graphOf(def);
    expect(byKind(g, "Fail")).toHaveLength(1);
    // the whole graph stays JSON-serializable with the new node + meta
    expect(() => JSON.stringify(g)).not.toThrow();
  });

  it("dynamic renders ONE opaque node and never calls its builder", () => {
    const poisonedBuild = () => {
      throw new Error("graph interpreter called dynamic build!");
    };
    const def = workflow("x", { payload: Schema.Void, success: Schema.String }, () =>
      dynamic("compute", poisonedBuild as any)
    );
    const g = graphOf(def); // must not throw
    const d = byKind(g, "Dynamic");
    expect(d).toHaveLength(1);
    expect(d[0]!.meta?.opaque).toBe(true);
  });

  it("use() inlines the inner workflow as a Subgraph with path-qualified ids", () => {
    const inner = workflow(
      "scan-pkg",
      { payload: Schema.Struct({ dir: Schema.String }), success: Schema.Array(Finding) },
      ({ dir }) =>
        gen(function* () {
          const files = yield* step<string[]>("list", () => {});
          return yield* forEach(files, (f) =>
            agent("review", { prompt: `r ${f}`, schema: Schema.Array(Finding) })
          );
        })
    );

    const outer = workflow(
      "monorepo-audit",
      { payload: Schema.Struct({ root: Schema.String }), success: Schema.Array(Finding) },
      ({ root }) =>
        gen(function* () {
          const pkgs = yield* step<{ path: string }[]>("list-packages", () => {});
          const perPkg = yield* forEach(pkgs, (p: any) => use(inner, { dir: p.path }));
          return perPkg.flat();
        })
    );

    const g = graphOf(outer);
    const sub = byKind(g, "Subgraph");
    expect(sub).toHaveLength(1);
    expect(sub[0]!.meta?.workflow).toBe("scan-pkg");

    // inner nodes must be path-qualified UNDER the subgraph id, never bare.
    const subId = sub[0]!.id;
    const innerReview = g.nodes.find((n) => n.kind === "Agent")!;
    expect(innerReview.id.startsWith(subId)).toBe(true);

    // ids are globally unique (the path-qualification guarantee)
    expect(new Set(ids(g)).size).toBe(ids(g).length);
  });

  it("rejects a self-recursive use() with a WorkflowCycleError instead of unfolding forever (D8, §2.1)", () => {
    // The fold descends into a used workflow's body, so a workflow that uses itself would
    // recurse without bound (a stack overflow). The cycle guard catches it and reports the chain.
    let selfRef: WorkflowDef<{ n: number }, number, never>;
    const selfish = workflow(
      "selfish",
      { payload: Schema.Struct({ n: Schema.Number }), success: Schema.Number },
      ({ n }) =>
        gen(function* () {
          const base = yield* step<number>("base", () => {});
          yield* use(selfRef, { n: base });
          return base;
        })
    );
    selfRef = selfish as never;

    expect(() => graphOf(selfish)).toThrow(WorkflowCycleError);
    expect(() => graphOf(selfish)).toThrow(/composition cycle: selfish → selfish/);
  });

  it("rejects a mutually-recursive A→B→A use() cycle", () => {
    let aRef: WorkflowDef<{ n: number }, number, never>;
    const b = workflow(
      "B",
      { payload: Schema.Struct({ n: Schema.Number }), success: Schema.Number },
      ({ n }) => use(aRef, { n })
    );
    const a = workflow(
      "A",
      { payload: Schema.Struct({ n: Schema.Number }), success: Schema.Number },
      ({ n }) => use(b, { n })
    );
    aRef = a as never;

    expect(() => graphOf(a)).toThrow(/composition cycle: A → B → A/);
  });

  it("does NOT flag re-using the same workflow on disjoint paths (a diamond is acyclic)", () => {
    // Reuse across siblings is the whole point of composition (§2.1); only a workflow on its
    // OWN ancestry is a cycle. A diamond — outer uses inner twice — must fold to two Subgraphs.
    const inner = workflow(
      "leaf",
      { payload: Schema.Struct({ x: Schema.Number }), success: Schema.Number },
      ({ x }) => step<number>("double", () => {})
    );
    const outer = workflow(
      "diamond",
      { payload: Schema.Struct({ n: Schema.Number }), success: Schema.Array(Schema.Number) },
      ({ n }) =>
        gen(function* () {
          const left = yield* use(inner, { x: n });
          const right = yield* use(inner, { x: n + 1 });
          return [left, right];
        })
    );
    const g = graphOf(outer);
    expect(byKind(g, "Subgraph")).toHaveLength(2);
    // both subgraphs are distinct, path-qualified ids (no collision, no false cycle)
    expect(new Set(ids(g)).size).toBe(ids(g).length);
  });

  it("repeated step names within a scope get #n suffixes (id uniqueness)", () => {
    const def = workflow("x", { payload: Schema.Void, success: Schema.Number }, () =>
      gen(function* () {
        yield* step<number>("work", () => {});
        yield* step<number>("work", () => {});
        return yield* step<number>("work", () => {});
      })
    );
    const g = graphOf(def);
    const workIds = g.nodes.filter((n) => n.label === "work").map((n) => n.id);
    expect(workIds).toHaveLength(3);
    expect(new Set(workIds).size).toBe(3); // all unique
    expect(workIds.some((id) => id.includes("#2"))).toBe(true);
  });

  it("parallel renders a cluster with fanout edges to each child", () => {
    const def = workflow("x", { payload: Schema.Void, success: Schema.Array(Schema.String) }, () =>
      parallel([agent("a", { prompt: "1" }), agent("b", { prompt: "2" })])
    );
    const g = graphOf(def);
    const p = byKind(g, "Parallel")[0]!;
    const fanout = g.edges.filter((e) => e.kind === "fanout" && e.source === p.id);
    expect(fanout).toHaveLength(2);
  });

  it("verify carries refuter count", () => {
    const def = workflow("x", { payload: Schema.Void, success: Schema.Array(Finding) }, () =>
      verify([] as { file: string; issue: string }[], {
        refuters: 2,
        keepIf: (v) => v.confirmed >= 1,
      })
    );
    const g = graphOf(def);
    expect(byKind(g, "Verify")[0]!.meta?.refuters).toBe(2);
  });

  it("verify over a LITERAL item set draws a Refuter template child under the verify cluster (DESIGN.md §2/§6)", () => {
    // verify is a fan-out: when the items are statically known, draw it like a ForEach — the
    // verify node is the cluster, a single Refuter node is the template the engine runs per
    // item × refuter. fanOut = item count; the refuter template's id matches the engine's
    // runtime refuter ids after index-stripping so the live overlay reconciles.
    const def = workflow("x", { payload: Schema.Void, success: Schema.Array(Finding) }, () =>
      verify(
        [
          { file: "a", issue: "i" },
          { file: "b", issue: "j" },
        ],
        {
          refuters: 3,
          keepIf: (v) => v.confirmed >= 1,
        }
      )
    );
    const g = graphOf(def);
    const verifyNode = byKind(g, "Verify")[0]!;
    expect(verifyNode.id).toBe("x/verify");
    expect(verifyNode.meta?.refuters).toBe(3);
    expect(verifyNode.meta?.fanOut).toBe(2); // two items

    const refuters = byKind(g, "Refuter");
    expect(refuters).toHaveLength(1); // drawn ONCE as a template
    const refuter = refuters[0]!;
    expect(refuter.parent).toBe(verifyNode.id);
    // id matches the engine's runtime `x/verify.N/refuter.M` after `templateId` strips the
    // indices (the item index rides on the `verify` segment, mirroring `forEach.N`).
    expect(refuter.id).toBe("x/verify/refuter");
    expect(refuter.meta?.refuters).toBe(3);
    // INVARIANT (the runtime-vs-template-id contract the viewer relies on): the engine's runtime
    // refuter ids, run through the viewer's `templateId` (strip a trailing `.N` per segment),
    // must land EXACTLY on this template node — else refuters stay grey in the overlay. Lock it.
    const templateId = (runtimeId: string) =>
      runtimeId
        .split("/")
        .map((s) => s.replace(/\.\d+$/, ""))
        .join("/");
    expect(templateId("x/verify.0/refuter.0")).toBe(refuter.id);
    expect(templateId("x/verify.1/refuter.2")).toBe(refuter.id);
    // a cluster->template "into" edge connects them
    expect(
      g.edges.some(
        (e) => e.kind === "into" && e.source === verifyNode.id && e.target === refuter.id
      )
    ).toBe(true);
  });

  it("verify over an UPSTREAM (data-dependent) item set stays a single annotated node, no Refuter template", () => {
    // `verify(found.flat(), …)` — the item set is an upstream result, unknown at fold time, so
    // the fan-out width is data-dependent. Mirror ForEach-over-symbolic-items: one annotated
    // Verify node, no fixed-width refuter template (the live overlay still fills in n/total).
    const def = workflow("x", { payload: Schema.Void, success: Schema.Array(Finding) }, () =>
      gen(function* () {
        const found = yield* forEach(
          ["a", "b"],
          (f) => agent("review", { prompt: `review ${f}`, schema: Schema.Array(Finding) }),
          { concurrency: "engine" }
        );
        return yield* verify(found.flat(), { refuters: 2, keepIf: (v) => v.confirmed >= 1 });
      })
    );
    const g = graphOf(def);
    const verifyNode = byKind(g, "Verify")[0]!;
    expect(verifyNode.meta?.refuters).toBe(2);
    expect(verifyNode.meta?.fanOut).toBeUndefined(); // data-dependent width
    expect(byKind(g, "Refuter")).toHaveLength(0); // no template when items aren't literal
  });

  it("the whole graph is JSON-serializable (plain data)", () => {
    const def = workflow("x", { payload: Schema.Void, success: Schema.String }, () =>
      agent("a", { prompt: "p", schema: Schema.Struct({ ok: Schema.Boolean }) })
    );
    const g = graphOf(def);
    expect(() => JSON.stringify(g)).not.toThrow();
    const round = JSON.parse(JSON.stringify(g));
    expect(round.workflow).toBe("x");
  });
});
