package config

import (
	"strings"
	"testing"
)

func TestParseCommandModes(t *testing.T) {
	configuration, err := Parse([]byte(`{
		"commands": [
			{"type":"add_exclusions","files":"src/**/*.test.ts","rules":"no-throw"},
			{"mode":"semantic","type":"add_inclusions","files":"generated/**","rules":[]}
		]
	}`))
	if err != nil {
		t.Fatal(err)
	}

	if len(configuration.Commands) != 2 ||
		configuration.Commands[0].Mode != ModeDeterministic ||
		configuration.Commands[1].Mode != ModeSemantic {
		t.Fatalf("commands = %#v", configuration.Commands)
	}
	if !configuration.Commands[1].Matches("generated/client.ts") {
		t.Fatal("semantic command did not match generated file")
	}
}

func TestParseRejectsInvalidCommandModes(t *testing.T) {
	tests := []struct {
		content string
		want    string
	}{
		{content: `{"commands":[{"mode":"other","type":"add_inclusions","files":"src/**","rules":[]}]}`, want: "mode must be"},
		{content: `{"commands":[{"type":"exclude_targets","files":"src/**"}]}`, want: "type must be"},
		{content: `{"commands":[{"mode":"semantic","type":"add_inclusions","files":"src/**"}]}`, want: "rules is required"},
		{content: `{"commands":[{"mode":"semantic","type":"add_exclusions","files":"src/**","rules":["*","a"]}]}`, want: "wildcard must be the only rule"},
		{content: `{"ignores":["src/**"]}`, want: `unknown field "ignores"`},
	}
	for _, test := range tests {
		_, err := Parse([]byte(test.content))
		if err == nil || !strings.Contains(err.Error(), test.want) {
			t.Errorf("Parse(%s) error = %v, want %q", test.content, err, test.want)
		}
	}
}
