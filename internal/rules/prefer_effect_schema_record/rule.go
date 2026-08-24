package prefer_effect_schema_record

import (
	"fmt"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"path/filepath"
)

var Rule = rule.Rule{Name: "prefer-effect-schema-record", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	constructed := constructionIndex(ctx)
	tuple := func(node *ast.Node) bool {
		if !ast.IsTypeAliasDeclaration(node) {
			return false
		}
		return tupleType(node.AsTypeAliasDeclaration().Type)
	}
	object := func(node *ast.Node) {
		name := node.Name()
		if name == nil {
			return
		}
		symbol := ctx.TypeChecker.GetSymbolAtLocation(name)
		file, ok := constructed[symbol]
		if !ok {
			return
		}
		typeName := name.AsIdentifier().Text
		kindLabel := "an interface"
		if ast.IsTypeAliasDeclaration(node) {
			kindLabel = "a type alias"
		}
		relative, err := filepath.Rel(ctx.Program.GetCurrentDirectory(), file)
		if err != nil {
			relative = file
		}
		ctx.ReportNode(name, rule.RuleMessage{Id: "prefer-effect-schema-record", Description: fmt.Sprintf("Avoid declaring %s as %s when this project constructs its values.", typeName, kindLabel), Help: fmt.Sprintf("Object literals of this shape are built in %s, so %s is a data scan rather than a boundary type. Define it as an Effect schema record — export const %s = Schema.Struct({ ... }); export interface %s extends Schema.Schema.Type<typeof %s> {}. Construct trusted values with %s.make({ ... }) and decode unknown input at the boundary. Use Schema.TaggedErrorClass only for typed errors; keep process-bound runtime values as boundary types or explicit runtime data.", relative, typeName, typeName, typeName, typeName, typeName)})
	}
	typeAlias := func(node *ast.Node) {
		if tuple(node) {
			name := node.Name()
			typeName := name.AsIdentifier().Text
			ctx.ReportNode(name, rule.RuleMessage{Id: "prefer-effect-schema-record", Description: fmt.Sprintf("Avoid declaring %s as a tuple type alias.", typeName), Help: "Replace a constructed tuple alias with a named Effect schema record, for example export const Example = Schema.Struct({ myString: Schema.String, myNumber: Schema.Number }); export interface Example extends Schema.Schema.Type<typeof Example> {}. Keep a tuple only when its positions are inherently meaningful; process-bound runtime values remain boundary types or explicit runtime data."})
			return
		}
		if ast.IsTypeLiteralNode(node.AsTypeAliasDeclaration().Type) {
			object(node)
		}
	}
	return rule.RuleListeners{ast.KindInterfaceDeclaration: object, ast.KindTypeAliasDeclaration: typeAlias}
}}

func tupleType(n *ast.Node) bool {
	for n != nil {
		if ast.IsTupleTypeNode(n) {
			return true
		}
		if ast.IsParenthesizedTypeNode(n) {
			n = n.AsParenthesizedTypeNode().Type
			continue
		}
		if ast.IsTypeOperatorNode(n) && n.AsTypeOperatorNode().Operator == ast.KindReadonlyKeyword {
			n = n.AsTypeOperatorNode().Type
			continue
		}
		return false
	}
	return false
}
func constructionIndex(ctx rule.RuleContext) map[*ast.Symbol]string {
	index := map[*ast.Symbol]string{}
	for _, file := range ctx.Program.SourceFiles() {
		if filepath.Ext(file.FileName()) != ".ts" || stringsContainsNodeModules(file.FileName()) {
			continue
		}
		walk(file.AsNode(), func(n *ast.Node) {
			if !ast.IsObjectLiteralExpression(n) {
				return
			}
			typ := ctx.TypeChecker.GetContextualType(n, checker.ContextFlagsNone)
			if typ == nil {
				return
			}
			for _, candidate := range typeParts(typ) {
				symbol := checker.Type_symbol(candidate)
				if symbol != nil {
					if _, exists := index[symbol]; !exists {
						index[symbol] = file.FileName()
					}
				}
			}
		})
	}
	return index
}
func typeParts(t *checker.Type) []*checker.Type {
	if t != nil && checker.Type_flags(t)&(checker.TypeFlagsUnion|checker.TypeFlagsIntersection) != 0 {
		return t.Types()
	}
	return []*checker.Type{t}
}
func stringsContainsNodeModules(s string) bool {
	for i := 0; i+13 <= len(s); i++ {
		if s[i:i+13] == "/node_modules" {
			return true
		}
	}
	return false
}
func walk(n *ast.Node, visit func(*ast.Node)) {
	visit(n)
	for child := range n.IterChildren() {
		walk(child, visit)
	}
}

var PreferEffectSchemaRecordRule = Rule
