package require_blank_lines_around_multiline_declarations

import (
	"regexp"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

var blankLine = regexp.MustCompile(`\n[ \t]*\r?\n`)
var message = rule.RuleMessage{Id: "require-blank-lines-around-multiline-declarations", Description: "Multi-line declarations must have a blank line above and below.", Help: "Insert an empty line before and after this declaration so its multi-line shape is visually separated from neighboring statements. Single-line declarations do not need surrounding blank lines; the first and last statements in a block are exempt on the outer sides."}
var Rule = rule.Rule{Name: "require-blank-lines-around-multiline-declarations", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	check := func(node *ast.Node) {
		text := ctx.SourceFile.Text()
		start := scanner.GetTokenPosOfNode(node, ctx.SourceFile, false)
		if !strings.Contains(text[start:node.End()], "\n") {
			return
		}
		if node.Parent == nil {
			return
		}
		var statements []*ast.Node
		for child := range node.Parent.IterChildren() {
			if ast.IsStatement(child) {
				statements = append(statements, child)
			}
		}
		index := -1
		for i, s := range statements {
			if s == node {
				index = i
				break
			}
		}
		if index < 0 {
			return
		}
		above := index == 0 || blankLine.MatchString(text[statements[index-1].End():start])
		below := index == len(statements)-1 || blankLine.MatchString(text[node.End():scanner.GetTokenPosOfNode(statements[index+1], ctx.SourceFile, false)])
		if !above || !below {
			ctx.ReportNode(node, message)
		}
	}
	return rule.RuleListeners{ast.KindVariableStatement: check, ast.KindFunctionDeclaration: check, ast.KindClassDeclaration: check, ast.KindInterfaceDeclaration: check, ast.KindTypeAliasDeclaration: check, ast.KindEnumDeclaration: check, ast.KindModuleDeclaration: check}
}}
