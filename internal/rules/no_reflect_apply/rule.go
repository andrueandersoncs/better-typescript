package no_reflect_apply

import (
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "no-reflect-apply",
	Description: "Replace `Reflect.apply` with a typed function call.",
	Help:        "Model dynamic dispatch behind a named interface.",
}

func globalReflect(ctx rule.RuleContext, node *ast.Node) bool {
	if !ast.IsIdentifier(node) || node.Text() != "Reflect" {
		return false
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
	if symbol == nil || len(symbol.Declarations) == 0 {
		return true
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file != nil && strings.HasPrefix(filepath.Base(file.FileName()), "lib.") {
			return true
		}
	}
	return false
}

func reflectMethod(ctx rule.RuleContext, node *ast.Node, method string) bool {
	if ast.IsPropertyAccessExpression(node) {
		access := node.AsPropertyAccessExpression()
		return access.Name().Text() == method && globalReflect(ctx, access.Expression)
	}
	if ast.IsElementAccessExpression(node) {
		access := node.AsElementAccessExpression()
		return ast.IsStringLiteralLike(access.ArgumentExpression) && access.ArgumentExpression.Text() == method && globalReflect(ctx, access.Expression)
	}
	return false
}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		if reflectMethod(ctx, node.AsCallExpression().Expression, "apply") {
			ctx.ReportNode(node, message)
		}
	}}
}

var Rule = rule.Rule{Name: "no-reflect-apply", Run: run}
