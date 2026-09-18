---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
always use the `Readonly` utility type in TypeScript if you're defining a type where every property/field is readonly, for example:

type SomeType = Readonly<{
  fieldA: string;
  fieldB: number;
  fieldC: boolean;
}>