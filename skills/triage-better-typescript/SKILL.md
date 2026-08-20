---
name: triage-better-typescript
description: >
  Diagnose Better TypeScript output that appears wrong, missing, confusing, or broken from a
  supplied TypeScript sample. Use for suspected false positives, false negatives, wrong locations or
  messages, crashes, configuration surprises, and other unsatisfactory Better TypeScript results.
---

# Triage Better TypeScript

Diagnose the reported result before changing the user's code. Produce a minimal, repeatable finding
that separates a product defect from configuration, project loading, and policy disagreement.

## Collect the case

Require these inputs:

- the smallest available TypeScript sample;
- the expected result and why;
- the exact Better TypeScript command;
- stdout, stderr, and exit code;
- `bunx better-typescript --version` and `bun --version`;
- the relevant `better-typescript.config.ts`, `tsconfig.json` chain, imports, and dependency
  versions.

Ask only for missing inputs that block reproduction. Type-aware rules need resolvable imports and
compiler options, so preserve them when the sample depends on type information.

## Preserve the evidence

Record the original sample and command before experimentation. Run read-only checks in the user's
project. Perform edits and minimization in a temporary copy, not in the original source. Keep
private code local and replace unrelated names or values before preparing anything public.

## Reproduce

1. Run the exact command and capture stdout, stderr, and exit code separately.
2. Remember that violations are NDJSON on stdout, status and operational errors are on stderr, exit
   `0` means analysis completed even with violations, and exit `2` means an operational failure.
3. If only an inline sample is available, create a temporary TypeScript project with the reported
   Better TypeScript version, compiler options, config, and required dependencies.
4. Confirm whether the observed result repeats unchanged. Stop and report `not reproduced` when it
   does not.

## Isolate

When a violation names a rule, isolate it in the temporary project:

```ts
import { defineConfig } from "@better-typescript/core/config"

export default defineConfig([
  {
    files: ["src/**/*.ts"],
    rules: { "*": "off", "rule-name": "error" }
  }
])
```

Replace `rule-name` with the reported rule. Reduce files, declarations, dependencies, and compiler
options one at a time. Keep a reduction only when the same result remains. Compare configuration
variants only when they test a specific hypothesis. The final reproduction must still show the
original problem with one command.

## Classify

Choose exactly one classification:

- **Operational failure:** installation, runtime, config import, project discovery, or TypeScript
  loading failed.
- **Configuration:** rule level, file glob, entry order, or project root explains the result.
- **Detector defect:** a reproducible false positive, false negative, wrong location, duplicate, or
  factually incorrect message remains after isolation.
- **Policy disagreement:** the rule detects what it claims, but the user rejects the convention or
  advice.
- **Not reproduced:** the supplied evidence does not reproduce the result.

Use evidence from the isolated run. Do not label a policy disagreement as a detector defect.

## Give the next action

Report:

```text
Classification: <one classification>
Rule: <rule name or none>
Reproduction: <files and exact command>
Expected: <expected result>
Observed: <stdout, stderr, and exit code>
Cause: <evidence-backed explanation>
Workaround: <smallest safe workaround or none>
Issue-ready: <yes or no, with missing evidence>
```

For a policy disagreement, show a config override. If no config exists, retain the other built-ins
with a base `{ files: ["**/*.ts"], rules: { "*": "error" } }` entry before a later rule-specific
`"off"` entry. If a config exists, add the override after the entry that enables the rule.

For a detector defect, include the minimized files, package versions, exact command, expected and
actual output, and why the output is wrong. Open a GitHub issue only when the user asks or approves
that external action.
