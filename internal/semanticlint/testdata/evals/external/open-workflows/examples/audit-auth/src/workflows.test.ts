import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";
import { FakeInferenceLayer, MemoryEventLogLayer, runOf } from "@open-workflows/engine";
import { graphOf } from "@open-workflows/graph";
import { auditAuth, monorepoAudit, type Finding } from "./workflows.js";

const respond = (req: { prompt: string }): string => {
  if (req.prompt.includes("REFUTE")) return '{"refuted":false}';
  if (req.prompt.includes("admin.ts"))
    return JSON.stringify([
      { file: "admin.ts", line: 12, issue: "missing auth", severity: "high" },
    ]);
  return "[]";
};

const layers = Layer.mergeAll(FakeInferenceLayer(respond, 4), MemoryEventLogLayer);

describe("examples: audit-auth + composed monorepo-audit", () => {
  it("monorepo-audit graph composes audit-auth as nested Subgraphs", () => {
    const g = graphOf(monorepoAudit);
    const subgraphs = g.nodes.filter((n) => n.kind === "Subgraph");
    expect(subgraphs.length).toBeGreaterThan(0);
    expect(subgraphs[0]!.meta?.workflow).toBe("audit-auth");
    // inner agent nodes are path-qualified under a subgraph
    const agents = g.nodes.filter((n) => n.kind === "Agent");
    expect(agents.length).toBeGreaterThan(0);
    expect(agents.every((a) => a.id.includes("audit-auth"))).toBe(true);
  });

  it("audit-auth runs and returns verified findings", async () => {
    const result = (await Effect.runPromise(
      Effect.provide(runOf(auditAuth, { dir: "/svc/routes" }, "t-audit"), layers) as Effect.Effect<
        ReadonlyArray<Finding>
      >
    )) as Finding[];
    // only admin.ts produced a finding; it survives (never refuted)
    expect(result).toHaveLength(1);
    expect(result[0]!.file).toBe("admin.ts");
  });

  it("monorepo-audit runs the composed workflow across packages", async () => {
    const result = (await Effect.runPromise(
      Effect.provide(runOf(monorepoAudit, { root: "/repo" }, "t-mono"), layers) as Effect.Effect<
        ReadonlyArray<Finding>
      >
    )) as Finding[];
    // two packages, each finds admin.ts -> 2 findings total
    expect(result).toHaveLength(2);
    expect(result.every((f) => f.file === "admin.ts")).toBe(true);
  });
});
