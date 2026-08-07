import { makeRuleFinding } from "./makeRuleFinding.js"

export const unsafeCastFindingFromTypeNode = makeRuleFinding("unsafe-casts")("as any")
