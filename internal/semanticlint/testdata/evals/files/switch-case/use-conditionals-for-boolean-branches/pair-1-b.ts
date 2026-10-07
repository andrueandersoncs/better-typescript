type Workspace = {
  name: string;
  isArchived: boolean;
};

export const workspaceLabel = (workspace: Workspace): string =>
  workspace.isArchived ? `${workspace.name} (archived)` : workspace.name;

export const workspacePath = (workspace: Workspace): string => {
  return `/workspaces/${workspace.name}`;
};

export const workspaceSlug = (workspace: Workspace): string => {
  return workspace.name.toLowerCase().replaceAll(" ", "-");
};
