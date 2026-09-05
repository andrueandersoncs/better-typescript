package valid_effect_dual_arity

import (
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "valid-effect-dual-arity",
	Description: "Effect Function.dual does not support numeric arity 0 or 1.",
	Help:        "Use a plain unary function, or use Function.dual with a supported arity or predicate dispatch.",
}

var Rule = rule.Rule{
	Name: "valid-effect-dual-arity",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindCallExpression: func(node *ast.Node) {
				call := node.AsCallExpression()
				if call.Arguments == nil || len(call.Arguments.Nodes) < 1 || !isEffectFunctionDual(ctx, call.Expression) {
					return
				}
				arity := unwrap(call.Arguments.Nodes[0])
				if !ast.IsNumericLiteral(arity) || (arity.Text() != "0" && arity.Text() != "1") {
					return
				}
				ctx.ReportNode(arity, message)
			},
		}
	},
}

func isEffectFunctionDual(ctx rule.RuleContext, callee *ast.Node) bool {
	callee = unwrap(callee)
	if ast.IsPropertyAccessExpression(callee) {
		callee = callee.AsPropertyAccessExpression().Name()
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, callee)
	if symbol == nil || symbol.Name != "dual" {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := strings.ReplaceAll(file.FileName(), "\\", "/")
		if (strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/")) && (filepath.Base(path) == "Function.ts" || filepath.Base(path) == "Function.d.ts") {
			return true
		}
	}
	return false
}

func unwrap(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindAsExpression, ast.KindNonNullExpression, ast.KindParenthesizedExpression, ast.KindSatisfiesExpression, ast.KindTypeAssertionExpression:
			node = node.Expression()
		default:
			return node
		}
	}
	return nil
}
