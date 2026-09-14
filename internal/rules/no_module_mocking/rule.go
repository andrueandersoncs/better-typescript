package no_module_mocking

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "no-module-mocking",
	Description: "Replace module mocking with dependency injection through a real interface, service layer, or faithful test implementation.",
	Help:        "Exercise the production dependency seam instead of replacing a module namespace.",
}

var mockMethods = map[string]bool{"doMock": true, "mock": true, "unstable_mockModule": true}

func member(node *ast.Node) (*ast.Node, string) {
	if ast.IsPropertyAccessExpression(node) {
		access := node.AsPropertyAccessExpression()
		return access.Expression, access.Name().Text()
	}
	if ast.IsElementAccessExpression(node) {
		access := node.AsElementAccessExpression()
		if ast.IsStringLiteralLike(access.ArgumentExpression) {
			return access.Expression, access.ArgumentExpression.Text()
		}
	}
	return nil, ""
}

func testAPI(ctx rule.RuleContext, node *ast.Node) bool {
	if !ast.IsIdentifier(node) {
		return false
	}
	name := node.Text()
	symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
	if symbol == nil || len(symbol.Declarations) == 0 {
		return name == "vi" || name == "jest"
	}
	for _, declaration := range symbol.Declarations {
		if ast.IsImportSpecifier(declaration) {
			specifier := declaration.AsImportSpecifier()
			imported := specifier.Name().Text()
			if specifier.PropertyName != nil {
				imported = specifier.PropertyName.Text()
			}
			for current := declaration.Parent; current != nil && !ast.IsSourceFile(current); current = current.Parent {
				if !ast.IsImportDeclaration(current) {
					continue
				}
				module := current.AsImportDeclaration().ModuleSpecifier
				if module != nil && ((imported == "vi" && module.Text() == "vitest") || (imported == "jest" && module.Text() == "@jest/globals")) {
					return true
				}
			}
			continue
		}
		file := ast.GetSourceFileOfNode(declaration)
		if file != nil && strings.HasSuffix(file.FileName(), ".d.ts") && (name == "vi" || name == "jest") {
			return true
		}
	}
	return false
}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		receiver, method := member(node.AsCallExpression().Expression)
		if mockMethods[method] && testAPI(ctx, receiver) {
			ctx.ReportNode(node, message)
		}
	}}
}

var Rule = rule.Rule{Name: "no-module-mocking", Run: run}
