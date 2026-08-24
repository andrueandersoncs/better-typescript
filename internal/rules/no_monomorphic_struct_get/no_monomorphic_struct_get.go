package no_monomorphic_struct_get

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
	"strings"
)

var message = rule.RuleMessage{Id: "no-monomorphic-struct-get", Description: "Avoid monomorphizing Struct.get at its declaration.", Help: "Keep Struct.get polymorphic. Inline it at a typed consumer, or put the domain type on the consuming value or result rather than on the getter."}
var Rule = rule.Rule{Name: "no-monomorphic-struct-get", Run: run}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindVariableDeclaration: func(node *ast.Node) {
		declaration := node.AsVariableDeclaration()
		if declaration.Type == nil || declaration.Initializer == nil {
			return
		}
		statement := node.Parent
		if statement != nil {
			statement = statement.Parent
		}
		if statement != nil && statement.Kind == ast.KindVariableStatement && ast.HasSyntacticModifier(statement, ast.ModifierFlagsExport) {
			return
		}
		declared := ctx.TypeChecker.GetTypeFromTypeNode(declaration.Type)
		signatures := ctx.TypeChecker.GetSignaturesOfType(declared, checker.SignatureKindCall)
		if len(signatures) == 0 {
			return
		}
		for _, signature := range signatures {
			if len(signature.TypeParameters()) > 0 {
				return
			}
		}
		initializer := unwrap(declaration.Initializer)
		if initializer.Kind != ast.KindCallExpression {
			return
		}
		call := initializer.AsCallExpression()
		if call.Arguments == nil || len(call.Arguments.Nodes) != 1 || call.Expression.Kind != ast.KindPropertyAccessExpression {
			return
		}
		access := call.Expression.AsPropertyAccessExpression()
		if access.Name().Text() != "get" {
			return
		}
		symbol := ctx.TypeChecker.GetSymbolAtLocation(access.Name())
		if symbol != nil && symbol.Flags&ast.SymbolFlagsAlias != 0 {
			symbol = ctx.TypeChecker.GetAliasedSymbol(symbol)
		}
		if symbol == nil {
			return
		}
		inEffect := false
		for _, item := range symbol.Declarations {
			if file := ast.GetSourceFileOfNode(item); file != nil {
				name := strings.ReplaceAll(file.FileName(), "\\", "/")
				if strings.Contains(name, "/effect/") && (strings.HasSuffix(name, "/Struct.d.ts") || strings.HasSuffix(name, "/Struct.ts")) {
					inEffect = true
				}
			}
		}
		if !inEffect {
			return
		}
		ctx.ReportNode(declaration.Type, message)
	}}
}
func unwrap(node *ast.Node) *ast.Node {
	for node != nil && (node.Kind == ast.KindParenthesizedExpression || node.Kind == ast.KindAsExpression || node.Kind == ast.KindSatisfiesExpression || node.Kind == ast.KindNonNullExpression) {
		node = node.Expression()
	}
	return node
}
