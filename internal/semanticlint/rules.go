package semanticlint

import (
	"embed"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	appconfig "github.com/andrueandersoncs/better-typescript/internal/config"
	"github.com/andrueandersoncs/better-typescript/internal/fileglob"
	"go.yaml.in/yaml/v3"
)

//go:embed defaults
var defaultRuleFiles embed.FS

type ruleSource struct {
	path   string
	source string
}

type semanticRuleCommand struct {
	command appconfig.Command
	rules   map[string]bool
	all     bool
}

var ruleFrontmatterPattern = regexp.MustCompile(`(?s)^---\r?\n(.*?)\r?\n---(?:\r?\n|$)`)

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

func selectSemanticRules(rules []Rule, names []string) ([]Rule, error) {
	if len(names) == 0 {
		return rules, nil
	}
	aliases := make(map[string][]int, len(rules)*2)
	selectors := make([]string, len(rules))
	for index, rule := range rules {
		selector := semanticRuleSelector(rule.Path)
		selectors[index] = selector
		aliases[selector] = append(aliases[selector], index)
		if base := selector[strings.LastIndex(selector, "/")+1:]; base != selector {
			aliases[base] = append(aliases[base], index)
		}
	}
	selected := make(map[int]bool, len(names))
	for _, name := range names {
		name = semanticRuleSelector(name)
		matches := aliases[name]
		if len(matches) == 0 {
			return nil, fmt.Errorf("unknown semantic rule: %s", name)
		}
		if len(matches) > 1 {
			choices := make([]string, len(matches))
			for index, match := range matches {
				choices[index] = selectors[match]
			}
			sort.Strings(choices)
			return nil, fmt.Errorf("semantic rule name %q is ambiguous; use one of: %s", name, strings.Join(choices, ", "))
		}
		selected[matches[0]] = true
	}
	result := make([]Rule, 0, len(selected))
	for index, rule := range rules {
		if selected[index] {
			result = append(result, rule)
		}
	}
	return result, nil
}

func compileSemanticCommands(rules []Rule, configuration appconfig.File) ([]semanticRuleCommand, error) {
	var commands []semanticRuleCommand
	for index, command := range configuration.Commands {
		if command.Mode != appconfig.ModeSemantic {
			continue
		}
		configured := semanticRuleCommand{command: command}
		if len(command.Rules) == 1 && command.Rules[0] == "*" {
			configured.all = true
		} else if len(command.Rules) > 0 {
			selected, err := selectSemanticRules(rules, command.Rules)
			if err != nil {
				return nil, fmt.Errorf("parse %s: commands[%d]: %w", appconfig.FileName, index, err)
			}
			configured.rules = make(map[string]bool, len(selected))
			for _, rule := range selected {
				configured.rules[rule.Path] = true
			}
		}
		commands = append(commands, configured)
	}
	return commands, nil
}

func rulesForPath(rules []Rule, commands []semanticRuleCommand, path string) []Rule {
	result := make([]Rule, 0, len(rules))
	for _, rule := range rules {
		if !rule.matchesPath(path) {
			continue
		}
		active := true
		for _, command := range commands {
			if !command.command.Matches(path) || (!command.all && !command.rules[rule.Path]) {
				continue
			}
			active = command.command.Type == "add_inclusions"
		}
		if active {
			result = append(result, rule)
		}
	}
	return result
}

func semanticRuleSelector(value string) string {
	value = canonicalRulePath(strings.TrimSpace(value))
	value = strings.TrimPrefix(value, "rules/")
	return strings.TrimSuffix(value, ".md")
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
	if strings.TrimSpace(source) == "" {
		return Rule{}, fmt.Errorf("rule file is empty: %s", path)
	}
	match := ruleFrontmatterPattern.FindStringSubmatchIndex(source)
	if match == nil {
		return Rule{}, fmt.Errorf("rule file has no frontmatter: %s", path)
	}
	globs, err := parseGlobFrontmatter(source[match[2]:match[3]])
	if err != nil {
		return Rule{}, fmt.Errorf("%w: %s", err, path)
	}
	definition := source[match[1]:]
	if strings.TrimSpace(definition) == "" {
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
	return Rule{Path: path, Title: title, Source: source, Globs: globs, Patterns: patterns}, nil
}

func parseGlobFrontmatter(frontmatter string) ([]string, error) {
	var metadata struct {
		Globs []string `yaml:"globs"`
	}
	if err := yaml.Unmarshal([]byte(frontmatter), &metadata); err != nil {
		return nil, fmt.Errorf("rule file has invalid frontmatter")
	}
	if len(metadata.Globs) == 0 {
		return nil, fmt.Errorf("rule frontmatter requires non-empty globs")
	}
	for _, glob := range metadata.Globs {
		if glob == "" {
			return nil, fmt.Errorf("rule frontmatter requires non-empty globs")
		}
	}
	return metadata.Globs, nil
}

func canonicalRulePath(path string) string {
	path = filepath.ToSlash(path)
	if index := strings.LastIndex(path, "/rules/"); index >= 0 {
		return "rules/" + path[index+len("/rules/"):]
	}
	return path
}

func (rule Rule) matchesPath(path string) bool {
	for _, pattern := range rule.Patterns {
		if pattern.Match(path) {
			return true
		}
	}
	return false
}
