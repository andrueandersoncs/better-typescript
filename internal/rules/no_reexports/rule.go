package no_reexports

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var Rule = rule.Rule{
	Name: "no-reexports",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		imported := importedNames(ctx.SourceFile)
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
					if imported[local] {
						ctx.ReportNode(node, message)
					}
				}
			},
			ast.KindExportAssignment: func(node *ast.Node) {
				expression := node.AsExportAssignment().Expression
				if ast.IsIdentifier(expression) && imported[expression.Text()] {
					ctx.ReportNode(node, message)
				}
			},
		}
	},
}

func importedNames(file *ast.SourceFile) map[string]bool {
	result := map[string]bool{}
	for _, statement := range file.Statements.Nodes {
		if !ast.IsImportDeclaration(statement) {
			continue
		}
		clause := statement.AsImportDeclaration().ImportClause
		if clause == nil {
			continue
		}
		if clause.Name() != nil {
			result[clause.Name().Text()] = true
		}
		bindings := clause.AsImportClause().NamedBindings
		if bindings == nil {
			continue
		}
		if ast.IsNamespaceImport(bindings) {
			result[bindings.Name().Text()] = true
			continue
		}
		if ast.IsNamedImports(bindings) {
			for _, specifier := range bindings.AsNamedImports().Elements.Nodes {
				result[specifier.Name().Text()] = true
			}
		}
	}
	return result
}
