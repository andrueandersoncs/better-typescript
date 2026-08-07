import { Array } from "effect"

export const httpClientRequestNames = Array.make(
  "execute",
  "get",
  "head",
  "post",
  "put",
  "patch",
  "del",
  "options"
)
