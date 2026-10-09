---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Declare variables near their first use

Report a variable declared substantially before its first use or outside its smallest practical scope, such as `let result;` followed by unrelated statements before `result = calculateTotal(order)`, or a variable declared before an `if` when used only inside it. Do not report a broader scope required by later uses.
