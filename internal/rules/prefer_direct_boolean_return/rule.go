package prefer_direct_boolean_return

import (
	"fmt"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

var Rule = rule.Rule{Name: "prefer-direct-boolean-return", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	literal := func(node *ast.Node, condition *ast.Node, value bool) {
		text := scanner.GetSourceTextOfNodeFromSourceFile(ctx.SourceFile, condition, false)
		expression := "(" + text + ")"
		if !value {
			expression = "!(" + text + ")"
		}
		ctx.ReportNode(node, rule.RuleMessage{Id: "literal-branch", Description: fmt.Sprintf("Avoid returning %t from a conditional branch.", value), Help: "Use the condition as the boolean value instead: return " + expression + "."})
	}
	andFalse := func(node *ast.Node) {
		ctx.ReportNode(node, rule.RuleMessage{Id: "and-false", Description: "Avoid conditional return followed by return false.", Help: "Use && instead of branching to false (`cond && value`). When the false branch is the then-arm (`cond ? false : value`), negate the condition into a named boolean first so `!` and `&&` are not stacked in one expression."})
	}
	return rule.RuleListeners{
		ast.KindConditionalExpression: func(node *ast.Node) {
			conditional := node.AsConditionalExpression()
			a, aok := booleanLiteral(conditional.WhenTrue)
			b, bok := booleanLiteral(conditional.WhenFalse)
			if aok && bok && a != b {
				literal(node, conditional.Condition, a)
				return
			}
			if (isFalse(conditional.WhenTrue) && !bok) || (isFalse(conditional.WhenFalse) && !aok) {
				andFalse(node)
			}
		},
		ast.KindIfStatement: func(node *ast.Node) {
			statement := unwrapSingleStatement(node.AsIfStatement().ThenStatement)
			if ast.IsReturnStatement(statement) {
				if value, ok := returnBoolean(statement); ok {
					literal(node, node.AsIfStatement().Expression, value)
				}
			}
		},
		ast.KindBlock: func(node *ast.Node) {
			statements := node.AsBlock().Statements.Nodes
			for i, statement := range statements {
				if i+1 >= len(statements) || !ast.IsIfStatement(statement) || !isFalseReturn(statements[i+1]) {
					continue
				}
				candidate := statement.AsIfStatement()
				if candidate.ElseStatement != nil {
					continue
				}
				then := candidate.ThenStatement
				var expression *ast.Node
				if ast.IsBlock(then) {
					inner := then.AsBlock().Statements.Nodes
					if len(inner) > 0 && ast.IsReturnStatement(inner[len(inner)-1]) {
						expression = inner[len(inner)-1].AsReturnStatement().Expression
					}
				} else if ast.IsReturnStatement(then) {
					expression = then.AsReturnStatement().Expression
				}
				if expression != nil {
					if _, ok := booleanLiteral(expression); !ok {
						andFalse(statement)
					}
				}
			}
		},
	}
}}

func unwrap(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindTypeAssertionExpression, ast.KindNonNullExpression, ast.KindSatisfiesExpression:
			node = node.Expression()
		default:
			return node
		}
	}
	return node
}
func unwrapSingleStatement(node *ast.Node) *ast.Node {
	node = unwrap(node)
	if ast.IsBlock(node) && len(node.AsBlock().Statements.Nodes) == 1 {
		return node.AsBlock().Statements.Nodes[0]
	}
	return node
}
func booleanLiteral(node *ast.Node) (bool, bool) {
	node = unwrap(node)
	if node == nil {
		return false, false
	}
	if node.Kind == ast.KindTrueKeyword {
		return true, true
	}
	if node.Kind == ast.KindFalseKeyword {
		return false, true
	}
	return false, false
}
func isFalse(node *ast.Node) bool { v, ok := booleanLiteral(node); return ok && !v }
func returnBoolean(node *ast.Node) (bool, bool) {
	if !ast.IsReturnStatement(node) || node.AsReturnStatement().Expression == nil {
		return false, false
	}
	return booleanLiteral(node.AsReturnStatement().Expression)
}
func isFalseReturn(node *ast.Node) bool { v, ok := returnBoolean(node); return ok && !v }

var PreferDirectBooleanReturnRule = Rule
