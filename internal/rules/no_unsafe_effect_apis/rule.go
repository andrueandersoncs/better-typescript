package no_unsafe_effect_apis

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"strings"
)

var Rule = rule.Rule{
	Name: "no-unsafe-effect-apis",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		message := rule.RuleMessage{Id: "no-unsafe-effect-apis", Description: "Avoid unsafe Effect APIs.", Help: "Use the safe Effect API and handle its Effect, Option, Result, or identity semantics explicitly. If no safe counterpart preserves the required behavior, redesign the boundary instead of using an API whose name contains unsafe."}
		check := func(reference, target *ast.Node) {
			symbol := resolvedSymbol(ctx, target)
			if symbol == nil || !strings.Contains(strings.ToLower(symbol.Name), "unsafe") || !declaredInEffect(symbol) {
				return
			}
			ctx.ReportNode(reference, message)
		}
		return rule.RuleListeners{
			ast.KindIdentifier: func(node *ast.Node) {
				if identifierIsExcluded(node) {
					return
				}
				check(node, node)
			},
			ast.KindPropertyAccessExpression: func(node *ast.Node) { check(node, node.AsPropertyAccessExpression().Name()) },
			ast.KindElementAccessExpression: func(node *ast.Node) {
				argument := node.AsElementAccessExpression().ArgumentExpression
				if argument != nil && ast.IsStringLiteralLike(argument) {
					check(node, argument)
				}
			},
		}
	},
}

func identifierIsExcluded(node *ast.Node) bool {
	if node.Parent == nil {
		return false
	}
	if ast.IsPropertyAccessExpression(node.Parent) && node.Parent.AsPropertyAccessExpression().Name() == node {
		return true
	}
	switch node.Parent.Kind {
	case ast.KindImportSpecifier, ast.KindExportSpecifier, ast.KindImportClause, ast.KindNamespaceImport, ast.KindNamespaceExport, ast.KindTypeQuery:
		return true
	}
	return false
}
func resolvedSymbol(ctx rule.RuleContext, node *ast.Node) *ast.Symbol {
	symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
	if symbol != nil && symbol.Flags&ast.SymbolFlagsAlias != 0 {
		symbol = ctx.TypeChecker.GetAliasedSymbol(symbol)
	}
	return symbol
}
func declaredInEffect(symbol *ast.Symbol) bool {
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := strings.ReplaceAll(file.FileName(), "\\", "/")
		if strings.Contains(path, "/node_modules/effect/") || strings.HasSuffix(path, "/effect/index.d.ts") {
			return true
		}
	}
	return false
}
