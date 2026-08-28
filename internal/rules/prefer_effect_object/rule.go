package prefer_effect_object

import (
	"fmt"
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var replacements = map[string]string{
	"assign":      "Struct.assign",
	"entries":     "Record.toEntries",
	"fromEntries": "Record.fromEntries",
	"groupBy":     "Array.groupBy",
	"hasOwn":      "Record.has",
	"is":          "Equivalence.strictEqual",
	"keys":        "Struct.keys or Record.keys",
	"values":      "Record.values",
}

var Rule = rule.Rule{Name: "prefer-effect-object", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		callee := unwrap(node.AsCallExpression().Expression)
		if !ast.IsPropertyAccessExpression(callee) {
			return
		}

		method := propertyName(callee)
		replacement, supported := replacements[method]
		if supported && isBuiltInObjectSymbol(ctx, unwrap(callee.AsPropertyAccessExpression().Expression)) {
			ctx.ReportNode(node, objectMethodMessage(method, replacement))
			return
		}

		if isBuiltInHasOwnProperty(ctx, callee) || isBuiltInHasOwnPropertyCall(ctx, callee) {
			ctx.ReportNode(node, rule.RuleMessage{Id: "prefer-effect-object", Description: "Avoid Object.prototype.hasOwnProperty().", Help: "Use Record.has from Effect instead."})
		}
	}}
}}

func objectMethodMessage(method string, replacement string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "prefer-effect-object",
		Description: fmt.Sprintf("Avoid Object.%s().", method),
		Help:        fmt.Sprintf("Use %s from Effect instead.", replacement),
	}
}

func isBuiltInObjectSymbol(ctx rule.RuleContext, node *ast.Node) bool {
	return node != nil && isBuiltInSymbol(ctx.TypeChecker.GetSymbolAtLocation(node), "Object")
}

func isBuiltInHasOwnProperty(ctx rule.RuleContext, callee *ast.Node) bool {
	return propertyName(callee) == "hasOwnProperty" && isBuiltInSymbol(ctx.TypeChecker.GetSymbolAtLocation(callee.Name()), "hasOwnProperty")
}

func isBuiltInHasOwnPropertyCall(ctx rule.RuleContext, callee *ast.Node) bool {
	if propertyName(callee) != "call" {
		return false
	}
	method := unwrap(callee.AsPropertyAccessExpression().Expression)
	return ast.IsPropertyAccessExpression(method) && isBuiltInHasOwnProperty(ctx, method)
}

func isBuiltInSymbol(symbol *ast.Symbol, name string) bool {
	if symbol == nil || symbol.Name != name {
		return false
	}
	for _, declaration := range symbol.Declarations {
		sourceFile := ast.GetSourceFileOfNode(declaration)
		if sourceFile == nil {
			continue
		}
		base := filepath.Base(strings.ReplaceAll(sourceFile.FileName(), "\\", "/"))
		if strings.HasPrefix(base, "lib.") && strings.HasSuffix(base, ".d.ts") {
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

var PreferEffectObjectRule = Rule
