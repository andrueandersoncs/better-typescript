package idempotent_retry

import (
	"regexp"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var mutationOperationPattern = regexp.MustCompile(`(?i)^(create|insert|update|upsert|delete|remove|write|save|put|post|patch|send|publish|enqueue|dispatch|mutate)`)
var idempotentOperationPattern = regexp.MustCompile(`(?i)^(get|list|find|read|lookup|fetch|resolve|load|query|check)`)

var message = rule.RuleMessage{
	Id:          "idempotentRetry",
	Description: "Retry only idempotent operations.",
	Help:        "Establish idempotency in the domain contract before applying retry.",
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

func isEffectRetry(imports effectImports, call *ast.Node) bool {
	path := expressionPath(call.AsCallExpression().Expression)
	if len(path) == 2 && imports.named[path[0]] == "Effect" && (path[1] == "retry" || path[1] == "retryOrElse") {
		return true
	}
	if len(path) == 3 && imports.namespace[path[0]] && path[1] == "Effect" && (path[2] == "retry" || path[2] == "retryOrElse") {
		return true
	}
	return len(path) == 1 && (imports.named[path[0]] == "Effect.retry" || imports.named[path[0]] == "Effect.retryOrElse")
}

func propertyNameText(node *ast.Node) string {
	if node == nil {
		return ""
	}
	switch node.Kind {
	case ast.KindIdentifier, ast.KindStringLiteral, ast.KindNumericLiteral:
		return node.Text()
	default:
		return ""
	}
}

func enclosingFunctionName(node *ast.Node) string {
	for current := node.Parent; current != nil; current = current.Parent {
		if !ast.IsFunctionLike(current) {
			continue
		}
		if direct := propertyNameText(current.Name()); direct != "" {
			return direct
		}
		parent := current.Parent
		if ast.IsVariableDeclaration(parent) && ast.IsIdentifier(parent.Name()) {
			return parent.Name().Text()
		}
		if ast.IsPropertyAssignment(parent) {
			return propertyNameText(parent.Name())
		}
		return ""
	}
	return ""
}

var IdempotentRetryRule = rule.Rule{
	Name: "idempotent-retry",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		imports := importsFor(ctx.SourceFile)
		return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
			if !isEffectRetry(imports, node) {
				return
			}
			operation := enclosingFunctionName(node)
			if operation == "" || idempotentOperationPattern.MatchString(operation) || !mutationOperationPattern.MatchString(operation) {
				return
			}
			ctx.ReportNode(node.AsCallExpression().Expression, message)
		}}
	},
}
