import { HashSet } from "effect"

export const resultBearingOperations = HashSet.make(
  "build",
  "choose",
  "construct",
  "create",
  "decode",
  "filter",
  "find",
  "get",
  "load",
  "lookup",
  "make",
  "parse",
  "read",
  "resolve",
  "select",
  "transform"
)

export const lookupOperations = HashSet.make(
  "at",
  "find",
  "get",
  "head",
  "last",
  "load",
  "lookup",
  "read"
)

export const conversionOperations = HashSet.make(
  "as",
  "decode",
  "deserialize",
  "encode",
  "format",
  "parse",
  "serialize",
  "stringify",
  "to",
  "transform"
)

export const aggregationOperations = HashSet.make(
  "aggregate",
  "average",
  "count",
  "every",
  "group",
  "index",
  "length",
  "max",
  "min",
  "reduce",
  "size",
  "some",
  "sum",
  "total"
)
