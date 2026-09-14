package prefer_effect_match

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "prefer-effect-match",
	Description: "Use Match from Effect instead of a chained literal ternary.",
	Help:        "Match the repeated value with Match.value and Match.when, then finish with Match.exhaustive or Match.orElse.",
}

func equality(kind ast.Kind) bool {
	switch kind {
	case ast.KindEqualsEqualsToken, ast.KindEqualsEqualsEqualsToken, ast.KindExclamationEqualsToken, ast.KindExclamationEqualsEqualsToken:
		return true
	default:
		return false
	}
}

func literal(node *ast.Node) bool {
	node = ast.SkipParentheses(node)
	return ast.IsLiteralExpression(node) || node.Kind == ast.KindNoSubstitutionTemplateLiteral || node.Kind == ast.KindTrueKeyword || node.Kind == ast.KindFalseKeyword || node.Kind == ast.KindNullKeyword
}

func text(ctx rule.RuleContext, node *ast.Node) string {
	range_ := utils.TrimNodeTextRange(ctx.SourceFile, node)
	return ctx.SourceFile.Text()[range_.Pos():range_.End()]
}

func comparedValue(ctx rule.RuleContext, node *ast.Node) string {
	node = ast.SkipParentheses(node)
	if !ast.IsBinaryExpression(node) || !equality(node.AsBinaryExpression().OperatorToken.Kind) {
		return ""
	}
	binary := node.AsBinaryExpression()
	if literal(binary.Left) {
		return text(ctx, binary.Right)
	}
	if literal(binary.Right) {
		return text(ctx, binary.Left)
	}
	return ""
}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindConditionalExpression: func(node *ast.Node) {
		if node.Parent != nil && ast.IsConditionalExpression(node.Parent) {
			return
		}
		conditional := node.AsConditionalExpression()
		value := comparedValue(ctx, conditional.Condition)
		if value == "" {
			return
		}
		checks := 1
		alternate := ast.SkipParentheses(conditional.WhenFalse)
		for ast.IsConditionalExpression(alternate) {
			current := alternate.AsConditionalExpression()
			if comparedValue(ctx, current.Condition) != value {
				return
			}
			checks++
			alternate = ast.SkipParentheses(current.WhenFalse)
		}
		if checks > 1 {
			ctx.ReportNode(node, message)
		}
	}}
}

var Rule = rule.Rule{Name: "prefer-effect-match", Run: run}
