package prefer_equivalence_strict_equal

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var message = rule.RuleMessage{Id: "prefer-equivalence-strict-equal", Description: "Avoid raw strict equality (===).", Help: "Import Equivalence from effect and replace this comparison with Equivalence.strictEqual<YourType>()(left, right)."}

var PreferEquivalenceStrictEqualRule = rule.Rule{Name: "prefer-equivalence-strict-equal", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindBinaryExpression: func(node *ast.Node) {
		if node.AsBinaryExpression().OperatorToken.Kind == ast.KindEqualsEqualsEqualsToken {
			ctx.ReportNode(node, message)
		}
	}}
}}

var Rule = PreferEquivalenceStrictEqualRule
