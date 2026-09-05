package streaming_textdecoder

import (
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "streaming-textdecoder",
	Description: "Preserve TextDecoder state while decoding arbitrary byte-stream chunks.",
	Help:        "Keep one decoder for the stream and call decoder.decode(chunk, { stream: true }) for each chunk.",
}

var Rule = rule.Rule{
	Name: "streaming-textdecoder",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
			call := node.AsCallExpression()
			if !isTextDecoderDecode(call) {
				return
			}
			callback := chunkStreamCallback(ctx, call)
			if callback == nil {
				return
			}
			stable, known := stableDecoder(ctx, decodeReceiver(call), callback)
			if !known || (stable && !missingOrFalseStreamOption(call)) {
				return
			}
			ctx.ReportNode(call.Expression, message)
		}}
	},
}

func isTextDecoderDecode(call *ast.CallExpression) bool {
	callee := unwrap(call.Expression)
	return ast.IsPropertyAccessExpression(callee) && callee.AsPropertyAccessExpression().Name() != nil && callee.AsPropertyAccessExpression().Name().Text() == "decode" && len(call.Arguments.Nodes) > 0
}

func decodeReceiver(call *ast.CallExpression) *ast.Node {
	return unwrap(call.Expression).AsPropertyAccessExpression().Expression
}

func chunkStreamCallback(ctx rule.RuleContext, call *ast.CallExpression) *ast.Node {
	argument := unwrap(call.Arguments.Nodes[0])
	if !ast.IsIdentifier(argument) {
		return nil
	}
	callback := enclosingFunction(argument)
	if callback == nil || !isSoleParameter(ctx, callback, argument) || callback.Parent == nil || !ast.IsCallExpression(callback.Parent) {
		return nil
	}
	mapCall := callback.Parent.AsCallExpression()
	if !isEffectStreamCall(ctx, mapCall, "map") || len(mapCall.Arguments.Nodes) != 1 || unwrap(mapCall.Arguments.Nodes[0]) != callback || mapCall.Parent == nil || !ast.IsCallExpression(mapCall.Parent) {
		return nil
	}
	pipeCall := mapCall.Parent.AsCallExpression()
	if !isPipeStage(ctx, pipeCall, mapCall.AsNode()) {
		return nil
	}
	return callback
}

func isSoleParameter(ctx rule.RuleContext, callback, argument *ast.Node) bool {
	parameters := callback.Parameters()
	if len(parameters) != 1 || !ast.IsIdentifier(parameters[0].Name()) {
		return false
	}
	parameter := utils.ResolvedSymbol(ctx.TypeChecker, parameters[0].Name())
	return parameter != nil && parameter == utils.ResolvedSymbol(ctx.TypeChecker, argument)
}

func isPipeStage(ctx rule.RuleContext, call *ast.CallExpression, stage *ast.Node) bool {
	callee := unwrap(call.Expression)
	if !ast.IsPropertyAccessExpression(callee) || callee.AsPropertyAccessExpression().Name() == nil || callee.AsPropertyAccessExpression().Name().Text() != "pipe" || !isCallArgument(call, stage) {
		return false
	}
	return arbitraryByteStream(ctx, callee.AsPropertyAccessExpression().Expression)
}

func arbitraryByteStream(ctx rule.RuleContext, node *ast.Node) bool {
	node = unwrap(node)
	if !ast.IsCallExpression(node) || !isEffectStreamCall(ctx, node.AsCallExpression(), "fromReadableStream") {
		return false
	}
	call := node.AsCallExpression()
	if len(call.Arguments.Nodes) != 1 {
		return false
	}
	options := unwrap(call.Arguments.Nodes[0])
	if !ast.IsObjectLiteralExpression(options) {
		return false
	}
	proven := false
	for _, property := range options.AsObjectLiteralExpression().Properties.Nodes {
		if ast.IsSpreadAssignment(property) {
			proven = false
			continue
		}
		name := property.Name()
		if !ast.IsPropertyAssignment(property) || !ast.IsIdentifier(name) || name.Text() != "evaluate" {
			continue
		}
		evaluate := unwrap(property.AsPropertyAssignment().Initializer)
		proven = ast.IsArrowFunction(evaluate) && !ast.IsBlock(evaluate.AsArrowFunction().Body) && isResponseBody(ctx, evaluate.AsArrowFunction().Body)
	}
	return proven
}

func isResponseBody(ctx rule.RuleContext, node *ast.Node) bool {
	node = unwrap(node)
	if !ast.IsPropertyAccessExpression(node) || node.AsPropertyAccessExpression().Name() == nil || node.AsPropertyAccessExpression().Name().Text() != "body" {
		return false
	}
	if !isBodyProperty(utils.ResolvedSymbol(ctx.TypeChecker, node.AsPropertyAccessExpression().Name())) {
		return false
	}
	receiver := unwrap(node.AsPropertyAccessExpression().Expression)
	return ast.IsIdentifier(receiver) && isFetchedResponse(ctx, utils.ResolvedSymbol(ctx.TypeChecker, receiver))
}

func isBodyProperty(symbol *ast.Symbol) bool {
	if !isBuiltinSymbol(symbol) {
		return false
	}
	for _, declaration := range symbol.Declarations {
		for current := declaration.Parent; current != nil; current = current.Parent {
			if ast.IsInterfaceDeclaration(current) && current.Name() != nil && current.Name().Text() == "Body" {
				return true
			}
		}
	}
	return false
}

func isFetchedResponse(ctx rule.RuleContext, symbol *ast.Symbol) bool {
	if symbol == nil {
		return false
	}
	for _, declaration := range symbol.Declarations {
		if !ast.IsVariableDeclaration(declaration) || ast.GetSourceFileOfNode(declaration) != ctx.SourceFile || declaration.Parent == nil || declaration.Parent.Flags&ast.NodeFlagsConst == 0 {
			continue
		}
		initializer := declaration.AsVariableDeclaration().Initializer
		if initializer == nil {
			continue
		}
		initializer = unwrap(initializer)
		if !ast.IsAwaitExpression(initializer) {
			continue
		}
		awaited := unwrap(initializer.AsAwaitExpression().Expression)
		if !ast.IsCallExpression(awaited) {
			continue
		}
		callee := unwrap(awaited.AsCallExpression().Expression)
		if ast.IsIdentifier(callee) && callee.Text() == "fetch" && isBuiltinSymbol(utils.ResolvedSymbol(ctx.TypeChecker, callee)) {
			return true
		}
	}
	return false
}

func stableDecoder(ctx rule.RuleContext, receiver, callback *ast.Node) (stable, known bool) {
	receiver = unwrap(receiver)
	if receiver == nil {
		return false, false
	}
	if ast.IsNewExpression(receiver) {
		return false, isTextDecoderConstruction(ctx, receiver)
	}
	if !ast.IsIdentifier(receiver) {
		return false, false
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, receiver)
	if symbol == nil {
		return false, false
	}
	for _, declaration := range symbol.Declarations {
		if !ast.IsVariableDeclaration(declaration) || ast.GetSourceFileOfNode(declaration) != ctx.SourceFile || declaration.Parent == nil || declaration.Parent.Flags&ast.NodeFlagsConst == 0 {
			continue
		}
		initializer := declaration.AsVariableDeclaration().Initializer
		if !isTextDecoderConstruction(ctx, initializer) {
			continue
		}
		return !inside(callback, declaration), true
	}
	return false, false
}

func isTextDecoderConstruction(ctx rule.RuleContext, node *ast.Node) bool {
	if node == nil {
		return false
	}
	node = unwrap(node)
	if node == nil || !ast.IsNewExpression(node) {
		return false
	}
	constructor := unwrap(node.AsNewExpression().Expression)
	if constructor == nil || !ast.IsIdentifier(constructor) || constructor.Text() != "TextDecoder" || !isBuiltinSymbol(utils.ResolvedSymbol(ctx.TypeChecker, constructor)) {
		return false
	}
	arguments := node.AsNewExpression().Arguments
	if arguments != nil && len(arguments.Nodes) > 0 && ast.IsStringLiteralLike(unwrap(arguments.Nodes[0])) {
		switch strings.ToLower(unwrap(arguments.Nodes[0]).Text()) {
		case "windows-1252", "iso-8859-1", "us-ascii":
			return false
		}
	}
	return true
}

func inside(ancestor, node *ast.Node) bool {
	for current := node; current != nil; current = current.Parent {
		if current == ancestor {
			return true
		}
	}
	return false
}

func missingOrFalseStreamOption(call *ast.CallExpression) bool {
	if len(call.Arguments.Nodes) < 2 {
		return true
	}
	options := unwrap(call.Arguments.Nodes[1])
	if !ast.IsObjectLiteralExpression(options) {
		return false
	}
	state := 0 // missing
	for _, property := range options.AsObjectLiteralExpression().Properties.Nodes {
		if ast.IsSpreadAssignment(property) {
			state = 3
			continue
		}
		name := property.Name()
		if ast.IsShorthandPropertyAssignment(property) && ast.IsIdentifier(name) && name.Text() == "stream" {
			state = 3
			continue
		}
		if !ast.IsPropertyAssignment(property) || !ast.IsIdentifier(name) || name.Text() != "stream" {
			continue
		}
		value := unwrap(property.AsPropertyAssignment().Initializer)
		if value != nil && value.Kind == ast.KindTrueKeyword {
			state = 1
		} else if value != nil && value.Kind == ast.KindFalseKeyword {
			state = 2
		} else {
			state = 3
		}
	}
	return state == 0 || state == 2
}

func isEffectStreamCall(ctx rule.RuleContext, call *ast.CallExpression, name string) bool {
	callee := unwrap(call.Expression)
	if !ast.IsPropertyAccessExpression(callee) || callee.AsPropertyAccessExpression().Name() == nil || callee.AsPropertyAccessExpression().Name().Text() != name {
		return false
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, callee.AsPropertyAccessExpression().Name())
	if symbol == nil || symbol.Name != name {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		base := filepath.Base(file.FileName())
		path := strings.ReplaceAll(file.FileName(), "\\", "/")
		if (base == "Stream.ts" || base == "Stream.d.ts") && (strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/")) {
			return true
		}
	}
	return false
}

func isCallArgument(call *ast.CallExpression, node *ast.Node) bool {
	for _, argument := range call.Arguments.Nodes {
		if argument == node {
			return true
		}
	}
	return false
}

func enclosingFunction(node *ast.Node) *ast.Node {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsFunctionLike(current) {
			return current
		}
	}
	return nil
}

func isBuiltinSymbol(symbol *ast.Symbol) bool {
	if symbol == nil {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file != nil && strings.HasPrefix(filepath.Base(file.FileName()), "lib.") && strings.HasSuffix(file.FileName(), ".d.ts") {
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
