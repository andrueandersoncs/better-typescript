package no_first_party_root_class

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "no-first-party-root-class",
	Description: "Avoid unsupported first-party class declarations.",
	Help:        "Use a class only when it extends another class without private methods, or when it contains one private constructor and only public static methods. Replace other classes with factory functions and structural data.",
}

func hasExtendsClause(node *ast.Node) bool {
	clauses := node.AsClassDeclaration().HeritageClauses
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

func privateConstructor(node *ast.Node) bool {
	if !ast.HasSyntacticModifier(node, ast.ModifierFlagsPrivate) {
		return false
	}
	for _, parameter := range node.Parameters() {
		if ast.HasSyntacticModifier(parameter, ast.ModifierFlagsParameterPropertyModifier) {
			return false
		}
	}
	return true
}

func privateMethod(node *ast.Node) bool {
	return ast.IsMethodDeclaration(node) &&
		(ast.HasSyntacticModifier(node, ast.ModifierFlagsPrivate) || ast.IsPrivateIdentifier(node.Name()))
}

func publicStaticMethod(node *ast.Node) bool {
	return ast.IsMethodDeclaration(node) &&
		ast.HasSyntacticModifier(node, ast.ModifierFlagsStatic) &&
		!ast.HasSyntacticModifier(node, ast.ModifierFlagsPrivate|ast.ModifierFlagsProtected) &&
		!ast.IsPrivateIdentifier(node.Name())
}

func hasPrivateMethod(node *ast.Node) bool {
	for _, member := range node.AsClassDeclaration().Members.Nodes {
		if privateMethod(member) {
			return true
		}
	}
	return false
}

func staticUtilityClass(node *ast.Node) bool {
	members := node.AsClassDeclaration().Members
	if members == nil || len(members.Nodes) == 0 {
		return false
	}
	constructors := 0
	methods := 0
	for _, member := range members.Nodes {
		switch {
		case ast.IsConstructorDeclaration(member):
			constructors++
			if !privateConstructor(member) {
				return false
			}
		case publicStaticMethod(member):
			methods++
		default:
			return false
		}
	}
	return constructors == 1 && methods > 0
}

var Rule = rule.Rule{
	Name: "no-first-party-root-class",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindClassDeclaration: func(node *ast.Node) {
			if !hasPrivateMethod(node) && (hasExtendsClause(node) || staticUtilityClass(node)) {
				return
			}
			target := node.Name()
			if target == nil {
				target = node
			}
			ctx.ReportNode(target, message)
		}}
	},
}
