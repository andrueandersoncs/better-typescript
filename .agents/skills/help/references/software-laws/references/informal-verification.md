# Informal Software-Law Verification

Use this method to assess whether one law is supported in a concrete case. Treat the result as evidence about that case, not proof of a universal law.

## Inputs

- **Case:** A named project or decision.
- **Period:** The time period to inspect.
- **Comparison:** An optional earlier period or similar case.

## Method

1. Read the law's exact wording and context.
2. Before inspecting evidence, state the observable pattern the law predicts for this case.
3. Inspect direct artifacts such as code, commits, issues, decision records, usage data, logs, tests, interviews, and measurements.
4. Compare before and after, or against a similar case, when useful.
5. Deliberately search for counterexamples and other explanations.
6. Separate observations from inferences.

## Output

Return:

- **Verdict:** `Supported`, `Not supported`, or `Inconclusive for this case`.
- **Expected pattern:** The concrete prediction tested.
- **Strongest evidence:** The most direct supporting observation.
- **Strongest counterevidence:** The strongest conflicting observation.
- **Main gap:** The missing evidence that most limits confidence.
