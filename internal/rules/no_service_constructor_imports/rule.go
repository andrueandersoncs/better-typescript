package no_service_constructor_imports

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var constructorName = regexp.MustCompile(`^make[A-Z]`)
var testFile = regexp.MustCompile(`\.(test|spec)\.[cm]?[jt]sx?$`)

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindImportDeclaration: func(node *ast.Node) {
		if testFile.MatchString(strings.ReplaceAll(ctx.SourceFile.FileName(), "\\", "/")) {
			return
		}
		declaration := node.AsImportDeclaration()
		if declaration.ModuleSpecifier == nil {
			return
		}
		module := declaration.ModuleSpecifier.Text()
		if !strings.HasPrefix(module, "./") && !strings.HasPrefix(module, "../") {
			return
		}
		if declaration.ImportClause == nil {
			return
		}
		bindings := declaration.ImportClause.AsImportClause().NamedBindings
		if bindings == nil || !ast.IsNamedImports(bindings) {
			return
		}
		for _, element := range bindings.AsNamedImports().Elements.Nodes {
			specifier := element.AsImportSpecifier()
			name := specifier.Name().Text()
			if specifier.PropertyName != nil {
				name = specifier.PropertyName.Text()
			}
			if !constructorName.MatchString(name) {
				continue
			}
			ctx.ReportNode(element, rule.RuleMessage{
				Id:          "no-service-constructor-imports",
				Description: fmt.Sprintf("Do not import Effect service constructor `%s` into runtime code.", name),
				Help:        "Import the owning Layer, yield the contextual service, and allow its requirements to propagate to the composition root.",
			})
		}
	}}
}

var Rule = rule.Rule{Name: "no-service-constructor-imports", Run: run}
