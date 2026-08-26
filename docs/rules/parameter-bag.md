# parameter-bag

## What it does

Reports an object literal created directly at a call site when the matching parameter has a named model type. It checks named functions, methods, arrow functions, and function expressions.

The rule allows an existing model value to cross the call seam. Tested limits also allow calls to an anonymous default function and parameters whose object type is inferred instead of named.

## When to use it

Use this rule to find parameter bags that exist only to move data through a shallow function seam. Prefer an existing domain value, a deeper function, or a command with its own meaning. Do not replace the model with primitive parameters or an anonymous object type.

## Conformant

Create and reuse a genuine typed value instead of assembling it only for the call.

```ts
interface TaskCommand {
  task: string;
  priority: number;
}

const runTask = (command: TaskCommand): string => command.task;
const command: TaskCommand = { task: "clean", priority: 2 };

export const clean = runTask(command);
```

An inferred parameter object is also outside this rule's checked limit.

```ts
const runInferred = (command = { task: "" }): string => command.task;

export const clean = runInferred({ task: "work" });
```

## Non-conformant

The named model is constructed only to cross the `runTask` call seam.

```ts
interface TaskCommand {
  task: string;
  priority: number;
}

const runTask = (command: TaskCommand): string => command.task;

export const bad = runTask({ task: "work", priority: 1 });
```
