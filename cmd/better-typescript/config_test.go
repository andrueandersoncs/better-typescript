package main

import (
	"os"
	"strings"
	"testing"
)

func TestLoadRuleOverridesRejectsInvalidConfiguration(t *testing.T) {
	tests := []struct {
		name      string
		config    string
		wantError string
	}{
		{
			name:      "unknown included rule",
			config:    `{"overrides":[{"type":"inclusion","files":"src/**","rules":"not-a-rule"}]}`,
			wantError: "unknown rules: not-a-rule",
		},
		{
			name:      "unknown excluded rule",
			config:    `{"overrides":[{"type":"exclusion","files":"src/**","rules":"not-a-rule"}]}`,
			wantError: "unknown rules: not-a-rule",
		},
		{
			name:      "missing type",
			config:    `{"overrides":[{"files":"src/**","rules":"no-throw"}]}`,
			wantError: `type must be "inclusion" or "exclusion"`,
		},
		{
			name:      "invalid type",
			config:    `{"overrides":[{"type":"replacement","files":"src/**","rules":"no-throw"}]}`,
			wantError: `type must be "inclusion" or "exclusion"`,
		},
		{
			name:      "missing rules",
			config:    `{"overrides":[{"type":"exclusion","files":"src/**"}]}`,
			wantError: "rules is required",
		},
		{
			name:      "null rules",
			config:    `{"overrides":[{"type":"exclusion","files":"src/**","rules":null}]}`,
			wantError: "rules is required",
		},
		{
			name:      "invalid glob",
			config:    `{"overrides":[{"type":"inclusion","files":"src/[.ts","rules":"no-throw"}]}`,
			wantError: `invalid file glob "src/[.ts"`,
		},
		{
			name:      "removed disable field",
			config:    `{"overrides":[{"type":"exclusion","files":"src/**","rules":"no-throw","disable":"no-error-type"}]}`,
			wantError: `unknown field "disable"`,
		},
		{
			name:      "unknown field",
			config:    `{"override":[{"type":"inclusion","files":"src/**","rules":"no-throw"}]}`,
			wantError: `unknown field "override"`,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			root := t.TempDir()
			if err := os.WriteFile(root+"/"+configFileName, []byte(test.config), 0o600); err != nil {
				t.Fatal(err)
			}
			_, err := loadRuleOverrides(root)
			if err == nil || !strings.Contains(err.Error(), test.wantError) {
				t.Fatalf("error = %v, want text %q", err, test.wantError)
			}
		})
	}
}
