package main

import (
	"os"
	"strings"
	"testing"
)

func TestLoadRuleCommandsRejectsInvalidConfiguration(t *testing.T) {
	tests := []struct {
		name      string
		config    string
		wantError string
	}{
		{
			name:      "unknown included rule",
			config:    `{"commands":[{"type":"add_inclusions","files":"src/**","rules":"not-a-rule"}]}`,
			wantError: "unknown rules: not-a-rule",
		},
		{
			name:      "unknown excluded rule",
			config:    `{"commands":[{"type":"add_exclusions","files":"src/**","rules":"not-a-rule"}]}`,
			wantError: "unknown rules: not-a-rule",
		},
		{
			name:      "missing type",
			config:    `{"commands":[{"files":"src/**","rules":"no-throw"}]}`,
			wantError: `type must be "add_exclusions" or "add_inclusions"`,
		},
		{
			name:      "invalid type",
			config:    `{"commands":[{"type":"replacement","files":"src/**","rules":"no-throw"}]}`,
			wantError: `type must be "add_exclusions" or "add_inclusions"`,
		},
		{
			name:      "missing rules",
			config:    `{"commands":[{"type":"add_exclusions","files":"src/**"}]}`,
			wantError: "rules is required",
		},
		{
			name:      "null rules",
			config:    `{"commands":[{"type":"add_exclusions","files":"src/**","rules":null}]}`,
			wantError: "rules is required",
		},
		{
			name:      "invalid glob",
			config:    `{"commands":[{"type":"add_inclusions","files":"src/[.ts","rules":"no-throw"}]}`,
			wantError: `invalid file glob "src/[.ts"`,
		},
		{
			name:      "singular type",
			config:    `{"commands":[{"type":"add_inclusion","files":"src/**","rules":"no-throw"}]}`,
			wantError: `type must be "add_exclusions" or "add_inclusions"`,
		},
		{
			name:      "legacy overrides field",
			config:    `{"overrides":[]}`,
			wantError: `unknown field "overrides"`,
		},
		{
			name:      "removed disable field",
			config:    `{"commands":[{"type":"add_exclusions","files":"src/**","rules":"no-throw","disable":"no-error-type"}]}`,
			wantError: `unknown field "disable"`,
		},
		{
			name:      "unknown field",
			config:    `{"override":[{"type":"add_inclusions","files":"src/**","rules":"no-throw"}]}`,
			wantError: `unknown field "override"`,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			root := t.TempDir()
			if err := os.WriteFile(root+"/"+configFileName, []byte(test.config), 0o600); err != nil {
				t.Fatal(err)
			}
			_, err := loadRuleCommands(root)
			if err == nil || !strings.Contains(err.Error(), test.wantError) {
				t.Fatalf("error = %v, want text %q", err, test.wantError)
			}
		})
	}
}
