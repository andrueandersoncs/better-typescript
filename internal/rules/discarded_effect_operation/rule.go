package discarded_effect_operation

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
)

var message = rule.RuleMessage{
	Id:          "discarded-effect-operation",
	Description: "Do not discard an Effect operation inside an Effect generator.",
	Help:        "Yield, return, or compose the Effect so the generator executes it.",
}

var Rule = rule.Rule{
	Name: "discarded-effect-operation",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindExpressionStatement: func(node *ast.Node) {
			expression := unwrap(node.AsExpressionStatement().Expression)
			if !ast.IsCallExpression(expression) || !insideEffectGenerator(ctx, node) || !isEffectValue(ctx, expression) {
				return
			}
			ctx.ReportNode(expression, message)
		}}
	},
}

func insideEffectGenerator(ctx rule.RuleContext, node *ast.Node) bool {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsFunctionExpression(current) {
			return current.BodyData().AsteriskToken != nil && effectGeneratorArgument(ctx, current)
		}
		if ast.IsArrowFunction(current) || ast.IsFunctionDeclaration(current) || ast.IsMethodDeclaration(current) {
			return false
		}
	}
	return false
}

func effectGeneratorArgument(ctx rule.RuleContext, fn *ast.Node) bool {
	call := fn.Parent
	if call == nil || !ast.IsCallExpression(call) {
		return false
	}
	for _, argument := range call.AsCallExpression().Arguments.Nodes {
		if argument != fn {
			continue
		}
		if isEffectMember(ctx, call.AsCallExpression().Expression, "gen") || isEffectMember(ctx, call.AsCallExpression().Expression, "fn") {
			return true
		}
		callee := unwrap(call.AsCallExpression().Expression)
		return ast.IsCallExpression(callee) && isEffectMember(ctx, callee.AsCallExpression().Expression, "fn")
	}
	return false
}

func isEffectValue(ctx rule.RuleContext, node *ast.Node) bool {
	value := ctx.TypeChecker.GetTypeAtLocation(node)
	if value == nil || checker.Type_flags(value)&(checker.TypeFlagsAny|checker.TypeFlagsUnknown) != 0 {
		return false
	}
	if isEffectSymbol(checker.Type_symbol(value), "Effect") {
		return true
	}
	if alias := checker.Type_alias(value); alias != nil && alias.Symbol() != nil {
		return isEffectSymbol(alias.Symbol(), "Effect")
	}
	return false
}

func isEffectMember(ctx rule.RuleContext, callee *ast.Node, name string) bool {
	callee = unwrap(callee)
	if ast.IsPropertyAccessExpression(callee) {
		callee = callee.AsPropertyAccessExpression().Name()
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, callee)
	return symbol != nil && symbol.Name == name && isEffectSymbol(symbol, name)
}

func isEffectSymbol(symbol *ast.Symbol, name string) bool {
	if symbol == nil || symbol.Name != name {
		return false
	}
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
