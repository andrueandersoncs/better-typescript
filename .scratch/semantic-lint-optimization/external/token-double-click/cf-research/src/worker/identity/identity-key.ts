import { Schema } from "effect";

export const IDENTITY_SEPARATOR = ":";

export const ADDRESS_RE = /^0x[a-f0-9]{40}$/;

export const CHAIN_RE = /^[a-z][a-z0-9_-]*$/;

export type IdentityNodeKind =
  | "manager"
  | "balance"
  | "token"
  | "aggregate"
  | "offchainAsset"
  | "unknown";

const identityPrefixLiteral = Schema.Literal(
  "manager",
  "balance",
  "token",
  "aggregate",
  "offchainAsset",
);
const isKnownIdentityPrefix = Schema.is(identityPrefixLiteral);

export const normalizeAddressForIdentity = (address: string): string =>
  /^0x[a-fA-F0-9]+$/.test(address) ? address.toLowerCase() : address;

export const normalizeIdentityKey = (identityKey: string): string => {
  const stripWhitespace = (segment: string): string => segment.replace(/\s+/g, "");
  const rawParts = identityKey.split(IDENTITY_SEPARATOR).map(stripWhitespace);
  const hasBridgeArity = rawParts.length >= 4;
  const hasManagerPrefix = rawParts[0] === "manager";
  const hasBridgeSegment = rawParts[1] === "bridge";
  const isBridgeQualifiedKey = [hasBridgeArity, hasManagerPrefix, hasBridgeSegment].every(Boolean);
  const parts = isBridgeQualifiedKey ? [rawParts[0], ...rawParts.slice(2)] : rawParts;
  if (parts.length < 3) return parts.join(IDENTITY_SEPARATOR);
  const [prefix, rawChain, address, ...rest] = parts;
  const chain = rawChain.toLowerCase();
  const rejoin = (finalAddress: string): string =>
    [prefix, chain, finalAddress, ...rest].join(IDENTITY_SEPARATOR);
  const isOffchainChain = chain === "offchain";
  const isManagerPrefix = prefix === "manager";
  const isOffchainManagerKey = isManagerPrefix && isOffchainChain;
  const isOffchainAssetKey = prefix === "offchainAsset";
  const lacksAddressShape = !ADDRESS_RE.test(address);
  const isOffchainSlugKey = lacksAddressShape && isOffchainChain;
  const keepsRawAddress = [isOffchainManagerKey, isOffchainAssetKey, isOffchainSlugKey].some(
    Boolean,
  );
  const normalizedAddress = normalizeAddressForIdentity(address);
  return keepsRawAddress ? rejoin(address) : rejoin(normalizedAddress);
};

export const kindFromIdentityPrefix = (identityKey: string): IdentityNodeKind => {
  const prefix = identityKey.split(IDENTITY_SEPARATOR, 1)[0];
  return isKnownIdentityPrefix(prefix) ? prefix : "unknown";
};

const ChainAddressStruct = Schema.Struct({
  chain: Schema.String,
  address: Schema.String,
});

export const identityToChainAddress = (
  identityKey: string,
): typeof ChainAddressStruct.Type | null => {
  const parts = identityKey.split(IDENTITY_SEPARATOR);
  if (parts.length < 3) return null;
  const [, chain, address] = parts;
  const hasChainShape = CHAIN_RE.test(chain);
  const hasAddressShape = ADDRESS_RE.test(address);
  const isChainAddressKey = hasChainShape && hasAddressShape;
  return isChainAddressKey ? ChainAddressStruct.make({ chain, address }) : null;
};
