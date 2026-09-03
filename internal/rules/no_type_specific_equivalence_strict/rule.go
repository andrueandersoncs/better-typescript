package no_type_specific_equivalence_strict

import (
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "no-type-specific-equivalence-strict",
	Description: "Avoid families of primitive-specific Equivalence.strictEqual bindings.",
	Help:        "Compare at the use site or expose one generic comparison operation. A single semantically named binding is allowed.",
}

var Rule = rule.Rule{
	Name: "no-type-specific-equivalence-strict",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		seen := false
		return rule.RuleListeners{
			ast.KindVariableDeclaration: func(node *ast.Node) {
				if !isPrimitiveStrictEqualBinding(ctx, node) {
					return
				}
				if !seen {
					seen = true
					return
				}
				ctx.ReportNode(node.AsVariableDeclaration().Name(), message)
			},
		}
	},
}

func isPrimitiveStrictEqualBinding(ctx rule.RuleContext, node *ast.Node) bool {
	declaration := node.AsVariableDeclaration()
	if !isTopLevelVariable(node) || !ast.IsIdentifier(declaration.Name()) || declaration.Initializer == nil {
		return false
	}
	initializer := unwrap(declaration.Initializer)
	if !ast.IsCallExpression(initializer) {
		return false
	}
	call := initializer.AsCallExpression()
	if call.Arguments == nil || len(call.Arguments.Nodes) != 0 || call.TypeArguments == nil || len(call.TypeArguments.Nodes) != 1 || !isPrimitiveKeyword(call.TypeArguments.Nodes[0]) {
		return false
	}
	if !ast.IsPropertyAccessExpression(call.Expression) {
		return false
	}
	access := call.Expression.AsPropertyAccessExpression()
	return access.Name().Text() == "strictEqual" && isEffectEquivalence(ctx, access.Expression)
}

func isTopLevelVariable(node *ast.Node) bool {
	if node.Parent == nil || !ast.IsVariableDeclarationList(node.Parent) {
		return false
	}
	statement := node.Parent.Parent
	return statement != nil && ast.IsVariableStatement(statement) && statement.Parent != nil && ast.IsSourceFile(statement.Parent)
}

func isPrimitiveKeyword(node *ast.Node) bool {
	switch node.Kind {
	case ast.KindStringKeyword, ast.KindNumberKeyword, ast.KindBooleanKeyword, ast.KindBigIntKeyword, ast.KindSymbolKeyword:
		return true
	default:
		return false
	}
}

func isEffectEquivalence(ctx rule.RuleContext, node *ast.Node) bool {
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, node)
	if symbol == nil {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := strings.ReplaceAll(file.FileName(), "\\", "/")
		base := filepath.Base(path)
		inEffect := strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/")
		if inEffect && (base == "Equivalence.ts" || base == "Equivalence.d.ts") {
			return true
		}
	}
	return false
}

func unwrap(node *ast.Node) *ast.Node {
	for node != nil && (node.Kind == ast.KindParenthesizedExpression || node.Kind == ast.KindAsExpression || node.Kind == ast.KindSatisfiesExpression || node.Kind == ast.KindNonNullExpression) {
		node = node.Expression()
	}
	return node
}
