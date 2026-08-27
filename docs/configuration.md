# Configuration

Add `better-typescript.json` to the project root to select rules by file:

```json
{
  "commands": [
    {
      "type": "add_inclusions",
      "files": "src/**/*.ts",
      "rules": ["no-throw", "no-error-type"]
    },
    {
      "type": "add_exclusions",
      "files": "src/**/*.test.ts",
      "rules": "no-throw"
    }
  ]
}
```

All rules are the default. Each command contains a `type`, `files`, and `rules`. `type` must be `add_inclusions` or `add_exclusions`. `rules` accepts one rule name or a list. A matching `add_inclusions` replaces the active rule set. A matching `add_exclusions` removes those rules from the active set. Commands apply in order, so a later `add_inclusions` can include an excluded rule again. Globs are relative to the project root.

`--files` limits which configured files are analyzed. An explicit `--rules` value applies those rules to every selected file and ignores `better-typescript.json`.

## Output

The command writes `Analyzing <absolute current directory>.` to stderr. It writes one violation per stdout line as NDJSON:

```json
{"ruleName":"no-throw","level":"error","message":"Avoid throwing errors with throw. Return a typed error through Effect instead.","filePath":"src/main.ts","line":4,"column":3}
```

Paths are current-directory-relative slash paths. Locations are one-based UTF-16 positions. Output is exactly deduplicated and deterministic. A completed analysis exits successfully even when violations exist.

Selected rules use `error` level. Unknown rule names and invalid configuration fail before analysis. There is no plugin API or JavaScript API.
