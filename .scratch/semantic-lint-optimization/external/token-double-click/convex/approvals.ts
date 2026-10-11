import { mutation, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/admin";
import { actorLabel, getIdentity } from "./lib/identity";
import { computeNodeSearchText } from "./lib/nodeSearchText";
import { hashData } from "./lib/dataHash";
import { upsertNodeVersion, upsertEdgeVersion } from "./lib/appendVersion";
import { internal } from "./_generated/api";

// ---------------------------------------------------------------------------
// Approval mutations. All operations gate on `requireAdmin(ctx)` and only
// flip `approvalStatus: "draft"` rows. Approving a node version atomically
// patches the parent's `approvedVersionId`. Version-body writes (incl.
// retirement) go through convex/lib/appendVersion.ts.
// ---------------------------------------------------------------------------

function requireReviewNote(notes: string | undefined): string {
  const trimmed = notes?.trim();
  if (!trimmed) {
    throw new Error("A review note is required when rejecting a draft.");
  }
  return trimmed;
}

async function approveNodeDraft(
  ctx: MutationCtx,
  nodeVersion: Doc<"nodeVersions">,
  notes: string | undefined,
): Promise<void> {
  if (nodeVersion.approvalStatus !== "draft") {
    throw new Error(
      `cannot approve nodeVersion ${nodeVersion._id}: status is "${nodeVersion.approvalStatus ?? "(missing)"}", not "draft"`,
    );
  }
  if (nodeVersion.kind === "retirement") {
    throw new Error(
      `cannot approve nodeVersion ${nodeVersion._id} via the standard approval path — retirement versions are approved inline by the retirement mutation, not through the review queue`,
    );
  }
  const node = await ctx.db.get(nodeVersion.nodeId);
  if (!node) throw new Error(`unknown node ${nodeVersion.nodeId}`);

  const identity = await getIdentity(ctx);
  const reviewer = actorLabel(identity);
  const now = new Date().toISOString();

  await ctx.db.patch(nodeVersion._id, {
    approvalStatus: "approved",
    reviewedBy: reviewer,
    reviewedAt: now,
    reviewNotes: notes,
  });
  await ctx.db.patch(node._id, {
    approvedVersionId: nodeVersion._id,
    searchText: computeNodeSearchText(node, nodeVersion),
    updatedAt: now,
  });
}

async function rejectNodeDraft(
  ctx: MutationCtx,
  nodeVersion: Doc<"nodeVersions">,
  notes: string | undefined,
): Promise<void> {
  const reviewNotes = requireReviewNote(notes);
  if (nodeVersion.approvalStatus !== "draft") {
    throw new Error(
      `cannot reject nodeVersion ${nodeVersion._id}: status is "${nodeVersion.approvalStatus ?? "(missing)"}", not "draft"`,
    );
  }
  const identity = await getIdentity(ctx);
  const reviewer = actorLabel(identity);
  const now = new Date().toISOString();
  await ctx.db.patch(nodeVersion._id, {
    approvalStatus: "rejected",
    reviewedBy: reviewer,
    reviewedAt: now,
    reviewNotes,
  });
  const node = await ctx.db.get(nodeVersion.nodeId);
  await ctx.runMutation(internal.researchTasks.insertTaskInternal, {
    title: `Rejected: ${node?.identityKey ?? nodeVersion.nodeId}`,
    description: reviewNotes,
    priority: "high",
    tags: ["rejection"],
    status: "todo",
    createdAt: now,
    createdBy: reviewer,
    sessionIds: nodeVersion.sessionId ? [nodeVersion.sessionId] : [],
    nodeVersionIds: [nodeVersion._id],
  });
}

async function approveEdgeDraft(
  ctx: MutationCtx,
  edgeVersion: Doc<"edgeVersions">,
  notes: string | undefined,
): Promise<void> {
  if (edgeVersion.approvalStatus !== "draft") {
    throw new Error(
      `cannot approve edgeVersion ${edgeVersion._id}: status is "${edgeVersion.approvalStatus ?? "(missing)"}", not "draft"`,
    );
  }
  if (edgeVersion.kind === "retirement") {
    throw new Error(
      `cannot approve edgeVersion ${edgeVersion._id} via the standard approval path — retirement versions are approved inline by the retirement mutation, not through the review queue`,
    );
  }
  const edge = await ctx.db.get(edgeVersion.edgeId);
  if (!edge) throw new Error(`unknown edge ${edgeVersion.edgeId}`);

  const identity = await getIdentity(ctx);
  const reviewer = actorLabel(identity);
  const now = new Date().toISOString();

  await ctx.db.patch(edgeVersion._id, {
    approvalStatus: "approved",
    reviewedBy: reviewer,
    reviewedAt: now,
    reviewNotes: notes,
  });
  await ctx.db.patch(edge._id, {
    approvedVersionId: edgeVersion._id,
    updatedAt: now,
  });
}

async function rejectEdgeDraft(
  ctx: MutationCtx,
  edgeVersion: Doc<"edgeVersions">,
  notes: string | undefined,
): Promise<void> {
  const reviewNotes = requireReviewNote(notes);
  if (edgeVersion.approvalStatus !== "draft") {
    throw new Error(
      `cannot reject edgeVersion ${edgeVersion._id}: status is "${edgeVersion.approvalStatus ?? "(missing)"}", not "draft"`,
    );
  }
  const identity = await getIdentity(ctx);
  const reviewer = actorLabel(identity);
  const now = new Date().toISOString();
  await ctx.db.patch(edgeVersion._id, {
    approvalStatus: "rejected",
    reviewedBy: reviewer,
    reviewedAt: now,
    reviewNotes,
  });
  const edge = await ctx.db.get(edgeVersion.edgeId);
  await ctx.runMutation(internal.researchTasks.insertTaskInternal, {
    title: `Rejected: ${edge?.identityKey ?? edgeVersion.edgeId}`,
    description: reviewNotes,
    priority: "high",
    tags: ["rejection"],
    status: "todo",
    createdAt: now,
    createdBy: reviewer,
    sessionIds: edgeVersion.sessionId ? [edgeVersion.sessionId] : [],
    edgeVersionIds: [edgeVersion._id],
  });
}

// ---------------------------------------------------------------------------
// Per-version mutations
// ---------------------------------------------------------------------------

export const approveNodeVersion = mutation({
  args: {
    nodeVersionId: v.id("nodeVersions"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { nodeVersionId, notes }) => {
    await requireAdmin(ctx);
    const nodeVersion = await ctx.db.get(nodeVersionId);
    if (!nodeVersion) throw new Error(`unknown nodeVersion ${nodeVersionId}`);
    await approveNodeDraft(ctx, nodeVersion, notes);
  },
});

export const approveEdgeVersion = mutation({
  args: {
    edgeVersionId: v.id("edgeVersions"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { edgeVersionId, notes }) => {
    await requireAdmin(ctx);
    const edgeVersion = await ctx.db.get(edgeVersionId);
    if (!edgeVersion) throw new Error(`unknown edgeVersion ${edgeVersionId}`);
    await approveEdgeDraft(ctx, edgeVersion, notes);
  },
});

export const bulkApproveNodeVersions = mutation({
  args: {
    nodeVersionIds: v.array(v.id("nodeVersions")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { nodeVersionIds, notes }) => {
    await requireAdmin(ctx);
    let approved = 0;
    for (const nodeVersionId of nodeVersionIds) {
      const nodeVersion = await ctx.db.get(nodeVersionId);
      if (!nodeVersion) throw new Error(`unknown nodeVersion ${nodeVersionId}`);
      await approveNodeDraft(ctx, nodeVersion, notes);
      approved++;
    }
    return { approved };
  },
});

export const bulkRejectNodeVersions = mutation({
  args: {
    nodeVersionIds: v.array(v.id("nodeVersions")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { nodeVersionIds, notes }) => {
    await requireAdmin(ctx);
    requireReviewNote(notes);
    let rejected = 0;
    for (const nodeVersionId of nodeVersionIds) {
      const nodeVersion = await ctx.db.get(nodeVersionId);
      if (!nodeVersion) throw new Error(`unknown nodeVersion ${nodeVersionId}`);
      await rejectNodeDraft(ctx, nodeVersion, notes);
      rejected++;
    }
    return { rejected };
  },
});

export const bulkApproveEdgeVersions = mutation({
  args: {
    edgeVersionIds: v.array(v.id("edgeVersions")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { edgeVersionIds, notes }) => {
    await requireAdmin(ctx);
    let approved = 0;
    for (const edgeVersionId of edgeVersionIds) {
      const edgeVersion = await ctx.db.get(edgeVersionId);
      if (!edgeVersion) throw new Error(`unknown edgeVersion ${edgeVersionId}`);
      await approveEdgeDraft(ctx, edgeVersion, notes);
      approved++;
    }
    return { approved };
  },
});

export const bulkRejectEdgeVersions = mutation({
  args: {
    edgeVersionIds: v.array(v.id("edgeVersions")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { edgeVersionIds, notes }) => {
    await requireAdmin(ctx);
    requireReviewNote(notes);
    let rejected = 0;
    for (const edgeVersionId of edgeVersionIds) {
      const edgeVersion = await ctx.db.get(edgeVersionId);
      if (!edgeVersion) throw new Error(`unknown edgeVersion ${edgeVersionId}`);
      await rejectEdgeDraft(ctx, edgeVersion, notes);
      rejected++;
    }
    return { rejected };
  },
});

export const revertNodeVersionToDraft = mutation({
  args: {
    nodeVersionId: v.id("nodeVersions"),
  },
  handler: async (ctx, { nodeVersionId }) => {
    await requireAdmin(ctx);
    const nodeVersion = await ctx.db.get(nodeVersionId);
    if (!nodeVersion) throw new Error(`unknown nodeVersion ${nodeVersionId}`);
    if (nodeVersion.approvalStatus !== "approved" && nodeVersion.approvalStatus !== "rejected") {
      throw new Error(
        `cannot revert nodeVersion ${nodeVersionId}: status is "${nodeVersion.approvalStatus ?? "(missing)"}"`,
      );
    }
    await ctx.db.patch(nodeVersionId, {
      approvalStatus: "draft",
      reviewedBy: undefined,
      reviewedAt: undefined,
      reviewNotes: undefined,
    });
    const node = await ctx.db.get(nodeVersion.nodeId);
    if (node?.approvedVersionId === nodeVersionId) {
      await ctx.db.patch(node._id, { approvedVersionId: undefined });
    }
    return { nodeVersionId, draft: true };
  },
});

export const revertEdgeVersionToDraft = mutation({
  args: {
    edgeVersionId: v.id("edgeVersions"),
  },
  handler: async (ctx, { edgeVersionId }) => {
    await requireAdmin(ctx);
    const edgeVersion = await ctx.db.get(edgeVersionId);
    if (!edgeVersion) throw new Error(`unknown edgeVersion ${edgeVersionId}`);
    if (edgeVersion.approvalStatus !== "approved" && edgeVersion.approvalStatus !== "rejected") {
      throw new Error(
        `cannot revert edgeVersion ${edgeVersionId}: status is "${edgeVersion.approvalStatus ?? "(missing)"}"`,
      );
    }
    await ctx.db.patch(edgeVersionId, {
      approvalStatus: "draft",
      reviewedBy: undefined,
      reviewedAt: undefined,
      reviewNotes: undefined,
    });
    const edge = await ctx.db.get(edgeVersion.edgeId);
    if (edge?.approvedVersionId === edgeVersionId) {
      await ctx.db.patch(edge._id, { approvedVersionId: undefined });
    }
    return { edgeVersionId, draft: true };
  },
});

// ---------------------------------------------------------------------------
// Retirement (Phase 2). A retirement is a draft tombstone version that flows
// through the same review pipeline as a data version. Approving it points
// `approvedVersionId` at the retirement, which causes graph reads to drop the
// node/edge from default views; the detail panel renders a tombstone card.
//
// Retirement versions store a placeholder in `data` (parseable JSON, but not
// a graph body) plus `updateReason` / `retiredAt`. `dataHash` covers the
// reason so resubmitting the same retirement with a different reason creates
// a new version.
// ---------------------------------------------------------------------------

const RETIREMENT_DATA_PREFIX = "__retirement__:";

function retirementBody(reason: string): { data: string; dataHash: string } {
  // Parseable JSON so any accidental JSON.parse on `data` doesn't throw, but
  // it deliberately isn't a GraphNodePersisted shape — callers must branch on
  // `kind` first.
  const data = JSON.stringify({ retirement: true, reason });
  const dataHash = hashData(RETIREMENT_DATA_PREFIX + reason);
  return { data, dataHash };
}

/** Find the latest research run that touched the token-side endpoint of a
 * node or edge, used as the attribution `runId` for manual retirements when
 * the caller doesn't supply one. */
async function inferRunIdForRetirement(
  ctx: MutationCtx,
  target: { type: "node"; nodeId: Id<"nodes"> } | { type: "edge"; edgeId: Id<"edges"> },
): Promise<Id<"bgResearchRuns">> {
  // Prefer the latest run that already references this exact node/edge: that
  // ties manual retirements to the run whose findings prompted them.
  if (target.type === "node") {
    const finding = await ctx.db
      .query("runNodeFindings")
      .withIndex("by_node", (q) => q.eq("nodeId", target.nodeId))
      .order("desc")
      .first();
    if (finding) {
      try {
        const run = await ctx.db.get(finding.runId as Id<"bgResearchRuns">);
        if (run) return run._id;
      } catch {
        // Legacy run ids from pre-bgResearchRuns schema are ignored here.
      }
    }
  } else {
    const finding = await ctx.db
      .query("runEdgeFindings")
      .withIndex("by_edge", (q) => q.eq("edgeId", target.edgeId))
      .order("desc")
      .first();
    if (finding) {
      try {
        const run = await ctx.db.get(finding.runId as Id<"bgResearchRuns">);
        if (run) return run._id;
      } catch {
        // Legacy run ids from pre-bgResearchRuns schema are ignored here.
      }
    }
  }
  throw new Error(
    "Cannot infer a research run for this retirement. " +
      "Pass runId explicitly, or run research on the relevant token at least once first.",
  );
}

export const submitRetirement = mutation({
  args: {
    target: v.union(
      v.object({ type: v.literal("node"), nodeId: v.id("nodes") }),
      v.object({ type: v.literal("edge"), edgeId: v.id("edges") }),
    ),
    runId: v.optional(v.id("bgResearchRuns")),
    reason: v.string(),
  },
  handler: async (ctx, { target, runId: explicitRunId, reason }) => {
    if (!reason.trim()) throw new Error("retirement reason is required");
    const runId = explicitRunId ?? (await inferRunIdForRetirement(ctx, target));
    const { data } = retirementBody(reason);

    if (target.type === "node") {
      const node = await ctx.db.get(target.nodeId);
      if (!node) throw new Error(`unknown node ${target.nodeId}`);

      // Inline self-approve retirement via the shared primitive (supersedes
      // drafts, appends an approved retirement tombstone, sets both pointers).
      const { versionId, version } = await upsertNodeVersion(ctx, node, data, {
        retire: true,
        reason,
        runId,
      });
      // Retirement rewrites the node label → refresh the denormalized searchText.
      const retirementVersion = await ctx.db.get(versionId);
      await ctx.db.patch(node._id, {
        searchText: computeNodeSearchText(node, retirementVersion),
      });

      // Cascade: retire all non-retired edges that have this node as an endpoint.
      const edgeReason = `endpoint node ${node._id} was retired; edge retired to match`;
      const { data: edgeData } = retirementBody(edgeReason);
      const [fromEdges, toEdges] = await Promise.all([
        ctx.db.query("edges").withIndex("by_fromNodeId", (q) => q.eq("fromNodeId", node._id)).collect(),
        ctx.db.query("edges").withIndex("by_toNodeId", (q) => q.eq("toNodeId", node._id)).collect(),
      ]);
      const seen = new Set<string>();
      let cascadedEdges = 0;
      for (const edge of [...fromEdges, ...toEdges]) {
        if (seen.has(edge._id)) continue;
        seen.add(edge._id);
        // Skip already-retired edges.
        if (edge.currentVersionId) {
          const current = await ctx.db.get(edge.currentVersionId);
          if (current?.kind === "retirement") continue;
        }
        await upsertEdgeVersion(ctx, edge, edgeData, { retire: true, reason: edgeReason, runId });
        cascadedEdges++;
      }

      return { versionId, version, cascadedEdges };
    }

    const edge = await ctx.db.get(target.edgeId);
    if (!edge) throw new Error(`unknown edge ${target.edgeId}`);
    const { versionId, version } = await upsertEdgeVersion(ctx, edge, data, {
      retire: true,
      reason,
      runId,
    });
    return { versionId, version };
  },
});
