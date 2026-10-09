---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Convert thrown exceptions at external boundaries

Apply this policy to Effect operations (such as `Effect.gen` bodies or Effect pipelines) that call code able to throw or reject: SDK and HTTP clients, file system and process APIs, drivers, and parsers such as `JSON.parse` or third-party decoders. Each such call must be converted into a typed failure with `Effect.try` or `Effect.tryPromise`, as in `yield* Effect.tryPromise({ try: () => client.send(req), catch: (cause) => new SendFailed({ cause }) })`. Check every call separately; one converted call does not cover the next. Report any of these shapes:

- a throwing call made directly inside the operation, such as `const body = JSON.parse(text)` or `const user = client.getUser(id)` in an `Effect.gen` body;
- a rejecting promise wrapped with `Effect.promise(() => client.send(req))`, which turns the rejection into an untyped defect;
- a throwing call wrapped with `Effect.sync(() => fs.readFileSync(path))` or `Effect.succeed(parse(text))`.

Do not report pure calculations that cannot throw on expected input, Effect-native APIs that already fail in the error channel (such as `Schema.decodeUnknown`), files with no Effect operation, or a boundary already converted with `Effect.try` or `Effect.tryPromise`, whatever error type its `catch` produces.
