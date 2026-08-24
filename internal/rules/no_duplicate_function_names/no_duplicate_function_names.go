package no_duplicate_function_names

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

type namedFunction struct {
	name *ast.Node
	file *ast.SourceFile
}

func topLevelFunctions(sourceFile *ast.SourceFile) []namedFunction {
	result := []namedFunction{}
	for _, statement := range sourceFile.AsNode().Statements() {
		if ast.IsFunctionDeclaration(statement) && statement.Name() != nil && ast.IsIdentifier(statement.Name()) {
			result = append(result, namedFunction{name: statement.Name(), file: sourceFile})
			continue
		}
		if !ast.IsVariableStatement(statement) {
			continue
		}
		for _, declaration := range statement.AsVariableStatement().DeclarationList.AsVariableDeclarationList().Declarations.Nodes {
			initializer := declaration.Initializer()
			if ast.IsIdentifier(declaration.Name()) && initializer != nil && (ast.IsFunctionExpression(initializer) || ast.IsArrowFunction(initializer)) {
				result = append(result, namedFunction{name: declaration.Name(), file: sourceFile})
			}
		}
	}
	return result
}

func projectRoot(fileName string) string {
	for directory := filepath.Dir(fileName); ; directory = filepath.Dir(directory) {
		if _, err := os.Stat(filepath.Join(directory, "tsconfig.json")); err == nil {
			return directory
		}
		parent := filepath.Dir(directory)
		if parent == directory {
			return filepath.Dir(fileName)
		}
	}
}

func relativeFileName(root string, fileName string) string {
	relative, err := filepath.Rel(root, fileName)
	if err != nil {
		return filepath.ToSlash(fileName)
	}
	return filepath.ToSlash(relative)
}

func otherFilesText(files []string) string {
	if len(files) <= 3 {
		return strings.Join(files, ", ")
	}
	remaining := len(files) - 3
	suffix := fmt.Sprintf("%d more files", remaining)
	if remaining == 1 {
		suffix = "1 more file"
	}
	return strings.Join(files[:3], ", ") + " and " + suffix
}

func checkSourceFile(ctx rule.RuleContext) {
	index := map[string][]namedFunction{}
	for _, sourceFile := range ctx.Program.SourceFiles() {
		if sourceFile.IsDeclarationFile || strings.Contains(filepath.ToSlash(sourceFile.FileName()), "/node_modules/") {
			continue
		}
		for _, function := range topLevelFunctions(sourceFile) {
			index[function.name.Text()] = append(index[function.name.Text()], function)
		}
	}
	root := projectRoot(ctx.SourceFile.FileName())
	for _, candidate := range topLevelFunctions(ctx.SourceFile) {
		candidateType := ctx.TypeChecker.GetTypeAtLocation(candidate.name)
		seen := map[string]bool{}
		others := []string{}
		for _, other := range index[candidate.name.Text()] {
			if other.file.FileName() == ctx.SourceFile.FileName() {
				continue
			}
			otherType := ctx.TypeChecker.GetTypeAtLocation(other.name)
			if !ctx.TypeChecker.IsTypeAssignableTo(candidateType, otherType) || !ctx.TypeChecker.IsTypeAssignableTo(otherType, candidateType) {
				continue
			}
			name := relativeFileName(root, other.file.FileName())
			if !seen[name] {
				seen[name] = true
				others = append(others, name)
			}
		}
		if len(others) == 0 {
			continue
		}
		otherFiles := otherFilesText(others)
		functionName := candidate.name.Text()
		ctx.ReportNode(candidate.name, rule.RuleMessage{
			Id:          "noDuplicateFunctionNames",
			Description: "Avoid declaring the top-level function " + functionName + " with an identical signature in multiple files.",
			Help:        functionName + " is declared with the same signature in " + otherFiles + ", which makes the copies semantic duplicates. Extract one shared implementation into a module scoped to its domain and import it from every file that uses it. Name the module after the concept it serves (ts.Node helpers belong in ts-node.ts), not a generic lib.ts or utils.ts. Same-name functions over different signatures (user.ts#make, account.ts#make) are module vocabulary, not duplicates.",
		})
	}
}

var NoDuplicateFunctionNamesRule = rule.Rule{
	Name: "no-duplicate-function-names",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindEndOfFile: func(node *ast.Node) { checkSourceFile(ctx) }}
	},
}
