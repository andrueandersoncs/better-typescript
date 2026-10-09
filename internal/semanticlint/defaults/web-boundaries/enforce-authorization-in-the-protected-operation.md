---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Enforce authorization in the protected operation

Report a protected application operation that relies only on presentation code for authorization instead of enforcing it with the operation. Example: a UI hides the delete button, but `deleteOrder(orderId)` performs the deletion without an authorization check. Do not report presentation gating that is additional to authorization enforced by the protected operation, or operations that do not protect access.
