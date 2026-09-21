# Configuration

Add `better-typescript.json` to the project root to select rules by file:

```json
{
  "commands": [
    {
      "type": "add_exclusions",
      "files": "src/**/*.ts",
      "rules": ["no-throw", "no-error-type"]
    },
    {
      "type": "add_inclusions",
      "files": "src/legacy/**/*.ts",
      "rules": "no-throw"
    },
    {
      "mode": "semantic",
      "type": "add_exclusions",
      "files": "generated/**",
      "rules": "*"
    }
  ]
}
```

All rules are on by default. Each command contains a `type`, `files`, and `rules`. Matching `add_exclusions` commands turn the named rules off. Matching `add_inclusions` commands turn the named rules back on. Commands apply in order.

`mode` defaults to `deterministic`, preserving existing configuration. Use `"mode": "semantic"` to modify semantic policies instead. Semantic rule selection does not remove files from supporting evidence. Globs are relative to the project root.

Use `"rules": "*"` by itself to address every rule in the command's mode. For example, a semantic `add_exclusions` wildcard prevents direct semantic review of matching files while retaining them as supporting evidence.

`--files` limits which files are analyzed. An explicit `--rules` value skips configured commands for the invoked mode.

## Output

The command writes `Analyzing <absolute current directory>.` to stderr. It writes one violation per stdout line as NDJSON:

```json
{"ruleName":"no-throw","level":"error","message":"Avoid throwing errors with throw. Return a typed error through Effect instead.","filePath":"src/main.ts","line":4,"column":3}
```

Paths are current-directory-relative slash paths. Locations are one-based UTF-16 positions. Output is exactly deduplicated and deterministic. The command exits `1` when it emits an error-level violation and `0` when analysis completes without errors.

Selected rules use `error` level. Unknown rule names and invalid configuration fail before analysis. There is no plugin API or JavaScript API.
