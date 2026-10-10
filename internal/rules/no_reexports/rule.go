package no_reexports

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var Rule = rule.Rule{
	Name: "no-reexports",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		forwarded := forwardedNames(ctx.SourceFile)
		message := rule.RuleMessage{Id: "no-reexports", Description: "Do not re-export imported bindings.", Help: "Import the dependency where it is used and expose a locally defined public interface instead."}
		return rule.RuleListeners{
			ast.KindExportDeclaration: func(node *ast.Node) {
				declaration := node.AsExportDeclaration()
				if declaration.ModuleSpecifier != nil {
					if declaration.ExportClause == nil {
						ctx.ReportNode(node, message)
						return
					}
					clause := declaration.ExportClause
					if ast.IsNamedExports(clause) {
						for _, specifier := range clause.AsNamedExports().Elements.Nodes {
							ctx.ReportNode(specifier, message)
						}
					} else {
						ctx.ReportNode(clause, message)
					}
					return
				}
				if declaration.ExportClause == nil || !ast.IsNamedExports(declaration.ExportClause) {
					return
				}
				for _, node := range declaration.ExportClause.AsNamedExports().Elements.Nodes {
					specifier := node.AsExportSpecifier()
					local := specifier.Name().Text()
					if specifier.PropertyName != nil {
						local = specifier.PropertyName.Text()
					}
					if forwarded[local] {
						ctx.ReportNode(node, message)
					}
				}
			},
			ast.KindExportAssignment: func(node *ast.Node) {
				if forwardsName(node.AsExportAssignment().Expression, forwarded) {
					ctx.ReportNode(node, message)
				}
			},
			ast.KindImportEqualsDeclaration: func(node *ast.Node) {
				if ast.HasSyntacticModifier(node, ast.ModifierFlagsExport) {
					ctx.ReportNode(node, message)
				}
			},
		}
	},
}

// forwardedNames collects top-level import bindings and the top-level const
// aliases that point at them or at their members.
func forwardedNames(file *ast.SourceFile) map[string]bool {
	result := map[string]bool{}
	for _, statement := range file.Statements.Nodes {
		switch {
		case ast.IsImportDeclaration(statement):
			addImportClause(result, statement.AsImportDeclaration().ImportClause)
		case ast.IsImportEqualsDeclaration(statement):
			result[statement.Name().Text()] = true
		case ast.IsVariableStatement(statement):
			list := statement.AsVariableStatement().DeclarationList
			if list.Flags&ast.NodeFlagsConst == 0 {
				continue
			}
			for _, node := range list.AsVariableDeclarationList().Declarations.Nodes {
				declaration := node.AsVariableDeclaration()
				if ast.IsIdentifier(declaration.Name()) && forwardsName(declaration.Initializer, result) {
					result[declaration.Name().Text()] = true
				}
			}
		}
	}
	return result
}

func addImportClause(result map[string]bool, clause *ast.Node) {
	if clause == nil {
		return
	}
	if clause.Name() != nil {
		result[clause.Name().Text()] = true
	}
	bindings := clause.AsImportClause().NamedBindings
	if bindings == nil {
		return
	}
	if ast.IsNamespaceImport(bindings) {
		result[bindings.Name().Text()] = true
		return
	}
	if ast.IsNamedImports(bindings) {
		for _, specifier := range bindings.AsNamedImports().Elements.Nodes {
			result[specifier.Name().Text()] = true
		}
	}
}

// forwardsName reports whether expression is a forwarded name or a dotted member of one.
func forwardsName(expression *ast.Node, forwarded map[string]bool) bool {
	return expression != nil && ast.IsEntityNameExpression(expression) && forwarded[ast.GetFirstIdentifier(expression).Text()]
}
