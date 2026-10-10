package no_module_mocking

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
)

var message = rule.RuleMessage{
	Id:          "no-module-mocking",
	Description: "Replace module mocking with dependency injection through a real interface, service layer, or faithful test implementation.",
	Help:        "Exercise the production dependency seam instead of replacing a module namespace.",
}

// mockMethods lists the global module-mocking methods each test API exposes.
var mockMethods = map[string]map[string]bool{
	"jest": {"doMock": true, "mock": true, "setMock": true, "unstable_mockModule": true},
	"mock": {"module": true},
	"vi":   {"doMock": true, "mock": true, "unstable_mockModule": true},
}

// rewireMethods are the dependency-replacement methods rewire adds to its result and babel-plugin-rewire adds to module namespaces.
var rewireMethods = map[string]bool{"__ResetDependency__": true, "__Rewire__": true, "__set__": true}

// rewiredExport marks the module object a rewire call returns.
const rewiredExport = "\x00rewired"

var moduleReplacers = map[string]bool{"proxyquire": true, "rewire": true}

// globalModule marks a vi or jest identifier provided as an ambient global rather than imported.
const globalModule = "\x00global"

// binding is the module export an expression denotes; an empty export means the module namespace.
type binding struct {
	module string
	export string
}

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

func testAPI(target binding) string {
	switch {
	case target.export == "vi" && (target.module == "vitest" || target.module == globalModule):
		return "vi"
	case target.export == "jest" && (target.module == "@jest/globals" || target.module == globalModule):
		return "jest"
	case target.export == "mock" && (target.module == "bun:test" || target.module == "node:test"):
		return "mock"
	}
	return ""
}

func knownModule(module string) bool {
	return module == "vitest" || module == "@jest/globals" || module == "bun:test" || module == "node:test" || moduleReplacers[module]
}

func globalName(name string) binding {
	if name == "vi" || name == "jest" {
		return binding{module: globalModule, export: name}
	}
	return binding{}
}

func moduleText(node *ast.Node) string {
	if node != nil && ast.IsStringLiteralLike(node) {
		return node.Text()
	}
	return ""
}

func enclosingModule(declaration *ast.Node) string {
	for current := declaration.Parent; current != nil && !ast.IsSourceFile(current); current = current.Parent {
		if ast.IsImportDeclaration(current) {
			return moduleText(current.AsImportDeclaration().ModuleSpecifier)
		}
		if ast.IsExportDeclaration(current) {
			return moduleText(current.AsExportDeclaration().ModuleSpecifier)
		}
	}
	return ""
}

func requiredModule(node *ast.Node) string {
	if !ast.IsCallExpression(node) {
		return ""
	}
	call := node.AsCallExpression()
	if !ast.IsIdentifier(call.Expression) || call.Expression.Text() != "require" || len(call.Arguments.Nodes) != 1 {
		return ""
	}
	return moduleText(call.Arguments.Nodes[0])
}

func isConst(declaration *ast.Node) bool {
	return ast.GetCombinedNodeFlags(declaration)&ast.NodeFlagsConst != 0
}

// resolve follows const aliases, destructuring, imports, re-exports, require calls, and namespace member access.
func resolve(ctx rule.RuleContext, node *ast.Node, seen map[*ast.Symbol]bool) binding {
	node = ast.SkipParentheses(node)
	if module := requiredModule(node); module != "" {
		return binding{module: module}
	}
	if ast.IsCallExpression(node) {
		if resolve(ctx, node.AsCallExpression().Expression, seen).module == "rewire" {
			return binding{module: "rewire", export: rewiredExport}
		}
		return binding{}
	}
	if base, name := member(node); base != nil {
		target := resolve(ctx, base, seen)
		if target.module == "" || target.export != "" {
			return binding{}
		}
		if !knownModule(target.module) && ast.IsPropertyAccessExpression(node) {
			if property := resolveSymbol(ctx, ctx.TypeChecker.GetSymbolAtLocation(node.AsPropertyAccessExpression().Name()), seen); property.module != "" {
				return property
			}
		}
		return binding{module: target.module, export: name}
	}
	if !ast.IsIdentifier(node) {
		return binding{}
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
	if symbol == nil || len(symbol.Declarations) == 0 {
		return globalName(node.Text())
	}
	return resolveSymbol(ctx, symbol, seen)
}

func resolveSymbol(ctx rule.RuleContext, symbol *ast.Symbol, seen map[*ast.Symbol]bool) binding {
	if symbol == nil || seen[symbol] {
		return binding{}
	}
	seen[symbol] = true
	for _, declaration := range symbol.Declarations {
		if target := resolveDeclaration(ctx, symbol, declaration, seen); target.module != "" {
			return target
		}
	}
	return binding{}
}

func resolveDeclaration(ctx rule.RuleContext, symbol *ast.Symbol, declaration *ast.Node, seen map[*ast.Symbol]bool) binding {
	switch {
	case ast.IsImportSpecifier(declaration) || ast.IsExportSpecifier(declaration):
		name := declaration.Name().Text()
		var property *ast.Node
		if ast.IsImportSpecifier(declaration) {
			property = declaration.AsImportSpecifier().PropertyName
		} else {
			property = declaration.AsExportSpecifier().PropertyName
		}
		if property != nil {
			name = property.Text()
		}
		direct := binding{module: enclosingModule(declaration), export: name}
		if knownModule(direct.module) {
			return direct
		}
		if symbol.Flags&ast.SymbolFlagsAlias != 0 {
			if target := resolveSymbol(ctx, ctx.TypeChecker.GetImmediateAliasedSymbol(symbol), seen); target.module != "" {
				return target
			}
		}
		return direct
	case ast.IsNamespaceImport(declaration) || ast.IsNamespaceExport(declaration):
		return binding{module: enclosingModule(declaration)}
	case ast.IsImportClause(declaration):
		return binding{module: enclosingModule(declaration), export: "default"}
	case ast.IsImportEqualsDeclaration(declaration):
		reference := declaration.AsImportEqualsDeclaration().ModuleReference
		if ast.IsExternalModuleReference(reference) {
			return binding{module: moduleText(reference.AsExternalModuleReference().Expression)}
		}
		return binding{}
	case ast.IsVariableDeclaration(declaration):
		initializer := declaration.AsVariableDeclaration().Initializer
		if initializer != nil && isConst(declaration) {
			if target := resolve(ctx, initializer, seen); target.module != "" {
				return target
			}
		}
	case ast.IsBindingElement(declaration):
		element := declaration.AsBindingElement()
		pattern := declaration.Parent
		if ast.IsObjectBindingPattern(pattern) && ast.IsVariableDeclaration(pattern.Parent) && isConst(pattern.Parent) {
			initializer := pattern.Parent.AsVariableDeclaration().Initializer
			name := declaration.Name()
			if element.PropertyName != nil {
				name = element.PropertyName
			}
			if initializer != nil && ast.IsIdentifier(name) {
				if target := resolve(ctx, initializer, seen); target.module != "" && target.export == "" {
					return binding{module: target.module, export: name.Text()}
				}
			}
		}
		return binding{}
	}
	if file := ast.GetSourceFileOfNode(declaration); file != nil && strings.HasSuffix(file.FileName(), ".d.ts") {
		return globalName(symbol.Name)
	}
	return binding{}
}

func reported(ctx rule.RuleContext, call *ast.CallExpression) bool {
	if moduleReplacers[resolve(ctx, call.Expression, map[*ast.Symbol]bool{}).module] {
		return true
	}
	receiver, method := member(call.Expression)
	if receiver == nil {
		return false
	}
	origin := resolve(ctx, receiver, map[*ast.Symbol]bool{})
	if rewireMethods[method] && (origin.export == rewiredExport || (origin.export == "" && origin.module != "" && origin.module != globalModule)) {
		return true
	}
	if method == "module" && nodeTestMockTracker(ctx, receiver) {
		return true
	}
	api := testAPI(origin)
	if mockMethods[api][method] {
		return true
	}
	if method != "spyOn" || (api != "vi" && api != "jest") || len(call.Arguments.Nodes) == 0 {
		return false
	}
	target := resolve(ctx, call.Arguments.Nodes[0], map[*ast.Symbol]bool{})
	return target.module != "" && target.module != globalModule && target.export == ""
}

// nodeTestMockTracker reports whether node's type is node:test's MockTracker, such as a test context's `t.mock`.
func nodeTestMockTracker(ctx rule.RuleContext, node *ast.Node) bool {
	symbol := checker.Type_symbol(ctx.TypeChecker.GetTypeAtLocation(node))
	if symbol == nil || symbol.Name != "MockTracker" {
		return false
	}
	for _, declaration := range symbol.Declarations {
		for current := declaration.Parent; current != nil; current = current.Parent {
			if ast.IsModuleDeclaration(current) {
				name := current.AsModuleDeclaration().Name()
				if ast.IsStringLiteral(name) && (name.Text() == "node:test" || name.Text() == "test") {
					return true
				}
			}
		}
	}
	return false
}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		if reported(ctx, node.AsCallExpression()) {
			ctx.ReportNode(node, message)
		}
	}}
}

var Rule = rule.Rule{Name: "no-module-mocking", Run: run}
