package unsafe_casts

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "unsafeCasts",
	Description: "Avoid unchecked `as any` assertions in Effect code.",
	Help:        "Model the missing invariant with Schema decoding, a branded type, or a verified narrowing predicate.",
}

var UnsafeCastsRule = rule.Rule{
	Name: "unsafe-casts",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		check := func(node *ast.Node) {
			typeNode := node.Type()
			if typeNode != nil && typeNode.Kind == ast.KindAnyKeyword {
				ctx.ReportNode(typeNode, message)
			}
		}
		return rule.RuleListeners{ast.KindAsExpression: check, ast.KindTypeAssertionExpression: check}
	},
}

var Rule = UnsafeCastsRule
