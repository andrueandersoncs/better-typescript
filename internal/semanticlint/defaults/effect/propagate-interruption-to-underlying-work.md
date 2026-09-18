---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Propagate interruption to underlying work

When an Effect wraps cancellable Promise, HTTP, process, or subscription work, interruption must reach the underlying operation through its cancellation API and release owned resources. Rejecting only the wrapper while work continues is not cancellation.

Do not report operations that finish synchronously or cannot be canceled and are explicitly bounded. Report only when changed interruptible work can continue after its owning Effect is interrupted.
