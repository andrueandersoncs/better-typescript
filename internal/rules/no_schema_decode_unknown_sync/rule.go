package no_schema_decode_unknown_sync

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "no-schema-decode-unknown-sync",
	Description: "Avoid Schema.decodeUnknownSync.",
	Help:        "Use Schema.decodeUnknownEffect and handle decoding failures in the Effect error channel.",
}

var Rule = rule.Rule{
	Name: "no-schema-decode-unknown-sync",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
			callee := unwrap(node.AsCallExpression().Expression)
			target := callee
			if ast.IsPropertyAccessExpression(callee) {
				target = callee.AsPropertyAccessExpression().Name()
			} else if ast.IsElementAccessExpression(callee) {
				target = callee.AsElementAccessExpression().ArgumentExpression
				if target == nil || !ast.IsStringLiteralLike(target) || target.Text() != "decodeUnknownSync" {
					return
				}
			}
			if (!ast.IsIdentifier(target) && !ast.IsStringLiteralLike(target)) || !isEffectDecodeUnknownSync(ctx, target) {
				return
			}
			ctx.ReportNode(callee, message)
		}}
	},
}

func isEffectDecodeUnknownSync(ctx rule.RuleContext, node *ast.Node) bool {
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, node)
	return symbol != nil && symbol.Name == "decodeUnknownSync" && utils.IsEffectSchemaSymbol(symbol)
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
