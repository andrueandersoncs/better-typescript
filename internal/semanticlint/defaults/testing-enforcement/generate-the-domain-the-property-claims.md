---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Generate the domain the property claims

Report a property test when its stated domain has a material relevant class that its generator cannot produce. For example, a property claiming behavior for malformed wire input but generating only valid `Order` values, or claiming boundary behavior while omitting that boundary.

Do not report omitted partitions irrelevant to the stated law. A valid-domain generator is enough for a property limited to valid values; it does not establish behavior for malformed wire input.
