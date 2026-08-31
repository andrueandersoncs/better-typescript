package no_schema_decode_unknown_sync

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "no-schema-decode-unknown-sync",
	Description: "Avoid Schema.decodeUnknownSync.",
	Help:        "Use Schema.decodeUnknown and handle decoding failures in the Effect error channel.",
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
	symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
	if symbol != nil && symbol.Flags&ast.SymbolFlagsAlias != 0 {
		symbol = ctx.TypeChecker.GetAliasedSymbol(symbol)
	}
	if symbol == nil || symbol.Name != "decodeUnknownSync" {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file != nil && isEffectDeclarationFile(file.FileName()) {
			return true
		}
	}
	return false
}

func isEffectDeclarationFile(fileName string) bool {
	path := strings.ReplaceAll(fileName, "\\", "/")
	return strings.Contains(path, "/node_modules/effect/")
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
