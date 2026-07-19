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

   For this constraint, the **unit** is the executable TypeScript declaration or source-file module
   under review: a function, method, class (including its constructor and public members), or module.
   Its **immediate contract** is the declaration's signature, public or exported members, declared
   result, error, and effect types, and adjacent API documentation. A correct mental model lets a
   reader predict, from that unit and contract:

   For an executable declaration—a function, method, or class—the relevant predictions are:

   - the purpose of each callable operation and its **preconditions**: the conditions that must hold
     for its input values or, for a method, its receiver state. The **receiver** is the object to the
     left of `.` at a method call. For example, this signature says that `capturePayment` captures a
     payment and may be called only with an authorized payment:

     ```ts
     type AuthorizedPayment = {
       readonly _tag: "Authorized"
       readonly authorizationId: AuthorizationId
     }

     type CapturedPayment = {
       readonly _tag: "Captured"
       readonly captureId: CaptureId
     }

     declare const capturePayment: (payment: AuthorizedPayment) => CapturedPayment
     ```

     Likewise, because `cancel` exists only on `ActiveReservation`, its declaration says that the
     receiver in `reservation.cancel()` must be active; the operation is unavailable on a cancelled
     reservation:

     ```ts
     type ActiveReservation = {
       readonly _tag: "Active"
       cancel(): CancelledReservation
     }

     type CancelledReservation = {
       readonly _tag: "Cancelled"
     }

     type Reservation = ActiveReservation | CancelledReservation
     ```
   - its parameters or constructor inputs and, for a class, its reachable public instance states.
     For example, the constructor requires a seat and customer identifier, and `status` exposes the
     only public lifecycle states that an instance can reach:

     ```ts
     class Reservation {
       private currentStatus: "active" | "cancelled" = "active"

       constructor(
         readonly seatId: SeatId,
         readonly customerId: CustomerId,
       ) {}

       get status(): "active" | "cancelled" {
         return this.currentStatus
       }

       cancel(): void {
         this.currentStatus = "cancelled"
       }
     }
     ```
   - the return values, failures, side effects, and state transitions of the function, method,
     constructor, or public member. For example, this contract names every result and states exactly
     which persistence, notification, and lifecycle changes accompany success:

     ```ts
     type CancelReservationResult =
       | { readonly _tag: "Cancelled"; readonly refund: Money }
       | { readonly _tag: "AlreadyCancelled" }
       | { readonly _tag: "CancellationFailed"; readonly error: CancellationError }

     /**
      * On `Cancelled`, persists the cancellation, changes the reservation from active to cancelled,
      * and sends a confirmation. The other results leave state unchanged and send nothing.
      */
     declare const cancelReservation: (
       repository: ReservationRepository,
       notifications: ReservationNotifications,
       reservationId: ReservationId,
     ) => Promise<CancelReservationResult>
     ```
   - the dependencies and receiver or nonlocal state that influence those behaviors. For example,
     `availableSeats` depends on the injected repository and on the receiver's `showId`; neither
     influence is hidden in an ambient binding:

     ```ts
     class SeatInventory {
       constructor(
         private readonly repository: SeatRepository,
         private readonly showId: ShowId,
       ) {}

       availableSeats(): Promise<ReadonlyArray<Seat>> {
         return this.repository.readAvailable(this.showId)
       }
     }
     ```

   For a source-file module, they are:

   - the module's responsibility and the capabilities provided by each export. For example, this
     module is responsible only for reservation pricing, and each export names one pricing
     capability:

     ```ts
     /** Reservation pricing; this module neither stores reservations nor collects payments. */
     export declare const quoteReservation: (
       show: Show,
       seatIds: ReadonlyArray<SeatId>,
     ) => Money

     export declare const cancellationFeeFor: (reservation: Reservation) => Money
     ```
   - the imports and top-level initialization on which the module depends. For example, this module
     imports a database and a repository factory, then initializes the repository used by its
     export:

     ```ts
     import { database } from "./database.js"
     import { makeReservationRepository } from "./reservation-repository.js"

     const repository = makeReservationRepository(database)

     export const readReservation = (
       id: ReservationId,
     ): Promise<Reservation | undefined> => repository.read(id)
     ```
   - the state the module owns and which exports can observe or change it. For example, this module
     alone owns `reservations`; `readReservation` observes it and `replaceReservation` changes it:

     ```ts
     const reservations = new Map<ReservationId, Reservation>()

     export const readReservation = (id: ReservationId): Reservation | undefined =>
       reservations.get(id)

     export const replaceReservation = (reservation: Reservation): void => {
       reservations.set(reservation.id, reservation)
     }
     ```
   - any failures or side effects caused by evaluating the module. For example, importing this
     module registers a metric immediately and can fail before any export is called:

     ```ts
     import { metrics } from "./metrics.js"

     /**
      * Module evaluation registers `reservation_attempts`.
      * @throws {MetricRegistrationError} When that name is already registered.
      */
     export const reservationAttempts = metrics.registerCounter("reservation_attempts")
     ```

   For every unit, a correct mental model also reveals the likely scope and consequences of a
   change.

   A machine MUST evaluate this constraint as a contract-to-implementation comparison, not by
   inventing a reader's predictions. For fixed source files, `tsconfig`, compiler version, and a
   project-defined catalog of effectful APIs, it must:

   - parse and type-check the program,
   - collect contract facts from the declaration and its public dependency types: parameters,
     constructor and public fields, result, error, and effect variants, imports, and declared
     mutation,
   - collect implementation facts from its body: reads of free mutable bindings, writes through
     parameters or to nonlocal bindings, reachable return and throw variants, and calls to cataloged
     I/O or nondeterminism APIs,
   - normalize each fact to a `(kind, subject, resolvedType)` tuple, where `subject` is the
     type-checker's fully qualified symbol for a dependency or binding, a property path for a
     mutation, a return or throw variant, or the catalog identifier for an effect, and
   - report each implementation tuple absent from the contract tuple set, citing both source
     locations.

   The same inputs must produce the same finding set. A checker MUST NOT infer domain purpose from an
   identifier alone; it may compare purpose only with an explicit, machine-readable specification
   supplied as input.

2. **Code MUST express domain intent rather than implementation mechanics.**

   Domain intent is the problem-space operation or decision: reserve a seat, approve an invoice, or
   expire a session. Implementation mechanics are the storage and control operations required to
   perform it: assign fields, update counters, index collections, or call persistence APIs. Code
   expresses domain intent when its caller-visible identifiers—the names of exported functions and
   types, public methods, parameters, and result fields—state why those mechanics happen. A
   **public operation** is any callable a consumer can reach through a module export: an exported
   function, a callable property of an exported object, or a public constructor, static method, or
   instance method of an exported class.

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

3. **Each TypeScript function, method, class, and source-file module SHOULD support local reasoning.**
   Its dependencies, inputs, outputs, errors, effects, and state changes must be discoverable in the
   declaration, its body, and the public contracts of its direct dependencies. For a function or
   method, inspect its signature and body; for a class, its constructor and public members; for a
   module, its source file, exports, and direct imports.

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

   - Dependencies MUST appear in parameters, constructor fields, or module imports. A **service
     locator** is a registry that code queries by key or type to obtain a dependency at runtime
     instead of receiving that dependency through a typed API. **Ambient state** is a value read from
     an enclosing, module, or global mutable binding without appearing in the reader's API. Both are
     prohibited; `services` and `activeTenantId` are hidden dependencies here:

     ```ts
     declare const services: {
       resolve(name: "invoiceRepository"): InvoiceRepository
     }
     declare let activeTenantId: TenantId

     const loadInvoice = (id: InvoiceId) =>
       services.resolve("invoiceRepository").load(activeTenantId, id)
     ```

   - Time, randomness, environment variables, feature flags, and the current user MUST be passed or
     captured by an explicitly named boundary. An **explicitly named boundary** is a function or
     constructor whose name states that it captures external context and whose signature lists every
     source it reads and every captured value it returns. For example, only
     `captureRequestContext` samples these sources; downstream domain functions receive its
     `RequestContext`:

     ```ts
     const captureRequestContext = (
       clock: Clock,
       random: Random,
       env: Environment,
       flags: FeatureFlags,
       currentUser: User,
     ): RequestContext => ({
       now: clock.now(),
       requestId: random.requestId(),
       environmentName: env.name,
       flags,
       currentUser,
     })
     ```

   - A function SHOULD NOT mutate caller-owned inputs. Every object, array, map, or set received
     through a parameter is **caller-owned** by default: the caller may retain an alias and observe
     mutations after the call. Mutation is acceptable only when the API uses a repository-defined
     ownership-transfer type such as `Owned<T>` and names the mutating operation. A deterministic
     checker follows local aliases originating at each parameter and reports property or element
     assignments, `delete` operations, and cataloged mutating calls such as `push`, `sort`, or `set`
     unless that ownership marker is present. TypeScript cannot prove unique ownership; without an
     enforced project marker, the input remains caller-owned.

   - I/O MUST occur behind an operation whose name and contract expose the effect. A name exposes I/O
     when its leading verb belongs to the project's effect vocabulary—for example, `read` or `query`
     for a database read, `write` or `save` for a write, and `send` or `publish` for external
     communication—and its result type declares asynchrony and failure. Compare the hidden database
     read in the predicate with the explicit operation:

     ```ts
     const isUserPresent = (id: UserId): Promise<boolean> => users.exists(id)

     type UserExistenceRead =
       | { readonly _tag: "Read"; readonly exists: boolean }
       | { readonly _tag: "ReadFailed"; readonly error: DatabaseError }

     const readUserExistence = (
       repository: UserRepository,
       id: UserId,
     ): Promise<UserExistenceRead> => repository.readExistence(id)
     ```

     Predicates, getters, and value constructors MUST NOT perform hidden I/O.

   - Failures and optional results MUST be represented by the declared return, error, or effect
     channel rather than undocumented sentinels or hidden throws. An **undocumented sentinel** is an
     ordinary return value whose special failure or absence meaning is visible only in the
     implementation. Here `-1` is indistinguishable from an ordinary `number` in the signature:

     ```ts
     const parsePort = (raw: string): number => {
       const port = Number(raw)
       return Number.isInteger(port) ? port : -1
     }

     type ParsePortResult =
       | { readonly _tag: "Parsed"; readonly port: number }
       | { readonly _tag: "Invalid"; readonly input: string }
     ```

     Returning `undefined` or `null` is not an undocumented sentinel when the declared return type
     gives it the documented meaning of absence.

   - A dependency's public contract MUST be sufficient for using it; callers SHOULD NOT need to read
     its implementation to understand ordinary behavior. A contract is insufficient when it omits a
     result, failure, effect, ordering rule, or state change on which an ordinary caller must rely.
     This contract forces callers to inspect the implementation to learn what happens when the user
     is absent or the database fails:

     ```ts
     interface InsufficientUserRepository {
       find(id: UserId): Promise<User>
     }

     type FindUserResult =
       | { readonly _tag: "Found"; readonly user: User }
       | { readonly _tag: "NotFound" }
       | { readonly _tag: "Failed"; readonly error: DatabaseError }

     interface UserRepository {
       find(id: UserId): Promise<FindUserResult>
     }
     ```

4. **Control and data flow MUST be obvious** without mentally simulating unnecessarily complex
   expressions, branching, or mutation.

   This applies recursively at every semantic boundary:

   - **Expression:** evaluation order and intermediate meanings are apparent when each side-effecting
     step is a separate statement and each separately meaningful result has a name. The first form
     hides a mutation inside an argument, so the value used by `taxFor` is not apparent without
     recalling postfix-increment evaluation order:

     ```ts
     const total = applyDiscount(order, discounts[discountIndex++]) + taxFor(discountIndex)

     const discount = discounts[discountIndex]
     discountIndex += 1
     const discounted = applyDiscount(order, discount)
     const tax = taxFor(discountIndex)
     const apparentTotal = discounted + tax
     ```

   - **Function or method:** branches, exits, loops, and state transitions can be followed one path
     at a time when completing one branch does not require retaining mutations or flags from several
     earlier branches. The first function requires combining both conditions and the intermediate
     values of `access` and `shouldAudit`; each path in the second function ends or proceeds directly:

     ```ts
     const tangledAccessFor = (user: User, record: ProtectedResource): Access => {
       let access: Access = "read"
       let shouldAudit = false

       if (user.isAdmin) {
         access = "write"
         shouldAudit = true
       }
       if (record.locked) {
         access = "read"
       }
       if (shouldAudit && access === "write") {
         audit(record)
       }

       return access
     }

     const accessFor = (user: User, record: ProtectedResource): Access => {
       if (record.locked) {
         return "read"
       }
       if (!user.isAdmin) {
         return "read"
       }

       audit(record)
       return "write"
     }
     ```

   - **Module:** initialization, state ownership, and data passed between exports are apparent.
     **State ownership** is the exclusive authority to create and mutate a binding. It is apparent
     when the mutable binding is private to one source-file module and that module exposes named
     operations instead of a mutable object that unrelated modules can write:

     ```ts
     // Unclear: login.ts and logout.ts both mutate this exported object.
     export const sharedSessionState: { current: Session | undefined } = {
       current: undefined,
     }

     // Clear: only session-store.ts can write current.
     let current: Session | undefined
     export const readCurrentSession = (): Session | undefined => current
     export const replaceCurrentSession = (session: Session | undefined): void => {
       current = session
     }
     ```

   - **Cross-module or asynchronous workflow:** sequencing, concurrency, cancellation, and failure
     propagation are apparent.

   In this document, a TypeScript **module** means an ECMAScript module, whose boundary is exactly one
   source file. Top-level imports and exports are file-scoped; neither a directory nor a region
   within a file creates another module boundary. A file is a module when it has a top-level import
   or export or when compiler configuration treats it as one. Evaluate the contracts that cross
   these source-file boundaries.

   A **project convention** is a rule applicable to the file under review. Its scope is the smallest
   repository-owned package or workspace containing that file, plus parent-repository documentation
   and executable configuration whose path or include rules cover it. Evidence entities are
   repository-owned, non-generated TypeScript source files and their functions, methods, classes,
   interfaces, type aliases, and exported APIs. Tests count only as evidence for test-code
   conventions; fixtures, examples, vendored code, generated code, and build output do not count.

   A convention is either explicitly required by applicable documentation or configuration, or
   appears in at least two independent, analogous production declarations. A **production
   declaration** is one of those evidence entities in shipped source rather than test support.
   **Analogous** declarations perform the same architectural role, such as two HTTP request handlers.
   **Independent** declarations live in different source-file modules and neither is generated from
   nor merely forwards to the other. One occurrence is a precedent, not yet a convention. Determine
   conventions in this order:

   1. documented standards and executable configuration,
   2. the dominant pattern in the nearest analogous subsystem,
   3. a repeated repository-wide pattern, then
   4. the idiom of the language or library in use.

   Enumerate at least the project's conventions for:

   - **Data representation:** domain states, identifiers, collections, and boundary data,
   - **Error handling:** expected failures, defects, and absence,
   - **Effects and asynchrony:** I/O, promises or effect types, concurrency, and cancellation,
   - **Dependency provision:** parameters, constructors, imports, and scoped context,
   - **Naming and API shape:** exported declarations, operations, parameters, and result fields,
   - **Module placement:** source-file responsibilities and import direction, and
   - **Testing:** test location, fixtures, assertions, and effect execution.

   An explicit standard wins over an incidental pattern. Correctness wins over every convention.

   **Behavior** means the externally observable result variants, failures, I/O, state changes, and
   ordering produced for each input. An **invariant** is a predicate that must hold at every specified
   public boundary. For example, a successful `reserveSeat` must preserve this invariant:

   ```ts
   const reservationInvariant = (show: Show): boolean =>
     show.availableSeatCount ===
       show.seats.filter((seat) => seat.status === "available").length &&
     show.seats.every(
       (seat) => seat.status !== "reserved" || seat.customerId !== undefined,
     )
   ```

   A refactor preserves the behavior and invariant only if it produces the same success or failure
   for every input, makes the same observable state changes, and leaves
   `reservationInvariant(updatedShow)` true after success. Complexity is unnecessary when those
   facts can be preserved under project conventions while reducing any of the following:

   - independent values the reader must track simultaneously,
   - simultaneously active branches or cases,
   - prior values that must be reconstructed after mutation,
   - dependencies on evaluation order, or
   - jumps to nonlocal definitions required to understand the current path.

   “Simultaneously active” describes the reader's burden, not runtime concurrency. In the first
   function, each conditional may have changed `total`, so all eight combinations of the three
   booleans remain relevant at the return. The second function represents the same combinations as
   independently named values, making the final relationship direct:

   ```ts
   const totalWithMutation = (
     subtotal: number,
     isMember: boolean,
     hasCoupon: boolean,
     expedited: boolean,
   ): number => {
     let total = subtotal
     if (isMember) total -= subtotal * 0.1
     if (hasCoupon) total -= 5
     if (expedited) total += 15
     return total
   }

   const totalFromAdjustments = (
     subtotal: number,
     isMember: boolean,
     hasCoupon: boolean,
     expedited: boolean,
   ): number => {
     const memberDiscount = isMember ? subtotal * 0.1 : 0
     const couponDiscount = hasCoupon ? 5 : 0
     const expeditedFee = expedited ? 15 : 0

     return subtotal - memberDiscount - couponDiscount + expeditedFee
   }
   ```

   Typical evidence of unnecessary complexity includes:

   - **A nested expression with separately meaningful intermediate results.**

     ```ts
     const label = formatMoney(applyTax(convertMoney(order.total, exchangeRate), taxRate))

     const convertedTotal = convertMoney(order.total, exchangeRate)
     const taxedTotal = applyTax(convertedTotal, taxRate)
     const readableLabel = formatMoney(taxedTotal)
     ```

   - **Branches that repeat behavior while changing only data.**

     ```ts
     if (invoice.overdue) {
       sendEmail(invoice.customer, "overdue")
     } else {
       sendEmail(invoice.customer, "current")
     }

     const template = invoice.overdue ? "overdue" : "current"
     sendEmail(invoice.customer, template)
     ```

   - **Repeated conditions.**

     ```ts
     if (order.expedited) reserveCourier(order)
     if (order.expedited) chargeExpediteFee(order)

     if (order.expedited) {
       reserveCourier(order)
       chargeExpediteFee(order)
     }
     ```

   - **Mutation whose outcome depends on execution history.**

     ```ts
     let permissions = basePermissions
     if (isAdmin) permissions = adminPermissions
     if (isReadOnly) permissions = []

     const permissionsFor = (): ReadonlyArray<Permission> => {
       if (isReadOnly) return []
       if (isAdmin) return adminPermissions
       return basePermissions
     }
     ```

   Complexity is necessary when removing it would erase a **domain case**: a semantically distinct
   input or state with different permitted operations, results, failures, or effects. For example,
   only a captured payment may be refunded, while a refunded payment must produce an
   `AlreadyRefunded` result:

   ```ts
   type Payment =
     | { readonly _tag: "Pending" }
     | { readonly _tag: "Captured"; readonly captureId: CaptureId }
     | {
         readonly _tag: "Refunded"
         readonly captureId: CaptureId
         readonly refundId: RefundId
       }
   ```

   Collapsing `Captured` and `Refunded` into `{ readonly settled: true }` would be simpler syntax but
   would erase that domain case. An invariant, error behavior, or demonstrated performance
   constraint can likewise make complexity necessary.

5. **Types MUST communicate meaningful invariants and possible states.**

   Types communicate invariants by:

   - replacing correlated booleans or optional fields with discriminated unions, for example:

     ```ts
     type LooseConnection = {
       readonly connected: boolean
       readonly socket?: WebSocket
     }

     type Connection =
       | { readonly _tag: "Disconnected" }
       | { readonly _tag: "Connected"; readonly socket: WebSocket }
     ```

   - giving non-interchangeable domain values distinct types, for example:

     ```ts
     declare const UserIdBrand: unique symbol
     declare const InvoiceIdBrand: unique symbol

     type UserId = string & { readonly [UserIdBrand]: true }
     type InvoiceId = string & { readonly [InvoiceIdBrand]: true }

     declare const userId: UserId
     declare const loadInvoice: (id: InvoiceId) => Invoice

     loadInvoice(userId) // TypeScript rejects UserId where InvoiceId is required.
     ```

     Values are interchangeable when swapping them preserves meaning and validity. Two `UserId`
     values compared by a symmetric `sameUser(left, right)` operation are interchangeable and need
     the same type. A `UserId` and an `InvoiceId` are not interchangeable even if both serialize as
     strings: passing a user identifier to `loadInvoice` is invalid and distinct types should make
     that call fail to compile. Units such as `Meters` and `Milliseconds` are another
     non-interchangeable pair. Introduce role-specific types only when swapping roles violates a
     domain invariant; otherwise precise parameter names are sufficient.

   - expressing real relationships between inputs and outputs, and

     A relationship is real when the implementation determines the output type from a typed input.
     This property accessor is concrete: choosing the `"total"` key makes the result `Money`, while
     choosing `"customerId"` makes it `CustomerId`:

     ```ts
     const getProperty = <Value, Key extends keyof Value>(
       value: Value,
       key: Key,
     ): Value[Key] => value[key]

     declare const invoice: {
       readonly total: Money
       readonly customerId: CustomerId
     }

     const total = getProperty(invoice, "total")
     ```

     A **runtime witness** is a runtime value with executable logic that establishes a TypeScript
     type, such as a validator `(value: unknown) => value is Invoice`. It can justify a generic
     result because the caller supplies runtime evidence for the chosen type:

     ```ts
     type Validator<A> = (value: unknown) => value is A

     declare const decodeJson: <A>(
       raw: string,
       validator: Validator<A>,
     ) => A | DecodeError
     declare const isInvoice: Validator<Invoice>

     const decodedInvoice = decodeJson(raw, isInvoice)
     ```

     By contrast, `<A>(raw: string) => A` accepts no typed input or runtime witness that could
     establish `A`; it should return `unknown` or require a validator or schema.

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

   Errors worth preventing include:

   - **Swapped identifiers or units.** Plain primitives accept values in the wrong position or
     unit. Distinct domain types reject those calls:

     ```ts
     declare const loadInvoiceForUserLoosely: (
       userId: string,
       invoiceId: string,
     ) => Invoice
     declare const userIdText: string
     declare const invoiceIdText: string

     loadInvoiceForUserLoosely(invoiceIdText, userIdText) // Accepted despite the swap.

     declare const UserIdBrand: unique symbol
     declare const InvoiceIdBrand: unique symbol
     type UserId = string & { readonly [UserIdBrand]: true }
     type InvoiceId = string & { readonly [InvoiceIdBrand]: true }

     declare const loadInvoiceForUser: (
       userId: UserId,
       invoiceId: InvoiceId,
     ) => Invoice
     declare const userId: UserId
     declare const invoiceId: InvoiceId

     loadInvoiceForUser(invoiceId, userId) // TypeScript rejects both swapped arguments.

     declare const SecondsBrand: unique symbol
     declare const MillisecondsBrand: unique symbol
     type Seconds = number & { readonly [SecondsBrand]: true }
     type Milliseconds = number & { readonly [MillisecondsBrand]: true }

     declare const sleep: (delay: Milliseconds) => Promise<void>
     declare const timeoutSeconds: Seconds

     sleep(timeoutSeconds) // TypeScript rejects seconds where milliseconds are required.
     ```

   - **Incompatible state combinations.** Independent booleans and optional fields admit
     contradictory states; a discriminated union does not:

     ```ts
     type LooseLoadState = {
       readonly loading: boolean
       readonly user?: User
       readonly error?: LoadError
     }

     declare const user: User
     declare const error: LoadError

     const contradictory: LooseLoadState = {
       loading: true,
       user,
       error,
     } // Accepted despite representing loading, success, and failure at once.

     type LoadState =
       | { readonly _tag: "Loading" }
       | { readonly _tag: "Ready"; readonly user: User }
       | { readonly _tag: "Failed"; readonly error: LoadError }

     const rejectedContradiction: LoadState = {
       _tag: "Loading",
       user,
       error,
     } // TypeScript rejects fields that do not belong to the Loading case.
     ```

   - **Unhandled union cases.** A string-indexed table may omit a case, while a table keyed by the
     union must cover every member:

     ```ts
     type PaymentStatus = "Pending" | "Captured" | "Refunded"

     const looseStatusLabels: { readonly [status: string]: string } = {
       Pending: "Pending",
       Captured: "Captured",
     } // Accepted although Refunded has no entry.

     const statusLabels: Record<PaymentStatus, string> = {
       Pending: "Pending",
       Captured: "Captured",
     } // TypeScript rejects the missing Refunded property.
     ```

   - **Illegal state transitions.** A single broad state type permits every state at an operation
     boundary. State-specific input types restrict an operation to its legal source state:

     ```ts
     type LoosePayment = {
       readonly status: "Pending" | "Captured" | "Refunded"
     }

     declare const refundLoosely: (payment: LoosePayment) => LoosePayment

     refundLoosely({ status: "Pending" }) // Accepted although pending payments cannot be refunded.

     type PendingPayment = { readonly _tag: "Pending" }
     type CapturedPayment = {
       readonly _tag: "Captured"
       readonly captureId: CaptureId
     }
     type RefundedPayment = {
       readonly _tag: "Refunded"
       readonly refundId: RefundId
     }

     declare const refund: (payment: CapturedPayment) => RefundedPayment
     declare const pendingPayment: PendingPayment

     refund(pendingPayment) // TypeScript rejects the illegal transition.
     ```

   - **Lost relationships between generic inputs and outputs.** An unconstrained result type lets
     caller context choose an output unrelated to the selected input. An indexed-access result
     preserves that relationship:

     ```ts
     declare const getPropertyLoosely: <Result>(
       value: object,
       key: PropertyKey,
     ) => Result
     declare const invoice: {
       readonly total: Money
       readonly customerId: CustomerId
     }

     const wrongCustomerId: CustomerId = getPropertyLoosely(invoice, "total")
     // Accepted because Result is inferred as CustomerId independently of the key.

     declare const getProperty: <Value, Key extends keyof Value>(
       value: Value,
       key: Key,
     ) => Value[Key]

     const rejectedCustomerId: CustomerId = getProperty(invoice, "total")
     // TypeScript rejects Money where CustomerId is required.
     ```

   Malformed external data is not such an error because static types cannot validate runtime input.
   If no concrete rejected program can be demonstrated, the additional type complexity is not
   justified.

7. **Abstractions MUST represent coherent concepts, preserve relevant distinctions, and hide only irrelevant details.**

   Evaluate coherence with three tests:

   - **Purpose:** its purpose can be stated without joining independent responsibilities with “and.”
     `ReservationLifecycle` passes because its purpose is “manage the lifecycle of an active
     reservation.” `ReservationToolbox` fails because its accurate purpose is “change reservation
     state and render occupancy reports”:

     ```ts
     interface ReservationLifecycle {
       cancel(reservation: ActiveReservation): CancelledReservation
       transfer(
         reservation: ActiveReservation,
         customerId: CustomerId,
       ): ActiveReservation
     }

     interface ReservationToolbox {
       cancel(reservation: ActiveReservation): CancelledReservation
       renderOccupancyReport(show: Show): string
     }
     ```
   - **Invariant:** its members share an invariant, lifecycle, or reason to change.
     `ReservationWindow` passes because all construction and mutation preserve the invariant that
     `startsAt` precedes `endsAt`. `ReservationData` fails because a reservation and an occupancy
     report template have no shared invariant, lifecycle, or reason to change:

     ```ts
     declare class ReservationWindow {
       private constructor()

       readonly startsAt: Instant
       readonly endsAt: Instant

       static between(
         startsAt: Instant,
         endsAt: Instant,
       ): ReservationWindow | InvalidReservationWindow

       moveBy(duration: Duration): ReservationWindow
     }

     interface ReservationData {
       readonly reservation: Reservation
       readonly occupancyReportTemplate: ReportTemplate
     }
     ```
   - **Use:** callers consume it as one concept rather than repeatedly selecting unrelated subsets.
     `Money` passes because callers supply its amount and currency together to monetary operations.
     `ReservationDependencies` fails because each caller repeatedly selects a different, unrelated
     service from the abstraction:

     ```ts
     type Money = {
       readonly amount: number
       readonly currency: Currency
     }

     declare const addMoney: (left: Money, right: Money) => Money
     declare const formatMoney: (money: Money) => string

     interface ReservationDependencies {
       readonly repository: ReservationRepository
       readonly reportRenderer: OccupancyReportRenderer
     }

     const readReservation = (
       { repository }: ReservationDependencies,
       id: ReservationId,
     ): Promise<Reservation | undefined> => repository.read(id)

     const renderOccupancyReport = (
       { reportRenderer }: ReservationDependencies,
       show: Show,
     ): string => reportRenderer.render(show)
     ```

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

9. **Similar concepts MUST use consistent names, representations, error models, and structural patterns.**

10. **Related information SHOULD remain colocated** unless the separated pieces form independently
    understandable concepts.

11. **Comments SHOULD explain rationale, constraints, and non-obvious decisions.** They SHOULD NOT
    merely narrate the code.

12. **Side effects, asynchronous boundaries, state transitions, and failure behavior MUST be visible and unsurprising.**

13. **Code SHOULD make the safe location and consequences of a future change apparent.**

14. **Readability MUST NOT be inferred solely from brevity, explicitness, abstraction count, type sophistication, DRYness, or formatting.**

15. **When principles conflict, prefer the design that minimizes the work required for the intended reader to form an accurate mental model.**

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

21. **Required sequencing and temporal dependencies MUST be explicit, colocated, or encoded into the API.**

22. **Dependency direction MUST be understandable and free from avoidable cycles or action at a distance.**

23. **Public contracts SHOULD present essential information before implementation detail.** Readers
    should be able to progressively disclose complexity.

24. **Code MUST be navigable.** Concepts should have stable, searchable names and live in
    predictable locations.

25. **Surface syntax MUST remain mechanically parseable by a human.** Formatting should be
    consistent, and expressions must not compress multiple conceptual steps into one syntactic unit.

Together, these constraints are comprehensive at the principle level. A rigid syntax checklist would
be counterproductive: readability remains contextual, and rules must serve the reader rather than
encourage code optimized for a rubric.
