# How TypeScript modularity provides its benefits

1. **Module** — a file exporting a cohesive public API.
2. **Interface** — the exported types and values clients may use.
3. **Private implementation** — unexported declarations, inaccessible through normal imports.
4. **Dependency injection** — passing a module-shaped dependency via an interface.
5. **Invariant** — a condition maintained only by a module’s public operations.

## 1. Local reasoning

```ts
// money.ts
export type Money = Readonly<{ cents: number; currency: "USD" }>;

export function add(left: Money, right: Money): Money {
  if (left.currency !== right.currency) throw new Error("Currency mismatch");
  return { cents: left.cents + right.cents, currency: "USD" };
}

// Private formatting details stay here.
function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
```

```ts
// A concern is one cohesive responsibility; here it is computing the total for an invoice’s line-item amounts.
// The module is named for the invoice concern it owns; total is its exposed invoice operation.
// invoice.ts owns invoice-total calculation: it composes line-item amounts without owning money arithmetic.
// invoice.ts
import { add, type Money } from "./money.js";

export function total(items: readonly Money[]): Money {
  return items.reduce((sum, item) => add(sum, item), {
    cents: 0,
    currency: "USD",
  });
}
```

**How modularity provides it:** A module exposes a limited interface. To use it, a reader need only understand its contract, not its private algorithms, state, or helpers. `invoice.ts` needs the `Money` and `add` contracts, not `formatCents` or the implementation of addition.

## 2. Safer change

```ts
// cache.ts — public contract
export interface Cache {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
}
```

```ts
// in-memory-cache.ts — implementation A
import type { Cache } from "./cache.js";

export function createCache(): Cache {
  const entries = new Map<string, string>();

  return {
    get: (key) => entries.get(key),
    set: (key, value) => entries.set(key, value),
  };
}
```

**How modularity provides it:** Callers depend on the interface. An implementation may be replaced—array with tree, SQL with API, algorithm A with B—provided observable behavior and interface remain compatible. Later, replace `Map` with LRU eviction, Redis, or a database-backed cache; callers remain unchanged if `Cache` behavior remains compatible.

## 3. Lower coupling

```ts
// email.ts
export interface EmailSender {
  send(message: { to: string; subject: string; body: string }): Promise<void>;
}
```

```ts
// registration.ts
import type { EmailSender } from "./email.js";

export async function register(
  email: string,
  sender: EmailSender,
): Promise<void> {
  // Persist user...
  await sender.send({
    to: email,
    subject: "Welcome",
    body: "Thanks for registering.",
  });
}
```

**How modularity provides it:** Dependencies cross module boundaries through named imports, parameters, or interfaces. This makes relationships visible and restricts access to internals. `registration.ts` knows only the capability it needs (`send`), not SMTP credentials, a specific provider SDK, or transport configuration.

## 4. Reusability

```ts
// pagination.ts
export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): readonly T[] {
  return items.slice((page - 1) * pageSize, page * pageSize);
}
```

```ts
// users.ts
import { paginate } from "./pagination.js";

// products.ts
import { paginate } from "./pagination.js";
```

**How modularity provides it:** A module with a small, context-independent contract can be imported by multiple consumers. Its private implementation does not need to be copied or adapted at each use site. This generic, narrowly scoped module is reusable by unrelated domains.

## 5. Testability

```ts
// clock.ts
export interface Clock {
  now(): Date;
}
```

```ts
// greeting.ts
import type { Clock } from "./clock.js";

export function greeting(clock: Clock): string {
  return clock.now().getHours() < 12 ? "Good morning" : "Good afternoon";
}
```

```ts
// greeting.test.ts
import { expect, test } from "vitest";
import { greeting } from "./greeting.js";

test("selects morning greeting", () => {
  const clock = { now: () => new Date("2026-07-23T09:00:00") };
  expect(greeting(clock)).toBe("Good morning");
});
```

**How modularity provides it:** The interface creates a seam. A consumer can receive a fake or test implementation; the module itself can be tested directly against its contract without exercising the entire system. Here, the test substitutes time without changing system time or mocking globals.

## 6. Parallel development

```ts
// payments.ts — agreed contract
export interface Payments {
  charge(input: {
    customerId: string;
    cents: number;
  }): Promise<{ receiptId: string }>;
}
```

```ts
// checkout.ts — team A can build against the contract
import type { Payments } from "./payments.js";

export async function checkout(payments: Payments, customerId: string) {
  return payments.charge({ customerId, cents: 2_500 });
}
```

```ts
// stripe-payments.ts — team B implements it independently
import type { Payments } from "./payments.js";

export function createStripePayments(/* config */): Payments {
  // Provider-specific implementation
  throw new Error("implementation omitted");
}
```

**How modularity provides it:** Teams agree on an interface first. One team implements the provider while another writes consumers, because both sides depend on the stable contract rather than unfinished internals. The interface is the coordination point; neither team needs the other’s private code to proceed.

## 7. Error containment

```ts
// bank-account.ts
export type BankAccount = Readonly<{
  id: string;
  balanceCents: number;
}>;

export function withdraw(
  account: BankAccount,
  cents: number,
): BankAccount {
  if (!Number.isInteger(cents) || cents <= 0) {
    throw new Error("Withdrawal must be a positive whole number of cents");
  }
  if (cents > account.balanceCents) {
    throw new Error("Insufficient funds");
  }

  return { ...account, balanceCents: account.balanceCents - cents };
}
```

**How modularity provides it:** State and invariants are owned by one module. Outside code cannot directly mutate private state, so invalid transitions must pass through the module’s checked operations. Here, callers cannot use `withdraw` without passing its validation; production code should also keep mutable account state private and expose only operations such as `withdraw()` and `deposit()`.

## 8. Clear ownership

```ts
// password-policy.ts
export function validatePassword(password: string): void {
  if (password.length < 16) throw new Error("Password is too short");
  if (!/[A-Z]/.test(password)) throw new Error("Missing uppercase letter");
  if (!/[0-9]/.test(password)) throw new Error("Missing digit");
}
```

```ts
// create-user.ts
import { validatePassword } from "./password-policy.js";

export function createUser(email: string, password: string) {
  validatePassword(password);
  return { email, password };
}
```

**How modularity provides it:** A boundary groups related behavior and data. The module that owns an invariant or capability becomes the natural place to change it, rather than scattering logic across callers. Password rules have one owner, so changing the policy does not require searching every registration, reset, import, and admin flow.

## 9. Separate compilation and incremental builds

```json
// packages/core/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "outDir": "dist"
  }
}
```

```json
// packages/app/tsconfig.json
{
  "references": [{ "path": "../core" }],
  "compilerOptions": { "outDir": "dist" }
}
```

```ts
// packages/core/src/slug.ts
export function slugify(value: string): string {
  return value.toLowerCase().replaceAll(/\s+/g, "-");
}
```

```ts
// packages/app/src/article.ts
import { slugify } from "@app/core";

export const articleUrl = (title: string) => `/articles/${slugify(title)}`;
```

**How modularity provides it:** Compilers track module dependencies. If a module’s implementation changes but its exported interface does not, dependent modules often need not be recompiled or type-checked. With project references, `tsc --build` tracks module and project dependencies, so a private implementation change in `core` can avoid rebuilding `app` when emitted declarations do not change.

## 10. Security and correctness

```ts
// signing-key.ts
const secret = process.env.SIGNING_SECRET;
if (!secret) throw new Error("SIGNING_SECRET is required");

export function sign(payload: string): string {
  return createSignature(payload, secret);
}

function createSignature(payload: string, secret: string): string {
  // Cryptographic implementation belongs here.
  return `${payload}.${secret}`;
}
```

```ts
// session.ts
import { sign } from "./signing-key.js";

export function createSession(userId: string): string {
  return sign(JSON.stringify({ userId }));
}
```

**How modularity provides it:** Capability-bearing operations and sensitive representation can remain unexported. Clients can perform only the operations intentionally exposed by the interface. `session.ts` can request a signature but cannot normally import the secret or call private cryptographic helpers.

TypeScript module privacy improves API correctness, but it is **not a security boundary by itself**: shipped JavaScript and server environment access must still be protected by deployment, access control, and secret management.

The mechanism is always the same: **restrict what crosses boundaries, make that crossing explicit, and preserve a contract while allowing internal freedom.**
