package semanticlint

import (
	"encoding/json"
	"fmt"
	"path"
	"regexp"
	"sort"
	"strings"
)

type packageJSON struct {
	Name                 string            `json:"name"`
	PackageManager       string            `json:"packageManager"`
	Scripts              map[string]string `json:"scripts"`
	Dependencies         map[string]string `json:"dependencies"`
	DevDependencies      map[string]string `json:"devDependencies"`
	PeerDependencies     map[string]string `json:"peerDependencies"`
	OptionalDependencies map[string]string `json:"optionalDependencies"`
	Exports              any               `json:"exports"`
	Workspaces           any               `json:"workspaces"`
}

type packageManifest struct {
	path  string
	root  string
	value packageJSON
}

type checkResult struct {
	classification string
	message        string
	evidence       []Evidence
}

func deterministicFindings(rules []Rule, repository RepositoryEvidence) []Finding {
	findings := make([]Finding, len(rules))
	for index, rule := range rules {
		result := deterministicResult(rule.Metadata.DeterministicCheck, repository)
		findings[index] = Finding{RulePath: rule.Path, RuleTitle: rule.Title, Evaluator: "deterministic", Classification: result.classification, Message: result.message, Evidence: result.evidence}
	}
	return findings
}

func deterministicResult(check string, repository RepositoryEvidence) checkResult {
	switch check {
	case "distinct-filenames":
		return distinctFilenames(repository)
	case "bun-install-linker":
		return bunInstallLinker(repository)
	case "declared-workspace-dependencies":
		return declaredWorkspaceDependencies(repository)
	case "pinned-bun-toolchain":
		return pinnedBunToolchain(repository)
	case "root-check-command":
		return rootCheckCommand(repository)
	case "test-and-typecheck-commands":
		return testAndTypecheckCommands(repository)
	case "workspace-public-imports":
		return workspacePublicImports(repository)
	case "acyclic-dependencies":
		return dependencyCycles(repository)
	case "strict-runtime-tsconfig":
		return strictRuntimeTSConfig(repository)
	default:
		return checkResult{classification: "insufficient_evidence", message: fmt.Sprintf("No deterministic implementation exists for %s.", check), evidence: []Evidence{}}
	}
}

func evidenceForPaths(paths []string) []Evidence {
	paths = append([]string{}, paths...)
	sort.Strings(paths)
	result := make([]Evidence, len(paths))
	for index, path := range paths {
		result[index] = Evidence{Path: path}
	}
	return result
}

func packageManifests(repository RepositoryEvidence) []packageManifest {
	var result []packageManifest
	for _, file := range repository.Files {
		if path.Base(file.Path) != "package.json" {
			continue
		}
		var manifest packageJSON
		if json.Unmarshal([]byte(file.Text), &manifest) != nil {
			continue
		}
		root := path.Dir(file.Path)
		if root == "." {
			root = ""
		}
		result = append(result, packageManifest{path: file.Path, root: root, value: manifest})
	}
	return result
}

func distinctFilenames(repository RepositoryEvidence) checkResult {
	byName := make(map[string][]string)
	for _, value := range repository.Paths {
		byName[path.Base(value)] = append(byName[path.Base(value)], value)
	}
	var duplicates []string
	for _, paths := range byName {
		if len(paths) > 1 {
			duplicates = append(duplicates, paths...)
		}
	}
	if len(duplicates) == 0 {
		return checkResult{classification: "pass", message: "Repository filenames are distinct.", evidence: []Evidence{}}
	}
	return checkResult{classification: "violation", message: "The repository contains duplicate filenames.", evidence: evidenceForPaths(duplicates)}
}

func bunInstallLinker(repository RepositoryEvidence) checkResult {
	for _, file := range repository.Files {
		if file.Path == "bunfig.toml" {
			if regexp.MustCompile(`\blinker\s*=\s*["']isolated["']`).MatchString(file.Text) {
				return checkResult{classification: "pass", message: "Bun uses the isolated install linker.", evidence: []Evidence{}}
			}
			return checkResult{classification: "violation", message: "bunfig.toml must explicitly use the isolated linker or document an exception.", evidence: []Evidence{{Path: file.Path}}}
		}
	}
	return checkResult{classification: "violation", message: "bunfig.toml does not set an install linker.", evidence: []Evidence{{Path: "bunfig.toml"}}}
}

func owningManifest(filePath string, manifests []packageManifest) *packageManifest {
	var result *packageManifest
	for index := range manifests {
		manifest := &manifests[index]
		if manifest.root == "" || strings.HasPrefix(filePath, manifest.root+"/") {
			if result == nil || len(manifest.root) > len(result.root) {
				result = manifest
			}
		}
	}
	return result
}

func externalPackageName(specifier string) string {
	if specifier == "bun" || strings.HasPrefix(specifier, ".") || strings.HasPrefix(specifier, "/") || strings.HasPrefix(specifier, "node:") || strings.HasPrefix(specifier, "bun:") {
		return ""
	}
	parts := strings.Split(specifier, "/")
	if strings.HasPrefix(specifier, "@") && len(parts) >= 2 {
		return strings.Join(parts[:2], "/")
	}
	return parts[0]
}

func declaredWorkspaceDependencies(repository RepositoryEvidence) checkResult {
	manifests := packageManifests(repository)
	var undeclared []string
	var evidencePaths []string
	for _, file := range repository.Files {
		if !codeExtensions[path.Ext(file.Path)] {
			continue
		}
		manifest := owningManifest(file.Path, manifests)
		if manifest == nil {
			continue
		}
		declared := make(map[string]bool)
		for _, dependencies := range []map[string]string{manifest.value.Dependencies, manifest.value.DevDependencies, manifest.value.PeerDependencies, manifest.value.OptionalDependencies} {
			for name := range dependencies {
				declared[name] = true
			}
		}
		for _, specifier := range importSpecifiers(file) {
			name := externalPackageName(specifier)
			if name != "" && !declared[name] {
				undeclared = append(undeclared, file.Path+": "+name)
				evidencePaths = append(evidencePaths, file.Path)
			}
		}
	}
	if len(undeclared) == 0 {
		return checkResult{classification: "pass", message: "Every external import is declared by its owning package.", evidence: []Evidence{}}
	}
	return checkResult{classification: "violation", message: "Undeclared package imports: " + strings.Join(undeclared, ", "), evidence: evidenceForPaths(uniquePaths(evidencePaths))}
}

func pinnedBunToolchain(repository RepositoryEvidence) checkResult {
	var root packageManifest
	for _, manifest := range packageManifests(repository) {
		if manifest.path == "package.json" {
			root = manifest
		}
	}
	lockNames := map[string]bool{"bun.lock": true, "bun.lockb": true, "package-lock.json": true, "pnpm-lock.yaml": true, "yarn.lock": true}
	var lockfiles, competing []string
	for _, name := range repository.Paths {
		if lockNames[path.Base(name)] {
			lockfiles = append(lockfiles, name)
			if path.Base(name) != "bun.lock" {
				competing = append(competing, name)
			}
		}
	}
	var workflows []Source
	for _, file := range repository.Files {
		if strings.HasPrefix(file.Path, ".github/workflows/") {
			workflows = append(workflows, file)
		}
	}
	frozenInstall := false
	for _, workflow := range workflows {
		if regexp.MustCompile(`bun\s+install\s+[^\n]*--frozen-lockfile`).MatchString(workflow.Text) {
			frozenInstall = true
		}
	}
	var problems []string
	if !contains(lockfiles, "bun.lock") {
		problems = append(problems, "missing root bun.lock")
	}
	if len(competing) > 0 {
		problems = append(problems, "competing lockfiles: "+strings.Join(competing, ", "))
	}
	if !regexp.MustCompile(`^bun@\d+\.\d+\.\d+(?:[-+][\w.-]+)?$`).MatchString(root.value.PackageManager) {
		problems = append(problems, "packageManager does not pin an exact Bun version")
	}
	if len(workflows) > 0 && !frozenInstall {
		problems = append(problems, "CI does not use bun install --frozen-lockfile")
	}
	if len(problems) == 0 {
		return checkResult{classification: "pass", message: "The repository has one pinned Bun toolchain and lockfile.", evidence: []Evidence{}}
	}
	evidencePaths := append([]string{"package.json"}, lockfiles...)
	for _, workflow := range workflows {
		evidencePaths = append(evidencePaths, workflow.Path)
	}
	return checkResult{classification: "violation", message: strings.Join(problems, "; "), evidence: evidenceForPaths(evidencePaths)}
}

func rootScripts(repository RepositoryEvidence) map[string]string {
	for _, manifest := range packageManifests(repository) {
		if manifest.path == "package.json" {
			return manifest.value.Scripts
		}
	}
	return nil
}

func rootCheckCommand(repository RepositoryEvidence) checkResult {
	scripts := rootScripts(repository)
	check := scripts["check"]
	if check == "" {
		return checkResult{classification: "violation", message: "The root package does not define a check script.", evidence: []Evidence{{Path: "package.json"}}}
	}
	text := check
	for name, command := range scripts {
		if strings.Contains(check, name) {
			text += " " + command
		}
	}
	text = strings.ToLower(text)
	checks := []struct {
		name    string
		pattern *regexp.Regexp
	}{{"format", regexp.MustCompile(`format|prettier|biome`)}, {"lint", regexp.MustCompile(`lint|eslint|biome`)}, {"type checking", regexp.MustCompile(`typecheck|tsc|tsgo`)}, {"tests", regexp.MustCompile(`\btest\b|vitest`)}, {"architecture checks", regexp.MustCompile(`architecture|dependency|cycle`)}}
	var missing []string
	for _, check := range checks {
		if !check.pattern.MatchString(text) {
			missing = append(missing, check.name)
		}
	}
	if len(missing) == 0 {
		return checkResult{classification: "pass", message: "The root check command covers the required checks.", evidence: []Evidence{}}
	}
	return checkResult{classification: "violation", message: "The root check command omits " + strings.Join(missing, ", ") + ".", evidence: []Evidence{{Path: "package.json"}}}
}

func testAndTypecheckCommands(repository RepositoryEvidence) checkResult {
	scripts := rootScripts(repository)
	var missing []string
	if scripts["test"] == "" {
		missing = append(missing, "an explicit test command")
	}
	if !regexp.MustCompile(`tsc|tsgo`).MatchString(scripts["typecheck"]) {
		missing = append(missing, "an independent TypeScript command")
	}
	if len(missing) == 0 {
		return checkResult{classification: "pass", message: "Test runner and type checking commands are explicit.", evidence: []Evidence{}}
	}
	return checkResult{classification: "violation", message: "The root package lacks " + strings.Join(missing, " and ") + ".", evidence: []Evidence{{Path: "package.json"}}}
}

func workspacePublicImports(repository RepositoryEvidence) checkResult {
	manifests := packageManifests(repository)
	if len(manifests) <= 1 {
		return checkResult{classification: "not_applicable", message: "The repository has no cross-workspace imports.", evidence: []Evidence{}}
	}
	var violations []string
	for _, manifest := range manifests {
		if manifest.path != "package.json" && manifest.value.Exports == nil {
			violations = append(violations, manifest.path)
		}
	}
	sources := make(map[string]Source)
	for _, source := range repository.Files {
		sources[source.Path] = source
	}
	for _, file := range repository.Files {
		sourceManifest := owningManifest(file.Path, manifests)
		if sourceManifest == nil || !codeExtensions[path.Ext(file.Path)] {
			continue
		}
		for _, specifier := range importSpecifiers(file) {
			if strings.Contains(specifier, "/src/") {
				violations = append(violations, file.Path)
				break
			}
			if target := resolvedRelativeImport(file.Path, specifier, sources); target != "" {
				targetManifest := owningManifest(target, manifests)
				if targetManifest != nil && targetManifest.path != sourceManifest.path {
					violations = append(violations, file.Path)
					break
				}
			}
		}
	}
	violations = uniquePaths(violations)
	if len(violations) == 0 {
		return checkResult{classification: "pass", message: "Workspace imports use declared public exports.", evidence: []Evidence{}}
	}
	return checkResult{classification: "violation", message: "Workspace exports or imports bypass a public package boundary.", evidence: evidenceForPaths(violations)}
}

func dependencyCycles(repository RepositoryEvidence) checkResult {
	sources := make(map[string]Source)
	for _, source := range repository.Files {
		if codeExtensions[path.Ext(source.Path)] {
			sources[source.Path] = source
		}
	}
	edges := make(map[string][]string)
	for name, source := range sources {
		for _, specifier := range importSpecifiers(source) {
			if target := resolvedRelativeImport(name, specifier, sources); target != "" {
				edges[name] = append(edges[name], target)
			}
		}
	}
	var cycles []string
	for name := range sources {
		for _, dependency := range edges[name] {
			if reachesPath(dependency, name, edges, map[string]bool{name: true}) {
				cycles = append(cycles, name)
				break
			}
		}
	}
	if len(cycles) == 0 {
		return checkResult{classification: "pass", message: "The source dependency graph is acyclic.", evidence: []Evidence{}}
	}
	return checkResult{classification: "violation", message: "The source dependency graph contains a cycle.", evidence: evidenceForPaths(cycles)}
}

func reachesPath(current, target string, edges map[string][]string, visited map[string]bool) bool {
	if current == target {
		return true
	}
	if visited[current] {
		return false
	}
	visited[current] = true
	for _, dependency := range edges[current] {
		if reachesPath(dependency, target, edges, visited) {
			return true
		}
	}
	return false
}

func strictRuntimeTSConfig(repository RepositoryEvidence) checkResult {
	pattern := regexp.MustCompile(`^tsconfig(?:\.[^.]+)?\.json$`)
	var configs, invalid []string
	for _, file := range repository.Files {
		if !pattern.MatchString(path.Base(file.Path)) {
			continue
		}
		configs = append(configs, file.Path)
		cleaned := regexp.MustCompile(`(?m)^\s*//.*$`).ReplaceAllString(file.Text, "")
		var parsed struct {
			CompilerOptions map[string]any `json:"compilerOptions"`
		}
		if json.Unmarshal([]byte(cleaned), &parsed) != nil || parsed.CompilerOptions["strict"] != true || parsed.CompilerOptions["noUncheckedIndexedAccess"] != true {
			invalid = append(invalid, file.Path)
		}
	}
	if len(configs) == 0 {
		return checkResult{classification: "not_applicable", message: "The repository has no TypeScript configuration.", evidence: []Evidence{}}
	}
	if len(invalid) == 0 {
		return checkResult{classification: "pass", message: "TypeScript configurations enable strict checking.", evidence: []Evidence{}}
	}
	return checkResult{classification: "violation", message: "TypeScript configurations must enable strict and noUncheckedIndexedAccess.", evidence: evidenceForPaths(invalid)}
}
