import { strictEqual } from "@better-typescript/core/engine/equivalence"

export const isTestRole = strictEqual("test")

export const isAdapterRole = strictEqual("adapter")

export const isRootRole = strictEqual("root")
