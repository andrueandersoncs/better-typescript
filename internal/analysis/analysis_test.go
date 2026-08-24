package analysis_test

import (
	"path/filepath"
	"reflect"
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/rules/no_throw"
	"github.com/andrueandersoncs/better-typescript/internal/rules/no_unused"
	"github.com/microsoft/typescript-go/shim/ast"
)

func TestRunAnalyzesReferencedProject(t *testing.T) {
	root, err := filepath.Abs("testdata/references")
	if err != nil {
		t.Fatal(err)
	}

	violations, err := analysis.Run(root, []rule.Rule{no_throw.Rule})
	if err != nil {
		t.Fatal(err)
	}
	want := []analysis.Violation{{
		RuleName: "no-throw",
		Level:    "error",
		Message:  "Avoid throwing errors with throw. Create a custom error with Schema.TaggedErrorClass, then yield it instead, for example: class CustomError extends Schema.TaggedErrorClass<CustomError>()(\"CustomError\", {}) {}; yield* new CustomError().",
		FilePath: "child/index.ts",
		Line:     2,
		Column:   3,
	}}
	if !reflect.DeepEqual(violations, want) {
		t.Fatalf("violations = %#v, want %#v", violations, want)
	}
}

func TestRunKeepsSemanticDiagnosticsOnWorkerChecker(t *testing.T) {
	root, err := filepath.Abs("testdata/concurrent-checkers")
	if err != nil {
		t.Fatal(err)
	}
	checkerReader := rule.Rule{
		Name: "checker-reader",
		Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
			return rule.RuleListeners{
				ast.KindIdentifier: func(node *ast.Node) {
					ctx.TypeChecker.GetTypeAtLocation(node)
				},
			}
		},
	}

	violations, err := analysis.Run(root, []rule.Rule{no_unused.Rule, checkerReader})
	if err != nil {
		t.Fatal(err)
	}
	if len(violations) != 8 {
		t.Fatalf("got %d violations, want 8", len(violations))
	}
}
