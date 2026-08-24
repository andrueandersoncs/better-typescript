package unused_field

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

const unusedFieldHelp = "Delete the speculative field or connect it to behavior that consumes its semantics. Mechanical forwarding into another representation is not a read and instead indicates parallel concepts."

func unusedFieldMessage(entryName string, fieldName string) rule.RuleMessage {
	return rule.RuleMessage{
		Id:          "unusedField",
		Description: entryName + "." + fieldName + " is constructed but never independently read.",
		Help:        unusedFieldHelp,
	}
}

func walk(node *ast.Node, visit func(*ast.Node)) {
	visit(node)
	for child := range node.IterChildren() {
		walk(child, visit)
	}
}

func sourceFileOf(node *ast.Node) *ast.SourceFile {
	for current := node; current != nil; current = current.Parent {
		if current.Kind == ast.KindSourceFile {
			return current.AsSourceFile()
		}
	}
	return nil
}

func isDeclarationName(node *ast.Node, symbol *ast.Symbol) bool {
	for _, declaration := range symbol.Declarations {
		if ast.GetNameOfDeclaration(declaration) == node {
			return true
		}
	}
	return false
}

func isMechanicalForwarding(node *ast.Node) bool {
	accessNode := node.Parent
	if accessNode == nil || !ast.IsPropertyAccessExpression(accessNode) || accessNode.Name() != node {
		return false
	}

	assignmentNode := accessNode.Parent
	if assignmentNode == nil || !ast.IsPropertyAssignment(assignmentNode) {
		return false
	}

	assignment := assignmentNode.AsPropertyAssignment()
	assignmentName := assignmentNode.Name()
	return assignment.Initializer == accessNode && assignmentName != nil && ast.IsIdentifier(assignmentName) && assignmentName.Text() == node.Text()
}

func canonicalSymbol(ctx rule.RuleContext, symbol *ast.Symbol) *ast.Symbol {
	if symbol != nil && symbol.Flags&ast.SymbolFlagsAlias != 0 {
		return ctx.TypeChecker.GetAliasedSymbol(symbol)
	}
	return symbol
}

func isInsideExportedFunction(node *ast.Node) bool {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsFunctionDeclaration(current) {
			return current.ModifierFlags()&ast.ModifierFlagsExport != 0
		}
		if ast.IsMethodDeclaration(current) {
			return false
		}
		if ast.IsVariableDeclaration(current) {
			for container := current.Parent; container != nil; container = container.Parent {
				if ast.IsVariableStatement(container) {
					return container.ModifierFlags()&ast.ModifierFlagsExport != 0
				}
				if ast.IsFunctionLike(container) {
					return false
				}
			}
		}
	}
	return false
}

func collectReads(ctx rule.RuleContext) (map[*ast.Symbol]struct{}, map[string]struct{}, map[*ast.Symbol]struct{}) {
	readSymbols := make(map[*ast.Symbol]struct{})
	readFieldNames := make(map[string]struct{})
	usedByExportedFunction := make(map[*ast.Symbol]struct{})

	for _, sourceFile := range ctx.Program.SourceFiles() {
		if sourceFile.IsDeclarationFile {
			continue
		}

		walk(sourceFile.AsNode(), func(node *ast.Node) {
			if ast.IsIdentifier(node) {
				symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
				if symbol != nil && !isDeclarationName(node, symbol) {
					if !isMechanicalForwarding(node) {
						readSymbols[symbol] = struct{}{}
					}
					if isInsideExportedFunction(node) {
						usedByExportedFunction[canonicalSymbol(ctx, symbol)] = struct{}{}
					}
				}
			}

			if !ast.IsCallExpression(node) {
				return
			}

			call := node.AsCallExpression()
			if call.Arguments == nil || len(call.Arguments.Nodes) == 0 || !ast.IsStringLiteralLike(call.Arguments.Nodes[0]) {
				return
			}
			if !ast.IsPropertyAccessExpression(call.Expression) {
				return
			}

			access := call.Expression.AsPropertyAccessExpression()
			if !ast.IsIdentifier(access.Expression) || access.Expression.Text() != "Struct" || access.Name().Text() != "get" {
				return
			}
			readFieldNames[call.Arguments.Nodes[0].Text()] = struct{}{}
		})
	}

	return readSymbols, readFieldNames, usedByExportedFunction
}

func isDomainField(symbol *ast.Symbol) bool {
	name := symbol.Name
	if strings.HasPrefix(name, "__") || strings.HasPrefix(name, "~effect/") {
		return false
	}
	if name == "pipe" || name == "toJSON" || name == "toString" || name == "[TypeId]" {
		return false
	}
	for _, declaration := range symbol.Declarations {
		if ast.IsMethodDeclaration(declaration) || ast.IsMethodSignatureDeclaration(declaration) || ast.IsGetAccessorDeclaration(declaration) || ast.IsSetAccessorDeclaration(declaration) {
			return false
		}
	}
	return true
}

func fieldTarget(symbol *ast.Symbol, sourceFile *ast.SourceFile) *ast.Node {
	for _, declaration := range symbol.Declarations {
		if sourceFileOf(declaration) == sourceFile {
			return declaration
		}
	}
	return nil
}

func stableFieldName(sourceFile *ast.SourceFile, field *ast.Symbol, declaration *ast.Node) string {
	nameNode := declaration.Name()
	if nameNode == nil {
		return field.Name
	}
	if name, ok := ast.TryGetTextOfPropertyName(nameNode); ok {
		return name
	}
	if !ast.IsComputedPropertyName(nameNode) || nameNode.Expression() == nil {
		return field.Name
	}
	expression := nameNode.Expression()
	start, end := expression.Pos(), expression.End()
	text := sourceFile.Text()
	if start < 0 || end < start || end > len(text) {
		return field.Name
	}
	if name := strings.TrimSpace(text[start:end]); name != "" {
		return name
	}
	return field.Name
}

func reportUnusedFields(ctx rule.RuleContext, declaration *ast.Node, readSymbols map[*ast.Symbol]struct{}, readFieldNames map[string]struct{}, usedByExportedFunction map[*ast.Symbol]struct{}) {
	nameNode := declaration.Name()
	if nameNode == nil || !ast.IsIdentifier(nameNode) {
		return
	}

	if declaration.ModifierFlags()&ast.ModifierFlagsExport != 0 {
		entrySymbol := canonicalSymbol(ctx, ctx.TypeChecker.GetSymbolAtLocation(nameNode))
		if _, boundary := usedByExportedFunction[entrySymbol]; boundary {
			return
		}
	}

	typeAtName := ctx.TypeChecker.GetTypeAtLocation(nameNode)
	for _, field := range ctx.TypeChecker.GetPropertiesOfType(typeAtName) {
		if !isDomainField(field) {
			continue
		}
		if _, ok := readSymbols[field]; ok {
			continue
		}
		if _, ok := readFieldNames[field.Name]; ok {
			continue
		}

		target := fieldTarget(field, ctx.SourceFile)
		if target == nil {
			continue
		}
		ctx.ReportNode(target, unusedFieldMessage(nameNode.Text(), stableFieldName(ctx.SourceFile, field, target)))
	}
}

var UnusedFieldRule = rule.Rule{
	Name: "unused-field",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		readSymbols, readFieldNames, usedByExportedFunction := collectReads(ctx)
		report := func(node *ast.Node) {
			reportUnusedFields(ctx, node, readSymbols, readFieldNames, usedByExportedFunction)
		}

		return rule.RuleListeners{
			ast.KindInterfaceDeclaration: report,
			ast.KindTypeAliasDeclaration: func(node *ast.Node) {
				typeNode := node.AsTypeAliasDeclaration().Type
				if typeNode.Kind == ast.KindFunctionType || typeNode.Kind == ast.KindConstructorType || typeNode.Kind == ast.KindUnionType {
					return
				}
				report(node)
			},
		}
	},
}
