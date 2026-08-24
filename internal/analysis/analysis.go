package analysis

import (
	"fmt"
	"path/filepath"
	"runtime"
	"slices"
	"strings"
	"sync"

	"github.com/andrueandersoncs/better-typescript/internal/diagnostic"
	"github.com/andrueandersoncs/better-typescript/internal/linter"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/bundled"
	"github.com/microsoft/typescript-go/shim/core"
	"github.com/microsoft/typescript-go/shim/scanner"
	"github.com/microsoft/typescript-go/shim/tsoptions"
	"github.com/microsoft/typescript-go/shim/tspath"
	"github.com/microsoft/typescript-go/shim/vfs/cachedvfs"
	"github.com/microsoft/typescript-go/shim/vfs/osvfs"
)

type Violation struct {
	RuleName string `json:"ruleName"`
	Level    string `json:"level"`
	Message  string `json:"message"`
	FilePath string `json:"filePath"`
	Line     int    `json:"line"`
	Column   int    `json:"column"`
}

func Run(root string, rules []rule.Rule) ([]Violation, error) {
	root = tspath.NormalizePath(root)
	configFileName := tspath.ResolvePath(root, "tsconfig.json")
	fs := bundled.WrapFS(cachedvfs.From(osvfs.FS()))
	if !fs.FileExists(configFileName) {
		return nil, fmt.Errorf("tsconfig.json does not exist")
	}

	host := utils.CreateCompilerHost(root, fs)
	config, _ := tsoptions.GetParsedCommandLineOfConfigFile(configFileName, &core.CompilerOptions{}, nil, host, nil)
	program, _, err := utils.CreateProgram(false, fs, root, configFileName, host, false)
	if err != nil {
		return nil, fmt.Errorf("create TypeScript program: %w", err)
	}
	if program == nil || config == nil {
		return nil, fmt.Errorf("create TypeScript program")
	}

	files := make([]*ast.SourceFile, 0, len(config.FileNames()))
	for _, fileName := range config.FileNames() {
		file := program.GetSourceFile(fileName)
		if file != nil && !file.IsDeclarationFile {
			files = append(files, file)
		}
	}

	configuredRules := make([]linter.ConfiguredRule, len(rules))
	for index := range rules {
		builtin := rules[index]
		configuredRules[index] = linter.ConfiguredRule{
			Name: builtin.Name,
			Run: func(ctx rule.RuleContext) rule.RuleListeners {
				return builtin.Run(ctx, nil)
			},
		}
	}

	var mu sync.Mutex
	violations := make([]Violation, 0)
	err = linter.RunLinterOnProgram(linter.RunLinterOnProgramOptions{
		LogLevel: utils.LogLevelNormal,
		Program:  program,
		Files:    files,
		Workers:  runtime.GOMAXPROCS(0),
		GetRulesForFile: func(_ *ast.SourceFile) []linter.ConfiguredRule {
			return configuredRules
		},
		OnDiagnostic: func(result rule.RuleDiagnostic) {
			line, column := scanner.GetECMALineAndUTF16CharacterOfPosition(result.SourceFile, result.Range.Pos())
			filePath, relativeErr := filepath.Rel(root, result.SourceFile.FileName())
			if relativeErr != nil {
				filePath = result.SourceFile.FileName()
			}
			message := result.Message.Description
			if result.Message.Help != "" {
				message += " " + result.Message.Help
			}
			mu.Lock()
			violations = append(violations, Violation{
				RuleName: result.RuleName,
				Level:    "error",
				Message:  message,
				FilePath: filepath.ToSlash(filePath),
				Line:     line + 1,
				Column:   int(column) + 1,
			})
			mu.Unlock()
		},
		OnInternalDiagnostic: func(_ diagnostic.Internal) {},
	})
	if err != nil {
		return nil, fmt.Errorf("run linter: %w", err)
	}

	slices.SortFunc(violations, compareViolations)
	return slices.Compact(violations), nil
}

func compareViolations(left, right Violation) int {
	if value := strings.Compare(left.FilePath, right.FilePath); value != 0 {
		return value
	}
	if left.Line != right.Line {
		return left.Line - right.Line
	}
	if left.Column != right.Column {
		return left.Column - right.Column
	}
	if value := strings.Compare(left.RuleName, right.RuleName); value != 0 {
		return value
	}
	if value := strings.Compare(left.Level, right.Level); value != 0 {
		return value
	}
	return strings.Compare(left.Message, right.Message)
}
