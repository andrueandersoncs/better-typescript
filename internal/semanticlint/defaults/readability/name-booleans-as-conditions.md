---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Name booleans as conditions

Apply this policy to every boolean the file names: variables, constants, parameters, interface and object fields, and state entries. A value is boolean when it is annotated `boolean` or inferred from a comparison, `!`, `&&`/`||` of conditions, or a predicate call such as `isActive(...)`, `has(...)`, `some(...)`, or `yield* toggles.isOn(...)`.

Its name should read as a true-or-false condition, usually with a prefix like `is`, `has`, `can`, `should`, or `was`: `isValid`, `hasPermission`, `isOpen`, `isBetaOn`. Report any of these shapes:

- a noun naming a thing rather than a condition, such as `permission`, `status`, or `const report = await checker.isAllowed(id)`;
- a bare adjective or participle used as a state field or variable, such as `readonly open: boolean`, `valid`, `loaded`, or `const beta = toggles.isOn(name)`, where `isOpen`, `isValid`, `isLoaded`, or `isBetaOn` states the condition;
- a name whose prefix promises a condition other than the one computed.

Do not report a boolean whose name already states its condition, such as `canRetry` or `hasAccess`. Do not report names fixed by an external contract: DOM attributes and JSX props like `disabled` or `checked`, third-party option keys like `recursive`, or wire-format fields.
