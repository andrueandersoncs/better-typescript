package analysis_test

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/rules/no_throw"
	"github.com/andrueandersoncs/better-typescript/internal/rules/no_unused"
	"github.com/andrueandersoncs/typescript-go/ast"
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

func TestRunReportsMissingTsconfig(t *testing.T) {
	_, err := analysis.Run(t.TempDir(), nil)
	if err == nil || err.Error() != "tsconfig.json does not exist" {
		t.Fatalf("error = %v, want %q", err, "tsconfig.json does not exist")
	}
}

func TestRunReportsInvalidTsconfig(t *testing.T) {
	root := t.TempDir()
	configFileName := filepath.Join(root, "tsconfig.json")
	if err := os.WriteFile(configFileName, []byte("not json"), 0o600); err != nil {
		t.Fatal(err)
	}

	_, err := analysis.Run(root, nil)
	want := "create TypeScript program for " + filepath.ToSlash(configFileName)
	if err == nil || err.Error() != want {
		t.Fatalf("error = %v, want %q", err, want)
	}
}

func TestRunUsesNormalizedPathsAndUTF16Columns(t *testing.T) {
	root, err := filepath.Abs("testdata/locations")
	if err != nil {
		t.Fatal(err)
	}
	unnormalizedRoot := root + string(os.PathSeparator) + "src" + string(os.PathSeparator) + ".."

	violations, err := analysis.Run(unnormalizedRoot, []rule.Rule{no_throw.Rule})
	if err != nil {
		t.Fatal(err)
	}
	if len(violations) != 1 {
		t.Fatalf("got %d violations, want 1", len(violations))
	}
	violation := violations[0]
	if violation.FilePath != "src/nested.ts" {
		t.Errorf("file path = %q, want %q", violation.FilePath, "src/nested.ts")
	}
	if violation.Line != 1 || violation.Column != 39 {
		t.Errorf("location = %d:%d, want 1:39", violation.Line, violation.Column)
	}
}

func TestRunDeduplicatesExactViolations(t *testing.T) {
	root, err := filepath.Abs("testdata/references")
	if err != nil {
		t.Fatal(err)
	}

	violations, err := analysis.Run(root, []rule.Rule{no_throw.Rule, no_throw.Rule})
	if err != nil {
		t.Fatal(err)
	}
	if len(violations) != 1 {
		t.Fatalf("got %d violations, want 1", len(violations))
	}
}
