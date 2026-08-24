package no_inline_closures

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"strings"
)

const description = "Avoid arrow functions outside naming, currying, and third-party callback positions. Name this function as a top-level const and pass it by reference, currying it when it needs values from the enclosing scope. Inline arrows are permitted only as arguments to third-party functions. When the expression sequences several steps, prefer a generator over nesting functions."

var message = rule.RuleMessage{Id: "no-inline-closures", Description: description}
var Rule = rule.Rule{Name: "no-inline-closures", Run: run}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindArrowFunction: func(node *ast.Node) {
		parent := effectiveParent(node)
		if parent != nil && (parent.Kind == ast.KindVariableDeclaration || parent.Kind == ast.KindArrowFunction) {
			return
		}
		if isExternalPackageArgument(ctx, node) {
			return
		}
		ctx.ReportNode(node.AsArrowFunction().EqualsGreaterThanToken, message)
	}}
}
func effectiveParent(node *ast.Node) *ast.Node {
	parent := node.Parent
	if parent != nil && (parent.Kind == ast.KindParenthesizedExpression || parent.Kind == ast.KindAsExpression || parent.Kind == ast.KindSatisfiesExpression || parent.Kind == ast.KindNonNullExpression) {
		return effectiveParent(parent)
	}
	return parent
}
func isExternalPackageArgument(ctx rule.RuleContext, node *ast.Node) bool {
	call := argumentCall(node)
	if call == nil {
		return false
	}
	callee := callExpression(call)
	location := callee
	if callee.Kind == ast.KindPropertyAccessExpression {
		location = callee.AsPropertyAccessExpression().Name()
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(location)
	if symbol == nil {
		return false
	}
	if symbol.Flags&ast.SymbolFlagsAlias != 0 {
		symbol = ctx.TypeChecker.GetAliasedSymbol(symbol)
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		name := strings.ReplaceAll(file.FileName(), "\\", "/")
		base := name[strings.LastIndex(name, "/")+1:]
		if strings.Contains(name, "/node_modules/") && !(strings.HasPrefix(base, "lib.") && strings.HasSuffix(base, ".d.ts")) {
			return true
		}
	}
	return false
}
func argumentCall(node *ast.Node) *ast.Node {
	parent := node.Parent
	if parent == nil {
		return nil
	}
	if parent.Kind == ast.KindCallExpression || parent.Kind == ast.KindNewExpression {
		for _, argument := range callArguments(parent) {
			if argument == node {
				return parent
			}
		}
		return nil
	}
	switch parent.Kind {
	case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindSatisfiesExpression, ast.KindObjectLiteralExpression, ast.KindPropertyAssignment, ast.KindArrayLiteralExpression:
		return argumentCall(parent)
	}
	return nil
}
func callArguments(node *ast.Node) []*ast.Node {
	if node.Kind == ast.KindCallExpression && node.AsCallExpression().Arguments != nil {
		return node.AsCallExpression().Arguments.Nodes
	}
	if node.Kind == ast.KindNewExpression && node.AsNewExpression().Arguments != nil {
		return node.AsNewExpression().Arguments.Nodes
	}
	return nil
}
func callExpression(node *ast.Node) *ast.Node {
	if node.Kind == ast.KindNewExpression {
		return node.AsNewExpression().Expression
	}
	return node.AsCallExpression().Expression
}
