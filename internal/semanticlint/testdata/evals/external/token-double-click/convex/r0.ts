import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const focalValidator = v.object({
  chain: v.string(),
  address: v.string(),
  symbol: v.string(),
  decimals: v.number(),
});

const methodologyValidator = v.object({
  hasQueuedCapacity: v.boolean(),
  queueNotes: v.optional(v.string()),
});

const reproducibilityValidator = v.object({
  scripts: v.array(v.object({ path: v.string(), source: v.string() })),
  foundryConfig: v.string(),
  forgeVersion: v.string(),
  solcVersion: v.string(),
  viaIr: v.boolean(),
  forgeStdContentHash: v.string(),
});

// Replace the snapshot for a focal token atomically. The CLI calls this
// once per regeneration with the full stress sweep inline. Any prior row
// for the same focal is deleted first so stale runs don't linger.
export const replaceSnapshots = mutation({
  args: {
    chain: v.string(),
    focalAddress: v.string(),
    focal: focalValidator,
    methodology: methodologyValidator,
    block: v.number(),
    generatedAt: v.number(),
    results: v.array(
      v.object({
        stressBps: v.number(),
        payload: v.any(),
      }),
    ),
    reproducibility: reproducibilityValidator,
  },
  handler: async (ctx, args) => {
    const chain = args.chain.toLowerCase();
    const focalAddress = args.focalAddress.toLowerCase();

    // Sweep-delete prior rows. Bounded take(n) per Convex guidelines;
    // n=64 is far above any plausible re-run accumulation.
    const existing = await ctx.db
      .query("r0Snapshots")
      .withIndex("by_chain_and_focalAddress", (q) =>
        q.eq("chain", chain).eq("focalAddress", focalAddress),
      )
      .take(64);
    for (const row of existing) {
      await ctx.db.delete(row._id);
    }

    await ctx.db.insert("r0Snapshots", {
      chain,
      focalAddress,
      block: args.block,
      generatedAt: args.generatedAt,
      focal: args.focal,
      methodology: args.methodology,
      results: args.results,
      reproducibility: args.reproducibility,
    });

    return { replaced: existing.length, inserted: 1 };
  },
});

// Returns the snapshot for a focal token, or null if none exists.
// Shape matches what the QA route consumes.
export const getSnapshots = query({
  args: { chain: v.string(), focalAddress: v.string() },
  handler: async (ctx, args) => {
    const chain = args.chain.toLowerCase();
    const focalAddress = args.focalAddress.toLowerCase();
    const rows = await ctx.db
      .query("r0Snapshots")
      .withIndex("by_chain_and_focalAddress", (q) =>
        q.eq("chain", chain).eq("focalAddress", focalAddress),
      )
      .take(2);
    if (rows.length === 0) return null;
    // Should be exactly one row (replaceSnapshots sweeps prior).
    const row = rows[0];
    // Sort results by stress for stable rendering.
    const results = [...row.results].sort((a, b) => a.stressBps - b.stressBps);
    return {
      generatedAt: row.generatedAt,
      block: row.block,
      focal: row.focal,
      methodology: row.methodology,
      results: results.map((r) => r.payload),
      reproducibility: row.reproducibility,
    };
  },
});
