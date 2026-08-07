import type { compileGlobMatcher } from "./compileGlobMatcher.js"

// GlobMatcher is the compiled include/exclude pair because file scope must stay pure.
export type GlobMatcher = ReturnType<typeof compileGlobMatcher>
