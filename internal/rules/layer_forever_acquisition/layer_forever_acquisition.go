package layer_forever_acquisition

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "layerForeverAcquisition",
	Description: "Fork long-lived work into the layer scope so acquisition completes.",
	Help:        "Run the worker with Effect.forkScoped, FiberSet, or FiberMap.",
}

type effectImports struct {
	named     map[string]string
	namespace map[string]bool
}

func importsFor(sourceFile *ast.SourceFile) effectImports {
	imports := effectImports{named: map[string]string{}, namespace: map[string]bool{}}
	for _, statement := range sourceFile.AsNode().Statements() {
		if !ast.IsImportDeclaration(statement) {
			continue
		}
		declaration := statement.AsImportDeclaration()
		if declaration.ImportClause == nil || !ast.IsStringLiteral(declaration.ModuleSpecifier) {
			continue
		}
		module := declaration.ModuleSpecifier.Text()
		bindings := declaration.ImportClause.AsImportClause().NamedBindings
		if bindings == nil {
			continue
		}
		if module == "effect" && ast.IsNamedImports(bindings) {
			for _, specifier := range bindings.AsNamedImports().Elements.Nodes {
				imported := specifier.Name().Text()
				if specifier.AsImportSpecifier().PropertyName != nil {
					imported = specifier.AsImportSpecifier().PropertyName.Text()
				}
				imports.named[specifier.Name().Text()] = imported
			}
		} else if module == "effect" && ast.IsNamespaceImport(bindings) {
			imports.namespace[bindings.Name().Text()] = true
		} else if strings.HasPrefix(module, "effect/") && ast.IsNamedImports(bindings) {
			prefix := strings.TrimPrefix(module, "effect/")
			for _, specifier := range bindings.AsNamedImports().Elements.Nodes {
				imported := specifier.Name().Text()
				if specifier.AsImportSpecifier().PropertyName != nil {
					imported = specifier.AsImportSpecifier().PropertyName.Text()
				}
				imports.named[specifier.Name().Text()] = prefix + "." + imported
			}
		}
	}
	return imports
}

func expressionPath(node *ast.Node) []string {
	if ast.IsIdentifier(node) {
		return []string{node.Text()}
	}
	if ast.IsPropertyAccessExpression(node) {
		access := node.AsPropertyAccessExpression()
		return append(expressionPath(access.Expression), node.Name().Text())
	}
	return nil
}

func isAPI(imports effectImports, expression *ast.Node, namespace string, names map[string]bool) bool {
	path := expressionPath(expression)
	if len(path) == 2 && imports.named[path[0]] == namespace && names[path[1]] {
		return true
	}
	if len(path) == 3 && imports.namespace[path[0]] && path[1] == namespace && names[path[2]] {
		return true
	}
	return len(path) == 1 && names[strings.TrimPrefix(imports.named[path[0]], namespace+".")]
}

func containsAPI(imports effectImports, expression *ast.Node, namespace string, names map[string]bool) bool {
	found := false
	var visit func(*ast.Node)
	visit = func(node *ast.Node) {
		if found {
			return
		}
		candidate := node
		if ast.IsCallExpression(node) {
			candidate = node.AsCallExpression().Expression
		}
		if isAPI(imports, candidate, namespace, names) {
			found = true
			return
		}
		for child := range node.IterChildren() {
			visit(child)
		}
	}
	visit(expression)
	return found
}

func acquisitionArgument(imports effectImports, call *ast.Node) *ast.Node {
	callee := call.AsCallExpression().Expression
	acquisitionNames := map[string]bool{"effect": true, "effectDiscard": true, "effectContext": true}
	if !isAPI(imports, callee, "Layer", acquisitionNames) {
		return nil
	}
	arguments := call.AsCallExpression().Arguments
	if arguments == nil || len(arguments.Nodes) == 0 {
		return nil
	}
	path := expressionPath(callee)
	name := path[len(path)-1]
	if name == "effect" && len(arguments.Nodes) >= 2 {
		return arguments.Nodes[1]
	}
	return arguments.Nodes[0]
}

func isUnforkedForever(imports effectImports, expression *ast.Node) bool {
	hasFork := containsAPI(imports, expression, "Effect", map[string]bool{"forkScoped": true})
	hasForever := containsAPI(imports, expression, "Effect", map[string]bool{"forever": true})
	hasStreamForever := containsAPI(imports, expression, "Stream", map[string]bool{"forever": true})
	hasStreamRun := containsAPI(imports, expression, "Stream", map[string]bool{"runCollect": true, "runDrain": true, "runForEach": true, "runFold": true, "runFoldWhile": true})
	return !hasFork && (hasForever || hasStreamForever && hasStreamRun)
}

var LayerForeverAcquisitionRule = rule.Rule{
	Name: "layer-forever-acquisition",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		imports := importsFor(ctx.SourceFile)
		return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
			argument := acquisitionArgument(imports, node)
			if argument != nil && isUnforkedForever(imports, argument) {
				ctx.ReportNode(node, message)
			}
		}}
	},
}
