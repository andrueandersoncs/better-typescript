package cache_preference

import (
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
)

var message = rule.RuleMessage{
	Id:          "cache-preference",
	Description: "Prefer Effect Cache for a hand-rolled value-cache protocol when its lifecycle fits.",
	Help:        "Use Cache.make or Cache.makeWith after choosing key equality, ownership, failure, and retention semantics.",
}

type cacheKey struct {
	symbol *ast.Symbol
	kind   ast.Kind
	text   string
}

type ttlComparison struct {
	property string
	node     *ast.Node
}

type cachedGet struct {
	key         cacheKey
	result      *ast.Symbol
	owner       *ast.Node
	hit         bool
	comparisons []ttlComparison
	deleted     map[string]bool
}

type ttlSet struct {
	key      cacheKey
	property string
}

type valueMap struct {
	node           *ast.Node
	gets           []*cachedGet
	ttlSets        []ttlSet
	candidateOwner *ast.Node
	reported       bool
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

func owner(node *ast.Node) *ast.Node {
	for current := node; current != nil; current = current.Parent {
		if ast.IsFunctionLike(current) {
			return current
		}
	}
	return nil
}

func nativeMap(ctx rule.RuleContext, node *ast.Node, mapSymbol *ast.Symbol) bool {
	node = unwrap(node)
	return node != nil && ast.IsNewExpression(node) && ast.IsIdentifier(node.AsNewExpression().Expression) &&
		ctx.TypeChecker.GetSymbolAtLocation(node.AsNewExpression().Expression) == mapSymbol
}

func keyFor(ctx rule.RuleContext, node *ast.Node) (cacheKey, bool) {
	node = unwrap(node)
	if ast.IsIdentifier(node) {
		symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
		return cacheKey{symbol: symbol}, symbol != nil
	}
	if ast.IsStringLiteralLike(node) || ast.IsNumericLiteral(node) {
		return cacheKey{kind: node.Kind, text: node.Text()}, true
	}
	return cacheKey{}, false
}

func sameKey(left, right cacheKey) bool {
	if left.symbol != nil || right.symbol != nil {
		return left.symbol != nil && left.symbol == right.symbol
	}
	return left.kind == right.kind && left.text != "" && left.text == right.text
}

func mapMethod(ctx rule.RuleContext, node *ast.Node, maps map[*ast.Symbol]*valueMap, name string) (*valueMap, cacheKey, []*ast.Node, bool) {
	call := node.AsCallExpression()
	callee := unwrap(call.Expression)
	if !ast.IsPropertyAccessExpression(callee) {
		return nil, cacheKey{}, nil, false
	}
	access := callee.AsPropertyAccessExpression()
	if access.Name() == nil || access.Name().Text() != name {
		return nil, cacheKey{}, nil, false
	}
	receiver := unwrap(access.Expression)
	if !ast.IsIdentifier(receiver) {
		return nil, cacheKey{}, nil, false
	}
	m := maps[ctx.TypeChecker.GetSymbolAtLocation(receiver)]
	if m == nil || len(call.Arguments.Nodes) == 0 {
		return nil, cacheKey{}, nil, false
	}
	key, ok := keyFor(ctx, call.Arguments.Nodes[0])
	if !ok {
		return nil, cacheKey{}, nil, false
	}
	return m, key, call.Arguments.Nodes, true
}

func isUndefined(ctx rule.RuleContext, node *ast.Node, undefinedSymbol *ast.Symbol) bool {
	node = unwrap(node)
	return ast.IsIdentifier(node) && node.Text() == "undefined" &&
		(undefinedSymbol == nil || ctx.TypeChecker.GetSymbolAtLocation(node) == undefinedSymbol)
}

func hitCondition(ctx rule.RuleContext, node *ast.Node, symbol, undefinedSymbol *ast.Symbol) bool {
	node = unwrap(node)
	if ast.IsIdentifier(node) {
		return ctx.TypeChecker.GetSymbolAtLocation(node) == symbol
	}
	if !ast.IsBinaryExpression(node) {
		return false
	}
	binary := node.AsBinaryExpression()
	if binary.OperatorToken.Kind != ast.KindExclamationEqualsEqualsToken && binary.OperatorToken.Kind != ast.KindExclamationEqualsToken {
		return false
	}
	left, right := unwrap(binary.Left), unwrap(binary.Right)
	return ast.IsIdentifier(left) && ctx.TypeChecker.GetSymbolAtLocation(left) == symbol && isUndefined(ctx, right, undefinedSymbol) ||
		ast.IsIdentifier(right) && ctx.TypeChecker.GetSymbolAtLocation(right) == symbol && isUndefined(ctx, left, undefinedSymbol)
}

func isThenBranch(node, statement *ast.Node) bool {
	return isDescendant(node, statement)
}

func markCacheHit(ctx rule.RuleContext, node *ast.Node, maps map[*ast.Symbol]*valueMap, undefinedSymbol *ast.Symbol) {
	value := unwrap(node.AsReturnStatement().Expression)
	if value == nil || !ast.IsIdentifier(value) {
		return
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(value)
	currentOwner := owner(node)
	for current := node.Parent; current != nil; current = current.Parent {
		if !ast.IsIfStatement(current) || !isThenBranch(node, current.AsIfStatement().ThenStatement) || !hitCondition(ctx, current.AsIfStatement().Expression, symbol, undefinedSymbol) {
			continue
		}
		for _, m := range maps {
			for _, get := range m.gets {
				if get.result == symbol && get.owner == currentOwner {
					get.hit = true
				}
			}
		}
		return
	}
}

func typeSymbol(ctx rule.RuleContext, node *ast.Node) *ast.Symbol {
	typ := ctx.TypeChecker.GetTypeAtLocation(node)
	if typ == nil {
		return nil
	}
	symbol := checker.Type_symbol(typ)
	if alias := checker.Type_alias(typ); alias != nil && alias.Symbol() != nil {
		symbol = alias.Symbol()
	}
	return symbol
}

func promiseValue(ctx rule.RuleContext, node *ast.Node, promiseSymbol *ast.Symbol) bool {
	return promiseSymbol != nil && typeSymbol(ctx, node) == promiseSymbol
}

func effectValue(ctx rule.RuleContext, node *ast.Node) bool {
	symbol := typeSymbol(ctx, node)
	if symbol == nil || symbol.Name != "Effect" {
		return false
	}
	for _, declaration := range symbol.Declarations {
		source := ast.GetSourceFileOfNode(declaration)
		if source == nil {
			continue
		}
		path := strings.ReplaceAll(source.FileName(), "\\", "/")
		base := filepath.Base(path)
		if (base == "Effect.ts" || base == "Effect.d.ts") &&
			(strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/")) {
			return true
		}
	}
	return false
}

func dependsOnKey(ctx rule.RuleContext, node *ast.Node, key cacheKey) bool {
	node = unwrap(node)
	if node == nil {
		return false
	}
	candidate, ok := keyFor(ctx, node)
	if ok && sameKey(candidate, key) {
		return true
	}
	if ast.IsCallExpression(node) {
		call := node.AsCallExpression()
		callee := unwrap(call.Expression)
		if ast.IsPropertyAccessExpression(callee) && dependsOnKey(ctx, callee.AsPropertyAccessExpression().Expression, key) {
			return true
		}
		for _, argument := range call.Arguments.Nodes {
			if dependsOnKey(ctx, argument, key) {
				return true
			}
		}
	}
	if ast.IsBinaryExpression(node) {
		binary := node.AsBinaryExpression()
		return dependsOnKey(ctx, binary.Left, key) || dependsOnKey(ctx, binary.Right, key)
	}
	return false
}

func computingValue(ctx rule.RuleContext, node *ast.Node, key cacheKey) bool {
	node = unwrap(node)
	if ast.IsIdentifier(node) {
		symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
		if symbol == nil || len(symbol.Declarations) != 1 || !ast.IsVariableDeclaration(symbol.Declarations[0]) {
			return false
		}
		node = unwrap(symbol.Declarations[0].AsVariableDeclaration().Initializer)
	}
	return dependsOnKey(ctx, node, key)
}

func dateNow(ctx rule.RuleContext, node *ast.Node) bool {
	node = unwrap(node)
	if !ast.IsCallExpression(node) {
		return false
	}
	callee := unwrap(node.AsCallExpression().Expression)
	if !ast.IsPropertyAccessExpression(callee) {
		return false
	}
	name := callee.AsPropertyAccessExpression().Name()
	if name == nil || name.Text() != "now" {
		return false
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, name)
	if symbol == nil || symbol.Name != "now" {
		return false
	}
	for _, declaration := range symbol.Declarations {
		source := ast.GetSourceFileOfNode(declaration)
		if source == nil {
			continue
		}
		base := filepath.Base(strings.ReplaceAll(source.FileName(), "\\", "/"))
		if strings.HasPrefix(base, "lib.") && strings.HasSuffix(base, ".d.ts") {
			return true
		}
	}
	return false
}

func clockExpression(ctx rule.RuleContext, node *ast.Node) bool {
	node = unwrap(node)
	if dateNow(ctx, node) {
		return true
	}
	if !ast.IsBinaryExpression(node) {
		return false
	}
	binary := node.AsBinaryExpression()
	return dateNow(ctx, binary.Left) || dateNow(ctx, binary.Right)
}

func entryProperty(ctx rule.RuleContext, node *ast.Node) (*ast.Symbol, string, bool) {
	node = unwrap(node)
	if !ast.IsPropertyAccessExpression(node) {
		return nil, "", false
	}
	access := node.AsPropertyAccessExpression()
	receiver := unwrap(access.Expression)
	if access.Name() == nil || !ast.IsIdentifier(receiver) {
		return nil, "", false
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(receiver)
	return symbol, access.Name().Text(), symbol != nil
}

func isDescendant(node, parent *ast.Node) bool {
	for current := node; current != nil; current = current.Parent {
		if current == parent {
			return true
		}
	}
	return false
}

func ttlProtocol(m *valueMap) bool {
	for _, get := range m.gets {
		for property := range get.deleted {
			for _, set := range m.ttlSets {
				if sameKey(get.key, set.key) && property == set.property {
					return true
				}
			}
		}
	}
	return false
}

var Rule = rule.Rule{Name: "cache-preference", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	mapSymbol := ctx.TypeChecker.ResolveName("Map", nil, ast.SymbolFlagsValue, false)
	promiseSymbol := ctx.TypeChecker.ResolveName("Promise", nil, ast.SymbolFlagsType, false)
	undefinedSymbol := ctx.TypeChecker.ResolveName("undefined", nil, ast.SymbolFlagsValue, false)
	maps := map[*ast.Symbol]*valueMap{}
	return rule.RuleListeners{
		ast.KindVariableDeclaration: func(node *ast.Node) {
			declaration := node.AsVariableDeclaration()
			if ast.IsIdentifier(declaration.Name()) && nativeMap(ctx, declaration.Initializer, mapSymbol) {
				maps[ctx.TypeChecker.GetSymbolAtLocation(declaration.Name())] = &valueMap{node: unwrap(declaration.Initializer)}
			}
		},
		ast.KindCallExpression: func(node *ast.Node) {
			if m, key, _, ok := mapMethod(ctx, node, maps, "get"); ok {
				if parent := node.Parent; parent != nil && ast.IsVariableDeclaration(parent) && ast.IsIdentifier(parent.AsVariableDeclaration().Name()) {
					m.gets = append(m.gets, &cachedGet{key: key, result: ctx.TypeChecker.GetSymbolAtLocation(parent.AsVariableDeclaration().Name()), owner: owner(node)})
				}
				return
			}
			if m, key, arguments, ok := mapMethod(ctx, node, maps, "set"); ok && len(arguments) >= 2 {
				value := unwrap(arguments[1])
				if ast.IsObjectLiteralExpression(value) {
					for _, property := range value.AsObjectLiteralExpression().Properties.Nodes {
						if ast.IsPropertyAssignment(property) {
							if name, ok := ast.TryGetTextOfPropertyName(property.Name()); ok && clockExpression(ctx, property.AsPropertyAssignment().Initializer) {
								m.ttlSets = append(m.ttlSets, ttlSet{key: key, property: name})
							}
						}
					}
				}
				if !m.reported && !promiseValue(ctx, arguments[1], promiseSymbol) && !effectValue(ctx, arguments[1]) && computingValue(ctx, arguments[1], key) {
					for _, get := range m.gets {
						if get.hit && get.owner == owner(node) && sameKey(get.key, key) {
							m.candidateOwner = get.owner
							return
						}
					}
				}
				return
			}
			m, key, _, ok := mapMethod(ctx, node, maps, "delete")
			if !ok {
				return
			}
			for current := node.Parent; current != nil; current = current.Parent {
				if !ast.IsIfStatement(current) || !isDescendant(node, current.AsIfStatement().ThenStatement) {
					continue
				}
				for _, get := range m.gets {
					for _, comparison := range get.comparisons {
						if sameKey(get.key, key) && isDescendant(comparison.node, current.AsIfStatement().Expression) {
							if get.deleted == nil {
								get.deleted = map[string]bool{}
							}
							get.deleted[comparison.property] = true
						}
					}
				}
				return
			}
		},
		ast.KindBinaryExpression: func(node *ast.Node) {
			binary := node.AsBinaryExpression()
			var entry *ast.Node
			if dateNow(ctx, binary.Left) {
				entry = binary.Right
			} else if dateNow(ctx, binary.Right) {
				entry = binary.Left
			} else {
				return
			}
			symbol, property, ok := entryProperty(ctx, entry)
			if !ok {
				return
			}
			for _, m := range maps {
				for _, get := range m.gets {
					if get.result == symbol {
						get.comparisons = append(get.comparisons, ttlComparison{property: property, node: node})
					}
				}
			}
		},
		ast.KindReturnStatement: func(node *ast.Node) {
			markCacheHit(ctx, node, maps, undefinedSymbol)
		},
		rule.ListenerOnExit(ast.KindBlock): func(node *ast.Node) {
			for _, m := range maps {
				if !m.reported && m.candidateOwner != nil && m.candidateOwner.Body() == node && !ttlProtocol(m) {
					m.reported = true
					ctx.ReportNode(m.node, message)
				}
			}
		},
	}
}}
