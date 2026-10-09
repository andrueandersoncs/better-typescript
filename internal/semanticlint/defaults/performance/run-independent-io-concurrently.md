---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Do not serialize independent I-O

Report sequential `await` or `yield*` I-O operations that are independent: later work needs neither an earlier result nor side effect, and concurrent execution preserves ordering, failure, transaction, and rate-limit requirements. Examples: `await fetchUsers(); await fetchOrders()` or `yield* loadUsers; yield* loadOrders` when the calls have no dependency. Do not report intentional sequencing or loops whose operations must remain ordered. Report only when this file shows independent operations waiting on one another without a required semantic constraint.
