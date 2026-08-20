import { Array } from "effect"

export const formatClaims = (claims: ReadonlyArray<string>) => Array.join(claims, "/")
