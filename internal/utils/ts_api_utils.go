package utils

import (
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
)

func UnionTypeParts(t *checker.Type) []*checker.Type {
	if IsUnionType(t) {
		return t.Types()
	}
	return []*checker.Type{t}
}

func IntersectionTypeParts(t *checker.Type) []*checker.Type {
	if IsIntersectionType(t) {
		return t.Types()
	}
	return []*checker.Type{t}
}

func IsTypeFlagSet(t *checker.Type, flags checker.TypeFlags) bool {
	return t != nil && checker.Type_flags(t)&flags != 0
}

func IsUnionType(t *checker.Type) bool {
	return IsTypeFlagSet(t, checker.TypeFlagsUnion)
}

func IsIntersectionType(t *checker.Type) bool {
	return IsTypeFlagSet(t, checker.TypeFlagsIntersection)
}

func GetCallSignatures(typeChecker *checker.Checker, t *checker.Type) []*checker.Signature {
	return checker.Checker_getSignaturesOfType(typeChecker, t, checker.SignatureKindCall)
}

func HasCallableProperty(typeChecker *checker.Checker, valueType *checker.Type, location *ast.Node) bool {
	if valueType == nil || location == nil {
		return false
	}
	for _, property := range typeChecker.GetPropertiesOfType(valueType) {
		propertyType := typeChecker.GetTypeOfSymbolAtLocation(property, location)
		if propertyType == nil {
			continue
		}
		propertyType = checker.Checker_GetNonNullableType(typeChecker, propertyType)
		for _, part := range UnionTypeParts(propertyType) {
			if len(GetCallSignatures(typeChecker, part)) > 0 {
				return true
			}
		}
	}
	return false
}

func ResolvedSymbol(typeChecker *checker.Checker, node *ast.Node) *ast.Symbol {
	symbol := typeChecker.GetSymbolAtLocation(node)
	if symbol != nil && symbol.Flags&ast.SymbolFlagsAlias != 0 {
		return typeChecker.GetAliasedSymbol(symbol)
	}
	return symbol
}

func IsEffectSchemaSymbol(symbol *ast.Symbol) bool {
	if symbol == nil || symbol.Flags&ast.SymbolFlagsAlias != 0 {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		name := strings.ReplaceAll(file.FileName(), "\\", "/")
		base := filepath.Base(name)
		if (base == "Schema.ts" || base == "Schema.d.ts") &&
			(strings.Contains(name, "/node_modules/effect/") || strings.Contains(name, "/packages/effect/src/")) {
			return true
		}
	}
	return false
}

func IsEffectSchemaSymbolAtLocation(typeChecker *checker.Checker, node *ast.Node) bool {
	return IsEffectSchemaSymbol(ResolvedSymbol(typeChecker, node))
}
