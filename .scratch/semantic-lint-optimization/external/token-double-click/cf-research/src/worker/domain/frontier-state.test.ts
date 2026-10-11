import { test, expect, describe } from "bun:test";
import fc from "fast-check";
import {
  createFrontierState,
  enqueueChild,
  recordEdge,
  recordNode,
  dequeue,
  isVisited,
  hasNode,
  makeFrontierEdgeKey,
} from "./frontier-state";
import { rootResearchNodeArb, identityKeyArb } from "./generators";
import type { ResearchNode } from "./research-node";

describe("FrontierState — BFS state management", () => {
  test("createFrontierState initializes with root", () => {
    fc.assert(
      fc.property(rootResearchNodeArb, (root) => {
        const state = createFrontierState(root);
        expect(state.queue.length).toBe(1);
        expect(state.queue[0]).toEqual(root);
        expect(state.visited.has(root.identityKey)).toBe(true);
        expect(state.nodeByKey.has(root.identityKey)).toBe(true);
        expect(state.childrenOf.size).toBe(0);
      }),
    );
  });

  test("dequeue returns and removes front of queue", () => {
    fc.assert(
      fc.property(rootResearchNodeArb, (root) => {
        const state = createFrontierState(root);
        const dequeued = dequeue(state);
        expect(dequeued).toEqual(root);
        expect(state.queue.length).toBe(0);
      }),
    );
  });

  test("dequeue on empty queue returns undefined", () => {
    fc.assert(
      fc.property(rootResearchNodeArb, (root) => {
        const state = createFrontierState(root);
        dequeue(state);
        expect(dequeue(state)).toBeUndefined();
      }),
    );
  });

  test("enqueueChild adds child to queue and visited", () => {
    fc.assert(
      fc.property(rootResearchNodeArb, identityKeyArb, (root, childKey) => {
        fc.pre(childKey !== root.identityKey);
        const state = createFrontierState(root);
        const child: ResearchNode = {
          identityKey: childKey,
          kind: "balance",
          depth: 1,
          parentIdentityKey: root.identityKey,
          discoveringEdgeIdentityKey: "edge:backing:test",
          discoveringEdgeSide: "backing",
          walkDirection: "asset",
        } as ResearchNode;
        enqueueChild(state, root.identityKey, child.identityKey, child, "backing", "asset");
        expect(state.queue.length).toBe(2);
        expect(state.visited.has(child.identityKey)).toBe(true);
      }),
    );
  });

  test("enqueueChild populates childrenOf map", () => {
    fc.assert(
      fc.property(rootResearchNodeArb, identityKeyArb, (root, childKey) => {
        fc.pre(childKey !== root.identityKey);
        const state = createFrontierState(root);
        const child: ResearchNode = {
          identityKey: childKey,
          kind: "balance",
          depth: 1,
          parentIdentityKey: root.identityKey,
          discoveringEdgeIdentityKey: "edge:backing:test",
          discoveringEdgeSide: "backing",
          walkDirection: "asset",
        } as ResearchNode;
        enqueueChild(state, root.identityKey, child.identityKey, child, "backing", "asset");
        const children = state.childrenOf.get(root.identityKey);
        expect(children).toBeDefined();
        expect(children!.length).toBe(1);
        expect(children![0].child).toBe(child.identityKey);
        expect(children![0].side).toBe("backing");
        expect(children![0].discoveryDirection).toBe("asset");
      }),
    );
  });

  test("enqueueChild accumulates multiple children for same parent", () => {
    fc.assert(
      fc.property(
        rootResearchNodeArb,
        fc.array(identityKeyArb, { minLength: 2, maxLength: 5 }),
        (root, childKeys) => {
          const state = createFrontierState(root);
          for (let i = 0; i < childKeys.length; i++) {
            const childKey = childKeys[i];
            if (childKey === root.identityKey) continue;
            const child: ResearchNode = {
              identityKey: childKey,
              kind: "balance",
              depth: 1,
              parentIdentityKey: root.identityKey,
              discoveringEdgeIdentityKey: "edge:backing:test",
              discoveringEdgeSide: i % 2 === 0 ? "backing" : "holding",
              walkDirection: i % 2 === 0 ? "asset" : "liability",
            } as ResearchNode;
            enqueueChild(
              state,
              root.identityKey,
              child.identityKey,
              child,
              i % 2 === 0 ? "backing" : "holding",
              i % 2 === 0 ? "asset" : "liability",
            );
          }
          const children = state.childrenOf.get(root.identityKey);
          expect(children!.length).toBeGreaterThanOrEqual(1);
        },
      ),
    );
  });

  test("recordEdge stores edge by key", () => {
    fc.assert(
      fc.property(
        identityKeyArb,
        identityKeyArb,
        fc.constantFrom("backing" as const, "holding" as const),
        (from, to, side) => {
          const root = {
            identityKey: from,
            kind: "token" as const,
            depth: 0,
            parentIdentityKey: null,
            discoveringEdgeIdentityKey: null,
            discoveringEdgeSide: null,
            walkDirection: "root" as const,
          } as ResearchNode;
          const state = createFrontierState(root);
          recordEdge(state, "a", "b", side);
          expect(state.edgeByKey.size).toBe(1);
          expect(state.edgeByKey.has(makeFrontierEdgeKey("a", "b", side))).toBe(true);
        },
      ),
    );
  });

  test("recordEdge deduplicates by key", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const root = {
          identityKey: "token:ethereum:0xroot",
          kind: "token" as const,
          depth: 0,
          parentIdentityKey: null,
          discoveringEdgeIdentityKey: null,
          discoveringEdgeSide: null,
          walkDirection: "root" as const,
        } as ResearchNode;
        const state = createFrontierState(root);
        recordEdge(state, "a", "b", "backing");
        recordEdge(state, "a", "b", "backing");
        expect(state.edgeByKey.size).toBe(1);
      }),
    );
  });

  test("recordNode adds new node if not present", () => {
    fc.assert(
      fc.property(identityKeyArb, (newKey) => {
        const root = {
          identityKey: "token:ethereum:0xroot",
          kind: "token" as const,
          depth: 0,
          parentIdentityKey: null,
          discoveringEdgeIdentityKey: null,
          discoveringEdgeSide: null,
          walkDirection: "root" as const,
        } as ResearchNode;
        const state = createFrontierState(root);
        recordNode(state, { identityKey: newKey, kind: "token" });
        expect(state.nodeByKey.has(newKey)).toBe(true);
      }),
    );
  });

  test("recordNode does not overwrite existing node", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const root = {
          identityKey: "token:ethereum:0xroot",
          kind: "token" as const,
          depth: 0,
          parentIdentityKey: null,
          discoveringEdgeIdentityKey: null,
          discoveringEdgeSide: null,
          walkDirection: "root" as const,
        } as ResearchNode;
        const state = createFrontierState(root);
        recordNode(state, { identityKey: root.identityKey, kind: "manager" });
        expect(state.nodeByKey.get(root.identityKey)!.kind).toBe("token");
      }),
    );
  });

  test("isVisited returns true for visited nodes", () => {
    fc.assert(
      fc.property(rootResearchNodeArb, identityKeyArb, (root, otherKey) => {
        const state = createFrontierState(root);
        expect(isVisited(state, root.identityKey)).toBe(true);
        if (otherKey !== root.identityKey) {
          expect(isVisited(state, otherKey)).toBe(false);
        }
      }),
    );
  });

  test("hasNode returns true for known nodes", () => {
    fc.assert(
      fc.property(rootResearchNodeArb, identityKeyArb, (root, otherKey) => {
        const state = createFrontierState(root);
        expect(hasNode(state, root.identityKey)).toBe(true);
        if (otherKey !== root.identityKey) {
          expect(hasNode(state, otherKey)).toBe(false);
        }
      }),
    );
  });
});
