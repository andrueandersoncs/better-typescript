package handrolled_ttl_cache

import (
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "handrolled-ttl-cache",
	Description: "Avoid a hand-rolled TTL Map cache when Effect Cache fits.",
	Help:        "Use Cache.make or Cache.makeWith only after choosing absolute or idle expiry, failure retention, and cancellation semantics.",
}

type ttlKey struct {
	symbol *ast.Symbol
	kind   ast.Kind
	text   string
}

type ttlComparison struct {
	property string
	node     *ast.Node
}

type ttlGet struct {
	key         ttlKey
	result      *ast.Symbol
	comparisons []ttlComparison
	deleted     map[string]bool
}

type ttlSet struct {
	key      ttlKey
	property string
}

type ttlMap struct {
	node     *ast.Node
	gets     []*ttlGet
	sets     []ttlSet
	reported bool
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

func nativeMap(ctx rule.RuleContext, node *ast.Node, mapSymbol *ast.Symbol) bool {
	node = unwrap(node)
	return node != nil && ast.IsNewExpression(node) && ast.IsIdentifier(node.AsNewExpression().Expression) &&
		ctx.TypeChecker.GetSymbolAtLocation(node.AsNewExpression().Expression) == mapSymbol
}

func keyFor(ctx rule.RuleContext, node *ast.Node) (ttlKey, bool) {
	node = unwrap(node)
	if ast.IsIdentifier(node) {
		symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
		return ttlKey{symbol: symbol}, symbol != nil
	}
	if ast.IsStringLiteralLike(node) || ast.IsNumericLiteral(node) {
		return ttlKey{kind: node.Kind, text: node.Text()}, true
	}
	return ttlKey{}, false
}

func sameKey(left, right ttlKey) bool {
	if left.symbol != nil || right.symbol != nil {
		return left.symbol != nil && left.symbol == right.symbol
	}
	return left.kind == right.kind && left.text != "" && left.text == right.text
}

func mapMethod(ctx rule.RuleContext, node *ast.Node, maps map[*ast.Symbol]*ttlMap, name string) (*ttlMap, ttlKey, []*ast.Node, bool) {
	call := node.AsCallExpression()
	callee := unwrap(call.Expression)
	if !ast.IsPropertyAccessExpression(callee) {
		return nil, ttlKey{}, nil, false
	}
	access := callee.AsPropertyAccessExpression()
	if access.Name() == nil || access.Name().Text() != name {
		return nil, ttlKey{}, nil, false
	}
	receiver := unwrap(access.Expression)
	if !ast.IsIdentifier(receiver) {
		return nil, ttlKey{}, nil, false
	}
	m := maps[ctx.TypeChecker.GetSymbolAtLocation(receiver)]
	if m == nil || len(call.Arguments.Nodes) == 0 {
		return nil, ttlKey{}, nil, false
	}
	key, ok := keyFor(ctx, call.Arguments.Nodes[0])
	if !ok {
		return nil, ttlKey{}, nil, false
	}
	return m, key, call.Arguments.Nodes, true
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
	access := callee.AsPropertyAccessExpression()
	if access.Name() == nil || access.Name().Text() != "now" {
		return false
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, access.Name())
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

func reportTTL(ctx rule.RuleContext, m *ttlMap) {
	if m.reported {
		return
	}
	for _, get := range m.gets {
		for property := range get.deleted {
			for _, set := range m.sets {
				if sameKey(get.key, set.key) && property == set.property {
					m.reported = true
					ctx.ReportNode(m.node, message)
					return
				}
			}
		}
	}
}

var Rule = rule.Rule{Name: "handrolled-ttl-cache", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	mapSymbol := ctx.TypeChecker.ResolveName("Map", nil, ast.SymbolFlagsValue, false)
	maps := map[*ast.Symbol]*ttlMap{}
	return rule.RuleListeners{
		ast.KindVariableDeclaration: func(node *ast.Node) {
			declaration := node.AsVariableDeclaration()
			if ast.IsIdentifier(declaration.Name()) && nativeMap(ctx, declaration.Initializer, mapSymbol) {
				maps[ctx.TypeChecker.GetSymbolAtLocation(declaration.Name())] = &ttlMap{node: unwrap(declaration.Initializer)}
			}
		},
		ast.KindCallExpression: func(node *ast.Node) {
			if m, key, _, ok := mapMethod(ctx, node, maps, "get"); ok {
				if parent := node.Parent; parent != nil && ast.IsVariableDeclaration(parent) && ast.IsIdentifier(parent.AsVariableDeclaration().Name()) {
					m.gets = append(m.gets, &ttlGet{key: key, result: ctx.TypeChecker.GetSymbolAtLocation(parent.AsVariableDeclaration().Name())})
				}
				return
			}
			if m, key, arguments, ok := mapMethod(ctx, node, maps, "set"); ok && len(arguments) >= 2 {
				value := unwrap(arguments[1])
				if ast.IsObjectLiteralExpression(value) {
					for _, property := range value.AsObjectLiteralExpression().Properties.Nodes {
						if !ast.IsPropertyAssignment(property) {
							continue
						}
						name, ok := ast.TryGetTextOfPropertyName(property.Name())
						if ok && clockExpression(ctx, property.AsPropertyAssignment().Initializer) {
							m.sets = append(m.sets, ttlSet{key: key, property: name})
							reportTTL(ctx, m)
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
							reportTTL(ctx, m)
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
	}
}}
