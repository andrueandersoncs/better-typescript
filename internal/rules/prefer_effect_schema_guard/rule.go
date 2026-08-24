package prefer_effect_schema_guard

import (
	"fmt"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

var Rule = rule.Rule{Name: "prefer-effect-schema-guard", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindIfStatement: func(node *ast.Node) {
		condition := node.AsIfStatement().Expression
		walkExpressions(condition, func(expression *ast.Node) {
			expression = unwrap(expression)
			if !ast.IsBinaryExpression(expression) || expression.AsBinaryExpression().OperatorToken.Kind != ast.KindInKeyword {
				return
			}
			left := unwrap(expression.AsBinaryExpression().Left)
			if !ast.IsStringLiteral(left) && !ast.IsNoSubstitutionTemplateLiteral(left) {
				return
			}
			property := scanner.GetSourceTextOfNodeFromSourceFile(ctx.SourceFile, left, false)
			object := scanner.GetSourceTextOfNodeFromSourceFile(ctx.SourceFile, expression.AsBinaryExpression().Right, false)
			ctx.ReportNode(expression, rule.RuleMessage{Id: "prefer-effect-schema-guard", Description: fmt.Sprintf("Avoid using %s in %s as a type guard.", property, object), Help: fmt.Sprintf("Define an Effect Schema for this value and replace the check with Schema.is($schema)(%s).", object)})
		})
	}}
}}

func walkExpressions(n *ast.Node, visit func(*ast.Node)) {
	visit(n)
	for child := range n.IterChildren() {
		if ast.IsExpression(child) {
			walkExpressions(child, visit)
		}
	}
}
func unwrap(n *ast.Node) *ast.Node {
	for n != nil {
		switch n.Kind {
		case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindTypeAssertionExpression, ast.KindNonNullExpression, ast.KindSatisfiesExpression:
			n = n.Expression()
		default:
			return n
		}
	}
	return n
}

var PreferEffectSchemaGuardRule = Rule
