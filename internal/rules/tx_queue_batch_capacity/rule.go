package tx_queue_batch_capacity

import (
	"strconv"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "tx-queue-batch-capacity",
	Description: "Do not offer a larger atomic batch than a bounded TxQueue can hold.",
	Help:        "Use a bounded TxQueue with capacity at least the batch size, or choose a queue and delivery protocol that permit incremental offers.",
}

type queueFact struct {
	capacity int
}

var Rule = rule.Rule{
	Name: "tx-queue-batch-capacity",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		facts := map[*ast.Symbol]queueFact{}
		return rule.RuleListeners{
			ast.KindVariableDeclaration: func(node *ast.Node) {
				binding, capacity, ok := boundedQueueBinding(ctx, node)
				if ok {
					symbol := utils.ResolvedSymbol(ctx.TypeChecker, binding)
					if symbol != nil {
						facts[symbol] = queueFact{capacity: capacity}
					}
					return
				}
				invalidateInitializerFact(ctx, node, facts)
			},
			ast.KindBinaryExpression: func(node *ast.Node) {
				if ast.IsAssignmentExpression(node, false) {
					invalidateFact(ctx, node.AsBinaryExpression().Left, facts)
				}
			},
			ast.KindReturnStatement: func(node *ast.Node) {
				invalidateFact(ctx, node.AsReturnStatement().Expression, facts)
			},
			ast.KindPropertyAssignment: func(node *ast.Node) {
				invalidateFact(ctx, node.AsPropertyAssignment().Initializer, facts)
			},
			ast.KindCallExpression: func(node *ast.Node) {
				call := node.AsCallExpression()
				batch, receiver, offered := offeredBatch(ctx, node)
				if offered {
					receiverSymbol := utils.ResolvedSymbol(ctx.TypeChecker, receiver)
					if receiverSymbol != nil {
						if fact, ok := facts[receiverSymbol]; ok && len(batch.AsArrayLiteralExpression().Elements.Nodes) > fact.capacity && !hasSpread(batch) {
							ctx.ReportNode(batch, message)
						}
					}
				}
				invalidateCallFacts(ctx, call, facts, offered)
			},
		}
	},
}

func boundedQueueBinding(ctx rule.RuleContext, node *ast.Node) (*ast.Node, int, bool) {
	declaration := node.AsVariableDeclaration()
	if node.Parent == nil || !ast.IsVariableDeclarationList(node.Parent) || node.Parent.Flags&ast.NodeFlagsConst == 0 || !ast.IsIdentifier(declaration.Name()) || declaration.Initializer == nil || !insideEffectGenerator(ctx, node) {
		return nil, 0, false
	}
	initializer := unwrap(declaration.Initializer)
	if !ast.IsYieldExpression(initializer) || initializer.AsYieldExpression().AsteriskToken == nil {
		return nil, 0, false
	}
	call := unwrap(initializer.AsYieldExpression().Expression)
	if !ast.IsCallExpression(call) || !txQueueMember(ctx, call.AsCallExpression().Expression, "bounded") {
		return nil, 0, false
	}
	arguments := call.AsCallExpression().Arguments
	if arguments == nil || len(arguments.Nodes) != 1 {
		return nil, 0, false
	}
	capacity, ok := nonnegativeInteger(arguments.Nodes[0])
	if !ok {
		return nil, 0, false
	}
	return declaration.Name(), capacity, true
}

func offeredBatch(ctx rule.RuleContext, node *ast.Node) (*ast.Node, *ast.Node, bool) {
	call := node.AsCallExpression()
	if !isDirectYield(node) || !txQueueMember(ctx, call.Expression, "offerAll") || call.Arguments == nil || len(call.Arguments.Nodes) != 2 {
		return nil, nil, false
	}
	receiver := unwrap(call.Arguments.Nodes[0])
	batch := unwrap(call.Arguments.Nodes[1])
	if !ast.IsIdentifier(receiver) || !ast.IsArrayLiteralExpression(batch) {
		return nil, nil, false
	}
	return batch, receiver, true
}

func isDirectYield(node *ast.Node) bool {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsYieldExpression(current) {
			yield := current.AsYieldExpression()
			return yield.AsteriskToken != nil && unwrap(yield.Expression) == node
		}
		if ast.IsExpressionStatement(current) || ast.IsFunctionLike(current) {
			return false
		}
	}
	return false
}

func invalidateInitializerFact(ctx rule.RuleContext, node *ast.Node, facts map[*ast.Symbol]queueFact) {
	initializer := node.AsVariableDeclaration().Initializer
	invalidateFact(ctx, initializer, facts)
}

func invalidateCallFacts(ctx rule.RuleContext, call *ast.CallExpression, facts map[*ast.Symbol]queueFact, offered bool) {
	if call.Arguments == nil {
		return
	}
	for index, argument := range call.Arguments.Nodes {
		if offered && index == 0 {
			continue
		}
		invalidateFact(ctx, argument, facts)
	}
}

func invalidateFact(ctx rule.RuleContext, node *ast.Node, facts map[*ast.Symbol]queueFact) {
	node = unwrap(node)
	if node == nil || !ast.IsIdentifier(node) {
		return
	}
	delete(facts, utils.ResolvedSymbol(ctx.TypeChecker, node))
}

func insideEffectGenerator(ctx rule.RuleContext, node *ast.Node) bool {
	for current := node.Parent; current != nil; current = current.Parent {
		if !ast.IsFunctionExpression(current) {
			continue
		}
		if current.BodyData().AsteriskToken == nil || current.Parent == nil || !ast.IsCallExpression(current.Parent) {
			return false
		}
		call := current.Parent.AsCallExpression()
		for _, argument := range call.Arguments.Nodes {
			if argument == current {
				return effectMember(ctx, call.Expression, "gen")
			}
		}
		return false
	}
	return false
}

func hasSpread(array *ast.Node) bool {
	for _, element := range array.AsArrayLiteralExpression().Elements.Nodes {
		if ast.IsSpreadElement(element) {
			return true
		}
	}
	return false
}

func nonnegativeInteger(node *ast.Node) (int, bool) {
	node = unwrap(node)
	if !ast.IsNumericLiteral(node) {
		return 0, false
	}
	text := strings.ReplaceAll(node.Text(), "_", "")
	if text == "" {
		return 0, false
	}
	for _, character := range text {
		if character < '0' || character > '9' {
			return 0, false
		}
	}
	value, err := strconv.ParseUint(text, 10, 0)
	if err != nil || value > uint64(^uint(0)>>1) {
		return 0, false
	}
	return int(value), true
}

func effectMember(ctx rule.RuleContext, callee *ast.Node, name string) bool {
	callee = unwrap(callee)
	if ast.IsPropertyAccessExpression(callee) {
		callee = callee.AsPropertyAccessExpression().Name()
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, callee)
	if symbol == nil || symbol.Name != name {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := strings.ReplaceAll(file.FileName(), "\\", "/")
		if strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/") {
			return true
		}
	}
	return false
}

func txQueueMember(ctx rule.RuleContext, callee *ast.Node, name string) bool {
	callee = unwrap(callee)
	if ast.IsPropertyAccessExpression(callee) {
		callee = callee.AsPropertyAccessExpression().Name()
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, callee)
	if symbol == nil || symbol.Name != name {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := strings.ReplaceAll(file.FileName(), "\\", "/")
		if (strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/")) && (strings.HasSuffix(path, "/TxQueue.ts") || strings.HasSuffix(path, "/TxQueue.d.ts")) {
			return true
		}
	}
	return false
}

func unwrap(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindTypeAssertionExpression, ast.KindNonNullExpression, ast.KindSatisfiesExpression:
			node = node.Expression()
		default:
			return node
		}
	}
	return nil
}
