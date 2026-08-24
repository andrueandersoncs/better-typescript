package prefer_effect_property_accessors

import (
	"fmt"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

var Rule = rule.Rule{Name: "prefer-effect-property-accessors", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	listener := func(node *ast.Node) {
		if len(node.Parameters()) != 1 {
			return
		}
		parameter := node.Parameters()[0].AsNode().Name()
		if parameter == nil || !ast.IsIdentifier(parameter) {
			return
		}
		expression := returnedExpression(node)
		expression = unwrap(expression)
		if expression == nil || !ast.IsPropertyAccessExpression(expression) || expression.AsPropertyAccessExpression().QuestionDotToken != nil {
			return
		}
		receiver := unwrap(expression.AsPropertyAccessExpression().Expression)
		if !ast.IsIdentifier(receiver) || receiver.AsIdentifier().Text != parameter.AsIdentifier().Text {
			return
		}
		name := functionName(ctx, node)
		accessed := scanner.GetSourceTextOfNodeFromSourceFile(ctx.SourceFile, expression, false)
		typ := ctx.TypeChecker.GetTypeAtLocation(receiver)
		module := "Struct"
		if ctx.TypeChecker.GetStringIndexType(typ) != nil || ctx.TypeChecker.GetNumberIndexType(typ) != nil {
			module = "Record"
		}
		key := fmt.Sprintf("%q", propertyName(expression))
		ctx.ReportNode(expression, rule.RuleMessage{Id: "prefer-effect-property-accessors", Description: fmt.Sprintf("Avoid defining %s only to read %s.", name, accessed), Help: fmt.Sprintf("Replace this property-access-only function with %s.get(%s) from Effect. Use Struct.get for non-record data types, and Record.get or Record.has for records.", module, key)})
	}
	return rule.RuleListeners{ast.KindArrowFunction: listener, ast.KindFunctionDeclaration: listener, ast.KindFunctionExpression: listener, ast.KindMethodDeclaration: listener}
}}

func returnedExpression(n *ast.Node) *ast.Node {
	body := n.BodyData().Body
	if body == nil {
		return nil
	}
	if ast.IsArrowFunction(n) && !ast.IsBlock(body) {
		return body
	}
	if !ast.IsBlock(body) || len(body.AsBlock().Statements.Nodes) != 1 {
		return nil
	}
	s := body.AsBlock().Statements.Nodes[0]
	if !ast.IsReturnStatement(s) {
		return nil
	}
	return s.AsReturnStatement().Expression
}
func functionName(ctx rule.RuleContext, n *ast.Node) string {
	name := ast.GetNameOfDeclaration(n)
	if name == nil && n.Parent != nil && (ast.IsVariableDeclaration(n.Parent) || ast.IsPropertyAssignment(n.Parent) || ast.IsPropertyDeclaration(n.Parent)) {
		name = n.Parent.Name()
	}
	if name == nil {
		return "this function"
	}
	return scanner.GetSourceTextOfNodeFromSourceFile(ctx.SourceFile, name, false)
}
func propertyName(n *ast.Node) string {
	name := n.Name()
	if name != nil && ast.IsIdentifier(name) {
		return name.AsIdentifier().Text
	}
	return ""
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

var PreferEffectPropertyAccessorsRule = Rule
