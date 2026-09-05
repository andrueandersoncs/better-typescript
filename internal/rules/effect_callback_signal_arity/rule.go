package effect_callback_signal_arity

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "effect-callback-signal-arity",
	Description: "Do not default an Effect cancellation-signal parameter.",
	Help:        "Leave the injected signal parameter required so Effect passes its AbortSignal, or use a signal-free callback when the fallback is intentional.",
}

var Rule = rule.Rule{
	Name: "effect-callback-signal-arity",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
			call := node.AsCallExpression()
			name := effectMemberName(ctx, call.Expression)
			threshold := 0
			callback := (*ast.Node)(nil)
			switch name {
			case "promise":
				threshold, callback = 1, argument(call, 0)
			case "tryPromise":
				threshold, callback = 1, tryPromiseCallback(call)
			case "callback":
				threshold, callback = 2, argument(call, 0)
			default:
				return
			}
			if callback == nil {
				return
			}
			callback = unwrap(callback)
			if !ast.IsArrowFunction(callback) && !ast.IsFunctionExpression(callback) {
				return
			}
			parameters := runtimeParameters(callback)
			if len(parameters) < threshold {
				return
			}
			for index := 0; index < threshold; index++ {
				if parameters[index].AsParameterDeclaration().Initializer != nil {
					ctx.ReportNode(parameters[index], message)
					return
				}
			}
		}}
	},
}

func tryPromiseCallback(call *ast.CallExpression) *ast.Node {
	first := argument(call, 0)
	if first == nil {
		return nil
	}
	first = unwrap(first)
	if ast.IsArrowFunction(first) || ast.IsFunctionExpression(first) {
		return first
	}
	if !ast.IsObjectLiteralExpression(first) {
		return nil
	}
	for _, property := range first.AsObjectLiteralExpression().Properties.Nodes {
		if !ast.IsPropertyAssignment(property) || propertyName(property) != "try" {
			continue
		}
		return property.AsPropertyAssignment().Initializer
	}
	return nil
}

func argument(call *ast.CallExpression, index int) *ast.Node {
	if call.Arguments == nil || len(call.Arguments.Nodes) <= index {
		return nil
	}
	return call.Arguments.Nodes[index]
}

func runtimeParameters(function *ast.Node) []*ast.Node {
	result := make([]*ast.Node, 0, len(function.Parameters()))
	for _, parameter := range function.Parameters() {
		name := parameter.Name()
		if name != nil && ast.IsIdentifier(name) && name.Text() == "this" {
			continue
		}
		result = append(result, parameter)
	}
	return result
}

func effectMemberName(ctx rule.RuleContext, callee *ast.Node) string {
	callee = unwrap(callee)
	if ast.IsPropertyAccessExpression(callee) {
		callee = callee.AsPropertyAccessExpression().Name()
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, callee)
	if symbol == nil || !effectDeclaration(symbol) {
		return ""
	}
	switch symbol.Name {
	case "promise", "tryPromise", "callback":
		return symbol.Name
	default:
		return ""
	}
}

func effectDeclaration(symbol *ast.Symbol) bool {
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := strings.ReplaceAll(file.FileName(), "\\", "/")
		if strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/") {
			return true
		}
	}
	return false
}

func propertyName(node *ast.Node) string {
	name := node.Name()
	if name != nil && ast.IsIdentifier(name) {
		return name.Text()
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
	return nil
}
