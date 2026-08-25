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
			name:      "unknown rule",
			config:    `{"overrides":[{"files":"src/**","rules":"not-a-rule"}]}`,
			wantError: "unknown rules: not-a-rule",
		},
		{
			name:      "invalid glob",
			config:    `{"overrides":[{"files":"src/[.ts","rules":"no-throw"}]}`,
			wantError: `invalid file glob "src/[.ts"`,
		},
		{
			name:      "unknown field",
			config:    `{"override":[{"files":"src/**","rules":"no-throw"}]}`,
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
