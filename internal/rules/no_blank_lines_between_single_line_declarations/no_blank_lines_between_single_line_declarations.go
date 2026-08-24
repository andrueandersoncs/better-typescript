package no_blank_lines_between_single_line_declarations

import (
	"regexp"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
)

var blankLinePattern = regexp.MustCompile(`\n[ \t]*\r?\n`)

var message = rule.RuleMessage{
	Id:          "noBlankLinesBetweenSingleLineDeclarations",
	Description: "Single-line declarations must not have blank lines between them.",
	Help:        "Remove the empty line between these adjacent single-line declarations so they stay contiguous. Blank lines remain required around multi-line declarations; keep those separators when a neighbor is multi-line.",
}

func isDeclarationStatement(node *ast.Node) bool {
	switch node.Kind {
	case ast.KindVariableStatement, ast.KindFunctionDeclaration, ast.KindClassDeclaration, ast.KindInterfaceDeclaration, ast.KindTypeAliasDeclaration, ast.KindEnumDeclaration, ast.KindModuleDeclaration:
		return true
	default:
		return false
	}
}

func isInsideFunction(node *ast.Node) bool {
	for parent := node.Parent; parent != nil && !ast.IsSourceFile(parent); parent = parent.Parent {
		if ast.IsFunctionLike(parent) {
			return true
		}
	}
	return false
}

func isSingleLine(sourceFile *ast.SourceFile, node *ast.Node) bool {
	r := utils.TrimNodeTextRange(sourceFile, node)
	source := sourceFile.Text()
	return !strings.Contains(source[r.Pos():r.End()], "\n")
}

func checkDeclaration(ctx rule.RuleContext, node *ast.Node) {
	if !isDeclarationStatement(node) || !isInsideFunction(node) || !isSingleLine(ctx.SourceFile, node) {
		return
	}
	parent := node.Parent
	if parent == nil || !parent.CanHaveStatements() {
		return
	}
	statements := parent.Statements()
	for index, current := range statements {
		if current != node || index == 0 {
			continue
		}
		previous := statements[index-1]
		if !isDeclarationStatement(previous) || !isSingleLine(ctx.SourceFile, previous) {
			return
		}
		beforeEnd := previous.End()
		afterStart := utils.TrimNodeTextRange(ctx.SourceFile, node).Pos()
		if beforeEnd <= afterStart && blankLinePattern.MatchString(ctx.SourceFile.Text()[beforeEnd:afterStart]) {
			ctx.ReportNode(node, message)
		}
		return
	}
}

func listener(ctx rule.RuleContext) func(*ast.Node) {
	return func(node *ast.Node) { checkDeclaration(ctx, node) }
}

var NoBlankLinesBetweenSingleLineDeclarationsRule = rule.Rule{
	Name: "no-blank-lines-between-single-line-declarations",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		check := listener(ctx)
		return rule.RuleListeners{
			ast.KindVariableStatement:    check,
			ast.KindFunctionDeclaration:  check,
			ast.KindClassDeclaration:     check,
			ast.KindInterfaceDeclaration: check,
			ast.KindTypeAliasDeclaration: check,
			ast.KindEnumDeclaration:      check,
			ast.KindModuleDeclaration:    check,
		}
	},
}
