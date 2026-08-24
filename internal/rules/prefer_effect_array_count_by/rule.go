package prefer_effect_array_count_by

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"path/filepath"
	"strings"
)

var Rule = rule.Rule{Name: "prefer-effect-array-count-by", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindPropertyAccessExpression: func(node *ast.Node) {
		if propertyName(node) != "length" {
			return
		}
		receiver := unwrap(node.AsPropertyAccessExpression().Expression)
		if !ast.IsCallExpression(receiver) || !isFilteredCall(ctx, receiver) {
			return
		}
		ctx.ReportNode(node, rule.RuleMessage{Id: "prefer-effect-array-count-by", Description: "Avoid filtering an array only to count matching elements.", Help: "Replace Array.filter(values, predicate).length with Array.countBy(values, predicate) from Effect. Remove a surrounding helper when that is its only behavior."})
	}}
}}

func isFilteredCall(ctx rule.RuleContext, node *ast.Node) bool {
	call := node.AsCallExpression()
	if effectMethod(ctx, call.Expression, "filter") {
		return true
	}
	callee := unwrap(call.Expression)
	if ast.IsIdentifier(callee) && callee.AsIdentifier().Text == "pipe" && effectSymbol(ctx, callee) && len(call.Arguments.Nodes) >= 2 {
		last := unwrap(call.Arguments.Nodes[len(call.Arguments.Nodes)-1])
		return ast.IsCallExpression(last) && len(last.AsCallExpression().Arguments.Nodes) == 1 && effectMethod(ctx, last.AsCallExpression().Expression, "filter")
	}
	return false
}
func effectMethod(ctx rule.RuleContext, callee *ast.Node, method string) bool {
	callee = unwrap(callee)
	return ast.IsPropertyAccessExpression(callee) && propertyName(callee) == method && effectArraySymbol(ctx, callee.Name())
}
func effectArraySymbol(ctx rule.RuleContext, node *ast.Node) bool {
	symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
	if symbol != nil && symbol.Flags&ast.SymbolFlagsAlias != 0 {
		symbol = ctx.TypeChecker.GetAliasedSymbol(symbol)
	}
	if symbol == nil {
		return false
	}
	for _, d := range symbol.Declarations {
		if f := ast.GetSourceFileOfNode(d); f != nil {
			base := filepath.Base(f.FileName())
			if (base == "Array.ts" || base == "Array.d.ts") && strings.Contains(strings.ReplaceAll(f.FileName(), "\\", "/"), "/node_modules/effect/") {
				return true
			}
		}
	}
	return false
}

func effectSymbol(ctx rule.RuleContext, node *ast.Node) bool {
	symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
	if symbol == nil {
		return false
	}
	for _, d := range symbol.Declarations {
		if f := ast.GetSourceFileOfNode(d); f != nil && strings.Contains(strings.ReplaceAll(f.FileName(), "\\", "/"), "/node_modules/effect/") {
			return true
		}
	}
	return false
}
func propertyName(node *ast.Node) string {
	name := node.Name()
	if name != nil && ast.IsIdentifier(name) {
		return name.AsIdentifier().Text
	}
	return ""
}
func unwrap(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindTypeAssertionExpression, ast.KindNonNullExpression, ast.KindSatisfiesExpression:
			node = node.Expression()
		default:
			return node
		}
	}
	return node
}

var PreferEffectArrayCountByRule = Rule
