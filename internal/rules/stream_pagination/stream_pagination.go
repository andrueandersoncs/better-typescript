package stream_pagination

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "streamPagination",
	Description: "Prefer Stream.paginate for a manual effectful page loop.",
	Help:        "Use Stream.paginate with an effectful page callback returning [items, Option<nextCursor>].",
}

var StreamPaginationRule = rule.Rule{
	Name: "stream-pagination",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		check := func(loop *ast.Node) {
			if isManualPagination(ctx, loop) {
				ctx.ReportNode(loop, message)
			}
		}
		return rule.RuleListeners{
			ast.KindWhileStatement: check,
			ast.KindDoStatement:    check,
			ast.KindForStatement:   check,
		}
	},
}

func isManualPagination(ctx rule.RuleContext, loop *ast.Node) bool {
	cursor := loopCursor(loop)
	if cursor == nil {
		return false
	}
	statements := loopStatements(loop)
	pages := make([]*ast.Node, 0, len(statements))
	for _, statement := range statements {
		if page := requestedPage(ctx, statement, cursor); page != nil {
			pages = append(pages, page)
		}
	}
	for _, page := range pages {
		hasAccumulation, hasUpdate := false, false
		for _, statement := range statements {
			hasAccumulation = hasAccumulation || accumulatesPage(ctx, statement, page)
			hasUpdate = hasUpdate || updatesCursor(ctx, statement, cursor, page)
		}
		if hasAccumulation && hasUpdate {
			return true
		}
	}
	return false
}

func loopCursor(loop *ast.Node) *ast.Node {
	var condition *ast.Node
	switch {
	case ast.IsWhileStatement(loop):
		condition = loop.AsWhileStatement().Expression
	case ast.IsDoStatement(loop):
		condition = loop.AsDoStatement().Expression
	case ast.IsForStatement(loop):
		condition = loop.AsForStatement().Condition
	}
	condition = unwrap(condition)
	if ast.IsIdentifier(condition) {
		return condition
	}
	return nil
}

func loopStatements(loop *ast.Node) []*ast.Node {
	var statement *ast.Node
	switch {
	case ast.IsWhileStatement(loop):
		statement = loop.AsWhileStatement().Statement
	case ast.IsDoStatement(loop):
		statement = loop.AsDoStatement().Statement
	case ast.IsForStatement(loop):
		statement = loop.AsForStatement().Statement
	}
	if ast.IsBlock(statement) {
		return statement.AsBlock().Statements.Nodes
	}
	if statement != nil {
		return []*ast.Node{statement}
	}
	return nil
}

func requestedPage(ctx rule.RuleContext, statement, cursor *ast.Node) *ast.Node {
	if !ast.IsVariableStatement(statement) {
		return nil
	}
	declarations := statement.AsVariableStatement().DeclarationList.AsVariableDeclarationList().Declarations.Nodes
	if len(declarations) != 1 {
		return nil
	}
	declaration := declarations[0].AsVariableDeclaration()
	if !ast.IsIdentifier(declaration.Name()) || declaration.Initializer == nil {
		return nil
	}
	call := awaitedOrYieldedCall(declaration.Initializer)
	if call == nil || !requestUsesCursor(ctx, call, cursor) {
		return nil
	}
	return declaration.Name()
}

func awaitedOrYieldedCall(node *ast.Node) *ast.CallExpression {
	node = unwrap(node)
	if ast.IsAwaitExpression(node) {
		node = unwrap(node.AsAwaitExpression().Expression)
	} else if ast.IsYieldExpression(node) {
		node = unwrap(node.AsYieldExpression().Expression)
	} else {
		return nil
	}
	if ast.IsCallExpression(node) {
		return node.AsCallExpression()
	}
	return nil
}

func requestUsesCursor(ctx rule.RuleContext, call *ast.CallExpression, cursor *ast.Node) bool {
	for _, argument := range call.Arguments.Nodes {
		argument = unwrap(argument)
		if ast.IsIdentifier(argument) && utils.ResolvedSymbol(ctx.TypeChecker, argument) == utils.ResolvedSymbol(ctx.TypeChecker, cursor) {
			return true
		}
	}
	return false
}

func accumulatesPage(ctx rule.RuleContext, statement, page *ast.Node) bool {
	if !ast.IsExpressionStatement(statement) {
		return false
	}
	expression := unwrap(statement.AsExpressionStatement().Expression)
	if !ast.IsCallExpression(expression) {
		return false
	}
	callee := unwrap(expression.AsCallExpression().Expression)
	if !ast.IsPropertyAccessExpression(callee) || callee.AsPropertyAccessExpression().Name() == nil || callee.AsPropertyAccessExpression().Name().Text() != "push" {
		return false
	}
	for _, argument := range expression.AsCallExpression().Arguments.Nodes {
		if propertyOfSymbol(ctx, unwrapSpread(argument), page) {
			return true
		}
	}
	return false
}

func updatesCursor(ctx rule.RuleContext, statement, cursor, page *ast.Node) bool {
	if !ast.IsExpressionStatement(statement) {
		return false
	}
	expression := unwrap(statement.AsExpressionStatement().Expression)
	if !ast.IsBinaryExpression(expression) || expression.AsBinaryExpression().OperatorToken.Kind != ast.KindEqualsToken {
		return false
	}
	left := unwrap(expression.AsBinaryExpression().Left)
	return ast.IsIdentifier(left) &&
		utils.ResolvedSymbol(ctx.TypeChecker, left) == utils.ResolvedSymbol(ctx.TypeChecker, cursor) &&
		propertyOfSymbol(ctx, expression.AsBinaryExpression().Right, page)
}

func unwrapSpread(node *ast.Node) *ast.Node {
	node = unwrap(node)
	if ast.IsSpreadElement(node) {
		return unwrap(node.AsSpreadElement().Expression)
	}
	return node
}

func propertyOfSymbol(ctx rule.RuleContext, node, symbol *ast.Node) bool {
	node = unwrap(node)
	if !ast.IsPropertyAccessExpression(node) {
		return false
	}
	receiver := unwrap(node.AsPropertyAccessExpression().Expression)
	return ast.IsIdentifier(receiver) && utils.ResolvedSymbol(ctx.TypeChecker, receiver) == utils.ResolvedSymbol(ctx.TypeChecker, symbol)
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

var Rule = StreamPaginationRule
