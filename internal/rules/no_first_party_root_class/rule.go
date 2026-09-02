package no_first_party_root_class

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "no-first-party-root-class",
	Description: "Avoid unsupported first-party classes.",
	Help:        "Use a class only when it extends another class without private methods. Replace root classes with functions, grouping them in a plain object when the namespace is part of the API.",
}

func hasExtendsClause(node *ast.Node) bool {
	clauses := node.ClassLikeData().HeritageClauses
	if clauses == nil {
		return false
	}
	for _, clause := range clauses.Nodes {
		if clause.AsHeritageClause().Token == ast.KindExtendsKeyword {
			return true
		}
	}
	return false
}

func privateMethod(node *ast.Node) bool {
	return ast.IsMethodDeclaration(node) &&
		(ast.HasSyntacticModifier(node, ast.ModifierFlagsPrivate) || ast.IsPrivateIdentifier(node.Name()))
}

func hasPrivateMethod(node *ast.Node) bool {
	for _, member := range node.ClassLikeData().Members.Nodes {
		if privateMethod(member) {
			return true
		}
	}
	return false
}

var Rule = rule.Rule{
	Name: "no-first-party-root-class",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		check := func(node *ast.Node) {
			if hasExtendsClause(node) && !hasPrivateMethod(node) {
				return
			}
			target := node.Name()
			if target == nil {
				target = node
			}
			ctx.ReportNode(target, message)
		}
		return rule.RuleListeners{
			ast.KindClassDeclaration: check,
			ast.KindClassExpression:  check,
		}
	},
}
