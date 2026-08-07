import { Predicate } from "effect"

const hasNonWhitespace = (pattern: string) => pattern.trim().length > 0

// One glob predicate is canonical here because config loading and defineConfig must not drift.
export const isFileGlob = Predicate.and(Predicate.isString, hasNonWhitespace)
