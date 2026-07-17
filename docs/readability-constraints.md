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

*> what do you mean by "the unit"? be specific. we're talking about *typescript* here, so I could imagine several "units" you might be referring to
   A correct mental model lets a reader predict, from the unit and its immediate contract:

   - its purpose and result,
   - its valid inputs and possible states,
   - its return values, failures, and side effects,
   - the dependencies and state that influence it, and
   - the likely scope and consequences of a change.

*> this is how a human could somewhat-subjectively evaluate it. I want to know how a machine could evaluate this in a deterministic, objective way.
   Evaluate this by stating those predictions before reading unrelated implementation details or
   running the code. A plausible prediction contradicted by runtime behavior, types, or tests is
   evidence that the code miscommunicates its behavior.

2. **Code MUST express domain intent rather than implementation mechanics.**

   Domain intent is the problem-space operation or decision: reserve a seat, approve an invoice, or
   expire a session. Implementation mechanics are the storage and control operations required to
   perform it: assign fields, update counters, index collections, or call persistence APIs. Code
   *> what do you mean "its names"? be specific. same thing with "public operations".
   expresses domain intent when its names and public operations state why those mechanics happen.

   This caller expresses mechanics:

   ```ts
   const seat = show.seats[seatIndex]
   seat.status = "reserved"
   seat.customerId = customerId
   show.availableSeatCount -= 1
   ```

   This caller expresses the domain operation:

   ```ts
   const updatedShow = reserveSeat(show, seatId, customerId)
   ```

   `reserveSeat` still implements the necessary mechanics, but keeps them inside the abstraction
   that owns the reservation invariant. A reader of the caller sees the intended outcome without
   reconstructing it from state updates.

*> what do you mean by "unit"? be specific, we're talking about typescript.
3. **Each unit SHOULD support local reasoning.** Dependencies, inputs, outputs, errors, effects, and
   state changes must be discoverable nearby.

   For example, this function cannot be understood from its signature because exchange rates and
   discounts come from ambient mutable state:

   ```ts
   const priceOrder = (order: Order): Money => {
     const converted = convertMoney(order.total, activeExchangeRate)

     return applyDiscount(converted, currentDiscount)
   }
   ```

   Make those influences explicit:

   ```ts
   const priceOrder = (order: Order, exchangeRate: ExchangeRate, discount: Discount): Money => {
     const converted = convertMoney(order.total, exchangeRate)

     return applyDiscount(converted, discount)
   }
   ```

   Apply these rules:

*> what is a "service locator"? be specific. what does "ambient state" look like? show an example.
   - Dependencies MUST appear in parameters, constructor fields, or module imports; service locators
     and undeclared ambient state are prohibited.
     *> what do you mean by "explicitly named boundary", specifically?
   - Time, randomness, environment variables, feature flags, and the current user MUST be passed or
     captured by an explicitly named boundary.
     *> how do you define "input ownership"? how would a machine check the ownership of an input?
   - A function SHOULD NOT mutate caller-owned inputs. Mutation is acceptable only when ownership
     and the mutating operation are explicit in the API.
     *> how does an operations name expose an I/O effect, specifically? give me an example. 
   - I/O MUST occur behind an operation whose name and contract expose the effect. Predicates,
     getters, and value constructors MUST NOT perform hidden I/O.
     *> what do you mean by "undocumented sentinel"? show me an example
   - Failures and optional results MUST be represented by the declared return, error, or effect
     channel rather than undocumented sentinels or hidden throws.
     *> what do you mean "sufficient for using it" - how could a dependency's public contract be *insufficient*? show me an example.
   - A dependency's public contract MUST be sufficient for using it; callers SHOULD NOT need to read
     its implementation to understand ordinary behavior.

4. **Control and data flow MUST be obvious** without mentally simulating unnecessarily complex
   expressions, branching, or mutation.

   This applies recursively at every semantic boundary:

*> what do you mean "are apparent" - how could they *not* be apparent? what's an example?
   - **Expression:** evaluation order and intermediate meanings are apparent.
   *> what do you mean "can be followed one path at a time"? can you show an example of both cases, one that can and one that can't?
   - **Function or method:** branches, exits, loops, and state transitions can be followed one path
     at a time.
     *> how could state ownership be characterized? how do you make state ownership apparent? can you show me an example?
   - **Module:** initialization, state ownership, and data passed between exports are apparent.
   - **Cross-module or asynchronous workflow:** sequencing, concurrency, cancellation, and failure
     propagation are apparent.

*> we should probably add a clarification here that files are the **only way** to define modules because imports and exports are file-scoped
   In TypeScript, a file containing imports or exports is normally a module, so file and module
   scope often coincide. A directory is not a readability scope by itself; evaluate the contracts
   that cross its module boundaries.

*> the scope of "project convention" is unclear here, what **precisely** is the scope? what specific entities are included in this concept?
   An existing project convention is either explicitly required by project documentation or
   *> what is a "production unit" specifically?
   configuration, or repeated across multiple independent, analogous production units. One
   occurrence is a precedent, not yet a convention. Determine conventions in this order:

   1. documented standards and executable configuration,
   2. the dominant pattern in the nearest analogous subsystem,
   3. a repeated repository-wide pattern, then
   4. the idiom of the language or library in use.

*> this is a good list, you should represent it as a literal list
   Enumerate at least the project's conventions for data representation, error handling, effects and
   asynchrony, dependency provision, naming and API shape, module placement, and testing. An
   explicit standard wins over an incidental pattern. Correctness wins over every convention.

*> what do you mean by "behavior and invariants" specifically? can you show me an example?
   Complexity is unnecessary when behavior and invariants can be preserved under those conventions
   while reducing any of the following:

   - independent values the reader must track simultaneously,
   - simultaneously active branches or cases,
   - prior values that must be reconstructed after mutation,
   - dependencies on evaluation order, or
   - jumps to nonlocal definitions required to understand the current path.

   “Simultaneously active” describes the reader's burden, not runtime concurrency. A branch remains
   *> i want to see a literal code example, not just an informal description
   cognitively active while later behavior still depends on whether it ran. For example, three
   independent conditionals that each mutate a final price create up to eight histories the reader
   must consider at the return statement. Finish cases independently or represent genuine
   combinations as named domain states so earlier branch history need not remain in mind.

*> good list, represent it as a list with specific code examples
   Typical evidence of unnecessary complexity includes nested expressions with separately meaningful
   intermediate results, branches that repeat behavior while changing only data, repeated
   conditions, and mutation whose outcome depends on execution history. Complexity is necessary when
   *> what do you mean by "domain case"? can you show me an example?
   removing it would erase a domain case, invariant, error behavior, or demonstrated performance
   constraint.

5. **Types MUST communicate meaningful invariants and possible states.**

   Types communicate invariants by:

*> excellent, show me a concrete code example too
   - replacing correlated booleans or optional fields with discriminated unions,

*> excellent, show me a concrete code example too
   - giving non-interchangeable domain values distinct types,

     Values are interchangeable when swapping them preserves meaning and validity. Two `UserId`
     values compared by a symmetric `sameUser(left, right)` operation are interchangeable and need
     the same type. A `UserId` and an `InvoiceId` are not interchangeable even if both serialize as
     strings: passing a user identifier to `loadInvoice` is invalid and distinct types should make
     that call fail to compile. Units such as `Meters` and `Milliseconds` are another
     non-interchangeable pair. Introduce role-specific types only when swapping roles violates a
     domain invariant; otherwise precise parameter names are sufficient.

   - expressing real relationships between inputs and outputs, and

     A relationship is real when the implementation derives the output type from typed input or from
     *> what is a "runtime witness" ?
     *> I don't understand this example you gave, can you give a different, more concrete example?
     a runtime witness. For example, `<A>(items: ReadonlyArray<A>) => A | undefined` guarantees that
     its result, when present, has the input element type. `<A>(raw: string) => A` expresses no real
     relationship: the caller can choose any `A`, while the string provides no evidence for that
     choice. Such a parser should return `unknown` and accept a validator or schema that can
     establish `A` at runtime.

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
