package prefer_effect_array_append_all

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var Rule = rule.Rule{
	Name: "prefer-effect-array-append-all",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindSpreadElement: func(node *ast.Node) {
				if node.Parent == nil || !ast.IsArrayLiteralExpression(node.Parent) {
					return
				}
				expression := unwrap(node.AsSpreadElement().Expression)
				if !ast.IsConditionalExpression(expression) {
					return
				}
				conditional := expression.AsConditionalExpression()
				if (isEmptyArray(conditional.WhenTrue) && isNonEmptyArrayBranch(conditional.WhenFalse)) || (isNonEmptyArrayBranch(conditional.WhenTrue) && isEmptyArray(conditional.WhenFalse)) {
					ctx.ReportNode(node, rule.RuleMessage{Id: "prefer-effect-array-append-all", Description: "Avoid conditional array spreads.", Help: "Use Array.appendAll from Effect to combine arrays instead of spreading a conditional expression that chooses between an array and an empty array literal."})
				}
			},
		}
	},
}

func unwrap(node *ast.Node) *ast.Node {
	for node != nil && ast.IsParenthesizedExpression(node) {
		node = node.AsParenthesizedExpression().Expression
	}
	return node
}

func isEmptyArray(node *ast.Node) bool {
	node = unwrap(node)
	return ast.IsArrayLiteralExpression(node) && len(node.AsArrayLiteralExpression().Elements.Nodes) == 0
}
func isNonEmptyArrayBranch(node *ast.Node) bool {
	node = unwrap(node)
	return !ast.IsArrayLiteralExpression(node) || len(node.AsArrayLiteralExpression().Elements.Nodes) != 0
}

var PreferEffectArrayAppendAllRule = Rule
