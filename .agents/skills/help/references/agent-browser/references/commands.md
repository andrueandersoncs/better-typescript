# Core commands

These examples use `<task-id>` for the unique session chosen by the workflow. Replace it consistently. Refs are illustrative; read actual snapshot output before choosing one. Check the installed CLI's help before using additional flags.

## Navigate and inspect

```sh
agent-browser --session <task-id> open https://example.com
agent-browser --session <task-id> snapshot -i
agent-browser --session <task-id> snapshot
agent-browser --session <task-id> snapshot -s "main"
agent-browser --session <task-id> get url
agent-browser --session <task-id> get title
agent-browser --session <task-id> get text @e1
```

## Interact and wait

```sh
agent-browser --session <task-id> fill @e2 "Requested value"
agent-browser --session <task-id> click @e3
agent-browser --session <task-id> select @e4 "option-value"
agent-browser --session <task-id> check @e5
agent-browser --session <task-id> press Enter
agent-browser --session <task-id> wait --url "**/complete"
agent-browser --session <task-id> wait --text "Saved"
agent-browser --session <task-id> snapshot -i
```

Select the command needed for the current step; this block is not a script to run as a batch. A changing page requires fresh refs between actions. Semantic locators such as `find role button click --name "Save"` can target a label observed on the page without retaining a ref.

## Capture evidence

```sh
agent-browser --session <task-id> set viewport 1280 800
agent-browser --session <task-id> screenshot --full ./page.png
agent-browser --session <task-id> screenshot --annotate ./page-annotated.png
agent-browser --session <task-id> console
agent-browser --session <task-id> errors
agent-browser --session <task-id> network requests
agent-browser --session <task-id> close
```

Record the viewport and page state with captures. An empty log is evidence only for the interval and events actually collected.

For complex DOM reads, pass JavaScript through a quoted heredoc so the shell cannot expand page text or expressions:

```sh
agent-browser --session <task-id> eval --stdin <<'JS'
JSON.stringify(Array.from(document.querySelectorAll('h2'), el => el.textContent))
JS
```

Use DOM reads to extract observed content, not to bypass an interaction whose behavior is under test.

## Additional capabilities

On versions with `skills`, use `agent-browser skills list` and load only the relevant installed guide. `skills get core --full` includes command references and templates; load it only when the shorter guide is insufficient. Electron, cloud-browser, authentication, and recording tasks need version-matched guidance and the task's existing access constraints. Those guides do not replace the selected QA, design, or engineering owner.

This command subset is adapted from the [upstream core guide and references](sources.md).
