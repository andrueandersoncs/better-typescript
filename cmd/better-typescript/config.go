package main

import (
	"fmt"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	appconfig "github.com/andrueandersoncs/better-typescript/internal/config"
)

func loadRuleCommands(configuration appconfig.File) ([]analysis.RuleOverride, error) {
	var commands []analysis.RuleOverride
	for index, entry := range configuration.Commands {
		if entry.Mode != appconfig.ModeDeterministic {
			continue
		}
		selectedRules, err := selectRuleNames(entry.Rules)
		if err != nil {
			return nil, fmt.Errorf("parse %s: commands[%d]: %w", appconfig.FileName, index, err)
		}
		commands = append(commands, analysis.RuleOverride{
			FilePattern:  entry.Files,
			Rules:        selectedRules,
			ExcludeRules: entry.Type == "add_exclusions",
		})
	}
	return commands, nil
}
