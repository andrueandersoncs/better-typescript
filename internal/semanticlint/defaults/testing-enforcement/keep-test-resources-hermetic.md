---
globs:
  - "package.json"
  - "**/*config*.{ts,js,mjs,cjs,json}"
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep test resources hermetic

Apply this policy to tests and test configuration that create, write, bind, or mutate a database, directory or file, network port, queue, account, or external service. Each run must get its own resource identity, as in `dir = await mkdtemp(join(tmpdir(), "prefix-"))`, `server.listen(0)` followed by reading the assigned port, or a database name generated per test. Test files run in parallel workers and concurrent CI jobs, so a hard-coded identity collides across runs even when one file uses it and cleans up afterward. Report any of these shapes:

- a fixed path for a writable directory or file, such as `dir = join(tmpdir(), "fixed-name")` or `"/tmp/out"`, instead of a unique temporary directory;
- listening on or connecting to a hard-coded port, such as `server.listen(4000)` or a config `port: 4000`, instead of port `0` or an allocated free port;
- a fixed database, schema, bucket, queue, or topic name that tests write to;
- a shared account, user, or record that several tests mutate or whose state depends on test order.

Do not report a shared read-only resource that tests cannot mutate, identities produced by a helper that generates unique names, or missing cleanup of an otherwise unique resource.
