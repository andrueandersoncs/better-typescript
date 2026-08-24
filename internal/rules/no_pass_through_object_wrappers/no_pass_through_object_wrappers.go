package no_pass_through_object_wrappers

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{Id: "no-pass-through-object-wrappers", Description: "Avoid a function that only repackages its parameters for another constructor.", Help: "Inline the constructor or factory call at each caller. Keep a function only when it adds policy, validation, defaults, or behavior."}
var Rule = rule.Rule{Name: "no-pass-through-object-wrappers", Run: run}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	check := func(node *ast.Node) {
		invocation := invocationBody(node)
		if invocation != nil && hasNonemptyObjectArgument(invocation) && exactForwarder(node, invocation) {
			ctx.ReportNode(node, message)
		}
	}
	return rule.RuleListeners{ast.KindArrowFunction: check, ast.KindFunctionExpression: check, ast.KindFunctionDeclaration: check}
}
func invocationBody(node *ast.Node) *ast.Node {
	body := node.Body()
	if body == nil {
		return nil
	}
	if body.Kind == ast.KindBlock {
		statements := body.AsBlock().Statements.Nodes
		if len(statements) == 0 || statements[0].Kind != ast.KindReturnStatement || statements[0].AsReturnStatement().Expression == nil {
			return nil
		}
		body = statements[0].AsReturnStatement().Expression
	}
	body = unwrap(body)
	if body.Kind == ast.KindCallExpression || body.Kind == ast.KindNewExpression {
		return body
	}
	return nil
}
func hasNonemptyObjectArgument(invocation *ast.Node) bool {
	for _, argument := range invocationArguments(invocation) {
		literal := unwrap(argument)
		if literal.Kind == ast.KindObjectLiteralExpression && len(literal.AsObjectLiteralExpression().Properties.Nodes) > 0 {
			return true
		}
	}
	return false
}
func exactForwarder(function *ast.Node, invocation *ast.Node) bool {
	parameters := function.Parameters()
	parameterNames := make([]string, len(parameters))
	for index, parameterNode := range parameters {
		parameter := parameterNode.AsParameterDeclaration()
		name := parameter.Name()
		if name == nil || name.Kind != ast.KindIdentifier || parameter.Initializer != nil || parameter.DotDotDotToken != nil {
			return false
		}
		parameterNames[index] = name.Text()
	}
	consumed := []string{}
	for _, argument := range invocationArguments(invocation) {
		argument = unwrap(argument)
		if argument.Kind == ast.KindIdentifier {
			consumed = append(consumed, argument.Text())
			continue
		}
		if argument.Kind != ast.KindObjectLiteralExpression {
			return false
		}
		for _, property := range argument.AsObjectLiteralExpression().Properties.Nodes {
			switch property.Kind {
			case ast.KindShorthandPropertyAssignment:
				consumed = append(consumed, property.Name().Text())
			case ast.KindPropertyAssignment:
				value := unwrap(property.AsPropertyAssignment().Initializer)
				if value.Kind != ast.KindIdentifier {
					return false
				}
				consumed = append(consumed, value.Text())
			default:
				return false
			}
		}
	}
	if len(consumed) != len(parameterNames) {
		return false
	}
	for index := range consumed {
		if consumed[index] != parameterNames[index] {
			return false
		}
	}
	return true
}
func invocationArguments(node *ast.Node) []*ast.Node {
	if node.Kind == ast.KindCallExpression {
		return node.AsCallExpression().Arguments.Nodes
	}
	if node.AsNewExpression().Arguments != nil {
		return node.AsNewExpression().Arguments.Nodes
	}
	return nil
}
func unwrap(node *ast.Node) *ast.Node {
	for node != nil && (node.Kind == ast.KindParenthesizedExpression) {
		node = node.Expression()
	}
	return node
}
