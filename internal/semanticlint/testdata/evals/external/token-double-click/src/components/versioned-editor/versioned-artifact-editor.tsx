import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { Markdown } from "@/components/ui/markdown";
import { authClient } from "@/lib/auth-client";
import { DisplayName } from "@/lib/display-name";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type VersionedEditorFile = {
  filename: string;
  content: string;
  order?: number;
};

export type VersionedEditorVersion = {
  _id: string;
  version: number;
  publishedAt: string;
  publishedBy?: string;
  deprecated?: boolean;
};

export type VersionedEditorDraft = {
  title: string;
  files: VersionedEditorFile[];
};

type SearchTarget = { field: "title" | "contents"; query: string } | null;

export type VersionedBrowserArtifact = {
  id: string;
  title: string;
  description?: string;
  retired?: boolean;
  currentVersion: number;
  currentPublishedAt?: string;
  currentPublishedBy?: string;
};

export const VERSIONED_LIST_DIVIDER_CLASS = "mx-2 border-b border-border";

export function versionedListItemClass(selected: boolean, className?: string) {
  return cn(
    "mx-2 flex w-[calc(100%-1rem)] flex-col justify-center rounded-2xl px-3 text-left transition-colors",
    selected && "bg-[color-mix(in_srgb,var(--color-accent)_15%,var(--color-surface))]",
    className,
  );
}

export function VersionedFileBrowser<TArtifact extends VersionedBrowserArtifact>({
  artifacts,
  selectedId,
  onSelectedIdChange,
  emptyMessage,
  renderDetail,
  renderCreateDetail,
}: {
  artifacts: TArtifact[];
  selectedId: string | null;
  onSelectedIdChange: (id: string) => void;
  emptyMessage: string;
  renderDetail: (artifact: TArtifact) => ReactNode;
  renderCreateDetail?: (onDone: (createdId?: string) => void) => ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const query = search.trim().toLocaleLowerCase();
  const visibleArtifacts = query
    ? artifacts.filter(
        (artifact) =>
          artifact.title.toLocaleLowerCase().includes(query) ||
          artifact.description?.toLocaleLowerCase().includes(query),
      )
    : artifacts;
  const selectedArtifact =
    visibleArtifacts.find((artifact) => artifact.id === selectedId) ?? visibleArtifacts[0] ?? null;

  useEffect(() => {
    if (creating) return;
    if (!selectedArtifact) return;
    if (selectedArtifact.id !== selectedId) onSelectedIdChange(selectedArtifact.id);
  }, [creating, onSelectedIdChange, selectedArtifact, selectedId]);

  if (artifacts.length === 0 && !creating) {
    return (
      <div className="grid h-full min-h-[36rem] gap-4 lg:min-h-0 lg:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col rounded-xl bg-background">
          <BrowserToolbar
            search={search}
            onSearchChange={setSearch}
            onCreateClick={renderCreateDetail ? () => setCreating(true) : undefined}
          />
          <div className="p-3 text-xs text-muted-foreground">{emptyMessage}</div>
        </div>
        <div className="relative flex min-h-0 flex-col overflow-hidden bg-background">
          {renderCreateDetail && creating
            ? renderCreateDetail((createdId) => {
                setCreating(false);
                if (createdId) onSelectedIdChange(createdId);
              })
            : null}
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-[36rem] gap-4 lg:min-h-0 lg:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col rounded-xl bg-background">
        <BrowserToolbar
          search={search}
          onSearchChange={setSearch}
          onCreateClick={renderCreateDetail ? () => setCreating(true) : undefined}
        />
        <div className="min-h-0 flex-1 overflow-y-auto">
          {visibleArtifacts.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">No files match your search.</div>
          ) : (
            visibleArtifacts.map((artifact, index) => {
              const selected = !creating && artifact.id === selectedArtifact?.id;
              const nextSelected =
                !creating && visibleArtifacts[index + 1]?.id === selectedArtifact?.id;
              return (
                <div key={artifact.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setCreating(false);
                      onSelectedIdChange(artifact.id);
                    }}
                    className={versionedListItemClass(selected, "h-20")}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="line-clamp-2 text-sm font-medium text-foreground">
                        {artifact.title}
                      </span>
                      {artifact.retired && (
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200">
                          retired
                        </span>
                      )}
                    </div>
                    <div className="mt-1 truncate text-[11px] text-muted-foreground">
                      v{artifact.currentVersion}
                      {artifact.currentPublishedAt ? (
                        <>
                          {" · "}
                          <DisplayName label={artifact.currentPublishedBy} />
                          {" · "}
                          {relativeTime(artifact.currentPublishedAt)}
                        </>
                      ) : null}
                    </div>
                    {artifact.description && (
                      <div className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                        {artifact.description}
                      </div>
                    )}
                  </button>
                  {index < visibleArtifacts.length - 1 && !selected && !nextSelected && (
                    <div className={VERSIONED_LIST_DIVIDER_CLASS} />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-background">
        {creating && renderCreateDetail
          ? renderCreateDetail((createdId) => {
              setCreating(false);
              if (createdId) onSelectedIdChange(createdId);
            })
          : selectedArtifact
            ? renderDetail(selectedArtifact)
            : null}
      </div>
    </div>
  );
}

function BrowserToolbar({
  search,
  onSearchChange,
  onCreateClick,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  onCreateClick?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 p-3">
      <Input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search files"
      />
      {onCreateClick && (
        <button
          type="button"
          onClick={onCreateClick}
          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
          aria-label="Create new file"
        >
          <HugeiconsIcon icon={PencilEdit02Icon} size={16} />
        </button>
      )}
    </div>
  );
}

export function VersionedArtifactEditor({
  title,
  files,
  filesLoading,
  versions,
  currentVersion,
  selectedVersion,
  onVersionChange,
  onSave,
  saving = false,
  titleEditable = true,
  canEdit = true,
  searchTarget = null,
  metadata,
  secondaryLabel = "Retire",
  onSecondaryClick,
  editLabel = "Edit Version",
  saveLabel = "Save Version",
  initialEditing = false,
}: {
  title: string;
  files: VersionedEditorFile[];
  filesLoading?: boolean;
  versions: VersionedEditorVersion[];
  currentVersion: number;
  selectedVersion: VersionedEditorVersion;
  onVersionChange: (version: number) => void;
  onSave: (draft: VersionedEditorDraft, author: string) => Promise<void>;
  saving?: boolean;
  titleEditable?: boolean;
  canEdit?: boolean;
  searchTarget?: SearchTarget;
  metadata?: ReactNode;
  secondaryLabel?: string;
  onSecondaryClick?: () => void;
  editLabel?: string;
  saveLabel?: string;
  initialEditing?: boolean;
}) {
  const { data: session } = authClient.useSession();
  const author = session?.user.email ?? null;
  const [editing, setEditing] = useState(initialEditing);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftContents, setDraftContents] = useState(formatEditableFiles(files));
  const titleRef = useRef<HTMLInputElement | null>(null);
  const contentsRef = useRef<HTMLTextAreaElement | null>(null);
  const initialContents = useMemo(() => formatEditableFiles(files), [files]);

  useEffect(() => {
    setEditing(initialEditing);
    setDraftTitle(title);
    setDraftContents(initialContents);
  }, [initialContents, initialEditing, selectedVersion._id, title]);

  useEffect(() => {
    if (!editing) return;
    const query = searchTarget?.query.trim();
    if (!query) return;

    const titleIndex = title.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
    const contentsIndex = initialContents.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
    const field = searchTarget?.field === "title" && titleIndex >= 0 ? "title" : "contents";
    const index = field === "title" ? titleIndex : contentsIndex;
    if (index < 0) return;

    requestAnimationFrame(() => {
      const input = field === "title" ? titleRef.current : contentsRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(index, index + query.length);
    });
  }, [editing, initialContents, searchTarget, title]);

  const hasChanges = titleEditable
    ? draftTitle !== title || draftContents !== initialContents
    : draftContents !== initialContents;
  const draftFiles = useMemo(() => getFilesForDraft(draftContents, files), [draftContents, files]);

  const runSave = async () => {
    if (!hasChanges || !author || saving) return;
    await onSave({ title: draftTitle.trim() || title, files: draftFiles }, author);
    setEditing(false);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
        {editing ? (
          <>
            <label className="flex min-h-[57px] items-center px-4 py-3">
              {titleEditable ? (
                <input
                  ref={titleRef}
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  placeholder="Untitled"
                  className="w-full bg-transparent text-lg font-semibold text-foreground outline-none"
                />
              ) : (
                <h2 className="line-clamp-2 text-lg font-semibold leading-6 text-foreground">
                  {title}
                </h2>
              )}
            </label>
            <label className="block min-h-0 flex-1">
              <span className="sr-only">File contents</span>
              <textarea
                ref={contentsRef}
                value={draftContents}
                onChange={(event) => setDraftContents(event.target.value)}
                placeholder="Write contents here..."
                className="h-full min-h-80 w-full resize-none bg-background px-4 pb-24 pt-3 font-mono text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground lg:min-h-0"
              />
            </label>
          </>
        ) : (
          <>
            <div className="flex min-h-[57px] items-center px-4 py-3">
              <div className="min-w-0">
                <h2 className="line-clamp-2 text-lg font-semibold leading-6 text-foreground">
                  {title}
                </h2>
                <VersionMetadataLine version={selectedVersion} />
              </div>
            </div>
            {metadata}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-24 pt-5">
              {filesLoading ? (
                <p className="text-sm text-muted-foreground">Loading files...</p>
              ) : files.length === 0 ? (
                <p className="text-sm text-muted-foreground">No files attached to this version.</p>
              ) : (
                <Markdown
                  className="max-w-4xl text-sm leading-6 text-muted-foreground"
                  highlight={searchTarget?.field === "contents" ? searchTarget.query : null}
                >
                  {formatMarkdownPreview(files)}
                </Markdown>
              )}
            </div>
          </>
        )}
      </div>
      <VersionCommandDock
        versions={versions}
        currentVersion={currentVersion}
        selectedVersion={selectedVersion}
        onVersionChange={(version) => {
          setEditing(false);
          onVersionChange(version);
        }}
        primaryLabel={editing ? (saving ? "Saving..." : saveLabel) : editLabel}
        primaryDisabled={editing && (!hasChanges || !author || saving)}
        onPrimaryClick={() => {
          if (!canEdit) return;
          if (editing) {
            void runSave();
          } else {
            setEditing(true);
          }
        }}
        secondaryLabel={secondaryLabel}
        onSecondaryClick={onSecondaryClick}
      />
    </div>
  );
}

export function VersionMetadataLine({ version }: { version: VersionedEditorVersion }) {
  return (
    <div className="mt-1 truncate text-[11px] text-muted-foreground">
      <DisplayName label={version.publishedBy} /> · {relativeTime(version.publishedAt)}
    </div>
  );
}

function VersionCommandDock({
  versions,
  currentVersion,
  selectedVersion,
  onVersionChange,
  primaryLabel,
  primaryDisabled,
  onPrimaryClick,
  secondaryLabel,
  onSecondaryClick,
}: {
  versions: VersionedEditorVersion[];
  currentVersion: number;
  selectedVersion: VersionedEditorVersion;
  onVersionChange: (version: number) => void;
  primaryLabel: string;
  primaryDisabled?: boolean;
  onPrimaryClick: () => void;
  secondaryLabel: string;
  onSecondaryClick?: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-2 px-4">
      <div className="pointer-events-auto flex items-center rounded-2xl border border-border bg-surface shadow-lg">
        <VersionSelector
          versions={versions}
          currentVersion={currentVersion}
          selectedVersion={selectedVersion}
          onVersionChange={onVersionChange}
        />
        <FooterActionButton variant="primary" disabled={primaryDisabled} onClick={onPrimaryClick}>
          {primaryLabel}
        </FooterActionButton>
      </div>
      <div className="pointer-events-auto">
        <FooterActionButton variant="destructive" onClick={onSecondaryClick}>
          {secondaryLabel}
        </FooterActionButton>
      </div>
    </div>
  );
}

function FooterActionButton({
  variant,
  disabled,
  onClick,
  children,
}: {
  variant: "primary" | "destructive";
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40",
        variant === "primary" && "w-30 text-foreground hover:text-accent",
        variant === "destructive" &&
          "h-11 border border-border bg-surface text-destructive shadow-lg hover:bg-surface-hover",
      )}
    >
      {children}
    </button>
  );
}

function VersionSelector({
  versions,
  currentVersion,
  selectedVersion,
  onVersionChange,
}: {
  versions: VersionedEditorVersion[];
  currentVersion: number;
  selectedVersion: VersionedEditorVersion;
  onVersionChange: (version: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const sortedVersions = versions.slice().sort((a, b) => b.version - a.version);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={pickerRef} className="relative">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: 6, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 6, scale: 0.98 }}
            transition={{ duration: 0.09, ease: "easeOut" }}
            className="absolute bottom-full left-0 mb-2 w-full origin-bottom overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
          >
            {sortedVersions.map((version) => (
              <button
                key={version._id}
                type="button"
                onClick={() => {
                  onVersionChange(version.version);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-center rounded-2xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover",
                  version.version === selectedVersion.version && "bg-primary/10 text-primary",
                )}
              >
                v{version.version}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex h-11 items-center justify-center rounded-2xl bg-surface-hover px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary",
          open && "bg-surface-hover",
        )}
      >
        v{selectedVersion.version}
        {selectedVersion.version !== currentVersion && selectedVersion.deprecated ? "" : ""}
      </button>
    </div>
  );
}

export function formatPublishedBy(publishedBy: string | undefined) {
  if (!publishedBy || publishedBy === "ui") return "Unknown author";
  return publishedBy;
}

export function formatFileTitle(filename: string) {
  return filename
    .replace(/\.md$/i, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatEditableFiles(files: VersionedEditorFile[]) {
  return files
    .slice()
    .sort(compareFiles)
    .map((file) => `# ${formatFileTitle(file.filename)}\n\n${file.content}`)
    .join("\n\n---\n\n");
}

function formatMarkdownPreview(files: VersionedEditorFile[]) {
  return files
    .slice()
    .sort(compareFiles)
    .map((file) => stripFrontmatter(file.content))
    .join("\n\n---\n\n");
}

function getFilesForDraft(contents: string, sourceFiles: VersionedEditorFile[]) {
  const cleanSourceFiles = sourceFiles.filter((file) => file.filename !== "__loading__");

  if (cleanSourceFiles.length <= 1) {
    return [
      {
        filename: cleanSourceFiles[0]?.filename ?? "content.md",
        content: parseEditableFileSection(contents).content,
        order: cleanSourceFiles[0]?.order ?? 0,
      },
    ];
  }

  const sections = contents
    .split(/\n\s*---\s*\n/g)
    .map((section) => section.trim())
    .filter(Boolean);

  if (sections.length === 0) {
    return [
      {
        filename: cleanSourceFiles[0]?.filename ?? "content.md",
        content: "",
        order: cleanSourceFiles[0]?.order ?? 0,
      },
    ];
  }

  return sections.map((section, index) => {
    const source = cleanSourceFiles[index];
    const parsed = parseEditableFileSection(section);
    const fallbackTitle = parsed.title ?? "content";
    return {
      filename: source?.filename ?? `${slugifyFilename(fallbackTitle)}.md`,
      content: parsed.content,
      order: source?.order ?? index,
    };
  });
}

function parseEditableFileSection(section: string) {
  const match = section.match(/^#\s+(.+?)\n{2,}([\s\S]*)$/);
  if (!match) return { title: null, content: section };
  return { title: match[1]?.trim() || null, content: match[2] ?? "" };
}

function stripFrontmatter(markdown: string) {
  return markdown.replace(/^---\n[\s\S]*?\n---\n*/, "").trim();
}

function slugifyFilename(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "content";
}

function compareFiles(a: VersionedEditorFile, b: VersionedEditorFile) {
  const orderDiff = (a.order ?? 0) - (b.order ?? 0);
  if (orderDiff !== 0) return orderDiff;
  return a.filename.localeCompare(b.filename);
}
