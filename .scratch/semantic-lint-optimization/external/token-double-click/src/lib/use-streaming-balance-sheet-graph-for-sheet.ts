/**
 * Streams focal + first sibling balance-sheet graphs for SheetViewPanel self-load
 * (e.g. `/tokens` drawer). Matches token-page traversal depth defaults.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { DirectionalGraphBundle } from "./balance-sheet-recursive-graph-load";
import type { GraphAssembled } from "./balance-sheet-types";
import type { TokenRowMetricsTraversalScope } from "./use-token-row-metrics-on-traversal-complete";
import { mergeDirectionalBundle } from "./balance-sheet-graph-merge";
import { useBalanceGraphController } from "./use-balance-graph-controller";
import { useStreamedDirectionalBalanceSheetGraphs } from "./balance-sheet-recursive-graph-load";

const FRESH_PULSE_MS = 500;

function idsFromDirectionalBundle(bundle: DirectionalGraphBundle): Set<string> {
  const ids = new Set<string>();
  for (const n of bundle.assets.nodes) ids.add(n.nodeId);
  for (const e of bundle.assets.edges) ids.add(e.edgeId);
  for (const n of bundle.liabilities.nodes) ids.add(n.nodeId);
  for (const e of bundle.liabilities.edges) ids.add(e.edgeId);
  return ids;
}

function mergeBundleForFocal(
  bundle: DirectionalGraphBundle | null | undefined,
  focalNodeId: Id<"nodes">,
): GraphAssembled | undefined {
  if (!bundle) return undefined;
  const merged = mergeDirectionalBundle(bundle);
  if (!merged || merged.centerNodeId !== focalNodeId) return undefined;
  return merged;
}

export function useStreamingBalanceSheetGraphForSheet(
  focalNodeId: Id<"nodes"> | undefined,
  options: { adminLive?: boolean } = {},
): {
  graph: GraphAssembled | undefined;
  additionalGraphs: GraphAssembled[] | undefined;
  graphLoading: boolean;
  streaming: boolean;
  freshIds: ReadonlySet<string>;
  metricsScopes: TokenRowMetricsTraversalScope[];
  reset: () => void;
} {
  const [streamGeneration, setStreamGeneration] = useState(0);
  const [freshIds, setFreshIds] = useState<Set<string>>(() => new Set());
  const prevStreamedIdsRef = useRef<Set<string>>(new Set());
  const freshPulseTimersRef = useRef<number[]>([]);

  useEffect(() => {
    setStreamGeneration((g) => g + 1);
    setFreshIds(new Set());
    prevStreamedIdsRef.current = new Set();
    for (const timer of freshPulseTimersRef.current) window.clearTimeout(timer);
    freshPulseTimersRef.current = [];
  }, [focalNodeId]);

  const siblingIds = useQuery(
    api.curatedTokens.getSiblingNodeIds,
    focalNodeId ? { nodeId: focalNodeId } : "skip",
  );
  const firstSiblingId = siblingIds?.[0];
  const siblingQueryReady = siblingIds !== undefined;
  const siblingExpected = siblingQueryReady && siblingIds.length > 0;

  const adminLive = options.adminLive;
  const {
    graphs: streamedDual,
    streaming: primaryStreaming,
    assetsStreaming: primaryAssetsStreaming,
    liabilitiesStreaming: primaryLiabilitiesStreaming,
  } = useBalanceGraphController(focalNodeId, streamGeneration, { adminLive });
  const {
    graphs: siblingDual,
    streaming: siblingStreaming,
    assetsStreaming: siblingAssetsStreaming,
    liabilitiesStreaming: siblingLiabilitiesStreaming,
  } = useStreamedDirectionalBalanceSheetGraphs(firstSiblingId ?? undefined, {
    streamGeneration,
    assetsDepth: "full",
    liabilitiesDepth: 2,
    adminLive,
  });

  const graph = useMemo(
    () => (focalNodeId ? mergeBundleForFocal(streamedDual, focalNodeId) : undefined),
    [focalNodeId, streamedDual],
  );

  const siblingGraph = useMemo(
    () =>
      firstSiblingId && siblingDual ? mergeBundleForFocal(siblingDual, firstSiblingId) : undefined,
    [firstSiblingId, siblingDual],
  );

  const additionalGraphs = siblingGraph ? [siblingGraph] : undefined;

  const awaitingPrimaryBundle = Boolean(focalNodeId) && streamedDual === undefined;
  const awaitingSiblingBundle = siblingExpected && (siblingDual === undefined || siblingStreaming);

  const graphLoading =
    Boolean(focalNodeId) &&
    (!siblingQueryReady || awaitingPrimaryBundle || primaryStreaming || awaitingSiblingBundle);

  const streaming = primaryStreaming || siblingStreaming || awaitingPrimaryBundle;

  // Clear pulse highlights when traversal finishes.
  useEffect(() => {
    if (streaming) return;
    setFreshIds(new Set());
    prevStreamedIdsRef.current = new Set();
    for (const timer of freshPulseTimersRef.current) window.clearTimeout(timer);
    freshPulseTimersRef.current = [];
  }, [streaming]);

  // Pulse only ids added since the previous bundle snapshot (not the initial seed).
  useEffect(() => {
    if (!focalNodeId || !streaming) return;

    const bundles: DirectionalGraphBundle[] = [];
    if (streamedDual) bundles.push(streamedDual);
    if (siblingDual) bundles.push(siblingDual);
    if (bundles.length === 0) return;

    const currentIds = new Set<string>();
    for (const bundle of bundles) {
      for (const id of idsFromDirectionalBundle(bundle)) currentIds.add(id);
    }

    const prev = prevStreamedIdsRef.current;
    if (prev.size === 0) {
      prevStreamedIdsRef.current = currentIds;
      return;
    }

    const newlyAdded: string[] = [];
    for (const id of currentIds) {
      if (!prev.has(id)) newlyAdded.push(id);
    }
    prevStreamedIdsRef.current = currentIds;

    if (newlyAdded.length === 0) return;
    const pulseSet = new Set(newlyAdded);
    setFreshIds((prevFresh) => new Set([...prevFresh, ...pulseSet]));
    const timer = window.setTimeout(() => {
      setFreshIds((prevFresh) => {
        const next = new Set(prevFresh);
        for (const id of pulseSet) next.delete(id);
        return next;
      });
      freshPulseTimersRef.current = freshPulseTimersRef.current.filter((t) => t !== timer);
    }, FRESH_PULSE_MS);
    freshPulseTimersRef.current.push(timer);
  }, [focalNodeId, streamedDual, siblingDual, streaming]);

  const metricsScopes = useMemo(() => {
    const scopes: {
      graphs: GraphAssembled[] | undefined;
      assetsStreaming: boolean;
      liabilitiesStreaming: boolean;
    }[] = [];
    if (focalNodeId) {
      scopes.push({
        graphs: graph ? [graph] : undefined,
        assetsStreaming: primaryAssetsStreaming,
        liabilitiesStreaming: primaryLiabilitiesStreaming,
      });
    }
    if (siblingExpected && firstSiblingId) {
      scopes.push({
        graphs: siblingGraph ? [siblingGraph] : undefined,
        assetsStreaming: siblingAssetsStreaming,
        liabilitiesStreaming: siblingLiabilitiesStreaming,
      });
    }
    return scopes;
  }, [
    focalNodeId,
    graph,
    primaryAssetsStreaming,
    primaryLiabilitiesStreaming,
    siblingExpected,
    firstSiblingId,
    siblingGraph,
    siblingAssetsStreaming,
    siblingLiabilitiesStreaming,
  ]);

  const reset = useCallback(() => {
    setStreamGeneration((g) => g + 1);
    setFreshIds(new Set());
    prevStreamedIdsRef.current = new Set();
    for (const timer of freshPulseTimersRef.current) window.clearTimeout(timer);
    freshPulseTimersRef.current = [];
  }, []);

  return {
    graph,
    additionalGraphs,
    graphLoading,
    streaming,
    freshIds,
    metricsScopes,
    reset,
  };
}
