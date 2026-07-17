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

   The reviewed TypeScript entity MUST be named. This document recognizes these entity kinds:

   - an expression or statement block,
   - a function-like declaration: function, method, constructor, getter, setter, arrow function, or
     function expression,
   - a type declaration: type alias, interface, class, or enum,
   - a source-file module, and
   - an exported API or workflow rooted at an exported callable and its reachable dependencies.

   The immediate contract depends on the entity. For a function-like declaration it is the
   parameters, type parameters, return type, and declared error or effect channel. For a class it is
   the constructor and public members. For a source-file module it is the imports, exports, and
   top-level effects. For an expression it is the contextual type and enclosing lexical block.

   A correct model lets a reader predict:

   - the entity's purpose and result,
   - its valid inputs and possible states,
   - its return values, failures, and side effects,
   - the dependencies and state that influence it, and
   - the likely scope and consequences of a change.

   A machine cannot observe a reader's mental model or infer domain meaning from TypeScript syntax
   alone. This constraint is therefore an umbrella goal, not a directly decidable binary rule. A
   deterministic checker MUST evaluate a named proxy and report the exact evidence rather than
   reporting that code is “unreadable.” Every machine check MUST declare:

   - the entity kind and program scope it examines,
   - the AST, symbol, type, control-flow, or reference-graph predicate it evaluates,
   - every configured inventory and numeric threshold it uses, and
   - the source locations that satisfy that predicate.

   Deterministic proxies include the number of reads from mutable nonlocal symbols, writes rooted at
   function parameters, branch and nesting counts, nested call depth, references to configured I/O
   APIs, call-graph fan-out, and dependencies crossing source-file boundaries. The same TypeScript
   `Program`, source text, and configuration MUST produce the same evidence in the same order. These
   measurements identify specific reasoning costs; none independently proves or disproves
   readability.

2. **Code MUST express domain intent rather than implementation mechanics.**

   Domain intent is the problem-space operation or decision: reserve a seat, approve an invoice, or
   expire a session. Implementation mechanics are the storage and control operations required to
   perform it: assign fields, update counters, index collections, or call persistence APIs.

   “Names” means the identifiers visible at the relevant boundary: exported declaration names,
   invoked function or method names, parameter names, public class members, type names, union tags,
   and named domain constants. “Public operations” means exported functions and callable values,
   exported object methods, and the public constructors and methods of exported classes. Code
   expresses domain intent when these identifiers name why an operation occurs and the domain result
   it produces. A machine can enumerate these identifiers, but judging whether they use the correct
   domain vocabulary requires a project-supplied glossary or another explicit configuration.

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

3. **Each function-like declaration, class, and source-file module SHOULD support local reasoning.**
   A function is evaluated with its signature and lexical body, a class with its constructor and
   members, and a module with its imports, top-level declarations, and exports. Ordinary use SHOULD
   NOT require unrelated source files beyond the declared contracts of referenced symbols.

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

   A **service locator** is a registry queried inside an operation to obtain a dependency that the
   operation's signature does not name:

   ```ts
   declare const services: {
     readonly get: (name: "database") => Database
   }

   const saveOrder = (order: Order): Promise<void> => services.get("database").save(order)
   ```

   `saveOrder` appears to depend only on `order`, but also depends on the global `services` registry
   and whichever database it returns. **Ambient state** is any value whose current contents can
   affect an operation without arriving through that operation's explicit inputs. Mutable top-level
   variables, `globalThis`, `process.env`, `Date.now()`, `Math.random()`, request-context singletons,
   and imported mutable singleton objects are common examples.

   An **explicitly named boundary** is the function or source-file module where an ambient or
   nondeterministic source is read once and converted into a typed input. Its identifier names the
   operation and source, such as `loadBillingConfigFromEnvironment`, `makeOrderPricer`, or
   `handleAuthenticatedRequest`, rather than hiding the capture behind a generic `context` or
   `services` object.

   ```ts
   const loadPricingInputsFromEnvironment = (
     environment: NodeJS.ProcessEnv
   ): PricingInputs => ({
     currency: parseCurrency(environment.BILLING_CURRENCY),
     discount: parseDiscount(environment.CURRENT_DISCOUNT)
   })
   ```

   TypeScript has no native ownership type system, so a machine cannot prove ownership generally. A
   deterministic mutation check MUST use a stated conservative model:

   - every parameter and every value reached through a parameter is caller-owned,
   - every imported or global value is nonlocal-owned,
   - an object, array, map, set, or class instance created inside the function is locally owned until
     it is returned, stored in nonlocal state, or passed to an unknown callable, and
   - assignments, updates, `delete`, and configured mutating methods on caller-owned roots are
     reported.

   For example, `users.sort(compareUsers)` mutates a parameter and must be reported, while
   `users.toSorted(compareUsers)` returns a new array. A project that permits ownership transfer MUST
   encode it with a configured annotation or named ownership type; a checker MUST NOT infer transfer
   from an informal name.

   I/O is exposed when both the operation name and contract identify it. Use a configured I/O verb
   such as `read`, `load`, `fetch`, `write`, `save`, `send`, or `publish`, name the resource or
   boundary, and return the project's asynchronous or effect type:

   ```ts
   const isUserActive = (id: UserId): boolean => database.readStatus(id)

   const loadUserStatusFromDatabase = (id: UserId): Promise<UserStatus> =>
     database.readStatus(id)
   ```

   The first signature presents a pure predicate while performing database I/O. The second names
   the read, its resource, and its asynchronous contract. A machine can enforce this only against a
   configured inventory of I/O symbols, accepted verbs, and effect-bearing return types.

   An **undocumented sentinel** is a primitive value whose ordinary type does not distinguish it
   from valid results but whose value secretly means “missing” or “failed”:

   ```ts
   const findUserIndex = (users: ReadonlyArray<User>, id: UserId): number =>
     users.findIndex((user) => user.id === id)
   ```

   Here `-1` is hidden inside the broad `number` return type. Return `number | undefined`, `Option`,
   or a discriminated result instead so absence is represented by the contract.

   A public contract is insufficient when ordinary correct use requires facts it does not encode.
   This client, for example, throws unless `connect` was called first, but `request` is callable in
   every visible state:

   ```ts
   interface Client {
     readonly connect: () => Promise<void>
     readonly request: (url: URL) => Promise<Response>
   }
   ```

   Return a `ConnectedClient` from `connect` and expose `request` only on that type. Then the required
   sequence is visible and invalid use is rejected before a caller must inspect the implementation.

4. **Control and data flow MUST be obvious** without mentally simulating unnecessarily complex
   expressions, branching, or mutation.

   This applies recursively at every semantic boundary.

   - **Expression:** “apparent” means evaluation order and each intermediate value's domain meaning
     are named at the point of use. JavaScript defines the order of this expression, but the reader
     must evaluate it inside-out and invent names for three intermediate results:

     ```ts
     const receipt = formatReceipt(applyTax(convertCurrency(order.total, rate), tax))
     ```

     Expose the sequence:

     ```ts
     const convertedTotal = convertCurrency(order.total, rate)
     const taxedTotal = applyTax(convertedTotal, tax)
     const receipt = formatReceipt(taxedTotal)
     ```

   - **Function or method:** “one path at a time” means a reader can finish the consequences of one
     case before evaluating the next. In this version, later assignments can override earlier ones,
     so all three conditions remain relevant until the return:

     ```ts
     let decision: AccessDecision = "denied"

     if (user.suspended) decision = "denied"
     if (user.role === "admin") decision = "allowed"
     if (user.id === document.ownerId) decision = "allowed"

     return decision
     ```

     Encode the precedence with completed paths:

     ```ts
     if (user.suspended) return "denied"
     if (user.role === "admin") return "allowed"

     return user.id === document.ownerId ? "allowed" : "denied"
     ```

   - **Module:** state ownership is apparent when symbol resolution identifies exactly which module
     or instance may write the state. An exported mutable object has shared ownership because every
     importer can mutate it:

     ```ts
     export const userCache = new Map<UserId, User>()
     ```

     Keep the state unexported and export operations instead:

     ```ts
     const userCache = new Map<UserId, User>()

     export const findCachedUser = (id: UserId): User | undefined => userCache.get(id)
     export const cacheUser = (user: User): void => {
       userCache.set(user.id, user)
     }
     ```

     A deterministic ownership analysis can classify non-exported top-level state as module-owned,
     `#private` fields as instance-owned, parameter-rooted state as caller-owned, and imported state
     as owned by another module. Exported mutable values and writes outside the classified owner are
     evidence of ambiguous ownership.

   - **Cross-module or asynchronous workflow:** the entry point and its reachable calls MUST expose
     sequencing, concurrency, cancellation, and failure propagation through named operations and
     declared contracts.

   In this document, **module** means an external ECMAScript/TypeScript module. Its ownership boundary
   is exactly one source file because top-level imports and exports are file-scoped. A file is a
   module when it has a top-level import or export or when compiler configuration treats it as one.
   TypeScript namespaces and ambient `declare module` blocks are declarations inside source files,
   not additional runtime ownership boundaries. A directory is not a module. This matches the
   [TypeScript module definition](https://www.typescriptlang.org/docs/handbook/2/modules.html).

   A project-convention claim MUST identify four dimensions:

   - **Scope:** repository, workspace, package, `tsconfig` program, or named source subtree.
   - **Entity kind:** expression, function-like declaration, type declaration, class, source-file
     module, exported API, or test.
   - **Concern:** the design choice being compared, such as error representation or dependency
     provision.
   - **Pattern:** the exact syntactic or typed shape claimed to be conventional.

   A **production unit** is a non-test, non-fixture, non-generated entity of one of those kinds that
   participates in the application or published library. Two units are analogous only when they
   have the same entity kind and architectural role; an HTTP adapter and a pure domain function are
   not analogous merely because both are functions.

   A convention is established either by machine-readable project configuration or by a repeated
   pattern whose population, predicate, minimum occurrence count, and minimum share are configured.
   Without those thresholds, a tool may report a precedent but MUST NOT deterministically declare a
   convention. Determine applicable conventions in this order:

   1. executable project configuration,
   2. documented standards that identify the same scope and entity kind,
   3. the configured dominant pattern among analogous production units, then
   4. the idiom of the language or library in use.

   Enumerate the project's conventions as a literal inventory:

   - data and state representation,
   - error and absence representation,
   - effects, asynchrony, cancellation, and concurrency,
   - dependency provision,
   - naming and public API shape,
   - mutation and ownership,
   - source-file placement and import direction, and
   - test structure and assertion style.

   **Behavior** is the observable return value, error, state transition, or external effect produced
   for an input. An **invariant** is a condition that must hold before or after every relevant
   transition. For an order-price calculation, the behavior may be “add each applicable fee and
   subtract the member discount”; invariants may require the result to use the order's currency and
   never be negative.

   These independent mutations make three branches remain cognitively active until the return:

   ```ts
   let total = order.basePrice

   if (order.rush) total += rushFee
   if (order.international) total += internationalFee
   if (order.member) total -= memberDiscount

   return Math.max(0, total)
   ```

   Resolve each condition into a named value and state the final behavior as one formula:

   ```ts
   const rushCharge = order.rush ? rushFee : 0
   const internationalCharge = order.international ? internationalFee : 0
   const discount = order.member ? memberDiscount : 0
   const total = order.basePrice + rushCharge + internationalCharge - discount

   return Math.max(0, total)
   ```

   Both versions preserve the behavior and nonnegative-total invariant, but the second does not
   require reconstructing mutation history.

   Complexity is unnecessary when behavior and invariants can be preserved under applicable
   conventions while reducing any of the following:

   - independent values the reader must track simultaneously,
   - simultaneously active branches or cases,
   - prior values that must be reconstructed after mutation,
   - dependencies on evaluation order, or
   - jumps to nonlocal definitions required to understand the current path.

   Evidence of unnecessary complexity MUST identify one of these concrete shapes:

   - **Nested steps with meaningful intermediate results.**

     ```ts
     const label = formatMoney(applyDiscount(convertCurrency(total, rate), discount))
     ```

     Replace it with named `convertedTotal` and `discountedTotal` declarations before formatting.

   - **Branches that repeat behavior while changing only data.**

     ```ts
     if (order.priority) return sendOrder(order, "priority")

     return sendOrder(order, "standard")
     ```

     Select the queue first, then call `sendOrder(order, queue)` once.

   - **The same condition controlling multiple separated regions.**

     ```ts
     if (order.international) validateCustomsAddress(order)
     prepareShipment(order)
     if (order.international) attachCustomsDocuments(order)
     ```

     Move the international steps into one named operation or one contiguous case.

   - **Mutation whose result depends on execution history.**

     ```ts
     let balance = account.balance
     if (deposit !== undefined) balance += deposit
     if (withdrawal !== undefined) balance -= withdrawal
     ```

     Compute named credits and debits, then derive the final balance in one expression.

   Complexity is necessary when removing it would erase a domain case, invariant, error behavior, or
   demonstrated performance constraint. A **domain case** is a named valid variant with distinct data
   or behavior. Pickup and shipment are separate domain cases because only shipment requires an
   address:

   ```ts
   type Fulfillment =
     | { readonly _tag: "Pickup"; readonly storeId: StoreId }
     | { readonly _tag: "Shipment"; readonly address: PostalAddress }
   ```

   Collapsing both into one object with an optional `address` would erase that distinction rather
   than simplify it.

5. **Types MUST communicate meaningful invariants and possible states.**

   Types communicate invariants in these specific ways:

   - **Replace correlated booleans or optional fields with discriminated unions.** This type permits
     contradictory combinations such as `loading: true` with both `user` and `error` present:

     ```ts
     type LoadState = {
       readonly loading: boolean
       readonly user?: User
       readonly error?: LoadError
     }
     ```

     A discriminated union states that exactly one case applies:

     ```ts
     type LoadState =
       | { readonly _tag: "Loading" }
       | { readonly _tag: "Ready"; readonly user: User }
       | { readonly _tag: "Failed"; readonly error: LoadError }
     ```

   - **Give non-interchangeable domain values distinct types.** Values are interchangeable when
     swapping them preserves meaning and validity. Two `UserId` values passed to a symmetric
     `sameUser(left, right)` operation are interchangeable. A `UserId` and an `InvoiceId` are not,
     even if both serialize as strings:

     ```ts
     type UserId = { readonly _tag: "UserId"; readonly value: string }
     type InvoiceId = { readonly _tag: "InvoiceId"; readonly value: string }

     declare const userId: UserId
     declare const loadInvoice: (id: InvoiceId) => Invoice

     const invoice = loadInvoice(userId)
     ```

     TypeScript rejects the final call because the tags differ. Units such as `Meters` and
     `Milliseconds` are another non-interchangeable pair. Introduce role-specific types only when
     swapping roles violates a domain invariant; otherwise precise parameter names are sufficient.

   - **Express relationships between inputs and outputs that the implementation enforces.** This
     function's output type is determined by the object and key supplied by the caller:

     ```ts
     const getProperty = <T, K extends keyof T>(value: T, key: K): T[K] => value[key]

     const name = getProperty(user, "name")
     ```

     By contrast, this generic lets the caller invent any output type:

     ```ts
     const parseJson = <A>(text: string): A => JSON.parse(text)

     const user = parseJson<User>('{"total": 10}')
     ```

     The string input provides no evidence that the parsed value is a `User`. A **runtime witness**
     is a value that exists after generic types are erased and can establish the type, such as a type
     guard, validator, schema, parser, or constructor. Pass that witness explicitly:

     ```ts
     type Validator<A> = (input: unknown) => input is A

     declare const decodeJson: <A>(
       text: string,
       validator: Validator<A>
     ) => DecodeResult<A>

     const user = decodeJson(text, isUser)
     ```

     Here `isUser` performs the runtime validation that connects the returned `User` type to the
     input data.

   - **Expose possible failures and effects at boundaries.** A database lookup that can miss or fail
     must not claim to return an unconditional `User`:

     ```ts
     type LoadUserResult =
       | { readonly _tag: "Found"; readonly user: User }
       | { readonly _tag: "Missing" }
       | { readonly _tag: "Failed"; readonly error: DatabaseError }

     declare const loadUserFromDatabase: (id: UserId) => Promise<LoadUserResult>
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
