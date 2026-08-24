package no_function_keyword

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/core"
)

var message = rule.RuleMessage{
	Id:          "noFunctionKeyword",
	Description: "Avoid using the function keyword. Declare this function as a const using fat-arrow syntax instead. Keep function declarations only when overload signatures are required, and keep function* when generator semantics are required.",
}

func hasOverloadSibling(ctx rule.RuleContext, declaration *ast.Node) bool {
	name := declaration.Name()
	if name == nil {
		return false
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(name)
	if symbol == nil {
		return false
	}
	for _, candidate := range symbol.Declarations {
		if candidate != declaration && ast.IsFunctionDeclaration(candidate) && candidate.Body() == nil {
			return true
		}
	}
	return false
}

func functionKeywordRange(ctx rule.RuleContext, node *ast.Node) core.TextRange {
	text := ctx.SourceFile.Text()
	trimmed := utils.TrimNodeTextRange(ctx.SourceFile, node)
	start, end := trimmed.Pos(), trimmed.End()
	if start < 0 {
		start = 0
	}
	if end > len(text) {
		end = len(text)
	}
	relative := strings.Index(text[start:end], "function")
	if relative < 0 {
		return node.Loc
	}
	position := start + relative
	return core.NewTextRange(position, position+len("function"))
}

func checkFunction(ctx rule.RuleContext, node *ast.Node) {
	body := node.BodyData()
	if body != nil && body.AsteriskToken != nil {
		return
	}
	if ast.IsFunctionDeclaration(node) && hasOverloadSibling(ctx, node) {
		return
	}
	ctx.ReportRange(functionKeywordRange(ctx, node), message)
}

func listener(ctx rule.RuleContext) func(*ast.Node) {
	return func(node *ast.Node) { checkFunction(ctx, node) }
}

var NoFunctionKeywordRule = rule.Rule{
	Name: "no-function-keyword",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		check := listener(ctx)
		return rule.RuleListeners{ast.KindFunctionDeclaration: check, ast.KindFunctionExpression: check}
	},
}
