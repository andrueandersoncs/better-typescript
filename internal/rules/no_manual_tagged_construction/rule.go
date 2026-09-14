package no_manual_tagged_construction

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "no-manual-tagged-construction",
	Description: "Use the existing Schema tagged `.make`, tagged class/error constructor, or Data.taggedEnum variant constructor.",
	Help:        "Do not construct a tagged value by writing a literal `_tag` object.",
}

func propertyName(node *ast.Node) string {
	if name, ok := ast.TryGetTextOfPropertyName(node.Name()); ok {
		return name
	}
	name := node.Name()
	if ast.IsComputedPropertyName(name) && ast.IsStringLiteralLike(name.Expression()) {
		return name.Expression().Text()
	}
	return ""
}

func matchPattern(node *ast.Node) bool {
	parent := node.Parent
	if parent == nil || !ast.IsCallExpression(parent) {
		return false
	}
	call := parent.AsCallExpression()
	argument := false
	for _, candidate := range call.Arguments.Nodes {
		argument = argument || candidate == node
	}
	if !argument || !ast.IsPropertyAccessExpression(call.Expression) {
		return false
	}
	access := call.Expression.AsPropertyAccessExpression()
	return ast.IsIdentifier(access.Expression) && access.Expression.Text() == "Match" && (access.Name().Text() == "when" || access.Name().Text() == "not")
}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindObjectLiteralExpression: func(node *ast.Node) {
		if matchPattern(node) {
			return
		}
		for _, property := range node.AsObjectLiteralExpression().Properties.Nodes {
			if ast.IsPropertyAssignment(property) && propertyName(property) == "_tag" && ast.IsStringLiteralLike(property.AsPropertyAssignment().Initializer) {
				ctx.ReportNode(property, message)
				return
			}
		}
	}}
}

var Rule = rule.Rule{Name: "no-manual-tagged-construction", Run: run}
