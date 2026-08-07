import type { UndefinedIdentifierFact } from "./undefinedIdentifierFact.js"

export const isUndefinedIdentifierFact = (data: unknown): data is UndefinedIdentifierFact =>
  typeof data === "object" &&
  data !== null &&
  "kind" in data &&
  data.kind === "undefined-identifier"
