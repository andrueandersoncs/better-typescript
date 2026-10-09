---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Specify inputs, outputs, errors, and side effects

Apply this policy to exported functions, operations, factories, and function types. Their declared signature and doc comment together must state the inputs, result, failures, and side effects, as in `/** Saves the user to the store; fails with Conflict when taken. */ export const save = (store: Store, user: User): Effect.Effect<void, Conflict> => ...`. Report any of these shapes:

- an exported function, arrow function, or `async function` with no declared return type, such as `export async function upload(client: Client, file: File) {`, even when a complete doc comment describes the result; an inferred return type is not a specification, so write `: Promise<UploadResult>`;
- an exported operation or factory that performs I/O through an injected client, such as `store.put(user)` or `client.send(command)`, with no doc comment naming that side effect, even when its type is `Effect.Effect<A, E>`.

Do not report:

- non-exported helpers or data-only types;
- pure exported functions whose annotated parameter and return types fully describe them and that cannot fail; they need no doc comment;
- missing rejection types on a function that already declares `: Promise<Result>`, when its doc comment names how it rejects; this satisfies only the failures requirement and never excuses a missing return type.
