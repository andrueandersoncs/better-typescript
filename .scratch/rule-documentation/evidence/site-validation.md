# DOC-15 site validation

Result: **PASS**

Repository: `/Users/andrueanderson/Workspace/better-typescript`

## Catalog sets, links, and page structure

Command:

```sh
cd /Users/andrueanderson/Workspace/better-typescript
python3 - <<'PY'
from pathlib import Path
import re

root = Path(".")
catalog_path = root / "docs/rules.md"
catalog_text = catalog_path.read_text()
link_re = re.compile(r"^- \[`([^`]+)`\]\(([^)]+)\)$", re.MULTILINE)
links = link_re.findall(catalog_text)
bullet_lines = [line for line in catalog_text.splitlines() if line.startswith("- ")]
assert len(bullet_lines) == len(links), "catalog contains a malformed or non-rule bullet"
labels = [label for label, _ in links]
targets = [target for _, target in links]
target_slugs = []
for label, target in links:
    match = re.fullmatch(r"\./rules/([a-z0-9-]+)\.md", target)
    if match is None:
        raise AssertionError(f"invalid catalog target for {label}: {target}")
    target_slugs.append(match.group(1))
    if match.group(1) != label:
        raise AssertionError(f"label/target mismatch: {label} -> {target}")

packages = sorted(
    path.name.replace("_", "-")
    for path in (root / "internal/rules").iterdir()
    if path.is_dir()
)
pages = sorted(path.stem for path in (root / "docs/rules").glob("*.md"))

assert len(labels) == 131, f"catalog count: {len(labels)}"
assert len(set(labels)) == 131, "duplicate catalog labels"
assert labels == sorted(labels), "catalog labels are not sorted"
assert len(targets) == 131, f"target count: {len(targets)}"
assert len(set(targets)) == 131, "duplicate catalog targets"
assert len(packages) == 131, f"package count: {len(packages)}"
assert len(set(packages)) == 131, "duplicate normalized packages"
assert len(pages) == 131, f"page count: {len(pages)}"
assert len(set(pages)) == 131, "duplicate page names"
assert set(labels) == set(target_slugs) == set(packages) == set(pages), (
    "set mismatch",
    sorted(set(labels) ^ set(target_slugs)),
    sorted(set(labels) ^ set(packages)),
    sorted(set(labels) ^ set(pages)),
)
for target in targets:
    assert (root / "docs" / target.removeprefix("./")).is_file(), f"broken catalog link: {target}"

required = [
    "## What it does",
    "## When to use it",
    "## Conformant",
    "## Non-conformant",
]
for slug in labels:
    path = root / "docs/rules" / f"{slug}.md"
    text = path.read_text()
    lines = text.splitlines()
    nonempty = [line for line in lines if line.strip()]
    title = f"# {slug}"
    assert nonempty and nonempty[0] == title, f"{slug}: incorrect first title"
    h1_lines = [line for line in lines if line.startswith("# ")]
    assert h1_lines == [title], f"{slug}: title count/content: {h1_lines}"
    h2_lines = [line for line in lines if line.startswith("## ")]
    assert h2_lines == required, f"{slug}: H2 headings are {h2_lines}"
    positions = []
    for heading in required:
        found = [i for i, line in enumerate(lines) if line == heading]
        assert len(found) == 1, f"{slug}: {heading!r} count is {len(found)}"
        positions.append(found[0])
    assert positions == sorted(positions), f"{slug}: required headings out of order"

    conformant = "\n".join(lines[positions[2] + 1 : positions[3]])
    nonconformant = "\n".join(lines[positions[3] + 1 :])
    fence_re = re.compile(r"^```ts[ \t]*\n.*?^```[ \t]*$", re.MULTILINE | re.DOTALL)
    assert fence_re.search(conformant), f"{slug}: no closed ts fence under Conformant"
    assert fence_re.search(nonconformant), f"{slug}: no closed ts fence under Non-conformant"

print("PASS deterministic set, catalog-link, and page-structure validation")
print(f"catalog labels: {len(labels)} (unique: {len(set(labels))}, sorted: yes)")
print(f"catalog targets: {len(target_slugs)} (unique: {len(set(target_slugs))}, label matches: yes, files exist: yes)")
print(f"normalized rule packages: {len(packages)} (unique: {len(set(packages))})")
print(f"rule pages: {len(pages)} (unique: {len(set(pages))})")
print("four-way set equality: yes")
print("page structure: 131/131 exact titles; exactly four required H2 headings once and in order; closed ts fences in both example sections")
PY
```

Result: exit 0.

```text
PASS deterministic set, catalog-link, and page-structure validation
catalog labels: 131 (unique: 131, sorted: yes)
catalog targets: 131 (unique: 131, label matches: yes, files exist: yes)
normalized rule packages: 131 (unique: 131)
rule pages: 131 (unique: 131)
four-way set equality: yes
page structure: 131/131 exact titles; exactly four required H2 headings once and in order; closed ts fences in both example sections
```

This also proves every source catalog target exists. No catalog link is broken.

## VitePress build

Command:

```sh
cd /Users/andrueanderson/Workspace/better-typescript
bun run docs:build
```

Result: exit 0.

```text
$ vitepress build docs
vitepress v1.6.4
✓ building client + server bundles...
✓ rendering pages...
build complete in 3.55s.
```

VitePress reported no broken link. The only stderr note was Node's warning that `NO_COLOR` is ignored because `FORCE_COLOR` is set.

## Rendered VitePress routes

Command, run after the build:

```sh
cd /Users/andrueanderson/Workspace/better-typescript
python3 - <<'PY'
from pathlib import Path
import re
from urllib.parse import urljoin

root = Path(".")
dist = root / "docs/.vitepress/dist"
catalog_source = (root / "docs/rules.md").read_text()
slugs = re.findall(r"^- \[`([^`]+)`\]\(\./rules/[^)]+\)$", catalog_source, re.MULTILINE)
assert len(slugs) == 131, f"source catalog routes: {len(slugs)}"

catalog_route = dist / "rules.html"
assert catalog_route.is_file(), "missing rendered catalog route: docs/.vitepress/dist/rules.html"
html = catalog_route.read_text()
rendered = re.findall(r'<a href="(\./rules/([a-z0-9-]+)\.html)"><code>([^<]+)</code></a>', html)
assert len(rendered) == 131, f"rendered catalog links: {len(rendered)}"
assert [label for _, _, label in rendered] == slugs, "rendered catalog labels/order mismatch"
assert [slug for _, slug, _ in rendered] == slugs, "rendered catalog targets/order mismatch"

for href, slug, label in rendered:
    assert label == slug, f"rendered label/target mismatch: {label} -> {href}"
    public_route = urljoin("/better-typescript/rules.html", href)
    expected_route = f"/better-typescript/rules/{slug}.html"
    assert public_route == expected_route, f"public route mismatch: {public_route} != {expected_route}"
    output = dist / "rules" / f"{slug}.html"
    assert output.is_file(), f"missing rendered rule route: {output}"

rendered_pages = sorted(path.stem for path in (dist / "rules").glob("*.html"))
assert rendered_pages == sorted(slugs), "rendered rule route set mismatch"
print("PASS rendered VitePress route validation")
print("rendered catalog route: docs/.vitepress/dist/rules.html")
print("rendered catalog links: 131/131 labels and targets match")
print("rendered rule routes: 131/131 files exist under docs/.vitepress/dist/rules/")
print("public route resolution: 131/131 under /better-typescript/rules/<slug>.html")
PY
```

Result: exit 0.

```text
PASS rendered VitePress route validation
rendered catalog route: docs/.vitepress/dist/rules.html
rendered catalog links: 131/131 labels and targets match
rendered rule routes: 131/131 files exist under docs/.vitepress/dist/rules/
public route resolution: 131/131 under /better-typescript/rules/<slug>.html
```

## Repository check

Command:

```sh
cd /Users/andrueanderson/Workspace/better-typescript
./scripts/check.sh
```

Result: exit 0.

```text
format
tidy
npm install
bun install v1.4.0 (34cbb9a40)
Checked 131 installs across 179 packages (no changes) [55.00ms]
docs
vitepress v1.6.4
✓ building client + server bundles...
✓ rendering pages...
build complete in 2.49s.
compiler provenance
vet
test
build
vulnerabilities
No vulnerabilities found.
```

The nested VitePress build also reported no broken link. It emitted the same harmless `NO_COLOR`/`FORCE_COLOR` Node warning.

## Diff and changed-file scope

Command:

```sh
cd /Users/andrueanderson/Workspace/better-typescript
git diff --check
```

Result: exit 0 with no output.

Command:

```sh
cd /Users/andrueanderson/Workspace/better-typescript
python3 - <<'PY'
from pathlib import Path
import subprocess

root = Path(".")
result = subprocess.run(
    ["git", "status", "--porcelain=v1", "-z", "--untracked-files=all"],
    cwd=root,
    check=True,
    capture_output=True,
)
entries = [entry.decode() for entry in result.stdout.split(b"\0") if entry]
paths = []
for entry in entries:
    status = entry[:2]
    assert "R" not in status and "C" not in status, f"unexpected rename/copy status: {entry}"
    paths.append(entry[3:])

def allowed(path):
    return (
        path == "docs/rules.md"
        or (path.startswith("docs/rules/") and path.endswith(".md"))
        or path == "docs/.vitepress/config.mts"
        or path == ".scratch/rule-documentation/project.md"
        or path.startswith(".scratch/rule-documentation/evidence/")
    )

outside = sorted(path for path in paths if not allowed(path))
assert not outside, f"changed paths outside DOC-15 allowance: {outside}"
rule_pages = [path for path in paths if path.startswith("docs/rules/") and path.endswith(".md")]
assert len(rule_pages) == 131, f"changed rule page count: {len(rule_pages)}"
assert "docs/rules.md" in paths, "catalog is not present in candidate changes"
config_changed = "docs/.vitepress/config.mts" in paths
print("PASS changed-file scope validation")
print(f"changed paths inspected: {len(paths)}")
print("catalog: docs/rules.md")
print(f"rule pages: {len(rule_pages)} under docs/rules/")
print(f"site config changed: {'yes' if config_changed else 'no'}")
print("project/evidence records: allowed only under .scratch/rule-documentation/")
print("paths outside allowance: 0")
PY
```

Result: exit 0.

```text
PASS changed-file scope validation
changed paths inspected: 134
catalog: docs/rules.md
rule pages: 131 under docs/rules/
site config changed: no
project/evidence records: allowed only under .scratch/rule-documentation/
paths outside allowance: 0
```

The scope check includes tracked and untracked files. The complete candidate has no changed file outside the allowed catalog, rule pages, optional site config, and `.scratch/rule-documentation/` records. The site config is unchanged.

## Validator write scope

This validator wrote only `.scratch/rule-documentation/evidence/site-validation.md`. It did not edit candidate pages or shared site files.


---

## Final rerun — 2026-08-26T21:00:39Z

Final rerun result: **PASS**

This rerun used the corrected final candidate. It preserves the historical PASS above. Terminal ANSI color escapes are omitted from captured output below. No failure or blocker occurred.

### Final deterministic sets, catalog links, and page contract

Command:

```sh
cd /Users/andrueanderson/Workspace/better-typescript
python3 - <<'PY'
from pathlib import Path
import re

root = Path(".")
catalog_path = root / "docs/rules.md"
catalog_text = catalog_path.read_text()
link_re = re.compile(r"^- \[`([^`]+)`\]\(([^)]+)\)$", re.MULTILINE)
links = link_re.findall(catalog_text)
bullet_lines = [line for line in catalog_text.splitlines() if line.startswith("- ")]
assert len(bullet_lines) == len(links), "catalog contains a malformed or non-rule bullet"
labels = [label for label, _ in links]
targets = [target for _, target in links]
target_slugs = []
for label, target in links:
    match = re.fullmatch(r"\./rules/([a-z0-9-]+)\.md", target)
    if match is None:
        raise AssertionError(f"invalid catalog target for {label}: {target}")
    target_slugs.append(match.group(1))
    if match.group(1) != label:
        raise AssertionError(f"label/target mismatch: {label} -> {target}")

packages = sorted(
    path.name.replace("_", "-")
    for path in (root / "internal/rules").iterdir()
    if path.is_dir()
)
pages = sorted(path.stem for path in (root / "docs/rules").glob("*.md"))

assert len(labels) == 131, f"catalog count: {len(labels)}"
assert len(set(labels)) == 131, "duplicate catalog labels"
assert labels == sorted(labels), "catalog labels are not sorted"
assert len(targets) == 131, f"target count: {len(targets)}"
assert len(set(targets)) == 131, "duplicate catalog targets"
assert len(packages) == 131, f"package count: {len(packages)}"
assert len(set(packages)) == 131, "duplicate normalized packages"
assert len(pages) == 131, f"page count: {len(pages)}"
assert len(set(pages)) == 131, "duplicate page names"
assert set(labels) == set(target_slugs) == set(packages) == set(pages), (
    "set mismatch",
    sorted(set(labels) ^ set(target_slugs)),
    sorted(set(labels) ^ set(packages)),
    sorted(set(labels) ^ set(pages)),
)
for target in targets:
    assert (root / "docs" / target.removeprefix("./")).is_file(), f"broken catalog link: {target}"

required = [
    "## What it does",
    "## When to use it",
    "## Conformant",
    "## Non-conformant",
]
for slug in labels:
    path = root / "docs/rules" / f"{slug}.md"
    text = path.read_text()
    lines = text.splitlines()
    nonempty = [line for line in lines if line.strip()]
    title = f"# {slug}"
    assert nonempty and nonempty[0] == title, f"{slug}: incorrect first title"
    h1_lines = [line for line in lines if line.startswith("# ")]
    assert h1_lines == [title], f"{slug}: title count/content: {h1_lines}"
    h2_lines = [line for line in lines if line.startswith("## ")]
    assert h2_lines == required, f"{slug}: H2 headings are {h2_lines}"
    positions = []
    for heading in required:
        found = [i for i, line in enumerate(lines) if line == heading]
        assert len(found) == 1, f"{slug}: {heading!r} count is {len(found)}"
        positions.append(found[0])
    assert positions == sorted(positions), f"{slug}: required headings out of order"

    conformant = "\n".join(lines[positions[2] + 1 : positions[3]])
    nonconformant = "\n".join(lines[positions[3] + 1 :])
    fence_re = re.compile(r"^```ts[ \t]*\n.*?^```[ \t]*$", re.MULTILINE | re.DOTALL)
    assert fence_re.search(conformant), f"{slug}: no closed ts fence under Conformant"
    assert fence_re.search(nonconformant), f"{slug}: no closed ts fence under Non-conformant"

print("PASS deterministic set, catalog-link, and page-structure validation")
print(f"catalog labels: {len(labels)} (unique: {len(set(labels))}, sorted: yes)")
print(f"catalog targets: {len(target_slugs)} (unique: {len(set(target_slugs))}, label matches: yes, files exist: yes)")
print(f"normalized rule packages: {len(packages)} (unique: {len(set(packages))})")
print(f"rule pages: {len(pages)} (unique: {len(set(pages))})")
print("four-way set equality: yes")
print("page structure: 131/131 exact titles; exactly four required H2 headings once and in order; closed ts fences in both example sections")
PY
```

Result: exit 0.

```text
PASS deterministic set, catalog-link, and page-structure validation
catalog labels: 131 (unique: 131, sorted: yes)
catalog targets: 131 (unique: 131, label matches: yes, files exist: yes)
normalized rule packages: 131 (unique: 131)
rule pages: 131 (unique: 131)
four-way set equality: yes
page structure: 131/131 exact titles; exactly four required H2 headings once and in order; closed ts fences in both example sections
```

This proves that the 131 catalog slugs are complete, unique, and sorted. It also proves four-way equality among catalog labels, catalog targets, normalized rule package names, and page names. Every catalog target exists. All 131 pages satisfy the title, heading, heading order, heading count, and TypeScript fence contract.

### Final VitePress build

Command:

```sh
cd /Users/andrueanderson/Workspace/better-typescript
bun run docs:build
```

Result: exit 0.

Captured stdout:

```text

  vitepress v1.6.4

build complete in 1.91s.
```

Captured stderr:

```text
$ vitepress build docs
(node:16260) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
- building client + server bundles...
✓ building client + server bundles...
- rendering pages...
✓ rendering pages...
```

VitePress reported no broken link. The Node `NO_COLOR`/`FORCE_COLOR` warning is harmless.

### Final rendered-route check

Command, run after the final build:

```sh
cd /Users/andrueanderson/Workspace/better-typescript
python3 - <<'PY'
from pathlib import Path
import re
from urllib.parse import urljoin

root = Path(".")
dist = root / "docs/.vitepress/dist"
catalog_source = (root / "docs/rules.md").read_text()
slugs = re.findall(r"^- \[`([^`]+)`\]\(\./rules/[^)]+\)$", catalog_source, re.MULTILINE)
assert len(slugs) == 131, f"source catalog routes: {len(slugs)}"

catalog_route = dist / "rules.html"
assert catalog_route.is_file(), "missing rendered catalog route: docs/.vitepress/dist/rules.html"
html = catalog_route.read_text()
rendered = re.findall(r'<a href="(\./rules/([a-z0-9-]+)\.html)"><code>([^<]+)</code></a>', html)
assert len(rendered) == 131, f"rendered catalog links: {len(rendered)}"
assert [label for _, _, label in rendered] == slugs, "rendered catalog labels/order mismatch"
assert [slug for _, slug, _ in rendered] == slugs, "rendered catalog targets/order mismatch"

for href, slug, label in rendered:
    assert label == slug, f"rendered label/target mismatch: {label} -> {href}"
    public_route = urljoin("/better-typescript/rules.html", href)
    expected_route = f"/better-typescript/rules/{slug}.html"
    assert public_route == expected_route, f"public route mismatch: {public_route} != {expected_route}"
    output = dist / "rules" / f"{slug}.html"
    assert output.is_file(), f"missing rendered rule route: {output}"

rendered_pages = sorted(path.stem for path in (dist / "rules").glob("*.html"))
assert rendered_pages == sorted(slugs), "rendered rule route set mismatch"
print("PASS rendered VitePress route validation")
print("rendered catalog route: docs/.vitepress/dist/rules.html")
print("rendered catalog links: 131/131 labels and targets match")
print("rendered rule routes: 131/131 files exist under docs/.vitepress/dist/rules/")
print("public route resolution: 131/131 under /better-typescript/rules/<slug>.html")
PY
```

Result: exit 0.

```text
PASS rendered VitePress route validation
rendered catalog route: docs/.vitepress/dist/rules.html
rendered catalog links: 131/131 labels and targets match
rendered rule routes: 131/131 files exist under docs/.vitepress/dist/rules/
public route resolution: 131/131 under /better-typescript/rules/<slug>.html
```

### Final repository check

Command:

```sh
cd /Users/andrueanderson/Workspace/better-typescript
./scripts/check.sh
```

Result: exit 0.

Captured stdout:

```text
format
tidy
npm install
bun install v1.4.0 (34cbb9a40)

Checked 131 installs across 179 packages (no changes) [33.00ms]
docs

  vitepress v1.6.4

build complete in 1.80s.
compiler provenance
vet
test
build
vulnerabilities
No vulnerabilities found.
```

Captured stderr:

```text
$ vitepress build docs
(node:16456) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
- building client + server bundles...
✓ building client + server bundles...
- rendering pages...
✓ rendering pages...
```

The nested VitePress build reported no broken link. All format, tidy, install, docs, compiler provenance, vet, test, build, and vulnerability stages passed.

### Final diff check

Command:

```sh
cd /Users/andrueanderson/Workspace/better-typescript
git diff --check
```

Result: exit 0 with no stdout or stderr.

### Final changed-file scope

Command:

```sh
cd /Users/andrueanderson/Workspace/better-typescript
python3 - <<'PY'
from pathlib import Path
import subprocess

root = Path(".")
result = subprocess.run(
    ["git", "status", "--porcelain=v1", "-z", "--untracked-files=all"],
    cwd=root,
    check=True,
    capture_output=True,
)
entries = [entry.decode() for entry in result.stdout.split(b"\0") if entry]
paths = []
for entry in entries:
    status = entry[:2]
    assert "R" not in status and "C" not in status, f"unexpected rename/copy status: {entry}"
    paths.append(entry[3:])

def allowed(path):
    return (
        path == "docs/rules.md"
        or (path.startswith("docs/rules/") and path.endswith(".md"))
        or path == "docs/.vitepress/config.mts"
        or path == ".scratch/rule-documentation/project.md"
        or path.startswith(".scratch/rule-documentation/evidence/")
    )

outside = sorted(path for path in paths if not allowed(path))
assert not outside, f"changed paths outside DOC-15 allowance: {outside}"
rule_pages = [path for path in paths if path.startswith("docs/rules/") and path.endswith(".md")]
assert len(rule_pages) == 131, f"changed rule page count: {len(rule_pages)}"
assert "docs/rules.md" in paths, "catalog is not present in candidate changes"
config_changed = "docs/.vitepress/config.mts" in paths
print("PASS changed-file scope validation")
print(f"changed paths inspected: {len(paths)}")
print("catalog: docs/rules.md")
print(f"rule pages: {len(rule_pages)} under docs/rules/")
print(f"site config changed: {'yes' if config_changed else 'no'}")
print("project/evidence records: allowed only under .scratch/rule-documentation/")
print("paths outside allowance: 0")
PY
```

Result: exit 0.

```text
PASS changed-file scope validation
changed paths inspected: 135
catalog: docs/rules.md
rule pages: 131 under docs/rules/
site config changed: no
project/evidence records: allowed only under .scratch/rule-documentation/
paths outside allowance: 0
```

The scope command inspected tracked and untracked files. It found 131 rule pages, the catalog, and allowed `.scratch/rule-documentation/` records only. `docs/.vitepress/config.mts` is unchanged. No changed path is outside the allowed documentation and project-record scope.

### Final validator write scope

This final validator appended only this section to `.scratch/rule-documentation/evidence/site-validation.md`. It did not edit rule pages or shared site files.


---

## Third rerun — 2026-08-26T21:20:24Z

Third rerun result: **PASS**

This fresh clean-context rerun used the newest corrected candidate. It preserves both historical PASS sections above. Terminal ANSI color escapes are omitted from captured output below. No failure or blocker occurred.

### Third-rerun deterministic sets, catalog links, and page contract

Command:

```sh
cd /Users/andrueanderson/Workspace/better-typescript
python3 - <<'PY'
from pathlib import Path
import re

root = Path(".")
catalog_path = root / "docs/rules.md"
catalog_text = catalog_path.read_text()
link_re = re.compile(r"^- \[`([^`]+)`\]\(([^)]+)\)$", re.MULTILINE)
links = link_re.findall(catalog_text)
bullet_lines = [line for line in catalog_text.splitlines() if line.startswith("- ")]
assert len(bullet_lines) == len(links), "catalog contains a malformed or non-rule bullet"
labels = [label for label, _ in links]
targets = [target for _, target in links]
target_slugs = []
for label, target in links:
    match = re.fullmatch(r"\./rules/([a-z0-9-]+)\.md", target)
    if match is None:
        raise AssertionError(f"invalid catalog target for {label}: {target}")
    target_slugs.append(match.group(1))
    if match.group(1) != label:
        raise AssertionError(f"label/target mismatch: {label} -> {target}")

packages = sorted(
    path.name.replace("_", "-")
    for path in (root / "internal/rules").iterdir()
    if path.is_dir()
)
pages = sorted(path.stem for path in (root / "docs/rules").glob("*.md"))

assert len(labels) == 131, f"catalog count: {len(labels)}"
assert len(set(labels)) == 131, "duplicate catalog labels"
assert labels == sorted(labels), "catalog labels are not sorted"
assert len(targets) == 131, f"target count: {len(targets)}"
assert len(set(targets)) == 131, "duplicate catalog targets"
assert len(packages) == 131, f"package count: {len(packages)}"
assert len(set(packages)) == 131, "duplicate normalized packages"
assert len(pages) == 131, f"page count: {len(pages)}"
assert len(set(pages)) == 131, "duplicate page names"
assert set(labels) == set(target_slugs) == set(packages) == set(pages), (
    "set mismatch",
    sorted(set(labels) ^ set(target_slugs)),
    sorted(set(labels) ^ set(packages)),
    sorted(set(labels) ^ set(pages)),
)
for target in targets:
    assert (root / "docs" / target.removeprefix("./")).is_file(), f"broken catalog link: {target}"

required = [
    "## What it does",
    "## When to use it",
    "## Conformant",
    "## Non-conformant",
]
for slug in labels:
    path = root / "docs/rules" / f"{slug}.md"
    text = path.read_text()
    lines = text.splitlines()
    nonempty = [line for line in lines if line.strip()]
    title = f"# {slug}"
    assert nonempty and nonempty[0] == title, f"{slug}: incorrect first title"
    h1_lines = [line for line in lines if line.startswith("# ")]
    assert h1_lines == [title], f"{slug}: title count/content: {h1_lines}"
    h2_lines = [line for line in lines if line.startswith("## ")]
    assert h2_lines == required, f"{slug}: H2 headings are {h2_lines}"
    positions = []
    for heading in required:
        found = [i for i, line in enumerate(lines) if line == heading]
        assert len(found) == 1, f"{slug}: {heading!r} count is {len(found)}"
        positions.append(found[0])
    assert positions == sorted(positions), f"{slug}: required headings out of order"

    conformant = "\n".join(lines[positions[2] + 1 : positions[3]])
    nonconformant = "\n".join(lines[positions[3] + 1 :])
    fence_re = re.compile(r"^```ts[ \t]*\n.*?^```[ \t]*$", re.MULTILINE | re.DOTALL)
    assert fence_re.search(conformant), f"{slug}: no closed ts fence under Conformant"
    assert fence_re.search(nonconformant), f"{slug}: no closed ts fence under Non-conformant"

print("PASS deterministic set, catalog-link, and page-structure validation")
print(f"catalog labels: {len(labels)} (unique: {len(set(labels))}, sorted: yes)")
print(f"catalog targets: {len(target_slugs)} (unique: {len(set(target_slugs))}, label matches: yes, files exist: yes)")
print(f"normalized rule packages: {len(packages)} (unique: {len(set(packages))})")
print(f"rule pages: {len(pages)} (unique: {len(set(pages))})")
print("four-way set equality: yes")
print("page structure: 131/131 exact titles; exactly four required H2 headings once and in order; closed ts fences in both example sections")
PY
```

Result: exit 0.

```text
PASS deterministic set, catalog-link, and page-structure validation
catalog labels: 131 (unique: 131, sorted: yes)
catalog targets: 131 (unique: 131, label matches: yes, files exist: yes)
normalized rule packages: 131 (unique: 131)
rule pages: 131 (unique: 131)
four-way set equality: yes
page structure: 131/131 exact titles; exactly four required H2 headings once and in order; closed ts fences in both example sections
```

This proves that the 131 catalog slugs are complete, unique, and sorted. It also proves four-way equality among catalog labels, catalog targets, normalized rule package names, and page names. Every catalog target exists. All 131 pages satisfy the title, heading, heading order, heading count, and TypeScript fence contract.

### Third-rerun VitePress build

Command:

```sh
cd /Users/andrueanderson/Workspace/better-typescript
bun run docs:build
```

Result: exit 0.

Captured stdout:

```text

  vitepress v1.6.4

build complete in 1.61s.
```

Captured stderr:

```text
$ vitepress build docs
(node:25756) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
- building client + server bundles...
✓ building client + server bundles...
- rendering pages...
✓ rendering pages...
```

VitePress reported no broken link. The Node `NO_COLOR`/`FORCE_COLOR` warning is harmless.

### Third-rerun rendered-route check

Command, run after the third-rerun build:

```sh
cd /Users/andrueanderson/Workspace/better-typescript
python3 - <<'PY'
from pathlib import Path
import re
from urllib.parse import urljoin

root = Path(".")
dist = root / "docs/.vitepress/dist"
catalog_source = (root / "docs/rules.md").read_text()
slugs = re.findall(r"^- \[`([^`]+)`\]\(\./rules/[^)]+\)$", catalog_source, re.MULTILINE)
assert len(slugs) == 131, f"source catalog routes: {len(slugs)}"

catalog_route = dist / "rules.html"
assert catalog_route.is_file(), "missing rendered catalog route: docs/.vitepress/dist/rules.html"
html = catalog_route.read_text()
rendered = re.findall(r'<a href="(\./rules/([a-z0-9-]+)\.html)"><code>([^<]+)</code></a>', html)
assert len(rendered) == 131, f"rendered catalog links: {len(rendered)}"
assert [label for _, _, label in rendered] == slugs, "rendered catalog labels/order mismatch"
assert [slug for _, slug, _ in rendered] == slugs, "rendered catalog targets/order mismatch"

for href, slug, label in rendered:
    assert label == slug, f"rendered label/target mismatch: {label} -> {href}"
    public_route = urljoin("/better-typescript/rules.html", href)
    expected_route = f"/better-typescript/rules/{slug}.html"
    assert public_route == expected_route, f"public route mismatch: {public_route} != {expected_route}"
    output = dist / "rules" / f"{slug}.html"
    assert output.is_file(), f"missing rendered rule route: {output}"

rendered_pages = sorted(path.stem for path in (dist / "rules").glob("*.html"))
assert rendered_pages == sorted(slugs), "rendered rule route set mismatch"
print("PASS rendered VitePress route validation")
print("rendered catalog route: docs/.vitepress/dist/rules.html")
print("rendered catalog links: 131/131 labels and targets match")
print("rendered rule routes: 131/131 files exist under docs/.vitepress/dist/rules/")
print("public route resolution: 131/131 under /better-typescript/rules/<slug>.html")
PY
```

Result: exit 0.

```text
PASS rendered VitePress route validation
rendered catalog route: docs/.vitepress/dist/rules.html
rendered catalog links: 131/131 labels and targets match
rendered rule routes: 131/131 files exist under docs/.vitepress/dist/rules/
public route resolution: 131/131 under /better-typescript/rules/<slug>.html
```

### Third-rerun repository check

Command:

```sh
cd /Users/andrueanderson/Workspace/better-typescript
./scripts/check.sh
```

Result: exit 0.

Captured stdout:

```text
format
tidy
npm install
bun install v1.4.0 (34cbb9a40)

Checked 131 installs across 179 packages (no changes) [31.00ms]
docs

  vitepress v1.6.4

build complete in 1.52s.
compiler provenance
vet
test
build
vulnerabilities
No vulnerabilities found.
```

Captured stderr:

```text
$ vitepress build docs
(node:25842) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
- building client + server bundles...
✓ building client + server bundles...
- rendering pages...
✓ rendering pages...
```

The nested VitePress build reported no broken link. All format, tidy, install, docs, compiler provenance, vet, test, build, and vulnerability stages passed.

### Third-rerun diff check

Command:

```sh
cd /Users/andrueanderson/Workspace/better-typescript
git diff --check
```

Result: exit 0 with no stdout or stderr.

### Third-rerun changed-file scope

Command:

```sh
cd /Users/andrueanderson/Workspace/better-typescript
python3 - <<'PY'
from pathlib import Path
import subprocess

root = Path(".")
result = subprocess.run(
    ["git", "status", "--porcelain=v1", "-z", "--untracked-files=all"],
    cwd=root,
    check=True,
    capture_output=True,
)
entries = [entry.decode() for entry in result.stdout.split(b"\0") if entry]
paths = []
for entry in entries:
    status = entry[:2]
    assert "R" not in status and "C" not in status, f"unexpected rename/copy status: {entry}"
    paths.append(entry[3:])

def allowed(path):
    return (
        path == "docs/rules.md"
        or (path.startswith("docs/rules/") and path.endswith(".md"))
        or path == "docs/.vitepress/config.mts"
        or path == ".scratch/rule-documentation/project.md"
        or path.startswith(".scratch/rule-documentation/evidence/")
    )

outside = sorted(path for path in paths if not allowed(path))
assert not outside, f"changed paths outside DOC-15 allowance: {outside}"
rule_pages = [path for path in paths if path.startswith("docs/rules/") and path.endswith(".md")]
assert len(rule_pages) == 131, f"changed rule page count: {len(rule_pages)}"
assert "docs/rules.md" in paths, "catalog is not present in candidate changes"
config_changed = "docs/.vitepress/config.mts" in paths
print("PASS changed-file scope validation")
print(f"changed paths inspected: {len(paths)}")
print("catalog: docs/rules.md")
print(f"rule pages: {len(rule_pages)} under docs/rules/")
print(f"site config changed: {'yes' if config_changed else 'no'}")
print("project/evidence records: allowed only under .scratch/rule-documentation/")
print("paths outside allowance: 0")
PY
```

Result: exit 0.

```text
PASS changed-file scope validation
changed paths inspected: 135
catalog: docs/rules.md
rule pages: 131 under docs/rules/
site config changed: no
project/evidence records: allowed only under .scratch/rule-documentation/
paths outside allowance: 0
```

The scope command inspected tracked and untracked files. It found 131 rule pages, the catalog, and allowed `.scratch/rule-documentation/` records only. `docs/.vitepress/config.mts` is unchanged. No changed path is outside the allowed documentation and project-record scope.

### Third-rerun validator write scope

This third-rerun validator appended only this section to `.scratch/rule-documentation/evidence/site-validation.md`. It did not edit rule pages or shared site files.


---

## Material-final rerun — 2026-08-26T21:49:17Z

Material-final result: **PASS**

This fresh clean-context rerun used the candidate after all material corrections. It preserves every historical section above. Terminal ANSI color escapes are omitted from captured output. No failure or blocker occurred.

### Material-final deterministic catalog, page, and link check

Command:

```sh
cd /Users/andrueanderson/Workspace/better-typescript
python3 - <<'PY'
from pathlib import Path
import re

root = Path(".")
catalog_path = root / "docs/rules.md"
catalog_text = catalog_path.read_text()
link_re = re.compile(r"^- \[`([^`]+)`\]\(([^)]+)\)$", re.MULTILINE)
links = link_re.findall(catalog_text)
bullet_lines = [line for line in catalog_text.splitlines() if line.startswith("- ")]
assert len(bullet_lines) == len(links), "catalog contains a malformed or non-rule bullet"
labels = [label for label, _ in links]
targets = [target for _, target in links]
target_slugs = []
for label, target in links:
    match = re.fullmatch(r"\./rules/([a-z0-9-]+)\.md", target)
    if match is None:
        raise AssertionError(f"invalid catalog target for {label}: {target}")
    target_slugs.append(match.group(1))
    if match.group(1) != label:
        raise AssertionError(f"label/target mismatch: {label} -> {target}")

packages = sorted(
    path.name.replace("_", "-")
    for path in (root / "internal/rules").iterdir()
    if path.is_dir()
)
pages = sorted(path.stem for path in (root / "docs/rules").glob("*.md"))

assert len(labels) == 131, f"catalog count: {len(labels)}"
assert len(set(labels)) == 131, "duplicate catalog labels"
assert labels == sorted(labels), "catalog labels are not sorted"
assert len(targets) == 131, f"target count: {len(targets)}"
assert len(set(targets)) == 131, "duplicate catalog targets"
assert len(packages) == 131, f"package count: {len(packages)}"
assert len(set(packages)) == 131, "duplicate normalized packages"
assert len(pages) == 131, f"page count: {len(pages)}"
assert len(set(pages)) == 131, "duplicate page names"
assert set(labels) == set(target_slugs) == set(packages) == set(pages), (
    "set mismatch",
    sorted(set(labels) ^ set(target_slugs)),
    sorted(set(labels) ^ set(packages)),
    sorted(set(labels) ^ set(pages)),
)
for target in targets:
    assert (root / "docs" / target.removeprefix("./")).is_file(), f"broken catalog link: {target}"

required = [
    "## What it does",
    "## When to use it",
    "## Conformant",
    "## Non-conformant",
]
for slug in labels:
    path = root / "docs/rules" / f"{slug}.md"
    text = path.read_text()
    lines = text.splitlines()
    nonempty = [line for line in lines if line.strip()]
    title = f"# {slug}"
    assert nonempty and nonempty[0] == title, f"{slug}: incorrect first title"
    h1_lines = [line for line in lines if line.startswith("# ")]
    assert h1_lines == [title], f"{slug}: title count/content: {h1_lines}"
    h2_lines = [line for line in lines if line.startswith("## ")]
    assert h2_lines == required, f"{slug}: H2 headings are {h2_lines}"
    positions = []
    for heading in required:
        found = [i for i, line in enumerate(lines) if line == heading]
        assert len(found) == 1, f"{slug}: {heading!r} count is {len(found)}"
        positions.append(found[0])
    assert positions == sorted(positions), f"{slug}: required headings out of order"

    conformant = "\n".join(lines[positions[2] + 1 : positions[3]])
    nonconformant = "\n".join(lines[positions[3] + 1 :])
    fence_re = re.compile(r"^```ts[ \t]*\n.*?^```[ \t]*$", re.MULTILINE | re.DOTALL)
    assert fence_re.search(conformant), f"{slug}: no closed ts fence under Conformant"
    assert fence_re.search(nonconformant), f"{slug}: no closed ts fence under Non-conformant"

print("PASS deterministic set, catalog-link, and page-structure validation")
print(f"catalog labels: {len(labels)} (unique: {len(set(labels))}, sorted: yes)")
print(f"catalog targets: {len(target_slugs)} (unique: {len(set(target_slugs))}, label matches: yes, files exist: yes)")
print(f"normalized rule packages: {len(packages)} (unique: {len(set(packages))})")
print(f"rule pages: {len(pages)} (unique: {len(set(pages))})")
print("four-way set equality: yes")
print("page structure: 131/131 exact titles; exactly four required H2 headings once and in order; closed ts fences in both example sections")
PY
```

Result: exit 0.

```text
PASS deterministic set, catalog-link, and page-structure validation
catalog labels: 131 (unique: 131, sorted: yes)
catalog targets: 131 (unique: 131, label matches: yes, files exist: yes)
normalized rule packages: 131 (unique: 131)
rule pages: 131 (unique: 131)
four-way set equality: yes
page structure: 131/131 exact titles; exactly four required H2 headings once and in order; closed ts fences in both example sections
```

This proves that the 131 catalog slugs are complete, unique, and sorted. Catalog labels, targets, normalized rule packages, and page names are equal. Every source catalog link resolves to an existing page. Every page has the exact title, required sections once and in order, and closed `ts` fences under both code sections.

### Material-final VitePress build and broken-link check

Command:

```sh
cd /Users/andrueanderson/Workspace/better-typescript
bun run docs:build
```

Result: exit 0.

Captured stdout:

```text

  vitepress v1.6.4

build complete in 1.75s.
```

Captured stderr:

```text
$ vitepress build docs
(node:39367) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
- building client + server bundles...
✓ building client + server bundles...
- rendering pages...
✓ rendering pages...
```

VitePress reported no broken link. The Node `NO_COLOR`/`FORCE_COLOR` warning is harmless.

### Material-final rendered-route check

Command, run after the material-final build:

```sh
cd /Users/andrueanderson/Workspace/better-typescript
python3 - <<'PY'
from pathlib import Path
import re
from urllib.parse import urljoin

root = Path(".")
dist = root / "docs/.vitepress/dist"
catalog_source = (root / "docs/rules.md").read_text()
slugs = re.findall(r"^- \[`([^`]+)`\]\(\./rules/[^)]+\)$", catalog_source, re.MULTILINE)
assert len(slugs) == 131, f"source catalog routes: {len(slugs)}"

catalog_route = dist / "rules.html"
assert catalog_route.is_file(), "missing rendered catalog route: docs/.vitepress/dist/rules.html"
html = catalog_route.read_text()
rendered = re.findall(r'<a href="(\./rules/([a-z0-9-]+)\.html)"><code>([^<]+)</code></a>', html)
assert len(rendered) == 131, f"rendered catalog links: {len(rendered)}"
assert [label for _, _, label in rendered] == slugs, "rendered catalog labels/order mismatch"
assert [slug for _, slug, _ in rendered] == slugs, "rendered catalog targets/order mismatch"

for href, slug, label in rendered:
    assert label == slug, f"rendered label/target mismatch: {label} -> {href}"
    public_route = urljoin("/better-typescript/rules.html", href)
    expected_route = f"/better-typescript/rules/{slug}.html"
    assert public_route == expected_route, f"public route mismatch: {public_route} != {expected_route}"
    output = dist / "rules" / f"{slug}.html"
    assert output.is_file(), f"missing rendered rule route: {output}"

rendered_pages = sorted(path.stem for path in (dist / "rules").glob("*.html"))
assert rendered_pages == sorted(slugs), "rendered rule route set mismatch"
print("PASS rendered VitePress route validation")
print("rendered catalog route: docs/.vitepress/dist/rules.html")
print("rendered catalog links: 131/131 labels and targets match")
print("rendered rule routes: 131/131 files exist under docs/.vitepress/dist/rules/")
print("public route resolution: 131/131 under /better-typescript/rules/<slug>.html")
PY
```

Result: exit 0.

```text
PASS rendered VitePress route validation
rendered catalog route: docs/.vitepress/dist/rules.html
rendered catalog links: 131/131 labels and targets match
rendered rule routes: 131/131 files exist under docs/.vitepress/dist/rules/
public route resolution: 131/131 under /better-typescript/rules/<slug>.html
```

### Material-final repository check

Command:

```sh
cd /Users/andrueanderson/Workspace/better-typescript
./scripts/check.sh
```

Result: exit 0.

Captured stdout:

```text
format
tidy
npm install
bun install v1.4.0 (34cbb9a40)

Checked 131 installs across 179 packages (no changes) [30.00ms]
docs

  vitepress v1.6.4

build complete in 1.62s.
compiler provenance
vet
test
build
vulnerabilities
No vulnerabilities found.
```

Captured stderr:

```text
$ vitepress build docs
(node:39746) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
- building client + server bundles...
✓ building client + server bundles...
- rendering pages...
✓ rendering pages...
```

The nested VitePress build reported no broken link. Format, tidy, install, docs, compiler provenance, vet, test, build, and vulnerability checks all passed.

### Material-final diff check

Command:

```sh
cd /Users/andrueanderson/Workspace/better-typescript
git diff --check
```

Result: exit 0 with no stdout or stderr.

### Material-final changed-file scope

Command:

```sh
cd /Users/andrueanderson/Workspace/better-typescript
python3 - <<'PY'
from pathlib import Path
import subprocess

root = Path(".")
result = subprocess.run(
    ["git", "status", "--porcelain=v1", "-z", "--untracked-files=all"],
    cwd=root,
    check=True,
    capture_output=True,
)
entries = [entry.decode() for entry in result.stdout.split(b"\0") if entry]
paths = []
for entry in entries:
    status = entry[:2]
    assert "R" not in status and "C" not in status, f"unexpected rename/copy status: {entry}"
    paths.append(entry[3:])

def allowed(path):
    return (
        path == "docs/rules.md"
        or (path.startswith("docs/rules/") and path.endswith(".md"))
        or path == "docs/.vitepress/config.mts"
        or path == ".scratch/rule-documentation/project.md"
        or path.startswith(".scratch/rule-documentation/evidence/")
    )

outside = sorted(path for path in paths if not allowed(path))
assert not outside, f"changed paths outside DOC-15 allowance: {outside}"
rule_pages = [path for path in paths if path.startswith("docs/rules/") and path.endswith(".md")]
assert len(rule_pages) == 131, f"changed rule page count: {len(rule_pages)}"
assert "docs/rules.md" in paths, "catalog is not present in candidate changes"
config_changed = "docs/.vitepress/config.mts" in paths
print("PASS changed-file scope validation")
print(f"changed paths inspected: {len(paths)}")
print("catalog: docs/rules.md")
print(f"rule pages: {len(rule_pages)} under docs/rules/")
print(f"site config changed: {'yes' if config_changed else 'no'}")
print("project/evidence records: allowed only under .scratch/rule-documentation/")
print("paths outside allowance: 0")
PY
```

Result: exit 0.

```text
PASS changed-file scope validation
changed paths inspected: 136
catalog: docs/rules.md
rule pages: 131 under docs/rules/
site config changed: no
project/evidence records: allowed only under .scratch/rule-documentation/
paths outside allowance: 0
```

The check inspected tracked and untracked files. It found the 131 rule pages, `docs/rules.md`, and allowed `.scratch/rule-documentation/` records only. `docs/.vitepress/config.mts` is unchanged. No path is outside the allowed scope.

### Material-final validator write scope

This validator appended only this material-final section to `.scratch/rule-documentation/evidence/site-validation.md`. It did not edit pages or shared files.
