package unbounded_stream_buffer

import (
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "unboundedStreamBuffer",
	Description: "Avoid unbounded Effect Stream or Channel buffers.",
	Help:        "Use a finite capacity. Stream.buffer counts elements; bufferArray counts chunks. Use suspend to preserve backpressure—dropping and sliding lose data.",
}

var UnboundedStreamBufferRule = rule.Rule{
	Name: "unbounded-stream-buffer",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
			call := node.AsCallExpression()
			if !isBufferCall(ctx, call) || !hasUnboundedCapacity(ctx, call) {
				return
			}
			ctx.ReportNode(node, message)
		}}
	},
}

func isBufferCall(ctx rule.RuleContext, call *ast.CallExpression) bool {
	callee := unwrap(call.Expression)
	if ast.IsPropertyAccessExpression(callee) {
		callee = callee.AsPropertyAccessExpression().Name()
	}
	if !ast.IsIdentifier(callee) {
		return false
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, callee)
	if symbol == nil {
		return false
	}
	return (symbol.Name == "buffer" || symbol.Name == "bufferArray") && declaredInEffectModule(symbol, "Stream.ts", "Channel.ts")
}

func hasUnboundedCapacity(ctx rule.RuleContext, call *ast.CallExpression) bool {
	for _, argument := range call.Arguments.Nodes {
		argument = unwrap(argument)
		if !ast.IsObjectLiteralExpression(argument) {
			continue
		}
		known, unbounded := false, false
		for _, property := range argument.AsObjectLiteralExpression().Properties.Nodes {
			if ast.IsSpreadAssignment(property) {
				known = false
				continue
			}
			if !ast.IsPropertyAssignment(property) {
				continue
			}
			name, ok := ast.TryGetTextOfPropertyName(property.Name())
			if !ok || name != "capacity" {
				continue
			}
			known = true
			unbounded = isUnboundedCapacity(ctx, property.AsPropertyAssignment().Initializer)
		}
		if known && unbounded {
			return true
		}
	}
	return false
}

func isUnboundedCapacity(ctx rule.RuleContext, node *ast.Node) bool {
	node = unwrap(node)
	if node == nil {
		return false
	}
	if ast.IsStringLiteralLike(node) {
		return node.Text() == "unbounded"
	}
	if ast.IsIdentifier(node) {
		return node.Text() == "Infinity" && declaredInLib(utils.ResolvedSymbol(ctx.TypeChecker, node))
	}
	if !ast.IsPropertyAccessExpression(node) {
		return false
	}
	access := node.AsPropertyAccessExpression()
	if access.Name() == nil || access.Name().Text() != "POSITIVE_INFINITY" {
		return false
	}
	receiver := unwrap(access.Expression)
	return ast.IsIdentifier(receiver) && receiver.Text() == "Number" && declaredInLib(utils.ResolvedSymbol(ctx.TypeChecker, receiver))
}

func declaredInEffectModule(symbol *ast.Symbol, modules ...string) bool {
	for _, declaration := range symbolDeclarations(symbol) {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		name := strings.ReplaceAll(file.FileName(), "\\", "/")
		if !strings.Contains(name, "/node_modules/effect/") && !strings.Contains(name, "/packages/effect/src/") {
			continue
		}
		for _, module := range modules {
			if strings.TrimSuffix(strings.TrimSuffix(filepath.Base(name), ".d.ts"), ".ts") == strings.TrimSuffix(module, ".ts") {
				return true
			}
		}
	}
	return false
}

func declaredInLib(symbol *ast.Symbol) bool {
	for _, declaration := range symbolDeclarations(symbol) {
		file := ast.GetSourceFileOfNode(declaration)
		if file != nil && strings.HasPrefix(filepath.Base(file.FileName()), "lib.") {
			return true
		}
	}
	return false
}

func symbolDeclarations(symbol *ast.Symbol) []*ast.Node {
	if symbol == nil {
		return nil
	}
	return symbol.Declarations
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

var Rule = UnboundedStreamBufferRule
