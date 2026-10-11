import type { PositionOrManagerNodePersisted } from "@herd-labs/schemas";
import { Effect } from "effect";
import { isNil } from "ramda";

import { nodeIdentityFromGraphNode } from "../../../../nodeIdentityFromGraphNode.ts";
import type { ChildResolution, ParentResolution, ProtocolParentRow } from "../../../types.ts";
import { identityChainAndAddress } from "../../identityChainAndAddress.ts";
import { resolveVaultShareParent } from "../vault-share/resolve.ts";

export type YearnTarget = { readonly blockchain: string; readonly contractAddress: string };
export type YearnResolverPorts = {
  readonly supportsChain: (blockchain: string) => boolean;
  readonly morphoCredit: (blockchain: string) => string | null;
  readonly readAddress: (input: YearnTarget & { readonly functionName: string }) => Effect.Effect<string | null>;
  readonly findImplementation: (input: YearnTarget) => Effect.Effect<ProtocolParentRow | null>;
  readonly refreshImplementations: (blockchain: string) => Effect.Effect<void>;
  readonly delegatesToImplementation: (
    input: YearnTarget & { readonly implementation: string }
  ) => Effect.Effect<boolean>;
};

export const resolveYearnParent = ({
  target,
  ports,
}: {
  readonly target: YearnTarget;
  readonly ports: YearnResolverPorts;
}): Effect.Effect<ParentResolution | null> =>
  Effect.gen(function* () {
    if (!ports.supportsChain(target.blockchain)) {
      return null;
    }
    const implementation = yield* ports.readAddress({ ...target, functionName: "tokenizedStrategyAddress" });
    if (isNil(implementation)) {
      return null;
    }
    const implementationTarget = { blockchain: target.blockchain, contractAddress: implementation };
    const stored = yield* ports.findImplementation(implementationTarget);
    const parent = isNil(stored)
      ? yield* ports
          .refreshImplementations(target.blockchain)
          .pipe(Effect.andThen(ports.findImplementation(implementationTarget)))
      : stored;
    if (isNil(parent)) {
      return null;
    }
    const delegates = yield* ports.delegatesToImplementation({ ...target, implementation });
    return delegates ? { kind: "parent", parent } : null;
  });

export const resolveYearnChild = ({
  node,
  ports,
}: {
  readonly node: PositionOrManagerNodePersisted;
  readonly ports: YearnResolverPorts;
}): Effect.Effect<ChildResolution> =>
  Effect.gen(function* () {
    const generic = resolveVaultShareParent({
      node,
      managerChild: "yearn-tokenized-strategy-manager",
      positionChild: "yearn-tokenized-strategy-share",
      protocolLabel: "yearn-tokenized-strategy",
    });
    if (generic.kind !== "child") {
      return generic;
    }
    const target = identityChainAndAddress(nodeIdentityFromGraphNode(node));
    if (isNil(target)) {
      return generic;
    }
    const core = ports.morphoCredit(target.blockchain);
    if (isNil(core)) {
      return generic;
    }
    const claimedCore = yield* ports.readAddress({ ...target, functionName: "morphoCredit" });
    if (claimedCore !== core) {
      return generic;
    }
    const usd3 = yield* ports.readAddress({
      blockchain: target.blockchain,
      contractAddress: core,
      functionName: "usd3",
    });
    const unknown: ChildResolution = {
      kind: "unknown-protocol-child",
      reason: "Strategy claims the recognized MorphoCredit but its registered USD3/sUSD3 relationships do not match",
    };
    if (isNil(usd3)) {
      return unknown;
    }
    const usd3Target = { blockchain: target.blockchain, contractAddress: usd3 };
    const usd3Core = yield* ports.readAddress({ ...usd3Target, functionName: "morphoCredit" });
    if (usd3Core !== core) {
      return unknown;
    }
    if (target.contractAddress.toLowerCase() === usd3) {
      return { kind: "child", child: node.type === "manager" ? "yearn-3jane-usd3-manager" : "yearn-3jane-usd3-share" };
    }
    const susd3 = yield* ports.readAddress({ ...usd3Target, functionName: "sUSD3" });
    if (susd3 !== target.contractAddress.toLowerCase()) {
      return unknown;
    }
    const asset = yield* ports.readAddress({ ...target, functionName: "asset" });
    return asset === usd3
      ? { kind: "child", child: node.type === "manager" ? "yearn-3jane-susd3-manager" : "yearn-3jane-susd3-share" }
      : unknown;
  });
