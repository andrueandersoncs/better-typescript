package no_reflect_get

import (
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "no-reflect-get",
	Description: "Replace `Reflect.get` with typed property access.",
	Help:        "Parse dynamic input into a named domain type before reading it.",
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

func reflectGet(ctx rule.RuleContext, node *ast.Node) bool {
	if ast.IsPropertyAccessExpression(node) {
		access := node.AsPropertyAccessExpression()
		return access.Name().Text() == "get" && globalReflect(ctx, access.Expression)
	}
	if ast.IsElementAccessExpression(node) {
		access := node.AsElementAccessExpression()
		return ast.IsStringLiteralLike(access.ArgumentExpression) && access.ArgumentExpression.Text() == "get" && globalReflect(ctx, access.Expression)
	}
	return false
}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		if reflectGet(ctx, node.AsCallExpression().Expression) {
			ctx.ReportNode(node, message)
		}
	}}
}

var Rule = rule.Rule{Name: "no-reflect-get", Run: run}
