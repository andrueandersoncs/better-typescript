package ruletest

import (
	"path/filepath"
	"reflect"
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
)

func Assert(t *testing.T, projectPath string, builtin rule.Rule, want []analysis.Violation) {
	t.Helper()
	root, err := filepath.Abs(projectPath)
	if err != nil {
		t.Fatal(err)
	}
	violations, err := analysis.Run(root, []rule.Rule{builtin})
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(violations, want) {
		t.Fatalf("violations = %#v, want %#v", violations, want)
	}
}
