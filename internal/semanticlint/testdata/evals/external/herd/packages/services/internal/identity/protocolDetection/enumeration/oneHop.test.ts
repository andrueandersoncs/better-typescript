import { describe, expect, test } from "bun:test";

import { assertInstanceOf } from "@herd-labs/effect-bun-test/utils";
import type { GraphNodePayload } from "@herd-labs/schemas/balance-graph";
import { Effect, Ref } from "effect";

import {
  BalanceGraphEnumerationInputError,
  BalanceGraphEnumerationRuntimeError,
} from "../../../balanceGraph/errors.ts";
import { balanceGraphChildNode } from "./childNodes/catalog.ts";
import {
  enumerateManagerBacking,
  enumerateManagerHolding,
  enumeratePositionBackedBy,
  enumeratePositionHeldBy,
} from "./oneHop.ts";
import type { BalanceGraphOneHopEnumerationDependencies } from "./types.ts";

const TOKEN = "0x0000000000000000000000000000000000000001";
const MANAGER = "0x0000000000000000000000000000000000000002";
const OTHER_MANAGER = "0x0000000000000000000000000000000000000003";

const token: Extract<GraphNodePayload, { readonly type: "token" }> = {
  description: "Test token.",
  token: { address: TOKEN, chain: "ethereum", decimals: 18, name: "Test", symbol: "TEST" },
  type: "token",
};

const manager: Extract<GraphNodePayload, { readonly type: "manager" }> = {
  description: "Test manager.",
  entity: { address: MANAGER, chain: "ethereum", name: "Test manager", shortName: "Manager", type: "contract" },
  type: "manager",
};

const adapterClaim: Extract<GraphNodePayload, { readonly type: "balance" }> = {
  address: MANAGER,
  chain: "ethereum",
  decimals: 6,
  description: "Adapter accounting claim.",
  id: "adapter-realassets",
  name: "Adapter realAssets",
  shortName: "Adapter claim",
  type: "balance",
  unitNoun: "USDC",
};

const resolved = <Child extends Parameters<typeof balanceGraphChildNode>[0]["child"]>({ child }: { child: Child }) => {
  const definition = balanceGraphChildNode({ child });
  if (definition === undefined) {
    throw new Error(`Missing child node definition for ${child}`);
  }
  return { child, definition };
};

const noOpDependencies = (): BalanceGraphOneHopEnumerationDependencies => ({
  enumerateMappedChildEdges: () => Effect.succeed({ instances: [] }),
});

const holdingEdge = {
  fromNodeId: "manager:ethereum:0x0000000000000000000000000000000000000002",
  notes: "The manager holds TEST.",
  queries: {},
  researchTasks: [],
  side: "holding" as const,
  toNodeId: "token:ethereum:0x0000000000000000000000000000000000000001",
};

const backingEdge = {
  ...holdingEdge,
  fromNodeId: holdingEdge.toNodeId,
  side: "backing" as const,
  toNodeId: holdingEdge.fromNodeId,
};

describe("directional one-hop enumeration", () => {
  test("defers a position heldBy query to the workflow", async () => {
    const result = await Effect.runPromise(
      enumeratePositionHeldBy({
        dependencies: noOpDependencies(),
        node: token,
        resolved: resolved({ child: "aave-v3-atoken" }),
      })
    );

    expect(result).toEqual({
      instances: [],
      relation: "heldBy",
      requiresPosition: false,
      performExtraScans: true,
    });
  });

  test("maps an adapter realAssets claim heldBy relation to the Vault V2 holding edge", async () => {
    const childEdgeIds = await Effect.runPromise(Ref.make<readonly string[]>([]));
    const result = await Effect.runPromise(
      enumeratePositionHeldBy({
        dependencies: {
          enumerateMappedChildEdges: ({ childEdgeIds: requestedChildEdgeIds }) =>
            Ref.update(childEdgeIds, () => requestedChildEdgeIds).pipe(Effect.as({ instances: [] })),
        },
        node: adapterClaim,
        resolved: resolved({ child: "morpho-v1-markets-adapter-realassets" }),
      })
    );

    expect(result.relation).toBe("heldBy");
    expect(await Effect.runPromise(Ref.get(childEdgeIds))).toEqual(["morpho-v1-markets-adapter-claim-holding"]);
  });

  test("enumerates position backing without an incoming hop", async () => {
    const requests = await Effect.runPromise(Ref.make<readonly string[]>([]));
    const result = await Effect.runPromise(
      enumeratePositionBackedBy({
        dependencies: {
          enumerateMappedChildEdges: ({ relation }) =>
            Ref.update(requests, (values) => [...values, relation]).pipe(Effect.as({ instances: [] })),
        },
        node: token,
        resolved: resolved({ child: "aave-v3-atoken" }),
      })
    );

    expect(result.relation).toBe("backedBy");
    expect(await Effect.runPromise(Ref.get(requests))).toEqual(["backedBy"]);
  });

  test("enumerates manager backing only from an incoming holding edge", async () => {
    const requests = await Effect.runPromise(Ref.make<readonly string[]>([]));
    const result = await Effect.runPromise(
      enumerateManagerBacking({
        dependencies: {
          enumerateMappedChildEdges: ({ relation }) =>
            Ref.update(requests, (values) => [...values, relation]).pipe(Effect.as({ instances: [] })),
        },
        edgeIn: holdingEdge,
        node: manager,
        positionIn: { node: token, nodeId: holdingEdge.toNodeId },
        resolved: resolved({ child: "aave-v3-pool-manager" }),
      })
    );

    expect(result.relation).toBe("backing");
    expect(await Effect.runPromise(Ref.get(requests))).toEqual(["backing"]);
  });

  test("rejects a manager backing request with an incoming backing edge", async () => {
    const error = await Effect.runPromise(
      Effect.flip(
        enumerateManagerBacking({
          dependencies: noOpDependencies(),
          edgeIn: { ...holdingEdge, side: "backing" },
          node: manager,
          positionIn: { node: token, nodeId: holdingEdge.toNodeId },
          resolved: resolved({ child: "aave-v3-pool-manager" }),
        })
      )
    );

    assertInstanceOf(error, BalanceGraphEnumerationInputError);
    expect(error.kind).toBe("enumeration-input-manager-hop-invalid");
  });

  test("rejects a manager hop that is attached to another manager", async () => {
    const error = await Effect.runPromise(
      Effect.flip(
        enumerateManagerBacking({
          dependencies: noOpDependencies(),
          edgeIn: { ...holdingEdge, fromNodeId: `manager:ethereum:${OTHER_MANAGER}` },
          node: manager,
          positionIn: { node: token, nodeId: holdingEdge.toNodeId },
          resolved: resolved({ child: "aave-v3-pool-manager" }),
        })
      )
    );

    assertInstanceOf(error, BalanceGraphEnumerationInputError);
    expect(error.kind).toBe("enumeration-input-manager-hop-invalid");
  });

  test("rejects a manager request with no incoming hop instead of reading undefined context", async () => {
    const error = await Effect.runPromise(
      Effect.flip(
        enumerateManagerBacking({
          dependencies: noOpDependencies(),
          edgeIn: undefined,
          node: manager,
          positionIn: undefined,
          resolved: resolved({ child: "aave-v3-pool-manager" }),
        } as never)
      )
    );

    assertInstanceOf(error, BalanceGraphEnumerationInputError);
    expect(error.kind).toBe("enumeration-input-manager-hop-invalid");
  });

  test("rejects mapped output that is not declared for the invoked direction", async () => {
    const error = await Effect.runPromise(
      Effect.flip(
        enumeratePositionBackedBy({
          dependencies: {
            enumerateMappedChildEdges: () =>
              Effect.succeed({ instances: [{ childEdgeId: "curve-stableswap-ng-pool-reserve-holding" }] as never }),
          },
          node: token,
          resolved: resolved({ child: "aave-v3-atoken" }),
        })
      )
    );

    assertInstanceOf(error, BalanceGraphEnumerationRuntimeError);
    expect(error.kind).toBe("enumeration-mapping-inapplicable");
  });

  test("rejects a declared mapped edge that is detached from the enumerated position", async () => {
    const error = await Effect.runPromise(
      Effect.flip(
        enumeratePositionBackedBy({
          dependencies: {
            enumerateMappedChildEdges: () =>
              Effect.succeed({
                instances: [
                  {
                    childEdgeId: "aave-v3-atoken-backing",
                    fromNodeId: "token:ethereum:0x0000000000000000000000000000000000000009",
                    positionIn: { node: token, nodeId: holdingEdge.toNodeId },
                    toNodeId: holdingEdge.fromNodeId,
                  },
                ] as never,
              }),
          },
          node: token,
          resolved: resolved({ child: "aave-v3-atoken" }),
        })
      )
    );

    assertInstanceOf(error, BalanceGraphEnumerationRuntimeError);
    expect(error.kind).toBe("enumeration-mapping-inapplicable");
  });

  test("enumerates manager holding only from an incoming backing edge", async () => {
    const requests = await Effect.runPromise(Ref.make<readonly string[]>([]));
    const result = await Effect.runPromise(
      enumerateManagerHolding({
        dependencies: {
          enumerateMappedChildEdges: ({ relation }) =>
            Ref.update(requests, (values) => [...values, relation]).pipe(Effect.as({ instances: [] })),
        },
        edgeIn: backingEdge,
        node: manager,
        positionIn: { node: token, nodeId: backingEdge.fromNodeId },
        resolved: resolved({ child: "aave-v3-pool-manager" }),
      })
    );

    expect(result.relation).toBe("holding");
    expect(await Effect.runPromise(Ref.get(requests))).toEqual(["holding"]);
  });
});
