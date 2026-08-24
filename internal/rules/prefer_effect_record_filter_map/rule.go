package prefer_effect_record_filter_map

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var Rule = rule.Rule{Name: "prefer-effect-record-filter-map", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindSpreadAssignment: func(node *ast.Node) {
		expression := unwrap(node.AsSpreadAssignment().Expression)
		if !ast.IsConditionalExpression(expression) {
			return
		}
		c := expression.AsConditionalExpression()
		if (emptyObject(c.WhenTrue) && nonEmptyObject(c.WhenFalse)) || (nonEmptyObject(c.WhenTrue) && emptyObject(c.WhenFalse)) {
			ctx.ReportNode(node, rule.RuleMessage{Id: "prefer-effect-record-filter-map", Description: "Avoid conditional object spreads.", Help: "Build a record of candidate properties and use Record.filterMap from Effect with Result.succeed/Result.fail (or Result.fromNullishOr) to keep only present entries."})
		}
	}}
}}

func unwrap(n *ast.Node) *ast.Node {
	for n != nil && ast.IsParenthesizedExpression(n) {
		n = n.Expression()
	}
	return n
}
func propertyCount(n *ast.Node) int {
	n = unwrap(n)
	if ast.IsObjectLiteralExpression(n) {
		return len(n.AsObjectLiteralExpression().Properties.Nodes)
	}
	return 0
}
func emptyObject(n *ast.Node) bool    { return propertyCount(n) == 0 }
func nonEmptyObject(n *ast.Node) bool { return propertyCount(n) > 0 }

var PreferEffectRecordFilterMapRule = Rule
