// ResultShape exists because its fields form one stable data contract used by the linter.
export type ResultShape =
  | "boolean"
  | "callable"
  | "collection"
  | "keyed"
  | "number"
  | "object"
  | "string"
  | "unknown"
  | "void"
