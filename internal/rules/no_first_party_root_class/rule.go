package no_first_party_root_class

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "no-first-party-root-class",
	Description: "Avoid unsupported first-party classes.",
	Help:        "Use a class only when it extends another class. Keep methods static unless they declare override; private methods are not allowed. Replace root classes with functions, grouping them in a plain object when the namespace is part of the API.",
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

func unsupportedMethod(node *ast.Node) bool {
	if !ast.IsMethodDeclaration(node) {
		return false
	}
	if ast.HasSyntacticModifier(node, ast.ModifierFlagsPrivate) || ast.IsPrivateIdentifier(node.Name()) {
		return true
	}
	return !ast.HasSyntacticModifier(node, ast.ModifierFlagsStatic) &&
		!ast.HasSyntacticModifier(node, ast.ModifierFlagsOverride)
}

func hasUnsupportedMethod(node *ast.Node) bool {
	for _, member := range node.ClassLikeData().Members.Nodes {
		if unsupportedMethod(member) {
			return true
		}
	}
	return false
}

var Rule = rule.Rule{
	Name: "no-first-party-root-class",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		check := func(node *ast.Node) {
			if hasExtendsClause(node) && !hasUnsupportedMethod(node) {
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
