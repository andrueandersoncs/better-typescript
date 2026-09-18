package semanticlint

import (
	"embed"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/fileglob"
)

//go:embed defaults
var defaultRuleFiles embed.FS

type ruleSource struct {
	path   string
	source string
}

var deterministicChecks = map[string]string{
	"rules/filenames/use-distinct-filenames.md":                                  "distinct-filenames",
	"rules/bun-builds/choose-the-install-linker-deliberately.md":                 "bun-install-linker",
	"rules/bun-builds/declare-dependencies-in-every-consuming-workspace.md":      "declared-workspace-dependencies",
	"rules/bun-builds/use-one-pinned-bun-toolchain-and-root-lockfile.md":         "pinned-bun-toolchain",
	"rules/testing-enforcement/enforce-important-rules-automatically.md":         "root-check-command",
	"rules/testing-enforcement/choose-test-runners-and-type-check-explicitly.md": "test-and-typecheck-commands",
	"rules/repository-boundaries/import-packages-through-public-exports.md":      "workspace-public-imports",
	"rules/repository-boundaries/enforce-acyclic-dependency-direction.md":        "acyclic-dependencies",
	"rules/modularity/keep-dependencies-acyclic.md":                              "acyclic-dependencies",
	"rules/typescript-contracts/use-strict-runtime-specific-tsconfig-files.md":   "strict-runtime-tsconfig",
}

var reviewEvidence = map[string][]string{
	"rules/simplicity/require-each-change-to-justify-its-complexity.md":       {"the requirement and acceptance criteria", "considered alternatives"},
	"rules/simplicity/solve-the-problem-that-exists.md":                       {"the reported problem and required behavior"},
	"rules/simplicity/optimize-demonstrated-bottlenecks-not-imagined-ones.md": {"before-and-after performance measurements"},
	"rules/simplicity/make-dependencies-earn-their-complexity.md":             {"the dependency rationale and considered built-in alternatives"},
	"rules/abstraction/require-a-net-reduction-in-complexity.md":              {"the before-and-after complexity rationale"},
	"rules/abstraction/name-the-concrete-problem-an-abstraction-solves.md":    {"the abstraction's stated purpose"},
	"rules/abstraction/define-the-contract-before-the-implementation.md":      {"the contract and implementation chronology"},
	"rules/abstraction/generalize-from-demonstrated-needs.md":                 {"demonstrated use cases and their history"},
	"rules/abstraction/keep-adoption-focused-and-reversible.md":               {"the rollout and rollback plan"},
}

var repositoryRulePrefixes = []string{
	"rules/abstraction/", "rules/bun-builds/", "rules/file-code-organization/",
	"rules/filenames/", "rules/modularity/", "rules/repository-boundaries/",
	"rules/repository-maintenance/", "rules/testing-enforcement/",
	"rules/typescript-contracts/", "rules/web-boundaries/",
}

var repositoryRules = map[string]bool{
	"rules/avoid-repetition.md": true,
	"rules/simplicity/follow-existing-conventions-unless-there-is-a-clear-reason-not-to.md": true,
	"rules/simplicity/remove-what-no-longer-contributes.md":                                 true,
}

var changeRules = map[string]bool{
	"rules/simplicity/preserve-necessary-safeguards.md":               true,
	"rules/simplicity/let-abstractions-emerge-from-concrete-needs.md": true,
}

func loadRules(root, localDirectory string) ([]Rule, error) {
	sources, err := embeddedRuleSources()
	if err != nil {
		return nil, err
	}
	if localDirectory != "" {
		local, err := localRuleSources(root, localDirectory)
		if err != nil {
			return nil, err
		}
		sources = append(sources, local...)
	}
	sort.Slice(sources, func(i, j int) bool { return sources[i].path < sources[j].path })
	rules := make([]Rule, 0, len(sources))
	for index, item := range sources {
		rule, err := parseRule(item.path, item.source)
		if err != nil {
			return nil, err
		}
		rule.ID = fmt.Sprintf("rule_%d", index+1)
		rules = append(rules, rule)
	}
	if len(rules) == 0 {
		return nil, fmt.Errorf("no semantic rule files found")
	}
	return rules, nil
}

func embeddedRuleSources() ([]ruleSource, error) {
	var result []ruleSource
	err := fs.WalkDir(defaultRuleFiles, "defaults", func(name string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.IsDir() || filepath.Ext(name) != ".md" {
			return nil
		}
		content, err := defaultRuleFiles.ReadFile(name)
		if err != nil {
			return err
		}
		path := "rules/" + strings.TrimPrefix(filepath.ToSlash(name), "defaults/")
		result = append(result, ruleSource{path: path, source: string(content)})
		return nil
	})
	return result, err
}

func localRuleSources(root, directory string) ([]ruleSource, error) {
	absolute := directory
	if !filepath.IsAbs(absolute) {
		absolute = filepath.Join(root, directory)
	}
	info, err := os.Stat(absolute)
	if os.IsNotExist(err) && directory == ".better-typescript/rules" {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("read semantic rules directory: %w", err)
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("semantic rules path is not a directory: %s", directory)
	}
	var result []ruleSource
	err = filepath.WalkDir(absolute, func(name string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.IsDir() || filepath.Ext(name) != ".md" {
			return nil
		}
		content, err := os.ReadFile(name)
		if err != nil {
			return err
		}
		relative, err := filepath.Rel(root, name)
		if err != nil {
			return err
		}
		result = append(result, ruleSource{path: filepath.ToSlash(relative), source: string(content)})
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("discover semantic rules: %w", err)
	}
	return result, nil
}

func parseRule(path, source string) (Rule, error) {
	source = strings.TrimSpace(source)
	if source == "" {
		return Rule{}, fmt.Errorf("rule file is empty: %s", path)
	}
	if !strings.HasPrefix(source, "---\n") {
		return Rule{}, fmt.Errorf("rule file has no frontmatter: %s", path)
	}
	end := strings.Index(source[4:], "\n---")
	if end < 0 {
		return Rule{}, fmt.Errorf("rule file has invalid frontmatter: %s", path)
	}
	frontmatterEnd := 4 + end
	globs, err := parseGlobFrontmatter(source[4:frontmatterEnd])
	if err != nil {
		return Rule{}, fmt.Errorf("%w: %s", err, path)
	}
	definition := strings.TrimSpace(source[frontmatterEnd+4:])
	if definition == "" {
		return Rule{}, fmt.Errorf("rule definition is empty: %s", path)
	}
	patterns := make([]fileglob.Pattern, 0, len(globs))
	for _, glob := range globs {
		compiled, err := fileglob.CompileAll(glob)
		if err != nil {
			return Rule{}, fmt.Errorf("rule frontmatter has an invalid glob: %s: %w", path, err)
		}
		patterns = append(patterns, compiled...)
	}
	title := path
	for _, line := range strings.Split(definition, "\n") {
		if strings.HasPrefix(line, "# ") {
			title = strings.TrimSpace(strings.TrimPrefix(line, "# "))
			break
		}
	}
	return Rule{Path: path, Title: title, Definition: definition, Globs: globs, Patterns: patterns, Metadata: metadataForRule(canonicalRulePath(path))}, nil
}

func parseGlobFrontmatter(frontmatter string) ([]string, error) {
	lines := strings.Split(frontmatter, "\n")
	inGlobs := false
	var globs []string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "globs:" {
			inGlobs = true
			continue
		}
		if !inGlobs || !strings.HasPrefix(trimmed, "-") {
			continue
		}
		value := strings.TrimSpace(strings.TrimPrefix(trimmed, "-"))
		if len(value) >= 2 && ((value[0] == '"' && value[len(value)-1] == '"') || (value[0] == '\'' && value[len(value)-1] == '\'')) {
			if value[0] == '\'' {
				value = value[1 : len(value)-1]
			} else {
				unquoted, err := strconv.Unquote(value)
				if err != nil {
					return nil, fmt.Errorf("rule file has invalid frontmatter")
				}
				value = unquoted
			}
		}
		if value == "" {
			return nil, fmt.Errorf("rule frontmatter requires non-empty globs")
		}
		globs = append(globs, value)
	}
	if len(globs) == 0 {
		return nil, fmt.Errorf("rule frontmatter requires non-empty globs")
	}
	return globs, nil
}

func canonicalRulePath(path string) string {
	path = filepath.ToSlash(path)
	if index := strings.LastIndex(path, "/rules/"); index >= 0 {
		return "rules/" + path[index+len("/rules/"):]
	}
	return path
}

func metadataForRule(path string) RuleMetadata {
	if check := deterministicChecks[path]; check != "" {
		return RuleMetadata{Evaluator: "deterministic", Scope: "repository", DeterministicCheck: check, RequiredEvidence: []string{"repository paths and configuration"}}
	}
	if evidence := reviewEvidence[path]; len(evidence) > 0 {
		return RuleMetadata{Evaluator: "review", Scope: "change", RequiredEvidence: evidence}
	}
	if changeRules[path] {
		return RuleMetadata{Evaluator: "semantic", Scope: "change", RequiredEvidence: []string{"working-tree diff and changed sources"}}
	}
	if repositoryRules[path] {
		return RuleMetadata{Evaluator: "semantic", Scope: "repository", RequiredEvidence: []string{"repository paths, source, configuration, and diff"}}
	}
	for _, prefix := range repositoryRulePrefixes {
		if strings.HasPrefix(path, prefix) {
			return RuleMetadata{Evaluator: "semantic", Scope: "repository", RequiredEvidence: []string{"repository paths, source, configuration, and diff"}}
		}
	}
	return RuleMetadata{Evaluator: "semantic", Scope: "source", RequiredEvidence: []string{"changed source and repository context"}}
}

func (rule Rule) matchesPath(path string) bool {
	for _, pattern := range rule.Patterns {
		if pattern.Match(path) {
			return true
		}
	}
	return false
}
