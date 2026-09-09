package require_blank_lines_around_multiline_statements

import (
	"regexp"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/scanner"
)

var blankLine = regexp.MustCompile(`\n[ \t]*\r?\n`)

var message = rule.RuleMessage{
	Id:          "require-blank-lines-around-multiline-statements",
	Description: "Multi-line statements must have a blank line above and below.",
	Help:        "Insert an empty line before and after this statement so its multi-line shape is visually separated from neighboring statements. Single-line statements do not need surrounding blank lines; the first and last statements in a statement list are exempt on the outer sides.",
}

func checkSiblingStatements(ctx rule.RuleContext, node *ast.Node) {
	parent := node.Parent
	if parent == nil || !parent.CanHaveStatements() {
		return
	}

	statements := parent.Statements()
	if len(statements) == 0 || statements[0] != node {
		return
	}

	text := ctx.SourceFile.Text()
	for index, statement := range statements {
		start := scanner.GetTokenPosOfNode(statement, ctx.SourceFile, false)
		if !strings.Contains(text[start:statement.End()], "\n") {
			continue
		}

		above := index == 0 || blankLine.MatchString(text[statements[index-1].End():start])
		below := index == len(statements)-1 || blankLine.MatchString(text[statement.End():scanner.GetTokenPosOfNode(statements[index+1], ctx.SourceFile, false)])
		if !above || !below {
			ctx.ReportNode(statement, message)
		}
	}
}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	check := func(node *ast.Node) {
		checkSiblingStatements(ctx, node)
	}
	listeners := rule.RuleListeners{
		ast.KindBlock:                      check,
		ast.KindClassDeclaration:           check,
		ast.KindEmptyStatement:             check,
		ast.KindEnumDeclaration:            check,
		ast.KindExportAssignment:           check,
		ast.KindExportDeclaration:          check,
		ast.KindFunctionDeclaration:        check,
		ast.KindImportDeclaration:          check,
		ast.KindImportEqualsDeclaration:    check,
		ast.KindInterfaceDeclaration:       check,
		ast.KindJSImportDeclaration:        check,
		ast.KindJSTypeAliasDeclaration:     check,
		ast.KindMissingDeclaration:         check,
		ast.KindModuleDeclaration:          check,
		ast.KindNamespaceExportDeclaration: check,
		ast.KindNotEmittedStatement:        check,
		ast.KindTypeAliasDeclaration:       check,
	}
	for kind := ast.KindFirstStatement; kind <= ast.KindLastStatement; kind++ {
		listeners[kind] = check
	}
	return listeners
}

var Rule = rule.Rule{Name: "require-blank-lines-around-multiline-statements", Run: run}
