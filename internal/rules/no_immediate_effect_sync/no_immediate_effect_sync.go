package no_immediate_effect_sync

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{Id: "no-immediate-effect-sync", Description: "Avoid immediately running a locally bound Effect.sync.", Help: "Run the synchronous action directly at this startup boundary, or retain the Effect only when it is deferred or composed into a larger workflow."}
var Rule = rule.Rule{Name: "no-immediate-effect-sync", Run: run}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	isEffectCall := effectCallMatcher(ctx.SourceFile)
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		call := node.AsCallExpression()
		if !isEffectCall(call.Expression, "runSync") || call.Arguments == nil || len(call.Arguments.Nodes) == 0 {
			return
		}
		argument := call.Arguments.Nodes[0]
		if argument.Kind != ast.KindIdentifier {
			return
		}
		statement := containingStatement(node)
		if statement == nil {
			return
		}
		statements, container := containingStatements(statement)
		if statements == nil {
			return
		}
		index := -1
		for i, candidate := range statements {
			if candidate == statement {
				index = i
				break
			}
		}
		if index < 1 || statements[index-1].Kind != ast.KindVariableStatement {
			return
		}
		symbol := ctx.TypeChecker.GetSymbolAtLocation(argument)
		if symbol == nil {
			return
		}
		matched := false
		for _, declaration := range statements[index-1].AsVariableStatement().DeclarationList.AsVariableDeclarationList().Declarations.Nodes {
			variable := declaration.AsVariableDeclaration()
			name := variable.Name()
			if name == nil || name.Kind != ast.KindIdentifier || ctx.TypeChecker.GetSymbolAtLocation(name) != symbol || variable.Initializer == nil {
				continue
			}
			initializer := unwrap(variable.Initializer)
			if initializer.Kind == ast.KindCallExpression && isEffectCall(initializer.AsCallExpression().Expression, "sync") {
				matched = true
			}
		}
		if !matched || referenceCount(ctx, container, symbol) != 2 {
			return
		}
		ctx.ReportNode(call.Expression, message)
	}}
}
func effectCallMatcher(sourceFile *ast.SourceFile) func(*ast.Node, string) bool {
	namespaces := map[string]bool{}
	direct := map[string]string{}
	for _, statement := range sourceFile.Statements.Nodes {
		if statement.Kind != ast.KindImportDeclaration {
			continue
		}
		declaration := statement.AsImportDeclaration()
		if declaration.ImportClause == nil || declaration.ModuleSpecifier == nil {
			continue
		}
		module := declaration.ModuleSpecifier.Text()
		bindings := declaration.ImportClause.AsImportClause().NamedBindings
		if bindings == nil {
			continue
		}
		if bindings.Kind == ast.KindNamespaceImport && module == "effect/Effect" {
			namespaces[bindings.Name().Text()] = true
			continue
		}
		if bindings.Kind != ast.KindNamedImports {
			continue
		}
		for _, element := range bindings.AsNamedImports().Elements.Nodes {
			specifier := element.AsImportSpecifier()
			imported := specifier.Name().Text()
			if specifier.PropertyName != nil {
				imported = specifier.PropertyName.Text()
			}
			local := specifier.Name().Text()
			if module == "effect" && imported == "Effect" {
				namespaces[local] = true
			}
			if module == "effect/Effect" {
				direct[local] = imported
			}
		}
	}
	return func(node *ast.Node, name string) bool {
		if node == nil {
			return false
		}
		if node.Kind == ast.KindIdentifier {
			return direct[node.Text()] == name
		}
		if node.Kind != ast.KindPropertyAccessExpression {
			return false
		}
		access := node.AsPropertyAccessExpression()
		return access.Expression.Kind == ast.KindIdentifier && namespaces[access.Expression.Text()] && access.Name().Text() == name
	}
}

func unwrap(node *ast.Node) *ast.Node {
	for node != nil && (node.Kind == ast.KindParenthesizedExpression || node.Kind == ast.KindAsExpression || node.Kind == ast.KindSatisfiesExpression || node.Kind == ast.KindNonNullExpression) {
		node = node.Expression()
	}
	return node
}
func containingStatement(node *ast.Node) *ast.Node {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsStatement(current) {
			return current
		}
	}
	return nil
}
func containingStatements(statement *ast.Node) ([]*ast.Node, *ast.Node) {
	parent := statement.Parent
	if parent == nil {
		return nil, nil
	}
	if parent.Kind == ast.KindBlock {
		return parent.AsBlock().Statements.Nodes, parent
	}
	if parent.Kind == ast.KindSourceFile {
		return parent.AsSourceFile().Statements.Nodes, parent
	}
	return nil, nil
}
func referenceCount(ctx rule.RuleContext, container *ast.Node, symbol *ast.Symbol) int {
	count := 0
	var visit ast.Visitor
	visit = func(node *ast.Node) bool {
		if node.Kind == ast.KindIdentifier && ctx.TypeChecker.GetSymbolAtLocation(node) == symbol {
			count++
		}
		node.ForEachChild(visit)
		return false
	}
	container.ForEachChild(visit)
	return count
}
