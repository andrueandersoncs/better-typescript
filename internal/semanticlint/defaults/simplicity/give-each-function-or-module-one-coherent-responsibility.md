---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Give each function or module one coherent responsibility

Report a function, module, or abstraction that combines responsibilities changing for unrelated reasons, or whose public operations do not form one recognizable concept: for example, `utils.ts` housing `parseOrder`, `sendEmail`, and `hashPassword`, or a `Manager` doing unrelated work. Do not report a long function merely because it is long when it has a clear one-sentence purpose.
