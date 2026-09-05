package rules

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"strconv"
	"strings"
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/compiler"
)

func TestDocumentedExamples(t *testing.T) {
	repository, err := filepath.Abs("../..")
	if err != nil {
		t.Fatal(err)
	}
	root := t.TempDir()
	effectSource := filepath.ToSlash(filepath.Join(repository, "repos/effect/packages/effect/src"))
	config, err := json.Marshal(map[string]any{
		"compilerOptions": map[string]any{
			"strict": true, "target": "ES2022", "module": "ESNext", "moduleResolution": "Bundler", "skipLibCheck": true,
			"paths": map[string][]string{"effect": {effectSource + "/index.ts"}, "effect/*": {effectSource + "/*.ts"}},
		},
		"include": []string{"*.ts"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "tsconfig.json"), config, 0600); err != nil {
		t.Fatal(err)
	}

	var want []string
	var selected []rule.Rule
	for _, builtin := range BuiltinRules {
		document, err := os.ReadFile(filepath.Join(repository, "docs/rules", builtin.Name+".md"))
		if err != nil {
			t.Fatal(err)
		}
		lines := strings.Split(string(document), "\n")
		examples := 0
		for index := 0; index < len(lines); index++ {
			marker, ok := strings.CutPrefix(lines[index], "```ts lint=")
			if !ok {
				continue
			}
			examples++
			file := fmt.Sprintf("%s-%d.ts", builtin.Name, examples)
			start := index + 1
			for index++; index < len(lines) && lines[index] != "```"; index++ {
			}
			if index == len(lines) {
				t.Fatalf("%s: unclosed example at line %d", builtin.Name, start)
			}
			source := strings.Join(lines[start:index], "\n") + "\nexport {}\n"
			if err := os.WriteFile(filepath.Join(root, file), []byte(source), 0600); err != nil {
				t.Fatal(err)
			}
			if marker == "clean" {
				continue
			}
			locations, ok := strings.CutPrefix(marker, "error:")
			if !ok {
				t.Fatalf("%s: invalid lint marker %q", builtin.Name, marker)
			}
			for _, location := range strings.Split(locations, ",") {
				line, column, ok := strings.Cut(location, ":")
				lineNumber, lineErr := strconv.Atoi(line)
				columnNumber, columnErr := strconv.Atoi(column)
				if !ok || lineErr != nil || columnErr != nil || lineNumber < 1 || columnNumber < 1 {
					t.Fatalf("%s: invalid diagnostic location %q", builtin.Name, location)
				}
				want = append(want, fmt.Sprintf("%s:%d:%d:%s", file, lineNumber, columnNumber, builtin.Name))
			}
		}
		if examples > 0 {
			selected = append(selected, builtin)
		}
	}
	if len(selected) == 0 {
		t.Fatal("no public examples marked for compilation and linting")
	}
	selected = append(selected, rule.Rule{Name: "documentation-types", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		for _, diagnostic := range compiler.Program_GetSyntacticDiagnostics(ctx.Program, context.Background(), ctx.SourceFile) {
			t.Errorf("%s: syntax diagnostic TS%d", ctx.SourceFile.FileName(), diagnostic.Code())
		}
		for _, diagnostic := range compiler.Program_GetSemanticDiagnosticsWithChecker(ctx.Program, context.Background(), ctx.TypeChecker, ctx.SourceFile) {
			t.Errorf("%s: semantic diagnostic TS%d", ctx.SourceFile.FileName(), diagnostic.Code())
		}
		return nil
	}})
	violations, err := analysis.Run(root, selected)
	if err != nil {
		t.Fatal(err)
	}
	var got []string
	for _, violation := range violations {
		got = append(got, fmt.Sprintf("%s:%d:%d:%s", violation.FilePath, violation.Line, violation.Column, violation.RuleName))
	}
	sort.Strings(got)
	sort.Strings(want)
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("documented diagnostics = %v, want %v", got, want)
	}
}
