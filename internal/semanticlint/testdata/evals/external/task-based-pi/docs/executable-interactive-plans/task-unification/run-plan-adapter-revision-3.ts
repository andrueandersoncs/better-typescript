import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { listScenarios, runCanonicalScenario } from "./simulation.ts";

const root = import.meta.dir;
const evidenceRoot = join(root, "evidence");
const databaseDirectory = join(evidenceRoot, "plan-revision-3-databases", new Date().toISOString().replaceAll(":", "-"));
const outputPath = join(evidenceRoot, "plan-revision-3-adapter-output.json");
await mkdir(databaseDirectory, { recursive: true });
const scenarioList = await listScenarios();
const results = [];
const databaseInstanceIds = new Set<string>();
let mismatch = false;
for (const scenario of scenarioList) {
  const first = await runCanonicalScenario(scenario.id, { databaseDirectory, retainDatabase: true });
  const replay = await runCanonicalScenario(scenario.id, { databaseDirectory, retainDatabase: true });
  const firstHash = createHash("sha256").update(Buffer.from(await Bun.file(first.databaseProof.databasePath).arrayBuffer())).digest("hex");
  const replayHash = createHash("sha256").update(Buffer.from(await Bun.file(replay.databaseProof.databasePath).arrayBuffer())).digest("hex");
  databaseInstanceIds.add(first.databaseProof.databaseInstanceId);
  databaseInstanceIds.add(replay.databaseProof.databaseInstanceId);
  const replayMatch = JSON.stringify({actual:first.actual,externalCalls:first.externalCalls,migrationEvidence:first.migrationEvidence,retainedReferences:first.retainedReferences}) === JSON.stringify({actual:replay.actual,externalCalls:replay.externalCalls,migrationEvidence:replay.migrationEvidence,retainedReferences:replay.retainedReferences});
  const categories = Object.fromEntries(Object.entries(first.comparisons).map(([name, comparison]) => [name, comparison.match]));
  const allCategoriesMatch = first.allCategoriesMatch && Object.values(categories).every(Boolean);
  mismatch ||= !allCategoriesMatch || !replayMatch || first.databaseProof.databaseInstanceId === replay.databaseProof.databaseInstanceId;
  results.push({
    scenarioId: scenario.id,
    canonicalRuntimeSource: first.databaseProof.canonicalRuntimeSource,
    allCategoriesMatch,
    categories,
    firstDatabase: {instanceId:first.databaseProof.databaseInstanceId,path:relative(root,first.databaseProof.databasePath),sha256:firstHash},
    replayDatabase: {instanceId:replay.databaseProof.databaseInstanceId,path:relative(root,replay.databaseProof.databasePath),sha256:replayHash},
    freshIsolatedDatabases: first.databaseProof.freshDatabase && replay.databaseProof.freshDatabase && first.databaseProof.databaseInstanceId !== replay.databaseProof.databaseInstanceId,
    deterministicReplayMatch: replayMatch,
    explicitServices: first.deterministicServices,
    externalCallCount: first.externalCalls.length,
    migrationDecision: first.migrationDecision,
  });
}
const result = {
  schemaVersion: "task-unification-plan-adapter/v3",
  status: mismatch ? "failed" : "passed",
  testedAt: new Date().toISOString(),
  command: "bun run docs/executable-interactive-plans/task-unification/run-plan-adapter-revision-3.ts",
  canonicalScenarioSource: "docs/executable-interactive-plans/task-unification/canonical-scenarios.json",
  scenarioCount: scenarioList.length,
  declaredScenarioIds: scenarioList.map((scenario) => scenario.id),
  observationCategories: ["visibleStates","publicResults","publicErrors","databaseObservations","externalCallsAndOrder","invariants"],
  allNineMatched: scenarioList.length === 9 && !mismatch,
  uniqueDatabaseCount: databaseInstanceIds.size,
  expectedUniqueDatabaseCount: scenarioList.length * 2,
  results,
};
await Bun.write(outputPath, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
if (mismatch || scenarioList.length !== 9 || databaseInstanceIds.size !== scenarioList.length * 2) process.exitCode = 1;
