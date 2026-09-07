package unbounded_stream_collect

import (
	"math"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "unboundedStreamCollect",
	Description: "Avoid collecting a Stream without a locally established bound.",
	Help:        "Use a finite source or apply Stream.take with a nonnegative finite numeric literal before runCollect, collect, or Sink.collect. Incremental consumers such as runForEach and runDrain do not retain every element.",
}

type bound uint8

const (
	unknownBound bound = iota
	finiteBound
)

type collector uint8

const (
	notCollector collector = iota
	streamCollect
	streamRunCollect
	streamRunSinkCollect
	channelRunCollect
)

var UnboundedStreamCollectRule = rule.Rule{
	Name: "unbounded-stream-collect",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		facts := boundFacts{ctx: ctx, symbols: map[*ast.Symbol]bound{}, nodes: map[*ast.Node]bound{}}
		return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
			facts.reportCollections(node.AsCallExpression())
		}}
	},
}

type boundFacts struct {
	ctx     rule.RuleContext
	symbols map[*ast.Symbol]bound
	nodes   map[*ast.Node]bound
}

func (facts *boundFacts) reportCollections(call *ast.CallExpression) {
	if kind := collectorCall(facts.ctx, call); kind != notCollector {
		if len(call.Arguments.Nodes) > 0 && facts.boundOf(call.Arguments.Nodes[0], map[*ast.Symbol]bool{}) == unknownBound {
			facts.ctx.ReportNode(call.AsNode(), message)
		}
		return
	}

	callee := unwrap(call.Expression)
	var source *ast.Node
	var operations []*ast.Node
	if ast.IsPropertyAccessExpression(callee) && callee.AsPropertyAccessExpression().Name() != nil && callee.AsPropertyAccessExpression().Name().Text() == "pipe" && isEffectSymbol(facts.ctx, callee.AsPropertyAccessExpression().Name(), "pipe") {
		source = callee.AsPropertyAccessExpression().Expression
		operations = call.Arguments.Nodes
	} else if isEffectSymbol(facts.ctx, callee, "pipe") && len(call.Arguments.Nodes) >= 1 {
		source = call.Arguments.Nodes[0]
		operations = call.Arguments.Nodes[1:]
	} else {
		return
	}

	current := facts.boundOf(source, map[*ast.Symbol]bool{})
	for _, operation := range operations {
		kind := collectorOperation(facts.ctx, operation)
		if kind != notCollector {
			if current == unknownBound {
				facts.ctx.ReportNode(operation, message)
			}
			if kind == streamCollect {
				current = finiteBound
				continue
			}
			return
		}
		current = facts.applyOperation(operation, current)
	}
}

func (facts *boundFacts) boundOf(node *ast.Node, seen map[*ast.Symbol]bool) bound {
	node = unwrap(node)
	if node == nil {
		return unknownBound
	}
	if cached, ok := facts.nodes[node]; ok {
		return cached
	}
	result := unknownBound
	if ast.IsIdentifier(node) {
		result = facts.boundOfSymbol(utils.ResolvedSymbol(facts.ctx.TypeChecker, node), seen)
	} else if ast.IsPropertyAccessExpression(node) {
		result = facts.boundOfSymbol(utils.ResolvedSymbol(facts.ctx.TypeChecker, node.AsPropertyAccessExpression().Name()), seen)
	} else if ast.IsCallExpression(node) {
		call := node.AsCallExpression()
		switch {
		case isStreamFunction(facts.ctx, call.Expression, "make", "succeed"):
			result = finiteBound
		case isStreamFunction(facts.ctx, call.Expression, "fromArray", "fromIterable") && len(call.Arguments.Nodes) >= 1 && ast.IsArrayLiteralExpression(unwrap(call.Arguments.Nodes[0])):
			result = finiteBound
		case isStreamFunction(facts.ctx, call.Expression, "fromArrays") && allArrayLiterals(call.Arguments.Nodes):
			result = finiteBound
		case isStreamFunction(facts.ctx, call.Expression, "take") && finiteTakeArguments(call.Arguments.Nodes):
			result = finiteBound
		case isChannelFunction(facts.ctx, call.Expression, "succeed"):
			result = finiteBound
		case isChannelFunction(facts.ctx, call.Expression, "fromArray", "fromIterable") && len(call.Arguments.Nodes) >= 1 && ast.IsArrayLiteralExpression(unwrap(call.Arguments.Nodes[0])):
			result = finiteBound
		default:
			result = facts.pipeBound(call, seen)
		}
	}
	facts.nodes[node] = result
	return result
}
func allArrayLiterals(arguments []*ast.Node) bool {
	if len(arguments) == 0 {
		return true
	}
	for _, argument := range arguments {
		if !ast.IsArrayLiteralExpression(unwrap(argument)) {
			return false
		}
	}
	return true
}

func (facts *boundFacts) boundOfSymbol(symbol *ast.Symbol, seen map[*ast.Symbol]bool) bound {
	if symbol == nil {
		return unknownBound
	}
	if cached, ok := facts.symbols[symbol]; ok {
		return cached
	}
	if isEffectConstant(symbol, "Stream.ts", "empty") || isEffectConstant(symbol, "Channel.ts", "empty") {
		facts.symbols[symbol] = finiteBound
		return finiteBound
	}
	if seen[symbol] || len(symbol.Declarations) != 1 {
		return unknownBound
	}
	seen[symbol] = true
	declaration := symbol.Declarations[0]
	if ast.IsVariableDeclaration(declaration) && declaration.Parent != nil && declaration.Parent.Flags&ast.NodeFlagsConst != 0 && declaration.AsVariableDeclaration().Initializer != nil {
		result := facts.boundOf(declaration.AsVariableDeclaration().Initializer, seen)
		facts.symbols[symbol] = result
		return result
	}
	return unknownBound
}

func (facts *boundFacts) pipeBound(call *ast.CallExpression, seen map[*ast.Symbol]bool) bound {
	callee := unwrap(call.Expression)
	var source *ast.Node
	var operations []*ast.Node
	if ast.IsPropertyAccessExpression(callee) && callee.AsPropertyAccessExpression().Name() != nil && callee.AsPropertyAccessExpression().Name().Text() == "pipe" && isEffectSymbol(facts.ctx, callee.AsPropertyAccessExpression().Name(), "pipe") {
		source = callee.AsPropertyAccessExpression().Expression
		operations = call.Arguments.Nodes
	} else if isEffectSymbol(facts.ctx, callee, "pipe") && len(call.Arguments.Nodes) >= 1 {
		source = call.Arguments.Nodes[0]
		operations = call.Arguments.Nodes[1:]
	} else {
		return unknownBound
	}
	current := facts.boundOf(source, seen)
	for _, operation := range operations {
		kind := collectorOperation(facts.ctx, operation)
		if kind == streamCollect {
			current = finiteBound
			continue
		}
		if kind != notCollector {
			return unknownBound
		}
		current = facts.applyOperation(operation, current)
	}
	return current
}

func (facts *boundFacts) applyOperation(operation *ast.Node, input bound) bound {
	if isFiniteTake(facts.ctx, operation) {
		return finiteBound
	}
	if preservesBound(facts.ctx, operation) {
		return input
	}
	return unknownBound
}

func collectorCall(ctx rule.RuleContext, call *ast.CallExpression) collector {
	if isStreamFunction(ctx, call.Expression, "runCollect") {
		return streamRunCollect
	}
	if isStreamFunction(ctx, call.Expression, "collect") {
		return streamCollect
	}
	if isStreamFunction(ctx, call.Expression, "run") && len(call.Arguments.Nodes) >= 2 && isSinkCollect(ctx, call.Arguments.Nodes[1]) {
		return streamRunSinkCollect
	}
	if isChannelFunction(ctx, call.Expression, "runCollect") {
		return channelRunCollect
	}
	return notCollector
}

func collectorOperation(ctx rule.RuleContext, node *ast.Node) collector {
	node = unwrap(node)
	if isStreamFunction(ctx, node, "runCollect", "collect") {
		callee := node
		if ast.IsPropertyAccessExpression(callee) {
			callee = callee.AsPropertyAccessExpression().Name()
		}
		if utils.ResolvedSymbol(ctx.TypeChecker, callee).Name == "collect" {
			return streamCollect
		}
		return streamRunCollect
	}
	if ast.IsCallExpression(node) {
		call := node.AsCallExpression()
		if isStreamFunction(ctx, call.Expression, "run") && len(call.Arguments.Nodes) == 1 && isSinkCollect(ctx, call.Arguments.Nodes[0]) {
			return streamRunSinkCollect
		}
	}
	return notCollector
}

func isSinkCollect(ctx rule.RuleContext, node *ast.Node) bool {
	node = unwrap(node)
	if !ast.IsCallExpression(node) {
		return false
	}
	call := node.AsCallExpression()
	return len(call.Arguments.Nodes) == 0 && isEffectFunction(ctx, call.Expression, []string{"collect"}, "Sink.ts")
}

func isFiniteTake(ctx rule.RuleContext, node *ast.Node) bool {
	node = unwrap(node)
	return ast.IsCallExpression(node) && isStreamFunction(ctx, node.AsCallExpression().Expression, "take") && finiteTakeArguments(node.AsCallExpression().Arguments.Nodes)
}

func finiteTakeArguments(arguments []*ast.Node) bool {
	if len(arguments) == 0 {
		return false
	}
	value := unwrap(arguments[len(arguments)-1])
	if !ast.IsNumericLiteral(value) {
		return false
	}
	count, err := strconv.ParseFloat(value.Text(), 64)
	return err == nil && count >= 0 && !math.IsInf(count, 0)
}

func preservesBound(ctx rule.RuleContext, node *ast.Node) bool {
	node = unwrap(node)
	if ast.IsCallExpression(node) {
		node = node.AsCallExpression().Expression
	}
	return isStreamFunction(ctx, node, "map", "filter", "tap")
}

func isStreamFunction(ctx rule.RuleContext, node *ast.Node, names ...string) bool {
	return isEffectFunction(ctx, node, names, "Stream.ts")
}

func isChannelFunction(ctx rule.RuleContext, node *ast.Node, names ...string) bool {
	return isEffectFunction(ctx, node, names, "Channel.ts")
}

func isEffectFunction(ctx rule.RuleContext, node *ast.Node, names []string, modules ...string) bool {
	node = unwrap(node)
	if ast.IsPropertyAccessExpression(node) {
		node = node.AsPropertyAccessExpression().Name()
	}
	if !ast.IsIdentifier(node) {
		return false
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, node)
	if symbol == nil {
		return false
	}
	for _, name := range names {
		if symbol.Name == name && declaredInEffectModule(symbol, modules...) {
			return true
		}
	}
	return false
}

func isEffectConstant(symbol *ast.Symbol, module, name string) bool {
	return symbol != nil && symbol.Name == name && declaredInEffectModule(symbol, module)
}

func isEffectSymbol(ctx rule.RuleContext, node *ast.Node, name string) bool {
	node = unwrap(node)
	if !ast.IsIdentifier(node) {
		return false
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, node)
	if symbol == nil || symbol.Name != name {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file != nil {
			path := strings.ReplaceAll(file.FileName(), "\\", "/")
			if strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/") {
				return true
			}
		}
	}
	return false
}

func declaredInEffectModule(symbol *ast.Symbol, modules ...string) bool {
	if symbol == nil {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		name := strings.ReplaceAll(file.FileName(), "\\", "/")
		if !strings.Contains(name, "/node_modules/effect/") && !strings.Contains(name, "/packages/effect/src/") {
			continue
		}
		base := strings.TrimSuffix(strings.TrimSuffix(filepath.Base(name), ".d.ts"), ".ts")
		for _, module := range modules {
			if base == strings.TrimSuffix(module, ".ts") {
				return true
			}
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

var Rule = UnboundedStreamCollectRule
