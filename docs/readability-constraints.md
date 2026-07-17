# TypeScript readability constraints

Readable TypeScript lets its intended reader form a correct mental model quickly and modify the code
without discovering hidden assumptions. Semantic readability takes priority over structural and
surface readability.

These are principle-level constraints rather than an exhaustive syntax checklist:

Measurement here is comparative and task-specific, not a universal numeric score. Compare
behaviorally equivalent designs for the intended reader and task. Prefer the design that requires
fewer independent facts to be held in mind, permits fewer plausible but incorrect predictions, and
preserves every required invariant and distinction.

1. **Code MUST optimize for a correct mental model**, not merely easy scanning.

   A correct mental model lets a reader predict, from the unit and its immediate contract:

   - its purpose and result,
   - its valid inputs and possible states,
   - its return values, failures, and side effects,
   - the dependencies and state that influence it, and
   - the likely scope and consequences of a change.

   Evaluate this by stating those predictions before reading unrelated implementation details or
   running the code. A plausible prediction contradicted by runtime behavior, types, or tests is
   evidence that the code miscommunicates its behavior.

> what's an example of "domain intent" and code "expressing" it? I'd also like to see an example of
> code "expressing" implementation mechanics to get a feel for the difference between the two

2. **Code MUST express domain intent rather than implementation mechanics.**

> what's a concrete example of this? give me some specific rules that I can apply to typescript code
> to enforce this.

3. **Each unit SHOULD support local reasoning.** Dependencies, inputs, outputs, errors, effects, and
   state changes must be discoverable nearby.

> what is the scope of this statement, do you mean on a function-level? on a module-level?
> file-level? something else?

4. **Control and data flow MUST be obvious** without mentally simulating unnecessarily complex
   expressions, branching, or mutation.

> How do you define or enumerate "existing project conventions"? Complexity is unnecessary when
> behavior and invariants can be preserved using existing project conventions while reducing any of
> the following:

- independent values the reader must track simultaneously,

> what does "simultaneously active" mean?

- simultaneously active branches or cases,
- prior values that must be reconstructed after mutation,
- dependencies on evaluation order, or
- jumps to nonlocal definitions required to understand the current path.

Typical evidence includes nested expressions with separately meaningful intermediate results,
branches that repeat behavior while changing only data, repeated conditions, and mutation whose
outcome depends on execution history. Complexity is necessary when removing it would erase a domain
case, invariant, error behavior, or demonstrated performance constraint.

5. **Types MUST communicate meaningful invariants and possible states.**

   Types communicate invariants by:

   - replacing correlated booleans or optional fields with discriminated unions,

   > what would be an example of an "interchangeable" vs "non-interchangeable" domain value be?
   - giving non-interchangeable domain values distinct types,

   > what would an example of a "real relationship" vs a "non-real relationship" between inputs and
   > outputs be?
   - expressing real relationships between inputs and outputs, and
   - exposing possible failures and effects at boundaries.

   For example, this type permits contradictory states:

   ```ts
   type LoadState = {
     readonly loading: boolean
     readonly user?: User
     readonly error?: LoadError
   }
   ```

   A discriminated union states the invariant that exactly one case applies:

   ```ts
   type LoadState =
     | { readonly _tag: "Loading" }
     | { readonly _tag: "Ready"; readonly user: User }
     | { readonly _tag: "Failed"; readonly error: LoadError }
   ```

6. **Type complexity MUST remain proportional to the errors it prevents.** Type-system cleverness
   that obscures behavior is prohibited.

   A type construct earns its complexity only when all of the following can be shown:

   - a plausible invalid value, call, or transition is accepted by a simpler candidate type,
   - the proposed type rejects that invalid program at the relevant boundary,
   - the resulting compiler diagnostic remains understandable to a caller, and
   - no simpler union, interface, overload, or runtime boundary expresses the invariant as clearly.

   Errors worth preventing include swapped identifiers or units, incompatible state combinations,
   unhandled union cases, illegal state transitions, and lost relationships between generic inputs
   and outputs. Malformed external data is not such an error because static types cannot validate
   runtime input. If no concrete rejected program can be demonstrated, the additional type
   complexity is not justified.

7. **Abstractions MUST represent coherent concepts, preserve relevant distinctions, and hide only
   irrelevant details.**

   Evaluate coherence with three tests:

   - **Purpose:** its purpose can be stated without joining independent responsibilities with “and.”
   - **Invariant:** its members share an invariant, lifecycle, or reason to change.
   - **Use:** callers consume it as one concept rather than repeatedly selecting unrelated subsets.

   A distinction is relevant when it changes permitted operations, results, failures, ordering,
   identity, or an invariant. A detail is irrelevant only when its implementation can vary without
   changing the observable contract or forcing callers to change. If callers must inspect hidden
   state, downcast, or bypass the abstraction to recover a distinction, that distinction was
   relevant and should not have been hidden.

8. **Necessary information MUST be explicit, but redundant ceremony MUST be omitted.**

   Information means the facts needed to predict behavior and make a safe change: domain meaning,
   contracts, invariants, effects, failures, ownership, ordering, dependencies, and non-obvious
   rationale. Information is necessary when omitting it permits a plausible but incorrect prediction
   or change.

   Ceremony is redundant when removing it preserves every semantic distinction, compiler or runtime
   guarantee, navigation aid, and necessary rationale. Typical examples are a local annotation that
   only repeats obvious inference, a pass-through wrapper that enforces no policy or invariant, a
   comment that narrates syntax, or a generic parameter that expresses no relationship. Boundary
   annotations, domain names, and wrappers that validate, normalize, authorize, or otherwise enforce
   policy are not redundant.

9. **Similar concepts MUST use consistent names, representations, error models, and structural
   patterns.**

10. **Related information SHOULD remain colocated** unless the separated pieces form independently
    understandable concepts.

11. **Comments SHOULD explain rationale, constraints, and non-obvious decisions.** They SHOULD NOT
    merely narrate the code.

12. **Side effects, asynchronous boundaries, state transitions, and failure behavior MUST be visible
    and unsurprising.**

13. **Code SHOULD make the safe location and consequences of a future change apparent.**

14. **Readability MUST NOT be inferred solely from brevity, explicitness, abstraction count, type
    sophistication, DRYness, or formatting.**

15. **When principles conflict, prefer the design that minimizes the work required for the intended
    reader to form an accurate mental model.**

16. **Readability MUST be evaluated relative to an intended reader and task.** Code cannot be called
    readable without identifying who must understand or change it.

17. **Names, types, comments, and APIs MUST truthfully describe runtime behavior.** Misleading
    simplicity is worse than visible complexity.

18. **Each function, class, and module MUST have a coherent purpose that can be stated concisely.**
    Cohesion matters more than arbitrary size limits.

19. **Each domain concept SHOULD have one canonical representation.** Alternate representations must
    be normalized at explicit boundaries.

20. **Compile-time types MUST NOT imply guarantees absent at runtime.** Untrusted data must be
    validated where it enters the trusted system.

21. **Required sequencing and temporal dependencies MUST be explicit, colocated, or encoded into the
    API.**

22. **Dependency direction MUST be understandable and free from avoidable cycles or action at a
    distance.**

23. **Public contracts SHOULD present essential information before implementation detail.** Readers
    should be able to progressively disclose complexity.

24. **Code MUST be navigable.** Concepts should have stable, searchable names and live in
    predictable locations.

25. **Surface syntax MUST remain mechanically parseable by a human.** Formatting should be
    consistent, and expressions must not compress multiple conceptual steps into one syntactic unit.

Together, these constraints are comprehensive at the principle level. A rigid syntax checklist would
be counterproductive: readability remains contextual, and rules must serve the reader rather than
encourage code optimized for a rubric.
