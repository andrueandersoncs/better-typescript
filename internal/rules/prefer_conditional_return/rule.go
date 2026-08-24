package prefer_conditional_return

import (
	"fmt"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"strings"
)

var Rule = rule.Rule{
	Name: "prefer-conditional-return",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindBlock: func(node *ast.Node) {
			statements := node.AsBlock().Statements.Nodes
			for index, statement := range statements {
				if !ast.IsIfStatement(statement) {
					continue
				}
				current := statement.AsIfStatement()
				whenTrue := returnExpression(ctx, current.ThenStatement)
				if whenTrue == nil {
					continue
				}
				fallback := current.ElseStatement
				if fallback == nil && index+1 < len(statements) {
					fallback = statements[index+1]
				}
				whenFalse := returnExpression(ctx, fallback)
				if whenFalse == nil {
					continue
				}
				condition := current.Expression
				trueExpression, falseExpression := whenTrue, whenFalse
				unwrapped := unwrap(condition)
				if ast.IsPrefixUnaryExpression(unwrapped) && unwrapped.AsPrefixUnaryExpression().Operator == ast.KindExclamationToken {
					condition = unwrapped.AsPrefixUnaryExpression().Operand
					trueExpression, falseExpression = whenFalse, whenTrue
				}
				returnText := fmt.Sprintf("(%s) ? %s : %s", text(ctx, condition), text(ctx, trueExpression), text(ctx, falseExpression))
				ctx.ReportNode(statement, rule.RuleMessage{Id: "prefer-conditional-return", Description: "Avoid if statements that only choose between two return values.", Help: "Return a conditional expression instead: return " + returnText + "."})
			}
		}}
	},
}

func returnExpression(ctx rule.RuleContext, statement *ast.Node) *ast.Node {
	if statement == nil {
		return nil
	}
	if ast.IsBlock(statement) {
		nodes := statement.AsBlock().Statements.Nodes
		if len(nodes) != 1 {
			return nil
		}
		statement = nodes[0]
	}
	if !ast.IsReturnStatement(statement) {
		return nil
	}
	expression := statement.AsReturnStatement().Expression
	if expression == nil || !eligible(ctx, expression) {
		return nil
	}
	return expression
}
func eligible(ctx rule.RuleContext, node *ast.Node) bool {
	value := text(ctx, node)
	return !strings.Contains(value, "\n") && len(value) <= 100 && !containsYield(node) && !ast.IsConditionalExpression(unwrap(node))
}
func containsYield(node *ast.Node) bool {
	if node.Kind == ast.KindYieldExpression {
		return true
	}
	found := false
	node.ForEachChild(func(child *ast.Node) bool {
		if containsYield(child) {
			found = true
			return true
		}
		return false
	})
	return found
}
func unwrap(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression:
			node = node.AsParenthesizedExpression().Expression
		case ast.KindAsExpression:
			node = node.AsAsExpression().Expression
		case ast.KindSatisfiesExpression:
			node = node.AsSatisfiesExpression().Expression
		case ast.KindTypeAssertionExpression:
			node = node.AsTypeAssertion().Expression
		case ast.KindNonNullExpression:
			node = node.AsNonNullExpression().Expression
		default:
			return node
		}
	}
	return nil
}
func text(ctx rule.RuleContext, node *ast.Node) string {
	return strings.TrimSpace(ctx.SourceFile.Text()[node.Pos():node.End()])
}
