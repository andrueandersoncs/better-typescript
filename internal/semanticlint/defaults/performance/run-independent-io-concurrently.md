---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Do not serialize independent I-O

Independent I-O operations should not form a sequential `await` or `yield*` waterfall. Operations are independent only when later work does not need an earlier result or side effect and concurrent execution preserves ordering, failure, transaction, and rate-limit requirements.

Do not report intentional sequencing or loops whose operations must remain ordered. Report only when this file shows that independent operations wait on one another without a required semantic constraint.
