package analysis

import (
	"fmt"
	"path/filepath"
	"runtime"
	"slices"
	"strings"
	"sync"

	"github.com/andrueandersoncs/better-typescript/internal/linter"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/bundled"
	"github.com/andrueandersoncs/typescript-go/core"
	"github.com/andrueandersoncs/typescript-go/scanner"
	"github.com/andrueandersoncs/typescript-go/tsoptions"
	"github.com/andrueandersoncs/typescript-go/tspath"
	"github.com/andrueandersoncs/typescript-go/vfs"
	"github.com/andrueandersoncs/typescript-go/vfs/cachedvfs"
	"github.com/andrueandersoncs/typescript-go/vfs/osvfs"
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

	configFileNames, err := referencedConfigFileNames(fs, configFileName)
	if err != nil {
		return nil, err
	}

	violations := make([]Violation, 0)
	for _, projectConfigFileName := range configFileNames {
		projectViolations, err := runProject(root, projectConfigFileName, fs, rules)
		if err != nil {
			return nil, err
		}
		violations = append(violations, projectViolations...)
	}

	slices.SortFunc(violations, compareViolations)
	return slices.Compact(violations), nil
}

func referencedConfigFileNames(fs vfs.FS, rootConfigFileName string) ([]string, error) {
	rootDirectory := tspath.GetDirectoryPath(rootConfigFileName)
	visited := map[tspath.Path]bool{}
	result := make([]string, 0)
	var visit func(string) error
	visit = func(configFileName string) error {
		configFileName = tspath.NormalizePath(configFileName)
		configPath := tspath.ToPath(configFileName, rootDirectory, fs.UseCaseSensitiveFileNames())
		if visited[configPath] {
			return nil
		}
		visited[configPath] = true

		currentDirectory := tspath.GetDirectoryPath(configFileName)
		host := utils.CreateCompilerHost(currentDirectory, fs)
		config, diagnostics := tsoptions.GetParsedCommandLineOfConfigFile(configFileName, &core.CompilerOptions{}, nil, host, nil)
		if config == nil || len(diagnostics) > 0 {
			return fmt.Errorf("parse TypeScript config: %s", configFileName)
		}

		result = append(result, configFileName)
		references := slices.Clone(config.ResolvedProjectReferencePaths())
		slices.Sort(references)
		for _, reference := range references {
			if err := visit(reference); err != nil {
				return err
			}
		}
		return nil
	}
	if err := visit(rootConfigFileName); err != nil {
		return nil, err
	}
	return result, nil
}

func runProject(root string, configFileName string, fs vfs.FS, rules []rule.Rule) ([]Violation, error) {
	currentDirectory := tspath.GetDirectoryPath(configFileName)
	host := utils.CreateCompilerHost(currentDirectory, fs)
	config, _ := tsoptions.GetParsedCommandLineOfConfigFile(configFileName, &core.CompilerOptions{}, nil, host, nil)
	program, err := utils.CreateProgram(fs, currentDirectory, configFileName, host)
	if err != nil {
		return nil, fmt.Errorf("create TypeScript program for %s: %w", configFileName, err)
	}
	if program == nil || config == nil {
		return nil, fmt.Errorf("create TypeScript program for %s", configFileName)
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
		Program: program,
		Files:   files,
		Workers: runtime.GOMAXPROCS(0),
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
	})
	if err != nil {
		return nil, fmt.Errorf("run linter for %s: %w", configFileName, err)
	}
	return violations, nil
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
