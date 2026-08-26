package analysis

import (
	"github.com/andrueandersoncs/better-typescript/internal/linter"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
)

type configuredRuleOverride struct {
	matcher      fileMatcher
	rules        []linter.ConfiguredRule
	excludeRules bool
}

type ruleSelector struct {
	defaultRules []linter.ConfiguredRule
	overrides    []configuredRuleOverride
}

func newRuleSelector(root string, defaultRules []rule.Rule, overrides []RuleOverride) (ruleSelector, error) {
	configuredOverrides := make([]configuredRuleOverride, len(overrides))
	for index, override := range overrides {
		matcher, err := newFileMatcher(root, []string{override.FilePattern})
		if err != nil {
			return ruleSelector{}, err
		}
		configuredOverrides[index] = configuredRuleOverride{
			matcher:      matcher,
			rules:        configureRules(override.Rules),
			excludeRules: override.ExcludeRules,
		}
	}
	return ruleSelector{
		defaultRules: configureRules(defaultRules),
		overrides:    configuredOverrides,
	}, nil
}

func (selector ruleSelector) rulesForFile(fileName string) []linter.ConfiguredRule {
	selected := selector.defaultRules
	for _, override := range selector.overrides {
		if !override.matcher.matches(fileName) {
			continue
		}
		if override.excludeRules {
			selected = removeRules(selected, override.rules)
		} else {
			selected = override.rules
		}
	}
	return selected
}

func removeRules(selected, excluded []linter.ConfiguredRule) []linter.ConfiguredRule {
	excludedNames := make(map[string]bool, len(excluded))
	for _, configured := range excluded {
		excludedNames[configured.Name] = true
	}
	result := make([]linter.ConfiguredRule, 0, len(selected))
	for _, configured := range selected {
		if !excludedNames[configured.Name] {
			result = append(result, configured)
		}
	}
	return result
}

func configureRules(rules []rule.Rule) []linter.ConfiguredRule {
	configured := make([]linter.ConfiguredRule, len(rules))
	for index := range rules {
		builtin := rules[index]
		configured[index] = linter.ConfiguredRule{
			Name: builtin.Name,
			Run: func(ctx rule.RuleContext) rule.RuleListeners {
				return builtin.Run(ctx, nil)
			},
		}
	}
	return configured
}
