# Swift context

Apply this guidance as context to the selected software workflow when it writes, reviews, diagnoses, optimizes, or migrates Swift code.

## Method

1. Detect the supported Swift and platform toolchains. Verify current documentation before using version-sensitive language features.
2. Model data with structs and enums; use reference identity only when the domain needs shared identity or lifecycle.
3. Make invalid states difficult to represent and recoverable failures explicit.
4. Start synchronous and isolated to the main actor where UI ownership requires it. Add `async` for real latency, structured child tasks for bounded concurrency, and actors only for measured shared mutable state.
5. Avoid sharing non-Sendable state before reaching for unsafe annotations. Preserve cancellation, task ownership, and actor isolation across boundaries.
6. Derive protocols and generics from repeated concrete needs. Prefer concrete return types and `some` over existential `any` when callers do not need type erasure.
7. Design APIs with clear labels, ownership, availability, and error semantics. Migrate Objective-C or older Swift incrementally behind tested boundaries.
8. Profile algorithms, allocation/copy behavior, ARC traffic, hangs, launch, memory, and energy before optimizing.
9. Use Swift Testing by default where the project supports it. Test public behavior and concurrency outcomes deterministically.
10. Verify compiler diagnostics, focused tests, release build behavior, and representative device performance.

## Evidence

The code uses the simplest safe language feature that expresses the requirement, concurrency has an owner and measured purpose, and release behavior is proven on the supported toolchain.