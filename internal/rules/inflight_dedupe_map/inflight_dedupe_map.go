package inflight_dedupe_map

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
)

var message = rule.RuleMessage{
	Id:          "inflightDedupeMap",
	Description: "Avoid a hand-rolled in-flight Promise Map when Effect Cache fits.",
	Help:        "Cache.get shares a missing-key lookup; choose its cancellation and failure-retention semantics deliberately.",
}

type dedupeKey struct {
	symbol *ast.Symbol
	kind   ast.Kind
	text   string
}

type pendingGet struct {
	key    dedupeKey
	result *ast.Symbol
	owner  *ast.Node
	hit    bool
}

type pendingMap struct {
	node     *ast.Node
	gets     []*pendingGet
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

func keyFor(ctx rule.RuleContext, node *ast.Node) (dedupeKey, bool) {
	node = unwrap(node)
	if ast.IsIdentifier(node) {
		symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
		return dedupeKey{symbol: symbol}, symbol != nil
	}
	if ast.IsStringLiteralLike(node) || ast.IsNumericLiteral(node) {
		return dedupeKey{kind: node.Kind, text: node.Text()}, true
	}
	return dedupeKey{}, false
}

func sameKey(left, right dedupeKey) bool {
	if left.symbol != nil || right.symbol != nil {
		return left.symbol != nil && left.symbol == right.symbol
	}
	return left.kind == right.kind && left.text != "" && left.text == right.text
}

func mapMethod(ctx rule.RuleContext, node *ast.Node, maps map[*ast.Symbol]*pendingMap, name string) (*pendingMap, dedupeKey, []*ast.Node, bool) {
	call := node.AsCallExpression()
	callee := unwrap(call.Expression)
	if !ast.IsPropertyAccessExpression(callee) {
		return nil, dedupeKey{}, nil, false
	}
	access := callee.AsPropertyAccessExpression()
	if access.Name() == nil || access.Name().Text() != name {
		return nil, dedupeKey{}, nil, false
	}
	receiver := unwrap(access.Expression)
	if !ast.IsIdentifier(receiver) {
		return nil, dedupeKey{}, nil, false
	}
	m := maps[ctx.TypeChecker.GetSymbolAtLocation(receiver)]
	if m == nil || len(call.Arguments.Nodes) == 0 {
		return nil, dedupeKey{}, nil, false
	}
	key, ok := keyFor(ctx, call.Arguments.Nodes[0])
	if !ok {
		return nil, dedupeKey{}, nil, false
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

func isDescendant(node, parent *ast.Node) bool {
	for current := node; current != nil; current = current.Parent {
		if current == parent {
			return true
		}
	}
	return false
}

func markGetOrStart(ctx rule.RuleContext, node *ast.Node, maps map[*ast.Symbol]*pendingMap, undefinedSymbol *ast.Symbol) {
	value := unwrap(node.AsReturnStatement().Expression)
	if value == nil || !ast.IsIdentifier(value) {
		return
	}
	symbol := ctx.TypeChecker.GetSymbolAtLocation(value)
	currentOwner := owner(node)
	for current := node.Parent; current != nil; current = current.Parent {
		if !ast.IsIfStatement(current) || !isDescendant(node, current.AsIfStatement().ThenStatement) || !hitCondition(ctx, current.AsIfStatement().Expression, symbol, undefinedSymbol) {
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

func promiseValue(ctx rule.RuleContext, node *ast.Node, promiseSymbol *ast.Symbol) bool {
	typ := ctx.TypeChecker.GetTypeAtLocation(node)
	if typ == nil {
		return false
	}
	symbol := checker.Type_symbol(typ)
	if alias := checker.Type_alias(typ); alias != nil && alias.Symbol() != nil {
		symbol = alias.Symbol()
	}
	return symbol != nil && symbol == promiseSymbol
}

var InflightDedupeMapRule = rule.Rule{
	Name: "inflight-dedupe-map",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		mapSymbol := ctx.TypeChecker.ResolveName("Map", nil, ast.SymbolFlagsValue, false)
		promiseSymbol := ctx.TypeChecker.ResolveName("Promise", nil, ast.SymbolFlagsType, false)
		undefinedSymbol := ctx.TypeChecker.ResolveName("undefined", nil, ast.SymbolFlagsValue, false)
		maps := map[*ast.Symbol]*pendingMap{}
		return rule.RuleListeners{
			ast.KindVariableDeclaration: func(node *ast.Node) {
				declaration := node.AsVariableDeclaration()
				if ast.IsIdentifier(declaration.Name()) && nativeMap(ctx, declaration.Initializer, mapSymbol) {
					maps[ctx.TypeChecker.GetSymbolAtLocation(declaration.Name())] = &pendingMap{node: unwrap(declaration.Initializer)}
				}
			},
			ast.KindCallExpression: func(node *ast.Node) {
				if m, key, _, ok := mapMethod(ctx, node, maps, "get"); ok {
					if parent := node.Parent; parent != nil && ast.IsVariableDeclaration(parent) && ast.IsIdentifier(parent.AsVariableDeclaration().Name()) {
						m.gets = append(m.gets, &pendingGet{key: key, result: ctx.TypeChecker.GetSymbolAtLocation(parent.AsVariableDeclaration().Name()), owner: owner(node)})
					}
					return
				}
				m, key, arguments, ok := mapMethod(ctx, node, maps, "set")
				if !ok || len(arguments) < 2 || m.reported || !promiseValue(ctx, arguments[1], promiseSymbol) {
					return
				}
				for _, get := range m.gets {
					if get.hit && get.owner == owner(node) && sameKey(get.key, key) {
						m.reported = true
						ctx.ReportNode(m.node, message)
						return
					}
				}
			},
			ast.KindReturnStatement: func(node *ast.Node) {
				markGetOrStart(ctx, node, maps, undefinedSymbol)
			},
		}
	},
}

var Rule = InflightDedupeMapRule
