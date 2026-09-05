package http_response_validation

import (
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
)

var message = rule.RuleMessage{
	Id:          "http-response-validation",
	Description: "Decode unknown HTTP response data with Schema at the adapter boundary.",
	Help:        "Apply Schema.decodeUnknownEffect or an HttpClient response schema decoder.",
}

var Rule = rule.Rule{Name: "http-response-validation", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	values := map[*ast.Symbol]*ast.Node{}
	reported := map[*ast.Node]bool{}
	source := func(node *ast.Node) *ast.Node { return responseSource(ctx, values, node) }
	report := func(node *ast.Node) {
		if node != nil && !reported[node] {
			reported[node] = true
			ctx.ReportNode(node, message)
		}
	}
	return rule.RuleListeners{
		ast.KindBinaryExpression: func(node *ast.Node) {
			if ast.IsAssignmentExpression(node, false) && ast.IsIdentifier(unwrap(node.AsBinaryExpression().Left)) {
				delete(values, utils.ResolvedSymbol(ctx.TypeChecker, unwrap(node.AsBinaryExpression().Left)))
			}
		},
		ast.KindVariableDeclaration: func(node *ast.Node) {
			declaration := node.AsVariableDeclaration()
			if declaration.Initializer == nil || !ast.IsIdentifier(declaration.Name()) {
				return
			}
			body := source(declaration.Initializer)
			if body == nil {
				return
			}
			if symbol := utils.ResolvedSymbol(ctx.TypeChecker, declaration.Name()); symbol != nil {
				values[symbol] = body
			}
			if isDomainType(ctx, declaration.Type) {
				report(body)
			}
		},
		ast.KindAsExpression: func(node *ast.Node) {
			if isDomainType(ctx, node.Type()) {
				report(source(node.AsAsExpression().Expression))
			}
		},
		ast.KindTypeAssertionExpression: func(node *ast.Node) {
			if isDomainType(ctx, node.Type()) {
				report(source(node.AsTypeAssertion().Expression))
			}
		},
		ast.KindReturnStatement: func(node *ast.Node) {
			expression := node.AsReturnStatement().Expression
			function := enclosingFunction(node)
			if expression != nil && function != nil && isDomainType(ctx, function.Type()) {
				report(source(expression))
			}
		},
	}
}}

func responseSource(ctx rule.RuleContext, values map[*ast.Symbol]*ast.Node, node *ast.Node) *ast.Node {
	node = unwrap(node)
	if node == nil {
		return nil
	}
	switch node.Kind {
	case ast.KindAwaitExpression:
		return responseSource(ctx, values, node.AsAwaitExpression().Expression)
	case ast.KindYieldExpression:
		return responseSource(ctx, values, node.AsYieldExpression().Expression)
	case ast.KindIdentifier:
		return values[utils.ResolvedSymbol(ctx.TypeChecker, node)]
	case ast.KindCallExpression:
		if isWebResponseJSON(ctx, node.AsCallExpression()) {
			return node
		}
	case ast.KindPropertyAccessExpression:
		if isEffectResponseJSON(ctx, node.AsPropertyAccessExpression()) {
			return node
		}
	}
	return nil
}

func isWebResponseJSON(ctx rule.RuleContext, call *ast.CallExpression) bool {
	if call == nil {
		return false
	}
	callee := unwrap(call.Expression)
	if !ast.IsPropertyAccessExpression(callee) {
		return false
	}
	access := callee.AsPropertyAccessExpression()
	return access.Name().Text() == "json" && isBuiltinType(ctx, access.Expression, "Response")
}

func isEffectResponseJSON(ctx rule.RuleContext, access *ast.PropertyAccessExpression) bool {
	return access != nil && access.Name().Text() == "json" && isEffectResponseType(ctx, access.Expression)
}

func isEffectResponseType(ctx rule.RuleContext, node *ast.Node) bool {
	symbol := checker.Type_symbol(ctx.TypeChecker.GetTypeAtLocation(unwrap(node)))
	if symbol != nil && symbol.Flags&ast.SymbolFlagsAlias != 0 {
		symbol = ctx.TypeChecker.GetAliasedSymbol(symbol)
	}
	if symbol == nil || symbol.Name != "HttpClientResponse" {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := strings.ReplaceAll(file.FileName(), "\\", "/")
		base := filepath.Base(path)
		if (base == "HttpClientResponse.ts" || base == "HttpClientResponse.d.ts") &&
			(strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/")) {
			return true
		}
	}
	return false
}

func isBuiltinType(ctx rule.RuleContext, node *ast.Node, name string) bool {
	symbol := checker.Type_symbol(ctx.TypeChecker.GetTypeAtLocation(unwrap(node)))
	if symbol != nil && symbol.Flags&ast.SymbolFlagsAlias != 0 {
		symbol = ctx.TypeChecker.GetAliasedSymbol(symbol)
	}
	if (symbol == nil || symbol.Name != name) && name == "JSON" {
		symbol = utils.ResolvedSymbol(ctx.TypeChecker, unwrap(node))
	}
	if symbol == nil || symbol.Name != name {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		base := filepath.Base(strings.ReplaceAll(file.FileName(), "\\", "/"))
		if strings.HasPrefix(base, "lib.") && strings.HasSuffix(base, ".d.ts") {
			return true
		}
	}
	return false
}

func isDomainType(ctx rule.RuleContext, node *ast.Node) bool {
	return node != nil && !isRawRepresentationType(ctx, node)
}

func isRawRepresentationType(ctx rule.RuleContext, node *ast.Node) bool {
	if node == nil {
		return true
	}
	value := ctx.TypeChecker.GetTypeAtLocation(node)
	if isRawValue(value) {
		return true
	}
	symbol := checker.Type_symbol(value)
	if symbol == nil || (symbol.Name != "Promise" && symbol.Name != "Effect") {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := filepath.ToSlash(file.FileName())
		base := filepath.Base(path)
		builtinPromise := symbol.Name == "Promise" && strings.HasPrefix(base, "lib.") && strings.HasSuffix(base, ".d.ts")
		effect := symbol.Name == "Effect" && (base == "Effect.ts" || base == "Effect.d.ts") && (strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/"))
		if builtinPromise || effect {
			arguments := checker.Checker_getTypeArguments(ctx.TypeChecker, value)
			return len(arguments) > 0 && isRawValue(arguments[0])
		}
	}
	return false
}

func isRawValue(value *checker.Type) bool {
	if value == nil || utils.IsTypeFlagSet(value, checker.TypeFlagsAny|checker.TypeFlagsUnknown) {
		return true
	}
	alias := checker.Type_alias(value)
	return alias != nil && alias.Symbol() != nil && alias.Symbol().Name == "Json" && utils.IsEffectSchemaSymbol(alias.Symbol())
}

func unwrap(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindSatisfiesExpression, ast.KindTypeAssertionExpression, ast.KindNonNullExpression:
			node = node.Expression()
		default:
			return node
		}
	}
	return nil
}

func enclosingFunction(node *ast.Node) *ast.Node {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsFunctionLike(current) {
			return current
		}
	}
	return nil
}
