import * as Match from "effect/Match";

type Workspace = {
  name: string;
  isArchived: boolean;
};

export const workspaceLabel = (workspace: Workspace): string =>
  Match.value(workspace.isArchived).pipe(
    Match.when(true, () => `${workspace.name} (archived)`),
    Match.when(false, () => workspace.name),
    Match.exhaustive,
  );

export const workspacePath = (workspace: Workspace): string => {
  return `/workspaces/${workspace.name}`;
};

export const workspaceSlug = (workspace: Workspace): string => {
  return workspace.name.toLowerCase().replaceAll(" ", "-");
};
